// Shape Builder: build a picture out of coloured shapes. Every piece of the picture is a hole on the table that shows the exact shape (and, for
// the younger ones, its colour); the loose pieces wait in a tray. A piece fits only the hole that has its own shape, size and colour, and it
// really does fit: both are drawn from the same geometry, turned the same way. Drag a piece to its hole and it clicks in. A wrong piece just
// slides home. When the picture is finished it comes alive (the rocket launches, the car drives off, the house lights up) and the next one starts.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u * u * (3 - 2 * u);
  const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);

  const COL = { red: '#ff6b6b', blue: '#5aa8f0', yellow: '#ffd54a', green: '#6fcf6f', orange: '#ffa24d', purple: '#b58cf0', pink: '#ff8fc0', brown: '#b9805a', gray: '#8f96a8', white: '#ffffff' };
  const COLS = Object.keys(COL);
  const SHAPE_SAY = { rect: 'rectangle' };

  /* ---------------------------------------------------------------- shapes: one function draws both the hole and the piece */
  // Centered on (0, 0) inside a box of w x h; the caller rotates and scales.
  function shapePath(c, s, w, h) {
    const hw = w / 2, hh = h / 2; c.beginPath();
    switch (s) {
      case 'circle': case 'oval': c.ellipse(0, 0, hw, hh, 0, 0, TAU); break;
      case 'square': case 'rect': art.rr(c, -hw, -hh, w, h, Math.min(w, h) * .12); break;
      case 'triangle': c.moveTo(0, -hh); c.lineTo(hw, hh); c.lineTo(-hw, hh); c.closePath(); break;
      case 'trapezoid': c.moveTo(-hw * .6, -hh); c.lineTo(hw * .6, -hh); c.lineTo(hw, hh); c.lineTo(-hw, hh); c.closePath(); break;
      case 'diamond': c.moveTo(0, -hh); c.lineTo(hw, 0); c.lineTo(0, hh); c.lineTo(-hw, 0); c.closePath(); break;
      case 'semicircle': c.moveTo(-hw, hh); c.ellipse(0, hh, hw, h, 0, Math.PI, TAU); c.closePath(); break;
      case 'star': { const R = Math.min(hw, hh * 1.1) , oy = R * .095; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * .47 : R; c.lineTo(Math.cos(a) * q, Math.sin(a) * q + oy); } c.closePath(); break; }
      default: c.rect(-hw, -hh, w, h);
    }
  }
  // the box a part really covers once it is turned (for sizing and for keeping it on screen)
  function extent(p) { const r = (p.r || 0) * Math.PI / 180, ca = Math.abs(Math.cos(r)), sa = Math.abs(Math.sin(r)); return { w: p.w * ca + p.h * sa, h: p.w * sa + p.h * ca }; }
  const keyOf = p => [p.s, p.c, p.w, p.h, p.r || 0].join('|');

  // a piece, drawn at scale k with its centre at the current origin
  function drawPiece(c, p, k, o = {}) {
    c.save(); c.scale(k, k); c.rotate((p.r || 0) * Math.PI / 180); c.lineJoin = c.lineCap = 'round';
    const col = COL[p.c], sh = o.shadow !== false;
    if (sh) { c.save(); c.translate(1.4 / k * 1.6, 2.2 / k * 1.6); shapePath(c, p.s, p.w, p.h); c.fillStyle = 'rgba(70,50,90,.2)'; c.fill(); c.restore(); }
    shapePath(c, p.s, p.w, p.h);
    const ex = Math.max(p.w, p.h), g = c.createLinearGradient(0, -ex / 2, 0, ex / 2); g.addColorStop(0, art.shade(col, p.c === 'white' ? 0 : .14)); g.addColorStop(1, art.shade(col, p.c === 'white' ? -.1 : -.12));
    c.fillStyle = g; c.fill();
    c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,.32)'; c.beginPath(); c.ellipse(-p.w * .18, -p.h * .3, p.w * .3, p.h * .11, -.4, 0, TAU); c.fill(); c.restore();
    shapePath(c, p.s, p.w, p.h); c.lineWidth = 2.2 / k; c.strokeStyle = art.shade(col, p.c === 'white' ? -.35 : -.3); c.stroke();
    c.restore();
  }
  // the hole a piece goes into
  function drawHole(c, p, k, o) {
    c.save(); c.scale(k, k); c.rotate((p.r || 0) * Math.PI / 180); c.lineJoin = c.lineCap = 'round';
    shapePath(c, p.s, p.w, p.h);
    if (o.tint) { c.fillStyle = o.night ? 'rgba(10,12,40,.45)' : 'rgba(70,50,90,.2)'; c.fill(); c.fillStyle = COL[p.c]; c.globalAlpha = o.night ? .32 : .42; c.fill(); c.globalAlpha = 1; }
    else { c.fillStyle = o.night ? 'rgba(10,12,40,.5)' : 'rgba(70,50,90,.24)'; c.fill(); }
    // a soft inner shadow along the top-left edge, like a real hole in a board
    c.save(); c.clip(); c.lineWidth = 7 / k; c.strokeStyle = 'rgba(40,20,60,.26)'; shapePath(c, p.s, p.w, p.h); c.translate(2 / k, 3 / k); c.stroke(); c.restore();
    shapePath(c, p.s, p.w, p.h); c.setLineDash([8 / k, 6 / k]); c.lineWidth = 2.6 / k; c.strokeStyle = o.tint ? art.shade(COL[p.c], -.32) : (o.night ? 'rgba(220,225,255,.6)' : 'rgba(90,63,94,.55)'); c.stroke(); c.setLineDash([]);
    c.restore();
  }

  /* ---------------------------------------------------------------- the pictures (a 100 x 100 design box, y down)
     s shape, x y centre, w h size, r turn in degrees, c colour, l the youngest tier that has to place it (lower tiers see it already built),
     g lights up in the celebration. The order is the order they are drawn in. */
  const P = (s, x, y, w, h, c, l, extra) => Object.assign({ s, x, y, w, h, c, l }, extra || {});
  const PICS = [
    { id: 'house', cheer: { move: 'bob', lights: true, fx: ['smoke', 65, 12] }, parts: [
      P('rect', 65, 19, 8, 16, 'orange', 2), P('square', 50, 64, 46, 46, 'yellow', 1), P('triangle', 50, 27, 62, 28, 'red', 1), P('rect', 50, 75, 14, 24, 'brown', 1),
      P('square', 38, 56, 12, 12, 'blue', 2, { g: 1 }), P('square', 62, 56, 12, 12, 'blue', 2, { g: 1 }), P('circle', 50, 28, 9, 9, 'blue', 3, { g: 1 }), P('circle', 86, 14, 14, 14, 'orange', 3), P('trapezoid', 50, 93, 26, 8, 'gray', 3)] },
    { id: 'rocket', cheer: { move: 'launch', fx: ['flame', 50, 84] }, parts: [
      P('trapezoid', 50, 68, 46, 18, 'purple', 1), P('oval', 50, 46, 26, 54, 'pink', 1), P('triangle', 50, 19, 26, 20, 'red', 1), P('circle', 50, 42, 12, 12, 'blue', 2),
      P('triangle', 50, 84, 14, 18, 'orange', 2, { r: 180 }), P('star', 20, 24, 12, 12, 'yellow', 3), P('star', 82, 56, 12, 12, 'yellow', 3), P('circle', 80, 22, 12, 12, 'green', 3)] },
    { id: 'car', cheer: { move: 'drive' }, parts: [
      P('rect', 50, 88, 96, 6, 'gray', 3), P('rect', 50, 60, 72, 22, 'red', 1), P('trapezoid', 50, 41, 38, 18, 'blue', 1), P('trapezoid', 50, 42, 24, 11, 'yellow', 2),
      P('circle', 30, 74, 18, 18, 'gray', 1), P('circle', 70, 74, 18, 18, 'gray', 1), P('circle', 87, 59, 8, 8, 'yellow', 2), P('circle', 84, 16, 14, 14, 'orange', 3), P('oval', 22, 18, 26, 10, 'white', 3)] },
    { id: 'boat', cheer: { move: 'sail', fx: ['splash', 50, 86] }, parts: [
      P('semicircle', 18, 90, 18, 8, 'blue', 3), P('semicircle', 50, 91, 18, 8, 'blue', 3), P('semicircle', 82, 90, 18, 8, 'blue', 3), P('rect', 50, 44, 4, 46, 'brown', 2),
      P('triangle', 56, 42, 34, 44, 'red', 1), P('triangle', 31, 52, 20, 30, 'yellow', 1), P('trapezoid', 50, 78, 62, 20, 'brown', 1, { r: 180 }), P('triangle', 57, 15, 10, 10, 'green', 2, { r: 90 }), P('circle', 82, 18, 14, 14, 'yellow', 3)] },
    { id: 'flower', cheer: { move: 'sway', pivot: [50, 95] }, parts: [
      P('rect', 50, 72, 5, 46, 'green', 1), P('oval', 32, 66, 18, 8, 'green', 3, { r: -25 }), P('diamond', 66, 64, 12, 18, 'green', 3), P('oval', 50, 14, 14, 22, 'pink', 1), P('oval', 50, 54, 14, 22, 'orange', 2),
      P('oval', 31, 34, 14, 22, 'purple', 2, { r: 90 }), P('oval', 69, 34, 14, 22, 'red', 2, { r: 90 }), P('circle', 50, 34, 16, 16, 'yellow', 1), P('trapezoid', 50, 90, 30, 18, 'brown', 3, { r: 180 }), P('circle', 84, 22, 8, 8, 'orange', 3)] },
    { id: 'fish', cheer: { move: 'swim', fx: ['bubbles', 30, 46] }, parts: [
      P('semicircle', 76, 94, 44, 12, 'green', 3), P('triangle', 78, 50, 22, 20, 'red', 1, { r: 270 }), P('triangle', 46, 30, 16, 12, 'green', 2), P('oval', 46, 50, 44, 28, 'orange', 1), P('circle', 33, 45, 10, 10, 'white', 1),
      P('circle', 32, 45, 5, 5, 'gray', 2), P('circle', 14, 30, 7, 7, 'blue', 3), P('circle', 10, 44, 7, 7, 'blue', 3), P('circle', 18, 18, 7, 7, 'blue', 3)] },
    { id: 'snowman', cheer: { move: 'hop', fx: ['snow'] }, parts: [
      P('circle', 50, 72, 38, 38, 'white', 1), P('circle', 50, 40, 28, 28, 'white', 1), P('rect', 50, 56, 28, 6, 'red', 3), P('rect', 50, 17, 16, 14, 'gray', 2), P('rect', 50, 25, 26, 4, 'gray', 2),
      P('circle', 44, 37, 4, 4, 'gray', 2), P('circle', 56, 37, 4, 4, 'gray', 2), P('triangle', 50, 45, 6, 12, 'orange', 1, { r: 180 }), P('circle', 50, 68, 5, 5, 'blue', 3), P('circle', 50, 79, 5, 5, 'blue', 3)] },
    { id: 'castle', cheer: { move: 'bob', fx: ['fireworks'] }, parts: [
      P('rect', 50, 70, 64, 34, 'gray', 1), P('rect', 22, 60, 16, 54, 'pink', 1), P('rect', 78, 60, 16, 54, 'pink', 1), P('triangle', 22, 25, 20, 16, 'red', 2), P('triangle', 78, 25, 20, 16, 'red', 2),
      P('semicircle', 50, 79, 16, 16, 'brown', 1), P('rect', 22, 48, 6, 12, 'blue', 3), P('rect', 78, 48, 6, 12, 'blue', 3), P('rect', 50, 46, 3, 20, 'brown', 3), P('triangle', 57, 40, 12, 10, 'yellow', 3, { r: 90 })] },
    { id: 'tree', cheer: { move: 'sway', pivot: [50, 94], fx: ['leaves', 50, 30] }, parts: [
      P('semicircle', 50, 93, 90, 14, 'green', 1), P('rect', 50, 76, 12, 34, 'brown', 1), P('circle', 50, 40, 54, 54, 'green', 1), P('circle', 38, 40, 8, 8, 'red', 2), P('circle', 60, 32, 8, 8, 'red', 2),
      P('circle', 54, 52, 8, 8, 'red', 2), P('circle', 85, 14, 14, 14, 'yellow', 3), P('oval', 20, 16, 22, 9, 'white', 3), P('triangle', 78, 38, 8, 8, 'orange', 3, { r: 90 })] },
    { id: 'kite', cheer: { move: 'float', pivot: [50, 96] }, parts: [
      P('semicircle', 50, 92, 70, 16, 'green', 3), P('circle', 50, 70, 9, 9, 'yellow', 1), P('circle', 50, 82, 9, 9, 'green', 1), P('circle', 50, 94, 9, 9, 'blue', 2), P('diamond', 50, 34, 40, 52, 'red', 1),
      P('diamond', 50, 34, 18, 24, 'orange', 2), P('circle', 84, 14, 14, 14, 'yellow', 3), P('oval', 20, 20, 24, 10, 'white', 3)] },
    { id: 'icecream', cheer: { move: 'wobble', pivot: [50, 98], fx: ['sprinkles', 50, 40] }, parts: [
      P('rect', 50, 97, 52, 4, 'gray', 3), P('triangle', 50, 76, 34, 44, 'brown', 1, { r: 180 }), P('circle', 50, 48, 34, 34, 'pink', 1), P('circle', 50, 26, 26, 26, 'purple', 1),
      P('circle', 50, 11, 10, 10, 'red', 2), P('star', 41, 47, 8, 8, 'yellow', 2), P('star', 60, 54, 8, 8, 'yellow', 2), P('circle', 84, 14, 16, 16, 'orange', 3)] },
    { id: 'cat', cheer: { move: 'hop' }, parts: [
      P('oval', 78, 78, 12, 34, 'orange', 3, { r: 30 }), P('oval', 50, 84, 44, 30, 'orange', 3), P('triangle', 34, 24, 14, 16, 'orange', 1), P('triangle', 66, 24, 14, 16, 'orange', 1), P('circle', 50, 48, 40, 40, 'orange', 1),
      P('circle', 40, 44, 8, 8, 'green', 2), P('circle', 60, 44, 8, 8, 'green', 2), P('triangle', 50, 54, 7, 6, 'pink', 2, { r: 180 }), P('semicircle', 50, 60, 14, 6, 'red', 3, { r: 180 })] },
    { id: 'robot', cheer: { move: 'dance', pivot: [50, 95], fx: ['sparks', 50, 10] }, parts: [
      P('rect', 28, 92, 10, 14, 'gray', 3), P('rect', 72, 92, 10, 14, 'gray', 3), P('rect', 22, 62, 8, 28, 'orange', 3), P('rect', 78, 62, 8, 28, 'orange', 3), P('square', 50, 66, 40, 40, 'blue', 1),
      P('rect', 50, 33, 30, 22, 'gray', 1), P('rect', 50, 17, 3, 10, 'gray', 2), P('circle', 50, 11, 6, 6, 'red', 2), P('circle', 43, 31, 8, 8, 'yellow', 1), P('circle', 57, 31, 8, 8, 'yellow', 1), P('rect', 50, 41, 16, 4, 'red', 2)] }
  ];
  const BYID = Object.fromEntries(PICS.map(p => [p.id, p]));

  // celebration motions: where the whole picture goes (design units) and how it turns
  const MOVES = {
    bob: u => ({ dy: -Math.abs(Math.sin(u * TAU * 2)) * 3 }),
    launch: u => ({ dy: -(u * u) * 170 + (u < .25 ? Math.sin(u * 140) * .8 : 0) }),
    drive: u => ({ dx: ease(u) * 190, dy: Math.sin(u * 70) * .7 }),
    sail: u => ({ dx: u * 140, rot: Math.sin(u * 9) * .05, py: 80 }),
    sway: u => ({ rot: Math.sin(u * TAU * 2.2) * .1 }),
    swim: u => ({ dx: Math.sin(u * TAU) * 42, dy: Math.sin(u * TAU * 3) * 5, rot: Math.cos(u * TAU) * .09 }),
    hop: u => ({ dy: -Math.abs(Math.sin(u * TAU * 3)) * 12 }),
    float: u => ({ dy: -u * 40, rot: Math.sin(u * TAU * 3) * .12 }),
    wobble: u => ({ rot: Math.sin(u * TAU * 3) * .12 }),
    dance: u => ({ rot: Math.sin(u * TAU * 4) * .1, dy: -Math.abs(Math.sin(u * TAU * 4)) * 4 })
  };
  const CHEER_T = 3.4;

  /* ---------------------------------------------------------------- the game */
  class ShapesGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      SPG.shapesGame = this; this.bag = store.bag('shapes', () => ({ built: 0, seen: [] })); this.bag.built = this.bag.built || 0;
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s * .55); c.fillStyle = '#ff6b6b'; art.rr(c, -s * .3, -s * .02, s * .3, s * .3, s * .04); c.fill(); c.fillStyle = '#5aa8f0'; c.beginPath(); c.arc(s * .2, s * .12, s * .16, 0, TAU); c.fill(); c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(-s * .02, -s * .34); c.lineTo(s * .24, -s * .02); c.lineTo(-s * .28, -s * .02); c.closePath(); c.fill(); }, this.bag.built);
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.state = 'build'; this.stateT = 0; this.drag = null; this.idle = 0; this.misses = {};
      this.tick = this.tick.bind(this);
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* optional */ } SPG.audio.unlock(); const p = at(e); this.grab(p.x, p.y, e.pointerId); });
      cv.addEventListener('pointermove', e => { if (this.drag && this.drag.id === e.pointerId) { e.preventDefault(); const p = at(e); this.drag.x = p.x; this.drag.y = p.y; } });
      for (const n of ['pointerup', 'pointercancel']) cv.addEventListener(n, e => { if (this.drag && this.drag.id === e.pointerId) this.release(); });
    }
    night() { return !!(SPG.night && SPG.night.on()); }

    /* ---------------------------------------------------------------- layout */
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.wide = this.w >= this.h * 1.1; this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      this.layout(); this.draw();
    }
    layout() {
      const w = this.w, h = this.h, n = this.items ? this.items.length : 8, top = Math.max(66, 56 * this.ui + 14), pad = 10;
      let tray, B, bx, by;
      if (this.wide) {
        const tw = clamp(w * (n > 9 ? .34 : .3), 190, 420); tray = { x: w - tw - pad, y: top, w: tw, h: h - top - pad };
        B = Math.min(tray.x - pad * 2, h - top - pad - 4) / 1.1; bx = (tray.x - B) / 2; by = top + (h - top - pad - B) / 2;
      } else {
        const th = clamp(h * (n > 9 ? .36 : .31), 150, 380); tray = { x: pad, y: h - th - pad, w: w - pad * 2, h: th };
        B = Math.min(w - pad * 2, tray.y - top - pad) / 1.1; bx = (w - B) / 2; by = top + (tray.y - top - pad - B) / 2;
      }
      this.tray = tray; this.B = Math.max(60, B); this.bx = bx; this.by = by; this.ss = this.B / 100;
      this.prev = { s: Math.min(64 * this.ui + 6, top - 10), y: 5 }; this.prev.x = (w - this.prev.s) / 2;
      this.layoutTray();
    }
    sx(x) { return this.bx + x * this.ss; }
    sy(y) { return this.by + y * this.ss; }
    // the loose pieces: a grid of cells; every piece shows at one common scale (so a big piece looks bigger than a small one), but never too tiny or too big for its cell
    layoutTray() {
      const list = this.items || []; if (!list.length) return;
      const t = this.tray, n = list.length; let best = null;
      for (let cols = 1; cols <= n; cols++) { const rows = Math.ceil(n / cols), cell = Math.min((t.w - 16) / cols, (t.h - 16) / rows); if (!best || cell > best.cell) best = { cols, rows, cell }; }
      const { cols, rows, cell } = best; this.cell = cell;
      const maxPx = Math.max(...list.map(it => Math.max(extent(it.p).w, extent(it.p).h) * this.ss)), k = Math.min(1, cell * .8 / maxPx);
      const gw = cols * cell, gh = rows * cell, gx = t.x + (t.w - gw) / 2, gy = t.y + (t.h - gh) / 2;
      list.forEach((it, i) => {
        const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - row * cols : cols, col = i - row * cols;
        it.hx = gx + (col + .5 + (cols - inRow) / 2) * cell; it.hy = gy + (row + .5) * cell;
        const ex = extent(it.p), dim = Math.max(ex.w, ex.h) * this.ss * k, minDim = cell * .5;
        it.tsc = dim < minDim ? this.ss * k * minDim / dim : this.ss * k;
        if (it.state === 'home') { it.x = it.hx; it.y = it.hy; it.sc = it.tsc; }
      });
    }

    /* ---------------------------------------------------------------- pictures */
    // tier: 1 = 3-4 pieces, 2 = 5-7, 3 = 8-11 plus two look-alikes in the wrong colour and plain holes
    tier() { return clamp(SPG.level.tier('shapes') | 0, 1, 3); }
    nextPic() {
      const seen = this.bag.seen || (this.bag.seen = []), fresh = PICS.filter(p => !seen.includes(p.id));
      const pool = fresh.length ? fresh : (this.bag.seen = [], PICS.filter(p => p.id !== (this.pic && this.pic.id)));
      return shuffle(pool)[0];
    }
    loadPic(id) {
      const pic = id ? BYID[id] : this.nextPic(), tier = this.tier(); this.pic = pic; this.tierNow = tier;
      if (this.bag.seen && !this.bag.seen.includes(pic.id)) this.bag.seen.push(pic.id);
      // every part is either already built (pre) or a hole to fill
      this.parts = pic.parts.map((p, i) => ({ p, i, pre: p.l > tier, placed: p.l > tier, at: -9 }));
      const open = this.parts.filter(q => !q.pre);
      this.items = open.map(q => ({ p: q.p, slotRef: q, state: 'home', x: 0, y: 0, hx: 0, hy: 0, sc: 1, tsc: 1, t: 0, decoy: false, wig: 0 }));
      if (tier === 3) {   // two look-alikes: the right shape, a wrong colour (never a colour that part of this picture uses for that shape)
        const used = new Set(pic.parts.map(p => p.s + '|' + p.c)), cands = shuffle(open.filter(q => q.p.s !== 'star'));
        for (const q of cands) { if (this.items.filter(it => it.decoy).length >= 2) break; const cols = shuffle(COLS.filter(c => !used.has(q.p.s + '|' + c) && c !== 'white')); if (!cols.length) continue; used.add(q.p.s + '|' + cols[0]); this.items.push({ p: Object.assign({}, q.p, { c: cols[0] }), slotRef: null, state: 'home', x: 0, y: 0, hx: 0, hy: 0, sc: 1, tsc: 1, t: 0, decoy: true, wig: 0 }); }
      }
      this.items = shuffle(this.items); this.state = 'build'; this.stateT = 0; this.drag = null; this.idle = 0; this.misses = {}; this.hint = null; this.intro = 0;
      this.layout(); this.items.forEach((it, i) => { it.pop = -i * .05; it.x = it.hx; it.y = it.hy; it.sc = it.tsc; });
      this.fx.p.length = 0;
    }
    openSlots() { return this.parts.filter(q => !q.placed); }

    /* ---------------------------------------------------------------- dragging */
    grab(x, y, id) {
      if (this.state !== 'build' || this.drag) return;
      this.idle = 0; this.hint = null;
      let best = null, bd = 1e9;
      for (const it of this.items) { if (it.state === 'placed' || it.state === 'fly') continue; const d = Math.hypot(x - it.x, y - it.y), r = Math.max(this.cell * .5, 26); if (d < r && d < bd) { best = it; bd = d; } }
      if (!best) return;
      best.state = 'drag'; const lift = clamp(Math.max(extent(best.p).w, extent(best.p).h) * this.ss * .3, 18, 50);
      this.drag = { it: best, id, x, y, sx: x, sy: y, t0: this.t, lift }; best.pop = 0; sfx.pop();
    }
    // the piece rides above the finger so it can be seen; near the bottom edge it comes down so every hole can still be reached
    pieceAt(d) { return { x: d.x, y: d.y - Math.min(d.lift, Math.max(0, this.h - 6 - d.y)) }; }
    pointerFor(it, x, y) { const e = extent(it.p), lift = clamp(Math.max(e.w, e.h) * this.ss * .3, 18, 50); return { x, y: y + Math.min(lift, Math.max(0, (this.h - 6 - y) / 2)) }; }
    release() {
      const d = this.drag; this.drag = null; if (!d) return;
      const it = d.it, pos = this.pieceAt(d), key = keyOf(it.p), ex = extent(it.p);
      // the hole the piece is over: an exact match first (any of two identical holes will do), otherwise the nearest hole of any kind
      let match = null, md = 1e9, near = null, nd = 1e9;
      for (const q of this.openSlots()) {
        const sx = this.sx(q.p.x), sy = this.sy(q.p.y), e2 = extent(q.p), snap = Math.max(Math.max(e2.w, e2.h) * this.ss * .55, 36 * this.ui), dist = Math.hypot(pos.x - sx, pos.y - sy);
        if (dist < snap) { if (keyOf(q.p) === key && !it.decoy && dist < md) { match = q; md = dist; } if (dist < nd) { near = q; nd = dist; } }
      }
      if (match) { this.place(it, match); return; }
      this.sendHome(it, !!near);
      if (!near && !it.decoy && Math.hypot(d.x - d.sx, d.y - d.sy) < 14 && this.t - d.t0 < .5) {   // a tap on a piece shows where it goes
        const q = this.openSlots().find(q => keyOf(q.p) === key); if (q) this.hint = { q, until: this.t + 2.5 };
      }
      if (near) {   // it was dropped on a hole it does not fit: after two misses its own hole pulses
        const m = this.misses[key] = (this.misses[key] || 0) + 1;
        if (m >= 2 && !it.decoy) { const q = this.openSlots().find(q => keyOf(q.p) === key); if (q) this.hint = { q, until: this.t + 6 }; }
      }
    }
    sendHome(it, wrong) {
      it.state = 'back'; it.t = 0; it.from = { x: it.x, y: it.y, sc: it.sc };
      if (wrong) { sfx.boing(); if (!this.said || this.t - this.said > 12) { this.said = this.t; voice.say('shapes-wrong'); } }
    }
    place(it, q) {
      it.state = 'fly'; it.t = 0; it.from = { x: it.x, y: it.y - (this.drag ? 0 : 0), sc: it.sc }; it.target = q; q.placed = true; q.filling = it; this.misses[keyOf(it.p)] = 0;
    }
    landed(it) {
      const q = it.target; it.state = 'placed'; q.at = this.t; const sx = this.sx(q.p.x), sy = this.sy(q.p.y);
      sfx.snap(); sfx.plink(this.parts.filter(z => z.placed && !z.pre).length);
      this.fx.burst(sx, sy, 8, { colors: ['#fff', COL[q.p.c], '#ffd54a'], speed: 110, g: 160, life: .55, size: 4.5 * this.ui, shape: 'star', up: 50 });
      voice.say('shape/' + (SHAPE_SAY[q.p.s] || q.p.s)); if (this.tierNow === 1) setTimeout(() => { if (this.running) voice.say('color/' + q.p.c); }, 900);
      if (!this.openSlots().length) this.finish();
    }
    finish() {
      this.state = 'cheer'; this.stateT = 0; this.bag.built++; this.counter.set(this.bag.built); store.addStars(1); store.save();
      sfx.win(); setTimeout(() => this.running && voice.praise(), 600);
      const cx = this.bx + this.B / 2, cy = this.by + this.B / 2; this.fx.burst(cx, cy, 26, { colors: ['#ff6b6b', '#ffd54a', '#5aa8f0', '#6fcf6f', '#ff8fc0', '#fff'], speed: 330, g: 380, life: 1.3, size: 7 * this.ui, shape: 'star', up: 190 });
      if (this.pic.cheer.move === 'launch') sfx.whoosh();
    }

    /* ---------------------------------------------------------------- loop */
    start() { this.resize(); this.loadPic(); this.resume(); voice.say('shapes-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.drag = null; this.items && this.items.forEach(it => { if (it.state === 'drag') this.sendHome(it, false); }); store.save(); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }

    probe() {
      const slot = q => { const e = extent(q.p); return { i: q.i, key: keyOf(q.p), shape: q.p.s, col: q.p.c, x: this.sx(q.p.x), y: this.sy(q.p.y), w: e.w * this.ss, h: e.h * this.ss, open: !q.placed, pre: q.pre }; };
      const item = it => ({ key: keyOf(it.p), shape: it.p.s, col: it.p.c, decoy: it.decoy, state: it.state, x: it.x, y: it.y, hx: it.hx, hy: it.hy, dim: Math.max(extent(it.p).w, extent(it.p).h) * it.sc, sc: it.sc, ss: this.ss });
      return { state: this.state, tier: this.tierNow, pic: this.pic && this.pic.id, w: this.w, h: this.h, board: { x: this.bx, y: this.by, s: this.B }, tray: this.tray, cell: this.cell, prev: this.tierNow === 3 ? this.prev : null,
        slots: (this.parts || []).map(slot), items: (this.items || []).map(item), open: this.openSlots().length, built: this.bag.built, hint: !!this.hint, ui: this.ui };
    }

    update(dt) {
      this.stateT += dt; this.idle += dt; this.intro = Math.min(1, this.intro + dt * 2.2);
      for (const it of this.items) {
        it.pop = Math.min(1, (it.pop || 0) + dt * 4);
        if (it.state === 'drag') { const d = this.drag, p = this.pieceAt(d); it.x = lerp(it.x, p.x, Math.min(1, dt * 28)); it.y = lerp(it.y, p.y, Math.min(1, dt * 28)); it.sc = lerp(it.sc, this.ss, Math.min(1, dt * 14)); }
        else if (it.state === 'back') { it.t += dt / .38; const u = ease(clamp(it.t, 0, 1)); it.x = lerp(it.from.x, it.hx, u); it.y = lerp(it.from.y, it.hy, u) - Math.sin(u * Math.PI) * 14 * this.ui; it.sc = lerp(it.from.sc, it.tsc, u); if (it.t >= 1) { it.state = 'home'; it.x = it.hx; it.y = it.hy; it.sc = it.tsc; } }
        else if (it.state === 'fly') { it.t += dt / .16; const u = ease(clamp(it.t, 0, 1)), q = it.target; it.x = lerp(it.from.x, this.sx(q.p.x), u); it.y = lerp(it.from.y, this.sy(q.p.y), u); it.sc = lerp(it.from.sc, this.ss, u); if (it.t >= 1) this.landed(it); }
        else if (it.state === 'home') { it.wig = Math.max(0, it.wig - dt); }
      }
      if (this.hint && this.t > this.hint.until) this.hint = null;
      // nobody has touched anything for a while: a hole pulses and its piece wiggles
      if (this.state === 'build' && !this.drag && this.idle > 9 && !this.hint) { const q = shuffle(this.openSlots())[0]; if (q) { this.hint = { q, until: this.t + 6 }; const it = this.items.find(i => i.state === 'home' && !i.decoy && keyOf(i.p) === keyOf(q.p)); if (it) it.wig = 3; } this.idle = 6; }
      if (this.state === 'cheer') {
        const u = clamp(this.stateT / CHEER_T, 0, 1), fxk = this.pic.cheer.fx; this.cheerAcc = (this.cheerAcc || 0) + dt;
        if (fxk) this.cheerFx(fxk, u, dt);
        if (this.stateT > CHEER_T) { this.state = 'switch'; this.stateT = 0; }
      } else if (this.state === 'switch') { if (this.stateT > .25) this.loadPic(); }
      this.fx.update(dt);
    }
    cheerFx(f, u, dt) {
      const m = (MOVES[this.pic.cheer.move] || MOVES.bob)(u), tx = this.sx(f[1] || 50) + (m.dx || 0) * this.ss, ty = this.sy(f[2] || 50) + (m.dy || 0) * this.ss, s = this.ss;
      const every = (k, fn) => { this.fxT = this.fxT || {}; this.fxT[k] = (this.fxT[k] || 0) - dt; if (this.fxT[k] <= 0) { this.fxT[k] = fn.step; fn.run(); } };
      if (f[0] === 'smoke') every('smoke', { step: .16, run: () => this.fx.burst(tx, ty, 1, { colors: ['#ffffff', '#e3e0ee'], speed: 24, g: -60, life: 1.8, size: 6 * s * .6 + 5, up: 70 }) });
      else if (f[0] === 'flame') every('flame', { step: .02, run: () => this.fx.burst(tx, ty, 2, { colors: ['#ffd54a', '#ffa24d', '#ff6b6b'], speed: 90, g: 300, life: .5, size: 5 * s * .6 + 3, up: -90 }) });
      else if (f[0] === 'bubbles') every('bubbles', { step: .18, run: () => this.fx.burst(tx, ty, 1, { colors: ['#cfeeff', '#ffffff'], speed: 18, g: -80, life: 1.6, size: 4 * s * .6 + 3, up: 40 }) });
      else if (f[0] === 'splash') every('splash', { step: .1, run: () => this.fx.burst(tx, ty, 2, { colors: ['#bfe6ff', '#fff'], speed: 70, g: 260, life: .6, size: 3 * s * .6 + 2, up: 90 }) });
      else if (f[0] === 'snow') every('snow', { step: .05, run: () => this.fx.burst(Math.random() * this.w, -4, 1, { colors: ['#ffffff', '#dff0ff'], speed: 18, g: 70, life: 3.5, size: 4 + Math.random() * 4 }) });
      else if (f[0] === 'fireworks') every('fw', { step: .42, run: () => { const x = this.bx + this.B * (.15 + Math.random() * .7), y = this.by + this.B * (.05 + Math.random() * .3); this.fx.burst(x, y, 16, { colors: [['#ff6b6b', '#ffd54a'], ['#5aa8f0', '#fff'], ['#6fcf6f', '#ffd54a']][Math.floor(Math.random() * 3)], speed: 240, g: 160, life: 1, size: 5 * this.ui + 2, shape: 'star' }); sfx.plink(Math.floor(Math.random() * 5)); } });
      else if (f[0] === 'leaves') every('leaves', { step: .12, run: () => this.fx.burst(this.sx(30 + Math.random() * 40), this.sy(20 + Math.random() * 30), 1, { colors: ['#6fcf6f', '#9be07a', '#ffa24d'], speed: 20, g: 90, life: 2.2, size: 4 * s * .6 + 3 }) });
      else if (f[0] === 'sprinkles') every('spr', { step: .07, run: () => this.fx.burst(this.sx(25 + Math.random() * 50), this.sy(10), 1, { colors: ['#ff6b6b', '#ffd54a', '#5aa8f0', '#6fcf6f', '#ff8fc0'], speed: 40, g: 240, life: 1.6, size: 3.5 * this.ui + 1.5 }) });
      else if (f[0] === 'sparks') every('sparks', { step: .12, run: () => this.fx.burst(tx, ty, 2, { colors: ['#ffd54a', '#fff'], speed: 110, g: 120, life: .7, size: 5 * this.ui + 2, shape: 'star' }) });
    }
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt;
      this.update(dt); this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---------------------------------------------------------------- drawing */
    drawBackground(c, night) {
      const w = this.w, h = this.h, g = c.createLinearGradient(0, 0, 0, h);
      if (night) { g.addColorStop(0, '#262a5c'); g.addColorStop(1, '#3a3470'); } else { g.addColorStop(0, '#fff0d4'); g.addColorStop(1, '#ffdcae'); }
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = night ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.35)'; for (let i = 0; i < 9; i++) c.fillRect(w * i / 9, 0, w / 18, h);   // workshop wall stripes
      c.fillStyle = night ? 'rgba(255,255,255,.12)' : 'rgba(150,110,60,.18)'; const gap = 34 * this.ui + 10; for (let y = gap; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) { c.beginPath(); c.arc(x, y, 1.8 * this.ui + .6, 0, TAU); c.fill(); }   // a pegboard
    }
    drawBoard(c, night) {
      const pad = this.B * .05, x = this.bx - pad, y = this.by - pad, s = this.B + pad * 2;
      c.fillStyle = 'rgba(60,40,70,.2)'; art.rr(c, x + 3, y + 7, s, s, s * .06); c.fill();
      const g = c.createLinearGradient(0, y, 0, y + s); if (night) { g.addColorStop(0, '#3f4a86'); g.addColorStop(1, '#343e78'); } else { g.addColorStop(0, '#f4f9ff'); g.addColorStop(1, '#dde9fb'); }
      c.fillStyle = g; art.rr(c, x, y, s, s, s * .06); c.fill();
      c.strokeStyle = night ? 'rgba(255,255,255,.18)' : 'rgba(120,150,200,.28)'; c.lineWidth = 1.2; c.beginPath(); const grid = s / 12; for (let i = 1; i < 12; i++) { c.moveTo(x + i * grid, y + s * .02); c.lineTo(x + i * grid, y + s * .98); c.moveTo(x + s * .02, y + i * grid); c.lineTo(x + s * .98, y + i * grid); } c.stroke();   // blueprint paper
      c.lineWidth = 5; c.strokeStyle = night ? '#7a6fc0' : '#ffffff'; art.rr(c, x, y, s, s, s * .06); c.stroke();
    }
    drawTray(c, night) {
      const t = this.tray; c.fillStyle = 'rgba(60,40,30,.22)'; art.rr(c, t.x + 2, t.y + 6, t.w, t.h, 24); c.fill();
      const g = c.createLinearGradient(0, t.y, 0, t.y + t.h); if (night) { g.addColorStop(0, '#7a5a48'); g.addColorStop(1, '#5e4538'); } else { g.addColorStop(0, '#e9c08c'); g.addColorStop(1, '#d4a370'); }
      c.fillStyle = g; art.rr(c, t.x, t.y, t.w, t.h, 24); c.fill();
      c.save(); art.rr(c, t.x, t.y, t.w, t.h, 24); c.clip(); c.strokeStyle = 'rgba(120,70,30,.14)'; c.lineWidth = 2; for (let i = 0; i < 14; i++) { const yy = t.y + (i + .5) * t.h / 14; c.beginPath(); c.moveTo(t.x, yy); c.bezierCurveTo(t.x + t.w * .3, yy - 3, t.x + t.w * .6, yy + 3, t.x + t.w, yy); c.stroke(); } c.restore();
      c.fillStyle = night ? 'rgba(20,14,40,.35)' : 'rgba(110,70,30,.18)'; art.rr(c, t.x + 8, t.y + 8, t.w - 16, t.h - 16, 18); c.fill();
    }
    // the whole picture, with the holes and the pieces in place; xf is the celebration's movement (design units)
    drawPicture(c, night, xf) {
      const ss = this.ss, tint = this.tierNow < 3, held = this.drag ? keyOf(this.drag.it.p) : null, pulse = .5 + Math.sin(this.t * 7) * .5;
      c.save();
      if (xf) { const px = this.sx(xf.px == null ? 50 : xf.px), py = this.sy(xf.py == null ? 50 : xf.py); c.translate((xf.dx || 0) * ss, (xf.dy || 0) * ss); c.translate(px, py); c.rotate(xf.rot || 0); c.translate(-px, -py); }
      for (const q of this.parts) {
        const p = q.p, x = this.sx(p.x), y = this.sy(p.y);
        c.save(); c.translate(x, y);
        if (q.placed && (q.pre || !q.filling || q.filling.state === 'placed')) {
          const age = this.t - q.at, bump = age < .4 ? 1 + Math.sin(age / .4 * Math.PI) * .12 * (1 - age / .4) : 1;
          drawPiece(c, p, ss * bump, {});
          if (this.state === 'cheer' && p.g && this.pic.cheer.lights) { const a = .55 + Math.sin(this.t * 9 + q.i) * .25; c.globalAlpha = a; c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(0, 0, Math.max(p.w, p.h) * ss * .95, 0, TAU); c.fill(); c.globalAlpha = 1; drawPiece(c, Object.assign({}, p, { c: 'yellow' }), ss, { shadow: false }); }
        } else if (!q.placed || (q.filling && q.filling.state !== 'placed')) {
          drawHole(c, p, ss, { tint, night });
          const hinted = this.hint && this.hint.q === q, glow = this.drag && keyOf(p) === held && !this.drag.it.decoy;
          if (glow || hinted) { c.save(); c.rotate((p.r || 0) * Math.PI / 180); c.scale(ss, ss); shapePath(c, p.s, p.w, p.h); c.lineWidth = (hinted ? 5 : 4) / ss * (.8 + pulse * .5); c.strokeStyle = `rgba(255,236,120,${(.65 + pulse * .35).toFixed(2)})`; c.shadowColor = '#ffe066'; c.shadowBlur = 16 + pulse * 10; c.lineJoin = 'round'; c.stroke(); c.restore(); }
        }
        c.restore();
      }
      c.restore();
    }
    drawItem(c, it, night) {
      if (it.state === 'placed' || (it.state === 'fly' && it.t >= 1)) return;
      const lift = it.state === 'drag' ? 1 : 0, pop = ease(clamp(it.pop, 0, 1)), wig = it.wig > 0 ? Math.sin(this.t * 16) * .12 : 0;
      c.save(); c.translate(it.x, it.y); if (wig) c.rotate(wig); const k = it.sc * (.5 + .5 * pop) * (lift ? 1.03 : 1);
      if (lift) { c.save(); c.translate(6, 12 + this.drag.lift * .25); c.globalAlpha = .22; drawPiece(c, Object.assign({}, it.p, { c: 'gray' }), k, { shadow: false }); c.restore(); }
      drawPiece(c, it.p, k, {}); c.restore();
    }
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w || !this.pic) return;
      const night = this.night(); this.drawBackground(c, night); this.drawBoard(c, night); this.drawTray(c, night);
      // the picture (it moves during the celebration, and slides in when a new one begins)
      let xf = null;
      if (this.state === 'cheer' || this.state === 'switch') { const u = clamp(this.stateT / CHEER_T, 0, 1), m = (MOVES[this.pic.cheer.move] || MOVES.bob)(this.state === 'switch' ? 1 : u); xf = { dx: m.dx, dy: m.dy, rot: m.rot, px: this.pic.cheer.pivot ? this.pic.cheer.pivot[0] : 50, py: m.py || (this.pic.cheer.pivot ? this.pic.cheer.pivot[1] : 50) }; }
      c.save(); c.globalAlpha = this.state === 'switch' ? 0 : clamp(this.intro * 1.5, 0, 1); const ic = this.intro < 1 ? 1 - ease(this.intro) : 0; if (ic) c.translate(0, ic * 14);
      this.drawPicture(c, night, xf); c.restore();
      for (const it of this.items) if (it.state !== 'drag') this.drawItem(c, it, night);
      if (this.drag) this.drawItem(c, this.drag.it, night);
      this.fx.draw(c);
      if (this.tierNow === 3 && this.state === 'build') this.drawPreview(c, night);
    }
    // a small picture of the finished build, for the colours (tier 3: the holes are plain)
    drawPreview(c, night) {
      const r = this.prev, k = r.s / 118; c.save(); c.fillStyle = 'rgba(60,40,70,.2)'; art.rr(c, r.x + 2, r.y + 4, r.s, r.s, 12); c.fill(); c.fillStyle = night ? '#3f4a86' : '#f4f9ff'; art.rr(c, r.x, r.y, r.s, r.s, 12); c.fill(); c.strokeStyle = night ? '#7a6fc0' : '#fff'; c.lineWidth = 3; c.stroke();
      c.translate(r.x + r.s / 2 - 50 * k, r.y + r.s / 2 - 50 * k); for (const p of this.pic.parts) { c.save(); c.translate(p.x * k, p.y * k); drawPiece(c, p, k, { shadow: false }); c.restore(); } c.restore();
    }
  }

  /* ---------------------------------------------------------------- hub icon */
  SPG.games.push({
    id: 'shapes', name: 'Shape Builder', order: 9,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f4f9ff'); g.addColorStop(1, '#cfe0f8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(120,150,200,.3)'; c.lineWidth = 1; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(w * i / 8, 0); c.lineTo(w * i / 8, h); c.moveTo(0, h * i / 8); c.lineTo(w, h * i / 8); c.stroke(); }
      const s = Math.min(w, h) * .0078, house = BYID.house, ox = w * .5 - 50 * s, oy = h * .07;
      for (const p of house.parts) {
        if (p.l === 3) continue;
        c.save(); c.translate(ox + p.x * s, oy + p.y * s);
        if (p.s === 'triangle' && p.c === 'red') drawHole(c, p, s, { tint: true }); else if (p.s === 'rect' && p.c === 'brown') drawHole(c, p, s, { tint: true }); else drawPiece(c, p, s, {});
        c.restore();
      }
      c.save(); c.translate(w * .16, h * .86); drawPiece(c, { s: 'triangle', w: 24, h: 18, c: 'red' }, s, {}); c.restore();
      c.save(); c.translate(w * .84, h * .84); drawPiece(c, { s: 'star', w: 20, h: 20, c: 'yellow' }, s, {}); c.restore();
    },
    create: host => new ShapesGame(host)
  });
})();
