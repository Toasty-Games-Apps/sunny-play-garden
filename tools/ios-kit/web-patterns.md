# Web-side patterns the iOS port needed

These are code from Little Sprout Park, copied as they are. The full files are in `reference/js/`. `SPG` is that game's global;
use the new game's own.

## Safe areas: the larger of `env()` and the app's own numbers

In the stylesheet's `:root`:

```css
/* --nat-* are only set by the iOS app (js/native.js: the window's real safe area, because WebKit can report 0 on the iPhone Duo);
   everywhere else they are unset and these are the plain env() insets */
--ios-t: max(env(safe-area-inset-top, 0px), var(--nat-t, 0px));
--ios-r: max(env(safe-area-inset-right, 0px), var(--nat-r, 0px));
--ios-b: max(env(safe-area-inset-bottom, 0px), var(--nat-b, 0px));
--ios-l: max(env(safe-area-inset-left, 0px), var(--nat-l, 0px));
--safe-t: var(--ios-t);
--safe-b: var(--ios-b);
--safe-l: var(--ios-l);
--safe-r: var(--ios-r);
```

The game area keeps clear of the notch, the Dynamic Island, the iPhone Duo's side status bar and the home bar. Inside it the
insets are 0, so the game's own panels are not pushed in twice:

```css
html.ios .game-host { top: var(--ios-t); right: var(--ios-r); bottom: var(--ios-b); left: var(--ios-l);
  --safe-t: 0px; --safe-r: 0px; --safe-b: 0px; --safe-l: 0px; }
html.ios .overlay { padding: max(16px, var(--ios-t)) max(16px, var(--ios-r)) max(16px, var(--ios-b)) max(16px, var(--ios-l)); }
html.ios .overlay > .sheet { max-width: calc(100vw - max(16px, var(--ios-l)) - max(16px, var(--ios-r))); }
html.ios .overlay > .sheet.wide { max-height: calc(100dvh - max(16px, var(--ios-t)) - max(16px, var(--ios-b))); }
```

The numbers come from `SproutViewController.sendInsets()` (on every change) and `SproutView.insets()` (asked once the page has
loaded and after each resize). `js/native.js` turns them into `--nat-t/r/b/l` and fires a `resize` event, because the game area
changed size without the window changing.

## The game area changed size, but no resize event came

Lay the running game out again when its area really changes. Without this, touches land on the old layout:

```js
// the size of the game area the running game last laid itself out for
let laidOut = '';
const hostKey = () => { const r = $('game-host').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); };
// (set laidOut = hostKey() when a game starts and after every resize the game handles)

if (window.ResizeObserver) {
  let rz = 0;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => {
    if (!running?.inst) return; const k = hostKey();
    if (k === laidOut || /^0x|x0$/.test(k)) return;
    laidOut = k; running.inst.resize?.();
  }, 60); }).observe($('game-host'));
}
```

## Sharp canvases

```js
dpr: () => Math.min(window.devicePixelRatio || 1, SPG.native && SPG.native.ios ? 2 : 1.5),
```

Size each canvas from its own bounding rect times `dpr()`. Never make big spare canvases: WebKit has a limit on total canvas memory,
and a canvas it cannot make silently draws nothing.

## Local media files in the app

Capacitor's iOS file server answers media files with a status of 0, with the file in the body:

```js
const fileOk = res => res.ok || (res.status === 0 && res.type !== 'opaque' && res.type !== 'error');
```

## Sound with the silent switch on, and recording

The full code is in `reference/js/native.js`, at the end:

```js
if (ios) {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* older iOS */ }
  const wake = () => { if (SPG.audio && SPG.audio.ctx && SPG.audio.ctx.state !== 'running') SPG.audio.unlock(); };
  addEventListener('spgaudioresume', wake);                 // sent by the app after a call, Siri or an alarm
  // WebKit refuses the microphone while the page's audio session is "playback"
  N.recording = on => {
    try { if (navigator.audioSession) navigator.audioSession.type = on ? 'play-and-record' : 'playback'; } catch (_) {}
    if (!on) setTimeout(wake, 250);
  };
  const App = plugins().App;
  if (App && App.addListener) App.addListener('resume', () => setTimeout(wake, 300));
}
```

The recorder switches the session around the recording, and it waits for WebKit to really start:

```js
async function startRecording() {
  const nat = (SPG.native && SPG.native.recording) || (() => {});
  nat(true);
  let stream = null, mime = '', rec = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  } catch (e) { if (stream) stream.getTracks().forEach(t => t.stop()); nat(false); throw e; }
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise(res => { rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); nat(false); res(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })); }; });
  // WebKit starts a recorder a moment later: wait for it (at most 1.5 s on a busy phone), so the first words are not lost
  const started = new Promise(r => { rec.onstart = r; });
  rec.start();
  await Promise.race([started, new Promise(r => setTimeout(r, 1500))]);
  return { stop: () => { if (rec.state !== 'inactive') rec.stop(); return done; }, cancel: () => { chunks.length = 0; if (rec.state !== 'inactive') rec.stop(); } };
}
```

## Pictures in IndexedDB

See `reference/js/photos.js`. Records are indexed by `[player, game]`. Counting uses `index.count`, and tidying uses
`index.getAllKeys`, so neither reads a picture. A save resolves as soon as it is written. The upgrade from version 1 adds the index
and fills in the missing field once.

## Native features only behind the bridge

Every native call goes through `SPG.native` (`reference/js/native.js`). On the website the same helpers fall back to the browser
(a download instead of the share sheet, WebAuthn instead of Face ID), so the game code never checks the platform itself:

- `saveFile`
- `saveToGallery`
- `photos.status` / `photos.request`
- `deviceAuth`
- `recording`
- `insets`
- `apiBase`
