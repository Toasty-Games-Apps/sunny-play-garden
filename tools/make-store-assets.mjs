// Generates Google Play listing graphics from the running app: phone + tablet screenshots, a feature graphic,
// and the 512px icon. Output goes to store/ (not published) and three small copies to screenshots/ (used by the
// web app manifest).
//
// Needs Playwright:  npm i -D playwright && npx playwright install chromium
// Run from the repo root:  node tools/make-store-assets.mjs
// (Set CHROME_PATH to use an existing Chrome/Chromium instead of the one Playwright downloads.)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = process.cwd();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, path === '/' ? 'index.html' : path);
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(0);
const base = `http://localhost:${server.address().port}/index.html`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
await mkdir('store/screenshots', { recursive: true }); await mkdir('screenshots', { recursive: true });
const F = { force: true };

async function freshApp(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: width < 700 });
  const p = await ctx.newPage();
  await p.goto(base); await p.waitForTimeout(500);
  await p.locator('.name-btn').first().click(); await p.click('#setup-go'); await p.waitForTimeout(700);
  return { ctx, p };
}
const shot = (p, name) => p.screenshot({ path: `store/screenshots/${name}.png` });
const GAMES = ['Letter Garden', 'Fruit Splash', 'Rain Bucket', 'Fire Rescue', 'Grow a Garden', 'Coloring Book', 'Puzzle Pond', 'Pet Care', 'Bunny Band', 'Shape Builder', 'Hide and Seek', 'Style Studio'];
const openGame = async (p, n) => { await p.click(`.card[aria-label="${GAMES[n - 1]}"]`, F); await p.waitForTimeout(900); };
const home = async p => { await p.click('#btn-home', F); await p.waitForTimeout(400); };

