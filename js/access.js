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
  SPG.vision = { apply, colourBlind, matrix };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
