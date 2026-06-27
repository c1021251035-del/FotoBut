const CanvasEngine = {
  _liveCanvas: null,
  _resultCanvas: null,
  _previewCtx: null,
  _resultCtx: null,
  _dpr: 1,
  _animFrame: null,
  _backBuffer: null,
  _textEditor: null,

  init(renderEl, resultEl) {
    this._liveCanvas = renderEl;
    this._resultCanvas = resultEl;
    this._previewCtx = renderEl.getContext('2d');
    this._resultCtx = resultEl.getContext('2d');
    this._dpr = window.devicePixelRatio || 1;
  },

  setTextEditor(te) {
    this._textEditor = te;
  },

  setTemplateEditor(te) {
    this._templateEditor = te;
  },

  setDims(width, height) {
    const dpr = this._dpr;
    [this._liveCanvas, this._resultCanvas].forEach(c => {
      c.width = width * dpr;
      c.height = height * dpr;
      c.style.width = width + 'px';
      c.style.height = height + 'px';
    });
  },

  drawPreview(video, template) {
    const ctx = this._previewCtx;
    const dpr = this._dpr;
    const c = template.canvas;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, c.width, c.height);

    // Background
    ctx.fillStyle = c.background || '#fff';
    ctx.fillRect(0, 0, c.width, c.height);

    // Photo slots with video
    template.photoSlots?.forEach(slot => {
      const pos = TemplateManager.getPhotoPosition(slot);
      ctx.save();
      if (slot.rotation) ctx.translate(pos.x + pos.w/2, pos.y + pos.h/2);
      if (slot.rotation) ctx.rotate(slot.rotation * Math.PI / 180);
      if (slot.rotation) ctx.translate(-(pos.x + pos.w/2), -(pos.y + pos.h/2));
      this._clipSlot(ctx, pos, slot.borderRadius);
      ctx.clip();

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const slotAspect = pos.w / pos.h;
      const vidAspect = vw / vh;
      let sx, sy, sw, sh;
      if (vidAspect > slotAspect) { sh = vh; sw = vh * slotAspect; sx = (vw - sw) / 2; sy = 0; }
      else { sw = vw; sh = vw / slotAspect; sx = 0; sy = (vh - sh) / 2; }

      const fil = this._filterCSS(Effects.current);
      if (fil !== 'none') ctx.filter = fil;
      ctx.drawImage(video, sx, sy, sw, sh, pos.x, pos.y, pos.w, pos.h);
      ctx.filter = 'none';
      ctx.restore();
    });

    // Apply full-canvas effect (glitch/pixelate)
    if (Effects.current === 'glitch' || Effects.current === 'pixelate') {
      const tmpData = ctx.getImageData(0, 0, c.width * dpr, c.height * dpr);
      Effects.apply(this._liveCanvas, Effects.current);
    }

    // Decorations
    template.decorations?.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach(dec => {
      const img = TemplateManager._loaded[dec.src];
      if (img) ctx.drawImage(img, c.width * dec.x / 100, c.height * dec.y / 100,
        c.width * dec.width / 100, c.height * dec.height / 100);
    });

    // Text slots
    template.textSlots?.forEach(slot => {
      const text = this._textEditor?.getSlotText(slot.id) || slot.defaultText || '';
      ctx.font = `${slot.fontSize}px ${slot.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = slot.color || '#000';
      ctx.textAlign = slot.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, c.width * slot.x / 100, c.height * slot.y / 100);
    });

    // Free active text
    if (this._textEditor) {
      const at = this._textEditor.getActiveTextRender();
      if (at) this._drawActiveText(ctx, at, dpr);
    }

    // Stickers
    StickerManager.renderAll(ctx, dpr);

    // Editor overlay
    if (this._templateEditor) {
      this._templateEditor.renderEditorOverlay(ctx, dpr);
    }

    ctx.restore();
  },

  composeResult(video, template, captures) {
    const ctx = this._resultCtx;
    const dpr = this._dpr;
    const c = template.canvas;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, c.width, c.height);

    ctx.fillStyle = c.background || '#fff';
    ctx.fillRect(0, 0, c.width, c.height);

    // Photo slots from captures
    template.photoSlots?.forEach((slot, i) => {
      const pos = TemplateManager.getPhotoPosition(slot);
      const src = captures[slot.index] ?? captures[i] ?? captures[0];
      if (!src) return;

      ctx.save();
      this._clipSlot(ctx, pos, slot.borderRadius);
      ctx.clip();
      ctx.drawImage(src, pos.x, pos.y, pos.w, pos.h);
      ctx.restore();
    });

    // Decorations
    template.decorations?.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach(dec => {
      const img = TemplateManager._loaded[dec.src];
      if (img) ctx.drawImage(img, c.width * dec.x / 100, c.height * dec.y / 100,
        c.width * dec.width / 100, c.height * dec.height / 100);
    });

    // Text slots
    template.textSlots?.forEach(slot => {
      const text = this._textEditor?.getSlotText(slot.id) || slot.defaultText || '';
      ctx.font = `${slot.fontSize}px ${slot.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = slot.color || '#000';
      ctx.textAlign = slot.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, c.width * slot.x / 100, c.height * slot.y / 100);
    });

    // Free text
    if (this._textEditor) {
      const at = this._textEditor.getActiveTextRender();
      if (at) this._drawActiveText(ctx, at, dpr);
    }

    // Stickers onto result
    StickerManager.renderAll(ctx, dpr);

    ctx.restore();
    return this._resultCanvas;
  },

  _clipSlot(ctx, pos, borderRadius) {
    ctx.beginPath();
    if (borderRadius) {
      const r = borderRadius;
      ctx.moveTo(pos.x + r, pos.y);
      ctx.lineTo(pos.x + pos.w - r, pos.y);
      ctx.quadraticCurveTo(pos.x + pos.w, pos.y, pos.x + pos.w, pos.y + r);
      ctx.lineTo(pos.x + pos.w, pos.y + pos.h - r);
      ctx.quadraticCurveTo(pos.x + pos.w, pos.y + pos.h, pos.x + pos.w - r, pos.y + pos.h);
      ctx.lineTo(pos.x + r, pos.y + pos.h);
      ctx.quadraticCurveTo(pos.x, pos.y + pos.h, pos.x, pos.y + pos.h - r);
      ctx.lineTo(pos.x, pos.y + r);
      ctx.quadraticCurveTo(pos.x, pos.y, pos.x + r, pos.y);
      ctx.closePath();
    } else ctx.rect(pos.x, pos.y, pos.w, pos.h);
  },

  _drawActiveText(ctx, at, dpr) {
    ctx.save();
    ctx.font = `${at.fontSize}px ${at.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = at.color;

    // Shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(at.text, at.x, at.y);
    ctx.restore();

    // Selection indicator
    if (at.selected) {
      ctx.save();
      const metrics = ctx.measureText(at.text);
      const tw = metrics.width;
      const th = at.fontSize;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2 / dpr;
      ctx.setLineDash([4 / dpr, 4 / dpr]);
      ctx.strokeRect(at.x - tw / 2 - 6, at.y - th / 2 - 4, tw + 12, th + 8);
      ctx.setLineDash([]);
      ctx.restore();
    }
  },

  _filterCSS(type) {
    const map = {
      sepia: 'sepia(1)', bw: 'grayscale(1)',
      vintage: 'sepia(0.6) contrast(1.1) brightness(0.9)',
      warm: 'saturate(1.3) sepia(0.2)',
      cool: 'saturate(0.8) hue-rotate(-10deg)'
    };
    return map[type] || 'none';
  },

  clear() {
    const dpr = this._dpr;
    [this._previewCtx, this._resultCtx].forEach(ctx => {
      ctx.clearRect(0, 0, this._liveCanvas.width / dpr, this._liveCanvas.height / dpr);
    });
  }
};