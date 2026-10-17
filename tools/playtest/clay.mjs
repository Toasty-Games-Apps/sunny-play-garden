// Clay Corner: plays the real game with the mouse (ball, rope, squish, roll, pull, knife, cutter, stamp, poke, eyes, hand + bin, camera, album, undo, keep-between-visits).
// usage: node clay.mjs [W H age]   (PORT and SHOTS as for the other scripts)
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8278';
const W = +process.argv[2] || 1280, Hh = +process.argv[3] || 800, age = +process.argv[4] || 6;
const b = await start(); const page = await newPage(b, W, Hh); await login(page, { age });
await openGame(page, 'Clay Corner'); await page.waitForTimeout(800);
const P = () => page.evaluate(() => SPG.clayGame.probe());
const pr = await P(); let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const bx = pr.board.x, by = pr.board.y, bs = pr.board.s, it = (k, id) => pr.items.find(i => i.kind === k && i.id === id);
const click = async (k, id) => { const i = it(k, id); ok(i, 'button ' + k + ':' + id); if (i) { await page.mouse.click(i.x, i.y); await page.waitForTimeout(90); } };
const drag = async (pts, steps = 8) => { await page.mouse.move(bx + pts[0][0] * bs, by + pts[0][1] * bs); await page.mouse.down(); for (const p of pts.slice(1)) { await page.mouse.move(bx + p[0] * bs, by + p[1] * bs, { steps }); await page.waitForTimeout(30); } await page.mouse.up(); await page.waitForTimeout(80); };
const hold = async (x, y, ms) => { await page.mouse.move(bx + x * bs, by + y * bs); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(80); };
const tap = async (x, y) => { await page.mouse.click(bx + x * bs, by + y * bs); await page.waitForTimeout(100); };
const setSize = n => page.evaluate(n => { SPG.clayGame.size = n; }, n);
const pick = async (tool, idx) => { await click('tool', tool); const L = await page.evaluate(() => SPG.clayGame.menuLayout()); await page.mouse.click(L.x + L.pad + (idx % L.cols + .5) * L.os, L.y + L.pad + (Math.floor(idx / L.cols) + .5) * L.os); await page.waitForTimeout(80); };
const shot = async n => { await page.waitForTimeout(200); await page.screenshot({ path: `${SP}/clay-${n}.png` }); };
ok(pr.items.every(i => i.x - i.r >= 0 && i.y - i.r >= 0 && i.x + i.r <= pr.w && i.y + i.r <= pr.h), 'every button is on screen');
await shot('0-empty');
// balls and a rope
await click('color', 9); await setSize(2); await tap(.25, .3); let s = await P(); ok(s.pieces === 1, 'a ball appears where tapped');
await click('color', 7); await setSize(1); await tap(.55, .28); await click('color', 2); await tap(.8, .3);
await click('color', 13); await setSize(1); await drag([[.12, .62], [.25, .56], [.4, .66], [.52, .58]], 10); s = await P(); ok(s.pieces === 4, 'a rope is one piece (' + s.pieces + ')'); await shot('1-balls-rope');
// squish the yellow ball flat, then cut a star from it
await click('tool', 'squish'); await hold(.8, .3, 1600); s = await P(); ok(s.thin < .5, 'squish flattens (' + s.thin.toFixed(2) + ')');
await shot('2-squish');
await pick('cutters', 3); await setSize(1); await tap(.8, .3); s = await P(); ok(s.holes === 1 && s.pieces === 5, 'the cutter makes a hole and a cookie (' + s.holes + ' holes, ' + s.pieces + ' pieces)'); await page.waitForTimeout(500); await shot('3-cut-star');
// stamp on the flat piece, poke the blue ball
if (age >= 4) { await pick('stamps', 4); await tap(.8, .38); s = await P(); ok(s.dents >= 1, 'a stamp leaves a mark'); await click('tool', 'poke'); await hold(.55, .28, 200); s = await P(); ok(s.dents >= 2, 'a poke makes a dent'); }
// roll the pink ball out, pull the blue ball, knife
await click('tool', 'roll'); await drag([[.12, .3], [.4, .34]], 14); await shot('4-roll');
await click('tool', 'pull'); const a0 = (await P()).clay; await drag([[.55, .3], [.62, .55]], 10); ok((await P()).clay >= a0 * .8, 'pull stretches a piece');
if (age >= 4) { await click('tool', 'knife'); const p0 = (await P()).pieces; await drag([[.05, .62], [.6, .62]], 6); ok((await P()).pieces >= p0 + 1, 'the knife cuts the rope in two'); }
// eyes and beads, hand, bin
await pick('extras', 0); await tap(.58, .22); await tap(.64, .22); s = await P(); ok(s.beads === 2, 'eyes go on');
await click('tool', 'hand'); const before = (await P()).pieces; await drag([[.25, .32], [.28, .8]], 10); await shot('5-moved');
const bin = it('act', 'bin'); await page.mouse.move(bx + .28 * bs, by + .8 * bs); await page.mouse.down(); await page.mouse.move(bin.x, bin.y, { steps: 14 }); await page.mouse.up(); await page.waitForTimeout(150); ok((await P()).pieces === before - 1 || (await P()).pieces < before, 'dropping a piece on the bin throws it away');
await shot('6-final');
const u = (await P()).undo; ok(u > 0, 'undo steps are kept (' + u + ')'); const pc = (await P()).pieces; await click('act', 'undo'); ok((await P()).undo === u - 1, 'undo took one step back');
await page.evaluate(() => { SPG.clayGame.camUntil = 0; }); await click('act', 'camera'); await page.waitForTimeout(900);
await click('act', 'album'); await page.waitForTimeout(600); let al = (await P()).album; ok(al && al.n >= 1 && !al.busy, 'the album shows the picture (' + JSON.stringify(al) + ')');
await shot('7-album'); await page.evaluate(() => { SPG.clayGame.closeAlbum(); });
await click('act', 'bin'); ok((await P()).confirm, 'start over asks first'); const bb = await page.evaluate(() => SPG.clayGame.confirmBtns()); await page.mouse.click(bb.no.x, bb.no.y); ok(!(await P()).confirm && (await P()).pieces > 0, 'No keeps the clay');
await page.evaluate(() => SPG.clayGame.save()); await page.waitForTimeout(300);
await page.click('#btn-home'); await page.waitForTimeout(500); await openGame(page, 'Clay Corner'); await page.waitForTimeout(900);
ok((await P()).pieces > 0, 'the creation is still there after leaving and coming back');
ok(page.errs.length === 0, 'no page errors ' + page.errs.join('|'));
console.log(fails ? fails + ' FAILED' : 'Clay Corner OK', W + 'x' + Hh, 'age', age); stop(b);
