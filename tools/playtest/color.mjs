// Coloring Book: every collection tab, every brush style, pattern fills, stickers (stamp, drag, peel), undo, start over,
// compaction, saving across a reload, the PNG download, Puzzle Pond drawing her picture, old saves looking exactly as before,
// the holiday dates, and the tools and colors fitting the screen. Runs at 390x844 and 1280x800 (SIZES=WxH,WxH to change).
// usage: node tools/playtest/color.mjs        (SHOTS=<dir> also writes screenshots and a painted sheet of every collection)
import { start, stop, newPage, login, openGame } from './lib.mjs';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
process.env.PORT = process.env.PORT || '8450';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHOTS = process.env.SHOTS || '';
const SIZES = (process.env.SIZES || '390x844,1280x800').split(',').map(s => s.split('x').map(Number));
const b = await start();
let fails = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('OK  ', m); } else { fails++; console.log('FAIL', m); } };

// ---------------------------------------------------------------- helpers that run in the page
const HELPERS = () => {
  const C = SPG.coloring, W = 1000, H = 800;
  window.T = {
    g: () => C.game,
    // a point (in picture units) that really hits this section
    pointIn(defId, secId) {
      const def = SPG.pictures.find(p => p.id === defId), sh = C.compile(def), s = sh.byId[secId], hits = [];
      for (let y = s.bb.y + 4; y < s.bb.y + s.bb.height; y += 8) for (let x = s.bb.x + 4; x < s.bb.x + s.bb.width; x += 8) if (x > 0 && y > 0 && x < W && y < H && C.hit(sh, x, y).id === secId) hits.push([x, y]);
      // prefer a point well inside, near the middle of the section: all its neighbours hit it too
      const mx = hits.reduce((a, h) => a + h[0], 0) / hits.length, my = hits.reduce((a, h) => a + h[1], 0) / hits.length;
      const inner = hits.filter(([x, y]) => [[-24, 0], [24, 0], [0, -24], [0, 24], [-17, -17], [17, 17]].every(([a, b]) => x + a > 6 && y + b > 6 && x + a < W - 6 && y + b < H - 6 && C.hit(sh, x + a, y + b).id === secId));
      let best = hits[0], bd = Infinity;
      for (const [x, y] of inner.length ? inner : hits) { const d = Math.hypot(x - mx, y - my); if (d < bd) { bd = d; best = [x, y]; } }
      return best;
    },
    toClient(x, y) { const r = C.game.paper.getBoundingClientRect(); return [r.left + x / W * r.width, r.top + y / H * r.height]; },
    px(layer, x, y) { const cv = C.game.paper.querySelector(layer), k = cv.width / W, d = cv.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data; return [d[0], d[1], d[2], d[3]]; },
    hex: h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; },
    near: (a, b, t = 10) => Math.abs(a[0] - b[0]) <= t && Math.abs(a[1] - b[1]) <= t && Math.abs(a[2] - b[2]) <= t,
    renderURL(defId, ops, w = 500) { const cv = document.createElement('canvas'); cv.width = w; cv.height = w * .8; C.render(cv.getContext('2d'), SPG.pictures.find(p => p.id === defId), ops, w); return cv.toDataURL(); },
    ops: () => C.game.ops.map(o => JSON.parse(JSON.stringify(o)))
  };
};

async function tapPic(page, x, y) { const [cx, cy] = await page.evaluate(([x, y]) => T.toClient(x, y), [x, y]); await page.mouse.click(cx, cy); await page.waitForTimeout(60); }
async function dragPic(page, pts) {
  const cl = await page.evaluate(pts => pts.map(([x, y]) => T.toClient(x, y)), pts);
  await page.mouse.move(cl[0][0], cl[0][1]); await page.mouse.down();
  for (let i = 1; i < cl.length; i++) await page.mouse.move(cl[i][0], cl[i][1], { steps: 6 });
  await page.mouse.up(); await page.waitForTimeout(80);
}
const press = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); }, sel);
const lastOp = page => page.evaluate(() => JSON.parse(JSON.stringify(SPG.coloring.game.ops.at(-1) || null)));