for (const [kind, w, h] of [['phone', 540, 960], ['tablet', 960, 600]]) {
  const { ctx, p } = await freshApp(w, h);
  await p.waitForTimeout(400); await shot(p, `${kind}-1-hub`);

  // Letter tracing, part way through a letter
  await openGame(p, 1); await p.click('.lg-mode.m0', F); await p.waitForTimeout(300); await p.click('.lg-tile:nth-child(19)', F); await p.waitForTimeout(900);
  await p.evaluate(async () => {
    const t = SPG.app.running().inst.tracer, cv = t.canvas, r = cv.getBoundingClientRect(), st = t.g.strokes[0];
    const ev = (type, q) => cv.dispatchEvent(new PointerEvent(type, { clientX: r.left + t.ox + q.x * t.k, clientY: r.top + t.oy + q.y * t.k, pointerId: 1, pointerType: 'touch', bubbles: true }));
    ev('pointerdown', st.pts[0]); for (let i = 1; i < Math.floor(st.pts.length * .6); i++) { ev('pointermove', st.pts[i]); await new Promise(r => setTimeout(r, 6)); }
  });
  await p.waitForTimeout(250); await shot(p, `${kind}-2-trace`);
  await p.click('.lg-back', F); await p.click('.lg-mode.m2', F); await p.waitForTimeout(900); await shot(p, `${kind}-3-find`);
  await home(p);

  // Fruit Splash
  await openGame(p, 2); await p.waitForTimeout(1200);
  await p.evaluate(() => { const g = SPG.app.running().inst; g.fruits.length = 0; g.starIn = 999; g.spawnIn = 99; [[.2, .55, 0], [.4, .4, 2], [.62, .5, 3], [.8, .38, 1], [.5, .72, 5]].forEach(([x, y, t]) => g.fruits.push({ x: g.w * x, y: g.h * y, vx: 0, vy: 0, r: Math.min(g.w, g.h) * .11, type: t, rotation: 0, vr: 0, wow: 0, blink: 9 })); });
  await p.waitForTimeout(200); await shot(p, `${kind}-4-fruit`); await home(p);

  // Rain Bucket: cats and dogs
  await openGame(p, 3);
  await p.evaluate(() => SPG.app.running().inst.startPets()); await p.waitForTimeout(9500); await shot(p, `${kind}-5-rain-pets`); await home(p);

  // Fire Rescue: the hose on a flame, a pet waiting
  await openGame(p, 4); await p.waitForTimeout(1600);
  await p.evaluate(() => { const g = SPG.app.running().inst; g.aim.x = g.w * .45; g.aim.y = g.h * .55; g.aim.down = true; });
  await p.waitForTimeout(500); await shot(p, `${kind}-5b-fire`);
  await p.evaluate(() => { SPG.app.running().inst.aim.down = false; }); await home(p);

  // Garden with plants and friends
  await openGame(p, 5);
  await p.evaluate(() => { const g = SPG.app.running().inst; g.bag.blooms = 12; g.resize(); const types = ['sunflower', 'tulip', 'daisy', 'strawberry', 'pumpkin', 'carrot', 'lavender', 'rose']; for (let i = 0; i < g.slotCount(); i++) g.plots[i] = Object.assign(g.plots[i], i === 9 ? { kind: 'hole', level: 2 } : { kind: 'plant', type: types[i % 8], stage: i % 5 === 4 ? 1 : 3, loose: false }); ['bee', 'bird', 'bunny', 'hedgehog', 'butterfly', 'dragonfly'].forEach((k, i) => { const s = g.slot(i * 2 % g.slotCount()); g.spawnCreature(k, s.x + 30, s.y - 20); }); g.ambientUntil = 1e15; });
  await p.waitForTimeout(900); await shot(p, `${kind}-6-garden`); await home(p);

  // Coloring Book: a picture part way through
  await openGame(p, 6); await p.waitForTimeout(500);
  await p.evaluate(() => { const g = SPG.app.running().inst; g.open(SPG.pictures[4]); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const g = SPG.app.running().inst; g.ops = [[0, 'sky', 6], [0, 'sun', 2], [0, 'bank', 3], [0, 'pond', 7], [0, 'pad', 3], [0, 'body', 4], [0, 'head', 4], [0, 'eyes', 1]]; g.redraw(); });
  await p.waitForTimeout(300); await shot(p, `${kind}-7-color`); await home(p);

  // The newer games, one picture each
  for (const [n, tag] of [[9, '9-band'], [10, '9b-shapes'], [7, '9c-puzzle'], [11, '9d-hide'], [12, '9e-style']]) { await openGame(p, n); await p.waitForTimeout(1600); await shot(p, `${kind}-${tag}`); await home(p); }
  const openNamed = async n => { await p.click(`.card[aria-label="${n}"]`, F); await p.waitForTimeout(900); };
  // a lived-in fish tank: grown fish of every kind, decorations, a snail helper
  await p.evaluate(() => { const fish = ['guppy', 'clown', 'angel', 'puffer', 'guppy', 'clown', 'angel'].map((sp, i) => ({ sp, stage: i % 3 === 0 ? 1 : 2, meals: 12 })); SPG.store.active.data.aquarium = { coins: 40, fish, food: 1, more: 1, snail: 1, power: 0, decor: ['castle', 'chest', 'weed', 'shell'], defeated: 1, since: 0, seen: 1, firstCoin: 1 }; SPG.store.save(); });
  for (const [n, tag] of [['Sprout Kitchen', '9f-kitchen'], ['Fishing Pond', '9g-fishing'], ['Fish Tank', '9h-fishtank']]) { await openNamed(n); await p.waitForTimeout(2500); await shot(p, `${kind}-${tag}`); await home(p); }

  // Clay Corner: a few lumps and a rainbow rope made with the clay tool
  await openNamed('Clay Corner'); await p.waitForTimeout(900);
  {
    const pr = await p.evaluate(() => SPG.clayGame.probe()), it = (k, id) => pr.items.find(i => i.kind === k && i.id === id);
    const at = (x, y) => [pr.board.x + x * pr.board.s, pr.board.y + y * pr.board.s];
    const click = async (k, id) => { await p.mouse.click(it(k, id).x, it(k, id).y); await p.waitForTimeout(90); };
    const size = n => p.evaluate(n => { SPG.clayGame.size = n; }, n);
    await click('tool', 'clay');
    for (const [col, sz, x, y] of [[0, 2, .25, .3], [2, 1, .5, .25], [6, 2, .74, .32], [9, 1, .35, .55], [4, 0, .62, .55]]) { await click('color', col); await size(sz); await p.mouse.click(...at(x, y)); await p.waitForTimeout(150); }
    await click('color', 13); await size(1); await p.mouse.move(...at(.12, .78)); await p.mouse.down();
    for (const [x, y] of [[.3, .72], [.5, .84], [.7, .74], [.88, .8]]) await p.mouse.move(...at(x, y), { steps: 10 });
    await p.mouse.up(); await p.waitForTimeout(600);
  }
  await shot(p, `${kind}-9i-clay`); await home(p);

  // Pet Shop: a friend at home with a hat
  await p.evaluate(() => { SPG.store.active.stars = 40; SPG.pets.adopt('bunny'); SPG.pets.rename('bunny', 'Biscuit'); SPG.pets.buyHat('bow'); SPG.pets.wear('bow'); SPG.store.save(); });
  await p.click('#hub-shop .shopfront', F); await p.waitForTimeout(1200); await shot(p, `${kind}-8-shop`);
  await ctx.close();
}

