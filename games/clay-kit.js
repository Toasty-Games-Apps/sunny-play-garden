// Clay kit: the shapes and the drawing behind Clay Corner (games/clay.js).
// A piece of clay is a smooth outline (a closed list of points in board units, 0..1 across the board; holes are extra outlines wound the
// other way) with a thickness. Its picture is drawn at full screen resolution from that outline: a coloured body, soft form shading that
// follows the outline (light from the top left), a crisp rim light and a rim shadow, a faint grain, dents, and a cast shadow on the mat.
// Because it is drawn from the outline, edges are always sharp and clean at any size, and pulling, cutting and squishing just move points.
(() => {
  const SPG = window.SPG, TAU = Math.PI * 2, K = SPG.clayKit = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  K.rnd = rnd; K.mixc = mixc; K.rgba = rgba;

  /* ------------------------------------------------------------ geometry */
  K.area = c => { let a = 0; for (let i = 0, n = c.length; i < n; i++) { const p = c[i], q = c[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  K.orient = (c, positive) => ((K.area(c) >= 0) === positive ? c : c.slice().reverse());
  K.centroid = c => {
    let a = 0, x = 0, y = 0; const n = c.length;
    for (let i = 0; i < n; i++) { const p = c[i], q = c[(i + 1) % n], f = p[0] * q[1] - q[0] * p[1]; a += f; x += (p[0] + q[0]) * f; y += (p[1] + q[1]) * f; }
    if (Math.abs(a) < 1e-10) { let sx = 0, sy = 0; for (const p of c) { sx += p[0]; sy += p[1]; } return [sx / n, sy / n]; }
    return [x / (3 * a), y / (3 * a)];
  };
  K.bbox = conts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const c of conts) for (const p of c) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return { x0, y0, x1, y1 }; };
  K.inside = (pt, c) => {
    let ins = false;
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) { const a = c[i], b = c[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; }
    return ins;
  };
  K.inPiece = (pt, p) => { if (!K.inside(pt, p.cont[0])) return false; for (let i = 1; i < p.cont.length; i++) if (K.inside(pt, p.cont[i])) return false; return true; };
  // the distance from a point to the outline of a piece
  K.edgeDist = (pt, c) => { let best = 1e9; for (let i = 0, n = c.length; i < n; i++) { const a = c[i], b = c[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 > 1e-12 ? clamp(((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2, 0, 1) : 0, d = Math.hypot(pt[0] - a[0] - dx * t, pt[1] - a[1] - dy * t); if (d < best) best = d; } return best; };
  // evenly spaced points round a closed outline
  K.resample = (c, sp) => {
    const n = c.length; let tot = 0; const len = [0];
    for (let i = 0; i < n; i++) { const a = c[i], b = c[(i + 1) % n]; tot += Math.hypot(b[0] - a[0], b[1] - a[1]); len.push(tot); }
    const m = Math.max(10, Math.round(tot / sp)), out = []; let k = 0;
    for (let i = 0; i < m; i++) { const d = tot * i / m; while (k < n - 1 && len[k + 1] < d) k++; const a = c[k], b = c[(k + 1) % n], seg = len[k + 1] - len[k], t = seg > 1e-12 ? (d - len[k]) / seg : 0; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    return out;
  };
  // keep an outline's points reasonably even: split long segments, drop tiny ones
  K.tidy = (c, maxSeg, minSeg) => {
    const out = []; const n = c.length;
    for (let i = 0; i < n; i++) {
      const a = c[i], b = c[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!out.length || Math.hypot(a[0] - out[out.length - 1][0], a[1] - out[out.length - 1][1]) >= minSeg) out.push(a);
      if (d > maxSeg) { const k = Math.ceil(d / maxSeg); for (let q = 1; q < k; q++) out.push([a[0] + (b[0] - a[0]) * q / k, a[1] + (b[1] - a[1]) * q / k]); }
    }
    return out.length >= 6 ? out : c;
  };
  K.smooth = (c, k, iters = 1) => {
    let cur = c;
    for (let it = 0; it < iters; it++) { const n = cur.length; cur = cur.map((p, i) => { const a = cur[(i + n - 1) % n], b = cur[(i + 1) % n]; return [p[0] + ((a[0] + b[0]) / 2 - p[0]) * k, p[1] + ((a[1] + b[1]) / 2 - p[1]) * k]; }); }
    return cur;
  };
  // rounds off corners (Chaikin)
  K.round = (c, iters) => {
    let cur = c;
    for (let it = 0; it < iters; it++) { const n = cur.length, out = []; for (let i = 0; i < n; i++) { const a = cur[i], b = cur[(i + 1) % n]; out.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } cur = out; }
    return cur;
  };
  const segHit = (a, b, c, d) => {   // fraction along a-b where it crosses c-d, and the fraction along c-d; null if they do not cross
    const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1], den = rx * sy - ry * sx; if (Math.abs(den) < 1e-12) return null;
    const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
    return t >= 0 && t <= 1 && u >= 0 && u < 1 ? [t, u] : null;
  };
  // cut an outline along the line a-b: two outlines, or null when the line does not go right through it
  K.split = (c, a, b) => {
    const n = c.length, hits = [];
    for (let i = 0; i < n; i++) { const h = segHit(a, b, c[i], c[(i + 1) % n]); if (h) hits.push({ i, u: h[0], t: h[1], p: [c[i][0] + (c[(i + 1) % n][0] - c[i][0]) * h[1], c[i][1] + (c[(i + 1) % n][1] - c[i][1]) * h[1]] }); }
    if (hits.length < 2) return null;
    hits.sort((x, y) => x.u - y.u); const h0 = hits[0], h1 = hits[hits.length - 1]; if (h0.i === h1.i) return null;
    const walk = (from, to) => { const out = [from.p]; let k = (from.i + 1) % n; for (let g = 0; g < n + 1; g++) { out.push(c[k]); if (k === to.i) break; k = (k + 1) % n; } out.push(to.p); return out; };
    const A = walk(h0, h1), B = walk(h1, h0);
    return A.length >= 4 && B.length >= 4 ? [A, B] : null;
  };

  /* ------------------------------------------------------------ making outlines */
  // a hand-rolled ball: very slightly lumpy, never a perfect circle
  K.circle = (cx, cy, r, seed = 1, n = 56) => {
    const p1 = rnd(seed) * TAU, p2 = rnd(seed + 7) * TAU, p3 = rnd(seed + 13) * TAU, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (1 + .02 * Math.sin(2 * a + p1) + .016 * Math.sin(3 * a + p2) + .008 * Math.sin(5 * a + p3)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return pts;
  };
  // a rope along a path (points in board units), r its radius; rounded ends, a little lumpy like a hand-rolled snake
  K.rope = (path, r, seed = 1) => {
    let pts = [path[0]]; for (let i = 1; i < path.length; i++) if (Math.hypot(path[i][0] - pts[pts.length - 1][0], path[i][1] - pts[pts.length - 1][1]) >= r * .3) pts.push(path[i]);
    if (pts.length < 2) return K.circle(path[0][0], path[0][1], r, seed);
    if (pts.length >= 3) {   // a smooth curve through the points (Catmull-Rom), so the rope bends like rolled dough instead of in straight stretches
      const q = [], n = pts.length;
      for (let i = 0; i < n - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)], seg = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / (r * .35)));
        for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t; q.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } }
      q.push(pts[n - 1]); pts = q;
    }
    const m = pts.length, left = [], right = [], rad = i => r * (1 + .025 * Math.sin(i * .5 + seed) + .015 * Math.sin(i * 1.3 + seed * 2));
    for (let i = 0; i < m; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const nx = -ty, ny = tx, rr = rad(i); left.push([pts[i][0] + nx * rr, pts[i][1] + ny * rr]); right.push([pts[i][0] - nx * rr, pts[i][1] - ny * rr]);
    }
    // the end caps: half circles that bulge outwards along the path direction
    const endCap = (p, dir, nx, ny, rr) => { const out = []; for (let k = 1; k < 9; k++) { const a = Math.PI * k / 9; out.push([p[0] + nx * Math.cos(a) * rr + dir[0] * Math.sin(a) * rr, p[1] + ny * Math.cos(a) * rr + dir[1] * Math.sin(a) * rr]); } return out; };
    const e = pts[m - 1], e0 = pts[m - 2], s = pts[0], s1 = pts[1];
    let ed = [e[0] - e0[0], e[1] - e0[1]], el = Math.hypot(ed[0], ed[1]) || 1; ed = [ed[0] / el, ed[1] / el];
    let sd = [s[0] - s1[0], s[1] - s1[1]], sl = Math.hypot(sd[0], sd[1]) || 1; sd = [sd[0] / sl, sd[1] / sl];
    const poly = [...left, ...endCap(e, ed, -ed[1], ed[0], rad(m - 1)), ...right.reverse(), ...endCap(s, sd, -sd[1], sd[0], rad(0))];
    return K.orient(K.smooth(K.resample(poly, r * .3), .5, 3), true);
  };

  /* ------------------------------------------------------------ cutter and stamp shapes (unit size, centred on 0, 0) */
  const rayFar = (pr, d) => {
    if (pr.c) { const b = d[0] * pr.c[0] + d[1] * pr.c[1], disc = b * b - (pr.c[0] * pr.c[0] + pr.c[1] * pr.c[1] - pr.r * pr.r); return disc < 0 ? 0 : Math.max(0, b + Math.sqrt(disc)); }
    let best = 0; const q = pr.p;
    for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-9) continue; const t = (a[0] * ey - a[1] * ex) / den, u = (a[0] * d[1] - a[1] * d[0]) / den; if (t > 0 && u >= 0 && u <= 1 && t > best) best = t; }
    return best;
  };
  const polar = (prims, n = 120) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, d = [Math.cos(a), Math.sin(a)]; let r = 0; for (const pr of prims) r = Math.max(r, rayFar(pr, d)); out.push([d[0] * r, d[1] * r]); } return out; };
  const circ = (cx, cy, r, n = 28) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const ell = (cx, cy, rx, ry, n = 28) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  const rrect = (x, y, w, h, r, n = 5) => { const o = [], cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]]; for (const [cx, cy, a0] of cs) for (let k = 0; k <= n; k++) { const a = a0 + Math.PI / 2 * k / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const SH = {
    circle: () => [circ(0, 0, 1, 64)],
    square: () => [rrect(-.86, -.86, 1.72, 1.72, .3, 8)],
    heart: () => { const o = []; for (let i = 0; i < 80; i++) { const t = i / 80 * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); o.push([x / 16.5 * 1.05, y / 16.5 * 1.05 + .05]); } return [o]; },
    star: () => { const o = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? .5 : 1.08; o.push([Math.cos(a) * q, Math.sin(a) * q + .06]); } return [K.round(o, 3)]; },
    flower: () => { const o = []; for (let i = 0; i < 96; i++) { const a = i / 96 * TAU, r = .74 + .26 * Math.cos(6 * a); o.push([Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08]); } return [o]; },
    triangle: () => [K.round([[0, -.98], [1, .72], [-1, .72]], 4)],
    bear: () => [polar([{ c: [0, .12], r: .8 }, { c: [-.64, -.52], r: .36 }, { c: [.64, -.52], r: .36 }])],
    cat: () => [K.round(polar([{ c: [0, .18], r: .78 }, { p: [[-.78, -.15], [-.66, -1], [-.1, -.5]] }, { p: [[.78, -.15], [.66, -1], [.1, -.5]] }]), 1)],
    // stamps
    dots: () => [circ(-.5, -.35, .27), circ(.5, -.35, .27), circ(0, .52, .27)],
    paw: () => [ell(0, .38, .54, .44), circ(-.74, -.06, .23), circ(-.27, -.54, .23), circ(.27, -.54, .23), circ(.74, -.06, .23)],
    ridges: () => [-2, -1, 0, 1, 2].map(i => rrect(i * .36 - .09, -.8, .18, 1.6, .09, 4)),
    ring: () => [circ(0, 0, .88, 40), circ(0, 0, .52, 40).reverse()],
    zigzag: () => { const p = [[-.95, -.3], [-.48, .32], [0, -.3], [.48, .32], [.95, -.3]], o = []; for (const [x, y] of p) o.push([x, y - .12]); for (let i = p.length - 1; i >= 0; i--) o.push([p[i][0], p[i][1] + .2]); return [o]; }
  };
  K.CUTTERS = ['circle', 'square', 'heart', 'star', 'flower', 'triangle', 'bear', 'cat'];
  K.STAMPS = ['dots', 'star', 'heart', 'flower', 'paw', 'ridges', 'ring', 'zigzag'];
  // the outlines of a shape at size r, turned by a, centred at (cx, cy); the first outline is wound the right way for a filled shape, the rest are holes
  K.shape = (kind, r, cx = 0, cy = 0, a = 0) => {
    const f = SH[kind] || SH.circle, ca = Math.cos(a), sa = Math.sin(a);
    return f().map(c => c.map(p => [cx + (p[0] * ca - p[1] * sa) * r, cy + (p[0] * sa + p[1] * ca) * r]));
  };
  K.shapePath = (c, kind, r) => { c.beginPath(); for (const o of SH[kind]()) { o.forEach((p, i) => i ? c.lineTo(p[0] * r, p[1] * r) : c.moveTo(p[0] * r, p[1] * r)); c.closePath(); } };

  /* ------------------------------------------------------------ drawing a piece */
  let noiseCv = null;
  const noise = () => {
    if (noiseCv) return noiseCv; const n = 160, cv = document.createElement('canvas'); cv.width = cv.height = n; const g = cv.getContext('2d'), im = g.createImageData(n, n), d = im.data;
    const vn = (x, y, cell, sd) => { const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy, sx = ax * ax * (3 - 2 * ax), sy = ay * ay * (3 - 2 * ay), W = n / cell, h = (i, j) => rnd(((i % W + W) % W) * 31 + ((j % W + W) % W) * 57 + sd); return (h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx) * (1 - sy) + (h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx) * sy; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = (rnd(x * 7.3 + y * 13.1) - .5) * .9 + (vn(x, y, 5, 3) - .5) * .8 + (vn(x, y, 16, 9) - .5) * .5, o = (y * n + x) * 4, c = v > 0 ? 255 : 0; d[o] = d[o + 1] = d[o + 2] = c; d[o + 3] = Math.min(255, Math.abs(v) * 190); }
    g.putImageData(im, 0, 0); return noiseCv = cv;
  };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const BIG = 6000;
  // paints what is outside the mask O (as a shadow) into the body: this is what gives a piece its rounded, lit look
  const inset = (g, O, color, blur, dx, dy) => { g.save(); g.shadowColor = color; g.shadowBlur = blur; g.shadowOffsetX = dx + BIG; g.shadowOffsetY = dy; g.drawImage(O, -BIG, 0); g.restore(); };
  const fillConts = (g, conts, T, rule) => { g.beginPath(); for (const c of conts) { c.forEach((p, i) => { const q = T(p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); } g.fill(rule || 'nonzero'); };
  const RAINBOW = ['#ff5d6c', '#ff9a45', '#ffd84a', '#7ed957', '#4fc3f7', '#7c6cf0', '#ee68c8', '#ff5d6c'];

  // p: { cont, h (thickness, 0.2 flat ... 1 chunky), rgb, rain, dents: [{ k, x, y, r, a }] }; S: pixels per board unit. Returns { cv, x, y, w, h, S } (x, y: where its corner sits on the board).
  K.sprite = (p, S, opts = {}) => {
    const bb = K.bbox(p.cont), th = clamp(p.h == null ? 1 : p.h, .15, 1), kk = .45 + .55 * th, pad = .015, padB = .09;   // the body is drawn on a tight canvas; only the cast shadow needs the roomier one at the end
    const x0 = bb.x0 - pad, y0 = bb.y0 - pad, w = Math.max(4, Math.ceil((bb.x1 - bb.x0 + pad * 2) * S)), h = Math.max(4, Math.ceil((bb.y1 - bb.y0 + pad * 2) * S));
    const T = q => [(q[0] - x0) * S, (q[1] - y0) * S];
    const conts = p.cont.map((c, i) => K.orient(c, i === 0));
    const M = mk(w, h), m = M.getContext('2d'); m.fillStyle = '#fff'; fillConts(m, conts, T);
    const base = p.rgb || [255, 126, 182], dark = mixc(base.map(v => v * .5), [58, 26, 84], .3), deep = mixc(base.map(v => v * .36), [40, 18, 66], .25), light = mixc(base, [255, 255, 255], .4);
    // the body
    const B = mk(w, h), b = B.getContext('2d'); b.drawImage(M, 0, 0); b.globalCompositeOperation = 'source-in';
    if (p.rain) { const ang = (p.ra == null ? .5 : p.ra), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, L = Math.max(.1, Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0)) / 2, c0 = T([cx - Math.cos(ang) * L, cy - Math.sin(ang) * L]), c1 = T([cx + Math.cos(ang) * L, cy + Math.sin(ang) * L]), g = b.createLinearGradient(c0[0], c0[1], c1[0], c1[1]); RAINBOW.forEach((k, i) => g.addColorStop(i / (RAINBOW.length - 1), k)); b.fillStyle = g; }
    else b.fillStyle = rgba(base);
    b.fillRect(0, 0, w, h); b.globalCompositeOperation = 'source-atop';
    const O = mk(w, h), o = O.getContext('2d'); o.fillStyle = '#000'; o.fillRect(0, 0, w, h); o.globalCompositeOperation = 'destination-out'; o.drawImage(M, 0, 0);
    const minHalf = Math.max(.012, Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2), u = S * clamp(minHalf * .4, .008, .032) * kk;   // the shading is as wide as the piece is thick, so a ball looks like a ball and a rope like a rope
    inset(b, O, rgba(deep, .62), u * 2.1, -u * .55, -u * .7);              // the far side turns away from the light
    inset(b, O, rgba(dark, .5), u * .9, -u * .2, -u * .28);                // and its edge is darker still
    inset(b, O, rgba(light, .6), u * 1.3, u * .4, u * .52);                // the near side catches it
    inset(b, O, rgba(deep, .3), u * .6, 0, 0);                             // a little shade where it meets the mat on every side
    // crisp rim light along the top-left edges and a crisp shadow line along the bottom-right edges
    const rim = (dx, dy, col) => { const R = mk(w, h), r = R.getContext('2d'); r.drawImage(M, 0, 0); r.globalCompositeOperation = 'destination-out'; r.drawImage(M, dx, dy); r.globalCompositeOperation = 'source-in'; r.fillStyle = col; r.fillRect(0, 0, w, h); b.drawImage(R, 0, 0); };
    const rw = Math.max(1.3, u * .15);
    rim(rw, rw * 1.1, 'rgba(255,255,255,.5)'); rim(-rw * .9, -rw, rgba(deep, .38));
    // a gentle overall slope of light across the whole piece, so even a flat sheet is lit from the top left
    { const c0 = T([bb.x0, bb.y0]), c1 = T([bb.x1, bb.y1]), lg2 = b.createLinearGradient(c0[0], c0[1], c1[0], c1[1]); lg2.addColorStop(0, 'rgba(255,255,255,.16)'); lg2.addColorStop(.5, 'rgba(255,255,255,0)'); lg2.addColorStop(1, rgba(deep, .2)); b.fillStyle = lg2; b.fillRect(0, 0, w, h); }
    // a soft glint where the light hits a roundish lump
    const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
    if (Math.max(bw, bh) < Math.min(bw, bh) * 2.2) { const gc = T([bb.x0 + bw * .34, bb.y0 + bh * .3]), gr = Math.min(bw, bh) * S * .3, gg = b.createRadialGradient(gc[0], gc[1], 0, gc[0], gc[1], gr); gg.addColorStop(0, 'rgba(255,255,255,.26)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); b.fillStyle = gg; b.fillRect(0, 0, w, h); }
    // dents: stamps, pokes and cutter marks pressed into the top
    if (p.dents && p.dents.length) {
      for (const d of p.dents) {
        const cs = K.shape(d.k, d.r, d.x, d.y, d.a || 0), D = mk(w, h), dg = D.getContext('2d'); dg.fillStyle = '#fff'; fillConts(dg, cs, T);
        const DO = mk(w, h), dq = DO.getContext('2d'); dq.fillStyle = '#000'; dq.fillRect(0, 0, w, h); dq.globalCompositeOperation = 'destination-out'; dq.drawImage(D, 0, 0);
        const L = mk(w, h), lg = L.getContext('2d'); lg.drawImage(D, 0, 0); lg.globalCompositeOperation = 'source-in'; lg.fillStyle = rgba(dark, .2); lg.fillRect(0, 0, w, h); lg.globalCompositeOperation = 'source-atop';
        const du = Math.max(1.5, d.r * S * .22 * (d.d == null ? 1 : d.d));
        inset(lg, DO, rgba(deep, .75), du * 1.1, du * .55, du * .7); inset(lg, DO, rgba(light, .7), du * .8, -du * .35, -du * .45);
        b.drawImage(L, 0, 0);
      }
    }
    // a faint grain, like real dough
    const pat = b.createPattern(noise(), 'repeat'); if (pat) { b.globalAlpha = .035 + .015 * th; b.fillStyle = pat; b.fillRect(0, 0, w, h); b.globalAlpha = 1; }
    // the finished sprite: a cast shadow on the mat, then the body
    const off = Math.round((padB - pad) * S), W = w + off * 2, Hh = h + off * 2, F = mk(W, Hh), f = F.getContext('2d');
    const shadow = (blur, dx, dy, col) => { f.save(); f.shadowColor = col; f.shadowBlur = blur; f.shadowOffsetX = dx + BIG; f.shadowOffsetY = dy; f.drawImage(M, off - BIG, off); f.restore(); };
    shadow(S * .05 * kk, S * .014 * kk, S * .026 * kk, 'rgba(92,58,44,.30)'); shadow(S * .016, S * .005 * kk, S * .011 * kk, 'rgba(70,40,30,.36)');
    f.drawImage(B, off, off);
    return { cv: F, x: x0 - off / S, y: y0 - off / S, w: W, h: Hh, S };
  };
})();
