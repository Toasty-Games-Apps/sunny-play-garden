// Stress test, part A: a toddler trying to break the hub, the gate and the first games (Letter Garden, Fruit Splash, Rain Bucket,
// Fire Rescue, Grow a Garden, Bunny Band, Puzzle Pond, Hide and Seek). Real multi-touch (five fingers through the Chrome touch
// emulation), 10-20 taps a second, drags that end in a cancel, leaving and coming back fast, turning the screen in the middle of a
// drag or an event, the tab hiding, the grown-up gate opening under a finger, and a 4x slower CPU.
// What it watches: page errors, NaN in the game's state, the game still answering, sounds still playing after a finger lifted or
// after leaving, one-shot sounds piling up, the output clipping, lines spoken after leaving or under an overlay, frames and
// timers left running after leaving, saved data growing, and stars that can be farmed by mashing.
// usage: node stress-a.mjs            (PART=hub,gate,rest,music,letters,fruit,rain,fire,garden,band,puzzle,hide,idle to pick parts; SECS, IDLE)
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8204';
const PARTS = (process.env.PART || 'hub,gate,rest,music,letters,fruit,rain,fire,garden,band,puzzle,hide,idle').split(',');
const b = await start({ args: ['--autoplay-policy=no-user-gesture-required'] });
let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); }, note = m => console.log('  ' + m);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- instrumentation, installed before the app loads
const INSTR = () => {
  const S = window.__qa = { live: 0, loops: 0, peak: 0, peakLoops: 0, made: 0, lines: [], raf: 0, iv: new Map(), maxLevel: 0, clips: 0 };
  const SI = window.setInterval, CI = window.clearInterval;
  const P = (window.BaseAudioContext || window.AudioContext).prototype;
  for (const m of ['createOscillator', 'createBufferSource']) {
    const orig = P[m];
    P[m] = function () {
      const n = orig.apply(this, arguments); S.made++;
      const st = n.start; let on = false, lp = false;
      n.start = function () { if (!on) { on = true; lp = !!n.loop; S.live++; if (lp) S.loops++; S.peak = Math.max(S.peak, S.live); S.peakLoops = Math.max(S.peakLoops, S.loops); } return st.apply(this, arguments); };
      n.addEventListener('ended', () => { if (on) { on = false; S.live--; if (lp) S.loops--; } });
      return n;
    };
  }
  // the output level: an analyser hears everything that is sent to the speakers
  const C = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest) {
    if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode) {
      const ctx = dest.context; if (!S.an || S.an.context !== ctx) { S.an = ctx.createAnalyser(); S.an.fftSize = 1024; S.buf = new Float32Array(1024); }
      C.call(this, S.an);
    }
    return C.apply(this, arguments);
  };
  SI(() => { if (!S.an) return; S.an.getFloatTimeDomainData(S.buf); let m = 0; for (let i = 0; i < S.buf.length; i++) { const v = Math.abs(S.buf[i]); if (v > m) m = v; } if (m > S.maxLevel) S.maxLevel = m; if (m > 1) S.clips++; }, 20);
  const R = window.requestAnimationFrame; window.requestAnimationFrame = function (f) { S.raf++; return R.call(window, f); };
  window.setInterval = function (f, ms, ...a) { const id = SI.call(window, f, ms, ...a); S.iv.set(id, ((new Error().stack || '').split('\n')[2] || '').trim()); return id; };
  window.clearInterval = function (id) { S.iv.delete(id); return CI.call(window, id); };
  // a fake speaking voice (600 ms a line), so nothing depends on the machine's voices
  const ss = window.speechSynthesis;
  if (ss) { ss.speak = u => { setTimeout(() => { u.onend && u.onend(); }, 600); }; ss.cancel = () => {}; }
};

async function page0(w = 390, h = 844, opts = {}) {
  const page = await newPage(b, w, h, { hasTouch: true, ...opts });
  await page.context().addInitScript(INSTR); await page.reload(); await page.waitForTimeout(500);
  page.cdp = await page.context().newCDPSession(page);
  return page;
}
async function ready(page, age = 4) {
  await login(page, { age });
  await page.evaluate(() => {
    const S = SPG.store.settings; S.sound = true; S.voice = true; S.builtinVoice = 'device'; S.voicePref = 'builtin'; S.audioHelp = true; SPG.store.saveSettings?.();
    const ov = () => ['break', 'gate', 'parent', 'studio', 'fs-resume', 'vintro'].filter(id => { const e = document.getElementById(id); return e && !e.classList.contains('hidden'); });
    SPG.voice.watch(list => { if (list) __qa.lines.push({ t: performance.now(), list: list.map(x => typeof x === 'string' ? x : '{say}'), scr: document.body.dataset.screen, game: SPG.app.running()?.game.id || null, ov: ov(), hidden: document.hidden }); });
    SPG.audio.unlock();
  });
}
// ---- fingers (Chrome touch emulation: real pointer ids, pointerType touch)
const T = (page, type, pts = []) => page.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: Math.round(p[0]), y: Math.round(p[1]), id: p[2] ?? i, radiusX: 1, radiusY: 1, force: 1 })) });
const tap = async (page, pts) => { await T(page, 'touchStart', pts); await T(page, 'touchEnd'); };   // (touchEnd lifts the points it lists, or all of them)
async function drag(page, from, to, steps = 8, { cancel = false, mid = null } = {}) {
  await T(page, 'touchStart', from);
  for (let s = 1; s <= steps; s++) { if (mid && s === (steps >> 1)) await mid(); await T(page, 'touchMove', from.map((p, i) => [p[0] + (to[i][0] - p[0]) * s / steps, p[1] + (to[i][1] - p[1]) * s / steps, p[2] ?? i])); }
  await T(page, cancel ? 'touchCancel' : 'touchEnd');
}
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const vp = page => page.viewportSize();
const somewhere = (page, n = 1, pad = 80) => { const { width: w, height: h } = vp(page); return Array.from({ length: n }, (_, i) => [pad + rnd() * (w - pad * 2), pad + rnd() * (h - pad * 2), i]); };

