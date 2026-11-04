// One language inside the app on the simulator (run-sim.mjs runs it for en, es, hi and zh; the runner switches the language first).
//   - no English left on the hub or in Grown-ups (any text on screen that is an English key with a translation is a miss)
//   - an instruction is spoken in the language by the phone's voice when the phone has a voice for it, otherwise in English
//   - letter names: Spanish has its own ABC (the phone's Spanish voice); Hindi and Chinese keep the English ABC (the Sprout clips)
const T = window.SPG_TEST, C = window.Capacitor, PL = C.Plugins, wait = ms => new Promise(r => setTimeout(r, ms));
const L = SPG.i18n.lang(), want = T.plan.lang || 'en';
let bad = 0; const out = T.extra = { checks: {}, notes: {}, lang: L };
const ok = (cond, what, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'} [${L}] ${what}${!cond && detail !== undefined ? ': ' + JSON.stringify(detail) : ''}`); out.checks[what] = !!cond; if (!cond) bad++; };
const note = (what, v) => { console.log(`note [${L}] ${what}: ${JSON.stringify(v)}`); out.notes[what] = v; };
const press = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch' }));
ok(L === want, 'the app is in the asked language', { L, want });

// a player (the setup sheet in this language: the first name, then go)
if (!document.querySelector('#setup.hidden')) {
  document.querySelector('.name-btn') && document.querySelector('.name-btn').click(); await wait(200);
  const age = document.querySelector('#age-pick .seg-btn'); age && age.click();
  document.getElementById('setup-go').click(); await wait(600);
  const vi = document.querySelector('#vintro:not(.hidden) .btn.quiet'); vi && vi.click();
} else { document.querySelector('.who-tile') && document.querySelector('.who-tile').click(); }
await wait(800);

// English that should have been translated: visible text that is itself an English key with a translation
const english = root => {
  if (L === 'en') return [];
  const miss = new Set(), walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const s = n.textContent.replace(/\s+/g, ' ').trim(), el = n.parentElement; if (!s || s.length < 3 || !el) continue;
    const r = el.getBoundingClientRect(); if (!r.width || getComputedStyle(el).visibility === 'hidden') continue;
    if (SPG.t(s) !== s) miss.add(s);
  }
  for (const el of root.querySelectorAll('[aria-label]')) { const s = el.getAttribute('aria-label'); if (s && SPG.t(s) !== s) miss.add(s); }
  return [...miss];
};
let miss = english(document.getElementById('hub')); ok(!miss.length, 'the hub is fully translated', miss.slice(0, 8));
await T.shot('hub');
// Grown-ups: through the gate (the sum is spelled in this language, so the test answers it from the game's own numbers)
document.getElementById('hub-lock').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await wait(400);
const q = document.getElementById('gate-q').textContent, words = Array.from({ length: 21 }, (_, i) => SPG.i18n.numWord(i));
const nums = words.map((w, i) => [w, i]).filter(([w]) => q.includes(w)).sort((a, b) => b[0].length - a[0].length);
let sum = null; { let rest = q; const got = []; for (const [w, i] of nums) while (rest.includes(w) && got.length < 2) { got.push(i); rest = rest.replace(w, ' '); } if (got.length === 2) sum = got[0] + got[1]; }
if (sum == null) note('gate question not understood', q);
else { for (const d of String(sum)) [...document.querySelectorAll('#numpad button')].find(x => x.textContent === d).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.querySelector('#numpad button.ok').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await wait(600); }
const vi = document.querySelector('#vintro:not(.hidden)'); if (vi) { miss = english(vi); ok(!miss.length, 'the voices welcome is fully translated', miss.slice(0, 8)); vi.querySelector('.btn.quiet').click(); await wait(300); }
if (!document.querySelector('#parent.hidden')) {
  miss = english(document.getElementById('parent')); ok(!miss.length, 'Grown-ups is fully translated', miss.slice(0, 8)); await T.shot('grownups');
  for (const id of ['sound', 'photos', 'locks', 'about']) { SPG.grownups.open(id); await wait(300); miss = english(document.getElementById('parent')); ok(!miss.length, `Grown-ups > ${id} is fully translated`, miss.slice(0, 8)); }
  await T.shot('grownups-about');
  document.getElementById('parent-close').click(); await wait(300);
} else ok(false, 'the gate opened Grown-ups', q);

// what is said, and in which language: the phone's voice (TextToSpeech) and the Sprout clips are watched
const V = SPG.voice, S = SPG.store.settings, realTTS = PL.TextToSpeech, realFetch = window.fetch, spoken = [], fetched = [];
const voices = ((await realTTS.getSupportedVoices()) || {}).voices || [], bcp = SPG.i18n.info().bcp, pre = bcp.split('-')[0];
const hasVoice = voices.some(v => (v.lang || '').toLowerCase().startsWith(pre)); note('the phone has a voice for this language', hasVoice);
window.fetch = (u, o) => { const m = String(u).match(/sprout\/([^/]+)\.mp3$/); if (m) fetched.push(m[1]); return realFetch(u, o); };
let watching = true; try { PL.TextToSpeech = new Proxy({}, { get: (_, k) => k === 'speak' ? (o => { spoken.push({ text: o.text, lang: o.lang }); return realTTS.speak(Object.assign({}, o, { volume: .05 })); }) : realTTS[k] }); } catch (_) { watching = false; }
Object.assign(S, { voice: true, voicePref: 'mix', builtinVoice: 'sprout' }); SPG.audio.unlock();
const sayNow = async key => { spoken.length = 0; fetched.length = 0; V.stop(); await wait(1600); await V.say(key); await wait(300); return { spoken: spoken.slice(), fetched: fetched.slice() }; };
if (watching && PL.TextToSpeech !== realTTS) {
  let r = await sayNow('sort-color');
  if (L === 'en') ok(r.fetched.includes('sort-color'), 'an instruction is said by the Sprout voice', r);
  else if (hasVoice) ok(r.spoken.length && (r.spoken[0].lang || '').toLowerCase().startsWith(pre) && r.spoken[0].text === SPG.i18n.line('sort-color'), 'an instruction is spoken in this language', r);
  else ok(r.spoken.length && /^en/i.test(r.spoken[0].lang || ''), 'with no phone voice for it, an instruction is said in English', r);
  r = await sayNow('letter/b');
  if (L === 'es') ok(hasVoice ? r.spoken.length && /^es/i.test(r.spoken[0].lang || '') : r.spoken.length > 0, 'Spanish letter names use the Spanish ABC', r);
  else ok(r.fetched.includes('letter.b'), 'letter names are said by the Sprout voice (English ABC)', r);
  PL.TextToSpeech = realTTS;
} else note('speech check', 'TextToSpeech could not be watched');
window.fetch = realFetch;
console.log(bad ? `PROBLEMS: ${bad}` : `LANGUAGE ${L} OK`);
if (bad) process.exitCode = 1;
