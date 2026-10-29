// Generates the Google Play listing graphics from the running app, at the sizes Play asks for:
//   store/screenshots/phone/     8 x 1080x1920  (phone, portrait 9:16; promotion needs 1080 px or more)
//   store/screenshots/tablet7/   8 x 1080x1920  (7-inch tablet, portrait 9:16)
//   store/screenshots/tablet10/  8 x 2560x1440  (10-inch tablet, landscape 16:9; both sides 1080 px or more)
//   store/feature-graphic.png    1024x500 (no transparency)
// Each screenshot is the real game with a short caption above it; the plain shots are kept in
// store/screenshots/raw/ (not committed). The 512 px Play icon comes from tools/make-icons.mjs.
// ONLY=phone,tablet7,tablet10,feature makes just those parts; FRAME_ONLY=1 re-captions the plain shots already made. Three plain shots are copied to screenshots/ for the web app manifest. Screenshots have no alpha channel.
// STORE_LANG=es (or hi, zh) plays the app in that language and writes the translated listing's graphics to store/<lang>/
// (screenshots/<device>/ and feature-graphic.png, captions from CAPTIONS below); by default only the phone set, since Play shows
// the English tablet screenshots where a language has none. (Not LANG: that one is the shell's own locale.)
//
// Needs Playwright:  npm i -D playwright && npx playwright install chromium
// Run from the repo root:  node tools/make-store-assets.mjs
// (Set CHROME_PATH to use an existing Chrome/Chromium instead of the one Playwright downloads.)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
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
const LANG = process.env.STORE_LANG || 'en', LOCALE = { en: 'en-US', es: 'es-MX', hi: 'hi-IN', zh: 'zh-CN' }[LANG];
if (!LOCALE) throw new Error(`STORE_LANG=${LANG}: no such language (es, hi, zh)`);
const DIR = LANG === 'en' ? 'store' : `store/${LANG}`;
await mkdir('screenshots', { recursive: true });
const F = { force: true };
// ONLY=phone,tablet7,tablet10,feature makes just those parts (default: everything)
const want = k => process.env.ONLY ? process.env.ONLY.split(',').includes(k) : LANG === 'en' || k === 'phone' || k === 'feature';

