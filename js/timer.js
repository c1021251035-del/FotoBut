const Timer = {
  _interval: null,
  running: false,

  countdown(seconds, onTick, onComplete) {
    this.running = true;
    let remaining = seconds;
    const tick = () => {
      if (remaining <= 0) { this.stop(); onComplete?.(); return; }
      onTick?.(remaining);
      remaining--;
    };
    tick();
    this._interval = setInterval(tick, 1000);
  },

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
    this.running = false;
  }
};