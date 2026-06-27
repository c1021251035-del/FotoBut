const TEXT_PRESETS = [
  { id: 'handwritten', name: 'Handwritten', font: "'Caveat', cursive" },
  { id: 'modern', name: 'Modern', font: "'Bangers', cursive" },
  { id: 'neon', name: 'Neon', font: "'Orbitron', sans-serif" },
  { id: 'classic', name: 'Classic', font: "'Courier New', monospace" },
  { id: 'serif', name: 'Elegant', font: "'Georgia', serif" },
  { id: 'bold', name: 'Bold', font: "'Arial Black', sans-serif" }
];

const FONT_COLORS = [
  '#ffffff', '#000000', '#e94560', '#ffd93d', '#00ff00', '#00ffff',
  '#ff00ff', '#ff6b6b', '#6c5ce7', '#fd79a8', '#74b9ff'
];

class TextEditor {
  constructor(containerEl, onChange) {
    this.el = containerEl;
    this.onChange = onChange;
    this.slots = {};
    this.selectedSlot = null;
    this.activeText = null;     // When user adds free text on canvas
    this._render();
    this._bind();
  }

  registerSlots(template) {
    this.slots = {};
    template.textSlots?.forEach(slot => {
      this.slots[slot.id] = {
        ...slot,
        text: slot.defaultText || ''
      };
    });
    this._renderSlots();
  }

  addFreeText(x, y, text = 'Your text') {
    const id = 'free_' + Date.now().toString(36);
    this.activeText = {
      id, x, y, text,
      font: TEXT_PRESETS[0].font,
      color: '#ffffff',
      fontSize: 36,
      selected: true
    };
    return this.activeText;
  }

  updateActiveText(prop, val) {
    if (this.activeText) {
      this.activeText[prop] = val;
      this.onChange?.();
    }
  }

  deleteActiveText() {
    this.activeText = null;
    this.onChange?.();
  }

  setSlotText(slotId, text) {
    if (this.slots[slotId]) {
      this.slots[slotId].text = text;
    }
  }

  getSlotText(slotId) {
    return this.slots[slotId]?.text || '';
  }

  _render() {
    this.el.innerHTML = `
      <div class="te-header">✏️ Text <button class="te-close" id="te-close">✕</button></div>
      <div class="te-slots" id="te-slots"></div>
      <div class="te-section">
        <div class="te-label">Font</div>
        <div class="te-fonts" id="te-fonts"></div>
      </div>
      <div class="te-section">
        <div class="te-label">Color</div>
        <div class="te-colors" id="te-colors"></div>
      </div>
      <div class="te-section">
        <div class="te-label">Size: <span id="te-size-val">36</span></div>
        <input type="range" id="te-size" min="14" max="120" value="36" class="te-slider">
      </div>
      <button class="te-delete" id="te-delete">🗑️ Delete text</button>
    `;
    this._renderFonts();
    this._renderColors();
  }

  _renderFonts() {
    const container = this.el.querySelector('#te-fonts');
    TEXT_PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'te-font-btn';
      btn.textContent = p.name;
      btn.style.fontFamily = p.font;
      btn.dataset.font = p.font;
      btn.addEventListener('click', () => {
        this.updateActiveText('font', p.font);
        container.querySelectorAll('.te-font-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      container.appendChild(btn);
    });
  }

  _renderColors() {
    const container = this.el.querySelector('#te-colors');
    FONT_COLORS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'te-color-btn';
      btn.style.background = c;
      btn.dataset.color = c;
      if (c === '#ffffff') btn.style.outline = '1px solid #555';
      btn.addEventListener('click', () => {
        this.updateActiveText('color', c);
        container.querySelectorAll('.te-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      container.appendChild(btn);
    });
  }

  _renderSlots() {
    const container = this.el.querySelector('#te-slots');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(this.slots).forEach(([id, slot]) => {
      const row = document.createElement('div');
      row.className = 'te-slot-row';

      const label = document.createElement('span');
      label.className = 'te-slot-label';
      label.textContent = slot.editable ? `${slot.id}:` : `${slot.id} 🔒`;
      row.appendChild(label);

      const input = document.createElement('input');
      input.className = 'te-slot-input';
      input.type = 'text';
      input.value = slot.text;
      input.placeholder = slot.defaultText;
      input.disabled = !slot.editable;
      input.addEventListener('input', () => {
        this.slots[id].text = input.value;
      });
      row.appendChild(input);

      container.appendChild(row);
    });
  }

  _bind() {
    this.el.querySelector('#te-close')?.addEventListener('click', () => {
      this.el.classList.remove('open');
    });

    this.el.querySelector('#te-size')?.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      this.el.querySelector('#te-size-val').textContent = val;
      this.updateActiveText('fontSize', val);
    });

    this.el.querySelector('#te-delete')?.addEventListener('click', () => {
      this.deleteActiveText();
    });
  }

  open() {
    this.el.classList.add('open');
  }

  close() {
    this.el.classList.remove('open');
  }

  getActiveTextRender() {
    return this.activeText;
  }
}