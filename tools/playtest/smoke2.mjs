import { start, stop, newPage, login, openGame } from './lib.mjs';
const wait = ms => new Promise(r => setTimeout(r, ms));
process.env.PORT = '8144';
const b = await start(); const errs = [];
for (const age of [2, 4, 7]) for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
  const page = await newPage(b, w, h); await login(page, { age });
  if (process.env.SIGNS) await page.evaluate(() => { Object.assign(SPG.store.settings, { signs: true, vision: 'deutan', bigUI: true }); SPG.vision.apply(); });   // SIGNS=1: also the signing hands and the colour filter
  const names = await page.evaluate(() => SPG.games.map(g => g.name));
  for (const name of names) {
    await openGame(page, name);
    for (let k = 0; k < 3; k++) { await page.mouse.move(w * .3 + k * 60, h * .5); await page.mouse.down(); await page.mouse.move(w * .6, h * .55, { steps: 6 }); await page.mouse.up(); await wait(150); }
    await wait(500); await page.click('#btn-home'); await wait(200);
  }
  const e = page.errs; console.log(`age ${age} ${w}x${h}`, e.length ? e.join(' | ') : 'ok'); if (e.length) errs.push(...e);
}
stop(b); console.log(errs.length ? 'ERRORS' : 'ALL CLEAN');
