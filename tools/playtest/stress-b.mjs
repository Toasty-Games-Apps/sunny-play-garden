// Toddler stress test for the calm games and the sound system: Coloring Book, Pet Shop, Pet Care (and its grooming close-up), Fish Tank,
// Style Studio (and the Hair Salon), Clay Corner, Fishing Pond, Caterpillars, Feeling Friends, Tidy Time and Shape Builder.
// Each game is mashed the way a small child does it: 15 to 20 taps a second, five fingers at once, drags that leave the screen or end
// in a pointercancel, long presses, the screen turning mid-drag, the tab going hidden mid-sound, the grown-up gate opening while a
// finger is down, leaving with the home button mid-animation and coming back ten times fast. The page is instrumented:
//   - every Web Audio source (oscillators and buffer sources) is counted from start() to its end, so a sound that never stops, a
//     loop that keeps going after the finger lifts or the game is left, and a pile-up of one-shots are all visible
//   - the speaking voice is a fake that logs what is said and where (a line said after leaving a game or while paused is a bug)
//   - requestAnimationFrame callbacks and intervals are counted after a game is destroyed
//   - the game object and the player's save are walked for NaN, and for arrays that only ever grow
//   - stars earned by mashing are counted (stars are earned, never farmed)
// usage: node stress-b.mjs [W H]   GAMES=name,name to pick games (_ for a space; none = only the regression checks at the end), SECS=n seconds of mashing
// per game (default 6), CPU=4 to throttle, REG=0 to skip the regression checks
import { start, stop, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8222';
const W = +process.argv[2] || 390, H = +process.argv[3] || 844, SECS = +process.env.SECS || 6;
const GAMES = process.env.GAMES === 'none' ? [] : process.env.GAMES ? process.env.GAMES.split(',').map(g => g.replace(/_/g, ' ')) : ['Coloring Book', 'Pet Shop', 'Pet Care', 'Pet Care close-up', 'Fish Tank', 'Fish Tank visitor', 'Style Studio', 'Hair Salon', 'Clay Corner', 'Fishing Pond', 'Caterpillars', 'Feeling Friends', 'Tidy Time', 'Shape Builder'];
const b = await start({ args: ['--autoplay-policy=no-user-gesture-required'] });
let fails = 0; const fail = (game, m) => { fails++; console.log('FAIL', game + ':', m); };

// what is injected into the page before it loads
const INSTR = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const Q = window.__qa = { live: new Set(), said: [], lines: [], raf: 0, intervals: new Map(), maxLive: 0 };
  const who = () => (new Error().stack || '').split('\n').slice(4, 7).map(l => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '').replace(/[?)].*$|\(/g, '')).join(' < ');
  const isLoop = s => (s.__kind === 'osc' || s.loop) && s.__stopAt == null;
  if (AC) {
    const tag = s => {
      s.__kind = s instanceof OscillatorNode ? 'osc' : 'buf'; s.__who = who();
      const st = s.start, sp = s.stop;
      s.start = function (...a) { Q.live.add(s); Q.maxLive = Math.max(Q.maxLive, Q.live.size); s.addEventListener('ended', () => Q.live.delete(s)); return st.apply(this, a); };
      s.stop = function (...a) { s.__stopAt = a[0] || 0; return sp.apply(this, a); };
      return s;
    };
    const o1 = AC.prototype.createOscillator, o2 = AC.prototype.createBufferSource;
    AC.prototype.createOscillator = function () { return tag(o1.call(this)); };
    AC.prototype.createBufferSource = function () { return tag(o2.call(this)); };
  }
  // what is sounding now: how many sources, how many of them are loops with no end, and who made the loops
  Q.snap = () => { const loops = [...Q.live].filter(isLoop); return { n: Q.live.size, loops: loops.length, who: [...new Set(loops.map(s => s.__who.split(' < ')[0]))] }; };
  const where = () => { const r = window.SPG && SPG.app && SPG.app.running(); return { t: Math.round(performance.now()), game: r ? r.game.id : null, paused: !!(r && r.paused), hidden: document.hidden, overlay: [...document.querySelectorAll('.overlay:not(.hidden)')].map(o => o.id).join(',') }; };
  // a fake speaking voice (50 ms a letter), so every line said is logged with where the child was
  if (window.speechSynthesis) {
    let cur = null;
    speechSynthesis.speak = u => { if (cur) clearTimeout(cur.tm); const c = cur = { u, tm: setTimeout(() => { if (cur === c) cur = null; u.onend && u.onend(); }, 300 + String(u.text).length * 50) }; Q.said.push(Object.assign({ text: u.text }, where())); };
    speechSynthesis.cancel = () => { if (cur) { clearTimeout(cur.tm); const u = cur.u; cur = null; u.onend && u.onend(); } };
  }
  addEventListener('DOMContentLoaded', () => { const iv = setInterval(() => { if (window.SPG && SPG.voice && SPG.voice.watch) { clearInterval(iv); SPG.voice.watch(list => { if (list) Q.lines.push(Object.assign({ line: list.map(x => (typeof x === 'string' ? x : x.say)).join('+') }, where())); }); } }, 20); });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = fn => raf(t => { Q.raf++; fn(t); });
  const si = window.setInterval.bind(window), ci = window.clearInterval.bind(window);
  window.setInterval = (fn, ms, ...a) => { const id = si(fn, ms, ...a); Q.intervals.set(id, ms + 'ms ' + who().split(' < ')[0]); return id; };
  window.clearInterval = id => { Q.intervals.delete(id); return ci(id); };
  // the tab going hidden and visible again
  let hid = false; Object.defineProperty(document, 'hidden', { configurable: true, get: () => hid }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hid ? 'hidden' : 'visible') });
  Q.hide = on => { hid = on; document.dispatchEvent(new Event('visibilitychange')); };
  // pointer events like fingers: each finger its own id
  Q.ptr = (type, id, x, y) => { const el = Q.capt[id] || document.elementFromPoint(x, y) || document.body; if (type === 'pointerdown') Q.capt[id] = el; if (type === 'pointerup' || type === 'pointercancel') delete Q.capt[id]; el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1, pointerType: 'touch', button: 0, buttons: type === 'pointerup' ? 0 : 1, width: 20, height: 20 })); if (type === 'pointerup') el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, detail: 1 })); };
  Q.capt = {};
  // NaN anywhere in the game object or the player's save, and arrays that are very long
  Q.scan = () => {
    const bad = [], big = [], seen = new Set();
    const walk = (o, path, d) => {
      if (o == null || d > 5 || seen.has(o)) return; if (typeof o !== 'object') return; seen.add(o);
      if (o instanceof Node || o instanceof CanvasRenderingContext2D || o instanceof Path2D || o instanceof ImageData || ArrayBuffer.isView(o) || o instanceof AudioNode || o instanceof Window) return;
      if (Array.isArray(o) && o.length > 400) big.push(path + '[' + o.length + ']');
      for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'number' && !Number.isFinite(v) && v !== Infinity && v !== -Infinity) bad.push(path + '.' + k); else if (v && typeof v === 'object') walk(v, path + '.' + k, d + 1); }
    };
    const r = SPG.app.running(); if (r) walk(r.inst, 'game', 0);
    walk(SPG.store.active && SPG.store.active.data, 'save', 0);
    return { bad: bad.slice(0, 8), big: big.slice(0, 8) };
  };
};

