// Stand-in for tools/playtest/lib.mjs inside the iOS app (simulator test builds only, see ios-app/test/README.md).
// The play-tests were written for Playwright in desktop Chromium. Here the same test files run inside the app's own web view
// (WebKit on iOS): `page` is this very page, `page.mouse` sends pointer and mouse events to the element under the point,
// `page.screenshot` asks the Mac to take a real simulator screenshot, and `page.setViewportSize` turns the device to that
// shape. Things a page cannot do to itself (reload, a second browser context) are not offered: tests that need them stay on
// Chromium. Returned values are copied (as Playwright does), so a test never holds live game objects.
const T = window.SPG_TEST;   // the runner (js/selftest.js)
export const SP = 'shots';
const wait = ms => new Promise(r => setTimeout(r, ms));
// what the test asked for last (the runner prints it when a test stalls, see selftest.js)
const did = what => { T.last = { what, t: Date.now() }; };
const copy = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'number' && !isFinite(x)) ? null : x));

// ---- a mouse that behaves like Playwright's: move / down / up / click at viewport (client) coordinates
let mx = 0, my = 0, down = false, downEl = null;
const capture = new Map();   // pointerId -> element (setPointerCapture works on synthetic pointers too)
const origSet = Element.prototype.setPointerCapture, origRel = Element.prototype.releasePointerCapture, origHas = Element.prototype.hasPointerCapture;
Element.prototype.setPointerCapture = function (id) { if (id >= 900) { capture.set(id, this); return; } try { return origSet.call(this, id); } catch (_) { capture.set(id, this); } };
Element.prototype.releasePointerCapture = function (id) { if (capture.get(id) === this) { capture.delete(id); return; } try { return origRel.call(this, id); } catch (_) { /* not captured */ } };
Element.prototype.hasPointerCapture = function (id) { return capture.get(id) === this || (id < 900 && origHas.call(this, id)); };
const at = (x, y) => document.elementFromPoint(x, y) || document.body;
function fire(type, x, y, { id = 901, buttons = 0, button = 0, kind = 'mouse', primary = true } = {}) {
  // a captured pointer (and its mouse events) goes to the capturing element, as in a browser; otherwise to what is under the point
  const el = capture.get(type.startsWith('pointer') ? id : 901) || at(x, y);
  const init = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y, button, buttons, detail: type === 'click' ? 1 : 0 };
  const ev = type.startsWith('pointer') ? new PointerEvent(type, { ...init, pointerId: id, pointerType: kind, isPrimary: primary, width: 1, height: 1, pressure: buttons ? .5 : 0 }) : new MouseEvent(type, init);
  // a made-up event has no coalesced events of its own (a real finger's move lists itself), and games read moves from them
  if (type === 'pointermove') Object.defineProperty(ev, 'getCoalescedEvents', { value: () => [ev] });
  el.dispatchEvent(ev); return el;
}
export const mouse = {
  async move(x, y, { steps = 1 } = {}) {
    did(`mouse.move ${Math.round(x)},${Math.round(y)}${down ? ' (down)' : ''}`); const x0 = mx, y0 = my;
    for (let i = 1; i <= steps; i++) {
      const px = x0 + (x - x0) * i / steps, py = y0 + (y - y0) * i / steps;
      fire('pointermove', px, py, { buttons: down ? 1 : 0 }); fire('mousemove', px, py, { buttons: down ? 1 : 0 });
      if (steps > 1) await wait(8);
    }
    mx = x; my = y;
  },
  async down() { down = true; downEl = fire('pointerdown', mx, my, { buttons: 1 }); fire('mousedown', mx, my, { buttons: 1 }); await wait(0); },
  async up() {
    const target = fire('pointerup', mx, my); fire('mouseup', mx, my);
    const cap = capture.get(901); if (cap) { capture.delete(901); cap.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 901, pointerType: 'mouse' })); }
    const el = at(mx, my); if (downEl && (el === downEl || downEl.contains(el) || el.contains(downEl))) fire('click', mx, my);
    down = false; downEl = null; void target; await wait(0);
  },
  async click(x, y, { delay = 0 } = {}) { await mouse.move(x, y); await mouse.down(); if (delay) await wait(delay); await mouse.up(); }
};
// several fingers at once (pointerType touch): fingers = [[x0, y0, x1, y1], ...], all moving together in `steps`
export async function touches(fingers, steps = 8) {
  did(`touches x${fingers.length}`);
  fingers.forEach(([x, y], i) => fire('pointerdown', x, y, { id: 910 + i, kind: 'touch', buttons: 1, primary: i === 0 }));
  for (let s = 1; s <= steps; s++) { fingers.forEach(([x0, y0, x1, y1], i) => fire('pointermove', x0 + (x1 - x0) * s / steps, y0 + (y1 - y0) * s / steps, { id: 910 + i, kind: 'touch', buttons: 1, primary: i === 0 })); await wait(16); }
  fingers.forEach(([, , x1, y1], i) => { fire('pointerup', x1, y1, { id: 910 + i, kind: 'touch', primary: i === 0 }); capture.delete(910 + i); });
}

