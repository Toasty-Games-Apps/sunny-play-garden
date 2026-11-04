// The iPhone and iPad checks, run inside the real app on the simulator (ios-app/test/README.md). Each line printed is
// "ok  <what>", "FAIL <what>: <why>" or "note <what>: <value>" (a fact worth reporting that is not a pass or fail).
//   1. the app: native platform, secure context, crypto and compression for the backup, recorder formats, plugins, no service worker
//   2. the window: the web view fills the window, CSS safe areas match the native ones, the hub and a game stay inside them,
//      buttons are big enough, game canvases are sharp (backing store = shown size x pixel density, up to 2x)
//   3. five fingers at once in Fruit Splash
//   4. turning the device keeps the hub page, a painting in the Coloring Book and a recipe half way through in the kitchen
//   5. sent to the background and back (the Mac switches to the Settings app): same game, nothing reloaded, sound running
//   6. a phone call (audio interruption) ends: the sound comes back
//   7. voices: Sprout clips decode, letter names and sounds use them, the phone's voice speaks, voices per language
//   8. recording (a fake microphone): the microphone is not touched until a grown-up records, then record, save, play back
//   9. photos: add-only permission, a picture saved to Photos; the backup file; the grown-up gate and the privacy policy
//  10. the optional cloud backup against a local worker (only in a build made with SPG_TEST_API): create, upload voices
import { newPage, login, openGame, touches, mouse } from './lib.js';
const T = window.SPG_TEST, C = window.Capacitor, PL = C.Plugins;
const wait = ms => new Promise(r => setTimeout(r, ms));
let bad = 0; const out = T.extra = { checks: {}, notes: {} };
const say = (tag, what, detail) => console.log(`${tag} ${what}${detail === undefined ? '' : ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))}`);
const ok = (cond, what, detail) => { say(cond ? 'ok  ' : 'FAIL', what, cond ? undefined : detail); out.checks[what] = !!cond; if (!cond) bad++; return !!cond; };
const note = (what, v) => { say('note', what, v); out.notes[what] = v; };
const step = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' (threw)', T.err(e)); } };
const r4 = v => Math.round(v * 4) / 4;
const rectOf = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
// the CSS safe area the game lays itself out with (styles.css --ios-*: WebKit's env() or the app's own numbers, whichever is larger)
function cssSafe(raw) {
  const v4 = raw ? 'env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)' : 'var(--ios-t) var(--ios-r) var(--ios-b) var(--ios-l)';
  const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:' + v4;
  document.body.append(d); const s = getComputedStyle(d), v = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat); d.remove(); return v;
}
const inside = (r, s, slack = 1) => r.x >= s[3] - slack && r.y >= s[0] - slack && r.r <= innerWidth - s[1] + slack && r.b <= innerHeight - s[2] + slack;
const press = el => { const r = el.getBoundingClientRect(); return mouse.click(r.left + r.width / 2, r.top + r.height / 2); };
const until = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(120); } return null; };
const turnTo = async to => { const r = await T.turn(to); await wait(500); return r; };
const otherWay = () => innerWidth > innerHeight ? 'portrait' : 'landscape';
const startShape = innerWidth > innerHeight ? 'landscape' : 'portrait';
// canvases inside the game: the drawing buffer must match the size on screen times the pixel density games use (no blur)
function canvasSharpness() {
  const want = Math.min(devicePixelRatio, 2), list = [];
  for (const cv of document.querySelectorAll('#game-host canvas')) {
    const r = cv.getBoundingClientRect(); if (r.width < 120 || r.height < 120 || /cb-fx/.test(cv.className)) continue;   // the confetti layer is drawn at 1x on purpose
    list.push({ cls: cv.className || cv.parentElement.className, k: +(cv.width / r.width).toFixed(2), want });
  }
  return list;
}

const page = await newPage();
// a new install starts on the new-player sheet: it must sit inside the safe area too
await step('setup', async () => { const sh = document.querySelector('#setup:not(.hidden) .sheet'); if (!sh) { note('new-player sheet', 'not shown'); return; } const r = rectOf(sh), s = cssSafe(); ok(inside(r, s, 2), 'the new-player sheet is inside the safe area', { r, s }); await T.shot('setup'); });
await login(page, { age: 4 });

