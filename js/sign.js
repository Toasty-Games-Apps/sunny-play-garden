// Sign language (ASL): a friendly signer who signs what the games say, for children who are deaf or hard of hearing, and for the
// Sign Along game. Everything is drawn: a 3D hand model (every finger has three joints, the thumb has its own base, so a handshape
// looks right from any side), two arms that reach the hands from the shoulders, and a face whose eyebrows and mouth carry the
// grammar and the feeling (questions, happy, sad...).
//   Hands are described in the signer's own terms: a handshape (`HS`), a place on or in front of the body (`LOC`), the way the
//   fingers point (F) and the way the palm faces (N): up, down, out (toward the child), in (toward the signer), ip (the signer's
//   own side of that hand) and co (across the body). The right hand is the dominant hand; the left hand mirrors it.
//   A sign (`SIGNS`) is a list of key poses with times. A spoken line becomes a list of signs (`gloss`): letters, numbers, colours,
//   shapes and feelings have their own families, instructions have a short key-word gloss in `GLOSS` (simple word order for young
//   children, like the key-word signing used with toddlers), and names are fingerspelled.
// Units: one palm length. Signer space: x to the right of the screen, y up, z toward the viewer, origin at the chin.
(() => {
  const SPG = window.SPG;
  const D = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

  /* ================================================================ the hand */
  // Local hand frame (right hand): origin at the wrist, +y toward the fingers, +x toward the thumb, +z out of the palm.
  const FING = [
    { id: 'i', base: [.29, .93, 0], len: [.46, .27, .2], r: .088 },
    { id: 'm', base: [.095, .99, 0], len: [.51, .31, .21], r: .091 },
    { id: 'r', base: [-.095, .95, 0], len: [.47, .29, .2], r: .085 },
    { id: 'p', base: [-.27, .85, 0], len: [.36, .22, .18], r: .074 }
  ];
  const THUMB = { base: [.17, .12, .05], len: [.4, .33, .28], r: [.135, .11, .1] };
  const PALM = [[-.22, 0], [.2, 0], [.34, .3], [.38, .62], [.37, .9], [.2, 1.0], [0, 1.03], [-.18, .99], [-.33, .86], [-.33, .45]];

  // a finger: three joints bending toward the palm (degrees), a spread toward the thumb, and an optional depth lean (crossed fingers)
  function chain(base, lens, flex, spread, lean) {
    let f = norm([Math.sin(spread * D), Math.cos(spread * D), lean || 0]), n = norm(sub([0, 0, 1], mul(f, dot([0, 0, 1], f))));
    let p = base; const pts = [p];
    for (let j = 0; j < 3; j++) {
      const a = flex[j] * D, ca = Math.cos(a), sa = Math.sin(a);
      const f2 = add(mul(f, ca), mul(n, sa)); n = sub(mul(n, ca), mul(f, sa)); f = f2;
      p = add(p, mul(f, lens[j])); pts.push(p);
    }
    return { pts, nail: mul(n, -1) };   // the nail faces away from the way the finger bends
  }
  // the thumb: a = swing away from the index in the palm plane, p = swing out in front of the palm, f = its two joints
  // the root of the thumb (inside the palm) only goes part of the way; the rest of the swing happens at its middle joint, like a real thumb
  function thumbChain(t) {
    const dirA = (a, p) => norm([Math.sin(a * D) * Math.cos(p * D), Math.cos(a * D) * Math.cos(p * D), Math.sin(p * D)]);
    const bendN = f => norm(sub([-1, .1, 1], mul(f, dot([-1, .1, 1], f))));
    let f = dirA(24 + t.a * .42, t.p * .55 + (t.c || 0)), q = THUMB.base; const pts = [q];
    q = add(q, mul(f, THUMB.len[0])); pts.push(q);
    f = dirA(t.a, t.p); let n = bendN(f);
    for (let j = 0; j < 2; j++) {
      const ang = t.f[j] * D, ca = Math.cos(ang), sa = Math.sin(ang);
      const f2 = add(mul(f, ca), mul(n, sa)); n = sub(mul(n, ca), mul(f, sa)); f = f2;
      q = add(q, mul(f, THUMB.len[j + 1])); pts.push(q);
    }
    return { pts, nail: mul(n, -1) };
  }
  // where a named point of the fingers is, for thumb targets ("i3" = index tip, "m2" = middle finger's second joint)
  function fingerPoint(fs, name) {
    const k = 'imrp'.indexOf(name[0]); return fs[k].pts[+name[1]];
  }
  // The thumb of most handshapes is given by where its tip goes (touching the index tip for O and F, across the fingers for S, under them
  // for M, N and T...): the pose that gets it there is found by a small search, once per handshape.
  function solveThumb(fs, target, start) {
    const P = Object.assign({ a: 30, p: 30, c: 0, f: [20, 20] }, start), lim = { a: [-25, 100], p: [-30, 95], c: [-10, 40], f0: [-25, 85], f1: [-30, 90] };
    const cost = q => {
      const pts = thumbChain(q).pts; let c = len(sub(pts[3], target)) + .0006 * ((q.f[0] - 20) ** 2 + (q.f[1] - 20) ** 2) * .02;
      for (let j = 1; j < 4; j++) if (pts[j][0] < .36 && pts[j][1] > 0 && pts[j][1] < 1 && pts[j][2] < .08) c += (.08 - pts[j][2]) * 3;   // never through the palm: the thumb stays on its front
      return c;
    };
    let best = { a: P.a, p: P.p, c: P.c, f: P.f.slice() }, bc = cost(best);
    for (let step = 24; step > .3; step *= .62) {
      for (let it = 0; it < 6; it++) {
        let moved = false;
        for (const key of ['a', 'p', 'c', 'f0', 'f1']) for (const s of [-1, 1]) {
          const q = { a: best.a, p: best.p, c: best.c, f: best.f.slice() };
          if (key === 'f0') q.f[0] = clamp(q.f[0] + s * step, ...lim.f0); else if (key === 'f1') q.f[1] = clamp(q.f[1] + s * step, ...lim.f1); else q[key] = clamp(q[key] + s * step, ...lim[key]);
          const cq = cost(q); if (cq < bc - 1e-5) { best = q; bc = cq; moved = true; }
        }
        if (!moved) break;
      }
    }
    return best;
  }

  /* ---------------------------------------------------------------- handshapes */
  // fingers: [joint 1, joint 2, joint 3, spread] in degrees; t: thumb pose, or {to: point, o: offset} for a thumb tip that goes somewhere
  const E = [0, 0, 0], FIST = [90, 100, 62], CURL = [40, 55, 35];
  const HS = {};
  const shape = (id, i, m, r, p, t, extra) => { HS[id] = Object.assign({ id, i, m, r, p, t }, extra || {}); };
  const sp = (f, s) => [f[0], f[1], f[2], s];
  const fistT = { to: 'm2', o: [-.02, -.05, .12] };          // S: the thumb lies across the front of the fingers
  const overT = { to: 'm2', o: [.05, .02, .1] };             // the thumb holds the folded fingers down (1, I, X...)
  const palmT = { to: 'palm', o: [-.08, .55, .16] };         // B and 4: folded across the palm
  // letters
  shape('A', FIST, FIST, FIST, FIST, { a: 8, p: 12, c: 0, f: [0, 4] });
  shape('B', sp(E, 2), sp(E, 0), sp(E, -2), sp(E, -4), palmT);
  shape('C', sp([35, 45, 28], 3), sp([35, 45, 28], 0), sp([35, 45, 28], -2), sp([38, 45, 28], -4), { a: 48, p: 62, c: 5, f: [12, 14] });
  shape('D', sp(E, 3), [60, 70, 40], [62, 72, 42], [64, 72, 42], { to: 'm3', o: [0, 0, .04] });
  shape('E', [20, 100, 75], [20, 100, 75], [20, 100, 75], [22, 100, 75], { to: 'palm', o: [-.05, .55, .2] }, { tipsDown: 1 });
  shape('F', [42, 62, 42, 2], sp(E, 0), sp(E, -7), sp(E, -15), { to: 'i3', o: [0, 0, .03] });
  shape('G', sp(E, 0), FIST, FIST, FIST, { a: 16, p: 16, c: 0, f: [0, 0] });
  shape('H', sp(E, -1), sp(E, 3), FIST, FIST, { to: 'r2', o: [.02, 0, .12] });
  shape('I', FIST, FIST, FIST, sp(E, -6), { to: 'm2', o: [.06, 0, .12] });
  shape('K', sp(E, 4), [52, 8, 0, -4], FIST, FIST, { to: 'm1', o: [.07, 0, .06] });
  shape('L', sp(E, 0), FIST, FIST, FIST, { a: 84, p: 4, c: 0, f: [0, 0] });
  shape('M', [70, 78, 50], [70, 78, 50], [70, 80, 50], FIST, { to: 'r3', o: [-.09, -.06, .06] }, { over: [0, 1, 2] });
  shape('N', [70, 78, 50], [70, 78, 50], FIST, FIST, { to: 'm3', o: [-.09, -.06, .06] }, { over: [0, 1] });
  shape('O', sp([42, 60, 42], 2), sp([45, 58, 40], 0), sp([48, 58, 40], -2), sp([52, 58, 40], -4), { to: 'i3', o: [-.02, -.03, .04] });
  shape('P', sp(E, 4), [52, 8, 0, -4], FIST, FIST, { to: 'm1', o: [.07, 0, .06] });
  shape('Q', sp(E, 0), FIST, FIST, FIST, { a: 30, p: 18, c: 0, f: [0, 5] });
  shape('R', [0, 0, 0, -9], [0, 0, 0, 9], FIST, FIST, { to: 'r2', o: [.02, 0, .12] }, { lean: { i: .17, m: -.17 } });
  shape('S', FIST, FIST, FIST, FIST, fistT);
  shape('T', [62, 85, 50], FIST, FIST, FIST, { to: 'i2', o: [-.1, -.02, .03] }, { over: [0] });
  shape('U', sp(E, -1), sp(E, 2), FIST, FIST, { to: 'r2', o: [.02, 0, .12] });
  shape('V', sp(E, 9), sp(E, -6), FIST, FIST, { to: 'r2', o: [.02, 0, .12] });
  shape('W', sp(E, 11), sp(E, 0), sp(E, -11), FIST, { to: 'p3', o: [.03, 0, .06] });
  shape('X', [8, 95, 62], FIST, FIST, FIST, overT);
  shape('Y', FIST, FIST, FIST, sp(E, -30), { a: 80, p: 8, c: 0, f: [0, 0] });
  // numbers and others
  shape('1', sp(E, 0), FIST, FIST, FIST, overT);
  shape('3', sp(E, 9), sp(E, -6), FIST, FIST, { a: 55, p: 8, c: 0, f: [0, 5] });
  shape('4', sp(E, 10), sp(E, 2), sp(E, -6), sp(E, -15), palmT);
  shape('5', sp(E, 13), sp(E, 2), sp(E, -8), sp(E, -19), { a: 62, p: 10, c: 0, f: [0, 5] });
  shape('6', sp(E, 11), sp(E, 0), sp(E, -11), [55, 55, 30, -8], { to: 'p3', o: [0, 0, .03] });
  shape('7', sp(E, 11), sp(E, 0), [55, 55, 30, -4], sp(E, -18), { to: 'r3', o: [0, 0, .03] });
  shape('8', sp(E, 11), [50, 52, 30, 0], sp(E, -9), sp(E, -18), { to: 'm3', o: [0, 0, .03] });
  shape('9', [42, 62, 42, 2], sp(E, 0), sp(E, -7), sp(E, -15), { to: 'i3', o: [0, 0, .03] });
  shape('10', FIST, FIST, FIST, FIST, { a: 4, p: 8, c: 0, f: [0, 0] });
  shape('openB', sp(E, 1), sp(E, 0), sp(E, -1), sp(E, -3), { a: 14, p: 6, c: 0, f: [5, 5] });
  shape('bentB', [80, 0, 0, 1], [80, 0, 0, 0], [80, 0, 0, -1], [80, 0, 0, -3], { a: 14, p: 10, c: 0, f: [5, 5] });
  shape('flatO', [62, 18, 8, 2], [62, 18, 8, 0], [64, 18, 8, -2], [66, 18, 8, -4], { to: 'm3', o: [.06, -.02, .05] });
  shape('claw', [18, 62, 45, 13], [18, 62, 45, 2], [18, 62, 45, -8], [18, 62, 45, -19], { a: 66, p: 22, c: 0, f: [20, 25] });
  shape('curved', sp(CURL, 2), sp(CURL, 0), sp(CURL, -2), sp(CURL, -4), { a: 40, p: 40, c: 0, f: [15, 15] });
  shape('open8', sp(E, 13), [70, 12, 4, 2], sp(E, -8), sp(E, -19), { a: 62, p: 10, c: 0, f: [0, 5] });
  shape('ILY', sp(E, 2), FIST, FIST, sp(E, -24), { a: 80, p: 8, c: 0, f: [0, 0] });
  shape('bent5', [55, 10, 5, 13], [55, 10, 5, 2], [55, 10, 5, -8], [55, 10, 5, -19], { a: 66, p: 20, c: 0, f: [5, 5] });
  shape('bentV', [10, 80, 50, 9], [10, 80, 50, -6], FIST, FIST, { to: 'r2', o: [.02, 0, .12] });
  shape('hook', [8, 95, 62], FIST, FIST, FIST, overT);
  shape('rest', [14, 22, 12, 2], [16, 24, 12, 0], [18, 26, 14, -3], [20, 28, 14, -6], { a: 30, p: 25, c: 0, f: [10, 12] });
  shape('bentL', [70, 0, 0, 0], FIST, FIST, FIST, { a: 80, p: 8, c: 0, f: [0, 0] });
  shape('openF', [30, 30, 20, 2], sp(E, 0), sp(E, -7), sp(E, -15), { a: 50, p: 40, c: 0, f: [10, 10] });
  shape('baby-O', [42, 62, 42, 2], FIST, FIST, FIST, { to: 'i3', o: [0, 0, .03] });

  // finished hands: the finger chains and the solved thumb, made once per handshape
  const cache = {};
  function built(id) {
    if (cache[id]) return cache[id];
    const h = HS[id] || HS.rest, lean = h.lean || {};
    const fs = FING.map(F => chain(F.base, F.len, h[F.id], h[F.id][3] || 0, lean[F.id]));
    let t = h.t;
    if (t.to) {
      const tgt = t.to === 'palm' ? [0, 0, 0] : fingerPoint(fs, t.to);
      t = solveThumb(fs, add(tgt, t.o || [0, 0, 0]), { a: 30, p: 40 });
    }
    const flex = FING.map(F => h[F.id].slice(0, 4));
    return (cache[id] = { id, flex, thumb: t, lean, over: h.over });
  }
  // a hand pose in between two handshapes (for movement from one to the next)
  function mixShape(a, b, u) {
    if (u <= 0) return a; if (u >= 1) return b;
    return { id: a.id + '>' + b.id, flex: a.flex.map((f, k) => f.map((v, j) => lerp(v, b.flex[k][j] || 0, u))), thumb: { a: lerp(a.thumb.a, b.thumb.a, u), p: lerp(a.thumb.p, b.thumb.p, u), c: lerp(a.thumb.c || 0, b.thumb.c || 0, u), f: [lerp(a.thumb.f[0], b.thumb.f[0], u), lerp(a.thumb.f[1], b.thumb.f[1], u)] }, lean: u < .5 ? a.lean : b.lean, over: u < .5 ? a.over : b.over };
  }
  function handGeom(s) {
    const fs = FING.map((F, k) => chain(F.base, F.len, s.flex[k], s.flex[k][3] || 0, (s.lean || {})[F.id]));
    return { fs, th: thumbChain(s.thumb) };
  }
  // reference points on the hand (where it touches the body)
  function refPoint(g, ref) {
    switch (ref) {
      case 'tips': return mul(add(g.fs[0].pts[3], g.fs[1].pts[3]), .5);
      case 'ti': return g.fs[0].pts[3]; case 'tm': return g.fs[1].pts[3]; case 'tp': return g.fs[3].pts[3]; case 'tt': return g.th.pts[3];
      case 'knuck': return [0, .92, -.05]; case 'back': return [0, .5, -.13]; case 'heel': return [0, .1, .1];
      case 'pinkyside': return [-.36, .5, 0]; case 'thumbside': return [.38, .55, 0];
      case 'ipip': return g.fs[0].pts[2];
      default: return [0, .5, .13];   // the middle of the palm
    }
  }

  /* ---------------------------------------------------------------- directions and places */
  // the signer's own words for directions; for the left hand "ip" and "co" are mirrored
  const DIR = { up: [0, 1, 0], down: [0, -1, 0], out: [0, 0, 1], in: [0, 0, -1], ip: [-1, 0, 0], co: [1, 0, 0] };
  function dirOf(spec, left) {
    if (Array.isArray(spec)) return norm(left ? [-spec[0], spec[1], spec[2]] : spec);
    let v = [0, 0, 0];
    for (const part of String(spec).split('+')) { const m = /^(-?[\d.]*)([a-z]+)$/.exec(part); const k = m[1] === '' ? 1 : m[1] === '-' ? -1 : +m[1], d = DIR[m[2]]; v = add(v, mul(d, k)); }
    if (left) v[0] = -v[0];
    return norm(v);
  }
  // places: right-hand side values (x < 0 is the signer's right, which is the left of the screen); mirrored for the left hand
  const LOC = {
    forehead: [-.1, 1.85, .78], temple: [-.72, 1.55, .38], eye: [-.36, 1.38, .78], nose: [0, .95, 1.02], mouth: [0, .43, .88], lips: [0, .43, .92], chin: [0, -.02, .72],
    cheek: [-.6, .68, .58], jaw: [-.55, .2, .4], ear: [-.9, 1.12, .1], head: [-.2, 2.35, .4], above: [-.5, 3.3, 1.1],
    neck: [0, -.6, .4], chest: [-.3, -2.05, .75], chestc: [0, -2.05, .78], shoulder: [-1.75, -1.35, .4], belly: [0, -3.6, .85],
    neutral: [-.35, -2.4, 2.4], low: [-.4, -3.4, 2.1], high: [-.5, -.6, 2.3], spell: [-1.6, -1.45, 2.0], side: [-1.9, -3.2, 1.2],
    lap: [-1.0, -4.6, 1.3], face: [-.2, 1.0, 1.9], forward: [-.4, -1.6, 4.0], spellx: [-1.7, -1.5, 1.9]
  };
  const SHOULDER = [-1.85, -1.45, 0], UPPER = 2.9, FORE = 2.65;
  function placeOf(name, off, left) {
    const p = Array.isArray(name) ? name : LOC[name] || LOC.neutral, o = off || [0, 0, 0];
    const q = [p[0] + o[0], p[1] + o[1], p[2] + o[2]];   // offsets are in the hand's own terms: x < 0 = its own side
    if (left) q[0] = -q[0];
    return q;
  }

  /* ---------------------------------------------------------------- signs */
  // A key pose for one hand: shape, place, fingers' way, palm's way, the point of the hand that is at the place, an offset.
  const H = (s, at, F, N, ref, o) => ({ s, at, F, N, ref: ref || 'palm', o });
  const REST_R = H('rest', 'lap', 'down+.6co', 'in+.4co', 'palm', [0, 0, 0]);
  const SIGNS = {};
  // k: [{ t: seconds to get there, R, L, face, arc: [x, y, z] bump on the way }]; flags: two (both hands), zoom ('hand' for letters)
  const sign = (id, k, o) => { SIGNS[id] = Object.assign({ id, k }, o || {}); };

  // fingerspelling (palm out, at the shoulder; J and Z move)
  const SPELL = id => H(id, 'spell', 'up', 'out', 'palm');   // (in front of the right shoulder)
  for (const l of 'abdefiklmnrstuvwxy') sign('L:' + l, [{ t: .3, R: SPELL(l.toUpperCase()) }, { t: .35, R: SPELL(l.toUpperCase()) }], { zoom: 'hand' });
  sign('L:c', [{ t: .3, R: H('C', 'spell', 'up', 'co+.45out') }, { t: .35, R: H('C', 'spell', 'up', 'co+.45out') }], { zoom: 'hand' });
  sign('L:o', [{ t: .3, R: H('O', 'spell', 'up', 'co+.6out') }, { t: .35, R: H('O', 'spell', 'up', 'co+.6out') }], { zoom: 'hand' });
  sign('L:g', [{ t: .3, R: H('G', 'spell', 'co', 'in', 'palm', [0, .2, 0]) }, { t: .35, R: H('G', 'spell', 'co', 'in', 'palm', [0, .2, 0]) }], { zoom: 'hand' });
  sign('L:h', [{ t: .3, R: H('H', 'spell', 'co', 'in+.3down', 'palm', [0, .2, 0]) }, { t: .35, R: H('H', 'spell', 'co', 'in+.3down', 'palm', [0, .2, 0]) }], { zoom: 'hand' });
  sign('L:p', [{ t: .3, R: H('P', 'spell', '.7out+down+.6co', 'down+.5co', 'palm', [0, .4, 0]) }, { t: .35, R: H('P', 'spell', '.7out+down+.6co', 'down+.5co', 'palm', [0, .4, 0]) }], { zoom: 'hand' });
  sign('L:q', [{ t: .3, R: H('Q', 'spell', 'down+.3out', 'in+.3co', 'palm', [0, .5, 0]) }, { t: .35, R: H('Q', 'spell', 'down+.3out', 'in+.3co', 'palm', [0, .5, 0]) }], { zoom: 'hand' });
  sign('L:j', [{ t: .25, R: H('I', 'spell', 'up', 'out') }, { t: .22, R: H('I', 'spell', 'up', 'out', 'tp', [0, -.45, 0]) }, { t: .3, R: H('I', 'spell', 'up+.3co', 'in+.4co', 'tp', [.35, -.55, 0]) }], { zoom: 'hand' });
  sign('L:z', [{ t: .25, R: H('1', 'spell', 'up', 'out', 'ti', [-.2, .45, 0]) }, { t: .2, R: H('1', 'spell', 'up', 'out', 'ti', [.45, .45, 0]) }, { t: .2, R: H('1', 'spell', 'up', 'out', 'ti', [-.2, -.15, 0]) }, { t: .2, R: H('1', 'spell', 'up', 'out', 'ti', [.45, -.15, 0]) }], { zoom: 'hand' });


  /* ================================================================ placing and drawing */
  // a hand in the signer's space: its shape, the way the fingers point (F), the palm (N), the point of the hand at target P
  function placeHand(shp, F, N, P, ref, left) {
    F = norm(F); N = norm(sub(N, mul(F, dot(N, F)))); if (len(N) < .01) N = norm(cross(F, [0, 1, .01]));
    let X = cross(F, N); if (left) X = mul(X, -1);
    const g = handGeom(shp), toW = q => [X[0] * q[0] + F[0] * q[1] + N[0] * q[2], X[1] * q[0] + F[1] * q[1] + N[1] * q[2], X[2] * q[0] + F[2] * q[1] + N[2] * q[2]];
    const wrist = sub(P, toW(refPoint(g, ref)));
    const W = q => add(wrist, toW(q));
    return { wrist, F, N, X, g, W, toW, shp };
  }
  const SKIN = { base: '#e9b48e', palm: '#f3c7a6', line: '#a8704f', nail: '#f8d9c8', dark: '#c98f6c' };
  // the convex outline of a set of 2D points
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const crossz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const p of pts) { while (lo.length >= 2 && crossz(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && crossz(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  // draw one hand. pr(q) projects a signer-space point to the canvas and gives [x, y, depth]; k = pixels per unit
  function drawHand(c, h, pr, k, skin) {
    k *= 13 / (13 - clamp((pr.vz ? pr.vz(h.wrist) : h.wrist[2]) + .3, -3, 8));   // widths follow the same perspective as the points
    const S = skin || SKIN, items = [], olw = Math.max(1, k * .028);
    const cap = (a, b, r, z, o) => items.push({ z, kind: 'cap', a, b, r, o: o || {} });
    // palm: a slab, the outline of its front and back faces
    const pz = .12, ring = [];
    for (const [x, y] of PALM) { ring.push(pr(h.W([x, y, pz]))); ring.push(pr(h.W([x, y, -pz]))); }
    const vz = pr.vz || (d => d[2]), pc = pr(h.W([0, .5, 0])), facing = vz(h.N);
    items.push({ z: pc[2], kind: 'palm', pts: hull(ring.map(p => [p[0], p[1]])), facing });
    // the thumb: its root is part of the palm (no outline where it joins)
    const tp = h.g.th.pts.map(q => pr(h.W(q)));
    cap(tp[0], tp[1], THUMB.r[0], (tp[0][2] + tp[1][2]) / 2 - .02, { soft: 1 });
    cap(tp[1], tp[2], THUMB.r[1], (tp[1][2] + tp[2][2]) / 2 + .01);
    cap(tp[2], tp[3], THUMB.r[2], (tp[2][2] + tp[3][2]) / 2 + .02, { nail: h.toW(h.g.th.nail), tip: 1 });
    const over = h.shp.over || [];
    h.g.fs.forEach((f, fi) => {
      const q = f.pts.map(p => pr(h.W(p))), r = FING[fi].r;
      for (let j = 0; j < 3; j++) {
        let z = (q[j][2] + q[j + 1][2]) / 2 + .015;
        if (over.includes(fi) && j > 0) z += .2;   // M, N, T: these fingers fold over the thumb
        cap(q[j], q[j + 1], r * (1 - j * .06), z, j === 2 ? { nail: h.toW(f.nail), tip: 1 } : {});
      }
    });
    items.sort((a, b) => a.z - b.z);
    c.lineCap = c.lineJoin = 'round';
    for (const it of items) {
      if (it.kind === 'palm') {
        c.beginPath(); it.pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
        c.fillStyle = it.facing > .15 ? S.palm : S.base; c.fill(); c.strokeStyle = S.line; c.lineWidth = olw; c.stroke();
        if (it.facing > .35) {   // palm lines
          c.save(); c.globalAlpha = Math.min(1, (it.facing - .35) * 2) * .35; c.strokeStyle = S.dark; c.lineWidth = olw * .8;
          const a = pr(h.W([.3, .62, pz])), b = pr(h.W([0, .5, pz])), d = pr(h.W([-.3, .72, pz])); c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(b[0], b[1], d[0], d[1]); c.stroke();
          const e = pr(h.W([.25, .45, pz])), f2 = pr(h.W([.1, .25, pz])), g2 = pr(h.W([.05, .08, pz])); c.beginPath(); c.moveTo(e[0], e[1]); c.quadraticCurveTo(f2[0], f2[1], g2[0], g2[1]); c.stroke(); c.restore();
        }
        continue;
      }
      const { a, b } = it, w = it.r * 2 * k;
      if (!it.o.soft) { c.strokeStyle = S.line; c.lineWidth = w + olw * 2; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      c.strokeStyle = S.base; c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      if (it.o.nail && vz(it.o.nail) > .2) {   // a fingernail when the back of the fingertip faces the child
        const al = Math.min(1, (vz(it.o.nail) - .2) * 2.5), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        c.save(); c.globalAlpha = al * .9; c.fillStyle = S.nail; c.translate(b[0] - ux * w * .38, b[1] - uy * w * .38); c.rotate(Math.atan2(uy, ux));
        c.beginPath(); c.ellipse(0, 0, Math.max(1, Math.min(L * .45, w * .42)), w * .3, 0, 0, TAU); c.fill(); c.restore();
      }
    }
  }

  /* ---------------------------------------------------------------- skin tones, the wrist, and the "where" badge */
  const SKINS = {
    light: { base: '#f2cdb0', palm: '#f8dcc6', line: '#b98a6c', nail: '#fbe6d8', dark: '#d9a888' },
    medium: SKIN,
    tan: { base: '#c68a62', palm: '#e0aa86', line: '#8a5a3c', nail: '#eccab4', dark: '#a8714f' },
    deep: { base: '#8e5a3c', palm: '#b07858', line: '#5c3826', nail: '#c9a088', dark: '#74482f' }
  };
  // which way the forearm goes from the wrist (a short stub is drawn, fading out): toward a natural elbow
  function armIK(Sh, W, left) {
    const a = UPPER, b = FORE, dv = sub(W, Sh), d0 = len(dv), d = clamp(d0, Math.abs(a - b) + .05, a + b - .02), u = norm(dv);
    const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    let v1 = cross(u, [0, 0, 1]); if (len(v1) < .2) v1 = cross(u, [1, 0, 0]); v1 = norm(v1); const v2 = norm(cross(u, v1)), side = left ? 1 : -1;
    let best = null, bs = 1e9;
    for (let i = 0; i < 36; i++) {
      const th = i / 36 * TAU, e = add(Sh, add(mul(u, a * cosA), mul(add(mul(v1, Math.cos(th)), mul(v2, Math.sin(th))), a * sinA)));
      const sc = e[1] + 1.4 * Math.max(0, .5 - side * e[0]) - .3 * clamp(e[2], 0, 2.6) + 1.2 * Math.max(0, -e[2] - .2) + .4 * Math.max(0, e[2] - 3);
      if (sc < bs) { bs = sc; best = e; }
    }
    return best;
  }
  function drawWrist(c, h, left, pr, k, S) {
    const Sh = left ? [-SHOULDER[0], SHOULDER[1], SHOULDER[2]] : SHOULDER, el = armIK(Sh, h.wrist, left);
    const a = pr(h.wrist), b = pr(add(h.wrist, mul(norm(sub(el, h.wrist)), 1.25))), kk = k * 13 / (13 - clamp(a[2], -3, 8));
    const g = (col, a0) => { const gr = c.createLinearGradient(a[0], a[1], b[0], b[1]); gr.addColorStop(0, col); gr.addColorStop(.55, col); gr.addColorStop(1, col + '00'); return gr; };
    c.lineCap = 'round'; c.strokeStyle = g(S.line); c.lineWidth = kk * .4; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    c.lineCap = 'butt'; c.strokeStyle = g(S.base); c.lineWidth = kk * .34; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  // places on the body, and where they are on the little round face of the badge (-1..1); signs made there show it, with a glowing dot
  const BADGE = { forehead: [0, -.62], temple: [-.7, -.4], eye: [-.32, -.25], nose: [0, .02], mouth: [0, .38], lips: [0, .38], chin: [0, .72], cheek: [-.56, .22], jaw: [-.55, .5], ear: [-.95, 0], head: [-.25, -.95], face: [0, 0], neck: [0, 1.25], chest: [-.3, 1.85], chestc: [0, 1.85], shoulder: [-.95, 1.6], belly: [0, 2.3] };
  const FACES = { neutral: 0, happy: 1, kind: 1, cheer: 1, sad: 1, mad: 1, scared: 1, wow: 1, whq: 1, ynq: 1, sleepy: 1, think: 1 };
  function drawBadge(c, x, y, r, place, mood, t) {
    c.save(); c.translate(x, y);
    const chest = BADGE[place] && BADGE[place][1] > 1.1;
    if (chest) { c.fillStyle = 'rgba(120,170,220,.45)'; c.beginPath(); c.ellipse(0, r * 2.35, r * 1.3, r * .95, 0, Math.PI, TAU); c.fill(); }   // shoulders, for the signs made on the chest
    c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = '#e0a93a'; c.lineWidth = Math.max(1, r * .07); c.stroke();
    // an emoji face: its eyebrows and mouth carry the feeling and the question
    const m = mood || 'neutral', ink = '#6b4a2a'; c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = 'round'; c.lineWidth = Math.max(1, r * .09);
    for (const sx of [-1, 1]) {
      if (m === 'sleepy') { c.beginPath(); c.arc(sx * r * .35, -r * .15, r * .13, .2, Math.PI - .2); c.stroke(); }
      else { c.beginPath(); c.ellipse(sx * r * .35, -r * .18, r * (m === 'wow' || m === 'scared' ? .13 : .1), r * (m === 'wow' || m === 'scared' ? .16 : .13), 0, 0, TAU); c.fill(); }
      const by = -r * .48, tilt = m === 'mad' || m === 'whq' ? .16 : m === 'sad' ? -.14 : 0, up = m === 'wow' || m === 'ynq' || m === 'scared' ? -r * .1 : 0;
      if (m !== 'neutral' && m !== 'happy' && m !== 'kind' && m !== 'cheer') { c.beginPath(); c.moveTo(sx * r * .18, by + up + tilt * r); c.lineTo(sx * r * .52, by + up - tilt * r); c.stroke(); }
    }
    c.beginPath();
    if (m === 'sad') c.arc(0, r * .62, r * .3, Math.PI + .5, TAU - .5);
    else if (m === 'wow' || m === 'scared') { c.ellipse(0, r * .42, r * .13, r * .17, 0, 0, TAU); c.fill(); c.beginPath(); }
    else if (m === 'mad' || m === 'whq' || m === 'think') { c.moveTo(-r * .25, r * .45); c.lineTo(r * .25, r * .45); }
    else c.arc(0, r * .18, r * (m === 'happy' || m === 'cheer' ? .4 : .3), .45, Math.PI - .45);
    c.stroke();
    if (BADGE[place]) {   // the glowing dot: where the hand goes
      const [px, py] = BADGE[place], pulse = .75 + Math.sin(t * 6) * .25;
      c.fillStyle = `rgba(255,90,140,${.35 * pulse})`; c.beginPath(); c.arc(px * r, py * r, r * .34 * pulse, 0, TAU); c.fill();
      c.fillStyle = '#ff4f86'; c.beginPath(); c.arc(px * r, py * r, r * .14, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, r * .05); c.stroke();
    }
    c.restore();
  }

  /* ================================================================ playing signs */
  // a key pose, resolved: the shape built, the directions and the target point in signer space
  function resolve(hs, left) {
    return { shp: built(hs.s), F: dirOf(hs.F, left), N: dirOf(hs.N, left), P: placeOf(hs.at, hs.o, left), ref: hs.ref || 'palm' };
  }
  function mixHand(a, b, u, arc) {
    const P = lerp3(a.P, b.P, u); if (arc) { const k = Math.sin(u * Math.PI); P[0] += arc[0] * k; P[1] += arc[1] * k; P[2] += arc[2] * k; }
    return { shp: mixShape(a.shp, b.shp, u), F: norm(lerp3(a.F, b.F, u)), N: norm(lerp3(a.N, b.N, u)), P, ref: u < .5 ? a.ref : b.ref, refB: b.ref, refA: a.ref, u };
  }
  // a hand pose at a moment: where the reference point is (it slides from the old one to the new one, so contact points stay put)
  function poseHand(m, left) {
    if (m.refA && m.refA !== m.refB) {
      const ha = placeHand(m.shp, m.F, m.N, m.P, m.refA, left), hb = placeHand(m.shp, m.F, m.N, m.P, m.refB, left);
      return placeHand(m.shp, m.F, m.N, add(m.P, mul(sub(ha.wrist, hb.wrist), 1 - ease(m.u))), m.refB, left);
    }
    return placeHand(m.shp, m.F, m.N, m.P, m.ref, left);
  }
  const lerpFace = (a, b, u) => ({ mood: u < .5 ? a.mood : b.mood });
  const BODY = new Set(Object.keys(BADGE));

  // The hands: give them a list of sign ids and they sign them one after another (no person: just two hands, a short wrist each,
  // a fading trail that shows the movement, and for signs made at the face or the chest a little emoji face that shows where).
  class Signer {
    constructor(opts = {}) {
      this.skin = SKINS[opts.skin] || SKIN; this.t = 0; this.keys = []; this.time = 0; this.cam = null; this.onWord = opts.onWord || null;
      this.cur = null; this.busy = false; this.trail = { R: [], L: [] }; this.words = [];
      this.yaw = opts.yaw == null ? .4 : opts.yaw;   // seen a little from the side (a three-quarter view), so a movement toward the body or toward the child shows
    }
    setSkin(id) { this.skin = SKINS[id] || SKIN; }
    // sequence: [sign ids]; each becomes key poses (from the pose the hands are in, or straight into the first sign)
    play(ids, o = {}) {
      const list = ids.map(id => (typeof id === 'string' ? SIGNS[id] : id)).filter(Boolean);
      const keys = [], words = [];
      let at = 0;
      list.forEach((sg, wi) => {
        const w0 = keys.length;
        sg.k.forEach((f, fi) => {
          const prev = keys[keys.length - 1];
          if (!prev) at = 0; else at += fi === 0 ? Math.max(.3, f.t) : f.t;
          const twoHand = !!(f.L || sg.mirror) || sg.k.some(q => q.L);
          keys.push({ at, R: f.R ? resolve(f.R, false) : prev.R, L: f.L ? resolve(f.L, true) : sg.mirror && f.R ? resolve(f.R, true) : null, two: twoHand, place: f.R ? f.R.at : prev && prev.place,
            face: f.face ? (typeof f.face === 'string' ? { mood: f.face } : f.face) : { mood: sg.face || 'neutral' }, arcR: f.arc, arcL: f.arcL || (f.arc && sg.mirror ? [-f.arc[0], f.arc[1], f.arc[2]] : null), word: fi === 0 ? { id: sg.id, i: wi } : null, w: wi });
        });
        at += o.gap != null ? o.gap : .22;   // a little hold at the end of each sign
        const last = keys[keys.length - 1]; keys.push(Object.assign({}, last, { at, word: null, arcR: null, arcL: null }));
        words.push({ from: keys[w0].at, to: at, box: this.boxOf(keys.slice(w0)), place: keys.slice(w0).map(k => k.place).find(p => typeof p === 'string' && BODY.has(p)) || null, id: sg.id });
      });
      // the second hand of a two-handed sign fades in and out; when a sign has none, the other hand is not shown
      this.keys = keys; this.words = words; this.time = 0; this.busy = keys.length > 0; this.endsAt = at; this.lastWord = -1; this.trail = { R: [], L: [] };
      if (keys.length) this.cur = this.poseAt(0);
      return at;
    }
    stop() { this.busy = false; this.keys = []; this.words = []; }
    // the box both hands use during one sign, so the camera holds still while a sign moves
    boxOf(keys) {
      const ps = [];
      for (const k of keys) for (const [h, left] of [[k.R, false], [k.L, true]]) { if (!h) continue; const q = placeHand(h.shp, h.F, h.N, h.P, h.ref, left); for (const p of [q.wrist, q.W([0, 1.85, 0]), q.W([.7, .9, 0]), q.W([-.5, .9, 0]), q.W([0, .5, .2])]) ps.push(this.view(p)); }
      if (!ps.length) return [-2, -2, 2, 2];
      return grow(bounds(ps, .35), 3.4);
    }
    view(q) { const c2 = Math.cos(this.yaw), s2 = Math.sin(this.yaw); return [q[0] * c2 + (q[2] - 2.2) * s2, q[1], -q[0] * s2 + q[2] * c2]; }
    poseAt(tm) {
      const K = this.keys; if (!K.length) return this.cur;
      let j = 1; while (j < K.length - 1 && K[j].at < tm) j++;
      if (K.length === 1) j = 0;
      const a = K[Math.max(0, j - 1)], b = K[j], u = ease((tm - a.at) / Math.max(.001, b.at - a.at));
      const L = a.L && b.L ? mixHand(a.L, b.L, u, b.arcL) : (b.L || a.L) ? mixHand(b.L || a.L, b.L || a.L, 0) : null;
      const lA = a.L ? 1 : 0, lB = b.L ? 1 : 0;
      return { R: mixHand(a.R, b.R, u, b.arcR), L, lAlpha: lerp(lA, lB, u), face: lerpFace(a.face, b.face, u), w: u < .5 ? a.w : b.w };
    }
    update(dt) {
      this.t += dt; if (!this.busy) return;
      this.time += dt;
      this.cur = this.poseAt(this.time);
      if (this.onWord) for (let j = 0; j < this.keys.length && this.keys[j].at <= this.time + .25; j++) if (this.keys[j].word && j > this.lastWord) { this.lastWord = j; this.onWord(this.keys[j].word); }
      if (this.time >= this.endsAt) this.busy = false;
    }
    wordNow() { const W = this.words; if (!W.length) return null; return W.find(w => this.time <= w.to) || W[W.length - 1]; }
    // draw into a box (x, y, w, h) of a 2D context
    draw(c, x, y, w, h, o = {}) {
      if (!this.cur) return;
      const R = poseHand(this.cur.R, false), L = this.cur.L && this.cur.lAlpha > .02 ? poseHand(this.cur.L, true) : null;
      // the camera holds each sign's box (it glides to the next sign's box between signs)
      const W = this.words, wn = this.wordNow();
      let box = wn ? wn.box : this.boxOf([{ R: this.cur.R, L: this.cur.L }]);
      if (wn) { const i = W.indexOf(wn), nx = W[i + 1]; if (nx && this.time > wn.to - .3) { const u = ease((this.time - (wn.to - .3)) / .3); box = box.map((v, j) => lerp(v, nx.box[j], u)); } }
      const pad = o.pad == null ? .06 : o.pad, iw = w * (1 - pad * 2), ih = h * (1 - pad * 2);
      const want = { cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, s: Math.max(box[2] - box[0], (box[3] - box[1]) * iw / ih) };
      if (!this.cam || o.snap) this.cam = want; else { const a = Math.min(1, (o.dt || .016) * 7); this.cam = { cx: lerp(this.cam.cx, want.cx, a), cy: lerp(this.cam.cy, want.cy, a), s: lerp(this.cam.s, want.s, a) }; }
      const k = iw / this.cam.s / 1.15, cx = x + w / 2, cy = y + h / 2, cam = this.cam;
      // the three-quarter view (this.view), and a little perspective: a hand coming toward the child grows
      const syw = Math.sin(this.yaw), cyw = Math.cos(this.yaw);
      const pr = q => { const v = this.view(q), f = 13 / (13 - clamp(v[2] - 2.2, -5, 7)); return [cx + (v[0] - cam.cx) * k * f, cy - (v[1] - cam.cy) * k * f, v[2]]; };
      pr.vz = d => -d[0] * syw + d[2] * cyw;
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      // the trail of the moving fingertips (the last half second)
      if (!o.noTrail) for (const [hh, key] of [[R, 'R'], [L, 'L']]) {
        const tr = this.trail[key];
        if (hh && this.busy) { tr.push({ p: hh.W(refPoint(hh.g, 'ti')), t: this.t }); } while (tr.length && (this.t - tr[0].t > .55 || !this.busy)) tr.shift();
        if (tr.length > 2) { c.lineCap = c.lineJoin = 'round'; for (let i = 1; i < tr.length; i++) { const a = pr(tr[i - 1].p), b = pr(tr[i].p), al = (1 - (this.t - tr[i].t) / .55) * .5; c.strokeStyle = `rgba(120,140,255,${al.toFixed(3)})`; c.lineWidth = k * .16 * (.4 + al); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } }
      }
      const hands = [[L, true], [R, false]].filter(x2 => x2[0]).sort((p, q) => p[0].wrist[2] - q[0].wrist[2]);
      for (const [hh, left] of hands) {
        c.save(); if (left) c.globalAlpha = clamp(this.cur.lAlpha, 0, 1);
        drawWrist(c, hh, left, pr, k, this.skin); drawHand(c, hh, pr, k, this.skin);
        c.restore();
      }
      c.restore();
      // where on the body, and the face that goes with it
      if (!o.noBadge && wn && (wn.place || (this.cur.face && FACES[this.cur.face.mood]))) {
        const r = Math.min(w, h) * (o.badge || .11);
        drawBadge(c, x + r * 1.35, y + r * 1.35, r, wn.place, this.cur.face && this.cur.face.mood, this.t);
      }
    }
  }
  function bounds(ps, pad) { let a = 1e9, b = 1e9, c2 = -1e9, d = -1e9; for (const q of ps) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c2 = Math.max(c2, q[0]); d = Math.max(d, q[1]); } return [a - pad, b - pad, c2 + pad, d + pad]; }
  function grow(b, min) { const w = b[2] - b[0], h = b[3] - b[1]; if (w < min) { b[0] -= (min - w) / 2; b[2] += (min - w) / 2; } if (h < min) { b[1] -= (min - h) / 2; b[3] += (min - h) / 2; } return b; }
  SPG.sign = { Signer, HS, built, placeHand, drawHand, drawBadge, SKINS, handGeom, refPoint, dirOf, placeOf, SIGNS, LOC, chain, thumbChain, _internal: { shape, sp, E, FIST, CURL, FING, THUMB, PALM, SHOULDER, UPPER, FORE, H, REST_R, sign, add, sub, mul, dot, cross, norm, len, lerp, lerp3, ease, clamp, mixShape } };
})();
