// Sprout Kitchen: a step-by-step cooking game. Pick Sweets, Sandwiches or Burgers, pick one of six recipes, and cook it with big simple
// touches: drop in the ingredients, stir, roll the dough, press a character cookie cutter, bake, spread, stack, grill, add sauces and
// sprinkles, and then serve it and take bites. The screen moves on by itself when a step is finished, a little chef shows what to do
// next, and every instruction is spoken. Nothing can go wrong: a wrong ingredient just wiggles and the right one glows.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const { PEN_R, shapePath, F, BUNS, BREADS, CHEESES, TOPL, SAUCE_L, drawPizza, drawTops, drawScoop, TOP_SZ, pizzaClip, FLAT, sundaeTop, clamp, lerp, ease, rr, rnd, shade, circ, ell, box, tri, shine, blob, FF, fancyText, fitLabel, gingham, ribbon, PIECES, SHAPES, starPath, heartPath, shapeFill, cookieShape, cutterArt, BUN, BREAD, CRUST, ING, TUBE, SCOOP, ICING, SCOOPS, NAME, LAYER, SAUCE, SEASON, drawTable, drawBoard, drawPlate, drawBowl, drawSpoon, drawPin, drawOven, drawGrill, drawToaster, LAYER_ICON, DOUGH, BAKED, CHOCDOUGH, CHOCBAKED, drawDeco, drawCookie, mixHex, drawCupcake, drawCake, drawFlatDots, drawStack, drawHotdog, drawSundae, drawPiece, drawCharSandwich, drawSliced, pieceHeight, sampleBox, drawSample, ICOL, BATTER, SPRINKLE, stepIcon, pan, drawSheet, drawCupcakeAt, drawTapHint, drawPieceC, drawUnit, lerpHex, SPRINKLE_KINDS, drawSprinkle, CANDY_KINDS, drawCandy, CANDLE_KINDS, drawCandle, FRUIT_KINDS, ICING12, drawIcingPen, drawPaintBucket, drawMeasure, drawPile, drawEgg, saucePts, grainPts, drawPaintList, drawShadowDisc, drawPieceAt, pieceBase, drawKnife, drawBittenAt, TAU } = SPG.cookArt;

  /* ---------------------------------------------------------------- recipes (three kinds, six each) */
  // steps: add (drop ingredients in the bowl) stir roll cut (character cutters) fill (batter/dough onto a tray) bake grill (grill, pan or toaster)
  //        stack (guided layers) decorate (icing, sprinkles, sauces, seasoning) slice serve (and take bites)
  const CAM_COOL = 8;   // seconds the camera button rests after each photo
  const CATS = [{ id: 'sweets', name: 'Sweets' }, { id: 'sandwiches', name: 'Sandwiches' }, { id: 'burgers', name: 'Burgers & more' }];
  // each kind of food has its own colours: tabs, cloth, cards and ribbons
  const CAT_COL = [{ main: '#ff7aa8', dark: '#c93b73', light: '#ffe3ee' }, { main: '#ffae2e', dark: '#b8710a', light: '#fff0cc' }, { main: '#ff6a52', dark: '#b6372a', light: '#ffdcd5' }];
  // how big a finished food is, in units of its radius (to fit a picture of it into a box)
  const sauceLine = (col, a = -.3, b = .3, y = 0) => ({ col, pts: [[a, y], [a * .5, y - .03], [0, y + .03], [b * .5, y - .03], [b, y]] });
  const stackOf = ids => ({ type: 'stack', layers: ids.map(id => ({ id })) });
  const RECIPES = [
    { id: 'sugar', cat: 0, name: 'Sugar cookies', ptype: 'cookie', steps: [
      { k: 'add', ids: ['flour', 'sugar', 'butter', 'egg'], meas: { flour: ['cup', 'cup', 'cup'], sugar: ['cup', 'half'], butter: ['stick', 'stick'], egg: ['egg'] } }, { k: 'stir' }, { k: 'roll' }, { k: 'cut', n: 6 }, { k: 'bake' },
      { k: 'decorate', tools: ['icing', 'bucket', 'sprinkles', 'candy'], need: 4 }, { k: 'serve' }],
      sample: { type: 'multi', parts: [[-.6, .1, { type: 'cookie', shape: 'star', baked: 1, deco: { fill: '#ff9ec8', dots: [{ id: 'sprinkles', x: -.2, y: -.1, col: '#fff', rot: .5 }, { id: 'sprinkles', x: .2, y: .1, col: '#ffd54a', rot: -.5 }] } }, .5], [.55, -.05, { type: 'cookie', shape: 'bear', baked: 1, deco: { fill: '#7fd4f5', dots: [{ id: 'candy', x: 0, y: .25, col: '#ff6b81' }] } }, .5], [0, .55, { type: 'cookie', shape: 'heart', baked: 1, deco: { fill: '#ffe066', dots: [{ id: 'candy', x: -.1, y: -.1, col: '#5cc8f2' }] } }, .5]] } },
    { id: 'chip', cat: 0, name: 'Chocolate chip cookies', ptype: 'cookie', steps: [
      { k: 'add', ids: ['flour', 'sugar', 'butter', 'egg', 'chips'], meas: { flour: ['cup', 'cup'], sugar: ['cup'], butter: ['stick', 'stick'], egg: ['egg'], chips: ['cup', 'cup'] } }, { k: 'stir' }, { k: 'fill', what: 'dough', lay: 'sheet', n: 6 }, { k: 'bake' }, { k: 'serve' }],
      sample: { type: 'multi', parts: [[-.5, 0, { type: 'cookie', shape: 'round', baked: 1, chips: true }, .62], [.5, -.1, { type: 'cookie', shape: 'round', baked: 1, chips: true }, .62], [0, .55, { type: 'cookie', shape: 'round', baked: 1, chips: true }, .62]] } },
    { id: 'cupcake', cat: 0, name: 'Cupcakes', ptype: 'cupcake', steps: [
      { k: 'add', ids: ['flour', 'sugar', 'butter', 'egg', 'milk'], meas: { flour: ['cup', 'half'], sugar: ['cup'], butter: ['stick'], egg: ['egg', 'egg'], milk: ['half'] } }, { k: 'stir' }, { k: 'fill', what: 'batter', lay: 'cups', n: 6 }, { k: 'bake' },
      { k: 'decorate', tools: ['icing'], mode: 'frost', need: 3 },
      { k: 'decorate', tools: ['sprinkles', 'candy', 'fruit', 'icing'], need: 3 }, { k: 'serve' }],
      sample: { type: 'cupcake', baked: 1, liner: '#ff9ec8', frost: { col: '#ffd0e4' }, tops: [{ id: 'cherry', x: 0, y: -.62 }, { id: 'sprinkles', x: -.2, y: -.3, col: '#5cc8f2', rot: .4 }, { id: 'sprinkles', x: .22, y: -.24, col: '#ffd54a', rot: -.6 }] } },
    { id: 'cake', cat: 0, name: 'Birthday cake', ptype: 'cake', steps: [
      { k: 'add', ids: ['flour', 'sugar', 'butter', 'egg', 'milk'], meas: { flour: ['cup', 'cup'], sugar: ['cup', 'half'], butter: ['stick'], egg: ['egg', 'egg', 'egg'], milk: ['cup'] } }, { k: 'stir' }, { k: 'fill', what: 'batter', lay: 'pan', n: 1 }, { k: 'bake' },
      { k: 'decorate', tools: ['icing'], mode: 'frost', need: 1 },
      { k: 'decorate', tools: ['candle', 'fruit', 'sprinkles', 'candy', 'icing'], need: 4 }, { k: 'serve' }],
      sample: { type: 'cake', baked: 1, frost: { col: '#ffd0e4' }, tops: [{ id: 'candle', x: 0, y: -.12 }, { id: 'candle', x: -.42, y: 0 }, { id: 'candle', x: .42, y: 0 }, { id: 'strawberry', x: -.22, y: .14 }, { id: 'strawberry', x: .22, y: .14 }] } },
    { id: 'pancake', cat: 0, name: 'Pancakes', ptype: 'stack', steps: [
      { k: 'add', ids: ['flour', 'egg', 'milk', 'butter'], meas: { flour: ['cup', 'half'], egg: ['egg'], milk: ['cup', 'half'], butter: ['tbsp', 'tbsp'] } }, { k: 'stir' }, { k: 'fill', what: 'batter', lay: 'griddle', n: 3 },
      { k: 'grill', id: 'pancake', device: 'pan', existing: true }, { k: 'stack', order: ['pancake', 'pancake', 'pancake', 'butterpat'] },
      { k: 'decorate', tools: ['syrup', 'fruit', 'cream', 'sprinkles'], need: 3 }, { k: 'serve' }],
      sample: { type: 'stack', layers: [{ id: 'pancake' }, { id: 'pancake' }, { id: 'pancake' }, { id: 'butterpat' }], tops: [{ id: 'strawberry', x: -.4, y: -.62 }, { id: 'blueberry', x: .35, y: -.58 }, { id: 'blueberry', x: .5, y: -.5 }] } },
    { id: 'sundae', cat: 0, name: 'Ice cream sundae', ptype: 'sundae', steps: [
      { k: 'build', scoop: true, items: ['sc-vanilla', 'sc-strawb', 'sc-choc', 'sc-mint', 'sc-blueb'], max: 3, min: 1, say: 'cook-scoop', icon: 'sc-strawb' },
      { k: 'decorate', tools: ['ice-choc', 'caramel', 'strawsauce', 'cream', 'sprinkles', 'fruit', 'candy'], need: 3 }, { k: 'serve' }],
      sample: { type: 'sundae', scoops: [{ id: 'vanilla' }, { id: 'strawb' }, { id: 'choc' }], cream: true, tops: [{ id: 'cherry', x: 0, y: -2.36 }, { id: 'sprinkles', x: -.3, y: -1.5, col: '#5cc8f2', rot: .5 }, { id: 'sprinkles', x: .32, y: -1.42, col: '#ffd54a', rot: -.3 }] } },

    { id: 'sandwich', cat: 1, name: 'Build a sandwich', ptype: 'stack', steps: [
      { k: 'pick', key: 'bread', opts: ['bread-white', 'bread-wheat', 'bread-rye'], say: 'cook-pickbread' },
      { k: 'build', items: ['ham', 'turkey', 'salami', 'chickenslice'], max: 4, say: 'cook-meat', icon: 'ham' },
      { k: 'build', items: ['cheddar', 'american', 'provolone', 'pepperjack', 'swiss'], max: 3, say: 'cook-cheese', icon: 'cheddar' },
      { k: 'build', items: ['lettuce', 'tomato', 'cucumber', 'pickle', 'onion', 'avocado'], max: 6, say: 'cook-veg', icon: 'lettuce' },
      { k: 'build', items: ['mayo', 'mustard', 'ketchup', 'TOP'], max: 3, end: 'TOP', say: 'cook-saucetop', icon: 'mayo' },
      { k: 'slice' }, { k: 'serve' }],
      sample: { type: 'stack', sliced: 1, layers: [{ id: 'bread-wheat' }, { id: 'ham' }, { id: 'cheddar' }, { id: 'lettuce' }, { id: 'tomato' }, { id: 'breadT-wheat' }] } },
    { id: 'pbj', cat: 1, name: 'Peanut butter and jelly', ptype: 'stack', steps: [
      { k: 'stack', order: ['bread', 'pbutter', 'jelly', 'bread'] }, { k: 'cut', target: 'piece' }, { k: 'serve' }],
      sample: { type: 'stack', shape: 'bear', layers: [{ id: 'bread' }] } },
    { id: 'toastie', cat: 1, name: 'Cheese toastie', ptype: 'stack', steps: [
      { k: 'grill', id: 'bread', device: 'toaster', n: 2 }, { k: 'stack', order: ['toast', 'cheese', 'cheese', 'toast'] }, { k: 'slice' }, { k: 'serve' }],
      sample: { type: 'stack', sliced: 1, layers: [{ id: 'toast' }, { id: 'cheese' }, { id: 'cheese' }, { id: 'toast' }] } },

    { id: 'burger', cat: 2, name: 'Build a burger', ptype: 'stack', steps: [
      { k: 'pick', key: 'bun', opts: ['bun-plain', 'bun-sesame', 'bun-wheat'], say: 'cook-pickbun' },
      { k: 'grill', free: true, ids: ['patty', 'chicken', 'beanpatty'], max: 3, device: 'grill', toBun: true },
      { k: 'build', items: ['cheddar', 'american', 'provolone', 'pepperjack', 'swiss', 'bacon'], max: 4, say: 'cook-cheese', icon: 'cheddar' },
      { k: 'build', items: ['lettuce', 'tomato', 'onion', 'pickle', 'avocado'], max: 6, say: 'cook-veg', icon: 'lettuce' },
      { k: 'build', items: ['ketchup', 'mustard', 'mayo', 'bbq', 'TOP'], max: 4, end: 'TOP', say: 'cook-saucetop', icon: 'ketchup' },
      { k: 'serve' }],
      sample: { type: 'stack', layers: [{ id: 'bunB' }, { id: 'lettuce' }, { id: 'patty' }, { id: 'cheddar' }, { id: 'tomato' }, { id: 'sauce-ketchup' }, { id: 'bunT' }] } },
    { id: 'hotdog', cat: 2, name: 'Hot dog', ptype: 'hotdog', steps: [
      { k: 'grill', id: 'sausage', device: 'grill', n: 1 }, { k: 'stack', order: ['hotbun', 'sausage'] },
      { k: 'decorate', tools: ['ketchup', 'mustard', 'mayo', 'relish', 'onion'], need: 2 }, { k: 'serve' }],
      sample: { type: 'hotdog', layers: [{ id: 'hotbunBack' }, { id: 'sausage' }], tops: [{ id: 'relish', x: -.3, y: -.5 }, { id: 'relish', x: .3, y: -.48 }], paint: [{ col: '#f2c230', kind: 'sauce', pts: [-.8, -.4, 0, .4, .8].map((x, i) => ({ x, y: -.52 + (i % 2 ? .04 : -.03), w: .07 })) }] } },
    { id: 'pizza', cat: 2, name: 'Pizza', ptype: 'pizza', steps: [
      { k: 'roll' }, { k: 'decorate', tools: ['pizzasauce'], mode: 'cover', need: .5, say: 'cook-pizzasauce' },
      { k: 'decorate', tools: ['mozzarella'], mode: 'cover', need: .4, say: 'cook-pizzacheese' },
      { k: 'decorate', tools: ['pepperoni', 'mushroom', 'greenpepper', 'olive', 'pineapple', 'basil'], need: 3, say: 'cook-toppings' },
      { k: 'bake' }, { k: 'serve' }],
      sample: { type: 'pizza', baked: 1, paint: [{ col: '#d8342c', kind: 'sauce', pizza: true, pts: [{ x: 0, y: 0, w: 1.9 }] }], tops: [[-.5, -.2], [.1, -.4], [.55, .05], [-.2, .3], [.3, .35], [-.7, .15], [.75, -.25]].flatMap(([x, y], i) => [{ id: 'pepperoni', x, y }, { id: i % 2 ? 'basil' : 'mushroom', x: x * .6 + .15, y: y * .6 - .12, rot: i }]).concat(Array.from({ length: 40 }, (_, i) => ({ id: 'shred', x: (rnd(i + 1) - .5) * 1.9, y: (rnd(i + 30) - .5) * 1.2, rot: rnd(i) * 3 }))).sort((a, b) => (a.id === 'shred' ? 0 : 1) - (b.id === 'shred' ? 0 : 1)) } }
  ];
  const BITES = { cookie: 3, cupcake: 4, cake: 5, stack: 4, hotdog: 3, sundae: 4, pizza: 5 };
  // The ingredient that a layer id stands for in the tray, and the layer it draws as
  const layerOf = id => id === 'hotbun' ? 'hotbunBack' : id;
  const DOTS = ['sprinkles', 'candy', 'star', 'fruit', 'cherry', 'strawberry', 'blueberry', 'raspberry', 'banana', 'kiwi', 'orange', 'grape', 'candle', 'chips', 'onion', 'relish', 'cream', 'pepperoni', 'mushroom', 'greenpepper', 'olive', 'pineapple', 'basil'];
  const SAUCES = ['ketchup', 'mustard', 'mayo', 'syrup', 'ice-choc', 'caramel', 'strawsauce', 'bbq', 'pizzasauce'];
  const SEASONS = ['salt', 'pepper'];


  /* ---------------------------------------------------------------- the game */
  const H = {};   // one handler per kind of step (below)
  const VARS = { sprinkles: () => SPRINKLE_KINDS.map(k => ['spr-' + k, k]), candy: () => CANDY_KINDS.map(k => ['cdy-' + k, k]), candle: () => CANDLE_KINDS.map(k => ['cnd-' + k.id, k.id]), fruit: () => FRUIT_KINDS.map(k => [k, k]), icing: () => Object.keys(ICING12).map(k => ['pen-' + k, k]) };
  VARS.bucket = VARS.icing;
  const kindKey = tool => tool === 'bucket' ? 'icing' : tool;
  // icing colour for a tool: the 12-colour icing button (and the bucket) use the chosen colour; the old icing tubes keep theirs
  const icingOf = (g, tool) => tool === 'icing' || tool === 'bucket' ? ICING12[g.kinds.icing] || ICING12.pink : icingOf(g, tool);
  const TRANS = 1.7;   // seconds for the gentle change between two steps
  const bitesFor = (p, n = 1) => { const b = BITES[p.type] || 4; return n >= 5 ? 2 : n >= 3 ? Math.min(b, 3) : b; };

  class CookGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('cook', () => ({ done: {}, total: 0 }));
      this.bag.done = this.bag.done || {}; this.bag.total = this.bag.total || 0;
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s * .5); c.scale(s / 90, s / 90); drawCupcake(c, { baked: 1, liner: '#ff9ec8', frost: { col: '#ffd0e4' }, deco: { dots: [{ id: 'cherry', x: 0, y: -.55 }] } }, 40); }, this.bag.total);
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.idle = 0;
      this.screen = 'menu'; this.tab = Math.min(2, Math.max(0, this.bag.tab || 0)); this.menuHit = [];
      this.tray = []; this.flies = []; this.motions = []; this.said = {}; this.heard = new Set(); this.trans = null;
      this.cutters = []; this.mix = null; this.pieces = []; this.dough = null; this.units = null;
      this.tick = this.tick.bind(this);
      this.oc = document.createElement('canvas');
      SPG.cookGame = this;
      try { if (document.fonts) for (const w of [400, 600, 700]) document.fonts.load(`${w} 24px Fredoka`); } catch (_) { /* the fallback font is fine */ }
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height, id: e.pointerId }; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* optional */ } SPG.audio.unlock(); if (this.ptr && !e.isPrimary) return; if (this.ptr && this.drag) { this.drag.it.drag = false; this.drag.it.back = true; this.drag = null; } this.ptr = e.pointerId; this.down(at(e)); });
      cv.addEventListener('pointermove', e => { if (this.ptr === e.pointerId) { e.preventDefault(); this.move(at(e)); } });
      for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(n, e => { if (this.ptr === e.pointerId) { this.ptr = null; this.up(at(e)); } });
    }

    /* ------------------------------------------------------------ layout */
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr(); this.dpr = dpr;
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = this.w, h = this.h;
      this.narrow = w < 620;
      this.sb = clamp(Math.min(w, h) * .085, 40, 64);
      this.topY = this.narrow ? 104 : 14;
      this.th = clamp(h * .17, 74, 138);
      this.y0 = this.topY + this.sb + 10; this.y1 = h - this.th - 6; this.SH = this.y1 - this.y0;
      this.bx = w / 2; this.by = (this.y0 + this.y1) / 2;
      this.U = Math.min(w * .92, this.SH * 1.32);
      this.uiR = clamp(Math.min(w, h) * .11, 46, 76);   // the size of the home button (see --ui in styles.css)
      this.R1 = this.piece && FLAT.includes(this.piece.type) && this.pieces.length <= 1 ? this.foodR(this.piece) : this.U * .26;
      this.layoutTray(); if (this.screen === 'menu') this.layoutMenu();
    }
    P(ux, uy) { return { x: this.bx + ux * this.U, y: this.by + uy * this.U }; }
    bowlPos() { const top = this.pileBot || this.y0 + this.U * .26, r = Math.min(this.U * .28, (this.y1 - this.y0) * .34, (this.y1 - top - 12) / 1.45); return { x: this.bx, y: Math.max(this.by + this.U * .02, top + r * .7 + 8), r }; }
    // where each piece sits on the stage (one big, or up to four smaller)
    // a single burger, sandwich, stack, hot dog or sundae stands on the middle of its plate; its size fits the space above it
    plateR() { return Math.min(this.U * .37, this.w * .46, (this.SH - 10) / 1.7); }
    foodBase() { const pr = this.plateR(); return { x: this.bx, y: this.y1 - pr * .8 - 4 }; }
    foodR(p) { const B = this.foodBase(), room = B.y - this.y0 - 10, h1 = pieceHeight(p, 1) + (p.type === 'stack' ? .15 : .05); return clamp(Math.min(this.U * .27, room / Math.max(.6, h1), this.w * .43), this.U * .1, this.U * .27); }
    slots(n = this.pieces.length) {
      const U = this.U, tall = this.SH > this.w * .9;
      if (n <= 1) { const p = this.pieces[0]; if (p && !p.shape && FLAT.includes(p.type)) { const B = this.foodBase(); return [{ x: B.x, y: B.y - pieceHeight(p, this.R1) / 2, r: this.R1 }]; } return [{ ...this.P(0, 0), r: U * .26 }]; }
      if (n === 2) return [this.P(-.27, 0), this.P(.27, 0)].map(p => ({ ...p, r: U * .24 }));
      if (n === 3) return (tall ? [this.P(-.2, -.2), this.P(.2, -.2), this.P(0, .2)] : [this.P(-.32, 0), this.P(0, 0), this.P(.32, 0)]).map(p => ({ ...p, r: U * (tall ? .2 : .17) }));
      if (n === 4) return [this.P(-.22, -.18), this.P(.22, -.18), this.P(-.22, .2), this.P(.22, .2)].map(p => ({ ...p, r: U * .17 }));
      // five or six: a neat grid, three across (two across on a tall screen)
      const cols = tall ? 2 : 3, rows = Math.ceil(n / cols), dx = tall ? .25 : .31, dy = tall ? .25 : .29, out = [];
      for (let i = 0; i < n; i++) { const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - cols * (rows - 1) : cols, col = i % cols; out.push({ ...this.P((col - (inRow - 1) / 2) * dx, (row - (rows - 1) / 2) * dy), r: U * (tall ? .115 : .13) }); }
      return out;
    }
    // the plate or platter every step draws the food on, so nothing jumps around between steps
    // several cupcakes each get their own little plate instead of crowding one big one
    mini() { return this.pieces.length > 1 && this.pieces.every(p => p.type === 'cupcake'); }
    miniPlate(q) { const r = q.r * 1.12; return { x: q.x, y: q.y + q.r * .5, r }; }
    onPlate(p) {
      if (this.mini()) return this.slots().some(q => { const m = this.miniPlate(q); return (p.x - m.x) ** 2 / (m.r * m.r) + (p.y - m.y) ** 2 / ((m.r * .68) ** 2) <= 1.02; });
      const pl = this.plate(); return (p.x - pl.x) ** 2 / (pl.r * pl.r) + (p.y - pl.y) ** 2 / ((pl.r * .64) ** 2) <= 1.02;
    }
    drawPlates(c) {
      if (this.mini()) { for (const q of this.slots()) { const m = this.miniPlate(q); drawPlate(c, m.x, m.y, m.r); } }
      else { const pl = this.plate(); drawPlate(c, pl.x, pl.y, pl.r); }
      drawPlatePaint(this, c);
    }
    plate() {
      const U = this.U, n = this.pieces.length, p = this.pieces[0];
      if (n <= 1 && p && !p.shape && FLAT.includes(p.type)) { const B = this.foodBase(), pr = this.plateR(); return { x: B.x, y: B.y - pr * .03, r: pr }; }
      if (n <= 1 && p && p.type === 'pizza') return { x: this.bx, y: this.by + U * .03, r: Math.min(this.w * .47, U * .46) };
      const r = Math.min(this.w * .46, p && p.shape && p.type === 'stack' ? U * .5 : U * (n <= 1 ? .4 : n === 2 ? .5 : n <= 4 ? .54 : (this.SH > this.w * .9 ? .58 : .5)));
      return { x: this.bx, y: this.by + U * .03, r };
    }

    /* ------------------------------------------------------------ tray (the shelf of things to pick from) */
    setTray(list) {
      this.tray = list.map(o => ({ kind: 'ing', ...o, wig: 0, glow: 0, used: false, x: this.w / 2, y: this.h, hx: 0, hy: 0, r: 30 }));
      this.layoutTray(); for (const it of this.tray) { it.x = it.hx; it.y = it.hy + this.th; }   // slide up
    }
    layoutTray() {
      const n = this.tray.length; if (!n) return;
      if (this.tray[0].stage) {   // laid out on the counter, in a row above the bowl
        // tall screens: two rows so everything stays big enough to touch
        const bw = Math.min(this.w * .94, this.SH * 1.7), rows = this.SH > this.w * 1.1 && n > 3 ? 2 : 1, per = Math.ceil(n / rows), gap = bw / per, r = clamp(Math.min(gap * .36, this.U * .12), 24, 70);
        this.tray.forEach((it, i) => { const row = Math.floor(i / per), inRow = row === rows - 1 ? n - per * (rows - 1) : per; it.r = r; it.hx = this.bx + ((i % per) - (inRow - 1) / 2) * gap; it.hy = this.y0 + r * 1.25 + row * r * 3.3; if (!it.drag && !it.fly) { it.x = it.hx; it.y = it.hy; } });
        this.pileBot = this.y0 + r * 1.25 + (rows - 1) * r * 3.3 + r * 1.8;
        return;
      }
      const w = this.w, h = this.h, th = this.th, pad = 8, chefW = Math.max(64, th * .95);
      const left = pad + chefW, right = w - pad - 4, rows = n > 5 && this.narrow ? 2 : 1, per = Math.ceil(n / rows);
      const r = clamp(Math.min(th * (rows === 2 ? .22 : .36), (right - left) / per * .46), 16, 54);
      this.tray.forEach((it, i) => {
        const row = Math.floor(i / per), col = i % per, inRow = row === rows - 1 ? n - per * (rows - 1) : per, gap = Math.min((right - left) / inRow, r * 2.7);
        it.r = r; it.hx = (left + right) / 2 + (col - (inRow - 1) / 2) * gap; it.hy = h - th / 2 - 2 + (rows === 2 ? (row - .5) * r * 2.15 : 0);
        if (!it.drag && !it.fly) { it.x = it.hx; it.y = it.hy; }
      });
    }
    zn() { return this.zseq = (this.zseq || 0) + 1; }
    wiggle(it) { it.wig = 1; }

    /* ------------------------------------------------------------ small helpers */
    say(key, gap = 3.5) { if (this.t - (this.said[key] || -99) < gap) return; this.said[key] = this.t; voice.say(key); }
    // an ingredient's name is said the first time it is touched in a recipe, and not again (counting is said every time)
    hear(id) { if (this.heard.has(id)) return; this.heard.add(id); voice.say('cook/' + id); }
    busy() { return this.flies.length > 0 || this.motions.length > 0; }
    // an item flies from where it was let go to where it belongs, then something happens
    fly(draw, x0, y0, x1, y1, cb, size = 40, dur = .38) { this.flies.push({ draw, x0, y0, x1, y1, cb, size, t: 0, dur }); }
    ingFly(id, x0, y0, x1, y1, cb) { this.fly((c, s) => (ING[id] || ING.flour)(c, s), x0, y0, x1, y1, cb, this.U * .12); }
    finish(delay = .8) { if (this.st && !this.st.fin) { this.st.fin = true; this.st.finT = delay; } }
    pickCutters() { const all = SHAPES.slice(), out = []; while (out.length < 4) out.push(all.splice(Math.floor(Math.random() * all.length), 1)[0]); return out; }

    /* ------------------------------------------------------------ menu and recipe flow */
    enterMenu() {
      if (this.st && this.st.snd) { this.st.snd.off(); this.st.snd = null; }
      this.freeGallery(); if (SPG.photos && store.active) SPG.photos.list(store.active.id).then(l => { this.photoCount = l.length; });
      this.screen = 'menu'; this.R = null; this.st = null; this.tray = []; this.flies = []; this.motions = []; this.mix = null; this.pieces = []; this.arrow = null; this.piece = null; this.paint = null;
        this.layoutMenu(); this.say('cook-pick', 6);
    }
    startRecipe(R) {
      this.R1 = this.U * .26; this.opt = {}; this.pendingPatties = null; this.menu = null; this.pileBot = 0;
      this.kinds = { sprinkles: 'rainbow', candy: 'dot', candle: 'blue', fruit: R.id === 'sundae' ? 'cherry' : 'strawberry', icing: 'pink' };
      this.R = R; this.screen = 'intro'; this.intro = { t: 0 }; this.stIdx = 0; this.st = null; this.pieces = []; this.piece = null; this.dough = null; this.units = null; this.arrow = null; this.finishedAll = false;
      this.mix = R.steps.some(s => s.k === 'add') ? { items: [], fill: 0, stirred: 0, col: '#f6e8c8', final: BATTER } : null;
      this.cutters = this.pickCutters(); this.flies = []; this.motions = []; this.heard = new Set(); this.paint = { plate: [] }; this.piece = null; this.tool = null;
      this.tray = [];
    }
    beginStep() {
      const spec = this.R.steps[this.stIdx]; this.st = { k: spec.k, spec, fin: false, finT: 0, acts: 0 }; this.idle = 0; this.tool = null; this.promptDue = true;
      this.setTray([]); H[spec.k].enter(this, this.st);
    }
    nextStep() { if (!this.trans) { this.trans = { t: 0, mid: false }; sfx.chime(); } }
    endIntro() { if (this.screen === 'intro' && !this.trans) { this.trans = { t: 0, mid: false, intro: true }; sfx.whoosh(); } }
    recipeDone() {
      if (this.finishedAll) return; this.finishedAll = true;
      const id = this.R.id; this.bag.done[id] = (this.bag.done[id] || 0) + 1; this.bag.total++; this.counter.set(this.bag.total);
      store.addStars(1); store.save(); sfx.win(); voice.say('cook-done');
      for (let i = 0; i < 3; i++) this.fx.burst(this.w * (.25 + i * .25), this.h * .4, 26, { colors: ['#ff6b81', '#ffd54a', '#5cc8f2', '#7ed957', '#b58cf0'], shape: 'confetti', speed: 420, g: 420, life: 1.6, size: 9, up: 160 });
      this.arrow = { t: 0 };
    }

    /* ------------------------------------------------------------ input */
    down(p) {
      this.idle = 0; this.downAt = { x: p.x, y: p.y, t: this.t };
      if (this.screen === 'menu') return this.menuDown(p);
      if (this.screen === 'gallery') return this.galleryDown(p);
      if (this.screen === 'intro') { if (this.intro.t > .5) { sfx.tap(); this.endIntro(); } return; }
      if (this.trans) return;
      if (this.st) this.st.touched = true;
      if (this.menu) { const m = this.menuLayout(); for (const o of m.opts) if (Math.hypot(p.x - o.x, p.y - o.y) < o.r * 1.15) { this.kinds[kindKey(this.menu.tool)] = o.kind; sfx.pop(); this.menu = null; return; } this.menu = null; if (Math.abs(p.x - m.x) < m.w / 2 && Math.abs(p.y - m.y) < m.h / 2) return; }
      const cam = this.camBtn(); if (cam && Math.hypot(p.x - cam.x, p.y - cam.y) < cam.r * 1.15) { this.snap(); return; }
      if (this.arrow && Math.hypot(p.x - this.arrowPos().x, p.y - this.arrowPos().y) < this.arrowPos().r * 1.3) { sfx.tap(); this.enterMenu(); return; }
      if (Math.hypot(p.x - this.menuBtn().x, p.y - this.menuBtn().y) < this.menuBtn().r * 1.2) { sfx.tap(); this.enterMenu(); return; }
      const cb = this.checkBtn();
      if (cb && Math.hypot(p.x - cb.x, p.y - cb.y) < cb.r * 1.25) { sfx.tap(); if (H[this.st.k].check) H[this.st.k].check(this, this.st); else this.finish(.1); return; }
      const ch = this.chefPos();
      if (Math.hypot(p.x - ch.x, p.y - ch.y) < ch.r * 1.3) { sfx.boing(); this.hintSay(); this.chefBounce = 1; this.emote = { t: 0, col: ['#ff6b9d', '#ffd54a', '#7fd4f5'][Math.floor(Math.random() * 3)] }; return; }
      for (const it of this.tray) {
        if (it.used || it.fly) continue;
        if (Math.hypot(p.x - it.x, p.y - it.y) < it.r * 1.3) {
          if (it.kind === 'tool') { const was = this.tool === it.id && this.menu; this.tool = it.id; sfx.tap(); this.hear(it.id); this.menu = VARS[it.id] && !was ? { tool: it.id, it } : null; return; }
          this.drag = { it, id: p.id, dx: it.x - p.x, dy: it.y - p.y, sx: p.x, sy: p.y, moved: 0 }; it.drag = true; sfx.tap(); this.hear(it.id);
          return;
        }
      }
      const s = this.st; if (s && H[s.k].down && !s.fin) { this.free = true; H[s.k].down(this, s, p); }
    }
    move(p) {
      this.idle = 0;
      if (this.drag) { const d = this.drag; d.it.x = p.x + d.dx; d.it.y = p.y + d.dy - d.it.r * .5; d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy)); return; }
      const s = this.st; if (this.free && s && H[s.k].move) H[s.k].move(this, s, p);
    }
    up(p) {
      if (this.screen !== 'cook') return;
      if (this.drag) {
        const d = this.drag, it = d.it; this.drag = null; it.drag = false;
        const tap = d.moved < 24 || it.y > this.h - this.th - it.r * .2, s = this.st; let res = false;
        if (s && !s.fin && H[s.k].drop) res = H[s.k].drop(this, s, it, it.x, it.y, tap);
        if (res === true) { if (it.once) it.used = true; }
        else { if (res === 'wrong') { this.wiggle(it); sfx.boing(); this.say('cook-wrong', 9); this.idle = 99; } else if (res === 'full') { this.wiggle(it); sfx.oops(); this.idle = 99; } it.back = true; }
        return;
      }
      const s = this.st; if (this.free && s && H[s.k].up) H[s.k].up(this, s, p); this.free = false;
    }
    menuDown(p) {
      const ab = this.albumBtn(); if (Math.hypot(p.x - ab.x, p.y - ab.y) < ab.r * 1.2) { this.openGallery(); return; }
      for (const h of this.menuHit) if (h.w ? Math.abs(p.x - h.x) < h.w / 2 && Math.abs(p.y - h.y) < h.h / 2 : Math.hypot(p.x - h.x, p.y - h.y) < h.r) {
        if (h.tab != null) { this.tab = h.tab; this.bag.tab = h.tab; sfx.tap(); voice.say('cookc/' + h.tab); this.layoutMenu(); }
        else { sfx.pop(); voice.say('cookr/' + h.R.id); this.startRecipe(h.R); }
        return;
      }
    }
    chefPos() { const r = Math.max(26, this.th * .36); return { x: 8 + Math.max(64, this.th * .95) / 2, y: this.h - this.th / 2 - 2, r }; }
    menuBtn() { const r = this.sb * .5; return { x: this.narrow ? r + 12 : Math.max(this.w * .5 - (this.stepBarW || 300) / 2 - r - 14, r + 96), y: this.topY + this.sb / 2, r }; }
    arrowPos() { const r = Math.max(34, this.th * .42); return { x: this.w - r - 14, y: this.h - this.th - r * .4 - 4, r }; }
    checkBtn() { const s = this.st; if (this.screen !== 'cook' || !s || s.fin || !s.canDone) return null; const r = Math.max(32, this.th * .4); return { x: this.w - r - 18, y: this.y1 - r * 1.25, r }; }
    hintSay() {
      const s = this.st; if (!s) return; const k = s.k, sp = s.spec;
      if (sp.say && !(k === 'decorate' && s.acts > 0)) { voice.say(sp.say); return; }
      if (k === 'grill' && sp.free) { voice.say('cook-patties'); return; }
      let key = { add: 'cook-add', stir: 'cook-stir', roll: 'cook-roll', cut: sp.target === 'piece' ? 'cook-cutsand' : 'cook-cut', fill: sp.what === 'dough' ? 'cook-drop' : 'cook-pour', bake: s.state === 'cold' ? 'cook-oven-on' : s.state === 'ding' ? 'cook-ding' : 'cook-bake', grill: 'cook-grill', stack: 'cook-stack', decorate: sp.mode === 'frost' ? 'cook-frost' : (sp.tools || []).some(t => SAUCES.includes(t)) ? 'cook-squirt' : 'cook-decorate', slice: 'cook-slice', serve: 'cook-serve' }[k];
      voice.say(key);
    }
    tip() {
      const s = this.st; if (!s) return null; const k = s.k, sp = s.spec, slow = Math.floor(this.t / 3.5);
      const happy = () => { if (s.happyT == null) s.happyT = this.t; return this.t - s.happyT < 3 ? 'HAPPY' : null; };
      if (k === 'decorate' && sp.mode !== 'frost' && sp.mode !== 'cover') { const used = s.usedTools || new Set(), left = sp.tools.filter(t => !used.has(t)); if (s.acts >= s.need && (used.size >= Math.min(3, sp.tools.length) || !left.length)) return happy(); return this.iconId((left.length ? left : sp.tools)[slow % (left.length || sp.tools.length)]); }
      if (k === 'build') { if (s.end && (s.n >= 2 || s.n >= s.max)) return s.end; if (!s.end && s.n >= Math.min(2, s.max)) return happy(); const used = s.usedItems || new Set(), left = s.items.filter(t => !used.has(t) && t !== s.end); return left.length ? left[slow % left.length] : (s.end || null); }
      if (k === 'add') return (s.left && s.left[0]) || sp.ids[0];
      if (k === 'grill') return sp.free ? sp.ids[0] : sp.id;
      if (k === 'stack') return sp.order[Math.min(s.i, sp.order.length - 1)];
      if (k === 'cut') return this.cutters[0];
      if (k === 'decorate') return this.iconId(this.tool || sp.tools[0]);
      if (k === 'pick') return sp.opts[0];
      return null;
    }
    wantIds() { const s = this.st; return s && H[s.k].want ? H[s.k].want(this, s) || [] : []; }
  }

  /* ---------------------------------------------------------------- step handlers */
  // Each handler: enter(g,s) sets up the step and its tray; down/move/up are free touches; drop(g,s,item,x,y,tap) is a tray item let go
  // (return true = accepted, 'wrong' = wiggle and say try again, false = send it home); want() lists the tray ids to glow; draw() paints the stage.
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Adding ingredients: everything is laid out on the counter as real amounts (a bag of flour with its measuring cup, eggs in a carton,
  // butter sticks). Drag (or touch) one: the measuring cup lifts, tips and pours into the bowl, an egg is cracked, butter plops in;
  // then the cup is filled again for the next scoop. Counting is said out loud ("one, two").
  const MCOL = { flour: '#fbf6ec', sugar: '#ffffff', milk: '#f2f8ff', chips: '#5a3a2a', butter: '#ffe27a' };
  const amountText = (id, plan) => { const n = plan.length, u = plan[0]; if (u === 'egg') return n + (n > 1 ? ' eggs' : ' egg'); if (u === 'stick') return n + (n > 1 ? ' sticks' : ' stick'); if (u === 'tbsp') return n + ' tbsp'; const cups = plan.reduce((a, x) => a + (x === 'half' ? .5 : x === 'cup' ? 1 : 0), 0), w = Math.floor(cups); return (w ? w : '') + (cups % 1 ? '½' : '') + (cups > 1 ? ' cups' : ' cup'); };
  H.add = {
    enter(g, s) {
      // toddlers measure at most two scoops of anything; older children use the whole real recipe
      const tier = SPG.level.tier('cook'); s.plan = {}; s.got = {}; s.left = [];
      for (const id of s.spec.ids) { const all = (s.spec.meas && s.spec.meas[id]) || ['cup'], plan = tier === 1 ? all.slice(0, 2) : all; s.plan[id] = plan; s.got[id] = 0; for (let i = 0; i < plan.length; i++) s.left.push(id); }
      s.total = s.left.length; s.done = 0;
      g.setTray(s.spec.ids.map(id => ({ id, kind: 'pile', stage: true, plan: s.plan[id], label: amountText(id, s.plan[id]), cnt: { total: s.plan[id].length, done: 0 } })));
    },
    want: (g, s) => [...new Set(s.left)],
    drop(g, s, it, x, y, tap) {
      if (!s.left.includes(it.id)) return false;
      const b = g.bowlPos(); if (!tap && Math.hypot(x - b.x, (y - b.y) * 1.3) > b.r * 1.5) return false;
      s.left.splice(s.left.indexOf(it.id), 1);
      const k = ++s.got[it.id], unit = it.plan[k - 1]; it.cnt.done = k; if (k >= it.plan.length) it.used = true;
      g.addMotion(it.id, tap ? it.hx : x, tap ? it.hy : y, b, () => {
        s.done++; g.mix.items.push({ id: it.id, unit, seed: Math.floor(Math.random() * 1e9), col: ICOL[it.id] || '#fff' }); g.mix.fill = Math.min(.9, .12 + s.done / s.total * .78);
        sfx.pop(); g.fx.burst(b.x, b.y, 10, { colors: [ICOL[it.id] || '#fff', '#fff'], speed: 130, g: 300, life: .5, size: 5 });
        if (it.plan.length > 1) voice.say('num/' + k);   // counting out loud: "one, two"
        if (s.done >= s.total) g.finish(.7);
      }, unit);
      return true;
    },
    draw(g, s, c) { g.sceneBoard(c); const b = g.bowlPos(); drawBowl(c, b.x, b.y, b.r, g.mix, g.t); }
  };


  H.stir = {
    enter(g, s) { s.turn = 0; s.last = null; s.sp = null; s.sq = 0; },
    down(g, s, p) { s.on = true; s.last = null; s.sp = { x: p.x, y: p.y }; H.stir.move(g, s, p); },
    move(g, s, p) {
      if (!s.on) return; const b = g.bowlPos();
      s.sp = { x: clamp(p.x, b.x - b.r * .8, b.x + b.r * .8), y: clamp(p.y, b.y - b.r * .45, b.y + b.r * .5) };
      const dx = p.x - b.x, dy = (p.y - b.y) * 1.5, d = Math.hypot(dx, dy); if (d < b.r * .12 || d > b.r * 1.7) { s.last = null; return; }
      const a = Math.atan2(dy, dx); s.sa = a;
      if (s.last != null) { let da = a - s.last; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; H.stir.add(g, s, Math.abs(da) / TAU); }
      s.last = a;
    },
    add(g, s, turns) { s.turn += turns; g.mix.stirred = clamp(s.turn / 3, 0, 1); const q = Math.floor(s.turn * 4); if (q !== s.sq) { s.sq = q; sfx.squish(); } if (s.turn >= 3 && !s.fin) { g.mix.stirred = 1; g.finish(.5); } },
    up(g, s) { s.on = false; s.last = null; },
    update(g, s, dt) { if (!s.fin && g.idle > 9) { s.sa = (s.sa || 0) + dt * 5; s.sp = null; H.stir.add(g, s, dt * .3); } },
    draw(g, s, c) {
      g.sceneBoard(c); const b = g.bowlPos(); const a = s.sa || 0;
      drawBowl(c, b.x, b.y, b.r, g.mix, g.t, 0, a);
      if (s.turn < .25) { c.save(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.setLineDash([10, 12]); c.beginPath(); c.ellipse(b.x, b.y, b.r * .58, b.r * .38, 0, 0, TAU); c.stroke(); c.setLineDash([]); const ga = g.t * 2.4; circ(c, b.x + Math.cos(ga) * b.r * .58, b.y + Math.sin(ga) * b.r * .38, 9, '#ff6b81'); c.restore(); }
      c.strokeStyle = '#7ed957'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.ellipse(b.x, b.y, b.r * 1.15, b.r * .78, 0, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(s.turn / 3, 0, 1)); c.stroke();
      const sp = s.sp || { x: b.x + b.r * .45, y: b.y - b.r * .1 }; drawSpoon(c, sp.x, sp.y - g.U * .05, g.U * .5, Math.PI + .35);
    }
  };

  H.roll = {
    enter(g, s) { s.p = 0; s.rot = 0; s.q = 0; g.dough = { p: 0 }; s.pin = { x: g.bx, y: g.by - g.U * .22 }; },
    down(g, s, p) { s.on = true; s.lp = { x: p.x, y: p.y }; s.pin = { x: p.x, y: p.y }; },
    move(g, s, p) {
      if (!s.on) return; const d = Math.hypot(p.x - s.lp.x, p.y - s.lp.y); s.pin = { x: p.x, y: p.y }; s.lp = { x: p.x, y: p.y };
      if (Math.hypot(p.x - g.bx, (p.y - g.by) * 1.3) < g.U * .6) H.roll.add(g, s, d / (g.U * 3.4));
    },
    add(g, s, k) { s.p = clamp(s.p + k, 0, 1); s.rot += k * 40; g.dough.p = s.p; const q = Math.floor(s.p * 14); if (q !== s.q) { s.q = q; sfx.roll(); } if (s.p >= 1 && !s.fin) g.finish(.5); },
    up(g, s) { s.on = false; },
    update(g, s, dt) { if (!s.fin && g.idle > 9) { s.pin = { x: g.bx + Math.sin(g.t * 3) * g.U * .15, y: g.by + Math.sin(g.t * 6) * g.U * .12 }; H.roll.add(g, s, dt * .12); } },
    draw(g, s, c) {
      g.sceneBoard(c); drawSheet(g, c, s.p, g.R.id === 'sugar' ? DOUGH : DOUGH);
      const pin = s.pin; drawPin(c, pin.x, pin.y, g.U * .27, 0);
      if (s.p < .08) { c.save(); c.strokeStyle = 'rgba(255,107,129,.9)'; c.fillStyle = 'rgba(255,107,129,.9)'; c.lineWidth = 6; c.lineCap = 'round'; const y = Math.sin(g.t * 3) * g.U * .08; c.beginPath(); c.moveTo(g.bx + g.U * .36, g.by - g.U * .16 + y); c.lineTo(g.bx + g.U * .36, g.by + g.U * .16 + y); c.stroke(); tri(c, [[g.bx + g.U * .36, g.by + g.U * .22 + y], [g.bx + g.U * .31, g.by + g.U * .14 + y], [g.bx + g.U * .41, g.by + g.U * .14 + y]], '#ff6b81'); tri(c, [[g.bx + g.U * .36, g.by - g.U * .22 + y], [g.bx + g.U * .31, g.by - g.U * .14 + y], [g.bx + g.U * .41, g.by - g.U * .14 + y]], '#ff6b81'); c.restore(); }
    }
  };

  // Cutting: pick a cutter (touch it once), then touch the dough, or the sandwich, wherever you like. The cutter comes down, presses through,
  // lifts away, and the shape stays behind, as many times as there is room. Touch-and-drag shows where it will land.
  const LCOL = { pbutter: '#c98b4a', jelly: '#b8326a', cheese: '#ffd54a', ham: '#ff9db3', turkey: '#f0d6b0', lettuce: '#6fcf4a', tomato: '#e8433f', avocado: '#9ccc5a', cucumber: '#bfe8a0', butterpat: '#ffe27a', onion: '#e8d0f0', pickle: '#6fae3c', carrot: '#ff9d3d' };
  H.cut = {
    enter(g, s) {
      s.sandwich = s.spec.target === 'piece'; s.cuts = []; s.max = s.sandwich ? 4 : (s.spec.n || 6); s.minDone = s.sandwich ? 1 : 3; s.scrap = 0; s.ghost = null; s.nope = null;
      s.rc = g.U * (s.sandwich ? .1 : .09); s.cutter = g.cutters[0]; g.tool = s.cutter; s.base = s.sandwich ? g.piece : null;
      g.setTray(g.cutters.map(id => ({ id, kind: 'cutter' })));
    },
    want: (g, s) => s.cuts.length ? [] : [s.cutter],
    area(g, s) { return s.sandwich ? { sq: true, x: g.bx, y: g.by, h: g.U * .27 } : { x: g.bx, y: g.by, rx: g.U * .46, ry: g.U * .3 }; },
    // is a cut at (x, y) inside the dough (or the bread) and clear of the cuts already made? Nudges it inside if it was close.
    place(g, s, x, y) {
      const a = H.cut.area(g, s), rc = s.rc * .92;
      if (a.sq) { x = clamp(x, a.x - a.h + rc, a.x + a.h - rc); y = clamp(y, a.y - a.h + rc, a.y + a.h - rc); }
      else { const ex = a.rx - rc, ey = a.ry - rc, k = Math.hypot((x - a.x) / ex, (y - a.y) / ey); if (k > 1) { x = a.x + (x - a.x) / k; y = a.y + (y - a.y) / k; } }
      for (const c of s.cuts) if (Math.hypot(c.x - x, c.y - y) < rc * 1.85) return null;
      return { x, y };
    },
    near(g, s, x, y) { const a = H.cut.area(g, s), m = s.rc * 1.6; return a.sq ? Math.abs(x - a.x) < a.h + m && Math.abs(y - a.y) < a.h + m : Math.hypot((x - a.x) / (a.rx + m), (y - a.y) / (a.ry + m)) < 1; },
    try(g, s, x, y) {
      if (s.fin || s.cuts.length >= s.max || !s.cutter) return false;
      if (!H.cut.near(g, s, x, y)) return false;
      const at = H.cut.place(g, s, x, y);
      if (!at) { s.nope = { x, y, t: 0 }; sfx.oops(); return false; }
      s.cuts.push({ shape: s.cutter, x: at.x, y: at.y, t: 0, pressed: false });
      g.pieces = s.cuts.map(c => s.sandwich ? { type: 'stack', shape: c.shape, layers: s.base.layers.map(l => ({ ...l })) } : { type: 'cookie', shape: c.shape, baked: 0 });
      g.idle = 0; if (s.cuts.length >= s.minDone) { s.canDone = true; g.st.canDone = true; }
      if (s.cuts.length >= s.max) H.cut.pack(g, s);
      return true;
    },
    // all cut: the shapes go onto a baking tray that slides in, and the leftover dough is squished into a ball and put away in a tub
    check(g, s) { H.cut.pack(g, s); },
    pack(g, s) { if (s.sandwich) { g.finish(1.2); return; } if (s.packT != null) return; s.packT = 0; s.canDone = false; g.finish(3.1); sfx.whoosh(); },
    trayPos(g, s, i) { const n = s.cuts.length, P = [[-.3, -.15], [0, -.15], [.3, -.15], [-.3, .17], [0, .17], [.3, .17]], q = n <= 3 ? [[-.3, 0], [0, 0], [.3, 0]][i] : P[i]; return g.P(q[0], q[1] + .02); },
    // touching a cutter picks it (and says its name once); dragging one onto the dough cuts where it is let go
    drop(g, s, it, x, y, tap) {
      s.cutter = it.id; g.tool = it.id;
      if (tap) { sfx.snap(); return true; }
      return H.cut.try(g, s, x, y);
    },
    down(g, s, p) { if (s.fin || !s.cutter) return; s.ghost = { x: p.x, y: p.y }; },
    move(g, s, p) { if (s.ghost) s.ghost = { x: p.x, y: p.y }; },
    up(g, s, p) { const gh = s.ghost; s.ghost = null; if (gh) H.cut.try(g, s, p.x, p.y); },
    update(g, s, dt) {
      for (const c of s.cuts) {
        const t0 = c.t; c.t += dt;
        if (t0 < .17 && c.t >= .17) { sfx.cut(); g.fx.burst(c.x, c.y, 10, { colors: s.sandwich ? ['#fff3d6', '#f3d9a4'] : ['#fff', '#f6e8c8'], speed: 100, g: 220, life: .45, size: 4 }); }
        if (t0 < .34 && c.t >= .34) sfx.pat();
      }
      if (s.nope) { s.nope.t += dt; if (s.nope.t > .5) s.nope = null; }
      if (s.fin && s.packT == null) s.scrap = Math.min(1, s.scrap + dt * 2.2);
      if (s.packT != null) { const a = s.packT; s.packT += dt; const b = s.packT; for (const [at, f] of [[.9, () => sfx.whoosh()], [1.35, () => sfx.pat()], [1.7, () => sfx.snap()], [2.05, () => sfx.whoosh()]]) if (a < at && b >= at) f(); }
      if (!s.fin && s.cuts.length === 0 && g.idle > 14) { g.idle = 8; }
    },
    draw(g, s, c) {
      const rc = s.rc, U = g.U; g.sceneBoard(c);
      const a = H.cut.area(g, s), fade = 1 - ease(s.scrap);
      if (s.sandwich) {
        const pl = { x: g.bx, y: g.by + U * .03, r: Math.min(g.w * .46, U * .5) }; drawPlate(c, pl.x, pl.y, pl.r);
        c.save(); c.globalAlpha = fade;
        // the sandwich seen from above and a little in front: crust, bread, and the filling showing along the edge
        const hh = a.h, edge = U * .075, lay = (s.base.layers || []).filter(l => !['bread', 'toast'].includes(l.id));
        c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, a.x - hh + 4, a.y - hh + 8, hh * 2, hh * 2 + edge, hh * .2); c.fill();
        c.fillStyle = shade(CRUST, -.1); rr(c, a.x - hh, a.y + hh - hh * .2, hh * 2, edge + hh * .2, hh * .12); c.fill();
        const n = Math.max(1, lay.length); lay.forEach((l, k) => { c.fillStyle = LCOL[l.id] || '#f0c36a'; c.fillRect(a.x - hh * .94, a.y + hh + edge * (k / n) * .9 - edge * .5, hh * 1.88, edge * .9 / n + 1); });
        c.fillStyle = CRUST; rr(c, a.x - hh, a.y - hh, hh * 2, hh * 2, hh * .2); c.fill();
        c.fillStyle = BREAD; rr(c, a.x - hh * .88, a.y - hh * .88, hh * 1.76, hh * 1.76, hh * .14); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, a.x - hh * .78, a.y - hh * .8, hh * .9, hh * .18, hh * .08); c.fill();
        for (const [k, l] of lay.entries()) for (const [dx, dy, rx, ry] of [[-.85, .2 + k * .1, .14, .08], [.9, -.3 + k * .12, .12, .07], [-.3, .92, .16, .07]]) { c.fillStyle = LCOL[l.id] || '#f0c36a'; c.beginPath(); c.ellipse(a.x + dx * hh, a.y + dy * hh, hh * rx, hh * ry, 0, 0, TAU); c.fill(); }
        c.restore();
      } else if (s.packT == null) drawSheet(g, c, 1, DOUGH);
      else {
        const P = s.packT, U2 = g.U, ball = { x: g.bx - U2 * .3, y: g.by + U2 * .2 }, tub = { x: g.bx - U2 * .3, y: g.by + U2 * .26 };
        const tx = lerp(g.w + U2 * .6, g.bx, ease(clamp((P - .25) / .7, 0, 1))); pan(c, tx, g.by + U2 * .02, U2 * .92, U2 * .66);
        const e1 = ease(clamp(P / .7, 0, 1));
        if (P < .75) { c.save(); c.translate(lerp(0, ball.x - g.bx, e1), lerp(0, ball.y - g.by, e1)); c.translate(g.bx, g.by); c.scale(1 - e1 * .8, 1 - e1 * .8); c.translate(-g.bx, -g.by); c.globalAlpha = 1 - e1 * .2; drawSheet(g, c, 1, DOUGH); c.restore(); }
        // the tub: comes in, the ball drops in, the lid goes on, and it slides away to the fridge
        const bin = ease(clamp((P - .55) / .45, 0, 1)), bout = ease(clamp((P - 2.0) / .6, 0, 1)), bxx = lerp(-U2 * .4, tub.x, bin) - bout * (tub.x + U2 * .5);
        const drop = ease(clamp((P - 1.05) / .3, 0, 1)), lid = ease(clamp((P - 1.4) / .3, 0, 1));
        if (P >= .55) {
          const bw = U2 * .3, bh = U2 * .17;
          c.save(); c.translate(bxx, tub.y);
          c.fillStyle = 'rgba(80,40,20,.18)'; c.beginPath(); c.ellipse(4, bh * .55, bw * .55, bh * .18, 0, 0, TAU); c.fill();
          c.fillStyle = 'rgba(200,232,250,.9)'; rr(c, -bw / 2, -bh / 2, bw, bh, bh * .22); c.fill(); c.strokeStyle = '#8cc4e4'; c.lineWidth = 3; rr(c, -bw / 2, -bh / 2, bw, bh, bh * .22); c.stroke();
          if (P >= .75) { const by2 = lerp(ball.y - tub.y - U2 * .02, bh * .05, drop); c.save(); c.beginPath(); c.rect(-bw / 2, -U2, bw, U2 + bh * .45); c.clip(); c.translate(lerp(ball.x - tub.x, 0, drop) + (bxx - tub.x) * 0, by2); ING.dough(c, U2 * .2); c.restore(); }
          c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, -bw * .44, -bh * .38, bw * .3, bh * .12, bh * .06); c.fill();
          const ly = lerp(-bh * 1.4, -bh * .52, lid), la = lerp(-.5, 0, lid); c.save(); c.translate(0, ly); c.rotate(la * (P < 1.4 ? 1 : 1)); c.globalAlpha = P < 1.1 ? clamp((P - .55) / .3, 0, 1) : 1; box(c, -bw * .53, -bh * .12, bw * 1.06, bh * .24, '#ff8ab3', bh * .1); box(c, -bw * .18, -bh * .22, bw * .36, bh * .12, '#ff6b9d', bh * .05); c.restore();
          c.restore();
        } else if (P >= .7) { c.save(); c.translate(ball.x, ball.y); ING.dough(c, U2 * .2); c.restore(); }
      }
      // the cut-out shapes: a groove where the cutter pressed, then the shape popping up and settling
      const slots = s.sandwich && s.fin ? g.slots(s.cuts.length) : null;
      s.cuts.forEach((k, i) => {
        const u = k.t; let x = k.x, y = k.y, R = rc;
        if (s.packT != null) { const e = ease(clamp((s.packT - .95) / .65, 0, 1)), tp = H.cut.trayPos(g, s, i); x = lerp(k.x, tp.x, e); y = lerp(k.y, tp.y, e) - Math.sin(e * Math.PI) * g.U * .06; c.save(); c.translate(x, y); cookieShape(c, k.shape, R, DOUGH, { speckle: true }); c.restore(); return; }
        if (slots) { const e = ease(clamp(s.scrap * 1.3, 0, 1)); x = lerp(k.x, slots[i].x, e); y = lerp(k.y, slots[i].y, e); R = lerp(rc, slots[i].r * .9, e); }
        c.save(); c.translate(x, y);
        if (u >= .17) { c.fillStyle = s.sandwich ? 'rgba(120,80,40,.5)' : shade(DOUGH, -.4); shapeFill(c, k.shape, R, R * .08); }
        if (u >= .3) {
          const pop = Math.sin(clamp((u - .3) / .28, 0, 1) * Math.PI) * .09;
          c.translate(0, -pop * R * 1.6); c.scale(1 + pop, 1 + pop);
          if (s.sandwich) { c.fillStyle = 'rgba(80,40,20,.2)'; c.save(); c.translate(R * .05, R * .1); shapeFill(c, k.shape, R, 0); c.restore(); drawCharSandwich(c, { shape: k.shape }, R / .9); }
          else cookieShape(c, k.shape, R, DOUGH, { speckle: true });
        }
        c.restore();
      });
      // the cutter coming down, pressing and lifting away
      for (const k of s.cuts) {
        const u = k.t; if (u >= .6) continue; let sc, al, lift = 0, press = 0;
        if (u < .17) { const e = ease(u / .17); sc = lerp(1.65, 1, e); al = .3 + .7 * e; lift = (1 - e) * rc * .9; }
        else if (u < .34) { sc = .95; al = 1; press = 1; }
        else { const e = ease((u - .34) / .26); sc = lerp(1, 1.7, e); al = 1 - e; lift = e * rc * 1.1; }
        c.save(); c.translate(k.x, k.y);
        if (press) { c.globalAlpha = .5; c.fillStyle = s.sandwich ? '#f7e3b0' : shade(DOUGH, .15); shapeFill(c, k.shape, rc, rc * .2); }
        c.globalAlpha = .22 * al; c.fillStyle = '#5a3a20'; c.save(); c.translate(rc * .12 + lift * .35, rc * .16 + lift * .55); c.scale(sc, sc); shapeFill(c, k.shape, rc, rc * .06); c.restore();
        c.globalAlpha = al; c.translate(0, -lift); c.scale(sc, sc); cutterArt(c, k.shape, rc, g.t); c.restore();
      }
      // where the cutter will go while a finger is down
      if (s.ghost && !s.fin) {
        const at = H.cut.place(g, s, s.ghost.x, s.ghost.y), near = H.cut.near(g, s, s.ghost.x, s.ghost.y), ok = at && near;
        c.save(); c.translate(ok ? at.x : s.ghost.x, ok ? at.y : s.ghost.y); c.globalAlpha = .7; c.fillStyle = ok ? 'rgba(255,255,255,.35)' : 'rgba(255,90,100,.3)'; shapeFill(c, s.cutter, rc, rc * .06); c.globalAlpha = .9; cutterArt(c, s.cutter, rc, g.t); c.restore();
      }
      if (s.nope) { c.save(); c.translate(s.nope.x + Math.sin(s.nope.t * 50) * 6, s.nope.y); c.globalAlpha = 1 - s.nope.t * 2; c.strokeStyle = '#ff5a6a'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, rc * 1.05, 0, TAU); c.stroke(); c.restore(); }
      if (!s.fin && g.idle > 2.5 && s.cuts.length === 0) { c.save(); c.globalAlpha = .6 + Math.sin(g.t * 6) * .4; drawTapHint(c, g.bx, g.by, U * .1, g.t); c.restore(); }
      if (!s.fin) { c.save(); c.textAlign = 'center'; const left = s.max - s.cuts.length; for (let i = 0; i < s.max; i++) { const x = g.bx + (i - (s.max - 1) / 2) * U * .06, y = g.y0 + U * .03; c.fillStyle = i < s.cuts.length ? '#7ed957' : 'rgba(255,255,255,.8)'; c.strokeStyle = i < s.cuts.length ? '#3f9a5a' : '#e0c8b0'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, U * .018, 0, TAU); c.fill(); c.stroke(); } c.restore(); }
    }
  };

  // where things go when batter or dough is dropped (a tray, a muffin tin, a cake pan or a griddle)
  function fillSlots(g, lay) {
    const U = g.U;
    if (lay === 'sheet') return [[-.3, -.17], [0, -.17], [.3, -.17], [-.3, .2], [0, .2], [.3, .2]].map(([x, y]) => ({ ...g.P(x, y), r: U * .115 }));
    if (lay === 'cups') return [[-.33, -.1], [0, -.1], [.33, -.1], [-.33, .17], [0, .17], [.33, .17]].map(([x, y]) => ({ ...g.P(x, y), r: U * .12 }));
    if (lay === 'pan') return [{ ...g.P(0, 0), r: U * .4 }];
    return [[-.28, -.12], [.28, -.12], [0, .2]].map(([x, y]) => ({ ...g.P(x, y), r: U * .2 }));
  }
  function drawFillBase(g, c, lay, slots) {
    const U = g.U;
    if (lay === 'sheet') { pan(c, g.bx, g.by + U * .02, U * .92, U * .68); }
    else if (lay === 'cups') { pan(c, g.bx, g.by + U * .03, U * .98, U * .6); for (const sl of slots) { ell(c, sl.x, sl.y + sl.r * .25, sl.r * 1.0, sl.r * .62, '#7f8a9c'); } }
    else if (lay === 'pan') { circ(c, g.bx + 4, g.by + 8, U * .44, 'rgba(80,40,20,.2)'); circ(c, g.bx, g.by, U * .44, '#8b95a6'); circ(c, g.bx, g.by, U * .4, '#c4ccd9'); circ(c, g.bx, g.by, U * .37, '#aab4c4'); }
    else { ell(c, g.bx + 4, g.by + U * .04 + 8, U * .52, U * .4, 'rgba(80,40,20,.2)'); ell(c, g.bx, g.by + U * .04, U * .52, U * .4, '#2f2f38'); ell(c, g.bx, g.by + U * .02, U * .47, U * .35, '#45454f'); box(c, g.bx + U * .46, g.by - U * .02, U * .24, U * .07, '#6a4a30', U * .03); }
  }
  H.fill = {
    enter(g, s) {
      const sp = s.spec; s.slots = fillSlots(g, sp.lay); s.filled = s.slots.map(() => false); s.liners = ['#ff9ec8', '#7fd4f5', '#ffe066'];
      g.pieces = []; g.units = null; if (sp.lay === 'griddle') g.units = [];
      g.setTray([{ id: sp.what, kind: sp.what }]);
    },
    want: (g, s) => [s.spec.what],
    drop(g, s, it, x, y, tap) {
      let k = -1, best = 1e9; s.slots.forEach((sl, i) => { if (s.filled[i]) return; const d = tap ? i : Math.hypot(sl.x - x, sl.y - y) - sl.r; if (d < best) { best = d; k = i; } });
      if (k < 0 || (!tap && best > s.slots[k].r * 1.6)) return false;
      s.filled[k] = true; const sl = s.slots[k], sp = s.spec;
      g.fly((c, sz) => sp.what === 'dough' ? ING.dough(c, sz * 1.4) : drawBowl(c, 0, 0, sz * .9, { fill: .8, items: [], col: g.mix.final, final: g.mix.final, stirred: 1 }, 0), tap ? it.x : x, tap ? it.y : y, sl.x, sl.y - sl.r * .2, () => {
        sfx.pat(); g.fx.burst(sl.x, sl.y, 10, { colors: [g.mix.final, '#fff'], speed: 120, g: 300, life: .5, size: 5 });
        const piece = sp.lay === 'sheet' ? { type: 'cookie', shape: 'round', baked: 0, chips: g.R.id === 'chip', x: sl.x, y: sl.y } : sp.lay === 'cups' ? { type: 'cupcake', batter: true, baked: 0, liner: s.liners[k % 3], x: sl.x, y: sl.y } : sp.lay === 'pan' ? { type: 'cake', baked: 0, x: sl.x, y: sl.y, batter: true } : null;
        if (piece) g.pieces[k] = piece; else g.units[k] = { id: g.R.steps.find(q => q.k === 'grill').id, x: sl.x, y: sl.y, r: sl.r, state: 'raw', t: 0, cook: 0 };
        s.done = (s.done || 0) + 1; if (s.done >= s.slots.length) { g.pieces = g.pieces.filter(Boolean); g.units = g.units && g.units.filter(Boolean); g.finish(.9); }
      }, g.U * .1);
      return true;
    },
    draw(g, s, c) {
      g.sceneBoard(c); drawFillBase(g, c, s.spec.lay, s.slots);
      s.slots.forEach((sl, i) => {
        if (s.spec.lay === 'cups' && !s.filled[i]) { c.save(); c.translate(sl.x, sl.y); drawCupcakeAt(c, { empty: true, liner: s.liners[i % 3] }, sl.r); c.restore(); }
        if (!s.filled[i]) { if (s.spec.lay === 'cups') return; c.save(); c.globalAlpha = .5 + Math.sin(g.t * 4 + i) * .2; c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([8, 8]); c.beginPath(); c.ellipse(sl.x, sl.y, sl.r * (s.spec.lay === 'pan' ? .9 : 1), sl.r * (s.spec.lay === 'pan' ? .9 : .8), 0, 0, TAU); c.stroke(); c.restore(); return; }
      });
      const pcs = g.pieces; s.slots.forEach((sl, i) => {
        if (!s.filled[i]) return;
        c.save(); c.translate(sl.x, sl.y);
        if (s.spec.lay === 'cups') { drawCupcakeAt(c, { type: 'cupcake', batter: true, liner: s.liners[i % 3] }, sl.r * 1.0); }
        else if (s.spec.lay === 'pan') { ell(c, 0, 0, sl.r * .88, sl.r * .88, shade(g.mix.final, -.1)); ell(c, 0, -sl.r * .03, sl.r * .8, sl.r * .8, g.mix.final); shine(c, -sl.r * .3, -sl.r * .3, sl.r * .22, sl.r * .1, -.5, .45); }
        else if (s.spec.lay === 'griddle') { ell(c, 0, 0, sl.r * .9, sl.r * .72, '#f6e6b8'); ell(c, 0, -sl.r * .04, sl.r * .84, sl.r * .66, '#fff1c4'); }
        else drawCookie(c, { type: 'cookie', shape: 'round', baked: 0, chips: g.R.id === 'chip' }, sl.r * 1.0);
        c.restore();
      });
    }
  };
  // a cupcake with batter in it, sized by r (its liner width is about 2r)

  H.bake = {
    // turn the oven on first (it lights up), then slide the tray in, wait for the bell, and take it out
    enter(g, s) { s.state = 'cold'; s.t = 0; s.bt = 0; },
    geom(g) { const n = g.pieces.length, S = Math.min(g.U * .78, g.SH * .62), o = { x: g.bx, y: g.y0 + g.SH * .36, s: S }, p = { x: g.bx, y: g.y1 - g.U * (n > 3 ? .2 : .16), w: Math.min(g.U * .95, g.w * .9), h: g.U * (n > 3 ? .36 : .26) }; return { o, p }; },
    down(g, s, p) {
      const { o, p: pn } = H.bake.geom(g); const hitO = Math.abs(p.x - o.x) < o.s * .6 && Math.abs(p.y - o.y) < o.s * .6, hitP = Math.abs(p.x - pn.x) < pn.w * .55 && Math.abs(p.y - pn.y) < pn.h * 1.2;
      if (s.state === 'cold' && (hitO || hitP)) { s.state = 'warm'; s.t = 0; sfx.snap(); sfx.chime(); }
      else if (s.state === 'idle' && (hitO || hitP)) { s.state = 'in'; s.t = 0; sfx.whoosh(); }
      else if (s.state === 'ding' && (hitO || hitP)) { s.state = 'out'; s.t = 0; sfx.whoosh(); }
    },
    update(g, s, dt) {
      s.t += dt; const { o } = H.bake.geom(g);
      if (s.state === 'warm' && s.t > 1.1) { s.state = 'idle'; s.t = 0; voice.say('cook-bake'); }
      else if (s.state === 'in' && s.t > .9) { s.state = 'bake'; s.t = 0; sfx.sizzle(); }
      else if (s.state === 'bake') { s.bt = Math.min(1, s.t / 3.6); for (const p of g.pieces) p.baked = s.bt; if (Math.floor(g.t * 6) % 2 === 0 && Math.random() < .3) g.fx.burst(o.x, o.y - o.s * .5, 1, { colors: ['rgba(255,255,255,.8)'], speed: 20, g: -50, life: 1, size: 8, up: 40 }); if (s.t >= 3.6) { s.state = 'ding'; s.t = 0; sfx.ding(2); g.fx.burst(o.x, o.y, 22, { colors: ['#ffd54a', '#fff'], speed: 260, g: 200, life: .8, size: 6, shape: 'star' }); setTimeout(() => { if (g.st === s && s.state === 'ding') voice.say('cook-ding'); }, 1500); } }
      else if (s.state === 'out' && s.t > .9) { s.state = 'done'; for (const p of g.pieces) p.baked = 1; g.finish(.4); }
    },
    want: () => [], hintTarget: true,
    draw(g, s, c) {
      const { o, p } = H.bake.geom(g), n = g.pieces.length, rows = n > 3 ? 2 : 1, perRow = Math.ceil(n / rows), r = Math.min(g.U * (n > 3 ? .1 : n > 1 ? .12 : .2), p.w / (perRow * 2.3));
      // the pieces sit on the tray in one or two rows
      const pcs = (cc, sc) => g.pieces.forEach((pc, i) => { const row = Math.floor(i / perRow), inRow = row === rows - 1 ? n - perRow * (rows - 1) : perRow, col = i % perRow; cc.save(); cc.translate((col - (inRow - 1) / 2) * r * 2.4 * sc, (row - (rows - 1) / 2) * r * 2.1 * sc); drawPieceC(cc, pc, r * sc); cc.restore(); });
      const glow = s.state === 'cold' ? 0 : s.state === 'warm' ? clamp(s.t / 1.1, 0, 1) * .6 : s.state === 'idle' ? .6 : s.state === 'bake' ? Math.min(1, .6 + s.t * 2) : s.state === 'ding' ? 1 : s.state === 'in' ? clamp(.6 + s.t * .4, 0, 1) : s.state === 'out' ? clamp(1 - s.t * 1.2, 0, 1) : 0;
      const inside = s.state === 'bake' || s.state === 'ding' || (s.state === 'in' && s.t >= .9);
      drawOven(c, o.x, o.y, o.s, glow, 0, g.t, null, s.state !== 'cold');
      if (inside) { c.save(); c.beginPath(); rr(c, o.x - o.s * .34, o.y - o.s * .24, o.s * .68, o.s * .52, o.s * .05); c.clip(); c.translate(o.x, o.y + o.s * .1); pan(c, 0, 0, o.s * .56, o.s * (rows === 2 ? .24 : .17)); c.translate(0, -o.s * .06); const sr = o.s * (rows === 2 ? .052 : .075), pper = Math.ceil(n / rows); g.pieces.forEach((pc, i) => { const row = Math.floor(i / pper), inRow = row === rows - 1 ? n - pper * (rows - 1) : pper, col = i % pper; c.save(); c.translate((col - (inRow - 1) / 2) * sr * 2.3, (row - (rows - 1) / 2) * sr * 2); drawPieceC(c, pc, sr); c.restore(); }); c.restore(); }
      else {
        let u = s.state === 'in' ? ease(clamp(s.t / .9, 0, 1)) : s.state === 'out' ? 1 - ease(clamp(s.t / .9, 0, 1)) : 0; if (s.state === 'done') u = 0;
        const x = lerp(p.x, o.x, u), y = lerp(p.y, o.y + o.s * .1, u), k = lerp(1, .52, u);
        c.save(); c.translate(x, y); c.scale(k, k);
        if (s.state === 'idle') { c.shadowColor = '#fff'; c.shadowBlur = 14 + Math.sin(g.t * 5) * 8; }
        pan(c, 0, 0, p.w, p.h); c.shadowBlur = 0; c.translate(0, -p.h * .05); pcs(c, 1); c.restore();
      }
      if (s.state === 'bake') { c.strokeStyle = '#ffd54a'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.arc(o.x, o.y - o.s * .5 - 24, 24, -Math.PI / 2, -Math.PI / 2 + TAU * s.bt); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(o.x, o.y - o.s * .5 - 24, 24, 0, TAU); c.stroke(); }
      if (s.state === 'cold' || s.state === 'idle' || s.state === 'ding') { const pk = Math.sin(g.t * 6) * .5 + .5; c.save(); c.globalAlpha = .6 + pk * .4; const onOven = s.state !== 'idle'; drawTapHint(c, onOven ? o.x : p.x, onOven ? o.y + o.s * .1 : p.y - p.h * .3, g.U * .1, g.t); c.restore(); }
      if (s.state === 'ding') { c.save(); const k = 1 + Math.sin(g.t * 20) * .06; c.translate(o.x + o.s * .42, o.y - o.s * .5); c.rotate(Math.sin(g.t * 24) * .12); c.scale(k, k); ING.bell(c, g.U * .1); c.restore(); }
    }
  };

  H.grill = {
    enter(g, s) {
      const sp = s.spec, U = g.U; s.dev = sp.device; s.placed = 0; s.n = sp.existing ? (g.units || []).length : (sp.n || 1);
      if (sp.free) { s.units = []; s.n = sp.max || 3; s.closed = false; s.slots = [0, -1, 1].map(d => ({ x: g.bx + d * U * .28, y: g.by, r: U * .11 })); g.setTray(sp.ids.map(id => ({ id, kind: 'ing' }))); }
      else if (sp.existing) { s.units = g.units; for (const u of s.units) { u.state = 'cook1'; u.t = 0; } }
      else { s.units = []; s.slots = sp.device === 'toaster' ? [-1, 1].map(d => ({ x: g.bx + d * U * .13, y: g.by - U * .02, r: U * .1 })) : (s.n === 1 ? [{ x: g.bx, y: g.by, r: U * .17 }] : [{ x: g.bx - U * .2, y: g.by, r: U * .17 }, { x: g.bx + U * .2, y: g.by, r: U * .17 }]); g.setTray([{ id: sp.id, kind: 'ing' }]); }
    },
    want: (g, s) => s.spec.free ? (!s.closed && s.placed === 0 ? s.spec.ids : []) : s.placed < s.n && !s.spec.existing ? [s.spec.id] : [],
    // the green check while grilling patties: that is enough patties
    check(g, s) { s.closed = true; s.canDone = false; for (const it of g.tray) it.used = true; sfx.chime(); },
    drop(g, s, it, x, y, tap) {
      if (s.placed >= s.n || s.closed) return false; const d = { x: g.bx, y: g.by, r: g.U * .4 }; const id = s.spec.free ? it.id : s.spec.id;
      if (!tap && Math.hypot(x - d.x, (y - d.y) * 1.3) > d.r * 1.35) return false;
      const k = s.placed++; const sl = s.slots[k];
      if (s.spec.free) { s.canDone = s.placed < s.n; if (s.placed >= s.n) { s.closed = true; for (const t of g.tray) t.used = true; } } else if (s.placed >= s.n) it.used = true;
      g.ingFly(id, tap ? it.x : x, tap ? it.y : y, sl.x, sl.y, () => { s.units.push({ id, x: sl.x, y: sl.y, r: sl.r, state: 'cook1', t: 0, cook: 0 }); sfx.sizzle(); });
      return true;
    },
    down(g, s, p) {
      for (const u of s.units) if (u.state === 'flip' && Math.hypot(p.x - u.x, p.y - u.y) < u.r * 1.8) { u.state = 'flipping'; u.t = 0; sfx.whoosh(); return; }
      if (s.dev === 'toaster') for (const u of s.units) if (u.state === 'pop' && Math.hypot(p.x - u.x, (p.y - u.y + g.U * .1)) < u.r * 2.4) { u.state = 'taken'; u.t = 0; sfx.pop(); g.fx.burst(u.x, u.y - g.U * .1, 10, { colors: ['#d9a05a', '#fff3d6'], speed: 150, g: 300, life: .5, size: 5 }); }
    },
    update(g, s, dt) {
      const tm = s.dev === 'toaster' ? 3 : 2.8;
      for (const u of s.units) {
        u.t += dt;
        if (u.state === 'cook1') { u.cook = Math.min(.5, u.t / tm * .5); if (Math.random() < dt * 5) g.fx.burst(u.x, u.y - u.r * .5, 1, { colors: ['rgba(255,255,255,.75)'], speed: 18, g: -45, life: 1, size: 8, up: 30 }); if (u.t >= tm) { u.t = 0; if (s.dev === 'toaster') { u.state = 'pop'; u.cook = 1; sfx.ding(); } else { u.state = 'flip'; sfx.plink(2); g.say('cook-flip', 10); } } }
        else if (u.state === 'flipping') { if (u.t > .45) { u.state = 'cook2'; u.t = 0; sfx.sizzle(); } }
        else if (u.state === 'cook2') { u.cook = .5 + Math.min(.5, u.t / 2.4 * .5); if (Math.random() < dt * 5) g.fx.burst(u.x, u.y - u.r * .5, 1, { colors: ['rgba(255,255,255,.75)'], speed: 18, g: -45, life: 1, size: 8, up: 30 }); if (u.t >= 2.4) { u.state = 'done'; u.cook = 1; sfx.ding(); g.fx.burst(u.x, u.y, 16, { colors: ['#ffd54a', '#fff'], speed: 200, g: 200, life: .6, size: 5, shape: 'star' }); } }
        else if (u.state === 'taken' && u.t > .3) u.state = 'gone';
      }
      const want = s.spec.free ? (s.closed ? s.placed : -1) : s.n;
      if (!s.fin && s.units.length && s.units.length === want && s.units.every(u => u.state === 'done' || u.state === 'gone')) { if (s.spec.toBun) g.pendingPatties = s.units.map(u => u.id); g.finish(.9); }
      if (s.spec.free && !s.closed && s.placed && s.units.length === s.placed && s.units.every(u => u.state === 'done') && g.idle > 10) H.grill.check(g, s);
      if (!s.fin && g.idle > 12) for (const u of s.units) if (u.state === 'flip') { u.state = 'flipping'; u.t = 0; }
      if (!s.fin && g.idle > 12 && s.dev === 'toaster') for (const u of s.units) if (u.state === 'pop') { u.state = 'taken'; u.t = 0; }
    },
    draw(g, s, c) {
      const U = g.U;
      if (s.dev === 'toaster') {
        const S = U * .55, ss = S * .62, cooking = s.units.some(u => u.state === 'cook1');
        for (const u of s.units) {
          if (u.state === 'gone') continue;
          const out = u.state === 'pop' ? 1 : u.state === 'taken' ? 1 + u.t / .3 * .8 : 0, y = g.by - S * .2 + ss * .22 - out * ss * .5;
          c.save(); c.translate(u.x, y); c.globalAlpha = u.state === 'taken' ? Math.max(0, 1 - u.t / .3) : 1; ING.bread(c, ss); c.fillStyle = `rgba(150,80,20,${(u.cook || 0) * .45})`; rr(c, -ss * .33, -ss * .29, ss * .66, ss * .64, ss * .09); c.fill(); c.restore();
        }
        drawToaster(c, g.bx, g.by, S, 0, cooking ? 1 : 0, []);
        for (const u of s.units) if (u.state === 'pop') drawTapHint(c, u.x, g.by - S * .2 - ss * .55, U * .08, g.t);
        if (s.placed < s.n) s.slots.forEach((sl, i) => { if (i < s.placed) return; c.save(); c.globalAlpha = .6 + Math.sin(g.t * 4) * .3; drawTapHint(c, sl.x, g.by - S * .3, U * .08, g.t); c.restore(); });
        return;
      }
      if (s.dev === 'pan') { drawFillBase(g, c, 'griddle', []); } else drawGrill(c, g.bx, g.by, U * .4, s.units.some(u => u.state !== 'raw' && u.state !== 'done') ? 1 : .2);
      if (s.dev === 'grill' && s.placed < s.n && !s.closed) s.slots.forEach((sl, i) => { if (i < s.placed || (s.spec.free && i > s.placed)) return; c.save(); c.globalAlpha = .55 + Math.sin(g.t * 4) * .2; c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([8, 8]); c.beginPath(); c.ellipse(sl.x, sl.y, sl.r * 1.2, sl.r * .9, 0, 0, TAU); c.stroke(); c.restore(); });
      for (const u of s.units) {
        c.save(); c.translate(u.x, u.y); const flip = u.state === 'flipping' ? u.t / .45 : 0, sx = flip ? Math.abs(Math.cos(flip * Math.PI)) : 1, lift = flip ? Math.sin(flip * Math.PI) * u.r * 1.2 : 0; c.translate(0, -lift); c.scale(1, sx * .95 + .05);
        drawUnit(c, u, u.r * 2.6);
        c.restore();
        if (u.state === 'cook1' || u.state === 'cook2') { const k = u.state === 'cook1' ? u.t / 2.8 : u.t / 2.4; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 5; c.beginPath(); c.arc(u.x, u.y - u.r * 1.6, 13, 0, TAU); c.stroke(); c.strokeStyle = '#ffd54a'; c.lineWidth = 5; c.beginPath(); c.arc(u.x, u.y - u.r * 1.6, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k, 0, 1)); c.stroke(); }
        if (u.state === 'flip') { drawTapHint(c, u.x, u.y - u.r * 1.6, g.U * .09, g.t); c.save(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(u.x, u.y, u.r * 1.5, 0, TAU); c.globalAlpha = .6 + Math.sin(g.t * 8) * .3; c.stroke(); c.restore(); }
      }
    }
  };

  H.stack = {
    enter(g, s) {
      const sp = s.spec, ptype = g.R.ptype; s.i = 0;
      g.piece = { type: ptype === 'stack' || ptype === 'hotdog' || ptype === 'sundae' ? ptype : 'stack', layers: [], scoops: [], sauce: [], dots: [] }; g.pieces = [g.piece];
      const uniq = [...new Set(sp.order)]; const tray = uniq.map(id => ({ id, kind: 'ing' }));
      for (let i = tray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tray[i], tray[j]] = [tray[j], tray[i]]; }
      g.setTray(tray);
    },
    want: (g, s) => [s.spec.order[s.i]],
    drop(g, s, it, x, y, tap) {
      if (s.i >= s.spec.order.length) return false;
      if (it.id !== s.spec.order[s.i]) return 'wrong';
      if (!tap && (y > g.y1 + 4 || Math.abs(x - g.bx) > g.U * .7)) return false;
      s.i++; const last = s.i >= s.spec.order.length, id = it.id, p = g.piece;
      const base = H.stack.base(g); const topY = base.y - H.stack.height(g) - g.R1 * .3;
      g.ingFly(id, tap ? it.x : x, tap ? it.y : y, base.x, topY, () => {
        if (id.startsWith('sc-')) p.scoops.push({ id: id.slice(3), drop: 1 }); else p.layers.push({ id: layerOf(id), drop: 1, seed: p.layers.length * 7 });
        sfx.pat(); g.hear(id); g.fx.burst(base.x, base.y - H.stack.height(g), 8, { colors: ['#fff', '#ffe27a'], speed: 110, g: 300, life: .4, size: 4 });
      });
      if (last) g.finish(1.1);
      return true;
    },
    base(g) { return g.foodBase(); },
    height(g) { return pieceHeight(g.piece, g.R1) - g.R1 * .12; },
    update(g, s, dt) { for (const l of g.piece.layers) if (l.drop > 0) l.drop = Math.max(0, l.drop - dt * 4.5); for (const l of g.piece.scoops) if (l.drop > 0) l.drop = Math.max(0, l.drop - dt * 4.5); },
    draw(g, s, c) { g.sceneBoard(c); g.drawPlateAndPiece(c, g.piece, true); }
  };

  // Pick one of a few big pictures (which bun, which bread). The bottom half lands on the plate, ready to build on.
  const BASES = { 'bun-plain': ['bunB-plain', 'bunT-plain'], 'bun-sesame': ['bunB', 'bunT'], 'bun-wheat': ['bunB-wheat', 'bunT-wheat'], 'bread-white': ['bread', 'breadT'], 'bread-wheat': ['bread-wheat', 'breadT-wheat'], 'bread-rye': ['bread-rye', 'breadT-rye'] };
  H.pick = {
    enter(g, s) { s.sel = -1; s.t = 0; g.setTray([]); },
    cards(g, s) {
      const n = s.spec.opts.length, gap = g.U * .05, cw = Math.min((g.w * .9 - gap * (n - 1)) / n, g.SH * .62, 260), ch = cw * 1.12;
      return s.spec.opts.map((id, i) => ({ id, x: g.bx + (i - (n - 1) / 2) * (cw + gap), y: g.by, w: cw, h: ch }));
    },
    want: () => [],
    down(g, s, p) {
      if (s.sel >= 0) return;
      H.pick.cards(g, s).forEach((cd, i) => {
        if (s.sel >= 0 || Math.abs(p.x - cd.x) > cd.w / 2 || Math.abs(p.y - cd.y) > cd.h / 2) return;
        s.sel = i; s.t = 0; const [bot, top] = BASES[cd.id]; g.opt[s.spec.key] = cd.id; g.opt.top = top;
        g.piece = { type: g.R.ptype, layers: [{ id: bot, drop: 1, seed: 0 }], scoops: [], tops: [], paint: [] }; g.pieces = [g.piece];
        sfx.pop(); g.hear(cd.id); g.fx.burst(cd.x, cd.y, 16, { colors: ['#ffd54a', '#fff'], speed: 200, g: 200, life: .7, size: 6, shape: 'star' }); g.finish(1.1);
      });
    },
    update(g, s, dt) { s.t += dt; },
    draw(g, s, c) {
      g.sceneBoard(c);
      H.pick.cards(g, s).forEach((cd, i) => {
        const sel = i === s.sel, other = s.sel >= 0 && !sel, k = sel ? 1 + Math.min(1, s.t * 4) * .08 : other ? 1 - Math.min(1, s.t * 3) * .12 : 1 + Math.sin(g.t * 2.4 + i) * .015;
        c.save(); c.translate(cd.x, cd.y); c.scale(k, k); c.globalAlpha = other ? Math.max(.35, 1 - s.t * 2) : 1;
        c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, -cd.w / 2 + 3, -cd.h / 2 + 8, cd.w, cd.h, cd.w * .14); c.fill();
        c.fillStyle = '#fff'; rr(c, -cd.w / 2, -cd.h / 2, cd.w, cd.h, cd.w * .14); c.fill();
        c.strokeStyle = sel ? '#4fcf6a' : CAT_COL[g.R.cat].main; c.lineWidth = sel ? 7 : 4; rr(c, -cd.w / 2, -cd.h / 2, cd.w, cd.h, cd.w * .14); c.stroke();
        c.fillStyle = CAT_COL[g.R.cat].light; c.beginPath(); c.ellipse(0, -cd.h * .06, cd.w * .4, cd.w * .3, 0, 0, TAU); c.fill();
        c.save(); c.translate(0, -cd.h * .07); (ING[cd.id] || ING.bread)(c, cd.w * .78); c.restore();
        fitLabel(c, (NAME[cd.id] || '').replace(/^An? (.)/, (_, x) => x.toUpperCase()), 0, cd.h * .36, cd.w * .86, cd.w * .12, { stroke: CAT_COL[g.R.cat].dark });
        c.restore();
      });
    }
  };

  // Build it your way: touch (or drag) anything on the tray and it goes on top. A green check moves on; on the last shelf the top bun
  // (or bread) is the end. Sundae scoops work the same way.
  const layerFor = id => SAUCE_L[id] ? 'sauce-' + id : layerOf(id);
  H.build = {
    enter(g, s) {
      const sp = s.spec;
      if (!g.piece) { g.piece = { type: g.R.ptype, layers: [], scoops: [], tops: [], paint: [] }; g.pieces = [g.piece]; }
      if (g.pendingPatties) { g.pendingPatties.forEach((id, i) => g.piece.layers.push({ id, drop: 1.2 + i * .55, seed: g.piece.layers.length * 7, pend: true })); g.pendingPatties = null; }
      s.items = sp.items.map(id => id === 'TOP' ? g.opt.top : id); s.end = sp.end === 'TOP' ? g.opt.top : sp.end || null;
      s.n = 0; s.max = sp.scoop && SPG.level.tier('cook') === 1 ? 2 : sp.max;
      s.canDone = !s.end && !sp.min;
      g.setTray(s.items.map(id => ({ id, kind: 'ing' })));
    },
    want: (g, s) => s.end && (s.n >= s.max || g.idle > 7) ? [s.end] : [],
    drop(g, s, it, x, y, tap) {
      if (s.fin) return false; const sp = s.spec, end = it.id === s.end;
      if (!end && s.n >= s.max) return 'full';
      if (!tap && (y > g.y1 + 4 || Math.abs(x - g.bx) > g.U * .7)) return false;
      if (!end) { s.n++; (s.usedItems || (s.usedItems = new Set())).add(it.id); }
      const B = g.foodBase(), topY = B.y - pieceHeight(g.piece, g.R1) - g.R1 * .1, p = g.piece, id = it.id;
      g.ingFly(id, tap ? it.x : x, tap ? it.y : y, B.x, topY, () => {
        if (sp.scoop) p.scoops.push({ id: id.slice(3), drop: 1 }); else p.layers.push({ id: layerFor(id), drop: 1, seed: p.layers.length * 7 });
        sfx.pat(); g.fx.burst(B.x, topY + g.R1 * .2, 8, { colors: ['#fff', '#ffe27a'], speed: 110, g: 300, life: .4, size: 4 });
      });
      if (end || (sp.scoop && s.n >= s.max)) { s.canDone = false; g.finish(1.2); }
      else s.canDone = !s.end && s.n >= (sp.min || 0);
      return true;
    },
    update(g, s, dt) { for (const l of g.piece.layers) if (l.pend && l.drop > 0 && l.drop <= dt * 4.5) { l.pend = false; sfx.pat(); g.fx.burst(g.bx, g.foodBase().y - pieceHeight(g.piece, g.R1), 8, { colors: ['#fff', '#ffe27a'], speed: 110, g: 300, life: .4, size: 4 }); } H.stack.update(g, s, dt); },
    draw(g, s, c) { g.sceneBoard(c); g.drawPlateAndPiece(c, g.piece); }
  };

  function drawPlatePaint(g, c) { if (!g.paint || !g.paint.plate.length) return; const pl = g.plate(); c.save(); c.translate(pl.x, pl.y); drawPaintList(c, g.paint.plate, g.U); c.restore(); }
  // where food can be touched, in the food's own units (origin as drawn by drawPiece)
  const pieceBox = p => { const t = p.type; if (p.shape && t === 'stack') return { r: 1.0 }; if (t === 'cookie') return { r: 1.1 }; if (t === 'cupcake') return { hw: .62, y0: -.75, y1: .6 }; if (t === 'cake') return { hw: 1.0, y0: -.45, y1: 1.0 }; if (t === 'pizza') return { ex: 1.25, ey: .85 }; if (t === 'hotdog') return { hw: 1.12, y0: -.6, y1: .08 }; if (t === 'sundae') return { hw: .8, y0: -(pieceHeight(p, 1) + .08), y1: .08 }; return { hw: 1.05, y0: -(pieceHeight(p, 1) + .08), y1: .1 }; };
  const inBox = (b, x, y) => b.r ? Math.hypot(x, y) <= b.r : b.ex ? (x / b.ex) ** 2 + (y / b.ey) ** 2 <= 1 : Math.abs(x) <= b.hw && y >= b.y0 && y <= b.y1;
  // pizza: how much of the dough is covered (sauce, cheese), on a grid of little cells in the pizza's own units
  const PZ = (() => { const out = []; for (let x = -1.05; x <= 1.05; x += .15) for (let y = -.66; y <= .66; y += .15) if ((x / 1.07) ** 2 + (y / .69) ** 2 <= 1) out.push([x, y]); return out; })();

  // free decorating: icing, sprinkles, toppings, sauces and seasoning
  H.decorate = {
    enter(g, s) {
      const sp = s.spec; s.need = sp.mode === 'frost' ? g.pieces.length : (sp.need || 3); s.acts = 0; s.canDone = false; s.stroke = null; s.sauce = null; s.cells = new Set();
      if (g.R.ptype === 'pizza' && !g.pieces.length) { g.piece = { type: 'pizza', baked: 0, paint: [], tops: [] }; g.pieces = [g.piece]; }
      g.setTray(sp.tools.map(id => ({ id, kind: 'tool' }))); g.tool = sp.tools[0];
      if (sp.mode === 'frost') for (const p of g.pieces) { delete p.frost; }
    },
    want: () => [],
    // what is under a finger: a piece of food (with the point in its own units), or the plate
    target(g, p) {
      const sl = g.slots();
      for (let i = g.pieces.length - 1; i >= 0; i--) { const q = sl[i], pc = g.pieces[i]; if (!q || pc.gone) continue; const ox = q.x, oy = q.y + pieceBase(pc, q.r), lx = (p.x - ox) / q.r, ly = (p.y - oy) / q.r; if (inBox(pieceBox(pc), lx, ly)) return { piece: pc, slot: q, i, k: q.r, lx, ly }; }
      const pl = g.plate();
      if (g.onPlate(p)) return { plate: true, k: g.U, lx: (p.x - pl.x) / g.U, ly: (p.y - pl.y) / g.U };
      return null;
    },
    hit(g, p) { const t = H.decorate.target(g, p); return t && t.piece ? t : null; },
    down(g, s, p) {
      const tool = g.tool; if (!tool || s.fin) return;
      const t = H.decorate.target(g, p); s.sp0 = { x: p.x, y: p.y }; s.dragged = false; s.cur = null; s.stroke = null; s.sauce = null;
      if (SEASONS.includes(tool)) { if (t) H.decorate.grains(g, s, t, p, tool); return; }
      if (tool === 'mozzarella') { if (t && t.piece) { s.shred = { x: p.x, y: p.y }; H.decorate.cheese(g, s, t); } return; }
      if (DOTS.includes(tool)) {
        const h = t && t.piece ? t : null; if (!h) return;
        H.decorate.sprinkle(g, s, h, tool); s.dotDrag = tool === 'sprinkles' || tool === 'candy' ? { x: p.x, y: p.y } : null;
        sfx.plink(Math.floor(Math.random() * 5)); g.fx.burst(p.x, p.y, 6, { colors: [tool === 'sprinkles' ? SPRINKLE[0] : '#fff', '#ffd54a'], speed: 90, g: 300, life: .4, size: 4, shape: 'star' }); H.decorate.act(g, s); return;
      }
      if (tool === 'bucket') { const pc = t && t.piece; if (!pc) return; const col = icingOf(g, tool); if (pc.type === 'cookie') (pc.deco = pc.deco || {}).fill = col; else if (pc.type === 'cupcake' || pc.type === 'cake') pc.frost = { col, t: 0 }; else return; sfx.squirt(); g.fx.burst(p.x, p.y, 14, { colors: [col, '#fff'], speed: 130, g: 300, life: .5, size: 5 }); H.decorate.act(g, s); if (s.spec.mode === 'frost' && g.pieces.every(q => q.frost)) g.finish(.9); return; }
      const pc = t && t.piece, icing = pc && ['cookie', 'cupcake', 'cake'].includes(pc.type) && icingOf(g, tool);
      if (icing) { s.cur = { piece: pc, slot: t.slot }; s.stroke = { pts: [] }; H.decorate.move(g, s, p); return; }
      if (t && t.plate && tool === 'icing') {   // the icing pen also writes on the plate
        s.penPlate = { col: icingOf(g, tool), kind: 'pen', pts: [], z: g.zn() }; g.paint.plate.push(s.penPlate); s.snd = sfx.squeeze(); sfx.squirt(); H.decorate.penMove(g, s, p, true); return;
      }
      if (SAUCES.includes(tool) && t) {   // a squeeze bottle: paint it anywhere on the food or the plate
        s.sauce = { col: SAUCE[tool] || '#b8651a', st: null, key: null, last: { x: p.x, y: p.y, t: performance.now() }, moved: performance.now(), n: 0 };
        s.snd = sfx.squeeze(); sfx.squirt(); H.decorate.addSauce(g, s, p, t, 1);
      }
    },
    penMove(g, s, p, first) {
      const P = s.penPlate; if (!P) return; const pl = g.plate(), k = g.U * PEN_R, x = (p.x - pl.x) / k, y = (p.y - pl.y) / k;
      if (!g.onPlate(p)) return;   // stay on the plate
      const lp = P.pts[P.pts.length - 1]; if (first || !lp || Math.hypot(lp[0] - x, lp[1] - y) > .06) { P.pts.push([x, y]); if (s.snd) s.snd.set(.6); }
    },
    addSauce(g, s, p, t, first) {
      const S = s.sauce; if (!t) { S.st = null; S.key = null; return; }
      const key = t.plate ? 'plate' : 'p' + t.i;
      const pz = g.tool === 'pizzasauce'; if (pz && (t.plate || t.piece.type !== 'pizza')) { S.st = null; S.key = null; return; }
      if (!S.st || S.key !== key) { S.st = { col: S.col, kind: 'sauce', pts: [], z: g.zn() }; if (pz) S.st.pizza = true; S.key = key; if (t.plate) g.paint.plate.push(S.st); else (t.piece.paint = t.piece.paint || []).push(S.st); S.k = t.k; }
      const now = performance.now(), d = Math.hypot(p.x - S.last.x, p.y - S.last.y), v = d / Math.max(.016, (now - S.last.t) / 1000), U = g.U;
      const w = g.tool === 'pizzasauce' ? U * .085 : clamp(U * .03 * (1.5 - v / (U * 2.2)), U * .016, U * .046);
      const q = { x: t.lx, y: t.ly, w: w / t.k }, pts = S.st.pts, lp = pts[pts.length - 1];
      if (first || !lp || Math.hypot(lp.x - q.x, lp.y - q.y) * t.k > U * .01) { pts.push(q); S.n++; S.moved = now; }
      if (S.st.pizza) H.decorate.cover(g, s, q.x, q.y, w / t.k * .62);
      S.last = { x: p.x, y: p.y, t: now }; if (s.snd) s.snd.set(clamp(v / (U * 1.2), .15, 1));
    },
    // a few sprinkles (or one topping) right where the finger is
    sprinkle(g, s, h, tool) { const n = tool === 'sprinkles' ? 5 : 1; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = n > 1 ? Math.random() * .16 : 0; H.decorate.dot(g, h.piece, tool, h.lx + Math.cos(a) * d, h.ly + Math.sin(a) * d * .7, i); } },
    // pizza cheese: a handful of shreds where she touches
    cheese(g, s, t) { const p = t.piece; p.tops = p.tops || []; let added = 0; for (let i = 0; i < 9; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * .24, x = t.lx + Math.cos(a) * d, y = t.ly + Math.sin(a) * d * .7; if ((x / 1.07) ** 2 + (y / .69) ** 2 > 1) continue; p.tops.splice(p.tops.filter(q => q.id === 'shred').length, 0, { id: 'shred', x, y, rot: Math.random() * 3, col: Math.random() < .25 ? '#ffe9a8' : '#fff8e0' }); added++; } if (added) { sfx.shake(); H.decorate.cover(g, s, t.lx, t.ly, .26); } },
    cover(g, s, x, y, r) { if (s.spec.mode !== 'cover') return; for (let i = 0; i < PZ.length; i++) if (Math.hypot(PZ[i][0] - x, (PZ[i][1] - y) * 1.3) <= r) s.cells.add(i); const k = s.cells.size / PZ.length; if (!s.canDone && k >= s.spec.need) { s.canDone = true; s.acts = Math.max(s.acts, 1); sfx.plink(3); } if (!s.fin && k >= Math.min(.93, s.spec.need + .38)) g.finish(1); },
    move(g, s, p) {
      if (s.shred) { if (Math.hypot(p.x - s.shred.x, p.y - s.shred.y) > g.U * .045) { const t = H.decorate.target(g, p); s.shred = { x: p.x, y: p.y }; if (t && t.piece) H.decorate.cheese(g, s, t); } return; }
      if (s.dotDrag) { if (Math.hypot(p.x - s.dotDrag.x, p.y - s.dotDrag.y) > g.U * .05) { const t = H.decorate.target(g, p); s.dotDrag = { x: p.x, y: p.y }; if (t && t.piece) { H.decorate.sprinkle(g, s, t, g.tool); sfx.plink(Math.floor(Math.random() * 5)); } } return; }
      if (s.penPlate) { H.decorate.penMove(g, s, p); return; }
      if (s.sauce) { H.decorate.addSauce(g, s, p, H.decorate.target(g, p), 0); return; }
      if (!s.cur || !s.stroke) return; const h = s.cur, pc = h.piece, tool = g.tool;
      if (Math.hypot(p.x - s.sp0.x, p.y - s.sp0.y) > 10) s.dragged = true; if (!s.dragged && s.stroke.pts.length) return;
      if (!s.stroke.pts.length && !s.stroke.target) {
        if ((pc.type === 'cupcake' || pc.type === 'cake') && !pc.frost && icingOf(g, tool)) { pc.frost = { col: icingOf(g, tool), t: 0 }; sfx.squirt(); g.fx.burst(h.slot.x, h.slot.y, 14, { colors: [icingOf(g, tool), '#fff'], speed: 130, g: 300, life: .5, size: 5 }); H.decorate.act(g, s); s.cur = null; s.stroke = null; if (s.spec.mode === 'frost' && g.pieces.every(q => q.frost)) g.finish(.9); return; }
      }
      const ck = pc.type === 'cookie', lx = clamp((p.x - h.slot.x) / h.slot.r, ck ? -1.2 : -.8, ck ? 1.2 : .8), ly = clamp((p.y - h.slot.y) / h.slot.r, ck ? -1.2 : -.7, ck ? 1.2 : .7);
      if (!s.stroke.target) { const st = { col: icingOf(g, tool) || '#fff', pts: [], z: g.zn() }; s.stroke.target = st; pc.deco = pc.deco || {}; (pc.deco.strokes = pc.deco.strokes || []).push(st); if (!s.snd) s.snd = sfx.squeeze(); }
      const last = s.stroke.pts[s.stroke.pts.length - 1]; if (!last || Math.hypot(last[0] - lx, last[1] - ly) > .05) { s.stroke.pts.push([lx, ly]); s.stroke.target.pts = s.stroke.pts.slice(); if (s.snd) s.snd.set(.6); }
    },
    up(g, s, p) {
      if (s.snd) { s.snd.off(); s.snd = null; }
      if (s.shred) { s.shred = null; H.decorate.act(g, s); return; } s.dotDrag = null;
      if (s.penPlate) { const P = s.penPlate; s.penPlate = null; if (P.pts.length === 1) P.pts.push([P.pts[0][0] + .02, P.pts[0][1]]); if (P.pts.length) H.decorate.act(g, s); return; }
      if (s.sauce) { const n = s.sauce.n; s.sauce = null; if (n) H.decorate.act(g, s); return; }
      const st = s.stroke, h = s.cur; s.stroke = null; s.cur = null; if (!st || !h || s.fin) return;
      const pc = h.piece, tool = g.tool;
      if (!s.dragged || !st.target || st.pts.length < 2) {
        // a plain tap with icing: fill the whole shape (cookies) or frost it
        if (st.target) { const arr = pc.deco && pc.deco.strokes; if (arr) arr.splice(arr.indexOf(st.target), 1); }
        if (pc.type === 'cookie' && icingOf(g, tool)) { const lx = (s.sp0.x - h.slot.x) / h.slot.r, ly = (s.sp0.y - h.slot.y) / h.slot.r; pc.deco = pc.deco || {}; (pc.deco.strokes = pc.deco.strokes || []).push({ col: icingOf(g, tool), pts: [[lx - .02, ly], [lx + .02, ly]], z: g.zn() }); sfx.squirt(); g.fx.burst(h.slot.x, h.slot.y, 14, { colors: [icingOf(g, tool), '#fff'], speed: 130, g: 300, life: .5, size: 5 }); H.decorate.act(g, s); }
        else if ((pc.type === 'cupcake' || pc.type === 'cake') && icingOf(g, tool) && !pc.frost) { pc.frost = { col: icingOf(g, tool), t: 0 }; sfx.squirt(); H.decorate.act(g, s); if (s.spec.mode === 'frost' && g.pieces.every(q => q.frost)) g.finish(.9); }
        return;
      }
      H.decorate.act(g, s);
    },
    // salt and pepper: shaken over whatever she touches; the grains fall and stay where they land
    grains(g, s, t, p, tool) {
      const col = SEASON[tool], U = g.U, list = t.plate ? g.paint.plate : (t.piece.paint = t.piece.paint || []);
      const st = { col, kind: 'grain', pts: [], z: g.zn() }; list.push(st);   // each shake is its own layer, so later things land on top of it
      for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * U * .075; st.pts.push({ x: t.lx + Math.cos(a) * d / t.k, y: t.ly + Math.sin(a) * d / t.k * .7, w: (U * .004 + Math.random() * U * .003) / t.k }); }
      sfx.shake(); g.fx.burst(p.x, p.y - U * .1, 18, { colors: [col === '#ffffff' ? '#e8f0ff' : '#555', col], speed: 25, g: 900, life: .32, size: 2.6, shape: 'circle' });
      H.decorate.act(g, s);
    },
    // the green check appears once there is enough on it (it never says "all done": she decides that by touching the check)
    act(g, s) { s.acts++; (s.usedTools || (s.usedTools = new Set())).add(g.tool); const first = !s.canDone; if (s.spec.mode === 'cover') return; if (s.spec.mode !== 'frost') { s.canDone = s.acts >= s.need; if (s.canDone && first) sfx.plink(4); } else if (g.pieces.every(q => q.frost)) g.finish(.9); },
    dot(g, pc, id, lx, ly, i) {   // (g.zn() numbers every thing she adds so later ones are drawn over earlier ones)
      if (id === 'fruit') id = g.kinds.fruit; const kind = ['sprinkles', 'candy', 'candle'].includes(id) ? g.kinds[id] : undefined;
      const col = (id === 'sprinkles' && (kind === 'rainbow' || kind === 'dots')) || id === 'candy' ? SPRINKLE[Math.floor(Math.random() * 5)] : undefined, rot = ['sprinkles', 'star', 'pepperoni', 'olive', 'greenpepper', 'pineapple', 'basil', 'mushroom'].includes(id) ? Math.random() * 3 - 1.5 : (Math.random() - .5) * .3;
      (pc.tops = pc.tops || []).push({ id, kind, x: lx, y: ly, col, rot, z: g.zn() });   // exactly where she touched
    },
    update(g, s, dt) {
      for (const p of g.pieces) if (p.frost && p.frost.t < 1) p.frost.t = Math.min(1, p.frost.t + dt * 3);
      const S = s.sauce; if (S && S.st && performance.now() - S.moved > 90 && S.st.pts.length) { const q = S.st.pts[S.st.pts.length - 1], cap = g.U * .075 / S.k; q.w = Math.min(cap, q.w + dt * g.U * .05 / S.k); if (s.snd) s.snd.set(.25); }   // hold still and the blob grows
    },
    draw(g, s, c) {
      g.sceneBoard(c);
      g.drawPlates(c);
      const sl = g.slots(); g.pieces.forEach((p, i) => { const q = sl[i]; if (g.pieces.length > 1 || p.shape || !['stack', 'hotdog', 'sundae'].includes(p.type)) drawShadowDisc(c, q.x, q.y + q.r * .5, q.r * .9); drawPieceAt(c, p, q.x, q.y, q.r); });
      if (s.spec.mode === 'cover' && !s.fin) { const q = sl[0], k = s.cells.size / PZ.length; c.save(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 5; c.setLineDash([12, 12]); c.lineDashOffset = -g.t * 24; c.beginPath(); c.ellipse(q.x, q.y, q.r * 1.07, q.r * .69, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.strokeStyle = '#7ed957'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.ellipse(q.x, q.y + q.r * .05, q.r * 1.42, q.r * .98, 0, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k / Math.min(.93, s.spec.need + .38), 0, 1)); c.stroke(); c.restore(); }
      if (g.tool && s.canDone === false && s.acts === 0 && g.idle > 2.5) { const q = sl[0]; drawTapHint(c, q.x, q.y - (FLAT.includes(g.pieces[0].type) ? pieceHeight(g.pieces[0], q.r) * .5 : q.r * .3), g.U * .1, g.t); }
    }
  };

  H.slice = {
    enter(g, s) { s.p = 0; s.kn = null; g.piece = g.piece || g.pieces[0]; s.t0 = 0; },
    geom(g) { const R = g.R1, h = pieceHeight(g.piece, R), B = g.foodBase(); return { x: g.bx, top: B.y - h - R * .15, bot: B.y + R * .08, h }; },
    down(g, s, p) { s.on = true; H.slice.move(g, s, p); },
    move(g, s, p) { if (!s.on || s.fin) return; const q = H.slice.geom(g); s.kn = { x: p.x, y: p.y }; if (Math.abs(p.x - q.x) < g.R1 * 1.2) { const k = clamp((p.y - q.top) / (q.bot - q.top), 0, 1); if (k > s.p) { s.p = k; if (Math.floor(k * 8) !== s.sq) { s.sq = Math.floor(k * 8); sfx.rustle(); } } if (s.p >= .92) H.slice.cut(g, s); } },
    up(g, s) { s.on = false; },
    cut(g, s) { if (s.fin) return; s.p = 1; g.piece.sliced = 1; g.piece.slideT = 0; sfx.snap(); sfx.pop(); g.finish(1.2); g.fx.burst(g.bx, g.by, 14, { colors: ['#ffd54a', '#fff'], speed: 160, g: 300, life: .6, size: 5, shape: 'star' }); },
    update(g, s, dt) { if (g.piece.sliced) g.piece.slideT = Math.min(1, (g.piece.slideT || 0) + dt * 3); if (!s.fin && g.idle > 10) { s.p = Math.min(1, s.p + dt * .35); s.kn = { x: g.bx, y: lerp(H.slice.geom(g).top, H.slice.geom(g).bot, s.p) }; if (s.p >= .92) H.slice.cut(g, s); } },
    draw(g, s, c) {
      g.sceneBoard(c); g.drawPlateAndPiece(c, g.piece, true); const q = H.slice.geom(g);
      if (!g.piece.sliced) { c.save(); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 5; c.setLineDash([10, 10]); c.lineDashOffset = -g.t * 30; c.beginPath(); c.moveTo(q.x, q.top - 6); c.lineTo(q.x, q.bot + 6); c.stroke(); c.restore(); if (s.p < .05) { const k = (Math.sin(g.t * 2.2) * .5 + .5); drawKnife(c, q.x, lerp(q.top, q.bot, k), g.U * .3); } }
      if (s.kn && !g.piece.sliced) drawKnife(c, s.kn.x, s.kn.y, g.U * .3);
    }
  };

  // Eating: every touch takes one small bite exactly where she touched, with tooth marks and crumbs on the plate. Where the food is
  // was measured from its own picture, so every last bit can be eaten; a food is finished when nothing is left, about nine bites each.
  const CRUMB = { cookie: ['#d9a05a', '#e8c88a'], cupcake: ['#e8b868', '#fff3d6'], cake: ['#e8b868', '#fff3d6'], stack: ['#e8a85c', '#f7ddb0'], hotdog: ['#e8a85c', '#c0583a'], sundae: ['#fff1c4', '#ff9ec8'], pizza: ['#e6c48a', '#d8342c'] };
  function eatPoints(g, p) {
    const R = 50, S = 260, cv = document.createElement('canvas'); cv.width = cv.height = S; const o = cv.getContext('2d');
    o.translate(S / 2, S / 2 + pieceBase(p, R)); drawPiece(o, p, R);
    const d = o.getImageData(0, 0, S, S).data, out = [], step = 7;
    for (let y = step / 2; y < S; y += step) for (let x = step / 2; x < S; x += step) if (d[(Math.floor(y) * S + Math.floor(x)) * 4 + 3] > 140) out.push([(x - S / 2) / R, (y - S / 2) / R]);
    return out;
  }
  function drawEatenAt(g, c, p, x, y, R) {
    if (!p.bites || !p.bites.length) { drawPieceAt(c, p, x, y, R); return; }
    const dpr = g.dpr || 1, S = Math.ceil(R * 5 * dpr), oc = g.oc; if (oc.width !== S) { oc.width = S; oc.height = S; }
    const o = oc.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, S, S); o.setTransform(dpr, 0, 0, dpr, S / 2, S / 2);
    o.save(); o.translate(0, pieceBase(p, R)); drawPiece(o, p, R); o.restore();
    o.globalCompositeOperation = 'destination-out'; o.fillStyle = '#000';
    for (const b of p.bites) { o.beginPath(); o.arc(b.x * R, b.y * R, b.r * R, 0, TAU); o.fill(); for (let k = -2; k <= 2; k++) { const a = b.a + k * .42; o.beginPath(); o.arc((b.x + Math.cos(a) * b.r) * R, (b.y + Math.sin(a) * b.r) * R, b.r * R * .26, 0, TAU); o.fill(); } }
    o.globalCompositeOperation = 'source-over';
    c.drawImage(oc, x - S / 2 / dpr, y - S / 2 / dpr, S / dpr, S / dpr);
  }
  H.serve = {
    enter(g, s) {
      g.crumbs = []; s.n = 0; g.setTray([]);
      for (const p of g.pieces) { p.bites = []; p.gone = false; p.left = eatPoints(g, p); p.full = Math.max(1, p.left.length); const area = p.full * (7 / 50) ** 2; p.br = clamp(Math.sqrt(area / (9 * Math.PI * .8)), .16, .5); }
      g.fx.burst(g.bx, g.by, 30, { colors: ['#ffd54a', '#fff', '#ff9ec8'], speed: 300, g: 200, life: 1, size: 7, shape: 'star' }); sfx.chime();
    },
    down(g, s, p) {
      if (s.fin || g.finishedAll) return; const sl = g.slots(); let best = null;
      g.pieces.forEach((pc, i) => {
        if (pc.gone) return; const q = sl[i], lx = (p.x - q.x) / q.r, ly = (p.y - q.y) / q.r; let near = null, nd = 1e9;
        for (const pt of pc.left) { const d = Math.hypot(pt[0] - lx, pt[1] - ly); if (d < nd) { nd = d; near = pt; } }
        if (near && nd < pc.br * 1.6 && (!best || nd < best.d)) best = { pc, q, lx, ly, near, d: nd };
      });
      if (!best) return;
      const { pc, q } = best, r = pc.br * (.9 + Math.random() * .15), cx = best.d < r * .6 ? best.lx : best.near[0], cy = best.d < r * .6 ? best.ly : best.near[1];
      pc.bites.push({ x: cx, y: cy, r, a: Math.atan2(-cy, -cx) });
      pc.left = pc.left.filter(pt => Math.hypot(pt[0] - cx, pt[1] - cy) > r * 1.02);
      const sx = q.x + cx * q.r, sy = q.y + cy * q.r, cols = CRUMB[pc.type] || CRUMB.stack, pl = g.plate();
      sfx.crunch(); g.fx.burst(sx, sy, 12, { colors: cols, speed: 140, g: 500, life: .55, size: 4 }); g.bounce = 1; s.n++;
      for (let i = 0; i < 3; i++) g.crumbs.push({ x: (sx - pl.x) / g.U + (Math.random() - .5) * .12, y: (Math.min(sy + q.r * .4, pl.y + pl.r * .4) - pl.y) / g.U + Math.random() * .05, r: .005 + Math.random() * .006, col: cols[i % cols.length] });
      if (pc.left.length <= pc.full * .1) { pc.gone = true; g.fx.burst(q.x, q.y, 20, { colors: ['#ffd54a', '#ff9ec8', '#fff'], speed: 240, g: 300, life: .8, size: 6, shape: 'star' }); sfx.pop(); }
      if (s.n % 3 === 1) voice.say('cook-yum');
      if (g.pieces.every(x => x.gone)) { g.recipeDone(); s.fin = true; s.finT = 99; }
    },
    update(g, s, dt) { g.bounce = Math.max(0, (g.bounce || 0) - dt * 4); },
    draw(g, s, c) {
      g.sceneBoard(c, true);
      const sl = g.slots(), pl = g.plate(); g.drawPlates(c);
      for (const k of g.crumbs || []) { c.fillStyle = k.col; c.beginPath(); c.ellipse(pl.x + k.x * g.U, pl.y + k.y * g.U, k.r * g.U, k.r * g.U * .7, k.x * 9, 0, TAU); c.fill(); }
      g.pieces.forEach((p, i) => { if (p.gone) return; const q = sl[i], bob = (g.finishedAll ? 0 : Math.sin(g.t * 3 + i) * 2) + (g.bounce || 0) * -4; drawEatenAt(g, c, p, q.x, q.y + bob, q.r); });
      if (!s.n && !g.finishedAll) { const q = sl[0]; drawTapHint(c, q.x, q.y - q.r * .4, g.U * .1, g.t); }
    }
  };


  /* ---------------------------------------------------------------- loop, menu and drawing */
    Object.assign(CookGame.prototype, {
    start() { this.resize(); this.enterMenu(); this.resize(); this.resume(); },
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); },
    pause() { this.running = false; cancelAnimationFrame(this.raf); if (this.st && this.st.snd) { this.st.snd.off(); this.st.snd = null; } if (this.drag) { this.drag.it.drag = false; this.drag.it.back = true; this.drag = null; } this.ptr = null; this.free = false; },
    destroy() { this.freeGallery(); this.pause(); this.canvas.remove(); this.counter.el.remove(); if (SPG.cookGame === this) SPG.cookGame = null; },
    // ---- little motions for adding ingredients: pour the flour, crack the egg, plop the butter
    addMotion(id, x0, y0, b, cb, unit) {
      const s = this.U * .24, kind = unit ? (unit === 'egg' ? 'egg' : unit === 'stick' ? 'drop' : 'pour') : ['flour', 'sugar', 'milk', 'chips'].includes(id) ? 'pour' : id === 'egg' ? 'egg' : (id === 'butter' || id === 'butterpat') ? 'drop' : 'plain';
      const m = { t: 0, id, kind, unit, x0, y0, b, s, cb, fired: false, dur: kind === 'pour' ? 1.55 : kind === 'egg' ? 1.2 : kind === 'drop' ? .9 : .5, cbAt: kind === 'pour' ? 1.1 : kind === 'egg' ? .88 : kind === 'drop' ? .6 : .4, snd: 0, hx: kind === 'pour' ? b.x + s * .5 : b.x, hy: b.y - b.r * 1.0 - s * .15 };
      this.motions.push(m);
    },
    updateMotions(dt) {
      for (const m of this.motions) {
        const t0 = m.t; m.t += dt; const t = m.t, b = m.b, cross = x => t0 < x && t >= x;
        if (m.kind === 'pour') {
          if (cross(.45)) { sfx.shake(); if (m.id === 'milk') sfx.water(); }
          if (t > .55 && t < 1.15) {
            const mouth = this.pourMouth(m); const col = { flour: ['#fffaf0', '#f2e8d8'], sugar: ['#fff', '#ffe6f3', '#e8f4ff'], milk: ['#fff', '#eaf6ff'], chips: ['#5a3a2a', '#7a4a32'] }[m.id];
            if (Math.random() < dt * 40) this.fx.burst(mouth.x, mouth.y, 1, { colors: col, speed: 25, g: 700, life: .45, size: m.id === 'chips' ? 5 : 4, shape: 'circle' });
            if (Math.random() < dt * 14) this.fx.burst(b.x + (Math.random() - .5) * b.r * .4, b.y - b.r * .08, 1, { colors: col, speed: 70, g: 400, life: .35, size: 3, up: 60 });
            if (m.id === 'chips' && Math.floor(t * 12) !== m.snd) { m.snd = Math.floor(t * 12); sfx.tap(); }
          }
        } else if (m.kind === 'egg') {
          if (cross(.38) || cross(.46)) sfx.tap();
          if (cross(.55)) { sfx.crack(); this.fx.burst(m.hx, m.hy, 6, { colors: ['#fff6e6', '#f2e2c4'], speed: 120, g: 500, life: .5, size: 4 }); }
        } else if (m.kind === 'drop') { if (cross(.58)) sfx.pat(); }
        if (!m.fired && t >= m.cbAt) { m.fired = true; if (m.kind === 'egg' || m.kind === 'drop') this.fx.burst(b.x, b.y - b.r * .05, 10, { colors: m.kind === 'egg' ? ['#ffc83a', '#fff', '#ffe27a'] : ['#ffe27a', '#fff3b0'], speed: 140, g: 380, life: .5, size: 5, up: 80 }); m.cb && m.cb(); }
      }
      this.motions = this.motions.filter(m => m.t < m.dur);
    },
    pourState(m) {
      const t = m.t, s = m.s, a = ease(clamp(t / .35, 0, 1)), out = ease(clamp((t - 1.15) / .35, 0, 1));
      let x = lerp(m.x0, m.hx, a), y = lerp(m.y0, m.hy, a); if (t > 1.15) { x = lerp(m.hx, m.hx + s * .3, out); y = lerp(m.hy, m.hy - s * .5, out); }
      return { x, y, tilt: -ease(clamp((t - .3) / .3, 0, 1)) * 1.9 * (1 - out), alpha: 1 - out };
    },
    pourMouth(m) { const st = this.pourState(m), r = m.s * .45; return { x: st.x + Math.sin(st.tilt) * r, y: st.y - Math.cos(st.tilt) * r }; },
    drawMotion(c, m) {
      const t = m.t, s = m.s, b = m.b, id = m.id; c.save();
      if (m.kind === 'pour') {
        const st = this.pourState(m), mouth = this.pourMouth(m);
        if (t > .55 && t < 1.15) {
          const col = { flour: '#fffaf0', sugar: '#ffffff', milk: '#f4faff', chips: '#6a4430' }[id], endY = b.y - b.r * .05, k = ease(clamp((t - .55) / .12, 0, 1)) * (1 - ease(clamp((t - 1.05) / .1, 0, 1)));
          c.globalAlpha = .85 * k; c.strokeStyle = col; c.lineCap = 'round';
          if (id === 'milk') { c.lineWidth = s * .1; c.beginPath(); c.moveTo(mouth.x, mouth.y); c.quadraticCurveTo(mouth.x - s * .02, (mouth.y + endY) / 2, b.x - s * .04, endY); c.stroke(); c.strokeStyle = '#dfeffb'; c.lineWidth = s * .03; c.stroke(); }
          else { c.lineWidth = s * (id === 'chips' ? .1 : .07); c.setLineDash([s * .035, s * .09]); c.lineDashOffset = -t * s * 3; c.beginPath(); c.moveTo(mouth.x, mouth.y); c.lineTo(mouth.x + (b.x - mouth.x) * .5, endY); c.stroke(); c.setLineDash([]); }
          c.globalAlpha = 1;
        }
        c.globalAlpha = st.alpha; c.translate(st.x, st.y); c.rotate(st.tilt);
        if (m.unit && m.unit !== 'egg' && m.unit !== 'stick' && SPG.cookArt.drawMeasure) SPG.cookArt.drawMeasure(c, m.unit, s * .8, 1 - clamp((t - .55) / .55, 0, 1), MCOL[id] || '#fff', 0); else (ING[id] || ING.flour)(c, s);
      } else if (m.kind === 'egg') {
        const a = ease(clamp(t / .35, 0, 1)), x = lerp(m.x0, m.hx, a), y = lerp(m.y0, m.hy, a);
        if (t < .55) { c.translate(x, y); c.rotate(t > .3 ? Math.sin(t * 60) * .12 : 0); ING.egg(c, s); if (t > .46) { c.strokeStyle = 'rgba(120,90,50,.7)'; c.lineWidth = s * .03; c.beginPath(); c.moveTo(-s * .36, 0); c.lineTo(-s * .16, -s * .05); c.lineTo(0, s * .04); c.lineTo(s * .18, -s * .04); c.lineTo(s * .36, s * .01); c.stroke(); } }
        else {
          const u = clamp((t - .55) / .45, 0, 1), fade = 1 - clamp((t - .95) / .25, 0, 1);
          for (const sg of [-1, 1]) { c.save(); c.globalAlpha = fade; c.translate(x + sg * u * s * .55, y + u * u * s * .9); c.rotate(sg * (.3 + u * 1.2)); c.beginPath(); c.rect(-s, sg < 0 ? -s : 0, s * 2, s); c.clip(); ING.egg(c, s); c.restore(); }
          const g = u * u, yy = lerp(y, b.y - b.r * .1, clamp((t - .55) / .33, 0, 1) ** 2);
          if (t < .9) { c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.ellipse(x, yy, s * .24, s * .3, 0, 0, TAU); c.fill(); c.fillStyle = '#ffc83a'; c.beginPath(); c.arc(x, yy, s * .14, 0, TAU); c.fill(); shine(c, x - s * .04, yy - s * .05, s * .035, s * .02, -.6, .6); }
        }
      } else if (m.kind === 'drop') {
        const a = ease(clamp(t / .35, 0, 1)), x = lerp(m.x0, m.hx, a), y0 = lerp(m.y0, m.hy, a), f = clamp((t - .4) / .22, 0, 1), y = lerp(y0, b.y - b.r * .05, f * f), sq = f >= 1 ? 1 - clamp((t - .62) / .2, 0, 1) : 1;
        c.globalAlpha = 1 - clamp((t - .66) / .22, 0, 1); c.translate(x, y); c.rotate((1 - a) * .3); c.scale(1, 1 - (f >= 1 ? .25 * (1 - sq) : 0)); (ING[id] || ING.butter)(c, s);
      } else { const a = ease(clamp(t / .4, 0, 1)), x = lerp(m.x0, b.x, a), y = lerp(m.y0, b.y - b.r * .15, a) - Math.sin(a * Math.PI) * this.U * .1; c.translate(x, y); c.globalAlpha = 1 - clamp((t - .4) / .1, 0, 1); (ING[id] || ING.flour)(c, s * 1.1); }
      c.restore();
    },
    // ---- the recipe's intro card: a big picture of the dish and its name, then a calm fade into the first step
    drawIntro(c) {
      const w = this.w, h = this.h, R = this.R, K = CAT_COL[R.cat], t = this.intro ? this.intro.t : 1, e = ease(clamp(t / .6, 0, 1));
      const top = this.narrow ? 112 : Math.max(24, this.uiR + 24), rb = clamp(h * .1, 48, 84), avail = h - top - rb - 40;
      const bw = Math.min(w * .86, avail * 1.25), bh = avail, cx = w / 2, cy = top + avail / 2;
      c.save(); c.translate(cx, cy); c.scale(.85 + .15 * e, .85 + .15 * e); c.globalAlpha = e;
      c.fillStyle = 'rgba(70,30,20,.22)'; rr(c, -bw / 2 + 4, -bh / 2 + 10, bw, bh, bw * .08); c.fill();
      gingham(c, -bw / 2, -bh / 2, bw, bh, bw * .08, K.main, Math.max(12, bw * .05)); c.strokeStyle = '#fff'; c.lineWidth = 8; rr(c, -bw / 2, -bh / 2, bw, bh, bw * .08); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.ellipse(0, bh * .1, bw * .4, bh * .3, 0, 0, TAU); c.fill(); c.strokeStyle = K.light; c.lineWidth = 6; c.stroke();
      drawSample(c, R.sample, 0, -bh * .02, bw * .74, bh * .78);
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + t * .7, k = .5 + .5 * Math.sin(t * 3 + i * 2); c.globalAlpha = e * (.4 + .6 * k); art.star(c, Math.cos(a) * bw * .44, Math.sin(a) * bh * .4, Math.min(bw, bh) * (.025 + .015 * k), '#ffd54a', t + i); }
      c.restore();
      const rw = Math.min(w * .84, 600), ry = top + avail + 20 + rb / 2;
      c.save(); c.globalAlpha = e; ribbon(c, w / 2, ry, rw, rb, K.main, K.dark); fitLabel(c, R.name, w / 2, ry - rb * .02, rw * .86, rb * .56, { stroke: K.dark }); c.restore();
    },
    // ---- a calm change of screen: everything fades to a soft pink, a big green tick pops in the middle, then the next step fades in
    drawTrans(c) {
      const T = this.trans; if (!T) return; const w = this.w, h = this.h, u = T.t, a = u < .38 ? ease(u / .38) : u > .62 ? 1 - ease((u - .62) / .38) : 1;
      c.save(); c.globalAlpha = a; const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * .7); g.addColorStop(0, '#fff7fb'); g.addColorStop(1, '#ffd6e6'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (!T.intro) {
        const k = clamp((u - .15) / .3, 0, 1), pop = ease(k) * (1 + Math.sin(k * Math.PI) * .22), r = Math.min(w, h) * .13 * pop;
        if (r > 1) { const cx = w / 2, cy = h / 2; c.fillStyle = 'rgba(60,140,70,.2)'; c.beginPath(); c.arc(cx + 4, cy + 8, r, 0, TAU); c.fill(); c.fillStyle = '#4fcf6a'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = r * .12; c.stroke(); c.lineWidth = r * .22; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(cx - r * .42, cy); c.lineTo(cx - r * .1, cy + r * .32); c.lineTo(cx + r * .44, cy - r * .3); c.stroke();
          for (let i = 0; i < 8; i++) art.star(c, cx + Math.cos(i / 8 * TAU + u * 1.5) * r * 1.6, cy + Math.sin(i / 8 * TAU + u * 1.5) * r * 1.6, r * .15, '#ffd54a', u * 2 + i); }
      }
      c.restore();
    },

    // ---- photos: the camera button on the left (a little bigger than the home button) and her own album of food photos
    camBtn() {
      // The camera only comes out for the finishing touches: the last decorating step before serving, and then the plate itself (even when empty).
      if (this.screen !== 'cook' || this.trans || !this.st) return null;
      const steps = this.R.steps, nxt = steps[this.stIdx + 1];
      if (!(this.st.k === 'serve' || (this.st.k === 'decorate' && nxt && nxt.k === 'serve'))) return null;
      const r = this.uiR * .6; return { x: r + 16, y: clamp((this.y0 + this.y1) / 2, this.y0 + r + 8, this.y1 - r * 2.4), r };
    },
    albumBtn() { const r = this.uiR * .6; return { x: 14 + this.uiR + 18 + r, y: 14 + this.uiR / 2, r }; },
    drawCamGlyph(c, x, y, r, t) {
      c.save(); c.translate(x, y); const s = r * 1.15;
      box(c, -s * .55, -s * .3, s * 1.1, s * .72, '#5a3f5e', s * .14); box(c, -s * .22, -s * .44, s * .44, s * .2, '#5a3f5e', s * .06);
      circ(c, 0, s * .06, s * .29, '#fff'); circ(c, 0, s * .06, s * .22, '#7fd4f5'); circ(c, 0, s * .06, s * .12, '#3a6fa8'); circ(c, -s * .07, -s * .01, s * .05, '#fff');
      circ(c, s * .38, -s * .17, s * .06, '#ff6b81'); c.restore();
    },
    drawRoundBtn(c, b, ring, bob = 0) {
      c.save(); c.translate(b.x, b.y - bob); c.fillStyle = 'rgba(80,40,20,.22)'; c.beginPath(); c.arc(2, 5, b.r, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.fill(); c.strokeStyle = ring; c.lineWidth = Math.max(3, b.r * .1); c.stroke(); c.restore();
    },
    drawCam(c) {
      const b = this.camBtn(); if (!b) return; const done = this.finishedAll || (this.st && this.st.k === 'serve'), bob = done ? Math.abs(Math.sin(this.t * 3)) * 5 : 0;
      const left = Math.max(0, (this.camUntil || 0) - this.t), cool = left > 0, sh = (this.camShake = Math.max(0, (this.camShake || 0) - .05)) * Math.sin(this.t * 60) * 5;
      this.drawRoundBtn(c, { x: b.x + sh, y: b.y, r: b.r }, cool ? '#b9b3c2' : '#ff6b9d', bob); this.drawCamGlyph(c, b.x + sh, b.y - bob, b.r * .8, this.t);
      if (cool) {   // the button turns slightly gray and a ring fills back up while it recharges
        c.save(); c.translate(b.x + sh, b.y - bob); c.fillStyle = 'rgba(150,146,160,.55)'; c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(4, b.r * .12); c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, b.r * .88, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - left / CAM_COOL)); c.stroke(); c.restore();
      }
    },
    drawAlbum(c) {
      const b = this.albumBtn(); this.drawRoundBtn(c, b, CAT_COL[this.tab].main, 0);
      c.save(); c.translate(b.x, b.y); const s = b.r * .95;
      for (const [dx, dy, a, col] of [[-.12, .04, -.22, '#ffd0e4'], [.1, -.02, .16, '#cdeffc']]) { c.save(); c.translate(dx * s, dy * s); c.rotate(a); box(c, -s * .36, -s * .42, s * .72, s * .84, '#fff', s * .06); c.strokeStyle = '#e0c8b0'; c.lineWidth = 1.5; rr(c, -s * .36, -s * .42, s * .72, s * .84, s * .06); c.stroke(); box(c, -s * .28, -s * .34, s * .56, s * .52, col, s * .04); c.restore(); }
      c.save(); c.translate(s * .1, -s * .1); c.rotate(.16); c.scale(.3, .3); drawCupcake(c, { baked: 1, liner: '#ff9ec8', frost: { col: '#ffd0e4' } }, s); c.restore();
      c.restore();
      if (this.photoCount) { c.save(); c.translate(b.x + b.r * .72, b.y + b.r * .62); circ(c, 0, 0, b.r * .36, '#ff6b9d'); fancyText(c, String(Math.min(99, this.photoCount)), 0, 1, b.r * .38, { outline: .2, stroke: '#c93b73', shadow: false }); c.restore(); }
    },
    // takes a photo of the food on its plate (without any hints or buttons), keeps it in her album and, if a grown-up allows it, the device's photos
    snap() {
      if (this.snapping || !this.R || !this.camBtn()) return;
      if (this.t < (this.camUntil || 0)) { sfx.oops(); this.camShake = 1; return; }   // the camera is recharging: no photo spam
      this.camUntil = this.t + CAM_COOL; this.snapping = true; this.flash = 1; sfx.snap(); setTimeout(() => sfx.chime(), 140);
      let out = null;
      try {
        const S = 1.5, w = this.w, h = this.h, oc = document.createElement('canvas'); oc.width = Math.round(w * S); oc.height = Math.round(h * S);
        const o = oc.getContext('2d'); o.setTransform(S, 0, 0, S, 0, 0); drawTable(o, w, h, this.t);
        F.hush = true; try { const s = this.st; if (s) H[s.k].draw(this, s, o); } finally { F.hush = false; }
        const bw = Math.min(w * .94, this.SH * 1.7), bh = this.SH * .98, sx = (this.bx - bw / 2) * S, sy = (this.by - bh / 2) * S, sw = bw * S, sh = bh * S;
        const K = CAT_COL[this.R.cat], M = 1100 / Math.max(sw, sh), cw = Math.round(sw * M), ch = Math.round(sh * M), pad = 34, band = 130;
        out = document.createElement('canvas'); out.width = cw + pad * 2; out.height = ch + pad * 2 + band; const q = out.getContext('2d');
        gingham(q, 0, 0, out.width, out.height, 0, K.main, 28);
        q.save(); q.fillStyle = 'rgba(70,30,20,.25)'; rr(q, pad + 4, pad + 10, cw, ch, 28); q.fill(); q.beginPath(); rr(q, pad, pad, cw, ch, 28); q.clip(); q.drawImage(oc, sx, sy, sw, sh, pad, pad, cw, ch); q.restore();
        q.strokeStyle = '#fff'; q.lineWidth = 10; rr(q, pad, pad, cw, ch, 28); q.stroke();
        const rw = Math.min(out.width * .8, 760); ribbon(q, out.width / 2, pad + ch + band * .52, rw, 78, K.main, K.dark); fitLabel(q, this.R.name, out.width / 2, pad + ch + band * .5, rw * .86, 44, { stroke: K.dark });
        art.star(q, out.width / 2 - rw / 2 - 30, pad + ch + band * .5, 24, '#ffd54a', .2); art.star(q, out.width / 2 + rw / 2 + 30, pad + ch + band * .5, 24, '#ffd54a', -.2);
      } catch (_) { out = null; }
      if (!out) { this.snapping = false; return; }
      this.snapAnim = { t: 0, img: out };
      const pid = store.active ? store.active.id : 'nobody', name = this.R.name, id = this.R.id;
      out.toBlob(blob => { if (!blob || !SPG.photos) { this.snapping = false; return; } SPG.photos.add(pid, blob, { recipe: id, name }).then(() => { this.photoCount = (this.photoCount || 0) + 1; this.snapping = false; }, () => { this.snapping = false; }); }, 'image/jpeg', .9);
    },
    drawSnap(c, dt) {
      const A = this.snapAnim; if (A) {
        A.t += dt; const b = this.camBtn() || { x: 40, y: this.h / 2, r: 20 }, u = clamp((A.t - .45) / .7, 0, 1), e = ease(u), img = A.img;
        const k0 = Math.min(this.w * .6 / img.width, this.h * .6 / img.height), k = lerp(k0, b.r * 1.6 / img.width, e), x = lerp(this.w / 2, b.x, e), y = lerp(this.h * .45, b.y, e);
        c.save(); c.translate(x, y); c.rotate((1 - e) * -.06 + e * .2); c.globalAlpha = 1 - clamp((A.t - 1.1) / .2, 0, 1); c.fillStyle = 'rgba(70,30,20,.25)'; c.fillRect(-img.width * k / 2 + 5, -img.height * k / 2 + 9, img.width * k, img.height * k); c.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k); c.restore();
        if (A.t > 1.3) this.snapAnim = null;
      }
      if (this.flash) { c.save(); c.globalAlpha = this.flash * .85; c.fillStyle = '#fff'; c.fillRect(0, 0, this.w, this.h); c.restore(); }
    },
    // ---- her album: the photos she took, newest first; touch one to see it big
    openGallery() {
      this.screen = 'gallery'; this.gal = { list: [], imgs: new Map(), page: 0, view: -1, loading: true, t: 0 }; sfx.pop();
      const pid = store.active ? store.active.id : 'nobody';
      if (!SPG.photos) { this.gal.loading = false; return; }
      SPG.photos.list(pid).then(list => {
        const G = this.gal; if (!G || this.screen !== 'gallery') return; G.list = list; G.loading = false; this.photoCount = list.length;
        for (const ph of list) { const url = URL.createObjectURL(ph.blob), im = new Image(); im.src = url; G.imgs.set(ph.id, { im, url }); }
      });
    },
    closeGallery() { this.freeGallery(); sfx.tap(); this.enterMenu(); },
    freeGallery() { if (this.gal) for (const { url } of this.gal.imgs.values()) URL.revokeObjectURL(url); this.gal = null; },
    galLayout() {
      const w = this.w, h = this.h, top = this.narrow ? 112 : this.uiR + 40, bot = h - 16, wide = w > h, cols = wide ? 4 : 2, rows = wide ? 2 : 3, per = cols * rows;
      const ar = Math.min(this.uiR * .75, 54), gw = w - 32 - ar * 4.2, gh = bot - top, gap = 16, cw = Math.min((gw - gap * (cols - 1)) / cols, ((gh - gap * (rows - 1)) / rows) * 1.05), chh = cw / 1.05;
      const G = this.gal, n = G ? G.list.length : 0, pages = Math.max(1, Math.ceil(n / per)), cells = [];
      for (let i = 0; i < per; i++) { const k = (G ? G.page : 0) * per + i; if (k >= n) break; const col = i % cols, row = Math.floor(i / cols); cells.push({ k, x: w / 2 + (col - (cols - 1) / 2) * (cw + gap), y: top + gh / 2 + (row - (rows - 1) / 2) * (chh + gap), w: cw, h: chh }); }
      return { cells, pages, per, prev: { x: 16 + ar, y: top + gh / 2, r: ar }, next: { x: w - 16 - ar, y: top + gh / 2, r: ar }, back: { x: this.albumBtn().x, y: this.albumBtn().y, r: this.albumBtn().r } };
    },
    galleryDown(p) {
      const G = this.gal; if (!G) return; const L = this.galLayout(), hit = b => Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.25;
      if (G.view >= 0) {   // one photo, big: left and right to look through them, the X (or anywhere else) to go back to the album
        const n = G.list.length; if (p.x < this.w * .2 && G.view > 0) { G.view--; sfx.tap(); } else if (p.x > this.w * .8 && G.view < n - 1) { G.view++; sfx.tap(); } else { G.view = -1; sfx.tap(); } return;
      }
      if (hit(L.back)) { this.closeGallery(); return; }
      if (G.page > 0 && hit(L.prev)) { G.page--; sfx.tap(); return; }
      if (G.page < L.pages - 1 && hit(L.next)) { G.page++; sfx.tap(); return; }
      for (const cd of L.cells) if (Math.abs(p.x - cd.x) < cd.w / 2 && Math.abs(p.y - cd.y) < cd.h / 2) { G.view = cd.k; G.vt = 0; sfx.pop(); return; }
    },
    drawPolaroid(c, im, x, y, w, h, rot) {
      c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = 'rgba(70,30,20,.22)'; c.fillRect(-w / 2 + 4, -h / 2 + 8, w, h); c.fillStyle = '#fff'; c.fillRect(-w / 2, -h / 2, w, h);
      const pad = w * .05, iw = w - pad * 2, ih = h - pad * 2;
      if (im && im.complete && im.naturalWidth) { const k = Math.min(iw / im.naturalWidth, ih / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k; c.drawImage(im, -dw / 2, -dh / 2, dw, dh); }
      else { c.fillStyle = '#f4ece4'; c.fillRect(-iw / 2, -ih / 2, iw, ih); }
      c.restore();
    },
    drawGallery(c, dt) {
      const G = this.gal; if (!G) return; G.t += dt; const L = this.galLayout(), w = this.w, h = this.h, K = CAT_COL[this.tab];
      this.drawRoundBtn(c, L.back, K.main, 0); c.save(); c.translate(L.back.x, L.back.y); c.strokeStyle = K.dark; c.lineWidth = L.back.r * .2; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(L.back.r * .2, -L.back.r * .42); c.lineTo(-L.back.r * .25, 0); c.lineTo(L.back.r * .2, L.back.r * .42); c.stroke(); c.restore();
      if (!this.narrow) { const tw = Math.min(w - 2 * (L.back.x + L.back.r + 40), 420); if (tw > 160) { ribbon(c, w / 2, 14 + this.uiR / 2, tw, Math.min(56, this.uiR * .8), K.main, K.dark); this.drawCamGlyph(c, w / 2, 14 + this.uiR / 2, Math.min(56, this.uiR * .8) * .38, this.t); } }
      if (!G.loading && !G.list.length) {   // nothing yet: a big camera and a plate say "take a photo of your food"
        const r = Math.min(w, h) * .14; c.save(); drawPlate(c, w / 2, h * .62, r * 1.6); c.restore(); this.drawCamGlyph(c, w / 2, h * .42 + Math.sin(this.t * 2) * 6, r, this.t);
        for (let i = 0; i < 5; i++) art.star(c, w / 2 + Math.cos(i * 1.3 + this.t) * r * 1.8, h * .42 + Math.sin(i * 1.3 + this.t) * r * 1.2, r * .12, '#ffd54a', i);
        return;
      }
      for (const cd of L.cells) { const ph = G.list[cd.k], im = G.imgs.get(ph.id); this.drawPolaroid(c, im && im.im, cd.x, cd.y, cd.w * .94, cd.h * .94, (rnd(ph.id * 3) - .5) * .1); }
      const arrow = (b, dir, on) => { if (!on) return; this.drawRoundBtn(c, b, K.main, 0); c.save(); c.translate(b.x, b.y); c.strokeStyle = K.dark; c.lineWidth = b.r * .2; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(-dir * b.r * .2, -b.r * .42); c.lineTo(dir * b.r * .25, 0); c.lineTo(-dir * b.r * .2, b.r * .42); c.stroke(); c.restore(); };
      arrow(L.prev, -1, G.page > 0); arrow(L.next, 1, G.page < L.pages - 1);
      if (L.pages > 1) for (let i = 0; i < L.pages; i++) circ(c, w / 2 + (i - (L.pages - 1) / 2) * 22, h - 14, 6, i === G.page ? K.main : 'rgba(255,255,255,.8)');
      if (G.view >= 0) {
        G.vt = (G.vt || 0) + dt; const e = ease(clamp(G.vt / .3, 0, 1)), ph = G.list[G.view], im = G.imgs.get(ph.id);
        c.save(); c.globalAlpha = .55 * e; c.fillStyle = '#3a2030'; c.fillRect(0, 0, w, h); c.restore();
        const iw = im && im.im.naturalWidth || 4, ih = im && im.im.naturalHeight || 3, k = Math.min(w * .78 / iw, h * .82 / ih) * (.85 + .15 * e);
        this.drawPolaroid(c, im && im.im, w / 2, h / 2, iw * k * 1.06, ih * k * 1.06, 0);
        const n = G.list.length, ar = { r: Math.min(this.uiR * .75, 54) };
        if (G.view > 0) arrow({ ...ar, x: 16 + ar.r, y: h / 2 }, -1, true);
        if (G.view < n - 1) arrow({ ...ar, x: w - 16 - ar.r, y: h / 2 }, 1, true);
      }
    },
    back() { if (this.screen === 'gallery') { if (this.gal && this.gal.view >= 0) { this.gal.view = -1; return true; } this.closeGallery(); return true; } return false; },
    probe() { return { sliceG: this.st && this.st.k === 'slice' ? H.slice.geom(this) : null, eat: this.pieces.map(p => p.left && p.left.length && !p.gone ? p.left[Math.floor(p.left.length / 2)] : null), pack: this.st && this.st.packT, spec: this.st && this.st.spec, cards: this.st && this.st.k === 'pick' ? H.pick.cards(this, this.st) : [], cam: this.camBtn(), album: this.screen === 'menu' ? this.albumBtn() : null, opt: this.opt, R1: this.R1, photos: this.photoCount || 0, gal: this.gal ? { n: this.gal.list.length, view: this.gal.view } : null, screen: this.screen, step: this.st && this.st.k, idx: this.stIdx, tray: this.tray.map(i => ({ id: i.id, x: i.x, y: i.y, used: i.used, kind: i.kind })), U: this.U, bx: this.bx, by: this.by, y1: this.y1, w: this.w, h: this.h, st: this.st && { fin: this.st.fin, canDone: this.st.canDone, state: this.st.state, i: this.st.i, n: this.st.n, end: this.st.end, placed: this.st.placed, closed: this.st.closed, sel: this.st.sel, units: (this.st.units || []).map(u => ({ id: u.id, x: u.x, y: u.y, state: u.state })) }, pieces: this.pieces.length, check: this.checkBtn(), menu: this.menuHit.map(m => ({ x: m.x, y: m.y, tab: m.tab, id: m.R && m.R.id })), want: this.wantIds(), tool: this.tool, flies: this.flies.length, busy: this.busy(), cuts: this.st && this.st.cuts ? this.st.cuts.length : 0, trans: !!this.trans, finishedAll: this.finishedAll, arrow: !!this.arrow, slots: this.screen === 'cook' ? this.slots() : [] }; },

    sceneBoard(c, noBoard) {
      if (noBoard) return;
      const bw = Math.min(this.w * .94, this.SH * 1.7), bh = this.SH * .98; drawBoard(c, this.bx, this.by, bw, bh);
    },
    drawPlateAndPiece(c, piece) {
      const B = this.foodBase(), pl = this.plate();
      drawPlate(c, pl.x, pl.y, pl.r); drawPlatePaint(this, c);
      c.save(); c.translate(B.x, B.y); drawPiece(c, piece, this.R1); c.restore();
    },
    layoutMenu() {
      const w = this.w, h = this.h; if (!w) return; this.menuHit = [];
      const compact = h < 520, short = Math.min(w, h);
      let y = compact ? 18 : 12;
      const titleH = compact ? 0 : this.narrow ? 42 : clamp(h * .075, 40, 64);
      const ab = this.albumBtn(), tw = Math.min(w - 2 * (ab.x + ab.r + 30), 460);
      this.titleBox = titleH && tw > 150 ? { x: w / 2, y: y + titleH / 2, w: tw, h: titleH } : null;
      if (titleH) y += titleH + 12;
      if (this.narrow) y = Math.max(y, 118);   // below the stars and the counter in the corner
      const tabH = compact ? 58 : clamp(short * .15, 62, 92), tabW = clamp((w - 36 - 20) / 3, 92, 210);
      if (!compact && (w / 2 - 1.5 * (tabW + 10) < ab.x + ab.r + 10 || w / 2 + 1.5 * (tabW + 10) > w - 112)) y = Math.max(y, 152);   // the tabs would run into the camera album or the star counters in the corners
      this.tabBox = { h: tabH, w: tabW, y: y + tabH / 2 };
      CATS.forEach((cat, i) => this.menuHit.push({ x: w / 2 + (i - 1) * (tabW + 10), y: y + tabH / 2, w: tabW, h: tabH, tab: i }));
      y += tabH + 14;
      const list0 = RECIPES.filter(r => r.cat === this.tab), n = list0.length, bot = h - 14, rw = w - 28, rh = bot - y, gap = clamp(short * .025, 8, 18);
      let cols = 1, best = 0;   // as many columns as make the cards biggest (cards stay between a little wide and a little tall)
      for (let k = 1; k <= n; k++) { const r = Math.ceil(n / k); let a = (rw - gap * (k - 1)) / k - 26 / k, b = (rh - gap * (r - 1)) / r - 26 / r; if (a / b > 1.3) a = b * 1.3; else if (a / b < .8) b = a / .8; if (a * b > best) { best = a * b; cols = k; } }
      const rows = Math.ceil(n / cols);
      let cw = (rw - 26 - gap * (cols - 1)) / cols, ch = (rh - 26 - gap * (rows - 1)) / rows;
      if (cw / ch > 1.3) cw = ch * 1.3; else if (cw / ch < .8) ch = cw / .8;
      this.cardW = cw; this.cardH = ch;
      const gw = cw * cols + gap * (cols - 1), gh = ch * rows + gap * (rows - 1), gx = w / 2, gy = y + rh / 2;
      this.gridBox = { x: gx, y: gy, w: gw + 26, h: gh + 26 };
      const list = RECIPES.filter(r => r.cat === this.tab); this.cards = [];
      list.forEach((R, i) => { const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - cols * (rows - 1) : cols, cx = gx + ((i % cols) - (inRow - 1) / 2) * (cw + gap), cy = gy + (row - (rows - 1) / 2) * (ch + gap); this.cards.push({ x: cx, y: cy, R }); this.menuHit.push({ x: cx, y: cy, w: cw, h: ch, R }); });
    },
    drawMenu(c) {
      const w = this.w, h = this.h, g = this.gridBox, cat = CAT_COL[this.tab];
      // title
      if (this.titleBox) { const T = this.titleBox; ribbon(c, T.x, T.y, T.w, T.h, '#ff7aa8', '#d94a82', T.h * .35); fitLabel(c, 'Sprout Kitchen', T.x, T.y - T.h * .02, T.w * .86, T.h * .56, { stroke: '#a82f62', oneLine: true }); }
      // the three kinds of food, as chunky tabs
      this.menuHit.forEach(m => {
        if (m.tab == null) return; const sel = m.tab === this.tab, K = CAT_COL[m.tab], bob = sel ? Math.sin(this.t * 3) * 2 : 0, k = sel ? 1.05 : .94;
        c.save(); c.translate(m.x, m.y + bob - (sel ? 4 : 0)); c.scale(k, k);
        c.fillStyle = 'rgba(70,30,20,.25)'; rr(c, -m.w / 2 + 2, -m.h / 2 + 7, m.w, m.h, m.h * .3); c.fill();
        const gr = c.createLinearGradient(0, -m.h / 2, 0, m.h / 2); gr.addColorStop(0, sel ? shade(K.main, .25) : shade(K.main, .6)); gr.addColorStop(1, sel ? K.main : shade(K.main, .35)); c.fillStyle = gr; rr(c, -m.w / 2, -m.h / 2, m.w, m.h, m.h * .3); c.fill();
        c.strokeStyle = sel ? '#fff' : K.dark; c.lineWidth = sel ? 5 : 2.5; rr(c, -m.w / 2, -m.h / 2, m.w, m.h, m.h * .3); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, -m.w / 2 + m.h * .1, -m.h / 2 + m.h * .07, m.w - m.h * .2, m.h * .2, m.h * .1); c.fill();
        c.save(); c.globalAlpha = sel ? 1 : .85; drawSample(c, RECIPES.find(r => r.id === ['cupcake', 'sandwich', 'burger'][m.tab]).sample, 0, -m.h * .13, m.w * .5, m.h * .5); c.restore();
        fitLabel(c, CATS[m.tab].name, 0, m.h * .3, m.w * .9, m.h * .26, { stroke: K.dark, fill: '#fff' });
        c.restore();
      });
      // the menu board: a checked cloth in the colour of the food
      c.save(); c.fillStyle = 'rgba(70,30,20,.25)'; rr(c, g.x - g.w / 2 + 3, g.y - g.h / 2 + 9, g.w, g.h, 30); c.fill(); gingham(c, g.x - g.w / 2, g.y - g.h / 2, g.w, g.h, 30, cat.main, Math.max(10, this.cardW * .09)); c.strokeStyle = '#fff'; c.lineWidth = 7; rr(c, g.x - g.w / 2, g.y - g.h / 2, g.w, g.h, 30); c.stroke(); c.strokeStyle = cat.dark; c.lineWidth = 2; rr(c, g.x - g.w / 2 + 6, g.y - g.h / 2 + 6, g.w - 12, g.h - 12, 26); c.stroke(); c.restore();
      for (const cd of this.cards) {
        const cw = this.cardW, ch = this.cardH, R = cd.R, done = this.bag.done[R.id] || 0, press = this.pressed === R.id ? 3 : 0;
        c.save(); c.translate(cd.x, cd.y + press);
        c.fillStyle = 'rgba(70,30,20,.22)'; rr(c, -cw / 2 + 2, -ch / 2 + 8 - press, cw, ch, cw * .12); c.fill();
        const gr = c.createLinearGradient(0, -ch / 2, 0, ch / 2); gr.addColorStop(0, '#fffefb'); gr.addColorStop(1, cat.light); c.fillStyle = gr; rr(c, -cw / 2, -ch / 2, cw, ch, cw * .12); c.fill();
        c.strokeStyle = done ? '#ffc93c' : cat.main; c.lineWidth = done ? 6 : 4; rr(c, -cw / 2, -ch / 2, cw, ch, cw * .12); c.stroke();
        // a soft plate under the dish
        c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(0, -ch * .08, cw * .4, ch * .27, 0, 0, TAU); c.fill(); c.strokeStyle = cat.light; c.lineWidth = 3; c.stroke();
        drawSample(c, R.sample, 0, -ch * .1, cw * .74, ch * .54);
        // the name on a little ribbon
        const rh = ch * .27, tl = rh * .3, rw = cw - 2 * tl - cw * .06; ribbon(c, 0, ch * .35, rw, rh, cat.main, cat.dark, tl); fitLabel(c, R.name, 0, ch * .35 - rh * .02, rw * .92, Math.min(rh * .5, cw * .13), { stroke: cat.dark });
        if (done) { c.save(); c.translate(cw * .38, -ch * .38); c.rotate(.2); art.star(c, 0, 0, Math.min(cw, ch) * .13, '#ffd54a', 0); fancyText(c, String(Math.min(99, done)), 0, Math.min(cw, ch) * .01, Math.min(cw, ch) * .12, { fill: '#fff', stroke: '#b9770e', outline: .3, shadow: false }); c.restore(); }
        c.restore();
      }
    },
    drawStepBar(c) {
      const R = this.R, cc = CAT_COL[R.cat], n = R.steps.length, sb = this.sb, w = this.w, left = this.narrow ? sb + 34 : 96, right = this.narrow ? w - 22 : w - 190;
      const sz = Math.min(sb * .9, (right - left - 28) / (n * 1.28 - .28)), gap = sz * .28, tot = n * sz + (n - 1) * gap, x0 = this.narrow ? left + (right - left - tot) / 2 : (w - tot) / 2 + (this.narrow ? 0 : 0), y = this.topY + sb / 2;
      this.stepBarW = tot + 40;
      c.save(); c.fillStyle = 'rgba(70,30,20,.18)'; rr(c, x0 - 14 + 2, y - sb * .56 + 5, tot + 28, sb * 1.12, sb * .56); c.fill(); c.fillStyle = 'rgba(255,255,255,.78)'; rr(c, x0 - 14, y - sb * .56, tot + 28, sb * 1.12, sb * .56); c.fill(); c.strokeStyle = cc.main; c.lineWidth = 3; c.stroke(); c.restore();
      R.steps.forEach((sp, i) => {
        const cur = i === this.stIdx, done = i < this.stIdx, x = x0 + i * (sz + gap) + sz / 2, k = cur ? 1.12 + Math.sin(this.t * 4) * .04 : 1;
        c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = done ? '#bff0b0' : cur ? '#fff' : 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(0, 0, sz * .5, 0, TAU); c.fill(); c.strokeStyle = cur ? cc.main : done ? '#5cc060' : '#e0c8b0'; c.lineWidth = cur ? 4 : 2.5; c.stroke();
        c.globalAlpha = done ? .55 : cur ? 1 : .6; c.save(); c.beginPath(); c.arc(0, 0, sz * .46, 0, TAU); c.clip(); stepIcon(c, sp.k, sz * .72, sp.icon || sp.id || (sp.ids && sp.ids[0]) || (sp.opts && (this.opt[sp.key] || sp.opts[0])) || (sp.k === 'cut' ? this.cutters[0] : null) || (sp.k === 'decorate' && sp.mode === 'cover' ? sp.tools[0] : null)); c.restore(); c.globalAlpha = 1;
        if (done) { c.fillStyle = '#2fae4a'; c.beginPath(); c.arc(sz * .3, sz * .3, sz * .2, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(sz * .22, sz * .3); c.lineTo(sz * .29, sz * .37); c.lineTo(sz * .4, sz * .22); c.stroke(); }
        c.restore();
      });
      // back to the menu
      const mb = this.menuBtn(); c.save(); c.translate(mb.x, mb.y); c.fillStyle = 'rgba(80,40,20,.2)'; c.beginPath(); c.arc(2, 4, mb.r, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, mb.r, 0, TAU); c.fill(); c.strokeStyle = cc.main; c.lineWidth = 3; c.stroke();
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.fillStyle = '#ff9ec8'; rr(c, dx * mb.r * .5 - mb.r * .22, dy * mb.r * .5 - mb.r * .22, mb.r * .44, mb.r * .44, mb.r * .1); c.fill(); } c.restore();
    },
    drawTray(c, dt) {
      const w = this.w, h = this.h, th = this.th, pad = 8;
      c.save(); c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, pad + 3, h - th + 6, w - pad * 2, th - 8, th * .2); c.fill();
      const gr = c.createLinearGradient(0, h - th, 0, h); gr.addColorStop(0, '#fff8ee'); gr.addColorStop(1, '#fbe6d4'); c.fillStyle = gr; rr(c, pad, h - th + 2, w - pad * 2, th - 8, th * .2); c.fill(); c.strokeStyle = CAT_COL[this.R ? this.R.cat : 0].main; c.lineWidth = 4; rr(c, pad, h - th + 2, w - pad * 2, th - 8, th * .2); c.stroke(); c.restore();
      const want = this.wantIds(), glowOn = this.idle > 4.5 || (this.st && this.st.k === 'stack');
      for (const it of this.tray) {
        it.glow = lerp(it.glow, want.includes(it.id) && glowOn ? 1 : 0, Math.min(1, dt * 6)); it.wig = Math.max(0, it.wig - dt * 2.2);
        if (it.back) { it.x = lerp(it.x, it.hx, Math.min(1, dt * 14)); it.y = lerp(it.y, it.hy, Math.min(1, dt * 14)); if (Math.hypot(it.x - it.hx, it.y - it.hy) < 1.5) { it.back = false; it.x = it.hx; it.y = it.hy; } }
        else if (!it.drag && !it.fly) { it.x = lerp(it.x, it.hx, Math.min(1, dt * 9)); it.y = lerp(it.y, it.hy, Math.min(1, dt * 9)); }
        if (it.kind === 'pile') { this.drawPileItem(c, it); continue; }
        c.save(); c.translate(it.x, it.y); const lift = it.drag ? 1.25 : 1, pul = 1 + it.glow * Math.sin(this.t * 7) * .07; c.scale(lift * pul, lift * pul); c.rotate(Math.sin(this.t * 40) * it.wig * .25);
        if (it.drag) { c.fillStyle = 'rgba(80,40,20,.18)'; c.beginPath(); c.ellipse(4, it.r * .9, it.r * .8, it.r * .25, 0, 0, TAU); c.fill(); }
        if (it.glow > .01 || ((it.kind === 'tool' || it.kind === 'cutter') && this.tool === it.id)) { const sel = (it.kind === 'tool' || it.kind === 'cutter') && this.tool === it.id; c.fillStyle = sel ? 'rgba(255,107,157,.28)' : `rgba(255,224,102,${.5 * it.glow + .1})`; c.beginPath(); c.arc(0, 0, it.r * 1.12, 0, TAU); c.fill(); if (sel) { c.strokeStyle = '#ff6b9d'; c.lineWidth = 4; c.stroke(); } }
        else { c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(0, 0, it.r * 1.05, 0, TAU); c.fill(); c.strokeStyle = 'rgba(224,200,176,.8)'; c.lineWidth = 2; c.stroke(); }
        if (it.used) c.globalAlpha = .25;
        const s = it.r * 1.75;
        if (it.cnt && it.cnt.total > 1) { const n = it.cnt.total, dr = Math.max(3, it.r * .1); for (let i = 0; i < n; i++) { c.fillStyle = i < it.cnt.done ? '#7ed957' : '#ffb3d1'; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc((i - (n - 1) / 2) * dr * 2.8, it.r * .88, dr, 0, TAU); c.fill(); c.stroke(); } }
        if (it.kind === 'cutter') cutterArt(c, it.id, it.r * .72, this.t);
        else if (it.kind === 'dough') ING.dough(c, s * 1.2);
        else if (it.kind === 'batter') drawBowl(c, 0, it.r * .05, it.r * .8, { fill: .8, items: [], col: this.mix ? this.mix.final : BATTER, final: this.mix ? this.mix.final : BATTER, stirred: 1 }, 0);
        else if (it.kind === 'tool') this.drawToolIcon(c, it.id, s);
        else (ING[it.id] || ING.flour)(c, s);
        c.restore();
      }
      // the helper in the corner: her own pet (with what it wears), or the chef bear if she has no pet yet. Touch it: it jumps for joy.
      const ch = this.chefPos(), s = this.st, r = ch.r; this.chefBounce = Math.max(0, (this.chefBounce || 0) - dt * 1.6);
      const jump = this.chefBounce > 0 ? Math.sin((1 - this.chefBounce) * Math.PI) * r * .75 : 0, hop = jump || (this.idle > 4.5 ? Math.abs(Math.sin(this.t * 5)) * 5 : 0);
      const pet = SPG.pets && SPG.pets.active && SPG.pets.active();
      if (pet) { c.save(); c.translate(ch.x, ch.y + r * .95 - hop); SPG.pets.draw(c, pet.id, r * 2.1, this.t, { mood: jump ? 'cheer' : 'happy', hat: pet.hat, face: pet.face, neck: pet.neck }); c.restore(); }
      else {
        c.save(); c.translate(ch.x, ch.y + r * .15 - hop); art.avatar(c, 'bear', r * .95, { mood: jump ? 'cheer' : 'happy' });
        c.fillStyle = '#fff'; c.strokeStyle = '#d8d0e0'; c.lineWidth = 2; rr(c, -r * .55, -r * 1.25, r * 1.1, r * .55, r * .1); c.fill(); c.stroke(); for (const dx of [-.45, 0, .45]) { c.beginPath(); c.arc(dx * r, -r * 1.42, r * .38, 0, TAU); c.fill(); c.stroke(); } c.fillStyle = '#fff'; c.fillRect(-r * .5, -r * 1.3, r * 1.0, r * .5);
        c.restore();
      }
      if (this.emote) { const E = this.emote; E.t += dt; const u = E.t / 1.1; if (u >= 1) this.emote = null; else { c.save(); c.globalAlpha = 1 - u * u; c.translate(ch.x + r * .2, ch.y - r * 1.3 - u * r * 1.4); c.scale(.6 + u * .5, .6 + u * .5); c.fillStyle = E.col; c.beginPath(); c.moveTo(0, r * .3); c.bezierCurveTo(-r * .5, -r * .05, -r * .3, -r * .45, 0, -r * .2); c.bezierCurveTo(r * .3, -r * .45, r * .5, -r * .05, 0, r * .3); c.fill(); c.restore(); } }
      const id = s && !this.finishedAll ? this.tip() : null;
      if (id) {
        const k = s.k, sp = s.spec, bx = ch.x + r * 1.5, by = ch.y - r * 1.9 - hop * .5, br = r * 1.05;
        c.save(); c.translate(bx, by); c.fillStyle = 'rgba(80,40,20,.18)'; c.beginPath(); c.arc(3, 5, br, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.strokeStyle = '#ff9ec8'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, br, 0, TAU); c.fill(); c.stroke(); tri(c, [[-br * .75, br * .5], [-br * 1.15, br * 1.1], [-br * .3, br * .85]], '#fff'); c.beginPath(); c.arc(0, 0, br * .9, 0, TAU); c.clip();
        const pul = 1 + (this.idle > 4.5 ? Math.sin(this.t * 6) * .06 : 0); c.scale(pul, pul);
        if (id === 'HAPPY') { c.fillStyle = '#ff6b9d'; c.beginPath(); c.moveTo(0, br * .45); c.bezierCurveTo(-br * .8, -br * .05, -br * .45, -br * .7, 0, -br * .3); c.bezierCurveTo(br * .45, -br * .7, br * .8, -br * .05, 0, br * .45); c.fill(); }
        else stepIcon(c, k === 'fill' ? 'add' : k, br * 1.5, k === 'fill' ? (sp.what === 'dough' ? 'dough' : 'batter') : id);
        c.restore();
      }
    },
    drawTool(c, id, unit, r) {
      const CA = SPG.cookArt;
      if (unit === 'egg') ING.egg(c, r * 1.0); else if (unit === 'stick') ING.butter(c, r * 1.2);
      else if (CA.drawMeasure) CA.drawMeasure(c, unit, r * (unit === 'half' ? .85 : unit === 'tbsp' ? .9 : 1.05), 1, MCOL[id] || '#fff', 0); else (ING[id] || ING.flour)(c, r * 1.2);
    },
    drawPileItem(c, it) {
      const CA = SPG.cookArt, r = it.r, left = it.plan.length - it.cnt.done, unit = it.plan[Math.min(it.cnt.done, it.plan.length - 1)], counted = unit === 'egg' || unit === 'stick';
      if (it.glow > .02) { c.save(); c.globalAlpha = it.glow * .55; c.fillStyle = '#ffe066'; c.beginPath(); c.ellipse(it.hx, it.hy + r * .2, r * 1.5, r * 1.15, 0, 0, TAU); c.fill(); c.restore(); }
      c.save(); c.translate(it.hx - (it.used ? 0 : r * .35), it.hy); if (it.used) c.globalAlpha = .45;
      if (CA.drawPile) CA.drawPile(c, it.id, counted ? Math.max(0, left - (it.used ? 0 : 1)) : 1, r * 1.6); else (ING[it.id] || ING.flour)(c, r * 1.5);
      c.restore();
      fancyText(c, it.label, it.hx, it.hy + r * 1.2, Math.max(13, r * .34), { stroke: '#7a3b5a', outline: .25 });
      const n = it.plan.length; if (n > 1) { const dr = Math.max(3, r * .09); for (let i = 0; i < n; i++) { c.fillStyle = i < it.cnt.done ? '#7ed957' : '#ffb3d1'; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(it.hx + (i - (n - 1) / 2) * dr * 2.8, it.hy + r * 1.55, dr, 0, TAU); c.fill(); c.stroke(); } }
      if (!it.used) { const held = it.drag || it.back, x = held ? it.x : it.hx + r * .62, y = held ? it.y : it.hy + r * .3, k = it.drag ? 1.2 : 1 + it.glow * Math.sin(this.t * 7) * .06; c.save(); c.translate(x, y); c.scale(k, k); c.rotate(Math.sin(this.t * 40) * it.wig * .25); this.drawTool(c, it.id, unit, r * .62); c.restore(); }
    },
    iconId(tool) { const v = VARS[tool]; if (!v || !this.kinds) return tool; const k = this.kinds[kindKey(tool)], f = v().find(x => x[1] === k); return tool === 'bucket' ? 'paintbucket' : f ? f[0] : tool; },
    drawToolIcon(c, id, s) { if (id === 'bucket') drawPaintBucket(c, s * .9, ICING12[this.kinds.icing] || ICING12.pink); else (ING[this.iconId(id)] || ING[id] || ING.flour)(c, s); },
    menuLayout() {
      const M = this.menu, it = M.it, opts = VARS[M.tool](), n = opts.length, cols = n > 8 ? Math.ceil(n / 2) : n, rows = Math.ceil(n / cols);
      const r = clamp(Math.min(it.r * .8, (this.w - 40) / (cols * 2.5)), 18, 40), gap = r * 2.5, w = cols * gap + 16, h = rows * gap + 12;
      const x = clamp(it.hx, w / 2 + 8, this.w - w / 2 - 8), y = it.hy - it.r * 1.2 - h / 2;
      return { x, y, w, h, opts: opts.map(([icon, kind], i) => ({ icon, kind, r, x: x + ((i % cols) - (cols - 1) / 2) * gap, y: y + (Math.floor(i / cols) - (rows - 1) / 2) * gap })) };
    },
    drawMenuPop(c) {
      if (!this.menu || this.screen !== 'cook') return; const m = this.menuLayout(), cur = this.kinds[kindKey(this.menu.tool)];
      c.save(); c.fillStyle = 'rgba(80,40,20,.2)'; rr(c, m.x - m.w / 2 + 3, m.y - m.h / 2 + 6, m.w, m.h, 24); c.fill(); c.fillStyle = '#fff'; rr(c, m.x - m.w / 2, m.y - m.h / 2, m.w, m.h, 24); c.fill(); c.strokeStyle = '#ff9ec8'; c.lineWidth = 3; c.stroke();
      tri(c, [[this.menu.it.hx - 12, m.y + m.h / 2 - 1], [this.menu.it.hx + 12, m.y + m.h / 2 - 1], [this.menu.it.hx, m.y + m.h / 2 + 12]], '#fff');
      for (const o of m.opts) { const on = o.kind === cur; c.fillStyle = on ? 'rgba(255,107,157,.22)' : 'rgba(255,248,238,.9)'; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill(); if (on) { c.strokeStyle = '#ff6b9d'; c.lineWidth = 3; c.stroke(); } c.save(); c.translate(o.x, o.y); (ING[o.icon] || ING.flour)(c, o.r * 1.6); c.restore(); }
      c.restore();
    },
    drawFlies(c) {
      for (const m of this.motions) this.drawMotion(c, m);
      for (const f of this.flies) { const u = ease(clamp(f.t / f.dur, 0, 1)); const x = lerp(f.x0, f.x1, u), y = lerp(f.y0, f.y1, u) - Math.sin(u * Math.PI) * this.U * .1; c.save(); c.translate(x, y); const k = lerp(1.2, .85, u); c.scale(k, k); c.fillStyle = 'rgba(80,40,20,.15)'; c.beginPath(); c.ellipse(3, f.size * .5, f.size * .5, f.size * .15, 0, 0, TAU); c.fill(); f.draw(c, f.size * 2); c.restore(); }
    },
    drawCheck(c) {
      const cb = this.checkBtn(); if (!cb) return; const k = 1 + Math.sin(this.t * 6) * .06;
      c.save(); c.translate(cb.x, cb.y); c.scale(k, k); c.fillStyle = 'rgba(80,40,20,.25)'; c.beginPath(); c.arc(3, 6, cb.r, 0, TAU); c.fill(); c.fillStyle = '#4fcf6a'; c.beginPath(); c.arc(0, 0, cb.r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = cb.r * .14; c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = cb.r * .2; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(-cb.r * .42, 0); c.lineTo(-cb.r * .1, cb.r * .32); c.lineTo(cb.r * .44, -cb.r * .3); c.stroke(); c.restore();
    },
    drawArrow(c) {
      if (!this.arrow) return; const a = this.arrowPos(), k = 1 + Math.sin(this.t * 6) * .06;
      c.save(); c.translate(a.x, a.y); c.scale(k, k); c.fillStyle = 'rgba(80,40,20,.25)'; c.beginPath(); c.arc(3, 6, a.r, 0, TAU); c.fill(); c.fillStyle = '#4fcf6a'; c.beginPath(); c.arc(0, 0, a.r, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = a.r * .12; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-a.r * .28, -a.r * .42); c.lineTo(a.r * .44, 0); c.lineTo(-a.r * .28, a.r * .42); c.closePath(); c.fill(); c.restore();
    },
    tick(now) {
      if (!this.running) return; const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.idle += dt;
      this.update(dt); this.draw(dt); this.raf = requestAnimationFrame(this.tick);
    },
    update(dt) {
      this.fx.update(dt);
      if (this.flash) this.flash = Math.max(0, this.flash - dt * 2.5);
      if (this.screen === 'intro') { this.intro.t += dt; if (this.intro.t > 3.2) this.endIntro(); }
      if (this.trans && this.trans.intro) { const T = this.trans; T.t += dt / TRANS; if (T.t >= .5 && !T.mid) { T.mid = true; this.screen = 'cook'; this.intro = null; this.beginStep(); } if (T.t >= 1) this.trans = null; return; }
      if (this.screen !== 'cook') return;
      if (this.piece && FLAT.includes(this.piece.type) && this.pieces.length <= 1) { const tr = this.foodR(this.piece); this.R1 = lerp(this.R1 || tr, tr, Math.min(1, dt * 5)); } else this.R1 = this.U * .26;
      const s = this.st;
      for (const f of this.flies) { f.t += dt; if (!f.done && f.t >= f.dur) { f.done = true; f.cb && f.cb(); } } this.flies = this.flies.filter(f => !f.done);
      this.updateMotions(dt);
      if (this.trans) { const T = this.trans; T.t += dt / TRANS; if (T.t >= .5 && !T.mid) { T.mid = true; if (T.intro) { this.screen = 'cook'; this.intro = null; } else this.stIdx++; this.beginStep(); } if (T.t >= 1) this.trans = null; if (T.t < .75) return; }
      if (s) {
        if (H[s.k].update) H[s.k].update(this, s, dt);
        if (s.fin && s.k !== 'serve') { s.finT -= dt; if (s.finT <= 0 && !this.busy()) this.nextStep(); }
        // the step's instruction is said once when it starts; after that only one gentle reminder, and only if nothing was touched at all
        if (this.promptDue && !this.trans) { this.promptDue = false; this.hintSay(); }
        if (!s.fin && !s.touched && !s.reminded && this.idle > 22 && !this.drag) { s.reminded = true; this.hintSay(); this.chefBounce = 1; }
      }
      if (this.arrow) { this.arrow.t += dt; if (this.arrow.t > 25) this.enterMenu(); }
    },
    draw(dt = .016) {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      drawTable(c, w, h, this.t);
      if (this.screen === 'menu') { this.drawMenu(c); this.drawAlbum(c); this.fx.draw(c); return; }
      if (this.screen === 'gallery') { this.drawGallery(c, dt); this.fx.draw(c); return; }
      if (this.screen === 'intro' || (this.trans && this.trans.intro && !this.trans.mid)) { this.drawIntro(c); this.fx.draw(c); this.drawTrans(c); return; }
      this.drawStepBar(c);
      const s = this.st; if (s) H[s.k].draw(this, s, c);
      this.drawFlies(c); this.drawTray(c, dt); this.drawCheck(c); this.drawArrow(c);
      if (this.finishedAll) { const K = CAT_COL[this.R.cat], bw = Math.min(w * .8, 520), bh = clamp(h * .09, 44, 66), by = this.y0 + bh * .7; ribbon(c, w / 2, by, bw, bh, K.main, K.dark); fitLabel(c, this.R.name + '!', w / 2, by - bh * .02, bw * .85, bh * .56, { stroke: K.dark }); }
      this.drawMenuPop(c); this.drawCam(c); this.fx.draw(c); this.drawSnap(c, dt); this.drawTrans(c);
    }
  });

  /* ---------------------------------------------------------------- hub card */
  SPG.games.push({
    id: 'cook', name: 'Sprout Kitchen', order: 12,
    icon(c, w, h) {
      drawTable(c, w, h, 0);
      const bw = w * .86, bh = h * .78; drawBoard(c, w / 2, h * .52, bw, bh);
      const R = Math.min(w, h) * .17;
      c.save(); c.translate(w * .3, h * .42); c.rotate(-.1); drawCookie(c, { shape: 'bear', baked: 1, deco: { fill: '#ff9ec8', dots: [{ id: 'candy', x: -.25, y: -.1, col: '#5cc8f2' }, { id: 'candy', x: .25, y: -.1, col: '#5cc8f2' }, { id: 'sprinkles', x: 0, y: .3, col: '#ffd54a', rot: .4 }] } }, R * 1.25); c.restore();
      c.save(); c.translate(w * .68, h * .36); drawCookie(c, { shape: 'star', baked: 1, deco: { fill: '#ffe066' } }, R * 1.05); c.restore();
      c.save(); c.translate(w * .62, h * .78); drawPiece(c, RECIPES.find(r => r.id === 'burger').sample, R * .62); c.restore();
      c.save(); c.translate(w * .22, h * .76); drawPin(c, 0, 0, R * 1.0, -.15); c.restore();
    },
    create: host => new CookGame(host)
  });
})();
