// Feeling Friends: checks the round maker at every tier, plays four friends at ages 2, 4 and 7 (two wrong faces once, so the
// right face glows), picks a way to help each time, checks one star per three friends, rotation and night, and takes a
// screenshot of every story while the faces are offered. usage: node feelings.mjs [W H]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8319';
const W = +process.argv[2] || 390, Hh = +process.argv[3] || 844;
const b = await start(); let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };

{
  const page = await newPage(b, W, Hh);
  const bad = await page.evaluate(() => {
    const out = [], LOOK = { happy: 'wow', wow: 'happy', sad: 'sleep', sleep: 'sad' };
    const MOODS = { 1: ['happy', 'sad'], 2: ['happy', 'sad', 'scared', 'mad', 'wow'], 3: ['happy', 'sad', 'scared', 'mad', 'wow', 'sleep'] };
    for (const tier of [1, 2, 3]) for (let k = 0; k < 400; k++) {
      const R = SPG.feelingsGame.makeRound(tier, null);
      if (R.choices.length !== tier + 1) out.push(`tier ${tier}: ${R.choices.length} faces`);
      if (!R.choices.includes(R.mood)) out.push('answer missing');
      if (new Set(R.choices).size !== R.choices.length) out.push('two faces alike');
      if (R.choices.some(m => !MOODS[tier].includes(m))) out.push(`tier ${tier}: a feeling from an older tier`);
      if (R.choices.includes(LOOK[R.mood])) out.push(`${R.mood} offered with its look-alike`);
      if (R.helps.length !== 3) out.push('helps');
      if (tier < 3 && R.whys) out.push(`tier ${tier}: a why question`);
      if (tier === 3) { const st = id => SPG.feelingsGame.STORIES.find(s => s.id === id); if (!R.whys || R.whys.length !== 3 || !R.whys.includes(R.story) || new Set(R.whys.map(i => st(i).mood)).size !== 3) out.push('tier 3: why pictures ' + JSON.stringify(R.whys)); }
    }
    return [...new Set(out)];
  });
  ok(!bad.length, 'round maker: ' + bad.join(', '));
  await page.context().close();
}

for (const age of [2, 4, 7]) {
  const page = await newPage(b, W, Hh); await login(page, { age });
  await openGame(page, 'Feeling Friends');
  const P = () => page.evaluate(() => SPG.feelingsGame.probe());
  const waitFor = async (want, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const p = await P(); if (p && want(p)) return p; await page.waitForTimeout(120); } return null; };
  const stars0 = await page.evaluate(() => SPG.store.active.stars);
  for (let round = 0; round < 4; round++) {
    let p = await waitFor(p => p.phase === 'ask' && p.btns.every(b => b.ready)); ok(p, `age ${age}: the friend arrives and asks (round ${round})`); if (!p) break;
    if (round === 0) await page.screenshot({ path: `${SP}/feel-${age}-${W}x${Hh}.png` });
    ok(p.btns.length === (age === 2 ? 2 : age === 7 ? 4 : 3), `age ${age}: ${p.btns.length} faces`);
    ok(p.btns.every(q => q.x - p.br > 0 && q.x + p.br < p.w && q.y + p.br < p.h && q.y - p.br > p.gy), `age ${age}: the faces fit on the screen below the friend`);
    const right = p.btns.find(q => q.id === p.mood), wrong = p.btns.filter(q => q.id !== p.mood);
    if (round === 1 && wrong.length) {
      for (const q of wrong.slice(0, 2)) { await page.mouse.click(q.x, q.y); await page.waitForTimeout(250); }
      const q = await P(); ok(q.phase === 'ask', 'a wrong face does not move on');
      if (wrong.length >= 2) ok(q.glow, `age ${age}: the right face glows after two tries`);
    }
    await page.mouse.click(right.x, right.y);
    if (age === 7) {   // "Why did I feel that way?": the picture of what happened
      p = await waitFor(p => p.phase === 'why' && p.btns.length === 3 && p.btns.every(b => b.ready)); ok(p, `age ${age}: the why question comes (round ${round})`); if (!p) break;
      if (round === 0) await page.screenshot({ path: `${SP}/feel-why-${W}x${Hh}.png` });
      const wr = p.btns.filter(q => q.id !== p.story);
      if (round === 1) { for (const q of wr) { await page.mouse.click(q.x, q.y); await page.waitForTimeout(250); } const q = await P(); ok(q.phase === 'why' && q.wglow, 'two wrong pictures: still asking and the right one glows'); }
      const rt = p.btns.find(q => q.id === p.story); ok(rt, 'the right picture is offered'); await page.mouse.click(rt.x, rt.y);
    }
    p = await waitFor(p => p.phase === 'help' && p.btns.length === 3 && p.btns.every(b => b.ready)); ok(p, `age ${age}: the right face is accepted and help is offered`); if (!p) break;
    const h = p.btns[round % 3], helped = p.helped; await page.mouse.click(h.x, h.y);
    p = await waitFor(p => p.helped === helped + 1); ok(p, `age ${age}: helping with ${h.id} makes the friend feel better`);
    if (round === 1) { await page.setViewportSize({ width: Hh, height: W }); await page.waitForTimeout(400); }
    if (round === 2) { await page.setViewportSize({ width: W, height: Hh }); await page.evaluate(() => SPG.night.set('on')); await page.waitForTimeout(400); }
  }
  await page.evaluate(() => SPG.night.set('off'));
  const stars = await page.evaluate(() => SPG.store.active.stars); ok(stars - stars0 === 1, `age ${age}: one star for three friends (${stars - stars0})`);
  ok(!page.errs.length, 'errors: ' + page.errs.join(' | '));
  await page.context().close();
}

// every story, as it looks when the faces are offered
{
  const page = await newPage(b, W, Hh); await login(page, { age: 7 });
  const ids = await page.evaluate(() => SPG.feelingsGame.STORIES.map(s => s.id));
  for (const id of ids) {
    await page.evaluate(i => { SPG.feelingsGame.next = i; }, id);
    await openGame(page, 'Feeling Friends');
    const t0 = Date.now(); let p; while (Date.now() - t0 < 16000) { p = await page.evaluate(() => SPG.feelingsGame.probe()); if (p && p.phase === 'ask') break; await page.waitForTimeout(150); }
    ok(p && p.story === id && p.phase === 'ask', 'story ' + id);
    await page.waitForTimeout(500); await page.screenshot({ path: `${SP}/feel-story-${id}.png` });
    await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(250);
  }
  ok(!page.errs.length, 'errors: ' + page.errs.join(' | '));
  await page.context().close();
}
stop(b); console.log(fails ? `FAILS: ${fails}` : 'FEELINGS OK');
