// Offline support: the whole site is cached so it keeps working with no internet once opened.
// Network first (so a new deploy shows up right away), cache as the fallback.
const CACHE = 'spg-v27';
const SHELL = [
  './', 'styles.css', 'manifest.webmanifest',
  'js/native.js', 'js/glyphs.js', 'js/core.js', 'js/photos.js', 'js/level.js', 'js/sync.js', 'js/voice.js', 'js/art.js', 'js/art-garden.js', 'js/art-pets.js', 'js/scenery.js', 'js/pets.js', 'js/hair.js', 'js/people.js', 'js/people-wear.js', 'js/studio.js', 'js/app.js',
  'games/letters.js', 'games/fruit.js', 'games/rain.js', 'games/firerescue.js', 'games/band.js', 'games/shapes.js', 'games/puzzle.js', 'games/aquarium.js', 'games/petcare-rooms.js', 'games/petcare-groom.js', 'games/petcare.js', 'games/hide.js', 'games/cook-art.js', 'games/cook.js', 'games/clay-kit.js', 'games/clay.js', 'games/fishing.js', 'games/pattern.js', 'games/garden.js', 'games/color-pictures.js', 'games/color-seasons.js', 'games/color-dinos.js', 'games/color.js', 'games/petshop.js', 'games/salon.js', 'games/style.js',
  'fonts/fredoka-latin-400-normal.woff2', 'fonts/fredoka-latin-600-normal.woff2', 'fonts/fredoka-latin-700-normal.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'privacy.html', 'audio/voice/manifest.json'
];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || new URL(req.url).pathname.startsWith('/api/')) return; // never cache the backup service
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./') : Response.error())))   // only pages fall back to the app
  );
});
