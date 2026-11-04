// Bunny Band: six animal friends, each with an instrument. Touch a friend to play. "Copy me" plays a little tune
// for her to play back (a wrong note just plays it again, nothing is ever lost), and the red button records a
// short tune and plays it round and round.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const INK = '#5a3f5e';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // species (drawn by SPG.pets), instrument, and the note of the scale each one plays
  const BAND = [
    { sp: 'bunny', inst: 'drum', note: 0, col: '#ff8aa3' }, { sp: 'bear', inst: 'horn', note: 1, col: '#ffb45e' },
    { sp: 'cat', inst: 'xylo', note: 2, col: '#ffd54a' }, { sp: 'fox', inst: 'flute', note: 3, col: '#7fd4f5' },
    { sp: 'frog', inst: 'bell', note: 5, col: '#a6e05a' }, { sp: 'panda', inst: 'piano', note: 4, col: '#b58cf0' }
  ];
  const REC_MAX = 10;
  const copyMax = () => [0, 3, 5, 7][SPG.level.tier('band')];   // the longest tune to copy, by age tier

  // little instruments, drawn in front of a friend. (0, 0) = the friend's feet, u = friend height / 10.
  function instrument(c, kind, u, hit) {
    c.save(); c.lineCap = c.lineJoin = 'round';
    const sq = 1 + hit * .08;
    if (kind === 'drum') {
      c.translate(0, -u * 2.2); c.scale(sq, 1 / sq);
      c.fillStyle = '#ff6b81'; art.rr(c, -u * 1.6, 0, u * 3.2, u * 2, u * .3); c.fill();
      c.fillStyle = '#fff3d6'; c.beginPath(); c.ellipse(0, 0, u * 1.6, u * .5, 0, 0, TAU); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = u * .16; c.beginPath(); for (let i = -1; i <= 1; i++) { c.moveTo(i * u * .9, u * .35); c.lineTo(i * u * .6 + u * .3, u * 1.9); } c.stroke();
      c.strokeStyle = '#b9805a'; c.lineWidth = u * .22; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * u * .5, -u * .25); c.lineTo(s * u * (1.2 + hit * .3), -u * (1.5 - hit * 1.1)); c.stroke(); }
    } else if (kind === 'xylo') {
      c.translate(0, -u * 1.8);
      ['#ff6b81', '#ffa64d', '#ffd54a', '#7ed957', '#5cc8f2'].forEach((col, i) => { const w = u * (2.6 - i * .3); c.fillStyle = col; art.rr(c, -w / 2, i * u * .38 - u * .3 + (hit && i === 2 ? u * .05 : 0), w, u * .32, u * .1); c.fill(); });
      c.strokeStyle = '#b9805a'; c.lineWidth = u * .2; c.beginPath(); c.moveTo(u * 1.1, -u * .3); c.lineTo(u * (1.5 + hit * .2), -u * (1.4 - hit * 1.2)); c.stroke();
    } else if (kind === 'horn') {
      c.translate(u * .2, -u * 3.9); c.rotate(-.08 - hit * .06);
      c.strokeStyle = '#f2b632'; c.lineWidth = u * .42; c.beginPath(); c.moveTo(-u * .9, 0); c.lineTo(u * 1.6, 0); c.stroke();
      c.fillStyle = '#f2b632'; c.beginPath(); c.moveTo(u * 1.4, -u * .25); c.lineTo(u * 2.6, -u * .95); c.lineTo(u * 2.6, u * .95); c.lineTo(u * 1.4, u * .25); c.closePath(); c.fill();
      c.fillStyle = '#ffe08a'; c.beginPath(); c.ellipse(u * 2.6, 0, u * .28, u * .95, 0, 0, TAU); c.fill();
    } else if (kind === 'flute') {
      c.translate(-u * .1, -u * 4.5); c.rotate(.12);
      c.fillStyle = '#7fd4f5'; art.rr(c, -u * 2, -u * .22, u * 4, u * .44, u * .2); c.fill();
      c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-u * .2 + i * u * .55, 0, u * .09, 0, TAU); c.fill(); }
    } else if (kind === 'bell') {
      c.translate(u * 1.3, -u * (3.7 - hit * .4)); c.rotate(Math.sin(hit * 30) * .25 * hit);
      c.strokeStyle = '#b9805a'; c.lineWidth = u * .28; c.beginPath(); c.moveTo(0, -u * 1.1); c.lineTo(0, -u * .2); c.stroke();
      c.fillStyle = '#f2b632'; c.beginPath(); c.moveTo(-u * .5, -u * .2); c.quadraticCurveTo(-u * .55, u * .9, -u * .9, u * 1.05); c.lineTo(u * .9, u * 1.05); c.quadraticCurveTo(u * .55, u * .9, u * .5, -u * .2); c.closePath(); c.fill();
      c.fillStyle = '#c98b15'; c.beginPath(); c.arc(0, u * 1.15, u * .22, 0, TAU); c.fill();
    } else {   // piano
      c.translate(0, -u * 1.9);
      c.fillStyle = '#5a3f5e'; art.rr(c, -u * 2, -u * .3, u * 4, u * 1.7, u * .25); c.fill();
      c.fillStyle = '#fff'; art.rr(c, -u * 1.8, u * .05, u * 3.6, u * 1.2, u * .12); c.fill();
      c.strokeStyle = '#d9d2e0'; c.lineWidth = u * .05; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * u * .45, u * .05); c.lineTo(i * u * .45, u * 1.25); c.stroke(); }
      c.fillStyle = '#5a3f5e'; for (const i of [-2.5, -1.5, .5, 1.5, 2.5]) c.fillRect(i * u * .45 - u * .12, u * .05, u * .24, u * .7);
    }
    c.restore();
  }

  class BandGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('band', () => ({ tunes: 0, wins: 0 }));
      this.bag.tunes = this.bag.tunes || 0; this.bag.wins = this.bag.wins || 0;
      this.counter = SPG.ui.counter(host, (c, s) => { c.fillStyle = '#b58cf0'; c.font = `700 ${s * .8}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♫', s / 2, s * .54); }, this.bag.tunes);
      this.fx = new art.Fx(); this.notes = [];
      this.t = 0; this.running = false;
      this.mem = BAND.map(() => ({ hit: 0, glow: 0, shake: 0, hop: 0 }));
      this.copy = null; this.rec = { state: 'off', ev: [], t0: 0 }; this.loop = null;
      this.idle = 0; this.tick = this.tick.bind(this);
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
      const wide = this.w >= this.h * 1.1; this.wide = wide;
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      const cols = wide ? 6 : 3, cellW = this.w * .94 / cols;
      this.s = Math.min(cellW * 1.15, this.h * (wide ? .46 : .24));
      this.pos = BAND.map((_, i) => {
        const col = wide ? i : i % 3, row = wide ? 0 : Math.floor(i / 3);
        return { x: this.w * .03 + (col + .5) * cellW, y: wide ? this.h * .74 : this.h * (.5 + row * .25) };
      });
      const bs = 40 * this.ui + 18; this.bs = bs;
      this.btn = { copy: { x: this.w / 2 - bs * 1.3, y: this.h - bs * .95 }, rec: { x: this.w / 2 + bs * 1.3, y: this.h - bs * .95 } };
      this.draw();
    }
    start() { this.resize(); this.resume(); voice.say('band-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }

    /* ---------------------------------------------------------------- playing */
    play(i, byHand) {
      const b = BAND[i], m = this.mem[i], now = performance.now();
      // the same friend struck again within a blink (five fingers mashing) only hops: its notes would pile up into dozens of sounds at once
      if (!(now - m.at < 110)) { m.at = now; sfx.instrument(b.inst, b.note, .2); }
      m.hit = 1; m.hop = 1;
      const p = this.pos[i];
      this.notes.push({ x: p.x + (Math.random() - .5) * this.s * .4, y: p.y - this.s * 1.05, vy: -this.s * .55, life: 1, col: b.col, ch: Math.random() < .5 ? '♪' : '♫' });
      this.fx.burst(p.x, p.y - this.s * .6, 4, { colors: [b.col, '#fff'], speed: 90, g: 200, life: .5, size: 4 * this.ui, shape: 'star', up: 80 });
      if (byHand) {
        this.idle = 0;
        if (this.rec.state === 'rec') { this.rec.ev.push({ t: this.t - this.rec.t0, i }); if (this.rec.ev.length >= 16) this.stopRecording(); }
      }
    }
    hitAt(x, y) {
      for (let i = BAND.length - 1; i >= 0; i--) { const p = this.pos[i]; if (Math.hypot(x - p.x, y - (p.y - this.s * .45)) < this.s * .6) return i; }
      return -1;
    }
    press(x, y) {
      SPG.audio.unlock();
      const near = b => Math.hypot(x - b.x, y - b.y) < this.bs * .8;
      if (near(this.btn.copy)) { sfx.tap(); this.copy ? this.stopCopy() : this.startCopy(); return; }
      if (near(this.btn.rec)) { sfx.tap(); this.pressRecord(); return; }
      const i = this.hitAt(x, y);
      if (i < 0) return;
      if (this.copy && this.copy.state === 'listen') return;   // wait for the tune to finish
      this.play(i, true);
      if (this.copy && this.copy.state === 'echo') this.copyTap(i);
    }

    /* ---------------------------------------------------------------- copy me */
    startCopy() {
      this.stopLoop();
      this.copy = { state: 'pause', t: .5, len: 2, seq: [], step: 0, ok: 0, wins: 0 };
      voice.say('band-copy');
    }
    stopCopy() { this.copy = null; this.mem.forEach(m => { m.glow = 0; }); }
    newTune() {
      const c = this.copy, seq = [];
      for (let k = 0; k < c.len; k++) { let n; do { n = Math.floor(Math.random() * BAND.length); } while (k && n === seq[k - 1]); seq.push(n); }
      Object.assign(c, { seq, state: 'listen', step: 0, t: .5, ok: 0 });
    }
    copyTap(i) {
      const c = this.copy;
      if (i === c.seq[c.ok]) {
        c.ok++;
        if (c.ok >= c.seq.length) {
          c.state = 'cheer'; c.t = 1.6; c.wins++;
          this.bag.wins++; if (this.bag.wins % 2 === 0) store.addStars(1);
          this.bag.tunes++; this.counter.set(this.bag.tunes); store.save();
          sfx.win(); this.mem.forEach(m => { m.hop = 1; });
          this.fx.burst(this.w / 2, this.h * .3, 22, { colors: BAND.map(b => b.col), speed: 300, g: 380, life: 1.2, size: 7 * this.ui, shape: 'star', up: 180 });
          if (Math.random() < .6) voice.praise();
          c.len = Math.min(copyMax(), c.len + 1);
        }
      } else {   // nothing is lost: everyone gently shakes and the tune plays again
        this.mem.forEach(m => { m.shake = 1; });
        c.state = 'pause'; c.t = 1.1; c.next = 'again';
      }
    }
    updateCopy(dt) {
      const c = this.copy; if (!c) return;
      c.t -= dt;
      if (c.state === 'pause' && c.t <= 0) { if (c.next === 'again') { c.next = null; Object.assign(c, { state: 'listen', step: 0, t: .5, ok: 0 }); } else this.newTune(); }
      else if (c.state === 'listen' && c.t <= 0) {
        if (c.step >= c.seq.length) { c.state = 'echo'; c.t = 0; c.ok = 0; }
        else { const i = c.seq[c.step++]; this.play(i, false); this.mem[i].glow = 1; c.t = .75; }
      } else if (c.state === 'cheer' && c.t <= 0) { c.state = 'pause'; c.t = .4; }
    }

    /* ---------------------------------------------------------------- record and loop */
    pressRecord() {
      if (this.copy) this.stopCopy();
      const r = this.rec;
      if (this.loop) { this.stopLoop(); return; }
      if (r.state === 'off') { r.state = 'rec'; r.ev = []; r.t0 = this.t; voice.say('band-song'); }
      else if (r.state === 'rec') this.stopRecording();
    }
    stopRecording() {
      const r = this.rec; r.state = 'off';
      if (!r.ev.length) return;
      const len = Math.max(2.2, r.ev[r.ev.length - 1].t + 1);
      this.loop = { ev: r.ev.slice(), len, t0: this.t, next: 0 };
      this.bag.tunes++; this.counter.set(this.bag.tunes); store.save(); sfx.chime();
    }
    stopLoop() { this.loop = null; }
    updateLoop() {
      const L = this.loop; if (!L) return;
      let pos = this.t - L.t0;
      if (pos >= L.len) { L.t0 += L.len; pos -= L.len; L.next = 0; }
      while (L.next < L.ev.length && L.ev[L.next].t <= pos) { this.play(L.ev[L.next].i, false); L.next++; }
    }

    /* ---------------------------------------------------------------- loop */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.idle += dt;
      this.updateCopy(dt); this.updateLoop();
      if (this.rec.state === 'rec' && this.t - this.rec.t0 > REC_MAX) this.stopRecording();
      for (const m of this.mem) { m.hit = Math.max(0, m.hit - dt * 3); m.hop = Math.max(0, m.hop - dt * 2.4); m.glow = Math.max(0, m.glow - dt * 1.6); m.shake = Math.max(0, m.shake - dt * 2); }
      for (const n of this.notes) { n.y += n.vy * dt; n.life -= dt * .9; }
      this.notes = this.notes.filter(n => n.life > 0);
      this.fx.update(dt);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---------------------------------------------------------------- drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      // backdrop: a warm stage with curtains
      // every few tunes the band plays somewhere new: the theatre, then a beach, a meadow, the snow, the night sky
      const STAGES = [{ floor: '#d99a6c', curtain: '#ff8aa3' }, { scene: 'beach', floor: '#e6c98e', curtain: '#3fb4d8' }, { scene: 'meadow', floor: '#a4d68f', curtain: '#59b96e' }, { scene: 'snow', floor: '#e8f1fa', curtain: '#7fa8d8' }, { scene: 'night', floor: '#5a5aa0', curtain: '#8a6ad9' }];
      const st = STAGES[Math.floor((this.bag.tunes || 0) / 3) % STAGES.length];
      if (st.scene) SPG.scenery.draw(c, w, h, this.t, st.scene, { clouds: false });
      else { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe3f0'); g.addColorStop(.6, '#fff1dc'); g.addColorStop(1, '#ffd9c2'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
      if (!st.scene) for (let i = 0; i < 3; i++) { const x = w * (.2 + i * .3); const sp = c.createRadialGradient(x, 0, 0, x, 0, h * .75); sp.addColorStop(0, 'rgba(255,255,255,.55)'); sp.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sp; c.beginPath(); c.moveTo(x - 20, 0); c.lineTo(x + 20, 0); c.lineTo(x + h * .35, h * .8); c.lineTo(x - h * .35, h * .8); c.fill(); }
      const floorTop = this.wide ? h * .68 : h * .44;
      c.fillStyle = st.floor; c.fillRect(0, floorTop, w, h - floorTop);
      c.fillStyle = 'rgba(255,255,255,.12)'; for (let y = floorTop + 18; y < h; y += 34) c.fillRect(0, y, w, 4);
      c.fillStyle = 'rgba(90,63,94,.14)'; c.fillRect(0, floorTop, w, 8);
      for (const side of [0, 1]) {   // curtains
        c.save(); if (side) { c.translate(w, 0); c.scale(-1, 1); }
        const cw = w * .07; c.fillStyle = st.curtain; c.beginPath(); c.moveTo(0, 0); c.lineTo(cw, 0); c.quadraticCurveTo(cw * .4, h * .3, cw * 1.05, floorTop); c.lineTo(0, floorTop); c.fill();
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(cw * .3, 0, cw * .12, floorTop * .9);
        c.restore();
      }
      c.fillStyle = st.curtain; c.fillRect(0, 0, w, h * .045); c.fillStyle = '#ffd54a'; for (let x = w * .03; x < w; x += w * .06) { c.beginPath(); c.arc(x, h * .045, h * .012, 0, TAU); c.fill(); }
      const act = SPG.pets.active();
      // friends, back row first
      const order = BAND.map((_, i) => i).sort((a, b) => this.pos[a].y - this.pos[b].y);
      for (const i of order) {
        const b = BAND[i], m = this.mem[i], p = this.pos[i], s = this.s;
        c.save(); c.translate(p.x + Math.sin(m.shake * 30) * m.shake * s * .04, p.y);
        if (m.glow > 0) { const gl = c.createRadialGradient(0, -s * .5, 0, 0, -s * .5, s * .8); gl.addColorStop(0, b.col + 'cc'); gl.addColorStop(1, b.col + '00'); c.fillStyle = gl; c.globalAlpha = m.glow; c.beginPath(); c.arc(0, -s * .5, s * .8, 0, TAU); c.fill(); c.globalAlpha = 1; }
        const own = act && act.id === b.sp;
        SPG.pets.draw(c, b.sp, s, this.t + i, { mood: m.hit > .1 || m.glow > .2 ? 'cheer' : 'happy', hop: m.hop > 0 ? 1 - m.hop : 0, hat: own ? act.hat : null, face: own ? act.face : null, neck: own ? act.neck : null });
        instrument(c, b.inst, s / 10, m.hit);
        if (own) { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, s * .1, s * .08, 0, TAU); c.fill(); art.star(c, 0, s * .1, s * .06, '#ffd54a', 0); }
        c.restore();
      }
      // floating notes and sparkles
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const n of this.notes) { c.globalAlpha = Math.min(1, n.life * 1.6); c.fillStyle = n.col; c.font = `700 ${this.s * .3}px Fredoka, system-ui`; c.fillText(n.ch, n.x, n.y); }
      c.globalAlpha = 1;
      this.fx.draw(c);
      this.drawButtons(c);
    }
    drawButtons(c) {
      const bs = this.bs, cp = this.btn.copy, rc = this.btn.rec;
      const circle = (b, col, edge) => { c.fillStyle = edge; c.beginPath(); c.arc(b.x, b.y + 6, bs * .7, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, bs * .7, 0, TAU); c.fill(); };
      // copy me: a note with two little arrows
      const on = !!this.copy, lis = on && this.copy.state === 'listen';
      c.save(); const k = lis ? 1 + Math.sin(this.t * 10) * .05 : 1; c.translate(cp.x, cp.y); c.scale(k, k); c.translate(-cp.x, -cp.y);
      circle(cp, on ? '#59b96e' : '#7ed957', '#3c9a55');
      c.fillStyle = '#fff'; c.font = `700 ${bs * 1.05}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♫', cp.x, cp.y + bs * .05);
      c.restore();
      if (on) {   // how far along the tune she is
        const n = this.copy.seq.length || this.copy.len;
        for (let i = 0; i < n; i++) { c.fillStyle = i < (this.copy.state === 'echo' || this.copy.state === 'cheer' ? this.copy.ok : 0) ? '#59b96e' : 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(cp.x + (i - (n - 1) / 2) * bs * .34, cp.y - bs * 1.05, bs * .12, 0, TAU); c.fill(); }
      }
      // record / loop
      const r = this.rec.state, lp = !!this.loop;
      const pulse = r === 'rec' ? 1 + Math.sin(this.t * 8) * .06 : 1;
      c.save(); c.translate(rc.x, rc.y); c.scale(pulse, pulse); c.translate(-rc.x, -rc.y);
      circle(rc, lp ? '#5cb4f0' : '#ff5f6d', lp ? '#3c86c0' : '#c9404c');
      c.fillStyle = '#fff';
      if (lp) art.rr(c, rc.x - bs * .26, rc.y - bs * .26, bs * .52, bs * .52, bs * .1), c.fill();
      else if (r === 'rec') art.rr(c, rc.x - bs * .24, rc.y - bs * .24, bs * .48, bs * .48, bs * .08), c.fill();
      else { c.beginPath(); c.arc(rc.x, rc.y, bs * .3, 0, TAU); c.fill(); }
      c.restore();
      if (r === 'rec') { c.strokeStyle = '#fff'; c.lineWidth = bs * .1; c.beginPath(); c.arc(rc.x, rc.y, bs * .55, -Math.PI / 2, -Math.PI / 2 + TAU * clamp((this.t - this.rec.t0) / REC_MAX, 0, 1)); c.stroke(); }
      if (lp) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = bs * .09; const a = this.t * 2.5; c.beginPath(); c.arc(rc.x, rc.y, bs * .52, a, a + Math.PI * 1.3); c.stroke(); }
    }
  }

  SPG.games.push({
    id: 'band', name: 'Bunny Band', order: 8,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe3f0'); g.addColorStop(1, '#fff1dc'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const s = Math.min(w * .38, h * .62);
      c.fillStyle = '#d99a6c'; c.fillRect(0, h * .78, w, h * .22);
      [['bunny', .2, 'drum'], ['cat', .5, 'xylo'], ['bear', .8, 'horn']].forEach(([sp, fx, inst]) => { c.save(); c.translate(w * fx, h * .98); SPG.pets.draw(c, sp, s, 1, { mood: 'cheer' }); instrument(c, inst, s / 10, 0); c.restore(); });
      c.fillStyle = '#b58cf0'; c.font = `700 ${h * .26}px Fredoka, system-ui`; c.textAlign = 'center'; c.fillText('♪', w * .3, h * .3); c.fillStyle = '#ff8aa3'; c.fillText('♫', w * .7, h * .24);
    },
    create: host => new BandGame(host)
  });
})();
