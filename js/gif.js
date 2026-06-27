/* Minimal GIF Encoder */
class GIFEncoder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.frames = [];
    this.delay = 50; // cs (centiseconds)
    this.transparent = null;
  }

  setDelay(ms) {
    this.delay = Math.round(ms / 10);
  }

  addFrame(ctx) {
    const imgData = ctx.getImageData(0, 0, this.width, this.height);
    this.frames.push(new Uint8Array(imgData.data));
  }

  render() {
    const data = this._build();
    return new Blob([data], { type: 'image/gif' });
  }

  renderURL() {
    return URL.createObjectURL(this.render());
  }

  _build() {
    const w = this.width, h = this.height;
    const frames = this.frames;
    if (!frames.length) return new Uint8Array(0);

    const blocks = [];
    const add = (b) => blocks.push(b);

    // Header
    add(this._str('GIF89a'));

    // Logical Screen Descriptor
    const lsd = new Uint8Array(7);
    lsd[0] = w & 0xFF; lsd[1] = (w >> 8) & 0xFF;
    lsd[2] = h & 0xFF; lsd[3] = (h >> 8) & 0xFF;
    lsd[4] = 0xF6; // GCT flag, 7-bit color res, 6 sorted, 64 colors
    lsd[5] = 0; lsd[6] = 0;
    add(lsd);

    // Global Color Table — 64 colors
    const gct = new Uint8Array(192); // 64 * 3
    for (let i = 0; i < 64; i++) {
      const r = (i >> 4) & 3, g = (i >> 2) & 3, b = i & 3;
      const mul = 85;
      gct[i*3] = r * mul; gct[i*3+1] = g * mul; gct[i*3+2] = b * mul;
    }
    add(gct);

    // Netscape extension (looping)
    add(this._str('!\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00'));

    // Frames
    for (let f = 0; f < frames.length; f++) {
      // Graphic Control Extension
      const gce = new Uint8Array(8);
      gce[0] = 0x21; gce[1] = 0xF9; gce[2] = 0x04;
      gce[3] = 0x04; // disposal
      gce[4] = this.delay & 0xFF;
      gce[5] = (this.delay >> 8) & 0xFF;
      gce[6] = 0;
      gce[7] = 0;
      add(gce);

      // Image Descriptor
      const id = new Uint8Array(10);
      id[0] = 0x2C;
      id[1] = id[2] = id[3] = id[4] = 0; // top-left
      id[5] = w & 0xFF; id[6] = (w >> 8) & 0xFF;
      id[7] = h & 0xFF; id[8] = (h >> 8) & 0xFF;
      id[9] = 0; // local color table flag = 0
      add(id);

      // Image data (LZW compressed)
      const raw = frames[f];
      const pixels = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4;
        const r = Math.floor(raw[idx] / 85);
        const g = Math.floor(raw[idx+1] / 85);
        const b = Math.floor(raw[idx+2] / 85);
        pixels[i] = (r << 4) | (g << 2) | b;
      }
      add(this._lzw(pixels, 6));
    }

    // Trailer
    add(new Uint8Array([0x3B]));

    // Concatenate
    const total = blocks.reduce((s, b) => s + b.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const b of blocks) {
      result.set(b, offset);
      offset += b.length;
    }
    return result;
  }

  _lzw(pixels, colorDepth) {
    const clearCode = 1 << colorDepth;
    const eoiCode = clearCode + 1;
    const out = [];
    const initSize = clearCode + 2;

    const compress = () => {
      const dict = {};
      let nextCode = initSize;
      for (let i = 0; i < initSize; i++) dict[String.fromCharCode(i)] = i;

      const bitCount = colorDepth + 1;
      let bits = 0, bitLen = 0;

      const writeCode = (code, bitsUsed) => {
        bits |= (code << bitLen);
        bitLen += bitsUsed;
        while (bitLen >= 8) {
          out.push(bits & 0xFF);
          bits >>= 8;
          bitLen -= 8;
        }
      };

      writeCode(clearCode, colorDepth + 1);

      let current = String.fromCharCode(pixels[0]);
      for (let i = 1; i < pixels.length; i++) {
        const c = pixels[i];
        const combined = current + String.fromCharCode(c);
        if (dict[combined] !== undefined) {
          current = combined;
        } else {
          writeCode(dict[current], bitCount);
          if (nextCode < 4096) {
            dict[combined] = nextCode++;
          }
          current = String.fromCharCode(c);
        }
      }
      writeCode(dict[current], bitCount);
      writeCode(eoiCode, colorDepth + 1);

      // Flush remaining bits
      if (bitLen > 0) out.push(bits & 0xFF);
    };

    compress();

    // Build sub-blocks
    const blocks = [];
    let i = 0;
    const minCodeSize = Math.max(2, colorDepth);
    blocks.push(minCodeSize);
    while (i < out.length) {
      const chunk = out.slice(i, i + 255);
      blocks.push(chunk.length);
      blocks.push(...chunk);
      i += 255;
    }
    blocks.push(0);
    return new Uint8Array(blocks);
  }

  _str(s) {
    const buf = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) buf[i] = s.charCodeAt(i);
    return buf;
  }
}

const BurstGIF = {
  async create(captures, delay = 800) {
    if (!captures.length) return null;
    const w = captures[0].width;
    const h = captures[0].height;
    const enc = new GIFEncoder(w, h);
    enc.setDelay(delay);

    for (const c of captures) {
      const ctx = c.getContext('2d');
      enc.addFrame(ctx);
    }

    const blob = enc.render();
    return blob;
  }
};