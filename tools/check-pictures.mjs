// Checks the Coloring Book pictures in games/color-pictures.js. Run from the repo root:
//   node tools/check-pictures.mjs        (needs Playwright; CHROME_PATH can point at an existing Chrome)
// FAIL = fix before shipping. WARN = worth a look.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await page.setContent('<body></body>');
await page.addScriptTag({ content: 'window.SPG={games:[]};' });
await page.addScriptTag({ content: readFileSync('games/color-pictures.js', 'utf8') });
await page.addScriptTag({ content: readFileSync('games/color-seasons.js', 'utf8') });
await page.addScriptTag({ content: readFileSync('games/color-dinos.js', 'utf8') });

const report = await page.evaluate(() => {
  const NS = 'http://www.w3.org/2000/svg', out = [], ids = new Set();
  const svg = document.createElementNS(NS, 'svg'); document.body.append(svg);
  const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 800; const g = cv.getContext('2d', { willReadFrequently: true });
  const count = (path, rule) => { g.clearRect(0, 0, 1000, 800); g.fill(path, rule); const d = g.getImageData(0, 0, 1000, 800).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 127) n++; return n; };
  for (const pic of SPG.pictures) {
    const say = (level, msg) => out.push([level, `${pic.id}: ${msg}`]);
    if (ids.has(pic.id)) say('FAIL', 'duplicate picture id'); ids.add(pic.id);
    if (!/^[a-z0-9-]+$/.test(pic.id)) say('FAIL', 'picture id should be lowercase letters, numbers and dashes');
    const n = pic.sections.length;
    if (n < 6 || n > 26) say('WARN', `${n} sections (aim for 6 to 26)`);
    for (const [old, parts] of Object.entries(pic.alias || {})) if (!parts.every(id => pic.sections.some(s => s.id === id))) say('FAIL', `alias "${old}" points at a missing section`);
    const seen = new Set();
    for (const s of pic.sections) {
      if (!/^[a-z0-9-]+$/.test(s.id || '')) say('FAIL', `bad section id "${s.id}"`);
      if (seen.has(s.id)) say('FAIL', `duplicate section id "${s.id}"`); seen.add(s.id);
      if (!/Z\s*$/i.test(s.d)) say('FAIL', `${s.id}: path is not closed (end it with Z)`);
      const pe = document.createElementNS(NS, 'path'); pe.setAttribute('d', s.d); svg.append(pe);
      const bb = pe.getBBox();
      if (bb.x < -120 || bb.y < -120 || bb.x + bb.width > 1120 || bb.y + bb.height > 920) say('WARN', `${s.id}: reaches outside the 1000x800 picture`);
      // Each separate shape inside a section must be big enough to tap on a phone.
      for (const part of s.d.split(/(?=M)/).filter(p => p.trim())) {
        const q = document.createElementNS(NS, 'path'); q.setAttribute('d', part); svg.append(q);
        const b = q.getBBox();
        if (Math.min(b.width, b.height) < 44) say('FAIL', `${s.id}: a shape is only ${Math.round(Math.min(b.width, b.height))} units across (needs 44+ to be tappable)`);
        else if (Math.min(b.width, b.height) < 50) say('WARN', `${s.id}: a shape is small (${Math.round(Math.min(b.width, b.height))} units across)`);
        q.remove();
      }
      // A section that crosses itself would leak paint past sections in front of it.
      const p2 = new Path2D(s.d), a = count(p2, 'nonzero'), e = count(p2, 'evenodd');
      if (Math.abs(a - e) > 60) say('FAIL', `${s.id}: shape crosses itself (${a - e} pixels differ between fill rules). Split it or redraw it as one simple outline`);
      pe.remove();
    }
  }
  // Every collection (a tab in the gallery) needs pictures, an emblem picture and tab colors that point at real sections.
  const gids = new Set();
  for (const g of SPG.pictureGroups) {
    const say = (level, msg) => out.push([level, `collection ${g.id}: ${msg}`]);
    if (gids.has(g.id)) say('FAIL', 'duplicate collection id'); gids.add(g.id);
    const list = SPG.pictures.filter(p => p.group === g.id);
    if (!list.length) say('FAIL', 'has no pictures'); else if (list.length < 6) say('WARN', `only ${list.length} pictures`);
    const em = SPG.pictures.find(p => p.id === g.emblem);
    if (!em) { say('FAIL', `emblem "${g.emblem}" is not a picture`); continue; }
    for (const [sec] of g.demo || []) if (!em.sections.some(s => s.id === sec) && !(em.alias || {})[sec]) say('FAIL', `tab color for "${sec}" points at a missing section of ${em.id}`);
  }
  for (const pic of SPG.pictures) if (!gids.has(pic.group)) out.push(['FAIL', `${pic.id}: group "${pic.group}" is not a collection`]);
  return { out, pictures: SPG.pictures.length };
});
await browser.close();

let fails = 0, warns = 0;
for (const [level, msg] of report.out) { console.log(`  ${level}  ${msg}`); level === 'FAIL' ? fails++ : warns++; }
console.log(`${report.pictures} pictures checked: ${fails} problems, ${warns} warnings.`);
process.exit(fails ? 1 : 0);
