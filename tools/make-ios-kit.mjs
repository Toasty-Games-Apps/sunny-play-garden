// Builds the iOS port kit: a zip another agent can use to bring the next web game to iPhone, iPad and iPhone Duo.
//   node tools/make-ios-kit.mjs [--out ios-port-kit.zip]
// It holds the guides in tools/ios-kit/ (START-HERE, PROMPT, LESSONS, web-patterns, worker-origins), the real files from this repo
// under reference/ (only files git tracks, so no node_modules, www/ or anything ignored), IDENTITY.md (every place this app's name,
// ids and class names appear in them, found when the kit is built) and KIT-INFO.txt (the commit it was built from).
// It refuses to build if any file looks like signing material or a secret.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = resolve(arg('out', 'ios-port-kit.zip'));
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();

// the reference files: whole folders or single files, as git tracks them
const REF = ['ios-app', 'tools/app-web.mjs', '.github/workflows/ios.yml', 'js/native.js', 'js/photos.js', 'tools/playtest/lib.mjs',
  'tools/store-scenes.mjs', 'tools/sync-privacy.mjs', 'store/ios/APP-STORE-HANDOFF.md'];
const files = [...new Set(REF.flatMap(p => git('ls-files', '--', p).split('\n').filter(Boolean)))];
for (const p of REF) if (!files.some(f => f === p || f.startsWith(p + '/'))) throw new Error(`${p} is not in git any more: update REF in tools/make-ios-kit.mjs`);

const tmp = mkdtempSync(join(tmpdir(), 'ios-kit-')), kit = join(tmp, 'ios-port-kit');
mkdirSync(join(kit, 'reference'), { recursive: true });
const docs = join(root, 'tools', 'ios-kit');
for (const f of readdirSync(docs)) cpSync(join(docs, f), join(kit, f));
for (const f of files) { const to = join(kit, 'reference', f); mkdirSync(dirname(to), { recursive: true }); cpSync(join(root, f), to); }

// nothing secret may go in: signing files by name, private keys and tokens by content
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const all = walk(kit);
const BAD_NAME = /\.(p8|p12|pfx|cer|mobileprovision|keystore|jks|pem|key)$|(^|\/)\.env/i;
const BAD_TEXT = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bghp_[A-Za-z0-9]{30,}/, /\bgithub_pat_[A-Za-z0-9_]{30,}/, /\bsk-[A-Za-z0-9-]{30,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bre_[A-Za-z0-9]{20,}/];
for (const f of all) {
  const rel = relative(kit, f);
  if (BAD_NAME.test(rel)) throw new Error(`refusing to pack ${rel}: it looks like signing material or a secret`);
  if (statSync(f).size < 4_000_000) { const s = readFileSync(f, 'latin1'); for (const re of BAD_TEXT) if (re.test(s)) throw new Error(`refusing to pack ${rel}: it holds something that looks like a key or token (${re})`); }
}

// IDENTITY.md: where this app's identity appears in the reference files, so the next app can change every one
const ID = [
  ['Bundle id', /com\.toastygames\.littlesproutpark/, 'the new app\'s bundle id (the same as its Android package, if any)'],
  ['Apple Team ID', /6437343CNQ/, 'the new team id'],
  ['App Store Connect app id / SKU', /6830382328|SPG-IOS-001/, 'the new app\'s ids'],
  ['App name', /Little Sprout Park|Sprout Park|SproutPark/, 'the new app\'s name (App Store name, the name under the icon, file names)'],
  ['Native class and plugin names', /Sprout(ViewController|Photos|PhotosPlugin|View|ViewPlugin|Test|TestPlugin)\b/, 'keep or rename (Info.plist, the storyboard-free SceneDelegate, project.pbxproj and js/native.js must match)'],
  ['Game global and build switches', /\bSPG(_SELFTEST|_TEST_API|_API_BASE|_VERSION_NAME|_APP|_TEST)?\b/, 'the new game\'s global, or keep the SPG_* build switches'],
  ['Branch in the workflow', /ccr-812ba91c-62t8en/, 'the new repo\'s branch'],
  ['macOS runner label', /xcode-27/, 'a runner label the new repo has'],
  ['Launch and background colour', /#a9e1f3|a9e1f3/i, 'the new app\'s colour'],
  ['Backup server address', /workers\.dev|sunny-play-garden/, 'the new server, or remove the backup parts'],
  ['Languages', /zh-Hans|\bhi\.lproj|\bes\.lproj|<string>(es|hi)<\/string>/, 'the new app\'s languages (the *.lproj permission texts, CFBundleLocalizations, the release check\'s list)'],
];
const text = all.filter(f => !/\.(png|jpg|jpeg|gif|webp|ico|zip)$/i.test(f) && !/package-lock\.json$/.test(f) && f.includes(join(kit, 'reference')));
let md = '# Where Little Sprout Park\'s identity appears\n\nMade by `tools/make-ios-kit.mjs` when this kit was built. Change each of these for the new app. Paths are inside `reference/`;\n`package-lock.json` and pictures are left out. The app icon and launch pictures (`Assets.xcassets`) are images: replace them too.\n';
for (const [what, re, to] of ID) {
  const hits = [];
  for (const f of text) { const lines = readFileSync(f, 'utf8').split('\n'); const n = lines.reduce((a, l, i) => re.test(l) ? a.concat(i + 1) : a, []); if (n.length) hits.push(`${relative(join(kit, 'reference'), f)}: ${n.length > 12 ? n.slice(0, 12).join(', ') + ` and ${n.length - 12} more` : n.join(', ')}`); }
  md += `\n## ${what}\n\nChange to: ${to}.\n\n` + (hits.length ? hits.map(h => `- ${h}`).join('\n') : '- (not found)') + '\n';
}
writeFileSync(join(kit, 'IDENTITY.md'), md);

const head = git('rev-parse', 'HEAD'), branch = git('rev-parse', '--abbrev-ref', 'HEAD'), dirty = git('status', '--porcelain', '--', ...REF, 'tools/ios-kit');
writeFileSync(join(kit, 'KIT-INFO.txt'), [
  'iOS port kit from Little Sprout Park',
  `built ${new Date().toISOString().slice(0, 10)} from commit ${head} (branch ${branch})${dirty ? ', with uncommitted changes to some kit files' : ''}`,
  `${files.length} reference files. Rebuild it with: node tools/make-ios-kit.mjs --out ios-port-kit.zip`,
  'No signing material, keys or tokens are inside: the build refuses them.', ''].join('\n'));

if (existsSync(out)) rmSync(out);
execFileSync('zip', ['-q', '-r', '-X', out, 'ios-port-kit'], { cwd: tmp });
rmSync(tmp, { recursive: true, force: true });
console.log(`${relative(process.cwd(), out) || out}: ${files.length} reference files, ${(statSync(out).size / 1024 / 1024).toFixed(1)} MB`);
