// Style Studio: dress up boys and girls (princess gowns, crowns, wings), do their hair and make-up, paint their nails,
// then send them down the runway. Pictures do all the talking: every tab, hairstyle and outfit is said out loud when touched.
// A look is a small plain object (see people.js defaultLook), saved per player in store.bag('style').
(() => {
  const SPG = window.SPG;
  const { art, sfx, store, voice, people: P } = SPG;
  const TAU = Math.PI * 2;
  const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.filter(k => k != null)); return e; };
  const NS = 'http://www.w3.org/2000/svg';
  const icon = id => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'ico'); s.innerHTML = `<use href="#i-${id}"/>`; return s; };
  const btn = (cls, label, ...kids) => { const b = el('button', cls, ...kids); b.type = 'button'; b.setAttribute('aria-label', label); return b; };
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  // A tap that still counts when a small finger wobbles: act when the finger lifts within ~22px of where it landed
  // (a scroll or a long drag does not count). Keyboard and screen-reader activation still work.
  const onTap = (b, fn) => {
    let d = null, done = 0;
    b.addEventListener('pointerdown', e => { if (e.button > 0) return; d = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    b.addEventListener('pointerup', e => { if (!d) return; const o = d; d = null; if (Math.hypot(e.clientX - o.x, e.clientY - o.y) < 22 && performance.now() - o.t < 1500) { done = performance.now(); fn(e); } });
    b.addEventListener('pointercancel', () => { d = null; });
    b.addEventListener('click', e => { if (e.detail === 0 && performance.now() - done > 600) fn(e); });
  };
  const say = key => { const k = 'style/' + key; if (voice.LINES[k]) voice.say(k); };

  /* ---------------------------------------------------------------- the friends */
  const PRESETS = [
    { gender: 'girl', skin: 1, hair: 'long', hairCol: 6, eyes: 2, dress: 'aline', dressCol: 0, shoes: 'flats', shoesCol: 0 },
    { gender: 'girl', skin: 5, hair: 'curly', hairCol: 0, eyes: 1, dress: 'sun', dressCol: 4, shoes: 'sandals', shoesCol: 1 },
    { gender: 'girl', skin: 3, hair: 'pigtails', hairCol: 5, eyes: 0, freckles: true, dress: 'tutu', dressCol: 8, shoes: 'flats', shoesCol: 8 },
    { gender: 'girl', skin: 0, hair: 'braid', hairCol: 2, eyes: 3, top: 'star', topCol: 11, bottom: 'skirt', bottomCol: 8 },
    { gender: 'boy', skin: 2, hair: 'short', hairCol: 1, eyes: 0, top: 'tee', topCol: 9, bottom: 'jeans', bottomCol: 9 },
    { gender: 'boy', skin: 6, hair: 'spiky', hairCol: 0, eyes: 1, top: 'stripes', topCol: 2, bottom: 'shorts', bottomCol: 5 },
    { gender: 'boy', skin: 4, hair: 'curly', hairCol: 0, eyes: 0, top: 'hoodie', topCol: 5, bottom: 'jeans', bottomCol: 13 },
    { gender: 'boy', skin: 0, hair: 'short', hairCol: 4, eyes: 2, freckles: true, top: 'sweater', topCol: 8, bottom: 'jeans', bottomCol: 8 }
  ];
  const baseLook = i => Object.assign(P.defaultLook(PRESETS[i].gender), PRESETS[i]);

  /* ---------------------------------------------------------------- places (backdrops) */
  let NIGHT = false;   // set every frame: in night mode the ballroom's chandelier gives way to the lamp over her head
  const FLOOR = .9;   // where the feet stand, as a fraction of the stage height
  const PLACES = [
    (c, w, h, t) => {   // castle ballroom
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffeef5'); g.addColorStop(1, '#f8d7e6'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (const x of [.2, .5, .8]) { const ww = w * .13, xx = w * x - ww / 2; c.fillStyle = '#cfe6ff'; c.beginPath(); c.moveTo(xx, h * .55); c.lineTo(xx, h * .22); c.arc(xx + ww / 2, h * .22, ww / 2, Math.PI, TAU); c.lineTo(xx + ww, h * .55); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke(); c.beginPath(); c.moveTo(xx + ww / 2, h * .1); c.lineTo(xx + ww / 2, h * .55); c.stroke(); }
      c.fillStyle = '#e4506e'; for (const sd of [0, 1]) { c.beginPath(); c.moveTo(sd ? w : 0, 0); c.lineTo(sd ? w * .84 : w * .16, 0); c.quadraticCurveTo(sd ? w * .9 : w * .1, h * .4, sd ? w * .82 : w * .18, h * FLOOR); c.lineTo(sd ? w : 0, h * FLOOR); c.fill(); }
      if (!NIGHT) {
      c.strokeStyle = '#d99a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h * .07); c.stroke(); c.fillStyle = '#f0b429'; c.beginPath(); c.moveTo(w / 2 - w * .09, h * .11); c.quadraticCurveTo(w / 2, h * .16, w / 2 + w * .09, h * .11); c.lineTo(w / 2 + w * .05, h * .07); c.lineTo(w / 2 - w * .05, h * .07); c.closePath(); c.fill();
      for (let i = 0; i < 5; i++) { const x = w / 2 + (i - 2) * w * .04; c.fillStyle = 'rgba(220,240,255,.9)'; c.beginPath(); c.moveTo(x, h * .12); c.lineTo(x - 4, h * .17); c.lineTo(x, h * .2); c.lineTo(x + 4, h * .17); c.closePath(); c.fill(); c.globalAlpha = .5 + .5 * Math.sin(t * 3 + i); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(x, h * .065, 5, 0, TAU); c.fill(); c.globalAlpha = 1; }
      }
      const fy = h * FLOOR, sq = w / 14; for (let y = 0; fy + y * sq * .5 < h; y++) for (let x = -1; x < 16; x++) { c.fillStyle = (x + y) % 2 ? '#fff' : '#e8b3cb'; c.fillRect(x * sq - (y % 2) * 0, fy + y * sq * .5, sq, sq * .5 + 1); }
    },
    (c, w, h, t) => {   // garden
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe6ff'); g.addColorStop(.6, '#e8f7ff'); g.addColorStop(1, '#dff5d0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      art.cloud(c, w * .2, h * .16, w / 900, .9); art.cloud(c, w * .78, h * .1, w / 1100, .8);
      c.fillStyle = '#a9dc8f'; c.beginPath(); c.moveTo(0, h * .62); c.quadraticCurveTo(w * .3, h * .5, w * .6, h * .62); c.quadraticCurveTo(w * .85, h * .7, w, h * .58); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.fillStyle = '#7fc46f'; c.fillRect(0, h * FLOOR - 8, w, h);
      c.strokeStyle = '#fff'; c.lineWidth = w * .022; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * .22, h * FLOOR); c.lineTo(w * .22, h * .34); c.quadraticCurveTo(w * .5, h * .06, w * .78, h * .34); c.lineTo(w * .78, h * FLOOR); c.stroke();
      for (let i = 0; i < 14; i++) { const a = i / 13, x = w * .22 + (i < 7 ? 0 : 0), px = i < 7 ? w * .22 : w * .78, py = h * (.38 + (i % 7) * .07); c.fillStyle = ['#ff8fc0', '#ff6b81', '#ffd54a'][i % 3]; c.beginPath(); c.arc(px + (i % 2 ? 6 : -6), py, w * .014, 0, TAU); c.fill(); void a; void x; }
      for (let i = 0; i < 26; i++) { const x = (i * 97 % 100) / 100 * w, y = h * (.66 + (i * 37 % 100) / 100 * .32); c.fillStyle = ['#ff8fc0', '#fff', '#ffd54a', '#c9a8f0'][i % 4]; c.beginPath(); c.arc(x, y, w * .008, 0, TAU); c.fill(); }
      for (let i = 0; i < 3; i++) { const bx = w * (.15 + i * .3) + Math.sin(t * .8 + i) * 30, by = h * (.3 + .1 * Math.sin(t * 1.3 + i * 2)); c.fillStyle = ['#ffb3d1', '#ffd27a', '#b8a4f5'][i]; const fl = Math.sin(t * 14 + i) * .5 + .5; c.beginPath(); c.ellipse(bx - 6, by, 7, 5 + fl * 4, .3, 0, TAU); c.ellipse(bx + 6, by, 7, 5 + fl * 4, -.3, 0, TAU); c.fill(); }
    },
    (c, w, h, t) => {   // beach
      const g = c.createLinearGradient(0, 0, 0, h * .55); g.addColorStop(0, '#8fd3f8'); g.addColorStop(1, '#d9f3ff'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      art.sun && art.sun(c, w * .82, h * .18, Math.min(w, h) * .09, t);
      c.fillStyle = '#4fb6e6'; c.fillRect(0, h * .5, w, h * .22);
      c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 6; i++) { const x = ((i * 191 + t * 20) % (w + 100)) - 50; c.fillRect(x, h * .52 + (i % 3) * h * .06, 60, 4); }
      c.fillStyle = '#f7dfa4'; c.beginPath(); c.moveTo(0, h * .72); c.quadraticCurveTo(w * .5, h * .66 + Math.sin(t) * 3, w, h * .72); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, h * .72); for (let x = 0; x <= w; x += 20) c.lineTo(x, h * .715 + Math.sin(x * .05 + t * 2) * 4); c.lineTo(w, h * .74); c.lineTo(0, h * .74); c.fill();
      c.strokeStyle = '#a5754a'; c.lineWidth = w * .016; c.beginPath(); c.moveTo(w * .12, h * FLOOR); c.quadraticCurveTo(w * .15, h * .5, w * .1, h * .3); c.stroke(); c.fillStyle = '#4fa86b'; for (let i = 0; i < 5; i++) { c.save(); c.translate(w * .1, h * .3); c.rotate(-1.3 + i * .7); c.beginPath(); c.ellipse(w * .05, 0, w * .06, h * .02, 0, 0, TAU); c.fill(); c.restore(); }
      c.fillStyle = '#ffb3c8'; c.beginPath(); c.arc(w * .86, h * .93, 9, 0, Math.PI, true); c.fill(); c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(w * .92, h * .95, 7, 0, TAU); c.fill();
    },
    (c, w, h, t) => {   // salon
      c.fillStyle = '#ffdcea'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffc4dc'; for (let x = 0; x < w; x += w / 10) c.fillRect(x, 0, w / 20, h * FLOOR);
      const mw = w * .34, mh = h * .55, mx = w / 2 - mw / 2, my = h * .12; c.fillStyle = '#f0b429'; c.beginPath(); c.ellipse(w / 2, my + mh / 2, mw / 2 + 12, mh / 2 + 12, 0, 0, TAU); c.fill(); const g = c.createLinearGradient(mx, my, mx + mw, my + mh); g.addColorStop(0, '#f2fbff'); g.addColorStop(1, '#cfe8f7'); c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, my + mh / 2, mw / 2, mh / 2, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(w / 2 - mw * .18, my + mh * .3, mw * .07, mh * .2, .5, 0, TAU); c.fill();
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.fillStyle = '#fff3b0'; c.globalAlpha = .5 + .5 * Math.sin(t * 3 + i); art.star(c, w / 2 + Math.cos(a) * (mw / 2 + 12), my + mh / 2 + Math.sin(a) * (mh / 2 + 12), 5, '#fff3b0', 0); } c.globalAlpha = 1;
      const fy = h * FLOOR, sq = w / 12; for (let y = 0; fy + y * sq * .45 < h; y++) for (let x = -1; x < 14; x++) { c.fillStyle = (x + y) % 2 ? '#fff' : '#f7b8d1'; c.fillRect(x * sq, fy + y * sq * .45, sq, sq * .45 + 1); }
      for (const [x, k] of [[.1, '#c9a8f0'], [.16, '#7fc8f8'], [.9, '#ff8fc0'], [.84, '#ffd54a']]) { c.fillStyle = k; art.rr(c, w * x - 10, h * .6, 20, h * .16, 6); c.fill(); c.fillStyle = '#fff'; c.fillRect(w * x - 5, h * .58, 10, 8); }
      c.fillStyle = '#e9a3c3'; c.fillRect(w * .05, h * .77, w * .16, 8); c.fillRect(w * .79, h * .77, w * .16, 8);
    },
    (c, w, h, t) => {   // under the stars
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a2560'); g.addColorStop(.7, '#5a4a9a'); g.addColorStop(1, '#8a6ab8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { const x = (i * 149 % 100) / 100 * w, y = (i * 61 % 100) / 100 * h * .7; c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 1.5 + i)); art.star(c, x, y, 2 + (i % 3), '#fff8c8', 0); } c.globalAlpha = 1;
      c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(w * .8, h * .18, Math.min(w, h) * .08, 0, TAU); c.fill(); c.fillStyle = '#2a2560'; c.beginPath(); c.arc(w * .83, h * .16, Math.min(w, h) * .07, 0, TAU); c.fill();
      c.fillStyle = '#3d3478'; c.beginPath(); c.moveTo(0, h * .7); c.quadraticCurveTo(w * .3, h * .6, w * .6, h * .72); c.quadraticCurveTo(w * .8, h * .78, w, h * .66); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.fillStyle = '#2f2868'; const cx = w * .18, cb = h * .68; c.fillRect(cx, cb - h * .2, w * .12, h * .2); c.fillRect(cx - w * .04, cb - h * .3, w * .05, h * .3); c.fillRect(cx + w * .11, cb - h * .3, w * .05, h * .3); for (const x of [cx - w * .015, cx + w * .135]) { c.beginPath(); c.moveTo(x - w * .03, cb - h * .3); c.lineTo(x, cb - h * .42); c.lineTo(x + w * .03, cb - h * .3); c.fill(); } c.fillStyle = '#ffe680'; for (const [x, y] of [[cx + w * .04, cb - h * .12], [cx + w * .08, cb - h * .16]]) c.fillRect(x, y, 6, 9);
      c.fillStyle = '#4b3f8f'; c.fillRect(0, h * FLOOR - 4, w, h);
    },
    (c, w, h, t) => {   // rainbow meadow
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#a9deff'); g.addColorStop(.7, '#ecf8ff'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0'].forEach((k, i) => { c.strokeStyle = k; c.lineWidth = w * .022; c.beginPath(); c.arc(w / 2, h * .8, w * (.44 - i * .022), Math.PI, TAU); c.stroke(); });
      art.cloud(c, w * .16, h * .22, w / 800, .95); art.cloud(c, w * .86, h * .3, w / 900, .9);
      c.fillStyle = '#9ad97f'; c.beginPath(); c.moveTo(0, h * .7); c.quadraticCurveTo(w * .4, h * .6, w, h * .72); c.lineTo(w, h); c.lineTo(0, h); c.fill(); c.fillStyle = '#82c96b'; c.fillRect(0, h * FLOOR - 6, w, h);
      for (let i = 0; i < 30; i++) { const x = (i * 83 % 100) / 100 * w, y = h * (.74 + (i * 29 % 100) / 100 * .24); c.fillStyle = ['#ff8fc0', '#fff', '#ffd54a', '#c9a8f0', '#7fc8f8'][i % 5]; c.beginPath(); c.arc(x, y, w * .007 + 2, 0, TAU); c.fill(); }
    }
  ];
  const RUNWAY = (c, w, h, t) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a1f4a'); g.addColorStop(1, '#5a3a78'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (const [x, k] of [[.2, '#ffd0e8'], [.5, '#fff6c9'], [.8, '#cfe6ff']]) { const sg = c.createLinearGradient(0, 0, 0, h * FLOOR); sg.addColorStop(0, k); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = .28; c.fillStyle = sg; c.beginPath(); c.moveTo(w * x - 6, 0); c.lineTo(w * x + 6, 0); c.lineTo(w * (x + (.5 - x) * -.3) + w * .12, h * FLOOR); c.lineTo(w * (x + (.5 - x) * -.3) - w * .12, h * FLOOR); c.fill(); } c.globalAlpha = 1;
    c.fillStyle = '#ff7fb4'; c.beginPath(); c.moveTo(w * .08, h * FLOOR + 4); c.lineTo(w * .92, h * FLOOR + 4); c.lineTo(w, h); c.lineTo(0, h); c.fill(); c.fillStyle = '#f0b429'; c.fillRect(w * .06, h * FLOOR, w * .88, 5);
    c.fillStyle = 'rgba(20,10,40,.9)'; for (let i = 0; i < 14; i++) { const x = (i + .5) * w / 14; c.beginPath(); c.arc(x, h * .995 + Math.sin(i * 3) * 4, w * .03, 0, TAU); c.fill(); }
  };

  /* ---------------------------------------------------------------- thumbnails */
  const FOCUS = { who: [0, -72, 50], hair: [0, -64, 76], dress: [0, -28, 74], top: [0, -42, 38], bottom: [0, -20, 46], shoes: [0, -9, 36], hat: [0, -88, 58], face: [0, -72, 46], neck: [0, -52, 36], back: [0, -46, 92], hand: [16, -36, 56], makeup: [0, -72, 46], gems: [0, -72, 44] };
  function drawThumb(cv, look, focus) {
    const c = cv.getContext('2d'), s = cv.width; c.clearRect(0, 0, s, s);
    const U = s / focus[2]; c.save(); c.translate(s / 2 - focus[0] * U, s / 2 - focus[1] * U); P.draw(c, look, 100 * U, 0); c.restore();
  }
  const thumbCv = (px, fn) => { const cv = el('canvas'); const d = SPG.ui.dpr(); cv.width = cv.height = Math.round(px * d); fn(cv); return cv; };

  /* ---------------------------------------------------------------- tabs */
  const TABNAME = { who: 'Friend', hair: 'Hair', makeup: 'Make-up', dress: 'Dresses', top: 'Tops', bottom: 'Bottoms', shoes: 'Shoes', hat: 'Hats', extras: 'Extras', nails: 'Nails', places: 'Places' };
  const TABS = ['who', 'hair', 'makeup', 'dress', 'top', 'bottom', 'shoes', 'hat', 'extras', 'nails', 'places'];
  const CLOTHCAT = { dress: 1, top: 1, bottom: 1, shoes: 1, hat: 1 };
  const TOOLS = ['comb', 'dryer', 'spray', 'bubbles'];
  function toolIcon(c, id, s) {
    c.save(); c.translate(s / 2, s / 2); const u = s / 100; c.scale(u, u); c.lineCap = c.lineJoin = 'round';
    if (id === 'comb') { c.rotate(-.5); c.fillStyle = '#ff8fc0'; art.rr(c, -34, -10, 68, 22, 6); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { art.rr(c, -30 + i * 7.2, 12, 4.4, 20, 2); c.fill(); } c.fillStyle = 'rgba(255,255,255,.5)'; art.rr(c, -30, -6, 40, 5, 2.5); c.fill(); }
    else if (id === 'dryer') { c.rotate(.2); c.fillStyle = '#7fc8f8'; c.beginPath(); c.ellipse(-4, -12, 34, 22, 0, 0, TAU); c.fill(); c.fillStyle = '#4f8fe8'; art.rr(c, 14, -20, 22, 16, 6); c.fill(); c.fillStyle = '#9a6bd6'; art.rr(c, -10, 4, 16, 38, 6); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 4; for (const y of [-18, -10]) { c.beginPath(); c.moveTo(-26, y); c.lineTo(-10, y); c.stroke(); } }
    else if (id === 'spray') { c.fillStyle = '#c9a8f0'; art.rr(c, -16, -8, 32, 50, 9); c.fill(); c.fillStyle = '#fff'; art.rr(c, -12, 8, 24, 18, 5); c.fill(); art.star(c, 0, 17, 6, '#ffd54a', 0); c.fillStyle = '#ff8fc0'; art.rr(c, -10, -22, 24, 14, 5); c.fill(); c.fillRect(-2, -30, 6, 8); for (const [x, y] of [[-26, -20], [-34, -10], [-24, -34], [-38, -26]]) art.star(c, x, y, 5, '#ffe066', 0); }
    else { c.fillStyle = 'rgba(180,225,255,.9)'; c.strokeStyle = '#7fc8f8'; c.lineWidth = 4; for (const [x, y, r] of [[-8, 6, 24], [22, -14, 14], [18, 24, 10], [-26, -20, 9]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x - r * .3, y - r * .3, r * .22, 0, TAU); c.fill(); c.fillStyle = 'rgba(180,225,255,.9)'; } }
    c.restore();
  }

  // Little pictures for the swatches, so a child can see what each row is for (a face for skin, an eye for eye color...).
  function eyeShape(c, cx, cy, w) { c.beginPath(); c.moveTo(cx - w, cy); c.quadraticCurveTo(cx, cy - w * .95, cx + w, cy); c.quadraticCurveTo(cx, cy + w * .85, cx - w, cy); c.closePath(); }
  function rainbowGrad(c, x0, x1) { const g = c.createLinearGradient(x0, 0, x1, 0); ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0'].forEach((k, i, a) => g.addColorStop(i / (a.length - 1), k)); return g; }
  function swatchPic(c, kind, col, s) {
    c.clearRect(0, 0, s, s); const m = s / 2;
    if (kind === 'skin') { c.fillStyle = col; c.beginPath(); c.arc(m, m, s * .46, 0, TAU); c.fill(); c.fillStyle = 'rgba(58,42,48,.75)'; for (const dx of [-1, 1]) { c.beginPath(); c.arc(m + dx * s * .16, m - s * .04, s * .045, 0, TAU); c.fill(); } c.strokeStyle = 'rgba(160,70,80,.8)'; c.lineWidth = s * .045; c.lineCap = 'round'; c.beginPath(); c.arc(m, m + s * .06, s * .14, .3, Math.PI - .3); c.stroke(); c.fillStyle = 'rgba(255,120,130,.3)'; for (const dx of [-1, 1]) { c.beginPath(); c.arc(m + dx * s * .28, m + s * .1, s * .07, 0, TAU); c.fill(); } }
    else if (kind === 'eyes') { c.fillStyle = '#fff'; c.strokeStyle = 'rgba(58,42,48,.8)'; c.lineWidth = s * .05; eyeShape(c, m, m, s * .44); c.fill(); c.stroke(); c.save(); eyeShape(c, m, m, s * .44); c.clip(); c.fillStyle = col; c.beginPath(); c.arc(m, m, s * .25, 0, TAU); c.fill(); c.fillStyle = '#20141a'; c.beginPath(); c.arc(m, m, s * .12, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(m - s * .07, m - s * .08, s * .06, 0, TAU); c.fill(); c.restore(); }
    else if (kind === 'lips') { c.fillStyle = col === 'rainbow' ? rainbowGrad(c, m - s * .4, m + s * .4, s) : col; c.beginPath(); c.moveTo(m - s * .4, m); c.quadraticCurveTo(m - s * .18, m - s * .34, m, m - s * .12); c.quadraticCurveTo(m + s * .18, m - s * .34, m + s * .4, m); c.quadraticCurveTo(m, m + s * .42, m - s * .4, m); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(m - s * .3, m); c.quadraticCurveTo(m, m + s * .08, m + s * .3, m); c.stroke(); }
    else if (kind === 'shadow') { c.fillStyle = '#fbe0cf'; c.beginPath(); c.arc(m, m, s * .46, 0, TAU); c.fill(); c.fillStyle = col; c.globalAlpha = .9; c.beginPath(); c.ellipse(m, m - s * .04, s * .36, s * .2, 0, Math.PI, TAU); c.fill(); c.globalAlpha = 1; c.strokeStyle = 'rgba(58,42,48,.85)'; c.lineWidth = s * .05; c.lineCap = 'round'; c.beginPath(); c.arc(m, m - s * .04, s * .3, .3, Math.PI - .3); c.stroke(); }
    else if (kind === 'blush') { c.fillStyle = '#fbe0cf'; c.beginPath(); c.arc(m, m, s * .46, 0, TAU); c.fill(); c.fillStyle = col; c.globalAlpha = .8; c.beginPath(); c.ellipse(m, m + s * .04, s * .3, s * .2, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
  }
  function secIcon(c, kind, s, look) {
    c.clearRect(0, 0, s, s);
    if (kind === 'skin') swatchPic(c, 'skin', P.SKIN[look.skin % P.SKIN.length], s);
    else if (kind === 'eyes') swatchPic(c, 'eyes', P.EYES[look.eyes % P.EYES.length], s);
    else if (kind === 'lips') swatchPic(c, 'lips', P.LIPS[look.lips || 0] || '#ef4a6a', s);
    else if (kind === 'shadow') swatchPic(c, 'shadow', P.SHADOW[look.shadow || 0] || '#c9a8f0', s);
    else swatchPic(c, 'blush', P.BLUSH[look.blush || 0] || '#ff9fb0', s);
  }

  /* ---------------------------------------------------------------- the game */
  class StyleStudio {
    constructor(host) {
      this.host = host; this.root = el('div', 'st'); host.append(this.root);
      const b = this.bag = store.bag('style', () => ({ v: 1, kids: {}, cur: 0, place: 0, shows: 0, last: '' }));
      if (!b.kids) b.kids = {};
      b.cuts = Array.isArray(b.cuts) ? b.cuts : [];   // hairstyles cut in the salon (strands, see js/hair.js); P.cuts holds them ready to draw
      for (const q of b.cuts) { const h = SPG.hair.unpack(q.d); if (h) P.cuts[q.id] = h; }
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.tab = 'dress'; this.tool = null; this.sway = 0; this.hop = 0; this.wave = 0; this.foam = 0; this.show = null;
      this.nailColor = 3; this.nailArt = 0; this.glitter = false; this.ptr = null; this.down = false; this.lastNail = -1; this.lastMove = null; this.travel = 0; this.blowT = 0;
      this.build(); this.loadKid(b.cur | 0); this.renderPanel();
      document.body.classList.add('st-open');
      this.later(() => say('say-start'), 600);
    }
    later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); (this.timers || (this.timers = new Set())).add(id); }
    start() { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick = this.tick.bind(this)); this.fit(); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); }
    resume() { if (!this.running && !this.salon) this.start(); }
    resize() { this.fit(); this.renderPanel(); }
    destroy() { this.salon && this.salon.close(); this.pause(); this.ro && this.ro.disconnect(); (this.timers || []).forEach(clearTimeout); this.saveNow(); document.body.classList.remove('st-open'); this.root.remove(); }

    /* -------------------------------------------------------------- looks */
    loadKid(i) {
      this.bag.cur = i; const saved = this.bag.kids[i];
      this.look = saved ? Object.assign(baseLook(i), saved) : baseLook(i);
      if (!this.look.nails || this.look.nails.length !== 10) this.look.nails = new Array(10).fill(-1);
      if (!this.look.nailArt || this.look.nailArt.length !== 10) this.look.nailArt = new Array(10).fill(0);
      if (!this.look.nailGlitter || this.look.nailGlitter.length !== 10) this.look.nailGlitter = new Array(10).fill(false);
    }
    saveSoon() { clearTimeout(this._sv); this._sv = setTimeout(() => this.saveNow(), 400); }
    saveNow() { clearTimeout(this._sv); this.bag.kids[this.bag.cur] = this.look; store.save(); }
    lookKey() { return JSON.stringify([this.bag.cur, this.look]); }
    change(fields, quiet) {
      Object.assign(this.look, fields); this.saveSoon();
      if (!quiet) { const p = this.headPos(); this.fx.burst(p.x, p.y + p.U * 12, 8, { colors: ['#ffe066', '#ff9fc8', '#fff', '#bfe6ff'], speed: 140, g: 40, life: .7, size: 6, shape: 'star', up: 40 }); this.hop = Math.max(this.hop, .5); }
      this.renderPanel(true);
    }

    /* -------------------------------------------------------------- the hair salon */
    openSalon() {
      if (this.salon) return; sfx.tap(); this.pause();
      this.salon = SPG.salon.open(this.host, { look: this.look, onSave: (d, col) => this.saveCut(d, col), onClose: () => { this.salon = null; this.resume(); this.renderPanel(); } });
    }
    saveCut(d, col) {
      const cuts = this.bag.cuts, id = 'c' + Date.now().toString(36);
      cuts.push({ id, d }); P.cuts[id] = SPG.hair.unpack(d);
      while (this.bag.cuts.length > 6) this.dropCut(this.bag.cuts[0].id);
      this.change({ hair: 'cut:' + id, hairCol: col }, true); this.saveNow();
    }
    dropCut(id) {   // nobody is left wearing a hairstyle that is thrown away
      this.bag.cuts = this.bag.cuts.filter(q => q.id !== id); delete P.cuts[id];
      const same = 'cut:' + id; for (const k of Object.keys(this.bag.kids)) if (this.bag.kids[k] && this.bag.kids[k].hair === same) this.bag.kids[k].hair = 'long';
      if (this.look.hair === same) this.look.hair = 'long';
    }

    /* -------------------------------------------------------------- layout */
    build() {
      this.cv = el('canvas', 'st-cv'); this.stage = el('section', 'st-stage', this.cv);
      this.showBtn = btn('st-show', 'Show off on the runway', icon('rosette')); SPG.ui.press(this.showBtn, () => this.startShow());
      this.diceBtn = btn('st-dice', 'Surprise me', icon('dice')); SPG.ui.press(this.diceBtn, () => this.surprise());
      this.toolBar = el('div', 'st-tools'); this.toolBtns = {};
      for (const id of TOOLS) {
        const cv = thumbCv(64, cv => toolIcon(cv.getContext('2d'), id, cv.width)); const b = btn('st-tool', id, cv); this.toolBtns[id] = b;
        b.addEventListener('click', () => { this.tool = this.tool === id ? null : id; sfx.tap(); if (this.tool) say('tool-' + id); this.markTools(); });
        this.toolBar.append(b);
      }
      this.stage.append(this.toolBar, this.diceBtn, this.showBtn);
      this.tabs = el('div', 'st-tabs'); this.body = el('div', 'st-body'); this.colors = el('div', 'st-colors');
      this.body.setAttribute('data-scroll', '');
      this.more = btn('st-more', 'See more', icon('left'));
      this.more.addEventListener('click', () => { this.body.scrollBy({ top: Math.max(120, this.body.clientHeight * .8), behavior: 'smooth' }); sfx.tap(); });
      this.body.addEventListener('scroll', () => this.updateMore(), { passive: true });
      this.bodyWrap = el('div', 'st-bodywrap', this.body, this.more);
      this.panel = el('section', 'st-panel', this.tabs, this.bodyWrap, this.colors);
      this.root.append(this.stage, this.panel);
      this.cv.addEventListener('pointerdown', e => this.pDown(e));
      this.cv.addEventListener('pointermove', e => this.pMove(e));
      const up = e => this.pUp(e); this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', up); this.cv.addEventListener('pointerleave', up);
      this.cv.addEventListener('contextmenu', e => e.preventDefault());
      if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(this.stage); }
    }
    fit() {
      const r = this.cv.getBoundingClientRect(); if (!r.width) return;
      const d = SPG.ui.dpr(); this.w = r.width; this.h = r.height; this.d = d;
      this.cv.width = Math.round(r.width * d); this.cv.height = Math.round(r.height * d);
    }
    // where the figure stands and how big she is (U = pixels per figure unit)
    figure() { const U = Math.min(this.h * FLOOR * .98 / 122, this.w / 100); return { x: this.w / 2, y: this.h * FLOOR, U, s: 100 * U }; }
    headPos() { const f = this.figure(); return { x: f.x + P.HEAD.x * f.U, y: f.y + P.HEAD.y * f.U, U: f.U }; }
    markTools() { for (const id of TOOLS) this.toolBtns[id].classList.toggle('on', this.tool === id); this.cv.classList.toggle('tooling', !!this.tool); }

    /* -------------------------------------------------------------- the side panel */
    renderPanel(keep) {
      const top = this.body.scrollTop;
      this.tabs.replaceChildren(); this.body.replaceChildren(); this.colors.replaceChildren();
      this.root.dataset.tab = this.tab; this.toolBar.classList.toggle('hidden', this.tab !== 'hair'); if (this.tab !== 'hair') { this.tool = null; this.markTools(); }
      const look = this.look;
      for (const id of TABS) {
        const cv = thumbCv(56, cv => {
          const c = cv.getContext('2d'), s = cv.width;
          if (id === 'nails') { c.save(); c.translate(s * .5, s * .5); P.drawHand(c, Object.assign({}, look, { nails: [3, 8, 1, 5, 9, 0, 0, 0, 0, 0] }), 0, s * .5); c.restore(); }
          else if (id === 'places') { c.save(); c.beginPath(); c.arc(s / 2, s / 2, s / 2, 0, TAU); c.clip(); PLACES[this.bag.place | 0](c, s, s, 0); c.restore(); }
          else if (id === 'extras') drawThumb(cv, Object.assign({}, look, { back: 'fairy', backCol: 9, hat: null }), FOCUS.back);
          else if (id === 'who') drawThumb(cv, look, FOCUS.who);
          else if (id === 'makeup') drawThumb(cv, Object.assign({}, look, { lips: 2, shadow: 2, blush: 1, gems: 1 }), FOCUS.makeup);
          else if (id === 'hair') drawThumb(cv, Object.assign({}, look, { hat: null }), FOCUS.hair);
          else drawThumb(cv, this.thumbLook(id, id === 'dress' ? 'ball' : id === 'top' ? 'tee' : id === 'bottom' ? 'skirt' : id === 'shoes' ? 'boots' : 'crown'), FOCUS[id]);
        });
        const b = btn('st-tab' + (id === this.tab ? ' on' : ''), TABNAME[id], cv, el('span', 'st-tab-l', TABNAME[id]));
        onTap(b, () => { if (this.tab === id) return; this.tab = id; sfx.tap(); say('tab-' + id); if (id === 'nails') this.later(() => say('say-nails'), 900); this.renderPanel(); });
        this.tabs.append(b);
      }
      const T = this.tab;
      if (T === 'who') {
        const g = el('div', 'st-grid st-friends');
        PRESETS.forEach((_, i) => { g.append(this.tile(cv => drawThumb(cv, this.bag.cur === i ? look : (this.bag.kids[i] ? Object.assign(baseLook(i), this.bag.kids[i]) : baseLook(i)), FOCUS.who), this.bag.cur === i, 'who-' + i, () => { this.saveNow(); this.loadKid(i); this.hop = .8; sfx.chime(); this.renderPanel(); })); });
        this.body.append(g, this.section('skin', 'Skin', () => this.swatchRow('skin', P.SKIN, null, { title: 'skin', kind: 'skin', big: true })), this.section('eyes', 'Eyes', () => this.swatchRow('eyes', P.EYES, null, { title: 'eyes', kind: 'eyes', big: true })));
      } else if (T === 'hair') {
        const g = el('div', 'st-grid');
        // the salon: fix a messy hairstyle with scissors, a brush, a spray bottle and a dryer; what she makes is kept as 'my hairstyles'
        g.append(this.tile(cv => { const c = cv.getContext('2d'), s = cv.width; c.save(); c.fillStyle = '#ffe3f0'; c.beginPath(); c.arc(s / 2, s / 2, s * .46, 0, TAU); c.fill(); c.translate(s * .5, s * .62); SPG.salon.drawIcon(c, 'scissors', s * .26); c.restore(); }, false, 'hair-salon', () => this.openSalon()));
        for (const q of this.bag.cuts) g.append(this.tile(cv => drawThumb(cv, Object.assign({}, look, { hair: 'cut:' + q.id, hat: null }), FOCUS.hair), look.hair === 'cut:' + q.id, 'hair-mine', () => { this.change({ hair: 'cut:' + q.id }); sfx.rustle(); }));
        for (const id of P.HAIR) g.append(this.tile(cv => drawThumb(cv, Object.assign({}, look, { hair: id, hat: null }), FOCUS.hair), look.hair === id, 'hair-' + id, () => { this.change({ hair: id }); sfx.rustle(); }));
        this.body.append(g); this.colors.append(this.swatchRow('hairCol', P.HAIRC, null, {}));
      } else if (T === 'makeup') {
        const face = (o) => cv => drawThumb(cv, Object.assign({}, look, o), FOCUS.makeup);
        this.body.append(
          this.section('lips', 'Lips', () => this.swatchRow('lips', P.LIPS, null, { none: true, title: 'lips', kind: 'lips', big: true })),
          this.section('shadow', 'Eyeshadow', () => this.swatchRow('shadow', P.SHADOW, null, { none: true, title: 'shadow', kind: 'shadow', big: true })),
          this.section('blush', 'Cheeks', () => this.swatchRow('blush', P.BLUSH, null, { none: true, title: 'blush', kind: 'blush', big: true })));
        const g = el('div', 'st-grid'); g.dataset.title = 'gems';
        g.append(this.tile(cv => drawThumb(cv, Object.assign({}, look, { freckles: !look.freckles }), FOCUS.makeup), !!look.freckles, 'say-freckles', () => { this.change({ freckles: !look.freckles }); sfx.plink(2); }, true));
        P.GEMS.forEach((gm, i) => g.append(this.tile(face({ gems: i }), (look.gems | 0) === i, 'say-gems', () => { this.change({ gems: i }); sfx.plink(i); }, true)));
        this.body.append(g);
      } else if (CLOTHCAT[T]) {
        this.body.append(this.itemGrid(T)); this.colors.append(this.swatchRow(P.COLKEY[T], P.CLOTH, null, {}));
      } else if (T === 'extras') {
        for (const cat of ['back', 'face', 'neck', 'hand']) this.body.append(this.itemGrid(cat));
        this.colors.append(this.swatchRow('extraCol', P.CLOTH, null, {}), this.swatchRow('backCol', P.CLOTH, null, { small: true }));
      } else if (T === 'nails') {
        this.body.append(this.nailControls()); this.colors.append(this.nailSwatches());
      } else if (T === 'places') {
        const g = el('div', 'st-grid st-places');
        PLACES.forEach((fn, i) => g.append(this.tile(cv => { const c = cv.getContext('2d'); c.save(); const s = cv.width; c.beginPath(); art.rr(c, 0, 0, s, s, s * .16); c.clip(); c.scale(s / 200, s / 200); fn(c, 200, 200, 0); c.restore(); }, (this.bag.place | 0) === i, 'place-' + i, () => { this.bag.place = i; this.saveNow(); sfx.whoosh(); this.renderPanel(); }, false, true)));
        this.body.append(g);
      }
      if (keep) this.body.scrollTop = top;
      if (this.picker) { if (['who', 'makeup'].includes(this.tab)) this.renderPicker(); else { this.picker = null; if (this.modal) { this.modal.remove(); this.modal = null; } } }
      requestAnimationFrame(() => this.updateMore());
    }
    updateMore() { const b = this.body; this.more.classList.toggle('show', b.scrollHeight - b.clientHeight - b.scrollTop > 24); }
    thumbLook(cat, id) {
      const l = Object.assign({}, this.look);
      if (cat === 'dress') { l.dress = id; l.hat = null; }
      else if (cat === 'top') { l.dress = null; l.top = id; l.bottom = l.bottom || 'jeans'; }
      else if (cat === 'bottom') { l.dress = null; l.bottom = id; l.top = l.top || 'tee'; }
      else if (cat === 'shoes') { l.shoes = id; l.dress = null; l.bottom = 'shorts'; }
      else { l[cat] = id; }
      return l;
    }
    tile(draw, on, voiceKey, fn, small, wide) {
      const px = wide ? 92 : 84, cv = thumbCv(px, draw), b = btn('st-tile' + (on ? ' on' : '') + (small ? ' small' : ''), voiceKey, cv);
      onTap(b, () => { say(voiceKey); fn(); });
      return b;
    }
    itemGrid(cat) {
      const g = el('div', 'st-grid'); g.dataset.cat = cat;
      const none = btn('st-tile none' + (!this.look[cat] ? ' on' : ''), 'none', icon('x'));
      onTap(none, () => { sfx.whoosh(); this.change({ [cat]: null }, true); });
      g.append(none);
      for (const it of P.CATS[cat]) {
        g.append(this.tile(cv => drawThumb(cv, this.thumbLook(cat, it.id), FOCUS[cat]), this.look[cat] === it.id, cat + '-' + it.id, () => { this.change(cat === 'top' || cat === 'bottom' ? { [cat]: it.id, dress: null } : { [cat]: it.id }); this.itemSfx(cat); }));
      }
      return g;
    }
    itemSfx(cat) { if (cat === 'shoes') sfx.snap(); else if (cat === 'hat') sfx.plink(3); else if (cat === 'back' || cat === 'dress') sfx.chime(); else sfx.rustle(); }
    // A titled section of picture swatches: a face for skin, an eye for eye color, lips, and so on.
    // A compact tile showing what is chosen now. Touching it opens a pop-out with all the choices (one touch); the X or touching outside closes it.
    section(kind, title, build) {
      const ic = thumbCv(56, cv => secIcon(cv.getContext('2d'), kind, cv.width, this.look));
      ic.className = 'st-sec-ico';
      const chip = btn('st-chip' + (this.picker && this.picker.kind === kind ? ' open' : ''), title, ic, el('b', '', title), icon('right'));
      SPG.ui.press(chip, () => { sfx.tap(); this.openPicker(kind, title, build); });
      return chip;
    }
    openPicker(kind, title, build) { this.picker = { kind, title, build }; this.renderPicker(); }
    closePicker() { if (!this.picker) return; this.picker = null; if (this.modal) { this.modal.remove(); this.modal = null; } sfx.tap(); this.root.querySelectorAll('.st-chip.open').forEach(c => c.classList.remove('open')); }
    renderPicker() {
      if (!this.picker) return; const { kind, title, build } = this.picker;
      if (this.modal) this.modal.remove();
      const ic = thumbCv(56, cv => secIcon(cv.getContext('2d'), kind, cv.width, this.look)); ic.className = 'st-sec-ico';
      const x = btn('st-modal-x', 'Close', icon('x')); SPG.ui.press(x, () => this.closePicker());
      const card = el('div', 'st-modal-card', el('div', 'st-modal-head', ic, el('b', '', title), x), build());
      const back = el('div', 'st-modal', card); back.addEventListener('pointerdown', e => { if (e.target === back) { e.preventDefault(); this.closePicker(); } });
      this.root.append(back); this.modal = back;
    }
    swatchRow(key, list, voiceKey, o) {
      const row = el('div', 'st-sw-row' + (o.small ? ' small' : '') + (o.big ? ' big' : '')); if (o.title) row.dataset.title = o.title;
      list.forEach((k, i) => {
        const b = btn('st-sw' + ((this.look[key] | 0) === i && (this.look[key] != null) ? ' on' : '') + (o.kind ? ' pic' : ''), (o.title || 'color') + ' ' + (i + 1));
        if (o.kind && k !== null) { const cv = thumbCv(64, cv => swatchPic(cv.getContext('2d'), o.kind, k, cv.width)); b.append(cv); }
        else if (k === null) { b.classList.add('none'); b.append(icon('x')); } else if (k === 'rainbow') b.style.background = 'conic-gradient(#ff6b81, #ffa64d, #ffe066, #7ed957, #5cc8f2, #8a7cf0, #ff6b81)'; else b.style.background = k;
        onTap(b, () => { this.change({ [key]: i }); sfx.plink(i); });   // choosing a colour is silent: the picture says it all
        row.append(b);
      });
      return row;
    }

    /* -------------------------------------------------------------- nails */
    nailSwatches() {
      const row = el('div', 'st-sw-row');
      const clean = btn('st-sw none' + (this.nailColor < 0 ? ' on' : ''), 'clean nails', icon('x')); onTap(clean, () => { this.nailColor = -1; sfx.tap(); this.renderPanel(true); }); row.append(clean);
      P.NAIL.forEach((k, i) => { const b = btn('st-sw' + (this.nailColor === i ? ' on' : ''), 'polish ' + i); b.style.background = k; onTap(b, () => { this.nailColor = i; sfx.plink(i); this.renderPanel(true); }); row.append(b); });
      return row;
    }
    nailControls() {
      const wrap = el('div', 'st-nails');
      const g = el('div', 'st-grid');
      P.NAILART.forEach((id, i) => {
        g.append(this.tile(cv => { const c = cv.getContext('2d'), s = cv.width; c.fillStyle = P.SKIN[this.look.skin % P.SKIN.length]; art.rr(c, s * .1, s * .1, s * .8, s * .8, s * .2); c.fill(); c.save(); c.translate(0, 0); P.nailDraw(c, { x: s / 2, y: s * .16, w: s * .46, h: s * .66, rot: 0 }, P.NAIL[this.nailColor < 0 ? 3 : this.nailColor], this.glitter, i, 0); c.restore(); }, this.nailArt === i, 'say-nails', () => { this.nailArt = i; sfx.plink(i); this.renderPanel(true); }, false));
      });
      const gl = btn('st-tile glitter' + (this.glitter ? ' on' : ''), 'glitter', icon('star')); onTap(gl, () => { this.glitter = !this.glitter; say('say-glitter'); sfx.chime(); this.renderPanel(true); }); g.prepend(gl);
      const all = btn('st-tile all', 'paint all nails', icon('brush')); onTap(all, () => { say('say-all'); this.paintAll(); });
      const clr = btn('st-tile clear', 'clean all nails', icon('again')); onTap(clr, () => { say('say-clear'); this.change({ nails: new Array(10).fill(-1), nailArt: new Array(10).fill(0), nailGlitter: new Array(10).fill(false) }, true); sfx.whoosh(); });
      g.append(all, clr);
      wrap.append(g); return wrap;
    }
    paintNail(idx, quiet) {
      const L = this.look, k = this.nailColor;
      if (k < 0) { L.nails[idx] = -1; L.nailArt[idx] = 0; L.nailGlitter[idx] = false; }
      else { L.nails[idx] = k; L.nailArt[idx] = this.nailArt; L.nailGlitter[idx] = this.glitter; }
      this.saveSoon();
      if (!quiet) { const hand = idx >= 5 ? 1 : 0, g = this.handGeom(hand), p = P.nailPos(idx % 5, hand, g.s); this.fx.burst(g.x + p.x, g.y + p.y, 7, { colors: [P.NAIL[Math.max(k, 0)], '#fff', '#ffe066'], speed: 120, g: 60, life: .6, size: 5, shape: 'star', up: 30 }); sfx.plink(idx); }
    }
    paintAll() { for (let i = 0; i < 10; i++) this.paintNail(i, true); sfx.chime(); this.fx.burst(this.w / 2, this.h / 2, 30, { colors: ['#ffe066', '#ff9fc8', '#fff'], speed: 260, g: 120, life: 1, size: 7, shape: 'star', up: 80 }); this.renderPanel(true); }
    handGeom(hand) { const s = Math.min(this.h * .56, this.w * .36), U = s / 100; return { s, x: this.w * (hand ? .76 : .24), y: this.h * .5 - 21 * U }; }

    /* -------------------------------------------------------------- touching the stage */
    pt(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    pDown(e) {
      if (this.show) { this.endShow(); return; }
      e.preventDefault(); try { this.cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const p = this.pt(e); this.ptr = p; this.down = true; this.lastMove = p; this.travel = 0;
      if (this.tab === 'nails') { this.lastNail = -1; this.nailAtPoint(p); return; }
      const hp = this.headPos(), near = Math.hypot(p.x - hp.x, p.y - hp.y) < hp.U * 34;
      if (this.tool === 'spray') { this.sparkleAt(p); sfx.spray(); this.sway = .05; }
      else if (this.tool === 'bubbles') { this.bubbleAt(p, near); }
      else if (this.tool === 'dryer') { this.blowT = 0; }
      else if (!this.tool) { const f = this.figure(); if (Math.abs(p.x - f.x) < f.U * 34 && p.y > f.y - f.U * 100 && p.y < f.y) { this.hop = 1; this.wave = 1.4; sfx.boing(); this.fx.burst(p.x, p.y, 6, { colors: ['#ff7a8a', '#ff9db8'], speed: 110, g: -60, life: 1, size: 8, shape: 'heart' }); } }
    }
    pMove(e) {
      if (!this.down) return;
      const p = this.pt(e); this.ptr = p;
      const d = Math.hypot(p.x - this.lastMove.x, p.y - this.lastMove.y); this.travel += d;
      if (this.tab === 'nails') { this.nailAtPoint(p); this.lastMove = p; return; }
      if (this.tool === 'comb') { this.sway = Math.max(-.14, Math.min(.14, this.sway + (p.x - this.lastMove.x) * .0016)); if (this.travel > 40) { this.travel = 0; this.sparkleAt(p, 3); sfx.brush(); } }
      else if (this.tool === 'bubbles') { const hp = this.headPos(); this.bubbleAt(p, Math.hypot(p.x - hp.x, p.y - hp.y) < hp.U * 34); }
      this.lastMove = p;
    }
    pUp() { this.down = false; this.ptr = null; this.lastNail = -1; }
    nailAtPoint(p) {
      for (const hand of [0, 1]) {
        const g = this.handGeom(hand), i = P.nailAt(p.x - g.x, p.y - g.y, hand, g.s), idx = hand * 5 + i;
        if (i >= 0 && idx !== this.lastNail) { this.lastNail = idx; this.paintNail(idx); return; }
      }
    }
    sparkleAt(p, n = 16) { this.fx.burst(p.x, p.y, n, { colors: ['#ffe066', '#ff9fc8', '#bfe6ff', '#fff', '#c9a8f0'], speed: 200, g: 120, life: .9, size: 6, shape: 'star', up: 40 }); }
    bubbleAt(p, onHead) {
      if (!this._bt || performance.now() - this._bt > 90) {
        this._bt = performance.now(); this.fx.burst(p.x, p.y, 3, { colors: ['rgba(255,255,255,.95)', 'rgba(190,230,255,.9)'], speed: 70, g: -50, life: 1.1, size: 9, shape: 'circle', up: 30 });
        if (onHead) this.foam = Math.min(1, this.foam + .05); if (Math.random() < .35) sfx.bubble();
      }
    }

    /* -------------------------------------------------------------- surprise and show */
    surprise() {
      const boy = this.look.gender === 'boy', L = this.look, pickC = () => Math.floor(Math.random() * P.CLOTH.length);
      const o = { hair: rnd(P.HAIR.filter(h => h !== 'none')), hairCol: Math.floor(Math.random() * P.HAIRC.length), lips: boy ? 0 : Math.floor(Math.random() * 4), shadow: boy ? 0 : Math.floor(Math.random() * 3), blush: Math.floor(Math.random() * 3), gems: Math.random() < .3 ? 1 + Math.floor(Math.random() * 4) : 0,
        shoes: rnd(P.CATS.shoes).id, shoesCol: pickC(), hat: Math.random() < .7 ? rnd(P.CATS.hat).id : null, hatCol: pickC(), back: Math.random() < .5 ? rnd(P.CATS.back).id : null, backCol: pickC(),
        hand: Math.random() < .5 ? rnd(P.CATS.hand).id : null, neck: Math.random() < .4 ? rnd(P.CATS.neck).id : null, face: Math.random() < .2 ? rnd(P.CATS.face).id : null, extraCol: pickC() };
      if (!boy || Math.random() < .3) { o.dress = rnd(P.CATS.dress).id; o.dressCol = pickC(); } else { o.dress = null; o.top = rnd(P.CATS.top).id; o.topCol = pickC(); o.bottom = rnd(P.CATS.bottom.filter(b => b.id !== 'tutuskirt')).id; o.bottomCol = pickC(); }
      Object.assign(L, o); this.saveSoon(); sfx.chime(); this.hop = 1;
      for (let i = 0; i < 3; i++) this.later(() => this.fx.burst(this.w * (.3 + Math.random() * .4), this.h * (.25 + Math.random() * .4), 10, { colors: ['#ffe066', '#ff9fc8', '#fff', '#bfe6ff'], speed: 220, g: 90, life: .9, size: 7, shape: 'star', up: 60 }), i * 140);
      this.renderPanel(true);
    }
    startShow() {
      if (this.show) return; this.saveNow(); sfx.whoosh();
      this.show = { t: 0, dur: 8, fan: false, fan2: false }; this.root.classList.add('showing'); this.tool = null; this.markTools();
    }
    endShow() {
      if (!this.show) return; const key = this.lookKey(); this.show = null; this.root.classList.remove('showing');
      if (this.bag.last !== key) { this.bag.last = key; this.bag.shows = (this.bag.shows | 0) + 1; store.addStars(1); const st = document.getElementById('stage-stars'); if (st) st.textContent = store.active.stars; }
      store.save(); sfx.win();
    }

    /* -------------------------------------------------------------- the picture */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt;
      this.update(dt); this.draw(); this.raf = requestAnimationFrame(this.tick);
    }
    update(dt) {
      this.fx.update(dt); this.hop = Math.max(0, this.hop - dt * 2.4); this.wave = Math.max(0, this.wave - dt);
      if (this.tool === 'dryer' && this.down) { this.blowT += dt; this.sway = Math.sin(this.t * 13) * .1 + .05; this._wt = (this._wt || 0) - dt; if (this._wt <= 0) { this._wt = .28; sfx.whoosh(); } if (this.ptr) this.fx.burst(this.ptr.x, this.ptr.y, 1, { colors: ['rgba(255,255,255,.8)'], speed: 220, g: 0, life: .5, size: 7, shape: 'circle', up: 0 }); }
      else this.sway *= Math.pow(.02, dt);
      if (!(this.tool === 'bubbles' && this.down)) this.foam = Math.max(0, this.foam - dt * .25);
      const s = this.show;
      if (s) {
        s.t += dt; if (!s.fan && s.t > 2.6) { s.fan = true; sfx.cheer(); say('say-show'); }
        if (s.t > 2.6 && s.t < 7 && Math.random() < dt * 7) { this.fx.burst(this.w * (.15 + Math.random() * .7), this.h * (.1 + Math.random() * .4), 14, { colors: ['#ff6b81', '#ffd54a', '#7ed957', '#5cc8f2', '#c9a8f0', '#fff'], speed: 320, g: 420, life: 1.5, size: 8, shape: Math.random() < .5 ? 'confetti' : 'star', up: 200 }); }
        if (s.t > 2.6 && Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4) && Math.random() < .6) s.flash = .35;
        s.flash = Math.max(0, (s.flash || 0) - dt);
        if (s.t >= s.dur) this.endShow();
      }
    }
    draw() {
      if (!this.w) return;
      const c = this.cv.getContext('2d'), d = this.d; c.setTransform(d, 0, 0, d, 0, 0);
      const w = this.w, h = this.h, t = this.t, s = this.show;
      const night = NIGHT = !s && SPG.night.on();
      if (this.tab === 'nails' && !s) this.drawSalonTable(c, w, h, t, night);
      else {
        (s ? RUNWAY : PLACES[this.bag.place | 0] || PLACES[0])(c, w, h, t);
        const f = this.figure();
        if (night) this.lampLight(c, w, h, t, f.x, f.y, f.U * 66, f.U); let x = f.x, sc = 1, wave = this.wave > 0, hop = Math.abs(Math.sin(Math.min(1, this.hop) * Math.PI)) * f.U * 4 * this.hop;
        if (s) {
          const walk = Math.min(1, s.t / 2.6), e = 1 - Math.pow(1 - walk, 3);
          x = -f.U * 40 + (f.x + f.U * 40) * e; hop = walk < 1 ? Math.abs(Math.sin(s.t * 7)) * f.U * 2.2 : 0;
          if (s.t > 3.4 && s.t < 5.6) sc = Math.cos((s.t - 3.4) / 2.2 * TAU); wave = s.t > 5.6;
          if (s.t > 2.6) hop = Math.abs(Math.sin(s.t * 5)) * f.U * 1.2 * (s.t > 5.6 ? 1 : 0);
        }
        c.save(); c.translate(x, f.y - hop); if (Math.abs(sc) < 1) c.scale(sc, 1);
        P.draw(c, this.look, f.s, t, { wave, sway: this.sway });
        this.drawFoam(c, f); c.restore();
        if (s && s.flash > 0) { c.fillStyle = `rgba(255,255,255,${s.flash * 1.6})`; c.fillRect(0, 0, w, h); }
      }
      this.fx.draw(c);
      if (this.tool && this.ptr && this.tab !== 'nails') { const sz = Math.min(90, this.w * .16); const ic = this._ic || (this._ic = {}); if (!ic[this.tool]) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; toolIcon(cv.getContext('2d'), this.tool, 128); ic[this.tool] = cv; } c.drawImage(ic[this.tool], this.ptr.x - sz * .5, this.ptr.y - sz * .8, sz, sz); }
    }
    drawFoam(c, f) {
      if (this.foam <= .02) return; const R = P.HEAD.R, n = Math.floor(this.foam * 18); c.save(); c.translate(P.HEAD.x, P.HEAD.y - R * .55);
      for (let i = 0; i < n; i++) { const a = Math.PI * (1.02 + (i * 37 % 100) / 100 * .96), rr = R * (.55 + (i * 53 % 100) / 100 * .6); c.fillStyle = i % 3 ? 'rgba(255,255,255,.95)' : 'rgba(205,235,255,.95)'; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr * .8 + R * .3, R * (.22 + (i % 4) * .05), 0, TAU); c.fill(); }
      c.restore(); void f;
    }
    // Night mode: the room goes dark and a little lamp hangs over her, lighting her (and a pool of floor) like a real lamp.
    // The figure is drawn after this, at full brightness, so her outfit and hair stay bright while the background is moody.
    lampLight(c, w, h, t, x, floorY, spread, U) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(8,12,52,.62)'); g.addColorStop(1, 'rgba(12,16,58,.5)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const sw = Math.sin(t * .9) * U * .6, lx = x + sw, top = h * .085, half = Math.max(U * 9, w * .03);
      // soft cone of warm light (three nested layers make the edges gentle)
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const k = 1 - i * .22, hw = spread * k, cg = c.createLinearGradient(0, top, 0, floorY); cg.addColorStop(0, 'rgba(255,236,170,.22)'); cg.addColorStop(1, 'rgba(255,224,150,.07)');
        c.fillStyle = cg; c.beginPath(); c.moveTo(lx - half * .9, top + half * .5); c.lineTo(lx + half * .9, top + half * .5); c.lineTo(x + hw, floorY); c.lineTo(x - hw, floorY); c.closePath(); c.fill();
      }
      const pool = c.createRadialGradient(x, floorY, 0, x, floorY, spread * 1.05); pool.addColorStop(0, 'rgba(255,230,160,.34)'); pool.addColorStop(1, 'rgba(255,230,160,0)');
      c.fillStyle = pool; c.beginPath(); c.ellipse(x, floorY, spread * 1.05, spread * .2, 0, 0, TAU); c.fill(); c.restore();
      // the lamp: cord, shade and glowing bulb
      c.strokeStyle = '#2a2244'; c.lineWidth = Math.max(2, U * .5); c.beginPath(); c.moveTo(lx - sw * .4, 0); c.lineTo(lx, top - half * .3); c.stroke();
      c.fillStyle = '#ffe9a8'; c.beginPath(); c.ellipse(lx, top + half * .55, half * .42, half * .3, 0, 0, TAU); c.fill();
      c.fillStyle = '#f0b429'; c.beginPath(); c.moveTo(lx - half * .28, top - half * .35); c.lineTo(lx + half * .28, top - half * .35); c.lineTo(lx + half, top + half * .5); c.lineTo(lx - half, top + half * .5); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.moveTo(lx - half * .2, top - half * .3); c.lineTo(lx - half * .05, top - half * .3); c.lineTo(lx - half * .45, top + half * .45); c.lineTo(lx - half * .7, top + half * .45); c.fill();
      const gl = c.createRadialGradient(lx, top + half * .6, 0, lx, top + half * .6, half * 2.2); gl.addColorStop(0, 'rgba(255,240,180,.55)'); gl.addColorStop(1, 'rgba(255,240,180,0)'); c.fillStyle = gl; c.beginPath(); c.arc(lx, top + half * .6, half * 2.2, 0, TAU); c.fill();
    }
    drawSalonTable(c, w, h, t, night) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe4ef'); g.addColorStop(1, '#ffc9de'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 14; i++) { const x = (i * 131 % 100) / 100 * w, y = (i * 71 % 100) / 100 * h; art.star(c, x, y, 5 + (i % 3) * 2, '#fff', 0); }
      if (night) { const g3 = this.handGeom(0), g4 = this.handGeom(1); this.lampLight(c, w, h, t, w / 2, h * .96, Math.max(w * .3, g3.s * 1.5), g3.s / 30); void g4; }
      for (const hand of [0, 1]) { const g2 = this.handGeom(hand); c.save(); c.translate(g2.x, g2.y); P.drawHand(c, this.look, hand, g2.s, t); c.restore(); }
      const k = this.nailColor < 0 ? '#e8e0f0' : P.NAIL[this.nailColor], bx = w / 2, by = h * .9, bs = Math.min(h * .14, w * .07);
      c.fillStyle = 'rgba(90,63,94,.18)'; c.beginPath(); c.ellipse(bx, by + bs * .9, bs * .9, bs * .22, 0, 0, TAU); c.fill();
      c.fillStyle = k; art.rr(c, bx - bs * .6, by - bs * .5, bs * 1.2, bs * 1.4, bs * .3); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; art.rr(c, bx - bs * .4, by - bs * .3, bs * .2, bs * .9, bs * .1); c.fill();
      c.fillStyle = '#3a2a30'; art.rr(c, bx - bs * .28, by - bs * 1.2, bs * .56, bs * .7, bs * .12); c.fill();
    }
  }

  function cardIcon(c, w, h) {
    const s = Math.min(w, h * 1.2);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe6f2'); g.addColorStop(1, '#fff3f8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    art.cloud(c, w * .15, h * .2, s / 800, .85);
    for (let i = 0; i < 6; i++) art.star(c, w * (.12 + (i * 37 % 100) / 100 * .76), h * (.1 + (i * 53 % 100) / 100 * .5), s * .02 + (i % 3) * 2, '#fff', 0);
    const girl = Object.assign(P.defaultLook('girl'), { dress: 'ball', dressCol: 0, hair: 'long', hairCol: 6, skin: 1, hat: 'crown', shoes: 'glass', hand: 'wand', extraCol: 8, lips: 1, blush: 1, eyes: 2 });
    const boy = Object.assign(P.defaultLook('boy'), { top: 'vest', topCol: 13, bottom: 'jeans', bottomCol: 13, hair: 'curly', hairCol: 0, skin: 5, hat: 'wizard', hatCol: 11, shoes: 'boots', back: 'cape', backCol: 2 });
    const fh = h * .86;
    c.save(); c.translate(w * .34, h * .93); P.draw(c, girl, fh, 1.3); c.restore();
    c.save(); c.translate(w * .72, h * .93); P.draw(c, boy, fh * .9, 3.1); c.restore();
  }

  SPG.games.push({ id: 'style', name: 'Style Studio', order: 2.5, dom: true, icon: cardIcon, create: host => new StyleStudio(host) });
})();
