const Store = {
  KEY: 'fotobut_state',

  get(key, fallback = null) {
    try {
      const data = localStorage.getItem(this.KEY);
      const obj = data ? JSON.parse(data) : {};
      return key ? obj[key] ?? fallback : obj;
    } catch { return fallback; }
  },

  set(key, value) {
    try {
      const data = this.get();
      data[key] = value;
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) { console.warn('Store set failed', e); }
  },

  remove(key) {
    try {
      const data = this.get();
      delete data[key];
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) { console.warn('Store remove failed', e); }
  },

  clear() {
    try { localStorage.removeItem(this.KEY); } catch {}
  }
};