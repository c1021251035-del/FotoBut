const Effects = {
  list: [
    { id: 'normal', name: 'Normal', fn: null },
    { id: 'bw', name: 'B&W', fn: 'bw' },
    { id: 'sepia', name: 'Sepia', fn: 'sepia' },
    { id: 'vintage', name: 'Vintage', fn: 'vintage' },
    { id: 'warm', name: 'Warm', fn: 'warm' },
    { id: 'cool', name: 'Cool', fn: 'cool' },
    { id: 'invert', name: 'Invert', fn: 'invert' },
    { id: 'blur', name: 'Blur', fn: 'blur' },
    { id: 'sharpen', name: 'Sharpen', fn: 'sharpen' },
    { id: 'edge', name: 'Edge', fn: 'edge' },
    { id: 'emboss', name: 'Emboss', fn: 'emboss' },
    { id: 'pixelate', name: 'Pixelate', fn: 'pixelate' },
    { id: 'mirror', name: 'Mirror', fn: 'mirror' },
    { id: 'glitch-rgb', name: 'RGB Shift', fn: 'glitchRgb' },
    { id: 'halftone', name: 'Halftone', fn: 'halftone' },
    { id: 'neon', name: 'Neon', fn: 'neon' },
    { id: 'duotone', name: 'Duotone', fn: 'duotone' },
    { id: 'sketch', name: 'Sketch', fn: 'sketch' },
    { id: 'thermal', name: 'Thermal', fn: 'thermal' },
    { id: 'xray', name: 'X-Ray', fn: 'xray' },
    { id: 'lomo', name: 'Lomo', fn: 'lomo' },
    { id: 'sobel', name: 'Sobel', fn: 'sobel' }
  ],
  current: 0,
  intensity: 50,

  apply(ctx, w, h, effectId, intensity = 50) {
    const fx = this.list.find(e => e.id === effectId);
    if (!fx || !fx.fn) return;
    const i = intensity / 100;
    if (this[fx.fn]) this[fx.fn](ctx, w, h, i);
  },

  // ========== PIXEL EFFECTS (direct pixel manipulation) ==========
  bw(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const avg = d.data[i] * 0.299 + d.data[i+1] * 0.587 + d.data[i+2] * 0.114;
      d.data[i] = d.data[i+1] = d.data[i+2] = avg;
    }
    ctx.putImageData(d, 0, 0);
  },

  sepia(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      const r = da[i], g = da[i+1], b = da[i+2];
      da[i]   = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      da[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      da[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }
    ctx.putImageData(d, 0, 0);
  },

  vintage(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      da[i] = Math.min(255, da[i] * 1.1 + 20);
      da[i+1] = Math.min(255, da[i+1] * 0.9 + 10);
      da[i+2] = Math.min(255, da[i+2] * 0.8);
    }
    ctx.putImageData(d, 0, 0);
  },

  warm(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      da[i] = Math.min(255, da[i] + 20);
      da[i+2] = Math.max(0, da[i+2] - 15);
    }
    ctx.putImageData(d, 0, 0);
  },

  cool(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      da[i] = Math.max(0, da[i] - 15);
      da[i+2] = Math.min(255, da[i+2] + 20);
    }
    ctx.putImageData(d, 0, 0);
  },

  invert(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      da[i] = 255 - da[i];
      da[i+1] = 255 - da[i+1];
      da[i+2] = 255 - da[i+2];
    }
    ctx.putImageData(d, 0, 0);
  },

  thermal(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      const v = (da[i] + da[i+1] + da[i+2]) / 3;
      if (v < 85) { da[i] = 0; da[i+1] = 0; da[i+2] = 255; }
      else if (v < 170) { da[i] = 255; da[i+1] = 0; da[i+2] = 0; }
      else { da[i] = 255; da[i+1] = 255; da[i+2] = 0; }
    }
    ctx.putImageData(d, 0, 0);
  },

  xray(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      const r = da[i], g = da[i+1], b = da[i+2];
      da[i] = Math.min(255, 255 - Math.abs(r - g));
      da[i+1] = Math.min(255, 255 - Math.abs(g - b));
      da[i+2] = Math.min(255, 255 - Math.abs(b - r));
    }
    ctx.putImageData(d, 0, 0);
  },

  lomo(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    const cx = w / 2, cy = h / 2, maxDist = Math.sqrt(cx*cx + cy*cy);
    for (let px = 0; px < w; px++) {
      for (let py = 0; py < h; py++) {
        const idx = (py * w + px) * 4;
        const dist = Math.sqrt((px-cx)**2 + (py-cy)**2) / maxDist;
        const vignette = 1 - dist * 0.3;
        da[idx] *= vignette; da[idx+1] *= vignette; da[idx+2] *= vignette;
      }
    }
    ctx.putImageData(d, 0, 0);
  },

  neon(ctx, w, h) {
    this.sobel(ctx, w, h, true);
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      const v = (da[i] + da[i+1] + da[i+2]) / 3;
      if (v > 80) {
        da[i] = (i * 3) % 256;
        da[i+1] = (i * 7) % 256;
        da[i+2] = (i * 11) % 256;
      } else {
        da[i] = da[i+1] = da[i+2] = 0;
      }
    }
    ctx.putImageData(d, 0, 0);
  },

  duotone(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      const avg = (da[i] + da[i+1] + da[i+2]) / 3;
      if (avg < 128) { da[i] = 30; da[i+1] = 0; da[i+2] = 80; }
      else { da[i] = 255; da[i+1] = 200; da[i+2] = 50; }
    }
    ctx.putImageData(d, 0, 0);
  },

  sketch(ctx, w, h) {
    this.sobel(ctx, w, h, true);
    const d = ctx.getImageData(0, 0, w, h);
    const da = d.data;
    for (let i = 0; i < da.length; i += 4) {
      const v = 255 - (da[i] * 0.299 + da[i+1] * 0.587 + da[i+2] * 0.114);
      da[i] = da[i+1] = da[i+2] = Math.max(0, Math.min(255, v));
    }
    ctx.putImageData(d, 0, 0);
  },

  blur(ctx, w, h, intensity = 0.5) {
    const r = Math.max(1, Math.floor(intensity * 8));
    ctx.filter = `blur(${r}px)`;
    const d = ctx.getImageData(0, 0, w, h);
    ctx.filter = 'none';
    ctx.putImageData(d, 0, 0);
  },

  pixelate(ctx, w, h, intensity = 0.5) {
    const size = Math.max(3, Math.floor(intensity * 30 + 3));
    const d = ctx.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const i = (y * w + x) * 4;
        ctx.fillStyle = `rgb(${d.data[i]},${d.data[i+1]},${d.data[i+2]})`;
        ctx.fillRect(x, y, size, size);
      }
    }
  },

  glitchRgb(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const shift = Math.floor(Math.random() * 8) + 3;
    // Shift red channel
    for (let y = 0; y < h; y += Math.floor(Math.random() * 10) + 2) {
      const offset = (Math.floor(Math.random() * 20) - 10) * 4;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const si = i + offset;
        if (si >= 0 && si < d.data.length) d.data[i] = d.data[si];
      }
    }
    ctx.putImageData(d, 0, 0);
  },

  mirror(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w / 2; x++) {
        const i = (y * w + x) * 4;
        const mi = (y * w + (w - 1 - x)) * 4;
        d.data[i] = d.data[mi]; d.data[i+1] = d.data[mi+1];
        d.data[i+2] = d.data[mi+2]; d.data[i+3] = d.data[mi+3];
      }
    }
    ctx.putImageData(d, 0, 0);
  },

  sobel(ctx, w, h, gray = false) {
    const d = ctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);
    const kernelX = [-1,0,1,-2,0,2,-1,0,1];
    const kernelY = [-1,-2,-1,0,0,0,1,2,1];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let gxr=0,gxg=0,gxb=0, gyr=0,gyg=0,gyb=0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y+ky)*w + (x+kx))*4;
            const ki = (ky+1)*3 + kx+1;
            gxr += d.data[idx]*kernelX[ki]; gxg += d.data[idx+1]*kernelX[ki]; gxb += d.data[idx+2]*kernelX[ki];
            gyr += d.data[idx]*kernelY[ki]; gyg += d.data[idx+1]*kernelY[ki]; gyb += d.data[idx+2]*kernelY[ki];
          }
        }
        const i = (y*w + x)*4;
        if (gray) {
          const v = Math.min(255, Math.sqrt(gxr*gxr + gyr*gyr));
          out.data[i]=v; out.data[i+1]=v; out.data[i+2]=v;
        } else {
          out.data[i]=Math.min(255,Math.sqrt(gxr*gxr+gyr*gyr));
          out.data[i+1]=Math.min(255,Math.sqrt(gxg*gxg+gyg*gyg));
          out.data[i+2]=Math.min(255,Math.sqrt(gxb*gxb+gyb*gyb));
        }
        out.data[i+3]=255;
      }
    }
    ctx.putImageData(out, 0, 0);
  },

  edge(ctx, w, h) {
    this.sobel(ctx, w, h);
  },

  emboss(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y*w + x)*4;
        const tl = ((y-1)*w + (x-1))*4;
        const br = ((y+1)*w + (x+1))*4;
        out.data[i] = Math.min(255, Math.abs(d.data[i] - d.data[br] + 128));
        out.data[i+1] = Math.min(255, Math.abs(d.data[i+1] - d.data[br+1] + 128));
        out.data[i+2] = Math.min(255, Math.abs(d.data[i+2] - d.data[br+2] + 128));
        out.data[i+3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  },

  halftone(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const i = (y*w + x)*4;
        const v = (d.data[i] + d.data[i+1] + d.data[i+2]) / 3;
        const r = (1 - v/255) * 5;
        ctx.beginPath();
        ctx.arc(x + 4, y + 4, r, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
      }
    }
  },

  // CSS-based effects (lightweight for some)
  getCSSFilter(id, intensity = 0.5) {
    const map = {
      bw: 'grayscale(1)',
      sepia: 'sepia(0.8)',
      vintage: 'sepia(0.6) contrast(1.1) brightness(0.9)',
      warm: 'saturate(1.3) brightness(1.1)',
      cool: 'saturate(0.8) brightness(1.05) sepia(0.1)',
      invert: 'invert(1)',
      blur: `blur(${Math.floor(intensity * 10)}px)`
    };
    return map[effectsId] || 'none';
  }
};