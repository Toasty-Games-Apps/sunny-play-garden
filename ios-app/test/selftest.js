// Simulator self-test runner. Only in test builds (SPG_SELFTEST=1 ios-app/build-web.mjs): never in the App Store build, which
// refuses it (ios-app/test/check-release-ios.mjs). It is loaded right after js/native.js, before the game.
//
// The Mac (ios-app/test/run-sim.mjs) writes Documents/selftest/plan.json into the app's container and launches the app. This page
// reads the plan, runs one test module from www/test/ (the play-tests from tools/playtest, through the Playwright stand-in in
// www/test/lib.js, or an iOS test), and writes the results back next to the plan. Things a page cannot do itself (a real
// screenshot, sending the app to the background) it asks the Mac for: it writes req.json and waits for ack-<n>.json.
(() => {
  const C = window.Capacitor, FS = C && C.Plugins && C.Plugins.Filesystem;
  if (!FS || !C.isNativePlatform || !C.isNativePlatform()) return;
  const D = 'DOCUMENTS', base = 'selftest/', wait = ms => new Promise(r => setTimeout(r, ms));
  const read = async p => { try { return (await FS.readFile({ path: base + p, directory: D, encoding: 'utf8' })).data; } catch (_) { return null; } };
  const write = (p, data) => FS.writeFile({ path: base + p, directory: D, encoding: 'utf8', data, recursive: true });
  const T = window.SPG_TEST = { gum: 0, log: [], errs: [], n: 0, plan: null };

  // How often the microphone is asked for (it must be only when a grown-up starts recording). A test can give it a fake
  // microphone (a soft tone from Web Audio) because the simulator on a build server has no real one.
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const real = md.getUserMedia.bind(md);
    md.getUserMedia = async c => {
      T.gum++;
      if (T.fakeMic) { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.frequency.value = 330; o.connect(d); o.start(); await ac.resume().catch(() => {}); T.fakeCtx = ac; return d.stream; }
      return real(c);
    };
  }
  // console output goes to the Mac as it happens (log-<test>.txt), and errors count as page errors (like Playwright's)
  let pending = '', flushing = false;
  const flush = async () => {
    if (flushing || !pending || !T.plan) return; flushing = true; const chunk = pending; pending = '';
    try { await FS.appendFile({ path: base + 'log-' + T.plan.test + '.txt', directory: D, encoding: 'utf8', data: chunk }); } catch (_) { await write('log-' + T.plan.test + '.txt', chunk).catch(() => {}); }
    flushing = false;
  };
  setInterval(flush, 700);
  const fmt = a => a.map(x => typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch (_) { return String(x); } })()).join(' ');
  const oLog = console.log.bind(console), oErr = console.error.bind(console);
  console.log = (...a) => { const l = fmt(a); T.log.push(l); pending += l + '\n'; oLog(...a); };
  console.error = (...a) => { const l = fmt(a); T.errs.push(l); pending += 'ERROR ' + l + '\n'; if (T.onConsoleError) T.onConsoleError(l); oErr(...a); };
  addEventListener('error', e => { const l = 'pageerror: ' + (e.message || e.error); T.errs.push(l); pending += l + '\n'; });
  addEventListener('unhandledrejection', e => { const l = 'pageerror: ' + ((e.reason && e.reason.message) || e.reason); T.errs.push(l); pending += l + '\n'; });

  // ask the Mac for something and wait until it is done
  T.ask = async (action, extra = {}) => {
    const n = ++T.n; await flush();
    await write('req.json', JSON.stringify({ n, action, test: T.plan.test, w: innerWidth, h: innerHeight, angle: (screen.orientation && screen.orientation.angle) || 0, ...extra }));
    for (let i = 0; i < 600; i++) { const a = await read('ack-' + n + '.json'); if (a) { try { return JSON.parse(a); } catch (_) { return {}; } } await wait(150); }
    console.log('(no answer from the Mac for ' + action + ')'); return null;
  };
  T.shot = name => T.plan.shots === false ? Promise.resolve(null) : T.ask('shot', { name: T.plan.prefix ? T.plan.prefix + '-' + name : name });
  // turn the device (the Debug-only SproutTest plugin), then wait for the page to have the new shape
  T.turn = async to => {
    const land = innerWidth > innerHeight; if ((to === 'landscape') === land) return { same: true };
    const P = C.Plugins.SproutTest; if (!P) return { error: 'no SproutTest plugin' };
    const r = await P.rotate({ to });
    for (let i = 0; i < 30 && (innerWidth > innerHeight) !== (to === 'landscape'); i++) await wait(100);
    await wait(700); return r;
  };
  // give the app's window another size (the Debug-only SproutTest plugin; 0 x 0 = the whole screen again), then wait for the page
  T.resize = async (w, h) => {
    const P = C.Plugins.SproutTest; if (!P || !P.resize) return { error: 'no resize in SproutTest' };
    const r = await P.resize({ w, h }), want = w > 0 && r && r.window ? r.window : null;
    for (let i = 0; i < 30 && want && (Math.abs(innerWidth - want[0]) > 1 || Math.abs(innerHeight - want[1]) > 1); i++) await wait(100);
    await wait(700); return r;
  };
  T.info = async () => { try { return await C.Plugins.SproutTest.info(); } catch (_) { return null; } };
  T.testDone = () => {};

  async function main() {
    const txt = await read('plan.json'); if (!txt) return;
    const plan = T.plan = JSON.parse(txt);
    // a fresh start for every test (like a new Playwright context): saved games and pictures are wiped once, then the page reloads
    if (plan.fresh && sessionStorage.getItem('spg-selftest-run') !== plan.run) {
      localStorage.clear();
      try { for (const d of await indexedDB.databases()) if (d.name) indexedDB.deleteDatabase(d.name); } catch (_) { /* older WebKit */ }
      sessionStorage.setItem('spg-selftest-run', plan.run); await wait(300); location.reload(); return;
    }
    while (!(window.SPG && SPG.app && document.readyState === 'complete')) await wait(100);
    // a test in another language: switch to it first (the game reloads itself in the new language, then this runs again)
    if (plan.lang && SPG.i18n.lang() !== plan.lang) { if (sessionStorage.getItem('spg-selftest-lang') === plan.run) { console.error('the language did not change to ' + plan.lang); } else { sessionStorage.setItem('spg-selftest-lang', plan.run); SPG.i18n.set(plan.lang); return; } }
    // The play-tests from tools/playtest were written for a game area that starts at the window's top left (as on Android and the
    // website), and they use game positions as page positions. For them only, the game area is laid out from the window edge here.
    // The iOS checks (ios.js) and the store screenshots use the real layout, inside the safe area.
    if (plan.flat) { const st = document.createElement('style'); st.textContent = 'html.ios .game-host { top: 0; right: 0; bottom: 0; left: 0; }'; document.head.append(st); }
    await wait(plan.settle || 800);
    // process.exit(code) in a test ends it here (the module stops at the throw and the code is kept)
    const EXIT = { exit: true };
    window.process = { argv: ['node', plan.test, String(innerWidth), String(innerHeight), ...(plan.args || [])], env: Object.assign({}, plan.env || {}), exitCode: 0, exit(code) { window.process.exitCode = code || 0; throw EXIT; } };
    const t0 = Date.now(); let error = null;
    console.log(`== ${plan.test} on ${navigator.userAgent} at ${innerWidth}x${innerHeight} (dpr ${devicePixelRatio})`);
    const timeout = new Promise(r => setTimeout(() => r('timeout'), (plan.timeout || 900) * 1000));
    try { const r = await Promise.race([import('../test/' + plan.test + '.js'), timeout]); if (r === 'timeout') error = 'timed out after ' + (plan.timeout || 900) + ' s'; }
    catch (e) { if (!(e && e.exit)) { error = (e && (e.stack || e.message)) || String(e); console.log('THREW: ' + error); } }
    const exitCode = window.process.exitCode || 0;
    const result = { test: plan.test, ok: !error && !exitCode, exitCode, error, ms: Date.now() - t0, gum: T.gum, errs: T.errs.slice(0, 50), size: [innerWidth, innerHeight], dpr: devicePixelRatio, extra: T.extra || null };
    await flush(); await wait(200); await flush();
    await write('result-' + plan.test + '.json', JSON.stringify(result));
    await write('done-' + plan.test + '.json', '1');
  }
  if (document.readyState === 'complete') main(); else addEventListener('load', main);
})();
