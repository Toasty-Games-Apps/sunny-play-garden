// Renders the iOS app icon and launch picture from the same drawings as every other icon:
//   icons/icon-square.svg -> ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png (full bleed; iOS rounds the corners itself)
//   icons/sprout.svg      -> ios/App/App/Assets.xcassets/LaunchSprout.imageset/ (the mascot alone, centred on the sky colour at launch)
// The app icon must have no alpha channel (App Store Connect refuses one), so it is a page screenshot on an opaque background, and
// the file is checked after writing. Needs Playwright (Chromium). Run from anywhere:  node ios-app/make-ios-icons.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
let chromium; try { ({ chromium } = await import('playwright')); } catch (_) { ({ chromium } = await import(process.env.PLAYWRIGHT_ESM || '/opt/node22/lib/node_modules/playwright/index.mjs')); }

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..'), xc = join(here, 'ios/App/App/Assets.xcassets');
const pngInfo = f => { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] }; };   // 2 = RGB, 6 = RGBA
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
async function render(svg, size, out, { opaque }) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const data = readFileSync(join(root, 'icons', svg)).toString('base64');
  await page.setContent(`<body style="margin:0;background:${opaque ? '#a9e1f3' : 'transparent'}"><img src="data:image/svg+xml;base64,${data}" width="${size}" height="${size}" style="display:block;object-fit:contain">`);
  await page.waitForTimeout(100);
  await page.screenshot({ path: out, omitBackground: !opaque });
  await page.close();
}
// app icon: one 1024 x 1024 picture for every size (Xcode makes the rest)
const iconDir = join(xc, 'AppIcon.appiconset');
rmSync(iconDir, { recursive: true, force: true }); mkdirSync(iconDir, { recursive: true });
await render('icon-square.svg', 1024, join(iconDir, 'AppIcon-1024.png'), { opaque: true });
const ic = pngInfo(join(iconDir, 'AppIcon-1024.png'));
if (ic.w !== 1024 || ic.h !== 1024 || ic.colorType !== 2) throw new Error(`app icon must be 1024x1024 RGB without alpha, got ${JSON.stringify(ic)}`);
writeFileSync(join(iconDir, 'Contents.json'), JSON.stringify({ images: [{ filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
// launch picture: the mascot, 200 points tall at 1x, 2x and 3x (shown at its own size, never stretched or cropped on any screen)
const lDir = join(xc, 'LaunchSprout.imageset');
rmSync(lDir, { recursive: true, force: true }); mkdirSync(lDir, { recursive: true });
const imgs = [];
for (const s of [1, 2, 3]) { const f = `launch-sprout@${s}x.png`; await render('sprout.svg', 200 * s, join(lDir, f), { opaque: false }); imgs.push({ idiom: 'universal', filename: f, scale: `${s}x` }); }
writeFileSync(join(lDir, 'Contents.json'), JSON.stringify({ images: imgs, info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
// the sky colour behind it (the same #a9e1f3 the game starts on, so launch -> game has no flash)
const cDir = join(xc, 'LaunchBackground.colorset'); mkdirSync(cDir, { recursive: true });
writeFileSync(join(cDir, 'Contents.json'), JSON.stringify({ colors: [{ idiom: 'universal', color: { 'color-space': 'srgb', components: { red: '0xA9', green: '0xE1', blue: '0xF3', alpha: '1.000' } } }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
// Capacitor's template splash is not used (Info.plist UILaunchScreen uses the picture above)
if (existsSync(join(xc, 'Splash.imageset'))) rmSync(join(xc, 'Splash.imageset'), { recursive: true, force: true });
await browser.close();
console.log('iOS icon and launch picture written:', JSON.stringify(ic));
