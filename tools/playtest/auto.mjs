import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
const W = +process.argv[2] || 1280, H = +process.argv[3] || 800, only = process.argv[4] ? process.argv[4].split(',') : null, shots = process.argv[5] || '';
const wait = ms => new Promise(r => setTimeout(r, ms));
const P = page => page.evaluate(() => { const g = SPG.cookGame; return { ...g.probe(), cutters: g.cutters, spec: g.st && g.st.spec, arrowPos: g.arrow ? g.arrowPos() : null, tab: g.tab, hasSt: !!g.st, left: g.st && g.st.left ? g.st.left.length : 0, canvasTop: g.canvas.getBoundingClientRect().top, spec: g.st && g.st.spec, recipe: g.R && g.R.id, sauces: g.pieces.map(p => (p.paint || []).length), plate: g.screen === 'cook' ? g.plate() : null }; });
async function drag(page, pts, steps = 6) { await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down(); for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps }); await page.mouse.up(); }
// SPAM=1: at the start of every step a toddler mashes the screen first (fast taps everywhere, scribbles, a second finger,
// the helper's bubble tapped over and over), then the step is played as usual. Never the home button or the grid button.
const SPAM = !!process.env.SPAM;
// time allowed for a whole recipe and for one step (a slow machine, such as an iOS simulator on a build server, sets more)
const RECIPE_MS = (+process.env.RECIPE_SECS || 140) * 1000, STEP_MS = (+process.env.STEP_SECS || 50) * 1000;
async function spam(page, p, log, id) {
  const g = await page.evaluate(() => { const g = SPG.cookGame, m = g.menuBtn(); return { m, y0: g.y0, w: g.w, h: g.h }; });
  const ok = (x, y) => !(x < 110 && y < 110) && Math.hypot(x - g.m.x, y - g.m.y) > g.m.r * 1.8;
  const pt = () => { for (;;) { const x = 20 + Math.random() * (g.w - 40), y = g.y0 + Math.random() * (g.h - g.y0 - 10); if (ok(x, y)) return [x, y]; } };
  for (let i = 0; i < 24; i++) { const [x, y] = pt(); await page.mouse.click(x, y); await wait(12); }
  for (let i = 0; i < 3; i++) { const pts = [pt(), pt(), pt(), pt()]; await drag(page, pts, 2); }
  const q = await P(page); if (q.bubble) for (let i = 0; i < 8; i++) { await page.mouse.click(q.bubble.x, q.bubble.y); await wait(25); }
  // a second finger lands while the first is still down, then both lift in the wrong order
  const [ax, ay] = pt(), [bx, by] = pt();
  await page.evaluate(([ax, ay, bx, by]) => { const cv = SPG.cookGame.canvas, ev = (t, id, x, y, prim) => cv.dispatchEvent(new PointerEvent(t, { pointerId: id, isPrimary: prim, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' }));
    ev('pointerdown', 7, ax, ay, true); ev('pointerdown', 8, bx, by, false); ev('pointermove', 8, bx + 30, by + 10, false); ev('pointermove', 7, ax - 20, ay + 20, true); ev('pointerup', 8, bx + 30, by + 10, false); ev('pointerup', 7, ax - 20, ay + 20, true); }, [ax, ay, bx, by]);
  await wait(450);
  const snd = await page.evaluate(() => { const g = SPG.cookGame; return !!(g.snd && g.sndLive && !g.free); });
  if (snd) { log.push(`${id}: a sound loop is still playing with no finger down (${p.step})`); fails.push(`${id}: sound left on in ${p.step}`); }
}
async function playRecipe(page, id, log) {
  let p = await P(page);
  // choose it from the menu
  const recipes = await page.evaluate(() => [...new Set(SPG.cookGame.menuHit.map(m => m.id).filter(Boolean))]);
  const cat = await page.evaluate(i => SPG.cookKit.RECIPES.find(r => r.id === i).cat, id);
  let m = (await P(page)).menu.find(x => x.tab === cat); await page.mouse.click(m.x, m.y); await wait(300);
  m = (await P(page)).menu.find(x => x.id === id); await page.mouse.click(m.x, m.y); await wait(500);
  const t0 = Date.now(); let lastStep = '', stuck = 0, shot = {};
  while (Date.now() - t0 < RECIPE_MS) {
    p = await P(page);
    if (process.env.DBG) { const sig = `${p.screen} ${p.step} trans=${p.trans} fin=${p.st && p.st.fin} busy=${p.busy} auto=${JSON.stringify(p.auto)} check=${!!p.check}`; if (sig !== shot.sig) { shot.sig = sig; log.push(((Date.now() - t0) / 1000).toFixed(1) + ' ' + sig); } }
    if (p.screen === 'menu') break;
    if (p.screen === 'intro') { await page.mouse.click(W / 2, H / 2); await wait(300); continue; }
    if (p.trans) { await wait(150); continue; }
    // eaten up: the undo button under the camera must bring the whole food back (once per recipe), then it is eaten again
    if (p.finishedAll && !shot.undo && p.undo) { shot.undo = 1; if (shots.includes('undo')) await page.screenshot({ path: `${SP}/undo_${id}_${W}x${H}.png` }); await page.mouse.click(p.undo.x, p.undo.y); await wait(700); const q = await P(page); const back = (q.eat.some(Boolean) || q.ownEat) && !q.st.fin && !q.st.n; log.push(`${id}: undo after eating ${back ? 'OK' : 'FAILED'}`); if (!back) fails.push(`${id}: undo`); continue; }
    if (p.finishedAll && !shot.undo && !p.undo) { shot.undo = 1; log.push(`${id}: no undo button after eating`); fails.push(`${id}: no undo button`); }
    if (p.finishedAll) { if (shots.includes('serve') && !shot.done) { shot.done = 1; await page.screenshot({ path: `${SP}/done_${id}_${W}x${H}.png` }); } if (p.arrowPos) { await page.mouse.click(p.arrowPos.x, p.arrowPos.y); await wait(400); continue; } }
    // each step is timed on its own (a pizza has three decorate steps in a row, a cake two)
    const k = p.step, key = k + '#' + p.idx; if (key !== lastStep) { log.push(`${id}: ${k}`); lastStep = key; stuck = Date.now(); if (p.cam && /^(add|stir|roll|cut|bake|fill|pick|grill|stack|spread)$/.test(k)) { log.push(`${id}: the camera shows too early (${k})`); fails.push(`${id}: camera in ${k}`); } if (SPAM && p.screen === 'cook' && !(p.st && p.st.fin)) { await spam(page, p, log, id); continue; } }
    const U = p.U, bx = p.bx, by = p.by, st = p.st || {};
    if (st.fin && k !== 'serve') { if (process.env.DBG && Date.now() - (shot.dbg || 0) > 4000) { shot.dbg = Date.now(); log.push('waiting ' + JSON.stringify(await page.evaluate(() => { const g = SPG.cookGame, s = g.st; return { k: s.k, finT: s.finT, flies: g.flies.length, motions: g.motions.map(m => m.kind || m.type || Object.keys(m).join('/')), trans: !!g.trans, running: g.running }; }))); } await wait(200); continue; }
    if (p.busy) { await wait(120); continue; }
    // the camera: on the plate (serve, or a recipe's own eating step) a photo of the food goes into the kitchen album, once per recipe, before the first bite
    if (p.cam && !shot.cam && !p.finishedAll && !st.n && k !== 'decorate') { shot.cam = 1; const rest = await page.evaluate(() => Math.max(0, (SPG.cookGame.camUntil || 0) - SPG.cookGame.t)); if (rest) await wait(rest * 1000 + 300); // touches are ignored while a step slides in (slow on a simulator), and saving the picture can take a few seconds there; a tap that
      // did not start the camera (no flash) is tried once more
      for (let i = 0; i < 80 && (await P(page)).trans; i++) await wait(150);
      const before = (await P(page)).photos, cam = (await P(page)).cam || p.cam; let got = false;
      for (let tries = 0; tries < 2 && !got; tries++) {
        await page.mouse.click(cam.x, cam.y); await wait(200);
        const started = await page.evaluate(() => !!(SPG.cookGame.snapping || SPG.cookGame.snapAnim || SPG.cookGame.flash > 0));
        for (let i = 0; i < 130 && !got; i++) { got = (await P(page)).photos > before; if (!got) await wait(150); if (!started && i > 20) break; }
        // no photo: say what the game saw (did the touch reach it, was the camera resting or still saving, what lies over the button)
        if (!got) log.push(`${id}: photo try ${tries + 1} ${JSON.stringify(await page.evaluate(([cam, started]) => { const g = SPG.cookGame, r = g.canvas.getBoundingClientRect(), el = document.elementFromPoint(r.left + cam.x, r.top + cam.y);
          return { started, snapping: !!g.snapping, flash: +(g.flash || 0).toFixed(2), anim: !!g.snapAnim, rest: +((g.camUntil || 0) - g.t).toFixed(1), lastDown: g.downAt && { x: Math.round(g.downAt.x), y: Math.round(g.downAt.y), ago: +(g.t - g.downAt.t).toFixed(1) }, cam: g.camBtn(), trans: !!g.trans, menu: !!g.menu, step: g.st && g.st.k, photos: g.photoCount, canvas: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], over: el && (el.id || String(el.className || el.tagName)) }; }, [cam, started]))}`);
      } log.push(`${id}: photo ${got ? 'OK' : 'FAILED'}`); if (!got) fails.push(`${id}: photo`); continue; }
    // a kind of step that says how to play itself (SPG.cookKit H[kind].auto)
    if (p.auto) { const a = p.auto; if (a.tap) await page.mouse.click(a.tap[0], a.tap[1]); else if (a.drag) await drag(page, a.drag, a.steps || 4); await wait(a.wait || 250); continue; }
    if (k === 'pick') { const cd = p.cards[Math.floor(Math.random() * p.cards.length)]; await page.mouse.click(cd.x, cd.y); await wait(400); continue; }
    if (k === 'build') { const items = p.tray.filter(t => !t.used && t.id !== st.end); if ((st.n || 0) < 2 && items.length) { const it = items[Math.floor(Math.random() * items.length)]; await page.mouse.click(it.x, it.y); await wait(450); continue; } if (st.end) { const e = p.tray.find(t => t.id === st.end); await page.mouse.click(e.x, e.y); await wait(600); continue; } if (p.check) { await page.mouse.click(p.check.x, p.check.y); await wait(400); } else await wait(200); continue; }
    if (k === 'grill' && p.spec.free) { if (!st.closed && (st.placed || 0) < 2) { const it = p.tray[(st.placed || 0) % p.tray.length]; await page.mouse.click(it.x, it.y); await wait(500); continue; } if (!st.closed && p.check) { await page.mouse.click(p.check.x, p.check.y); await wait(200); } for (const u of st.units) if (u.state === 'flip') { await page.mouse.click(u.x, u.y); await wait(250); } await wait(300); continue; }
    if (k === 'decorate' && p.spec.mode === 'cover') { const s0 = p.slots[0]; for (let r = 0; r < 3; r++) { const pts = []; for (let a = 0; a < 2 * Math.PI; a += .25) pts.push([s0.x + Math.cos(a) * s0.r * (.3 + r * .3), s0.y + Math.sin(a) * s0.r * (.2 + r * .2)]); await drag(page, pts, 2); } const q = await P(page); if (q.check && !q.st.fin) { await page.mouse.click(q.check.x, q.check.y); await wait(300); } continue; }
    if (k === 'add') { const it = p.tray.find(t => !t.used && p.want.includes(t.id)); if (!it) { await wait(150); continue; } await drag(page, [[it.x, it.y], [bx, by]], 8); await wait(150); }
    else if (k === 'stir') { const pts = []; for (let a = 0; a < 3.2 * 2 * Math.PI; a += .3) pts.push([bx + Math.cos(a) * U * .2, by + Math.sin(a) * U * .12]); await drag(page, pts, 2); }
    else if (k === 'roll') { const pts = []; for (let i = 0; i < 8; i++) pts.push([bx + (i % 2 ? 1 : -1) * U * .3, by + (i % 3 - 1) * U * .05]); await drag(page, pts, 10); }
    else if (k === 'cut') {
      const sandwich = p.spec.target === 'piece'; const first = p.tray[0]; await page.mouse.click(first.x, first.y); await wait(200);
      const spots = sandwich ? [[-.14, -.14], [.14, -.14], [-.14, .14], [.14, .14]] : [[-.3, -.1], [0, -.1], [.3, -.1], [-.3, .13], [0, .13], [.3, .13]];
      let n = (await P(page)).cuts;
      for (const [x, y] of spots) { const q = await P(page); if (q.cuts >= spots.length) break; await page.mouse.click(bx + x * U, by + y * U); await wait(350); if (shots.includes('cut') && !shot.cut && (await P(page)).cuts === 2) { shot.cut = 1; await page.screenshot({ path: `${SP}/cut_${id}_${W}x${H}.png` }); } }
      await wait(400);
      if (!(await P(page)).st.fin) { const ck = (await P(page)).check; if (ck) await page.mouse.click(ck.x, ck.y); }
    }
    else if (k === 'fill') { const it = p.tray[0]; for (let i = 0; i < 8; i++) { const q = await P(page); if (q.st.fin) break; await page.mouse.click(it.x, it.y); await wait(500); } }
    else if (k === 'bake') { const o = await page.evaluate(() => { const g = SPG.cookGame, b = g.U * .78; return H_geom(); function H_geom() { const S = Math.min(g.U * .78, g.SH * .62); return { x: g.bx, y: g.y0 + g.SH * .36 }; } }); await page.mouse.click(o.x, o.y); await wait(1500); }
    else if (k === 'grill') { const it = p.tray.find(t => !t.used); if (it && p.st.units.length < 6 && (p.spec.existing ? false : true)) { const q = await P(page); const placed = q.st.units.length; if (it && !it.used) { await page.mouse.click(it.x, it.y); await wait(500); continue; } } for (const u of p.st.units) { if (u.state === 'flip') { await page.mouse.click(u.x, u.y); await wait(300); } if (u.state === 'pop') { await page.mouse.click(u.x, u.y - U * .12); await wait(300); } } await wait(300); }
    else if (k === 'stack') { const id2 = p.want[0]; const it = p.tray.find(t => t.id === id2); if (it) { await page.mouse.click(it.x, it.y); await wait(700); } }
    else if (k === 'decorate') {
      const spec = p.spec, sl = p.slots; const tools = p.tray.filter(t => t.kind === 'tool');
      if (process.env.DBG) log.push('decorate ' + JSON.stringify({ tools: tools.map(t => [t.id, Math.round(t.x), Math.round(t.y)]), sl: sl.map(q => [Math.round(q.x), Math.round(q.y), Math.round(q.r)]), check: p.check, st: p.st, cam: p.cam, tool: p.tool }));
      for (const tl of tools) {
        const q = await P(page); if (q.st.fin || q.check) break; await page.mouse.click(tl.x, tl.y); await wait(150);
        for (const s of sl.slice(0, Math.min(sl.length, 3))) { await drag(page, [[s.x - s.r * .5, s.y], [s.x, s.y - s.r * .1], [s.x + s.r * .5, s.y]], 6); await wait(120); }
        if (shots.includes('sauce') && !shot.sauce && /hotdog|burger|pizza/.test(id)) { shot.sauce = 1; await page.screenshot({ path: `${SP}/sauce_${id}_${W}x${H}.png` }); }
      }
      const q2 = await P(page); if (q2.check) { await page.mouse.click(q2.check.x, q2.check.y); await wait(300); } else if (!q2.st.fin) { for (let r = 0; r < 4; r++) for (const s of sl) { await page.mouse.click(s.x, s.y); await wait(100); } }
    }
    else if (k === 'slice') { const q = p.sliceG; await drag(page, [[q.x, q.top - 10], [q.x, q.bot + 10]], 12); await wait(300); }
    else if (k === 'serve') {
      if (shots.includes('serve') && !shot.s) { shot.s = 1; await wait(900); await page.screenshot({ path: `${SP}/serve_${id}_${W}x${H}.png` }); } for (let n = 0; n < 12; n++) { const q = await P(page); const i = q.eat.findIndex(Boolean); if (i < 0) break; const s0 = q.slots[i], e = q.eat[i]; await page.mouse.click(s0.x + e[0] * s0.r, s0.y + e[1] * s0.r); await wait(70); } if (shots.includes('serve') && !shot.s2) { shot.s2 = 1; await page.screenshot({ path: `${SP}/bitten_${id}_${W}x${H}.png` }); } }
    else await wait(200);
    if (Date.now() - stuck > STEP_MS) { log.push(`${id}: STUCK in ${k}`); fails.push(`${id}: stuck in ${k}`); await page.screenshot({ path: `${SP}/stuck_${id}_${k}_${W}x${H}.png` }); log.push(JSON.stringify(await page.evaluate(() => { const g = SPG.cookGame, s = g.st; return { k: s.k, spec: s.spec, fin: s.fin, canDone: s.canDone, cells: s.cells && s.cells.size, acts: s.acts, tool: g.tool, idle: g.idle, free: g.free, trans: !!g.trans, busy: g.busy() }; }))); break; }
  }
  const final = await P(page);
  // out of time or stuck: say where, and go back to the kitchen menu so the next recipe still gets its turn
  if (final.screen !== 'menu') { log.push(`${id}: not finished after ${Math.round((Date.now() - t0) / 1000)} s (${final.screen} ${final.step || ''})`); if (!fails.some(f => f.startsWith(id + ':'))) fails.push(`${id}: not finished`); await page.evaluate(() => SPG.cookGame.enterMenu()); await wait(500); }
  return { id, ok: final.screen === 'menu' };
}
const b = await start();
const page = await newPage(b, W, H); await login(page); await openGame(page, 'Sprout Kitchen');
const all = await page.evaluate(() => SPG.cookKit.RECIPES.map(r => r.id));
const log = [], fails = [];
for (const id of (only || all)) { const t0 = Date.now(); const r = await playRecipe(page, id, log); console.log(r.id, r.ok ? 'OK' : 'FAILED', ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
console.log(log.join('\n')); console.log(page.errs.join('\n') || 'no page errors'); if (fails.length) { console.log('FAILS:', fails.join(', ')); process.exitCode = 1; }
stop(b);
