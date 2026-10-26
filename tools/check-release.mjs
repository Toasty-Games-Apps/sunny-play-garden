// Release pre-flight. Run from the repo root:  node tools/check-release.mjs
// Prints PASS / WARN / FAIL lines and exits 1 if anything FAILs.
// WARNs are things only the owner can fill in (contact details, signing fingerprints).
import { readFileSync, existsSync, readdirSync } from 'node:fs';

let fails = 0, warns = 0;
const pass = m => console.log('  PASS  ' + m);
const warn = m => { warns++; console.log('  WARN  ' + m); };
const fail = m => { fails++; console.log('  FAIL  ' + m); };
const read = p => readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const pngSize = p => { const b = readFileSync(p); return b.toString('latin1', 1, 4) === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };

console.log('Manifest');
const m = json('manifest.webmanifest');
for (const k of ['name', 'short_name', 'start_url', 'scope', 'id', 'display', 'icons', 'description'])
  m[k] ? pass(`${k} present`) : fail(`manifest is missing "${k}"`);
if (m.short_name && m.short_name.length > 12) warn(`short_name "${m.short_name}" is over 12 characters; launchers may truncate it`);
const wants = [['icons/icon-192.png', 192, 'any'], ['icons/icon-512.png', 512, 'any'], ['icons/icon-maskable-512.png', 512, 'maskable']];
for (const [file, size, purpose] of wants) {
  if (!existsSync(file)) { fail(`${file} is missing`); continue; }
  const dim = pngSize(file);
  if (!dim || dim[0] !== size || dim[1] !== size) fail(`${file} should be ${size}x${size} PNG (found ${dim ? dim.join('x') : 'not a PNG'})`);
  else if (!m.icons.some(i => i.src === file && (i.purpose || 'any') === purpose)) fail(`${file} is not listed in the manifest with purpose "${purpose}"`);
  else pass(`${file} ${size}x${size} (${purpose})`);
}
for (const s of m.screenshots || []) existsSync(s.src) ? pass(`screenshot ${s.src}`) : fail(`manifest screenshot ${s.src} is missing`);

console.log('Service worker');
const sw = read('sw.js');
const shell = (sw.match(/const SHELL = \[([\s\S]*?)\];/) || [])[1];
if (!shell) fail('could not read SHELL list in sw.js');
else for (const f of [...shell.matchAll(/'([^']+)'/g)].map(x => x[1]))
  (f === './' || existsSync(f)) ? null : fail(`sw.js caches a missing file: ${f}`);
if (shell && !fails) pass('every file in the offline list exists');
const html = read('index.html');
for (const s of [...html.matchAll(/<script src="([^"]+)"/g)].map(x => x[1])) {
  if (!existsSync(s)) fail(`index.html loads a missing script ${s}`);
  else if (!shell.includes(`'${s}'`)) fail(`${s} is loaded by index.html but not in sw.js SHELL (offline would break)`);
}
pass(`cache name ${(sw.match(/const CACHE = '([^']+)'/) || [])[1]}`);

console.log('Security');
/Content-Security-Policy/.test(html) ? pass('CSP meta tag in index.html') : fail('no CSP meta tag in index.html');
/Content-Security-Policy[^\n]*frame-ancestors/.test(read('_headers')) ? pass('_headers CSP with frame-ancestors') : fail('_headers is missing the CSP');
/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/, '')) ? fail('index.html contains an external URL') : pass('no external URLs in index.html');
/<a [^>]*href="https?:/.test(read('js/app.js')) ? fail('js/app.js contains an external link') : pass('no external links in the app');

console.log('App');
const core = read('js/core.js');
pass(`version ${(core.match(/SPG\.version\s*=\s*'([^']+)'/) || [])[1]}`);
/SPG\.config\s*=\s*\{[^}]*recorder:\s*true/.test(core)
  ? warn('SPG.config.recorder is true: the Voices recorder shows in the grown-ups panel. Fine for personal use; for a public release either ship recorded audio in audio/voice/ or set it to false')
  : pass('recorder hidden for public release');
