// Little Sprout Park cloud backup: a tiny Cloudflare Worker plus one Durable Object per family.
//
// What it stores: one encrypted blob per family. The app encrypts everything on the device with a key made
// from the family code. During normal backup it sees only ciphertext and a hash-like id. Optional grown-up
// email recovery processes the code in memory to send it to a verified inbox, without reading backup contents.
//
// Routes (all under /api, same origin as the app):
//   GET    /api/backup   -> 200 { rev, updated, blob } | 404
//   PUT    /api/backup   { rev, blob }  -> 200 { rev, updated } | 409 { rev } (someone saved in between) | 413 | 429
//   DELETE /api/backup   -> 204
//   GET    /api/health   -> 200 "ok"
//   GET    /api/voice            -> 200 { items: [{ k, s, n }] }   the recorded voices, one encrypted file per line
//   GET    /api/voice?k=<64 hex> -> 200 the encrypted bytes | 404
//   PUT    /api/voice?k=<64 hex> (X-Stamp: when it was recorded) -> 204 | 413 | 429
//   DELETE /api/voice?k=<64 hex> -> 204    DELETE /api/voice (no k) -> 204, removes every voice file
//   POST   /api/recovery/start   { code, email } -> sends a one-time inbox verification code
//   POST   /api/recovery/confirm { code, verificationCode } -> sends the family code to the verified inbox
// Voice files are encrypted on the device like the backup, and the names they are stored under are scrambled (a keyed
// hash), so the server cannot tell whose voice it is or which line it says.
// The website and the Android app (origin https://localhost) may both call these routes.
// Every backup request carries `X-Family: <64 hex chars>`.
import { DurableObject } from 'cloudflare:workers';
import { deriveFamilyId, handleRecovery } from './recovery.js';

