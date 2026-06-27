const PhotoDB = {
  DB_NAME: 'fotobut_gallery',
  DB_VERSION: 1,
  STORE: 'photos',
  _db: null,

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          const store = db.createObjectStore(this.STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  async save(blob, meta = {}) {
    await this.open();
    const item = {
      id: 'photo_' + Date.now(),
      blob, timestamp: Date.now(),
      effect: meta.effect || 'normal',
      width: meta.width || 0,
      height: meta.height || 0
    };
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(this.STORE, 'readwrite');
      const req = tx.objectStore(this.STORE).add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll() {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).index('timestamp').getAll();
      req.onsuccess = () => resolve(req.result.reverse());
      req.onerror = () => reject(req.error);
    });
  },

  async delete(id) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(this.STORE, 'readwrite');
      const req = tx.objectStore(this.STORE).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async clear() {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(this.STORE, 'readwrite');
      const req = tx.objectStore(this.STORE).clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
};