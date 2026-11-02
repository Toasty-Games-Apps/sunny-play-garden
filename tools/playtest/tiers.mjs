import { start, stop, newPage, login, openGame } from './lib.mjs';
process.env.PORT = process.env.PORT || '8145';
const b = await start();
for (const age of [2, 4, 7]) {
  const page = await newPage(b, 1280, 800); await login(page, { age });
  await openGame(page, 'Fire Rescue'); const f = await page.evaluate(() => SPG.app.running().inst.blds.map(b => b.flames.length));
  await page.click('#btn-home'); await openGame(page, 'Puzzle Pond'); const g = await page.evaluate(() => { const i = SPG.app.running().inst; return [i.gridFor(0), i.gridFor(3), i.gridFor(12)]; });
  await page.click('#btn-home'); await openGame(page, 'Bunny Band'); 
  console.log('age', age, 'tier(rain)', await page.evaluate(() => SPG.level.tier('rain')), 'flames', f, 'puzzle grids', JSON.stringify(g), page.errs.join('|') || 'ok');
}
stop(b);