// ---- what the page looks like now
const snap = page => page.evaluate(() => {
  const r = SPG.app.running(), inst = r && r.inst, nan = [], big = [];
  const skip = v => v instanceof Node || v instanceof CanvasRenderingContext2D || (typeof AudioNode !== 'undefined' && v instanceof AudioNode) || v instanceof Path2D || (typeof OffscreenCanvas !== 'undefined' && v instanceof OffscreenCanvas) || v instanceof ImageData || v instanceof Window;
  const seen = new Set();
  const walk = (o, path, d) => {
    if (!o || typeof o !== 'object' || seen.has(o) || d > 6 || nan.length > 8 || skip(o)) return; seen.add(o);
    if (Array.isArray(o) && o.length > 600) big.push(path + '[' + o.length + ']');
    const keys = Array.isArray(o) ? o.slice(0, 120).map((_, i) => i) : o instanceof Map || o instanceof Set ? [] : Object.keys(o);
    if (o instanceof Set || o instanceof Map) { if (o.size > 600) big.push(path + '{' + o.size + '}'); return; }
    for (const k of keys) { let v; try { v = o[k]; } catch (_) { continue; } if (typeof v === 'number' && Number.isNaN(v)) nan.push(path + '.' + k); else if (v && typeof v === 'object') walk(v, path + '.' + k, d + 1); }
  };
  if (inst) walk(inst, 'inst', 0);
  walk(SPG.store.active, 'player', 0);
  return { game: r ? r.game.id : null, scr: document.body.dataset.screen, stars: SPG.store.active ? SPG.store.active.stars : 0, nan, big, live: __qa.live, loops: __qa.loops, raf: __qa.raf, iv: __qa.iv.size, ivs: [...__qa.iv.values()], ls: (localStorage.getItem('spg.v1') || '').length, now: performance.now(), level: __qa.maxLevel, clips: __qa.clips, peak: __qa.peak };
});
const resetPeak = page => page.evaluate(() => { __qa.peak = __qa.live; __qa.peakLoops = __qa.loops; __qa.maxLevel = 0; __qa.clips = 0; });
// the game must still answer: a frame is drawn and its loop runs
const alive = page => page.evaluate(() => new Promise(res => { const r0 = __qa.raf; setTimeout(() => res(__qa.raf - r0), 400); }));
async function checkGame(page, label) {
  const s = await snap(page);
  if (s.nan.length) fail(`${label}: NaN in state: ${s.nan.join(', ')}`);
  if (s.big.length) fail(`${label}: very long lists: ${s.big.join(', ')}`);
  if (s.game && !(await page.evaluate(() => SPG.app.running().game.dom)) && (await alive(page)) < 3) fail(`${label}: the game stopped drawing`);
  if (page.errs.length) { fail(`${label}: ${page.errs.slice(0, 3).join(' | ')}`); page.errs.length = 0; }
  return s;
}
// leaving: within a moment no sound loops on, no frames, no timers, nothing is said
async function checkLeft(page, label, base) {
  const t0 = await page.evaluate(() => performance.now());
  await page.waitForTimeout(1600);
  const s = await snap(page), r0 = s.raf; await page.waitForTimeout(1000); const s2 = await snap(page);
  if (s2.loops > (base.loops || 0)) fail(`${label}: ${s2.loops} looping sounds still on after leaving`);
  if (s2.live > (base.live || 0) + 2) fail(`${label}: ${s2.live} sounds still playing 2.6 s after leaving`);
  if (s2.raf - r0 > (base.rafPerSec || 0) + 6) fail(`${label}: ${s2.raf - r0} animation frames a second on the menu after leaving (menu alone: ${base.rafPerSec})`);
  if (s2.iv > base.iv) fail(`${label}: ${s2.iv - base.iv} timers left running: ${s2.ivs.slice(base.iv).join(' ; ')}`);
  const said = await page.evaluate(t => __qa.lines.filter(l => l.t > t + 30).map(l => l.list.join('+') + '@' + l.scr), t0);
  if (said.length) fail(`${label}: said after leaving: ${said.join(', ')}`);
  if (page.errs.length) { fail(`${label}: ${page.errs.slice(0, 3).join(' | ')}`); page.errs.length = 0; }
}
async function hubBase(page) {
  await page.waitForTimeout(1200);
  const s = await snap(page); await page.waitForTimeout(1000); const s2 = await snap(page);
  return { live: s2.live, loops: s2.loops, iv: s2.iv, rafPerSec: s2.raf - s.raf };
}
const SIZES = [[390, 844], [844, 390], [800, 1280], [1280, 800], [360, 640]];

