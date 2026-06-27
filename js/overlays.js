const STICKER_PACKS = [
  { name: 'Emoji', list: ['emoji-smile.svg', 'emoji-laugh.svg'] },
  { name: 'Icons', list: ['heart.svg', 'star.svg', 'sparkle.svg'] },
  { name: 'Fun', list: ['rainbow.svg', 'sunglasses.svg', 'fire.svg', 'unicorn.svg'] }
];

const StickerManager = {
  stickers: [],
  _images: {},
  _dragging: null,
  _dragOffset: {},
  _scaleStart: 0,
  _initialPinchDist: 0,

  async init() {
    const all = STICKER_PACKS.flatMap(p => p.list.map(f => ({ src: f, path: `./assets/stickers/${f}` })));
    const loaded = await Promise.allSettled(
      all.map(async ({ src, path }) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = path;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        this._images[src] = img;
      })
    );
  },

  place(src, canvasX, canvasY) {
    const img = this._images[src];
    if (!img) return null;
    const s = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      src,
      img,
      x: canvasX,
      y: canvasY,
      scale: 1,
      rotation: 0,
      selected: false
    };
    this.stickers.push(s);
    return s;
  },

  remove(id) {
    this.stickers = this.stickers.filter(s => s.id !== id);
  },

  select(id) {
    this.stickers.forEach(s => s.selected = s.id === id);
  },

  deselectAll() {
    this.stickers.forEach(s => s.selected = false);
  },

  getSelected() {
    return this.stickers.find(s => s.selected) || null;
  },

  // Hit-test: find sticker under point (returns null or sticker)
  hitTest(cx, cy) {
    for (let i = this.stickers.length - 1; i >= 0; i--) {
      const s = this.stickers[i];
      const hs = 30 * s.scale;
      if (cx >= s.x - hs && cx <= s.x + hs && cy >= s.y - hs && cy <= s.y + hs) {
        return s;
      }
    }
    return null;
  },

  moveTo(id, x, y) {
    const s = this.stickers.find(s => s.id === id);
    if (s) { s.x = x; s.y = y; }
  },

  scale(id, factor) {
    const s = this.stickers.find(s => s.id === id);
    if (s) { s.scale = Math.max(0.3, Math.min(4, s.scale * factor)); }
  },

  setScale(id, scale) {
    const s = this.stickers.find(s => s.id === id);
    if (s) { s.scale = Math.max(0.3, Math.min(4, scale)); }
  },

  rotate(id, angle) {
    const s = this.stickers.find(s => s.id === id);
    if (s) s.rotation += angle;
  },

  setRotation(id, angle) {
    const s = this.stickers.find(s => s.id === id);
    if (s) s.rotation = angle % 360;
  },

  clear() {
    this.stickers = [];
  },

  // Render a sticker onto a context (canvas coordinates)
  render(ctx, s, dpr = 1) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation * Math.PI / 180);
    ctx.scale(s.scale, s.scale);
    const hs = 30;
    ctx.drawImage(s.img, -hs, -hs, 60, 60);
    ctx.restore();

    // Selection indicator
    if (s.selected) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation * Math.PI / 180);
      const r = 34 * s.scale;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2 / dpr;
      ctx.setLineDash([4 / dpr, 4 / dpr]);
      ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.setLineDash([]);
      ctx.restore();
    }
  },

  renderAll(ctx, dpr = 1) {
    this.stickers.forEach(s => this.render(ctx, s, dpr));
  }
};

class StickerPanel {
  constructor(containerEl, onSelect) {
    this.el = containerEl;
    this.onSelect = onSelect;
    this._render();
  }

  _render() {
    this.el.innerHTML = '';
    STICKER_PACKS.forEach(pack => {
      const label = document.createElement('div');
      label.className = 'sticker-group-label';
      label.textContent = pack.name;
      this.el.appendChild(label);

      const row = document.createElement('div');
      row.className = 'sticker-row';
      pack.list.forEach(src => {
        const btn = document.createElement('button');
        btn.className = 'sticker-btn';
        const img = document.createElement('img');
        img.src = `./assets/stickers/${src}`;
        img.alt = src;
        btn.appendChild(img);
        btn.addEventListener('click', () => this.onSelect(src));
        row.appendChild(btn);
      });
      this.el.appendChild(row);
    });
  }
}