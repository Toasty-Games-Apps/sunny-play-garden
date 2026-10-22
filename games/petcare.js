// Pet Care: a cozy room for her Pet Shop friend (or a visiting bunny if she has none yet). Feed it fruit, give it a
// bubbly bath, tuck it into bed, and decorate the room. A little thought bubble shows what it would like. Nothing is
// ever wrong or sad. Once the pet is asleep it stays asleep until she wakes it: the room goes dark, a night light
// glows and stars shine on the wall, and in the morning the room fills with sunshine and stars.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const BED_LOCK = 5;   // seconds after putting the pet to bed before it can be woken
  const FOODS = [0, 1, 3, 4, 5];   // art.fruit types: apple, orange, strawberry, banana, peach

  // Wallpapers, floors and rug colors. She unlocks one more wallpaper for every few cares (so the room has levels too).
  const WALLS = [
    { top: '#ffe9df', bot: '#ffd9cc', pat: 'stripes' }, { top: '#d8f0ff', bot: '#e9f7ff', pat: 'clouds' }, { top: '#dff5e3', bot: '#c8ecd2', pat: 'dots' },
    { top: '#fff3c4', bot: '#ffe8a0', pat: 'rays' }, { top: '#e6dcff', bot: '#d3c6f7', pat: 'stars' }, { top: '#c8f0ee', bot: '#a8e2e4', pat: 'waves' }
  ];
  const FLOORS = [['#e2b98d', '#c99a6a'], ['#f1d9b5', '#ddbb8a'], ['#d9cdf0', '#c2b3e6']];
  const RUGS = ['#ffb3c6', '#a8e2c4', '#a9d8f5', '#ffe08a', '#cdb8f2'];
  const LAMPS = ['#ffd58a', '#ffb3d1', '#9fd0ff'];   // night light colors: warm, pink, blue
  const UNLOCK_EVERY = 5;
  // Things to decorate with. 'wall' ones hang on the wall, 'floor' ones stand on the floor.
  const DECO = [
    { id: 'star', z: 'wall' }, { id: 'heart', z: 'wall' }, { id: 'rainbow', z: 'wall' }, { id: 'moon', z: 'wall' }, { id: 'flowers', z: 'wall' }, { id: 'frame', z: 'wall' }, { id: 'balloons', z: 'wall' },
    { id: 'plant', z: 'floor' }, { id: 'chest', z: 'floor' }, { id: 'teddy', z: 'floor' }, { id: 'beanbag', z: 'floor' }, { id: 'ball', z: 'floor' }, { id: 'lamp', z: 'floor' }, { id: 'shelf', z: 'floor' }
  ];
  const MAX_DECO = 26;
  // Themed rooms (castle, spooky house, Christmas...) live in petcare-rooms.js. In a themed room the tray shows its six
  // themed things plus eight friendly favourites, so it is never longer than the cozy home's tray.
  const { ROOMS, Z, TRAY_SCALE, pattern: roomPattern, PATS } = SPG.careRooms;
  const GLOW = { lamp: 1.4, candle: 1.1, torch: .35, lights: 0, tree: 1.3, volcano: 1.0, ufo: 0, planet: 0, comet: 0, fish: 0 };   // things that shine at night (how high the light sits)
  const GENERIC = ['star', 'heart', 'moon', 'frame', 'plant', 'teddy', 'chest', 'lamp'];

  // One decoration, drawn with its base on (0, 0) for floor things and centered for wall things. u = a unit of size.
  function drawDeco(c, id, u, t, who) {
    c.save(); c.lineJoin = c.lineCap = 'round';
    switch (id) {
      case 'star': art.star(c, 0, 0, u * .95, '#ffd54a', Math.sin(t) * .1); c.save(); art.face(c, u * .34, {}); c.restore(); break;
      case 'heart': art.heart(c, 0, 0, u * 1.0, '#ff7a93'); c.save(); c.translate(0, u * .05); art.face(c, u * .32, {}); c.restore(); break;
      case 'moon': c.fillStyle = '#ffe58a'; c.beginPath(); c.arc(0, 0, u * .9, 0, TAU); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(u * .45, -u * .15, u * .75, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#c98b15'; c.beginPath(); c.arc(-u * .45, u * .05, u * .06, 0, TAU); c.fill(); c.lineWidth = u * .05; c.strokeStyle = '#c98b15'; c.beginPath(); c.arc(-u * .5, u * .18, u * .12, .2, Math.PI - .2); c.stroke(); break;
      case 'rainbow': ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = u * .16; c.beginPath(); c.arc(0, u * .5, u * (1.05 - i * .15), Math.PI, TAU); c.stroke(); }); c.fillStyle = '#fff'; c.beginPath(); c.arc(-u * 1.0, u * .5, u * .22, 0, TAU); c.arc(u * 1.0, u * .5, u * .22, 0, TAU); c.fill(); break;
      case 'flowers': for (const [x, y, col] of [[-.6, .2, '#ff8aa3'], [0, -.1, '#ffd54a'], [.6, .25, '#b58cf0']]) { c.strokeStyle = '#59b96e'; c.lineWidth = u * .1; c.beginPath(); c.moveTo(x * u, y * u); c.lineTo(x * u, u * .95); c.stroke(); c.fillStyle = col; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x * u + Math.cos(k * TAU / 5) * u * .26, y * u + Math.sin(k * TAU / 5) * u * .26, u * .17, u * .17, 0, 0, TAU); c.fill(); } c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(x * u, y * u, u * .15, 0, TAU); c.fill(); } break;
      case 'frame': c.fillStyle = '#b9805a'; art.rr(c, -u * .85, -u * .85, u * 1.7, u * 1.7, u * .15); c.fill(); c.fillStyle = '#d7f0ff'; art.rr(c, -u * .68, -u * .68, u * 1.36, u * 1.36, u * .1); c.fill(); c.save(); c.translate(0, u * .1); art.avatar(c, (who && who.id) || 'bunny', u * .55); c.restore(); break;
      case 'balloons': for (const [x, y, col] of [[-.55, -.3, '#ff7a93'], [0, -.55, '#ffd54a'], [.55, -.25, '#7fd4f5']]) { c.strokeStyle = 'rgba(90,63,94,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x * u, y * u + u * .5); c.quadraticCurveTo(x * u * .3, u * .8, 0, u * 1.1); c.stroke(); c.fillStyle = col; c.beginPath(); c.ellipse(x * u, y * u, u * .42, u * .52, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(x * u - u * .14, y * u - u * .18, u * .09, u * .16, -.4, 0, TAU); c.fill(); } break;
      case 'plant': c.fillStyle = '#e8735a'; c.beginPath(); c.moveTo(-u * .5, -u * .8); c.lineTo(u * .5, -u * .8); c.lineTo(u * .38, 0); c.lineTo(-u * .38, 0); c.closePath(); c.fill(); c.fillStyle = '#5fbf6a'; for (const [x, a] of [[-.3, -.5], [0, 0], [.3, .5]]) { c.save(); c.translate(x * u, -u * .8); c.rotate(a); c.beginPath(); c.ellipse(0, -u * .55, u * .22, u * .6, 0, 0, TAU); c.fill(); c.restore(); } break;
      case 'chest': c.fillStyle = '#e0574a'; art.rr(c, -u * .85, -u * .8, u * 1.7, u * .8, u * .1); c.fill(); c.fillStyle = '#ff8a7a'; c.beginPath(); c.ellipse(0, -u * .8, u * .85, u * .28, 0, Math.PI, TAU); c.fill(); c.fillStyle = '#ffd54a'; art.star(c, 0, -u * .42, u * .26, '#ffd54a', 0); break;
      case 'teddy': c.fillStyle = '#c98b5b'; c.beginPath(); c.ellipse(0, -u * .4, u * .5, u * .42, 0, 0, TAU); c.fill(); c.fillStyle = '#f3c9a0'; c.beginPath(); c.ellipse(0, -u * .35, u * .3, u * .28, 0, 0, TAU); c.fill(); c.save(); c.translate(0, -u * 1.05); art.avatar(c, 'bear', u * .45); c.restore(); break;
      case 'beanbag': c.fillStyle = '#b58cf0'; c.beginPath(); c.moveTo(-u * .9, 0); c.bezierCurveTo(-u * 1.0, -u * .9, u * 1.0, -u * .9, u * .9, 0); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-u * .3, -u * .5, u * .3, u * .12, -.4, 0, TAU); c.fill(); break;
      case 'ball': c.save(); c.translate(0, -u * .55); c.rotate(t * .0); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, u * .55, 0, TAU); c.fill(); c.save(); c.beginPath(); c.arc(0, 0, u * .55, 0, TAU); c.clip(); ['#ff6b81', '#5cc8f2', '#ffd54a'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, u, i * TAU / 3, i * TAU / 3 + TAU / 6); c.closePath(); c.fill(); }); c.restore(); c.restore(); break;
      case 'lamp': c.fillStyle = '#8a7a9a'; c.fillRect(-u * .05, -u * 1.5, u * .1, u * 1.5); c.fillStyle = '#8a7a9a'; c.beginPath(); c.ellipse(0, 0, u * .4, u * .1, 0, 0, TAU); c.fill(); c.fillStyle = '#ffe3a0'; c.beginPath(); c.moveTo(-u * .5, -u * 1.15); c.lineTo(u * .5, -u * 1.15); c.lineTo(u * .32, -u * 1.75); c.lineTo(-u * .32, -u * 1.75); c.closePath(); c.fill(); break;
      case 'shelf': c.fillStyle = '#b9805a'; art.rr(c, -u * .7, -u * 2.0, u * 1.4, u * 2.0, u * .08); c.fill(); c.fillStyle = '#e8d3b0'; for (let r = 0; r < 3; r++) c.fillRect(-u * .6, -u * 1.9 + r * u * .62, u * 1.2, u * .55);
        ['#ff7a93', '#5cc8f2', '#ffd54a', '#7ed957', '#b58cf0'].forEach((col, i) => { const r = Math.floor(i / 2); c.fillStyle = col; c.fillRect(-u * .55 + (i % 2) * u * .6 + (i > 3 ? 0 : 0), -u * 1.85 + r * u * .62 + u * .12, u * .18, u * .4); c.fillRect(-u * .3 + (i % 2) * u * .6, -u * 1.85 + r * u * .62 + u * .05, u * .16, u * .47); }); break;
      default: { const f = SPG.careRooms && SPG.careRooms.EXTRA[id]; if (f) f(c, u, t, who); break; }
    }
    c.restore();
  }

  const G = SPG.careGroom;   // dirt, suds, wet fur, tangles and burrs: games/petcare-groom.js

  class CareGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      const b = this.bag = store.bag('care', () => ({ hunger: .6, dirt: .3, tired: .5, t: Date.now(), flags: {}, cares: 0 }));
      // time passes gently: needs creep back up, but never all the way
      const mins = clamp((Date.now() - (b.t || Date.now())) / 60000, 0, 60);
      b.hunger = Math.min(.85, Math.max(b.hunger || 0, .35) + mins * .03); b.dirt = Math.min(.55, Math.max(b.dirt || 0, .2) + mins * .02);   // never more than about eight stains: messy, not upsetting b.tired = Math.min(.85, Math.max(b.tired || 0, .3) + mins * .02);
      b.flags = b.flags || {}; b.cares = b.cares || 0; b.t = Date.now();
      const pid = this.who().id; G.seed(b, pid, b.dirt); G.furTick(b, pid, mins);   // dirt becomes real stains; matted fur and burrs come back over time
      b.wall = b.wall || 0; b.floor = b.floor || 0; b.rug = b.rug || 0; b.lamp = b.lamp || 0; b.deco = b.deco || [];
      b.room = b.room || 'home'; b.rooms = b.rooms || {}; if (!ROOMS.some(r => r.id === b.room)) b.room = 'home';
      this.picking = false;
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s * .54); art.heart(c, 0, 0, s * .32, '#ff6b81'); }, b.cares);
      this.fx = new art.Fx(); this.t = 0; this.running = false;
      this.tool = null; this.hold = null; this.sleeping = false; this.sleepT = 0; this.night = 0; this.morning = 0;
      this.foods = []; this.foam = []; this.zz = []; this.wantFruit = FOODS[Math.floor(Math.random() * FOODS.length)]; this.shake = 0; this.hintT = 0;
      this.pet = { x: 0, y: 0, dir: 1, hop: 0, cheer: 0, eat: 0, moving: false };
      // close-up petting: the pet zooms up, and she can stroke it, brush it or spritz it
      this.zoom = 0; this.zoomOn = false; this.ztool = 'hand'; this.trail = []; this.mist = []; this.love = 0; this.shine = 0; this.wet = 0; this.suds = []; this.drips = []; this.scrubT = 0; this.towelT = 0;
      this.purrLevel = 0; this.purrCtl = null; this.purrMode = null; this.clipEnd = 0; this.brushT = 0; this.sprayT = 0; this.lean = { x: 0, y: 0 };
      this.idle = 0; this.tick = this.tick.bind(this);
      SPG.careGame = { probe: () => this.probe(), game: this };   // for tests
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* optional */ } SPG.audio.unlock(); const p = at(e); this.press(p.x, p.y, e.pointerId); });
      cv.addEventListener('pointermove', e => { if (this.hold && this.hold.id === e.pointerId) { e.preventDefault(); const p = at(e); this.hold.x = p.x; this.hold.y = p.y; } });
      for (const n of ['pointerup', 'pointercancel']) cv.addEventListener(n, e => { if (this.hold && this.hold.id === e.pointerId) this.letGo(); });
    }
    probe() {
      const X = this.petXform(), b = this.bag;
      return { w: this.w, h: this.h, zoomOn: this.zoomOn, zoom: this.zoom, tools: this.tools.map(t => ({ id: t.id, x: t.x, y: t.y })), ztools: this.ztools.map(t => ({ id: t.id, x: t.x, y: t.y })), zr: this.zr, X, box: this.petBox(), dirt: b.dirt, grime: (b.grime || []).map(g => ({ ...g })), knots: (b.knots || []).map(k => ({ ...k })), burrs: (b.burrs || []).map(q => ({ ...q })), wet: this.wet, suds: this.suds.length, cares: b.cares, flags: b.flags };
    }
    who() { const a = SPG.pets.active(); return a ? { id: a.id, name: a.name, hat: a.hat, face: a.face, neck: a.neck } : { id: 'bunny', name: 'Pip', hat: null }; }
    wallsOpen() { return clamp(3 + Math.floor(this.bag.cares / UNLOCK_EVERY), 3, WALLS.length); }
    // Rooms: the cozy home keeps its things in the bag itself (so older saves just work); every other room has its own.
    room() { return ROOMS.find(r => r.id === this.bag.room) || ROOMS[0]; }
    st() { const b = this.bag; if (b.room === 'home') return b; return b.rooms[b.room] || (b.rooms[b.room] = { wall: 0, floor: 0, rug: 0, deco: [] }); }
    walls() { return this.room().walls || WALLS; }
    floors() { return this.room().floors || FLOORS; }
    decoOf(id) { return DECO.find(q => q.id === id) || (Z[id] ? { id, z: Z[id] } : null); }
    trayItems() { const r = this.room(); return r.deco ? [...r.deco.map(id => ({ id, z: Z[id] })), ...GENERIC.map(id => DECO.find(q => q.id === id))] : DECO; }
    pickLayout() {
      const n = ROOMS.length, wide = this.wide, cols = wide ? 4 : 2, rows = Math.ceil(n / cols), pad = this.cell * .3, top = this.bs * 1.5 + pad;
      const aw = this.w - pad * 2, ah = this.h - this.bs * 2.3 - top - pad, cw = aw / cols, ch = ah / rows, gap = pad * .5;
      return ROOMS.map((r, i) => ({ id: r.id, r, x: pad + (i % cols) * cw + gap / 2, y: top + Math.floor(i / cols) * ch + gap / 2, w: cw - gap, h: ch - gap }));
    }
    chooseRoom(id) {
      this.picking = false; this.hold = null;
      if (id !== this.bag.room) {
        this.bag.room = id; this.tray = this.trayItems(); this.resize();
        sfx.win(); this.fx.burst(this.w / 2, this.floorY * .5, 18, { colors: ['#ffd54a', '#fff', '#ff8aa3', '#7fd4f5'], speed: 260, g: 120, life: 1.1, size: 7 * this.ui, shape: 'star', up: 100 });
        voice.say('room/' + id);
      } else sfx.tap();
      this.save();
    }

    /* ---------------------------------------------------------------- layout */
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wide = this.w >= this.h * 1.1; this.wide = wide;
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      this.floorY = this.h * (wide ? .6 : .5);
      this.feetY = this.h * (wide ? .82 : .72);
      this.s = Math.min(this.h * (wide ? .5 : .32), this.w * .42);
      this.homeX = this.w * (wide ? .52 : .55);
      this.bedX = this.w * (wide ? .2 : .24);
      this.bs = 38 * this.ui + 20;
      const by = this.h - this.bs * .95, gap = wide ? 2.1 : 1.9;
      this.tools = ['food', 'bath', 'bed', 'deco'].map((id, i) => ({ id, x: this.w / 2 + (i - 1.5) * this.bs * gap, y: by }));
      this.u = this.s * .3;   // one unit of decoration size
      // the decoration tray: a column on the right (wide) or two rows above the toolbar (tall)
      const cell = wide ? Math.min(this.h * .1, this.w * .07) : this.w / 8.8; this.cell = cell;
      const slot = i => wide ? { x: this.w - cell * (i % 2 ? .75 : 1.95), y: this.h * .1 + cell * (Math.floor(i / 2) + .6) * 1.12 } : { x: this.w / 2 + ((i % 8) - 3.5) * cell * 1.07, y: by - this.bs * 1.35 - cell * (1.15 * (1 - Math.floor(i / 8)) + .5) };
      this.tray = this.trayItems(); this.trayPos = this.tray.map((d, i) => slot(i)); this.bin = slot(this.tray.length); this.roomBtn = slot(this.tray.length + 1);
      if (!this.pet.x) { this.pet.x = this.homeX; this.pet.y = this.feetY; }
      // close-up: the pet's feet near the bottom, big; a row of little tools along the bottom edge
      this.S2 = Math.min(this.h * .92, this.w * 1.3); this.zx = this.w / 2; this.zy = this.h * .97;
      const zids = ['hand', 'brush', 'spray', 'sponge', 'towel', 'back'], zs = Math.min(this.bs * 1.85, (this.w - 12) / zids.length);
      this.zr = Math.min(this.bs * .72, zs * .47);   // six little tools along the bottom edge
      this.ztools = zids.map((id, i) => ({ id, x: wide ? this.w - zs * .6 - (zids.length - 1 - i) * zs : this.w / 2 + (i - (zids.length - 1) / 2) * zs, y: this.h - this.bs * .95 }));
      this.fillFoods();
      this.draw();
    }
    /* ---- close-up petting */
    enterZoom() { if (this.sleeping || this.pet.moving || this.zoomOn) return; this.zoomOn = true; this.ztool = 'hand'; this.tool = null; this.hold = null; sfx.pop(); }
    leaveZoom() { this.zoomOn = false; this.hold = null; this.stopPurr(); sfx.tap(); }
    petBox() {   // the part of the zoomed pet that counts as fur
      const S = this.S2, cx = this.zx + this.lean.x, cy = this.zy - S * .42;
      return { cx, cy, rx: S * .3, ry: S * .5 };
    }
    startPurr() {
      if (this.purrCtl || this.purrMode) return;
      const sp = this.who().id; this.purrMode = 'synth'; this.purrCtl = sfx.purr(sp);
      // a recorded purr, if a grown-up has added one, is played instead of the synthesized one
      voice.ambient('purr/' + sp, .7).then(d => { if (d && this.purrMode) { this.purrMode = 'clip'; this.clipEnd = this.t + d; this.purrCtl && this.purrCtl.set(0); } }).catch(() => {});
    }
    stopPurr() { if (this.purrCtl) { this.purrCtl.off(); this.purrCtl = null; } this.purrMode = null; this.purrLevel = 0; }
    fillFoods() {
      const left = this.foods.filter(f => !f.gone);
      while (left.length < 3) { const fresh = FOODS.filter(q => !left.some(f => f.type === q)), k = fresh[Math.floor(Math.random() * fresh.length)]; left.push({ type: k, gone: false, x: 0, y: 0, home: true }); }
      // the fruit it is asking for is always one of the three on the tray
      if (!left.some(f => f.type === this.wantFruit)) { const i = Math.floor(Math.random() * left.length); const f = left[i]; if (!this.hold || this.hold.f !== f) f.type = this.wantFruit; else { const j = (i + 1) % left.length; left[j].type = this.wantFruit; } }
      this.foods = left;
      this.foods.forEach((f, i) => {
        if (this.wide) { f.hx = this.w * .86; f.hy = this.h * (.3 + i * .17); } else { f.hx = this.w * (.25 + i * .25); f.hy = this.h * .87 - this.bs * 1.5; }
        if (f.home) { f.x = f.hx; f.y = f.hy; }
      });
    }
    start() { this.resize(); this.resume(); voice.say('care-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.hold = null; this.stopPurr(); this.save(); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }
    save() { this.bag.t = Date.now(); store.save(); }

    /* ---------------------------------------------------------------- input */
    press(x, y, id) {
      this.idle = 0;
      const near = (b, r) => Math.hypot(x - b.x, y - b.y) < r;
      if (this.zoomOn) { this.pressZoom(x, y, id, near); return; }
      if (this.picking) { const hit = this.pickLayout().find(k => x > k.x && x < k.x + k.w && y > k.y && y < k.y + k.h); if (hit) this.chooseRoom(hit.id); else { this.picking = false; sfx.tap(); } return; }
      for (const t of this.tools) if (near(t, this.bs * .85)) { this.chooseTool(t.id); return; }
      if (this.sleeping) {
        const l = this.lampPos(); if (near(l, this.s * .3)) { this.bag.lamp = (this.bag.lamp + 1) % LAMPS.length; sfx.tap(); this.save(); return; }   // change the night light's color
        if (!this.bedLocked()) this.wakeUp(); return;
      }
      if (this.tool === 'deco') { this.pressDeco(x, y, id); return; }
      if (this.tool === 'food') {
        for (const f of this.foods) if (!f.gone && Math.hypot(x - f.x, y - f.y) < this.s * .2) { this.hold = { kind: 'food', f, id, x, y }; f.home = false; sfx.pop(); return; }
      } else if (this.tool === 'bath') {
        this.hold = { kind: 'sponge', id, x, y, last: { x, y } }; sfx.pop(); return;
      }
      if (Math.abs(x - this.pet.x) < this.s * .4 && y > this.pet.y - this.s * 1.05 && y < this.pet.y + 10) {   // touch the pet: it says hello, then zooms up so she can stroke it
        this.pet.hop = 1; this.pet.cheer = 1.4; SPG.pets.noise(this.who().id);
        this.fx.burst(this.pet.x, this.pet.y - this.s * .95, 4, { colors: ['#ff8aa3', '#ff6b81'], speed: 90, g: -50, life: .9, size: 7 * this.ui, shape: 'heart' });
        this.enterZoom();
      }
    }
    pressZoom(x, y, id, near) {
      for (const t of this.ztools) if (near(t, this.zr * 1.2)) { if (t.id === 'back') this.leaveZoom(); else { this.ztool = t.id; sfx.tap(); this.stopPurrSoon = 0; } return; }
      this.hold = { kind: 'stroke', id, x, y, last: { x, y }, down: this.t };
      if (this.ztool === 'hand') this.doGroom('hand', x, y, 0, 0, true, true);
      if (this.ztool === 'spray') sfx.spray();
    }
    chooseTool(id) {
      if (this.bedLocked()) return;   // still settling into bed: nothing happens, no sounds, no lines
      sfx.tap(); this.picking = false;
      if (id === 'bed') { this.tool = null; this.hold = null; if (this.sleeping) this.wakeUp(); else this.goSleep(); return; }
      if (this.sleeping) this.wakeUp();
      this.tool = this.tool === id ? null : id; this.hold = null;
      if (this.tool === 'food') this.fillFoods();
    }
    letGo() {
      const h = this.hold; this.hold = null; if (!h) return;
      if (h.kind === 'food') {
        const mouth = { x: this.pet.x, y: this.pet.y - this.s * .55 };
        if (Math.hypot(h.x - mouth.x, h.y - mouth.y) < this.s * .4) {
          if (h.f.type === this.wantFruit) this.feed(h.f);
          else { h.f.home = true; this.shake = 1; this.hintT = 3; sfx.oops(); this.pet.hop = .5; }   // "no thank you": the fruit goes back and the right one glows
        } else { h.f.home = true; }
      } else if (h.kind === 'deco') this.dropDeco(h);
    }
    feed(f) {
      f.gone = true; this.pet.eat = 1.2; this.pet.cheer = 1.6; this.pet.hop = 1;
      for (let k = 0; k < 3; k++) setTimeout(() => sfx.munch(), k * 260);
      this.bag.hunger = Math.max(0, this.bag.hunger - .4); this.cared('fed');
      this.fx.burst(this.pet.x, this.pet.y - this.s * .5, 8, { colors: ['#ff8aa3', '#ffd54a'], speed: 120, g: -30, life: 1, size: 7 * this.ui, shape: 'heart' });
      if (this.bag.hunger <= 0) { voice.say('care-food'); }
      const others = FOODS.filter(k => k !== this.wantFruit); this.wantFruit = others[Math.floor(Math.random() * others.length)]; this.hintT = 0;
      setTimeout(() => { if (this.tool === 'food') this.fillFoods(); }, 400);
    }

    /* ---------------------------------------------------------------- sleeping (it sleeps until she wakes it) */
    bedLocked() { return this.sleeping && this.t < (this.bedUntil || 0); }   // for 5 seconds after she puts it to bed it cannot be woken (so it can walk over and lie down, and the lines are not spammed)
    goSleep() { this.sleeping = true; this.sleepT = 0; this.bedUntil = this.t + BED_LOCK; this.pet.target = this.bedX; sfx.lullaby(); this.lull = 0; voice.say('care-sleep'); }
    wakeUp() {
      const slept = this.sleepT >= 5;
      this.sleeping = false; this.pet.target = this.homeX; this.pet.hop = 1; this.pet.cheer = 2.4;
      if (this.night > .3) {   // good morning: sunshine floods in and stars sparkle everywhere
        this.morning = 1; sfx.chime(); voice.say('care-morning');
        for (let k = 0; k < 3; k++) setTimeout(() => this.fx.burst(this.w * (.25 + k * .25), this.h * .3, 12, { colors: ['#ffd54a', '#fff3b0', '#fff'], speed: 220, g: 60, life: 1.3, size: 7 * this.ui, shape: 'star', up: 100 }), k * 220);
      }
      if (slept) this.cared('slept');
      this.save();
    }
    lampPos() { return { x: this.bedX + this.s * .62, y: this.feetY - this.s * .32 }; }
    cared(flag) {
      this.bag.flags[flag] = true; this.bag.cares++; this.counter.set(this.bag.cares);
      if (this.bag.cares % UNLOCK_EVERY === 0 && this.wallsOpen() > 3) { this.fx.burst(this.w / 2, this.h * .2, 10, { colors: ['#ffd54a', '#fff'], speed: 200, g: 100, life: 1, size: 6 * this.ui, shape: 'star', up: 100 }); }
      if (this.bag.flags.fed && this.bag.flags.washed && this.bag.flags.slept) {
        this.bag.flags = {}; store.addStars(1); sfx.win(); this.pet.cheer = 2.4; this.pet.hop = 1;
        this.fx.burst(this.w / 2, this.h * .3, 24, { colors: ['#ff8aa3', '#ffd54a', '#7fd4f5', '#a6e05a'], speed: 300, g: 380, life: 1.2, size: 7 * this.ui, shape: 'star', up: 180 });
        voice.praise();
      }
      this.save();
    }

    /* ---------------------------------------------------------------- decorating */
    sizeOf(d) { return this.u * (d.z === 'wall' ? .62 : .85); }
    zoneY(d, y, u) { return d.z === 'wall' ? clamp(y, u * 1.05, this.floorY - u * 1.0) : clamp(y, this.floorY + u * .5, this.h - this.bs * 2.2); }
    pressDeco(x, y, id) {
      // from the tray: a fresh one
      if (Math.hypot(x - this.roomBtn.x, y - this.roomBtn.y) < this.cell * .55) { this.picking = true; sfx.pop(); return; }
      for (let i = 0; i < this.tray.length; i++) { const p = this.trayPos[i]; if (Math.hypot(x - p.x, y - p.y) < this.cell * .55) { if (this.st().deco.length >= MAX_DECO) { sfx.oops(); return; } this.hold = { kind: 'deco', d: this.tray[i], fresh: true, id, x, y }; sfx.pop(); return; } }
      // a placed one: pick it up (topmost first)
      const S = this.st();
      for (let i = S.deco.length - 1; i >= 0; i--) {
        const it = S.deco[i], d = this.decoOf(it.id); if (!d) continue; const ix = it.x * this.w, iy = it.y * this.h, u = this.sizeOf(d), r = u * (d.z === 'wall' ? 1.15 : 1.0);
        if (Math.abs(x - ix) < r && y > iy - r * (d.z === 'wall' ? 1 : 2.1) && y < iy + r * (d.z === 'wall' ? 1 : .35)) { S.deco.splice(i, 1); this.hold = { kind: 'deco', d, fresh: false, id, x, y }; sfx.pop(); return; }
      }
      // otherwise the wall, the floor and the rug change when touched
      const rug = { x: this.homeX, y: this.feetY + 6, rx: this.s * .95, ry: this.s * .16 };
      if (Math.abs(x - rug.x) < rug.rx && Math.abs(y - rug.y) < rug.ry * 1.5) { S.rug = (S.rug + 1) % RUGS.length; sfx.plink(S.rug); this.save(); return; }
      if (y < this.floorY) { S.wall = (S.wall + 1) % (this.bag.room === 'home' ? this.wallsOpen() : this.walls().length); sfx.plink(S.wall); this.fx.burst(x, y, 6, { colors: ['#fff', '#ffd54a'], speed: 120, g: 0, life: .6, size: 5 * this.ui, shape: 'star' }); this.save(); return; }
      if (y < this.h - this.bs * 2.2) { S.floor = (S.floor + 1) % this.floors().length; sfx.plink(S.floor + 2); this.save(); }
    }
    dropDeco(h) {
      const overBin = Math.hypot(h.x - this.bin.x, h.y - this.bin.y) < this.cell * .7;
      const inTray = this.wide ? h.x > this.w - this.cell * 2.75 : h.y > this.trayPos[0].y - this.cell * .75;
      if (overBin || inTray || !h.d) { if (!h.fresh && (overBin || inTray)) { sfx.whoosh(); this.save(); } return; }   // dropped back in the tray or the bin: gone
      const us = this.sizeOf(h.d), y = this.zoneY(h.d, h.y, us);
      this.st().deco.push({ id: h.d.id, x: clamp(h.x, us, this.w - us) / this.w, y: y / this.h });
      sfx.snap(); this.fx.burst(h.x, y - us * .5, 6, { colors: ['#fff', '#ffd54a'], speed: 110, g: 40, life: .6, size: 5 * this.ui, shape: 'star' });
      this.save();
    }

    /* ---------------------------------------------------------------- loop */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.idle += dt;
      const p = this.pet;
      // walking to where she should be
      const tx = p.target != null ? p.target : this.homeX, dx = tx - p.x; p.moving = Math.abs(dx) > 4;
      if (p.moving) { p.x += Math.sign(dx) * Math.min(Math.abs(dx), this.w * .25 * dt); p.dir = dx > 0 ? 1 : -1; }
      this.shake = Math.max(0, this.shake - dt * 1.6); this.hintT = Math.max(0, this.hintT - dt);
      p.hop = Math.max(0, p.hop - dt * 2.4); p.cheer = Math.max(0, p.cheer - dt); p.eat = Math.max(0, p.eat - dt);
      this.updateZoom(dt);
      // night falls slowly and lifts in the morning
      this.night = clamp(this.night + (this.sleeping ? dt * .7 : -dt * 1.1), 0, 1);
      this.morning = Math.max(0, this.morning - dt * .45);
      // bath: the sponge scrubs what it touches, leaves soap suds, and the pet gets wet
      const h = this.hold;
      if (h && h.kind === 'sponge') {
        const X = this.petXform(), over = Math.abs(h.x - p.x) < this.s * .42 && h.y > p.y - this.s * .95 && h.y < p.y + 6, moved = Math.hypot(h.x - h.last.x, h.y - h.last.y);
        if (over && moved > 3) { this.doGroom('sponge', h.x, h.y, moved, dt, true, false, h.last.x, h.last.y); if ((this.scrubT -= dt) <= 0) { this.scrubT = .14; sfx.bubble(); } }
        h.last = { x: h.x, y: h.y };
      }
      if (G.update(this.bag, this, dt) && Math.random() < .25) sfx.bubble();   // wet fur dries slowly; suds pop by themselves
      this.updateDrips(dt);
      // sleep: it keeps sleeping (deeper and deeper) until she wakes it
      if (this.sleeping && !p.moving) {
        this.sleepT += dt;
        this.bag.tired = Math.max(0, this.bag.tired - dt * .1);
        this.lull = (this.lull || 0) - dt; if (this.lull <= 0) { this.lull = 6.5; sfx.lullaby(); }
        if ((this.zzT = (this.zzT || 0) - dt) <= 0) { this.zzT = 1.1; this.zz.push({ x: p.x + this.s * .25, y: p.y - this.s * .55, life: 1 }); }
      }
      for (const z of this.zz) { z.life -= dt * .6; z.y -= dt * 24; z.x += dt * 10; }
      this.zz = this.zz.filter(z => z.life > 0);
      if (h && h.kind === 'food') { h.f.x = h.x; h.f.y = h.y; }
      for (const f of this.foods) if (f.home && !f.gone) { f.x = lerp(f.x, f.hx, Math.min(1, dt * 10)); f.y = lerp(f.y, f.hy, Math.min(1, dt * 10)); }
      this.fx.update(dt);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---- grooming: where a tool touches the pet, what comes off, and the fuss that goes with it */
    petXform() {
      const e = this.zoom * this.zoom * (3 - 2 * this.zoom);
      return { px: lerp(this.pet.x, this.zx + this.lean.x, e), py: lerp(this.pet.y, this.zy, e), s: lerp(this.s, this.S2, e) };
    }
    doGroom(tool, x, y, moved, dt, on, tap, lx, ly) {
      const X = this.petXform(), b = this.bag, had = [(b.grime || []).length, (b.knots || []).length + (b.burrs || []).length];
      const ev = G.groom(b, tool, { u: (x - X.px) / X.s, v: (y - X.py) / X.s, lu: lx == null ? null : (lx - X.px) / X.s, lv: ly == null ? null : (ly - X.py) / X.s, moved: moved / X.s, dt, on, tap }, this);
      this.groomEvents(ev, X);
      if (had[0] > 0 && !b.grime.length) this.cleanDone(X);
      if (had[1] > 0 && !b.knots.length && !b.burrs.length) this.furDone(X);
    }
    groomEvents(ev, X) {
      const COL = { mud: ['#7b5230', '#a9815a', '#fff'], dust: ['#d8c7a8', '#b9a58a'], grass: ['#7dbf5a', '#4d8a3a'], jam: ['#e24b6c', '#b3203f'] }, body = (SPG.pets.SPECIES[this.who().id] || {}).body || '#fff', ui = this.ui;
      for (const e of ev) {
        const sx = X.px + e.x * X.s, sy = X.py + e.y * X.s;
        if (e.t === 'scrub') { if (Math.random() < .14) this.fx.burst(sx, sy, 1, { colors: COL[e.k], speed: 60, g: 280, life: .6, size: 3 * ui + 2 }); }
        else if (e.t === 'grime') { sfx.pop(); this.fx.burst(sx, sy, 8, { colors: COL[e.k].concat('#fff'), speed: 140, g: 300, life: .8, size: 4 * ui + 2 }); this.fx.burst(sx, sy, 3, { colors: ['#fff', '#bfe9ff'], speed: 90, g: -20, life: .8, size: 5 * ui, shape: 'star', up: 40 }); this.love += .08; }
        else if (e.t === 'hair') { if (Math.random() < .2) this.fx.burst(sx, sy, 1, { colors: [body, '#fff'], speed: 50, g: 20, life: 1, size: 3 * ui + 2 }); }
        else if (e.t === 'knot') { sfx.pop(); sfx.chime(); this.fx.burst(sx, sy, 10, { colors: [body, '#fff'], speed: 130, g: 40, life: 1, size: 4 * ui + 2 }); this.fx.burst(sx, sy, 3, { colors: ['#fff7c2', '#fff'], speed: 90, g: -20, life: .9, size: 6 * ui, shape: 'star', up: 40 }); this.love += .3; this.shine = Math.min(1, this.shine + .3); this.pet.hop = Math.max(this.pet.hop, .5); }
        else if (e.t === 'burr') { sfx.pop(); this.fx.burst(sx, sy, 7, { colors: ['#9a7a45', '#6e5128'], speed: 200, g: 520, life: .9, size: 4 * ui + 2, up: 160 }); this.love += .25; this.pet.cheer = Math.max(this.pet.cheer, 1); }
      }
    }
    cleanDone(X) {   // every last stain is gone
      const p = this.pet;
      this.suds.forEach(q => { q.life = Math.min(q.life, 3); });
      sfx.chime(); voice.say('care-clean');
      this.fx.burst(X.px, X.py - X.s * .5, 16, { colors: ['#fff', '#bfe9ff', '#ffd54a'], speed: 200, g: -20, life: 1, size: 6 * this.ui, shape: 'star', up: 60 });
      p.cheer = 2; p.hop = 1; this.cared('washed');
    }
    furDone(X) {   // all the tangles and burrs are out: soft, shiny fur
      sfx.chime(); this.shine = 1; this.love += .3; this.pet.cheer = 2;
      this.fx.burst(X.px, X.py - X.s * .45, 12, { colors: ['#ff8aa3', '#fff7c2', '#fff'], speed: 220, g: 60, life: 1.1, size: 8 * this.ui, shape: 'heart', up: 90 });
    }
    updateDrips(dt) {   // wet fur drips
      const X = this.petXform();
      if (this.wet > .45 && !this.sleeping && Math.random() < dt * this.wet * 3) this.drips.push({ x: X.px + (Math.random() - .5) * X.s * .36, y: X.py - Math.random() * X.s * .1, vy: 0, life: 1 });
      for (const d of this.drips) { d.vy += 900 * this.ui * dt; d.y += d.vy * dt; d.life -= dt * .9; }
      this.drips = this.drips.filter(d => d.life > 0 && d.y < this.h);
    }

    // Stroking, brushing and spritzing in the close-up view. The pet leans into her finger and purrs more the more she strokes.
    updateZoom(dt) {
      this.zoom = clamp(this.zoom + (this.zoomOn ? dt / .45 : -dt / .4), 0, 1);
      this.shine = Math.max(0, this.shine - dt * .015);
      const hs = this.hold && this.hold.kind === 'stroke' ? this.hold : null, id = this.who().id, body = (SPG.pets.SPECIES[id] || {}).body || '#fff';
      let target = 0;
      if (this.zoomOn && hs) {
        const B = this.petBox(), nx = (hs.x - B.cx) / B.rx, ny = (hs.y - B.cy) / B.ry, inside = nx * nx + ny * ny < 1;
        const moved = Math.hypot(hs.x - hs.last.x, hs.y - hs.last.y);
        this.lean.x += ((hs.x - this.zx) * .05 - this.lean.x) * Math.min(1, dt * 6);
        if (this.ztool === 'spray') {
          const dx = B.cx - hs.x, dy = B.cy - hs.y, d = Math.hypot(dx, dy) || 1;
          for (let k = 0; k < 4; k++) this.mist.push({ x: hs.x, y: hs.y, vx: dx / d * (300 + Math.random() * 260) + (Math.random() - .5) * 170, vy: dy / d * (300 + Math.random() * 260) + (Math.random() - .5) * 170, life: .7 + Math.random() * .4, r: 5 + Math.random() * 6 });
          if (inside) this.shine = Math.min(1, this.shine + dt * .25);
          this.doGroom('spray', hs.x, hs.y, 0, dt, inside);
          if ((this.sprayT -= dt) <= 0) { this.sprayT = .32; sfx.spray(); }
          target = inside ? .5 : 0;
        } else if (inside) {
          const speed = moved / Math.max(dt, .001), tl = this.ztool, brush = tl === 'brush';
          target = clamp((brush ? .55 : .4) + speed / 600, 0, 1);
          if (moved > 2) {
            if (tl === 'hand' || brush) this.trail.push({ x1: hs.last.x, y1: hs.last.y, x2: hs.x, y2: hs.y, life: 1, brush });
            if (tl === 'sponge' || tl === 'towel' || brush) this.doGroom(tl, hs.x, hs.y, moved, dt, true, false, hs.last.x, hs.last.y);
            if (tl === 'sponge' && (this.scrubT -= dt) <= 0) { this.scrubT = .14; sfx.bubble(); }
            if (tl === 'towel' && (this.towelT -= dt) <= 0) { this.towelT = .2; sfx.brush(); }
            this.love += moved * .0012;
            if (brush) { this.shine = Math.min(1, this.shine + moved * .0012); if (Math.random() < .5) this.fx.burst(hs.x, hs.y, 1, { colors: [body, '#fff'], speed: 60, g: 30, life: .9, size: 3 * this.ui + 2 }); }
            if ((this.brushT -= dt) <= 0) { this.brushT = brush ? .1 : .5; if (brush) sfx.brush(); }
            if (Math.random() < dt * 3.2) this.fx.burst(hs.x, hs.y - 20, 1, { colors: ['#ff8aa3', '#ff6b81'], speed: 60, g: -70, life: 1.1, size: 9 * this.ui, shape: 'heart' });
          }
        }
        hs.last = { x: hs.x, y: hs.y };
        if (this.love >= 1) { this.love = 0; this.cared('loved'); sfx.chime(); this.pet.cheer = 2; this.fx.burst(this.zx, this.zy - this.S2 * .6, 14, { colors: ['#ff8aa3', '#ffd54a', '#fff'], speed: 260, g: 120, life: 1.2, size: 9 * this.ui, shape: 'heart', up: 140 }); }
      } else this.lean.x *= 1 - Math.min(1, dt * 5);
      this.purrLevel += ((this.zoomOn ? target : 0) - this.purrLevel) * Math.min(1, dt * (target > this.purrLevel ? 3 : 1.1));
      if (this.zoomOn && this.purrLevel > .06) this.startPurr();
      if (this.purrCtl && this.purrMode === 'synth') this.purrCtl.set(this.purrLevel);
      else if (this.purrMode === 'clip' && this.purrLevel > .15 && this.t > this.clipEnd - .05) { this.clipEnd = this.t + 1.5; voice.ambient('purr/' + id, .7 * this.purrLevel).then(d => { this.clipEnd = this.t + (d || 1.5); }).catch(() => {}); }
      for (const m of this.mist) { m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 1 - dt * 1.5; m.vy *= 1 - dt * 1.5; m.r += dt * 26; m.life -= dt * 1.5; }
      this.mist = this.mist.filter(m => m.life > 0);
      for (const tr of this.trail) tr.life -= dt * 1.5;
      this.trail = this.trail.filter(tr => tr.life > 0);
    }

    /* ---------------------------------------------------------------- drawing */
    need() {
      const b = this.bag, list = [['food', b.hunger], ['bath', b.dirt], ['bed', b.tired]].filter(x => x[1] > .5).sort((a, c) => c[1] - a[1]);
      return list.length ? list[0][0] : null;
    }
    drawRoom(c) {
      const w = this.w, h = this.h, fy = this.floorY, n = this.night, R = this.room(), S = this.st(), W = this.walls()[S.wall % this.walls().length], F = this.floors()[S.floor % this.floors().length];
      const wall = c.createLinearGradient(0, 0, 0, fy); wall.addColorStop(0, W.top); wall.addColorStop(1, W.bot); c.fillStyle = wall; c.fillRect(0, 0, w, fy);
      // the wallpaper pattern
      c.save(); c.beginPath(); c.rect(0, 0, w, fy); c.clip();
      const pw = 70;
      if (PATS.has(W.pat)) roomPattern(c, W.pat, w, fy, this.t);
      else if (W.pat === 'stripes') { c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < w; x += pw) c.fillRect(x, 0, 24, fy); }
      else if (W.pat === 'dots') { c.fillStyle = 'rgba(255,255,255,.55)'; for (let y = 22; y < fy; y += 46) for (let x = (y / 46 % 2 ? 22 : 0); x < w; x += 46) { c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); } }
      else if (W.pat === 'clouds') { for (let y = 40; y < fy; y += 90) for (let x = (y / 90 % 2 ? 60 : 10); x < w; x += 130) art.cloud(c, x, y, .32, .7); }
      else if (W.pat === 'rays') { c.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(w / 2, fy * 1.2); c.arc(w / 2, fy * 1.2, w, Math.PI + i * .22, Math.PI + i * .22 + .11); c.closePath(); c.fill(); } }
      else if (W.pat === 'stars') { for (let y = 34; y < fy; y += 68) for (let x = (y / 68 % 2 ? 50 : 15); x < w; x += 100) art.star(c, x, y, 9, 'rgba(255,255,255,.75)', 0); }
      else { c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; for (let y = 30; y < fy; y += 44) { c.beginPath(); for (let x = 0; x <= w; x += 14) c.lineTo(x, y + Math.sin(x / 22) * 6); c.stroke(); } }
      c.restore();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(0, fy - 16, w, 16);
      const fl = c.createLinearGradient(0, fy, 0, h); fl.addColorStop(0, F[0]); fl.addColorStop(1, F[1]); c.fillStyle = fl; c.fillRect(0, fy, w, h - fy);
      c.fillStyle = 'rgba(90,63,94,.1)'; for (let y = fy + 30; y < h; y += 46) c.fillRect(0, y, w, 3);
      // window: the sky turns to night
      const wx = this.wide ? w * .42 : w * .5, wy = h * .06, ww = Math.min(w * .3, 300), wh = ww * .75;
      c.fillStyle = '#fff'; art.rr(c, wx - ww / 2 - 12, wy - 12, ww + 24, wh + 24, 18); c.fill();
      if (R.view) { c.save(); c.beginPath(); c.rect(wx - ww / 2, wy, ww, wh); c.clip(); R.view(c, wx - ww / 2, wy, ww, wh, this.t); c.restore(); }
      else { const sky = c.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#a9e1f3'); sky.addColorStop(1, '#fdf6df'); c.fillStyle = sky; c.fillRect(wx - ww / 2, wy, ww, wh);
        art.cloud(c, wx - ww * .15 + Math.sin(this.t * .3) * 14, wy + wh * .4, ww / 620, .95); }
      if (n > 0) {
        c.globalAlpha = n; const ns = c.createLinearGradient(0, wy, 0, wy + wh); ns.addColorStop(0, '#2c3566'); ns.addColorStop(1, '#5d55a0'); c.fillStyle = ns; c.fillRect(wx - ww / 2, wy, ww, wh);
        for (let i = 0; i < 8; i++) art.star(c, wx - ww / 2 + ww * (.1 + (i * .13) % .82), wy + wh * (.12 + (i * .29) % .6), 4 + (i % 3) * 2 + Math.sin(this.t * 2 + i) * 1.5, '#fff3b0');
        c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(wx + ww * .25, wy + wh * .3, wh * .14, 0, TAU); c.fill(); c.fillStyle = '#4b4a92'; c.beginPath(); c.arc(wx + ww * .25 + wh * .06, wy + wh * .27, wh * .12, 0, TAU); c.fill(); c.globalAlpha = 1;
      }
      c.fillStyle = '#fff'; c.fillRect(wx - 4, wy, 8, wh); c.fillRect(wx - ww / 2, wy + wh / 2 - 4, ww, 8);
      // rug
      c.fillStyle = RUGS[S.rug % RUGS.length]; c.beginPath(); c.ellipse(this.homeX, this.feetY + 6, this.s * .95, this.s * .16, 0, 0, TAU); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 5; c.setLineDash([12, 10]); c.beginPath(); c.ellipse(this.homeX, this.feetY + 6, this.s * .84, this.s * .12, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      // bed and the little table with its night light
      const bx = this.bedX, by = this.feetY, bw = this.s * .95;
      c.fillStyle = '#b9805a'; art.rr(c, bx - bw / 2, by - this.s * .32, bw, this.s * .34, 14); c.fill();
      c.fillStyle = '#fff'; art.rr(c, bx - bw / 2 + 8, by - this.s * .42, bw - 16, this.s * .24, 16); c.fill();
      c.fillStyle = '#ffd1dc'; art.rr(c, bx - bw / 2 + 12, by - this.s * .48, bw * .3, this.s * .16, 14); c.fill();
      c.fillStyle = '#b9805a'; art.rr(c, bx - bw / 2 - 8, by - this.s * .55, 16, this.s * .6, 8); c.fill();
      const lp = this.lampPos(); c.fillStyle = '#b9805a'; art.rr(c, lp.x - this.s * .14, lp.y, this.s * .28, this.s * .32, 8); c.fill();
      c.fillStyle = '#d9a06c'; c.fillRect(lp.x - this.s * .14, lp.y + this.s * .12, this.s * .28, 4);
    }
    // the night light and the stars it shines on the wall: drawn after the dark so they glow
    drawNightLight(c) {
      const n = this.night; if (n <= 0.02) return;
      const col = LAMPS[this.bag.lamp % LAMPS.length], lp = this.lampPos(), r = this.s * .075, pulse = 1 + Math.sin(this.t * 1.6) * .05;
      c.save(); c.globalAlpha = n;
      const g = c.createRadialGradient(lp.x, lp.y - r, r * .3, lp.x, lp.y - r, this.s * 1.3 * pulse); g.addColorStop(0, col + '99'); g.addColorStop(.45, col + '2a'); g.addColorStop(1, col + '00');
      c.fillStyle = g; c.beginPath(); c.arc(lp.x, lp.y - r, this.s * 1.3, 0, TAU); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(lp.x, lp.y - r, r, Math.PI, 0); c.lineTo(lp.x + r * .8, lp.y); c.lineTo(lp.x - r * .8, lp.y); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(lp.x - r * .35, lp.y - r * 1.35, r * .25, r * .12, -.6, 0, TAU); c.fill();
      // the light throws slowly turning stars on the wall
      c.translate(this.bedX + this.s * .3, this.floorY * .5);
      const R = Math.min(this.w, this.floorY) * .34;
      for (let i = 0; i < 18; i++) {
        const a = i * 2.399 + this.t * .07, rr = R * Math.sqrt((i + .5) / 18), tw = .55 + Math.sin(this.t * 1.8 + i * 1.7) * .4;
        c.globalAlpha = n * tw * .95; art.star(c, Math.cos(a) * rr * 1.4, Math.sin(a) * rr * .8, (5 + (i % 4) * 2.4) * (this.w > 700 ? 1.3 : 1), col, a);
      }
      c.restore();
    }
    drawDecos(c, before) {
      const who = this.who();
      for (const it of this.st().deco) {
        const d = this.decoOf(it.id); if (!d) continue;
        const y = it.y * this.h; if (before !== undefined && (y < this.pet.y) !== before && d.z === 'floor') continue;
        if (before === false && d.z === 'wall') continue;
        c.save(); c.translate(it.x * this.w, y); if (d.z === 'floor') { c.fillStyle = 'rgba(90,63,94,.13)'; c.beginPath(); c.ellipse(0, 2, this.sizeOf(d) * .7, this.sizeOf(d) * .1, 0, 0, TAU); c.fill(); } drawDeco(c, d.id, this.sizeOf(d), this.t, who); c.restore();
      }
    }
    icon(c, id, r, type) {
      c.save(); c.lineCap = c.lineJoin = 'round';
      if (id === 'food') { art.fruit(c, type == null ? 0 : type, r * .8, { mood: 'happy' }); }
      else if (id === 'bath') {
        c.fillStyle = '#ffd54a'; art.rr(c, -r * .7, -r * .35, r * 1.4, r * .8, r * .2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.5)'; for (const [x, y, q] of [[-.3, -.05, .12], [.2, .1, .1], [0, -.2, .08]]) { c.beginPath(); c.arc(x * r, y * r, q * r, 0, TAU); c.fill(); }
        c.fillStyle = '#fff'; c.strokeStyle = '#8fd0ff'; c.lineWidth = r * .06; for (const [x, y, q] of [[.5, -.65, .22], [.05, -.85, .16], [.75, -.3, .12]]) { c.beginPath(); c.arc(x * r, y * r, q * r, 0, TAU); c.fill(); c.stroke(); }
      } else if (id === 'deco') {   // a palette with a star
        c.fillStyle = '#e8c9a0'; c.beginPath(); c.ellipse(0, r * .05, r * .85, r * .68, -.2, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(r * .35, r * .25, r * .16, 0, TAU); c.fill();
        [['#ff6b81', -.45, -.15], ['#ffd54a', -.1, -.4], ['#5cc8f2', .3, -.3], ['#7ed957', -.5, .3]].forEach(([col, x, y]) => { c.fillStyle = col; c.beginPath(); c.arc(x * r, y * r, r * .17, 0, TAU); c.fill(); });
        art.star(c, r * .55, -r * .55, r * .3, '#ffd54a', 0);
      } else { c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(0, 0, r * .75, 0, TAU); c.fill(); c.fillStyle = '#5d55a0'; c.beginPath(); c.arc(r * .35, -r * .2, r * .62, 0, TAU); c.fill(); art.star(c, r * .3, r * .3, r * .22, '#ffd54a', 0); }
      c.restore();
    }
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      this.drawRoom(c);
      const p = this.pet, who = this.who(), sleepAtBed = this.sleeping && !p.moving;
      const e = this.zoom * this.zoom * (3 - 2 * this.zoom);   // 0 = in the room, 1 = zoomed up for petting
      const s = lerp(this.s, this.S2, e), px = lerp(p.x, this.zx + this.lean.x, e), py = lerp(p.y, this.zy, e);
      this.drawDecos(c, true);   // wall things, and floor things behind the pet
      if (e > 0) { c.fillStyle = `rgba(255,240,228,${(e * .66).toFixed(3)})`; c.fillRect(0, 0, w, h); }
      // the pet
      c.save(); c.translate(px, py - (p.moving ? Math.abs(Math.sin(this.t * 9)) * s * .03 : 0));
      if (sleepAtBed) { c.translate(0, -s * .12); c.scale(.85, .85); }
      c.rotate(this.lean.x * .0012 * e + Math.sin(this.t * 34) * .09 * this.shake);
      c.fillStyle = 'rgba(90,63,94,.14)'; c.beginPath(); c.ellipse(0, 3, s * .32, s * .05, 0, 0, TAU); c.fill();
      const mood = sleepAtBed ? 'sleep' : p.cheer > 0 || p.eat > 0 || this.purrLevel > .18 ? 'cheer' : 'happy';
      const popts = { mood, hop: p.hop > 0 ? 1 - p.hop : 0, hat: who.hat, face: who.face, neck: who.neck, detail: 1 + e * 1.3 };
      // stains, suds, wet fur, tangles and burrs sit on the pet itself
      if (G.busy(this.bag, this)) this.drawGroomed(c, who, s, popts); else SPG.pets.draw(c, who.id, s, this.t, popts);
      c.restore();
      for (const d of this.drips) { c.globalAlpha = clamp(d.life * 1.5, 0, 1) * .85; c.fillStyle = '#9fd4ff'; c.beginPath(); c.ellipse(d.x, d.y, 2.6 * this.ui + 1, 4.2 * this.ui + 1.5, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(d.x - this.ui, d.y - this.ui, this.ui + .5, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      if (e > .02) this.drawZoomFx(c, e);
      if (e < .5) this.drawDecos(c, false);   // floor things in front of the pet
      if (sleepAtBed) { c.fillStyle = '#7fd4f5'; art.rr(c, this.bedX - s * .42, p.y - s * .42, s * .84, s * .22, 12); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 4; i++) c.fillRect(this.bedX - s * .36 + i * s * .2, p.y - s * .4, s * .05, s * .18); }
      for (const f of this.foam) { c.globalAlpha = Math.min(1, f.life); c.fillStyle = '#fff'; c.strokeStyle = '#a8dcff'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.fill(); c.stroke(); }
      c.globalAlpha = 1;
      // night: the room goes dark, then the night light and its stars glow; lamps in the room light up too
      if (this.night > 0) { c.fillStyle = `rgba(14,16,54,${(this.night * .7).toFixed(3)})`; c.fillRect(0, 0, w, h); }
      if (this.night > .05) for (const it of this.st().deco) if (GLOW[it.id] != null) { const us = this.sizeOf({ z: 'floor' }), lx = it.x * w, ly = it.y * h - us * GLOW[it.id], g = c.createRadialGradient(lx, ly, 0, lx, ly, us * 3); g.addColorStop(0, `rgba(255,222,150,${(this.night * .55).toFixed(3)})`); g.addColorStop(1, 'rgba(255,222,150,0)'); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, us * 3, 0, TAU); c.fill(); }
      this.drawNightLight(c);
      // morning: warm sunshine sweeps across the room and fades
      if (this.morning > 0) { const k = this.morning, g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, `rgba(255,236,160,${(k * .55).toFixed(3)})`); g.addColorStop(1, `rgba(255,214,150,${(k * .15).toFixed(3)})`); c.fillStyle = g; c.fillRect(0, 0, w, h); }
      c.font = `700 ${s * .16}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
      for (const z of this.zz) { c.globalAlpha = Math.max(0, z.life); c.fillText('z', z.x, z.y); }
      c.globalAlpha = 1;
      // what would it like? a thought bubble
      // the thought bubble shows what it wants; with the fruit tray open it always shows the exact fruit it is asking for
      const asking = this.tool === 'food' && !this.sleeping && !this.zoomOn && this.zoom < .05;
      const want = asking ? 'food' : !this.sleeping && !this.hold && this.tool !== 'deco' && !this.zoomOn && this.zoom < .05 && this.need();
      if (want) {
        const bx = p.x + s * .38, by = p.y - s * 1.12 + Math.sin(this.t * 3) * 4, br = s * (asking ? .22 : .17);
        c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill(); c.beginPath(); c.arc(bx - br * .9, by + br * 1.1, br * .22, 0, TAU); c.fill(); c.beginPath(); c.arc(bx - br * .6, by + br * .8, br * .14, 0, TAU); c.fill();
        c.save(); c.translate(bx, by); this.icon(c, want, br * .75, this.wantFruit); c.restore();
      }
      // fruit tray
      if (this.tool === 'food') {
        for (const f of this.foods) { if (f.gone) continue; c.save(); c.translate(f.x, f.y); if (f.type === this.wantFruit && (this.hintT > 0 || this.idle > 7)) { const k = .5 + Math.sin(this.t * 6) * .5; c.fillStyle = `rgba(255,224,102,${(.35 + k * .35).toFixed(3)})`; c.beginPath(); c.arc(0, 0, s * (.17 + k * .02), 0, TAU); c.fill(); } c.scale(this.hold && this.hold.f === f ? 1.2 : 1, this.hold && this.hold.f === f ? 1.2 : 1); art.fruit(c, f.type, s * .13, { mood: 'happy' }); c.restore(); }
      }
      if (this.tool === 'bath' && !this.hold) { c.save(); c.translate(this.wide ? w * .86 : w * .82, this.wide ? h * .5 : h * .87 - this.bs * 1.5); c.scale(1 + Math.sin(this.t * 4) * .05, 1 + Math.sin(this.t * 4) * .05); this.icon(c, 'bath', s * .2); c.restore(); }
      if (this.hold && this.hold.kind === 'sponge') { c.save(); c.translate(this.hold.x, this.hold.y); this.icon(c, 'bath', s * .2); c.restore(); }
      if (this.tool === 'deco') this.drawTray(c);
      if (this.picking) this.drawPicker(c);
      this.fx.draw(c);
      // toolbar
      if (this.zoom > .3) this.drawZoomBar(c);
      else for (const t of this.tools) {
        const on = this.tool === t.id || (t.id === 'bed' && this.sleeping), hint = this.need() === t.id && !this.sleeping && !this.tool;
        c.fillStyle = 'rgba(90,63,94,.18)'; c.beginPath(); c.arc(t.x, t.y + 6, this.bs * .72, 0, TAU); c.fill();
        c.fillStyle = on ? '#fff3c4' : '#fff'; c.beginPath(); c.arc(t.x, t.y, this.bs * (hint ? .72 + Math.sin(this.t * 6) * .03 : .72), 0, TAU); c.fill();
        if (on) { c.strokeStyle = '#59b96e'; c.lineWidth = 6; c.stroke(); }
        c.save(); c.translate(t.x, t.y); this.icon(c, t.id, this.bs * .55); c.restore();
        if (t.id === 'bed' && this.bedLocked()) {   // resting: a ring fills round the button until it can be touched again
          const k = clamp(1 - (this.bedUntil - this.t) / BED_LOCK, 0, 1);
          c.fillStyle = 'rgba(90,63,94,.28)'; c.beginPath(); c.arc(t.x, t.y, this.bs * .72, 0, TAU); c.fill();
          c.strokeStyle = '#59b96e'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.arc(t.x, t.y, this.bs * .72, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
        }
      }
    }
    // the pet and everything on it: drawn on a spare canvas so stains, suds and wet fur stay inside its outline
    drawGroomed(c, who, s, popts) {
      const k = Math.min(SPG.ui.dpr(), 1.25), full = Math.max(this.S2, s), W = 1.24, H = 1.72, X0 = -.62, Y0 = -1.55;
      if (!this.lay) { this.lay = document.createElement('canvas'); this.lc = this.lay.getContext('2d'); }
      const lw = Math.ceil(W * full * k) + 2, lh = Math.ceil(H * full * k) + 2, bw = Math.ceil(W * s * k), bh = Math.ceil(H * s * k), lc = this.lc;
      if (this.lay.width !== lw || this.lay.height !== lh) { this.lay.width = lw; this.lay.height = lh; }
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, bw + 2, bh + 2);
      lc.setTransform(k, 0, 0, k, -X0 * s * k, -Y0 * s * k);
      SPG.pets.draw(lc, who.id, s, this.t, popts);
      lc.globalCompositeOperation = 'source-atop'; G.drawLayer(lc, s, this.t, who.id, this.bag, this); lc.globalCompositeOperation = 'source-over';
      c.drawImage(this.lay, 0, 0, bw, bh, X0 * s, Y0 * s, bw / k, bh / k);
    }
    towelSprite(c, r) {   // a fluffy towel; the middle is at (0, 0)
      c.save(); c.lineCap = c.lineJoin = 'round'; c.rotate(-.25);
      c.fillStyle = '#7fd4f5'; art.rr(c, -r * .95, -r * .6, r * 1.9, r * 1.2, r * .22); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-r * .95, -r * .22, r * 1.9, r * .16); c.fillRect(-r * .95, r * .08, r * 1.9, r * .16);
      c.fillStyle = 'rgba(255,255,255,.35)'; art.rr(c, -r * .85, -r * .55, r * 1.2, r * .16, r * .08); c.fill();
      c.strokeStyle = '#5bb8e0'; c.lineWidth = Math.max(1, r * .06); for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * r * .2, r * .6); c.lineTo(i * r * .2, r * .78); c.stroke(); }   // fringe
      c.restore();
    }
    // little tools for the close-up: a hand, a brush and a spray bottle
    brushSprite(c, r) {   // the tip of the bristles is at (0, 0)
      c.save(); c.lineCap = c.lineJoin = 'round'; c.rotate(-.5);
      c.fillStyle = '#b9805a'; art.rr(c, -r * .15, -r * 2.2, r * .3, r * 1.7, r * .1); c.fill();
      c.fillStyle = '#ff8aa3'; art.rr(c, -r * .58, -r * .62, r * 1.16, r * .6, r * .14); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, r * .08); for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(k * r * .12, -r * .06); c.lineTo(k * r * .12, r * .1); c.stroke(); }
      c.restore();
    }
    sprayBottle(c, r, press) {   // the nozzle is at (0, 0) and points left
      c.save(); c.lineCap = c.lineJoin = 'round';
      c.fillStyle = '#9fdcff'; art.rr(c, r * .35, -r * .05, r * 1.0, r * 1.7, r * .24); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; art.rr(c, r * .5, r * .1, r * .18, r * 1.4, r * .08); c.fill();
      c.fillStyle = '#fff'; art.rr(c, r * .55, r * .5, r * .6, r * .5, r * .1); c.fill(); art.heart(c, r * .85, r * .78, r * .16, '#ff6b81');
      c.fillStyle = '#ffffff'; art.rr(c, r * .55, -r * .35, r * .4, r * .35, r * .06); c.fill();
      c.fillStyle = '#ff8aa3'; art.rr(c, -r * .05, -r * .62, r * 1.35, r * .42, r * .14); c.fill();
      c.fillStyle = '#ff6b81'; art.rr(c, -r * .28, -r * .56, r * .38, r * .28, r * .07); c.fill();
      c.fillStyle = '#e8433f'; c.save(); c.translate(r * .4, -r * .18); c.rotate(press ? .35 : 0); art.rr(c, -r * .05, 0, r * .16, r * .55, r * .06); c.fill(); c.restore();
      c.restore();
    }
    drawZoomBar(c) {
      const k = clamp((this.zoom - .3) / .7, 0, 1);
      for (const t of this.ztools) {
        const on = this.ztool === t.id && t.id !== 'back';
        c.save(); c.globalAlpha = k;
        c.fillStyle = 'rgba(90,63,94,.18)'; c.beginPath(); c.arc(t.x, t.y + 6, this.zr, 0, TAU); c.fill();
        c.fillStyle = on ? '#fff3c4' : '#fff'; c.beginPath(); c.arc(t.x, t.y, this.zr, 0, TAU); c.fill();
        if (on) { c.strokeStyle = '#59b96e'; c.lineWidth = 6; c.stroke(); }
        c.translate(t.x, t.y); const r = this.zr * .58;
        if (t.id === 'hand') art.hand(c, 0, 0, r * 1.5, 0);
        else if (t.id === 'brush') { c.translate(-r * .3, r * .6); this.brushSprite(c, r * .9); }
        else if (t.id === 'spray') { c.translate(-r * .5, r * .05); this.sprayBottle(c, r * .8, false); }
        else if (t.id === 'sponge') this.icon(c, 'bath', r * 1.15);
        else if (t.id === 'towel') this.towelSprite(c, r * .95);
        else { c.strokeStyle = '#59b96e'; c.lineWidth = r * .32; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(r * .35, -r * .6); c.lineTo(-r * .45, 0); c.lineTo(r * .35, r * .6); c.stroke(); }
        c.restore();
      }
    }
    // hair swishes, damp droplets, a glossy shine, mist, and the tool in her hand
    drawZoomFx(c, e) {
      const hs = this.hold && this.hold.kind === 'stroke' ? this.hold : null, B = this.petBox(), ui = this.ui;
      c.save(); c.globalAlpha = e;
      if (this.shine > .03) {   // brushed fur glows
        const g = c.createRadialGradient(B.cx - B.rx * .3, B.cy - B.ry * .4, 0, B.cx - B.rx * .3, B.cy - B.ry * .4, B.rx * 1.3); g.addColorStop(0, `rgba(255,255,255,${(this.shine * .35).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(B.cx, B.cy, B.rx * 1.1, B.ry * 1.1, 0, 0, TAU); c.fill();
        for (let i = 0; i < 6; i++) { const a = i * 1.7 + this.t * .4, tw = .5 + Math.sin(this.t * 3 + i * 2) * .5; c.globalAlpha = e * this.shine * tw; art.star(c, B.cx + Math.cos(a) * B.rx * .8, B.cy + Math.sin(a * 1.3) * B.ry * .7, (6 + (i % 3) * 3) * ui, '#fff7c2', a); }
        c.globalAlpha = e;
      }
      for (const tr of this.trail) {   // the path of her finger or brush through the fur
        c.globalAlpha = e * clamp(tr.life, 0, 1) * (tr.brush ? .7 : .35); c.lineCap = 'round';
        const dx = tr.x2 - tr.x1, dy = tr.y2 - tr.y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
        if (tr.brush) { c.strokeStyle = '#fff'; c.lineWidth = 2 * ui + 1; for (const o of [-9, -3, 3, 9]) { c.beginPath(); c.moveTo(tr.x1 + nx * o * ui, tr.y1 + ny * o * ui); c.lineTo(tr.x2 + nx * o * ui, tr.y2 + ny * o * ui); c.stroke(); } }
        else { c.strokeStyle = '#fff'; c.lineWidth = 14 * ui; c.beginPath(); c.moveTo(tr.x1, tr.y1); c.lineTo(tr.x2, tr.y2); c.stroke(); }
      }
      c.globalAlpha = e;
      for (const m of this.mist) { c.globalAlpha = e * clamp(m.life, 0, 1) * .5; c.fillStyle = '#d8f1ff'; c.beginPath(); c.arc(m.x, m.y, m.r, 0, TAU); c.fill(); }
      c.globalAlpha = e;
      // the tool: follows her finger, or waits at the side
      const rest = { x: this.w * .84, y: this.h * .42 + Math.sin(this.t * 2.5) * 6 }, pos = hs ? { x: hs.x, y: hs.y } : rest, r = this.S2 * .07;
      if (this.ztool === 'brush') { c.save(); c.translate(pos.x, pos.y); this.brushSprite(c, r); c.restore(); }
      else if (this.ztool === 'spray') { c.save(); c.translate(pos.x + r * .75, pos.y + r * .5); c.translate(-r * .75, -r * .5); this.sprayBottle(c, r, !!hs); c.restore(); }
      else if (this.ztool === 'sponge') { c.save(); c.translate(pos.x, pos.y); this.icon(c, 'bath', r * 1.7); c.restore(); }
      else if (this.ztool === 'towel') { c.save(); c.translate(pos.x, pos.y); this.towelSprite(c, r * 1.5); c.restore(); }
      else if (!hs) { c.save(); c.globalAlpha = e * .9; art.hand(c, this.zx + Math.sin(this.t * 2) * this.S2 * .12, this.zy - this.S2 * .5 + Math.cos(this.t * 2) * 6, r * 2.2, 0); c.restore(); }
      c.restore();
    }
    // the room chooser: one big picture per room (touch one to move in; touch anywhere else to close)
    drawPicker(c) {
      c.fillStyle = 'rgba(60,44,80,.55)'; c.fillRect(0, 0, this.w, this.h);
      for (const k of this.pickLayout()) {
        const r = k.r, W = (r.walls || WALLS)[0], F = (r.floors || FLOORS)[0], cur = r.id === this.bag.room, fy = k.y + k.h * .64;
        c.save(); c.beginPath(); art.rr(c, k.x, k.y, k.w, k.h, 22); c.clip();
        const g = c.createLinearGradient(0, k.y, 0, fy); g.addColorStop(0, W.top); g.addColorStop(1, W.bot); c.fillStyle = g; c.fillRect(k.x, k.y, k.w, fy - k.y);
        const f = c.createLinearGradient(0, fy, 0, k.y + k.h); f.addColorStop(0, F[0]); f.addColorStop(1, F[1]); c.fillStyle = f; c.fillRect(k.x, fy, k.w, k.y + k.h - fy);
        if (r.view) { const vw = k.w * .34, vh = k.h * .36, vx = k.x + k.w * .08, vy = k.y + k.h * .12; c.fillStyle = '#fff'; art.rr(c, vx - 5, vy - 5, vw + 10, vh + 10, 8); c.fill(); c.save(); c.beginPath(); c.rect(vx, vy, vw, vh); c.clip(); r.view(c, vx, vy, vw, vh, this.t); c.restore(); }
        c.restore();
        c.save(); c.translate(k.x + k.w * (r.view ? .7 : .5), k.y + k.h * .52); r.emblem(c, Math.min(k.w * .42, k.h * .62)); c.restore();
        c.lineWidth = cur ? 8 : 3; c.strokeStyle = cur ? '#59b96e' : 'rgba(255,255,255,.9)'; art.rr(c, k.x, k.y, k.w, k.h, 22); c.stroke();
        c.font = `700 ${Math.max(13, Math.min(k.h * .15, this.ui * 22))}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 5; c.strokeStyle = 'rgba(60,44,80,.6)'; c.strokeText(r.name, k.x + k.w / 2, k.y + k.h * .9); c.fillStyle = '#fff'; c.fillText(r.name, k.x + k.w / 2, k.y + k.h * .9);
      }
    }
    drawTray(c) {
      const cell = this.cell, u = this.u * .5;
      // panel behind the tray
      c.fillStyle = 'rgba(255,255,255,.78)';
      if (this.wide) art.rr(c, this.w - cell * 2.75, this.h * .06, cell * 2.6, this.roomBtn.y + cell * .7 - this.h * .06, 20), c.fill();
      else art.rr(c, this.w / 2 - cell * 4.4, this.trayPos[0].y - cell * .75, cell * 8.8, cell * 3.0, 20), c.fill();
      this.tray.forEach((d, i) => {
        const p = this.trayPos[i]; c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(p.x, p.y, cell * .5, 0, TAU); c.fill();
        c.save(); c.translate(p.x, p.y + (d.z === 'floor' ? cell * .28 : 0)); drawDeco(c, d.id, cell * (d.z === 'wall' ? .32 : .25) * (TRAY_SCALE[d.id] || 1), this.t, this.who()); c.restore();
      });
      // the room button: a little house with the current room's picture; touch it to choose another room
      const rb = this.roomBtn, rp = 1 + Math.sin(this.t * 3) * .03; c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(rb.x, rb.y, cell * .5 * rp, 0, TAU); c.fill(); c.strokeStyle = '#59b96e'; c.lineWidth = 4; c.stroke();
      c.save(); c.translate(rb.x, rb.y + cell * .02); this.room().emblem(c, cell * .62); c.restore();
      // a little bin: drop a decoration here to take it away
      const b = this.bin; c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(b.x, b.y, cell * .5, 0, TAU); c.fill();
      c.fillStyle = '#9aa6bd'; art.rr(c, b.x - cell * .2, b.y - cell * .16, cell * .4, cell * .4, cell * .06); c.fill(); c.fillRect(b.x - cell * .26, b.y - cell * .24, cell * .52, cell * .07); c.fillRect(b.x - cell * .08, b.y - cell * .3, cell * .16, cell * .07);
      // hints that the wall, floor and rug change when touched
      const sp = .5 + Math.sin(this.t * 4) * .5;
      c.globalAlpha = .4 + sp * .5; art.star(c, this.w * .12, this.floorY * .3, 9 * this.ui + sp * 2, '#ffd54a', this.t); art.star(c, this.w * .08, this.feetY + this.s * .3, 8 * this.ui + sp * 2, '#ffd54a', this.t); art.star(c, this.homeX + this.s * .8, this.feetY + 6, 8 * this.ui + sp * 2, '#ffd54a', this.t); c.globalAlpha = 1;
      if (this.hold && this.hold.kind === 'deco') { c.save(); c.translate(this.hold.x, this.hold.y + (this.hold.d.z === 'floor' ? this.sizeOf(this.hold.d) * .5 : 0)); drawDeco(c, this.hold.d.id, this.sizeOf(this.hold.d) * 1.1, this.t, this.who()); c.restore(); }
    }
  }

  SPG.games.push({
    id: 'care', name: 'Pet Care', order: 7,
    icon(c, w, h) {
      const wall = c.createLinearGradient(0, 0, 0, h); wall.addColorStop(0, '#ffe9df'); wall.addColorStop(.62, '#ffd9cc'); wall.addColorStop(.63, '#e2b98d'); wall.addColorStop(1, '#c99a6a'); c.fillStyle = wall; c.fillRect(0, 0, w, h);
      const s = Math.min(w * .6, h * .78);
      c.fillStyle = '#ffb3c6'; c.beginPath(); c.ellipse(w * .5, h * .9, s * .8, s * .12, 0, 0, TAU); c.fill();
      c.save(); c.translate(w * .5, h * .93); SPG.pets.draw(c, 'cat', s, 1, { mood: 'cheer' }); c.restore();
      c.save(); c.translate(w * .78, h * .5); art.fruit(c, 3, s * .16, {}); c.restore();
      c.save(); c.translate(w * .2, h * .32); drawDeco(c, 'balloons', s * .16, 0, null); c.restore();
      art.star(c, w * .32, h * .22, s * .1, '#ffd54a', .2);
      art.heart(c, w * .66, h * .3, s * .1, '#ff6b81');
    },
    create: host => new CareGame(host)
  });
})();
