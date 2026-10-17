// People: cute human kids (girls and boys of every skin tone) drawn from a "look": skin, eyes, hair, makeup, and
// (in people-wear.js) clothes, shoes, accessories and nail polish. Used by the Style Studio.
// Everything is drawn in units where the whole child is 100 tall, standing on y = 0, centered on x = 0.
(() => {
  const SPG = window.SPG, art = SPG.art;
  const TAU = Math.PI * 2;
  const P = SPG.people = { wear: {} };

  P.SKIN = ['#fde3cf', '#f8d3b0', '#eebf94', '#d9a373', '#bd8358', '#93603d', '#6e422a', '#4b2b1c'];
  P.EYES = ['#6b4423', '#3b2a1e', '#4a90e2', '#4caf7d', '#a67c2f', '#7d8794', '#9a6bd6'];
  P.HAIRC = ['#2b2230', '#4a2f24', '#7a4b2f', '#a0522d', '#c8442a', '#e58a3a', '#f2cf6b', '#f7edc9', '#b9b9c6', '#ff8fc0', '#5aa8f0', '#a77be0', '#4fd0b8', 'rainbow'];
  P.CLOTH = ['#ff8fc0', '#ff4f9a', '#ef4a4a', '#ff9a3d', '#ffd54a', '#7ed9a0', '#3fb56b', '#3cc5c0', '#7fc8f8', '#4f8fe8', '#8a6ad9', '#c9a8f0', '#ffffff', '#3a3a4a', '#e8c86a', '#c8ccd8'];
  P.NAIL = ['#ff8fc0', '#ff4f9a', '#ef4a4a', '#ff9a3d', '#ffd54a', '#7ed9a0', '#3cc5c0', '#7fc8f8', '#4f8fe8', '#8a6ad9', '#f2e6ff', '#ffffff', '#3a3a4a', '#e8c86a', '#c8ccd8', '#b83a3a'];
  P.LIPS = [null, '#ff8fa8', '#ef4a6a', '#d6336c', '#ff9a7a', '#c94a4a', '#b9407a', '#8a2a4a', 'rainbow'];
  P.SHADOW = [null, '#f5b3d1', '#c9a8f0', '#8fcaf5', '#9fe0b8', '#ffd27a', '#ff9fa0', '#b6a08a'];
  P.BLUSH = [null, '#ff9fb0', '#ff7a90', '#ffb38a'];
  P.GEMS = ['none', 'stars', 'hearts', 'dots', 'flowers'];
  P.HAIR = ['long', 'wavy', 'ponytail', 'pigtails', 'buns', 'braid', 'bob', 'short', 'spiky', 'curly', 'topknot', 'pixie', 'afro', 'halfup', 'twinbraids', 'mohawk', 'bowl', 'longcurly', 'sidepony', 'locs', 'crownbraid', 'none'];
  const shade = (col, amt) => {
    let r, g, b; const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(col);
    if (m) { r = +m[1]; g = +m[2]; b = +m[3]; } else { const n = parseInt(col.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
    const f = v => Math.round(Math.max(0, Math.min(255, amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  };

  // hair fills with a little shading (or a rainbow)
  function hairFill(c, col, R) {
    if (col === 'rainbow') { const g = c.createLinearGradient(-R * 1.2, -R, R * 1.2, R * 2); ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0'].forEach((k, i, a) => g.addColorStop(i / (a.length - 1), k)); return g; }
    const g = c.createLinearGradient(0, -R * 1.2, 0, R * 2); g.addColorStop(0, shade(col, .2)); g.addColorStop(.45, col); g.addColorStop(1, shade(col, -.14)); return g;
  }
  // the top of the head: a cap of hair with a fringe of the given kind
  function cap(c, R, fringe) {
    c.beginPath(); c.moveTo(-R * 1.05, R * .2);
    c.bezierCurveTo(-R * 1.28, -R * .5, -R * .9, -R * 1.32, 0, -R * 1.3);
    c.bezierCurveTo(R * .9, -R * 1.32, R * 1.28, -R * .5, R * 1.05, R * .2);
    if (fringe === 'bangs') { c.lineTo(R * .98, -R * .18); for (let i = 0; i < 6; i++) { const x1 = R * .98 - (i + .5) * R * 1.96 / 6, x2 = R * .98 - (i + 1) * R * 1.96 / 6; c.quadraticCurveTo(x1, R * (i % 2 ? -.02 : -.12), x2, -R * .3); } c.lineTo(-R * .98, R * .2); }
    else if (fringe === 'side') { c.lineTo(R * .95, -R * .05); c.quadraticCurveTo(R * .45, -R * .7, -R * .3, -R * .44); c.quadraticCurveTo(-R * .75, -R * .2, -R * .98, R * .2); }
    else if (fringe === 'part') { c.lineTo(R * .95, -R * .02); c.quadraticCurveTo(R * .55, -R * .62, 0, -R * .64); c.quadraticCurveTo(-R * .55, -R * .62, -R * .95, -R * .02); c.lineTo(-R * 1.0, R * .2); }
    else { c.lineTo(R * .9, -R * .3); c.quadraticCurveTo(0, -R * .5, -R * .9, -R * .3); }
    c.closePath();
  }
  const lock = (c, x, w, y0, y1, bow) => { c.beginPath(); c.moveTo(x - w, y0); c.quadraticCurveTo(x - w * 1.5 + (bow || 0), (y0 + y1) / 2, x - w * .3, y1); c.quadraticCurveTo(x + w * 1.2 + (bow || 0), (y0 + y1) / 2, x + w, y0); c.closePath(); c.fill(); };
  const blob = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  function shine(c, R, y = -R * .82) { c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-R * .35, y, R * .55, R * .13, -.2, 0, TAU); c.fill(); }

  // Each style has a "back" (drawn behind the body) and a "front" (on top of the head). (0, 0) is the head's center, R its radius.
  const STYLES = {
    none: { back() {}, front() {} },
    long: {
      back(c, R, f) { c.fillStyle = f; c.beginPath(); c.moveTo(-R * 1.15, -R * .2); c.bezierCurveTo(-R * 1.55, R * 1.0, -R * 1.35, R * 2.4, -R * .75, R * 2.6); c.lineTo(R * .75, R * 2.6); c.bezierCurveTo(R * 1.35, R * 2.4, R * 1.55, R * 1.0, R * 1.15, -R * .2); c.closePath(); c.fill(); },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'part'); c.fill(); for (const sd of [-1, 1]) lock(c, sd * R * .98, R * .16, -R * .05, R * 1.2, sd * R * .05); shine(c, R); }
    },
    wavy: {
      back(c, R, f) { c.fillStyle = f; c.beginPath(); c.moveTo(-R * 1.15, -R * .2); c.bezierCurveTo(-R * 1.6, R * .8, -R * 1.2, R * 1.6, -R * 1.5, R * 2.2); for (let i = 0; i <= 6; i++) c.quadraticCurveTo(-R * 1.3 + i * R * .45, R * 2.9 + (i % 2 ? -R * .3 : R * .1), -R * 1.1 + (i + .5) * R * .4, R * 2.6); c.bezierCurveTo(R * 1.2, R * 1.6, R * 1.6, R * .8, R * 1.15, -R * .2); c.closePath(); c.fill(); },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'side'); c.fill(); for (const sd of [-1, 1]) { lock(c, sd * R * 1.0, R * .18, -R * .05, R * 1.5, sd * R * .12); blob(c, sd * R * 1.05, R * 1.5, R * .2); } shine(c, R); }
    },
    ponytail: {
      back(c, R, f) { c.fillStyle = f; c.beginPath(); c.moveTo(R * .5, -R * 1.15); c.bezierCurveTo(R * 2.1, -R * 1.3, R * 2.0, R * .9, R * 1.5, R * 1.8); c.bezierCurveTo(R * 1.3, R * 1.1, R * 1.1, R * .3, R * .4, -R * .6); c.closePath(); c.fill(); },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'side'); c.fill(); shine(c, R); c.fillStyle = '#ff6fae'; blob(c, R * .5, -R * .98, R * .16); }
    },
    pigtails: {
      back(c, R, f) { c.fillStyle = f; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * R * .95, -R * .1); c.bezierCurveTo(sd * R * 1.9, R * .1, sd * R * 1.9, R * 1.6, sd * R * 1.35, R * 2.0); c.bezierCurveTo(sd * R * 1.2, R * 1.2, sd * R * 1.0, R * .8, sd * R * .8, R * .5); c.closePath(); c.fill(); } },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'bangs'); c.fill(); shine(c, R); for (const sd of [-1, 1]) { c.fillStyle = '#ff6fae'; blob(c, sd * R * 1.05, R * .05, R * .17); } }
    },
    buns: {
      back(c, R, f) { c.fillStyle = f; for (const sd of [-1, 1]) blob(c, sd * R * .82, -R * 1.2, R * .5); },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'bangs'); c.fill(); shine(c, R); c.fillStyle = 'rgba(255,255,255,.22)'; for (const sd of [-1, 1]) blob(c, sd * R * .7, -R * 1.32, R * .14); }
    },
    braid: {
      back(c, R, f) { c.fillStyle = f; c.beginPath(); c.moveTo(-R * 1.05, -R * .1); c.bezierCurveTo(-R * 1.4, R * .8, -R * 1.2, R * 1.3, -R * .9, R * 1.5); c.lineTo(R * .9, R * 1.5); c.bezierCurveTo(R * 1.2, R * 1.3, R * 1.4, R * .8, R * 1.05, -R * .1); c.closePath(); c.fill(); },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'side'); c.fill(); shine(c, R);
        for (let i = 0; i < 6; i++) { c.fillStyle = f; c.beginPath(); c.ellipse(R * 1.05 + Math.sin(i) * R * .05, R * (.5 + i * .45), R * .26, R * .3, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = R * .05; c.stroke(); }
        c.fillStyle = '#ff6fae'; blob(c, R * 1.05, R * 3.15, R * .15); }
    },
    bob: {
      back(c, R, f) { c.fillStyle = f; c.beginPath(); c.moveTo(-R * 1.1, -R * .2); c.bezierCurveTo(-R * 1.5, R * .5, -R * 1.35, R * 1.1, -R * .95, R * 1.15); c.lineTo(R * .95, R * 1.15); c.bezierCurveTo(R * 1.35, R * 1.1, R * 1.5, R * .5, R * 1.1, -R * .2); c.closePath(); c.fill(); },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'bangs'); c.fill(); for (const sd of [-1, 1]) lock(c, sd * R * .98, R * .17, -R * .05, R * .95, sd * R * .02); shine(c, R); }
    },
    short: { back() {}, front(c, R, f) { c.fillStyle = f; cap(c, R, 'side'); c.fill(); c.beginPath(); c.arc(-R * .95, R * .12, R * .2, 0, TAU); c.arc(R * .95, R * .12, R * .2, 0, TAU); c.fill(); shine(c, R, -R * .9); } },
    spiky: {
      back() {},
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'side'); c.fill(); for (let i = 0; i < 7; i++) { const a = Math.PI * (1.08 + i * .14), x = Math.cos(a) * R * 1.12, y = Math.sin(a) * R * 1.12; c.beginPath(); c.moveTo(Math.cos(a - .16) * R * 1.05, Math.sin(a - .16) * R * 1.05); c.lineTo(Math.cos(a) * R * 1.62, Math.sin(a) * R * 1.62); c.lineTo(Math.cos(a + .16) * R * 1.05, Math.sin(a + .16) * R * 1.05); c.closePath(); c.fill(); void x; void y; } shine(c, R, -R * .9); }
    },
    curly: {
      back(c, R, f) { c.fillStyle = f; for (let i = 0; i < 11; i++) { const a = Math.PI * (.95 + i * .11); blob(c, Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.15 + R * .1, R * .52); } blob(c, 0, -R * 1.0, R * .8); },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'curl'); c.fill(); for (let i = 0; i < 6; i++) blob(c, -R * .85 + i * R * .34, -R * .38 - (i % 2) * R * .08, R * .2); shine(c, R, -R * .95); }
    },
    topknot: {
      back(c, R, f) { c.fillStyle = f; blob(c, 0, -R * 1.5, R * .5); },
      front(c, R, f) { c.fillStyle = f; cap(c, R, 'part'); c.fill(); shine(c, R); c.fillStyle = '#ff6fae'; c.beginPath(); c.ellipse(0, -R * 1.22, R * .38, R * .1, 0, 0, TAU); c.fill(); }
    }
  };
  const rrp = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fill(); };

  // More hairstyles
  const chain = (c, x, y0, n, step, r, f, tie) => { for (let i = 0; i < n; i++) { c.fillStyle = f; c.beginPath(); c.ellipse(x + Math.sin(i * 1.3) * r * .12, y0 + i * step, r, step * .68, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = r * .18; c.stroke(); } c.fillStyle = tie; blob(c, x, y0 + n * step, r * .55); };
  STYLES.pixie = { back() {}, front(c, R, f) { c.fillStyle = f; cap(c, R, 'side'); c.fill(); c.beginPath(); c.moveTo(-R * .95, -R * .05); c.quadraticCurveTo(-R * .1, -R * 1.0, R * 1.0, -R * .12); c.quadraticCurveTo(R * .5, -R * .42, R * .1, -R * .36); c.quadraticCurveTo(-R * .45, -R * .3, -R * .95, -R * .05); c.fill(); for (const sd of [-1, 1]) lock(c, sd * R * .98, R * .12, -R * .05, R * .42, 0); shine(c, R, -R * .9); } };
  STYLES.afro = { back(c, R, f) { c.fillStyle = f; blob(c, 0, -R * .3, R * 1.62); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; blob(c, Math.cos(a) * R * 1.4, -R * .3 + Math.sin(a) * R * 1.4, R * .34); } }, front(c, R, f) { c.fillStyle = f; cap(c, R, 'part'); c.fill(); shine(c, R, -R * 1.0); } };
  STYLES.halfup = { back: STYLES.long.back, front(c, R, f) { STYLES.long.front(c, R, f); c.fillStyle = f; blob(c, 0, -R * 1.42, R * .42); c.fillStyle = '#ff6fae'; c.beginPath(); c.ellipse(0, -R * 1.14, R * .3, R * .08, 0, 0, TAU); c.fill(); } };
  STYLES.twinbraids = { back(c, R, f) { c.fillStyle = f; c.beginPath(); c.moveTo(-R * 1.05, -R * .1); c.bezierCurveTo(-R * 1.3, R * .6, -R * 1.1, R * 1.0, -R * .9, R * 1.1); c.lineTo(R * .9, R * 1.1); c.bezierCurveTo(R * 1.1, R * 1.0, R * 1.3, R * .6, R * 1.05, -R * .1); c.closePath(); c.fill(); }, front(c, R, f) { c.fillStyle = f; cap(c, R, 'part'); c.fill(); shine(c, R); for (const sd of [-1, 1]) chain(c, sd * R * 1.02, R * .55, 6, R * .42, R * .26, f, '#5aa8f0'); } };
  STYLES.mohawk = { back() {}, front(c, R, f) { c.globalAlpha = .28; c.fillStyle = f; cap(c, R, 'part'); c.fill(); c.globalAlpha = 1; c.fillStyle = f; for (let i = 0; i < 7; i++) { const a = Math.PI * (1.28 + i * .073), r0 = R * 1.0; c.beginPath(); c.moveTo(Math.cos(a - .1) * r0, Math.sin(a - .1) * r0); c.lineTo(Math.cos(a) * R * (1.7 + (i === 3 ? .3 : (i % 2) * .1)), Math.sin(a) * R * (1.7 + (i === 3 ? .3 : (i % 2) * .1))); c.lineTo(Math.cos(a + .1) * r0, Math.sin(a + .1) * r0); c.closePath(); c.fill(); } c.beginPath(); c.ellipse(0, -R * .95, R * .3, R * .2, 0, 0, TAU); c.fill(); } };
  STYLES.bowl = { back() {}, front(c, R, f) { c.fillStyle = f; c.beginPath(); c.moveTo(-R * 1.12, R * .38); c.bezierCurveTo(-R * 1.4, -R * .6, -R * .9, -R * 1.4, 0, -R * 1.36); c.bezierCurveTo(R * .9, -R * 1.4, R * 1.4, -R * .6, R * 1.12, R * .38); c.lineTo(R * .97, R * .1); c.lineTo(R * .97, -R * .16); c.lineTo(-R * .97, -R * .16); c.lineTo(-R * .97, R * .1); c.closePath(); c.fill(); shine(c, R, -R * .9); } };
  STYLES.longcurly = { back(c, R, f) { c.fillStyle = f; for (let row = 0; row < 6; row++) for (const sd of [-1, 1]) { blob(c, sd * (R * 1.12 + Math.sin(row) * R * .1), R * (.1 + row * .42), R * .5); } c.beginPath(); c.moveTo(-R * 1.1, 0); c.lineTo(-R * 1.0, R * 2.2); c.lineTo(R * 1.0, R * 2.2); c.lineTo(R * 1.1, 0); c.closePath(); c.fill(); for (let i = 0; i < 5; i++) blob(c, -R * .8 + i * R * .4, R * 2.25, R * .3); blob(c, 0, -R * .9, R * .95); }, front(c, R, f) { c.fillStyle = f; cap(c, R, 'curl'); c.fill(); for (let i = 0; i < 7; i++) blob(c, -R * .95 + i * R * .32, -R * .4 - (i % 2) * R * .08, R * .2); shine(c, R, -R * .98); } };
  STYLES.sidepony = { back(c, R, f) { c.fillStyle = f; c.beginPath(); c.moveTo(R * .9, R * .0); c.bezierCurveTo(R * 2.0, R * .2, R * 2.1, R * 1.5, R * 1.6, R * 2.3); c.bezierCurveTo(R * 1.35, R * 1.5, R * 1.2, R * .8, R * .8, R * .5); c.closePath(); c.fill(); }, front(c, R, f) { c.fillStyle = f; cap(c, R, 'side'); c.fill(); shine(c, R); c.fillStyle = '#ffb84d'; blob(c, R * 1.0, R * .12, R * .2); } };
  STYLES.locs = { back(c, R, f) { c.fillStyle = f; for (let i = -5; i <= 5; i++) { const x = i * R * .2, len = R * (2.0 + Math.abs(Math.sin(i * 2.1)) * .6) - Math.abs(i) * R * .05; rrp(c, x - R * .09, -R * .1, R * .18, len, R * .09); } c.beginPath(); c.ellipse(0, -R * .2, R * 1.18, R * 1.1, 0, Math.PI, TAU); c.fill(); }, front(c, R, f) { c.fillStyle = f; cap(c, R, 'part'); c.fill(); for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) rrp(c, sd * (R * .95 + i * R * .16) - R * .08, -R * .05, R * .16, R * (1.5 + i * .5), R * .08); shine(c, R); c.fillStyle = '#ffd54a'; for (const sd of [-1, 1]) blob(c, sd * R * 1.03, R * 1.4, R * .1); } };
  STYLES.crownbraid = { back: STYLES.long.back, front(c, R, f) { c.fillStyle = f; cap(c, R, 'part'); c.fill(); for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + i * .105); c.fillStyle = f; c.beginPath(); c.ellipse(Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02 - R * .02, R * .22, R * .16, a + Math.PI / 2, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = R * .05; c.stroke(); } for (const sd of [-1, 1]) lock(c, sd * R * .98, R * .16, -R * .05, R * 1.3, sd * R * .05); shine(c, R); } };
  P.STYLES = STYLES;
  // hair that was cut and styled in the salon (js/hair.js) is kept as strands: look.hair = 'cut:<id>', its strands are in P.cuts[id]
  P.cuts = {};
  const cutStyle = id => ({
    back(c, R, f, col) { const h = P.cuts[id]; if (h) SPG.hair.draw(c, R, h, col, { layer: 'back' }); },
    front(c, R, f, col) { const h = P.cuts[id]; if (h) SPG.hair.draw(c, R, h, col, { layer: 'front' }); }
  });
  const styleOf = k => typeof k === 'string' && k.startsWith('cut:') ? cutStyle(k.slice(4)) : (STYLES[k] || STYLES.none);

  // The child. look: { skin, eyes, hair, hairCol, lashes, lips, shadow, blush, freckles, gems, ... } (see people-wear.js for the rest)
  const HEAD = { x: 0, y: -73, R: 21 };
  P.HEAD = HEAD;

  function face(c, look, R, t, blink) {
    const skin = P.SKIN[look.skin % P.SKIN.length], dark = shade(skin, -.12);
    // ears
    c.fillStyle = skin; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * R * .97, R * .1, R * .17, 0, TAU); c.fill(); }
    // head
    const g = c.createRadialGradient(-R * .2, -R * .3, R * .2, 0, 0, R * 1.1); g.addColorStop(0, shade(skin, .08)); g.addColorStop(1, skin);
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, R * .97, R, 0, 0, TAU); c.fill();
    // blush (a little always, more with makeup)
    const bl = P.BLUSH[look.blush || 0];
    c.fillStyle = bl || 'rgba(255,120,130,.22)'; c.globalAlpha = bl ? .5 : 1; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * R * .54, R * .36, R * .21, R * .13, 0, 0, TAU); c.fill(); } c.globalAlpha = 1;
    if (look.freckles) { c.fillStyle = shade(skin, -.28); for (const sd of [-1, 1]) for (const [x, y] of [[.42, .22], [.56, .18], [.48, .32], [.66, .28], [.36, .36]]) blob(c, sd * R * x, R * y, R * .03); }
    // eyes
    const eye = P.EYES[look.eyes % P.EYES.length], girlish = look.lashes !== false && look.gender !== 'boy' || look.lashes === true;
    for (const sd of [-1, 1]) {
      const ex = sd * R * .36, ey = R * .02;
      const sh = P.SHADOW[look.shadow || 0]; if (sh) { c.fillStyle = sh; c.globalAlpha = .8; c.beginPath(); c.ellipse(ex, ey - R * .07, R * .24, R * .18, 0, Math.PI, TAU); c.fill(); c.globalAlpha = 1; }
      if (blink) { c.strokeStyle = '#3a2a30'; c.lineWidth = R * .07; c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey - R * .02, R * .16, .2, Math.PI - .2); c.stroke(); }
      else {
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, R * .17, R * .21, 0, 0, TAU); c.fill();
        c.fillStyle = eye; c.beginPath(); c.ellipse(ex + sd * R * -.01, ey + R * .02, R * .13, R * .16, 0, 0, TAU); c.fill();
        c.fillStyle = '#20141a'; c.beginPath(); c.ellipse(ex, ey + R * .02, R * .07, R * .09, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; blob(c, ex - R * .05, ey - R * .05, R * .045); blob(c, ex + R * .05, ey + R * .09, R * .022);
        c.strokeStyle = '#3a2a30'; c.lineWidth = R * .045; c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey, R * .18, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
        if (girlish) { c.lineWidth = R * .04; for (const [a, l] of [[1.2, .1], [1.45, .12], [1.7, .1]]) { const ang = Math.PI * a; c.beginPath(); c.moveTo(ex + Math.cos(ang) * R * .18 * (sd < 0 ? 1 : 1), ey + Math.sin(ang) * R * .2); c.lineTo(ex + Math.cos(ang) * R * (.18 + l) + sd * R * .03, ey + Math.sin(ang) * R * (.2 + l)); c.stroke(); } }
      }
      // brows
      c.strokeStyle = shade(P.HAIRC[look.hairCol] === 'rainbow' ? '#6a4a3a' : P.HAIRC[look.hairCol] || '#4a2f24', -.05); c.lineWidth = R * .06; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - R * .15, ey - R * .32); c.quadraticCurveTo(ex, ey - R * .4, ex + R * .15, ey - R * .3); c.stroke();
    }
    // nose and mouth
    c.strokeStyle = dark; c.lineWidth = R * .045; c.lineCap = 'round'; c.beginPath(); c.moveTo(-R * .06, R * .3); c.quadraticCurveTo(0, R * .36, R * .06, R * .3); c.stroke();
    const lp = P.LIPS[look.lips || 0];
    if (lp) { if (lp === 'rainbow') { const g = c.createLinearGradient(-R * .22, 0, R * .22, 0); ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0'].forEach((k, i, a) => g.addColorStop(i / (a.length - 1), k)); c.fillStyle = g; } else c.fillStyle = lp; c.beginPath(); c.moveTo(-R * .22, R * .53); c.quadraticCurveTo(-R * .1, R * .45, 0, R * .5); c.quadraticCurveTo(R * .1, R * .45, R * .22, R * .53); c.quadraticCurveTo(0, R * .8, -R * .22, R * .53); c.fill(); }
    else { c.strokeStyle = '#b5524f'; c.lineWidth = R * .06; c.beginPath(); c.arc(0, R * .42, R * .2, .25, Math.PI - .25); c.stroke(); }
    // face gems (little stickers on the cheek and forehead)
    const gm = P.GEMS[look.gems || 0];
    if (gm && gm !== 'none') for (const [x, y, k] of [[.62, .3, 0], [-.62, .3, 1], [.0, -.5, 2]]) {
      c.save(); c.translate(x * R, y * R); const gc = ['#7fd4f5', '#ff6fae', '#ffd54a'][k];
      if (gm === 'stars') art.star(c, 0, 0, R * .12, gc, k); else if (gm === 'hearts') art.heart(c, 0, 0, R * .13, gc);
      else if (gm === 'dots') { c.fillStyle = gc; blob(c, 0, 0, R * .06); } else { c.fillStyle = '#fff'; for (let a = 0; a < 5; a++) blob(c, Math.cos(a * TAU / 5) * R * .06, Math.sin(a * TAU / 5) * R * .06, R * .04); c.fillStyle = gc; blob(c, 0, 0, R * .04); }
      c.restore();
    }
  }

  // Draw the whole child. s = their height in pixels, t = time (for blinking, swaying), o: { wave, pose, twirl }
  // The outline of a body or a top: sloping shoulders that reach the arms, a gentle waist, and a slightly curved hem.
  P.torsoPath = (c, hemY = -32, hw = 10.4) => {
    c.beginPath(); c.moveTo(-12.6, -47.4); c.quadraticCurveTo(-10.4, -51.6, -4.6, -51.8); c.lineTo(4.6, -51.8); c.quadraticCurveTo(10.4, -51.6, 12.6, -47.4);
    c.bezierCurveTo(11.6, -43, hw - .8, -38.5, hw, hemY); c.quadraticCurveTo(0, hemY + 1.8, -hw, hemY); c.bezierCurveTo(-hw + .8, -38.5, -11.6, -43, -12.6, -47.4); c.closePath();
  };
  P.draw = function draw(c, look, s, t = 0, o = {}) {
    const U = s / 100, R = HEAD.R, skin = P.SKIN[look.skin % P.SKIN.length], skinD = shade(skin, -.1);
    const sway = Math.sin(t * 1.3) * .4, breathe = Math.sin(t * 2) * .35, blink = (t % 4.6) < .12;
    c.save(); c.scale(U, U); c.lineJoin = c.lineCap = 'round';
    c.fillStyle = 'rgba(90,63,94,.14)'; c.beginPath(); c.ellipse(0, 1, 20, 3, 0, 0, TAU); c.fill();   // shadow
    const W = P.wear;
    const hairCol = P.HAIRC[look.hairCol % P.HAIRC.length], style = styleOf(look.hair);
    W.back && W.back(c, look, t);
    // hair behind the body
    const hsw = (o.sway || 0) + Math.sin(t * 1.7) * .012;
    c.save(); c.translate(HEAD.x + sway * .3, HEAD.y + breathe * .2); c.translate(0, -R); c.transform(1, 0, hsw * 2.2, 1, 0, 0); c.translate(0, R); style.back(c, R, hairFill(c, hairCol, R), hairCol); c.restore();
    // legs
    c.fillStyle = skin; for (const sd of [-1, 1]) { rr(c, sd * 5.5 - 3.8, -34, 7.6, 31.5, 3.4); c.fill(); }
    W.bottoms && W.bottoms(c, look, t);
    W.shoes && W.shoes(c, look, t);
    // arms (skin), then the body and clothes (then sleeves over the shoulders), then the hands
    const spread = W.armSpread ? W.armSpread(look) : .22;
    const armT = (sd, wave, fn) => { c.save(); c.translate(sd * 11.8, -47.6 + breathe * .2); c.rotate(sd * ((wave ? -2.3 - Math.sin(t * 9) * .3 : 0) - spread)); fn(); c.restore(); };
    const armSkin = (sd, wave) => armT(sd, wave, () => { c.fillStyle = skin; c.beginPath(); c.moveTo(-3.3, 0); c.lineTo(-2.7, 19.4); c.quadraticCurveTo(0, 22.6, 2.7, 19.4); c.lineTo(3.3, 0); c.closePath(); c.fill(); });
    const armSleeve = (sd, wave) => armT(sd, wave, () => { W.sleeve && W.sleeve(c, look, sd); });
    armSkin(-1, false); armSkin(1, o.wave);
    // torso: shoulders, a little waist, hips
    c.fillStyle = skin; P.torsoPath(c, -32, 10.2); c.fill();
    W.tops && W.tops(c, look, t);
    armSleeve(-1, false); armSleeve(1, o.wave);
    W.dress && W.dress(c, look, t);
    if (look.dress && W.shoes) W.shoes(c, look, t);   // the shoes peek out in front of the hem
    // hands with polish on the fingertips
    const hand = (sd, wave) => { c.save(); c.translate(sd * 11.8, -47.6 + breathe * .2); c.rotate(sd * ((wave ? -2.3 - Math.sin(t * 9) * .3 : 0) - spread)); c.translate(0, 20.2); if (W.miniHand) W.miniHand(c, look, skin, sd, t); else { c.fillStyle = skin; c.beginPath(); c.arc(0, 1, 3.5, 0, TAU); c.fill(); } if (W.handItem && sd > 0) W.handItem(c, look, t); c.restore(); };
    // neck and head
    c.fillStyle = skinD; rr(c, -4.2, -55, 8.4, 7, 2); c.fill();
    W.neck && W.neck(c, look, t);
    c.save(); c.translate(HEAD.x + sway * .3, HEAD.y + breathe * .2); c.rotate(Math.sin(t * .9) * .02);
    face(c, look, R, t, blink);
    W.faceAcc && W.faceAcc(c, look, R, t);
    c.save(); c.translate(0, -R); c.transform(1, 0, hsw * .5, 1, 0, 0); c.translate(0, R); style.front(c, R, hairFill(c, hairCol, R), hairCol); c.restore();
    W.hat && W.hat(c, look, R, t);
    c.restore();
    hand(-1, false); hand(1, o.wave);   // hands (and their polish) are drawn last, in front of every hairstyle and hat
    c.restore();
  };
  const rr = art.rr;

  P.defaultLook = function defaultLook(gender) {
    return { gender, skin: 2, eyes: 0, hair: gender === 'boy' ? 'short' : 'long', hairCol: 2, lashes: gender !== 'boy', lips: 0, shadow: 0, blush: 0, freckles: false, gems: 0,
      dress: null, dressCol: 0, dressArt: 0, top: gender === 'boy' ? 'tee' : 'tee', topCol: gender === 'boy' ? 9 : 0, bottom: gender === 'boy' ? 'jeans' : 'skirt', bottomCol: gender === 'boy' ? 9 : 11,
      shoes: 'sneakers', shoesCol: 12, hat: null, hatCol: 4, face: null, neck: null, backItem: null, backCol: 0, hand: null, nails: new Array(10).fill(-1), nailArt: new Array(10).fill(0), nailGlitter: new Array(10).fill(false) };
  };
})();
