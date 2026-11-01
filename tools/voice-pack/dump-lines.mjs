// Writes every English line the games can say ({ key: text }) for the Sprout voice generator (make.py). Needs Playwright.
//   NODE_PATH=... node tools/voice-pack/dump-lines.mjs > lines.json
import { start, stop, newPage } from '../playtest/lib.mjs';
process.env.PORT = process.env.PORT || '8391';
const b = await start(); const page = await newPage(b, 800, 600);
const lines = await page.evaluate(() => {
  const V = SPG.voice, out = {};
  for (const [k, text] of Object.entries(V.LINES)) if (typeof text === 'string' && text.trim() && !/^(pname|player)\//.test(k)) out[k] = text;
  return out;
});
stop(b); process.stdout.write(JSON.stringify(lines, null, 1) + '\n');
console.error(Object.keys(lines).length + ' lines');