const MAX_BLOB = 2_400_000;          // characters of ciphertext (about 1.8 MB), far more than a family will ever use
const CHUNK = 400_000;               // stored in pieces so no single row gets too big
const KEEP_DAYS = 400;               // a backup nobody has touched for this long is deleted
const MAX_CLIP = 400_000;            // bytes per encrypted voice file (a spoken line is about 15-40 KB)
const MAX_VOICE_TOTAL = 80_000_000;  // bytes of voice files per family
const MAX_VOICE_COUNT = 6000;        // files per family
const APP_ORIGINS = new Set(['https://localhost']);   // the Android app (Capacitor serves the game from here)
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export class Backups extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.sql = state.storage.sql;
    this.tables();
  }
  // (deleteAll() removes the tables too, so they are made again whenever they are needed)
  tables() {
    this.sql.exec('CREATE TABLE IF NOT EXISTS chunks (i INTEGER PRIMARY KEY, b TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS voice (k TEXT PRIMARY KEY, s INTEGER NOT NULL, n INTEGER NOT NULL, b BLOB NOT NULL)');
  }
  // ---- voice files (this object is the family's "voice:<id>" one, separate from its backup)
  // Every sync lists the voices, so a family that still uses its backup keeps its recordings (the alarm deletes them KEEP_DAYS after the last use).
  async vlist() {
    this.tables();
    const items = this.sql.exec('SELECT k, s, n FROM voice ORDER BY k').toArray();
    if (items.length && Date.now() - Number(this.meta('updated') || 0) > 864e5) await this.vtouch();
    return items;
  }
  async vtouch() { const now = Date.now(); this.setMeta('updated', now); await this.ctx.storage.setAlarm(now + KEEP_DAYS * 864e5); }
  vget(k) { this.tables(); const r = this.sql.exec('SELECT b FROM voice WHERE k = ?', k).toArray(); return r.length ? r[0].b : null; }
  async vput(k, bytes, stamp) {
    this.tables();
    const hour = Math.floor(Date.now() / 3.6e6), n = this.meta('vhour') === String(hour) ? Number(this.meta('vhits') || 0) : 0;
    if (n >= 3000) return { limited: true };
    this.setMeta('vhour', hour); this.setMeta('vhits', n + 1);
    const old = this.sql.exec('SELECT n FROM voice WHERE k = ?', k).toArray(), tot = this.sql.exec('SELECT COALESCE(SUM(n), 0) AS t, COUNT(*) AS c FROM voice').toArray()[0];
    if (tot.t - (old.length ? old[0].n : 0) + bytes.byteLength > MAX_VOICE_TOTAL || (!old.length && tot.c >= MAX_VOICE_COUNT)) return { full: true };
    this.sql.exec('INSERT OR REPLACE INTO voice (k, s, n, b) VALUES (?, ?, ?, ?)', k, stamp, bytes.byteLength, bytes);
    await this.vtouch();   // without 'updated' the alarm would delete every recording
    return { ok: true };
  }
  vdel(k) { this.tables(); this.sql.exec('DELETE FROM voice WHERE k = ?', k); }
  async vclear() { await this.ctx.storage.deleteAlarm(); await this.ctx.storage.deleteAll(); }
  meta(k) { const r = this.sql.exec('SELECT v FROM meta WHERE k = ?', k).toArray(); return r.length ? r[0].v : null; }
  setMeta(k, v) { this.sql.exec('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', k, String(v)); }
  hasBackup() { this.tables(); return Number(this.meta('rev') || 0) > 0; }
  clearRecoveryPending() {
    this.sql.exec("DELETE FROM meta WHERE k IN ('recEmail', 'recEmailHash', 'recDigest', 'recSalt', 'recExpiry', 'recAttempts', 'recConfirming')");
  }
  async restoreBackupAlarm() {
    const updated = Number(this.meta('updated') || 0);
    if (updated) await this.ctx.storage.setAlarm(updated + KEEP_DAYS * 864e5);
  }
  async startRecovery(email, emailHash, digest, salt) {
    this.tables();
    const bound = this.meta('recBound');
    if (bound && bound !== emailHash) return 'linked';
    const now = Date.now(), hour = Math.floor(now / 3.6e6);
    const count = Number(this.meta('recHour') || 0) === hour ? Number(this.meta('recCount') || 0) : 0;
    if (count >= 5 || now - Number(this.meta('recLastStart') || 0) < 60_000) return 'slow';
    this.setMeta('recHour', hour); this.setMeta('recCount', count + 1); this.setMeta('recLastStart', now);
    this.setMeta('recEmail', email); this.setMeta('recEmailHash', emailHash);
    this.setMeta('recDigest', digest); this.setMeta('recSalt', salt);
    this.setMeta('recExpiry', now + 10 * 60_000); this.setMeta('recAttempts', 0);
    this.sql.exec("DELETE FROM meta WHERE k = 'recConfirming'");
    await this.ctx.storage.setAlarm(now + 10 * 60_000 + 1000);
    return 'ok';
  }
  async cancelRecoveryStart() { this.tables(); this.clearRecoveryPending(); await this.restoreBackupAlarm(); }
  async confirmRecovery(otp) {
    this.tables();
    const now = Date.now();
    if (!this.meta('recEmail') || now > Number(this.meta('recExpiry') || 0)) {
      this.clearRecoveryPending(); await this.restoreBackupAlarm(); return { error: 'verification expired' };
    }
    if (Number(this.meta('recAttempts') || 0) >= 5) return { error: 'too many attempts' };
    if (now - Number(this.meta('recConfirming') || 0) < 60_000) return { error: 'slow down' };
    this.setMeta('recConfirming', now);
    const raw = new TextEncoder().encode(this.meta('recSalt') + ':' + otp);
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(b => b.toString(16).padStart(2, '0')).join('');
    const expected = this.meta('recDigest') || '';
    let equal = digest.length === expected.length;
    for (let i = 0; i < digest.length && i < expected.length; i++) equal = (digest.charCodeAt(i) === expected.charCodeAt(i)) && equal;
    if (!equal) {
      const n = Number(this.meta('recAttempts') || 0) + 1;
      this.setMeta('recAttempts', n);
      this.sql.exec("DELETE FROM meta WHERE k = 'recConfirming'");
      return { error: n >= 5 ? 'too many attempts' : 'wrong verification code' };
    }
    return { email: this.meta('recEmail') };
  }
  async finishRecovery(sent) {
    this.tables();
    if (sent) { this.setMeta('recBound', this.meta('recEmailHash')); this.clearRecoveryPending(); await this.restoreBackupAlarm(); }
    else this.sql.exec("DELETE FROM meta WHERE k = 'recConfirming'");
  }

  async get() {
    this.tables();
    const rev = Number(this.meta('rev') || 0);
    if (!rev) return null;
    const blob = this.sql.exec('SELECT b FROM chunks ORDER BY i').toArray().map(r => r.b).join('');
    return { rev, updated: Number(this.meta('updated') || 0), blob };
  }
  async put(expected, blob) {
    this.tables();
    const rev = Number(this.meta('rev') || 0);
    if (expected !== rev) return { conflict: true, rev };
    // at most 200 saves an hour per family
    const hour = Math.floor(Date.now() / 3.6e6);
    const n = this.meta('hour') === String(hour) ? Number(this.meta('hits') || 0) : 0;
    if (n >= 200) return { limited: true };
    this.setMeta('hour', hour); this.setMeta('hits', n + 1);
    this.sql.exec('DELETE FROM chunks');
    for (let i = 0, k = 0; i < blob.length; i += CHUNK, k++) this.sql.exec('INSERT INTO chunks (i, b) VALUES (?, ?)', k, blob.slice(i, i + CHUNK));
    const updated = Date.now();
    this.setMeta('rev', rev + 1); this.setMeta('updated', updated);
    const pending = Number(this.meta('recExpiry') || 0);
    await this.ctx.storage.setAlarm(pending > updated ? Math.min(pending + 1000, updated + KEEP_DAYS * 864e5) : updated + KEEP_DAYS * 864e5);
    return { rev: rev + 1, updated };
  }
  async remove() { await this.ctx.storage.deleteAlarm(); await this.ctx.storage.deleteAll(); }
  async alarm() {
    this.tables();
    const now = Date.now(), updated = Number(this.meta('updated') || 0), pending = Number(this.meta('recExpiry') || 0);
    if (pending && now >= pending) this.clearRecoveryPending();
    if (updated && now < updated + KEEP_DAYS * 864e5) { await this.ctx.storage.setAlarm(updated + KEEP_DAYS * 864e5); return; }
    await this.ctx.storage.deleteAll();
  }
  // A tiny counter used to slow down anyone creating backups in bulk (per network address).
  async hit(max, seconds) {
    this.tables();
    const now = Date.now(), start = Number(this.meta('start') || 0);
    if (!start || now - start > seconds * 1000) { this.setMeta('start', now); this.setMeta('n', 1); await this.ctx.storage.setAlarm(now + seconds * 1000 + 1000); return true; }
    const n = Number(this.meta('n') || 0) + 1; this.setMeta('n', n);
    return n <= max;
  }
  async deriveFamilyId(code) { return deriveFamilyId(code); }
}

