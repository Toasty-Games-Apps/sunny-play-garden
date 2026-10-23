// Letter Garden: trace letters with a finger, flash cards, find-the-letter, and her own name.
(() => {
  const SPG = window.SPG;
  const { art, glyphs, voice, sfx, store } = SPG;
  const TAU = Math.PI * 2;
  const COLORS = ['#ff7a8a', '#ffa64d', '#f2c230', '#59b96e', '#4fb3e8', '#9a7be8'];
  const ALPHA = glyphs.LETTERS;
  const CONFUSABLE = { b: 'dpq', d: 'bpq', p: 'bdq', q: 'bdp', m: 'nw', n: 'mu', u: 'n', w: 'm', i: 'lj', l: 'ij', j: 'il', I: 'lJ', O: 'Q', Q: 'O', E: 'F', F: 'E' };

  const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.filter(k => k != null)); return e; };
  const icon = id => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.innerHTML = `<use href="#i-${id}"/>`; return s; };
  const btn = (cls, label, ...kids) => { const b = el('button', cls, ...kids); b.type = 'button'; b.setAttribute('aria-label', label); return b; };
  const withCase = (ch, cs) => cs === 'upper' ? ch.toUpperCase() : ch.toLowerCase();
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function paint(canvas, fn) {
    requestAnimationFrame(() => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      const c = canvas.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      fn(c, r.width, r.height);
    });
  }

  function displayName() {
    const raw = glyphs.clean(store.active?.name || '');
    if (!raw) return '';
    return raw === raw.toLowerCase() || raw === raw.toUpperCase() ? raw[0].toUpperCase() + raw.slice(1).toLowerCase() : raw;
  }

  // Draw a glyph as a pale track with dotted centre line (used for menu art and the tracer).
  function ghostGlyph(c, ch, x, y, size, upTo = 0) {
    const g = glyphs.get(ch); if (!g) return;
    const k = size / 100;
    c.save(); c.translate(x, y); c.scale(k, k); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const st of g.strokes) { c.lineWidth = 22; c.strokeStyle = 'rgba(205,188,247,.55)'; c.stroke(st.path); }
    g.strokes.forEach((st, i) => {
      c.setLineDash([.01, 9]); c.lineWidth = 4.5; c.strokeStyle = '#fff'; c.stroke(st.path); c.setLineDash([]);
      if (i < upTo) { c.lineWidth = 15; c.strokeStyle = COLORS[i % COLORS.length]; c.stroke(st.path); }
    });
    c.restore();
  }

  /* ================================================================ Tracer */
  // Tracing tolerances, in glyph units (the pale track is 24 units wide, so 12 is "on the track").
  const TOLERANCE = 12, START_RADIUS = 24, LOOKAHEAD = 12;
  class Tracer {
    constructor(host, { onStroke, onDone }) {
      this.canvas = el('canvas', 'lg-canvas'); host.append(this.canvas);
      this.c = this.canvas.getContext('2d');
      this.fx = new art.Fx();
      this.onStroke = onStroke; this.onDone = onDone;
      this.t = 0; this.running = false; this.pid = null; this.engaged = false; this.finger = null;
      const cv = this.canvas;
      cv.addEventListener('pointerdown', e => this.down(e));
      cv.addEventListener('pointermove', e => this.move(e));
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(t, e => this.up(e));
      this.resize();
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.g) this.layout();
      this.render();
    }

    setLetter(ch, strip) {
      this.ch = ch; this.g = glyphs.get(ch); this.strip = strip || null;
      this.si = 0; this.prog = 0; this.done = false; this.idle = 0; this.demoT = 0; this.miss = 0; this.hint = 0; this.pop = 0;
      this.pid = null; this.engaged = false;
      this.layout();
    }

    layout() {
      const { w, h, g } = this;
      const m = Math.min(w, h), ui = Math.max(46, Math.min(76, m * .11)), edge = Math.max(8, Math.min(14, m * .02)), arrow = Math.max(58, Math.min(92, m * .14));
      const side = w > h && h < 520;                      // landscape phone: arrows sit at the sides
      const top = this.strip ? h * .26 : ui + edge + 16;
      const bottom = side ? ui * .9 + edge : arrow + edge + 14;
      const inset = side ? arrow + edge + 12 : w * .05;
      const availH = h - top - bottom, panelW = w - inset * 2;
      const ext = g.lower ? 145 : 100;
      this.k = Math.min(availH / (ext + 26), (panelW * .9) / (g.w + 26));
      this.ox = (w - g.w * this.k) / 2;
      this.oy = top + (availH - ext * this.k) / 2;
      this.panel = { x: inset, y: Math.max(edge, top * .82), w: panelW, h: h - Math.max(edge, top * .82) - bottom * .4 };
    }

    start() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(t => this.frame(t)); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.pid = null; this.engaged = false; }
    resume() { this.start(); }
    destroy() { this.pause(); this.canvas.remove(); }

    toUnits(e) { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - this.ox) / this.k, y: (e.clientY - r.top - this.oy) / this.k, px: e.clientX - r.left, py: e.clientY - r.top }; }

    down(e) {
      if (!this.g || this.done || this.pid !== null) return;
      e.preventDefault(); this.pid = e.pointerId; try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
      const u = this.toUnits(e); this.finger = u; this.idle = 0;
      const st = this.g.strokes[this.si], p = st.pts[this.prog];
      if (dist(u, p) <= START_RADIUS) {
        this.engaged = true;
        if (glyphs.isDot(st)) this.strokeDone();
      } else {
        this.engaged = false;
        if (++this.miss >= 2) this.hint = 1.6;
        sfx.squeak();
      }
    }

    move(e) {
      if (e.pointerId !== this.pid) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const u = this.toUnits(ev), prev = this.finger || u; this.finger = u;
        this.fx.burst(u.px, u.py, 1, { colors: [COLORS[(this.si + 2) % 6], '#fff'], speed: 34, g: 0, life: .45, size: 4 });
        if (!this.engaged) continue;
        // Walk from the last finger position to this one in small steps so a quick swipe can never skip ahead.
        const n = Math.max(1, Math.ceil(dist(prev, u) / 4));
        const stepLen = dist(prev, u) / n; // progress can never run ahead of how far the finger actually moved
        for (let i = 1; i <= n && !this.done; i++) this.advance({ x: prev.x + (u.x - prev.x) * i / n, y: prev.y + (u.y - prev.y) * i / n }, Math.ceil(stepLen / 2.5) + 2);
      }
    }

    up(e) { if (e.pointerId !== this.pid) return; this.pid = null; this.engaged = false; this.finger = null; }

    // Progress only follows the finger along the path: the nearest point just ahead, and only when
    // the finger is actually on the line. Off the line, or on a neighbouring stroke, nothing happens.
    advance(u, ahead = LOOKAHEAD) {
      if (this.done) return;
      const st = this.g.strokes[this.si], pts = st.pts;
      const max = Math.min(pts.length - 1, this.prog + ahead);
      let best = -1, bd = Infinity;
      for (let j = this.prog; j <= max; j++) { const d = dist(u, pts[j]); if (d < bd) { bd = d; best = j; } }
      if (bd > TOLERANCE) return;
      if (best > this.prog) {
        if (Math.floor(best / 8) !== Math.floor(this.prog / 8)) sfx.note(Math.floor(best / 8) % 7, .08);
        this.prog = best; this.idle = 0;
      }
      if (this.prog >= pts.length - 2) this.strokeDone();
    }

    strokeDone() {
      const st = this.g.strokes[this.si], end = st.pts[st.pts.length - 1];
      this.fx.burst(this.ox + end.x * this.k, this.oy + end.y * this.k, 8, { colors: [COLORS[this.si % 6], '#fff', '#ffd54a'], speed: 150, g: 200, life: .6, size: 5, shape: 'star' });
      this.si++; this.prog = 0; this.demoT = 0; this.idle = 0; this.engaged = false; this.miss = 0;
      if (this.si >= this.g.strokes.length) {
        this.done = true; this.pid = null; this.pop = 1;
        const cx = this.ox + this.g.w * this.k / 2, cy = this.oy + 50 * this.k;
        this.fx.burst(cx, cy, 30, { colors: COLORS, speed: 420, g: 500, life: 1.2, size: 8, shape: 'confetti', up: 120 });
        this.fx.burst(cx, cy, 10, { colors: ['#ffd54a', '#fff'], speed: 320, g: 120, life: 1, size: 12, shape: 'star' });
        this.onDone && this.onDone(this.ch);
      } else { sfx.chime(); this.onStroke && this.onStroke(this.si); }
    }

    // Where the bee is: leading the finger, or demonstrating the stroke when idle.
    beePos() {
      const st = this.g.strokes[this.si]; if (!st) return null;
      const pts = st.pts;
      if (this.prog > 0 && this.idle < 3.5) return { p: pts[this.prog], demo: false };
      const from = this.prog, span = pts.length - 1 - from;
      const dur = Math.max(.9, span * 2.5 / 60), cycle = dur + .9;
      const s = this.demoT % cycle;
      if (glyphs.isDot(st)) return { p: pts[0], demo: false };
      const f = Math.min(1, s / dur), i = from + Math.round(f * span);
      return { p: pts[Math.min(i, pts.length - 1)], demo: true, f };
    }

    frame(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, .05); this.last = now;
      this.t += dt; if (this.pid === null) { this.idle += dt; this.demoT += dt; } else this.demoT = 0;
      if (this.hint > 0) this.hint -= dt;
      if (this.pop > 0) this.pop = Math.max(0, this.pop - dt * 1.2);
      this.fx.update(dt);
      this.render();
      this.raf = requestAnimationFrame(t => this.frame(t));
    }

    render() {
      const c = this.c, { w, h } = this;
      if (!w || !this.g) return;
      c.clearRect(0, 0, w, h);
      const P = this.panel;
      c.fillStyle = 'rgba(90,63,94,.1)'; art.rr(c, P.x, P.y + 10, P.w, P.h, 44); c.fill();
      c.fillStyle = 'rgba(255,255,255,.82)'; art.rr(c, P.x, P.y, P.w, P.h, 44); c.fill();

      // name strip
      if (this.strip) {
        const chars = [...this.strip.text], size = Math.min(h * .11, (w * .8) / (glyphs.measure(this.strip.text, 1, 16) || 1));
        let x = (w - glyphs.measure(this.strip.text, size, 16)) / 2; const y = h * .06;
        chars.forEach((ch, i) => {
          const g = glyphs.get(ch), lift = i === this.strip.index ? Math.sin(this.t * 5) * size * .05 : 0;
          glyphs.draw(c, ch, x, y + lift, size, { color: i < this.strip.index || (i === this.strip.index && this.done) ? COLORS[i % 6] : i === this.strip.index ? '#5a3f5e' : 'rgba(90,63,94,.25)', width: 12 });
          x += (g.w + 16) * size / 100;
        });
      }

      // writing lines
      const { ox, oy, k, g } = this;
      c.save(); c.lineCap = 'round';
      const line = (y, dash, col) => { c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(P.x + 34, oy + y * k); c.lineTo(P.x + P.w - 34, oy + y * k); c.stroke(); };
      line(100, [], 'rgba(120,150,210,.55)');
      if (g.lower) { line(45, [10, 12], 'rgba(120,150,210,.4)'); line(0, [10, 12], 'rgba(120,150,210,.28)'); } else line(0, [10, 12], 'rgba(120,150,210,.28)');
      c.restore();

      // glyph
      const bounce = this.pop ? 1 + Math.sin(this.pop * Math.PI * 3) * .05 * this.pop : 1;
      c.save(); c.translate(ox + g.w * k / 2, oy + 50 * k); c.scale(bounce, bounce); c.translate(-(ox + g.w * k / 2), -(oy + 50 * k));
      c.translate(ox, oy); c.scale(k, k); c.lineCap = 'round'; c.lineJoin = 'round';
      g.strokes.forEach((st, i) => {
        c.lineWidth = 24; c.strokeStyle = 'rgba(205,188,247,.5)'; c.stroke(st.path);
      });
      g.strokes.forEach((st, i) => {
        if (i > this.si || this.done) { /* completed strokes drawn below */ }
        if (i < this.si || this.done) { c.lineWidth = 16; c.strokeStyle = COLORS[i % 6]; c.stroke(st.path); c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke(st.path); return; }
        c.setLineDash([.01, 9]); c.lineWidth = 4.6; c.strokeStyle = i === this.si ? '#fff' : 'rgba(255,255,255,.7)'; c.stroke(st.path); c.setLineDash([]);
        if (i === this.si && this.prog > 0 && !glyphs.isDot(st)) {
          c.lineWidth = 16; c.strokeStyle = COLORS[i % 6]; c.beginPath();
          st.pts.slice(0, this.prog + 1).forEach((p, j) => j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
        }
      });
      // numbered start dots
      if (!this.done) {
        const order = g.strokes.map((_, i) => i).sort((a, b) => (a === this.si) - (b === this.si)); // active stroke's dot on top
        order.forEach(i => {
          const st = g.strokes[i];
          if (i < this.si || (i === this.si && this.prog > 0)) return;
          const p = st.pts[0], cur = i === this.si, pulse = cur ? 1 + Math.sin(this.t * 6) * .12 + (this.hint > 0 ? .25 : 0) : .8;
          c.fillStyle = cur ? COLORS[i % 6] : 'rgba(90,63,94,.3)'; c.beginPath(); c.arc(p.x, p.y, 8 * pulse, 0, TAU); c.fill();
          c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
          if (g.strokes.length > 1) { c.fillStyle = '#fff'; c.font = '700 11px Fredoka, system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), p.x, p.y + .8); }
        });
      }
      c.restore();

      // bee
      if (!this.done) {
        const b = this.beePos();
        if (b) {
          const bx = ox + b.p.x * k, by = oy + b.p.y * k - Math.sin(this.t * 7) * 4;
          c.save(); c.translate(bx, by - Math.min(w, h) * .03); const s = Math.min(w, h) * .055;
          c.fillStyle = 'rgba(90,63,94,.12)'; c.beginPath(); c.ellipse(0, s * .9, s * .5, s * .15, 0, 0, TAU); c.fill();
          art.bee(c, s, this.t, { mood: 'happy' }); c.restore();
        }
      }
      this.fx.draw(c);
    }
  }


  /* ================================================================ Practice page: one letter written over and over on handwriting lines */
  // Capital and small letters sit side by side on lines (a top line, a dashed middle line and a baseline) like a page in a writing book.
  // She traces each one in turn (or touches any of them to start there); when the whole page is done she gets a star and a fresh page of the
  // same letter, so she can keep practising as long as she likes. Nothing moves on to another letter unless she chooses to.
  class Practice {
    constructor(host, { onPage, onCell }) {
      this.canvas = el('canvas', 'lg-canvas'); host.append(this.canvas); this.c = this.canvas.getContext('2d'); this.fx = new art.Fx();
      this.onPage = onPage; this.onCell = onCell; this.t = 0; this.running = false; this.pid = null; this.engaged = false; this.cells = []; this.cur = 0; this.clearT = 0; this.pages = 0;
      const cv = this.canvas;
      cv.addEventListener('pointerdown', e => this.down(e));
      cv.addEventListener('pointermove', e => this.move(e));
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(t, e => this.up(e));
      this.resize();
    }
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.ch) this.layout();
      this.render();
    }
    setLetter(ch) { this.ch = ch.toLowerCase(); this.pages = 0; this.layout(); this.fresh(); }
    // lay the page out: rows of lines, pairs of capital + small along each row
    layout() {
      const { w, h } = this, m = Math.min(w, h), ui = Math.max(46, Math.min(76, m * .11)), edge = Math.max(8, Math.min(14, m * .02)), arrow = Math.max(58, Math.min(92, m * .14));
      const side = w > h && h < 520, top = ui + edge + 14, bottom = side ? ui * .9 + edge : arrow + edge + 16, inset = side ? arrow + edge + 12 : w * .04;
      const U = glyphs.get(this.ch.toUpperCase()), L = glyphs.get(this.ch), pairW = Math.max(U.w, L.w) * 2 + 90, rowU = 180;
      const availH = h - top - bottom, panelW = w - inset * 2;
      const rows = side ? 2 : h > w * 1.2 ? 4 : 3;
      let k = Math.min(availH / (rows * rowU), panelW / (pairW * 1.6));
      const pairs = Math.max(1, Math.floor((panelW - 40 * k) / (pairW * k)));
      const regrid = this.cells && this.cells.length && (rows !== this.rows || pairs !== this.pairs);
      this.k = k; this.rows = rows; this.pairs = pairs; this.pairW = pairW; this.rowU = rowU;
      const pageW = pairs * pairW * k, pageH = rows * rowU * k;
      this.page = { x: (w - pageW) / 2, y: top + (availH - pageH) / 2, w: pageW, h: pageH };
      this.panel = { x: this.page.x - 22, y: this.page.y - 16, w: pageW + 44, h: pageH + 32 };
      if (regrid) this.regrid(); else this.cells.forEach(cl => this.place(cl));
    }
    // the phone turned and the page now has a different number of rows or pairs: lay out a new page, keeping how many she has done
    regrid() {
      const done = Math.min(this.cells.filter(cl => cl.done).length, this.rows * this.pairs * 2 - 1);
      this.fresh();
      for (let i = 0; i < done; i++) { const cl = this.cells[i]; cl.done = true; cl.si = cl.g.strokes.length; cl.prog = 0; }
      this.cur = done; this.pid = null; this.engaged = false;
    }
    place(cl) {
      const { k, rowU, pairW } = this, P = this.page, g = cl.g, x0 = P.x + (cl.pair * pairW + (cl.up ? 0 : pairW / 2) + 0) * k, cellW = pairW / 2;
      cl.ox = x0 + (cellW - g.w) / 2 * k; cl.oy = P.y + cl.row * rowU * k + 12 * k; cl.box = { x: x0, y: P.y + cl.row * rowU * k, w: cellW * k, h: rowU * k };
    }
    fresh() {
      const U = glyphs.get(this.ch.toUpperCase()), L = glyphs.get(this.ch); this.cells = [];
      for (let r = 0; r < this.rows; r++) for (let p = 0; p < this.pairs; p++) for (const up of [true, false]) { const g = up ? U : L; const cl = { row: r, pair: p, up, g, si: 0, prog: 0, done: false, pop: 0 }; this.place(cl); this.cells.push(cl); }
      this.cur = 0; this.idle = 0; this.demoT = 0; this.miss = 0; this.hint = 0; this.allDone = false; this.clearT = 0;
    }
    start() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(t => this.frame(t)); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.pid = null; this.engaged = false; }
    resume() { this.start(); }
    destroy() { this.pause(); this.canvas.remove(); }
    pt(e) { const r = this.canvas.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
    units(e, cl) { const q = this.pt(e); return { x: (q.px - cl.ox) / this.k, y: (q.py - cl.oy) / this.k, px: q.px, py: q.py }; }
    cellAt(q) { return this.cells.findIndex(cl => q.px >= cl.box.x && q.px <= cl.box.x + cl.box.w && q.py >= cl.box.y && q.py <= cl.box.y + cl.box.h); }
    down(e) {
      if (!this.cells.length || this.pid !== null || this.allDone) return;
      e.preventDefault(); this.pid = e.pointerId; try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
      const q = this.pt(e); let i = this.cellAt(q);
      if (i >= 0 && !this.cells[i].done && i !== this.cur) { this.cur = i; this.cells[i].si = 0; this.cells[i].prog = 0; }   // touch any cell to start there
      const cl = this.cells[this.cur]; this.idle = 0; this.finger = this.units(e, cl);
      const st = cl.g.strokes[cl.si], p = st.pts[cl.prog];
      if (dist(this.finger, p) <= PG_START) { this.engaged = true; if (glyphs.isDot(st)) this.strokeDone(cl); }
      else { this.engaged = false; if (++this.miss >= 2) this.hint = 1.6; sfx.squeak(); }
    }
    move(e) {
      if (e.pointerId !== this.pid) return; e.preventDefault();
      const cl = this.cells[this.cur]; if (!cl) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const u = this.units(ev, cl), prev = this.finger || u; this.finger = u;
        this.fx.burst(u.px, u.py, 1, { colors: [COLORS[(cl.si + 2) % 6], '#fff'], speed: 34, g: 0, life: .45, size: 3 });
        if (!this.engaged || cl.done) continue;
        const n = Math.max(1, Math.ceil(dist(prev, u) / 4)), stepLen = dist(prev, u) / n;
        for (let i = 1; i <= n && !cl.done; i++) this.advance(cl, { x: prev.x + (u.x - prev.x) * i / n, y: prev.y + (u.y - prev.y) * i / n }, Math.ceil(stepLen / 2.5) + 2);
      }
    }
    up(e) { if (e.pointerId !== this.pid) return; this.pid = null; this.engaged = false; this.finger = null; }
    advance(cl, u, ahead) {
      const pts = cl.g.strokes[cl.si].pts, max = Math.min(pts.length - 1, cl.prog + ahead); let best = -1, bd = Infinity;
      for (let j = cl.prog; j <= max; j++) { const d = dist(u, pts[j]); if (d < bd) { bd = d; best = j; } }
      if (bd > PG_TOL) return;
      if (best > cl.prog) { if (Math.floor(best / 8) !== Math.floor(cl.prog / 8)) sfx.note(Math.floor(best / 8) % 7, .07); cl.prog = best; this.idle = 0; }
      if (cl.prog >= pts.length - 2) this.strokeDone(cl);
    }
    strokeDone(cl) {
      const st = cl.g.strokes[cl.si], end = st.pts[st.pts.length - 1];
      this.fx.burst(cl.ox + end.x * this.k, cl.oy + end.y * this.k, 6, { colors: [COLORS[cl.si % 6], '#fff', '#ffd54a'], speed: 120, g: 200, life: .5, size: 4, shape: 'star' });
      cl.si++; cl.prog = 0; this.demoT = 0; this.idle = 0; this.engaged = false; this.miss = 0;
      if (cl.si >= cl.g.strokes.length) {
        cl.done = true; cl.pop = 1; this.pid = null; sfx.chime();
        this.fx.burst(cl.box.x + cl.box.w / 2, cl.oy + 50 * this.k, 14, { colors: COLORS, speed: 260, g: 420, life: .9, size: 6, shape: 'confetti', up: 80 });
        this.onCell && this.onCell(cl);
        const nxt = this.cells.findIndex((c2, j) => !c2.done && j > this.cur); const any = nxt >= 0 ? nxt : this.cells.findIndex(c2 => !c2.done);
        if (any >= 0) this.cur = any; else this.pageDone();
      } else sfx.chime();
    }
    pageDone() {
      this.allDone = true; this.pages++; this.clearT = 2.2; sfx.win();
      this.fx.burst(this.w / 2, this.h * .4, 36, { colors: COLORS, speed: 460, g: 500, life: 1.3, size: 8, shape: 'confetti', up: 160 });
      this.fx.burst(this.w / 2, this.h * .4, 10, { colors: ['#ffd54a', '#fff'], speed: 320, g: 120, life: 1, size: 12, shape: 'star' });
      this.onPage && this.onPage(this.ch);
    }
    beePos() {
      const cl = this.cells[this.cur]; if (!cl || cl.done) return null; const st = cl.g.strokes[cl.si], pts = st.pts;
      if (cl.prog > 0 && this.idle < 3.5) return { cl, p: pts[cl.prog] };
      const from = cl.prog, span = pts.length - 1 - from, dur = Math.max(.9, span * 2.5 / 60), cycle = dur + .9, s = this.demoT % cycle;
      if (glyphs.isDot(st)) return { cl, p: pts[0] };
      return { cl, p: pts[Math.min(from + Math.round(Math.min(1, s / dur) * span), pts.length - 1)] };
    }
    frame(now) {
      if (!this.running) return; const dt = Math.min((now - this.last) / 1000, .05); this.last = now;
      this.t += dt; if (this.pid === null) { this.idle += dt; this.demoT += dt; } else this.demoT = 0;
      if (this.hint > 0) this.hint -= dt;
      for (const cl of this.cells) if (cl.pop > 0) cl.pop = Math.max(0, cl.pop - dt * 1.5);
      if (this.allDone && (this.clearT -= dt) <= 0) this.fresh();   // a fresh page of the same letter
      this.fx.update(dt); this.render(); this.raf = requestAnimationFrame(t => this.frame(t));
    }
    render() {
      const c = this.c, { w, h, k } = this; if (!w || !this.cells.length) return;
      c.clearRect(0, 0, w, h); const P = this.panel, G = this.page;
      c.fillStyle = 'rgba(90,63,94,.1)'; art.rr(c, P.x, P.y + 10, P.w, P.h, 34); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; art.rr(c, P.x, P.y, P.w, P.h, 34); c.fill();
      // the paper: a top line, a dashed middle line and a solid baseline for every row
      c.save(); c.lineCap = 'round';
      for (let r = 0; r < this.rows; r++) {
        const y0 = G.y + r * this.rowU * k + 12 * k, line = (y, dash, col, lw) => { c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(G.x - 8, y0 + y * k); c.lineTo(G.x + G.w + 8, y0 + y * k); c.stroke(); };
        line(0, [], 'rgba(120,150,210,.4)', 2.5); line(45, [10, 12], 'rgba(120,150,210,.5)', 2.5); line(100, [], 'rgba(220,110,130,.65)', 3.2);
      }
      c.restore();
      this.cells.forEach((cl, i) => {
        const active = i === this.cur && !this.allDone, g = cl.g, bounce = cl.pop ? 1 + Math.sin(cl.pop * Math.PI * 3) * .06 * cl.pop : 1;
        if (active) { c.fillStyle = 'rgba(255,224,102,.22)'; art.rr(c, cl.box.x + 3, cl.box.y + 2, cl.box.w - 6, cl.box.h - 4, 14 * k); c.fill(); }
        c.save(); c.translate(cl.ox + g.w * k / 2, cl.oy + 60 * k); c.scale(bounce, bounce); c.translate(-(cl.ox + g.w * k / 2), -(cl.oy + 60 * k)); c.translate(cl.ox, cl.oy); c.scale(k, k); c.lineCap = c.lineJoin = 'round';
        g.strokes.forEach(st => { c.lineWidth = 22; c.strokeStyle = cl.done ? 'rgba(205,188,247,0)' : 'rgba(205,188,247,.45)'; c.stroke(st.path); });
        g.strokes.forEach((st, si) => {
          if (si < cl.si || cl.done) { c.lineWidth = 15; c.strokeStyle = COLORS[(si + (cl.up ? 0 : 3)) % 6]; c.stroke(st.path); c.lineWidth = 4.5; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke(st.path); return; }
          c.setLineDash([.01, 9]); c.lineWidth = 4.2; c.strokeStyle = active && si === cl.si ? '#fff' : 'rgba(255,255,255,.75)'; c.stroke(st.path); c.setLineDash([]);
          if (si === cl.si && cl.prog > 0 && !glyphs.isDot(st)) { c.lineWidth = 15; c.strokeStyle = COLORS[si % 6]; c.beginPath(); st.pts.slice(0, cl.prog + 1).forEach((p, j) => j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); }
        });
        if (!cl.done && (active || cl.si === 0)) {   // the numbered start dot of the stroke to do next
          const st = cl.g.strokes[cl.si]; if (st && !(cl.prog > 0)) { const p = st.pts[0], pulse = active ? 1 + Math.sin(this.t * 6) * .12 + (this.hint > 0 ? .25 : 0) : .75; c.fillStyle = active ? COLORS[cl.si % 6] : 'rgba(90,63,94,.28)'; c.beginPath(); c.arc(p.x, p.y, 8 * pulse, 0, TAU); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke(); }
        }
        c.restore();
      });
      if (!this.allDone) { const b = this.beePos(); if (b) { const bx = b.cl.ox + b.p.x * k, by = b.cl.oy + b.p.y * k - Math.sin(this.t * 7) * 3; c.save(); c.translate(bx, by - Math.min(w, h) * .025); const sz = Math.min(w, h) * .045; c.fillStyle = 'rgba(90,63,94,.12)'; c.beginPath(); c.ellipse(0, sz * .9, sz * .5, sz * .15, 0, 0, TAU); c.fill(); art.bee(c, sz, this.t, { mood: 'happy' }); c.restore(); } }
      this.fx.draw(c);
    }
  }
  const PG_TOL = 16, PG_START = 30;   // a little more forgiving than the big single-letter tracer, because the letters are smaller on the page

  /* ================================================================ Game */
  class LettersGame {
    constructor(host) {
      this.host = host;
      this.bag = store.bag('letters', () => ({ done: {}, case: 'upper', correct: 0, seen: 0 }));
      this.root = el('div', 'lg'); host.append(this.root);
      this.timers = new Set(); this.held = []; this.tracer = null; this.paused = false; this.introCount = 0;
    }
    start() { this.menu(); }
    // a step that comes due while the game is paused (screen off, an overlay) waits and runs on resume, so a quiz never freezes half way
    later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); if (this.paused) this.held.push(fn); else fn(); }, ms); this.timers.add(id); return id; }
    reset(cls) {
      this.timers.forEach(clearTimeout); this.timers.clear(); this.held = [];
      this.tracer?.destroy(); this.tracer = null; voice.stop(); this.numRaf && cancelAnimationFrame(this.numRaf); this.numRaf = 0;
      this.root.replaceChildren(); this.root.className = 'lg ' + (cls || '');
    }
    pause() { this.paused = true; this.tracer?.pause(); }
    resume() { this.paused = false; this.tracer?.resume(); const held = this.held; this.held = []; held.forEach(fn => fn()); }
    resize() { this.tracer?.resize(); }
    destroy() { this.reset(); this.root.remove(); }
    backButton() { const b = btn('lg-back lg-btn', 'Back', icon('back')); SPG.ui.press(b, () => { sfx.tap(); this.menu(); }); return b; }
    caseChip(onChange, { key = 'case', modes = ['upper', 'lower'] } = {}) {
      const b = btn('lg-case', 'Change capital and lowercase');
      const paintChip = () => {
        const m = this.bag[key] || modes[0], inner = el('span', 'lg-case-inner');
        if (m === 'mix') inner.append(glyphs.canvas('A', 44, { color: '#5a3f5e', width: 14 }), glyphs.canvas('a', 44, { color: '#5a3f5e', width: 14 }));
        else inner.append(glyphs.canvas(m === 'upper' ? 'A' : 'a', 54, { color: '#5a3f5e', width: 14 }));
        b.replaceChildren(inner);
      };
      paintChip();
      SPG.ui.press(b, () => { const i = modes.indexOf(this.bag[key] || modes[0]); this.bag[key] = modes[(i + 1) % modes.length]; store.save(); sfx.tap(); paintChip(); onChange(); });
      return b;
    }

    // Pick a letter from `source`, avoiding the last few so the games keep mixing things up. A letter she has been missing
    // (`need`) is picked more often and may come back after three others instead of nine, so practice goes where it helps.
    pickLetter(source) {
      this.recent = this.recent || [];
      const need = l => this.need(l), last3 = this.recent.slice(-3);
      let choices = source.filter(l => !this.recent.includes(l) || (need(l) > 0 && !last3.includes(l)));
      if (!choices.length) choices = source;
      const wts = choices.map(l => 1 + need(l)); let r = Math.random() * wts.reduce((a, b) => a + b, 0), i = 0;
      while (i < choices.length - 1 && (r -= wts[i]) > 0) i++;
      const l = choices[i];
      this.recent.push(l); if (this.recent.length > 9) this.recent.shift();
      return l;
    }
    // how each letter goes in the find-it games: bag.lt[letter] = [right first time, needed another try]
    mark(l, first) { const t = this.bag.lt = this.bag.lt || {}, k = l.toLowerCase(), r = t[k] = t[k] || [0, 0]; r[first ? 0 : 1]++; }
    need(l) { const r = (this.bag.lt || {})[l.toLowerCase()]; return r ? Math.max(0, Math.min(4, r[1] * 2 - r[0] * .5)) : 0; }

    /* ---------------- menu ---------------- */
    menu() {
      this.reset('lg-menu');
      const name = displayName();
      // The six activities look like the little app icons on the games page: a bright little scene with a soft sky, hills and a
      // few friends, drawn in a square (see the .lg-mode styles).
      const sc = (c, w, h, top, bot, hillA, hillB) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, w, h);
        const gl = c.createRadialGradient(w * .78, h * .16, 0, w * .78, h * .16, w * .5); gl.addColorStop(0, 'rgba(255,255,255,.7)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gl; c.fillRect(0, 0, w, h);
        c.fillStyle = hillA; c.beginPath(); c.moveTo(0, h * .78); c.quadraticCurveTo(w * .28, h * .6, w * .62, h * .76); c.quadraticCurveTo(w * .85, h * .86, w, h * .72); c.lineTo(w, h); c.lineTo(0, h); c.fill();
        c.fillStyle = hillB; c.beginPath(); c.moveTo(0, h * .88); c.quadraticCurveTo(w * .4, h * .76, w, h * .9); c.lineTo(w, h); c.lineTo(0, h); c.fill();
        c.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, y, r] of [[.12, .12, .012], [.3, .06, .01], [.9, .4, .012], [.06, .5, .01]]) { c.beginPath(); c.arc(w * x, h * y, w * r, 0, Math.PI * 2); c.fill(); }
      };
      const card = (c, x, y, s, rot, col, shadow = true) => { c.save(); c.translate(x, y); c.rotate(rot); if (shadow) { c.fillStyle = 'rgba(90,63,94,.16)'; art.rr(c, -s * .5, -s * .62 + s * .04, s, s * 1.24, s * .12); c.fill(); } c.fillStyle = col; art.rr(c, -s * .5, -s * .62, s, s * 1.24, s * .12); c.fill(); c.restore(); };
      const head = (c, kind, x, y, r) => { c.save(); c.translate(x, y); art.avatar(c, kind, r); c.restore(); };
      const modes = [
        ['Trace', 'Trace letters', (c, w, h) => {
          sc(c, w, h, '#ffd6e4', '#ffeede', '#f7c8d6', '#f0b4c8');
          card(c, w * .5, h * .46, w * .62, -.04, '#fff');
          const s = Math.min(w, h) * .6; ghostGlyph(c, 'A', w / 2 - 30 * s / 100, h * .2, s, 1);
          c.save(); c.translate(w * .22, h * .78); c.rotate(-.7); c.fillStyle = '#ff7a8a'; art.rr(c, -w * .015, -w * .13, w * .03, w * .2, w * .01); c.fill(); c.fillStyle = '#f2c230'; c.beginPath(); c.moveTo(-w * .015, w * .07); c.lineTo(0, w * .11); c.lineTo(w * .015, w * .07); c.fill(); c.restore();
          c.save(); c.translate(w * .74, h * .24); art.bee(c, Math.min(w, h) * .1, 0); c.restore();
          art.star(c, w * .84, h * .66, w * .05, '#ffd54a', .2); art.star(c, w * .14, h * .22, w * .035, '#fff', 0);
        }, () => this.traceGrid()],
        ['Flash cards', 'Flash cards', (c, w, h) => {
          sc(c, w, h, '#ffe9b0', '#e2f5c9', '#bfe5a0', '#9fd685');
          card(c, w * .3, h * .5, w * .36, -.22, '#c9f0dc'); card(c, w * .7, h * .5, w * .36, .22, '#ffd6e4'); card(c, w * .5, h * .5, w * .46, 0, '#fff');
          glyphs.draw(c, 'B', w * .5 - w * .075, h * .27, w * .2, { color: '#ff7a8a', width: 13 });
          head(c, 'bear', w * .5, h * .66, w * .1);
          art.star(c, w * .8, h * .22, w * .05, '#ffd54a', .3); art.heart(c, w * .17, h * .24, w * .035, '#ff8aa3');
        }, () => this.cards()],
        ['Find it', 'Find the letter', (c, w, h) => {
          sc(c, w, h, '#c9f0e2', '#e6f8ee', '#a8dcb8', '#8fcfa6');
          const s = w * .24;
          [['C', .2, .74, 3], ['T', .8, .74, 5]].forEach(([ch, x, y, k]) => { card(c, w * x, h * y - s * .5, s * .8, ch === 'C' ? -.08 : .08, '#fff'); glyphs.draw(c, ch, w * x - s * .24, h * y - s * .85, s * .55, { color: COLORS[k], width: 14 }); });
          // the magnifying glass finds the little "a"
          c.save(); c.translate(w * .5, h * .42);
          c.strokeStyle = '#b9805a'; c.lineWidth = w * .05; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * .17, h * .17); c.lineTo(w * .3, h * .3); c.stroke();
          c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, 0, w * .26, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#59b96e'; c.lineWidth = w * .045; c.stroke();
          glyphs.draw(c, 'a', -w * .09, -h * .12, w * .2, { color: '#ff7a8a', width: 14 });
          c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-w * .13, -h * .15, w * .05, h * .02, -.7, 0, Math.PI * 2); c.fill();
          c.restore();
          art.star(c, w * .84, h * .2, w * .05, '#ffd54a', .2);
        }, () => this.find()],
        ['My name', 'Write my name', (c, w, h) => {
          sc(c, w, h, '#bfe3ff', '#ece4ff', '#c9bdf2', '#b3a5ea');
          // bunting across the top
          c.strokeStyle = '#8a7190'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, h * .1); c.quadraticCurveTo(w / 2, h * .26, w, h * .1); c.stroke();
          for (let i = 0; i < 7; i++) { const u = (i + .5) / 7, x = w * u, y = h * (.1 + .32 * u * (1 - u)), col = COLORS[i % 6]; c.fillStyle = col; c.beginPath(); c.moveTo(x - w * .035, y); c.lineTo(x + w * .035, y); c.lineTo(x, y + h * .07); c.closePath(); c.fill(); }
          const text = name || 'Me', unit = glyphs.measure(text, 1);
          const size = Math.min(h * .3, w * .7 / unit), tw = glyphs.measure(text, size);
          c.fillStyle = 'rgba(90,63,94,.16)'; art.rr(c, w / 2 - tw / 2 - size * .5, h * .46 - size * .4 + size * .08, tw + size, size * 1.4, size * .3); c.fill();
          c.fillStyle = '#fff'; art.rr(c, w / 2 - tw / 2 - size * .5, h * .46 - size * .4, tw + size, size * 1.4, size * .3); c.fill();
          let x = w / 2 - tw / 2, i = 0;
          for (const ch of text) { glyphs.draw(c, ch, x, h * .46 - size * .22, size, { color: COLORS[i++ % 6], width: 12 }); x += ((glyphs.get(ch)?.w ?? 30) + 10) * size / 100; }
          art.star(c, w / 2 + tw / 2 + size * .3, h * .46 - size * .4, size * .26);
          const mine = store.active && store.active.avatar; if (mine) head(c, mine, w * .5, h * .88, w * .09);
        }, () => this.nameMode()],
        ['Sounds', 'Which picture starts with the sound', (c, w, h) => {
          sc(c, w, h, '#e4d8ff', '#ffe3f1', '#d2c2f5', '#bfaaec');
          // a speaker with sound waves, and three picture cards waiting
          c.fillStyle = '#fff'; c.beginPath(); c.arc(w * .22, h * .45, w * .15, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#9a7be8'; c.beginPath(); c.moveTo(w * .15, h * .42); c.lineTo(w * .2, h * .42); c.lineTo(w * .26, h * .35); c.lineTo(w * .26, h * .55); c.lineTo(w * .2, h * .48); c.lineTo(w * .15, h * .48); c.closePath(); c.fill();
          c.strokeStyle = '#9a7be8'; c.lineWidth = w * .02; c.lineCap = 'round'; for (const r of [.05, .09]) { c.beginPath(); c.arc(w * .27, h * .45, w * r, -.9, .9); c.stroke(); }
          [['bear', .46], ['cat', .67], ['frog', .86]].forEach(([k, x], i) => { card(c, w * (x - .0), h * .56, w * .2, i === 1 ? 0 : (i - 1) * .1, '#fff'); head(c, k, w * x, h * .6, w * .075); });
          c.strokeStyle = '#59b96e'; c.lineWidth = w * .015; art.rr(c, w * .57, h * .56 - w * .2 * .62, w * .2, w * .2 * 1.24, w * .024); c.stroke();
          c.fillStyle = '#ff8aa3'; c.font = `700 ${w * .14}px Fredoka, system-ui`; c.textAlign = 'center'; c.fillText('♪', w * .34, h * .22); c.fillStyle = '#ffa64d'; c.font = `700 ${w * .1}px Fredoka, system-ui`; c.fillText('♫', w * .13, h * .26);
        }, () => this.sounds()],
        ['Match', 'Match big and little letters', (c, w, h) => {
          sc(c, w, h, '#ffd8c4', '#fff0e6', '#f7c0a4', '#f0aa8a');
          card(c, w * .3, h * .5, w * .36, -.1, '#fff'); card(c, w * .7, h * .5, w * .36, .1, '#fff');
          glyphs.draw(c, 'A', w * .3 - w * .09, h * .3, w * .22, { color: '#ff7a8a', width: 14 });
          glyphs.draw(c, 'a', w * .7 - w * .07, h * .36, w * .16, { color: '#ff7a8a', width: 14 });
          c.strokeStyle = '#fff'; c.lineWidth = w * .02; c.setLineDash([w * .02, w * .03]); c.lineCap = 'round'; c.beginPath(); c.moveTo(w * .46, h * .5); c.lineTo(w * .54, h * .5); c.stroke(); c.setLineDash([]);
          art.heart(c, w * .5, h * .5, w * .06, '#ff5c7a');
          art.star(c, w * .5, h * .18, w * .05, '#ffd54a', .2); art.star(c, w * .86, h * .82, w * .035, '#fff', 0); art.star(c, w * .12, h * .8, w * .035, '#fff', 0);
        }, () => this.match()],
        ['Numbers', 'Count and learn numbers', (c, w, h) => {
          sc(c, w, h, '#c9eefc', '#e6f9ee', '#a9dcb8', '#8fcfa6');
          card(c, w * .5, h * .44, w * .6, -.04, '#fff');
          glyphs.draw(c, '3', w * .5 - w * .075, h * .2, w * .26, { color: '#ff7a8a', width: 14 });
          for (const k of [-1, 0, 1]) { c.save(); c.translate(w * (.5 + k * .15), h * .64); art.star(c, 0, 0, w * .06, ['#ffd54a', '#ff9db8', '#7fd4f5'][k + 1], .1 * k); c.restore(); }
          head(c, 'frog', w * .17, h * .82, w * .08); head(c, 'bunny', w * .84, h * .82, w * .08);
          art.star(c, w * .86, h * .2, w * .045, '#ffd54a', .2);
        }, () => this.numbers()],
        ['Add', 'Add and take away', (c, w, h) => {
          sc(c, w, h, '#ffe0f0', '#fff0dc', '#f7c0a4', '#f0aa8a');
          card(c, w * .5, h * .46, w * .66, .03, '#fff');
          glyphs.draw(c, '2', w * .5 - w * .27, h * .27, w * .24, { color: '#4fb3e8', width: 14 });
          glyphs.draw(c, '1', w * .5 + w * .06, h * .27, w * .24, { color: '#59b96e', width: 14 });
          c.strokeStyle = '#ff7a8a'; c.lineWidth = w * .035; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * .5 - w * .05, h * .46); c.lineTo(w * .5 + w * .05, h * .46); c.moveTo(w * .5, h * .41); c.lineTo(w * .5, h * .51); c.stroke();
          art.heart(c, w * .3, h * .72, w * .05, '#ff6b81'); art.heart(c, w * .42, h * .72, w * .05, '#ff6b81'); art.heart(c, w * .66, h * .72, w * .05, '#ffd54a');
          art.star(c, w * .84, h * .16, w * .04, '#ffd54a', .2);
        }, () => this.math()]
      ];
      const grid = el('div', 'lg-modes');
      modes.forEach(([label, aria, draw, go], i) => {
        const canvas = el('canvas', 'lg-mode-art');
        const b = btn(`lg-mode m${i}`, aria, canvas, el('span', 'lg-mode-label', label));
        SPG.ui.press(b, () => { sfx.pop(); go(); });
        grid.append(b); paint(canvas, draw);
      });
      this.root.append(grid);
    }

    /* ---------------- trace: pick a letter ---------------- */
    traceGrid() {
      this.reset('lg-grid');
      const list = ALPHA.map(ch => withCase(ch, this.bag.case));
      const wrap = el('div', 'lg-tiles');
      const px = Math.round(Math.max(56, Math.min(104, Math.min(innerWidth / 9.5, innerHeight / 5.6))));
      const build = () => {
        wrap.replaceChildren(...ALPHA.map(ch => withCase(ch, this.bag.case)).map((ch, i) => {
          const done = this.bag.done[ch];
          const b = btn('lg-tile' + (done ? ' done' : ''), 'Letter ' + ch, glyphs.canvas(ch, px, { color: COLORS[i % 6], width: 13 }));
          if (done) { const f = el('canvas', 'lg-flower'); b.append(f); paint(f, (c, w, h) => { c.translate(w / 2, h / 2); for (let p = 0; p < 5; p++) { c.rotate(TAU / 5); c.fillStyle = '#ff9db8'; c.beginPath(); c.arc(0, -w * .24, w * .2, 0, TAU); c.fill(); } c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(0, 0, w * .17, 0, TAU); c.fill(); }); }
          SPG.ui.press(b, () => { sfx.pop(); if (this.bag.traceMode === 'lines') this.practice(ch); else this.trace(list, i); });
          return b;
        }));
      };
      build();
      // two ways to practise: one letter after another (it moves on by itself), or a lined page of one letter, over and over
      const mode = btn('lg-modechip', 'Change how to practise');
      const paintMode = () => {
        const lines = this.bag.traceMode === 'lines', cv = el('canvas', 'lg-modechip-art'); cv.width = 132; cv.height = 56; const c = cv.getContext('2d');
        if (lines) { c.strokeStyle = 'rgba(120,150,210,.7)'; c.lineWidth = 2; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(4, 24); c.lineTo(128, 24); c.stroke(); c.setLineDash([]); c.strokeStyle = 'rgba(220,110,130,.8)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(4, 46); c.lineTo(128, 46); c.stroke(); for (const [ch, x, col] of [['A', 6, '#ff7a8a'], ['a', 36, '#4fb3e8'], ['A', 66, '#ff7a8a'], ['a', 96, '#4fb3e8']]) { const g = glyphs.get(ch); glyphs.draw(c, ch, x, ch === 'A' ? 4 : 17, ch === 'A' ? 31 : 29, { color: col, width: 14 }); } }
        else { glyphs.draw(c, 'A', 44, 3, 50, { color: '#ff7a8a', width: 14 }); c.fillStyle = '#5a3f5e'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(100 + i * 9, 28, 3, 0, TAU); c.fill(); } art.star(c, 20, 28, 9, '#ffd54a', 0); }
        mode.replaceChildren(cv);
      };
      paintMode();
      SPG.ui.press(mode, () => { this.bag.traceMode = this.bag.traceMode === 'lines' ? 'one' : 'lines'; store.save(); sfx.tap(); paintMode(); });
      this.root.append(this.backButton(), this.caseChip(() => { list.splice(0, 26, ...ALPHA.map(ch => withCase(ch, this.bag.case))); build(); }), mode, wrap);
    }

    /* ---------------- trace: a lined practice page for one letter ---------------- */
    practice(start) {
      this.reset('lg-trace lg-practice');
      let i = Math.max(0, ALPHA.indexOf(start.toLowerCase()));
      const prev = btn('lg-btn lg-arrow left', 'Previous letter', icon('left')), next = btn('lg-btn lg-arrow right', 'Next letter', icon('right'));
      const say = btn('lg-btn lg-say big', 'Hear the letter', icon('speaker')), again = btn('lg-btn lg-again', 'New page', icon('again'));
      const back = btn('lg-back lg-btn', 'Back', icon('back'));
      this.tracer = new Practice(this.root, {
        onPage: ch => { store.addStars(1); this.bag.done[ch.toUpperCase()] = true; this.bag.done[ch] = true; store.save(); voice.say('great-job'); },
        onCell: () => {}
      });
      const go = n => { i = (n + ALPHA.length) % ALPHA.length; const ch = ALPHA[i]; this.tracer.setLetter(ch); voice.say('letter/' + ch.toLowerCase(), 'sound/' + ch.toLowerCase()); };
      SPG.ui.press(back, () => { sfx.tap(); this.traceGrid(); });
      SPG.ui.press(prev, () => { sfx.tap(); go(i - 1); }); SPG.ui.press(next, () => { sfx.tap(); go(i + 1); });
      SPG.ui.press(say, () => { const lc = ALPHA[i].toLowerCase(); voice.say('letter/' + lc, 'sound/' + lc); });
      SPG.ui.press(again, () => { sfx.whoosh(); this.tracer.fresh(); });
      this.root.append(back, say, prev, again, next);
      this.tracer.resize(); go(i); this.tracer.start();
    }

    /* ---------------- trace: one letter (or the name) ---------------- */
    trace(list, index, { name = false } = {}) {
      this.reset('lg-trace');
      let i = index;
      const prev = btn('lg-btn lg-arrow left', 'Previous letter', icon('left'));
      const next = btn('lg-btn lg-arrow right', 'Next letter', icon('right'));
      const say = btn('lg-btn lg-say', 'Hear the letter', icon('speaker'));
      const reveal = el('div', 'lg-reveal hidden');
      this.tracer = new Tracer(this.root, {
        onStroke: () => { if (name) return; },
        onDone: ch => {
          this.bag.done[ch] = true; store.save(); store.addStars(1); sfx.win();
          const lc = ch.toLowerCase();
          if (name) {
            voice.say('great-job');
            if (i < list.length - 1) this.later(() => go(i + 1), 1700);
            else { next.classList.add('wiggle'); this.later(() => this.spellName(list), 1300); }
          } else {
            voice.say('great-job', 'letter/' + lc, 'is-for', 'word/' + lc);
            const [word, emoji] = SPG.voice.WORDS[lc];
            reveal.replaceChildren(el('span', 'lg-reveal-emoji', emoji)); reveal.classList.remove('hidden');
            next.classList.add('wiggle');
          }
        }
      });
      const go = n => {
        i = (n + list.length) % list.length;
        reveal.classList.add('hidden'); next.classList.remove('wiggle');
        const ch = list[i];
        this.tracer.setLetter(ch, name ? { text: list.join(''), index: i } : null);
        const lc = ch.toLowerCase();
        if (name) voice.say(i === 0 ? 'write-name' : null, 'letter/' + lc);
        else voice.say('letter/' + lc, 'sound/' + lc, this.introCount++ < 2 ? 'follow-bee' : null);
      };
      SPG.ui.press(prev, () => { sfx.tap(); go(i - 1); });
      SPG.ui.press(next, () => { sfx.tap(); go(i + 1); });
      SPG.ui.press(say, () => { const lc = list[i].toLowerCase(); voice.say('letter/' + lc, 'sound/' + lc); });
      const nav = [this.backButton(), say];
      if (!name) nav.push(prev);
      nav.push(next);
      this.root.append(reveal, ...nav);
      this.tracer.resize(); go(i); this.tracer.start();
      if (name) prev.remove();
    }

    spellName(list) {
      const n = list.join('');
      voice.custom['pname/' + store.active.id] = n;
      voice.say('spell-name', ...list.map(ch => 'letter/' + ch.toLowerCase()), voice.LINES['name/' + n] ? 'name/' + n : 'pname/' + store.active.id);
    }

    nameMode() {
      const n = displayName();
      if (!n) { this.menu(); return; }
      this.trace([...n], 0, { name: true });
    }

    /* ---------------- flash cards ---------------- */
    cards() {
      this.reset('lg-cards');
      let i = 0, sx = null;
      const stage = el('div', 'lg-card-stage');
      const prev = btn('lg-btn lg-arrow left', 'Previous card', icon('left'));
      const next = btn('lg-btn lg-arrow right', 'Next card', icon('right'));
      const render = dir => {
        const ch = ALPHA[i], cs = this.bag.case, [word, emoji] = voice.WORDS[ch];
        const card = el('div', 'lg-card ' + (dir ? (dir > 0 ? 'in-right' : 'in-left') : 'in-pop'));
        card.style.setProperty('--hue', String((i * 14 + 330) % 360));
        const letter = btn('lg-card-letter', 'Letter ' + ch);
        letter.append(glyphs.canvas(withCase(ch, cs), Math.round(Math.min(innerHeight * .46, innerWidth * .3)), { color: COLORS[i % 6], width: 14 }));
        const pic = btn('lg-card-pic', word, el('span', 'lg-emoji', emoji));
        const wc = el('canvas', 'lg-word'); const size = Math.round(Math.min(innerHeight * .09, 56));
        const cw = Math.ceil(glyphs.measure(word, size) + size * .8), chh = Math.ceil(size * 1.5);
        const dpr = Math.min(devicePixelRatio || 1, 2);
        wc.width = cw * dpr; wc.height = chh * dpr; wc.style.width = cw + 'px'; wc.style.height = chh + 'px';
        const wctx = wc.getContext('2d'); wctx.scale(dpr, dpr);
        glyphs.drawText(wctx, word, size * .4, size * .1, size, { color: '#5a3f5e', width: 12 });
        card.append(el('div', 'lg-card-row', letter, pic), wc);
        stage.replaceChildren(card);
        const lc = ch;
        const sayAll = () => voice.say('letter/' + lc, 'sound/' + lc, 'is-for', 'word/' + lc);
        SPG.ui.press(letter, () => { sfx.pop(); voice.say('letter/' + lc, 'sound/' + lc); });
        SPG.ui.press(pic, () => { sfx.boing(); pic.classList.remove('jig'); void pic.offsetWidth; pic.classList.add('jig'); voice.say('word/' + lc); });
        this.later(sayAll, 350);
        if (++this.bag.seen % 5 === 0) { store.addStars(1); sfx.chime(); }
      };
      const go = d => { i = (i + d + 26) % 26; sfx.tap(); render(d); };
      SPG.ui.press(prev, () => go(-1)); SPG.ui.press(next, () => go(1));
      stage.addEventListener('pointerdown', e => { sx = e.clientX; });
      stage.addEventListener('pointerup', e => { if (sx != null && Math.abs(e.clientX - sx) > 70) go(e.clientX < sx ? 1 : -1); sx = null; });
      this.root.append(this.backButton(), this.caseChip(() => render(0)), stage, prev, next);
      render(0);
    }

    /* ---------------- find the letter ---------------- */
    pool() {
      const name = [...new Set(glyphs.clean(displayName()).toLowerCase())];
      return { name, all: [...ALPHA] };
    }

    find() {
      this.reset('lg-find');
      const area = el('div', 'lg-options');
      const say = btn('lg-btn lg-say big', 'Hear the letter', icon('speaker'));
      let target = null, qcase = 'upper', wrong = 0, locked = false;
      const ask = () => {
        const { name, all } = this.pool();
        const mode = this.bag.findCase || 'mix';
        qcase = mode === 'mix' ? (Math.random() < .5 ? 'upper' : 'lower') : mode;
        target = this.pickLetter(name.length && Math.random() < .3 ? name : all);
        wrong = 0; locked = false;
        const tier = SPG.level.tier('letters');
        const count = tier === 3 ? 4 : tier === 1 ? 3 : this.bag.correct >= 12 ? 4 : (this.bag.correct >= 5 && Math.random() < .4 ? 4 : 3);
        const bad = tier === 3 ? '' : CONFUSABLE[target] || '';   // older children can be shown look-alike letters
        const others = all.filter(x => x !== target && !bad.includes(x)).sort(() => Math.random() - .5);
        const choices = [target, ...others.slice(0, count - 1)].sort(() => Math.random() - .5);
        area.replaceChildren(...choices.map((ch, idx) => {
          const px = Math.round(Math.min(innerHeight * .34, innerWidth * .28));
          const b = btn('lg-opt', 'Letter ' + withCase(ch, qcase), glyphs.canvas(withCase(ch, qcase), px, { color: COLORS[(idx * 2 + 1) % 6], width: 14 }));
          b.dataset.letter = ch; b.style.setProperty('--d', idx * .12 + 's');
          SPG.ui.press(b, () => choose(ch, b));
          return b;
        }));
        say.classList.add('wiggle');
        voice.say('find', 'letter/' + target);
      };
      const choose = (ch, b) => {
        if (locked) return;
        if (ch === target) {
          locked = true; sfx.win(); store.addStars(1);
          this.bag.correct++; this.mark(target, wrong === 0); store.save();
          [...area.children].forEach(o => o.classList.toggle('fade', o !== b));
          b.classList.add('right');
          const r = b.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2);
          voice.say('great-job', 'letter/' + target, 'sound/' + target);
          this.later(ask, 2600);
        } else {
          wrong++; sfx.oops(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
          voice.say('try-again', 'letter/' + target);
          if (wrong >= 2) [...area.children].forEach(o => { if (o.dataset.letter === target) o.classList.add('hint'); });
        }
      };
      SPG.ui.press(say, () => voice.say('find', 'letter/' + target));
      this.root.append(this.backButton(), this.caseChip(ask, { key: 'findCase', modes: ['mix', 'upper', 'lower'] }), say, area);
      ask();
    }

    /* ---------------- sounds: which picture starts with the sound? ---------------- */
    sounds() {
      this.reset('lg-find');
      const area = el('div', 'lg-options');
      const say = btn('lg-btn lg-say big', 'Hear the sound', icon('speaker'));
      const NO = 'xi'; // "box" ends in x, "ice cream" starts with a long vowel: skip them here
      const same = (a, b) => a === b || ('ckq'.includes(a) && 'ckq'.includes(b));
      const shuffle = a => a.sort(() => Math.random() - .5);
      let target = null, wrong = 0, locked = false;
      const ask = () => {
        const { name, all } = this.pool();
        const okAll = all.filter(l => !NO.includes(l)), okName = name.filter(l => !NO.includes(l));
        target = this.pickLetter(okName.length && Math.random() < .3 ? okName : okAll);
        wrong = 0; locked = false;
        const picks = [];
        const nPicks = SPG.level.tier('letters') === 3 ? 3 : 2;
        for (const l of shuffle(ALPHA.filter(x => !NO.includes(x) && !same(x, target)))) { if (picks.length >= nPicks) break; if (!picks.some(p => same(p, l))) picks.push(l); }
        const choices = shuffle([target, ...picks]);
        area.replaceChildren(...choices.map((ch, idx) => {
          const [word, emoji] = voice.WORDS[ch];
          const b = btn('lg-opt', word, el('span', 'lg-emoji-opt', emoji));
          b.dataset.letter = ch; b.style.setProperty('--d', idx * .12 + 's');
          SPG.ui.press(b, () => choose(ch, b));
          return b;
        }));
        say.classList.add('wiggle');
        voice.say('starts-with', 'sound/' + target);
      };
      const choose = (ch, b) => {
        if (locked) return;
        if (ch === target) {
          locked = true; sfx.win(); store.addStars(1); this.bag.correct++; this.mark(target, wrong === 0); store.save();
          [...area.children].forEach(o => o.classList.toggle('fade', o !== b)); b.classList.add('right');
          const r = b.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2);
          voice.say('great-job', 'sound/' + target, 'word/' + target);
          this.later(ask, 3000);
        } else {
          wrong++; sfx.oops(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope');
          voice.say('try-again', 'sound/' + target);
          if (wrong >= 2) [...area.children].forEach(o => { if (o.dataset.letter === target) o.classList.add('hint'); });
        }
      };
      SPG.ui.press(say, () => voice.say('starts-with', 'sound/' + target));
      this.root.append(this.backButton(), say, area);
      ask();
    }

    /* ---------------- match: big letter with its little letter ---------------- */
    match() {
      this.reset('lg-match');
      const lt = SPG.level.tier('letters'), level = Math.max(lt === 3 ? 1 : 0, Math.min(lt === 1 ? 1 : 3, this.bag.matchLevel || 0)), pairs = 3 + level;
      const { name, all } = this.pool();
      const letters = [];
      if (name.length && Math.random() < .5) letters.push(name[Math.floor(Math.random() * name.length)]);
      while (letters.length < pairs) { const l = this.pickLetter(all); if (!letters.includes(l)) letters.push(l); }
      const cards = letters.flatMap(l => [{ l, up: true }, { l, up: false }]).sort(() => Math.random() - .5);
      const cols = innerWidth > innerHeight ? Math.ceil(cards.length / 2) : Math.min(4, Math.ceil(cards.length / 3));
      const grid = el('div', 'lg-match-grid'); grid.style.setProperty('--cols', cols);
      const px = Math.round(Math.max(90, Math.min(190, innerHeight * .26, innerWidth / (cols + .8) * .8)));
      let first = null, busy = false, found = 0;
      cards.forEach(cd => {
        const glyph = glyphs.canvas(cd.up ? cd.l.toUpperCase() : cd.l, px, { color: COLORS[ALPHA.indexOf(cd.l) % 6], width: 14 });
        const b = btn('mcard', 'Card', el('div', 'mface', el('div', 'mback', el('span', 'mstar', '★')), el('div', 'mfront', glyph)));
        cd.el = b; b.dataset.letter = cd.l;
        SPG.ui.press(b, () => {
          if (busy || b.classList.contains('up')) return;
          b.classList.add('up'); sfx.tap(); voice.say('letter/' + cd.l);
          if (!first) { first = cd; return; }
          const a = first; first = null; busy = true;
          if (a.l === cd.l) {
            this.later(() => {
              sfx.chime(); a.el.classList.add('done'); b.classList.add('done'); busy = false;
              if (++found === pairs) {
                sfx.win(); store.addStars(2); this.bag.matchLevel = Math.min(3, level + 1); store.save();
                const r = grid.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2);
                voice.say('great-job', 'you-did-it'); this.later(() => this.match(), 3600);
              }
            }, 450);
          } else {
            this.later(() => { a.el.classList.remove('up'); b.classList.remove('up'); sfx.oops(); busy = false; }, 1300);
          }
        });
        grid.append(b);
      });
      this.root.append(this.backButton(), grid);
    }

    /* ---------------- numbers: count things, then pick the number ---------------- */
    // Pictures for counting: fruit, stars, hearts and friendly faces, in neat rows of five.
    countArt(c, kind, x, y, r, t) {
      c.save(); c.translate(x, y); const k = kind.k;
      if (kind.t === 'fruit') art.fruit(c, k, r * 1.05, { mood: 'happy' });
      else if (kind.t === 'star') art.star(c, 0, 0, r * 1.15, k, 0);
      else if (kind.t === 'heart') art.heart(c, 0, 0, r * 1.05, k);
      else art.avatar(c, k, r * .95);
      c.restore();
    }
    pickKind() {
      const r = Math.random();
      return r < .3 ? { t: 'fruit', k: Math.floor(Math.random() * (art.FRUIT_COUNT || 6)) } : r < .5 ? { t: 'star', k: ['#ffd54a', '#ff9db8', '#7fd4f5', '#a6e05a'][Math.floor(Math.random() * 4)] }
        : r < .7 ? { t: 'heart', k: ['#ff6b81', '#ffa64d', '#b58cf0', '#4fb3e8'][Math.floor(Math.random() * 4)] } : { t: 'face', k: ['bunny', 'bear', 'cat', 'frog', 'panda', 'fox'][Math.floor(Math.random() * 6)] };
    }
    // positions for n pictures in rows of five (a second group of five is tinted so tens and fives can be seen)
    rowsFor(n, x, y, w, h) {
      const per = 5, rows = Math.ceil(n / per), cols = Math.min(n, per), cell = Math.min(w / cols, h / rows), out = [];
      for (let i = 0; i < n; i++) { const row = Math.floor(i / per), inRow = row === rows - 1 ? n - per * (rows - 1) : per, col = i % per; out.push({ x: x + w / 2 + (col - (inRow - 1) / 2) * cell, y: y + h / 2 + (row - (rows - 1) / 2) * cell, r: cell * .4 }); }
      return out;
    }
    // choices for a number question: the answer and a few near it
    numChoices(ans, lo, hi, count) {
      const set = new Set([ans]); const near = [ans - 1, ans + 1, ans - 2, ans + 2, ans + 3, ans - 3].filter(v => v >= lo && v <= hi && v !== ans).sort(() => Math.random() - .5);
      for (const v of near) { if (set.size >= count) break; set.add(v); }
      for (let g = 0; set.size < count && g < 50; g++) set.add(lo + Math.floor(Math.random() * (hi - lo + 1)));
      return [...set].sort(() => Math.random() - .5);
    }
    numberButtons(area, nums, color0, onPick) {
      const px = Math.round(Math.min(innerHeight * .26, innerWidth * .2, 150));
      area.replaceChildren(...nums.map((n, idx) => {
        const b = btn('lg-opt', 'Number ' + n, glyphs.numberCanvas(n, px, { color: COLORS[(idx * 2 + color0) % 6], width: 14 }));
        b.dataset.n = String(n); b.style.setProperty('--d', idx * .12 + 's');
        SPG.ui.press(b, () => onPick(n, b)); return b;
      }));
    }
    // a canvas card that repaints itself while it is on screen
    liveCard(draw) {
      const cv = el('canvas', 'lg-numcard'); this.root.append(cv);
      const frame = () => { if (!cv.isConnected) return; const r = cv.getBoundingClientRect(); if (r.width && r.height) { const dpr = SPG.ui.dpr(); if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); } const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height); draw(c, r.width, r.height, performance.now() / 1000); } this.numRaf = requestAnimationFrame(frame); };
      this.numRaf = requestAnimationFrame(frame); return cv;
    }

    numbers() {
      this.reset('lg-find lg-num');
      const tier = SPG.level.tier('numbers'), bag = this.bag, area = el('div', 'lg-options'), say = btn('lg-btn lg-say big', 'Hear the question', icon('speaker'));
      const lo = tier === 3 ? 5 : 1, hi = () => tier === 1 ? ((bag.numOk || 0) >= 8 ? 5 : 3) : tier === 2 ? ((bag.numOk || 0) >= 6 ? 10 : 6) : ((bag.numOk || 0) >= 6 ? 20 : 12);
      let N = 0, last = 0, kind = null, objs = [], counted = [], wrong = 0, locked = false, hintAt = 0;
      const card = this.liveCard((c, w, h, t) => {
        c.fillStyle = 'rgba(90,63,94,.1)'; art.rr(c, 6, 12, w - 12, h - 12, 36); c.fill(); c.fillStyle = 'rgba(255,255,255,.88)'; art.rr(c, 6, 6, w - 12, h - 14, 36); c.fill();
        objs.forEach((o, i) => {
          const done = counted[i], pop = done ? Math.max(0, 1 - (t - done)) : 0, bob = !done ? Math.sin(t * 3 + i) * o.r * .04 : 0;
          if (i >= 5 && Math.floor(i / 5) % 2 === 1) { c.fillStyle = 'rgba(205,188,247,.28)'; c.beginPath(); c.arc(o.x, o.y, o.r * 1.2, 0, TAU); c.fill(); }
          c.save(); c.globalAlpha = done ? 1 : .96; c.translate(0, bob - pop * o.r * .5); this.countArt(c, kind, o.x, o.y, o.r * (1 + pop * .25), t);
          if (done) { c.fillStyle = '#59b96e'; c.beginPath(); c.arc(o.x + o.r * .7, o.y - o.r * .8, o.r * .42, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = `700 ${o.r * .55}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(done > 0 ? counted.filter(v => v && v <= done).length : ''), o.x + o.r * .7, o.y - o.r * .78); }
          c.restore();
        });
      });
      const layout = () => { const r = card.getBoundingClientRect(); objs = this.rowsFor(N, 24, 18, Math.max(40, r.width - 48), Math.max(40, r.height - 36)); };
      const countOne = i => { if (counted[i] || locked) return; counted[i] = performance.now() / 1000; const k = counted.filter(Boolean).length; counted[i] = performance.now() / 1000; sfx.pop(); voice.say('num/' + k); };
      card.addEventListener('pointerdown', e => {
        if (locked) return; const r = card.getBoundingClientRect(); let best = -1, bd = 1e9;
        objs.forEach((o, i) => { const d = Math.hypot(e.clientX - r.left - o.x, e.clientY - r.top - o.y); if (d < o.r * 1.5 && d < bd) { bd = d; best = i; } });
        if (best >= 0) countOne(best);
      });
      const ask = () => {
        do { N = lo + Math.floor(Math.random() * (hi() - lo + 1)); } while (N === last && hi() > lo); last = N;
        kind = this.pickKind(); counted = []; wrong = 0; locked = false; layout();
        this.numberButtons(area, this.numChoices(N, 1, Math.max(hi(), N + 1), tier === 1 ? 3 : tier === 3 ? 4 : (bag.numOk || 0) >= 5 ? 4 : 3), 1, choose);
        say.classList.add('wiggle'); voice.say(this.numIntro++ < 2 ? 'count-touch' : 'count-how');
      };
      const autoCount = () => { const mine = counted; for (let i = 0; i < N; i++) this.later(() => { if (card.isConnected && counted === mine) { counted[i] = performance.now() / 1000; sfx.pop(); } }, 250 + i * 550); voice.say(...Array.from({ length: N }, (_, i) => 'num/' + (i + 1))); };
      const choose = (n, b) => {
        if (locked) return;
        if (n === N) {
          locked = true; sfx.win(); store.addStars(1); bag.numOk = (bag.numOk || 0) + 1; store.save();
          [...area.children].forEach(o => o.classList.toggle('fade', o !== b)); b.classList.add('right');
          const r = b.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2);
          voice.say('great-job', 'num/' + N); this.later(ask, 2800);
        } else {
          wrong++; sfx.oops(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); voice.say('try-again');
          if (wrong >= 2) { [...area.children].forEach(o => { if (o.dataset.n === String(N)) o.classList.add('hint'); }); if (wrong === 2) autoCount(); }
        }
      };
      SPG.ui.press(say, () => voice.say('count-how'));
      this.numIntro = this.numIntro || 0;
      this.root.append(this.backButton(), say, area); window.requestAnimationFrame(ask);
    }

    /* ---------------- add and take away ---------------- */
    math() {
      this.reset('lg-find lg-num');
      const tier = SPG.level.tier('math'), bag = this.bag, area = el('div', 'lg-options'), say = btn('lg-btn lg-say big', 'Hear the question', icon('speaker'));
      let E = null, kind = null, wrong = 0, locked = false, shown = 0;
      const ok = () => bag.mathOk || 0;
      const gen = () => {
        const R = n => 1 + Math.floor(Math.random() * n);
        if (tier === 1) { const a = R(3), b = R(Math.min(3, 5 - a)); return { op: '+', a, b, r: a + b }; }
        if (tier === 2) {
          if (Math.random() < .6) { const cap = ok() >= 5 ? 10 : 6, a = R(cap - 1), b = R(cap - a); return { op: '+', a, b, r: a + b }; }
          const a = 2 + Math.floor(Math.random() * (ok() >= 8 ? 8 : 4)), b = R(a - 1); return { op: '-', a, b, r: a - b };
        }
        if (Math.random() < .5) { const cap = ok() >= 6 ? 20 : 12, a = R(cap - 2), b = R(cap - a); return { op: '+', a, b, r: a + b }; }
        const a = 5 + Math.floor(Math.random() * (ok() >= 6 ? 16 : 8)), b = R(Math.min(a - 1, ok() >= 6 ? 12 : 6)); return { op: '-', a, b, r: a - b };
      };
      const card = this.liveCard((c, w, h, t) => {
        c.fillStyle = 'rgba(90,63,94,.1)'; art.rr(c, 6, 12, w - 12, h - 12, 36); c.fill(); c.fillStyle = 'rgba(255,255,255,.88)'; art.rr(c, 6, 6, w - 12, h - 14, 36); c.fill();
        if (!E) return;
        const pics = E.a <= 10 && E.b <= 10 && E.a + E.b <= 14 && !(tier === 3 && E.a > 8), sz = Math.min(h * .17, w * .08);
        const zone = (n, cx, tint, crossFrom) => { const bw = Math.min(w * .3, 5 * sz * 2.2), pts = this.rowsFor(n, cx - bw / 2, h * .38, bw, h * .5); pts.forEach((o, i) => { c.save(); c.translate(o.x, o.y); if (crossFrom != null && i >= crossFrom) { c.globalAlpha = .35; this.countArt(c, kind, 0, 0, o.r, t); c.globalAlpha = 1; c.strokeStyle = '#ff5a6a'; c.lineWidth = o.r * .22; c.lineCap = 'round'; c.beginPath(); c.moveTo(-o.r * .9, -o.r * .9); c.lineTo(o.r * .9, o.r * .9); c.moveTo(o.r * .9, -o.r * .9); c.lineTo(-o.r * .9, o.r * .9); c.stroke(); } else this.countArt(c, kind, 0, 0, o.r, t); c.restore(); }); };
        const num = (n, x, col) => { const k = Math.min(h * .3, w * .12) / 100; glyphs.drawText(c, String(n), x - glyphs.measure(String(n), k * 100, 10) / 2, h * .08, k * 100, { color: col, width: 13, gap: 10 }); };
        const opX = w * .5, aX = w * .24, bX = w * .72;
        const sym = (x, y, s, col, minus) => { c.strokeStyle = col; c.lineWidth = s * .28; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - s * .5, y); c.lineTo(x + s * .5, y); if (!minus) { c.moveTo(x, y - s * .5); c.lineTo(x, y + s * .5); } c.stroke(); };
        const eq = (x, y, s) => { c.strokeStyle = '#8a7190'; c.lineWidth = s * .2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - s * .45, y - s * .2); c.lineTo(x + s * .45, y - s * .2); c.moveTo(x - s * .45, y + s * .2); c.lineTo(x + s * .45, y + s * .2); c.stroke(); };
        const q = (x, y, s) => { c.fillStyle = '#9a7be8'; c.font = `700 ${s}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x, y + Math.sin(t * 4) * s * .04); };
        const s1 = Math.min(h * .12, w * .05), my = h * .22;
        if (pics) { zone(E.a, E.op === '-' ? w * .3 : aX, 0, E.op === '-' ? E.a - E.b : null); if (E.op === '+') zone(E.b, bX - w * .02, 1, null); num(E.a, E.op === '-' ? w * .3 : aX, '#4fb3e8'); num(E.b, E.op === '-' ? w * .66 : bX - w * .02, '#59b96e'); sym(E.op === '-' ? w * .5 : opX - w * .02, my + h * .06, s1, '#ff7a8a', E.op === '-'); eq(E.op === '-' ? w * .8 : w * .88, my + h * .06, s1); q(E.op === '-' ? w * .9 : w * .95, my + h * .06, h * .24); if (w < 560) { /* narrow: the same, just smaller */ } }
        else { num(E.a, w * .18, '#4fb3e8'); sym(w * .36, h * .3, s1 * 1.3, '#ff7a8a', E.op === '-'); num(E.b, w * .54, '#59b96e'); eq(w * .72, h * .3, s1 * 1.3); q(w * .86, h * .32, h * .4); }
      });
      const ask = () => {
        do { E = gen(); } while (shown && E.r === shown); shown = E.r; kind = this.pickKind(); wrong = 0; locked = false;
        const hi = Math.max(tier === 1 ? 5 : tier === 2 ? 10 : 20, E.r + 2);
        this.numberButtons(area, this.numChoices(E.r, 0, hi, tier === 1 ? 3 : 4), 3, choose);
        say.classList.add('wiggle'); this.sayExpr();
      };
      this.sayExpr = () => { if (E) voice.say('num/' + E.a, E.op === '+' ? 'math-plus' : 'math-minus', 'num/' + E.b, E.op === '+' ? 'math-sum' : 'math-left'); };
      const choose = (n, b) => {
        if (locked) return;
        if (n === E.r) {
          locked = true; sfx.win(); store.addStars(1); bag.mathOk = ok() + 1; store.save();
          [...area.children].forEach(o => o.classList.toggle('fade', o !== b)); b.classList.add('right');
          const r = b.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2);
          voice.say('great-job', 'num/' + E.a, E.op === '+' ? 'math-plus' : 'math-minus', 'num/' + E.b, 'math-is', 'num/' + E.r); this.later(ask, 4200);
        } else {
          wrong++; sfx.oops(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); voice.say('try-again');
          if (wrong >= 2) [...area.children].forEach(o => { if (o.dataset.n === String(E.r)) o.classList.add('hint'); });
        }
      };
      SPG.ui.press(say, () => this.sayExpr());
      this.root.append(this.backButton(), say, area); window.requestAnimationFrame(ask);
    }

    // Confetti as tiny DOM canvas over the whole game.
    burst(x, y) {
      const cv = el('canvas', 'lg-burst'); cv.width = innerWidth; cv.height = innerHeight; this.root.append(cv);
      const c = cv.getContext('2d'), fx = new art.Fx();
      fx.burst(x, y, 34, { colors: COLORS, speed: 460, g: 620, life: 1.3, size: 9, shape: 'confetti', up: 160 });
      fx.burst(x, y, 10, { colors: ['#ffd54a', '#fff'], speed: 300, g: 100, life: 1, size: 14, shape: 'star' });
      let last = performance.now();
      const tick = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; fx.update(dt); c.clearRect(0, 0, cv.width, cv.height); fx.draw(c); if (fx.p.length && cv.isConnected) requestAnimationFrame(tick); else cv.remove(); };
      requestAnimationFrame(tick);
    }
  }

  SPG.games.push({
    id: 'letters', name: 'Letter Garden', order: 1, dom: true,
    icon(c, w, h) {
      const s = Math.min(w, h) * .82;   // the three cards must sit fully inside the (square) tile with room round them
      [['A', -.34, '#ff7a8a', -.12], ['b', 0, '#4fb3e8', .05], ['C', .34, '#59b96e', -.06]].forEach(([ch, dx, col, rot]) => {
        c.save(); c.translate(w / 2 + dx * s, h * .52); c.rotate(rot);
        c.fillStyle = '#fff'; art.rr(c, -s * .16, -s * .28, s * .32, s * .52, s * .06); c.fill();
        const gs = s * .26, gw = glyphs.get(ch).w * gs / 100;
        glyphs.draw(c, ch, -gw / 2, -s * .18, gs, { color: col, width: 14 });
        c.restore();
      });
      c.save(); c.translate(w * .5, h * .12); art.bee(c, s * .075, 0); c.restore();
      for (const [x, y] of [[.12, .8], [.86, .78], [.3, .88], [.7, .9]]) { c.save(); c.translate(w * x, h * y); for (let p = 0; p < 5; p++) { c.rotate(TAU / 5); c.fillStyle = ['#ff9db8', '#fff', '#ffd54a'][p % 3]; c.beginPath(); c.arc(0, -s * .03, s * .026, 0, TAU); c.fill(); } c.restore(); }
    },
    create: host => new LettersGame(host)
  });
})();