existsSync('audio/voice/manifest.json') ? pass('voice manifest present') : warn('no audio/voice/manifest.json: the app will use built-in speech (fine, but recorded voices sound better)');
/Little Sprout Park/.test(html) ? pass('app name in index.html') : fail('index.html does not use the app name');

console.log('Privacy policy');
const pv = read('privacy.html');
for (const ph of pv.match(/\[[^\]]+\]/g) || []) warn(`privacy.html still has a placeholder: ${ph}`);
if (!/\[[^\]]+\]/.test(pv)) pass('no placeholders left');

console.log('Digital Asset Links');
const al = json('.well-known/assetlinks.json');
if (!al.length) warn('.well-known/assetlinks.json is empty. After Play App Signing is set up run: node tools/make-assetlinks.mjs <package.id> <SHA-256 fingerprint>');
else {
  const t = al[0].target || {};
  /^[A-F0-9]{2}(:[A-F0-9]{2}){31}$/.test((t.sha256_cert_fingerprints || [])[0] || '') ? pass(`assetlinks for ${t.package_name}`) : fail('assetlinks fingerprint is not a valid SHA-256');
}

console.log('Cloud backup');
const wr = read('wrangler.jsonc');
/"main"\s*:\s*"worker\/index\.js"/.test(wr) && /Backups/.test(wr) && /new_sqlite_classes/.test(wr)
  ? pass('wrangler.jsonc declares the backup Worker and Durable Object')
  : fail('wrangler.jsonc is missing the backup Worker / Durable Object settings');
/worker\//.test(read('.assetsignore')) ? pass('worker/ is kept out of the public site') : fail('.assetsignore must list worker/');
/pathname\.startsWith\('\/api\/'\)/.test(sw) ? pass('service worker never caches /api/') : fail('sw.js must skip /api/ requests');
/backup/i.test(pv) ? pass('privacy policy describes the cloud backup') : fail('privacy.html does not mention the cloud backup');

console.log('Store files');
for (const f of ['store/icon-512.png', 'store/feature-graphic.png']) existsSync(f) ? pass(f) : fail(`${f} is missing`);
const fg = existsSync('store/feature-graphic.png') && pngSize('store/feature-graphic.png');
if (fg) (fg[0] === 1024 && fg[1] === 500) ? pass('feature graphic 1024x500') : fail(`feature graphic must be 1024x500 (found ${fg.join('x')})`);
for (const f of ['store/listing.md', 'store/PLAY-STORE-GUIDE.md', 'store/twa-manifest.template.json']) existsSync(f) ? pass(f) : fail(`${f} is missing`);
for (const [dev, w, h] of [['phone', 1080, 1920], ['tablet7', 1080, 1920], ['tablet10', 2560, 1440]]) {
  const dir = `store/screenshots/${dev}`, files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.png')) : [];
  if (files.length < 4 || files.length > 8) { fail(`${dir}: ${files.length} screenshots (Play wants 4 to 8 for promotion); run node tools/make-store-assets.mjs`); continue; }
  const bad = files.filter(f => { const b = readFileSync(`${dir}/${f}`); return b.readUInt32BE(16) !== w || b.readUInt32BE(20) !== h || b[25] !== 2; });   // PNG width, height, colour type 2 = RGB, no alpha
  bad.length ? fail(`${dir}: ${bad.join(', ')} not ${w}x${h} RGB without alpha`) : pass(`${dir}: ${files.length} screenshots at ${w}x${h}, no alpha`);
}
if (existsSync('store/feature-graphic.png')) { const b = readFileSync('store/feature-graphic.png'); b.readUInt32BE(16) === 1024 && b.readUInt32BE(20) === 500 && b[25] === 2 ? pass('feature graphic 1024x500, no alpha') : fail('store/feature-graphic.png must be 1024x500 without alpha'); }

console.log(`\n${fails} failed, ${warns} to-do for the owner.`);
process.exit(fails ? 1 : 0);
