// Tidy Time: sorting. Toys, fruit and vegetables lie about the room and she drags each one to the basket where it belongs: the
// basket of its colour, the fruit bowl or the vegetable crate, the big bear or the little bear, the box of its shape.
// Sorting things by one property (and, when older, ignoring another one) is a core preschool maths skill that no other game
// covers (Shape Builder fits pieces into holes, Caterpillars is patterns, Letter Garden counts).
// Nothing is lost: a thing dropped on the wrong basket slides back to where it lay while the basket shakes its head, and after two
// tries with the same thing its basket glows. A thing let go on the floor simply stays there. A tidy room is a little party, and
// every second tidy room is +1 star. The kind of sorting changes every round (`MODES`), so it never gets samey.
// Tiers (SPG.level.tier('sort')): 1 = two baskets and 6 things, by colour or big and little; 2 = three colours, fruit or vegetable,
// big or little, 8 things; 3 = four colours, big-middle-little (three bears), fruit or vegetable, and by shape with mixed colours, 10 things.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store, pets: P } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
  const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); };
  const rr = art.rr, shade = art.shade, INK = art.INK;

  const COLORS = { red: '#f2474f', blue: '#3f8ef0', yellow: '#ffd23a', green: '#4cc24c', purple: '#a565ea', orange: '#ff9330' };
  const EASY = ['red', 'blue', 'yellow', 'green'];
  const TOYS = ['ball', 'block', 'car', 'star', 'duck', 'sock', 'cup', 'heart'];
  const FRUIT = ['apple', 'orange', 'melon', 'berry', 'banana', 'grapes', 'pear'];
  const FRUIT_ART = { apple: 0, orange: 1, melon: 2, berry: 3, banana: 4 };   // the rest are drawn here
  const VEG = ['carrot', 'broccoli', 'corn', 'peas', 'potato'];
  const SHAPES = ['circle', 'square', 'triangle'];
  const SIZE = { big: 1.2, mid: .88, small: .62 };
  const BEAR = { big: 1, mid: .78, small: .58 };
  // which kinds of sorting each tier gets (they take turns, one per round)
  const MODES = { 1: ['color', 'size'], 2: ['color', 'food', 'size'], 3: ['color', 'food', 'size', 'shape'] };
  const COUNT = { 1: 6, 2: 8, 3: 10 };
  const ROOM = {
    color: { wall: ['#fff1d8', '#ffe2bf'], stripe: '#ffd7a8', floor: '#e9b77c', rug: 'rainbow' },
    food: { wall: ['#e8f7df', '#d3efc4'], stripe: '#c4e6b0', floor: '#d9a868', rug: 'gingham', awning: true },
    size: { wall: ['#f3dcc0', '#e7c69f'], stripe: 'logs', floor: '#c98f5a', rug: 'oval' },
    shape: { wall: ['#e3efff', '#cfe1fb'], stripe: 'dots', floor: '#dfb27c', rug: 'square' }
  };
  const api = { next: null };

  /* ---------------------------------------------------------------- round maker (also used by the test) */
  // returns { mode, bins: [{ key }], items: [{ key, kind, col, size }] }: an item belongs in the bin with the same key
  function makeRound(tier, mode) {
    tier = clamp(tier | 0, 1, 3);
    const n = COUNT[tier];
    mode = mode || pick(MODES[tier]);
    let bins = [], items = [];
    const spread = (keys, make) => { for (let i = 0; i < n; i++) items.push(make(keys[i % keys.length], i)); };
    if (mode === 'color') {
      const k = tier + 1, names = shuffle(tier === 3 ? Object.keys(COLORS) : EASY).slice(0, k);
      bins = names.map(key => ({ key }));
      const kinds = shuffle(TOYS);
      spread(names, (key, i) => ({ key, kind: kinds[i % kinds.length], col: key, size: 'mid' }));
    } else if (mode === 'size') {
      const sizes = tier === 3 ? ['big', 'mid', 'small'] : ['big', 'small'];
      bins = sizes.map(key => ({ key }));
      const kinds = shuffle(TOYS).slice(0, tier === 1 ? 2 : 3), cols = Object.keys(COLORS);
      // every kind comes in every size, so it is the size that is compared, not the thing
      spread(sizes, (key, i) => ({ key, kind: kinds[Math.floor(i / sizes.length) % kinds.length], col: pick(cols), size: key }));
    } else if (mode === 'food') {
      bins = shuffle([{ key: 'fruit' }, { key: 'veg' }]);
      const f = shuffle(FRUIT), v = shuffle(VEG);
      spread(['fruit', 'veg'], (key, i) => ({ key, kind: key === 'fruit' ? f[(i >> 1) % f.length] : v[(i >> 1) % v.length], size: 'mid' }));
    } else {
      bins = shuffle(SHAPES).map(key => ({ key }));
      const cols = shuffle(Object.keys(COLORS));
      // mixed colours: the same colour turns up in different shapes, so she has to look at the shape
      spread(bins.map(b => b.key), (key, i) => ({ key, kind: key, col: cols[(i * 2 + Math.floor(i / 3)) % cols.length], size: 'mid' }));
    }
    return { mode, bins, items: shuffle(items) };
  }

  /* ---------------------------------------------------------------- the things to tidy (each fits in a box of s x s around 0,0) */
  const gloss = (c, x, y, rx, ry, rot = -.6, a = .45) => { c.fillStyle = `rgba(255,255,255,${a})`; ell(c, x, y, rx, ry, rot); c.fill(); };
  function radial(c, r, col) { const g = c.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.15); g.addColorStop(0, shade(col, .35)); g.addColorStop(1, shade(col, -.12)); return g; }
  const TOY = {
    ball(c, s, col) {
      const r = s * .44; c.fillStyle = radial(c, r, col); ell(c, 0, 0, r, r); c.fill();
      c.save(); ell(c, 0, 0, r, r); c.clip(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = r * .22;
      c.beginPath(); c.ellipse(0, 0, r * 1.05, r * .38, -.45, 0, TAU); c.stroke(); c.restore();
      gloss(c, -r * .4, -r * .45, r * .26, r * .14);
    },
    block(c, s, col) {
      const a = s * .78; c.fillStyle = shade(col, -.2); rr(c, -a / 2, -a / 2 + a * .06, a, a, a * .16); c.fill();
      c.fillStyle = col; rr(c, -a / 2, -a / 2, a, a, a * .16); c.fill();
      c.fillStyle = shade(col, .3); rr(c, -a * .32, -a * .32, a * .64, a * .64, a * .1); c.fill();
      art.star(c, 0, a * .02, a * .19, shade(col, -.1)); gloss(c, -a * .28, -a * .34, a * .14, a * .06, 0);
    },
    car(c, s, col) {
      c.fillStyle = shade(col, -.15); rr(c, -s * .28, -s * .3, s * .5, s * .26, s * .1); c.fill();
      c.fillStyle = '#cfeeff'; rr(c, -s * .22, -s * .25, s * .17, s * .16, s * .04); c.fill(); rr(c, s * .0, -s * .25, s * .16, s * .16, s * .04); c.fill();
      c.fillStyle = col; rr(c, -s * .46, -s * .08, s * .92, s * .28, s * .12); c.fill();
      c.fillStyle = '#fff3a0'; ell(c, s * .4, s * .02, s * .05, s * .05); c.fill();
      gloss(c, -s * .22, -s * .02, s * .16, s * .04, 0, .4);
      for (const x of [-.26, .26]) { c.fillStyle = '#3d3348'; ell(c, x * s, s * .2, s * .12, s * .12); c.fill(); c.fillStyle = '#c9c3d6'; ell(c, x * s, s * .2, s * .05, s * .05); c.fill(); }
    },
    star(c, s, col) { art.star(c, 0, s * .02, s * .42, col); },
    heart(c, s, col) { art.heart(c, 0, s * .02, s * .38, col); gloss(c, -s * .16, -s * .14, s * .1, s * .06); },
    duck(c, s, col) {
      const beak = col === 'orange' || col === COLORS.orange ? '#f2474f' : '#ff8a1e';
      c.fillStyle = shade(col, -.08); ell(c, s * .02, s * .14, s * .42, s * .24); c.fill();
      c.fillStyle = col; ell(c, -s * .02, s * .1, s * .38, s * .2); c.fill();
      c.beginPath(); c.moveTo(s * .3, s * .02); c.quadraticCurveTo(s * .5, -s * .14, s * .44, s * .12); c.fill();
      ell(c, -s * .14, -s * .2, s * .21, s * .2); c.fill();
      c.fillStyle = beak; ell(c, -s * .37, -s * .15, s * .1, s * .05); c.fill();
      c.fillStyle = INK; ell(c, -s * .2, -s * .25, s * .035, s * .04); c.fill();
      c.fillStyle = shade(col, -.15); ell(c, s * .06, s * .08, s * .15, s * .08, -.3); c.fill();
      gloss(c, -s * .1, -s * .3, s * .07, s * .04);
    },
    sock(c, s, col) {
      c.fillStyle = col; c.beginPath(); c.moveTo(-s * .16, -s * .42); c.lineTo(s * .14, -s * .42); c.lineTo(s * .14, s * .1);
      c.quadraticCurveTo(s * .14, s * .14, s * .2, s * .16); c.lineTo(s * .34, s * .2); c.quadraticCurveTo(s * .46, s * .3, s * .36, s * .4);
      c.lineTo(-s * .1, s * .4); c.quadraticCurveTo(-s * .2, s * .4, -s * .18, s * .26); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-s * .16, -s * .42, s * .3, s * .12);
      c.fillStyle = shade(col, .35); c.fillRect(-s * .16, -s * .2, s * .3, s * .06); c.fillRect(-s * .16, -s * .06, s * .3, s * .06);
      c.fillStyle = shade(col, -.2); ell(c, s * .3, s * .32, s * .08, s * .07); c.fill();
    },
    cup(c, s, col) {
      c.strokeStyle = shade(col, -.12); c.lineWidth = s * .08; c.beginPath(); c.arc(s * .28, s * .02, s * .13, -1.3, 1.3); c.stroke();
      c.fillStyle = col; c.beginPath(); c.moveTo(-s * .32, -s * .26); c.lineTo(s * .3, -s * .26); c.lineTo(s * .24, s * .32); c.quadraticCurveTo(0, s * .4, -s * .26, s * .32); c.closePath(); c.fill();
      c.fillStyle = shade(col, -.25); ell(c, -s * .01, -s * .26, s * .31, s * .07); c.fill();
      c.fillStyle = '#fff'; ell(c, 0, s * .04, s * .1, s * .1); c.fill(); art.heart(c, 0, s * .05, s * .07, col);
      gloss(c, -s * .2, -s * .08, s * .05, s * .14, 0, .35);
    }
  };
  // a little face for the things drawn here (the fruit from art.fruit already have one)
  const smile = (c, r) => art.face(c, r, { mood: 'happy', cheeks: false });
  const FOOD = {
    grapes(c, s) {
      c.strokeStyle = '#7a5230'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(0, -s * .3); c.lineTo(s * .04, -s * .44); c.stroke();
      art.leaf(c, s * .04, -s * .38, s * .22, -.3);
      const pts = [[-.18, -.2], [0, -.22], [.18, -.2], [-.1, -.04], [.1, -.04], [-.2, .1], [0, .12], [.2, .1], [-.08, .26], [.1, .26], [0, .4]];
      for (const [x, y] of pts) { c.fillStyle = radial(c, s * .12, '#9b59d0'); c.save(); c.translate(x * s, y * s); ell(c, 0, 0, s * .12, s * .12); c.fill(); gloss(c, -s * .04, -s * .05, s * .035, s * .02); c.restore(); }
      c.save(); c.translate(0, s * .06); smile(c, s * .22); c.restore();
    },
    pear(c, s) {
      c.fillStyle = radial(c, s * .4, '#b9d84a'); c.beginPath(); c.moveTo(0, -s * .38); c.bezierCurveTo(s * .18, -s * .38, s * .14, -s * .1, s * .3, s * .1);
      c.bezierCurveTo(s * .44, s * .34, s * .2, s * .46, 0, s * .46); c.bezierCurveTo(-s * .2, s * .46, -s * .44, s * .34, -s * .3, s * .1); c.bezierCurveTo(-s * .14, -s * .1, -s * .18, -s * .38, 0, -s * .38); c.fill();
      c.strokeStyle = '#7a5230'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(0, -s * .36); c.quadraticCurveTo(s * .03, -s * .46, s * .08, -s * .5); c.stroke();
      art.leaf(c, s * .06, -s * .44, s * .22, -.5); gloss(c, -s * .14, -s * .08, s * .08, s * .05);
      c.save(); c.translate(0, s * .2); smile(c, s * .26); c.restore();
    },
    carrot(c, s) {
      for (const a of [-.5, 0, .5]) art.leaf(c, 0, -s * .3, s * .26, -Math.PI / 2 + a, '#58b84a');
      c.fillStyle = '#ff8d2a'; c.beginPath(); c.moveTo(-s * .2, -s * .3); c.quadraticCurveTo(0, -s * .38, s * .2, -s * .3); c.quadraticCurveTo(s * .14, s * .1, 0, s * .48); c.quadraticCurveTo(-s * .14, s * .1, -s * .2, -s * .3); c.fill();
      c.strokeStyle = '#d96a10'; c.lineWidth = s * .025; for (const [y, l] of [[-.1, .1], [.08, .08], [.24, .06]]) { c.beginPath(); c.moveTo(-l * s, y * s); c.lineTo(-l * s * .2, y * s + s * .02); c.stroke(); }
      gloss(c, -s * .08, -s * .16, s * .04, s * .1, 0, .35);
      c.save(); c.translate(0, -s * .12); smile(c, s * .2); c.restore();
    },
    broccoli(c, s) {
      c.fillStyle = '#9ccc65'; c.beginPath(); c.moveTo(-s * .1, s * .04); c.lineTo(s * .1, s * .04); c.lineTo(s * .08, s * .44); c.quadraticCurveTo(0, s * .48, -s * .08, s * .44); c.closePath(); c.fill();
      for (const [x, y, r] of [[-.24, -.06, .17], [.24, -.06, .17], [-.12, -.24, .19], [.12, -.24, .19], [0, -.06, .2]]) { c.fillStyle = '#3f9a3a'; ell(c, x * s, y * s, r * s, r * s); c.fill(); c.fillStyle = '#58b84a'; ell(c, x * s - r * s * .2, y * s - r * s * .25, r * s * .6, r * s * .5); c.fill(); }
      c.save(); c.translate(0, -s * .1); smile(c, s * .22); c.restore();
    },
    corn(c, s) {
      c.fillStyle = '#ffd23a'; ell(c, 0, -s * .04, s * .17, s * .38); c.fill();
      c.fillStyle = '#ffe680'; for (let j = 0; j < 6; j++) for (let i = -1; i <= 1; i++) { ell(c, i * s * .09, -s * .32 + j * s * .1, s * .035, s * .035); c.fill(); }
      c.fillStyle = '#6bbf4e'; c.beginPath(); c.moveTo(0, s * .44); c.quadraticCurveTo(-s * .34, s * .2, -s * .22, -s * .2); c.quadraticCurveTo(-s * .12, s * .1, 0, s * .2); c.fill();
      c.beginPath(); c.moveTo(0, s * .44); c.quadraticCurveTo(s * .34, s * .2, s * .22, -s * .2); c.quadraticCurveTo(s * .12, s * .1, 0, s * .2); c.fill();
      c.save(); c.translate(0, -s * .1); smile(c, s * .2); c.restore();
    },
    peas(c, s) {
      c.save(); c.rotate(-.35);
      c.fillStyle = '#4fae3c'; c.beginPath(); c.moveTo(-s * .46, 0); c.quadraticCurveTo(0, -s * .32, s * .46, 0); c.quadraticCurveTo(0, s * .32, -s * .46, 0); c.fill();
      c.fillStyle = '#9fe070'; c.beginPath(); c.moveTo(-s * .38, 0); c.quadraticCurveTo(0, -s * .2, s * .38, 0); c.quadraticCurveTo(0, s * .12, -s * .38, 0); c.fill();
      for (const x of [-.2, 0, .2]) { c.fillStyle = radial(c, s * .09, '#6fcf4a'); c.save(); c.translate(x * s, -s * .03); ell(c, 0, 0, s * .09, s * .09); c.fill(); c.restore(); }
      c.restore(); c.save(); c.translate(0, s * .13); smile(c, s * .16); c.restore();
    },
    potato(c, s) {
      c.fillStyle = radial(c, s * .4, '#d6a96a'); c.beginPath();
      for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU, k = 1 + Math.sin(i * 2.3) * .05; const x = Math.cos(a) * s * .44 * k, y = Math.sin(a) * s * .32 * k; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.closePath(); c.fill();
      c.fillStyle = '#a97c45'; for (const [x, y] of [[-.3, -.12], [.32, .08], [.18, -.2], [-.2, .2]]) { ell(c, x * s, y * s, s * .025, s * .02); c.fill(); }
      gloss(c, -s * .18, -s * .14, s * .1, s * .04, -.3, .3);
      c.save(); c.translate(0, s * .02); smile(c, s * .26); c.restore();
    }
  };
  function shapePath(c, kind, r) {
    c.beginPath();
    if (kind === 'circle') c.arc(0, 0, r, 0, TAU);
    else if (kind === 'square') rr(c, -r * .88, -r * .88, r * 1.76, r * 1.76, r * .16);
    else { c.moveTo(0, -r * 1.02); c.lineTo(r * 1.05, r * .78); c.lineTo(-r * 1.05, r * .78); c.closePath(); }
  }
  function shapeToy(c, s, kind, col) {
    const r = s * .4; c.lineJoin = 'round';
    c.save(); c.translate(0, s * .05); c.fillStyle = shade(col, -.25); shapePath(c, kind, r); c.fill(); c.restore();
    c.fillStyle = col; shapePath(c, kind, r); c.fill();
    c.save(); c.scale(.7, .7); c.translate(0, kind === 'triangle' ? r * .12 : 0); c.fillStyle = shade(col, .28); shapePath(c, kind, r); c.fill(); c.restore();
    gloss(c, -r * .35, -r * .45, r * .22, r * .1);
  }
  function drawItem(c, it, s) {
    c.save(); c.lineCap = c.lineJoin = 'round';
    if (it.kind in FRUIT_ART) art.fruit(c, FRUIT_ART[it.kind], s * .4, { mood: 'happy' });
    else if (FOOD[it.kind]) FOOD[it.kind](c, s);
    else if (SHAPES.includes(it.kind)) shapeToy(c, s, it.kind, COLORS[it.col]);
    else TOY[it.kind](c, s, COLORS[it.col]);
    c.restore();
  }

  /* ---------------------------------------------------------------- baskets, bowls, crates and boxes (origin = middle of the rim) */
  function binColors(mode, key) {
    if (mode === 'color') return { body: COLORS[key], rim: shade(COLORS[key], .3) };
    if (mode === 'food') return key === 'fruit' ? { body: '#ff9ec0', rim: '#fff4f8', bowl: true } : { body: '#c98f5a', rim: '#e8b886', crate: true };
    if (mode === 'shape') return { body: '#ffc861', rim: '#ffe29a', box: true };
    return { body: '#d9a45c', rim: '#f0c886' };
  }
  function binBack(c, b, w, h, col) {
    c.fillStyle = shade(col.body, -.45); ell(c, 0, 0, w * .5, h * .16); c.fill();
  }
  function binFront(c, b, w, h, col, mode, t) {
    const top = 0, bot = h, bw = col.bowl ? w * .3 : w * .42;
    c.save();
    c.beginPath(); c.moveTo(-w * .5, top);
    if (col.bowl) c.bezierCurveTo(-w * .5, h * .9, -w * .26, bot, 0, bot), c.bezierCurveTo(w * .26, bot, w * .5, h * .9, w * .5, top);
    else c.lineTo(-bw, bot - h * .08), c.quadraticCurveTo(-bw, bot, -bw + h * .1, bot), c.lineTo(bw - h * .1, bot), c.quadraticCurveTo(bw, bot, bw, bot - h * .08), c.lineTo(w * .5, top);
    c.ellipse(0, top, w * .5, h * .16, 0, 0, Math.PI); c.closePath();
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, col.body); g.addColorStop(1, shade(col.body, -.18)); c.fillStyle = g; c.fill();
    c.clip();
    if (col.crate) { c.strokeStyle = shade(col.body, -.3); c.lineWidth = h * .04; for (const y of [.36, .68]) { c.beginPath(); c.moveTo(-w, h * y); c.lineTo(w, h * y); c.stroke(); } }
    else if (col.box) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-w, h * .5, w * 2, h); }
    else if (!col.bowl) {   // woven basket
      c.strokeStyle = shade(col.body, -.22); c.lineWidth = Math.max(1, h * .03);
      for (let y = h * .28; y < h; y += h * .2) { c.beginPath(); c.moveTo(-w, y); c.lineTo(w, y); c.stroke(); }
      for (let x = -w * .5; x < w * .5; x += w * .12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x * .84, h); c.stroke(); }
    } else { c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-w, h * .3, w * 2, h * .1); }
    c.restore();
    // the rim
    c.strokeStyle = col.rim; c.lineWidth = h * .12; c.beginPath(); c.ellipse(0, top, w * .5, h * .16, 0, 0, Math.PI); c.stroke();
    c.strokeStyle = shade(col.rim, .2); c.lineWidth = h * .05; c.beginPath(); c.ellipse(0, top, w * .5, h * .16, 0, .2, Math.PI - .2); c.stroke();
    // a friendly face: opens wide when a thing is held over it, chomps when one goes in
    if (mode !== 'size') {
      const fy = h * .56, r = Math.min(w * .3, h * .5), open = b.open, sad = b.shake > 0;
      c.save(); c.translate(0, fy);
      c.fillStyle = INK;
      if (b.chomp > .5 || b.blink > 0) { c.strokeStyle = INK; c.lineWidth = r * .1; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * r * .42, -r * .12, r * .13, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } }
      else for (const sx of [-1, 1]) { ell(c, sx * r * .42, -r * .16, r * .11, r * .13); c.fill(); c.fillStyle = '#fff'; ell(c, sx * r * .42 - r * .03, -r * .21, r * .04, r * .04); c.fill(); c.fillStyle = INK; }
      c.fillStyle = 'rgba(255,120,140,.35)'; for (const sx of [-1, 1]) { ell(c, sx * r * .66, r * .06, r * .12, r * .07); c.fill(); }
      if (open > .05 && !sad) { c.fillStyle = '#7a2f3a'; ell(c, 0, r * .14, r * .22, r * .06 + r * .2 * open); c.fill(); c.fillStyle = '#ff8fa3'; ell(c, 0, r * .14 + r * .12 * open, r * .13, r * .06 * open); c.fill(); }
      else { c.strokeStyle = INK; c.lineWidth = r * .09; c.beginPath(); if (sad) { c.moveTo(-r * .16, r * .2); c.lineTo(r * .16, r * .2); } else c.arc(0, r * .02, r * .2, .35, Math.PI - .35); c.stroke(); }
      c.restore();
    }
  }
  // the sign above a fruit bowl, vegetable crate or shape box
  function sign(c, mode, key, r, t) {
    c.fillStyle = '#8a6448'; c.fillRect(-r * .08, 0, r * .16, r * 1.1);
    c.fillStyle = 'rgba(0,0,0,.12)'; ell(c, 0, r * .08, r, r); c.fill();
    c.fillStyle = '#fff'; ell(c, 0, 0, r, r); c.fill();
    c.strokeStyle = mode === 'shape' ? '#ffc861' : key === 'fruit' ? '#ff9ec0' : '#7ac35a'; c.lineWidth = r * .14; ell(c, 0, 0, r * .93, r * .93); c.stroke();
    if (mode === 'shape') { c.strokeStyle = '#5a3f5e'; c.lineWidth = r * .12; c.setLineDash([r * .2, r * .14]); shapePath(c, key, r * .5); c.stroke(); c.setLineDash([]); }
    else if (key === 'fruit') { c.save(); c.translate(-r * .22, r * .06); art.fruit(c, 0, r * .4); c.restore(); c.save(); c.translate(r * .3, r * .1); c.rotate(.3); FOOD.grapes(c, r * .7); c.restore(); }
    else { c.save(); c.translate(-r * .24, 0); c.rotate(-.3); FOOD.carrot(c, r * .9); c.restore(); c.save(); c.translate(r * .28, r * .08); FOOD.broccoli(c, r * .75); c.restore(); }
  }

  /* ---------------------------------------------------------------- the room behind (drawn once into a spare canvas) */
  function drawRoom(c, w, h, mode, floorY, rug, night) {
    const R = ROOM[mode];
    const g = c.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, R.wall[0]); g.addColorStop(1, R.wall[1]); c.fillStyle = g; c.fillRect(0, 0, w, floorY);
    if (R.stripe === 'logs') { c.strokeStyle = 'rgba(140,90,50,.25)'; c.lineWidth = 3; for (let y = floorY - 26; y > 0; y -= 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }
    else if (R.stripe === 'dots') { c.fillStyle = 'rgba(120,160,230,.25)'; for (let y = 18; y < floorY; y += 40) for (let x = (y / 40 % 2) * 22 + 12; x < w; x += 44) { ell(c, x, y, 5, 5); c.fill(); } }
    else { c.fillStyle = R.stripe; for (let x = 0; x < w; x += 56) c.fillRect(x, 0, 24, floorY); }
    // a window with the sky (or the moon at night)
    const ww = Math.min(w * .26, 210), wh = Math.min(floorY * .55, ww * .8), wx = w * .5 - ww / 2, wy = Math.max(10, floorY - wh - floorY * .2);
    if (!R.awning && wh > 40) {
      c.fillStyle = '#fff'; rr(c, wx - 8, wy - 8, ww + 16, wh + 16, 10); c.fill();
      const sky = c.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, night ? '#1d2550' : '#9fd8ff'); sky.addColorStop(1, night ? '#38407a' : '#dff3ff'); c.fillStyle = sky; c.fillRect(wx, wy, ww, wh);
      if (night) { c.fillStyle = '#fff6c4'; ell(c, wx + ww * .72, wy + wh * .32, wh * .14, wh * .14); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { ell(c, wx + ww * (.1 + i * .15), wy + wh * (.2 + (i % 3) * .2), 1.5, 1.5); c.fill(); } }
      else { c.fillStyle = '#ffe066'; ell(c, wx + ww * .76, wy + wh * .3, wh * .13, wh * .13); c.fill(); c.fillStyle = '#fff'; ell(c, wx + ww * .3, wy + wh * .55, ww * .14, wh * .1); c.fill(); ell(c, wx + ww * .4, wy + wh * .5, ww * .1, wh * .1); c.fill(); }
      c.fillStyle = '#fff'; c.fillRect(wx + ww / 2 - 4, wy, 8, wh); c.fillRect(wx, wy + wh / 2 - 4, ww, 8);
      c.fillStyle = mode === 'size' ? '#d9534f' : '#ff9ec0';
      for (const s of [-1, 1]) { c.beginPath(); const x0 = s < 0 ? wx - 14 : wx + ww + 14; c.moveTo(x0, wy - 14); c.lineTo(x0 - s * ww * .2, wy - 14); c.quadraticCurveTo(x0 - s * ww * .06, wy + wh * .5, x0 - s * ww * .14, wy + wh + 10); c.lineTo(x0, wy + wh + 10); c.closePath(); c.fill(); }
    }
    if (R.awning) {   // a market stall
      const ah = Math.min(floorY * .38, 90), n = Math.ceil(w / 60);
      for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff6b6b'; c.fillRect(i * 60, 0, 60, ah); c.beginPath(); c.arc(i * 60 + 30, ah, 30, 0, Math.PI); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(0, ah - 6, w, 6);
    }
    // the floor
    c.fillStyle = R.floor; c.fillRect(0, floorY, w, h - floorY);
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, floorY, w, 6);
    c.strokeStyle = 'rgba(120,70,30,.18)'; c.lineWidth = 2; for (let y = floorY + 30; y < h; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    // the rug where the things lie
    const { x, y, rx, ry } = rug; c.save();
    if (R.rug === 'rainbow') { ['#ff8a8a', '#ffc46b', '#fff07a', '#9be27a', '#8ac8ff', '#c5a3ff'].forEach((col, i) => { c.fillStyle = col; ell(c, x, y, rx * (1 - i * .1), ry * (1 - i * .1)); c.fill(); }); }
    else if (R.rug === 'gingham') { c.beginPath(); rr(c, x - rx, y - ry, rx * 2, ry * 2, 18); c.fillStyle = '#fff'; c.fill(); c.clip(); c.fillStyle = 'rgba(240,80,90,.35)'; const q = Math.max(18, rx / 8); for (let i = x - rx; i < x + rx; i += q * 2) c.fillRect(i, y - ry, q, ry * 2); for (let j = y - ry; j < y + ry; j += q * 2) c.fillRect(x - rx, j, rx * 2, q); }
    else if (R.rug === 'oval') { ['#b5653a', '#e8b06a', '#9c4f2c', '#f0c98a'].forEach((col, i) => { c.fillStyle = col; ell(c, x, y, rx * (1 - i * .12), ry * (1 - i * .12)); c.fill(); }); }
    else { c.fillStyle = '#8fb8f0'; rr(c, x - rx, y - ry, rx * 2, ry * 2, 22); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.setLineDash([12, 10]); rr(c, x - rx + 12, y - ry + 12, rx * 2 - 24, ry * 2 - 24, 14); c.stroke(); c.setLineDash([]); }
    c.restore();
    if (night) { c.fillStyle = 'rgba(18,22,60,.42)'; c.fillRect(0, 0, w, h); const l = c.createRadialGradient(w / 2, rug.y, 10, w / 2, rug.y, Math.max(w, h) * .6); l.addColorStop(0, 'rgba(255,220,150,.25)'); l.addColorStop(1, 'rgba(255,220,150,0)'); c.fillStyle = l; c.fillRect(0, 0, w, h); }
  }

  /* ---------------------------------------------------------------- the game */
  class SortGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('sort', () => ({ rounds: 0, sorted: 0, mi: 0 }));
      this.bag.rounds = this.bag.rounds || 0; this.bag.sorted = this.bag.sorted || 0; this.bag.mi = this.bag.mi || 0;
      this.counter = SPG.ui.counter(host, (c, s) => { c.save(); c.translate(s / 2, s * .42); binFront(c, { open: 0, chomp: 0, blink: 0, shake: 0 }, s * .7, s * .42, binColors('color', 'green'), 'color', 0); c.restore(); }, this.bag.rounds);
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.round = null; this.drag = null; this.room = null;
      this.tick = this.tick.bind(this);
      const cv = this.canvas, pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * this.w / r.width, (e.clientY - r.top) * this.h / r.height]; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); SPG.audio.unlock(); if (this.drag) return; try { cv.setPointerCapture(e.pointerId); } catch (_) {} this.down(e.pointerId, ...pos(e)); });
      cv.addEventListener('pointermove', e => { if (this.drag && this.drag.id === e.pointerId) this.move(...pos(e)); });
      const up = e => { if (this.drag && this.drag.id === e.pointerId) this.up(...pos(e), e.type === 'pointercancel'); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      this.layout(); this.draw();
    }
    // baskets along the bottom, the things scattered on the rug above them; positions are kept as fractions so a turn of the screen keeps them
    layout() {
      const w = this.w, h = this.h, R = this.round; if (!R || !w) return;
      const k = R.bins.length, size = R.mode === 'size', wide = w > h * 1.15, short = wide && h < 560;
      // a phone on its side has little height: wide, low baskets and smaller bears and signs leave room for the things
      const bw = short ? Math.min(w * .8 / k, 190) : Math.min(w * .9 / k, h * (wide ? .3 : .22), 200), bh = short ? Math.min(bw * .5, h * .17) : bw * (wide ? .6 : .7);
      const deco = short ? (size ? h * .14 : R.mode === 'color' ? 8 : h * .12) : size ? bw * (wide ? .85 : 1.05) : R.mode === 'color' ? bw * .12 : bw * .56;
      const gap = (w - k * bw) / (k + 1), by = h - Math.max(12, h * .025) - bh;
      R.bins.forEach((b, i) => { b.x = gap + bw / 2 + i * (bw + gap); b.y = by; b.w = bw; b.h = bh; b.deco = deco; });
      this.bw = bw; this.bh = bh;
      const top = clamp(h * .14, 70, 100), bottom = by - deco - Math.max(10, h * .02);
      const area = this.area = { x0: Math.max(14, w * .04), x1: w - Math.max(14, w * .04), y0: top, y1: Math.max(top + 60, bottom) };
      // one cell per thing, as square as the space allows
      const n = R.items.length, aw = area.x1 - area.x0, ah = area.y1 - area.y0;
      let cols = 1, best = 0;   // the grid that gives the biggest cells
      for (let c = 1; c <= n; c++) { const m = Math.min(aw / c, ah / Math.ceil(n / c)); if (m > best + .5) { best = m; cols = c; } }
      const rows = Math.ceil(n / cols);
      const cw = aw / cols, ch = ah / rows;
      this.s = clamp(Math.min(cw, ch) * .78 / (size ? SIZE.big : 1), 34, 120);
      if (!R.cells || R.cells.cols !== cols || R.cells.rows !== rows) {
        const slots = shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, n);
        R.items.forEach((it, i) => { const sl = slots[i], cx = sl % cols, cy = Math.floor(sl / cols); it.u = (cx + .5 + (Math.random() - .5) * .25) / cols; it.v = (cy + .5 + (Math.random() - .5) * .25) / rows; it.rot = (Math.random() - .5) * .5; });
        R.cells = { cols, rows };
      }
      for (const it of R.items) { it.hx = area.x0 + it.u * aw; it.hy = area.y0 + it.v * ah; if (it.state === 'floor') { it.x = it.hx; it.y = it.hy; } }
      // the wall shows above the first row of things; the rug lies under all of them
      this.floorY = area.y0 + ah * .2;
      const rb = Math.min(by - 6, area.y1 + this.s * .45), rt = this.floorY + Math.min(18, ah * .05);
      this.rug = { x: w / 2, y: (rt + rb) / 2, rx: Math.min(w * .48, aw * .56), ry: Math.max((rb - rt) / 2, 30) };
      this.room = null;
    }
    start() { this.resize(); this.newRound(); this.resume(); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); if (this.drag) this.up(this.drag.it.x, this.drag.it.y, true); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }
    tier() { return SPG.level.tier('sort'); }
    sizeOf(it) { return this.s * (SIZE[it.size] || 1); }

    /* ---------------------------------------------------------------- rounds */
    newRound() {
      const tier = this.tier(), cb = SPG.vision && SPG.vision.colourBlind(), modes = cb ? MODES[tier].filter(m => m !== 'color') : MODES[tier];   // colour filters on: no sorting by colour
      const mode = modes.includes(api.next) ? api.next : modes[this.bag.mi % modes.length]; api.next = null;   // api.next: tests ask for a kind of sorting
      this.bag.mi++;
      const R = this.round = makeRound(tier, mode);
      R.bins.forEach(b => Object.assign(b, { items: [], open: 0, chomp: 0, shake: 0, hop: 0, glow: 0, blink: 0 }));
      R.items.forEach((it, i) => Object.assign(it, { id: i, state: 'floor', wrong: 0, in: -i * .07, wig: 0, glow: false, x: 0, y: 0 }));
      R.tier = tier; R.wrongSaid = false; R.hinted = false; R.done = 0;
      this.phase = 'in'; this.pt = 0; this.idle = 0; this.drag = null; this.sel = null;
      this.layout();
      voice.say(mode === 'size' && tier === 3 ? 'sort-size3' : 'sort-' + mode);
    }
    binOf(it) { return this.round.bins.find(b => b.key === it.key); }
    // the bin under a point: the basket and what stands above it (the bear, the sign), with a generous margin for small fingers
    binAt(x, y) {
      let best = null, bd = Infinity;
      for (const b of this.round.bins) {
        const m = this.bw * .12; if (x < b.x - b.w / 2 - m || x > b.x + b.w / 2 + m || y < b.y - b.deco - this.bh * .3 || y > b.y + b.h + 20) continue;
        const d = Math.abs(x - b.x); if (d < bd) { bd = d; best = b; }
      }
      return best;
    }
    down(id, x, y) {
      this.idle = 0; const R = this.round; if (!R || this.phase !== 'play') return;
      // the topmost thing under the finger (things drawn later are on top)
      let hit = null, hd = Infinity;
      for (const it of R.items) if (it.state === 'floor') {
        const r = Math.max(this.sizeOf(it) * .58, 30), d = Math.hypot(x - it.x, y - it.y);
        if (d < r && d <= hd + 1) { hit = it; hd = d; }
      }
      if (!hit) {
        // tap a thing, then tap a basket: the same as dragging, for fingers that find dragging hard
        const sel = this.sel; this.sel = null; if (!sel || (sel.state !== 'floor' && sel.state !== 'back')) return;
        const bin = this.binAt(x, y); if (!bin) return;
        sel.state = 'floor'; return bin.key === sel.key ? this.right(sel, bin) : this.wrong(sel, bin);
      }
      this.sel = null;
      R.items.splice(R.items.indexOf(hit), 1); R.items.push(hit);   // bring it to the front
      hit.state = 'held'; hit.wig = 0;
      this.drag = { id, it: hit, ox: hit.x - x, oy: hit.y - y, x0: x, y0: y, t0: this.t, moved: false };
      this.lift = 0; sfx.tap();
    }
    move(x, y) {
      const d = this.drag; this.idle = 0;
      if (Math.hypot(x - d.x0, y - d.y0) > 10) d.moved = true;
      // the thing rides a little above the finger so she can see it
      d.it.x = x + d.ox * .4; d.it.y = y + d.oy * .4 - this.sizeOf(d.it) * .35 * this.lift;
    }
    up(x, y, cancel) {
      const d = this.drag; this.drag = null; const it = d.it, R = this.round;
      for (const b of R.bins) b.open = Math.min(b.open, .3);
      if (cancel) return this.home(it, false);
      const bin = this.binAt(it.x, it.y + this.sizeOf(it) * .2) || this.binAt(x, y);
      if (!d.moved && this.t - d.t0 < .35 && !bin) { this.tapItem(it); this.sel = it; return this.home(it, false); }
      if (!bin) {   // let go on the floor: it stays there (kept inside the room)
        const a = this.area, s = this.sizeOf(it) * .5;
        it.x = clamp(it.x, a.x0 + s, a.x1 - s); it.y = clamp(it.y, a.y0 + s, a.y1 - s);
        it.u = (it.x - a.x0) / (a.x1 - a.x0); it.v = (it.y - a.y0) / (a.y1 - a.y0); it.hx = it.x; it.hy = it.y; it.state = 'floor';
        return;
      }
      if (bin.key === it.key) return this.right(it, bin);
      this.wrong(it, bin);
    }
    tapItem(it) {
      it.wig = 1; const R = this.round;
      if (R.mode === 'color') voice.say('color/' + it.col);
      else if (R.mode === 'shape') voice.say('shape/' + it.kind);
      else if (R.mode === 'size') voice.say('sort/' + it.size);
      else voice.say('sort/' + it.kind);
    }
    home(it, back) { it.state = 'back'; it.fx = it.x; it.fy = it.y; it.ft = 0; it.back = back; }
    right(it, bin) {
      const R = this.round;
      it.state = 'fly'; it.fx = it.x; it.fy = it.y; it.ft = 0; it.bin = bin; it.glow = false;
      bin.open = 1; R.done++;
      sfx.plink(R.done); this.idle = 0;
      if (R.mode === 'color' && R.tier < 3) voice.say('color/' + it.col);
      else if (R.mode === 'shape') voice.say('shape/' + it.kind);
      else if (R.mode === 'size') voice.say('sort/' + it.size);
      else if (R.mode === 'food') voice.say('sort/' + it.key);
    }
    wrong(it, bin) {
      const R = this.round;
      bin.shake = 1; it.wrong++; sfx.boing(); this.home(it, true);
      if (it.wrong >= 2) it.glow = true;
      if (!R.wrongSaid) { R.wrongSaid = true; voice.say('sort-try'); }
    }
    landed(it) {
      const R = this.round, b = it.bin;
      it.state = 'in'; b.items.push(it); b.chomp = 1; b.hop = 1; b.open = 0;
      this.fx.burst(b.x, b.y, 10, { colors: ['#ffd54a', '#fff', R.mode === 'color' ? COLORS[b.key] : '#ff9ec0'], speed: 200, g: 300, life: .7, size: 6 * this.ui, shape: 'star', up: 160 });
      sfx.pop();
      if (R.items.every(i => i.state === 'in')) this.finish();
    }
    finish() {
      const R = this.round; this.phase = 'done'; this.pt = 0;
      this.bag.rounds++; this.bag.sorted += R.items.length; this.counter.set(this.bag.rounds);
      setTimeout(() => { if (this.running && this.round === R) { sfx.cheer(); voice.say('sort-done'); } }, 350);
      this.fx.burst(this.w / 2, this.h * .35, 46, { colors: ['#ff6b81', '#ffd54a', '#7ed957', '#5cc8f2', '#b58cf0'], speed: 380, g: 420, life: 1.5, size: 7 * this.ui, shape: 'confetti', up: 240 });
      if (this.bag.rounds % 2 === 0) { store.addStars(1); setTimeout(() => this.running && sfx.win(), 1400); }
      store.save();
    }
    hint() {
      const R = this.round, left = R.items.filter(i => i.state === 'floor'); if (!left.length) return;
      const it = left.reduce((a, b) => (b.wrong > a.wrong ? b : a), pick(left));
      it.wig = 1.6; this.binOf(it).glow = 2.2;
      if (!R.hinted) { R.hinted = true; voice.say(R.mode === 'size' && R.tier === 3 ? 'sort-size3' : 'sort-' + R.mode); }
    }

    /* ---------------------------------------------------------------- time */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.pt += dt; this.idle += dt;
      this.update(dt); this.fx.update(dt);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }
    update(dt) {
      const R = this.round; if (!R) return;
      const held = this.drag && this.drag.it;
      if (held) { this.lift = Math.min(1, this.lift + dt * 6); }
      const over = held ? this.binAt(held.x, held.y + this.sizeOf(held) * .2) : null;
      for (const b of R.bins) {
        b.open += ((b === over ? 1 : 0) - b.open) * Math.min(1, dt * 10);
        b.chomp = Math.max(0, b.chomp - dt * 3); b.shake = Math.max(0, b.shake - dt * 1.8); b.hop = Math.max(0, b.hop - dt * 2.5); b.glow = Math.max(0, b.glow - dt);
        b.blink = b.blink > 0 ? b.blink - dt : Math.random() < dt * .25 ? .15 : 0;
      }
      for (const it of R.items) {
        it.in = Math.min(1, it.in + dt * 3); it.wig = Math.max(0, it.wig - dt);
        if (it.state === 'fly') {
          it.ft += dt; const u = ease(it.ft / .32), b = it.bin;
          it.x = it.fx + (b.x - it.fx) * u; it.y = it.fy + (b.y - it.fy) * u - Math.sin(u * Math.PI) * this.bh * .5;
          if (it.ft >= .32) this.landed(it);
        } else if (it.state === 'back') {
          it.ft += dt; const u = ease(it.ft / .4);
          it.x = it.fx + (it.hx - it.fx) * u; it.y = it.fy + (it.hy - it.fy) * u - Math.sin(u * Math.PI) * this.s * .3;
          if (it.ft >= .4) { it.state = 'floor'; it.x = it.hx; it.y = it.hy; }
        }
      }
      if (this.phase === 'in') { if (this.pt > .8) { this.phase = 'play'; this.pt = 0; this.idle = 0; } }
      else if (this.phase === 'play') { if (this.idle > 9 && !held) { this.idle = 0; this.hint(); } }
      else if (this.phase === 'done') { for (const b of R.bins) if (this.pt % .5 < dt) b.hop = 1; if (this.pt > 3) { this.phase = 'out'; this.pt = 0; } }
      else if (this.phase === 'out') { if (this.pt > .6) this.newRound(); }
    }

    /* ---------------------------------------------------------------- drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h, R = this.round; if (!w || !R) return;
      const night = !!(SPG.night && SPG.night.on()), key = `${R.mode}|${w}|${h}|${night}`;
      if (!this.room || this.room.key !== key) {
        const dpr = SPG.ui.dpr(), oc = document.createElement('canvas'); oc.width = Math.round(w * dpr); oc.height = Math.round(h * dpr);
        const o = oc.getContext('2d'); o.setTransform(dpr, 0, 0, dpr, 0, 0); drawRoom(o, w, h, R.mode, this.floorY, this.rug, night);
        this.room = { key, oc };
      }
      c.drawImage(this.room.oc, 0, 0, w, h);
      const out = this.phase === 'out' ? ease(this.pt / .6) : 0, inn = this.phase === 'in' ? 1 - ease(this.pt / .7) : 0;
      // things on the floor (with soft shadows)
      c.save(); if (out) c.globalAlpha = 1 - out;
      for (const it of R.items) if (it.state === 'floor' || it.state === 'back') this.drawThing(c, it);
      c.restore();
      // the baskets
      const slide = (out + inn) * (this.bh + (R.bins[0].deco || 0) + 40);
      for (const b of R.bins) this.drawBin(c, b, slide);
      // what is in the air: flying into a basket, then the one under her finger
      for (const it of R.items) if (it.state === 'fly') this.drawThing(c, it);
      if (this.drag) this.drawThing(c, this.drag.it);
      this.fx.draw(c);
    }
    drawThing(c, it) {
      let s = this.sizeOf(it); const held = this.drag && this.drag.it === it, t = this.t;
      const pop = ease(it.in); if (pop <= 0) return;
      if (it.state === 'fly') s *= 1 - ease(it.ft / .32) * .45;
      if (held) s *= 1 + .12 * this.lift;
      const chosen = this.sel === it; if (chosen) s *= 1.1 + Math.sin(t * 6) * .03;
      c.save();
      // shadow on the floor
      const lift = held ? this.sizeOf(it) * .3 * this.lift : it.state === 'fly' || it.state === 'back' ? this.s * .15 : 0;
      c.fillStyle = 'rgba(70,40,30,.18)'; ell(c, it.x, it.y + s * .42 + lift, s * .36 * pop, s * .09 * pop); c.fill();
      c.translate(it.x, it.y); c.scale(pop, pop);
      if (chosen) { c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = Math.max(3, s * .06); c.setLineDash([s * .12, s * .09]); c.lineDashOffset = -t * 30; ell(c, 0, 0, s * .6, s * .6); c.stroke(); c.setLineDash([]); }
      if (it.glow && it.state === 'floor') { c.fillStyle = `rgba(255,236,120,${.4 + Math.sin(t * 7) * .2})`; ell(c, 0, 0, s * .62, s * .62); c.fill(); }
      c.rotate((it.state === 'floor' ? it.rot * .4 : 0) + Math.sin(t * 22) * it.wig * .18);
      drawItem(c, it, s);
      c.restore();
    }
    drawBin(c, b, slide) {
      const R = this.round, w = b.w, h = b.h, t = this.t, col = binColors(R.mode, b.key);
      const hop = Math.sin(b.hop * Math.PI) * h * .12, sx = Math.sin(b.shake * 26) * b.shake * w * .05;
      c.save(); c.translate(b.x + sx, b.y + slide - hop);
      if (b.glow > 0 || (this.drag && this.drag.it.glow && this.drag.it.key === b.key)) {
        const a = .35 + Math.sin(t * 7) * .2; c.fillStyle = `rgba(255,236,120,${a})`; ell(c, 0, h * .3 - b.deco * .3, w * .66, h * .6 + b.deco * .5); c.fill();
      }
      // what stands above: a bear (big, middle, little) or a sign
      if (R.mode === 'size') {
        // the bear stands behind its basket with its head over the rim; the smaller ones stand a little higher so they can see out too
        const full = Math.min((b.deco + h * .3) * 1.5, w * 1.3), k = BEAR[b.key], bs = full * k;
        c.save(); c.translate(0, h * .35 - (1 - k) * full * .3); if (b.shake > 0) c.rotate(Math.sin(b.shake * 20) * .05);
        P.draw(c, 'bear', bs, t + b.x, { mood: b.shake > 0 ? 'sad' : b.chomp > 0 || this.phase === 'done' ? 'cheer' : b.open > .3 ? 'wow' : 'happy' });
        c.restore();
      } else if (R.mode !== 'color') { c.save(); c.translate(0, -b.deco * .52); sign(c, R.mode, b.key, Math.min(b.deco * .44, w * .26, h * .7), t); c.restore(); }
      // inside the basket, then what she has put in (peeking over the rim), then the front with its face
      binBack(c, b, w, h, col);
      const n = b.items.length, ps = Math.min(this.s * .62, w * .3);
      b.items.forEach((it, i) => { c.save(); const k = n > 1 ? i / (n - 1) - .5 : 0; c.translate(k * w * .55, -h * .05 - (i % 2) * h * .08); c.rotate(k * .5); drawItem(c, it, ps * (it.size === 'big' ? 1.1 : it.size === 'small' ? .75 : .92)); c.restore(); });
      binFront(c, b, w, h, col, R.mode, t);
      c.restore();
    }
    probe() {
      const R = this.round;
      return { sel: this.sel ? this.sel.id : null, phase: this.phase, mode: R && R.mode, tier: R && R.tier, rounds: this.bag.rounds, sorted: this.bag.sorted, w: this.w, h: this.h, s: this.s, area: this.area,
        bins: R ? R.bins.map(b => ({ key: b.key, x: b.x, y: b.y + b.h * .4, top: b.y - b.deco, w: b.w, n: b.items.length, glow: b.glow > 0 })) : [],
        items: R ? R.items.map(it => ({ id: it.id, key: it.key, kind: it.kind, col: it.col, size: it.size, x: it.x, y: it.y, r: this.sizeOf(it) / 2, state: it.state, glow: it.glow })) : [] };
    }
  }

  Object.assign(api, { makeRound, MODES, COUNT, probe: () => { const r = SPG.app.running(); return r && r.inst instanceof SortGame ? r.inst.probe() : null; } });
  SPG.sortGame = api;
  SPG.games.push({
    id: 'sort', name: 'Tidy Time', order: 17, fresh: true,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff6e0'); g.addColorStop(1, '#ffe2b8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const m = Math.min(w, h);
      c.fillStyle = '#e9b77c'; c.fillRect(0, h * .56, w, h * .44);
      [['red', .27], ['blue', .73]].forEach(([k, x]) => { c.save(); c.translate(w * x, h * .6); binBack(c, null, m * .42, m * .28, binColors('color', k)); binFront(c, { open: x < .5 ? .9 : 0, chomp: 0, blink: 0, shake: 0 }, m * .42, m * .28, binColors('color', k), 'color', 0); c.restore(); });
      // a ball on its way into the red basket, and things still on the floor
      c.strokeStyle = 'rgba(90,63,94,.35)'; c.lineWidth = m * .018; c.lineCap = 'round'; for (const d of [0, .06]) { c.beginPath(); c.arc(w * .5, h * .5, m * (.2 + d), Math.PI * 1.15, Math.PI * 1.4); c.stroke(); }
      [['ball', 'red', .3, .36, .26], ['car', 'blue', .72, .3, .27], ['star', 'blue', .56, .1, .2], ['block', 'red', .14, .12, .2]].forEach(([k, col, x, y, s]) => { c.save(); c.translate(w * x, h * y); TOY[k](c, m * s, COLORS[col]); c.restore(); });
    },
    create: host => new SortGame(host)
  });
})();
