class Gallery {
  constructor(containerEl, gridEl, emptyEl, closeBtn) {
    this.container = containerEl;
    this.grid = gridEl;
    this.empty = emptyEl;
    this.closeBtn = closeBtn;
    this.photos = [];
    this._idx = -1;
    this._bind();
  }

  _bind() {
    this.closeBtn.onclick = () => this.close();
    document.addEventListener('keydown', (e) => {
      if (!this.container.classList.contains('hidden')) {
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft') this._nav(-1);
        if (e.key === 'ArrowRight') this._nav(1);
      }
    });
  }

  async open() {
    this.photos = await PhotoDB.getAll();
    this._render();
    this.container.classList.remove('hidden');
  }

  close() {
    this.container.classList.add('hidden');
  }

  _render() {
    if (!this.photos.length) {
      this.grid.innerHTML = '';
      this.grid.classList.add('hidden');
      this.empty.classList.remove('hidden');
      return;
    }
    this.grid.classList.remove('hidden');
    this.empty.classList.add('hidden');
    this.grid.innerHTML = this.photos.map((p, i) => `
      <div class="gal-thumb" data-idx="${i}">
        <img src="${URL.createObjectURL(p.blob)}" loading="lazy" alt="photo">
      </div>
    `).join('');

    this.grid.querySelectorAll('.gal-thumb').forEach(el => {
      el.onclick = () => this._show(parseInt(el.dataset.idx));
    });
  }

  _show(idx) {
    if (idx < 0 || idx >= this.photos.length) return;
    this._idx = idx;
    const p = this.photos[idx];

    // Remove old preview
    const old = this.container.querySelector('.gal-preview');
    if (old) old.remove();

    const prev = document.createElement('div');
    prev.className = 'gal-preview';
    prev.innerHTML = `
      <button class="gal-nav gal-prev">‹</button>
      <img src="${URL.createObjectURL(p.blob)}" alt="preview">
      <button class="gal-nav gal-next">›</button>
      <div style="display:flex;gap:12px;margin-top:16px;padding:0 60px;flex-wrap:wrap;justify-content:center">
        <button class="btn" style="width:auto;padding:0 20px;border-radius:24px;font-size:14px;font-weight:600" id="gal-download">💾</button>
        <button class="btn" style="width:auto;padding:0 20px;border-radius:24px;font-size:14px;font-weight:600;background:#e74c3c" id="gal-delete">🗑️</button>
      </div>
    `;
    this.container.appendChild(prev);

    prev.querySelector('.gal-prev').onclick = () => this._nav(-1);
    prev.querySelector('.gal-next').onclick = () => this._nav(1);
    prev.querySelector('#gal-download').onclick = () => {
      const url = URL.createObjectURL(p.blob);
      const a = document.createElement('a');
      a.href = url; a.download = `fotobut-${p.id}.png`; a.click();
    };
    prev.querySelector('#gal-delete').onclick = async () => {
      await PhotoDB.delete(p.id);
      prev.remove();
      await this.open();
    };
  }

  _nav(dir) {
    const idx = this._idx + dir;
    if (idx >= 0 && idx < this.photos.length) this._show(idx);
  }
}