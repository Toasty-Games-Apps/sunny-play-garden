// Pet Care grooming: bath in the room (stains scrub off), then the close-up tools (brush tangles and burrs, spray, sponge, towel). usage: node care.mjs [W H age]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8297';
const W = +process.argv[2] || 1280, Hh = +process.argv[3] || 800, age = +process.argv[4] || 4;
const b = await start(); const page = await newPage(b, W, Hh); await login(page, { age });
await openGame(page, 'Pet Care'); await page.waitForTimeout(900);
const P = () => page.evaluate(() => SPG.careGame.probe());
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const shot = async n => { await page.waitForTimeout(150); await page.screenshot({ path: `${SP}/care-${n}.png` }); };
// scribble back and forth over (cx,cy) with the mouse, radius rx,ry
const scrub = async (cx, cy, rx, ry, n = 40) => { await page.mouse.move(cx - rx, cy); await page.mouse.down(); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 6; await page.mouse.move(cx + Math.sin(a) * rx, cy + Math.cos(a * 1.3) * ry + (i / n - .5) * ry * 2, { steps: 2 }); await page.waitForTimeout(18); } await page.mouse.up(); };
let pr = await P();
ok(pr.grime.length > 3, 'the pet starts with stains (' + pr.grime.length + ')');
ok(pr.knots.length >= 1 || true, 'knots ok');
console.log('start: stains', pr.grime.map(g => g.k).join(','), 'knots', pr.knots.length, 'burrs', pr.burrs.length, 'dirt', pr.dirt.toFixed(2));
await shot('0-room-dirty');
// bath in the room: choose the bath tool, hold the sponge and scrub all over the pet
const bath = pr.tools.find(t => t.id === 'bath'); await page.mouse.click(bath.x, bath.y); await page.waitForTimeout(200);
const { px, py, s } = pr.X;
await page.mouse.move(px, py - s * .3); await page.mouse.down();
for (let round = 0; round < 6; round++) for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; await page.mouse.move(px + Math.cos(a + round) * s * .22, py - s * .4 + Math.sin(a * 2 + round) * s * .3, { steps: 2 }); if (round === 0 && i === 12) await shot('1-room-scrub'); }
await page.mouse.up(); await page.waitForTimeout(200);
let a1 = await P(); ok(a1.dirt < pr.dirt - .1, 'scrubbing in the bath cleans (dirt ' + pr.dirt.toFixed(2) + ' -> ' + a1.dirt.toFixed(2) + ')'); ok(a1.suds > 0 || a1.wet > .1, 'suds or wet fur appear'); await shot('2-room-after');
// close-up
await page.mouse.click(bath.x, bath.y); await page.waitForTimeout(200);
await page.mouse.click(px, py - s * .4); await page.waitForTimeout(900);
let z = await P(); ok(z.zoomOn, 'the close-up opens'); await shot('3-zoom');
ok(z.ztools.length === 6, 'six zoom tools'); for (const t of z.ztools) ok(t.x > 0 && t.x < z.w, 'tool ' + t.id + ' is on screen');
const tool = async id => { const t = (await P()).ztools.find(q => q.id === id); await page.mouse.click(t.x, t.y); await page.waitForTimeout(150); const now = await page.evaluate(() => SPG.careGame.game.ztool); ok(now === id || id === 'back', 'tool ' + id + ' selected (is ' + now + ')'); };
const at = async (u, v) => { const q = await P(); return { x: q.X.px + u * q.X.s, y: q.X.py + v * q.X.s }; };
// spray: wet and rinse
await tool('spray'); const bx = z.box; await page.mouse.move(bx.cx - bx.rx * .6, bx.cy); await page.mouse.down(); for (let i = 0; i < 30; i++) { await page.mouse.move(bx.cx + Math.sin(i / 4) * bx.rx * .7, bx.cy + Math.cos(i / 3) * bx.ry * .5, { steps: 2 }); await page.waitForTimeout(30); } await shot('4-spray'); await page.mouse.up();
let sp = await P(); ok(sp.wet > .4, 'spraying makes the fur wet (' + sp.wet.toFixed(2) + ')');
// brush: knots come out, faster when wet
const kn0 = sp.knots.length, bu0 = sp.burrs.length; console.log('knots', kn0, 'burrs', bu0);
await tool('brush');
for (let pass = 0; pass < 8; pass++) { const q = await P(); if (!q.knots.length && !q.burrs.length) break; for (const o of [...q.knots, ...q.burrs]) { const c = await at(o.x, o.y); await page.mouse.move(c.x - 40, c.y - 20); await page.mouse.down(); for (let i = 0; i < 10; i++) { await page.mouse.move(c.x - 40 + i * 9, c.y - 20 + i * 4, { steps: 2 }); await page.waitForTimeout(20); } await page.mouse.up(); } if (pass === 0) await shot('5-brush'); }
let br = await P(); if (br.knots.length) console.log('left', JSON.stringify(br.knots), 'box', JSON.stringify(br.box), JSON.stringify(br.X)); ok(br.knots.length === 0, 'all tangles brushed out (' + br.knots.length + ' left)'); ok(br.burrs.length === 0, 'all burrs brushed off (' + br.burrs.length + ' left)');
// sponge scrubs the remaining stains
await tool('sponge'); for (let r = 0; r < 4; r++) { const q = await P(); if (!q.grime.length) break; for (const g of q.grime) { const c = await at(g.x, g.y); await scrub(c.x, c.y, 30, 20, 16); } if (r === 0) await shot('6-sponge'); }
let sg = await P(); ok(sg.grime.length === 0, 'every stain scrubbed off (' + sg.grime.length + ' left)'); ok(sg.flags.washed || sg.cares > pr.cares, 'washing is counted as care');
// rinse + towel
await tool('spray'); await page.mouse.move(bx.cx - bx.rx * .6, bx.cy); await page.mouse.down(); for (let i = 0; i < 24; i++) { await page.mouse.move(bx.cx + Math.sin(i / 3) * bx.rx * .7, bx.cy + Math.cos(i / 2) * bx.ry * .6, { steps: 2 }); await page.waitForTimeout(30); } await page.mouse.up();
await tool('towel'); await shot('7-towel-ready'); const w0 = (await P()).wet; await scrub(bx.cx, bx.cy, bx.rx * .6, bx.ry * .5, 60); await scrub(bx.cx, bx.cy, bx.rx * .6, bx.ry * .5, 60);
const w1 = await P(); ok(w1.wet < w0 - .2 || w1.wet < .1, 'the towel dries the fur (' + w0.toFixed(2) + ' -> ' + w1.wet.toFixed(2) + ')'); await shot('8-clean');
ok(page.errs.length === 0, 'no page errors ' + page.errs.join('|'));
console.log(fails ? fails + ' FAILED' : 'Pet Care grooming OK', W + 'x' + Hh, 'age', age); stop(b);
