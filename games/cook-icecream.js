// Sprout Kitchen: Homemade ice cream, made the real way (ice cream in a bag). Measure cream, sugar and drops of vanilla into a little
// zip bag, pick a flavour, close the zipper, fill a big bag with ice and salt, put the little bag inside, close that too, then shake and
// shake until the cream freezes into ice cream. Open the little bag, scoop it into a cone or a cup, add toppings and eat it.
// Every part of a step is its own small activity with its own animation and sound; nothing can go wrong, and help comes by itself
// when she stops. Uses SPG.cookKit (step handlers, recipes) and SPG.cookArt (drawing helpers, foods).
(() => {
  const SPG = window.SPG, KIT = SPG && SPG.cookKit, CA = SPG && SPG.cookArt;
  if (!KIT || !CA || !KIT.RECIPES) return;
  const { H } = KIT, { sfx, voice, art } = SPG;
  const { clamp, lerp, ease, rr, rnd, shade, circ, ell, box, tri, shine, ING, NAME, EXTRA, STEP_ICON, FLAT, F, TAU, drawMeasure, drawPile, drawTapHint, drawPiece, drawPlate, stepIcon, fancyText, pieceBase, pieceHeight } = CA;
  const T = (s, v) => (SPG.t ? SPG.t(s, v) : String(s).replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : '')));
  const tier = () => (SPG.level && SPG.level.tier ? SPG.level.tier('cook') : 2);

  /* ---------------------------------------------------------------- small drawing helpers */
  const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [o, col] of stops) g.addColorStop(o, col); return g; };
  const soft = (c, x, y, rx, ry, a = .16) => { c.fillStyle = `rgba(80,40,20,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
  const edge = (c, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = c.lineCap = 'round'; c.stroke(); };
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mixc = (a, b, u) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(u, 0, 1))).toString(16).padStart(2, '0')).join(''); };
  const spark = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, k = i % 2 ? r * .3 : r; c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); } c.closePath(); c.fill(); };
  // a snowflake: six arms with little branches
  function flake(c, x, y, r, col, lw, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r); c.moveTo(0, -r * .55); c.lineTo(-r * .24, -r * .78); c.moveTo(0, -r * .55); c.lineTo(r * .24, -r * .78); c.stroke(); c.restore(); }
    c.restore();
  }
  // a soft fingertip that shows her what to do (sliding, shaking), hidden while a photo is taken
  function ghostFinger(c, x, y, r, a = .85) {
    if (F.hush) return; c.save(); c.globalAlpha = a;
    c.fillStyle = 'rgba(255,107,157,.25)'; c.beginPath(); c.arc(x, y, r * 1.5, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = '#ff6b9d'; c.lineWidth = Math.max(3, r * .22); c.stroke();
    c.fillStyle = '#ffb3d1'; c.beginPath(); c.arc(x, y, r * .45, 0, TAU); c.fill(); c.restore();
  }

  /* ---------------------------------------------------------------- sounds: short one-shots only (no loops that could be left running) */
  const AU = () => { const A = SPG.audio; return A && A.ctx && A.master && SPG.store && SPG.store.settings.sound ? A : null; };
  function tone(f, dur, { type = 'sine', vol = .1, slide = 0, at = 0 } = {}) {
    const A = AU(); if (!A) return; const c = A.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + .05);
  }
  let NB = null;
  function hiss(dur, { freq = 2000, q = 1, vol = .05, at = 0, sweep = 0 } = {}) {
    const A = AU(); if (!A) return; const c = A.ctx;
    if (!NB) { NB = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = c.currentTime + at, s = c.createBufferSource(); s.buffer = NB; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * sweep), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  const SND = {
    // one ice cube knocking another: a glassy ping with a high partial
    clink(v = 1, at = 0) { const f = 2300 + Math.random() * 2500; tone(f, .07, { vol: .04 * v, at }); tone(f * 2.71, .04, { vol: .016 * v, at }); },
    // one swing of a bag of ice: a handful of cubes knocking together, a soft crinkle of plastic and a low thump (bigger swing, more ice)
    rattle(k = .5) { const n = 3 + Math.round(k * 4); for (let i = 0; i < n; i++) SND.clink(.55 + k * .6, Math.random() * .11); hiss(.1, { freq: 3400, q: .9, vol: .018 + .018 * k }); hiss(.08, { freq: 380, q: .7, vol: .05 + .04 * k, at: .01 }); },
    cubes(n = 3) { for (let i = 0; i < n; i++) SND.clink(1, i * .055 + Math.random() * .03); hiss(.06, { freq: 900, q: .8, vol: .03 }); },
    // one tooth of a zipper pressing shut (rising) or coming apart (falling)
    tooth(i, open) { hiss(.016, { freq: 5200, q: 2.4, vol: .05 }); tone((open ? 1500 : 900) + i * (open ? -40 : 45), .035, { type: 'triangle', vol: .045 }); },
    sealed() { tone(780, .09, { type: 'triangle', vol: .08 }); tone(1170, .12, { type: 'triangle', vol: .07, at: .07 }); hiss(.25, { freq: 1600, sweep: .4, q: .6, vol: .025, at: .05 }); },
    drip() { tone(520, .1, { slide: 2.4, vol: .1 }); tone(1300, .05, { vol: .03, at: .06 }); },
    grains() { for (let i = 0; i < 7; i++) hiss(.05, { freq: 4600 + Math.random() * 1600, q: 1.6, vol: .018, at: i * .045 }); },
    plop() { tone(170, .16, { slide: .55, vol: .15 }); hiss(.09, { freq: 600, q: .8, vol: .05 }); },
    dig() { hiss(.22, { freq: 1100, sweep: .5, q: .8, vol: .045 }); tone(260, .12, { slide: .7, type: 'triangle', vol: .04 }); },
    splash() { hiss(.14, { freq: 1500, sweep: .5, q: .7, vol: .045 }); tone(600, .08, { slide: 1.6, vol: .05 }); },
    crinkle() { hiss(.12, { freq: 3800, q: .8, vol: .022 }); hiss(.1, { freq: 2600, q: .8, vol: .016, at: .05 }); },
    frost(i) { tone(1760 + i * 220, .3, { vol: .05 }); tone(3520 + i * 440, .18, { vol: .02, at: .03 }); }
  };

  /* ---------------------------------------------------------------- what goes in (real amounts; toddlers make a half batch) */
  // Real recipe: 1 cup half-and-half, 2 tablespoons sugar, a few drops of vanilla in a small bag; 4 cups of ice and ½ cup of salt in a big
  // bag; shake. Tier 1 makes half of it and needs less shaking.
  const plan = () => { const k = tier(); return k === 1
    ? { cream: 1, sugar: 1, vanilla: 3, strawb: 2, cocoa: 1, chips: 1, ice: 3, salt: 1, shakes: 16, scoops: 2 }
    : { cream: 2, sugar: 2, vanilla: 5, strawb: 3, cocoa: 2, chips: 2, ice: 4, salt: 1, shakes: k === 3 ? 36 : 28, scoops: 3 }; };
  const BASE = ['cream', 'sugar', 'vanilla'], FLAVS = ['strawb', 'cocoa', 'chips'];
  const FLAVOR = { strawb: 'strawb', cocoa: 'choc', chips: 'chips' };
  const HEAR = { cream: 'halfhalf', sugar: 'sugar', vanilla: 'vanilla', strawb: 'strawberry', cocoa: 'cocoa', chips: 'chips', ice: 'ice', salt: 'salt', cone: 'cone', cup: 'cup' };
  // the colour of a scoop of each flavour (homemade: soft and pale)
  const ICE = { vanilla: '#fff2cc', strawb: '#ffbdd6', choc: '#b98257', chips: '#fff2cc' };
  const label = (id, P) => { const n = P[id];
    if (id === 'cream') return n > 1 ? SPG.t('1 cup') : SPG.t('½ cup'); if (id === 'salt') return SPG.t('½ cup'); if (id === 'vanilla') return SPG.t('{n} drops', { n });
    if (id === 'strawb') return SPG.t('{n} strawberries', { n }); if (id === 'ice') return SPG.t('{n} cups', { n }); return SPG.t('{n} tbsp', { n }); };
  const fresh = () => ({ flavor: 'vanilla', got: { cream: 0, sugar: 0, vanilla: 0, flav: 0 }, plan: plan(), cubes: 0, salt: 0 });
  const IC = g => g.ic || (g.ic = fresh());
  // the cream mixture: its colour and how full the little bag is
  function liqOf(ic) {
    const P = ic.plan, k = v => clamp(v, 0, 1), fc = k(ic.got.cream / P.cream), fv = k(ic.got.vanilla / P.vanilla), fs = k(ic.got.sugar / P.sugar);
    const ff = ic.flavor === 'vanilla' ? 0 : k(ic.got.flav / P[{ strawb: 'strawb', choc: 'cocoa', chips: 'chips' }[ic.flavor]]);
    let col = mixc('#fffbf2', '#fbeccb', fv * .75);
    if (ic.flavor === 'strawb') col = mixc(col, '#ffc4d7', ff * .9); else if (ic.flavor === 'choc') col = mixc(col, '#c4936a', ff);
    return { col, fill: fc * .5 + fs * .05 + fv * .03 + ff * .1, ff };
  }

  /* ---------------------------------------------------------------- the zip bags */
  // A zip bag seen from the front, centred on (b.x, b.y), b.W wide and b.H tall. Its zipper has a blue strip on the back lip and a
  // yellow strip on the front lip that turn green where they are pressed together (like real freezer bags). o.zv: how shut each tooth
  // is (0..1), o.gap: how far the mouth opens, o.inner(c, G): what is inside, o.frost: icy cold, o.bulge: full and round.
  const geo = (W, Hh) => ({ W, H: Hh, yt: -Hh / 2, dz: Hh * .075, yb: Hh / 2, r: W * .13 });
  const zAt = (zv, u) => { if (!zv) return 1; const n = zv.length, f = clamp(u * n - .5, 0, n - 1), i = Math.floor(f), j = Math.min(n - 1, i + 1); return lerp(zv[i], zv[j], f - i); };
  const gapAt = (o, u) => (o.gap || 0) * Math.pow(Math.max(0, Math.sin(Math.PI * u)), 1.1) * (1 - zAt(o.zv, u));
  const OPEN = .05;   // how far a bag's mouth opens (of its height)
  // the outline of a bag: straight sides (sealed seams), round bottom corners, a little rounder at the bottom when it is full
  const sideY = (G, o) => G.yb - Math.max(G.r * 1.25, G.H * .3 * (o.bulge || 0));
  function bodyPath(c, G, o, top) {
    const { W, yb, r } = G, b = (o.bulge || 0) * W * .055, N = 20, ym = sideY(G, o), my = lerp(ym, yb, .55);
    c.beginPath();
    for (let k = 0; k <= N; k++) { const u = k / N, x = -W / 2 + u * W, y = top(u); k ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.lineTo(W / 2, ym); c.bezierCurveTo(W / 2 + b, my, W / 2 + b * .5, yb, W / 2 - r, yb);
    c.lineTo(-W / 2 + r, yb); c.bezierCurveTo(-W / 2 - b * .5, yb, -W / 2 - b, my, -W / 2, ym); c.closePath();
  }
  function zipLine(c, G, o, yf, wantShut, col, lw) {
    const n = o.zv ? o.zv.length : 1, W = G.W;
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const shut = o.zv ? o.zv[i] > .5 : true; if (shut !== wantShut) continue;
      c.beginPath(); for (let k = 0; k <= 4; k++) { const u = (i + k / 4) / n, x = -W / 2 + W * (.03 + u * .94); k ? c.lineTo(x, yf(u)) : c.moveTo(x, yf(u)); } c.stroke();
    }
  }
  function drawBag(c, b, o = {}) {
    const G = geo(b.W, b.H), { W, H: Hh, yt, dz, yb } = G, lw = Math.max(1.4, W * .011), zw = Math.max(2.5, dz * .34);
    c.save(); c.translate(b.x, b.y); if (o.rot) c.rotate(o.rot); if (o.sx) c.scale(o.sx, o.sy || 1);
    const gp = u => gapAt(o, u), back = u => yt - gp(u), front = u => yt + gp(u);
    const open = (o.gap || 0) > .5 && (!o.zv || o.zv.some(v => v < .98));
    if (o.shadow !== false) soft(c, W * .04, yb + Hh * .01, W * .5, W * .07, .16);
    // 1. the back lip and, through the open mouth, the inside of the bag
    if (open) {
      c.beginPath(); for (let k = 0; k <= 20; k++) { const u = k / 20; c.lineTo(-W / 2 + u * W, back(u)); } for (let k = 20; k >= 0; k--) { const u = k / 20; c.lineTo(-W / 2 + u * W, front(u) + dz); } c.closePath();
      c.fillStyle = lin(c, 0, yt - (o.gap || 0), 0, yt + (o.gap || 0) + dz, [[0, 'rgba(150,190,226,.85)'], [1, 'rgba(214,234,250,.7)']]); c.fill(); edge(c, 'rgba(104,152,196,.85)', lw);
      zipLine(c, G, o, u => back(u) + dz * .55, false, '#58a8ec', zw);
    }
    // 2. what is inside, seen through the plastic
    if (o.inner) { c.save(); bodyPath(c, G, o, u => back(u) + dz); c.clip(); o.inner(c, G); c.restore(); }
    // 3. the front of the bag
    bodyPath(c, G, o, front);
    c.fillStyle = lin(c, -W / 2, 0, W / 2, 0, [[0, 'rgba(255,255,255,.36)'], [.4, 'rgba(232,244,255,.14)'], [1, 'rgba(190,220,246,.32)']]); c.fill();
    edge(c, 'rgba(98,146,192,.92)', lw);
    // a fold at the bottom
    c.strokeStyle = 'rgba(120,165,205,.35)'; c.lineWidth = lw * .8; c.beginPath(); c.moveTo(-W * .38, yb - Hh * .06); c.quadraticCurveTo(0, yb - Hh * .085, W * .38, yb - Hh * .06); c.stroke();
    // the sealed seams down both sides
    const sy0 = yt + dz, sy1 = sideY(G, o), sw = W * .036;
    for (const sx of [-1, 1]) { c.fillStyle = 'rgba(170,204,232,.32)'; c.fillRect(sx < 0 ? -W / 2 : W / 2 - sw, sy0, sw, sy1 - sy0); c.strokeStyle = 'rgba(120,165,205,.45)'; c.lineWidth = lw * .6; c.beginPath(); c.moveTo(sx * (W / 2 - sw), sy0); c.lineTo(sx * (W / 2 - sw), sy1 - W * .02); c.stroke(); }
    // 4. the front lip and its zipper (green where it is shut)
    c.beginPath(); for (let k = 0; k <= 20; k++) { const u = k / 20; c.lineTo(-W / 2 + u * W, front(u)); } for (let k = 20; k >= 0; k--) { const u = k / 20; c.lineTo(-W / 2 + u * W, front(u) + dz); } c.closePath();
    c.fillStyle = 'rgba(255,255,255,.42)'; c.fill(); c.strokeStyle = 'rgba(98,146,192,.55)'; c.lineWidth = lw * .7; c.stroke();
    zipLine(c, G, o, u => front(u) + dz * .5, false, '#ffd23f', zw);
    zipLine(c, G, o, u => front(u) + dz * .5, true, '#3fbf5a', zw * 1.15);
    zipLine(c, G, o, u => front(u) + dz * .5 - zw * .25, true, '#8ee69a', zw * .35);
    // 5. a little white panel to write on, and the shine of the plastic
    if (o.label !== false) { box(c, W * .12, yt + dz * 1.9, W * .3, Hh * .13, 'rgba(255,255,255,.72)', W * .02); c.strokeStyle = 'rgba(150,180,210,.5)'; c.lineWidth = lw * .6; for (let i = 1; i <= 3; i++) { const y = yt + dz * 1.9 + Hh * .13 * i / 4; c.beginPath(); c.moveTo(W * .15, y); c.lineTo(W * .39, y); c.stroke(); } }
    c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, -W * .38, yt + Hh * .2, W * .045, Hh * .5, W * .02); c.fill();
    c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, -W * .3, yt + Hh * .24, W * .02, Hh * .3, W * .01); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = W * .02; c.lineCap = 'round'; c.beginPath(); c.arc(W * .2, yb - Hh * .22, W * .16, .2, 1.1); c.stroke();
    // 6. frost: the bag gets icy cold
    if (o.frost > .01) {
      const f = o.frost; c.save(); bodyPath(c, G, o, front); c.clip();
      c.fillStyle = `rgba(246,251,255,${.3 * f})`; c.fillRect(-W, -Hh, W * 2, Hh * 2);
      for (const sx of [-1, 1]) { c.fillStyle = lin(c, sx * W / 2, 0, sx * W * .25, 0, [[0, `rgba(255,255,255,${.55 * f})`], [1, 'rgba(255,255,255,0)']]); c.fillRect(sx > 0 ? W * .25 : -W / 2, -Hh, W * .25, Hh * 2); }
      for (let i = 0; i < 70; i++) { if (rnd(i + 77) > f + .15) continue; const x = (rnd(i + 1) - .5) * W, y = (rnd(i + 31) - .5) * Hh; c.globalAlpha = .85 * f; circ(c, x, y, W * (.004 + rnd(i + 9) * .008), '#fff'); }
      c.globalAlpha = f; for (let i = 0; i < 7; i++) { if (rnd(i + 5) > f) continue; flake(c, (rnd(i + 13) - .5) * W * .8, (rnd(i + 17) - .5) * Hh * .8, W * (.03 + rnd(i) * .025), 'rgba(255,255,255,.95)', Math.max(1, W * .006), rnd(i) * 3); }
      c.restore();
    }
    c.restore();
  }
  // the cream mixture in the little bag: a liquid that sloshes, or (thick = 1) soft ice cream
  function bagLiquid(c, G, o) {
    const { W, yb, yt, dz } = G, k = clamp(o.fill || 0, 0, 1); if (k < .004) return;
    const top = yt + dz * 1.6, lvl = yb - k * (yb - top), th = clamp(o.thick || 0, 0, 1), t = o.t || 0, sl = o.slosh || 0, col = o.col || '#fffbf2';
    // a liquid surface that waves and tips; as it freezes it becomes a soft lumpy mound
    const bump = x => Math.pow(Math.abs(Math.sin((x / W + .5) * Math.PI * 2.6 + .25)), .55);   // the round lumps of a frozen top
    const surf = x => lvl + sl * x * .45 * (1 - th) + Math.sin(x / W * 9 + t * 3.2) * W * .01 * (1 - th) + th * (-bump(x) * .06 - (1 - (2 * x / W) ** 2) * .03 + .02) * W;
    const path = () => { c.beginPath(); c.moveTo(-W, yb + 6); for (let i = 0; i <= 32; i++) { const x = -W * .56 + i / 32 * W * 1.12; c.lineTo(x, surf(x)); } c.lineTo(W, yb + 6); c.closePath(); };
    c.globalAlpha = .8 + .2 * th; path(); c.fillStyle = lin(c, 0, lvl - W * .05, 0, yb, [[0, shade(col, .35)], [.25, col], [1, shade(col, -.12 - th * .06)]]); c.fill(); c.globalAlpha = 1;
    c.save(); path(); c.clip();
    // frozen: the soft ridges and folds of ice cream, and the dents left by the scoop
    if (th > .04) {
      // the lumps along the top each catch the light
      for (let i = 0; i < 6; i++) { const x = ((i + .5 - .25 / Math.PI) / 2.6 - .5) * W; if (Math.abs(x) > W * .46) continue; const y = surf(x); c.globalAlpha = th * .75; ell(c, x - W * .03, y + W * .045, W * .06, W * .025, shade(col, .38), -.3); }
      // soft folds inside, like a scoop pulled through it
      for (let i = 0; i < 8; i++) {
        const x = (rnd(i + 3) - .5) * W * .76, y = lerp(lvl + W * .1, yb - W * .06, rnd(i + 8)), hw = W * (.07 + rnd(i) * .05);
        c.lineCap = 'round'; c.globalAlpha = th * .55; c.strokeStyle = shade(col, -.18); c.lineWidth = W * .016;
        c.beginPath(); c.moveTo(x - hw, y - hw * .3); c.quadraticCurveTo(x, y + hw * .5, x + hw, y - hw * .3); c.stroke();
        c.globalAlpha = th * .5; c.strokeStyle = shade(col, .35); c.lineWidth = W * .012;
        c.beginPath(); c.moveTo(x - hw * .7, y - hw * .3 - W * .02); c.quadraticCurveTo(x, y + hw * .3 - W * .02, x + hw * .7, y - hw * .3 - W * .02); c.stroke();
      }
    }
    for (let i = 0; i < (o.dents || 0); i++) {
      const x = [-.18, .16, -.02][i % 3] * W, y = surf(x) + W * .015, r = W * .1;
      c.globalAlpha = 1; c.fillStyle = shade(col, -.14); c.beginPath(); c.ellipse(x, y, r, r * .45, 0, 0, TAU); c.fill();
      c.fillStyle = shade(col, -.05); c.beginPath(); c.ellipse(x, y + r * .08, r * .82, r * .3, 0, 0, TAU); c.fill();
      c.strokeStyle = shade(col, .35); c.lineWidth = W * .012; c.beginPath(); c.ellipse(x, y, r, r * .45, 0, Math.PI * .05, Math.PI * .95); c.stroke();
    }
    c.globalAlpha = 1;
    // bits: strawberry pieces, chocolate chips (they float about while it is runny)
    const fl = o.flavor, nb = o.bits || 0;
    for (let i = 0; i < nb; i++) {
      const x = (rnd(i * 3 + 1) - .5) * W * .78, y = lerp(lvl + W * .07, yb - W * .05, rnd(i * 3 + 2) * (th > .5 ? 1 : .55 + .45 * Math.sin(t * .7 + i) ** 2)), r = W * .03;
      if (fl === 'strawb') { ell(c, x, y, r * 1.3, r, '#e8435a', rnd(i) * 3); ell(c, x - r * .2, y - r * .2, r * .7, r * .5, '#ff8fa6', rnd(i) * 3); }
      else if (fl === 'chips') tri(c, [[x, y - r * .9], [x + r * .8, y + r * .5], [x - r * .8, y + r * .5]], '#4a2a1a');
    }
    // cocoa powder just poured in: a dark cloud that stirs itself in
    if (o.swirl > 0) { c.globalAlpha = o.swirl * .7; c.strokeStyle = '#8a5a3a'; c.lineCap = 'round'; c.lineWidth = W * .03 * (.5 + o.swirl); c.beginPath(); for (let i = 0; i <= 30; i++) { const a = i / 30 * TAU * 1.5 + t * 2, r = W * (.03 + i / 30 * .18) * (1.6 - o.swirl * .6); c.lineTo(Math.cos(a) * r, lerp(lvl, yb, .4) + Math.sin(a) * r * .4); } c.stroke(); c.globalAlpha = 1; }
    c.restore();
    c.strokeStyle = `rgba(255,255,255,${.75 - .2 * th})`; c.lineWidth = W * (.012 + th * .008); c.lineCap = 'round'; c.beginPath(); for (let i = 1; i < 32; i++) { const x = -W * .56 + i / 32 * W * 1.12; i > 1 ? c.lineTo(x, surf(x) + W * .008) : c.moveTo(x, surf(x) + W * .008); } c.stroke();
  }
  // an ice cube, a little salt on it when the salt has gone in
  function drawCube(c, x, y, s, rot, seed, salt = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = 'rgba(130,188,228,.55)'; rr(c, -s * .5, -s * .46, s, s * .98, s * .24); c.fill();
    c.fillStyle = lin(c, -s * .5, -s * .5, s * .5, s * .5, [[0, 'rgba(250,253,255,.97)'], [1, 'rgba(196,229,250,.92)']]); rr(c, -s * .48, -s * .5, s * .92, s * .9, s * .22); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; rr(c, -s * .36, -s * .4, s * .5, s * .15, s * .075); c.fill();
    c.fillStyle = 'rgba(150,200,236,.4)'; rr(c, s * .06, -s * .08, s * .26, s * .3, s * .1); c.fill();
    c.strokeStyle = 'rgba(112,170,212,.8)'; c.lineWidth = Math.max(1, s * .045); rr(c, -s * .48, -s * .5, s * .92, s * .9, s * .22); c.stroke();
    circ(c, -s * .14, s * .14, s * .05, 'rgba(255,255,255,.85)');
    if (salt > 0) for (let i = 0; i < 6; i++) { if (rnd(seed * 7 + i) > salt) continue; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(140,160,190,.6)'; c.lineWidth = 1; const gx = (rnd(seed + i * 3) - .5) * s * .7, gy = -s * .3 + rnd(seed + i * 5) * s * .4, gs = s * .07; c.save(); c.translate(gx, gy); c.rotate(rnd(i) * 2); c.fillRect(-gs / 2, -gs / 2, gs, gs); c.strokeRect(-gs / 2, -gs / 2, gs, gs); c.restore(); }
    c.restore();
  }
  // where the ice lies in the big bag: rows of cubes from the bottom up (in units of the bag, so it is the same in every step)
  function cubeSlot(G, i) {
    const { W, yb } = G, cs = W * .17, per = 5, row = Math.floor(i / per), col = i % per;
    const x = clamp((col - (per - 1) / 2 + (row % 2 ? .3 : -.15)) * cs * .92 + (rnd(i + 3) - .5) * cs * .25, -W / 2 + cs * .52, W / 2 - cs * .52);
    return { x, y: yb - cs * .62 - row * cs * .72 + (rnd(i + 9) - .5) * cs * .16, rot: (rnd(i + 5) - .5) * .9, s: cs * (.88 + rnd(i + 1) * .22), front: (row === 0 && Math.abs(x) > W * .16) || Math.abs(x) > W * .33 };
  }
  // the big bag's ice (and the little bag, once it is inside)
  function bigInner(g, ic, o = {}) {
    return (c, G) => {
      const n = ic.cubes, sh = o.jig || [], sk = ic.salt;
      const cube = i => { const q = cubeSlot(G, i), j = sh[i] || { x: 0, y: 0, r: 0 }; drawCube(c, q.x + j.x, q.y + j.y + (o.lift ? o.lift * (i % 3) * .3 : 0), q.s, q.rot + j.r, i + 1, sk); };
      for (let i = 0; i < n; i++) if (!cubeSlot(G, i).front || !o.little) cube(i);
      if (o.little) { const L = o.little, lw = G.W * .62 * (L.k == null ? 1 : L.k), lh = lw / .82, lx = (L.dx || 0) * G.W, ly = G.yb - lh / 2 - G.W * .06 + (L.dy || 0) * G.H; drawBag(c, { x: lx, y: ly, W: lw, H: lh }, littleLook(g, ic, { thick: L.thick, frost: L.frost, slosh: L.slosh, label: false, shadow: false, rot: L.rot })); }
      if (o.little) for (let i = 0; i < n; i++) if (cubeSlot(G, i).front) { c.globalAlpha = .92; cube(i); c.globalAlpha = 1; }
    };
  }
  // how the little bag looks right now: what is in it, its zipper
  function littleLook(g, ic, o = {}) {
    const L = liqOf(ic), fl = ic.flavor, P = ic.plan;
    const bits = fl === 'strawb' ? ic.got.flav * 4 : fl === 'chips' ? ic.got.flav * 9 : 0;
    const zv = o.zv || Array(10).fill(1);
    return { ...o, zv, gap: o.gap || 0, bulge: L.fill, inner: (c, G) => bagLiquid(c, G, { fill: o.fill != null ? o.fill : L.fill, col: o.thick ? mixc(L.col, ICE[fl] || ICE.vanilla, o.thick) : L.col, thick: o.thick || 0, t: g.t, slosh: o.slosh || 0, flavor: fl, bits, swirl: o.swirl || 0, dents: o.dents || 0 }) };
  }

  /* ---------------------------------------------------------------- ingredients and tools on the counter (centred, size s) */
  function drawCarton(c, s) {   // a carton of half-and-half: a gable top and a golden band with a drop
    soft(c, s * .06, s * .47, s * .36, s * .06);
    tri(c, [[s * .1, -s * .06], [s * .3, -s * .14], [s * .3, s * .38], [s * .1, s * .46]], '#e8dcc6');
    tri(c, [[s * .1, s * .12], [s * .3, s * .06], [s * .3, s * .26], [s * .1, s * .32]], '#e0a437');
    box(c, -s * .3, -s * .06, s * .4, s * .52, '#fffdf7', s * .015); c.fillStyle = 'rgba(214,196,160,.35)'; c.fillRect(-s * .3, -s * .06, s * .05, s * .52);
    box(c, -s * .3, s * .12, s * .4, s * .2, '#f5bf4f', 0); box(c, -s * .3, s * .12, s * .4, s * .04, '#ffdc8a', 0);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-s * .1, s * .15); c.bezierCurveTo(-s * .03, s * .21, -s * .05, s * .3, -s * .1, s * .3); c.bezierCurveTo(-s * .15, s * .3, -s * .17, s * .21, -s * .1, s * .15); c.fill();
    tri(c, [[-s * .3, -s * .06], [s * .1, -s * .06], [-s * .1, -s * .3]], '#fbf5ea'); tri(c, [[s * .1, -s * .06], [-s * .1, -s * .3], [s * .1, -s * .38], [s * .3, -s * .14]], '#efe4d0');
    tri(c, [[-s * .1, -s * .3], [s * .1, -s * .38], [s * .1, -s * .44], [-s * .1, -s * .36]], '#fff');
    c.strokeStyle = '#c8b58e'; c.lineWidth = s * .018; c.lineJoin = c.lineCap = 'round'; c.beginPath(); c.moveTo(-s * .3, -s * .06); c.lineTo(-s * .1, -s * .3); c.lineTo(s * .1, -s * .38); c.lineTo(s * .3, -s * .14); c.lineTo(s * .3, s * .38); c.lineTo(s * .1, s * .46); c.lineTo(-s * .3, s * .46); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(-s * .3, -s * .06); c.lineTo(s * .1, -s * .06); c.lineTo(s * .3, -s * .14); c.moveTo(s * .1, -s * .06); c.lineTo(s * .1, s * .46); c.moveTo(-s * .1, -s * .3); c.lineTo(s * .1, -s * .06); c.stroke();
  }
  function drawVanilla(c, s) {   // a little brown bottle of vanilla with a flower on its label
    soft(c, 0, s * .45, s * .22, s * .05);
    const body = () => { c.beginPath(); c.moveTo(-s * .16, -s * .06); c.quadraticCurveTo(-s * .17, -s * .15, -s * .07, -s * .18); c.lineTo(-s * .06, -s * .26); c.lineTo(s * .06, -s * .26); c.lineTo(s * .07, -s * .18); c.quadraticCurveTo(s * .17, -s * .15, s * .16, -s * .06); c.lineTo(s * .16, s * .38); c.quadraticCurveTo(s * .16, s * .44, s * .1, s * .44); c.lineTo(-s * .1, s * .44); c.quadraticCurveTo(-s * .16, s * .44, -s * .16, s * .38); c.closePath(); };
    c.fillStyle = lin(c, -s * .16, 0, s * .16, 0, [[0, '#9a5528'], [.45, '#6e3517'], [1, '#48210b']]); body(); c.fill(); edge(c, '#3a1a08', s * .016);
    box(c, -s * .08, -s * .38, s * .16, s * .13, '#3a3434', s * .03); box(c, -s * .08, -s * .38, s * .05, s * .13, '#5a5252', s * .02);
    box(c, -s * .135, s * .03, s * .27, s * .28, '#fff4dc', s * .03); c.strokeStyle = '#e8c890'; c.lineWidth = s * .012; rr(c, -s * .135, s * .03, s * .27, s * .28, s * .03); c.stroke();
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; ell(c, Math.cos(a) * s * .045, s * .13 + Math.sin(a) * s * .045, s * .03, s * .045, '#fffdf6', a + Math.PI / 2); }
    circ(c, 0, s * .13, s * .022, '#ffd54a'); ell(c, 0, s * .25, s * .1, s * .016, '#4a2510', -.2); circ(c, -s * .095, s * .27, s * .01, '#4a2510');
    shine(c, -s * .1, s * .14, s * .018, s * .12, 0, .3);
  }
  function drawDropper(c, s, sq = 0, liq = .5) {   // a glass dropper with a pink rubber top; sq = how hard it is squeezed
    const tube = () => { c.beginPath(); c.moveTo(-s * .045, -s * .12); c.lineTo(s * .045, -s * .12); c.lineTo(s * .03, s * .3); c.lineTo(s * .01, s * .4); c.lineTo(-s * .01, s * .4); c.lineTo(-s * .03, s * .3); c.closePath(); };
    tube(); c.fillStyle = 'rgba(228,243,252,.9)'; c.fill();
    if (liq > 0) { c.save(); tube(); c.clip(); c.fillStyle = '#7a3e18'; c.fillRect(-s, s * .4 - liq * s * .46, s * 2, s); c.restore(); }
    tube(); edge(c, 'rgba(100,140,182,.95)', s * .014); c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(-s * .03, -s * .1, s * .012, s * .36);
    c.save(); c.translate(0, -s * .12); c.scale(1 + sq * .28, 1 - sq * .32);
    c.beginPath(); c.moveTo(-s * .07, 0); c.bezierCurveTo(-s * .095, -s * .12, -s * .07, -s * .25, 0, -s * .26); c.bezierCurveTo(s * .07, -s * .25, s * .095, -s * .12, s * .07, 0); c.closePath();
    c.fillStyle = lin(c, -s * .08, 0, s * .08, 0, [[0, '#ff9cc2'], [1, '#e0558a']]); c.fill(); edge(c, '#c23d72', s * .014); shine(c, -s * .03, -s * .15, s * .015, s * .05, 0, .55);
    c.restore(); box(c, -s * .07, -s * .14, s * .14, s * .045, '#d84a82', s * .02);
  }
  function drawCocoa(c, s, k = 1) {   // a round tin of cocoa powder, open
    soft(c, 0, s * .45, s * .34, s * .06);
    c.fillStyle = lin(c, -s * .27, 0, s * .27, 0, [[0, '#a0603a'], [.45, '#7a4426'], [1, '#55290f']]); rr(c, -s * .27, -s * .2, s * .54, s * .64, s * .05); c.fill();
    box(c, -s * .27, s * .0, s * .54, s * .26, '#fff1dc', 0); c.fillStyle = 'rgba(160,110,70,.25)'; c.fillRect(s * .16, 0, s * .11, s * .26);
    ell(c, 0, s * .13, s * .07, s * .045, '#6a3a1e', .5); c.strokeStyle = '#3a1a0a'; c.lineWidth = s * .012; c.beginPath(); c.moveTo(-s * .05, s * .1); c.quadraticCurveTo(0, s * .13, s * .05, s * .16); c.stroke();
    ell(c, s * .14, s * .1, s * .05, s * .035, '#8a5a3a', -.4);
    ell(c, 0, -s * .2, s * .27, s * .07, '#4a2410'); ell(c, 0, -s * .19, s * .24, s * .055, '#7a4a2e');
    if (k > 0) { c.fillStyle = '#6e3f24'; c.beginPath(); c.ellipse(0, -s * .2, s * .2 * k, s * .07 * k, 0, Math.PI, 0); c.fill(); shine(c, -s * .06, -s * .23, s * .05, s * .015, 0, .18); }
    shine(c, -s * .2, s * .3, s * .02, s * .08, 0, .25);
  }
  function berryHalf(c, x, y, r, rot) {   // half a strawberry, cut side up
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.moveTo(0, r * .95); c.bezierCurveTo(-r * 1.1, r * .3, -r * .9, -r * .75, 0, -r * .6); c.bezierCurveTo(r * .9, -r * .75, r * 1.1, r * .3, 0, r * .95); c.closePath(); c.fillStyle = '#e23a44'; c.fill();
    c.beginPath(); c.moveTo(0, r * .75); c.bezierCurveTo(-r * .85, r * .25, -r * .7, -r * .55, 0, -r * .42); c.bezierCurveTo(r * .7, -r * .55, r * .85, r * .25, 0, r * .75); c.closePath(); c.fillStyle = '#ff8a9c'; c.fill();
    ell(c, 0, r * .05, r * .2, r * .45, '#ffd0d8'); for (const [px, py] of [[-.42, -.1], [.42, -.1], [-.3, .3], [.3, .3], [0, -.4]]) circ(c, px * r, py * r, r * .05, '#fff3a0');
    for (const a of [-.9, -.3, .3, .9]) { c.save(); c.translate(0, -r * .62); c.rotate(a); ell(c, 0, -r * .1, r * .1, r * .22, '#4fb86a'); c.restore(); }
    c.restore();
  }
  function drawBerryBowl(c, s, n) {   // a little bowl of cut strawberries
    soft(c, 0, s * .4, s * .5, s * .07);
    ell(c, 0, s * .02, s * .46, s * .13, '#f7c6d6');
    for (let i = 0; i < n; i++) berryHalf(c, (i - (n - 1) / 2) * s * .2 + (i % 2 ? .02 : -.02) * s, -s * .06 - (i % 2) * s * .05, s * .16, (i - (n - 1) / 2) * .35);
    c.fillStyle = lin(c, -s * .46, 0, s * .46, 0, [[0, '#ffc2d6'], [.5, '#ffd7e4'], [1, '#f39ab9']]); c.beginPath(); c.moveTo(-s * .47, s * .02); c.quadraticCurveTo(-s * .44, s * .42, 0, s * .44); c.quadraticCurveTo(s * .44, s * .42, s * .47, s * .02); c.quadraticCurveTo(0, s * .16, -s * .47, s * .02); c.closePath(); c.fill(); edge(c, '#d8709a', s * .018);
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = s * .035; c.beginPath(); c.moveTo(-s * .4, s * .09); c.quadraticCurveTo(-s * .38, s * .26, -s * .2, s * .35); c.stroke();
    for (const [x, y] of [[-.1, .26], [.1, .3], [.28, .2]]) circ(c, x * s, y * s, s * .03, 'rgba(255,255,255,.8)');
  }
  function drawBucket(c, s, n = 4) {   // a blue ice bucket with cubes heaped in it
    soft(c, 0, s * .45, s * .42, s * .07);
    c.strokeStyle = '#9aa6b8'; c.lineWidth = s * .03; c.beginPath(); c.arc(0, -s * .12, s * .36, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    ell(c, 0, -s * .12, s * .4, s * .1, '#3f8fd0');
    for (let i = 0; i < Math.min(5, n + 1); i++) drawCube(c, (i - 2) * s * .14 + (i % 2) * s * .02, -s * .16 - (i % 2) * s * .06, s * .18, (rnd(i + 2) - .5) * .8, i + 1, 0);
    c.fillStyle = lin(c, -s * .4, 0, s * .4, 0, [[0, '#8fd2fb'], [.5, '#6fc0f2'], [1, '#3f96d6']]); c.beginPath(); c.moveTo(-s * .41, -s * .1); c.lineTo(-s * .32, s * .4); c.quadraticCurveTo(0, s * .48, s * .32, s * .4); c.lineTo(s * .41, -s * .1); c.quadraticCurveTo(0, -s * .0, -s * .41, -s * .1); c.closePath(); c.fill(); edge(c, '#2f7cb8', s * .018);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(-s * .4, -s * .06); c.quadraticCurveTo(0, s * .04, s * .4, -s * .06); c.lineTo(s * .39, -s * .0); c.quadraticCurveTo(0, s * .1, -s * .39, -s * .0); c.closePath(); c.fill();
    flake(c, 0, s * .22, s * .1, 'rgba(255,255,255,.9)', s * .02);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = s * .03; c.beginPath(); c.moveTo(-s * .32, s * .02); c.lineTo(-s * .26, s * .34); c.stroke();
  }
  function drawIceScoop(c, s, full) {   // a metal ice scoop (the bowl on the left), cubes in it when full
    c.save(); c.lineJoin = c.lineCap = 'round';
    box(c, s * .1, -s * .045, s * .38, s * .09, '#ff8fb0', s * .045); box(c, s * .12, -s * .04, s * .34, s * .03, '#ffc2d6', s * .015);
    c.beginPath(); c.moveTo(s * .12, -s * .1); c.lineTo(-s * .3, -s * .16); c.quadraticCurveTo(-s * .42, 0, -s * .3, s * .16); c.lineTo(s * .12, s * .1); c.closePath();
    c.fillStyle = lin(c, 0, -s * .16, 0, s * .16, [[0, '#f2f6fb'], [.5, '#c4cedd'], [1, '#9aa8bc']]); c.fill(); edge(c, '#7d8aa0', s * .016);
    if (full) for (let i = 0; i < 3; i++) drawCube(c, -s * .18 + i * s * .1, -s * .08 + (i % 2) * s * .07, s * .13, (i - 1) * .4, i + 3, 0);
    ell(c, -s * .02, -s * .09, s * .14, s * .02, 'rgba(255,255,255,.7)');
    c.restore();
  }
  function drawSaltTub(c, s) {   // a round tub of coarse salt with a pour spout
    soft(c, 0, s * .45, s * .34, s * .06);
    c.fillStyle = lin(c, -s * .26, 0, s * .26, 0, [[0, '#5aa0e6'], [.5, '#3c84d0'], [1, '#2a62a8']]); rr(c, -s * .26, -s * .24, s * .52, s * .68, s * .06); c.fill();
    box(c, -s * .26, -s * .02, s * .52, s * .24, '#fff', 0);
    for (let i = 0; i < 5; i++) { const x = (i - 2) * s * .085, y = s * .1 + (i % 2) * s * .03; c.save(); c.translate(x, y); c.rotate(.4 * i); c.fillStyle = '#eaf3ff'; c.strokeStyle = '#7aa4d8'; c.lineWidth = s * .01; c.fillRect(-s * .025, -s * .025, s * .05, s * .05); c.strokeRect(-s * .025, -s * .025, s * .05, s * .05); c.restore(); }
    ell(c, 0, -s * .24, s * .26, s * .065, '#e8f0fa'); ell(c, 0, -s * .245, s * .22, s * .05, '#cddcee');
    box(c, s * .02, -s * .32, s * .14, s * .08, '#e8f0fa', s * .02);
    shine(c, -s * .19, s * .3, s * .02, s * .08, 0, .35);
  }
  // the ice cream scoop (a "disher"): a round steel bowl on a pink handle, the bowl on the left
  function drawDisher(c, s, ball) {
    c.save(); c.lineJoin = c.lineCap = 'round';
    box(c, -s * .02, -s * .05, s * .5, s * .1, '#ff7aa8', s * .05); box(c, s * .02, -s * .045, s * .42, s * .03, '#ffc2d6', s * .015);
    box(c, -s * .12, -s * .03, s * .14, s * .06, '#b8c2d2', s * .02);
    if (ball) CA.drawScoop(c, -s * .24, -s * .02, s * .17, ball.col, ball.id);
    c.beginPath(); c.arc(-s * .24, 0, s * .17, -.1, Math.PI + .1); c.closePath(); c.fillStyle = lin(c, 0, 0, 0, s * .17, [[0, '#eef2f8'], [1, '#98a6ba']]); c.fill(); edge(c, '#7d8aa0', s * .016);
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = s * .02; c.beginPath(); c.arc(-s * .24, 0, s * .12, Math.PI * .3, Math.PI * .7); c.stroke();
    c.restore();
  }

  /* ---------------------------------------------------------------- the finished food: a cone in a little stand, or a paper cup */
  // In units of R from the foot of the food (up is negative y). Scoops: { f: flavour, drop: 0..1 while it falls into place }.
  const SPOTS = { cone: [[0, -2.4, .72], [.04, -3.22, .7], [-.03, -4.0, .66]], cup: { 1: [[0, -1.42, .7]], 2: [[-.37, -1.38, .62], [.37, -1.38, .62]], 3: [[-.37, -1.38, .62], [.37, -1.38, .62], [0, -2.04, .6]] } };
  const spots = p => { const n = (p.scoops || []).length; if (p.holder === 'cup') return n ? SPOTS.cup[Math.min(3, n)] : []; return SPOTS.cone.slice(0, n); };
  const topOf = p => { const sp = spots(p); let t = p.holder === 'cup' ? 1.26 : 2.12; for (const [, y, r] of sp) t = Math.max(t, -y + r); if (p.holder === 'cup' && sp.length) t = Math.max(t, 2.25); return t; };
  const scoopId = f => (f === 'strawb' ? 'strawb' : f === 'chips' ? 'mint' : null);
  function drawScoopAt(c, x, y, r, f, seed) {
    CA.drawScoop(c, x, y, r, ICE[f] || ICE.vanilla, scoopId(f));
    if (f === 'vanilla') for (let i = 0; i < 7; i++) circ(c, x + (rnd(seed + i) - .5) * r * 1.3, y + (rnd(seed + i + 9) - .7) * r, r * .035, 'rgba(70,40,20,.5)');
  }
  function coneStand(c, R, front) {
    if (!front) { soft(c, R * .04, R * .02, R * .62, R * .14, .18); ell(c, 0, -R * .02, R * .58, R * .14, '#e86d9a'); ell(c, 0, -R * .05, R * .55, R * .12, '#ff9ec2'); ell(c, 0, -R * .58, R * .4, R * .1, '#c84a7a'); return; }
    c.beginPath(); c.moveTo(-R * .44, -R * .58); c.lineTo(-R * .36, -R * .08); c.quadraticCurveTo(0, R * .02, R * .36, -R * .08); c.lineTo(R * .44, -R * .58); c.quadraticCurveTo(0, -R * .46, -R * .44, -R * .58); c.closePath();
    c.fillStyle = lin(c, -R * .44, 0, R * .44, 0, [[0, '#ffb3d0'], [.4, '#ff8fb8'], [1, '#e0608e']]); c.fill(); edge(c, '#c24a78', R * .02);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = R * .045; c.beginPath(); c.moveTo(-R * .34, -R * .48); c.lineTo(-R * .29, -R * .14); c.stroke();
    for (const x of [-.18, 0, .18]) circ(c, x * R, -R * .3 + Math.abs(x) * R * .1, R * .045, 'rgba(255,255,255,.75)');
  }
  function drawCone(c, R) {   // a waffle cone: tip at the bottom (hidden in the stand), rim at y = -1.95 R
    const rim = -R * 1.95, hw = R * .6;
    c.save(); c.beginPath(); c.moveTo(-hw, rim); c.lineTo(0, -R * .3); c.lineTo(hw, rim); c.closePath();
    c.fillStyle = lin(c, -hw, 0, hw, 0, [[0, '#f6c886'], [.5, '#e9b06a'], [1, '#c98a44']]); c.fill(); c.clip();
    c.strokeStyle = 'rgba(176,112,48,.65)'; c.lineWidth = R * .035;
    for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(i * R * .2 - R, rim - R * .2); c.lineTo(i * R * .2 + R, -R * .2); c.stroke(); c.beginPath(); c.moveTo(i * R * .2 + R, rim - R * .2); c.lineTo(i * R * .2 - R, -R * .2); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(-hw * .8, rim); c.lineTo(-hw * .2, rim); c.lineTo(-R * .02, -R * .5); c.closePath(); c.fill();
    c.restore();
    c.beginPath(); c.moveTo(-hw, rim); c.lineTo(0, -R * .3); c.lineTo(hw, rim); edge(c, '#b5773a', R * .025);
    box(c, -hw * 1.06, rim - R * .14, hw * 2.12, R * .2, '#e2a55c', R * .08); box(c, -hw * 1.02, rim - R * .13, hw * 2.04, R * .07, '#f6cf92', R * .04);
  }
  function cupBack(c, R) { ell(c, 0, -R * 1.12, R * .74, R * .16, '#d9558a'); ell(c, 0, -R * 1.1, R * .66, R * .12, '#b93f70'); }
  function cupFront(c, R) {
    const top = -R * 1.12, bot = -R * .04;
    const wall = () => { c.beginPath(); c.moveTo(-R * .74, top); c.lineTo(-R * .5, bot - R * .04); c.quadraticCurveTo(0, bot + R * .06, R * .5, bot - R * .04); c.lineTo(R * .74, top); c.ellipse(0, top, R * .74, R * .16, 0, 0, Math.PI); c.closePath(); };
    soft(c, R * .05, R * .0, R * .6, R * .12, .18);
    wall(); c.fillStyle = '#fff6fa'; c.fill();
    c.save(); wall(); c.clip(); for (let i = -4; i <= 4; i++) { c.fillStyle = i % 2 ? '#ff9ec2' : '#ffd0e2'; c.beginPath(); c.moveTo(i * R * .2 - R * .07, top - R * .3); c.lineTo(i * R * .2 + R * .07, top - R * .3); c.lineTo(i * R * .14 + R * .05, bot + R * .2); c.lineTo(i * R * .14 - R * .05, bot + R * .2); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-R * .62, top, R * .14, R * 1.2); c.fillStyle = 'rgba(150,40,80,.12)'; c.fillRect(R * .4, top, R * .4, R * 1.2); c.restore();
    wall(); edge(c, '#d0457c', R * .025);
    c.strokeStyle = '#fff'; c.lineWidth = R * .07; c.beginPath(); c.ellipse(0, top, R * .74, R * .16, 0, .05, Math.PI - .05); c.stroke();
  }
  // a little plastic spoon stuck in the cup (drawn behind the scoops, so only its handle shows)
  function cupSpoon(c, R) { c.save(); c.translate(R * .22, -R * 1.2); c.rotate(.62); box(c, -R * .055, -R * 1.6, R * .11, R * 1.5, '#7fd0f5', R * .055); box(c, -R * .025, -R * 1.52, R * .035, R * 1.3, 'rgba(255,255,255,.6)', R * .017); ell(c, 0, 0, R * .15, R * .21, '#7fd0f5'); c.strokeStyle = '#4fb2e0'; c.lineWidth = R * .02; c.beginPath(); c.roundRect ? c.roundRect(-R * .055, -R * 1.6, R * .11, R * 1.5, R * .055) : 0; c.stroke(); c.restore(); }
  function drawIceCream(c, p, R) {
    const sp = spots(p), cup = p.holder === 'cup';
    if (!p.eatOnly) { if (cup) { cupBack(c, R); if (sp.length) cupSpoon(c, R); } else { coneStand(c, R, false); drawCone(c, R); coneStand(c, R, true); } }
    // a couple of melty drips running down from the first scoop (homemade ice cream is soft)
    if (!cup && sp.length) { const col = ICE[p.scoops[0].f] || ICE.vanilla; for (const [x, l] of [[-.32, .5], [.26, .34]]) { c.fillStyle = shade(col, -.06); c.beginPath(); c.moveTo((x - .08) * R, -R * 2.12); c.lineTo((x - .06) * R, -R * (2.12 - l)); c.arc(x * R, -R * (2.12 - l), R * .065, Math.PI, 0, true); c.lineTo((x + .08) * R, -R * 2.12); c.closePath(); c.fill(); circ(c, (x - .02) * R, -R * (2.14 - l), R * .02, 'rgba(255,255,255,.6)'); } }
    p.scoops.forEach((s, i) => { const q = sp[i]; if (!q) return; const lift = (s.drop || 0) * R * 1.4; c.save(); c.globalAlpha = 1 - (s.drop || 0) * .5; drawScoopAt(c, q[0] * R, q[1] * R - lift, q[2] * R, s.f, i * 13 + 3); c.restore(); });
    if (cup && !p.eatOnly) cupFront(c, R);
  }
  // The kitchen sizes a food on its plate from its height, but never smaller than U * .1 per unit, so on a short wide screen three scoops
  // on a cone would poke out of the top of the board. The ice cream then shrinks itself (p.k) to fit; everything below measures with ku(p).
  const HEAD = .7;   // room above the top scoop (in scoop units) so a cherry on top stays inside the board
  const ku = p => (p && p.k) || 1;
  function fitK(g, p) { if (!p || !g.foodBase) return; const room = g.foodBase().y - g.y0 - 10, need = (topOf(p) + HEAD + .06) * g.U * .1; p.k = need > room ? Math.max(.5, room / need) : 1; }
  EXTRA.icecream = {
    draw: (c, p, R) => drawIceCream(c, p, R * ku(p)),
    height: (p, R) => (topOf(p) + HEAD) * R * ku(p),
    box: p => { const k = ku(p); return { hw: (p.holder === 'cup' ? 1.02 : .8) * k, a: (topOf(p) + .1) * k, b: .18 * k }; },
    touch: p => { const k = ku(p); return { hw: (p.holder === 'cup' ? 1.0 : .82) * k, y0: -(topOf(p) + .1) * k, y1: .1 * k }; }
  };
  if (!FLAT.includes('icecream')) FLAT.push('icecream');
  if (KIT.CRUMB) KIT.CRUMB.icecream = ['#fff2cc', '#e9b06a'];
  if (KIT.BITES) KIT.BITES.icecream = 4;

  /* ---------------------------------------------------------------- layout */
  const isTall = g => g.SH > g.w * .75;
  // the lowest a tall picture should reach: above the chef's thought bubble, which sits over the bottom of the board on tall screens
  const floorY = g => { const ch = g.chefPos ? g.chefPos() : null; return ch ? Math.min(g.y1 - 10, ch.y - ch.r * 2.95 - 8) : g.y1 - 10; };
  // A bag in the middle with things beside it (wide screens: some on the left, some on the right) or in a row above it (tall screens).
  function lay(g, n, asp) {
    const w = g.w, SH = g.SH, y0 = g.y0, y1 = g.y1, U = g.U;
    if (isTall(g)) {
      const gap = w * .94 / Math.max(n, 2), s = Math.min(gap * .84, SH * .23, U * .3), iy = y0 + s * .5 + 8, items = [];
      for (let i = 0; i < n; i++) items.push({ x: g.bx + (i - (n - 1) / 2) * gap, y: iy, s });
      const top = iy + s * .85 + 16, ah = floorY(g) - top, W = Math.min(w * .62, ah * asp), Hh = W / asp;
      return { tall: true, items, bag: { x: g.bx, y: top + ah / 2 + (ah - Hh) * .2, W, H: Hh } };
    }
    // wide: the bag in the middle of the board; the things beside it, stacked on the board when there is room, else in a row on the counter
    const Hh = Math.min(SH * .7, w * .3 / asp), W = Hh * asp, bag = { x: g.bx, y: g.by + SH * .03, W, H: Hh }, items = [];
    const nl = Math.ceil(n / 2), nr = n - nl, bw = Math.min(w * .94, SH * 1.7), side = bw / 2 * .93 - W / 2 - 8;
    const s1 = Math.min(side * .82, SH * .9 / (nl * 1.45), U * .3), side2 = (w - W) / 2 - 16, cell = side2 / Math.max(nl, 1), s2 = Math.min(cell * .82, SH * .42, U * .3);
    if (s1 >= s2 * .8) {
      const s = s1, rh = Math.min(SH * .92 / nl, s * 1.6), col = (k, m, sx) => { for (let i = 0; i < m; i++) items.push({ x: bag.x + sx * (W / 2 + 8 + side / 2), y: g.by - s * .15 + (i - (m - 1) / 2) * rh, s }); };
      col(0, nl, -1); col(0, nr, 1); return { tall: false, items, bag };
    }
    const s = s2, iy = g.by - s * .15 + SH * .04;
    for (let i = 0; i < nl; i++) items.push({ x: bag.x - W / 2 - 16 - cell * (nl - i - .5), y: iy, s });
    for (let j = 0; j < nr; j++) items.push({ x: bag.x + W / 2 + 16 + cell * (j + .5), y: iy, s });
    return { tall: false, items, bag };
  }
  const inRect = (b, p, k = 1) => Math.abs(p.x - b.x) < b.W / 2 * k && Math.abs(p.y - b.y) < b.H / 2 * k;
  const LITTLE = .82, BIG = .88;   // width : height of the bags

  /* ---------------------------------------------------------------- tools that pour: lifted to the bag, tipped, put back */
  // A move: from where it starts, to the place above the bag, tipped by `tip` (the lip on the side of the bag goes down), back home.
  const UP = .4, DOWN = .4;
  function toolAt(m) {
    const t = m.t, b = m.dur - DOWN;
    if (t < UP) { const u = ease(t / UP); return { x: lerp(m.from.x, m.to.x, u), y: lerp(m.from.y, m.to.y, u) - Math.sin(u * Math.PI) * m.lift, tilt: 0 }; }
    if (t > b) { const u = ease(clamp((t - b) / DOWN, 0, 1)); return { x: lerp(m.to.x, m.home.x, u), y: lerp(m.to.y, m.home.y, u) - Math.sin(u * Math.PI) * m.lift, tilt: 0 }; }
    const k = clamp(Math.min((t - UP) / .25, (b - t) / .25), 0, 1); return { x: m.to.x, y: m.to.y, tilt: ease(k) * m.tip };
  }
  const pouring = m => m.t > UP + .2 && m.t < m.dur - DOWN - .12;
  function runMove(m, dt) { m.t += dt; while (m.ei < m.ev.length && m.t >= m.ev[m.ei][0]) m.ev[m.ei++][1](); return m.t >= m.dur; }
  // a tool drawn at (x, y): mirrored when the bag is to its right, so the end that pours is always on the bag's side
  function drawTool(c, kind, x, y, s, tilt, side, fill, col) {
    c.save(); c.translate(x, y); if (side > 0) c.scale(-1, 1); c.rotate(-tilt);
    if (kind === 'half') drawMeasure(c, 'half', s, fill, col, 0);
    else if (kind === 'tbsp') drawMeasure(c, 'tbsp', s, fill, col, 0);
    else if (kind === 'scoop') drawIceScoop(c, s, fill > .5);
    c.restore();
  }
  // where the pouring end of a tool is on the screen
  function lipOf(kind, x, y, s, tilt, side) {
    const L = kind === 'half' ? [-s * .24, -s * .25] : kind === 'tbsp' ? [-s * .3, 0] : [-s * .36, 0];
    const a = -tilt, X = L[0] * Math.cos(a) - L[1] * Math.sin(a), Y = L[0] * Math.sin(a) + L[1] * Math.cos(a);
    return { x: x + (side > 0 ? -X : X), y: y + Y };
  }

  /* ---------------------------------------------------------------- shared zipper behaviour */
  // n teeth; v = how shut each one looks (it animates toward its target t); a finger sliding along the top shuts (or opens) the teeth under it
  const Zip = {
    make(n = 10, shut = 0) { return { n, t: Array(n).fill(shut), v: Array(n).fill(shut), on: false, last: null, moved: 0, done: false }; },
    seg(b, x, y) { const u = (x - (b.x - b.W / 2)) / b.W, top = b.y - b.H / 2; if (u < -.08 || u > 1.08 || y < top - b.H * .2 || y > top + b.H * .34) return -1; return clamp(Math.floor(u * 10), 0, 9); },
    set(z, i, shut) { if (i < 0 || i >= z.n || z.t[i] === (shut ? 1 : 0)) return false; z.t[i] = shut ? 1 : 0; SND.tooth(shut ? i : z.n - 1 - i, !shut); return true; },
    // a finger from the last point to p: every tooth it passes over
    stroke(g, z, b, p, shut) {
      const a = z.last || p, d = Math.hypot(p.x - a.x, p.y - a.y), n = Math.max(1, Math.ceil(d / (b.W / 30))); let any = 0;
      for (let k = 0; k <= n; k++) { const x = lerp(a.x, p.x, k / n), y = lerp(a.y, p.y, k / n), i = Zip.seg(b, x, y); if (i >= 0 && Zip.set(z, i, shut)) { any++; g.fx.burst(b.x - b.W / 2 + (i + .5) * b.W / 10, b.y - b.H / 2 + b.H * .04, 3, { colors: shut ? ['#7ed957', '#fff'] : ['#ffd23f', '#58a8ec'], speed: 70, g: 120, life: .35, size: 3, shape: 'star' }); } }
      z.last = { x: p.x, y: p.y }; return any;
    },
    tap(g, z, b, p, shut) { const i = Zip.seg(b, p.x, p.y); if (i < 0) return 0; let any = 0; for (const j of [i - 1, i, i + 1]) if (Zip.set(z, j, shut)) any++; return any; },
    update(z, dt) { for (let i = 0; i < z.n; i++) z.v[i] = z.v[i] < z.t[i] ? Math.min(z.t[i], z.v[i] + dt * 7) : Math.max(z.t[i], z.v[i] - dt * 7); },
    all: (z, shut) => z.t.every(v => v === (shut ? 1 : 0)),
    // the next tooth to shut (or open) when she needs help: from the left
    next: (z, shut) => z.t.findIndex(v => v !== (shut ? 1 : 0)),
    // a ghost finger sliding along the zipper
    hint(g, c, b, shut, t) { const u = (t * .45) % 1.25; if (u > 1) return; const x = b.x - b.W / 2 + b.W * (.06 + u * .88), y = b.y - b.H / 2 + b.H * .04; ghostFinger(c, x, y, Math.max(12, b.W * .055), Math.sin(u / 1 * Math.PI) * .9); },
    autoPath(b) { const y = b.y - b.H / 2 + b.H * .04, pts = []; for (let i = 0; i <= 10; i++) pts.push([b.x - b.W / 2 + b.W * (.02 + i * .096), y]); return pts; }
  };

  /* ---------------------------------------------------------------- the things on the counter, and touching them */
  function drawThing(c, id, it, q, g, s, alpha = 1) {
    const S = q.s, x = q.x + (it.off || 0), y = q.y + (it.offY || 0), left = it.n - it.done; if (alpha <= .01) return;
    c.save(); c.globalAlpha = alpha;
    if (it.glow > .02) { c.save(); c.globalAlpha = alpha * it.glow * .55; c.fillStyle = '#ffe066'; c.beginPath(); c.ellipse(x, y + S * .05, S * .66, S * .58, 0, 0, TAU); c.fill(); c.restore(); }
    const k = 1 + (it.wig || 0) * Math.sin(g.t * 30) * .04 + (it.glow || 0) * Math.sin(g.t * 7) * .03;
    c.save(); c.translate(x, y); c.scale(k, k);
    if (id === 'cream') { c.save(); c.translate(-S * .16, -S * .04); drawCarton(c, S * .9); c.restore(); }
    else if (id === 'sugar') { c.save(); c.translate(-S * .14, -S * .02); drawPile(c, 'sugar', 1, S * .88); c.restore(); }
    else if (id === 'vanilla') { c.save(); c.translate(-S * .14, 0); drawVanilla(c, S * .95); c.restore(); }
    else if (id === 'strawb') drawBerryBowl(c, S * .95, Math.max(0, left - (it.pend || 0)));
    else if (id === 'cocoa') { c.save(); c.translate(-S * .14, -S * .02); drawCocoa(c, S * .82, left > 0 ? 1 : .4); c.restore(); }
    else if (id === 'chips') { c.save(); c.translate(-S * .12, 0); drawPile(c, 'chips', 1, S * .9); c.restore(); }
    else if (id === 'ice') { c.save(); c.translate(-S * .12, 0); drawBucket(c, S * .92, left); c.restore(); }
    else if (id === 'salt') { c.save(); c.translate(-S * .16, 0); drawSaltTub(c, S * .86); c.restore(); }
    c.restore();
    // the tool waiting in front (unless it is away pouring or in her hand)
    if (!it.away && left > 0) { const tk = TOOLK[id]; if (tk === 'dropper') { c.save(); c.translate(x + S * .26, y + S * .02); c.rotate(.25); drawDropper(c, S * .62, 0, .5); c.restore(); }
      else if (tk) drawTool(c, tk, x + S * .27, y + S * .26, S * TOOLS[tk], 0, -1, 1, FILLC[id]); }
    // how much: the amount, and a dot for each one (green when it is in)
    const fs = Math.max(13, S * .15); c.save(); c.font = `700 ${fs}px ${CA.FF}`; const tw = c.measureText(it.lab).width; c.restore();
    fancyText(c, it.lab, x, y + S * .6, fs * Math.min(1, S * 1.25 / tw), { stroke: '#7a3b5a', outline: .25 });
    if (it.n > 1) { const dr = Math.max(3.5, S * .035); for (let i = 0; i < it.n; i++) { c.fillStyle = i < it.done ? '#7ed957' : '#ffb3d1'; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + (i - (it.n - 1) / 2) * dr * 2.8, y + S * .76, dr, 0, TAU); c.fill(); c.stroke(); } }
    c.restore();
  }
  const TOOLK = { cream: 'half', sugar: 'tbsp', vanilla: 'dropper', cocoa: 'tbsp', chips: 'tbsp', ice: 'scoop', salt: 'half' };
  const TOOLS = { half: .5, tbsp: .62, scoop: .62 };
  const FILLC = { cream: '#fffbf2', sugar: '#ffffff', cocoa: '#6e3f24', chips: '#4a2a1a', salt: '#f4f8ff' };
  const thingHit = (q, p) => Math.hypot(p.x - q.x, p.y - (q.y + q.s * .1)) < q.s * .66;
  const mkThing = (id, P) => ({ id, n: P[id], done: 0, pend: 0, lab: label(id, P), glow: 0, wig: 0, a: 1, off: 0 });
  // things on the counter: glow when it is their turn and she has waited a little; slide in and out
  function updThings(g, list, dt, want) { for (const it of list) { it.glow = lerp(it.glow, want(it) && g.idle > 4 ? 1 : 0, Math.min(1, dt * 5)); it.wig = Math.max(0, (it.wig || 0) - dt * 2.5); } }

  // falling bits (sugar, cocoa, salt, chips, drops of vanilla) in screen space, from a lip down to a level
  function addBits(s, x, y, toY, col, n, size, kind) { for (let i = 0; i < n; i++) s.parts.push({ x: x + (Math.random() - .5) * size * 2, y: y + Math.random() * size, vx: (Math.random() - .5) * size * 3, vy: 40 + Math.random() * 60, toY: toY + (Math.random() - .5) * size * 3, col, r: size * (.5 + Math.random() * .6), kind, rot: Math.random() * 3 }); }
  function updBits(s, dt) { for (const q of s.parts) { q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * 6; if (q.y >= q.toY) q.dead = true; } s.parts = s.parts.filter(q => !q.dead); }
  function drawBits(c, s) {
    for (const q of s.parts) {
      if (q.kind === 'chip') tri(c, [[q.x, q.y - q.r], [q.x + q.r * .9, q.y + q.r * .6], [q.x - q.r * .9, q.y + q.r * .6]], q.col);
      else if (q.kind === 'grain') { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.fillStyle = q.col; c.fillRect(-q.r / 2, -q.r / 2, q.r, q.r); c.strokeStyle = 'rgba(140,165,200,.7)'; c.lineWidth = 1; c.strokeRect(-q.r / 2, -q.r / 2, q.r, q.r); c.restore(); }
      else if (q.kind === 'drop') { c.fillStyle = q.col; c.beginPath(); c.moveTo(q.x, q.y - q.r * 1.8); c.quadraticCurveTo(q.x + q.r, q.y, q.x, q.y + q.r); c.quadraticCurveTo(q.x - q.r, q.y, q.x, q.y - q.r * 1.8); c.fill(); }
      else circ(c, q.x, q.y, q.r, q.col);
    }
  }
  // a pour stream from a lip down into the bag
  function stream(c, a, toY, col, w, t) {
    c.save(); c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = w; c.globalAlpha = .95;
    c.beginPath(); c.moveTo(a.x, a.y); c.bezierCurveTo(a.x, a.y + (toY - a.y) * .3, a.x + Math.sin(t * 9) * w * .3, a.y + (toY - a.y) * .7, a.x, toY); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = w * .3; c.beginPath(); c.moveTo(a.x - w * .15, a.y + w); c.lineTo(a.x - w * .15, a.y + (toY - a.y) * .8); c.stroke(); c.restore();
  }
  // a finger that went away without being lifted (the game paused, another screen came up): let go of whatever it held
  function lost(g, s) {
    if (g.free) return;
    if (s.hold) { if (s.hold.dx != null) s.back = { x: s.hold.x + s.hold.dx, y: s.hold.y + s.hold.dy, t: 0 }; s.hold = null; }
    s.grab = null; if (s.z && s.z.on) { s.z.on = false; s.z.last = null; }
  }
  const later = (s, g, d, fn) => (s.later || (s.later = [])).push({ at: g.t + d, fn });
  function runLater(s, g) { if (!s.later) return; const due = s.later.filter(x => g.t >= x.at); s.later = s.later.filter(x => g.t < x.at); for (const x of due) x.fn(); }
  // an instruction said once, at its moment (it waits for the counting to finish)
  const sayOnce = (g, s, key, d = 0) => { s.saidK = s.saidK || {}; if (s.saidK[key]) return; s.saidK[key] = true; if (d) later(s, g, d, () => voice.say(key)); else voice.say(key); };

  /* ================================================================ step 1: measure into the little bag (and pick a flavour) */
  // The little bag stands open. Cream (½ cup at a time), sugar (tablespoons) and drops of vanilla go in: touch (or drag) each one and its
  // measuring cup, spoon or dropper goes over the bag, tips and pours. Then three flavours slide in; she picks one and adds it too.
  H.icbag = {
    enter(g, s) {
      const ic = g.ic = fresh(); s.ph = 'base'; s.items = BASE.map(id => mkThing(id, ic.plan)); s.flv = null; s.mo = null; s.q = []; s.parts = []; s.fillV = 0; s.wob = 0; s.done = 0;
    },
    L: g => lay(g, 3, LITTLE),
    list: s => (s.ph === 'base' ? s.items : s.flv || []),
    down(g, s, p) {
      const L = H.icbag.L(g), list = H.icbag.list(s);
      for (let i = 0; i < list.length; i++) {
        const it = list[i], q = L.items[i]; if (!it || it.out || it.a < .9 || !thingHit(q, p)) continue;
        if (s.ph === 'pick') { H.icbag.pick(g, s, i); return; }
        if (it.done + it.pend >= it.n) { it.wig = 1; return; }
        g.hear(HEAR[it.id]); sfx.tap(); s.hold = { it, i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: 0 }; return;
      }
      if (inRect(L.bag, p)) { s.wob = 1; SND.crinkle(); }
    },
    move(g, s, p) { const h = s.hold; if (!h) return; h.x = p.x; h.y = p.y; h.moved = Math.max(h.moved, Math.hypot(p.x - h.sx, p.y - h.sy)); },
    up(g, s, p) {
      const h = s.hold; if (!h) return; s.hold = null; const L = H.icbag.L(g);
      if (h.moved < 24 || inRect(L.bag, h, 1.3)) H.icbag.use(g, s, h.it, h.i, h.moved < 24 ? null : { x: h.x, y: h.y });
    },
    use(g, s, it, i, from) { if (it.done + it.pend >= it.n || s.ph === 'pick' || s.ph === 'end') return; it.pend++; s.q.push({ it, i, from }); },
    pick(g, s, i) {
      const it = s.flv[i]; s.ph = 'flavor'; s.pickI = i; g.ic.flavor = FLAVOR[it.id]; g.hear(HEAR[it.id]); sfx.pop(); it.wig = 1;
      s.flv.forEach((o, j) => { if (j !== i) o.out = 1e-3; });
      const q = H.icbag.L(g).items[i]; g.fx.burst(q.x, q.y, 14, { colors: ['#ffd54a', '#fff', '#ff9ec8'], speed: 180, g: 260, life: .6, size: 6, shape: 'star' });
    },
    start(g, s, job) {
      const L = H.icbag.L(g), it = job.it, q = L.items[job.i], b = L.bag, side = q.x <= b.x ? 1 : -1, id = it.id, tk = TOOLK[id], U = g.U, top = b.y - b.H / 2;
      const ic = g.ic, lvlY = () => b.y + b.H / 2 - liqOf(ic).fill * b.H * .82 - b.H * .02;
      const land = () => { it.done++; it.pend--; if (s.ph === 'base') ic.got[id]++; else ic.got.flav++; s.wob = .6; if (id === 'cocoa') s.swT = g.t;
        g.fx.burst(b.x, lvlY(), 10, { colors: [FILLC[id] || '#fff', '#fff'], speed: 120, g: 300, life: .45, size: 4 });
        if (it.n > 1) voice.say('num/' + it.done); H.icbag.after(g, s); };
      it.away = true;
      if (tk === 'dropper') {   // the dropper goes over the bag; each drop is a squeeze
        const S = q.s * .62, home = { x: q.x + q.s * .26, y: q.y + q.s * .02 }, to = { x: b.x + side * -b.W * .06, y: top - S * .35 };
        s.mo = { kind: 'drop', id, it, S, from: job.from || home, home, to, t: 0, drops: 1, k: 0, sq: 0, side };
        return;
      }
      if (id === 'strawb') {   // a strawberry half flies over and plops in
        const from = job.from || { x: q.x, y: q.y - q.s * .05 }; s.mo = { kind: 'berry', id, it, from, to: { x: b.x + (Math.random() - .5) * b.W * .3, y: lvlY() }, t: 0, dur: .6, r: q.s * .15, ev: [], ei: 0 };
        s.mo.ev.push([.6, () => { SND.splash(); land(); }]); return;
      }
      const S = q.s * TOOLS[tk], home = { x: q.x + q.s * .27, y: q.y + q.s * .26 }, to = { x: b.x - side * b.W * .22, y: top - S * .42 };
      const m = { kind: 'pour', id, it, tk, S, from: job.from || home, home, to, side, lift: U * .08, tip: tk === 'half' ? 1.9 : 1.15, dur: tk === 'half' ? 1.9 : 1.6, t: 0, ev: [], ei: 0, col: FILLC[id] };
      m.ev.push([UP + .22, () => { if (id === 'cream') sfx.water(); else if (id === 'chips') SND.cubes(1); else SND.grains(); }]);
      m.ev.push([m.dur - DOWN - .16, land]);
      s.mo = m;
    },
    after(g, s) {
      const list = H.icbag.list(s);
      if (s.ph === 'base' && s.items.every(it => it.done >= it.n)) {   // the base is in: the flavours slide in
        s.ph = 'pick'; for (const it of s.items) it.out = 1e-3;
        s.flv = FLAVS.map(id => ({ ...mkThing(id, g.ic.plan), a: 0, off: 0 }));
        sayOnce(g, s, 'ic-flavor', 1.1); g.chefBounce = 1;
      } else if (s.ph === 'flavor' && list[s.pickI] && list[s.pickI].done >= list[s.pickI].n) { s.ph = 'end'; g.fx.burst(H.icbag.L(g).bag.x, H.icbag.L(g).bag.y, 22, { colors: ['#ffd54a', '#fff', '#ff9ec8'], speed: 260, g: 260, life: .8, size: 6, shape: 'star' }); sfx.chime(); g.finish(1.2); }
    },
    update(g, s, dt) {
      lost(g, s);
      runLater(s, g); updBits(s, dt); s.wob = Math.max(0, s.wob - dt * 2);
      const list = H.icbag.list(s), L = H.icbag.L(g);
      for (const it of s.items.concat(s.flv || [])) { if (it.out) it.out = Math.min(1, it.out + dt * 2.5); if (it.a < 1) it.a = Math.min(1, it.a + dt * 2.2); }
      updThings(g, list, dt, it => !it.out && it.done + it.pend < it.n && (s.ph === 'pick' || !s.mo));
      s.fillV = lerp(s.fillV, liqOf(g.ic).fill, Math.min(1, dt * 4));
      // run the current motion; start the next one
      const m = s.mo;
      if (m) {
        if (m.kind === 'drop') {
          m.t += dt; const b = L.bag;
          if (m.t > UP && m.k < m.drops && !m.falling) { m.sq = Math.min(1, m.sq + dt * 6); if (m.sq >= 1) { m.falling = { y: m.to.y + m.S * .4, vy: 60 }; } }
          else m.sq = Math.max(0, m.sq - dt * 5);
          if (m.falling) { const f = m.falling; f.vy += 1400 * dt; f.y += f.vy * dt; const lv = b.y + b.H / 2 - s.fillV * b.H * .82 - b.H * .02; if (f.y >= lv) { m.falling = null; m.k++; SND.drip(); m.it.done++; m.it.pend--; g.ic.got.vanilla++; s.wob = .3; g.fx.burst(m.to.x, lv, 6, { colors: ['#7a3e18', '#fff'], speed: 80, g: 300, life: .35, size: 3 }); if (m.it.n > 1) voice.say('num/' + m.it.done); H.icbag.after(g, s); m.idleT = 0; } }
          // more drops asked for while it is over the bag go straight on
          while (s.q.length && s.q[0].it === m.it) { s.q.shift(); m.drops++; }
          if (m.k >= m.drops && !m.falling) { m.idleT = (m.idleT || 0) + dt; if (m.idleT > .55 && !m.back) { m.back = { t: 0 }; } }
          if (m.back) { m.back.t += dt; if (m.back.t >= DOWN) { m.it.away = false; s.mo = null; } }
        } else if (m.kind === 'berry') { if (runMove(m, dt)) { m.it.away = false; s.mo = null; } }
        else if (runMove(m, dt)) { m.it.away = false; s.mo = null; }
        if (m.kind === 'pour' && pouring(m)) {   // sugar, cocoa and chips fall from the spoon
          const a = toolAt(m), lip = lipOf(m.tk, a.x, a.y, m.S, a.tilt, m.side), lv = L.bag.y + L.bag.H / 2 - s.fillV * L.bag.H * .82;
          if (m.id !== 'cream' && Math.random() < dt * 40) addBits(s, lip.x, lip.y, lv, m.id === 'chips' ? '#4a2a1a' : m.col, 1, m.id === 'chips' ? m.S * .06 : m.S * .03, m.id === 'chips' ? 'chip' : m.id === 'sugar' ? 'grain' : 'dot');
        }
      }
      if (!s.mo && s.q.length) H.icbag.start(g, s, s.q.shift());
    },
    draw(g, s, c) {
      g.sceneBoard(c);
      const L = H.icbag.L(g), b = L.bag, ic = g.ic, m = s.mo, wob = Math.sin(g.t * 18) * s.wob * .025;
      const swirl = s.swT != null ? clamp(1 - (g.t - s.swT) / 1.8, 0, 1) : 0;
      drawBag(c, b, { ...littleLook(g, ic, { zv: Array(10).fill(0), gap: b.H * OPEN, fill: s.fillV, slosh: wob * 4, swirl }), rot: wob, label: true });
      // the things on the counter
      const draw = (list, out) => list.forEach((it, i) => { const q = L.items[i]; if (!q) return; const o = it.out ? ease(it.out) : 0, a = it.a < 1 ? ease(it.a) : 1, dir = L.tall ? (q.x < g.bx ? -1 : 1) : (q.x < b.x ? -1 : 1);
        it.off = dir * (o * g.w * .55 + (1 - a) * g.w * .45); drawThing(c, it.id, it, q, g, s, (1 - o) * a); });
      draw(s.items); if (s.flv) draw(s.flv);
      // what she is holding
      const h = s.hold; if (h && h.moved > 6) { const it = h.it, tk = TOOLK[it.id], S = L.items[h.i].s; if (tk === 'dropper') { c.save(); c.translate(h.x, h.y); drawDropper(c, S * .62, 0, .5); c.restore(); } else if (tk) drawTool(c, tk, h.x, h.y, S * TOOLS[tk] * 1.15, 0, h.x < b.x ? 1 : -1, 1, FILLC[it.id]); else if (it.id === 'strawb') berryHalf(c, h.x, h.y, S * .17, 0); }
      // the motion
      if (m && m.kind === 'pour') {
        const a = toolAt(m), lv = b.y + b.H / 2 - s.fillV * b.H * .82;
        if (m.id === 'cream' && pouring(m)) stream(c, lipOf(m.tk, a.x, a.y, m.S, a.tilt, m.side), lv, '#fffbf2', Math.max(4, m.S * .07), g.t);
        const fill = m.t < UP + .2 ? 1 : clamp(1 - (m.t - UP - .2) / (m.dur - DOWN - UP - .35), 0, 1);
        drawTool(c, m.tk, a.x, a.y, m.S, a.tilt, m.side, fill, m.col);
      } else if (m && m.kind === 'drop') {
        let x = m.to.x, y = m.to.y; if (m.t < UP) { const u = ease(m.t / UP); x = lerp(m.from.x, m.to.x, u); y = lerp(m.from.y, m.to.y, u) - Math.sin(u * Math.PI) * g.U * .08; } if (m.back) { const u = ease(clamp(m.back.t / DOWN, 0, 1)); x = lerp(m.to.x, m.home.x, u); y = lerp(m.to.y, m.home.y, u) - Math.sin(u * Math.PI) * g.U * .08; }
        if (m.falling) { const r = m.S * .05; c.fillStyle = '#7a3e18'; c.beginPath(); c.moveTo(x, m.falling.y - r * 1.8); c.quadraticCurveTo(x + r, m.falling.y, x, m.falling.y + r); c.quadraticCurveTo(x - r, m.falling.y, x, m.falling.y - r * 1.8); c.fill(); }
        else if (m.sq > .3 && !m.back) { const r = m.S * .04 * m.sq; circ(c, x, y + m.S * .42 + r, r, '#7a3e18'); }
        c.save(); c.translate(x, y); drawDropper(c, m.S, m.sq, .5 - m.k * .04); c.restore();
      } else if (m && m.kind === 'berry') { const u = ease(clamp(m.t / m.dur, 0, 1)), x = lerp(m.from.x, m.to.x, u), y = lerp(m.from.y, m.to.y, u) - Math.sin(u * Math.PI) * g.U * .16; berryHalf(c, x, y, m.r, u * 6); }
      drawBits(c, s);
      // the first time: a finger shows that the things are to be touched
      if (!g.st.touched && g.idle > 2.5 && !s.mo) { const list = H.icbag.list(s), i = list.findIndex(it => !it.out && it.done + it.pend < it.n); const q = L.items[i]; if (q) drawTapHint(c, q.x, q.y - q.s * .38, g.U * .08, g.t); }
    },
    hint: (g, s) => (s.ph === 'base' ? 'ic-add' : s.ph === 'pick' ? 'ic-flavor' : null),
    tip(g, s) { const list = H.icbag.list(s); if (s.ph === 'pick') return FLAVS[Math.floor(g.t / 2.5) % 3]; const it = list.find(x => !x.out && x.done + x.pend < x.n); return it ? it.id : null; },
    auto(g, s) {
      const m = s.mo; if (m && m.kind === 'drop' && !m.back && !s.q.length && m.it.done + m.it.pend < m.it.n) { const q = H.icbag.L(g).items[s.items.indexOf(m.it)]; if (q) return { tap: [q.x, q.y], wait: 150 }; }   // more drops while the dropper is over the bag
      if (s.mo || s.q.length || s.hold) return { wait: 250 };
      const L = H.icbag.L(g), list = H.icbag.list(s);
      if (s.ph === 'pick') { if (list.some(it => it.a < .95)) return { wait: 200 }; const i = Math.floor(Math.random() * 3), q = L.items[i]; return { tap: [q.x, q.y], wait: 400 }; }
      const i = list.findIndex(it => !it.out && it.done + it.pend < it.n); if (i < 0) return { wait: 300 };
      const q = L.items[i]; return i % 2 ? { drag: [[q.x, q.y], [L.bag.x, L.bag.y]], steps: 6, wait: 200 } : { tap: [q.x, q.y], wait: 200 };
    }
  };

  /* ================================================================ step 2: close the little bag (slide a finger along the zipper) */
  H.iczip = {
    enter(g, s) { s.z = Zip.make(10, 0); s.puff = 0; s.helpT = 0; },
    B(g) { if (isTall(g)) { const top = g.y0 + g.SH * .1, ah = floorY(g) - top, W = Math.min(g.w * .66, ah * LITTLE), Hh = W / LITTLE; return { x: g.bx, y: top + ah / 2, W, H: Hh }; } const Hh = Math.min(g.SH * .76, g.w * .4 / LITTLE), W = Hh * LITTLE; return { x: g.bx, y: g.by + g.SH * .03, W, H: Hh }; },
    down(g, s, p) { s.z.on = true; s.z.last = { x: p.x, y: p.y }; s.z.moved = 0; s.z.p0 = { x: p.x, y: p.y }; Zip.stroke(g, s.z, H.iczip.B(g), p, true); H.iczip.check(g, s); },
    move(g, s, p) { if (!s.z.on) return; s.z.moved = Math.max(s.z.moved, Math.hypot(p.x - s.z.p0.x, p.y - s.z.p0.y)); Zip.stroke(g, s.z, H.iczip.B(g), p, true); H.iczip.check(g, s); },
    up(g, s, p) { const z = s.z; if (!z.on) return; z.on = false; z.last = null; if (z.moved < 12) { Zip.tap(g, z, H.iczip.B(g), p, true); H.iczip.check(g, s); } },
    check(g, s) { if (s.z.done || !Zip.all(s.z, true)) return; s.z.done = true; s.puff = 1; SND.sealed(); const b = H.iczip.B(g); g.fx.burst(b.x, b.y - b.H / 2, 20, { colors: ['#7ed957', '#fff', '#ffd54a'], speed: 220, g: 200, life: .7, size: 6, shape: 'star' }); g.finish(1.1); },
    update(g, s, dt) {
      lost(g, s);
      Zip.update(s.z, dt); s.puff = Math.max(0, s.puff - dt * 2);
      // help: after a while with nothing touched, the zipper closes itself, slowly, one tooth at a time
      if (!s.z.done && g.idle > 10) { s.helpT += dt; if (s.helpT > .4) { s.helpT = 0; Zip.set(s.z, Zip.next(s.z, true), true); H.iczip.check(g, s); } }
    },
    draw(g, s, c) {
      g.sceneBoard(c); const b = H.iczip.B(g), k = 1 + Math.sin(s.puff * Math.PI) * .04;
      drawBag(c, { ...b, W: b.W * k }, littleLook(g, g.ic || IC(g), { zv: s.z.v, gap: b.H * OPEN, slosh: 0 }));
      if (!s.z.done && g.idle > 2.5 && !s.z.on) Zip.hint(g, c, b, true, g.t);
    },
    hint: () => 'ic-zip',
    tip: () => 'zip',
    auto(g, s) { return s.z.done ? { wait: 300 } : { drag: Zip.autoPath(H.iczip.B(g)), steps: 3, wait: 300 }; }
  };

  /* ================================================================ step 3: fill the big bag with ice, then salt */
  H.icice = {
    enter(g, s) {
      const ic = IC(g); ic.cubes = 0; ic.salt = 0; s.ph = 'ice'; s.items = [mkThing('ice', ic.plan), mkThing('salt', ic.plan)]; s.items[1].a = 1; s.mo = null; s.q = []; s.parts = []; s.fall = []; s.wob = 0; s.sparkT = 0;
    },
    L: g => lay(g, 2, BIG),
    down(g, s, p) {
      const L = H.icice.L(g);
      for (let i = 0; i < 2; i++) { const it = s.items[i], q = L.items[i]; if (!thingHit(q, p)) continue;
        if ((i === 0) !== (s.ph === 'ice') || it.done + it.pend >= it.n) { it.wig = 1; if (s.ph === 'ice' && i === 1) s.items[0].glow = 1; return; }
        g.hear(HEAR[it.id]); sfx.tap(); s.hold = { it, i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: 0 }; return; }
      if (inRect(L.bag, p)) { s.wob = 1; SND.crinkle(); if (g.ic.cubes) SND.cubes(2); }
    },
    move: (g, s, p) => H.icbag.move(g, s, p),
    up(g, s, p) { const h = s.hold; if (!h) return; s.hold = null; const L = H.icice.L(g); if (h.moved < 24 || inRect(L.bag, h, 1.3)) { if (h.it.done + h.it.pend < h.it.n) { h.it.pend++; s.q.push({ it: h.it, i: h.i, from: h.moved < 24 ? null : { x: h.x, y: h.y } }); } } },
    start(g, s, job) {
      const L = H.icice.L(g), it = job.it, q = L.items[job.i], b = L.bag, side = q.x <= b.x ? 1 : -1, tk = TOOLK[it.id], S = q.s * TOOLS[tk], top = b.y - b.H / 2, ic = g.ic;
      const home = { x: q.x + q.s * .27, y: q.y + q.s * .26 }, to = { x: b.x - side * b.W * .2, y: top - S * .36 };
      const m = { kind: 'pour', id: it.id, it, tk, S, from: job.from || home, home, to, side, lift: g.U * .08, tip: tk === 'scoop' ? .95 : 1.9, dur: tk === 'scoop' ? 1.9 : 2.0, t: 0, ev: [], ei: 0, col: FILLC[it.id] };
      if (it.id === 'ice') {   // the scoop dips into the bucket first (clink), then the cubes tumble into the bag one by one
        m.dip = true; m.from = job.from || { x: q.x - q.s * .12, y: q.y - q.s * .2 }; SND.cubes(2);
        for (let k = 0; k < 5; k++) m.ev.push([UP + .25 + k * .09, () => { const G = geo(b.W, b.H), slot = cubeSlot(G, ic.cubes + s.fall.length), a = toolAt(m), lip = lipOf('scoop', a.x, a.y, m.S, a.tilt, m.side); s.fall.push({ x: lip.x, y: lip.y, vx: (b.x + slot.x - lip.x) * 1.6, vy: -40, slot, rot: Math.random() * 2, i: ic.cubes + s.fall.length }); }]);
        m.ev.push([m.dur - DOWN - .05, () => { it.done++; it.pend--; if (it.n > 1) voice.say('num/' + it.done); H.icice.after(g, s); }]);
      } else {
        m.ev.push([UP + .22, () => SND.grains()]);
        m.ev.push([m.dur - DOWN - .2, () => { it.done++; it.pend--; ic.salt = 1; s.sparkT = 1.6; SND.frost(0); setTimeout(() => SND.frost(2), 160); g.fx.burst(b.x, b.y + b.H * .1, 18, { colors: ['#ffffff', '#cfeaff', '#9fd4ff'], speed: 160, g: -60, life: 1.2, size: 6, shape: 'star' }); H.icice.after(g, s); }]);
      }
      it.away = true; s.mo = m;
    },
    after(g, s) {
      if (s.ph === 'ice' && s.items[0].done >= s.items[0].n) { s.ph = 'salt'; sayOnce(g, s, 'ic-salt', 1.0); g.chefBounce = 1; }
      else if (s.ph === 'salt' && s.items[1].done >= s.items[1].n) { s.ph = 'end'; later(s, g, .4, () => voice.say('ic-brr')); g.finish(1.8); }
    },
    update(g, s, dt) {
      lost(g, s);
      runLater(s, g); updBits(s, dt); s.wob = Math.max(0, s.wob - dt * 2); s.sparkT = Math.max(0, s.sparkT - dt);
      const L = H.icice.L(g), b = L.bag, ic = g.ic;
      updThings(g, s.items, dt, it => (it.id === 'ice') === (s.ph === 'ice') && it.done + it.pend < it.n && !s.mo);
      for (const it of s.items) it.wig = Math.max(0, it.wig - dt);
      // cubes falling into the bag land on the heap
      for (const f of s.fall) { f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.pow(.05, dt); f.rot += dt * 5; const ty = b.y + f.slot.y; if (f.y >= ty && f.vy > 0) { f.dead = true; ic.cubes++; SND.clink(1.2); SND.clink(.8, .05); s.wob = .5; } }
      s.fall = s.fall.filter(f => !f.dead);
      const m = s.mo; if (m) {
        if (runMove(m, dt) && !s.fall.length) { m.it.away = false; s.mo = null; }
        if (m.id === 'salt' && pouring(m) && Math.random() < dt * 60) { const a = toolAt(m), lip = lipOf('half', a.x, a.y, m.S, a.tilt, m.side), G = geo(b.W, b.H), topY = b.y + cubeSlot(G, Math.max(0, ic.cubes - 1)).y - G.W * .06; addBits(s, lip.x, lip.y, topY, '#ffffff', 1, Math.max(2, m.S * .035), 'grain'); }
      }
      if (!s.mo && s.q.length) H.icice.start(g, s, s.q.shift());
    },
    draw(g, s, c) {
      g.sceneBoard(c);
      const L = H.icice.L(g), b = L.bag, ic = g.ic, m = s.mo, wob = Math.sin(g.t * 18) * s.wob * .02;
      drawBag(c, b, { zv: Array(10).fill(0), gap: b.H * OPEN, rot: wob, bulge: ic.cubes / 20 * .6, frost: ic.salt ? .25 + .25 * (1 - s.sparkT / 1.6) : 0, inner: bigInner(g, ic) });
      if (s.sparkT > 0) { const k = s.sparkT / 1.6; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + g.t; c.globalAlpha = k; flake(c, b.x + Math.cos(a) * b.W * .38, b.y + b.H * .15 + Math.sin(a) * b.H * .2 - (1 - k) * b.H * .3, b.W * .04, '#fff', Math.max(1.5, b.W * .008), g.t); } c.globalAlpha = 1; }
      s.items.forEach((it, i) => drawThing(c, it.id, it, L.items[i], g, s, 1));
      const h = s.hold; if (h && h.moved > 6) { const tk = TOOLK[h.it.id], S = L.items[h.i].s; drawTool(c, tk, h.x, h.y, S * TOOLS[tk] * 1.15, 0, h.x < b.x ? 1 : -1, 1, FILLC[h.it.id]); }
      for (const f of s.fall) drawCube(c, f.x, f.y, f.slot.s, f.rot, f.i + 1, 0);
      if (m) {
        const a = toolAt(m); let y = a.y;
        if (m.dip && m.t < UP) { const q = L.items[0]; y = a.y + Math.sin(clamp(m.t / UP, 0, 1) * Math.PI * 1.5) * q.s * .08; }
        const full = m.id === 'ice' ? (m.t < UP + .25 ? 1 : 0) : (m.t < UP + .2 ? 1 : clamp(1 - (m.t - UP - .2) / (m.dur - DOWN - UP - .45), 0, 1));
        drawTool(c, m.tk, a.x, y, m.S, a.tilt, m.side, full, m.col);
      }
      drawBits(c, s);
      if (!g.st.touched && g.idle > 2.5 && !s.mo) { const q = L.items[s.ph === 'ice' ? 0 : 1]; drawTapHint(c, q.x, q.y - q.s * .38, g.U * .08, g.t); }
    },
    hint: (g, s) => (s.ph === 'ice' ? 'ic-ice' : s.ph === 'salt' ? 'ic-salt' : null),
    tip: (g, s) => (s.ph === 'ice' ? 'ice' : 'salt'),
    auto(g, s) {
      if (s.mo || s.q.length || s.fall.length || s.hold || s.ph === 'end') return { wait: 250 };
      const L = H.icice.L(g), i = s.ph === 'ice' ? 0 : 1, q = L.items[i]; return s.items[i].done % 2 ? { drag: [[q.x, q.y], [L.bag.x, L.bag.y]], steps: 6, wait: 250 } : { tap: [q.x, q.y], wait: 250 };
    }
  };

  /* ================================================================ step 4: the little bag goes into the ice, then close the big bag */
  H.icnest = {
    enter(g, s) { s.ph = 'in'; s.z = Zip.make(10, 0); s.mo = null; s.jig = []; s.lt = { x: 0, y: 0 }; s.glow = 0; s.helpT = 0; },
    L(g) {
      const w = g.w, SH = g.SH;
      if (isTall(g)) { const lw = Math.min(w * .32, SH * .2 * LITTLE), lh = lw / LITTLE, little = { x: g.bx, y: g.y0 + lh / 2 + 8, W: lw, H: lh }, top = little.y + lh / 2 + 24, ah = floorY(g) - top, W = Math.min(w * .72, ah * BIG); return { little, bag: { x: g.bx, y: top + ah / 2, W, H: W / BIG } }; }
      const Hh = SH * .74, W = Math.min(Hh * BIG, w * .38), bag = { x: g.bx + w * .08, y: g.by + SH * .04, W, H: W / BIG }, lh = Math.min(SH * .55, bag.H * .7), lw = lh * LITTLE;
      return { bag, little: { x: Math.max(lw / 2 + 16, bag.x - W / 2 - lw * .75 - 16), y: g.by + SH * .05, W: lw, H: lh } };
    },
    down(g, s, p) {
      const L = H.icnest.L(g);
      if (s.ph === 'in' && !s.mo) { if (inRect(L.little, p, 1.15)) { s.hold = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: 0, dx: L.little.x - p.x, dy: L.little.y - p.y }; SND.crinkle(); g.hear('halfhalf'); } else if (inRect(L.bag, p)) { s.glow = 1; SND.cubes(2); } return; }
      if (s.ph === 'zip') { s.z.on = true; s.z.last = { x: p.x, y: p.y }; s.z.moved = 0; s.z.p0 = { x: p.x, y: p.y }; Zip.stroke(g, s.z, L.bag, p, true); H.icnest.check(g, s); }
    },
    move(g, s, p) {
      const h = s.hold; if (h) { h.x = p.x; h.y = p.y; h.moved = Math.max(h.moved, Math.hypot(p.x - h.sx, p.y - h.sy)); return; }
      if (s.ph === 'zip' && s.z.on) { s.z.moved = Math.max(s.z.moved, Math.hypot(p.x - s.z.p0.x, p.y - s.z.p0.y)); Zip.stroke(g, s.z, H.icnest.L(g).bag, p, true); H.icnest.check(g, s); }
    },
    up(g, s, p) {
      const h = s.hold, L = H.icnest.L(g);
      if (h) { s.hold = null; const at = { x: h.x + h.dx, y: h.y + h.dy }; if (h.moved < 24) H.icnest.drop(g, s, L.little); else if (inRect(L.bag, at, 1.35)) H.icnest.drop(g, s, { ...L.little, x: at.x, y: at.y }); else { s.back = { x: at.x, y: at.y, t: 0 }; } return; }
      const z = s.z; if (s.ph === 'zip' && z.on) { z.on = false; z.last = null; if (z.moved < 12) { Zip.tap(g, z, L.bag, p, true); H.icnest.check(g, s); } }
    },
    // into the bag: up over the mouth, then down into the ice; the cubes shuffle aside with a crunch
    drop(g, s, from) { s.mo = { t: 0, dur: 1.15, from: { x: from.x, y: from.y } }; sfx.whoosh(); },
    check(g, s) { if (s.z.done || !Zip.all(s.z, true)) return; s.z.done = true; SND.sealed(); const b = H.icnest.L(g).bag; g.fx.burst(b.x, b.y - b.H / 2, 22, { colors: ['#7ed957', '#fff', '#ffd54a'], speed: 240, g: 200, life: .7, size: 6, shape: 'star' }); g.finish(1.1); },
    update(g, s, dt) {
      lost(g, s);
      runLater(s, g); Zip.update(s.z, dt); s.glow = Math.max(0, s.glow - dt);
      if (s.back) { s.back.t += dt * 4; if (s.back.t >= 1) s.back = null; }
      const m = s.mo; if (m) { const t0 = m.t; m.t += dt; if (t0 < .55 && m.t >= .55) { SND.cubes(5); SND.crinkle(); for (let i = 0; i < 24; i++) s.jig[i] = { x: (Math.random() - .5) * 6, y: -Math.random() * 10, r: (Math.random() - .5) * .3 }; } if (m.t >= m.dur) { s.mo = null; s.ph = 'zip'; sayOnce(g, s, 'ic-zip2', .2); } }
      for (const j of s.jig) if (j) { j.x *= Math.pow(.02, dt); j.y *= Math.pow(.02, dt); j.r *= Math.pow(.02, dt); }
      if (s.ph === 'in' && !s.mo && !s.hold && g.idle > 10) H.icnest.drop(g, s, H.icnest.L(g).little);   // help: it hops in by itself
      if (s.ph === 'zip' && !s.z.done && g.idle > 10) { s.helpT += dt; if (s.helpT > .4) { s.helpT = 0; Zip.set(s.z, Zip.next(s.z, true), true); H.icnest.check(g, s); } }
    },
    draw(g, s, c) {
      g.sceneBoard(c); const L = H.icnest.L(g), b = L.bag, ic = g.ic || IC(g), m = s.mo;
      const inside = s.ph === 'zip' || (m && m.t > .55), k = m && m.t > .55 ? ease(clamp((m.t - .55) / .6, 0, 1)) : 1;
      drawBag(c, b, { zv: s.z.v, gap: b.H * OPEN, bulge: .6, frost: .5, inner: bigInner(g, ic, { jig: s.jig, little: inside ? { k: 1, dy: -(1 - k) * .45 } : null }) });
      if (!inside) {
        let x = L.little.x, y = L.little.y, sc = 1;
        if (s.hold && s.hold.moved > 4) { x = s.hold.x + s.hold.dx; y = s.hold.y + s.hold.dy; sc = 1.06; }
        else if (s.back) { const u = ease(s.back.t); x = lerp(s.back.x, L.little.x, u); y = lerp(s.back.y, L.little.y, u); }
        if (m) { const u = ease(clamp(m.t / .55, 0, 1)), tw = b.W * .58, tx = b.x, ty = b.y - b.H / 2 - tw / LITTLE * .2; x = lerp(m.from.x, tx, u); y = lerp(m.from.y, ty, u) - Math.sin(u * Math.PI) * g.U * .12; sc = lerp(1, tw / L.little.W, u); }
        if (!m && !s.hold && g.idle > 4) { c.save(); c.globalAlpha = .5 + .3 * Math.sin(g.t * 6); c.fillStyle = '#ffe066'; c.beginPath(); c.ellipse(x, y, L.little.W * .7, L.little.H * .62, 0, 0, TAU); c.fill(); c.restore(); }
        drawBag(c, { x, y, W: L.little.W * sc, H: L.little.H * sc }, littleLook(g, ic, { label: false, rot: s.hold ? Math.sin(g.t * 9) * .05 : 0 }));
        if (!m && !s.hold && g.idle > 2.5) { const u = (g.t * .5) % 1.3; if (u < 1) ghostFinger(c, lerp(L.little.x, b.x, ease(u)), lerp(L.little.y, b.y - b.H * .3, ease(u)) - Math.sin(u * Math.PI) * g.U * .08, Math.max(12, b.W * .05), Math.sin(u * Math.PI)); }
      }
      if (s.ph === 'zip' && !s.z.done && g.idle > 2.5 && !s.z.on) Zip.hint(g, c, b, true, g.t);
    },
    hint: (g, s) => (s.ph === 'in' ? 'ic-in' : 'ic-zip2'),
    tip: (g, s) => (s.ph === 'in' ? 'nest' : 'zip'),
    auto(g, s) { const L = H.icnest.L(g); if (s.mo || s.back) return { wait: 250 }; if (s.ph === 'in') return { drag: [[L.little.x, L.little.y], [L.bag.x, L.bag.y - L.bag.H * .2]], steps: 8, wait: 300 }; return s.z.done ? { wait: 300 } : { drag: Zip.autoPath(L.bag), steps: 3, wait: 300 }; }
  };

  /* ================================================================ step 5: shake! */
  // She holds the big bag and shakes it (back and forth or up and down, fast). Each swing rattles the ice once. The cream gets
  // thicker and paler, the bag frosts over and the snowflake fills. If she stops, a finger shows how; later it shakes by itself.
  H.icshake = {
    enter(g, s) {
      const ic = IC(g); s.need = ic.plan.shakes; s.n = 0; s.pv = 0; s.ox = 0; s.oy = 0; s.vx = 0; s.vy = 0; s.rot = 0; s.tx = 0; s.ty = 0; s.dir = { x: 0, y: 0 }; s.ext = null; s.lastSw = -9; s.lastSnd = -9; s.jig = []; s.mile = 0; s.helpT = 0; s.hop = 0; s.started = false; s.done = false;
    },
    L(g) {
      const w = g.w, SH = g.SH;
      if (isTall(g)) { const mr = Math.min(w * .12, SH * .075), top = g.y0 + mr * 2.4 + 12, ah = floorY(g) - 4 - top, W = Math.min(w * .7, ah * BIG); return { bag: { x: g.bx, y: top + ah / 2, W, H: W / BIG }, meter: { x: g.bx, y: g.y0 + mr * 1.2 + 6, r: mr } }; }
      const Hh = SH * .74, W = Math.min(Hh * BIG, w * .4), bag = { x: g.bx, y: g.by + SH * .04, W, H: W / BIG }, mr = Math.min(SH * .17, (w - W) / 2 * .32);
      return { bag, meter: { x: Math.min(w - mr * 1.3 - 12, bag.x + W / 2 + mr * 1.9), y: g.by - SH * .12, r: mr } };
    },
    down(g, s, p) {
      if (s.done) return; const L = H.icshake.L(g);
      s.grab = { x: p.x, y: p.y, sx: p.x, sy: p.y, t: g.t, moved: 0 }; s.ext = { x: p.x, y: p.y, t: g.t }; s.dir = { x: 0, y: 0 };
      if (!s.started) { s.started = true; later(s, g, .3, () => voice.say('ic-brr')); }
      if (!inRect(L.bag, p, 1.2)) s.grab.far = true;
    },
    move(g, s, p) {
      const G = s.grab; if (!G || s.done) return; const th = Math.max(14, g.U * .04);
      G.moved = Math.max(G.moved, Math.hypot(p.x - G.sx, p.y - G.sy)); s.tx = clamp(p.x - G.sx, -g.U * .2, g.U * .2); s.ty = clamp(p.y - G.sy, -g.U * .14, g.U * .14);
      // a swing is counted when the finger turns round after going far enough
      for (const ax of ['x', 'y']) {
        const v = p[ax], e = s.ext[ax], d = s.dir[ax];
        if (d === 0) { if (Math.abs(v - e) > th) { s.dir[ax] = Math.sign(v - e); s.ext[ax] = v; } }
        else if ((v - e) * d > 0) s.ext[ax] = v;
        else if (Math.abs(v - e) > th) { s.dir[ax] = -d; s.ext[ax] = v; H.icshake.swing(g, s, Math.min(1, Math.abs(v - e) / (g.U * .2)), g.t - (s.ext.t || g.t)); s.ext.t = g.t; }
      }
    },
    up(g, s, p) { const G = s.grab; s.grab = null; s.tx = 0; s.ty = 0; if (G && G.moved < 14 && !s.done) { s.hop = 1; s.vy -= g.U * 2.2; H.icshake.swing(g, s, .45, 0, .5); } },
    // one swing: one rattle of ice (never two on top of each other), a bit colder
    swing(g, s, k, dur, w = 1) {
      if (g.t - s.lastSw < .07) return; s.lastSw = g.t; g.idle = 0;
      s.n = Math.min(s.need, s.n + w * (dur > .7 ? .5 : 1));
      if (g.t - s.lastSnd > .09) { s.lastSnd = g.t; SND.rattle(clamp(k, .2, 1)); }
      const L = H.icshake.L(g), G = geo(L.bag.W, L.bag.H); for (let i = 0; i < (g.ic ? g.ic.cubes : 0); i++) { const j = s.jig[i] || (s.jig[i] = { x: 0, y: 0, r: 0, vx: 0, vy: 0 }); j.vx += (Math.random() - .5) * G.W * 1.2 * k; j.vy -= Math.random() * G.W * 1.4 * k; }
      const p = s.n / s.need, mile = Math.floor(p * 4);
      if (mile > s.mile && p < 1) { s.mile = mile; SND.frost(mile); g.fx.burst(L.meter.x, L.meter.y, 12, { colors: ['#ffffff', '#cfeaff', '#9fd4ff'], speed: 160, g: -40, life: 1, size: 6, shape: 'star' }); }
      if (p >= 1 && !s.done) {
        s.done = true; s.grab = null; s.tx = 0; s.ty = 0; sfx.win(); later(s, g, .5, () => voice.say('ic-ready'));
        g.fx.burst(L.bag.x, L.bag.y, 34, { colors: ['#ffffff', '#cfeaff', '#ffd54a', '#ff9ec8'], speed: 320, g: 120, life: 1.2, size: 7, shape: 'star' }); g.finish(2.4);
      }
    },
    update(g, s, dt) {
      lost(g, s);
      runLater(s, g); s.pv = lerp(s.pv, s.n / s.need, Math.min(1, dt * 4)); s.hop = Math.max(0, s.hop - dt * 3);
      // help when she stops: once, the instruction to keep going; after a long rest it shakes by itself, slowly
      const started = s.started && !s.done;
      if (started && g.idle > 3.5 && !s.saidMore && s.n < s.need) { s.saidMore = true; voice.say('ic-more'); g.chefBounce = 1; }
      if (!s.done && g.idle > 12) { s.helpT += dt; s.tx = Math.sin(g.t * 7) * g.U * .06; if (s.helpT > .45) { s.helpT = 0; const keep = g.idle; H.icshake.swing(g, s, .35, 0); g.idle = keep; } } else if (!s.grab) s.tx = 0;
      // the bag follows her finger on a spring, and tips the way it moves
      const k = 140, d = 12; s.vx += ((s.tx || 0) - s.ox) * k * dt - s.vx * d * dt; s.vy += ((s.ty || 0) - s.oy) * k * dt - s.vy * d * dt; s.ox += s.vx * dt; s.oy += s.vy * dt;
      s.rot = clamp(s.vx / (g.U * 4), -.25, .25);
      for (const j of s.jig) if (j) { j.vx += -j.x * 220 * dt - j.vx * 9 * dt - s.vx * .8 * dt; j.vy += -j.y * 220 * dt - j.vy * 9 * dt - s.vy * .8 * dt; j.x += j.vx * dt; j.y += j.vy * dt; j.r = j.x * .02; }
    },
    draw(g, s, c) {
      g.sceneBoard(c); const L = H.icshake.L(g), b = L.bag, ic = g.ic || IC(g), p = clamp(s.pv, 0, 1);
      const bb = { ...b, x: b.x + s.ox, y: b.y + s.oy - Math.sin(s.hop * Math.PI) * g.U * .03 };
      // motion lines while it is being shaken
      const sp = Math.hypot(s.vx, s.vy); if (sp > g.U * .3) { c.save(); c.globalAlpha = clamp(sp / (g.U * 2), 0, .7); c.strokeStyle = '#9fd4ff'; c.lineWidth = Math.max(3, b.W * .02); c.lineCap = 'round'; for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const x = bb.x + sx * (b.W * .58 + i * b.W * .06), y = bb.y + (i - 1) * b.H * .18; c.beginPath(); c.moveTo(x, y - b.H * .06); c.quadraticCurveTo(x + sx * b.W * .04, y, x, y + b.H * .06); c.stroke(); } c.restore(); }
      drawBag(c, bb, { zv: Array(10).fill(1), rot: s.rot, bulge: .6, frost: .45 + p * .55, inner: bigInner(g, ic, { jig: s.jig, little: { k: 1, thick: p, frost: p * .7, slosh: -s.rot * 2, rot: -s.rot * .5 } }) });
      // the snowflake that fills up as it gets colder
      const M = L.meter, glow = s.done ? .5 + .5 * Math.sin(g.t * 6) : 0;
      c.save(); soft(c, M.x + 3, M.y + M.r * .2 + 4, M.r * 1.05, M.r * 1.05, .16);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(M.x, M.y, M.r, 0, TAU); c.fill(); c.strokeStyle = '#d6ecfb'; c.lineWidth = M.r * .2; c.beginPath(); c.arc(M.x, M.y, M.r * .86, 0, TAU); c.stroke();
      c.strokeStyle = s.done ? '#5cc8f2' : '#7fd0ff'; c.lineCap = 'round'; c.lineWidth = M.r * .2; c.beginPath(); c.arc(M.x, M.y, M.r * .86, -Math.PI / 2, -Math.PI / 2 + p * TAU); c.stroke();
      if (glow) { c.globalAlpha = glow * .5; c.fillStyle = '#bfe8ff'; c.beginPath(); c.arc(M.x, M.y, M.r * .7, 0, TAU); c.fill(); c.globalAlpha = 1; }
      flake(c, M.x, M.y, M.r * .55, mixc('#bcd2e6', '#2f9ee8', p), Math.max(2.5, M.r * .11), s.done ? g.t * 2 : p * 2);
      c.restore();
      // a finger shows how to shake when nothing is happening
      if (!s.done && !s.grab && g.idle > (s.started ? 3.5 : 2.5)) { const x = b.x + Math.sin(g.t * 7) * g.U * .09, y = b.y - b.H * .05; ghostFinger(c, x, y, Math.max(13, b.W * .055), .85); }
    },
    hint: () => 'ic-shake',
    tip: () => 'shake',
    auto(g, s) {
      if (s.done) return { wait: 300 }; const b = H.icshake.L(g).bag, d = g.U * .16, pts = [[b.x, b.y]];
      for (let i = 0; i < 8; i++) pts.push([b.x + (i % 2 ? d : -d), b.y + (i % 3 - 1) * d * .2]);
      return { drag: pts, steps: 3, wait: 120 };
    }
  };

  /* ================================================================ step 6: a cone or a cup; open the little bag; scoop it out */
  const cardArt = (id, cd) => (id === 'cup' ? { dy: cd.r * .48, R: cd.r * .74 } : { dy: cd.r * .7, R: cd.r * .62 });
  H.icscoop = {
    enter(g, s) { s.ph = 'pick'; s.z = Zip.make(10, 1); s.mo = null; s.q = 0; s.n = 0; s.need = (IC(g)).plan.scoops; s.pickT = 0; s.cards = [{ id: 'cone', a: 1 }, { id: 'cup', a: 1 }]; s.bagIn = 0; s.helpT = 0; g.piece = null; g.pieces = []; },
    L(g) {
      const w = g.w, SH = g.SH, U = g.U, tall = isTall(g), bh = Math.min(SH * (tall ? .4 : .7), w * .42 / LITTLE * (tall ? 1 : .8)), bw = Math.min(w * .94, SH * 1.7), bag = { x: tall ? Math.max(g.bx - w * .25, g.bx - bw * .42 + bh * LITTLE / 2) : g.bx - Math.min(U * .36, w * .26), y: tall ? g.by - SH * .06 : g.by, W: bh * LITTLE, H: bh };
      // on a tall screen the plate sits fully inside the board (bottom right), clear of the chef's bubble line
      const pr = tall ? Math.min(w * .18, U * .26) : Math.min(U * .2, w * .16), fx = g.bx + (tall ? Math.min(w * .2, bw / 2 - pr * 1.25) : Math.min(U * .3, w * .22)), base = tall ? Math.min(g.y1 - pr * .62 - 6, floorY(g) - pr * .66) : g.y1 - pr * .62 - 6;
      const p = g.piece, cup = p && p.holder === 'cup', hh = (p ? (cup ? 2.7 : [3.2, 3.2, 4.0, 4.76][IC(g).plan.scoops]) : 4.0) + .1, R = Math.min(U * (tall ? .2 : .24), (base - g.y0 - 14) / hh, w * .3, pr * (cup ? .78 : tall ? .9 : 1.1));
      const cr = Math.min(U * .22, w * .21, SH * .34);
      return { bag, food: { x: fx, y: base - pr * .04, R }, plate: { x: fx, y: base, r: pr }, cards: [{ x: g.bx - cr * 1.14, y: g.by, r: cr }, { x: g.bx + cr * 1.14, y: g.by, r: cr }] };
    },
    down(g, s, p) {
      const L = H.icscoop.L(g);
      if (s.ph === 'pick') { L.cards.forEach((cd, i) => { if (s.ph === 'pick' && Math.hypot(p.x - cd.x, p.y - cd.y) < cd.r * 1.1) H.icscoop.pick(g, s, i); }); return; }
      if (s.ph === 'open') { s.z.on = true; s.z.last = { x: p.x, y: p.y }; s.z.moved = 0; s.z.p0 = { x: p.x, y: p.y }; Zip.stroke(g, s.z, L.bag, p, false); H.icscoop.check(g, s); return; }
      if (s.ph === 'scoop') { const f = L.food; if (inRect(L.bag, p, 1.2) || Math.hypot(p.x - f.x, p.y - (f.y - f.R * 2)) < f.R * 2.2) H.icscoop.ask(g, s); }
    },
    move(g, s, p) { if (s.ph === 'open' && s.z.on) { s.z.moved = Math.max(s.z.moved, Math.hypot(p.x - s.z.p0.x, p.y - s.z.p0.y)); Zip.stroke(g, s.z, H.icscoop.L(g).bag, p, false); H.icscoop.check(g, s); } },
    up(g, s, p) { const z = s.z; if (s.ph === 'open' && z.on) { z.on = false; z.last = null; if (z.moved < 12) { Zip.tap(g, z, H.icscoop.L(g).bag, p, false); H.icscoop.check(g, s); } } },
    pick(g, s, i) {
      const id = s.cards[i].id; s.ph = 'fly'; s.pickI = i; s.pickT = 0; g.hear(HEAR[id]); sfx.pop();
      g.piece = { type: 'icecream', holder: id, scoops: [], tops: [], paint: [] }; g.pieces = [g.piece];
      const cd = H.icscoop.L(g).cards[i]; g.fx.burst(cd.x, cd.y, 14, { colors: ['#ffd54a', '#fff', '#ff9ec8'], speed: 200, g: 260, life: .6, size: 6, shape: 'star' });
    },
    check(g, s) { if (s.ph !== 'open' || !Zip.all(s.z, false)) return; s.ph = 'scoop'; SND.sealed(); sayOnce(g, s, 'ic-scoop', .3); const b = H.icscoop.L(g).bag; g.fx.burst(b.x, b.y - b.H / 2, 16, { colors: ['#ffd23f', '#58a8ec', '#fff'], speed: 200, g: 200, life: .6, size: 5, shape: 'star' }); },
    ask(g, s) { if (s.n + s.q + (s.mo ? 1 : 0) >= s.need) return; s.q++; },
    start(g, s) { s.q--; s.mo = { t: 0, dur: 1.75, ev: [], ei: 0, ball: false }; const m = s.mo, ic = g.ic, fl = ic.flavor;
      m.ev.push([.55, () => { SND.dig(); m.ball = true; m.dug = true; }]);
      m.ev.push([1.25, () => { m.ball = false; s.n++; g.piece.scoops.push({ f: fl, drop: 1 }); }]); },
    update(g, s, dt) {
      lost(g, s);
      runLater(s, g); Zip.update(s.z, dt);
      if (s.ph === 'fly') { s.pickT += dt * 1.6; s.bagIn = Math.min(1, s.bagIn + dt * 1.8); if (s.pickT >= 1) { s.ph = 'open'; sayOnce(g, s, 'ic-open', .1); } }
      else if (s.ph !== 'pick') s.bagIn = Math.min(1, s.bagIn + dt * 1.8);
      const m = s.mo; if (m && runMove(m, dt)) s.mo = null;
      if (!s.mo && s.q > 0) H.icscoop.start(g, s);
      if (g.piece) for (const sc of g.piece.scoops) if (sc.drop > 0) { sc.drop = Math.max(0, sc.drop - dt * 5); if (sc.drop === 0 && !sc.landed) { sc.landed = true; SND.plop(); const L = H.icscoop.L(g), f = L.food, sp = spots(g.piece), q = sp[g.piece.scoops.indexOf(sc)] || [0, -2]; g.fx.burst(f.x + q[0] * f.R, f.y + q[1] * f.R, 12, { colors: [ICE[sc.f] || '#fff', '#fff', '#ffd54a'], speed: 150, g: 300, life: .5, size: 5, shape: 'star' }); voice.say('num/' + s.n); if (s.n >= s.need && !s.fin) { sfx.chime(); g.finish(1.2); } } }
      // help: open by itself, scoop by itself
      if (!s.fin && g.idle > 10) { s.helpT += dt; if (s.helpT > .4) { s.helpT = 0; if (s.ph === 'open') { Zip.set(s.z, Zip.next(s.z, false), false); H.icscoop.check(g, s); } else if (s.ph === 'scoop' && !s.mo && !s.q) H.icscoop.ask(g, s); else if (s.ph === 'pick') H.icscoop.pick(g, s, 0); } }
    },
    draw(g, s, c) {
      g.sceneBoard(c); const L = H.icscoop.L(g), ic = g.ic || IC(g), f = L.food, b = L.bag;
      // the plate and the cone or cup
      if (s.ph !== 'pick') { drawPlate(c, L.plate.x, L.plate.y, L.plate.r); }
      if (g.piece) { const u = s.ph === 'fly' ? ease(clamp(s.pickT, 0, 1)) : 1, cd = L.cards[s.pickI], ca = cardArt(g.piece.holder, cd), x = lerp(cd.x, f.x, u), y = lerp(cd.y + ca.dy, f.y, u), R = lerp(ca.R, f.R, u); c.save(); c.translate(x, y); drawPiece(c, g.piece, R); c.restore(); }
      // the little bag (it slides in once the cone or cup is chosen)
      if (s.ph !== 'pick') {
        const k = ease(s.bagIn), dug = s.n + (s.mo && s.mo.dug ? 1 : 0), left = 1 - dug / s.need * .82;
        drawBag(c, { ...b, x: lerp(-b.W, b.x, k) }, littleLook(g, ic, { zv: s.z.v, gap: b.H * OPEN, thick: 1, frost: .4, fill: liqOf(ic).fill * left, dents: Math.min(3, dug) }));
        // the scoop, resting by the bag or doing its job
        const home = { x: b.x + b.W * .32, y: b.y + b.H * .5 + 4 }, top = { x: b.x, y: b.y - b.H * .5 - b.W * .1 }, inBag = { x: b.x, y: b.y + b.H * .5 - liqOf(ic).fill * left * b.H * .78 }, sp = spots({ ...(g.piece || {}), scoops: [...((g.piece && g.piece.scoops) || []), 1] }), q = sp[sp.length - 1] || [0, -2], dest = { x: f.x + q[0] * f.R, y: f.y + q[1] * f.R - f.R * .9 };
        let x = home.x, y = home.y, rot = -.4, ball = null; const m = s.mo, ds = Math.max(46, b.W * .5);
        if (m) { const t = m.t;
          if (t < .3) { const u = ease(t / .3); x = lerp(home.x, top.x, u); y = lerp(home.y, top.y, u) - Math.sin(u * Math.PI) * g.U * .06; rot = lerp(-.4, -1.2, u); }
          else if (t < .55) { const u = ease((t - .3) / .25); x = top.x; y = lerp(top.y, inBag.y, u); rot = -1.2; }
          else if (t < .8) { const u = ease((t - .55) / .25); x = top.x + Math.sin(u * Math.PI) * b.W * .05; y = lerp(inBag.y, top.y, u); rot = lerp(-1.2, -.2, u); }
          else if (t < 1.25) { const u = ease((t - .8) / .45); x = lerp(top.x, dest.x + ds * .26, u); y = lerp(top.y, dest.y, u) - Math.sin(u * Math.PI) * g.U * .14; rot = lerp(-.2, .3, u); }
          else { const u = ease(clamp((t - 1.25) / .5, 0, 1)); x = lerp(dest.x + ds * .26, home.x, u); y = lerp(dest.y, home.y, u) - Math.sin(u * Math.PI) * g.U * .06; rot = lerp(.3, -.4, u); }
          if (m.ball) ball = { col: ICE[ic.flavor] || ICE.vanilla, id: scoopId(ic.flavor) };
        }
        if (s.ph === 'scoop' || m) { c.save(); c.translate(x, y); c.rotate(rot); drawDisher(c, ds, ball); c.restore(); }
        if (s.ph === 'open' && g.idle > 2.5 && !s.z.on) Zip.hint(g, c, b, false, g.t);
        if (s.ph === 'scoop' && !s.mo && !s.q && g.idle > 2.5 && s.n < s.need) drawTapHint(c, b.x, b.y - b.H * .3, g.U * .08, g.t);
      }
      // choosing: two big cards
      if (s.ph === 'pick' || s.ph === 'fly') L.cards.forEach((cd, i) => {
        const chosen = s.ph === 'fly' && i === s.pickI; if (chosen) return; const a = s.ph === 'fly' ? 1 - clamp(s.pickT * 2, 0, 1) : 1; if (a <= 0) return;
        const bob = Math.sin(g.t * 3 + i * 2) * cd.r * .03, k = (s.ph === 'fly' ? .9 : 1) * (1 + (g.idle > 4 ? Math.sin(g.t * 6 + i) * .03 : 0));
        c.save(); c.globalAlpha = a; c.translate(cd.x, cd.y + bob); c.scale(k, k);
        c.fillStyle = 'rgba(80,40,20,.14)'; rr(c, -cd.r + 4, -cd.r + 9, cd.r * 2, cd.r * 2, cd.r * .3); c.fill(); c.fillStyle = '#fff'; rr(c, -cd.r, -cd.r, cd.r * 2, cd.r * 2, cd.r * .3); c.fill(); c.strokeStyle = i ? '#ff9ec8' : '#f2b56b'; c.lineWidth = Math.max(4, cd.r * .07); rr(c, -cd.r, -cd.r, cd.r * 2, cd.r * 2, cd.r * .3); c.stroke();
        c.fillStyle = i ? '#fff0f6' : '#fff6ea'; c.beginPath(); c.ellipse(0, cd.r * .1, cd.r * .78, cd.r * .78, 0, 0, TAU); c.fill();
        const pc = { type: 'icecream', holder: s.cards[i].id, scoops: [], tops: [], paint: [] }, ca = cardArt(pc.holder, cd); c.translate(0, ca.dy); drawPiece(c, pc, ca.R);
        c.restore();
      });
    },
    hint: (g, s) => (s.ph === 'pick' ? 'ic-pick' : s.ph === 'open' || s.ph === 'fly' ? 'ic-open' : 'ic-scoop'),
    tip: (g, s) => (s.ph === 'pick' ? (Math.floor(g.t / 2.5) % 2 ? 'cup' : 'cone') : s.ph === 'scoop' ? 'scoop' : 'zip'),
    auto(g, s) {
      const L = H.icscoop.L(g);
      if (s.ph === 'pick') { const cd = L.cards[Math.floor(Math.random() * 2)]; return { tap: [cd.x, cd.y], wait: 300 }; }
      if (s.ph === 'fly') return { wait: 250 };
      if (s.ph === 'open') return { drag: Zip.autoPath(L.bag), steps: 3, wait: 300 };
      if (s.mo || s.q || s.n >= s.need) return { wait: 250 };
      return { tap: [L.bag.x, L.bag.y], wait: 250 };
    }
  };

  /* ================================================================ step 7: toppings (the kitchen's own decorating, kept on the ice cream) */
  // Every touch near the ice cream lands on a scoop (so nothing floats in the air beside the cone); touches further away still reach the plate.
  function onIce(g, p) {
    const pc = g.pieces[0], q = g.slots()[0]; if (!pc || !q) return p;
    const ox = q.x, oy = q.y + pieceBase(pc, q.r), R = q.r * ku(pc), lx = (p.x - ox) / R, ly = (p.y - oy) / R, top = topOf(pc);
    if (Math.abs(lx) > 1.5 || ly > .25 || ly < -(top + .9)) return p;
    let best = null; for (const [cx, cy, r] of spots(pc)) { const d = Math.hypot(lx - cx, ly - cy) - r; if (!best || d < best.d) best = { cx, cy, r, d }; }
    if (!best || best.d <= -best.r * .08) return p;
    const a = Math.atan2(ly - best.cy, lx - best.cx), k = best.r * .9; return { ...p, x: ox + (best.cx + Math.cos(a) * k) * R, y: oy + (best.cy + Math.sin(a) * k) * R };
  }
  H.ictop = {
    camera: true,
    enter(g, s) { H.decorate.enter(g, s); g.kinds.fruit = 'cherry'; fitK(g, g.pieces[0]); },
    down: (g, s, p) => H.decorate.down(g, s, onIce(g, p)),
    move: (g, s, p) => H.decorate.move(g, s, onIce(g, p)),
    up: (g, s, p) => H.decorate.up(g, s, onIce(g, p)),
    update(g, s, dt) { fitK(g, g.pieces[0]); H.decorate.update(g, s, dt); },
    want: () => [],
    draw(g, s, c) {
      g.sceneBoard(c); g.drawPlates(c); const q = g.slots()[0], pc = g.pieces[0]; if (!pc) return;
      CA.drawPieceAt(c, pc, q.x, q.y, q.r);
      if (g.tool && !s.canDone && s.acts === 0 && g.idle > 2.5) { const sp = spots(pc), top = sp[sp.length - 1] || [0, -2, .6]; const r = q.r * ku(pc); drawTapHint(c, q.x + top[0] * r, q.y + pieceBase(pc, q.r) + (top[1] - top[2] * .3) * r, g.U * .1, g.t); }
    },
    hint: () => 'cook-toppings',
    tip(g, s) {
      const sp = s.spec, used = s.usedTools || new Set(), left = sp.tools.filter(t => !used.has(t)), slow = Math.floor(g.t / 3.5);
      if (s.acts >= s.need && (used.size >= Math.min(3, sp.tools.length) || !left.length)) { if (s.happyT == null) s.happyT = g.t; return g.t - s.happyT < 3 ? 'HAPPY' : null; }
      const l = left.length ? left : sp.tools; return g.iconId(l[slow % l.length]);
    },
    auto(g, s) {
      if (s.canDone) { const cb = g.checkBtn(); if (cb) return { tap: [cb.x, cb.y], wait: 400 }; }
      if (g.menu) { const it = g.menu.it; return { tap: [it.x, it.y], wait: 200 }; }
      const used = s.usedTools || new Set(), want = s.spec.tools.find(t => !used.has(t)) || s.spec.tools[0];
      if (g.tool !== want) { const it = g.tray.find(t => t.id === want); return it ? { tap: [it.x, it.y], wait: 200 } : { wait: 200 }; }
      const q = g.slots()[0], pc = g.pieces[0], sp = spots(pc), top = sp[sp.length - 1] || [0, -2, .6], ox = q.x, oy = q.y + pieceBase(pc, q.r), R = q.r * ku(pc);
      return { drag: [[ox + (top[0] - .4) * R, oy + top[1] * R], [ox + top[0] * R, oy + (top[1] - .3) * R], [ox + (top[0] + .4) * R, oy + top[1] * R]], steps: 5, wait: 200 };
    }
  };

  /* ================================================================ step 8: eat it (the kitchen's own bites; a paper cup is not eaten) */
  let EOC = null;
  function drawEaten(g, c, p, x, y, R) {
    if (!p.bites || !p.bites.length) { CA.drawPieceAt(c, p, x, y, R); return; }
    const dpr = g.dpr || 1, S = Math.ceil(R * 5.4 * dpr), oc = EOC || (EOC = document.createElement('canvas')); if (oc.width !== S) { oc.width = S; oc.height = S; }
    const o = oc.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, S, S); o.setTransform(dpr, 0, 0, dpr, S / 2 / dpr * dpr, S / 2 / dpr * dpr);
    o.setTransform(dpr, 0, 0, dpr, S / 2, S / 2); o.save(); o.translate(0, pieceBase(p, R)); drawPiece(o, p, R); o.restore();
    o.globalCompositeOperation = 'destination-out'; o.fillStyle = '#000';
    for (const b of p.bites) { o.beginPath(); o.arc(b.x * R, b.y * R, b.r * R, 0, TAU); o.fill(); for (let k = -2; k <= 2; k++) { const a = b.a + k * .42; o.beginPath(); o.arc((b.x + Math.cos(a) * b.r) * R, (b.y + Math.sin(a) * b.r) * R, b.r * R * .26, 0, TAU); o.fill(); } }
    o.globalCompositeOperation = 'source-over';
    c.drawImage(oc, x - S / 2 / dpr, y - S / 2 / dpr, S / dpr, S / dpr);
  }
  H.icserve = {
    camera: true, eats: true,
    enter(g, s) { const p = g.pieces[0]; if (p) p.eatOnly = p.holder === 'cup'; fitK(g, p); H.serve.enter(g, s); },
    down: (g, s, p) => H.serve.down(g, s, p),
    update(g, s, dt) { fitK(g, g.pieces[0]); H.serve.update(g, s, dt); if (g.finishedAll) s.finT = 99; },
    draw(g, s, c) {
      g.drawPlates(c); const pl = g.plate(), q = g.slots()[0], pc = g.pieces[0];
      for (const k of g.crumbs || []) { c.fillStyle = k.col; c.beginPath(); c.ellipse(pl.x + k.x * g.U, pl.y + k.y * g.U, k.r * g.U, k.r * g.U * .7, k.x * 9, 0, TAU); c.fill(); }
      if (!pc || !q) return; const bob = (g.finishedAll ? 0 : Math.sin(g.t * 3) * 2) + (g.bounce || 0) * -4, cup = pc.holder === 'cup', ox = q.x, oy = q.y + bob + pieceBase(pc, q.r);
      if (cup) { c.save(); c.translate(ox, oy); cupBack(c, q.r * ku(pc)); cupSpoon(c, q.r * ku(pc)); c.restore(); }
      if (!pc.gone) drawEaten(g, c, pc, q.x, q.y + bob, q.r);
      if (cup) { c.save(); c.translate(ox, oy); cupFront(c, q.r * ku(pc)); c.restore(); }
      if (!s.n && !g.finishedAll) drawTapHint(c, q.x, q.y - q.r * .4, g.U * .1, g.t);
    },
    hint: () => 'cook-serve',
    tip: () => null,
    auto(g, s) { const p = g.pieces[0]; if (!p || p.gone || !p.left || !p.left.length) return { wait: 300 }; const q = g.slots()[0], e = p.left[Math.floor(p.left.length / 2)]; return { tap: [q.x + e[0] * q.r, q.y + e[1] * q.r], wait: 80 }; }
  };

  /* ---------------------------------------------------------------- pictures for the step strip and the chef's thought bubble */
  const iconBag = (c, s, o = {}) => drawBag(c, { x: 0, y: s * .04, W: s * .62, H: s * .62 / LITTLE }, { zv: Array(10).fill(o.shut ? 1 : 0), gap: o.shut ? 0 : s * .035, label: false, shadow: false, bulge: .5, inner: (c2, G) => bagLiquid(c2, G, { fill: .55, col: o.col || '#fffbf2', thick: o.thick || 0 }) });
  STEP_ICON.icbag = (c, s, id) => {
    if (id === 'cream') { c.translate(0, s * .02); drawCarton(c, s * .9); return; } if (id === 'sugar') { drawPile(c, 'sugar', 1, s * .9); return; } if (id === 'vanilla') { drawVanilla(c, s * .9); return; }
    if (id === 'strawb') { drawBerryBowl(c, s * .9, 3); return; } if (id === 'cocoa') { drawCocoa(c, s * .85); return; } if (id === 'chips') { drawPile(c, 'chips', 1, s * .9); return; }
    iconBag(c, s); c.save(); c.translate(s * .26, -s * .26); drawMeasure(c, 'half', s * .42, 1, '#fffbf2', -.6); c.restore();
  };
  STEP_ICON.iczip = (c, s) => { iconBag(c, s, { shut: true }); ghostFinger(c, s * .12, -s * .27, s * .09, .9); };
  STEP_ICON.icice = (c, s, id) => { if (id === 'salt') { drawSaltTub(c, s * .85); return; } for (let i = 0; i < 4; i++) drawCube(c, (i % 2 - .5) * s * .32 + (i > 1 ? s * .08 : 0), (i > 1 ? -.14 : .14) * s, s * .32, (i - 1.5) * .3, i + 1, 0); };
  STEP_ICON.icnest = (c, s, id) => { if (id === 'zip') { STEP_ICON.iczip(c, s); return; } drawBag(c, { x: 0, y: s * .06, W: s * .74, H: s * .74 / BIG }, { zv: Array(10).fill(0), gap: s * .035, label: false, shadow: false, inner: (c2, G) => { for (let i = 0; i < 8; i++) { const q = cubeSlot(G, i); drawCube(c2, q.x, q.y, q.s, q.rot, i, 0); } } }); c.save(); c.translate(0, -s * .2); c.scale(.55, .55); iconBag(c, s); c.restore(); };
  STEP_ICON.icshake = (c, s) => { c.save(); c.rotate(-.18); drawBag(c, { x: 0, y: s * .04, W: s * .62, H: s * .62 / BIG }, { zv: Array(10).fill(1), label: false, shadow: false, frost: .7, inner: (c2, G) => { for (let i = 0; i < 8; i++) { const q = cubeSlot(G, i); drawCube(c2, q.x, q.y, q.s, q.rot, i, 0); } } }); c.restore(); c.strokeStyle = '#5cc8f2'; c.lineWidth = s * .05; c.lineCap = 'round'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * s * .1, 0, s * .42, sx > 0 ? -.4 : Math.PI - .4, sx > 0 ? .4 : Math.PI + .4); c.stroke(); } flake(c, s * .3, -s * .3, s * .1, '#2f9ee8', s * .03); };
  STEP_ICON.icscoop = (c, s, id) => {
    if (id === 'zip') { iconBag(c, s, { col: ICE.strawb, thick: 1 }); ghostFinger(c, s * .12, -s * .27, s * .09, .9); return; }
    if (id === 'cone' || id === 'cup') { c.translate(0, s * .42); drawPiece(c, { type: 'icecream', holder: id, scoops: [], tops: [], paint: [] }, s * .19); return; }
    c.save(); c.translate(s * .04, s * .12); c.rotate(-.5); drawDisher(c, s * .9, { col: ICE.strawb, id: 'strawb' }); c.restore();
  };
  STEP_ICON.ictop = (c, s, id) => stepIcon(c, 'decorate', s, id);
  STEP_ICON.icserve = (c, s, id) => stepIcon(c, 'serve', s, id);

  /* ---------------------------------------------------------------- pictures and names of the new things (other recipes may use them too) */
  Object.assign(ING, { halfhalf: (c, s) => drawCarton(c, s), vanilla: (c, s) => drawVanilla(c, s), cocoa: (c, s) => drawCocoa(c, s), icecubes: (c, s) => STEP_ICON.icice(c, s), rocksalt: (c, s) => drawSaltTub(c, s), 'ic-bag': (c, s) => iconBag(c, s) });
  Object.assign(NAME, { halfhalf: 'Cream', vanilla: 'Vanilla', cocoa: 'Cocoa', icecubes: 'Ice', rocksalt: 'Salt', 'ic-bag': 'A zip bag' });

  /* ---------------------------------------------------------------- the recipe */
  if (!KIT.RECIPES.some(r => r.id === 'icecream')) KIT.RECIPES.push({
    id: 'icecream', cat: 0, name: 'Homemade ice cream', ptype: 'icecream',
    steps: [{ k: 'icbag' }, { k: 'iczip' }, { k: 'icice' }, { k: 'icnest' }, { k: 'icshake' }, { k: 'icscoop' },
      { k: 'ictop', tools: ['ice-choc', 'caramel', 'strawsauce', 'cream', 'sprinkles', 'fruit', 'candy'], need: 3, icon: 'sprinkles' }, { k: 'icserve' }],
    sample: { type: 'icecream', holder: 'cone', scoops: [{ f: 'vanilla' }, { f: 'strawb' }], tops: [{ id: 'cherry', x: .06, y: -4.02 }, { id: 'sprinkles', x: -.32, y: -3.35, col: '#5cc8f2', rot: .5 }, { id: 'sprinkles', x: .34, y: -3.1, col: '#ffd54a', rot: -.4 }, { id: 'sprinkles', x: -.1, y: -2.62, col: '#7ed957', rot: 1.1 }, { id: 'sprinkles', x: .3, y: -2.42, col: '#ff6b81', rot: .2 }] }
  });

  /* ---------------------------------------------------------------- what is said */
  if (voice && voice.addLines) voice.addLines({
    'cookr/icecream': 'Homemade ice cream!',
    'ic-add': 'Fill the little bag! Cream, sugar and vanilla!',
    'ic-flavor': 'Now pick a flavor!',
    'ic-zip': 'Close the bag! Slide your finger along the zipper!',
    'ic-ice': 'Fill the big bag with ice!',
    'ic-salt': 'Now the salt! Salt makes the ice extra cold!',
    'ic-in': 'Put the little bag in the big bag!',
    'ic-zip2': 'Close the big bag too!',
    'ic-shake': 'Shake the bag! Shake, shake, shake!',
    'ic-more': 'Keep shaking! It is getting cold!',
    'ic-ready': 'It turned into ice cream!',
    'ic-pick': 'A cone or a cup?',
    'ic-open': 'Open the little bag!',
    'ic-scoop': 'Scoop out the ice cream!',
    'ic-brr': 'Brrr! Ice cold!',
    'cook/halfhalf': 'Cream!', 'cook/vanilla': 'Vanilla!', 'cook/cocoa': 'Cocoa!', 'cook/ice': 'Ice!', 'cook/cup': 'A cup!'
  }, { instruct: ['ic-add', 'ic-flavor', 'ic-zip', 'ic-ice', 'ic-salt', 'ic-in', 'ic-zip2', 'ic-shake', 'ic-more', 'ic-ready', 'ic-pick', 'ic-open', 'ic-scoop'] });
})();
