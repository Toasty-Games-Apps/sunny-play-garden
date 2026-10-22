// Grow a Garden: dig a hole with the shovel, drop in a seed, water it, and watch it grow.
// Blooms unlock new seeds, a bigger garden, and garden friends (some arrive after rainbows in Rain Bucket).
// The garden and the friends she has met are saved per player.
(() => {
  const SPG = window.SPG;
  const { art, glyphs, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const SLOTS_MAX = 12, SLOTS_BASE = 8, BIGGER_AT = 8;
  const RAIN_FRIENDS = { frog: 1, duckling: 3, turtle: 6 }; // rainbows in Rain Bucket that attract them
  const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.filter(k => k != null)); return e; };
  const icon = id => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.innerHTML = `<use href="#i-${id}"/>`; return s; };
  const CREATURES = Object.fromEntries(art.CREATURES.map(c => [c.id, c]));
  const HOLE_K = [0, .42, .72, 1];                        // hole size after 0, 1, 2, 3 digs
  const NEED_DROPS = 30;                                   // drops a plant needs to grow one step
  const PET_FRIENDS = { cat: 1, dog: 5 };                 // pets rescued in Rain Bucket that bring them
  const BASE_FRIENDS = ['bee', 'butterfly', 'ladybug', 'bunny', 'bird', 'snail']; // can visit any garden
  const SIZE = { cat: .22, dog: .23, bee: .2, butterfly: .2, ladybug: .16, bunny: .34, bird: .2, snail: .22, hedgehog: .24, frog: .22, duckling: .22, mouse: .22, turtle: .24, dragonfly: .22 };
  const SPEED = { cat: .05, dog: .06, bee: .09, butterfly: .08, bird: .1, dragonfly: .11, ladybug: .03, bunny: .06, frog: .05, duckling: .04, mouse: .08, hedgehog: .04, turtle: .015, snail: .012 };
  const FLIP = { bunny: -1, frog: 0, mouse: 0, cat: 0, dog: 0 }; // facing: 1 = art faces right, -1 = art faces left, 0 = faces front

  function thumb(canvas, fn) {
    requestAnimationFrame(() => {
      const r = canvas.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); fn(c, r.width, r.height);
    });
  }
  const bare = () => ({ kind: 'bare', pop: 0, water: 0, wiggle: 0, dig: 0, sow: 0, pat: 0, dug: false, meter: 0, level: 0, loose: false });
  const fromSaved = x => {
    const p = bare();
    if (!x) return p;
    if (x.k === 'hole') { p.kind = 'hole'; p.level = x.level || 3; }
    else if (x.k === 'plant' || x.type) { p.kind = 'plant'; p.type = x.type; p.stage = x.stage; p.loose = !!x.loose; }
    return p;
  };

  class GardenGame {
    constructor(host) {
      this.host = host;
      this.bag = store.bag('garden', () => ({ plots: [], seen: {}, blooms: 0 }));
      this.scenic = SPG.scenery.fader(this.sceneAt(this.bag.blooms));   // the garden moves through the seasons and times of day as it grows
      this.plots = Array.from({ length: SLOTS_MAX }, (_, i) => fromSaved(this.bag.plots[i]));
      this.tool = 'shovel'; this.seed = 'sunflower';
      this.canMode = this.bag.canMode || 'grab'; this.can = null; this.quickTaps = 0; this.recentKinds = [];
      this.creatures = []; this.pal = null; this.fx = new art.Fx(); this.banners = []; this.banner = null;
      this.t = 0; this.running = false; this.nudge = 0; this.said = {}; this.ambientUntil = 0;
      this.canvas = el('canvas', 'game-canvas'); host.append(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.tick = this.tick.bind(this);
      this.canvas.addEventListener('pointerdown', e => { e.preventDefault(); this.tap(e); });
      this.canvas.addEventListener('pointermove', e => this.moveCan(e));
      for (const t of ['pointerup', 'pointercancel']) this.canvas.addEventListener(t, e => this.dropCan(e));
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s * .92); art.plant(c, 'daisy', 3, s * .85, 0); }, this.bag.blooms);
      this.buildBar();
    }

    sceneAt(blooms) { const L = ['meadow', 'sunset', 'farm', 'autumn', 'snow', 'night', 'beach']; return L[Math.floor((blooms || 0) / 4) % L.length]; }
    slotCount() { return this.bag.blooms >= BIGGER_AT ? SLOTS_MAX : SLOTS_BASE; }
    unlocked(id) { return this.bag.blooms >= art.PLANTS.find(p => p.id === id).unlock; }

    /* ---- toolbar ---- */
    buildBar() {
      this.bar = el('div', 'gd-bar'); this.tools = {};
      const add = (id, label, drawFn, cls = '') => {
        const cv = el('canvas', 'gd-thumb'); const b = el('button', 'gd-tool ' + cls, cv); b.type = 'button'; b.setAttribute('aria-label', label);
        SPG.ui.press(b, () => { sfx.tap(); this.pick(id); });
        this.tools[id] = { b, cv, drawFn }; this.bar.append(b); thumb(cv, drawFn);
      };
      const disc = (c, w, h, col = 'rgba(255,255,255,.7)') => { c.fillStyle = col; c.beginPath(); c.arc(w / 2, h / 2, Math.min(w, h) * .46, 0, TAU); c.fill(); };
      add('shovel', 'Shovel: dig a hole', (c, w, h) => { disc(c, w, h); art.shovel(c, w * .5, h * .78, w * .42, .35); });
      add('seed', 'Seeds', (c, w, h) => { disc(c, w, h); c.save(); c.translate(w / 2, h * .86); art.plant(c, this.seed, 3, h * .78, 0); c.restore(); }, 'seed');
      add('pat', 'Pat the soil down', (c, w, h) => { disc(c, w, h); c.font = `${h * .5}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('\u{1F590}\uFE0F', w / 2, h / 2 + 2); });
      add('can', 'Watering can', (c, w, h) => { disc(c, w, h); art.watering(c, w * .52, h * .52, w * .34, -.15); });
      this.badge = el('span', 'gd-badge', this.canMode === 'grab' ? '\u270B' : '\u{1F446}'); this.tools.can.b.append(this.badge);
      add('free', 'Say goodbye to a friend', (c, w, h) => { disc(c, w, h, '#ffe9f0'); c.font = `${h * .5}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('\u{1F44B}', w / 2, h / 2 + 2); });
      add('book', 'My garden friends', (c, w, h) => { disc(c, w, h, '#ffe28a'); c.save(); c.translate(w / 2, h / 2 + 4); art.creature(c, 'butterfly', w * .32, 1); c.restore(); }, 'book');
      this.tray = el('div', 'gd-tray hidden');
      art.PLANTS.forEach(pl => {
        const cv = el('canvas', 'gd-thumb'); const b = el('button', 'gd-packet', cv); b.type = 'button'; b.dataset.plant = pl.id; b.setAttribute('aria-label', pl.name + ' seeds');
        SPG.ui.press(b, () => this.chooseSeed(pl.id, b));
        this.tray.append(b);
        b._paint = () => thumb(cv, (c, w, h) => { c.fillStyle = 'rgba(255,255,255,.85)'; art.rr(c, 4, 4, w - 8, h - 8, w * .22); c.fill(); c.save(); c.translate(w / 2, h * .88); art.plant(c, pl.id, 3, h * .8, 0); c.restore(); });
      });
      // the four steps of planting, so she can see where she is: dig, seed, pat, water
      this.steps = el('div', 'gd-steps'); this.stepEls = {};
      for (const id of ['shovel', 'seed', 'pat', 'can']) {
        const cv = el('canvas', 'gd-thumb'), chip = el('div', 'gd-step', cv);
        if (id === 'shovel') { const pips = el('div', 'gd-pips'); for (let k = 0; k < 3; k++) pips.append(el('span', 'gd-pip')); chip.append(pips); }
        this.stepEls[id] = chip; this.steps.append(chip); thumb(cv, this.tools[id].drawFn);
      }
      this.host.append(this.steps, this.tray, this.bar);
      this.refreshTray(); this.select('shovel');
    }

    refreshTray() {
      for (const b of this.tray.children) {
        const pl = art.PLANTS.find(p => p.id === b.dataset.plant), open = this.unlocked(pl.id);
        b.classList.toggle('locked', !open); b.classList.toggle('on', pl.id === this.seed);
        let lock = b.querySelector('.gd-lock');
        if (!open && !lock) { lock = el('span', 'gd-lock'); lock.append(icon('lock'), el('b', '', '')); b.append(lock); }
        if (lock) { if (open) lock.remove(); else lock.querySelector('b').textContent = pl.unlock - this.bag.blooms; }
      }
    }

    paintTray() { for (const b of this.tray.children) b._paint(); }

    pick(id) {
      if (id === 'book') { this.tray.classList.add('hidden'); this.openBook(); return; }
      if (id === 'seed' && this.tool === 'seed') { this.tray.classList.toggle('hidden'); if (!this.tray.classList.contains('hidden')) this.paintTray(); return; }
      this.tray.classList.add('hidden');
      if (id === 'can' && this.tool === 'can') { // tap the can again to switch between grabbing it and tapping
        this.canMode = this.canMode === 'grab' ? 'tap' : 'grab'; this.bag.canMode = this.canMode; store.save();
        this.badge.textContent = this.canMode === 'grab' ? '\u270B' : '\u{1F446}'; sfx.pop(); return;
      }
      this.select(id);
    }
    chooseSeed(id, b) {
      if (!this.unlocked(id)) { sfx.oops(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
      this.seed = id; sfx.pop(); this.tray.classList.add('hidden'); this.select('seed');
      const t = this.tools.seed; thumb(t.cv, t.drawFn); this.refreshTray();
    }
    select(id) { this.tool = id; for (const [k, t] of Object.entries(this.tools)) t.b.classList.toggle('on', k === id); }

    // Which tool should she reach for next? It gently pulses.
    suggest() {
      const pl = this.plots.slice(0, this.slotCount());
      if (pl.some(p => p.kind === 'plant' && p.loose)) return 'pat';
      if (pl.some(p => p.kind === 'plant' && p.stage < 3 && !p.water)) return 'can';
      if (pl.some(p => p.kind === 'hole' && p.level >= 3)) return 'seed';
      return 'shovel';
    }

    /* ---- layout ---- */
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = this.slotCount(), barH = this.bar.getBoundingClientRect().height + 24;
      const top = Math.max(84, this.h * .19);
      const cols = this.w > this.h ? 4 : (n === SLOTS_BASE ? 2 : 3), rows = n / cols;
      this.bed = { x: this.w * .05, y: top, w: this.w * .9, h: this.h - barH - top };
      this.cw = this.bed.w / cols; this.ch = this.bed.h / rows; this.cols = cols;
      this.ps = Math.min(this.ch * .82, this.cw * .8);
      this.setupPal();
      this.draw();
    }
    // Her pet (if she has one from the Pet Shop) comes along, walks beside where she is working, cheers when something blooms.
    setupPal() {
      const st = SPG.pets && SPG.pets.active();
      if (!st) { this.pal = null; return; }
      const size = Math.max(70, Math.min(170, this.ps * .7)), y = this.bed.y + this.bed.h + 2;
      if (!this.pal) this.pal = { x: this.bed.x + this.bed.w * .12, y, tx: this.bed.x + this.bed.w * .12, dir: 1, hop: 0, cheer: 0, idle: 0, t: Math.random() * 5, moving: false };
      Object.assign(this.pal, { size, y });
    }
    palCheer(sec = 2.4) { if (this.pal) { this.pal.cheer = sec; this.pal.hop = 1; this.pal.idle = 0; } }
    palFollow(x) { if (this.pal) { this.pal.tx = Math.max(this.bed.x + this.pal.size * .5, Math.min(this.bed.x + this.bed.w - this.pal.size * .5, x)); this.pal.idle = 0; } }
    updatePal(dt) {
      const a = this.pal; if (!a) return;
      a.t += dt; a.idle += dt;
      if (a.hop > 0) a.hop = Math.max(0, a.hop - dt * 2.2);
      if (a.cheer > 0) a.cheer = Math.max(0, a.cheer - dt);
      // stay a little to one side of where she is working, so the pet never sits on the thing she is tapping
      const want = a.tx + (a.tx < this.bed.x + this.bed.w / 2 ? 1 : -1) * a.size * .9, dx = want - a.x;
      a.moving = Math.abs(dx) > 6;
      if (a.moving) { a.x += Math.sign(dx) * Math.min(Math.abs(dx), this.w * .22 * dt); a.dir = dx > 0 ? 1 : -1; }
    }
    drawPal(c) {
      const a = this.pal, st = SPG.pets.active(); if (!a || !st) return;
      c.save(); c.translate(a.x, a.y - (a.moving ? Math.abs(Math.sin(a.t * 9)) * a.size * .04 : 0));
      SPG.pets.draw(c, st.id, a.size, a.t, { mood: a.cheer > 0 ? 'cheer' : a.idle > 25 ? 'sleep' : 'happy', hop: a.hop > 0 ? 1 - a.hop : 0, hat: st.hat, face: st.face, neck: st.neck });
      c.restore();
    }
    slot(i) { const col = i % this.cols, row = Math.floor(i / this.cols); return { x: this.bed.x + (col + .5) * this.cw, y: this.bed.y + (row + .5) * this.ch + this.ch * .22 }; }

    start() {
      this.resize();
      this.plots.forEach((p, i) => { if (i < this.slotCount() && p.kind === 'plant' && p.stage === 3 && this.creatures.length < 4) this.spawnCreature(p.type === 'carrot' ? 'bunny' : this.pickCreature(p.type), this.slot(i).x, this.slot(i).y); });
      this.resume();
      if (!this.plots.some(p => p.kind !== 'bare')) voice.say('dig-first');
    }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); }
    destroy() { this.pause(); clearTimeout(this.later); this.canvas.remove(); this.bar.remove(); this.tray.remove(); this.steps.remove(); this.book?.remove(); this.dialog?.el.remove(); this.counter.el.remove(); }

    save() {
      this.bag.plots = this.plots.map(p => p.kind === 'bare' ? null : p.kind === 'hole' ? { k: 'hole', level: p.level } : { k: 'plant', type: p.type, stage: p.stage, loose: p.loose });
      store.save();
    }
    sayOnce(key, line) { if (this.said[key]) return; this.said[key] = true; voice.say(line); }

    /* ---- friends ---- */
    rainbows() { return (store.active && store.active.data.rain && store.active.data.rain.flowers) || 0; }
    // Every flower has favourite visitors, but the common friends can come to any garden, new friends are
    // more likely than ones she has already met, and the last few shown are less likely (so it keeps mixing).
    pickCreature(type) {
      const w = new Map(), add = (id, n) => w.set(id, (w.get(id) || 0) + n);
      for (const id of BASE_FRIENDS) add(id, 1);
      for (const id of art.PLANTS.find(pl => pl.id === type).creatures) add(id, BASE_FRIENDS.includes(id) ? 1 : 3); // a new flower's special visitors matter most
      const rain = (store.active && store.active.data.rain) || {}, rb = rain.flowers || 0, pets = rain.pets || 0;
      for (const [id, need] of Object.entries(RAIN_FRIENDS)) if (rb >= need) add(id, 2);
      for (const [id, need] of Object.entries(PET_FRIENDS)) if (pets >= need) add(id, 2);
      let total = 0;
      for (const [id, n] of w) { const f = (this.bag.seen[id] ? 1 : 2.5) * Math.pow(.35, this.recentKinds.filter(k => k === id).length); w.set(id, n * f); total += n * f; }
      let r = Math.random() * total, pick = null;
      for (const [id, n] of w) { pick = id; r -= n; if (r <= 0) break; }
      this.recentKinds.push(pick); if (this.recentKinds.length > 4) this.recentKinds.shift();
      return pick;
    }
    spawnCreature(kind, x, y) {
      const info = CREATURES[kind];
      if (this.creatures.length >= 7) this.creatures.shift();
      const cr = { kind, fly: info.fly, x, y, tx: x, ty: y, wait: 0, sndT: 1 + Math.random() * 5, hop: 0, t: Math.random() * 9, jump: 0, dir: 1, s: this.ps * SIZE[kind], hunger: kind === 'bunny' ? 7 + Math.random() * 6 : 0, goal: null, eating: null };
      this.creatures.push(cr); this.retarget(cr);
      return cr;
    }
    retarget(cr) {
      const b = this.bed;
      if (cr.fly) { cr.tx = b.x + Math.random() * b.w; cr.ty = b.y - this.ps * .15 + Math.random() * b.h * .8; cr.wait = 1 + Math.random() * 2; }
      else { cr.tx = b.x + b.w * (.08 + Math.random() * .84); cr.ty = b.y + b.h - this.ch * .06 - Math.random() * this.ch * .12; cr.wait = 1.5 + Math.random() * 2.5; }
    }

    /* ---- hungry bunnies: a ready carrot or strawberry is a snack ---- */
    isClaimed(i) { return this.creatures.some(c => c.goal === i); }
    snackFor(cr) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < this.slotCount(); i++) {
        const p = this.plots[i];
        if (p.kind !== 'plant' || p.stage !== 3 || (p.type !== 'carrot' && p.type !== 'strawberry') || p.pop > 0 || this.isClaimed(i)) continue;
        const s = this.slot(i), d = Math.hypot(s.x - cr.x, s.y - cr.y) - (p.type === 'carrot' ? this.w : 0); // carrots first
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    stopEating(cr) {
      if (cr.eating) { const p = this.plots[cr.eating.i]; if (p) p.eaten = 0; }
      cr.eating = null; cr.goal = null;
    }
    // Where the bunny stands to eat: beside the plant, on whichever side it came from.
    eatSpot(i, cr) { const s = this.slot(i); return { x: s.x + (cr.x < s.x ? -1 : 1) * this.ps * .3, y: s.y + this.ch * .03 }; }
    updateBunny(cr, dt) {
      if (cr.leaving) return;
      if (cr.eating) {
        const e = cr.eating, p = this.plots[e.i], s = this.slot(e.i);
        if (!p || p.kind !== 'plant') { this.stopEating(cr); return; }
        e.t += dt; p.eaten = Math.min(1, e.t / 2.4);
        if (e.t > (e.bites + 1) * .5 && e.bites < 4) {                       // a bite every half second
          e.bites++; sfx.crunch();
          this.fx.burst(s.x, s.y - this.ps * (.35 - e.bites * .05), 6, { colors: p.type === 'carrot' ? ['#ff9d4d', '#ffb870', '#7ed957'] : ['#ff6b81', '#ff9db8', '#7ed957'], speed: 130, g: 420, life: .5, size: 5, up: 90 });
        }
        if (e.t >= 2.4) {                                                    // all gone: the ground is free again
          this.plots[e.i] = bare(); this.save();
          this.fx.burst(s.x, s.y - this.ps * .2, 10, { colors: ['#ff7a8a', '#ff9db8', '#ffd54a'], speed: 140, g: -50, life: 1, size: 7, shape: 'heart' });
          sfx.boing(); cr.jump = 1; cr.eating = null; cr.goal = null;
          cr.hunger = 16 + Math.random() * 12; cr.wait = .8; this.retarget(cr);
        }
        return;
      }
      if (cr.goal != null) {
        const p = this.plots[cr.goal];
        if (!p || p.kind !== 'plant' || p.stage !== 3) { cr.goal = null; cr.wait = 0; return; }
        if (Math.hypot(cr.tx - cr.x, cr.ty - cr.y) <= 8) { cr.eating = { i: cr.goal, t: 0, bites: 0 }; cr.dir = this.slot(cr.goal).x > cr.x ? 1 : -1; }
        return;
      }
      if (cr.hunger > 0) { cr.hunger -= dt; return; }
      const i = this.snackFor(cr);
      if (i < 0) { cr.hunger = 5 + Math.random() * 4; return; }
      const spot = this.eatSpot(i, cr);
      cr.goal = i; cr.tx = spot.x; cr.ty = spot.y; cr.wait = 99;
    }

    // Saying goodbye needs a second, clear step so it can never happen by accident.
    askGoodbye(cr) {
      if (this.dialog) return;
      const name = CREATURES[cr.kind].name.toLowerCase();
      const canvas = el('canvas', 'gd-bye-art'); canvas.width = canvas.height = 240;
      const c = canvas.getContext('2d'), f = cr.kind in FLIP ? FLIP[cr.kind] : 1;
      c.translate(120, 165); if (f) c.scale(f, 1); art.creature(c, cr.kind, 140, 0, false);
      const armed = { t: 0 };
      const btn = (cls, label, emoji, fn) => {
        const b = el('button', 'gd-bye-btn ' + cls, el('span', 'gd-bye-emoji', emoji), el('span', '', label)); b.type = 'button';
        b.addEventListener('pointerdown', () => { armed.b = b; armed.t = performance.now(); });
        b.addEventListener('click', e => { if ((e.detail === 0 || armed.b === b) && performance.now() - this.dialog.t0 > 400) fn(); armed.b = null; });
        return b;
      };
      const close = () => { this.dialog.el.remove(); this.dialog = null; voice.stop(); };
      const stay = btn('stay', 'Stay', '\u{1F49A}', () => { sfx.tap(); close(); });
      const bye = btn('bye', 'Bye-bye', '\u{1F44B}', () => { const target = cr; close(); if (this.creatures.includes(target)) this.sendOff(target); });
      const sheet = el('div', 'gd-bye-sheet', canvas, el('h2', '', `Say bye-bye to the ${name}?`), el('p', '', 'Tap the soft pink button to say bye-bye. Tap the green one to keep your friend.'), el('div', 'gd-bye-row', stay, bye));
      const overlay = el('div', 'gd-bye', sheet);
      this.host.append(overlay);
      this.dialog = { el: overlay, t0: performance.now() };
      sfx.tap(); voice.say('confirm-bye');
    }
    back() { if (this.dialog) { this.dialog.el.remove(); this.dialog = null; voice.stop(); return true; } return false; }

    // Say goodbye: the friend waves, then heads back to the wild off the edge of the screen.
    sendOff(cr) {
      this.stopEating(cr);
      cr.leaving = true; cr.leaveT = 0; cr.jump = 1;
      const toRight = cr.x > this.w / 2;
      cr.tx = toRight ? this.w + cr.s * 5 : -cr.s * 5; cr.ty = cr.fly ? cr.y - this.h * .25 : cr.y;
      cr.dir = toRight ? 1 : -1;
      sfx.boing(); voice.say('bye-bye');
      this.fx.burst(cr.x, cr.y - cr.s, 8, { colors: ['#ff7a8a', '#ff9db8', '#ffd54a'], speed: 120, g: -60, life: 1, size: 7, shape: 'heart' });
    }

    // A very quiet, single sound for one animal. A global gap keeps two animals from sounding at once.
    critterVoice(cr) {
      const now = performance.now();
      if (now < this.ambientUntil || cr.leaving || cr.eating || this.banner || this.book || cr.x < 0 || cr.x > this.w) return;
      cr.sndT = 8 + Math.random() * 10; // each animal speaks up only now and then
      this.ambientUntil = now + 700; // reserve the slot straight away
      voice.ambient('critter/' + cr.kind, .2).then(len => {
        if (!len && !this.running) return;   // she left the garden while the clip was loading
        if (!len) len = sfx.critter(cr.kind);
        this.ambientUntil = performance.now() + (len + .35) * 1000;
      });
    }

    /* ---- input ---- */
    tap(e) {
      this.tray.classList.add('hidden');
      if (this.banner) { this.nextBanner(); return; }
      const r = this.canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      this.palFollow(x);
      if (this.pal && Math.abs(x - this.pal.x) < this.pal.size * .5 && y > this.pal.y - this.pal.size * 1.1 && y < this.pal.y + 12) {
        this.pal.hop = 1; this.pal.idle = 0; SPG.pets.noise(SPG.pets.active().id);
        this.fx.burst(this.pal.x, this.pal.y - this.pal.size, 5, { colors: ['#ff7a8a', '#ff9db8'], speed: 110, g: -60, life: .9, size: 7, shape: 'heart' }); return;
      }
      for (let i = this.creatures.length - 1; i >= 0; i--) {
        const cr = this.creatures[i];
        if (!cr.leaving && Math.hypot(x - cr.x, y - (cr.y - cr.s * .3)) < cr.s * 1.6 + 18) {
          if (this.tool === 'free') { this.askGoodbye(cr); return; }
          cr.jump = 1; sfx.boing(); this.fx.burst(cr.x, cr.y - cr.s, 6, { colors: ['#ff7a8a', '#ff9db8'], speed: 120, g: -60, life: .9, size: 7, shape: 'heart' });
          voice.sound('critter/' + cr.kind, 'creature/' + cr.kind); return;
        }
      }
      if (this.tool === 'can' && this.canMode === 'grab') {
        // a freshly planted seed needs patting down before it can drink
        if (!this.thirsty().length && this.plots.slice(0, this.slotCount()).some(q => q.kind === 'plant' && q.loose)) { this.nudgeTool('pat', 'pat-it'); return; }
        this.grabCan(e, x, y); return;
      }
      if (this.tool === 'free') { sfx.tap(); return; }
      let best = -1, bd = 1e9;
      for (let i = 0; i < this.slotCount(); i++) { const s = this.slot(i); const dx = Math.abs(x - s.x) / (this.cw * .5), dy = (y - (s.y - this.ps * .35)) / (this.ch * .62); const d = Math.max(dx, Math.abs(dy)); if (d < 1 && d < bd) { bd = d; best = i; } }
      if (best < 0) return;
      const p = this.plots[best], s = this.slot(best);
      this.focus = best;
      if (p.dig || p.sow || p.pat) return; // busy with an animation
      if (p.kind === 'bare') {
        if (this.tool === 'shovel') { this.startDig(best); return; }
        this.nudgeTool('shovel', 'dig-first'); return;
      }
      if (p.kind === 'hole') {
        if (this.tool === 'shovel') { if (p.level < 3) { this.startDig(best); return; } p.wiggle = 1; this.nudgeTool('seed', 'seed-in'); return; } // already the right size
        if (this.tool === 'seed') {
          if (p.level < 3) { p.wiggle = 1; this.nudgeTool('shovel', null); return; }
          p.sow = .001; sfx.pop(); return;
        }
        if (this.tool === 'pat') { // patting an empty hole fills it back in
          p.kind = 'bare'; p.level = 0; this.save(); sfx.pat(); this.fx.burst(s.x, s.y - 6, 10, { colors: ['#8a6448', '#a17656'], speed: 120, g: 700, life: .5, size: 5, up: 120 }); return;
        }
        sfx.tap(); return;
      }
      // a plant
      if (this.tool === 'shovel') { // dig it back up, leaving a proper hole
        this.plots[best] = Object.assign(bare(), { kind: 'hole', level: 3 }); this.save(); sfx.pop();
        this.fx.burst(s.x, s.y - this.ps * .2, 16, { colors: ['#8a6448', '#a17656', '#6f4e38'], speed: 220, g: 800, life: .7, size: 6, up: 200 });
        return;
      }
      if (p.loose) { if (this.tool === 'pat') this.startPat(best); else this.nudgeTool('pat', 'pat-it'); return; }
      if (this.tool === 'pat') { p.wiggle = .6; sfx.tap(); return; } // already snug
      if (p.stage < 3) {
        if (this.tool === 'can') { if (!p.water) { p.water = .0001; sfx.water(); } } // tap mode
        else this.nudgeTool('can', 'pour-water');
      } else { p.wiggle = 1; sfx.boing(); this.fx.burst(s.x, s.y - this.ps * .7, 6, { colors: ['#ff7a8a', '#ff9db8'], speed: 120, g: -60, life: .9, size: 7, shape: 'heart' }); }
    }

    // She reached for the wrong tool: point her to the right one.
    nudgeTool(tool, line) {
      this.select(tool); sfx.oops();
      if (tool === 'shovel') this.nudge = 1.2;
      const now = performance.now();
      if (line && now - (this.lastNudge || 0) > 3500) { this.lastNudge = now; voice.say(line); }
    }
    startDig(i) { const p = this.plots[i]; p.dig = .001; p.dug = false; sfx.boing(); }
    startPat(i) { const p = this.plots[i]; p.pat = .001; }

    /* ---- the watering can you hold ---- */
    thirsty() {
      const out = [];
      for (let i = 0; i < this.slotCount(); i++) {
        const p = this.plots[i];
        if (p.kind === 'plant' && p.stage < 3 && !p.water && !p.loose) { const s = this.slot(i); out.push({ i, p, x: s.x, ground: s.y, top: s.y - this.ps * [.05, .34, .62][p.stage] }); }
      }
      return out;
    }
    tipOf(cn) {
      const size = this.ps * .34, lx = -size * 1.05, ly = -size * .3, cs = Math.cos(cn.tilt), sn = Math.sin(cn.tilt);
      return { x: cn.x + (-cn.dir) * (lx * cs - ly * sn), y: cn.y + (lx * sn + ly * cs) };
    }
    grabCan(e, x, y) {
      if (this.can && !this.can.released) return;
      try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
      const near = this.thirsty().sort((a, b) => Math.hypot(a.x - x, a.top - y) - Math.hypot(b.x - x, b.top - y))[0];
      this.can = { id: e.pointerId, x, y, fx: x, fy: y, vxs: 0, tilt: -.05, tiltV: 0, dir: near && near.x > x ? 1 : -1, released: false, fade: 0, drops: [], emit: 0, sfxT: 0, size: this.ps * .34, t0: performance.now(), sx: x, sy: y };
      sfx.pop();
      if ((this.bag.blooms || 0) < 3) this.sayOnce('pour', 'pour-water');
    }
    moveCan(e) {
      const cn = this.can;
      if (!cn || cn.released || e.pointerId !== cn.id) return;
      const r = this.canvas.getBoundingClientRect(); cn.fx = e.clientX - r.left; cn.fy = e.clientY - r.top;
    }
    dropCan(e) {
      const cn = this.can; if (!cn || cn.released || e.pointerId !== cn.id) return;
      cn.released = true; cn.fade = 0;
      // a quick tap on a thirsty plant is too short to pour: after two of those the plant is watered for her (as in tap mode)
      if (performance.now() - cn.t0 < 400 && Math.hypot(cn.fx - cn.sx, cn.fy - cn.sy) < this.ps * .4) {
        const t = this.thirsty().find(q => Math.abs(cn.fx - q.x) < this.ps * .6 && cn.fy > q.top - this.ps * .8 && cn.fy < q.ground + this.ps * .2);
        if (t && ++this.quickTaps >= 2 && !t.p.water) { t.p.water = .0001; sfx.water(); }
      }
    }

    // She moves the can; it leans and pours because of how she moves it (assisted: it is pulled toward a thirsty plant).
    updateCan(dt) {
      const cn = this.can; if (!cn) return;
      const th = this.thirsty();
      if (cn.released) { cn.fade += dt / .45; cn.tilt += (-.05 - cn.tilt) * Math.min(1, dt * 8); if (cn.fade >= 1) this.can = null; }
      let hover = 0;
      if (!cn.released) {
        const ox = cn.x, oy = cn.y;
        let tx = cn.fx, ty = cn.fy;
        const tip = this.tipOf(cn), offX = tip.x - cn.x, offY = tip.y - cn.y; // where the spout is relative to the can
        const near = th.map(t => ({ t, d: Math.hypot(t.x - (cn.fx + offX), (t.top - this.ps * .28) - (cn.fy + offY)) })).sort((a, b) => a.d - b.d)[0];
        if (near && near.d < this.ps * 1.15) {
          // the closer her finger gets to the right spot, the more the can lines its spout up over the plant
          const w = Math.pow(Math.max(0, 1 - near.d / (this.ps * 1.15)), .8) * .92;
          tx += (near.t.x - offX - cn.fx) * w; ty += (near.t.top - this.ps * .28 - offY - cn.fy) * w;
          hover = Math.max(0, 1 - Math.hypot(near.t.x - tip.x, near.t.top - this.ps * .28 - tip.y) / (this.ps * .5));
          if (Math.abs(cn.vxs) < 30) cn.dir = near.t.x > cn.x ? 1 : -1;
        }
        cn.x += (tx - cn.x) * Math.min(1, dt * 14); cn.y += (ty - cn.y) * Math.min(1, dt * 14);
        const vx = (cn.x - ox) / Math.max(dt, .001);
        cn.vxs += (vx - cn.vxs) * Math.min(1, dt * 8);
        if (Math.abs(cn.vxs) > 60) cn.dir = cn.vxs > 0 ? 1 : -1;
        // lean into the direction she is moving, and tip forward over a plant
        const lean = Math.max(-.5, Math.min(.12, -cn.vxs * cn.dir * .0007));
        const target = -.05 - hover * .85 + lean;
        cn.tiltV += ((target - cn.tilt) * 70 - cn.tiltV * 9) * dt; cn.tilt += cn.tiltV * dt;
      }
      const pour = Math.max(0, Math.min(1, (-cn.tilt - .3) / .4));
      cn.emit += pour * 16 * dt; cn.sfxT -= dt;
      if (pour > .05 && cn.sfxT <= 0) { sfx.water(); cn.sfxT = .5; }
      while (cn.emit >= 1) { cn.emit -= 1; const tip = this.tipOf(cn); cn.drops.push({ x: tip.x, y: tip.y, vx: cn.dir * this.h * (.04 + Math.random() * .04), vy: this.h * .03 }); }
      for (const d of cn.drops) {
        d.vy += this.h * 1.5 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.dead = false;
        for (const t of th) {
          if (Math.abs(d.x - t.x) < this.ps * .3 && d.y > t.top - this.ps * .12 && d.y < t.ground) {
            d.dead = true; this.quickTaps = 0; t.p.meter += 1 / [0, 20, NEED_DROPS, 45][SPG.level.tier('garden')];
            this.fx.burst(d.x, d.y, 2, { colors: ['#9be0ff', '#fff'], speed: 70, g: 300, life: .35, size: 4 });
            if (t.p.meter >= 1) { t.p.meter = 0; this.grow(t.i); }
            break;
          }
        }
        if (!d.dead && d.y > this.bed.y + this.bed.h) d.dead = true;
      }
      cn.drops = cn.drops.filter(d => !d.dead);
    }

    drawGrabCan(c) {
      const cn = this.can; if (!cn) return;
      c.save(); c.globalAlpha = cn.released ? Math.max(0, 1 - cn.fade) : 1;
      c.fillStyle = '#7fd0f7'; for (const d of cn.drops) { c.beginPath(); c.ellipse(d.x, d.y, this.ps * .018, this.ps * .03, 0, 0, TAU); c.fill(); }
      c.translate(cn.x, cn.y); c.scale(-cn.dir, 1); c.rotate(cn.tilt);
      art.watering(c, 0, 0, cn.size, 0);
      c.restore();
    }

    /* ---- growing ---- */
    // A dig tap: the hole gets bigger. Three digs make the right-sized hole.
    finishDig(i) {
      const p = this.plots[i]; p.dig = 0; p.dug = false; this.save();
      const s = this.slot(i);
      if (p.level >= 3) {
        this.fx.burst(s.x, s.y - 8, 12, { colors: ['#7ed957', '#fff', '#ffd54a'], shape: 'star', speed: 200, g: 60, life: .9, size: 9, up: 60 });
        sfx.chime(); this.select('seed');
        if ((this.bag.blooms || 0) < 4) this.sayOnce('seedin', 'seed-in');
      }
    }
    finishSow(i) {
      const p = this.plots[i]; p.sow = 0; p.kind = 'plant'; p.type = this.seed; p.stage = 0; p.level = 0; p.loose = true; p.pop = .01; this.save();
      this.fx.burst(this.slot(i).x, this.slot(i).y - 8, 10, { colors: ['#8a6448', '#a17656'], speed: 130, g: 700, life: .5, size: 5, up: 130 });
      this.select('pat');
      if ((this.bag.blooms || 0) < 4) voice.say('pat-it');
    }
    // Patting the soil down once makes it snug; then it is ready for water.
    finishPat(i) {
      const p = this.plots[i], s = this.slot(i); p.pat = 0; p.loose = false; p.pop = .01; this.save();
      this.fx.burst(s.x, s.y - 8, 10, { colors: ['#c9a27a', '#e8d0b0', '#fff'], speed: 110, g: 200, life: .6, size: 6, up: 60 });
      this.select('can');
      if ((this.bag.blooms || 0) < 4) this.sayOnce('waterme', this.canMode === 'grab' ? 'pour-water' : 'water-me');
    }
    grow(i) {
      const p = this.plots[i], s = this.slot(i);
      p.stage++; p.pop = .01; sfx.grow(); this.save();
      this.fx.burst(s.x, s.y - this.ps * .4, 12, { colors: ['#ffd54a', '#fff', '#a6e8c8'], speed: 200, g: 100, life: .8, size: 9, shape: 'star', up: 60 });
      if (p.stage === 3) this.bloom(p, s);
    }
    bloom(p, s) {
      this.bag.blooms++; this.counter.set(this.bag.blooms); store.addStars(1); sfx.win(); this.palCheer();
      this.scenic.set(this.sceneAt(this.bag.blooms));
      this.fx.burst(s.x, s.y - this.ps * .7, 26, { colors: ['#ff7a8a', '#ffd54a', '#59b96e', '#4fb3e8', '#9a7be8'], speed: 380, g: 500, life: 1.1, size: 8, shape: 'confetti', up: 200 });
      const kind = p.type === 'carrot' ? 'bunny' : this.pickCreature(p.type); // a grown carrot always brings a hungry bunny
      this.spawnCreature(kind, s.x, s.y - this.ps * .6);
      if (!this.bag.seen[kind]) { this.bag.seen[kind] = true; this.banners.push({ type: 'creature', id: kind }); }
      for (const pl of art.PLANTS) if (pl.unlock && pl.unlock === this.bag.blooms) this.banners.push({ type: 'plant', id: pl.id });
      if (this.bag.blooms === BIGGER_AT) this.banners.push({ type: 'garden' });
      store.save(); this.refreshTray();
      if (this.banners.length) { if (!this.banner) this.nextBanner(); } else voice.praise();
      if (!this.plots.some(q => q.kind === 'plant' && q.stage < 3)) this.select('shovel');
    }
    nextBanner() {
      this.banner = this.banners.shift() || null;
      if (!this.banner) return;
      this.banner.t = 0;
      const b = this.banner;
      if (b.type === 'creature') voice.say('new-friend', 'creature/' + b.id);
      else if (b.type === 'plant') voice.say('new-seeds');
      else voice.say('bigger-garden');
      if (b.type === 'garden') this.resize();
    }

    /* ---- creature book ---- */
    openBook() {
      this.pause();
      const wrap = el('div', 'gd-book'); this.book = wrap;
      const sheet = el('div', 'gd-book-sheet'), grid = el('div', 'gd-book-grid'); sheet.setAttribute('data-scroll', '');
      art.CREATURES.forEach(cr => {
        const seen = this.bag.seen[cr.id];
        const cv = el('canvas', 'gd-book-art'); const tile = el('button', 'gd-book-tile' + (seen ? ' seen' : ''), cv); tile.type = 'button'; tile.setAttribute('aria-label', seen ? cr.name : 'Not met yet');
        thumb(cv, (c, w, h) => {
          c.translate(w / 2, h * .55);
          if (seen) art.creature(c, cr.id, Math.min(w, h) * .28, 1);
          else { const off = document.createElement('canvas'); off.width = w; off.height = h; const o = off.getContext('2d'); o.translate(w / 2, h * .55); art.creature(o, cr.id, Math.min(w, h) * .28, 1); o.globalCompositeOperation = 'source-atop'; o.fillStyle = '#c9bfd3'; o.fillRect(-w, -h, w * 2, h * 2); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(off, 0, 0); }
        });
        if (!seen) tile.append(el('span', 'gd-q', '?'));
        SPG.ui.press(tile, () => { if (seen) { sfx.boing(); voice.sound('critter/' + cr.id, 'creature/' + cr.id); tile.classList.remove('jig'); void tile.offsetWidth; tile.classList.add('jig'); } else sfx.tap(); });
        grid.append(tile);
      });
      const found = Object.keys(this.bag.seen).length;
      const done = el('button', 'btn go', icon('check'), ' Done'); done.type = 'button';
      SPG.ui.press(done, () => { wrap.remove(); this.book = null; this.resume(); });
      sheet.append(el('div', 'gd-book-count', `${found} / ${art.CREATURES.length}`), grid, done); wrap.append(sheet); this.host.append(wrap);
    }

    /* ---- loop ---- */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, .05); this.last = now;
      if (this.dialog) { this.draw(); this.raf = requestAnimationFrame(this.tick); return; } // everything waits while she decides
      this.t += dt; this.scenic.update(dt);
      if (this.nudge > 0) this.nudge -= dt;
      this.plots.forEach((p, i) => {
        if (i >= this.slotCount()) return;
        if (p.pop > 0) { p.pop = Math.min(1.2, p.pop + dt * 2.2); if (p.pop >= 1.2) p.pop = 0; }
        if (p.wiggle > 0) p.wiggle = Math.max(0, p.wiggle - dt * 1.6);
        if (p.dig > 0) {
          p.dig += dt / .6;
          if (p.dig > .5 && !p.dug) {
            p.dug = true; if (p.kind === 'bare') p.kind = 'hole'; p.level = Math.min(3, p.level + 1);
            const s = this.slot(i); sfx.pop(); this.fx.burst(s.x + this.ps * .12, s.y - 4, 14, { colors: ['#8a6448', '#a17656', '#6f4e38'], speed: 260, g: 900, life: .7, size: 6, up: 240 });
            voice.say(['dig-one', 'dig-two', 'dig-three'][p.level - 1]);
          }
          if (p.dig >= 1) this.finishDig(i);
        }
        if (p.pat > 0) { p.pat += dt / .5; if (p.pat > .4 && !p.patHit) { p.patHit = true; sfx.pat(); const s = this.slot(i); this.fx.burst(s.x, s.y - 6, 8, { colors: ['#c9a27a', '#e8d0b0'], speed: 140, g: 300, life: .5, size: 6, up: 30 }); } if (p.pat >= 1) { p.patHit = false; this.finishPat(i); } }
        if (p.sow > 0) { p.sow += dt / .8; if (p.sow >= 1) this.finishSow(i); }
        if (p.water > 0) { p.water += dt / 1.3; if (p.water >= 1) { p.water = 0; this.grow(i); } }
      });
      for (const cr of this.creatures) {
        cr.t += dt; cr.wait -= dt;
        if (cr.leaving) {
          cr.leaveT += dt;
          if (cr.leaveT < .8) { cr.jump = Math.max(cr.jump, .5 + Math.sin(cr.leaveT * 14) * .3); continue; } // waving goodbye
          if (Math.random() < .5) this.fx.burst(cr.x, cr.y - cr.s * .5, 1, { colors: ['#ffd54a', '#fff', '#ff9db8'], speed: 40, g: 0, life: .7, size: 8, shape: 'star' });
        }
        if (cr.kind === 'bunny') this.updateBunny(cr, dt);
        cr.sndT -= dt;
        if (cr.sndT <= 0 && !cr.leaving) {
          if (cr.kind === 'bunny' || cr.kind === 'frog') { // hoppers make their sound as they land
            const hop = Math.floor(cr.t * 4 / Math.PI);
            if (hop !== cr.hop && Math.hypot(cr.tx - cr.x, cr.ty - cr.y) > 8) { cr.hop = hop; this.critterVoice(cr); }
          } else this.critterVoice(cr);
        }
        const dx = cr.tx - cr.x, dy = cr.ty - cr.y, d = Math.hypot(dx, dy), speed = this.w * SPEED[cr.kind] * (cr.leaving ? 3.2 : 1);
        if (d > 8) { cr.x += dx / d * speed * dt; cr.y += dy / d * speed * dt; if (Math.abs(dx) > 4) cr.dir = dx > 0 ? 1 : -1; } else if (cr.wait <= 0 && !cr.leaving && cr.goal == null && !cr.eating) this.retarget(cr);
        if (cr.jump > 0) cr.jump = Math.max(0, cr.jump - dt * 2);
      }
      this.creatures = this.creatures.filter(cr => !(cr.leaving && cr.leaveT > .8 && (cr.x < -cr.s * 3 || cr.x > this.w + cr.s * 3)));
      this.updateCan(dt);
      this.updatePal(dt);
      this.fx.update(dt);
      if (this.banner) { this.banner.t += dt; if (this.banner.t > 6) this.nextBanner(); }
      const hint = this.suggest();
      for (const [k, t] of Object.entries(this.tools)) t.b.classList.toggle('hint', k === hint && k !== this.tool);
      for (const [k, chip] of Object.entries(this.stepEls)) chip.classList.toggle('now', k === hint);
      const fp = this.plots[this.focus] && this.plots[this.focus].kind === 'hole' ? this.plots[this.focus] : this.plots.find(q => q.kind === 'hole' && q.level < 3);
      const lvl = fp ? fp.level : 0;
      this.stepEls.shovel.querySelectorAll('.gd-pip').forEach((pip, k) => pip.classList.toggle('on', k < lvl));
      this.draw();
      this.raf = requestAnimationFrame(this.tick);
    }

    mound(c, s, k = 1) {
      c.fillStyle = 'rgba(60,35,25,.35)'; c.beginPath(); c.ellipse(s.x, s.y + 4, this.cw * .3 * k, this.ch * .09 * k, 0, 0, TAU); c.fill();
      c.fillStyle = '#a17656'; c.beginPath(); c.ellipse(s.x, s.y - 2 - this.ch * .02 * k, this.cw * .28 * k, this.ch * (.085 + .03 * k) , 0, 0, TAU); c.fill();
      c.fillStyle = '#b48965'; c.beginPath(); c.ellipse(s.x - 6, s.y - 5 - this.ch * .03 * k, this.cw * .2 * k, this.ch * .045 * k, 0, 0, TAU); c.fill();
    }
    // freshly covered seed: lumpy loose soil that still needs patting down
    loose(c, s, k = 1) {
      c.fillStyle = 'rgba(60,35,25,.35)'; c.beginPath(); c.ellipse(s.x, s.y + 4, this.cw * .3 * k, this.ch * .09 * k, 0, 0, TAU); c.fill();
      for (const [dx, dy, rx, ry, col] of [[-.09, -.04, .17, .1, '#a17656'], [.09, -.05, .17, .11, '#a97f5c'], [0, -.1, .15, .1, '#b48965']]) { c.fillStyle = col; c.beginPath(); c.ellipse(s.x + dx * this.cw * k, s.y + dy * this.ch * k, this.cw * rx * k, this.ch * ry * k, 0, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(60,35,25,.3)'; for (const [dx, dy] of [[-.12, -.06], [.05, -.13], [.14, -.03]]) { c.beginPath(); c.arc(s.x + dx * this.cw, s.y + dy * this.ch, 3, 0, TAU); c.fill(); }
    }
    hole(c, s, k = 1) {
      c.fillStyle = '#9b7657'; c.beginPath(); c.ellipse(s.x, s.y, this.cw * .27 * k, this.ch * .1 * k, 0, 0, TAU); c.fill();
      const g = c.createLinearGradient(0, s.y - this.ch * .09, 0, s.y + this.ch * .09); g.addColorStop(0, '#3a2419'); g.addColorStop(1, '#5a3d2c');
      c.fillStyle = g; c.beginPath(); c.ellipse(s.x, s.y + 2, this.cw * .23 * k, this.ch * .08 * k, 0, 0, TAU); c.fill();
      c.fillStyle = '#a17656'; c.beginPath(); c.ellipse(s.x + this.cw * .28 * k, s.y - 2, this.cw * .09 * k, this.ch * .05 * k, 0, 0, TAU); c.fill();
    }

    draw() {
      const c = this.ctx, { w, h } = this;
      if (!w || !h) return;
      this.scenic.draw(c, w, h, this.t);
      const b = this.bed, n = this.slotCount();
      c.fillStyle = 'rgba(90,63,94,.12)'; art.rr(c, b.x - 12, b.y + 26, b.w + 24, b.h + 8, 38); c.fill();
      c.fillStyle = '#c99a6a'; art.rr(c, b.x - 12, b.y + 14, b.w + 24, b.h + 8, 38); c.fill();
      const g = c.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#8d6a50'); g.addColorStop(1, '#775842');
      c.fillStyle = g; art.rr(c, b.x, b.y + 22, b.w, b.h - 6, 30); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 5; c.lineCap = 'round';
      for (let y = b.y + 44; y < b.y + b.h - 6; y += 26) { c.beginPath(); c.moveTo(b.x + 24, y); c.lineTo(b.x + b.w - 24, y); c.stroke(); }
      for (let i = 0; i < n; i++) {
        const p = this.plots[i], s = this.slot(i);
        if (p.kind === 'bare' && !p.dig) { c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.ellipse(s.x, s.y, this.cw * .27, this.ch * .075, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(60,35,25,.25)'; for (const [dx, dy] of [[-.12, 0], [.05, .02], [.14, -.01]]) { c.beginPath(); c.arc(s.x + dx * this.cw, s.y + dy * this.ch, 3, 0, TAU); c.fill(); } }
        else if (p.kind === 'hole' || p.dig) {
          // the hole grows with each dig, easing to the new size during the dig
          const prev = HOLE_K[Math.max(0, p.level - (p.dug ? 1 : 0))], now = HOLE_K[p.level];
          const k = p.dug ? prev + (now - prev) * Math.min(1, Math.max(0, (p.dig - .5) / .3)) : now;
          if (k > 0) this.hole(c, s, k);
        }
        else if (p.sow) this.hole(c, s, 1);
        else if (p.loose && !(p.pat > .5)) { c.save(); c.translate(s.x, s.y); c.scale(1, p.pat ? 1 - Math.sin(Math.min(1, p.pat / .5) * Math.PI / 2) * .5 : 1); c.translate(-s.x, -s.y); this.loose(c, s); c.restore(); }
        else this.mound(c, s, 1);
        if (p.sow > .55) this.loose(c, s, Math.min(1, (p.sow - .55) / .45));
      }
      // nudge: hint the shovel when she tries a seed on bare ground
      for (let i = 0; i < n; i++) {
        const p = this.plots[i], s = this.slot(i);
        if (p.kind === 'plant') {
          c.save(); c.translate(s.x, s.y - 4);
          if (p.wiggle > 0) c.rotate(Math.sin(p.wiggle * 20) * .05 * p.wiggle);
          if (p.eaten) c.scale(1 - p.eaten * .25, 1 - p.eaten * .92);
          art.plant(c, p.type, p.stage, this.ps, this.t + i, p.pop);
          c.restore();
          if (p.stage < 3 && !p.water && !p.loose) {
            const bob = Math.sin(this.t * 4 + i) * 6, top = -this.ps * [.05, .34, .62][p.stage] - this.ps * .18;
            c.save(); c.translate(s.x + this.ps * .22, s.y + top + bob); art.drop(c, this.ps * .075, { mood: 'happy' });
            if (p.meter > 0 || (this.can && !this.can.released)) { // how much she has watered so far
              c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, 0, this.ps * .15, 0, TAU); c.stroke();
              c.strokeStyle = '#4fb3e8'; c.beginPath(); c.arc(0, 0, this.ps * .15, -Math.PI / 2, -Math.PI / 2 + Math.max(.05, p.meter) * TAU); c.stroke();
            }
            c.restore();
          }
          if (p.water > 0) this.drawCan(c, s, p.water);
          if (p.loose && !p.pat) { const bob = Math.sin(this.t * 5 + i) * 6; art.hand(c, s.x, s.y - this.ps * .32 + bob, this.ps * .17, 0); }
        } else if (p.kind === 'hole' && p.level < 3 && !p.dig && !p.sow) { // dig again: three pips show how far along she is
          for (let k = 0; k < 3; k++) { c.fillStyle = k < p.level ? '#7ed957' : 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(s.x + (k - 1) * this.ps * .14, s.y - this.ps * .3 + Math.sin(this.t * 4 + k) * 3, this.ps * .045, 0, TAU); c.fill(); }
        } else if (p.kind === 'hole' && p.level >= 3 && !p.sow) {
          const bob = Math.sin(this.t * 4 + i) * 5; c.save(); c.translate(s.x, s.y - this.ps * .38 + bob); c.fillStyle = '#7a4d33'; c.beginPath(); c.ellipse(0, 0, this.ps * .07, this.ps * .045, .5, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-this.ps * .06, this.ps * .09); c.lineTo(0, this.ps * .06); c.lineTo(this.ps * .06, this.ps * .09); c.stroke(); c.restore();
        }
        if (p.dig > 0) this.drawShovelDig(c, s, p.dig);
        if (p.pat > 0) { const u = Math.min(1, p.pat), y = u < .4 ? -this.ps * .55 * (1 - u / .4) : -this.ps * .08 - Math.min(1, (u - .4) / .3) * this.ps * .4; art.hand(c, s.x, s.y - this.ps * .1 + y, this.ps * .22, 1); }
        if (p.sow > 0) { const k = p.sow, sy = k < .55 ? s.y - this.ps * .75 * (1 - k / .55) : s.y; if (k < .6) { c.fillStyle = '#7a4d33'; c.beginPath(); c.ellipse(s.x, sy, this.ps * .06, this.ps * .04, .5 + k * 6, 0, TAU); c.fill(); } }
      }
      if (this.nudge > 0) { const p0 = this.plots.findIndex((q, i) => i < n && q.kind === 'bare'); if (p0 >= 0) { const s = this.slot(p0); art.shovel(c, s.x + this.ps * .05, s.y - this.ps * .3 + Math.sin(this.t * 14) * 8, this.ps * .55, Math.sin(this.t * 14) * .2); } }
      for (const cr of this.creatures) {
        c.save(); c.translate(cr.x, cr.y);
        const moving = Math.hypot(cr.tx - cr.x, cr.ty - cr.y) > 8;
        let bob = cr.fly ? Math.sin(cr.t * (cr.kind === 'bee' || cr.kind === 'dragonfly' ? 9 : 5)) * cr.s * .18 : 0;
        if ((cr.kind === 'bunny' || cr.kind === 'frog') && moving) bob = -Math.abs(Math.sin(cr.t * 4)) * cr.s * .5;
        if (cr.eating) bob = Math.abs(Math.sin(cr.t * 12)) * cr.s * .1;
        c.translate(0, bob - Math.sin(cr.jump * Math.PI) * cr.s * 1.2);
        if (cr.eating) c.rotate(Math.sin(cr.t * 12) * .05);
        if (cr.kind === 'duckling' && moving) c.rotate(Math.sin(cr.t * 9) * .12);
        const f = cr.kind in FLIP ? FLIP[cr.kind] : 1; if (f) c.scale(cr.dir * f, 1);
        art.creature(c, cr.kind, cr.s * 1.6, cr.t, moving);
        c.restore();
      }
      this.drawPal(c);
      this.drawGrabCan(c);
      this.fx.draw(c);
      if (this.banner) this.drawBanner(c);
    }

    drawShovelDig(c, s, k) {
      let y, ang;
      if (k < .35) { y = -this.ps * .95 * (1 - k / .35); ang = .1; }
      else if (k < .7) { const u = (k - .35) / .35; y = -this.ps * .3 * u; ang = -.7 * u; }
      else { const u = (k - .7) / .3; y = -this.ps * (.3 + .8 * u); ang = -.7 + .3 * u; }
      art.shovel(c, s.x + this.ps * .06, s.y + y, this.ps * .6, ang);
    }

    drawCan(c, s, t) {
      const slide = t < .2 ? t / .2 : t > .85 ? (1 - t) / .15 : 1;
      const tilt = -.15 - (t > .2 && t < .85 ? .45 : 0) * Math.min(1, slide);
      c.save(); c.translate(s.x + this.ps * .5 + (1 - slide) * 90, s.y - this.ps * .72 - (1 - slide) * 30); c.rotate(tilt); art.watering(c, 0, 0, this.ps * .3, 0); c.restore();
      if (t > .2 && t < .85) {
        c.fillStyle = '#7fd0f7';
        for (let i = 0; i < 7; i++) { const u = ((this.t * 2.4 + i / 7) % 1); c.globalAlpha = 1 - u * .5; c.beginPath(); c.arc(s.x + this.ps * .5 - this.ps * .42 - u * this.ps * .1 + (i % 3 - 1) * 8, s.y - this.ps * .6 + u * this.ps * .55, this.ps * .02, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
      }
    }

    drawBanner(c) {
      const { w, h } = this, bn = this.banner, t = bn.t, k = Math.min(1, t * 3);
      c.fillStyle = `rgba(90,63,94,${.45 * k})`; c.fillRect(0, 0, w, h);
      const cw = Math.min(w * .8, 560), chh = Math.min(h * .72, 470), pop = 1 + Math.sin(Math.min(1, t * 2.5) * Math.PI) * .12;
      c.save(); c.translate(w / 2, h / 2); c.scale(k * pop, k * pop);
      c.fillStyle = '#fff8e8'; art.rr(c, -cw / 2, -chh / 2, cw, chh, 44); c.fill();
      for (let i = 0; i < 10; i++) art.star(c, Math.cos(i * TAU / 10 + t) * cw * .42, Math.sin(i * TAU / 10 + t) * chh * .4, 12 + (i % 3) * 4, ['#ffd54a', '#ff9db8', '#a6e8c8'][i % 3], t + i);
      let label;
      c.save(); c.translate(0, -chh * .1 + Math.sin(t * 4) * 6);
      if (bn.type === 'creature') { art.creature(c, bn.id, Math.min(cw, chh) * .34, t); label = CREATURES[bn.id].name; }
      else if (bn.type === 'plant') { c.translate(0, chh * .26); art.plant(c, bn.id, 3, chh * .62, t); label = art.PLANTS.find(p => p.id === bn.id).name; }
      else { art.shovel(c, -cw * .12, chh * .2, chh * .34, .3); art.plant(c, 'sunflower', 3, chh * .4, t); label = 'bigger garden'; }
      c.restore();
      label = label.toLowerCase();
      const size = Math.min(chh * .15, (cw * .7) / (glyphs.measure(label, 1) || 1));
      glyphs.drawText(c, label, -glyphs.measure(label, size) / 2, chh * .28, size, { color: '#5a3f5e', width: 12 });
      c.restore();
    }
  }

  SPG.games.push({
    id: 'garden', name: 'Grow a Garden', order: 4,
    icon(c, w, h) {
      art.scene(c, w, h, 2, { showSun: true, clouds: true });
      const s = Math.min(w, h * 1.15);
      c.fillStyle = '#8d6a50'; art.rr(c, w * .08, h * .62, w * .84, h * .3, s * .06); c.fill();
      [[.2, 'tulip'], [.4, 'sunflower'], [.6, 'pumpkin'], [.8, 'daisy']].forEach(([x, t]) => { c.fillStyle = '#a17656'; c.beginPath(); c.ellipse(w * x, h * .78, s * .1, s * .03, 0, 0, TAU); c.fill(); c.save(); c.translate(w * x, h * .77); art.plant(c, t, 3, s * (t === 'sunflower' ? .5 : .38), 0); c.restore(); });
      art.shovel(c, w * .92, h * .5, s * .22, .35);
      c.save(); c.translate(w * .84, h * .3); art.creature(c, 'butterfly', s * .07, 2); c.restore();
      c.save(); c.translate(w * .2, h * .3); art.bee(c, s * .055, 0); c.restore();
    },
    create: host => new GardenGame(host)
  });
})();
