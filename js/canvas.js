const Engine = {
  _canvas: null,
  _ctx: null,
  _dpr: 1,
  _effectFrame: null,

  init(canvasEl) {
    this._canvas = canvasEl;
    this._ctx = canvasEl.getContext('2d', { willReadFrequently: true });
    this._dpr = window.devicePixelRatio || 1;
  },

  draw(video) {
    const ctx = this._ctx;
    const dpr = this._dpr;
    const cw = video.videoWidth;
    const ch = video.videoHeight;

    // Size canvas
    this._canvas.width = cw * dpr;
    this._canvas.height = ch * dpr;
    this._canvas.style.width = cw + 'px';
    this._canvas.style.height = ch + 'px';

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.drawImage(video, 0, 0, cw, ch);

    // Apply current effect
    const fx = Effects.list[Effects.current];
    if (fx.fn) {
      Effects.apply(ctx, cw, ch, fx.id, Effects.intensity);
    }

    ctx.restore();
  },

  capture(video) {
    const off = document.createElement('canvas');
    const cw = video.videoWidth;
    const ch = video.videoHeight;
    off.width = cw;
    off.height = ch;
    const ctx = off.getContext('2d');
    ctx.drawImage(video, 0, 0, cw, ch);

    // Apply effect to captured frame
    const fx = Effects.list[Effects.current];
    if (fx.fn) {
      Effects.apply(ctx, cw, ch, fx.id, Effects.intensity);
    }
    return off;
  }
};