// a toddler on any game: five-finger mashing, wild drags with cancels, a turn mid-drag, hiding mid-drag, the gate under a finger,
// pausing, home and back ten times fast. Returns the stars it gave.
async function toddler(page, name, { secs = 6, label = name } = {}) {
  const base = await hubBase(page);
  await openGame(page, name); await page.waitForTimeout(700);
  const s0 = await snap(page); if (s0.game == null) { fail(`${label}: did not open`); return 0; }
  await resetPeak(page);
  // 1. mashing: five fingers, ~15 taps a second
  let t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) { await tap(page, somewhere(page, 1 + Math.floor(rnd() * 5))); await sleep(40 + rnd() * 30); if (!(await page.evaluate(() => !!SPG.app.running()))) { await closeSheets(page); await openGame(page, name); } }
  let s = await checkGame(page, label + ' mashing');
  note(`${label}: mashing ${secs}s -> peak ${s.peak} sounds at once, output max ${s.level.toFixed(2)}${s.clips ? ` (clipped ${s.clips}x)` : ''}, stars +${s.stars - s0.stars}`);
  // 2. drags with many fingers, some ending in a cancel or leaving the screen
  t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    const n = 1 + Math.floor(rnd() * 5), from = somewhere(page, n), { width: w, height: h } = vp(page);
    const to = from.map(() => rnd() < .2 ? [rnd() < .5 ? -30 : w + 30, rnd() * h] : [20 + rnd() * (w - 40), 20 + rnd() * (h - 40)]);
    await drag(page, from, to, 6 + Math.floor(rnd() * 8), { cancel: rnd() < .3 });
    if (!(await page.evaluate(() => !!SPG.app.running()))) { await closeSheets(page); await openGame(page, name); }
  }
  s = await checkGame(page, label + ' drags');
  // 3. turning the screen in the middle of a drag, through every size
  for (const [w, h] of SIZES) {
    const from = somewhere(page, 2), to = from.map(p => [p[0] * .5, p[1] * .5]);
    await drag(page, from, to, 8, { mid: async () => { await page.setViewportSize({ width: w, height: h }); await sleep(120); } });
    await sleep(200);
  }
  await page.setViewportSize({ width: 390, height: 844 }); await sleep(300);
  s = await checkGame(page, label + ' turning mid-drag');
  // 4. the tab hides with a finger down; the gate opens with a finger down
  await T(page, 'touchStart', somewhere(page, 1));
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(1000);   // (a sound that was on fades out over half a second)
  const hid = await page.evaluate(() => ({ loops: __qa.loops, paused: SPG.app.running()?.paused }));
  await page.evaluate(() => { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  await T(page, 'touchMove', somewhere(page, 1)); await T(page, 'touchEnd');
  if (hid.loops) fail(`${label}: ${hid.loops} looping sounds on while the tab was hidden`);
  await T(page, 'touchStart', somewhere(page, 1));
  await page.evaluate(() => SPG.app.askGate(() => {}));
  await sleep(300);
  const tg = await page.evaluate(() => performance.now());
  await T(page, 'touchMove', somewhere(page, 1)); await sleep(1000);
  const g = await page.evaluate(t => ({ loops: __qa.loops, paused: SPG.app.running()?.paused, said: __qa.lines.filter(l => l.t > t).map(l => l.list.join('+')) }), tg);
  await T(page, 'touchEnd'); await page.evaluate(() => document.getElementById('gate-back').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }))); await sleep(300);
  if (!g.paused) fail(`${label}: the game was not paused under the gate`);
  if (g.loops) fail(`${label}: ${g.loops} looping sounds on under the gate`);
  if (g.said.length) fail(`${label}: said under the gate: ${g.said.join(', ')}`);
  s = await checkGame(page, label + ' hidden/gate');
  // 5. home and back ten times fast
  for (let i = 0; i < 10; i++) { await page.evaluate(() => SPG.app.closeGame()); await sleep(30 + rnd() * 60); await openGame(page, name); await sleep(rnd() * 150); await tap(page, somewhere(page, 2)); }
  s = await checkGame(page, label + ' in and out');
  // after all that, the voice is not jammed: an instruction starts at once, and another one a moment later
  const jam = await page.evaluate(async () => {
    const V = SPG.voice, k = Object.keys(V.LINES).filter(k => V.roleOf(k) === 2 && !k.startsWith('num/')).slice(0, 2), n = __qa.lines.length, sleep = ms => new Promise(r => setTimeout(r, ms));
    V.say(k[0]); await sleep(300); const a = __qa.lines.slice(n).map(l => l.list.join('+')); await sleep(1500); V.say(k[1]); await sleep(300);
    return { k, said: __qa.lines.slice(n).map(l => l.list.join('+')), a };
  });
  if (!jam.a.includes(jam.k[0]) || !jam.said.includes(jam.k[1])) fail(`${label}: the voice is jammed after the toddler round (asked ${jam.k.join(', ')}, started ${jam.said.join(', ')})`);
  const stars = s.stars - s0.stars;
  await page.evaluate(() => SPG.app.closeGame());
  await checkLeft(page, label + ' leaving', base);
  return stars;
}
// a sheet a random touch opened inside a game (a confirm, a picker) is closed with its quiet button; the gate with its back button
// a grown-up answers the gate's sum
async function gateAnswer(page) {
  const ans = await page.evaluate(() => { const q = document.getElementById('gate-q').textContent; for (let a = 0; a <= 20; a++) for (let c = 0; c <= 20; c++) if (SPG.t('{a} plus {b}', { a: SPG.i18n.numWord(a), b: SPG.i18n.numWord(c) }) === q) return String(a + c); return null; });
  for (const d of ans) await page.evaluate(d => [...document.querySelectorAll('#numpad button')].find(x => x.textContent === d).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), d);
  await page.evaluate(() => document.querySelector('#numpad button.ok').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(400);
}
async function closeSheets(page) { await page.evaluate(() => { const g = document.getElementById('gate'); if (!g.classList.contains('hidden')) document.getElementById('gate-back').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })); document.querySelectorAll('#game-host .btn.quiet').forEach(b => { if (b.offsetWidth) b.click(); }); }); await sleep(150); }
const inst = (page, fn, arg) => page.evaluate(([f, a]) => (0, eval)(f)(SPG.app.running().inst, a), [fn.toString(), arg]);

