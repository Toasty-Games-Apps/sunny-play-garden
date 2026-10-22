// Caterpillars: plays several caterpillars at every age (wrong ball first sometimes, then the right one), checks the hint glow after two
// wrong tries, that butterflies stay in the sky, that a star comes every third caterpillar, rotation and night. usage: node pattern.mjs [W H]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8311';
const W = +process.argv[2] || 390, Hh = +process.argv[3] || 844;
const b = await start(); let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };

// the pattern maker itself: every round must have its answers among the balls, and patterns must really repeat
{
  const page = await newPage(b, W, Hh);
  const bad = await page.evaluate(() => {
    const out = [];
    for (const tier of [1, 2, 3]) for (let k = 0; k < 400; k++) {
      const R = SPG.patternGame.makeRound(tier, false), key = u => u.c + u.m + u.z;
      const want = tier === 1 ? 2 : tier === 2 ? 3 : 4;
      if (R.choices.length !== want) out.push(`tier ${tier}: ${R.choices.length} balls`);
      if (new Set(R.choices.map(key)).size !== R.choices.length) out.push(`tier ${tier}: two balls alike`);
      for (const u of R.seq.slice(R.shown)) if (!R.choices.some(c => key(c) === key(u))) out.push(`tier ${tier} ${R.type}/${R.feat}: answer missing`);
      if (R.shown < 4) out.push(`tier ${tier}: only ${R.shown} shown`);
      if (R.seq.length > 9) out.push(`tier ${tier}: ${R.seq.length} balls on one caterpillar`);
      if (tier < 3 && R.feat !== 'color') out.push('dots or sizes below tier 3');
      if (tier === 1 && R.type !== 'AB') out.push('tier 1 got ' + R.type);
    }
    return [...new Set(out)];
  });
  ok(!bad.length, 'pattern maker: ' + bad.join(', '));
  await page.context().close();
}

for (const age of [2, 4, 7]) {
  const page = await newPage(b, W, Hh); await login(page, { age });
  await openGame(page, 'Caterpillars');
  const P = () => page.evaluate(() => SPG.patternGame.probe());
  const waitPick = async (ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const p = await P(); if (p && p.phase === 'pick') return p; await page.waitForTimeout(100); } return null; };
  const stars0 = await page.evaluate(() => SPG.store.active.stars);
  for (let round = 0; round < 4; round++) {
    let p = await waitPick(); ok(p, `age ${age}: the caterpillar arrives and sings (round ${round})`); if (!p) break;
    if (round === 0) await page.screenshot({ path: `${SP}/pattern-${age}-${W}x${Hh}.png` });
    const done = p.done;
    for (let g = 0; g < p.gaps; g++) {
      p = await waitPick(); if (!p) { ok(false, 'stuck waiting'); break; }
      const wrong = p.picks.find(q => q.key !== p.want), right = p.picks.find(q => q.key === p.want);
      ok(right, `age ${age}: the right ball is on a leaf`);
      if (round === 1 && wrong) {   // two wrong tries: the right one glows
        await page.mouse.click(wrong.x, wrong.y); await page.waitForTimeout(300);
        ok((await P()).filled === g, 'a wrong ball does not go on'); await waitPick();
        await page.mouse.click(wrong.x, wrong.y); await page.waitForTimeout(300);
        ok((await P()).hint, `age ${age}: the right ball glows after two wrong tries`); p = await waitPick();
      }
      await page.mouse.click(right.x, right.y); await page.waitForTimeout(700);
      ok((await P()).filled === g + 1 || (await P()).done === done + 1, `age ${age}: the right ball hops on`);
    }
    const t0 = Date.now(); while (Date.now() - t0 < 12000 && (await P()).done === done) await page.waitForTimeout(150);
    ok((await P()).done === done + 1, `age ${age}: the caterpillar sings, leaves and a butterfly comes`);
    if (round === 1) { await page.setViewportSize({ width: Hh, height: W }); await page.waitForTimeout(400); }
    if (round === 2) { await page.setViewportSize({ width: W, height: Hh }); await page.evaluate(() => SPG.night.set('on')); await page.waitForTimeout(400); await page.screenshot({ path: `${SP}/pattern-night-${age}.png` }); await page.evaluate(() => SPG.night.set('off')); }
  }
  const pr = await P(); ok(pr.flies >= 4, 'butterflies in the sky: ' + pr.flies);
  const stars = await page.evaluate(() => SPG.store.active.stars); ok(stars - stars0 === 1, `age ${age}: one star for three caterpillars (${stars - stars0})`);
  // the head stays on screen, the balls stay on screen
  ok(pr.head.x > 0 && pr.picks.every(q => q.x - q.r > 0 && q.x + q.r < pr.w && q.y + q.r < pr.h), 'everything fits on the screen');
  await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(300);
  await openGame(page, 'Caterpillars'); await page.waitForTimeout(300);
  ok((await P()).flies >= 4, 'the butterflies are still there next time');
  ok(!page.errs.length, 'errors: ' + page.errs.join(' | '));
  await page.context().close();
}
stop(b); console.log(fails ? `FAILS: ${fails}` : 'PATTERN OK');
