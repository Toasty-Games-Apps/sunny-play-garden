// Sign Along and sign-language mode: opens Sign Along at ages 2, 4 and 7, plays every activity with real clicks (Learn: arrows, tabs and the
// hands; Watch & find: a wrong picture then the right one; Letters; My name), checks the layout fits, one star per five right answers,
// and the corner hands of sign-language mode (they show for every game's lines, and stay away inside Sign Along). Also checks that every
// line a game can say becomes known signs. usage: node signs.mjs [W H]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8360';
const W = +process.argv[2] || 1280, Hh = +process.argv[3] || 800;
const b = await start(); let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
for (const age of [2, 4, 7]) {
  const page = await newPage(b, W, Hh); await login(page, { age });
  await openGame(page, 'Sign Along'); await page.waitForTimeout(700);
  const P = () => page.evaluate(() => SPG.signGame.probe());
  const tap = async (x, y) => { await page.mouse.click(x, y); await page.waitForTimeout(350); };
  let p = await P(); ok(p.screen === 'menu' && p.btns.length === 4, `age ${age}: the menu has four activities`);
  ok(p.btns.every(q => q.x - q.r > 0 && q.x + q.r < p.w && q.y + q.r < p.h), `age ${age}: menu tiles on screen`);
  if (age === 4) await page.screenshot({ path: `${SP}/signs-menu-${W}x${Hh}.png` });
  // Learn
  await tap(p.btns[0].x, p.btns[0].y); p = await P(); ok(p.screen === 'learn' && p.busy, `age ${age}: Learn shows a sign`);
  const w0 = p.word; const nx = p.btns.find(q => q.id === 'next'); await tap(nx.x, nx.y); p = await P(); ok(p.word !== w0, `age ${age}: the arrow shows the next word`);
  if (p.tabs.length > 1) { await tap(p.tabs[1].x, p.tabs[1].y); p = await P(); ok(p.word !== w0, `age ${age}: a tab changes the group`); }
  await page.waitForTimeout(900); if (age === 4) await page.screenshot({ path: `${SP}/signs-learn-${W}x${Hh}.png` });
  await tap(p.back.x, p.back.y); p = await P(); ok(p.screen === 'menu', `age ${age}: the grid button goes back to the menu`);
  // Watch & find: one wrong, then right, several rounds
  const r0 = p.right;
  await tap(p.btns[1].x, p.btns[1].y); await page.waitForTimeout(400);
  for (let round = 0; round < 6; round++) {
    p = await P(); ok(p.screen === 'find' && p.btns.length === (age === 2 ? 2 : age === 7 ? 4 : 3), `age ${age}: ${p.btns.length} pictures`);
    ok(p.btns.every(q => q.x - q.r >= 0 && q.x + q.r <= p.w + 1 && q.y + q.r <= p.h + 1 && q.y - q.r >= p.stage.y - 2 || !p.btns.length), `age ${age}: pictures on screen`);
    if (round === 0 && age === 4) await page.screenshot({ path: `${SP}/signs-find-${W}x${Hh}.png` });
    if (round === 0) { const bad = p.btns.find(q => q.id !== p.round.ans); await tap(bad.x, bad.y); const q2 = await P(); ok(!q2.round.done && q2.round.wrong === 1, `age ${age}: a wrong picture does not move on`); }
    const good = p.btns.find(q => q.id === p.round.ans); await tap(good.x, good.y);
    const q3 = await P(); ok(q3.round.done, `age ${age}: the right picture is accepted`);
    await page.waitForFunction(() => { const p = SPG.signGame.probe(); return p.round && !p.round.done && p.btns.every(b => b.ready); }, null, { timeout: 15000 }).catch(() => ok(false, 'next round comes'));
  }
  p = await P(); ok(p.right === r0 + 5, `age ${age}: right first time counted (${p.right - r0})`);
  await tap(p.back.x, p.back.y); p = await P();
  // Letters
  await tap(p.btns[2].x, p.btns[2].y); await page.waitForTimeout(400);
  for (let round = 0; round < 4; round++) {
    p = await P(); ok(p.screen === 'letters' && p.btns.length >= 2, `age ${age}: letters round`);
    if (round === 1 && age === 7) await page.screenshot({ path: `${SP}/signs-letters-${W}x${Hh}.png` });
    const good = p.btns.find(q => q.id === p.round.ans); await tap(good.x, good.y);
    await page.waitForFunction(() => { const p = SPG.signGame.probe(); return p.round && !p.round.done && p.btns.every(b => b.ready); }, null, { timeout: 20000 }).catch(() => ok(false, 'next letter comes'));
  }
  await tap(p.back.x, p.back.y); p = await P();
  // My name
  await tap(p.btns[3].x, p.btns[3].y); p = await P(); ok(p.screen === 'name' && p.signs.length === p.btns.length && p.busy, `age ${age}: My name fingerspells the name (${p.signs.join(' ')})`);
  await page.waitForTimeout(1200); if (age === 4) await page.screenshot({ path: `${SP}/signs-name-${W}x${Hh}.png` });
  await tap(p.btns[0].x, p.btns[0].y); p = await P(); ok(p.signs.length === 1, `age ${age}: touching one letter shows that letter`);
  // turn the screen
  await page.setViewportSize({ width: Hh, height: W }); await page.waitForTimeout(500); p = await P();
  ok(p.btns.every(q => q.x - q.r >= 0 && q.x + q.r <= p.w + 1 && q.y + q.r <= p.h + 1), `age ${age}: name letters fit after a turn`);
  await page.setViewportSize({ width: W, height: Hh }); await page.waitForTimeout(300);
  ok(!page.errs.length, 'errors: ' + page.errs.join(' | '));
  await page.context().close();
}
// sign-language mode: the corner hands
{
  const page = await newPage(b, W, Hh); await login(page, { age: 4 });
  const missing = await page.evaluate(() => { const V = SPG.voice, out = []; for (const k of [...V.allKeys(), ...V.moreKeys(), ...Object.keys(V.LINES)]) for (const id of SPG.signs.glossOf(k)) if (!SPG.sign.SIGNS[id]) out.push(k + '>' + id); return [...new Set(out)]; });
  ok(!missing.length, 'every gloss uses known signs: ' + missing.join(' '));
  await page.evaluate(() => { SPG.store.settings.signs = true; SPG.store.saveSettings(); });
  await openGame(page, 'Feeling Friends'); await page.waitForTimeout(1500);
  ok(await page.evaluate(() => document.querySelector('#sign-card.show') !== null), 'the corner hands show in a game');
  await page.screenshot({ path: `${SP}/signs-card-${W}x${Hh}.png` });
  await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(600);
  await openGame(page, 'Sign Along'); await page.waitForTimeout(1600);
  ok(await page.evaluate(() => document.querySelector('#sign-card.show') === null), 'no corner hands inside Sign Along');
  await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(400);
  await page.evaluate(() => { SPG.store.settings.signs = false; SPG.voice.say('welcome'); }); await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelector('#sign-card.show') === null), 'no hands when the mode is off');
  ok(!page.errs.length, 'errors: ' + page.errs.join(' | '));
  await page.context().close();
}
stop(b); console.log(fails ? `FAILS: ${fails}` : 'SIGN ALONG OK', W + 'x' + Hh);