// ---------------------------------------------------------------- holiday dates (no page needed beyond the script)
{
  const page = await newPage(b, 390, 844);
  const cases = [['2026-10-24', ['halloween']], ['2026-11-20', ['thanksgiving']], ['2026-11-28', ['hanukkah', 'christmas']], ['2026-12-15', ['christmas']], ['2027-12-20', ['hanukkah', 'christmas']],
    ['2027-02-03', ['lunar', 'valentine']], ['2027-02-12', ['lunar', 'valentine']], ['2027-03-20', ['easter']], ['2027-07-02', ['summer']], ['2027-05-10', []], ['2028-01-20', ['lunar']]];
  const got = await page.evaluate(cs => cs.map(([d]) => { const [y, m, dd] = d.split('-').map(Number); return SPG.coloring.seasonsNow(new Date(y, m - 1, dd)); }), cases);
  cases.forEach(([d, want], i) => ok(JSON.stringify(got[i]) === JSON.stringify(want), `seasons on ${d}: ${JSON.stringify(got[i])}`));
  await page.context().close();
}

// ---------------------------------------------------------------- old saves look exactly the same as with the previous engine
{
  const head = f => { try { return execSync(`git show HEAD:${f}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (_) { return null; } };
  const old = { 'games/color.js': head('games/color.js'), 'games/color-dinos.js': head('games/color-dinos.js'), 'games/color-seasons.js': head('games/color-seasons.js') };
  if (old['games/color.js'] && !/RAINBOW/.test(old['games/color.js'])) {
    const legacy = {
      bunny: [[0, 'sky', 6], [0, 'head', 10], [1, 'ears', 0, [380, 120, 420, 200, 450, 260]], [2, 'head', [450, 400, 520, 420]], [0, 'carrot', 1], [3, 'carrot'], [0, 'carrot', 2], [0, 'ground', 13]],
      trex: [[0, 'spots', 3], [0, 'body', 4], [0, 'legs', 5], [1, 'body', 8, [400, 400, 500, 450, 560, 420]]],
      jack: [[0, 'sky', 13], [4], [0, 'seg-m', 1], [0, 'stars', 2]]
    };
    const shoot = async useOld => {
      const page = await newPage(b, 390, 844);
      if (useOld) for (const [f, src] of Object.entries(old)) if (src) await page.route('**/' + f + '*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: src }));
      if (useOld) await page.reload();
      await login(page, { age: 4 });
      const urls = await page.evaluate(L => {
        const bag = SPG.store.bag('color', () => ({ v: 1, pics: {} })); bag.pics = bag.pics || {};
        const out = {};
        for (const [id, ops] of Object.entries(L)) { bag.pics[id] = { ops }; const cv = document.createElement('canvas'); cv.width = 600; cv.height = 480; SPG.coloring.draw(cv.getContext('2d'), SPG.pictures.find(p => p.id === id), 600); out[id] = cv.toDataURL(); }
        return out;
      }, legacy);
      await page.context().close();
      return urls;
    };
    const a = await shoot(true), n = await shoot(false);
    for (const id of Object.keys(legacy)) ok(a[id] === n[id], `old save of "${id}" looks exactly as it did with the previous engine`);
  } else console.log('(skipped the old-engine comparison: HEAD already has the new engine)');
}

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  const page = await newPage(b, w, h); await login(page, { age: 4 });
  await openGame(page, 'Coloring Book'); await page.waitForTimeout(900);
  await page.evaluate(HELPERS);

  // ---- tabs: every collection, each with its pictures and a painted emblem
  const groups = await page.evaluate(() => SPG.pictureGroups.map(g => ({ id: g.id, name: g.name, n: SPG.pictures.filter(p => p.group === g.id).length })));
  ok(groups.length >= 12 && (await page.$$('.cb-tab')).length === groups.length, `${tag}: ${groups.length} collection tabs`);
  ok(await page.evaluate(() => SPG.coloring.game.tab) === 'halloween' || new Date().getMonth() !== 9, `${tag}: the coming holiday's tab opens first`);
  for (const g of groups) {
    await page.evaluate(n => document.querySelector(`.cb-tab[aria-label="${n}"]`).click(), g.name); await page.waitForTimeout(250);
    const r = await page.evaluate(id => {
      const vis = [...document.querySelectorAll('.cb-tile:not(.hidden)')], t = [...document.querySelectorAll('.cb-tab')].find(b => b.getAttribute('aria-pressed') === 'true');
      const tr = t.getBoundingClientRect(), strip = document.querySelector('.cb-tabs').getBoundingClientRect();
      const cv = t.querySelector('canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let colored = 0; for (let i = 0; i < d.length; i += 4 * 37) if (d[i + 3] > 0 && !(d[i] > 245 && d[i + 1] > 240 && d[i + 2] > 230)) colored++;
      return { vis: vis.length, sameGroup: vis.every(v => v.dataset.group === id), inView: tr.left >= strip.left - 1 && tr.right <= strip.right + 1, colored, tab: SPG.coloring.game.tab };
    }, g.id);
    ok(r.tab === g.id && r.vis === g.n && r.sameGroup && r.inView && r.colored > 20, `${tag}: tab "${g.name}" shows its ${g.n} pictures (${JSON.stringify(r)})`);
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/color-gallery-${tag}.png` });

  // ---- open a picture from its tile
  await page.evaluate(() => document.querySelector('.cb-tab[aria-label="Valentine\'s Day"]').click()); await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.cb-tile:not(.hidden) .cb-open[aria-label="Love bear"]').click()); await page.waitForTimeout(600);
  ok(await page.evaluate(() => SPG.coloring.game.view === 'editor' && SPG.coloring.game.cur.id === 'lovebear'), `${tag}: a tile opens its picture`);

  // ---- tools and colors fit on the screen, big enough for small fingers, never on top of the page
  const fit = await page.evaluate(() => {
    const paper = document.querySelector('.cb-paper').getBoundingClientRect(), all = [...document.querySelectorAll('.cb-tool, .cb-sw')].map(e => e.getBoundingClientRect());
    const inside = all.every(r => r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1);
    const over = all.filter(r => r.left < paper.right - 2 && r.right > paper.left + 2 && r.top < paper.bottom - 2 && r.bottom > paper.top + 2).length;
    return { inside, over, min: Math.round(Math.min(...all.map(r => Math.min(r.width, r.height)))), n: all.length, paper: [Math.round(paper.width), Math.round(paper.height)] };
  });
  ok(fit.inside && fit.over === 0 && fit.min >= 40 && fit.n === 32, `${tag}: 8 tools and 24 colors fit, none over the page, smallest ${fit.min}px (${JSON.stringify(fit)})`);

  // ---- plain bucket fill
  const head = await page.evaluate(() => T.pointIn('lovebear', 'head'));
  await press(page, '.cb-sw[data-ci="7"]'); await tapPic(page, ...head);
  let op = await lastOp(page);
  ok(op && op[0] === 0 && op[1] === 'head' && op[2] === 7, `${tag}: bucket fills the head (${JSON.stringify(op)})`);
  ok(await page.evaluate(([x, y]) => T.near(T.px('.cb-paint', x, y), T.hex(SPG.coloring.PALETTE[7])), head), `${tag}: the head is painted blue`);

  // ---- pattern fills: the bucket again opens its choices
  await press(page, '.cb-tool[data-tool="bucket"]'); await page.waitForTimeout(150);
  ok(await page.$('.cb-pop[data-kind="fill"]') && (await page.$$('.cb-pop .cb-opt')).length === 5, `${tag}: touching the bucket again opens 5 fill choices`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/color-fills-${tag}.png` });
  await press(page, '.cb-opt[data-opt="dots"]'); await page.waitForTimeout(100);
  ok(!(await page.$('.cb-pop')), `${tag}: choosing closes the pop-out`);
  await press(page, '.cb-sw[data-ci="14"]');
  const body = await page.evaluate(() => T.pointIn('lovebear', 'body'));
  await tapPic(page, ...body); op = await lastOp(page);
  ok(op && op[0] === 7 && op[1] === 'body' && op[2] === 14 && op[3] === 'dots', `${tag}: dots fill on the body (${JSON.stringify(op)})`);
  const bodyCols = await page.evaluate(() => { const s = SPG.coloring.compile(SPG.coloring.game.cur).byId.body, set = new Set(); for (let y = s.bb.y + 20; y < s.bb.y + s.bb.height - 20; y += 9) for (let x = s.bb.x + 20; x < s.bb.x + s.bb.width - 20; x += 9) if (SPG.coloring.hit(SPG.coloring.compile(SPG.coloring.game.cur), x, y).id === 'body') set.add(T.px('.cb-paint', x, y).slice(0, 3).map(v => v >> 4).join(',')); return set.size; });
  ok(bodyCols >= 2, `${tag}: the dots pattern has the color and its tint (${bodyCols} tones)`);
  // the heart is in front of the body: the pattern must not leak into it
  const heartPt = await page.evaluate(() => T.pointIn('lovebear', 'heart'));
  ok(await page.evaluate(([x, y]) => T.near(T.px('.cb-paint', x, y), T.hex('#fffdf6')), heartPt), `${tag}: the pattern stays out of the heart in front of the body`);
  for (const [pat, sec] of [['stripes', 'sky'], ['hearts', 'heart'], ['stars', 'ground']]) {
    await press(page, '.cb-tool[data-tool="bucket"]'); await page.waitForTimeout(80); await press(page, `.cb-opt[data-opt="${pat}"]`);
    await tapPic(page, ...(await page.evaluate(s => T.pointIn('lovebear', s), sec))); op = await lastOp(page);
    ok(op && op[0] === 7 && op[1] === sec && op[3] === pat, `${tag}: ${pat} fill on the ${sec}`);
  }
  await press(page, '.cb-tool[data-tool="bucket"]'); await page.waitForTimeout(80); await press(page, '.cb-opt[data-opt="plain"]');
  ok(await page.evaluate(() => SPG.coloring.game.fillStyle) === 'plain', `${tag}: back to a plain fill`);

  // ---- brushes: plain (clipped), rainbow, glitter
  await press(page, '.cb-tool[data-tool="brush"]'); await press(page, '.cb-sw[data-ci="2"]');
  const sky1 = await page.evaluate(() => T.pointIn('lovebear', 'sky'));
  const headC = await page.evaluate(() => { const s = SPG.coloring.compile(SPG.coloring.game.cur).byId.head; return [s.bb.x + s.bb.width / 2, s.bb.y + s.bb.height * .3]; });
  await dragPic(page, [sky1, [sky1[0] + 40, sky1[1] + 20], headC]); op = await lastOp(page);
  ok(op && op[0] === 1 && op[1] === 'sky' && op[3].length >= 4, `${tag}: plain brush stroke in the sky (${JSON.stringify(op).slice(0, 60)})`);
  ok(await page.evaluate(([x, y]) => !T.near(T.px('.cb-paint', x, y), T.hex(SPG.coloring.PALETTE[2]), 20), headC), `${tag}: the brush stroke never crosses into the head`);
  await press(page, '.cb-tool[data-tool="brush"]'); await page.waitForTimeout(80);
  ok((await page.$$('.cb-pop[data-kind="brush"] .cb-opt')).length === 3, `${tag}: touching the brush again offers 3 brushes`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/color-brushes-${tag}.png` });
  await press(page, '.cb-opt[data-opt="rainbow"]');
  const g0 = await page.evaluate(() => { const s = SPG.coloring.compile(SPG.coloring.game.cur).byId.ground; return [s.bb.x, s.bb.y + s.bb.height]; });
  const rpts = [[40, 760], [250, 740], [500, 770], [700, 735], [960, 760]];
  await dragPic(page, rpts); op = await lastOp(page);
  ok(op && op[0] === 5 && op[1] === 'ground', `${tag}: rainbow stroke (${JSON.stringify(op).slice(0, 50)})`);
  const hues = await page.evaluate(pts => { const set = new Set(); for (let i = 0; i <= 40; i++) { const t = i / 40, k = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))), f = t * (pts.length - 1) - k, x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, [r, g, b2] = T.px('.cb-paint', x, y); const mx = Math.max(r, g, b2), mn = Math.min(r, g, b2); if (mx - mn < 40) continue; const h = mx === r ? ((g - b2) / (mx - mn) + 6) % 6 : mx === g ? (b2 - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; set.add(Math.floor(h)); } return set.size; }, rpts);
  ok(hues >= 4, `${tag}: the rainbow stroke goes through ${hues} kinds of color`);
  await press(page, '.cb-tool[data-tool="brush"]'); await page.waitForTimeout(80); await press(page, '.cb-opt[data-opt="glitter"]'); await press(page, '.cb-sw[data-ci="8"]');
  await dragPic(page, [[120, 60], [300, 90], [420, 40], [620, 80], [860, 50]]); op = await lastOp(page);
  ok(op && op[0] === 6 && op[1] === 'sky' && op[2] === 8, `${tag}: glitter stroke (${JSON.stringify(op).slice(0, 50)})`);
  ok(await page.evaluate(() => { const o = T.ops(); return T.renderURL('lovebear', o) === T.renderURL('lovebear', o); }), `${tag}: glitter sparkles land in the same places every time`);

  // ---- stickers: choose, stamp, drag into place, peel with the eraser
  await press(page, '.cb-tool[data-tool="sticker"]'); await page.waitForTimeout(150);
  ok((await page.$$('.cb-pop[data-kind="sticker"] .cb-opt')).length === 12, `${tag}: the sticker tool opens 12 stickers`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/color-stickers-${tag}.png` });
  await press(page, '.cb-opt[data-opt="butterfly"]');
  await tapPic(page, 160, 260); op = await lastOp(page);
  ok(op && op[0] === 8 && op[1] === null && op[2] === 'butterfly' && Math.abs(op[3] - 160) < 3 && Math.abs(op[4] - 260) < 3, `${tag}: a butterfly sticker is stamped where she touched (${JSON.stringify(op)})`);
  ok(await page.evaluate(() => T.px('.cb-stickers', 160, 260)[3] > 200), `${tag}: the sticker is drawn on top`);
  await press(page, '.cb-tool[data-tool="sticker"]'); await page.waitForTimeout(80); await press(page, '.cb-opt[data-opt="rainbow"]');
  await dragPic(page, [[820, 420], [860, 500], [870, 600]]); op = await lastOp(page);
  ok(op && op[2] === 'rainbow' && Math.abs(op[3] - 870) < 4 && Math.abs(op[4] - 600) < 4, `${tag}: a sticker can be dragged into place before it sticks (${JSON.stringify(op)})`);
  const nOps = (await page.evaluate(() => SPG.coloring.game.ops.length));
  await press(page, '.cb-tool[data-tool="erase"]'); await tapPic(page, 160, 262); op = await lastOp(page);
  ok(op && op[0] === 9 && (await page.evaluate(() => T.px('.cb-stickers', 160, 260)[3])) < 30, `${tag}: the eraser peels the sticker off (${JSON.stringify(op)})`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/color-painted-${tag}.png` });

  // ---- undo brings the sticker back; start over clears everything and can itself be undone
  await press(page, '.cb-undo'); await page.waitForTimeout(80);
  ok((await page.evaluate(() => SPG.coloring.game.ops.length)) === nOps && (await page.evaluate(() => T.px('.cb-stickers', 160, 260)[3])) > 200, `${tag}: undo puts the peeled sticker back`);
  const beforeAll = await page.evaluate(() => T.renderURL('lovebear', T.ops()));
  await press(page, '.cb-tool[aria-label="Start over"]'); await page.waitForTimeout(150);
  await press(page, '.cb-yn[aria-label="Yes, start over"]'); await page.waitForTimeout(150);
  ok((await lastOp(page))[0] === 4 && (await page.evaluate(([x, y]) => T.near(T.px('.cb-paint', x, y), T.hex('#fffdf6')), head)) && (await page.evaluate(() => T.px('.cb-stickers', 870, 600)[3])) === 0, `${tag}: start over clears the paint and the stickers`);
  await press(page, '.cb-undo'); await page.waitForTimeout(80);
  ok((await page.evaluate(() => T.renderURL('lovebear', T.ops()))) === beforeAll, `${tag}: start over can be undone`);

  // ---- compaction keeps the look; MAX_OPS keeps stickers and fills
  ok(await page.evaluate(() => { const o = T.ops(), c = SPG.coloring.compact(o); return c.length <= o.length && T.renderURL('lovebear', c) === T.renderURL('lovebear', o); }), `${tag}: the compacted save looks the same`);
  ok(await page.evaluate(() => { const o = [[0, 'sky', 3], [8, null, 'star', 100, 100, 0], [8, null, 'heart', 300, 300, 5], [9, null, 101, 99]]; const c = SPG.coloring.compact(o); return c.length === 2 && c[1][2] === 'heart'; }), `${tag}: a peeled sticker and its peel are left out of the save`);
  ok(await page.evaluate(() => { const o = [[7, 'sky', 3, 'dots'], ...Array.from({ length: 1300 }, (_, i) => [i % 2 ? 5 : 6, 'ground', 2, [i, 700, i + 9, 710]]), [8, null, 'fish', 500, 400, 0], [0, 'head', 4]]; const c = SPG.coloring.compact(o); return c.length <= 1200 && c.some(x => x[0] === 8) && c.some(x => x[0] === 7) && c.some(x => x[0] === 0); }), `${tag}: past 1200 operations the oldest strokes go, fills and stickers stay`);

  // ---- saving: back to the gallery, reload, open again
  const saved = await page.evaluate(() => SPG.coloring.compact(T.ops()));
  await press(page, '.cb-tool[aria-label="All pictures"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => SPG.coloring.game.view === 'gallery' && SPG.coloring.game.stateOf('lovebear') === 'wip'), `${tag}: back in the gallery the picture is marked as started`);
  const dlBtn = await page.evaluateHandle(() => [...document.querySelectorAll('.cb-tile')].find(t => t.querySelector('.cb-open[aria-label="Love bear"]')).querySelector('.cb-dl'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), dlBtn.click()]);
  if (dl) { const p = await dl.path(), buf = readFileSync(p); ok(dl.suggestedFilename() === 'little-sprout-park-lovebear.png' && buf.length > 5000 && buf.slice(1, 4).toString() === 'PNG', `${tag}: the PNG download works (${buf.length} bytes)`); }
  else ok(false, `${tag}: the PNG download works`);
  await page.reload(); await page.waitForTimeout(500); await login(page, { age: 4 });
  await openGame(page, 'Coloring Book'); await page.waitForTimeout(700); await page.evaluate(HELPERS);
  ok(await page.evaluate(() => SPG.coloring.game.tab) === 'valentine', `${tag}: after a reload the gallery opens on her last collection`);
  await page.evaluate(() => document.querySelector('.cb-open[aria-label="Love bear"]').click()); await page.waitForTimeout(600);
  const re = await page.evaluate(() => T.ops());
  ok(JSON.stringify(re) === JSON.stringify(saved), `${tag}: every operation came back after a reload (${re.length})`);
  ok(await page.evaluate(() => SPG.coloring.game.fillStyle === 'plain' && SPG.coloring.game.brushStyle === 'glitter' && SPG.coloring.game.sticker === 'rainbow'), `${tag}: her chosen brush and sticker are remembered`);
  await press(page, '.cb-tool[aria-label="All pictures"]'); await page.waitForTimeout(300);
  await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(300);

  // ---- Puzzle Pond still draws her coloring pictures (stickers and patterns included)
  ok(await page.evaluate(() => { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 320; SPG.coloring.draw(cv.getContext('2d'), SPG.pictures.find(p => p.id === 'lovebear'), 400); const d = cv.getContext('2d').getImageData(0, 0, 400, 320).data; let n = 0; for (let i = 0; i < d.length; i += 400) if (d[i] < 200) n++; return n > 50; }), `${tag}: SPG.coloring.draw draws the painted picture for Puzzle Pond`);
  await openGame(page, 'Puzzle Pond'); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => !!SPG.app.running()), `${tag}: Puzzle Pond opens`);
  await page.evaluate(() => SPG.app.closeGame()); await page.waitForTimeout(300);

  // ---- a painted sheet of every holiday collection, to look at
  if (SHOTS) {
    await openGame(page, 'Coloring Book'); await page.waitForTimeout(600);
    for (const g of groups) {
      const url = await page.evaluate(gid => {
        const P = SPG.coloring.PALETTE, list = SPG.pictures.filter(p => p.group === gid), cols = 3, tw = 420, th = 336;
        const cv = document.createElement('canvas'); cv.width = cols * tw; cv.height = Math.ceil(list.length / cols) * th; const c = cv.getContext('2d');
        const pick = (id, i) => { for (const [k, ci] of [['sky', 18], ['night', 19], ['cloud', 23], ['sun', 2], ['moon', 2], ['ground', 3], ['grass', 3], ['hill', 4], ['sand', 10], ['sea', 7], ['water', 6], ['snow', 23], ['wall', 15], ['floor', 11], ['table', 11], ['flame', 1], ['heart', 14], ['leaf', 4], ['stem', 4]]) if (id.includes(k)) return ci; return [0, 1, 2, 3, 5, 6, 7, 8, 9, 14, 16, 17, 20][(i * 5) % 13]; };
        list.forEach((def, n) => {
          const ops = def.sections.map((s, i) => [0, s.id, pick(s.id, i)]);
          const big = def.sections.slice(4).find(s => !/sky|ground|wall|table|floor/.test(s.id)); if (big) ops.push([7, big.id, 9, 'hearts']);
          ops.push([8, null, SPG.coloring.STICKERS[n % 12], 900, 700, -8]);
          c.save(); c.translate((n % cols) * tw, Math.floor(n / cols) * th); SPG.coloring.render(c, def, ops, tw - 8); c.restore();
        });
        return cv.toDataURL();
      }, g.id);
      await page.evaluate(u => { const i = new Image(); i.src = u; i.id = 'sheet'; i.style.cssText = 'position:fixed;left:0;top:0;z-index:999;max-width:none'; document.body.append(i); }, url);
      await page.waitForTimeout(150); await page.locator('#sheet').screenshot({ path: `${SHOTS}/color-sheet-${g.id}.png` }); await page.evaluate(() => document.getElementById('sheet').remove());
    }
  }
  ok(!page.errs.length, `${tag}: no errors (${page.errs.slice(0, 3).join(' | ')})`);
  await page.context().close();
}
stop(b);
console.log(`\n${oks} OK, ${fails} FAIL`);
process.exit(fails ? 1 : 0);
