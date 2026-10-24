// Renders signs as film strips (N frames across each sign) so they can be checked by eye; with HANDS=1, every handshape instead.
// usage: IDS=HELLO,CAT,L:a N=5 CELL=150 node sign-strips.mjs   (writes $SHOTS/sign-strips.png)
//        HANDS=1 node sign-strips.mjs                           (writes $SHOTS/sign-hands.png: every handshape, palm out)
import { start, stop, newPage, SP } from './lib.mjs';
process.env.PORT = process.env.PORT || '8405';
const b = await start(); const page = await newPage(b, 1400, 1000);
if (process.env.HANDS) {
  await page.evaluate(() => {
    const S = SPG.sign, ids = Object.keys(S.HS), cols = 10, cw = 140, ch = 165, cv = document.createElement('canvas'); cv.width = cols * cw; cv.height = Math.ceil(ids.length / cols) * ch;
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#eef'; document.body.append(cv); const c = cv.getContext('2d');
    ids.forEach((id, n) => { const x0 = (n % cols) * cw, y0 = Math.floor(n / cols) * ch, h = S.placeHand(S.built(id), [0, 1, 0], [0, 0, 1], [0, 0, 0], 'palm', false), k = 62;
      c.fillStyle = '#f4f6ff'; c.fillRect(x0 + 1, y0 + 1, cw - 2, ch - 2); S.drawHand(c, h, q => [x0 + cw / 2 + q[0] * k, y0 + ch * .58 - q[1] * k, q[2]], k); c.fillStyle = '#223'; c.font = 'bold 15px sans-serif'; c.fillText(id, x0 + 6, y0 + 16); });
  });
  await page.screenshot({ path: `${SP}/sign-hands.png`, fullPage: true });
} else {
  const ids = (process.env.IDS || 'HELLO,THANK-YOU,L:a').split(','), N = +(process.env.N || 5), cell = +(process.env.CELL || 150);
  await page.setViewportSize({ width: cell * N, height: cell * ids.length });
  await page.evaluate(({ ids, N, cell }) => {
    const S = SPG.sign, cv = document.createElement('canvas'); cv.width = cell * N; cv.height = cell * ids.length; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff'; document.body.append(cv);
    const c = cv.getContext('2d');
    ids.forEach((id, row) => {
      const sg = new S.Signer(), end = sg.play([id]);
      for (let j = 0; j < N; j++) {
        const tm = .05 + (end - .05) * j / (N - 1); sg.time = tm - .03; sg.t = tm - .03; sg.busy = true; sg.update(.03);
        c.fillStyle = (row + j) % 2 ? '#eef4ff' : '#f7f9ff'; c.fillRect(j * cell, row * cell, cell, cell); sg.draw(c, j * cell, row * cell, cell, cell, { snap: true });
        if (j === 0) { c.fillStyle = '#000'; c.font = 'bold 14px sans-serif'; c.fillText(id, 4, row * cell + 14); }
      }
    });
  }, { ids, N, cell });
  await page.screenshot({ path: `${SP}/sign-strips.png` });
}
console.log(page.errs.join('\n') || 'ok'); stop(b);
