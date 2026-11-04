// Checks an iOS RELEASE build before it is archived (the workflow runs it; run it by hand with  node ios-app/test/check-release-ios.mjs).
// It fails when something that must never reach the App Store is in the app:
//   - the simulator self-test (js/selftest.js, www/test) or a local test backup address,
//   - features held back for this release (sign language, camera sign videos) or any use of the camera,
//   - network exceptions (App Transport Security), a camera permission text, background modes,
// and it checks what Apple needs: the privacy manifest, the permission texts, the encryption answer, the app icon without alpha,
// the launch screen, the bundle id and team, and that the version numbers are set.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = join(dirname(fileURLToPath(import.meta.url)), '..'), www = join(here, 'www'), app = join(here, 'ios', 'App', 'App');
let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); }, ok = m => console.log('ok   ' + m);
const read = f => readFileSync(f, 'utf8');

// the web files that will be packed
if (!existsSync(join(www, 'index.html'))) fail('ios-app/www is missing: run node ios-app/build-web.mjs first');
else {
  const html = read(join(www, 'index.html'));
  if (/selftest/.test(html) || existsSync(join(www, 'js', 'selftest.js')) || existsSync(join(www, 'test'))) fail('the simulator self-test is in www (build without SPG_SELFTEST)'); else ok('no self-test in the app');
  const cfg = existsSync(join(www, 'js', 'app-config.js')) ? read(join(www, 'js', 'app-config.js')) : '';
  if (/http:\/\//.test(cfg) || /127\.0\.0\.1|localhost:\d/.test(cfg)) fail('the backup address is a local test address: ' + cfg.trim()); else ok('backup address: ' + (cfg.match(/"api":"([^"]*)"/) || [, 'none'])[1] || 'none');
  if (/connect-src[^;]*http:\/\//.test(html)) fail('the CSP allows a plain http address'); else ok('CSP has no plain http address');
  const held = ['sign.js', 'sign-words.js', 'signs.js', 'signvideo.js', 'signlang.js'];
  for (const d of ['js', 'games']) for (const f of held) if (existsSync(join(www, d, f))) fail(`${d}/${f} is held back and must not ship`);
  const cam = /getUserMedia\s*\(\s*\{[^}]*video|facingMode/;
  for (const d of ['js', 'games']) for (const f of readdirSync(join(www, d))) if (f.endsWith('.js') && cam.test(read(join(www, d, f)))) fail(`${d}/${f} uses the camera`);
  if (existsSync(join(www, 'sw.js'))) fail('the service worker is in the app');
  ok('no held-back features, no camera, no service worker');
}

// Info.plist
const plist = read(join(app, 'Info.plist'));
const has = k => plist.includes(`<key>${k}</key>`);
for (const k of ['NSAppTransportSecurity', 'NSAllowsLocalNetworking', 'NSAllowsArbitraryLoads', 'NSCameraUsageDescription', 'UIBackgroundModes', 'NSUserTrackingUsageDescription', 'NSLocationWhenInUseUsageDescription', 'NSContactsUsageDescription', 'NSPhotoLibraryUsageDescription'])
  if (has(k)) fail(`Info.plist has ${k}, which this app must not have`);
for (const k of ['NSMicrophoneUsageDescription', 'NSPhotoLibraryAddUsageDescription', 'NSFaceIDUsageDescription', 'UILaunchScreen', 'CFBundleDisplayName'])
  if (!has(k)) fail(`Info.plist is missing ${k}`);
if (!/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(plist)) fail('Info.plist must answer ITSAppUsesNonExemptEncryption (false: only the system\'s standard encryption is used)');
if (!/<key>UIStatusBarHidden<\/key>\s*<true\/>/.test(plist)) fail('the status bar should be hidden for the games');
ok('Info.plist permissions and keys');
for (const l of ['en', 'es', 'hi', 'zh-Hans']) { const f = join(app, `${l}.lproj`, 'InfoPlist.strings'); if (!existsSync(f)) fail(`missing ${l}.lproj/InfoPlist.strings`); else { const s = read(f); for (const k of ['NSMicrophoneUsageDescription', 'NSPhotoLibraryAddUsageDescription', 'NSFaceIDUsageDescription']) if (!s.includes(k)) fail(`${l}.lproj/InfoPlist.strings has no ${k}`); } }
ok('permission texts in English, Spanish, Hindi and Chinese');

// privacy manifest
const pm = existsSync(join(app, 'PrivacyInfo.xcprivacy')) ? read(join(app, 'PrivacyInfo.xcprivacy')) : '';
if (!pm) fail('PrivacyInfo.xcprivacy is missing');
else {
  if (!/<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(pm)) fail('the privacy manifest must say: no tracking');
  if (!/NSPrivacyTrackingDomains<\/key>\s*<array\/>/.test(pm)) fail('the privacy manifest must list no tracking domains');
  ok('privacy manifest: no tracking');
}

// project settings
const pbx = read(join(here, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'));
if (!/PRODUCT_BUNDLE_IDENTIFIER = com\.toastygames\.littlesproutpark;/.test(pbx)) fail('bundle id is not com.toastygames.littlesproutpark');
if (!/DEVELOPMENT_TEAM = 6437343CNQ;/.test(pbx)) fail('the Apple team is not set');
if (!/MARKETING_VERSION = \d+\.\d+\.\d+;/.test(pbx)) fail('MARKETING_VERSION is not set');
if (/IPHONEOS_DEPLOYMENT_TARGET = (1[0-6])\.\d;/.test(pbx)) fail('the deployment target is older than iOS 17 (the games need iOS 17 web features)');
ok('bundle id, team, version, deployment target');
const sw = read(join(app, 'SproutViewController.swift'));
if (!/#if DEBUG[\s\S]*class SproutTestPlugin[\s\S]*#endif/.test(sw)) fail('the test plugin must only be in Debug builds');
else ok('the test plugin is Debug only');

// the app icon: 1024 x 1024 PNG without alpha (App Store Connect refuses an icon with alpha)
const icon = join(app, 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-1024.png');
if (!existsSync(icon)) fail('the 1024 px app icon is missing');
else { const b = readFileSync(icon); const w = b.readUInt32BE(16), h = b.readUInt32BE(20), ct = b[25]; if (w !== 1024 || h !== 1024) fail(`the app icon is ${w}x${h}`); else if (ct === 6 || ct === 4) fail('the app icon has an alpha channel'); else ok('app icon 1024 x 1024 without alpha'); }

console.log(bad ? `\n${bad} problem(s): fix them before archiving for the App Store` : '\niOS release checks passed');
process.exit(bad ? 1 : 0);
