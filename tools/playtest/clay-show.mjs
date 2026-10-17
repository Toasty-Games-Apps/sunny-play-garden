// Clay Corner showcase: builds a few creations with real mouse gestures and screenshots each step. usage: node clay-show.mjs [W H]   (SHOTS = where the pictures go)
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8317';
const W = +process.argv[2] || 1280, Hh = +process.argv[3] || 800, tag = process.argv[4] || (W > Hh ? 'tablet' : 'phone');
const b = await start(); const page = await newPage(b, W, Hh); await login(page, { age: 6 });
await openGame(page, 'Clay Corner'); await page.waitForTimeout(900);
const P = () => page.evaluate(() => SPG.clayGame.probe());
const pr = await P(); const bx = pr.board.x, by = pr.board.y, bs = pr.board.s, it = (k, id) => pr.items.find(i => i.kind === k && i.id === id);
const click = async (k, id) => { await page.mouse.click(it(k, id).x, it(k, id).y); await page.waitForTimeout(90); };
const at = (x, y) => [bx + x * bs, by + y * bs];
const drag = async (pts, steps = 10) => { await page.mouse.move(...at(...pts[0])); await page.mouse.down(); for (const p of pts.slice(1)) { await page.mouse.move(...at(...p), { steps }); await page.waitForTimeout(25); } await page.mouse.up(); await page.waitForTimeout(90); };
const tap = async (x, y) => { await page.mouse.click(...at(x, y)); await page.waitForTimeout(120); };
const hold = async (x, y, ms) => { await page.mouse.move(...at(x, y)); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(100); };
const size = n => page.evaluate(n => { SPG.clayGame.size = n; }, n);
const pick = async (tool, idx) => { await click('tool', tool); const L = await page.evaluate(() => SPG.clayGame.menuLayout()); await page.mouse.click(L.x + L.pad + (idx % L.cols + .5) * L.os, L.y + L.pad + (Math.floor(idx / L.cols) + .5) * L.os); await page.waitForTimeout(80); };
const shot = async n => { await page.waitForTimeout(450); await page.screenshot({ path: `${SP}/${tag}-${n}.png` }); };
const clear = async () => { await click('act', 'bin'); const bb = await page.evaluate(() => SPG.clayGame.confirmBtns()); await page.mouse.click(bb.yes.x, bb.yes.y); await page.waitForTimeout(200); };
const COL = { red: 0, orange: 1, yellow: 2, lime: 3, green: 4, teal: 5, sky: 6, blue: 7, purple: 8, pink: 9, brown: 10, white: 11, black: 12, rainbow: 13 };
await shot('01-start');
// 1. balls, a rope and a rainbow rope
await click('tool', 'clay');
await click('color', COL.red); await size(2); await tap(.2, .22); await click('color', COL.yellow); await size(1); await tap(.45, .2); await click('color', COL.sky); await size(0); await tap(.65, .2); await click('color', COL.green); await size(1); await tap(.84, .22);
await click('color', COL.purple); await size(1); await drag([[.1, .56], [.25, .5], [.4, .6], [.55, .52]]); await click('color', COL.rainbow); await drag([[.12, .8], [.3, .74], [.5, .84], [.7, .76], [.88, .82]]);
await shot('02-balls-ropes');
// 2. squish and roll
await clear(); await click('color', COL.pink); await size(2); await tap(.28, .32); await tap(.72, .32);
await click('tool', 'squish'); await hold(.28, .32, 1500); await shot('03-squish');
await click('tool', 'roll'); await drag([[.58, .32], [.86, .34]], 14); await drag([[.58, .32], [.86, .34]], 14); await drag([[.72, .2], [.74, .48]], 14); await shot('04-rolled');
// 3. cookie cutters and stamps
await clear(); await click('color', COL.yellow); await size(2); await tap(.5, .5); await click('tool', 'squish'); await hold(.5, .5, 3200);
await pick('cutters', 3); await size(0); await tap(.3, .4); await pick('cutters', 2); await tap(.5, .38); await pick('cutters', 6); await tap(.7, .4); await pick('cutters', 4); await tap(.4, .58); await pick('cutters', 7); await tap(.62, .6);
await page.waitForTimeout(600); await shot('05-cutters');
const st = await P(); const sx = st.cent.slice(-5); while (sx.length < 5) sx.push(sx[0] || [.5, .5]);
await pick('stamps', 4); await size(0); for (const c of sx.slice(0, 2)) await tap(c[0], c[1]); await pick('stamps', 0); for (const c of sx.slice(2, 4)) await tap(c[0], c[1]); await pick('stamps', 6); await tap(sx[4][0], sx[4][1]);
await shot('06-stamps');
// 4. a clay kitty
await clear(); await click('tool', 'clay'); await click('color', COL.orange); await size(2); await tap(.5, .66); await tap(.5, .4);
await click('color', COL.white); await size(1); await tap(.5, .7);
await click('tool', 'pinch'); await size(2); await drag([[.43, .32], [.38, .16]], 10); await drag([[.57, .32], [.62, .16]], 10);
await click('tool', 'clay'); await click('color', COL.orange); await size(0); await drag([[.62, .74], [.74, .72], [.82, .6], [.8, .5]]);
await click('color', COL.black); await size(0); await drag([[.455, .5], [.5, .53], [.545, .5]], 6);
await pick('extras', 0); await size(1); await tap(.44, .4); await tap(.56, .4);
await click('color', COL.pink); await pick('extras', 1); await size(0); await tap(.5, .46);
await pick('extras', 3); await size(2); await tap(.2, .82); await tap(.82, .85);
await shot('07-kitty');
// 5. knife and pull
await clear(); await click('tool', 'clay'); await click('color', COL.teal); await size(2); await tap(.3, .35); await click('color', COL.purple); await tap(.7, .35);
await click('tool', 'knife'); await drag([[.12, .3], [.5, .4]], 8); await drag([[.58, .2], [.84, .5]], 8);
await click('tool', 'pull'); await size(2); await drag([[.2, .46], [.2, .75]], 12); await drag([[.8, .4], [.9, .7]], 12);
await click('tool', 'poke'); await size(1); await hold(.3, .3, 150); await hold(.7, .3, 150);
await shot('08-knife-pull');
console.log('done', JSON.stringify(await P()).slice(0, 120)); stop(b);
