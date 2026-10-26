// Seeing (Grown-ups > Accessibility, everything off by default): colour filters for children with colour vision deficiency,
// stronger contrast, and bigger buttons. The colour filters are "daltonize" corrections, not simulations: the colour a child cannot
// tell apart is shifted into colours the child can see, over the whole app (one SVG filter on the page, so every game gets it).
//   settings.vision: '' | 'deutan' (red-green, the most common) | 'protan' (red-green, reds look dark) | 'tritan' (blue-yellow)
//   settings.contrast: stronger contrast and colour;  settings.bigUI: bigger round buttons, pills and arrows on the menus and around the games
(() => {
  const SPG = window.SPG;
  // how each kind of colour vision sees (Machado, Oliveira and Fernandes 2009, full strength), in linear RGB
  const SIM = {
    protan: [[.152286, 1.052583, -.204868], [.114503, .786281, .099216], [-.003882, -.048116, 1.051998]],
    deutan: [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.01182, .04294, .968881]],
    tritan: [[1.255528, -.076749, -.178779], [-.078411, .930809, .147602], [.004733, .691367, .3039]]
  };
  // where the lost difference is moved to (red-green differences become lightness and blue differences; blue-yellow becomes red-green)
  const SHIFT = { protan: [[0, 0, 0], [.7, 1, 0], [.7, 0, 1]], deutan: [[0, 0, 0], [.7, 1, 0], [.7, 0, 1]], tritan: [[1, 0, .7], [0, 1, .7], [0, 0, 0]] };
  const mm = (a, b) => a.map((r, i) => r.map((_, j) => r.reduce((s, _, k) => s + a[i][k] * b[k][j], 0)));
  // corrected colour = colour + SHIFT x (colour - what is seen) = (I + SHIFT (I - SIM)) colour
  function matrix(kind) {
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], lost = I.map((r, i) => r.map((v, j) => v - SIM[kind][i][j]));
    const m = mm(SHIFT[kind], lost).map((r, i) => r.map((v, j) => v + I[i][j]));
    return m.map(r => r.map(v => +v.toFixed(4)).join(' ') + ' 0 0').join(' ') + ' 0 0 0 1 0';
  }
  function filters() {
    if (document.getElementById('spg-vision')) return;
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.id = 'spg-vision'; svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    for (const kind of Object.keys(SIM)) {
      const f = document.createElementNS(ns, 'filter'); f.id = 'spg-' + kind; f.setAttribute('color-interpolation-filters', 'linearRGB');
      const cm = document.createElementNS(ns, 'feColorMatrix'); cm.setAttribute('type', 'matrix'); cm.setAttribute('values', matrix(kind));
      f.append(cm); svg.append(f);
    }
    document.body.append(svg);
  }
  function apply() {
    const st = (SPG.store && SPG.store.settings) || {}, root = document.documentElement;
    if (st.vision && SIM[st.vision]) filters();
    for (const k of Object.keys(SIM)) root.classList.toggle('vision-' + k, st.vision === k);
    root.classList.toggle('vision-contrast', !!st.contrast);
    root.classList.toggle('big-ui', !!st.bigUI);
  }
  // a child who cannot tell some colours apart: games that are only about colour (sorting by colour) leave that part out
  const colourBlind = () => !!(SPG.store && SPG.store.settings && SPG.store.settings.vision);

  // Colour symbols: where a game tells things apart by colour alone (Shape Builder pieces and holes, Caterpillars balls), each colour also
  // carries a little white symbol of its own, so colour is never the only difference. On with a colour filter unless switched off
  // (settings.colourMarks), and can be switched on without a filter too.
  const SYM = { red: 'heart', orange: 'bolt', yellow: 'sun', green: 'leaf', blue: 'drop', purple: 'moon', pink: 'flower', brown: 'paw' };
  const marks = () => { const st = (SPG.store && SPG.store.settings) || {}; return st.colourMarks != null ? !!st.colourMarks : !!st.vision; };
  const circle = (c, x, y, r) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); };
  function symPath(c, k) {
    c.beginPath();
    switch (k) {
      case 'heart': c.moveTo(0, .85); c.bezierCurveTo(-1.15, .05, -.85, -1, 0, -.42); c.bezierCurveTo(.85, -1, 1.15, .05, 0, .85); break;
      case 'bolt': c.moveTo(.32, -1); c.lineTo(-.55, .12); c.lineTo(-.02, .12); c.lineTo(-.3, 1); c.lineTo(.58, -.16); c.lineTo(.05, -.16); c.lineTo(.32, -1); break;
      case 'sun': circle(c, 0, 0, .44); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, p = (q, d) => [Math.cos(a + d) * q, Math.sin(a + d) * q]; c.moveTo(...p(.66, -.2)); c.lineTo(...p(1, 0)); c.lineTo(...p(.66, .2)); c.closePath(); } break;
      case 'leaf': c.moveTo(-.72, .72); c.bezierCurveTo(-.85, -.35, .1, -.9, .85, -.85); c.bezierCurveTo(.8, -.05, .35, .85, -.72, .72); break;
      case 'drop': c.moveTo(0, -1); c.bezierCurveTo(.18, -.6, .68, -.12, .68, .3); c.arc(0, .3, .68, 0, Math.PI); c.bezierCurveTo(-.68, -.12, -.18, -.6, 0, -1); break;
      case 'moon': c.arc(0, 0, .9, Math.PI * .32, Math.PI * 1.68); c.arc(.42, -.0, .72, Math.PI * 1.55, Math.PI * .45, true); c.closePath(); break;
      case 'flower': for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; circle(c, Math.cos(a) * .55, Math.sin(a) * .55, .4); } break;
      case 'paw': c.ellipse(0, .4, .48, .4, 0, 0, Math.PI * 2); for (const [x, y] of [[-.76, -.08], [-.32, -.66], [.32, -.66], [.76, -.08]]) circle(c, x, y, .17); break;
    }
  }
  // the symbol of a colour (a colour name) centred at the origin, r = its radius in pixels of the current transform
  function mark(c, name, r, alpha = 1) {
    const k = SYM[name]; if (!k || !(r > 0)) return;
    c.save(); c.globalAlpha *= alpha; c.scale(r, r); c.lineJoin = c.lineCap = 'round';
    symPath(c, k); c.strokeStyle = 'rgba(55,35,70,.78)'; c.lineWidth = .34; c.stroke();
    c.fillStyle = '#fff'; c.fill();
    if (k === 'flower') { c.beginPath(); circle(c, 0, 0, .3); c.fillStyle = 'rgba(55,35,70,.5)'; c.fill(); }
    if (k === 'leaf') { c.beginPath(); c.moveTo(-.5, .5); c.quadraticCurveTo(.1, -.1, .62, -.62); c.lineWidth = .12; c.stroke(); }
    c.restore();
  }
  SPG.vision = { apply, colourBlind, matrix, marks, mark, SYM };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
