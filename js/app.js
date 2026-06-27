const App = {
  mode: 'preview', // preview | countdown | capturing | burst | result | editor
  captures: [],
  burstCount: 4,
  filter: 'none',
  els: {},
  stickerPanel: null,
  textEditor: null,
  gallery: null,
  templateEditor: null,
  _editorTemplate: null,
  _canvasCoords: {},
  gifBlob: null,

  async boot() {
    this.els = {
      video: document.getElementById('video'),
      previewCanvas: document.getElementById('preview-canvas'),
      resultCanvas: document.getElementById('result-canvas'),
      stage: document.getElementById('stage'),
      resultPanel: document.getElementById('result-panel'),
      captureBtn: document.getElementById('btn-capture'),
      flipBtn: document.getElementById('btn-flip'),
      filterBtns: document.querySelectorAll('.filter-btn'),
      countdown: document.getElementById('countdown'),
      downloadBtn: document.getElementById('btn-download'),
      downloadGifBtn: document.getElementById('btn-download-gif'),
      shareBtn: document.getElementById('btn-share'),
      retakeBtn: document.getElementById('btn-retake'),
      retakeResultBtn: document.getElementById('btn-retake-result'),
      templateBar: document.getElementById('template-bar'),
      torchBtn: document.getElementById('btn-torch'),
      stickerPanel: document.getElementById('sticker-panel'),
      editorPanel: document.getElementById('editor-panel'),
      stickerBtn: document.getElementById('btn-sticker'),
      textBtn: document.getElementById('btn-text'),
      editorBtn: document.getElementById('btn-editor'),
      galleryBtn: document.getElementById('btn-gallery'),
      galleryModal: document.getElementById('gallery-modal'),
      soundBtn: document.getElementById('btn-sound'),
      themeBtn: document.getElementById('btn-theme'),
      filterBar: document.getElementById('effect-filters'),
      templateBar: document.getElementById('template-bar'),
      togglePanel: document.getElementById('toggle-panel'),
    };

    CanvasEngine.init(this.els.previewCanvas, this.els.resultCanvas);

    // Init sticker images
    await StickerManager.init();

    // Load templates
    await TemplateManager.loadAll();
    const t = TemplateManager.current;
    if (t) {
      CanvasEngine.setDims(t.canvas.width, t.canvas.height);
      await this._loadDecorations(t);
    }

    // Init text editor
    this.textEditor = new TextEditor(this.els.editorPanel, () => {
      // re-render on text change
    });
    if (t) this.textEditor.registerSlots(t);
    CanvasEngine.setTextEditor(this.textEditor);

    // Init sticker panel
    this.stickerPanel = new StickerPanel(this.els.stickerPanel, (src) => {
      this._placeStickerAtCenter(src);
    });

    // Init gallery
    this.gallery = new Gallery(this.els.galleryModal, () => {
      this.els.galleryModal.classList.add('hidden');
    });

    // Init template editor
    this.templateEditor = new TemplateEditor(this);
    CanvasEngine.setTemplateEditor(this.templateEditor);

    // Load custom templates
    this._loadCustomTemplates();

    // Start camera
    try {
      await Camera.init(this.els.video);
      this.els.flipBtn.style.display = '';
      if (Camera.torchSupported) this.els.torchBtn.style.display = '';
    } catch (e) {
      alert('Camera tidak tersedia. Pastikan izinkan akses kamera.');
    }

    // Init sound state
    if (Sound.isMuted()) {
      this.els.soundBtn.textContent = '🔇';
    }
    // Init theme state
    const dark = localStorage.getItem('fotobut_theme') !== 'light';
    if (!dark) {
      document.body.classList.add('light');
      this.els.themeBtn.textContent = '☀️';
    }

    this._bindEvents();
    this._renderLoop();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  },

  _bindEvents() {
    this.els.captureBtn.addEventListener('click', () => this.capture());
    this.els.flipBtn.addEventListener('click', () => Camera.toggleFacing());
    this.els.downloadBtn.addEventListener('click', () => this.download());
    this.els.downloadGifBtn?.addEventListener('click', () => this.downloadGIF());
    this.els.shareBtn.addEventListener('click', () => this.share());
    this.els.retakeBtn.addEventListener('click', () => this.reset());
    this.els.retakeResultBtn?.addEventListener('click', () => this.reset());
    this.els.torchBtn?.addEventListener('click', () => {
      Camera.torchSupported && Camera.setTorch(true);
    });
    this.els.galleryBtn?.addEventListener('click', () => {
      this.gallery?.open();
    });
    this.els.editorBtn?.addEventListener('click', () => {
      this.templateEditor?.enter();
    });
    this.els.soundBtn?.addEventListener('click', () => this._toggleSound());
    this.els.themeBtn?.addEventListener('click', () => this._toggleTheme());

    // Template bar
    this._renderTemplateBar();

    // Filter buttons
    this.els.filterBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.filter || 'none';
        Effects.current = this.filter;
        this.els.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Toggle panel
    this.els.stickerBtn?.addEventListener('click', () => this._togglePanel('sticker'));
    this.els.textBtn?.addEventListener('click', () => {
      this.textEditor?.open();
    });

    // Canvas interactions (sticker drag, text placement)
    this._bindCanvasInteractions();

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && this.mode === 'preview') { e.preventDefault(); this.capture(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.mode === 'preview') {
          const sel = StickerManager.getSelected();
          if (sel) { StickerManager.remove(sel.id); }
        }
      }
      if (e.key === 'Escape') {
        StickerManager.deselectAll();
        this.textEditor?.close();
        this.els.stickerPanel?.classList.remove('open');
      }
    });
  },

  _bindCanvasInteractions() {
    const canvas = this.els.previewCanvas;
    if (!canvas) return;

    const getCanvasCoords = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const t = TemplateManager.current;
      if (!t) return { x: 0, y: 0 };
      const scaleX = t.canvas.width / rect.width;
      const scaleY = t.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    let dragging = null, dragOff = {};
    let longPressTimer = null;

    const pointerDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      const coords = getCanvasCoords(p.clientX, p.clientY);

      // Hit-test stickers
      const hit = StickerManager.hitTest(coords.x, coords.y);
      if (hit) {
        StickerManager.select(hit.id);
        dragging = hit;
        dragOff = { x: coords.x - hit.x, y: coords.y - hit.y };
        e.preventDefault();
        return;
      }

      StickerManager.deselectAll();
      // Deselect active text
      if (this.textEditor?.activeText) this.textEditor.activeText.selected = false;

      // Long press to add text at point
      longPressTimer = setTimeout(() => {
        if (this.mode === 'preview') {
          const at = this.textEditor?.addFreeText(coords.x, coords.y);
          this.textEditor?.open();
        }
      }, 600);
    };

    const pointerMove = (e) => {
      const p = e.touches ? e.touches[0] : e;
      const coords = getCanvasCoords(p.clientX, p.clientY);

      if (dragging) {
        if (e.cancelable) e.preventDefault();
        StickerManager.moveTo(dragging.id, coords.x - dragOff.x, coords.y - dragOff.y);
      }

      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const pointerUp = () => {
      dragging = null;
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    };

    // Mouse events
    canvas.addEventListener('mousedown', pointerDown);
    canvas.addEventListener('mousemove', pointerMove);
    canvas.addEventListener('mouseup', pointerUp);
    canvas.addEventListener('mouseleave', pointerUp);

    // Touch events
    canvas.addEventListener('touchstart', pointerDown, { passive: true });
    canvas.addEventListener('touchmove', pointerMove, { passive: true });
    canvas.addEventListener('touchend', pointerUp);

    // Pinch-to-scale on selected sticker
    let lastPinchDist = 0;
    canvas.addEventListener('gesturestart', (e) => e.preventDefault());
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const t = e.touches;
        const dx = t[0].clientX - t[1].clientX;
        const dy = t[0].clientY - t[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0 && dist > 0) {
          const sel = StickerManager.getSelected();
          if (sel) {
            StickerManager.setScale(sel.id, sel.scale * (dist / lastPinchDist));
          }
        }
        lastPinchDist = dist;
      }
    });

    // Mouse wheel = rotate selected sticker
    canvas.addEventListener('wheel', (e) => {
      const sel = StickerManager.getSelected();
      if (sel) {
        StickerManager.setRotation(sel.id, sel.rotation + (e.deltaY > 0 ? 15 : -15));
        e.preventDefault();
      }
    }, { passive: false });
  },

  _togglePanel(type) {
    const panel = this.els.stickerPanel;
    if (panel?.classList.contains('open') && panel.dataset.type === type) {
      panel.classList.remove('open');
      return;
    }
    if (panel) {
      panel.dataset.type = type;
      panel.classList.add('open');
    }
  },

  _placeStickerAtCenter(src) {
    const t = TemplateManager.current;
    if (!t) return;
    StickerManager.place(src, t.canvas.width / 2, t.canvas.height / 2);
    this.els.stickerPanel?.classList.remove('open');
  },

  _loadCustomTemplates() {
    const customs = Store.get('custom_templates', []);
    if (customs.length) {
      TemplateManager.templates = TemplateManager.templates.filter(t => !t.id.startsWith('custom_'));
      TemplateManager.templates.unshift(...customs);
      this._renderTemplateBar();
    }
  },

  _toggleSound() {
    const muted = Sound.isMuted();
    Sound.setMuted(!muted);
    this.els.soundBtn.textContent = !muted ? '🔇' : '🔊';
  },

  _toggleTheme() {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('fotobut_theme', isLight ? 'light' : 'dark');
    this.els.themeBtn.textContent = isLight ? '☀️' : '🌙';
  },

  _renderTemplateBar() {
    const bar = this.els.templateBar;
    if (!bar) return;
    bar.innerHTML = '';
    TemplateManager.templates.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'template-pill' + (t.id === TemplateManager.current?.id ? ' active' : '');
      btn.textContent = t.name;
      btn.dataset.templateId = t.id;
      btn.addEventListener('click', () => this.switchTemplate(t.id));
      bar.appendChild(btn);
    });
  },

  switchTemplate(id) {
    const t = TemplateManager.select(id);
    if (!t) return;
    CanvasEngine.setDims(t.canvas.width, t.canvas.height);
    this._loadDecorations(t);
    this.textEditor?.registerSlots(t);
    this._renderTemplateBar();
  },

  async _loadDecorations(template) {
    if (!template.decorations) return;
    for (const dec of template.decorations) {
      await TemplateManager.loadAsset(dec.src);
    }
  },

  capture() {
    if (this.mode !== 'preview') return;
    this.mode = 'countdown';
    this.els.captureBtn.disabled = true;
    this.els.countdown.textContent = 3;
    this.els.countdown.classList.add('show');

    Timer.countdown(3, (remaining) => {
      this.els.countdown.textContent = remaining;
      this.els.countdown.classList.add('pop');
      Sound.countdownBeep(remaining);
      setTimeout(() => this.els.countdown.classList.remove('pop'), 200);
    }, () => {
      this.els.countdown.classList.remove('show');
      this._doCapture();
    });
  },

  _doCapture() {
    if (this.burstCount > 1) {
      this.mode = 'burst';
      this.captures = [];
      Timer.burst(this.burstCount, 1200, (shot) => {
        this._snapShot();
        this.els.countdown.textContent = shot;
        this.els.countdown.classList.add('show');
        Sound.burstShot(shot);
        setTimeout(() => this.els.countdown.classList.remove('show'), 400);
      }, () => this._showResult());
    } else {
      this.mode = 'capturing';
      this._snapShot();
      this._showResult();
    }
  },

  _snapShot() {
    const c = document.createElement('canvas');
    Camera.captureFrame(c);
    if (this.filter !== 'none') Effects.apply(c, this.filter);
    this.captures.push(c);
    Sound.shutter();
  },

  _showResult() {
    this.mode = 'result';
    this.els.stage.classList.add('hidden');
    this.els.resultPanel.classList.remove('hidden');
    this.els.captureBtn.disabled = false;

    const t = TemplateManager.current;
    // Stickers and text are baked into the composite
    CanvasEngine.composeResult(Camera.video, t, this.captures);

    // Show GIF button if burst mode (multiple captures)
    if (this.captures.length > 1) {
      this.els.downloadGifBtn.style.display = '';
      // Pre-generate GIF
      BurstGIF.create(this.captures).then(blob => {
        this.gifBlob = blob;
        // Save to gallery
        PhotoDB.save(blob, { isGif: true, width: 0, height: 0, filter: this.filter, template: t.id });
      });
    }

    // Save still photo to gallery
    Export.toBlob(this.els.resultCanvas).then(blob => {
      PhotoDB.save(blob, { width: t.canvas.width, height: t.canvas.height, filter: this.filter, template: t.id });
    });

    // Completion sound
    Sound.complete();
  },

  download() {
    Export.download(this.els.resultCanvas);
  },

  async downloadGIF() {
    if (!this.gifBlob) {
      this.gifBlob = await BurstGIF.create(this.captures);
    }
    if (!this.gifBlob) return;
    const url = URL.createObjectURL(this.gifBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fotobut-burst.gif';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },

  share() {
    Export.share(this.els.resultCanvas);
  },

  reset() {
    this.mode = 'preview';
    this.captures = [];
    this.els.captureBtn.disabled = false;
    this.els.stage.classList.remove('hidden');
    this.els.resultPanel.classList.add('hidden');
    StickerManager.clear();
    this.textEditor?.deleteActiveText();
    CanvasEngine.clear();
  },

  _renderLoop() {
    const loop = () => {
      if (this.mode === 'preview' && Camera.stream) {
        CanvasEngine.drawPreview(Camera.video, TemplateManager.current);
      }
      requestAnimationFrame(loop);
    };
    loop();
  }
};

document.addEventListener('DOMContentLoaded', () => App.boot());