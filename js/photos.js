// Photos a child takes in the games (the camera button in Sprout Kitchen). They are kept on this device for each player in
// IndexedDB ('spg-photos'), newest first, at most MAX each (the oldest go first). They are not part of the cloud backup.
// If a grown-up allows it (Grown-ups > Kitchen photos, settings.photoSave), each new photo is also saved to the device's own photos
// (SPG.native.saveToGallery: the phone's gallery in the Android app, a download on the website).
// Version 2 adds an index by player and game ('pg'), so saving, counting and tidying never read the pictures themselves (reading
// every picture after each new photo got slower and slower as an album filled up, most of all on a big iPad). Version 1 photos had
// no `game` (they were all kitchen photos): the upgrade writes it in once.
(() => {
  const SPG = window.SPG, MAX = 60;
  let dbp = null;
  const open = () => dbp || (dbp = new Promise(res => {
    try {
      const rq = indexedDB.open('spg-photos', 2);
      rq.onupgradeneeded = e => {
        const db = rq.result, old = e.oldVersion || 0;
        const st = old < 1 ? db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true }) : rq.transaction.objectStore('photos');
        if (old < 1) st.createIndex('pid', 'pid');
        if (old < 2) {
          st.createIndex('pg', ['pid', 'game']);
          if (old >= 1) { const c = st.openCursor(); c.onsuccess = () => { const k = c.result; if (!k) return; if (!k.value.game) k.update(Object.assign({}, k.value, { game: 'kitchen' })); k.continue(); }; }
        }
      };
      // another page (an older copy of the game in a second tab) asking for a newer version gets this one closed, so it is never stuck
      rq.onsuccess = () => { const db = rq.result; db.onversionchange = () => { db.close(); dbp = null; }; dbp = Promise.resolve(db); res(db); };
      rq.onerror = rq.onblocked = () => res(null);
    } catch (_) { res(null); }
  }));
  const tx = async (mode, fn) => {
    const db = await open(); if (!db) return null;
    return new Promise(res => { try { const t = db.transaction('photos', mode), rq = fn(t.objectStore('photos')); t.oncomplete = () => res(rq ? rq.result : true); t.onerror = t.onabort = () => res(null); } catch (_) { res(null); } });
  };
  // the ids of one game's pictures (all players), read from the index alone
  const idsOf = async game => {
    const db = await open(); if (!db) return [];
    return new Promise(res => { const out = []; try { const t = db.transaction('photos'), c = t.objectStore('photos').index('pg').openKeyCursor(); c.onsuccess = () => { const k = c.result; if (!k) return; if (k.key[1] === game) out.push(k.primaryKey); k.continue(); }; t.oncomplete = () => res(out); t.onerror = t.onabort = () => res([]); } catch (_) { res([]); } });
  };
  const P = SPG.photos = {
    // [{ id, pid, t, blob, recipe, name, game }] for one player, newest first. `game` keeps the games' albums apart: 'kitchen' (the default) or 'clay'.
    async list(pid, game = 'kitchen') { return ((await tx('readonly', st => st.index('pg').getAll([pid, game]))) || []).sort((a, b) => b.t - a.t); },
    // how many pictures one player has in one game's album (no picture is read)
    async size(pid, game = 'kitchen') { return (await tx('readonly', st => st.index('pg').count([pid, game]))) || 0; },
    // keeps a photo; it counts as kept as soon as it is written (the oldest past MAX are cleared away afterwards)
    async add(pid, blob, meta = {}) {
      const game = meta.game || 'kitchen', id = await tx('readwrite', st => st.add(Object.assign({ pid, t: Date.now(), blob }, meta, { game })));
      if (id != null) P.prune(pid, game);
      if (SPG.store.settings.photoSave && SPG.native && SPG.native.saveToGallery) SPG.native.saveToGallery(blob, 'sprout-park-' + new Date().toISOString().slice(0, 19).replace(/\D/g, '') + '.jpg').catch(() => {});
      return id;
    },
    // the newest MAX of one player's album stay; ids grow with time, so the smallest are the oldest
    async prune(pid, game = 'kitchen') {
      const ids = ((await tx('readonly', st => st.index('pg').getAllKeys([pid, game]))) || []).sort((a, b) => a - b);
      if (ids.length > MAX) await tx('readwrite', st => { for (const id of ids.slice(0, ids.length - MAX)) st.delete(id); return null; });
    },
    remove(id) { return tx('readwrite', st => st.delete(id)); },
    // how many pictures one game's album holds on this device (all players), or every picture when no game is given
    async count(game) { if (!game) return (await tx('readonly', st => st.count())) || 0; return (await idsOf(game)).length; },
    // delete one game's pictures (all players), or everything when no game is given
    async clear(game) { if (!game) return tx('readwrite', st => st.clear()); const ids = await idsOf(game); await tx('readwrite', st => { for (const id of ids) st.delete(id); return null; }); return true; }
  };
})();
