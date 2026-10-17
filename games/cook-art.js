// Sprout Kitchen art: everything the cooking game draws (ingredients, layers, kitchen tools and appliances, finished foods).
// Shared by games/cook.js through SPG.cookArt. Everything is canvas code; sizes are given by the caller.
(() => {
  const SPG = window.SPG;
  const { art } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u * u * (3 - 2 * u);
  const rr = art.rr;
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const shade = (col, k) => { let r, g, b; if (col[0] === '#') { const n = parseInt(col.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; } else[r, g, b] = col.match(/[\d.]+/g).map(Number); const f = v => Math.round(Math.max(0, Math.min(255, k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
  const circ = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  const ell = (c, x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); };
  const box = (c, x, y, w, h, col, r = 0) => { c.fillStyle = col; rr(c, x, y, w, h, r); c.fill(); };
  const tri = (c, pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  const shine = (c, x, y, rx, ry, rot = -.5, a = .4) => { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); };
  const blob = (c, rx, ry, seed = 1, jag = .06, n = 28) => { c.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, k = 1 + (rnd(seed + (i % n) * 3.1) - .5) * 2 * jag; const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); };


  /* ---------------------------------------------------------------- pretty text and trims (Fredoka is the app's own font) */
  const FF = 'Fredoka, "Baloo 2", ui-rounded, system-ui, sans-serif';
  // bubbly outlined text with a soft shadow: fill/stroke colours, optional left/center alignment
  function fancyText(c, str, x, y, size, o = {}) {
    c.save(); c.font = `700 ${size}px ${FF}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle'; c.lineJoin = c.lineCap = 'round';
    if (o.shadow !== false) { c.fillStyle = 'rgba(70,30,20,.28)'; c.fillText(str, x + size * .04, y + size * .08); }
    c.lineWidth = size * (o.outline == null ? .22 : o.outline); c.strokeStyle = o.stroke || '#7a3b5a'; c.strokeText(str, x, y);
    c.fillStyle = o.fill || '#fff'; c.fillText(str, x, y); c.restore();
  }
  // lays a name out on one line, or two if it is long, to fit a width; draws it centred at (x, y)
  function fitLabel(c, str, x, y, maxW, size, o = {}) {
    c.save(); c.font = `700 ${size}px ${FF}`; const one = c.measureText(str).width; c.restore();
    if (one <= maxW) { fancyText(c, str, x, y, size, o); return; }
    const ws = str.split(' '); if (ws.length < 2 || o.oneLine || one * .85 <= maxW) { fancyText(c, str, x, y, size * Math.min(1, maxW / one), o); return; }
    let best = 1, bw = 1e9; for (let m = 1; m < ws.length; m++) { c.save(); c.font = `700 ${size}px ${FF}`; const w = Math.max(c.measureText(ws.slice(0, m).join(' ')).width, c.measureText(ws.slice(m).join(' ')).width); c.restore(); if (w < bw) { bw = w; best = m; } }
    const k = Math.min(1, maxW / bw), fs = size * k * .92;
    fancyText(c, ws.slice(0, best).join(' '), x, y - fs * .52, fs, o); fancyText(c, ws.slice(best).join(' '), x, y + fs * .52, fs, o);
  }
  // a gingham cloth (checks), clipped to a rounded rectangle
  function gingham(c, x, y, w, h, r, col, step) {
    c.save(); c.beginPath(); rr(c, x, y, w, h, r); c.clip(); c.fillStyle = '#fffaf4'; c.fillRect(x, y, w, h);
    c.globalAlpha = .38; c.fillStyle = col;
    for (let i = 0; i * step < w + step; i += 2) c.fillRect(x + i * step, y, step, h);
    for (let j = 0; j * step < h + step; j += 2) c.fillRect(x, y + j * step, w, step);
    c.restore();
  }
  // a ribbon banner (with little tails) centred at (x, y)
  function ribbon(c, x, y, w, h, col, dark, tail = h * .45) {
    c.save(); c.translate(x, y);
    c.fillStyle = dark; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * w * .5, -h * .3); c.lineTo(sg * (w * .5 + tail), -h * .3); c.lineTo(sg * (w * .5 + tail * .45), h * .08); c.lineTo(sg * (w * .5 + tail), h * .46); c.lineTo(sg * w * .5, h * .46); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(70,30,20,.22)'; rr(c, -w / 2 + 2, -h / 2 + 5, w, h, h * .22); c.fill();
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, shade(col, .22)); g.addColorStop(1, col); c.fillStyle = g; rr(c, -w / 2, -h / 2, w, h, h * .22); c.fill();
    c.fillStyle = 'rgba(255,255,255,.28)'; rr(c, -w / 2 + h * .08, -h / 2 + h * .07, w - h * .16, h * .22, h * .1); c.fill();
    c.restore();
  }

  /* ---------------------------------------------------------------- character cookie cutters (shapes drawn as unions of simple pieces; radius 1) */
  const PIECES = {
    star: [['star', 0, 0, 1]],
    heart: [['heart', 0, 0, 1]],
    bunny: [['e', 0, .25, .66, .6], ['e', -.32, -.62, .17, .62, -.2], ['e', .32, -.62, .17, .62, .2]],
    bear: [['e', 0, .1, .78, .72], ['e', -.6, -.52, .27, .27], ['e', .6, -.52, .27, .27]],
    cat: [['e', 0, .12, .8, .68], ['t', [-.78, -.12], [-.72, -.92], [-.18, -.5]], ['t', [.78, -.12], [.72, -.92], [.18, -.5]]],
    fox: [['t', [-.9, -.1], [0, .92], [.9, -.1]], ['e', 0, -.12, .82, .56], ['t', [-.85, -.2], [-.8, -.98], [-.25, -.5]], ['t', [.85, -.2], [.8, -.98], [.25, -.5]]],
    frog: [['e', 0, .22, .92, .62], ['e', -.5, -.45, .3, .3], ['e', .5, -.45, .3, .3]],
    panda: [['e', 0, .1, .78, .72], ['e', -.6, -.52, .27, .27], ['e', .6, -.52, .27, .27]],
    dino: [['e', 0, .3, .72, .56], ['t', [-.4, -.1], [-.28, -.75], [-.06, -.1]], ['t', [-.08, -.1], [.1, -.92], [.3, -.1]], ['t', [.26, -.1], [.46, -.7], [.6, -.05]]],
    unicorn: [['e', 0, .3, .68, .6], ['t', [-.1, -.2], [.06, -1.0], [.2, -.2]], ['t', [-.55, -.2], [-.62, -.7], [-.2, -.3]]],
    flower: [['e', 0, -.55, .3, .38], ['e', .52, -.17, .3, .38, 1.25], ['e', .32, .45, .3, .38, 2.5], ['e', -.32, .45, .3, .38, -2.5], ['e', -.52, -.17, .3, .38, -1.25], ['e', 0, 0, .45, .45]]
  };
  const SHAPES = Object.keys(PIECES);
  PIECES.round = [['e', 0, 0, .82, .74]];
  const starPath = (c, r, inner = .45) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * inner : r; i ? c.lineTo(Math.cos(a) * k, Math.sin(a) * k) : c.moveTo(Math.cos(a) * k, Math.sin(a) * k); } c.closePath(); };
  const heartPath = (c, r) => { c.moveTo(0, r * .9); c.bezierCurveTo(-r * 1.35, r * .1, -r * .9, -r * .95, 0, -r * .35); c.bezierCurveTo(r * .9, -r * .95, r * 1.35, r * .1, 0, r * .9); c.closePath(); };
  // fill (and optionally stroke) a cutter shape: kind, radius r. Pieces are painted separately so overlaps unite.
  // the outline of a cutter shape as one path (for clipping icing to the cookie's own edge)
  function shapePath(kind, r) {
    const P = new Path2D();
    for (const p of PIECES[kind] || PIECES.round) {
      const q = new Path2D();
      if (p[0] === 'star') starPath(q, r, .46); else if (p[0] === 'heart') heartPath(q, r);
      else if (p[0] === 'e') q.ellipse(p[1] * r, p[2] * r, p[3] * r, p[4] * r, p[5] || 0, 0, TAU);
      else { p.slice(1).forEach(([x, y], i) => i ? q.lineTo(x * r, y * r) : q.moveTo(x * r, y * r)); q.closePath(); }
      P.addPath(q);
    }
    return P;
  }
  function shapeFill(c, kind, r, grow = 0) {
    for (const p of PIECES[kind]) {
      c.beginPath();
      if (p[0] === 'star') starPath(c, r + grow, .46);
      else if (p[0] === 'heart') heartPath(c, r + grow);
      else if (p[0] === 'e') c.ellipse(p[1] * r, p[2] * r, p[3] * r + grow, p[4] * r + grow, p[5] || 0, 0, TAU);
      else { const cx = (p[1][0] + p[2][0] + p[3][0]) / 3, cy = (p[1][1] + p[2][1] + p[3][1]) / 3; p.slice(1).forEach(([x, y], i) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, X = (x + dx / d * grow / r) * r, Y = (y + dy / d * grow / r) * r; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath(); }
      c.fill();
    }
  }
  // a baked / raw cookie of a given shape (dough-colored with a darker rim and a soft shine)
  function cookieShape(c, kind, r, col, o = {}) {
    c.save();
    c.fillStyle = shade(col, -.38); c.save(); c.translate(0, r * .09); shapeFill(c, kind, r, r * .035); c.restore();
    c.fillStyle = shade(col, -.2); shapeFill(c, kind, r, r * .03);
    c.fillStyle = col; shapeFill(c, kind, r, -r * .02);
    c.fillStyle = shade(col, .18); c.save(); c.translate(-r * .05, -r * .06); shapeFill(c, kind, r * .86, -r * .03); c.restore();
    c.fillStyle = col; shapeFill(c, kind, r * .8, -r * .05);
    if (o.speckle) { c.fillStyle = shade(col, -.25); for (let i = 0; i < 7; i++) { c.beginPath(); c.arc((rnd(i + 5) - .5) * r * 1.0, (rnd(i + 9) - .35) * r * 1.0, r * .02, 0, TAU); c.fill(); } }
    c.restore();
  }
  // the metal cutter, seen from above with a little handle ring (like a real one)
  function cutterArt(c, kind, r, t = 0) {
    c.save();
    c.lineJoin = c.lineCap = 'round';
    c.fillStyle = 'rgba(70,80,100,.22)'; c.save(); c.translate(r * .08, r * .12); shapeFill(c, kind, r, r * .06); c.restore();
    c.fillStyle = '#b9c4d4'; shapeFill(c, kind, r, r * .08);
    c.fillStyle = '#e8eef8'; shapeFill(c, kind, r, r * .03);
    c.fillStyle = 'rgba(120,150,190,.35)'; shapeFill(c, kind, r, -r * .04);
    c.fillStyle = 'rgba(230,240,255,.55)'; shapeFill(c, kind, r * .92, -r * .12);
    c.strokeStyle = '#8fa0b8'; c.lineWidth = r * .09; c.beginPath(); c.arc(0, -r * .05, r * .2, 0, TAU); c.stroke();
    c.strokeStyle = '#e8eef8'; c.lineWidth = r * .04; c.beginPath(); c.arc(0, -r * .05, r * .2, .3, 1.6); c.stroke();
    c.restore();
  }

  /* ---------------------------------------------------------------- ingredients (pictures for the trays) and flat layers for stacking */
  const BUN = '#e8a85c', BREAD = '#f3d9a4', CRUST = '#d9a45c';
  const ING = {
    bell(c, s) { c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(-s * .5, s * .3); c.quadraticCurveTo(-s * .5, -s * .5, 0, -s * .5); c.quadraticCurveTo(s * .5, -s * .5, s * .5, s * .3); c.closePath(); c.fill(); c.fillStyle = '#ffe98a'; c.beginPath(); c.ellipse(-s * .18, -s * .12, s * .1, s * .22, .3, 0, TAU); c.fill(); box(c, -s * .6, s * .28, s * 1.2, s * .12, '#e0a01e', s * .05); circ(c, 0, s * .5, s * .12, '#e0a01e'); circ(c, 0, -s * .55, s * .08, '#e0a01e'); },
    cheese(c, s) { c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(-s * .42, s * .26); c.lineTo(s * .44, s * .1); c.lineTo(-s * .3, -s * .34); c.closePath(); c.fill(); c.fillStyle = '#ffe582'; c.beginPath(); c.moveTo(-s * .42, s * .26); c.lineTo(s * .44, s * .1); c.lineTo(s * .44, s * .24); c.lineTo(-s * .42, s * .4); c.closePath(); c.fill(); for (const [x, y, r] of [[-.12, .08, .07], [.1, .14, .05], [-.24, .2, .04]]) circ(c, x * s, y * s, r * s, '#e8b22a'); },
    lettuce(c, s) { c.fillStyle = '#7ed957'; c.beginPath(); for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU, k = 1 + (i % 2 ? -.12 : .1); const x = Math.cos(a) * s * .44 * k, y = Math.sin(a) * s * .34 * k; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.fill(); c.strokeStyle = '#a8f07a'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(-s * .3, 0); c.quadraticCurveTo(0, -s * .12, s * .3, 0); c.stroke(); c.beginPath(); c.moveTo(0, -s * .22); c.lineTo(0, s * .22); c.stroke(); },
    tomato(c, s) { circ(c, 0, s * .02, s * .42, '#e8433f'); circ(c, 0, s * .02, s * .34, '#ff6b5a'); for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ell(c, Math.cos(a) * s * .17, s * .02 + Math.sin(a) * s * .17, s * .07, s * .04, '#ffd0a8', a); } shine(c, -s * .18, -s * .2, s * .08, s * .04, -.7, .5); },
    onion(c, s) { for (const [r, col] of [[.4, '#e8d0f0'], [.32, '#fff'], [.24, '#e8d0f0'], [.16, '#fff']]) { c.strokeStyle = col; c.lineWidth = s * .06; c.beginPath(); c.arc(0, 0, r * s, 0, TAU); c.stroke(); } },
    pickle(c, s) { circ(c, 0, 0, s * .36, '#6fae3c'); circ(c, 0, 0, s * .28, '#a4d65a'); for (let i = 0; i < 6; i++) circ(c, Math.cos(i * 1.05) * s * .13, Math.sin(i * 1.05) * s * .13, s * .025, '#fff3b0'); },
    cucumber(c, s) { circ(c, 0, 0, s * .36, '#4f9a3a'); circ(c, 0, 0, s * .3, '#bfe8a0'); for (let i = 0; i < 8; i++) circ(c, Math.cos(i * .8) * s * .13, Math.sin(i * .8) * s * .13, s * .025, '#f0fbe0'); },
    avocado(c, s) { c.fillStyle = '#4f7a2a'; c.beginPath(); c.moveTo(0, -s * .46); c.bezierCurveTo(s * .4, -s * .2, s * .48, s * .45, 0, s * .46); c.bezierCurveTo(-s * .48, s * .45, -s * .4, -s * .2, 0, -s * .46); c.fill(); c.fillStyle = '#d6eaa0'; c.beginPath(); c.moveTo(0, -s * .38); c.bezierCurveTo(s * .32, -s * .15, s * .38, s * .36, 0, s * .38); c.bezierCurveTo(-s * .38, s * .36, -s * .32, -s * .15, 0, -s * .38); c.fill(); circ(c, 0, s * .12, s * .13, '#8a5a30'); shine(c, -s * .05, s * .08, s * .03, s * .05, -.5, .5); },
    carrot(c, s) { c.fillStyle = '#ff9d3d'; c.beginPath(); c.moveTo(-s * .12, -s * .3); c.lineTo(s * .12, -s * .3); c.lineTo(0, s * .46); c.closePath(); c.fill(); c.strokeStyle = '#e07a1a'; c.lineWidth = s * .025; for (const y of [-.1, .08, .24]) { c.beginPath(); c.moveTo(-s * .06, y * s); c.lineTo(s * .06, y * s); c.stroke(); } for (const x of [-.1, 0, .1]) { c.fillStyle = '#5fbf5a'; c.beginPath(); c.ellipse(x * s, -s * .4, s * .05, s * .12, x * 2, 0, TAU); c.fill(); } },
    ham(c, s) { c.fillStyle = '#ff9db3'; c.beginPath(); c.moveTo(-s * .44, -s * .2); c.quadraticCurveTo(-s * .2, -s * .38, 0, -s * .24); c.quadraticCurveTo(s * .22, -s * .1, s * .44, -s * .26); c.lineTo(s * .4, s * .26); c.quadraticCurveTo(s * .2, s * .38, 0, s * .26); c.quadraticCurveTo(-s * .22, s * .12, -s * .42, s * .28); c.closePath(); c.fill(); c.strokeStyle = '#ffc2d0'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(-s * .3, -s * .02); c.quadraticCurveTo(0, s * .1, s * .3, -s * .06); c.stroke(); },
    turkey(c, s) { c.fillStyle = '#f0d6b0'; c.beginPath(); c.moveTo(-s * .44, -s * .2); c.quadraticCurveTo(-s * .2, -s * .36, 0, -s * .22); c.quadraticCurveTo(s * .22, -s * .08, s * .44, -s * .24); c.lineTo(s * .4, s * .26); c.quadraticCurveTo(s * .2, s * .36, 0, s * .24); c.quadraticCurveTo(-s * .22, s * .1, -s * .42, s * .28); c.closePath(); c.fill(); c.strokeStyle = '#e0bd8a'; c.lineWidth = s * .035; c.beginPath(); c.moveTo(-s * .3, 0); c.quadraticCurveTo(0, s * .1, s * .3, -s * .04); c.stroke(); },
    patty(c, s) { c.fillStyle = '#7a4a2a'; c.beginPath(); c.ellipse(0, 0, s * .44, s * .34, 0, 0, TAU); c.fill(); c.fillStyle = '#96603a'; c.beginPath(); c.ellipse(0, -s * .03, s * .4, s * .3, 0, 0, TAU); c.fill(); c.strokeStyle = '#5a3320'; c.lineWidth = s * .04; for (const x of [-.18, 0, .18]) { c.beginPath(); c.moveTo((x - .08) * s, -s * .2); c.lineTo((x + .08) * s, s * .2); c.stroke(); } },
    beanpatty(c, s) { c.fillStyle = '#8a7a4a'; c.beginPath(); c.ellipse(0, 0, s * .44, s * .34, 0, 0, TAU); c.fill(); c.fillStyle = '#a89860'; c.beginPath(); c.ellipse(0, -s * .03, s * .4, s * .3, 0, 0, TAU); c.fill(); for (let i = 0; i < 9; i++) { c.fillStyle = ['#5a3a2a', '#c9a060', '#6a9a3a'][i % 3]; c.beginPath(); c.ellipse((rnd(i) - .5) * s * .6, (rnd(i + 4) - .5) * s * .4, s * .035, s * .02, i, 0, TAU); c.fill(); } },
    chicken(c, s) { c.fillStyle = '#d98a2a'; blob(c, s * .44, s * .34, 3, .08, 18); c.save(); c.fill(); c.restore(); c.fillStyle = '#f0b24a'; c.save(); c.translate(0, -s * .03); blob(c, s * .38, s * .28, 5, .1, 18); c.fill(); c.restore(); for (let i = 0; i < 9; i++) circ(c, (rnd(i + 2) - .5) * s * .6, (rnd(i + 8) - .5) * s * .36, s * .028, '#fbd682'); },
    bunB(c, s) { c.fillStyle = shade(BUN, -.1); c.beginPath(); c.moveTo(-s * .46, -s * .1); c.lineTo(s * .46, -s * .1); c.quadraticCurveTo(s * .5, s * .28, 0, s * .3); c.quadraticCurveTo(-s * .5, s * .28, -s * .46, -s * .1); c.fill(); c.fillStyle = BUN; c.fillRect(-s * .46, -s * .14, s * .92, s * .1); },
    bunT(c, s) { c.fillStyle = BUN; c.beginPath(); c.moveTo(-s * .46, s * .16); c.bezierCurveTo(-s * .5, -s * .5, s * .5, -s * .5, s * .46, s * .16); c.closePath(); c.fill(); c.fillStyle = shade(BUN, .22); c.beginPath(); c.moveTo(-s * .36, -s * .02); c.bezierCurveTo(-s * .3, -s * .34, s * .1, -s * .38, s * .2, -s * .26); c.bezierCurveTo(0, -s * .3, -s * .26, -s * .2, -s * .36, -s * .02); c.fill(); for (const [x, y] of [[-.18, -.14], [0, -.26], [.18, -.12], [.06, -.06], [-.05, -.16]]) { c.fillStyle = '#fff3d6'; c.beginPath(); c.ellipse(x * s, y * s, s * .03, s * .018, x * 4, 0, TAU); c.fill(); } },
    bread(c, s) { c.fillStyle = CRUST; rr(c, -s * .4, -s * .36, s * .8, s * .78, s * .12); c.fill(); c.fillStyle = BREAD; rr(c, -s * .33, -s * .29, s * .66, s * .64, s * .09); c.fill(); c.beginPath(); c.fillStyle = CRUST; c.arc(-s * .22, -s * .36, s * .2, Math.PI, 0); c.arc(s * .22, -s * .36, s * .2, Math.PI, 0); c.fill(); c.fillStyle = BREAD; c.beginPath(); c.arc(-s * .22, -s * .32, s * .15, Math.PI, 0); c.arc(s * .22, -s * .32, s * .15, Math.PI, 0); c.fill(); },
    hotbun(c, s) { c.fillStyle = shade(BUN, -.1); rr(c, -s * .46, -s * .15, s * .92, s * .32, s * .16); c.fill(); c.fillStyle = BUN; rr(c, -s * .46, -s * .19, s * .92, s * .28, s * .14); c.fill(); c.fillStyle = shade(BUN, -.25); c.fillRect(-s * .4, -s * .02, s * .8, s * .05); },
    sausage(c, s) { c.fillStyle = '#c0583a'; rr(c, -s * .5, -s * .1, s, s * .2, s * .1); c.fill(); shine(c, -s * .1, -s * .05, s * .3, s * .03, 0, .4); },
    pancake(c, s) { c.fillStyle = '#d9a04a'; c.beginPath(); c.ellipse(0, s * .04, s * .44, s * .26, 0, 0, TAU); c.fill(); c.fillStyle = '#f0c36a'; c.beginPath(); c.ellipse(0, 0, s * .44, s * .26, 0, 0, TAU); c.fill(); c.fillStyle = '#e8b050'; c.beginPath(); c.ellipse(0, -s * .01, s * .34, s * .19, 0, 0, TAU); c.fill(); },
    ketchup(c, s) { c.fillStyle = '#e8433f'; rr(c, -s * .2, -s * .1, s * .4, s * .52, s * .1); c.fill(); c.fillStyle = '#ff6b5a'; rr(c, -s * .2, -s * .1, s * .16, s * .5, s * .08); c.fill(); tri(c, [[-s * .14, -s * .1], [s * .14, -s * .1], [0, -s * .3]], '#fff'); box(c, -s * .05, -s * .42, s * .1, s * .14, '#fff', s * .03); box(c, -s * .15, s * .08, s * .3, s * .22, '#fff', s * .04); circ(c, 0, s * .19, s * .06, '#e8433f'); },
    mustard(c, s) { c.fillStyle = '#f2c230'; rr(c, -s * .2, -s * .1, s * .4, s * .52, s * .1); c.fill(); c.fillStyle = '#ffe27a'; rr(c, -s * .2, -s * .1, s * .16, s * .5, s * .08); c.fill(); tri(c, [[-s * .14, -s * .1], [s * .14, -s * .1], [0, -s * .3]], '#fff'); box(c, -s * .05, -s * .42, s * .1, s * .14, '#fff', s * .03); box(c, -s * .15, s * .08, s * .3, s * .22, '#fff', s * .04); circ(c, 0, s * .19, s * .06, '#f2c230'); },
    mayo(c, s) { c.fillStyle = '#fff6dc'; rr(c, -s * .2, -s * .1, s * .4, s * .52, s * .1); c.fill(); c.fillStyle = '#fff'; rr(c, -s * .2, -s * .1, s * .16, s * .5, s * .08); c.fill(); tri(c, [[-s * .14, -s * .1], [s * .14, -s * .1], [0, -s * .3]], '#fff'); box(c, -s * .05, -s * .42, s * .1, s * .14, '#e8e0c8', s * .03); box(c, -s * .15, s * .08, s * .3, s * .22, '#7fd4f5', s * .04); },
    pbutter(c, s) { box(c, -s * .34, -s * .2, s * .68, s * .62, '#c98b4a', s * .08); box(c, -s * .38, -s * .32, s * .76, s * .16, '#e8c18a', s * .05); box(c, -s * .26, -s * .02, s * .52, s * .26, '#fff3d6', s * .05); circ(c, 0, s * .11, s * .07, '#c98b4a'); },
    jelly(c, s) { box(c, -s * .34, -s * .2, s * .68, s * .62, '#b8326a', s * .08); box(c, -s * .38, -s * .32, s * .76, s * .16, '#e8e0f0', s * .05); box(c, -s * .26, -s * .02, s * .52, s * .26, '#fff', s * .05); circ(c, 0, s * .11, s * .08, '#ff6b9d'); },
    syrup(c, s) { c.fillStyle = '#b8651a'; rr(c, -s * .22, -s * .18, s * .44, s * .62, s * .1); c.fill(); c.fillStyle = '#d98b3a'; rr(c, -s * .22, -s * .18, s * .16, s * .6, s * .08); c.fill(); box(c, -s * .12, -s * .38, s * .24, s * .24, '#f4e0a0', s * .04); box(c, -s * .18, s * .06, s * .36, s * .22, '#fff', s * .04); },
    star(c, s) { art.star(c, 0, 0, s * .34, '#ffd54a', 0); },
    cone(c, s) { tri(c, [[-s * .26, -s * .1], [s * .26, -s * .1], [0, s * .5]], '#e8b878'); c.strokeStyle = '#c98b4a'; c.lineWidth = s * .03; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-s * .2 + i * s * .13, -s * .1); c.lineTo(-s * .06 + i * s * .06, s * .3); c.stroke(); } },
    salt(c, s) { box(c, -s * .2, -s * .12, s * .4, s * .54, 'rgba(220,235,250,.8)', s * .06); box(c, -s * .22, -s * .3, s * .44, s * .2, '#b9c4d4', s * .08); for (const x of [-.08, 0, .08]) circ(c, x * s, -s * .2, s * .02, '#6a7a90'); for (let i = 0; i < 8; i++) circ(c, (rnd(i) - .5) * s * .26, s * (.06 + rnd(i + 3) * .3), s * .018, '#fff'); },
    pepper(c, s) { box(c, -s * .2, -s * .12, s * .4, s * .54, 'rgba(120,120,130,.55)', s * .06); box(c, -s * .22, -s * .3, s * .44, s * .2, '#5a5a66', s * .08); for (const x of [-.08, 0, .08]) circ(c, x * s, -s * .2, s * .02, '#2a2a30'); for (let i = 0; i < 8; i++) circ(c, (rnd(i) - .5) * s * .26, s * (.06 + rnd(i + 3) * .3), s * .018, '#2a2a30'); },
    toast(c, s) { ING.bread(c, s); c.save(); c.globalAlpha = .38; c.fillStyle = '#a8662a'; rr(c, -s * .33, -s * .29, s * .66, s * .64, s * .09); c.fill(); c.restore(); },
    butterpat(c, s) { box(c, -s * .3, -s * .16, s * .6, s * .32, '#ffe27a', s * .05); box(c, -s * .3, -s * .16, s * .6, s * .1, '#fff3b0', s * .05); },
    batter(c, s) { drawBowl(c, 0, 0, s * .4, { fill: .8, items: [], col: BATTER, final: BATTER, stirred: 1 }, 0); },
    dough(c, s) { c.fillStyle = '#e8c88a'; blob(c, s * .42, s * .34, 7, .05, 22); c.save(); c.fill(); c.restore(); shine(c, -s * .12, -s * .1, s * .12, s * .06, -.5, .35); }
  };
  // icing tubes and scoops are made from a color
  const TUBE = (col) => (c, s) => { c.fillStyle = col; c.beginPath(); c.moveTo(-s * .22, -s * .2); c.lineTo(s * .22, -s * .2); c.lineTo(s * .3, s * .44); c.lineTo(-s * .3, s * .44); c.closePath(); c.fill(); c.fillStyle = shade(col, .35); c.beginPath(); c.moveTo(-s * .22, -s * .2); c.lineTo(-s * .06, -s * .2); c.lineTo(-s * .12, s * .44); c.lineTo(-s * .3, s * .44); c.closePath(); c.fill(); tri(c, [[-s * .22, -s * .2], [s * .22, -s * .2], [0, -s * .46]], shade(col, -.2)); circ(c, 0, -s * .46, s * .05, '#fff'); };
  const SCOOP = (col) => (c, s) => { circ(c, 0, -s * .02, s * .38, col); ell(c, 0, s * .26, s * .4, s * .12, shade(col, -.15)); shine(c, -s * .14, -s * .16, s * .09, s * .05, -.6, .5); for (let i = 0; i < 4; i++) circ(c, (rnd(i) - .5) * s * .4, (rnd(i + 3) - .5) * s * .3, s * .02, shade(col, .35)); };
  const ICING = { 'ice-pink': '#ff9ec8', 'ice-blue': '#7fd4f5', 'ice-yellow': '#ffe066', 'ice-white': '#ffffff', 'ice-choc': '#7a4a2a', 'ice-green': '#8fe070', 'ice-purple': '#c9a8ff' };
  for (const [id, col] of Object.entries(ICING)) ING[id] = TUBE(col);
  const SCOOPS = { vanilla: '#fff1c4', strawb: '#ff9ec8', choc: '#8a5a3a', mint: '#9fe6c0', blueb: '#a8b8f0' };
  for (const [id, col] of Object.entries(SCOOPS)) ING['sc-' + id] = SCOOP(col);
  const NAME = { flour: 'Flour', sugar: 'Sugar', egg: 'An egg', butter: 'Butter', milk: 'Milk', chips: 'Chocolate chips', cheese: 'Cheese', lettuce: 'Lettuce', tomato: 'Tomato', onion: 'Onion', pickle: 'Pickle', cucumber: 'Cucumber', avocado: 'Avocado', carrot: 'Carrot', ham: 'Ham', turkey: 'Turkey', patty: 'A burger patty', beanpatty: 'A veggie patty', chicken: 'A chicken patty', bunB: 'The bottom bun', bunT: 'The top bun', bread: 'Bread', hotbun: 'A hot dog bun', sausage: 'A sausage', pancake: 'Pancake', toast: 'Toast', butterpat: 'A pat of butter', batter: 'Batter', hotbunBack: 'A hot dog bun', bunny: 'Bunny', bear: 'Bear', cat: 'Kitty', fox: 'Fox', frog: 'Frog', panda: 'Panda', dino: 'Dinosaur', unicorn: 'Unicorn', flower: 'Flower', heart: 'Heart', ketchup: 'Ketchup', mustard: 'Mustard', mayo: 'Mayo', pbutter: 'Peanut butter', jelly: 'Jelly', syrup: 'Syrup', strawberry: 'A strawberry', blueberry: 'Blueberries', cherry: 'A cherry', sprinkles: 'Sprinkles', candy: 'Candy', candle: 'A candle', star: 'A star', cone: 'A cone', salt: 'Salt', pepper: 'Pepper', dough: 'Dough', 'ice-pink': 'Pink icing', 'ice-blue': 'Blue icing', 'ice-yellow': 'Yellow icing', 'ice-white': 'White icing', 'ice-choc': 'Chocolate icing', 'ice-green': 'Green icing', 'ice-purple': 'Purple icing', 'sc-vanilla': 'Vanilla ice cream', 'sc-strawb': 'Strawberry ice cream', 'sc-choc': 'Chocolate ice cream', 'sc-mint': 'Mint ice cream', 'sc-blueb': 'Blueberry ice cream' };

  /* ---------------------------------------------------------------- round 2: clearer tray pictures (flat, rounded, a little shading) */
  const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const edge = (c, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = c.lineCap = 'round'; c.stroke(); };
  const soft = (c, x, y, rx, ry, a = .16) => { c.fillStyle = `rgba(80,40,20,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
  const spark4 = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, k = i % 2 ? r * .3 : r; i ? c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k) : c.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k); } c.closePath(); c.fill(); };
  const poly = (c, pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };

  // a paper flour sack: folded and stitched top (closed) or rolled-down open mouth with a mound of flour; wheat mark on a label
  function flourSack(c, s, open) {
    soft(c, 0, s * .48, s * .44, s * .07);
    const body = () => { c.beginPath(); c.moveTo(-s * .33, -s * .2); c.bezierCurveTo(-s * .43, s * .04, -s * .43, s * .34, -s * .37, s * .44); c.quadraticCurveTo(0, s * .51, s * .37, s * .44); c.bezierCurveTo(s * .43, s * .34, s * .43, s * .04, s * .33, -s * .2); c.closePath(); };
    c.fillStyle = lin(c, -s * .4, 0, s * .4, 0, [[0, '#f3e3c0'], [.5, '#ead5a8'], [1, '#cfae76']]); body(); c.fill(); edge(c, '#b3905a', s * .02);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(-s * .31, -s * .12); c.quadraticCurveTo(-s * .37, s * .12, -s * .32, s * .36); c.lineTo(-s * .26, s * .36); c.quadraticCurveTo(-s * .31, s * .1, -s * .26, -s * .12); c.closePath(); c.fill();
    // label with a wheat ear
    box(c, -s * .22, -s * .06, s * .44, s * .42, '#fffaf0', s * .09); c.strokeStyle = '#d9b46a'; c.lineWidth = s * .015; rr(c, -s * .22, -s * .06, s * .44, s * .42, s * .09); c.stroke();
    c.strokeStyle = '#b9811a'; c.lineWidth = s * .03; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, s * .32); c.lineTo(0, s * .0); c.stroke();
    for (const [y, a] of [[.18, .6], [.1, .6], [.02, .6]]) for (const sg of [-1, 1]) ell(c, sg * s * .055, y * s, s * .038, s * .075, '#e0a42a', sg * a);
    ell(c, 0, -s * .02, s * .036, s * .075, '#e8b23c');
    if (!open) {
      c.fillStyle = lin(c, 0, -s * .44, 0, -s * .14, [[0, '#f9edcf'], [1, '#e6cd9c']]); c.beginPath(); c.moveTo(-s * .36, -s * .17); c.lineTo(-s * .33, -s * .4); c.quadraticCurveTo(-s * .17, -s * .46, 0, -s * .43); c.quadraticCurveTo(s * .17, -s * .46, s * .33, -s * .4); c.lineTo(s * .36, -s * .17); c.quadraticCurveTo(0, -s * .1, -s * .36, -s * .17); c.closePath(); c.fill(); edge(c, '#b3905a', s * .02);
      c.strokeStyle = 'rgba(160,120,60,.5)'; c.lineWidth = s * .016; c.beginPath(); c.moveTo(-s * .34, -s * .3); c.quadraticCurveTo(0, -s * .24, s * .34, -s * .3); c.stroke();
      c.strokeStyle = '#d6483f'; c.lineWidth = s * .022; c.setLineDash([s * .045, s * .035]); c.beginPath(); c.moveTo(-s * .33, -s * .25); c.quadraticCurveTo(0, -s * .19, s * .33, -s * .25); c.stroke(); c.setLineDash([]);
      for (const [x, y, r] of [[-.2, -.37, .02], [.12, -.34, .016], [.24, -.28, .014]]) circ(c, x * s, y * s, r * s, 'rgba(255,255,255,.95)');
    } else {
      c.fillStyle = '#c9a56e'; c.beginPath(); c.ellipse(0, -s * .2, s * .35, s * .1, 0, 0, TAU); c.fill();
      c.fillStyle = '#fbfbfd'; c.beginPath(); c.ellipse(0, -s * .22, s * .3, s * .075, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-s * .27, -s * .22); c.bezierCurveTo(-s * .2, -s * .5, s * .2, -s * .5, s * .27, -s * .22); c.closePath(); c.fill();
      c.fillStyle = '#e7e9f2'; c.beginPath(); c.moveTo(s * .08, -s * .4); c.bezierCurveTo(s * .2, -s * .36, s * .26, -s * .28, s * .27, -s * .22); c.quadraticCurveTo(s * .12, -s * .18, s * .06, -s * .3); c.closePath(); c.fill();
      shine(c, -s * .1, -s * .36, s * .08, s * .03, -.4, .8);
      c.strokeStyle = '#f6e7c6'; c.lineWidth = s * .05; c.lineCap = 'round'; c.beginPath(); c.ellipse(0, -s * .2, s * .35, s * .1, 0, .08, Math.PI - .08); c.stroke(); edge(c, '#b3905a', s * .014);
    }
    // a little flour dusting on the ground and in the air
    ell(c, s * .08, s * .5, s * .34, s * .045, 'rgba(255,255,255,.92)'); ell(c, s * .3, s * .46, s * .12, s * .04, '#fff');
    for (const [x, y, r] of [[.4, .38, .02], [.45, .3, .014], [-.42, .42, .018], [-.36, .5, .02], [.18, .53, .014]]) circ(c, x * s, y * s, r * s, 'rgba(255,255,255,.95)');
  }
  // a glass sugar canister full of white crystals; open = lid off (leaning on the counter) and a heap of sugar showing
  function sugarJar(c, s, open) {
    soft(c, 0, s * .48, s * .42, s * .07);
    const glass = () => { c.beginPath(); c.moveTo(-s * .3, -s * .22); c.lineTo(-s * .3, s * .34); c.quadraticCurveTo(-s * .3, s * .47, -s * .17, s * .47); c.lineTo(s * .17, s * .47); c.quadraticCurveTo(s * .3, s * .47, s * .3, s * .34); c.lineTo(s * .3, -s * .22); c.closePath(); };
    c.fillStyle = lin(c, -s * .3, 0, s * .3, 0, [[0, 'rgba(215,236,252,.95)'], [.5, 'rgba(236,247,255,.9)'], [1, 'rgba(188,218,242,.95)']]); glass(); c.fill();
    c.save(); glass(); c.clip();
    c.fillStyle = '#fdfdff'; c.beginPath(); c.moveTo(-s * .4, -s * .06); c.quadraticCurveTo(-s * .12, open ? -s * .3 : -s * .1, 0, open ? -s * .3 : -s * .08); c.quadraticCurveTo(s * .14, open ? -s * .3 : -s * .1, s * .4, -s * .06); c.lineTo(s * .4, s * .6); c.lineTo(-s * .4, s * .6); c.closePath(); c.fill();
    c.fillStyle = 'rgba(160,200,235,.4)'; c.fillRect(s * .16, -s * .3, s * .2, s * .9);
    for (let i = 0; i < 90; i++) { const x = (rnd(i + 1) - .5) * s * .54, y = -s * .16 + rnd(i + 7) * s * .62, r = s * (.014 + rnd(i + 5) * .016); c.save(); c.translate(x, y); c.rotate(rnd(i + 3) * 1.5); c.fillStyle = '#fff'; c.strokeStyle = 'rgba(150,190,225,.75)'; c.lineWidth = s * .008; c.beginPath(); c.moveTo(0, -r * 1.3); c.lineTo(r, 0); c.lineTo(0, r * 1.3); c.lineTo(-r, 0); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    c.restore();
    glass(); edge(c, '#86abca', s * .022);
    c.fillStyle = 'rgba(255,255,255,.7)'; rr(c, -s * .25, -s * .14, s * .045, s * .5, s * .02); c.fill();
    if (!open) {
      box(c, -s * .34, -s * .36, s * .68, s * .16, '#ff8fb8', s * .06); box(c, -s * .34, -s * .36, s * .68, s * .05, '#ffb8d2', s * .03);
      c.fillStyle = '#ff6fa2'; c.beginPath(); c.ellipse(0, -s * .4, s * .09, s * .05, 0, 0, TAU); c.fill(); box(c, -s * .03, -s * .43, s * .06, s * .06, '#ff6fa2', s * .02);
    } else {
      c.fillStyle = '#fdfdff'; c.beginPath(); c.moveTo(-s * .27, -s * .2); c.bezierCurveTo(-s * .24, -s * .42, s * .2, -s * .46, s * .27, -s * .2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(150,190,225,.75)'; c.lineWidth = s * .014; c.stroke();
      c.fillStyle = 'rgba(190,215,240,.45)'; c.beginPath(); c.moveTo(s * .1, -s * .38); c.bezierCurveTo(s * .2, -s * .34, s * .26, -s * .26, s * .27, -s * .2); c.lineTo(s * .1, -s * .2); c.closePath(); c.fill();
      for (let i = 0; i < 14; i++) { const x = (rnd(i + 40) - .5) * s * .4, y = -s * .22 - rnd(i + 44) * s * .13 * (1 - Math.abs(x) / (s * .22)); c.save(); c.translate(x, y); c.rotate(rnd(i) * 3); c.strokeStyle = 'rgba(150,190,225,.8)'; c.lineWidth = s * .008; c.strokeRect(-s * .014, -s * .014, s * .028, s * .028); c.restore(); }
      box(c, -s * .34, -s * .24, s * .68, s * .04, 'rgba(255,255,255,.0)', 0);
    }
    spark4(c, s * .38, -s * .26, s * .09, '#8cc8f2'); spark4(c, -s * .4, -s * .1, s * .06, '#8cc8f2');
  }
  const eggPath = (c, w, h) => { c.beginPath(); c.moveTo(0, -h); c.bezierCurveTo(w * .6, -h, w, -h * .12, w, h * .24); c.bezierCurveTo(w, h * .72, w * .56, h, 0, h); c.bezierCurveTo(-w * .56, h, -w, h * .72, -w, h * .24); c.bezierCurveTo(-w, -h * .12, -w * .6, -h, 0, -h); c.closePath(); };
  // a real egg: cream to light brown, soft shading, a few speckles. Height is about .92 s.
  function drawEgg(c, s, col = '#f2d6a6') {
    c.save(); const w = s * .35, h = s * .46;
    eggPath(c, w, h); c.fillStyle = shade(col, -.2); c.fill();
    c.save(); c.translate(-w * .09, -h * .06); c.scale(.9, .92); eggPath(c, w, h); c.fillStyle = col; c.fill(); c.restore();
    c.save(); c.translate(-w * .18, -h * .13); c.scale(.6, .6); eggPath(c, w, h); c.fillStyle = shade(col, .22); c.globalAlpha = .55; c.fill(); c.restore();
    for (let i = 0; i < 9; i++) { const a = rnd(i + 4) * TAU, r = rnd(i + 9) * .7; circ(c, Math.cos(a) * w * r * .8, h * .12 + Math.sin(a) * h * r * .7, s * (.008 + rnd(i) * .008), 'rgba(160,110,60,.4)'); }
    eggPath(c, w, h); edge(c, shade(col, -.38), s * .016);
    ell(c, -s * .13, -s * .15, s * .045, s * .1, '#fff', .4); c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-s * .13, -s * .15, s * .04, s * .09, .4, 0, TAU); c.fill();
    c.restore();
  }
  // a butter stick lying down, the left half still in its paper and the end of the paper folded back
  function drawButter(c, s, o = {}) {
    const paper = o.paper !== false;
    soft(c, s * .06, s * .27, s * .52, s * .06);
    poly(c, [[s * .44, -s * .02], [s * .54, -s * .16], [s * .54, s * .12], [s * .44, s * .3]], '#e6b232');       // end face
    box(c, -s * .44, -s * .02, s * .88, s * .32, '#ffdc5e', s * .035);                                          // front
    c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, -s * .4, s * .0, s * .8, s * .05, s * .02); c.fill();
    poly(c, [[-s * .44, -s * .02], [s * .44, -s * .02], [s * .54, -s * .16], [-s * .34, -s * .16]], '#fff2a8');   // top
    c.strokeStyle = 'rgba(210,160,30,.35)'; c.lineWidth = s * .012; c.beginPath(); c.moveTo(s * .3, -s * .1); c.lineTo(s * .44, -s * .1); c.stroke();
    if (paper) {
      poly(c, [[-s * .44, -s * .02], [s * .02, -s * .02], [s * .12, -s * .16], [-s * .34, -s * .16]], '#fffdf6');
      box(c, -s * .44, -s * .02, s * .46, s * .32, '#f6f2e8', s * .03);
      box(c, -s * .44, s * .08, s * .46, s * .1, '#f0b429', 0); box(c, -s * .44, s * .08, s * .46, s * .03, '#ffd36a', 0);
      box(c, -s * .36, s * .21, s * .22, s * .035, '#cfc7b4', s * .015); box(c, -s * .36, s * .0, s * .3, s * .035, '#cfc7b4', s * .015);
      // the folded-back end: a little triangle of paper hanging off the front, showing its inside
      poly(c, [[s * .02, -s * .02], [s * .02, s * .3], [s * .18, s * .12]], '#e9e3d2');
      poly(c, [[s * .02, -s * .02], [s * .02, s * .3], [s * .09, s * .2]], 'rgba(150,130,90,.25)');
      c.strokeStyle = '#c4b99f'; c.lineWidth = s * .014; c.beginPath(); c.moveTo(s * .02, -s * .02); c.lineTo(s * .02, s * .3); c.moveTo(s * .02, s * .3); c.lineTo(s * .18, s * .12); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(-s * .44, -s * .02); c.lineTo(s * .02, -s * .02); c.lineTo(s * .06, -s * .08); c.lineTo(-s * .4, -s * .08); c.closePath(); c.fill();
    }
  }
  // a milk carton with a gable top and a blue band
  function drawMilk(c, s) {
    soft(c, s * .06, s * .47, s * .36, s * .06);
    poly(c, [[s * .1, -s * .06], [s * .3, -s * .14], [s * .3, s * .38], [s * .1, s * .46]], '#d3e3f2');
    poly(c, [[s * .1, s * .12], [s * .3, s * .06], [s * .3, s * .26], [s * .1, s * .32]], '#4aa0dc');
    box(c, -s * .3, -s * .06, s * .4, s * .52, '#fff', s * .015);
    c.fillStyle = 'rgba(190,215,238,.45)'; c.fillRect(-s * .3, -s * .06, s * .05, s * .52);
    box(c, -s * .3, s * .12, s * .4, s * .2, '#6cc2f2', 0); box(c, -s * .3, s * .12, s * .4, s * .04, '#9ad8f8', 0);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-s * .1, s * .15); c.bezierCurveTo(-s * .03, s * .21, -s * .05, s * .3, -s * .1, s * .3); c.bezierCurveTo(-s * .15, s * .3, -s * .17, s * .21, -s * .1, s * .15); c.fill();   // a milk drop
    poly(c, [[-s * .3, -s * .06], [s * .1, -s * .06], [-s * .1, -s * .3]], '#f1f7fc');                       // gable end
    poly(c, [[s * .1, -s * .06], [-s * .1, -s * .3], [s * .1, -s * .38], [s * .3, -s * .14]], '#dbe9f6');     // roof slope
    poly(c, [[-s * .1, -s * .3], [s * .1, -s * .38], [s * .1, -s * .44], [-s * .1, -s * .36]], '#fff');      // the fin along the ridge
    c.strokeStyle = '#9fbad4'; c.lineWidth = s * .018; c.lineJoin = c.lineCap = 'round'; c.beginPath(); c.moveTo(-s * .3, -s * .06); c.lineTo(-s * .1, -s * .3); c.lineTo(s * .1, -s * .38); c.lineTo(s * .3, -s * .14); c.lineTo(s * .3, s * .38); c.lineTo(s * .1, s * .46); c.lineTo(-s * .3, s * .46); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(-s * .3, -s * .06); c.lineTo(s * .1, -s * .06); c.lineTo(s * .3, -s * .14); c.moveTo(s * .1, -s * .06); c.lineTo(s * .1, s * .46); c.moveTo(-s * .1, -s * .3); c.lineTo(s * .1, -s * .06); c.stroke();
  }
  const chipPath = (c, r) => { c.beginPath(); c.moveTo(0, -r * 1.0); c.bezierCurveTo(r * .2, -r * .55, r * .92, -r * .3, r * .92, r * .38); c.bezierCurveTo(r * .92, r * .98, -r * .92, r * .98, -r * .92, r * .38); c.bezierCurveTo(-r * .92, -r * .3, -r * .2, -r * .55, 0, -r * 1.0); c.closePath(); };
  // one chocolate chip (a teardrop with a pointed top)
  function drawChip(c, x, y, r, rot = 0, col = '#5a3320') {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.save(); c.translate(0, r * .1); chipPath(c, r); c.fillStyle = shade(col, -.45); c.fill(); c.restore();
    chipPath(c, r); c.fillStyle = col; c.fill();
    c.save(); c.translate(-r * .2, -r * .06); c.scale(.55, .6); chipPath(c, r); c.fillStyle = shade(col, .25); c.globalAlpha = .6; c.fill(); c.restore();
    shine(c, -r * .3, r * .1, r * .1, r * .2, .3, .5);
    c.restore();
  }
  function chipPile(c, s) {
    soft(c, 0, s * .4, s * .42, s * .06);
    const lay = [[-.06, -.28, .1], [-.22, -.12, -.3], [.12, -.14, .9], [-.4, .06, 1.2], [-.1, .02, .15], [.2, .04, -.6], [.4, .1, .5], [-.3, .24, -.9], [-.05, .22, .3], [.18, .24, 1.4], [.38, .3, -.2], [-.44, .3, .4]];
    for (const [x, y, rot] of lay) drawChip(c, x * s * .78, (y * .86 + .03) * s, s * .12, rot);
  }

  /* ---------------------------------------------------------------- measuring cups and a spoon: centred, size s, tilt in radians */
  function drawMeasure(c, kind, s, fill = 0, col = '#ffffff', tilt = 0) {
    fill = clamp(fill == null ? 0 : fill, 0, 1);
    c.save(); c.rotate(tilt || 0); c.lineJoin = c.lineCap = 'round';
    if (kind === 'tbsp') {
      // a steel tablespoon seen from above, bowl on the left
      c.fillStyle = 'rgba(80,40,20,.14)'; c.beginPath(); c.ellipse(-s * .26 + s * .03, s * .05, s * .2, s * .15, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-s * .08, -s * .03); c.lineTo(s * .44, -s * .045); c.quadraticCurveTo(s * .5, 0, s * .44, s * .045); c.lineTo(-s * .08, s * .03); c.closePath();
      c.fillStyle = lin(c, 0, -s * .05, 0, s * .05, [[0, '#eef2f8'], [1, '#a8b4c6']]); c.fill(); edge(c, '#8996ab', s * .014);
      ell(c, -s * .27, 0, s * .2, s * .14, '#8996ab'); ell(c, -s * .27, 0, s * .185, s * .125, lin(c, -s * .4, -s * .12, -s * .15, s * .12, [[0, '#f4f7fb'], [1, '#bcc7d7']]));
      ell(c, -s * .27, s * .01, s * .15, s * .095, '#d9e1ed');
      if (fill > .02) { const k = Math.sqrt(fill); ell(c, -s * .27, s * .01, s * .15 * k, s * .095 * k, col); c.fillStyle = shade(col, .3); c.globalAlpha = .6; c.beginPath(); c.ellipse(-s * .295, -s * .012, s * .07 * k, s * .035 * k, -.3, 0, TAU); c.fill(); c.globalAlpha = 1; if (fill > .8) { c.fillStyle = col; c.beginPath(); c.ellipse(-s * .27, -s * .02, s * .12, s * .07, 0, Math.PI, 0); c.fill(); shine(c, -s * .3, -s * .045, s * .05, s * .02, -.3, .45); } }
      shine(c, -s * .36, -s * .06, s * .05, s * .02, -.5, .8); c.fillStyle = '#fff'; c.globalAlpha = .7; rr(c, s * .0, -s * .02, s * .38, s * .014, s * .007); c.fill(); c.globalAlpha = 1;
      c.restore(); return;
    }
    const k = kind === 'half' ? .78 : 1, hw1 = s * .31 * k, hw0 = s * .26 * k, top = -s * .32 * k, bot = s * .32 * k, hh = bot - top;
    const glass = () => { c.beginPath(); c.moveTo(-hw1, top); c.lineTo(-hw0, bot - s * .06 * k); c.quadraticCurveTo(-hw0, bot, -hw0 + s * .06 * k, bot); c.lineTo(hw0 - s * .06 * k, bot); c.quadraticCurveTo(hw0, bot, hw0, bot - s * .06 * k); c.lineTo(hw1, top); c.closePath(); };
    c.fillStyle = 'rgba(80,40,20,.12)'; c.beginPath(); c.ellipse(s * .04, bot + s * .02, hw0 * 1.1, s * .04 * k, 0, 0, TAU); c.fill();
    // handle
    const hc = kind === 'half' ? '#ff8fb0' : 'rgba(120,175,215,.95)';
    c.strokeStyle = hc; c.lineWidth = s * .085 * k; c.beginPath(); c.moveTo(hw1 - s * .02, top + s * .1 * k); c.bezierCurveTo(hw1 + s * .36 * k, top + s * .02 * k, hw1 + s * .34 * k, bot - s * .14 * k, hw0 * .96, bot - s * .14 * k); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = s * .022 * k; c.beginPath(); c.moveTo(hw1 + s * .02, top + s * .09 * k); c.bezierCurveTo(hw1 + s * .3 * k, top + s * .03 * k, hw1 + s * .3 * k, bot - s * .2 * k, hw0 * .98, bot - s * .19 * k); c.stroke();
    // the back of the glass, then what is inside, then the front
    c.fillStyle = 'rgba(222,240,252,.45)'; glass(); c.fill();
    if (fill > .005) {
      const Ly = bot - fill * hh * .96, wy = Ly * Math.cos(tilt || 0);
      c.save(); glass(); c.clip(); c.rotate(-(tilt || 0));
      c.fillStyle = col; c.fillRect(-s, wy, s * 2, s);
      c.fillStyle = shade(col, .28); c.globalAlpha = .55; c.fillRect(-s, wy, s * 2, s * .03 * k); c.globalAlpha = 1;
      c.fillStyle = shade(col, -.12); c.globalAlpha = .35; c.fillRect(hw1 * .45, wy, s, s); c.globalAlpha = 1;
      c.restore();
    }
    c.fillStyle = 'rgba(235,247,255,.28)'; glass(); c.fill();
    glass(); edge(c, 'rgba(105,155,195,.95)', s * .024 * k);
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(-hw1 + s * .045 * k, top + s * .06 * k); c.lineTo(-hw0 + s * .04 * k, bot - s * .14 * k); c.lineTo(-hw0 + s * .075 * k, bot - s * .14 * k); c.lineTo(-hw1 + s * .08 * k, top + s * .06 * k); c.closePath(); c.fill();
    // measuring lines (and the rim lip)
    c.strokeStyle = 'rgba(60,110,160,.9)'; c.lineWidth = s * .02 * k; c.lineCap = 'round';
    const marks = kind === 'half' ? [.5, 1] : [.25, .5, .75, 1];
    for (const m of marks) { const y = bot - m * hh * .96, x = hw0 + (hw1 - hw0) * m, L = (m === .5 || m === 1) ? .2 : .12; c.beginPath(); c.moveTo(x - s * .05 * k, y); c.lineTo(x - s * (.05 + L) * k, y); c.stroke(); }
    c.restore();
  }

  /* ---------------------------------------------------------------- ingredients laid out on the counter */
  function drawEggCarton(c, s, n) {
    n = clamp(Math.round(n == null ? 3 : n), 0, 3);
    soft(c, s * .02, s * .34, s * .56, s * .07);
    box(c, -s * .5, -s * .56, s * 1.0, s * .5, '#b8a07c', s * .05); box(c, -s * .45, -s * .52, s * .9, s * .42, '#cdb792', s * .04);
    box(c, -s * .3, -s * .4, s * .6, s * .12, '#e8dcc2', s * .03);
    box(c, -s * .5, -s * .08, s * 1.0, s * .4, '#dccaa8', s * .06);
    const xs = [-.31, 0, .31];
    const has = n === 1 ? [1] : n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [];
    for (const x of xs) ell(c, x * s, -s * .04, s * .14, s * .06, '#b39b76');
    for (const i of has) { c.save(); c.translate(xs[i] * s, -s * .24); drawEgg(c, s * .56, i === 1 ? '#f3dcb0' : '#f0d3a0'); c.restore(); }
    c.fillStyle = '#dccaa8'; c.beginPath(); c.moveTo(-s * .5, -s * .02); for (let i = 0; i < 3; i++) { const x0 = -s * .5 + i * s * .333, x1 = x0 + s * .333; c.quadraticCurveTo((x0 + x1) / 2, s * -.1, x1, -s * .02); } c.lineTo(s * .5, s * .26); c.quadraticCurveTo(s * .5, s * .32, s * .44, s * .32); c.lineTo(-s * .44, s * .32); c.quadraticCurveTo(-s * .5, s * .32, -s * .5, s * .26); c.closePath(); c.fill();
    c.strokeStyle = '#b39b76'; c.lineWidth = s * .015; c.lineJoin = 'round'; c.stroke();
    c.strokeStyle = 'rgba(160,130,90,.45)'; c.lineWidth = s * .014; for (const x of [-.167, .167]) { c.beginPath(); c.moveTo(x * s, -s * .02); c.lineTo(x * s, s * .3); c.stroke(); }
  }
  function drawButterPlate(c, s, n) {
    n = clamp(Math.round(n == null ? 1 : n), 0, 4);
    ell(c, s * .02, s * .34, s * .52, s * .17, 'rgba(80,40,20,.14)');
    ell(c, 0, s * .3, s * .5, s * .17, '#d7e4f2'); ell(c, 0, s * .28, s * .5, s * .165, '#f4f8fd'); ell(c, 0, s * .29, s * .38, s * .11, '#e6eef8');
    for (let i = 0; i < n; i++) { c.save(); c.translate((i % 2 ? .05 : -.04) * s, s * (.2 - i * .17)); c.scale(.66, .66); drawButter(c, s, { paper: i === 0 }); c.restore(); }
    if (!n) { poly(c, [[-.3 * s, .26 * s], [.1 * s, .2 * s], [.3 * s, .3 * s], [-.1 * s, .38 * s]], '#f6f2e8'); }
  }
  function drawChipBowl(c, s) {
    soft(c, 0, s * .4, s * .5, s * .07);
    ell(c, 0, s * .0, s * .45, s * .13, '#6aaed8');
    c.save(); c.translate(0, -s * .1); chipPile(c, s * .78); c.restore();
    c.fillStyle = lin(c, -s * .45, 0, s * .45, 0, [[0, '#93d4f5'], [.5, '#7cc6f0'], [1, '#5aa6d8']]); c.beginPath(); c.moveTo(-s * .46, s * .0); c.quadraticCurveTo(-s * .44, s * .42, 0, s * .44); c.quadraticCurveTo(s * .44, s * .42, s * .46, s * .0); c.quadraticCurveTo(0, s * .14, -s * .46, s * .0); c.closePath(); c.fill(); edge(c, '#4a90c0', s * .018);
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = s * .035; c.beginPath(); c.moveTo(-s * .4, s * .07); c.quadraticCurveTo(-s * .38, s * .25, -s * .2, s * .34); c.stroke();
    for (const [x, y] of [[-.16, .24], [.04, .3], [.22, .22], [.34, .12]]) circ(c, x * s, y * s, s * .028, 'rgba(255,255,255,.85)');
  }
  function drawPile(c, id, n, s) {
    c.save();
    if (id === 'egg') drawEggCarton(c, s, n);
    else if (id === 'flour') flourSack(c, s, true);
    else if (id === 'sugar') sugarJar(c, s, true);
    else if (id === 'butter') drawButterPlate(c, s, n);
    else if (id === 'milk') { drawMilk(c, s); poly(c, [[-s * .1, -s * .3], [s * .0, -s * .335], [s * .0, -s * .4], [-s * .1, -s * .36]], '#cfe0ef'); }
    else if (id === 'chips') drawChipBowl(c, s);
    else if (ING[id]) ING[id](c, s);
    c.restore();
  }

  /* ---------------------------------------------------------------- the six pantry tray pictures */
  ING.flour = (c, s) => flourSack(c, s, false);
  ING.sugar = (c, s) => sugarJar(c, s, false);
  ING.egg = (c, s) => drawEgg(c, s);
  ING.butter = (c, s) => drawButter(c, s);
  ING.milk = (c, s) => drawMilk(c, s);
  ING.chips = (c, s) => chipPile(c, s);

  /* ---------------------------------------------------------------- sprinkles */
  const SPRINKLE_KINDS = ['rainbow', 'choc', 'pastel', 'stars', 'hearts', 'dots'];
  const SPR_COL = { rainbow: '#ff6b81', choc: '#6a3d22', pastel: '#ffb8d8', stars: '#ffd54a', hearts: '#ff5a7a', dots: '#5cc8f2' };
  const SPR_PAL = { rainbow: ['#ff6b81', '#ffd54a', '#5cc8f2', '#7ed957', '#b58cf0', '#ff9d3d'], choc: ['#4a2a18', '#6a3d22', '#8a5530'], pastel: ['#ffb8d8', '#bfe3ff', '#d2f2b8', '#fff0a8', '#dcc8ff'], stars: ['#ffd54a', '#ff8fb8', '#7fd4f5', '#b58cf0'], hearts: ['#ff5a7a', '#ffa8c4', '#ff8fb8', '#e8337a'], dots: ['#ff6b81', '#ffd54a', '#5cc8f2', '#7ed957', '#b58cf0', '#ff9d3d'] };
  // ONE sprinkle piece. s = its length (rods) or about its width (round, star, heart); col optional; rot radians
  function drawSprinkle(c, kind, s, col, rot = 0) {
    col = col || SPR_COL[kind] || SPR_COL.rainbow; if (kind === 'stars' || kind === 'hearts' || kind === 'dots') s *= 1.12;
    c.save(); c.rotate(rot || 0); c.lineJoin = c.lineCap = 'round';
    if (kind === 'stars') { c.beginPath(); starPath(c, s * .6, .5); c.lineWidth = s * .16; c.strokeStyle = shade(col, -.15); c.stroke(); c.fillStyle = col; c.fill(); shine(c, -s * .12, -s * .1, s * .08, s * .045, -.6, .6); }
    else if (kind === 'hearts') { c.save(); c.translate(0, -s * .1); c.beginPath(); heartPath(c, s * .44); c.lineWidth = s * .12; c.strokeStyle = shade(col, -.18); c.stroke(); c.fillStyle = col; c.fill(); shine(c, -s * .15, -s * .02, s * .08, s * .045, -.7, .6); c.restore(); }
    else if (kind === 'dots') { circ(c, 0, 0, s * .42, shade(col, -.2)); circ(c, -s * .02, -s * .03, s * .37, col); shine(c, -s * .13, -s * .15, s * .1, s * .05, -.7, .7); }
    else { box(c, -s / 2, -s * .17, s, s * .34, shade(col, -.2), s * .17); box(c, -s / 2, -s * .17, s, s * .24, col, s * .12); c.fillStyle = 'rgba(255,255,255,.5)'; rr(c, -s * .38, -s * .12, s * .6, s * .06, s * .03); c.fill(); }
    c.restore();
  }
  // a zoomed-in heap of sprinkles of one kind
  function sprHeapDraw(c, s, kind, count) {
    const pal = SPR_PAL[kind], items = [];
    soft(c, 0, s * .38, s * .44, s * .06);
    for (let i = 0; i < count; i++) { const x = (rnd(i * 3 + 1) - .5) * .88, hmax = .7 * Math.pow(Math.max(0, 1 - (x / .46) * (x / .46)), .6), y = .36 - Math.pow(rnd(i * 3 + 2), .85) * hmax; items.push([x, y, i]); }
    items.sort((a, b) => a[1] - b[1]);
    const sz = kind === 'stars' ? .21 : kind === 'hearts' ? .2 : kind === 'dots' ? .15 : .24;
    for (const [x, y, i] of items) { c.save(); c.translate(x * s, y * s); drawSprinkle(c, kind, s * sz, pal[i % pal.length], rnd(i * 7 + 5) * Math.PI); c.restore(); }
  }
  ING.sprinkles = (c, s) => { const items = []; const pal = SPR_PAL.rainbow; soft(c, 0, s * .38, s * .44, s * .06); for (let i = 0; i < 60; i++) { const x = (rnd(i * 3 + 1) - .5) * .88, hmax = .7 * Math.pow(Math.max(0, 1 - (x / .46) * (x / .46)), .6), y = .36 - Math.pow(rnd(i * 3 + 2), .85) * hmax; items.push([x, y, i]); } items.sort((a, b) => a[1] - b[1]); for (const [x, y, i] of items) { c.save(); c.translate(x * s, y * s); const k = i % 11 === 0 ? 'stars' : i % 9 === 4 ? 'dots' : 'rainbow'; drawSprinkle(c, k, s * (k === 'stars' ? .2 : k === 'dots' ? .14 : .24), pal[i % pal.length], rnd(i * 7 + 5) * Math.PI); c.restore(); } };
  for (const k of SPRINKLE_KINDS) ING['spr-' + k] = (c, s) => sprHeapDraw(c, s, k, k === 'stars' || k === 'hearts' ? 30 : 52);

  /* ---------------------------------------------------------------- candies */
  const CANDY_KINDS = ['dot', 'star', 'heart', 'flower', 'moon', 'gem'];
  const CANDY_COL = { dot: '#5cc8f2', star: '#ffd54a', heart: '#ff6b81', flower: '#ff9ed0', moon: '#ffe27a', gem: '#8fd8ff' };
  const CANDY_PAL = { dot: ['#ff6b81', '#5cc8f2', '#ffd54a'], star: ['#ffd54a', '#ff9d3d', '#ff8fb8'], heart: ['#ff6b81', '#ff9ed0', '#e8337a'], flower: ['#ff9ed0', '#ffd54a', '#b58cf0'], moon: ['#ffe27a', '#bfe3ff', '#ffc4dc'], gem: ['#8fd8ff', '#c9a8ff', '#8fe070'] };
  // ONE candy. s = its radius (about half its width); col optional
  function drawCandy(c, kind, s, col) {
    col = col || CANDY_COL[kind] || CANDY_COL.dot;
    const dk = shade(col, -.22), lt = shade(col, .45);
    c.save(); c.lineJoin = c.lineCap = 'round';
    if (kind === 'star') { c.beginPath(); starPath(c, s * .95, .5); c.lineWidth = s * .26; c.strokeStyle = dk; c.stroke(); c.fillStyle = col; c.fill(); c.save(); c.translate(-s * .06, -s * .06); c.beginPath(); starPath(c, s * .5, .5); c.fillStyle = lt; c.globalAlpha = .55; c.fill(); c.restore(); }
    else if (kind === 'heart') { c.save(); c.translate(0, -s * .08); c.beginPath(); heartPath(c, s * .86); c.lineWidth = s * .24; c.strokeStyle = dk; c.stroke(); c.fillStyle = col; c.fill(); shine(c, -s * .38, -s * .06, s * .2, s * .1, -.7, .65); c.restore(); }
    else if (kind === 'flower') { for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; circ(c, Math.cos(a) * s * .55, Math.sin(a) * s * .55, s * .42, dk); } for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - Math.PI / 2; circ(c, Math.cos(a) * s * .55, Math.sin(a) * s * .55, s * .37, col); shine(c, Math.cos(a) * s * .55 - s * .1, Math.sin(a) * s * .55 - s * .1, s * .09, s * .05, -.7, .5); } circ(c, 0, 0, s * .3, '#ffd54a'); circ(c, -s * .03, -s * .03, s * .22, '#ffe98a'); }
    else if (kind === 'moon') { const R = s, ri = s * .82, d = s * .5, x = (d * d + R * R - ri * ri) / (2 * d), y = Math.sqrt(R * R - x * x), a = Math.atan2(y, x), b = Math.atan2(y, x - d); c.save(); c.rotate(-.5); c.beginPath(); c.arc(0, 0, R, -a, a, true); c.arc(d, 0, ri, b, TAU - b, false); c.closePath(); c.lineWidth = s * .22; c.strokeStyle = dk; c.stroke(); c.fillStyle = col; c.fill(); c.fillStyle = lt; c.globalAlpha = .6; c.beginPath(); c.ellipse(-s * .6, -s * .35, s * .1, s * .26, .6, 0, TAU); c.fill(); c.restore(); }
    else if (kind === 'gem') { const P = [[-.5, -.2], [-.28, -.55], [.28, -.55], [.5, -.2], [0, .62]].map(([x, y]) => [x * s * 1.7, y * s * 1.5]); c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.lineWidth = s * .2; c.strokeStyle = dk; c.stroke(); c.fillStyle = col; c.fill(); poly(c, [P[0], P[1], [0, P[1][1]], [-.18 * s, P[0][1]]], lt); poly(c, [P[1], P[2], [.18 * s, P[0][1]], [-.18 * s, P[0][1]]], shade(col, .2)); poly(c, [P[2], P[3], [.18 * s, P[0][1]]], shade(col, .05)); poly(c, [P[0], [-.18 * s, P[0][1]], P[4]], shade(col, -.06)); poly(c, [[-.18 * s, P[0][1]], [.18 * s, P[0][1]], P[4]], shade(col, -.14)); poly(c, [[.18 * s, P[0][1]], P[3], P[4]], shade(col, -.24)); spark4(c, -s * .4, -s * .5, s * .22, '#fff'); }
    else { circ(c, 0, s * .06, s * .98, dk); circ(c, 0, 0, s * .92, col); c.fillStyle = shade(col, .2); c.beginPath(); c.arc(0, 0, s * .66, Math.PI * 1.05, Math.PI * 1.85); c.lineWidth = s * .0; c.fill(); circ(c, -s * .02, -s * .02, s * .62, col); shine(c, -s * .33, -s * .36, s * .22, s * .11, -.7, .7); circ(c, s * .3, s * .32, s * .07, 'rgba(255,255,255,.55)'); }
    c.restore();
  }
  for (const k of CANDY_KINDS) ING['cdy-' + k] = (c, s) => { const pal = CANDY_PAL[k], r = s * (k === 'dot' ? .19 : k === 'gem' ? .15 : .18); for (const [x, y, i] of [[-.2, .12, 1], [.2, .14, 2], [0, -.18, 0]]) { c.save(); c.translate(x * s, y * s); c.rotate((i - 1) * .35); drawCandy(c, k, r, pal[i]); c.restore(); } };
  ING.candy = (c, s) => { const ks = ['dot', 'star', 'heart', 'flower', 'gem']; [[-.22, -.14, 0], [.2, -.16, 1], [0, .0, 2], [-.24, .22, 3], [.24, .2, 4]].forEach(([x, y, i]) => { c.save(); c.translate(x * s, y * s); drawCandy(c, ks[i], s * (ks[i] === 'gem' ? .11 : .15), CANDY_PAL[ks[i]][i % 3]); c.restore(); }); };

  /* ---------------------------------------------------------------- birthday candles */
  const CANDLE_KINDS = [
    { id: 'pink', name: 'Pink stripes', style: 'stripe', a: '#ff8fbe', b: '#ffffff' },
    { id: 'blue', name: 'Blue swirl', style: 'spiral', a: '#6cc6f2', b: '#ffffff' },
    { id: 'dots', name: 'Purple dots', style: 'dots', a: '#b58cf0', b: '#ffffff' },
    { id: 'gold', name: 'Golden glitter', style: 'glitter', a: '#f2c042', b: '#fff6c8' },
    { id: 'rainbow', name: 'Rainbow', style: 'bands', a: '#ff6b81', b: '#ffd54a', cols: ['#ff6b81', '#ff9d3d', '#ffd54a', '#7ed957', '#5cc8f2', '#b58cf0'] },
    { id: 'one', name: 'Number one', style: 'one', a: '#7ed957', b: '#ffffff' },
    { id: 'star', name: 'Star candle', style: 'star', a: '#ff9d3d', b: '#ffffff' },
    { id: 'twist', name: 'Twisted', style: 'twist', a: '#ffd54a', b: '#ff8f5a' },
    { id: 'hearts', name: 'Hearts', style: 'hearts', a: '#ff5a7a', b: '#ffffff' }
  ];
  function flameArt(c, s, x, y) {
    c.save(); c.translate(x, y); c.rotate(Math.sin(Date.now() / 170) * .05);
    const g = c.createRadialGradient(0, -s * .02, 0, 0, -s * .02, s * .3); g.addColorStop(0, 'rgba(255,214,110,.55)'); g.addColorStop(1, 'rgba(255,214,110,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, -s * .02, s * .3, 0, TAU); c.fill();
    for (const [k, col] of [[1, '#ff9d3d'], [.68, '#ffd54a'], [.34, '#fff6cc']]) { c.fillStyle = col; c.beginPath(); c.moveTo(0, -s * .17 * k); c.bezierCurveTo(s * .1 * k, -s * .06 * k, s * .09 * k, s * .08 * k + (1 - k) * s * .02, 0, s * .08 * k + (1 - k) * s * .03); c.bezierCurveTo(-s * .09 * k, s * .08 * k + (1 - k) * s * .02, -s * .1 * k, -s * .06 * k, 0, -s * .17 * k); c.fill(); }
    c.restore();
  }
  function drawCandle(c, id, s, lit) {
    const K = CANDLE_KINDS.find(q => q.id === id) || CANDLE_KINDS[1];
    c.save(); c.lineJoin = c.lineCap = 'round';
    const thin = K.style === 'twist' ? .78 : 1, hw = s * .095 * thin, yt = -s * .14, yb = s * .46;
    let top = yt;
    const shadeBody = () => { c.fillStyle = 'rgba(255,255,255,.42)'; c.fillRect(-hw * .8, yt - s * .02, hw * .32, yb - yt + s * .04); c.fillStyle = 'rgba(60,20,40,.16)'; c.fillRect(hw * .45, yt - s * .02, hw * .6, yb - yt + s * .04); };
    if (K.style === 'one') {
      const one = () => { c.beginPath(); c.moveTo(-s * .11, -s * .2); c.lineTo(s * .11, -s * .2); c.lineTo(s * .11, s * .34); c.lineTo(s * .24, s * .34); c.quadraticCurveTo(s * .27, s * .34, s * .27, s * .37); c.lineTo(s * .27, s * .43); c.quadraticCurveTo(s * .27, s * .46, s * .24, s * .46); c.lineTo(-s * .24, s * .46); c.quadraticCurveTo(-s * .27, s * .46, -s * .27, s * .43); c.lineTo(-s * .27, s * .37); c.quadraticCurveTo(-s * .27, s * .34, -s * .24, s * .34); c.lineTo(-s * .11, s * .34); c.lineTo(-s * .11, -s * .02); c.lineTo(-s * .27, s * .04); c.lineTo(-s * .27, -s * .1); c.closePath(); };
      one(); c.fillStyle = K.a; c.fill(); c.save(); one(); c.clip(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-s * .27, -s * .25, s * .09, s * .8); for (const [x, y] of [[0, -.1], [0, .08], [0, .24], [-.2, -.02]]) circ(c, x * s, y * s, s * .028, K.b); c.fillStyle = 'rgba(30,70,20,.2)'; c.fillRect(s * .04, -s * .25, s * .3, s * .8); c.restore(); one(); edge(c, shade(K.a, -.35), s * .016);
      top = -s * .2;
    } else {
      c.save(); rr(c, -hw, yt, hw * 2, yb - yt, s * .03); c.clip(); c.fillStyle = K.a; c.fillRect(-hw, yt, hw * 2, yb - yt);
      if (K.style === 'stripe' || K.style === 'star') { c.fillStyle = K.b; for (let y = yt - s * .1; y < yb + s * .1; y += s * .125) poly(c, [[-hw * 1.2, y + s * .045], [hw * 1.2, y - s * .045], [hw * 1.2, y + s * .02], [-hw * 1.2, y + s * .11]], K.b); }
      else if (K.style === 'spiral') { c.strokeStyle = K.b; c.lineWidth = s * .03; for (let y = yt - s * .12; y < yb + s * .1; y += s * .1) { c.beginPath(); c.moveTo(-hw * 1.2, y + s * .06); c.quadraticCurveTo(0, y + s * .0, hw * 1.2, y - s * .06); c.stroke(); } }
      else if (K.style === 'dots') { let r = 0; for (let y = yt + s * .06; y < yb; y += s * .1, r++) for (const x of r % 2 ? [-.05, .05] : [0]) circ(c, x * s + (r % 2 ? 0 : 0), y, s * .022, K.b); }
      else if (K.style === 'glitter') { for (let i = 0; i < 20; i++) circ(c, (rnd(i + 2) - .5) * hw * 1.7, yt + rnd(i + 9) * (yb - yt), s * (.008 + rnd(i) * .008), '#fff'); }
      else if (K.style === 'bands') { const n = K.cols.length, h = (yb - yt) / n; K.cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(-hw, yt + i * h, hw * 2, h + 1); }); }
      else if (K.style === 'hearts') { let r = 0; for (let y = yt + s * .08; y < yb - s * .02; y += s * .13, r++) { c.save(); c.translate((r % 2 ? .035 : -.03) * s, y); c.fillStyle = K.b; c.beginPath(); heartPath(c, s * .03); c.fill(); c.restore(); } }
      else if (K.style === 'twist') { c.strokeStyle = K.b; c.lineWidth = s * .055; for (let y = yt - s * .15; y < yb + s * .15; y += s * .13) { c.beginPath(); c.moveTo(-hw * 1.4, y + s * .09); c.lineTo(hw * 1.4, y - s * .09); c.stroke(); } }
      shadeBody(); c.restore();
      rr(c, -hw, yt, hw * 2, yb - yt, s * .03); edge(c, shade(K.a, -.35), s * .014);
      if (K.style === 'glitter') { spark4(c, -hw * 1.5, yt + s * .12, s * .05, '#fff3b0'); spark4(c, hw * 1.55, yt + s * .34, s * .04, '#fff3b0'); }
      if (K.style === 'star') { c.save(); c.translate(0, yt - s * .01); c.beginPath(); starPath(c, s * .15, .5); c.lineWidth = s * .05; c.strokeStyle = '#d99a12'; c.stroke(); c.fillStyle = '#ffd54a'; c.fill(); shine(c, -s * .04, -s * .04, s * .03, s * .018, -.7, .7); c.restore(); top = yt - s * .09; }
    }
    c.strokeStyle = '#5a3a2a'; c.lineWidth = s * .022; c.beginPath(); c.moveTo(0, top); c.lineTo(0, top - s * .06); c.stroke();
    if (lit) flameArt(c, s, 0, top - s * .15);
    c.restore();
  }
  for (const k of CANDLE_KINDS) ING['cnd-' + k.id] = (c, s) => { c.save(); c.translate(0, s * .02); drawCandle(c, k.id, s * .95, true); c.restore(); };
  ING.candle = (c, s) => drawCandle(c, 'blue', s, true);

  /* ---------------------------------------------------------------- fruit */
  const FRUIT_KINDS = ['strawberry', 'blueberry', 'cherry', 'raspberry', 'banana', 'kiwi', 'orange', 'grape'];
  const leafAt = (c, x, y, rx, ry, rot, col) => { ell(c, x, y, rx, ry, col, rot); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = rx * .25; c.beginPath(); c.moveTo(x - Math.sin(rot) * ry * .9, y + Math.cos(rot) * ry * .9); c.lineTo(x + Math.sin(rot) * ry * .9, y - Math.cos(rot) * ry * .9); c.stroke(); };
  ING.strawberry = (c, s) => {
    const body = () => { c.beginPath(); c.moveTo(0, s * .47); c.bezierCurveTo(-s * .55, s * .12, -s * .44, -s * .4, 0, -s * .3); c.bezierCurveTo(s * .44, -s * .4, s * .55, s * .12, 0, s * .47); c.closePath(); };
    c.fillStyle = lin(c, -s * .4, 0, s * .45, 0, [[0, '#f0525a'], [.55, '#e23a44'], [1, '#bf2a3a']]); body(); c.fill(); edge(c, '#a82234', s * .016);
    for (const [x, y] of [[-.2, -.12], [.0, -.16], [.2, -.1], [-.28, .06], [-.1, .04], [.1, .06], [.28, .08], [-.18, .22], [0, .2], [.18, .22], [-.07, .35], [.08, .35]]) { c.save(); c.translate(x * s, y * s); c.rotate(x * 1.2); ell(c, 0, 0, s * .022, s * .036, '#ffe27a'); c.restore(); }
    shine(c, -s * .22, -s * .12, s * .05, s * .12, .3, .45);
    for (const a of [-1.15, -.6, 0, .6, 1.15]) { c.save(); c.translate(0, -s * .3); c.rotate(a); c.fillStyle = '#4fb86a'; c.beginPath(); c.ellipse(0, -s * .03, s * .06, s * .15, 0, 0, TAU); c.fill(); c.restore(); }
    circ(c, 0, -s * .3, s * .05, '#3c9a55'); c.strokeStyle = '#3c9a55'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(0, -s * .32); c.lineTo(s * .03, -s * .46); c.stroke();
  };
  ING.blueberry = (c, s) => {
    circ(c, 0, s * .02, s * .24, '#34408a'); circ(c, 0, 0, s * .22, lin(c, -s * .15, -s * .2, s * .15, s * .2, [[0, '#6a7fd8'], [1, '#3c4aa6']]));
    c.fillStyle = 'rgba(190,205,255,.28)'; c.beginPath(); c.ellipse(-s * .04, -s * .06, s * .17, s * .14, 0, 0, TAU); c.fill();
    c.fillStyle = '#29306e'; c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; c.lineTo(Math.cos(a) * s * .085, s * .0 + Math.sin(a) * s * .085); const b = a + TAU / 10; c.lineTo(Math.cos(b) * s * .035, Math.sin(b) * s * .035); } c.closePath(); c.fill(); circ(c, 0, 0, s * .02, '#6a7fd8');
    shine(c, -s * .1, -s * .12, s * .045, s * .024, -.7, .6);
  };
  ING.cherry = (c, s) => {
    c.strokeStyle = '#5a8a3a'; c.lineWidth = s * .04; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, s * .0); c.quadraticCurveTo(s * .08, -s * .3, s * .22, -s * .42); c.stroke();
    leafAt(c, s * .3, -s * .38, s * .09, s * .16, 1.0, '#4fb86a');
    circ(c, 0, s * .2, s * .26, '#a8182e'); circ(c, 0, s * .19, s * .23, lin(c, -s * .15, s * .0, s * .2, s * .42, [[0, '#f0485f'], [1, '#c8203a']]));
    c.fillStyle = 'rgba(120,10,30,.35)'; c.beginPath(); c.ellipse(0, s * .0, s * .05, s * .025, 0, 0, TAU); c.fill();
    shine(c, -s * .09, s * .1, s * .05, s * .09, .4, .6);
  };
  ING.raspberry = (c, s) => {
    ell(c, 0, s * .06, s * .33, s * .4, '#8e1236');
    const rows = [[-.26, [-.1, .1]], [-.11, [-.2, 0, .2]], [.05, [-.27, -.09, .09, .27]], [.2, [-.18, 0, .18]], [.33, [0]]];
    for (const [y, xs] of rows) xs.forEach((x, j) => { const px = x * s, py = y * s; circ(c, px, py, s * .108, '#b3123e'); circ(c, px - s * .005, py - s * .008, s * .097, '#e0204f'); circ(c, px - s * .03, py - s * .035, s * .035, '#ff7a98'); circ(c, px + s * .035, py + s * .04, s * .02, '#a30f38'); });
    for (const a of [-1, 0, 1]) leafAt(c, a * s * .14, -s * .38, s * .05, s * .11, a * .9 + (a ? 0 : 0), '#4fb86a');
  };
  ING.banana = (c, s) => {
    const rnd5 = r => { c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, k = r * (1 + .05 * Math.cos(5 * a + .6)); const x = Math.cos(a) * k, y = Math.sin(a) * k * .96; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); };
    rnd5(s * .42); c.fillStyle = '#d9a82a'; c.fill(); rnd5(s * .39); c.fillStyle = '#f6d84e'; c.fill();
    rnd5(s * .33); c.fillStyle = '#fff3c0'; c.fill(); rnd5(s * .27); c.fillStyle = '#fffbe6'; c.fill();
    c.strokeStyle = 'rgba(224,186,80,.55)'; c.lineWidth = s * .016; c.beginPath(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; c.moveTo(Math.cos(a) * s * .04, Math.sin(a) * s * .04); c.lineTo(Math.cos(a) * s * .24, Math.sin(a) * s * .24); } c.stroke();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .2; circ(c, Math.cos(a) * s * .1, Math.sin(a) * s * .1, s * .018, '#7a5a30'); }
    circ(c, 0, 0, s * .026, '#7a5a30'); shine(c, -s * .24, -s * .2, s * .07, s * .022, -.6, .65);
  };
  ING.kiwi = (c, s) => {
    ell(c, 0, 0, s * .43, s * .39, '#8a5a2c'); for (let i = 0; i < 24; i++) { const a = rnd(i) * TAU; circ(c, Math.cos(a) * s * .41, Math.sin(a) * s * .37, s * .012, '#a87a44'); }
    ell(c, 0, 0, s * .39, s * .35, '#a9dd5e'); ell(c, 0, 0, s * .34, s * .3, lin(c, 0, -s * .3, 0, s * .3, [[0, '#c4ec78'], [1, '#86c83e']]));
    c.strokeStyle = 'rgba(235,255,200,.7)'; c.lineWidth = s * .014; for (let i = 0; i < 18; i++) { const a = i * TAU / 18; c.beginPath(); c.moveTo(Math.cos(a) * s * .1, Math.sin(a) * s * .09); c.lineTo(Math.cos(a) * s * .3, Math.sin(a) * s * .27); c.stroke(); }
    ell(c, 0, 0, s * .12, s * .105, '#f5fae0');
    for (let i = 0; i < 20; i++) { const a = i * TAU / 20 + .1, r = .17 + (i % 2) * .035; c.save(); c.translate(Math.cos(a) * s * r, Math.sin(a) * s * r * .92); c.rotate(a); ell(c, 0, 0, s * .026, s * .014, '#2a2a20'); c.restore(); }
    shine(c, -s * .2, -s * .16, s * .07, s * .025, -.6, .45);
  };
  ING.orange = (c, s) => {
    // half an orange, flat side up, round side down: rind, pith, juicy wedges
    c.save(); c.translate(0, -s * .22);
    const half = r => { c.beginPath(); c.moveTo(-r, 0); c.arc(0, 0, r, Math.PI, 0, true); c.closePath(); };
    half(s * .48); c.fillStyle = '#ee8a12'; c.fill(); half(s * .45); c.fillStyle = '#ff9d1c'; c.fill(); half(s * .4); c.fillStyle = '#fff1c8'; c.fill(); half(s * .36); c.fillStyle = '#ffb02e'; c.fill();
    c.strokeStyle = '#fff1c8'; c.lineWidth = s * .035; c.lineCap = 'round'; for (let i = 1; i < 5; i++) { const a = i * Math.PI / 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * s * .37, Math.sin(a) * s * .37); c.stroke(); }
    for (let i = 0; i < 5; i++) { const a = (i + .5) * Math.PI / 5; c.fillStyle = 'rgba(255,230,140,.7)'; c.beginPath(); c.ellipse(Math.cos(a) * s * .22, Math.sin(a) * s * .22, s * .04, s * .1, a - Math.PI / 2, 0, TAU); c.fill(); }
    c.restore();
  };
  ING.grape = (c, s) => {
    c.strokeStyle = '#7a5a30'; c.lineWidth = s * .04; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -s * .24); c.quadraticCurveTo(s * .02, -s * .38, s * .1, -s * .46); c.stroke();
    leafAt(c, s * .18, -s * .36, s * .1, s * .17, 1.1, '#4fb86a');
    const g = [[-.22, -.1], [0, -.14], [.22, -.1], [-.12, .1], [.12, .1], [0, .3]];
    for (const [x, y] of g) { circ(c, x * s, y * s, s * .17, '#5a2f8c'); circ(c, x * s, y * s, s * .15, lin(c, x * s - s * .1, y * s - s * .1, x * s + s * .1, y * s + s * .12, [[0, '#a278d8'], [1, '#6a3aa0']])); shine(c, x * s - s * .06, y * s - s * .07, s * .035, s * .02, -.7, .65); }
  };
  Object.assign(NAME, { raspberry: 'A raspberry', banana: 'A banana', kiwi: 'A kiwi', orange: 'An orange', grape: 'Grapes' });

  /* ---------------------------------------------------------------- icing colours, piping pen, paint bucket */
  const ICING12 = { pink: '#ff9ec8', red: '#e8433f', orange: '#ff9d3d', yellow: '#ffe066', mint: '#9fe6c0', green: '#6fcf5a', sky: '#7fd4f5', blue: '#4a78e0', purple: '#b58cf0', white: '#ffffff', chocolate: '#7a4a2a', black: '#2e2a33' };
  function drawIcingPen(c, s, col = '#ff9ec8') {
    c.save(); c.translate(-s * .03, s * .0); c.rotate(.3); c.lineJoin = c.lineCap = 'round';
    const dk = shade(col, -.38), lt = shade(col, .45);
    const bag = () => { c.beginPath(); c.moveTo(-s * .22, -s * .22); c.lineTo(s * .22, -s * .22); c.quadraticCurveTo(s * .2, s * .0, s * .06, s * .26); c.lineTo(-s * .06, s * .26); c.quadraticCurveTo(-s * .2, s * .0, -s * .22, -s * .22); c.closePath(); };
    c.fillStyle = 'rgba(80,40,20,.13)'; c.save(); c.translate(s * .05, s * .05); bag(); c.fill(); c.restore();
    c.fillStyle = lin(c, -s * .22, 0, s * .22, 0, [[0, lt], [.4, col], [1, shade(col, -.2)]]); bag(); c.fill(); edge(c, dk, s * .024);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(-s * .16, -s * .18); c.quadraticCurveTo(-s * .15, s * .0, -s * .05, s * .18); c.lineTo(-s * .015, s * .16); c.quadraticCurveTo(-s * .09, -s * .02, -s * .1, -s * .18); c.closePath(); c.fill();
    // the gathered, twisted-and-tied top
    c.fillStyle = shade(col, -.12); c.beginPath(); c.moveTo(-s * .22, -s * .22); c.lineTo(-s * .26, -s * .34); c.lineTo(-s * .13, -s * .3); c.lineTo(-s * .08, -s * .4); c.lineTo(s * .0, -s * .31); c.lineTo(s * .08, -s * .4); c.lineTo(s * .13, -s * .3); c.lineTo(s * .26, -s * .34); c.lineTo(s * .22, -s * .22); c.closePath(); c.fill(); edge(c, dk, s * .02);
    box(c, -s * .24, -s * .26, s * .48, s * .06, '#fff', s * .03); c.strokeStyle = '#d6d0c4'; c.lineWidth = s * .01; rr(c, -s * .24, -s * .26, s * .48, s * .06, s * .03); c.stroke();
    // nozzle
    poly(c, [[-s * .07, s * .24], [s * .07, s * .24], [s * .045, s * .35], [-s * .045, s * .35]], '#d3dbe6'); c.strokeStyle = '#8996ab'; c.lineWidth = s * .016; c.beginPath(); c.moveTo(-s * .07, s * .24); c.lineTo(-s * .045, s * .35); c.lineTo(s * .045, s * .35); c.lineTo(s * .07, s * .24); c.closePath(); c.stroke();
    c.beginPath(); for (const x of [-.03, 0, .03]) { c.moveTo(x * s, s * .26); c.lineTo(x * s * .7, s * .34); } c.stroke();
    // a swirl of icing coming out
    for (const [y, rx, k] of [[.46, .15, -.14], [.42, .12, -.05], [.385, .085, .05], [.35, .05, .12]]) { c.fillStyle = shade(col, k); c.beginPath(); c.ellipse(0, y * s, rx * s, s * .043, 0, 0, TAU); c.fill(); c.strokeStyle = dk; c.lineWidth = s * .01; c.stroke(); }
    c.restore();
  }
  function drawPaintBucket(c, s, col = '#ff9ec8') {
    c.save(); c.translate(s * .08, s * .1); c.scale(.88, .88);
    const dk = shade(col, -.3), lt = shade(col, .4);
    ell(c, -s * .12, s * .44, s * .38, s * .08, dk); ell(c, -s * .12, s * .42, s * .36, s * .07, col); shine(c, -s * .22, s * .4, s * .12, s * .02, 0, .5);
    // the pour
    c.fillStyle = col; c.beginPath(); c.moveTo(-s * .26, -s * .16); c.bezierCurveTo(-s * .3, s * .1, -s * .26, s * .26, -s * .26, s * .4); c.lineTo(-s * .12, s * .4); c.bezierCurveTo(-s * .12, s * .25, -s * .14, s * .0, -s * .12, -s * .2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; rr(c, -s * .24, -s * .02, s * .03, s * .3, s * .015); c.fill();
    // the bucket, tipped
    c.save(); c.translate(s * .12, -s * .2); c.rotate(-.8); c.lineJoin = c.lineCap = 'round';
    c.strokeStyle = '#7d8aa0'; c.lineWidth = s * .03; c.beginPath(); c.arc(0, -s * .22, s * .24, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    const body = () => { c.beginPath(); c.moveTo(-s * .26, -s * .22); c.lineTo(-s * .2, s * .26); c.quadraticCurveTo(-s * .2, s * .3, -s * .16, s * .3); c.lineTo(s * .16, s * .3); c.quadraticCurveTo(s * .2, s * .3, s * .2, s * .26); c.lineTo(s * .26, -s * .22); c.closePath(); };
    c.fillStyle = lin(c, -s * .26, 0, s * .26, 0, [[0, '#e2e8f1'], [.4, '#c3cddb'], [1, '#97a4ba']]); body(); c.fill(); edge(c, '#7d8aa0', s * .02);
    c.save(); body(); c.clip(); c.fillStyle = col; c.fillRect(-s * .3, -s * .02, s * .6, s * .16); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-s * .3, -s * .02, s * .6, s * .03); c.restore();
    c.strokeStyle = 'rgba(125,138,160,.8)'; c.lineWidth = s * .015; c.beginPath(); c.moveTo(-s * .24, -s * .12); c.lineTo(s * .24, -s * .12); c.moveTo(-s * .21, s * .2); c.lineTo(s * .21, s * .2); c.stroke();
    ell(c, 0, -s * .22, s * .26, s * .06, '#7d8aa0'); ell(c, 0, -s * .22, s * .235, s * .05, col); shine(c, -s * .08, -s * .23, s * .08, s * .012, 0, .55);
    c.restore();
    c.restore();
  }
  for (const [k, col] of Object.entries(ICING12)) ING['pen-' + k] = (c, s) => drawIcingPen(c, s, col);
  ING.paintbucket = (c, s) => drawPaintBucket(c, s, '#ff9ec8');
  Object.assign(NAME, Object.fromEntries([...SPRINKLE_KINDS.map(k => ['spr-' + k, { rainbow: 'Rainbow sprinkles', choc: 'Chocolate sprinkles', pastel: 'Pastel sprinkles', stars: 'Star sprinkles', hearts: 'Heart sprinkles', dots: 'Round sprinkles' }[k]]), ...CANDY_KINDS.map(k => ['cdy-' + k, { dot: 'A candy', star: 'A star candy', heart: 'A heart candy', flower: 'A flower candy', moon: 'A moon candy', gem: 'A gem candy' }[k]]), ...CANDLE_KINDS.map(k => ['cnd-' + k.id, k.name + ' candle'])]));

  // Flat layers for stacking (drawn centered, width w); the second number is the layer's height as a fraction of w.
  const LAYER = {
    bunB: [.2, (c, w) => { c.fillStyle = shade(BUN, -.12); c.beginPath(); c.moveTo(-w * .5, -w * .08); c.lineTo(w * .5, -w * .08); c.quadraticCurveTo(w * .52, w * .13, 0, w * .12); c.quadraticCurveTo(-w * .52, w * .13, -w * .5, -w * .08); c.fill(); c.fillStyle = BUN; rr(c, -w * .5, -w * .1, w, w * .09, w * .04); c.fill(); }],
    bunT: [.36, (c, w) => { c.fillStyle = BUN; c.beginPath(); c.moveTo(-w * .5, w * .02); c.bezierCurveTo(-w * .54, -w * .46, w * .54, -w * .46, w * .5, w * .02); c.closePath(); c.fill(); c.fillStyle = shade(BUN, .2); c.beginPath(); c.moveTo(-w * .38, -w * .1); c.bezierCurveTo(-w * .3, -w * .34, w * .1, -w * .36, w * .24, -w * .26); c.bezierCurveTo(0, -w * .3, -w * .28, -w * .22, -w * .38, -w * .1); c.fill(); for (const [x, y] of [[-.2, -.2], [0, -.3], [.2, -.2], [.08, -.12], [-.08, -.16], [.3, -.1], [-.3, -.1]]) { c.fillStyle = '#fff3d6'; c.beginPath(); c.ellipse(x * w, y * w, w * .03, w * .018, x * 5, 0, TAU); c.fill(); } }],
    patty: [.17, (c, w) => { c.fillStyle = '#6a3d20'; rr(c, -w * .46, -w * .07, w * .92, w * .15, w * .07); c.fill(); c.fillStyle = '#8a5530'; rr(c, -w * .46, -w * .08, w * .92, w * .1, w * .05); c.fill(); c.strokeStyle = '#4a2a18'; c.lineWidth = w * .015; for (const x of [-.25, 0, .25]) { c.beginPath(); c.moveTo((x - .04) * w, -w * .06); c.lineTo((x + .04) * w, w * .04); c.stroke(); } }],
    beanpatty: [.17, (c, w) => { c.fillStyle = '#7a6a3a'; rr(c, -w * .46, -w * .07, w * .92, w * .15, w * .07); c.fill(); c.fillStyle = '#a89860'; rr(c, -w * .46, -w * .08, w * .92, w * .1, w * .05); c.fill(); for (let i = 0; i < 12; i++) { c.fillStyle = ['#5a3a2a', '#c9a060', '#6a9a3a'][i % 3]; c.beginPath(); c.ellipse((rnd(i) - .5) * w * .84, -w * .04 + (rnd(i + 4) - .5) * w * .05, w * .02, w * .012, i, 0, TAU); c.fill(); } }],
    chicken: [.2, (c, w) => { c.fillStyle = '#d98a2a'; rr(c, -w * .46, -w * .08, w * .92, w * .17, w * .08); c.fill(); c.fillStyle = '#f0b24a'; rr(c, -w * .46, -w * .09, w * .92, w * .11, w * .05); c.fill(); for (let i = 0; i < 16; i++) { c.fillStyle = '#fbd682'; c.beginPath(); c.arc((rnd(i) - .5) * w * .85, -w * .045 + (rnd(i + 6) - .5) * w * .05, w * .016, 0, TAU); c.fill(); } }],
    cheese: [.07, (c, w) => { c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(-w * .52, -w * .03); c.lineTo(w * .52, -w * .03); c.lineTo(w * .46, w * .05); c.lineTo(w * .3, w * .1); c.lineTo(w * .16, w * .04); c.lineTo(-w * .1, w * .09); c.lineTo(-w * .3, w * .03); c.lineTo(-w * .46, w * .07); c.closePath(); c.fill(); c.fillStyle = '#ffe582'; c.fillRect(-w * .52, -w * .035, w * 1.04, w * .03); }],
    lettuce: [.1, (c, w) => {   // a ruffled leaf hanging a little over the edges, two greens and a few veins
      const edge = (k, a) => { const pts = []; for (let i = 0; i <= 28; i++) { const x = -w * .55 + i / 28 * w * 1.1; pts.push([x, k * w * .035 + Math.sin(i * 1.15 + a) * w * .02 + (k > 0 ? Math.abs(Math.sin(i * .55 + a)) * w * .03 : 0)]); } return pts; };
      const leaf = (top, bot, col) => { c.fillStyle = col; c.beginPath(); top.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); for (let i = bot.length - 1; i >= 0; i--) { const [x, y] = bot[i], j = i % 2; c.quadraticCurveTo(x + w * .02, y + (j ? w * .02 : 0), x, y); } c.closePath(); c.fill(); };
      leaf(edge(-1, 0), edge(1, .8), '#4fb83a'); leaf(edge(-1.1, .4), edge(.55, 1.6), '#7ed957');
      c.strokeStyle = 'rgba(220,255,190,.75)'; c.lineWidth = w * .008; for (const x of [-.36, -.1, .16, .4]) { c.beginPath(); c.moveTo(x * w, -w * .02); c.quadraticCurveTo(x * w + w * .03, w * .01, x * w + w * .01, w * .04); c.stroke(); }
    }],
    tomato: [.08, (c, w) => { for (const x of [-.28, 0, .28]) { c.fillStyle = '#e8433f'; c.beginPath(); c.ellipse(x * w, 0, w * .17, w * .045, 0, 0, TAU); c.fill(); c.fillStyle = '#ff7a6a'; c.beginPath(); c.ellipse(x * w, -w * .008, w * .13, w * .025, 0, 0, TAU); c.fill(); } }],
    onion: [.06, (c, w) => { for (const x of [-.26, 0, .26]) { c.strokeStyle = '#e8d0f0'; c.lineWidth = w * .035; c.beginPath(); c.ellipse(x * w, 0, w * .15, w * .035, 0, 0, TAU); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = w * .015; c.beginPath(); c.ellipse(x * w, 0, w * .09, w * .02, 0, 0, TAU); c.stroke(); } }],
    pickle: [.06, (c, w) => { for (const x of [-.3, -.1, .1, .3]) { c.fillStyle = '#6fae3c'; c.beginPath(); c.ellipse(x * w, 0, w * .09, w * .035, 0, 0, TAU); c.fill(); c.fillStyle = '#a4d65a'; c.beginPath(); c.ellipse(x * w, -w * .004, w * .06, w * .02, 0, 0, TAU); c.fill(); } }],
    cucumber: [.06, (c, w) => { for (const x of [-.3, -.1, .1, .3]) { c.fillStyle = '#4f9a3a'; c.beginPath(); c.ellipse(x * w, 0, w * .09, w * .035, 0, 0, TAU); c.fill(); c.fillStyle = '#bfe8a0'; c.beginPath(); c.ellipse(x * w, -w * .004, w * .065, w * .022, 0, 0, TAU); c.fill(); } }],
    avocado: [.07, (c, w) => { c.fillStyle = '#4f7a2a'; rr(c, -w * .42, -w * .03, w * .84, w * .07, w * .035); c.fill(); c.fillStyle = '#c9e08a'; rr(c, -w * .4, -w * .04, w * .8, w * .05, w * .025); c.fill(); }],
    carrot: [.06, (c, w) => { for (const x of [-.3, -.1, .1, .3]) { c.fillStyle = '#ff9d3d'; c.beginPath(); c.ellipse(x * w, 0, w * .08, w * .035, 0, 0, TAU); c.fill(); } }],
    ham: [.07, (c, w) => { c.fillStyle = '#ff9db3'; c.beginPath(); c.moveTo(-w * .5, -w * .03); c.quadraticCurveTo(-w * .25, -w * .08, 0, -w * .02); c.quadraticCurveTo(w * .25, w * .04, w * .5, -w * .04); c.lineTo(w * .47, w * .05); c.quadraticCurveTo(w * .25, w * .1, 0, w * .04); c.quadraticCurveTo(-w * .25, 0, -w * .47, w * .06); c.closePath(); c.fill(); }],
    turkey: [.07, (c, w) => { c.fillStyle = '#f0d6b0'; c.beginPath(); c.moveTo(-w * .5, -w * .03); c.quadraticCurveTo(-w * .25, -w * .08, 0, -w * .02); c.quadraticCurveTo(w * .25, w * .04, w * .5, -w * .04); c.lineTo(w * .47, w * .05); c.quadraticCurveTo(w * .25, w * .1, 0, w * .04); c.quadraticCurveTo(-w * .25, 0, -w * .47, w * .06); c.closePath(); c.fill(); }],
    bread: [.13, (c, w) => { c.fillStyle = CRUST; rr(c, -w * .5, -w * .06, w, w * .13, w * .05); c.fill(); c.fillStyle = BREAD; rr(c, -w * .47, -w * .045, w * .94, w * .095, w * .04); c.fill(); }],
    toast: [.13, (c, w) => { c.fillStyle = '#a8662a'; rr(c, -w * .5, -w * .06, w, w * .13, w * .05); c.fill(); c.fillStyle = '#d9a05a'; rr(c, -w * .47, -w * .045, w * .94, w * .095, w * .04); c.fill(); }],
    pancake: [.14, (c, w) => { c.fillStyle = '#b06a28'; rr(c, -w * .48, -w * .045, w * .96, w * .1, w * .05); c.fill(); const g = c.createLinearGradient(0, -w * .06, 0, w * .05); g.addColorStop(0, '#f4c56c'); g.addColorStop(1, '#c9822e'); c.fillStyle = g; rr(c, -w * .48, -w * .06, w * .96, w * .095, w * .047); c.fill(); c.fillStyle = '#f8d58a'; c.beginPath(); c.ellipse(0, -w * .05, w * .45, w * .022, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; rr(c, -w * .36, -w * .035, w * .4, w * .012, w * .006); c.fill(); }],
    pbutter: [.05, (c, w) => { c.fillStyle = '#c98b4a'; rr(c, -w * .46, -w * .025, w * .92, w * .06, w * .03); c.fill(); }],
    jelly: [.05, (c, w) => { c.fillStyle = '#b8326a'; rr(c, -w * .46, -w * .025, w * .92, w * .06, w * .03); c.fill(); c.fillStyle = '#e0508a'; rr(c, -w * .46, -w * .025, w * .92, w * .025, w * .012); c.fill(); }],
    butterpat: [.06, (c, w) => { c.fillStyle = '#ffe27a'; rr(c, -w * .14, -w * .03, w * .28, w * .07, w * .02); c.fill(); c.fillStyle = '#fff3b0'; c.fillRect(-w * .14, -w * .03, w * .28, w * .02); }],
    hotbunBack: [.2, (c, w) => { c.fillStyle = shade(BUN, -.1); rr(c, -w * .5, -w * .08, w, w * .2, w * .1); c.fill(); }],
    sausage: [.16, (c, w) => { c.fillStyle = '#c0583a'; rr(c, -w * .54, -w * .06, w * 1.08, w * .14, w * .07); c.fill(); shine(c, -w * .1, -w * .03, w * .3, w * .02, 0, .4); }]
  };
  // scoops stack vertically in a cup; handled separately
  const SAUCE = { ketchup: '#e8433f', mustard: '#f2c230', mayo: '#fff6dc', syrup: '#b8651a', 'ice-choc': '#5a3320' };
  const SEASON = { salt: '#ffffff', pepper: '#2a2a30' };
  const ID = x => x;

  /* ---------------------------------------------------------------- build-your-own foods: buns, breads, cheeses, meats, sauces, pizza toppings */
  // Buns come in three kinds; 'bunB'/'bunT' (the original ids) are the sesame bun. Breads come in three kinds; 'bread' is white.
  const BUNS = { plain: { top: '#eaa457', crumb: '#f7ddb0', seeds: null }, sesame: { top: '#e8a85c', crumb: '#f7ddb0', seeds: '#fff3d6' }, wheat: { top: '#b47638', crumb: '#e2c08f', seeds: '#ead6ad', oats: true } };
  const BREADS = { white: { crust: '#d9a45c', crumb: '#f8e4b8' }, wheat: { crust: '#9a6332', crumb: '#d9b483', flecks: '#a8763f' }, rye: { crust: '#6e4528', crumb: '#c9a477', flecks: '#4a2e1c' } };
  const CHEESES = { cheddar: { col: '#ff9f1c' }, american: { col: '#ffc23a' }, provolone: { col: '#fbefc8' }, pepperjack: { col: '#fbeccb', flecks: ['#e8433f', '#5fae3a'] }, swiss: { col: '#ffe9a0', holes: true } };
  const TOPL = new Set(['bunT', 'bunT-plain', 'bunT-wheat', 'breadT', 'breadT-wheat', 'breadT-rye']);   // layers drawn upward from their bottom edge
  // a bun's dome, its bottom edge on y = 0
  function bunTopArt(c, w, b) {
    const h = w * .36;
    const g = c.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, shade(b.top, .2)); g.addColorStop(.75, b.top); g.addColorStop(1, shade(b.top, -.2));
    c.fillStyle = shade(b.top, -.3); c.beginPath(); c.moveTo(-w * .5, -w * .015); c.bezierCurveTo(-w * .53, -h * 1.28, w * .53, -h * 1.28, w * .5, -w * .015); c.quadraticCurveTo(0, w * .04, -w * .5, -w * .015); c.fill();
    c.fillStyle = g; c.beginPath(); c.moveTo(-w * .49, -w * .03); c.bezierCurveTo(-w * .51, -h * 1.26, w * .51, -h * 1.26, w * .49, -w * .03); c.quadraticCurveTo(0, w * .02, -w * .49, -w * .03); c.fill();
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-w * .16, -h * .66, w * .17, h * .17, -.35, 0, TAU); c.fill();
    if (b.seeds) for (let i = 0; i < (b.oats ? 16 : 11); i++) { const x = (rnd(i + 3) - .5) * w * .76, yk = 1 - Math.pow(Math.abs(x) / (w * .46), 2), y = -h * (.3 + rnd(i + 7) * .62) * Math.max(.3, yk); c.fillStyle = b.seeds; c.beginPath(); c.ellipse(x, y, w * (b.oats ? .028 : .022), w * (b.oats ? .012 : .013), rnd(i) * 3, 0, TAU); c.fill(); }
  }
  // the bottom half of a bun: its middle on y = 0, the soft cut face on top
  function bunBottomArt(c, w, b) {
    c.fillStyle = shade(b.top, -.22); c.beginPath(); c.moveTo(-w * .5, -w * .05); c.lineTo(w * .5, -w * .05); c.quadraticCurveTo(w * .53, w * .1, w * .36, w * .1); c.lineTo(-w * .36, w * .1); c.quadraticCurveTo(-w * .53, w * .1, -w * .5, -w * .05); c.fill();
    c.fillStyle = b.top; c.beginPath(); c.moveTo(-w * .5, -w * .05); c.lineTo(w * .5, -w * .05); c.quadraticCurveTo(w * .51, w * .05, w * .38, w * .06); c.lineTo(-w * .38, w * .06); c.quadraticCurveTo(-w * .51, w * .05, -w * .5, -w * .05); c.fill();
    c.fillStyle = b.crumb; c.beginPath(); c.ellipse(0, -w * .052, w * .5, w * .035, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-w * .2, w * .0, w * .14, w * .02, 0, 0, TAU); c.fill();
  }
  // a slice of bread lying flat, seen a little from above: middle on y = 0
  function breadArt(c, w, b) {
    c.fillStyle = shade(b.crust, -.12); rr(c, -w * .5, -w * .035, w, w * .085, w * .035); c.fill();
    c.fillStyle = b.crust; rr(c, -w * .5, -w * .065, w, w * .075, w * .035); c.fill();
    c.fillStyle = b.crumb; rr(c, -w * .47, -w * .058, w * .94, w * .045, w * .022); c.fill();
    if (b.flecks) for (let i = 0; i < 14; i++) { c.fillStyle = b.flecks; c.beginPath(); c.arc((rnd(i + 2) - .5) * w * .88, -w * .036 + (rnd(i + 5) - .5) * w * .03, w * .006, 0, TAU); c.fill(); }
  }
  // the top slice of a sandwich: its top face (a loaf shape with the two shoulders), bottom edge on y = 0
  function breadTopArt(c, w, b) {
    const t = -w * .26;
    const loaf = (k) => { c.beginPath(); c.moveTo(-w * .5 * k, -w * .02); c.lineTo(w * .5 * k, -w * .02); c.lineTo(w * .5 * k, t * .55 * k); c.bezierCurveTo(w * .56 * k, t * 1.05 * k, w * .12 * k, t * 1.12 * k, 0, t * .96 * k); c.bezierCurveTo(-w * .12 * k, t * 1.12 * k, -w * .56 * k, t * 1.05 * k, -w * .5 * k, t * .55 * k); c.closePath(); };
    c.fillStyle = shade(b.crust, -.15); rr(c, -w * .5, -w * .045, w, w * .055, w * .025); c.fill();
    c.fillStyle = b.crust; c.save(); c.translate(0, -w * .02); loaf(1); c.fill(); c.restore();
    c.fillStyle = b.crumb; c.save(); c.translate(0, -w * .035); c.scale(.92, .84); loaf(1); c.fill(); c.restore();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-w * .18, -w * .17, w * .14, w * .03, -.15, 0, TAU); c.fill();
    c.fillStyle = shade(b.crumb, -.12); for (let i = 0; i < 18; i++) { c.beginPath(); c.ellipse((rnd(i + 4) - .5) * w * .7, -w * (.06 + rnd(i + 9) * .14), w * .008, w * .005, 0, 0, TAU); c.fill(); }
    if (b.flecks) for (let i = 0; i < 16; i++) { c.fillStyle = b.flecks; c.beginPath(); c.arc((rnd(i + 12) - .5) * w * .72, -w * (.06 + rnd(i + 21) * .14), w * .007, 0, TAU); c.fill(); }
  }
  // a cheese slice melting over what is under it, middle on y = 0
  function cheeseArt(c, w, ch) {
    c.fillStyle = shade(ch.col, -.12); c.beginPath(); c.moveTo(-w * .53, -w * .02); c.lineTo(w * .53, -w * .02); c.lineTo(w * .5, w * .02);
    for (const [x, d] of [[.38, .07], [.12, .05], [-.16, .08], [-.4, .045]]) { c.lineTo(w * (x + .05), w * .02); c.quadraticCurveTo(w * (x + .02), w * d, w * x, w * d); c.quadraticCurveTo(w * (x - .03), w * d, w * (x - .05), w * .02); }
    c.lineTo(-w * .5, w * .02); c.closePath(); c.fill();
    c.fillStyle = ch.col; rr(c, -w * .53, -w * .03, w * 1.06, w * .035, w * .015); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, -w * .4, -w * .028, w * .5, w * .008, w * .004); c.fill();
    if (ch.holes) for (const x of [-.32, -.05, .2, .41]) { c.fillStyle = shade(ch.col, -.2); c.beginPath(); c.ellipse(x * w, w * .003, w * .022, w * .01, 0, 0, TAU); c.fill(); }
    if (ch.flecks) for (let i = 0; i < 12; i++) { c.fillStyle = ch.flecks[i % 2]; c.beginPath(); c.arc((rnd(i + 3) - .5) * w * .95, -w * .012 + (rnd(i + 8) - .5) * w * .02, w * .006, 0, TAU); c.fill(); }
  }
  const SAUCE_L = { ketchup: '#e8433f', mustard: '#f2c230', mayo: '#fff4d6', bbq: '#7a2e1a' };
  // a squiggle of sauce with a few drips over the edge, middle on y = 0
  function sauceLayerArt(c, w, col) {
    c.lineCap = c.lineJoin = 'round'; c.strokeStyle = shade(col, -.25); c.lineWidth = w * .045; c.beginPath();
    for (let i = 0; i <= 24; i++) { const x = -w * .44 + i / 24 * w * .88, y = Math.sin(i * 1.3) * w * .018; i ? c.lineTo(x, y + w * .004) : c.moveTo(x, y + w * .004); } c.stroke();
    c.strokeStyle = col; c.lineWidth = w * .036; c.stroke();
    c.fillStyle = col; for (const x of [-.3, .05, .33]) { c.beginPath(); c.moveTo(w * (x - .025), 0); c.quadraticCurveTo(w * (x - .02), w * .07, w * x, w * .075); c.quadraticCurveTo(w * (x + .02), w * .07, w * (x + .025), 0); c.fill(); }
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = w * .009; c.beginPath(); for (let i = 2; i <= 22; i++) { const x = -w * .44 + i / 24 * w * .88, y = Math.sin(i * 1.3) * w * .018 - w * .01; i > 2 ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  }
  for (const [k, b] of Object.entries({ '': BUNS.sesame, '-plain': BUNS.plain, '-wheat': BUNS.wheat })) { LAYER['bunB' + k] = [.17, (c, w) => bunBottomArt(c, w, b)]; LAYER['bunT' + k] = [.36, (c, w) => bunTopArt(c, w, b)]; }
  for (const [k, b] of Object.entries({ '': BREADS.white, '-wheat': BREADS.wheat, '-rye': BREADS.rye })) { LAYER['bread' + k] = [.1, (c, w) => breadArt(c, w, b)]; LAYER['breadT' + k] = [.27, (c, w) => breadTopArt(c, w, b)]; }
  for (const [k, ch] of Object.entries(CHEESES)) LAYER[k] = [.05, (c, w) => cheeseArt(c, w, ch)];
  LAYER.cheese = LAYER.american;
  for (const [k, col] of Object.entries(SAUCE_L)) LAYER['sauce-' + k] = [.03, (c, w) => sauceLayerArt(c, w, col)];
  LAYER.bacon = [.06, (c, w) => { for (const [dy, s] of [[-.008, 0], [.012, 2]]) { c.lineCap = 'round'; c.strokeStyle = '#a8322a'; c.lineWidth = w * .045; c.beginPath(); for (let i = 0; i <= 20; i++) { const x = -w * .5 + i / 20 * w, y = dy * w + Math.sin(i * .9 + s) * w * .016; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.strokeStyle = '#f5c6b4'; c.lineWidth = w * .012; c.stroke(); } }];
  LAYER.salami = [.05, (c, w) => { for (const x of [-.36, -.12, .12, .36]) { c.fillStyle = '#9e2a2e'; c.beginPath(); c.ellipse(x * w, 0, w * .15, w * .03, 0, 0, TAU); c.fill(); c.fillStyle = '#c23a3e'; c.beginPath(); c.ellipse(x * w, -w * .006, w * .13, w * .02, 0, 0, TAU); c.fill(); for (let i = 0; i < 4; i++) { c.fillStyle = '#ffe6dc'; c.beginPath(); c.arc(x * w + (rnd(i + x * 9) - .5) * w * .18, -w * .006, w * .005, 0, TAU); c.fill(); } } }];
  LAYER.chickenslice = [.06, (c, w) => { for (const x of [-.32, -.06, .2, .4]) { c.fillStyle = '#e0b070'; rr(c, x * w - w * .14, -w * .025, w * .27, w * .05, w * .022); c.fill(); c.fillStyle = '#f6dcae'; rr(c, x * w - w * .13, -w * .028, w * .25, w * .022, w * .01); c.fill(); c.strokeStyle = 'rgba(110,60,20,.55)'; c.lineWidth = w * .008; for (const d of [-.06, .03]) { c.beginPath(); c.moveTo(x * w + d * w, -w * .025); c.lineTo(x * w + d * w + w * .03, w * .02); c.stroke(); } } }];
  LAYER.patty = [.17, (c, w) => {
    c.fillStyle = '#4e2a16'; c.beginPath(); for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI, x = -Math.cos(a) * w * .48, y = w * .075 + Math.sin(a * 9) * w * .006; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.lineTo(w * .48, -w * .05); for (let i = 30; i >= 0; i--) { const x = -Math.cos(i / 30 * Math.PI) * w * .48, y = -w * .07 + Math.sin(i * 1.7) * w * .006; c.lineTo(x, y); } c.closePath(); c.fill();
    c.fillStyle = '#7a4424'; rr(c, -w * .47, -w * .072, w * .94, w * .07, w * .03); c.fill();
    for (let i = 0; i < 26; i++) { c.fillStyle = i % 2 ? '#93583a' : '#5e331b'; c.beginPath(); c.arc((rnd(i + 1) - .5) * w * .9, -w * .045 + (rnd(i + 6) - .5) * w * .05, w * .008, 0, TAU); c.fill(); }
    c.strokeStyle = '#2e170b'; c.lineWidth = w * .016; c.lineCap = 'round'; for (const x of [-.26, 0, .26]) { c.beginPath(); c.moveTo((x - .05) * w, -w * .06); c.lineTo((x + .05) * w, -w * .02); c.stroke(); }
  }];
  LAYER.relish = [.03, (c, w) => { for (let i = 0; i < 22; i++) { c.fillStyle = i % 3 ? '#5fae3a' : '#9ad85a'; c.beginPath(); c.ellipse((rnd(i + 2) - .5) * w * .85, (rnd(i + 7) - .5) * w * .03, w * .022, w * .011, rnd(i) * 3, 0, TAU); c.fill(); } }];
  // ---- the pictures for the tray
  const slice = (col, o = {}) => (c, s) => { c.save(); c.rotate(-.12); c.fillStyle = shade(col, -.15); rr(c, -s * .36, -s * .3, s * .74, s * .66, s * .07); c.fill(); c.fillStyle = col; rr(c, -s * .38, -s * .34, s * .74, s * .66, s * .07); c.fill(); if (o.holes) for (const [x, y, r] of [[-.15, -.1, .07], [.14, .08, .06], [-.05, .18, .04], [.18, -.18, .04]]) circ(c, x * s, y * s, r * s, shade(col, -.18)); if (o.flecks) for (let i = 0; i < 12; i++) circ(c, (rnd(i) - .5) * s * .6, (rnd(i + 4) - .5) * s * .54, s * .022, o.flecks[i % 2]); shine(c, -s * .2, -s * .22, s * .1, s * .03, -.3, .5); c.restore(); };
  for (const [k, ch] of Object.entries(CHEESES)) ING[k] = slice(ch.col, ch);
  for (const [k, b] of Object.entries({ plain: BUNS.plain, sesame: BUNS.sesame, wheat: BUNS.wheat })) { ING['bun-' + k] = (c, s) => { c.save(); c.translate(0, s * .3); bunBottomArt(c, s * .9, b); c.translate(0, -s * .2); bunTopArt(c, s * .9, b); c.restore(); }; ING['bunT-' + k] = (c, s) => { c.save(); c.translate(0, s * .16); bunTopArt(c, s * .95, b); c.restore(); }; }
  ING.bunT = ING['bunT-sesame']; ING['bunT-plain'] = ING['bunT-plain']; ING['bunT-wheat'] = ING['bunT-wheat'];
  for (const [k, b] of Object.entries(BREADS)) { const f = (c, s) => { c.fillStyle = b.crust; rr(c, -s * .4, -s * .3, s * .8, s * .72, s * .12); c.fill(); c.beginPath(); c.arc(-s * .2, -s * .3, s * .21, Math.PI, 0); c.arc(s * .2, -s * .3, s * .21, Math.PI, 0); c.fill(); c.fillStyle = b.crumb; rr(c, -s * .33, -s * .24, s * .66, s * .6, s * .09); c.fill(); c.beginPath(); c.arc(-s * .2, -s * .26, s * .15, Math.PI, 0); c.arc(s * .2, -s * .26, s * .15, Math.PI, 0); c.fill(); if (b.flecks) for (let i = 0; i < 12; i++) circ(c, (rnd(i + 2) - .5) * s * .56, (rnd(i + 6) - .4) * s * .56, s * .018, b.flecks); }; ING['bread-' + k] = f; }
  ING.breadT = ING['bread-white']; ING['breadT-wheat'] = ING['bread-wheat']; ING['breadT-rye'] = ING['bread-rye'];
  ING.bacon = (c, s) => { for (const dy of [-.12, .12]) { c.lineCap = 'round'; c.strokeStyle = '#a8322a'; c.lineWidth = s * .16; c.beginPath(); for (let i = 0; i <= 16; i++) { const x = -s * .42 + i / 16 * s * .84, y = dy * s + Math.sin(i * .9) * s * .05; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.strokeStyle = '#f5c6b4'; c.lineWidth = s * .045; c.stroke(); } };
  ING.salami = (c, s) => { circ(c, 0, 0, s * .4, '#9e2a2e'); circ(c, 0, 0, s * .34, '#c23a3e'); for (let i = 0; i < 12; i++) circ(c, (rnd(i) - .5) * s * .5, (rnd(i + 5) - .5) * s * .5, s * .03, '#ffe6dc'); shine(c, -s * .14, -s * .16, s * .1, s * .04, -.6, .4); };
  ING.chickenslice = (c, s) => { for (const [x, y] of [[-.14, -.1], [.12, .08]]) { c.save(); c.translate(x * s, y * s); c.rotate(-.4); c.fillStyle = '#e0b070'; rr(c, -s * .3, -s * .1, s * .6, s * .2, s * .09); c.fill(); c.fillStyle = '#f6dcae'; rr(c, -s * .28, -s * .1, s * .56, s * .08, s * .04); c.fill(); c.restore(); } };
  ING.veggiedog = (c, s) => { c.fillStyle = '#c98a4a'; rr(c, -s * .5, -s * .1, s, s * .2, s * .1); c.fill(); shine(c, -s * .1, -s * .05, s * .3, s * .03, 0, .4); };
  ING.bbq = (c, s) => { c.fillStyle = '#7a2e1a'; rr(c, -s * .2, -s * .1, s * .4, s * .52, s * .1); c.fill(); c.fillStyle = '#a8462a'; rr(c, -s * .2, -s * .1, s * .16, s * .5, s * .08); c.fill(); tri(c, [[-s * .14, -s * .1], [s * .14, -s * .1], [0, -s * .3]], '#fff'); box(c, -s * .05, -s * .42, s * .1, s * .14, '#fff', s * .03); box(c, -s * .15, s * .08, s * .3, s * .22, '#ffd54a', s * .04); };
  ING.relish = (c, s) => { box(c, -s * .3, -s * .2, s * .6, s * .62, 'rgba(210,240,200,.7)', s * .1); for (let i = 0; i < 18; i++) circ(c, (rnd(i) - .5) * s * .46, s * (-.05 + rnd(i + 3) * .4), s * .045, i % 3 ? '#5fae3a' : '#9ad85a'); box(c, -s * .34, -s * .32, s * .68, s * .14, '#3f8a3a', s * .05); };
  ING.caramel = (c, s) => { c.fillStyle = '#c47a26'; rr(c, -s * .22, -s * .18, s * .44, s * .62, s * .1); c.fill(); c.fillStyle = '#e8a24a'; rr(c, -s * .22, -s * .18, s * .16, s * .6, s * .08); c.fill(); box(c, -s * .12, -s * .38, s * .24, s * .24, '#fff1d0', s * .04); box(c, -s * .18, s * .06, s * .36, s * .22, '#fff', s * .04); };
  ING.strawsauce = (c, s) => { c.fillStyle = '#d42a50'; rr(c, -s * .22, -s * .18, s * .44, s * .62, s * .1); c.fill(); c.fillStyle = '#ff6b8a'; rr(c, -s * .22, -s * .18, s * .16, s * .6, s * .08); c.fill(); box(c, -s * .12, -s * .38, s * .24, s * .24, '#ffe3ec', s * .04); c.save(); c.translate(0, s * .17); c.scale(.3, .3); ING.strawberry(c, s); c.restore(); };
  ING.cream = (c, s) => { box(c, -s * .18, -s * .1, s * .36, s * .56, '#e8eef8', s * .08); box(c, -s * .18, -s * .1, s * .12, s * .56, '#fff', s * .06); box(c, -s * .07, -s * .34, s * .14, s * .26, '#ff9ec8', s * .04); for (const [x, y, r] of [[0, -.42, .1], [-.08, -.36, .07], [.08, -.36, .07]]) circ(c, x * s, y * s, r * s, '#fff'); };
  ING.pizzasauce = (c, s) => { c.strokeStyle = '#8a95a8'; c.lineWidth = s * .07; c.lineCap = 'round'; c.beginPath(); c.moveTo(s * .05, -s * .05); c.lineTo(s * .42, -s * .44); c.stroke(); ell(c, -s * .08, s * .1, s * .3, s * .22, '#aab4c4'); ell(c, -s * .08, s * .07, s * .25, s * .16, '#d8342c'); shine(c, -s * .16, s * .02, s * .06, s * .02, 0, .5); };
  ING.mozzarella = (c, s) => { ell(c, 0, s * .2, s * .4, s * .16, '#c8a070'); for (let i = 0; i < 30; i++) { c.save(); c.translate((rnd(i) - .5) * s * .62, s * (.14 - rnd(i + 3) * .32 * (1 - Math.abs(rnd(i) - .5)))); c.rotate(rnd(i + 9) * 3); box(c, -s * .06, -s * .015, s * .12, s * .03, i % 4 ? '#fff8e0' : '#ffe9a8', s * .015); c.restore(); } };
  ING.pepperoni = (c, s) => { circ(c, 0, 0, s * .36, '#a82a24'); circ(c, 0, 0, s * .3, '#c8382e'); for (let i = 0; i < 8; i++) circ(c, (rnd(i) - .5) * s * .4, (rnd(i + 4) - .5) * s * .4, s * .03, '#e8805a'); shine(c, -s * .12, -s * .14, s * .08, s * .03, -.6, .4); };
  ING.mushroom = (c, s) => { c.fillStyle = '#e8dcc8'; rr(c, -s * .1, -s * .02, s * .2, s * .36, s * .06); c.fill(); c.fillStyle = '#c9a882'; c.beginPath(); c.moveTo(-s * .36, s * .04); c.bezierCurveTo(-s * .38, -s * .38, s * .38, -s * .38, s * .36, s * .04); c.closePath(); c.fill(); c.fillStyle = '#f2e8d8'; c.beginPath(); c.ellipse(0, s * .03, s * .36, s * .05, 0, 0, Math.PI); c.fill(); };
  ING.olive = (c, s) => { for (const [x, y] of [[-.14, -.08], [.16, .1]]) { circ(c, x * s, y * s, s * .17, '#2e2a30'); circ(c, x * s, y * s, s * .07, '#5a3a4a'); shine(c, (x - .06) * s, (y - .07) * s, s * .04, s * .02, -.6, .5); } };
  ING.greenpepper = (c, s) => { c.lineCap = 'round'; for (const [x, y, a] of [[-.12, -.06, .5], [.12, .1, -.4]]) { c.strokeStyle = '#3e9a3a'; c.lineWidth = s * .12; c.beginPath(); c.arc(x * s, y * s, s * .2, a, a + 2.6); c.stroke(); c.strokeStyle = '#7ed957'; c.lineWidth = s * .04; c.stroke(); } };
  ING.pineapple = (c, s) => { for (const [x, y, a] of [[-.12, 0, .2], [.14, .06, -.3]]) { c.save(); c.translate(x * s, y * s); c.rotate(a); tri(c, [[-s * .14, s * .2], [s * .14, s * .2], [0, -s * .22]], '#ffd54a'); box(c, -s * .15, s * .16, s * .3, s * .06, '#e8b030', s * .02); c.restore(); } };
  ING.basil = (c, s) => { for (const [x, y, a] of [[-.1, .02, -.6], [.12, -.04, .5]]) { c.save(); c.translate(x * s, y * s); c.rotate(a); c.fillStyle = '#3e9a3a'; c.beginPath(); c.ellipse(0, 0, s * .12, s * .26, 0, 0, TAU); c.fill(); c.strokeStyle = '#7ed957'; c.lineWidth = s * .02; c.beginPath(); c.moveTo(0, -s * .22); c.lineTo(0, s * .22); c.stroke(); c.restore(); } };
  for (const [k, v] of Object.entries({ cheddar: 'Cheddar cheese', american: 'American cheese', provolone: 'Provolone cheese', pepperjack: 'Pepper jack cheese', swiss: 'Swiss cheese', bacon: 'Bacon', salami: 'Salami', chickenslice: 'Chicken', 'bun-plain': 'A plain bun', 'bun-sesame': 'A sesame bun', 'bun-wheat': 'A wheat bun', 'bread-white': 'White bread', 'bread-wheat': 'Wheat bread', 'bread-rye': 'Rye bread', bbq: 'Barbecue sauce', relish: 'Relish', caramel: 'Caramel sauce', strawsauce: 'Strawberry sauce', cream: 'Whipped cream', pizzasauce: 'Pizza sauce', mozzarella: 'Mozzarella cheese', pepperoni: 'Pepperoni', mushroom: 'Mushrooms', olive: 'Olives', greenpepper: 'Green peppers', pineapple: 'Pineapple', basil: 'Basil', veggiedog: 'A veggie dog' })) NAME[k] = v;
  Object.assign(SAUCE, { bbq: '#7a2e1a', caramel: '#d08a2e', strawsauce: '#e0335a', pizzasauce: '#d8342c' });

  /* ---------------------------------------------------------------- the kitchen: table, board, bowl, tools, appliances, plate */
  function drawTable(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f7d4a6'); g.addColorStop(1, '#eeb883'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const ph = h / 6.5;
    for (let i = 0, y = 0; y < h + ph; i++, y += ph) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(150,80,30,.05)'; c.fillRect(0, y, w, ph);
      c.fillStyle = 'rgba(176,96,40,.42)'; c.fillRect(0, y, w, 2.5);
      c.strokeStyle = 'rgba(176,100,50,.17)'; c.lineWidth = 1.6; c.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const gy = y + ph * (.15 + rnd(i * 9 + k) * .7), gx = rnd(i * 5 + k + 2) * w; c.beginPath(); c.moveTo(gx, gy); c.bezierCurveTo(gx + w * .12, gy - 5, gx + w * .2, gy + 6, gx + w * (.28 + rnd(k + i) * .2), gy); c.stroke(); }
      for (const kx of [rnd(i + 3) * w, rnd(i + 11) * w]) { if (rnd(i * 3 + kx) > .55) { c.strokeStyle = 'rgba(160,90,40,.2)'; c.lineWidth = 2; c.beginPath(); c.ellipse(kx, y + ph * .5, 14, 7, 0, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(kx, y + ph * .5, 6, 3, 0, 0, TAU); c.stroke(); } }
    }
    const v = c.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .3, w / 2, h * .45, Math.max(w, h) * .75); v.addColorStop(0, 'rgba(255,255,255,.12)'); v.addColorStop(1, 'rgba(120,60,20,.12)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }
  function drawBoard(c, x, y, bw, bh) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, -bw / 2 + 5, -bh / 2 + 10, bw, bh, bh * .08); c.fill();
    c.fillStyle = '#ffffff'; rr(c, -bw / 2, -bh / 2, bw, bh, bh * .08); c.fill();
    c.strokeStyle = '#ff9ec8'; c.lineWidth = bh * .035; rr(c, -bw / 2 + bh * .03, -bh / 2 + bh * .03, bw - bh * .06, bh - bh * .06, bh * .06); c.stroke();
    c.strokeStyle = '#d96aa8'; c.lineWidth = bh * .012; rr(c, -bw / 2 + bh * .065, -bh / 2 + bh * .065, bw - bh * .13, bh - bh * .13, bh * .05); c.stroke();
    const g = c.createLinearGradient(0, -bh / 2, 0, bh / 2); g.addColorStop(0, 'rgba(210,225,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; rr(c, -bw / 2, -bh / 2, bw, bh, bh * .08); c.fill();
    c.restore();
  }
  function drawPlate(c, x, y, r) {
    c.save(); c.translate(x, y); c.fillStyle = 'rgba(80,40,20,.2)'; c.beginPath(); c.ellipse(r * .06, r * .12, r * 1.04, r * .7, 0, 0, TAU); c.fill();
    const g = c.createLinearGradient(0, -r * .7, 0, r * .7); g.addColorStop(0, '#9fd0e0'); g.addColorStop(1, '#6fa8c0'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r, r * .68, 0, 0, TAU); c.fill();
    c.fillStyle = '#f4fbff'; c.beginPath(); c.ellipse(0, -r * .02, r * .76, r * .5, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(180,210,235,.5)'; c.beginPath(); c.ellipse(0, r * .04, r * .62, r * .38, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -r * .04, r * .62, r * .38, 0, 0, TAU); c.fill();
    shine(c, -r * .55, -r * .3, r * .22, r * .06, -.5, .5); c.restore();
  }
  // The real-looking contents of the mixing bowl. Each pour is one `item` { id, unit, seed }; items are laid out loosely (liquids first, then the egg,
  // powders, butter and chips on top) and fade into the batter as it is stirred.
  const STUFF_RANK = { milk: 0, egg: 1, flour: 2, sugar: 3, butter: 4, chips: 5 };
  function drawBowlStuff(c, items, r, st) {
    const list = items.map((it, i) => ({ it, i })).sort((a, b) => (STUFF_RANK[a.it.id] ?? 6) - (STUFF_RANK[b.it.id] ?? 6) || a.i - b.i);
    for (const { it, i } of list) {
      let sd = (it.seed || (i + 1) * 7919) >>> 0; const R = () => { sd = (sd + 0x6D2B79F5) >>> 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const unit = it.unit === 'half' ? .74 : it.unit === 'tbsp' ? .5 : 1, ang = i * 2.399 + R() * .6, rad = r * (items.length > 2 ? .24 + .2 * R() : .06 + .14 * R()) * (1 - st * .75), px = Math.cos(ang) * rad, py = Math.sin(ang) * rad * .52 + r * .05;
      const s = r * (items.length > 3 ? .36 : .46) * unit * (1 - st * .3);
      c.save(); c.globalAlpha = 1 - st * .8; c.translate(px, py);
      const shadow = (w, h) => { c.fillStyle = 'rgba(90,70,50,.2)'; c.beginPath(); c.ellipse(s * .05, h * .35, w, h * .8, 0, 0, TAU); c.fill(); };
      if (it.id === 'flour' || it.id === 'sugar') {
        const sugar = it.id === 'sugar', w = s * 1.15, h = s * .62; shadow(w * 1.05, h);
        const g = c.createRadialGradient(-w * .3, -h * .5, w * .1, 0, 0, w * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(.55, sugar ? '#f7f4ee' : '#f6efe0'); g.addColorStop(1, sugar ? '#dcd6ca' : '#d9cdb4');
        c.fillStyle = g; c.beginPath(); c.moveTo(-w, h * .25); c.bezierCurveTo(-w * .9, -h * .9, -w * .3, -h * 1.15, 0, -h * 1.05); c.bezierCurveTo(w * .4, -h * 1.1, w * .95, -h * .8, w, h * .25); c.bezierCurveTo(w * .6, h * .85, -w * .6, h * .85, -w, h * .25); c.fill();
        c.fillStyle = sugar ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-w * .25, -h * .55, w * .38, h * .2, -.4, 0, TAU); c.fill();
        c.strokeStyle = sugar ? 'rgba(170,165,150,.18)' : 'rgba(190,170,130,.16)'; c.lineWidth = Math.max(1, r * .01); c.lineCap = 'round'; for (let k = 0; k < 2; k++) { c.beginPath(); c.arc(R() * w * .3, h * .9, w * (.5 + k * .18), Math.PI * 1.15, Math.PI * 1.7); c.stroke(); }
        const n = sugar ? 70 : 46; for (let k = 0; k < n; k++) { const a = R() * TAU, d = Math.sqrt(R()) * 1.12, gx = Math.cos(a) * w * d, gy = Math.sin(a) * h * d * .95 - h * .1, dust = d > .92; c.fillStyle = dust ? 'rgba(255,255,250,.9)' : sugar ? (R() < .5 ? 'rgba(255,255,255,.95)' : 'rgba(190,185,175,.55)') : 'rgba(255,252,240,.7)'; c.beginPath(); c.arc(gx, gy, r * (sugar ? .011 : .008) * (.6 + R() * .8), 0, TAU); c.fill(); }
        if (sugar) for (let k = 0; k < 4; k++) { const gx = (R() - .5) * w * 1.3, gy = (R() - .65) * h; c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.moveTo(gx, gy - r * .03); c.lineTo(gx + r * .008, gy); c.lineTo(gx, gy + r * .03); c.lineTo(gx - r * .008, gy); c.closePath(); c.moveTo(gx - r * .03, gy); c.lineTo(gx, gy + r * .008); c.lineTo(gx + r * .03, gy); c.lineTo(gx, gy - r * .008); c.closePath(); c.fill(); }
      } else if (it.id === 'butter') {
        const w = s * (unit > .8 ? 1.5 : 1.1), h = s * (unit > .8 ? .5 : .42), d = h * .8; c.rotate((R() - .5) * .6); shadow(w * 1.1, h * 1.3);
        c.fillStyle = '#f0c040'; rr(c, -w / 2, -h / 2 + d * .1, w, h + d * .8, h * .22); c.fill();                          // the front face
        let g = c.createLinearGradient(0, -h / 2 - d, 0, -h / 2 + d * .3); g.addColorStop(0, '#fff3b4'); g.addColorStop(1, '#ffe074'); c.fillStyle = g; c.beginPath(); c.moveTo(-w / 2 + h * .15, -h / 2 - d * .7); c.lineTo(w / 2 - h * .15, -h / 2 - d * .7); c.quadraticCurveTo(w / 2 + h * .1, -h / 2 - d * .6, w / 2, -h / 2 + d * .15); c.lineTo(-w / 2, -h / 2 + d * .15); c.quadraticCurveTo(-w / 2 - h * .1, -h / 2 - d * .6, -w / 2 + h * .15, -h / 2 - d * .7); c.fill();   // the top face
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-w * .15, -h / 2 - d * .35, w * .3, d * .13, -.05, 0, TAU); c.fill();
        c.fillStyle = 'rgba(210,150,30,.35)'; rr(c, -w / 2, h / 2 + d * .05, w, d * .35, h * .2); c.fill();
        if (unit > .8) { c.strokeStyle = 'rgba(210,160,50,.35)'; c.lineWidth = Math.max(1, r * .01); c.beginPath(); c.moveTo(w * .18, -h / 2 - d * .6); c.lineTo(w * .18, h / 2 + d * .3); c.stroke(); }
      } else if (it.id === 'egg') {
        const w = s * 1.15, h = s * .72; c.rotate((R() - .5) * .8);
        c.fillStyle = 'rgba(80,60,40,.14)'; c.beginPath(); c.ellipse(s * .05, h * .3, w * 1.05, h * .95, 0, 0, TAU); c.fill();
        const blob = (k, a) => { c.beginPath(); for (let q = 0; q <= 14; q++) { const t = q / 14 * TAU, wob = 1 + .16 * Math.sin(t * 3 + a) + .1 * Math.sin(t * 5 + a * 2); const x = Math.cos(t) * w * k * wob, y = Math.sin(t) * h * k * wob; q ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); };
        const a0 = R() * 6; blob(1.0, a0); c.fillStyle = 'rgba(244,250,255,.82)'; c.fill(); c.strokeStyle = 'rgba(200,215,230,.8)'; c.lineWidth = Math.max(1, r * .012); c.stroke();
        blob(.74, a0 + 1); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill();
        const yr = s * .4, yg = c.createRadialGradient(-yr * .3, -yr * .35, yr * .1, 0, 0, yr * 1.1); yg.addColorStop(0, '#ffd34a'); yg.addColorStop(.6, '#ffa81c'); yg.addColorStop(1, '#e8860a'); c.fillStyle = yg; c.beginPath(); c.ellipse(w * .08, 0, yr, yr * .88, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(w * .08 - yr * .35, -yr * .38, yr * .3, yr * .16, -.5, 0, TAU); c.fill();
        c.fillStyle = '#fbf3e4'; c.strokeStyle = '#d9c9aa'; c.lineWidth = Math.max(1, r * .01); c.beginPath(); c.moveTo(w * .72, -h * .2); c.quadraticCurveTo(w * 1.1, -h * .1, w * 1.05, h * .45); c.lineTo(w * .78, h * .35); c.lineTo(w * .86, h * .12); c.lineTo(w * .68, 0); c.closePath(); c.fill(); c.stroke();   // a piece of shell
      } else if (it.id === 'milk') {
        const w = s * 1.5, h = s * .8; shadow(w * 1.0, h);
        const g = c.createRadialGradient(-w * .3, -h * .4, w * .1, 0, 0, w * 1.1); g.addColorStop(0, '#ffffff'); g.addColorStop(.7, '#eef4fb'); g.addColorStop(1, '#cfdcec'); c.fillStyle = g; c.beginPath(); for (let q = 0; q <= 16; q++) { const t = q / 16 * TAU, wob = 1 + .1 * Math.sin(t * 3 + ang) + .06 * Math.sin(t * 6); const x = Math.cos(t) * w * wob, y = Math.sin(t) * h * wob; q ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.fill();
        c.strokeStyle = 'rgba(190,205,225,.9)'; c.lineWidth = Math.max(1, r * .012); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.9)'; for (let k = 1; k <= 2; k++) { c.beginPath(); c.ellipse(w * .08, 0, w * (.28 * k), h * (.26 * k), 0, 0, TAU); c.stroke(); }
        c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.ellipse(-w * .45, -h * .45, w * .22, h * .1, -.45, 0, TAU); c.fill();
      } else if (it.id === 'chips') {
        const n = Math.round(6 + 5 * unit); for (let k = 0; k < n; k++) {
          const a = R() * TAU, d = Math.sqrt(R()) * s * 1.25, cx = Math.cos(a) * d, cy = Math.sin(a) * d * .6, cr = r * (.045 + R() * .022), rot = R() * TAU;
          c.save(); c.translate(cx, cy); c.rotate(rot); c.fillStyle = 'rgba(60,30,15,.3)'; c.beginPath(); c.ellipse(cr * .15, cr * .5, cr * 1.1, cr * .6, 0, 0, TAU); c.fill();
          const g = c.createLinearGradient(-cr, -cr, cr, cr); g.addColorStop(0, '#6e4630'); g.addColorStop(1, '#3d2316'); c.fillStyle = g; c.beginPath(); c.moveTo(0, -cr); c.quadraticCurveTo(cr * 1.1, -cr * .1, cr * .85, cr * .6); c.quadraticCurveTo(0, cr * 1.0, -cr * .9, cr * .55); c.quadraticCurveTo(-cr * 1.05, -cr * .2, 0, -cr); c.fill();
          c.fillStyle = 'rgba(255,225,190,.5)'; c.beginPath(); c.ellipse(-cr * .25, -cr * .3, cr * .3, cr * .14, -.5, 0, TAU); c.fill(); c.restore();
        }
      } else { const w = s * 1.1, h = s * .6; shadow(w, h); c.fillStyle = it.col || '#fff'; c.beginPath(); c.ellipse(0, 0, w, h, 0, 0, TAU); c.fill(); }
      c.restore();
    }
  }
  function drawBowl(c, x, y, r, mix, t, stir = 0, spoonAng = 0) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(80,40,20,.2)'; c.beginPath(); c.ellipse(r * .06, r * .16, r * 1.0, r * .62, 0, 0, TAU); c.fill();
    let g = c.createLinearGradient(0, -r * .6, 0, r * .6); g.addColorStop(0, '#bcd8e4'); g.addColorStop(1, '#7fa8bc'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r, r * .66, 0, 0, TAU); c.fill();
    c.fillStyle = '#e8f4fa'; c.beginPath(); c.ellipse(0, -r * .03, r * .9, r * .58, 0, 0, TAU); c.fill();
    const ig = c.createLinearGradient(0, -r * .4, 0, r * .5); ig.addColorStop(0, '#8fb2c6'); ig.addColorStop(1, '#c4dbe8'); c.fillStyle = ig; c.beginPath(); c.ellipse(0, r * .02, r * .8, r * .5, 0, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.ellipse(0, r * .02, r * .79, r * .49, 0, 0, TAU); c.clip();
    // what is in the bowl: each ingredient adds a heap of its colour; stirring blends them to one batter
    const fill = mix.fill || 0, base = mix.col || '#f6e8c8';
    if (fill > 0) {
      const lv = r * (.5 - fill * .5);
      if (mix.stirred >= 1) { c.fillStyle = mix.final; c.beginPath(); c.ellipse(0, r * .06, r * .76, r * .46, 0, 0, TAU); c.fill(); shine(c, -r * .25, -r * .12, r * .22, r * .07, -.3, .3); }
      else {
        // before stirring the bowl shows what was really put in (flour, sugar, butter, a cracked egg, milk, chips); stirring brings up the wet batter
        const st = mix.stirred || 0;
        if (st > 0) { c.globalAlpha = Math.min(1, st * 1.4); c.fillStyle = base; c.beginPath(); c.ellipse(0, lv * .2 + r * .1, r * .74, r * .44, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
        drawBowlStuff(c, mix.items, r, st);
        if (mix.stirred > 0) { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = r * .03; for (let k = 0; k < 3; k++) { c.beginPath(); for (let i = 0; i <= 24; i++) { const a = spoonAng + i * .25 + k * 2, rad = r * (.1 + i * .02 + k * .08); const px = Math.cos(a) * rad, py = Math.sin(a) * rad * .62; i ? c.lineTo(px, py + r * .05) : c.moveTo(px, py + r * .05); } c.stroke(); } }
      }
    }
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = r * .03; c.beginPath(); c.ellipse(0, -r * .03, r * .9, r * .58, 0, Math.PI * 1.05, Math.PI * 1.45); c.stroke();
    c.restore();
  }
  function drawSpoon(c, x, y, s, ang = -.5) { c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = 'rgba(80,40,20,.2)'; c.beginPath(); c.ellipse(s * .05, s * .06, s * .13, s * .18, 0, 0, TAU); c.fill(); box(c, -s * .035, -s * .05, s * .07, s * 1.0, '#c98b4a', s * .035); ell(c, 0, -s * .1, s * .15, s * .2, '#d9a060'); ell(c, 0, -s * .1, s * .11, s * .15, '#e8bf88'); shine(c, -s * .04, -s * .17, s * .03, s * .06, 0, .5); c.restore(); }
  function drawPin(c, x, y, s, rot = 0, press = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, -s * .62, s * .08, s * 1.3, s * .3, s * .1); c.fill();
    box(c, -s * .78, -s * .08, s * .24, s * .16, '#d63a3a', s * .08); box(c, s * .54, -s * .08, s * .24, s * .16, '#d63a3a', s * .08);
    circ(c, -s * .82, 0, s * .1, '#e8504a'); circ(c, s * .82, 0, s * .1, '#e8504a');
    const g = c.createLinearGradient(0, -s * .22, 0, s * .22); g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#e6edf6'); g.addColorStop(1, '#c4d0e0'); c.fillStyle = g; rr(c, -s * .56, -s * .2, s * 1.12, s * .4, s * .12); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; rr(c, -s * .5, -s * .16, s, s * .07, s * .035); c.fill(); c.restore();
  }
  function drawOven(c, x, y, s, glow = 0, doorOpen = 0, t = 0, items = null, on = true) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, -s * .5 + s * .04, -s * .5 + s * .08, s, s * .95, s * .1); c.fill();
    box(c, -s * .5, -s * .5, s, s * .95, '#d8dde6', s * .1); box(c, -s * .5, -s * .5, s, s * .16, '#b8c0cc', s * .1);
    for (const [dx, col] of [[-.3, '#ff6b81'], [-.1, '#ffd54a'], [.1, '#7fd4f5'], [.3, '#7ed957']]) { circ(c, dx * s, -s * .42, s * .045, on ? col : '#a8b0bd'); if (on) { c.globalAlpha = .35; circ(c, dx * s, -s * .42, s * .075, col); c.globalAlpha = 1; } }
    box(c, -s * .4, -s * .3, s * .8, s * .64, '#9aa4b4', s * .06);
    const g = c.createLinearGradient(0, -s * .26, 0, s * .3); g.addColorStop(0, `rgb(${60 + glow * 160},${40 + glow * 70},${30})`); g.addColorStop(1, `rgb(${90 + glow * 165},${60 + glow * 80},${40})`); c.fillStyle = g; rr(c, -s * .34, -s * .24, s * .68, s * .52, s * .05); c.fill();
    if (glow > 0) { c.globalAlpha = glow * .5; c.fillStyle = '#ffb347'; rr(c, -s * .34, -s * .24, s * .68, s * .52, s * .05); c.fill(); c.globalAlpha = 1; }
    if (items) { c.save(); c.beginPath(); rr(c, -s * .34, -s * .24, s * .68, s * .52, s * .05); c.clip(); c.translate(0, s * .08); c.scale(.62, .62); items(c); c.restore(); }
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(-s * .34, -s * .24); c.lineTo(-s * .06, -s * .24); c.lineTo(-s * .34, s * .12); c.fill();
    box(c, -s * .3, s * .3, s * .6, s * .05, '#6f7888', s * .02);
    c.restore();
  }
  function drawGrill(c, x, y, r, glow) {
    c.save(); c.translate(x, y); c.fillStyle = 'rgba(80,40,20,.2)'; c.beginPath(); c.ellipse(r * .06, r * .14, r * 1.05, r * .72, 0, 0, TAU); c.fill();
    c.fillStyle = '#3a3a44'; c.beginPath(); c.ellipse(0, 0, r, r * .68, 0, 0, TAU); c.fill(); c.fillStyle = '#4a4a56'; c.beginPath(); c.ellipse(0, -r * .02, r * .92, r * .6, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = r * .03; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * r * .2, -r * .55); c.lineTo(i * r * .2, r * .55); c.stroke(); }
    if (glow > 0) { c.globalAlpha = glow * .35; c.fillStyle = '#ff9d3d'; c.beginPath(); c.ellipse(0, -r * .02, r * .92, r * .6, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
    box(c, r * .95, -r * .08, r * .5, r * .16, '#6a4a30', r * .06); c.restore();
  }
  function drawToaster(c, x, y, s, down = 0, glow = 0, slices = []) {
    c.save(); c.translate(x, y); c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, -s * .5 + s * .05, -s * .2 + s * .1, s, s * .6, s * .14); c.fill();
    slices.forEach((sl, i) => { c.save(); c.translate((i ? 1 : -1) * s * .17, -s * (.22 - (1 - down) * .16 * (sl.up == null ? 1 : sl.up)) ); c.scale(.46, .46); LAYER_ICON(c, sl.id, s * .6); c.restore(); });
    box(c, -s * .5, -s * .2, s, s * .6, '#c8d4e4', s * .14); box(c, -s * .5, -s * .2, s, s * .16, '#e8eef8', s * .14);
    box(c, -s * .36, -s * .2, s * .26, s * .06, '#3a3a44', s * .03); box(c, s * .1, -s * .2, s * .26, s * .06, '#3a3a44', s * .03);
    if (glow) { c.globalAlpha = glow * .6; c.fillStyle = '#ff6b3d'; c.fillRect(-s * .36, -s * .2, s * .26, s * .04); c.fillRect(s * .1, -s * .2, s * .26, s * .04); c.globalAlpha = 1; }
    box(c, s * .5, -s * .05 + down * s * .18, s * .06, s * .16, '#6f7888', s * .03); circ(c, -s * .3, s * .28, s * .05, '#ff6b81'); c.restore();
  }
  const LAYER_ICON = (c, id, s) => { if (ING[id]) ING[id](c, s); };

  /* ---------------------------------------------------------------- finished foods (pieces). Each is drawn centred, about R across. */
  const DOUGH = '#e8c88a', BAKED = '#d9a05a', CHOCDOUGH = '#c89a62', CHOCBAKED = '#9a6038';
  /* ---------------------------------------------------------------- icing: glossy, shiny and sparkly */
  const clock = () => performance.now() / 1000;
  // a four-point twinkle
  function twinkle(c, x, y, r, col = '#fff') {
    c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, k = i % 2 ? r * .26 : r; i ? c.lineTo(Math.cos(a) * k, Math.sin(a) * k) : c.moveTo(Math.cos(a) * k, Math.sin(a) * k); }
    c.closePath(); c.fill(); c.globalAlpha *= .35; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.fill(); c.restore();
  }
  // tiny glitter specks (call inside a clip) and a few twinkling stars, laid out by a seed
  function glitterField(c, seed, w, h, n, R, col) {
    const t = clock();
    for (let i = 0; i < n; i++) { const x = (rnd(seed + i * 3.1) - .5) * w, y = (rnd(seed + i * 5.7 + 2) - .5) * h; c.globalAlpha = .55 + .45 * Math.sin(t * 3 + i * 1.9); c.fillStyle = i % 3 ? '#fff' : shade(col, .65); c.beginPath(); c.arc(x, y, R * (.011 + rnd(i + seed) * .012), 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    for (let i = 0; i < 3; i++) { const x = (rnd(seed + i * 11.3 + 40) - .5) * w * .9, y = (rnd(seed + i * 7.9 + 60) - .5) * h * .9, k = .5 + .5 * Math.sin(t * 3.2 + i * 2.3); c.globalAlpha = .35 + .65 * k; twinkle(c, x, y, R * (.045 + .05 * k), '#fff'); }
    c.globalAlpha = 1;
  }
  // a glossy rounded dollop of icing (used for borders)
  function dollop(c, x, y, r, col) {
    const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.1); g.addColorStop(0, shade(col, .55)); g.addColorStop(.45, shade(col, .08)); g.addColorStop(1, shade(col, -.2));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); shine(c, x - r * .3, y - r * .38, r * .3, r * .16, -.5, .85);
  }
  // piped swirl frosting that sits on the top of a cupcake: a scalloped skirt on the muffin, four twisting tiers, a round curl
  function drawFrostSwirl(c, R, col, grow = 1) {
    const g = ease(clamp(grow, 0, 1));
    c.save(); c.translate(0, -R * .1); c.scale(1, .3 + .7 * g); c.globalAlpha = Math.min(1, grow * 3 + .2);
    const lite = shade(col, .45), dark = shade(col, -.2), deep = shade(col, -.34);
    for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? dark : deep; c.beginPath(); c.arc(-R * .42 + i * R * .14, R * .01, R * .105, 0, TAU); c.fill(); }
    for (let i = 0; i < 7; i++) dollop(c, -R * .42 + i * R * .14, -R * .015, R * .1, col);
    const tiers = [[-.17, .46, .12], [-.33, .4, .115], [-.48, .31, .105], [-.62, .21, .095]];
    tiers.forEach(([y, hw, h], i) => {
      c.save(); c.translate(0, y * R); c.rotate((i % 2 ? .07 : -.07)); const w = hw * R, hh = h * R * 1.25;
      const gr = c.createLinearGradient(0, -hh, 0, hh); gr.addColorStop(0, lite); gr.addColorStop(.35, col); gr.addColorStop(1, dark);
      c.fillStyle = gr; rr(c, -w, -hh, w * 2, hh * 2, hh); c.fill();
      c.strokeStyle = deep; c.globalAlpha = .45; c.lineWidth = R * .014; c.beginPath(); c.moveTo(-w * .9, hh * .55); c.quadraticCurveTo(0, hh * 1.05, w * .9, hh * .5); c.stroke(); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = R * .02; c.lineCap = 'round'; c.beginPath(); c.moveTo(-w * .8, -hh * .1); c.quadraticCurveTo(-w * .2, -hh * .75, w * .55, -hh * .55); c.stroke();
      shine(c, -w * .5, -hh * .45, w * .22, hh * .22, -.2, .8);
      c.restore();
    });
    const tg = c.createRadialGradient(-R * .03, -R * .84, R * .02, 0, -R * .78, R * .2); tg.addColorStop(0, lite); tg.addColorStop(.5, col); tg.addColorStop(1, dark);
    c.fillStyle = tg; c.beginPath(); c.moveTo(-R * .14, -R * .66); c.bezierCurveTo(-R * .16, -R * .8, -R * .05, -R * .92, R * .08, -R * .9); c.bezierCurveTo(R * .17, -R * .84, R * .1, -R * .74, R * .14, -R * .66); c.closePath(); c.fill();
    shine(c, -R * .05, -R * .8, R * .035, R * .07, .3, .9);
    c.save(); c.translate(0, -R * .45); glitterField(c, 17, R * .8, R * .95, 22, R * 1.5, col); c.restore();
    c.restore();
  }
  // glossy, sparkly icing poured over a cookie, clipped to the cookie's own shape
  function drawCookieIcing(c, kind, R, col) {
    c.save(); c.fillStyle = shade(col, -.28); shapeFill(c, kind, R * .8, R * .018);
    c.clip(shapePath(kind, R * .8));
    const g = c.createLinearGradient(-R * .6, -R * .8, R * .6, R * .8); g.addColorStop(0, shade(col, .4)); g.addColorStop(.5, col); g.addColorStop(1, shade(col, -.18)); c.fillStyle = g; c.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
    c.fillStyle = 'rgba(255,255,255,.3)'; c.save(); c.translate(-R * .06, -R * .1); shapeFill(c, kind, R * .6, 0); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = R * .03; c.lineCap = 'round'; c.beginPath(); c.moveTo(-R * .5, -R * .25); c.quadraticCurveTo(-R * .4, -R * .55, -R * .1, -R * .6); c.stroke();
    glitterField(c, 7 + kind.length, R * 1.3, R * 1.3, 24, R, col);
    c.restore();
  }
  // piped icing lines: a dark edge, the bright body, a shine, and sparkle along the line
  function drawPiped(c, s, R) {
    c.lineCap = c.lineJoin = 'round';
    for (const [w, col] of [[.12, shade(s.col, -.3)], [.092, s.col]]) { c.strokeStyle = col; c.lineWidth = R * w; c.beginPath(); s.pts.forEach(([x, y], i) => i ? c.lineTo(x * R, y * R) : c.moveTo(x * R, y * R)); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = R * .024; c.beginPath(); s.pts.forEach(([x, y], i) => i ? c.lineTo(x * R - R * .015, y * R - R * .02) : c.moveTo(x * R - R * .015, y * R - R * .02)); c.stroke();
    const t = clock(); s.pts.forEach(([x, y], i) => { if (i % 4 === 1) { c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 3 + i)); twinkle(c, x * R, y * R, R * .05, '#fff'); } }); c.globalAlpha = 1;
  }
  // one icing line on a cookie (clipped to the cookie, piped) or on a cupcake/cake (a row of glossy beads); `bare` = already in the food's own transform
  function drawBeads(c, s, R) { let acc = 0; s.pts.forEach(([x, y], i) => { if (i) { const [px, py] = s.pts[i - 1], d = Math.hypot(x - px, y - py) * R; for (acc += d; acc >= R * .07; acc -= R * .07) { const k = 1 - (acc - R * .07) / Math.max(1e-6, d), bx = (px + (x - px) * Math.min(1, k)) * R, by = (py + (y - py) * Math.min(1, k)) * R; circ(c, bx, by + R * .012, R * .05, shade(s.col, -.15)); circ(c, bx, by, R * .045, s.col); circ(c, bx - R * .012, by - R * .014, R * .016, 'rgba(255,255,255,.6)'); } } else { circ(c, x * R, y * R, R * .045, s.col); } }); }
  function drawStrokeOp(c, p, st, R, bare) {
    c.save();
    if (!bare) { if (p.type === 'cupcake') c.translate(0, -R * .3); else if (p.type === 'cake') c.scale(1, .9); }
    if (p.type === 'cookie') { if (p.shape) c.clip(shapePath(p.shape, R * .97)); drawPiped(c, st, R); } else drawBeads(c, st, R);
    c.restore();
  }
  function drawDeco(c, deco, R, o = {}) {
    if (!deco) return;
    if (deco.fill && o.shape) drawCookieIcing(c, o.shape, R, deco.fill);
    if (!o.skipStrokes) for (const st of deco.strokes || []) drawStrokeOp(c, { type: o.shape ? 'cookie' : 'cupcake', shape: o.shape }, st, R, true);
    for (const d of deco.dots || []) {
      c.save(); c.translate(d.x * R, d.y * R); c.rotate(d.rot || 0);
      if (d.id === 'sprinkles') drawSprinkle(c, d.kind || 'rainbow', R * .14, d.col, 0);
      else if (d.id === 'candy') drawCandy(c, d.kind || 'dot', R * .075, d.col);
      else if (d.id === 'chips') { tri(c, [[0, -R * .08], [R * .07, R * .06], [-R * .07, R * .06]], '#5a3a2a'); }
      else if (d.id === 'star') art.star(c, 0, 0, R * .12, '#ffd54a', d.rot || 0);
      else if (d.id === 'cherry') { c.scale(R * .004, R * .004); ING.cherry(c, 60); }
      else if (d.id === 'strawberry') { c.scale(R * .0035, R * .0035); ING.strawberry(c, 60); }
      else if (d.id === 'blueberry') { c.scale(R * .0045, R * .0045); ING.blueberry(c, 60); }
      else if (d.id === 'candle') { c.rotate(-(d.rot || 0)); c.scale(R * .0035, R * .0035); ING.candle(c, 70); }
      c.restore();
    }
  }
  function drawCookie(c, p, R, t = 0) {
    cookieShape(c, p.shape, R, p.choc ? mixHex(CHOCDOUGH, CHOCBAKED, p.baked || 0) : mixHex(DOUGH, BAKED, p.baked || 0), { speckle: true });
    if (p.chips) for (let i = 0; i < 6; i++) { c.save(); c.translate((rnd(i + 21) - .5) * R * 1.0, (rnd(i + 31) - .5) * R * .9); tri(c, [[0, -R * .09], [R * .08, R * .07], [-R * .08, R * .07]], '#4a2a1a'); c.restore(); }
    drawDeco(c, p.deco, R, { shape: p.shape, skipStrokes: true });
  }
  const mixHex = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  function drawCupcake(c, p, R, t = 0) {
    const liner = p.liner || '#ff9ec8';
    c.fillStyle = 'rgba(80,40,20,.18)'; c.beginPath(); c.ellipse(R * .05, R * .55, R * .6, R * .15, 0, 0, TAU); c.fill();
    c.fillStyle = shade(liner, -.1); c.beginPath(); c.moveTo(-R * .5, -R * .08); c.lineTo(R * .5, -R * .08); c.lineTo(R * .38, R * .55); c.lineTo(-R * .38, R * .55); c.closePath(); c.fill();
    c.strokeStyle = shade(liner, -.35); c.lineWidth = R * .02; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * R * .15, -R * .06); c.lineTo(i * R * .11, R * .55); c.stroke(); }
    c.fillStyle = liner; c.beginPath(); c.moveTo(-R * .5, -R * .08); c.lineTo(-R * .3, -R * .08); c.lineTo(-R * .22, R * .55); c.lineTo(-R * .38, R * .55); c.closePath(); c.fill();
    if (p.empty) return;
    const cake = p.baked >= 1 ? (p.choc ? '#8a5a38' : '#e8b868') : p.baked > 0 ? mixHex(p.choc ? '#c89a62' : '#f3dca4', p.choc ? '#8a5a38' : '#e8b868', p.baked) : (p.batter ? (p.choc ? '#a87a52' : '#f6e8c0') : '#f6e8c0');
    c.fillStyle = cake; c.beginPath(); c.moveTo(-R * .52, -R * .06); c.bezierCurveTo(-R * .6, -R * .55, R * .6, -R * .55, R * .52, -R * .06); c.closePath(); c.fill();
    if (p.frost) { drawFrostSwirl(c, R, p.frost.col, p.frost.t == null ? 1 : p.frost.t); c.save(); c.translate(0, -R * .3); drawDeco(c, p.deco, R * 1.0, { beads: true, skipStrokes: true }); c.restore(); }
    else if (p.batter && !p.baked) { /* just batter in the liner */ }
  }
  // a two-layer cake seen a little from above; its top face is centred on y = 0
  function drawCake(c, p, R, t = 0) {
    const rx = R * .95, ry = R * .38, hgt = R * .62;
    c.fillStyle = 'rgba(80,40,20,.18)'; c.beginPath(); c.ellipse(R * .05, hgt + ry * .55, rx * 1.05, ry * 1.0, 0, 0, TAU); c.fill();
    const col = p.baked >= 1 ? (p.choc ? '#8a5a38' : '#e8b868') : (p.baked > 0 ? mixHex('#f3dca4', '#e8b868', p.baked) : '#f6e8c0');
    const fr = p.frost && p.frost.col, side = fr || col;
    const body = () => { c.beginPath(); c.moveTo(-rx, 0); c.lineTo(-rx, hgt); c.ellipse(0, hgt, rx, ry, 0, Math.PI, 0, true); c.lineTo(rx, 0); c.closePath(); };
    const g = c.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, shade(side, -.2)); g.addColorStop(.35, side); g.addColorStop(.7, shade(side, .08)); g.addColorStop(1, shade(side, -.14));
    c.fillStyle = g; body(); c.fill();
    if (!fr) {   // the cream between the two layers
      c.strokeStyle = '#fff3d6'; c.lineWidth = hgt * .13; c.beginPath(); c.ellipse(0, hgt * .5, rx * .995, ry, 0, Math.PI * .02, Math.PI * .98); c.stroke();
      c.fillStyle = shade(col, -.12); for (let i = 0; i < 14; i++) { const a = rnd(i + 3) * Math.PI, y = hgt * (.15 + rnd(i + 8) * .7); c.beginPath(); c.arc(-Math.cos(a) * rx * .95, y + Math.sin(a) * ry, R * .012, 0, TAU); c.fill(); }
    } else {     // drips down the side, and piped beads round the bottom
      c.fillStyle = shade(fr, -.06); for (let i = 0; i < 11; i++) { const a = (i + .5) / 11 * Math.PI, x = -Math.cos(a) * rx * .97, y = Math.sin(a) * ry, d = hgt * (.18 + rnd(i + 2) * .22); c.beginPath(); c.ellipse(x, y + d * .5, rx * .045, d * .55, 0, 0, TAU); c.fill(); }
      for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI, x = -Math.cos(a) * rx, y = hgt + Math.sin(a) * ry; circ(c, x, y - R * .02, R * .07, shade(fr, -.08)); circ(c, x - R * .015, y - R * .035, R * .04, shade(fr, .25)); }
    }
    c.fillStyle = fr ? shade(fr, .06) : shade(col, .06); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
    if (fr) { for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU, x = Math.cos(a) * rx * .93, y = Math.sin(a) * ry * .9; circ(c, x, y, R * .055, shade(fr, -.04)); circ(c, x - R * .012, y - R * .012, R * .03, shade(fr, .3)); } }
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-rx * .3, -ry * .35, rx * .25, ry * .14, -.2, 0, TAU); c.fill();
    if (fr) { c.save(); c.beginPath(); c.ellipse(0, 0, rx * .78, ry * .72, 0, 0, TAU); c.clip(); glitterField(c, 29, rx * 1.5, ry * 1.4, 26, rx, fr); c.restore(); shine(c, -rx * .38, -ry * .4, rx * .2, ry * .1, -.3, .7); }
    c.save(); c.scale(1, .9); drawDeco(c, p.deco, R * 1.0, { beads: true, skipStrokes: true }); c.restore();
  }
  // toppings dropped on the top of a flat thing (a stack, a hot dog, a sundae): at height y, in widths of W
  function drawFlatDots(c, dots, W, y) {
    for (const d of dots || []) {
      c.save(); c.translate(d.x * W, y + d.y * W); c.rotate(d.rot || 0);
      if (d.id === 'sprinkles') drawSprinkle(c, d.kind || 'rainbow', W * .07, d.col, 0);
      else if (d.id === 'candy') drawCandy(c, d.kind || 'dot', W * .035, d.col);
      else if (d.id === 'star') art.star(c, 0, 0, W * .06, '#ffd54a', 0);
      else if (d.id === 'cherry') { c.translate(0, -W * .05); ING.cherry(c, W * .2); }
      else if (d.id === 'strawberry') { c.translate(0, -W * .03); ING.strawberry(c, W * .17); }
      else if (d.id === 'blueberry') { c.translate(0, -W * .02); ING.blueberry(c, W * .16); }
      else if (d.id === 'onion') { c.translate(0, -W * .01); ING.onion(c, W * .15); }
      else if (d.id === 'candle') { c.translate(0, -W * .04); drawCandle(c, d.kind || 'blue', W * .2, true); }
      else if (['raspberry', 'banana', 'kiwi', 'orange', 'grape'].includes(d.id)) { c.translate(0, -W * .02); ING[d.id](c, W * .16); }
      else if (d.id === 'chips') tri(c, [[0, -W * .03], [W * .025, W * .02], [-W * .025, W * .02]], '#5a3a2a');
      c.restore();
    }
  }
  // a stack of flat layers (a burger, a sandwich, pancakes...), bottom first. Width W; the bottom sits on y = 0.
  function drawStack(c, p, W, t = 0) {
    let y = 0; const layers = p.layers || [];
    c.fillStyle = 'rgba(80,40,20,.16)'; c.beginPath(); c.ellipse(W * .02, W * .045, W * .5, W * .06, 0, 0, TAU); c.fill();
    layers.forEach((l, i) => {
      const L = LAYER[l.id]; if (!L) return; const h = L[0] * W * (l.squash || 1), lw = W * (l.wscale || 1) * (1 + (rnd(i + (l.seed || 0)) - .5) * .05), top = TOPL.has(l.id);
      const lift = (l.drop || 0) * W * .8;
      c.save(); c.translate((rnd(i + 3 + (l.seed || 0)) - .5) * W * .015, -y - lift - (top ? 0 : h * .5)); c.globalAlpha = 1 - (l.drop || 0) * .6;
      L[1](c, lw);
      if (l.spread) { c.fillStyle = l.spread; rr(c, -lw * .44, -h * .6, lw * .88, h * .35, h * .15); c.fill(); }
      for (const s of l.sauce || []) { c.strokeStyle = s.col; c.lineWidth = W * .05; c.lineCap = c.lineJoin = 'round'; c.beginPath(); s.pts.forEach(([x, yy], k) => k ? c.lineTo(x * W, yy * W * 1.4 + h * .1) : c.moveTo(x * W, yy * W * 1.4 + h * .1)); c.stroke(); }
      c.restore();
      y += h * (top ? .9 : .86);
    });
    drawFlatDots(c, p.dots, W, -y);
    return y;
  }
  // a hot dog in its bun, seen a little from the side; the bottom sits on y = 0. W is about the bun's length.
  function drawHotdog(c, p, W, t = 0) {
    const L = W * .5, bh = W * .14, lay = id => (p.layers || []).find(l => l.id === id), B = lay('hotbunBack'), S = lay('sausage');
    c.fillStyle = 'rgba(80,40,20,.16)'; c.beginPath(); c.ellipse(W * .02, W * .03, L * 1.05, W * .06, 0, 0, TAU); c.fill();
    const bun = (y, hh, k) => { const g = c.createLinearGradient(0, y - hh / 2, 0, y + hh / 2); g.addColorStop(0, shade(BUN, .18 * k)); g.addColorStop(1, shade(BUN, -.2)); c.fillStyle = g; rr(c, -L, y - hh / 2, L * 2, hh, hh * .5); c.fill(); };
    const bl = B ? (B.drop || 0) * W * .8 : 0;
    if (B) {   // the back half of the bun with its soft inside showing
      c.save(); c.translate(0, -bl); c.globalAlpha = 1 - (B.drop || 0) * .6;
      bun(-bh * 1.8, bh * 1.2, 1); c.fillStyle = '#f7ddb0'; rr(c, -L * .95, -bh * 2.05, L * 1.9, bh * .55, bh * .27); c.fill(); c.fillStyle = 'rgba(200,140,70,.25)'; rr(c, -L * .95, -bh * 1.62, L * 1.9, bh * .14, bh * .07); c.fill(); c.restore();
    }
    if (S) {
      const sl = (S.drop || 0) * W * .8; c.save(); c.translate(0, -sl); c.globalAlpha = 1 - (S.drop || 0) * .6;
      const g = c.createLinearGradient(0, -bh * 1.75, 0, -bh * .75); g.addColorStop(0, '#d8694a'); g.addColorStop(1, '#9a3624'); c.fillStyle = g; rr(c, -L * 1.1, -bh * 1.72, L * 2.2, bh * .92, bh * .46); c.fill();
      c.strokeStyle = 'rgba(70,20,10,.35)'; c.lineWidth = W * .012; c.lineCap = 'round'; for (const x of [-.6, -.3, 0, .3, .6]) { c.beginPath(); c.moveTo((x - .04) * L, -bh * 1.62); c.lineTo((x + .04) * L, -bh * 1.0); c.stroke(); }
      shine(c, -L * .2, -bh * 1.52, L * .5, bh * .08, 0, .45); c.restore();
    }
    if (B) { c.save(); c.translate(0, -bl); c.globalAlpha = 1 - (B.drop || 0) * .6; bun(-bh * .62, bh * 1.24, 1); c.fillStyle = 'rgba(255,255,255,.25)'; rr(c, -L * .8, -bh * .92, L * 1.3, bh * .14, bh * .07); c.fill(); c.restore(); }
    drawFlatDots(c, p.dots, W, -bh * 1.75);
  }
  // an ice cream sundae: a tulip glass on a little stem with up to three scoops nestled in it; the foot sits on y = 0
  const SCOOP_AT = [[[0, -.6]], [[-.15, -.6], [.15, -.6]], [[-.15, -.6], [.15, -.6], [0, -.84]]];
  function drawScoop(c, x, y, r, col, id) {
    c.save(); c.translate(x, y);
    c.fillStyle = shade(col, -.14); c.beginPath(); c.arc(0, 0, r, Math.PI * .95, Math.PI * 2.05); for (let i = 0; i <= 10; i++) { const a = i / 10; c.lineTo(r * (1 - 2 * a) * 1.02, r * .42 + Math.sin(a * Math.PI * 5) * r * .09); } c.closePath(); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(0, -r * .04, r * .96, Math.PI * .95, Math.PI * 2.05); for (let i = 0; i <= 10; i++) { const a = i / 10; c.lineTo(r * (.97 - 1.94 * a), r * .3 + Math.sin(a * Math.PI * 5 + .6) * r * .08); } c.closePath(); c.fill();
    if (id === 'mint' || id === 'choc') for (let i = 0; i < 6; i++) tri(c, [[(rnd(i + 2) - .5) * r * 1.2, (rnd(i + 5) - .7) * r], [(rnd(i + 2) - .5) * r * 1.2 + r * .09, (rnd(i + 5) - .7) * r + r * .12], [(rnd(i + 2) - .5) * r * 1.2 - r * .09, (rnd(i + 5) - .7) * r + r * .12]], id === 'mint' ? '#4a2a1a' : '#5a3320');
    if (id === 'strawb' || id === 'blueb') for (let i = 0; i < 6; i++) circ(c, (rnd(i + 2) - .5) * r * 1.2, (rnd(i + 5) - .7) * r, r * .07, id === 'strawb' ? '#e8435a' : '#4a5fb8');
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * .35, -r * .45, r * .22, r * .12, -.6, 0, TAU); c.fill();
    c.restore();
  }
  function drawSundae(c, p, W, t = 0) {
    const sc = p.scoops || [], n = Math.min(3, sc.length), rimY = -W * .55, rimX = W * .36;
    c.fillStyle = 'rgba(80,40,20,.16)'; c.beginPath(); c.ellipse(W * .02, W * .02, W * .26, W * .05, 0, 0, TAU); c.fill();
    const glass = 'rgba(214,236,252,.78)', edge = 'rgba(255,255,255,.95)';
    ell(c, 0, -W * .01, W * .21, W * .055, 'rgba(190,222,245,.9)'); ell(c, 0, -W * .02, W * .17, W * .035, glass);
    box(c, -W * .03, -W * .26, W * .06, W * .25, 'rgba(200,228,248,.9)', W * .02);
    const bowl = () => { c.beginPath(); c.moveTo(-rimX, rimY); c.bezierCurveTo(-rimX * 1.02, -W * .34, -W * .12, -W * .25, 0, -W * .25); c.bezierCurveTo(W * .12, -W * .25, rimX * 1.02, -W * .34, rimX, rimY); c.closePath(); };
    c.fillStyle = glass; bowl(); c.fill();
    if (n) { c.save(); bowl(); c.clip(); c.fillStyle = shade(SCOOPS[sc[0].id] || '#fff1c4', -.05); c.beginPath(); c.ellipse(0, rimY + W * .06, rimX, W * .16, 0, 0, TAU); c.fill(); c.restore(); }
    ell(c, 0, rimY, rimX, W * .065, 'rgba(235,246,255,.9)');
    const pos = n ? SCOOP_AT[n - 1] : [];
    sc.slice(0, 3).forEach((s, i) => { const [x, y] = pos[i], lift = (s.drop || 0) * W * .8; c.save(); c.globalAlpha = 1 - (s.drop || 0) * .6; drawScoop(c, x * W, y * W - lift, W * .19, SCOOPS[s.id] || '#fff1c4', s.id); c.restore(); });
    // the glass's front lip over the bottom of the scoops, and its shine
    c.save(); c.globalAlpha = .55; c.fillStyle = glass; c.beginPath(); c.ellipse(0, rimY, rimX, W * .065, 0, 0, Math.PI); c.lineTo(-rimX, rimY + W * .03); c.ellipse(0, rimY + W * .03, rimX * .985, W * .06, 0, Math.PI, 0, true); c.closePath(); c.fill(); c.restore();
    c.strokeStyle = edge; c.lineWidth = W * .012; c.beginPath(); c.ellipse(0, rimY, rimX, W * .065, 0, Math.PI * .05, Math.PI * .95); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = W * .02; c.lineCap = 'round'; c.beginPath(); c.moveTo(-rimX * .78, rimY + W * .1); c.quadraticCurveTo(-rimX * .7, -W * .32, -W * .08, -W * .28); c.stroke();
    if (p.cream && n) { const top = pos[n - 1]; c.save(); c.translate(top[0] * W, top[1] * W - W * .17); for (const [y, r] of [[0, .11], [-.06, .085], [-.11, .06], [-.15, .035]]) { circ(c, 0, y * W, r * W, '#f4f2ee'); circ(c, -r * W * .25, y * W - r * W * .25, r * W * .55, '#fff'); } c.restore(); }
    drawFlatDots(c, p.dots, W, -W * (n >= 3 ? 1.02 : n ? .78 : .56));
  }
  // a pizza seen from above at an angle (top face centred on y = 0); sauce and cheese are painted and sprinkled on it
  function drawPizza(c, p, R, t = 0) {
    const rx = R * 1.25, ry = R * .82, k = p.baked || 0;
    c.fillStyle = 'rgba(80,40,20,.18)'; c.beginPath(); c.ellipse(R * .05, R * .12, rx * 1.02, ry * 1.02, 0, 0, TAU); c.fill();
    c.fillStyle = mixHex('#e6c48a', '#b8742e', k); c.beginPath(); c.ellipse(0, R * .05, rx, ry, 0, 0, TAU); c.fill();
    c.fillStyle = mixHex('#f2d9a2', '#d9974a', k); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
    c.fillStyle = mixHex('#f8e8c0', '#f0cf90', k); c.beginPath(); c.ellipse(0, -R * .01, rx * .86, ry * .84, 0, 0, TAU); c.fill();
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; circ(c, Math.cos(a) * rx * .93, Math.sin(a) * ry * .92, R * .02, mixHex('#e8c88a', '#a8642a', k)); }
  }
  const pizzaClip = (c, R) => { c.beginPath(); c.ellipse(0, -R * .01, R * 1.25 * .86, R * .82 * .84, 0, 0, TAU); c.clip(); };
  // toppings put exactly where she touched: x, y in units of the food's size R (from where drawPiece draws it)
  const TOP_SZ = { cherry: .62, strawberry: .5, blueberry: .42, candle: .7, onion: .4, star: .5, pepperoni: .36, mushroom: .34, olive: .3, greenpepper: .34, pineapple: .32, basil: .32, cream: .4, raspberry: .46, banana: .44, kiwi: .44, orange: .46, grape: .46 };
  const TOP_K = { cupcake: 1, cookie: 1, cake: .62, stack: .5, sundae: .46, hotdog: .52, pizza: .55 };
  function drawTops(c, p, Rr) {
    const R = Rr * (TOP_K[p.type] || 1), Rp = Rr;
    for (const d of p.tops || []) {
      c.save(); c.translate(d.x * Rp, d.y * Rp); c.rotate(d.rot || 0);
      if (d.id === 'sprinkles') drawSprinkle(c, d.kind || 'rainbow', R * .14, d.col, 0);
      else if (d.id === 'candy') drawCandy(c, d.kind || 'dot', R * .08, d.col);
      else if (d.id === 'chips') tri(c, [[0, -R * .08], [R * .07, R * .06], [-R * .07, R * .06]], '#4a2a1a');
      else if (d.id === 'shred') { if (p.baked > .5) { c.globalAlpha = .9; ell(c, 0, 0, Rp * .17, Rp * .11, '#ffe9a6', d.rot); c.globalAlpha = .55; ell(c, Rp * .03, Rp * .01, Rp * .05, Rp * .03, '#f0b84a', 0); } else box(c, -Rp * .06, -Rp * .014, Rp * .12, Rp * .028, d.col || '#fff8e0', Rp * .014); }
      else if (d.id === 'cream') { c.rotate(-(d.rot || 0)); for (const [y, r] of [[0, .14], [-.07, .1], [-.13, .065], [-.17, .035]]) { circ(c, 0, y * R, r * R, '#f2efe8'); circ(c, -r * R * .25, y * R - r * R * .25, r * R * .55, '#fff'); } }
      else if (d.id === 'candle') { c.rotate(-(d.rot || 0)); c.translate(0, -R * .16); drawCandle(c, d.kind || 'blue', R * TOP_SZ.candle * (d.kind === 'one' ? .8 : 1), true); }
      else if (d.id === 'relish') { for (let i = 0; i < 7; i++) ell(c, (rnd(i + 1) - .5) * R * .22, (rnd(i + 4) - .5) * R * .08, R * .03, R * .015, i % 3 ? '#5fae3a' : '#9ad85a', rnd(i) * 3); }
      else if (d.id === 'pepperoni' && p.baked > .5) { c.scale(1, .7); ING.pepperoni(c, R * TOP_SZ.pepperoni); c.fillStyle = 'rgba(120,30,20,.25)'; c.beginPath(); c.arc(0, 0, R * .1, 0, TAU); c.fill(); }
      else if (ING[d.id]) { if (['pepperoni', 'olive', 'greenpepper', 'pineapple', 'basil', 'mushroom'].includes(d.id)) c.scale(1, .72); ING[d.id](c, R * (TOP_SZ[d.id] || .4)); }
      c.restore();
    }
  }
  function drawPiece(c, p, R, t = 0) {
    c.save(); c.lineJoin = c.lineCap = 'round';
    if (p.type === 'multi') { for (const [x, y, sub, k] of p.parts) { c.save(); c.translate(x * R, y * R); drawPiece(c, sub, R * k); c.restore(); } }
    else if (p.shape && p.type === 'stack') drawCharSandwich(c, p, R);
    else if (p.sliced && p.type === 'stack') drawSliced(c, p, R * 2);
    else if (p.type === 'cookie') drawCookie(c, p, R, t);
    else if (p.type === 'cupcake') drawCupcake(c, p, R, t);
    else if (p.type === 'cake') drawCake(c, p, R, t);
    else if (p.type === 'hotdog') drawHotdog(c, p, R * 2, t);
    else if (p.type === 'sundae') drawSundae(c, p, R * 2, t);
    else if (p.type === 'pizza') drawPizza(c, p, R, t);
    else drawStack(c, p, R * 2, t);
    // everything she puts on the food is drawn in the order she put it, so what comes later goes on top (icing over sprinkles, sprinkles over icing, ...)
    const ops = []; let n = 0;
    for (const st of (p.deco && p.deco.strokes) || []) ops.push({ z: st.z || 0, n: n++, k: 's', v: st });
    for (const st of p.paint || []) ops.push({ z: st.z || 0, n: n++, k: 'p', v: st });
    for (const d of p.tops || []) ops.push({ z: d.z || 0, n: n++, k: 't', v: d });
    ops.sort((a, b) => a.z - b.z || a.n - b.n);
    for (let i = 0; i < ops.length;) {
      let j = i; while (j < ops.length && ops[j].k === ops[i].k) j++;
      const run = ops.slice(i, j).map(o => o.v), k = ops[i].k;
      if (k === 's') for (const st of run) drawStrokeOp(c, p, st, R, false);
      else if (k === 't') drawTops(c, { ...p, tops: run }, R);
      else if (p.type === 'pizza') { c.save(); pizzaClip(c, R); drawPaintList(c, run.filter(s => s.pizza), R); c.restore(); drawPaintList(c, run.filter(s => !s.pizza), R); }
      else drawPaintList(c, run, R);
      i = j;
    }
    c.restore();
  }
  // a sandwich cut with a character cutter: seen from above, with a face
  function drawCharSandwich(c, p, R) {
    cookieShape(c, p.shape, R * .9, BREAD, {});
    c.fillStyle = CRUST; c.globalAlpha = .45; c.save(); c.beginPath(); c.rect(-R * 1.2, R * .5, R * 2.4, R); c.clip(); shapeFill(c, p.shape, R * .9, -R * .03); c.restore(); c.globalAlpha = 1;
    c.save(); c.translate(0, p.shape === 'bunny' || p.shape === 'cat' || p.shape === 'fox' ? R * .3 : R * .15); art.face(c, R * .5, { mood: 'happy' }); c.restore();
    c.fillStyle = '#b8326a'; for (const [x, y] of [[-.5, .62], [.5, .62]]) circ(c, x * R * .9, y * R * .5, R * .06, '#b8326a');
  }
  // a stack cut in two, the halves sliding apart
  function drawSliced(c, p, W) {
    const k = ease(Math.min(1, p.slideT == null ? 1 : p.slideT)) * W * .07, hh = pieceHeight(p, W / 2) + W * .1;
    for (const sg of [-1, 1]) { c.save(); c.beginPath(); c.rect(sg < 0 ? -W : 0, -hh - W * .5, W, hh + W); c.clip(); c.translate(sg * k, 0); drawStack(c, p, W); c.restore(); }
  }
  // height of a piece (so it can sit on the plate)
  const sundaeTop = p => { const n = Math.min(3, (p.scoops || []).length); return (n >= 3 ? 1.06 : n ? .82 : .62) + (p.cream && n ? .16 : 0); };
  const pieceHeight = (p, R) => p.shape && p.type === 'stack' ? R * 1.8 : p.type === 'cookie' ? R * .8 : p.type === 'cupcake' ? R * 1.0 : p.type === 'cake' ? R * 1.1 : p.type === 'pizza' ? R * .9 : p.type === 'sundae' ? R * 2 * sundaeTop(p) : p.type === 'hotdog' ? R * .7 : (p.layers || []).reduce((a, l) => a + (LAYER[l.id] ? LAYER[l.id][0] * (TOPL.has(l.id) ? .9 : .86) : 0), 0) * R * 2 + R * .12;

  function sampleBox(p) {
    if (p.type === 'multi') { let hw = 0, a = 0, b = 0; for (const [x, y, sub, k] of p.parts) { const q = sampleBox(sub); hw = Math.max(hw, Math.abs(x) + q.hw * k); a = Math.max(a, -y + q.a * k); b = Math.max(b, y + q.b * k); } return { hw, a, b }; }
    if (p.type === 'cookie') return { hw: 1.1, a: 1.05, b: 1.15 };
    if (p.type === 'cupcake') return { hw: .62, a: .95, b: .6 };
    if (p.type === 'cake') return { hw: 1.0, a: .5, b: .95 };
    if (p.type === 'sundae') return { hw: .8, a: pieceHeight(p, 1) + .05, b: .12 };
    if (p.type === 'hotdog') return { hw: 1.12, a: .6, b: .12 };
    if (p.type === 'pizza') return { hw: 1.3, a: .9, b: 1.0 };
    if (p.shape) return { hw: 1, a: 1, b: 1 };
    return { hw: 1.05, a: pieceHeight(p, 1) + .05, b: .12 };
  }
  // a finished food centred at (x, y) and sized to fit inside bw x bh
  function drawSample(c, p, x, y, bw, bh) { const q = sampleBox(p), k = Math.min(bw / (2 * q.hw), bh / (q.a + q.b)); c.save(); c.translate(x, y + (q.a - q.b) / 2 * k); drawPiece(c, p, k); c.restore(); }
  const ICOL = { flour: '#ffffff', sugar: '#fffaf0', butter: '#ffe27a', egg: '#ffd54a', milk: '#f4fbff', chips: '#5a3a2a' };
  const BATTER = '#f3e0ae';

  const SPRINKLE = ['#ff6b81', '#ffd54a', '#5cc8f2', '#7ed957', '#b58cf0'];

  // small round pictures for the step strip and the chef's thought bubble
  function stepIcon(c, k, s, id) {
    c.save();
    if (k === 'add') (ING[id || 'flour'] || ING.flour)(c, s);
    else if (k === 'stir') { drawSpoon(c, 0, -s * .2, s * .8, -.2); c.strokeStyle = '#5cc8f2'; c.lineWidth = s * .06; c.lineCap = 'round'; c.beginPath(); c.arc(0, s * .28, s * .24, .4, 4.9); c.stroke(); tri(c, [[s * .2, s * .1], [s * .32, s * .34], [s * .08, s * .34]], '#5cc8f2'); }
    else if (k === 'roll') drawPin(c, 0, 0, s * .6, 0);
    else if (k === 'cut') { c.scale(.9, .9); cutterArt(c, id || 'star', s * .38); }
    else if (k === 'fill') { ING.dough(c, s); }
    else if (k === 'bake') { drawOven(c, 0, s * .05, s * .8, .7, 0); }
    else if (k === 'grill') { c.translate(0, s * .1); if (id === 'bread') { ING.bread(c, s * .9); } else { ell(c, 0, s * .1, s * .46, s * .3, '#3a3a44'); c.save(); c.translate(0, -s * .08); (ING[id || 'patty'] || ING.patty)(c, s * .7); c.restore(); } }
    else if (k === 'stack') { c.translate(0, s * .05); for (const [i, l] of [['bunB', .28], ['patty', .1], ['cheese', -.02], ['bunT', -.2]]) { c.save(); c.translate(0, l * s); LAYER[i][1](c, s * .8); c.restore(); } }
    else if ((k === 'pick' || k === 'build' || k === 'decorate' || k === 'grill') && id && ING[id] && !(k === 'grill' && id === 'bread')) { if (k === 'grill') { ell(c, 0, s * .2, s * .46, s * .3, '#3a3a44'); c.translate(0, s * .02); } ING[id](c, s * (k === 'decorate' ? .95 : 1)); }
    else if (k === 'decorate') { for (let i = 0; i < 9; i++) { c.save(); c.translate((rnd(i) - .5) * s * .8, (rnd(i + 5) - .5) * s * .7); c.rotate(rnd(i + 9) * 3); box(c, -s * .08, -s * .03, s * .16, s * .06, SPRINKLE[i % 5], s * .02); c.restore(); } }
    else if (k === 'slice') { c.save(); c.rotate(.5); box(c, -s * .5, -s * .08, s * .6, s * .16, '#d8dde6', s * .05); box(c, s * .1, -s * .1, s * .36, s * .2, '#a87a50', s * .08); c.restore(); }
    else if (k === 'serve') { ell(c, 0, s * .12, s * .46, s * .28, '#fff'); ell(c, 0, s * .1, s * .34, s * .2, '#e8f4fa'); art.star(c, 0, -s * .12, s * .2, '#ffd54a', 0); }
    c.restore();
  }

  const pan = (c, x, y, w, h) => { c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, x - w / 2 + 4, y - h / 2 + 8, w, h, h * .22); c.fill(); box(c, x - w / 2, y - h / 2, w, h, '#8b95a6', h * .22); box(c, x - w / 2 + h * .08, y - h / 2 + h * .08, w - h * .16, h - h * .16, '#c4ccd9', h * .18); box(c, x - w / 2 + h * .14, y - h / 2 + h * .14, w - h * .28, h - h * .28, '#aab4c4', h * .14); };

  function drawSheet(g, c, p, col) {
    const rx = lerp(.17, .46, p) * g.U, ry = lerp(.15, .3, p) * g.U;
    c.save(); c.translate(g.bx, g.by); c.fillStyle = 'rgba(80,40,20,.16)'; c.translate(5, 8); blob(c, rx, ry, 7, .012, 72); c.fill(); c.translate(-5, -8);
    c.fillStyle = shade(col, -.18); blob(c, rx, ry, 7, .012, 72); c.fill(); c.fillStyle = col; c.scale(.96, .94); blob(c, rx, ry, 7, .012, 72); c.fill(); c.scale(1 / .96, 1 / .94);
    shine(c, -rx * .3, -ry * .35, rx * .22, ry * .1, -.2, .35); c.restore();
  }

  function drawCupcakeAt(c, p, r) { c.save(); c.scale(r / 38, r / 38); drawCupcake(c, p, 40); c.restore(); }

  // a pointing finger-circle that bounces: "touch here"
  const F = { hush: false };   // while a photo is taken nothing points or hints
  function drawTapHint(c, x, y, r, t) { if (F.hush) return; const b = Math.abs(Math.sin(t * 4)) * r * .5; c.save(); c.translate(x, y - r * 1.1 - b); c.lineJoin = 'round'; c.fillStyle = '#ff6b9d'; c.strokeStyle = '#fff'; c.lineWidth = r * .16; c.beginPath(); c.moveTo(-r * .38, -r * .55); c.lineTo(r * .38, -r * .55); c.lineTo(r * .38, -r * .05); c.lineTo(r * .78, -r * .05); c.lineTo(0, r * .7); c.lineTo(-r * .78, -r * .05); c.lineTo(-r * .38, -r * .05); c.closePath(); c.stroke(); c.fill(); c.restore(); }
  function drawPieceC(c, p, R) { drawPiece(c, p, R); }

  function drawUnit(c, u, s) {
    const k = u.cook || 0;
    if (u.id === 'pancake') { ell(c, 0, s * .02, s * .38, s * .3, k < .5 ? '#f0d9a0' : '#d9a04a'); ell(c, 0, 0, s * .38, s * .3, k < .5 ? '#fff1c4' : lerpHex('#fff1c4', '#f0c36a', (k - .5) * 2)); if (k > .12 && k < .55) for (let i = 0; i < 6; i++) circ(c, (rnd(i + 3) - .5) * s * .5, (rnd(i + 9) - .5) * s * .3, s * .018 + k * s * .02, 'rgba(255,255,255,.7)'); return; }
    (ING[u.id] || ING.patty)(c, s * (u.id === 'sausage' ? 1.2 : 1));
    if (k < 1) { c.save(); c.globalAlpha = .45 * (1 - k); c.fillStyle = '#ffb4a0'; if (u.id === 'sausage') { rr(c, -s * .6, -s * .12, s * 1.2, s * .24, s * .12); c.fill(); } else { c.beginPath(); c.ellipse(0, 0, s * .44, s * .34, 0, 0, TAU); c.fill(); } c.restore(); }
    else if (u.id !== 'bread') { c.save(); c.globalAlpha = .18; c.strokeStyle = '#2a1a10'; c.lineWidth = s * .035; for (const x of [-.2, 0, .2]) { c.beginPath(); c.moveTo(x * s - s * .05, -s * .15); c.lineTo(x * s + s * .05, s * .15); c.stroke(); } c.restore(); }
  }
  const lerpHex = (a, b, k) => mixHex(a, b, clamp(k, 0, 1));

  // ---- sauces and seasoning are painted wherever they are squirted: on the food or on the plate. A mark is stored in the food's own units
  // (so it moves with the food and gets bitten away with it), or in plate units for the plate. { col, kind, pts: [{ x, y, w }] }
  const saucePts = (c, st, k) => {
    const pts = st.pts; if (!pts.length) return;
    const dark = shade(st.col, -.28), lite = shade(st.col, st.col === '#fff6dc' ? -.05 : .45);
    const pass = (col, f, dx, dy, a) => { c.globalAlpha = a; c.strokeStyle = col; c.fillStyle = col; for (let i = 0; i < pts.length; i++) { const q = pts[i], w = Math.max(.5, q.w * k * f); c.beginPath(); c.arc(q.x * k + dx * w, q.y * k + dy * w, w / 2, 0, TAU); c.fill(); if (i) { const o = pts[i - 1]; c.lineWidth = w; c.beginPath(); c.moveTo(o.x * k + dx * w, o.y * k + dy * w); c.lineTo(q.x * k + dx * w, q.y * k + dy * w); c.stroke(); } } c.globalAlpha = 1; };
    c.lineCap = c.lineJoin = 'round';
    if (st.pizza) { pass(st.col, 1, 0, 0, .95); pass(shade(st.col, .12), .55, 0, 0, .5); return; }
    pass('rgba(60,20,10,1)', 1.12, .06, .14, .16); pass(dark, 1.06, 0, .05, 1); pass(st.col, 1, 0, 0, 1); pass(lite, .3, -.18, -.2, st.kind === 'sauce' ? .65 : .5);
  };
  const grainPts = (c, st, k) => { c.fillStyle = st.col; for (const q of st.pts) { c.beginPath(); c.arc(q.x * k, q.y * k, Math.max(.8, q.w * k), 0, TAU); c.fill(); } };
  function drawPaintList(c, list, k) { if (!list) return; c.save(); for (const st of list) { if (st.kind === 'pen') { c.save(); c.scale(k, k); drawPiped(c, st, PEN_R); c.restore(); } else (st.kind === 'grain' ? grainPts : saucePts)(c, st, k); } c.restore(); }
  const PEN_R = .17;   // icing pen drawn on the plate: points are stored in units of PEN_R * plate unit

  const drawShadowDisc = (c, x, y, r) => { c.fillStyle = 'rgba(80,40,20,.14)'; c.beginPath(); c.ellipse(x + r * .06, y, r * 1.0, r * .32, 0, 0, TAU); c.fill(); };
  // piece centred at (x, y); tall pieces are drawn from their base so the middle lands on the point
  function drawPieceAt(c, p, x, y, R) { c.save(); c.translate(x, y + pieceBase(p, R)); drawPiece(c, p, R); c.restore(); }
  const FLAT = ['stack', 'hotdog', 'sundae'];
  const pieceBase = (p, R) => !p.shape && FLAT.includes(p.type) ? pieceHeight(p, R) * .5 : 0;

  function drawKnife(c, x, y, s) { c.save(); c.translate(x, y); c.rotate(.18); c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, -s * .04 + 4, -s * .06 + 6, s * .09, s * .5, s * .03); c.fill(); c.fillStyle = '#e8eef8'; c.beginPath(); c.moveTo(-s * .045, -s * .02); c.lineTo(s * .045, -s * .02); c.lineTo(s * .045, s * .4); c.quadraticCurveTo(0, s * .46, -s * .045, s * .4); c.closePath(); c.fill(); c.fillStyle = '#b9c4d4'; c.fillRect(-s * .045, -s * .02, s * .02, s * .42); box(c, -s * .055, -s * .24, s * .11, s * .24, '#d63a3a', s * .04); c.restore(); }

  // draws a piece with the bites taken out of it
  function drawBittenAt(g, c, p, x, y, R) {
    if (!p.bites || !p.bites.length) { drawPieceAt(c, p, x, y, R); return; }
    const dpr = g.dpr || 1, S = Math.ceil(R * 4 * dpr), oc = g.oc; if (oc.width !== S) { oc.width = S; oc.height = S; }
    const o = oc.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, S, S); o.setTransform(dpr, 0, 0, dpr, S / 2, S / 2);
    o.save(); o.translate(0, pieceBase(p, R)); drawPiece(o, p, R); o.restore();
    o.globalCompositeOperation = 'destination-out'; o.fillStyle = '#000'; for (const b of p.bites) { o.beginPath(); o.arc(b.x, b.y, b.r, 0, TAU); o.fill(); } o.globalCompositeOperation = 'source-over';
    c.drawImage(oc, x - S / 2 / dpr, y - S / 2 / dpr, S / dpr, S / dpr);
  }

  SPG.cookArt = { PEN_R, shapePath, F, BUNS, BREADS, CHEESES, TOPL, SAUCE_L, drawPizza, drawTops, drawScoop, TOP_SZ, pizzaClip, FLAT, sundaeTop, clamp, lerp, ease, rr, rnd, shade, circ, ell, box, tri, shine, blob, FF, fancyText, fitLabel, gingham, ribbon, PIECES, SHAPES, starPath, heartPath, shapeFill, cookieShape, cutterArt, BUN, BREAD, CRUST, ING, TUBE, SCOOP, ICING, SCOOPS, NAME, LAYER, SAUCE, SEASON, drawTable, drawBoard, drawPlate, drawBowl, drawSpoon, drawPin, drawOven, drawGrill, drawToaster, LAYER_ICON, DOUGH, BAKED, CHOCDOUGH, CHOCBAKED, drawDeco, drawCookie, mixHex, drawCupcake, drawCake, drawFlatDots, drawStack, drawHotdog, drawSundae, drawPiece, drawCharSandwich, drawSliced, pieceHeight, sampleBox, drawSample, ICOL, BATTER, SPRINKLE, stepIcon, pan, drawSheet, drawCupcakeAt, drawTapHint, drawPieceC, drawUnit, lerpHex, SPRINKLE_KINDS, drawSprinkle, CANDY_KINDS, drawCandy, CANDLE_KINDS, drawCandle, FRUIT_KINDS, ICING12, drawIcingPen, drawPaintBucket, drawMeasure, drawPile, drawEgg, saucePts, grainPts, drawPaintList, drawShadowDisc, drawPieceAt, pieceBase, drawKnife, drawBittenAt, TAU };
})();
