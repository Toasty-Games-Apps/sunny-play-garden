// Choo-Choo Train: plays trains to the end by dropping blocks into cars, and checks that at EVERY moment the platform holds enough
// blocks to fill all the cars at once, and that the signs on the cars never change. usage: node train.mjs [age]
import { start, stop, newPage, login, openGame } from './lib.mjs';
process.env.PORT = process.env.PORT || '8294';
const age = +process.argv[2] || 4;
const b = await start(); const page = await newPage(b, 1280, 800); await login(page, { age });
await openGame(page, 'Choo-Choo Train'); await page.waitForTimeout(2500);
const res = await page.evaluate(async () => {
  const g = SPG.trainGame, wait = ms => new Promise(r => setTimeout(r, ms)); const bad = []; let trains = 0, drops = 0;
  const check = tag => {
    const free = g.items.filter(it => it.state !== 'placed' && it.state !== 'fly'), slots = []; for (const car of g.cars) for (let k = car.filled; k < car.need; k++) slots.push(car);
    const solve = (si, used) => { if (si === slots.length) return true; for (let i = 0; i < free.length; i++) { if (used[i] || !g.accepts(slots[si], free[i])) continue; used[i] = 1; if (solve(si + 1, used)) return true; used[i] = 0; } return false; };
    if (!solve(0, [])) { bad.push(tag); if (!window.__dbg) window.__dbg = JSON.stringify({ state: g.state, cars: g.cars.map(c => [c.type, c.val, c.need, c.filled]), items: g.items.map(i => [i.shape, i.col, i.state]) }); }
  };
  const signs = () => JSON.stringify(g.cars.map(c => [c.type, c.val, c.need]));
  for (let round = 0; round < 4; round++) {
    for (let t = 0; t < 60 && g.state !== 'ready'; t++) await wait(100);
    const sig = signs(); check('start' + round);
    for (let guard = 0; guard < 60 && !g.cars.every(c => c.filled >= c.need); guard++) {
      const car = g.cars.find(c => c.filled < c.need), it = g.items.find(i => i.state === 'home' && g.accepts(car, i));
      if (!it) { await wait(200); continue; }
      const i = g.cars.indexOf(car), r = g.bodyRect(i); g.drag = { it, id: 1, x: r.cx, y: r.y + r.h * .5, dx: 0, dy: 0 }; it.state = 'drag'; it.x = r.cx; it.y = r.y + r.h * .5;
      g.release(); drops++; check('after drop'); await wait(350); check('later'); if (signs() !== sig) bad.push('sign changed');
    }
    trains++; for (let t = 0; t < 80 && g.state !== 'ready'; t++) await wait(100);
    for (let t = 0; t < 60 && g.state === 'ready' && g.cars.every(c => c.filled >= c.need); t++) await wait(100);
  }
  return { trains, drops, bad: [...new Set(bad)], dbg: window.__dbg };
});
console.log(JSON.stringify(res), page.errs); stop(b);
