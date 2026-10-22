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
      this.rings = []; this.spoken = {}; this.rodHint = 0; this.shake = 0; this.rodAng = 0; this.swim = []; this.bugs = []; this.nightLast = null; this.respawn = []; this.cardInfo = null;
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
      this.swim = this.swim.filter(f => f.hook); for (const f of [...this.swim, ...this.respawn]) if (f.home) f.home = this.pos.find(q => q.sp === f.home.sp) || null;
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
      // while a fish is on its way in the book cannot open (the button is right beside the rod she is tapping): a tap there reels instead
      if (/^(cast|wait|bite|reel|jump)$/.test(this.mode)) { if (this.mode === 'bite' || this.mode === 'reel') this.reelTap(); return; }
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
      sfx.whoosh(); this.splash(b.x, b.y, 14); this.dropHooked(); if (F.amb) F.amb = null;
      const first = !this.bag.caught[F.id]; this.isNew = first; this.bag.caught[F.id] = (this.bag.caught[F.id] || 0) + 1; this.bag.total++; this.counter.set(this.bag.total);
      if (first) store.addStars && store.addStars(1); store.save();
    }
    leaveCard() { this.dropHooked(); this.mode = 'idle'; this.fishNow = null; this.bob = null; sfx.tap(); }
    dropHooked() { const F = this.fishNow; if (F && F.amb) { this.swim = this.swim.filter(q => q !== F.amb); this.respawn.push({ t: 3 + Math.random() * 3, home: F.amb.home }); } }
    splash(x, y, n) { this.fx.burst(x, y, n, { colors: ['#fff', '#cfeeff', '#9fd8f5'], speed: 150, g: 420, life: .7, size: 5 * this.sz(), up: 140 }); this.rings.push({ x, y, t: 0 }); sfx.pop(); }
    sz() { return clamp(Math.min(this.w, this.h * 1.3) / 780, .6, 1.5); }

    /* ---------------------------------------------------------------- the pond comes alive: fish swimming by, bugs over the water, fish that leap for them */
    isNight() { return !!(SPG.night && SPG.night.on && SPG.night.on()); }
    waterY(u) { return this.waterTop + (this.waterBot - this.waterTop) * u; }
    // a fish for the pond: a resident of one spot (swims about near it) or a traveller that crosses the whole pond
    newFish(home, near) {
      const bs = this.bs, ids = home ? home.sp.fish : this.pool, id = ids[Math.floor(Math.random() * ids.length)], dir = Math.random() < .5 ? -1 : 1;
      const f = { id, size: .85 + Math.random() * .4, dir, ph: Math.random() * 6, home: home || null, depth: Math.random(), sp: .45 + Math.random() * .4, cool: 3 + Math.random() * 7, leap: null, hook: false, hunt: null, vx: 0 };
      if (home) { const R = this.spotR(home), a = Math.random() * TAU, d = near ? R * 3.2 : R * (.5 + Math.random() * 2.5); f.x = home.x + Math.cos(a) * d; f.y = clamp(home.y + Math.sin(a) * d * .45, this.waterY(.06), this.waterY(.94)); f.tx = f.x; f.ty = f.y; }
      else { f.x = dir > 0 ? -bs * 1.5 : this.w + bs * 1.5; f.y = this.waterY(.08 + Math.random() * .84); f.base = f.y; }
      return f;
    }
    newBug(kind) {
      const bs = this.bs, night = this.isNight(), k = kind || (night ? (Math.random() < .8 ? 'firefly' : 'moth') : ['fly', 'fly', 'fly', 'butterfly', 'dragonfly'][Math.floor(Math.random() * 5)]);
      const b = { k, cx: this.w * (.08 + Math.random() * .84), cy: this.waterY(.1 + Math.random() * .8), ph: Math.random() * 20, z: bs * (k === 'fly' ? .8 + Math.random() * .4 : k === 'dragonfly' ? .8 + Math.random() * .6 : k === 'firefly' ? .35 + Math.random() * .9 : .9 + Math.random() * .4), sp: .7 + Math.random() * .6, target: false, gone: false, frozen: false };
      b.x = b.cx; b.y = b.cy; return b;
    }
    updateLife(dt) {
      const w = this.w, h = this.h, bs = this.bs, night = this.isNight();
      if (!this.pool) this.pool = [...new Set(this.spots.flatMap(q => q.fish))];
      // keep one fish living at every spot and three travellers (also after the phone is turned, which empties the pond)
      const first = !this.swim.length && !this.respawn.length, lives = sp => this.swim.some(f => f.home && f.home.sp === sp) || this.respawn.some(r => r.home && r.home.sp === sp);
      for (const p of this.pos) if (!lives(p.sp)) this.swim.push(this.newFish(p));
      for (let i = this.swim.filter(f => !f.home).length + this.respawn.filter(r => !r.home).length; i < 3; i++) { const f = this.newFish(null); if (first) f.x = w * (.1 + Math.random() * .8); this.swim.push(f); }
      if (this.nightLast !== night) { this.nightLast = night; this.bugs = []; }
      const want = night ? { firefly: 8, moth: 2 } : { fly: 4, butterfly: 2, dragonfly: 1 };
      const have = {}; for (const b of this.bugs) have[b.k] = (have[b.k] || 0) + 1;
      for (const k of Object.keys(want)) if ((have[k] || 0) < want[k] && Math.random() < dt * .8) this.bugs.push(this.newBug(k));
      // bugs flutter about
      const T = this.t;
      for (const b of this.bugs) {
        if (b.frozen) continue; const p = b.ph + T * b.sp;
        if (b.k === 'fly') { b.x = b.cx + Math.sin(p * 3.1) * bs * .4 + Math.sin(p * 7.3) * bs * .12; b.y = b.cy + Math.cos(p * 2.3) * bs * .22 + Math.sin(p * 5.1) * bs * .08; }
        else if (b.k === 'dragonfly') { b.x = b.cx + Math.sin(p * .55) * w * .28; b.y = b.cy + Math.sin(p * .9 + 1) * bs * .7; b.cx = clamp(b.cx, w * .15, w * .85); }
        else if (b.k === 'firefly') { b.x = b.cx + Math.sin(p * .6) * bs * .9 + Math.sin(p * 1.7) * bs * .2; b.y = b.cy + Math.cos(p * .5) * bs * .45; }
        else { b.x = b.cx + Math.sin(p * .9) * bs * .9; b.y = b.cy + Math.sin(p * 1.3) * bs * .35; }   // butterflies and moths drift slowly
      }
      this.bugs = this.bugs.filter(b => !b.gone);
      // fish
      for (const r of this.respawn) r.t -= dt; for (const r of this.respawn.filter(q => q.t <= 0)) this.swim.push(this.newFish(r.home)); this.respawn = this.respawn.filter(q => q.t > 0);
      const yMin = this.waterY(.06), yMax = this.waterY(.94);
      for (const f of this.swim) {
        if (f.hook) continue;
        f.cool -= dt;
        if (f.leap) { this.updateLeap(f, dt); continue; }
        // hungry: pick a bug that is hovering over the water and swim to just before it
        if (f.cool <= 0 && !f.hunt && this.mode !== 'cast') { const prey = this.bugs.filter(b => !b.target && !b.frozen && b.k !== 'dragonfly' && b.x > bs && b.x < w - bs); const b = prey[Math.floor(Math.random() * prey.length)]; if (b && Math.hypot(b.x - f.x, b.y - f.y) < w * .55) { f.hunt = b; b.target = true; } else f.cool = 2 + Math.random() * 3; }
        let tx, ty, spd = f.sp * bs * .9;
        if (f.hunt) {
          const b = f.hunt; if (b.gone) { f.hunt = null; f.cool = 5; continue; }
          const face = b.x >= f.x ? 1 : -1; tx = b.x - face * bs * .55; ty = b.y; spd *= 2.4;
          if (Math.hypot(tx - f.x, ty - f.y) < bs * .22) { b.frozen = true; f.dir = face; f.leap = { t: 0, dur: .95, x0: f.x, y0: b.y, x1: b.x + face * bs * .55, H: Math.max(bs * .6, b.z), bug: b, ate: false }; this.splashAt(f.x, f.y, 7, true); continue; }
        } else if (f.home) {
          if (Math.hypot(f.tx - f.x, f.ty - f.y) < bs * .25) { const R = this.spotR(f.home), a = Math.random() * TAU; f.tx = clamp(f.home.x + Math.cos(a) * R * 3.4, bs, w - bs); f.ty = clamp(f.home.y + Math.sin(a) * R * 1.1, yMin, yMax); }
          tx = f.tx; ty = f.ty;
        } else { f.x += f.dir * f.sp * bs * dt * 1.1; f.y = clamp((f.base || f.y) + Math.sin(T * .8 + f.ph) * bs * .18, yMin, yMax); if (f.x < -bs * 2 || f.x > w + bs * 2) { f.gone = true; } if (Math.random() < dt * .25) this.rings.push({ x: f.x - f.dir * bs * .4, y: f.y, t: .6, soft: true }); continue; }
        const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, spd * dt); f.x += dx / d * st; f.y += dy / d * st; if (Math.abs(dx) > bs * .12) f.dir = dx > 0 ? 1 : -1;
        if (Math.random() < dt * .15) this.rings.push({ x: f.x - f.dir * bs * .4, y: f.y, t: .6, soft: true });
      }
      if (this.swim.some(f => f.gone)) { const gone = this.swim.filter(f => f.gone); this.swim = this.swim.filter(f => !f.gone); for (const f of gone) this.respawn.push({ t: 2 + Math.random() * 5, home: null }); }
      // a raindrop-sized ripple now and then
      if (Math.random() < dt * 1.2) this.rings.push({ x: w * Math.random(), y: this.waterY(.05 + Math.random() * .9), t: .7, soft: true });
    }
    updateLeap(f, dt) {
      const L = f.leap; L.t += dt; const u = clamp(L.t / L.dur, 0, 1);
      f.x = lerp(L.x0, L.x1, u); f.air = Math.sin(u * Math.PI) * L.H; f.y = L.y0;
      if (!L.ate && u >= .5) { L.ate = true; L.bug.gone = true; this.fx.burst(L.bug.x, L.bug.y - L.bug.z, 5, { colors: ['#fff', '#ffe9a0'], speed: 60, g: 80, life: .5, size: 3 * this.sz() }); }
      if (u >= 1) { f.leap = null; f.air = 0; f.hunt = null; f.cool = 6 + Math.random() * 8; this.splashAt(f.x, f.y, 9, true); }
    }
    // a splash of drops and a ring, not as loud as when she catches something
    splashAt(x, y, n, quiet) { this.fx.burst(x, y, n, { colors: ['#fff', '#cfeeff', '#9fd8f5'], speed: 130, g: 420, life: .7, size: 4 * this.sz(), up: 130 }); this.rings.push({ x, y, t: 0 }); if (quiet) { if (sfx.bubble) sfx.bubble(); } else sfx.pop(); }
    // a swimming fish: the same drawing as the fish she will catch, seen through the water
    drawSwimmer(c, f, night) {
      const bs = this.bs, depth = .35 + f.depth * .65, sc = bs * 1.2 * f.size;
      c.save(); c.translate(f.x, f.y); c.scale(f.dir, 1);
      c.globalAlpha = .4 + .2 * depth; drawFish(c, f.id, sc, this.t, { sil: night ? 'rgba(6,20,48,.6)' : 'rgba(20,70,105,.55)', ph: f.ph });
      c.globalAlpha = .3 * (1 - depth * .5); drawFish(c, f.id, sc, this.t, { ph: f.ph });
      c.restore(); c.globalAlpha = 1;
    }
    drawLeaper(c, f) {
      const L = f.leap, bs = this.bs, u = clamp(L.t / L.dur, 0, 1), sc = bs * 1.2 * f.size;
      // its shadow stays on the water; the fish is in the air
      c.fillStyle = 'rgba(10,50,80,.25)'; c.beginPath(); c.ellipse(f.x, f.y, sc * .4 * (1 - f.air / (L.H * 2.2)), sc * .13, 0, 0, TAU); c.fill();
      const vx = (L.x1 - L.x0) * f.dir * f.dir, vy = -Math.PI * Math.cos(u * Math.PI) * L.H;
      c.save(); c.translate(f.x, f.y - f.air); c.scale(f.dir, 1); c.rotate(Math.atan2(vy, Math.abs(L.x1 - L.x0))); drawFish(c, f.id, sc, this.t * 1.4, { ph: f.ph }); c.restore();
    }
    drawBug(c, b, night) {
      const bs = this.bs, x = b.x, y = b.y - b.z, T = this.t * 12 * b.sp + b.ph, u = bs * .1;
      if (b.k !== 'firefly') { c.fillStyle = 'rgba(10,50,80,.14)'; c.beginPath(); c.ellipse(b.x, b.y, u * 1.3, u * .5, 0, 0, TAU); c.fill(); }
      c.save(); c.translate(x, y); c.lineCap = 'round';
      if (b.k === 'fly') {
        const fl = Math.abs(Math.sin(T * 2)); c.fillStyle = 'rgba(255,255,255,.55)'; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * u * .5, -u * .3, u * .75, u * .28 * (.4 + fl), sd * .5, 0, TAU); c.fill(); }
        c.fillStyle = '#3a2f3e'; c.beginPath(); c.ellipse(0, 0, u * .4, u * .65, 0, 0, TAU); c.fill(); c.fillStyle = '#6b5a70'; c.beginPath(); c.arc(0, -u * .6, u * .3, 0, TAU); c.fill();
      } else if (b.k === 'dragonfly') {
        const ang = Math.cos(b.ph + this.t * .55 * b.sp) > 0 ? 0 : Math.PI; c.scale(Math.cos(ang), 1); const fl = Math.sin(T * 2) * .25;
        c.strokeStyle = '#2fb7c9'; c.lineWidth = u * .42; c.beginPath(); c.moveTo(-u * 2.2, 0); c.lineTo(u * 1.1, 0); c.stroke(); c.fillStyle = '#1e8fa3'; c.beginPath(); c.arc(u * 1.3, 0, u * .5, 0, TAU); c.fill();
        c.fillStyle = 'rgba(220,245,255,.6)'; for (const [dx, sd] of [[.5, -1], [.5, 1], [-.2, -1], [-.2, 1]]) { c.save(); c.translate(dx * u, 0); c.rotate(sd * (1.25 + fl)); c.beginPath(); c.ellipse(0, -u * 1.0, u * .3, u * 1.1, 0, 0, TAU); c.fill(); c.restore(); }
      } else if (b.k === 'firefly') {
        const gl = .5 + .5 * Math.sin(this.t * 2.2 * b.sp + b.ph * 3), r = u * (4 + gl * 4), g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(255,248,150,${.9 * gl})`); g.addColorStop(1, 'rgba(255,240,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.fillStyle = '#2a2433'; c.beginPath(); c.ellipse(0, -u * .05, u * .28, u * .45, 0, 0, TAU); c.fill(); c.fillStyle = `rgba(255,245,140,${.4 + .6 * gl})`; c.beginPath(); c.ellipse(0, u * .35, u * .24, u * .3, 0, 0, TAU); c.fill();
      } else {   // butterfly (day) and moth (night)
        const flap = Math.abs(Math.cos(T * (b.k === 'moth' ? .9 : .7))), col = b.k === 'moth' ? '#e8dcc4' : (['#ff8fb8', '#ffc24a', '#8fd0ff'][Math.floor(b.ph) % 3]);
        c.fillStyle = col; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * u * 1.1 * flap, -u * .5, u * 1.25 * flap + .5, u * 1.0, sd * .4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(sd * u * .8 * flap, u * .7, u * .85 * flap + .5, u * .75, -sd * .4, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,.55)'; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * u * 1.1 * flap, -u * .55, u * .3 * flap, 0, TAU); c.fill(); }
        c.fillStyle = '#4a3a4e'; c.beginPath(); c.ellipse(0, 0, u * .2, u * .9, 0, 0, TAU); c.fill();
        if (b.k === 'moth') { const r = u * 3, g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, 'rgba(255,245,200,.35)'); g.addColorStop(1, 'rgba(255,245,200,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); }
      }
      c.restore();
    }

    /* ---------------------------------------------------------------- the rounds */
    startWait() {
      const p = this.target, R = this.spotR(p);
      // the shadow she sees is a real fish already swimming here: the nearest one that lives at this spot is the one that bites (or a new one swims in)
      let f = this.swim.filter(q => !q.hook && !q.leap && p.sp.fish.includes(q.id)).map(q => ({ q, d: Math.hypot(q.x - p.x, (q.y - p.y) * 1.6) })).sort((u, v) => u.d - v.d)[0];
      f = f && f.d < Math.max(R * 6, this.w * .3) ? f.q : null;
      if (!f) { f = this.newFish(p, true); this.swim.push(f); }
      if (f.hunt) { f.hunt.target = false; f.hunt = null; }
      f.hook = true; this.fishNow = { id: f.id, size: f.size, amb: f }; this.mode = 'wait'; this.modeT = 0; this.waitFor = lerp(this.cfg.wait[0], this.cfg.wait[1], Math.random());
      this.shadow = { x: f.x, y: f.y, p0: { x: f.x, y: f.y }, face: f.dir, ph: f.ph };
    }
    update(dt) {
      this.modeT += dt; if (this.pos) this.updateLife(dt); this.shake = Math.max(0, this.shake - dt * 3); this.rodHint = Math.max(0, this.rodHint - dt * 1.2); this.rodAng = lerp(this.rodAng, this.mode === 'ready' ? -.2 : this.mode === 'wait' || this.mode === 'bite' || this.mode === 'reel' ? .12 : 0, Math.min(1, dt * 5));
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
      const c = this.ctx, w = this.w, h = this.h; if (!w) return; const night = this.isNight();
      // sky and far hills
      let g = c.createLinearGradient(0, 0, 0, this.waterTop + 10); g.addColorStop(0, night ? '#1d2358' : '#a9e1f3'); g.addColorStop(1, night ? '#3b4488' : '#e9f8ee'); c.fillStyle = g; c.fillRect(0, 0, w, this.waterTop + 10);
      if (night) { const mr = Math.min(w, h) * .055, mx = w * .8, my = h * .12, mg = c.createRadialGradient(mx, my, mr * .6, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,248,210,.45)'); mg.addColorStop(1, 'rgba(255,248,210,0)'); c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr * 4, 0, TAU); c.fill(); for (let i = 0; i < 46; i++) { const sx = (i * 97 % 100) / 100 * w, sy = (i * 53 % 100) / 100 * this.waterTop * .85, tw = .4 + .6 * Math.abs(Math.sin(this.t * 1.3 + i)); c.globalAlpha = tw; art.star(c, sx, sy, (1.5 + i % 3) * this.sz(), '#fff8c8', 0); } c.globalAlpha = 1; c.fillStyle = '#fff8d8'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill(); c.fillStyle = 'rgba(210,205,170,.55)'; for (const [dx, dy, k] of [[-.3, -.2, .25], [.25, .15, .2], [-.05, .35, .15]]) { c.beginPath(); c.arc(mx + dx * mr, my + dy * mr, mr * k, 0, TAU); c.fill(); } } else { c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(w * .82, h * .13, Math.min(w, h) * .06, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, k] of [[.2, .09, 1], [.55, .06, .8], [.72, .2, .7]]) { c.beginPath(); c.ellipse(w * x, h * y, w * .07 * k, h * .03 * k, 0, 0, TAU); c.ellipse(w * x + w * .04 * k, h * y - h * .01, w * .045 * k, h * .028 * k, 0, 0, TAU); c.fill(); } }
      c.fillStyle = night ? '#2c4a52' : '#a8d99a'; c.beginPath(); c.moveTo(0, this.waterTop + 4); c.quadraticCurveTo(w * .2, this.waterTop - h * .1, w * .45, this.waterTop - h * .02); c.quadraticCurveTo(w * .7, this.waterTop - h * .12, w, this.waterTop - h * .03); c.lineTo(w, this.waterTop + 8); c.lineTo(0, this.waterTop + 8); c.fill();
      c.fillStyle = night ? '#25423f' : '#7ec16f'; for (let i = 0; i < 9; i++) { const x = w * (i + .5) / 9, tr = h * (.04 + (i * 7 % 5) * .008); c.beginPath(); c.arc(x, this.waterTop - tr * .2, tr, Math.PI, 0); c.fill(); }
      // the pond
      g = c.createLinearGradient(0, this.waterTop, 0, h); g.addColorStop(0, night ? '#2a6a8a' : '#7fd4f0'); g.addColorStop(1, night ? '#173e5c' : '#3a9ec8'); c.fillStyle = g; c.fillRect(0, this.waterTop, w, h - this.waterTop);
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2; for (let k = 0; k < 14; k++) { const y = this.waterTop + (k + .5) / 14 * (this.waterBot - this.waterTop), amp = 3 + k * .5; c.beginPath(); for (let x = 0; x <= w; x += 14) { const yy = y + Math.sin(x * .02 + this.t * (.8 + k * .05) + k) * amp * .5; x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
      if (night) { const mx = w * .8; for (let k = 0; k < 16; k++) { const u = (k + .5) / 16, y = this.waterY(u * .96), half = (.05 + .5 * u) * this.bs * 1.4 * (.6 + .4 * Math.sin(this.t * 2 + k * 1.7)), x = mx + Math.sin(this.t * .9 + k) * this.bs * .25; c.fillStyle = `rgba(255,250,210,${.5 * (1 - u * .5)})`; c.beginPath(); c.ellipse(x, y, half, this.bs * .035, 0, 0, TAU); c.fill(); } }
      // the fish that are swimming by, seen through the water (the one she is fishing for is one of them)
      for (const f of this.swim) if (!f.hook && !f.leap) this.drawSwimmer(c, f, night);
      if (this.shadow && this.fishNow && (this.mode === 'wait' || this.mode === 'bite' || this.mode === 'reel')) { const s = this.shadow, F = this.fishNow, b = this.bob, at = this.mode === 'wait' ? s : { x: b.x - this.bs * .35 + Math.sin(this.t * 22) * 3 * (1 + this.shake), y: b.y + this.bs * .22, face: 1 }; this.drawSwimmer(c, { id: F.id, size: F.size, x: at.x, y: at.y, dir: at.face, ph: s.ph, depth: .3 }, night); }
      for (const p of this.pos) this.drawSpot(c, p);
      for (const r of this.rings) { const k = r.t / 1.2; c.strokeStyle = `rgba(255,255,255,${(r.soft ? .4 : .7) * (1 - k)})`; c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.ellipse(r.x, r.y, 10 + k * this.bs, (10 + k * this.bs) * .4, 0, 0, TAU); c.stroke(); }
      for (const f of this.swim) if (f.leap) this.drawLeaper(c, f);
      for (const b of this.bugs) this.drawBug(c, b, night);
      this.drawDock(c); this.drawLine(c); this.fx.draw(c); this.drawButtons(c);
      if (this.mode === 'jump' || this.mode === 'card') this.drawCatch(c);
      if (this.mode === 'book') this.drawBook(c);
    }
    drawSpot(c, p) {
      const R = this.spotR(p), { x, y } = p, id = p.sp.id, ready = this.mode === 'ready', pulse = 1 + Math.sin(this.t * 4 + x) * .06;
      c.save(); c.translate(x, y);
      // the water over the spot: a ring of ripples
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; for (let k = 0; k < 2; k++) { const u = (this.t * .35 + k * .5) % 1; c.globalAlpha = .6 * (1 - u); c.beginPath(); c.ellipse(0, 0, R * (.6 + u * .6), R * (.6 + u * .6) * .42, 0, 0, TAU); c.stroke(); } c.globalAlpha = 1;
      if (id === 'deep') { c.fillStyle = 'rgba(10,50,90,.35)'; c.beginPath(); c.ellipse(0, 0, R * 1.15, R * .5, 0, 0, TAU); c.fill(); }
      if (id === 'sand') { c.fillStyle = 'rgba(245,225,170,.55)'; c.beginPath(); c.ellipse(0, R * .05, R * 1.2, R * .5, 0, 0, TAU); c.fill(); }
      if (id === 'reeds') { for (const [dx, hh] of [[-1.0, 1.1], [-.8, .85], [.9, 1.0], [1.1, .8], [-1.2, .7]]) { c.strokeStyle = '#4f8a3e'; c.lineWidth = R * .09; c.beginPath(); c.moveTo(dx * R, R * .1); c.quadraticCurveTo(dx * R + R * .1, -R * hh * .5, dx * R + R * .05, -R * hh); c.stroke(); c.fillStyle = '#8a5a3a'; rr(c, dx * R + R * .05 - R * .07, -R * hh - R * .22, R * .14, R * .3, R * .07); c.fill(); } }
      if (id === 'lilies') { for (const [dx, dy, k] of [[-.95, .1, 1], [.9, .05, .85], [.2, -.45, .7]]) { c.fillStyle = '#4fae5e'; c.beginPath(); c.ellipse(dx * R + Math.sin(this.t * .6 + k * 3) * R * .07, dy * R + Math.cos(this.t * .5 + k * 2) * R * .03, R * .42 * k, R * .2 * k, Math.sin(this.t * .4 + k) * .12, 0.25, TAU - .25); c.lineTo(dx * R + Math.sin(this.t * .6 + k * 3) * R * .07, dy * R + Math.cos(this.t * .5 + k * 2) * R * .03); c.fill(); } c.fillStyle = '#ff9ec4'; c.beginPath(); c.arc(.9 * R, -.02 * R, R * .13, 0, TAU); c.fill(); }
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
      if (this.isNight()) {   // a lantern on the dock, and a little light at the end of the rod
        const lx = this.w * .93, ly = top + this.dockH * .1, g = c.createRadialGradient(lx, ly, 0, lx, ly, this.bs * 3.2); g.addColorStop(0, 'rgba(255,214,130,.55)'); g.addColorStop(1, 'rgba(255,214,130,0)'); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, this.bs * 3.2, 0, TAU); c.fill();
        c.fillStyle = '#6b4a2a'; c.fillRect(lx - this.bs * .05, ly, this.bs * .1, this.bs * .9); c.fillStyle = '#ffe9a8'; rr(c, lx - this.bs * .2, ly - this.bs * .3, this.bs * .4, this.bs * .4, this.bs * .08); c.fill(); c.strokeStyle = '#6b4a2a'; c.lineWidth = 3; c.stroke();
        const tg = c.createRadialGradient(tx, ty, 0, tx, ty, this.bs * .7); tg.addColorStop(0, 'rgba(255,240,170,.8)'); tg.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = tg; c.beginPath(); c.arc(tx, ty, this.bs * .7, 0, TAU); c.fill();
      }
    }
    drawLine(c) {
      const b = this.bob, tip = this.tipNow || this.tip; if (!b || this.mode === 'idle' || this.mode === 'ready' || this.mode === 'book' && !b) return;
      const bx = b.x, by = b.y + (this.mode === 'bite' || this.mode === 'reel' ? Math.sin(this.t * 25) * 3 * (1 + this.shake) + this.bs * .12 * Math.min(1, this.modeT * 6) : Math.sin(this.t * 3) * 2);
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(tip.x, tip.y); c.quadraticCurveTo((tip.x + bx) / 2, Math.max(tip.y, by) + this.bs * (this.mode === 'cast' ? -.2 : .5), bx, by - this.bs * .2); c.stroke();
      if (this.mode === 'jump' || this.mode === 'card') return;
      const r = this.bs * .2; if (this.isNight() && this.mode !== 'cast') { const hg = c.createRadialGradient(bx, by, 0, bx, by, this.bs * 1.1); hg.addColorStop(0, 'rgba(255,235,160,.7)'); hg.addColorStop(1, 'rgba(255,235,160,0)'); c.fillStyle = hg; c.beginPath(); c.arc(bx, by, this.bs * 1.1, 0, TAU); c.fill(); }
      c.save(); c.translate(bx, by);
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
    // how big (the length of a size-1 fish) a species may be drawn to fit inside a box: the fish is about 1.3 lengths wide and 1.8 body heights tall
    fitS(id, aw, ah) { const sp = FISH[id]; return Math.min(aw / (1.3 * sp.len), ah / (1.8 * sp.len * sp.hr)); }
    cardBox() { const w = this.w, h = this.h, cw = Math.min(w * .9, h * 1.2, 600), ch = Math.min(h * .84, cw * .9); return { x: w / 2 - cw / 2, y: h * .47 - ch / 2, w: cw, h: ch }; }
    catchSize(F, box) { return this.fitS(F.id, box.w * .8, box.h * .5) * (.86 + .14 * clamp((F.size - .85) / .4, 0, 1)); }
    drawCatch(c) {
      const F = this.fishNow; if (!F) return; const w = this.w, h = this.h, box = this.cardBox(), fs = this.catchSize(F, box);
      this.cardInfo = { box, fish: { w: 1.3 * FISH[F.id].len * fs, h: 1.8 * FISH[F.id].len * FISH[F.id].hr * fs } };
      if (this.mode === 'jump') { const b = this.bob, u = clamp(this.modeT / 1.0, 0, 1); c.save(); c.translate(b.x, b.y); c.rotate(-.6 + u * .6 + Math.sin(this.t * 30) * .15); drawFish(c, F.id, lerp(this.bs * 1.2 * F.size, fs, ease(u)), this.t, { ph: 0 }); c.restore(); return; }
      c.fillStyle = 'rgba(90,63,94,.45)'; c.fillRect(0, 0, w, h);
      const k = Math.min(1, this.modeT * 3), rise = 1 - Math.pow(1 - k, 3), cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      c.save(); c.translate(cx, cy); c.scale(rise, rise);
      c.fillStyle = '#fffaf0'; rr(c, -box.w / 2, -box.h / 2, box.w, box.h, 30); c.fill(); c.strokeStyle = '#ffd54a'; c.lineWidth = 8; c.stroke();
      c.save(); c.translate(0, -box.h * .08 + Math.sin(this.t * 3) * 3); c.rotate(Math.sin(this.t * 2) * .04); drawFish(c, F.id, fs, this.t); c.restore();
      const name = FISH[F.id].name + '!'; let fz = box.h * .13; c.font = `800 ${fz}px Fredoka, system-ui`; const tw = c.measureText(name).width; if (tw > box.w * .8) { fz *= box.w * .8 / tw; c.font = `800 ${fz}px Fredoka, system-ui`; }
      c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 0, box.h * .36);
      if (this.isNew) { const bw = box.w * .22, bh = box.h * .1; c.fillStyle = '#ff8aa3'; rr(c, -box.w / 2 + 12, -box.h / 2 + 12, bw, bh, 12); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${bh * .62}px Fredoka, system-ui`; c.fillText('NEW', -box.w / 2 + 12 + bw / 2, -box.h / 2 + 12 + bh / 2 + 1); }
      c.restore();
    }
    drawBook(c) {
      const w = this.w, h = this.h, pw = Math.min(w - 16, 720), ph = Math.min(h - 16, 560), x = (w - pw) / 2, y = (h - ph) / 2; c.fillStyle = 'rgba(90,63,94,.55)'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fffaf0'; rr(c, x, y, pw, ph, 28); c.fill();
      const cols = pw > ph ? 3 : 3, rows = 3, cw = (pw - 40) / cols, ch = (ph - 40) / rows;
      ALL.forEach((id, i) => {
        const cx = x + 20 + (i % cols) * cw + cw / 2, cy = y + 20 + Math.floor(i / cols) * ch + ch / 2, n = this.bag.caught[id] || 0;
        c.fillStyle = n ? '#e8f6ff' : '#eee8f2'; rr(c, cx - cw * .46, cy - ch * .46, cw * .92, ch * .92, 18); c.fill();
        c.save(); c.translate(cx + cw * .04, cy - ch * .06); drawFish(c, id, this.fitS(id, cw * .7, ch * .5), this.t, n ? { still: false } : { sil: 'rgba(90,63,94,.3)' }); c.restore();
        if (n) { c.fillStyle = '#59b96e'; c.beginPath(); c.arc(cx + cw * .34, cy - ch * .32, Math.min(cw, ch) * .12, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${Math.min(cw, ch) * .15}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), cx + cw * .34, cy - ch * .31); c.fillStyle = INK; c.font = `700 ${Math.min(cw, ch) * .13}px Fredoka, system-ui`; c.fillText(FISH[id].name, cx, cy + ch * .36); }
        else { c.fillStyle = 'rgba(90,63,94,.45)'; c.font = `800 ${Math.min(cw, ch) * .2}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', cx, cy + ch * .33); }
      });
    }
    // geometry for the play-tests
    probe() { return { w: this.w, h: this.h, mode: this.mode, rod: this.rod, book: this.book, spots: this.pos.map(p => ({ id: p.sp.id, x: p.x, y: p.y, r: this.spotR(p) })), caught: this.bag.caught, total: this.bag.total, fish: this.fishNow && this.fishNow.id, taps: this.cfg.taps, tier: this.tier, bob: this.bob && { x: this.bob.x, y: this.bob.y }, swim: this.swim.map(f => ({ id: f.id, x: f.x, y: f.y, hook: f.hook, leap: !!f.leap, home: f.home && f.home.sp.id })), bugs: this.bugs.map(b => ({ k: b.k, x: b.x, y: b.y })), night: this.isNight(), hooked: this.fishNow && this.fishNow.amb ? this.fishNow.amb.id : null, card: this.cardInfo }; }
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
