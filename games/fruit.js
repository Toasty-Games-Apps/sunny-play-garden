// Fruit Splash: swipe (or just tap) the happy fruit floating up. No timer, no game over.
// Little kids: only fruit, plus glowing bonus fruit and a rare golden star.
// Big kids (a grown-up sets this in the Grown-ups panel): naughty water balloons float up too. Popping one
// shakes the screen, sprays water everywhere and takes a few points away.
// Themes (the palette button): Classic (a new place every 40 fruits), Neon, Candy, Space and Ocean.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const THEMES = [{ id: 'classic', name: 'Classic' }, { id: 'neon', name: 'Neon' }, { id: 'candy', name: 'Candy' }, { id: 'space', name: 'Space' }, { id: 'ocean', name: 'Ocean' }];
  const NEON = ['#ff2bd6', '#00f0ff', '#c6ff00', '#ff9d00', '#8a5bff', '#ff3d6e'];   // one glow color per fruit type
  const GLOW_POINTS = 5, BALLOON_COST = 5;

  /* ------------------------------------------------------------ backdrops for the themes (classic uses the scenery) */
  function backdrop(id, c, w, h, t) {
    if (id === 'neon') {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0420'); g.addColorStop(.6, '#2b0a55'); g.addColorStop(1, '#12002b'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 50; i++) { c.globalAlpha = .3 + Math.sin(t * 2 + i) * .3; c.fillStyle = '#fff'; c.fillRect(hash(i) * w, hash(i + 60) * h * .6, 2, 2); } c.globalAlpha = 1;
      const hy = h * .62, sr = Math.min(w, h) * .2, sg = c.createLinearGradient(0, hy - sr * 2, 0, hy); sg.addColorStop(0, '#ff3d9a'); sg.addColorStop(1, '#ffb400');
      c.save(); c.beginPath(); c.arc(w / 2, hy - sr * .2, sr, Math.PI, 0); c.clip(); c.fillStyle = sg; c.shadowColor = '#ff3d9a'; c.shadowBlur = 40; c.fillRect(w / 2 - sr, hy - sr * 1.3, sr * 2, sr * 1.3); c.shadowBlur = 0; c.fillStyle = '#12002b'; for (let k = 1; k < 6; k++) c.fillRect(w / 2 - sr, hy - sr * .2 - k * sr * .17, sr * 2, sr * .02 * k); c.restore();
      c.strokeStyle = '#00f0ff'; c.shadowColor = '#00f0ff'; c.shadowBlur = 12; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, hy); c.lineTo(w, hy); c.stroke();
      for (let k = 0; k < 9; k++) { const u = ((k + (t * .5) % 1) / 9), y = hy + Math.pow(u, 2.2) * (h - hy); c.globalAlpha = .25 + u * .7; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.globalAlpha = .7; for (let k = -8; k <= 8; k++) { c.beginPath(); c.moveTo(w / 2 + k * w * .02, hy); c.lineTo(w / 2 + k * w * .16, h); c.stroke(); }
      c.globalAlpha = 1; c.shadowBlur = 0;
    } else if (id === 'candy') {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffd1ea'); g.addColorStop(.6, '#fff0f8'); g.addColorStop(1, '#d6f7ee'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) { const x = w * (.12 + i * .2), y = h * (.28 + (i % 2) * .16), r = Math.min(w, h) * (.09 + (i % 3) * .015); c.strokeStyle = '#f2c9a0'; c.lineWidth = r * .16; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y + r); c.lineTo(x, y + r * 3.4); c.stroke(); c.save(); c.translate(x, y); c.rotate(Math.sin(t * .5 + i) * .08); ['#ff7aa8', '#fff', '#ff7aa8', '#fff', '#ff7aa8'].forEach((col, k) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * (1 - k * .19), 0, TAU); c.fill(); }); c.strokeStyle = '#ffd1ea'; c.lineWidth = r * .09; c.beginPath(); for (let a = 0; a < 12; a += .3) c.lineTo(Math.cos(a) * a * r * .08, Math.sin(a) * a * r * .08); c.stroke(); c.restore(); }
      for (let i = 0; i < 40; i++) { const y = ((t * (12 + hash(i) * 20) + hash(i + 9) * h) % h), x = hash(i + 33) * w; c.fillStyle = ['#ff7aa8', '#7fd4f5', '#ffd54a', '#a6e05a'][i % 4]; c.save(); c.translate(x, y); c.rotate(t + i); c.fillRect(-6, -2, 12, 4); c.restore(); }
      c.fillStyle = '#ffb3d1'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w + 30; x += 30) c.lineTo(x, h * .88 + Math.sin(x / 70) * h * .025); c.lineTo(w, h); c.fill(); c.fillStyle = '#c9f2e3'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w + 30; x += 30) c.lineTo(x, h * .94 + Math.sin(x / 55 + 1) * h * .02); c.lineTo(w, h); c.fill();
    } else if (id === 'space') {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#050a24'); g.addColorStop(.7, '#1d1656'); g.addColorStop(1, '#3a1f70'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const ng = c.createRadialGradient(w * .7, h * .35, 0, w * .7, h * .35, w * .5); ng.addColorStop(0, 'rgba(180,90,255,.3)'); ng.addColorStop(1, 'rgba(180,90,255,0)'); c.fillStyle = ng; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { c.globalAlpha = .3 + Math.sin(t * 1.5 + i) * .35; c.fillStyle = i % 5 ? '#fff' : '#ffe9a8'; const s = 1 + hash(i + 3) * 2.5; c.fillRect(hash(i) * w, hash(i + 40) * h, s, s); } c.globalAlpha = 1;
      const pr = Math.min(w, h) * .12; c.fillStyle = '#ff9d6e'; c.beginPath(); c.arc(w * .16, h * .3, pr, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = pr * .12; c.beginPath(); c.ellipse(w * .16, h * .3, pr * 1.7, pr * .4, -.3, 0, TAU); c.stroke(); c.fillStyle = '#7fd4f5'; c.beginPath(); c.arc(w * .82, h * .68, pr * .8, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < 3; k++) c.fillRect(w * .82 - pr * .8, h * .68 - pr * .3 + k * pr * .28, pr * 1.6, pr * .12);
      const u = (t * .15) % 1; if (u < .3) { const x = w * (1 - u * 3.3), y = h * (.1 + u * 1.5); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 90, y - 30); c.stroke(); }
    } else if (id === 'ocean') {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6fd8f5'); g.addColorStop(.6, '#1d8fd0'); g.addColorStop(1, '#0a4f8f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) { const x = w * (.1 + i * .22) + Math.sin(t * .4 + i) * 30; c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w * .06, 0); c.lineTo(x + w * .2, h); c.lineTo(x - w * .05, h); c.fill(); }
      for (let i = 0; i < 26; i++) { const y = h - ((t * (20 + hash(i) * 30) + hash(i + 9) * h) % (h + 40)) + 20, x = hash(i + 50) * w + Math.sin(t + i) * 12, r = 3 + hash(i + 5) * 9; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); }
      for (let i = 0; i < 3; i++) { const x = ((t * (25 + i * 12) + i * w * .4) % (w + 200)) - 100, y = h * (.25 + i * .18); c.fillStyle = 'rgba(255,190,90,.7)'; c.save(); c.translate(x, y + Math.sin(t * 2 + i) * 8); c.beginPath(); c.ellipse(0, 0, 34, 16, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-28, 0); c.lineTo(-52, -14); c.lineTo(-52, 14); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(16, -3, 4, 0, TAU); c.fill(); c.restore(); }
      c.fillStyle = '#e8cf9a'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w + 30; x += 30) c.lineTo(x, h * .93 + Math.sin(x / 90) * h * .02); c.lineTo(w, h); c.fill();
      c.strokeStyle = '#2f9a5a'; c.lineWidth = 7; c.lineCap = 'round'; for (let i = 0; i < 9; i++) { const x = w * (.05 + i * .11), sw = Math.sin(t * 1.5 + i) * 10; c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x + sw, h * .88, x + sw * 1.6, h * .8 - (i % 3) * 14); c.stroke(); }
    }
  }
  const TRAIL = {
    classic: [['rgba(255,122,154,.55)', 22], ['rgba(255,255,255,.95)', 7]], neon: [['rgba(0,240,255,.35)', 26], ['#7ffcff', 8], ['#fff', 3]], candy: [['rgba(255,122,168,.55)', 22], ['#fff', 7]],
    space: [['rgba(140,120,255,.5)', 24], ['#e6e0ff', 7]], ocean: [['rgba(255,255,255,.35)', 24], ['#d6f5ff', 8]]
  };
  const JUICE = { neon: ['#00f0ff', '#ff2bd6', '#c6ff00'], candy: ['#ff7aa8', '#fff', '#ffd54a', '#7fd4f5'], space: ['#ffe9a8', '#b58cf0', '#7fd4f5'], ocean: ['#d6f5ff', '#fff', '#8fe0ff'] };

  // A naughty water balloon: pale and shiny, with a knot and a sly little face.
  function balloon(c, r, t, wow, hue) {
    const cols = [['#b9ecff', '#3aa8f0'], ['#ffd1e8', '#ff6fae'], ['#d9ffc6', '#5fd05a']][hue % 3];
    c.save(); const wob = 1 + Math.sin(t * 6) * .03; c.scale(1 / wob, wob); c.lineJoin = 'round';
    const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.1); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -r * 1.02); c.bezierCurveTo(r * .95, -r * .95, r * 1.0, r * .55, 0, r * .95); c.bezierCurveTo(-r * 1.0, r * .55, -r * .95, -r * .95, 0, -r * 1.02); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = r * .07; c.stroke();
    c.fillStyle = cols[1]; c.beginPath(); c.moveTo(0, r * .95); c.lineTo(-r * .2, r * 1.2); c.lineTo(r * .2, r * 1.2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-r * .42, -r * .45, r * .14, r * .3, .5, 0, TAU); c.fill();
    c.fillStyle = '#5a3f5e';
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * r * .3, -r * .05, r * .09, wow ? r * .14 : r * .1, 0, 0, TAU); c.fill(); c.lineWidth = r * .06; c.strokeStyle = '#5a3f5e'; c.beginPath(); c.moveTo(sd * r * .48, -r * (wow ? .3 : .18)); c.lineTo(sd * r * .14, -r * (wow ? .27 : .3)); c.stroke(); }
    c.strokeStyle = '#5a3f5e'; c.lineWidth = r * .07; c.lineCap = 'round'; c.beginPath(); if (wow) c.arc(0, r * .3, r * .1, 0, TAU); else { c.moveTo(-r * .22, r * .22); c.quadraticCurveTo(r * .05, r * .42, r * .28, r * .16); } c.stroke();
    c.restore();
  }

  class FruitGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'game-canvas';
      host.append(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.fx = new art.Fx();
      this.fruits = []; this.halves = []; this.splats = []; this.floats = []; this.drips = []; this.rings = [];
      this.t = 0; this.starIn = 12 + Math.random() * 8; this.glowIn = 8 + Math.random() * 6; this.balloonIn = 6; this.sliced = 0; this.recent = []; this.lastSwoosh = 0; this.lastPraise = 0;
      this.shake = 0; this.wetK = 0;
      this.running = false; this.ptrs = new Map(); this.faded = []; // up to 5 fingers at once
      this.bag = store.bag('fruit', () => ({ total: 0 }));
      this.bag.theme = this.bag.theme || 'classic';
      this.scenic = SPG.scenery.fader(this.sceneAt(this.bag.total));
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s / 2 + 2); art.fruit(c, 2, s * .36, {}); }, this.bag.total);
      this.buildThemeUI();
      this.tick = this.tick.bind(this);
      const cv = this.canvas;
      cv.addEventListener('pointerdown', e => this.down(e));
      cv.addEventListener('pointermove', e => this.move(e));
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(t, e => this.up(e));
    }
    get tier() { return SPG.level.tier('fruit'); }
    get big() { return this.tier >= 3; }   // older kids: sly water balloons

    /* ------------------------------------------------------------ the theme picker */
    buildThemeUI() {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'fruit-theme-btn'; btn.setAttribute('aria-label', SPG.t('Themes'));
      const cv = document.createElement('canvas'); cv.width = cv.height = 72; btn.append(cv); this.themeBtn = btn;
      const c = cv.getContext('2d'); c.translate(36, 38);
      c.fillStyle = '#e8c9a0'; c.beginPath(); c.ellipse(0, 0, 26, 21, -.2, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(11, 8, 5, 0, TAU); c.fill();
      [['#ff6b81', -15, -5], ['#ffd54a', -4, -13], ['#5cc8f2', 9, -9], ['#7ed957', -15, 8]].forEach(([col, x, y]) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fill(); });
      const panel = document.createElement('div'); panel.className = 'fruit-themes hidden'; this.themePanel = panel;
      this.tiles = THEMES.map(th => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ft-tile'; b.setAttribute('aria-label', SPG.t(th.name));
        const tc = document.createElement('canvas'); tc.width = 200; tc.height = 130; b.append(tc); this.drawThumb(tc, th.id);
        SPG.ui.press(b, () => { this.setTheme(th.id); });
        return [th.id, b];
      });
      panel.append(...this.tiles.map(x => x[1]));
      SPG.ui.press(btn, () => { panel.classList.toggle('hidden'); sfx.tap(); this.markTheme(); });
      this.host.append(btn, panel); this.markTheme();
    }
    drawThumb(cv, id) {
      const c = cv.getContext('2d'), w = cv.width, h = cv.height;
      if (id === 'classic') SPG.scenery.draw(c, w, h, 3, 'meadow', { weather: false }); else backdrop(id, c, w, h, 2);
      c.save(); c.translate(w * .3, h * .62); c.save(); if (id === 'neon') { c.shadowColor = NEON[2]; c.shadowBlur = 16; } art.fruit(c, 3, 30, {}); c.restore(); c.restore();
      c.save(); c.translate(w * .68, h * .5); if (id === 'neon') { c.shadowColor = NEON[0]; c.shadowBlur = 16; } art.fruit(c, 0, 34, { mood: 'wow' }); c.restore();
    }
    markTheme() { for (const [id, b] of this.tiles) b.classList.toggle('on', id === this.bag.theme); }
    setTheme(id) { this.bag.theme = id; store.save(); this.markTheme(); this.themePanel.classList.add('hidden'); sfx.chime(); this.fx.burst(this.w / 2, this.h / 2, 18, { colors: ['#fff', '#ffd54a', '#7fd4f5', '#ff9db8'], speed: 320, g: 200, life: .9, size: 7, shape: 'star', up: 120 }); }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const ow = this.w || r.width, oh = this.h || r.height;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const f of [...this.fruits, ...this.halves]) { f.x *= this.w / ow; f.y *= this.h / oh; f.vx *= this.w / ow; f.vy *= this.h / oh; }
      this.draw();
    }

    start() { this.resize(); this.spawnIn = .4; this.resume(); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.ptrs.clear(); this.faded.length = 0; }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); this.themeBtn.remove(); this.themePanel.remove(); }

    point(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height, time: performance.now() };
    }

    down(e) {
      if (!this.running || (this.ptrs.size >= 5 && !this.ptrs.has(e.pointerId))) return;
      e.preventDefault();
      this.themePanel.classList.add('hidden');
      try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
      const p = this.point(e);
      this.ptrs.set(e.pointerId, { last: p, trail: [p] });
      this.slice(p, p, 1.2); // a tap counts as a slice
    }

    move(e) {
      const st = this.ptrs.get(e.pointerId);
      if (!this.running || !st) return;
      e.preventDefault();
      for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) {
        const next = this.point(ev);
        const speed = Math.hypot(next.x - st.last.x, next.y - st.last.y);
        if (speed > 14 && next.time - this.lastSwoosh > 240) { sfx.whoosh(); this.lastSwoosh = next.time; }
        this.slice(st.last, next, 1);
        st.last = next; st.trail.push(next);
        if (speed > 6) this.fx.burst(next.x, next.y, 1, { colors: this.bag.theme === 'neon' ? ['#00f0ff', '#ff2bd6'] : ['#fff', '#ffd1e0', '#ffe98a'], speed: 40, g: 0, life: .4, size: 4 });
      }
      if (st.trail.length > 26) st.trail.splice(0, st.trail.length - 26);
    }

    up(e) {
      const st = this.ptrs.get(e.pointerId);
      if (!st) return;
      this.ptrs.delete(e.pointerId);
      this.faded.push(st.trail); // let the finished swipe fade out instead of vanishing
    }

    // A whole segment catches fruit even when a fast swipe skips over it between events.
    static hits(a, b, c, mul) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const x = a.x + t * dx - c.x, y = a.y + t * dy - c.y;
      return x * x + y * y <= (c.r * .9 * mul) ** 2;
    }

    slice(a, b, mul) {
      for (let i = this.fruits.length - 1; i >= 0; i--) {
        const f = this.fruits[i];
        if (!FruitGame.hits(a, b, f, mul)) continue;
        this.fruits.splice(i, 1);
        this.cut(f);
      }
    }

    // A rare golden star: slicing it rains stars and gives a little bonus.
    spawnStar() {
      const g = this.h * 1.05, r = Math.max(44, Math.min(84, Math.min(this.w * .11, this.h * .1)));
      const x = this.w * (.25 + Math.random() * .5);
      this.fruits.push({ x, y: this.h + r + 6, vx: (this.w / 2 - x) * .25, vy: -Math.sqrt(2 * g * this.h * .62), r, special: true, type: 0, rotation: 0, vr: .8, wow: 0, blink: 9 });
    }

    cutStar(f) {
      store.addStars(2); sfx.win(); voice.praise();
      this.fx.burst(f.x, f.y, 30, { colors: ['#ffd54a', '#fff3b0', '#ffb347'], speed: 420, g: 500, life: 1.2, size: f.r * .22, shape: 'star', up: 160 });
      for (let i = 0; i < 26; i++) this.fx.p.push({ x: Math.random() * this.w, y: -20 - Math.random() * this.h * .3, vx: (Math.random() - .5) * 60, vy: 120 + Math.random() * 180, g: 180, life: 2 + Math.random(), max: 2.5, size: 9 + Math.random() * 12, color: ['#ffd54a', '#fff3b0', '#ff9db8', '#a6e8c8'][i % 4], shape: 'star', rot: Math.random() * 6, vr: (Math.random() - .5) * 5 });
      for (let i = 0; i < 6; i++) sfx.plink(i);
    }

    addPoints(n) {
      this.bag.total = Math.max(0, this.bag.total + n); this.counter.set(this.bag.total); store.save();
      const sc = this.sceneAt(this.bag.total);
      if (n > 0 && sc !== this.scenic.id) { this.scenic.set(sc); sfx.chime(); this.fx.burst(this.w / 2, this.h * .3, 22, { colors: ['#ffd54a', '#fff', '#ff9db8', '#a6e8c8'], speed: 320, g: 300, life: 1.2, size: 8, shape: 'star', up: 200 }); }   // every 40 fruits: somewhere new
    }
    float(x, y, text, col) { this.floats.push({ x, y, text, col, life: 1.6 }); }

    // A glowing bonus fruit: worth five, with a star.
    cutGlow(f) {
      this.addPoints(GLOW_POINTS); store.addStars(1); this.sliced++;
      sfx.win(); voice.praise();
      this.float(f.x, f.y - f.r, '+' + GLOW_POINTS, '#ffe066');
      this.fx.burst(f.x, f.y, 34, { colors: ['#ff6b81', '#ffd54a', '#7ed957', '#5cc8f2', '#b58cf0', '#fff'], speed: 460, g: 300, life: 1.2, size: f.r * .17, shape: 'star', up: 140 });
      this.rings.push({ x: f.x, y: f.y, r: f.r, life: 1, col: '#ffe066' });
    }

    // A water balloon pops: the screen shakes, water sprays everywhere and a few points are lost.
    popBalloon(f) {
      this.shake = 1; this.wetK = 1;
      const lost = Math.min(BALLOON_COST, this.bag.total); this.addPoints(-BALLOON_COST);
      this.float(f.x, f.y - f.r, lost ? '-' + lost : 'Splash!', '#2f8fdd');
      this.fx.burst(f.x, f.y, 90, { colors: ['#bfe9ff', '#6cc6f5', '#fff', '#3aa8f0'], speed: 950, g: 1500, life: 1.1, size: 9, up: 380 });
      for (let k = 0; k < 40; k++) this.fx.p.push({ x: Math.random() * this.w, y: -10 - Math.random() * this.h * .3, vx: (Math.random() - .5) * 240, vy: 200 + Math.random() * 500, g: 1300, life: 1.2 + Math.random(), max: 1.6, size: 4 + Math.random() * 8, color: ['#bfe9ff', '#6cc6f5', '#fff'][k % 3], shape: 'circle', rot: 0, vr: 0 });
      for (let k = 0; k < 34; k++) this.drips.push({ x: Math.random() * this.w, y: Math.random() * this.h * .8, r: 8 + Math.random() * 22, vy: 10 + Math.random() * 40, life: 3 + Math.random() * 2 });
      this.rings.push({ x: f.x, y: f.y, r: f.r * .6, life: 1, col: '#6cc6f5' });
      this.splats.push({ x: f.x, y: f.y, r: f.r * 2.4, color: '#6cc6f5', life: 3.5, seed: Math.random() * 9 });
      sfx.splash(); setTimeout(() => sfx.splash(), 120); setTimeout(() => sfx.oops(), 60);
    }

    cut(f) {
      if (f.special) { this.cutStar(f); return; }
      if (f.balloon) { this.popBalloon(f); return; }
      if (f.glow) { this.cutGlow(f); }
      else { this.sliced++; this.addPoints(1); }
      const kick = Math.max(this.h * .1, 70);
      for (const side of [-1, 1]) this.halves.push({ ...f, side, x: f.x + side * 4, vx: f.vx * .6 + side * kick, vy: f.vy * .4 - kick * .5, vr: side * 2.6, life: 1.1 });
      const th = this.bag.theme, juice = art.FRUIT_JUICE[f.type];
      const cols = JUICE[th] || [juice, juice, '#fff'];
      this.fx.burst(f.x, f.y, 16, { colors: cols, speed: 340, g: th === 'space' ? 200 : 900, life: .75, size: f.r * .13 });
      this.fx.burst(f.x, f.y, 4, { colors: ['#ffd54a', '#fff'], speed: 200, g: 60, life: .8, size: f.r * .3, shape: 'star' });
      this.splats.push({ x: f.x, y: f.y, r: f.r * 1.15, color: th === 'neon' ? NEON[f.type % NEON.length] : juice, life: 3, seed: Math.random() * 9 });
      if (this.splats.length > 10) this.splats.shift();
      sfx.splash(); sfx.plink(this.sliced);

      const now = performance.now();
      this.recent = this.recent.filter(t => now - t < 900); this.recent.push(now);
      if (this.recent.length >= 3 && now - this.lastPraise > 3500) {
        this.lastPraise = now; this.recent.length = 0;
        sfx.win(); voice.praise(); store.addStars(1);
        this.fx.burst(this.w / 2, this.h * .35, 26, { colors: ['#ff7a8a', '#ffd54a', '#59b96e', '#4fb3e8', '#9a7be8'], speed: 420, g: 500, life: 1.2, size: 8, shape: 'confetti', up: 120 });
      }
      if (this.sliced % 5 === 0) { store.addStars(1); sfx.chime(); }
    }

    spawn() {
      const count = Math.random() < .2 ? 2 + (Math.random() < .4 ? 1 : 0) : 1;
      const r0 = Math.max(28, Math.min(68, Math.min(this.w * .09, this.h * .085))) * (this.tier === 1 ? 1.18 : 1);
      const g = this.h * 1.05, mid = this.w * (.22 + Math.random() * .56);
      const apex = this.h * (.55 + Math.random() * .22);
      // sometimes one of them is glowing (a bonus), and for big kids sometimes one is a water balloon
      const glowAt = this.glowIn <= 0 ? Math.floor(Math.random() * count) : -1; if (glowAt >= 0) this.glowIn = 9 + Math.random() * 9;
      const balloonAt = this.big && this.balloonIn <= 0 ? (count > 1 ? (glowAt === 0 ? 1 : 0) : (glowAt === 0 ? -1 : 0)) : -1; if (balloonAt >= 0) this.balloonIn = 5 + Math.random() * 5;
      for (let i = 0; i < count; i++) {
        const r = r0 * (.9 + Math.random() * .22);
        const x = Math.max(r, Math.min(this.w - r, mid + (i - (count - 1) / 2) * r * 2.6));
        const towardCentre = (this.w / 2 - x) / this.w;
        this.fruits.push({
          x, y: this.h + r + 6,
          vx: (towardCentre * .5 + (Math.random() - .5) * .22) * this.w * .55,
          vy: -Math.sqrt(2 * g * apex),
          r: i === balloonAt ? r * 1.1 : r, type: Math.floor(Math.random() * art.FRUIT_COUNT), rotation: Math.random() * TAU, vr: (Math.random() - .5) * 2.2,
          wow: 0, blink: Math.random() * 4, glow: i === glowAt, balloon: i === balloonAt, hue: Math.floor(Math.random() * 3)
        });
      }
      this.spawnIn = (1.2 + Math.random() * .8) * (this.tier === 1 ? 1.4 : this.tier === 3 ? .78 : 1);
    }

    sceneAt(total) { const L = ['meadow', 'beach', 'farm', 'sunset', 'autumn', 'night', 'snow', 'city']; return L[Math.floor((total || 0) / 40) % L.length]; }

    tick(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, .05); this.last = now; this.t += dt; this.scenic.update(dt);
      this.spawnIn -= dt; this.glowIn -= dt; this.balloonIn -= dt;
      this.shake = Math.max(0, this.shake - dt * 1.6); this.wetK = Math.max(0, this.wetK - dt * .25);
      if (this.fruits.length === 0) this.spawnIn = Math.min(this.spawnIn, .35);
      if (this.spawnIn <= 0) this.spawn();
      if ((this.starIn -= dt) <= 0) { this.spawnStar(); this.starIn = 22 + Math.random() * 16; }
      const g = this.h * 1.05 * (this.bag.theme === 'space' ? .7 : 1) * (this.tier === 1 ? .82 : 1);
      for (const f of this.fruits) {
        f.x += f.vx * dt; f.y += f.vy * dt; f.vy += g * dt; f.rotation += f.vr * dt; f.blink -= dt;
        let near = false; for (const st of this.ptrs.values()) if (Math.hypot(f.x - st.last.x, f.y - st.last.y) < f.r * 2.4) near = true;
        f.wow = near ? .3 : Math.max(0, f.wow - dt);
        if (f.glow && Math.random() < dt * 22) this.fx.burst(f.x, f.y, 1, { colors: ['#fff', '#ffe066', '#ff9db8', '#7fd4f5'], speed: 60, g: 0, life: .7, size: 4, shape: 'star' });
      }
      this.fruits = this.fruits.filter(f => f.y < this.h + f.r * 2.5 && f.x > -f.r * 3 && f.x < this.w + f.r * 3);
      for (const h of this.halves) { h.x += h.vx * dt; h.y += h.vy * dt; h.vy += g * dt; h.rotation += h.vr * dt; h.life -= dt; }
      this.halves = this.halves.filter(h => h.life > 0 && h.y < this.h + h.r * 2);
      for (const s of this.splats) s.life -= dt;
      this.splats = this.splats.filter(s => s.life > 0);
      for (const f of this.floats) { f.life -= dt; f.y -= dt * 60; } this.floats = this.floats.filter(f => f.life > 0);
      for (const d of this.drips) { d.y += d.vy * dt; d.vy += dt * 20; d.life -= dt; } this.drips = this.drips.filter(d => d.life > 0 && d.y < this.h + 40);
      for (const r of this.rings) { r.r += dt * this.h * .9; r.life -= dt * 1.6; } this.rings = this.rings.filter(r => r.life > 0);
      this.fx.update(dt);
      for (const st of this.ptrs.values()) st.trail = st.trail.filter(p => now - p.time < 170);
      this.faded = this.faded.map(tr => tr.filter(p => now - p.time < 170)).filter(tr => tr.length > 1);
      this.draw();
      this.raf = requestAnimationFrame(this.tick);
    }

    draw() {
      if (!this.w || !this.h) return;
      const c = this.ctx, { w, h } = this, th = this.bag.theme, neon = th === 'neon';
      c.save();
      if (this.shake > 0) c.translate((Math.random() - .5) * 34 * this.shake, (Math.random() - .5) * 34 * this.shake);
      if (th === 'classic') this.scenic.draw(c, w, h, this.t); else backdrop(th, c, w, h, this.t);
      for (const s of this.splats) {
        c.globalAlpha = Math.min(.5, s.life * .25); c.fillStyle = s.color;
        if (neon) { c.shadowColor = s.color; c.shadowBlur = 18; }
        for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + s.seed, d = s.r * (.3 + (i % 3) * .28); c.beginPath(); c.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.r * (.28 + (i % 2) * .16), 0, TAU); c.fill(); }
        c.shadowBlur = 0;
      }
      c.globalAlpha = 1;
      for (const f of this.fruits) {
        c.save(); c.translate(f.x, f.y);
        if (f.balloon) { balloon(c, f.r, this.t + f.hue, f.wow > 0, f.hue); c.restore(); continue; }
        const rot = f.special ? Math.sin(this.t * 2) * .12 : f.rotation * .35;
        c.rotate(-rot); c.fillStyle = 'rgba(90,63,94,.1)'; c.beginPath(); c.ellipse(0, f.r * .95, f.r * .75, f.r * .16, 0, 0, TAU); c.fill(); c.rotate(rot);
        if (f.glow) {   // a shimmering rainbow aura
          const hu = (this.t * 160) % 360, g = c.createRadialGradient(0, 0, f.r * .3, 0, 0, f.r * 2.1); g.addColorStop(0, `hsla(${hu},100%,70%,.75)`); g.addColorStop(.5, `hsla(${(hu + 90) % 360},100%,65%,.3)`); g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, f.r * 2.1, 0, TAU); c.fill(); c.shadowColor = `hsl(${hu},100%,65%)`; c.shadowBlur = f.r * .8;
        } else if (neon && !f.special) { c.shadowColor = NEON[f.type % NEON.length]; c.shadowBlur = f.r * .9; }
        if (f.special) {
          const pulse = 1 + Math.sin(this.t * 6) * .05;
          c.shadowColor = 'rgba(255,213,74,.9)'; c.shadowBlur = f.r * .9; c.shadowOffsetY = 0;
          art.star(c, 0, 0, f.r * pulse, '#ffd54a'); c.shadowBlur = 0;
          c.save(); c.translate(0, f.r * .06); art.face(c, f.r * .62, { mood: f.wow > 0 ? 'wow' : 'happy' }); c.restore();
        } else art.fruit(c, f.type, f.r * (f.glow ? 1.12 : 1), { mood: f.wow > 0 ? 'wow' : 'happy', blink: f.blink < .12 && f.blink > 0 });
        c.shadowBlur = 0; c.restore();
      }
      for (const hf of this.halves) {
        c.save(); c.globalAlpha = Math.min(1, hf.life * 2.4); c.translate(hf.x, hf.y); c.rotate(hf.rotation);
        c.beginPath(); c.rect(hf.side < 0 ? -hf.r * 1.5 : 0, -hf.r * 1.5, hf.r * 1.5, hf.r * 3); c.clip();
        if (neon) { c.shadowColor = NEON[hf.type % NEON.length]; c.shadowBlur = hf.r * .7; }
        art.fruit(c, hf.type, hf.r, { cut: true });
        c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-1.5, -hf.r * 1.2, 3, hf.r * 2.4);
        c.restore();
      }
      for (const r of this.rings) { c.globalAlpha = Math.max(0, r.life); c.strokeStyle = r.col; c.lineWidth = 8 * r.life + 2; c.beginPath(); c.arc(r.x, r.y, r.r, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
      if (neon) c.globalCompositeOperation = 'lighter';
      this.fx.draw(c);
      c.globalCompositeOperation = 'source-over';
      c.lineCap = 'round'; c.lineJoin = 'round';
      const trails = [...[...this.ptrs.values()].map(st => st.trail), ...this.faded], tr0 = TRAIL[th] || TRAIL.classic;
      for (const tr of trails) {
        if (tr.length < 2) continue;
        for (const [col, wd] of tr0) {
          if (neon) { c.shadowColor = col; c.shadowBlur = 16; }
          c.beginPath(); tr.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.strokeStyle = col; c.lineWidth = wd; c.stroke();
        }
        c.shadowBlur = 0;
      }
      // splashed water on the screen: a wet tint and drops slowly sliding down
      if (this.wetK > 0) { c.fillStyle = `rgba(120,190,255,${(this.wetK * .16).toFixed(3)})`; c.fillRect(-40, -40, w + 80, h + 80); }
      for (const d of this.drips) {
        c.globalAlpha = Math.min(1, d.life) * .8; c.fillStyle = 'rgba(190,228,255,.55)'; c.strokeStyle = 'rgba(80,160,230,.7)'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(d.x, d.y, d.r * .7, d.r, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(d.x - d.r * .2, d.y - d.r * .35, d.r * .16, d.r * .3, .4, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const f of this.floats) { c.globalAlpha = Math.min(1, f.life * 1.4); c.font = `700 ${Math.max(28, h * .06)}px Fredoka, system-ui`; c.lineWidth = 7; c.strokeStyle = '#fff'; c.strokeText(f.text, f.x, f.y); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y); }
      c.globalAlpha = 1;
      c.restore();
    }
  }

  SPG.games.push({
    id: 'fruit', name: 'Fruit Splash', order: 2,
    icon(c, w, h) {
      art.scene(c, w, h, 4, { showSun: false, clouds: true });
      const s = Math.min(w, h * 1.15);
      const at = (x, y, fn) => { c.save(); c.translate(w * x, h * y); fn(); c.restore(); };
      at(.28, .48, () => { c.rotate(-.3); art.fruit(c, 2, s * .2, { mood: 'wow' }); });
      at(.52, .3, () => { c.rotate(.4); art.fruit(c, 3, s * .16); });
      at(.74, .5, () => { c.rotate(.2); art.fruit(c, 1, s * .19, { mood: 'wow' }); });
      at(.5, .74, () => { c.rotate(-.5); c.save(); c.beginPath(); c.rect(-s * .3, -s * .3, s * .3, s * .6); c.clip(); art.fruit(c, 0, s * .17, { cut: true }); c.restore(); c.rotate(.9); c.translate(s * .06, 0); c.save(); c.beginPath(); c.rect(0, -s * .3, s * .3, s * .6); c.clip(); art.fruit(c, 0, s * .17, { cut: true }); c.restore(); });
      c.lineCap = 'round'; c.strokeStyle = 'rgba(255,122,154,.55)'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(w * .12, h * .78); c.quadraticCurveTo(w * .4, h * .55, w * .7, h * .2); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = s * .017; c.stroke();
      art.star(c, w * .84, h * .22, s * .06); art.star(c, w * .16, h * .28, s * .04, '#fff');
    },
    create: host => new FruitGame(host)
  });
})();
