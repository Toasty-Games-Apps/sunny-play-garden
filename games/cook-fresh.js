// Sprout Kitchen: Fruit & drinks (a tab of its own). Two recipes that teach real kitchen skills with big, forgiving touches:
//  Fruit salad: wash the fruit (rub it in the water until the dirt floats off), peel a banana strip by strip, cut with a kid-safe knife
//    (banana coins, strawberries in half, grapes in quarters so they are safe to swallow), tip everything into a big bowl (a drizzle of
//    honey or a squeeze of orange if she likes), mix it gently, then eat it with a fork, one piece per touch.
//  Lemonade: roll a lemon under a flat hand, cut it in half, press and twist the halves on a juicer (the juice fills a measuring cup and
//    the juicer keeps the seeds), pour the juice into a pitcher, fill it with water up to the line, add counted spoons of sugar and stir
//    until the sugar disappears, drop counted ice cubes into a glass and pour, add a straw and a lemon slice, then sip it until it is gone
//    (and pour another glass for a photo).
// Nothing can go wrong: every touch helps, nothing spills or breaks, and there is no wrong way to do a step.
// Everything plugs into games/cook.js through SPG.cookKit (tab, recipes, step handlers) and SPG.cookArt (pictures, foods, step icons).
(() => {
  const SPG = window.SPG, KIT = SPG.cookKit, CA = SPG.cookArt;
  if (!KIT || !CA || !KIT.RECIPES) return;
  const { sfx, voice } = SPG;
  const { H, RECIPES, CATS, CAT_COL } = KIT;
  const { clamp, lerp, ease, rr, rnd, shade, circ, ell, box, shine, ING, NAME, EXTRA, STEP_ICON, drawBoard, drawTapHint, drawSpoon, drawMeasure, mixHex, F, TAU } = CA;
  const tier = () => { try { return SPG.level.tier('cook'); } catch (_) { return 2; } };
  const hush = () => F.hush;   // a photo is being taken: no hints
  const D = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const lin = (c, x0, y0, x1, y1, st) => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [o, col] of st) g.addColorStop(o, col); return g; };
  const rad = (c, x, y, r0, r1, st) => { const g = c.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(r0 + .1, r1)); for (const [o, col] of st) g.addColorStop(o, col); return g; };
  const rotP = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
  const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const angTo = (a, b, k, P = TAU) => { let d = b - a; d = ((d % P) + P * 1.5) % P - P / 2; return a + d * k; };
  const segDist = (p, L) => { const dx = L.x2 - L.x1, dy = L.y2 - L.y1, l2 = dx * dx + dy * dy || 1, t = clamp(((p.x - L.x1) * dx + (p.y - L.y1) * dy) / l2, 0, 1); return D(p.x, p.y, L.x1 + dx * t, L.y1 + dy * t); };
  const quiet = s => { if (s && s.snd) { s.snd.off(); s.snd = null; } };
  const wide = g => g.w > g.SH * 1.15;
  // the top of the helper's thought bubble (bottom left, drawn by the kitchen): tall layouts keep their things above it
  const bubTop = g => { const r = Math.max(26, g.th * .36); return g.h - g.th / 2 - 2 - r * 2.95; };
  // what this recipe has made so far, kept on the game between steps (the first step of a recipe starts a fresh one)
  const fresh = g => (g.fresh = { R: g.R });
  const FR = g => (g.fresh && g.fresh.R === g.R ? g.fresh : fresh(g));
  // how much there is to do at each age tier
  const FS = () => { const T = tier(); return { T, berries: [1, 2, 3][T - 1], grapes: [2, 3, 4][T - 1], cuts: [3, 4, 5][T - 1] }; };
  const LM = () => { const T = tier(); return { T, lemons: T === 1 ? 1 : 2, spoons: [1, 2, 3][T - 1], ice: [2, 3, 4][T - 1] }; };


  /* ---------------------------------------------------------------- sounds made here (soft and wet, never sharp) */
  let NB = null;
  const AC = () => { const A = SPG.audio; return A && A.ctx && A.master && SPG.store.settings.sound ? A : null; };
  const nbuf = c => { if (!NB || NB.sampleRate !== c.sampleRate) { NB = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return NB; };
  function tn(f, dur, { type = 'sine', vol = .1, slide = 0, at = 0 } = {}) {
    const A = AC(); if (!A) return; const c = A.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + .05);
  }
  function nz(dur, { freq = 1500, q = .8, vol = .07, at = 0, sweep = 0 } = {}) {
    const A = AC(); if (!A) return; const c = A.ctx, t = c.currentTime + at, s = c.createBufferSource(); s.buffer = nbuf(c); s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * sweep), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  // a gentle stream of something pouring, for as long as it pours. Returns { set(0..1), off() }
  function stream(vol = 1) {
    const A = AC(); if (!A) return { set() {}, off() {} };
    const c = A.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = nbuf(c); s.loop = true; s.playbackRate.value = .7;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 850; bp.Q.value = .9;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.04 * vol, t + .15);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 6.5; lg.gain.value = 240; lfo.connect(lg); lg.connect(bp.frequency);
    s.connect(bp); bp.connect(lp); lp.connect(g); g.connect(A.master); s.start(t, Math.random() * .5); lfo.start(t);
    let off = false;
    return {
      set(k) { if (!off) { g.gain.setTargetAtTime((.012 + .035 * k) * vol, c.currentTime, .08); bp.frequency.setTargetAtTime(650 + 500 * k, c.currentTime, .1); } },
      off() { if (off) return; off = true; const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(.0001, n, .07); s.stop(n + .45); lfo.stop(n + .45); }
    };
  }
  const SND = {
    clink(i = 0) { const f = 2250 + (i % 4) * 240; tn(f, .32, { vol: .06 }); tn(f * 1.49, .2, { vol: .03, at: .004 }); tn(f * .5, .07, { type: 'triangle', vol: .025 }); nz(.03, { freq: 6400, q: 2, vol: .025 }); },
    slurp() { nz(.36, { freq: 520, sweep: 3.4, q: 4, vol: .09 }); nz(.22, { freq: 1500, sweep: .7, q: 3, vol: .045, at: .17 }); tn(280, .14, { slide: 2.1, vol: .035, at: .22 }); },
    gurgle() { for (let i = 0; i < 5; i++) tn(220 + Math.random() * 320, .08, { slide: 1.8, vol: .045, at: i * .07 }); nz(.45, { freq: 800, sweep: .45, q: 3, vol: .05 }); },
    chop() { tn(165, .1, { slide: .5, vol: .13 }); nz(.05, { freq: 2700, q: 1.5, vol: .045 }); nz(.08, { freq: 620, q: .8, vol: .05, at: .012 }); },
    saw() { nz(.06, { freq: 1700 + Math.random() * 500, q: 1.4, vol: .025 }); },
    zip() { nz(.32, { freq: 1150, sweep: .3, q: 1.4, vol: .06 }); tn(330, .22, { slide: .55, vol: .03 }); },
    plop(i = 0) { tn(290 + (i % 5) * 38, .12, { slide: 2.1, vol: .085 }); nz(.06, { freq: 760, q: .8, vol: .035 }); },
    drip(i = 0) { tn(820 + (i % 4) * 140, .08, { slide: 1.9, vol: .035 }); },
    squelch() { nz(.14, { freq: 420, sweep: .6, q: .5, vol: .05 }); },
    rub() { nz(.12, { freq: 2400, q: 2.2, vol: .03 }); }
  };


  /* ---------------------------------------------------------------- little hints (hidden in photos) */
  // a fingertip that slides along a path again and again: "do this"
  function ghost(g, c, pts, r, period = 1.7) {
    if (hush() || !pts || pts.length < 2) return;
    const u = (g.t % period) / period; if (u > .86) return; const k = u / .86, segs = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const l = D(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); segs.push(l); tot += l; }
    const at = d => { for (let i = 0; i < segs.length; i++) { if (d <= segs[i] || i === segs.length - 1) { const f = segs[i] ? clamp(d / segs[i], 0, 1) : 0; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; } d -= segs[i]; } return pts[0]; };
    const a = Math.min(1, k * 7, (1 - k) * 7);
    c.save();
    for (let j = 1; j < 9; j++) { const q = at(Math.max(0, k - j * .022) * tot); c.globalAlpha = a * .3 * (1 - j / 9); circ(c, q[0], q[1], r * (.85 - j * .05), '#ffffff'); }
    const q = at(k * tot); c.globalAlpha = a * .92; circ(c, q[0], q[1], r, 'rgba(255,255,255,.85)'); c.strokeStyle = '#ff6b9d'; c.lineWidth = Math.max(3, r * .22); c.beginPath(); c.arc(q[0], q[1], r, 0, TAU); c.stroke();
    c.restore();
  }
  function glowRing(g, c, x, y, r, a = 1) { if (hush()) return; c.save(); c.globalAlpha = a * (.4 + .25 * Math.sin(g.t * 6)); c.strokeStyle = '#ffe066'; c.lineWidth = Math.max(4, r * .1); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.globalAlpha *= .35; c.lineWidth *= 2.6; c.stroke(); c.restore(); }
  const pointAt = (g, c, x, y, r) => { if (!hush()) drawTapHint(c, x, y, r, g.t); };
  const spark = (c, x, y, r, col = '#fff') => { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); };
  const drop = (c, x, y, r) => { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.moveTo(x, y - r * 1.5); c.quadraticCurveTo(x + r, y - r * .2, x + r, y + r * .3); c.arc(x, y + r * .3, r, 0, Math.PI); c.quadraticCurveTo(x - r, y - r * .2, x, y - r * 1.5); c.fill(); c.strokeStyle = 'rgba(120,180,220,.6)'; c.lineWidth = Math.max(.8, r * .25); c.stroke(); };


  /* ---------------------------------------------------------------- pictures: hands and tools */
  const SKIN = '#ffd4b2', SKIN_D = '#e8a684';
  // a flat hand seen from above, pressing down (for rolling a lemon and pressing it on the juicer)
  function drawFlatHand(c, x, y, s, rot = 0, press = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); const k = 1 - press * .05; c.scale(k, k);
    ell(c, s * .07, s * .16, s * .48, s * .4, 'rgba(80,40,20,.16)');
    const finger = (fx, fy, len, w, a) => { c.save(); c.translate(fx, fy); c.rotate(a); c.fillStyle = SKIN_D; rr(c, -w / 2 - 1.5, -len - 1.5, w + 3, len + w * .6 + 3, w / 2 + 1.5); c.fill(); c.fillStyle = SKIN; rr(c, -w / 2, -len, w, len + w * .6, w / 2); c.fill(); ell(c, 0, -len + w * .42, w * .27, w * .2, '#ffece0'); c.restore(); };
    for (const [fx, len, a] of [[-.25, .34, -.13], [-.085, .4, -.04], [.085, .38, .04], [.24, .3, .15]]) finger(fx * s, -s * .1, len * s, s * .155, a);
    finger(-s * .3, s * .14, s * .3, s * .17, -1.05);
    c.fillStyle = SKIN_D; rr(c, -s * .36, -s * .19, s * .72, s * .56, s * .24); c.fill(); c.fillStyle = SKIN; rr(c, -s * .34, -s * .17, s * .68, s * .52, s * .22); c.fill();
    c.strokeStyle = 'rgba(220,150,120,.45)'; c.lineWidth = Math.max(1, s * .012); for (const fx of [-.17, 0, .17]) { c.beginPath(); c.moveTo(fx * s, -s * .14); c.lineTo(fx * s, -s * .06); c.stroke(); }
    shine(c, -s * .1, -s * .02, s * .17, s * .08, -.3, .3);
    c.restore();
  }
  // A kid-safe knife: a chunky green handle with a finger guard and a broad blade with a round tip and a wavy edge (no point, no sharp
  // edge). The handle ends at the origin and the blade points along +x (rotated by ang); s is its whole length.
  function drawKidKnife(c, x, y, s, ang = 0) {
    c.save(); c.translate(x, y); c.rotate(ang); c.lineJoin = c.lineCap = 'round';
    const hl = s * .38, bl = s * .62, bw = s * .16;
    c.fillStyle = 'rgba(80,40,20,.15)'; rr(c, -hl + 4, -bw * .4 + 7, hl + bl, bw * .9, bw * .45); c.fill();
    c.beginPath(); c.moveTo(s * .02, -bw * .5); c.lineTo(bl - bw * .55, -bw * .5); c.quadraticCurveTo(bl + bw * .06, -bw * .5, bl, bw * .04); c.quadraticCurveTo(bl - bw * .06, bw * .42, bl - bw * .5, bw * .42);
    const n = 7, x0 = bl - bw * .5, x1 = s * .04; for (let i = 0; i < n; i++) { const xa = x0 - (x0 - x1) * (i / n), xb = x0 - (x0 - x1) * ((i + 1) / n); c.quadraticCurveTo((xa + xb) / 2, bw * .6, xb, bw * .42); }
    c.closePath(); c.fillStyle = lin(c, 0, -bw * .5, 0, bw * .55, [[0, '#ffffff'], [.55, '#e8f0f6'], [1, '#c4d2df']]); c.fill(); c.strokeStyle = '#9fb1c2'; c.lineWidth = Math.max(1, s * .012); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.9)'; rr(c, s * .07, -bw * .38, bl * .72, bw * .12, bw * .06); c.fill();
    c.fillStyle = '#2f9a4e'; rr(c, -s * .025, -bw * .74, s * .055, bw * 1.48, s * .027); c.fill();
    c.fillStyle = lin(c, 0, -bw * .56, 0, bw * .56, [[0, '#86e08f'], [.5, '#4fbf6a'], [1, '#2f9a4e']]); rr(c, -hl, -bw * .56, hl - s * .015, bw * 1.12, bw * .56); c.fill();
    c.strokeStyle = 'rgba(30,110,60,.45)'; c.lineWidth = Math.max(1.5, s * .014); for (const k of [.3, .5, .7]) { c.beginPath(); c.moveTo(-hl * k, -bw * .34); c.lineTo(-hl * k, bw * .34); c.stroke(); }
    shine(c, -hl * .55, -bw * .28, hl * .3, bw * .1, 0, .5);
    c.restore();
  }
  // a fork with a green handle; the prongs point along -y from the origin (their tips at y = -s * .5), turned by ang
  function drawFork(c, x, y, s, ang = 0) {
    c.save(); c.translate(x, y); c.rotate(ang); c.lineJoin = c.lineCap = 'round';
    const steel = lin(c, -s * .08, 0, s * .08, 0, [[0, '#f6f9fc'], [1, '#a9b6c8']]);
    c.fillStyle = steel; for (let i = 0; i < 4; i++) { const tx = (-.054 + i * .036) * s; rr(c, tx - s * .011, -s * .5, s * .022, s * .21, s * .011); c.fill(); }
    c.beginPath(); c.moveTo(-s * .072, -s * .32); c.lineTo(s * .072, -s * .32); c.quadraticCurveTo(s * .074, -s * .22, s * .025, -s * .18); c.lineTo(-s * .025, -s * .18); c.quadraticCurveTo(-s * .074, -s * .22, -s * .072, -s * .32); c.fill();
    rr(c, -s * .022, -s * .2, s * .044, s * .2, s * .02); c.fill(); c.strokeStyle = 'rgba(120,135,160,.6)'; c.lineWidth = Math.max(1, s * .01); c.stroke();
    c.fillStyle = lin(c, -s * .05, 0, s * .05, 0, [[0, '#86e08f'], [.5, '#4fbf6a'], [1, '#2f9a4e']]); rr(c, -s * .05, -s * .03, s * .1, s * .53, s * .05); c.fill();
    shine(c, -s * .018, s * .12, s * .014, s * .14, 0, .45);
    c.restore();
  }


  /* ---------------------------------------------------------------- pictures: lemons */
  const LEM = { hi: '#fff6a0', mid: '#ffdc38', lo: '#f0b818', edge: '#d49d10' };
  const JUICE = '#ffd84a', LEMONADE = '#fff09a', WATER = '#a9dcf7';
  const lemonPath = (c, rx, ry) => { c.beginPath(); for (let i = 0; i <= 56; i++) { const a = i / 56 * TAU, ca = Math.cos(a), nub = .17 * Math.pow(Math.abs(ca), 16), x = ca * rx * (1 + nub), y = Math.sin(a) * ry * (1 - .05 * ca * ca); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); };
  // a whole lemon lying down, long side along x (turned by ang). roll moves its dimples round (it rolls), juicy 0..1 makes it glow, press squashes it
  function drawLemon(c, x, y, s, ang = 0, roll = 0, juicy = 0, press = 0, t = 0) {
    const rx = s * .46 * (1 + press * .04), ry = s * .34 * (1 - press * .1);
    c.save(); c.translate(x, y);
    ell(c, s * .04, s * .26, s * .44, s * .1, 'rgba(80,40,20,.16)');
    c.rotate(ang);
    if (juicy > .02) { c.save(); c.globalAlpha = juicy * .5; c.fillStyle = rad(c, 0, 0, rx * .6, rx * 1.4, [[0, 'rgba(255,240,120,.9)'], [1, 'rgba(255,240,120,0)']]); c.beginPath(); c.ellipse(0, 0, rx * 1.4, ry * 1.6, 0, 0, TAU); c.fill(); c.restore(); }
    c.fillStyle = rad(c, -rx * .35, -ry * .4, s * .04, s * .62, [[0, LEM.hi], [.45, juicy > .5 ? '#ffe24a' : LEM.mid], [1, LEM.lo]]); lemonPath(c, rx, ry); c.fill();
    c.save(); lemonPath(c, rx, ry); c.clip();
    for (let i = 0; i < 36; i++) { const u = rnd(i * 3 + 1) * 2 - 1, v = ((rnd(i * 3 + 2) * 2 + roll / Math.PI) % 2 + 4) % 2 - 1, k = Math.cos(v * Math.PI / 2); if (k < .15) continue; ell(c, u * rx * .9 * Math.sqrt(1 - .5 * u * u), Math.sin(v * Math.PI / 2) * ry * .95, s * .011, s * .011 * k, `rgba(190,130,0,${.3 * k})`); }
    c.fillStyle = lin(c, 0, -ry, 0, ry, [[0, 'rgba(255,255,255,0)'], [.55, 'rgba(230,150,0,0)'], [1, 'rgba(205,125,0,.32)']]); c.fillRect(-rx * 1.3, -ry, rx * 2.6, ry * 2);
    c.restore();
    lemonPath(c, rx, ry); c.strokeStyle = LEM.edge; c.lineWidth = Math.max(1, s * .014); c.stroke();
    shine(c, -rx * .36, -ry * .46, rx * .28, ry * .13, -.25, .6); circ(c, -rx * .62, -ry * .18, s * .018, 'rgba(255,255,255,.6)');
    circ(c, rx * 1.15, 0, s * .022, '#c9a020'); circ(c, -rx * 1.15, 0, s * .016, '#d8b030');
    if (juicy > .5) for (let i = 0; i < 4; i++) { const a = i * 1.7 + t * 1.3, k = .5 + .5 * Math.sin(t * 5 + i * 2); spark(c, Math.cos(a) * rx * 1.05, Math.sin(a) * ry * 1.25, s * .05 * k * (juicy - .4), '#fff'); }
    c.restore();
  }
  // a lemon half, cut side up (s = its width). o.k flattens it, o.juiced squeezed (paler, no seeds), o.wheel a thin slice, o.seeds false hides the seeds
  function drawLemonFace(c, x, y, s, o = {}) {
    const r = s * .5, k = o.k || .92, j = o.juiced || 0;
    c.save(); c.translate(x, y);
    if (o.shadow !== false) ell(c, s * .04, r * k * .95, r * .98, r * k * .3, 'rgba(80,40,20,.16)');
    c.scale(1, k);
    if (o.wheel) circ(c, 0, r * .08, r, LEM.edge); else circ(c, 0, r * .1, r * .98, '#e8b018');
    circ(c, 0, 0, r, LEM.lo); circ(c, 0, -r * .015, r * .95, LEM.mid); circ(c, 0, 0, r * .86, '#fffbea');
    for (let i = 0; i < 8; i++) {
      const a0 = i / 8 * TAU + .2, a1 = a0 + TAU / 8, am = (a0 + a1) / 2;
      c.beginPath(); c.moveTo(Math.cos(am) * r * .1, Math.sin(am) * r * .1); c.arc(0, 0, r * .8, a0 + .07, a1 - .07); c.closePath();
      c.fillStyle = rad(c, 0, 0, r * .05, r * .82, [[0, j ? '#fff6c8' : '#fff1a0'], [1, j ? '#f4dc86' : '#ffd84a']]); c.fill();
      c.strokeStyle = `rgba(255,255,255,${.55 - j * .3})`; c.lineWidth = Math.max(1, r * .025); c.beginPath(); c.moveTo(Math.cos(am) * r * .25, Math.sin(am) * r * .25); c.lineTo(Math.cos(am) * r * .64, Math.sin(am) * r * .64); c.stroke();
    }
    circ(c, 0, 0, r * .1, '#fffbea');
    if (o.seeds !== false && !j && !o.wheel) for (const [a, d] of [[.9, .42], [2.75, .46], [4.6, .4]]) { c.save(); c.translate(Math.cos(a) * r * d, Math.sin(a) * r * d); c.rotate(a + Math.PI / 2); ell(c, 0, 0, r * .045, r * .085, '#f6ecd0'); c.strokeStyle = 'rgba(190,160,90,.7)'; c.lineWidth = Math.max(.8, r * .015); c.stroke(); c.restore(); }
    shine(c, -r * .45, -r * .42, r * .22, r * .08, -.6, .5);
    c.restore();
  }
  // a lemon half lying cut side down (on the juicer): its flat side at y, s = width; squash flattens it as it is squeezed, twist turns it
  function drawLemonDome(c, x, y, s, squash = 0, twist = 0) {
    const rx = s * .5 * (1 + squash * .1), ry = s * .44 * (1 - squash * .5);
    c.save(); c.translate(x, y);
    const dome = () => { c.beginPath(); c.moveTo(-rx, 0); c.bezierCurveTo(-rx, -ry * .75, -rx * .55, -ry, 0, -ry); c.bezierCurveTo(rx * .55, -ry, rx, -ry * .75, rx, 0); c.closePath(); };
    c.fillStyle = rad(c, -rx * .3, -ry * .7, s * .03, s * .72, [[0, LEM.hi], [.5, LEM.mid], [1, LEM.lo]]); dome(); c.fill();
    c.save(); dome(); c.clip(); for (let i = 0; i < 28; i++) { const u = ((rnd(i * 5 + 1) + twist / TAU) % 1 + 1) % 1 * 2 - 1, v = rnd(i * 5 + 2), k = Math.sqrt(Math.max(0, 1 - u * u)); ell(c, Math.sin(u * Math.PI / 2) * rx * .95, -v * ry * .9 * (.4 + .6 * k), s * .011 * k + .4, s * .01, `rgba(190,130,0,${.3 * k})`); } c.restore();
    dome(); c.strokeStyle = LEM.edge; c.lineWidth = Math.max(1, s * .014); c.stroke();
    ell(c, 0, 0, rx * .98, Math.max(1.5, s * .03), '#fff6cf');
    circ(c, 0, -ry * 1.01, s * .022, '#c9a020');
    shine(c, -rx * .4, -ry * .62, rx * .2, ry * .12 + .5, -.5, .5);
    c.restore();
  }


  /* ---------------------------------------------------------------- pictures: strawberries, grapes, bananas */
  const berryPath = (c, s) => { c.beginPath(); c.moveTo(0, s * .47); c.bezierCurveTo(-s * .55, s * .12, -s * .44, -s * .4, 0, -s * .3); c.bezierCurveTo(s * .44, -s * .4, s * .55, s * .12, 0, s * .47); c.closePath(); };
  const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };
  // a strawberry cut in half the long way, cut side up: a red edge dotted with seeds, pink flesh and a pale heart in the middle
  function drawBerryHalf(c, s) {
    c.save(); c.lineJoin = c.lineCap = 'round';
    berryPath(c, s); c.fillStyle = '#d8323e'; c.fill();
    c.save(); c.translate(0, s * .03); c.scale(.86, .87); berryPath(c, s); c.restore(); c.fillStyle = rad(c, 0, s * .02, s * .04, s * .44, [[0, '#ffe4e6'], [.35, '#ff9ba6'], [1, '#f2535f']]); c.fill();
    c.strokeStyle = 'rgba(255,238,240,.9)'; c.lineWidth = Math.max(1, s * .022);
    c.beginPath(); c.moveTo(0, -s * .2); c.quadraticCurveTo(s * .02, s * .1, 0, s * .32); c.stroke();
    for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(0, -s * .12); c.quadraticCurveTo(sg * s * .16, -s * .02, sg * s * .26, s * .04); c.stroke(); c.beginPath(); c.moveTo(0, s * .06); c.quadraticCurveTo(sg * s * .12, s * .14, sg * s * .17, s * .25); c.stroke(); }
    for (const sg of [-1, 1]) for (let i = 1; i < 8; i++) { const t = i / 8, px = bez(0, -.55, -.44, 0, t) * sg * .93, py = bez(.47, .12, -.4, -.3, t) * .93 + .015; ell(c, px * s, py * s, s * .018, s * .026, '#ffe27a'); }
    for (const a of [-1.0, -.35, .35, 1.0]) { c.save(); c.translate(0, -s * .3); c.rotate(a); ell(c, 0, -s * .03, s * .05, s * .12, '#4fb86a'); c.restore(); }
    circ(c, 0, -s * .3, s * .04, '#3c9a55');
    shine(c, -s * .2, -s * .1, s * .05, s * .1, .3, .35);
    c.restore();
  }
  const GR6 = [[-.22, -.1], [0, -.14], [.22, -.1], [-.12, .1], [.12, .1], [0, .3]];
  const grapesPath = (c, s) => { c.beginPath(); for (const [x, y] of GR6) { c.moveTo(x * s + s * .17, y * s); c.arc(x * s, y * s, s * .17, 0, TAU); } };
  const GRAPE = { skin: '#5a2f8c', hi: '#a77ddb', lo: '#6a3aa0', flesh: '#e6f4c4', lo2: '#c8e29a' };
  function drawGrape(c, rx, ry) {
    ell(c, rx * .1, ry * .95, rx * .9, ry * .25, 'rgba(80,40,20,.15)');
    ell(c, 0, 0, rx, ry, GRAPE.skin); ell(c, -rx * .04, -ry * .04, rx * .9, ry * .9, lin(c, -rx, -ry, rx, ry, [[0, GRAPE.hi], [1, GRAPE.lo]]));
    shine(c, -rx * .38, -ry * .45, rx * .25, ry * .13, -.6, .6); circ(c, 0, -ry * .96, rx * .1, '#7a5a30');
  }
  // a grape cut into parts lying cut side up: n = 2 halves or 4 quarters, pushed apart by gx (sideways) and gy (up and down)
  function drawGrapeParts(c, rx, ry, n, gx, gy) {
    const P = n === 2 ? [[Math.PI / 2, Math.PI * 1.5, -1, 0], [-Math.PI / 2, Math.PI / 2, 1, 0]] : [[Math.PI, Math.PI * 1.5, -1, -1], [-Math.PI / 2, 0, 1, -1], [0, Math.PI / 2, 1, 1], [Math.PI / 2, Math.PI, -1, 1]];
    for (const [a0, a1, sx, sy] of P) {
      c.save(); c.translate(sx * gx, sy * gy);
      const wedge = k => { c.beginPath(); c.moveTo(0, 0); c.ellipse(0, 0, rx * k, ry * k, 0, a0, a1); c.closePath(); };
      ell(c, sx * rx * .2, ry * .6 + (sy > 0 ? ry * .3 : 0), rx * .55, ry * .16, 'rgba(80,40,20,.12)');
      wedge(1); c.fillStyle = GRAPE.skin; c.fill(); wedge(.84); c.fillStyle = rad(c, 0, 0, rx * .05, rx * 1.0, [[0, '#f6fce8'], [.6, GRAPE.flesh], [1, GRAPE.lo2]]); c.fill();
      c.globalAlpha = .7; ell(c, sx * rx * .32, (sy || -.3) * ry * .32, rx * .12, ry * .07, '#ffffff'); c.globalAlpha = 1;
      c.restore();
    }
  }
  // one grape quarter on its own (in bowls and on the fork), r = the grape's width
  function drawGrapeQuarter(c, r) { c.save(); c.translate(-r * .35, r * .32); drawGrapeParts(c, r, r * 1.15, 4, 0, 0); c.restore(); }
  // A quarter of a grape, lying in a bowl: a long half-moon with a round purple back. Most land cut side up (pale green inside, purple skin along the edge),
  // the others skin up (all purple and shiny). v picks which.
  function drawGrapeBit(c, r, v) {
    const moon = k => { c.beginPath(); c.ellipse(0, 0, r * 1.05 * k, r * 1.15 * k, 0, -Math.PI / 2, Math.PI / 2); c.closePath(); };
    c.save(); c.translate(-r * .4, 0);
    ell(c, r * .5, r * .9, r * .55, r * .25, 'rgba(70,30,60,.16)');
    if (v % 3 !== 0) { moon(1); c.fillStyle = GRAPE.skin; c.fill(); moon(.88); c.fillStyle = rad(c, r * .1, 0, r * .05, r * 1.2, [[0, '#f8fdea'], [.6, GRAPE.flesh], [1, GRAPE.lo2]]); c.fill(); c.strokeStyle = 'rgba(160,190,110,.6)'; c.lineWidth = Math.max(.8, r * .08); c.beginPath(); c.moveTo(r * .08, -r * .6); c.quadraticCurveTo(r * .3, 0, r * .08, r * .6); c.stroke(); }
    else { moon(1); c.fillStyle = rad(c, r * .25, -r * .45, r * .05, r * 1.4, [[0, GRAPE.hi], [.5, '#7d4ab8'], [1, GRAPE.skin]]); c.fill(); shine(c, r * .35, -r * .4, r * .16, r * .32, .2, .6); }
    c.restore();
  }
  function drawPiece1(c, k, R, v = 0) {
    if (k === 'banana') { c.scale(1, .86); ING.banana(c, R * .3); }
    else if (k === 'berry') drawBerryHalf(c, R * .27);
    else drawGrapeBit(c, R * .068, v);
  }
  const PEEL = '#ffd84a', PEEL_D = '#e2a91c', PEEL_IN = '#fbf1c8';
  // A banana standing up, being peeled: three strips of peel (left, front, right) that fold down from the top. ps[id] = how far each strip
  // is down (0..1). part: 'back' (open side strips, behind the banana), 'flesh', or 'front' (the bottom of the peel, the closed strips and the
  // front strip). Its outline is a gentle bow, narrow at the stem and the tip; every strip follows that outline.
  const SPOTS = Array.from({ length: 16 }, (_, i) => [rnd(i * 7 + 3) * 1.6 - .8, .1 + rnd(i * 7 + 5) * .85, .5 + rnd(i * 7 + 6)]);
  function drawPeelBanana(c, L, ps, part) {
    const top = -L * .44, bot = L * .45, yB = L * .1, pw = L * .13, N = 30;
    const U = y => (y - top) / (bot - top), cx = y => L * .05 * (1 - 4 * (U(y) - .5) ** 2);
    const hw = y => { const u = clamp(U(y), 0, 1); return pw * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 6))) * (.84 + .16 * u); };
    const ys = (y0, y1, i) => y0 + (y1 - y0) * (1 - Math.cos(Math.PI * i / N)) / 2;
    const band = (a, b, y0, y1, k = 1) => { c.beginPath(); for (let i = 0; i <= N; i++) { const y = ys(y0, y1, i); c.lineTo(cx(y) + a * hw(y) * k, y); } for (let i = N; i >= 0; i--) { const y = ys(y0, y1, i); c.lineTo(cx(y) + b * hw(y) * k, y); } c.closePath(); };
    const peelFill = () => lin(c, -pw, 0, pw + L * .05, 0, [[0, PEEL_D], [.25, PEEL], [.6, '#ffe878'], [1, PEEL_D]]);
    const edge = () => { c.strokeStyle = 'rgba(185,135,25,.7)'; c.lineWidth = Math.max(1, L * .007); c.stroke(); };
    // the outline is stroked as the two open sides of a band, so the bands meet with no line across the banana
    const sides = (a, b, y0, y1) => { for (const q of [a, b]) { c.beginPath(); for (let i = 0; i <= N; i++) { const y = ys(y0, y1, i); c.lineTo(cx(y) + q * hw(y), y); } edge(); } };
    const spots = (a0, a1, y0, y1) => { for (const [a, u, k] of SPOTS) { const y = top + u * (bot - top); if (a < a0 || a > a1 || y < y0 || y > y1) continue; ell(c, cx(y) + a * hw(y), y, L * .0065 * k, L * .005 * k, 'rgba(140,95,30,.36)'); } };
    const strip = (len, w, inside, stem) => {
      c.beginPath(); c.moveTo(-w / 2, 0); c.bezierCurveTo(-w * .62, -len * .5, -w * .45, -len * .86, 0, -len); c.bezierCurveTo(w * .45, -len * .86, w * .62, -len * .5, w / 2, 0); c.closePath();
      c.fillStyle = inside ? lin(c, -w / 2, 0, w / 2, 0, [[0, '#efdc9c'], [.5, PEEL_IN], [1, '#efdc9c']]) : lin(c, -w / 2, 0, w / 2, 0, [[0, PEEL_D], [.45, PEEL], [1, PEEL_D]]); c.fill();
      c.strokeStyle = 'rgba(190,140,30,.55)'; c.lineWidth = Math.max(1, L * .006); c.stroke();
      if (inside) { c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1, L * .005); for (const k of [-.18, 0, .18]) { c.beginPath(); c.moveTo(k * w, -len * .08); c.quadraticCurveTo(k * w * 1.2, -len * .5, k * w * .3, -len * .9); c.stroke(); } }
      else for (const [x, y] of [[-.15, -.3], [.12, -.55], [-.05, -.75]]) ell(c, x * w, y * len, L * .008, L * .006, 'rgba(140,95,30,.45)');
      ell(c, 0, -len * .97, w * .16, len * .04, inside ? '#c9a868' : '#9a7a2e');
      if (stem) { c.fillStyle = '#7a6328'; rr(c, -L * .02, -len - L * .07, L * .04, L * .08, L * .015); c.fill(); }
    };
    const sl = yB - top + L * .04;
    c.save(); c.lineJoin = c.lineCap = 'round';
    if (part === 'back') for (const [id, sg] of [['left', -1], ['right', 1]]) { const p = ps[id]; if (p <= 0) continue; c.save(); c.translate(cx(yB) + sg * hw(yB) * .64, yB); c.rotate(sg * ease(p) * 2.65); strip(sl, hw(yB) * .72, p > .42); c.restore(); }
    if (part === 'flesh') {
      band(-1, 1, top + L * .005, bot - L * .02, .74); c.fillStyle = lin(c, -pw * .74, 0, pw * .74 + L * .05, 0, [[0, '#efd896'], [.35, '#fff8dc'], [1, '#e8cd84']]); c.fill(); c.strokeStyle = 'rgba(210,180,100,.6)'; c.lineWidth = Math.max(1, L * .006); c.stroke();
      c.strokeStyle = 'rgba(225,195,120,.45)'; c.lineWidth = Math.max(1, L * .005); for (const k of [-.33, .33]) { c.beginPath(); for (let i = 3; i <= N - 3; i++) { const y = ys(top, bot, i); c.lineTo(cx(y) + k * hw(y) * .74, y); } c.stroke(); }
      ell(c, cx(top), top + L * .01, pw * .2, L * .012, '#c9a868'); shine(c, cx(top + L * .3) - pw * .32, top + L * .3, pw * .1, L * .11, 0, .5);
    }
    if (part === 'front') {
      band(-1, 1, yB, bot); c.fillStyle = peelFill(); c.fill(); sides(-1, 1, yB, bot);
      c.save(); band(-1, 1, yB, bot); c.clip(); spots(-1, 1, yB, bot); c.restore();
      const B = { left: [-1, -1 / 3], front: [-1 / 3, 1 / 3], right: [1 / 3, 1] };
      for (const id of ['left', 'front', 'right']) if (ps[id] <= 0) { const [a, b] = B[id]; band(a, b, top, yB + 1); c.fillStyle = peelFill(); c.fill(); c.save(); c.clip(); spots(a, b, top, yB); c.restore(); sides(a, b, top, yB); }
      c.strokeStyle = 'rgba(175,125,25,.5)'; c.lineWidth = Math.max(1, L * .006);
      for (const k of [-1 / 3, 1 / 3]) { const closed = k < 0 ? ps.left <= 0 && ps.front <= 0 : ps.front <= 0 && ps.right <= 0; c.beginPath(); for (let i = 2; i <= N - 2; i++) { const y = ys(top, bot, i); if (y < yB && !closed) continue; c.lineTo(cx(y) + k * hw(y), y); } c.stroke(); }
      ell(c, cx(bot), bot, L * .022, L * .014, '#5a3a1a');
      if (ps.left <= 0 && ps.front <= 0) shine(c, cx(top + L * .32) - pw * .55, top + L * .32, pw * .09, L * .13, 0, .4);
      if (ps.front <= 0) { c.fillStyle = '#7a6328'; rr(c, cx(top) - L * .02, top - L * .085, L * .04, L * .1, L * .015); c.fill(); ell(c, cx(top), top - L * .085, L * .022, L * .01, '#5e4a1c'); }
      else { const p = ps.front, k = Math.cos(ease(p) * Math.PI) * (p > .5 ? .78 : 1); c.save(); c.translate(cx(yB), yB); c.scale(1, k); strip(sl, hw(yB) * .74, k < 0, true); c.restore(); }
    }
    c.restore();
  }
  // the peeled banana lying down, cut into coins from its right end. done cuts so far (of want), each opening by sep[k]; tip turns the
  // pieces over into coins (0..1)
  function drawBananaLog(c, x, y, len, th, want, done, sep, tip = 0) {
    const us = []; for (let k = 0; k < done; k++) us.push(1 - (k + 1) / (want + 1));
    const off = u => { let o = 0; for (let k = 0; k < done; k++) o += (u > us[k] ? .5 : -.5) * ease(sep[k] || 0) * len * .075; return o; };
    const yc = u => -th * .35 * (1 - (2 * u - 1) ** 2), hh = u => th * .5 * (.62 + .38 * Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), .5));
    const shape = () => {
      const N = 32; c.beginPath();
      for (let i = 0; i <= N; i++) { const u = i / N; c.lineTo(-len / 2 + u * len, yc(u) - hh(u)); }
      c.quadraticCurveTo(len / 2 + hh(1) * 1.3, yc(1), len / 2, yc(1) + hh(1));
      for (let i = N; i >= 0; i--) { const u = i / N; c.lineTo(-len / 2 + u * len, yc(u) + hh(u)); }
      c.quadraticCurveTo(-len / 2 - hh(0) * 1.3, yc(0), -len / 2, yc(0) - hh(0)); c.closePath();
    };
    const body = () => {
      c.fillStyle = lin(c, 0, -th * .8, 0, th * .45, [[0, '#fffae4'], [.5, '#f8e6aa'], [1, '#e6cc84']]); shape(); c.fill(); c.strokeStyle = 'rgba(205,170,95,.7)'; c.lineWidth = Math.max(1, th * .03); c.stroke();
      c.strokeStyle = 'rgba(225,195,125,.5)'; c.lineWidth = Math.max(1, th * .025); for (const k of [-.18, .2]) { c.beginPath(); for (let i = 1; i < 20; i++) { const u = i / 20; c.lineTo(-len / 2 + u * len, yc(u) + hh(u) * k * 2); } c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1.5, th * .07); c.beginPath(); for (let i = 3; i < 18; i++) { const u = i / 20; c.lineTo(-len / 2 + u * len, yc(u) - hh(u) * .55); } c.stroke();
      ell(c, -len / 2 - hh(0) * .2, yc(0), th * .11, th * .13, '#b98d4a'); ell(c, len / 2 + hh(1) * .25, yc(1), th * .07, th * .09, '#cfa860');
    };
    const edges = [0, ...us.slice().sort((a, b) => a - b), 1];
    for (let i = 0; i < edges.length - 1; i++) {
      const u0 = edges[i], u1 = edges[i + 1], um = (u0 + u1) / 2, dx = off(um);
      if (tip < 1) {
        c.save(); c.globalAlpha = 1 - tip; c.translate(x + dx, y); c.beginPath(); c.rect(-len / 2 + u0 * len - (i === 0 ? th : 0), -th * 2, (u1 - u0) * len + (i === 0 ? th : 0) + (i === edges.length - 2 ? th : 0), th * 4); c.clip(); body(); c.restore();
        for (const u of [u0, u1]) if (u > 0 && u < 1) { const e = ease(sep[us.indexOf(u)] || 0); if (e > .05) { c.save(); c.globalAlpha = 1 - tip; ell(c, x + dx - len / 2 + u * len, y + yc(u), th * .09 * e, hh(u) * .94, '#fffbe8'); c.restore(); } }
      }
      if (tip > 0) { c.save(); c.globalAlpha = tip; c.translate(x + dx - len / 2 + um * len, y + yc(um)); c.scale(lerp(.25, 1, tip), 1); ING.banana(c, hh(um) * 2.15); c.restore(); }
    }
  }


  /* ---------------------------------------------------------------- pictures: bowls */
  // A clear glass bowl seen from a little above, its rim centred at (x, y), rim radius R. inner(c) draws what is inside, clipped so it
  // stays inside the glass but can heap up above the rim. o.water: { lv, murk, rip, t } fills it with water first.
  const bowlCurve = (c, R) => { c.moveTo(-R, 0); c.bezierCurveTo(-R, R * .52, -R * .55, R * .7, 0, R * .7); c.bezierCurveTo(R * .55, R * .7, R, R * .52, R, 0); };
  const silhouette = (c, R) => { c.beginPath(); bowlCurve(c, R); c.ellipse(0, 0, R, R * .3, 0, 0, Math.PI, true); c.closePath(); };
  const frontWall = (c, R) => { c.beginPath(); bowlCurve(c, R); c.ellipse(0, 0, R, R * .3, 0, 0, Math.PI, false); c.closePath(); };
  function glassBowl(c, x, y, R, inner, o = {}) {
    c.save(); c.translate(x, y); c.lineJoin = c.lineCap = 'round';
    ell(c, R * .05, R * .75, R * .8, R * .16, 'rgba(80,40,20,.16)');
    ell(c, 0, R * .69, R * .45, R * .1, 'rgba(196,224,242,.9)');
    c.fillStyle = 'rgba(214,236,252,.42)'; silhouette(c, R); c.fill();
    c.fillStyle = 'rgba(190,220,240,.4)'; c.beginPath(); c.ellipse(0, 0, R * .97, R * .29, 0, 0, TAU); c.fill();
    const W = o.water;
    if (W) {
      const lv = W.lv, col = mixHex('#7cc4ef', '#a08060', W.murk || 0);
      c.save(); silhouette(c, R); c.clip(); c.globalAlpha = .5; c.fillStyle = col; c.fillRect(-R, lv, R * 2, R); c.globalAlpha = .55; ell(c, 0, lv, R * .96, R * .28, mixHex('#bfe6fb', '#c8b090', W.murk || 0));
      c.globalAlpha = .7; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, R * .012);
      for (const r of W.rip || []) { const k = r.t / 1.2, rx = R * (.08 + k * .4); c.globalAlpha = .7 * (1 - k); c.beginPath(); c.ellipse(r.x * R, lv + R * .02, rx, rx * .3, 0, 0, TAU); c.stroke(); }
      c.restore();
    }
    if (inner) { c.save(); c.beginPath(); bowlCurve(c, R); c.lineTo(R, -R * 4); c.lineTo(-R, -R * 4); c.closePath(); c.clip(); inner(c); c.restore(); }
    if (W) { c.save(); silhouette(c, R); c.clip(); c.beginPath(); c.rect(-R, W.lv, R * 2, R); c.clip(); c.fillStyle = 'rgba(80,165,230,.32)'; c.fillRect(-R, W.lv, R * 2, R); c.restore(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1.5, R * .02); c.beginPath(); c.ellipse(0, W.lv, R * .95, R * .27, 0, .25, Math.PI - .25); c.stroke(); }
    c.fillStyle = 'rgba(236,248,255,.2)'; frontWall(c, R); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = R * .045; c.beginPath(); c.moveTo(-R * .8, R * .16); c.quadraticCurveTo(-R * .76, R * .46, -R * .46, R * .6); c.stroke();
    c.strokeStyle = 'rgba(110,160,200,.85)'; c.lineWidth = Math.max(1.5, R * .022); silhouette(c, R); c.stroke();
    c.strokeStyle = 'rgba(120,170,210,.95)'; c.lineWidth = Math.max(2, R * .03); c.beginPath(); c.ellipse(0, 0, R, R * .3, 0, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1.5, R * .018); c.beginPath(); c.ellipse(0, -R * .01, R * .96, R * .28, 0, Math.PI * 1.1, Math.PI * 1.55); c.stroke();
    c.restore();
  }
  // a little white bowl of cut fruit (kind 'banana', 'berry' or 'grape', n pieces), rim centred at (x, y), radius r, tipped by tilt
  const BAND = { banana: '#ffd84a', berry: '#ff7a8c', grape: '#a77ddb' };
  function drawPrepBowl(c, x, y, r, kind, n, tilt = 0, pk = 1.25) {
    c.save(); c.translate(x, y); c.rotate(tilt); c.lineJoin = c.lineCap = 'round';
    if (!tilt) ell(c, r * .05, r * .68, r * .82, r * .17, 'rgba(80,40,20,.16)');
    const body = () => { c.beginPath(); c.moveTo(-r, 0); c.bezierCurveTo(-r, r * .45, -r * .55, r * .64, 0, r * .64); c.bezierCurveTo(r * .55, r * .64, r, r * .45, r, 0); c.ellipse(0, 0, r, r * .32, 0, 0, Math.PI, true); c.closePath(); };
    c.fillStyle = lin(c, -r, 0, r, 0, [[0, '#dce7ef'], [.4, '#ffffff'], [1, '#ccdae6']]); body(); c.fill();
    ell(c, 0, 0, r * .92, r * .27, '#e6eef4'); ell(c, 0, r * .04, r * .8, r * .2, '#d9e4ec');
    c.save(); c.beginPath(); c.ellipse(0, 0, r * .92, r * .27, 0, 0, TAU); c.rect(-r, -r * 3, r * 2, r * 3); c.clip();
    for (let i = 0; i < n; i++) { const a = i * 2.4 + .3, d = .2 + .55 * rnd(i * 3 + 7), lift = Math.min(1, i / Math.max(4, n * .8)); c.save(); c.translate(Math.cos(a) * d * r * .62, r * .04 + Math.sin(a) * d * r * .15 - lift * r * .32); c.rotate(rnd(i * 5) * 4 - 2); drawPiece1(c, kind, r * pk, i); c.restore(); }
    c.restore();
    c.strokeStyle = BAND[kind] || '#7fd4f5'; c.lineWidth = Math.max(2, r * .09); c.beginPath(); c.ellipse(0, r * .16, r * .97, r * .32, 0, .22, Math.PI - .22); c.stroke();
    c.strokeStyle = '#c3d1dc'; c.lineWidth = Math.max(1.5, r * .045); c.beginPath(); c.ellipse(0, 0, r, r * .32, 0, 0, TAU); c.stroke();
    shine(c, -r * .62, r * .2, r * .1, r * .05, -.5, .6);
    c.restore();
  }
  // the bowl for peels (a little compost bowl): kind 'banana' or 'lemon', n peels in it
  function drawCompost(c, x, y, r, kind, n) {
    c.save(); c.translate(x, y); c.lineJoin = c.lineCap = 'round';
    ell(c, r * .05, r * .66, r * .85, r * .18, 'rgba(80,40,20,.16)');
    c.beginPath(); c.moveTo(-r, 0); c.bezierCurveTo(-r, r * .45, -r * .55, r * .64, 0, r * .64); c.bezierCurveTo(r * .55, r * .64, r, r * .45, r, 0); c.ellipse(0, 0, r, r * .32, 0, 0, Math.PI, true); c.closePath();
    c.fillStyle = lin(c, -r, 0, r, 0, [[0, '#5aa84a'], [.4, '#8fd47a'], [1, '#4f9a40']]); c.fill();
    ell(c, 0, 0, r * .9, r * .26, '#6b4a2e'); ell(c, 0, -r * .02, r * .7, r * .16, '#7c5a3a');
    for (let i = 0; i < Math.min(n, 6); i++) { c.save(); c.translate((rnd(i + 3) - .5) * r * .9, -r * .05 - rnd(i + 8) * r * .1); c.rotate(rnd(i) * 3 - 1.5); if (kind === 'lemon') { c.scale(.9, .7); drawLemonDome(c, 0, r * .1, r * .55, .7, i); } else { c.fillStyle = PEEL; c.beginPath(); c.ellipse(0, 0, r * .4, r * .09, 0, 0, TAU); c.fill(); c.fillStyle = PEEL_D; c.beginPath(); c.ellipse(r * .36, 0, r * .05, r * .05, 0, 0, TAU); c.fill(); } c.restore(); }
    c.strokeStyle = '#3f8a32'; c.lineWidth = Math.max(1.5, r * .05); c.beginPath(); c.ellipse(0, 0, r, r * .32, 0, 0, TAU); c.stroke();
    for (const a of [-.9, 0, .9]) { c.save(); c.translate(a * r * .55, r * .3 + Math.abs(a) * -r * .08); c.rotate(a * .4); ell(c, 0, 0, r * .07, r * .12, 'rgba(255,255,255,.55)'); c.restore(); }
    c.restore();
  }
  // a wicker basket for the fruit still to be washed: part 'back' or 'front'
  function drawBasket(c, x, y, rx, ry, part) {
    c.save(); c.translate(x, y); c.lineJoin = c.lineCap = 'round';
    if (part === 'back') { ell(c, rx * .05, ry * 1.5, rx * 1.05, ry * .4, 'rgba(80,40,20,.16)'); ell(c, 0, 0, rx, ry, '#a86a32'); ell(c, 0, ry * .1, rx * .9, ry * .8, '#8a5426'); }
    else {
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI); c.lineTo(-rx * .86, ry * 1.25); c.quadraticCurveTo(0, ry * 2.1, rx * .86, ry * 1.25); c.closePath();
      c.fillStyle = lin(c, -rx, 0, rx, 0, [[0, '#b0702f'], [.4, '#d99a52'], [1, '#a86a2c']]); c.fill();
      c.save(); c.clip(); c.strokeStyle = 'rgba(120,70,25,.55)'; c.lineWidth = Math.max(1, rx * .03);
      for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(i * rx * .16, ry * .2); c.quadraticCurveTo(i * rx * .16 * 1.05, ry, i * rx * .14, ry * 2); c.stroke(); }
      for (let j = 0; j < 4; j++) { c.beginPath(); c.ellipse(0, ry * (.45 + j * .38), rx * (1 - j * .04), ry * .9, 0, .15, Math.PI - .15); c.stroke(); }
      c.restore();
      c.strokeStyle = '#c98a44'; c.lineWidth = Math.max(3, ry * .32); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI); c.stroke();
      c.strokeStyle = 'rgba(255,230,190,.5)'; c.lineWidth = Math.max(1, ry * .08); c.beginPath(); c.ellipse(0, -ry * .05, rx * .98, ry, 0, .3, Math.PI - .3); c.stroke();
    }
    c.restore();
  }
  // a striped tea towel for the clean fruit
  function drawTowel(c, x, y, w, h, col) {
    c.save(); c.translate(x, y); c.fillStyle = 'rgba(80,40,20,.14)'; rr(c, -w / 2 + 3, -h / 2 + 6, w, h, h * .12); c.fill();
    c.fillStyle = '#fffaf2'; rr(c, -w / 2, -h / 2, w, h, h * .12); c.fill();
    c.save(); rr(c, -w / 2, -h / 2, w, h, h * .12); c.clip(); c.fillStyle = col; for (const [k, t] of [[-.38, .05], [-.27, .09], [.27, .09], [.38, .05]]) c.fillRect(-w / 2, k * h - h * t / 2, w, h * t);
    c.fillStyle = 'rgba(190,160,140,.16)'; c.fillRect(-w / 2, -h * .02, w, h * .05); c.restore();
    c.strokeStyle = 'rgba(210,190,170,.9)'; c.lineWidth = 1.5; rr(c, -w / 2, -h / 2, w, h, h * .12); c.stroke();
    c.strokeStyle = 'rgba(200,180,160,.8)'; for (let i = 0; i < 14; i++) { const fx = -w * .45 + i * w * .9 / 13; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(fx, sg * h / 2); c.lineTo(fx, sg * (h / 2 + h * .06)); c.stroke(); } }
    c.restore();
  }
  // the fruit salad itself: pieces heaped in the bowl (back ones and low ones first), honey on top, glossy when mixed
  const piecePos = (p, R) => { const x = Math.cos(p.a) * p.d * R * .8 * (.62 + .38 * Math.min(1, p.h)), yb = Math.sin(p.a) * p.d * R * .24; return { x, y: yb + R * (.44 - p.h * .6) }; };
  // o.skip leaves out pieces on the fork; o.left (0..1) is how much is still in the bowl (the honey goes with the fruit)
  function drawSalad(c, S, R, t, o = {}) {
    const list = [], left = o.left == null ? 1 : o.left, wet = Math.min(1, (S.glaze || 0) + (S.orange || 0) * .6 + (S.honey && S.honey.length ? .3 : 0));
    if (wet > .05) { c.save(); c.globalAlpha = wet * .55; ell(c, 0, R * .5, R * .4, R * .07, S.orange > .2 ? '#ffc861' : '#ffe08a'); c.globalAlpha = wet * .5; ell(c, -R * .1, R * .49, R * .14, R * .02, '#fff6d8'); c.restore(); }
    for (const p of S.pieces) { if (p.gone || (o.skip && p.taken)) continue; const q = piecePos(p, R); let y = q.y, x = q.x; if (p.drop > 0) { const u = ease(1 - p.drop); x = lerp((p.fx || 0) * R, q.x, u); y = lerp((p.fy || -1) * R, q.y, u) - Math.sin(u * Math.PI) * R * .15; } list.push({ p, x, y, z: p.drop > 0 ? 9 : p.h * 4 + Math.sin(p.a) * p.d * .5 }); }
    list.sort((a, b) => a.z - b.z);
    const gl = Math.min(1, (S.glaze || 0) * .8 + (S.orange || 0) * .5), glc = S.orange > .2 ? '#fff0c8' : '#ffffff';
    for (const { p, x, y } of list) {
      c.save(); c.translate(x, y); c.rotate(p.rot); drawPiece1(c, p.k, R, p.sd | 0);
      if (gl > .05) { c.globalAlpha = gl * .85; ell(c, -R * .03, -R * .035, R * .022, R * .01, glc); }
      c.restore();
    }
    for (const rb of S.honey || []) {
      if (rb.length < 2) continue; c.save(); c.globalAlpha = (1 - (S.glaze || 0) * .75) * left; c.lineCap = c.lineJoin = 'round';
      c.strokeStyle = 'rgba(226,140,20,.85)'; c.lineWidth = Math.max(2, R * .026); c.beginPath(); rb.forEach(([x, y], i) => i ? c.lineTo(x * R, y * R) : c.moveTo(x * R, y * R)); c.stroke();
      c.strokeStyle = 'rgba(255,228,150,.9)'; c.lineWidth = Math.max(1, R * .008); c.beginPath(); rb.forEach(([x, y], i) => i ? c.lineTo(x * R - R * .005, y * R - R * .006) : c.moveTo(x * R - R * .005, y * R - R * .006)); c.stroke();
      for (let i = 2; i < rb.length; i += 9) circ(c, rb[i][0] * R, rb[i][1] * R + R * .012, R * .016, 'rgba(226,140,20,.85)');
      c.restore();
    }
  }
  // the salad bowl the steps share (the same place every step, so nothing jumps)
  const SAL = g => { const R = Math.min(g.w * .38, g.SH * .5, g.U * .44); return { x: g.bx, y: g.by - R * .08, R }; };
  const SAMPLE_SALAD = (() => { const out = [], kinds = ['banana', 'berry', 'grape', 'grape', 'banana', 'berry', 'grape', 'banana']; for (let i = 0; i < 24; i++) { const d = Math.sqrt(rnd(i * 7 + 2)) * .85, frac = i / 24; out.push({ k: kinds[i % kinds.length], a: rnd(i * 7 + 1) * TAU, d, h: (.12 + frac * .95) * (1 - .22 * d * d), rot: rnd(i * 7 + 3) * TAU, sd: i * 13, drop: 0 }); } return { pieces: out, honey: [[[-.42, -.05], [-.25, .03], [-.05, -.08], [.12, .02], [.34, -.04]]], orange: 0, glaze: .5 }; })();
  const copySalad = S => ({ pieces: S.pieces.map(p => ({ ...p })), honey: S.honey.map(r => r.slice()), orange: S.orange, glaze: S.glaze });


  /* ---------------------------------------------------------------- pictures: glasses, cups and jugs (the liquid stays flat and keeps its amount when tipped) */
  const polyPath = (c, pts, k) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k)); c.closePath(); };
  function areaBelow(pts, L) {
    const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], ia = a[1] >= L, ib = b[1] >= L; if (ia) out.push(a); if (ia !== ib) { const t = (L - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, L]); } }
    let A = 0; for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; A += a[0] * b[1] - b[0] * a[1]; } return Math.abs(A) / 2;
  }
  // the height of the liquid (in the vessel's units, measured straight down the screen) for a share of its volume, whatever its tilt
  function levelOf(poly, tilt, fill) {
    const pts = tilt ? poly.map(([x, y]) => rotP(x, y, tilt)) : poly; let lo = 1e9, hi = -1e9; for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    const want = clamp(fill, 0, 1) * areaBelow(pts, lo - 1); let a = lo, b = hi;
    for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (areaBelow(pts, m) > want) a = m; else b = m; } return (a + b) / 2;
  }
  function widthAt(poly, y) { let lo = 1e9, hi = -1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) { const x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); lo = Math.min(lo, x); hi = Math.max(hi, x); } } return hi > lo ? { cx: (lo + hi) / 2, hw: (hi - lo) / 2 } : null; }
  // the liquid in a vessel (drawn in the vessel's turned frame); returns its level in pixels (straight down the screen from the origin)
  function liquid(c, poly, s, tilt, fill, col, o = {}) {
    if (fill <= .003) return null;
    const L = levelOf(poly, tilt, fill) * s;
    c.save(); polyPath(c, poly, s); c.clip(); c.rotate(-tilt);
    c.globalAlpha = o.alpha == null ? .9 : o.alpha; c.fillStyle = lin(c, 0, L, 0, L + s * (o.deep || 1), [[0, shade(col, .2)], [.3, col], [1, shade(col, -.12)]]); c.fillRect(-s * 3, L, s * 6, s * 6);
    c.globalAlpha = 1;
    if (!tilt) { const wa = widthAt(poly, L / s); if (wa) { ell(c, wa.cx * s, L, wa.hw * s * .97, Math.max(1.5, wa.hw * s * (o.ry || .15)), shade(col, .38)); shine(c, wa.cx * s - wa.hw * s * .4, L, wa.hw * s * .22, Math.max(1, wa.hw * s * .04), 0, .55); } }
    else { c.fillStyle = shade(col, .4); c.fillRect(-s * 3, L - Math.max(1, s * .008), s * 6, Math.max(2, s * .016)); }
    c.restore(); return L;
  }
  const smoothSide = (ctrl, n = 4) => { const out = []; for (let i = 0; i < ctrl.length - 1; i++) for (let k = 0; k < n; k++) { const u = k / n, e = (1 - Math.cos(u * Math.PI)) / 2; out.push([lerp(ctrl[i][0], ctrl[i + 1][0], e), lerp(ctrl[i][1], ctrl[i + 1][1], u)]); } out.push(ctrl[ctrl.length - 1]); return out; };
  // inside outlines, y up is negative, the opening at the top
  const CUP = [[-.31, -.32], [-.262, .25], [-.24, .3], [-.2, .32], [.2, .32], [.24, .3], [.262, .25], [.31, -.32]];
  const PIT = (() => { const L = []; for (let i = 0; i <= 16; i++) { const t = 1 - i / 16, y = -.035 - t * .895, hw = .24 + .095 * Math.sin(Math.PI * Math.min(1, t / .86)) + (t > .86 ? (t - .86) * .25 : 0); L.push([-hw, y]); } return [...L, [-.2, -.005], [.2, -.005], ...L.slice().reverse().map(([x, y]) => [-x, y])]; })();
  const GLS = [[-.3, -1], [-.23, -.09], [-.215, -.075], [.215, -.075], [.23, -.09], [.3, -1]];
  const JUG = (() => { const side = smoothSide([[-.13, -1], [-.115, -.9], [-.13, -.78], [-.2, -.64], [-.265, -.46], [-.27, -.3], [-.245, -.12], [-.2, -.01]]); return [...side, ...side.slice().reverse().map(([x, y]) => [-x, y])]; })();
  // a glass measuring cup with lines (like the kitchen's own), turned by tilt about its middle; o.mark: a line to glow
  function drawCup(c, x, y, s, fill, col, tilt = 0, o = {}) {
    c.save(); c.translate(x, y); if (!tilt) ell(c, s * .04, s * .34, s * .3, s * .045, 'rgba(80,40,20,.14)'); c.rotate(tilt); c.lineJoin = c.lineCap = 'round';
    c.strokeStyle = 'rgba(120,175,215,.95)'; c.lineWidth = s * .085; c.beginPath(); c.moveTo(s * .29, -s * .22); c.bezierCurveTo(s * .67, -s * .3, s * .65, s * .18, s * .25, s * .18); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = s * .022; c.beginPath(); c.moveTo(s * .33, -s * .23); c.bezierCurveTo(s * .61, -s * .27, s * .61, s * .12, s * .27, s * .13); c.stroke();
    c.fillStyle = 'rgba(222,240,252,.45)'; polyPath(c, CUP, s); c.fill();
    liquid(c, CUP, s, tilt, fill, col, { deep: .7 });
    c.fillStyle = 'rgba(235,247,255,.26)'; polyPath(c, CUP, s); c.fill();
    polyPath(c, CUP, s); c.strokeStyle = 'rgba(105,155,195,.95)'; c.lineWidth = Math.max(1.5, s * .024); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(-s * .265, -s * .26); c.lineTo(-s * .225, s * .18); c.lineTo(-s * .19, s * .18); c.lineTo(-s * .23, -s * .26); c.closePath(); c.fill();
    for (const m of [.25, .5, .75, 1]) { const ly = levelOf(CUP, 0, m) * s, wa = widthAt(CUP, ly / s), big = m === .5 || m === 1, xr = (wa ? wa.cx + wa.hw : .3) * s - s * .045; c.strokeStyle = 'rgba(60,110,160,.9)'; c.lineWidth = Math.max(1.5, s * .02); c.beginPath(); c.moveTo(xr, ly); c.lineTo(xr - s * (big ? .18 : .1), ly); c.stroke(); if (o.mark && Math.abs(o.mark - m) < .01 && !hush()) { c.save(); c.globalAlpha = .55 + .35 * Math.sin((o.t || 0) * 5); c.strokeStyle = '#ff6b9d'; c.lineWidth = Math.max(3, s * .035); c.beginPath(); c.moveTo(xr + s * .02, ly); c.lineTo(xr - s * .3, ly); c.stroke(); c.restore(); art(c).star(c, xr + s * .09, ly, s * .05, '#ffd54a', 0); } }
    c.restore();
  }
  const art = () => SPG.art;
  // a big glass pitcher (origin at the middle of its base, s = height): a handle on the left, a spout on the right.
  // o: tilt, line (a share to fill to: a dashed line with a star), sugar 0..1 (a heap at the bottom), swirl, inner(c) drawn inside, t
  function drawPitcher(c, x, y, s, fill, col, o = {}) {
    const tilt = o.tilt || 0;
    c.save(); c.translate(x, y); if (!tilt) ell(c, s * .03, 0, s * .32, s * .05, 'rgba(80,40,20,.17)'); c.rotate(tilt); c.lineJoin = c.lineCap = 'round';
    c.strokeStyle = 'rgba(165,208,236,.95)'; c.lineWidth = s * .068; c.beginPath(); c.moveTo(-s * .27, -s * .82); c.bezierCurveTo(-s * .56, -s * .8, -s * .57, -s * .36, -s * .3, -s * .3); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = s * .018; c.beginPath(); c.moveTo(-s * .3, -s * .8); c.bezierCurveTo(-s * .51, -s * .78, -s * .52, -s * .4, -s * .32, -s * .34); c.stroke();
    c.fillStyle = 'rgba(222,240,252,.4)'; polyPath(c, PIT, s); c.fill();
    liquid(c, PIT, s, tilt, fill, col, { deep: .9, alpha: .82 });
    // sugar lying at the bottom, seen through the lemonade
    if (o.sugar > .01) {
      const k = Math.sqrt(o.sugar), heap = () => { c.beginPath(); c.moveTo(-s * .2 * k - s * .04, -s * .03); c.quadraticCurveTo(0, -s * .03 - s * .17 * k, s * .2 * k + s * .04, -s * .03); c.closePath(); };
      c.save(); polyPath(c, PIT, s); c.clip(); c.fillStyle = lin(c, 0, -s * .2 * k, 0, -s * .03, [[0, '#ffffff'], [1, '#e8eef6']]); heap(); c.fill(); c.strokeStyle = 'rgba(160,180,205,.8)'; c.lineWidth = Math.max(1, s * .006); c.stroke();
      for (let i = 0; i < 30 * k; i++) { const gx = (rnd(i) - .5) * s * .38 * k, gy = -s * .035 - rnd(i + 3) * s * .07 * k * (1 - Math.abs(gx) / (s * .24 * k + 1)); circ(c, gx, gy, s * .007, i % 3 ? 'rgba(175,195,220,.9)' : '#ffffff'); }
      c.restore();
    }
    if (o.swirl) { c.save(); polyPath(c, PIT, s); c.clip(); c.strokeStyle = `rgba(255,255,255,${.5 * o.swirl.k})`; c.lineWidth = Math.max(1.5, s * .012); for (let j = 0; j < 3; j++) { c.beginPath(); for (let i = 0; i <= 20; i++) { const a = o.swirl.a + i * .3 + j * 2.1, r = s * (.04 + i * .009); c.lineTo(Math.cos(a) * r, -s * (.2 + j * .14) + Math.sin(a) * r * .25); } c.stroke(); } c.restore(); }
    if (o.inner) { c.save(); o.inner(c); c.restore(); }
    c.fillStyle = 'rgba(235,247,255,.22)'; polyPath(c, PIT, s); c.fill();
    c.fillStyle = 'rgba(200,228,246,.8)'; rr(c, -s * .225, -s * .045, s * .45, s * .045, s * .02); c.fill();
    polyPath(c, PIT, s); c.strokeStyle = 'rgba(105,155,195,.9)'; c.lineWidth = Math.max(1.5, s * .016); c.stroke();
    c.fillStyle = 'rgba(214,236,252,.9)'; c.beginPath(); c.moveTo(s * .25, -s * .87); c.quadraticCurveTo(s * .34, -s * .93, s * .42, -s * .99); c.quadraticCurveTo(s * .32, -s * .975, s * .26, -s * .935); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, -s * .93, s * .275, s * .045, 0, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = s * .028; c.beginPath(); c.moveTo(-s * .2, -s * .8); c.quadraticCurveTo(-s * .29, -s * .46, -s * .19, -s * .14); c.stroke();
    if (o.line) { const ly = levelOf(PIT, 0, o.line) * s, wa = widthAt(PIT, ly / s) || { cx: 0, hw: .3 }; c.save(); c.setLineDash([s * .035, s * .03]); c.strokeStyle = o.lineHit ? '#4fcf6a' : '#ff6b9d'; c.lineWidth = Math.max(2.5, s * .018); c.beginPath(); c.moveTo((wa.cx - wa.hw) * s + 2, ly); c.lineTo((wa.cx + wa.hw) * s - 2, ly); c.stroke(); c.restore(); art().star(c, (wa.cx + wa.hw) * s + s * .07, ly, s * .055, o.lineHit ? '#7ed957' : '#ffd54a', (o.t || 0) * .5); }
    c.restore();
  }
  // a glass water jug (origin at the middle of its base, s = height): a handle on the left, it pours from the right of its mouth
  function drawJug(c, x, y, s, fill, tilt = 0) {
    c.save(); c.translate(x, y); if (!tilt) ell(c, s * .03, 0, s * .26, s * .045, 'rgba(80,40,20,.16)'); c.rotate(tilt); c.lineJoin = c.lineCap = 'round';
    c.strokeStyle = 'rgba(165,208,236,.95)'; c.lineWidth = s * .06; c.beginPath(); c.moveTo(-s * .13, -s * .88); c.bezierCurveTo(-s * .4, -s * .86, -s * .44, -s * .5, -s * .26, -s * .42); c.stroke();
    c.fillStyle = 'rgba(222,240,252,.42)'; polyPath(c, JUG, s); c.fill();
    liquid(c, JUG, s, tilt, fill, WATER, { deep: .9, alpha: .62 });
    c.fillStyle = 'rgba(235,247,255,.22)'; polyPath(c, JUG, s); c.fill();
    polyPath(c, JUG, s); c.strokeStyle = 'rgba(105,155,195,.9)'; c.lineWidth = Math.max(1.5, s * .016); c.stroke();
    c.beginPath(); c.ellipse(0, -s, s * .13, s * .03, 0, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(214,236,252,.9)'; c.beginPath(); c.moveTo(s * .11, -s * .97); c.quadraticCurveTo(s * .17, -s * 1.0, s * .2, -s * 1.03); c.quadraticCurveTo(s * .15, -s * 1.02, s * .12, -s * 1.0); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = s * .026; c.beginPath(); c.moveTo(-s * .2, -s * .58); c.quadraticCurveTo(-s * .25, -s * .36, -s * .18, -s * .14); c.stroke();
    for (const k of [0, 1, 2]) { c.save(); c.globalAlpha = .7; spark(c, s * (.12 - k * .1), -s * (.25 + k * .13), s * .025, '#ffffff'); c.restore(); }
    c.restore();
  }
  // a tall drinking glass (origin at the middle of its base, s = height). o: level, col, ice [{ x, y, rot, k }], straw (colour), strawIn,
  // sip 0..1 (lemonade going up the straw), slice, mint, bub (bubbles), t
  const STRAW = { 'lm-straw-pink': '#ff6b9d', 'lm-straw-blue': '#4fa8f0', 'lm-straw-green': '#4fc06a' };
  const strawPts = s => [[s * .06, -s * .12], [s * .13, -s * 1.08], [s * .16, -s * 1.15], [s * .22, -s * 1.19], [s * .33, -s * 1.24]];
  function drawStrawAt(c, pts, w, col, sip = 0, scol = LEMONADE) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.quadraticCurveTo(pts[2][0], pts[2][1], pts[3][0], pts[3][1]); c.lineTo(pts[4][0], pts[4][1]); };
    c.strokeStyle = 'rgba(80,40,20,.15)'; c.lineWidth = w + 3; path(); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = w; path(); c.stroke();
    c.strokeStyle = col; c.lineWidth = w * .92; c.setLineDash([w * .9, w * .9]); path(); c.stroke(); c.setLineDash([]);
    if (sip > 0) { const L = D(pts[0][0], pts[0][1], pts[1][0], pts[1][1]), k = Math.min(1, sip * 1.25); c.globalAlpha = .9; c.strokeStyle = shade(scol, -.05); c.lineWidth = w * .5; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(lerp(pts[0][0], pts[1][0], k), lerp(pts[0][1], pts[1][1], k)); c.stroke(); c.globalAlpha = 1; void L; }
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = w * .2; c.beginPath(); c.moveTo(pts[0][0] - w * .2, pts[0][1]); c.lineTo(pts[1][0] - w * .2, pts[1][1]); c.stroke();
    c.restore();
  }
  function drawIce(c, x, y, s, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = 'rgba(226,245,255,.8)'; rr(c, -s / 2, -s / 2, s, s, s * .22); c.fill(); c.strokeStyle = 'rgba(150,200,232,.95)'; c.lineWidth = Math.max(1, s * .05); c.stroke();
    c.fillStyle = 'rgba(190,226,248,.6)'; rr(c, -s * .08, -s * .04, s * .42, s * .4, s * .12); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, -s * .36, -s * .36, s * .42, s * .14, s * .07); c.fill(); circ(c, s * .26, -s * .28, s * .05, 'rgba(255,255,255,.8)');
    c.restore();
  }
  function drawMint(c, x, y, s, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    for (const [a, k] of [[-.55, 1], [.6, .85]]) { c.save(); c.rotate(a); c.translate(0, -s * .2 * k); c.fillStyle = lin(c, -s * .16, 0, s * .16, 0, [[0, '#3f9a4e'], [.5, '#62c46e'], [1, '#3a8a46']]); c.beginPath(); c.moveTo(0, s * .22 * k); c.bezierCurveTo(-s * .22 * k, s * .05 * k, -s * .16 * k, -s * .2 * k, 0, -s * .26 * k); c.bezierCurveTo(s * .16 * k, -s * .2 * k, s * .22 * k, s * .05 * k, 0, s * .22 * k); c.fill(); c.strokeStyle = 'rgba(220,255,220,.6)'; c.lineWidth = Math.max(1, s * .02); c.beginPath(); c.moveTo(0, s * .2 * k); c.lineTo(0, -s * .2 * k); for (const t of [-.08, .04]) { c.moveTo(0, t * s); c.lineTo(-s * .09 * k, t * s - s * .06); c.moveTo(0, t * s); c.lineTo(s * .09 * k, t * s - s * .06); } c.stroke(); c.restore(); }
    c.restore();
  }
  // where each ice cube sits: stacked on the bottom, or floating at the top of the drink
  function iceTargets(Gl) { const L = Gl.level > .01 ? levelOf(GLS, 0, Gl.level) : null; return (Gl.ice || []).map((q, i) => { const k = .13 * (q.k || 1), stack = -.075 - k * .55 - Math.floor(i / 2) * k * .9, fl = L == null ? stack : L + k * (.15 + (i % 2) * .3); return { x: q.x * (.2 - k * .3), y: Math.min(stack, fl) }; }); }
  function drawGlass(c, x, y, s, Gl, t = 0) {
    c.save(); c.translate(x, y); c.lineJoin = c.lineCap = 'round';
    ell(c, s * .03, 0, s * .27, s * .045, 'rgba(80,40,20,.17)');
    c.fillStyle = 'rgba(222,240,252,.42)'; polyPath(c, GLS, s); c.fill();
    if (Gl.straw) { const k = ease(Gl.strawIn == null ? 1 : Gl.strawIn), pts = strawPts(s).map(([px, py]) => [px, py - (1 - k) * s * .7]); c.save(); c.globalAlpha = Math.min(1, k * 2); drawStrawAt(c, pts, Math.max(4, s * .055), Gl.straw, Gl.sip || 0); c.restore(); }
    const L = liquid(c, GLS, s, 0, Gl.level || 0, Gl.col || LEMONADE, { deep: 1, alpha: .82, ry: .17 });
    if (L != null) { c.save(); polyPath(c, GLS, s); c.clip(); for (let i = 0; i < 9; i++) { const u = ((rnd(i) + t * (.12 + rnd(i + 4) * .1)) % 1), by = lerp(-s * .1, L, u), bx = (rnd(i + 9) - .5) * s * .38; if (by > L + 3) circ(c, bx, by, s * (.008 + rnd(i + 2) * .008), 'rgba(255,255,255,.7)'); } c.restore(); }
    const T = iceTargets(Gl); (Gl.ice || []).forEach((q, i) => { const p = q.cy == null ? T[i] : { x: q.cx, y: q.cy }; drawIce(c, p.x * s, p.y * s, s * .13 * (q.k || 1), q.rot || 0); });
    if (Gl.mint) { const k = ease(Gl.mintIn == null ? 1 : Gl.mintIn), top = T.length ? Math.min(...T.map(p => p.y)) * s - s * .06 : -s * .12, my = L != null ? L - s * .02 : top; c.save(); c.globalAlpha = k; drawMint(c, -s * .1, my - (1 - k) * s * .4, s * .3, -.4); c.restore(); }
    c.fillStyle = 'rgba(235,247,255,.24)'; polyPath(c, GLS, s); c.fill();
    c.fillStyle = 'rgba(205,232,248,.85)'; c.beginPath(); c.moveTo(-s * .215, -s * .075); c.lineTo(s * .215, -s * .075); c.lineTo(s * .205, 0); c.lineTo(-s * .205, 0); c.closePath(); c.fill();
    polyPath(c, GLS, s); c.strokeStyle = 'rgba(105,155,195,.9)'; c.lineWidth = Math.max(1.5, s * .016); c.stroke();
    c.beginPath(); c.ellipse(0, -s, s * .3, s * .04, 0, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = s * .03; c.beginPath(); c.moveTo(-s * .22, -s * .9); c.lineTo(-s * .17, -s * .18); c.stroke();
    if (Gl.slice) { const k = ease(Gl.sliceIn == null ? 1 : Gl.sliceIn); c.save(); c.globalAlpha = Math.min(1, k * 1.5); c.translate(s * .28 + (1 - k) * s * .3, -s * .96 - (1 - k) * s * .3); c.rotate(.25); drawLemonFace(c, 0, 0, s * .3, { wheel: true, k: 1, shadow: false }); c.restore();
      // the front of the rim passes in front of the slice, so it sits on the glass
      c.save(); c.beginPath(); c.rect(s * .1, -s * 1.08, s * .4, s * .16); c.clip(); c.strokeStyle = 'rgba(205,232,248,.85)'; c.lineWidth = Math.max(2, s * .028); c.beginPath(); c.ellipse(0, -s, s * .3, s * .04, 0, .05, Math.PI * .5); c.stroke(); c.strokeStyle = 'rgba(105,155,195,.9)'; c.lineWidth = Math.max(1.5, s * .016); c.stroke(); c.restore(); }
    c.restore();
  }
  // a glass juicer (a ridged cone in a dish) whose dish rim is centred at (x, y), s = dish width. o: seeds, pool, dome { squash, twist }
  function drawJuicer(c, x, y, s, o = {}) {
    const r = s * .5; c.save(); c.translate(x, y); c.lineJoin = c.lineCap = 'round';
    const dish = () => { c.beginPath(); c.moveTo(-r, 0); c.bezierCurveTo(-r, r * .22, -r * .7, r * .34, 0, r * .34); c.bezierCurveTo(r * .7, r * .34, r, r * .22, r, 0); c.ellipse(0, 0, r, r * .26, 0, 0, Math.PI, true); c.closePath(); };
    c.fillStyle = 'rgba(205,230,248,.92)'; rr(c, -r * 1.38, -r * .07, r * .46, r * .15, r * .07); c.fill(); c.strokeStyle = 'rgba(105,155,195,.85)'; c.lineWidth = Math.max(1, r * .025); c.stroke();
    c.fillStyle = 'rgba(214,236,252,.78)'; dish(); c.fill();
    ell(c, 0, 0, r * .95, r * .24, 'rgba(198,226,246,.85)');
    if (o.pool > 0) ell(c, 0, r * .05, r * .82 * Math.sqrt(Math.min(1, o.pool)), r * .18 * Math.sqrt(Math.min(1, o.pool)), 'rgba(255,214,60,.55)');
    for (let i = 0; i < (o.seeds || 0); i++) { const a = i * 2.2 + .6, d = .48 + rnd(i) * .3; c.save(); c.translate(Math.cos(a) * r * d, Math.sin(a) * r * d * .22 + r * .02); c.rotate(a); ell(c, 0, 0, r * .05, r * .028, '#f4e8c6'); c.strokeStyle = 'rgba(180,150,80,.7)'; c.lineWidth = Math.max(.8, r * .012); c.stroke(); c.restore(); }
    const ch = r * .64, cb = r * .37;
    c.beginPath(); c.moveTo(-cb, r * .02); c.quadraticCurveTo(-cb * .45, -ch * .55, 0, -ch); c.quadraticCurveTo(cb * .45, -ch * .55, cb, r * .02); c.closePath();
    c.fillStyle = lin(c, -cb, 0, cb, 0, [[0, 'rgba(188,218,240,.95)'], [.4, 'rgba(242,250,255,.97)'], [1, 'rgba(168,204,232,.95)']]); c.fill(); c.strokeStyle = 'rgba(105,155,195,.85)'; c.lineWidth = Math.max(1, r * .022); c.stroke();
    c.strokeStyle = 'rgba(130,175,210,.7)'; for (let k = -3; k <= 3; k++) { if (!k) continue; c.beginPath(); c.moveTo(k * cb / 3.6, r * .02); c.quadraticCurveTo(k * cb / 7, -ch * .5, 0, -ch * .96); c.stroke(); }
    if (o.dome) drawLemonDome(c, 0, -ch * .3, s * .7, o.dome.squash, o.dome.twist);
    c.strokeStyle = 'rgba(120,170,210,.95)'; c.lineWidth = Math.max(1.5, r * .04); c.beginPath(); c.ellipse(0, 0, r, r * .26, 0, .1, Math.PI - .1); c.stroke(); dish(); c.lineWidth = Math.max(1, r * .025); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1.5, r * .035); c.beginPath(); c.ellipse(0, r * .02, r * .9, r * .24, 0, 2.2, 2.9); c.stroke();
    c.restore();
  }
  // a pouring stream from (x0, y0) down to (x1, y1)
  function drawStream(c, x0, y0, x1, y1, w, col, t, a = 1) {
    if (y1 <= y0 + 2 || a <= 0) return; c.save(); c.globalAlpha = a * .92; c.lineCap = 'round';
    const path = (dx) => { c.beginPath(); c.moveTo(x0 + dx, y0); c.quadraticCurveTo(x0 + (x1 - x0) * .15 + dx, y0 + (y1 - y0) * .5, x1 + dx, y1); };
    c.strokeStyle = col; c.lineWidth = w; path(0); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(1, w * .28); c.setLineDash([w * 1.4, w * 1.8]); c.lineDashOffset = -t * 160; path(-w * .18); c.stroke(); c.setLineDash([]);
    c.globalAlpha = a * .7; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, w * .2); for (let i = 0; i < 2; i++) { const k = ((t * 2.4 + i * .5) % 1); c.globalAlpha = a * .7 * (1 - k); c.beginPath(); c.ellipse(x1, y1, w * (.8 + k * 2.2), w * (.25 + k * .6), 0, 0, TAU); c.stroke(); }
    c.restore();
  }
  // a pot of honey with a wooden dipper
  function drawHoneyPot(c, s, dipper = true) {
    ell(c, s * .03, s * .44, s * .34, s * .06, 'rgba(80,40,20,.16)');
    const pot = () => { c.beginPath(); c.moveTo(-s * .24, -s * .18); c.bezierCurveTo(-s * .36, -s * .08, -s * .36, s * .38, -s * .2, s * .44); c.lineTo(s * .2, s * .44); c.bezierCurveTo(s * .36, s * .38, s * .36, -s * .08, s * .24, -s * .18); c.closePath(); };
    c.fillStyle = lin(c, -s * .3, 0, s * .3, 0, [[0, '#d9821a'], [.4, '#f7b733'], [1, '#c8701a']]); pot(); c.fill();
    c.fillStyle = 'rgba(255,240,180,.55)'; c.beginPath(); c.ellipse(-s * .14, s * .1, s * .05, s * .18, .1, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(150,80,10,.6)'; c.lineWidth = Math.max(1, s * .016); pot(); c.stroke();
    c.fillStyle = '#fff6e0'; rr(c, -s * .27, -s * .27, s * .54, s * .11, s * .05); c.fill(); c.strokeStyle = '#e0c8a0'; c.stroke();
    c.fillStyle = '#f2a81d'; c.beginPath(); c.moveTo(-s * .2, -s * .17); c.quadraticCurveTo(-s * .17, -s * .02, -s * .13, -s * .12); c.quadraticCurveTo(-s * .1, s * .02, -s * .06, -s * .16); c.closePath(); c.fill();
    if (dipper) { c.save(); c.translate(s * .06, -s * .2); c.rotate(.42); c.fillStyle = '#c98b4a'; rr(c, -s * .025, -s * .42, s * .05, s * .4, s * .025); c.fill(); for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? '#b07434' : '#d9a060'; rr(c, -s * .07, -s * .02 + i * s * .045, s * .14, s * .04, s * .02); c.fill(); } c.restore(); }
    shine(c, s * .12, -s * .02, s * .04, s * .12, .2, .4);
  }


  /* ---------------------------------------------------------------- tray pictures and names */
  ING['fs-pbanana'] = (c, s) => drawPrepBowl(c, 0, s * .04, s * .44, 'banana', 4, 0, 1.9);
  ING['fs-pberry'] = (c, s) => drawPrepBowl(c, 0, s * .04, s * .44, 'berry', 3, 0, 1.9);
  ING['fs-pgrape'] = (c, s) => drawPrepBowl(c, 0, s * .04, s * .44, 'grape', 6, 0, 2.2);
  ING['fr-honey'] = (c, s) => drawHoneyPot(c, s * .95);
  ING['fr-mint'] = (c, s) => drawMint(c, 0, s * .05, s * .9, 0);
  ING['lm-lemon'] = (c, s) => drawLemon(c, 0, 0, s * .95);
  ING['lm-half'] = (c, s) => drawLemonFace(c, 0, 0, s * .82, {});
  ING['lm-slice'] = (c, s) => drawLemonFace(c, 0, 0, s * .8, { wheel: true, k: .95 });
  ING['lm-ice'] = (c, s) => { c.save(); c.translate(0, s * .08); c.scale(.85, .85); ell(c, 0, s * .32, s * .4, s * .08, 'rgba(80,40,20,.15)'); c.beginPath(); c.moveTo(-s * .44, 0); c.bezierCurveTo(-s * .44, s * .3, -s * .22, s * .38, 0, s * .38); c.bezierCurveTo(s * .22, s * .38, s * .44, s * .3, s * .44, 0); c.closePath(); c.fillStyle = lin(c, -s * .44, 0, s * .44, 0, [[0, '#6aaee0'], [.5, '#9fd4f5'], [1, '#5a9ad0']]); c.fill(); for (const [x, y, r] of [[-.2, -.04, .3], [.16, -.06, -.4], [0, -.2, .7], [-.05, .02, -.1]]) drawIce(c, x * s, y * s, s * .24, r); c.strokeStyle = '#4a8ac0'; c.lineWidth = Math.max(1.5, s * .03); c.beginPath(); c.ellipse(0, 0, s * .44, s * .1, 0, 0, Math.PI); c.stroke(); c.restore(); };
  for (const id of Object.keys(STRAW)) ING[id] = (c, s) => { c.save(); c.translate(-s * .16, s * .4); c.rotate(.18); drawStrawAt(c, strawPts(s * .78), Math.max(3, s * .085), STRAW[id]); c.restore(); };
  ING['fs-banana'] = (c, s) => { c.save(); c.translate(0, s * .02); const ps = { left: 1, front: 1, right: 0 }; drawPeelBanana(c, s * .9, ps, 'back'); drawPeelBanana(c, s * .9, ps, 'flesh'); drawPeelBanana(c, s * .9, ps, 'front'); c.restore(); };
  Object.assign(NAME, { 'fs-pbanana': 'Banana', 'fs-pberry': 'Strawberries', 'fs-pgrape': 'Grapes', 'fr-honey': 'Honey', 'fr-mint': 'Mint', 'lm-lemon': 'A lemon', 'lm-half': 'Half a lemon', 'lm-slice': 'A lemon slice', 'lm-ice': 'Ice', 'lm-straw-pink': 'A pink straw', 'lm-straw-blue': 'A blue straw', 'lm-straw-green': 'A green straw', 'fs-banana': 'A banana' });


  /* ---------------------------------------------------------------- cutting with the kid knife (shared by the fruit and the lemons) */
  // Each cut is a dotted line. Moving the finger along it (down, up or sawing back and forth) cuts a little more; a quick slash across it
  // counts too. When enough is cut the line is done (a soft chop) and the pieces come apart.
  const KN = {
    tol(S) { return Math.max(26, S * .08) * (tier() === 1 ? 1.45 : 1); },
    need(len) { const T = tier(); return len * (T === 1 ? .55 : T === 2 ? .8 : 1.05); },
    step(L, a, b, tol) {
      const dx = L.x2 - L.x1, dy = L.y2 - L.y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const pr = p => [((p.x - L.x1) * ux + (p.y - L.y1) * uy) / len, (p.x - L.x1) * -uy + (p.y - L.y1) * ux];
      const [ta, da] = pr(a), [tb, db] = pr(b); let cut = 0;
      if (Math.abs(db) < tol && Math.abs(da) < tol * 1.6 && tb > -.25 && tb < 1.25) cut += Math.abs(clamp(tb, 0, 1) - clamp(ta, 0, 1)) * len;
      if (da * db < 0) { const k = da / (da - db), tc = ta + (tb - ta) * k; if (tc > -.05 && tc < 1.05) cut += len * .42; }
      return cut;
    },
    ang(L) { return Math.atan2(L.y1 - L.y2, L.x1 - L.x2); },   // the blade points from the near end of the line to the far end
    // the dotted line, and the cut made so far along it
    line(g, c, L, prog) {
      const len = D(L.x1, L.y1, L.x2, L.y2), w = clamp(len * .03, 3, 7);
      if (prog > .02) { const mx = (L.x1 + L.x2) / 2, my = (L.y1 + L.y2) / 2, k = Math.min(1, prog) / 2; c.save(); c.strokeStyle = 'rgba(150,60,50,.5)'; c.lineWidth = Math.max(2, w * .5); c.lineCap = 'round'; c.beginPath(); c.moveTo(lerp(mx, L.x1, k * 2), lerp(my, L.y1, k * 2)); c.lineTo(lerp(mx, L.x2, k * 2), lerp(my, L.y2, k * 2)); c.stroke(); c.restore(); }
      if (hush()) return; c.save(); c.lineCap = 'round'; c.setLineDash([w * 1.5, w * 1.9]); c.lineDashOffset = -g.t * 28;
      c.globalAlpha = .8 + .2 * Math.sin(g.t * 5); c.strokeStyle = '#ffffff'; c.lineWidth = w + 4; c.beginPath(); c.moveTo(L.x1, L.y1); c.lineTo(L.x2, L.y2); c.stroke();
      c.strokeStyle = '#ff6b9d'; c.lineWidth = w; c.stroke(); c.restore();
    },
    // the knife: in her hand along the line she is cutting, or resting on the board
    draw(c, kn, rest, S) { const kl = S * .5; if (kn && kn.on) { const dx = Math.cos(kn.ang), dy = Math.sin(kn.ang); drawKidKnife(c, kn.x - dx * kl * .3, kn.y - dy * kl * .3, kl, kn.ang); } else if (rest) drawKidKnife(c, rest.x, rest.y, kl * .8, -2.5); },
    // finger moved from a to p: cut the nearest line (lines: [{ L, o }]); returns the one it cut
    move(s, lines, a, p, S, onCut) {
      const tol = KN.tol(S); let best = null;
      for (const q of lines) { const dd = segDist(p, q.L); if (dd < tol * 2.2 && (!best || dd < best.dd)) best = { ...q, dd }; }
      if (!best) return null; s.kn.ang = angTo(s.kn.ang, KN.ang(best.L), .35);
      const cut = KN.step(best.L, a, p, tol); if (cut <= 0) return null;
      const o = best.o, len = D(best.L.x1, best.L.y1, best.L.x2, best.L.y2); o.prog += cut; s.saw = (s.saw || 0) + cut;
      if (s.saw > 16) { s.saw = 0; SND.saw(); }
      if (o.prog >= KN.need(len)) onCut(o); return o;
    }
  };


  /* ================================================================ FRUIT SALAD */

  // ---- 1. Wash the fruit: drag a strawberry or the grapes into the bowl of water and rub; the dirt comes off and floats away, then the clean
  // fruit hops onto the towel, dripping.
  const WASH = H['fs-wash'] = {
    geom(g) {
      const SH = g.SH;
      if (g.w > SH * 1.3) { const d = Math.min(g.w * .31, SH * 1.0), rB = Math.min(d * .5, SH * .42), f = Math.min(d * .19, SH * .15); return { A: { x: g.bx - d, y: g.by + SH * .1 }, B: { x: g.bx, y: g.by - SH * .04 }, C: { x: g.bx + d, y: g.by + SH * .1 }, rB, f }; }
      const d = Math.min(SH * .33, g.w * .6), rB = Math.min(d * .7, g.w * .4), f = Math.min(d * .2, g.w * .1);
      // basket, water, towel from top to bottom; the column moves up when the towel would sit under the helper's bubble
      const up = Math.max(0, g.by + d + f * 1.9 - (bubTop(g) - 6));
      return { A: { x: g.bx, y: g.by - d - up * .3 }, B: { x: g.bx, y: g.by + SH * .02 - up * .6 }, C: { x: g.bx, y: g.by + d - up }, rB, f };
    },
    enter(g, s) {
      fresh(g); const C = FS(); s.items = []; let k = 0;
      for (let i = 0; i < C.berries; i++) s.items.push({ kind: 'berry', slot: k++ });
      s.items.push({ kind: 'grapes', slot: k++ });
      for (const it of s.items) { it.state = 'home'; it.clean = 0; it.wet = 0; it.seed = Math.random() * 90; it.x = null; const n = 3 + C.T; it.specks = Array.from({ length: n }, (_, j) => { const a = rnd(it.seed + j) * TAU, d = Math.sqrt(rnd(it.seed + j + 9)); return { x: Math.cos(a) * d * .25, y: .05 + Math.sin(a) * d * .25, r: .045 + rnd(it.seed + j * 3) * .04, th: (j + .6) / n * .9, off: false, sd: it.seed + j * 11 }; }); }
      s.need = [3, 4.4, 6][C.T - 1]; s.n = s.items.length; s.cleanN = 0; s.dirt = []; s.rip = []; s.murk = 0; s.hold = null;
    },
    size: (G, it) => G.f * (it.kind === 'berry' ? 2.1 : 2.5),
    slot(G, base, i, n) { const q = n === 2 ? [[-.5, 0], [.5, 0]][i] : n === 3 ? [[-.6, -.2], [.6, -.25], [0, .38]][i] : [[-.55, -.28], [.55, -.32], [-.48, .38], [.5, .36]][i] || [0, 0]; return { x: base.x + q[0] * G.f * 2.1, y: base.y + q[1] * G.f * 1.6 }; },
    inWater(G, x, y) { const dx = (x - G.B.x) / (G.rB * .9), dy = (y - G.B.y - G.rB * .18) / (G.rB * .56); return dx * dx + dy * dy < 1; },
    target(g, s, G, it) {
      if (it.state === 'home') return WASH.slot(G, { x: G.A.x, y: G.A.y - G.f * .3 }, it.slot, s.n);
      if (it.state === 'water') return { x: G.B.x + it.ox * G.rB, y: G.B.y + it.oy * G.rB + Math.sin(g.t * 2.2 + it.seed) * G.rB * .025 };
      if (it.state === 'clean') return WASH.slot(G, { x: G.C.x, y: G.C.y - G.f * .1 }, it.cslot, s.n);
      return { x: it.x, y: it.y };
    },
    down(g, s, p) {
      const G = WASH.geom(g); let best = null;
      for (const it of s.items) { if ((it.state !== 'home' && it.state !== 'water') || it.x == null) continue; const d = D(p.x, p.y, it.x, it.y); if (d < G.f * 1.9 && (!best || d < best.d)) best = { it, d }; }
      if (!best) return; const it = best.it; it.state = 'held'; it.dx = it.x - p.x; it.dy = it.y - p.y; s.hold = it; s.last = { x: p.x, y: p.y }; sfx.tap();
    },
    move(g, s, p) {
      const it = s.hold; if (!it || it.state !== 'held') return; const G = WASH.geom(g);
      it.dx *= .85; it.dy *= .85; it.x = p.x + it.dx; it.y = p.y + it.dy;
      const inW = WASH.inWater(G, it.x, it.y), d = s.last ? D(p.x, p.y, s.last.x, s.last.y) : 0; s.last = { x: p.x, y: p.y };
      if (inW && !it.inW) { sfx.splash(); g.fx.burst(it.x, G.B.y + G.rB * .05, 12, { colors: ['#cdeeff', '#ffffff', '#9fd8f6'], speed: 220, g: 600, life: .6, size: 4, up: 160 }); s.rip.push({ x: (it.x - G.B.x) / G.rB, t: 0 }); }
      if (!inW && it.inW) it.wet = 1;
      it.inW = inW;
      if (inW && d > 0) WASH.rub(g, s, G, it, d);
    },
    rub(g, s, G, it, d) {
      const sz = WASH.size(G, it); it.clean = Math.min(1, it.clean + d / (G.rB * s.need)); it.wet = 1;
      s.rubD = (s.rubD || 0) + d; if (s.rubD > G.rB * .5) { s.rubD = 0; sfx.water(); SND.rub(); s.rip.push({ x: clamp((it.x - G.B.x) / G.rB, -.7, .7), t: 0 }); }
      if (Math.random() < .3) g.fx.burst(it.x + (Math.random() - .5) * sz * .5, it.y + sz * .15, 1, { colors: ['#ffffff', '#dff4ff'], speed: 30, g: -80, life: .7, size: 3 + Math.random() * 3 });
      for (const sp of it.specks) if (!sp.off && it.clean >= sp.th) { sp.off = true; s.dirt.push({ x: it.x - G.B.x + sp.x * sz, y: it.y - G.B.y + sp.y * sz, vx: (Math.random() - .5) * 24, vy: 8 + Math.random() * 14, r: sp.r * sz * .7, a: 1, sd: sp.sd }); s.murk = Math.min(.32, s.murk + .025); sfx.bubble(); }
      if (it.clean >= 1) WASH.done(g, s, G, it);
    },
    done(g, s, G, it) { it.state = 'fly'; it.ft = 0; it.fx = it.x; it.fy = it.y; it.cslot = s.cleanN++; if (s.hold === it) s.hold = null; sfx.plink(it.cslot + 2); g.fx.burst(it.x, it.y, 14, { colors: ['#ffffff', '#bfe6ff', '#ffe066'], speed: 180, g: 100, life: .7, size: 5, shape: 'star' }); if (!it.cslot) g.say('fs-clean', 20); },
    up(g, s) { const it = s.hold; s.hold = null; if (!it || it.state !== 'held') return; const G = WASH.geom(g); if (WASH.inWater(G, it.x, it.y)) { it.state = 'water'; it.ox = clamp((it.x - G.B.x) / G.rB, -.55, .55); it.oy = clamp((it.y - G.B.y) / G.rB, .02, .32); } else { it.state = 'home'; if (it.inW) it.wet = 1; } it.inW = false; },
    update(g, s, dt) {
      const G = WASH.geom(g);
      for (const it of s.items) {
        if (it.x == null) { const q = WASH.target(g, s, G, it); it.x = q.x; it.y = q.y; }
        if (it.state === 'fly') { it.ft = Math.min(1, it.ft + dt / .7); const q = WASH.slot(G, { x: G.C.x, y: G.C.y - G.f * .1 }, it.cslot, s.n), u = ease(it.ft); it.x = lerp(it.fx, q.x, u); it.y = lerp(it.fy, q.y, u) - Math.sin(u * Math.PI) * G.rB * .6; if (Math.random() < dt * 30) g.fx.burst(it.x, it.y + G.f * .5, 1, { colors: ['#9fd8f6', '#cdeeff'], speed: 20, g: 700, life: .5, size: 3 }); if (it.ft >= 1) { it.state = 'clean'; sfx.pat(); } }
        else if (it.state !== 'held') { const q = WASH.target(g, s, G, it), k = Math.min(1, dt * 9); it.x = lerp(it.x, q.x, k); it.y = lerp(it.y, q.y, k); }
        it.wet = Math.max(0, it.wet - dt * (it.state === 'clean' ? .45 : .2));
      }
      for (const d of s.dirt) { d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= .98; d.vy *= .985; d.a -= dt * .22; } s.dirt = s.dirt.filter(d => d.a > 0);
      for (const r of s.rip) r.t += dt; s.rip = s.rip.filter(r => r.t < 1.2);
      if (!s.fin && s.items.every(it => it.state === 'clean')) g.finish(1.1);
    },
    drawItem(g, c, G, it) {
      const sz = WASH.size(G, it); c.save(); c.translate(it.x, it.y);
      if (it.state === 'held') { if (!it.inW) ell(c, G.f * .25, sz * .62, sz * .38, sz * .09, 'rgba(80,40,20,.14)'); c.scale(1.08, 1.08); c.rotate(Math.sin(g.t * 9) * .05); }
      const shape = () => it.kind === 'berry' ? berryPath(c, sz) : grapesPath(c, sz);
      (it.kind === 'berry' ? ING.strawberry : ING.grape)(c, sz);
      const left = it.specks.filter(p => !p.off);
      if (left.length || it.clean < 1) { c.save(); shape(); c.clip(); c.fillStyle = `rgba(120,88,55,${.26 * (1 - it.clean)})`; c.fillRect(-sz, -sz, sz * 2, sz * 2); for (const p of left) speck(c, p.x * sz, p.y * sz, p.r * sz, p.sd); c.restore(); }
      if (it.wet > .02) { c.globalAlpha = Math.min(1, it.wet * 1.5); for (let j = 0; j < 5; j++) drop(c, (rnd(it.seed + j) - .5) * sz * .5, (rnd(it.seed + j + 5) - .4) * sz * .5, sz * .03); c.globalAlpha = 1; }
      if (it.state === 'clean' || it.state === 'fly') { const k = .5 + .5 * Math.sin(g.t * 3 + it.seed); spark(c, sz * .26, -sz * .2, sz * .07 * (.6 + k * .4), '#ffffff'); spark(c, -sz * .22, sz * .05, sz * .045 * (1 - k * .5), '#ffffff'); }
      c.restore();
    },
    draw(g, s, c) {
      const G = WASH.geom(g), f = G.f, K = CAT_COL[CAT] || CAT_COL[0];
      drawTowel(c, G.C.x, G.C.y + f * .45, f * 4.6, f * 2.8, K.main);
      drawBasket(c, G.A.x, G.A.y + f * .55, f * 2.3, f * .62, 'back');
      for (const it of s.items) if (it.state === 'home' && it.x != null) WASH.drawItem(g, c, G, it);
      drawBasket(c, G.A.x, G.A.y + f * .55, f * 2.3, f * .62, 'front');
      glassBowl(c, G.B.x, G.B.y, G.rB, cc => {
        cc.save(); cc.translate(-G.B.x, -G.B.y);
        for (const d of s.dirt) { cc.globalAlpha = Math.max(0, d.a) * .85; speck(cc, G.B.x + d.x, G.B.y + d.y, d.r, d.sd); } cc.globalAlpha = 1;
        for (const it of s.items) if (it.x != null && (it.state === 'water' || (it.state === 'held' && it.inW))) WASH.drawItem(g, cc, G, it);
        cc.restore();
      }, { water: { lv: G.rB * .06, murk: s.murk, rip: s.rip } });
      for (const it of s.items) if (it.state === 'clean') WASH.drawItem(g, c, G, it);
      for (const it of s.items) if (it.state === 'fly' || (it.state === 'held' && !it.inW)) WASH.drawItem(g, c, G, it);
      if (!s.hold && (!s.touched || g.idle > 4) && !s.fin) {
        const it = s.items.find(i => i.state === 'water') || s.items.find(i => i.state === 'home'); if (it && it.x != null) {
          const B = G.B, r = G.rB; ghost(g, c, it.state === 'water' ? [[it.x - r * .3, it.y], [it.x + r * .3, it.y], [it.x - r * .3, it.y + 4], [it.x + r * .3, it.y]] : [[it.x, it.y], [B.x, B.y + r * .15], [B.x - r * .35, B.y + r * .15], [B.x + r * .35, B.y + r * .1], [B.x - r * .3, B.y + r * .15]], Math.max(14, f * .55), 2.4);
        }
      }
    },
    auto(g, s) {
      const G = WASH.geom(g), it = s.items.find(i => (i.state === 'home' || i.state === 'water') && i.x != null); if (!it) return { wait: 300 };
      const B = G.B, r = G.rB, pts = [[it.x, it.y], [B.x, B.y + r * .15]]; for (let i = 0; i < 9; i++) pts.push([B.x + (i % 2 ? .42 : -.42) * r, B.y + r * (.12 + (i % 3) * .04)]);
      return { drag: pts, steps: 2, wait: 350 };
    },
    hint: () => 'fs-wash',
    tip(g, s) { const it = s.items.find(i => i.clean < 1); return it ? (it.kind === 'berry' ? 'strawberry' : 'grape') : 'HAPPY'; }
  };
  function speck(c, x, y, r, sd) { c.fillStyle = '#76502f'; c.beginPath(); for (let i = 0; i <= 9; i++) { const a = i / 9 * TAU, k = r * (.7 + rnd(sd + i) * .55); i ? c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k * .85) : c.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k * .85); } c.closePath(); c.fill(); circ(c, x - r * .3, y - r * .25, r * .28, 'rgba(170,125,85,.7)'); circ(c, x + r * .95, y + r * .5, r * .22, '#76502f'); }

  // ---- 2. Peel the banana: pull each of the three strips of peel down (the stem cracks open on the first pull); the banana pops out and
  // the peel goes in the compost bowl.
  const PEELH = H['fs-peel'] = {
    geom(g) {
      const L = Math.min(g.SH * .74, g.w * .95, g.U * .85), w = g.w > g.SH * 1.25, X = g.bx - (w ? L * .3 : 0), Y = g.by - L * .04, cr = clamp(L * .2, 40, g.w * .16);
      return { L, X, Y, comp: w ? { x: Math.min(X + L * .95, g.w - cr * 1.15 - 10), y: Y + L * .3, r: cr } : { x: g.w - cr * 1.15 - 10, y: g.y1 - cr * .75, r: cr } };
    },
    enter(g, s) { FR(g); s.ps = { left: 0, front: 0, right: 0 }; s.anim = {}; s.order = ['front', 'left', 'right']; s.phase = 'peel'; s.pt = 0; s.cracked = tier() === 1; s.drag = null; },
    pick(s, rel) { const ok = id => s.ps[id] < 1 && s.anim[id] !== 'open', pref = rel < -.33 ? 'left' : rel > .33 ? 'right' : 'front'; return ok(pref) ? pref : s.order.find(ok) || null; },
    down(g, s, p) {
      if (s.phase !== 'peel') return; const G = PEELH.geom(g), L = G.L;
      if (Math.abs(p.x - G.X) > L * .6 || p.y < G.Y - L * .72 || p.y > G.Y + L * .62) return;
      const id = PEELH.pick(s, (p.x - G.X) / (L * .2)); if (!id) return; s.drag = { id, x0: p.x, y0: p.y, p0: s.ps[id] }; s.anim[id] = null;
    },
    move(g, s, p) {
      const d = s.drag; if (!d || s.phase !== 'peel') return; const G = PEELH.geom(g), L = G.L, span = L * (tier() === 1 ? .26 : .38);
      const out = d.id === 'left' ? d.x0 - p.x : d.id === 'right' ? p.x - d.x0 : 0, pull = Math.max(p.y - d.y0, out * .9, 0), was = s.ps[d.id];
      s.ps[d.id] = Math.max(was, clamp(d.p0 + pull / span, 0, 1));
      if (!s.cracked && s.ps[d.id] > .06) { s.cracked = true; sfx.crack(); g.fx.burst(G.X, G.Y - L * .5, 6, { colors: ['#8a6a2a', '#ffd84a'], speed: 90, g: 400, life: .4, size: 3 }); }
      if (was < .2 && s.ps[d.id] >= .2) SND.zip();
      if (s.ps[d.id] >= 1) { PEELH.off(g, s, d.id); s.drag = null; }
    },
    up(g, s) { const d = s.drag; s.drag = null; if (!d) return; if (s.ps[d.id] >= .28) s.anim[d.id] = 'open'; else if (s.ps[d.id] > 0) s.anim[d.id] = 'back'; },
    off(g, s, id) {
      if (s.ps[id] >= 1 && s.anim[id] === 'done') return; s.ps[id] = 1; s.anim[id] = 'done'; sfx.rustle(); const G = PEELH.geom(g);
      g.fx.burst(G.X + ({ left: -1, front: 0, right: 1 })[id] * G.L * .2, G.Y + G.L * .2, 8, { colors: ['#ffd84a', '#fff6cf'], speed: 120, g: 300, life: .5, size: 4 });
      if (s.order.every(k => s.ps[k] >= 1) && s.phase === 'peel') { s.phase = 'out'; s.pt = 0; sfx.pop(); g.fx.burst(G.X, G.Y - G.L * .3, 16, { colors: ['#fff6cf', '#ffe066', '#ffffff'], speed: 220, g: 200, life: .8, size: 6, shape: 'star' }); }
    },
    update(g, s, dt) {
      for (const id of s.order) { const a = s.anim[id]; if (a === 'open') { s.ps[id] = Math.min(1, s.ps[id] + dt * 3.2); if (s.ps[id] >= 1) PEELH.off(g, s, id); } else if (a === 'back') { s.ps[id] = Math.max(0, s.ps[id] - dt * 2.5); if (!s.ps[id]) s.anim[id] = null; } }
      if (s.phase === 'out') { s.pt += dt; if (s.pt > .55 && !s.thrown) { s.thrown = true; sfx.whoosh(); } if (s.pt > 1.5 && !s.landed) { s.landed = true; sfx.pat(); const G = PEELH.geom(g); g.fx.burst(G.comp.x, G.comp.y - G.comp.r * .2, 10, { colors: ['#8fd47a', '#ffd84a'], speed: 140, g: 400, life: .5, size: 4 }); } if (s.pt > 1.6) g.finish(.7); }
    },
    draw(g, s, c) {
      const G = PEELH.geom(g), L = G.L, out = s.phase === 'out' ? s.pt : 0;
      drawCompost(c, G.comp.x, G.comp.y, G.comp.r, 'banana', s.landed ? 3 : 0);
      const rise = out ? ease(clamp(out / .5, 0, 1)) * (1 - ease(clamp((out - 1) / .6, 0, 1))) : 0, fly = ease(clamp((out - .5) / 1, 0, 1));
      const peelAt = () => { c.save(); c.translate(lerp(G.X, G.comp.x, fly), lerp(G.Y, G.comp.y - G.comp.r * .3, fly) - Math.sin(fly * Math.PI) * L * .3); const k = lerp(1, .3, fly); c.scale(k, k); c.rotate(fly * .7); };
      if (!s.landed) { peelAt(); drawPeelBanana(c, L, s.ps, 'back'); c.restore(); }
      c.save(); c.translate(G.X, G.Y - rise * L * .32); drawPeelBanana(c, L, s.ps, 'flesh'); c.restore();
      if (!s.landed) { peelAt(); drawPeelBanana(c, L, s.ps, 'front'); c.restore(); }
      if (s.phase === 'peel' && !s.drag && (!s.touched || g.idle > 4)) { const id = PEELH.pick(s, 0); if (id) { const sx = { left: -.08, front: 0, right: .08 }[id] * L, ex = { left: -.3, front: 0, right: .3 }[id] * L; ghost(g, c, [[G.X + sx, G.Y - L * .36], [G.X + sx + ex * .4, G.Y - L * .05], [G.X + sx + ex, G.Y + L * .3]], Math.max(14, L * .05), 1.6); } }
    },
    auto(g, s) { if (s.phase !== 'peel') return { wait: 300 }; const id = PEELH.pick(s, 0); if (!id) return { wait: 300 }; const G = PEELH.geom(g), L = G.L, sx = { left: -.08, front: 0, right: .08 }[id] * L, ex = { left: -.3, front: 0, right: .3 }[id] * L; return { drag: [[G.X + sx, G.Y - L * .36], [G.X + sx + ex * .4, G.Y], [G.X + sx + ex, G.Y + L * .32]], steps: 3, wait: 500 }; },
    hint: () => 'fs-peel',
    tip: (g, s) => s.phase === 'peel' ? 'fs-banana' : 'HAPPY'
  };

  // ---- 3. Cut with the kid knife: the banana into coins, each strawberry in half, each grape in quarters (two cuts). The pieces go into
  // three little bowls; the next fruit slides onto the board.
  const CUTH = H['fs-cut'] = {
    lay(g) {
      const SH = g.SH;
      if (wide(g)) { const W = Math.min(g.w - 40, SH * 2.05), BW = W * .72, br = Math.min(W * .085, SH * .13), bh = SH * .94, cx = g.bx + W / 2 - W * .12; return { bx: g.bx - W / 2 + BW / 2, by: g.by, bw: BW, bh, S: Math.min(BW * .95, bh * 1.25), bowls: [-1, 0, 1].map(k => ({ x: cx, y: g.by + k * SH * .31, r: br })) }; }
      const br = Math.min(g.w * .1, SH * .085), top = g.y0 + br * 2 + 16, bh = g.y1 - top - 4, bw = Math.min(g.w * .94, bh * 1.4);
      return { bx: g.bx, by: top + bh / 2, bw, bh, S: Math.min(bw * .95, bh * 1.2), bowls: [-1, 0, 1].map(k => ({ x: g.bx + k * g.w * .29, y: g.y0 + br + 6, r: br })) };
    },
    enter(g, s) { const Fr = FR(g); Fr.prep = { banana: 0, berry: 0, grape: 0 }; s.gi = 0; s.fl = []; s.kn = null; CUTH.load(g, s, false); },
    load(g, s, say) {
      const C = FS(), kind = ['banana', 'berry', 'grape'][s.gi], n = kind === 'banana' ? 1 : kind === 'berry' ? C.berries : C.grapes;
      s.kind = kind; s.objs = Array.from({ length: n }, (_, i) => ({ kind, i, n, done: 0, prog: 0, sep: [], want: kind === 'banana' ? C.cuts : kind === 'berry' ? 1 : 2 }));
      s.phase = 'in'; s.pt = 0; if (say) voice.say(kind === 'berry' ? 'fs-berry' : 'fs-grape');
    },
    pos(L, o) {
      const S = L.S, n = o.n;
      if (o.kind === 'banana') { const len = Math.min(S * .78, L.bw * .64); return { x: L.bx, y: L.by, len, th: Math.min(S * .15, len * .19) }; }
      if (o.kind === 'berry') { const sp = Math.min(S * .36, L.bw * .88 / n), sb = Math.min(S * .42, sp * (n > 1 ? .82 : 1)); return { x: L.bx + (o.i - (n - 1) / 2) * sp, y: L.by, sb }; }
      const grid = n === 4 && L.bw < L.bh * 1.1, sp = grid ? Math.min(S * .36, L.bw * .42) : Math.min(S * .28, L.bw * .88 / n), rx = Math.min(S * .085, sp * .3), ry = rx * 1.18, gap = rx * .3;
      return grid ? { x: L.bx + ((o.i % 2) - .5) * sp, y: L.by + (Math.floor(o.i / 2) - .5) * sp, rx, ry, gap } : { x: L.bx + (o.i - (n - 1) / 2) * sp, y: L.by, rx, ry, gap };
    },
    bOff(o, u, len) { let off = 0; for (let k = 0; k < o.done; k++) { const uk = 1 - (k + 1) / (o.want + 1); off += (u > uk ? .5 : -.5) * ease(o.sep[k] || 0) * len * .055; } return off; },
    line(L, o) {
      if (o.done >= o.want) return null; const q = CUTH.pos(L, o);
      if (o.kind === 'banana') { const u = 1 - (o.done + 1) / (o.want + 1), x = q.x - q.len / 2 + u * q.len + CUTH.bOff(o, u, q.len), yc = q.y - q.th * .35 * (1 - (2 * u - 1) ** 2); return { x1: x, y1: yc - q.th * 1.3, x2: x, y2: yc + q.th * 1.3 }; }
      if (o.kind === 'berry') return { x1: q.x, y1: q.y - q.sb * .56, x2: q.x, y2: q.y + q.sb * .55 };
      if (!o.done) return { x1: q.x, y1: q.y - q.ry * 1.45, x2: q.x, y2: q.y + q.ry * 1.45 };
      const w = (q.rx + q.gap) * 1.45; return { x1: q.x - w, y1: q.y, x2: q.x + w, y2: q.y };
    },
    lines(g, s) { if (s.phase !== 'cut') return []; const L = CUTH.lay(g), out = []; for (const o of s.objs) { const ln = CUTH.line(L, o); if (ln) out.push({ L: ln, o }); } return out; },
    down(g, s, p) { s.kn = { x: p.x, y: p.y, on: true, ang: s.kn ? s.kn.ang : -Math.PI / 2 }; s.lp = { x: p.x, y: p.y }; },
    move(g, s, p) { if (!s.kn || !s.kn.on) return; const a = s.lp || p; s.lp = { x: p.x, y: p.y }; s.kn.x = p.x; s.kn.y = p.y; KN.move(s, CUTH.lines(g, s), a, p, CUTH.lay(g).S, o => CUTH.cut(g, s, o)); },
    up(g, s) { if (s.kn) s.kn.on = false; },
    cut(g, s, o) {
      o.done++; o.prog = 0; o.sep.push(0); SND.chop(); sfx.pop();
      const L = CUTH.lay(g), q = CUTH.pos(L, o), col = { banana: ['#fff6cf', '#f2dc96', '#ffffff'], berry: ['#ff5a6a', '#ffd0d6', '#ffffff'], grape: ['#e4f3c0', '#a27ad8', '#ffffff'] }[o.kind];
      g.fx.burst(s.kn ? s.kn.x : q.x, s.kn ? s.kn.y : q.y, 10, { colors: col, speed: 160, g: 500, life: .5, size: 4 });
      voice.say('num/' + (o.kind === 'banana' ? o.done + 1 : o.kind === 'berry' ? 2 : o.done * 2));
      if (s.objs.every(x => x.done >= x.want)) { s.phase = 'rest'; s.pt = 0; }
    },
    // where the pieces of a cut fruit are (in units of the board, so a turned screen keeps them right): { fx, fy, sz, rot }
    pieces(L, o) {
      const q = CUTH.pos(L, o), out = [], at = (x, y, sz, rot = 0) => out.push({ fx: (x - L.bx) / L.S, fy: (y - L.by) / L.S, sz: sz / L.S, rot });
      if (o.kind === 'banana') { const us = [0]; for (let k = 0; k < o.done; k++) us.push(1 - (k + 1) / (o.want + 1)); us.push(1); us.sort((a, b) => a - b); for (let i = 0; i < us.length - 1; i++) { const um = (us[i] + us[i + 1]) / 2; at(q.x - q.len / 2 + um * q.len + CUTH.bOff(o, um, q.len), q.y - q.th * .35 * (1 - (2 * um - 1) ** 2), q.th * 1.05); } }
      else if (o.kind === 'berry') for (const sg of [-1, 1]) at(q.x + sg * q.sb * .33, q.y, q.sb * .62, sg * .15);
      else for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) at(q.x + sx * (q.rx * .45 + q.gap), q.y + sy * (q.ry * .45 + q.gap), q.rx * 2);
      return out;
    },
    out(g, s) { const L = CUTH.lay(g), list = []; for (const o of s.objs) list.push(...CUTH.pieces(L, o)); s.fl = list.map((pc, i) => ({ ...pc, i, t: 0, d: i * (list.length > 10 ? .045 : .08), dur: .55 })); s.phase = 'out'; s.pt = 0; sfx.whoosh(); },
    update(g, s, dt) {
      for (const o of s.objs) for (let k = 0; k < o.sep.length; k++) o.sep[k] = Math.min(1, o.sep[k] + dt * 3.2);
      if (s.phase === 'in') { s.pt += dt / .6; if (s.pt >= 1) { s.phase = 'cut'; s.pt = 0; } }
      else if (s.phase === 'rest') { s.pt += dt; if (s.pt > .8) CUTH.out(g, s); }
      else if (s.phase === 'out') { let all = true; for (const f of s.fl) { f.t += dt; if (f.t < f.d + f.dur) all = false; else if (!f.in) { f.in = true; FR(g).prep[s.kind]++; SND.plop(f.i); } } if (all) { s.fl = []; s.gi++; if (s.gi < 3) { s.phase = 'gap'; s.pt = 0; } else { s.phase = 'end'; g.finish(.7); } } }
      else if (s.phase === 'gap') { s.pt += dt; if (s.pt > .3) CUTH.load(g, s, true); }
    },
    drawObj(g, s, c, L, o) {
      const q = CUTH.pos(L, o);
      if (o.kind === 'banana') { drawBananaLog(c, q.x, q.y, q.len, q.th, o.want, o.done, o.sep, s.phase === 'rest' ? ease(clamp(s.pt / .5, 0, 1)) : 0); return; }
      if (o.kind === 'berry') {
        if (!o.done) { c.save(); c.translate(q.x, q.y); ING.strawberry(c, q.sb); c.restore(); return; }
        const e = ease(o.sep[0] || 0);
        for (const sg of [-1, 1]) {
          c.save();
          if (e < .5) { const k = e / .5; c.translate(q.x + sg * q.sb * .1 * k, q.y); c.scale(1 - k * .85, 1); c.beginPath(); c.rect(sg < 0 ? -q.sb : 0, -q.sb, q.sb, q.sb * 2); c.clip(); ING.strawberry(c, q.sb); }
          else { const k = (e - .5) / .5; c.translate(q.x + sg * q.sb * .33, q.y); c.rotate(sg * .15 * k); c.scale(Math.max(.1, k), 1); drawBerryHalf(c, q.sb * .62); }
          c.restore();
        }
        return;
      }
      c.save(); c.translate(q.x, q.y);
      if (!o.done) drawGrape(c, q.rx, q.ry); else if (o.done === 1) drawGrapeParts(c, q.rx, q.ry, 2, q.gap * ease(o.sep[0] || 0), 0); else drawGrapeParts(c, q.rx, q.ry, 4, q.gap, q.gap * ease(o.sep[1] || 0));
      c.restore();
    },
    draw(g, s, c) {
      const L = CUTH.lay(g), Fr = FR(g), kinds = ['banana', 'berry', 'grape'];
      drawBoard(c, L.bx, L.by, L.bw, L.bh);
      L.bowls.forEach((b, i) => { if (kinds[i] === s.kind && (s.phase === 'out' || s.phase === 'rest')) glowRing(g, c, b.x, b.y + b.r * .15, b.r * 1.25); drawPrepBowl(c, b.x, b.y, b.r, kinds[i], (Fr.prep || {})[kinds[i]] || 0); });
      if (s.phase === 'in' || s.phase === 'cut' || s.phase === 'rest') { c.save(); if (s.phase === 'in') { c.translate((1 - ease(s.pt)) * L.bw * .8, 0); c.globalAlpha = Math.min(1, s.pt * 2); } for (const o of s.objs) CUTH.drawObj(g, s, c, L, o); c.restore(); }
      for (const { L: ln, o } of CUTH.lines(g, s)) KN.line(g, c, ln, o.prog / KN.need(D(ln.x1, ln.y1, ln.x2, ln.y2)));
      for (const f of s.fl) {
        if (f.in) continue; const u = ease(clamp((f.t - f.d) / f.dur, 0, 1)), b = L.bowls[kinds.indexOf(s.kind)], x0 = L.bx + f.fx * L.S, y0 = L.by + f.fy * L.S;
        const x = lerp(x0, b.x, u), y = lerp(y0, b.y - b.r * .15, u) - Math.sin(u * Math.PI) * L.S * .22, sz = lerp(f.sz * L.S, b.r * .55, u);
        c.save(); c.translate(x, y); c.rotate(f.rot + u * 2); if (s.kind === 'banana') ING.banana(c, sz); else if (s.kind === 'berry') drawBerryHalf(c, sz); else drawGrapeQuarter(c, sz * .5); c.restore();
      }
      if (s.phase === 'cut' || (s.kn && s.kn.on)) KN.draw(c, s.kn, s.phase === 'cut' ? { x: L.bx + L.bw * .4, y: L.by + L.bh * .36 } : null, L.S);
      if (s.phase === 'cut' && !(s.kn && s.kn.on) && (!s.touched || g.idle > 3.5)) { const ln = CUTH.lines(g, s)[0]; if (ln) ghost(g, c, [[ln.L.x1, ln.L.y1], [ln.L.x2, ln.L.y2]], Math.max(14, L.S * .045), 1.4); }
    },
    auto(g, s) { const ln = CUTH.lines(g, s)[0]; if (!ln) return { wait: 250 }; const a = [ln.L.x1, ln.L.y1], b = [ln.L.x2, ln.L.y2]; return { drag: [a, b, a], steps: 3, wait: 300 }; },
    hint: (g, s) => ({ banana: 'fs-cut', berry: 'fs-berry', grape: 'fs-grape' })[s.kind] || 'fs-cut',
    tip: (g, s) => s.phase === 'end' ? 'HAPPY' : ({ banana: 'fs-pbanana', berry: 'strawberry', grape: 'grape' })[s.kind]
  };

  // ---- 4. Into the big bowl: drag (or touch) each little bowl of fruit and it tips in, piece by piece; honey drizzles from its dipper and
  // the orange is squeezed over the top if she wants them.
  const FRUIT_OF = { 'fs-pbanana': 'banana', 'fs-pberry': 'berry', 'fs-pgrape': 'grape' };
  const BOWLH = H['fs-bowl'] = {
    enter(g, s) {
      const Fr = FR(g); if (!Fr.prep || !(Fr.prep.banana + Fr.prep.berry + Fr.prep.grape)) { const C = FS(); Fr.prep = { banana: C.cuts + 1, berry: C.berries * 2, grape: C.grapes * 4 }; }
      Fr.salad = { pieces: [], honey: [], orange: 0, glaze: 0 }; s.total = Fr.prep.banana + Fr.prep.berry + Fr.prep.grape; s.added = 0; s.pour = null; s.fruit = 0; s.extra = 0;
      g.setTray(['fs-pbanana', 'fs-pberry', 'fs-pgrape', 'fr-honey', 'orange'].map(id => ({ id, once: true })));
    },
    drop(g, s, it, x, y, tap) {
      if (s.pour || s.fin) return false; const B = SAL(g); if (!tap && D(x, y, B.x, B.y) > B.R * 1.5) return false;
      s.pour = { id: it.id, t: 0, x0: it.x, y0: it.y, n: 0, lip: { x: .3, y: -.6 } }; if (FRUIT_OF[it.id]) s.fruit++; else s.extra++; sfx.whoosh(); return true;
    },
    addPiece(g, s, kind, P) { const Fr = FR(g), frac = (s.added++ + .5) / Math.max(1, s.total), d = Math.sqrt(Math.random()) * .9; Fr.salad.pieces.push({ k: kind, a: Math.random() * TAU, d, h: clamp(.06 + frac * .98 + (Math.random() - .5) * .1, 0, 1.06) * (1 - .22 * d * d), rot: Math.random() * TAU, sd: Math.random() * 100, drop: 1, fx: P.lip.x, fy: P.lip.y }); },
    endPour(g, s) {
      s.pour = null; if (s.fruit === 3 && !s.canDone) { s.canDone = true; voice.say('fs-extra'); sfx.plink(4); }
      if (s.fruit === 3 && s.extra === 2) g.finish(1); else if (s.finAfter && s.canDone) g.finish(.3);
    },
    check(g, s) { if (s.pour) s.finAfter = true; else g.finish(.3); },
    update(g, s, dt) {
      const P = s.pour, Fr = FR(g);
      for (const pc of Fr.salad.pieces) if (pc.drop > 0) { pc.drop = Math.max(0, pc.drop - dt * 2.4); if (!pc.drop) SND.plop(pc.sd * 7 | 0); }
      if (!P) return; P.t += dt; const kind = FRUIT_OF[P.id];
      if (kind) { const n = Fr.prep[kind] || 0, t0 = .62, span = Math.min(1.1, .09 * n + .3); while (P.n < n && P.t > t0 + span * (P.n / Math.max(1, n))) { BOWLH.addPiece(g, s, kind, P); P.n++; } if (P.t > t0 + span + .5) BOWLH.endPour(g, s); }
      else if (P.id === 'fr-honey') {
        if (P.t > .5 && P.t < 2.0) { const u = (P.t - .5) / 1.5, x = Math.sin(u * 11) * .45 * (1 - u * .3), y = -.05 - .08 * Math.cos(u * 7) + u * .05; if (!P.rb) { P.rb = []; Fr.salad.honey.push(P.rb); } P.rb.push([x, y]); P.tip = { x, y: y - .5 }; if (Math.random() < dt * 6) SND.drip(Math.random() * 4 | 0); }
        if (P.t > 2.4) BOWLH.endPour(g, s);
      } else {
        const B = SAL(g); if (P.t > .5 && P.t < 1.45) { Fr.salad.orange = clamp((P.t - .5) / .95, 0, 1); if (Math.random() < dt * 22) g.fx.burst(B.x + (Math.random() - .5) * B.R * .3, B.y - B.R * .55, 1, { colors: ['#ffb02e', '#ffd36a'], speed: 30, g: 900, life: .4, size: 4 }); if (!P.sq) { P.sq = true; sfx.squish(); } }
        if (P.t > 1.8) BOWLH.endPour(g, s);
      }
    },
    draw(g, s, c) {
      const B = SAL(g), Fr = FR(g), P = s.pour;
      glassBowl(c, B.x, B.y, B.R, cc => drawSalad(cc, Fr.salad, B.R, g.t));
      if (P) {
        const fly = ease(clamp(P.t / .42, 0, 1)), kind = FRUIT_OF[P.id], end = kind ? .62 + Math.min(1.1, .09 * (Fr.prep[kind] || 0) + .3) + .5 : P.id === 'fr-honey' ? 2.4 : 1.8, fade = clamp((end - P.t) / .35, 0, 1);
        const tx = B.x + B.R * (kind ? .45 : P.id === 'fr-honey' ? .7 : 0), ty = B.y - B.R * (kind ? .85 : P.id === 'fr-honey' ? .55 : .75), x = lerp(P.x0, tx, fly), y = lerp(P.y0, ty, fly) - Math.sin(fly * Math.PI) * B.R * .3;
        c.save(); c.globalAlpha = fade;
        if (kind) { const r = lerp(B.R * .22, B.R * .42, fly), tilt = -ease(clamp((P.t - .4) / .25, 0, 1)) * 2.0, left = Math.max(0, (Fr.prep[kind] || 0) - P.n); drawPrepBowl(c, x, y, r, kind, left, tilt); const lp = rotP(-r * .95, 0, tilt); P.lip = { x: (x + lp[0] - B.x) / B.R, y: (y + lp[1] - B.y) / B.R }; }
        else if (P.id === 'fr-honey') { const sz = lerp(B.R * .5, B.R * .6, fly); c.save(); c.translate(x, y); drawHoneyPot(c, sz, P.t < .5); c.restore(); if (P.t >= .5 && P.tip) { const dx = B.x + P.tip.x * B.R, dy = B.y + P.tip.y * B.R - B.R * .1; c.strokeStyle = 'rgba(235,155,25,.85)'; c.lineWidth = Math.max(2, B.R * .02); c.beginPath(); c.moveTo(dx, dy); const last = P.rb[P.rb.length - 1]; c.lineTo(B.x + last[0] * B.R, B.y + last[1] * B.R); c.stroke(); c.save(); c.translate(dx, dy); c.rotate(.3 + Math.sin(g.t * 9) * .1); c.fillStyle = '#c98b4a'; rr(c, -B.R * .02, -B.R * .4, B.R * .04, B.R * .4, B.R * .02); c.fill(); for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? '#b07434' : '#d9a060'; rr(c, -B.R * .05, -B.R * .02 + i * B.R * .035, B.R * .1, B.R * .03, B.R * .015); c.fill(); } c.restore(); } }
        else { const sq = P.t > .5 ? Math.sin(clamp((P.t - .5) / .95, 0, 1) * Math.PI * 3) * .12 + .12 : 0; c.save(); c.translate(x, y); c.rotate(Math.PI * ease(clamp((P.t - .3) / .25, 0, 1))); c.scale(1 + sq * .6, 1 - sq); ING.orange(c, lerp(B.R * .5, B.R * .55, fly)); c.restore(); }
        c.restore();
      }
      if (!P && !s.fin && (!s.touched || g.idle > 4)) { const want = BOWLH.want(g, s), it = g.tray.find(i => !i.used && want.includes(i.id)); if (it) ghost(g, c, [[it.hx, it.hy], [B.x, B.y - B.R * .1]], Math.max(14, B.R * .1), 1.6); }
    },
    want(g, s) { const left = g.tray.filter(i => !i.used).map(i => i.id), fruit = left.filter(id => FRUIT_OF[id]); return fruit.length ? fruit : left; },
    auto(g, s) { if (s.pour) return { wait: 250 }; const it = g.tray.find(i => !i.used); if (it) return { tap: [it.x, it.y], wait: 600 }; const cb = g.checkBtn(); return cb ? { tap: [cb.x, cb.y] } : { wait: 300 }; },
    hint: (g, s) => s.canDone ? 'fs-extra' : 'fs-bowl',
    tip: (g, s) => { const w = BOWLH.want(g, s); return w[0] || 'HAPPY'; }
  };

  // ---- 5. Mix it gently: stir round and round with the big spoon; stirring too fast makes the fruit jump (and the helper says gently).
  const MIXH = H['fs-mix'] = {
    enter(g, s) { const Fr = FR(g); if (!Fr.salad || !Fr.salad.pieces.length) Fr.salad = copySalad(SAMPLE_SALAD); Fr.salad.glaze = 0; s.turn = 0; s.need = [1.4, 2, 2.6][tier() - 1]; s.ang = null; s.fast = 0; s.said = false; s.on = false; },
    cen(g) { const B = SAL(g); return { x: B.x, y: B.y + B.R * .05, B }; },
    down(g, s, p) { s.on = true; s.ang = null; s.sp = { x: p.x, y: p.y }; MIXH.move(g, s, p); },
    move(g, s, p) {
      if (!s.on || s.fin) return; const C = MIXH.cen(g), a = Math.atan2((p.y - C.y) / .45, p.x - C.x); s.sp = { x: p.x, y: p.y };
      if (D(p.x, p.y, C.x, C.y) > C.B.R * 1.7) { s.ang = null; return; }
      if (s.ang == null) { s.ang = a; s.lt = g.t; return; }
      const da = wrap(a - s.ang), dt = Math.max(1 / 120, g.t - s.lt); s.ang = a; s.lt = g.t;
      const fast = Math.abs(da) / dt > 11; MIXH.add(g, s, da * (fast ? .6 : 1), fast, p);
    },
    add(g, s, da, fast, p) {
      const Fr = FR(g); s.turn += Math.abs(da) / TAU;
      for (const pc of Fr.salad.pieces) { pc.a += da * (1.05 - pc.d * .35); pc.rot += da * .5; if (fast) pc.h = clamp(pc.h + (Math.random() - .45) * .12 * Math.abs(da), 0, 1.06); }
      Fr.salad.glaze = clamp(s.turn / s.need, 0, 1);
      const q = Math.floor(s.turn * 4); if (q !== s.q) { s.q = q; sfx.squish(); }
      if (fast) { s.fast++; s.jump = 1; if (s.fast > 6 && !s.said) { s.said = true; voice.say('fs-gently'); } if (Math.random() < .25 && p) g.fx.burst(p.x, p.y, 3, { colors: ['#ff9aa6', '#fff1a0', '#e6f4c4'], speed: 200, g: 700, life: .5, size: 4, up: 150 }); }
      if (s.turn >= s.need && !s.fin) { const B = SAL(g); g.fx.burst(B.x, B.y - B.R * .1, 22, { colors: ['#ffffff', '#ffe066', '#ff9ec8'], speed: 260, g: 150, life: .9, size: 6, shape: 'star' }); sfx.plink(5); g.finish(.9); }
    },
    up(g, s) { s.on = false; s.ang = null; },
    update(g, s, dt) { s.jump = Math.max(0, (s.jump || 0) - dt * 3); },
    draw(g, s, c) {
      const C = MIXH.cen(g), B = C.B, Fr = FR(g), j = (s.jump || 0) * B.R * .03 * Math.sin(g.t * 40);
      glassBowl(c, B.x, B.y + j, B.R, cc => drawSalad(cc, Fr.salad, B.R, g.t));
      const sp = s.on && s.sp ? { x: clamp(s.sp.x, B.x - B.R * .7, B.x + B.R * .7), y: clamp(s.sp.y, B.y - B.R * .35, B.y + B.R * .25) } : { x: B.x + Math.cos(g.t * .8) * B.R * .3, y: B.y - B.R * .05 };
      drawSpoon(c, sp.x, sp.y, B.R * 1.05, 3.6 + Math.sin(g.t * 2) * .05);
      if (!s.on && !s.fin && (!s.touched || g.idle > 4)) { const pts = []; for (let a = 0; a <= TAU * 1.05; a += .3) pts.push([C.x + Math.cos(a) * B.R * .45, C.y + Math.sin(a) * B.R * .2]); ghost(g, c, pts, Math.max(14, B.R * .1), 2.2); }
    },
    auto(g, s) { const C = MIXH.cen(g), B = C.B, pts = []; for (let a = 0; a <= TAU * 4.2; a += .6) pts.push([C.x + Math.cos(a) * B.R * .45, C.y + Math.sin(a) * B.R * .2]); return { drag: pts, steps: 1, wait: 300 }; },
    hint: () => 'fs-mix',
    tip: () => null
  };

  // ---- 6. Eat it with a fork: each touch spears a piece (a little grape piece or two with it) and lifts it away to eat.
  const EATH = H['fs-eat'] = {
    camera: true,
    geo(g) { const R = Math.min(g.w * .4, g.SH * .52, g.U * .46); return { x: g.bx, y: g.by - R * .02, R }; },
    enter(g, s) { const Fr = FR(g); if (!Fr.salad || !Fr.salad.pieces.length) Fr.salad = copySalad(SAMPLE_SALAD); for (const p of Fr.salad.pieces) { p.drop = 0; p.wait = 0; p.taken = p.gone = false; } s.fork = null; s.n = 0; s.empty = false; s.moreT = null; g.fx.burst(g.bx, g.by, 24, { colors: ['#ffd54a', '#ffffff', '#ff9ec8'], speed: 280, g: 200, life: 1, size: 7, shape: 'star' }); },
    rest(B) { return { x: B.x + B.R * 1.08, y: B.y + B.R * .25 }; },
    down(g, s, p) {
      const B = EATH.geo(g), Fr = FR(g);
      // an empty bowl: a touch on it spoons in a second helping (for another taste, or a photo of a full bowl)
      if (s.empty) { if (D(p.x, p.y, B.x, B.y) < B.R * 1.3) EATH.more(g, s); return; }
      if (s.fork && s.fork.t < .56) return; if (s.fork) { EATH.eat(g, s); if (s.empty) return; } if (D(p.x, p.y, B.x, B.y) > B.R * 1.7) return;
      const live = Fr.salad.pieces.filter(pc => !pc.gone && !pc.taken); if (!live.length) return; let best = null;
      for (const pc of live) { const q = piecePos(pc, B.R), x = B.x + q.x, y = B.y + q.y, sc = D(p.x, p.y, x, y) - pc.h * B.R * .3; if (!best || sc < best.sc) best = { pc, sc, x, y }; }
      const take = [best.pc]; for (const pc of live) { if (take.length >= 3) break; if (pc === best.pc) continue; const q = piecePos(pc, B.R); if (D(B.x + q.x, B.y + q.y, best.x, best.y) < B.R * (pc.k === 'grape' ? .3 : .2)) take.push(pc); }
      for (const pc of take) pc.taken = true; s.fork = { t: 0, x: best.x, y: best.y, take };
    },
    more(g, s) {
      s.empty = false; s.moreT = null; sfx.whoosh(); const ps = FR(g).salad.pieces;
      // one after another the pieces tumble in from a big spoon above the bowl (each waits its turn hidden)
      ps.forEach((pc, i) => { pc.gone = true; pc.taken = false; pc.wait = .05 + i / ps.length * .9; pc.drop = 1; pc.fx = (rnd(i * 3 + s.n) - .5) * .4; pc.fy = -1.3; });
    },
    update(g, s, dt) {
      for (const pc of FR(g).salad.pieces) { if (pc.wait > 0) { pc.wait -= dt; if (pc.wait <= 0) { pc.wait = 0; pc.gone = false; } } else if (pc.drop > 0) { pc.drop = Math.max(0, pc.drop - dt * 2.4); if (!pc.drop) SND.plop(pc.sd * 7 | 0); } }
      if (s.moreT != null) { s.moreT -= dt; if (s.moreT <= 0) { s.moreT = null; voice.say('fs-more'); } }
      const Fk = s.fork; if (!Fk) return; const t0 = Fk.t; Fk.t += dt;
      if (t0 < .2 && Fk.t >= .2) { sfx.squish(); SND.squelch(); }
      if (t0 < .55 && Fk.t >= .55) { sfx.munch(); s.n++; for (const pc of Fk.take) pc.gone = true; const B = EATH.geo(g); g.fx.burst(B.x, Math.max(g.y0 + B.R * .2, B.y - B.R * 1.05), 12, { colors: ['#ff9aa6', '#fff1a0', '#e6f4c4', '#b58cf0'], speed: 160, g: 500, life: .55, size: 4 }); g.bounce = 1; if (s.n % 3 === 1) voice.say('cook-yum'); }
      if (Fk.t >= .78) EATH.eat(g, s);
    },
    // the fork is back (or a new touch comes once this bite is eaten): when the bowl is empty the recipe is done
    eat(g, s) {
      s.fork = null; if (!FR(g).salad.pieces.every(pc => pc.gone)) return;
      s.empty = true; s.moreT = 3; const B = EATH.geo(g); g.fx.burst(B.x, B.y, 26, { colors: ['#ffd54a', '#ff9ec8', '#ffffff'], speed: 260, g: 300, life: .9, size: 6, shape: 'star' });
      if (!g.finishedAll) g.recipeDone();
    },
    draw(g, s, c) {
      const B = EATH.geo(g), Fr = FR(g), Fk = s.fork, rest = EATH.rest(B);
      const all = Fr.salad.pieces.length || 1, left = Fr.salad.pieces.filter(p => !p.gone).length / all;
      glassBowl(c, B.x, B.y, B.R, cc => drawSalad(cc, Fr.salad, B.R, g.t, { skip: true, left }));
      let fx = rest.x, fy = rest.y, ang = .5, k = 1, carry = null; const topY = Math.max(g.y0 + B.R * .2, B.y - B.R * 1.05);
      if (Fk) { const u = Fk.t; if (u < .2) { const e = ease(u / .2); fx = lerp(rest.x, Fk.x, e); fy = lerp(rest.y, Fk.y - B.R * .4, e); ang = lerp(.5, Math.PI, e); } else if (u < .55) { const e = ease((u - .2) / .35); fx = lerp(Fk.x, B.x, e); fy = lerp(Fk.y - B.R * .4, topY - B.R * .4, e); ang = Math.PI; k = lerp(1, .9, e); carry = Fk.take; } else { const e = ease((u - .55) / .23); fx = lerp(B.x, rest.x, e); fy = lerp(topY - B.R * .4, rest.y, e); ang = lerp(Math.PI, .5, e); } }
      if (carry) carry.forEach((pc, i) => { c.save(); c.translate(fx + (i - (carry.length - 1) / 2) * B.R * .06, fy + B.R * .44 * k); c.rotate(pc.rot); drawPiece1(c, pc.k, B.R * k, pc.sd | 0); c.restore(); });
      if (!s.empty || Fk) drawFork(c, fx, fy, B.R * .9 * k, ang);
      if ((!s.n && !Fk && !g.finishedAll) || (s.empty && g.idle > 3)) pointAt(g, c, B.x, B.y - B.R * .3, Math.max(16, B.R * .14));
    },
    auto(g, s) { if (s.fork || s.empty || g.finishedAll) return { wait: 250 }; const B = EATH.geo(g), pc = FR(g).salad.pieces.find(p => !p.gone && !p.taken); if (!pc) return { wait: 250 }; const q = piecePos(pc, B.R); return { tap: [B.x + q.x, B.y + q.y], wait: 300 }; },
    hint: (g, s) => s.empty ? 'fs-more' : 'fs-eat',
    tip: () => 'HAPPY'
  };


  /* ================================================================ LEMONADE */
  const LBOARD = g => { const bw = Math.min(g.w * .94, g.SH * 1.7), bh = g.SH * .98; return { bw, bh, S: Math.min(bw, bh * 1.3) }; };
  const lemonSize = g => Math.min(LBOARD(g).S * .3, g.SH * .4);
  const lemonHomes = (g, n) => { const B = LBOARD(g), d = Math.min(B.S * .25, B.bw * .24); return n === 1 ? [{ x: g.bx, y: g.by }] : [{ x: g.bx - d, y: g.by }, { x: g.bx + d, y: g.by }]; };

  // ---- 1. Roll the lemon: press it with a flat hand and roll it back and forth on the board; it gets juicier (and glows) as it rolls.
  const ROLLH = H['lm-roll'] = {
    enter(g, s) { const Fr = fresh(g), C = LM(); Fr.lemons = C.lemons; s.L = Array.from({ length: C.lemons }, (_, i) => ({ i, ox: 0, oy: 0, ang: Math.PI / 2, roll: 0, prog: 0, done: false, jt: 0, m: 0 })); s.need = [5, 7.5, 10][C.T - 1]; s.act = null; s.hand = null; },
    pos(g, s, l) { const h = lemonHomes(g, s.L.length)[l.i], S = LBOARD(g).S; return { x: h.x + l.ox * S, y: h.y + l.oy * S }; },
    near(g, s, p, r) { let best = null; for (const l of s.L) { if (l.done) continue; const q = ROLLH.pos(g, s, l), d = D(p.x, p.y, q.x, q.y); if (d < r && (!best || d < best.d)) best = { l, d }; } return best && best.l; },
    down(g, s, p) { s.hand = { x: p.x, y: p.y, on: true }; s.lp = { x: p.x, y: p.y }; s.act = ROLLH.near(g, s, p, lemonSize(g) * .95); if (s.act) SND.squelch(); },
    move(g, s, p) {
      if (!s.hand || !s.hand.on) return; s.hand.x = p.x; s.hand.y = p.y; const a = s.lp || p; s.lp = { x: p.x, y: p.y };
      if (!s.act) { s.act = ROLLH.near(g, s, p, lemonSize(g) * .6); return; }
      const l = s.act, dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy); if (d < .5) return;
      const B = LBOARD(g), S = B.S, h = lemonHomes(g, s.L.length)[l.i], ls = lemonSize(g);
      l.ox = clamp(l.ox + dx / S, (g.bx - B.bw * .4 + ls * .5 - h.x) / S, (g.bx + B.bw * .4 - ls * .5 - h.x) / S); l.oy = clamp(l.oy + dy / S, (g.by - B.bh * .38 + ls * .3 - h.y) / S, (g.by + B.bh * .38 - ls * .3 - h.y) / S);
      l.ang = angTo(l.ang, Math.atan2(dy, dx) + Math.PI / 2, .2, Math.PI);
      l.roll += (-dx * Math.sin(l.ang) + dy * Math.cos(l.ang)) / (ls * .34);
      l.prog = Math.min(1, l.prog + d / (ls * s.need)); s.acc = (s.acc || 0) + d; if (s.acc > ls * .35) { s.acc = 0; sfx.roll(); }
      const m = Math.floor(l.prog * 3); if (m > l.m && l.prog < 1) { l.m = m; SND.squelch(); const q = ROLLH.pos(g, s, l); g.fx.burst(q.x, q.y, 6, { colors: ['#fff6a0', '#ffffff'], speed: 90, g: 0, life: .5, size: 4, shape: 'star' }); }
      if (l.prog >= 1) ROLLH.done(g, s, l);
    },
    done(g, s, l) { l.done = true; l.jt = 1; s.act = null; sfx.plink(3 + l.i); const q = ROLLH.pos(g, s, l); g.fx.burst(q.x, q.y, 16, { colors: ['#fff6a0', '#ffe066', '#ffffff'], speed: 200, g: 150, life: .8, size: 6, shape: 'star' }); if (s.L.every(x => x.done)) g.finish(1.1); },
    up(g, s) { if (s.hand) s.hand.on = false; s.act = null; },
    update(g, s, dt) { for (const l of s.L) { if (l !== s.act) { const k = Math.min(1, dt * 2.5); l.ox = lerp(l.ox, 0, k); l.oy = lerp(l.oy, 0, k); } l.jt = Math.max(0, l.jt - dt * 1.8); } },
    draw(g, s, c) {
      g.sceneBoard(c); const ls = lemonSize(g);
      for (const l of s.L) { const q = ROLLH.pos(g, s, l), jump = l.jt > 0 ? Math.sin((1 - l.jt) * Math.PI) * ls * .25 : 0; drawLemon(c, q.x, q.y - jump, ls, l.ang, l.roll, l.done ? 1 : l.prog * .5, l === s.act ? 1 : 0, g.t); }
      if (s.hand && s.hand.on) { c.save(); c.globalAlpha = .96; drawFlatHand(c, s.hand.x, s.hand.y + ls * .05, ls * 1.05, 0, s.act ? 1 : 0); c.restore(); }
      else if (!s.fin && (!s.touched || g.idle > 4)) { const l = s.L.find(x => !x.done); if (l) { const q = ROLLH.pos(g, s, l); ghost(g, c, [[q.x - ls * .6, q.y], [q.x + ls * .6, q.y], [q.x - ls * .6, q.y], [q.x + ls * .6, q.y]], Math.max(14, ls * .14), 2.4); } }
    },
    auto(g, s) { const l = s.L.find(x => !x.done); if (!l) return { wait: 300 }; const q = ROLLH.pos(g, s, l), ls = lemonSize(g), pts = [[q.x, q.y]]; for (let i = 0; i < 10; i++) pts.push([q.x + (i % 2 ? 1 : -1) * ls * .75, q.y + (i % 3 - 1) * ls * .1]); return { drag: pts, steps: 1, wait: 300 }; },
    hint: () => 'lm-roll',
    tip: (g, s) => s.L.every(l => l.done) ? 'HAPPY' : 'lm-lemon'
  };

  // ---- 2. Cut the lemon in half (across the middle, with the kid knife); the halves fall open, cut side up.
  const LCUT = H['lm-cut'] = {
    enter(g, s) { const Fr = FR(g); Fr.lemons = Fr.lemons || LM().lemons; s.L = Array.from({ length: Fr.lemons }, (_, i) => ({ i, done: 0, want: 1, prog: 0, sep: [] })); s.kn = null; s.cutN = 0; },
    line(g, s, l) { if (l.done) return null; const h = lemonHomes(g, s.L.length)[l.i], ls = lemonSize(g); return { x1: h.x, y1: h.y - ls * .5, x2: h.x, y2: h.y + ls * .5 }; },
    lines(g, s) { const out = []; for (const l of s.L) { const ln = LCUT.line(g, s, l); if (ln) out.push({ L: ln, o: l }); } return out; },
    down(g, s, p) { if (s.fin) return; s.kn = { x: p.x, y: p.y, on: true, ang: s.kn ? s.kn.ang : -Math.PI / 2 }; s.lp = { x: p.x, y: p.y }; },
    move(g, s, p) { if (!s.kn || !s.kn.on) return; const a = s.lp || p; s.lp = { x: p.x, y: p.y }; s.kn.x = p.x; s.kn.y = p.y; KN.move(s, LCUT.lines(g, s), a, p, LBOARD(g).S, l => LCUT.cut(g, s, l)); },
    up(g, s) { if (s.kn) s.kn.on = false; },
    cut(g, s, l) { l.done = 1; l.sep.push(0); s.cutN++; SND.chop(); sfx.pop(); const h = lemonHomes(g, s.L.length)[l.i]; g.fx.burst(h.x, h.y, 14, { colors: ['#fff6a0', '#ffd84a', '#ffffff'], speed: 170, g: 500, life: .55, size: 4 }); voice.say('num/' + s.cutN * 2); if (s.L.every(x => x.done)) g.finish(1.3); },
    update(g, s, dt) { for (const l of s.L) for (let k = 0; k < l.sep.length; k++) l.sep[k] = Math.min(1, l.sep[k] + dt * 2.6); },
    draw(g, s, c) {
      g.sceneBoard(c); const ls = lemonSize(g), B = LBOARD(g);
      for (const l of s.L) {
        const h = lemonHomes(g, s.L.length)[l.i];
        if (!l.done) { drawLemon(c, h.x, h.y, ls, 0, 0, .6, 0, g.t); continue; }
        const e = ease(l.sep[0] || 0);
        for (const sg of [-1, 1]) {
          c.save();
          if (e < .45) { const k = e / .45; c.translate(h.x + sg * ls * .12 * k, h.y); c.beginPath(); c.rect(sg < 0 ? -ls : 0, -ls, ls, ls * 2); c.clip(); c.translate(-sg * ls * .0, 0); drawLemon(c, 0, 0, ls, 0, 0, 0, 0, g.t); }
          else { const k = (e - .45) / .55; c.translate(h.x + sg * ls * .36, h.y); c.scale(Math.max(.15, k), 1); drawLemonFace(c, 0, 0, ls * .64, {}); }
          c.restore();
        }
      }
      for (const { L: ln, o } of LCUT.lines(g, s)) KN.line(g, c, ln, o.prog / KN.need(D(ln.x1, ln.y1, ln.x2, ln.y2)));
      if (!s.fin || (s.kn && s.kn.on)) KN.draw(c, s.kn, !s.fin ? { x: g.bx + B.bw * .38, y: g.by + B.bh * .34 } : null, B.S);
      if (!s.fin && !(s.kn && s.kn.on) && (!s.touched || g.idle > 3.5)) { const ln = LCUT.lines(g, s)[0]; if (ln) ghost(g, c, [[ln.L.x1, ln.L.y1], [ln.L.x2, ln.L.y2]], Math.max(14, B.S * .045), 1.4); }
    },
    auto(g, s) { const ln = LCUT.lines(g, s)[0]; if (!ln) return { wait: 250 }; const a = [ln.L.x1, ln.L.y1], b = [ln.L.x2, ln.L.y2]; return { drag: [a, b, a], steps: 3, wait: 300 }; },
    hint: () => 'lm-cut',
    tip: (g, s) => s.fin ? 'HAPPY' : 'lm-half'
  };

  // ---- 3. Juice it: put a lemon half on the juicer, then press and twist (going round, or just holding it down). The juice drips into the
  // measuring cup, the juicer keeps the seeds, and each squeezed half goes in the peel bowl.
  const SQ = H['lm-squeeze'] = {
    geo(g) {
      const w = wide(g), cs = Math.min(g.SH * .52, g.w * (w ? .4 : .55), g.U * .55), x = g.bx - (w ? cs * .3 : 0), y = g.by + cs * .22, r = clamp(cs * .22, 36, g.w * .15);
      return { x, y, cs, dish: { x, y: y - cs * .34, s: cs * .82 }, peel: w ? { x: Math.min(x + cs * 1.05, g.w - r * 1.15 - 10), y: y + cs * .2, r } : { x: g.w - r * 1.15 - 10, y: Math.min(y + cs * .55, g.y1 - r * .75), r } };
    },
    enter(g, s) {
      const Fr = FR(g), C = LM(); Fr.lemons = Fr.lemons || C.lemons; s.halves = Fr.lemons * 2; s.used = 0; s.on = null; s.place = null; s.pop = null; s.seeds = 0; Fr.juice = 0; s.target = Fr.lemons === 1 ? .5 : .75;
      s.need = [1.3, 2.0, 2.8][C.T - 1]; s.hold = [.42, .3, .2][C.T - 1]; s.drops = []; s.tw = null;
      g.setTray(Array.from({ length: s.halves }, () => ({ id: 'lm-half', once: true })));
    },
    domePos(G) { return { x: G.dish.x, y: G.dish.y - G.dish.s * .5 * .64 * .3 }; },
    drop(g, s, it, x, y, tap) { if (s.on || s.place || s.fin) return false; const G = SQ.geo(g); if (!tap && D(x, y, G.dish.x, G.dish.y) > G.cs * .85) return false; s.place = { t: 0, x0: it.x, y0: it.y }; sfx.whoosh(); return true; },
    down(g, s, p) { const G = SQ.geo(g), dp = SQ.domePos(G); if (D(p.x, p.y, dp.x, dp.y) > G.cs * .75) return; s.tw = { a: Math.atan2(p.y - dp.y, p.x - dp.x), lp: { x: p.x, y: p.y }, x: p.x, y: p.y }; },
    move(g, s, p) {
      const T = s.tw; if (!T) return; T.x = p.x; T.y = p.y; const G = SQ.geo(g), dp = SQ.domePos(G), a = Math.atan2(p.y - dp.y, p.x - dp.x), da = wrap(a - T.a), d = D(p.x, p.y, T.lp.x, T.lp.y); T.a = a; T.lp = { x: p.x, y: p.y };
      if (!s.on || s.on.done) return; s.on.twist += Math.abs(da) > .002 ? da : d / (G.cs * .2); SQ.squeeze(g, s, d / (G.cs * s.need), d);
    },
    up(g, s) { s.tw = null; quiet(s); },
    squeeze(g, s, dp, speed) {
      const o = s.on, Fr = FR(g); if (!o || o.done || dp <= 0) return; const before = o.prog; o.prog = Math.min(1, o.prog + dp); const got = o.prog - before;
      Fr.juice = Math.min(s.target, Fr.juice + got * s.target / s.halves); s.dropAcc = (s.dropAcc || 0) + got * 26; while (s.dropAcc > 1) { s.dropAcc--; s.drops.push({ x: (Math.random() - .5) * .2, y: 0, v: 0 }); }
      if (!s.snd) s.snd = sfx.squeeze(); s.snd.set(clamp(speed / 6, .3, 1));
      for (const th of [.4, .75]) if (before < th && o.prog >= th) { s.seeds = Math.min(10, s.seeds + 1); sfx.tap(); if (s.seeds === 1) g.say('lm-seeds', 30); }
      if (o.prog >= 1) { o.done = true; quiet(s); s.used++; s.pop = { t: 0, squash: o.prog, twist: o.twist }; s.on = null; sfx.pop(); const G = SQ.geo(g), dp2 = SQ.domePos(G); g.fx.burst(dp2.x, dp2.y - G.cs * .1, 12, { colors: ['#fff6a0', '#ffd84a', '#ffffff'], speed: 160, g: 300, life: .6, size: 5, shape: 'star' }); if (s.used >= s.halves) { Fr.juice = s.target; g.finish(1.6); } }
    },
    update(g, s, dt) {
      const G = SQ.geo(g);
      if (s.place) { s.place.t += dt / .45; if (s.place.t >= 1) { s.place = null; s.on = { prog: 0, twist: 0 }; sfx.pat(); } }
      if (s.pop) { s.pop.t += dt / .6; if (s.pop.t >= 1) { s.pop = null; sfx.pat(); } }
      if (s.tw && s.on) SQ.squeeze(g, s, dt * s.hold * (tier() === 1 ? 1.2 : 1), 1.5);
      const cupTop = G.y - G.cs * .32, lv = (FR(g).juice > .003 ? levelOf(CUP, 0, FR(g).juice) : .3) * G.cs + G.y;
      for (const d of s.drops) { d.v += dt * 900; d.y += d.v * dt; } const n0 = s.drops.length; s.drops = s.drops.filter(d => G.dish.y + G.dish.s * .17 + d.y < lv); if (s.drops.length < n0 && Math.random() < .5) SND.drip(Math.random() * 4 | 0); void cupTop;
    },
    draw(g, s, c) {
      const G = SQ.geo(g), Fr = FR(g), dp = SQ.domePos(G);
      drawCompost(c, G.peel.x, G.peel.y, G.peel.r, 'lemon', s.used);
      drawCup(c, G.x, G.y, G.cs, Fr.juice, JUICE, 0, { mark: s.target, t: g.t });
      c.save(); c.fillStyle = 'rgba(255,214,60,.9)'; for (const d of s.drops) { const x = G.dish.x + d.x * G.dish.s * .5, y = G.dish.y + G.dish.s * .17 + d.y; c.beginPath(); c.ellipse(x, y, Math.max(1.5, G.cs * .012), Math.max(2.5, G.cs * .02), 0, 0, TAU); c.fill(); } c.restore();
      drawJuicer(c, G.dish.x, G.dish.y, G.dish.s, { seeds: s.seeds, pool: Math.min(1, Fr.juice * 2.2), dome: s.on ? { squash: s.on.prog, twist: s.on.twist } : null });
      if (s.place) { const u = ease(s.place.t), x = lerp(s.place.x0, dp.x, u), y = lerp(s.place.y0, dp.y - G.cs * .08, u) - Math.sin(u * Math.PI) * G.cs * .3; c.save(); c.translate(x, y); c.scale(1, Math.cos(u * Math.PI) * .6 + .4 * (u < .5 ? 1 : -1) * 0 + (u < .5 ? 0 : 0) || .1); c.restore(); if (u < .5) drawLemonFace(c, x, y, lerp(g.th * .5, G.dish.s * .7, u), { k: lerp(.92, .2, u * 2) }); else drawLemonDome(c, x, y + G.cs * .08, G.dish.s * .7, 0, 0); }
      if (s.pop) { const u = ease(s.pop.t), x = lerp(dp.x, G.peel.x, u), y = lerp(dp.y, G.peel.y - G.peel.r * .3, u) - Math.sin(u * Math.PI) * G.cs * .4, k = lerp(1, .5, u); c.save(); c.translate(x, y); c.scale(k, k); c.rotate(u * 2); drawLemonDome(c, 0, 0, G.dish.s * .7, s.pop.squash, s.pop.twist); c.restore(); }
      if (s.on && s.tw) { c.save(); c.globalAlpha = .95; drawFlatHand(c, dp.x + Math.cos(s.on.twist) * G.cs * .02, dp.y - G.cs * .14, G.cs * .42, Math.sin(s.on.twist * .5) * .35, 1); c.restore(); }
      if (!s.fin && !s.place && !s.pop && (!s.touched || g.idle > 4)) {
        if (!s.on) { const it = g.tray.find(i => !i.used); if (it) ghost(g, c, [[it.hx, it.hy], [dp.x, dp.y]], Math.max(14, G.cs * .06), 1.6); }
        else if (!s.tw) { const pts = []; for (let a = 0; a <= TAU * 1.05; a += .3) pts.push([dp.x + Math.cos(a) * G.cs * .14, dp.y - G.cs * .08 + Math.sin(a) * G.cs * .06]); ghost(g, c, pts, Math.max(14, G.cs * .06), 2); }
      }
    },
    want(g, s) { return s.on || s.place ? [] : ['lm-half']; },
    auto(g, s) { if (s.place || s.pop) return { wait: 200 }; if (!s.on) { const it = g.tray.find(i => !i.used); return it ? { tap: [it.x, it.y], wait: 650 } : { wait: 300 }; } const G = SQ.geo(g), dp = SQ.domePos(G), r = G.cs * .16, pts = []; for (let a = 0; a <= TAU * 3.6; a += 1) pts.push([dp.x + Math.cos(a) * r, dp.y - G.cs * .05 + Math.sin(a) * r * .6]); return { drag: pts, steps: 1, wait: 300 }; },
    hint: (g, s) => 'lm-squeeze',
    tip: (g, s) => s.on ? 'HAPPY' : 'lm-half'
  };

  // ---- 4. Juice, then water: touch (or drag) the measuring cup and it pours the juice into the pitcher; then hold the jug to pour water
  // (a quick touch pours a little) right up to the line on the pitcher, where it stops by itself.
  const PCUP = .25;   // a full measuring cup fills a quarter of the pitcher
  const lemCol = P => { const tot = P.juice + P.water; return tot <= 0 ? JUICE : mixHex(JUICE, '#fff6c4', clamp(P.water / tot * 1.15, 0, 1)); };
  const PITH = H['lm-pitcher'] = {
    geo(g) {
      // a wide screen puts the jug, the pitcher and the cup in a row; a tall one stands the jug and the cup on a shelf above
      if (g.w > g.SH) { const P = Math.min(g.SH * .6, g.w * .36), floor = Math.min(g.y1 - g.SH * .06, g.by + P * .62), d = Math.min(g.w * .34, P * 1.1); return { P, floor, cs: P * .6, js: P * .78, pit: { x: g.bx, y: floor }, cup: { x: g.bx + d, y: floor - P * .6 * .34 }, jug: { x: g.bx - d, y: floor } }; }
      const P = Math.min(g.SH * .42, g.w * .56), floor = Math.min(g.y1 - g.SH * .07, bubTop(g) - 6), up = floor - P * 1.14, d = g.w * .3;
      return { P, floor, cs: P * .6, js: P * .78, pit: { x: g.bx, y: floor }, cup: { x: Math.min(g.bx + d, g.w - P * .6 * .64 - 8), y: up - P * .6 * .34 }, jug: { x: g.bx - d, y: up } };
    },
    enter(g, s) { const Fr = FR(g); Fr.juice = Fr.juice || .6; s.cupF = Fr.juice; Fr.pit = s.pit = { juice: 0, water: 0 }; s.line = tier() === 3 ? .78 : .7; s.phase = 'juice'; s.cup = { pose: 0, go: false, back: false, drag: null }; s.jug = { pose: 0, f: .85 }; s.hold = false; s.tap = 0; },
    cupPose(G) { const th = -1.2, tx = G.pit.x + G.P * .1, ty = G.floor - G.P * .93 - G.P * .22, r = rotP(-.31 * G.cs, -.32 * G.cs, th); return { x: tx - r[0], y: ty - r[1], th, lx: tx, ly: ty }; },
    jugPose(G) { const th = 1.3, tx = G.pit.x - G.P * .12, ty = G.floor - G.P * .93 - G.P * .18, r = rotP(.2 * G.js, -1.03 * G.js, th); return { x: tx - r[0], y: ty - r[1], th, lx: tx, ly: ty }; },
    cupAt(g, s, G) { const pp = PITH.cupPose(G), e = ease(s.cup.pose); if (s.cup.drag) return { x: s.cup.drag.x, y: s.cup.drag.y, th: 0 }; const from = s.cup.from || G.cup; return { x: lerp(s.cup.back ? G.cup.x : from.x, pp.x, e), y: lerp(s.cup.back ? G.cup.y : from.y, pp.y, e) - Math.sin(e * Math.PI) * G.P * .15 * (s.cup.back ? 0 : 1), th: pp.th * e }; },
    jugAt(G, s) { const pp = PITH.jugPose(G), e = ease(s.jug.pose); return { x: lerp(G.jug.x, pp.x, e), y: lerp(G.jug.y, pp.y, e) - Math.sin(e * Math.PI) * G.P * .1, th: pp.th * e }; },
    fill: s => s.pit.juice + s.pit.water,
    down(g, s, p) {
      const G = PITH.geo(g);
      if (s.phase === 'juice' && !s.cup.go) { const q = PITH.cupAt(g, s, G); if (D(p.x, p.y, q.x, q.y) < G.cs * .75) { s.cup.drag = { x: q.x, y: q.y, dx: q.x - p.x, dy: q.y - p.y, sx: p.x, sy: p.y }; sfx.tap(); } }
      else if (s.phase === 'water') { const q = { x: G.jug.x, y: G.jug.y - G.js * .5 }, j = PITH.jugAt(G, s); if (D(p.x, p.y, q.x, q.y) < G.js * .65 || D(p.x, p.y, j.x, j.y - G.js * .4) < G.js * .6) { s.hold = true; s.holdT = g.t; sfx.tap(); } }
    },
    move(g, s, p) {
      const dr = s.cup.drag; if (!dr) return; dr.x = p.x + dr.dx; dr.y = p.y + dr.dy; const G = PITH.geo(g), pp = PITH.cupPose(G);
      if (D(dr.x, dr.y, pp.x, pp.y) < G.P * .45) PITH.pourCup(g, s);
    },
    up(g, s, p) { if (s.cup.drag) PITH.pourCup(g, s); if (s.hold) { if (g.t - s.holdT < .35) s.tap = Math.max(s.tap, .9); s.hold = false; } },
    pourCup(g, s) { if (s.cup.go) return; const dr = s.cup.drag; s.cup.from = dr ? { x: dr.x, y: dr.y } : null; s.cup.drag = null; s.cup.go = true; s.cup.pose = 0; sfx.whoosh(); },
    update(g, s, dt) {
      const G = PITH.geo(g); let flow = 0;
      if (s.cup.go && !s.cup.back) { s.cup.pose = Math.min(1, s.cup.pose + dt / .5); if (s.cup.pose >= 1 && s.cupF > 0) { const d = Math.min(s.cupF, dt * .42); s.cupF -= d; s.pit.juice += d * PCUP; flow = 1; if (s.cupF <= .002) { s.cupF = 0; s.cup.back = true; } } }
      else if (s.cup.back) { s.cup.pose = Math.max(0, s.cup.pose - dt / .5); if (!s.cup.pose && s.phase === 'juice') { s.phase = 'water'; voice.say('lm-water'); } }
      const want = s.phase === 'water' && (s.hold || s.tap > 0); s.jug.pose = clamp(s.jug.pose + (want ? dt / .4 : -dt / .4), 0, 1);
      if (want && s.jug.pose >= .97) { const d = dt * .26; s.pit.water += d; s.jug.f = Math.max(.25, s.jug.f - d * .5); s.tap -= dt; flow = 2; if (PITH.fill(s) >= s.line) { s.pit.water = s.line - s.pit.juice; s.phase = 'done'; s.hold = false; s.tap = 0; s.hit = true; sfx.ding(); g.say('lm-line', 30); const ly = G.floor + levelOf(PIT, 0, s.line) * G.P; g.fx.burst(G.pit.x, ly, 18, { colors: ['#7ed957', '#ffffff', '#ffe066'], speed: 220, g: 120, life: .8, size: 6, shape: 'star' }); g.finish(1.5); } }
      else if (s.tap > 0 && s.jug.pose < .97) { /* still lifting */ } else if (!s.hold) s.tap = 0;
      if (flow) { if (!s.snd) s.snd = stream(); s.snd.set(.8); } else quiet(s);
      s.flow = flow;
    },
    draw(g, s, c) {
      const G = PITH.geo(g), fill = PITH.fill(s), lv = fill > .003 ? G.floor + levelOf(PIT, 0, fill) * G.P : G.floor - G.P * .04;
      if (s.flow === 1) { const pp = PITH.cupPose(G); drawStream(c, pp.lx, pp.ly, pp.lx - G.P * .03, lv, Math.max(3, G.P * .035), JUICE, g.t); }
      if (s.flow === 2) { const pp = PITH.jugPose(G); drawStream(c, pp.lx, pp.ly, pp.lx + G.P * .03, lv, Math.max(4, G.P * .045), WATER, g.t, .85); }
      drawPitcher(c, G.pit.x, G.pit.y, G.P, fill, lemCol(s.pit), { line: s.line, lineHit: s.hit, t: g.t });
      const j = PITH.jugAt(G, s); drawJug(c, j.x, j.y, G.js, s.jug.f, j.th);
      const q = PITH.cupAt(g, s, G); drawCup(c, q.x, q.y, G.cs, s.cupF, JUICE, q.th);
      if (s.fin || (s.touched && g.idle < 4)) return;
      if (s.phase === 'juice' && !s.cup.go && !s.cup.drag) { const pp = PITH.cupPose(G); ghost(g, c, [[G.cup.x, G.cup.y], [pp.x, pp.y]], Math.max(14, G.P * .07), 1.6); }
      if (s.phase === 'water' && !s.hold && s.jug.pose < .05) pointAt(g, c, G.jug.x, G.jug.y - G.js * .62, Math.max(16, G.P * .09));
    },
    auto(g, s) { const G = PITH.geo(g); if (s.phase === 'juice' && !s.cup.go) { const q = PITH.cupAt(g, s, G); return { tap: [q.x, q.y], wait: 500 }; } if (s.phase === 'water' && !s.hold && s.tap <= 0 && s.jug.pose < .05) return { tap: [G.jug.x, G.jug.y - G.js * .5], wait: 1300 }; return { wait: 300 }; },
    hint: (g, s) => s.phase === 'juice' ? 'lm-juice' : 'lm-water',
    tip: (g, s) => s.phase === 'done' ? 'HAPPY' : s.phase === 'juice' ? 'lm-cupjuice' : 'lm-jug'
  };
  ING['lm-cupjuice'] = (c, s) => drawCup(c, -s * .08, 0, s * .9, .6, JUICE, 0);
  ING['lm-jug'] = (c, s) => drawJug(c, 0, s * .45, s * .9, .8, 0);

  // ---- 5. Sugar: spoon by spoon (counted), then stir until the sugar has disappeared.
  const SUG = H['lm-sugar'] = {
    geo(g) { const tall = g.w < g.SH, P = Math.min(g.SH * .62, g.w * (tall ? .6 : .44)), floor = Math.min(g.y1 - g.SH * .05, g.by + P * (tall ? .7 : .58), tall ? bubTop(g) - 6 : 1e9); return { P, floor, x: g.bx, c: { x: g.bx, y: floor - P * .4 } }; },
    enter(g, s) { const Fr = FR(g), C = LM(); s.need = C.spoons; s.n = 0; s.spoon = null; s.sugar = 0; s.dis = 0; s.turns = [1.5, 2, 2.5][C.T - 1]; s.phase = 'spoon'; s.swirl = 0; s.swirlK = 0; Fr.pit = Fr.pit || { juice: .15, water: .55 }; s.pit = Fr.pit; g.setTray([{ id: 'sugar', cnt: { total: C.spoons, done: 0 } }]); },
    drop(g, s, it, x, y, tap) { if (s.phase !== 'spoon' || s.spoon || s.n >= s.need) return false; const G = SUG.geo(g); if (!tap && D(x, y, G.c.x, G.c.y) > G.P * .8) return false; s.spoon = { t: 0, x0: it.x, y0: it.y, it }; return true; },
    down(g, s, p) { if (s.phase !== 'stir') return; s.on = true; s.ang = null; SUG.move(g, s, p); },
    move(g, s, p) {
      if (!s.on || s.phase !== 'stir') return; const G = SUG.geo(g), a = Math.atan2((p.y - G.c.y) / .5, p.x - G.c.x);
      if (D(p.x, p.y, G.c.x, G.c.y) > G.P * 1.2) { s.ang = null; return; } if (s.ang == null) { s.ang = a; return; }
      const da = wrap(a - s.ang); s.ang = a; s.swirl += da; s.swirlK = 1; s.dis = Math.min(1, s.dis + Math.abs(da) / TAU / s.turns);
      const q = Math.floor(s.dis * 10); if (q !== s.q) { s.q = q; SND.clink(q); }
      if (s.dis >= 1 && !s.fin) { const P = G.P; g.fx.burst(G.x, G.floor - P * .45, 20, { colors: ['#ffffff', '#fff6a0', '#ffe066'], speed: 220, g: 100, life: .9, size: 6, shape: 'star' }); sfx.plink(5); g.finish(1.1); }
    },
    up(g, s) { s.on = false; s.ang = null; },
    update(g, s, dt) {
      s.swirlK = Math.max(0, s.swirlK - dt * .8); if (!s.on) s.swirl += dt * s.swirlK * 2;
      // the sugar falls quickly through the air, then slowly and wobbling through the lemonade, and makes a little heap at the bottom
      if (s.fall && s.fall.length) { const lv = levelOf(PIT, 0, s.pit.juice + s.pit.water); for (const q of s.fall) { const under = q.y > lv; q.v = Math.min(q.v + dt * (under ? .4 : 4), under ? .3 : 2.5); q.y += q.v * dt; q.w += dt * 3; if (under) q.x += Math.sin(q.w) * dt * .03; if (q.y > -.06) { q.done = true; s.sugar = Math.min(1, s.sugar + 1 / (46 * s.need)); } } s.fall = s.fall.filter(q => !q.done); }
      const S = s.spoon; if (!S) return; const t0 = S.t; S.t += dt;
      if (t0 < .62 && S.t >= .62) {
        s.n++; voice.say('num/' + s.n); sfx.shake(); const G = SUG.geo(g); g.fx.burst(G.x - G.P * .05, G.floor - G.P * .98, 14, { colors: ['#ffffff', '#f0f6ff'], speed: 50, g: 900, life: .4, size: 3 });
        s.fall = s.fall || []; for (let i = 0; i < 46; i++) s.fall.push({ x: -.05 + (Math.random() - .5) * .14, y: -.93 - Math.random() * .08, v: .2 + Math.random() * .5, w: Math.random() * TAU, r: .006 + Math.random() * .006 });
        if (S.it && S.it.cnt) S.it.cnt.done = s.n;
      }
      if (S.t >= 1.05) { s.spoon = null; if (s.n >= s.need) { if (S.it) S.it.used = true; s.phase = 'stir'; voice.say('lm-stir'); } }
    },
    draw(g, s, c) {
      const G = SUG.geo(g), P = G.P, fill = s.pit.juice + s.pit.water, col = mixHex(lemCol(s.pit), '#fffbe0', s.dis * .35), clouds = s.phase === 'stir' ? (1 - s.dis) : 0;
      drawPitcher(c, G.x, G.floor, P, fill, col, { sugar: s.sugar * (1 - s.dis), swirl: s.phase === 'stir' ? { a: s.swirl, k: Math.max(s.swirlK, .25) * (1 - s.dis * .6) } : null, t: g.t, inner: cc => {
        if (clouds > 0 && s.swirlK > 0) { cc.fillStyle = `rgba(255,255,255,${.35 * clouds * s.swirlK})`; for (let i = 0; i < 18; i++) { const a = s.swirl * 1.3 + i * 1.7, r = P * (.05 + (i % 6) * .03); cc.beginPath(); cc.arc(Math.cos(a) * r, -P * (.1 + (i % 5) * .08), P * .008, 0, TAU); cc.fill(); } }
        if (s.fall && s.fall.length) { cc.globalAlpha = 1 - s.dis; for (const q of s.fall) { circ(cc, q.x * P, q.y * P, Math.max(1.2, q.r * P), '#ffffff'); } cc.globalAlpha = 1; }
        if (s.phase === 'stir') { const a = s.on && s.ang != null ? s.ang : g.t * .8, bx = Math.cos(a) * P * .17, by = -P * .2 + Math.sin(a) * P * .04; cc.strokeStyle = '#c9d2de'; cc.lineWidth = Math.max(3, P * .025); cc.lineCap = 'round'; cc.beginPath(); cc.moveTo(bx, by); cc.lineTo(bx * .4 + P * .12, -P * 1.18); cc.stroke(); cc.strokeStyle = 'rgba(255,255,255,.7)'; cc.lineWidth = Math.max(1, P * .008); cc.stroke(); ell(cc, bx, by, P * .05, P * .03, '#b9c4d4'); }
      } });
      const S = s.spoon;
      if (S) { const u = ease(clamp(S.t / .45, 0, 1)), tx = G.x - P * .05, ty = G.floor - P * 1.08, x = lerp(S.x0, tx, u), y = lerp(S.y0, ty, u) - Math.sin(u * Math.PI) * P * .2, tilt = -ease(clamp((S.t - .45) / .2, 0, 1)) * 1.4, fade = 1 - clamp((S.t - .8) / .25, 0, 1); c.save(); c.globalAlpha = fade; c.translate(x, y); drawMeasure(c, 'tbsp', P * .5, S.t < .62 ? 1 : Math.max(0, 1 - (S.t - .62) * 5), '#ffffff', tilt); c.restore(); }
      if (!s.fin && (!s.touched || g.idle > 4)) { if (s.phase === 'spoon' && !S) { const it = g.tray[0]; if (it) ghost(g, c, [[it.hx, it.hy], [G.x, G.floor - P * 1.0]], Math.max(14, P * .07), 1.6); } else if (s.phase === 'stir' && !s.on) { const pts = []; for (let a = 0; a <= TAU * 1.05; a += .3) pts.push([G.c.x + Math.cos(a) * P * .25, G.c.y + Math.sin(a) * P * .1]); ghost(g, c, pts, Math.max(14, P * .07), 2); } }
    },
    want: (g, s) => s.phase === 'spoon' && !s.spoon ? ['sugar'] : [],
    auto(g, s) { if (s.spoon) return { wait: 250 }; if (s.phase === 'spoon') { const it = g.tray[0]; return it ? { tap: [it.x, it.y], wait: 1200 } : { wait: 300 }; } const G = SUG.geo(g), pts = []; for (let a = 0; a <= TAU * 3.1; a += 1) pts.push([G.c.x + Math.cos(a) * G.P * .25, G.c.y + Math.sin(a) * G.P * .1]); return { drag: pts, steps: 1, wait: 300 }; },
    hint: (g, s) => s.phase === 'stir' ? 'lm-stir' : 'lm-sugar',
    tip: (g, s) => s.phase === 'spoon' ? 'sugar' : 'HAPPY'
  };

  // ---- 6. A glass: drop in the ice cubes (counted, clink), then touch or drag the pitcher and it pours the lemonade into the glass.
  const GLH = H['lm-glass'] = {
    geo(g) { const w = g.w > g.SH * .95, floor = w ? g.y1 - g.SH * .05 : Math.min(g.y1 - g.SH * .07, bubTop(g) - 6), P = Math.min(g.SH * .52, g.w * (w ? .3 : .42), (floor - g.y0 - 6) / 1.74), Gs = Math.min(P * .85, g.SH * .46), d = w ? Math.min(g.w * .22, P * .95) : g.w * .25; return { P, Gs, floor, pit: { x: g.bx - d, y: floor }, gl: { x: g.bx + d * .85, y: floor } }; },
    enter(g, s) { const Fr = FR(g), C = LM(); Fr.pit = Fr.pit || { juice: .15, water: .55 }; s.pit = Fr.pit; Fr.glass = s.Gl = { level: 0, ice: [], straw: null, slice: 0, mint: 0, col: mixHex(lemCol(Fr.pit), '#fffbe0', .35) }; s.need = C.ice; s.n = 0; s.fly = []; s.phase = 'ice'; s.pose = 0; s.go = false; s.back = false; g.setTray([{ id: 'lm-ice', cnt: { total: C.ice, done: 0 } }]); },
    pose(G) { const th = 1.15, tx = G.gl.x - G.Gs * .06, ty = G.floor - G.Gs - G.Gs * .22, r = rotP(.42 * G.P, -.99 * G.P, th); return { x: tx - r[0], y: ty - r[1], th, lx: tx, ly: ty }; },
    drop(g, s, it, x, y, tap) { if (s.phase !== 'ice' || s.n + s.fly.length >= s.need) return false; const G = GLH.geo(g); if (!tap && D(x, y, G.gl.x, G.floor - G.Gs * .5) > G.Gs * .9) return false; s.fly.push({ t: 0, x0: it.x, y0: it.y, rot: Math.random() * 1.2 - .6, k: .9 + Math.random() * .2, it }); sfx.whoosh(); return true; },
    down(g, s, p) { if (s.phase !== 'pour' || s.go) return; const G = GLH.geo(g); if (D(p.x, p.y, G.pit.x, G.floor - G.P * .5) < G.P * .7) { s.go = true; sfx.tap(); } },
    update(g, s, dt) {
      const G = GLH.geo(g), Gl = s.Gl;
      for (const f of s.fly) { f.t += dt / .45; if (f.t >= 1 && !f.done) { f.done = true; const i = Gl.ice.length; Gl.ice.push({ x: [-.6, .55, -.1, .35][i % 4], rot: f.rot, k: f.k }); s.n++; SND.clink(i); voice.say('num/' + s.n); if (f.it && f.it.cnt) f.it.cnt.done = s.n; if (s.n >= s.need) { if (f.it) f.it.used = true; s.phase = 'pour'; s.say = .6; } } }
      s.fly = s.fly.filter(f => !f.done);
      if (s.say != null) { s.say -= dt; if (s.say <= 0) { s.say = null; voice.say('lm-pour'); } }
      if (s.go && !s.back) { s.pose = Math.min(1, s.pose + dt / .5); if (s.pose >= 1) { const d = dt * .38; Gl.level = Math.min(.8, Gl.level + d); s.pit.water = Math.max(.05, s.pit.water - d * .45); s.flow = true; if (Gl.level >= .8) { s.back = true; s.flow = false; sfx.plink(4); SND.clink(2); g.finish(1.4); } } }
      else if (s.back) { s.pose = Math.max(0, s.pose - dt / .5); s.flow = false; }
      const T = iceTargets(Gl); Gl.ice.forEach((q, i) => { if (q.cy == null) { q.cx = T[i].x; q.cy = -.95; } q.cx = lerp(q.cx, T[i].x, Math.min(1, dt * 6)); q.cy = lerp(q.cy, T[i].y, Math.min(1, dt * (q.cy < T[i].y ? 9 : 4))); });
      if (s.flow) { if (!s.snd) s.snd = stream(); s.snd.set(.7); } else quiet(s);
    },
    draw(g, s, c) {
      const G = GLH.geo(g), pp = GLH.pose(G), e = ease(s.pose), px = lerp(G.pit.x, pp.x, e), py = lerp(G.pit.y, pp.y, e) - Math.sin(e * Math.PI) * G.P * .1, th = pp.th * e;
      if (s.flow) { const lv = G.floor + (s.Gl.level > .003 ? levelOf(GLS, 0, s.Gl.level) * G.Gs : -G.Gs * .08); drawStream(c, pp.lx, pp.ly, pp.lx - G.Gs * .02, lv, Math.max(3, G.Gs * .045), s.Gl.col, g.t); }
      drawGlass(c, G.gl.x, G.gl.y, G.Gs, s.Gl, g.t);
      drawPitcher(c, px, py, G.P, s.pit.juice + s.pit.water, mixHex(lemCol(s.pit), '#fffbe0', .35), { tilt: th, t: g.t });
      for (const f of s.fly) { const u = ease(clamp(f.t, 0, 1)), x = lerp(f.x0, G.gl.x, u), y = lerp(f.y0, G.floor - G.Gs * .8, u) - Math.sin(u * Math.PI) * G.Gs * .35; drawIce(c, x, y, G.Gs * .13 * f.k, f.rot + u * 3); }
      if (!s.fin && (!s.touched || g.idle > 4)) { if (s.phase === 'ice' && !s.fly.length) { const it = g.tray[0]; if (it) ghost(g, c, [[it.hx, it.hy], [G.gl.x, G.floor - G.Gs * .7]], Math.max(14, G.Gs * .07), 1.6); } else if (s.phase === 'pour' && !s.go) pointAt(g, c, G.pit.x, G.floor - G.P * .7, Math.max(16, G.P * .09)); }
    },
    want: (g, s) => s.phase === 'ice' ? ['lm-ice'] : [],
    auto(g, s) { if (s.fly.length) return { wait: 250 }; if (s.phase === 'ice') { const it = g.tray[0]; return it && !it.used ? { tap: [it.x, it.y], wait: 600 } : { wait: 300 }; } if (s.phase === 'pour' && !s.go) { const G = GLH.geo(g); return { tap: [G.pit.x, G.floor - G.P * .5], wait: 500 }; } return { wait: 300 }; },
    hint: (g, s) => s.phase === 'ice' ? 'lm-ice' : 'lm-pour',
    tip: (g, s) => s.phase === 'ice' ? 'lm-ice' : s.go ? 'HAPPY' : 'lm-pitcher-i'
  };
  ING['lm-pitcher-i'] = (c, s) => drawPitcher(c, 0, s * .45, s * .9, .65, LEMONADE, {});

  // ---- 7. Make it pretty: a straw (any colour; touch another to swap), a lemon slice on the rim, a mint leaf if she likes.
  const GAR = H['lm-garnish'] = {
    geo(g) { const Gs = Math.min(g.SH * .6, g.w * .55, g.U * .66); return { Gs, x: g.bx, y: Math.min(g.y1 - g.SH * .04, g.w < g.SH ? bubTop(g) - 6 : 1e9) }; },
    enter(g, s) { const Fr = FR(g); Fr.glass = Fr.glass || { level: .8, ice: [{ x: -.6, rot: .3, k: 1 }, { x: .5, rot: -.4, k: .95 }], col: LEMONADE }; Fr.glass.level = Math.max(Fr.glass.level, .6); s.Gl = Fr.glass; g.setTray(['lm-straw-pink', 'lm-straw-blue', 'lm-straw-green', 'lm-slice', 'fr-mint'].map(id => ({ id }))); },
    drop(g, s, it, x, y, tap) {
      if (s.fin) return false; const G = GAR.geo(g), Gl = s.Gl; if (!tap && D(x, y, G.x, G.y - G.Gs * .6) > G.Gs * .85) return false;
      if (STRAW[it.id]) { if (Gl.straw === STRAW[it.id]) return false; Gl.straw = STRAW[it.id]; Gl.strawIn = 0; sfx.whoosh(); }
      else if (it.id === 'lm-slice') { if (Gl.slice) return false; Gl.slice = 1; Gl.sliceIn = 0; it.used = true; sfx.pop(); }
      else { if (Gl.mint) return false; Gl.mint = 1; Gl.mintIn = 0; it.used = true; sfx.pop(); }
      if (Gl.straw && Gl.slice && !s.canDone) { s.canDone = true; sfx.plink(4); }
      if (Gl.straw && Gl.slice && Gl.mint) g.finish(1.5);
      return true;
    },
    update(g, s, dt) { const Gl = s.Gl; for (const k of ['strawIn', 'sliceIn', 'mintIn']) if (Gl[k] != null && Gl[k] < 1) { Gl[k] = Math.min(1, Gl[k] + dt * 2.2); if (Gl[k] >= 1) { sfx.pat(); const G = GAR.geo(g); g.fx.burst(G.x + (k === 'sliceIn' ? G.Gs * .28 : 0), G.y - G.Gs * (k === 'mintIn' ? .75 : 1), 8, { colors: ['#ffffff', '#ffe066', '#7ed957'], speed: 130, g: 150, life: .6, size: 5, shape: 'star' }); } } },
    draw(g, s, c) { const G = GAR.geo(g); drawGlass(c, G.x, G.y, G.Gs, s.Gl, g.t); if (!s.fin && (!s.touched || g.idle > 4)) { const w = GAR.want(g, s), it = g.tray.find(i => !i.used && w.includes(i.id)); if (it) ghost(g, c, [[it.hx, it.hy], [G.x, G.y - G.Gs * .9]], Math.max(14, G.Gs * .06), 1.6); } },
    want(g, s) { const Gl = s.Gl; return !Gl.straw ? Object.keys(STRAW) : !Gl.slice ? ['lm-slice'] : !Gl.mint ? ['fr-mint'] : []; },
    auto(g, s) { const w = GAR.want(g, s); if (!w.length) return { wait: 300 }; const it = g.tray.find(i => !i.used && w.includes(i.id)); return it ? { tap: [it.x, it.y], wait: 700 } : { wait: 300 }; },
    hint: () => 'lm-garnish',
    tip: (g, s) => GAR.want(g, s)[0] || 'HAPPY'
  };

  // ---- 8. Drink it: each touch is a sip through the straw (slurp!) and the lemonade goes down; when the glass is empty, touch the
  // pitcher for another glass (it comes back full for a photo).
  const SIP = H['lm-sip'] = {
    camera: true,
    geo: g => GAR.geo(g),
    enter(g, s) { const Fr = FR(g); Fr.glass = Fr.glass || { level: .8, ice: [{ x: -.6, rot: .3, k: 1 }, { x: .5, rot: -.4, k: .95 }], col: LEMONADE }; s.Gl = Fr.glass; if (s.Gl.level < .1) s.Gl.level = .8; if (!s.Gl.straw) { s.Gl.straw = STRAW['lm-straw-pink']; s.Gl.strawIn = 1; } s.n = 0; s.N = 6; s.per = s.Gl.level / s.N; s.sip = null; s.empty = false; s.refill = null; s.moreT = null; },
    btn(g) { const r = g.uiR * .62; return { x: g.w - r - 18, y: clamp(g.by - g.SH * .12, g.y0 + r + 8, g.y1 - r * 3.2), r }; },
    down(g, s, p) {
      if (s.refill) return; const G = SIP.geo(g), onGlass = D(p.x, p.y, G.x, G.y - G.Gs * .6) < G.Gs * .9;
      if (s.empty) { const b = SIP.btn(g); if (D(p.x, p.y, b.x, b.y) < b.r * 1.35 || onGlass) { s.refill = { t: 0 }; s.moreT = null; sfx.whoosh(); } return; }
      if (!onGlass || (s.sip && s.sip.t < .5)) return; s.sip = { t: 0, from: s.Gl.level, to: Math.max(0, s.Gl.level - s.per) }; if (s.to < .02) s.sip.to = 0;
    },
    update(g, s, dt) {
      const Gl = s.Gl;
      if (s.sip) {
        const S = s.sip, t0 = S.t; S.t += dt; const u = S.t; if (S.to < .015) S.to = 0;
        Gl.sip = u < .18 ? u / .18 : u < .5 ? 1 : Math.max(0, 1 - (u - .5) / .25);
        if (t0 < .1 && u >= .1) (S.to <= 0 ? SND.gurgle : SND.slurp)();
        Gl.level = lerp(S.from, S.to, ease(clamp((u - .12) / .4, 0, 1)));
        if (u >= .8) { s.sip = null; s.n++; Gl.sip = 0; if (Gl.level <= .002) { Gl.level = 0; s.empty = true; s.moreT = 3; if (!g.finishedAll) g.recipeDone(); } else if (s.n % 2 === 0) voice.say('cook-yum'); }
      }
      if (s.moreT != null) { s.moreT -= dt; if (s.moreT <= 0) { s.moreT = null; voice.say('lm-more'); } }
      if (s.refill) { s.refill.t += dt; const u = s.refill.t; if (u > .6 && u < 1.7) { Gl.level = Math.min(.8, Gl.level + dt * .75); if (!s.snd) s.snd = stream(); s.snd.set(.7); } else quiet(s); if (u >= 2.1) { s.refill = null; s.empty = false; s.n = 0; Gl.level = .8; s.per = .8 / s.N; SND.clink(1); } }
      const T = iceTargets(Gl); (Gl.ice || []).forEach((q, i) => { if (q.cy == null) { q.cx = T[i].x; q.cy = T[i].y; } q.cx = lerp(q.cx, T[i].x, Math.min(1, dt * 6)); q.cy = lerp(q.cy, T[i].y, Math.min(1, dt * (q.cy < T[i].y ? 9 : 4))); if (Gl.level <= 0 && Math.abs(q.cy - T[i].y) < .004 && !q.down) { q.down = true; SND.clink(i); } if (Gl.level > 0) q.down = false; });
    },
    draw(g, s, c) {
      const G = SIP.geo(g), Gl = s.Gl;
      if (s.refill) { const u = s.refill.t, e = ease(clamp(u / .6, 0, 1)) * (1 - ease(clamp((u - 1.7) / .4, 0, 1))), ty = G.y - G.Gs - G.Gs * .06, bh = clamp(g.h * .09, 44, 66), P = Math.max(G.Gs * .3, Math.min(G.Gs * .6, (ty - g.y0 - bh * 1.25) / .5)), th = 1.15 * e, tx = G.x - G.Gs * .06, r = rotP(.42 * P, -.99 * P, 1.15), ox = tx - r[0], oy = ty - r[1], x = lerp(-P * .7, ox, e), y = lerp(oy + P * .3, oy, e); if (u > .6 && u < 1.7) drawStream(c, tx, ty, tx - G.Gs * .02, G.y + (Gl.level > .003 ? levelOf(GLS, 0, Gl.level) * G.Gs : -G.Gs * .08), Math.max(3, G.Gs * .045), Gl.col || LEMONADE, g.t); drawGlass(c, G.x, G.y, G.Gs, Gl, g.t); drawPitcher(c, x, y, P, .55, Gl.col || LEMONADE, { tilt: th }); return; }
      const bob = s.sip ? Math.sin(s.sip.t * 20) * 1.5 : 0;
      drawGlass(c, G.x, G.y + bob, G.Gs, Gl, g.t);
      if (s.empty) { const b = SIP.btn(g), k = 1 + Math.sin(g.t * 5) * .06; c.save(); c.translate(b.x, b.y); c.scale(k, k); ell(c, 2, 5, b.r, b.r, 'rgba(80,40,20,.22)'); circ(c, 0, 0, b.r, '#ffffff'); c.strokeStyle = CAT_COL[CAT].main; c.lineWidth = Math.max(3, b.r * .1); c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.stroke(); drawPitcher(c, -b.r * .05, b.r * .55, b.r * 1.1, .6, Gl.col || LEMONADE, {}); c.restore(); if (!hush() && g.idle > 2) pointAt(g, c, b.x, b.y - b.r * .3, b.r * .5); }
      else if (!s.n && !s.sip) pointAt(g, c, G.x + G.Gs * .25, G.y - G.Gs * 1.15, Math.max(16, G.Gs * .07));
    },
    auto(g, s) { if (s.sip || s.refill || s.empty) return { wait: 300 }; const G = SIP.geo(g); return { tap: [G.x, G.y - G.Gs * .5], wait: 900 }; },
    hint: (g, s) => s.empty ? 'lm-more' : 'lm-sip',
    tip: () => 'HAPPY'
  };


  /* ---------------------------------------------------------------- the step pictures (step strip and the helper's thought bubble) */
  const icon = (fn) => (c, s, id) => { if (id && id !== 'HAPPY' && ING[id]) { ING[id](c, s * .95); return; } fn(c, s); };
  STEP_ICON['fs-wash'] = icon((c, s) => { glassBowl(c, 0, -s * .02, s * .42, cc => { cc.save(); cc.translate(0, -s * .02); ING.strawberry(cc, s * .4); cc.restore(); }, { water: { lv: s * .03, murk: 0, rip: [] } }); for (const [x, y, r] of [[-.25, -.3, .05], [.22, -.36, .04], [.3, -.22, .03]]) circ(c, x * s, y * s, r * s, 'rgba(160,215,245,.9)'); });
  STEP_ICON['fs-peel'] = icon((c, s) => ING['fs-banana'](c, s));
  STEP_ICON['fs-cut'] = icon((c, s) => { c.save(); c.translate(-s * .12, s * .1); drawBerryHalf(c, s * .5); c.restore(); drawKidKnife(c, -s * .25, -s * .28, s * .75, .5); });
  STEP_ICON['fs-bowl'] = icon((c, s) => { c.save(); c.translate(s * .1, s * .08); drawSalad(c, SAMPLE_SALAD, s * .38, 0); glassBowl(c, 0, 0, s * .4, null); c.restore(); drawPrepBowl(c, -s * .28, -s * .22, s * .2, 'berry', 3, -.8); });
  STEP_ICON['fs-mix'] = icon((c, s) => { glassBowl(c, 0, s * .02, s * .42, cc => drawSalad(cc, SAMPLE_SALAD, s * .42, 0)); drawSpoon(c, s * .02, -s * .05, s * .55, 3.6); });
  STEP_ICON['fs-eat'] = icon((c, s) => { c.save(); c.translate(-s * .04, -s * .2); drawBerryHalf(c, s * .32); c.restore(); drawFork(c, 0, s * .12, s * .7, Math.PI + .3); });
  STEP_ICON['lm-roll'] = icon((c, s) => { drawLemon(c, 0, s * .1, s * .7, 0, 0, .5); drawFlatHand(c, s * .05, -s * .08, s * .55, 0, 1); });
  STEP_ICON['lm-cut'] = icon((c, s) => { drawLemonFace(c, -s * .2, 0, s * .42, {}); drawLemonFace(c, s * .22, s * .04, s * .42, {}); });
  STEP_ICON['lm-squeeze'] = icon((c, s) => drawJuicer(c, 0, s * .2, s * .85, { dome: { squash: .3, twist: 0 }, seeds: 2 }));
  STEP_ICON['lm-pitcher'] = icon((c, s) => drawPitcher(c, 0, s * .44, s * .85, .6, '#fff4b0', { line: .7 }));
  STEP_ICON['lm-sugar'] = icon((c, s) => { c.save(); c.translate(-s * .02, 0); drawMeasure(c, 'tbsp', s * .85, 1, '#ffffff', -.5); c.restore(); for (let i = 0; i < 5; i++) circ(c, (-.3 + i * .08) * s, (.22 + (i % 2) * .06) * s, s * .03, '#ffffff'); });
  STEP_ICON['lm-glass'] = icon((c, s) => drawGlass(c, 0, s * .46, s * .85, { level: .55, ice: [{ x: -.5, rot: .3, k: 1 }, { x: .4, rot: -.4, k: 1 }], col: LEMONADE }));
  STEP_ICON['lm-garnish'] = icon((c, s) => drawGlass(c, -s * .05, s * .46, s * .78, { level: .7, straw: '#ff6b9d', slice: 1, col: LEMONADE }));
  STEP_ICON['lm-sip'] = icon((c, s) => { drawGlass(c, -s * .08, s * .46, s * .78, { level: .4, straw: '#4fa8f0', sip: 1, col: LEMONADE }); c.fillStyle = '#ff6b9d'; c.save(); c.translate(s * .28, -s * .28); c.scale(s * .012, s * .012); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-14, -2, -8, -14, 0, -6); c.bezierCurveTo(8, -14, 14, -2, 0, 8); c.fill(); c.restore(); });


  /* ---------------------------------------------------------------- finished foods (menu cards, the intro card, the tab) */
  EXTRA.fsalad = { draw(c, p, R) { glassBowl(c, 0, 0, R * .95, cc => drawSalad(cc, p.salad || SAMPLE_SALAD, R * .95, 0)); }, height: (p, R) => R * 1.3, box: () => ({ hw: 1.0, a: .62, b: .78 }), touch: () => ({ r: 1 }) };
  EXTRA.lemonade = { draw(c, p, R) { drawGlass(c, 0, 0, R * 1.5, p.glass || { level: .8, ice: [{ x: -.6, rot: .3, k: 1 }, { x: .5, rot: -.4, k: .95 }, { x: -.1, rot: .9, k: .9 }], straw: '#ff6b9d', slice: 1, mint: 1, col: LEMONADE }); }, height: (p, R) => R * 1.6, box: () => ({ hw: .62, a: 1.9, b: .08 }), touch: () => ({ r: 1 }) };


  /* ---------------------------------------------------------------- the tab, the recipes and what is said */
  let CAT = CATS.findIndex(c => c.id === 'fresh');
  if (CAT < 0) { CATS.push({ id: 'fresh', name: 'Fruit & drinks', icon: 'fruitsalad' }); CAT = CATS.length - 1; }
  CAT_COL[CAT] = { main: '#56b85a', dark: '#2e8a3c', light: '#e2f6d6' };
  RECIPES.push(
    { id: 'fruitsalad', cat: CAT, name: 'Fruit salad', ptype: 'fsalad', steps: [{ k: 'fs-wash' }, { k: 'fs-peel' }, { k: 'fs-cut' }, { k: 'fs-bowl' }, { k: 'fs-mix' }, { k: 'fs-eat' }], sample: { type: 'fsalad' } },
    { id: 'lemonade', cat: CAT, name: 'Lemonade', ptype: 'lemonade', steps: [{ k: 'lm-roll' }, { k: 'lm-cut' }, { k: 'lm-squeeze' }, { k: 'lm-pitcher' }, { k: 'lm-sugar' }, { k: 'lm-glass' }, { k: 'lm-garnish' }, { k: 'lm-sip' }], sample: { type: 'lemonade' } }
  );
  const SAID = {
    'fs-wash': 'Wash the fruit! Rub it in the water until the dirt comes off.',
    'fs-peel': 'Peel the banana! Pull each strip of peel down.',
    'fs-cut': 'Slice the banana! Move the knife along the dotted line.',
    'fs-berry': 'Now cut each strawberry in half!',
    'fs-grape': 'Grapes get cut into four little pieces. Little pieces are safe to swallow!',
    'fs-bowl': 'Put all the fruit in the big bowl!',
    'fs-extra': 'Add a little honey or orange juice, or touch the green check!',
    'fs-mix': 'Mix gently! Slowly round and round.',
    'fs-gently': 'Gently, gently! Slow and careful.',
    'fs-eat': 'Touch the fruit to take a bite with the fork!',
    'fs-more': 'All gone! Touch the bowl for some more.',
    'lm-roll': 'Press the lemon with a flat hand and roll it back and forth! Rolling makes more juice.',
    'lm-cut': 'Cut the lemon in half! Move the knife along the dotted line.',
    'lm-squeeze': 'Put a lemon half on the juicer, then press and twist!',
    'lm-juice': 'Pour the juice into the pitcher!',
    'lm-water': 'Now add water, right up to the line!',
    'lm-sugar': 'Add the sugar, one spoon at a time!',
    'lm-stir': 'Stir until the sugar disappears!',
    'lm-ice': 'Drop some ice in the glass!',
    'lm-pour': 'Pour the lemonade into the glass!',
    'lm-garnish': 'Add a straw and a lemon slice!',
    'lm-sip': 'Touch the glass to take a sip!',
    'lm-more': 'All gone! Touch the pitcher to pour some more.'
  };
  voice.addLines({
    ...SAID,
    ['cookc/' + CAT]: 'Fruit and drinks!', 'cookr/fruitsalad': 'Fruit salad!', 'cookr/lemonade': 'Lemonade!',
    'fs-clean': 'Squeaky clean!', 'lm-seeds': 'The juicer catches the seeds!', 'lm-line': 'Right up to the line!',
    'cook/fs-pbanana': 'Banana!', 'cook/fs-pberry': 'Strawberries!', 'cook/fs-pgrape': 'Grapes!', 'cook/fr-honey': 'Honey!', 'cook/orange': 'Orange!', 'cook/fr-mint': 'Mint!',
    'cook/lm-half': 'Half a lemon!', 'cook/lm-ice': 'Ice!', 'cook/lm-slice': 'A lemon slice!', 'cook/lm-straw-pink': 'A pink straw!', 'cook/lm-straw-blue': 'A blue straw!', 'cook/lm-straw-green': 'A green straw!'
  }, { instruct: Object.keys(SAID) });
})();
