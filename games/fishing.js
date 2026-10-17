// Fishing Pond: tap the fishing rod to get ready, then tap a fishing spot to cast. Every spot in the pond has its own fish (bass in the
// reeds, goldfish and carp by the lily pads, trout on the rocks...). A shadow swims up to the bobber, the bobber dips, and a few taps
// reel the fish in. Nothing is ever lost: a fish never gets away. Every kind caught goes in her fish book (a star for each new kind).
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u * u * (3 - 2 * u);
  const INK = '#5a3f5e';
  const rr = (c, x, y, w, h, r) => art.rr(c, x, y, w, h, r);

  // the fish. len = body length, hr = how tall the body is compared with its length
  const FISH = {
    bass:     { name: 'Bass',     len: 1.05, hr: .40, body: '#6e9a4f', belly: '#eaf0cc', fin: '#4f7a3a', pat: 'band', tail: 'fork', dorsal: 'spiky' },
    bluegill: { name: 'Bluegill', len: .8,  hr: .55, body: '#4f93b0', belly: '#f5a84e', fin: '#3a7894', pat: 'bars', tail: 'fork', dorsal: 'spiky' },
    goldfish: { name: 'Goldfish', len: .8,  hr: .52, body: '#ff9a2e', belly: '#ffd592', fin: '#ff7a1a', pat: 'plain', tail: 'fan', dorsal: 'smooth' },
    carp:     { name: 'Carp',     len: 1.15, hr: .46, body: '#c99a4a', belly: '#f1dfae', fin: '#a9792f', pat: 'scales', tail: 'fork', dorsal: 'smooth', whiskers: true },
    trout:    { name: 'Trout',    len: 1.05, hr: .38, body: '#8fb0a4', belly: '#f6ecd8', fin: '#6f948a', pat: 'spots', tail: 'fork', dorsal: 'smooth' },
    perch:    { name: 'Perch',    len: .85, hr: .46, body: '#b9bf4a', belly: '#f3eeb4', fin: '#ee7a3a', pat: 'bars', tail: 'fork', dorsal: 'spiky' },
    catfish:  { name: 'Catfish',  len: 1.1, hr: .42, body: '#8e7f6e', belly: '#ddd2bd', fin: '#6f6354', pat: 'plain', tail: 'fan', dorsal: 'smooth', whiskers: true },
    salmon:   { name: 'Salmon',   len: 1.2, hr: .40, body: '#ec8c8a', belly: '#fcddd2', fin: '#d06a6a', pat: 'plain', tail: 'fork', dorsal: 'smooth' },
    minnow:   { name: 'Minnow',   len: .6,  hr: .36, body: '#9fc4d8', belly: '#f3f8fb', fin: '#7aa6bd', pat: 'band', tail: 'fork', dorsal: 'smooth' }
  };
  const ALL = Object.keys(FISH);
  // the fishing spots: where they are in the water (0..1), what is around them, and which fish live there
  const SPOTS = [
    { id: 'reeds',  x: .18, y: .30, fish: ['bass', 'bluegill'], tier: 1 },
    { id: 'lilies', x: .50, y: .22, fish: ['goldfish', 'carp'], tier: 1 },
    { id: 'rocks',  x: .82, y: .32, fish: ['trout', 'perch'], tier: 1 },
    { id: 'deep',   x: .34, y: .62, fish: ['catfish', 'salmon'], tier: 2 },
    { id: 'sand',   x: .68, y: .66, fish: ['minnow', 'perch', 'bluegill'], tier: 2 }
  ];

  const eye = (c, x, y, r) => {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = '#3a2a30'; c.beginPath(); c.arc(x + r * .25, y, r * .6, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x + r * .05, y - r * .25, r * .22, 0, TAU); c.fill();
  };

  // A fish facing right, centred on (0, 0); s = the length of a size-1 fish. `sil` draws just a dark shape (a shadow under the water).
  function drawFish(c, id, s, t, o = {}) {
    const sp = FISH[id], L = s * sp.len * .5, H = L * sp.hr * 1.0, wag = Math.sin(t * 8 + (o.ph || 0)) * (o.still ? .02 : .16);
    c.save(); c.lineJoin = c.lineCap = 'round';
    const body = () => { c.beginPath(); c.moveTo(L, 0); c.bezierCurveTo(L * .82, -H * 1.05, L * .1, -H * 1.2, -L * .55, -H * .34); c.lineTo(-L * .74, -H * .13); c.lineTo(-L * .74, H * .13); c.lineTo(-L * .55, H * .34); c.bezierCurveTo(L * .1, H * 1.2, L * .82, H * 1.05, L, 0); c.closePath(); };
    const tail = fill => {
      c.fillStyle = fill; c.save(); c.translate(-L * .7, 0); c.rotate(wag); c.beginPath();
      if (sp.tail === 'fan') { c.moveTo(L * .08, 0); c.bezierCurveTo(-L * .2, -H * 1.5, -L * .7, -H * 1.7, -L * .62, -H * .5); c.quadraticCurveTo(-L * .5, 0, -L * .62, H * .5); c.bezierCurveTo(-L * .7, H * 1.7, -L * .2, H * 1.5, L * .08, 0); }
      else { c.moveTo(L * .08, 0); c.quadraticCurveTo(-L * .25, -H * .4, -L * .62, -H * 1.35); c.quadraticCurveTo(-L * .5, -H * .1, -L * .42, 0); c.quadraticCurveTo(-L * .5, H * .1, -L * .62, H * 1.35); c.quadraticCurveTo(-L * .25, H * .4, L * .08, 0); }
      c.fill(); c.restore();
    };
    if (o.sil) { c.fillStyle = o.sil; tail(o.sil); body(); c.fill(); c.restore(); return; }
    tail(sp.fin);
    // the back fin
    c.fillStyle = sp.fin; c.beginPath();
    if (sp.dorsal === 'spiky') { c.moveTo(L * .35, -H * .98); for (let i = 0; i <= 5; i++) { const x = L * .35 - i * L * .13; c.lineTo(x, -H * (1.0 + (i % 2 ? .0 : .38))); } c.lineTo(-L * .3, -H * .9); c.closePath(); }
    else { c.moveTo(L * .3, -H * .98); c.quadraticCurveTo(L * .0, -H * 1.75, -L * .4, -H * .8); c.closePath(); }
    c.fill();
    // body
    body(); c.fillStyle = sp.body; c.fill();
    c.save(); body(); c.clip();
    c.fillStyle = sp.belly; c.beginPath(); c.ellipse(L * .05, H * 1.05, L * 1.1, H * .8, 0, 0, TAU); c.fill();
    if (sp.pat === 'band') { c.fillStyle = 'rgba(40,60,30,.38)'; c.beginPath(); c.ellipse(0, -H * .05, L * .95, H * .16, 0, 0, TAU); c.fill(); }
    else if (sp.pat === 'bars') { c.fillStyle = 'rgba(30,60,80,.28)'; for (const x of [-.4, -.1, .2]) { c.beginPath(); c.ellipse(x * L, 0, L * .06, H * 1.1, 0, 0, TAU); c.fill(); } }
    else if (sp.pat === 'spots') { c.fillStyle = 'rgba(40,50,50,.45)'; for (const [x, y] of [[-.4, -.5], [-.1, -.65], [.2, -.45], [-.25, -.2], [.05, -.1], [.35, -.2], [-.5, .0]]) { c.beginPath(); c.arc(x * L, y * H, H * .085, 0, TAU); c.fill(); } c.strokeStyle = 'rgba(255,150,170,.6)'; c.lineWidth = H * .16; c.beginPath(); c.moveTo(-L * .6, H * .05); c.lineTo(L * .55, H * .05); c.stroke(); }
    else if (sp.pat === 'scales') { c.strokeStyle = 'rgba(120,80,20,.3)'; c.lineWidth = H * .06; for (let r = -1; r <= 1; r++) for (let k = -3; k <= 3; k++) { c.beginPath(); c.arc(k * L * .2 + (r % 2 ? L * .1 : 0), r * H * .42, H * .22, Math.PI * .1, Math.PI * .9); c.stroke(); } }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-L * .05, -H * .52, L * .42, H * .12, -.06, 0, TAU); c.fill();
    c.restore();
    // the side fin, the gill line, the face
    c.fillStyle = sp.fin; c.save(); c.translate(L * .12, H * .22); c.rotate(wag * 1.6 + .5); c.beginPath(); c.ellipse(0, 0, L * .2, H * .13, 0, 0, TAU); c.fill(); c.restore();
    c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = H * .08; c.beginPath(); c.arc(L * .34, 0, H * .72, Math.PI * .6, Math.PI * 1.4); c.stroke();
    eye(c, L * .62, -H * .2, H * .3);
    c.strokeStyle = '#7a3a2a'; c.lineWidth = Math.max(1.5, H * .09); c.beginPath(); c.arc(L * .93, H * .06, H * .16, 0, Math.PI * .8); c.stroke();
    c.fillStyle = 'rgba(255,120,150,.4)'; c.beginPath(); c.arc(L * .5, H * .22, H * .15, 0, TAU); c.fill();
    if (sp.whiskers) { c.strokeStyle = sp.fin; c.lineWidth = Math.max(1.5, H * .08); for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(L * .94, H * .1); c.quadraticCurveTo(L * 1.15, H * (.2 + sy * .2), L * 1.2, H * (.1 + sy * .55)); c.stroke(); } }
    c.restore();
  }

  class FishingGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('fishing', () => ({ caught: {}, total: 0 }));
      this.bag.caught = this.bag.caught || {}; this.bag.total = this.bag.total || 0;
      this.counter = SPG.ui.counter(host, (c, s) => { c.save(); c.translate(s / 2, s * .54); drawFish(c, 'goldfish', s * .8, 1, { still: true }); c.restore(); }, this.bag.total);
      this.tier = SPG.level.tier('fishing');
      this.spots = SPOTS.filter(sp => sp.tier <= (this.tier === 1 ? 1 : 2));
      this.cfg = [null, { wait: [1.4, 2.4], taps: 1 }, { wait: [2, 3.8], taps: 3 }, { wait: [2.6, 4.8], taps: 5 }][this.tier];
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.mode = 'idle';   // idle -> ready (rod in hand) -> cast -> wait -> bite -> reel -> jump -> card
      this.rings = []; this.spoken = {}; this.rodHint = 0; this.shake = 0; this.rodAng = 0;
      this.tick = this.tick.bind(this); SPG.fishingGame = this;
      const cv = this.canvas;
      cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.press((e.clientX - r.left) * this.w / r.width, (e.clientY - r.top) * this.h / r.height); });
    }

    /* ---------------------------------------------------------------- layout */
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr(); this.dpr = dpr;
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = this.w, h = this.h, bs = clamp(Math.min(w, h * 1.3) * .12, 46, 88); this.bs = bs;
      this.dockH = bs * 1.7; this.waterTop = h * .34; this.waterBot = h - this.dockH;
      this.rod = { x: w * .5, y: h - this.dockH * .5, r: bs * .62 }; this.book = { x: w * .5 + bs * 1.6, y: h - this.dockH * .5, r: bs * .5 };
      this.petS = bs * 2.5; this.petX = clamp(w * .17, this.petS * .6, w * .35); this.petY = h - this.dockH * .62;
      this.tip = { x: this.petX + this.petS * .55, y: this.petY - this.petS * 1.0 };
      this.pos = this.spots.map(sp => { const y = this.waterTop + (this.waterBot - this.waterTop) * (.14 + sp.y * .72); return { sp, x: w * (.1 + sp.x * .8), y, s: .7 + (y - this.waterTop) / (this.waterBot - this.waterTop) * .6 }; });
      this.draw();
    }
    start() { this.resize(); this.resume(); voice.say('fish-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }
    spotR(p) { return Math.min(this.w, this.h) * .085 * p.s; }

    /* ---------------------------------------------------------------- touching */
    press(x, y) {
      SPG.audio.unlock(); const near = (b, k = 1.15) => Math.hypot(x - b.x, y - b.y) < b.r * k;
      if (this.mode === 'book') { this.mode = this.prevMode || 'idle'; sfx.tap(); return; }
      if (this.mode === 'card') { this.leaveCard(); return; }
      if (near(this.book)) { sfx.tap(); this.prevMode = this.mode === 'idle' || this.mode === 'ready' ? this.mode : 'idle'; this.mode = 'book'; return; }
      if (near(this.rod)) {
        if (this.mode === 'idle') { this.mode = 'ready'; sfx.pop(); this.rodAng = -.2; return; }
        if (this.mode === 'ready') { this.mode = 'idle'; sfx.tap(); return; }
      }
      if (this.mode === 'ready') {
        const p = this.pos.find(q => Math.hypot(x - q.x, (y - q.y) * 1.5) < this.spotR(q) * 1.5); if (p) this.cast(p); else this.rodHint = 1; return;
      }
      if (this.mode === 'idle') { this.rodHint = 1; sfx.tap(); return; }
      if (this.mode === 'bite' || this.mode === 'reel') this.reelTap();
    }
    cast(p) {
      this.target = p; this.mode = 'cast'; this.modeT = 0; this.bob = { x: this.tip.x, y: this.tip.y, from: { x: this.tip.x, y: this.tip.y }, to: { x: p.x + (Math.random() - .5) * this.spotR(p) * .5, y: p.y + (Math.random() - .5) * this.spotR(p) * .2 }, dip: 0 };
      this.rodAng = .5; sfx.whoosh();
    }
    reelTap() {
      const F = this.fishNow; if (!F) return;
      if (this.mode === 'bite') { this.mode = 'reel'; this.modeT = 0; this.taps = 0; }
      this.taps++; this.shake = 1; sfx.squish(); sfx.plink(this.taps % 5);
      const u = this.taps / this.cfg.taps, bob = this.bob, to = { x: lerp(bob.to.x, this.tip.x + this.bs * .6, .75), y: lerp(bob.to.y, this.waterBot - this.bs * .1, .75) };
      bob.reelFrom = { x: bob.x, y: bob.y }; bob.reelTo = { x: lerp(bob.to.x, to.x, u), y: lerp(bob.to.y, to.y, u) }; bob.reelT = 0;
      this.splash(bob.x, bob.y, 7);
      if (this.taps >= this.cfg.taps) this.land();
    }
    land() {
      const F = this.fishNow, b = this.bob; this.mode = 'jump'; this.modeT = 0; this.jump = { from: { x: b.x, y: b.y }, to: { x: this.w / 2, y: this.h * .42 } };
      sfx.whoosh(); this.splash(b.x, b.y, 14);
      const first = !this.bag.caught[F.id]; this.isNew = first; this.bag.caught[F.id] = (this.bag.caught[F.id] || 0) + 1; this.bag.total++; this.counter.set(this.bag.total);
      if (first) store.addStars && store.addStars(1); store.save();
    }
    leaveCard() { this.mode = 'idle'; this.fishNow = null; this.bob = null; sfx.tap(); }
    splash(x, y, n) { this.fx.burst(x, y, n, { colors: ['#fff', '#cfeeff', '#9fd8f5'], speed: 150, g: 420, life: .7, size: 5 * this.sz(), up: 140 }); this.rings.push({ x, y, t: 0 }); sfx.pop(); }
    sz() { return clamp(Math.min(this.w, this.h * 1.3) / 780, .6, 1.5); }

    /* ---------------------------------------------------------------- the rounds */
    startWait() {
      const p = this.target, id = p.sp.fish[Math.floor(Math.random() * p.sp.fish.length)], size = .85 + Math.random() * .4;
      this.fishNow = { id, size }; this.mode = 'wait'; this.modeT = 0; this.waitFor = lerp(this.cfg.wait[0], this.cfg.wait[1], Math.random());
      const a = Math.random() * TAU, d = this.spotR(p) * 3.2; this.shadow = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * .45, p0: { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * .45 }, face: 1, ph: Math.random() * 6 };
    }
    update(dt) {
      this.modeT += dt; this.shake = Math.max(0, this.shake - dt * 3); this.rodHint = Math.max(0, this.rodHint - dt * 1.2); this.rodAng = lerp(this.rodAng, this.mode === 'ready' ? -.2 : this.mode === 'wait' || this.mode === 'bite' || this.mode === 'reel' ? .12 : 0, Math.min(1, dt * 5));
      for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < 1.2);
      const b = this.bob;
      if (this.mode === 'cast') {
        const u = clamp(this.modeT / .7, 0, 1); b.x = lerp(b.from.x, b.to.x, ease(u)); b.y = lerp(b.from.y, b.to.y, ease(u)) - Math.sin(u * Math.PI) * this.h * .22;
        if (u >= 1) { this.splash(b.x, b.y, 10); this.startWait(); }
      } else if (this.mode === 'wait') {
        const s = this.shadow, u = clamp(this.modeT / this.waitFor, 0, 1), tx = b.x, ty = b.y + this.bs * .12;
        s.x = lerp(s.p0.x, tx - this.bs * .5, ease(Math.min(1, u * 1.25))); s.y = lerp(s.p0.y, ty, ease(Math.min(1, u * 1.25))); s.face = tx - s.x >= 0 ? 1 : -1;
        if (Math.random() < dt * .8) this.rings.push({ x: b.x + (Math.random() - .5) * 8, y: b.y, t: .5 });
        if (u >= 1) { this.mode = 'bite'; this.modeT = 0; sfx.plink(2); this.shake = 1; if (!this.spoken.bite) { this.spoken.bite = true; voice.say('fish-bite'); } }
      } else if (this.mode === 'bite') {
        if (Math.random() < dt * 3) this.rings.push({ x: b.x, y: b.y, t: .4 });
        if (this.modeT > 6 && Math.floor(this.modeT * 2) % 5 === 0 && Math.random() < dt * 4) { this.shake = 1; sfx.plink(1); }   // still waiting: it keeps tugging, it never gets away
      } else if (this.mode === 'reel') {
        if (b.reelTo) { b.reelT = Math.min(1, (b.reelT || 0) + dt * 4); const e = ease(b.reelT); b.x = lerp(b.reelFrom.x, b.reelTo.x, e); b.y = lerp(b.reelFrom.y, b.reelTo.y, e); }
        if (this.tier === 3 && Math.random() < dt * 1.5) this.shake = .6;
      } else if (this.mode === 'jump') {
        const u = clamp(this.modeT / 1.0, 0, 1); b.x = lerp(this.jump.from.x, this.jump.to.x, ease(u)); b.y = lerp(this.jump.from.y, this.jump.to.y, ease(u)) - Math.sin(u * Math.PI) * this.h * .2;
        if (u >= 1) { this.mode = 'card'; this.modeT = 0; sfx.chime(); voice.say('fish/' + this.fishNow.id); this.fx.burst(this.w / 2, this.h * .42, 18, { colors: ['#ffd54a', '#fff', '#ff8aa3', '#7fd4f5'], speed: 260, g: 380, life: 1, size: 7 * this.sz(), shape: 'star', up: 160 }); }
      } else if (this.mode === 'card') { if (this.modeT > 5) this.leaveCard(); }
    }
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.update(dt); this.fx.update(dt); this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---------------------------------------------------------------- drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return; const night = SPG.night && SPG.night.on && SPG.night.on();
      // sky and far hills
      let g = c.createLinearGradient(0, 0, 0, this.waterTop + 10); g.addColorStop(0, night ? '#1d2358' : '#a9e1f3'); g.addColorStop(1, night ? '#3b4488' : '#e9f8ee'); c.fillStyle = g; c.fillRect(0, 0, w, this.waterTop + 10);
      if (night) { c.fillStyle = '#fff8d8'; c.beginPath(); c.arc(w * .8, h * .12, Math.min(w, h) * .05, 0, TAU); c.fill(); } else { c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(w * .82, h * .13, Math.min(w, h) * .06, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, k] of [[.2, .09, 1], [.55, .06, .8], [.72, .2, .7]]) { c.beginPath(); c.ellipse(w * x, h * y, w * .07 * k, h * .03 * k, 0, 0, TAU); c.ellipse(w * x + w * .04 * k, h * y - h * .01, w * .045 * k, h * .028 * k, 0, 0, TAU); c.fill(); } }
      c.fillStyle = night ? '#2c4a52' : '#a8d99a'; c.beginPath(); c.moveTo(0, this.waterTop + 4); c.quadraticCurveTo(w * .2, this.waterTop - h * .1, w * .45, this.waterTop - h * .02); c.quadraticCurveTo(w * .7, this.waterTop - h * .12, w, this.waterTop - h * .03); c.lineTo(w, this.waterTop + 8); c.lineTo(0, this.waterTop + 8); c.fill();
      c.fillStyle = night ? '#25423f' : '#7ec16f'; for (let i = 0; i < 9; i++) { const x = w * (i + .5) / 9, tr = h * (.04 + (i * 7 % 5) * .008); c.beginPath(); c.arc(x, this.waterTop - tr * .2, tr, Math.PI, 0); c.fill(); }
      // the pond
      g = c.createLinearGradient(0, this.waterTop, 0, h); g.addColorStop(0, night ? '#2a6a8a' : '#7fd4f0'); g.addColorStop(1, night ? '#173e5c' : '#3a9ec8'); c.fillStyle = g; c.fillRect(0, this.waterTop, w, h - this.waterTop);
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2; for (let k = 0; k < 14; k++) { const y = this.waterTop + (k + .5) / 14 * (this.waterBot - this.waterTop), amp = 3 + k * .5; c.beginPath(); for (let x = 0; x <= w; x += 14) { const yy = y + Math.sin(x * .02 + this.t * (.8 + k * .05) + k) * amp * .5; x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
      for (const p of this.pos) this.drawSpot(c, p);
      if (this.mode === 'wait' && this.shadow) { const s = this.shadow, F = this.fishNow; c.save(); c.translate(s.x, s.y); c.scale(s.face, 1); drawFish(c, F.id, this.bs * 1.2 * F.size, this.t, { sil: 'rgba(20,60,90,.4)', ph: s.ph }); c.restore(); }
      for (const r of this.rings) { const k = r.t / 1.2; c.strokeStyle = `rgba(255,255,255,${.7 * (1 - k)})`; c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.ellipse(r.x, r.y, 10 + k * this.bs, (10 + k * this.bs) * .4, 0, 0, TAU); c.stroke(); }
      this.drawDock(c); this.drawLine(c); this.fx.draw(c); this.drawButtons(c);
      if (this.mode === 'jump' || this.mode === 'card') this.drawCatch(c);
      if (this.mode === 'book') this.drawBook(c);
      if (night) { c.fillStyle = 'rgba(10,20,60,.25)'; c.fillRect(0, 0, w, h); }
    }
    drawSpot(c, p) {
      const R = this.spotR(p), { x, y } = p, id = p.sp.id, ready = this.mode === 'ready', pulse = 1 + Math.sin(this.t * 4 + x) * .06;
      c.save(); c.translate(x, y);
      // the water over the spot: a ring of ripples
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; for (let k = 0; k < 2; k++) { const u = (this.t * .35 + k * .5) % 1; c.globalAlpha = .6 * (1 - u); c.beginPath(); c.ellipse(0, 0, R * (.6 + u * .6), R * (.6 + u * .6) * .42, 0, 0, TAU); c.stroke(); } c.globalAlpha = 1;
      if (id === 'deep') { c.fillStyle = 'rgba(10,50,90,.35)'; c.beginPath(); c.ellipse(0, 0, R * 1.15, R * .5, 0, 0, TAU); c.fill(); }
      if (id === 'sand') { c.fillStyle = 'rgba(245,225,170,.55)'; c.beginPath(); c.ellipse(0, R * .05, R * 1.2, R * .5, 0, 0, TAU); c.fill(); }
      if (id === 'reeds') { for (const [dx, hh] of [[-1.0, 1.1], [-.8, .85], [.9, 1.0], [1.1, .8], [-1.2, .7]]) { c.strokeStyle = '#4f8a3e'; c.lineWidth = R * .09; c.beginPath(); c.moveTo(dx * R, R * .1); c.quadraticCurveTo(dx * R + R * .1, -R * hh * .5, dx * R + R * .05, -R * hh); c.stroke(); c.fillStyle = '#8a5a3a'; rr(c, dx * R + R * .05 - R * .07, -R * hh - R * .22, R * .14, R * .3, R * .07); c.fill(); } }
      if (id === 'lilies') { for (const [dx, dy, k] of [[-.95, .1, 1], [.9, .05, .85], [.2, -.45, .7]]) { c.fillStyle = '#4fae5e'; c.beginPath(); c.ellipse(dx * R, dy * R, R * .42 * k, R * .2 * k, 0, 0.25, TAU - .25); c.lineTo(dx * R, dy * R); c.fill(); } c.fillStyle = '#ff9ec4'; c.beginPath(); c.arc(.9 * R, -.02 * R, R * .13, 0, TAU); c.fill(); }
      if (id === 'rocks') { for (const [dx, dy, k, col] of [[-1.0, .15, 1, '#9aa3ad'], [-.7, .3, .7, '#b5bcc4'], [1.0, .1, .9, '#8c959f'], [.75, .3, .6, '#aab2bb']]) { c.fillStyle = col; c.beginPath(); c.ellipse(dx * R, dy * R, R * .38 * k, R * .26 * k, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(dx * R - R * .1 * k, dy * R - R * .08 * k, R * .14 * k, R * .07 * k, -.4, 0, TAU); c.fill(); } }
      if (ready) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.setLineDash([R * .22, R * .16]); c.lineDashOffset = -this.t * 18; c.beginPath(); c.ellipse(0, 0, R * 1.5 * pulse, R * .72 * pulse, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(0, 0, R * 1.5 * pulse, R * .72 * pulse, 0, 0, TAU); c.fill(); }
      c.restore();
    }
    drawDock(c) {
      const w = this.w, h = this.h, top = h - this.dockH;
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, top - 4, w, 8);
      let g = c.createLinearGradient(0, top, 0, h); g.addColorStop(0, '#d9a066'); g.addColorStop(1, '#b97c45'); c.fillStyle = g; c.fillRect(0, top, w, this.dockH);
      c.strokeStyle = 'rgba(90,50,20,.3)'; c.lineWidth = 3; for (let k = 1; k < 5; k++) { const y = top + this.dockH * k / 5; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } const pw = this.bs * 1.4; for (let x = (this.t * 0, 0); x < w; x += pw) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, h); c.stroke(); }
      // the fisher: her own pet, sitting on the dock with the rod
      const pet = SPG.pets && SPG.pets.active && SPG.pets.active(), bob = Math.sin(this.t * 2) * 2, cheer = this.mode === 'card' || this.mode === 'jump';
      c.save(); c.translate(this.petX, this.petY + bob);
      try { SPG.pets.draw(c, pet ? pet.id : 'bunny', this.petS, this.t, pet ? { mood: cheer ? 'cheer' : 'happy', hat: pet.hat, face: pet.face, neck: pet.neck } : { mood: cheer ? 'cheer' : 'happy' }); } catch (_) { /* no pet picture */ }
      c.restore();
      // the rod, from the paws up to the tip
      const sx = this.petX + this.petS * .18, sy = this.petY - this.petS * .32, tx = this.tip.x + Math.sin(this.rodAng * 2) * this.bs * .3 + (this.shake ? Math.sin(this.t * 60) * this.shake * 4 : 0), ty = this.tip.y - this.rodAng * this.bs * .5;
      c.strokeStyle = '#8a5a30'; c.lineWidth = Math.max(4, this.bs * .1); c.lineCap = 'round'; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo((sx + tx) / 2 + this.bs * .2, (sy + ty) / 2 - this.bs * .1, tx, ty); c.stroke();
      c.fillStyle = '#d8d8e0'; c.beginPath(); c.arc(sx + this.bs * .15, sy - this.bs * .1, this.bs * .13, 0, TAU); c.fill();
      this.tipNow = { x: tx, y: ty };
    }
    drawLine(c) {
      const b = this.bob, tip = this.tipNow || this.tip; if (!b || this.mode === 'idle' || this.mode === 'ready' || this.mode === 'book' && !b) return;
      const bx = b.x, by = b.y + (this.mode === 'bite' || this.mode === 'reel' ? Math.sin(this.t * 25) * 3 * (1 + this.shake) + this.bs * .12 * Math.min(1, this.modeT * 6) : Math.sin(this.t * 3) * 2);
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(tip.x, tip.y); c.quadraticCurveTo((tip.x + bx) / 2, Math.max(tip.y, by) + this.bs * (this.mode === 'cast' ? -.2 : .5), bx, by - this.bs * .2); c.stroke();
      if (this.mode === 'jump' || this.mode === 'card') return;
      const r = this.bs * .2; c.save(); c.translate(bx, by);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.fillStyle = '#ff5a6e'; c.beginPath(); c.arc(0, 0, r, Math.PI, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(-r * .35, -r * .4, r * .22, 0, TAU); c.fill();
      c.restore();
      if (this.mode === 'bite') { const k = 1 + Math.sin(this.t * 10) * .1; c.save(); c.translate(bx, by - this.bs * .95); c.scale(k, k); c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(0, 0, this.bs * .36, 0, TAU); c.fill(); c.fillStyle = INK; c.font = `800 ${this.bs * .5}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 0, this.bs * .03); c.restore(); }
    }
    drawButtons(c) {
      const rod = this.rod, book = this.book, on = this.mode === 'ready', hint = (this.mode === 'idle' && Math.sin(this.t * 4) > 0) || this.rodHint > 0;
      const circle = (b, fill, ring) => { c.fillStyle = 'rgba(90,63,94,.22)'; c.beginPath(); c.arc(b.x, b.y + b.r * .14, b.r, 0, TAU); c.fill(); c.fillStyle = fill; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); if (ring) { c.strokeStyle = ring; c.lineWidth = Math.max(4, b.r * .14); c.stroke(); } };
      const pop = this.rodHint > 0 ? 1 + Math.sin(this.t * 30) * .05 * this.rodHint : hint && this.mode === 'idle' ? 1.05 : 1;
      c.save(); c.translate(rod.x, rod.y); c.scale(pop, pop); c.translate(-rod.x, -rod.y);
      circle(rod, on ? '#fff6cc' : '#fff', on ? '#59b96e' : hint ? '#ffb74a' : null);
      c.save(); c.translate(rod.x, rod.y); const s = rod.r * .8; c.lineCap = 'round';
      c.strokeStyle = '#8a5a30'; c.lineWidth = s * .16; c.beginPath(); c.moveTo(-s * .8, s * .75); c.quadraticCurveTo(0, -s * .1, s * .85, -s * .8); c.stroke();
      c.strokeStyle = '#5a3f5e'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(s * .85, -s * .8); c.quadraticCurveTo(s * 1.0, -s * .1, s * .55, s * .5); c.stroke();
      c.fillStyle = '#ff5a6e'; c.beginPath(); c.arc(s * .55, s * .58, s * .16, 0, TAU); c.fill(); c.fillStyle = '#d8d8e0'; c.beginPath(); c.arc(-s * .35, s * .42, s * .2, 0, TAU); c.fill(); c.restore(); c.restore();
      circle(book, '#fff', null); c.save(); c.translate(book.x, book.y); const k = book.r * .75;
      c.fillStyle = '#4f93b0'; rr(c, -k, -k * .8, k * 2, k * 1.6, k * .2); c.fill(); c.fillStyle = '#fffaf0'; rr(c, -k * .8, -k * .65, k * 1.6, k * 1.3, k * .12); c.fill(); c.save(); c.translate(0, 0); drawFish(c, 'goldfish', k * 1.3, 1, { still: true }); c.restore(); c.restore();
      if (Object.keys(this.bag.caught).length) { c.fillStyle = '#59b96e'; c.beginPath(); c.arc(book.x + book.r * .75, book.y - book.r * .7, book.r * .34, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${book.r * .46}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(Object.keys(this.bag.caught).length), book.x + book.r * .75, book.y - book.r * .68); }
    }
    drawCatch(c) {
      const F = this.fishNow; if (!F) return; const w = this.w, h = this.h, big = Math.min(w * .7, h * .5);
      if (this.mode === 'jump') { const b = this.bob, u = clamp(this.modeT / 1.0, 0, 1); c.save(); c.translate(b.x, b.y); c.rotate(-.6 + u * .6 + Math.sin(this.t * 30) * .15); drawFish(c, F.id, lerp(this.bs * 1.4, big * .8, ease(u)) * F.size, this.t, { ph: 0 }); c.restore(); return; }
      c.fillStyle = 'rgba(90,63,94,.45)'; c.fillRect(0, 0, w, h);
      const k = Math.min(1, this.modeT * 3), rise = 1 - Math.pow(1 - k, 3);
      c.save(); c.translate(w / 2, h * .46); c.scale(rise, rise);
      c.fillStyle = '#fffaf0'; rr(c, -big * .62, -big * .5, big * 1.24, big * 1.05, 30); c.fill(); c.strokeStyle = '#ffd54a'; c.lineWidth = 8; c.stroke();
      c.save(); c.translate(0, -big * .08 + Math.sin(this.t * 3) * 4); c.rotate(Math.sin(this.t * 2) * .05); drawFish(c, F.id, big * .95 * F.size, this.t); c.restore();
      c.fillStyle = INK; c.font = `800 ${big * .16}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(FISH[F.id].name + '!', 0, big * .4);
      if (this.isNew) { c.fillStyle = '#ff8aa3'; rr(c, -big * .62, -big * .62, big * .5, big * .22, 14); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${big * .1}px Fredoka, system-ui`; c.fillText('NEW', -big * .37, -big * .51); }
      c.restore();
    }
    drawBook(c) {
      const w = this.w, h = this.h, pw = Math.min(w - 16, 720), ph = Math.min(h - 16, 560), x = (w - pw) / 2, y = (h - ph) / 2; c.fillStyle = 'rgba(90,63,94,.55)'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fffaf0'; rr(c, x, y, pw, ph, 28); c.fill();
      const cols = pw > ph ? 3 : 3, rows = 3, cw = (pw - 40) / cols, ch = (ph - 40) / rows;
      ALL.forEach((id, i) => {
        const cx = x + 20 + (i % cols) * cw + cw / 2, cy = y + 20 + Math.floor(i / cols) * ch + ch / 2, n = this.bag.caught[id] || 0;
        c.fillStyle = n ? '#e8f6ff' : '#eee8f2'; rr(c, cx - cw * .46, cy - ch * .46, cw * .92, ch * .92, 18); c.fill();
        c.save(); c.translate(cx + cw * .04, cy - ch * .06); drawFish(c, id, Math.min(cw * .62, ch * .86), this.t, n ? { still: false } : { sil: 'rgba(90,63,94,.3)' }); c.restore();
        if (n) { c.fillStyle = '#59b96e'; c.beginPath(); c.arc(cx + cw * .34, cy - ch * .32, Math.min(cw, ch) * .12, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${Math.min(cw, ch) * .15}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), cx + cw * .34, cy - ch * .31); c.fillStyle = INK; c.font = `700 ${Math.min(cw, ch) * .13}px Fredoka, system-ui`; c.fillText(FISH[id].name, cx, cy + ch * .36); }
        else { c.fillStyle = 'rgba(90,63,94,.45)'; c.font = `800 ${Math.min(cw, ch) * .2}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', cx, cy + ch * .33); }
      });
    }
    // geometry for the play-tests
    probe() { return { w: this.w, h: this.h, mode: this.mode, rod: this.rod, book: this.book, spots: this.pos.map(p => ({ id: p.sp.id, x: p.x, y: p.y, r: this.spotR(p) })), caught: this.bag.caught, total: this.bag.total, fish: this.fishNow && this.fishNow.id, taps: this.cfg.taps, tier: this.tier, bob: this.bob && { x: this.bob.x, y: this.bob.y } }; }
  }

  SPG.games.push({
    id: 'fishing', name: 'Fishing Pond', order: 14,
    icon(c, w, h) {
      let g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfeaf8'); g.addColorStop(.45, '#e9f8ee'); g.addColorStop(.46, '#7fd4f0'); g.addColorStop(1, '#3a9ec8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#a8d99a'; c.beginPath(); c.moveTo(0, h * .46); c.quadraticCurveTo(w * .3, h * .3, w * .6, h * .44); c.quadraticCurveTo(w * .85, h * .36, w, h * .44); c.lineTo(w, h * .47); c.lineTo(0, h * .47); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(w * .62, h * .72, w * (.1 + k * .07), h * (.04 + k * .025), 0, 0, TAU); c.stroke(); }
      c.save(); c.translate(w * .38, h * .74); drawFish(c, 'goldfish', w * .42, 1, { still: true }); c.restore();
      c.save(); c.translate(w * .68, h * .64); c.scale(-1, 1); drawFish(c, 'bass', w * .3, 2, { still: true }); c.restore();
      c.strokeStyle = '#8a5a30'; c.lineWidth = w * .03; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * .08, h * .46); c.quadraticCurveTo(w * .3, h * .1, w * .62, h * .12); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * .62, h * .12); c.lineTo(w * .62, h * .52); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(w * .62, h * .55, w * .045, 0, TAU); c.fill(); c.fillStyle = '#ff5a6e'; c.beginPath(); c.arc(w * .62, h * .55, w * .045, Math.PI, TAU); c.fill();
    },
    create: host => new FishingGame(host)
  });
})();
