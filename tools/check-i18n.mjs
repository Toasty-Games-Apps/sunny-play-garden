// Checks the translations in js/lang/<id>.js against the English text in the code.
//   node tools/check-i18n.mjs            -> what each language is missing, what it has that nothing uses, and {placeholders} that do not match
//   node tools/check-i18n.mjs --dump F   -> writes every English text and spoken line that needs a translation to F (JSON), for a new language
//   I18N_LANG=es node tools/check-i18n.mjs    -> one language only
// Screen text is found in the code (t('...'), SPG.t('...'), the labels given to the games' button helpers, the names of games, fish,
// garden friends... and the data-i18n text in index.html). Spoken lines are read from the running app (SPG.voice.LINES), so it needs
// Playwright like the other tools; without it the spoken lines are not checked.
// Exit code 1 when a language misses something (a missing text is shown in English, a missing line is said in English).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const unq = s => s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|.)/g, (m, e) => (e[0] === 'u' && e.length > 1 ? String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16)) : e === 'n' ? '\n' : e));
const STR = `'((?:[^'\\\\\\n]|\\\\.)*)'(?=\\s*[,)}\\]])|"((?:[^"\\\\\\n]|\\\\.)*)"(?=\\s*[,)}\\]])`;   // a whole argument, not 'text ' + more
const lit = m => unq(m[1] != null ? m[1] : m[2]);

