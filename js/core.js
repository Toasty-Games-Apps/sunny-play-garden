// Core services: player storage, synthesized sound effects, voice prompts, and safe mode.
(() => {
  const SPG = window.SPG = window.SPG || { games: [] };
  const KEY = 'spg.v1';

  /* ---------------------------------------------------------------- store */
  // Release settings. Set recorder to false to remove every use of the microphone (e.g. for a simpler
  // store review); the games then use only the built-in voice and any audio files added to audio/voice/.
  SPG.version = (window.SPG_APP && window.SPG_APP.version) || '1.0.0';   // the Android build passes the name Play shows
  SPG.config = { recorder: true };

  SPG.store = (() => {
    const fresh = () => ({ v: 1, profiles: [], activeId: null, settings: { night: 'off', nightFrom: 19, nightTo: 7, voice: true, sound: true, music: false, colorMusic: true, timer: 0, pin: '', fruitAge: 'little', playLog: { day: '', sec: 0 }, voicePref: 'mix', praise: 'some', audioHelp: false, muted: [] }, trash: [] });
    let data = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { data = Object.assign(fresh(), JSON.parse(raw)); data.settings = Object.assign(fresh().settings, data.settings); }
    } catch (_) { /* private mode or blocked storage: play on without saving */ }
    let timer = 0, rev = 0;
    const clone = x => JSON.parse(JSON.stringify(x));
    const flush = () => {
      clearTimeout(timer); timer = 0;
      try { localStorage.setItem(KEY, JSON.stringify(data)); store.saveFailed = false; } catch (_) { store.saveFailed = true; } // storage full or blocked
    };
    // Every change stamps the active player, so two devices can tell whose copy is newer.
    const save = () => {
      const a = data.profiles.find(p => p.id === data.activeId); if (a) a.t = Date.now();
      rev++; if (!timer) timer = setTimeout(flush, 350);
      if (store.onChange) store.onChange();
    };
    const commit = () => { rev++; flush(); if (store.onChange) store.onChange(); }; // for merges: keeps the original stamps
    // Device settings only (play time, night mode, PIN...): saved without marking the player as changed, so an idle
    // device never looks "newer" than one where she really played, and the cloud backup is not woken up.
    const saveSettings = () => { if (!timer) timer = setTimeout(flush, 350); };
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

    // Merge two copies of one player (this device and the cloud). The newer copy wins, but nothing a child
    // finished is ever lost: every coloring picture keeps its newest version, and owned pets and hats are unioned.
    const mergeProfile = (l, r) => {
      const rNewer = (r.t || 0) > (l.t || 0);
      const a = clone(rNewer ? r : l), b = rNewer ? l : r;
      a.data = a.data || {};
      a.t = Math.max(l.t || 0, r.t || 0);
      if (a.resetAt && (b.t || 0) <= a.resetAt) return a;   // the other copy is from before a grown-up reset this player: bring nothing back

      const bc = b.data && b.data.color;
      if (bc && bc.pics) {
        const ac = a.data.color = a.data.color || { v: 1, pics: {} }; ac.pics = ac.pics || {};
        for (const [id, pr] of Object.entries(bc.pics)) {
          const mine = ac.pics[id];
          if (!mine || (pr.t || 0) > (mine.t || 0)) ac.pics[id] = Object.assign(clone(pr), { done: !!(pr.done || (mine && mine.done)) });
          else if (pr.done) mine.done = true;
        }
      }
      const bp = b.data && b.data.pets;
      if (bp) {
        const ap = a.data.pets = a.data.pets || { v: 1, owned: {}, hats: {}, active: null };
        for (const k of ['owned', 'hats']) { ap[k] = ap[k] || {}; for (const [id, v] of Object.entries(bp[k] || {})) if (!ap[k][id]) ap[k][id] = clone(v); }
        if (!ap.active && bp.active) ap.active = bp.active;
      }
      return a;
    };
    // Copy `src` into `dst` without replacing objects or arrays that are already there, so a game that is open
    // and holds on to its saved data (this.bag) keeps writing into the real save after a background sync.
    const plain = x => x && typeof x === 'object' && !Array.isArray(x);
    const adopt = (dst, src) => {
      for (const k of Object.keys(dst)) if (!(k in src)) delete dst[k];
      for (const [k, v] of Object.entries(src)) {
        const cur = dst[k];
        if (cur === v || JSON.stringify(cur) === JSON.stringify(v)) continue;
        if (plain(cur) && plain(v)) adopt(cur, v);
        else if (Array.isArray(cur) && Array.isArray(v)) cur.splice(0, cur.length, ...v);
        else dst[k] = v;
      }
    };

    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); // ask the browser to keep it
    const store = {
      save, saveSettings, flush,
      get settings() { return data.settings; },
      get profiles() { return data.profiles; },
      get active() { return data.profiles.find(p => p.id === data.activeId) || null; },
      setActive(id) { data.activeId = id; saveSettings(); },
      // extra: { gender: 'girl' | 'boy' | '', level: { mode: 'group', group } | { mode: 'age', age } } (both optional, both editable later in Grown-ups)
      addProfile(name, avatar, extra = {}) {
        const p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name.trim().slice(0, 16), avatar, stars: 0, data: {} };
        if (extra.gender === 'girl' || extra.gender === 'boy') p.gender = extra.gender;
        if (extra.level) p.level = extra.level;
        data.profiles.push(p); data.activeId = p.id; save();
        return p;
      },
      // Safety nets: removing or resetting a player keeps a copy for a grown-up to bring back.
      get trash() { return data.trash || []; },
      trashAdd(p, why) { data.trash = [{ p: clone(p), why, t: Date.now() }, ...(data.trash || [])].slice(0, 8); },
      restoreTrash(i) {
        const item = (data.trash || [])[i]; if (!item) return null;
        const p = clone(item.p); p.t = Date.now();   // the brought-back copy is the newest, so a sync keeps it
        const clash = data.profiles.findIndex(q => q.id === p.id);
        if (clash >= 0) data.profiles[clash] = p; else data.profiles.push(p);
        data.trash.splice(i, 1); if (!data.activeId) data.activeId = p.id;
        commit(); return p;
      },
      resetProfile(id) {
        const p = data.profiles.find(q => q.id === id); if (!p) return;
        store.trashAdd(p, 'reset'); p.stars = 0; p.data = {}; p.t = p.resetAt = Date.now(); save();
      },
      saveFailed: false, onChange: null,
      get rev() { return rev; },
      exportProfiles() { return clone(data.profiles); },
      // Bring in players from a backup (file or cloud). Returns how many were new. A grown-up's restore keeps an
      // undo copy first; the quiet background sync does not (it would overwrite the copy from the last real restore).
      mergeProfiles(remote, { undo = true } = {}) {
        if (undo) store.snapshot();
        let added = 0;
        for (const r of remote || []) {
          if (!r || !r.id) continue;
          const i = data.profiles.findIndex(p => p.id === r.id);
          if (i < 0) { data.profiles.push(clone(r)); added++; } else adopt(data.profiles[i], mergeProfile(data.profiles[i], r));
        }
        if (!data.activeId && data.profiles[0]) data.activeId = data.profiles[0].id;
        commit(); return { added, total: data.profiles.length };
      },
      // A copy of everything as it was just before a restore, so a restore can be undone.
      snapshot() { try { localStorage.setItem(KEY + '.undo', JSON.stringify({ t: Date.now(), data })); } catch (_) { /* no room */ } },
      undoInfo() { try { const r = JSON.parse(localStorage.getItem(KEY + '.undo')); return r && r.t ? { t: r.t, players: (r.data.profiles || []).length } : null; } catch (_) { return null; } },
      undoRestore() {
        try { const r = JSON.parse(localStorage.getItem(KEY + '.undo')); if (!r || !r.data) return false; data = Object.assign(fresh(), r.data); localStorage.removeItem(KEY + '.undo'); commit(); return true; } catch (_) { return false; }
      },
      removeProfile(id) {
        const gone = data.profiles.find(p => p.id === id); if (gone) store.trashAdd(gone, 'removed');
        data.profiles = data.profiles.filter(p => p.id !== id);
        if (data.activeId === id) data.activeId = data.profiles[0]?.id ?? null;
        save();
      },
      addStars(n = 1) {
        const p = store.active; if (!p) return;
        p.stars += n; save();
        SPG.onStars && SPG.onStars(p.stars);
      },
      // A named bucket of saved data for the active player, e.g. bag('garden', () => ({...})).
      bag(name, init) {
        const p = store.active;
        if (!p) return init();
        p.data = p.data || {};
        if (!p.data[name]) p.data[name] = init();
        return p.data[name];
      }
    };
    return store;
  })();

  // Wording for grown-up screens: {her} -> her / him / them, {their} -> her / his / their, from the player's boy or girl choice
  // (no choice = neutral). Text read by the child never uses pronouns for the child.
  SPG.pron = {
    of(p) { p = p || SPG.store.active || SPG.store.profiles[0]; const g = p && p.gender; return g === 'girl' ? { her: 'her', their: 'her', child: 'girl' } : g === 'boy' ? { her: 'him', their: 'his', child: 'boy' } : { her: 'them', their: 'their', child: 'child' }; },
    fill(text, p) { const o = SPG.pron.of(p); return String(text).replace(/\{(her|their|child)\}/g, (_, k) => o[k]); }
  };

  /* ---------------------------------------------------------------- audio */
  const A = SPG.audio = {
    ctx: null, master: null,
    unlock() {
      if (!A.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        A.ctx = new C();
        A.master = A.ctx.createGain();
        A.master.gain.value = SPG.night && SPG.night.on() ? .6 : .85;
        A.master.connect(A.ctx.destination);
      }
      if (A.ctx.state !== 'running') { const p = A.ctx.resume(); p && p.catch && p.catch(() => {}); }   // 'suspended', or iOS 'interrupted' after a call
    }
  };

  let outBus = null;   // while the background music is playing its notes, they go through their own volume (so they can fade in and out)
  function tone(freq, dur, { type = 'sine', vol = .22, slide = 0, at = 0 } = {}) {
    const c = A.ctx;
    if (!c || !SPG.store.settings.sound) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .015);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(outBus || A.master);
    o.start(t); o.stop(t + dur + .05);
  }

  let noiseBuf = null;
  function noise(dur, { freq = 1500, q = .8, vol = .18, at = 0, sweep = 0 } = {}) {
    const c = A.ctx;
    if (!c || !SPG.store.settings.sound) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * sweep), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(outBus || A.master);
    s.start(t); s.stop(t + dur + .05);
  }

  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5]; // C major pentatonic-ish
  // Night mode: 'off', 'on', or 'auto' (dark between two hours the grown-ups choose, 7 pm to 7 am by default). The whole app is toned down:
  // a dim navy veil over everything, a night-sky backdrop, night scenery in every game and quieter sound.
  SPG.night = {
    mode() { const m = SPG.store.settings.night; return m === 'on' || m === 'auto' ? m : 'off'; },
    on() { const m = SPG.night.mode(); if (m === 'on') return true; if (m === 'auto') { const h = new Date().getHours(), a = SPG.night.from(), b = SPG.night.to(); return a === b ? false : a > b ? (h >= a || h < b) : (h >= a && h < b); } return false; },
    from() { const v = SPG.store.settings.nightFrom; return Number.isInteger(v) && v >= 0 && v < 24 ? v : 19; },
    to() { const v = SPG.store.settings.nightTo; return Number.isInteger(v) && v >= 0 && v < 24 ? v : 7; },
    apply() {
      const on = SPG.night.on();
      document.body.classList.toggle('night', on);
      if (A.master) A.master.gain.value = on ? .6 : .85;
    },
    set(m) { SPG.store.settings.night = m; SPG.store.saveSettings(); SPG.night.apply(); }
  };

  SPG.sfx = {
    tap() { tone(700, .07, { type: 'triangle', vol: .16 }); },
    pop() { tone(380, .13, { slide: 2.4, type: 'sine', vol: .22 }); },
    whoosh() { noise(.16, { freq: 700, sweep: 4, q: .6, vol: .1 }); },
    splash() { noise(.22, { freq: 1400, sweep: .35, q: .7, vol: .2 }); tone(520, .14, { slide: 1.8, vol: .12 }); },
    note(i = 0, vol = .18) { tone(NOTES[i % NOTES.length], .3, { type: 'sine', vol }); tone(NOTES[i % NOTES.length] * 2, .2, { type: 'sine', vol: vol * .3 }); },
    plink(i = 0) { tone(880 + (i % 5) * 110, .22, { type: 'sine', vol: .18 }); tone(1760 + (i % 5) * 220, .12, { vol: .06 }); },
    chime() { [0, 2, 4, 5].forEach((n, k) => tone(NOTES[n], .35, { at: k * .09, vol: .18 })); },
    win() { [0, 2, 3, 5, 7].forEach((n, k) => tone(NOTES[n], .4, { at: k * .1, vol: .17 })); tone(NOTES[0] / 2, .6, { at: 0, type: 'triangle', vol: .1 }); },
    grow() { [0, 1, 2, 3].forEach((n, k) => tone(NOTES[n] * .75, .2, { at: k * .07, vol: .13, type: 'triangle' })); },
    boing() { tone(220, .32, { slide: 2.6, type: 'triangle', vol: .22 }); },
    oops() { tone(300, .22, { slide: .7, type: 'triangle', vol: .13 }); },
    water() { for (let i = 0; i < 5; i++) noise(.16, { freq: 2600 + i * 200, q: 2, vol: .06, at: i * .07 }); },
    // Very quiet signature sound for each garden friend. Returns how long it lasts (seconds).
    critter(kind, v = 1) {
      const q = .04 * v;
      switch (kind) {
        case 'bee': tone(220, .3, { type: 'sawtooth', vol: q * .5, slide: 1.15 }); tone(226, .3, { type: 'sawtooth', vol: q * .5 }); return .32;
        case 'butterfly': noise(.14, { freq: 3200, q: 1.5, vol: q * .7 }); return .16;
        case 'ladybug': tone(1800, .04, { vol: q * .6 }); tone(2100, .04, { vol: q * .6, at: .07 }); return .14;
        case 'bunny': tone(300, .09, { slide: 1.8, vol: q }); return .12;
        case 'bird': tone(2200, .07, { slide: 1.15, vol: q }); tone(2600, .08, { slide: .9, vol: q, at: .09 }); tone(2300, .06, { vol: q * .8, at: .2 }); return .3;
        case 'snail': tone(500, .16, { slide: .6, type: 'triangle', vol: q * .8 }); return .18;
        case 'hedgehog': noise(.18, { freq: 900, q: .8, vol: q * .9 }); return .2;
        case 'frog': tone(140, .1, { type: 'triangle', vol: q }); tone(170, .12, { type: 'triangle', vol: q, at: .13 }); return .28;
        case 'duckling': tone(700, .07, { slide: .6, type: 'square', vol: q * .35 }); tone(650, .07, { slide: .6, type: 'square', vol: q * .35, at: .1 }); return .2;
        case 'mouse': tone(2400, .05, { slide: 1.3, vol: q * .7 }); tone(2800, .05, { slide: 1.2, vol: q * .7, at: .07 }); return .14;
        case 'turtle': tone(110, .14, { vol: q }); return .16;
        case 'dragonfly': noise(.1, { freq: 5000, sweep: .5, q: 1.2, vol: q * .6 }); return .12;
        case 'cat': tone(600, .22, { slide: 1.5, type: 'triangle', vol: q }); tone(900, .2, { slide: .6, type: 'triangle', vol: q * .8, at: .2 }); return .42;
        case 'dino': tone(130, .35, { slide: .5, type: 'sawtooth', vol: q * .7 }); tone(95, .4, { slide: .6, type: 'triangle', vol: q, at: .05 }); noise(.3, { freq: 350, sweep: .5, q: .6, vol: q * .5 }); return .4;
        case 'dog': tone(300, .07, { slide: .7, type: 'triangle', vol: q }); tone(320, .07, { slide: .7, type: 'triangle', vol: q, at: .12 }); return .2;
      }
      return 0;
    },
    // Storm: a soft, low rumble and a tiny crackle (never loud)
    thunder() { noise(1.6, { freq: 150, sweep: .4, q: .5, vol: .1 }); tone(62, 1.3, { slide: .6, vol: .1 }); tone(48, 1.5, { slide: .7, vol: .07, at: .15 }); },
    zap() { noise(.14, { freq: 3200, sweep: .5, q: 1, vol: .05 }); tone(900, .12, { slide: .4, type: 'triangle', vol: .04 }); },
    // Coloring Book
    fill(i = 0) { tone(280 + (i % 7) * 34, .2, { slide: 1.9, vol: .2 }); noise(.14, { freq: 1300, sweep: .45, q: .7, vol: .07 }); },
    brush() { noise(.09, { freq: 2200 + Math.random() * 900, q: 1.1, vol: .03 }); },
    snip() { noise(.045, { freq: 5600 + Math.random() * 600, q: 2.2, vol: .07 }); noise(.03, { freq: 8200, q: 3, vol: .045, at: .03 }); tone(1900, .03, { type: 'triangle', slide: .7, vol: .02, at: .01 }); },
    erase() { noise(.08, { freq: 800 + Math.random() * 300, q: .7, vol: .035 }); },
    undo() { tone(540, .09, { slide: .6, vol: .13 }); tone(400, .11, { slide: .6, vol: .11, at: .07 }); },
    cheer() { [0, 2, 4, 5, 7, 5, 7].forEach((n, k) => tone(NOTES[n], .34, { at: k * .1, vol: .17 })); [5, 6, 7].forEach((n, k) => tone(NOTES[n] * 2, .3, { at: .55 + k * .09, vol: .07 })); tone(NOTES[0] / 2, .9, { type: 'triangle', vol: .1 }); },
    crunch() { noise(.07, { freq: 1900, q: 1.3, vol: .17 }); noise(.06, { freq: 950, q: 1, vol: .1, at: .06 }); tone(190, .06, { type: 'triangle', vol: .06 }); },
    pat() { tone(110, .2, { slide: .55, type: 'sine', vol: .34 }); noise(.14, { freq: 500, vol: .12 }); },
    squeak() { tone(1100, .09, { slide: 1.5, vol: .08 }); },
    // Band instruments: i picks a note of the scale (all of them sound good together).
    instrument(kind, i = 0, vol = .2) {
      const f = NOTES[i % NOTES.length];
      switch (kind) {
        case 'drum': noise(.14, { freq: 200, q: .5, vol: vol * 1.1 }); tone(150 + (i % 4) * 14, .2, { slide: .5, vol }); break;
        case 'xylo': tone(f, .55, { type: 'triangle', vol }); tone(f * 3, .14, { vol: vol * .25 }); break;
        case 'bell': tone(f * 2, .9, { vol: vol * .8 }); tone(f * 3.01, .6, { vol: vol * .3 }); tone(f * 4.2, .3, { vol: vol * .12 }); break;
        case 'flute': tone(f, .55, { vol: vol * .85, slide: 1.01 }); tone(f * 2, .4, { vol: vol * .12 }); break;
        case 'horn': tone(f / 2, .5, { type: 'triangle', vol }); tone(f, .4, { type: 'square', vol: vol * .1 }); break;
        default: tone(f, .8, { vol }); tone(f * 2, .4, { vol: vol * .25 }); tone(f * 3, .2, { vol: vol * .08 });
      }
    },
    toot() { tone(392, .32, { type: 'triangle', vol: .2 }); tone(494, .32, { type: 'triangle', vol: .16 }); tone(392, .4, { type: 'triangle', vol: .2, at: .36 }); },
    chug() { noise(.09, { freq: 320, q: .6, vol: .14 }); },
    snap() { tone(640, .05, { type: 'triangle', vol: .2 }); tone(960, .07, { type: 'triangle', vol: .12, at: .04 }); },
    rustle() { noise(.22, { freq: 3000, q: .8, vol: .1 }); noise(.2, { freq: 2200, q: .8, vol: .07, at: .1 }); },
    // warmth 0..1: a rising little chirp says "getting warmer" without any words
    warm(k = 0) { tone(300 + k * 700, .2, { type: 'triangle', vol: .13 }); if (k > .6) tone(300 + k * 1000, .18, { vol: .08, at: .12 }); },
    bubble() { tone(520 + Math.random() * 500, .1, { slide: 1.8, vol: .07 }); },
    lullaby() { [4, 2, 0].forEach((n, k) => tone(NOTES[n] * .75, .6, { at: k * .5, vol: .09 })); },
    // Sprout Kitchen
    // A real kitchen-timer / oven bell: one hammer strike on a small bell (a bright tick, then inharmonic partials that ring and fade).
    // ding(2) strikes it twice, like an oven timer.
    ding(n = 1) {
      for (let k = 0; k < n; k++) {
        const at = k * .62, f = 1568;
        noise(.03, { freq: 6500, q: 1.2, vol: .07, at });
        tone(f, 1.6, { type: 'sine', vol: .17, at }); tone(f * 2.756, .9, { type: 'sine', vol: .08, at }); tone(f * 5.404, .45, { type: 'sine', vol: .035, at }); tone(f * 1.003, 1.4, { type: 'sine', vol: .05, at });
      }
    },
    sizzle() { noise(.5, { freq: 5200, q: .4, vol: .05 }); noise(.4, { freq: 3000, q: .6, vol: .03, at: .1 }); },
    squish() { noise(.1, { freq: 420, q: 1.3, vol: .07 }); },
    // Sauce bottles: soft and wet, never beepy. squirt() is one gentle squelch (a dollop); squeeze() is a quiet continuous
    // squeeze for as long as a finger drags. Returns { set(level 0..1), off() }.
    squirt() { noise(.16, { freq: 520, sweep: .55, q: .35, vol: .05 }); noise(.1, { freq: 260, q: .4, vol: .035, at: .03 }); },
    squeeze() {
      const c = A.ctx; if (!c || !SPG.store.settings.sound) return { set() {}, off() {} };
      if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const t = c.currentTime, s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = .55; s.loopStart = Math.random() * .4;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .5;
      const g = c.createGain(); g.gain.setValueAtTime(.0001, t);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = .01; lfo.connect(lg); lg.connect(g.gain);
      s.connect(lp); lp.connect(g); g.connect(A.master); s.start(t); lfo.start(t);
      let off = false;
      return {
        set(level) { if (!off) { g.gain.setTargetAtTime(.012 + .028 * level, c.currentTime, .08); lp.frequency.setTargetAtTime(380 + 420 * level, c.currentTime, .1); } },
        off() { if (off) return; off = true; const n = c.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(.0001, n, .06); s.stop(n + .4); lfo.stop(n + .4); }
      };
    },
    // a cookie cutter pressed through dough: a soft thump and a tiny metal tick
    cut() { tone(150, .12, { type: 'sine', vol: .13, slide: .6 }); noise(.04, { freq: 2600, q: 2, vol: .045 }); noise(.08, { freq: 500, q: .6, vol: .04, at: .02 }); },
    crack() { noise(.04, { freq: 3200, q: 1.6, vol: .12 }); noise(.07, { freq: 1700, q: 1, vol: .08, at: .045 }); tone(240, .06, { type: 'triangle', vol: .05 }); },
    // a spoonful of grains falling (salt, pepper, sprinkles)
    shake() { for (let i = 0; i < 4; i++) noise(.05, { freq: 4200 + i * 500, q: 1.5, vol: .025, at: i * .05 }); },
    roll() { noise(.08, { freq: 260, q: .8, vol: .05 }); },
    munch() { noise(.06, { freq: 1500, q: 1.2, vol: .13 }); noise(.05, { freq: 900, q: 1, vol: .1, at: .08 }); },
    // Fire Rescue's hose: one soft, steady stream of water for as long as she holds her finger down (not a series of bursts).
    // A gentle rush (filtered noise, no whistle) over a low watery body with a slow flow in it. Returns { set(0..1), off() }.
    hose() {
      const c = A.ctx; if (!c || !SPG.store.settings.sound) return { set() {}, off() {} };
      if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const t = c.currentTime, f = (type, hz, q) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = hz; n.Q.value = q; return n; };
      const mk = (rate, hz1, type1, hz2, gain) => {
        const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate; s.loopStart = Math.random() * .5;
        const a = f(type1, hz1, .4), b = f('lowpass', hz2, .4), g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(gain, t + .18);
        s.connect(a); a.connect(b); b.connect(g); g.connect(A.master); s.start(t); return { s, g, gain };
      };
      const rush = mk(.92, 500, 'highpass', 3300, .05), body = mk(.6, 120, 'highpass', 750, .045);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.2; lg.gain.value = .012; lfo.connect(lg); lg.connect(rush.g.gain); lfo.start(t);
      let off = false;
      return {
        set(level) { if (!off) for (const v of [rush, body]) v.g.gain.setTargetAtTime(v.gain * (.6 + .6 * level), c.currentTime, .1); },
        off() { if (off) return; off = true; const n = c.currentTime; for (const v of [rush, body]) { v.g.gain.cancelScheduledValues(n); v.g.gain.setTargetAtTime(.0001, n, .07); v.s.stop(n + .5); } lfo.stop(n + .5); }
      };
    },
    // A flame going out: a soft puff of steam and a small low "whump", nothing sharp.
    puff() {
      noise(.55, { freq: 2200, q: .35, vol: .06, sweep: .45 }); noise(.4, { freq: 700, q: .4, vol: .05 });
      tone(150, .3, { slide: .55, type: 'sine', vol: .09 }); tone(660, .2, { slide: 1.25, type: 'sine', vol: .03, at: .05 });
    },
    spray() { noise(.32, { freq: 5200, q: .5, vol: .07 }); noise(.28, { freq: 3400, q: .7, vol: .05, at: .02 }); },
    // A steady, gentle purr that gets louder the more she strokes. Returns { set(level 0..1), off() }.
    // Synthesized: a soft noise band switched on and off about 25 times a second, with a low hum under it.
    // (Recorded purrs, if a grown-up adds them as "purr/<animal>" sounds, are played instead by the game.)
    purr(kind = 'cat') {
      const c = A.ctx;
      if (!c || !SPG.store.settings.sound) return { set() {}, off() {} };
      const P = { cat: { rate: 25, f: 230, q: .8, v: .16, hum: 55 }, dog: { rate: 9, f: 160, q: .7, v: .14, hum: 70 }, bunny: { rate: 38, f: 950, q: 1.4, v: .07, hum: 0 }, bear: { rate: 16, f: 140, q: .6, v: .17, hum: 50 }, fox: { rate: 21, f: 340, q: 1, v: .13, hum: 60 }, panda: { rate: 13, f: 190, q: .7, v: .15, hum: 52 }, frog: { rate: 11, f: 280, q: 2, v: .09, hum: 80 }, trex: { rate: 6, f: 95, q: .6, v: .2, hum: 38 }, trike: { rate: 8, f: 110, q: .6, v: .18, hum: 42 }, stego: { rate: 7, f: 105, q: .6, v: .18, hum: 40 }, bronto: { rate: 5, f: 85, q: .5, v: .18, hum: 34 }, babydino: { rate: 15, f: 240, q: .8, v: .14, hum: 70 } }[kind] || { rate: 25, f: 230, q: .8, v: .15, hum: 55 };
      const buf = c.createBuffer(1, c.sampleRate, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = P.f; bp.Q.value = P.q;
      const am = c.createGain(); am.gain.value = .5;
      const lfo = c.createOscillator(); lfo.frequency.value = P.rate; const lg = c.createGain(); lg.gain.value = .5; lfo.connect(lg); lg.connect(am.gain);
      const out = c.createGain(); out.gain.value = 0;
      src.connect(bp); bp.connect(am); am.connect(out); out.connect(A.master);
      const hum = c.createOscillator(); hum.type = 'sine'; hum.frequency.value = P.hum || 60; const hg = c.createGain(); hg.gain.value = 0; hum.connect(hg); hg.connect(out);
      src.start(); lfo.start(); hum.start();
      let dead = false;
      return {
        set(level) { if (dead) return; const t = c.currentTime; out.gain.setTargetAtTime(level * P.v, t, .12); hg.gain.setTargetAtTime(P.hum ? level * .6 : 0, t, .2); },
        off() { if (dead) return; dead = true; out.gain.setTargetAtTime(0, c.currentTime, .12); setTimeout(() => { try { src.stop(); lfo.stop(); hum.stop(); } catch (_) { /* already stopped */ } }, 700); }
      };
    }
  };

  // Soft, slow, generative background music. The main loop is off until a grown-up turns it on; the
  // Coloring Book has its own gentler music-box loop that is on by default (and has its own switch).
  const CHORDS = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
  const BOX = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  let musicTimer = 0, musicKey = '', beat = 0, mel = 2, scene = null, theme = null;
  const musicStep = () => {
    if (!A.ctx || document.hidden) return;
    const ch = CHORDS[Math.floor(beat / 4) % CHORDS.length];
    const n = ch[beat % 3] * (beat % 8 === 5 ? 2 : 1);
    tone(n, 2.2, { type: 'sine', vol: .035 });
    if (beat % 4 === 0) tone(ch[0] / 2, 3.4, { type: 'triangle', vol: .03 });
    beat++;
  };
  const boxStep = () => {
    if (!A.ctx || document.hidden) return;
    const ch = CHORDS[Math.floor(beat / 8) % CHORDS.length];
    if (beat % 8 === 0) ch.forEach((f, i) => tone(f, 4.2, { type: 'sine', vol: .022, at: i * .06 }));
    if (beat % 8 === 0) tone(ch[0] / 2, 4.6, { type: 'triangle', vol: .026 });
    if (Math.random() > .22) {                       // a wandering music-box tune, with the odd rest
      mel = Math.max(0, Math.min(BOX.length - 1, mel + [-1, -1, 0, 1, 1, 2, -2][Math.floor(Math.random() * 7)]));
      tone(BOX[mel], 1.6, { type: 'sine', vol: .04 }); tone(BOX[mel] * 2, .7, { type: 'sine', vol: .011 });
    }
    beat++;
  };

  // Themed music for the Coloring Book. Instrumental only (simple synth voices), and always quiet.
  // Each theme is a short written loop: a melody per bar (0 = rest), a bass note and a chord per bar.
  const THEMES = {
    // Kids' spooky: a tiptoeing waltz in D minor, plucked strings and a little xylophone.
    halloween: {
      ms: 330, per: 6,
      bass: [73.42, 110, 73.42, 98, 73.42, 110, 98, 110], chords: [[293.66, 349.23, 440], [277.18, 329.63, 440], [293.66, 349.23, 440], [293.66, 392, 466.16], [293.66, 349.23, 440], [277.18, 329.63, 440], [293.66, 392, 466.16], [277.18, 329.63, 440]],
      melody: [[440, 0, 349.23, 0, 293.66, 0], [554.37, 0, 440, 0, 329.63, 0], [349.23, 392, 440, 466.16, 440, 392], [440, 0, 0, 0, 0, 0], [587.33, 0, 466.16, 0, 349.23, 0], [554.37, 0, 440, 0, 329.63, 0], [349.23, 392, 440, 466.16, 554.37, 466.16], [440, 0, 0, 0, 0, 0]],
      play(bar, i, m, ch, bass, n) {
        if (i === 0) tone(bass, .55, { type: 'triangle', vol: .05 });
        if (i === 2 || i === 4) ch.forEach(f => tone(f, .17, { type: 'triangle', vol: .017 }));
        if (m) { tone(m, .24, { type: 'triangle', vol: .05 }); tone(m * 2, .1, { type: 'sine', vol: .012 }); }
        if (i === 4 && bar % 4 === 3) tone(1174.66, .35, { type: 'sine', vol: .022 });          // xylophone tinkle at the end of a phrase
        if (i === 5 && bar % 8 === 7 && n % 2) noise(.16, { freq: 5200, sweep: .35, q: 1, vol: .016 }); // a tiny bat flutter
      }
    },
    // Relaxed old-school children's tune: warm woodwind melody over a gentle walking bass and brushes.
    thanksgiving: {
      ms: 430, per: 8,
      bass: [98, 82.41, 130.81, 146.83, 98, 130.81, 146.83, 98], chords: [[196, 246.94, 293.66], [164.81, 196, 246.94], [261.63, 329.63, 392], [293.66, 369.99, 440], [196, 246.94, 293.66], [261.63, 329.63, 392], [293.66, 369.99, 440], [196, 246.94, 293.66]],
      melody: [[392, 0, 493.88, 0, 587.33, 0, 493.88, 0], [659.25, 0, 587.33, 0, 493.88, 0, 392, 0], [523.25, 0, 659.25, 0, 523.25, 0, 440, 0], [440, 0, 493.88, 0, 587.33, 0, 0, 0], [392, 440, 493.88, 587.33, 493.88, 0, 392, 0], [523.25, 0, 587.33, 659.25, 523.25, 0, 392, 0], [587.33, 0, 493.88, 0, 440, 0, 493.88, 0], [392, 0, 0, 0, 0, 0, 0, 0]],
      play(bar, i, m, ch, bass) {
        if (i === 0 || i === 4) tone(i === 0 ? bass : bass * 1.5, .5, { type: 'triangle', vol: .055 });
        if (i === 2 || i === 6) { ch.forEach((f, k) => tone(f, .3, { type: 'sine', vol: .016, at: k * .02 })); noise(.06, { freq: 6500, q: .5, vol: .012 }); } // soft strum and brush
        if (m) { tone(m, .55, { type: 'triangle', vol: .04 }); tone(m * 2, .4, { type: 'sine', vol: .009 }); }
      }
    },
    // Dinosaurs: a stompy, jolly march with big low thumps and a bouncy marimba tune.
    dino: {
      ms: 340, per: 8,
      bass: [98, 98, 130.81, 98, 110, 110, 146.83, 98], chords: [[196, 246.94, 293.66], [196, 246.94, 293.66], [261.63, 329.63, 392], [196, 246.94, 293.66], [220, 261.63, 329.63], [220, 261.63, 329.63], [293.66, 369.99, 440], [196, 246.94, 293.66]],
      melody: [[392, 0, 440, 493.88, 0, 392, 0, 0], [523.25, 0, 493.88, 440, 0, 392, 0, 0], [440, 0, 493.88, 523.25, 0, 440, 0, 0], [587.33, 0, 523.25, 493.88, 0, 392, 0, 0], [392, 0, 440, 493.88, 0, 587.33, 0, 0], [523.25, 0, 493.88, 440, 0, 493.88, 0, 0], [440, 523.25, 587.33, 0, 523.25, 440, 0, 0], [392, 0, 0, 0, 392, 0, 0, 0]],
      play(bar, i, m, ch, bass) {
        if (i === 0 || i === 4) { tone(bass / 2, .3, { type: 'sine', vol: .07 }); tone(bass, .4, { type: 'triangle', vol: .05 }); }   // stomp!
        if (i === 2 || i === 6) ch.forEach((f, k) => tone(f, .18, { type: 'triangle', vol: .015, at: k * .015 }));
        if (m) { tone(m, .28, { type: 'triangle', vol: .045 }); tone(m * 2, .12, { type: 'sine', vol: .012 }); }
      }
    },
    // Christmas: sleigh bells, a glockenspiel tune and warm chords in C major.
    christmas: {
      ms: 300, per: 8,
      bass: [130.81, 110, 87.31, 98, 130.81, 110, 87.31, 98], chords: [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]],
      melody: [[659.25, 0, 783.99, 0, 1046.5, 0, 783.99, 0], [880, 0, 783.99, 0, 659.25, 0, 523.25, 0], [698.46, 0, 880, 0, 1046.5, 0, 880, 0], [783.99, 0, 698.46, 0, 587.33, 0, 0, 0], [1046.5, 0, 880, 0, 783.99, 0, 659.25, 0], [659.25, 783.99, 880, 0, 1046.5, 0, 880, 0], [880, 0, 1046.5, 0, 1174.66, 0, 1046.5, 0], [1046.5, 0, 783.99, 0, 523.25, 0, 0, 0]],
      play(bar, i, m, ch, bass) {
        if (i === 0) { ch.forEach((f, k) => tone(f, 2.2, { type: 'sine', vol: .018, at: k * .04 })); tone(bass, .9, { type: 'triangle', vol: .05 }); }
        if (i === 4) tone(bass * 1.5, .5, { type: 'triangle', vol: .035 });
        if (i % 2 === 0) noise(.05, { freq: 7000, q: 2.5, vol: i % 4 === 0 ? .03 : .02 }), noise(.04, { freq: 8200, q: 3, vol: .015, at: .05 }); // sleigh bells
        if (m) { tone(m, 1.1, { type: 'sine', vol: .04 }); tone(m * 3, .3, { type: 'sine', vol: .008 }); }
      }
    }
  };
  let tbar = 0, tstep = 0, tpass = 0;
  const themeStep = th => () => {
    if (!A.ctx || document.hidden) return;
    const bar = tbar % th.melody.length, m = th.melody[bar][tstep];
    th.play(tbar, tstep, m, th.chords[bar], th.bass[bar], tpass);
    if (++tstep >= th.per) { tstep = 0; tbar++; if (tbar % th.melody.length === 0) tpass++; }
  };
  // The rest screen's lullaby: a slow, tiny music-box tune (instrumental, quiet), even if the other music is switched off.
  const LULLABY = [[392, 329.63, 392, 440, 392, 329.63, 261.63, 0], [349.23, 329.63, 293.66, 261.63, 293.66, 329.63, 349.23, 0], [392, 329.63, 392, 440, 392, 329.63, 261.63, 0], [293.66, 329.63, 293.66, 246.94, 261.63, 0, 0, 0]];
  const LULLABY_BASS = [130.81, 174.61, 130.81, 196];
  let restTimer = 0, restStep = 0, resting = false;
  const lullStep = () => {
    if (!A.ctx || document.hidden) return;
    const bar = Math.floor(restStep / 8) % LULLABY.length, i = restStep % 8, m = LULLABY[bar][i];
    if (i === 0) { tone(LULLABY_BASS[bar], 3.2, { type: 'triangle', vol: .035 }); tone(LULLABY_BASS[bar] * 2.5, 3, { vol: .012, at: .05 }); }
    if (m) { tone(m, 1.4, { vol: .042 }); tone(m * 2, .6, { vol: .011 }); }
    restStep++;
  };
  // The background music has its own volume ("bus") so one song can fade out and the next fade in.
  let bus = null;
  // ...and goes through "duckG", which turns it down while a line is being spoken, so instructions are easy to hear over the music
  let duckG = null;
  const musicBus = () => { if (!A.ctx) return null; if (!bus) { duckG = A.ctx.createGain(); duckG.gain.value = 1; duckG.connect(A.master); bus = A.ctx.createGain(); bus.gain.value = 1; bus.connect(duckG); } return bus; };
  const duck = on => { if (!duckG) return; const t = A.ctx.currentTime; duckG.gain.cancelScheduledValues(t); duckG.gain.setTargetAtTime(on ? .3 : 1, t, on ? .06 : .35); };
  const musicWrap = fn => () => { outBus = musicBus(); try { fn(); } finally { outBus = null; } };
  // Shuffle: when the menu music is on it plays the songs from across the games, one after another in a random order, each for
  // three to five minutes, fading out and in so the change is gentle.
  const SONGS = ['box', 'dino', 'thanksgiving', 'main', 'christmas', 'halloween'];
  let shuffleTimer = 0, shuffleQueue = [], shuffleSong = '';
  const songStep = song => (song === 'box' ? [boxStep, 640] : song === 'main' ? [musicStep, 950] : [themeStep(THEMES[song]), THEMES[song].ms]);
  function shuffleNext(first) {
    clearTimeout(shuffleTimer);
    const play = () => {
      if (!shuffleQueue.length) { shuffleQueue = SONGS.slice().sort(() => Math.random() - .5); if (shuffleQueue[0] === shuffleSong) shuffleQueue.push(shuffleQueue.shift()); }
      shuffleSong = shuffleQueue.shift(); tbar = 0; tstep = 0; tpass = 0; beat = 0;
      const [fn, ms] = songStep(shuffleSong), b = musicBus(); clearInterval(musicTimer);
      if (b) { b.gain.cancelScheduledValues(A.ctx.currentTime); b.gain.setValueAtTime(.0001, A.ctx.currentTime); b.gain.linearRampToValueAtTime(1, A.ctx.currentTime + 4); }
      musicTimer = setInterval(musicWrap(fn), ms); musicWrap(fn)();
      shuffleTimer = setTimeout(() => shuffleNext(false), 180000 + Math.random() * 120000);   // 3 to 5 minutes
    };
    const b = musicBus();
    if (first || !b || !musicTimer) { play(); return; }
    b.gain.cancelScheduledValues(A.ctx.currentTime); b.gain.setValueAtTime(Math.max(.0001, b.gain.value), A.ctx.currentTime); b.gain.linearRampToValueAtTime(.0001, A.ctx.currentTime + 4);   // fade out...
    shuffleTimer = setTimeout(play, 4200);                                                                                                          // ...then the next one fades in
  }
  SPG.music = {
    song: () => shuffleSong, skip: () => shuffleNext(false), duck,   // (for tests and for a future skip button)
    rest(on) {
      resting = !!on; clearInterval(restTimer); restTimer = 0; restStep = 0;
      if (resting && SPG.store.settings.sound) { lullStep(); restTimer = setInterval(lullStep, 560); }
      SPG.music.sync();
    },
    sync() {
      const s = SPG.store.settings;
      const key = scene ? scene + ':' + (theme || '') : 'main';
      const want = !resting && !document.hidden && s.sound && (scene === 'color' ? s.colorMusic !== false : s.music);
      if ((musicTimer || shuffleTimer) && (!want || key !== musicKey)) { clearInterval(musicTimer); musicTimer = 0; clearTimeout(shuffleTimer); shuffleTimer = 0; if (bus) { bus.gain.cancelScheduledValues(A.ctx.currentTime); bus.gain.value = 1; } }
      if (want && !musicTimer) {
        musicKey = key;
        if (!scene) { shuffleNext(true); return; }   // the menu music is a shuffled playlist of every song in the games
        const th = scene === 'color' && THEMES[theme];
        musicTimer = setInterval(musicWrap(th ? themeStep(th) : scene === 'color' ? boxStep : musicStep), th ? th.ms : scene === 'color' ? 640 : 950);
        musicWrap(th ? themeStep(th) : scene === 'color' ? boxStep : musicStep)();
      }
    },
    // Switch the music to a scene ('color') with an optional theme ('halloween', 'thanksgiving', 'christmas'), or back to normal (null).
    scene(name, th) { if (name !== scene || (th || null) !== theme) { tbar = 0; tstep = 0; tpass = 0; beat = 0; } scene = name; theme = th || null; SPG.music.sync(); }
  };

  // A small "icon + number" pill next to the stars, for counting things (fruits sliced, drops caught...).
  SPG.ui = {
    // Full-screen game canvases render at up to 1.5x: much cheaper per frame on tablets, still crisp.
    dpr: () => Math.min(window.devicePixelRatio || 1, 1.5),
    // Act the instant a finger touches a button (no need to lift on the exact spot). Keyboard and
    // assistive-technology activation (click with no pointer) still works.
    press(el, fn) {
      el.addEventListener('pointerdown', e => { if (e.button > 0) return; fn(e); });
      el.addEventListener('click', e => { if (e.detail === 0) fn(e); });
      return el;
    },
    // A grid of big name buttons for a child who cannot type. Touching one says the name out loud and selects it.
    // Returns the element; `el.value` is the chosen name ('' if none) and `el.clear()` unselects.
    nameGrid(names, onPick) {
      const el = document.createElement('div'); el.className = 'name-grid'; el.value = '';
      const btns = names.map(name => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'name-btn'; b.textContent = name; b.setAttribute('aria-pressed', 'false'); if (name.length > 11) b.classList.add('xlong'); else if (name.length > 8) b.classList.add('long');
        SPG.ui.press(b, () => { el.pick(name, true); });
        return b;
      });
      el.pick = (name, speak) => {
        el.value = name; btns.forEach(x => x.setAttribute('aria-pressed', String(x.textContent === name)));
        if (speak) { SPG.sfx.pop(); if (SPG.voice) SPG.voice.say(SPG.voice.LINES['name/' + name] ? 'name/' + name : { say: name }); }
        onPick && onPick(name);
      };
      el.clear = () => { el.value = ''; btns.forEach(x => x.setAttribute('aria-pressed', 'false')); };
      el.append(...btns);
      return el;
    },
    counter(host, draw, value = 0) {
      const el = document.createElement('div'); el.className = 'hud-count';
      const cv = document.createElement('canvas'); cv.width = cv.height = 72;
      const num = document.createElement('b'); num.textContent = value;
      el.append(cv, num); host.append(el);
      draw(cv.getContext('2d'), 72);
      return { el, set(n) { num.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } };
    }
  };

  /* ---------------------------------------------------------------- safe mode */
  const standalone = () => (SPG.native && SPG.native.isApp) || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const safe = SPG.safe = {
    on: true,           // keep the child inside the app
    wantFullscreen: false,
    standalone,
    // Safari (iPad) only has the prefixed version; iPhone Safari has none, so it needs "Add to Home Screen".
    canFullscreen: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isFullscreen: () => !!(document.fullscreenElement || document.webkitFullscreenElement),
    needsInstallForFullscreen: () => safe.isIOS && !standalone() && !safe.isFullscreen(),
    async enterFullscreen() {
      safe.wantFullscreen = true;
      const root = document.documentElement;
      if (!safe.canFullscreen || safe.isFullscreen() || standalone()) return;
      try {
        const r = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen();
        if (r && r.then) await r;
      } catch (_) { /* browser refused; play continues */ }
    },
    async exitFullscreen() {
      safe.wantFullscreen = false;
      try {
        if (document.exitFullscreen && document.fullscreenElement) await document.exitFullscreen();
        else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
      } catch (_) { /* ignore */ }
    },
    onBack: null,       // set by the app: called when the child presses back
    onFullscreenLost: null,
    async keepAwake() {
      try {
        if (!navigator.wakeLock || document.hidden || safe._lock) return;   // one lock is enough (this runs on every touch)
        safe._lock = await navigator.wakeLock.request('screen');
        safe._lock.addEventListener('release', () => { safe._lock = null; });
      } catch (_) { /* not supported or denied */ }
    },
    init() {
      // The back button/gesture stays inside the app instead of leaving it.
      history.replaceState({ spg: 0 }, '');
      history.pushState({ spg: 1 }, '');
      addEventListener('popstate', () => {
        history.pushState({ spg: 1 }, '');
        if (safe.onBack) safe.onBack();
      });

      // No long-press menus, text selection, drag ghosts or pinch zoom.
      const block = e => e.preventDefault();
      ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, block));
      // (touch-action: none already stops scrolling and zooming on the games; the browser then marks touches as not cancelable)
      document.addEventListener('touchstart', e => { if (e.cancelable && e.touches.length > 1) e.preventDefault(); }, { passive: false });
      document.addEventListener('touchmove', e => {
        if (e.cancelable && (e.touches.length > 1 || !e.target.closest?.('[data-scroll], #hub-games .pages'))) e.preventDefault();   // the games strip swipes natively
      }, { passive: false });
      document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

      // Any first touch unlocks sound (browsers require a gesture).
      const unlock = () => { A.unlock(); safe.keepAwake(); };
      addEventListener('pointerdown', unlock, { capture: true });
      for (const t of ['pointerup', 'touchend', 'click']) addEventListener(t, unlock, { capture: true }); // iOS wants a finished tap

      const fsChanged = () => { if (!safe.isFullscreen() && safe.wantFullscreen && safe.on && safe.onFullscreenLost) safe.onFullscreenLost(); };
      document.addEventListener('fullscreenchange', fsChanged);
      document.addEventListener('webkitfullscreenchange', fsChanged);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) SPG.voice.stop(); else safe.keepAwake();
        SPG.music.sync();
      });
    }
  };
})();
