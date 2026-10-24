// Sign videos (Grown-ups > Accessibility > Sign videos): records a sign with a fake camera, keeps it, checks that the corner card and
// Sign Along then show the video instead of the drawn hands (and the hands come back after the video), that a chosen sequence with a
// video in the middle still signs the rest, that the "Use the sign videos" switch turns it off, and that Delete removes it.
// usage: node signvideo.mjs [W H]
import { start, stop, newPage, login, openGame, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8371';
const W = +process.argv[2] || 1280, Hh = +process.argv[3] || 800;
const b = await start({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const page = await newPage(b, W, Hh, { permissions: ['camera'] }); await login(page, { age: 4 });
const wait = ms => page.waitForTimeout(ms);
const down = sel => page.evaluate(s => document.querySelector(s).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), sel);
await down('#hub-lock'); await wait(300);
const q = await page.evaluate(() => document.getElementById('gate-q').textContent);
const NW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']; const [a, , c] = q.split(' ');
for (const d of String(NW.indexOf(a) + NW.indexOf(c))) await page.evaluate(d => [...document.querySelectorAll('#numpad button')].find(x => x.textContent === d).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), d);
await down('#numpad button.ok'); await wait(400);
if (await page.$('#vintro:not(.hidden)')) { await page.click('#vintro .btn.quiet'); await wait(200); }
const btn = text => page.evaluate(t => { const x = [...document.querySelectorAll('#parent-body button, #signvid-body button')].find(b => b.textContent.trim() === t && b.offsetParent); if (!x) return false; x.click(); return true; }, text);
ok(await btn('Sign videos: record your own'), 'the Accessibility section has the Sign videos button'); await wait(400);
ok(await page.$('#signvid:not(.hidden)'), 'the Sign videos screen opens');
ok(await page.evaluate(() => document.querySelectorAll('.sv-word').length) > 20, 'words are listed');
ok(await btn('Animals'), 'the Animals group'); await wait(200);
ok(await btn('Cat'), 'choose Cat'); await wait(500);
ok(await page.evaluate(() => { const cv = document.querySelector('.sv-hands'); return cv && cv.width > 50; }), 'the drawn hands sign the word beside it');
ok(await btn('● Record'), 'Record button'); await wait(1200);
ok(await page.$('.sv-box.live video'), 'the camera preview shows');
ok(await btn('● Start'), 'Start'); await wait(2700);
ok(await page.$('.sv-box.live.rec'), 'recording after the count-down');
await wait(1800); ok(await btn('■ Stop'), 'Stop'); await wait(900);
ok(await page.evaluate(() => !!document.querySelector('.sv-box video[src^="blob:"]')), 'the new video is shown to look at');
await page.screenshot({ path: `${SP}/signvideo-review-${W}x${Hh}.png` });
ok(await btn('✓ Keep it'), 'Keep it'); await wait(600);
ok(await page.evaluate(() => SPG.signVideo.has('CAT') && SPG.signVideo.clip('CAT').dur > 1), 'CAT has a video with its length');
ok(await page.evaluate(() => document.querySelector('.sv-word.on.has') != null), 'the word shows that it has a video');
await page.screenshot({ path: `${SP}/signvideo-${W}x${Hh}.png` });
// the Signer plays it: CAT is a video word between two drawn signs
const lay = await page.evaluate(() => { const s = new SPG.sign.Signer(); const end = s.play(['HELLO', 'CAT', 'DOG']); return { end, words: s.words.map(w => ({ id: w.id, from: w.from, to: w.to, video: !!w.video })) }; });
ok(lay.words.length === 3 && lay.words[1].video && !lay.words[0].video && !lay.words[2].video, 'HELLO CAT DOG: the middle one is the video');
ok(lay.words[1].from >= lay.words[0].to && lay.words[2].from >= lay.words[1].to && lay.end >= lay.words[2].to, 'the words follow one another');
const drawn = await page.evaluate(async () => {
  const s = new SPG.sign.Signer(); s.play(['HELLO', 'CAT', 'DOG']); const cv = document.createElement('canvas'); cv.width = cv.height = 200; const c = cv.getContext('2d');
  const at = []; const frames = Math.ceil(s.endsAt / .05) + 4;
  for (let i = 0; i < frames; i++) { s.update(.05); c.clearRect(0, 0, 200, 200); s.draw(c, 0, 0, 200, 200, { dt: .05 }); const wn = s.wordNow(); at.push(wn && wn.video && s.time >= wn.from ? 'v' : 'h'); await new Promise(r => setTimeout(r, 50)); }
  return { at: at.join(''), busy: s.busy };
});
ok(/h+v+h+/.test(drawn.at) && !drawn.busy, `hands, then the video, then hands again (${drawn.at.replace(/(.)\1+/g, '$1')})`);
// the switch turns videos off
await page.evaluate(() => document.querySelector('#signvid-body .switch').click()); await wait(100);
ok(await page.evaluate(() => { const s = new SPG.sign.Signer(); s.play(['CAT']); return !SPG.signVideo.clip('CAT') && !s.words[0].video && s.keys.length > 0; }), 'videos off: CAT is drawn hands again');
await page.evaluate(() => document.querySelector('#signvid-body .switch').click()); await wait(100);
ok(await page.evaluate(() => !!SPG.signVideo.clip('CAT')), 'videos back on');
// the corner card shows the video for "cat"
await page.click('#signvid-close'); await wait(300);
await page.evaluate(() => { SPG.store.settings.signs = true; });
await page.click('#parent-close'); await wait(400);
await page.evaluate(() => SPG.signs.say(['sort/big', 'bunny/cat']));
await wait(1500);
const card = await page.evaluate(() => { const cv = document.querySelector('#sign-card canvas'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return { show: document.getElementById('sign-card').classList.contains('show'), filled: n / (d.length / 4) }; });
ok(card.show && card.filled > .5, `the corner card shows the video (${card.filled.toFixed(2)} of the card filled)`);
await page.screenshot({ path: `${SP}/signvideo-card-${W}x${Hh}.png` });
// Sign Along uses it too
await page.evaluate(() => SPG.signs.stop());
await openGame(page, 'Sign Along'); await wait(700);
let p = await page.evaluate(() => SPG.signGame.probe());
await page.mouse.click(p.btns[0].x, p.btns[0].y); await wait(400);
const has = await page.evaluate(() => { const g = SPG.signGame; g.signNow(['CAT']); return g.hands.words[0].video === 'CAT'; });
ok(has, 'Sign Along signs CAT with the video'); await wait(1200);
await page.screenshot({ path: `${SP}/signvideo-learn-${W}x${Hh}.png` });
// delete
ok(await page.evaluate(async () => { await SPG.signVideo.remove('CAT'); return !SPG.signVideo.has('CAT'); }), 'Delete removes the video');
ok(await page.evaluate(() => new Promise(r => { const q = indexedDB.open('spg-signvideo'); q.onsuccess = () => { const t = q.result.transaction('clips').objectStore('clips').count(); t.onsuccess = () => r(t.result === 0); }; })), 'and it is gone from the device');
ok(!page.errs.length, 'no errors: ' + page.errs.join(' | '));
console.log(fails ? `SIGN VIDEOS: ${fails} problem(s)` : 'SIGN VIDEOS OK');
stop(b); process.exit(fails ? 1 : 0);
