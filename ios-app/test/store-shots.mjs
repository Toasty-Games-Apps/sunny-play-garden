// App Store screenshots from the real app on the simulator: the same moments as the Google Play pictures (tools/store-scenes.mjs),
// each a genuine simulator screenshot taken by the Mac (run-sim.mjs saves <prefix>-<n>-<scene>.png). No caption or frame is added:
// App Store Connect takes the plain screens. plan.picks chooses the scenes (default below).
import { newPage, login } from './lib.js';
import { SCENES, prepPlayer } from './store-scenes.js';
const T = window.SPG_TEST;
const picks = T.plan.picks || ['hub', 'kitchen', 'color', 'feelings', 'fishing', 'shop', 'rain', 'trace', 'shapes', 'petcare'];
const page = await newPage(); await login(page, { age: 4 }); await prepPlayer(page);
await page.waitForTimeout(600);
let n = 0, bad = 0;
for (const id of picks) {
  if (!SCENES[id]) { console.log('FAIL no scene ' + id); bad++; continue; }
  n++; const name = `${n}-${id}`;
  try { await SCENES[id](page, () => T.shot(name), { w: innerWidth, h: innerHeight }); console.log('ok   ' + name); }
  catch (e) { console.log(`FAIL ${name}: ${e && e.message}`); bad++; if (SPG.app.running()) SPG.app.closeGame(); await page.waitForTimeout(500); }
}
if (bad) process.exitCode = 1;
