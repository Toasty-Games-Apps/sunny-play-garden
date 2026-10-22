// Real touch input (not the mouse): two fingers tapping two apps at once must open only one game, and every game must survive
// a toddler mashing the screen (taps, drags and several fingers at once, avoiding only the home button). usage: node touch.mjs [taps per game]
import { start, stop, login } from './lib.mjs';
process.env.PORT = process.env.PORT || '8147';
const wait = ms => new Promise(r => setTimeout(r, ms));
const TAPS = +process.argv[2] || 60;
const b = await start(); let bad = 0;
// a small seeded random, so a failure can be replayed
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

for (const [w, h, age] of [[390, 844, 2], [1280, 800, 2], [844, 390, 7]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('http://localhost:' + process.env.PORT + '/index.html'); await wait(400);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const tap = async (...pts) => { await touch('touchStart', pts); await wait(40); await touch('touchEnd', []); };
  const drag = async (pts, dx, dy, steps = 6) => {
    await touch('touchStart', pts);
    for (let i = 1; i <= steps; i++) { await touch('touchMove', pts.map(([x, y]) => [x + dx * i / steps, y + dy * i / steps])); await wait(16); }
    await touch('touchEnd', []);
  };
  await login(page, { age });
  const center = name => page.evaluate(n => { const r = document.querySelector(`.card[aria-label="${n}"]`).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, name);
  // 1. two fingers on two apps of the first page
  const firstTwo = await page.evaluate(() => [...document.querySelectorAll('.card')].filter(c => { const r = c.getBoundingClientRect(); return r.x >= 0 && r.right <= innerWidth; }).slice(0, 2).map(c => c.getAttribute('aria-label')));
  const [p1, p2] = [await center(firstTwo[0]), await center(firstTwo[1])];
  await touch('touchStart', [p1, p2]); await wait(60); await touch('touchEnd', []); await wait(600);
  const opened = await page.evaluate(() => [document.body.dataset.screen, document.querySelectorAll('#game-host > *').length]);
  console.log(`${w}x${h} two-finger tap on ${firstTwo.join(' + ')}: screen ${opened[0]}, ${opened[1]} game element(s)`);
  if (opened[0] === 'stage') { await page.evaluate(() => SPG.app.closeGame()); await wait(300); }
  // 2. mash every game
  const names = await page.evaluate(() => SPG.games.map(g => g.name));
  for (const name of names) {
    const before = errs.length;
    await page.evaluate(n => document.querySelector(`.card[aria-label="${n}"], .shopfront[aria-label="${n}"]`).dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })), name);
    await wait(700);
    const safeY = Math.min(90, h * .12);   // keep away from the home button row
    for (let i = 0; i < TAPS; i++) {
      if (await page.evaluate(() => document.body.dataset.screen) !== 'stage') break;
      const x = 8 + rnd() * (w - 16), y = safeY + rnd() * (h - safeY - 8), k = rnd();
      if (k < .5) await tap([x, y]);
      else if (k < .8) await drag([[x, y]], (rnd() - .5) * w * .5, (rnd() - .5) * h * .4);
      else if (k < .92) await tap([x, y], [Math.min(w - 4, x + 60), Math.min(h - 4, y + 30)], [Math.max(4, x - 50), Math.min(h - 4, y + 60)]);
      else await drag([[x, y], [Math.min(w - 4, x + 80), y]], 0, (rnd() - .5) * h * .3);
      await wait(30 + rnd() * 120);
    }
    await wait(300);
    // whatever state the game ended in, Home must bring her back
    await page.evaluate(() => document.querySelectorAll('.overlay:not(.hidden) .btn.quiet, .ps-overlay .btn.quiet').forEach(b => b.click()));
    await page.evaluate(() => SPG.app.closeGame()); await wait(250);
    const screen = await page.evaluate(() => document.body.dataset.screen);
    const e = errs.slice(before);
    if (e.length || screen !== 'hub') { bad++; console.log(`  ${name} at ${w}x${h} age ${age}: screen ${screen}`, e.join(' | ')); }
  }
  console.log(`${w}x${h} age ${age}: ${names.length} games mashed`);
  await ctx.close();
}
stop(b); console.log(bad ? `PROBLEMS: ${bad}` : 'TOUCH OK');
