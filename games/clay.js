// Clay Corner: play-dough for fingers. The clay is a height map (a height and a colour for every cell of a 320 x 320 board) that is
// lit like real clay, so a ball, a rope, a flat sheet and a dent all look and feel different. Tools: clay (tap = ball, drag = rope),
// hand (pick a piece up and move it), pull (drag clay along), squish (press and hold to flatten), rolling pin, pinch (raise a peak),
// poke (make a dent), knife, cookie cutters, stamps, smoothing, colouring, and eyes and beads. Everything has an undo; the board is
// kept for each player between visits; the camera saves a picture (and, if a grown-up allows it, to the phone's photos).
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const G = 320, N = G * G, TAU = Math.PI * 2, SC = G / 256;   // everything below that is measured in cells is scaled by SC
  const MAXH = 70 * SC, FLAT = 2.6 * SC;            // tallest clay, and how thick a rolled-out sheet is (in cells)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rr = (c, x, y, w, h, r) => art.rr(c, x, y, w, h, r);

  /* ---------------------------------------------------------------- colours */
  const COLORS = [
    { id: 'red', c: [232, 72, 63] }, { id: 'orange', c: [255, 150, 55] }, { id: 'yellow', c: [255, 212, 70] }, { id: 'lime', c: [158, 214, 80] },
    { id: 'green', c: [64, 172, 92] }, { id: 'teal', c: [54, 185, 176] }, { id: 'sky', c: [96, 196, 240] }, { id: 'blue', c: [66, 122, 224] },
    { id: 'purple', c: [142, 94, 224] }, { id: 'pink', c: [255, 126, 182] }, { id: 'brown', c: [154, 106, 70] }, { id: 'white', c: [248, 244, 236] },
    { id: 'black', c: [74, 69, 80] }, { id: 'rainbow', c: [255, 150, 200], rainbow: true }
  ];
  const BEADS = [[255, 90, 110], [255, 205, 70], [90, 200, 120], [90, 180, 245], [170, 120, 235], [255, 150, 70]];
  const hsl = (h, s, l) => {
    h = ((h % 360) + 360) % 360 / 360; const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  };
  const css = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

  /* ---------------------------------------------------------------- shapes (cutters, stamps), drawn around (0, 0) with radius r */
  const SHAPES = {
    circle: (c, r) => { c.beginPath(); c.arc(0, 0, r, 0, TAU); },
    square: (c, r) => { c.beginPath(); rr(c, -r * .85, -r * .85, r * 1.7, r * 1.7, r * .2); },
    heart: (c, r) => { c.beginPath(); c.moveTo(0, r * .92); c.bezierCurveTo(-r * 1.35, r * .1, -r * 1.05, -r * .95, 0, -r * .38); c.bezierCurveTo(r * 1.05, -r * .95, r * 1.35, r * .1, 0, r * .92); c.closePath(); },
    star: (c, r) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .47 : r * 1.05; c.lineTo(Math.cos(a) * q, Math.sin(a) * q + r * .06); } c.closePath(); },
    flower: (c, r) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.moveTo(Math.cos(a) * r * .58 + r * .42, Math.sin(a) * r * .58); c.arc(Math.cos(a) * r * .58, Math.sin(a) * r * .58, r * .42, 0, TAU); } c.moveTo(r * .35, 0); c.arc(0, 0, r * .35, 0, TAU); },
    triangle: (c, r) => { c.beginPath(); c.moveTo(0, -r * .95); c.lineTo(r * .95, r * .7); c.lineTo(-r * .95, r * .7); c.closePath(); },
    bear: (c, r) => { c.beginPath(); c.arc(0, r * .12, r * .78, 0, TAU); c.moveTo(-r * .38 + r * .34, -r * .62); c.arc(-r * .62, -r * .5, r * .34, 0, TAU); c.moveTo(r * .62 + r * .34, -r * .5); c.arc(r * .62, -r * .5, r * .34, 0, TAU); },
    cat: (c, r) => { c.beginPath(); c.arc(0, r * .18, r * .76, 0, TAU); c.moveTo(-r * .72, -r * .2); c.lineTo(-r * .62, -r * .95); c.lineTo(-r * .12, -r * .5); c.closePath(); c.moveTo(r * .72, -r * .2); c.lineTo(r * .62, -r * .95); c.lineTo(r * .12, -r * .5); c.closePath(); },
    // stamps
    dots: (c, r) => { c.beginPath(); for (const [x, y] of [[-.5, -.35], [.5, -.35], [0, .5]]) { c.moveTo(x * r + r * .26, y * r); c.arc(x * r, y * r, r * .26, 0, TAU); } },
    paw: (c, r) => { c.beginPath(); c.ellipse(0, r * .38, r * .52, r * .42, 0, 0, TAU); for (const [x, y] of [[-.72, -.05], [-.26, -.52], [.26, -.52], [.72, -.05]]) { c.moveTo(x * r + r * .22, y * r); c.arc(x * r, y * r, r * .22, 0, TAU); } },
    ridges: (c, r) => { c.beginPath(); for (let i = -2; i <= 2; i++) rr(c, i * r * .36 - r * .09, -r * .8, r * .18, r * 1.6, r * .09); },
    ring: (c, r) => { c.beginPath(); c.arc(0, 0, r * .85, 0, TAU); c.moveTo(r * .5, 0); c.arc(0, 0, r * .5, 0, TAU, true); },
    plus: (c, r) => { c.beginPath(); rr(c, -r * .22, -r * .85, r * .44, r * 1.7, r * .12); rr(c, -r * .85, -r * .22, r * 1.7, r * .44, r * .12); },
    zigzag: (c, r) => { c.beginPath(); const p = [[-.9, -.3], [-.45, .3], [0, -.3], [.45, .3], [.9, -.3]]; for (const [x, y] of p) c.lineTo(x * r, y * r - r * .1); for (let i = p.length - 1; i >= 0; i--) c.lineTo(p[i][0] * r, p[i][1] * r + r * .22); c.closePath(); }
  };
  const CUTTERS = ['circle', 'square', 'heart', 'star', 'flower', 'triangle', 'bear', 'cat'];
  const STAMPS = ['dots', 'star', 'heart', 'flower', 'paw', 'ridges', 'ring', 'zigzag'];
  const EXTRAS = ['eye', 'bead', 'pearl', 'sprinkles'];

  // tools in the order they are shown; the number is the youngest age tier that gets them
  const TOOLS = [['clay', 1], ['hand', 1], ['pull', 1], ['squish', 1], ['roll', 1], ['cutters', 1], ['extras', 1], ['knife', 2], ['stamps', 2], ['smooth', 2], ['pinch', 2], ['poke', 2], ['dye', 3]];
  const SIZE_R = [6 * SC, 10 * SC, 16 * SC];             // brush radius in cells for small, medium, large
  const GAP = [1.4 * SC, 1.8 * SC, 2.4 * SC];            // how wide a knife cut or a cutter's edge is
  const UNDO_MAX = 12;
  const NB = [-G - 1, -G, -G + 1, -1, 1, G - 1, G, G + 1];   // the eight neighbours of a cell

  /* ---------------------------------------------------------------- keeping the board between visits (IndexedDB) */
  let dbp = null;
  const dbOpen = () => dbp || (dbp = new Promise(res => {
    try { const rq = indexedDB.open('spg-clay', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('clay', { keyPath: 'pid' }); rq.onsuccess = () => res(rq.result); rq.onerror = rq.onblocked = () => res(null); } catch (_) { res(null); }
  }));
  const dbPut = async rec => { const db = await dbOpen(); if (!db) return; try { db.transaction('clay', 'readwrite').objectStore('clay').put(rec); } catch (_) { /* no room: the board is just not kept */ } };
  const dbGet = async pid => { const db = await dbOpen(); if (!db) return null; return new Promise(res => { try { const rq = db.transaction('clay').objectStore('clay').get(pid); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); } catch (_) { res(null); } }); };

  /* ---------------------------------------------------------------- the game */
  class ClayGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas'; host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.H = new Float32Array(N); this.C = new Uint8Array(N * 3).fill(238);
      this.H0 = new Float32Array(N); this.C0 = new Uint8Array(N * 3);      // scratch copies for pulling and smoothing
      this.noise = new Float32Array(N); for (let i = 0; i < N; i++) this.noise[i] = (Math.random() - .5) * .035;
      this.img = document.createElement('canvas'); this.img.width = this.img.height = G; this.imgc = this.img.getContext('2d'); this.imd = this.imgc.createImageData(G, G);
      this.layer = document.createElement('canvas'); this.layerc = this.layer.getContext('2d');
      this.undo = []; this.tool = 'clay'; this.col = 9; this.size = 1; this.cutter = 'circle'; this.stamp = 'dots'; this.extra = 'eye';
      this.menu = null; this.confirm = false; this.stroke = null; this.ptr = null; this.hover = null;
      this.dirty = true; this.t = 0; this.running = false; this.touched = false; this.saveAt = 0; this.camUntil = 0; this.flash = 0; this.snapA = null; this.pop = 0;
      this.fx = new art.Fx(); this.masks = new Map(); this.sndT = 0;
      this.tier = SPG.level.tier('clay');
      this.tools = TOOLS.filter(t => t[1] <= this.tier).map(t => t[0]);
      this.tick = this.tick.bind(this);
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      cv.addEventListener('pointerdown', e => { if (!e.isPrimary) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* fine */ } this.ptr = e.pointerId; const p = at(e); this.down(p.x, p.y); });
      cv.addEventListener('pointermove', e => { if (e.pointerId !== this.ptr && this.ptr != null) return; const p = at(e); this.hover = p; if (this.ptr != null) this.move(p.x, p.y); });
      const end = e => { if (e.pointerId !== this.ptr) return; this.ptr = null; this.up(); };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', end);
      this.loadSaved(); SPG.clayGame = this;
    }

    /* ---------------------------------------------------------------- sizing and layout */
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr(); this.dpr = dpr;
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.layout(); this.dirty = true; this.draw();
    }
    layout() {
      const w = this.w, h = this.h, wide = w >= h * 1.1; this.wide = wide;
      const items = [], tools = this.tools, listT = [...tools, 'size'], nT = listT.length, ACT = ['undo', 'camera', 'album', 'bin'];
      let bs, board;
      const toolItem = (id, x, y, r) => ({ kind: id === 'size' ? 'size' : 'tool', id, x, y, r });
      if (wide) {
        // the tools in a block on the left (below the home button), the actions and colours in a block on the right (below the star count)
        const availL = h - 100, availR = h - 92; let L = null, R = null;
        for (let cols = 2; cols <= 4 && !L; cols++) { const rows = Math.ceil(nT / cols), b = Math.min(64, availL / (rows * 1.12)); if (b >= 46 || cols === 4) L = { cols, rows, bs: b }; }
        for (let cols = 2; cols <= 4 && !R; cols++) { const blank = (cols - ACT.length % cols) % cols, cells = ACT.length + blank + COLORS.length, rows = Math.ceil(cells / cols), b = Math.min(64, availR / (rows * 1.12)); if (b >= 46 || cols === 4) R = { cols, rows, bs: b, blank }; }
        bs = L.bs; const gl = L.bs * 1.12, gr = R.bs * 1.12;
        listT.forEach((id, i) => items.push(toolItem(id, 12 + (Math.floor(i / L.rows) + .5) * gl, 96 + Math.max(0, (availL - L.rows * gl) / 2) + (i % L.rows + .5) * gl, L.bs * .5)));
        const rx = w - 12 - R.cols * gr, ry = 88;
        ACT.forEach((id, i) => items.push({ kind: 'act', id, x: rx + (i % R.cols + .5) * gr, y: ry + (Math.floor(i / R.cols) + .5) * gr, r: R.bs * .5 }));
        COLORS.forEach((c, i) => { const k = ACT.length + R.blank + i; items.push({ kind: 'color', id: i, x: rx + (k % R.cols + .5) * gr, y: ry + (Math.floor(k / R.cols) + .5) * gr, r: R.bs * .44 }); });
        const left = 12 + L.cols * gl, right = w - 12 - R.cols * gr, size = Math.max(140, Math.min(right - left - 16, h - 24));
        board = { s: size, x: (left + right) / 2 - size / 2, y: (h - size) / 2 };
      } else {
        // the tools in rows along the bottom, then the colours; the actions in the top row between the home button and the star count
        const perRow = clamp(Math.floor(w / 40), 5, 8), perC = clamp(Math.floor(w / 36), 5, 7), rowsT = Math.ceil(nT / perRow), rowsC = Math.ceil(COLORS.length / perC);
        let k = 1, cs, stackH, top, sizeB;
        for (; k > .3; k -= .1) {   // tiny screens (a phone's cover display): shrink the buttons until the board has room
          bs = Math.min(62, w / perRow / 1.08) * k; cs = Math.min(bs * .76, w / perC / 1.2 * k); stackH = rowsT * bs * 1.1 + rowsC * cs * 1.18 + 20; top = 12 + Math.min(bs, 56) + 10;
          sizeB = Math.min(w - 16, h - top - stackH - 8); if (sizeB >= Math.min(w - 16, 170)) break;
        }
        const gapT = w / perRow; sizeB = Math.max(80, sizeB); board = { s: sizeB, x: (w - sizeB) / 2, y: top + Math.max(0, (h - top - stackH - 8 - sizeB) / 2) };
        const by = h - stackH + 6;
        listT.forEach((id, i) => items.push(toolItem(id, gapT * (i % perRow + .5), by + (Math.floor(i / perRow) + .5) * bs * 1.1, bs * .5)));
        const cy = by + rowsT * bs * 1.1 + 8, cg = w / perC;
        COLORS.forEach((c, i) => items.push({ kind: 'color', id: i, x: cg * (i % perC + .5), y: cy + (Math.floor(i / perC) + .5) * cs * 1.18, r: cs * .5 }));
        const ab = Math.min(bs, 56);
        ACT.forEach((id, i) => items.push({ kind: 'act', id, x: w / 2 + (i - 1) * ab * 1.18, y: 12 + ab * .5, r: ab * .5 }));
      }
      this.bs = bs; this.items = items; this.board = board; this.cs = board.s / G;
      const Ls = Math.round(board.s * this.dpr); if (this.layer.width !== Ls) { this.layer.width = this.layer.height = Ls; }
    }
    // geometry and state for the play-tests (tools/playtest)
    probe() { return { items: this.items.map(i => ({ kind: i.kind, id: i.id, x: i.x, y: i.y, r: i.r })), board: this.board, w: this.w, h: this.h, tool: this.tool, col: this.col, size: this.size, menu: this.menu, undo: this.undo.length, clay: this.H.reduce((a, v) => a + (v > .3 ? 1 : 0), 0), maxH: this.H.reduce((a, v) => Math.max(a, v), 0), confirm: this.confirm, tools: this.tools, album: this.album ? { n: this.album.list.length, view: this.album.view, busy: this.album.busy } : null }; }
    item(kind, id) { return this.items.find(i => i.kind === kind && i.id === id); }
    gp(x, y) { return { x: (x - this.board.x) / this.cs, y: (y - this.board.y) / this.cs }; }
    inBoard(x, y, m = 0) { const b = this.board; return x >= b.x - m && x <= b.x + b.s + m && y >= b.y - m && y <= b.y + b.s + m; }

    start() { this.resize(); this.resume(); voice.say('clay-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.ptr = null; if (this.stroke) this.up(); this.save(); }
    destroy() { this.pause(); this.closeAlbum(); this.canvas.remove(); }

    /* ---------------------------------------------------------------- saving the board */
    pid() { return store.active ? store.active.id : null; }
    async loadSaved() {
      const pid = this.pid(); if (!pid) return; const rec = await dbGet(pid);
      if (rec && rec.h && rec.h.length === N && rec.c && rec.c.length === N * 3 && !this.touched) { this.H.set(rec.h); this.C.set(rec.c); this.dirty = true; }
    }
    save() { const pid = this.pid(); if (!pid || !this.touched) return; this.saveAt = 0; dbPut({ pid, h: this.H.slice(), c: this.C.slice(), t: Date.now() }); }
    pushUndo() { this.undo.push({ h: this.H.slice(), c: this.C.slice() }); if (this.undo.length > UNDO_MAX) this.undo.shift(); this.touched = true; }
    doUndo() { const u = this.undo.pop(); if (!u) { sfx.oops && sfx.oops(); return; } this.H.set(u.h); this.C.set(u.c); this.dirty = true; sfx.whoosh(); this.saveAt = this.t + 1.5; }
    clearAll() { this.pushUndo(); this.H.fill(0); this.C.fill(238); this.dirty = true; sfx.whoosh(); this.saveAt = this.t + 1.5; }

    /* ---------------------------------------------------------------- input */
    colorNow(dist = 0) { const c = COLORS[this.col]; return c.rainbow ? hsl(dist * 2.2, .75, .62) : c.c; }
    radius() { return SIZE_R[this.size]; }
    down(x, y) {
      SPG.audio.unlock();
      if (this.album) { this.albumDown(x, y); return; }
      this.touched = true;
      if (this.confirm) {
        const b = this.confirmBtns();
        if (Math.hypot(x - b.yes.x, y - b.yes.y) < b.r * 1.1) { this.confirm = false; this.clearAll(); } else if (Math.hypot(x - b.no.x, y - b.no.y) < b.r * 1.1) { this.confirm = false; sfx.tap(); }
        return;
      }
      if (this.menu) {
        const o = this.menuHit(x, y);
        if (o) { this.pickOption(o); return; }
        const it = this.items.find(i => Math.hypot(x - i.x, y - i.y) < i.r * 1.15);
        if (!it) { this.menu = null; return; }
      }
      const it = this.items.find(i => Math.hypot(x - i.x, y - i.y) < i.r * 1.15);
      if (it) { this.pressItem(it); return; }
      if (!this.inBoard(x, y, 4)) return;
      this.beginStroke(x, y);
    }
    pressItem(it) {
      sfx.tap();
      if (it.kind === 'color') { this.col = it.id; this.menu = null; if (this.tool === 'hand' || this.tool === 'cutters' || this.tool === 'knife' || this.tool === 'stamps' || this.tool === 'roll' || this.tool === 'squish' || this.tool === 'pull' || this.tool === 'pinch' || this.tool === 'poke' || this.tool === 'smooth') this.tool = 'clay'; return; }
      if (it.kind === 'size') { this.size = (this.size + 1) % 3; this.menu = null; return; }
      if (it.kind === 'act') {
        this.menu = null;
        if (it.id === 'undo') this.doUndo(); else if (it.id === 'camera') this.snap(); else if (it.id === 'album') this.openAlbum(); else if (it.id === 'bin') { if (this.touched && this.H.some(v => v > 0.5)) this.confirm = true; }
        return;
      }
      const same = this.tool === it.id; this.tool = it.id;
      if (it.id === 'cutters' || it.id === 'stamps' || it.id === 'extras') this.menu = same && this.menu === it.id ? null : it.id; else this.menu = null;
      voice.say('clay/' + it.id);
    }
    beginStroke(x, y) {
      const g = this.gp(x, y), tool = this.tool;
      const s = this.stroke = { tool, gx: g.x, gy: g.y, lx: g.x, ly: g.y, dist: 0, speed: 0, t0: this.t, moved: false, base: null, dir: null };
      if (tool === 'cutters' || tool === 'stamps' || tool === 'extras') return;           // these show where they will land, and act when the finger lifts
      if (tool === 'hand') { if (!this.pickUp(s, g.x, g.y)) { this.stroke = null; return; } this.pushUndoPending = true; return; }
      this.pushUndo();
      if (tool === 'clay') { s.base = this.H.slice(); this.dome(g.x, g.y, this.radius(), this.colorNow(0), s.base); sfx.pop(); this.dirty = true; }
      else if (tool === 'knife') this.cutLine(g.x, g.y, g.x, g.y);
    }
    move(x, y) {
      const s = this.stroke; if (!s) return;
      const g = this.gp(x, y), dx = g.x - s.lx, dy = g.y - s.ly, d = Math.hypot(dx, dy);
      s.gx = g.x; s.gy = g.y;
      if (d < .02) return;
      s.moved = true;
      const R = this.radius();
      switch (s.tool) {
        case 'clay': {
          const step = Math.max(1, R * .22), n = Math.ceil(d / step);
          for (let k = 1; k <= n; k++) { const u = k / n; s.dist += d / n; this.dome(s.lx + dx * u, s.ly + dy * u, R * (1 + .055 * Math.sin(s.dist * .21) + .03 * Math.sin(s.dist * .53 + 1)), this.colorNow(s.dist), s.base); }
          if (this.t - this.sndT > .12) { sfx.squish(); this.sndT = this.t; }
          break;
        }
        case 'pull': this.warp(s.lx, s.ly, dx, dy, R); if (this.t - this.sndT > .14) { sfx.squish(); this.sndT = this.t; } break;
        case 'roll': this.rollSeg(s, dx, dy, d, R); if (this.t - this.sndT > .1) { sfx.roll(); this.sndT = this.t; } break;
        case 'knife': this.cutLine(s.lx, s.ly, g.x, g.y); break;
        case 'hand': this.moveHeld(s, g.x, g.y); break;
        default: break;
      }
      s.speed = s.speed * .7 + (d / Math.max(.008, this.t - (s.tl || this.t - .016))) * .3; s.tl = this.t;
      s.lx = g.x; s.ly = g.y; this.dirty = true;
    }
    up() {
      const s = this.stroke; this.stroke = null; if (!s) return;
      const R = this.radius();
      if (s.tool === 'knife') sfx.snap();
      if (s.tool === 'hand') { this.dropHeld(s); }
      else if (s.tool === 'cutters') this.applyCutter(s.gx, s.gy);
      else if (s.tool === 'stamps') this.applyStamp(s.gx, s.gy);
      else if (s.tool === 'extras') this.applyExtra(s.gx, s.gy, R);
      this.dirty = true; this.saveAt = this.t + 1.5;
    }

    /* ---------------------------------------------------------------- per frame: the tools that work while a finger is held down */
    update(dt) {
      const s = this.stroke; if (!s || this.ptr == null) return;
      const R = this.radius(), x = s.gx, y = s.gy;
      if (s.tool === 'squish') {
        const moving = this.t - (s.tl || 0) < .1, sink = 22 + (moving ? Math.min(60, s.speed * 1.2) : 0);
        if (this.squishAt(x, y, R * 1.25, sink * SC * dt)) { if (this.t - this.sndT > .16) { sfx.squish(); this.sndT = this.t; } this.dirty = true; }
      } else if (s.tool === 'pinch') { if (this.pinchAt(x, y, R, dt)) { this.dirty = true; if (this.t - this.sndT > .2) { sfx.roll(); this.sndT = this.t; } } }
      else if (s.tool === 'poke') { if (this.pokeAt(x, y, R, dt)) { this.dirty = true; if (this.t - this.sndT > .2) { sfx.roll(); this.sndT = this.t; } } }
      else if (s.tool === 'smooth') { this.smoothAt(x, y, R * 1.2); this.dirty = true; if (this.t - this.sndT > .2) { sfx.roll(); this.sndT = this.t; } }
      else if (s.tool === 'dye') { this.dyeAt(x, y, R, dt, s); this.dirty = true; }
    }

    /* ---------------------------------------------------------------- clay operations */
    // a rounded lump (half a ball) of radius r laid on top of what was there when the stroke began: overlapping lumps of one stroke make a smooth rope
    dome(cx, cy, r, col, base) {
      const H = this.H, C = this.C, x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(G - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(G - 1, Math.ceil(cy + r)), r2 = r * r;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d2 >= r2) continue;
        const i = y * G + x, dd = Math.sqrt(d2), eg = Math.min(1, (r - dd) / (1.8 * SC)), hh = Math.sqrt(r2 - d2) * .86 * eg * eg, tg = Math.min(MAXH, (base ? base[i] : H[i]) + hh);
        if (tg > H[i] + .01) {
          // where new clay rises well above old clay it takes its colour; near the rim the two colours mix a little, like real clay pressed together
          let w = H[i] < .3 ? 1 : clamp((tg - H[i]) / (2.2 * SC), 0, 1); w = w * w * (3 - 2 * w);
          C[i * 3] += (col[0] - C[i * 3]) * w; C[i * 3 + 1] += (col[1] - C[i * 3 + 1]) * w; C[i * 3 + 2] += (col[2] - C[i * 3 + 2]) * w; H[i] = tg;
        }
      }
    }
    // press a flat tool down: clay under it above `ceil` is pushed out into the ring around it. sd(x, y) < 0 inside, between 0 and ring around.
    // Slump: clay cannot hold a cliff. Where one cell stands more than T above its neighbour, a little flows over to it (no clay is lost),
    // so pressed lumps spread into soft skirts and every edge ends up rounded.
    relax(x0, y0, x1, y1, iters, T) {
      const H = this.H, C = this.C; x0 = Math.max(1, Math.floor(x0)); y0 = Math.max(1, Math.floor(y0)); x1 = Math.min(G - 2, Math.ceil(x1)); y1 = Math.min(G - 2, Math.ceil(y1));
      const offs = [1, G, -1, -G];
      for (let it = 0; it < iters; it++) {
        const flip = it & 1;
        for (let yy = y0; yy <= y1; yy++) { const y = flip ? y1 - (yy - y0) : yy; for (let xx = x0; xx <= x1; xx++) { const x = flip ? x1 - (xx - x0) : xx, i = y * G + x, h = H[i]; if (h <= .05) continue;
          for (let q = 0; q < 4; q++) { const j = i + offs[q], dh = h - H[j]; if (dh > T) { const m = (dh - T) * .22; if (H[j] < .3) { C[j * 3] = C[i * 3]; C[j * 3 + 1] = C[i * 3 + 1]; C[j * 3 + 2] = C[i * 3 + 2]; } H[i] -= m; H[j] += m; } } } }
      }
    }
    flatten(x0, y0, x1, y1, sd, ring, ceil, extraOK) {
      const H = this.H, C = this.C; x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(G - 1, Math.ceil(x1)); y1 = Math.min(G - 1, Math.ceil(y1));
      let excess = 0, cr = 0, cg = 0, cb = 0, cw = 0; const rc = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const v = sd(x, y), i = y * G + x;
        if (v <= 0) { if (H[i] > ceil) { const e = H[i] - ceil; excess += e; cr += C[i * 3] * e; cg += C[i * 3 + 1] * e; cb += C[i * 3 + 2] * e; cw += e; H[i] = ceil; } }
        else if (v < ring && (!extraOK || extraOK(x, y))) rc.push(i);
      }
      if (excess <= 0) return false;
      // the squeezed-out clay goes into the cells just outside, where the pressed clay reaches the edge of the tool; slumping then spreads it
      const edge = []; for (const i of rc) { let touch = false; for (let q = 0; q < 8 && !touch; q++) { const j = i + NB[q]; if (j >= 0 && j < N && H[j] >= ceil * .9) touch = true; } if (touch || H[i] > .3) edge.push(i); }
      if (edge.length) {
        const add = Math.min(excess / edge.length, 3.2 * SC), col = [cr / cw, cg / cw, cb / cw];
        for (const i of edge) { if (H[i] < .5) { C[i * 3] = col[0]; C[i * 3 + 1] = col[1]; C[i * 3 + 2] = col[2]; } H[i] = Math.min(MAXH, H[i] + add); }
      }
      this.relax(x0 - 2, y0 - 2, x1 + 2, y1 + 2, 10, 1.25 * SC);
      return true;
    }
    squishAt(cx, cy, r, sink) {
      const H = this.H, x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(G - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(G - 1, Math.ceil(cy + r));
      let mx = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (Math.hypot(x - cx, y - cy) <= r && H[y * G + x] > mx) mx = H[y * G + x]; }
      if (mx <= FLAT + .02) return false;
      return this.flatten(cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6, (x, y) => Math.hypot(x - cx, y - cy) - r, 3 * SC, Math.max(FLAT, mx - sink), null);
    }
    rollSeg(s, dx, dy, d, R) {
      const ux = dx / d, uy = dy / d, L = R * 2.4, back = 1.5 * SC, fwd = d + 1.5 * SC, ring = 3.5 * SC, x0 = s.lx, y0 = s.ly;
      const along = (x, y) => (x - x0) * ux + (y - y0) * uy, across = (x, y) => -(x - x0) * uy + (y - y0) * ux;
      const sd = (x, y) => { const u = along(x, y), v = Math.abs(across(x, y)); return Math.max(-back - u, u - fwd, v - L); };
      const rg = L + fwd + ring + 2;
      this.flatten(x0 - rg, y0 - rg, x0 + rg, y0 + rg, sd, ring, FLAT, (x, y) => along(x, y) > -back);
    }
    // drag clay along with a finger (backward warp: what is at the finger moves with it)
    warp(px, py, dx, dy, R) {
      const rho = R * 1.35, m = Math.hypot(dx, dy), k = m > R * 1.2 ? R * 1.2 / m : 1; dx *= k; dy *= k;
      const H = this.H, C = this.C, H0 = this.H0, C0 = this.C0, x0 = Math.max(0, Math.floor(px - rho)), x1 = Math.min(G - 1, Math.ceil(px + rho)), y0 = Math.max(0, Math.floor(py - rho)), y1 = Math.min(G - 1, Math.ceil(py + rho));
      for (let y = Math.max(0, y0 - 2); y <= Math.min(G - 1, y1 + 2); y++) { const a = y * G + Math.max(0, x0 - 2 - Math.ceil(m)), b = y * G + Math.min(G - 1, x1 + 2 + Math.ceil(m)); H0.set(H.subarray(a, b + 1), a); C0.set(C.subarray(a * 3, b * 3 + 3), a * 3); }
      const samp = (fx, fy, out) => {
        fx = clamp(fx, 0, G - 1.001); fy = clamp(fy, 0, G - 1.001); const ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy, i = iy * G + ix;
        const h = (H0[i] * (1 - ax) + H0[i + 1] * ax) * (1 - ay) + (H0[i + G] * (1 - ax) + H0[i + G + 1] * ax) * ay;
        const w00 = (1 - ax) * (1 - ay) * (H0[i] > .1 ? 1 : 0), w10 = ax * (1 - ay) * (H0[i + 1] > .1 ? 1 : 0), w01 = (1 - ax) * ay * (H0[i + G] > .1 ? 1 : 0), w11 = ax * ay * (H0[i + G + 1] > .1 ? 1 : 0), ws = w00 + w10 + w01 + w11 || 1;
        out[0] = h; for (let ch = 0; ch < 3; ch++) out[1 + ch] = (C0[i * 3 + ch] * w00 + C0[(i + 1) * 3 + ch] * w10 + C0[(i + G) * 3 + ch] * w01 + C0[(i + G + 1) * 3 + ch] * w11) / ws;
      };
      const o = [0, 0, 0, 0];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - px, y - py) / rho; if (d >= 1) continue; const w = (1 - d * d) * (1 - d * d), i = y * G + x;
        samp(x - dx * w, y - dy * w, o); H[i] = o[0] < .7 * SC ? 0 : o[0]; if (o[0] > .3) { C[i * 3] = o[1]; C[i * 3 + 1] = o[2]; C[i * 3 + 2] = o[3]; }
      }
    }
    pinchAt(cx, cy, R, dt) {
      const H = this.H, r = R * 1.7, sg = R * .75; let any = false;
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(G - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(G - 1, Math.ceil(cx + r)); x++) {
        const i = y * G + x; if (H[i] < .3) continue; const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d2 > r * r) continue;
        H[i] = Math.min(MAXH, H[i] + Math.exp(-d2 / (2 * sg * sg)) * 16 * SC * dt); any = true;
      }
      return any;
    }
    pokeAt(cx, cy, R, dt) {
      const H = this.H, r = R * 1.1, sg = R * .4; let any = false;
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(G - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(G - 1, Math.ceil(cx + r)); x++) {
        const i = y * G + x; if (H[i] <= 0) continue; const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d2 > r * r) continue;
        H[i] = Math.max(0, H[i] - Math.exp(-d2 / (2 * sg * sg)) * 48 * SC * dt); any = true;
      }
      return any;
    }
    smoothAt(cx, cy, r) {
      const H = this.H, C = this.C, H0 = this.H0, C0 = this.C0, x0 = Math.max(1, Math.floor(cx - r)), x1 = Math.min(G - 2, Math.ceil(cx + r)), y0 = Math.max(1, Math.floor(cy - r)), y1 = Math.min(G - 2, Math.ceil(cy + r));
      for (let y = y0 - 1; y <= y1 + 1; y++) { const a = y * G + x0 - 1, b = y * G + x1 + 1; H0.set(H.subarray(a, b + 1), a); C0.set(C.subarray(a * 3, b * 3 + 3), a * 3); }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy); if (d > r) continue; const i = y * G + x; if (H0[i] < .2) continue;
        const f = .5 * (1 - d / r); let sh = 0, sr = 0, sg2 = 0, sb = 0, n = 0;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const j = i + oy * G + ox; if (H0[j] < .2) continue; sh += H0[j]; sr += C0[j * 3]; sg2 += C0[j * 3 + 1]; sb += C0[j * 3 + 2]; n++; }
        if (!n) continue; H[i] = H0[i] + (sh / n - H0[i]) * f; C[i * 3] = C0[i * 3] + (sr / n - C0[i * 3]) * f; C[i * 3 + 1] = C0[i * 3 + 1] + (sg2 / n - C0[i * 3 + 1]) * f; C[i * 3 + 2] = C0[i * 3 + 2] + (sb / n - C0[i * 3 + 2]) * f;
      }
    }
    dyeAt(cx, cy, R, dt, s) {
      const H = this.H, C = this.C, col = this.colorNow(s.dist), k = 1 - Math.exp(-dt * 7); s.dist += 1;
      for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(G - 1, Math.ceil(cy + R)); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(G - 1, Math.ceil(cx + R)); x++) {
        const i = y * G + x; if (H[i] < .2) continue; const d = Math.hypot(x - cx, y - cy); if (d > R) continue; const f = k * (1 - d / R * .6);
        C[i * 3] += (col[0] - C[i * 3]) * f; C[i * 3 + 1] += (col[1] - C[i * 3 + 1]) * f; C[i * 3 + 2] += (col[2] - C[i * 3 + 2]) * f;
      }
    }
    cutLine(ax, ay, bx, by) {
      const H = this.H, r = GAP[this.size] * .5 + .9, x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r)), x1 = Math.min(G - 1, Math.ceil(Math.max(ax, bx) + r)), y0 = Math.max(0, Math.floor(Math.min(ay, by) - r)), y1 = Math.min(G - 1, Math.ceil(Math.max(ay, by) + r));
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const u = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), d = Math.hypot(x - (ax + dx * u), y - (ay + dy * u)); if (d <= r) H[y * G + x] = 0;
      }
    }

    /* ---------------------------------------------------------------- cutters, stamps, eyes and beads */
    cutterR() { return [9 * SC, 14 * SC, 22 * SC][this.size]; }
    mask(kind, r, isCutter) {
      const key = kind + '|' + r + '|' + (isCutter ? GAP[this.size] : 's'), hit = this.masks.get(key); if (hit) return hit;
      const gap = isCutter ? GAP[this.size] : 0, M = Math.ceil(2 * (r + gap + 3)), cv = document.createElement('canvas'); cv.width = cv.height = M; const c = cv.getContext('2d', { willReadFrequently: true });
      c.translate(M / 2, M / 2); c.lineJoin = 'round';
      if (isCutter) { SHAPES[kind](c, r); c.strokeStyle = '#f00'; c.lineWidth = gap * 2; c.stroke(); c.fillStyle = '#0f0'; c.fill(); } else { SHAPES[kind](c, r); c.fillStyle = '#fff'; c.fill(); }
      const d = c.getImageData(0, 0, M, M).data, out = new Float32Array(M * M);
      for (let i = 0; i < M * M; i++) { const a = d[i * 4 + 3] / 255; out[i] = isCutter ? (a < .5 ? 0 : d[i * 4 + 1] > 128 ? 2 : 1) : a; }
      const m = { M, data: out }; this.masks.set(key, m); return m;
    }
    applyCutter(gx, gy) {
      if (!this.inBoard(this.board.x + gx * this.cs, this.board.y + gy * this.cs)) return;
      const m = this.mask(this.cutter, this.cutterR(), true), H = this.H, ox = Math.round(gx - m.M / 2), oy = Math.round(gy - m.M / 2); let cutAny = false;
      this.pushUndo();
      for (let y = 0; y < m.M; y++) for (let x = 0; x < m.M; x++) {
        if (m.data[y * m.M + x] !== 1) continue; const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= G || Y >= G) continue; if (H[Y * G + X] > 0) { H[Y * G + X] = 0; cutAny = true; }
      }
      sfx.snap(); if (cutAny) { sfx.pop(); const p = this.screenOf(gx, gy); this.fx.burst(p.x, p.y, 8, { colors: ['#fff', '#ffd54a'], speed: 140, g: 160, life: .5, size: 5, shape: 'star' }); }
    }
    applyStamp(gx, gy) {
      if (!this.inBoard(this.board.x + gx * this.cs, this.board.y + gy * this.cs)) return;
      const m = this.mask(this.stamp, this.cutterR(), false), H = this.H, ox = Math.round(gx - m.M / 2), oy = Math.round(gy - m.M / 2); let any = false;
      this.pushUndo();
      for (let y = 0; y < m.M; y++) for (let x = 0; x < m.M; x++) {
        const a = m.data[y * m.M + x]; if (a <= .02) continue; const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= G || Y >= G) continue; const i = Y * G + X;
        if (H[i] > .8) { H[i] -= Math.min(H[i] * .5, 1.5 * SC) * a; any = true; }
      }
      if (any) { sfx.pop(); sfx.squish(); }
    }
    applyExtra(gx, gy, R) {
      if (!this.inBoard(this.board.x + gx * this.cs, this.board.y + gy * this.cs)) return;
      this.pushUndo(); const H = this.H, C = this.C;
      const lump = (cx, cy, r, col, amp = .9) => {
        for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(G - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(G - 1, Math.ceil(cx + r)); x++) {
          const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d2 >= r * r) continue; const i = y * G + x; H[i] = Math.min(MAXH, H[i] + Math.sqrt(r * r - d2) * amp); C[i * 3] = col[0]; C[i * 3 + 1] = col[1]; C[i * 3 + 2] = col[2];
        }
      };
      if (this.extra === 'eye') { const r = R * .8, a = Math.random() * TAU; lump(gx, gy, r, [252, 252, 250]); lump(gx + Math.cos(a) * r * .22, gy + Math.sin(a) * r * .22, r * .52, [38, 32, 44], 1.1); sfx.plink(2); }
      else if (this.extra === 'bead') { lump(gx, gy, R * .4, BEADS[Math.floor(Math.random() * BEADS.length)]); sfx.plink(1); }
      else if (this.extra === 'pearl') { lump(gx, gy, R * .62, [255, 236, 244]); sfx.plink(4); }
      else { if (H[Math.round(gy) * G + Math.round(gx)] < .5) { sfx.pop(); return; } for (let k = 0; k < 10; k++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R * 1.5; lump(gx + Math.cos(a) * d, gy + Math.sin(a) * d, 1.4 * SC, BEADS[k % BEADS.length], .8); } sfx.plink(3); }
      const p = this.screenOf(gx, gy); this.fx.burst(p.x, p.y, 6, { colors: ['#fff', '#ffd54a', '#ff8aa3'], speed: 120, g: 140, life: .5, size: 4, shape: 'star' });
    }
    screenOf(gx, gy) { return { x: this.board.x + gx * this.cs, y: this.board.y + gy * this.cs }; }

    /* ---------------------------------------------------------------- the hand: pick a whole piece up and move it */
    pickUp(s, gx, gy) {
      const H = this.H, C = this.C; let sx = Math.round(gx), sy = Math.round(gy), best = -1;
      for (let r = 0; r <= 5 * SC && best < 0; r++) for (let y = sy - r; y <= sy + r && best < 0; y++) for (let x = sx - r; x <= sx + r; x++) { if (x < 0 || y < 0 || x >= G || y >= G) continue; if (H[y * G + x] > .35) { best = y * G + x; break; } }
      if (best < 0) return false;
      const seen = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0; q[qt++] = best; seen[best] = 1;
      while (qh < qt) {
        const i = q[qh++], x = i % G, y = (i / G) | 0;
        if (x > 0 && !seen[i - 1] && H[i - 1] > .02) { seen[i - 1] = 1; q[qt++] = i - 1; } if (x < G - 1 && !seen[i + 1] && H[i + 1] > .02) { seen[i + 1] = 1; q[qt++] = i + 1; }
        if (y > 0 && !seen[i - G] && H[i - G] > .02) { seen[i - G] = 1; q[qt++] = i - G; } if (y < G - 1 && !seen[i + G] && H[i + G] > .02) { seen[i + G] = 1; q[qt++] = i + G; }
      }
      this.pushUndo();
      const idx = q.slice(0, qt), h = new Float32Array(qt), c = new Uint8Array(qt * 3); let minX = G, maxX = 0, minY = G, maxY = 0;
      for (let k = 0; k < qt; k++) { const i = idx[k], x = i % G, y = (i / G) | 0; h[k] = H[i]; c[k * 3] = C[i * 3]; c[k * 3 + 1] = C[i * 3 + 1]; c[k * 3 + 2] = C[i * 3 + 2]; H[i] = 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      // the clay that is left behind (some of the board's own cells can be just under the rim of the piece): keep a copy to put things back on
      s.held = { idx, h, c, minX, maxX, minY, maxY, bgH: H.slice(), bgC: C.slice(), ox: 0, oy: 0, sx: gx, sy: gy };
      this.compose(s.held, 1.4); sfx.pop(); return true;
    }
    compose(p, lift) {
      const H = this.H, C = this.C; H.set(p.bgH); C.set(p.bgC);
      for (let k = 0; k < p.idx.length; k++) {
        const i = p.idx[k], x = (i % G) + p.ox, y = ((i / G) | 0) + p.oy; if (x < 0 || y < 0 || x >= G || y >= G) continue;
        const j = y * G + x, tg = Math.min(MAXH, p.bgH[j] * .55 + p.h[k] + lift); if (tg >= H[j]) { H[j] = tg; C[j * 3] = p.c[k * 3]; C[j * 3 + 1] = p.c[k * 3 + 1]; C[j * 3 + 2] = p.c[k * 3 + 2]; }
      }
    }
    moveHeld(s, gx, gy) {
      const p = s.held; if (!p) return;
      p.ox = clamp(Math.round(gx - p.sx), -p.minX, G - 1 - p.maxX); p.oy = clamp(Math.round(gy - p.sy), -p.minY, G - 1 - p.maxY);
      this.compose(p, 1.4);
    }
    dropHeld(s) { const p = s.held; if (!p) return; this.compose(p, 0); sfx.pop(); }

    /* ---------------------------------------------------------------- her album of clay pictures */
    async openAlbum() {
      const pid = this.pid(); if (!pid || !SPG.photos) return; this.album = { list: [], page: 0, view: -1, busy: true }; this.menu = null;
      const rows = await SPG.photos.list(pid, 'clay'), A = this.album; if (this.album !== A) return;
      for (const r of rows) { try { const bm = await createImageBitmap(r.blob); A.list.push({ id: r.id, img: bm }); } catch (_) { /* skip a picture that cannot be read */ } }
      A.busy = false;
    }
    closeAlbum() { if (this.album) for (const p of this.album.list) { try { p.img.close && p.img.close(); } catch (_) { /* fine */ } } this.album = null; }
    albumLayout() {
      const w = this.w, h = this.h, pw = Math.min(w - 16, 760), ph = Math.min(h - 16, 560), x = (w - pw) / 2, y = (h - ph) / 2, cols = pw > ph * 1.2 ? 4 : 3, rows = pw > ph * 1.2 ? 3 : 4, r = Math.min(this.bs * .62, 40);
      const gx = x + 16, gy = y + r * 2 + 22, cw = (pw - 32) / cols, ch = (ph - (gy - y) - 16 - r * 1.2) / rows;
      return { x, y, pw, ph, cols, rows, per: cols * rows, r, gx, gy, cw, ch, close: { x: x + pw - r - 10, y: y + r + 10 }, prev: { x: x + pw / 2 - r * 1.6, y: y + ph - r - 8 }, next: { x: x + pw / 2 + r * 1.6, y: y + ph - r - 8 } };
    }
    albumDown(x, y) {
      const A = this.album, L = this.albumLayout(), near = (b, k = 1.1) => Math.hypot(x - b.x, y - b.y) < L.r * k;
      if (A.view >= 0) {
        const t = { x: L.x + L.r + 10, y: L.y + L.r + 10 };
        if (near(t)) { const it = A.list[A.view]; sfx.tap(); if (it && SPG.photos) SPG.photos.remove(it.id).then(() => { try { it.img.close && it.img.close(); } catch (_) { /* fine */ } A.list.splice(A.view, 1); A.view = -1; A.page = Math.min(A.page, Math.max(0, Math.ceil(A.list.length / L.per) - 1)); }); return; }
        A.view = -1; sfx.tap(); return;
      }
      if (near(L.close)) { sfx.tap(); this.closeAlbum(); return; }
      if (near(L.prev) && A.page > 0) { A.page--; sfx.tap(); return; }
      if (near(L.next) && (A.page + 1) * L.per < A.list.length) { A.page++; sfx.tap(); return; }
      const cx = Math.floor((x - L.gx) / L.cw), cy = Math.floor((y - L.gy) / L.ch), i = A.page * L.per + cy * L.cols + cx;
      if (cx >= 0 && cx < L.cols && cy >= 0 && cy < L.rows && i < A.list.length) { A.view = i; sfx.pop(); }
    }
    drawAlbum(c) {
      const A = this.album, L = this.albumLayout(); c.fillStyle = 'rgba(90,63,94,.55)'; c.fillRect(0, 0, this.w, this.h);
      c.fillStyle = '#fffaf0'; rr(c, L.x, L.y, L.pw, L.ph, 28); c.fill();
      const btn = (b, col, draw) => { c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, L.r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = L.r * .2; c.lineCap = c.lineJoin = 'round'; draw(); };
      if (A.view >= 0 && A.list[A.view]) {
        const im = A.list[A.view].img, s = Math.min(L.pw - 40, L.ph - 40);
        c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 14; c.fillStyle = '#fff'; rr(c, this.w / 2 - s / 2 - 8, this.h / 2 - s / 2 - 8, s + 16, s + 16, 16); c.fill(); c.restore(); c.drawImage(im, this.w / 2 - s / 2, this.h / 2 - s / 2, s, s);
        const t = { x: L.x + L.r + 10, y: L.y + L.r + 10 }; btn(t, '#ff8aa3', () => { c.save(); c.translate(t.x, t.y); c.scale(L.r / 20, L.r / 20); c.fillStyle = '#fff'; rr(c, -11, -8, 22, 22, 4); c.fill(); rr(c, -14, -13, 28, 4, 2); c.fill(); rr(c, -4, -17, 8, 5, 2); c.fill(); c.restore(); });
        return;
      }
      btn(L.close, '#ff8aa3', () => { c.beginPath(); c.moveTo(L.close.x - L.r * .3, L.close.y - L.r * .3); c.lineTo(L.close.x + L.r * .3, L.close.y + L.r * .3); c.moveTo(L.close.x + L.r * .3, L.close.y - L.r * .3); c.lineTo(L.close.x - L.r * .3, L.close.y + L.r * .3); c.stroke(); });
      c.save(); c.translate(L.x + L.r + 14, L.y + L.r + 10); this.icon(c, 'album', L.r * .9); c.restore();
      if (A.busy) { c.fillStyle = '#b9a3c7'; c.font = `700 ${L.r * .7}px Fredoka, system-ui`; c.textAlign = 'center'; c.fillText('...', this.w / 2, this.h / 2); return; }
      if (!A.list.length) { c.save(); c.translate(this.w / 2, this.h / 2); this.icon(c, 'camera', L.r * 1.6); c.restore(); return; }
      for (let k = 0; k < L.per; k++) {
        const i = A.page * L.per + k; if (i >= A.list.length) break; const cx = k % L.cols, cy = Math.floor(k / L.cols), s = Math.min(L.cw, L.ch) - 14, x = L.gx + cx * L.cw + (L.cw - s) / 2, y = L.gy + cy * L.ch + (L.ch - s) / 2;
        c.fillStyle = '#fff'; c.strokeStyle = '#eadbc8'; c.lineWidth = 2; rr(c, x - 4, y - 4, s + 8, s + 8, 10); c.fill(); c.stroke(); c.drawImage(A.list[i].img, x, y, s, s);
      }
      if (A.page > 0) btn(L.prev, '#59b96e', () => { c.beginPath(); c.moveTo(L.prev.x + L.r * .15, L.prev.y - L.r * .35); c.lineTo(L.prev.x - L.r * .2, L.prev.y); c.lineTo(L.prev.x + L.r * .15, L.prev.y + L.r * .35); c.stroke(); });
      if ((A.page + 1) * L.per < A.list.length) btn(L.next, '#59b96e', () => { c.beginPath(); c.moveTo(L.next.x - L.r * .15, L.next.y - L.r * .35); c.lineTo(L.next.x + L.r * .2, L.next.y); c.lineTo(L.next.x - L.r * .15, L.next.y + L.r * .35); c.stroke(); });
    }
    /* ---------------------------------------------------------------- pictures */
    snap() {
      if (this.t < this.camUntil) { sfx.oops && sfx.oops(); return; }
      this.camUntil = this.t + 3; this.flash = 1; sfx.snap(); setTimeout(() => sfx.chime(), 140);
      try {
        const S = 900, out = document.createElement('canvas'); out.width = out.height = S; const q = out.getContext('2d');
        const bg = q.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#fdf1dd'); bg.addColorStop(1, '#f7dfc0'); q.fillStyle = bg; q.fillRect(0, 0, S, S);
        this.renderBoard(q, 40, 40, S - 80, 1);
        q.fillStyle = 'rgba(90,63,94,.55)'; q.font = '700 34px Fredoka, system-ui, sans-serif'; q.textAlign = 'center'; q.fillText('Clay Corner', S / 2, S - 12);
        const small = document.createElement('canvas'); small.width = small.height = 120; small.getContext('2d').drawImage(out, 0, 0, 120, 120); this.snapA = { img: small, t: 0 };
        out.toBlob(b => { if (b && this.pid() && SPG.photos) SPG.photos.add(this.pid(), b, { game: 'clay', recipe: 'clay', name: 'Clay' }); }, 'image/jpeg', .9);
      } catch (_) { /* no picture this time */ }
    }

    /* ---------------------------------------------------------------- drawing the clay */
    // Looks: the height map is softened a little before it is lit (clay has no sharp walls), the light is soft with a cool fill from
    // the other side, the surface is matte with a faint grain, crevices and the foot of tall lumps are a little darker, and the shadows
    // are warm. Cut and rolled edges are anti-aliased from the softened shape.
    blur(src, dst, tmp) {
      for (let y = 0; y < G; y++) { const r = y * G; for (let x = 0; x < G; x++) { const a = src[r + Math.max(0, x - 2)], b2 = src[r + Math.max(0, x - 1)], c = src[r + x], d2 = src[r + Math.min(G - 1, x + 1)], e = src[r + Math.min(G - 1, x + 2)]; tmp[r + x] = (a + b2 * 4 + c * 6 + d2 * 4 + e) / 16; } }
      for (let y = 0; y < G; y++) { const r0 = Math.max(0, y - 2) * G, r1 = Math.max(0, y - 1) * G, r2 = y * G, r3 = Math.min(G - 1, y + 1) * G, r4 = Math.min(G - 1, y + 2) * G; for (let x = 0; x < G; x++) dst[r2 + x] = (tmp[r0 + x] + tmp[r1 + x] * 4 + tmp[r2 + x] * 6 + tmp[r3 + x] * 4 + tmp[r4 + x]) / 16; }
    }
    shade() {
      const H = this.H, C = this.C, d = this.imd.data, nz = this.noise;
      const Hs = this.Hs || (this.Hs = new Float32Array(N)), Hb = this.Hb || (this.Hb = new Float32Array(N)), tmp = this.tmp || (this.tmp = new Float32Array(N));
      if (!this.tex) { const tx = this.tex = new Float32Array(N), grid = (n, sd) => { const g = new Float32Array((n + 2) * (n + 2)); let q = sd; for (let i = 0; i < g.length; i++) { q = (q * 1664525 + 1013904223) >>> 0; g[i] = q / 4294967296 * 2 - 1; } return g; }, g1 = grid(Math.ceil(G / 5), 11), g2 = grid(Math.ceil(G / 13), 23), n1 = Math.ceil(G / 5) + 2, n2 = Math.ceil(G / 13) + 2;
        const samp = (g, n, st, x, y) => { const fx = x / st, fy = y / st, ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy, sx = ax * ax * (3 - 2 * ax), sy = ay * ay * (3 - 2 * ay), i = iy * n + ix; return (g[i] * (1 - sx) + g[i + 1] * sx) * (1 - sy) + (g[i + n] * (1 - sx) + g[i + n + 1] * sx) * sy; };
        for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) tx[y * G + x] = samp(g1, n1, 5, x, y) * .6 + samp(g2, n2, 13, x, y) * .4; }
      this.blur(H, Hs, tmp); this.blur(Hs, Hb, tmp); this.blur(Hb, tmp, this.tmp2 || (this.tmp2 = new Float32Array(N))); const Hw = tmp;   // Hw: a wide blur, for the soft shadows between lumps
      const tex = this.tex, TA = .42 * SC;
      const key = [-.5, -.62, .6], kl = Math.hypot(key[0], key[1], key[2]), Kx = key[0] / kl, Ky = key[1] / kl, Kz = key[2] / kl, Fx = .55, Fy = .45, Fz = .7, fl = Math.hypot(Fx, Fy, Fz);
      let hx = Kx, hy = Ky, hz = Kz + 1; const hl = Math.hypot(hx, hy, hz); hx /= hl; hy /= hl; hz /= hl;
      for (let y = 0; y < G; y++) {
        for (let x = 0; x < G; x++) {
          const i = y * G + x, o = i * 4, hs = Hs[i];
          if (hs < .1) { d[o + 3] = 0; continue; }
          const inside = H[i] >= .05;
          // colour: the clay's own, or (just outside a cut or edge) the nearest clay's
          let k = i * 3;
          if (!inside) { let best = -1, bh = 0; for (let q = 0; q < 8; q++) { const j = i + NB[q]; if (j >= 0 && j < N && H[j] > bh) { bh = H[j]; best = j; } } if (best < 0) { d[o + 3] = 0; continue; } k = best * 3; }
          const xm = x > 0 ? i - 1 : i, xp = x < G - 1 ? i + 1 : i, ym = y > 0 ? i - G : i, yp = y < G - 1 ? i + G : i, m = Math.min(1, hs * .5);
          const gx = (Hs[xp] - Hs[xm] + (tex[xp] - tex[xm]) * TA * m) * .5, gy = (Hs[yp] - Hs[ym] + (tex[yp] - tex[ym]) * TA * m) * .5;
          const nl = 1 / Math.sqrt(gx * gx * .55 + gy * gy * .55 + 1), nx = -gx * .74 * nl, ny = -gy * .74 * nl, nzv = nl;
          const d1 = Math.max(0, nx * Kx + ny * Ky + nzv * Kz), d2 = Math.max(0, (nx * Fx + ny * Fy + nzv * Fz) / fl), sp = Math.pow(Math.max(0, nx * hx + ny * hy + nzv * hz), 7) * .075;
          const ao = clamp((Hw[i] - hs) * .05, 0, .3) + (hs < 1.6 ? (1.6 - hs) * .06 : 0);
          const lit = Math.max(inside ? 0 : .62, .5 + .56 * d1 + .12 * d2 - ao + nz[i]), t = clamp((lit - .5) / .6, 0, 1);
          const rm = lit * (.9 + .14 * t), gm = lit * (.88 + .12 * t), bm = lit * (1.02 - .1 * t);
          d[o] = Math.min(255, C[k] * rm + sp * 255); d[o + 1] = Math.min(255, C[k + 1] * gm + sp * 255); d[o + 2] = Math.min(255, C[k + 2] * bm + sp * 255);
          d[o + 3] = clamp((hs - .1) / .8, 0, 1) * 255;
        }
      }
      this.imgc.putImageData(this.imd, 0, 0);
    }
    // the cutting mat and the clay (with its shadow), drawn into a square of side s at (x, y) on context c
    renderBoard(c, x, y, s, dpr) {
      c.save(); c.translate(x, y);
      const mat = c.createLinearGradient(0, 0, 0, s); mat.addColorStop(0, '#f7eedd'); mat.addColorStop(1, '#ecdcc2');
      c.fillStyle = 'rgba(80,60,40,.22)'; rr(c, 0, s * .012, s, s, s * .04); c.fill();
      c.fillStyle = mat; rr(c, 0, 0, s, s, s * .04); c.fill();
      c.save(); rr(c, 0, 0, s, s, s * .04); c.clip(); c.fillStyle = 'rgba(150,115,70,.13)'; const gap = s / 22; for (let gy = 1; gy < 22; gy++) for (let gx = 1; gx < 22; gx++) { c.beginPath(); c.arc(gx * gap, gy * gap, s * .0032, 0, TAU); c.fill(); }
      const vg = c.createRadialGradient(s / 2, s / 2, s * .35, s / 2, s / 2, s * .78); vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(120,85,40,.12)'); c.fillStyle = vg; c.fillRect(0, 0, s, s);
      c.restore(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = s * .008; rr(c, 0, 0, s, s, s * .04); c.stroke();
      if (this.shadowOK !== false) {
        try {
          for (const [blur, ox, oy, col] of [[.034, .012, .024, 'rgba(90,60,30,.26)'], [.008, .003, .006, 'rgba(60,35,15,.30)']]) { c.save(); c.shadowColor = col; c.shadowBlur = s * blur * dpr; c.shadowOffsetX = 8000 * dpr + s * ox * dpr; c.shadowOffsetY = s * oy * dpr; c.imageSmoothingEnabled = true; c.drawImage(this.img, -8000, 0, s, s); c.restore(); }
        } catch (_) { this.shadowOK = false; }
      }
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(this.img, 0, 0, s, s);
      c.restore();
    }
    refreshLayer() {
      this.shade(); const L = this.layer.width, c = this.layerc; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L, L);
      this.renderBoard(c, 0, 0, L, 1); this.dirty = false;
    }

    /* ---------------------------------------------------------------- frame */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.flash = Math.max(0, this.flash - dt * 3);
      this.update(dt); this.fx.update(dt);
      if (this.snapA) { this.snapA.t += dt; if (this.snapA.t > 1.4) this.snapA = null; }
      if (this.saveAt && this.t > this.saveAt && !this.stroke) this.save();
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      if (this.dirty) this.refreshLayer();
      const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#fdf1dd'); bg.addColorStop(1, '#f6dcbc'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 7; i++) c.fillRect(0, h * (i + .5) / 7, w, 2);
      const b = this.board; c.drawImage(this.layer, b.x, b.y, b.s, b.s);
      // a ring that shows how big the tool is, and where a cutter, stamp or bead will land
      const s = this.stroke;
      if (s) {
        const p = this.screenOf(s.gx, s.gy);
        if (s.tool === 'cutters' || s.tool === 'stamps') {
          const kind = s.tool === 'cutters' ? this.cutter : this.stamp, r = this.cutterR() * this.cs;
          c.save(); c.translate(p.x, p.y); SHAPES[kind](c, r); c.fillStyle = 'rgba(255,255,255,.28)'; c.fill(); c.setLineDash([r * .2, r * .14]); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); c.restore();
        } else if (s.tool === 'extras') { c.save(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.setLineDash([6, 5]); c.beginPath(); c.arc(p.x, p.y, this.radius() * this.cs * (this.extra === 'eye' ? .8 : .5), 0, TAU); c.stroke(); c.restore(); }
        else if (s.tool !== 'hand' && s.tool !== 'knife') { c.save(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, this.radius() * this.cs * (s.tool === 'squish' ? 1.25 : 1), 0, TAU); c.stroke(); c.strokeStyle = 'rgba(90,63,94,.35)'; c.lineWidth = 1.5; c.stroke(); c.restore(); }
      }
      this.fx.draw(c);
      for (const it of this.items) this.drawItem(c, it);
      if (this.menu) this.drawMenu(c);
      if (this.snapA) this.drawSnap(c);
      if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash * .75})`; c.fillRect(0, 0, w, h); }
      if (this.confirm) this.drawConfirm(c);
      if (this.album) this.drawAlbum(c);
    }

    /* ---------------------------------------------------------------- buttons and menus */
    drawItem(c, it) {
      const r = it.r;
      if (it.kind === 'color') {
        const col = COLORS[it.id], on = this.col === it.id;
        c.fillStyle = 'rgba(90,63,94,.2)'; c.beginPath(); c.arc(it.x, it.y + r * .14, r, 0, TAU); c.fill();
        if (col.rainbow) { const g = c.createConicGradient ? c.createConicGradient(0, it.x, it.y) : null; if (g) { for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60},80%,62%)`); c.fillStyle = g; } else c.fillStyle = '#f6a'; }
        else { const g = c.createRadialGradient(it.x - r * .35, it.y - r * .4, r * .1, it.x, it.y, r); g.addColorStop(0, css(col.c, 1.12)); g.addColorStop(1, css(col.c, .82)); c.fillStyle = g; }
        c.beginPath(); c.arc(it.x, it.y, r * (on ? 1.06 : .94), 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(it.x - r * .3, it.y - r * .42, r * .3, r * .16, -.5, 0, TAU); c.fill();
        if (on) { c.strokeStyle = '#59b96e'; c.lineWidth = Math.max(4, r * .2); c.beginPath(); c.arc(it.x, it.y, r * 1.12, 0, TAU); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, r * .08); c.beginPath(); c.arc(it.x, it.y, r * 1.2, 0, TAU); c.stroke(); }
        return;
      }
      const on = it.kind === 'tool' && this.tool === it.id, off = it.id === 'undo' && !this.undo.length;
      const pulse = it.id === 'clay' && !this.touched && this.tool === 'clay' ? 1 + Math.sin(this.t * 5) * .06 : 1;
      c.fillStyle = 'rgba(90,63,94,.2)'; c.beginPath(); c.arc(it.x, it.y + r * .14, r * pulse, 0, TAU); c.fill();
      c.fillStyle = on ? '#fff6cc' : '#fff'; c.globalAlpha = off ? .5 : 1; c.beginPath(); c.arc(it.x, it.y, r * pulse, 0, TAU); c.fill();
      if (on) { c.strokeStyle = '#59b96e'; c.lineWidth = Math.max(4, r * .16); c.stroke(); }
      c.save(); c.translate(it.x, it.y); this.icon(c, it.id, r * .72, it); c.restore(); c.globalAlpha = 1;
    }
    icon(c, id, s) {
      c.save(); c.lineCap = c.lineJoin = 'round'; const cc = css(COLORS[this.col].rainbow ? [255, 126, 182] : COLORS[this.col].c), INK = '#5a3f5e';
      const ball = (x, y, r, col) => { const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#fff8'); g.addColorStop(.25, col); g.addColorStop(1, col); c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(x - r * .3, y - r * .4, r * .32, r * .17, -.5, 0, TAU); c.fill(); };
      switch (id) {
        case 'clay': ball(-s * .2, s * .12, s * .55, cc); c.strokeStyle = cc; c.lineWidth = s * .3; c.beginPath(); c.moveTo(s * .1, -s * .45); c.bezierCurveTo(s * .5, -s * .9, s * .9, -s * .1, s * .62, s * .5); c.stroke(); break;
        case 'hand': c.fillStyle = '#ffcfa4'; rr(c, -s * .5, -s * .05, s, s * .8, s * .3); c.fill(); for (let i = 0; i < 4; i++) { rr(c, -s * .5 + i * s * .26, -s * (.75 - (i === 1 || i === 2 ? .1 : 0)), s * .22, s * .85, s * .11); c.fill(); } c.save(); c.translate(-s * .55, s * .15); c.rotate(-.8); rr(c, 0, -s * .1, s * .5, s * .22, s * .11); c.fill(); c.restore(); break;
        case 'pull': c.fillStyle = cc; c.beginPath(); c.ellipse(-s * .25, s * .2, s * .62, s * .42, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(s * .1, s * .02); c.quadraticCurveTo(s * .55, -s * .15, s * .8, -s * .55); c.quadraticCurveTo(s * .55, s * .1, s * .15, s * .45); c.fill(); c.strokeStyle = INK; c.lineWidth = s * .13; c.beginPath(); c.moveTo(s * .2, -s * .1); c.lineTo(s * .85, -s * .6); c.stroke(); break;
        case 'squish': c.fillStyle = cc; c.beginPath(); c.ellipse(0, s * .55, s * .85, s * .24, 0, 0, TAU); c.fill(); c.fillStyle = '#ffcfa4'; rr(c, -s * .55, -s * .55, s * 1.1, s * .55, s * .22); c.fill(); c.strokeStyle = INK; c.lineWidth = s * .12; c.beginPath(); c.moveTo(0, -s * .95); c.lineTo(0, -s * .62); c.moveTo(-s * .16, -s * .75); c.lineTo(0, -s * .6); c.lineTo(s * .16, -s * .75); c.stroke(); break;
        case 'roll': c.save(); c.rotate(-.35); c.fillStyle = '#e0a868'; rr(c, -s * .62, -s * .27, s * 1.24, s * .54, s * .22); c.fill(); c.fillStyle = '#f2c78e'; rr(c, -s * .62, -s * .2, s * 1.24, s * .16, s * .08); c.fill(); c.fillStyle = '#b87a40'; rr(c, -s * 1.0, -s * .1, s * .45, s * .2, s * .1); c.fill(); rr(c, s * .55, -s * .1, s * .45, s * .2, s * .1); c.fill(); c.restore(); break;
        case 'pinch': c.fillStyle = cc; c.beginPath(); c.moveTo(-s * .8, s * .6); c.quadraticCurveTo(-s * .2, s * .5, 0, -s * .7); c.quadraticCurveTo(s * .2, s * .5, s * .8, s * .6); c.closePath(); c.fill(); c.fillStyle = '#ffcfa4'; c.beginPath(); c.arc(-s * .42, -s * .35, s * .22, 0, TAU); c.arc(s * .42, -s * .35, s * .22, 0, TAU); c.fill(); break;
        case 'poke': c.fillStyle = cc; rr(c, -s * .85, s * .15, s * 1.7, s * .6, s * .2); c.fill(); c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, s * .22, s * .3, s * .1, 0, 0, TAU); c.fill(); c.fillStyle = '#ffcfa4'; rr(c, -s * .17, -s * .85, s * .34, s * 1.05, s * .17); c.fill(); break;
        case 'knife': c.save(); c.rotate(.7); c.fillStyle = '#dfe6ee'; c.beginPath(); c.moveTo(-s * .12, -s * .95); c.lineTo(s * .16, -s * .95); c.quadraticCurveTo(s * .3, -s * .2, s * .16, s * .2); c.lineTo(-s * .12, s * .2); c.closePath(); c.fill(); c.fillStyle = '#e0a060'; rr(c, -s * .16, s * .2, s * .36, s * .7, s * .14); c.fill(); c.restore(); break;
        case 'cutters': c.save(); SHAPES.star(c, s * .78); c.fillStyle = cc; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = s * .14; c.stroke(); c.strokeStyle = 'rgba(90,63,94,.5)'; c.lineWidth = s * .06; c.stroke(); c.restore(); break;
        case 'stamps': c.fillStyle = '#e0a060'; rr(c, -s * .2, -s * .85, s * .4, s * .6, s * .15); c.fill(); c.fillStyle = cc; rr(c, -s * .75, -s * .3, s * 1.5, s * .55, s * .16); c.fill(); c.save(); c.translate(0, s * .62); SHAPES.heart(c, s * .22); c.fillStyle = INK; c.fill(); c.restore(); break;
        case 'smooth': c.fillStyle = '#ffe28a'; rr(c, -s * .75, -s * .5, s * 1.5, s, s * .3); c.fill(); c.fillStyle = '#e7bd4b'; for (const [x, y] of [[-.4, -.15], [.1, .2], [.45, -.2], [-.1, -.28], [.4, .22], [-.45, .25]]) { c.beginPath(); c.arc(x * s, y * s, s * .09, 0, TAU); c.fill(); } break;
        case 'dye': c.fillStyle = cc; c.beginPath(); c.moveTo(0, -s * .9); c.quadraticCurveTo(s * .85, s * .15, s * .55, s * .55); c.quadraticCurveTo(0, s * 1.0, -s * .55, s * .55); c.quadraticCurveTo(-s * .85, s * .15, 0, -s * .9); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-s * .2, s * .1, s * .12, s * .28, .3, 0, TAU); c.fill(); break;
        case 'extras': c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = s * .1; c.beginPath(); c.arc(-s * .3, 0, s * .52, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(s * .5, s * .15, s * .38, 0, TAU); c.fill(); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(-s * .2, s * .1, s * .24, 0, TAU); c.arc(s * .5, s * .22, s * .17, 0, TAU); c.fill(); break;
        case 'size': { const rs = [.17, .27, .4]; for (let i = 0; i < 3; i++) { c.fillStyle = i === this.size ? '#59b96e' : '#d7c9e0'; c.beginPath(); c.arc((i - 1) * s * .72, 0, s * rs[i] * 1.25, 0, TAU); c.fill(); } break; }
        case 'undo': c.strokeStyle = INK; c.lineWidth = s * .2; c.beginPath(); c.arc(0, s * .1, s * .5, Math.PI * 1.1, Math.PI * 2.2); c.stroke(); c.fillStyle = INK; c.beginPath(); c.moveTo(-s * .78, -s * .35); c.lineTo(-s * .2, -s * .55); c.lineTo(-s * .45, s * .1); c.closePath(); c.fill(); break;
        case 'camera': c.fillStyle = INK; rr(c, -s * .85, -s * .5, s * 1.7, s * 1.15, s * .22); c.fill(); rr(c, -s * .3, -s * .72, s * .6, s * .3, s * .1); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, s * .08, s * .42, 0, TAU); c.fill(); c.fillStyle = '#7fd4f5'; c.beginPath(); c.arc(0, s * .08, s * .27, 0, TAU); c.fill(); break;
        case 'album': c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = s * .1; c.save(); c.rotate(-.18); rr(c, -s * .75, -s * .6, s * 1.0, s * 1.0, s * .1); c.fill(); c.stroke(); c.restore(); c.save(); c.rotate(.12); c.fillStyle = '#fff'; rr(c, -s * .2, -s * .45, s * 1.0, s * 1.0, s * .1); c.fill(); c.stroke(); c.fillStyle = '#9fd9a7'; rr(c, -s * .08, -s * .33, s * .76, s * .62, s * .06); c.fill(); c.fillStyle = cc; c.beginPath(); c.arc(s * .3, s * .02, s * .17, 0, TAU); c.fill(); c.restore(); break;
        case 'bin': c.fillStyle = '#9aa3b5'; rr(c, -s * .55, -s * .35, s * 1.1, s * 1.05, s * .18); c.fill(); rr(c, -s * .7, -s * .55, s * 1.4, s * .2, s * .1); c.fill(); rr(c, -s * .18, -s * .75, s * .36, s * .22, s * .08); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = s * .1; c.beginPath(); for (const x of [-.25, 0, .25]) { c.moveTo(x * s, -s * .15); c.lineTo(x * s, s * .5); } c.stroke(); break;
        default: break;
      }
      c.restore();
    }
    menuOptions() { return this.menu === 'cutters' ? CUTTERS : this.menu === 'stamps' ? STAMPS : this.menu === 'extras' ? EXTRAS : []; }
    menuLayout() {
      const opts = this.menuOptions(), n = opts.length, cols = n <= 4 ? n : 4, rows = Math.ceil(n / cols), os = Math.min(this.bs * 1.05, 70), pad = 10;
      const bw = cols * os + pad * 2, bh = rows * os + pad * 2, btn = this.items.find(i => i.kind === 'tool' && i.id === this.menu); if (!btn) return null;
      let x, y; if (this.wide) { x = btn.x + btn.r + 14; y = btn.y - bh / 2; } else { x = btn.x - bw / 2; y = btn.y - btn.r - bh - 10; }
      x = clamp(x, 6, this.w - bw - 6); y = clamp(y, 6, this.h - bh - 6);
      return { x, y, w: bw, h: bh, os, pad, cols, opts };
    }
    menuHit(x, y) {
      const L = this.menuLayout(); if (!L) return null; if (x < L.x || x > L.x + L.w || y < L.y || y > L.y + L.h) return null;
      const cx = Math.floor((x - L.x - L.pad) / L.os), cy = Math.floor((y - L.y - L.pad) / L.os), i = cy * L.cols + cx;
      return cx >= 0 && cx < L.cols && cy >= 0 && i < L.opts.length ? L.opts[i] : 'none';
    }
    pickOption(o) {
      sfx.tap(); if (o === 'none') return;
      if (this.menu === 'cutters') this.cutter = o; else if (this.menu === 'stamps') this.stamp = o; else if (this.menu === 'extras') this.extra = o;
      this.menu = null; voice.say('clay/' + o);
    }
    drawMenu(c) {
      const L = this.menuLayout(); if (!L) return;
      c.fillStyle = 'rgba(90,63,94,.22)'; rr(c, L.x, L.y + 5, L.w, L.h, 22); c.fill(); c.fillStyle = '#fffaf0'; rr(c, L.x, L.y, L.w, L.h, 22); c.fill();
      L.opts.forEach((o, i) => {
        const x = L.x + L.pad + (i % L.cols) * L.os + L.os / 2, y = L.y + L.pad + Math.floor(i / L.cols) * L.os + L.os / 2, r = L.os * .38;
        const cur = (this.menu === 'cutters' && this.cutter === o) || (this.menu === 'stamps' && this.stamp === o) || (this.menu === 'extras' && this.extra === o);
        if (cur) { c.fillStyle = '#e4f6e8'; c.beginPath(); c.arc(x, y, L.os * .46, 0, TAU); c.fill(); c.strokeStyle = '#59b96e'; c.lineWidth = 3; c.stroke(); }
        c.save(); c.translate(x, y);
        if (SHAPES[o]) { SHAPES[o](c, r); c.fillStyle = this.menu === 'stamps' ? '#b9a3c7' : css(COLORS[this.col].rainbow ? [255, 126, 182] : COLORS[this.col].c); c.fill(); c.strokeStyle = 'rgba(90,63,94,.45)'; c.lineWidth = 2; c.stroke(); }
        else if (o === 'eye') { c.fillStyle = '#fff'; c.strokeStyle = '#5a3f5e'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#2b2430'; c.beginPath(); c.arc(r * .2, r * .15, r * .5, 0, TAU); c.fill(); }
        else if (o === 'bead') { c.fillStyle = '#ff5a6e'; c.beginPath(); c.arc(0, 0, r * .6, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(-r * .2, -r * .2, r * .18, 0, TAU); c.fill(); }
        else if (o === 'pearl') { c.fillStyle = '#ffeaf3'; c.strokeStyle = '#e8b9cf'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * .85, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * .28, -r * .3, r * .2, 0, TAU); c.fill(); }
        else { BEADS.forEach((b, k) => { c.fillStyle = css(b); c.beginPath(); c.arc(Math.cos(k * 1.1) * r * .6, Math.sin(k * 1.1) * r * .6, r * .2, 0, TAU); c.fill(); }); }
        c.restore();
      });
    }
    confirmBtns() { const r = Math.min(this.bs * .9, 62); return { r, yes: { x: this.w / 2 - r * 1.3, y: this.h / 2 + r * .9 }, no: { x: this.w / 2 + r * 1.3, y: this.h / 2 + r * .9 } }; }
    drawConfirm(c) {
      c.fillStyle = 'rgba(90,63,94,.5)'; c.fillRect(0, 0, this.w, this.h); const b = this.confirmBtns(), w = b.r * 5.4, h = b.r * 4.2;
      c.fillStyle = '#fffaf0'; rr(c, this.w / 2 - w / 2, this.h / 2 - h / 2 - b.r * .2, w, h, 30); c.fill();
      c.save(); c.translate(this.w / 2, this.h / 2 - b.r * .85); this.icon(c, 'bin', b.r * 1.1); c.restore();
      c.fillStyle = '#59b96e'; c.beginPath(); c.arc(b.yes.x, b.yes.y, b.r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = b.r * .2; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(b.yes.x - b.r * .38, b.yes.y); c.lineTo(b.yes.x - b.r * .1, b.yes.y + b.r * .3); c.lineTo(b.yes.x + b.r * .42, b.yes.y - b.r * .3); c.stroke();
      c.fillStyle = '#ff8aa3'; c.beginPath(); c.arc(b.no.x, b.no.y, b.r, 0, TAU); c.fill(); c.beginPath(); c.moveTo(b.no.x - b.r * .3, b.no.y - b.r * .3); c.lineTo(b.no.x + b.r * .3, b.no.y + b.r * .3); c.moveTo(b.no.x + b.r * .3, b.no.y - b.r * .3); c.lineTo(b.no.x - b.r * .3, b.no.y + b.r * .3); c.stroke();
    }
    drawSnap(c) {
      const A = this.snapA, cam = this.item('act', 'camera'), u = clamp((A.t - .35) / .8, 0, 1), e = u * u * (3 - 2 * u), b = this.board;
      const sx = b.x + b.s / 2, sy = b.y + b.s / 2, x = sx + (cam.x - sx) * e, y = sy + (cam.y - sy) * e, s = b.s * .5 * (1 - e) + cam.r * 1.3 * e;
      c.save(); c.translate(x, y); c.rotate(-.06 * (1 - e)); c.globalAlpha = 1 - clamp((A.t - 1.1) / .3, 0, 1); c.fillStyle = '#fff'; rr(c, -s / 2 - 6, -s / 2 - 6, s + 12, s + 22, 8); c.fill(); c.drawImage(A.img, -s / 2, -s / 2, s, s); c.restore();
    }
  }

  /* ---------------------------------------------------------------- hub icon */
  SPG.games.push({
    id: 'clay', name: 'Clay Corner', order: 13,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff3e2'); g.addColorStop(1, '#f8dcc0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#cdeedd'; rr(c, w * .06, h * .55, w * .88, h * .38, h * .06); c.fill();
      const blob = (x, y, rx, ry, col) => {
        c.fillStyle = 'rgba(80,50,30,.22)'; c.beginPath(); c.ellipse(x + rx * .08, y + ry * .22, rx, ry * .95, 0, 0, TAU); c.fill();
        const gr = c.createRadialGradient(x - rx * .35, y - ry * .45, ry * .1, x, y, rx * 1.1); gr.addColorStop(0, css(col, 1.25)); gr.addColorStop(.55, css(col, 1)); gr.addColorStop(1, css(col, .78));
        c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(x - rx * .35, y - ry * .5, rx * .3, ry * .17, -.4, 0, TAU); c.fill();
      };
      blob(w * .3, h * .62, w * .2, h * .18, [255, 126, 182]); blob(w * .62, h * .5, w * .17, h * .17, [96, 196, 240]); blob(w * .5, h * .74, w * .22, h * .11, [255, 212, 70]);
      // a little bunny made of clay: two ears and a face on the pink lump
      blob(w * .24, h * .38, w * .05, h * .1, [255, 126, 182]); blob(w * .36, h * .38, w * .05, h * .1, [255, 126, 182]);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(w * .26, h * .6, w * .035, 0, TAU); c.arc(w * .35, h * .6, w * .035, 0, TAU); c.fill(); c.fillStyle = '#3a2f44'; c.beginPath(); c.arc(w * .265, h * .605, w * .018, 0, TAU); c.arc(w * .355, h * .605, w * .018, 0, TAU); c.fill();
      c.save(); c.translate(w * .72, h * .3); c.rotate(.5); c.fillStyle = '#e0a868'; rr(c, -w * .17, -h * .055, w * .34, h * .11, h * .05); c.fill(); c.fillStyle = '#b87a40'; rr(c, -w * .26, -h * .03, w * .1, h * .06, h * .03); c.fill(); rr(c, w * .16, -h * .03, w * .1, h * .06, h * .03); c.fill(); c.restore();
    },
    create: host => new ClayGame(host)
  });
})();
