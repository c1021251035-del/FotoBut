const Camera = {
  stream: null,
  video: null,
  facing: 'environment',
  torchSupported: false,

  async init(videoEl) {
    this.video = videoEl;
    return this.start();
  },

  async start() {
    if (this.stream) this.stop();

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Browser tidak mendukung akses kamera (getUserMedia tidak tersedia)');
    }

    const constraints = {
      video: {
        facingMode: this.facing,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      this.checkTorch();
      return true;
    } catch (e) {
      // Try fallback: user-facing camera
      if (this.facing === 'environment') {
        this.facing = 'user';
        return this.start();
      }
      throw new Error('Kamera tidak tersedia: ' + e.message);
    }
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  },

  async toggleFacing() {
    this.facing = this.facing === 'environment' ? 'user' : 'environment';
    return this.start();
  },

  checkTorch() {
    if (!this.stream) return;
    const track = this.stream.getVideoTracks()[0];
    if (track && 'getCapabilities' in track) {
      const caps = track.getCapabilities();
      this.torchSupported = !!caps.torch;
    }
  },

  async setTorch(on) {
    if (!this.torchSupported) return false;
    const track = this.stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] });
      return true;
    } catch { return false; }
  },

  getCapabilities() {
    if (!this.stream) return {};
    const track = this.stream.getVideoTracks()[0];
    return track?.getCapabilities?.() ?? {};
  },

  captureFrame(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    ctx.drawImage(this.video, 0, 0);
    return canvas;
  }
};