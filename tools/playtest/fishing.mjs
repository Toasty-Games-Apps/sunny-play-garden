// Fishing Pond: taps the rod, casts at every spot, waits for the bite, reels in, and checks the fish book. usage: node fishing.mjs [W H age]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8296';
const W = +process.argv[2] || 1280, Hh = +process.argv[3] || 800, age = +process.argv[4] || 5;
const b = await start(); const page = await newPage(b, W, Hh); await login(page, { age });
await openGame(page, 'Fishing Pond'); await page.waitForTimeout(800);
const P = () => page.evaluate(() => SPG.fishingGame.probe());
let pr = await P(), fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const waitMode = async (m, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await P()).mode === m) return true; await page.waitForTimeout(100); } return false; };
const shot = async n => { await page.waitForTimeout(120); await page.screenshot({ path: `${SP}/fish-${n}.png` }); };
await shot('0-idle');
// tapping a spot before the rod does nothing
await page.mouse.click(pr.spots[0].x, pr.spots[0].y); ok((await P()).mode === 'idle', 'a spot does nothing before the rod is tapped');
const kinds = new Set();
for (const sp of pr.spots) {
  await page.mouse.click(pr.rod.x, pr.rod.y); ok((await P()).mode === 'ready', 'the rod gets ready'); if (sp === pr.spots[0]) await shot('1-ready');
  await page.mouse.click(sp.x, sp.y); ok(await waitMode('wait'), 'a cast lands at ' + sp.id); if (sp === pr.spots[1]) await shot('2-wait');
  ok(await waitMode('bite'), 'a fish bites at ' + sp.id); if (sp === pr.spots[1]) await shot('3-bite');
  const f = (await P()).fish; kinds.add(f); const spec = { reeds: ['bass', 'bluegill'], lilies: ['goldfish', 'carp'], rocks: ['trout', 'perch'], deep: ['catfish', 'salmon'], sand: ['minnow', 'perch', 'bluegill'] }[sp.id]; ok(spec.includes(f), sp.id + ' gave ' + f);
  const taps = (await P()).taps; for (let k = 0; k < taps; k++) { await page.mouse.click(pr.w * .5, pr.h * .5); await page.waitForTimeout(250); }
  ok(await waitMode('card', 8000), 'the fish is shown (' + sp.id + ')'); if (sp === pr.spots[0]) await shot('4-card');
  await page.mouse.click(pr.w / 2, pr.h / 2); await page.waitForTimeout(200); ok((await P()).mode === 'idle', 'back to the start');
}
const after = await P(); ok(after.total === pr.spots.length, 'every fish counted (' + after.total + ')');
await page.mouse.click(pr.book.x, pr.book.y); await page.waitForTimeout(200); await shot('5-book'); ok((await P()).mode === 'book', 'the fish book opens'); await page.mouse.click(pr.w / 2, pr.h / 2); ok((await P()).mode !== 'book', 'the book closes');
ok(page.errs.length === 0, 'no page errors ' + page.errs.join('|'));
console.log(fails ? fails + ' FAILED' : 'Fishing Pond OK', W + 'x' + Hh, 'age', age, [...kinds].join(',')); stop(b);
