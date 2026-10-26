// Handwriting-style letters defined as ordered strokes (SVG path strings).
// The same data draws letters on cards and drives the finger-tracing game, so
// what she sees is exactly the shape she is asked to write.
//
// Coordinate box: y=0 is the top line, y=45 the mid line, y=100 the baseline,
// y=145 the bottom of descenders. Each glyph has an advance width `w`.
(() => {
  const SPG = window.SPG = window.SPG || { games: [] };

  const LC = { cx: 28, cy: 72.5, rx: 24, ry: 27.5 }; // lowercase bowl
  const bowlA = 'M46.4 54.8 A24 27.5 0 1 0 46.4 90.2 A24 27.5 0 0 0 52 72.5'; // a/d/g/q bowl, anticlockwise
  const bowlB = 'M9.4 63.1 A24 27.5 0 1 1 9.4 81.9'; // b/p bowl, clockwise from stem

  const DATA = {
    // ---------- capitals ----------
    A: { w: 60, s: ['M30 0 L0 100', 'M30 0 L60 100', 'M10 68 H50'] },
    B: { w: 58, s: ['M8 0 V100', 'M8 0 H28 C58 0 58 48 28 48 H8', 'M8 48 H30 C64 48 64 100 30 100 H8'] },
    C: { w: 64, s: ['M55 18 A30 50 0 1 0 55 82'] },
    D: { w: 62, s: ['M8 0 V100', 'M8 0 H24 C68 0 68 100 24 100 H8'] },
    E: { w: 56, s: ['M8 0 V100', 'M8 0 H50', 'M8 50 H44', 'M8 100 H50'] },
    F: { w: 52, s: ['M8 0 V100', 'M8 0 H48', 'M8 50 H42'] },
    G: { w: 64, s: ['M55 18 A30 50 0 1 0 60 56 H34'] },
    H: { w: 60, s: ['M8 0 V100', 'M52 0 V100', 'M8 50 H52'] },
    I: { w: 60, s: ['M30 0 V100', 'M14 0 H46', 'M14 100 H46'] },
    J: { w: 52, s: ['M42 0 V70 C42 92 34 100 22 100 C10 100 4 90 4 78'] },
    K: { w: 60, s: ['M8 0 V100', 'M52 0 L10 58', 'M26 40 L54 100'] },
    L: { w: 54, s: ['M8 0 V100 H48'] },
    M: { w: 64, s: ['M6 100 V0 L32 62 L58 0 V100'] },
    N: { w: 60, s: ['M8 100 V0 L52 100 V0'] },
    O: { w: 66, s: ['M33 0 A30 50 0 1 0 33 100 A30 50 0 1 0 33 0'] },
    P: { w: 54, s: ['M8 0 V100', 'M8 0 H28 C62 0 62 54 28 54 H8'] },
    Q: { w: 68, s: ['M33 0 A30 50 0 1 0 33 100 A30 50 0 1 0 33 0', 'M40 72 L64 104'] },
    R: { w: 58, s: ['M8 0 V100', 'M8 0 H28 C62 0 62 54 28 54 H8', 'M28 54 L54 100'] },
    S: { w: 56, s: ['M50 16 C42 -4 8 0 10 26 C12 44 50 50 50 74 C50 104 12 102 6 82'] },
    T: { w: 60, s: ['M4 0 H56', 'M30 0 V100'] },
    U: { w: 60, s: ['M8 0 V60 C8 112 52 112 52 60 V0'] },
    V: { w: 60, s: ['M4 0 L30 100 L56 0'] },
    W: { w: 68, s: ['M2 0 L17 100 L34 30 L51 100 L66 0'] },
    X: { w: 60, s: ['M6 0 L54 100', 'M54 0 L6 100'] },
    Y: { w: 60, s: ['M6 0 L30 52 V100', 'M54 0 L30 52'] },
    Z: { w: 60, s: ['M6 0 H54 L6 100 H54'] },

    // ---------- lowercase ----------
    a: { w: 58, s: [bowlA, 'M52 45 V100'] },
    b: { w: 58, s: ['M8 0 V100', bowlB] },
    c: { w: 54, s: ['M46.4 54.8 A24 27.5 0 1 0 46.4 90.2'] },
    d: { w: 58, s: [bowlA, 'M52 0 V100'] },
    e: { w: 56, s: ['M4 72.5 H52 A24 27.5 0 1 0 46.4 90.2'] },
    f: { w: 46, s: ['M44 12 C36 -6 22 -2 22 22 V100', 'M6 45 H40'] },
    g: { w: 58, s: [bowlA, 'M52 45 V120 C52 148 20 148 6 132'] },
    h: { w: 56, s: ['M8 0 V100', 'M8 68 C12 44 48 40 48 66 V100'] },
    i: { w: 28, s: ['M14 45 V100', 'M14 20 L14 21'] },
    j: { w: 36, s: ['M22 45 V122 C22 144 10 148 2 138', 'M22 20 L22 21'] },
    k: { w: 54, s: ['M8 0 V100', 'M46 45 L8 78', 'M22 65 L48 100'] },
    l: { w: 28, s: ['M14 0 V100'] },
    m: { w: 62, s: ['M8 45 V100', 'M8 68 C10 40 30 40 30 66 V100', 'M30 68 C32 40 52 40 52 66 V100'] },
    n: { w: 54, s: ['M8 45 V100', 'M8 68 C10 40 44 40 44 66 V100'] },
    o: { w: 56, s: ['M28 45 A24 27.5 0 1 0 28 100 A24 27.5 0 1 0 28 45'] },
    p: { w: 58, s: ['M8 45 V145', bowlB] },
    q: { w: 58, s: [bowlA, 'M52 45 V145'] },
    r: { w: 46, s: ['M8 45 V100', 'M8 68 C10 48 28 42 40 46'] },
    s: { w: 50, s: ['M44 56 C38 42 12 40 12 58 C12 72 44 74 44 88 C44 106 14 104 6 90'] },
    t: { w: 48, s: ['M20 12 V86 C20 98 30 101 42 96', 'M6 45 H36'] },
    u: { w: 54, s: ['M8 45 V74 C8 106 44 108 44 76', 'M44 45 V100'] },
    v: { w: 56, s: ['M6 45 L28 100 L50 45'] },
    w: { w: 62, s: ['M4 45 L16 100 L30 60 L44 100 L56 45'] },
    x: { w: 56, s: ['M6 45 L50 100', 'M50 45 L6 100'] },
    y: { w: 56, s: ['M6 45 L28 100', 'M50 45 L26 112 C20 128 12 134 4 132'] },
    z: { w: 52, s: ['M6 45 H46 L6 100 H46'] },

    // ---------- numbers (same handwriting, a 0 to 100 box like the capitals)
    0: { w: 56, s: ['M28 0 A24 50 0 1 0 28 100 A24 50 0 1 0 28 0'] },
    1: { w: 40, s: ['M6 22 L26 0 V100'] },
    2: { w: 56, s: ['M6 26 C6 -10 52 -10 52 28 C52 50 22 70 6 100 H54'] },
    3: { w: 54, s: ['M6 16 C14 -8 48 -6 48 24 C48 44 28 46 22 48 C50 50 54 76 46 90 C38 106 12 106 4 84'] },
    4: { w: 56, s: ['M38 0 L4 68 H56', 'M38 30 V100'] },
    5: { w: 54, s: ['M50 0 H12 L8 46 C20 36 50 38 50 66 C50 98 16 106 4 84'] },
    6: { w: 56, s: ['M46 8 C20 -4 6 34 6 68 C6 110 54 110 54 72 C54 40 12 40 7 68'] },
    7: { w: 54, s: ['M4 0 H52 L22 100'] },
    8: { w: 56, s: ['M28 48 C6 40 6 0 28 0 C50 0 50 40 28 48 C2 56 2 100 28 100 C54 100 54 56 28 48'] },
    9: { w: 56, s: ['M50 30 A22 28 0 1 0 50 30.01', 'M50 30 C50 70 40 100 14 100'] }
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const measurer = document.createElementNS(SVG_NS, 'path');
  const cache = {};

  // Sample a path string into evenly spaced points for hit-testing.
  function sample(d) {
    measurer.setAttribute('d', d);
    const len = measurer.getTotalLength();
    const step = 2.5;
    const n = Math.max(1, Math.ceil(len / step));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const p = measurer.getPointAtLength(len * i / n);
      pts.push({ x: p.x, y: p.y });
    }
    return { d, path: new Path2D(d), pts, len };
  }

  function get(ch) {
    if (!DATA[ch]) return null;
    if (!cache[ch]) cache[ch] = { ch, w: DATA[ch].w, strokes: DATA[ch].s.map(sample), lower: /[a-z]/.test(ch) };   // (numbers use the 0 to 100 box like capitals)
    return cache[ch];
  }

  const isDot = st => st.len < 3;

  // Draw one glyph with its box origin at (x, y); `size` is the height of the 0..100 line box in px.
  function draw(c, ch, x, y, size, { color = '#5b4a6b', width = 11, upTo } = {}) {
    const g = get(ch);
    if (!g) return;
    const k = size / 100;
    c.save();
    c.translate(x, y); c.scale(k, k);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = color; c.lineWidth = width;
    g.strokes.forEach((st, i) => {
      if (upTo != null && i >= upTo) return;
      if (isDot(st)) { c.lineWidth = width * 1.25; c.stroke(st.path); c.lineWidth = width; } else c.stroke(st.path);
    });
    c.restore();
  }

  // An accented letter (Spanish words: yoyó, ñ...) is its plain letter with a mark drawn above it.
  const MARK = { '\u0301': 'acute', '\u0300': 'grave', '\u0303': 'tilde', '\u0308': 'dots' };
  const baseOf = ch => { const d = ch.normalize('NFD'); return d.length > 1 && DATA[d[0]] && MARK[d[1]] ? [d[0], MARK[d[1]]] : null; };
  const glyphOf = ch => get(ch) || (baseOf(ch) ? get(baseOf(ch)[0]) : null);
  // Width in px of a string at the given size.
  function measure(text, size, gap = 10) {
    let w = 0;
    for (const ch of text) { const g = glyphOf(ch); w += (g ? g.w : 30) + gap; }
    return Math.max(0, w - gap) * size / 100;
  }

  // Draw a word/name in the same handwriting, left edge at x, line top at y.
  function drawText(c, text, x, y, size, opts = {}) {
    const gap = opts.gap ?? 10;
    let cx = x;
    for (const ch of text) {
      const g = glyphOf(ch), acc = get(ch) ? null : baseOf(ch);
      if (!g) { cx += 30 * size / 100; continue; }
      draw(c, acc ? acc[0] : ch, cx, y, size, opts);
      if (acc) {
        const k = size / 100, m = g.w / 2, top = g.lower ? 30 : -6;   // above the mid line (small letters) or the top line (capitals)
        c.save(); c.translate(cx, y); c.scale(k, k); c.lineCap = 'round'; c.strokeStyle = opts.color || '#5b4a6b'; c.lineWidth = opts.width || 11;
        c.beginPath();
        if (acc[1] === 'acute') { c.moveTo(m - 5, top); c.lineTo(m + 7, top - 16); }
        else if (acc[1] === 'grave') { c.moveTo(m + 5, top); c.lineTo(m - 7, top - 16); }
        else if (acc[1] === 'tilde') { c.moveTo(m - 14, top - 4); c.bezierCurveTo(m - 7, top - 16, m + 1, top + 6, m + 14, top - 10); }
        else { c.moveTo(m - 9, top - 6); c.lineTo(m - 9, top - 6.5); c.moveTo(m + 9, top - 6); c.lineTo(m + 9, top - 6.5); c.lineWidth *= 1.25; }
        c.stroke(); c.restore();
      }
      cx += (g.w + gap) * size / 100;
    }
  }

  // A small canvas element showing one letter, `px` tall. Capitals use a 100-unit box, lowercase 145
  // (room for tall letters and descenders), so every letter of a case is drawn at the same scale.
  function canvas(ch, px, opts = {}) {
    const g = get(ch);
    const el = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ext = g && g.lower ? 145 : 100;
    const k = px / (ext + 24);
    const w = Math.ceil(((g ? g.w : 60) + 24) * k);
    el.width = Math.round(w * dpr); el.height = Math.round(px * dpr);
    el.style.width = w + 'px'; el.style.height = px + 'px';
    const c = el.getContext('2d');
    c.scale(dpr, dpr);
    draw(c, ch, 12 * k, 12 * k, 100 * k, { width: opts.width ?? 12, color: opts.color });
    return el;
  }

  // A small canvas element showing a whole number (e.g. 7 or 14) in the handwriting, `px` tall.
  function numberCanvas(n, px, opts = {}) {
    const text = String(n), el = document.createElement('canvas'), dpr = Math.min(window.devicePixelRatio || 1, 2), k = px / 124, gap = 12;
    const wUnits = [...text].reduce((a, ch) => a + (get(ch) ? get(ch).w : 40) + gap, -gap) + 24, w = Math.ceil(wUnits * k);
    el.width = Math.round(w * dpr); el.height = Math.round(px * dpr); el.style.width = w + 'px'; el.style.height = px + 'px';
    const c = el.getContext('2d'); c.scale(dpr, dpr);
    drawText(c, text, 12 * k, 12 * k, 100 * k, { gap: gap, width: opts.width ?? 12, color: opts.color });
    return el;
  }

  // Keep only letters we can draw, stripping accents (Zoë -> Zoe).
  function clean(name) {
    return name.normalize('NFD').replace(/[^A-Za-z]/g, '');
  }

  SPG.glyphs = { get, draw, drawText, measure, canvas, numberCanvas, clean, isDot, LETTERS: 'abcdefghijklmnopqrstuvwxyz'.split('') };
})();
