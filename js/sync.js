// Backups for grown-ups: an optional encrypted cloud copy (Cloudflare, see worker/index.js) and backup files.
//
// How the cloud copy works, in plain words:
// - A grown-up turns it on and gets a "family code" (20 letters and numbers). No account or password is required.
// - From the code the app makes (1) a lookup id and (2) an encryption key. Normally only the lookup id and encrypted
//   data are sent, so the server does not read names, progress or drawings. If a grown-up opts into email recovery,
//   the code is sent to their verified inbox but is not stored with the backup.
// - "Sync now" downloads the cloud copy, merges it with this device (newer wins per player, nothing a child
//   finished is lost), then uploads the result. It also happens quietly in the background after changes.
// - On a new device, enter the same code to get everything back.
(() => {
  const SPG = window.SPG, store = SPG.store;
  const KEY = 'spg.sync';
  const API = ((SPG.native && SPG.native.apiBase) || '') + '/api/backup';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I, L, O or U: easy to read out and write down

  /* ------------------------------------------------------------ this device's settings for the cloud copy */
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  const keep = patch => { const s = Object.assign(load(), patch); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* ignore */ } return s; };

  /* ------------------------------------------------------------ code and keys */
  const normalize = text => String(text || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '');
  const pretty = code => code.match(/.{1,5}/g).join('-');
  const validCode = code => code.length === 20 && [...code].every(ch => ALPHABET.includes(ch));
  const makeCode = () => { const b = crypto.getRandomValues(new Uint8Array(20)); return [...b].map(v => ALPHABET[v & 31]).join(''); };
  const hex = bytes => [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = str => Uint8Array.from(atob(str), ch => ch.charCodeAt(0));

  async function deriveKeys(code) {
    const base = await crypto.subtle.importKey('raw', enc.encode('spg1:' + code), 'PBKDF2', false, ['deriveBits']);
    // 768 bits: the first 512 are exactly what they always were (lookup id + encryption key), the last 256 key the scrambled voice file names
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('little-sprout-park/backup/v1'), iterations: 120000 }, base, 768));
    return {
      id: hex(bits.slice(0, 32)), key: await crypto.subtle.importKey('raw', bits.slice(32, 64), 'AES-GCM', false, ['encrypt', 'decrypt']),
      mac: await crypto.subtle.importKey('raw', bits.slice(64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    };
  }
  async function squash(bytes) {
    if (typeof CompressionStream === 'undefined') return { flag: 0, bytes };
    try { return { flag: 1, bytes: new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()) }; } catch (_) { return { flag: 0, bytes }; }
  }
  async function unsquash(bytes) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); }
  async function seal(key, text) {
    const { flag, bytes } = await squash(enc.encode(text)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
    const out = new Uint8Array(1 + 12 + ct.length); out[0] = flag; out.set(iv, 1); out.set(ct, 13);
    return b64(out);
  }
  async function open(key, blob) {
    const raw = unb64(blob), plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(1, 13) }, key, raw.slice(13)));
    return dec.decode(raw[0] === 1 ? await unsquash(plain) : plain);
  }

  /* ------------------------------------------------------------ talking to the server */
  async function api(method, id, body) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      return await fetch(API, { method, headers: Object.assign({ 'X-Family': id }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: ctl.signal });
    } finally { clearTimeout(timer); }
  }
  async function recovery(path, body) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const response = await fetch(API.replace('/backup', '/recovery/' + path), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), cache: 'no-store', signal: ctl.signal
      });
      const result = await response.json();
      return response.ok ? result : fail(result.error || 'failed');
    } catch (e) { return problem(e); }
    finally { clearTimeout(timer); }
  }
  /* ------------------------------------------------------------ recorded voices (one encrypted file per line) */
  // Each recording is sealed with the family key and stored under a scrambled name, so the server learns nothing about whose
  // voice it is or what it says. Each file carries a small header (which voice, which line, when) and then the audio.
  const NO_VOICES = { sent: 0, got: 0 };
  const hashName = async (mac, name) => hex(new Uint8Array(await crypto.subtle.sign('HMAC', mac, enc.encode(name))));
  async function sealBytes(key, header, audio) {
    const head = enc.encode(JSON.stringify(header)), body = new Uint8Array(4 + head.length + audio.length);
    new DataView(body.buffer).setUint32(0, head.length); body.set(head, 4); body.set(audio, 4 + head.length);
    const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, body));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
  }
  async function openBytes(key, raw) {
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12)));
    const n = new DataView(plain.buffer).getUint32(0);
    return { header: JSON.parse(dec.decode(plain.slice(4, 4 + n))), audio: plain.slice(4 + n) };
  }
  async function vapi(method, id, k, body, stamp) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
    try {
      const headers = { 'X-Family': id }; if (stamp != null) headers['X-Stamp'] = String(stamp); if (body) headers['Content-Type'] = 'application/octet-stream';
      return await fetch(API.replace('/backup', '/voice') + (k ? '?k=' + k : ''), { method, headers, body, cache: 'no-store', signal: ctl.signal });
    } finally { clearTimeout(timer); }
  }
  const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const it = items[i++]; await fn(it); } })); };
  const sameList = (a, b) => JSON.stringify([a.voices.map(v => [v.id, v.name]).sort(), [...a.removed].sort()]) === JSON.stringify([b.voices.map(v => [v.id, v.name]).sort(), [...b.removed].sort()]);

  // Make this device and the cloud copy agree about the recorded voices: send what is newer here, fetch what is newer there.
  // Nothing is ever replaced by an older recording, and a failure here never stops the rest of the backup.
  async function runVoices(id, key, mac) {
    const V = SPG.voice; if (!V || !V.syncList) return NO_VOICES;
    await V.ready;
    const res = { sent: 0, got: 0 };
    const listed = await vapi('GET', id); if (!listed.ok) return res;
    const remote = new Map((await listed.json()).items.map(i => [i.k, i]));
    // 1. the named voices (Mom, Grandpa...)
    const lk = await hashName(mac, 'meta:voices'); let theirs = null;
    if (remote.has(lk)) {
      const got = await vapi('GET', id, lk);
      if (got.ok) { try { theirs = (await openBytes(key, new Uint8Array(await got.arrayBuffer()))).header; if (await V.adoptVoiceList(theirs)) res.got++; } catch (_) { /* unreadable: leave it */ } }
    }
    const mine = V.voiceList();
    if (!theirs || !sameList(mine, theirs)) { const r = await vapi('PUT', id, lk, await sealBytes(key, mine, new Uint8Array(0)), Date.now()); if (r.status === 204) res.sent++; }
    // 2. the recordings
    const local = await V.syncList(), byHash = new Map();
    for (const c of local) byHash.set(await hashName(mac, 'clip:' + c.set + '/' + c.key), c);
    const removed = new Set(((V.voiceList() || {}).removed) || []);
    const up = [], down = [];
    for (const [h, c] of byHash) { const r = remote.get(h); if (!r || c.stamp > r.s) up.push([h, c]); }
    for (const [h, r] of remote) { if (h === lk) continue; const c = byHash.get(h); if (!c || r.s > c.stamp) down.push([h, r]); }
    await pool(up, 3, async ([h, c]) => {
      try {
        const blob = await V.syncBlob(c.set, c.key); if (!blob) return;
        const bytes = await sealBytes(key, { set: c.set, key: c.key, stamp: c.stamp, mime: blob.type || 'audio/webm' }, new Uint8Array(await blob.arrayBuffer()));
        const r = await vapi('PUT', id, h, bytes, c.stamp); if (r.status === 204) res.sent++;
      } catch (_) { /* try again next time */ }
    });
    await pool(down, 3, async ([h, r]) => {
      try {
        const g = await vapi('GET', id, h); if (!g.ok) return;
        const { header, audio } = await openBytes(key, new Uint8Array(await g.arrayBuffer()));
        if (!header || removed.has(header.set) || !(header.stamp > V.stampOf(header.set, header.key))) return;
        if (!['male', 'female'].includes(header.set) && !(SPG.store.settings.voices || []).some(v => v.id === header.set)) return;   // a voice nobody here has (yet)
        if (await V.importClip(header.set, header.key, new Blob([audio], { type: header.mime || 'audio/webm' }), header.stamp)) res.got++;
      } catch (_) { /* try again next time */ }
    });
    if (res.got) tellVoices();
    return res;
  }
  const tellVoices = () => { try { SPG.voice && SPG.voice.syncSets && SPG.voice.syncSets(); document.dispatchEvent(new CustomEvent('spg-voices')); } catch (_) { /* ignore */ } };

  const fail = (code, extra) => Object.assign({ ok: false, error: code }, extra);
  const problem = e => (e && e.name === 'AbortError') || !navigator.onLine || e instanceof TypeError ? fail('offline') : fail('failed');

  let busy = null, pushTimer = 0, voiceTimer = 0, lastRev = -1;
  const status = { syncing: false, error: null };
  const listeners = new Set();
  const tell = () => listeners.forEach(fn => fn(sync.info()));

  // Download, merge, upload. Repeats if another device saved in between.
  // undo: keep a copy to undo first (when a grown-up joins a family code; never for the quiet background sync)
  function run(undo = false) {
    if (busy) return busy;
    busy = (async () => {
      const st = load(); if (!st.code) return fail('nocode');
      status.syncing = true; tell();
      try {
        const { id, key, mac } = await deriveKeys(st.code);
        for (let attempt = 0; attempt < 4; attempt++) {
          const got = await api('GET', id);
          let rev = 0, added = 0;
          if (got.status === 200) {
            const j = await got.json(); rev = j.rev;
            let remote; try { remote = JSON.parse(await open(key, j.blob)); } catch (_) { return fail('badcode'); }
            added = store.mergeProfiles(remote.profiles, { undo }).added;
          } else if (got.status !== 404) return fail('failed');
          const sealed = await seal(key, JSON.stringify({ v: 1, t: Date.now(), profiles: store.exportProfiles() }));
          const put = await api('PUT', id, { rev, blob: sealed });
          if (put.status === 200) {
            const j = await put.json(); lastRev = store.rev; keep({ rev: j.rev, last: Date.now() }); status.error = null;
            let voices = NO_VOICES; try { voices = await runVoices(id, key, mac); } catch (_) { /* the progress backup is already safe */ }
            return { ok: true, added, voices };
          }
          if (put.status === 409) continue;
          if (put.status === 429) return fail('slow');
          if (put.status === 413) return fail('big');
          return fail('failed');
        }
        return fail('busy');
      } catch (e) { return problem(e); }
      finally { status.syncing = false; }
    })().then(r => { busy = null; status.error = r.ok ? null : r.error; tell(); return r; });
    return busy;
  }

  const sync = SPG.sync = {
    supported: () => !!(window.crypto && crypto.subtle && typeof fetch === 'function'),
    on: () => !!load().code,
    code: () => { const c = load().code; return c ? pretty(c) : ''; },
    info: () => ({ on: !!load().code, last: load().last || 0, syncing: status.syncing, error: status.error }),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    normalize, pretty, validCode,
    emailRecoveryAvailable: () => !!(SPG.native && SPG.native.isApp && SPG.native.apiBase),
    async startEmailRecovery(email) {
      const code = load().code;
      return code ? recovery('start', { code, email }) : fail('nocode');
    },
    async confirmEmailRecovery(verificationCode) {
      const code = load().code;
      return code ? recovery('confirm', { code, verificationCode }) : fail('nocode');
    },

    // Turn the cloud copy on for this family and upload what is here now.
    async create() {
      const code = makeCode();
      keep({ code, rev: 0, last: 0 });
      const r = await run(true);
      if (!r.ok) keep({ code: '', rev: 0 });
      return r.ok ? { ok: true, code: pretty(code) } : r;
    },
    // Connect to an existing family with its code and bring its data here.
    async join(text) {
      const code = normalize(text);
      if (!validCode(code)) return fail('shape');
      try {
        const { id, key } = await deriveKeys(code);
        const got = await api('GET', id);
        if (got.status === 404) return fail('notfound');
        if (got.status !== 200) return fail('failed');
        try { await open(key, (await got.json()).blob); } catch (_) { return fail('badcode'); }
      } catch (e) { return problem(e); }
      keep({ code, rev: 0, last: 0 });
      const r = await run(true);
      if (!r.ok) keep({ code: '' });
      return r;
    },
    syncNow() { return run(); },
    // Called by the voice code when a recording, a name or a voice changes: a little later it is saved to the cloud copy too.
    voicesChanged() { if (load().code) { clearTimeout(voiceTimer); voiceTimer = setTimeout(() => { if (navigator.onLine) run(); }, 6000); } },
    // A single recording was deleted here: take it out of the cloud copy too (best effort).
    async voiceClipGone(set, key) {
      const st = load(); if (!st.code || !navigator.onLine) return;
      try { const { id, mac } = await deriveKeys(st.code); await vapi('DELETE', id, await hashName(mac, 'clip:' + set + '/' + key)); } catch (_) { /* ignore */ }
    },
    // A whole voice was deleted here: its recordings leave the cloud copy and the other devices are told to let it go.
    async voiceRemoved(vid, keys) {
      const st = load(); if (!st.code) return;
      try { if (navigator.onLine) { const { id, mac } = await deriveKeys(st.code); await pool(keys, 4, async k => { await vapi('DELETE', id, await hashName(mac, 'clip:' + vid + '/' + k)); }); } } catch (_) { /* ignore */ }
      sync.voicesChanged();
    },
    // Stop syncing and delete the cloud copy.
    async turnOff() {
      const st = load();
      if (st.code) { try { const { id } = await deriveKeys(st.code); const r = await api('DELETE', id); if (!r.ok && r.status !== 204) return fail('failed'); } catch (e) { return problem(e); } }
      keep({ code: '', rev: 0, last: 0 }); status.error = null; tell();
      return { ok: true };
    },
    // Stop syncing on this device only (the cloud copy stays for the other devices).
    forget() { keep({ code: '', rev: 0, last: 0 }); tell(); },

    /* -------------------------------------------------------- backup files */
    fileText() { return JSON.stringify({ app: 'little-sprout-park', v: 1, saved: Date.now(), profiles: store.exportProfiles() }); },
    fileName() { const d = new Date(); return `little-sprout-park-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`; },
    restoreFileText(text) {
      let j; try { j = JSON.parse(text); } catch (_) { return fail('notbackup'); }
      if (!j || j.app !== 'little-sprout-park' || !Array.isArray(j.profiles)) return fail('notbackup');
      return Object.assign({ ok: true }, store.mergeProfiles(j.profiles));
    }
  };

  // Quiet background saving: a little after the last change, and again when the app is put away.
  if (sync.supported()) {
    const later = ms => { clearTimeout(pushTimer); pushTimer = setTimeout(() => { if (load().code && navigator.onLine && lastRev !== store.rev) run(); }, ms); };
    store.onChange = () => { if (load().code) later(25000); };
    document.addEventListener('visibilitychange', () => { if (document.hidden && load().code && lastRev !== store.rev && navigator.onLine) { store.flush(); run(); } });
    addEventListener('online', () => { if (load().code) later(2000); });
    setTimeout(() => { if (load().code && navigator.onLine) run(); }, 4000); // catch up when the app opens
  }
})();
