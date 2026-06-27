const Timer = {
  _interval: null,
  _cb: null,
  running: false,

  countdown(seconds, onTick, onComplete) {
    this.running = true;
    let remaining = seconds;

    this._cb = () => {
      if (remaining <= 0) {
        this.stop();
        onComplete?.();
        return;
      }
      onTick?.(remaining);
      remaining--;
    };

    this._cb(); // show initial
    this._interval = setInterval(this._cb, 1000);
  },

  burst(total, intervalMs, onShot, onComplete) {
    this.running = true;
    let shot = 0;
    let label = total;

    const fire = () => {
      shot++;
      if (shot > total) {
        this.stop();
        onComplete?.();
        return;
      }
      onShot?.(shot, total);
    };

    fire();
    this._interval = setInterval(fire, intervalMs);
  },

  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
    this.running = false;
  }
};