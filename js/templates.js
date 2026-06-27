const TEMPLATE_FILES = [
  'polaroid.json',
  'film-strip.json',
  'vintage.json',
  'comic.json',
  'photo-strip.json',
  'neon.json',
  'christmas.json',
  'halloween.json',
  'wedding.json',
  'birthday.json'
];

const TemplateManager = {
  templates: [],
  current: null,
  _loaded: {},

  async loadAll() {
    const results = await Promise.allSettled(
      TEMPLATE_FILES.map(f => fetch(`./templates/${f}`).then(r => r.json()))
    );
    this.templates = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    if (this.templates.length) this.current = this.templates[0];
    return this.templates;
  },

  get(id) {
    return this.templates.find(t => t.id === id);
  },

  select(id) {
    const t = this.get(id);
    if (t) this.current = t;
    return this.current;
  },

  async loadAsset(src) {
    if (this._loaded[src]) return this._loaded[src];
    const ext = src.split('.').pop().toLowerCase();
    if (ext === 'svg' || ext === 'png') {
      const img = new Image();
      // Same-origin di GitHub Pages, jangan pakai crossOrigin biar ga gagal
      img.src = `./assets/borders/${src}`;
      try {
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        this._loaded[src] = img;
      } catch {
        console.warn('Asset load failed (non-blocking):', src);
        this._loaded[src] = img; // tetap simpan biar ga retry
      }
      return this._loaded[src];
    }
    return null;
  },

  getPhotoPosition(slot) {
    const c = this.current.canvas;
    return {
      x: c.width * slot.x / 100,
      y: c.height * slot.y / 100,
      w: c.width * slot.width / 100,
      h: c.height * slot.height / 100
    };
  }
};