class Gallery {
  constructor(containerEl, onClose) {
    this.el = containerEl;
    this.onClose = onClose;
    this.photos = [];
    this.selectedId = null;
    this._render();
    this._bind();
  }

  _render() {
    this.el.innerHTML = `
      <div class="gal-header">
        <h3>📸 Gallery</h3>
        <button class="gal-close" id="gal-close">✕</button>
      </div>
      <div class="gal-stats" id="gal-stats">Loading...</div>
      <div class="gal-grid" id="gal-grid"></div>
      <div class="gal-empty hidden" id="gal-empty">
        <p>📭 Belum ada foto</p>
        <p class="gal-empty-hint">Ambil foto pertama untuk memulai</p>
      </div>
      <div class="gal-preview hidden" id="gal-preview">
        <button class="gal-nav gal-prev" id="gal-prev">‹</button>
        <img id="gal-img" alt="Preview">
        <button class="gal-nav gal-next" id="gal-next">›</button>
        <div class="gal-info" id="gal-info"></div>
        <div class="gal-actions">
          <button class="gal-act-btn" id="gal-download">💾 Download</button>
          <button class="gal-act-btn gal-delete" id="gal-delete">🗑️ Delete</button>
          <button class="gal-act-btn" id="gal-share">📤 Share</button>
        </div>
      </div>
    `;
  }

  _bind() {
    this.el.querySelector('#gal-close').addEventListener('click', () => {
      this.close();
    });

    this.el.querySelector('#gal-prev').addEventListener('click', () => this._nav(-1));
    this.el.querySelector('#gal-next').addEventListener('click', () => this._nav(1));
    this.el.querySelector('#gal-download').addEventListener('click', () => this._downloadCurrent());
    this.el.querySelector('#gal-delete').addEventListener('click', () => this._deleteCurrent());
    this.el.querySelector('#gal-share').addEventListener('click', () => this._shareCurrent());

    // Keyboard nav in preview
    document.addEventListener('keydown', (e) => {
      if (!this.el.classList.contains('open')) return;
      if (e.key === 'ArrowLeft') this._nav(-1);
      if (e.key === 'ArrowRight') this._nav(1);
      if (e.key === 'Escape') this._closePreview();
    });
  }

  async load() {
    this.photos = await PhotoDB.getAll();
    this._renderGrid();
  }

  _renderGrid() {
    const grid = this.el.querySelector('#gal-grid');
    const empty = this.el.querySelector('#gal-empty');
    const stats = this.el.querySelector('#gal-stats');

    if (!this.photos.length) {
      grid.innerHTML = '';
      grid.classList.add('hidden');
      empty.classList.remove('hidden');
      stats.textContent = '0 foto';
      return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');
    stats.textContent = `${this.photos.length} foto`;

    grid.innerHTML = this.photos.map((p, i) => {
      const date = new Date(p.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      const isGif = p.isGif;
      return `
        <div class="gal-thumb ${isGif ? 'gal-gif' : ''}" data-id="${p.id}" style="--i:${i}">
          <img src="${URL.createObjectURL(p.blob)}" loading="lazy" alt="Photo ${i+1}">
          ${isGif ? '<span class="gal-gif-badge">GIF</span>' : ''}
          <div class="gal-thumb-overlay">
            <span>${date}</span>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.gal-thumb').forEach(el => {
      el.addEventListener('click', () => this._openPreview(parseInt(el.dataset.id)));
    });
  }

  _openPreview(id) {
    const idx = this.photos.findIndex(p => p.id === id);
    if (idx === -1) return;
    this.selectedId = id;
    this._showPreview(idx);
  }

  _showPreview(idx) {
    if (idx < 0 || idx >= this.photos.length) return;
    const p = this.photos[idx];
    const preview = this.el.querySelector('#gal-preview');
    const img = this.el.querySelector('#gal-img');
    const info = this.el.querySelector('#gal-info');

    img.src = URL.createObjectURL(p.blob);
    img.onload = () => URL.revokeObjectURL(img.src);

    const date = new Date(p.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    info.innerHTML = `
      <div>${p.isGif ? '🎞️ GIF' : '🖼️ Photo'} • ${p.width}×${p.height}</div>
      <div class="gal-date">${date}</div>
      <div class="gal-meta">Filter: ${p.filter} • Template: ${p.template || '—'}</div>
    `;

    this.el.querySelector('#gal-grid').classList.add('hidden');
    this.el.querySelector('#gal-empty').classList.add('hidden');
    preview.classList.remove('hidden');
    this._currentIdx = idx;
  }

  _closePreview() {
    this.el.querySelector('#gal-preview').classList.add('hidden');
    this.el.querySelector('#gal-grid').classList.remove('hidden');
    this.selectedId = null;
  }

  _nav(dir) {
    if (this.selectedId === null) return;
    const newIdx = this._currentIdx + dir;
    if (newIdx >= 0 && newIdx < this.photos.length) {
      this._showPreview(newIdx);
    }
  }

  async _downloadCurrent() {
    const p = this.photos.find(x => x.id === this.selectedId);
    if (!p) return;
    const url = URL.createObjectURL(p.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fotobut-${p.isGif ? 'burst' : 'photo'}-${p.id}.${p.isGif ? 'gif' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async _deleteCurrent() {
    if (!confirm('Hapus foto ini?')) return;
    await PhotoDB.delete(this.selectedId);
    this.selectedId = null;
    await this.load();
    this._closePreview();
  }

  async _shareCurrent() {
    const p = this.photos.find(x => x.id === this.selectedId);
    if (!p || !navigator.share) return;
    const file = new File([p.blob], `fotobut-${p.id}.${p.isGif ? 'gif' : 'png'}`, { type: p.type });
    try {
      await navigator.share({ files: [file], title: 'Fotobut', text: 'My photobooth moment!' });
    } catch (e) { if (e.name !== 'AbortError') console.warn(e); }
  }

  open() {
    this.el.classList.add('open');
    this.load();
  }

  close() {
    this.el.classList.remove('open');
    this._closePreview();
    this.onClose?.();
  }
}