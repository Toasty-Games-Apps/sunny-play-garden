// Puzzle Pond: jigsaw puzzles made from her own coloring pictures. Drag a piece near where it belongs and it
// clicks into place (the right spot glows while she holds a piece). Nothing is ever lost: a piece dropped
// in the wrong place just stays where it is. The puzzles grow from 4 pieces to 12 as she finishes them.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u * u * (3 - 2 * u);
  const GRIDS = [[2, 2], [3, 2], [3, 3], [4, 3]];   // columns x rows

  // One edge of a jigsaw piece from (ax,ay) to (bx,by): flat when d = 0, otherwise a round knob that sticks out (d = 1) or in (d = -1).
  function edge(c, ax, ay, bx, by, d) {
    if (!d) { c.lineTo(bx, by); return; }
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = uy * d, ny = -ux * d;
    const P = (t, h) => [ax + ux * L * t + nx * L * h, ay + uy * L * t + ny * L * h];
    c.lineTo(...P(.38, 0));
    c.bezierCurveTo(...P(.38, .05), ...P(.3, .08), ...P(.32, .16));
    c.bezierCurveTo(...P(.34, .25), ...P(.66, .25), ...P(.68, .16));
    c.bezierCurveTo(...P(.7, .08), ...P(.62, .05), ...P(.62, 0));
    c.lineTo(bx, by);
  }

  class PuzzleGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('puzzle', () => ({ solved: 0 }));
      this.scenic = SPG.scenery.fader(['meadow', 'beach', 'snow', 'farm', 'sunset', 'night', 'autumn', 'city'][(this.bag.solved || 0) % 8]);   // a new place behind every puzzle
      this.bag.solved = this.bag.solved || 0;
      this.counter = SPG.ui.counter(host, (c, s) => {
        c.translate(s / 2, s / 2); c.fillStyle = '#59b96e'; art.rr(c, -s * .3, -s * .28, s * .6, s * .56, s * .08); c.fill();
        c.beginPath(); c.arc(s * .3, 0, s * .1, 0, TAU); c.arc(0, -s * .28, s * .1, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-s * .3, 0, s * .1, 0, TAU); c.fill();
      }, this.bag.solved);
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.pieces = []; this.drag = null; this.last = null;
      this.state = 'play'; this.stateT = 0; this.idle = 0;
      this.tick = this.tick.bind(this);
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* optional */ } SPG.audio.unlock(); const p = at(e); this.grab(p.x, p.y, e.pointerId); });
      cv.addEventListener('pointermove', e => { if (this.drag && this.drag.id === e.pointerId) { e.preventDefault(); const p = at(e); this.drag.x = p.x; this.drag.y = p.y; } });
      for (const n of ['pointerup', 'pointercancel']) cv.addEventListener(n, e => { if (this.drag && this.drag.id === e.pointerId) this.release(); });
    }

    /* ---------------------------------------------------------------- setting up a puzzle */
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const first = !this.w;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      if (first || !this.def) this.newPuzzle(); else this.build(true);
      this.draw();
    }
    pickPicture() {
      const all = SPG.pictures, mine = all.filter(p => SPG.coloring.hasPaint(p.id));
      const pool = (mine.length && Math.random() < .8 ? mine : all).filter(p => p !== this.def);
      return pool[Math.floor(Math.random() * pool.length)] || all[0];
    }
    // how many pieces: toddlers stop at 3 x 2, most children at 4 x 3, older children keep going up to 5 x 4
    gridFor(solved) {
      const t = SPG.level.tier('puzzle');
      if (t === 1) return GRIDS[solved < 3 ? 0 : 1];
      if (t === 3) return solved < 1 ? GRIDS[1] : solved < 3 ? GRIDS[2] : solved < 6 ? GRIDS[3] : solved < 10 ? [4, 4] : [5, 4];
      return GRIDS[solved < 2 ? 0 : solved < 5 ? 1 : solved < 9 ? 2 : 3];
    }
    // The size of the board for a grid on this screen (shared by build and the next-puzzle preparation).
    boardDims(C, R) {
      const w = this.w, h = this.h, wide = w >= h * 1.1;
      const maxW = wide ? Math.min(w * .6, h * .6 * 1.25) : w * .86, maxH = wide ? h * .64 : h * .42;
      let bw = maxW, bh = bw * .8; if (bh > maxH) { bh = maxH; bw = bh * 1.25; }
      return { bw, bh, d: Math.min(2, SPG.ui.dpr() * 1.2) };
    }
    // While she plays, the next puzzle (its picture, its piece shapes and its painted image) is made ahead of time,
    // so tapping the arrow after a puzzle starts the next one at once.
    prepareNext() {
      if (!this.w) return;
      const def = this.pickPicture(), [C, R] = this.gridFor(this.bag.solved + 1), rnd = () => (Math.random() < .5 ? 1 : -1);
      const { bw, bh, d } = this.boardDims(C, R);
      const img = document.createElement('canvas'); img.width = Math.round(bw * d); img.height = Math.round(bh * d);
      const ic = img.getContext('2d'); ic.fillStyle = '#fffdf6'; ic.fillRect(0, 0, img.width, img.height); SPG.coloring.draw(ic, def, img.width);
      this.pre = { def, cols: C, rows: R, img, w: this.w, h: this.h, hTab: Array.from({ length: R }, () => Array.from({ length: C - 1 }, rnd)), vTab: Array.from({ length: R - 1 }, () => Array.from({ length: C }, rnd)) };
    }
    newPuzzle() {
      const pre = this.pre && this.pre.w === this.w && this.pre.h === this.h && this.pre.cols === this.gridFor(this.bag.solved)[0] && this.pre.rows === this.gridFor(this.bag.solved)[1] ? this.pre : null;
      this.pre = null;
      this.def = pre ? pre.def : this.pickPicture();
      [this.cols, this.rows] = this.gridFor(this.bag.solved);
      this.state = 'play'; this.stateT = 0; this.idle = 0;
      // tabs: +1 sticks out, -1 goes in; matching neighbours agree
      const C = this.cols, R = this.rows, rnd = () => (Math.random() < .5 ? 1 : -1);
      this.hTab = pre ? pre.hTab : Array.from({ length: R }, () => Array.from({ length: C - 1 }, rnd));
      this.vTab = pre ? pre.vTab : Array.from({ length: R - 1 }, () => Array.from({ length: C }, rnd));
      this._preImg = pre ? pre.img : null;
      this.build(false);
      clearTimeout(this._pt); this._pt = setTimeout(() => { if (this.state === 'play') this.prepareNext(); }, 900);   // get the next one ready while she plays
    }
    // Lay out the board and tray for the current screen and (re)draw the picture and the pieces.
    build(keep) {
      const w = this.w, h = this.h, wide = w >= h * 1.1, C = this.cols, R = this.rows;
      const maxW = wide ? Math.min(w * .6, h * .6 * 1.25) : w * .86, maxH = wide ? h * .64 : h * .42;
      let bw = maxW, bh = bw * .8; if (bh > maxH) { bh = maxH; bw = bh * 1.25; }
      this.bw = bw; this.bh = bh; this.bx = (w - bw) / 2; this.by = wide ? h * .05 : h * .09;
      this.pw = bw / C; this.ph = bh / R; this.m = Math.min(this.pw, this.ph) * .26;
      const d = Math.min(2, SPG.ui.dpr() * 1.2); this.pd = d;
      if (this._preImg && this._preImg.width === Math.round(bw * d)) this.img = this._preImg;
      else { this.img = document.createElement('canvas'); this.img.width = Math.round(bw * d); this.img.height = Math.round(bh * d);
        const ic = this.img.getContext('2d'); ic.fillStyle = '#fffdf6'; ic.fillRect(0, 0, this.img.width, this.img.height);
        SPG.coloring.draw(ic, this.def, this.img.width); }
      this._preImg = null;
      // tray
      const tx = w * .04, tw = w * .92, ty = wide ? h * .72 : this.by + bh + h * .04, th = wide ? h * .26 : h - (this.by + bh) - h * .07;
      let ts = 0, best = 1; const n = C * R;
      for (let rows = 1; rows <= 3; rows++) { const cols = Math.ceil(n / rows), s = Math.min(1, tw / (cols * this.pw * 1.1), th / (rows * this.ph * 1.1)); if (s > ts) { ts = s; best = rows; } }
      this.ts = ts;
      const cols = Math.ceil(n / best);
      const old = keep ? this.pieces : null;
      if (!old) {
        const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - .5);
        this.pieces = order.map((idx, k) => {
          const c0 = idx % C, r0 = Math.floor(idx / C);
          return { idx, c: c0, r: r0, sc: ts, locked: false, flash: 0, x: 0, y: 0, cv: null, k };
        });
      }
      this.pieces.forEach(p => {
        p.cv = this.pieceCanvas(p);
        p.tx = this.bx + (p.c + .5) * this.pw; p.ty = this.by + (p.r + .5) * this.ph;
        const k = old ? p.k : p.k, row = Math.floor(k / cols), col = k % cols, inRow = Math.min(cols, n - row * cols);
        const homeX = tx + tw / 2 + (col - (inRow - 1) / 2) * this.pw * ts * 1.1, homeY = ty + th / 2 + (row - (best - 1) / 2) * this.ph * ts * 1.1;
        if (p.locked) { p.x = p.tx; p.y = p.ty; }
        else if (this.drag && this.drag.p === p) { p.x = clamp(p.x, this.pw * .5, w - this.pw * .5); p.y = clamp(p.y, this.ph * .5, h - this.ph * .5); }
        else { p.x = homeX; p.y = homeY; p.sc = ts; }   // after a turn of the screen loose pieces go back to the tray instead of piling up where the old layout had them
      });
    }
    drawNext(c) {
      const n = this.nextBtn(), k = 1 + Math.sin(this.t * 3) * .05, a = Math.min(1, (this.stateT - 1.2) / .6);
      c.save(); c.globalAlpha = a; c.translate(n.x, n.y); c.scale(k, k);
      c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.arc(0, n.r * .12, n.r, 0, TAU); c.fill();
      c.fillStyle = '#59b96e'; c.beginPath(); c.arc(0, 0, n.r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = n.r * .1; c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = n.r * .22; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(-n.r * .22, -n.r * .42); c.lineTo(n.r * .26, 0); c.lineTo(-n.r * .22, n.r * .42); c.stroke();
      c.restore();
    }
    // Draw the outline of piece p with its body's top-left corner at (ox, oy).
    tracePath(c, p, ox, oy) {
      const pw = this.pw, ph = this.ph, C = this.cols, R = this.rows, r = p.r, c0 = p.c, x0 = ox, y0 = oy, x1 = ox + pw, y1 = oy + ph;
      const top = r === 0 ? 0 : -this.vTab[r - 1][c0], bottom = r === R - 1 ? 0 : this.vTab[r][c0];
      const left = c0 === 0 ? 0 : -this.hTab[r][c0 - 1], right = c0 === C - 1 ? 0 : this.hTab[r][c0];
      c.beginPath(); c.moveTo(x0, y0); edge(c, x0, y0, x1, y0, top); edge(c, x1, y0, x1, y1, right); edge(c, x1, y1, x0, y1, bottom); edge(c, x0, y1, x0, y0, left); c.closePath();
    }
    pieceCanvas(p) {
      const d = this.pd, m = this.m, pw = this.pw, ph = this.ph;
      const cv = document.createElement('canvas'); cv.width = Math.ceil((pw + 2 * m) * d); cv.height = Math.ceil((ph + 2 * m) * d);
      const c = cv.getContext('2d'); c.scale(d, d);
      c.save(); this.tracePath(c, p, m, m); c.clip();
      c.drawImage(this.img, p.c * pw * d - m * d, p.r * ph * d - m * d, cv.width, cv.height, 0, 0, cv.width / d, cv.height / d);
      c.restore();
      this.tracePath(c, p, m, m); c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke();
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(90,63,94,.35)'; c.stroke();
      return cv;
    }

    /* ---------------------------------------------------------------- dragging */
    nextBtn() { const r = Math.max(42, Math.min(this.w, this.h) * .09); return { x: this.w - r * 1.6, y: this.by + this.bh / 2, r }; }
    grab(x, y, id) {
      if (this.state === 'done') { const n = this.nextBtn(); if (Math.hypot(x - n.x, y - n.y) < n.r * 1.4 && this.stateT > .8) { sfx.pop(); this.newPuzzle(); } return; }
      if (this.state !== 'play' || this.drag) return;
      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const p = this.pieces[i]; if (p.locked) continue;
        const hw = this.pw * p.sc * .62, hh = this.ph * p.sc * .62;
        if (Math.abs(x - p.x) < hw && Math.abs(y - p.y) < hh) {
          this.pieces.splice(i, 1); this.pieces.push(p);
          this.drag = { p, id, x, y, sx: x, sy: y, t0: this.t, dx: p.x - x, dy: p.y - y }; p.lift = 1; sfx.pop(); this.idle = 0; return;
        }
      }
    }
    release() {
      const d = this.drag; this.drag = null; if (!d) return;
      const p = d.p; p.lift = 0;
      if (Math.hypot(p.x - p.tx, p.y - p.ty) < Math.min(this.pw, this.ph) * .5) this.lock(p);
      else if (Math.hypot(d.x - d.sx, d.y - d.sy) < 14 && this.t - d.t0 < .5) { p.peek = 2.2; sfx.plink && sfx.plink(2); }   // a tap on a piece shows where it goes
      else { p.x = clamp(p.x, this.pw * .5, this.w - this.pw * .5); p.y = clamp(p.y, this.ph * .5, this.h - this.ph * .5); }
    }
    lock(p) {
      p.locked = true; p.sc = 1; p.x = p.tx; p.y = p.ty; p.flash = 1;
      this.pieces.splice(this.pieces.indexOf(p), 1); this.pieces.unshift(p);   // locked pieces sit underneath loose ones
      sfx.snap(); this.idle = 0;
      this.fx.burst(p.tx, p.ty, 8, { colors: ['#ffd54a', '#fff', '#7fd4f5'], speed: 150, g: 200, life: .6, size: 5 * this.ui, shape: 'star', up: 60 });
      if (this.pieces.every(q => q.locked)) this.finish();
    }
    finish() {
      this.state = 'done'; this.stateT = 0;
      this.bag.solved++; this.counter.set(this.bag.solved); store.addStars(1); store.save();
      this.scenic.set(['meadow', 'beach', 'snow', 'farm', 'sunset', 'night', 'autumn', 'city'][this.bag.solved % 8]);
      sfx.win(); voice.say('puzzle-done'); clearTimeout(this._nt); this._nt = setTimeout(() => { if (this.state === 'done' && this.running) voice.say('puzzle-next'); }, 3500);
      if (!this.pre) this.prepareNext();
      this.fx.burst(this.w / 2, this.by + this.bh / 2, 30, { colors: ['#ff6b81', '#ffd54a', '#7ed957', '#5cc8f2', '#b58cf0'], speed: 340, g: 400, life: 1.3, size: 7 * this.ui, shape: 'confetti', up: 220 });
    }

    /* ---------------------------------------------------------------- loop */
    start() { this.resize(); this.resume(); voice.say('puzzle-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); if (this.drag) { this.drag.p.lift = 0; this.drag = null; } }
    destroy() { this.pause(); clearTimeout(this._pt); clearTimeout(this._nt); this.canvas.remove(); this.counter.el.remove(); }
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.stateT += dt; this.idle += dt; this.scenic.update(dt);
      if (this.drag) { const d = this.drag; d.p.x = d.x + d.dx; d.p.y = d.y + d.dy; d.p.sc = lerp(d.p.sc, 1, Math.min(1, dt * 14)); }
      for (const p of this.pieces) { p.flash = Math.max(0, p.flash - dt * 2); if (p.peek) p.peek = Math.max(0, p.peek - dt); }
      this.fx.update(dt);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---------------------------------------------------------------- drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      this.scenic.draw(c, w, h, this.t);
      const bx = this.bx, by = this.by, bw = this.bw, bh = this.bh;
      // the board: a soft frame with the picture very faint behind, and the shape of every place
      c.fillStyle = 'rgba(90,63,94,.14)'; art.rr(c, bx - 14, by - 8, bw + 28, bh + 34, 28); c.fill();
      const fr = this.state === 'done' ? '#ffd54a' : '#fff'; c.fillStyle = fr; art.rr(c, bx - 14, by - 14, bw + 28, bh + 28, 28); c.fill();
      c.fillStyle = '#fffdf6'; c.fillRect(bx, by, bw, bh);
      c.globalAlpha = this.state === 'done' ? 1 : .2; c.drawImage(this.img, bx, by, bw, bh); c.globalAlpha = 1;
      if (this.state === 'play') {
        for (const p of this.pieces) {
          if (p.locked) continue;
          const glow = this.drag && this.drag.p === p || p.peek > 0;
          this.tracePath(c, p, p.tx - this.pw / 2, p.ty - this.ph / 2);
          if (glow) { c.fillStyle = 'rgba(255,224,102,.4)'; c.fill(); }
          c.setLineDash([9, 7]); c.strokeStyle = glow ? `rgba(255,170,30,${.75 + Math.sin(this.t * 8) * .25})` : 'rgba(90,63,94,.28)'; c.lineWidth = glow ? 5 : 2.5; c.stroke(); c.setLineDash([]);
        }
      }
      // pieces (locked ones first, loose ones on top)
      for (const p of this.pieces) {
        const lift = p.lift ? 1 : 0;
        c.save(); c.translate(p.x, p.y); c.scale(p.sc * (1 + lift * .04), p.sc * (1 + lift * .04));
        if (!p.locked) { c.shadowColor = 'rgba(60,40,70,.35)'; c.shadowBlur = lift ? 22 : 8; c.shadowOffsetY = lift ? 10 : 4; }
        if (this.state !== 'done' || !p.locked) c.drawImage(p.cv, -this.pw / 2 - this.m, -this.ph / 2 - this.m, this.pw + 2 * this.m, this.ph + 2 * this.m);
        if (p.flash > 0) { c.shadowColor = 'transparent'; c.globalAlpha = p.flash * .6; c.fillStyle = '#fff'; c.fillRect(-this.pw / 2, -this.ph / 2, this.pw, this.ph); c.globalAlpha = 1; }
        c.restore();
      }
      // tidy tray shelf under loose pieces is not drawn: they sit right on the meadow
      this.fx.draw(c);
      if (this.state === 'done' && this.stateT > 1.2) this.drawNext(c);
    }
  }

  SPG.games.push({
    id: 'puzzle', name: 'Puzzle Pond', order: 6,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d8f0ff'); g.addColorStop(1, '#e6f7ec'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const s = Math.min(w, h * 1.2), pw = s * .43, ph = pw * .8;
      const im = document.createElement('canvas'); im.width = Math.round(pw * 2 * 2); im.height = Math.round(ph * 2 * 2);
      { const q = im.getContext('2d'), W2 = im.width, H2 = im.height, sk = q.createLinearGradient(0, 0, 0, H2); sk.addColorStop(0, '#8fd3f8'); sk.addColorStop(1, '#e8f7ff'); q.fillStyle = sk; q.fillRect(0, 0, W2, H2);
        art.sun(q, W2 * .8, H2 * .22, W2 * .07, 0); art.cloud(q, W2 * .26, H2 * .24, W2 / 500, .95);
        q.fillStyle = '#9ad97f'; q.beginPath(); q.moveTo(0, H2 * .62); q.quadraticCurveTo(W2 * .4, H2 * .48, W2, H2 * .66); q.lineTo(W2, H2); q.lineTo(0, H2); q.fill();
        q.fillStyle = '#7fc46f'; q.beginPath(); q.moveTo(0, H2 * .8); q.quadraticCurveTo(W2 * .6, H2 * .68, W2, H2 * .84); q.lineTo(W2, H2); q.lineTo(0, H2); q.fill();
        for (const [fx, fy, k] of [[.3, .76, '#ff8fc0'], [.55, .86, '#ffd54a'], [.78, .74, '#fff']]) { q.fillStyle = k; for (let a = 0; a < 5; a++) { q.beginPath(); q.arc(W2 * fx + Math.cos(a * 1.257) * W2 * .028, H2 * fy + Math.sin(a * 1.257) * W2 * .028, W2 * .02, 0, 6.3); q.fill(); } q.fillStyle = '#ffe066'; q.beginPath(); q.arc(W2 * fx, H2 * fy, W2 * .015, 0, 6.3); q.fill(); } }
      const ox = w / 2 - pw, oy = h * .5 - ph;
      const cell = [[0, 0, 0, 0], [1, 0, 8, -4], [0, 1, -6, 8]];
      for (const [cx, cy, dx, dy] of cell) {
        c.save(); c.translate(ox + cx * pw + dx, oy + cy * ph + dy); c.beginPath(); art.rr(c, 0, 0, pw - 3, ph - 3, 8); c.clip();
        c.drawImage(im, cx * im.width / 2, cy * im.height / 2, im.width / 2, im.height / 2, 0, 0, pw, ph);
        c.restore(); c.strokeStyle = '#fff'; c.lineWidth = 3; art.rr(c, ox + cx * pw + dx, oy + cy * ph + dy, pw - 3, ph - 3, 8); c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,.55)'; c.setLineDash([8, 6]); c.strokeStyle = 'rgba(90,63,94,.35)'; c.lineWidth = 2;
      art.rr(c, ox + pw + 12, oy + ph + 8, pw - 3, ph - 3, 8); c.fill(); c.stroke(); c.setLineDash([]);
    },
    create: host => new PuzzleGame(host)
  });
})();
