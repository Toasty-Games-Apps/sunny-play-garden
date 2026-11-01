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
  // Grown-ups opens on a page of topic tiles; every tile opens its page and the back button comes home
  const tiles = await page.$$eval('#parent-body .gu-tile', l => l.length);
  if (tiles < 8) console.log(`FAIL only ${tiles} topic tiles`);
  await page.screenshot({ path: `${SP}/grownups_${w}x${h}.png` });
  const over = await page.evaluate(() => { const r = document.querySelector('#parent-body .gu-grid').getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; });
  if (over) console.log('FAIL the topic tiles are wider than the screen');
  for (let i = 0; i < tiles; i++) {
    await page.evaluate(i => document.querySelectorAll('#parent-body .gu-tile')[i].click(), i); await wait(150);
    const ok = await page.evaluate(() => !!document.querySelector('#parent-body .gu-back') && document.querySelectorAll('#parent-body section').length > 0);
    if (!ok) console.log(`FAIL topic ${i} did not open a page`);
    await page.click('#parent-body .gu-back'); await wait(120);
    if (!(await page.$('#parent-body .gu-grid'))) console.log(`FAIL back from topic ${i} did not come home`);
  }
  await page.evaluate(() => SPG.grownups.open('kids')); await wait(200);
  await page.evaluate(() => { const s = [...document.querySelectorAll('#parent-body h3')].find(h => h.textContent === 'Age and difficulty'); s.scrollIntoView(); const d = s.parentElement.querySelector('details'); d.open = true; }); await wait(300);
  await page.screenshot({ path: `${SP}/level_${w}x${h}.png` });
  console.log(w, h, page.errs.join(' | ') || 'no errors');
}
// night mode for the kitchen menu
const page = await newPage(b, 844, 390); await login(page); await page.evaluate(() => SPG.night.set('on')); await openGame(page, 'Sprout Kitchen'); await wait(600);
await page.screenshot({ path: `${SP}/menu_night.png` });
stop(b);
