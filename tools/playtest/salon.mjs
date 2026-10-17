// Hair salon (Style Studio > Hair): pick a messy style, snip, brush, spray, dry, undo, save, and wear the saved cut. usage: node salon.mjs [W H age]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8302';
const W = +process.argv[2] || 1280, Hh = +process.argv[3] || 800, age = +process.argv[4] || 5;
const b = await start(); const page = await newPage(b, W, Hh); await login(page, { age });
await openGame(page, 'Style Studio'); await page.waitForTimeout(900);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const S = () => page.evaluate(() => SPG.salon.cur && SPG.salon.cur.probe());
const shot = async n => { await page.waitForTimeout(150); await page.screenshot({ path: `${SP}/salon-${n}.png` }); };
await page.click('.st-tab[aria-label="Hair"]'); await page.waitForTimeout(400);
await page.click('.st-tile[aria-label="hair-salon"]'); await page.waitForTimeout(700);
let s = await S(); ok(s && s.mode === 'pick', 'the salon opens on the style picker'); ok(s.cards.length === 8, 'eight messy styles to pick from (' + s.cards.length + ')');
await shot('1-pick');
for (const c of s.cards) ok(c.x >= 0 && c.y >= 0 && c.x + c.s <= s.w + 1 && c.y + c.s <= s.h + 1, 'a card is on screen');
const c0 = s.cards[0]; await page.mouse.click(c0.x + c0.s / 2, c0.y + c0.s / 2); await page.waitForTimeout(600);
s = await S(); ok(s.mode === 'edit', 'the editor opens'); ok(s.strands > 60, 'there are strands (' + s.strands + ')');
const n0 = s.neat, kn0 = s.knots, fl0 = s.fly; console.log('start neat', n0.toFixed(2), 'knots', kn0, 'flyaways', fl0, 'kind', c0.kind);
await shot('2-edit');
const btn = id => s.btns.find(q => q.id === id);
const at = (u, v) => ({ x: s.hc.x + u * s.R, y: s.hc.y + v * s.R });
// scissors: swipe across the lower hair a few times
// (short styles have nothing down low, so also swipe across the fringe and through the top)
for (const row of [1.3, .25, -1.0]) {
  const a = at(-1.8, row), z = at(1.8, row);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); for (let i = 0; i <= 24; i++) { await page.mouse.move(a.x + (z.x - a.x) * i / 24, a.y + (z.y - a.y) * i / 24, { steps: 2 }); await page.waitForTimeout(25); } if (row === .25) await shot('3-snipping'); await page.mouse.up();
}
let s1 = await S(); ok(s1.cuts > 0 || s1.pieces > 0, 'scissors cut hair (cuts ' + s1.cuts + ', loose ends ' + s1.pieces + ')'); ok(s1.undo > 0, 'undo has a step');
await page.mouse.click(...Object.values(at(0, .8))); // a tap snip
await page.waitForTimeout(500); await shot('4-cut');
// spray, then brush
await page.mouse.click(btn('spray').x, btn('spray').y); await page.waitForTimeout(150);
let c = at(0, -.2); await page.mouse.move(c.x + s.R * 1.2, c.y); await page.mouse.down(); for (let i = 0; i < 30; i++) { const an = i / 5; await page.mouse.move(c.x + Math.cos(an) * s.R * 1.2, c.y + Math.sin(an) * s.R * 1.0, { steps: 2 }); await page.waitForTimeout(30); } await shot('5-spray'); await page.mouse.up();
let s2 = await S(); ok(s2.wet > .1, 'spraying wets the hair (' + s2.wet.toFixed(2) + ')');
await page.mouse.click(btn('brush').x, btn('brush').y); await page.waitForTimeout(150);
for (let pass = 0; pass < 14; pass++) {
  const row = -1.2 + (pass % 7) * .5, dir = pass % 2 ? 1 : -1;
  const p0 = at(-1.5 * dir, row), p1 = at(1.5 * dir, row + .3); await page.mouse.move(p0.x, p0.y); await page.mouse.down();
  for (let i = 0; i <= 20; i++) { await page.mouse.move(p0.x + (p1.x - p0.x) * i / 20, p0.y + (p1.y - p0.y) * i / 20, { steps: 2 }); await page.waitForTimeout(22); } await page.mouse.up();
  if (pass === 3) await shot('6-brushing');
}
let s3 = await S(); console.log('after brushing: neat', s3.neat.toFixed(2), 'knots', s3.knots, 'flyaways', s3.fly);
ok(s3.neat > n0 + .15, 'brushing makes it neater (' + n0.toFixed(2) + ' -> ' + s3.neat.toFixed(2) + ')'); ok(s3.knots < kn0 || kn0 === 0, 'knots come out'); ok(s3.fly < fl0, 'stray hairs are smoothed down');
// dryer dries it
await page.mouse.click(btn('dryer').x, btn('dryer').y); await page.waitForTimeout(150);
c = at(0, .3); await page.mouse.move(c.x, c.y); await page.mouse.down(); for (let i = 0; i < 40; i++) { await page.mouse.move(c.x + Math.sin(i / 4) * s.R * 1.1, c.y + Math.cos(i / 5) * s.R * 1.2, { steps: 2 }); await page.waitForTimeout(40); } await shot('7-dryer'); await page.mouse.up();
let s4 = await S(); ok(s4.wet < s3.wet || s3.wet < .05, 'the dryer dries it (' + s3.wet.toFixed(2) + ' -> ' + s4.wet.toFixed(2) + ')'); await shot('8-tidy');
// undo
const u0 = s4.undo; await page.mouse.click(btn('undo').x, btn('undo').y); await page.waitForTimeout(200); ok((await S()).undo === u0 - 1, 'undo goes back a step');
// done: saved and worn
await page.mouse.click(btn('done').x, btn('done').y); await page.waitForTimeout(700);
ok(!(await S()) || (await page.evaluate(() => !document.querySelector('.salon'))), 'the salon closes');
const st = await page.evaluate(() => { const b = SPG.store.bag('style'); return { cuts: b.cuts.length, hair: (b.kids[b.cur] || {}).hair }; });
ok(st.cuts === 1, 'the cut is saved (' + st.cuts + ')'); ok(/^cut:/.test(st.hair || ''), 'she wears the new cut (' + st.hair + ')');
await page.waitForTimeout(400); await shot('9-worn');
const tiles = await page.$$('.st-tile[aria-label="hair-mine"]'); ok(tiles.length === 1, 'the cut shows up in the hair list');
ok(page.errs.length === 0, 'no page errors ' + page.errs.join('|'));
console.log(fails ? fails + ' FAILED' : 'Hair salon OK', W + 'x' + Hh, 'age', age); stop(b);
