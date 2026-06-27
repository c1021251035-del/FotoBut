const Camera = {
  stream: null,
  video: null,
  facing: 'user',

  async init(videoEl) {
    this.video = videoEl;
    return this.start();
  },

  async start() {
    if (this.stream) this.stop();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('No camera support');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      return true;
    } catch (e) {
      if (this.facing === 'environment') {
        this.facing = 'user';
        return this.start();
      }
      throw new Error('Camera: ' + e.message);
    }
  },

  async toggleFacing() {
    this.facing = this.facing === 'user' ? 'environment' : 'user';
    return this.start();
  },

  stop() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }
};