// What each device shows, in listing order (Play allows 8 per device type). The first three matter most.
const DEVICES = [
  { id: 'phone', w: 360, h: 640, dpr: 3, picks: ['hub', 'trace', 'kitchen', 'color', 'feelings', 'shop', 'rain', 'fishing'] },
  { id: 'tablet7', w: 675, h: 1200, dpr: 1.6, picks: ['hub', 'color', 'style', 'kitchen', 'shapes', 'clay', 'fishtank', 'caterpillars'] },
  { id: 'tablet10', w: 1280, h: 720, dpr: 2, picks: ['hub', 'kitchen', 'trace', 'garden', 'petcare', 'feelings', 'fire', 'fishtank'] },
];
// Captions are for the grown-up choosing the app, so they talk about what the child does, briefly.
const CAPTION = {
  hub: ['Gentle games for ages 2 to 7', 'Buy once. No ads. No in-app purchases.'],
  trace: ['Trace letters with a friendly bee'], find: ['Find the letter, hear its sound'],
  kitchen: ['Cook, build and decorate, then eat it up!'], color: ['95 pictures to color, inside the lines'],
  feelings: ['Name feelings and help friends feel better'], shop: ['Earn stars by playing, adopt a pet'],
  rain: ['Catch the rain, rescue the pets'], fishing: ['Go fishing with your very own pet'],
  style: ['Dress up, hair salon and nail art'], clay: ['Squish, roll and shape soft clay'],
  shapes: ['Build pictures from shapes'], fishtank: ['Feed the fish and watch them grow'],
  caterpillars: ['What comes next? Playful patterns'], petcare: ['Feed, wash and tuck in your pet'],
  garden: ['Dig, plant, water and watch it grow'], fire: ['Spray friendly flames, help the pets'],
  puzzle: ['Puzzles made from your own paintings'], band: ['Make music with the Bunny Band'], fruit: ['Swipe fruit with five fingers at once'],
};
// The same captions in the other store languages (keep the keys of CAPTION), and the feature graphic's tagline and pills.
const CAPTIONS = {
  es: {
    hub: ['Juegos tranquilos de 2 a 7 años', 'Pagas una vez. Sin anuncios. Sin compras en la app.'],
    trace: ['Traza letras con una abejita amiga'], find: ['Encuentra la letra y escucha su sonido'],
    kitchen: ['Cocina, arma y decora, ¡y luego a comer!'], color: ['95 dibujos para colorear sin salirse'],
    feelings: ['Nombra sentimientos y ayuda a tus amigos'], shop: ['Gana estrellas jugando y adopta una mascota'],
    rain: ['Atrapa la lluvia y rescata a las mascotas'], fishing: ['Ve a pescar con tu propia mascota'],
    style: ['Ropa, peluquería y uñas'], clay: ['Aplasta, enrolla y moldea plastilina'],
    shapes: ['Arma dibujos con figuras'], fishtank: ['Alimenta a los peces y míralos crecer'],
    caterpillars: ['¿Qué sigue? Patrones divertidos'], petcare: ['Alimenta, baña y arropa a tu mascota'],
    garden: ['Cava, siembra, riega y mira cómo crece'], fire: ['Apaga llamas amigables y ayuda a las mascotas'],
    puzzle: ['Rompecabezas con tus propios dibujos'], band: ['Haz música con la banda del conejito'], fruit: ['Corta fruta con cinco dedos a la vez'],
    feature: ['Juegos tranquilos para los más pequeños', 'Sin anuncios', 'Sin compras en la app', 'De 2 a 7 años'],
  },
  hi: {
    hub: ['2 से 7 साल के बच्चों के लिए प्यारे खेल', 'एक बार खरीदें। कोई विज्ञापन नहीं। ऐप में कोई खरीदारी नहीं।'],
    trace: ['प्यारी मधुमक्खी के साथ ABC लिखना सीखें'], find: ['अक्षर ढूँढें, उसकी आवाज़ सुनें'],
    kitchen: ['पकाएँ, बनाएँ, सजाएँ और फिर खा जाएँ!'], color: ['रंग भरने के लिए 95 चित्र, लाइनों के अंदर'],
    feelings: ['भावनाएँ पहचानें, दोस्तों की मदद करें'], shop: ['खेलकर तारे कमाएँ, पालतू दोस्त अपनाएँ'],
    rain: ['बारिश पकड़ें, पालतू जानवरों को बचाएँ'], fishing: ['अपने पालतू दोस्त के साथ मछली पकड़ें'],
    style: ['कपड़े, बालों का सैलून और नेल आर्ट'], clay: ['नरम मिट्टी को दबाएँ, बेलें और आकार दें'],
    shapes: ['आकारों से चित्र बनाएँ'], fishtank: ['मछलियों को खाना दें, उन्हें बड़ा होते देखें'],
    caterpillars: ['आगे क्या आएगा? मज़ेदार पैटर्न'], petcare: ['अपने पालतू को खिलाएँ, नहलाएँ और सुलाएँ'],
    garden: ['खोदें, बोएँ, पानी दें और बढ़ते देखें'], fire: ['प्यारी लपटें बुझाएँ, पालतू जानवरों की मदद करें'],
    puzzle: ['अपनी ही पेंटिंग से बनी पहेलियाँ'], band: ['खरगोश बैंड के साथ संगीत बनाएँ'], fruit: ['एक साथ पाँच उंगलियों से फल काटें'],
    feature: ['छोटे बच्चों के लिए प्यारे खेल', 'कोई विज्ञापन नहीं', 'कोई इन-ऐप खरीदारी नहीं', '2 से 7 साल'],
  },
  zh: {
    hub: ['适合 2 到 7 岁的温和小游戏', '一次购买。无广告。无应用内购买。'],
    trace: ['和小蜜蜂一起描英文字母'], find: ['找字母，听发音'],
    kitchen: ['做饭、搭配、装饰，然后吃光光！'], color: ['95 张图画，涂色不出线'],
    feelings: ['认识情绪，帮助朋友开心起来'], shop: ['玩游戏赚星星，领养宠物'],
    rain: ['接住雨水，救援宠物'], fishing: ['和你自己的宠物去钓鱼'],
    style: ['换装、美发沙龙和美甲'], clay: ['捏、搓、塑造软软的黏土'],
    shapes: ['用形状拼出图画'], fishtank: ['喂鱼，看着它们长大'],
    caterpillars: ['下一个是什么？有趣的规律'], petcare: ['喂宠物、给它洗澡、哄它睡觉'],
    garden: ['挖土、播种、浇水，看它长大'], fire: ['扑灭友好的火苗，帮助宠物'],
    puzzle: ['用你自己的画做成的拼图'], band: ['和兔子乐队一起玩音乐'], fruit: ['五根手指一起切水果'],
    feature: ['给小朋友的温和小游戏', '无广告', '无应用内购买', '2 到 7 岁'],
  },
};
const CAP = CAPTIONS[LANG] || Object.assign({ feature: ['Gentle games for little ones', 'No ads', 'No in-app purchases', 'Ages 2-7'] }, CAPTION);
const ORDER = ['hub', 'trace', 'find', 'fruit', 'rain', 'fire', 'garden', 'color', 'puzzle', 'band', 'shapes', 'style', 'fishtank', 'kitchen', 'fishing', 'clay', 'caterpillars', 'feelings', 'petcare', 'shop'];

