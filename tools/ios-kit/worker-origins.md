# Letting the iOS app reach the game's server

Only needed if the game calls a server, such as Little Sprout Park's optional cloud backup (a Cloudflare Worker in `worker/index.js`).

Inside the apps, Capacitor serves the game from the device itself, so requests come from these origins:

| App | Origin |
|---|---|
| Android | `https://localhost` |
| iPhone and iPad | `capacitor://localhost` |
| The website | its own address (same-origin, no CORS needed) |

Little Sprout Park allows exactly those two app origins and nothing else. Every other site gets 403:

```js
// The two apps, where Capacitor serves the game from the device itself: Android (https://localhost) and iPhone/iPad
// (capacitor://localhost, Capacitor's iOS scheme). Nothing else: other sites get 403, the website itself is same-origin.
const APP_ORIGINS = new Set(['https://localhost', 'capacitor://localhost']);

const corsFor = origin => origin && APP_ORIGINS.has(origin) ? {
  'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'X-Family, X-Stamp, Content-Type', 'Access-Control-Max-Age': '86400'
} : null;

// in fetch():
const origin = request.headers.get('Origin');
const cors = corsFor(origin);
let sameHost = false; try { sameHost = !!origin && new URL(origin).host === url.host; } catch (_) { /* 'null' or junk */ }
if (origin && !cors && !sameHost) return json({ error: 'forbidden' }, 403);
if (request.method === 'OPTIONS') return cors ? new Response(null, { status: 204, headers: cors }) : new Response(null, { status: 204 });
// ... route, then copy the cors headers onto the response
```

Notes:

- **Never use `*`** or allow any other `localhost` scheme or port.
- **Two other changes go with it.** The app's CSP needs the server's https address in `connect-src`; `tools/app-web.mjs` adds it at
  build time from `SPG_API_BASE`. The release check refuses a plain `http://` address.
- **The test run uses a local copy of the server on the Mac** (`npx wrangler dev --ip 127.0.0.1 --port 8787`). The test build
  points at it and gets `NSAllowsLocalNetworking` in its `Info.plist`, which the release build never has. The workflow prints what
  `capacitor://localhost` and `https://evil.example` get from it (an answer and 403).
- **The change does nothing until the server is deployed** (`npx wrangler deploy`). Prepare it for the owner's review, and say in
  the handoff that it is not live yet.
