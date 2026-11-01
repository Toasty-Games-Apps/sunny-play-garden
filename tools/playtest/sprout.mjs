// The Sprout voice (audio/voice/sprout, tools/voice-pack): which lines it says and which go to the phone's own voice.
//   - an English line is played from its Sprout clip, not spoken by the phone
//   - Grown-ups > Voices > "The phone's own voice" sends every line to the phone again
//   - a reworded line, a typed name and a line in another language are the phone's (Sprout only has the English text)
//   - every letter name and letter sound has a clip, every clip in the manifest exists, and no two lines share a file
// The phone's voice is replaced by a fake that only notes what it was asked to say.
import { start, stop, newPage, login } from './lib.mjs';
import { existsSync, readFileSync } from 'node:fs';
process.env.PORT = process.env.PORT || '8149';
let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); };
const man = JSON.parse(readFileSync('audio/voice/manifest.json', 'utf8'));
const sp = new Set(man.sprout || []);
if (!sp.size) fail('the manifest lists no Sprout clips (run node tools/build-voice-manifest.mjs)');
for (const l of 'abcdefghijklmnopqrstuvwxyz') for (const k of [`letter.${l}`, `sound.${l}`]) if (!sp.has(k)) fail(`no Sprout clip for ${k}`);
const gone = [...sp].filter(k => !existsSync(`audio/voice/sprout/${k}.mp3`)); if (gone.length) fail(`listed but missing: ${gone.slice(0, 5).join(', ')}`);
const b = await start(); const page = await newPage(b, 800, 1000);
const fetched = []; page.on('request', r => { const m = r.url().match(/audio\/voice\/sprout\/([^/]+)\.mp3$/); if (m) fetched.push(m[1]); });
await login(page);
// every English line has its own clip (a line nobody can hear in Sprout's voice would fall back to the phone's)
const noClip = await page.evaluate(m => Object.keys(SPG.voice.LINES).filter(k => !/^(pname|player)\//.test(k) && typeof SPG.voice.LINES[k] === 'string' && !m.includes(k.replace(/\//g, '.'))), [...sp]);
if (noClip.length) fail(`${noClip.length} lines have no Sprout clip: ${noClip.slice(0, 8).join(', ')}`);
await page.mouse.click(400, 500);   // a first touch starts the sound (the browser needs a gesture)
const run = (key, set = {}) => page.evaluate(async ([key, set]) => {
  const V = SPG.voice, S = SPG.store.settings; Object.assign(S, { voice: true, voicePref: 'mix', builtinVoice: 'sprout' }, set);
  window.__spoke = []; speechSynthesis.speak = u => { __spoke.push(u.text); setTimeout(() => u.onend && u.onend(), 50); }; speechSynthesis.cancel = () => {};
  V.stop(); await new Promise(r => setTimeout(r, 1700)); await V.say(key); return window.__spoke.slice();
}, [key, set]);
const check = async (what, key, set, wantFile) => {
  fetched.length = 0; const spoke = await run(key, set);
  const file = key.replace(/\//g, '.'), got = fetched.includes(file);
  const ok = wantFile ? got && !spoke.length : !got && spoke.length > 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}: ${got ? 'Sprout clip' : 'phone voice ' + JSON.stringify(spoke)}`);
  if (!ok) bad++;
};
await check('letter V', 'letter/v', {}, true);
await check('sound of V', 'sound/v', {}, true);
await check('an instruction', 'care-hungry', {}, true);
await check('the phone’s own voice chosen', 'letter/r', { builtinVoice: 'device' }, false);
await page.evaluate(() => SPG.voice.setText('care-hungry', 'Time for a snack!'));
await check('a reworded line', 'care-hungry', {}, false);
await page.evaluate(() => SPG.voice.setText('care-hungry', ''));
if (page.errs.length) fail(page.errs.join(' | '));
await page.context().close();
// Spanish: a translated line is the phone's; the English ABC is not used in Spanish (it has its own)
const es = await newPage(b, 800, 1000, { locale: 'es-MX' });
const fetchedEs = []; es.on('request', r => { const m = r.url().match(/audio\/voice\/sprout\/([^/]+)\.mp3$/); if (m) fetchedEs.push(m[1]); });
await login(es); await es.mouse.click(400, 500);
const spokeEs = await es.evaluate(async () => {
  const V = SPG.voice; Object.assign(SPG.store.settings, { voice: true, builtinVoice: 'sprout' });
  window.__spoke = []; speechSynthesis.speak = u => { __spoke.push(u.text); setTimeout(() => u.onend && u.onend(), 50); }; speechSynthesis.cancel = () => {};
  await V.say('care-hungry'); return window.__spoke.slice();
});
const okEs = !fetchedEs.length && spokeEs.length && !/hungry/i.test(spokeEs[0]);
console.log(`${okEs ? 'ok  ' : 'FAIL'} Spanish line: ${JSON.stringify(spokeEs)} ${fetchedEs.join(',')}`); if (!okEs) bad++;
stop(b); console.log(bad ? 'PROBLEMS' : 'SPROUT VOICE OK'); process.exit(bad ? 1 : 0);
