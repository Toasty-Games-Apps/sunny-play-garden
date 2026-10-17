import { start, stop, newPage, login } from './lib.mjs';
process.env.PORT = '8146';
const b = await start(); const page = await newPage(b, 1280, 800); await login(page);
const run = async on => page.evaluate(async on => {
  SPG.store.settings.audioHelp = on; const said = [];
  window.speechSynthesis.speak = u => { said.push(u.text + '@' + u.rate); setTimeout(() => u.onend && u.onend(), 5); };
  await SPG.voice.say('cookc/0', 'cook/flour', 'cookr/sugar', 'style/tab-hair', 'style/say-start', 'aq/guppy', 'room/castle', 'letter/a', 'sound/x', 'cook-add', 'num/3', 'cook-yum', 'care-hungry', 'fish/bass');
  return said;
}, on);
console.log('off', JSON.stringify(await run(false))); console.log('on ', JSON.stringify(await run(true)));
// the grown-ups switch
await page.evaluate(() => document.getElementById('hub-lock').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
console.log(page.errs.join('|') || 'no errors'); stop(b);
