// Sprout Kitchen: spreading (peanut butter and jelly, butter for the cheese toastie). Uses SPG.cookKit and SPG.cookArt.
// Two slices of bread lie on the board and the jars stand behind them. Touch a jar to open it (the lid twists off), touch inside it to load
// the knife, then drag the knife over the bread: it leaves a thick, ridged layer wherever it goes until the knife is empty, and then it is
// time to dip again (younger children's knives hold more). How much of each slice is covered is really measured on a grid; the green check
// comes once both slices are mostly covered, she decides when it is done, and only bread covered right to the crust moves on by itself.
// Then for a sandwich she flips one slice onto the other (it lands with a squish and the filling peeks out at the edges). For a toastie the
// buttered slices first turn over (butter goes on the outside), she lays cheese on one, and closes it the same way.
(() => {
  const SPG = window.SPG; if (!SPG || !SPG.cookKit) return;
  const { sfx, voice, art } = SPG, K = SPG.cookKit, H = K.H, A = SPG.cookArt;
  const { clamp, lerp, ease, rr, circ, ell, box, shade, rnd, mixHex, ING, CHEESES, drawTapHint, drawBoard, TAU, BREAD, CRUST } = A;

  const JAR = {
    pbutter: { col: '#c98b4a', hi: '#e8b87e', lo: '#93582a', lid: '#e8433f', label: '#fff3d6', layer: 'pbutter' },
    jelly: { col: '#b8326a', hi: '#f07aa6', lo: '#73183f', lid: '#8a5ad8', label: '#fff', layer: 'jelly', gloss: true },
    butter: { col: '#ffe073', hi: '#fff6c8', lo: '#e3b532', dish: true, layer: null }
  };
  const LOAD = [0, 16, 11.5, 8.5];    // how far one full knife spreads (in slice sizes h), by age tier
  const NEED = [0, .45, .6, .72];     // how much of each slice must be covered for the green check, by age tier
  const tier = () => SPG.level.tier('cook');

  const slicePath = A.slicePath;
  const INNER = .86, HIT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 4; return cv.getContext('2d'); })();
  const inSlice = (lx, ly, k = INNER) => { HIT.setTransform(1, 0, 0, 1, 0, 0); slicePath(HIT, 100, k); return HIT.isPointInPath(lx * 100, ly * 100); };
  const CELLS = (() => { const out = []; for (let x = -.78; x <= .79; x += .13) for (let y = -.8; y <= .86; y += .13) if (inSlice(x, y, INNER * .98)) out.push([x, y]); return out; })();

  function drawBread(c, h, back) {
    c.fillStyle = 'rgba(80,40,20,.2)'; c.save(); c.translate(h * .04, h * .08); slicePath(c, h); c.fill(); c.restore();
    c.fillStyle = CRUST; slicePath(c, h); c.fill();
    c.fillStyle = back ? shade(BREAD, -.03) : BREAD; slicePath(c, h, INNER); c.fill();
    c.fillStyle = 'rgba(150,100,50,.18)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse((rnd(i + 3) - .5) * h * 1.3, (rnd(i + 11) - .45) * h * 1.4, h * .018, h * .011, rnd(i) * 3, 0, TAU); c.fill(); }
    c.strokeStyle = 'rgba(160,100,40,.25)'; c.lineWidth = h * .03; slicePath(c, h, INNER); c.stroke();
  }
  // one piece of a knife stroke: the spread, a light ridge and a dark ridge along it (colours mixed with the bread, so overlaps never darken)
  function drawSeg(o, J, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L, w = b.w, col = mixHex(BREAD, J.col, b.a);
    const line = (off, lw, cc) => { o.strokeStyle = cc; o.lineWidth = lw; o.beginPath(); o.moveTo(a.x + nx * off, a.y + ny * off); o.lineTo(b.x + nx * off, b.y + ny * off); o.stroke(); };
    o.lineCap = 'round'; o.lineJoin = 'round';
    o.globalCompositeOperation = 'darken'; line(0, w, col); o.globalCompositeOperation = 'source-over';   // one flat, creamy layer (a thin pass never lightens a thick one)
    line(w * .24, w * .05, mixHex(col, J.hi, J.gloss ? .45 : .28));   // faint streaks the knife leaves
    line(-w * .1, w * .04, mixHex(col, J.lo, .14));
    line(-w * .34, w * .035, mixHex(col, J.hi, .18));
    if (J.gloss && (b.n % 4 === 0)) { o.fillStyle = 'rgba(255,255,255,.4)'; o.beginPath(); o.ellipse(b.x + nx * w * .12, b.y + ny * w * .12, w * .08, w * .035, Math.atan2(dy, dx), 0, TAU); o.fill(); }
  }
  // the slice with what is spread on it, kept in a spare canvas and only added to as the knife moves
  function sliceImage(g, sl, h) {
    const dpr = g.dpr || 1, S = Math.ceil(h * 2.5 * dpr);
    if (!sl.cv || sl.cvS !== S) { sl.cv = sl.cv || document.createElement('canvas'); sl.cv.width = sl.cv.height = S; sl.cvS = S; sl.dirty = true; }
    const o = sl.cv.getContext('2d');
    if (sl.dirty) { o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, S, S); o.setTransform(dpr, 0, 0, dpr, S / 2, S / 2); drawBread(o, h, false); for (const st of sl.strokes) st.drawn = 0; sl.dirty = false; }
    o.setTransform(dpr * h, 0, 0, dpr * h, S / 2, S / 2); o.save(); slicePath(o, 1, INNER); o.clip();
    for (const st of sl.strokes) { const J = JAR[st.jar]; for (let i = Math.max(1, st.drawn); i < st.pts.length; i++) drawSeg(o, J, st.pts[i - 1], st.pts[i]); if (st.pts.length === 1 && !st.drawn) drawSeg(o, J, st.pts[0], { ...st.pts[0], x: st.pts[0].x + .001 }); st.drawn = st.pts.length; }
    o.restore();
    return sl.cv;
  }
  // a jar (or the butter dish) standing behind the bread. t = how far the lid has come off (0 shut, 1 off and lying beside it)
  function drawJar(c, x, y, r, J, t, dir, glow, now) {
    c.save(); c.translate(x, y);
    if (glow > .01) { c.fillStyle = `rgba(255,224,102,${.55 * glow})`; c.beginPath(); c.ellipse(0, r * .1, r * 1.35, r * 1.45, 0, 0, TAU); c.fill(); }
    if (J.dish) {   // a butter dish: a plate with a block of butter and a glass dome lid
      ell(c, r * .05, r * .62, r * 1.2, r * .32, 'rgba(80,40,20,.2)'); ell(c, 0, r * .55, r * 1.15, r * .32, '#dfe6ef'); ell(c, 0, r * .5, r * 1.0, r * .25, '#fff');
      box(c, -r * .6, -r * .05, r * 1.2, r * .55, '#f5cf55', r * .08); box(c, -r * .6, -r * .1, r * 1.2, r * .2, J.col, r * .06); c.fillStyle = 'rgba(255,255,255,.5)'; rr(c, -r * .45, -r * .07, r * .5, r * .05, r * .02); c.fill();
      const lx = dir * lerp(0, r * 1.7, ease(clamp((t - .35) / .65, 0, 1))), ly = -Math.sin(clamp(t, 0, 1) * Math.PI) * r * .5 + lerp(0, r * .35, ease(clamp((t - .35) / .65, 0, 1)));
      c.save(); c.translate(lx, ly); c.globalAlpha = .55; c.fillStyle = '#e8f4ff'; c.beginPath(); c.ellipse(0, r * .45, r * 1.05, r * .2, 0, 0, Math.PI, true); c.lineTo(-r * 1.05, r * .45); c.bezierCurveTo(-r * 1.05, -r * .75, r * 1.05, -r * .75, r * 1.05, r * .45); c.fill(); c.globalAlpha = 1; c.strokeStyle = 'rgba(160,190,220,.9)'; c.lineWidth = r * .06; c.stroke(); circ(c, 0, -r * .32, r * .1, '#c4d4e4'); c.restore();
      c.restore(); return;
    }
    ell(c, r * .08, r * .95, r * .8, r * .2, 'rgba(80,40,20,.2)');
    box(c, -r * .72, -r * .55, r * 1.44, r * 1.5, J.col, r * .22);   // jar full of it
    c.fillStyle = 'rgba(255,255,255,.28)'; rr(c, -r * .58, -r * .45, r * .18, r * 1.25, r * .09); c.fill();
    box(c, -r * .72, -r * .05, r * 1.44, r * .55, J.label, r * .06);
    if (J.layer === 'pbutter') { c.save(); c.translate(0, r * .22); c.rotate(-.5); ell(c, -r * .13, 0, r * .17, r * .13, '#d9a35a'); ell(c, r * .13, 0, r * .17, r * .13, '#d9a35a'); ell(c, 0, 0, r * .12, r * .09, '#d9a35a'); c.restore(); }
    else if (ING.strawberry) { c.save(); c.translate(0, r * .22); ING.strawberry(c, r * .5); c.restore(); }
    box(c, -r * .6, -r * .72, r * 1.2, r * .22, shade(J.col, .15), r * .08);   // the neck
    if (t > .3) { ell(c, 0, -r * .7, r * .56, r * .16, J.lo); ell(c, 0, -r * .68, r * .5, r * .13, J.col); ell(c, -r * .15, -r * .71, r * .14, r * .04, J.hi); }   // open: the top of what is inside
    // the lid: twists (its grip lines run round), lifts, and is put down beside the jar
    const tw = clamp(t / .45, 0, 1), off = ease(clamp((t - .45) / .55, 0, 1)), lx = dir * lerp(0, r * 1.6, off), ly = lerp(-r * .8, r * .75, off) - Math.sin(off * Math.PI) * r * .9 - tw * r * .12;
    c.save(); c.translate(lx, ly);
    const flat = clamp((off - .35) / .5, 0, 1);   // 0 = seen from the side, 1 = lying flat
    if (flat < 1) {
      c.save(); c.rotate(dir * off * .4); c.scale(1, 1 - flat * .5); c.globalAlpha = 1 - flat * flat;
      box(c, -r * .66, -r * .2, r * 1.32, r * .34, J.lid, r * .1); box(c, -r * .66, -r * .2, r * 1.32, r * .12, shade(J.lid, .25), r * .06);
      c.strokeStyle = shade(J.lid, -.18); c.lineWidth = Math.max(1, r * .03); for (let i = 0; i < 9; i++) { const u = (i / 9 + tw * .6) % 1, xx = (u - .5) * r * 1.2; c.globalAlpha = (1 - flat * flat) * (.25 + .45 * Math.sin(u * Math.PI)); c.beginPath(); c.moveTo(xx, -r * .04); c.lineTo(xx, r * .1); c.stroke(); }
      c.restore();
    }
    if (flat > 0) {   // upside down on the board: the rim, the inside of the lid and its seal
      c.save(); c.globalAlpha = flat; const rx = r * .68, ry = r * .3;
      ell(c, r * .05, r * .12, rx, ry, 'rgba(80,40,20,.18)'); ell(c, 0, 0, rx, ry, shade(J.lid, -.12)); ell(c, 0, -r * .05, rx * .97, ry * .9, J.lid);
      ell(c, 0, -r * .04, rx * .78, ry * .66, '#f3f0ea'); ell(c, 0, -r * .02, rx * .7, ry * .56, '#e3ded5');
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-rx * .45, -ry * .55, rx * .25, ry * .16, -.2, 0, TAU); c.fill();
      c.restore();
    }
    c.restore();
    c.restore();
  }
  // a butter knife: (x, y) is the end of the round blade, the handle goes up and to the right; load 0..1 is the blob of spread on it
  function drawKnife(c, x, y, s, load, J, dip, ang = -.75) {
    c.save(); c.translate(x, y); c.rotate(ang - dip * .3);
    c.fillStyle = 'rgba(80,40,20,.18)'; rr(c, s * .02, s * .05, s * .95, s * .1, s * .05); c.fill();
    c.fillStyle = '#e4eaf2'; c.beginPath(); c.moveTo(s * .5, -s * .055); c.lineTo(s * .06, -s * .07); c.quadraticCurveTo(-s * .04, -s * .07, -s * .04, 0); c.quadraticCurveTo(-s * .04, s * .07, s * .06, s * .07); c.lineTo(s * .5, s * .055); c.closePath(); c.fill();
    c.fillStyle = '#b9c4d4'; c.fillRect(s * .06, s * .025, s * .44, s * .03);
    box(c, s * .48, -s * .065, s * .5, s * .13, '#4fa3e0', s * .06); circ(c, s * .9, 0, s * .025, '#fff');
    if (load > .02 && J) { const r = s * (.05 + .09 * load); c.fillStyle = J.lo; c.beginPath(); c.ellipse(s * .12, s * .01, r * 1.5, r, 0, 0, TAU); c.fill(); c.fillStyle = J.col; c.beginPath(); c.ellipse(s * .11, -s * .005, r * 1.4, r * .85, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(s * .08, -r * .4, r * .6, r * .2, 0, 0, TAU); c.fill(); }
    c.restore();
  }

  H.spread = {
    scene: 'spread',
    enter(g, s) {
      const sp = s.spec; s.jars = sp.jars.slice(); s.open = s.jars.map(() => 0); s.opening = s.jars.map(() => null); s.load = null; s.phase = 'spread';
      s.sl = [0, 1].map(() => ({ strokes: [], cells: new Set(), amt: {}, cheese: [], ooze: [] })); s.canDone = false; s.kn = null; s.drag = false; s.dip = 0; s.glowJ = 0; s.said = {};
      g.pieces = []; g.piece = null; g.setTray([]);
    },
    // two ways to lay the board out, whichever gives the bigger bread: the jars in a row behind the bread (tall screens), or in a column
    // beside it (wide screens, where the board may also grow wider). The lids are put down on the outside of each jar.
    geom(g, s) {
      if (s.G && s.G.w === g.w && s.G.h0 === g.h) return s.G;
      const nj = s.jars.length, bh = g.SH * .98, bwA = Math.min(g.w * .94, g.SH * 1.7), bwS = Math.min(g.w * .94, g.SH * 2.3), cap = g.U * .3;
      const hA = Math.min(bwA * .9 / 4.1, bh * .92 / 3.4, cap), hS = Math.min(bwS * .92 / 5.45, bh * .9 / 2.4, cap);
      let G;
      if (hS > hA * 1.12) {
        const h = hS, jr = h * .4, TW = 5.45 * h, left = g.bx - TW / 2, sy = g.by - h * .14, ax = left + h, bx2 = ax + h * 2.1, jx = bx2 + h * 1.5;
        const ys = nj > 1 ? [sy - h * .62, sy + h * .36] : [sy - h * .3];
        G = { h, bw: Math.min(bwS, TW + h * .5), slices: [{ x: ax, y: sy }, { x: bx2, y: sy }], jars: s.jars.map((id, i) => ({ id, x: jx, y: ys[i], r: jr, dir: 1 })), rest: { x: jx - h * .5, y: sy + h * (nj > 1 ? 1.13 : .75), a: -.05 } };
      } else {
        const h = hA, jr = h * .45, sy = g.by + h * .36, jy = sy - h - jr * 1.4;
        const jars = nj > 1 ? s.jars.map((id, i) => ({ id, x: g.bx + (i ? 1 : -1) * h * .8, y: jy, r: jr, dir: i ? 1 : -1 })) : [{ id: s.jars[0], x: g.bx + h * .35, y: jy, r: jr, dir: 1 }];
        G = { h, bw: bwA, slices: [{ x: g.bx - h * 1.05, y: sy }, { x: g.bx + h * 1.05, y: sy }], jars, rest: nj > 1 ? { x: g.bx - h * .55, y: jy + jr * .95, a: -.06 } : { x: g.bx - h * 1.35, y: jy + jr * .6, a: -.06 } };
      }
      G.bh = bh; G.w = g.w; G.h0 = g.h; G.ks = G.h * 1.25; s.G = G; return G;
    },
    cover(g, s, i) { return s.sl[i].cells.size / CELLS.length; },
    want(g, s) { return s.phase === 'fill' ? (s.spec.fill || []) : []; },
    hint(g, s) {
      if (s.phase === 'fill') return 'cook-cheese'; if (s.phase === 'close') return 'cook-close'; if (s.phase !== 'spread') return null;
      if (!s.open.some(o => o >= 1)) return 'cook-open'; if (s.load && s.load.amt > 0) return s.spec.say || 'cook-spread'; return 'cook-dip';
    },
    tip(g, s) {
      if (s.phase === 'fill') { const n = s.sl[0].cheese.length; return n >= 1 && g.idle > 6 ? null : (s.spec.fill || [])[Math.floor(g.t / 7) % (s.spec.fill || [1]).length]; }
      if (s.phase !== 'spread') return null;
      const j = s.jars.findIndex((id, i) => s.open[i] < 1 && !s.opening[i]); if (j >= 0) return s.jars[j];
      const low = H.spread.cover(g, s, 0) <= H.spread.cover(g, s, 1) ? 0 : 1; return (s.load && s.load.amt > 0) ? s.load.jar : s.jars[(low + Math.floor(g.t / 7)) % s.jars.length];
    },
    // the bubble: opens a jar, loads the knife, or spreads one stroke over the bare part of a slice
    applyTip(g, s, id) {
      const G = H.spread.geom(g, s);
      if (s.phase === 'fill') { const it = g.tray.find(t => t.id === id && !t.used); if (it) g.tapItem(it); return; }
      if (s.phase !== 'spread') return;
      const j = s.jars.indexOf(id), jar = G.jars[Math.max(0, j)];
      if (j >= 0 && s.open[j] < 1) { if (!s.opening[j]) H.spread.openJar(g, s, j); return; }
      if (!s.load || s.load.amt <= 0) { H.spread.dip(g, s, Math.max(0, j)); return; }
      if (s.auto) return;   // one helping stroke at a time, however fast the bubble is tapped
      const pts = H.spread.autoPath(g, s, G), run = s.auto = {}; let k = 0; s.drag = true; s.last = null; g.loop('spread');
      const step = () => { if (g.st !== s || s.phase !== 'spread' || s.auto !== run) return; if (k >= pts.length || !s.load || s.load.amt <= 0 || !g.running) { s.auto = null; H.spread.up(g, s, {}); return; } H.spread.move(g, s, { x: pts[k][0], y: pts[k][1] }); k++; setTimeout(step, 30); }; step();
    },
    // a zigzag over the slice with the least on it, through its bare cells (used by the bubble and by the tests)
    autoPath(g, s, G, n = 16) {
      const i = H.spread.cover(g, s, 0) <= H.spread.cover(g, s, 1) ? 0 : 1, sl = G.slices[i], bare = CELLS.filter((c, k) => !s.sl[i].cells.has(k));
      const pts = (bare.length ? bare : CELLS).slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]).filter((_, k, arr) => k % Math.max(1, Math.floor(arr.length / n)) === 0);
      return pts.map(([x, y]) => [sl.x + x * G.h, sl.y + y * G.h]);
    },
    auto(g, s) {
      const G = H.spread.geom(g, s);
      if (s.phase === 'spread') {
        const cb = g.checkBtn(); if (cb && s.sl.every((_, i) => H.spread.cover(g, s, i) >= .9)) return { tap: [cb.x, cb.y] };
        const j = s.open.findIndex(o => o < 1); if (j >= 0) return s.opening[j] ? { wait: 300 } : { tap: [G.jars[j].x, G.jars[j].y] };
        const jar = G.jars[Math.floor(Math.random() * G.jars.length)], path = H.spread.autoPath(g, s, G, 26);
        return { drag: [[jar.x, jar.y], ...path], steps: 3 };
      }
      if (s.phase === 'fill') { const cb = g.checkBtn(); if (cb && s.sl[0].cheese.length >= 2) return { tap: [cb.x, cb.y] }; const it = g.tray.find(t => !t.used); return it ? { tap: [it.x, it.y] } : { wait: 300 }; }
      if (s.phase === 'close' && !s.closeT) return { tap: [G.slices[1].x, G.slices[1].y] };
      return { wait: 300 };
    },
    openJar(g, s, j) { s.opening[j] = { t: 0 }; sfx.tap(); s.said.open = true; },
    dip(g, s, j) {
      const G = H.spread.geom(g, s), L = LOAD[tier()] * G.h; s.load = { jar: s.jars[j], amt: L, full: L }; s.dip = 1;
      sfx.squish(); const jar = G.jars[j]; g.fx.burst(jar.x, jar.y - jar.r * .6, 6, { colors: [JAR[s.jars[j]].col, '#fff'], speed: 70, g: 300, life: .4, size: 4 });
      if (!s.said.spread) { s.said.spread = true; g.say(s.spec.say || 'cook-spread', 1); }
    },
    down(g, s, p) {
      s.auto = null;   // her own finger always wins over a helping stroke
      const G = H.spread.geom(g, s);
      if (s.phase === 'close') { if (!s.closeT) H.spread.close(g, s); return; }
      if (s.phase !== 'spread') return;
      for (let j = 0; j < G.jars.length; j++) {
        const jr = G.jars[j]; if (Math.abs(p.x - jr.x) > jr.r * 1.15 || p.y < jr.y - jr.r * 1.4 || p.y > jr.y + jr.r * 1.2) continue;
        if (s.open[j] < 1) { if (!s.opening[j]) H.spread.openJar(g, s, j); return; }
        H.spread.dip(g, s, j); s.drag = true; s.kn = { x: p.x, y: p.y }; s.last = { x: p.x, y: p.y }; g.loop('spread'); return;
      }
      s.drag = true; s.kn = { x: p.x, y: p.y }; s.last = { x: p.x, y: p.y }; g.loop('spread');
      if (!s.load || s.load.amt <= 0) H.spread.empty(g, s);
    },
    empty(g, s) { s.glowJ = 1; if (s.open.some(o => o >= 1)) g.say('cook-dip', 6); else g.say('cook-open', 6); },
    move(g, s, p) {
      if (!s.drag || s.phase !== 'spread') return; s.kn = { x: p.x, y: p.y }; if (!s.last) { s.last = { x: p.x, y: p.y }; return; } const G = H.spread.geom(g, s), a = s.last;
      const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < G.h * .05) return; s.last = { x: p.x, y: p.y };
      g.level(clamp(d / (g.U * .04), .2, 1) * (s.load && s.load.amt > 0 ? 1 : .35));
      let hit = -1; G.slices.forEach((sl, i) => { if (hit < 0 && inSlice((p.x - sl.x) / G.h, (p.y - sl.y) / G.h, 1.02)) hit = i; });
      if (hit < 0) { s.cur = null; return; }
      if (!s.load || s.load.amt <= 0) { H.spread.empty(g, s); s.cur = null; return; }
      const L = s.load, J = JAR[L.jar], sl = s.sl[hit], P = G.slices[hit], lx = (p.x - P.x) / G.h, ly = (p.y - P.y) / G.h;
      L.amt -= d; const str = clamp(L.amt / (L.full * .3), .3, 1), w = .44 * (.65 + .35 * str);
      if (!s.cur || s.cur.slice !== hit || s.cur.jar !== L.jar) { s.cur = { slice: hit, jar: L.jar, pts: [], drawn: 0 }; sl.strokes.push(s.cur); }
      s.cur.pts.push({ x: lx, y: ly, w, a: .8 + .2 * str, n: s.cur.pts.length });
      sl.amt[L.jar] = (sl.amt[L.jar] || 0) + d;
      for (let k = 0; k < CELLS.length; k++) if (Math.hypot(CELLS[k][0] - lx, CELLS[k][1] - ly) <= w * .62) sl.cells.add(k);
      if (L.amt <= 0) { sfx.plink(1); H.spread.empty(g, s); }
      const need = NEED[tier()]; if (!s.canDone && s.sl.every((_, i) => H.spread.cover(g, s, i) >= need)) { s.canDone = true; sfx.plink(3); }
      if (sl.cells.size >= CELLS.length && !sl.full) { sl.full = true; sfx.plink(4); g.fx.burst(P.x, P.y, 14, { colors: ['#ffd54a', '#fff'], speed: 180, g: 200, life: .6, size: 5, shape: 'star' }); }
    },
    up(g, s) { s.drag = false; s.last = null; s.cur = null; g.hush(); },
    // the green check: done spreading (or done with the cheese)
    check(g, s) { if (s.phase === 'spread') H.spread.next(g, s); else if (s.phase === 'fill') { s.canDone = false; s.phase = 'close'; g.say('cook-close', 1); for (const it of g.tray) it.used = true; } },
    next(g, s) {
      s.canDone = false; s.drag = false; g.hush(); s.load = null;
      if (s.spec.turn) { s.phase = 'turn'; s.turnT = 0; sfx.whoosh(); }
      else if (s.spec.close) { s.phase = 'close'; g.say('cook-close', 1); }
      else g.finish(.8);
    },
    drop(g, s, it, x, y, tap) {
      if (s.phase !== 'fill' || s.fin) return false; const G = H.spread.geom(g, s), A0 = G.slices[0], sl = s.sl[0];
      if (!tap && Math.hypot(x - A0.x, y - A0.y) > G.h * 1.4) return false;
      if (sl.cheese.length >= 3) return 'full';
      g.ingFly(it.id, tap ? it.x : x, tap ? it.y : y, A0.x, A0.y, () => { sl.cheese.push({ id: it.id, rot: (Math.random() - .5) * .5, dx: (Math.random() - .5) * .16, dy: (Math.random() - .5) * .12 }); sfx.pat(); s.canDone = true; });
      return true;
    },
    close(g, s) { s.closeT = 0.0001; sfx.whoosh(); },
    // the finished sandwich, for the steps that come after (cut, grill, slice, serve)
    build(g, s) {
      const order = sl => Object.entries(sl.amt).sort((a, b) => b[1] - a[1]).map(([j]) => JAR[j].layer).filter(Boolean);
      const mid = s.spec.turn ? s.sl[0].cheese.map(c => ({ id: c.id })) : [...order(s.sl[0]), ...order(s.sl[1]).reverse()].map(id => ({ id }));
      g.piece = { type: 'stack', layers: [{ id: 'bread' }, ...mid, { id: 'bread' }], scoops: [], tops: [], paint: [], butter: !!s.spec.turn }; g.pieces = [g.piece];
    },
    update(g, s, dt) {
      s.dip = Math.max(0, s.dip - dt * 3); s.glowJ = Math.max(0, s.glowJ - dt * .5);
      s.opening.forEach((o, j) => { if (!o) return; const t0 = o.t; o.t += dt; s.open[j] = clamp(o.t / 1.0, 0, 1); if (t0 < .15 && o.t >= .15) sfx.tap(); if (t0 < .3 && o.t >= .3) sfx.tap(); if (t0 < .45 && o.t >= .45) { sfx.pop(); } if (o.t >= 1) { s.opening[j] = null; s.open[j] = 1; if (!s.said.dip) { s.said.dip = true; g.say('cook-dip', 1); } } });
      if (s.phase === 'spread' && !s.fin && !s.drag && g.idle > 3 && s.sl.every(sl => sl.cells.size >= CELLS.length)) H.spread.next(g, s);   // covered to the crust: moves on by itself after a rest
      if (s.phase === 'turn') { s.turnT += dt / 1.0; if (s.turnT >= 1) { s.phase = s.spec.fill ? 'fill' : 'close'; for (const sl of s.sl) sl.back = true; if (s.spec.fill) { g.setTray(s.spec.fill.map(id => ({ id, kind: 'ing' }))); g.say('cook-cheese', 1); } else g.say('cook-close', 1); } }
      if (s.phase === 'close' && s.closeT) {
        const t0 = s.closeT; s.closeT += dt / 1.2;
        if (t0 < .78 && s.closeT >= .78) { sfx.pat(); sfx.squish(); const G = H.spread.geom(g, s), A0 = G.slices[0]; g.fx.burst(A0.x, A0.y, 12, { colors: ['#fff3d6', '#ffd54a'], speed: 120, g: 300, life: .5, size: 4 }); H.spread.oozeOut(s); }
        if (s.closeT >= 1 && !s.fin) { H.spread.build(g, s); g.finish(1.0); }
      }
      // nobody playing for a long while: help along gently (open a jar, load the knife; never spread for her)
      if (s.phase === 'spread' && g.idle > 16) { const j = s.open.findIndex(o => o < 1); if (j >= 0 && !s.opening[j]) H.spread.openJar(g, s, j); g.idle = 9; }
      if (s.phase === 'close' && !s.closeT && g.idle > 14) H.spread.close(g, s);
    },
    oozeOut(s) {
      const cols = s.spec.turn ? s.sl[0].cheese.map(c => (CHEESES[c.id] || CHEESES.american).col) : Object.keys(s.sl[0].amt).concat(Object.keys(s.sl[1].amt)).map(j => JAR[j].col);
      if (!cols.length) return; const sl = s.sl[0]; sl.ooze = [];
      for (let i = 0; i < 9; i++) { const a = rnd(i + 3) * TAU; sl.ooze.push({ x: Math.cos(a) * .88, y: Math.sin(a) * .86 + .05, r: .08 + rnd(i + 7) * .07, col: cols[i % cols.length] }); }
    },
    draw(g, s, c) {
      const G = H.spread.geom(g, s), h = G.h, now = g.t; drawBoard(c, g.bx, g.by, G.bw, G.bh);
      const turnK = s.phase === 'turn' ? Math.cos(clamp(s.turnT, 0, 1) * Math.PI) : 1;
      // the slices
      G.slices.forEach((P, i) => {
        const sl = s.sl[i]; if (i === 1 && s.phase === 'close' && s.closeT) return;
        c.save(); c.translate(P.x, P.y);
        if (s.phase === 'turn') { c.translate(0, -Math.sin(clamp(s.turnT, 0, 1) * Math.PI) * h * .3); c.scale(Math.abs(turnK) * .98 + .02, 1); }
        const front = !(sl.back || (s.phase === 'turn' && turnK < 0));
        if (front) { const im = sliceImage(g, sl, h), S = im.width / (g.dpr || 1); c.drawImage(im, -S / 2, -S / 2, S, S); }
        else { drawBread(c, h, true); if (s.spec.turn) { c.strokeStyle = 'rgba(255,214,90,.75)'; c.lineWidth = h * .05; slicePath(c, h, .97); c.stroke(); } }
        for (const ch of sl.cheese) { c.save(); c.translate(ch.dx * h, ch.dy * h); c.rotate(ch.rot); (ING[ch.id] || ING.cheese)(c, h * 1.55); c.restore(); }
        c.restore();
        // bare spots twinkle once most of the slice is covered
        const k = H.spread.cover(g, s, i); if (s.phase === 'spread' && k >= .65 && k < 1) CELLS.forEach(([x, y], n) => { if (sl.cells.has(n)) return; const tw = Math.sin(now * 2.6 + n * 2.4); if (tw <= .2) return; c.save(); c.globalAlpha = tw; art.star(c, P.x + x * h, P.y + y * h, h * (.04 + tw * .05), '#ffe680', now + n); c.restore(); });
        if (s.phase === 'spread') { c.save(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 5; c.beginPath(); c.arc(P.x, P.y + h * 1.18, h * .14, 0, TAU); c.stroke(); c.strokeStyle = '#7ed957'; c.lineCap = 'round'; c.beginPath(); c.arc(P.x, P.y + h * 1.18, h * .14, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke(); c.restore(); }
      });
      // closing: the right slice lifts, turns over and lands on the left one
      if (s.phase === 'close') {
        const A0 = G.slices[0], B0 = G.slices[1], u = ease(clamp((s.closeT || 0) / .78, 0, 1)), land = clamp(((s.closeT || 0) - .78) / .22, 0, 1);
        if (s.closeT) {
          const lift = clamp(B0.y - h - g.y0, h * .25, h * .9), x = lerp(B0.x, A0.x, u), y = lerp(B0.y, A0.y, u) - Math.sin(u * Math.PI) * lift, fk = Math.cos(u * Math.PI), sq = land ? 1 - Math.sin(land * Math.PI) * .08 : 1;
          if (land > 0 || u >= 1) for (const o of s.sl[0].ooze) { c.fillStyle = o.col; c.beginPath(); c.ellipse(A0.x + o.x * h, A0.y + o.y * h, o.r * h * Math.min(1, land * 2), o.r * h * .7 * Math.min(1, land * 2), 0, 0, TAU); c.fill(); }
          c.save(); c.translate(x, y); c.scale((Math.abs(fk) * .98 + .02) * (2 - sq), sq);
          if (fk >= 0) { const im = sliceImage(g, s.sl[1], h), S = im.width / (g.dpr || 1); c.drawImage(im, -S / 2, -S / 2, S, S); } else { c.scale(-1, 1); drawBread(c, h, true); if (s.spec.turn) { c.fillStyle = 'rgba(255,214,90,.25)'; slicePath(c, h, INNER); c.fill(); } }
          c.restore();
        } else { const pk = .6 + Math.sin(now * 6) * .4; c.save(); c.globalAlpha = pk; drawTapHint(c, B0.x, B0.y, g.U * .1, now); c.restore(); c.save(); c.strokeStyle = '#ffe066'; c.lineWidth = 5; c.setLineDash([10, 10]); c.lineDashOffset = -now * 30; c.beginPath(); c.moveTo(B0.x, B0.y - h * .85); c.quadraticCurveTo((A0.x + B0.x) / 2, Math.max(B0.y - h * 1.6, g.y0 + 8), A0.x, A0.y - h * .85); c.stroke(); c.restore(); }
      }
      // the jars and the knife
      const cheeseTime = s.phase !== 'spread';
      G.jars.forEach((jr, j) => { c.save(); if (cheeseTime) c.globalAlpha = .45; drawJar(c, jr.x, jr.y, jr.r, JAR[jr.id], s.open[j], jr.dir, (s.phase === 'spread' && (s.glowJ > .05 || (s.open[j] < 1 && !s.opening[j] && g.idle > 2.5)) ? (s.glowJ || .7) : 0) * (.6 + .4 * Math.sin(now * 6)), now); c.restore(); });
      if (s.phase === 'spread') {
        const L = s.load, J = L ? JAR[L.jar] : null, held = s.drag && s.kn, at = held ? s.kn : G.rest, k = L ? clamp(L.amt / L.full, 0, 1) : 0;
        drawKnife(c, at.x, at.y, G.ks, k, J, s.dip, held ? -.75 : G.rest.a);
        if (!s.open.some(o => o >= 1) && !s.opening.some(Boolean) && g.idle > 2) { const jr = G.jars[0]; drawTapHint(c, jr.x, jr.y - jr.r * .6, g.U * .09, now); }
      }
      if (s.phase === 'fill' && !s.sl[0].cheese.length && g.idle > 2.5) drawTapHint(c, G.slices[0].x, G.slices[0].y, g.U * .1, now);
    }
  };
  // the step bar picture: a slice with a stripe of spread and a knife
  A.STEP_ICON.spread = (c, s, id) => {
    if (id && !JAR[id] && ING[id]) { ING[id](c, s * .9); return; }
    const J = JAR[id] || JAR.pbutter; c.save(); c.translate(-s * .06, s * .06); drawBread(c, s * .36, false);
    c.save(); slicePath(c, s * .36, INNER); c.clip(); c.strokeStyle = J.col; c.lineCap = 'round'; c.lineWidth = s * .2; c.beginPath(); c.moveTo(-s * .25, -s * .08); c.quadraticCurveTo(0, s * .08, s * .26, -s * .02); c.stroke(); c.restore(); c.restore();
    drawKnife(c, s * .12, -s * .02, s * .5, .8, J, 0);
  };
})();
