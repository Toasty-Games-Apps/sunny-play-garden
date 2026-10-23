// Regression checks for the review fixes: puzzle pieces after a turn of the screen and a tap on a piece, a tap hint in Shape Builder,
// the salon keeping her work and resting with Style Studio, the Pet Shop saying why, the clay album asking before deleting,
// clay never writing over a creation that has not loaded, Fish Tank coins kept and rescaled, and the Pet Care pet staying on screen.
// usage: node fixes.mjs
import { start, stop, newPage, login, openGame } from './lib.mjs';
process.env.PORT = process.env.PORT || '8317';
const b = await start(); let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const page = await newPage(b, 390, 844); await login(page, { age: 4 });
const inst = () => page.evaluate(() => !!SPG.app.running());
const home = async () => { await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(300); };

// Puzzle Pond
await openGame(page, 'Puzzle Pond'); await page.waitForTimeout(800);
{
  const p0 = await page.evaluate(() => { const g = SPG.app.running().inst, p = g.pieces.find(q => !q.locked); return { x: p.x, y: p.y, k: p.k }; });
  await page.mouse.click(p0.x, p0.y); await page.waitForTimeout(150);
  ok(await page.evaluate(k => SPG.app.running().inst.pieces.find(q => q.k === k).peek > 0, p0.k), 'puzzle: a tap on a piece lights its place');
  await page.mouse.move(p0.x, p0.y); await page.mouse.down(); await page.mouse.move(40, 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const g = SPG.app.running().inst; return { w: g.w, h: g.h, ts: g.ts, ps: g.pieces.filter(q => !q.locked).map(q => ({ x: q.x, y: q.y, sc: q.sc })) }; });
  ok(r.ps.every(q => q.x > 0 && q.x < r.w && q.y > 0 && q.y < r.h && Math.abs(q.sc - r.ts) < 1e-6), 'puzzle: after turning, loose pieces are back in the tray ' + JSON.stringify(r).slice(0, 300));
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
}
await home();

// Shape Builder
await openGame(page, 'Shape Builder'); await page.waitForTimeout(1500);
{
  const it = await page.evaluate(() => { const g = SPG.app.running().inst, i = g.items.find(i => i.state === 'home' && !i.decoy); return i && { x: i.x, y: i.y }; });
  ok(it, 'shapes: a piece waits in the tray');
  if (it) { await page.mouse.click(it.x, it.y); await page.waitForTimeout(200); ok(await page.evaluate(() => !!SPG.app.running().inst.hint), 'shapes: a tap on a piece pulses its hole'); }
}
await home();

// Hair Salon inside Style Studio
await openGame(page, 'Style Studio'); await page.waitForTimeout(800);
{
  await page.evaluate(() => SPG.app.running().inst.openSalon()); await page.waitForTimeout(500);
  const pr = await page.evaluate(() => SPG.salon.cur.probe()); const c0 = pr.cards[0];
  await page.mouse.click(c0.x + c0.s / 2, c0.y + c0.s / 2); await page.waitForTimeout(300);
  const e = await page.evaluate(() => SPG.salon.cur.probe());
  for (const row of [.25, .6]) { const y = e.hc.y + e.R * row; await page.mouse.move(e.hc.x - e.R * 1.6, y); await page.mouse.down(); for (let i = 0; i <= 24; i++) { await page.mouse.move(e.hc.x - e.R * 1.6 + e.R * 3.2 * i / 24, y, { steps: 2 }); await page.waitForTimeout(25); } await page.mouse.up(); }
  await page.waitForTimeout(200); const cut = await page.evaluate(() => SPG.salon.cur.probe()); ok(cut.undo > 0 && (cut.cuts > 0 || cut.pieces > 0), 'salon: the scissors cut ' + JSON.stringify([cut.cuts, cut.pieces, cut.undo]));
  await page.evaluate(() => { window.__hair = SPG.salon.cur.hair; });
  await page.evaluate(() => { SPG.app.running().inst.pause(); }); ok(!(await page.evaluate(() => SPG.salon.cur.running)), 'salon: rests when Style Studio pauses');
  await page.evaluate(() => { SPG.app.running().inst.resume(); }); ok(await page.evaluate(() => SPG.salon.cur.running), 'salon: wakes with Style Studio');
  await page.evaluate(() => SPG.salon.cur.button('close')); await page.waitForTimeout(200);
  ok(await page.evaluate(() => SPG.salon.cur.mode === 'pick' && SPG.salon.cur.cards[0].hair === window.__hair), 'salon: back keeps her work on its card');
  await page.evaluate(() => SPG.salon.cur.close());
}
await home();

