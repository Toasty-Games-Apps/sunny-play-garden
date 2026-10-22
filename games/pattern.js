// Caterpillars: what comes next? A caterpillar crawls onto a branch, its body is a pattern of coloured balls (red, blue, red, blue...)
// and the end of it is missing. The caterpillar "reads" its pattern out loud first (every ball bounces and plays its own note, so the
// pattern can be heard as well as seen), then she touches the ball that comes next and it hops on. A wrong ball just wiggles and the
// caterpillar sings its pattern again; after two tries the right ball glows. A finished caterpillar sings its whole song, crawls away
// and comes back as a butterfly wearing its colours, which stays in the sky (the last eight are kept). Three butterflies = +1 star.
// Tiers: 1 = two colours (AB) and two balls; 2 = AB first, then AAB / ABB / ABC after two right first tries, three balls;
// 3 = longer patterns, patterns of dots, stripes or big and small, two missing balls and look-alike balls.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => u * u * (3 - 2 * u);
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);

  const COL = { red: '#ff6b6b', orange: '#ffa24d', yellow: '#ffd54a', green: '#6fcf6f', blue: '#5aa8f0', purple: '#b58cf0', pink: '#ff8fc0' };
  const COLS = Object.keys(COL);
  const MARKS = ['plain', 'dots', 'stripes'];
    const PLACES = ['meadow', 'sunset', 'autumn', 'beach'];   // calm places: nothing big behind the branch
  const KEEP = 8;   // butterflies kept in the sky
  // a unit is one kind of ball: colour, mark and size (z = 1 big, .66 small)
  const unit = (c, m = 'plain', z = 1) => ({ c, m, z });
  const keyOf = u => u.c + '|' + u.m + '|' + u.z;
  const same = (a, b) => keyOf(a) === keyOf(b);
  const noteOf = u => (COLS.indexOf(u.c) + MARKS.indexOf(u.m) * 3) % 8;
  const sing = (u, vol = .2) => sfx.instrument(u.z < 1 ? 'bell' : 'xylo', noteOf(u), u.z < 1 ? vol * .8 : vol);

  /* ---------------------------------------------------------------- making a pattern */
  const TYPES = { AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1] };
  function makeRound(tier, easy) {
    let type, feat = 'color';
    if (tier === 1 || easy) type = 'AB';
    else if (tier === 2) type = pick(['AB', 'AAB', 'ABB', 'ABC']);
    else { type = pick(['AB', 'AAB', 'ABB', 'ABC', 'AABB', 'ABC']); feat = pick(['color', 'color', 'mark', 'size', 'both']); }
    const n = Math.max(...TYPES[type]) + 1;
    if (feat === 'size' && n > 2) feat = 'mark';
    const cols = shuffle(COLS), marks = shuffle(MARKS);
    let units;
    if (feat === 'mark') { const c = cols[0]; units = marks.slice(0, n).map(m => unit(c, m)); }
    else if (feat === 'size') { const c = cols[0], m = pick(MARKS); units = [unit(c, m, 1), unit(c, m, .66)]; if (Math.random() < .5) units.reverse(); }
    else if (feat === 'both') units = cols.slice(0, n).map((c, i) => unit(c, marks[i]));
    else units = cols.slice(0, n).map(c => unit(c));
    const len = TYPES[type].length;
    const gaps = tier === 3 ? 2 : 1;
    // show the pattern at least twice (a toddler sometimes sees a bit more), never more than seven balls
    let shown = Math.min(len * 2, 6);
    if (tier === 1 && Math.random() < .5) shown = 5;
    const seq = []; for (let i = 0; i < shown + gaps; i++) seq.push(units[TYPES[type][i % len]]);
    // the balls on the leaves: every answer, the other balls of the pattern, then look-alikes or other colours
    const want = tier === 1 ? 2 : tier === 2 ? 3 : 4;
    const choices = [];
    const add = u => { if (choices.length < want && !choices.some(x => same(x, u))) choices.push(u); };
    seq.slice(shown).forEach(add); units.forEach(add);
    if (tier === 3) {   // look-alikes: the right colour with the wrong dots, or the right dots in the wrong colour
      const a = units[0];
      if (feat === 'size') add(unit(cols[1], a.m, a.z));
      if (feat === 'mark' || feat === 'both') add(unit(a.c, MARKS.find(m => !units.some(u => u.c === a.c && u.m === m)) || 'plain', a.z));
      if (feat === 'both') add(unit(cols[n] || cols[5], a.m));
    }
    for (const c of cols) add(feat === 'size' ? unit(c, units[0].m, units[0].z) : feat === 'mark' ? unit(c, units[0].m) : unit(c));
    return { type, feat, units, seq, shown, gaps, choices: shuffle(choices) };
  }

  /* ---------------------------------------------------------------- drawing */
  // one ball of the pattern, centred at the current origin
  function ball(c, r, u, o = {}) {
    const col = COL[u.c];
    c.save();
    c.beginPath(); c.arc(0, 0, r, 0, TAU);
    const g = c.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05);
    g.addColorStop(0, art.shade(col, .3)); g.addColorStop(.7, col); g.addColorStop(1, art.shade(col, -.18));
    c.fillStyle = g; c.fill();
    c.save(); c.clip();
    if (u.m === 'dots') {
      c.fillStyle = 'rgba(255,255,255,.88)';
      for (const [x, y, k] of [[-.42, -.12, .2], [.3, -.38, .17], [.38, .25, .2], [-.1, .45, .17], [-.05, -.02, .13]]) { c.beginPath(); c.arc(x * r, y * r, k * r, 0, TAU); c.fill(); }
    } else if (u.m === 'stripes') {
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = r * .2; c.lineCap = 'round';
      for (const x of [-.5, 0, .5]) { c.beginPath(); c.moveTo(x * r - r * .12, -r); c.quadraticCurveTo(x * r + r * .2, 0, x * r - r * .12, r); c.stroke(); }
    }
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-r * .3, -r * .45, r * .36, r * .17, -.5, 0, TAU); c.fill();
    c.restore();
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.lineWidth = Math.max(1.5, r * .07); c.strokeStyle = art.shade(col, -.32); c.stroke();
    if (o.glow) { c.globalAlpha = o.glow; c.lineWidth = r * .16; c.strokeStyle = '#fff6b0'; c.beginPath(); c.arc(0, 0, r * 1.18, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    c.restore();
  }
  // the empty place at the end of the caterpillar
  function ghost(c, r, t, hot) {
    c.save();
    const k = 1 + (hot ? Math.sin(t * 5) * .06 : 0); c.scale(k, k);
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = hot ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.3)'; c.fill();
    c.setLineDash([r * .32, r * .22]); c.lineWidth = Math.max(2, r * .09); c.strokeStyle = 'rgba(90,63,94,.55)'; c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(90,63,94,.5)'; c.font = `700 ${r * 1.1}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, r * .06);
    c.restore();
  }
  function legs(c, r, step) {
    c.strokeStyle = '#5a3f5e'; c.lineWidth = Math.max(2, r * .14); c.lineCap = 'round';
    for (const s of [-1, 1]) { const sw = Math.sin(step + (s > 0 ? Math.PI : 0)) * r * .18; c.beginPath(); c.moveTo(s * r * .35, r * .8); c.lineTo(s * r * .38 + sw, r * 1.18); c.stroke(); }
  }
  // the head, facing left; tips = the colour of the antenna balls
  function head(c, R, t, mood, tips) {
    c.save(); c.lineCap = 'round';
    c.strokeStyle = '#5a3f5e'; c.lineWidth = Math.max(2, R * .08);
    for (const s of [-1, 1]) {
      const sw = Math.sin(t * 3 + s) * R * .08, x0 = s * R * .3, tx = s * R * .55 - R * .2 + sw, ty = -R * 1.55;
      c.beginPath(); c.moveTo(x0, -R * .8); c.quadraticCurveTo(x0 + s * R * .1, -R * 1.3, tx, ty); c.stroke();
      c.fillStyle = tips; c.beginPath(); c.arc(tx, ty, R * .15, 0, TAU); c.fill();
    }
    c.beginPath(); c.arc(0, 0, R, 0, TAU);
    const g = c.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R * 1.05); g.addColorStop(0, '#f6dcb6'); g.addColorStop(1, '#c8946a');   // tan: a colour no ball ever has, so the head is never read as part of the pattern
    c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1.5, R * .06); c.strokeStyle = '#9a6b4b'; c.stroke();
    c.translate(-R * .12, R * .08); art.face(c, R * .78, { mood, look: -.5, blink: (t % 4.3) < .14 });
    c.restore();
  }
  // a butterfly whose wings wear a caterpillar's colours (cols: 1 to 3 hex colours)
  function butterfly(c, s, cols, flap) {
    const a = cols[0], b = cols[1] || cols[0], d = cols[2] || '#ffffff';
    c.save(); c.lineJoin = 'round';
    for (const side of [-1, 1]) {
      c.save(); c.scale(side * (.25 + .75 * Math.abs(flap)), 1);
      c.fillStyle = a; c.beginPath(); c.moveTo(0, -s * .05); c.bezierCurveTo(s * .25, -s * .75, s * .95, -s * .6, s * .7, -s * .05); c.closePath(); c.fill();
      c.fillStyle = b; c.beginPath(); c.moveTo(0, s * .02); c.bezierCurveTo(s * .55, s * .02, s * .65, s * .6, s * .25, s * .55); c.closePath(); c.fill();
      c.fillStyle = d; c.beginPath(); c.arc(s * .42, -s * .33, s * .1, 0, TAU); c.fill(); c.beginPath(); c.arc(s * .32, s * .26, s * .07, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(90,63,94,.5)'; c.lineWidth = Math.max(1, s * .03);
      c.beginPath(); c.moveTo(0, -s * .05); c.bezierCurveTo(s * .25, -s * .75, s * .95, -s * .6, s * .7, -s * .05); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(0, s * .02); c.bezierCurveTo(s * .55, s * .02, s * .65, s * .6, s * .25, s * .55); c.closePath(); c.stroke();
      c.restore();
    }
    c.fillStyle = '#5a3f5e'; c.beginPath(); c.ellipse(0, s * .05, s * .07, s * .38, 0, 0, TAU); c.fill();
    c.strokeStyle = '#5a3f5e'; c.lineWidth = Math.max(1, s * .035); c.lineCap = 'round';
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(0, -s * .3); c.quadraticCurveTo(side * s * .1, -s * .55, side * s * .2, -s * .62); c.stroke(); }
    c.restore();
  }
  // a big leaf for a ball to sit on
  function leaf(c, r, night) {
    c.save(); c.rotate(-.1);
    c.fillStyle = night ? '#4d8a4a' : '#7cc95f'; c.beginPath(); c.moveTo(-r * 1.5, 0); c.quadraticCurveTo(0, -r * .9, r * 1.5, 0); c.quadraticCurveTo(0, r * .9, -r * 1.5, 0); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = Math.max(1.5, r * .06); c.beginPath(); c.moveTo(-r * 1.35, 0); c.lineTo(r * 1.35, 0); c.stroke();
    c.restore();
  }

  class PatternGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('pattern', () => ({ done: 0, flock: [] }));
      this.bag.done = this.bag.done || 0; if (!Array.isArray(this.bag.flock)) this.bag.flock = [];
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s / 2); butterfly(c, s * .42, ['#ff8fc0', '#b58cf0', '#ffd54a'], 1); }, this.bag.done);
      this.fx = new art.Fx();
      this.place = SPG.scenery.fader(PLACES[Math.floor(this.bag.done / 4) % PLACES.length]);
      this.t = 0; this.running = false; this.clean = 0; this.saidNext = false;
      this.flies = this.bag.flock.map(cols => this.newFly(cols, false));
      this.tick = this.tick.bind(this);
      const cv = this.canvas;
      cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.press((e.clientX - r.left) * this.w / r.width, (e.clientY - r.top) * this.h / r.height); });
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      if (this.round) this.layout(); else this.by = this.h * (this.w > this.h * 1.15 ? .5 : .47);
      for (const f of this.flies) { f.x = clamp(f.x, 0, this.w); f.y = clamp(f.y, 20, this.skyB()); f.tx = clamp(f.tx, 30, this.w - 30); f.ty = clamp(f.ty, 26, this.skyB()); }
      this.draw();
    }
    start() { this.resize(); this.newRound(); this.resume(); voice.say('pat-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }

    /* ---------------------------------------------------------------- rounds */
    tier() { return SPG.level.tier('pattern'); }
    newRound() {
      const tier = this.tier();
      // tier 2 starts with red-blue patterns and only mixes in the longer ones after two right first tries in a row
      const R = makeRound(tier, tier === 2 && this.clean < 2);
      this.round = Object.assign(R, { filled: 0, wrong: 0, hint: 0 });
      this.segs = R.seq.map((u, i) => ({ u, on: i < R.shown, hop: 0, pop: 0 }));
      this.picks = R.choices.map(u => ({ u, shake: 0, pop: 0, glow: 0 }));
      this.flying = null; this.reading = null; this.idle = 0;
      this.phase = 'enter'; this.pt = 0; this.cx = 0;
      this.layout();
    }
    layout() {
      const w = this.w, h = this.h, n = this.segs.length, wide = w > h * 1.15;
      const R = Math.min(w * .9 / (2.4 + n * 1.3), h * (wide ? .11 : .075));
      this.R = R; this.r = R * .82; this.gap = this.r * 1.62;
      this.len = R * 2 + this.r * .3 + n * this.gap;
      this.by = h * (wide ? .5 : .47);
      this.homeX = (w - this.len) / 2 + R;
      const k = this.picks.length;
      this.pr = clamp(Math.min(w / (k * 3.1), h * .085), 26, 70) * Math.max(1, this.r * 1.1 / 70);
      this.pr = Math.min(this.pr, w / (k * 2.9));
      const py = Math.min(h - this.pr * 1.9, this.by + R * 1.6 + (h - this.by - R * 1.6) * .55);
      this.picks.forEach((p, i) => { p.x = w * (i + .5) / k; p.y = py; });
    }
    // where segment i sits (the head is at index -1)
    segPos(i) {
      const x = this.homeX + this.cx + (i < 0 ? 0 : this.R + this.r * .3 + (i + .5) * this.gap);
      const crawl = this.phase === 'enter' || this.phase === 'leave';
      const y = this.by + Math.sin(this.t * (crawl ? 9 : 2) - (i + 1) * .9) * this.r * (crawl ? .22 : .06);
      return { x, y };
    }
    skyB() { return Math.max(40, (this.by || 300) - (this.R || (this.h || 600) * .07) * 2.6); }

    // the caterpillar sings its pattern: each ball bounces with its own note (all = include the finished end too)
    read(all, speed = 1) { this.reading = { i: 0, t: .15, all, dt: .36 / speed }; }
    updateRead(dt) {
      const r = this.reading; if (!r) return;
      r.t -= dt; if (r.t > 0) return;
      const upto = r.all ? this.segs.length : this.round.shown + this.round.filled;
      if (r.i < upto) { const s = this.segs[r.i]; s.hop = 1; sing(s.u); r.i++; r.t = r.dt; }
      else { if (!r.all) { this.ask = 1; sfx.instrument('flute', 4, .1); } this.reading = null; }
    }

    press(x, y) {
      SPG.audio.unlock();
      this.idle = 0;
      // the butterflies do a little loop when touched
      for (const f of this.flies) if (Math.hypot(x - f.x, y - f.y) < f.s * 1.1) { f.loop = 1; sfx.plink(Math.floor(Math.random() * 5)); this.fx.burst(f.x, f.y, 5, { colors: f.cols, speed: 120, g: 100, life: .6, size: 4 * this.ui, shape: 'star' }); return; }
      if (this.phase !== 'pick' && this.phase !== 'read') return;
      for (const p of this.picks) {
        if (Math.hypot(x - p.x, y - p.y) < this.pr * 1.35) { this.choose(p); return; }
      }
      // touching the caterpillar makes it sing its pattern again
      const a = this.segPos(-1), b = this.segPos(this.segs.length - 1);
      if (x > a.x - this.R * 1.2 && x < b.x + this.r && Math.abs(y - this.by) < this.R * 1.6 && !this.reading && !this.flying) { this.wiggle = 1; this.read(false, 1.2); }
    }
    choose(p) {
      if (this.flying) return;
      const R = this.round, slot = R.shown + R.filled, want = this.segs[slot].u;
      this.reading = null; this.ask = 0; this.phase = 'pick';
      if (same(p.u, want)) {
        sfx.pop(); p.pop = 1; p.glow = 0; this.later = null;
        const from = { x: p.x, y: p.y };
        this.flying = { u: p.u, from, slot, t: 0 };
        this.picks.forEach(q => { q.glow = 0; });
      } else {
        p.shake = 1; R.wrong++; R.miss = (R.miss || 0) + 1;
        sfx.instrument('horn', 0, .1);
        if (R.miss >= 2) this.picks.forEach(q => { q.glow = same(q.u, want) ? 1 : 0; });
        this.later = { t: .7, fn: () => this.read(false, 1.25) };
      }
    }
    land() {
      const F = this.flying, R = this.round, s = this.segs[F.slot];
      s.on = true; s.pop = 1; sing(s.u, .24); this.flying = null; R.filled++; R.miss = 0;
      const p = this.segPos(F.slot);
      this.fx.burst(p.x, p.y, 8, { colors: [COL[s.u.c], '#fff', '#ffd54a'], speed: 170, g: 260, life: .7, size: 5 * this.ui, shape: 'star', up: 90 });
      if (this.tier() === 1 && s.u.m === 'plain') voice.say('color/' + s.u.c);
      if (R.filled >= R.gaps) {
        this.clean = R.wrong ? 0 : this.clean + 1;
        this.phase = 'cheer'; this.pt = 0; this.later = { t: .55, fn: () => this.read(true, 1.6) };
      }
    }
    finish() {
      // the caterpillar has crawled away; a butterfly in its colours flies in and stays
      const cols = []; for (const u of this.round.units) if (!cols.includes(COL[u.c])) cols.push(COL[u.c]);
      if (cols.length === 1) cols.push('#ffffff');
      this.bag.flock.push(cols); while (this.bag.flock.length > KEEP) this.bag.flock.shift();
      this.flies.push(this.newFly(cols, true)); while (this.flies.length > KEEP) this.flies.shift();
      this.bag.done++; this.counter.set(this.bag.done);
      if (this.bag.done % 3 === 0) { store.addStars(1); sfx.win(); } else sfx.chime();
      store.save();
      this.place.set(PLACES[Math.floor(this.bag.done / 4) % PLACES.length]);
      this.newRound();
    }

    newFly(cols, fresh) {
      const w = this.w || 800, top = this.by ? this.skyB() : 300;   // before the first layout the sky size is not known yet
      return { cols, x: fresh ? -40 : 30 + Math.random() * (w - 60), y: fresh ? this.by || 300 : 30 + Math.random() * top, tx: Math.random() * w, ty: 30 + Math.random() * top, ph: Math.random() * 9, s: Math.max(18, 26 * (this.ui || 1)), loop: 0, wait: 0 };
    }
    updateFlies(dt) {
      const top = this.skyB();
      for (const f of this.flies) {
        f.ph += dt * 9; f.loop = Math.max(0, f.loop - dt * 1.2); f.s = Math.max(18, 26 * this.ui);
        if (Math.hypot(f.tx - f.x, f.ty - f.y) < 20 || (f.wait -= dt) < -6) { f.tx = 30 + Math.random() * (this.w - 60); f.ty = 26 + Math.random() * Math.max(20, top - 26); f.wait = 0; }
        const a = Math.atan2(f.ty - f.y, f.tx - f.x), sp = 55 * this.ui;
        f.x += Math.cos(a) * sp * dt + Math.sin(f.ph * .37) * 12 * dt; f.y += Math.sin(a) * sp * dt + Math.cos(f.ph * .5) * 20 * dt;
      }
    }

    /* ---------------------------------------------------------------- loop */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.pt += dt;
      if (this.later && (this.later.t -= dt) <= 0) { const fn = this.later.fn; this.later = null; fn(); }
      const R = this.round;
      if (this.phase === 'enter') {
        const u = Math.min(1, this.pt / 1.8); this.cx = (1 - ease(u)) * (this.w - this.homeX + this.R * 1.5);
        if (u >= 1) { this.cx = 0; this.phase = 'read'; this.picks.forEach(p => { p.pop = 1; }); this.read(false); }
      } else if (this.phase === 'read') { if (!this.reading && !this.later) this.phase = 'pick'; }
      else if (this.phase === 'pick') {
        this.idle += dt;
        if (this.idle > 9) {   // nothing touched for a while: sing the pattern again (and say the question once)
          this.idle = 0; this.read(false); R.hint++;
          if (!this.saidNext) { this.saidNext = true; voice.say('pat-next'); }
          if (R.hint >= 2) { const want = this.segs[R.shown + R.filled].u; this.picks.forEach(q => { q.glow = same(q.u, want) ? 1 : 0; }); }
        }
      } else if (this.phase === 'cheer') {
        if (!this.reading && !this.later && this.pt > 1) {
          if (Math.random() < .5) voice.praise();
          this.fx.burst(this.w / 2, this.by - this.R * 2, 18, { colors: R.units.map(u => COL[u.c]).concat('#ffd54a'), speed: 280, g: 360, life: 1.1, size: 6 * this.ui, shape: 'star', up: 160 });
          this.phase = 'leave'; this.pt = 0;
        }
      } else if (this.phase === 'leave') {
        const u = Math.min(1, this.pt / 1.7); this.cx = -ease(u) * (this.homeX + this.len + this.R);
        if (u >= 1) this.finish();
      }
      if (this.flying) { this.flying.t += dt / .45; if (this.flying.t >= 1) this.land(); }
      this.updateRead(dt);
      for (const s of this.segs) { s.hop = Math.max(0, s.hop - dt * 3.2); s.pop = Math.max(0, s.pop - dt * 2.5); }
      for (const p of this.picks) { p.shake = Math.max(0, p.shake - dt * 2.2); p.pop = Math.max(0, p.pop - dt * 3); }
      this.ask = Math.max(0, (this.ask || 0) - dt * .8); this.wiggle = Math.max(0, (this.wiggle || 0) - dt * 2);
      this.updateFlies(dt); this.place.update(dt); this.fx.update(dt);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---------------------------------------------------------------- drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w || !this.round) return;
      const night = SPG.night && SPG.night.on();
      this.place.draw(c, w, h, this.t, { clouds: true });
      // the branch the caterpillar walks along
      const by = this.by, R = this.R, bt = by + R * 1.05;
      c.save(); c.lineCap = 'round';
      c.strokeStyle = night ? '#5a4234' : '#9a6b4b'; c.lineWidth = R * .55; c.beginPath(); c.moveTo(-20, bt + R * .1); c.quadraticCurveTo(w * .5, bt - R * .25, w + 20, bt + R * .15); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = R * .12; c.beginPath(); c.moveTo(-20, bt - R * .02); c.quadraticCurveTo(w * .5, bt - R * .37, w + 20, bt + R * .03); c.stroke();
      for (const fx of [.08, .3, .74, .93]) { c.save(); c.translate(w * fx, bt - R * .1); c.rotate(fx < .5 ? -2.3 : -.8); leaf(c, R * .55, night); c.restore(); }
      c.restore();
      // the leaves with the balls to choose from
      for (const p of this.picks) {
        c.save(); c.translate(p.x, p.y + this.pr * .78); leaf(c, this.pr * .95, night); c.restore();
        const k = 1 + p.pop * .25 - p.pop * p.pop * .25, sx = Math.sin(p.shake * 26) * p.shake * this.pr * .25;
        const g = p.glow ? .55 + Math.sin(this.t * 6) * .35 : 0;
        c.save(); c.translate(p.x + sx, p.y); c.scale(k, k); ball(c, this.pr * p.u.z, p.u, { glow: g }); c.restore();
      }
      this.drawCaterpillar(c);
      if (this.flying) {
        const F = this.flying, to = this.segPos(F.slot), u = ease(Math.min(1, F.t));
        const x = F.from.x + (to.x - F.from.x) * u, y = F.from.y + (to.y - F.from.y) * u - Math.sin(u * Math.PI) * this.R * 2.2;
        const r = this.pr + (this.r - this.pr) * u;
        c.save(); c.translate(x, y); c.rotate(u * TAU * .5); ball(c, r * F.u.z, F.u); c.restore();
      }
      for (const f of this.flies) {
        c.save(); c.translate(f.x, f.y); if (f.loop) c.rotate(f.loop * TAU); c.rotate(Math.sin(f.ph * .3) * .15);
        butterfly(c, f.s, f.cols, Math.sin(f.ph)); c.restore();
      }
      this.fx.draw(c);
    }
    drawCaterpillar(c) {
      const R = this.round, n = this.segs.length, step = this.t * 9;
      const crawl = this.phase === 'enter' || this.phase === 'leave';
      for (let i = n - 1; i >= 0; i--) {
        const s = this.segs[i], p = this.segPos(i), hop = Math.sin(s.hop * Math.PI) * this.r * .55;
        c.save(); c.translate(p.x, p.y - hop);
        if (s.on) {
          const z = s.u.z, k = 1 + Math.sin(s.pop * Math.PI) * .2;
          legs(c, this.r, crawl ? step + i : 0);
          c.translate(0, this.r * (1 - z) * .8); c.scale(k, k); ball(c, this.r * z, s.u);
        } else {
          const hot = i === R.shown + R.filled;
          ghost(c, this.r, this.t, hot);
          if (hot && this.ask) { c.globalAlpha = this.ask; c.strokeStyle = '#fff6b0'; c.lineWidth = this.r * .14; c.beginPath(); c.arc(0, 0, this.r * (1.2 + (1 - this.ask) * .5), 0, TAU); c.stroke(); }
        }
        c.restore();
      }
      const hp = this.segPos(-1), w = Math.sin((this.wiggle || 0) * 20) * (this.wiggle || 0) * .15;
      const happy = this.phase === 'cheer' || this.phase === 'leave' || this.flying;
      c.save(); c.translate(hp.x, hp.y - this.R * .12); c.rotate(w);
      head(c, this.R, this.t, happy ? 'cheer' : 'happy', COL[R.units[0].c]);
      c.restore();
    }
  }

  SPG.games.push({
    id: 'pattern', name: 'Caterpillars', order: 15,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#dff3ff'); g.addColorStop(1, '#eafbe0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#a6dc7e'; c.beginPath(); c.ellipse(w * .5, h * 1.05, w * .8, h * .38, 0, 0, TAU); c.fill();
      const R = Math.min(w, h) * .13, r = R * .82, y = h * .66, seq = ['red', 'blue', 'red', 'blue'];
      c.strokeStyle = '#9a6b4b'; c.lineWidth = R * .5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, y + R * 1.1); c.lineTo(w, y + R * .9); c.stroke();
      for (let i = seq.length - 1; i >= 0; i--) {
        const x = w * .2 + R + r * .3 + (i + .5) * r * 1.62, yy = y + Math.sin(i * .9) * r * .1;
        c.save(); c.translate(x, yy); if (i === 3) ghost(c, r, 0, true); else { legs(c, r, 0); ball(c, r, unit(seq[i])); } c.restore();
      }
      c.save(); c.translate(w * .2, y); head(c, R, 1, 'happy', COL.red); c.restore();
      c.save(); c.translate(w * .78, h * .22); c.rotate(.2); butterfly(c, Math.min(w, h) * .15, [COL.red, COL.blue], .8); c.restore();
    },
    create: host => new PatternGame(host)
  });
  SPG.patternGame = { makeRound, probe: () => { const r = SPG.app && SPG.app.running(), g = r && r.inst; return g && g.round ? { phase: g.phase, picks: g.picks.map(p => ({ x: p.x, y: p.y, r: g.pr, key: keyOf(p.u) })), want: g.round.shown + g.round.filled < g.segs.length ? keyOf(g.segs[g.round.shown + g.round.filled].u) : null, done: g.bag.done, filled: g.round.filled, gaps: g.round.gaps, type: g.round.type, feat: g.round.feat, n: g.segs.length, head: g.segPos(-1), flies: g.flies.length, fliesOn: g.flies.filter(f => f.x >= 0 && f.x <= g.w && f.y >= 0 && f.y <= g.h).length, w: g.w, h: g.h, hint: g.picks.some(p => p.glow) } : null; } };
})();
