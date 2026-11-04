// The scenes of the store screenshots: each one plays a game into a nice moment and calls `shot()`, then goes back to the hub.
// Shared by tools/make-store-assets.mjs (Google Play, Chromium) and the iOS app's simulator screenshots (ios-app/test/store-shots.mjs),
// so both stores show the same moments. Only Playwright-style page calls are used (evaluate, click, mouse, waitForTimeout).
export const F = { force: true };
// a player who has been playing a while: some stars, and a bunny friend with a bow who shows up in Pet Care, Fishing and the Kitchen
export const prepPlayer = p => p.evaluate(() => { const A = SPG.store.active; A.stars = 60; SPG.pets.adopt('bunny'); SPG.pets.rename('bunny', 'Biscuit'); SPG.pets.buyHat('bow'); SPG.pets.wear('bow'); A.stars = 37; SPG.store.save(); });
export const GAMES = ['Letter Garden', 'Fruit Splash', 'Rain Bucket', 'Fire Rescue', 'Grow a Garden', 'Coloring Book', 'Puzzle Pond', 'Pet Care', 'Bunny Band', 'Shape Builder', 'Hide and Seek', 'Style Studio'];
// cards are labelled with the game's name in the app's language
export const openGame = async (p, n) => { const name = await p.evaluate(n => SPG.t(n), typeof n === 'number' ? GAMES[n - 1] : n); await p.click(`.card[aria-label="${name}"]`, F); await p.waitForTimeout(900); };
export const home = async p => { await p.click('#btn-home', F); await p.waitForTimeout(400); };
// Game probes give places on the game's own canvas. The game area starts at the window's top left on Android and the website, but
// inside the safe area on iPhone and iPad (around the camera and the home bar), so a tap is moved by where the game area really is.
const origin = p => p.evaluate(() => { const r = document.getElementById('game-host').getBoundingClientRect(); return [r.left, r.top]; });
export const tap = async (p, x, y) => { const [ox, oy] = await origin(p); await p.mouse.click(ox + x, oy + y); };
export const until = async (p, fn, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(150); } return false; };

