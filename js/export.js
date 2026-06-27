const Export = {
  format: 'png',
  quality: 0.92,
  scale: 1,

  async download(canvas, filename = 'fotobut-moment') {
    const ext = this.format === 'jpeg' ? 'jpg' : 'png';
    const blob = await this.toBlob(canvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },

  async share(canvas) {
    if (!navigator.share) return this.download(canvas);
    const blob = await this.toBlob(canvas);
    const file = new File([blob], 'fotobut-moment.png', { type: 'image/png' });
    try {
      await navigator.share({
        title: 'Fotobut',
        text: 'My photobooth moment!',
        files: [file]
      });
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Share failed:', e);
    }
  },

  async toBlob(canvas) {
    const mime = this.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return new Promise(res => canvas.toBlob(blob => res(blob), mime, this.quality));
  },

  toDataURL(canvas) {
    const mime = this.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return canvas.toDataURL(mime, this.quality);
  }
};