const Sound = {
  _ctx: null,
  _muted: false,

  _getCtx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },

  setMuted(muted) {
    this._muted = !!muted;
    try { localStorage.setItem('fotobut_sound_muted', this._muted ? '1' : '0'); } catch {}
  },

  isMuted() {
    if (this._muted) return true;
    try { return localStorage.getItem('fotobut_sound_muted') === '1'; } catch { return false; }
  },

  _enabled() {
    try { return localStorage.getItem('fotobut_sound_muted') !== '1'; } catch { return true; }
  },

  _play(wave, freq, duration, type = 'sine', gain = 0.3) {
    if (!this._enabled()) return;
    try {
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  },

  beep(freq = 880, duration = 0.1, type = 'square', gain = 0.15) {
    this._play(null, freq, duration, type, gain);
  },

  shutter() {
    // Cascading noise burst simulates camera shutter
    try {
      const ctx = this._getCtx();
      const dur = 0.08;
      // Noise burst
      const bufferSize = ctx.sampleRate * dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      noise.connect(g);
      g.connect(ctx.destination);
      noise.start(ctx.currentTime);

      // Mechanical click overlay
      this._play(null, 150, 0.03, 'square', 0.3);
      setTimeout(() => this._play(null, 200, 0.02, 'square', 0.2), 40);
    } catch {}
  },

  countdownBeep(remaining) {
    if (remaining === 1) {
      // Last beep — higher pitch
      this.beep(1200, 0.15, 'square', 0.2);
    } else {
      this.beep(660, 0.1, 'square', 0.12);
    }
  },

  burstShot(index) {
    this.beep(880 + index * 100, 0.12, 'sine', 0.2);
  },

  complete() {
    // Short ascending jingle
    this.beep(523, 0.12, 'sine', 0.2);
    setTimeout(() => this.beep(659, 0.12, 'sine', 0.2), 120);
    setTimeout(() => this.beep(784, 0.18, 'sine', 0.25), 240);
  },

  toggle() {
    this.beep(440, 0.06, 'sine', 0.1);
  }
};