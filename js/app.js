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
      closeResultBtn: document.getElementById('btn-close-result'),
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

    this._bind();
    this._initEffects();

    // Camera — try environment first, then user
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia tidak tersedia');
      Camera.facing = 'user'; // user-facing lebih reliable di web
      await Camera.init(this.els.video);
      console.log('Camera OK');
    } catch (e) {
      console.warn('Camera init error:', e);
      // Show tap-to-retry UI instead of blocking
      this.els.effectName.textContent = '📷 Tap untuk kamera';
      this.els.effectName.onclick = async () => {
        try {
          await Camera.init(this.els.video);
          this.els.effectName.onclick = () => this._nextEffect();
          this.els.effectName.textContent = Effects.list[Effects.current].name;
        } catch (e2) {
          this.els.effectName.textContent = '❌ Kamera gagal';
        }
      };
    }

    this._renderLoop();
  },

  _bind() {
    this.els.captureBtn.onclick = () => this.capture();
    this.els.flipBtn.onclick = () => Camera.toggleFacing().catch(e => console.warn(e));
    this.els.flashBtn.onclick = () => this._doFlash();
    this.els.downloadBtn.onclick = () => Export.download(this.els.resultCanvas);
    this.els.shareBtn.onclick = () => Export.share(this.els.resultCanvas);
    this.els.retakeBtn.onclick = () => this.reset();
    this.els.closeResultBtn.onclick = () => this.reset();
    this.els.galleryBtn.onclick = () => this.gallery.open();
    this.els.effectName.onclick = () => this._nextEffect();
    this.els.effectSlider.oninput = () => {
      Effects.intensity = parseInt(this.els.effectSlider.value);
    };

    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && !this.locked) { e.preventDefault(); this.capture(); }
      if (e.key === 'ArrowRight') { Effects.current = (Effects.current + 1) % Effects.list.length; this._updateEffectUI(); }
      if (e.key === 'ArrowLeft') { Effects.current = (Effects.current - 1 + Effects.list.length) % Effects.list.length; this._updateEffectUI(); }
      if (e.key === 'Escape') { if (this.mode === 'result') this.reset(); }
    });
  },

  _initEffects() { this._updateEffectUI(); },

  _nextEffect() {
    Effects.current = (Effects.current + 1) % Effects.list.length;
    this._updateEffectUI();
  },

  _updateEffectUI() {
    const fx = Effects.list[Effects.current];
    this.els.effectName.textContent = fx.name;
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
    if (this.locked || !Camera.stream || this.mode !== 'preview') return;
    this.locked = true;
    this.mode = 'countdown';
    this.els.countdown.textContent = 3;
    this.els.countdown.classList.add('show');

    Timer.countdown(3, (r) => {
      this.els.countdown.textContent = r;
      this.els.countdown.classList.add('pop');
      setTimeout(() => this.els.countdown.classList.remove('pop'), 200);
    }, () => {
      this.els.countdown.classList.remove('show');
      this._doCapture();
    });
  },

  _doCapture() {
    this._doFlash();
    const captured = Engine.capture(Camera.video);
    const ctx = this.els.resultCanvas.getContext('2d');
    const w = captured.width, h = captured.height;
    this.els.resultCanvas.width = w;
    this.els.resultCanvas.height = h;
    this.els.resultCanvas.style.width = Math.min(w, window.innerWidth - 40) + 'px';
    this.els.resultCanvas.style.height = 'auto';
    ctx.drawImage(captured, 0, 0, w, h);

    this.mode = 'result';
    this.els.stage.classList.add('hidden');
    this.els.resultPanel.classList.remove('hidden');
    this.locked = false;

    Export.toBlob(this.els.resultCanvas).then(blob => {
      const fx = Effects.list[Effects.current];
      PhotoDB.save(blob, { effect: fx.name, width: w, height: h });
    }).catch(() => {});
  },

  reset() {
    this.mode = 'preview';
    this.els.stage.classList.remove('hidden');
    this.els.resultPanel.classList.add('hidden');
    this.locked = false;
  },

  _renderLoop() {
    const loop = () => {
      if (this.mode === 'preview' && Camera.stream && Camera.video.readyState >= 2) {
        try { Engine.draw(Camera.video); } catch (e) {}
      }
      requestAnimationFrame(loop);
    };
    loop();
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try { await App.boot(); }
  catch (e) {
    console.error('Boot error:', e);
    document.getElementById('stage').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:24px;text-align:center;color:#fff">
        <div style="font-size:48px;margin-bottom:8px">⚠️</div>
        <div style="margin-bottom:16px;font-size:14px;color:#aaa">${e.message || 'Gagal load'}</div>
        <button onclick="location.reload()" style="background:#fff;color:#000;border:none;padding:10px 24px;border-radius:20px;font-size:14px;cursor:pointer">Coba Lagi</button>
      </div>`;
  }
});