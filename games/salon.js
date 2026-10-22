// Hair Salon (opened from the Hair tab of the Style Studio): pick one of eight messy hairstyles, then tidy it up with kid scissors,
// a brush, a spray bottle and a hair dryer. The hair is real strands (js/hair.js): the scissors cut what they cross (the snipped ends
// fall away), the brush smooths strands and pulls out knots and stray hairs, a wet head brushes out much more easily, and the dryer
// dries it again. When she is done the cut is saved and can be worn in the dress-up like any other hairstyle.
// Everything is drawn on one canvas; buttons are pictures only.
(() => {
  const SPG = window.SPG, { art, sfx, store, voice, people: P, hair: H } = SPG, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const T0 = 2.416;   // a moment when the figure is not blinking or swaying
  const TOOLS = ['scissors', 'brush', 'spray', 'dryer'];
  const KINDS_SHOWN = 8;

  class Salon {
    // opts: { look, onSave(data, hairCol), onClose() }
    constructor(host, opts) {
      this.host = host; this.opts = opts; this.look = Object.assign({}, opts.look, { hat: null, hair: 'cut:live' });
      this.root = document.createElement('div'); this.root.className = 'salon';
      this.cv = document.createElement('canvas'); this.cv.className = 'salon-cv'; this.root.append(this.cv); host.append(this.root);
      this.ctx = this.cv.getContext('2d');
      this.mode = 'pick'; this.tool = 'scissors'; this.hair = null; this.hairCol = this.look.hairCol; this.cards = []; this.pieces = []; this.mist = []; this.undo = []; this.fx = new art.Fx();
      this.t = 0; this.hold = null; this.snipT = 0; this.snipPhase = 0; this.sprayT = 0; this.brushT = 0; this.blowT = 0; this.praised = false; this.best = 0; this.running = false;
      this.tick = this.tick.bind(this);
      const at = e => { const r = this.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      this.cv.addEventListener('pointerdown', e => { e.preventDefault(); try { this.cv.setPointerCapture(e.pointerId); } catch (_) { /* optional */ } SPG.audio.unlock(); const p = at(e); this.press(p.x, p.y, e.pointerId); });
      this.cv.addEventListener('pointermove', e => { if (this.hold && this.hold.id === e.pointerId) { e.preventDefault(); const p = at(e); this.hold.x = p.x; this.hold.y = p.y; } });
      for (const n of ['pointerup', 'pointercancel']) this.cv.addEventListener(n, e => { if (this.hold && this.hold.id === e.pointerId) this.release(); });
      this.cv.addEventListener('contextmenu', e => e.preventDefault());
      if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.root); }
      SPG.salon.cur = this;   // for tests
      this.deal(); this.resize(); this.start();
    }
    probe() {
      const h = this.hair;
      return { mode: this.mode, tool: this.tool, w: this.w, h: this.h, cards: this.cards.map(c => ({ x: c.x, y: c.y, s: c.s, kind: c.kind })), btns: this.btns, closeBtn: this.closeBtn, shuf: this.shuf, hc: this.headC(), R: this.headR(),
        neat: h ? H.neat(h) : null, cuts: h ? h.cuts : 0, knots: h ? H.knots(h) : 0, fly: h ? H.flyaways(h) : 0, strands: h ? h.strands.length : 0, wet: h ? H.wetness(h) : 0, pieces: this.pieces.length, undo: this.undo.length, brushed: h ? h.brushed : 0 };
    }
    start() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.hold = null; }
    close() { this.pause(); this.ro && this.ro.disconnect(); delete P.cuts.live; this.cards.forEach((c, i) => delete P.cuts['pk' + i]); this.root.remove(); this.opts.onClose && this.opts.onClose(); }

    /* ------------------------------------------------------------ layout */
    resize() {
      const r = this.cv.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const d = SPG.ui.dpr();
      this.cv.width = Math.round(this.w * d); this.cv.height = Math.round(this.h * d); this.ctx.setTransform(d, 0, 0, d, 0, 0); this.d = d;
      const wide = this.wide = this.w >= this.h * 1.1;
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4); this.bs = 38 * this.ui + 20;
      const bs = this.bs;
      const short = this.h < 520;   // a phone on its side: the tools go in two columns so they do not overlap
      this.br = bs * .72;
      if (wide) {   // tools down the left, undo and done on the right; the top corners belong to the home button and the star count
        const sp = Math.min(bs * 1.75, (this.h - bs * 4.2) / 4);
        this.btns = short ? TOOLS.map((id, i) => ({ id, x: bs * .9 + (i % 2) * bs * 1.6, y: this.h * .42 + (Math.floor(i / 2) - .5) * bs * 1.6 })) : TOOLS.map((id, i) => ({ id, x: bs * .95, y: this.h * .46 + (i - 1.5) * sp }));
        this.btns.push({ id: 'undo', x: this.w - bs * .95, y: this.h * .5 - bs * .95 }, { id: 'done', x: this.w - bs * .95, y: this.h * .5 + bs * 1.05, big: true }, { id: 'close', x: bs * .85, y: this.h - bs * .85 });
      } else {   // tools along the bottom, the other three above them
        const sp = Math.min(bs * 1.9, (this.w - bs) / 4), y2 = this.h - bs * 2.9;
        this.br = Math.min(bs * .72, sp * .47);
        this.btns = TOOLS.map((id, i) => ({ id, x: this.w / 2 + (i - 1.5) * sp, y: this.h - bs * .95 }));
        this.btns.push({ id: 'undo', x: this.w * .62, y: y2 }, { id: 'done', x: this.w - bs * .95, y: y2, big: true }, { id: 'close', x: bs * .85, y: y2 });
      }
      this.rad = this.mode === 'edit' ? this.headR() : 1;
      this.layoutCards(); this.renderCards();
    }
    // the head: big enough to cut precisely, with room above for hair that stands up and below for hair that hangs down to the waist
    headR() { return this.wide ? Math.min(this.h * .195, this.w * .2) : Math.min(this.w * .26, this.h * .15); }
    headC() { return { x: this.w * .5, y: this.headR() * 2.3 + (this.wide ? this.h * .01 : 0) }; }
    layoutCards() {
      const n = this.cards.length, wide = this.wide, cols = wide ? 4 : 2, rows = Math.ceil(n / cols), pad = this.bs * .35, top = this.bs * 1.9, bot = this.bs * (wide ? .5 : 2.0);
      const aw = this.w - pad * 2 - (wide ? this.bs * 2.2 : 0), ah = this.h - top - bot, cw = aw / cols, ch = ah / rows, s = Math.min(cw, ch) - pad;
      this.cards.forEach((c, i) => { const cx = pad + (wide ? this.bs * 1.1 : 0) + (i % cols + .5) * cw, cy = top + (Math.floor(i / cols) + .5) * ch; c.x = cx - s / 2; c.y = cy - s / 2; c.s = s; });
      this.shuf = { x: wide ? this.w - this.bs * .95 : this.w / 2, y: wide ? this.h * .5 : this.h - this.bs * .95 };
      this.closeBtn = { x: this.bs * .85, y: this.h - this.bs * .85 };
    }

    /* ------------------------------------------------------------ the eight messy styles */
    deal() {
      const kinds = H.KINDS.slice().sort(() => Math.random() - .5).slice(0, KINDS_SHOWN), cols = P.HAIRC.map((_, i) => i).filter(i => P.HAIRC[i] !== 'rainbow').sort(() => Math.random() - .5);
      this.cards.forEach((c, i) => delete P.cuts['pk' + i]);
      this.cards = kinds.map((k, i) => ({ kind: k, hair: H.generate(k), col: cols[i % cols.length], x: 0, y: 0, s: 0, img: null }));
      this.cards.forEach((c, i) => { P.cuts['pk' + i] = c.hair; });
      if (this.w) { this.layoutCards(); this.renderCards(); }
    }
    renderCards() {
      for (const c of this.cards) {
        const px = Math.max(60, Math.round(c.s * this.d)); if (!c.s) continue;
        const cv = c.img && c.img.width === px ? c.img : (c.img = document.createElement('canvas')); cv.width = cv.height = px;
        const g = cv.getContext('2d'), U = px / 66;   // the head and the hair around it fill the card
        const look = Object.assign({}, this.look, { hair: 'cut:pk' + this.cards.indexOf(c), hairCol: c.col });
        g.clearRect(0, 0, px, px); g.save(); g.beginPath(); g.rect(0, 0, px, px); g.clip(); g.translate(px / 2, px * .44 + 73 * U); P.draw(g, look, 100 * U, T0); g.restore();
      }
    }

    /* ------------------------------------------------------------ input */
    press(x, y, id) {
      const near = (b, r) => Math.hypot(x - b.x, y - b.y) < r;
      if (this.mode === 'pick') {
        if (near(this.closeBtn, this.bs * .85)) { sfx.tap(); this.close(); return; }
        if (near(this.shuf, this.bs * .85)) { sfx.rustle(); this.deal(); return; }
        for (const c of this.cards) if (x > c.x && x < c.x + c.s && y > c.y && y < c.y + c.s) { this.choose(c); return; }
        return;
      }
      for (const b of this.btns) if (near(b, b.big ? this.bs * .95 : this.br * 1.15)) { this.button(b.id); return; }
      this.hold = { id, x, y, lx: x, ly: y, down: this.t };
      if (this.tool === 'scissors' || this.tool === 'brush') this.pushUndo();   // spraying and drying only change how wet it is
      if (this.tool === 'scissors') { this.snipNow(this.local(x, y), this.local(x, y), true); }
      if (this.tool === 'spray') sfx.spray();
    }
    release() { this.hold = null; }
    button(id) {
      if (TOOLS.includes(id)) { this.tool = id; sfx.tap(); const k = { brush: 'comb', scissors: null, spray: 'spray', dryer: 'dryer' }[id]; if (k && voice.LINES['style/tool-' + k]) voice.say('style/tool-' + k); return; }
      if (id === 'undo') { if (this.undo.length) { this.hair = H.unpack(this.undo.pop()); P.cuts.live = this.hair; sfx.undo(); } else sfx.tap(); return; }
      if (id === 'close') {   // going back keeps her work: the card she picked now shows the hair as she left it, so one stray tap loses nothing
        const c = this.card; if (c && this.cards.includes(c) && this.undo.length) { c.hair = this.hair; P.cuts['pk' + this.cards.indexOf(c)] = c.hair; }
        sfx.tap(); this.mode = 'pick'; this.hair = null; delete P.cuts.live; this.pieces = []; this.resize(); return; }
      if (id === 'done') this.finish();
    }
    choose(c) {
      sfx.chime(); this.mode = 'edit'; this.card = c; this.hair = H.clone(c.hair); P.cuts.live = this.hair; this.hairCol = c.col; this.look.hairCol = c.col; this.undo = []; this.pieces = []; this.mist = []; this.best = 0; this.praised = false; this.tool = 'scissors'; this.resize();
    }
    pushUndo() { this.undo.push(H.pack(this.hair)); if (this.undo.length > 14) this.undo.shift(); }
    local(x, y) { const c = this.headC(), R = this.headR(); return [(x - c.x) / R, (y - c.y) / R]; }
    finish() {
      const neat = H.neat(this.hair), changed = (this.hair.cuts | 0) > 0 || (this.hair.brushed || 0) > .3;
      this.hair.strands.forEach(s => { s.w = 0; s.v++; });   // it dries before it is saved
      this.opts.onSave && this.opts.onSave(H.pack(this.hair), this.hairCol);
      if (changed && neat > .4) { store.addStars(1); sfx.win(); voice.praise(); } else sfx.chime();
      this.close();
    }

    /* ------------------------------------------------------------ the tools at work */
    snipNow(a, b, tap) {
      let ax = a[0], ay = a[1], bx = b[0], by = b[1];
      if (Math.hypot(bx - ax, by - ay) < .16) { ax -= .14; bx += .14; ay = by = (ay + by) / 2; }   // a tap snips a little line across the strands under the blades
      const pieces = H.cut(this.hair, ax, ay, bx, by);
      sfx.snip(); this.snipPhase = 1;
      for (const p of pieces) this.pieces.push(H.piece(p, 0));
      if (this.pieces.length > 60) this.pieces.splice(0, this.pieces.length - 60);
      if (pieces.length) { const c = this.headC(), R = this.headR(); this.fx.burst(c.x + bx * R, c.y + by * R, 2, { colors: ['#fff', '#ffe9f3'], speed: 70, g: 120, life: .5, size: 3 * this.ui + 1 }); }
    }
    update(dt) {
      this.t += dt; H.tick(this.hair || { strands: [] }, dt);
      this.snipPhase = Math.max(0, this.snipPhase - dt * 7);
      this.pieces = H.updatePieces(this.pieces, dt);
      for (const m of this.mist) { m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 1 - dt * 1.5; m.vy *= 1 - dt * 1.5; m.r += dt * 26; m.life -= dt * 1.5; }
      this.mist = this.mist.filter(m => m.life > 0);
      this.fx.update(dt);
      this.sway = null;
      const h = this.hold; if (this.mode !== 'edit' || !this.hair) return;
      if (h) {
        const A = this.local(h.lx, h.ly), B = this.local(h.x, h.y), moved = Math.hypot(B[0] - A[0], B[1] - A[1]), c = this.headC(), R = this.headR();
        if (this.tool === 'scissors') {
          this.snipT -= dt;
          if (moved > .02 && this.snipT <= 0) { this.snipT = .11; this.snipNow(this.snipFrom || A, B); this.snipFrom = B; }
          if (moved <= .02 && !this.snipFrom) this.snipFrom = B;
        } else if (this.tool === 'brush') {
          if (moved > .004) {
            const wasK = H.knots(this.hair), wasF = H.flyaways(this.hair);
            const ev = H.brush(this.hair, A[0], A[1], B[0], B[1], .3, moved);
            for (const e of ev) {
              sfx.pop(); const sx = c.x + e.x * R, sy = c.y + e.y * R;
              this.fx.burst(sx, sy, e.t === 'knot' ? 9 : 4, { colors: e.t === 'knot' ? ['#fff7c2', '#fff', '#ffd54a'] : ['#fff'], speed: e.t === 'knot' ? 170 : 90, g: 60, life: .9, size: 5 * this.ui + 2, shape: 'star', up: 30 });
            }
            if ((this.brushT -= dt) <= 0) { this.brushT = .1; sfx.brush(); }
            if (Math.random() < dt * 5) this.fx.burst(B[0] * R + c.x, B[1] * R + c.y, 1, { colors: ['#fff', '#ffe9f3'], speed: 50, g: 40, life: .8, size: 3 * this.ui + 2 });
            if (ev.some(e => e.t === 'knot') && !H.knots(this.hair) && wasK) this.hearts('knots');
          }
        } else if (this.tool === 'spray') {
          const tx = c.x, ty = c.y - R * .3, dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy) || 1;
          for (let k = 0; k < 4; k++) this.mist.push({ x: h.x, y: h.y, vx: dx / d * (300 + Math.random() * 260) + (Math.random() - .5) * 170, vy: dy / d * (300 + Math.random() * 260) + (Math.random() - .5) * 170, life: .7 + Math.random() * .4, r: 5 + Math.random() * 6 });
          H.spray(this.hair, B[0], B[1], .5, dt);
          if ((this.sprayT -= dt) <= 0) { this.sprayT = .32; sfx.spray(); }
        } else if (this.tool === 'dryer') {
          H.dry(this.hair, B[0], B[1], .6, dt); this.sway = { a: .16, t: this.t };
          if ((this.blowT -= dt) <= 0) { this.blowT = .28; sfx.whoosh(); }
        }
        h.lx = h.x; h.ly = h.y;
      } else this.snipFrom = null;
      // how tidy is it? three stars light up; the first time it is really neat there is a little celebration
      const n = H.neat(this.hair); this.best = Math.max(this.best * .98, n);
      if (n > .85 && !this.praised && (this.hair.brushed || 0) > .3) { this.praised = true; sfx.chime(); this.hearts('neat'); }
    }
    hearts() { const c = this.headC(), R = this.headR(); this.fx.burst(c.x, c.y - R * .4, 12, { colors: ['#ff8aa3', '#ffd54a', '#fff'], speed: 240, g: 120, life: 1.2, size: 9 * this.ui, shape: 'heart', up: 120 }); }
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
      this.update(dt); this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ------------------------------------------------------------ drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      this.drawRoom(c);
      if (this.mode === 'pick') this.drawPick(c); else this.drawEdit(c);
      this.fx.draw(c);
    }
    drawRoom(c) {
      const w = this.w, h = this.h, g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe9f3'); g.addColorStop(.62, '#ffd5e8'); g.addColorStop(.63, '#f2c3a3'); g.addColorStop(1, '#e0a98a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.4)'; for (let x = 0; x < w; x += w / 9) c.fillRect(x, 0, w / 22, h * .62);
      if (this.mode === 'edit') {   // the big round mirror behind her
        const hc = this.headC(), R = this.headR();
        c.fillStyle = '#f0b429'; c.beginPath(); c.ellipse(hc.x, hc.y + R * .5, R * 2.15, R * 2.6, 0, 0, TAU); c.fill();
        const mg = c.createLinearGradient(hc.x - R, hc.y - R * 2, hc.x + R, hc.y + R * 3); mg.addColorStop(0, '#f6fbff'); mg.addColorStop(1, '#d9ecfb'); c.fillStyle = mg; c.beginPath(); c.ellipse(hc.x, hc.y + R * .5, R * 2.0, R * 2.45, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(hc.x - R * 1.1, hc.y - R * .9, R * .22, R * .9, .5, 0, TAU); c.fill();
      }
    }
    drawPick(c) {
      for (const k of this.cards) {
        c.fillStyle = 'rgba(90,63,94,.14)'; art.rr(c, k.x + 3, k.y + 7, k.s, k.s, 24 * this.ui); c.fill();
        c.fillStyle = 'rgba(255,255,255,.92)'; art.rr(c, k.x, k.y, k.s, k.s, 24 * this.ui); c.fill();
        if (k.img) c.drawImage(k.img, k.x, k.y, k.s, k.s);
      }
      this.btn(c, this.closeBtn, 'close'); this.btn(c, this.shuf, 'dice');
    }
    btn(c, b, id, on, big) {
      const r = big ? this.bs * .85 : this.br;
      c.fillStyle = 'rgba(90,63,94,.18)'; c.beginPath(); c.arc(b.x, b.y + 6, r, 0, TAU); c.fill();
      c.fillStyle = on ? '#fff3c4' : id === 'done' ? '#dff7e0' : '#fff'; c.beginPath(); c.arc(b.x, b.y, r, 0, TAU); c.fill();
      if (on || id === 'done') { c.strokeStyle = '#59b96e'; c.lineWidth = 6; c.stroke(); }
      c.save(); c.translate(b.x, b.y); this.icon(c, id, r * .62, 0); c.restore();
    }
    icon(c, id, r, anim) {
      c.save(); c.lineCap = c.lineJoin = 'round';
      if (id === 'scissors') this.scissors(c, r, .35 + (anim || 0));
      else if (id === 'brush') { c.translate(-r * .3, r * .7); this.brush(c, r * .9); }
      else if (id === 'spray') { c.translate(-r * .5, r * .1); this.bottle(c, r * .85, false); }
      else if (id === 'dryer') { c.translate(-r * .1, 0); this.dryer(c, r * .8, false); }
      else if (id === 'undo') { c.strokeStyle = '#5a3f5e'; c.lineWidth = r * .3; c.beginPath(); c.arc(0, r * .05, r * .6, Math.PI * 1.1, Math.PI * 2.4); c.stroke(); c.fillStyle = '#5a3f5e'; c.beginPath(); c.moveTo(-r * .85, -r * .25); c.lineTo(-r * .1, -r * .15); c.lineTo(-r * .45, r * .5); c.closePath(); c.fill(); }
      else if (id === 'done') { c.strokeStyle = '#3fae5a'; c.lineWidth = r * .4; c.beginPath(); c.moveTo(-r * .7, 0); c.lineTo(-r * .2, r * .55); c.lineTo(r * .75, -r * .5); c.stroke(); }
      else if (id === 'close') { c.strokeStyle = '#59b96e'; c.lineWidth = r * .32; c.beginPath(); c.moveTo(r * .35, -r * .6); c.lineTo(-r * .45, 0); c.lineTo(r * .35, r * .6); c.stroke(); }
      else if (id === 'dice') { c.fillStyle = '#fff'; c.strokeStyle = '#8a6ad9'; c.lineWidth = r * .14; art.rr(c, -r * .7, -r * .7, r * 1.4, r * 1.4, r * .3); c.fill(); c.stroke(); c.fillStyle = '#8a6ad9'; for (const [x, y] of [[-.35, -.35], [.35, -.35], [0, 0], [-.35, .35], [.35, .35]]) { c.beginPath(); c.arc(x * r, y * r, r * .12, 0, TAU); c.fill(); } }
      c.restore();
    }
    // kid scissors: rounded blades and two big handles; the cutting point is where the blades cross, at (0, 0)
    scissors(c, r, open) {
      c.save();
      for (const sd of [-1, 1]) {
        c.save(); c.rotate(sd * open * .5);
        c.fillStyle = '#d9e2ee'; c.strokeStyle = '#8b97a8'; c.lineWidth = r * .07; c.beginPath(); c.moveTo(-r * .12, 0); c.lineTo(-r * .1, -r * 1.25); c.quadraticCurveTo(0, -r * 1.5, r * .12, -r * 1.25); c.lineTo(r * .12, 0); c.closePath(); c.fill(); c.stroke();   // a blade with a round tip
        c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-r * .04, -r * 1.15, r * .04, r * 1.05);
        c.fillStyle = sd < 0 ? '#ff6b9a' : '#4f9fe8'; c.beginPath(); c.ellipse(sd * r * .08, r * .75, r * .38, r * .5, sd * -.15, 0, TAU); c.fill(); c.strokeStyle = 'rgba(60,40,70,.25)'; c.lineWidth = r * .06; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(sd * r * .08, r * .78, r * .2, r * .3, sd * -.15, 0, TAU); c.fill();
        c.restore();
      }
      c.fillStyle = '#8b97a8'; c.beginPath(); c.arc(0, 0, r * .1, 0, TAU); c.fill();
      c.restore();
    }
    brush(c, r) {   // the bristles' tip is at (0, 0)
      c.save(); c.rotate(-.5);
      c.fillStyle = '#b9805a'; art.rr(c, -r * .15, -r * 2.2, r * .3, r * 1.7, r * .1); c.fill();
      c.fillStyle = '#ff8aa3'; art.rr(c, -r * .58, -r * .62, r * 1.16, r * .6, r * .14); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, r * .08); for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(k * r * .12, -r * .06); c.lineTo(k * r * .12, r * .1); c.stroke(); }
      c.restore();
    }
    bottle(c, r, press) {   // the nozzle is at (0, 0) and points left
      c.save();
      c.fillStyle = '#9fdcff'; art.rr(c, r * .35, -r * .05, r * 1.0, r * 1.7, r * .24); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; art.rr(c, r * .5, r * .1, r * .18, r * 1.4, r * .08); c.fill();
      c.fillStyle = '#fff'; art.rr(c, r * .55, r * .5, r * .6, r * .5, r * .1); c.fill(); art.heart(c, r * .85, r * .78, r * .16, '#ff6b81');
      c.fillStyle = '#fff'; art.rr(c, r * .55, -r * .35, r * .4, r * .35, r * .06); c.fill();
      c.fillStyle = '#ff8aa3'; art.rr(c, -r * .05, -r * .62, r * 1.35, r * .42, r * .14); c.fill();
      c.fillStyle = '#ff6b81'; art.rr(c, -r * .28, -r * .56, r * .38, r * .28, r * .07); c.fill();
      c.fillStyle = '#e8433f'; c.save(); c.translate(r * .4, -r * .18); c.rotate(press ? .35 : 0); art.rr(c, -r * .05, 0, r * .16, r * .55, r * .06); c.fill(); c.restore();
      c.restore();
    }
    dryer(c, r, on) {   // the nozzle is at (0, 0) and points left
      c.save(); c.rotate(.1);
      c.fillStyle = '#7fc8f8'; c.beginPath(); c.ellipse(r * .9, 0, r * 1.0, r * .68, 0, 0, TAU); c.fill();
      c.fillStyle = '#4f8fe8'; art.rr(c, -r * .35, -r * .4, r * .7, r * .8, r * .18); c.fill();
      c.fillStyle = '#9a6bd6'; art.rr(c, r * .65, r * .4, r * .45, r * 1.15, r * .16); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(r * .75, -r * .25, r * .4, r * .15, -.2, 0, TAU); c.fill();
      if (on) { c.strokeStyle = 'rgba(200,235,255,.9)'; c.lineWidth = r * .1; for (let i = 0; i < 4; i++) { const o = (this.t * 4 + i * .8) % 3; c.beginPath(); c.moveTo(-r * (.5 + o * .6), (i - 1.5) * r * .28); c.lineTo(-r * (.9 + o * .6), (i - 1.5) * r * .28); c.stroke(); } }
      c.restore();
    }
    drawEdit(c) {
      const w = this.w, h = this.h, hc = this.headC(), R = this.headR(), U = R / P.HEAD.R, hair = this.hair; if (!hair) return;
      const col = P.HAIRC[this.hairCol % P.HAIRC.length], look = this.look;
      const sx = hc.x - P.HEAD.x * U, sy = hc.y - P.HEAD.y * U;   // where the figure's feet stand
      // hair behind the body, the figure without hair, the barber cape, then the hair in front
      c.save(); c.translate(hc.x, hc.y); H.draw(c, R, hair, col, { layer: 'back', sway: this.sway }); c.restore();
      c.save(); c.translate(sx, sy); P.draw(c, Object.assign({}, look, { hair: 'none', hat: null }), 100 * U, T0); this.cape(c, U); c.restore();
      c.save(); c.translate(hc.x, hc.y);
      H.draw(c, R, hair, col, { layer: 'front', sway: this.sway });
      H.drawPieces(c, R, this.pieces, col);
      c.restore();
      this.drawStars(c);
      for (const b of this.btns) this.btn(c, b, b.id, b.id === this.tool, b.big);
      // the mist and the tool in her hand
      for (const m of this.mist) { c.globalAlpha = clamp(m.life, 0, 1) * .5; c.fillStyle = '#d8f1ff'; c.beginPath(); c.arc(m.x, m.y, m.r, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      const hd = this.hold, r = this.bs * .8, pos = hd ? { x: hd.x, y: hd.y } : { x: this.w - this.bs * 2.2, y: this.h * .42 + Math.sin(this.t * 2.5) * 5 };
      if (!hd && !this.wide) pos.x = this.w * .82;
      c.save(); c.translate(pos.x, pos.y);
      if (this.tool === 'scissors') this.scissors(c, r, hd ? (this.snipPhase > 0 ? .05 : .55) : .4);
      else if (this.tool === 'brush') this.brush(c, r * 1.2);
      else if (this.tool === 'spray') this.bottle(c, r, !!hd);
      else this.dryer(c, r, !!hd);
      c.restore();
    }
    // the cape draped over the shoulders so only her head and neck show (figure units, feet at (0, 0))
    cape(c, U) {
      c.save(); c.scale(U, U);
      const g = c.createLinearGradient(0, -56, 0, -12); g.addColorStop(0, '#9fd4ff'); g.addColorStop(1, '#6fb4f0');
      c.fillStyle = g; c.beginPath(); c.moveTo(-8, -56); c.quadraticCurveTo(-16, -53, -22, -44); c.quadraticCurveTo(-31, -28, -34, -12); c.quadraticCurveTo(0, -5, 34, -12); c.quadraticCurveTo(31, -28, 22, -44); c.quadraticCurveTo(16, -53, 8, -56); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)'; for (const [x, y, r] of [[-18, -40, 1.6], [-8, -30, 1.8], [12, -34, 1.6], [24, -22, 1.8], [-24, -18, 1.5], [2, -20, 1.7], [-4, -44, 1.4], [18, -46, 1.3], [-16, -48, 1.2]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(60,90,140,.25)'; c.lineWidth = .8; c.beginPath(); c.moveTo(0, -52); c.quadraticCurveTo(-1, -30, 0, -9); c.stroke();
      c.fillStyle = '#5ea6e6'; c.beginPath(); c.ellipse(0, -55.5, 9.5, 2.6, 0, 0, TAU); c.fill();   // collar
      c.restore();
    }
    drawStars(c) {
      const n = H.neat(this.hair), x0 = this.w / 2, y = this.bs * .85, sp = this.bs * .85;
      c.fillStyle = 'rgba(255,255,255,.8)'; art.rr(c, x0 - sp * 1.65, y - this.bs * .5, sp * 3.3, this.bs, this.bs * .5); c.fill();   // a pill behind them so they show against any hair
      for (let i = 0; i < 3; i++) {
        const on = n > [.4, .65, .85][i], k = on ? 1 : .35; art.star(c, x0 + (i - 1) * sp, y - (i === 1 ? this.bs * .12 : 0), this.bs * .34 * (on ? 1 + Math.sin(this.t * 4 + i) * .05 : 1), on ? '#ffd54a' : 'rgba(200,190,210,.7)', 0);
      }
    }
  }
  SPG.salon = {
    open(host, opts) { return new Salon(host, opts); },
    // a little picture of a tool (for tiles elsewhere): the middle of the picture is (0, 0), r its size
    drawIcon(c, id, r) { const q = Salon.prototype; q.icon.call({ scissors: q.scissors, brush: q.brush, bottle: q.bottle, dryer: q.dryer, t: 0 }, c, id, r, 0); }
  };
})();
