// Packs the game (the files in the repo root) into android-app/www, which Capacitor puts inside the Android app.
// The packing itself is shared with the iOS app: see tools/app-web.mjs (what is copied, the held-back checks, the CSP and app-config.js).
// Set SPG_API_BASE (or apiBase in android-app/app-config.json) for the optional cloud backup, and SPG_VERSION_NAME for the version name.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packWeb, appSettings } from '../tools/app-web.mjs';

const here = dirname(fileURLToPath(import.meta.url));
packWeb({ out: join(here, 'www'), ...appSettings(here) });
