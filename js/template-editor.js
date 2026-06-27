class TemplateEditor {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.dragging = null;
    this.dragStart = {};
    this.selectedSlot = null;

    this._buildPanel();
  }

  _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'template-editor-panel';
    panel.className = 'te-panel';
    panel.innerHTML = `
      <div class="te-panel-header">
        <span>🎨 Edit Template</span>
        <button id="te-editor-close">✕</button>
      </div>

      <div class="te-panel-section">
        <label class="te-label">Background</label>
        <div class="te-color-row">
          <input type="color" id="te-bg-color" value="#f5f5f0">
          <input type="text" id="te-bg-input" placeholder="#hex or url(...)" class="te-input">
        </div>
      </div>

      <div class="te-panel-section">
        <label class="te-label">Photo Slots</label>
        <div id="te-slot-list"></div>
      </div>

      <div class="te-panel-section">
        <label class="te-label">Text Slots</label>
        <div id="te-text-slot-list"></div>
      </div>

      <div class="te-panel-section te-actions">
        <button id="te-add-slot" class="te-btn">+ Add Photo Slot</button>
        <button id="te-add-text" class="te-btn">+ Add Text</button>
        <button id="te-save" class="te-btn te-btn-primary">💾 Save Template</button>
        <button id="te-exit" class="te-btn">Exit Editor</button>
      </div>
    `;
    document.getElementById('app')?.appendChild(panel);
    this.panel = panel;
    this._bind();
  }

  _bind() {
    this.panel.querySelector('#te-editor-close').onclick = () => this.exit();
    this.panel.querySelector('#te-exit').onclick = () => this.exit();

    const bgColor = this.panel.querySelector('#te-bg-color');
    const bgInput = this.panel.querySelector('#te-bg-input');
    bgColor.oninput = () => {
      if (this.app._editorTemplate) {
        this.app._editorTemplate.canvas.background = bgColor.value;
        bgInput.value = bgColor.value;
      }
    };
    bgInput.oninput = () => {
      if (this.app._editorTemplate) {
        this.app._editorTemplate.canvas.background = bgInput.value;
        bgColor.value = bgInput.value;
      }
    };

    this.panel.querySelector('#te-add-slot').onclick = () => this._addPhotoSlot();
    this.panel.querySelector('#te-add-text').onclick = () => this._addTextSlot();
    this.panel.querySelector('#te-save').onclick = () => this._save();
  }

  enter() {
    if (!TemplateManager.current) return;
    // Clone the current template for editing
    this.app._editorTemplate = JSON.parse(JSON.stringify(TemplateManager.current));

    // Save original mode
    this._prevMode = this.app.mode;
    this.app.mode = 'editor';
    this.active = true;

    // Hide normal controls
    this.app.els.filterBar?.classList.add('hidden');
    this.app.els.templateBar?.classList.add('hidden');
    this.app.els.captureBtn.style.display = 'none';
    this.app.els.stickerBtn.style.display = 'none';
    this.app.els.textBtn.style.display = 'none';

    // Show editor panel
    this.panel.classList.add('open');

    // Populate UI
    this._syncUI();
    this._renderSlotList();
    this._renderTextSlotList();

    // Attach canvas handlers
    this._attachCanvas();
  }

  exit() {
    this.active = false;
    this.app.mode = this._prevMode || 'preview';
    this.panel.classList.remove('open');

    this.app.els.filterBar?.classList.remove('hidden');
    this.app.els.templateBar?.classList.remove('hidden');
    this.app.els.captureBtn.style.display = '';
    this.app.els.stickerBtn.style.display = '';
    this.app.els.textBtn.style.display = '';

    this._detachCanvas();
    this.selectedSlot = null;
    this.dragging = null;
  }

  _syncUI() {
    const t = this.app._editorTemplate;
    if (!t) return;
    const bg = t.canvas.background || '#ffffff';
    this.panel.querySelector('#te-bg-color').value = bg;
    this.panel.querySelector('#te-bg-input').value = bg;
  }

  _renderSlotList() {
    const list = this.panel.querySelector('#te-slot-list');
    const t = this.app._editorTemplate;
    if (!t) return;
    list.innerHTML = '';
    t.photoSlots.forEach((slot, i) => {
      const item = document.createElement('div');
      item.className = 'te-slot-item' + (this.selectedSlot === slot.id ? ' selected' : '');
      item.innerHTML = `
        <div class="te-slot-header">
          <span>📷 Slot ${i + 1} (${slot.id})</span>
          <button class="te-slot-del" data-idx="${i}">✕</button>
        </div>
        <div class="te-slot-fields">
          <label>X <input type="range" min="0" max="90" value="${slot.x}" data-slot="${i}" data-prop="x"><span>${slot.x}%</span></label>
          <label>Y <input type="range" min="0" max="90" value="${slot.y}" data-slot="${i}" data-prop="y"><span>${slot.y}%</span></label>
          <label>W <input type="range" min="10" max="100" value="${slot.width}" data-slot="${i}" data-prop="width"><span>${slot.width}%</span></label>
          <label>H <input type="range" min="10" max="100" value="${slot.height}" data-slot="${i}" data-prop="height"><span>${slot.height}%</span></label>
          <label>R <input type="range" min="-45" max="45" value="${slot.rotation || 0}" data-slot="${i}" data-prop="rotation"><span>${slot.rotation || 0}°</span></label>
          <label>Radius <input type="range" min="0" max="50" value="${slot.borderRadius || 0}" data-slot="${i}" data-prop="borderRadius"><span>${slot.borderRadius || 0}px</span></label>
        </div>
      `;
      item.querySelector('.te-slot-header').onclick = () => {
        this.selectedSlot = slot.id;
        this._renderSlotList();
      };
      item.querySelector('.te-slot-del').onclick = (e) => {
        e.stopPropagation();
        t.photoSlots.splice(i, 1);
        this.selectedSlot = null;
        this._renderSlotList();
      };
      item.querySelectorAll('input[type="range"]').forEach(input => {
        input.oninput = () => {
          const idx = parseInt(input.dataset.slot);
          const prop = input.dataset.prop;
          const val = parseFloat(input.value);
          t.photoSlots[idx][prop] = val;
          input.nextElementSibling.textContent = val + (prop === 'rotation' ? '°' : prop === 'borderRadius' ? 'px' : '%');
        };
      });
      list.appendChild(item);
    });
  }

  _renderTextSlotList() {
    const list = this.panel.querySelector('#te-text-slot-list');
    const t = this.app._editorTemplate;
    if (!t) return;
    list.innerHTML = '';
    t.textSlots.forEach((slot, i) => {
      const item = document.createElement('div');
      item.className = 'te-slot-item';
      item.innerHTML = `
        <div class="te-slot-header">
          <span>✏️ ${slot.id}</span>
          <button class="te-slot-del" data-idx="${i}">✕</button>
        </div>
        <div class="te-slot-fields">
          <label>Text <input type="text" value="${slot.defaultText || ''}" data-idx="${i}" class="te-text-input"></label>
          <label>X <input type="range" min="0" max="100" value="${slot.x}" data-text="${i}" data-prop="x"><span>${slot.x}%</span></label>
          <label>Y <input type="range" min="0" max="100" value="${slot.y}" data-text="${i}" data-prop="y"><span>${slot.y}%</span></label>
          <label>Size <input type="range" min="10" max="100" value="${slot.fontSize}" data-text="${i}" data-prop="fontSize"><span>${slot.fontSize}px</span></label>
        </div>
      `;
      item.querySelector('.te-slot-del').onclick = (e) => {
        e.stopPropagation();
        t.textSlots.splice(i, 1);
        this._renderTextSlotList();
      };
      item.querySelectorAll('input[type="range"]').forEach(input => {
        input.oninput = () => {
          const idx = parseInt(input.dataset.text);
          const prop = input.dataset.prop;
          const val = parseFloat(input.value);
          t.textSlots[idx][prop] = val;
          input.nextElementSibling.textContent = val + (prop === 'fontSize' ? 'px' : '%');
        };
      });
      item.querySelector('.te-text-input').oninput = (e) => {
        t.textSlots[i].defaultText = e.target.value;
      };
      list.appendChild(item);
    });
  }

  _addPhotoSlot() {
    const t = this.app._editorTemplate;
    if (!t) return;
    t.photoSlots.push({
      id: 'slot_' + Date.now().toString(36),
      x: 10, y: 10, width: 80, height: 60, borderRadius: 0, rotation: 0, index: t.photoSlots.length
    });
    this._renderSlotList();
  }

  _addTextSlot() {
    const t = this.app._editorTemplate;
    if (!t) return;
    t.textSlots.push({
      id: 'text_' + Date.now().toString(36),
      x: 50, y: 85, maxWidth: 85,
      fontSize: 32, fontFamily: "'Caveat', cursive",
      color: '#333', align: 'center',
      editable: true, defaultText: 'Your text'
    });
    this._renderTextSlotList();
  }

  _save() {
    const t = this.app._editorTemplate;
    if (!t) return;
    // Generate unique id
    const customId = 'custom_' + Date.now().toString(36);
    const custom = {
      ...t,
      id: customId,
      name: (t.name || 'Custom') + ' ★',
      category: 'custom'
    };

    // Get existing custom templates
    const existing = Store.get('custom_templates', []);
    existing.push(custom);
    Store.set('custom_templates', existing);

    // Reload templates
    this._reloadCustomTemplates();
    TemplateManager.select(customId);
    this.app.switchTemplate(customId);
    this.exit();
  }

  _reloadCustomTemplates() {
    const customs = Store.get('custom_templates', []);
    // Remove old customs from template list
    TemplateManager.templates = TemplateManager.templates.filter(t => !t.id.startsWith('custom_'));
    // Add new ones at start
    TemplateManager.templates.unshift(...customs);
    this.app._renderTemplateBar();
  }

  _attachCanvas() {
    this._canvasHandler = this._onCanvasEvent.bind(this);
    this.app.els.previewCanvas.addEventListener('mousedown', this._canvasHandler);
    this.app.els.previewCanvas.addEventListener('mousemove', this._canvasHandler);
    this.app.els.previewCanvas.addEventListener('mouseup', this._canvasHandler);
    this.app.els.previewCanvas.addEventListener('touchstart', this._canvasHandler, { passive: true });
    this.app.els.previewCanvas.addEventListener('touchmove', this._canvasHandler, { passive: true });
    this.app.els.previewCanvas.addEventListener('touchend', this._canvasHandler);
  }

  _detachCanvas() {
    if (this._canvasHandler) {
      this.app.els.previewCanvas.removeEventListener('mousedown', this._canvasHandler);
      this.app.els.previewCanvas.removeEventListener('mousemove', this._canvasHandler);
      this.app.els.previewCanvas.removeEventListener('mouseup', this._canvasHandler);
      this.app.els.previewCanvas.removeEventListener('touchstart', this._canvasHandler);
      this.app.els.previewCanvas.removeEventListener('touchmove', this._canvasHandler);
      this.app.els.previewCanvas.removeEventListener('touchend', this._canvasHandler);
    }
  }

  _onCanvasEvent(e) {
    const type = e.type;
    const p = e.touches ? e.touches[0] : e;
    if (!p) return;

    const rect = this.app.els.previewCanvas.getBoundingClientRect();
    const t = this.app._editorTemplate;
    if (!t) return;

    const scaleX = t.canvas.width / rect.width;
    const scaleY = t.canvas.height / rect.height;
    const cx = (p.clientX - rect.left) * scaleX;
    const cy = (p.clientY - rect.top) * scaleY;

    if (type === 'mousedown' || type === 'touchstart') {
      // Hit test photo slots
      let hit = null;
      for (let i = t.photoSlots.length - 1; i >= 0; i--) {
        const s = t.photoSlots[i];
        const pos = {
          x: t.canvas.width * s.x / 100,
          y: t.canvas.height * s.y / 100,
          w: t.canvas.width * s.width / 100,
          h: t.canvas.height * s.height / 100
        };
        if (cx >= pos.x && cx <= pos.x + pos.w && cy >= pos.y && cy <= pos.y + pos.h) {
          hit = { slot: s, pos, idx: i };
          break;
        }
      }
      if (hit) {
        this.dragging = hit;
        this.dragStart = { x: cx - hit.pos.x, y: cy - hit.pos.y };
        this.selectedSlot = hit.slot.id;
        this._renderSlotList();
        return;
      }
      this.selectedSlot = null;
      this._renderSlotList();
    }

    if ((type === 'mousemove' || type === 'touchmove') && this.dragging) {
      const s = this.dragging.slot;
      let newX = ((cx - this.dragStart.x) / t.canvas.width) * 100;
      let newY = ((cy - this.dragStart.y) / t.canvas.height) * 100;
      // Clamp
      newX = Math.max(0, Math.min(100 - s.width, newX));
      newY = Math.max(0, Math.min(100 - s.height, newY));
      s.x = Math.round(newX * 100) / 100;
      s.y = Math.round(newY * 100) / 100;
    }

    if (type === 'mouseup' || type === 'touchend') {
      if (this.dragging) this._renderSlotList();
      this.dragging = null;
    }
  }

  renderEditorOverlay(ctx, dpr) {
    const t = this.app._editorTemplate;
    if (!t || !this.active) return;

    const c = t.canvas;
    ctx.save();
    ctx.scale(dpr, dpr);

    t.photoSlots.forEach((slot, i) => {
      const pos = {
        x: c.width * slot.x / 100,
        y: c.height * slot.y / 100,
        w: c.width * slot.width / 100,
        h: c.height * slot.height / 100
      };

      // Draw slot fill (semi-transparent checkerboard for empty slot)
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(pos.x, pos.y, pos.w, pos.h);

      // Dashed border
      ctx.strokeStyle = this.selectedSlot === slot.id ? '#00ffff' : '#ffd700';
      ctx.lineWidth = this.selectedSlot === slot.id ? 3 : 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      ctx.setLineDash([]);

      // Slot label
      ctx.fillStyle = '#ffd700';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`📷 ${i + 1}`, pos.x + 6, pos.y + 18);

      // Resize handle (bottom-right)
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(pos.x + pos.w - 12, pos.y + pos.h - 12, 12, 12);
      ctx.fillStyle = '#333';
      ctx.fillRect(pos.x + pos.w - 10, pos.y + pos.h - 10, 8, 8);
    });

    ctx.restore();
  }
}