// Each scene leaves the app on the hub. `shot` saves the plain screenshot.
export const SCENES = {
  hub: async (p, shot) => { await p.waitForTimeout(400); await shot(); },
  trace: async (p, shot) => {
    await openGame(p, 1); await p.click('.lg-mode.m0', F); await p.waitForTimeout(300); await p.click('.lg-tile:nth-child(19)', F); await p.waitForTimeout(900);
    await p.evaluate(async () => {
      const t = SPG.app.running().inst.tracer, cv = t.canvas, r = cv.getBoundingClientRect(), st = t.g.strokes[0];
      const ev = (type, q) => cv.dispatchEvent(new PointerEvent(type, { clientX: r.left + t.ox + q.x * t.k, clientY: r.top + t.oy + q.y * t.k, pointerId: 1, pointerType: 'touch', bubbles: true }));
      ev('pointerdown', st.pts[0]); for (let i = 1; i < Math.floor(st.pts.length * .6); i++) { ev('pointermove', st.pts[i]); await new Promise(r => setTimeout(r, 6)); }
    });
    await p.waitForTimeout(250); await shot(); await home(p);
  },
  find: async (p, shot) => { await openGame(p, 1); await p.click('.lg-mode.m2', F); await p.waitForTimeout(900); await shot(); await home(p); },
  fruit: async (p, shot) => {
    await openGame(p, 2); await p.waitForTimeout(1200);
    await p.evaluate(() => { const g = SPG.app.running().inst; g.fruits.length = 0; g.starIn = 999; g.spawnIn = 99; [[.2, .55, 0], [.4, .4, 2], [.62, .5, 3], [.8, .38, 1], [.5, .72, 5]].forEach(([x, y, t]) => g.fruits.push({ x: g.w * x, y: g.h * y, vx: 0, vy: 0, r: Math.min(g.w, g.h) * .11, type: t, rotation: 0, vr: 0, wow: 0, blink: 9 })); });
    await p.waitForTimeout(200); await shot(); await home(p);
  },
  rain: async (p, shot) => { await openGame(p, 3); await p.evaluate(() => SPG.app.running().inst.startPets()); await p.waitForTimeout(9500); await shot(); await home(p); },
  fire: async (p, shot) => {
    await openGame(p, 4); await p.waitForTimeout(1600);
    await p.evaluate(() => { const g = SPG.app.running().inst; g.aim.x = g.w * .45; g.aim.y = g.h * .55; g.aim.down = true; });
    await p.waitForTimeout(500); await shot(); await p.evaluate(() => { SPG.app.running().inst.aim.down = false; }); await home(p);
  },
  garden: async (p, shot) => {
    await openGame(p, 5);
    await p.evaluate(() => { const g = SPG.app.running().inst; g.bag.blooms = 12; g.resize(); const types = ['sunflower', 'tulip', 'daisy', 'strawberry', 'pumpkin', 'carrot', 'lavender', 'rose']; for (let i = 0; i < g.slotCount(); i++) g.plots[i] = Object.assign(g.plots[i], i === 9 ? { kind: 'hole', level: 2 } : { kind: 'plant', type: types[i % 8], stage: i % 5 === 4 ? 1 : 3, loose: false }); ['bee', 'bird', 'bunny', 'hedgehog', 'butterfly', 'dragonfly'].forEach((k, i) => { const s = g.slot(i * 2 % g.slotCount()); g.spawnCreature(k, s.x + 30, s.y - 20); }); g.ambientUntil = 1e15; });
    await p.waitForTimeout(900); await shot(); await home(p);
  },
  color: async (p, shot) => {
    await openGame(p, 6); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = SPG.app.running().inst; g.open(SPG.pictures[4]); }); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = SPG.app.running().inst; g.ops = [[0, 'sky', 6], [0, 'sun', 2], [0, 'bank', 3], [0, 'pond', 7], [0, 'pad', 3], [0, 'body', 4], [0, 'head', 4], [0, 'eyes', 1]]; g.redraw(); });
    await p.waitForTimeout(300); await shot(); await home(p);
  },
  puzzle: async (p, shot) => {
    await openGame(p, 7); await p.waitForTimeout(1200);
    await p.evaluate(() => { const g = SPG.app.running().inst; const loose = g.pieces.filter(q => !q.locked); loose.slice(0, Math.max(0, loose.length - 2)).forEach(q => g.lock(q)); });
    await p.waitForTimeout(900); await shot(); await home(p);
  },
  band: async (p, shot) => { await openGame(p, 9); await p.waitForTimeout(1600); await shot(); await home(p); },
  shapes: async (p, shot) => { await openGame(p, 10); await p.waitForTimeout(1600); await shot(); await home(p); },
  style: async (p, shot) => { await openGame(p, 12); await p.waitForTimeout(1600); await shot(); await home(p); },
  fishtank: async (p, shot) => {
    await p.evaluate(() => { const fish = ['guppy', 'clown', 'angel', 'puffer', 'guppy', 'clown', 'angel'].map((sp, i) => ({ sp, stage: i % 3 === 0 ? 1 : 2, meals: 12 })); SPG.store.active.data.aquarium = { coins: 40, fish, food: 1, more: 1, snail: 1, power: 0, decor: ['castle', 'chest', 'weed', 'shell'], defeated: 1, since: 0, seen: 1, firstCoin: 1 }; SPG.store.save(); });
    await openGame(p, 'Fish Tank'); await p.waitForTimeout(2500); await shot(); await home(p);
  },
  // Sprout Kitchen: a burger built step by step, shown on its plate ready to eat
  kitchen: async (p, shot, d) => {
    await openGame(p, 'Sprout Kitchen'); await p.waitForTimeout(600);
    const P = () => p.evaluate(() => SPG.cookGame.probe());
    let m = (await P()).menu.find(x => x.tab === 2); await tap(p, m.x, m.y); await p.waitForTimeout(250);
    m = (await P()).menu.find(x => x.id === 'burger'); await tap(p, m.x, m.y); await p.waitForTimeout(1200);
    await p.mouse.click(d.w / 2, d.h / 2); await p.waitForTimeout(2200);
    for (let guard = 0; guard < 120; guard++) {
      const q = await P(), st = q.st || {};
      if (q.screen === 'menu') break;
      if (q.trans || q.busy) { await p.waitForTimeout(200); continue; }
      if (q.step === 'serve') { await p.waitForTimeout(700); await shot(); break; }
      if (q.step === 'pick') { await tap(p, q.cards[1].x, q.cards[1].y); await p.waitForTimeout(1500); continue; }
      if (q.step === 'grill') {
        if (st.placed < 1) { await tap(p, q.tray[0].x, q.tray[0].y); await p.waitForTimeout(600); continue; }
        if (q.check) { await tap(p, q.check.x, q.check.y); await p.waitForTimeout(300); }
        for (const u of st.units) if (u.state === 'flip') { await tap(p, u.x, u.y); await p.waitForTimeout(300); }
        await p.waitForTimeout(400); continue;
      }
      if (q.step === 'build') {
        const items = q.tray.filter(t => !t.used), pick = items.filter(t => t.id !== st.end), want = q.idx === 3 ? [0, 1] : q.idx === 2 ? [0] : [0];
        if ((st.n || 0) < want.length && pick.length) { const it = pick[want[st.n || 0] % pick.length]; await tap(p, it.x, it.y); await p.waitForTimeout(700); continue; }
        if (st.end) { const e = items.find(t => t.id === st.end); await tap(p, e.x, e.y); await p.waitForTimeout(1500); continue; }
        if (q.check) { await tap(p, q.check.x, q.check.y); await p.waitForTimeout(1500); }
        continue;
      }
      await p.waitForTimeout(300);
    }
    await home(p);
  },
  // Fishing Pond: a fish just caught, shown on its card
  fishing: async (p, shot) => {
    await openGame(p, 'Fishing Pond'); await p.waitForTimeout(1500);
    const P = () => p.evaluate(() => SPG.fishingGame.probe());
    let q = await P(); await tap(p, q.rod.x, q.rod.y); await p.waitForTimeout(400);
    const spot = q.spots.find(s => s.id === 'lily') || q.spots[0]; await tap(p, spot.x, spot.y);
    await until(p, () => SPG.fishingGame.mode === 'bite', 30000);
    for (let i = 0; i < 8 && (await P()).mode !== 'card'; i++) { q = await P(); if (q.bob) await tap(p, q.bob.x, q.bob.y); await p.waitForTimeout(350); }
    await until(p, () => SPG.fishingGame.mode === 'card'); await p.waitForTimeout(900); await shot(); await home(p);
  },
  // Clay Corner: a few lumps and a rainbow rope made with the clay tool
  clay: async (p, shot) => {
    await openGame(p, 'Clay Corner'); await p.waitForTimeout(900);
    const pr = await p.evaluate(() => SPG.clayGame.probe()), it = (k, id) => pr.items.find(i => i.kind === k && i.id === id), [ox, oy] = await origin(p);
    const at = (x, y) => [ox + pr.board.x + x * pr.board.s, oy + pr.board.y + y * pr.board.s];
    const click = async (k, id) => { await tap(p, it(k, id).x, it(k, id).y); await p.waitForTimeout(90); };
    const size = n => p.evaluate(n => { SPG.clayGame.size = n; }, n);
    await click('tool', 'clay');
    for (const [col, sz, x, y] of [[0, 2, .25, .3], [2, 1, .5, .25], [6, 2, .74, .32], [9, 1, .35, .55], [4, 0, .62, .55]]) { await click('color', col); await size(sz); await p.mouse.click(...at(x, y)); await p.waitForTimeout(150); }
    await click('color', 13); await size(1); await p.mouse.move(...at(.12, .78)); await p.mouse.down();
    for (const [x, y] of [[.3, .72], [.5, .84], [.7, .74], [.88, .8]]) await p.mouse.move(...at(x, y), { steps: 10 });
    await p.mouse.up(); await p.waitForTimeout(600); await shot(); await home(p);
  },
  // Caterpillars: a caterpillar waiting for its next ball, with butterflies from earlier patterns in the sky
  caterpillars: async (p, shot) => {
    await p.evaluate(() => { SPG.store.active.data.pattern = { done: 6, flock: [['#ff6b6b', '#5aa8f0'], ['#ffd54a', '#b58cf0', '#6fcf6f'], ['#ff8fc0', '#ffffff'], ['#ffa24d', '#5aa8f0'], ['#6fcf6f', '#ff8fc0', '#ffd54a'], ['#b58cf0', '#ffa24d']] }; SPG.store.save(); });
    await openGame(p, 'Caterpillars'); await until(p, () => (SPG.patternGame.probe() || {}).phase === 'pick', 8000); await shot(); await home(p);
  },
  // Feeling Friends: a friend whose balloon flew away, with the faces to choose from
  feelings: async (p, shot) => {
    await p.evaluate(() => { SPG.feelingsGame.next = 'balloon'; });
    await openGame(p, 'Feeling Friends'); await until(p, () => (SPG.feelingsGame.probe() || {}).phase === 'ask', 10000);
    await p.waitForTimeout(500); await shot(); await home(p);
  },
  petcare: async (p, shot) => {
    await p.evaluate(() => { SPG.store.active.data.care = { hunger: .7, dirt: 0, tired: .2, t: Date.now(), flags: {}, cares: 0, grime: [], knots: [], burrs: [] }; SPG.store.save(); });   // clean and a little hungry
    await openGame(p, 'Pet Care'); await p.waitForTimeout(2500); await shot(); await home(p); },
  shop: async (p, shot) => { await p.click('#hub-shop .shopfront', F); await p.waitForTimeout(1200); await shot(); await p.click('#btn-home, .ps-close, .shop-close', F).catch(() => {}); await p.waitForTimeout(400); },
};
