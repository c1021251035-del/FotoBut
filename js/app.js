const App = {
  mode: 'preview',
  locked: false,
  els: {},
  gallery: null,

  async boot() {
    this.els = {
      video: document.getElementById('video'),
      canvas: document.getElementById('canvas'),
      stage: document.getElementById('stage'),
      resultPanel: document.getElementById('result-panel'),
      resultCanvas: document.getElementById('result-canvas'),
      captureBtn: document.getElementById('btn-capture'),
      flipBtn: document.getElementById('btn-flip'),
      flashBtn: document.getElementById('btn-flash'),
      countdown: document.getElementById('countdown'),
      flash: document.getElementById('flash'),
      effectName: document.getElementById('effect-name'),
      effectSlider: document.getElementById('effect-slider'),
      downloadBtn: document.getElementById('btn-download'),
      shareBtn: document.getElementById('btn-share'),
      retakeBtn: document.getElementById('btn-retake'),
      galleryBtn: document.getElementById('btn-gallery'),
      galleryModal: document.getElementById('gallery-modal'),
      galGrid: document.getElementById('gal-grid'),
      galEmpty: document.getElementById('gal-empty'),
      galClose: document.getElementById('gal-close')
    };

    Engine.init(this.els.canvas);
    this.gallery = new Gallery(
      this.els.galleryModal, this.els.galGrid,
      this.els.galEmpty, this.els.galClose
    );

    // Camera
    try {
      await Camera.init(this.els.video);
    } catch (e) {
      this.els.stage.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">📷</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:4px;color:#fff">Kamera tidak tersedia</div>
          <div style="font-size:13px;color:#888;margin-bottom:16px">${e.message}</div>
          <button onclick="location.reload()" style="background:#fff;color:#000;border:none;padding:12px 32px;border-radius:24px;font-size:16px;cursor:pointer">Coba Lagi</button>
        </div>
      `;
      return;
    }

    this._bind();
    this._renderLoop();
    this._initEffects();
  },

  _bind() {
    this.els.captureBtn.onclick = () => this.capture();
    this.els.flipBtn.onclick = () => Camera.toggleFacing();
    this.els.flashBtn.onclick = () => this._doFlash();
    this.els.downloadBtn.onclick = () => Export.download(this.els.resultCanvas);
    this.els.shareBtn.onclick = () => Export.share(this.els.resultCanvas);
    this.els.retakeBtn.onclick = () => this.reset();
    this.els.galleryBtn.onclick = () => this.gallery.open();

    // Effect cycling via indicator tap
    this.els.effectName.onclick = () => this._nextEffect();

    // Slider for effect intensity
    this.els.effectSlider.oninput = () => {
      Effects.intensity = parseInt(this.els.effectSlider.value);
    };

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && this.mode === 'preview') {
        e.preventDefault();
        this.capture();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        Effects.current = (Effects.current + dir + Effects.list.length) % Effects.list.length;
        this._updateEffectUI();
      }
    });
  },

  _initEffects() {
    this._updateEffectUI();
  },

  _nextEffect() {
    Effects.current = (Effects.current + 1) % Effects.list.length;
    this._updateEffectUI();
  },

  _updateEffectUI() {
    const fx = Effects.list[Effects.current];
    this.els.effectName.textContent = fx.name;
    // Show slider only for intensity-variable effects
    const hasIntensity = fx.id === 'blur' || fx.id === 'pixelate';
    this.els.effectSlider.style.display = hasIntensity ? '' : 'none';
    this.els.effectSlider.value = Effects.intensity;
  },

  _doFlash() {
    this.els.flash.classList.remove('active');
    void this.els.flash.offsetWidth;
    this.els.flash.classList.add('active');
    setTimeout(() => this.els.flash.classList.remove('active'), 200);
  },

  capture() {
    if (this.locked || this.mode !== 'preview') return;
    this.locked = true;
    this.mode = 'countdown';

    this.els.countdown.textContent = 3;
    this.els.countdown.classList.add('show');

    Timer.countdown(3, (remaining) => {
      this.els.countdown.textContent = remaining;
      this.els.countdown.classList.add('pop');
      setTimeout(() => this.els.countdown.classList.remove('pop'), 200);
    }, () => {
      this.els.countdown.classList.remove('show');
      this._doCapture();
    });
  },

  _doCapture() {
    // Flash
    this._doFlash();

    // Capture frame from current effect
    const captured = Engine.capture(Camera.video);

    // Show result
    this.mode = 'result';
    const resultCtx = this.els.resultCanvas.getContext('2d');
    const w = captured.width, h = captured.height;
    const dpr = window.devicePixelRatio || 1;
    this.els.resultCanvas.width = w * dpr;
    this.els.resultCanvas.height = h * dpr;
    this.els.resultCanvas.style.width = w + 'px';
    this.els.resultCanvas.style.height = h + 'px';
    resultCtx.scale(dpr, dpr);
    resultCtx.drawImage(captured, 0, 0, w, h);

    this.els.stage.classList.add('hidden');
    this.els.resultPanel.classList.remove('hidden');

    // Save to gallery
    Export.toBlob(this.els.resultCanvas).then(blob => {
      const fx = Effects.list[Effects.current];
      PhotoDB.save(blob, { effect: fx.name, width: w, height: h });
    });

    this.locked = false;
  },

  reset() {
    this.mode = 'preview';
    this.els.stage.classList.remove('hidden');
    this.els.resultPanel.classList.add('hidden');
    this.locked = false;
  },

  _renderLoop() {
    const loop = () => {
      if (this.mode === 'preview' && Camera.stream) {
        Engine.draw(Camera.video);
      }
      requestAnimationFrame(loop);
    };
    loop();
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try { await App.boot(); }
  catch (e) {
    console.error(e);
    document.getElementById('stage').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">⚠️</div>
        <div style="font-size:18px;color:#fff;margin-bottom:16px">${e.message || 'Gagal memuat aplikasi'}</div>
        <button onclick="location.reload()" style="background:#fff;color:#000;border:none;padding:12px 32px;border-radius:24px;font-size:16px;cursor:pointer">Coba Lagi</button>
      </div>
    `;
  }
});