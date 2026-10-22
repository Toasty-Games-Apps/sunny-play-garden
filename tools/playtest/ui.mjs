import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
const wait = ms => new Promise(r => setTimeout(r, ms));
process.env.PORT = '8143';
const b = await start();
for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
  const page = await newPage(b, w, h);
  await page.screenshot({ path: `${SP}/setup_${w}x${h}.png` });
  await login(page, { gender: 'girl', age: 5 });
  // open the grown-ups panel through the gate
  await page.evaluate(() => document.getElementById('hub-lock').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await wait(300);
  // solve spelled-out sum
  const q = await page.evaluate(() => document.getElementById('gate-q').textContent);
  const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']; const [a, , c] = q.split(' '); const ans = String(W.indexOf(a) + W.indexOf(c));
  for (const d of ans) await page.evaluate(d => [...document.querySelectorAll('#numpad button')].find(x => x.textContent === d).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), d);
  await page.evaluate(() => document.querySelector('#numpad button.ok').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await wait(400);
  if (await page.$('#vintro:not(.hidden)')) { await page.click('#vintro .btn.quiet'); await wait(200); }   // the voices welcome on the first Grown-ups visit
  await page.evaluate(() => { const s = [...document.querySelectorAll('#parent-body h3')].find(h => h.textContent === 'Age and difficulty'); s.scrollIntoView(); const d = s.parentElement.querySelector('details'); d.open = true; }); await wait(300);
  await page.screenshot({ path: `${SP}/level_${w}x${h}.png` });
  console.log(w, h, page.errs.join(' | ') || 'no errors');
}
// night mode for the kitchen menu
const page = await newPage(b, 844, 390); await login(page); await page.evaluate(() => SPG.night.set('on')); await openGame(page, 'Sprout Kitchen'); await wait(600);
await page.screenshot({ path: `${SP}/menu_night.png` });
stop(b);