/* ================================================================== the hub */
if (PARTS.includes('hub')) {
  console.log('-- hub');
  const page = await page0(390, 844); await ready(page);
  const base = await hubBase(page);
  // background taps: 20 a second, five fingers: the picture changes, the chime does not pile up
  await resetPeak(page);
  const bg0 = await page.evaluate(() => document.querySelector('.backdrop').dataset.bg);
  let t0 = Date.now(), n = 0;
  while (Date.now() - t0 < 3000) { const pts = [[4 + rnd() * 6, 380 + rnd() * 60, 0]]; await tap(page, pts); n++; await sleep(45); }
  let s = await snap(page);
  note(`hub background: ${n} taps -> peak ${s.peak} sounds at once, output max ${s.level.toFixed(2)}, backdrop ${bg0} -> ${await page.evaluate(() => document.querySelector('.backdrop').dataset.bg)}`);
  if (s.peak > 40) fail(`hub background mashing: ${s.peak} sounds at once`);
  // arrows and dots mashed, swipes, a turn in the middle of a swipe
  const pageNo = () => page.evaluate(() => { const st = document.querySelector('#hub-games .pages'); return st ? Math.round(st.scrollLeft / Math.max(1, st.clientWidth)) : -1; });
  const arrows = await page.evaluate(() => [...document.querySelectorAll('#hub .pg-arrow')].filter(e => e.offsetWidth).map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
  for (let i = 0; i < 40; i++) { const a = arrows[i % Math.max(1, arrows.length)]; if (a) await tap(page, [[a[0], a[1], i % 5]]); await sleep(50); }
  const dots = await page.evaluate(() => [...document.querySelectorAll('#hub .pg-dot')].filter(e => e.offsetWidth).map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
  for (let i = 0; i < 30; i++) { const d = dots[Math.floor(rnd() * dots.length)]; if (d) await tap(page, [[d[0], d[1], 0]]); await sleep(50); }
  for (let i = 0; i < 12; i++) { const y = 300 + rnd() * 200, x0 = rnd() < .5 ? 330 : 60; await drag(page, [[x0, y, 0]], [[390 - x0, y, 0]], 6, { cancel: i % 4 === 3 }); await sleep(60); }
  await drag(page, [[330, 400, 0]], [[60, 400, 0]], 8, { mid: async () => { await page.setViewportSize({ width: 844, height: 390 }); await sleep(150); } });
  await sleep(500); await page.setViewportSize({ width: 390, height: 844 }); await sleep(500);
  s = await snap(page);
  if (s.scr !== 'hub') { fail(`hub: swiping and mashing arrows left the menu (${s.scr}${s.game ? ' ' + s.game : ''})`); await page.evaluate(() => SPG.app.closeGame()); await sleep(400); }
  const strip = await page.evaluate(() => { const st = document.querySelector('#hub-games .pages'); return st ? { left: st.scrollLeft, w: st.clientWidth, sw: st.scrollWidth } : null; });
  if (strip && Math.abs(strip.left / strip.w - Math.round(strip.left / strip.w)) > .02) fail(`hub: the page strip stopped between pages (${JSON.stringify(strip)})`);
  if (page.errs.length) { fail('hub: ' + page.errs.slice(0, 3).join(' | ')); page.errs.length = 0; }
  // a swipe that starts on a card never opens a game; a held card brings the gate (with the finger still down)
  const card = await page.evaluate(() => { const c = [...document.querySelectorAll('#hub-games .card')].find(c => { const r = c.getBoundingClientRect(); return r.left > 0 && r.right < innerWidth && r.width; }); const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await drag(page, [[card[0], card[1], 0]], [[card[0] - 120, card[1] + 10, 0]], 6); await sleep(400);
  if ((await snap(page)).game) { fail('hub: a swipe that began on a card opened a game'); await page.evaluate(() => SPG.app.closeGame()); }
  if ((await snap(page)).scr !== 'hub') fail(`hub: a swipe on a card left the screen ${(await snap(page)).scr}`);
  await T(page, 'touchStart', [[card[0], card[1], 0]]); await sleep(2400);
  const gateUp = await page.evaluate(() => !document.getElementById('gate').classList.contains('hidden'));
  await T(page, 'touchEnd'); await sleep(300);
  if (!gateUp) note('hub: holding a card for 2.4 s did not bring the gate');
  const afterHold = await snap(page);
  if (afterHold.game) fail('hub: lifting the finger after the hold opened a game behind the gate');
  // the grown-up answers: the apps jiggle; two fingers drag two apps at once, one lifts, the other keeps its app
  if (gateUp) {
    await gateAnswer(page); await sleep(400);
    if (!(await page.evaluate(() => document.body.classList.contains('hub-editing')))) fail('hub: the right answer did not start rearranging');
    const cs = await page.evaluate(() => [...document.querySelectorAll('#hub-games .card')].filter(c => { const r = c.getBoundingClientRect(); return r.left > 0 && r.right < innerWidth && r.width; }).slice(0, 4).map(c => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
    const A = [cs[0][0], cs[0][1], 1], B = [cs[3][0], cs[3][1], 2];
    await T(page, 'touchStart', [A]); await sleep(80); await T(page, 'touchMove', [[A[0] + 20, A[1] + 10, 1]]); await sleep(50);
    await T(page, 'touchStart', [[A[0] + 20, A[1] + 10, 1], B]); await sleep(50);
    await T(page, 'touchMove', [[A[0] + 30, A[1] + 15, 1], [B[0] - 30, B[1] - 20, 2]]); await sleep(50);
    await T(page, 'touchEnd', [B]); await sleep(50);
    const mid = await page.evaluate(() => ({ ghosts: document.querySelectorAll('.card-ghost').length }));
    await T(page, 'touchMove', [[cs[1][0], cs[1][1], 1]]); await sleep(100); await T(page, 'touchMove', [[cs[2][0], cs[2][1], 1]]); await sleep(100);
    await T(page, 'touchEnd'); await sleep(300);
    const r = await page.evaluate(() => { const ids = SPG.games.filter(g => !g.shop).map(g => g.id).sort(), ord = (SPG.store.settings.hubOrder || []).slice().sort(); return { ghosts: document.querySelectorAll('.card-ghost').length, perm: ord.length === 0 || ord.join() === ids.join() }; });
    if (mid.ghosts !== 1) fail(`hub editing: ${mid.ghosts} apps were being dragged at once after a second finger lifted (one expected)`);
    if (r.ghosts) fail(`hub editing: ${r.ghosts} dragged apps were left on the screen`);
    if (!r.perm) fail('hub editing: the app order lost or doubled an app');
    await page.evaluate(() => document.getElementById('hub-edit-reset')?.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })));
    await page.evaluate(() => document.getElementById('hub-edit-done')?.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }))); await sleep(300);
  }
  await closeSheets(page); await sleep(300);
  if ((await snap(page)).scr !== 'hub') fail(`hub: after holding a card the screen is ${(await snap(page)).scr}`);
  // the Pet Shop storefront tapped five times fast
  const shop = await page.evaluate(() => { const e = document.querySelector('#hub-shop .shopfront'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  if (shop) { for (let i = 0; i < 5; i++) { await tap(page, [[shop[0], shop[1], i]]); await sleep(40); } await sleep(600); s = await snap(page); if (s.game !== 'pets') fail(`hub: the Pet Shop did not open (${s.scr} ${s.game})`); await page.evaluate(() => SPG.app.closeGame()); await sleep(400); }
  // two cards touched at once: one game, never two (on the first page, which is full)
  await page.evaluate(() => { const st = document.querySelector('#hub-games .pages'); st.scrollLeft = 0; }); await sleep(400);
  const two = await page.evaluate(() => [...document.querySelectorAll('#hub-games .card')].filter(c => { const r = c.getBoundingClientRect(); return r.left > 0 && r.right < innerWidth && r.width; }).slice(0, 2).map(c => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
  if (two.length < 2) { fail(`hub: no whole cards on the screen (${(await snap(page)).scr}, ${JSON.stringify(await page.evaluate(() => { const st = document.querySelector('#hub-games .pages'); return { left: st.scrollLeft, w: st.clientWidth, cards: [...document.querySelectorAll('#hub-games .card')].map(c => c.getBoundingClientRect().left | 0).slice(0, 12), edit: document.body.classList.contains('hub-editing') }; }))})`); await page.screenshot({ path: SP + '/stress-hub-nocards.png' }); } else await tap(page, two.map((p, i) => [p[0], p[1], i])); await sleep(700);
  s = await snap(page); const hosts = await page.evaluate(() => document.getElementById('game-host').children.length);
  if (s.game && hosts > 3) fail(`hub: two cards at once left ${hosts} things in the game screen`);
  await page.evaluate(() => SPG.app.closeGame());
  await checkLeft(page, 'hub', base);
  await page.context().close();
}

/* ================================================================== the gate, grown-ups, rest screen, night, players */
if (PARTS.includes('gate')) {
  console.log('-- gate and grown-ups');
  const page = await page0(390, 844); await ready(page);
  // wrong answers mashed: the gate stays usable, a right answer still opens it
  await page.evaluate(() => SPG.app.askGate(() => { window.__opened = (window.__opened || 0) + 1; }));
  await sleep(300);
  const sheet = await page.evaluate(() => { const g = document.getElementById('gate'); return { title: g.querySelector('h2, .gate-title, h1')?.textContent || '', btns: [...g.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, b.textContent.trim()]; }) }; });
  note(`gate: "${sheet.title}" with ${sheet.btns.length} buttons`);
  for (let i = 0; i < 40; i++) { const bt = sheet.btns[Math.floor(rnd() * sheet.btns.length)]; if (/cancel|close|back/i.test(bt[2])) continue; await tap(page, [[bt[0], bt[1], i % 5]]); await sleep(50); }
  if (page.errs.length) { fail('gate mashing: ' + page.errs.slice(0, 3).join(' | ')); page.errs.length = 0; }
  // a minute of mashing the number pad (ten keys a second) must not open the gate; a grown-up's right answer still does afterwards
  const mash = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); let opened = 0, presses = 0, rested = 0; const t0 = performance.now();
    window.__opened = 0;
    while (performance.now() - t0 < 60000) {
      if (document.getElementById('gate').classList.contains('hidden')) SPG.app.askGate(() => { opened++; });
      const keys = [...document.querySelectorAll('#numpad button')], k = keys[Math.floor(Math.random() * keys.length)];
      if (document.getElementById('numpad').classList.contains('resting')) rested++;
      else { k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); presses++; }
      await sleep(100);
    }
    return { opened: opened + window.__opened, presses, rested };
  });
  note(`gate: a minute of mashing the number pad -> opened ${mash.opened}x (${mash.presses} presses, the pad rested ${mash.rested / 10 | 0} s)`);
  if (mash.opened) fail(`gate: mashing the number pad for a minute opened the gate ${mash.opened} times`);
  await page.waitForFunction(() => !document.getElementById('numpad').classList.contains('resting'), null, { timeout: 40000 });
  await page.evaluate(() => { if (document.getElementById('gate').classList.contains('hidden')) SPG.app.askGate(() => { window.__opened++; }); });
  await gateAnswer(page);
  if (!(await page.evaluate(() => window.__opened))) fail('gate: the right answer did not open the gate after the pad rested');
  await closeSheets(page);
  // every grown-ups page at two sizes, opened and closed fast
  const pages = await page.evaluate(() => SPG.grownups.pages().map(p => p.id || p));
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const id of pages) { await page.evaluate(i => SPG.grownups.open(i), id); await sleep(120); if (await page.$('#vintro:not(.hidden)')) await page.click('#vintro .btn.quiet'); }
  }
  if (page.errs.length) { fail('grown-ups pages: ' + page.errs.slice(0, 3).join(' | ')); page.errs.length = 0; }
  await page.evaluate(() => { document.querySelectorAll('#parent .close, #parent [data-close], #parent .btn.quiet').forEach(b => b.click?.()); });
  await page.setViewportSize({ width: 390, height: 844 }); await sleep(300);
  await page.context().close();
}

