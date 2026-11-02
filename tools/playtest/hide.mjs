import { start, stop, newPage, login, openGame } from './lib.mjs';
const wait = ms => new Promise(r => setTimeout(r, ms));
process.env.PORT = process.env.PORT || '8142';
const b = await start();
for (const age of [2, 4, 7]) {
  const page = await newPage(b, 1280, 800); await login(page, { age }); await openGame(page, 'Hide and Seek'); await wait(500);
  const out = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); const g = SPG.app.running().inst; const res = [];
    for (let m = 0; m < 5; m++) {
      const hidden = g.spots.filter(s => s.friend).map(s => s.friend.kind);
      const teamBefore = g.team.map(t => t.kind), bagBefore = g.bag.team.slice();
      res.push({ map: g.mi, friends: hidden.length, teamMatchesBag: JSON.stringify(teamBefore) === JSON.stringify(bagBefore), overlap: hidden.filter(k => bagBefore.includes(k)), unique: new Set(hidden).size === hidden.length });
      for (const sp of g.spots) if (sp.friend && !sp.friend.found) g.reveal(sp);
      await wait(100); g.state = 'play'; g.leave(1); await wait(1800);
    }
    return res;
  });
  console.log('age', age, JSON.stringify(out)); console.log(page.errs.join(' | ') || 'no errors');
}
stop(b);