async function freshApp(d) {
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: true, isMobile: d.w < 700, locale: LOCALE });
  const p = await ctx.newPage();
  await p.goto(base); await p.waitForTimeout(500);
  await p.locator('.name-btn').first().click(); await p.click('#setup-go'); await p.waitForTimeout(700);
  // a player who has been playing a while: some stars, and a bunny friend with a bow who shows up in Pet Care, Fishing and the Kitchen
  await p.evaluate(() => { const A = SPG.store.active; A.stars = 60; SPG.pets.adopt('bunny'); SPG.pets.rename('bunny', 'Biscuit'); SPG.pets.buyHat('bow'); SPG.pets.wear('bow'); A.stars = 37; SPG.store.save(); });
  return { ctx, p };
}
const GAMES = ['Letter Garden', 'Fruit Splash', 'Rain Bucket', 'Fire Rescue', 'Grow a Garden', 'Coloring Book', 'Puzzle Pond', 'Pet Care', 'Bunny Band', 'Shape Builder', 'Hide and Seek', 'Style Studio'];
// cards are labelled with the game's name in the app's language
const openGame = async (p, n) => { const name = await p.evaluate(n => SPG.t(n), typeof n === 'number' ? GAMES[n - 1] : n); await p.click(`.card[aria-label="${name}"]`, F); await p.waitForTimeout(900); };
const home = async p => { await p.click('#btn-home', F); await p.waitForTimeout(400); };
const until = async (p, fn, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(150); } return false; };

