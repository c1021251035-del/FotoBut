const Effects = {
  current: 'none',

  apply(canvas, type) {
    this.current = type || 'none';
    if (type === 'none') return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    switch (type) {
      case 'sepia': this._sepia(data); break;
      case 'bw': this._bw(data); break;
      case 'vintage': this._vintage(data); break;
      case 'glitch': this._glitch(ctx, canvas); return; // needs ctx
      case 'pixelate': this._pixelate(ctx, canvas); return;
      case 'warm': this._warm(data); break;
      case 'cool': this._cool(data); break;
    }
    ctx.putImageData(imgData, 0, 0);
  },

  _sepia(d) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      d[i]   = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      d[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      d[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }
  },

  _bw(d) {
    for (let i = 0; i < d.length; i += 4) {
      const avg = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
      d[i] = d[i+1] = d[i+2] = avg;
    }
  },

  _vintage(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.min(255, d[i] * 1.1 + 20);
      d[i+1] = Math.min(255, d[i+1] * 0.9 + 10);
      d[i+2] = Math.min(255, d[i+2] * 0.8);
    }
  },

  _warm(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.min(255, d[i] + 15);
      d[i+2] = Math.max(0, d[i+2] - 10);
    }
  },

  _cool(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.max(0, d[i] - 10);
      d[i+2] = Math.min(255, d[i+2] + 15);
    }
  },

  _glitch(ctx, canvas) {
    const sliceCount = 8;
    const sliceHeight = canvas.height / sliceCount;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < sliceCount; i++) {
      if (Math.random() > 0.5) {
        const offset = Math.floor(Math.random() * 40 - 20);
        const y = Math.floor(i * sliceHeight);
        const h = Math.floor(sliceHeight);
        const slice = ctx.getImageData(0, y, canvas.width, h);
        ctx.putImageData(slice, offset, y);
      }
    }

    // RGB shift
    const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = finalData.data;
    const shift = 5;
    for (let i = shift * 4; i < d.length; i++) {
      d[i] = d[i - shift * 4]; // shift red channel
    }
    ctx.putImageData(finalData, 0, 0);
  },

  _pixelate(ctx, canvas, size = 12) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;

    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const i = (y * w + x) * 4;
        const r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, size, size);
      }
    }
  }
};