/* ------------------------------------------------------------ 1. the app */
await step('app', async () => {
  ok(C.isNativePlatform() && C.getPlatform() === 'ios', 'runs as the native iOS app', C.getPlatform());
  ok(SPG.native.ios && document.documentElement.classList.contains('ios'), 'the game knows it is in the iOS app');
  ok(location.protocol === 'capacitor:' && location.host === 'localhost', 'served from capacitor://localhost', location.href);
  ok(window.isSecureContext, 'secure context (needed for crypto and the recorder)');
  ok(!!(crypto.subtle && crypto.getRandomValues), 'Web Crypto available');
  ok(typeof CompressionStream === 'function' && typeof DecompressionStream === 'function', 'compression streams available');
  ok(!!window.indexedDB, 'IndexedDB available');
  ok(!navigator.serviceWorker || !navigator.serviceWorker.controller, 'no service worker in the app');
  ok(!window.SPG.signs && !document.querySelector('script[src*="sign"]'), 'sign language is not in this build');
  ok(!document.querySelector('script[src*="signvideo"]'), 'no camera sign videos in this build');
  const mimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].filter(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  ok(!!window.MediaRecorder && mimes.length > 0, 'the recorder has a format', mimes); note('recorder formats', mimes);
  for (const p of ['App', 'Filesystem', 'Share', 'TextToSpeech', 'NativeBiometric', 'SproutPhotos', 'SproutView', 'SproutTest']) ok(C.isPluginAvailable(p), 'plugin ' + p);
  ok(!C.isPluginAvailable('Media') && !C.isPluginAvailable('SproutWidget'), 'no Android-only plugins');
  ok(T.gum === 0, 'the microphone was not asked for at start', T.gum);
  note('version', SPG.version); note('user agent', navigator.userAgent); note('audio session (web)', navigator.audioSession ? navigator.audioSession.type : 'none');
  // the crypto the backup uses: PBKDF2 768 bits, AES-GCM, HMAC, gzip (the same calls as js/sync.js)
  const enc = new TextEncoder(), base = await crypto.subtle.importKey('raw', enc.encode('spg1:TESTCODE'), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('little-sprout-park/backup/v1'), iterations: 120000 }, base, 768));
  const key = await crypto.subtle.importKey('raw', bits.slice(32, 64), 'AES-GCM', false, ['encrypt', 'decrypt']), mac = await crypto.subtle.importKey('raw', bits.slice(64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const gz = new Uint8Array(await new Response(new Blob([enc.encode('hello '.repeat(200))]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, gz);
  const back = new TextDecoder().decode(await new Response(new Blob([new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct))]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', mac, enc.encode('clip:x/y')));
  ok(bits.length === 96 && back === 'hello '.repeat(200) && sig.length === 32, 'backup encryption works (PBKDF2, AES-GCM, HMAC, gzip)');
});

/* ------------------------------------------------------------ 2. the window */
const info0 = await T.info(); note('device', info0);
await step('window', async () => {
  const i = info0 || {}; const win = i.window || [innerWidth, innerHeight];
  ok(Math.abs(innerWidth - win[0]) <= 1 && Math.abs(innerHeight - win[1]) <= 1, 'the web view fills the window', { page: [innerWidth, innerHeight], window: win });
  const s = cssSafe(), ns = (i.safe || [0, 0, 0, 0]).map(r4);
  ok(s.every((v, k) => Math.abs(v - ns[k]) <= 1), 'CSS safe areas match the system', { css: s, native: ns });
  note('WebKit env() safe area', cssSafe(true));
  ok(document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1, 'the hub does not scroll the page');
  // the cards on the page being looked at, and the grown-ups button, are on screen and out of the system areas
  const cards = [...document.querySelectorAll('#hub-games .card')].map(rectOf).filter(r => r.x > -2 && r.r < innerWidth + 2);
  ok(cards.length > 0 && cards.every(r => inside(r, s, 2)), 'hub cards are inside the safe area', cards.length);
  ok(cards.every(r => r.w >= 60 && r.h >= 60), 'hub cards are big enough to touch', cards.map(r => Math.round(r.w)).slice(0, 3));
  note('hub cards on a page', cards.length);
  const lock = rectOf(document.getElementById('hub-lock')); ok(inside(lock, s) && lock.w >= 40, 'the grown-ups button is reachable', lock);
  await T.shot('hub');
  await openGame(page, 'Fruit Splash'); await wait(800);
  const host = rectOf(document.getElementById('game-host'));
  ok(Math.abs(host.x - s[3]) <= 1 && Math.abs(host.y - s[0]) <= 1 && Math.abs(host.r - (innerWidth - s[1])) <= 1 && Math.abs(host.b - (innerHeight - s[2])) <= 1, 'the game fills the safe area exactly', { host, safe: s });
  const home = rectOf(document.getElementById('btn-home')); ok(inside(home, s) && home.w >= 44 && home.h >= 44, 'the home button is inside the safe area and at least 44 pt', home);
  const sharp = canvasSharpness(); ok(sharp.length > 0 && sharp.every(c => Math.abs(c.k - c.want) <= .03), 'game canvases are sharp (drawn at the screen density, up to 2x)', sharp);
  await T.shot('fruit');
});

/* ------------------------------------------------------------ 3. five fingers at once */
await step('multi-touch', async () => {
  const g = SPG.app.running().inst, before = g.bag.total;
  g.fruits.length = 0; g.spawnIn = 99; g.starIn = 999;
  const cv = g.canvas.getBoundingClientRect(), xs = [.14, .32, .5, .68, .86];
  xs.forEach((fx, i) => g.fruits.push({ x: g.w * fx, y: g.h * .5, vx: 0, vy: 0, r: Math.min(g.w, g.h) * .07, type: i % 4, rotation: 0, vr: 0, wow: 0, blink: 9 }));
  await wait(60);
  await touches(xs.map(fx => [cv.left + cv.width * fx, cv.top + cv.height * .3, cv.left + cv.width * fx, cv.top + cv.height * .7]), 10);
  await wait(500);
  ok(g.bag.total - before >= 5, 'five fingers slice five fruits at once', { sliced: g.bag.total - before });
  SPG.app.closeGame(); await wait(500);
});

/* ------------------------------------------------------------ 4. turning the device */
await step('rotation', async () => {
  // the hub: the page being looked at stays the page shown
  const dots = [...document.querySelectorAll('#hub-games .pg-dot')];
  if (dots.length > 1) {
    dots[dots.length - 1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch' })); await wait(600);
    // the page turn is a smooth scroll, slow on a simulator: wait until the last dot is lit and the strip has stopped moving
    const strip = document.querySelector('#hub-games .pages');
    for (let i = 0, last = -1; i < 40; i++) { const x = strip.scrollLeft; if (dots[dots.length - 1].classList.contains('on') && x === last) break; last = x; await wait(150); }
    const seen = () => [...document.querySelectorAll('#hub-games .card')].filter(c => { const r = c.getBoundingClientRect(); return r.left >= -2 && r.right <= innerWidth + 2 && r.width > 0; }).map(c => c.getAttribute('aria-label'));
    const before = seen(); const r = await turnTo(otherWay()); if (r && r.error) note('rotation error', r.error);
    const after = seen();
    ok(before.length && after.includes(before[0]), 'turning keeps the hub page', { before: before.slice(0, 3), after: after.slice(0, 3), size: [innerWidth, innerHeight] });
    const s = cssSafe(); ok([...document.querySelectorAll('#hub-games .card')].map(rectOf).filter(q => q.x > -2 && q.r < innerWidth + 2).every(q => inside(q, s, 2)), 'hub cards inside the safe area after turning', s);
    await T.shot('hub-turned');
    await turnTo(startShape);
    ok(seen().includes(before[0]), 'turning back keeps the hub page', seen().slice(0, 3));
    dots[0] && document.querySelectorAll('#hub-games .pg-dot')[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch' })); await wait(800);
  } else note('hub pages', 1);
  // the Coloring Book: a picture with paint on it, turned: same game, same picture, same paint, a sharp canvas
  await openGame(page, 'Coloring Book'); await wait(600);
  let g = SPG.app.running().inst; g.open(SPG.pictures[4]); await wait(600);
  const pc = g.paintCv.getBoundingClientRect(); await mouse.click(pc.left + pc.width * .5, pc.top + pc.height * .45); await wait(300);
  await mouse.click(pc.left + pc.width * .2, pc.top + pc.height * .2); await wait(300);
  const ops = g.ops.length, pic = g.cur.id, inst = g;
  ok(ops >= 1, 'a tap paints in the Coloring Book', ops);
  await turnTo(otherWay()); await wait(500);
  g = SPG.app.running() && SPG.app.running().inst;
  ok(g === inst && g.cur && g.cur.id === pic && g.ops.length === ops, 'turning keeps the painting', { same: g === inst, pic: g && g.cur && g.cur.id, ops: g && g.ops.length });
  const sharp = canvasSharpness(); ok(sharp.every(c => Math.abs(c.k - c.want) <= .03), 'the Coloring Book is sharp after turning', sharp);
  const s2 = cssSafe(), tools = [...document.querySelectorAll('#game-host button')].map(rectOf).filter(q => q.w > 0);
  ok(tools.length && tools.every(q => inside(q, s2, 2)), 'Coloring Book buttons inside the safe area after turning', tools.filter(q => !inside(q, s2, 2)).slice(0, 3));
  await T.shot('color-turned');
  await turnTo(startShape); g.saveNow && g.saveNow(true); SPG.app.closeGame(); await wait(500);
  out.pic = pic;
  // the kitchen: a recipe half way through stays on the same step
  await openGame(page, 'Sprout Kitchen'); await wait(800);
  const K = () => SPG.cookGame.probe();
  const kr = SPG.cookGame.canvas.getBoundingClientRect(), at = (x, y) => mouse.click(kr.left + x, kr.top + y);
  let m = K().menu.find(x => x.tab === 'sweets') || K().menu.find(x => x.tab); await at(m.x, m.y); await wait(400);
  m = K().menu.find(x => x.id === 'pancake') || K().menu.find(x => x.id); await at(m.x, m.y); await wait(1200);
  if (K().screen === 'intro') { await at(kr.width / 2, kr.height / 2); await wait(1200); }
  await until(() => K().screen === 'cook' && !K().trans);
  const st0 = K(); await turnTo(otherWay()); await wait(600); const st1 = K();
  ok(st1.screen === 'cook' && st1.idx === st0.idx && st1.step === st0.step, 'turning keeps the recipe step', { before: [st0.step, st0.idx], after: [st1.screen, st1.step, st1.idx] });
  const cvR = SPG.cookGame.canvas.getBoundingClientRect();
  ok(st1.tray.every(t => t.x >= 0 && t.y >= 0 && t.x <= cvR.width && t.y <= cvR.height), 'kitchen tray inside the screen after turning', st1.tray.slice(0, 3));
  await T.shot('kitchen-turned');
  await turnTo(startShape); SPG.app.closeGame(); await wait(500);
});

/* ------------------------------------------------------------ 4b. other window sizes */
// The window is resized by the test plugin (not by folding or Stage Manager): the iPhone Duo's two displays, a small iPhone, a short
// wide window and the smallest phone, as far as they fit on this screen. At each size: the open game and its painting are kept, the
// game area and its buttons sit inside the safe area, the canvases stay sharp, the hub page is kept, and a touch still lands on the
// thing under the finger.
await step('window sizes', async () => {
  const full = [innerWidth, innerHeight];
  const sizes = [[466, 678, 'duo-outer'], [669, 951, 'duo-inner'], [375, 667, 'small-iphone'], [667, 375, 'short-wide'], [320, 568, 'smallest']]
    .filter(([w, h]) => w <= full[0] && h <= full[1] && !(Math.abs(w - full[0]) <= 1 && Math.abs(h - full[1]) <= 1));
  note('window sizes tried', sizes.map(z => z[2]));
  if (!sizes.length) return;
  if (!PL.SproutTest.resize) { ok(false, 'the test plugin can resize the window'); return; }
  await openGame(page, 'Coloring Book'); await wait(600);
  let g = SPG.app.running().inst; g.open(SPG.pictures[6]); await wait(600);
  let pc = g.paintCv.getBoundingClientRect(); await mouse.click(pc.left + pc.width * .5, pc.top + pc.height * .5); await wait(300);
  const inst = g, ops = g.ops.length, pic = g.cur.id;
  for (const [w, h, label] of sizes) {
    const r = await T.resize(w, h);
    if (!ok(Math.abs(innerWidth - w) <= 1 && Math.abs(innerHeight - h) <= 1, `the page takes the window size (${label})`, { want: [w, h], got: [innerWidth, innerHeight], native: r && (r.window || r.error) })) continue;
    g = SPG.app.running() && SPG.app.running().inst;
    ok(g === inst && g.cur && g.cur.id === pic && g.ops.length === ops, `the painting is kept (${label})`, { same: g === inst, ops: g && g.ops.length });
    const s = cssSafe(), host = rectOf(document.getElementById('game-host'));
    ok(inside(host, s, 1) && host.w > 0, `the game area is inside the safe area (${label})`, { host, s });
    const btns = [...document.querySelectorAll('#game-host button')].filter(b => b.getBoundingClientRect().width > 0);
    const tools = btns.map(rectOf), big = btns.filter(b => !b.classList.contains('cb-sw')).map(rectOf), sw = btns.filter(b => b.classList.contains('cb-sw')).map(rectOf);
    ok(tools.length && tools.every(q => inside(q, s, 2)), `Coloring Book buttons are reachable (${label})`, tools.filter(q => !inside(q, s, 2)).slice(0, 3));
    // tool buttons stay big; the 24 colour swatches share the width (8 to a row), so on a 320 pt window they are smaller
    ok(big.every(q => q.w >= 40 && q.h >= 40), `Coloring Book tools are big enough (${label})`, big.filter(q => q.w < 40 || q.h < 40).slice(0, 3));
    ok(sw.every(q => q.w >= 32 && q.h >= 32), `colour swatches are big enough (${label})`, sw.filter(q => q.w < 32).slice(0, 3));
    note(`colour swatch size (${label})`, Math.round(Math.min(...sw.map(q => q.w))));
    const sharp = canvasSharpness(); ok(sharp.length && sharp.every(c => Math.abs(c.k - c.want) <= .03), `the Coloring Book is sharp (${label})`, sharp);
    // a tap paints where the finger is (one more operation)
    pc = g.paintCv.getBoundingClientRect(); const n0 = g.ops.length; await mouse.click(pc.left + pc.width * .3, pc.top + pc.height * .3); await wait(300);
    ok(g.ops.length === n0 + 1, `a tap still paints (${label})`, g.ops.length - n0);
    if (g.ops.length > n0) g.undo ? g.undo() : g.ops.pop();
    await T.shot('size-' + label);
  }
  await T.resize(0, 0);
  ok(Math.abs(innerWidth - full[0]) <= 1 && Math.abs(innerHeight - full[1]) <= 1, 'the window is whole again', [innerWidth, innerHeight]);
  g.saveNow && g.saveNow(true); SPG.app.closeGame(); await wait(500);
  // the hub at each size, and a finger in Fruit Splash landing on the fruit under it
  for (const [w, h, label] of sizes) {
    await T.resize(w, h); if (Math.abs(innerWidth - w) > 1) continue;
    const s = cssSafe(), cards = [...document.querySelectorAll('#hub-games .card')].map(rectOf).filter(q => q.x > -2 && q.r < innerWidth + 2);
    ok(cards.length > 0 && cards.every(q => inside(q, s, 2) && q.w >= 60), `hub cards fit and are big enough (${label})`, { n: cards.length, w: cards.map(q => Math.round(q.w)).slice(0, 3) });
    note(`hub cards on a page (${label})`, cards.length);
    ok(document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1, `the hub does not scroll the page (${label})`);
    await T.shot('hub-' + label);
    await openGame(page, 'Fruit Splash'); await wait(800);
    const f = SPG.app.running().inst, before = f.bag.total; f.fruits.length = 0; f.spawnIn = 99; f.starIn = 999;
    f.fruits.push({ x: f.w * .5, y: f.h * .5, vx: 0, vy: 0, r: Math.min(f.w, f.h) * .07, type: 1, rotation: 0, vr: 0, wow: 0, blink: 9 });
    const cv = f.canvas.getBoundingClientRect(); await wait(60);
    await touches([[cv.left + cv.width * .3, cv.top + cv.height * .5, cv.left + cv.width * .7, cv.top + cv.height * .5]], 10); await wait(400);
    ok(f.bag.total - before >= 1, `a swipe slices the fruit under the finger (${label})`, f.bag.total - before);
    SPG.app.closeGame(); await wait(500);
  }
  await T.resize(0, 0);
});

/* ------------------------------------------------------------ 5. background and back */
await step('background', async () => {
  await openGame(page, 'Bunny Band'); await wait(800);
  window.__notReloaded = 1; const inst = SPG.app.running().inst; let hid = 0; const onVis = () => { if (document.hidden) hid++; }; document.addEventListener('visibilitychange', onVis);
  const r = await T.ask('background', { seconds: 4 });
  await until(() => document.visibilityState === 'visible', 10000); await wait(1500);
  ok(r && r.done, 'the Mac sent the app away and back', r);
  ok(window.__notReloaded === 1 && SPG.app.running() && SPG.app.running().inst === inst, 'the same game is still open after coming back');
  ok(hid >= 1, 'the game was told it was hidden', hid);
  await mouse.click(innerWidth / 2, innerHeight / 2); await wait(400);
  ok(SPG.audio.ctx && SPG.audio.ctx.state === 'running', 'sound runs again after coming back', SPG.audio.ctx && SPG.audio.ctx.state);
  document.removeEventListener('visibilitychange', onVis);
});

/* ------------------------------------------------------------ 6. a phone call ends */
await step('interruption', async () => {
  let n = 0; const on = () => n++; addEventListener('spgaudioresume', on);
  await PL.SproutTest.interrupt(); await wait(800);
  ok(n === 1, 'the app tells the game when an interruption ends', n);
  ok(SPG.audio.ctx.state === 'running', 'sound is running after the interruption', SPG.audio.ctx.state);
  removeEventListener('spgaudioresume', on); SPG.app.closeGame(); await wait(400);
});

/* ------------------------------------------------------------ 7. voices */
await step('voices', async () => {
  const V = SPG.voice, S = SPG.store.settings;
  ok(V.sproutReady(), 'the Sprout voice clips are listed');
  for (const k of ['letter.a', 'letter.v', 'sound.v', 'sound.th', 'num.7']) {
    // (Capacitor's iOS file server answers .mp3 files with a non-HTTP response: fetch says status 0 and the file is in the body)
    try { const res = await fetch(`audio/voice/sprout/${k}.mp3`).catch(e => ({ fail: e }));
      if (res.fail || !(res.ok || res.status === 0)) { if (k !== 'sound.th') ok(false, 'Sprout clip ' + k, res.fail ? T.err(res.fail) : res.status); continue; }
      const buf = await SPG.audio.ctx.decodeAudioData(await res.arrayBuffer()); ok(buf.duration > .15, 'Sprout clip ' + k + ' decodes', buf.duration);
    } catch (e) { ok(false, 'Sprout clip ' + k + ' decodes', String(e)); }
  }
  // what is played: wrap fetch (Sprout clips) and the phone's voice (TextToSpeech) to see which one says a line
  const fetched = [], spoken = [], realFetch = window.fetch, realTTS = PL.TextToSpeech;
  window.fetch = (u, o) => { const m = String(u).match(/sprout\/([^/]+)\.mp3$/); if (m) fetched.push(m[1]); return realFetch(u, o); };
  const spy = new Proxy({}, { get: (_, k) => k === 'speak' ? (o => { spoken.push({ text: o.text, lang: o.lang }); return realTTS.speak(Object.assign({}, o, { volume: .05 })); }) : realTTS[k] });
  let wrapped = true; try { PL.TextToSpeech = spy; wrapped = PL.TextToSpeech === spy; } catch (_) { wrapped = false; }
  Object.assign(S, { voice: true, voicePref: 'mix', builtinVoice: 'sprout' });
  const sayNow = async (key, set = {}) => { Object.assign(S, set); fetched.length = 0; spoken.length = 0; V.stop(); await wait(1700); await V.say(key); await wait(300); return { fetched: fetched.slice(), spoken: spoken.slice() }; };
  let r = await sayNow('letter/q'); ok(r.fetched.includes('letter.q') && !r.spoken.length, 'a letter name is said by the Sprout voice', r);
  r = await sayNow('sound/m'); ok(r.fetched.includes('sound.m') && !r.spoken.length, 'a letter sound is said by the Sprout voice', r);
  if (wrapped) {
    r = await sayNow('letter/r', { builtinVoice: 'device' }); ok(r.spoken.length === 1 && /^en/.test(r.spoken[0].lang || ''), "the phone's own voice says a line when chosen", r);
  } else note('phone voice check', 'TextToSpeech could not be watched; spoken through the plugin directly instead');
  S.builtinVoice = 'sprout';
  try { PL.TextToSpeech = realTTS; } catch (_) { /* fine */ }
  window.fetch = realFetch;
  // the phone's voice really speaks (and takes time), and which languages it has
  const t0 = Date.now(); try { await realTTS.speak({ text: 'Hello! Let us play.', lang: 'en-US', rate: 1, volume: .05 }); } catch (e) { note('speak error', String(e)); }
  ok(Date.now() - t0 > 300, "the phone's voice speaks", Date.now() - t0);
  try {
    const langs = ((await realTTS.getSupportedLanguages()) || {}).languages || [], voices = ((await realTTS.getSupportedVoices()) || {}).voices || [];
    const per = {}; for (const L of ['en', 'es', 'hi', 'zh']) per[L] = { languages: langs.filter(x => x.toLowerCase().startsWith(L)).length, voices: voices.filter(v => (v.lang || '').toLowerCase().startsWith(L)).map(v => v.name).slice(0, 6) };
    note('phone voices per language', per);
    ok(per.en.voices.length > 0, 'there is an English phone voice', per.en);
    for (const L of ['es', 'hi', 'zh']) if (!per[L].voices.length) note('no phone voice for ' + L + ' on this simulator', 'lines are said in English until one is installed (Grown-ups > Voices explains how)');
  } catch (e) { ok(false, 'list the phone voices', String(e)); }
});

/* ------------------------------------------------------------ 8. recording */
await step('recording', async () => {
  const V = SPG.voice;
  // open Grown-ups > Sound and voices: the microphone is still not asked for
  document.getElementById('hub-lock').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await wait(400);
  const q = document.getElementById('gate-q').textContent, W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'], [a, , c] = q.split(' ');
  const pad = d => [...document.querySelectorAll('#numpad button')].find(x => x.textContent === d).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  for (const d of String(W.indexOf(a) + W.indexOf(c))) pad(d);
  document.querySelector('#numpad button.ok').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await wait(500);
  const vintro = document.querySelector('#vintro:not(.hidden)');
  ok(!document.querySelector('#parent.hidden') || !!vintro, 'the grown-up gate opens Grown-ups', q);
  if (vintro) { await T.shot('voices-welcome'); vintro.querySelector('.btn.quiet').click(); await wait(300); }
  SPG.grownups.open('sound'); await wait(500); await T.shot('grownups-voices');
  ok(T.gum === 0, 'opening the voices page does not ask for the microphone', T.gum);
  // a grown-up records one line (a soft tone stands in for the microphone)
  T.fakeMic = true;
  const id = V.addVoice('Grandma'), rec = await V.startRecording(); await wait(1600); const blob = await rec.stop();
  ok(T.gum === 1, 'the microphone is asked for once, when recording starts', T.gum);
  ok(blob && blob.size > 500, 'a recording was made', { size: blob && blob.size, type: blob && blob.type });
  note('recording format', blob && blob.type);
  let saved = null; try { saved = await V.saveClip(id, 'letter/a', blob); } catch (e) { note('save error', String(e)); }
  ok(saved && saved.duration > .8, 'the recording decodes and is kept', saved && saved.duration);
  ok(await V.previewClip(id, 'letter/a'), 'the recording plays back');
  ok(V.hasDeviceClip(id, 'letter/a'), 'the recording is stored on the device');
  out.voice = id; T.fakeMic = false;
  // the real microphone through the game's own recorder, as far as the simulator allows (a build server may have no input at all,
  // so no input is only a note); what must never happen is WebKit refusing it because of the app's audio session ("playback")
  let late = false;
  try {
    const pr = V.startRecording(), r = await Promise.race([pr, wait(6000).then(() => 'timeout')]);
    if (r === 'timeout') { late = true; note('real microphone on this simulator', 'no answer in 6 s'); pr.then(x => x.stop()).catch(() => {}); }
    else { ok(navigator.audioSession ? navigator.audioSession.type === 'play-and-record' : true, 'the audio session allows the microphone while recording', navigator.audioSession && navigator.audioSession.type); await wait(1200); const blob = await r.stop(); note('real microphone on this simulator', 'recorded ' + blob.size + ' bytes'); }
  } catch (e) { ok(!/category is not compatible/i.test(e.message || ''), 'the audio session allows the microphone', `${e.name}: ${e.message}`); note('real microphone on this simulator', `${e.name}: ${e.message}`); }
  await wait(400);
  if (!late) ok(!navigator.audioSession || navigator.audioSession.type === 'playback', 'after recording the sound plays as playback again (with the silent switch on)', navigator.audioSession && navigator.audioSession.type);
});

/* ------------------------------------------------------------ 9. photos, files, the gate, privacy */
await step('photos', async () => {
  const st = await SPG.native.photos.status(); note('Photos permission (granted by the Mac before the test)', st);
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 240; const c = cv.getContext('2d'); c.fillStyle = '#7ad'; c.fillRect(0, 0, 320, 240); c.fillStyle = '#fd4'; c.beginPath(); c.arc(160, 120, 70, 0, 7); c.fill();
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const saved = await SPG.native.saveToGallery(blob, 'sprout-test.png');
  ok(st === 'granted' ? saved : !saved, st === 'granted' ? 'a picture is saved to Photos' : 'without permission nothing is saved and nothing asks', { st, saved });
  // the backup file: what the grown-up shares is the whole family's progress, and it reads back
  const txt = SPG.sync.fileText(), r = SPG.sync.restoreFileText(txt);
  ok(JSON.parse(txt).profiles.length >= 1 && r.ok, 'the backup file is complete and reads back', r);
  const FS = PL.Filesystem, w = await FS.writeFile({ path: 'test-backup.json', data: btoa(unescape(encodeURIComponent(txt))), directory: 'CACHE' });
  const rd = await FS.readFile({ path: 'test-backup.json', directory: 'CACHE', encoding: 'utf8' }); await FS.deleteFile({ path: 'test-backup.json', directory: 'CACHE' });
  ok(rd.data === txt && /^file:/.test(w.uri), 'the file the share sheet sends is written correctly', w.uri);
  // the file a grown-up saves also carries the family's recordings: lose one, restore the file, and it is back and plays
  if (out.voice && SPG.voice.hasDeviceClip(out.voice, 'letter/a')) {
    const full = await (await SPG.sync.fileBlob()).text(), j = JSON.parse(full);
    const clip = ((j.voices || {}).clips || []).find(c => c.set === out.voice && c.key === 'letter/a');
    ok(!!clip && clip.data.length > 100 && (j.voices.list.voices || []).some(v => v.id === out.voice), 'the backup file holds the voices and their recordings', { clips: ((j.voices || {}).clips || []).length, kb: Math.round(full.length / 1024) });
    await SPG.voice.deleteClip(out.voice, 'letter/a');
    ok(!SPG.voice.hasDeviceClip(out.voice, 'letter/a'), 'a recording can be deleted');
    const back = await SPG.sync.restoreFile(full);
    ok(back.ok && back.clips >= 1 && SPG.voice.hasDeviceClip(out.voice, 'letter/a'), 'restoring the backup file brings the recording back', back);
    let played = false; try { played = !!(await SPG.voice.previewClip(out.voice, 'letter/a')); } catch (e) { note('play after restore', String(e)); }
    ok(played, 'the restored recording plays');
  } else note('backup file with recordings', 'no recording to try (the recording check did not save one)');
  // device unlock: Face ID / Touch ID / passcode availability on this simulator
  try { note('Face ID / Touch ID on this simulator', await PL.NativeBiometric.isAvailable({ useFallback: true })); } catch (e) { note('Face ID / Touch ID on this simulator', String(e)); }
  // the privacy policy opens inside the app
  SPG.grownups.open('about'); await wait(400);
  const link = [...document.querySelectorAll('#parent-body a')].find(a => /privacy/i.test(a.getAttribute('href') || ''));
  if (link) { link.click();
    // the page inside the frame loads from the app's files; a simulator on a build server can take a few seconds the first time
    const titleOf = () => { const f = document.querySelector('.privacy-sheet iframe'); try { return f && f.contentDocument ? f.contentDocument.title : ''; } catch (e) { return 'unreadable: ' + e.message; } };
    await until(() => /Privacy/i.test(titleOf()), 8000);
    const fr = document.querySelector('.privacy-sheet iframe');
    ok(!!fr && /Privacy/i.test(titleOf()), 'the privacy policy opens inside the app', { frame: !!fr, src: fr && fr.src, title: titleOf(), state: fr && fr.contentDocument && fr.contentDocument.readyState, at: fr && fr.contentWindow && String(fr.contentWindow.location) }); await T.shot('privacy'); const x = document.querySelector('.privacy-sheet .btn'); x && x.click(); await wait(300); }
  else ok(false, 'the privacy policy link is in About');
  const s = cssSafe(), panel = document.querySelector('#parent .sheet, #parent .panel, #parent-body');
  if (panel) { const pr = rectOf(panel); ok(inside(pr, s, 2), 'the Grown-ups panel is inside the safe area', pr); }
});

/* ------------------------------------------------------------ 10. the cloud backup (only with a local test worker) */
await step('backup', async () => {
  if (!SPG.native.apiBase) { note('cloud backup', 'not tested: this build has no backup address (SPG_TEST_API)'); return; }
  if (process.env.BACKUP === '0') { note('cloud backup', 'tested in the iphone-max job (this Mac runs no local backup service)'); return; }
  note('backup address', SPG.native.apiBase);
  SPG.store.active.stars = 42; SPG.store.save();
  const r = await SPG.sync.create();
  ok(r && r.ok && r.code, 'the family backup is made (encrypted on the device)', r);
  if (r && r.ok) { out.code = r.code; ok(SPG.sync.info().on && !SPG.sync.info().error, 'the backup is on and has no error', SPG.sync.info()); }
});

if (document.querySelector('#parent:not(.hidden)')) { const b = document.querySelector('#parent .close, #parent-close'); b && b.click(); }
console.log(bad ? `PROBLEMS: ${bad}` : 'IOS CHECKS OK');
if (bad) process.exitCode = 1;