/* ---------- screen text in the code ---------- */
const files = [...readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js') && f !== 'i18n.js').map(f => 'js/' + f), ...readdirSync(join(ROOT, 'games')).filter(f => f.endsWith('.js')).map(f => 'games/' + f)];
const need = new Map();   // English text -> where
// (a CSS class name caught by the button pattern is not text)
const want = (s, where) => { if (s && /[A-Za-z]/.test(s) && !/^[a-z]+(-[a-z0-9]+)+$/.test(s) && !need.has(s)) need.set(s, where); };
const scan = (src, re, where, groups = [1]) => { for (const m of src.matchAll(re)) for (const g of groups) if (m[g] != null || m[g + 1] != null) want(lit([0, m[g], m[g + 1]]), where); };
for (const f of files) {
  const src = read(f);
  // t('...') and SPG.t('...') (a template without ${} counts too)
  scan(src, new RegExp(`(?<![\\w$.])(?:SPG\\.)?t\\(\\s*(?:${STR})`, 'g'), f);
  for (const m of src.matchAll(/(?<![\w$.])(?:SPG\.)?t\(\s*`([^`$]*)`/g)) want(unq(m[1]), f);
  // the button helpers translate their label: btn(cls, 'label', ...), the colour book's tool(id, 'label'), the garden's add(id, 'label')
  if (/setAttribute\('aria-label', SPG\.t\(label\)\)|'aria-label': SPG\.t\(label\)/.test(src)) scan(src, new RegExp(`\\bbtn\\([^\\n]{0,140}?,\\s*(?:${STR})`, 'g'), f);
  if (f === 'games/color.js') scan(src, new RegExp(`\\btool\\('\\w+',\\s*(?:${STR})`, 'g'), f);
  if (f === 'games/garden.js') scan(src, new RegExp(`\\badd\\('\\w+',\\s*(?:${STR})`, 'g'), f);
  if (f === 'games/style.js') scan(src, new RegExp(`\\bsection\\('\\w+',\\s*(?:${STR})`, 'g'), f);
  if (f === 'games/letters.js') scan(src, new RegExp(`^\\s*\\[(?:${STR}),\\s*(?:${STR}),\\s*\\(c, w, h\\)`, 'gm'), f, [1, 3]);
  // names: each game in the hub, and the things whose names are put on screen through SPG.t(x.name)
  scan(src, new RegExp(`\\bid: '[\\w-]+', name: (?:${STR}), (?:order|icon|shop)`, 'g'), f);
  if (['games/fishing.js', 'games/fruit.js', 'js/art.js', 'js/art-garden.js', 'js/art-pets.js'].includes(f)) {
    const part = f === 'games/fishing.js' ? src.slice(src.indexOf('const FISH'), src.indexOf('};', src.indexOf('const FISH')))
      : f === 'games/fruit.js' ? src.slice(src.indexOf('const THEMES'), src.indexOf('];', src.indexOf('const THEMES')))
      : f === 'js/art.js' ? src.slice(src.indexOf('const CREATURES'), src.indexOf('];', src.indexOf('const PLANTS'))) : src;
    if (f === 'js/art-garden.js' || f === 'js/art-pets.js') scan(src, new RegExp(`\\bid: '[\\w-]+', name: (?:${STR}), (?:creatures|fly)`, 'g'), f);
    else scan(part, new RegExp(`\\bname: (?:${STR})`, 'g'), f);
  }
}
// index.html: the own text of elements marked data-i18n, data-i18n-attr attributes, data-i18n-html inner HTML (as js/i18n.js does it)
{
  const html = read('index.html').replace(/<!--[\s\S]*?-->/g, ''), VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr|use|path|circle|rect|polygon|ellipse|line|stop)$/i;
  for (const m of html.matchAll(/<(\w+)[^>]*\bdata-i18n-html\b[^>]*>([\s\S]*?)<\/\1>/g)) want(m[2].trim(), 'index.html');
  const stack = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g)) {
    if (m[5] != null) { const top = stack[stack.length - 1]; if (top && top.i18n && m[5].trim()) want(m[5].trim(), 'index.html'); continue; }
    const [, close, tag, attrs, self] = m;
    if (close) { while (stack.length && stack.pop().tag !== tag); continue; }
    const at = {}; for (const a of attrs.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) at[a[1]] = a[2] ?? a[3] ?? a[4] ?? '';
    if ('data-i18n-attr' in at) for (const a of at['data-i18n-attr'].split(',')) want(at[a], 'index.html');
    if (!self && !VOID.test(tag)) stack.push({ tag, i18n: 'data-i18n' in at });
  }
}

/* ---------- spoken lines (from the running app) ---------- */
let LINES = null;
try {
  const { start, stop, newPage } = await import('./playtest/lib.mjs');
  const b = await start(); const p = await newPage(b, 800, 1000);
  LINES = await p.evaluate(() => SPG.voice.LINES);
  await stop(b);
} catch (e) { console.log('(spoken lines not checked: ' + String(e.message || e).split('\n')[0] + ')'); }
// Lines that are never translated: names are said as they are; a player's greeting is made from the name.
const KEEP = k => /^(name|pname|player)\//.test(k);
// Hindi and Chinese learn the English alphabet in Letter Garden: the letters, their sounds and picture words stay English.
const ENGLISH_ABC = k => /^(letter|sound|word)\//.test(k) || k === 'is-for';

/* ---------- the languages ---------- */
const langs = readdirSync(join(ROOT, 'js/lang')).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).filter(l => !process.env.I18N_LANG || l === process.env.I18N_LANG);   // not LANG: that is the shell's locale
const load = id => {
  const DATA = {}, merge = (a, b) => { for (const k in b) a[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] ? Object.assign(a[k], b[k]) : b[k]; return a; };
  const ctx = { window: {}, SPG: { i18n: { add: (lid, d) => { DATA[lid] = merge(DATA[lid] || {}, d); } } } };
  ctx.window.SPG = ctx.SPG; vm.createContext(ctx); vm.runInContext(read(`js/lang/${id}.js`), ctx, { filename: `js/lang/${id}.js` });
  return DATA[id] || {};
};
// {her} {their} {child} (SPG.pron) are English words: a translation words the sentence without them, so they are not compared
const vars = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(v => !/^(her|their|child)$/.test(v)).sort().join(',');
let bad = 0;
if (process.argv[2] === '--dump') {
  const out = { ui: Object.fromEntries([...need.keys()].map(k => [k, k])), lines: LINES ? Object.fromEntries(Object.entries(LINES).filter(([k]) => !KEEP(k))) : {} };
  writeFileSync(process.argv[3] || 'i18n-dump.json', JSON.stringify(out, null, 1));
  console.log(`wrote ${need.size} texts and ${Object.keys(out.lines).length} lines to ${process.argv[3] || 'i18n-dump.json'}`);
  process.exit(0);
}
for (const id of langs) {
  const d = load(id), ui = d.ui || {}, lines = d.lines || {};
  const missing = [...need.keys()].filter(k => ui[k] == null);
  const unused = Object.keys(ui).filter(k => !need.has(k));
  const mism = Object.keys(ui).filter(k => need.has(k) && vars(k) !== vars(ui[k]));
  console.log(`\n== ${id}: ${Object.keys(ui).length} texts, ${Object.keys(lines).length} lines`);
  if (missing.length) { bad++; console.log(`  missing texts (${missing.length}):`); for (const k of missing) console.log(`    ${JSON.stringify(k)}   [${need.get(k)}]`); }
  if (mism.length) { bad++; console.log(`  {placeholders} differ (${mism.length}):`); for (const k of mism) console.log(`    ${JSON.stringify(k)} -> ${JSON.stringify(ui[k])}`); }
  if (unused.length) { console.log(`  not used any more (${unused.length}):`); for (const k of unused) console.log(`    ${JSON.stringify(k)}`); }
  if (LINES) {
    const skip = k => KEEP(k) || ((id === 'hi' || id === 'zh') && ENGLISH_ABC(k)) || /^style\/who-/.test(k);
    const lm = Object.keys(LINES).filter(k => !skip(k) && lines[k] == null);
    const lx = Object.keys(lines).filter(k => !(k in LINES) && !KEEP(k));
    const lv = Object.keys(lines).filter(k => k in LINES && vars(LINES[k]) !== vars(lines[k]));
    if (lm.length) { bad++; console.log(`  missing spoken lines (${lm.length}):`); for (const k of lm) console.log(`    ${k}: ${JSON.stringify(LINES[k])}`); }
    if (lv.length) { bad++; console.log(`  spoken {placeholders} differ (${lv.length}):`); for (const k of lv) console.log(`    ${k}`); }
    if (lx.length) { console.log(`  spoken lines that no longer exist (${lx.length}):`); for (const k of lx) console.log(`    ${k}`); }
  }
  for (const k of ['nicks', 'pets']) if (!Array.isArray(d[k]) || d[k].length < 12) { bad++; console.log(`  ${k}: needs a list of at least 12 names`); }
  if (!Array.isArray(d.num) || d.num.length !== 21) { bad++; console.log('  num: needs the words for 0 to 20'); }
}
console.log(`\n${need.size} texts on screen${LINES ? `, ${Object.keys(LINES).length} spoken lines` : ''}; ${bad ? 'something is missing (see above)' : 'every language is complete'}.`);
process.exit(bad ? 1 : 0);
