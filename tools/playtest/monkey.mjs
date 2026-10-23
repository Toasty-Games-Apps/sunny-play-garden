// Monkey test: plays every game the way a toddler does: random taps, long presses and wild drags all over the screen (never the
// home button), turns the screen half way, pauses and resumes (like the screen going off), and checks for any page error.
// usage: node monkey.mjs [seconds per game] [W H]   (GAMES=name1,name2 to pick games, AGE=2..7)
import { start, stop, newPage, login, openGame } from './lib.mjs';
process.env.PORT = process.env.PORT || '8325';
const SECS = +process.argv[2] || 14, W = +process.argv[3] || 390, H = +process.argv[4] || 844;
const b = await start(); let fails = 0;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const page = await newPage(b, W, H); await login(page, { age: +process.env.AGE || 4 });
const names = process.env.GAMES ? process.env.GAMES.split(',') : await page.evaluate(() => SPG.games.slice().sort((a, b) => a.order - b.order).map(g => g.name));
for (const name of names) {
  page.errs.length = 0;
  await openGame(page, name);
  const t0 = Date.now(); let turned = false, paused = false;
  while (Date.now() - t0 < SECS * 1000) {
    const vw = page.viewportSize().width, vh = page.viewportSize().height;
    const x = 90 + rnd() * (vw - 100), y = 90 + rnd() * (vh - 100), r = rnd();
    if (r < .45) await page.mouse.click(x, y);
    else if (r < .9) { await page.mouse.move(x, y); await page.mouse.down(); const n = 3 + Math.floor(rnd() * 8); for (let i = 0; i < n; i++) await page.mouse.move(60 + rnd() * (vw - 80), 60 + rnd() * (vh - 80), { steps: 3 }); await page.mouse.up(); }
    else { await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up(); }
    await page.waitForTimeout(40 + rnd() * 120);
    if (!turned && Date.now() - t0 > SECS * 400) { turned = true; await page.setViewportSize({ width: H, height: W }); await page.waitForTimeout(300); }
    if (!paused && Date.now() - t0 > SECS * 700) { paused = true; await page.evaluate(() => { const r = SPG.app.running(); if (r) { r.inst.pause(); r.inst.resume(); } }); }
    // an overlay or sheet that a random tap opened (a confirm, a picker...) is fine; a page that left the game is reopened
    const inGame = await page.evaluate(() => !!SPG.app.running());
    if (!inGame) { await page.evaluate(() => { document.querySelectorAll('.overlay:not(.hidden) .btn.quiet, .sheet:not(.hidden) .btn.quiet').forEach(b => b.click()); }); await openGame(page, name); }
  }
  await page.setViewportSize({ width: W, height: H });
  const errs = page.errs.slice(); if (errs.length) { fails++; console.log('FAIL', name, errs.slice(0, 4).join(' | ')); } else console.log('ok', name);
  await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(300);
}
stop(b); console.log(fails ? `FAILS: ${fails}` : 'MONKEY OK');
