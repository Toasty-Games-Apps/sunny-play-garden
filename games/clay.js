// Clay Corner: play-dough for fingers. Every lump of clay is a smooth outline (see games/clay-kit.js, which also draws it crisply with
// volume, a rim light and a shadow on the mat), so it can be rolled, pulled, squished, cut and stamped like the real thing.
// Tools: clay (tap = a ball, drag = a rope), hand (move a piece or a bead; drop it on the bin to throw it away), pull (drag clay along),
// squish (press and hold to flatten), rolling pin, pinch (pull out a point), poke (a dent; hold on a flat piece for a hole), knife (cuts a
// piece in two), cookie cutters (cut a shape out; it slides out of the hole), stamps, smoothing, colouring, and eyes and beads.
// Everything has an undo; the creation is kept for each player between visits; the camera saves a picture (and, if a grown-up allows
// it, to the phone's photos).
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const K = SPG.clayKit, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rr = (c, x, y, w, h, r) => art.rr(c, x, y, w, h, r);

  /* ---------------------------------------------------------------- colours */
  const COLORS = [
    { id: 'red', c: [236, 66, 58] }, { id: 'orange', c: [255, 146, 50] }, { id: 'yellow', c: [255, 208, 60] }, { id: 'lime', c: [150, 214, 72] },
    { id: 'green', c: [52, 170, 88] }, { id: 'teal', c: [44, 184, 174] }, { id: 'sky', c: [90, 196, 242] }, { id: 'blue', c: [60, 118, 228] },
    { id: 'purple', c: [140, 90, 226] }, { id: 'pink', c: [255, 118, 178] }, { id: 'brown', c: [160, 106, 68] }, { id: 'white', c: [250, 246, 238] },
    { id: 'black', c: [78, 72, 86] }, { id: 'rainbow', c: [255, 150, 200], rainbow: true }
  ];
  const BEADS = [[255, 90, 110], [255, 205, 70], [90, 200, 120], [90, 180, 245], [170, 120, 235], [255, 150, 70]];
  const css = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
  const SHAPE_PATH = (c, kind, r) => { K.shapePath(c, kind, r); };

  const CUTTERS = K.CUTTERS, STAMPS = K.STAMPS, EXTRAS = ['eye', 'bead', 'pearl', 'sprinkles'];
  // tools in the order they are shown; the number is the youngest age tier that gets them
  const TOOLS = [['clay', 1], ['hand', 1], ['pull', 1], ['squish', 1], ['roll', 1], ['cutters', 1], ['extras', 1], ['knife', 2], ['stamps', 2], ['smooth', 2], ['pinch', 2], ['poke', 2], ['dye', 3]];
  const SIZE_R = [.06, .085, .115];        // the radius of a ball, small / medium / large (in board widths); a rope is a bit thinner
  const CUT_R = [.075, .105, .15], STAMP_R = [.045, .065, .09], POKE_R = [.02, .028, .04], EYE_R = [.04, .056, .078], BEAD_R = [.022, .032, .045];
  const FLAT = .2, MAXOBJ = 80, UNDO_MAX = 12;

  /* ---------------------------------------------------------------- keeping the creation between visits (IndexedDB) */
  let dbp = null;
  const dbOpen = () => dbp || (dbp = new Promise(res => {
    try { const rq = indexedDB.open('spg-clay', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('clay', { keyPath: 'pid' }); rq.onsuccess = () => res(rq.result); rq.onerror = rq.onblocked = () => res(null); } catch (_) { res(null); }
  }));
  const dbPut = async rec => { const db = await dbOpen(); if (!db) return; try { db.transaction('clay', 'readwrite').objectStore('clay').put(rec); } catch (_) { /* no room: it is just not kept */ } };
  const dbGet = async pid => { const db = await dbOpen(); if (!db) return null; return new Promise(res => { try { const rq = db.transaction('clay').objectStore('clay').get(pid); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); } catch (_) { res(null); } }); };


  /* ---------------------------------------------------------------- tool pictures: each button shows what the tool does to a lump of clay */
  const INK = '#5a3f5e', PEACH = '#ffcfa4', PEACH_D = '#e7a77a';
  const lighter = (col, a) => col.map(v => Math.min(255, v + a));
  const lump = (c, x, y, rx, ry, col, rot = 0) => {   // a soft, shaded lump of clay
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = 'rgba(70,40,30,.24)'; c.beginPath(); c.ellipse(rx * .08, ry * .22, rx, ry, 0, 0, TAU); c.fill();
    const g = c.createRadialGradient(-rx * .35, -ry * .4, Math.min(rx, ry) * .1, 0, 0, Math.max(rx, ry) * 1.15); g.addColorStop(0, css(lighter(col, 75))); g.addColorStop(.5, css(col)); g.addColorStop(1, css(col, .7));
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-rx * .36, -ry * .46, rx * .28, ry * .15, -.5, 0, TAU); c.fill(); c.restore();
  };
  const fingerTip = (c, x, y, w, len, rot) => {   // a fingertip pointing down, its tip at (x, y); rot turns it
    c.save(); c.translate(x, y); c.rotate(rot);
    const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#ffd9b8'); g.addColorStop(.55, PEACH); g.addColorStop(1, '#f2b88a');
    c.fillStyle = g; c.strokeStyle = PEACH_D; c.lineWidth = w * .07; c.beginPath(); c.moveTo(-w * .46, -len); c.lineTo(-w / 2, -w * .5); c.arc(0, -w * .5, w / 2, Math.PI, 0, true); c.lineTo(w * .46, -len); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff1e8'; c.beginPath(); c.ellipse(0, -w * .78, w * .27, w * .3, 0, 0, TAU); c.fill(); c.restore();
  };
  const arrow = (c, x1, y1, x2, y2, w, col) => {
    const a = Math.atan2(y2 - y1, x2 - x1), hl = w * 2.6; c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * hl * .5, y2 - Math.sin(a) * hl * .5); c.stroke();
    c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - Math.cos(a - .5) * hl, y2 - Math.sin(a - .5) * hl); c.lineTo(x2 - Math.cos(a + .5) * hl, y2 - Math.sin(a + .5) * hl); c.closePath(); c.fill(); c.restore();
  };
  const sparkle = (c, x, y, r, col = '#fff') => { c.save(); c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? r * .3 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); c.restore(); };
  const TOOLPIC = {
    clay(c, s, cc) { lump(c, -s * .12, s * .2, s * .7, s * .55, cc); c.fillStyle = '#59b96e'; c.beginPath(); c.arc(s * .55, -s * .5, s * .38, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = s * .13; c.lineCap = 'round'; c.beginPath(); c.moveTo(s * .55, -s * .72); c.lineTo(s * .55, -s * .28); c.moveTo(s * .33, -s * .5); c.lineTo(s * .77, -s * .5); c.stroke(); },
    hand(c, s, cc) {   // a lump carried in an open hand
      lump(c, 0, -s * .12, s * .62, s * .46, cc);
      c.fillStyle = PEACH; c.strokeStyle = PEACH_D; c.lineWidth = s * .06;
      c.save(); c.translate(-s * .55, s * .5); c.rotate(-1.05); rr(c, -s * .12, -s * .5, s * .26, s * .5, s * .13); c.fill(); c.stroke(); c.restore();   // the thumb
      rr(c, -s * .55, s * .22, s * 1.1, s * .62, s * .3); c.fill(); c.stroke();
      for (let i = 0; i < 4; i++) { const x = -s * .38 + i * s * .25; rr(c, x - s * .11, s * (.02 - (i === 1 || i === 2 ? .06 : 0)), s * .22, s * .4, s * .11); c.fill(); c.stroke(); }
      c.fillStyle = PEACH; rr(c, -s * .5, s * .26, s * 1.0, s * .5, s * .24); c.fill();
    },
    pull(c, s, cc) {   // a lump with a stretched tail, a fingertip pinching the end and an arrow
      c.fillStyle = css(cc); c.beginPath(); c.moveTo(-s * .2, -s * .34); c.quadraticCurveTo(s * .4, -s * .1, s * .95, s * .16); c.quadraticCurveTo(s * .4, s * .3, -s * .2, s * .46); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(s * .3, s * .02, s * .35, s * .05, .15, 0, TAU); c.fill();
      lump(c, -s * .42, s * .1, s * .5, s * .5, cc);
      fingerTip(c, s * .86, s * .12, s * .3, s * .7, 0); arrow(c, s * .15, -s * .75, s * .85, -s * .75, s * .09, INK);
    },
    squish(c, s, cc) {   // a round lump turns into a flat pancake
      lump(c, -s * .5, s * .12, s * .42, s * .55, cc); arrow(c, -s * .02, -s * .05, s * .34, -s * .05, s * .09, INK); lump(c, s * .45, s * .5, s * .52, s * .2, cc);
      arrow(c, s * .45, -s * .85, s * .45, -s * .3, s * .09, INK);
    },
    roll(c, s, cc) {   // a rolling pin on a sheet of clay
      lump(c, 0, s * .6, s * .95, s * .2, cc);
      c.save(); c.rotate(-.18); c.fillStyle = '#d9a060'; rr(c, -s * .62, -s * .32, s * 1.24, s * .6, s * .26); c.fill(); c.fillStyle = '#f3cf98'; rr(c, -s * .6, -s * .27, s * 1.2, s * .2, s * .1); c.fill();
      c.fillStyle = '#a36a34'; rr(c, -s * 1.0, -s * .1, s * .42, s * .22, s * .11); c.fill(); rr(c, s * .58, -s * .1, s * .42, s * .22, s * .11); c.fill(); c.restore();
    },
    cutters(c, s, cc) {   // a sheet with a star cut out and the star cookie beside it
      lump(c, -s * .2, s * .1, s * .8, s * .62, cc);
      c.save(); c.translate(-s * .2, s * .08); K.shapePath(c, 'star', s * .36); c.fillStyle = 'rgba(70,40,30,.5)'; c.fill(); c.restore();
      c.save(); c.translate(s * .62, -s * .42); K.shapePath(c, 'star', s * .36); c.fillStyle = 'rgba(70,40,30,.25)'; c.fill(); c.translate(-s * .03, -s * .04); K.shapePath(c, 'star', s * .36); c.fillStyle = css(lighter(cc, 20)); c.fill(); c.strokeStyle = css(cc, .7); c.lineWidth = s * .05; c.stroke(); c.restore();
    },
    extras(c, s, cc) {   // a lump with googly eyes
      lump(c, 0, s * .2, s * .85, s * .62, cc);
      for (const x of [-.32, .32]) { c.fillStyle = '#fff'; c.strokeStyle = 'rgba(80,60,70,.45)'; c.lineWidth = s * .05; c.beginPath(); c.arc(x * s, s * .02, s * .27, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#2a2430'; c.beginPath(); c.arc(x * s + s * .05, s * .08, s * .13, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x * s + s * .01, s * .03, s * .04, 0, TAU); c.fill(); }
    },
    knife(c, s, cc) {   // a lump cut in two with a knife in the gap
      lump(c, -s * .38, s * .3, s * .46, s * .5, cc); lump(c, s * .38, s * .3, s * .46, s * .5, cc);
      c.save(); c.translate(s * .02, -s * .1); c.rotate(.5); c.fillStyle = '#dfe6ee'; c.strokeStyle = '#9aa6b6'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(-s * .12, -s * .1); c.lineTo(s * .14, -s * .1); c.lineTo(s * .14, s * .55); c.quadraticCurveTo(0, s * .78, -s * .12, s * .55); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#e0a060'; rr(c, -s * .13, -s * .62, s * .28, s * .55, s * .1); c.fill(); c.restore();
    },
    stamps(c, s, cc) {   // a stamp and the heart it left in the clay
      lump(c, 0, s * .6, s * .95, s * .26, cc);
      c.save(); c.translate(s * .06, s * .6); K.shapePath(c, 'heart', s * .2); c.fillStyle = 'rgba(70,40,30,.5)'; c.fill(); c.restore();
      c.fillStyle = '#e0a060'; rr(c, -s * .16, -s * .85, s * .32, s * .5, s * .12); c.fill(); c.fillStyle = css(lighter(cc, 10)); rr(c, -s * .5, -s * .4, s * 1.0, s * .36, s * .12); c.fill(); c.strokeStyle = css(cc, .65); c.lineWidth = s * .05; c.stroke();
    },
    smooth(c, s, cc) {   // a smooth shiny lump with sparkles
      lump(c, 0, s * .1, s * .8, s * .62, cc); sparkle(c, -s * .62, -s * .55, s * .3); sparkle(c, s * .62, -s * .35, s * .22); sparkle(c, s * .15, -s * .72, s * .16);
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = s * .1; c.lineCap = 'round'; c.beginPath(); c.moveTo(-s * .4, s * .05); c.quadraticCurveTo(0, s * .3, s * .42, s * .05); c.stroke();
    },
    pinch(c, s, cc) {   // a lump with a point pulled up and two fingers pinching it
      lump(c, 0, s * .45, s * .85, s * .45, cc);
      c.fillStyle = css(cc); c.beginPath(); c.moveTo(-s * .26, s * .2); c.quadraticCurveTo(-s * .06, -s * .2, 0, -s * .82); c.quadraticCurveTo(s * .06, -s * .2, s * .26, s * .2); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-s * .06, -s * .15, s * .04, s * .2, .1, 0, TAU); c.fill();
      fingerTip(c, -s * .07, -s * .5, s * .28, s * .5, -.75); fingerTip(c, s * .07, -s * .5, s * .28, s * .5, .75);
    },
    poke(c, s, cc) {   // a finger poking a dent into a lump
      lump(c, 0, s * .5, s * .9, s * .4, cc);
      c.fillStyle = 'rgba(70,40,30,.5)'; c.beginPath(); c.ellipse(0, s * .38, s * .22, s * .1, 0, 0, TAU); c.fill();
      fingerTip(c, 0, s * .22, s * .38, s * .85, 0);
    },
    dye(c, s, cc) {   // a lump half painted, a drop of colour falling on it
      lump(c, 0, s * .5, s * .88, s * .42, [250, 246, 238]); c.save(); c.beginPath(); c.ellipse(0, s * .5, s * .88, s * .42, 0, 0, TAU); c.clip(); c.fillStyle = css(cc); c.beginPath(); c.ellipse(s * .3, s * .5, s * .6, s * .55, 0, 0, TAU); c.fill(); c.restore();
      c.fillStyle = css(cc); c.beginPath(); c.moveTo(0, -s * .95); c.quadraticCurveTo(s * .55, -s * .2, s * .34, s * .02); c.quadraticCurveTo(0, s * .22, -s * .34, s * .02); c.quadraticCurveTo(-s * .55, -s * .2, 0, -s * .95); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-s * .14, -s * .22, s * .07, s * .17, .3, 0, TAU); c.fill();
    }
  };
  K.toolPics = TOOLPIC;

  /* ---------------------------------------------------------------- the game */
  class ClayGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas'; host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.objs = []; this.nid = 1; this.sprites = new WeakMap(); this.anim = new Map();
      this.undo = []; this.tool = 'clay'; this.col = 9; this.size = 1; this.cutter = 'circle'; this.stamp = 'dots'; this.extra = 'eye';
      this.menu = null; this.confirm = false; this.stroke = null; this.ptr = null; this.hover = null;
      this.t = 0; this.running = false; this.touched = false; this.saveAt = 0; this.camUntil = 0; this.flash = 0; this.snapA = null;
      this.fx = new art.Fx(); this.sndT = 0;
      this.tier = SPG.level.tier('clay');
      this.tools = TOOLS.filter(t => t[1] <= this.tier).map(t => t[0]);
      this.tick = this.tick.bind(this);
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      cv.addEventListener('pointerdown', e => { if (!e.isPrimary) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* fine */ } this.ptr = e.pointerId; const p = at(e); this.down(p.x, p.y); });
      cv.addEventListener('pointermove', e => { if (e.pointerId !== this.ptr && this.ptr != null) return; const p = at(e); this.hover = p; if (this.ptr != null) this.move(p.x, p.y); });
      const end = e => { if (e.pointerId !== this.ptr) return; this.ptr = null; this.up(); };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', end);
      this.loadSaved(); SPG.clayGame = this;
    }

    /* ---------------------------------------------------------------- sizing and layout */
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr(); this.dpr = dpr;
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.layout(); this.sprites = new WeakMap(); this.draw();
    }
    layout() {
      const w = this.w, h = this.h, wide = w >= h * 1.1; this.wide = wide;
      const items = [], tools = this.tools, listT = [...tools, 'size'], nT = listT.length, ACT = ['undo', 'camera', 'album', 'bin'];
      let bs, board;
      const toolItem = (id, x, y, r) => ({ kind: id === 'size' ? 'size' : 'tool', id, x, y, r });
      if (wide) {
        // the tools in a block on the left (below the home button), the actions and colours in a block on the right (below the star count)
        const availL = h - 100, availR = h - 92; let L = null, R = null;
        for (let cols = 2; cols <= 4 && !L; cols++) { const rows = Math.ceil(nT / cols), b = Math.min(64, availL / (rows * 1.12)); if (b >= 46 || cols === 4) L = { cols, rows, bs: b }; }
        for (let cols = 2; cols <= 4 && !R; cols++) { const blank = (cols - ACT.length % cols) % cols, cells = ACT.length + blank + COLORS.length, rows = Math.ceil(cells / cols), b = Math.min(64, availR / (rows * 1.12)); if (b >= 46 || cols === 4) R = { cols, rows, bs: b, blank }; }
        bs = L.bs; const gl = L.bs * 1.12, gr = R.bs * 1.12;
        listT.forEach((id, i) => items.push(toolItem(id, 12 + (Math.floor(i / L.rows) + .5) * gl, 96 + Math.max(0, (availL - L.rows * gl) / 2) + (i % L.rows + .5) * gl, L.bs * .5)));
        const rx = w - 12 - R.cols * gr, ry = 88;
        ACT.forEach((id, i) => items.push({ kind: 'act', id, x: rx + (i % R.cols + .5) * gr, y: ry + (Math.floor(i / R.cols) + .5) * gr, r: R.bs * .5 }));
        COLORS.forEach((c, i) => { const k = ACT.length + R.blank + i; items.push({ kind: 'color', id: i, x: rx + (k % R.cols + .5) * gr, y: ry + (Math.floor(k / R.cols) + .5) * gr, r: R.bs * .44 }); });
        const left = 12 + L.cols * gl, right = w - 12 - R.cols * gr, size = Math.max(140, Math.min(right - left - 16, h - 24));
        board = { s: size, x: (left + right) / 2 - size / 2, y: (h - size) / 2 };
      } else {
        // the tools in rows along the bottom, then the colours; the actions in the top row between the home button and the star count
        const perRow = clamp(Math.floor(w / 40), 5, 8), perC = clamp(Math.floor(w / 36), 5, 7), rowsT = Math.ceil(nT / perRow), rowsC = Math.ceil(COLORS.length / perC);
        let k = 1, cs, stackH, top, sizeB;
        for (; k > .3; k -= .1) {   // tiny screens (a phone's cover display): shrink the buttons until the board has room
          bs = Math.min(62, w / perRow / 1.08) * k; cs = Math.min(bs * .76, w / perC / 1.2 * k); stackH = rowsT * bs * 1.1 + rowsC * cs * 1.18 + 20; top = 12 + Math.min(bs, 56) + 10;
          sizeB = Math.min(w - 16, h - top - stackH - 8); if (sizeB >= Math.min(w - 16, 170)) break;
        }
        const gapT = w / perRow; sizeB = Math.max(80, sizeB); board = { s: sizeB, x: (w - sizeB) / 2, y: top + Math.max(0, (h - top - stackH - 8 - sizeB) / 2) };
        const by = h - stackH + 6;
        listT.forEach((id, i) => items.push(toolItem(id, gapT * (i % perRow + .5), by + (Math.floor(i / perRow) + .5) * bs * 1.1, bs * .5)));
        const cy = by + rowsT * bs * 1.1 + 8, cg = w / perC;
        COLORS.forEach((c, i) => items.push({ kind: 'color', id: i, x: cg * (i % perC + .5), y: cy + (Math.floor(i / perC) + .5) * cs * 1.18, r: cs * .5 }));
        const ab = Math.min(bs, 56);
        ACT.forEach((id, i) => items.push({ kind: 'act', id, x: w / 2 + (i - 1) * ab * 1.18, y: 12 + ab * .5, r: ab * .5 }));
      }
      this.bs = bs; this.items = items; this.board = board;
    }
    // geometry and state for the play-tests (tools/playtest)
    probe() {
      const ps = this.objs.filter(o => o.t === 'p'), its = this.objs.filter(o => o.t === 'i');
      return { items: this.items.map(i => ({ kind: i.kind, id: i.id, x: i.x, y: i.y, r: i.r })), board: this.board, w: this.w, h: this.h, tool: this.tool, col: this.col, size: this.size, menu: this.menu, undo: this.undo.length, pieces: ps.length, beads: its.length,
        holes: ps.reduce((a, p) => a + p.cont.length - 1, 0), dents: ps.reduce((a, p) => a + (p.dents ? p.dents.length : 0), 0), clay: ps.reduce((a, p) => a + Math.abs(K.area(p.cont[0])), 0), thin: ps.reduce((a, p) => Math.min(a, p.h), 1), confirm: this.confirm, tools: this.tools,
        album: this.album ? { n: this.album.list.length, view: this.album.view, busy: this.album.busy } : null, top: ps.length ? ps[ps.length - 1].cont[0].length : 0, cent: ps.map(p => K.centroid(p.cont[0])) };
    }
    item(kind, id) { return this.items.find(i => i.kind === kind && i.id === id); }
    gp(x, y) { return [(x - this.board.x) / this.board.s, (y - this.board.y) / this.board.s]; }
    sp(x, y) { return { x: this.board.x + x * this.board.s, y: this.board.y + y * this.board.s }; }
    inBoard(x, y, m = 0) { const b = this.board; return x >= b.x - m && x <= b.x + b.s + m && y >= b.y - m && y <= b.y + b.s + m; }

    start() { this.resize(); this.resume(); voice.say('clay-start'); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.ptr = null; if (this.stroke) this.up(); this.save(); }
    destroy() { this.pause(); this.closeAlbum(); this.canvas.remove(); }

    /* ---------------------------------------------------------------- saving, undo */
    pid() { return store.active ? store.active.id : null; }
    async loadSaved() {
      const pid = this.pid(); if (!pid) return; const rec = await dbGet(pid);
      if (rec && rec.v === 3 && typeof rec.objs === 'string' && !this.touched) { try { const o = JSON.parse(rec.objs); if (Array.isArray(o.objs)) { this.objs = o.objs; this.nid = o.nid || this.objs.length + 1; } } catch (_) { /* an unreadable save is left alone */ } }
    }
    pack() { return JSON.stringify({ objs: this.objs, nid: this.nid }); }
    save() { const pid = this.pid(); if (!pid || !this.touched) return; this.saveAt = 0; dbPut({ pid, v: 3, objs: this.pack(), t: Date.now() }); }
    pushUndo() { this.undo.push(this.pack()); if (this.undo.length > UNDO_MAX) this.undo.shift(); this.touched = true; }
    doUndo() { const u = this.undo.pop(); if (!u) { sfx.oops && sfx.oops(); return; } try { const o = JSON.parse(u); this.objs = o.objs; this.nid = o.nid; } catch (_) { return; } this.anim.clear(); sfx.whoosh(); this.saveAt = this.t + 1.5; }
    clearAll() { this.pushUndo(); this.objs = []; this.anim.clear(); sfx.whoosh(); this.saveAt = this.t + 1.5; }
    touch(o) { o.v = (o.v || 0) + 1; }

    /* ---------------------------------------------------------------- the pieces on the board */
    colorRgb() { const c = COLORS[this.col]; return c.rainbow ? null : c.c; }
    newPiece(cont, h, extra = {}) {
      const c = COLORS[this.col], p = Object.assign({ t: 'p', id: this.nid++, cont: [cont], h, dents: [], v: 1, col: this.col, rgb: c.rainbow ? [255, 150, 200] : c.c, rain: !!c.rainbow, ra: Math.random() * 2 }, extra);
      this.objs.push(p); return p;
    }
    animate(o, kind, dur = .3, extra = {}) { this.anim.set(o.id, Object.assign({ kind, t0: this.t, dur }, extra)); }
    // the topmost piece or bead at a point
    pick(g, margin = .012) {
      for (let i = this.objs.length - 1; i >= 0; i--) {
        const o = this.objs[i];
        if (o.t === 'i') { if (Math.hypot(g[0] - o.x, g[1] - o.y) < o.r * 1.15 + margin) return o; }
        else if (K.inPiece(g, o) || K.edgeDist(g, o.cont[0]) < margin && K.inside(g, o.cont[0])) return o;
      }
      return null;
    }
    pickPiece(g, margin = .012) { for (let i = this.objs.length - 1; i >= 0; i--) { const o = this.objs[i]; if (o.t === 'p' && (K.inPiece(g, o) || K.edgeDist(g, o.cont[0]) < margin)) return o; } return null; }
    shift(o, dx, dy) {
      if (o.t === 'i') { o.x += dx; o.y += dy; return; }
      for (const c of o.cont) for (const p of c) { p[0] += dx; p[1] += dy; }
      for (const d of o.dents || []) { d.x += dx; d.y += dy; }
      const e = this.sprites.get(o); if (e) { e.spr.x += dx; e.spr.y += dy; }
    }
    // pieces' geometry changed: rebuild its picture next frame
    reshape(o) { this.touch(o); }
    center(o) { return o.t === 'i' ? [o.x, o.y] : K.centroid(o.cont[0]); }
    // beads that sit on top of a piece travel with it
    riders(p) { const i0 = this.objs.indexOf(p), out = []; for (let i = i0 + 1; i < this.objs.length; i++) { const o = this.objs[i]; if (o.t === 'i' && K.inPiece([o.x, o.y], p)) out.push(o); } return out; }
    remove(o) { const i = this.objs.indexOf(o); if (i >= 0) this.objs.splice(i, 1); this.anim.delete(o.id); }
    spawnOK() { if (this.objs.length >= MAXOBJ) { sfx.oops && sfx.oops(); return false; } return true; }

    /* ---------------------------------------------------------------- input */
    radius() { return SIZE_R[this.size]; }
    down(x, y) {
      SPG.audio.unlock();
      if (this.album) { this.albumDown(x, y); return; }
      this.touched = true;
      if (this.confirm) {
        const b = this.confirmBtns();
        if (Math.hypot(x - b.yes.x, y - b.yes.y) < b.r * 1.1) { this.confirm = false; this.clearAll(); } else if (Math.hypot(x - b.no.x, y - b.no.y) < b.r * 1.1) { this.confirm = false; sfx.tap(); }
        return;
      }
      if (this.menu) {
        const o = this.menuHit(x, y);
        if (o) { this.pickOption(o); return; }
        const it = this.items.find(i => Math.hypot(x - i.x, y - i.y) < i.r * 1.15);
        if (!it) { this.menu = null; return; }
      }
      const it = this.items.find(i => Math.hypot(x - i.x, y - i.y) < i.r * 1.15);
      if (it) { this.pressItem(it); return; }
      if (!this.inBoard(x, y, 4)) return;
      this.beginStroke(x, y);
    }
    pressItem(it) {
      sfx.tap();
      if (it.kind === 'color') { this.col = it.id; this.menu = null; if (this.tool !== 'clay' && this.tool !== 'dye' && this.tool !== 'extras') this.tool = 'clay'; return; }
      if (it.kind === 'size') { this.size = (this.size + 1) % 3; this.menu = null; return; }
      if (it.kind === 'act') {
        this.menu = null;
        if (it.id === 'undo') this.doUndo(); else if (it.id === 'camera') this.snap(); else if (it.id === 'album') this.openAlbum(); else if (it.id === 'bin') { if (this.touched && this.objs.length) this.confirm = true; }
        return;
      }
      const same = this.tool === it.id; this.tool = it.id;
      if (it.id === 'cutters' || it.id === 'stamps' || it.id === 'extras') this.menu = same && this.menu === it.id ? null : it.id; else this.menu = null;
      voice.say('clay/' + it.id);
    }
    beginStroke(x, y) {
      const g = this.gp(x, y), tool = this.tool;
      const s = this.stroke = { tool, g, lg: g, start: g, t0: this.t, moved: false, dist: 0, path: [g], speed: 0 };
      if (tool === 'cutters' || tool === 'stamps' || tool === 'extras' || tool === 'knife') return;     // these show where they will land, and act when the finger lifts
      if (tool === 'clay') { if (!this.spawnOK()) { this.stroke = null; return; } this.pushUndo(); s.p = this.newPiece(K.circle(g[0], g[1], this.radius(), this.nid * 3.1), 1); this.animate(s.p, 'pop', .3); sfx.pop(); return; }
      if (tool === 'hand') {
        const o = this.pick(g); if (!o) { this.stroke = null; return; }
        this.pushUndo(); s.o = o; s.riders = o.t === 'p' ? this.riders(o) : []; const i = this.objs.indexOf(o); this.objs.splice(i, 1); this.objs.push(o); for (const r of s.riders) { const j = this.objs.indexOf(r); this.objs.splice(j, 1); this.objs.push(r); }
        this.animate(o, 'lift', .12, { hold: true }); sfx.pop(); return;
      }
      if (tool === 'pull' || tool === 'pinch') {
        const R = this.radius() * (tool === 'pull' ? 1.15 : .6), p = this.pickPiece(g, R * .7); if (!p) { this.stroke = null; return; }
        this.pushUndo(); s.p = p; s.R = R; s.area0 = Math.abs(K.area(p.cont[0])); s.h0 = p.h; return;
      }
      if (tool === 'squish') { const p = this.pickPiece(g, .01); if (!p) { this.stroke = null; return; } this.pushUndo(); s.p = p; return; }
      if (tool === 'roll') { const p = this.pickPiece(g, .01); this.pushUndo(); s.p = p; return; }
      if (tool === 'poke') { const p = this.pickPiece(g, .005); if (!p) { this.stroke = null; return; } this.pushUndo(); s.p = p; return; }
      if (tool === 'smooth') { this.pushUndo(); return; }
      if (tool === 'dye') { const o = this.pick(g); if (!o) { this.stroke = null; return; } this.pushUndo(); this.dyeObj(o); return; }
    }
    move(x, y) {
      const s = this.stroke; if (!s) return;
      const g = this.gp(x, y), dx = g[0] - s.lg[0], dy = g[1] - s.lg[1], d = Math.hypot(dx, dy);
      s.g = g;
      if (d < .004) return;
      s.moved = true; s.dist += d;
      switch (s.tool) {
        case 'clay': {
          const last = s.path[s.path.length - 1];
          if (Math.hypot(g[0] - last[0], g[1] - last[1]) > this.radius() * .16) s.path.push(g);
          if (s.dist > this.radius() * .5 && s.path.length >= 2) { const p = s.p, a = s.path[0], b = s.path[s.path.length - 1]; p.cont = [K.rope(s.path, this.radius() * .6, p.id)]; p.h = 1; p.ra = Math.atan2(b[1] - a[1], b[0] - a[0]); this.reshape(p); this.anim.delete(p.id); }
          if (this.t - this.sndT > .12) { sfx.squish(); this.sndT = this.t; }
          break;
        }
        case 'hand': {
          const o = s.o, ddx = dx, ddy = dy; this.shift(o, ddx, ddy); for (const r of s.riders) this.shift(r, ddx, ddy);
          break;
        }
        case 'pull': case 'pinch': this.pullStep(s, s.lg, dx, dy); if (this.t - this.sndT > .14) { sfx.squish(); this.sndT = this.t; } break;
        case 'roll': this.rollStep(s, g, dx, dy, d); if (this.t - this.sndT > .1) { sfx.roll(); this.sndT = this.t; } break;
        case 'smooth': this.smoothStep(g); break;
        default: break;
      }
      s.speed = s.speed * .7 + (d / Math.max(.008, this.t - (s.tl || this.t - .016))) * .3; s.tl = this.t;
      s.lg = g;
    }
    up() {
      const s = this.stroke; this.stroke = null; if (!s) return;
      if (s.tool === 'clay' && s.p) { if (s.p.cont[0].length > 60 && s.moved) { sfx.pop(); } this.touch(s.p); }
      else if (s.tool === 'hand' && s.o) this.dropHeld(s);
      else if (s.tool === 'cutters') this.applyCutter(s.g);
      else if (s.tool === 'stamps') this.applyStamp(s.g);
      else if (s.tool === 'extras') this.applyExtra(s.g);
      else if (s.tool === 'knife') this.applyKnife(s.start, s.g);
      else if (s.tool === 'poke' && s.p && !s.holed) this.applyPoke(s.g, s.p, false);
      for (const o of this.objs) if (o.t === 'p' && o.cont[0].length > 220) { o.cont[0] = K.tidy(K.resample(o.cont[0], .01), .02, .006); this.touch(o); }
      this.saveAt = this.t + 1.5;
    }

    /* ---------------------------------------------------------------- per frame: the tools that work while a finger is held down */
    update(dt) {
      const s = this.stroke; if (!s || this.ptr == null) return;
      if (s.tool === 'squish' && s.p) {
        const p = s.p, k = 1 + (.9 + Math.min(1.2, s.speed * .6)) * dt;
        const bb = K.bbox(p.cont);
        if (p.h > FLAT + .001 && bb.x1 - bb.x0 < .5 && bb.y1 - bb.y0 < .5) {   // it spreads out, but never off the board
          const c = K.centroid(p.cont[0]); const nk = Math.min(k, 1 + (p.h - FLAT) * 3);
          for (const co of p.cont) for (const q of co) { q[0] = c[0] + (q[0] - c[0]) * nk; q[1] = c[1] + (q[1] - c[1]) * nk; }
          for (const d of p.dents || []) { d.x = c[0] + (d.x - c[0]) * nk; d.y = c[1] + (d.y - c[1]) * nk; d.r *= nk; }
          p.h = Math.max(FLAT, p.h / (nk * nk)); this.reshape(p);
          if (this.t - this.sndT > .16) { sfx.squish(); this.sndT = this.t; }
        }
      } else if (s.tool === 'poke' && s.p && !s.holed && this.t - s.t0 > .55 && !s.moved) {
        s.holed = true; this.applyPoke(s.g, s.p, true);
      }
    }

    /* ---------------------------------------------------------------- shaping */
    // pull: the points of the outline near the finger travel with it, so clay stretches into a tail or a point
    pullStep(s, from, dx, dy) {
      const p = s.p, R = s.R, sharp = s.tool === 'pinch', amp = sharp ? 1.25 : 1;
      for (const co of p.cont) for (const q of co) {
        const d = Math.hypot(q[0] - from[0], q[1] - from[1]); if (d >= R) continue;
        const w = Math.pow(1 - d / R, sharp ? 1.8 : 1.4); q[0] += dx * w * amp; q[1] += dy * w * amp;
      }
      p.cont = p.cont.map((co, i) => { let c = K.tidy(co, .014, .005); c = K.smooth(c, .22, 1); return K.orient(c, i === 0); });
      const a = Math.abs(K.area(p.cont[0])); p.h = clamp(s.h0 * s.area0 / Math.max(1e-5, a), .3, 1);
      for (const q of p.dents || []) if (Math.hypot(q.x - from[0], q.y - from[1]) < R * .6) { q.x += dx * .6; q.y += dy * .6; }
      this.reshape(p);
    }
    // the rolling pin: whatever it passes over spreads out sideways and gets thin
    rollStep(s, g, dx, dy, d) {
      const p = this.pickPiece(g, .02) || s.p; if (!p) return; s.p = p;
      const nx = dx / d, ny = dy / d, px = -ny, py = nx, c = K.centroid(p.cont[0]), perp = Math.exp(2.6 * d), along = 1 + .5 * d;
      const f = q => { const vx = q[0] - c[0], vy = q[1] - c[1], a = (vx * nx + vy * ny) * along, b = (vx * px + vy * py) * perp; q[0] = c[0] + nx * a + px * b; q[1] = c[1] + ny * a + py * b; };
      { const bb = K.bbox(p.cont); if (bb.x1 - bb.x0 > .62 || bb.y1 - bb.y0 > .62) { p.h = Math.max(FLAT, p.h * Math.exp(-4.5 * d)); this.reshape(p); return; } }
      for (const co of p.cont) for (const q of co) f(q);
      for (const dt of p.dents || []) { const q = [dt.x, dt.y]; f(q); dt.x = q[0]; dt.y = q[1]; dt.r *= (1 + .3 * d); }
      p.h = Math.max(FLAT, p.h * Math.exp(-4.5 * d)); p.cont = p.cont.map((co, i) => K.orient(K.tidy(co, .016, .005), i === 0)); this.reshape(p);
    }
    smoothStep(g) {
      const R = this.radius() * 1.1, p = this.pickPiece(g, R); if (!p) return;
      p.dents = (p.dents || []).filter(d => Math.hypot(d.x - g[0], d.y - g[1]) > R * .9);
      p.cont = p.cont.map((co, i) => { const n = co.length; const sm = K.smooth(co, .5, 2); return K.orient(co.map((q, j) => { const d = Math.hypot(q[0] - g[0], q[1] - g[1]), w = d < R ? 1 - d / R : 0; return [q[0] + (sm[j][0] - q[0]) * w, q[1] + (sm[j][1] - q[1]) * w]; }), i === 0); });
      this.reshape(p); if (this.t - this.sndT > .14) { sfx.brush && sfx.brush(); this.sndT = this.t; }
    }
    dyeObj(o) {
      const c = COLORS[this.col]; if (o.t === 'i') { if (o.k === 'bead' || o.k === 'pearl') { o.c = c.rainbow ? BEADS[this.nid++ % BEADS.length] : c.c; } return; }
      o.col = this.col; o.rgb = c.rainbow ? [255, 150, 200] : c.c; o.rain = !!c.rainbow; o.ra = Math.random() * 2; this.reshape(o); sfx.pop();
      const ctr = this.sp(...K.centroid(o.cont[0])); this.fx.burst(ctr.x, ctr.y, 8, { colors: [css(o.rgb), '#fff'], speed: 140, g: 200, life: .6, size: 5, shape: 'star' });
    }

    /* ---------------------------------------------------------------- the hand: drop on the bin to throw away */
    dropHeld(s) {
      const o = s.o, a = this.anim.get(o.id); if (a && a.hold) this.anim.delete(o.id);
      const bin = this.item('act', 'bin'), at = this.sp(...s.g);
      if (bin && Math.hypot(at.x - bin.x, at.y - bin.y) < bin.r * 1.4) { for (const r of s.riders) this.remove(r); this.remove(o); sfx.whoosh(); this.fx.burst(bin.x, bin.y, 10, { colors: ['#fff', '#d7c9e0'], speed: 160, g: 200, life: .6, size: 6 }); return; }
      // keep it on the board
      const c = this.center(o), nx = clamp(c[0], .04, .96), ny = clamp(c[1], .04, .96); if (nx !== c[0] || ny !== c[1]) { this.shift(o, nx - c[0], ny - c[1]); for (const r of s.riders) this.shift(r, nx - c[0], ny - c[1]); }
      this.animate(o, 'drop', .22); sfx.snap && sfx.snap();
    }

    /* ---------------------------------------------------------------- cutters, stamps, knife, poke, eyes and beads */
    cutterR() { return CUT_R[this.size]; }
    applyCutter(g) {
      const R = this.cutterR(); let p = this.pickPiece(g, 0);
      if (!p || !K.inPiece(g, p)) { sfx.oops && sfx.oops(); return; }
      const shape = K.shape(this.cutter, R, g[0], g[1])[0];
      // cut from the topmost piece the whole shape fits in (a cookie lying on the dough is left alone); otherwise it just leaves a mark
      for (let i = this.objs.length - 1; i >= 0; i--) { const o = this.objs[i]; if (o.t === 'p' && shape.every(q => K.inPiece(q, o))) { p = o; break; } }
      this.pushUndo();
      if (shape.every(q => K.inPiece(q, p)) && this.objs.length < MAXOBJ) {
        const hole = K.orient(shape, false), cookie = K.orient(shape.map(q => [q[0], q[1]]), true);
        p.cont.push(hole); this.reshape(p);
        const piece = { t: 'p', id: this.nid++, cont: [cookie], h: p.h, v: 1, dents: [], col: p.col, rgb: p.rgb, rain: p.rain, ra: p.ra };
        // the cut shape slides out of the hole, away from the middle of the board
        let vx = R * 1.9, vy = R * .7; if (g[0] + vx > .92) vx = -vx; if (g[1] + vy > .92) vy = -R * .7;
        this.objs.push(piece); this.shift(piece, vx, vy); this.animate(piece, 'slide', .32, { dx: -vx, dy: -vy });
        sfx.snap(); sfx.pop(); const sc = this.sp(g[0], g[1]); this.fx.burst(sc.x, sc.y, 6, { colors: ['#fff', css(p.rgb)], speed: 120, g: 160, life: .5, size: 4 });
      } else {   // not all of it fits on the piece: it just presses its shape into the top
        p.dents.push({ k: this.cutter, x: g[0], y: g[1], r: R, a: 0, d: 1 }); this.reshape(p); sfx.pop();
      }
    }
    applyStamp(g) {
      const p = this.pickPiece(g, 0); if (!p || !K.inPiece(g, p)) { sfx.oops && sfx.oops(); return; }
      this.pushUndo(); p.dents.push({ k: this.stamp, x: g[0], y: g[1], r: STAMP_R[this.size], a: 0, d: 1 }); if (p.dents.length > 40) p.dents.shift(); this.reshape(p); sfx.pop();
      this.animate(p, 'press', .2);
    }
    applyPoke(g, p, hold) {
      const r = POKE_R[this.size];
      if (hold && p.h < .6 && K.inPiece(g, p) && K.edgeDist(g, p.cont[0]) > r * 1.3) {
        p.cont.push(K.orient(K.shape('circle', r * .9, g[0], g[1])[0], false)); this.reshape(p); sfx.pop(); const sc = this.sp(g[0], g[1]); this.fx.burst(sc.x, sc.y, 6, { colors: ['#fff', css(p.rgb)], speed: 110, g: 160, life: .45, size: 4 });
      } else if (K.inPiece(g, p)) { p.dents.push({ k: 'circle', x: g[0], y: g[1], r, a: 0, d: hold ? 2 : 1.2 }); this.reshape(p); sfx.pop(); }
    }
    applyKnife(a, b) {
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < .03) return;
      let cut = false; const out = [];
      this.pushUndo();
      for (const o of this.objs) {
        if (o.t !== 'p') { out.push(o); continue; }
        const parts = K.split(o.cont[0], a, b); if (!parts) { out.push(o); continue; }
        cut = true;
        const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1, gap = .026;
        const mk = (cont, sgn) => {
          const q = { t: 'p', id: this.nid++, cont: [K.orient(K.tidy(K.resample(cont, .012), .02, .006), true)], h: o.h, v: 1, dents: [], col: o.col, rgb: o.rgb, rain: o.rain, ra: o.ra };
          for (let i = 1; i < o.cont.length; i++) if (K.inside(K.centroid(o.cont[i]), q.cont[0])) q.cont.push(o.cont[i]);
          q.dents = (o.dents || []).filter(d => K.inside([d.x, d.y], q.cont[0]));
          const dx = nx / nl * gap * sgn, dy = ny / nl * gap * sgn; this.shift(q, dx, dy); this.animate(q, 'slide', .22, { dx: -dx * .6, dy: -dy * .6 }); return q;
        };
        const cA = K.centroid(parts[0]), cB = K.centroid(parts[1]), sA = (cA[0] - cB[0]) * nx + (cA[1] - cB[1]) * ny >= 0 ? 1 : -1;   // each half moves away from the other
        out.push(mk(parts[0], sA), mk(parts[1], -sA));
      }
      if (cut) { this.objs = out; sfx.snap(); const sc = this.sp((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); this.fx.burst(sc.x, sc.y, 5, { colors: ['#fff'], speed: 90, g: 80, life: .4, size: 3 }); } else { this.undo.pop(); }
    }
    applyExtra(g) {
      if (!this.spawnOK()) return; this.pushUndo();
      const k = this.extra, R = k === 'eye' ? EYE_R[this.size] : BEAD_R[this.size], c = COLORS[this.col];
      let o;
      if (k === 'eye') o = { t: 'i', k, x: g[0], y: g[1], r: R, a: (Math.random() - .5) * .5 };
      else if (k === 'bead') o = { t: 'i', k, x: g[0], y: g[1], r: R, c: c.rainbow ? BEADS[this.nid % BEADS.length] : c.c };
      else if (k === 'pearl') o = { t: 'i', k, x: g[0], y: g[1], r: R * 1.1 };
      else { const bits = []; for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * EYE_R[this.size] * 1.4; bits.push([Math.cos(a) * d, Math.sin(a) * d, Math.random() * TAU, BEADS[i % BEADS.length]]); } o = { t: 'i', k: 'spr', x: g[0], y: g[1], r: EYE_R[this.size] * 1.3, bits }; }
      o.id = this.nid++; o.v = 1; this.objs.push(o); this.animate(o, 'pop', .26); sfx.pop();
    }

    /* ---------------------------------------------------------------- frame */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.flash = Math.max(0, this.flash - dt * 3);
      this.update(dt); this.fx.update(dt);
      if (this.snapA) { this.snapA.t += dt; if (this.snapA.t > 1.4) this.snapA = null; }
      if (this.saveAt && this.t > this.saveAt && !this.stroke) this.save();
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---------------------------------------------------------------- drawing the board */
    sprOf(o, S) {
      let e = this.sprites.get(o); if (e && e.v === o.v && e.S === S) return e.spr;
      const spr = K.sprite(o, S); this.sprites.set(o, { v: o.v, S, spr }); return spr;
    }
    // the cutting mat
    drawMat(c, x, y, s) {
      c.save(); c.translate(x, y);
      c.fillStyle = 'rgba(80,60,40,.22)'; rr(c, 0, s * .012, s, s, s * .04); c.fill();
      const mat = c.createLinearGradient(0, 0, 0, s); mat.addColorStop(0, '#f7eedd'); mat.addColorStop(1, '#ecdcc2'); c.fillStyle = mat; rr(c, 0, 0, s, s, s * .04); c.fill();
      c.save(); rr(c, 0, 0, s, s, s * .04); c.clip(); c.fillStyle = 'rgba(150,115,70,.12)'; const gap = s / 20; for (let gy = 1; gy < 20; gy++) for (let gx = 1; gx < 20; gx++) { c.beginPath(); c.arc(gx * gap, gy * gap, s * .0028, 0, TAU); c.fill(); }
      const vg = c.createRadialGradient(s / 2, s / 2, s * .35, s / 2, s / 2, s * .78); vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(120,85,40,.12)'); c.fillStyle = vg; c.fillRect(0, 0, s, s);
      c.restore(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = s * .008; rr(c, 0, 0, s, s, s * .04); c.stroke(); c.restore();
    }
    // the pieces and beads, back to front, into a square of side s at (x, y); S is the sprite resolution (pixels per board width)
    drawObjs(c, x, y, s, S, live) {
      c.save(); c.translate(x, y); c.beginPath(); rr(c, 0, 0, s, s, s * .04); c.clip();
      for (const o of this.objs) {
        const an = live ? this.anim.get(o.id) : null; let k = 1, ox = 0, oy = 0, lift = 0;
        if (an) {
          const u = clamp((this.t - an.t0) / an.dur, 0, 1);
          if (an.kind === 'pop') k = u >= 1 ? 1 : .55 + .55 * Math.sin(u * Math.PI * .55) + (u > .6 ? -.1 * Math.sin((u - .6) / .4 * Math.PI) : 0);
          else if (an.kind === 'slide') { const e = 1 - Math.pow(1 - u, 3); ox = an.dx * (1 - e); oy = an.dy * (1 - e); lift = Math.sin(u * Math.PI) * .01; }
          else if (an.kind === 'drop') k = 1 + .05 * (1 - u) * Math.sin(u * Math.PI * 1.5) + (u < .5 ? .03 * (1 - u * 2) : 0);
          else if (an.kind === 'press') k = 1 - .03 * Math.sin(u * Math.PI);
          else if (an.kind === 'lift') k = 1.035;
          if (u >= 1 && !an.hold) this.anim.delete(o.id);
        }
        c.save();
        if (k !== 1 || ox || oy || lift) { const ctr = this.center(o); c.translate((ctr[0] + ox) * s, (ctr[1] + oy - lift) * s); c.scale(k, k); c.translate(-ctr[0] * s, -ctr[1] * s); }
        if (o.t === 'p') { const spr = this.sprOf(o, live && this.stroke && this.stroke.p === o && this.stroke.tool !== 'hand' ? S * .5 : S); c.drawImage(spr.cv, spr.x * s, spr.y * s, spr.w / spr.S * s, spr.h / spr.S * s); }
        else this.drawBead(c, o, s);
        c.restore();
      }
      c.restore();
    }
    drawBead(c, o, s) {
      const x = o.x * s, y = o.y * s, r = o.r * s;
      c.save(); c.translate(x, y);
      const shadow = (rx, ry, ox, oy, a) => { c.fillStyle = `rgba(70,40,30,${a})`; c.beginPath(); c.ellipse(ox, oy, rx, ry, 0, 0, TAU); c.fill(); };
      if (o.k === 'eye') {
        c.rotate(o.a || 0); shadow(r * 1.02, r * .95, r * .12, r * .2, .22);
        const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(.7, '#f6f3ee'); g.addColorStop(1, '#d4cdc8'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(80,60,70,.35)'; c.lineWidth = Math.max(1, r * .05); c.stroke();
        const px = r * .14, py = r * .2, pr = r * .5; c.fillStyle = '#2a2430'; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(px - pr * .35, py - pr * .38, pr * .3, 0, TAU); c.fill(); c.beginPath(); c.arc(px + pr * .3, py + pr * .3, pr * .13, 0, TAU); c.fill();
      } else if (o.k === 'bead' || o.k === 'pearl') {
        const base = o.k === 'pearl' ? [250, 238, 244] : (o.c || [255, 90, 110]); shadow(r * 1.0, r * .9, r * .18, r * .3, .24);
        const g = c.createRadialGradient(-r * .35, -r * .4, r * .08, 0, 0, r * 1.05); g.addColorStop(0, css(base.map(v => Math.min(255, v + 90)))); g.addColorStop(.45, css(base)); g.addColorStop(1, css(base, .6)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-r * .34, -r * .4, r * .26, r * .15, -.7, 0, TAU); c.fill();
        if (o.k === 'pearl') { const pg = c.createLinearGradient(-r, -r, r, r); pg.addColorStop(0, 'rgba(180,220,255,.35)'); pg.addColorStop(.5, 'rgba(255,200,230,.25)'); pg.addColorStop(1, 'rgba(200,255,220,.3)'); c.fillStyle = pg; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); }
      } else {   // sprinkles
        for (const [dx, dy, a, col] of o.bits) { const L = s * .016; c.save(); c.translate(dx * s, dy * s); c.rotate(a); c.fillStyle = 'rgba(70,40,30,.25)'; rr(c, -L + 1, -L * .3 + 2, L * 2, L * .7, L * .35); c.fill(); c.fillStyle = css(col); rr(c, -L, -L * .35, L * 2, L * .7, L * .35); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; rr(c, -L * .8, -L * .3, L * 1.4, L * .22, L * .1); c.fill(); c.restore(); }
      }
      c.restore();
    }
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#fdf1dd'); bg.addColorStop(1, '#f6dcbc'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 7; i++) c.fillRect(0, h * (i + .5) / 7, w, 2);
      const b = this.board; this.drawMat(c, b.x, b.y, b.s); this.drawObjs(c, b.x, b.y, b.s, b.s * this.dpr, true);
      // a ring that shows how big the tool is, and where a cutter, stamp or bead will land
      const s = this.stroke, hv = this.hover && this.ptr == null && this.inBoard(this.hover.x, this.hover.y) ? this.hover : null;
      if (s) {
        const p = this.sp(s.g[0], s.g[1]);
        if (s.tool === 'cutters' || s.tool === 'stamps') {
          const kind = s.tool === 'cutters' ? this.cutter : this.stamp, r = (s.tool === 'cutters' ? this.cutterR() : STAMP_R[this.size]) * b.s;
          c.save(); c.translate(p.x, p.y); SHAPE_PATH(c, kind, r); c.fillStyle = 'rgba(255,255,255,.3)'; c.fill('evenodd'); c.setLineDash([r * .2, r * .14]); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(90,63,94,.4)'; c.lineWidth = 1.2; c.stroke(); c.restore();
        } else if (s.tool === 'extras') { c.save(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.setLineDash([6, 5]); c.beginPath(); c.arc(p.x, p.y, (this.extra === 'eye' ? EYE_R[this.size] : BEAD_R[this.size] * 1.4) * b.s, 0, TAU); c.stroke(); c.restore(); }
        else if (s.tool === 'knife') { const a = this.sp(s.start[0], s.start[1]); c.save(); c.setLineDash([8, 6]); c.strokeStyle = '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(p.x, p.y); c.stroke(); c.strokeStyle = 'rgba(90,63,94,.5)'; c.lineWidth = 1.5; c.stroke(); c.restore(); }
        else if (s.tool === 'roll') { c.save(); c.translate(p.x, p.y); c.rotate(-.35); const L = this.radius() * b.s * 1.6, Rr = this.radius() * b.s * .5; c.fillStyle = 'rgba(224,168,104,.85)'; rr(c, -L, -Rr, L * 2, Rr * 2, Rr); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, -L + 4, -Rr + 3, L * 2 - 8, Rr * .5, Rr * .25); c.fill(); c.restore(); }
        else if (s.tool !== 'hand') { c.save(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, this.radius() * b.s * (s.tool === 'squish' ? 1.1 : s.tool === 'pinch' ? .6 : 1), 0, TAU); c.stroke(); c.strokeStyle = 'rgba(90,63,94,.35)'; c.lineWidth = 1.5; c.stroke(); c.restore(); }
      } else if (hv && (this.tool === 'clay')) { c.save(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.setLineDash([5, 6]); c.lineWidth = 2; c.beginPath(); c.arc(hv.x, hv.y, this.radius() * b.s, 0, TAU); c.stroke(); c.restore(); }
      this.fx.draw(c);
      for (const it of this.items) this.drawItem(c, it);
      if (this.menu) this.drawMenu(c);
      if (this.snapA) this.drawSnap(c);
      if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash * .75})`; c.fillRect(0, 0, w, h); }
      if (this.confirm) this.drawConfirm(c);
      if (this.album) this.drawAlbum(c);
    }

    /* ---------------------------------------------------------------- her album of clay pictures */
    async openAlbum() {
      const pid = this.pid(); if (!pid || !SPG.photos) return; this.album = { list: [], page: 0, view: -1, busy: true }; this.menu = null;
      const rows = await SPG.photos.list(pid, 'clay'), A = this.album; if (this.album !== A) return;
      for (const r of rows) { try { const bm = await createImageBitmap(r.blob); A.list.push({ id: r.id, img: bm }); } catch (_) { /* skip a picture that cannot be read */ } }
      A.busy = false;
    }
    closeAlbum() { if (this.album) for (const p of this.album.list) { try { p.img.close && p.img.close(); } catch (_) { /* fine */ } } this.album = null; }
    albumLayout() {
      const w = this.w, h = this.h, pw = Math.min(w - 16, 760), ph = Math.min(h - 16, 560), x = (w - pw) / 2, y = (h - ph) / 2, cols = pw > ph * 1.2 ? 4 : 3, rows = pw > ph * 1.2 ? 3 : 4, r = Math.min(this.bs * .62, 40);
      const gx = x + 16, gy = y + r * 2 + 22, cw = (pw - 32) / cols, ch = (ph - (gy - y) - 16 - r * 1.2) / rows;
      return { x, y, pw, ph, cols, rows, per: cols * rows, r, gx, gy, cw, ch, close: { x: x + pw - r - 10, y: y + r + 10 }, prev: { x: x + pw / 2 - r * 1.6, y: y + ph - r - 8 }, next: { x: x + pw / 2 + r * 1.6, y: y + ph - r - 8 } };
    }
    albumDown(x, y) {
      const A = this.album, L = this.albumLayout(), near = (b, k = 1.1) => Math.hypot(x - b.x, y - b.y) < L.r * k;
      if (A.view >= 0) {
        const t = { x: L.x + L.r + 10, y: L.y + L.r + 10 };
        if (near(t)) { const it = A.list[A.view]; sfx.tap(); if (it && SPG.photos) SPG.photos.remove(it.id).then(() => { try { it.img.close && it.img.close(); } catch (_) { /* fine */ } A.list.splice(A.view, 1); A.view = -1; A.page = Math.min(A.page, Math.max(0, Math.ceil(A.list.length / L.per) - 1)); }); return; }
        A.view = -1; sfx.tap(); return;
      }
      if (near(L.close)) { sfx.tap(); this.closeAlbum(); return; }
      if (near(L.prev) && A.page > 0) { A.page--; sfx.tap(); return; }
      if (near(L.next) && (A.page + 1) * L.per < A.list.length) { A.page++; sfx.tap(); return; }
      const cx = Math.floor((x - L.gx) / L.cw), cy = Math.floor((y - L.gy) / L.ch), i = A.page * L.per + cy * L.cols + cx;
      if (cx >= 0 && cx < L.cols && cy >= 0 && cy < L.rows && i < A.list.length) { A.view = i; sfx.pop(); }
    }
    drawAlbum(c) {
      const A = this.album, L = this.albumLayout(); c.fillStyle = 'rgba(90,63,94,.55)'; c.fillRect(0, 0, this.w, this.h);
      c.fillStyle = '#fffaf0'; rr(c, L.x, L.y, L.pw, L.ph, 28); c.fill();
      const btn = (b, col, draw) => { c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, L.r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = L.r * .2; c.lineCap = c.lineJoin = 'round'; draw(); };
      if (A.view >= 0 && A.list[A.view]) {
        const im = A.list[A.view].img, s = Math.min(L.pw - 40, L.ph - 40);
        c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 14; c.fillStyle = '#fff'; rr(c, this.w / 2 - s / 2 - 8, this.h / 2 - s / 2 - 8, s + 16, s + 16, 16); c.fill(); c.restore(); c.drawImage(im, this.w / 2 - s / 2, this.h / 2 - s / 2, s, s);
        const t = { x: L.x + L.r + 10, y: L.y + L.r + 10 }; btn(t, '#ff8aa3', () => { c.save(); c.translate(t.x, t.y); c.scale(L.r / 20, L.r / 20); c.fillStyle = '#fff'; rr(c, -11, -8, 22, 22, 4); c.fill(); rr(c, -14, -13, 28, 4, 2); c.fill(); rr(c, -4, -17, 8, 5, 2); c.fill(); c.restore(); });
        return;
      }
      btn(L.close, '#ff8aa3', () => { c.beginPath(); c.moveTo(L.close.x - L.r * .3, L.close.y - L.r * .3); c.lineTo(L.close.x + L.r * .3, L.close.y + L.r * .3); c.moveTo(L.close.x + L.r * .3, L.close.y - L.r * .3); c.lineTo(L.close.x - L.r * .3, L.close.y + L.r * .3); c.stroke(); });
      c.save(); c.translate(L.x + L.r + 14, L.y + L.r + 10); this.icon(c, 'album', L.r * .9); c.restore();
      if (A.busy) { c.fillStyle = '#b9a3c7'; c.font = `700 ${L.r * .7}px Fredoka, system-ui`; c.textAlign = 'center'; c.fillText('...', this.w / 2, this.h / 2); return; }
      if (!A.list.length) { c.save(); c.translate(this.w / 2, this.h / 2); this.icon(c, 'camera', L.r * 1.6); c.restore(); return; }
      for (let k = 0; k < L.per; k++) {
        const i = A.page * L.per + k; if (i >= A.list.length) break; const cx = k % L.cols, cy = Math.floor(k / L.cols), s = Math.min(L.cw, L.ch) - 14, x = L.gx + cx * L.cw + (L.cw - s) / 2, y = L.gy + cy * L.ch + (L.ch - s) / 2;
        c.fillStyle = '#fff'; c.strokeStyle = '#eadbc8'; c.lineWidth = 2; rr(c, x - 4, y - 4, s + 8, s + 8, 10); c.fill(); c.stroke(); c.drawImage(A.list[i].img, x, y, s, s);
      }
      if (A.page > 0) btn(L.prev, '#59b96e', () => { c.beginPath(); c.moveTo(L.prev.x + L.r * .15, L.prev.y - L.r * .35); c.lineTo(L.prev.x - L.r * .2, L.prev.y); c.lineTo(L.prev.x + L.r * .15, L.prev.y + L.r * .35); c.stroke(); });
      if ((A.page + 1) * L.per < A.list.length) btn(L.next, '#59b96e', () => { c.beginPath(); c.moveTo(L.next.x - L.r * .15, L.next.y - L.r * .35); c.lineTo(L.next.x + L.r * .2, L.next.y); c.lineTo(L.next.x - L.r * .15, L.next.y + L.r * .35); c.stroke(); });
    }
    /* ---------------------------------------------------------------- pictures */
    snap() {
      if (this.t < this.camUntil) { sfx.oops && sfx.oops(); return; }
      this.camUntil = this.t + 3; this.flash = 1; sfx.snap(); setTimeout(() => sfx.chime(), 140);
      try {
        const S = 900, out = document.createElement('canvas'); out.width = out.height = S; const q = out.getContext('2d');
        const bg = q.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#fdf1dd'); bg.addColorStop(1, '#f7dfc0'); q.fillStyle = bg; q.fillRect(0, 0, S, S);
        this.drawMat(q, 40, 40, S - 80); this.drawObjs(q, 40, 40, S - 80, this.board.s * this.dpr, false);
        q.fillStyle = 'rgba(90,63,94,.55)'; q.font = '700 34px Fredoka, system-ui, sans-serif'; q.textAlign = 'center'; q.fillText('Clay Corner', S / 2, S - 12);
        const small = document.createElement('canvas'); small.width = small.height = 120; small.getContext('2d').drawImage(out, 0, 0, 120, 120); this.snapA = { img: small, t: 0 };
        out.toBlob(b => { if (b && this.pid() && SPG.photos) SPG.photos.add(this.pid(), b, { game: 'clay', recipe: 'clay', name: 'Clay' }); }, 'image/jpeg', .9);
      } catch (_) { /* no picture this time */ }
    }

    /* ---------------------------------------------------------------- buttons and menus */
    drawItem(c, it) {
      const r = it.r;
      if (it.kind === 'color') {
        const col = COLORS[it.id], on = this.col === it.id;
        c.fillStyle = 'rgba(90,63,94,.2)'; c.beginPath(); c.arc(it.x, it.y + r * .14, r, 0, TAU); c.fill();
        if (col.rainbow) { const g = c.createConicGradient ? c.createConicGradient(0, it.x, it.y) : null; if (g) { for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60},80%,62%)`); c.fillStyle = g; } else c.fillStyle = '#f6a'; }
        else { const g = c.createRadialGradient(it.x - r * .35, it.y - r * .4, r * .1, it.x, it.y, r); g.addColorStop(0, css(col.c, 1.12)); g.addColorStop(1, css(col.c, .82)); c.fillStyle = g; }
        c.beginPath(); c.arc(it.x, it.y, r * (on ? 1.06 : .94), 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(it.x - r * .3, it.y - r * .42, r * .3, r * .16, -.5, 0, TAU); c.fill();
        if (on) { c.strokeStyle = '#59b96e'; c.lineWidth = Math.max(4, r * .2); c.beginPath(); c.arc(it.x, it.y, r * 1.12, 0, TAU); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, r * .08); c.beginPath(); c.arc(it.x, it.y, r * 1.2, 0, TAU); c.stroke(); }
        return;
      }
      const on = it.kind === 'tool' && this.tool === it.id, off = it.id === 'undo' && !this.undo.length;
      const pulse = it.id === 'clay' && !this.touched && this.tool === 'clay' ? 1 + Math.sin(this.t * 5) * .06 : 1;
      c.fillStyle = 'rgba(90,63,94,.2)'; c.beginPath(); c.arc(it.x, it.y + r * .14, r * pulse, 0, TAU); c.fill();
      c.fillStyle = on ? '#fff6cc' : '#fff'; c.globalAlpha = off ? .5 : 1; c.beginPath(); c.arc(it.x, it.y, r * pulse, 0, TAU); c.fill();
      if (on) { c.strokeStyle = '#59b96e'; c.lineWidth = Math.max(4, r * .16); c.stroke(); }
      c.save(); c.translate(it.x, it.y); this.icon(c, it.id, r * .72, it); c.restore(); c.globalAlpha = 1;
    }
    icon(c, id, s) {
      c.save(); c.lineCap = c.lineJoin = 'round'; const cc = css(COLORS[this.col].rainbow ? [255, 126, 182] : COLORS[this.col].c), INK = '#5a3f5e';
      const ball = (x, y, r, col) => { const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#fff8'); g.addColorStop(.25, col); g.addColorStop(1, col); c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(x - r * .3, y - r * .4, r * .32, r * .17, -.5, 0, TAU); c.fill(); };
      if (TOOLPIC[id]) { TOOLPIC[id](c, s * 1.05, COLORS[this.col].rainbow ? [255, 126, 182] : COLORS[this.col].c); c.restore(); return; }
      switch (id) {
        case 'clay': ball(-s * .2, s * .12, s * .55, cc); c.strokeStyle = cc; c.lineWidth = s * .3; c.beginPath(); c.moveTo(s * .1, -s * .45); c.bezierCurveTo(s * .5, -s * .9, s * .9, -s * .1, s * .62, s * .5); c.stroke(); break;
        case 'hand': c.fillStyle = '#ffcfa4'; rr(c, -s * .5, -s * .05, s, s * .8, s * .3); c.fill(); for (let i = 0; i < 4; i++) { rr(c, -s * .5 + i * s * .26, -s * (.75 - (i === 1 || i === 2 ? .1 : 0)), s * .22, s * .85, s * .11); c.fill(); } c.save(); c.translate(-s * .55, s * .15); c.rotate(-.8); rr(c, 0, -s * .1, s * .5, s * .22, s * .11); c.fill(); c.restore(); break;
        case 'pull': c.fillStyle = cc; c.beginPath(); c.ellipse(-s * .25, s * .2, s * .62, s * .42, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(s * .1, s * .02); c.quadraticCurveTo(s * .55, -s * .15, s * .8, -s * .55); c.quadraticCurveTo(s * .55, s * .1, s * .15, s * .45); c.fill(); c.strokeStyle = INK; c.lineWidth = s * .13; c.beginPath(); c.moveTo(s * .2, -s * .1); c.lineTo(s * .85, -s * .6); c.stroke(); break;
        case 'squish': c.fillStyle = cc; c.beginPath(); c.ellipse(0, s * .55, s * .85, s * .24, 0, 0, TAU); c.fill(); c.fillStyle = '#ffcfa4'; rr(c, -s * .55, -s * .55, s * 1.1, s * .55, s * .22); c.fill(); c.strokeStyle = INK; c.lineWidth = s * .12; c.beginPath(); c.moveTo(0, -s * .95); c.lineTo(0, -s * .62); c.moveTo(-s * .16, -s * .75); c.lineTo(0, -s * .6); c.lineTo(s * .16, -s * .75); c.stroke(); break;
        case 'roll': c.save(); c.rotate(-.35); c.fillStyle = '#e0a868'; rr(c, -s * .62, -s * .27, s * 1.24, s * .54, s * .22); c.fill(); c.fillStyle = '#f2c78e'; rr(c, -s * .62, -s * .2, s * 1.24, s * .16, s * .08); c.fill(); c.fillStyle = '#b87a40'; rr(c, -s * 1.0, -s * .1, s * .45, s * .2, s * .1); c.fill(); rr(c, s * .55, -s * .1, s * .45, s * .2, s * .1); c.fill(); c.restore(); break;
        case 'pinch': c.fillStyle = cc; c.beginPath(); c.moveTo(-s * .8, s * .6); c.quadraticCurveTo(-s * .2, s * .5, 0, -s * .7); c.quadraticCurveTo(s * .2, s * .5, s * .8, s * .6); c.closePath(); c.fill(); c.fillStyle = '#ffcfa4'; c.beginPath(); c.arc(-s * .42, -s * .35, s * .22, 0, TAU); c.arc(s * .42, -s * .35, s * .22, 0, TAU); c.fill(); break;
        case 'poke': c.fillStyle = cc; rr(c, -s * .85, s * .15, s * 1.7, s * .6, s * .2); c.fill(); c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, s * .22, s * .3, s * .1, 0, 0, TAU); c.fill(); c.fillStyle = '#ffcfa4'; rr(c, -s * .17, -s * .85, s * .34, s * 1.05, s * .17); c.fill(); break;
        case 'knife': c.save(); c.rotate(.7); c.fillStyle = '#dfe6ee'; c.beginPath(); c.moveTo(-s * .12, -s * .95); c.lineTo(s * .16, -s * .95); c.quadraticCurveTo(s * .3, -s * .2, s * .16, s * .2); c.lineTo(-s * .12, s * .2); c.closePath(); c.fill(); c.fillStyle = '#e0a060'; rr(c, -s * .16, s * .2, s * .36, s * .7, s * .14); c.fill(); c.restore(); break;
        case 'cutters': c.save(); SHAPE_PATH(c, 'star', s * .78); c.fillStyle = cc; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = s * .14; c.stroke(); c.strokeStyle = 'rgba(90,63,94,.5)'; c.lineWidth = s * .06; c.stroke(); c.restore(); break;
        case 'stamps': c.fillStyle = '#e0a060'; rr(c, -s * .2, -s * .85, s * .4, s * .6, s * .15); c.fill(); c.fillStyle = cc; rr(c, -s * .75, -s * .3, s * 1.5, s * .55, s * .16); c.fill(); c.save(); c.translate(0, s * .62); SHAPE_PATH(c, 'heart', s * .22); c.fillStyle = INK; c.fill(); c.restore(); break;
        case 'smooth': c.fillStyle = '#ffe28a'; rr(c, -s * .75, -s * .5, s * 1.5, s, s * .3); c.fill(); c.fillStyle = '#e7bd4b'; for (const [x, y] of [[-.4, -.15], [.1, .2], [.45, -.2], [-.1, -.28], [.4, .22], [-.45, .25]]) { c.beginPath(); c.arc(x * s, y * s, s * .09, 0, TAU); c.fill(); } break;
        case 'dye': c.fillStyle = cc; c.beginPath(); c.moveTo(0, -s * .9); c.quadraticCurveTo(s * .85, s * .15, s * .55, s * .55); c.quadraticCurveTo(0, s * 1.0, -s * .55, s * .55); c.quadraticCurveTo(-s * .85, s * .15, 0, -s * .9); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-s * .2, s * .1, s * .12, s * .28, .3, 0, TAU); c.fill(); break;
        case 'extras': c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = s * .1; c.beginPath(); c.arc(-s * .3, 0, s * .52, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(s * .5, s * .15, s * .38, 0, TAU); c.fill(); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(-s * .2, s * .1, s * .24, 0, TAU); c.arc(s * .5, s * .22, s * .17, 0, TAU); c.fill(); break;
        case 'size': { const rs = [.26, .38, .52], xs = [-.62, -.02, .66], col = COLORS[this.col].rainbow ? [255, 126, 182] : COLORS[this.col].c; for (let i = 0; i < 3; i++) { lump(c, xs[i] * s, s * (.78 - rs[i]) , rs[i] * s * .9, rs[i] * s * .9, i === this.size ? col : [200, 188, 212]); if (i === this.size) { c.strokeStyle = '#59b96e'; c.lineWidth = s * .09; c.beginPath(); c.arc(xs[i] * s, s * (.78 - rs[i]), rs[i] * s * 1.02, 0, TAU); c.stroke(); } } break; }
        case 'undo': c.strokeStyle = INK; c.lineWidth = s * .2; c.beginPath(); c.arc(0, s * .1, s * .5, Math.PI * 1.1, Math.PI * 2.2); c.stroke(); c.fillStyle = INK; c.beginPath(); c.moveTo(-s * .78, -s * .35); c.lineTo(-s * .2, -s * .55); c.lineTo(-s * .45, s * .1); c.closePath(); c.fill(); break;
        case 'camera': c.fillStyle = INK; rr(c, -s * .85, -s * .5, s * 1.7, s * 1.15, s * .22); c.fill(); rr(c, -s * .3, -s * .72, s * .6, s * .3, s * .1); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, s * .08, s * .42, 0, TAU); c.fill(); c.fillStyle = '#7fd4f5'; c.beginPath(); c.arc(0, s * .08, s * .27, 0, TAU); c.fill(); break;
        case 'album': c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = s * .1; c.save(); c.rotate(-.18); rr(c, -s * .75, -s * .6, s * 1.0, s * 1.0, s * .1); c.fill(); c.stroke(); c.restore(); c.save(); c.rotate(.12); c.fillStyle = '#fff'; rr(c, -s * .2, -s * .45, s * 1.0, s * 1.0, s * .1); c.fill(); c.stroke(); c.fillStyle = '#9fd9a7'; rr(c, -s * .08, -s * .33, s * .76, s * .62, s * .06); c.fill(); c.fillStyle = cc; c.beginPath(); c.arc(s * .3, s * .02, s * .17, 0, TAU); c.fill(); c.restore(); break;
        case 'bin': c.fillStyle = '#9aa3b5'; rr(c, -s * .55, -s * .35, s * 1.1, s * 1.05, s * .18); c.fill(); rr(c, -s * .7, -s * .55, s * 1.4, s * .2, s * .1); c.fill(); rr(c, -s * .18, -s * .75, s * .36, s * .22, s * .08); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = s * .1; c.beginPath(); for (const x of [-.25, 0, .25]) { c.moveTo(x * s, -s * .15); c.lineTo(x * s, s * .5); } c.stroke(); break;
        default: break;
      }
      c.restore();
    }
    menuOptions() { return this.menu === 'cutters' ? CUTTERS : this.menu === 'stamps' ? STAMPS : this.menu === 'extras' ? EXTRAS : []; }
    menuLayout() {
      const opts = this.menuOptions(), n = opts.length, cols = n <= 4 ? n : 4, rows = Math.ceil(n / cols), os = Math.min(this.bs * 1.05, 70), pad = 10;
      const bw = cols * os + pad * 2, bh = rows * os + pad * 2, btn = this.items.find(i => i.kind === 'tool' && i.id === this.menu); if (!btn) return null;
      let x, y; if (this.wide) { x = btn.x + btn.r + 14; y = btn.y - bh / 2; } else { x = btn.x - bw / 2; y = btn.y - btn.r - bh - 10; }
      x = clamp(x, 6, this.w - bw - 6); y = clamp(y, 6, this.h - bh - 6);
      return { x, y, w: bw, h: bh, os, pad, cols, opts };
    }
    menuHit(x, y) {
      const L = this.menuLayout(); if (!L) return null; if (x < L.x || x > L.x + L.w || y < L.y || y > L.y + L.h) return null;
      const cx = Math.floor((x - L.x - L.pad) / L.os), cy = Math.floor((y - L.y - L.pad) / L.os), i = cy * L.cols + cx;
      return cx >= 0 && cx < L.cols && cy >= 0 && i < L.opts.length ? L.opts[i] : 'none';
    }
    pickOption(o) {
      sfx.tap(); if (o === 'none') return;
      if (this.menu === 'cutters') this.cutter = o; else if (this.menu === 'stamps') this.stamp = o; else if (this.menu === 'extras') this.extra = o;
      this.menu = null; voice.say('clay/' + o);
    }
    drawMenu(c) {
      const L = this.menuLayout(); if (!L) return;
      c.fillStyle = 'rgba(90,63,94,.22)'; rr(c, L.x, L.y + 5, L.w, L.h, 22); c.fill(); c.fillStyle = '#fffaf0'; rr(c, L.x, L.y, L.w, L.h, 22); c.fill();
      L.opts.forEach((o, i) => {
        const x = L.x + L.pad + (i % L.cols) * L.os + L.os / 2, y = L.y + L.pad + Math.floor(i / L.cols) * L.os + L.os / 2, r = L.os * .38;
        const cur = (this.menu === 'cutters' && this.cutter === o) || (this.menu === 'stamps' && this.stamp === o) || (this.menu === 'extras' && this.extra === o);
        if (cur) { c.fillStyle = '#e4f6e8'; c.beginPath(); c.arc(x, y, L.os * .46, 0, TAU); c.fill(); c.strokeStyle = '#59b96e'; c.lineWidth = 3; c.stroke(); }
        c.save(); c.translate(x, y);
        if (CUTTERS.includes(o) || STAMPS.includes(o)) { SHAPE_PATH(c, o, r); c.fillStyle = this.menu === 'stamps' ? '#b9a3c7' : css(COLORS[this.col].rainbow ? [255, 126, 182] : COLORS[this.col].c); c.fill('evenodd'); c.strokeStyle = 'rgba(90,63,94,.45)'; c.lineWidth = 2; c.stroke(); }
        else if (o === 'eye') { c.fillStyle = '#fff'; c.strokeStyle = '#5a3f5e'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#2b2430'; c.beginPath(); c.arc(r * .2, r * .15, r * .5, 0, TAU); c.fill(); }
        else if (o === 'bead') { c.fillStyle = '#ff5a6e'; c.beginPath(); c.arc(0, 0, r * .6, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(-r * .2, -r * .2, r * .18, 0, TAU); c.fill(); }
        else if (o === 'pearl') { c.fillStyle = '#ffeaf3'; c.strokeStyle = '#e8b9cf'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * .85, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * .28, -r * .3, r * .2, 0, TAU); c.fill(); }
        else { BEADS.forEach((b, k) => { c.fillStyle = css(b); c.beginPath(); c.arc(Math.cos(k * 1.1) * r * .6, Math.sin(k * 1.1) * r * .6, r * .2, 0, TAU); c.fill(); }); }
        c.restore();
      });
    }
    confirmBtns() { const r = Math.min(this.bs * .9, 62); return { r, yes: { x: this.w / 2 - r * 1.3, y: this.h / 2 + r * .9 }, no: { x: this.w / 2 + r * 1.3, y: this.h / 2 + r * .9 } }; }
    drawConfirm(c) {
      c.fillStyle = 'rgba(90,63,94,.5)'; c.fillRect(0, 0, this.w, this.h); const b = this.confirmBtns(), w = b.r * 5.4, h = b.r * 4.2;
      c.fillStyle = '#fffaf0'; rr(c, this.w / 2 - w / 2, this.h / 2 - h / 2 - b.r * .2, w, h, 30); c.fill();
      c.save(); c.translate(this.w / 2, this.h / 2 - b.r * .85); this.icon(c, 'bin', b.r * 1.1); c.restore();
      c.fillStyle = '#59b96e'; c.beginPath(); c.arc(b.yes.x, b.yes.y, b.r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = b.r * .2; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(b.yes.x - b.r * .38, b.yes.y); c.lineTo(b.yes.x - b.r * .1, b.yes.y + b.r * .3); c.lineTo(b.yes.x + b.r * .42, b.yes.y - b.r * .3); c.stroke();
      c.fillStyle = '#ff8aa3'; c.beginPath(); c.arc(b.no.x, b.no.y, b.r, 0, TAU); c.fill(); c.beginPath(); c.moveTo(b.no.x - b.r * .3, b.no.y - b.r * .3); c.lineTo(b.no.x + b.r * .3, b.no.y + b.r * .3); c.moveTo(b.no.x + b.r * .3, b.no.y - b.r * .3); c.lineTo(b.no.x - b.r * .3, b.no.y + b.r * .3); c.stroke();
    }
    drawSnap(c) {
      const A = this.snapA, cam = this.item('act', 'camera'), u = clamp((A.t - .35) / .8, 0, 1), e = u * u * (3 - 2 * u), b = this.board;
      const sx = b.x + b.s / 2, sy = b.y + b.s / 2, x = sx + (cam.x - sx) * e, y = sy + (cam.y - sy) * e, s = b.s * .5 * (1 - e) + cam.r * 1.3 * e;
      c.save(); c.translate(x, y); c.rotate(-.06 * (1 - e)); c.globalAlpha = 1 - clamp((A.t - 1.1) / .3, 0, 1); c.fillStyle = '#fff'; rr(c, -s / 2 - 6, -s / 2 - 6, s + 12, s + 22, 8); c.fill(); c.drawImage(A.img, -s / 2, -s / 2, s, s); c.restore();
    }
  }

  /* ---------------------------------------------------------------- hub icon */
  SPG.games.push({
    id: 'clay', name: 'Clay Corner', order: 13,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff3e2'); g.addColorStop(1, '#f8dcc0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const S = Math.min(w, h) * (window.devicePixelRatio > 1 ? 1 : 1), put = (cont, rgb, th, extra) => { const sp = K.sprite(Object.assign({ cont, h: th, rgb, dents: [] }, extra || {}), S); c.drawImage(sp.cv, w / 2 - S / 2 + sp.x * S, h / 2 - S / 2 + sp.y * S, sp.w, sp.h); };
      // a little clay bunny: a pink body, two ears and a blue ball beside it, a yellow snake along the bottom
      put([K.rope([[.2, .86], [.4, .8], [.6, .88], [.8, .82]], .055, 3)], [255, 208, 60], 1);
      put([K.circle(.7, .55, .15, 4)], [96, 196, 240], 1);
      put([K.rope([[.3, .2], [.3, .4]], .055, 6)], [255, 118, 178], 1); put([K.rope([[.46, .2], [.46, .4]], .055, 8)], [255, 118, 178], 1);
      put([K.circle(.38, .56, .2, 9)], [255, 118, 178], 1);
      const eye = (x, y) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(x * w, y * h, w * .04, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2a2430'; c.beginPath(); c.arc(x * w + 1, y * h + 2, w * .022, 0, Math.PI * 2); c.fill(); };
      eye(.33, .53); eye(.44, .53);
    },
    create: host => new ClayGame(host)
  });
})();
