// Every language in js/lang: a new install on a device in that language starts in it, setup, the hub, every game, the grown-ups
// panel and the voices screen open without errors, and no English text that has a translation is left on screen.
// LANGS=es,hi node tools/playtest/i18n.mjs (default: all). Screenshots go to $SHOTS (default /tmp): i18n_<lang>_<screen>.png
import { start, stop, newPage, SP } from './lib.mjs';
import { readdirSync } from 'node:fs';
const wait = ms => new Promise(r => setTimeout(r, ms));
process.env.PORT = '8147';
const LOCALE = { es: 'es-MX', hi: 'hi-IN', zh: 'zh-CN' };
const langs = (process.env.LANGS ? process.env.LANGS.split(',') : readdirSync(new URL('../../js/lang/', import.meta.url)).map(f => f.replace(/\.js$/, '')));
const b = await start(); let bad = 0;
const down = (page, sel) => page.evaluate(s => document.querySelector(s).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), sel);
// text on screen that is still the English of a translated text (a t() that was forgotten)
const leftovers = page => page.evaluate(root => {
  const ui = SPG.i18n.data().ui || {}, out = new Set();
  const w = document.createTreeWalker(document.querySelector(root) || document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const s = n.textContent.trim(); if (s && ui[s] != null && ui[s] !== s && n.parentElement.offsetParent !== null) out.add(s); }
  for (const el of (document.querySelector(root) || document.body).querySelectorAll('[aria-label]')) { const s = el.getAttribute('aria-label'); if (ui[s] != null && ui[s] !== s) out.add('[aria] ' + s); }
  return [...out];
}, '#app, body');
for (const lang of langs) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await newPage(b, w, h, { locale: LOCALE[lang] || lang });
    const got = await page.evaluate(() => ({ lang: SPG.i18n.lang(), html: document.documentElement.lang, setup: document.querySelector('#setup h2, #setup h1')?.textContent }));
    if (got.lang !== lang) { bad++; console.log(`${lang}: a new install did not start in ${lang} (got ${got.lang})`); }
    await page.screenshot({ path: `${SP}/i18n_${lang}_setup_${w}.png` });
    // setup: first name, first gender, age 4
    await page.click('.name-btn >> nth=0'); await page.click('#gender-pick .seg-btn >> nth=0');
    await page.click('#age-pick .seg-btn >> nth=2'); await page.click('#setup-go'); await wait(400);
    await page.screenshot({ path: `${SP}/i18n_${lang}_hub_${w}.png` });
    const lo = await leftovers(page); if (lo.length) { bad++; console.log(`${lang} hub: English left: ${lo.join(' · ')}`); }
    // the spoken lines: said in the language when translated (Hindi and Chinese keep the English ABC)
    const say = await page.evaluate(() => ({ welcome: [SPG.voice.langOf('welcome'), SPG.voice.textFor('welcome')], letter: [SPG.voice.langOf('letter/b'), SPG.voice.textFor('letter/b')], num: [SPG.voice.langOf('num/3'), SPG.voice.textFor('num/3')] }));
    if (say.welcome[0] !== lang || say.num[0] !== lang) { bad++; console.log(`${lang}: lines not in ${lang}`, JSON.stringify(say)); }
    // every game (the cards carry the game id)
    const ids = await page.evaluate(() => SPG.games.map(g => g.id));
    for (const id of ids) {
      await page.evaluate(i => document.querySelector(`.card[data-id="${i}"], .shopfront[data-id="${i}"]`).dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })), id); await wait(500);
      for (let k = 0; k < 2; k++) { await page.mouse.move(w * .3 + k * 50, h * .5); await page.mouse.down(); await page.mouse.move(w * .6, h * .55, { steps: 5 }); await page.mouse.up(); await wait(120); }
      if (w === 1280) await page.screenshot({ path: `${SP}/i18n_${lang}_${id}.png` });
      await page.click('#btn-home'); await wait(200);
    }
    // grown-ups: solve the gate in this language
    await down(page, '#hub-lock'); await wait(300);
    const ans = await page.evaluate(() => { const q = document.getElementById('gate-q').textContent; for (let a = 0; a <= 20; a++) for (let c = 0; c <= 20; c++) if (SPG.t('{a} plus {b}', { a: SPG.i18n.numWord(a), b: SPG.i18n.numWord(c) }) === q) return String(a + c); return null; });
    if (!ans) { bad++; console.log(`${lang}: could not read the gate question`); }
    else {
      for (const d of ans) await page.evaluate(d => [...document.querySelectorAll('#numpad button')].find(x => x.textContent === d).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), d);
      await down(page, '#numpad button.ok'); await wait(400);
      if (await page.$('#vintro:not(.hidden)')) { await page.screenshot({ path: `${SP}/i18n_${lang}_vintro_${w}.png` }); await page.click('#vintro .btn.quiet'); await wait(200); }
      await page.screenshot({ path: `${SP}/i18n_${lang}_parent_${w}.png` });
      const lp = await leftovers(page); if (lp.length) { bad++; console.log(`${lang} grown-ups: English left: ${lp.join(' · ')}`); }
      const langBtns = await page.evaluate(() => [...document.querySelectorAll('#parent-body .seg-btn')].filter(x => /English|Español|हिन्दी|中文/.test(x.textContent)).length);
      if (langBtns < 4) { bad++; console.log(`${lang}: the language buttons are missing (${langBtns})`); }
    }
    if (page.errs.length) { bad++; console.log(`${lang} ${w}x${h} errors:`, page.errs.join(' | ')); }
    console.log(`${lang} ${w}x${h}: ${page.errs.length ? 'errors' : 'ok'} (${got.html}; "${got.setup}"; ${JSON.stringify(say)})`);
    await page.context().close();
  }
}
// switching back to English from the grown-ups panel
{
  const page = await newPage(b, 800, 1000, { locale: 'es-MX' });
  await page.evaluate(() => SPG.i18n.set('en')); await wait(1200);
  const l = await page.evaluate(() => [SPG.i18n.lang(), document.documentElement.lang]);
  if (l[0] !== 'en') { bad++; console.log('could not switch back to English', l); } else console.log('switch to English: ok');
}
stop(b); console.log(bad ? 'PROBLEMS' : 'ALL CLEAN'); process.exit(bad ? 1 : 0);
