// The calm voice (SPG.voice.say): a child who touches things over and over never gets a jumble of lines.
//   - names of things touched quickly one after another: only the newest waits, and a flood of touches is not spoken at all
//   - counting ("one", "two", "three") is said in order, none lost
//   - an instruction (what to do next) is said at once, cutting off whatever was being said
// Speech is replaced by a fake voice that takes 600 ms per line, so the test does not depend on the machine's voices.
import { start, stop, newPage, login } from './lib.mjs';
process.env.PORT = process.env.PORT || '8147';
const b = await start(); let bad = 0;
const page = await newPage(b, 800, 1000);
await login(page);
const res = await page.evaluate(async () => {
  const V = SPG.voice, S = SPG.store.settings, sleep = ms => new Promise(r => setTimeout(r, ms));
  S.voice = true; S.builtinVoice = 'device'; S.voicePref = 'builtin'; S.audioHelp = true;   // the device voice for every line; Extra audio help so names are said
  // a fake speaking voice: every line takes 600 ms
  const said = [];
  window.speechSynthesis.speak = u => { said.push(u.text); setTimeout(() => u.onend && u.onend(), 600); };
  window.speechSynthesis.cancel = () => {};
  const started = []; V.watch(list => { if (list) started.push(list.join('+')); });
  const keys = Object.keys(V.LINES), role = k => V.roleOf(k);
  const names = keys.filter(k => k.startsWith('color/') && role(k) === 0);
  const instr = keys.find(k => role(k) === 2 && !k.startsWith('num/'));
  const out = {};
  // 1. twelve quick touches on named things, 120 ms apart
  V.stop(); started.length = 0;
  for (let i = 0; i < 12; i++) { V.say(names[i % names.length]); await sleep(120); }
  await sleep(2600);
  out.spam = started.slice();
  // 2. counting three things quickly
  V.stop(); started.length = 0; await sleep(1600);
  V.say('num/1'); await sleep(80); V.say('num/2'); await sleep(80); V.say('num/3');
  await sleep(2400);
  out.count = started.slice();
  // 3. an instruction while a name is being said
  V.stop(); started.length = 0; await sleep(1600);
  V.say(names[0]); await sleep(150); const t0 = performance.now(); V.say(instr); await sleep(30);
  out.instr = { key: instr, started: started.slice(), at: performance.now() - t0 };
  await sleep(1500);
  // 4. the same line touched again while it is being said is not restarted
  V.stop(); started.length = 0; await sleep(1600);
  V.say('num/4'); await sleep(100); V.say('num/4'); await sleep(100); V.say('num/4');
  await sleep(1500);
  out.same = started.slice();
  return out;
});
const fail = m => { bad++; console.log('FAIL ' + m); };
console.log('twelve quick touches ->', JSON.stringify(res.spam));
if (res.spam.length > 3) fail(`twelve quick touches started ${res.spam.length} lines (at most 3 expected)`);
console.log('counting ->', JSON.stringify(res.count));
if (res.count.join(',') !== 'num/1,num/2,num/3') fail('counting was not said in order: ' + res.count.join(','));
console.log('instruction ->', JSON.stringify(res.instr));
if (res.instr.started[res.instr.started.length - 1] !== res.instr.key) fail('the instruction did not start right away');
console.log('same line three times ->', JSON.stringify(res.same));
if (res.same.length !== 1) fail(`the same line was started ${res.same.length} times`);
if (page.errs.length) fail(page.errs.join(' | '));
stop(b); console.log(bad ? 'PROBLEMS' : 'CALM VOICE OK'); process.exit(bad ? 1 : 0);