/* ================================================================== the rest screen under a finger, mashed, hidden, then a grown-up */
if (PARTS.includes('rest')) {
  console.log('-- rest screen');
  const page = await page0(390, 844); await ready(page);
  await openGame(page, 'Fire Rescue'); await sleep(1500);
  const { width: w, height: h } = vp(page);
  await T(page, 'touchStart', [[w * .6, h * .3, 1]]); await sleep(400);
  const t0 = await page.evaluate(() => { const S = SPG.store.settings; S.timer = 15; S.playLog.sec = 15 * 60; return performance.now(); });
  await sleep(2000);
  let r = await page.evaluate(t => ({ brk: !document.getElementById('break').classList.contains('hidden'), paused: SPG.app.running()?.paused, loops: __qa.loops, said: __qa.lines.filter(l => l.t > t).map(l => l.list.join('+')) }), t0);
  await T(page, 'touchEnd');
  if (!r.brk) fail('rest: the rest screen did not come');
  if (!r.paused) fail('rest: the game under the rest screen was not paused');
  if (r.loops) fail(`rest: ${r.loops} looping sounds (the hose) still on under the rest screen`);
  if (r.said.join() !== 'break-time') fail(`rest: said ${r.said.join(', ')} (expected only break-time)`);
  // mashed with five fingers: nothing happens and nothing is said
  const t1 = await page.evaluate(() => performance.now());
  let tt = Date.now(); while (Date.now() - tt < 3000) { await tap(page, somewhere(page, 1 + Math.floor(rnd() * 5), 20).map(p => [p[0], p[1] * .7, p[2]])); await sleep(50); }
  r = await page.evaluate(t => ({ brk: !document.getElementById('break').classList.contains('hidden'), gate: !document.getElementById('gate').classList.contains('hidden'), said: __qa.lines.filter(l => l.t > t).map(l => l.list.join('+')) }), t1);
  if (!r.brk) fail('rest: mashing closed the rest screen');
  if (r.said.length) fail(`rest: mashing the rest screen said ${r.said.join(', ')}`);
  // the lullaby stops while the tab is hidden
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(4000); const m0 = await page.evaluate(() => __qa.live); await sleep(2000); const made = await page.evaluate(() => __qa.live);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  if (made > 2) fail(`rest: ${made} sounds playing while the tab was hidden`);
  // a grown-up: the gate, the right answer, the panel, no limit, back to the game
  await page.evaluate(() => document.getElementById('break-adult').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }))); await sleep(300);
  await gateAnswer(page);
  if (await page.$('#vintro:not(.hidden)')) await page.click('#vintro .btn.quiet');
  await page.evaluate(() => { SPG.store.settings.timer = 0; document.getElementById('parent-close').click(); }); await sleep(600);
  r = await page.evaluate(() => ({ brk: !document.getElementById('break').classList.contains('hidden'), parent: !document.getElementById('parent').classList.contains('hidden'), game: SPG.app.running()?.game.id, paused: SPG.app.running()?.paused }));
  if (r.brk || r.parent || r.game !== 'fire' || r.paused) fail(`rest: after the grown-up the game did not come back (${JSON.stringify(r)})`);
  await checkGame(page, 'rest');
  // night mode switched on and off while playing
  for (const n of ['on', 'off', 'on', 'off']) { await page.evaluate(m => { SPG.store.settings.night = m; SPG.night.apply ? SPG.night.apply() : SPG.night.sync?.(); }, n); await tap(page, somewhere(page, 2)); await sleep(300); }
  await checkGame(page, 'night mode');
  // switching player in the middle of a game (the who screen), and the setup sheet mashed
  await page.evaluate(() => SPG.app.show('who')); await sleep(400);
  if (await page.evaluate(() => !!SPG.app.running())) fail('rest: the game kept running behind the who screen');
  await checkLeft(page, 'who screen', { live: 0, loops: 0, iv: await page.evaluate(() => __qa.iv.size), rafPerSec: 60 });
  // a new player: the gate, then the setup sheet's name buttons mashed with five fingers (each name is said, but never a jumble)
  // (the who screen's tiles are built by the hub's "who" button, as a child reaches it)
  await page.evaluate(() => { SPG.app.show('hub'); document.getElementById('hub-who').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })); }); await sleep(400);
  await page.evaluate(() => document.querySelector('.who-tile.add').click()); await sleep(300); await gateAnswer(page); await sleep(300);
  if (await page.evaluate(() => document.getElementById('setup').classList.contains('hidden'))) fail('setup: the setup sheet did not open after the gate');
  else {
    const btns = await page.evaluate(() => [...document.querySelectorAll('#setup .name-btn')].filter(b => b.offsetWidth).map(b => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }).filter(p => p[1] > 0 && p[1] < innerHeight));
    const t2 = await page.evaluate(() => performance.now());
    for (let i = 0; i < 40; i++) { await tap(page, Array.from({ length: 1 + (i % 5) }, (_, k) => { const q = btns[Math.floor(rnd() * btns.length)]; return [q[0], q[1], k]; })); await sleep(50); }
    await sleep(2500);
    const said = await page.evaluate(t => __qa.lines.filter(l => l.t > t).length, t2);
    note(`setup: 40 mashes on the name buttons -> ${said} names said`);
    if (said > 8) fail(`setup: mashing the name buttons said ${said} names (a jumble)`);
    if (page.errs.length) { fail('setup: ' + page.errs.slice(0, 3).join(' | ')); page.errs.length = 0; }
    await page.evaluate(() => document.getElementById('setup-cancel').click()); await sleep(300);
  }
  await page.context().close();
}