// Each scene leaves the app on the hub. `shot` saves the plain screenshot.
const SCENES = {
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
    let m = (await P()).menu.find(x => x.tab === 2); await p.mouse.click(m.x, m.y); await p.waitForTimeout(250);
    m = (await P()).menu.find(x => x.id === 'burger'); await p.mouse.click(m.x, m.y); await p.waitForTimeout(1200);
    await p.mouse.click(d.w / 2, d.h / 2); await p.waitForTimeout(2200);
    for (let guard = 0; guard < 120; guard++) {
      const q = await P(), st = q.st || {};
      if (q.screen === 'menu') break;
      if (q.trans || q.busy) { await p.waitForTimeout(200); continue; }
      if (q.step === 'serve') { await p.waitForTimeout(700); await shot(); break; }
      if (q.step === 'pick') { await p.mouse.click(q.cards[1].x, q.cards[1].y); await p.waitForTimeout(1500); continue; }
      if (q.step === 'grill') {
        if (st.placed < 1) { await p.mouse.click(q.tray[0].x, q.tray[0].y); await p.waitForTimeout(600); continue; }
        if (q.check) { await p.mouse.click(q.check.x, q.check.y); await p.waitForTimeout(300); }
        for (const u of st.units) if (u.state === 'flip') { await p.mouse.click(u.x, u.y); await p.waitForTimeout(300); }
        await p.waitForTimeout(400); continue;
      }
      if (q.step === 'build') {
        const items = q.tray.filter(t => !t.used), pick = items.filter(t => t.id !== st.end), want = q.idx === 3 ? [0, 1] : q.idx === 2 ? [0] : [0];
        if ((st.n || 0) < want.length && pick.length) { const it = pick[want[st.n || 0] % pick.length]; await p.mouse.click(it.x, it.y); await p.waitForTimeout(700); continue; }
        if (st.end) { const e = items.find(t => t.id === st.end); await p.mouse.click(e.x, e.y); await p.waitForTimeout(1500); continue; }
        if (q.check) { await p.mouse.click(q.check.x, q.check.y); await p.waitForTimeout(1500); }
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
    let q = await P(); await p.mouse.click(q.rod.x, q.rod.y); await p.waitForTimeout(400);
    const spot = q.spots.find(s => s.id === 'lily') || q.spots[0]; await p.mouse.click(spot.x, spot.y);
    await until(p, () => SPG.fishingGame.mode === 'bite', 30000);
    for (let i = 0; i < 8 && (await P()).mode !== 'card'; i++) { q = await P(); if (q.bob) await p.mouse.click(q.bob.x, q.bob.y); await p.waitForTimeout(350); }
    await until(p, () => SPG.fishingGame.mode === 'card'); await p.waitForTimeout(900); await shot(); await home(p);
  },
  // Clay Corner: a few lumps and a rainbow rope made with the clay tool
  clay: async (p, shot) => {
    await openGame(p, 'Clay Corner'); await p.waitForTimeout(900);
    const pr = await p.evaluate(() => SPG.clayGame.probe()), it = (k, id) => pr.items.find(i => i.kind === k && i.id === id);
    const at = (x, y) => [pr.board.x + x * pr.board.s, pr.board.y + y * pr.board.s];
    const click = async (k, id) => { await p.mouse.click(it(k, id).x, it(k, id).y); await p.waitForTimeout(90); };
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

// Frame a plain screenshot with a caption above it, at exactly the plain shot's size, with no transparency.
const TINTS = [['#fff1d6', '#ffd9e6'], ['#dff3ff', '#e9e3ff'], ['#e4f8dc', '#fff3c9'], ['#ffe3ec', '#e1f1ff'], ['#efe6ff', '#dcf6ec']];
async function frame(page, rawPath, outPath, cap, i) {
  const img = 'data:image/png;base64,' + (await readFile(rawPath)).toString('base64');
  const data = await page.evaluate(async ({ img, cap, tint }) => {
    await document.fonts.load('700 80px Fredoka'); await document.fonts.load('600 40px Fredoka');
    const im = new Image(); im.src = img; await im.decode();
    const W = im.width, H = im.height, land = W > H, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), u = Math.min(W, H) / 1080;
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, tint[0]); g.addColorStop(1, tint[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // soft confetti dots in the background
    const cols = ['#ff8aa3', '#ffd54a', '#7ed957', '#5cc8f2', '#b58cf0', '#ffa64d']; let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let k = 0; k < 46; k++) { c.globalAlpha = .28; c.fillStyle = cols[k % cols.length]; c.beginPath(); c.arc(rnd() * W, rnd() * H, (6 + rnd() * 14) * u, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    const capH = (land ? .17 : cap[1] ? .175 : .15) * H, pad = (land ? .03 : .028) * H, s = (H - capH - pad) / H, w = W * s, h = H * s, x = (W - w) / 2, y = capH;
    // the caption
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.fillStyle = '#4a3350';
    let fs = (land ? 88 : 74) * u; const maxW = W * .9;
    // one line if it fits, otherwise two lines of about equal width (no lonely last word)
    const lines = t => {
      if (c.measureText(t).width <= maxW) return [t];
      // Chinese has no spaces: it may break between any two characters, except before punctuation
      const sp = / /.test(t), words = sp ? t.split(' ') : [...t], j = sp ? ' ' : ''; let best = null;
      for (let k = 1; k < words.length; k++) { if (!sp && /[，。！？、：）]/.test(words[k])) continue; const L = [words.slice(0, k).join(j), words.slice(k).join(j)], m = Math.max(...L.map(l => c.measureText(l).width)); if (!best || m < best.m) best = { L, m }; }
      return best && best.m <= maxW ? best.L : null;
    };
    c.font = `700 ${fs}px Fredoka, system-ui`; let L = lines(cap[0]);
    while (!L) { fs *= .94; c.font = `700 ${fs}px Fredoka, system-ui`; L = lines(cap[0]); }
    const sub = cap[1] ? 44 * u * (land ? 1.15 : 1) : 0, blockH = L.length * fs * 1.12 + (sub ? sub * 1.6 : 0);
    let ty = (capH - blockH) / 2 + fs * .56;
    for (const l of L) { c.fillText(l, W / 2, ty); ty += fs * 1.12; }
    if (sub) { c.font = `600 ${sub}px Fredoka, system-ui`; c.fillStyle = '#7a5a80'; c.fillText(cap[1], W / 2, ty - fs * .56 + sub * 1.0); }
    // the game, with rounded corners, a white edge and a soft shadow
    const r = 44 * u, rr = (X, Y, Wd, Hd, R) => { c.beginPath(); c.moveTo(X + R, Y); c.arcTo(X + Wd, Y, X + Wd, Y + Hd, R); c.arcTo(X + Wd, Y + Hd, X, Y + Hd, R); c.arcTo(X, Y + Hd, X, Y, R); c.arcTo(X, Y, X + Wd, Y, R); c.closePath(); };
    const e = 10 * u;
    c.save(); c.shadowColor = 'rgba(74,51,80,.28)'; c.shadowBlur = 40 * u; c.shadowOffsetY = 14 * u; c.fillStyle = '#fff'; rr(x - e, y - e, w + 2 * e, h + 2 * e, r + e); c.fill(); c.restore();
    c.save(); rr(x, y, w, h, r); c.clip(); c.drawImage(im, x, y, w, h); c.restore();
    cv.id = 'framed'; cv.style.cssText = 'position:fixed;z-index:2147483647;left:0;top:0;width:' + W + 'px;height:' + H + 'px'; document.querySelector('#framed')?.remove(); document.body.append(cv);
    return { W, H };
  }, { img, cap, tint: TINTS[i % TINTS.length] });
  // a page screenshot (not the canvas's own PNG) so the file has no alpha channel, as Play asks
  await page.setViewportSize({ width: data.W, height: data.H });
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: data.W, height: data.H } });
}

for (const d of DEVICES.filter(d => want(d.id))) {
  const raw = `store/screenshots/raw/${LANG === 'en' ? '' : LANG + '/'}${d.id}`, out = `${DIR}/screenshots/${d.id}`;
  await mkdir(raw, { recursive: true }); await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
  const { ctx, p } = await freshApp(d);
  for (const id of process.env.FRAME_ONLY ? [] : ORDER.filter(k => d.picks.includes(k))) {
    try { await SCENES[id](p, () => p.screenshot({ path: `${raw}/${id}.png` }), d); }
    catch (e) { console.log(`${d.id} ${id}: ${e.message.split('\n')[0]} (see ${raw}/${id}-failed.png)`); await p.screenshot({ path: `${raw}/${id}-failed.png` }).catch(() => {}); await p.evaluate(() => SPG.app.closeGame && SPG.app.closeGame()).catch(() => {}); }
  }
  await ctx.close();
  const fp = await browser.newPage({ deviceScaleFactor: 1 }); await fp.goto(base); await fp.waitForTimeout(300);
  for (const [i, id] of d.picks.entries()) await frame(fp, `${raw}/${id}.png`, `${out}/${i + 1}-${id}.png`, CAP[id], i);
  await fp.close();
  console.log(`${d.id}: ${d.picks.length} screenshots at ${d.w * d.dpr}x${d.h * d.dpr}`);
}

// Feature graphic 1024x500 (no transparency): the sprout mascot, the name, and a few friends from the games
if (want('feature')) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 600 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); await p.goto(base); await p.waitForTimeout(500);
  const [tagline, ...pills] = CAP.feature;
  const mascot = 'data:image/svg+xml;base64,' + (await readFile('icons/sprout.svg')).toString('base64');
  await p.evaluate(async ({ mascot, tagline, pills }) => {
    await document.fonts.load('700 84px Fredoka'); await document.fonts.load('600 30px Fredoka');
    document.body.replaceChildren(); document.body.style.cssText = 'position:static;background:#fff;overflow:visible';
    const cv = document.createElement('canvas'); cv.id = 'fg'; cv.width = 1024; cv.height = 500; document.body.append(cv);
    const c = cv.getContext('2d'), A = SPG.art, W = 1024, H = 500;
    A.scene(c, W, H, 2.5, { showSun: true, clouds: true });
    // a rainbow behind the mascot
    c.lineCap = 'round';
    ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#a48cf5'].forEach((col, i) => { c.strokeStyle = col; c.globalAlpha = .8; c.lineWidth = 15; c.beginPath(); c.arc(190, 430, 190 - i * 15, Math.PI, Math.PI * 2); c.stroke(); });
    c.globalAlpha = 1;
    const im = new Image(); im.src = mascot; await im.decode();
    c.save(); c.shadowColor = 'rgba(40,90,50,.25)'; c.shadowBlur = 18; c.shadowOffsetY = 8; c.drawImage(im, 52, 44, 420 * 300 / 436, 420); c.restore();
    // friends from the games on the right
    c.save(); c.translate(948, 476); SPG.pets.draw(c, 'bunny', 150, 1.2, { mood: 'cheer', hat: 'bow' }); c.restore();
    c.save(); c.translate(905, 92); c.rotate(-.2); A.fruit(c, 2, 40, { mood: 'wow' }); c.restore();
    c.save(); c.translate(985, 190); c.rotate(.15); A.fruit(c, 1, 32); c.restore();
    c.save(); c.translate(842, 205); A.bee(c, 22, 1); c.restore();
    // the name
    c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    for (const [txt, y] of [['Little Sprout', 168], ['Park', 252]]) { c.font = '700 86px Fredoka, system-ui'; c.lineWidth = 16; c.strokeStyle = '#fff'; c.strokeText(txt, 372, y); c.fillStyle = '#4a3350'; c.fillText(txt, 372, y); }
    let fs = 32; do c.font = `600 ${fs}px Fredoka, system-ui`; while (c.measureText(tagline).width > 620 && --fs > 20);
    c.lineWidth = 9; c.strokeStyle = '#fff'; c.strokeText(tagline, 376, 312); c.fillStyle = '#4a3350'; c.fillText(tagline, 376, 312);
    // what grown-ups look for, in little pills
    let x = 376; fs = 22; do c.font = `600 ${fs}px Fredoka, system-ui`; while (pills.reduce((a, t) => a + c.measureText(t).width + 40, 0) > 630 && --fs > 15);
    for (const [txt, col] of pills.map((t, i) => [t, ['#ff8aa3', '#5cc8f2', '#7ed957'][i]])) {
      const w = c.measureText(txt).width + 30; c.fillStyle = '#fff'; A.rr(c, x, 342, w, 42, 21); c.fill(); c.strokeStyle = col; c.lineWidth = 4; A.rr(c, x, 342, w, 42, 21); c.stroke();
      c.fillStyle = '#4a3350'; c.fillText(txt, x + 15, 371); x += w + 10;
    }
  }, { mascot, tagline, pills });
  await mkdir(DIR, { recursive: true }); await (await p.$('#fg')).screenshot({ path: `${DIR}/feature-graphic.png` });
  await ctx.close();
}

if (LANG === 'en' && want('phone') && want('tablet10')) {
  await copyFile('store/screenshots/raw/phone/hub.png', 'screenshots/phone-1-hub.png');
  await copyFile('store/screenshots/raw/phone/trace.png', 'screenshots/phone-2-trace.png');
  await copyFile('store/screenshots/raw/tablet10/garden.png', 'screenshots/tablet-1-garden.png');
}
await browser.close(); server.close();
console.log(`Store graphics written to ${DIR}/${LANG === 'en' ? ' and screenshots/' : ''}.`);
