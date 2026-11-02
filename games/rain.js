// Rain Bucket: friendly clouds drop raindrops; slide the bucket to catch them.
// A full bucket makes a rainbow and plants a flower in her meadow, which is kept between visits.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const RAINBOW = ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0', '#c98bf0'];
  const CAPACITY = [0, 6, 8, 14];   // drops for a rainbow, by age tier (SPG.level)
  // A new place after every "raining cats and dogs" (every third flower): the meadow gets sunset, autumn, night, snow...
  const RAIN_SCENES = ['meadow', 'sunset', 'autumn', 'night', 'snow', 'beach', 'farm'];
  const sceneFor = flowers => RAIN_SCENES[Math.floor((flowers || 0) / 3) % RAIN_SCENES.length];

  class RainGame {
    constructor(host) {
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.host = host;
      this.bag = store.bag('rain', () => ({ flowers: 0, drops: 0, pets: 0, petEvents: 0 }));
      this.bag.pets = this.bag.pets || 0; this.bag.petEvents = this.bag.petEvents || 0;
      this.pets = null; this.bucketHide = 0; this.petCounter = null;
      this.queue = []; this.cool = 0; this.card = null;   // special events wait in line, one at a time, each behind its own transition card
      this.scenic = SPG.scenery.fader(sceneFor(this.bag.flowers));
      this.met = null; this.craters = [];
      this.storm = null; this.flash = 0; this.bolts = []; this.thunders = []; this.sunT = 0;
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s * .52); art.drop(c, s * .26); }, this.bag.drops || 0);
      this.fx = new art.Fx();
      this.drops = []; this.ripples = []; this.streaks = [];
      this.t = 0; this.fill = 0; this.caught = 0; this.rainbow = 0; this.spawnIn = .6; this.moodT = 0; this.newFlower = 0;
      this.bucket = { x: 0, tx: 0 }; this.running = false; this.keys = {};
      this.tick = this.tick.bind(this);
      const cv = this.canvas;
      const at = e => { const r = cv.getBoundingClientRect(); this.bucket.tx = (e.clientX - r.left) * this.w / r.width; };
      // the bucket follows the newest finger, and keeps following one that is still down when another lifts off
      this.fingers = [];
      cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ } this.fingers = this.fingers.filter(id => id !== e.pointerId).concat(e.pointerId); this.dragging = true; at(e); });
      cv.addEventListener('pointermove', e => { if (this.dragging && e.pointerId === this.fingers[this.fingers.length - 1]) { e.preventDefault(); at(e); } });
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(t, e => { this.fingers = this.fingers.filter(id => id !== e.pointerId); this.dragging = this.fingers.length > 0; });
      this.onKey = e => { this.keys[e.key] = e.type === 'keydown'; };
      addEventListener('keydown', this.onKey); addEventListener('keyup', this.onKey);
      if (this.bag.pets) this.showPetCounter();
      for (let i = 0; i < 40; i++) this.streaks.push({ x: Math.random(), y: Math.random(), s: .5 + Math.random() });
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const ow = this.w || r.width, oh = this.h || r.height;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.bw = Math.max(76, Math.min(250, Math.min(this.w * .21, this.h * .2))); this.bh = this.bw * .8;
      this.rimY = this.h - this.bh - this.h * .07;
      this.groundY = this.h * .95;
      this.dropR = Math.max(11, Math.min(28, Math.min(this.w, this.h) * .036));
      this.cs = Math.max(.55, Math.min(1.5, Math.min(this.w, this.h * 1.4) / 750 + .1));
      if (!this.bucket.x) this.bucket.x = this.bucket.tx = this.w / 2; else { this.bucket.x *= this.w / ow; this.bucket.tx *= this.w / ow; }
      // the screen turned: everything out in the world keeps its place on the new screen (dinosaurs, pets and drops never end up off the side)
      const kx = this.w / ow, ky = this.h / oh, M = this.met, P = this.pets;
      if (kx !== 1 || ky !== 1) {
        for (const o of [...this.drops, ...this.ripples, ...this.craters, ...(M ? M.rocks : []), ...(P ? P.list : [])]) { o.x *= kx; o.y *= ky; }
        if (M) { M.s = Math.min(this.h * .22, this.w * .17); for (const d of M.dinos) { d.x *= kx; d.tx *= kx; } }
        if (P) P.net.x *= kx;
      }
      this.draw();
    }

    start() { this.resize(); this.resume(); voice.say('catch-drops'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.dragging = false; this.fingers = []; }
    destroy() { this.pause(); removeEventListener('keydown', this.onKey); removeEventListener('keyup', this.onKey); this.canvas.remove(); this.counter.el.remove(); this.petCounter?.el.remove(); }

    cloudX(i) { return this.w * (.2 + i * .3) + Math.sin(this.t * .35 + i * 2) * this.w * .06; }
    // Up to six clouds: the extra three roll in from the sides when a storm comes.
    stormK() { return this.storm ? this.storm.k : 0; }
    cloudCount() { return 3 + Math.round(this.stormK() * 3); }
    cloudPos(i) {
      if (i < 3) return { x: this.cloudX(i), y: this.cloudY() + Math.sin(this.t * .8 + i) * 6, s: this.cs * (i === 1 ? 1.1 : .95) };
      const j = i - 3, k = this.stormK(), e = 1 - Math.pow(1 - k, 2), side = j % 2 ? 1 : -1;
      return { x: this.w * (.09 + j * .41) + Math.sin(this.t * .3 + i * 1.7) * this.w * .05 + side * (1 - e) * this.w * .7, y: this.cloudY() * (.52 + j * .3) + Math.sin(this.t * .8 + i) * 5, s: this.cs * .85 };
    }
    cloudY() { return Math.max(Math.min(this.h * .3, 78 * this.cs + 30), this.h * .17); }

    spawn() {
      const i = Math.floor(Math.random() * this.cloudCount()), gold = Math.random() < .12, cp = this.cloudPos(i);
      this.drops.push({ x: Math.max(8, Math.min(this.w - 8, cp.x + (Math.random() - .5) * 90 * this.cs)), y: cp.y + 30 * this.cs, vy: this.h * .1, r: this.dropR * (gold ? 1.15 : .9 + Math.random() * .2), gold, blink: Math.random() * 3 });
      this.spawnIn = (Math.max(.55, 1.0 - this.caught * .004) + Math.random() * .45) * (SPG.level.tier('rain') === 3 ? .8 : SPG.level.tier('rain') === 1 ? 1.15 : 1) / (1 + this.stormK() * 8);   // a storm rains about nine times as much
    }

    catchDrop(d) {
      this.caught++; this.moodT = .35; this.bag.drops = (this.bag.drops || 0) + 1; this.counter.set(this.bag.drops); store.save();
      this.fill = Math.min(1, this.fill + (d.gold ? 2 : 1) / (CAPACITY[SPG.level.tier('rain')] * (1 + this.stormK() * 1.5)));   // (a storm fills it a bit slower per drop, so rainbows stay special)
      this.fx.burst(d.x, this.rimY, 8, { colors: ['#9be0ff', '#fff', d.gold ? '#ffd54a' : '#5cc8f2'], speed: 190, g: 700, life: .5, size: 5, up: 200 });
      sfx.plink(this.caught);
      if (this.fill >= 1) this.celebrate();
    }

    celebrate() {
      this.rainbow = 1; this.fill = 0; this.bag.flowers++; if (this.bag.flowers % 3 === 0) this.queueEvent('pets'); else if (this.bag.flowers % 3 === 2) this.queueEvent('storm'); if (this.bag.flowers % 4 === 1) this.queueEvent('meteor'); this.newFlower = 1; store.save(); store.addStars(1);
      sfx.win(); voice.say('rainbow', 'wow');
      const b = this.bucket;
      this.fx.burst(b.x, this.rimY, 28, { colors: RAINBOW, speed: 420, g: 400, life: 1.2, size: 8, shape: 'confetti', up: 260 });
    }

    /* ---- a gentle storm: more clouds, soft lightning, soft thunder, lots of rain ---- */
    /* ---- events, one at a time, each behind a transition card ("loading" picture, no words) */
    queueEvent(kind) { if (!this.queue.includes(kind) && !(kind === 'storm' && this.storm) && !(kind === 'pets' && this.pets) && !(kind === 'meteor' && this.met)) this.queue.push(kind); }
    // an event just finished: rest for a while, then a calm "all clear" card (with the new place, after the rescue)
    endEvent(changePlace) {
      this.cool = 18;
      this.showCard('clear', () => { if (changePlace) this.scenic.set(sceneFor(this.bag.flowers)); });
    }
    showCard(kind, mid) { this.card = { kind, t: 0, mid, midDone: false }; sfx.whoosh(); }
    updateCard(dt) {
      const k = this.card; if (!k) return;
      k.t += dt;
      if (!k.midDone && k.t >= .6) { k.midDone = true; k.mid && k.mid(); }   // the event starts while the card covers the screen
      if (k.t >= 2.9) this.card = null;
    }
    drawCard(c) {
      const k = this.card, w = this.w, h = this.h, t = k.t;
      const a = t < .5 ? t / .5 : t < 2.3 ? 1 : Math.max(0, 1 - (t - 2.3) / .6);
      const pal = { storm: ['#5b6da8', '#93a6d4'], pets: ['#ffd2bf', '#fff1dc'], meteor: ['#35306e', '#ff9d6b'], clear: ['#b9e4ff', '#fff6d2'] }[k.kind];
      c.save(); c.globalAlpha = a;
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const s = Math.min(w, h * 1.3) * .3, bob = Math.sin(t * 3) * s * .03;
      c.translate(w / 2, h * .42 + bob);
      if (k.kind === 'storm') {
        art.cloud(c, -s * .05, -s * .1, s / 70, 1, '#cdd8ea'); c.save(); c.translate(s * .0, -s * .02); art.face(c, s * .3, { mood: 'wow' }); c.restore();
        c.fillStyle = '#ffe066'; c.strokeStyle = '#fff'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(s * .08, s * .3); c.lineTo(-s * .12, s * .72); c.lineTo(s * .02, s * .68); c.lineTo(-s * .08, s * 1.05); c.lineTo(s * .24, s * .55); c.lineTo(s * .1, s * .58); c.lineTo(s * .22, s * .3); c.closePath(); c.fill(); c.stroke();
        for (const [x, y] of [[-.5, .5], [-.35, .85], [.45, .6], [.6, .95]]) { c.save(); c.translate(x * s, y * s + Math.sin(t * 6 + x * 9) * s * .04); art.drop(c, s * .1); c.restore(); }
      } else if (k.kind === 'meteor') {
        for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(255,248,200,${.4 + .5 * Math.abs(Math.sin(t * 2 + i))})`; c.beginPath(); c.arc(((i * 137) % 100 / 100 - .5) * s * 3, -s * (.3 + (i * 53 % 100) / 100 * .6), s * .02, 0, TAU); c.fill(); }
        c.save(); c.translate(s * .4, -s * .25 + Math.sin(t * 4) * s * .04); c.rotate(.6); c.fillStyle = 'rgba(255,200,120,.55)'; c.beginPath(); c.moveTo(-s * .5, -s * .08); c.lineTo(0, -s * .12); c.lineTo(0, s * .12); c.lineTo(-s * .5, s * .08); c.closePath(); c.fill(); c.fillStyle = '#b07850'; c.beginPath(); c.arc(0, 0, s * .15, 0, TAU); c.fill(); art.face(c, s * .12, { mood: 'wow' }); c.restore();
        c.save(); c.translate(-s * .15, s * .72); SPG.pets.draw(c, 'trike', s * .85, t, { mood: 'cheer', hop: (Math.sin(t * 5) + 1) * .2 }); c.restore();
      } else if (k.kind === 'pets') {
        c.save(); c.translate(0, s * .6); art.fireTruck(c, s * .07, t, {}); c.restore();
        c.save(); c.translate(-s * .38, -s * .1 + Math.sin(t * 5) * s * .05); art.pet(c, 'cat', 0, s * .34, t, 'fall', 1); c.restore();
        c.save(); c.translate(s * .42, -s * .18 + Math.sin(t * 5 + 2) * s * .05); art.pet(c, 'dog', 0, s * .34, t, 'fall', 3); c.restore();
      } else {
        ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = s * .09; c.lineCap = 'round'; c.beginPath(); c.arc(0, s * .55, s * (1.05 - i * .1), Math.PI * 1.05, Math.PI * 1.95); c.stroke(); });
        art.sun(c, 0, -s * .1, s * .34, t);
      }
      // "loading": three little dots that jump one after another
      c.setTransform(SPG.ui.dpr(), 0, 0, SPG.ui.dpr(), 0, 0);
      for (let i = 0; i < 3; i++) { const p = ((t * 2.2 - i * .28) % 1 + 1) % 1, y = h * .84 - Math.abs(Math.sin(p * Math.PI)) * s * .16; c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(w / 2 + (i - 1) * s * .26, y, s * .07, 0, TAU); c.fill(); }
      c.restore();
    }

    startStorm() {
      if (this.storm) return;
      this.storm = { phase: 'in', t: 0, k: 0, flashIn: 4 + Math.random() * 2, bolts: 0 };
      voice.say('storm-coming');
    }
    lightning() {
      const i = Math.floor(Math.random() * this.cloudCount()), cp = this.cloudPos(i), y1 = this.h * (.5 + Math.random() * .12);
      const pts = [[cp.x, cp.y + 26 * cp.s]]; let x = cp.x;
      for (let k = 1; k <= 5; k++) { x += (Math.random() - .5) * this.w * .07; pts.push([x, cp.y + 26 * cp.s + (y1 - cp.y) * k / 5]); }
      this.bolts.push({ pts, life: 1, w: Math.max(7, this.cs * 10) }); this.flash = 1;
      sfx.zap(); this.thunders.push(.7 + Math.random() * .6);
      this.fx.burst(pts[pts.length - 1][0], pts[pts.length - 1][1], 8, { colors: ['#fff6a8', '#ffd54a', '#fff'], shape: 'star', speed: 150, g: 100, life: .6, size: 8 });
    }
    updateStorm(dt) {
      const S = this.storm; S.t += dt;
      if (S.phase === 'in') { S.k = Math.min(1, S.t / 3); if (S.t >= 3) { S.phase = 'on'; S.t = 0; } }
      else if (S.phase === 'on') {
        S.k = 1; S.flashIn -= dt;
        if (S.flashIn <= 0 && S.bolts < 5) { S.bolts++; S.flashIn = 3.2 + Math.random() * 3.2; this.lightning(); }
        if (S.t >= 22) { S.phase = 'out'; S.t = 0; }
      } else {
        S.k = Math.max(0, 1 - S.t / 3.5);
        if (S.t >= 3.5) {
          this.storm = null; this.sunT = 5; store.addStars(1); sfx.win(); voice.say('storm-over'); this.endEvent();
          this.fx.burst(this.w * .8, this.h * .2, 22, { colors: ['#ffd54a', '#fff6a8', '#ffffff'], shape: 'star', speed: 260, g: 60, life: 1.3, size: 9 });
        }
      }
    }

    /* ---- a meteor shower: dinosaurs wander along the ground while shooting stars fall. She catches them in the bucket;
       the dinosaurs always run out of the way, so nothing ever hits them and nothing can go wrong ---- */
    startMeteors() {
      if (this.met) return;
      const ids = ['trex', 'trike', 'stego', 'bronto', 'babydino'].sort(() => Math.random() - .5).slice(0, this.w < 560 ? 3 : 4);
      const s = Math.min(this.h * .22, this.w * .17);
      this.met = { phase: 'in', t: 0, k: 0, rocks: [], spawned: 0, total: 12, caught: 0, spawnIn: 1.6, s,
        dinos: ids.map((id, i) => ({ id, x: this.w * (.14 + i * (.72 / Math.max(1, ids.length - 1))), tx: 0, dir: i % 2 ? -1 : 1, pause: Math.random() * 2, bob: Math.random() * 9, flee: 0, cheer: 0 })) };
      for (const d of this.met.dinos) d.tx = d.x;
      voice.say('meteor-start');
    }
    // the dinosaurs stay well away from every falling rock (a rock falls straight down, so where it lands is known)
    dinoDanger(M, x) { let worst = null; for (const r of M.rocks) { const dx = x - r.x; if (Math.abs(dx) < M.s * .8 && (!worst || Math.abs(dx) < Math.abs(worst))) worst = dx; } return worst; }
    updateMeteors(dt) {
      const M = this.met; M.t += dt;
      const r0 = Math.max(16, Math.min(40, this.dropR * 1.6));
      if (M.phase === 'in') { M.k = Math.min(1, M.t / 2.2); if (M.t >= 2.2) { M.phase = 'on'; M.t = 0; } }
      else if (M.phase === 'on') {
        M.k = 1;
        M.spawnIn -= dt;
        if (M.spawnIn <= 0 && M.spawned < M.total) {
          M.spawned++; M.spawnIn = 1.7 + Math.random() * 1.1;
          // choose a column that is not over a dinosaur
          let x = 0, tries = 0; do { x = this.w * (.08 + Math.random() * .84); tries++; } while (tries < 12 && M.dinos.some(d => Math.abs(d.x - x) < M.s * 1.2));
          M.rocks.push({ x, y: -r0, vy: this.h * .1, r: r0 * (.9 + Math.random() * .35), spin: Math.random() * 6, face: Math.random() * 3 });
          sfx.whoosh();
        }
        if (M.spawned >= M.total && !M.rocks.length) { M.phase = 'out'; M.t = 0; }
      } else { M.k = Math.max(0, 1 - M.t / 2.8); if (M.t >= 2.8) { this.endMeteors(); return; } }
      // rocks
      const b = this.bucket, g = this.h * .16, vmax = this.h * .3;
      for (const r of M.rocks) { r.vy = Math.min(vmax, r.vy + g * dt); r.y += r.vy * dt; r.spin += dt * 2; r.face -= dt; if (Math.random() < dt * 30) this.fx.burst(r.x, r.y - r.r * .5, 1, { colors: ['#ffb347', '#ff7a3d', '#ffe27a'], speed: 30, g: -60, life: .5, size: r.r * .3 }); }
      M.rocks = M.rocks.filter(r => {
        if (this.bucketHide < .3 && r.y + r.r * .4 >= this.rimY && r.y <= this.rimY + this.bh * .4 && Math.abs(r.x - b.x) < this.bw * .55 - r.r * .2) {
          M.caught++; this.moodT = .5; sfx.plink(M.caught); this.bag.meteors = (this.bag.meteors || 0) + 1; store.save();
          this.fx.burst(r.x, this.rimY, 14, { colors: ['#ffe27a', '#fff', '#ffb347', '#9be0ff'], shape: 'star', speed: 240, g: 500, life: .7, size: 8, up: 220 });
          for (const d of M.dinos) d.cheer = 1; return false;
        }
        if (r.y >= this.groundY - r.r * .4) {   // a soft landing: a little glowing stone and a puff of stars
          this.craters.push({ x: r.x, y: this.groundY, life: 1, r: r.r });
          this.fx.burst(r.x, this.groundY, 10, { colors: ['#ffe27a', '#ffb347', '#fff'], shape: 'star', speed: 150, g: 300, life: .6, size: 7, up: 120 }); sfx.pop();
          for (const d of M.dinos) if (Math.abs(d.x - r.x) < M.s * .55) { d.x += (d.x >= r.x ? 1 : -1) * M.s * .6; d.flee = 1; }   // (they were already running; this is only a safety net)
          return false;
        }
        return true;
      });
      // dinosaurs: wander, pause, and run away from anything falling near them
      for (const d of M.dinos) {
        d.bob += dt * 8; d.cheer = Math.max(0, d.cheer - dt);
        const danger = this.dinoDanger(M, d.x);
        if (danger !== null) { d.flee = 1; const away = danger >= 0 ? 1 : -1; d.dir = away; let nx = d.x + away * this.w * .55 * dt; if (nx < M.s * .4 || nx > this.w - M.s * .4) { d.dir = -away; nx = d.x - away * this.w * .55 * dt; } d.x = Math.max(M.s * .4, Math.min(this.w - M.s * .4, nx)); d.tx = d.x; d.pause = .4; }
        else {
          d.flee = Math.max(0, d.flee - dt * 3);
          if (d.pause > 0) d.pause -= dt;
          else if (Math.abs(d.tx - d.x) < 6) { d.tx = M.s * .5 + Math.random() * (this.w - M.s); d.pause = .3 + Math.random() * 1.6; }
          else { const dir = Math.sign(d.tx - d.x); d.dir = dir; d.x += dir * this.w * .09 * dt; }
        }
      }
    }
    endMeteors() {
      this.met = null; this.craters.length = 0; store.addStars(1); sfx.win(); voice.say('meteor-done'); this.endEvent();
      this.fx.burst(this.w / 2, this.h * .3, 26, { colors: ['#ffe27a', '#ffb347', '#fff', '#ff9fc8'], shape: 'star', speed: 300, g: 80, life: 1.4, size: 9 });
    }
    drawMeteors(c) {
      const M = this.met, w = this.w, h = this.h, k = M.k;
      // evening sky with twinkling stars
      c.fillStyle = `rgba(48,40,100,${(.42 * k).toFixed(3)})`; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { const x = ((i * 0.6180339 + .11) % 1) * w, y = ((i * 0.3819 + .05) % 1) * h * .6; c.globalAlpha = k * (.35 + .5 * Math.abs(Math.sin(this.t * 1.4 + i))); c.fillStyle = '#fff8d8'; c.beginPath(); c.arc(x, y, 1.6 + (i % 3), 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      // glowing stones where rocks landed
      for (const cr of this.craters) { c.globalAlpha = Math.min(1, cr.life * 1.5); c.fillStyle = '#ffd27a'; c.beginPath(); c.ellipse(cr.x, cr.y, cr.r * .7, cr.r * .35, 0, 0, TAU); c.fill(); c.fillStyle = '#b07850'; c.beginPath(); c.ellipse(cr.x, cr.y - cr.r * .1, cr.r * .5, cr.r * .28, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
      // dinosaurs
      const slide = 1 - Math.pow(1 - Math.min(1, k * 1.4), 3);
      for (const d of M.dinos) {
        const walking = Math.abs(d.tx - d.x) > 6 || d.flee > .05, hop = walking ? Math.abs(Math.sin(d.bob * (d.flee > .05 ? 1.6 : 1))) * M.s * .07 : 0;
        c.save(); c.translate(d.x, this.groundY + (1 - slide) * M.s * 1.2 - hop); if (d.dir < 0) c.scale(-1, 1);
        SPG.pets.draw(c, d.id, M.s, this.t + d.bob * .1, { mood: d.cheer > 0 || d.flee > .3 ? 'cheer' : 'happy', hop: 0 });
        c.restore();
      }
      // falling meteors: a friendly rock with a flame tail
      for (const r of M.rocks) {
        c.save(); c.translate(r.x, r.y);
        const tail = r.r * 3.2, g = c.createLinearGradient(0, -tail, 0, 0); g.addColorStop(0, 'rgba(255,170,60,0)'); g.addColorStop(1, 'rgba(255,200,90,.85)');
        c.fillStyle = g; c.beginPath(); c.moveTo(-r.r * .75, 0); c.lineTo(0, -tail); c.lineTo(r.r * .75, 0); c.closePath(); c.fill();
        c.fillStyle = '#b07850'; c.beginPath(); c.arc(0, 0, r.r, 0, TAU); c.fill(); c.fillStyle = '#8a5a3a'; for (const [x, y, rr] of [[-.4, -.2, .22], [.35, .3, .18], [.2, -.5, .14]]) { c.beginPath(); c.arc(x * r.r, y * r.r, rr * r.r, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-r.r * .3, -r.r * .4, r.r * .3, r.r * .14, -.5, 0, TAU); c.fill();
        art.face(c, r.r * .8, { mood: r.y > this.rimY - this.h * .3 ? 'wow' : 'happy', blink: r.face < .1 && r.face > 0 });
        c.restore();
      }
    }

    /* ---- raining cats and dogs ---- */
    showPetCounter() {
      this.petCounter = SPG.ui.counter(this.host, (c, s) => {
        c.fillStyle = '#ff8aa3'; c.beginPath(); c.ellipse(s / 2, s * .64, s * .22, s * .18, 0, 0, Math.PI * 2); c.fill();
        for (const [x, y] of [[.24, .4], [.4, .26], [.6, .26], [.76, .4]]) { c.beginPath(); c.ellipse(s * x, s * y, s * .09, s * .11, 0, 0, Math.PI * 2); c.fill(); }
      }, this.bag.pets);
      this.petCounter.el.classList.add('second');
    }

    // Sizes for the rescue crew and net (shared by drawing and the physics).
    netSizes() { return { sc: Math.max(12, Math.min(this.h * .045, this.w * .05, 38)), half: Math.max(70, Math.min(230, this.w * .17)) }; }
    startPets() {
      if (this.pets) return;
      const { sc, half } = this.netSizes(), pad = sc * 4.2;
      const nx = Math.max(half + pad, Math.min(this.w - half - pad, this.bucket.x));
      // the crew arrives by fire truck, hops out, and spreads the net (spread: 0 = folded up, 1 = open)
      this.pets = { phase: 'in', t: 0, t2: 0, spread: 0, list: [], spawned: 0, total: 12, caught: 0, nextIn: 1.4, doneT: 0, net: { x: nx, vx: 0, sag: this.h * .045, sagV: 0 } };
      if (!this.petCounter) this.showPetCounter();
      voice.say('raining-pets');
    }

    netGeom() {
      const P = this.pets, { sc, half } = this.netSizes(), y0 = this.groundY - 4.35 * sc, s = P.spread;
      return { sc, half, y0, x0: P.net.x - half * s, x1: P.net.x + half * s, base: this.h * .045, s };
    }

    // Where the fire truck is (null when it is not on screen).
    truckPos(P, u) {
      const stop = Math.max(6.8 * u, Math.min(this.w - 6.8 * u, P.net.x - 7.4 * u)), far = this.w + 8 * u, near = -8 * u, ease = x => 1 - (1 - x) * (1 - x);
      let x = null;
      if (P.phase === 'in') { const t = P.t2; x = t < 1.4 ? near + (stop - near) * ease(t / 1.4) : t < 1.9 ? stop : stop + (far - stop) * Math.pow(Math.min(1, (t - 1.9) / 1.5), 2); }
      else if (P.phase === 'board') { const t = P.t2; x = t < 1.4 ? near + (stop - near) * ease(t / 1.4) : stop; }
      else if (P.phase === 'out') x = stop + (far - stop) * Math.pow(Math.min(1, P.t2 / 2.0), 2);
      return x === null ? null : { x, stop };
    }

    // The two firefighters: riding on the truck, hopping on or off it, or holding the net.
    crewState(P, g, tp, u) {
      const sc = g.sc, base = [g.x0 - 2.25 * sc, g.x1 + 2.25 * sc], deck = tp ? [tp.x - 4.7 * u, tp.x - 2.5 * u] : base, mix = (a, b, k) => a + (b - a) * k;
      let mode = 'base', k = 0;
      if (P.phase === 'in') { if (P.t2 < 1.4) mode = 'ride'; else if (P.t2 < 1.9) { mode = 'hop'; k = (P.t2 - 1.4) / .5; } }
      else if (P.phase === 'board') { if (P.t2 >= 1.9) mode = 'ride'; else if (P.t2 >= 1.4) { mode = 'hop'; k = 1 - (P.t2 - 1.4) / .5; } }
      else if (P.phase === 'out') mode = 'ride';
      const moving = (P.phase === 'in' && P.t2 > 1.9 && P.spread < 1) || (P.phase === 'gather' && P.spread > 0);
      const walk = moving ? 1 : Math.min(1, Math.abs(P.net.vx) / (this.w * .3));
      return [0, 1].map(i => {
        const x = mode === 'ride' ? deck[i] : mode === 'hop' ? mix(base[i], deck[i], 1 - k) : base[i];
        return { kind: i ? 'fox' : 'bear', x, lift: mode === 'hop' ? Math.sin(k * Math.PI) * sc * 2.2 : 0, dir: mode === 'base' ? (i ? -1 : 1) : 1, walk: mode === 'base' ? walk : 0, wave: mode === 'ride' || P.phase === 'done' || (P.phase === 'gather' && P.t2 > 1.1) || (P.phase === 'board' && P.t2 < 1.4), o: i * 1.3 };
      });
    }

    spawnPet() {
      const P = this.pets, kind = Math.random() < .5 ? 'cat' : 'dog', i = Math.floor(Math.random() * 3);
      P.list.push({ kind, v: Math.floor(Math.random() * 4), color: Math.floor(Math.random() * 5), x: this.cloudX(i) + (Math.random() - .5) * 80 * this.cs, y: this.cloudY() + 30 * this.cs, vy: this.h * .05, vx: 0, s: Math.max(22, Math.min(this.h * .052, this.w * .085)), state: 'fall', t: Math.random() * 3, sway: Math.random() * 6, dir: 0 });
      P.spawned++; P.nextIn = 1.5 + Math.random() * .9;
    }

    landPet(q, caught) {
      q.state = 'walk'; q.vx = 0; q.vy = 0;
      if (!q.dir) q.dir = q.x < this.w / 2 ? -1 : 1;
      this.fx.burst(q.x, this.groundY - 6, 6, { colors: ['#fff', '#e8f4d8'], speed: 70, g: 40, life: .5, size: 7, up: 40 });
      if (!caught) sfx.tap();
    }

    updatePets(dt) {
      const P = this.pets, g = this.geomCache = this.netGeom(), pad = g.sc * 4.2;
      P.t += dt;
      const target = P.phase === 'play' ? Math.max(g.half + pad, Math.min(this.w - g.half - pad, this.bucket.tx)) : P.net.x, old = P.net.x;
      P.net.x += (target - P.net.x) * Math.min(1, dt * 9); P.net.vx = (P.net.x - old) / Math.max(dt, .001);
      P.net.sagV += (-(P.net.sag - g.base) * 90 - P.net.sagV * 9) * dt; P.net.sag += P.net.sagV * dt;
      const g2 = this.netGeom();
      if (P.phase === 'in') { P.t2 += dt; P.spread = Math.max(0, Math.min(1, (P.t2 - 1.9) / 1.2)); if (P.t2 >= 3.4) { P.phase = 'play'; P.spread = 1; } }
      else if (P.phase === 'play') {
        P.nextIn -= dt;
        if (P.spawned < P.total && P.nextIn <= 0) this.spawnPet();
        if (P.spawned >= P.total && !P.list.some(q => q.state === 'fall' || q.state === 'bounce')) {
          P.phase = 'done'; P.doneT = 0; store.addStars(2); this.bag.petEvents++; store.save(); sfx.win(); voice.say('pets-safe');
          this.fx.burst(this.w / 2, this.h * .4, 30, { colors: RAINBOW, speed: 420, g: 400, life: 1.3, size: 8, shape: 'confetti', up: 240 });
        }
      } else if (P.phase === 'done') { P.doneT += dt; if (P.doneT > 3) { P.phase = 'gather'; P.t2 = 0; } }
      else if (P.phase === 'gather') { P.t2 += dt; P.spread = Math.max(0, 1 - P.t2 / 1.2); if (P.t2 >= 1.5) { P.phase = 'board'; P.t2 = 0; } }   // the net folds up as they come together
      else if (P.phase === 'board') { P.t2 += dt; if (P.t2 >= 2.1) { P.phase = 'out'; P.t2 = 0; } }                                              // the truck comes back and they climb aboard
      else if (P.phase === 'out') { P.t2 += dt; if (P.t2 >= 2.0) { this.pets = null; this.bucketHide = 0; this.endEvent(true); return; } }                          // and they drive away together
      this.bucketHide = P.phase === 'in' ? Math.min(1, P.t2) : P.phase === 'out' ? Math.max(0, 1 - P.t2 / 1.2) : 1;
      const geo = g2, grav = this.h * .9;
      for (const q of P.list) {
        q.t += dt;
        if (q.state === 'fall') {
          q.vy = Math.min(this.h * .15, q.vy + this.h * .08 * dt); q.y += q.vy * dt; q.x += Math.sin(q.t * 1.8 + q.sway) * this.h * .1 * dt;
          const feet = q.y + q.s * 1.05, u = (q.x - geo.x0) / (geo.x1 - geo.x0);
          if (P.phase === 'play' && u > .05 && u < .95 && feet >= geo.y0 + 4 * P.net.sag * u * (1 - u)) {
            q.state = 'bounce'; q.dir = q.x < P.net.x ? -1 : 1; q.vx = q.dir * this.h * .3; q.vy = -this.h * .36;
            P.net.sagV += this.h * .55; sfx.boing();
            this.fx.burst(q.x, feet, 9, { colors: ['#ffd54a', '#fff', '#ff9db8'], shape: 'star', speed: 190, g: 200, life: .8, size: 8, up: 110 });
            P.caught++; this.bag.pets++; this.petCounter && this.petCounter.set(this.bag.pets); store.save();
            if (P.caught % 3 === 0) store.addStars(1);
            if (Math.random() < .4) voice.sound('critter/' + q.kind);
          } else if (feet >= this.groundY) { q.y = this.groundY - q.s * 1.05; this.landPet(q, false); }
        } else if (q.state === 'bounce') {
          q.vy += grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - .3 * dt;
          if (q.y + q.s * 1.05 >= this.groundY && q.vy > 0) { q.y = this.groundY - q.s * 1.05; this.landPet(q, true); }
        } else { // walk off calmly
          q.x += q.dir * this.h * .1 * dt; q.y = this.groundY - q.s * 1.05;
        }
      }
      P.list = P.list.filter(q => q.x > -q.s * 4 && q.x < this.w + q.s * 4);
    }

    drawPets(c) {
      const P = this.pets, g = this.netGeom(), sc = g.sc, gy = this.groundY, u = sc * .95;
      const tp = this.truckPos(P, u);
      if (tp) { c.save(); c.translate(tp.x, gy - 2); art.fireTruck(c, u, this.t, { roll: tp.x / (1.3 * u) }); c.restore(); }
      for (const m of this.crewState(P, g, tp, u)) {
        c.save(); c.translate(m.x, gy - m.lift); art.firefighter(c, m.kind, sc, this.t + m.o, { dir: m.dir, walk: m.walk, wave: m.wave }); c.restore();
      }
      if (g.s > .03) art.safetyNet(c, g.x0, g.x1, g.y0, P.net.sag * Math.min(1, g.s * 1.5), 26);
      for (const q of P.list) {
        c.save(); c.translate(q.x, q.y);
        if (q.state === 'walk' && q.dir < 0) c.scale(-1, 1);
        art.pet(c, q.kind, q.v, q.s, q.t, q.state === 'fall' ? 'fall' : q.state === 'bounce' ? 'bounce' : 'walk', q.color);
        c.restore();
      }
    }

    tick(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, .05); this.last = now; this.t += dt;
      const b = this.bucket; this.scenic.update(dt);
      if (this.keys.ArrowLeft) b.tx -= this.w * .9 * dt; if (this.keys.ArrowRight) b.tx += this.w * .9 * dt;
      b.tx = Math.max(this.bw * .4, Math.min(this.w - this.bw * .4, b.tx));
      b.x += (b.tx - b.x) * Math.min(1, dt * 14);
      this.spawnIn -= dt; if (this.spawnIn <= 0 && !this.pets && !this.met && !this.card) this.spawn();
      // events never overlap: one waits until nothing else is going on, the rainbow is gone and a rest has passed
      this.cool = Math.max(0, this.cool - dt); this.updateCard(dt);
      if (this.queue.length && !this.pets && !this.storm && !this.met && !this.card && this.rainbow <= .02 && this.cool <= 0) {
        const kind = this.queue.shift();
        this.showCard(kind, () => (kind === 'pets' ? this.startPets() : kind === 'meteor' ? this.startMeteors() : this.startStorm()));
      }
      if (this.storm) this.updateStorm(dt);
      if (this.met) this.updateMeteors(dt);
      for (const cr of this.craters) cr.life -= dt * .7; this.craters = this.craters.filter(cr => cr.life > 0);
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
      for (const b of this.bolts) b.life -= dt * 2.6;
      this.bolts = this.bolts.filter(b => b.life > 0);
      if (this.sunT > 0) this.sunT = Math.max(0, this.sunT - dt);
      for (let i = this.thunders.length - 1; i >= 0; i--) { this.thunders[i] -= dt; if (this.thunders[i] <= 0) { this.thunders.splice(i, 1); sfx.thunder(); } }
      if (this.pets) this.updatePets(dt);
      const rt = SPG.level.tier('rain'), speedK = rt === 3 ? 1.25 : rt === 1 ? .85 : 1, g = this.h * .22 * speedK, vmax = this.h * .46 * speedK;
      for (const d of this.drops) { d.vy = Math.min(vmax, d.vy + g * dt); d.y += d.vy * dt; d.blink -= dt; }
      this.drops = this.drops.filter(d => {
        if (this.bucketHide < .3 && d.y + d.r * .4 >= this.rimY && d.y <= this.rimY + this.bh * .35 && Math.abs(d.x - b.x) < this.bw * .5 - d.r * .3) { this.catchDrop(d); return false; }
        if (d.y >= this.groundY) { this.ripples.push({ x: d.x, y: this.groundY, life: 1 }); this.fx.burst(d.x, this.groundY, 3, { colors: ['#9be0ff'], speed: 90, g: 500, life: .35, size: 3, up: 120 }); return false; }
        return true;
      });
      for (const r of this.ripples) r.life -= dt * 1.4;
      this.ripples = this.ripples.filter(r => r.life > 0);
      if (this.moodT > 0) this.moodT -= dt;
      if (this.rainbow > 0) this.rainbow = Math.max(0, this.rainbow - dt / 4.5);
      if (this.newFlower > 0) this.newFlower = Math.max(0, this.newFlower - dt * .8);
      this.fx.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(this.tick);
    }

    draw() {
      const c = this.ctx, { w, h } = this;
      if (!w || !h) return;
      this.scenic.draw(c, w, h, this.t, { sun: false, clouds: false });
      c.fillStyle = 'rgba(150,175,205,.16)'; c.fillRect(0, 0, w, h);   // a rainy-day haze over whatever the place is
      // rainbow
      if (this.rainbow > 0) {
        const grow = Math.min(1, (1 - this.rainbow) * 4 + .05), fade = Math.min(1, this.rainbow * 2.2);
        c.save(); c.globalAlpha = fade * .85; c.lineCap = 'round';
        RAINBOW.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = w * .022; c.beginPath(); c.arc(w / 2, h * .84, w * (.42 - i * .021), Math.PI, Math.PI + Math.PI * grow); c.stroke(); });
        c.restore();
      }
      // storm: the sky goes a soft, friendly grey-blue
      const K = this.stormK();
      if (K > 0) { c.fillStyle = `rgba(88, 112, 160, ${(.3 * K).toFixed(3)})`; c.fillRect(0, 0, w, h); }
      if (this.sunT > 0) { c.save(); c.globalAlpha = Math.min(1, this.sunT, 1); art.sun(c, w * .84, h * .17, Math.min(48, w * .05), this.t); c.restore(); }
      // soft rain streaks (many more in a storm)
      c.strokeStyle = 'rgba(120,170,215,.28)'; c.lineWidth = 2; c.lineCap = 'round';
      for (let rep = 0; rep < (this.met ? 0 : 1 + Math.round(K * 2)); rep++) for (const s of this.streaks) { const y = ((s.y * h + this.t * h * (.5 + K * .3) * s.s + rep * h * .37) % h), x = ((s.x + rep * .31) % 1) * w; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 16 * s.s); c.stroke(); }
      // clouds
      for (let i = 0; i < 6; i++) {
        if (i >= 3 && K <= 0) break;
        const { x, y, s } = this.cloudPos(i);
        art.cloud(c, x, y, s, 1, K > 0 ? '#cdd8ea' : '#e3ecf7');
        c.save(); c.translate(x + 8 * s, y + 4 * s); art.face(c, 26 * s, { mood: this.flash > .4 ? 'wow' : this.rainbow > 0 || this.pets ? 'cheer' : 'happy', blink: Math.sin(this.t * .9 + i * 2) > .97 }); c.restore();
      }
      // lightning: a short, bright, cartoon zig-zag (never anything scary)
      for (const b of this.bolts) {
        c.save(); c.globalAlpha = Math.min(1, b.life * 1.6); c.lineJoin = c.lineCap = 'round';
        for (const [col, wd] of [['#ffe45e', b.w], ['#fffbe0', b.w * .4]]) { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); b.pts.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
        c.restore();
      }
      // drops
      for (const d of this.drops) { c.save(); c.translate(d.x, d.y); art.drop(c, d.r, { gold: d.gold, mood: d.y > this.rimY - this.h * .25 ? 'wow' : 'happy', blink: d.blink < .1 && d.blink > 0 }); c.restore(); }
      // meadow
      const n = Math.min(this.bag.flowers, 14);
      for (let i = 0; i < n; i++) {
        const x = this.w * (.06 + ((i * .618034) % 1) * .88), sz = this.h * (.13 + (i % 3) * .015);
        const pop = i === n - 1 && this.newFlower > 0 ? 1 - this.newFlower : 1;
        c.save(); c.translate(x, this.groundY + this.h * .02); c.scale(Math.min(1, pop * 1.4 + .01), Math.min(1, pop * 1.4 + .01));
        art.plant(c, art.PLANTS[i % 3].id, 3, sz, this.t + i);
        c.restore();
      }
      // puddle ripples
      c.lineWidth = 3;
      for (const r of this.ripples) { c.globalAlpha = r.life * .7; c.strokeStyle = '#6fbde8'; c.beginPath(); c.ellipse(r.x, r.y, (1 - r.life) * 46 + 6, (1 - r.life) * 12 + 2, 0, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
      if (this.met) this.drawMeteors(c);
      // bucket
      if (this.bucketHide < .98) {
        const by = this.rimY + this.bucketHide * this.h * .4, mood = this.moodT > 0 || this.rainbow > .5 ? 'cheer' : 'happy';
        // while the meteors fall she holds a glowing star net instead of the rain bucket
        if (this.met) art.catcher(c, this.bucket.x, by, this.bw, this.bh, this.t, mood, this.moodT > 0 ? 1 : 0); else art.bucket(c, this.bucket.x, by, this.bw, this.bh, this.fill, this.t, mood);
      }
      if (this.pets) this.drawPets(c);
      this.fx.draw(c);
      if (this.flash > 0) { c.fillStyle = `rgba(255, 255, 236, ${(this.flash * .28).toFixed(3)})`; c.fillRect(0, 0, w, h); }
      if (this.card) this.drawCard(c);
    }
  }

  SPG.games.push({
    id: 'rain', name: 'Rain Bucket', order: 3,
    icon(c, w, h) {
      art.scene(c, w, h, 6, { sky: ['#b7cfe8', '#d9eaf1', '#eef4e4'], showSun: false, clouds: false, hill: ['#b2daa0', '#9ccf8d', '#86c47f'] });
      const s = Math.min(w, h * 1.15);
      ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = s * .03; c.beginPath(); c.arc(w * .5, h * .95, s * (.6 - i * .034), Math.PI * 1.08, Math.PI * 1.92); c.stroke(); });
      art.cloud(c, w * .3, h * .2, s / 620, 1, '#e3ecf7'); c.save(); c.translate(w * .3 + 6, h * .2 + 3); art.face(c, s * .05); c.restore();
      art.cloud(c, w * .72, h * .16, s / 760, 1, '#e3ecf7');
      for (const [x, y, r] of [[.28, .46, .034], [.34, .64, .03], [.66, .42, .03], [.74, .58, .036]]) { c.save(); c.translate(w * x, h * y); art.drop(c, s * r); c.restore(); }
      c.save(); c.translate(w * .5, h * .66); c.rotate(0); art.bucket(c, 0, 0, s * .3, s * .24, .55, 1, 'cheer'); c.restore();
    },
    create: host => new RainGame(host)
  });
})();
