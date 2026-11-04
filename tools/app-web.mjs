// Packs the game (the files in the repo root) into the www folder that Capacitor puts inside the Android or iOS app.
// Used by android-app/build-web.mjs and ios-app/build-web.mjs. Nothing in the game is changed or rewritten: the files are copied as
// they are, with three small differences for the app:
//   1. the service worker is left out (the app already has every file on the device, so there is nothing to cache),
//   2. the Content-Security-Policy <meta> tag gets permission to reach the backup service (if one is set),
//   3. js/app-config.js says where the optional cloud backup lives (set SPG_API_BASE, or edit app-config.json) and which version this is
//      (SPG_VERSION_NAME, the same name the store shows; Grown-ups > About shows it too).
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The backup address and version name for an app folder (android-app or ios-app): environment first, then its app-config.json.
export function appSettings(appDir) {
  const cfg = existsSync(join(appDir, 'app-config.json')) ? JSON.parse(readFileSync(join(appDir, 'app-config.json'), 'utf8')) : {};
  const api = (process.env.SPG_API_BASE || cfg.apiBase || '').replace(/\/+$/, ''), version = (process.env.SPG_VERSION_NAME || '').trim();
  if (api && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(api)) throw new Error('apiBase must look like https://your-domain.example (no path)');
  return { api, version };
}

// out: the www folder. extraScripts: files copied into www/js and loaded after native.js (only the iOS simulator test build uses this).
export function packWeb({ out, api = '', version = '', extraScripts = [] }) {
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  for (const f of ['styles.css', 'privacy.html']) cpSync(join(root, f), join(out, f));
  for (const d of ['js', 'games', 'fonts', 'audio', 'icons']) cpSync(join(root, d), join(out, d), { recursive: true });
  // Features held back from releases live in backup/ (sign language, the camera for sign videos), which is never copied.
  // Stop the build if any of them, or a use of the camera, has found its way back into the game files.
  { const held = ['sign.js', 'sign-words.js', 'signs.js', 'signvideo.js', 'signlang.js'];
    for (const d of ['js', 'games']) for (const f of held) if (existsSync(join(out, d, f))) throw new Error(`${d}/${f} is held back in backup/ and must not ship`);
    const cam = /getUserMedia\s*\(\s*\{[^}]*video|facingMode/;
    for (const d of ['js', 'games']) for (const f of readdirSync(join(out, d))) if (f.endsWith('.js') && cam.test(readFileSync(join(out, d, f), 'utf8'))) throw new Error(`${d}/${f} uses the camera, which is held back from releases`); }

  // index.html already carries the Content-Security-Policy as a <meta> tag; the app only adds permission to reach the backup service
  let html = readFileSync(join(root, 'index.html'), 'utf8');
  if (api) { if (!html.includes("connect-src 'self'")) throw new Error('index.html CSP changed: update tools/app-web.mjs'); html = html.replace("connect-src 'self'", `connect-src 'self' ${api}`); }
  const extra = extraScripts.map(f => { const name = f.split(/[\\/]/).pop(); cpSync(f, join(out, 'js', name)); return `\n  <script src="js/${name}"></script>`; }).join('');
  html = html.replace('<script src="js/native.js"></script>', '<script src="js/app-config.js"></script>\n  <script src="js/native.js"></script>' + extra);
  writeFileSync(join(out, 'index.html'), html);
  writeFileSync(join(out, 'js', 'app-config.js'), `window.SPG_APP = ${JSON.stringify(version ? { api, version } : { api })};\n`);
  console.log(`www ready (${api ? 'cloud backup at ' + api : 'no cloud backup address set'})`);
}
