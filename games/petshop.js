// Pet Shop: spend the stars she has earned on a pet, give it a name, and dress it up. Nothing here costs real money.
// The pet then keeps her company in calm places like the Coloring Book.
(() => {
  const SPG = window.SPG;
  const { art, sfx, store, voice, pets: P } = SPG;
  const TAU = Math.PI * 2;
  const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.filter(k => k != null)); return e; };
  const NS = 'http://www.w3.org/2000/svg';
  const icon = id => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'ico'); s.innerHTML = `<use href="#i-${id}"/>`; return s; };
  const btn = (cls, label, ...kids) => { const b = el('button', cls, ...kids); b.type = 'button'; b.setAttribute('aria-label', label); return b; };
  // Act on a finished tap that began on this very button (so the tap that opened a sheet can never press its buttons).
  const tap = (b, fn, guard) => {
    let t = -1e9;
    b.addEventListener('pointerdown', () => { t = performance.now(); });
    b.addEventListener('click', e => { if ((e.detail === 0 || performance.now() - t < 1500) && performance.now() - (guard ? guard() : 0) > 350) { t = -1e9; fn(e); } });
  };
  const price = n => el('span', 'ps-price', icon('star'), el('b', '', String(n)));

  class PetShop {
    constructor(host) {
      this.host = host; this.root = el('div', 'ps'); host.append(this.root);
      this.fx = new art.Fx(); this.t = 0; this.hop = 0; this.cheer = 0; this.running = false; this.sheet = null; this.opened = 0;
      this.build(); this.render();
    }
    start() { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick = this.tick.bind(this)); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); }
    resume() { if (!this.running) this.start(); }
    resize() { this.paintRoom(); this.paintCards(); }
    destroy() { this.pause(); this.root.remove(); }
    back() { if (this.sheet) { this.closeSheet(); return true; } return false; }

    /* -------------------------------------------------------------- layout */
    build() {
      this.tab = 'pets';
      // the dress-up corner: a mirror and a little podium (what she wears is chosen on the pegboard sections on the right)
      this.roomCv = el('canvas', 'ps-pet');
      this.nameEl = el('b', 'ps-nameText');
      this.pencil = btn('ps-pencil', 'Change name', icon('pencil')); tap(this.pencil, () => this.askName(P.active().id, false));
      this.nameRow = el('div', 'ps-name', this.nameEl, this.pencil);
      this.hint = el('p', 'ps-hint');
      this.room = el('section', 'ps-room', this.roomCv, this.nameRow, this.hint);
      // the store: a sign row at the top, then shelves of pens or a pegboard of accessories
      this.signs = el('div', 'ps-signs');
      this.shelf = el('div', 'ps-aisle'); this.shelf.setAttribute('data-scroll', '');
      this.more = btn('st-more ps-more', 'See more', icon('left'));
      this.more.addEventListener('click', () => { this.shelf.scrollBy({ top: Math.max(140, this.shelf.clientHeight * .8), behavior: 'smooth' }); sfx.tap(); });
      this.shelf.addEventListener('scroll', () => this.updateMore(), { passive: true });
      this.store = el('section', 'ps-shelf ps-store', this.signs, el('div', 'ps-aislewrap', this.shelf, this.more));
      this.root.append(this.room, this.store);
      this.roomCv.addEventListener('pointerdown', e => {
        e.preventDefault(); const a = P.active(); if (!a) { sfx.oops(); return; }
        this.hop = 1; P.noise(a.id); const r = this.roomCv.getBoundingClientRect();
        this.fx.burst(e.clientX - r.left, e.clientY - r.top - 20, 6, { colors: ['#ff7a8a', '#ff9db8'], speed: 110, g: -60, life: 1, size: 8, shape: 'heart' });
      });
    }
    updateMore() { const b = this.shelf; this.more.classList.toggle('show', b.scrollHeight - b.clientHeight - b.scrollTop > 24); }
    render() {
      const a = P.active(), keep = this.shelf.scrollTop;
      this.nameEl.textContent = a ? a.name : '';
      this.nameRow.classList.toggle('hidden', !a);
      this.hint.textContent = a ? '' : 'Pick a friend from the shelves to take home!';
      // the sign row: what you can look at in the shop
      this.signs.replaceChildren();
      for (const [id, label] of [['pets', 'Pets'], ['head', 'Hats'], ['face', 'Glasses'], ['neck', 'Bows and collars']]) {
        const cv = el('canvas'), b = btn('ps-sign' + (this.tab === id ? ' on' : ''), label, cv, el('span', '', label)); b._sign = id; b._cv = cv;
        tap(b, () => { this.tab = id; sfx.tap(); this.shelf.scrollTop = 0; this.render(); });
        this.signs.append(b);
      }
      this.shelf.replaceChildren(this.tab === 'pets' ? this.pens() : this.pegboard(this.tab));
      if (keep && this._lastTab === this.tab) this.shelf.scrollTop = keep; this._lastTab = this.tab;
      requestAnimationFrame(() => { this.paintRoom(); this.paintCards(); this.updateMore(); });
    }
    // Shelves of pens: every pet lives in its own little glass-fronted home, with a star price tag.
    pens() {
      const wrap = el('div', 'ps-shelves'), a = P.active();
      const perRow = 3;
      for (let r = 0; r < P.PETS.length; r += perRow) {
        const row = el('div', 'ps-shelfrow');
        for (const item of P.PETS.slice(r, r + perRow)) {
          const owned = P.owns(item.id), cant = !owned && !P.canAfford(item.price), cv = el('canvas');
          const b = btn(`ps-card ps-pen${owned ? ' owned' : ''}${cant ? ' cant' : ''}${a && a.id === item.id ? ' active' : ''}`, owned ? P.nameOf(item.id) : `${item.name}, ${item.price} stars`, cv,
            el('span', 'ps-label', owned ? P.nameOf(item.id) : item.name), owned ? el('span', 'ps-own', icon('check')) : el('span', 'ps-tag', price(item.price)));
          b._cv = cv; b._item = item; b._type = 'pet'; tap(b, () => this.tapCard(item, 'pet', b)); row.append(b);
        }
        wrap.append(row);
      }
      return wrap;
    }
    // Accessories hang on a pegboard wall. Each section starts with a big "nothing" button (take it off), then what she owns (touch to
    // put it on, no price), then what she can still buy (star tags). An owned thing that another pet is wearing shows that pet's face.
    pegboard(slot) {
      const wrap = el('div', 'ps-peg'), a = P.active(), list = P.HATS.filter(h => h.slot === slot);
      const cur = a ? (slot === 'head' ? a.hat : a[slot]) : null;
      const none = btn('ps-card ps-hook ps-none' + (a && !cur ? ' active' : ''), 'Nothing, take it off', el('canvas'), icon('x'), el('span', 'ps-label', 'None'));
      none._cv = none.firstChild; none._type = 'none';
      tap(none, () => { if (!a) { this.nope(none, 'Take a friend home first, then pick something to wear!', 'shop-first'); return; } P.unwear(slot); sfx.tap(); this.hop = .6; this.render(); });
      wrap.append(none);
      const mine = list.filter(h => P.ownsHat(h.id)), rest = list.filter(h => !P.ownsHat(h.id));
      const add = item => {
        const owned = P.ownsHat(item.id), cant = !owned && !P.canAfford(item.price), cv = el('canvas');
        const on = !!a && cur === item.id, other = owned && !on ? P.wornBy(item.id) : null;
        const b = btn(`ps-card ps-hook${owned ? ' owned' : ''}${cant ? ' cant' : ''}${on ? ' active' : ''}${other ? ' taken' : ''}`,
          other ? `${item.name}, on ${P.nameOf(other)}` : owned ? item.name : `${item.name}, ${item.price} stars`, cv,
          el('span', 'ps-label', item.name), owned ? (other ? null : el('span', 'ps-own', icon('check'))) : el('span', 'ps-tag', price(item.price)));
        if (other) { const bc = el('canvas'); b.append(el('span', 'ps-worn', bc)); b._badge = { cv: bc, pet: other }; }
        b._cv = cv; b._item = item; b._type = 'hat'; tap(b, () => this.tapCard(item, 'hat', b)); wrap.append(b);
      };
      mine.forEach(add);
      if (rest.length) { if (mine.length) wrap.append(el('div', 'ps-peg-sep')); rest.forEach(add); }
      return wrap;
    }
    penKind(id) { return { bunny: 'cage', hamster: 'cage', mouse: 'cage', cat: 'basket', dog: 'basket', pig: 'pasture', lamb: 'pasture', elephant: 'pasture', unicorn: 'cloud', trex: 'jungle', trike: 'jungle', stego: 'jungle', bronto: 'jungle', babydino: 'jungle', frog: 'pond', duck: 'pond', penguin: 'ice', owl: 'perch', bear: 'forest', fox: 'forest', panda: 'forest' }[id] || 'cage'; }
    // The home behind (and the bars or glass in front of) each pet.
    drawPen(c, w, h, kind) {
      const R = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(x, y, ww, hh); };
      const sky = { cage: ['#fdf1dc', '#f8e2bd'], basket: ['#ffe9ef', '#ffd6e2'], pasture: ['#e4f4d6', '#cfe9b8'], cloud: ['#e6ddff', '#fbe3f5'], jungle: ['#d6efc8', '#b5df9f'], pond: ['#cfeefb', '#a8def2'], ice: ['#dff3ff', '#c4e6fa'], perch: ['#efe0c8', '#e0c9a5'], forest: ['#d9efd0', '#bfe3b0'] }[kind];
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (kind === 'cage') { R(0, h * .84, w, h * .16, '#e9c47a'); c.strokeStyle = 'rgba(190,140,60,.6)'; c.lineWidth = 2; for (let i = 0; i < 16; i++) { const x = (i * 37 % 100) / 100 * w; c.beginPath(); c.moveTo(x, h * .98); c.lineTo(x + 7, h * .86); c.stroke(); } }
      else if (kind === 'basket') { c.fillStyle = '#c99a6a'; c.beginPath(); c.ellipse(w / 2, h * .86, w * .46, h * .12, 0, 0, TAU); c.fill(); c.fillStyle = '#ffb3c8'; c.beginPath(); c.ellipse(w / 2, h * .84, w * .38, h * .085, 0, 0, TAU); c.fill(); }
      else if (kind === 'pasture') { R(0, h * .82, w, h * .18, '#a9d98f'); c.fillStyle = '#e8c96a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(w * (.08 + i * .11), h * .9, w * .06, h * .022, .2, 0, TAU); c.fill(); } }
      else if (kind === 'cloud') { c.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, r] of [[.2, .84, .16], [.42, .88, .2], [.7, .86, .18], [.9, .9, .14]]) { c.beginPath(); c.arc(w * x, h * y, h * r, 0, TAU); c.fill(); } ['#ff9fa8', '#ffd27a', '#9fe0b8', '#8fcaf5', '#c9a8f0'].forEach((k, i) => { c.strokeStyle = k; c.lineWidth = h * .03; c.beginPath(); c.arc(w * .5, h * .95, h * (.64 - i * .04), Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }); }
      else if (kind === 'pond') { c.fillStyle = '#5cc0ea'; c.fillRect(0, h * .74, w, h * .26); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(w * (.05 + i * .2), h * .79); c.quadraticCurveTo(w * (.1 + i * .2), h * .76, w * (.15 + i * .2), h * .79); c.stroke(); } c.fillStyle = '#7ed957'; for (const x of [.18, .78]) { c.beginPath(); c.ellipse(w * x, h * .88, w * .1, h * .035, 0, 0, TAU); c.fill(); } }
      else if (kind === 'ice') { R(0, h * .84, w, h * .16, '#fff'); c.fillStyle = '#bfe6ff'; for (const [x, y, s] of [[.14, .86, .1], [.82, .9, .12]]) { c.beginPath(); c.roundRect ? c.roundRect(w * x - w * s / 2, h * y - w * s / 2, w * s, w * s, 6) : c.rect(w * x, h * y, w * s, w * s); c.fill(); } c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 10; i++) { c.beginPath(); c.arc((i * 61 % 100) / 100 * w, (i * 37 % 60) / 100 * h, 2 + i % 2, 0, TAU); c.fill(); } }
      else if (kind === 'perch') { c.strokeStyle = '#8a6440'; c.lineWidth = h * .07; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, h * .8); c.lineTo(w, h * .76); c.stroke(); c.fillStyle = '#4fa86b'; for (const x of [.15, .86]) { c.beginPath(); c.ellipse(w * x, h * .74, w * .07, h * .03, .5, 0, TAU); c.fill(); } }
      else if (kind === 'jungle') { R(0, h * .84, w, h * .16, '#8fcf6a'); c.fillStyle = '#b8c8d8'; c.beginPath(); c.moveTo(w * .6, h * .84); c.lineTo(w * .78, h * .36); c.lineTo(w * .96, h * .84); c.closePath(); c.fill(); c.fillStyle = '#ff8a4d'; c.beginPath(); c.moveTo(w * .73, h * .42); c.lineTo(w * .78, h * .36); c.lineTo(w * .83, h * .42); c.closePath(); c.fill(); c.fillStyle = '#4fa86b'; for (const [x, s2] of [[.1, .3], [.3, .2]]) { for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(w * x + k * w * .05, h * (.84 - s2 * .5) - Math.abs(k) * h * .02, w * .03, h * s2 * .5, k * .3, 0, TAU); c.fill(); } } }
      else if (kind === 'forest') { R(0, h * .84, w, h * .16, '#9ad97f'); c.fillStyle = '#5aa86b'; for (const [x, s] of [[.12, .3], [.88, .34], [.3, .2], [.7, .22]]) { c.beginPath(); c.moveTo(w * x, h * .84); c.lineTo(w * x - w * s * .3, h * .84); c.lineTo(w * x, h * (.84 - s)); c.lineTo(w * x + w * s * .3, h * .84); c.fill(); } }
    }
    drawPenFront(c, w, h, kind) {
      if (kind === 'cage') { c.strokeStyle = 'rgba(150,150,170,.75)'; c.lineWidth = 2.5; for (let i = 1; i < 9; i++) { c.beginPath(); c.moveTo(w * i / 9, 0); c.lineTo(w * i / 9, h); c.stroke(); } c.strokeStyle = 'rgba(150,150,170,.8)'; c.beginPath(); c.moveTo(0, h * .06); c.lineTo(w, h * .06); c.stroke(); }
      else if (kind === 'pasture') { c.strokeStyle = '#c99a6a'; c.lineWidth = h * .035; c.lineCap = 'round'; for (const y of [.7, .85]) { c.beginPath(); c.moveTo(0, h * y); c.lineTo(w, h * y); c.stroke(); } for (const x of [.04, .96]) { c.beginPath(); c.moveTo(w * x, h * .62); c.lineTo(w * x, h); c.stroke(); } }
      // glass sheen on every pen
      c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.moveTo(w * .06, h); c.lineTo(w * .3, 0); c.lineTo(w * .42, 0); c.lineTo(w * .18, h); c.closePath(); c.fill();
    }
    paintSignIcon(c, id, w) {
      c.clearRect(0, 0, w, w); c.save(); c.translate(w / 2, w * .58);
      if (id === 'pets') { P.drawHead(c, 'cat', w * .3, null); }
      else if (id === 'head') { P.drawHead(c, 'bunny', w * .3, 'crown'); }
      else if (id === 'face') { P.drawHead(c, 'dog', w * .3, 'hearts'); }
      else { P.drawHead(c, 'panda', w * .3, 'bowtie'); }
      c.restore();
    }
    paintCards() {
      const dpr = SPG.ui.dpr();
      for (const b of this.root.querySelectorAll('.ps-card')) {
        const cv = b._cv, w = cv.clientWidth; if (!w) continue;
        cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * .9);
        const c = cv.getContext('2d'), h = w * .9; c.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (b._type === 'pet') {
          const kind = this.penKind(b._item.id); c.save(); art.rr(c, 0, 0, w, h, 14); c.clip();
          this.drawPen(c, w, h, kind); c.save(); c.translate(w / 2, h * .93); P.draw(c, b._item.id, h * .8, 1.3, { hat: null }); c.restore(); this.drawPenFront(c, w, h, kind); c.restore();
        } else {
          c.save(); art.rr(c, 0, 0, w, h, 14); c.clip(); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fbeedd'); g.addColorStop(1, '#f3dcc0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
          c.fillStyle = 'rgba(190,140,90,.3)'; for (let yy = h * .12; yy < h; yy += h * .2) for (let xx = w * .1; xx < w; xx += w * .2) { c.beginPath(); c.arc(xx, yy, 2, 0, TAU); c.fill(); }
          c.restore();
          const base = (P.active() || { id: 'bunny' }).id; c.save(); c.translate(w / 2, h * .62); P.drawHead(c, base, w * .27, b._type === 'none' ? null : b._item.id); c.restore();
        }
      }
      for (const b of this.root.querySelectorAll('.ps-card')) {
        if (!b._badge) continue; const bc = b._badge.cv, bw = bc.clientWidth; if (!bw) continue;
        bc.width = bc.height = Math.round(bw * dpr); const c = bc.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.translate(bw / 2, bw * .56); P.drawHead(c, b._badge.pet, bw * .3, null);
      }
      for (const b of this.signs.querySelectorAll('button')) { const cv = b._cv, w = cv.clientWidth; if (!w) continue; cv.width = cv.height = Math.round(w * dpr); const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); this.paintSignIcon(c, b._sign, w); }
    }
    paintRoom() {
      const cv = this.roomCv, r = cv.getBoundingClientRect(); if (!r.width) return;
      const dpr = SPG.ui.dpr(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); this.rw = r.width; this.rh = r.height;
      this.drawRoom();
    }
    // The dress-up corner: a big mirror on the wall, a round podium, and a little spotlight.
    drawRoom() {
      const cv = this.roomCv; if (!this.rw) return;
      const c = cv.getContext('2d'), dpr = cv.width / this.rw, w = this.rw, h = this.rh;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      const mw = Math.min(w * .8, h * .8), mx = w / 2, my = h * .46;
      c.fillStyle = '#e6b988'; c.beginPath(); c.ellipse(mx, my, mw * .5, h * .46, 0, 0, TAU); c.fill();
      const mg = c.createLinearGradient(mx - mw * .4, my - h * .4, mx + mw * .4, my + h * .4); mg.addColorStop(0, '#f2fbff'); mg.addColorStop(1, '#d4ecf8'); c.fillStyle = mg; c.beginPath(); c.ellipse(mx, my, mw * .45, h * .42, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(mx - mw * .2, my - h * .18, mw * .05, h * .16, .5, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255, 190, 210, .8)'; c.beginPath(); c.ellipse(w / 2, h * .92, w * .34, h * .07, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(w / 2, h * .9, w * .34, h * .07, 0, 0, TAU); c.fill();
      const a = P.active();
      if (a) {
        c.save(); c.translate(w / 2, h * .9); P.draw(c, a.id, Math.min(w * .72, h * .82), this.t, { hat: a.hat, face: a.face, neck: a.neck, mood: this.cheer > 0 ? 'cheer' : 'happy', hop: this.hop > 0 ? 1 - this.hop : 0 }); c.restore();
      } else {
        c.font = `${Math.min(w, h) * .45}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('\u{1F9FA}', w / 2, h * .62);
      }
      this.fx.draw(c);
    }
    tick(now) {
      if (!this.running) return;
      this.raf = requestAnimationFrame(this.tick);
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt;
      if (this.hop > 0) this.hop = Math.max(0, this.hop - dt * 2.2);
      if (this.cheer > 0) this.cheer = Math.max(0, this.cheer - dt);
      this.fx.update(dt); this.drawRoom();
    }

    /* -------------------------------------------------------------- shopping */
    say(text) { this.hint.textContent = text; clearTimeout(this.hintT); this.hintT = setTimeout(() => { if (this.hint.textContent === text) this.hint.textContent = P.active() ? '' : 'Pick a friend from the shelf to take home!'; }, 3500); }
    nope(b, text, line) {   // she cannot read the hint, so the reason is also said out loud (not again within a few seconds)
      sfx.oops(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); if (text) this.say(text);
      const now = performance.now(); if (line && (line !== this.noped || now - this.nopeT > 5000)) { this.noped = line; this.nopeT = now; voice.say(line); }
    }
    tapCard(item, type, b) {
      const a = P.active();
      if (type === 'pet') {
        if (P.owns(item.id)) { P.setActive(item.id); sfx.pop(); this.hop = 1; this.render(); return; }
        if (!P.canAfford(item.price)) return this.nope(b, `${item.name} costs ${item.price} stars. Keep playing to collect more!`, 'shop-stars');
        this.confirm(item, 'pet');
      } else {
        if (!a) return this.nope(b, 'Take a friend home first, then pick something to wear!', 'shop-first');
        if (P.ownsHat(item.id)) {
          const other = P.wornBy(item.id);
          if (other) return this.nope(b, `The ${item.name.toLowerCase()} is on ${P.nameOf(other)} right now.`, 'shop-worn');
          const cur = item.slot === 'head' ? a.hat : a[item.slot]; if (cur === item.id) P.unwear(item.slot); else P.wear(item.id); sfx.pop(); this.hop = 1; this.render(); return; }
        if (!P.canAfford(item.price)) return this.nope(b, `${item.name} costs ${item.price} stars. Keep playing to collect more!`, 'shop-stars');
        this.confirm(item, 'hat');
      }
    }
    openSheet(...kids) {
      this.closeSheet();
      const sheet = el('div', 'sheet ps-sheet', ...kids), ov = el('div', 'ps-overlay', sheet);
      this.root.append(ov); this.sheet = ov; this.opened = performance.now(); return sheet;
    }
    closeSheet() { if (this.sheet) { this.sheet.remove(); this.sheet = null; } }
    preview(item, type) {
      const cv = el('canvas', 'ps-prev'); cv.width = cv.height = 260;
      const c = cv.getContext('2d');
      if (type === 'pet') { c.translate(130, 235); P.draw(c, item.id, 230, 1.3, {}); }
      else { c.translate(130, 165); P.drawHead(c, (P.active() || { id: 'bunny' }).id, 84, item.id); }
      return cv;
    }
    confirm(item, type) {
      const yes = btn('btn go ps-yn', 'Yes', icon('check')), no = btn('btn quiet ps-yn', 'No', icon('x'));
      const guard = () => this.opened;
      tap(no, () => { sfx.tap(); this.closeSheet(); }, guard);
      tap(yes, () => {
        this.closeSheet();
        if (type === 'pet') { if (P.adopt(item.id)) { sfx.win(); this.askName(item.id, true); } }
        else if (P.buyHat(item.id)) { P.wear(item.id); sfx.chime(); this.celebrate(); this.render(); }
      }, guard);
      this.openSheet(this.preview(item, type), el('h2', '', type === 'pet' ? `Take ${item.name} home?` : `Get the ${item.name.toLowerCase()}?`), el('div', 'ps-cost', price(item.price)), el('div', 'row', no, yes));
    }
    // Names are picked from a list (touching one says it out loud). Typing needs the keyboard, so it sits behind the grown-up gate.
    askName(id, first) {
      const cur = first ? '' : P.nameOf(id), input = el('input');
      input.type = 'text'; input.maxLength = 12; input.autocomplete = 'off'; input.setAttribute('autocapitalize', 'words'); input.spellcheck = false; input.placeholder = 'Name'; input.value = '';
      const field = el('label', 'field hidden', input);
      const grid = SPG.ui.nameGrid(P.NAMES, () => { input.value = ''; });
      if (cur && P.NAMES.includes(cur)) grid.pick(cur, false);
      const dice = btn('btn quiet ps-dice', 'Pick a name for me', icon('dice')); tap(dice, () => { grid.pick(P.randomName(), true); grid.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' }); });
      const kb = btn('btn quiet ps-dice', 'Grown-up: type a name', icon('lock'), icon('keyboard'));
      tap(kb, () => SPG.app.askGate(() => { kb.classList.add('hidden'); field.classList.remove('hidden'); grid.clear(); input.value = cur && !P.NAMES.includes(cur) ? cur : ''; setTimeout(() => input.focus(), 120); }), () => this.opened);
      const cancel = btn('btn quiet ps-yn', 'Cancel', icon('x')); tap(cancel, () => this.closeSheet(), () => this.opened);
      const ok = btn('btn go ps-yn', 'Done', icon('check')); const guard = () => this.opened;
      tap(ok, () => {
        const name = input.value.trim() || grid.value || cur || P.randomName();
        P.rename(id, name); this.closeSheet(); this.render();
        if (first) { this.celebrate(); voice.say('welcome-home', voice.LINES['name/' + name] ? 'name/' + name : { say: name }); }
      }, guard);
      this.openSheet(this.preview({ id }, 'pet'), el('h2', '', first ? 'What is your friend called?' : 'New name'), grid, el('div', 'row ps-tools', dice, kb), field, el('div', 'row ps-ok-row', ...(first ? [ok] : [cancel, ok])));
      input.addEventListener('keydown', e => { if (e.key === 'Enter') ok.click(); });
    }
    celebrate() {
      this.cheer = 2.4; this.hop = 1;
      const w = this.rw || 300, h = this.rh || 300;
      this.fx.burst(w / 2, h * .45, 30, { colors: ['#ff7a8a', '#ffd54a', '#59b96e', '#4fb3e8', '#9a7be8'], speed: 320, g: 420, life: 1.3, size: 8, shape: 'confetti', up: 200 });
      this.fx.burst(w / 2, h * .4, 10, { colors: ['#ff9db8', '#ff7a8a'], speed: 140, g: -40, life: 1.4, size: 10, shape: 'heart' });
    }
  }

  // The shop front: striped awning, a window with pets on show, a door, and a paw sign board (text is added by the page).
  function cardIcon(c, w, h) {
    const wall = c.createLinearGradient(0, 0, 0, h); wall.addColorStop(0, '#fff3e4'); wall.addColorStop(1, '#ffe2c4');
    c.fillStyle = wall; art.rr(c, 0, 0, w, h, Math.min(26, h * .3)); c.fill();
    // brick hints
    c.strokeStyle = 'rgba(200,150,110,.22)'; c.lineWidth = 2;
    for (let y = h * .42; y < h; y += h * .16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    // awning
    const ah = h * .34, n = Math.max(8, Math.round(w / (h * .5)) * 2);
    c.save(); art.rr(c, 0, 0, w, h, Math.min(26, h * .3)); c.clip();
    for (let i = 0; i < n; i++) {
      const x0 = i * w / n, x1 = (i + 1) * w / n;
      c.fillStyle = i % 2 ? '#ffffff' : '#ff8fb0'; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x1, 0); c.lineTo(x1, ah); c.arc((x0 + x1) / 2, ah, (x1 - x0) / 2, 0, Math.PI); c.closePath(); c.fill();
    }
    c.restore();
    c.fillStyle = 'rgba(90,63,94,.12)'; c.fillRect(0, ah + (w / n) / 2, w, 5);
    // window with pets on show
    const ww = Math.min(w * .3, h * 2.1), wx = w * .05, wy = ah + h * .1, wh = h - wy - h * .06;
    c.fillStyle = '#c99a6a'; art.rr(c, wx - 5, wy - 5, ww + 10, wh + 10, 14); c.fill();
    c.fillStyle = '#cdeefc'; art.rr(c, wx, wy, ww, wh, 10); c.fill();
    c.save(); art.rr(c, wx, wy, ww, wh, 10); c.clip();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(wx + ww * .1, wy + wh); c.lineTo(wx + ww * .35, wy); c.lineTo(wx + ww * .45, wy); c.lineTo(wx + ww * .2, wy + wh); c.fill();
    c.fillStyle = '#e6b988'; c.fillRect(wx, wy + wh * .86, ww, wh * .14);
    [['cat', .3, 'party'], ['bunny', .68, 'bow']].forEach(([id, x, hatId]) => { c.save(); c.translate(wx + ww * x, wy + wh * .9); P.draw(c, id, wh * 1.22, 1.3, { hat: hatId }); c.restore(); });
    c.restore();
    // door
    const dw = Math.min(h * .78, w * .11), dx = w - w * .05 - dw, dy = ah + h * .1;
    c.fillStyle = '#a8744f'; art.rr(c, dx, dy, dw, h - dy, dw * .5); c.fill();
    c.fillStyle = '#ffe9b0'; c.beginPath(); c.arc(dx + dw / 2, dy + dw * .48, dw * .22, 0, TAU); c.fill(); art.star(c, dx + dw / 2, dy + dw * .48, dw * .16, '#ffb52e');
    c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(dx + dw * .78, h - (h - dy) * .42, dw * .06, 0, TAU); c.fill();
    // a little OPEN sign and some paw prints on the mat
    c.save(); c.translate(dx - h * .5, dy + h * .1); c.rotate(-.06);
    c.fillStyle = '#fff'; art.rr(c, 0, 0, h * .62, h * .26, 8); c.fill(); c.fillStyle = '#59b96e'; c.font = `700 ${h * .16}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('OPEN', h * .31, h * .14); c.restore();
    // hanging pets in the middle: a star price tag
    c.save(); c.translate(w * .5, h * .78); c.fillStyle = 'rgba(255,255,255,.0)'; c.restore();
  }

  SPG.games.push({ id: 'pets', name: 'Pet Shop', order: 6, dom: true, shop: true, icon: cardIcon, create: host => new PetShop(host) });
})();