// ---- Playwright-style selectors: css, `css >> nth=N`, `css >> text=Foo`, `text="Foo"`
function query(sel, all) {
  let parts = sel.split(/\s*>>\s*/), list = null;
  for (const part of parts) {
    if (/^nth=/.test(part)) { const n = +part.slice(4); list = list && list[n] ? [list[n]] : []; continue; }
    if (/^text=/.test(part)) {
      let txt = part.slice(5), exact = /^".*"$/.test(txt); if (exact) txt = txt.slice(1, -1);
      const pool = list || [...document.querySelectorAll('button, a, [role=button], span, div, p, h1, h2, h3, li, label')];
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      const ok = e => exact ? norm(e.textContent) === txt : norm(e.textContent).toLowerCase().includes(txt.toLowerCase());
      list = pool.filter(ok);
      if (!exact && !list.length) list = pool.filter(e => norm(e.innerText).toLowerCase().includes(txt.toLowerCase()));
      list = list.filter(e => !list.some(o => o !== e && e.contains(o)));   // the innermost element, as Playwright clicks
      continue;
    }
    list = list ? list.flatMap(e => [...e.querySelectorAll(part)]) : [...document.querySelectorAll(part)];
  }
  list = (list || []).filter(e => e.isConnected);
  return all ? list : list[0] || null;
}
const visible = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
// an element handle as Playwright gives one (only what the play-tests use): el.evaluate(fn, arg), el.click(), el.textContent()
const handle = sel => ({ sel,
  async evaluate(fn, arg) { did('handle.evaluate ' + sel); return copy(await fn(query(sel), copy(arg))); },
  click: () => clickEl(sel),
  async textContent() { const el = query(sel); return el ? el.textContent : null; } });
async function clickEl(sel) {
  did('click ' + sel);
  let el = null; for (let i = 0; i < 50; i++) { el = query(sel); if (el && visible(el)) break; await wait(100); }
  if (!el) throw new Error('page.click: nothing matches ' + sel);
  el.scrollIntoView && el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect(); await mouse.click(r.left + r.width / 2, r.top + r.height / 2);
}