const ctx = await b.newContext({ viewport: { width: W, height: H } });
await ctx.addInitScript(() => { Element.prototype.requestFullscreen = function () { return Promise.resolve(); }; });
await ctx.addInitScript(INSTR);
const page = await ctx.newPage(); page.errs = [];
page.on('pageerror', e => page.errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') page.errs.push('console: ' + m.text()); });
await page.goto('http://localhost:' + process.env.PORT + '/index.html'); await page.waitForTimeout(500);
await login(page, { age: +process.env.AGE || 4 });
if (process.env.CPU) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU }); }
await page.evaluate(() => { SPG.store.active.stars = 500; SPG.store.save(); SPG.audio.unlock(); });   // enough stars for the shops
const wait = ms => page.waitForTimeout(ms);
const Q = (fn, ...a) => page.evaluate(fn, ...a);
const snap = () => Q(() => __qa.snap());
const ptr = (type, id, x, y) => Q(([t, i, x, y]) => __qa.ptr(t, i, x, y), [type, id, x, y]);
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const spot = () => { const v = page.viewportSize(); return [30 + rnd() * (v.width - 60), 70 + rnd() * (v.height - 90)]; };
const inGame = () => Q(() => !!SPG.app.running());
// screens inside a game get mashed on their own: the Hair Salon (in the Style Studio: the salon, then the first messy style) and the
// Pet Care close-up (the six grooming tools) and a Fish Tank visitor; whenever the mashing leaves them they are opened again
const SALON = 'Hair Salon', ZOOM = 'Pet Care close-up', VISIT = 'Fish Tank visitor';
const INSIDE = {
  [SALON]: ['Style Studio', () => { const g = SPG.app.running() && SPG.app.running().inst; if (!g || !g.openSalon) return; if (!g.salon) g.openSalon(); const s = g.salon; if (s && s.mode === 'pick' && s.cards.length) s.choose(s.cards[0]); }],
  [VISIT]: ['Fish Tank', () => { const g = SPG.app.running() && SPG.app.running().inst; if (g && g.startBoss && !g.boss && !g.shop) g.startBoss(); }],
  [ZOOM]: ['Pet Care', () => { const g = SPG.app.running() && SPG.app.running().inst; if (!g || !g.enterZoom || g.zoomOn) return; if (g.sleeping) g.wakeUp(); g.picking = false; g.tool = null; g.pet.moving = false; g.enterZoom(); }]
};
const inside = name => INSIDE[name] && Q(INSIDE[name][1]);
const open = async name => { await openGame(page, INSIDE[name] ? INSIDE[name][0] : name); if (INSIDE[name]) { await wait(300); await inside(name); } };
const back = async name => { if (!(await inGame())) { await Q(() => document.querySelectorAll('.overlay:not(.hidden) .btn.quiet, .sheet .btn.quiet').forEach(b => b.click())); await open(name); } else await inside(name); };
// one burst of toddler: fast taps all over (never the home button), sometimes with several fingers, drags that end in a cancel
async function mash(name, secs) {
  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < secs * 1000) {
    const r = rnd(), [x, y] = spot();
    if (r < .55) { await ptr('pointerdown', 1, x, y); await ptr('pointerup', 1, x, y); }
    else if (r < .7) {   // five fingers at once, moving, then lifting one by one (the last one cancelled)
      const f = [1, 2, 3, 4, 5].map(i => [i, ...spot()]);
      for (const [i, fx, fy] of f) await ptr('pointerdown', i, fx, fy);
      for (let k = 0; k < 4; k++) for (const [i, fx, fy] of f) await ptr('pointermove', i, fx + k * 12, fy + k * 9);
      for (const [i, fx, fy] of f) await ptr(i === 5 ? 'pointercancel' : 'pointerup', i, fx + 36, fy + 27);
    } else if (r < .9) {   // a wild drag that leaves the screen
      await ptr('pointerdown', 1, x, y); const v = page.viewportSize();
      for (let k = 0; k < 8; k++) await ptr('pointermove', 1, x + (rnd() - .5) * v.width, y + (rnd() - .5) * v.height);
      await ptr('pointermove', 1, -20, y); await ptr(rnd() < .5 ? 'pointerup' : 'pointercancel', 1, -20, y);
    } else { await ptr('pointerdown', 1, x, y); await wait(700); await ptr('pointerup', 1, x, y); }
    n++; if (n % 12 === 0) { await wait(30); await back(name); }
  }
}
const liveAfter = async (ms = 1600) => { await wait(ms); return snap(); };

