// Fire Rescue: spray the friendly little flames with the hose, then help the pets down the ladder.
// Nothing bad ever happens. The flames also fade by themselves if nobody plays, the pets are helped
// down anyway, and the game settles into a calm sunny scene until a finger touches it again.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u * u * (3 - 2 * u);
  const RAINBOW = ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0', '#c98bf0'];
  const PALETTES = [
    { body: '#ffb4a2', roof: '#c9605f', trim: '#fff1e6' },
    { body: '#a8d5f2', roof: '#4f86b8', trim: '#f4fbff' },
    { body: '#ffe08a', roof: '#d9903a', trim: '#fffbe6' },
    { body: '#b8e2a0', roof: '#5f9a5a', trim: '#f6fff0' },
    { body: '#d9c2f2', roof: '#8b6cc0', trim: '#fbf5ff' }
  ];
  const HEIGHTS = [1, .86, .94];
  // A pet is either a cat or dog drawn by art.pet ({ kind, v }) or a Pet Shop friend ({ sp }).
  const cat = v => ({ kind: 'cat', v }), dog = v => ({ kind: 'dog', v }), sp = id => ({ sp: id });
  // Every level is a new place: its own scenery, kinds of building, colors and pets. After the last one it starts over.
  const LEVELS = [
    { scene: 'meadow', styles: ['gable', 'shop', 'gable'], pals: PALETTES, pets: [cat(0), dog(0), cat(1), dog(1), cat(3), dog(2)] },
    { scene: 'farm', styles: ['barn', 'gable', 'barn'], pals: [
      { body: '#e0574a', roof: '#7a2f2a', trim: '#fff5ea' }, { body: '#f2d27a', roof: '#a9652e', trim: '#fff' }, { body: '#d98a5a', roof: '#6e3d2a', trim: '#fff5ea' }, { body: '#f7e9c8', roof: '#c25b3f', trim: '#fff' }],
      pets: [sp('bunny'), dog(1), sp('frog'), cat(0), dog(3), sp('panda')] },
    { scene: 'snow', snow: true, styles: ['gable', 'gable', 'shop'], pals: [
      { body: '#f3c4c4', roof: '#a83f4a', trim: '#fff' }, { body: '#bcd9f2', roof: '#3f6f9a', trim: '#fff' }, { body: '#f7e3a8', roof: '#8a4a3a', trim: '#fff' }, { body: '#cfe8d8', roof: '#3f7a6a', trim: '#fff' }],
      pets: [sp('panda'), sp('bear'), sp('fox'), cat(1), sp('bunny'), dog(2)] },
    { scene: 'beach', styles: ['shop', 'gable', 'shop'], pals: [
      { body: '#7fd8d0', roof: '#e8735a', trim: '#fff' }, { body: '#ffd27a', roof: '#3fa6c9', trim: '#fff' }, { body: '#ff9db8', roof: '#8a6ad9', trim: '#fff' }, { body: '#b8f0a8', roof: '#e8735a', trim: '#fff' }],
      pets: [sp('frog'), cat(0), dog(1), sp('bunny'), sp('fox'), sp('panda')] },
    { scene: 'city', styles: ['tower', 'shop', 'tower'], pals: [
      { body: '#b9c5de', roof: '#5a6fa0', trim: '#f4f8ff' }, { body: '#f2b6a8', roof: '#8a5a70', trim: '#fff' }, { body: '#a8d8c8', roof: '#4f7a70', trim: '#fff' }, { body: '#e6d4a8', roof: '#7a6a4a', trim: '#fff' }],
      pets: [cat(2), dog(2), sp('panda'), sp('fox'), cat(3), sp('bear')] },
    { scene: 'night', styles: ['castle', 'tower', 'castle'], pals: [
      { body: '#b8b4d0', roof: '#6a4ea0', trim: '#f0eaff' }, { body: '#a8bcd8', roof: '#3f5a9a', trim: '#eef4ff' }, { body: '#d0b8d8', roof: '#8a4a8a', trim: '#fbf0ff' }],
      pets: [sp('bunny'), sp('fox'), cat(3), sp('bear'), sp('frog'), dog(0)] }
  ];
  const STYLE = { gable: { rows: 2, hk: 1 }, shop: { rows: 2, hk: .95 }, barn: { rows: 2, hk: .95 }, tower: { rows: 3, hk: 1.28 }, castle: { rows: 2, hk: 1.08 } };
  const WIN_Y = { 2: [.24, .56], 3: [.17, .4, .63] };

  // Draw a pet of either kind. Origin = the middle of the body (like art.pet); size is art.pet's size.
  function drawPet(c, spec, size, pose, t) {
    if (!spec.sp) { art.pet(c, spec.kind, spec.v, size, t, pose); return; }
    c.save(); c.translate(0, size * 1.05);
    if (pose === 'walk') c.translate(0, -Math.abs(Math.sin(t * 9)) * size * .08);
    const ph = (t * 1.4) % 1;
    SPG.pets.draw(c, spec.sp, size * 2.3, t, { mood: pose === 'bounce' ? 'cheer' : 'happy', hop: pose === 'bounce' ? ph : 0 });
    c.restore();
  }
  const AUTO_NEXT = 5;      // seconds after finishing a place (while she is playing) before the next place starts by itself
  const IDLE_FAST = 7;       // seconds without a touch before the flames start fading much faster
  const WET_RATE = .5;       // heat lost per second while the water is on a flame
  const DRY_RATE = .012;     // heat lost per second by itself
  const FADE_RATE = .06;     // heat lost per second once nobody is playing

  // A soft, friendly flame. (x, y) is the base, s the base size, heat 0..1 shrinks it.
  function flame(c, x, y, s, heat, t, seed) {
    const k = .32 + .68 * heat, sw = Math.sin(t * 5 + seed) * s * .09, sw2 = Math.sin(t * 7.3 + seed * 2) * s * .06;
    c.save(); c.translate(x, y); c.scale(k, k); c.lineJoin = 'round';
    const g = c.createRadialGradient(0, -s * .6, 0, 0, -s * .6, s * 1.5); g.addColorStop(0, 'rgba(255,190,80,.4)'); g.addColorStop(1, 'rgba(255,190,80,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, -s * .6, s * 1.5, 0, TAU); c.fill();
    const layers = [['#ff7a3d', 1, 0], ['#ffb23d', .72, s * .04], ['#ffe27a', .42, s * .08]];
    for (const [col, m, dy] of layers) {
      const w = s * .52 * m, hgt = s * 1.5 * m;
      c.fillStyle = col; c.beginPath();
      c.moveTo(-w, dy);
      c.bezierCurveTo(-w * 1.35, dy - hgt * .42, -w * .3 + sw, dy - hgt * .72, sw * 1.7, dy - hgt);
      c.bezierCurveTo(w * .35 + sw2, dy - hgt * .66, w * 1.4, dy - hgt * .38, w, dy);
      c.quadraticCurveTo(0, dy + s * .2 * m, -w, dy);
      c.fill();
    }
    // a little side tongue
    c.fillStyle = '#ff9a45'; c.beginPath(); c.moveTo(s * .3, -s * .3); c.bezierCurveTo(s * .65, -s * .55, s * .55 + sw2, -s * .85, s * .62 + sw2 * 1.5, -s * 1.02); c.bezierCurveTo(s * .34, -s * .8, s * .2, -s * .55, s * .16, -s * .28); c.fill();
    c.restore();
  }

  // Kinds of building: gable (house), shop (flat roof and a striped awning), barn (curved roof and big doors),
  // tower (tall, three floors), castle (battlements and flags). opts.snow puts a white cap on the roof.
  function building(c, x, groundY, w, bodyH, pal, style, opts = {}) {
    const top = groundY - bodyH, rh = bodyH * .22, snow = !!opts.snow;
    c.save(); c.lineJoin = 'round';
    c.fillStyle = 'rgba(90,63,94,.14)'; c.beginPath(); c.ellipse(x + w / 2, groundY + 2, w * .62, w * .06, 0, 0, TAU); c.fill();
    const dark = art.shade(pal.roof, -.14);
    // roof (behind the body)
    c.fillStyle = pal.roof;
    if (style === 'gable') {
      c.beginPath(); c.moveTo(x - w * .06, top + 2); c.lineTo(x + w / 2, top - rh); c.lineTo(x + w * 1.06, top + 2); c.closePath(); c.fill();
      if (snow) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w * .06, top + 2); c.lineTo(x + w / 2, top - rh); c.lineTo(x + w * 1.06, top + 2); c.quadraticCurveTo(x + w * .8, top - rh * .28, x + w * .5, top - rh * .34); c.quadraticCurveTo(x + w * .2, top - rh * .28, x - w * .06, top + 2); c.fill(); }
    } else if (style === 'barn') {
      c.beginPath(); c.moveTo(x - w * .06, top + 2); c.lineTo(x + w * .1, top - rh * .62); c.lineTo(x + w * .5, top - rh * 1.05); c.lineTo(x + w * .9, top - rh * .62); c.lineTo(x + w * 1.06, top + 2); c.closePath(); c.fill();
      if (snow) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + w * .1, top - rh * .62); c.lineTo(x + w * .5, top - rh * 1.05); c.lineTo(x + w * .9, top - rh * .62); c.quadraticCurveTo(x + w * .5, top - rh * .7, x + w * .1, top - rh * .62); c.fill(); }
    } else if (style === 'castle') {
      const n = 5, mw = w / (n * 2 - 1);
      c.fillStyle = art.shade(pal.body, -.05); for (let i = 0; i < n; i++) c.fillRect(x + i * mw * 2, top - rh * .4, mw, rh * .5);
      for (const sx of [x - w * .05, x + w * .83]) { c.fillStyle = art.shade(pal.body, -.08); c.fillRect(sx, top - rh * .9, w * .22, rh * 1.1); c.fillStyle = pal.roof; c.beginPath(); c.moveTo(sx - w * .03, top - rh * .9); c.lineTo(sx + w * .11, top - rh * 1.9); c.lineTo(sx + w * .25, top - rh * .9); c.closePath(); c.fill(); c.strokeStyle = '#5a3f5e'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + w * .11, top - rh * 1.9); c.lineTo(sx + w * .11, top - rh * 2.3); c.stroke(); c.fillStyle = '#ff6b81'; c.beginPath(); c.moveTo(sx + w * .11, top - rh * 2.3); c.lineTo(sx + w * .2, top - rh * 2.15); c.lineTo(sx + w * .11, top - rh * 2.0); c.fill(); }
    } else {   // shop and tower: a flat roof with a chimney or an aerial
      art.rr(c, x - w * .04, top - rh * .3, w * 1.08, rh * .42, rh * .12); c.fill();
      if (snow) { c.fillStyle = '#fff'; art.rr(c, x - w * .04, top - rh * .42, w * 1.08, rh * .22, rh * .1); c.fill(); }
      if (style === 'tower') { c.strokeStyle = '#5a3f5e'; c.lineWidth = Math.max(2, w * .02); c.beginPath(); c.moveTo(x + w * .7, top - rh * .3); c.lineTo(x + w * .7, top - rh * 1.6); c.stroke(); c.fillStyle = '#ff6b81'; c.beginPath(); c.arc(x + w * .7, top - rh * 1.65, w * .035, 0, TAU); c.fill(); c.fillStyle = dark; art.rr(c, x + w * .12, top - rh * .95, w * .22, rh * .7, w * .02); c.fill(); }
      else { c.fillStyle = dark; art.rr(c, x + w * .7, top - rh * 1.15, w * .14, rh * .9, w * .02); c.fill(); }
    }
    // body
    const bg = c.createLinearGradient(0, top, 0, groundY); bg.addColorStop(0, pal.body); bg.addColorStop(1, art.shade(pal.body, -.08));
    c.fillStyle = bg; art.rr(c, x, top, w, bodyH, w * .05); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; art.rr(c, x + w * .04, top + w * .03, w * .1, bodyH - w * .1, w * .04); c.fill();
    if (style === 'castle') { c.strokeStyle = 'rgba(90,63,94,.16)'; c.lineWidth = 2; for (let r = 1; r < 9; r++) { const y = top + r * bodyH / 9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke(); for (let q = 0; q < 4; q++) { c.beginPath(); c.moveTo(x + (q + (r % 2 ? .5 : 0)) * w / 3.5, y); c.lineTo(x + (q + (r % 2 ? .5 : 0)) * w / 3.5, y + bodyH / 9); c.stroke(); } } }
    // door
    if (style === 'barn') {
      const dw = w * .38, dh = bodyH * .3, dx = x + w / 2 - dw / 2, dy = groundY - dh;
      c.fillStyle = art.shade(pal.body, -.18); art.rr(c, dx, dy, dw, dh, w * .02); c.fill();
      c.strokeStyle = pal.trim; c.lineWidth = Math.max(3, w * .025); c.strokeRect(dx, dy, dw, dh); c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx + dw, groundY); c.moveTo(dx + dw, dy); c.lineTo(dx, groundY); c.moveTo(x + w / 2, dy); c.lineTo(x + w / 2, groundY); c.stroke();
    } else if (style === 'shop') {
      const dw = w * .26, dh = bodyH * .22, dx = x + w / 2 - dw / 2;
      c.fillStyle = pal.roof; art.rr(c, dx, groundY - dh, dw, dh, dw * .2); c.fill();
      c.fillStyle = '#cdeefc'; art.rr(c, dx + dw * .15, groundY - dh * .85, dw * .7, dh * .5, dw * .1); c.fill();
      const aw = w * .5, ay = groundY - dh - w * .06;
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fff' : pal.roof; c.beginPath(); c.moveTo(x + w / 2 - aw / 2 + i * aw / 6, ay); c.lineTo(x + w / 2 - aw / 2 + (i + 1) * aw / 6, ay); c.lineTo(x + w / 2 - aw / 2 + (i + 1) * aw / 6 + (i < 3 ? 2 : -2), ay + w * .07); c.lineTo(x + w / 2 - aw / 2 + i * aw / 6 - (i < 3 ? -2 : 2), ay + w * .07); c.closePath(); c.fill(); }
    } else {
      const dw = w * (style === 'castle' ? .24 : .2), dh = bodyH * .22;
      c.fillStyle = pal.roof;
      if (style === 'castle') { c.beginPath(); c.moveTo(x + w / 2 - dw / 2, groundY); c.lineTo(x + w / 2 - dw / 2, groundY - dh * .7); c.arc(x + w / 2, groundY - dh * .7, dw / 2, Math.PI, 0); c.lineTo(x + w / 2 + dw / 2, groundY); c.closePath(); c.fill(); }
      else { art.rr(c, x + w / 2 - dw / 2, groundY - dh, dw, dh, dw * .4); c.fill(); }
      c.fillStyle = '#ffe07a'; c.beginPath(); c.arc(x + w / 2 + dw * .22, groundY - dh * .45, dw * .07, 0, TAU); c.fill();
    }
    c.restore();
  }

  function windowPane(c, wx, wy, ww, wh, glass, trim) {
    c.fillStyle = trim; art.rr(c, wx - ww / 2 - ww * .1, wy - wh / 2 - ww * .1, ww * 1.2, wh + ww * .2, ww * .22); c.fill();
    c.fillStyle = glass; art.rr(c, wx - ww / 2, wy - wh / 2, ww, wh, ww * .16); c.fill();
  }
  function windowBars(c, wx, wy, ww, wh, trim) {
    c.fillStyle = trim; c.fillRect(wx - ww * .04, wy - wh / 2, ww * .08, wh); c.fillRect(wx - ww / 2, wy - ww * .03, ww, ww * .06);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(wx - ww * .42, wy + wh * .3); c.lineTo(wx - ww * .12, wy - wh * .38); c.lineTo(wx - ww * .02, wy - wh * .38); c.lineTo(wx - ww * .32, wy + wh * .3); c.fill();
  }

  class FireGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('fire', () => ({ saved: 0, rounds: 0, level: 0 }));
      this.bag.saved = this.bag.saved || 0; this.bag.rounds = this.bag.rounds || 0; this.bag.level = this.bag.level || 0;
      this.scenic = SPG.scenery.fader(LEVELS[this.bag.level % LEVELS.length].scene);
      this.counter = SPG.ui.counter(host, (c, s) => {
        c.fillStyle = '#ff8aa3'; c.beginPath(); c.ellipse(s / 2, s * .64, s * .22, s * .18, 0, 0, TAU); c.fill();
        for (const [x, y] of [[.24, .4], [.4, .26], [.6, .26], [.76, .4]]) { c.beginPath(); c.ellipse(s * x, s * y, s * .09, s * .11, 0, 0, TAU); c.fill(); }
      }, this.bag.saved);
      this.fx = new art.Fx();
      this.t = 0; this.running = false;
      this.aim = { x: 0, y: 0, down: false };
      this.lastTouch = 0; this.sprayT = 0; this.waterIn = 0; this.dropIn = 0; this.smokeIn = 0;
      this.state = 'play'; this.stateT = 0; this.wonK = 0; this.rounds = 0;
      this.queue = []; this.cur = null;
      this.fox = { x: 0, y: 0, dir: 1, walk: 0, wave: 0, home: true };
      this.bear = { dir: 1 };
      this.tick = this.tick.bind(this);
      const cv = this.canvas;
      const at = e => { const r = cv.getBoundingClientRect(); this.aim.x = (e.clientX - r.left) * this.w / r.width; this.aim.y = (e.clientY - r.top) * this.h / r.height; };
      // the water runs while any finger is down (a second finger lifting off does not stop it) and follows the newest finger
      this.fingers = [];
      cv.addEventListener('pointerdown', e => {
        e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
        this.fingers = this.fingers.filter(id => id !== e.pointerId).concat(e.pointerId);
        at(e); this.aim.down = true; this.lastTouch = this.t; this.touch();
      });
      cv.addEventListener('pointermove', e => { if (this.aim.down && e.pointerId === this.fingers[this.fingers.length - 1]) { e.preventDefault(); at(e); this.lastTouch = this.t; } });
      for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(n, e => { this.fingers = this.fingers.filter(id => id !== e.pointerId); this.aim.down = this.fingers.length > 0; });
      this.newRound(true);
    }

    /* ------------------------------------------------------------ layout */
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.layout();
      this.draw();
    }
    layout() {
      const w = this.w, h = this.h, wide = w >= h * 1.05;
      this.wide = wide;
      this.ui = clamp(Math.min(w, h * 1.4) / 780, .55, 1.4);
      const crewW = wide ? w * .3 : w;
      this.groundY = wide ? h * .9 : h * .66;
      this.crewY = wide ? h * .9 : h * .9;
      this.u = Math.min(crewW / 21.5, h * .03);
      this.sc = this.u * .95;
      this.truckX = 6.6 * this.u + w * .01;
      this.bearX = this.truckX + 8.3 * this.u;
      this.foxHomeX = this.bearX + 3.9 * this.sc;
      const zoneX = wide ? crewW + w * .01 : w * .03, zoneW = wide ? w - zoneX - w * .02 : w * .94;
      const gap = zoneW * .04, bw = (zoneW - gap * 2) / 3;
      const avail = this.groundY - h * (wide ? .13 : .14);
      this.bldW = bw;
      this.bodyBase = Math.min(bw * (wide ? 1.3 : 1.7), avail * .8);
      this.blds.forEach((b, i) => {
        const g = b.geo = {}, st = STYLE[b.style];
        g.x = zoneX + i * (bw + gap); g.w = bw; g.bodyH = Math.min(this.bodyBase * HEIGHTS[i] * st.hk, avail * (st.hk > 1 ? .94 : .8));
        g.top = this.groundY - g.bodyH;
        g.ww = bw * .27; g.wh = g.ww * 1.1;
        g.wins = [];
        for (const fy of WIN_Y[st.rows]) for (const fx of [.26, .74]) g.wins.push({ x: g.x + bw * fx, y: g.top + g.bodyH * fy });
        g.roofY = b.style === 'gable' || b.style === 'barn' ? g.top - g.bodyH * .16 : g.top - g.bodyH * .04;
        g.doorX = g.x + bw / 2;
        g.ps = g.ww * .85;
      });
      const f = this.fox; if (f.home) { f.x = this.foxHomeX; f.y = this.crewY; }
    }

    /* ------------------------------------------------------------ rounds */
    newRound(first) {
      this.state = 'play'; this.stateT = 0; this.wonK = 0; this.queue = []; this.cur = null;
      this.sprayT = 0; this.lastTouch = this.t; this.roundStart = this.t;
      const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
      const lvl = this.bag.level % LEVELS.length, L = LEVELS[lvl], pals = shuffle(L.pals), pets = shuffle(L.pets);
      this.level = lvl; this.scenic.set(L.scene);
      this.blds = [0, 1, 2].map(i => {
        const style = L.styles[i], nWin = STYLE[style].rows * 2, pw = Math.floor(Math.random() * nWin);
        // how many flames: one or two for toddlers, a few for most, nearly every window and the roof for older children
        const tier = SPG.level.tier('fire'), many = tier === 3 ? nWin - 1 : nWin > 4 ? 4 : nWin - 1;
        const wins = shuffle([...Array(nWin).keys()].filter(k => k !== pw)).slice(0, tier === 1 ? 1 : many);
        const sites = wins.map(k => ({ site: k }));
        if (Math.random() < (tier === 1 ? .3 : tier === 3 ? 1 : .7)) sites.push({ site: nWin });
        const flames = sites.map((s, j) => Object.assign(s, { heat: 1, at: this.t + .9 + i * .55 + j * .3, lit: false, out: false, seed: Math.random() * 9, steam: 0 }));
        return { pal: pals[i % pals.length], style, nWin, snow: !!L.snow, flames, geo: null, done: false, glow: 0, appear: -i * .25,
          pet: { win: pw, spec: pets[i % pets.length], state: 'wait', t: 0, readyT: 0, x: 0, y: 0, ladderT: 0, dir: 1 } };
      });
      if (this.w) this.layout();
      this.fx.p.length = 0;
      this.bag.rounds++; store.save();
      if (first) voice.say('fire-start'); else { sfx.chime(); if (this.bag.rounds > 1 && lvl !== this.lastLevel) voice.say('fire-level'); }
      this.lastLevel = lvl;
    }
    touch() {
      sfx.unlock && sfx.unlock();
      if (this.state === 'rest') { this.newRound(false); return; }
      // the big arrow after a finished round starts the next place
      if (this.state === 'won') { const n = this.nextBtn(); if (Math.hypot(this.aim.x - n.x, this.aim.y - n.y) < n.r * 1.35) { sfx.pop(); this.newRound(false); } return; }
      // a tap on a pet that is ready to come down calls the ladder
      if (this.state !== 'play') return;
      for (const b of this.blds) {
        const p = b.pet; if (p.state !== 'ready') continue;
        const wp = b.geo.wins[p.win];
        if (Math.hypot(this.aim.x - wp.x, this.aim.y - wp.y) < Math.max(b.geo.ww * 1.9, 78 * this.ui)) { this.claim(b); }
      }
    }
    claim(b) { if (this.queue.includes(b)) return; this.queue.push(b); sfx.pop(); }

    sitePos(b, f) {
      const g = b.geo;
      if (f.site === b.nWin) return { x: g.x + g.w * .5, y: g.roofY + g.bodyH * .1, s: g.w * .27 };
      const wp = g.wins[f.site];
      return { x: wp.x, y: wp.y + g.wh * .5, s: g.w * .27 };
    }
    safeX(b) { const g = b.geo; return g.x + g.w * (g.wins[b.pet.win].x < g.doorX ? .2 : .8); }
    ladderFoot(b) {
      const g = b.geo, wp = g.wins[b.pet.win], left = wp.x < g.x + g.w / 2;
      return { x: wp.x + (left ? -1 : 1) * g.w * .16, y: this.groundY };
    }

    /* ------------------------------------------------------------ loop */
    start() { this.resize(); this.resume(); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.aim.down = false; this.fingers = []; if (this.hose) { this.hose.off(); this.hose = null; } }
    destroy() { this.pause(); clearTimeout(this._nt); this.canvas.remove(); this.counter.el.remove(); }

    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
      this.t += dt; this.update(dt); this.draw();
      this.raf = requestAnimationFrame(this.tick);
    }

    update(dt) {
      if (!this.w) return;
      this.stateT += dt; this.scenic.update(dt);
      for (const b of this.blds) if (b.appear < 1) b.appear = Math.min(1, b.appear + dt / .7);
      const spraying = this.aim.down, idle = this.t - this.lastTouch, fade = idle > IDLE_FAST;
      const nz = this.nozzle();
      // water
      if (spraying) {
        this.sprayT += dt;
        if (!this.hose) this.hose = sfx.hose();
        if ((this.waterIn -= dt) <= 0) { this.waterIn = .35 + Math.random() * .5; if (Math.random() < .6) sfx.bubble(); }
        if ((this.dropIn -= dt) <= 0) { this.dropIn = .06; this.fx.burst(this.aim.x, this.aim.y, 2, { colors: ['#bfe9ff', '#5cc8f2', '#ffffff'], speed: 120, g: 600, life: .4, size: 3.5 * this.ui, up: 60 }); }
      }
      // flames
      let burning = 0;
      for (const b of this.blds) {
        for (const f of b.flames) {
          if (f.out) { f.steam = Math.max(0, f.steam - dt); continue; }
          if (!f.lit) {
            if (this.t < f.at) continue;
            f.lit = true; const p = this.sitePos(b, f); this.fx.burst(p.x, p.y - p.s * .5, 6, { colors: ['#ffb23d', '#ffe27a', '#ff7a3d'], speed: 90, g: 200, life: .5, size: 4 * this.ui, up: 60 });
            sfx.squeak();
          }
          burning += f.heat;
          const p = this.sitePos(b, f);
          const tier = SPG.level.tier('fire');
          let rate = fade ? FADE_RATE : tier === 3 ? 0 : DRY_RATE;
          if (spraying && Math.hypot(this.aim.x - p.x, this.aim.y - (p.y - p.s * .7)) < p.s * .95 + 34 * this.ui) {
            rate += WET_RATE * (tier === 1 ? 1.4 : tier === 3 ? .7 : 1); f.wetT = this.t;
            if (Math.random() < dt * 9) this.fx.burst(p.x + (Math.random() - .5) * p.s * .5, p.y - p.s * .6, 1, { colors: ['#fff', '#e7f4ff'], speed: 40, g: -70, life: .7, size: p.s * .1 });
          }
          f.heat -= rate * dt;
          // older children: a flame that is not being sprayed (and is not out yet) flares back up, so it has to be put out properly
          if (tier === 3 && !fade && this.t - (f.wetT || -9) > 2.2 && f.heat < 1) f.heat = Math.min(1, f.heat + .1 * dt);
          if (Math.random() < dt * 1.6) this.fx.burst(p.x + (Math.random() - .5) * p.s * .4, p.y - p.s * 1.3 * f.heat, 1, { colors: ['#c6c2d6', '#dcd9e8'], speed: 10, g: -42, life: 1.7, size: p.s * .15 });
          if (f.heat <= 0) {
            f.out = true; f.heat = 0; f.steam = 1.2;
            this.fx.burst(p.x, p.y - p.s * .5, 10, { colors: ['#ffffff', '#e7f4ff', '#cfe9ff'], speed: 75, g: -80, life: .95, size: p.s * .2 });
            if (this.t - (this.puffT ?? -9) > .2) { this.puffT = this.t; sfx.puff(); }   // flames fading out together by themselves make one puff, not a loud pile of them
          }
        }
        // pets
        const pt = b.pet;
        if (pt.state === 'wait' && b.flames.every(f => f.lit && f.out)) { pt.state = 'ready'; pt.readyT = 0; if (this.t - (this.chimeT ?? -9) > .3) { this.chimeT = this.t; sfx.chime(); } if (!this.saidPet) { this.saidPet = true; voice.say('fire-pet'); } }
        if (pt.state === 'ready') pt.readyT += dt;   // the pet waits, bouncing, until she taps it: the firefighters never rescue on their own
      }
      this.burn = clamp(burning / 8, 0, 1);
      this.stepRescue(dt);
      for (const b of this.blds) b.glow += ((b.done ? 1 : 0) - b.glow) * Math.min(1, dt * 3);
      if (!spraying && this.hose) { this.hose.off(); this.hose = null; }
      // winning
      if (this.state === 'play' && this.blds.every(b => b.done)) this.win();
      if (this.state === 'won') {
        this.wonK = Math.min(1, this.wonK + dt * .7);
        if (this.stateT < 6 && (this.smokeIn -= dt) <= 0) { this.smokeIn = .35; this.fx.burst(this.w * (.2 + Math.random() * .6), this.h * .3, 8, { colors: RAINBOW, speed: 200, g: 350, life: 1, size: 6 * this.ui, shape: 'confetti', up: 120 }); }
        // the round is over and stays calm: nothing catches fire again. If she was playing, the next place starts by itself after
        // a few seconds (or sooner with the arrow); if nobody played, it just rests until the next touch.
        if (this.stateT > AUTO_NEXT && this.sprayT > 0 && !this.aim.down) this.newRound(false);
      }
      this.fx.update(dt);
      this.bear.dir = this.aim.x >= this.bearX ? 1 : -1;
      this.nz = nz;
    }

    // the water comes out of the nozzle held by the bear
    nozzle() {
      const s = this.sc, d = this.bear.dir;
      return { x: this.bearX + d * s * 2.25, y: this.crewY - s * 4.35 };
    }

    stepRescue(dt) {
      const f = this.fox;
      const cur = this.cur || (this.queue[0] && !this.queue[0].done ? this.queue[0] : null);
      if (cur && !this.cur) { this.cur = cur; f.home = false; }
      let tx = this.foxHomeX, ty = this.crewY, arrived = false;
      if (this.cur) {
        const b = this.cur, foot = this.ladderFoot(b), left = foot.x < b.geo.wins[b.pet.win].x;
        tx = foot.x + (left ? -1 : 1) * this.sc * 2.7; ty = this.groundY;
      }
      const dx = tx - f.x, dy = ty - f.y, dist = Math.hypot(dx, dy), sp = this.w * .38;
      if (dist > 3) { const m = Math.min(dist, sp * dt); f.x += dx / dist * m; f.y += dy / dist * m; f.dir = dx >= 0 ? 1 : -1; f.walk = 1; } else { f.walk = 0; arrived = true; }
      f.wave = 0;
      if (!this.cur) { if (arrived) { f.home = true; f.dir = 1; } return; }
      const b = this.cur, p = b.pet, g = b.geo, wp = g.wins[p.win], foot = this.ladderFoot(b);
      const top = { x: wp.x, y: wp.y + g.wh * .5 };
      if (p.state === 'ready' && arrived) { p.state = 'ladder'; p.t = 0; sfx.whoosh(); f.dir = wp.x >= f.x ? 1 : -1; }
      if (p.state === 'ladder') {
        f.dir = wp.x >= f.x ? 1 : -1;
        p.ladderT = Math.min(1, p.ladderT + dt / .8);
        if (p.ladderT >= 1) { p.state = 'down'; p.t = 0; sfx.boing(); }
      } else if (p.state === 'down') {
        p.t += dt / 2.1; const u = ease(Math.min(1, p.t));
        p.x = lerp(top.x, foot.x, u); p.y = lerp(top.y, foot.y, u) - g.ps * .35;
        f.dir = p.x >= f.x ? 1 : -1;
        if ((this.stepIn = (this.stepIn || 0) - dt) <= 0) { this.stepIn = .3; sfx.tap(); }
        if (p.t >= 1) { p.state = 'walk'; p.t = 0; p.dir = this.safeX(b) >= p.x ? 1 : -1; f.wave = 1; }
      } else if (p.state === 'walk') {
        p.ladderT = Math.max(0, p.ladderT - dt / .7);
        f.wave = 1;
        const gy = this.groundY + g.ps * .1, dxp = this.safeX(b) - p.x;
        p.dir = dxp >= 0 ? 1 : -1;
        const m = Math.min(Math.abs(dxp), this.w * .13 * dt); p.x += p.dir * m; p.y = lerp(p.y, gy, Math.min(1, dt * 6));
        if (Math.abs(dxp) < 1.5) {
          p.state = 'safe'; p.t = 0; b.done = true; this.saved(b);
        }
      }
      if (p.state === 'safe') { p.ladderT = Math.max(0, p.ladderT - dt / .7); }
      if (p.state === 'safe') { p.t += dt; f.wave = p.t < 1.5 ? 1 : 0; if (p.t > 1.5) { this.queue.shift(); this.cur = null; } }
    }

    saved(b) {
      const p = b.pet, g = b.geo;
      this.bag.saved++; this.counter.set(this.bag.saved); store.save();
      if (this.sprayT > 0) store.addStars(1);   // no stars while nobody is playing
      sfx.chime();
      this.fx.burst(p.x, p.y - g.ps * .6, 14, { colors: ['#ff8aa3', '#ffd54a', '#fff'], speed: 190, g: 300, life: 1, size: 7 * this.ui, shape: 'heart', up: 140 });
      voice.praise && Math.random() < .5 && voice.praise();
    }
    win() {
      this.state = 'won'; this.stateT = 0; this.wonK = 0;
      this.bag.level++; store.save();   // the next round is somewhere new
      if (this.sprayT > 2) store.addStars(1);
      sfx.win(); voice.say('fire-done'); clearTimeout(this._nt); this._nt = setTimeout(() => { if (this.state === 'won' && this.running) voice.say('fire-next'); }, 3800);
      this.fx.burst(this.w / 2, this.h * .35, 26, { colors: RAINBOW, speed: 320, g: 400, life: 1.2, size: 7 * this.ui, shape: 'star', up: 200 });
    }

    /* ------------------------------------------------------------ drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h;
      if (!w) return;
      c.clearRect(0, 0, w, h);
      this.scenic.draw(c, w, h, this.t);
      if (this.wonK > 0 || this.state === 'rest') {
        const k = this.state === 'rest' ? 1 : ease(this.wonK);
        c.save(); c.globalAlpha = .9 * k; c.lineWidth = Math.min(w, h) * .028; c.lineCap = 'round';
        RAINBOW.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(w * .52, this.groundY - this.bodyBase * .2, Math.min(w * .5, h * .5) * (1.02 - i * .045), Math.PI * 1.06, Math.PI * (1.06 + .88 * k)); c.stroke(); });
        c.restore();
      }
      this.blds.forEach(b => this.drawBuilding(c, b));
      this.drawCrew(c);
      this.blds.forEach(b => this.drawFlames(c, b));
      this.drawRescue(c);
      this.drawWater(c);
      this.fx.draw(c);
      if (this.burn > 0) { c.fillStyle = `rgba(130,105,115,${(this.burn * .1).toFixed(3)})`; c.fillRect(0, 0, w, h); }
      if (this.state === 'rest') this.drawRestHint(c);
      if (this.state === 'won' && this.stateT > 1.4) this.drawNext(c);
      // which place she is in: a little row of dots, the current one big
      const n = LEVELS.length, r = 6 * this.ui, gap = r * 3.2, x0 = w / 2 - (n - 1) * gap / 2, y0 = 22 * this.ui + 6;
      for (let i = 0; i < n; i++) { c.fillStyle = i === this.level ? '#59b96e' : 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x0 + i * gap, y0, i === this.level ? r * 1.4 : r, 0, TAU); c.fill(); if (i === this.level) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); } }
    }

    drawBuilding(c, b) {
      const g = b.geo, pal = b.pal, ap = ease(clamp(b.appear, 0, 1));
      if (ap <= 0) return;
      c.save(); c.globalAlpha = ap; c.translate(0, (1 - ap) * this.h * .12);
      building(c, g.x, this.groundY, g.w, g.bodyH, pal, b.style, { snow: b.snow });
      g.wins.forEach((wp, k) => {
        const hot = b.flames.some(f => f.site === k && !f.out), lit = b.glow > .5;
        const glass = hot ? '#ffd8a3' : lit ? '#fff2b8' : '#cfe9ff';
        windowPane(c, wp.x, wp.y, g.ww, g.wh, glass, pal.trim);
        const p = b.pet;
        if (k === p.win && (p.state === 'wait' || p.state === 'ready' || (p.state === 'ladder'))) {
          c.save(); c.beginPath(); c.rect(wp.x - g.ww / 2, wp.y - g.wh / 2, g.ww, g.wh); c.clip();
          const hop = p.state === 'ready' ? -Math.abs(Math.sin(this.t * 6)) * g.wh * .12 : Math.sin(this.t * 3 + k) * g.wh * .03;
          c.translate(wp.x, wp.y + g.wh * .3 + hop);
          drawPet(c, p.spec, g.ps, p.state === 'ready' || p.state === 'ladder' ? 'bounce' : 'sit', this.t);
          c.restore();
        }
        if (!(k === p.win && p.state !== 'safe' && p.state !== 'walk' && p.state !== 'down')) windowBars(c, wp.x, wp.y, g.ww, g.wh, pal.trim);
        if (k === p.win && p.state === 'ready') this.drawHint(c, wp.x, wp.y - g.wh * .95, g.ww * .35);
      });
      if (b.done) {
        const a = .7 + Math.sin(this.t * 3 + g.x) * .12;
        c.save(); c.globalAlpha = a; art.heart(c, g.x + g.w / 2, g.roofY - g.w * .12 - Math.sin(this.t * 2 + g.x) * 4, g.w * .1, '#ff8aa3'); c.restore();
      }
      c.restore();
    }
    drawHint(c, x, y, r) {
      const p = 1 + Math.sin(this.t * 6) * .16;
      c.save(); c.globalAlpha = .95; art.star(c, x, y, r * p, '#ffd54a', this.t * .5); c.restore();
    }

    drawFlames(c, b) {
      for (const f of b.flames) {
        if (!f.lit) continue;
        const p = this.sitePos(b, f);
        if (!f.out) flame(c, p.x, p.y, p.s, f.heat, this.t, f.seed);
      }
    }

    drawCrew(c) {
      const u = this.u, sc = this.sc, cy = this.crewY;
      // fire truck (its lights keep flashing gently)
      c.save(); c.translate(this.truckX, cy); art.fireTruck(c, u, this.t, {}); c.restore();
      // the hose runs from the truck to the bear
      const nz = this.nozzle(), hx = this.bearX - this.bear.dir * sc * .5, hy = cy - sc * .3;
      c.save(); c.lineCap = 'round';
      c.strokeStyle = 'rgba(60,45,70,.3)'; c.lineWidth = u * .62; c.beginPath(); c.moveTo(this.truckX + 3 * u, cy - u * .6); c.quadraticCurveTo((this.truckX + hx) / 2 + u, cy + u * .55, hx, hy); c.stroke();
      c.strokeStyle = '#ffcf4a'; c.lineWidth = u * .4; c.beginPath(); c.moveTo(this.truckX + 3 * u, cy - u * .6); c.quadraticCurveTo((this.truckX + hx) / 2 + u, cy + u * .55, hx, hy); c.stroke();
      c.restore();
      // the bear, with a hose nozzle in the raised hand
      c.save(); c.translate(this.bearX, cy); art.firefighter(c, 'bear', sc, this.t, { dir: this.bear.dir, wave: 0, walk: 0 }); c.restore();
      const aimAng = this.aim.down ? Math.atan2(this.aim.y - nz.y, this.aim.x - nz.x) : -Math.PI * .28 * this.bear.dir + (this.bear.dir < 0 ? Math.PI : 0);
      c.save(); c.translate(nz.x, nz.y); c.rotate(aimAng); c.lineCap = 'round';
      c.fillStyle = '#e8433f'; art.rr(c, -sc * .2, -sc * .34, sc * 1.5, sc * .68, sc * .22); c.fill();
      c.fillStyle = '#ffd54a'; art.rr(c, sc * 1.1, -sc * .42, sc * .32, sc * .84, sc * .12); c.fill();
      c.restore();
      this.nzTip = { x: nz.x + Math.cos(aimAng) * sc * 1.5, y: nz.y + Math.sin(aimAng) * sc * 1.5 };
    }

    drawWater(c) {
      if (!this.aim.down || !this.nzTip) return;
      const a = this.nzTip, b = this.aim, dist = Math.hypot(b.x - a.x, b.y - a.y);
      const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - Math.min(dist * .25, this.h * .18);
      c.save(); c.lineCap = 'round';
      c.strokeStyle = 'rgba(107,196,244,.55)'; c.lineWidth = 15 * this.ui; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(cx, cy, b.x, b.y); c.stroke();
      c.strokeStyle = 'rgba(167,224,255,.9)'; c.lineWidth = 9 * this.ui; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3.5 * this.ui; c.setLineDash([16 * this.ui, 22 * this.ui]); c.lineDashOffset = -this.t * 190; c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(190,232,255,.55)'; c.beginPath(); c.arc(b.x, b.y, 26 * this.ui * (1 + Math.sin(this.t * 18) * .08), 0, TAU); c.fill();
      c.restore();
    }

    drawRescue(c) {
      const sc = this.sc;
      // ladder and the pet that is climbing down or safe
      for (const b of this.blds) {
        const g = b.geo, p = b.pet, wp = g.wins[p.win], foot = this.ladderFoot(b);
        if (p.ladderT > .01) {
          const top = { x: lerp(foot.x, wp.x, ease(p.ladderT)), y: lerp(foot.y, wp.y + g.wh * .5 + g.wh * .1, ease(p.ladderT)) };
          const ang = Math.atan2(top.y - foot.y, top.x - foot.x), nx = -Math.sin(ang), ny = Math.cos(ang), rw = g.ww * .32;
          c.save(); c.lineCap = 'round';
          c.strokeStyle = '#c98b5b'; c.lineWidth = Math.max(4, g.ww * .1);
          for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(foot.x + nx * rw * sd, foot.y + ny * rw * sd); c.lineTo(top.x + nx * rw * sd, top.y + ny * rw * sd); c.stroke(); }
          c.lineWidth = Math.max(3, g.ww * .07); const len = Math.hypot(top.x - foot.x, top.y - foot.y), n = Math.max(2, Math.floor(len / (g.ww * .5)));
          for (let i = 1; i < n; i++) { const u = i / n, mx = lerp(foot.x, top.x, u), my = lerp(foot.y, top.y, u); c.beginPath(); c.moveTo(mx - nx * rw, my - ny * rw); c.lineTo(mx + nx * rw, my + ny * rw); c.stroke(); }
          c.restore();
        }
        if (p.state === 'down' || p.state === 'walk' || p.state === 'safe') {
          c.save(); c.translate(p.x, p.y);
          if (p.state === 'walk' && p.dir < 0) c.scale(-1, 1);
          drawPet(c, p.spec, g.ps * (p.state === 'down' ? .9 : 1), p.state === 'down' ? 'bounce' : p.state === 'walk' ? 'walk' : 'sit', this.t + g.x);
          c.restore();
        }
      }
      // the second firefighter (fox), who holds the ladder
      const f = this.fox;
      c.save(); c.translate(f.x, f.y); art.firefighter(c, 'fox', sc, this.t + 1.3, { dir: f.dir, walk: f.walk ? .8 : 0, wave: f.wave }); c.restore();
    }

    nextBtn() { const r = Math.max(40, Math.min(this.w, this.h) * .085); return { x: this.w - r * 1.7, y: this.h * .5, r }; }
    drawNext(c) {
      const n = this.nextBtn(), k = 1 + Math.sin(this.t * 3) * .05, a = Math.min(1, this.stateT / 1.2);
      c.save(); c.globalAlpha = a; c.translate(n.x, n.y); c.scale(k, k);
      c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.arc(0, n.r * .12, n.r, 0, TAU); c.fill();
      c.fillStyle = '#59b96e'; c.beginPath(); c.arc(0, 0, n.r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = n.r * .1; c.stroke();
      if (this.sprayT > 0) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = n.r * .12; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, n.r * 1.2, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, this.stateT / AUTO_NEXT)); c.stroke(); }   // a ring fills while the next place is coming
      c.strokeStyle = '#fff'; c.lineWidth = n.r * .22; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(-n.r * .22, -n.r * .42); c.lineTo(n.r * .26, 0); c.lineTo(-n.r * .22, n.r * .42); c.stroke();
      c.restore();
    }
    drawRestHint(c) {
      // calm and quiet: a soft pulsing water drop in the middle says "touch to play again"
      const s = Math.min(this.w, this.h) * .075, k = 1 + Math.sin(this.t * 2.4) * .08;
      c.save(); c.globalAlpha = .9; c.translate(this.w / 2, this.h * .32); c.scale(k, k);
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(0, 0, s * 1.25, 0, TAU); c.fill();
      art.drop(c, s * .8); c.restore();
    }
  }

  SPG.games.push({
    id: 'fire', name: 'Fire Rescue', order: 3.5,
    icon(c, w, h) {
      SPG.scenery.draw(c, w, h, 8, 'meadow');
      const s = Math.min(w, h * 1.15) * 1.3, gy = h * .86;
      building(c, w * .48, gy, s * .32, s * .36, PALETTES[0], 'gable');
      building(c, w * .18, gy, s * .26, s * .27, PALETTES[1], 'shop');
      for (const [x, y] of [[.53, .5], [.68, .5], [.53, .68], [.68, .68]]) { windowPane(c, w * x + s * .04, h * y, s * .07, s * .08, '#ffd8a3', '#fff1e6'); }
      flame(c, w * .585, h * .56, s * .1, 1, 1, 1); flame(c, w * .735, h * .46, s * .085, .85, 1, 3); flame(c, w * .66, h * .24, s * .06, .8, 1, 5);
      c.save(); c.translate(w * .28, gy + 1); art.fireTruck(c, s * .033, 0, { lights: true }); c.restore();
      c.save(); c.strokeStyle = '#8bd6ff'; c.lineCap = 'round'; c.lineWidth = s * .022; c.beginPath(); c.moveTo(w * .36, h * .63); c.quadraticCurveTo(w * .5, h * .34, w * .58, h * .55); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = s * .008; c.stroke(); c.restore();
      c.save(); c.translate(w * .86, h * .86); art.pet(c, 'cat', 0, s * .12, 1, 'sit'); c.restore();
    },
    create: host => new FireGame(host)
  });
})();
