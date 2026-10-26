// Coloring Book: a gallery of pictures and a simple, forgiving painting screen.
//
// A picture is a list of sections (games/color-pictures.js). What a child has done to a picture is
// saved as data, not pixels: an ordered list of small operations per picture, in the picture's own
// 1000 x 800 coordinates, so it looks the same on any screen and undo is just "remove the last one".
//
//   [0, section, color]           bucket fill
//   [1, section, color, points]   brush stroke (flat x,y list), clipped to its section
//   [2, section, points]          eraser stroke (paints paper) inside its section
//   [3, section]                  section cleared (eraser tap)
//   [4]                           start over
//   [5, section, color, points]   rainbow brush stroke (the color moves round the rainbow along the stroke, starting at `color`)
//   [6, section, color, points]   glitter brush stroke (sparkles placed by a generator seeded from the points: same every time)
//   [7, section, color, pattern]  pattern fill ('stripes', 'dots', 'hearts', 'stars' in `color` on a paler or deeper tint)
//   [8, null, sticker, x, y, turn] a sticker stamped on top of everything (not clipped), turned `turn` degrees
//   [9, null, x, y]               peel off the top sticker at x, y (the eraser touched it)
//
// Paint never crosses into another section: every operation is clipped to its own section, minus any
// section drawn in front of it. Outlines and fixed details are drawn on a separate layer on top, and stickers
// on a third layer above that. Old saves only hold operations 0 to 4, and look exactly as before.
(() => {
  const SPG = window.SPG;
  const { art, sfx, store, voice } = SPG;
  const K = SPG.pictureKit;
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const PICS = SPG.pictures;
  const GROUPS = SPG.pictureGroups;
  // Tabs in a sensible order: everyday collections first, then the holidays through the year (new ones go last).
  const TAB_ORDER = ['friends', 'garden', 'dinosaurs', 'birthday', 'lunar', 'valentine', 'easter', 'summer', 'halloween', 'thanksgiving', 'hanukkah', 'christmas'];
  const rank = g => { const i = TAB_ORDER.indexOf(g.id); return i < 0 ? 99 : i; };
  GROUPS.sort((a, b) => rank(a) - rank(b));
  const groupOf = id => GROUPS.find(g => g.id === id) || GROUPS[0];

  /* ---------------------------------------------------------------- which holiday is coming up */
  // Lunar New Year and the first night of Hanukkah move every year, so they come from a short table (and a sensible guess after it).
  const LUNAR = { 2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8], 2036: [1, 28], 2037: [2, 15], 2038: [2, 4], 2039: [1, 24], 2040: [2, 12] };
  const HANUKKAH = { 2025: [12, 14], 2026: [12, 4], 2027: [12, 24], 2028: [12, 12], 2029: [12, 1], 2030: [12, 20], 2031: [12, 9], 2032: [11, 27], 2033: [12, 16], 2034: [12, 6], 2035: [12, 25], 2036: [12, 13], 2037: [12, 2], 2038: [12, 21], 2039: [12, 11], 2040: [11, 29] };
  const dayNo = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 864e5);
  const easterDay = y => {   // Western Easter Sunday (anonymous Gregorian algorithm)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = (h + l - 7 * m + 114) % 31 + 1;
    return dayNo(y, mo, da);
  };
  // Every collection whose holiday is coming up (or going on) today, the nearest holiday first. The gallery opens on the first
  // one this player has not been shown yet this year, so two holidays close together (Lunar New Year and Valentine's Day,
  // Hanukkah and Christmas) both get their turn.
  function seasonsNow(date = new Date()) {
    const y = date.getFullYear(), t = dayNo(y, date.getMonth() + 1, date.getDate()), at = (m, d) => dayNo(y, m, d), out = [];
    const win = (id, from, to, when) => { if (t >= from && t <= to) out.push([when, id]); };
    const ln = LUNAR[y] ? at(...LUNAR[y]) : at(2, 5); win('lunar', ln - 14, ln + 7, ln);
    win('valentine', at(2, 1), at(2, 14), at(2, 14));
    const ea = easterDay(y); win('easter', Math.max(at(3, 15), ea - 21), ea + 1, ea);
    win('summer', at(7, 1), at(7, 7), at(7, 4));
    win('halloween', at(9, 20), at(10, 31), at(10, 31));
    const nov1 = new Date(y, 10, 1).getDay(), thanks = at(11, 1 + (4 - nov1 + 7) % 7 + 21); win('thanksgiving', at(11, 1), at(11, 26), thanks);
    const hn = HANUKKAH[y] ? at(...HANUKKAH[y]) : at(12, 10); win('hanukkah', hn - 10, hn + 7, hn);
    win('christmas', at(11, 27), at(12, 31), at(12, 25));
    return out.sort((a, b) => a[0] - b[0]).map(x => x[1]);
  }

  const INK = '#5a3f5e', PAPER = '#fffdf6', OUTLINE = 10;
  const W = 1000, H = 800;
  // Append new colors at the end only: saved pictures store the position in this list.
  const PALETTE = ['#ff6b81', '#ff9d4d', '#ffd54a', '#a6e05a', '#59b96e', '#6fd6b8', '#7fd4f5', '#4f8fe8', '#9a7be8', '#ff9db8', '#ffd2a6', '#b9805a', '#d9d2e0', '#5a3f5e',
    '#e8423f', '#ffd0e0', '#e9b72c', '#c4f0d8', '#bfe4ff', '#2f4f99', '#d8c6f7', '#2e7d4a', '#2b2630', '#ffffff'];
  // The order the swatches are shown in (round the rainbow, then browns, greys, black and white). Only the display order.
  const SHOW = [14, 0, 9, 15, 1, 10, 16, 2, 3, 4, 21, 17, 5, 18, 6, 7, 19, 20, 8, 11, 13, 12, 22, 23];
  const BRUSH = 34, ERASER = 64;
  const FILL = 0, BRUSHOP = 1, ERASE = 2, CLEAR = 3, ALL = 4, RAINBOW = 5, GLITTER = 6, PATTERN = 7, STICKER = 8, PEEL = 9, MAX_OPS = 1200, MAX_STICKERS = 150;
  const STROKES = new Set([BRUSHOP, ERASE, RAINBOW, GLITTER]);
  const PATTERNS = ['stripes', 'dots', 'hearts', 'stars'];      // saved by name: only ever add
  const FILLS = ['plain', ...PATTERNS], BRUSHES = ['plain', 'rainbow', 'glitter'];
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------------- color helpers */
  const rgbOf = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const INK_RGB = rgbOf(INK);
  const mix = (h, k, to = [255, 255, 255]) => `rgb(${rgbOf(h).map((v, i) => Math.round(v + (to[i] - v) * k)).join(',')})`;
  const lum = h => { const [r, g, b] = rgbOf(h); return (r * .299 + g * .587 + b * .114) / 255; };
  const hueOf = h => {
    const [r, g, b] = rgbOf(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < .08) return 0;
    const hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (hh * 60 + 360) % 360;
  };
  const rainbowAt = (h0, len) => `hsl(${Math.round(h0 + len * .9) % 360},88%,62%)`;
  // A small, fast random number generator: the same seed always gives the same sparkles.
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const seedOf = pts => { let h = 2166136261; for (const v of pts) { h ^= v & 0xffff; h = Math.imul(h, 16777619); } return h >>> 0; };
  const heartD = (cx, cy, s) => `M${cx} ${cy + .9 * s}C${cx - 1.25 * s} ${cy + .05 * s} ${cx - 1.05 * s} ${cy - 1.05 * s} ${cx} ${cy - .45 * s}C${cx + 1.05 * s} ${cy - 1.05 * s} ${cx + 1.25 * s} ${cy + .05 * s} ${cx} ${cy + .9 * s}Z`;

  const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.filter(k => k != null)); return e; };
  const icon = id => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'ico'); s.innerHTML = `<use href="#i-${id}"/>`; return s; };
  const btn = (cls, label, ...kids) => { const b = el('button', cls, ...kids); b.type = 'button'; b.setAttribute('aria-label', SPG.t(label)); return b; };

  /* ================================================================ engine */

  const compiled = new Map();
  const hitCtx = document.createElement('canvas').getContext('2d');

  // Turn a picture definition into Path2D objects, and work out which sections sit in front of which.
  function compile(def) {
    if (compiled.has(def.id)) return compiled.get(def.id);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', 10); svg.setAttribute('height', 10);
    svg.style.cssText = 'position:absolute;left:-99px;top:0;visibility:hidden;pointer-events:none';
    document.body.append(svg);
    const secs = def.sections.map((s, i) => {
      const pe = document.createElementNS(NS, 'path'); pe.setAttribute('d', s.d); svg.append(pe);
      const bb = pe.getBBox();
      return {
        i, id: s.id, path: new Path2D(s.d), outer: new Path2D(`M-60 -60H1060V860H-60Z${s.d}`), bb,
        small: Math.min(bb.width, bb.height) < 90,
        det: (s.det || []).map(d => ({ path: new Path2D(d.d), f: d.f, w: d.w }))
      };
    });
    svg.remove();
    const near = (a, b) => a.bb.x < b.bb.x + b.bb.width + 12 && b.bb.x < a.bb.x + a.bb.width + 12 && a.bb.y < b.bb.y + b.bb.height + 12 && b.bb.y < a.bb.y + a.bb.height + 12;
    secs.forEach((s, i) => { s.occ = secs.slice(i + 1).filter(o => near(s, o)); });
    const sheet = { def, secs, byId: Object.fromEntries(secs.map(s => [s.id, s])), alias: def.alias || {} };
    compiled.set(def.id, sheet);
    return sheet;
  }

  // Which section is under this point? Tiny sections get a little extra reach so they are easy to hit.
  function hit(sheet, x, y) {
    const secs = sheet.secs;
    let exact = -1;
    for (let i = secs.length - 1; i >= 0; i--) if (hitCtx.isPointInPath(secs[i].path, x, y)) { exact = i; break; }
    hitCtx.lineWidth = 34;
    for (let i = secs.length - 1; i > exact; i--) if (secs[i].small && hitCtx.isPointInStroke(secs[i].path, x, y)) return secs[i];
    return exact >= 0 ? secs[exact] : secs[0];
  }

  // Run fn with drawing limited to a section, minus whatever is in front of it.
  function within(ctx, sec, fn) {
    ctx.save();
    ctx.clip(sec.path);
    for (const o of sec.occ) ctx.clip(o.outer, 'evenodd');
    try { fn(); } finally { ctx.restore(); }
  }
  function stroke(ctx, pts, color, width) {
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    if (pts.length <= 2) { ctx.arc(pts[0], pts[1], width / 2, 0, TAU); ctx.fill(); return; }
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  }
  // Rainbow brush: the stroke is cut into short pieces and each piece gets the next color round the rainbow. `len` is how
  // far along the stroke these points start (so a stroke drawn bit by bit matches one drawn at once). Returns the new length.
  function rainbowStroke(ctx, pts, ci, width, len = 0) {
    const h0 = hueOf(PALETTE[ci] || PALETTE[0]);
    ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = 'round';
    if (pts.length <= 2) { ctx.fillStyle = rainbowAt(h0, len); ctx.beginPath(); ctx.arc(pts[0], pts[1], width / 2, 0, TAU); ctx.fill(); return len; }
    for (let i = 2; i < pts.length; i += 2) {
      const x0 = pts[i - 2], y0 = pts[i - 1], dx = pts[i] - x0, dy = pts[i + 1] - y0, d = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(d / 8));
      for (let k = 0; k < n; k++) {
        ctx.strokeStyle = rainbowAt(h0, len + d * (k + .5) / n);
        ctx.beginPath(); ctx.moveTo(x0 + dx * k / n, y0 + dy * k / n); ctx.lineTo(x0 + dx * (k + 1) / n, y0 + dy * (k + 1) / n); ctx.stroke();
      }
      len += d;
    }
    return len;
  }
  // A tiny four-pointed twinkle.
  function twinkle(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x + s * .18, y - s * .18, x + s, y); ctx.quadraticCurveTo(x + s * .18, y + s * .18, x, y + s);
    ctx.quadraticCurveTo(x - s * .18, y + s * .18, x - s, y); ctx.quadraticCurveTo(x - s * .18, y - s * .18, x, y - s); ctx.fill();
  }
  // Sparkles scattered along a stroke. With R = rng(seed) they land in the same places every time the picture is drawn.
  function sparkles(ctx, pts, col, width, R) {
    const light = lum(col) > .72, cols = light ? [mix(col, .5, [176, 126, 0]), mix(col, .45, INK_RGB), '#ffffff'] : ['#ffffff', '#fff3a8', mix(col, .62)];
    const step = width * .2, s = width / 34;
    const put = (x, y) => {
      const a = R() * TAU, r = Math.sqrt(R()) * width * .4, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, k = R(), sz = (2 + R() * 4.2) * s;
      ctx.fillStyle = cols[Math.floor(R() * cols.length)];
      if (k < .32) twinkle(ctx, px, py, sz * 1.7); else { ctx.beginPath(); ctx.arc(px, py, sz * .55, 0, TAU); ctx.fill(); }
    };
    if (pts.length <= 2) { for (let i = 0; i < 7; i++) put(pts[0], pts[1]); return; }
    let t = 0;
    for (let i = 2; i < pts.length; i += 2) {
      const x0 = pts[i - 2], y0 = pts[i - 1], dx = pts[i] - x0, dy = pts[i + 1] - y0, d = Math.hypot(dx, dy);
      for (; t < d; t += step) put(x0 + dx * t / d, y0 + dy * t / d);
      t -= d;
    }
  }
  function glitterStroke(ctx, pts, ci, width) {
    const col = PALETTE[ci] || PALETTE[0];
    stroke(ctx, pts, col, width);
    ctx.save(); ctx.globalAlpha = .4; stroke(ctx, pts, mix(col, .65), width * .42); ctx.restore();
    sparkles(ctx, pts, col, width, rng(seedOf(pts)));
  }
  // Pattern fill: the section gets a paler tint of the color (a deeper one for very light colors) with the pattern on top.
  // The pattern sits on one grid for the whole picture, so two neighbouring sections with the same pattern line up.
  function patternFill(ctx, path, bb, ci, kind) {
    const col = PALETTE[ci] || PALETTE[0];
    ctx.fillStyle = lum(col) > .8 ? mix(col, .3, INK_RGB) : mix(col, .72); ctx.fill(path);
    ctx.fillStyle = ctx.strokeStyle = col;
    const x0 = bb.x - 40, y0 = bb.y - 40, x1 = bb.x + bb.width + 40, y1 = bb.y + bb.height + 40;
    if (kind === 'stripes') {
      ctx.lineWidth = 20; ctx.lineCap = 'butt'; ctx.beginPath();
      for (let k = Math.floor((x0 + y0) / 52) * 52; k < x1 + y1; k += 52) { ctx.moveTo(k - y0, y0); ctx.lineTo(k - y1, y1); }
      ctx.stroke(); return;
    }
    const G = kind === 'dots' ? 48 : 62, p = new Path2D();
    for (let gy = Math.floor(y0 / G) * G, row = Math.floor(y0 / G); gy < y1; gy += G, row++) {
      for (let gx = Math.floor(x0 / G) * G + (row & 1 ? G / 2 : 0); gx < x1; gx += G) {
        if (kind === 'dots') { p.moveTo(gx + 11, gy); p.arc(gx, gy, 11, 0, TAU); }
        else if (kind === 'hearts') p.addPath(new Path2D(heartD(gx, gy - 2, 15)));
        else { for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * D2R, r = i % 2 ? 7.5 : 17; i ? p.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r) : p.moveTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r); } p.closePath(); }
      }
    }
    ctx.fill(p);
  }
  function applyOp(ctx, sheet, op) {
    const k = op[0];
    if (k === ALL) { ctx.fillStyle = PAPER; ctx.fillRect(-10, -10, W + 20, H + 20); return; }
    if (k === STICKER || k === PEEL) return;          // stickers live on their own layer (drawStickers)
    // Pictures colored before a section was split into separate shapes still apply to every part.
    for (const id of sheet.alias[op[1]] || [op[1]]) {
      const sec = sheet.byId[id]; if (!sec) continue;
      if (k === FILL || k === CLEAR) within(ctx, sec, () => { ctx.fillStyle = k === FILL ? PALETTE[op[2]] : PAPER; ctx.fill(sec.path); });
      else if (k === BRUSHOP) within(ctx, sec, () => stroke(ctx, op[3], PALETTE[op[2]], BRUSH));
      else if (k === ERASE) within(ctx, sec, () => stroke(ctx, op[2], PAPER, ERASER));
      else if (k === RAINBOW) within(ctx, sec, () => rainbowStroke(ctx, op[3], op[2], BRUSH));
      else if (k === GLITTER) within(ctx, sec, () => glitterStroke(ctx, op[3], op[2], BRUSH));
      else if (k === PATTERN) within(ctx, sec, () => patternFill(ctx, sec.path, sec.bb, op[2], op[3]));
    }
  }
  const paintAll = (ctx, sheet, ops) => { ctx.fillStyle = PAPER; ctx.fillRect(-10, -10, W + 20, H + 20); for (const op of ops) applyOp(ctx, sheet, op); };

  /* ---------------------------------------------------------------- stickers */
  // Each sticker is drawn in a 100 x 100 box around (0, 0): `sil` is its outline (it gets a white die-cut edge and a soft
  // shadow, like a real sticker) and `draw` paints it. Sticker ids are saved with the picture: never rename one, only add.
  const STICKER_R = 64;
  const STICKER_ART = (() => {
    const fillD = (c, d, f, line = true) => { const p = new Path2D(d); c.fillStyle = f; c.fill(p); if (line) { c.strokeStyle = INK; c.lineWidth = 3.5; c.stroke(p); } };
    const dot = (c, x, y, r, f = INK) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
    const smile = (c, x, y, w) => { c.strokeStyle = INK; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y + w * .9, x + w, y); c.stroke(); };
    const faceAt = (c, x, y, s = 1) => { dot(c, x - 9 * s, y, 3.4 * s); dot(c, x + 9 * s, y, 3.4 * s); smile(c, x, y + 7 * s, 6 * s); dot(c, x - 16 * s, y + 8 * s, 4 * s, 'rgba(255,110,140,.45)'); dot(c, x + 16 * s, y + 8 * s, 4 * s, 'rgba(255,110,140,.45)'); };
    const shine = (c, x, y, rx, ry) => { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x, y, rx, ry, -.5, 0, TAU); c.fill(); };
    const line = (c, pts, w = 3.5) => { c.strokeStyle = INK; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
    const ring = (cx, cy, R, r, a0 = 180, a1 = 360) => { const p = (a, k) => `${cx + Math.cos(a * D2R) * k} ${cy + Math.sin(a * D2R) * k}`; return `M${p(a0, R)}A${R} ${R} 0 0 1 ${p(a1, R)}L${p(a1, r)}A${r} ${r} 0 0 0 ${p(a0, r)}Z`; };
    const wings = K.compound(K.ell(-23, -15, 25, 21, -15), K.ell(23, -15, 25, 21, 15), K.ell(-17, 17, 17, 15), K.ell(17, 17, 17, 15), K.ell(0, 0, 8, 26));
    const cupFrost = 'M-36 8C-46 -10 -28 -26 -13 -21C-9 -40 13 -40 16 -23C31 -28 46 -12 36 8Z';
    const crownD = 'M-44 30L-44 -18L-23 2L0 -30L23 2L44 -18L44 30Z';
    return {
      star: { sil: K.star(0, 4, 50, 23), draw(c) { fillD(c, K.star(0, 4, 50, 23), '#ffd54a'); fillD(c, K.star(-3, 1, 24, 11), '#fff3b0', false); faceAt(c, 0, 8, .8); } },
      heart: { sil: heartD(0, -6, 50), draw(c) { fillD(c, heartD(0, -6, 50), '#ff6b81'); shine(c, -20, -18, 9, 6); faceAt(c, 0, 0, .9); } },
      flower: { sil: K.flower(0, 0, 50, .38, 5), draw(c) { fillD(c, K.flower(0, 0, 50, .38, 5), '#ff9db8'); fillD(c, K.circ(0, 0, 19), '#ffd54a'); faceAt(c, 0, -2, .62); } },
      butterfly: { sil: wings, draw(c) { line(c, [[-3, -22], [-12, -42]]); line(c, [[3, -22], [12, -42]]); dot(c, -12, -42, 4); dot(c, 12, -42, 4); fillD(c, K.compound(K.ell(-23, -15, 25, 21, -15), K.ell(23, -15, 25, 21, 15)), '#9a7be8'); fillD(c, K.compound(K.ell(-17, 17, 17, 15), K.ell(17, 17, 17, 15)), '#7fd4f5'); dot(c, -24, -16, 7, '#fff'); dot(c, 24, -16, 7, '#fff'); fillD(c, K.ell(0, 0, 8, 26), INK, false); } },
      sun: { sil: K.star(0, 0, 50, 36, 12), draw(c) { fillD(c, K.star(0, 0, 50, 36, 12), '#ff9d4d'); fillD(c, K.circ(0, 0, 33), '#ffd54a'); faceAt(c, 0, -3, 1); } },
      rainbow: {
        sil: ring(0, 18, 50, 18) + K.compound(K.circ(-36, 22, 14), K.circ(36, 22, 14)),
        draw(c) { ['#e8423f', '#ff9d4d', '#ffd54a', '#59b96e', '#4f8fe8'].forEach((f, i) => fillD(c, ring(0, 18, 50 - i * 6.4, 43.6 - i * 6.4), f, false)); fillD(c, ring(0, 18, 50, 18), 'rgba(0,0,0,0)'); [[-38, 22, 13], [-25, 26, 10], [38, 22, 13], [25, 26, 10]].forEach(([x, y, r]) => fillD(c, K.circ(x, y, r), '#fff')); }
      },
      cupcake: { sil: K.compound('M-31 4L31 4L23 44L-23 44Z', cupFrost, K.circ(0, -35, 10)), draw(c) { fillD(c, 'M-31 4L31 4L23 44L-23 44Z', '#7fd4f5'); line(c, [[-12, 8], [-9, 42]], 3); line(c, [[3, 8], [3, 42]], 3); line(c, [[17, 8], [13, 42]], 3); fillD(c, cupFrost, '#ff9db8'); fillD(c, K.circ(0, -35, 10), '#e8423f'); [[-18, -6, '#ffd54a'], [12, -10, '#4f8fe8'], [-2, -18, '#59b96e'], [22, 0, '#ff9d4d']].forEach(([x, y, f]) => { c.strokeStyle = f; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y - 3); c.stroke(); }); } },
      paw: { sil: K.compound(K.ell(0, 17, 25, 21), K.circ(-29, -8, 11), K.circ(-11, -28, 11), K.circ(11, -28, 11), K.circ(29, -8, 11)), draw(c) { fillD(c, K.ell(0, 17, 25, 21), '#b9805a'); [[-29, -8], [-11, -28], [11, -28], [29, -8]].forEach(([x, y]) => fillD(c, K.circ(x, y, 11), '#b9805a')); shine(c, -8, 8, 7, 4); } },
      ladybug: { sil: K.compound(K.ell(0, -29, 20, 16), K.circ(0, 7, 38)), draw(c) { line(c, [[-6, -40], [-14, -50]]); line(c, [[6, -40], [14, -50]]); fillD(c, K.ell(0, -29, 20, 16), INK, false); fillD(c, K.circ(0, 7, 38), '#e8423f'); line(c, [[0, -30], [0, 44]]); [[-18, -6, 8], [18, -6, 8], [-20, 20, 7], [20, 20, 7], [-6, 32, 5], [6, 32, 5]].forEach(([x, y, r]) => dot(c, x, y, r)); shine(c, -18, -14, 6, 4); } },
      balloon: { sil: K.compound(K.ell(0, -10, 33, 39), 'M-7 33L7 33L0 25Z'), draw(c) { line(c, [[0, 32], [4, 40], [-2, 47], [3, 52]], 3); fillD(c, 'M-7 33L7 33L0 24Z', '#4f8fe8'); fillD(c, K.ell(0, -10, 33, 39), '#4f8fe8'); shine(c, -13, -26, 7, 11); } },
      crown: { sil: K.compound(crownD, K.circ(-44, -20, 7), K.circ(0, -32, 7), K.circ(44, -20, 7)), draw(c) { fillD(c, crownD, '#ffd54a'); fillD(c, 'M-44 14H44V30H-44Z', '#e9b72c'); [[-44, -20], [0, -32], [44, -20]].forEach(([x, y]) => fillD(c, K.circ(x, y, 7), '#fff3b0')); [[-24, 22, '#e8423f'], [0, 22, '#4f8fe8'], [24, 22, '#59b96e']].forEach(([x, y, f]) => fillD(c, K.circ(x, y, 6), f)); } },
      fish: { sil: K.compound(K.ell(-6, 0, 34, 25), 'M22 0L48 -24L46 24Z'), draw(c) { fillD(c, 'M22 0L48 -24L46 24Z', '#ffd54a'); fillD(c, K.ell(-6, 0, 34, 25), '#ff9d4d'); line(c, [[4, -22], [10, 0], [4, 22]]); dot(c, -22, -5, 5); dot(c, -23.5, -6.5, 1.8, '#fff'); smile(c, -30, 6, 5); } }
    };
  })();
  const STICKERS = Object.keys(STICKER_ART);
  const silOf = new Map();
  function drawSticker(ctx, kind, x, y, rot = 0, scale = 1) {
    const a = STICKER_ART[kind]; if (!a) return;
    if (!silOf.has(kind)) silOf.set(kind, new Path2D(a.sil));
    const sil = silOf.get(kind);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * D2R); ctx.scale(scale * STICKER_R / 50, scale * STICKER_R / 50);
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.save(); ctx.translate(0, 4); ctx.fillStyle = ctx.strokeStyle = 'rgba(90,63,94,.22)'; ctx.lineWidth = 15; ctx.stroke(sil); ctx.fill(sil); ctx.restore();
    ctx.strokeStyle = 'rgba(90,63,94,.3)'; ctx.lineWidth = 18; ctx.stroke(sil);
    ctx.fillStyle = ctx.strokeStyle = '#fff'; ctx.lineWidth = 15; ctx.stroke(sil); ctx.fill(sil);
    a.draw(ctx);
    ctx.restore();
  }
  // The stickers still on the page after every peel and start over, in the order they were stuck on.
  function liveStickers(ops) {
    let list = [];
    for (const op of ops) {
      if (op[0] === ALL) list = [];
      else if (op[0] === STICKER) list.push(op);
      else if (op[0] === PEEL) { const i = stickerAt(list, op[2], op[3]); if (i >= 0) list.splice(i, 1); }
    }
    return list;
  }
  const stickerAt = (list, x, y) => { for (let i = list.length - 1; i >= 0; i--) if (Math.hypot(list[i][3] - x, list[i][4] - y) < STICKER_R * .95) return i; return -1; };
  const drawStickers = (ctx, ops) => { for (const op of liveStickers(ops)) drawSticker(ctx, op[2], op[3], op[4], op[5] || 0); };

  // Outlines and fixed details, drawn on top of the paint. Each section's lines are hidden where a
  // section in front of it covers them.
  function drawLines(ctx, sheet) {
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const s of sheet.secs) {
      ctx.save();
      for (const o of s.occ) ctx.clip(o.outer, 'evenodd');
      ctx.strokeStyle = INK; ctx.lineWidth = OUTLINE; ctx.stroke(s.path);
      for (const d of s.det) {
        if (d.f) { ctx.fillStyle = d.f; ctx.fill(d.path); }
        if (d.w) { ctx.strokeStyle = INK; ctx.lineWidth = d.w; ctx.stroke(d.path); }
      }
      ctx.restore();
    }
  }

  // Draw a whole picture (paint + lines + stickers) into ctx at the given width.
  function render(ctx, def, ops, width) {
    const sheet = compile(def), k = width / W;
    ctx.save(); ctx.scale(k, k);
    paintAll(ctx, sheet, ops); drawLines(ctx, sheet); drawStickers(ctx, ops);
    ctx.restore();
  }

  // Keep saves small: an operation is dropped when a later fill or clear of the same section
  // covers it completely, and everything before a "start over" is dropped. Stickers sit on top of all
  // paint, so they always stay; a peeled-off sticker and its peel are both dropped.
  function compact(ops) {
    const out = [], covered = new Set();
    for (let i = ops.length - 1; i >= 0; i--) {
      const op = ops[i];
      if (op[0] === ALL) break;
      if (op[0] === STICKER || op[0] === PEEL) { out.push(op); continue; }
      if (covered.has(op[1])) continue;
      out.push(op);
      if (op[0] === FILL || op[0] === CLEAR || op[0] === PATTERN) covered.add(op[1]);
    }
    out.reverse();
    const live = new Set(liveStickers(out));
    for (let i = out.length - 1; i >= 0; i--) if ((out[i][0] === STICKER && !live.has(out[i])) || out[i][0] === PEEL) out.splice(i, 1);
    // months of scribbling on one page must not fill the device's storage (that would stop every game from saving):
    // past MAX_OPS the oldest brush and eraser strokes, which later paint mostly covers, are let go; fills are tiny and stay
    for (let i = 0, extra = out.length - MAX_OPS; extra > 0 && i < out.length; i++) if (STROKES.has(out[i][0])) { out.splice(i--, 1); extra--; }
    return out;
  }
  const hasPaint = ops => ops.some(op => op[0] !== ALL);

  // Douglas-Peucker: fewer points for the same stroke.
  function simplify(pts, eps = 1.6) {
    const n = pts.length / 2;
    if (n < 3) return pts.map(Math.round);
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const ax = pts[a * 2], ay = pts[a * 2 + 1], dx = pts[b * 2] - ax, dy = pts[b * 2 + 1] - ay, len = Math.hypot(dx, dy) || 1;
      let far = -1, fd = eps;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i * 2] - ax) * dy - (pts[i * 2 + 1] - ay) * dx) / len; if (d > fd) { fd = d; far = i; } }
      if (far >= 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(Math.round(pts[i * 2]), Math.round(pts[i * 2 + 1]));
    return out;
  }


  // The little pictures on tool badges and in the pop-out choices (square canvases).
  function previewOn(cv, kind, style, ci) {
    const w = cv.clientWidth; if (!w) return;
    const dpr = SPG.ui.dpr(); cv.width = cv.height = Math.round(w * dpr);
    const c = cv.getContext('2d'), U = kind === 'brush' ? 360 : 120, k = cv.width / U;
    c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, U, U); c.lineCap = c.lineJoin = 'round';
    if (kind === 'sticker') { drawSticker(c, style, 60, 60, 0, .74); return; }
    if (kind === 'fill') {
      const path = new Path2D(K.circ(60, 60, 50));
      c.save(); c.clip(path);
      if (style === 'plain') { c.fillStyle = PALETTE[ci]; c.fill(path); } else patternFill(c, path, { x: 10, y: 10, width: 100, height: 100 }, ci, style);
      c.restore(); c.strokeStyle = INK; c.lineWidth = 6; c.stroke(path);
      return;
    }
    const pts = [54, 252, 114, 150, 180, 228, 246, 126, 306, 198], col = PALETTE[ci];   // a short wavy stroke
    if (style === 'rainbow') rainbowStroke(c, pts, ci, 78);
    else if (style === 'glitter') { stroke(c, pts, col, 78); c.save(); c.globalAlpha = .4; stroke(c, pts, mix(col, .65), 33); c.restore(); sparkles(c, pts, col, 78, rng(7)); }
    else stroke(c, pts, col, 78);
  }

  /* ---------------------------------------------------------------- export (one picture at a time, as a PNG) */
  function toPNG(def, ops, width = 1200) {
    const c = document.createElement('canvas'); c.width = width; c.height = Math.round(width * H / W);
    render(c.getContext('2d'), def, ops, width);
    return new Promise(res => c.toBlob(res, 'image/png'));
  }
  function saveFile(blob, name) { return SPG.native.saveFile(blob, name, 'image/png'); }
  const fileName = def => `little-sprout-park-${def.id}.png`;
  // On iPhone/iPad (and in the Android app, where the share sheet is only a fallback) a download can pull the child out of the app, so a grown-up has to okay it there.
  const okToSave = fn => ((SPG.safe.isIOS || SPG.native.isApp) && SPG.app && SPG.app.askGate) ? SPG.app.askGate(fn) : fn();
  // Android app: the picture goes straight into the phone's photo gallery (album "Sprout Park"), no share sheet and no gate.
  // Only if that fails does the share sheet open (behind the grown-up gate), so nothing is lost.
  // `done` runs once the picture has been handed over (a cancelled grown-up gate just never calls it).
  async function saveToDevice(blob, name, done) {
    const share = () => Promise.resolve(saveFile(blob, name)).catch(() => false).then(done);
    if (SPG.native.isApp && SPG.native.saveToGallery) {
      let ok = false; try { ok = await SPG.native.saveToGallery(blob, name); } catch (_) { ok = false; }
      if (ok) return done(true);
      return (SPG.app && SPG.app.askGate) ? SPG.app.askGate(share) : share();
    }
    okToSave(share);
  }

  /* ================================================================ the game */
  class ColorGame {
    constructor(host) {
      this.host = host;
      this.bag = store.bag('color', () => ({ v: 1, pics: {} }));
      this.root = el('div', 'cb'); host.append(this.root);
      this.tool = 'bucket'; this.lastPaintTool = 'bucket'; this.ci = 0;
      // the chosen fill pattern, brush and sticker are remembered for this player
      const ui = this.bag.ui || {};
      this.fillStyle = FILLS.includes(ui.fill) ? ui.fill : 'plain'; this.brushStyle = BRUSHES.includes(ui.brush) ? ui.brush : 'plain'; this.sticker = STICKERS.includes(ui.sticker) ? ui.sticker : STICKERS[0];
      SPG.coloring.game = this;      // (for tests)
      this.view = 'gallery'; this.cur = null; this.ops = []; this.st = null; this.penSeen = false;
      this.fx = new art.Fx(); this.fxRunning = false; this.paused = false; this.dirty = false;
      this.timers = new Set();
      voice.hushed = true; voice.stop();      // no spoken voices anywhere in the coloring book
      SPG.music.scene('color');
      this.onHide = () => { if (document.hidden) this.saveNow(true); };
      document.addEventListener('visibilitychange', this.onHide); addEventListener('pagehide', this.onHide);
      this.autosave = setInterval(() => { if (this.dirty) this.saveNow(); }, 8000);
      this.buildGallery();
      // her pet keeps her company (only if she has taken one home from the Pet Shop)
      this.buddy = SPG.pets && SPG.pets.companion(this.root, { size: Math.round(Math.max(66, Math.min(118, Math.min(innerWidth, innerHeight) * .16))) });
    }

    start() { this.showGallery(); }
    later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); this.timers.add(id); return id; }
    pause() { this.paused = true; this.endStroke(); this.saveNow(true); }
    resume() { this.paused = false; }
    resize() {
      if (this.view === 'editor') { this.endStroke(); this.closePicker(); this.layout(); } else { this.tilesDirty = true; this.paintTabs(); this.paintTiles(); this.tabEdges(); }
    }
    destroy() {
      this.endStroke(); this.saveNow(true);
      clearInterval(this.autosave); this.timers.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', this.onHide); removeEventListener('pagehide', this.onHide);
      voice.hushed = false; SPG.music.scene(null);
      if (this.buddy) this.buddy.destroy();
      this.root.remove();
      if (SPG.coloring.game === this) SPG.coloring.game = null;
    }
    // Back button: picture -> gallery -> (app) hub.
    back() {
      if (this.pickEl) { this.closePicker(); return true; }
      if (this.confirmEl) { this.closeConfirm(); return true; }
      if (this.celebrating) { this.endCelebration(); return true; }
      if (this.view === 'editor') { this.toGallery(); return true; }
      return false;
    }

    /* -------------------------------------------------------------- saving */
    rec(id) { return this.bag.pics[id] || null; }
    stateOf(id) { const r = this.rec(id); return r && r.done ? 'done' : r && r.ops && hasPaint(r.ops) ? 'wip' : 'new'; }
    saveNow(flush) {
      clearTimeout(this.saveT); this.saveT = 0;
      if (!this.cur || !this.dirty && !flush) return;
      if (this.dirty) {
        const r = this.bag.pics[this.cur.id] = this.bag.pics[this.cur.id] || {};
        r.ops = compact(this.ops); r.t = Date.now();
        if (this.done) r.done = true;
        this.dirty = false;
        this.staleTiles.add(this.cur.id);
        store.save();
      }
      if (flush) store.flush();
    }
    touched() { this.dirty = true; clearTimeout(this.saveT); this.saveT = setTimeout(() => this.saveNow(), 1400); this.updateButtons(); }

    /* -------------------------------------------------------------- gallery */
    buildGallery() {
      this.staleTiles = new Set(PICS.map(p => p.id));
      this.tilesDirty = true;
      this.gallery = el('div', 'cb-gallery'); this.gallery.setAttribute('data-scroll', '');
      this.grid = el('div', 'cb-grid');
      this.tiles = new Map();
      for (const def of PICS) {
        const canvas = el('canvas');
        const open = btn('cb-open', def.name, canvas, el('span', 'cb-badge', icon('rosette')));
        const dl = btn('cb-dl', 'Save picture', icon('download'));
        const tile = el('div', 'cb-tile', open, dl);
        // Tiles act on a completed tap (so dragging to scroll never opens one), and only if the touch began on
        // the tile: the click that follows a touch-down elsewhere (a hub card, a tool) must not open a picture.
        const tap = (b, fn) => {
          let t = -1e9;
          b.addEventListener('pointerdown', () => { t = performance.now(); });
          b.addEventListener('click', e => { if (e.detail === 0 || performance.now() - t < 1500) { t = -1e9; fn(); } });
        };
        tap(open, () => { sfx.tap(); this.open(def); });
        tap(dl, () => this.savePicture(def, dl));
        tile.dataset.group = def.group;
        this.tiles.set(def.id, { tile, canvas, group: def.group });
        this.grid.append(tile);
      }
      this.gallery.append(this.grid);
      this.tabs = el('div', 'cb-tabs');
      this.tabBtns = new Map();
      for (const g of GROUPS) {
        const canvas = el('canvas'), badge = el('span', 'cb-tabcount');
        const b = btn('cb-tab', g.name, canvas, badge); b.style.setProperty('--tint', g.tint); b.style.setProperty('--edge', g.edge);
        b.addEventListener('click', () => { sfx.tap(); this.setTab(g.id); });
        this.tabBtns.set(g.id, { b, canvas, badge });
        this.tabs.append(b);
      }
      // the holiday that is coming up opens first, once a year for each holiday
      const yr = new Date().getFullYear(), seen = Array.isArray(this.bag.seasonsSeen) ? this.bag.seasonsSeen : this.bag.seasonSeen ? [this.bag.seasonSeen] : [];
      const season = seasonsNow().find(id => GROUPS.some(g => g.id === id) && !seen.includes(yr + '-' + id));
      if (season) { this.bag.seasonSeen = yr + '-' + season; this.bag.seasonsSeen = [...seen, this.bag.seasonSeen].slice(-12); this.tab = season; }
      else this.tab = GROUPS.some(g => g.id === this.bag.tab) ? this.bag.tab : GROUPS[0].id;
      this.tabs.addEventListener('scroll', () => this.tabEdges(), { passive: true });
      this.toast = el('div', 'cb-toast', icon('check'), el('b', '', SPG.t('Saved!')));
      this.root.append(this.gallery, this.tabs, this.toast);
    }
    showGallery(justDone) {
      this.view = 'gallery'; this.cur = null;
      this.gallery.classList.remove('hidden'); this.tabs.classList.remove('hidden');
      this.root.querySelector('.cb-editor')?.remove();
      for (const [id, t] of this.tiles) {
        const s = this.stateOf(id);
        t.tile.classList.toggle('done', s === 'done'); t.tile.classList.toggle('wip', s === 'wip');
        t.tile.classList.toggle('just', id === justDone);
      }
      this.applyTab(); this.placeBuddy();
      requestAnimationFrame(() => { this.paintTabs(); this.paintTiles(); });
    }
    setTab(id) { this.tab = id; this.bag.tab = id; store.save(); this.applyTab(); this.paintTiles(); this.grid.parentElement.scrollTop = 0; }
    applyTab() {
      for (const [id, t] of this.tiles) t.tile.classList.toggle('hidden', t.group !== this.tab);
      for (const [id, t] of this.tabBtns) {
        t.b.setAttribute('aria-pressed', String(id === this.tab));
        const list = PICS.filter(p => p.group === id), done = list.filter(p => this.stateOf(p.id) === 'done').length;
        t.badge.textContent = done === list.length ? '\u2605' : `${done}/${list.length}`; t.badge.classList.toggle('all', done === list.length);
      }
      SPG.music.scene('color', groupOf(this.tab).theme);      // each collection has its own music
      this.tilesDirty = true;
      // there are more tabs than fit on a phone, so the strip scrolls: keep the chosen one in view
      const cur = this.tabBtns.get(this.tab);
      if (cur && this.tabs.scrollWidth > this.tabs.clientWidth) this.tabs.scrollLeft = cur.b.offsetLeft - (this.tabs.clientWidth - cur.b.offsetWidth) / 2;
      this.tabEdges();
    }
    // The ends of the tab strip fade out where more tabs are hidden, so she can see there is more to swipe to.
    tabEdges() {
      const t = this.tabs, l = t.scrollLeft > 4, r = t.scrollLeft + t.clientWidth < t.scrollWidth - 4;
      t.dataset.more = (l ? 'l' : '') + (r ? 'r' : '');
    }
    // A small colored picture on each tab, so a child can tell them apart without reading.
    paintTabs() {
      const dpr = SPG.ui.dpr();
      for (const g of GROUPS) {
        const t = this.tabBtns.get(g.id), w = t.canvas.clientWidth; if (!w) continue;
        t.canvas.width = Math.round(w * dpr); t.canvas.height = Math.round(w * dpr * H / W);
        render(t.canvas.getContext('2d'), PICS.find(p => p.id === g.emblem), g.demo.map(([sec, ci]) => [FILL, sec, ci]), t.canvas.width);
      }
    }
    paintTiles() {
      const dpr = SPG.ui.dpr(), todo = [];
      for (const [id, t] of this.tiles) {
        const w = t.canvas.clientWidth; if (!w) continue;
        const px = Math.round(w * dpr);
        if (this.tilesDirty || this.staleTiles.has(id) || t.canvas.width !== px) todo.push([id, t, px]);
      }
      this.tilesDirty = false;
      const step = () => {
        for (const [id, t, px] of todo.splice(0, 4)) {
          t.canvas.width = px; t.canvas.height = Math.round(px * H / W);
          const r = this.rec(id);
          render(t.canvas.getContext('2d'), PICS.find(p => p.id === id), r && r.ops || [], px);
          this.staleTiles.delete(id);
        }
        if (todo.length && this.view === 'gallery') requestAnimationFrame(step);
      };
      step();
    }
    // Saving is one picture at a time. The download starts from a hidden link (no new tab, no page change),
    // and the app shows its own "Saved!" so the child never has to look at a browser message.
    async savePicture(def, button) {
      if (this.saving) return;
      this.saving = true;
      try {
        const r = this.rec(def.id);
        const blob = await toPNG(def, r && r.ops || []);
        await saveToDevice(blob, fileName(def), () => this.showSaved(button));
      } catch (_) { sfx.oops(); } finally { this.saving = false; }
    }
    showSaved(button) {
      sfx.chime();
      button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop');
      this.toast.classList.remove('show'); void this.toast.offsetWidth; this.toast.classList.add('show');
      clearTimeout(this.toastT); this.toastT = this.later(() => this.toast.classList.remove('show'), 1800);
    }

    /* -------------------------------------------------------------- editor */
    open(def) {
      this.cur = def; this.sheet = compile(def);
      const r = this.rec(def.id);
      this.ops = r && r.ops ? r.ops.map(o => o.slice()) : [];
      this.done = !!(r && r.done); this.dirty = false;
      this.view = 'editor'; this.celebrating = false;
      this.gallery.classList.add('hidden'); this.tabs.classList.add('hidden');
      SPG.music.scene('color', groupOf(def.group).theme);
      this.buildEditor();
      requestAnimationFrame(() => this.layout());
    }
    buildEditor() {
      const ed = this.editor = el('div', 'cb-editor');
      this.paper = el('div', 'cb-paper');
      this.paintCv = el('canvas', 'cb-paint'); this.lineCv = el('canvas', 'cb-lines'); this.stickCv = el('canvas', 'cb-stickers');
      this.paper.append(this.paintCv, this.lineCv, this.stickCv);
      this.stage = el('div', 'cb-stage', this.paper);
      this.pctx = this.paintCv.getContext('2d'); this.lctx = this.lineCv.getContext('2d'); this.sctx = this.stickCv.getContext('2d');

      // Tools are pictures, not words. The bucket and the brush show a little badge with the pattern or brush they paint
      // with; touching the chosen one again opens its choices. The sticker button shows the sticker it stamps.
      const tool = (id, label, ...kids) => { const b = btn('cb-tool', label, ...kids); b.dataset.tool = id; SPG.ui.press(b, () => this.toolPress(id)); return b; };
      this.fillBadge = el('canvas'); this.brushBadge = el('canvas'); this.stickerPic = el('canvas', 'cb-tpic');
      this.toolBtns = [
        tool('bucket', 'Fill with paint', icon('c-bucket'), el('span', 'cb-tsw', this.fillBadge)),
        tool('brush', 'Paintbrush', icon('c-brush'), el('span', 'cb-tsw', this.brushBadge)),
        tool('sticker', 'Stickers', this.stickerPic),
        tool('erase', 'Eraser', icon('c-eraser'))
      ];
      this.undoBtn = btn('cb-tool cb-undo', 'Undo', icon('c-undo')); SPG.ui.press(this.undoBtn, () => this.undo());
      this.againBtn = btn('cb-tool', 'Start over', icon('c-again')); SPG.ui.press(this.againBtn, () => this.askClear());
      this.galleryBtn = btn('cb-tool', 'All pictures', icon('c-grid')); SPG.ui.press(this.galleryBtn, () => { sfx.tap(); this.toGallery(); });
      this.doneBtn = btn('cb-tool cb-done', 'Finished', icon('check')); SPG.ui.press(this.doneBtn, () => this.finish());
      this.tools = el('div', 'cb-tools', ...this.toolBtns, this.undoBtn, this.againBtn, this.galleryBtn, this.doneBtn);

      this.swatches = PALETTE.map((c, i) => {
        const b = btn('cb-sw', 'Color ' + (i + 1)); b.style.setProperty('--c', c); b.dataset.ci = i;
        if (lum(c) > .9) b.classList.add('pale');
        SPG.ui.press(b, () => this.setColor(i));
        return b;
      });
      this.palette = el('div', 'cb-palette', ...SHOW.map(i => this.swatches[i]));
      this.fxCv = el('canvas', 'cb-fx');
      ed.append(this.stage, this.tools, this.palette, this.fxCv);
      this.root.append(ed);

      const p = this.paper;
      p.addEventListener('pointerdown', e => this.down(e));
      p.addEventListener('pointermove', e => this.move(e));
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) p.addEventListener(t, e => this.up(e));
      this.setTool(this.tool, true); this.setColor(this.ci, true); this.updateButtons();
    }
    toolPress(id) {
      const again = this.tool === id;
      this.setTool(id, id === 'sticker' || again);
      if (id === 'sticker' || (again && (id === 'bucket' || id === 'brush'))) this.openPicker(id === 'bucket' ? 'fill' : id);
    }
    setTool(id, quiet) {
      this.tool = id; if (id === 'bucket' || id === 'brush') this.lastPaintTool = id;
      this.toolBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === id)));
      this.paper.dataset.tool = id;
      if (!quiet) sfx.tap();
    }
    setColor(i, quiet) {
      this.ci = i;
      this.swatches.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      if (this.tool === 'erase' || this.tool === 'sticker') this.setTool(this.lastPaintTool, true);
      this.paintBadges();
      if (!quiet) sfx.note(i % 8, .12);
    }
    updateButtons() {
      if (!this.undoBtn) return;
      this.undoBtn.classList.toggle('off', !this.ops.length);
      this.againBtn.classList.toggle('off', !hasPaint(this.ops));
    }
    // The little pictures on the tools: the current fill (plain or patterned) and brush in the current color, and the sticker.
    paintBadges() {
      if (!this.fillBadge) return;
      for (const [c, kind, style] of [[this.fillBadge, 'fill', this.fillStyle], [this.brushBadge, 'brush', this.brushStyle], [this.stickerPic, 'sticker', this.sticker]]) previewOn(c, kind, style, this.ci);
    }

    /* -------------------------------------------------------------- pop-out choices (fill patterns, brushes, stickers) */
    openPicker(kind) {
      this.closePicker(); sfx.tap();
      const list = kind === 'fill' ? FILLS : kind === 'brush' ? BRUSHES : STICKERS;
      const cur = kind === 'fill' ? this.fillStyle : kind === 'brush' ? this.brushStyle : this.sticker;
      const pop = el('div', 'cb-pop'); pop.dataset.kind = kind;
      pop.style.setProperty('--cols', kind === 'sticker' ? 4 : list.length);
      const opts = list.map(o => {
        const c = el('canvas'), b = btn('cb-opt', o, c); b.dataset.opt = o; b.setAttribute('aria-pressed', String(o === cur));
        SPG.ui.press(b, () => this.choose(kind, o));
        return [b, c, o];
      });
      pop.append(...opts.map(o => o[0]));
      const wrap = el('div', 'cb-popwrap', pop);
      // touching anywhere outside the choices closes them (and does not paint)
      wrap.addEventListener('pointerdown', e => { if (e.target === wrap) { e.preventDefault(); sfx.tap(); this.closePicker(); } });
      this.editor.append(wrap); this.pickEl = wrap;
      const tb = this.toolBtns.find(b => b.dataset.tool === (kind === 'fill' ? 'bucket' : kind)).getBoundingClientRect(), er = this.editor.getBoundingClientRect();
      const pw = pop.offsetWidth, ph = pop.offsetHeight, m = 8, side = getComputedStyle(this.editor).gridTemplateColumns.split(' ').length > 1;
      let x = side ? this.tools.getBoundingClientRect().right - er.left + 14 : tb.left - er.left + tb.width / 2 - pw / 2, y = side ? tb.top - er.top + tb.height / 2 - ph / 2 : tb.top - er.top - ph - 14;
      if (!side && y < m) y = tb.bottom - er.top + 14;
      pop.style.left = Math.max(m, Math.min(er.width - pw - m, x)) + 'px'; pop.style.top = Math.max(m, Math.min(er.height - ph - m, y)) + 'px';
      for (const [, c, o] of opts) previewOn(c, kind, o, this.ci);
    }
    closePicker() { this.pickEl?.remove(); this.pickEl = null; }
    choose(kind, o) {
      if (kind === 'fill') { this.fillStyle = o; this.setTool('bucket', true); }
      else if (kind === 'brush') { this.brushStyle = o; this.setTool('brush', true); }
      else { this.sticker = o; this.setTool('sticker', true); }
      this.bag.ui = { fill: this.fillStyle, brush: this.brushStyle, sticker: this.sticker }; store.save();
      this.closePicker(); this.paintBadges();
      kind === 'sticker' ? sfx.pop() : sfx.plink(FILLS.indexOf(o) + BRUSHES.indexOf(o) + 2);
    }

    // Fit the paper into the space the layout gave it, then redraw at the new size.
    layout() {
      if (this.view !== 'editor') return;
      const r = this.stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const m = 6, pw = Math.floor(Math.min(r.width - m * 2, (r.height - m * 2) * W / H)), ph = Math.floor(pw * H / W);
      this.paper.style.width = pw + 'px'; this.paper.style.height = ph + 'px';
      const dpr = SPG.ui.dpr(), k = pw * dpr / W;
      for (const c of [this.paintCv, this.lineCv, this.stickCv]) { c.width = Math.round(pw * dpr); c.height = Math.round(ph * dpr); }
      for (const c of [this.pctx, this.lctx, this.sctx]) c.setTransform(k, 0, 0, k, 0, 0);
      this.fxCv.width = innerWidth; this.fxCv.height = innerHeight;
      this.redraw(); drawLines(this.lctx, this.sheet);
      this.placeBuddy(); this.paintBadges();
    }
    // In the gallery the pet sits in the corner. While coloring it sits just outside the page: on top of it if
    // there is room above, otherwise at the bottom of the tool column.
    placeBuddy() {
      const b = this.buddy; if (!b) return;
      if (this.view !== 'editor') { b.el.style.left = b.el.style.top = b.el.style.right = b.el.style.bottom = ''; return; }
      const r = this.paper.getBoundingClientRect(), root = this.root.getBoundingClientRect(), h = b.el.offsetHeight || 100, w = b.el.offsetWidth || 90;
      // never on the home button or the stars (on a small phone the page starts just under them)
      const home = document.getElementById('btn-home').getBoundingClientRect(), stars = document.getElementById('stage-stars'), sr = (stars.closest('.hud-stars') || stars).getBoundingClientRect();
      const x = Math.max(r.left - root.left + 4, home.right - root.left + 8), y = r.top - root.top - h - 2;
      const clear = sr.width === 0 || x + w <= sr.left - root.left - 6 || y >= sr.bottom - root.top;
      if (r.top - root.top >= h + 4 && clear) b.place(x, y);
      else b.place(8, root.height - h - 8);
    }
    redraw() { paintAll(this.pctx, this.sheet, this.ops); this.drawStickerLayer(); }
    // Stickers on their own layer, plus the one under her finger (a little bigger, as if lifted) while she places it.
    drawStickerLayer() {
      const c = this.sctx; if (!c) return;
      c.clearRect(-20, -20, W + 40, H + 40);
      drawStickers(c, this.ops);
      const st = this.st;
      if (st && st.sticker) { c.save(); c.globalAlpha = .9; drawSticker(c, st.sticker, st.x, st.y, st.rot, 1.12); c.restore(); }
    }

    /* -------------------------------------------------------------- drawing input */
    toPic(e) { const r = this.paper.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
    down(e) {
      if (this.paused || this.celebrating || this.confirmEl || this.pickEl || this.st || e.button > 0) return;
      // Palms and resting hands: ignore very large touch contacts, and touches while a stylus is in use.
      if (e.pointerType === 'pen') this.penSeen = true;
      else if (e.pointerType === 'touch' && (this.penSeen || Math.max(e.width || 0, e.height || 0) > 48)) return;
      e.preventDefault();
      const [x, y] = this.toPic(e), sec = hit(this.sheet, x, y);
      if (this.tool === 'sticker') {
        if (liveStickers(this.ops).length >= MAX_STICKERS) { sfx.oops(); return; }
        this.st = { id: e.pointerId, sticker: this.sticker, x, y, rot: Math.round(Math.random() * 30 - 15) };
        try { this.paper.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
        this.drawStickerLayer(); sfx.tap();
        return;
      }
      if (this.tool === 'erase') {          // the eraser peels off a sticker it touches
        const i = stickerAt(liveStickers(this.ops), x, y);
        if (i >= 0) { this.ops.push([PEEL, null, Math.round(x), Math.round(y)]); this.drawStickerLayer(); this.puff(x, y, ['#ffffff', '#ffd54a']); sfx.erase(); this.touched(); return; }
      }
      if (this.tool === 'bucket') { this.bucket(sec, e); return; }
      const kind = this.tool === 'erase' ? ERASE : { rainbow: RAINBOW, glitter: GLITTER }[this.brushStyle] || BRUSHOP;
      this.st = { id: e.pointerId, sec, kind, ci: this.ci, pts: [x, y], last: [x, y], len: 0, sfxT: 0 };
      try { this.paper.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
      this.pctx.save(); this.pctx.beginPath();
      this.pctx.rect(0, 0, 0, 0); this.pctx.restore(); // (keeps the transform stack balanced on odd browsers)
      this.pctx.save();
      this.pctx.clip(sec.path); for (const o of sec.occ) this.pctx.clip(o.outer, 'evenodd');
      this.liveSeg(this.st, [x, y], 0);
      if (kind === ERASE) sfx.erase(); else sfx.brush();
    }
    // Draw a new bit of the stroke while the finger moves (the finished stroke is drawn again exactly when it ends).
    liveSeg(st, pts, d) {
      const c = this.pctx, col = PALETTE[st.ci];
      if (st.kind === ERASE) stroke(c, pts, PAPER, ERASER);
      else if (st.kind === RAINBOW) rainbowStroke(c, pts, st.ci, BRUSH, st.len);
      else if (st.kind === GLITTER) { stroke(c, pts, col, BRUSH); sparkles(c, pts, col, BRUSH, Math.random); }
      else stroke(c, pts, col, BRUSH);
    }
    move(e) {
      const st = this.st; if (!st || e.pointerId !== st.id) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (st.sticker) {
        const ev = evs.length ? evs[evs.length - 1] : e, [x, y] = this.toPic(ev);
        st.x = Math.max(0, Math.min(W, x)); st.y = Math.max(0, Math.min(H, y)); this.drawStickerLayer();
        return;
      }
      for (const ev of evs.length ? evs : [e]) {
        const [x, y] = this.toPic(ev), dx = x - st.last[0], dy = y - st.last[1], d = Math.hypot(dx, dy);
        if (d < 3) continue;
        this.liveSeg(st, [st.last[0], st.last[1], x, y], d);
        st.pts.push(x, y); st.last = [x, y]; st.len += d;
      }
      const now = performance.now();
      if (now - st.sfxT > 110) { st.sfxT = now; st.kind === ERASE ? sfx.erase() : sfx.brush(); if (st.kind === GLITTER && Math.random() < .3) sfx.plink(Math.floor(Math.random() * 5)); }
    }
    up(e) {
      const st = this.st; if (!st || e.pointerId !== st.id) return;
      this.endStroke(true);
    }
    endStroke(commit) {
      const st = this.st; if (!st) return;
      this.st = null;
      if (st.sticker) {                                   // a sticker is stuck down where the finger lets go
        if (commit) {
          this.ops.push([STICKER, null, st.sticker, Math.round(st.x), Math.round(st.y), st.rot]);
          sfx.pop(); this.puff(st.x, st.y, ['#ffffff', '#ffd54a', '#ff9db8']);
          if (this.buddy) this.buddy.hop();
          this.touched();
        }
        this.drawStickerLayer();
        return;
      }
      this.pctx.restore();
      if (!commit) return;
      const id = st.sec.id;
      if (st.kind === ERASE && st.len < 10) {           // a tap with the eraser clears the whole section
        this.ops.push([CLEAR, id]); applyOp(this.pctx, this.sheet, [CLEAR, id]);
        this.puff(st.pts[0], st.pts[1], ['#ffffff', '#d9d2e0']);
      } else if (st.kind === ERASE) this.ops.push([ERASE, id, simplify(st.pts)]);
      else if (st.kind === BRUSHOP) this.ops.push([BRUSHOP, id, st.ci, simplify(st.pts)]);
      else {                                              // rainbow and glitter: draw the saved stroke so it looks exactly as it will next time
        const op = [st.kind, id, st.ci, simplify(st.pts)];
        this.ops.push(op); applyOp(this.pctx, this.sheet, op);
      }
      if (this.buddy) { this.strokes = (this.strokes || 0) + 1; this.strokes % 5 === 0 ? this.buddy.hop() : this.buddy.wake(); }
      this.touched();
    }
    bucket(sec, e) {
      const pat = this.fillStyle !== 'plain' ? this.fillStyle : null;
      // Skip if this section already has exactly this fill and nothing on top of it.
      for (let i = this.ops.length - 1; i >= 0; i--) {
        const op = this.ops[i];
        if (op[0] === ALL) break;
        if (op[1] !== sec.id) continue;
        if ((!pat && op[0] === FILL && op[2] === this.ci) || (pat && op[0] === PATTERN && op[2] === this.ci && op[3] === pat)) { sfx.tap(); return; }
        break;
      }
      const op = pat ? [PATTERN, sec.id, this.ci, pat] : [FILL, sec.id, this.ci];
      this.ops.push(op); applyOp(this.pctx, this.sheet, op);
      sfx.fill(this.ci % 14); this.puff(e.clientX, e.clientY, [PALETTE[this.ci], '#ffffff'], true);
      if (this.buddy) this.buddy.hop();
      this.touched();
    }
    undo() {
      if (!this.ops.length) { sfx.oops(); return; }
      this.endStroke(); this.closePicker();
      this.ops.pop(); this.redraw(); sfx.undo(); this.touched();
    }

    /* -------------------------------------------------------------- start over */
    askClear() {
      if (this.confirmEl || !hasPaint(this.ops)) { if (!hasPaint(this.ops)) sfx.oops(); return; }
      sfx.tap();
      const yes = btn('btn go cb-yn', 'Yes, start over', icon('check')), no = btn('btn quiet cb-yn', 'No, keep it', icon('x'));
      SPG.ui.press(yes, () => { this.closeConfirm(); this.ops.push([ALL]); this.redraw(); sfx.whoosh(); this.touched(); });
      SPG.ui.press(no, () => { sfx.tap(); this.closeConfirm(); });
      const sheet = el('div', 'sheet cb-sheet', el('div', 'cb-again', icon('again')), el('div', 'row', no, yes));
      this.confirmEl = el('div', 'cb-confirm', sheet);
      this.editor.append(this.confirmEl);
    }
    closeConfirm() { this.confirmEl?.remove(); this.confirmEl = null; }

    /* -------------------------------------------------------------- finishing */
    toGallery() {
      this.endStroke(true); this.closeConfirm(); this.saveNow(true);
      this.showGallery();
    }
    finish() {
      if (this.celebrating) return;
      this.endStroke(true); this.closeConfirm();
      if (!this.done) { this.done = true; store.addStars(1); }
      this.dirty = true; this.saveNow(true);
      this.celebrating = true;
      sfx.cheer(); if (this.buddy) this.buddy.cheer(3);
      this.paper.classList.add('celebrate');
      const badge = el('div', 'cb-cele', el('div', 'cb-rosette', icon('rosette')));
      SPG.ui.press(badge, () => this.endCelebration());
      this.editor.append(badge); this.celeEl = badge;
      let n = 0;
      const burst = () => {
        if (!this.celebrating) return;
        if (this.paused) { this.later(burst, 420); return; }   // the party waits while the screen is hidden or a grown-up sheet is open
        if (++n > 8) { this.endCelebration(); return; }
        const w = innerWidth, h = innerHeight;
        this.fx.burst(w * (.15 + Math.random() * .7), h * (.15 + Math.random() * .4), 26, { colors: PALETTE.slice(0, 14), speed: 420, g: 520, life: 1.5, size: 9, shape: Math.random() < .5 ? 'confetti' : 'star', up: 260 });
        this.fx.burst(w * (.2 + Math.random() * .6), h * (.3 + Math.random() * .3), 8, { colors: ['#ff9db8', '#ff7a8a'], speed: 260, g: 200, life: 1.6, size: 12, shape: 'heart', up: 220 });
        sfx.plink(Math.floor(Math.random() * 5)); this.startFx();
        this.later(burst, 420);
      };
      burst();
    }
    endCelebration() {
      if (!this.celebrating) return;
      const id = this.cur && this.cur.id;
      this.celebrating = false; this.celeEl?.remove(); this.celeEl = null; this.paper.classList.remove('celebrate');
      this.showGallery(id);
    }

    /* -------------------------------------------------------------- sparkles */
    puff(x, y, colors, client) {
      if (!client) { const r = this.paper.getBoundingClientRect(); x = r.left + x / W * r.width; y = r.top + y / H * r.height; }
      this.fx.burst(x, y, 9, { colors, speed: 210, g: 380, life: .55, size: 6, shape: 'star', up: 60 });
      this.startFx();
    }
    startFx() {
      if (this.fxRunning || !this.fxCv) return;
      this.fxRunning = true;
      let last = performance.now();
      const tick = now => {
        const dt = Math.min(.05, (now - last) / 1000); last = now;
        const c = this.fxCv.getContext('2d');
        this.fx.update(dt); c.clearRect(0, 0, this.fxCv.width, this.fxCv.height); this.fx.draw(c);
        if (this.fx.p.length && this.fxCv.isConnected) requestAnimationFrame(tick); else this.fxRunning = false;
      };
      requestAnimationFrame(tick);
    }
  }

  /* ---------------------------------------------------------------- hub card art */
  function cardIcon(c, w, h) {
    const s = Math.min(w, h * 1.2);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#efe3ff'); g.addColorStop(1, '#fff3f8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    art.cloud(c, w * .16, h * .2, s / 700, .9); art.cloud(c, w * .86, h * .26, s / 900, .8);
    // a page, half colored
    const pw = s * .72, ph = pw * H / W;
    c.save(); c.translate(w * .48, h * .5); c.rotate(-.05);
    c.fillStyle = 'rgba(90,63,94,.16)'; art.rr(c, -pw / 2 + 4, -ph / 2 + 10, pw, ph, s * .04); c.fill();
    c.fillStyle = PAPER; art.rr(c, -pw / 2, -ph / 2, pw, ph, s * .04); c.fill();
    c.save(); art.rr(c, -pw / 2, -ph / 2, pw, ph, s * .04); c.clip(); c.translate(-pw / 2, -ph / 2);
    const bunny = PICS.find(p => p.id === 'bunny');
    const demo = [[0, 'sky', 6], [0, 'sun', 2], [0, 'ground', 3], [0, 'ears', 9], [0, 'ear-in', 0], [0, 'head', 10], [0, 'body', 8], [0, 'carrot', 1], [0, 'carrot-top', 4]];
    render(c, bunny, demo, pw);
    c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = 5; art.rr(c, -pw / 2, -ph / 2, pw, ph, s * .04); c.stroke();
    c.restore();
    // crayons
    [['#ff6b81', -.06], ['#ffd54a', .0], ['#59b96e', .06]].forEach(([col, dx], i) => {
      c.save(); c.translate(w * (.86 + dx), h * (.72 + i * .02)); c.rotate(.5 + i * .12);
      const cl = s * .34, cw = s * .06;
      c.fillStyle = col; art.rr(c, -cw / 2, -cl / 2, cw, cl, cw * .3); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-cw / 2, -cl * .1, cw, cw * .5);
      c.fillStyle = col; c.beginPath(); c.moveTo(-cw / 2, -cl / 2); c.lineTo(0, -cl / 2 - cw * .9); c.lineTo(cw / 2, -cl / 2); c.fill();
      c.restore();
    });
  }

  // For other games (Puzzle Pond): draw one of her pictures with her own colors, or a bright sample if she has not painted it.
  SPG.coloring = {
    compile, render, compact, hit, PALETTE, PATTERNS, STICKERS, seasonsNow, game: null,
    hasPaint: id => { const r = (store.bag('color', () => ({ v: 1, pics: {} })).pics || {})[id]; return !!(r && r.ops && hasPaint(r.ops)); },
    draw(ctx, def, width) {
      const r = (store.bag('color', () => ({ v: 1, pics: {} })).pics || {})[def.id];
      // (the sample only uses the first 14 colors, so it looks the same as it always has)
      let ops = r && r.ops && hasPaint(r.ops) ? r.ops : def.sections.map((s, i) => [FILL, s.id, (i * 5 + def.sections.length) % 14]);
      render(ctx, def, ops, width);
    }
  };
  SPG.games.push({ id: 'color', name: 'Coloring Book', order: 5, dom: true, icon: cardIcon, create: host => new ColorGame(host) });
})();