// ---- the page
const errs = [];
addEventListener('error', e => errs.push('pageerror: ' + (e.message || e.error)));
addEventListener('unhandledrejection', e => errs.push('pageerror: ' + (e.reason && e.reason.message || e.reason)));
const handlers = { pageerror: [], console: [] };
const page = {
  errs, mouse,
  async evaluate(fn, arg) { did('evaluate ' + String(fn).replace(/\s+/g, ' ').slice(0, 90)); if (typeof fn !== 'function') throw new Error('page.evaluate needs a function here (no eval under the CSP)'); return copy(await fn(copy(arg))); },
  waitForTimeout: wait,
  async waitForFunction(fn, arg, { timeout = 30000 } = {}) { did('waitForFunction ' + String(fn).replace(/\s+/g, ' ').slice(0, 90)); const t0 = Date.now(); for (;;) { const v = await fn(arg); if (v) return v; if (Date.now() - t0 > timeout) throw new Error('waitForFunction timed out'); await wait(100); } },
  click: clickEl,
  async $(sel) { return query(sel) ? handle(sel) : null; },
  async $$(sel) { return query(sel, true).map((e, i) => handle(sel + ' >> nth=' + i)); },
  async screenshot({ path } = {}) { if (path) await T.shot(String(path).split('/').pop().replace(/\.png$/, '')); return new Uint8Array(0); },
  // an iPad in windowed mode cannot be turned by the app: the window then gets that shape inside the screen (the widest or tallest it can
  // be), as when a grown-up resizes the app's window, and the whole screen again for the screen's own shape
  async setViewportSize({ width, height }) {
    did(`setViewportSize ${width}x${height}`); const land = width > height;
    await T.turn(land ? 'landscape' : 'portrait'); if ((innerWidth > innerHeight) === land) return;
    const i = await T.info(), sc = i && i.screen; if (!sc || !T.resize) return;
    const [sw, sh] = sc;
    if ((sw > sh) === land) { await T.resize(0, 0); return; }
    if (land) await T.resize(sw, Math.round(sw * height / width)); else await T.resize(Math.round(sh * width / height), sh);
  },
  viewportSize: () => ({ width: innerWidth, height: innerHeight }),
  on(ev, cb) { (handlers[ev] = handlers[ev] || []).push(cb); },
  context: () => ({ async close() { await home(); } }),
  async close() { await home(); },
  keyboard: { async type(text) { const el = document.activeElement; if (el && 'value' in el) { el.value += text; el.dispatchEvent(new Event('input', { bubbles: true })); } } },
  async fill(sel, text) { const el = query(sel); el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
};
T.onConsoleError = m => { errs.push('console: ' + m); handlers.console.forEach(cb => cb({ type: () => 'error', text: () => m })); };
async function home() {
  if (SPG.app.running && SPG.app.running()) SPG.app.closeGame();
  await wait(300);
}

// ---- lib.mjs's own functions
export async function start() { return { close() {} }; }
export function stop() { T.testDone(); }
// Playwright gives every newPage a fresh browser context (nothing saved). Here it is the same app, so a later page puts the
// device settings back as they were when the test started and starts the player again from nothing (stars, games opened...).
let pages = 0, settings0 = null, reset = false;
export async function newPage(browser, w, h) {
  if (w && h) await T.turn(w > h ? 'landscape' : 'portrait');
  await home(); errs.length = 0;
  const S = SPG.store.settings;
  if (!pages++) settings0 = JSON.stringify(S);
  else { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, JSON.parse(settings0)); SPG.store.saveSettings(); SPG.night.apply(); reset = true; }
  // back to "Who is playing?" the way the hub's own button does it (it fills in the player tiles; SPG.app.show alone only reveals the screen)
  if (!document.querySelector('#setup:not(.hidden)') && !document.querySelector('#who:not(.hidden) .who-tile')) {
    if (SPG.app.running && SPG.app.running()) SPG.app.closeGame();
    if (document.querySelector('#who:not(.hidden)')) SPG.app.show('hub');
    document.getElementById('hub-who').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })); await wait(300);
  }
  return page;
}
// as in lib.mjs; a player who already exists gets the asked age and gender first (a fresh Playwright page would have made one)
export async function login(page, { gender = 'girl', age = 4 } = {}) {
  if (await page.$('#setup:not(.hidden)')) {
    await page.click('.name-btn >> nth=0');
    if (gender) await page.click(`#gender-pick .seg-btn >> text=${gender === 'girl' ? 'Girl' : 'Boy'}`);
    if (age) await page.click(`#age-pick .seg-btn >> text="${age}"`);
    await page.click('#setup-go'); await page.waitForTimeout(300);
    if (await page.$('#vintro:not(.hidden)')) await page.click('#vintro .btn.quiet');
  } else {
    const p = SPG.store.profiles[0];
    if (p && reset) { SPG.store.resetProfile(p.id); reset = false; }
    if (p) { if (age) SPG.level.set(p, { mode: 'age', age }); if (gender) { p.gender = gender; SPG.store.save(); } }
    await page.click('.who-tile >> nth=0');
  }
  await page.waitForTimeout(400);
}
export async function openGame(page, name) {
  did('openGame ' + name);
  await page.evaluate(n => document.querySelector(`.card[aria-label="${n}"], .shopfront[aria-label="${n}"]`).dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })), name);
  await page.waitForTimeout(600);
}
