// Shape Builder: plays every picture at the chosen tiers by really dragging every piece (mouse) to its hole. Checks that each piece fits its hole (same
// shape, colour, size and turn), that everything is on screen, that the tray holds exactly the pieces to place (plus two look-alikes at tier 3), that a wrong
// piece or a look-alike slides home (and after two misses its own hole pulses), and that a finished picture celebrates and counts.
// usage: node shapes.mjs [W H tiers(e.g. 123) pictures(comma list or all)]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8343';
const W = +process.argv[2] || 1280, Hh = +process.argv[3] || 800, tiers = (process.argv[4] || '123').split('').map(Number), only = process.argv[5] && process.argv[5] !== 'all' ? process.argv[5].split(',') : null;
const b = await start(); const page = await newPage(b, W, Hh); await login(page, { age: 4 });
await openGame(page, 'Shape Builder'); await page.waitForTimeout(900);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 40) console.log('FAIL', m); } };
const P = () => page.evaluate(() => SPG.shapesGame.probe());
const IDS = await page.evaluate(() => ['house', 'rocket', 'car', 'boat', 'flower', 'fish', 'snowman', 'castle', 'tree', 'kite', 'icecream', 'cat', 'robot']);
const shot = async n => { await page.waitForTimeout(250); await page.screenshot({ path: `${SP}/shapes-${n}.png` }); };
const drag = async (it, x, y) => {   // grab the piece in the tray and carry it so that its centre ends at (x, y)
  const tgt = await page.evaluate(([hx, hy, tx, ty, key]) => { const g = SPG.shapesGame, it = g.items.find(i => Math.abs(i.hx - hx) < 1 && Math.abs(i.hy - hy) < 1); return g.pointerFor(it, tx, ty); }, [it.hx, it.hy, x, y, it.key]);
  await page.mouse.move(it.hx, it.hy); await page.mouse.down(); await page.mouse.move((it.hx + tgt.x) / 2, (it.hy + tgt.y) / 2, { steps: 4 }); await page.mouse.move(tgt.x, tgt.y, { steps: 5 }); await page.waitForTimeout(60); return tgt;
};
const ptrUp = async () => { await page.mouse.up(); await page.waitForTimeout(470); };
const RANGE = { 1: [3, 4], 2: [5, 7], 3: [8, 11] };
let played = 0;
for (const tier of tiers) {
  await page.evaluate(t => { if (!SPG.level._orig) SPG.level._orig = SPG.level.tier; SPG.level.tier = id => id === 'shapes' ? t : SPG.level._orig(id); }, tier);
  for (const id of IDS) {
    if (only && !only.includes(id)) continue;
    await page.evaluate(id => { const g = SPG.shapesGame; g.loadPic(id); g.intro = 1; }, id); await page.waitForTimeout(120);
    let p = await P(); const tag = `${id} tier ${tier} ${W}x${Hh}`;
    const openSlots = p.slots.filter(s => s.open), real = p.items.filter(i => !i.decoy), decoys = p.items.filter(i => i.decoy);
    ok(openSlots.length >= RANGE[tier][0] && openSlots.length <= RANGE[tier][1], `${tag}: ${openSlots.length} pieces to place`);
    ok(real.length === openSlots.length, `${tag}: one piece per hole (${real.length}/${openSlots.length})`);
    ok(decoys.length === (tier === 3 ? 2 : 0), `${tag}: ${decoys.length} look-alikes`);
    ok(p.slots.every(s => s.pre === !s.open), `${tag}: built parts are not holes`);
    // everything on screen; the tray holds the pieces; pieces are not tiny and fit their cell
    const t = p.tray;
    ok(p.slots.every(s => s.x - s.w / 2 >= p.board.x - 2 && s.x + s.w / 2 <= p.board.x + p.board.s + 2 && s.y - s.h / 2 >= p.board.y - 2 && s.y + s.h / 2 <= p.board.y + p.board.s + 2), `${tag}: holes inside the board`);
    ok(p.board.x >= 0 && p.board.y >= 0 && p.board.x + p.board.s <= p.w && p.board.y + p.board.s <= p.h, `${tag}: board on screen`);
    ok(p.items.every(i => i.hx - p.cell / 2 >= t.x - 1 && i.hx + p.cell / 2 <= t.x + t.w + 1 && i.hy - p.cell / 2 >= t.y - 1 && i.hy + p.cell / 2 <= t.y + t.h + 1), `${tag}: pieces inside the tray`);
    ok(p.items.every(i => i.dim <= p.cell * .86 && i.dim >= p.cell * .3), `${tag}: pieces fit their cells (${p.items.map(i => (i.dim / p.cell).toFixed(2)).join(' ')})`);
    ok(p.items.every(i => !p.items.some(j => j !== i && Math.hypot(i.hx - j.hx, i.hy - j.hy) < p.cell * .5)), `${tag}: pieces do not overlap`);
    // the right hole for every piece: same key (shape, size, turn, colour)
    ok(real.every(i => openSlots.some(s => s.key === i.key)), `${tag}: every piece has a hole of its own shape and colour`);
    // wrong tries: a real piece onto a hole it does not fit, then onto a bare spot of the board; a look-alike onto the hole of its own shape
    if (id === 'house' || id === 'robot' || id === 'kite') {
      // a hole that is not the piece's own and not close enough to its own hole for the drop to count there
      const snapOf = s => Math.max(Math.max(s.w, s.h) * .55, 36 * p.ui), far = (i, s) => openSlots.filter(o => o.key === i.key).every(o => Math.hypot(o.x - s.x, o.y - s.y) > snapOf(o) + 12);
      let wi = null, ws = null; for (const i of real) { const s = openSlots.find(s => s.key !== i.key && far(i, s)); if (s) { wi = i; ws = s; break; } }
      if (wi && ws) {
        for (let k = 0; k < 2; k++) { const before = (await P()).open; await drag(wi, ws.x, ws.y); await ptrUp(); const a = await P(); ok(a.open === before, `${tag}: a wrong piece is not accepted`); ok(a.items.find(i => i.key === wi.key && Math.abs(i.x - i.hx) < 2 && Math.abs(i.y - i.hy) < 2), `${tag}: the wrong piece slid home`); if (k === 1) ok(a.hint, `${tag}: after two misses the right hole pulses`); }
        await page.evaluate(() => { SPG.shapesGame.hint = null; });
      }
      if (tier === 3 && decoys.length) { const d = decoys[0], like = openSlots.find(s => s.shape === d.shape); if (like) { const before = (await P()).open; await drag(d, like.x, like.y); await ptrUp(); ok((await P()).open === before, `${tag}: a look-alike (wrong colour) is not accepted`); } }
      await drag(real[0], p.board.x + p.board.s * .02, p.board.y + p.board.s * .02); await ptrUp(); ok((await P()).open === openSlots.length, `${tag}: dropping on bare paper changes nothing`);
    }
    // the real thing: every piece into its hole
    if (id === 'house' && tier === 2) await shot(`t2-${W}x${Hh}-start`);
    let n = 0;
    for (const it of real) {
      const cur = await P(), want = cur.slots.find(s => s.open && s.key === it.key); if (!want) { ok(false, `${tag}: no open hole for ${it.key}`); break; }
      const before = cur.open; await drag(it, want.x, want.y);
      const g = await page.evaluate(() => { const d = SPG.shapesGame.drag; return d ? { x: d.it.x, y: d.it.y } : null; }); if (n === Math.floor(real.length / 2) && (id === 'house' || id === 'rocket')) await shot(`${id}-t${tier}-${W}x${Hh}-holding`);
      await ptrUp(); const a = await P();
      ok(a.open === before - 1, `${tag}: piece ${it.key} fits (${before} -> ${a.open})`); n++;
      if (n === Math.floor(real.length / 2) && (id === 'house' || id === 'flower' || id === 'robot')) await shot(`${id}-t${tier}-${W}x${Hh}-half`);
    }
    await page.waitForTimeout(200); p = await P();
    ok(p.open === 0 && p.state === 'cheer', `${tag}: finished, celebrating (${p.state}, ${p.open} open)`);
    if (p.state === 'cheer') { const built = p.built; await page.waitForTimeout(1200); if (['rocket', 'house', 'car', 'castle'].includes(id) && tier === 2) await shot(`${id}-cheer-${W}x${Hh}`); }
    played++;
  }
}
// tap a piece, then tap its hole: it goes in (for fingers that find dragging hard)
{
  await page.evaluate(() => { const g = SPG.shapesGame; g.loadPic('house'); g.intro = 1; }); await page.waitForTimeout(200);
  let p = await P(); const it = p.items.find(i => !i.decoy), q = p.slots.find(s => s.open && s.key === it.key), open0 = p.open;
  await page.mouse.click(it.hx, it.hy); await page.waitForTimeout(300); await page.mouse.click(q.x, q.y); await page.waitForTimeout(900);
  p = await P(); ok(p.open === open0 - 1, `tap a piece then its hole: it goes in (${open0} -> ${p.open})`);
}
const cnt = await page.evaluate(() => SPG.shapesGame.bag.built);
ok(cnt >= played, `built counter went up (${cnt} / ${played})`);
ok(page.errs.length === 0, 'no page errors ' + page.errs.join('|'));
console.log(fails ? fails + ' FAILED' : 'Shape Builder OK', W + 'x' + Hh, 'tiers', tiers.join(''), played + ' pictures played'); stop(b);