const corsFor = origin => origin && APP_ORIGINS.has(origin) ? {
  'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'X-Family, X-Stamp, Content-Type', 'Access-Control-Max-Age': '86400'
} : null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    // The website talks to its own address; the Android app is the one other caller that is allowed.
    const origin = request.headers.get('Origin');
    const cors = corsFor(origin);
    let sameHost = false; try { sameHost = !!origin && new URL(origin).host === url.host; } catch (_) { /* 'null' or junk */ }
    if (origin && !cors && !sameHost) return json({ error: 'forbidden' }, 403);
    if (request.method === 'OPTIONS') return cors ? new Response(null, { status: 204, headers: cors }) : new Response(null, { status: 204 });
    const res = await route(request, env, url);
    if (!cors) return res;
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  }
};

async function route(request, env, url) {
    if (url.pathname === '/api/health') return new Response('ok', { headers: { 'Cache-Control': 'no-store' } });
    if (url.pathname === '/api/recovery/start' || url.pathname === '/api/recovery/confirm') return handleRecovery(request, env, url.pathname);
    if (url.pathname !== '/api/backup' && url.pathname !== '/api/voice') return json({ error: 'not found' }, 404);

    const id = request.headers.get('X-Family') || '';
    if (!/^[a-f0-9]{64}$/.test(id)) return json({ error: 'bad id' }, 400);

    if (url.pathname === '/api/voice') {
      const vs = env.BACKUPS.get(env.BACKUPS.idFromName('voice:' + id)), k = url.searchParams.get('k');
      if (k !== null && !/^[a-f0-9]{64}$/.test(k)) return json({ error: 'bad key' }, 400);
      if (request.method === 'GET' && k === null) return json({ items: await vs.vlist() });
      if (request.method === 'GET') {
        const b = await vs.vget(k);
        return b ? new Response(b, { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' } }) : json({ error: 'none' }, 404);
      }
      if (request.method === 'DELETE') { if (k === null) await vs.vclear(); else await vs.vdel(k); return new Response(null, { status: 204 }); }
      if (request.method === 'PUT' && k !== null) {
        const len = Number(request.headers.get('Content-Length') || 0);
        if (len > MAX_CLIP) return json({ error: 'too big' }, 413);
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength > MAX_CLIP || bytes.byteLength < 29) return json({ error: 'too big' }, 413);
        const stamp = Math.floor(Number(request.headers.get('X-Stamp') || 0));
        if (!Number.isFinite(stamp) || stamp < 0) return json({ error: 'bad stamp' }, 400);
        const r = await vs.vput(k, bytes, stamp);
        if (r.limited) return json({ error: 'slow down' }, 429);
        if (r.full) return json({ error: 'full' }, 413);
        return new Response(null, { status: 204 });
      }
      return json({ error: 'method' }, 405);
    }

    const stub = env.BACKUPS.get(env.BACKUPS.idFromName('fam:' + id));
    if (request.method === 'GET') {
      const got = await stub.get();
      return got ? json(got) : json({ error: 'none' }, 404);
    }
    if (request.method === 'DELETE') { await stub.remove(); await env.BACKUPS.get(env.BACKUPS.idFromName('voice:' + id)).vclear(); return new Response(null, { status: 204 }); }
    if (request.method === 'PUT') {
      const len = Number(request.headers.get('Content-Length') || 0);
      if (len > MAX_BLOB + 1000) return json({ error: 'too big' }, 413);
      let body;
      try { body = JSON.parse(await request.text()); } catch (_) { return json({ error: 'bad json' }, 400); }
      if (!body || !Number.isInteger(body.rev) || body.rev < 0 || typeof body.blob !== 'string') return json({ error: 'bad body' }, 400);
      if (body.blob.length > MAX_BLOB || body.blob.length < 8) return json({ error: 'too big' }, 413);
      if (body.rev === 0) {                                  // creating a new backup: limit bulk creation per address
        const ip = request.headers.get('CF-Connecting-IP') || 'local';
        const ok = await env.BACKUPS.get(env.BACKUPS.idFromName('ip:' + ip)).hit(20, 3600);
        if (!ok) return json({ error: 'slow down' }, 429);
      }
      const res = await stub.put(body.rev, body.blob);
      if (res.conflict) return json({ error: 'conflict', rev: res.rev }, 409);
      if (res.limited) return json({ error: 'slow down' }, 429);
      return json(res);
    }
    return json({ error: 'method' }, 405);
}
