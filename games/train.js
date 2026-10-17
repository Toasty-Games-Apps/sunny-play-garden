// Choo-Choo Train: a train pulls in with three cars. Each car has a picture that says what it wants: a color,
// a shape, or how many. She drags things from the platform into the cars (each one is counted out loud).
// A wrong one just bounces back with a smile. When every car is full the train toots and chugs away.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u * u * (3 - 2 * u);
  const COLORS = { red: '#ff6b6b', blue: '#5aa8f0', yellow: '#ffd54a', green: '#6fcf6f' };
  const SHAPES = ['circle', 'square', 'triangle', 'star'];
  const BODY = ['#ff8aa3', '#7fd4f5', '#b58cf0', '#ffb45e', '#7ed957'];
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);

  // a cute block with a face, drawn centered
  function block(c, shape, col, r, blink) {
    c.save(); c.lineJoin = c.lineCap = 'round';
    const path = () => {
      c.beginPath();
      if (shape === 'circle') c.arc(0, 0, r, 0, TAU);
      else if (shape === 'square') art.rr(c, -r * .92, -r * .92, r * 1.84, r * 1.84, r * .3);
      else if (shape === 'triangle') { c.moveTo(0, -r * 1.08); c.lineTo(r * 1.05, r * .82); c.lineTo(-r * 1.05, r * .82); c.closePath(); }
      else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .55 : r * 1.12; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); }
    };
    path(); c.fillStyle = col; c.fill();
    c.lineWidth = r * .16; c.strokeStyle = 'rgba(0,0,0,.14)'; path(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-r * .38, -r * .42, r * .2, r * .1, -.7, 0, TAU); c.fill();
    c.save(); c.translate(0, shape === 'triangle' ? r * .22 : shape === 'star' ? r * .06 : 0); art.face(c, r * (shape === 'star' ? .5 : .58), { blink }); c.restore();
    c.restore();
  }
  function silhouette(c, shape, r, col, outline) {
    c.save(); c.fillStyle = col; c.beginPath();
    if (shape === 'circle') c.arc(0, 0, r, 0, TAU);
    else if (shape === 'square') art.rr(c, -r * .9, -r * .9, r * 1.8, r * 1.8, r * .25);
    else if (shape === 'triangle') { c.moveTo(0, -r * 1.05); c.lineTo(r * 1.05, r * .8); c.lineTo(-r * 1.05, r * .8); c.closePath(); }
    else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .52 : r * 1.1; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); }
    c.fill();
    if (outline) { c.strokeStyle = outline; c.lineWidth = Math.max(3, r * .09); c.lineJoin = 'round'; c.setLineDash([r * .28, r * .2]); c.stroke(); c.setLineDash([]); }
    c.restore();
  }

  class TrainGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      SPG.trainGame = this; this.bag = store.bag('train', () => ({ trains: 0, items: 0 }));
      this.scenic = SPG.scenery.fader(['meadow', 'farm', 'snow', 'beach', 'city', 'sunset', 'night', 'autumn'][(this.bag.trains || 0) % 8]);   // the train rolls through a new place each trip
      this.bag.trains = this.bag.trains || 0; this.bag.items = this.bag.items || 0;
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s * .55); c.fillStyle = '#e8433f'; art.rr(c, -s * .34, -s * .06, s * .5, s * .3, s * .06); c.fill(); c.fillStyle = '#5a3f5e'; art.rr(c, s * .1, -s * .28, s * .24, s * .52, s * .06); c.fill(); c.fillRect(-s * .3, -s * .28, s * .12, s * .24); c.beginPath(); c.arc(-s * .2, s * .26, s * .1, 0, TAU); c.arc(s * .18, s * .26, s * .1, 0, TAU); c.fill(); }, this.bag.trains);
      this.fx = new art.Fx(); this.t = 0; this.running = false;
      this.state = 'arrive'; this.stateT = 0; this.offset = 0; this.roll = 0; this.smoke = 0;
      this.cars = []; this.items = []; this.drag = null; this.spoken = {};
      this.tick = this.tick.bind(this);
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* optional */ } SPG.audio.unlock(); const p = at(e); this.grab(p.x, p.y, e.pointerId); });
      cv.addEventListener('pointermove', e => { if (this.drag && this.drag.id === e.pointerId) { e.preventDefault(); const p = at(e); this.drag.x = p.x; this.drag.y = p.y; } });
      for (const n of ['pointerup', 'pointercancel']) cv.addEventListener(n, e => { if (this.drag && this.drag.id === e.pointerId) this.release(); });
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
      this.cw = wide ? Math.min(this.w * .19, this.h * .34) : Math.min(this.w * .28, this.h * .2);
      this.gap = this.cw * .08;
      this.trackY = wide ? this.h * .5 : this.h * .36;
      this.wr = this.cw * .11;
      this.layoutItems();
      this.draw();
    }
    carX(i) {   // center of car i (3 = the engine), not counting the train's offset
      const total = 3 * (this.cw + this.gap) + this.cw * 1.1, x0 = (this.w - total) / 2;
      return i < 3 ? x0 + i * (this.cw + this.gap) + this.cw / 2 : x0 + 3 * (this.cw + this.gap) + this.cw * .55;
    }
    bodyRect(i) { const cx = this.carX(i) + this.offset, ch = this.cw * .66, bottom = this.trackY - this.wr * 1.2; return { x: cx - this.cw / 2, y: bottom - ch, w: this.cw, h: ch, cx }; }
    slotPos(car, k) {
      const b = this.bodyRect(this.cars.indexOf(car)), n = car.need, sp = Math.min(this.cw * .19, this.cw * .8 / n);
      return { x: b.cx + (k - (n - 1) / 2) * sp, y: b.y + b.h * .74, r: Math.min(this.cw * .085, sp * .48) };
    }
    layoutItems() {
      const list = this.items.filter(it => it.state !== 'placed'), n = list.length; if (!n) return;
      const cols = this.wide ? Math.min(n, 9) : Math.ceil(n / 2), rows = Math.ceil(n / cols);
      const r = Math.min(this.h * (this.wide ? .085 : .06), this.w / (cols * 3)); this.ir = r;
      const top = this.wide ? this.h * .78 : this.h * .68, span = this.wide ? this.h * .16 : this.h * .26;
      list.forEach((it, k) => {
        const row = Math.floor(k / cols), inRow = row === rows - 1 ? n - row * cols : cols, col = k - row * cols;
        it.hx = this.w / 2 + (col - (inRow - 1) / 2) * r * 2.6; it.hy = top + (rows === 1 ? span / 2 : row * span / (rows - 1)); it.r = r;
        if (it.state === 'home' && !it.inited) { it.x = it.hx; it.y = it.hy; it.inited = true; }
      });
    }

    /* ---------------------------------------------------------------- rounds */
    newTrain() {
      const tier = SPG.level.tier('train'), level = Math.max(tier === 3 ? 2 : 0, Math.min(tier === 1 ? 2 : 3, Math.floor(this.bag.trains / 2)));   // toddlers: colors and shapes only; older children start with mixed signs
      const kinds = level === 0 ? ['color', 'color', 'color'] : level === 1 ? ['shape', 'shape', 'shape'] : level === 2 ? shuffle(['color', 'shape', pick(['color', 'shape'])]) : shuffle(['color', 'shape', 'count']);
      const colors = shuffle(Object.keys(COLORS)), shapes = shuffle(SHAPES);
      this.cars = kinds.map((type, i) => {
        const car = { type, body: BODY[(this.bag.trains + i) % BODY.length], filled: 0, shake: 0, bounce: 0, slots: [] };
        // a car is painted the color it asks for, so the train and the blocks always match (shape cars are pale, count cars are sunny yellow)
        if (type === 'color') { car.val = colors.pop(); car.need = 2; car.body = COLORS[car.val]; } else if (type === 'shape') { car.val = shapes.pop(); car.need = 2; car.body = '#c9d3ea'; } else { car.val = 1 + Math.floor(Math.random() * [0, 3, 4, 6][tier]); car.need = car.val; car.body = '#ffdc8a'; }
        return car;
      });
      this.items = [];
      for (const car of this.cars) for (let k = 0; k < car.need; k++) this.addItem(car);
      for (let k = 0; k < 2; k++) this.addItem(null);
      this.items = shuffle(this.items);
      this.state = 'arrive'; this.stateT = 0; this.offset = -this.w * 1.2;
      this.layoutItems();
      this.items.forEach((it, k) => { it.pop = 1; it.state = 'spit'; it.t = -.4 - k * .16; it.inited = true; });   // the station machine spits the blocks out one by one
      this.restockAt = 0;
      this.ensureSupply();   // the blocks are dealt car by car, so check that all the cars can be filled at once and add what is missing
    }
    // the machine on the platform's left edge that spits out blocks
    chutePos() { return { x: this.w * .045, y: (this.wide ? this.h * .7 : this.h * .62) + this.h * .035 }; }
    spitOut(count, delay = 0) {
      for (let k = 0; k < count; k++) {
        this.addItem(null);
        const it = this.items[this.items.length - 1]; it.pop = 1; it.state = 'spit'; it.t = -delay - k * .18; it.inited = true;
      }
      this.layoutItems();
    }
    // keep the platform stocked: whenever she has taken blocks away, the machine spits out fresh ones
    restock() {
      const loose = this.items.filter(it => it.state === 'home' || it.state === 'spit' || it.state === 'back' || it.state === 'drag').length;
      if (loose < 6) this.spitOut(1);
    }
    accepts(car, it) { return car.type === 'color' ? it.col === car.val : car.type === 'shape' ? it.shape === car.val : true; }
    addItem(car) {
      let shape = pick(SHAPES), col = pick(Object.keys(COLORS));
      if (car && car.type === 'color') col = car.val; else if (car && car.type === 'shape') shape = car.val;
      this.items.push({ shape, col, state: 'home', x: 0, y: 0, hx: 0, hy: 0, r: this.ir || 30, t: 0, blink: Math.random() * 4, pop: 1 });
    }
    // Keep it solvable: every car that still needs things must have enough things on the platform that it will take.
    ensureSupply() {
      // Every car must always be able to be filled from what is on the platform right now, all at the same time. Each space still empty in a car
      // is matched with a different block that fits it; any space left without one gets a block spat out for it at once.
      const free = this.items.filter(it => it.state !== 'placed' && it.state !== 'fly'), slots = [];
      for (const car of this.cars) for (let k = car.filled; k < car.need; k++) slots.push(car);
      const owner = new Array(free.length).fill(-1);
      const tryFill = (si, seen) => { for (let i = 0; i < free.length; i++) { if (seen[i] || !this.accepts(slots[si], free[i])) continue; seen[i] = 1; if (owner[i] < 0 || tryFill(owner[i], seen)) { owner[i] = si; return true; } } return false; };
      const filled = new Set(); slots.forEach((_, si) => { if (tryFill(si, [])) filled.add(si); });
      for (let si = 0, n = 0; si < slots.length; si++) {
        if (owner.includes(si)) continue;
        this.addItem(slots[si]); const it = this.items[this.items.length - 1]; it.state = 'spit'; it.t = -.1 - (n++) * .15; it.inited = true; it.pop = 1;
      }
      if (this.items.length > free.length + this.items.filter(it => it.state === 'placed' || it.state === 'fly').length) { this.layoutItems(); this.items.forEach(it => { if (it.state === 'home' && it.pop === 1 && !it.placedOnce) { it.pop = 0; it.placedOnce = true; } }); }
    }

    /* ---------------------------------------------------------------- dragging */
    grab(x, y, id) {
      if (this.state !== 'ready' || this.drag) return;
      let best = null, bd = 1e9;
      for (const it of this.items) { if (it.state !== 'home') continue; const d = Math.hypot(x - it.x, y - it.y); if (d < it.r * 1.5 && d < bd) { best = it; bd = d; } }
      if (!best) return;
      best.state = 'drag'; this.drag = { it: best, id, x, y, dx: best.x - x, dy: best.y - y };
      sfx.pop();
    }
    release() {
      const d = this.drag; this.drag = null; if (!d) return;
      const it = d.it, px = d.x + d.dx, py = d.y + d.dy;
      // which car is under the item?
      let target = null;
      this.cars.forEach((car, i) => { const b = this.bodyRect(i); if (px > b.x - b.w * .1 && px < b.x + b.w * 1.1 && py > b.y - b.h * .5 && py < b.y + b.h * 1.4) target = car; });
      if (target && target.filled >= target.need) {   // a full car spits the extra block back out with a puff
        target.shake = .6; sfx.pop(); const b = this.bodyRect(this.cars.indexOf(target));
        this.fx.burst(b.cx, b.y, 8, { colors: ['#fff', '#e7e3f0'], speed: 120, g: -30, life: .7, size: this.cw * .06 });
        this.sendHome(it, false, true); return;
      }
      if (!target) { this.sendHome(it, false); return; }
      if (!this.accepts(target, it)) { target.shake = 1; this.sendHome(it, true); return; }
      const k = target.filled++; it.state = 'fly'; it.t = 0; it.car = target; it.slot = k; it.from = { x: it.x, y: it.y };
      target.slots[k] = it;
      this.bag.items++;
      this.ensureSupply();   // a block that was meant for another car may just have been used: the machine replaces it straight away
    }
    sendHome(it, wrong, spit) {
      it.state = 'back'; it.t = 0; it.from = { x: it.x, y: it.y }; it.arc = spit ? this.cw * .55 : this.cw * .12;
      if (wrong) { sfx.boing(); if (!this.spoken.wrong || this.t - this.spoken.wrong > 12) { this.spoken.wrong = this.t; voice.say('train-wrong'); } }
    }
    landed(it) {
      const car = it.car; it.state = 'placed';
      const s = this.slotPos(car, it.slot);
      sfx.plink(it.slot); this.fx.burst(s.x, s.y, 6, { colors: ['#fff', it.col === 'red' ? '#ff6b6b' : COLORS[it.col]], speed: 90, g: 200, life: .5, size: 4 * this.ui, shape: 'star', up: 60 });
      if (car.type === 'count') voice.say('num/' + car.filled);
      else if (car.filled === 1) voice.say((car.type === 'color' ? 'color/' : 'shape/') + car.val);
      else voice.say('num/' + car.filled);
      if (car.filled >= car.need) { car.bounce = 1; sfx.chime(); this.fx.burst(this.bodyRect(this.cars.indexOf(car)).cx, this.bodyRect(this.cars.indexOf(car)).y, 14, { colors: ['#ffd54a', '#ff8aa3', '#7fd4f5', '#fff'], speed: 220, g: 400, life: .9, size: 6 * this.ui, shape: 'star', up: 160 }); }
      this.ensureSupply();
      if (this.cars.every(c => c.filled >= c.need)) { this.state = 'full'; this.stateT = 0; this.spitOut(3, .5); }   // all full: the machine spits out more blocks to play with
    }

    /* ---------------------------------------------------------------- loop */
    start() { this.resize(); this.newTrain(); this.resize(); this.resume(); voice.say('train-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.drag = null; this.items.forEach(it => { if (it.state === 'drag') this.sendHome(it, false); }); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }

    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.stateT += dt; this.scenic.update(dt);
      if (this.state === 'arrive') {
        const u = clamp(this.stateT / 2.2, 0, 1), off0 = -this.w * 1.2, prev = this.offset;
        this.offset = lerp(off0, 0, 1 - Math.pow(1 - u, 2.2));
        this.roll += (this.offset - prev) / this.wr;
        if ((this.chugT = (this.chugT || 0) - dt) <= 0 && u < 1) { this.chugT = .28; sfx.chug(); }
        if (u >= 1) { this.state = 'ready'; this.stateT = 0; sfx.toot(); }
      } else if (this.state === 'full') {
        if (this.stateT > 1.3) { this.state = 'depart'; this.stateT = 0; sfx.toot(); voice.say('train-go'); this.bag.trains++; this.counter.set(this.bag.trains); store.addStars(1); store.save(); this.scenic.set(['meadow', 'farm', 'snow', 'beach', 'city', 'sunset', 'night', 'autumn'][this.bag.trains % 8]); }
      } else if (this.state === 'depart') {
        const u = clamp(this.stateT / 2.8, 0, 1), prev = this.offset;
        this.offset = this.w * 1.35 * u * u; this.roll += (this.offset - prev) / this.wr;
        if ((this.chugT = (this.chugT || 0) - dt) <= 0) { this.chugT = Math.max(.1, .3 - u * .2); sfx.chug(); }
        if (u >= 1) this.newTrain();
      }
      // smoke from the chimney whenever the train moves
      if (this.state === 'arrive' || this.state === 'depart' || this.state === 'ready') {
        this.smoke -= dt; if (this.smoke <= 0) { this.smoke = this.state === 'ready' ? .5 : .12; const b = this.bodyRect(3); this.fx.burst(b.cx + this.cw * .2, b.y - this.cw * .05, 1, { colors: ['#fff', '#e7e3f0'], speed: 14, g: -55, life: 1.4, size: this.cw * .09 }); }
      }
      for (const car of this.cars) { car.shake = Math.max(0, car.shake - dt * 2.5); car.bounce = Math.max(0, car.bounce - dt * 2); }
      if (this.state === 'ready' && (this.restockT = (this.restockT || 0) - dt) <= 0) { this.restockT = .6; this.restock(); }
      for (const it of this.items) {
        it.blink += dt;
        if (it.pop < 1) it.pop = Math.min(1, it.pop + dt * 4);
        if (it.state === 'home' && this.state !== 'ready' && this.state !== 'arrive') continue;
        if (it.state === 'fly') {
          it.t += dt / .32; const s = this.slotPos(it.car, it.slot), u = ease(Math.min(1, it.t));
          it.x = lerp(it.from.x, s.x, u); it.y = lerp(it.from.y, s.y, u) - Math.sin(u * Math.PI) * this.cw * .3; it.r = lerp(this.ir || it.r, s.r, u);
          if (it.t >= 1) this.landed(it);
        } else if (it.state === 'back') {
          it.t += dt / .35; const u = ease(Math.min(1, it.t));
          it.x = lerp(it.from.x, it.hx, u); it.y = lerp(it.from.y, it.hy, u) - Math.sin(u * Math.PI) * (it.arc || this.cw * .12);
          if (it.t >= 1) { it.state = 'home'; it.x = it.hx; it.y = it.hy; }
        } else if (it.state === 'spit') {   // popped out of the machine and tumbling to its place on the platform
          it.t += dt / .6;
          if (it.t >= 0) {
            if (!it.sounded) { it.sounded = true; sfx.pop(); const ch = this.chutePos(); this.fx.burst(ch.x + this.cw * .12, ch.y - this.cw * .06, 4, { colors: ['#fff', '#ffd54a'], speed: 90, g: 200, life: .5, size: this.cw * .04, shape: 'star', up: 60 }); }
            const u = ease(clamp(it.t, 0, 1)), ch = this.chutePos();
            it.x = lerp(ch.x + this.cw * .1, it.hx, u); it.y = lerp(ch.y - this.cw * .05, it.hy, u) - Math.sin(u * Math.PI) * this.cw * .5;
            if (it.t >= 1) { it.state = 'home'; it.x = it.hx; it.y = it.hy; sfx.plink(2); }
          }
        } else if (it.state === 'home') { it.x = lerp(it.x, it.hx, Math.min(1, dt * 10)); it.y = lerp(it.y, it.hy, Math.min(1, dt * 10));
        } else if (it.state === 'drag' && this.drag) { it.x = this.drag.x + this.drag.dx; it.y = this.drag.y + this.drag.dy; }
      }
      // slots follow the moving train
      for (const car of this.cars) car.slots.forEach((it, k) => { if (it && it.state === 'placed') { const s = this.slotPos(car, k); it.x = s.x; it.y = s.y; it.r = s.r; } });
      this.fx.update(dt);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---------------------------------------------------------------- drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      this.scenic.draw(c, w, h, this.t);
      // track
      const ty = this.trackY;
      c.fillStyle = '#b08a6a'; for (let x = -((this.offset * .0) % 46); x < w; x += 46) c.fillRect(x, ty - 2, 26, this.wr * .7 + 6);
      c.fillStyle = '#8f96a8'; c.fillRect(0, ty - 4, w, 7); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(0, ty - 4, w, 2);
      // platform
      const pt = this.wide ? h * .7 : h * .62;
      const g = c.createLinearGradient(0, pt, 0, h); g.addColorStop(0, '#e2b98d'); g.addColorStop(1, '#c99a6a');
      c.fillStyle = g; c.fillRect(0, pt, w, h - pt); c.fillStyle = '#f3d3ae'; c.fillRect(0, pt, w, 10);
      c.fillStyle = 'rgba(90,63,94,.12)'; for (let x = 0; x < w; x += 90) c.fillRect(x, pt + 14, 3, h - pt);
      // the block machine at the end of the platform
      { const ch = this.chutePos(), m = this.cw * .3; c.save(); c.translate(ch.x, ch.y); c.lineJoin = 'round';
        c.fillStyle = 'rgba(90,63,94,.18)'; c.beginPath(); c.ellipse(m * .1, m * .08, m * .75, m * .12, 0, 0, TAU); c.fill();
        c.fillStyle = '#5aa8f0'; art.rr(c, -m * .55, -m * 1.15, m * 1.1, m * 1.2, m * .2); c.fill(); c.fillStyle = '#7fc0ff'; art.rr(c, -m * .55, -m * 1.15, m * 1.1, m * .35, m * .2); c.fill();
        c.fillStyle = '#ffd54a'; c.fillRect(-m * .55, -m * .55, m * 1.1, m * .1); c.fillStyle = '#3d3560'; art.rr(c, m * .3, -m * .5, m * .55, m * .32, m * .1); c.fill();
        c.save(); c.translate(-m * .1, -m * .8); art.face(c, m * .3, { mood: this.state === 'full' || this.stateT < 1 ? 'cheer' : 'happy' }); c.restore(); c.restore(); }
      // train
      this.cars.forEach((car, i) => this.drawCar(c, car, i));
      this.drawEngine(c);
      // things on the platform
      for (const it of this.items) {
        if (it.state === 'placed' || it.pop <= 0 || (it.state === 'spit' && it.t < 0)) continue;
        const lift = it.state === 'drag' ? 1 : 0, sc = (it.state === 'drag' ? 1.18 : 1) * (it.pop < 1 ? ease(it.pop) * 1.1 : 1);
        c.save(); c.translate(it.x, it.y - lift * 8); c.scale(sc, sc);
        if (it.state !== 'fly' && it.state !== 'placed') { c.fillStyle = 'rgba(90,63,94,.18)'; c.beginPath(); c.ellipse(0, it.r * (1.05 + lift * .2), it.r * .9, it.r * .22, 0, 0, TAU); c.fill(); }
        block(c, it.shape, COLORS[it.col], it.r, (it.blink % 4) < .12);
        c.restore();
      }
      for (const car of this.cars) car.slots.forEach(it => { if (it && it.state === 'placed') { c.save(); c.translate(it.x, it.y); block(c, it.shape, COLORS[it.col], it.r, false); c.restore(); } });
      this.fx.draw(c);
    }
    drawWheels(c, cx, by, wr, dark) {
      for (const dx of [-1, 1]) {
        c.save(); c.translate(cx + dx * this.cw * .27, by + wr * .2); c.fillStyle = '#3d3560'; c.beginPath(); c.arc(0, 0, wr, 0, TAU); c.fill();
        c.rotate(this.roll); c.fillStyle = '#cfd6e4'; c.beginPath(); c.arc(0, 0, wr * .5, 0, TAU); c.fill();
        c.strokeStyle = '#8a92a6'; c.lineWidth = wr * .14; for (let k = 0; k < 3; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-wr * .45, 0); c.lineTo(wr * .45, 0); c.stroke(); }
        c.restore();
      }
    }
    drawCar(c, car, i) {
      const b = this.bodyRect(i), cw = this.cw; const sx = Math.sin(car.shake * 24) * car.shake * cw * .03, bo = Math.sin(car.bounce * Math.PI) * cw * .06;
      c.save(); c.translate(sx, -bo); c.lineJoin = c.lineCap = 'round';
      c.fillStyle = 'rgba(90,63,94,.16)'; c.beginPath(); c.ellipse(b.cx, this.trackY + this.wr * .9, cw * .5, cw * .04, 0, 0, TAU); c.fill();
      c.fillStyle = '#3d3560'; art.rr(c, b.x - cw * .04, b.y + b.h - cw * .05, cw * 1.08, cw * .08, cw * .03); c.fill();
      const bg = c.createLinearGradient(0, b.y, 0, b.y + b.h); bg.addColorStop(0, car.body); bg.addColorStop(1, art.shade(car.body, -.15));
      c.fillStyle = bg; art.rr(c, b.x, b.y, b.w, b.h, cw * .08); c.fill();
      c.fillStyle = 'rgba(255,255,255,.28)'; art.rr(c, b.x + cw * .04, b.y + cw * .03, b.w - cw * .08, cw * .04, cw * .02); c.fill();
      // hitch to the next car
      c.fillStyle = '#5a3f5e'; c.fillRect(b.x + b.w, b.y + b.h - cw * .1, this.gap + 2, cw * .05);
      // the sign: what this car wants
      const sw = cw * .72, sh = b.h * .5, sx0 = b.cx - sw / 2, sy0 = b.y + b.h * .07;
      c.fillStyle = '#fffaf0'; art.rr(c, sx0, sy0, sw, sh, cw * .07); c.fill();
      c.strokeStyle = 'rgba(90,63,94,.25)'; c.lineWidth = 3; c.stroke();
      c.save(); c.translate(b.cx, sy0 + sh / 2);
      if (car.type === 'color') { c.fillStyle = COLORS[car.val]; c.beginPath(); c.arc(0, 0, sh * .36, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 4; c.stroke(); }
      else if (car.type === 'shape') silhouette(c, car.val, sh * .34, '#8a7a9a');
      else {
        c.fillStyle = '#5a3f5e'; c.font = `700 ${sh * .8}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(car.val), -sw * .22, sh * .04);
        const dots = car.val, cols = dots > 2 ? 2 : 1, dr = sh * .085;
        for (let k = 0; k < dots; k++) { c.fillStyle = '#ff8aa3'; c.beginPath(); c.arc(sw * .2 + (cols === 1 ? 0 : (k % 2 - .5) * dr * 2.8), (cols === 1 ? (k - (dots - 1) / 2) * dr * 2.8 : (Math.floor(k / 2) - (Math.ceil(dots / 2) - 1) / 2) * dr * 2.8), dr, 0, TAU); c.fill(); }
      }
      c.restore();
      // empty spaces inside
      for (let k = 0; k < car.need; k++) {
        if (car.slots[k]) continue;
        const s = this.slotPos(car, k);
        if (car.type === 'shape') { c.save(); c.translate(s.x, s.y); silhouette(c, car.val, s.r * 1.05, 'rgba(255,255,255,.55)', '#5a3f5e'); c.restore(); }   // a ghost of the shape it wants
        else if (car.type === 'color') { c.save(); c.translate(s.x, s.y); c.globalAlpha = .75; silhouette(c, 'circle', s.r * 1.0, COLORS[car.val], '#fff'); c.restore(); }   // a steady spot of the colour it wants (any shape of that colour fits; nothing changes or cycles)
        else { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3.5; c.setLineDash([7, 6]); c.beginPath(); c.arc(s.x, s.y, s.r * 1.1, 0, TAU); c.stroke(); c.setLineDash([]);
          c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.arc(s.x, s.y, s.r * 1.1, 0, TAU); c.fill(); }
      }
      if (car.filled >= car.need) { c.fillStyle = '#59b96e'; c.beginPath(); c.arc(b.x + b.w - cw * .1, b.y + cw * .1, cw * .075, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = cw * .025; c.beginPath(); c.moveTo(b.x + b.w - cw * .135, b.y + cw * .1); c.lineTo(b.x + b.w - cw * .105, b.y + cw * .13); c.lineTo(b.x + b.w - cw * .06, b.y + cw * .07); c.stroke(); }
      this.drawWheels(c, b.cx, this.trackY - this.wr, this.wr);
      c.restore();
    }
    drawEngine(c) {
      const b = this.bodyRect(3), cw = this.cw, bx = b.x, by = b.y, bh = b.h;
      c.save(); c.lineJoin = c.lineCap = 'round';
      c.fillStyle = 'rgba(90,63,94,.16)'; c.beginPath(); c.ellipse(b.cx, this.trackY + this.wr * .9, cw * .55, cw * .04, 0, 0, TAU); c.fill();
      c.fillStyle = '#3d3560'; art.rr(c, bx - cw * .02, by + bh - cw * .05, cw * 1.14, cw * .08, cw * .03); c.fill();
      // boiler
      c.fillStyle = '#e8433f'; art.rr(c, bx + cw * .28, by + bh * .3, cw * .82, bh * .7, cw * .12); c.fill();
      c.fillStyle = 'rgba(255,255,255,.25)'; art.rr(c, bx + cw * .32, by + bh * .34, cw * .74, cw * .04, cw * .02); c.fill();
      // cab
      c.fillStyle = '#c92f2f'; art.rr(c, bx, by, cw * .42, bh, cw * .07); c.fill();
      c.fillStyle = '#cdeefc'; art.rr(c, bx + cw * .07, by + bh * .14, cw * .28, bh * .38, cw * .05); c.fill();
      c.fillStyle = '#5a3f5e'; art.rr(c, bx - cw * .04, by - cw * .05, cw * .5, cw * .07, cw * .03); c.fill();
      // chimney and dome
      c.fillStyle = '#5a3f5e'; c.beginPath(); c.moveTo(bx + cw * .82, by + bh * .3); c.lineTo(bx + cw * .78, by - cw * .08); c.lineTo(bx + cw * .98, by - cw * .08); c.lineTo(bx + cw * .94, by + bh * .3); c.fill();
      c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(bx + cw * .55, by + bh * .3, cw * .1, Math.PI, 0); c.fill();
      // face on the front
      c.save(); c.translate(bx + cw * .78, by + bh * .66); art.face(c, cw * .17); c.restore();
      // cow-catcher
      c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(bx + cw * 1.08, by + bh); c.lineTo(bx + cw * 1.22, by + bh + cw * .03); c.lineTo(bx + cw * 1.08, by + bh * .78); c.fill();
      this.drawWheels(c, b.cx - cw * .05, this.trackY - this.wr, this.wr);
      c.restore();
    }
  }

  SPG.games.push({
    id: 'train', name: 'Choo-Choo Train', order: 9,
    icon(c, w, h) {
      art.scene(c, w, h, 3, { showSun: false });
      const s = Math.min(w * .46, h * .7), ty = h * .8;
      c.fillStyle = '#8f96a8'; c.fillRect(0, ty, w, 5);
      const car = (x, col, shape, tone) => { c.fillStyle = col; art.rr(c, x, ty - s * .62, s * .9, s * .5, s * .06); c.fill(); c.fillStyle = '#fffaf0'; art.rr(c, x + s * .18, ty - s * .56, s * .54, s * .26, s * .04); c.fill(); c.save(); c.translate(x + s * .45, ty - s * .43); silhouette(c, shape, s * .09, tone); c.restore(); for (const dx of [.22, .68]) { c.fillStyle = '#3d3560'; c.beginPath(); c.arc(x + s * dx, ty - s * .07, s * .09, 0, TAU); c.fill(); } };
      car(w * .04, '#ff8aa3', 'star', '#ffd54a');
      const ex = w * .04 + s; c.fillStyle = '#e8433f'; art.rr(c, ex + s * .25, ty - s * .5, s * .75, s * .38, s * .06); c.fill(); c.fillStyle = '#c92f2f'; art.rr(c, ex, ty - s * .62, s * .38, s * .5, s * .05); c.fill();
      c.fillStyle = '#5a3f5e'; c.fillRect(ex + s * .72, ty - s * .62, s * .16, s * .16); for (const dx of [.2, .75]) { c.beginPath(); c.arc(ex + s * dx, ty - s * .07, s * .09, 0, TAU); c.fill(); }
      c.save(); c.translate(ex + s * .68, ty - s * .3); art.face(c, s * .1); c.restore();
      for (const [x, y, col, sh] of [[.3, .28, '#ffd54a', 'star'], [.62, .22, '#6fcf6f', 'square']]) { c.save(); c.translate(w * x, h * y); block(c, sh, col, s * .15, false); c.restore(); }
    },
    create: host => new TrainGame(host)
  });
})();
