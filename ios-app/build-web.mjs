// Packs the game (the files in the repo root) into ios-app/www, which Capacitor puts inside the iPhone and iPad app.
// The packing is shared with the Android app: see tools/app-web.mjs (what is copied, the held-back checks, the CSP and app-config.js).
// Set SPG_API_BASE (or apiBase in ios-app/app-config.json) for the optional cloud backup, and SPG_VERSION_NAME for the version name.
//
// SPG_SELFTEST=1 makes a simulator TEST build (never for the App Store; ios-app/test/check-release-ios.mjs refuses it):
//   - js/selftest.js, the runner that reads a plan from the app's Documents folder and runs one test inside the app's own web view,
//   - www/test/: the Playwright stand-in (lib.js), the play-tests from tools/playtest that work inside one page, the iOS checks and
//     the store screenshot scenes. They are copied as .js files because the app's file server only knows that name for scripts.
//   - SPG_TEST_API=http://127.0.0.1:8787 points the backup at a local worker (npx wrangler dev) for the backup test.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { packWeb, appSettings, root } from '../tools/app-web.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const test = process.env.SPG_SELFTEST === '1', www = join(here, 'www');
const cfg = appSettings(here);
const testApi = test && process.env.SPG_TEST_API ? process.env.SPG_TEST_API.replace(/\/+$/, '') : '';
if (testApi && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(testApi)) throw new Error('SPG_TEST_API must be a local address like http://127.0.0.1:8787');
packWeb({ out: www, ...cfg, ...(testApi ? { api: testApi } : {}), extraScripts: test ? [join(here, 'test', 'selftest.js')] : [] });

// The play-tests that run inside one page (no reload, no second browser): see ios-app/test/README.md
export const PLAYTESTS = ['auto', 'shapes', 'sort', 'pattern', 'feelings', 'fishing', 'clay', 'care', 'salon', 'fixes', 'monkey', 'hide', 'num', 'tiers', 'kitchen-look'];
if (test) {
  const out = join(www, 'test'); mkdirSync(out, { recursive: true });
  const fix = src => src.replace(/from '\.\/lib\.mjs'/g, "from './lib.js'").replace(/from '\.\.\/\.\.\/tools\/store-scenes\.mjs'/g, "from './store-scenes.js'");
  writeFileSync(join(out, 'lib.js'), readFileSync(join(here, 'test', 'shim-lib.js'), 'utf8'));
  for (const t of PLAYTESTS) writeFileSync(join(out, t + '.js'), fix(readFileSync(join(root, 'tools', 'playtest', t + '.mjs'), 'utf8')));
  for (const t of ['ios', 'lang', 'after', 'store-shots']) writeFileSync(join(out, t + '.js'), fix(readFileSync(join(here, 'test', t + '.mjs'), 'utf8')));
  writeFileSync(join(out, 'store-scenes.js'), readFileSync(join(root, 'tools', 'store-scenes.mjs'), 'utf8'));
  console.log(`simulator self-test included with ${PLAYTESTS.length + 4} tests${testApi ? ', backup at ' + testApi : ''} (never ship this build)`);
}
