// Sign videos (Grown-ups > Accessibility > Sign videos): a grown-up can record (or choose) a short video of themselves making any sign,
// and that video is shown instead of the drawn hands wherever the sign is used: in the corner card of the signing mode and in Sign Along.
// Videos have no sound, are cropped square, and live only on this device (IndexedDB `spg-signvideo`, one entry per sign id:
// { id, blob, dur, t }); they are not part of the cloud backup. The Signer (js/sign.js) asks `clip(id)` while it lays out a sequence and
// `draw(...)` while it draws one. SPG.config.camera = false removes the camera (choosing a video file still works).
(() => {
  const SPG = window.SPG, store = SPG.store;
  const MAX_REC = 6, MAX_PLAY = 8, SIDE = 360;
  const clips = new Map();   // sign id -> { dur, url, t }
  const els = new Map();     // sign id -> a <video> kept ready (the last few used)
  if (SPG.config.camera == null) SPG.config.camera = true;

  /* ---------------------------------------------------------------- saving */
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('spg-signvideo', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('clips', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = (mode, fn) => db().then(d => new Promise((res, rej) => {
    const t = d.transaction('clips', mode), q = fn(t.objectStore('clips'));
    t.oncomplete = () => res(q && q.result); t.onerror = t.onabort = () => rej(t.error);
  }));
  const ready = (window.indexedDB ? run('readonly', s => s.getAll()) : Promise.resolve([]))
    .then(list => { for (const r of list || []) if (r && r.blob) clips.set(r.id, { dur: r.dur, t: r.t, url: URL.createObjectURL(r.blob) }); })
    .catch(() => {});
  function forget(id) {
    const v = els.get(id); if (v) { v.pause(); v.removeAttribute('src'); v.load(); els.delete(id); }
    const c = clips.get(id); if (c) URL.revokeObjectURL(c.url);
    clips.delete(id);
  }
  async function save(id, blob, dur) {
    dur = Math.max(.6, Math.min(MAX_PLAY, dur || 3));
    const t = Date.now();
    await run('readwrite', s => s.put({ id, blob, dur, t }));
    forget(id); clips.set(id, { dur, t, url: URL.createObjectURL(blob) });
  }
  async function remove(id) { await run('readwrite', s => s.delete(id)); forget(id); }

  /* ---------------------------------------------------------------- playing */
  const use = () => !store.settings.signVideoOff;
  const clip = id => (use() && clips.get(id)) || null;
  function el(id) {
    const c = clips.get(id); if (!c) return null;
    let v = els.get(id);
    if (!v) {
      v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = c.url;
      els.set(id, v);
      if (els.size > 8) { const [k] = els.keys(); if (k !== id) { const o = els.get(k); o.pause(); o.removeAttribute('src'); o.load(); els.delete(k); } }
    }
    v.seen = performance.now();
    return v;
  }
  // a video that is no longer drawn (the game is paused, the card has gone) stops playing
  setInterval(() => { const now = performance.now(); for (const v of els.values()) if (!v.paused && now - (v.seen || 0) > 400) v.pause(); }, 300);
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  // a sign's video in a box (the whole picture shows), u seconds into it; it plays while `live`, otherwise it holds still
  function draw(c, id, x, y, w, h, u, live) {
    const v = el(id); if (!v) return false;
    const want = Math.max(0, Math.min(u, clips.get(id).dur - .05));
    if (live) {
      if (Math.abs(v.currentTime - want) > .35 && v.readyState >= 1) { try { v.currentTime = want; } catch (e) { /* not seekable yet */ } }
      if (v.paused) v.play().catch(() => {});
    } else if (!v.paused) v.pause();
    const s = Math.min(w, h) * .96, bx = x + (w - s) / 2, by = y + (h - s) / 2;
    c.save(); rr(c, bx, by, s, s, s * .12); c.fillStyle = 'rgba(90,63,94,.1)'; c.fill(); c.clip();
    if (v.readyState >= 2 && v.videoWidth) {
      const k = Math.max(s / v.videoWidth, s / v.videoHeight), dw = v.videoWidth * k, dh = v.videoHeight * k;
      c.drawImage(v, bx + (s - dw) / 2, by + (s - dh) / 2, dw, dh);
    }
    c.restore();
    return true;
  }

  /* ---------------------------------------------------------------- the grown-ups screen */
  const h = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === false || v == null) continue;
      if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    }
    e.append(...kids.flat().filter(k => k != null));
    return e;
  };
  const GLABEL = { every: 'Everyday', animals: 'Animals', food: 'Food', things: 'Things', colors: 'Colours', numbers: 'Numbers', feelings: 'Feelings', shapes: 'Shapes', letters: 'Letters' };
  function groups() {
    const out = (SPG.signGroups || []).map(g => ({ id: g.id, label: GLABEL[g.id] || g.id, words: g.words }));
    const games = [...new Set(Object.values(SPG.signs.GLOSS).join(' ').split(' ').filter(id => id && SPG.sign.SIGNS[id]))].sort();
    out.push({ id: 'games', label: 'Said in the games', words: games });
    out.push({ id: 'all', label: 'Every sign', words: Object.keys(SPG.sign.SIGNS).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) });
    return out;
  }
  const nameOf = id => (SPG.signNameOf ? SPG.signNameOf(id) : id);
  // what the screen is doing: picking a word, the camera (counting down, recording), or looking at a new video before keeping it
  let ui = null;
  const fresh = () => ({ grp: 'every', sel: null, mode: 'idle', msg: '', stream: null, rec: null, take: null, raf: 0, hands: null, ask: false });
  function stopCamera() {
    if (!ui) return;
    if (ui.rec && ui.rec.state !== 'inactive') { ui.rec.onstop = null; try { ui.rec.stop(); } catch (e) { /* already stopped */ } }
    ui.rec = null; if (ui.cleanup) { ui.cleanup(); ui.cleanup = null; }
    if (ui.stream) for (const tr of ui.stream.getTracks()) tr.stop();
    ui.stream = null; clearInterval(ui.tick); ui.tick = 0;
  }
  function dropTake() { if (ui && ui.take) { URL.revokeObjectURL(ui.take.url); ui.take = null; } }
  function close() { if (!ui) return; stopCamera(); dropTake(); cancelAnimationFrame(ui.raf); ui.raf = 0; ui = null; }
  const canCamera = () => SPG.config.camera && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof MediaRecorder !== 'undefined';
  function mime() {
    for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
    return '';
  }

  // the drawn hands for the chosen word, signing it over and over (they never show a video, so the two can be compared)
  function loop(body) {
    if (!ui) return;
    ui.raf = requestAnimationFrame(() => loop(body));
    const cv = body.querySelector('.sv-hands'); if (!cv || !ui.sel) return;
    if (!ui.hands) ui.hands = new SPG.sign.Signer({ skin: store.settings.signSkin || 'medium', noVideo: true });
    const H = ui.hands;
    if (H.id !== ui.sel) { H.id = ui.sel; H.play([ui.sel]); H.restAt = 0; }
    if (!H.busy) { if (!H.restAt) H.restAt = performance.now(); else if (performance.now() - H.restAt > 900) { H.play([ui.sel]); H.restAt = 0; } }
    H.update(1 / 60);
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!r.width) return;
    const W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr); if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height);
    H.draw(c, 0, 0, r.width, r.height, { dt: 1 / 60 });
  }

  function render(body) {
    if (!ui) { ui = fresh(); loop(body); }
    const scroller = body.closest('[data-scroll]'), top = scroller ? scroller.scrollTop : 0;
    const redraw = () => render(body);
    const G = groups(), g = G.find(x => x.id === ui.grp) || G[0];
    body.textContent = '';
    const useSw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(use()), 'aria-label': 'Use the sign videos' });
    useSw.addEventListener('click', () => { store.settings.signVideoOff = use(); store.saveSettings(); useSw.setAttribute('aria-checked', String(use())); });
    body.append(
      h('p', { class: 'lead' }, 'Record yourself making a sign, and your video is shown instead of the drawn hands wherever that sign is used: in the signing corner card and in Sign Along. Choose a word, look at the drawn hands, then tap Record (or choose a video you already have).'),
      h('div', { class: 'setting' }, h('span', {}, 'Use the sign videos'), useSw),
      h('p', { class: 'fine' }, `${clips.size} sign${clips.size === 1 ? '' : 's'} with a video. Videos have no sound, stay on this device and are not part of the cloud backup. Your child sees you the way they would if you sat facing them.`));
    const tabs = h('div', { class: 'seg sv-tabs', role: 'group', 'aria-label': 'Groups of signs' });
    for (const x of G) {
      const n = x.words.filter(w => clips.has(w)).length;
      const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(x === g) }, x.label + (n ? ` (${n})` : ''));
      b.addEventListener('click', () => { if (ui.mode !== 'idle') return; ui.grp = x.id; redraw(); });
      tabs.append(b);
    }
    const grid = h('div', { class: 'sv-words' });
    for (const id of g.words) {
      const b = h('button', { type: 'button', class: 'sv-word' + (clips.has(id) ? ' has' : '') + (ui.sel === id ? ' on' : ''), 'aria-pressed': String(ui.sel === id) }, nameOf(id));
      b.addEventListener('click', () => { if (ui.mode !== 'idle') return; ui.sel = id; ui.msg = ''; ui.ask = false; redraw(); });
      grid.append(b);
    }
    body.append(tabs);
    if (ui.sel) body.append(panel(redraw));
    body.append(grid);
    if (scroller) scroller.scrollTop = top;
  }

  function panel(redraw) {
    const id = ui.sel, c = clips.get(id);
    const handsBox = h('figure', { class: 'sv-box' }, h('canvas', { class: 'sv-hands', 'aria-label': 'The drawn hands' }), h('figcaption', {}, 'Drawn hands'));
    let right, buttons = h('div', { class: 'sv-btns' });
    const btn = (label, cls, fn, dis) => { const b = h('button', { class: 'btn small ' + cls, type: 'button', disabled: !!dis }, label); b.addEventListener('click', fn); buttons.append(b); return b; };
    if (ui.mode === 'camera' || ui.mode === 'count' || ui.mode === 'rec') {
      const live = h('video', { class: 'sv-video mirror', muted: true, playsinline: true, autoplay: true });
      live.muted = true; if (ui.stream) { live.srcObject = ui.stream; live.play().catch(() => {}); }
      const big = h('div', { class: 'sv-count' }, ui.mode === 'count' ? String(ui.count) : '');
      const bar = h('div', { class: 'sv-bar' }, h('i', {}));
      right = h('figure', { class: 'sv-box live' + (ui.mode === 'rec' ? ' rec' : '') }, live, big, bar, h('figcaption', {}, ui.mode === 'rec' ? 'Recording…' : 'Camera (like a mirror)'));
      ui.view = { big, bar: bar.firstChild };
      if (ui.mode === 'camera') btn('● Start', 'vrec', () => countdown(redraw));
      if (ui.mode === 'rec') btn('■ Stop', 'vrec rec-on', () => finish());
      btn('Cancel', 'quiet', () => { stopCamera(); ui.mode = 'idle'; redraw(); });
    } else if (ui.mode === 'review') {
      const v = h('video', { class: 'sv-video', muted: true, playsinline: true, autoplay: true, loop: true, src: ui.take.url }); v.muted = true;
      right = h('figure', { class: 'sv-box' }, v, h('figcaption', {}, 'Your new video'));
      btn('✓ Keep it', 'go', async () => {
        try { await save(id, ui.take.blob, ui.take.dur); ui.msg = 'Saved. This sign now shows your video.'; } catch (e) { ui.msg = 'Sorry, the video could not be saved on this device.'; }
        dropTake(); ui.mode = 'idle'; redraw();
      });
      if (ui.take.cam) btn('Try again', 'quiet', () => { dropTake(); openCamera(redraw); });
      btn('Cancel', 'quiet', () => { dropTake(); ui.mode = 'idle'; redraw(); });
    } else {
      if (c) {
        const v = h('video', { class: 'sv-video', muted: true, playsinline: true, autoplay: true, loop: true, src: c.url }); v.muted = true;
        right = h('figure', { class: 'sv-box' }, v, h('figcaption', {}, 'Your video'));
      } else right = h('figure', { class: 'sv-box empty' }, h('div', { class: 'sv-none' }, 'No video yet'), h('figcaption', {}, 'Your video'));
      if (canCamera()) btn(c ? '● Record again' : '● Record', 'vrec', () => openCamera(redraw));
      const file = h('input', { type: 'file', accept: 'video/*', class: 'sv-file', 'aria-label': 'Choose a video' });
      file.addEventListener('change', () => { const f = file.files && file.files[0]; if (f) chooseFile(f, redraw); });
      const pick = btn('Choose a video', 'quiet', () => file.click()); pick.after(file);
      if (c) {
        if (!ui.ask) btn('Delete video', 'quiet', () => { ui.ask = true; redraw(); });
        else {
          btn('Yes, delete', 'danger', async () => { ui.ask = false; try { await remove(id); ui.msg = 'Deleted. The drawn hands sign it again.'; } catch (e) { ui.msg = 'Sorry, that did not work.'; } redraw(); });
          btn('Keep it', 'quiet', () => { ui.ask = false; redraw(); });
        }
      }
    }
    return h('div', { class: 'sv-panel' },
      h('h4', {}, nameOf(id)),
      h('div', { class: 'sv-pair' }, handsBox, right),
      ui.msg ? h('p', { class: 'fine sv-msg', role: 'status' }, ui.msg) : null,
      buttons,
      ui.mode === 'idle' ? h('p', { class: 'fine' }, `Sign it once, slowly and clearly, with your hands in front of your chest. A recording stops by itself after ${MAX_REC} seconds; a chosen video plays its first ${MAX_PLAY} seconds.`) : null);
  }

  async function openCamera(redraw) {
    ui.msg = '';
    try {
      ui.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false });
      if (!ui) { return; }
      ui.mode = 'camera';
    } catch (e) {
      ui.msg = 'The camera could not be opened. Allow the camera for this app, or use Choose a video instead.'; ui.mode = 'idle';
    }
    redraw();
  }
  function countdown(redraw) {
    ui.mode = 'count'; ui.count = 3; redraw();
    ui.tick = setInterval(() => {
      if (!ui) return;
      ui.count--;
      if (ui.count > 0) { ui.view.big.textContent = String(ui.count); return; }
      clearInterval(ui.tick); ui.tick = 0; record(redraw);
    }, 800);
  }
  // record a square crop of the camera (through a canvas, so every video is the same size and small)
  function record(redraw) {
    const src = document.createElement('video'); src.muted = true; src.playsInline = true; src.srcObject = ui.stream;
    src.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none'; document.body.append(src); src.play().catch(() => {});
    const cv = document.createElement('canvas'); cv.width = cv.height = SIDE; const c = cv.getContext('2d');
    let out = ui.stream, painter = 0;
    if (cv.captureStream) {
      const paint = () => {
        painter = requestAnimationFrame(paint);
        if (src.videoWidth) { const s = Math.min(src.videoWidth, src.videoHeight); c.drawImage(src, (src.videoWidth - s) / 2, (src.videoHeight - s) / 2, s, s, 0, 0, SIDE, SIDE); }
      };
      paint(); out = cv.captureStream(30);
    }
    ui.cleanup = () => { cancelAnimationFrame(painter); src.remove(); };
    const type = mime(), chunks = [];
    let rec;
    try { rec = new MediaRecorder(out, Object.assign({ videoBitsPerSecond: 700000 }, type ? { mimeType: type } : {})); } catch (e) { rec = new MediaRecorder(out); }
    ui.rec = rec; ui.mode = 'rec'; redraw();
    const t0 = performance.now();
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const dur = (performance.now() - t0) / 1000;
      stopCamera();
      if (!ui) return;
      const blob = new Blob(chunks, { type: rec.mimeType || type || 'video/webm' });
      if (!blob.size || dur < .5) { ui.mode = 'idle'; ui.msg = 'That was too short. Try again.'; redraw(); return; }
      ui.take = { blob, dur: Math.min(MAX_REC, dur), url: URL.createObjectURL(blob), cam: true }; ui.mode = 'review'; redraw();
    };
    rec.start(250);
    ui.tick = setInterval(() => {
      if (!ui) return;
      const u = (performance.now() - t0) / 1000 / MAX_REC;
      if (ui.view && ui.view.bar) ui.view.bar.style.width = Math.min(100, u * 100) + '%';
      if (u >= 1) finish();
    }, 100);
  }
  function finish() { if (ui && ui.rec && ui.rec.state === 'recording') { clearInterval(ui.tick); ui.tick = 0; ui.rec.stop(); } }
  function chooseFile(f, redraw) {
    if (!/^video\//.test(f.type || 'video/')) { ui.msg = 'That is not a video.'; redraw(); return; }
    if (f.size > 40e6) { ui.msg = 'That video is too big. Choose a short clip (a few seconds).'; redraw(); return; }
    const url = URL.createObjectURL(f), v = document.createElement('video'); v.muted = true; v.preload = 'metadata';
    let done = false;
    const go = dur => {
      if (done || !ui) return; done = true;
      if (!dur) { URL.revokeObjectURL(url); ui.msg = 'That video cannot be played here. Try another one.'; redraw(); return; }
      ui.take = { blob: f, dur: Math.min(MAX_PLAY, isFinite(dur) ? dur : 4), url, cam: false }; ui.mode = 'review'; ui.msg = dur > MAX_PLAY && isFinite(dur) ? `Only the first ${MAX_PLAY} seconds will be shown.` : ''; redraw();
    };
    v.onloadedmetadata = () => go(v.duration || 4); v.onerror = () => go(0); setTimeout(() => go(0), 6000);
    v.src = url;
  }

  SPG.signVideo = { ready, clip, has: id => clips.has(id), count: () => clips.size, draw, save, remove, render, close, MAX_REC, MAX_PLAY };
})();