/* ================================================================== music: it steps back for the voice and comes back, after spam too */
if (PARTS.includes('music')) {
  console.log('-- music');
  const page = await page0(390, 844); await ready(page);
  await page.evaluate(() => { SPG.store.settings.music = true; SPG.music.sync(); });
  const level = async ms => { await page.evaluate(() => { __qa.maxLevel = 0; }); await sleep(ms); return page.evaluate(() => __qa.maxLevel); };
  await sleep(2000); const before = await level(5000);
  // a flood of lines (names, numbers, instructions), then quiet
  await page.evaluate(async () => { const V = SPG.voice, ks = Object.keys(V.LINES), sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 40; i++) { V.say(ks[(i * 37) % ks.length]); await sleep(60); } });
  await sleep(6000); const after = await level(5000);
  note(`music: loudest before the voice ${before.toFixed(3)}, after a flood of lines ${after.toFixed(3)}`);
  if (before > .01 && after < before * .5) fail(`music: still stepped back after the voice stopped (${before.toFixed(3)} -> ${after.toFixed(3)})`);
  // into a game, mashing, out again: the menu music plays again
  await openGame(page, 'Bunny Band'); for (let i = 0; i < 30; i++) { await tap(page, somewhere(page, 3)); await sleep(40); } await page.evaluate(() => SPG.app.closeGame());
  await sleep(4000); const made0 = await page.evaluate(() => __qa.made); await sleep(3000);
  if ((await page.evaluate(() => __qa.made)) - made0 < 2) fail('music: the menu music did not come back after a game');
  if (page.errs.length) fail('music: ' + page.errs.slice(0, 3).join(' | '));
  await page.context().close();
}

