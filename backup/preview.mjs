// Preview the features held back from releases (sign language, camera sign videos) without putting them back in the app.
//   node backup/preview.mjs            -> serves the app at http://localhost:8400 with the held features switched in
//   PORT=9000 node backup/preview.mjs
// The playtests use the same thing with HELD=1 (tools/playtest/lib.mjs), e.g. HELD=1 node backup/sign-language/tools/signs.mjs
// Nothing here changes the real index.html: the scripts are added to the page as it is sent.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// in this order: the hands, their words, the corner card, then the camera videos (they add a row to the card's settings), then the game
export const HELD_JS = ['backup/sign-language/js/sign.js', 'backup/sign-language/js/sign-words.js', 'backup/sign-language/js/signs.js', 'backup/camera-sign-videos/js/signvideo.js', 'backup/sign-language/games/signlang.js'];
export const HELD_CSS = ['backup/sign-language/sign.css', 'backup/camera-sign-videos/signvideo.css'];
export function withHeld(html) {
  const css = HELD_CSS.map(f => `  <link rel="stylesheet" href="${f}">`).join('\n');
  const js = HELD_JS.map(f => `  <script src="${f}"></script>`).join('\n');
  // the hands load right after the voice; the game goes with the other games (before js/app.js builds the hub)
  return html.replace('</head>', css + '\n</head>')
    .replace('<script src="js/voice.js"></script>', '<script src="js/voice.js"></script>\n' + js.split('\n').slice(0, 4).join('\n'))
    .replace('<script src="games/sort.js"></script>', '<script src="games/sort.js"></script>\n' + js.split('\n')[4]);
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf', '.otf': 'font/otf' };
export function serve(port = +process.env.PORT || 8400) {
  return createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
    const f = normalize(join(ROOT, p)); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try {
      let body = await readFile(f);
      if (p === '/index.html') body = withHeld(body.toString('utf8'));
      if (p === '/sw.js') body = '// no offline cache in the preview\n';
      res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body);
    } catch (_) { res.writeHead(404); res.end(); }
  }).listen(port);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) { serve(); console.log(`Held-back features preview: http://localhost:${+process.env.PORT || 8400}`); }
