// Coloring Book: a gallery of pictures and a simple, forgiving painting screen.
//
// A picture is a list of sections (games/color-pictures.js). What a child has done to a picture is
// saved as data, not pixels: an ordered list of small operations per picture, in the picture's own
// 1000 x 800 coordinates, so it looks the same on any screen and undo is just "remove the last one".
//
//   [0, section, color]           bucket fill
//   [1, section, color, points]   brush stroke (flat x,y list), clipped to its section
//   [2, section, points]          eraser stroke (paints paper) inside its section
//   [3, section]                  section cleared (eraser tap)
//   [4]                           start over
//
// Paint never crosses into another section: every operation is clipped to its own section, minus any
// section drawn in front of it. Outlines and fixed details are drawn on a separate layer on top.
(() => {
  const SPG = window.SPG;
  const { art, sfx, store, voice } = SPG;
  const TAU = Math.PI * 2;
  const PICS = SPG.pictures;
  const GROUPS = SPG.pictureGroups;
  const groupOf = id => GROUPS.find(g => g.id === id) || GROUPS[0];
  // Which season (if any) is coming up, so its tab is the first thing a child sees.
  const seasonNow = () => { const d = new Date(), m = d.getMonth() + 1, day = d.getDate(); return (m === 9 && day >= 20) || m === 10 ? 'halloween' : m === 11 && day <= 26 ? 'thanksgiving' : (m === 11 && day >= 27) || m === 12 ? 'christmas' : null; };
  const INK = '#5a3f5e', PAPER = '#fffdf6', OUTLINE = 10;
  const W = 1000, H = 800;
  // Append new colors at the end only: saved pictures store the position in this list.
  const PALETTE = ['#ff6b81', '#ff9d4d', '#ffd54a', '#a6e05a', '#59b96e', '#6fd6b8', '#7fd4f5', '#4f8fe8', '#9a7be8', '#ff9db8', '#ffd2a6', '#b9805a', '#d9d2e0', '#5a3f5e'];
  const BRUSH = 34, ERASER = 64;
  const FILL = 0, BRUSHOP = 1, ERASE = 2, CLEAR = 3, ALL = 4, MAX_OPS = 1200;
  const NS = 'http://www.w3.org/2000/svg';

  const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.filter(k => k != null)); return e; };
  const icon = id => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'ico'); s.innerHTML = `<use href="#i-${id}"/>`; return s; };
  const btn = (cls, label, ...kids) => { const b = el('button', cls, ...kids); b.type = 'button'; b.setAttribute('aria-label', label); return b; };

  /* ================================================================ engine */

  const compiled = new Map();
  const hitCtx = document.createElement('canvas').getContext('2d');

  // Turn a picture definition into Path2D objects, and work out which sections sit in front of which.
  function compile(def) {
    if (compiled.has(def.id)) return compiled.get(def.id);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', 10); svg.setAttribute('height', 10);
    svg.style.cssText = 'position:absolute;left:-99px;top:0;visibility:hidden;pointer-events:none';
    document.body.append(svg);
    const secs = def.sections.map((s, i) => {
      const pe = document.createElementNS(NS, 'path'); pe.setAttribute('d', s.d); svg.append(pe);
      const bb = pe.getBBox();
      return {
        i, id: s.id, path: new Path2D(s.d), outer: new Path2D(`M-60 -60H1060V860H-60Z${s.d}`), bb,
        small: Math.min(bb.width, bb.height) < 90,
        det: (s.det || []).map(d => ({ path: new Path2D(d.d), f: d.f, w: d.w }))
      };
    });
    svg.remove();
    const near = (a, b) => a.bb.x < b.bb.x + b.bb.width + 12 && b.bb.x < a.bb.x + a.bb.width + 12 && a.bb.y < b.bb.y + b.bb.height + 12 && b.bb.y < a.bb.y + a.bb.height + 12;
    secs.forEach((s, i) => { s.occ = secs.slice(i + 1).filter(o => near(s, o)); });
    const sheet = { def, secs, byId: Object.fromEntries(secs.map(s => [s.id, s])), alias: def.alias || {} };
    compiled.set(def.id, sheet);
    return sheet;
  }

  // Which section is under this point? Tiny sections get a little extra reach so they are easy to hit.
  function hit(sheet, x, y) {
    const secs = sheet.secs;
    let exact = -1;
    for (let i = secs.length - 1; i >= 0; i--) if (hitCtx.isPointInPath(secs[i].path, x, y)) { exact = i; break; }
    hitCtx.lineWidth = 34;
    for (let i = secs.length - 1; i > exact; i--) if (secs[i].small && hitCtx.isPointInStroke(secs[i].path, x, y)) return secs[i];
    return exact >= 0 ? secs[exact] : secs[0];
  }

  // Run fn with drawing limited to a section, minus whatever is in front of it.
  function within(ctx, sec, fn) {
    ctx.save();
    ctx.clip(sec.path);
    for (const o of sec.occ) ctx.clip(o.outer, 'evenodd');
    fn();
    ctx.restore();
  }
  function stroke(ctx, pts, color, width) {
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    if (pts.length <= 2) { ctx.arc(pts[0], pts[1], width / 2, 0, TAU); ctx.fill(); return; }
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  }
  function applyOp(ctx, sheet, op) {
    if (op[0] === ALL) { ctx.fillStyle = PAPER; ctx.fillRect(-10, -10, W + 20, H + 20); return; }
    // Pictures colored before a section was split into separate shapes still apply to every part.
    for (const id of sheet.alias[op[1]] || [op[1]]) {
      const sec = sheet.byId[id]; if (!sec) continue;
      if (op[0] === FILL || op[0] === CLEAR) within(ctx, sec, () => { ctx.fillStyle = op[0] === FILL ? PALETTE[op[2]] : PAPER; ctx.fill(sec.path); });
      else if (op[0] === BRUSHOP) within(ctx, sec, () => stroke(ctx, op[3], PALETTE[op[2]], BRUSH));
      else if (op[0] === ERASE) within(ctx, sec, () => stroke(ctx, op[2], PAPER, ERASER));
    }
  }
  const paintAll = (ctx, sheet, ops) => { ctx.fillStyle = PAPER; ctx.fillRect(-10, -10, W + 20, H + 20); for (const op of ops) applyOp(ctx, sheet, op); };

  // Outlines and fixed details, drawn on top of the paint. Each section's lines are hidden where a
  // section in front of it covers them.
  function drawLines(ctx, sheet) {
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const s of sheet.secs) {
      ctx.save();
      for (const o of s.occ) ctx.clip(o.outer, 'evenodd');
      ctx.strokeStyle = INK; ctx.lineWidth = OUTLINE; ctx.stroke(s.path);
      for (const d of s.det) {
        if (d.f) { ctx.fillStyle = d.f; ctx.fill(d.path); }
        if (d.w) { ctx.strokeStyle = INK; ctx.lineWidth = d.w; ctx.stroke(d.path); }
      }
      ctx.restore();
    }
  }

  // Draw a whole picture (paint + lines) into ctx at the given width.
  function render(ctx, def, ops, width) {
    const sheet = compile(def), k = width / W;
    ctx.save(); ctx.scale(k, k);
    paintAll(ctx, sheet, ops); drawLines(ctx, sheet);
    ctx.restore();
  }

  // Keep saves small: an operation is dropped when a later fill or clear of the same section
  // covers it completely, and everything before a "start over" is dropped.
  function compact(ops) {
    const out = [], covered = new Set();
    for (let i = ops.length - 1; i >= 0; i--) {
      const op = ops[i];
      if (op[0] === ALL) break;
      if (covered.has(op[1])) continue;
      out.push(op);
      if (op[0] === FILL || op[0] === CLEAR) covered.add(op[1]);
    }
    out.reverse();
    // months of scribbling on one page must not fill the device's storage (that would stop every game from saving):
    // past MAX_OPS the oldest brush and eraser strokes, which later paint mostly covers, are let go; fills are tiny and stay
    for (let i = 0, extra = out.length - MAX_OPS; extra > 0 && i < out.length; i++) if (out[i][0] === BRUSHOP || out[i][0] === ERASE) { out.splice(i--, 1); extra--; }
    return out;
  }
  const hasPaint = ops => ops.some(op => op[0] !== ALL);

  // Douglas-Peucker: fewer points for the same stroke.
  function simplify(pts, eps = 1.6) {
    const n = pts.length / 2;
    if (n < 3) return pts.map(Math.round);
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const ax = pts[a * 2], ay = pts[a * 2 + 1], dx = pts[b * 2] - ax, dy = pts[b * 2 + 1] - ay, len = Math.hypot(dx, dy) || 1;
      let far = -1, fd = eps;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i * 2] - ax) * dy - (pts[i * 2 + 1] - ay) * dx) / len; if (d > fd) { fd = d; far = i; } }
      if (far >= 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(Math.round(pts[i * 2]), Math.round(pts[i * 2 + 1]));
    return out;
  }

  /* ---------------------------------------------------------------- export (one picture at a time, as a PNG) */
  function toPNG(def, ops, width = 1200) {
    const c = document.createElement('canvas'); c.width = width; c.height = Math.round(width * H / W);
    render(c.getContext('2d'), def, ops, width);
    return new Promise(res => c.toBlob(res, 'image/png'));
  }
  function saveFile(blob, name) { return SPG.native.saveFile(blob, name, 'image/png'); }
  const fileName = def => `little-sprout-park-${def.id}.png`;
  // On iPhone/iPad (and in the Android app, where the share sheet is only a fallback) a download can pull the child out of the app, so a grown-up has to okay it there.
  const okToSave = fn => ((SPG.safe.isIOS || SPG.native.isApp) && SPG.app && SPG.app.askGate) ? SPG.app.askGate(fn) : fn();
  // Android app: the picture goes straight into the phone's photo gallery (album "Sprout Park"), no share sheet and no gate.
  // Only if that fails does the share sheet open (behind the grown-up gate), so nothing is lost.
  // `done` runs once the picture has been handed over (a cancelled grown-up gate just never calls it).
  async function saveToDevice(blob, name, done) {
    const share = () => Promise.resolve(saveFile(blob, name)).catch(() => false).then(done);
    if (SPG.native.isApp && SPG.native.saveToGallery) {
      let ok = false; try { ok = await SPG.native.saveToGallery(blob, name); } catch (_) { ok = false; }
      if (ok) return done(true);
      return (SPG.app && SPG.app.askGate) ? SPG.app.askGate(share) : share();
    }
    okToSave(share);
  }

  /* ================================================================ the game */
  class ColorGame {
    constructor(host) {
      this.host = host;
      this.bag = store.bag('color', () => ({ v: 1, pics: {} }));
      this.root = el('div', 'cb'); host.append(this.root);
      this.tool = 'bucket'; this.lastPaintTool = 'bucket'; this.ci = 0;
      this.view = 'gallery'; this.cur = null; this.ops = []; this.st = null; this.penSeen = false;
      this.fx = new art.Fx(); this.fxRunning = false; this.paused = false; this.dirty = false;
      this.timers = new Set();
      voice.hushed = true; voice.stop();      // no spoken voices anywhere in the coloring book
      SPG.music.scene('color');
      this.onHide = () => { if (document.hidden) this.saveNow(true); };
      document.addEventListener('visibilitychange', this.onHide); addEventListener('pagehide', this.onHide);
      this.autosave = setInterval(() => { if (this.dirty) this.saveNow(); }, 8000);
      this.buildGallery();
      // her pet keeps her company (only if she has taken one home from the Pet Shop)
      this.buddy = SPG.pets && SPG.pets.companion(this.root, { size: Math.round(Math.max(66, Math.min(118, Math.min(innerWidth, innerHeight) * .16))) });
    }

    start() { this.showGallery(); }
    later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); this.timers.add(id); return id; }
    pause() { this.paused = true; this.endStroke(); this.saveNow(true); }
    resume() { this.paused = false; }
    resize() {
      if (this.view === 'editor') { this.endStroke(); this.layout(); } else { this.tilesDirty = true; this.paintTabs(); this.paintTiles(); }
    }
    destroy() {
      this.endStroke(); this.saveNow(true);
      clearInterval(this.autosave); this.timers.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', this.onHide); removeEventListener('pagehide', this.onHide);
      voice.hushed = false; SPG.music.scene(null);
      if (this.buddy) this.buddy.destroy();
      this.root.remove();
    }
    // Back button: picture -> gallery -> (app) hub.
    back() {
      if (this.confirmEl) { this.closeConfirm(); return true; }
      if (this.celebrating) { this.endCelebration(); return true; }
      if (this.view === 'editor') { this.toGallery(); return true; }
      return false;
    }

    /* -------------------------------------------------------------- saving */
    rec(id) { return this.bag.pics[id] || null; }
    stateOf(id) { const r = this.rec(id); return r && r.done ? 'done' : r && r.ops && hasPaint(r.ops) ? 'wip' : 'new'; }
    saveNow(flush) {
      clearTimeout(this.saveT); this.saveT = 0;
      if (!this.cur || !this.dirty && !flush) return;
      if (this.dirty) {
        const r = this.bag.pics[this.cur.id] = this.bag.pics[this.cur.id] || {};
        r.ops = compact(this.ops); r.t = Date.now();
        if (this.done) r.done = true;
        this.dirty = false;
        this.staleTiles.add(this.cur.id);
        store.save();
      }
      if (flush) store.flush();
    }
    touched() { this.dirty = true; clearTimeout(this.saveT); this.saveT = setTimeout(() => this.saveNow(), 1400); this.updateButtons(); }

    /* -------------------------------------------------------------- gallery */
    buildGallery() {
      this.staleTiles = new Set(PICS.map(p => p.id));
      this.tilesDirty = true;
      this.gallery = el('div', 'cb-gallery'); this.gallery.setAttribute('data-scroll', '');
      this.grid = el('div', 'cb-grid');
      this.tiles = new Map();
      for (const def of PICS) {
        const canvas = el('canvas');
        const open = btn('cb-open', def.name, canvas, el('span', 'cb-badge', icon('rosette')));
        const dl = btn('cb-dl', 'Save picture', icon('download'));
        const tile = el('div', 'cb-tile', open, dl);
        // Tiles act on a completed tap (so dragging to scroll never opens one), and only if the touch began on
        // the tile: the click that follows a touch-down elsewhere (a hub card, a tool) must not open a picture.
        const tap = (b, fn) => {
          let t = -1e9;
          b.addEventListener('pointerdown', () => { t = performance.now(); });
          b.addEventListener('click', e => { if (e.detail === 0 || performance.now() - t < 1500) { t = -1e9; fn(); } });
        };
        tap(open, () => { sfx.tap(); this.open(def); });
        tap(dl, () => this.savePicture(def, dl));
        tile.dataset.group = def.group;
        this.tiles.set(def.id, { tile, canvas, group: def.group });
        this.grid.append(tile);
      }
      this.gallery.append(this.grid);
      this.tabs = el('div', 'cb-tabs');
      this.tabBtns = new Map();
      for (const g of GROUPS) {
        const canvas = el('canvas'), badge = el('span', 'cb-tabcount');
        const b = btn('cb-tab', g.name, canvas, badge); b.style.setProperty('--tint', g.tint); b.style.setProperty('--edge', g.edge);
        b.addEventListener('click', () => { sfx.tap(); this.setTab(g.id); });
        this.tabBtns.set(g.id, { b, canvas, badge });
        this.tabs.append(b);
      }
      const season = seasonNow(), seenKey = new Date().getFullYear() + '-' + season;
      if (season && this.bag.seasonSeen !== seenKey) { this.bag.seasonSeen = seenKey; this.tab = season; } else this.tab = GROUPS.some(g => g.id === this.bag.tab) ? this.bag.tab : GROUPS[0].id;
      this.toast = el('div', 'cb-toast', icon('check'), el('b', '', 'Saved!'));
      this.root.append(this.gallery, this.tabs, this.toast);
    }
    showGallery(justDone) {
      this.view = 'gallery'; this.cur = null;
      this.gallery.classList.remove('hidden'); this.tabs.classList.remove('hidden');
      this.root.querySelector('.cb-editor')?.remove();
      for (const [id, t] of this.tiles) {
        const s = this.stateOf(id);
        t.tile.classList.toggle('done', s === 'done'); t.tile.classList.toggle('wip', s === 'wip');
        t.tile.classList.toggle('just', id === justDone);
      }
      this.applyTab(); this.placeBuddy();
      requestAnimationFrame(() => { this.paintTabs(); this.paintTiles(); });
    }
    setTab(id) { this.tab = id; this.bag.tab = id; store.save(); this.applyTab(); this.paintTiles(); this.grid.parentElement.scrollTop = 0; }
    applyTab() {
      for (const [id, t] of this.tiles) t.tile.classList.toggle('hidden', t.group !== this.tab);
      for (const [id, t] of this.tabBtns) {
        t.b.setAttribute('aria-pressed', String(id === this.tab));
        const list = PICS.filter(p => p.group === id), done = list.filter(p => this.stateOf(p.id) === 'done').length;
        t.badge.textContent = done === list.length ? '\u2605' : `${done}/${list.length}`; t.badge.classList.toggle('all', done === list.length);
      }
      SPG.music.scene('color', groupOf(this.tab).theme);      // each collection has its own music
      this.tilesDirty = true;
    }
    // A small colored picture on each tab, so a child can tell them apart without reading.
    paintTabs() {
      const dpr = SPG.ui.dpr();
      for (const g of GROUPS) {
        const t = this.tabBtns.get(g.id), w = t.canvas.clientWidth; if (!w) continue;
        t.canvas.width = Math.round(w * dpr); t.canvas.height = Math.round(w * dpr * H / W);
        render(t.canvas.getContext('2d'), PICS.find(p => p.id === g.emblem), g.demo.map(([sec, ci]) => [FILL, sec, ci]), t.canvas.width);
      }
    }
    paintTiles() {
      const dpr = SPG.ui.dpr(), todo = [];
      for (const [id, t] of this.tiles) {
        const w = t.canvas.clientWidth; if (!w) continue;
        const px = Math.round(w * dpr);
        if (this.tilesDirty || this.staleTiles.has(id) || t.canvas.width !== px) todo.push([id, t, px]);
      }
      this.tilesDirty = false;
      const step = () => {
        for (const [id, t, px] of todo.splice(0, 4)) {
          t.canvas.width = px; t.canvas.height = Math.round(px * H / W);
          const r = this.rec(id);
          render(t.canvas.getContext('2d'), PICS.find(p => p.id === id), r && r.ops || [], px);
          this.staleTiles.delete(id);
        }
        if (todo.length && this.view === 'gallery') requestAnimationFrame(step);
      };
      step();
    }
    // Saving is one picture at a time. The download starts from a hidden link (no new tab, no page change),
    // and the app shows its own "Saved!" so the child never has to look at a browser message.
    async savePicture(def, button) {
      if (this.saving) return;
      this.saving = true;
      try {
        const r = this.rec(def.id);
        const blob = await toPNG(def, r && r.ops || []);
        await saveToDevice(blob, fileName(def), () => this.showSaved(button));
      } catch (_) { sfx.oops(); } finally { this.saving = false; }
    }
    showSaved(button) {
      sfx.chime();
      button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop');
      this.toast.classList.remove('show'); void this.toast.offsetWidth; this.toast.classList.add('show');
      clearTimeout(this.toastT); this.toastT = this.later(() => this.toast.classList.remove('show'), 1800);
    }

    /* -------------------------------------------------------------- editor */
    open(def) {
      this.cur = def; this.sheet = compile(def);
      const r = this.rec(def.id);
      this.ops = r && r.ops ? r.ops.map(o => o.slice()) : [];
      this.done = !!(r && r.done); this.dirty = false;
      this.view = 'editor'; this.celebrating = false;
      this.gallery.classList.add('hidden'); this.tabs.classList.add('hidden');
      SPG.music.scene('color', groupOf(def.group).theme);
      this.buildEditor();
      requestAnimationFrame(() => this.layout());
    }
    buildEditor() {
      const ed = this.editor = el('div', 'cb-editor');
      this.paper = el('div', 'cb-paper');
      this.paintCv = el('canvas', 'cb-paint'); this.lineCv = el('canvas', 'cb-lines');
      this.paper.append(this.paintCv, this.lineCv);
      this.stage = el('div', 'cb-stage', this.paper);
      this.pctx = this.paintCv.getContext('2d'); this.lctx = this.lineCv.getContext('2d');

      const tool = (id, label, ic) => { const b = btn('cb-tool', label, icon(ic)); b.dataset.tool = id; SPG.ui.press(b, () => this.setTool(id)); return b; };
      this.toolBtns = [tool('bucket', 'Fill with paint', 'c-bucket'), tool('brush', 'Paintbrush', 'c-brush'), tool('erase', 'Eraser', 'c-eraser')];
      this.undoBtn = btn('cb-tool cb-undo', 'Undo', icon('c-undo')); SPG.ui.press(this.undoBtn, () => this.undo());
      this.againBtn = btn('cb-tool', 'Start over', icon('c-again')); SPG.ui.press(this.againBtn, () => this.askClear());
      this.galleryBtn = btn('cb-tool', 'All pictures', icon('c-grid')); SPG.ui.press(this.galleryBtn, () => { sfx.tap(); this.toGallery(); });
      this.doneBtn = btn('cb-tool cb-done', 'Finished', icon('check')); SPG.ui.press(this.doneBtn, () => this.finish());
      this.tools = el('div', 'cb-tools', ...this.toolBtns, this.undoBtn, this.againBtn, this.galleryBtn, this.doneBtn);

      this.swatches = PALETTE.map((c, i) => {
        const b = btn('cb-sw', 'Color ' + (i + 1)); b.style.setProperty('--c', c);
        SPG.ui.press(b, () => this.setColor(i));
        return b;
      });
      this.palette = el('div', 'cb-palette', ...this.swatches);
      this.fxCv = el('canvas', 'cb-fx');
      ed.append(this.stage, this.tools, this.palette, this.fxCv);
      this.root.append(ed);

      const p = this.paper;
      p.addEventListener('pointerdown', e => this.down(e));
      p.addEventListener('pointermove', e => this.move(e));
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) p.addEventListener(t, e => this.up(e));
      this.setTool(this.tool, true); this.setColor(this.ci, true); this.updateButtons();
    }
    setTool(id, quiet) {
      this.tool = id; if (id !== 'erase') this.lastPaintTool = id;
      this.toolBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === id)));
      this.paper.dataset.tool = id;
      if (!quiet) sfx.tap();
    }
    setColor(i, quiet) {
      this.ci = i;
      this.swatches.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      if (this.tool === 'erase') this.setTool(this.lastPaintTool, true);
      if (!quiet) sfx.note(i % 8, .12);
    }
    updateButtons() {
      if (!this.undoBtn) return;
      this.undoBtn.classList.toggle('off', !this.ops.length);
      this.againBtn.classList.toggle('off', !hasPaint(this.ops));
    }
    // Fit the paper into the space the layout gave it, then redraw at the new size.
    layout() {
      if (this.view !== 'editor') return;
      const r = this.stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const m = 6, pw = Math.floor(Math.min(r.width - m * 2, (r.height - m * 2) * W / H)), ph = Math.floor(pw * H / W);
      this.paper.style.width = pw + 'px'; this.paper.style.height = ph + 'px';
      const dpr = SPG.ui.dpr(), k = pw * dpr / W;
      for (const c of [this.paintCv, this.lineCv]) { c.width = Math.round(pw * dpr); c.height = Math.round(ph * dpr); }
      this.pctx.setTransform(k, 0, 0, k, 0, 0); this.lctx.setTransform(k, 0, 0, k, 0, 0);
      this.fxCv.width = innerWidth; this.fxCv.height = innerHeight;
      this.redraw(); drawLines(this.lctx, this.sheet);
      this.placeBuddy();
    }
    // In the gallery the pet sits in the corner. While coloring it sits just outside the page: on top of it if
    // there is room above, otherwise at the bottom of the tool column.
    placeBuddy() {
      const b = this.buddy; if (!b) return;
      if (this.view !== 'editor') { b.el.style.left = b.el.style.top = b.el.style.right = b.el.style.bottom = ''; return; }
      const r = this.paper.getBoundingClientRect(), root = this.root.getBoundingClientRect(), h = b.el.offsetHeight || 100;
      if (r.top - root.top >= h + 4) b.place(r.left - root.left + 4, r.top - root.top - h - 2);
      else b.place(8, root.height - h - 8);
    }
    redraw() { paintAll(this.pctx, this.sheet, this.ops); }

    /* -------------------------------------------------------------- drawing input */
    toPic(e) { const r = this.paper.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
    down(e) {
      if (this.paused || this.celebrating || this.confirmEl || this.st || e.button > 0) return;
      // Palms and resting hands: ignore very large touch contacts, and touches while a stylus is in use.
      if (e.pointerType === 'pen') this.penSeen = true;
      else if (e.pointerType === 'touch' && (this.penSeen || Math.max(e.width || 0, e.height || 0) > 48)) return;
      e.preventDefault();
      const [x, y] = this.toPic(e), sec = hit(this.sheet, x, y);
      if (this.tool === 'bucket') { this.bucket(sec, e); return; }
      const kind = this.tool === 'erase' ? ERASE : BRUSHOP;
      this.st = { id: e.pointerId, sec, kind, pts: [x, y], last: [x, y], len: 0, sfxT: 0 };
      try { this.paper.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
      this.pctx.save(); this.pctx.beginPath();
      this.pctx.rect(0, 0, 0, 0); this.pctx.restore(); // (keeps the transform stack balanced on odd browsers)
      this.pctx.save();
      this.pctx.clip(sec.path); for (const o of sec.occ) this.pctx.clip(o.outer, 'evenodd');
      stroke(this.pctx, [x, y], kind === ERASE ? PAPER : PALETTE[this.ci], kind === ERASE ? ERASER : BRUSH);
      if (kind === BRUSHOP) sfx.brush(); else sfx.erase();
    }
    move(e) {
      const st = this.st; if (!st || e.pointerId !== st.id) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const col = st.kind === ERASE ? PAPER : PALETTE[this.ci], w = st.kind === ERASE ? ERASER : BRUSH;
      for (const ev of evs.length ? evs : [e]) {
        const [x, y] = this.toPic(ev), dx = x - st.last[0], dy = y - st.last[1], d = Math.hypot(dx, dy);
        if (d < 3) continue;
        stroke(this.pctx, [st.last[0], st.last[1], x, y], col, w);
        st.pts.push(x, y); st.last = [x, y]; st.len += d;
      }
      const now = performance.now();
      if (now - st.sfxT > 110) { st.sfxT = now; st.kind === ERASE ? sfx.erase() : sfx.brush(); }
    }
    up(e) {
      const st = this.st; if (!st || e.pointerId !== st.id) return;
      this.endStroke(true);
    }
    endStroke(commit) {
      const st = this.st; if (!st) return;
      this.st = null; this.pctx.restore();
      if (!commit) return;
      const id = st.sec.id;
      if (st.kind === ERASE && st.len < 10) {           // a tap with the eraser clears the whole section
        this.ops.push([CLEAR, id]); applyOp(this.pctx, this.sheet, [CLEAR, id]);
        this.puff(st.pts[0], st.pts[1], ['#ffffff', '#d9d2e0']);
      } else if (st.kind === ERASE) this.ops.push([ERASE, id, simplify(st.pts)]);
      else this.ops.push([BRUSHOP, id, this.ci, simplify(st.pts)]);
      if (this.buddy) { this.strokes = (this.strokes || 0) + 1; this.strokes % 5 === 0 ? this.buddy.hop() : this.buddy.wake(); }
      this.touched();
    }
    bucket(sec, e) {
      // Skip if this section already has exactly this color and nothing on top of it.
      for (let i = this.ops.length - 1; i >= 0; i--) {
        const op = this.ops[i];
        if (op[0] === ALL) break;
        if (op[1] !== sec.id) continue;
        if (op[0] === FILL && op[2] === this.ci) { sfx.tap(); return; }
        break;
      }
      const op = [FILL, sec.id, this.ci];
      this.ops.push(op); applyOp(this.pctx, this.sheet, op);
      sfx.fill(this.ci); this.puff(e.clientX, e.clientY, [PALETTE[this.ci], '#ffffff'], true);
      if (this.buddy) this.buddy.hop();
      this.touched();
    }
    undo() {
      if (!this.ops.length) { sfx.oops(); return; }
      this.endStroke();
      this.ops.pop(); this.redraw(); sfx.undo(); this.touched();
    }

    /* -------------------------------------------------------------- start over */
    askClear() {
      if (this.confirmEl || !hasPaint(this.ops)) { if (!hasPaint(this.ops)) sfx.oops(); return; }
      sfx.tap();
      const yes = btn('btn go cb-yn', 'Yes, start over', icon('check')), no = btn('btn quiet cb-yn', 'No, keep it', icon('x'));
      SPG.ui.press(yes, () => { this.closeConfirm(); this.ops.push([ALL]); this.redraw(); sfx.whoosh(); this.touched(); });
      SPG.ui.press(no, () => { sfx.tap(); this.closeConfirm(); });
      const sheet = el('div', 'sheet cb-sheet', el('div', 'cb-again', icon('again')), el('div', 'row', no, yes));
      this.confirmEl = el('div', 'cb-confirm', sheet);
      this.editor.append(this.confirmEl);
    }
    closeConfirm() { this.confirmEl?.remove(); this.confirmEl = null; }

    /* -------------------------------------------------------------- finishing */
    toGallery() {
      this.endStroke(true); this.closeConfirm(); this.saveNow(true);
      this.showGallery();
    }
    finish() {
      if (this.celebrating) return;
      this.endStroke(true); this.closeConfirm();
      if (!this.done) { this.done = true; store.addStars(1); }
      this.dirty = true; this.saveNow(true);
      this.celebrating = true;
      sfx.cheer(); if (this.buddy) this.buddy.cheer(3);
      this.paper.classList.add('celebrate');
      const badge = el('div', 'cb-cele', el('div', 'cb-rosette', icon('rosette')));
      SPG.ui.press(badge, () => this.endCelebration());
      this.editor.append(badge); this.celeEl = badge;
      let n = 0;
      const burst = () => {
        if (!this.celebrating) return;
        if (this.paused) { this.later(burst, 420); return; }   // the party waits while the screen is hidden or a grown-up sheet is open
        if (++n > 8) { this.endCelebration(); return; }
        const w = innerWidth, h = innerHeight;
        this.fx.burst(w * (.15 + Math.random() * .7), h * (.15 + Math.random() * .4), 26, { colors: PALETTE, speed: 420, g: 520, life: 1.5, size: 9, shape: Math.random() < .5 ? 'confetti' : 'star', up: 260 });
        this.fx.burst(w * (.2 + Math.random() * .6), h * (.3 + Math.random() * .3), 8, { colors: ['#ff9db8', '#ff7a8a'], speed: 260, g: 200, life: 1.6, size: 12, shape: 'heart', up: 220 });
        sfx.plink(Math.floor(Math.random() * 5)); this.startFx();
        this.later(burst, 420);
      };
      burst();
    }
    endCelebration() {
      if (!this.celebrating) return;
      const id = this.cur && this.cur.id;
      this.celebrating = false; this.celeEl?.remove(); this.celeEl = null; this.paper.classList.remove('celebrate');
      this.showGallery(id);
    }

    /* -------------------------------------------------------------- sparkles */
    puff(x, y, colors, client) {
      if (!client) { const r = this.paper.getBoundingClientRect(); x = r.left + x / W * r.width; y = r.top + y / H * r.height; }
      this.fx.burst(x, y, 9, { colors, speed: 210, g: 380, life: .55, size: 6, shape: 'star', up: 60 });
      this.startFx();
    }
    startFx() {
      if (this.fxRunning || !this.fxCv) return;
      this.fxRunning = true;
      let last = performance.now();
      const tick = now => {
        const dt = Math.min(.05, (now - last) / 1000); last = now;
        const c = this.fxCv.getContext('2d');
        this.fx.update(dt); c.clearRect(0, 0, this.fxCv.width, this.fxCv.height); this.fx.draw(c);
        if (this.fx.p.length && this.fxCv.isConnected) requestAnimationFrame(tick); else this.fxRunning = false;
      };
      requestAnimationFrame(tick);
    }
  }

  /* ---------------------------------------------------------------- hub card art */
  function cardIcon(c, w, h) {
    const s = Math.min(w, h * 1.2);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#efe3ff'); g.addColorStop(1, '#fff3f8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    art.cloud(c, w * .16, h * .2, s / 700, .9); art.cloud(c, w * .86, h * .26, s / 900, .8);
    // a page, half colored
    const pw = s * .72, ph = pw * H / W;
    c.save(); c.translate(w * .48, h * .5); c.rotate(-.05);
    c.fillStyle = 'rgba(90,63,94,.16)'; art.rr(c, -pw / 2 + 4, -ph / 2 + 10, pw, ph, s * .04); c.fill();
    c.fillStyle = PAPER; art.rr(c, -pw / 2, -ph / 2, pw, ph, s * .04); c.fill();
    c.save(); art.rr(c, -pw / 2, -ph / 2, pw, ph, s * .04); c.clip(); c.translate(-pw / 2, -ph / 2);
    const bunny = PICS.find(p => p.id === 'bunny');
    const demo = [[0, 'sky', 6], [0, 'sun', 2], [0, 'ground', 3], [0, 'ears', 9], [0, 'ear-in', 0], [0, 'head', 10], [0, 'body', 8], [0, 'carrot', 1], [0, 'carrot-top', 4]];
    render(c, bunny, demo, pw);
    c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = 5; art.rr(c, -pw / 2, -ph / 2, pw, ph, s * .04); c.stroke();
    c.restore();
    // crayons
    [['#ff6b81', -.06], ['#ffd54a', .0], ['#59b96e', .06]].forEach(([col, dx], i) => {
      c.save(); c.translate(w * (.86 + dx), h * (.72 + i * .02)); c.rotate(.5 + i * .12);
      const cl = s * .34, cw = s * .06;
      c.fillStyle = col; art.rr(c, -cw / 2, -cl / 2, cw, cl, cw * .3); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-cw / 2, -cl * .1, cw, cw * .5);
      c.fillStyle = col; c.beginPath(); c.moveTo(-cw / 2, -cl / 2); c.lineTo(0, -cl / 2 - cw * .9); c.lineTo(cw / 2, -cl / 2); c.fill();
      c.restore();
    });
  }

  SPG.coloring = { compile, render, compact, PALETTE };
  // For other games (Puzzle Pond): draw one of her pictures with her own colors, or a bright sample if she has not painted it.
  SPG.coloring = {
    hasPaint: id => { const r = (store.bag('color', () => ({ v: 1, pics: {} })).pics || {})[id]; return !!(r && r.ops && hasPaint(r.ops)); },
    draw(ctx, def, width) {
      const r = (store.bag('color', () => ({ v: 1, pics: {} })).pics || {})[def.id];
      let ops = r && r.ops && hasPaint(r.ops) ? r.ops : def.sections.map((s, i) => [FILL, s.id, (i * 5 + def.sections.length) % PALETTE.length]);
      render(ctx, def, ops, width);
    }
  };
  SPG.games.push({ id: 'color', name: 'Coloring Book', order: 5, dom: true, icon: cardIcon, create: host => new ColorGame(host) });
})();