/* ================================================================== game by game */
// where a point of a game canvas is on the screen
const onScreen = (page, pts) => page.evaluate(ps => { const cv = document.querySelector('#game-host canvas'), r = cv.getBoundingClientRect(), I = SPG.app.running().inst; return ps.map(p => [r.left + p.x * r.width / I.w, r.top + p.y * r.height / I.h]); }, pts);
const SPECIAL = {
  // Bunny Band: five fingers on the friends 20 times a second; a recording mashed full in a moment loops as one big chord
  async band(page) {
    await openGame(page, 'Bunny Band'); await sleep(500);
    const P = await page.evaluate(() => { const I = SPG.app.running().inst; return { pos: I.pos.map(p => ({ x: p.x, y: p.y - I.s * .45 })), rec: I.btn.rec }; });
    const pos = await onScreen(page, P.pos), [rec] = await onScreen(page, [P.rec]);
    await resetPeak(page);
    let t0 = Date.now(); while (Date.now() - t0 < 3000) { await tap(page, pos.slice(0, 5).map((p, i) => [p[0], p[1], i])); await sleep(30); }
    let s = await snap(page);
    note(`band: five fingers on the friends -> peak ${s.peak} sounds at once, output max ${s.level.toFixed(2)} (clipped ${s.clips}x)`);
    if (s.clips) fail(`band: five fingers mashing clipped the sound ${s.clips} times (max ${s.level.toFixed(2)})`);
    if (s.peak > 64) fail(`band: ${s.peak} sounds at once from mashing`);
    await sleep(1500);
    await tap(page, [rec]); await sleep(200);
    for (let k = 0; k < 4; k++) { await tap(page, pos.map((p, i) => [p[0], p[1], i])); await sleep(20); }
    await sleep(300); const L = await page.evaluate(() => { const I = SPG.app.running().inst; return I.loop ? { n: I.loop.ev.length, len: I.loop.len } : null; });
    await sleep(800); await resetPeak(page); await sleep(4500);
    s = await snap(page);
    note(`band: a mashed recording (${L ? L.n + ' notes, ' + L.len.toFixed(1) + ' s' : 'none'}) loops -> peak ${s.peak} sounds at once, output max ${s.level.toFixed(2)} (clipped ${s.clips}x)`);
    if (s.clips) fail(`band: the mashed recording clips every time it loops (max ${s.level.toFixed(2)})`);
    await tap(page, [rec]); await sleep(300);
    if (await page.evaluate(() => !!SPG.app.running().inst.loop)) fail('band: the loop did not stop');
    await checkGame(page, 'band special');
    await page.evaluate(() => SPG.app.closeGame()); await sleep(500);
  },
  // Fire Rescue: the hose runs while any finger is down (a second finger lifting does not turn it off), and stops with the last one
  async fire(page) {
    await openGame(page, 'Fire Rescue'); await sleep(800);
    const { width: w, height: h } = vp(page);
    const A = [w * .6, h * .3, 1], B = [w * .7, h * .35, 2];
    await T(page, 'touchStart', [A]); await sleep(300);
    await T(page, 'touchStart', [A, B]); await sleep(300);
    await T(page, 'touchEnd', [A]); await sleep(50);   // finger A lifts, B stays down (CDP: the points listed in touchEnd lift)
    await T(page, 'touchMove', [[B[0] - 30, B[1] + 20, 2]]); await sleep(400);
    const mid = await page.evaluate(() => { const I = SPG.app.running().inst; return { down: I.aim.down, hose: !!I.hose, loops: __qa.loops }; });
    if (!mid.down || !mid.hose) fail(`fire: one finger still on the screen but the water stopped (${JSON.stringify(mid)})`);
    await T(page, 'touchEnd'); await sleep(900);
    const end = await page.evaluate(() => { const I = SPG.app.running().inst; return { down: I.aim.down, hose: !!I.hose, loops: __qa.loops }; });
    if (end.down || end.hose || end.loops) fail(`fire: the water kept running after the last finger lifted (${JSON.stringify(end)})`);
    // cancelled touches and a pause in the middle of spraying
    await T(page, 'touchStart', [A, B]); await sleep(300); await T(page, 'touchCancel'); await sleep(900);
    if (await page.evaluate(() => __qa.loops)) fail('fire: the water kept running after a cancelled touch');
    await T(page, 'touchStart', [A]); await sleep(300);
    await page.evaluate(() => { const r = SPG.app.running(); r.inst.pause(); }); await sleep(900);
    if (await page.evaluate(() => __qa.loops)) fail('fire: the water kept running while paused');
    await page.evaluate(() => { const r = SPG.app.running(); r.inst.resume(); }); await T(page, 'touchEnd'); await sleep(300);
    await checkGame(page, 'fire special');
    await page.evaluate(() => SPG.app.closeGame()); await sleep(500);
  },
  // Rain Bucket: the bucket keeps following a finger that is still down; every event survives the screen turning and mashing,
  // and its dinosaurs and pets stay on the screen
  async rain(page) {
    await openGame(page, 'Rain Bucket'); await sleep(700);
    const { width: w, height: h } = vp(page);
    const A = [w * .2, h * .6, 1], B = [w * .8, h * .6, 2];
    await T(page, 'touchStart', [A]); await sleep(100); await T(page, 'touchStart', [A, B]); await sleep(100); await T(page, 'touchEnd', [B]); await sleep(50);
    await T(page, 'touchMove', [[w * .3, h * .6, 1]]); await sleep(50); await T(page, 'touchMove', [[w * .35, h * .6, 1]]); await sleep(500);
    const bx = await page.evaluate(() => SPG.app.running().inst.bucket.tx);
    await T(page, 'touchEnd');
    if (Math.abs(bx - w * .35) > 30) fail(`rain: the bucket stopped following the finger still down after another lifted (bucket at ${bx | 0}, finger at ${w * .35 | 0})`);
    const offSide = () => page.evaluate(() => { const I = SPG.app.running().inst, M = I.met, P = I.pets, out = []; if (M) for (const d of M.dinos) if (d.x < -10 || d.x > I.w + 10) out.push('dino ' + (d.x | 0) + ' of ' + (I.w | 0)); if (P) for (const q of P.list) if (q.state === 'fall' && (q.x < -10 || q.x > I.w + 10)) out.push('pet ' + (q.x | 0)); return out; });
    for (const ev of ['startStorm', 'startMeteors', 'startPets']) {
      await page.evaluate(e => { const I = SPG.app.running().inst; I.card = null; I.cool = 0; I[e](); if (I.pets) I.pets.total = 4; }, ev);
      await sleep(ev === 'startPets' ? 4000 : 2500);
      for (const [vw, vh] of [[1280, 800], [390, 844], [844, 390], [360, 640], [800, 1280]]) {
        await page.setViewportSize({ width: vw, height: vh }); await sleep(250);
        await drag(page, somewhere(page, 3), somewhere(page, 3), 6, { cancel: rnd() < .3 });
        const off = await offSide(); if (off.length) fail(`rain ${ev}: after turning to ${vw}x${vh}: ${off.join(', ')}`);
      }
      for (let i = 0; i < 20; i++) { await tap(page, somewhere(page, 1 + Math.floor(rnd() * 5))); await sleep(40); }
      await checkGame(page, 'rain ' + ev);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    // the events finish by themselves (the pets one with four pets)
    const t0 = Date.now(); while (Date.now() - t0 < 60000 && (await page.evaluate(() => { const I = SPG.app.running().inst; return !!(I.storm || I.met || I.pets || I.card || I.queue.length); }))) { await tap(page, somewhere(page, 1)); await sleep(400); }
    if (await page.evaluate(() => { const I = SPG.app.running().inst; return !!(I.storm || I.met || I.pets); })) fail('rain: an event never ended');
    await checkGame(page, 'rain events');
    await page.evaluate(() => SPG.app.closeGame()); await sleep(500);
  },
  // Letter Garden: every activity mashed with five fingers; flipping flash cards as fast as possible gives no stars
  async letters(page) {
    await openGame(page, 'Letter Garden'); await sleep(500);
    const center = sel => page.evaluate(q => { const e = document.querySelector(q); if (!e || !e.offsetWidth) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
    const stars = () => page.evaluate(() => SPG.store.active.stars);
    for (let m = 0; m < 8; m++) {
      const tile = await center(`.lg-mode.m${m}`); if (!tile) continue;
      await tap(page, [[tile[0], tile[1], 0]]); await sleep(400);
      const s0 = await stars();
      if (m === 1) {   // flash cards: the next arrow, 15 times a second
        const nx = await center('.lg-arrow.right');
        for (let i = 0; i < 45; i++) { await tap(page, [[nx[0], nx[1], i % 5]]); await sleep(35); }
        const d = (await stars()) - s0;
        note(`letters flash cards: 45 flips in ~3 s -> +${d} stars`);
        if (d > 1) fail(`letters: flipping flash cards as fast as possible gave ${d} stars`);
        await sleep(2200);
      }
      const t0 = Date.now(); while (Date.now() - t0 < 3000) { await tap(page, somewhere(page, 1 + Math.floor(rnd() * 5), 60).map(p => [p[0], Math.max(p[1], 130), p[2]])); await sleep(50); if (!(await page.evaluate(() => !!SPG.app.running()))) await openGame(page, 'Letter Garden'); }
      // a drag across a tracing canvas that ends in a cancel, and a turn of the screen
      await drag(page, somewhere(page, 2), somewhere(page, 2), 8, { cancel: true });
      await page.setViewportSize({ width: 844, height: 390 }); await sleep(200); await tap(page, somewhere(page, 3)); await page.setViewportSize({ width: 390, height: 844 }); await sleep(200);
      note(`letters activity ${m}: mashing -> +${(await stars()) - s0} stars`);
      await checkGame(page, 'letters activity ' + m);
      await page.evaluate(() => { const I = SPG.app.running()?.inst; I && I.menu(); }); await sleep(200);
    }
    await page.evaluate(() => SPG.app.closeGame()); await sleep(500);
  },
  // Hide and Seek: walking with a finger held down keeps going when another finger taps and lifts
  async hide(page) {
    await openGame(page, 'Hide and Seek'); await sleep(900);
    const { width: w, height: h } = vp(page);
    const A = [w * .5, h * .55, 1];
    await T(page, 'touchStart', [A]); for (let i = 1; i <= 4; i++) { await T(page, 'touchMove', [[A[0] + i * 12, A[1] + i * 8, 1]]); await sleep(40); }
    await T(page, 'touchStart', [[A[0] + 48, A[1] + 32, 1], [w * .3, h * .3, 2]]); await sleep(60); await T(page, 'touchEnd', [[w * .3, h * .3, 2]]); await sleep(60);
    await T(page, 'touchMove', [[w * .8, h * .8, 1]]); await sleep(300);
    const r = await page.evaluate(() => { const I = SPG.app.running().inst; return { steer: !!I.steer, x: I.steer && Math.round(I.steer.x), y: I.steer && Math.round(I.steer.y) }; });
    await T(page, 'touchEnd'); await sleep(200);
    if (!r.steer || Math.abs(r.x - w * .8) > 6) fail(`hide: walking stopped following the finger still down after another finger tapped (${JSON.stringify(r)})`);
    if (await page.evaluate(() => !!SPG.app.running().inst.steer)) fail('hide: still steering after every finger lifted');
    await checkGame(page, 'hide special');
    await page.evaluate(() => SPG.app.closeGame()); await sleep(500);
  },
};

/* ================================================================== the games */
const GAMES = { letters: 'Letter Garden', fruit: 'Fruit Splash', rain: 'Rain Bucket', fire: 'Fire Rescue', garden: 'Grow a Garden', band: 'Bunny Band', puzzle: 'Puzzle Pond', hide: 'Hide and Seek' };
for (const [id, name] of Object.entries(GAMES)) {
  if (!PARTS.includes(id)) continue;
  console.log('-- ' + name);
  const page = await page0(390, 844); await ready(page);
  if (SPECIAL[id]) await SPECIAL[id](page);
  const stars = await toddler(page, name, { secs: +process.env.SECS || 5 });
  note(`${name}: toddler round gave ${stars} stars`);
  await page.context().close();
}

/* ================================================================== idling (and a 4x slower CPU): nothing piles up, nobody nags, no stars */
if (PARTS.includes('idle')) {
  console.log('-- idling with a 4x slower CPU');
  const page = await page0(800, 1280); await ready(page);
  await page.cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const IDLE = +process.env.IDLE || 45;
  for (const name of Object.values(GAMES)) {
    const base = await hubBase(page);
    await openGame(page, name); await sleep(400); await tap(page, somewhere(page, 1)); await sleep(300);
    const s0 = await snap(page), lines0 = await page.evaluate(() => __qa.lines.length);
    await resetPeak(page);
    // one touch half way, as if she came back for a moment
    await sleep(IDLE * 500); await tap(page, somewhere(page, 1)); await sleep(IDLE * 500);
    const s = await checkGame(page, name + ' idle');
    const said = await page.evaluate(n => __qa.lines.slice(n).map(l => l.list.join('+')), lines0);
    const fps = (await alive(page)) / .4;
    note(`${name}: idle ${IDLE}s -> stars +${s.stars - s0.stars}, ${said.length} lines (${[...new Set(said)].slice(0, 6).join(', ')}), peak ${s.peak} sounds, output max ${s.level.toFixed(2)}${s.clips ? ` (clipped ${s.clips}x)` : ''}, saved data ${s0.ls} -> ${s.ls}, ~${fps | 0} fps`);
    if (s.clips) fail(`${name}: the sound clipped ${s.clips} times while idling (max ${s.level.toFixed(2)})`);
    if (s.peak > 30) fail(`${name}: ${s.peak} sounds at once while nobody was playing`);
    if (s.stars - s0.stars > 0 && name === 'Fire Rescue') fail(`${name}: idling gave ${s.stars - s0.stars} stars`);
    if (said.length > IDLE / 6) fail(`${name}: ${said.length} lines in ${IDLE}s of idling (nagging)`);
    if (s.ls - s0.ls > 4000) fail(`${name}: saved data grew by ${s.ls - s0.ls} characters while idling`);
    await page.evaluate(() => SPG.app.closeGame());
    await checkLeft(page, name + ' after idling', base);
  }
  await page.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.context().close();
}

stop(b); console.log(bad ? `STRESS A: ${bad} PROBLEMS` : 'STRESS A OK'); process.exit(bad ? 1 : 0);
