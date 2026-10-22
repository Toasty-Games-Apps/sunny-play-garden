// Renders the Android launcher icons and splash screens from the game's own icons (icons/icon-512.png and
// icons/icon-maskable-512.png), so the app icon matches the website's. Needs Playwright: NODE_PATH=$(npm root -g) node make-android-icons.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), res = join(here, 'android/app/src/main/res'), icons = join(here, '..', 'icons');
const b64 = f => 'data:image/png;base64,' + readFileSync(join(icons, f)).toString('base64');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined }), page = await browser.newPage();
await page.goto('about:blank');
const draw = (spec) => page.evaluate(async ({ spec, plain, mask }) => {
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const [ip, im] = await Promise.all([load(plain), load(mask)]);
  const c = document.createElement('canvas'); c.width = spec.w; c.height = spec.h; const x = c.getContext('2d');
  if (spec.bg) { x.fillStyle = spec.bg; x.fillRect(0, 0, spec.w, spec.h); }
  if (spec.kind === 'foreground') { x.drawImage(im, 0, 0, spec.w, spec.h); }   // full bleed: the phone's mask crops to the middle two thirds, where the sprout sits
  else if (spec.kind === 'legacy') { x.drawImage(ip, 0, 0, spec.w, spec.h); }
  else if (spec.kind === 'round') { x.save(); x.beginPath(); x.arc(spec.w / 2, spec.h / 2, spec.w / 2, 0, Math.PI * 2); x.clip(); x.drawImage(im, 0, 0, spec.w, spec.h); x.restore(); }
  else if (spec.kind === 'splash') { const s = Math.min(spec.w, spec.h) * .3; x.drawImage(ip, (spec.w - s) / 2, (spec.h - s) / 2, s, s); }
  return c.toDataURL('image/png').split(',')[1];
}, { spec, plain: b64('icon-512.png'), mask: b64('icon-maskable-512.png') });
const out = async (path, spec) => writeFileSync(join(res, path), Buffer.from(await draw(spec), 'base64'));
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  await out(`mipmap-${d}/ic_launcher.png`, { kind: 'legacy', w: 48 * k, h: 48 * k });
  await out(`mipmap-${d}/ic_launcher_round.png`, { kind: 'round', w: 48 * k, h: 48 * k });
  await out(`mipmap-${d}/ic_launcher_foreground.png`, { kind: 'foreground', w: 108 * k, h: 108 * k });
  const base = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }[d];
  await out(`drawable-port-${d}/splash.png`, { kind: 'splash', w: base[0], h: base[1], bg: '#a9e1f3' });
  await out(`drawable-land-${d}/splash.png`, { kind: 'splash', w: base[1], h: base[0], bg: '#a9e1f3' });
}
await out('drawable/splash.png', { kind: 'splash', w: 480, h: 480, bg: '#a9e1f3' });
await browser.close();
console.log('icons and splash screens written');
