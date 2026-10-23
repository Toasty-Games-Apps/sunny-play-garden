// Tidy Time: checks the round maker at every tier, then plays every kind of sorting at ages 2, 4 and 7 by dragging: one wrong
// basket twice (the thing slides back and its basket glows), one thing let go on the floor (it stays), then everything into its
// basket. Checks the round ends, one star per two tidy rooms, that nothing leaves the screen, rotation mid-round and night.
// Screenshots every kind of sorting. usage: node sort.mjs [W H]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8321';
const W = +process.argv[2] || 390, Hh = +process.argv[3] || 844;
const b = await start(); let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };

{
  const page = await newPage(b, W, Hh);
  const bad = await page.evaluate(() => {
    const out = [], G = SPG.sortGame;
    for (const tier of [1, 2, 3]) for (const mode of G.MODES[tier]) for (let k = 0; k < 200; k++) {
      const R = G.makeRound(tier, mode), keys = R.bins.map(b => b.key);
      if (R.items.length !== G.COUNT[tier]) out.push(`tier ${tier} ${mode}: ${R.items.length} things`);
      if (new Set(keys).size !== keys.length) out.push(`${mode}: two baskets alike`);
      if (R.items.some(i => !keys.includes(i.key))) out.push(`${mode}: a thing with no basket`);
      if (keys.some(k => R.items.filter(i => i.key === k).length < 2)) out.push(`tier ${tier} ${mode}: a basket with fewer than two things`);
      if (mode === 'color' && keys.length !== tier + 1) out.push(`tier ${tier}: ${keys.length} colours`);
      if (mode === 'size' && keys.length !== (tier === 3 ? 3 : 2)) out.push(`tier ${tier}: ${keys.length} sizes`);
      if (mode === 'size') { const kinds = new Set(R.items.map(i => i.kind)); for (const kd of kinds) if (new Set(R.items.filter(i => i.kind === kd).map(i => i.size)).size < 2) out.push('size: a kind in only one size'); }
      if (mode === 'shape' && new Set(R.items.map(i => i.col)).size < 3) out.push('shape: colours not mixed');
      if (mode === 'color' && R.items.some(i => i.col !== i.key)) out.push('colour: wrong key');
    }
    return [...new Set(out)];
  });
  ok(!bad.length, 'round maker: ' + bad.join(', '));
  await page.context().close();
}

const drag = async (page, from, to) => {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 }); await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(80);
};

for (const age of [2, 4, 7]) {
  const page = await newPage(b, W, Hh); await login(page, { age });
  const modes = await page.evaluate(a => SPG.sortGame.MODES[a === 2 ? 1 : a === 7 ? 3 : 2], age);
  const stars0 = await page.evaluate(() => SPG.store.active.stars);
  let rounds = 0;
  for (const [mi, mode] of modes.entries()) {
    await page.evaluate(m => { SPG.sortGame.next = m; }, mode);
    await openGame(page, 'Tidy Time');
    const P = () => page.evaluate(() => SPG.sortGame.probe());
    const waitFor = async (want, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const p = await P(); if (p && want(p)) return p; await page.waitForTimeout(100); } return null; };
    let p = await waitFor(p => p.phase === 'play'); ok(p && p.mode === mode, `age ${age}: ${mode} round starts`); if (!p) continue;
    ok(p.items.every(i => i.x - i.r > -2 && i.x + i.r < p.w + 2 && i.y - i.r > 40 && i.y + i.r < p.bins[0].top + 12), `age ${age} ${mode}: every thing is on screen above the baskets`);
    ok(p.bins.every(q => q.x - q.w / 2 >= 0 && q.x + q.w / 2 <= p.w && q.top > p.area.y1 - 30), `age ${age} ${mode}: baskets fit`);
    await page.waitForTimeout(400); await page.screenshot({ path: `${SP}/sort-${mode}-${age}-${W}x${Hh}.png` });
    // the wrong basket twice: it slides home and its basket glows
    let it = p.items.find(i => i.state === 'floor'), wrongBin = p.bins.find(q => q.key !== it.key);
    for (let k = 0; k < 2; k++) { const cur = (await P()).items.find(i => i.id === it.id); await drag(page, cur, wrongBin); await page.waitForTimeout(500); }
    p = await P(); const back = p.items.find(i => i.id === it.id);
    ok(back && back.state === 'floor' && back.glow, `age ${age} ${mode}: a wrong basket sends it back, and after two it glows`);
    ok(p.bins.every(q => q.n === 0), 'nothing went in a wrong basket');
    // let one go on the floor: it stays where it was put
    it = p.items.find(i => i.state === 'floor'); const to = { x: p.w / 2, y: (p.area.y0 + p.area.y1) / 2 };
    await drag(page, it, to); await page.waitForTimeout(150); p = await P();
    ok(p.items.some(i => i.state === 'floor' && Math.hypot(i.x - to.x, i.y - to.y) < it.r + 30), `age ${age} ${mode}: let go on the floor, it stays there`);
    if (mi === 1) { await page.setViewportSize({ width: Hh, height: W }); await page.waitForTimeout(400); p = await P(); ok(p.items.every(i => i.state !== 'floor' || (i.x > 0 && i.x < p.w && i.y > 0 && i.y < p.h)), 'after turning, every thing is on screen'); }
    if (mi === 2) await page.evaluate(() => SPG.night.set('on'));
    // everything into its basket
    for (let guard = 0; guard < 30; guard++) {
      p = await P(); const left = p.items.filter(i => i.state === 'floor'); if (!left.length) break;
      const i = left[0], bin = p.bins.find(q => q.key === i.key); await drag(page, i, bin); await page.waitForTimeout(420);
    }
    p = await waitFor(p => p.phase === 'done' || p.phase === 'out', 3000); ok(p, `age ${age} ${mode}: the room is tidy`); rounds++;
    if (p) ok(p.bins.reduce((a, q) => a + q.n, 0) === p.items.length, 'every thing is in a basket');
    if (mi === 1) { await page.setViewportSize({ width: W, height: Hh }); await page.waitForTimeout(200); }
    await page.waitForTimeout(600);
    await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(300);
  }
  await page.evaluate(() => SPG.night.set('off'));
  await page.waitForTimeout(1500);
  const stars = await page.evaluate(() => SPG.store.active.stars); ok(stars - stars0 === Math.floor(rounds / 2), `age ${age}: one star per two tidy rooms (${stars - stars0} for ${rounds})`);
  ok(!page.errs.length, 'errors: ' + page.errs.join(' | '));
  await page.context().close();
}

// the idle hint: a thing wiggles and its basket glows
{
  const page = await newPage(b, W, Hh); await login(page, { age: 4 });
  await openGame(page, 'Tidy Time'); await page.waitForTimeout(10500);
  const p = await page.evaluate(() => SPG.sortGame.probe()); ok(p.bins.some(q => q.glow), 'after a while a basket glows');
  ok(!page.errs.length, 'errors: ' + page.errs.join(' | '));
  await page.context().close();
}
stop(b); console.log(fails ? `FAILS: ${fails}` : 'SORT OK');