// Pet Shop says why
await page.evaluate(() => { SPG.store.active.stars = 0; window.__said = []; const s = SPG.voice.say; SPG.voice.say = (k, ...a) => { window.__said.push(k); return s.call(SPG.voice, k, ...a); }; });
await openGame(page, 'Pet Shop'); await page.waitForTimeout(800);
{
  const b0 = await page.evaluate(() => { const el = [...document.querySelectorAll('button, .ps-card, [class*="card"]')].find(e => e._type === 'pet' && !SPG.pets.owns(e._item.id)); if (!el) return null; el.scrollIntoView(); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  ok(b0, 'shop: a pet to buy');
  if (b0) { await page.mouse.click(b0.x, b0.y); await page.waitForTimeout(300); ok(await page.evaluate(() => window.__said.includes('shop-stars')), 'shop: says more stars are needed: ' + await page.evaluate(() => window.__said.join(','))); }
}
await home();

// Clay Corner: album bin asks, and an early save cannot wipe the creation
await openGame(page, 'Clay Corner'); await page.waitForTimeout(1000);
{
  const r = await page.evaluate(async () => {
    const g = SPG.app.running().inst, out = {};
    g.pushUndo(); g.newPiece(SPG.clayKit.circle(.5, .5, .08, 1), 1); g.save();
    g.snap(); await new Promise(r => setTimeout(r, 1500));
    await g.openAlbum(); out.n0 = g.album.list.length; g.album.view = 0;
    const L = g.albumLayout(), t = { x: L.x + L.r + 10, y: L.y + L.r + 10 };
    g.albumDown(t.x, t.y); out.ask = !!g.album.ask; out.n1 = g.album.list.length;
    const cb = g.confirmBtns(); g.albumDown(cb.no.x, cb.no.y); out.askAfterNo = !!g.album.ask; out.n2 = g.album.list.length;
    g.albumDown(t.x, t.y); g.albumDown(cb.yes.x, cb.yes.y); await new Promise(r => setTimeout(r, 500)); out.n3 = g.album.list.length;
    g.closeAlbum(); out.objs = g.objs.length; return out;
  });
  ok(r.ask && r.n1 === r.n0 && !r.askAfterNo && r.n2 === r.n0 && r.n3 === r.n0 - 1, 'clay: the album bin asks first ' + JSON.stringify(r));
  await home();
  // reopen and save at once, before the creation has loaded: nothing may be written over it
  const r2 = await page.evaluate(async () => {
    document.querySelector('.card[aria-label="Clay Corner"]').dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
    const g = SPG.app.running().inst; const early = g.loaded; g.touched = true; g.save();
    await new Promise(r => setTimeout(r, 900)); return { early, objs: g.objs.length, loaded: g.loaded };
  });
  ok(!r2.early && r2.loaded && r2.objs === r.objs, 'clay: an early save keeps the old creation ' + JSON.stringify(r2) + ' was ' + r.objs);
}
await home();

// Fish Tank: coins kept between visits and moved with the screen
await openGame(page, 'Fish Tank'); await page.waitForTimeout(800);
{
  await page.evaluate(() => { const g = SPG.app.running().inst; for (let i = 0; i < 3; i++) g.coins.push({ x: g.w * (.3 + i * .2), y: g.h * .5, vy: 0, v: 1, rest: false, t: 0 }); });
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(1500);
  const a = await page.evaluate(() => { const g = SPG.app.running().inst; return { n: g.coins.length, w: g.w, h: g.h, ok: g.coins.every(c => c.x > 0 && c.x < g.w && c.y > 0 && c.y < g.h) }; });
  ok(a.n >= 3 && a.ok, 'fish tank: coins stay in the tank after turning ' + JSON.stringify(a));
  await home(); await openGame(page, 'Fish Tank'); await page.waitForTimeout(1500);
  const c = await page.evaluate(() => { const g = SPG.app.running().inst; return { n: g.coins.length, ok: g.coins.every(c => c.x > 0 && c.x < g.w && c.y > 0 && c.y < g.h) }; });
  ok(c.n === a.n && c.ok, 'fish tank: coins are still there next time ' + JSON.stringify(c));
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
}
await home();

// Pet Care: the pet stays on screen after turning
await openGame(page, 'Pet Care'); await page.waitForTimeout(1000);
{
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(500);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1500);
  const p = await page.evaluate(() => { const g = SPG.careGame.game; return { x: g.pet.x, w: g.w }; });
  ok(p.x > 0 && p.x < p.w, 'pet care: pet on screen after turning ' + JSON.stringify(p));
}
await home();
// Letter Garden: a letter she keeps missing comes back more often (uniform would be about 4%)
await openGame(page, 'Letter Garden'); await page.waitForTimeout(500);
{
  const f = await page.evaluate(() => { const g = SPG.app.running().inst, keep = g.bag.lt; g.bag.lt = { q: [0, 4] }; let n = 0; for (let i = 0; i < 2000; i++) if (g.pickLetter(SPG.glyphs.LETTERS) === 'q') n++; g.bag.lt = keep; return n / 2000; });
  ok(f > .1 && f < .4, 'letters: a missed letter comes back more often ' + f);
}
await home();
ok(!page.errs.length, 'errors: ' + page.errs.join(' | '));
stop(b); console.log(fails ? `FAILS: ${fails}` : 'FIXES OK');
