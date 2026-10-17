/* Hair: a head of hair made of real strands, for the Style Studio's hair salon.
   Hair is a list of strands. Every strand has a root on the scalp and a path made from a few numbers (heading, length, curl,
   gravity, how messy and how wet it is), so it can be trimmed shorter with scissors, brushed smooth, sprayed wet, dried and so on,
   and the picture follows. Strands that belong together form a lock and fray apart while they are messy.
   Sizes are in head radii (R = 1) from the middle of the head, y down (the face is below the middle; the top of the head is y = -1).
   SPG.people draws saved hair with the same code (hair = 'cut:<id>'). */
(() => {
  const SPG = window.SPG, H = SPG.hair = {}, TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const DS = .085;   // one step along a strand
  const RAINBOW = ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0'];

  function rgb(col) {
    const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(col); if (m) return [+m[1], +m[2], +m[3]];
    if (/^#[0-9a-f]{3}$/i.test(col)) col = '#' + col.slice(1).split('').map(q => q + q).join('');
    const n = parseInt((col || '#4a2f24').slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
  const shadeA = (c, amt) => amt < 0 ? c.map(v => v * (1 + amt)) : c.map(v => v + (255 - v) * amt);
  const col3 = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

  /* ------------------------------------------------------------------ one strand's path */
  // The path is made fresh from the strand's numbers; it is kept until something about the strand changes (s.v).
  // a knot makes the strand kink and loop for a stretch; it straightens out as the knot is brushed away
  function kink(s, run) {
    if (!s.kn) return 0;
    let k = 0; for (const n of s.kn) { const d = (run - n.t * s.L) / .1; if (d > -2.5 && d < 2.5) k += n.h * 1.1 * Math.sin(d * 7) * Math.exp(-d * d); }
    return k;
  }
  function path(s, sway) {
    if (s._p && s._v === s.v && !sway) return s._p;
    const pts = [[s.x, s.y]];
    let x = s.x, y = s.y, a = s.a + (s.da || 0) * (s.ms || 0) * (1 - .4 * (s.w || 0));
    s._h0 = 0;
    if (s.vx != null) {   // tied up: the root is gathered to a tie point first, then the hair hangs from there
      const mx = (x + s.vx) / 2, my = (y + s.vy) / 2 - .05 - Math.abs(s.vx - x) * .08;
      for (let k = 1; k <= 5; k++) { const t = k / 5, u = 1 - t; pts.push([u * u * x + 2 * u * t * mx + t * t * s.vx, u * u * y + 2 * u * t * my + t * t * s.vy]); }
      x = s.vx; y = s.vy; s._h0 = pts.length - 1;
    }
    const wet = s.w || 0, grav = clamp(s.g + wet * .22, -.12, .7), cur = s.cur * (1 - .65 * wet), ms = (s.ms || 0) * (1 - .4 * wet), L = s.fly ? s.L * clamp(s.am, 0, 1) : s.L;
    let run = 0;
    while (run < L - 1e-6) {
      const step = Math.min(DS, L - run); run += step;
      a += (PI / 2 - a) * grav * (step / DS) * (.25 + run * .55);   // gravity bends the hair down the further it goes
      const ang = a + cur * Math.sin(s.cf * run + s.ph) + ms * s.jh * .5 * (.55 * Math.sin(run * s.nf + s.nph) + .45 * Math.sin(run * s.nf * 2.3 + s.nph * 1.7)) + kink(s, run) + (sway ? sway.a * run * Math.sin(sway.t * 7 + s.nph + run * 3) : 0);
      x += Math.cos(ang) * step; y += Math.sin(ang) * step; pts.push([x, y]);
    }
    s._p = pts; s._v = s.v; return pts;
  }
  H.path = path;
  const hang = (s, pts) => s._h0 | 0;   // index in the path where the hanging part starts

  /* ------------------------------------------------------------------ making a head of hair */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const head = (th, r) => [Math.cos(th) * r, -.12 + Math.sin(th) * r * 1.02];   // a point on the scalp, by angle (PI = left ear, 1.5 PI = crown, 2 PI = right ear) and distance
  const sideHead = th => th < PI * 1.5 ? th : th - TAU;   // which way the hair first heads: out from the crown, on the left or right

  function expand(out, lk, n, rn, mess) {
    for (let j = 0; j < n; j++) {
      const s = {
        x: lk.x + (rn() - .5) * .08, y: lk.y + (rn() - .5) * .05, a: lk.a + (rn() - .5) * .08, L: Math.max(.12, lk.L * (1 + (rn() - .5) * lk.rag) + (rn() - .5) * lk.rag * .25),
        cur: lk.cur * (.8 + rn() * .4), cf: lk.cf * (.9 + rn() * .2), ph: lk.ph + (rn() - .5) * .9, g: lk.g, ms: clamp(mess * (.7 + rn() * .5), 0, 1), w: 0, f: lk.f ? 1 : 0, z: lk.z || 0,
        sh: (rn() - .5) * 2, wd: .12 + rn() * .04, jh: .5 + rn() * 1.0, sd: Math.floor(rn() * 9999), nf: 2.5 + rn() * 3, da: (rn() - .5) * 1.1, nph: rn() * TAU, v: 1
      };
      if (lk.vx != null) { s.vx = lk.vx + (rn() - .5) * .16; s.vy = lk.vy + (rn() - .5) * .1; }
      out.push(s);
    }
  }
  const HUG = .8;   // how closely hair lies along the curve of the head before it falls
const hugged = th => { const a = sideHead(th); return a <= PI / 2 ? Math.min(PI / 2, a + HUG * PI / 2 * Math.abs(Math.cos(a)) ** .2) : Math.max(PI / 2, a - HUG * PI / 2 * Math.abs(Math.cos(a)) ** .2); };
const LK = (th, r, o) => { const p = head(th, r), side = hugged(th); return Object.assign({ x: p[0], y: p[1], a: side, L: 1, rag: .3, cur: .08, cf: 8, ph: Math.random() * TAU, g: .1, f: 1 }, o); };
  const rpick = (rn, a, b) => a + (b - a) * rn();

  // each kind is a recipe for locks; they all look like hair that needs some work
  const KINDS = {
    longTangle(rn) {
      const L = [];
      for (let i = 0; i < 22; i++) { const th = PI * (1.06 + .88 * i / 21); L.push(LK(th, rpick(rn, .9, 1.02), { L: rpick(rn, 1.6, 2.7), rag: .6, cur: .1, cf: 8, g: .12 })); }
      for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) L.push(LK(sd < 0 ? PI + (i - 1) * .1 : TAU - (i - 1) * .1, 1.02, { L: rpick(rn, 1.9, 2.8), rag: .5, g: .13, f: 0 }));
      for (let i = 0; i < 14; i++) L.push(LK(PI * 1.5, 0, { x: -.95 + i * .146, y: -.15, a: PI / 2, L: rpick(rn, 1.9, 2.8), rag: .5, g: .5, cur: .06, f: 0 }));
      return { locks: L, fringe: { n: 6, len: [.3, .8], span: .62, y: -.6, part: .12 }, mess: .95, knots: 5, fly: 18 };
    },
    longWavy(rn) {
      const L = [];
      for (let i = 0; i < 22; i++) { const th = PI * (1.06 + .88 * i / 21); L.push(LK(th, rpick(rn, .9, 1.02), { L: rpick(rn, 1.7, 2.5), rag: .5, cur: .34, cf: 6, g: .1 })); }
      for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) L.push(LK(sd < 0 ? PI + (i - 1) * .1 : TAU - (i - 1) * .1, 1.02, { L: rpick(rn, 1.9, 2.6), rag: .5, g: .11, cur: .34, cf: 6, f: 0 }));
      for (let i = 0; i < 14; i++) L.push(LK(PI * 1.5, 0, { x: -.95 + i * .146, y: -.15, a: PI / 2, L: rpick(rn, 1.9, 2.6), rag: .5, g: .5, cur: .2, cf: 6, f: 0 }));
      return { locks: L, fringe: { n: 5, len: [.3, .75], span: .6, y: -.6, part: .1 }, mess: .75, knots: 3, fly: 14 };
    },
    shaggyBob(rn) {
      const L = [];
      for (let i = 0; i < 22; i++) { const th = PI * (1.06 + .88 * i / 21); L.push(LK(th, rpick(rn, .9, 1.02), { L: rpick(rn, .8, 1.5), rag: .55, cur: .08, cf: 8, g: .2 })); }
      for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) L.push(LK(sd < 0 ? PI + (i - 1) * .1 : TAU - (i - 1) * .1, 1.02, { L: sd < 0 ? rpick(rn, 1.2, 1.7) : rpick(rn, .7, 1.1), rag: .4, g: .2, f: 0 }));   // one side longer than the other
      for (let i = 0; i < 14; i++) L.push(LK(PI * 1.5, 0, { x: -.95 + i * .146, y: -.15, a: PI / 2, L: rpick(rn, .8, 1.3), rag: .4, g: .5, cur: .05, f: 0 }));
      return { locks: L, fringe: { n: 7, len: [.3, .8], span: .7, y: -.62, part: .05, slant: true }, mess: .85, knots: 3, fly: 14 };
    },
    wildCurls(rn) {
      const L = [];
      for (let i = 0; i < 26; i++) { const th = PI * (1.02 + .96 * i / 25); L.push(LK(th, rpick(rn, .85, 1.03), { L: rpick(rn, 1.1, 1.8), rag: .5, cur: .55, cf: 15, g: .035 })); }
      for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) L.push(LK(sd < 0 ? PI + (i - 1) * .1 : TAU - (i - 1) * .1, 1.02, { L: rpick(rn, 1.2, 1.9), rag: .4, g: .06, cur: .5, cf: 15, f: 0 }));
      for (let i = 0; i < 12; i++) L.push(LK(PI * 1.5, 0, { x: -.9 + i * .165, y: -.15, a: PI / 2, L: rpick(rn, 1.2, 1.8), rag: .4, g: .3, cur: .45, cf: 14, f: 0 }));
      return { locks: L, fringe: { n: 5, len: [.4, .8], span: .6, y: -.62, part: .15, cur: .5 }, mess: .9, knots: 4, fly: 24 };
    },
    shortCurly(rn) {
      const L = [];
      for (let i = 0; i < 28; i++) { const th = PI * (1.0 + 1.0 * i / 27); L.push(LK(th, rpick(rn, .85, 1.03), { L: rpick(rn, .55, 1.05), rag: .5, cur: .55, cf: 18, g: .03 })); }
      return { locks: L, fringe: { n: 5, len: [.3, .7], span: .6, y: -.62, part: .2, cur: .5 }, mess: .9, knots: 0, fly: 22 };
    },
    messyPony(rn) {
      const L = [], tie = [.95, -1.02];
      for (let i = 0; i < 26; i++) { const th = PI * (1.1 + .8 * i / 25); L.push(LK(th, rpick(rn, .8, 1.0), { L: rpick(rn, 1.5, 2.2), rag: .5, cur: .12, cf: 7, g: .1, vx: tie[0], vy: tie[1], a: PI / 2 - .55 })); }
      for (let i = 0; i < 5; i++) L.push(LK(PI * (1.04 + (i % 2 ? .92 : 0) + i * .01), 1.0, { L: rpick(rn, .6, 1.2), rag: .5, g: .2 }));   // bits that escaped the band
      return { locks: L, fringe: { n: 7, len: [.3, .8], span: .7, y: -.62, part: .1 }, mess: .9, knots: 3, fly: 18 };
    },
    unevenPigs(rn) {
      const L = [], tie = [[-1.1, -.12], [1.1, -.12]];
      for (let i = 0; i < 26; i++) { const th = PI * (1.06 + .88 * i / 25), left = th < PI * 1.5, t = tie[left ? 0 : 1]; L.push(LK(th, rpick(rn, .85, 1.02), { L: left ? rpick(rn, 1.5, 2.2) : rpick(rn, .9, 1.3), rag: .5, cur: .1, cf: 8, g: .14, vx: t[0], vy: t[1], a: PI / 2 + (left ? -.2 : .2) })); }
      return { locks: L, fringe: { n: 6, len: [.3, .8], span: .55, y: -.6, part: .2 }, mess: .85, knots: 3, fly: 16 };
    },
    spikyMop(rn) {
      const L = [];
      for (let i = 0; i < 36; i++) { const th = PI * (1.0 + 1.0 * i / 35); L.push(LK(th, rpick(rn, .85, 1.05), { L: rpick(rn, .55, 1.1), rag: .6, cur: .06, cf: 8, g: -.03, a: sideHead(th) + (rn() - .5) * .9 })); }
      return { locks: L, fringe: { n: 5, len: [.25, .6], span: .6, y: -.62, part: .1 }, mess: .95, knots: 0, fly: 14 };
    },
    choppyFringe(rn) {
      const L = [];
      for (let i = 0; i < 26; i++) { const th = PI * (1.04 + .92 * i / 25); L.push(LK(th, rpick(rn, .9, 1.03), { L: rpick(rn, .6, 1.0), rag: .5, cur: .06, cf: 8, g: .14 })); }
      return { locks: L, fringe: { n: 9, len: [.5, 1.0], span: .8, y: -.66, part: .03 }, mess: .8, knots: 0, fly: 12 };
    },
    bedhead(rn) {
      const L = [];
      for (let i = 0; i < 28; i++) { const th = PI * (1.02 + .96 * i / 27); L.push(LK(th, rpick(rn, .85, 1.03), { L: rpick(rn, .9, 1.7), rag: .6, cur: .2, cf: 6, g: .05, a: sideHead(th) + (rn() - .5) * 1.0 })); }
      for (let i = 0; i < 5; i++) L.push(LK(PI * 1.5, 0, { x: .1 + i * .06, y: -1.1, a: -PI / 2 + (rn() - .5) * .8, L: rpick(rn, .8, 1.2), rag: .4, g: -.02 }));   // a cowlick
      return { locks: L, fringe: { n: 5, len: [.3, .9], span: .65, y: -.62, part: .15 }, mess: 1, knots: 2, fly: 20 };
    }
  };
  H.KINDS = Object.keys(KINDS);

  // a head of hair of the given kind (or a random one), freshly messy
  H.generate = (kind, seed) => {
    seed = seed == null ? Math.floor(Math.random() * 1e9) : seed;
    const rn = rng(seed), k = KINDS[kind] ? kind : H.KINDS[Math.floor(rn() * H.KINDS.length)], r = KINDS[k](rn), strands = [], n = 3;
    for (const lk of r.locks) expand(strands, lk, n, rn, r.mess);
    // the fringe: locks hanging over the forehead, in uneven lengths, parted a little off centre
    const fr = r.fringe;
    for (let i = 0; i < fr.n; i++) {
      const u = fr.n > 1 ? i / (fr.n - 1) : .5, x = (u - .5) * 2 * fr.span, len = fr.slant ? fr.len[0] + (fr.len[1] - fr.len[0]) * u + (rn() - .5) * .15 : rpick(rn, fr.len[0], fr.len[1]);
      const lk = { x, y: fr.y + (rn() - .5) * .05 - Math.abs(x) * .1, a: PI / 2 + (x - fr.part) * .55, L: len, rag: .35, cur: fr.cur || .06, cf: 9, ph: rn() * TAU, g: .55, f: 1, z: 2 };
      expand(strands, lk, 3, rn, r.mess);
    }
    for (const s of strands) s.f = s.f ? 1 : 0;
    strands.sort((a, b) => (a.f - b.f) || ((a.z || 0) - (b.z || 0)));
    // knots in the longer strands
    const long = strands.filter(s => s.L > .7); for (let i = 0; i < r.knots && long.length; i++) { const s = long.splice(Math.floor(rn() * long.length), 1)[0]; s.kn = [{ t: .45 + rn() * .4, h: 1 }]; }
    // flyaways: thin stray hairs that stand out from the head
    for (let i = 0; i < r.fly; i++) {
      const th = PI * (1.0 + rn()), p = head(th, rpick(rn, .75, 1.02)), a0 = sideHead(th) + (rn() - .5) * 1.4;
      strands.push({ x: p[0], y: p[1], a: a0, L: rpick(rn, .35, .85), cur: .5, cf: 9, ph: rn() * TAU, g: .02, ms: .9, w: 0, f: 1, z: 3, sh: 1, wd: .022, jh: 1.2, sd: Math.floor(rn() * 9999), nf: 5 + rn() * 5, nph: rn() * TAU, v: 1, fly: 1, am: 1 });
    }
    return { kind: k, seed, strands, cuts: 0, brushed: 0, v: 1 };
  };

  /* ------------------------------------------------------------------ drawing */
  function smooth(c, pts, i0, i1) {
    c.beginPath(); c.moveTo(pts[i0][0], pts[i0][1]);
    for (let i = i0 + 1; i < i1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    c.lineTo(pts[i1][0], pts[i1][1]);
  }
  function capPath(c) {
    c.beginPath(); c.moveTo(-1.05, .2); c.bezierCurveTo(-1.28, -.5, -.9, -1.32, 0, -1.3); c.bezierCurveTo(.9, -1.32, 1.28, -.5, 1.05, .2);
    c.lineTo(.95, -.02); c.quadraticCurveTo(.55, -.62, 0, -.64); c.quadraticCurveTo(-.55, -.62, -.95, -.02); c.closePath();
  }
  function baseOf(col, s) {
    if (col === 'rainbow') return rgb(RAINBOW[clamp(Math.floor((s ? (s.x + 1.3) / 2.6 : .5) * RAINBOW.length), 0, RAINBOW.length - 1)]);
    return rgb(col);
  }
  const WETC = [52, 78, 112];
  function drawStrand(c, s, base, o) {
    const pts = path(s, o.sway); const n = pts.length; if (n < 2) return;
    const wet = s.w || 0, b = baseOf(base, s), root = mix(shadeA(b, -.14 + s.sh * .03), WETC, wet * .45), mid = mix(shadeA(b, s.sh * .07 - .02), WETC, wet * .4), tip = mix(shadeA(b, .06 + s.sh * .05), WETC, wet * .3);
    const w0 = s.wd * (1 + wet * .35) * (s.fly ? 1 : 1), i1 = Math.max(1, Math.floor(n * .25)), i2 = Math.max(i1 + 1, Math.floor(n * .6));
    c.lineCap = 'round';
    if (s.fly) { c.globalAlpha = .85 * clamp(s.am, 0, 1); c.strokeStyle = tip; c.lineWidth = w0; smooth(c, pts, 0, n - 1); c.stroke(); c.globalAlpha = 1; return; }
    c.strokeStyle = root; c.lineWidth = w0; smooth(c, pts, 0, Math.min(i1 + 1, n - 1)); c.stroke();
    if (i1 < n - 1) { c.strokeStyle = mid; c.lineWidth = w0 * .96; smooth(c, pts, i1, Math.min(i2 + 1, n - 1)); c.stroke(); }
    if (i2 < n - 1) { c.strokeStyle = tip; c.lineWidth = s.cut ? w0 * .96 : w0 * .8; if (s.cut) c.lineCap = 'butt'; smooth(c, pts, i2, n - 1); c.stroke(); c.lineCap = 'round'; }
    if (!s.cut && n > 4) { c.strokeStyle = tip; c.lineWidth = w0 * .5; smooth(c, pts, Math.max(i2, n - 3), n - 1); c.stroke(); }   // a fine natural tip
    if (s.sh > .4 || wet > .5) {   // a thin highlight along the top of some strands, and a sheen on wet hair
      c.globalAlpha = .32 + wet * .35; c.strokeStyle = mix(shadeA(b, .45), [255, 255, 255], wet * .5); c.lineWidth = w0 * .28; smooth(c, pts, Math.min(1, n - 2), Math.min(Math.floor(n * .7), n - 1)); c.stroke(); c.globalAlpha = 1;
    }
    if (s.kn) for (const k of s.kn) drawKnot(c, s, pts, k, base);
  }
  function drawKnot(c, s, pts, k, base) {
    const i = clamp(Math.round(k.t * (pts.length - 1)), 1, pts.length - 1), p = pts[i], b = baseOf(base, s), a = clamp(k.h, 0, 1), r = .09 * (.55 + .45 * a);
    c.save(); c.translate(p[0], p[1]); c.globalAlpha = .35 + a * .6; c.strokeStyle = col3(shadeA(b, -.3)); c.lineWidth = .02; c.lineCap = 'round';
    for (let q = 0; q < 4; q++) { const an = q * 1.4 + s.sd; c.beginPath(); c.ellipse(Math.cos(an) * r * .3, Math.sin(an) * r * .3, r, r * .55, an, 0, TAU); c.stroke(); }
    c.strokeStyle = col3(shadeA(b, .15)); c.lineWidth = .01; c.beginPath(); c.ellipse(0, 0, r * .8, r * .4, s.sd, 0, TAU); c.stroke();
    c.restore();
  }
  // layer: 'back' (behind the body), 'front' (over the face) or 'all'
  H.draw = (c, R, hair, col, o = {}) => {
    if (!hair) return;
    const layer = o.layer || 'all', base = col || '#4a2f24';
    c.save(); c.scale(R, R); c.lineJoin = c.lineCap = 'round';
    for (const s of hair.strands) {
      if (layer === 'back' ? s.f : layer === 'front' ? !s.f : false) continue;
      if (s.f && !hair._capDone && layer !== 'back') { hair._capDone = true; const b = baseOf(base); c.fillStyle = col === 'rainbow' ? (() => { const g = c.createLinearGradient(-1.2, -1, 1.2, 1); RAINBOW.forEach((k, i, a) => g.addColorStop(i / (a.length - 1), k)); return g; })() : col3(shadeA(b, -.1)); capPath(c); c.fill(); }
      drawStrand(c, s, base, o);
    }
    hair._capDone = false;
    c.restore();
  };

  /* ------------------------------------------------------------------ things done to hair */
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 > 1e-9 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }
  function segHit(a, b, c, d) {   // where segment a-b crosses c-d: the fraction along c-d, or -1
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return -1;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
  }
  const touch = s => { s.v++; };

  // scissors along a short line: every strand it crosses is cut there; the loose ends are returned (to fall away)
  H.cut = (hair, ax, ay, bx, by, minLen = .1) => {
    const pieces = [];
    for (const s of hair.strands) {
      const pts = path(s), h0 = hang(s); let run = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
        const t = segHit(pts[i], pts[i + 1], [ax, ay], [bx, by]);
        if (t >= 0 && i >= h0) {
          const px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, d = run + seg * t;
          if (d > minLen) {
            pieces.push({ pts: [[px, py]].concat(pts.slice(i + 1)), wd: s.wd, s, fly: !!s.fly });
            if (s.fly) s.am = Math.max(.05, d / s.L); else { s.L = d; s.cut = true; }
            s.kn = s.kn && s.kn.filter(k => k.t < d / Math.max(.01, run + seg + 1e-6) * 1.0);
            touch(s);
          }
          break;
        }
        if (i >= h0) run += seg;
      }
    }
    if (pieces.length) hair.cuts = (hair.cuts || 0) + 1;
    return pieces;
  };
  // a brush: smooths the strands it passes through, flattens flyaways and pulls knots out (wet hair much easier)
  H.brush = (hair, ax, ay, bx, by, rad, moved) => {
    const ev = [];
    for (const s of hair.strands) {
      const pts = path(s); let hit = false;
      for (let i = 0; i < pts.length; i += 2) if (segDist(pts[i][0], pts[i][1], ax, ay, bx, by) < rad) { hit = true; break; }
      if (!hit) continue;
      const k = moved * (1.4 + (s.w || 0) * 3.2);
      if (s.fly) { s.am -= moved * 2.6 * (1 + (s.w || 0)); if (s.am <= 0) { s.dead = true; ev.push({ t: 'fly', x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] }); } else touch(s); continue; }
      if (s.ms > 0) { s.ms = Math.max(0, s.ms - k * .9); touch(s); hair.brushed = (hair.brushed || 0) + moved; }
      if (s.kn) for (const kn of s.kn) {
        const i = clamp(Math.round(kn.t * (pts.length - 1)), 0, pts.length - 1);
        if (segDist(pts[i][0], pts[i][1], ax, ay, bx, by) < rad * 1.1) { kn.h -= k * .9; touch(s); if (kn.h <= 0) ev.push({ t: 'knot', x: pts[i][0], y: pts[i][1] }); }
      }
      if (s.kn) { const before = s.kn.length; s.kn = s.kn.filter(k2 => k2.h > 0); if (!s.kn.length) s.kn = null; if (!s.kn || s.kn.length !== before) touch(s); }
    }
    hair.strands = hair.strands.filter(s => !s.dead);
    return ev;
  };
  // spray: wets the hair near a point; dryer: dries it
  H.spray = (hair, x, y, rad, dt) => { for (const s of hair.strands) { const pts = path(s); let hit = false; for (let i = 0; i < pts.length; i += 2) if (Math.hypot(pts[i][0] - x, pts[i][1] - y) < rad) { hit = true; break; } if (hit) { s.w = Math.min(1, (s.w || 0) + dt * 1.6); touch(s); } } };
  H.dry = (hair, x, y, rad, dt) => { for (const s of hair.strands) if (s.w > 0) { const pts = path(s); let hit = false; for (let i = 0; i < pts.length; i += 2) if (Math.hypot(pts[i][0] - x, pts[i][1] - y) < rad) { hit = true; break; } if (hit) { s.w = Math.max(0, s.w - dt * 1.1); touch(s); } } };
  H.tick = (hair, dt) => { for (const s of hair.strands) if (s.w > 0) { s.w = Math.max(0, s.w - dt * .03); touch(s); } };   // wet hair dries slowly by itself
  H.wetness = hair => hair.strands.reduce((q, s) => q + (s.w || 0), 0) / Math.max(1, hair.strands.length);
  // how tidy it is, 0 (a bird's nest) to 1 (neat): messiness, knots and stray hairs
  H.neat = hair => {
    const st = hair.strands.filter(s => !s.fly), fly = hair.strands.length - st.length;
    const m = st.reduce((q, s) => q + s.ms, 0) / Math.max(1, st.length), kn = st.reduce((q, s) => q + (s.kn ? s.kn.length : 0), 0);
    const trimmed = st.filter(s => s.cut).length / Math.max(1, st.length);   // trimmed ends count too, so brushing alone is not quite enough
    return clamp((1 - m * .85 - kn * .06 - fly * .012) * .8 + .2 * clamp(trimmed * 3, 0, 1), 0, 1);
  };
  H.knots = hair => hair.strands.reduce((q, s) => q + (s.kn ? s.kn.length : 0), 0);
  H.flyaways = hair => hair.strands.filter(s => s.fly).length;

  /* ------------------------------------------------------------------ loose ends that fall to the floor */
  H.piece = (p, vx) => {
    const pts = p.pts; let cx = 0, cy = 0; for (const q of pts) { cx += q[0]; cy += q[1]; } cx /= pts.length; cy /= pts.length;
    return { pts: pts.map(q => [q[0] - cx, q[1] - cy]), x: cx, y: cy, vx: (vx || 0) + (Math.random() - .5) * .8, vy: -.4 - Math.random() * .5, rot: 0, vr: (Math.random() - .5) * 5, life: 1.8, wd: p.wd, s: p.s, fly: p.fly };
  };
  H.updatePieces = (list, dt) => {
    for (const q of list) { q.vy += 5.5 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; q.vx *= 1 - dt * .6; q.life -= dt; }
    return list.filter(q => q.life > 0);
  };
  H.drawPieces = (c, R, list, base) => {
    c.save(); c.scale(R, R); c.lineCap = 'butt'; c.lineJoin = 'round';
    for (const q of list) {
      c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.globalAlpha = clamp(q.life / .5, 0, 1);
      const b = baseOf(base, q.s); c.strokeStyle = mix(shadeA(b, .04), WETC, (q.s && q.s.w || 0) * .4); c.lineWidth = q.wd * (q.fly ? 1 : .9);
      if (q.pts.length > 1) { smooth(c, q.pts, 0, q.pts.length - 1); c.stroke(); }
      c.restore();
    }
    c.restore();
  };

  /* ------------------------------------------------------------------ saving */
  const KEYS = ['x', 'y', 'a', 'L', 'cur', 'cf', 'ph', 'g', 'ms', 'w', 'f', 'sh', 'wd', 'jh', 'sd', 'nf', 'nph', 'z'];
  const r3 = v => Math.round(v * 100) / 100;   // two decimals is plenty (a saved cut is about 10 KB)
  H.pack = hair => ({ k: hair.kind, n: hair.cuts | 0, s: hair.strands.map(s => {
    const o = KEYS.map(k => typeof s[k] === 'number' ? r3(s[k]) : 0);
    o.push(s.vx == null ? null : r3(s.vx), s.vy == null ? null : r3(s.vy), s.fly ? r3(s.am) : 0, s.cut ? 1 : 0, s.kn ? s.kn.map(k => [r3(k.t), r3(k.h)]) : 0);
    return o;
  }) });
  H.unpack = d => {
    if (!d || !Array.isArray(d.s)) return null;
    const strands = d.s.map(a => {
      const s = { v: 1 }; KEYS.forEach((k, i) => { s[k] = +a[i] || 0; });
      const n = KEYS.length; if (a[n] != null) { s.vx = +a[n]; s.vy = +a[n + 1]; }
      if (a[n + 2]) { s.fly = 1; s.am = +a[n + 2]; }
      if (a[n + 3]) s.cut = true;
      if (Array.isArray(a[n + 4])) s.kn = a[n + 4].map(k => ({ t: +k[0], h: +k[1] }));
      return s;
    });
    return { kind: d.k, strands, cuts: d.n | 0, brushed: 0, v: 1 };
  };
  H.clone = hair => H.unpack(H.pack(hair));
})();