// Feature graphic 1024x500, drawn with the app's own artwork
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 600 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); await p.goto(base); await p.waitForTimeout(500);
  await p.evaluate(async () => {
    await document.fonts.load('700 72px Fredoka'); await document.fonts.load('600 30px Fredoka');
    document.body.replaceChildren(); document.body.style.cssText = 'position:static;background:#fff;overflow:visible';
    const cv = document.createElement('canvas'); cv.id = 'fg'; cv.width = 1024; cv.height = 500; document.body.append(cv);
    const c = cv.getContext('2d'), A = SPG.art, W = 1024, H = 500;
    A.scene(c, W, H, 2.5, { showSun: true, clouds: true });
    [['#ff6b81', 0], ['#ffa64d', 1], ['#ffe066', 2], ['#7ed957', 3], ['#5cc8f2', 4], ['#8a7cf0', 5]].forEach(([col, i]) => { c.strokeStyle = col; c.globalAlpha = .55; c.lineWidth = 16; c.beginPath(); c.arc(700, 520, 330 - i * 15, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); }); c.globalAlpha = 1;
    // garden row
    [[560, 'pumpkin', 190], [690, 'sunflower', 300], [820, 'tulip', 250], [930, 'daisy', 240]].forEach(([x, t, s]) => { c.fillStyle = '#8d6a50'; c.beginPath(); c.ellipse(x, 488, 58, 14, 0, 0, 7); c.fill(); c.save(); c.translate(x, 484); A.plant(c, t, 3, s, 0); c.restore(); });
    // sky: fruit, parachuting cat, bee
    c.save(); c.translate(620, 110); c.rotate(-.2); A.fruit(c, 2, 46, { mood: 'wow' }); c.restore();
    c.save(); c.translate(730, 70); c.rotate(.3); A.fruit(c, 3, 36); c.restore();
    c.save(); c.translate(820, 130); c.rotate(.15); A.fruit(c, 1, 42, { mood: 'wow' }); c.restore();
    c.save(); c.translate(940, 150); A.pet(c, 'cat', 0, 34, 1, 'fall', 0); c.restore();
    c.save(); c.translate(520, 250); A.bee(c, 24, 1); c.restore();
    // title
    c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    for (const [txt, y] of [['Little Sprout', 150], ['Park', 230]]) { c.font = '700 84px Fredoka, system-ui'; c.lineWidth = 16; c.strokeStyle = '#fff'; c.strokeText(txt, 48, y); c.fillStyle = '#5a3f5e'; c.fillText(txt, 48, y); }
    c.font = '600 30px Fredoka, system-ui'; c.lineWidth = 8; c.strokeStyle = '#fff'; c.strokeText('Gentle games for little ones', 52, 290); c.fillStyle = '#5a3f5e'; c.fillText('Gentle games for little ones', 52, 290);
    // letter tiles
    [['A', '#ff7a8a', -.1], ['b', '#4fb3e8', .05], ['C', '#59b96e', -.05]].forEach(([ch, col, rot], i) => { c.save(); c.translate(90 + i * 110, 395); c.rotate(rot); c.fillStyle = '#fff'; A.rr(c, -46, -62, 92, 124, 20); c.fill(); const g = SPG.glyphs.get(ch), sz = 74; SPG.glyphs.draw(c, ch, -g.w * sz / 200, -46, sz, { color: col, width: 14 }); c.restore(); });
  });
  await (await p.$('#fg')).screenshot({ path: 'store/feature-graphic.png' });
  await ctx.close();
}

await copyFile('icons/icon-512.png', 'store/icon-512.png');
await copyFile('store/screenshots/phone-1-hub.png', 'screenshots/phone-1-hub.png');
await copyFile('store/screenshots/phone-2-trace.png', 'screenshots/phone-2-trace.png');
await copyFile('store/screenshots/tablet-6-garden.png', 'screenshots/tablet-1-garden.png');
await browser.close(); server.close();
console.log('Store graphics written to store/ and screenshots/.');
