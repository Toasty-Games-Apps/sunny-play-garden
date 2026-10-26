import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const policy = readFileSync(resolve(root, 'privacy.html'), 'utf8');
writeFileSync(resolve(root, 'worker/privacy-html.js'),
  '// Keep the Play listing privacy URL available after browser play closes.\n' +
  '// Generated from privacy.html by node tools/sync-privacy.mjs.\n' +
  `export const PRIVACY_HTML = ${JSON.stringify(policy)};\n`);
