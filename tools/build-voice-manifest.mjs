// Lists the recorded voice files so the games know which ones exist (no guessing, no failed requests).
// Run from the repository root after adding files:  node tools/build-voice-manifest.mjs
import { readdirSync, writeFileSync, existsSync } from 'node:fs';

const manifest = {};
for (const set of ['male', 'female', 'sprout']) {   // sprout: the Sprout voice made by tools/voice-pack/make.py
  const dir = `audio/voice/${set}`;
  manifest[set] = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.mp3')).map(f => f.replace(/\.mp3$/, '')).sort() : [];
}
writeFileSync('audio/voice/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(Object.entries(manifest).map(([s, l]) => `${s}: ${l.length} files`).join(', '));