for (const name of GAMES) {
  const g0 = page.errs.length, stars0 = await Q(() => SPG.store.active.stars);
  await Q(() => { __qa.lines.length = 0; __qa.said.length = 0; __qa.maxLive = 0; });
  await open(name); await wait(900);
  { const sc = await Q(() => __qa.scan()); if (sc.bad.length) fail(name, 'NaN before anything was touched: ' + sc.bad.join(', ')); }   // (a counter nobody set yet)
  // 1. mashing
  await mash(name, SECS);
  const peak = await Q(() => __qa.maxLive);
  if (name === SALON && !(await Q(() => { const g = SPG.app.running(); return !!(g && g.inst.salon); }))) fail(name, 'the salon was not open while mashing');
  if (name === ZOOM && !(await Q(() => { const g = SPG.app.running(); return !!(g && g.inst.zoomOn); }))) fail(name, 'the close-up was not open while mashing');
  if (peak > 90) fail(name, `${peak} sounds at once while mashing (a pile-up)`);
  // 2. every finger lifted: no loop may keep going
  for (const i of [1, 2, 3, 4, 5]) await ptr('pointercancel', i, 5, 5);
  let s = await liveAfter(5000); if (s.loops) fail(name, `a sound loop keeps going after every finger lifted: ${s.who.join(', ')}`);   // (a purr may fade out for a few seconds)
  // 3. a finger down and moving, then the screen turns (and turns into every phone and tablet size) while it is still down, then it lifts
  await back(name); { const [x, y] = spot(); await ptr('pointerdown', 1, x, y); for (let k = 0; k < 5; k++) await ptr('pointermove', 1, x + k * 10, y + k * 8);
    for (const [w, h] of [[H, W], [390, 844], [844, 390], [800, 1280], [1280, 800], [360, 640]]) { await page.setViewportSize({ width: w, height: h }); await wait(200); for (let k = 0; k < 3; k++) await ptr('pointermove', 1, w / 2 + k * 10, h / 2); }
    await ptr('pointerup', 1, 230, 330); await page.setViewportSize({ width: W, height: H }); await wait(300);
    const off = await Q(() => { const r = SPG.app.running(), cv = r && document.querySelector('#game-host > canvas'); return cv ? [cv.width, cv.height, innerWidth, innerHeight] : null; });
    if (off && (off[0] < off[2] * .5 || off[1] < off[3] * .5)) fail(name, 'the game did not resize back after the screen turned: ' + off.join(' ')); }
  // 4. the tab goes hidden in the middle of a held finger (and a sound), then comes back
  await back(name); { const [x, y] = spot(); await ptr('pointerdown', 1, x, y); for (let k = 0; k < 6; k++) await ptr('pointermove', 1, x + k * 14, y + k * 6); await Q(() => __qa.hide(true)); await wait(300); s = await snap();
    const said0 = await Q(() => __qa.lines.length); await wait(1500);
    const quietly = await Q(n => __qa.lines.slice(n), said0); if (quietly.length) fail(name, 'lines said while the tab was hidden: ' + quietly.map(l => l.line).join(', '));
    const hs = await snap(); if (hs.loops) fail(name, `a sound loop keeps going while the tab is hidden: ${hs.who.join(', ')}`);
    await ptr('pointerup', 1, x + 90, y + 40); await Q(() => __qa.hide(false)); await wait(300); }
  // 5. the grown-up gate opens while a finger is down
  await back(name); { const [x, y] = spot(); await ptr('pointerdown', 1, x, y); for (let k = 0; k < 6; k++) await ptr('pointermove', 1, x + k * 14, y + k * 6);
    await Q(() => SPG.app.askGate(() => {})); await wait(400); const n0 = await Q(() => __qa.lines.length);
    s = await liveAfter(1200); if (s.loops) fail(name, `a sound loop keeps going behind the grown-up gate: ${s.who.join(', ')}`);
    const behind = await Q(n => __qa.lines.slice(n).filter(l => l.game), n0); if (behind.length) fail(name, 'lines said behind the grown-up gate: ' + behind.map(l => l.line).join(', '));
    await ptr('pointerup', 1, x + 90, y + 40); await Q(() => document.getElementById('gate-back').click()); await wait(200);
    if (await Q(() => !document.getElementById('gate').classList.contains('hidden'))) await Q(() => SPG.safe.onBack()); await wait(300); }
  // 6. it still answers: mash a little more, then look for NaN and endless arrays
  await back(name); await mash(name, 1.5);
  const sc = await Q(() => __qa.scan()); if (sc.bad.length) fail(name, 'NaN in ' + sc.bad.join(', ')); if (sc.big.length) console.log('  (long arrays)', name, sc.big.join(', '));
  // 7. leave mid-action with the home button, then come back and leave ten times fast
  await back(name); { const [x, y] = spot(); await ptr('pointerdown', 1, x, y); await ptr('pointermove', 1, x + 30, y + 30); await Q(() => document.getElementById('btn-home').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9 }))); await ptr('pointerup', 1, x + 30, y + 30); }
  const left = await Q(() => __qa.lines.length);
  for (let k = 0; k < 10; k++) { await open(name); await wait(60 + k * 15); await Q(() => SPG.app.closeGame()); }
  await wait(2500);
  s = await snap(); if (s.loops) fail(name, `a sound loop keeps going after leaving the game: ${s.who.join(', ')}`);
  const after = await Q(n => __qa.lines.slice(n).filter(l => !l.game && !/^(player|pname)\//.test(l.line)), left); if (after.length) fail(name, 'lines said after leaving: ' + [...new Set(after.map(l => l.line))].join(', '));
  const r0 = await Q(() => __qa.raf); await wait(1000); const rps = await Q(n => __qa.raf - n, r0); if (rps > 5) fail(name, `${rps} animation frames a second on the menu after leaving (a loop left running)`);
  const iv = await Q(() => [...__qa.intervals.values()].filter(v => !/js\/app\.js|js\/core\.js|js\/sync\.js/.test(v))); if (iv.length) fail(name, 'intervals left running: ' + iv.join(', '));
  const stars = await Q(() => SPG.store.active.stars) - stars0;
  const lines = await Q(() => __qa.lines.length);
  console.log(`${page.errs.length > g0 ? 'ERR ' : 'ok  '}${name}: peak ${peak} sounds, ${lines} lines, +${stars} stars`);
  if (page.errs.length > g0) fail(name, page.errs.slice(g0, g0 + 3).join(' | '));
  await Q(() => { SPG.store.active.stars = 500; });
}
// ---- regressions: bugs this script found once, played straight at the cause (REG=0 skips them)
if (process.env.REG !== '0') {
  const reg = async (name, fn) => { const e0 = page.errs.length; await openGame(page, name); await wait(900); try { await fn(); } catch (e) { fail(name, 'regression check threw: ' + e.message); } if (page.errs.length > e0) fail(name, page.errs.slice(e0, e0 + 3).join(' | ')); await Q(() => SPG.app.closeGame()); await wait(400); };
  const said = (n, re) => Q(([n, re]) => __qa.lines.slice(n).filter(l => new RegExp(re).test(l.line)).length, [n, re]);
  const until = async (fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await Q(fn)) return true; await wait(150); } return false; };
  // Feeling Friends: the hug purrs while it lasts and stops after; a question nobody answers is said again only once
  await reg('Feeling Friends', async () => {
    await Q(() => { const g = SPG.app.running().inst; g.btns = [{ id: 'hug' }]; g.doHelp(g.btns[0]); });
    await wait(500); let s = await snap(); if (!s.loops) fail('Feeling Friends', 'the hug makes no purr');
    await Q(() => SPG.app.running().inst.finishFix()); s = await liveAfter(1500); if (s.loops) fail('Feeling Friends', 'the hug purr keeps going after the hug: ' + s.who.join(', '));
    await Q(() => SPG.app.closeGame()); await openGame(page, 'Feeling Friends');
    if (!(await until(() => SPG.feelingsGame.probe().phase === 'ask'))) { fail('Feeling Friends', 'the "How do I feel?" question never came'); return; }
    const n0 = await Q(() => __qa.lines.length);
    for (let k = 0; k < 3; k++) { await Q(() => { SPG.app.running().inst.idle = 11; }); await wait(3200); }   // (a line touched again while it is said is not restarted: wait it out)
    const nags = await said(n0, '^feel-how$'); if (nags > 1) fail('Feeling Friends', `the unanswered question was said ${nags} times`);
  });
  // Shape Builder: "How many ...?" is said again once, never every ten seconds
  await reg('Shape Builder', async () => {
    const n0 = await Q(() => __qa.lines.length);
    if (!(await Q(() => SPG.shapesGame.askCount()))) { fail('Shape Builder', 'no count question for this picture'); return; }
    for (let k = 0; k < 3; k++) { await Q(() => { SPG.shapesGame.idle = 11; }); await wait(3200); }
    const asks = await said(n0, '^shapes-count/'); if (asks > 2) fail('Shape Builder', `the count question was said ${asks} times`);
  });
  // Caterpillars: nobody touching sings the pattern again three times at most, not every nine seconds for ever
  await reg('Caterpillars', async () => {
    if (!(await until(() => SPG.app.running().inst.phase === 'pick'))) { fail('Caterpillars', 'the caterpillar never asked'); return; }
    const n = await Q(async () => { const g = SPG.app.running().inst, rd = g.read; let n = 0; g.read = function (...a) { n++; return rd.apply(this, a); }; for (let k = 0; k < 6; k++) { g.idle = 10; await new Promise(r => setTimeout(r, 150)); } g.read = rd; return n; });
    if (n > 3) fail('Caterpillars', `an untouched caterpillar sang ${n} times`);
  });
  // Coloring Book: Done on an empty page is no star (and no party); one bit of colour and it is
  await reg('Coloring Book', async () => {
    const r = await Q(() => {
      const g = SPG.app.running().inst, pics = g.bag.pics || {}, def = SPG.pictures.find(p => !pics[p.id]); g.open(def);
      const s0 = SPG.store.active.stars; g.finish(); const blank = [SPG.store.active.stars - s0, g.celebrating, g.done];
      g.ops.push([0, def.sections[0].id, 3]); g.finish(); const painted = [SPG.store.active.stars - s0, g.celebrating]; g.endCelebration();
      return { blank, painted };
    });
    if (r.blank[0] || r.blank[1] || r.blank[2]) fail('Coloring Book', 'Done on an empty page gave a star or a party: ' + JSON.stringify(r.blank));
    if (r.painted[0] !== 1 || !r.painted[1]) fail('Coloring Book', 'Done on a coloured page gave no star: ' + JSON.stringify(r.painted));
  });
  // Style Studio: dice, runway, tap, dice, runway, tap... is one star a minute, not one a second
  await reg('Style Studio', async () => {
    const got = await Q(() => { const g = SPG.app.running().inst, s0 = SPG.store.active.stars; g.bag.starT = 0; for (let k = 0; k < 4; k++) { g.surprise(); g.startShow(); g.endShow(); } return SPG.store.active.stars - s0; });
    if (got !== 1) fail('Style Studio', `four quick runway shows gave ${got} stars (one a minute)`);
  });
  // Pet Care: the purr stops a little after the finger lifts; a second finger sends held fruit back to the tray
  await reg('Pet Care', async () => {
    const ok = await Q(() => { const g = SPG.app.running().inst; if (g.sleeping) g.wakeUp(); g.pet.moving = false; g.enterZoom(); return g.zoomOn; });
    if (!ok) { fail('Pet Care', 'the close-up did not open'); return; }
    await wait(600);
    await Q(async () => { const g = SPG.app.running().inst, B = g.petBox(); g.press(B.cx, B.cy, 7); for (let k = 0; k < 20; k++) { g.hold.x = B.cx + Math.sin(k) * B.rx * .6; await new Promise(r => setTimeout(r, 40)); } });
    let s = await snap(); if (!s.loops) fail('Pet Care', 'stroking makes no purr');
    await Q(() => SPG.app.running().inst.letGo()); s = await liveAfter(6000); if (s.loops) fail('Pet Care', 'the purr keeps going after the finger lifted: ' + s.who.join(', '));
    const r = await Q(() => { const g = SPG.app.running().inst; g.leaveZoom(); if (g.tool !== 'food') g.chooseTool('food'); const f = g.foods[0]; g.press(f.x, f.y, 1); const held = g.hold && g.hold.f === f; g.press(g.w * .5, g.h * .1, 2); return { held, home: f.home }; });
    if (!r.held || !r.home) fail('Pet Care', 'a fruit picked up by one finger is left floating when a second finger touches: ' + JSON.stringify(r));
  });
  // Clay Corner: wild pulling and a very long rope never make a giant outline
  await reg('Clay Corner', async () => {
    const r = await Q(() => {
      const g = SPG.clayGame, B = g.board, X = f => B.x + B.s * f, Y = f => B.y + B.s * f; let sd = 5; const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      g.tool = 'clay'; g.ptr = 1; g.down(X(.5), Y(.5)); g.ptr = null; g.up();
      g.tool = 'pull'; for (let k = 0; k < 40; k++) { const o = g.objs.filter(q => q.t === 'p').pop(), c = o.cont[0][k % o.cont[0].length]; g.ptr = 1; g.down(X(c[0]), Y(c[1])); for (let j = 0; j < 12; j++) g.move(X(rn()), Y(rn())); g.ptr = null; g.up(); }
      g.tool = 'clay'; g.ptr = 1; g.down(X(.1), Y(.1)); for (let j = 0; j < 400; j++) g.move(X(.1 + .8 * (j % 2 ? rn() : 1 - rn())), Y(.1 + .8 * rn())); g.ptr = null; g.up();
      return { max: Math.max(...g.objs.filter(q => q.t === 'p').map(q => q.cont[0].length)), cap: SPG.clayKit.MAX_PTS, bytes: JSON.stringify(g.pack()).length };
    });
    if (r.max > r.cap) fail('Clay Corner', `an outline has ${r.max} points (most ${r.cap})`);
    if (r.bytes > 300000) fail('Clay Corner', `the creation saves as ${r.bytes} bytes`);
  });
}
stop(b); console.log(fails ? `STRESS-B: ${fails} problems` : 'STRESS-B OK'); process.exit(fails ? 1 : 0);
