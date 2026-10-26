// App shell: players, hub, running a game, the parent gate and the grown-ups panel.
(() => {
  'use strict';
  const SPG = window.SPG;
  const { store, voice, safe, art } = SPG;
  const $ = id => document.getElementById(id);
  const t = SPG.t;   // the text in the chosen language (js/i18n.js)
  const screens = { who: $('who'), setup: $('setup'), hub: $('hub'), stage: $('stage') };
  const overlays = { brk: $('break'), gate: $('gate'), parent: $('parent'), studio: $('studio'), signvid: $('signvid'), fs: $('fs-resume'), vintro: $('vintro') };
  let current = 'who';
  let running = null;

  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v);
    }
    el.append(...kids.flat().filter(k => k != null));
    return el;
  };
  const icon = (id, cls = '') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); if (cls) s.setAttribute('class', cls); s.innerHTML = `<use href="#i-${id}"/>`; return s; };

  function avatarCanvas(kind, px = 128) {
    const c = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.height = Math.round(px * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr); ctx.translate(px / 2, px * .6);
    art.avatar(ctx, kind, px * .34);
    return c;
  }

  // The picture behind the menus. She changes it by touching the empty background of the main menu: each touch shows the next one
  // (saved per player, `bag('hubbg')`). The look of each is in styles.css under `.backdrop[data-bg=...]`.
  const BACKDROPS = ['meadow', 'sunset', 'beach', 'snow', 'space', 'autumn', 'candy'];
  const backdropEl = document.querySelector('.backdrop');
  const bgBag = () => (store.active ? store.bag('hubbg', () => ({ i: 0 })) : { i: 0 });
  function applyBackdrop() { backdropEl.dataset.bg = BACKDROPS[((bgBag().i | 0) % BACKDROPS.length + BACKDROPS.length) % BACKDROPS.length]; }
  function nextBackdrop() {
    if (!store.active) return;
    const b = bgBag(); b.i = ((b.i | 0) + 1) % BACKDROPS.length; store.save(); applyBackdrop();
    backdropEl.classList.remove('bg-swap'); void backdropEl.offsetWidth; backdropEl.classList.add('bg-swap');
    SPG.sfx.chime?.();
  }
  function show(name) {
    if (name !== 'stage' && running) stopGame();   // leaving the game screen any way at all (setup from the rest screen...) ends the game
    current = name; document.body.dataset.screen = name; applyBackdrop();
    for (const [id, el] of Object.entries(screens)) el.classList.toggle('hidden', id !== name);
    if (name === 'hub') requestAnimationFrame(drawCards);
  }

  const anyOverlay = () => Object.values(overlays).some(o => !o.classList.contains('hidden'));
  function syncPause() {
    if (!running || !running.inst) return;
    const stop = anyOverlay() || document.hidden;
    if (stop === running.paused) return;
    running.paused = stop;
    running.inst[stop ? 'pause' : 'resume']?.();
  }
  const openOverlay = el => { el.classList.remove('hidden'); syncPause(); };
  const closeOverlay = el => { el.classList.add('hidden'); syncPause(); };

  /* ------------------------------------------------------------ who's playing */
  function renderWho() {
    $('install-hint').classList.toggle('hidden', !safe.needsInstallForFullscreen());
    const list = $('who-list');
    list.replaceChildren(...store.profiles.map(p => {
      const tile = h('button', { class: 'who-tile', type: 'button', 'aria-label': t('Play as {name}', { name: p.name }) }, avatarCanvas(p.avatar, 220), h('span', {}, p.name), h('span', { class: 'go-badge' }, icon('play')));
      tile.addEventListener('click', () => choose(p));
      return tile;
    }), h('button', { class: 'who-tile add', type: 'button', 'aria-label': t('Add a player'), onclick: () => askGate(() => openSetup(true)) }, icon('plus')));
    show('who');
  }

  function choose(p) {
    safe.enterFullscreen();
    SPG.audio.unlock();
    store.setActive(p.id);
    refreshHub();
    show('hub');
    SPG.music.sync();
    voice.custom['player/' + p.id] = t('Hi {name}!', { name: p.name }); voice.custom['pname/' + p.id] = p.name;
    if (!checkLimit()) voice.say('player/' + p.id, 'welcome');
  }

  /* ------------------------------------------------------------ setup */
  const NICKS = SPG.voice.PICK_NAMES.nicks;
  let pickedAvatar = art.AVATARS[0];
  let nickGrid = null, pickedGender = '', pickedAge = 0;
  // a row of toggle buttons (the same look as the switches in Grown-ups): pick one, tap it again to un-pick
  function chipRow(host, options, get, set) {
    const paint = () => [...host.children].forEach((b, i) => b.setAttribute('aria-pressed', String(get() === options[i][0])));
    host.replaceChildren(...options.map(([val, label]) => { const b = h('button', { type: 'button', class: 'seg-btn' }, label); b.addEventListener('click', () => { set(get() === val ? (typeof val === 'number' ? 0 : '') : val); SPG.sfx.tap(); paint(); }); return b; }));
    paint();
  }
  function openSetup(canCancel) {
    const pick = $('avatar-pick');
    const used = new Set(store.profiles.map(p => p.avatar));
    pickedAvatar = art.AVATARS.find(a => !used.has(a)) || art.AVATARS[0];
    pick.replaceChildren(...art.AVATARS.map(kind => {
      const b = h('button', { type: 'button', 'aria-label': kind, 'aria-pressed': String(kind === pickedAvatar) }, avatarCanvas(kind, 128));
      b.addEventListener('click', () => { pickedAvatar = kind; [...pick.children].forEach(x => x.setAttribute('aria-pressed', String(x === b))); SPG.sfx.tap(); });
      return b;
    }));
    pickedGender = ''; pickedAge = 0;
    chipRow($('gender-pick'), [['girl', t('Girl')], ['boy', t('Boy')]], () => pickedGender, v => { pickedGender = v; });
    chipRow($('age-pick'), SPG.level.AGES.map(a => [a, String(a)]), () => pickedAge, v => { pickedAge = v; });
    $('setup-restore').classList.toggle('hidden', store.profiles.length > 0);
    $('name-input').value = ''; $('name-field').classList.add('hidden'); $('type-name').classList.remove('hidden');
    nickGrid = SPG.ui.nameGrid(NICKS, () => { $('name-input').value = ''; });
    $('nick-pick').replaceChildren(nickGrid);
    $('setup-cancel').classList.toggle('hidden', !canCancel);
    show('setup');
  }
  // Typing needs the keyboard, which is for grown-ups: the maths question comes first.
  SPG.ui.press($('type-name'), () => askGate(() => { $('type-name').classList.add('hidden'); $('name-field').classList.remove('hidden'); nickGrid && nickGrid.clear(); setTimeout(() => $('name-input').focus(), 80); }));
  $('setup-cancel').addEventListener('click', renderWho);
  $('setup-restore').addEventListener('click', () => askGate(openParent));
  // the language is a grown-up choice too (it is the first thing in their panel)
  $('setup-lang').addEventListener('click', () => askGate(openParent));
  $('setup-lang-name').textContent = SPG.i18n.info().native;
  $('setup-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('name-input');
    const name = input.value.trim() || (nickGrid && nickGrid.value) || '';
    if (!name) { const nk = $('nick-pick'); nk.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 250 }); SPG.sfx.oops(); return; }
    input.blur();
    choose(store.addProfile(name, pickedAvatar, { gender: pickedGender, level: pickedAge ? { mode: 'age', age: pickedAge } : null }));
  });
  // The first time a grown-up opens their panel they are invited to choose the family voices (5-10 people).
  // It waits until then, so a new player goes straight from setup to the games.
  function voiceIntro() {
    if (!SPG.config.recorder || store.settings.voiceIntroDone) return;
    store.settings.voiceIntroDone = true; store.saveSettings();
    SPG.studio.intro($('vintro-body'), (act, id) => {
      closeOverlay(overlays.vintro);
      if (act === 'record' && id) { SPG.studio.begin(id); openStudio(); } else renderParent();
    });
    openOverlay(overlays.vintro);
  }

  /* ------------------------------------------------------------ hub */
  function refreshHub() {
    const p = store.active;
    if (!p) return;
    $('hub-name').textContent = p.name;
    $('hub-stars').textContent = p.stars;
    const av = $('hub-avatar'); const c = av.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, av.width, av.height);
    c.translate(32, 38); art.avatar(c, p.avatar, 22);
    markFresh();
  }
  // a game added in an update twinkles until this player has opened it once, so it is found even on the last page
  function markFresh() { const o = (store.active && store.active.data && store.active.data.opened) || {}; document.querySelectorAll('.card-new').forEach(el => el.classList.toggle('hidden', !!o[el.dataset.id])); }
  SPG.ui.press($('hub-who'), () => { voice.stop(); renderWho(); });
  SPG.ui.press($('hub-lock'), () => askGate(openParent));

  const tints = { letters: ['#ffe3ec', '#f5b8cb'], fruit: ['#ffe9c7', '#f5c98a'], rain: ['#d8efff', '#a8d3f2'], fire: ['#ffe1d6', '#f5a58f'], band: ['#ffe3f0', '#f2a9c9'], shapes: ['#e3f0ff', '#9cc5f0'], puzzle: ['#e6f7ec', '#98d4ae'], care: ['#fff0d9', '#f2c88c'], hide: ['#e8f6d8', '#a7d78a'], garden: ['#dff5d0', '#a9d98f'], color: ['#efe4ff', '#cdbcf7'], pets: ['#ffe8ef', '#f6b9cc'], style: ['#ffe3f1', '#f7a8cf'], aquarium: ['#d8f2ff', '#7fc8ec'], cook: ['#fff0dc', '#f5c690'], clay: ['#ffe9d4', '#f2b98c'], fishing: ['#d8f2ff', '#8ccbe8'], pattern: ['#eafbe0', '#a6dc7e'], feelings: ['#fff1f6', '#f5b8cb'], sort: ['#fff6e0', '#f5cf8f'], signs: ['#e9f3ff', '#b9d4f5'] };
  function renderCards() {
    const all = SPG.games.slice().sort((a, b) => a.order - b.order);
    const games = orderedGames(all.filter(g => !g.shop)), shops = all.filter(g => g.shop);
    const paint = (canvas, g) => () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.icon(c, r.width, r.height);
    };
    // Games look like little app icons: six big ones on tablets, nine (3 x 3) on tall phones, eight (4 x 2) on wide phones.
    // Swipe, or use the big arrows and dots underneath.
    const PER_PAGE = hubPer = perPage(), pages = [];
    for (let i = 0; i < games.length; i += PER_PAGE) pages.push(games.slice(i, i + PER_PAGE));
    const strip = h('div', { class: 'pages' }, ...pages.map((list, pi) => h('div', { class: 'cards page', 'aria-label': t('Page {n} of {all}', { n: pi + 1, all: pages.length }) }, ...list.map((g, k) => {
      const [tint, edge] = tints[g.id] || ['#fff', '#ddd'];
      const canvas = document.createElement('canvas');
      const card = h('button', { class: 'card' + (hubEdit && hubEdit.drag && hubEdit.drag.id === g.id ? ' drag-src' : ''), type: 'button', 'aria-label': t(g.name), 'data-id': g.id, style: `--tint:${tint};--edge:${edge};--d:${-(pi * PER_PAGE + k) * 1.1}s` },
        h('span', { class: 'lamp', 'aria-hidden': 'true' }), canvas, h('span', { class: 'card-name' }, t(g.name)),
        // a game added in an update twinkles until this player has opened it once, so it is found even on the last page
        g.fresh ? h('span', { class: 'card-new', 'data-id': g.id, 'aria-hidden': 'true' }) : null);
      // A swipe must turn the page, not start a game, so a card opens on a short tap (the browser cancels the touch when it becomes a swipe).
      let down = null;
      const cancelHold = () => { clearTimeout(card._hold); clearTimeout(card._hl); card.classList.remove('holding'); };
      card.addEventListener('pointerdown', e => {
        if (e.button > 0) return; down = { x: e.clientX, y: e.clientY, t: performance.now() };
        if (hubEdit) { down = null; startHubDrag(e, g, card); return; }
        // hold an app for about two seconds, then a grown-up confirms and the apps can be moved around
        cancelHold(); card._hl = setTimeout(() => card.classList.add('holding'), 350);
        card._hold = setTimeout(() => { if (!down) return; down = null; cancelHold(); SPG.sfx.pop(); askGate(enterHubEdit); }, 2000);
      });
      card.addEventListener('pointermove', e => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 14) cancelHold(); });
      card.addEventListener('pointerup', e => {
        cancelHold(); if (hubEdit || !down) return; const d = down; down = null;
        if (!strip._dragged && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 14 && performance.now() - d.t < 900) openGame(g);
      });
      for (const n of ['pointercancel', 'pointerleave']) card.addEventListener(n, () => { down = null; cancelHold(); });
      card.addEventListener('click', e => { if (e.detail === 0 && !hubEdit) openGame(g); });   // keyboard / assistive tech
      card._draw = paint(canvas, g);
      return card;
    }))));
    const prev = h('button', { class: 'pg-arrow', type: 'button', 'aria-label': t('Previous page') }, icon('left'));
    const next = h('button', { class: 'pg-arrow', type: 'button', 'aria-label': t('Next page') }, icon('right'));
    const dots = h('div', { class: 'pg-dots' }, ...pages.map((_, i) => h('button', { class: 'pg-dot', type: 'button', 'aria-label': t('Page {n}', { n: i + 1 }) })));
    const go = i => { const n = Math.max(0, Math.min(pages.length - 1, i)); strip.scrollTo({ left: n * strip.clientWidth, behavior: 'smooth' }); };
    const where = () => Math.max(0, Math.min(pages.length - 1, Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth))));
    const mark = () => {
      const i = where(); if (!hubFrozen) { hubPage = i; hubFirst = i * hubPer; }
      prev.classList.toggle('off', i === 0); next.classList.toggle('off', i === pages.length - 1);
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    };
    strip._go = go; strip._where = where;
    SPG.ui.press(prev, () => { SPG.sfx.tap(); go(where() - 1); });
    SPG.ui.press(next, () => { SPG.sfx.tap(); go(where() + 1); });
    [...dots.children].forEach((d, k) => SPG.ui.press(d, () => { SPG.sfx.tap(); go(k); }));
    strip.addEventListener('scroll', () => { clearTimeout(strip._t); strip._t = setTimeout(mark, 60); }, { passive: true });
    // Touch swipes scroll natively; with a mouse (computer versions) dragging turns the page too.
    let md = null;
    strip.addEventListener('pointerdown', e => { strip._dragged = false; if (e.pointerType === 'mouse' && e.button === 0) md = { x: e.clientX, left: strip.scrollLeft, page: where(), moved: false }; });
    strip.addEventListener('pointermove', e => {
      if (!md) return; const dx = e.clientX - md.x;
      if (!md.moved && Math.abs(dx) > 8) { md.moved = true; strip._dragged = true; strip.style.scrollSnapType = 'none'; try { strip.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
      if (md.moved) strip.scrollLeft = md.left - dx;
    });
    const endDrag = e => { if (!md) return; const d = md; md = null; if (!d.moved) return; const dx = e.clientX - d.x; strip.style.scrollSnapType = ''; go(Math.abs(dx) > strip.clientWidth * .12 ? d.page + (dx < 0 ? 1 : -1) : d.page); };
    strip.addEventListener('pointerup', endDrag); strip.addEventListener('pointercancel', endDrag);
    strip._restore = () => { if (!strip.clientWidth) return; strip.scrollLeft = hubPage * strip.clientWidth; mark(); };
    $('hub-games').classList.toggle('single', pages.length < 2);
    $('hub-games').replaceChildren(strip, h('div', { class: 'pg-nav' }, prev, dots, next));
    mark();
    // Shops are not games: they get their own storefront under the games.
    $('hub-shop').replaceChildren(...shops.map(g => {
      const canvas = document.createElement('canvas');
      const front = h('button', { class: 'shopfront', type: 'button', 'aria-label': t(g.name), 'data-id': g.id }, canvas, h('span', { class: 'shop-sign' }, t(g.name)));
      SPG.ui.press(front, () => { if (!hubEdit) openGame(g); });
      front._draw = paint(canvas, g);
      return front;
    }));
    drawCards(); markFresh();
  }
  /* ------------------------------------------------------------ rearranging the apps (grown-ups): hold an app ~2 s, confirm, then drag */
  // touching the empty background of the main menu (not an icon, button, arrow or the shop) changes the picture behind it
  (() => {
    const hub = $('hub'); let d = null;
    const empty = t => t.closest('.card, button, .chip, .shopfront, .pg-nav, .hub-editbar, a, input, select') === null;
    hub.addEventListener('pointerdown', e => { d = e.isPrimary && empty(e.target) ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
    hub.addEventListener('pointercancel', () => { d = null; });
    hub.addEventListener('pointerup', e => {
      if (!d) return; const m = Math.hypot(e.clientX - d.x, e.clientY - d.y), long = performance.now() - d.t > 600; d = null;
      if (m < 14 && !long && !hubEdit && current === 'hub' && !anyOverlay() && empty(e.target)) nextBackdrop();
    });
  })();
  let hubEdit = null;   // while rearranging: { drag }
  const orderedGames = list => { const ord = store.settings.hubOrder || [], idx = g => { const i = ord.indexOf(g.id); return i < 0 ? 1000 + g.order : i; }; return list.slice().sort((a, b) => idx(a) - idx(b)); };
  const gameIds = () => orderedGames(SPG.games.filter(g => !g.shop)).map(g => g.id);
  function enterHubEdit() {
    if (hubEdit) return; hubEdit = { drag: null }; document.body.classList.add('hub-editing');
    const bar = h('div', { id: 'hub-editbar', class: 'hub-editbar' },
      h('span', { class: 'hub-edit-msg' }, t('Drag an app to move it. Hold at the screen edge to go to another page.')),
      h('button', { class: 'btn quiet small', type: 'button', id: 'hub-edit-reset' }, t('Original order')),
      h('button', { class: 'btn go', type: 'button', id: 'hub-edit-done' }, icon('check'), ' ' + t('Done')));
    $('hub').append(bar);
    SPG.ui.press($('hub-edit-done'), exitHubEdit);
    SPG.ui.press($('hub-edit-reset'), () => { delete store.settings.hubOrder; store.saveSettings(); SPG.sfx.tap(); renderCards(); });
    renderCards();
  }
  function exitHubEdit() {
    if (!hubEdit) return; hubEdit = null; document.body.classList.remove('hub-editing');
    const bar = $('hub-editbar'); if (bar) bar.remove(); document.querySelectorAll('.card-ghost').forEach(n => n.remove());
    store.saveSettings(); renderCards(); SPG.sfx.chime();
  }
  function startHubDrag(e, g, card) {
    const r = card.getBoundingClientRect(), src = card.querySelector('canvas'), ghost = h('div', { class: 'card-ghost', style: `width:${r.width}px;height:${r.height}px;--tint:${(tints[g.id] || ['#fff'])[0]};--edge:${(tints[g.id] || [0, '#ddd'])[1]}` });
    const gc = document.createElement('canvas'); gc.width = src.width; gc.height = src.height; gc.getContext('2d').drawImage(src, 0, 0); gc.style.width = src.getBoundingClientRect().width + 'px'; ghost.append(gc, h('span', { class: 'card-name' }, t(g.name))); document.body.append(ghost);
    const D = hubEdit.drag = { id: g.id, ghost, ox: e.clientX - r.left, oy: e.clientY - r.top, dwell: 0, dir: 0, pid: e.pointerId };
    const place = ev => { ghost.style.transform = `translate(${ev.clientX - D.ox}px, ${ev.clientY - D.oy}px) scale(1.08) rotate(-3deg)`; };
    place(e); SPG.sfx.tap(); card.classList.add('drag-src');
    const move = ev => {
      if (!hubEdit || hubEdit.drag !== D) return; place(ev);
      const el = document.elementFromPoint(ev.clientX, ev.clientY), tc = el && el.closest && el.closest('#hub-games .card');
      if (tc && tc.dataset.id !== g.id) {
        const tg = SPG.games.find(x => x.id === tc.dataset.id); if (tg) {
          const ids = gameIds(), from = ids.indexOf(g.id), to = ids.indexOf(tg.id); ids.splice(from, 1); ids.splice(to, 0, g.id);   // takes the place of the app it is dropped on
          store.settings.hubOrder = ids; SPG.sfx.plink(1); renderCards();
        }
      }
      // holding at the left or right edge turns the page
      const dir = ev.clientX < 70 ? -1 : ev.clientX > innerWidth - 70 ? 1 : 0, now = performance.now();
      if (!dir) D.dir = 0; else if (D.dir !== dir) { D.dir = dir; D.since = now; } else if (now - D.since > 650) { const st = document.querySelector('#hub-games .pages'); if (st && st._go) { st._go(st._where() + dir); SPG.sfx.tap(); } D.since = now; }
    };
    const end = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
      ghost.remove(); if (hubEdit && hubEdit.drag === D) { hubEdit.drag = null; store.saveSettings(); SPG.sfx.pop(); renderCards(); }
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  }
  let hubPage = 0, hubPer = 8, hubFirst = 0, hubFrozen = false;   // hubFirst: the first game on the page she is looking at (kept steady while the screen turns)
  // Match the CSS grid using the current window, including when a foldable opens or closes.
  // A nearly square inner display has room for nine existing icons without enlarging their art.
  const squareOpen = () => matchMedia('(min-width: 600px) and (min-height: 600px) and (min-aspect-ratio: 4/5) and (max-aspect-ratio: 5/4)').matches;
  // A Flip-style cover screen (both sides about 400 px or less) shows one game at a time (big icon, arrows at the sides, swipe).
  const coverTiny = () => matchMedia('(max-width: 420px) and (max-height: 420px)').matches;
  const perPage = () => (coverTiny() ? 1 : squareOpen() ? 9 : matchMedia('(min-width: 600px) and (min-height: 600px)').matches ? 6 : matchMedia('(orientation: portrait)').matches && !matchMedia('(max-height: 520px)').matches ? 9 : 8);
  function drawCards() {
    const strip = document.querySelector('#hub-games .pages'); if (strip && strip._restore) strip._restore();
    document.querySelectorAll('#hub-games .card, #hub-shop .shopfront').forEach(c => c._draw && c._draw()); }

  /* ------------------------------------------------------------ games */
  function openGame(g) {
    if (current === 'stage') return;   // a second finger lifting off another (now hidden) app
    voice.stop(); SPG.sfx.tap();
    if (g.fresh) { const o = store.bag('opened', () => ({})); if (!o[g.id]) { o[g.id] = 1; store.save(); } }
    show('stage');
    $('stage-stars').textContent = store.active.stars;
    const host = $('game-host');
    host.replaceChildren();
    document.body.classList.toggle('in-canvas', !g.dom);
    running = { game: g, inst: null, paused: false };
    try { running.inst = g.create(host); running.inst.start?.(); }
    catch (e) { console.error(e); closeGame(); return; }   // never leave her on a blank screen
    syncPause();
  }
  function stopGame() {
    const r = running; running = null;
    document.body.classList.remove('in-canvas');
    voice.stop();
    try { r && r.inst && r.inst.destroy?.(); } catch (e) { console.error(e); }
    $('game-host').replaceChildren();
  }
  function closeGame() {
    if (!running && current !== 'stage') return;
    stopGame();
    refreshHub();
    show('hub');
    requestAnimationFrame(drawCards);
  }
  SPG.ui.press($('btn-home'), () => { SPG.sfx.tap(); closeGame(); });

  SPG.onStars = n => {
    for (const id of ['hub-stars', 'stage-stars']) {
      const el = $(id); el.textContent = n;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    }
  };

  /* ------------------------------------------------------------ parent gate */
  let gateState = null;
  // The grown-up gate. With no PIN set it is the spelled-out sum; once a grown-up has set a PIN it is the PIN.
  async function hashPin(pin) {
    const text = 'spg-pin:' + pin;
    try { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(d)].map(v => v.toString(16).padStart(2, '0')).join(''); }
    catch (_) { let x = 5381; for (const ch of text) x = ((x << 5) + x + ch.charCodeAt(0)) >>> 0; return 'h' + x; }
  }
  function openGateSheet(title, hint, forgot) {
    $('gate-title').textContent = title; $('gate-hint').textContent = hint;
    $('gate-forgot').classList.toggle('hidden', !forgot);
    // a grown-up can also use the device's fingerprint or screen lock (switched on in Grown-ups); not when a new PIN is being typed in or for the recovery sums
    $('gate-device').classList.toggle('hidden', !(store.settings.deviceAuth && gateState && !gateState.capture && gateState.mode !== 'recover'));
    openOverlay(overlays.gate);
  }
  function askGate(onPass) {
    if (store.settings.pin) { askPin(onPass); return; }
    gateState = { onPass, entry: '', max: 2, mode: 'math' };
    newQuestion();
    openGateSheet('Grown-ups only', t('Answer to continue'), false);
  }
  // PIN entry. With opts.capture the typed PIN is handed over (setting a new PIN) instead of being checked.
  function askPin(onPass, opts = {}) {
    gateState = { onPass, entry: '', max: 4, mode: 'pin', capture: opts.capture, prompt: opts.prompt || t('Type your PIN') };
    $('gate-q').textContent = gateState.prompt; paintGate();
    openGateSheet(opts.title || t('Grown-ups only'), opts.hint || t('Type the PIN to continue'), !opts.capture);
  }
  // A harder sum for a grown-up who forgot the PIN (a small child cannot do it). Two right in a row clears the PIN.
  function forgotPin() {
    const done = gateState && gateState.onPass; if (!done) return;
    gateState = { onPass: done, entry: '', max: 3, mode: 'recover', right: 0 };
    newRecover(); openGateSheet(t('Forgot the PIN?'), t('Two sums in a row clear the PIN'), false);
  }
  function newRecover() {
    const a = 21 + Math.floor(Math.random() * 60), b = 21 + Math.floor(Math.random() * 60);
    gateState.answer = String(a + b); gateState.entry = '';
    $('gate-q').textContent = `${a} + ${b}`; $('gate-answer').textContent = '';
  }
  function paintGate() {
    const g = gateState; if (!g) return;
    $('gate-answer').textContent = g.mode === 'pin' ? '●'.repeat(g.entry.length) + '○'.repeat(g.max - g.entry.length) : g.entry;
  }
  function newQuestion() {
    const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
    gateState.answer = String(a + b); gateState.entry = '';
    $('gate-q').textContent = t('{a} plus {b}', { a: SPG.i18n.numWord(a), b: SPG.i18n.numWord(b) });
    $('gate-answer').textContent = '';
  }
  (() => {
    const pad = $('numpad');
    const key = (label, cls, fn) => { const b = h('button', { type: 'button', class: cls || '' }, label); SPG.ui.press(b, () => { SPG.sfx.tap(); if (gateState) fn(); }); return b; };
    for (let n = 1; n <= 9; n++) pad.append(key(String(n), '', () => type(String(n))));
    pad.append(key(icon('back'), '', () => { gateState.entry = gateState.entry.slice(0, -1); paintGate(); }));
    pad.append(key('0', '', () => type('0')));
    pad.append(key(icon('check'), 'ok', () => submit()));
    function type(d) {
      const g = gateState; if (g.entry.length >= g.max || g.busy) return;
      g.entry += d; paintGate();
      if (g.mode === 'pin' && g.entry.length === g.max) submit();
    }
    function wrong() {
      const box = $('gate-answer');
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      SPG.sfx.oops();
    }
    async function submit() {
      const g = gateState; if (!g || g.busy) return;
      let ok;
      if (g.mode === 'pin') {
        if (g.capture) { const cap = g.onPass; gateState = null; closeOverlay(overlays.gate); cap(g.entry); return; }
        g.busy = true; ok = (await hashPin(g.entry)) === store.settings.pin; g.busy = false; if (gateState !== g) return;
      } else ok = g.entry === g.answer;
      if (g.mode === 'recover') {
        if (!ok) { wrong(); setTimeout(() => { if (gateState === g) { g.right = 0; newRecover(); } }, 350); return; }
        if (++g.right < 2) { SPG.sfx.chime(); newRecover(); return; }
        store.settings.pin = ''; store.saveSettings(); ok = true;
      }
      if (ok) {
        const cb = g.onPass; gateState = null;
        closeOverlay(overlays.gate);
        cb && cb();
      } else {
        wrong();
        if (g.mode === 'pin') setTimeout(() => { if (gateState === g) { g.entry = ''; paintGate(); } }, 350);
        else setTimeout(() => { if (gateState === g) newQuestion(); }, 350);   // unless the gate was closed meanwhile
      }
    }
  })();
  SPG.ui.press($('gate-forgot'), forgotPin);
  $('gate-device').addEventListener('click', async () => {   // a real tap (the system prompt needs one)
    const g = gateState; if (!g || g.busy) return; g.busy = true;
    const ok = await SPG.native.deviceAuth.verify(store.settings.deviceAuth);
    if (gateState !== g) return; g.busy = false;
    if (ok) { const cb = g.onPass; gateState = null; closeOverlay(overlays.gate); cb && cb(); } else { SPG.sfx.oops(); $('gate-hint').textContent = t('That did not work. You can still use the PIN or the question.'); }
  });
  SPG.ui.press($('gate-back'), () => { gateState = null; closeOverlay(overlays.gate); });

  /* ------------------------------------------------------------ grown-ups panel */
  let installPrompt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });

  function openParent() { renderParent(); openOverlay(overlays.parent); voiceIntro(); }
  function closeParent() {
    closeOverlay(overlays.parent);
    if ((current === 'setup' || current === 'who') && store.profiles.length) { renderWho(); return; } // e.g. players were just restored from a backup
    if (!store.active) { store.profiles.length ? renderWho() : openSetup(false); }
    else { refreshHub(); checkLimit(); }
  }
  $('parent-close').addEventListener('click', closeParent);

  function openStudio() { SPG.studio.render($('studio-body')); openOverlay(overlays.studio); }
  function closeStudio() { SPG.studio.abort(); voice.stop(); closeOverlay(overlays.studio); renderParent(); }
  $('studio-close').addEventListener('click', closeStudio);
  function openSignVideos() { SPG.signVideo.render($('signvid-body')); openOverlay(overlays.signvid); }
  function closeSignVideos() { SPG.signVideo.close(); closeOverlay(overlays.signvid); renderParent(); }
  $('signvid-close').addEventListener('click', closeSignVideos);

  function toggle(label, key) {
    const sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(!!store.settings[key]), 'aria-label': label });
    sw.addEventListener('click', () => {
      store.settings[key] = !store.settings[key]; store.saveSettings();
      sw.setAttribute('aria-checked', String(store.settings[key]));
      SPG.music.sync();
      if (store.settings[key] && (key === 'sound' || key === 'voice')) { key === 'sound' ? SPG.sfx.chime() : voice.say('hello'); }
      if (store.settings[key] && key === 'audioHelp') voice.say('cookc/0');   // a sample: "Sweets!"
    });
    return h('div', { class: 'setting' }, h('span', {}, label), sw);
  }

  function confirmButton(label, cls, action) {
    const b = h('button', { class: `btn small ${cls}`, type: 'button' }, label);
    let armed = false;
    b.addEventListener('click', () => {
      if (!armed) { armed = true; b.textContent = t('Tap again to confirm'); setTimeout(() => { armed = false; b.textContent = label; }, 3500); return; }
      action();
    });
    return b;
  }


  /* ------------------------------------------------------------ backups */
  let backupMsg = '', pendingRecoveryEmail = '';
  const SAY = {
    offline: t('No internet connection right now. Everything is still safe on this device; try again later.'),
    failed: t('The backup service could not be reached. Everything is still safe on this device; try again later.'),
    badcode: t('That code did not unlock a backup. Check it and try again.'),
    notfound: t('No backup was found for that code. Check it and try again.'),
    shape: t('A family code has 20 letters and numbers.'),
    slow: t('Too many tries. Please wait a little and try again.'),
    big: t('The backup is too large to send.'),
    busy: t('Another device is saving right now. Try again in a moment.'),
    notbackup: t('That file is not a Little Sprout Park backup.'),
    nocode: t('Cloud backup is not turned on.')
  };
  function backupSection() {
    const sync = SPG.sync, info = sync.info();
    const say = text => { backupMsg = text; renderParent(); };
    const msg = () => backupMsg ? h('p', { class: 'note' }, backupMsg) : null;
    const sec = h('section', {}, h('h3', {}, t('Keep drawings and progress safe')));
    if (store.saveFailed) sec.append(h('p', { class: 'warn' }, t('This device could not save just now (storage may be full or blocked). Turn on the cloud backup or save a backup file so nothing is lost.')));
    const busyBtn = (label, cls, fn) => {
      const b = h('button', { class: `btn small ${cls}`, type: 'button' }, label);
      b.addEventListener('click', async () => { b.disabled = true; b.textContent = t('Working…'); await fn(); });
      return b;
    };
    if (!sync.supported()) sec.append(h('p', {}, t('Cloud backup needs a newer browser. You can still save a backup file below.')));
    else if (!info.on) {
      sec.append(h('p', {}, t('Turn on the cloud backup so players, stars and drawings come back if this device is reset, lost or replaced. It is private: everything is scrambled on the device before it is sent. A family code is all you need; email recovery is optional in the Android app.')));
      const row = h('div', { class: 'btn-row' },
        busyBtn(t('Turn on cloud backup'), 'go', async () => {
          const r = await sync.create();
          if (r.ok) { backupMsg = ''; pendingRecoveryEmail = ''; showCode(r.code, true); } else say(SAY[r.error] || SAY.failed);
        }));
      const input = h('input', { type: 'text', maxlength: '32', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX' });
      const join = busyBtn(t('Restore from this code'), 'go', async () => {
        const r = await sync.join(input.value);
        if (r.ok) { backupMsg = t('Welcome back! Everything from the backup is here now.') + (r.added ? ' ' + (r.added > 1 ? t('{n} players restored.', { n: r.added }) : t('1 player restored.')) : '') + (r.voices && r.voices.got ? ' ' + (r.voices.got > 1 ? t('{n} recorded voices restored.', { n: r.voices.got }) : t('1 recorded voice restored.')) : ''); renderParent(); } else say(SAY[r.error] || SAY.failed);
      });
      sec.append(row, h('label', { class: 'field small-field' }, t('Already have a family code (for example from another device)?'), input), join);
    } else {
      const when = info.last ? new Date(info.last).toLocaleString(SPG.i18n.info().bcp) : t('not yet');
      sec.append(h('p', {}, t('Cloud backup is on.') + ' ', h('span', { class: 'fine' }, t('Last saved: {when}', { when }))),
        h('div', { class: 'btn-row' },
          busyBtn(t('Sync now'), 'go', async () => { const r = await sync.syncNow(); say(r.ok ? t('Saved! Everything is backed up and up to date.') + (r.voices && (r.voices.sent || r.voices.got) ? ' ' + t('Voices: {sent} sent, {got} received.', { sent: r.voices.sent, got: r.voices.got }) : '') : (SAY[r.error] || SAY.failed)); }),
          (() => { const b = h('button', { class: 'btn small', type: 'button' }, t('Show family code')); b.addEventListener('click', () => showCode(sync.code(), false)); return b; })(),
          confirmButton(t('Turn off and delete cloud copy'), 'danger', async () => { const r = await sync.turnOff(); if (r.ok) pendingRecoveryEmail = ''; say(r.ok ? t('Cloud backup is off and the cloud copy was deleted. Your data is still on this device.') : (SAY[r.error] || SAY.failed)); })),
        h('p', { class: 'fine' }, t('Changes, including recorded voices, are also saved in the background whenever the device is online (recordings are encrypted first). To use the same players on another device, choose “I already have a family code” there.')));
    }
    if (info.on && sync.emailRecoveryAvailable()) {
      const recovery = h('div', {},
        h('h4', {}, t('Keep the family code in your inbox')),
        h('p', { class: 'fine' }, t('Optional for grown-ups. Enter your email, then type the six-digit code we send to prove the inbox is yours. Only then will we email your family code. This backup will be linked to that verified inbox. Anyone with the family code can still restore the backup, so keep the email private.')));
      if (!pendingRecoveryEmail) {
        const email = h('input', { type: 'email', inputmode: 'email', autocomplete: 'email', maxlength: '254', placeholder: 'you@example.com' });
        recovery.append(h('label', { class: 'field small-field' }, t('Grown-up email address'), email),
          busyBtn(t('Send verification code'), 'go', async () => {
            const r = await sync.startEmailRecovery(email.value);
            if (r.ok) { pendingRecoveryEmail = email.value.trim(); say(t('Check your inbox for the six-digit verification code. It expires after 10 minutes.')); }
            else say({ 'bad email': t('Check the email address and try again.'), 'linked to another email': t('This backup is already linked to another verified inbox.'), 'slow down': t('Please wait before trying again.'), unavailable: t('Email recovery is not available yet. Your family code still works.'), 'email unavailable': t('Email is unavailable right now. Your family code is still safe on this device.') }[r.error] || SAY[r.error] || SAY.failed);
          }));
      } else {
        const code = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', pattern: '[0-9]{6}', placeholder: '123456' });
        recovery.append(h('p', { class: 'fine' }, t('Verification email sent to {email}.', { email: pendingRecoveryEmail })),
          h('label', { class: 'field small-field' }, t('Six-digit code from email'), code),
          busyBtn(t('Verify and email family code'), 'go', async () => {
            const r = await sync.confirmEmailRecovery(code.value);
            if (r.ok) { pendingRecoveryEmail = ''; say(t('Family code sent to {email}. Keep that message private.', { email: r.email })); }
            else { if (r.error === 'verification expired' || r.error === 'too many attempts') pendingRecoveryEmail = ''; say({ 'wrong verification code': t('That code did not match. Check the email and try again.'), 'verification expired': t('That code expired. Start again with your email address.'), 'too many attempts': t('Too many tries. Start again after a short wait.'), 'slow down': t('Please wait before trying again.'), 'email unavailable': t('Email is unavailable right now. You can retry the same verification code.') }[r.error] || SAY[r.error] || SAY.failed); }
          }),
          (() => { const b = h('button', { class: 'btn small quiet', type: 'button' }, t('Use a different email')); b.addEventListener('click', () => { pendingRecoveryEmail = ''; renderParent(); }); return b; })());
      }
      sec.append(recovery);
    }
    // backup file
    const file = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0]; if (!f) return;
      const r = sync.restoreFileText(await f.text());
      say(r.ok ? (r.total > 1 ? t('Backup file restored ({n} players here now). Nothing that was already here was lost.', { n: r.total }) : t('Backup file restored (1 player here now). Nothing that was already here was lost.')) : SAY[r.error]);
    });
    const save = h('button', { class: 'btn small', type: 'button' }, t('Save a backup file'));
    save.addEventListener('click', () => {
      const blob = new Blob([sync.fileText()], { type: 'application/json' });
      SPG.native.saveFile(blob, sync.fileName(), 'application/json').then(ok => say(SPG.native.isApp ? (ok ? t('Choose where to keep the backup file.') : t('The backup file was not saved.')) : t('Backup file saved to this device’s downloads.')));
    });
    const restore = h('button', { class: 'btn small quiet', type: 'button' }, t('Restore from a backup file'));
    restore.addEventListener('click', () => file.click());
    sec.append(h('div', { class: 'btn-row' }, save, restore, file));
    const undo = store.undoInfo();
    if (undo) {
      const b = h('button', { class: 'btn small quiet', type: 'button' }, t('Undo the last restore or sync'));
      b.addEventListener('click', () => { store.undoRestore(); say(t('Undone. This device is back to how it was before.')); });
      sec.append(h('p', { class: 'fine' }, (undo.players === 1 ? t('A copy of this device from {when} (1 player) is kept in case a restore was a mistake.', { when: new Date(undo.t).toLocaleString(SPG.i18n.info().bcp) }) : t('A copy of this device from {when} ({n} players) is kept in case a restore was a mistake.', { when: new Date(undo.t).toLocaleString(SPG.i18n.info().bcp), n: undo.players }))), b);
    }
    sec.append(msg());
    return sec;
  }
  function showCode(code, first) {
    const body = $('parent-body');
    const done = h('button', { class: 'btn small go', type: 'button' }, icon('check'), ' ' + (first ? t('I have written it down') : t('Done')));
    done.addEventListener('click', renderParent);
    body.replaceChildren(h('section', { style: 'border-top:0;padding-top:0' },
      h('h3', {}, first ? t('Cloud backup is on') : t('Your family code')),
      h('div', { class: 'code-box' }, code),
      h('p', {}, first ? t('Write this code down or take a photo of it, and keep it somewhere safe. It is the only way to get the drawings and progress back on a new device, and nobody (including us) can look it up for you.') : t('Keep this code private. Anyone with it can restore this family’s players on another device.')),
      done));
  }

  function renderParent() {
    const body = $('parent-body');
    const fsNow = safe.isFullscreen();
    const fsBtn = h('button', { class: 'btn small', type: 'button' }, fsNow ? t('Leave full screen') : t('Go full screen'));
    fsBtn.addEventListener('click', async () => { fsNow ? await safe.exitFullscreen() : await safe.enterFullscreen(); setTimeout(renderParent, 250); });

    const safeSection = h('section', {},
      h('h3', {}, t('Safe mode')),
      h('p', {}, t('The games never link to other websites. Full screen hides the address bar and tabs, and the back button stays inside the app. Only this grown-ups panel can change that.')),
      safe.standalone() ? h('p', { class: 'fine' }, t('Running as an installed app, which is already full screen.')) : (safe.canFullscreen ? fsBtn : h('p', { class: 'fine' }, t('This browser cannot go full screen. Install the app from the browser menu instead.'))));
    if (safe.isIOS && !safe.standalone()) {
      safeSection.append(h('p', {}, h('b', {}, t('Full screen on iPhone and iPad: '))), h('ol', { class: 'steps' },
        h('li', {}, t('In Safari, tap the Share button (the square with an arrow).')),
        h('li', {}, t('Choose “Add to Home Screen”, then tap Add.')),
        h('li', {}, t('Open Little Sprout Park from your home screen. It opens full screen with no browser bars.'))),
        h('p', { class: 'fine' }, t('To keep a child inside the app on iPhone/iPad, also turn on Guided Access: Settings → Accessibility → Guided Access, then triple-click the side (or Home) button while the app is open.')));
    }
    if (installPrompt) {
      const b = h('button', { class: 'btn small go', type: 'button', style: 'margin-top:8px' }, t('Install on this tablet'));
      b.addEventListener('click', async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; b.remove(); });
      safeSection.append(b);
    }

    const players = h('section', {}, h('h3', {}, t('Players')));
    for (const p of store.profiles) {
      players.append(h('div', { class: 'player-row' },
        avatarCanvas(p.avatar, 104), h('div', { class: 'name' }, p.name, h('div', { class: 'stat' }, t('{n} stars', { n: p.stars }))),
        confirmButton(t('Reset progress'), 'quiet', () => { store.resetProfile(p.id); renderParent(); }),
        confirmButton(t('Remove'), 'danger', () => { store.removeProfile(p.id); renderParent(); })));
    }
    if (store.trash.length) {
      players.append(h('p', { class: 'fine', style: 'margin-top:10px' }, t('Recently removed or reset (nothing is lost right away):')));
      store.trash.forEach((item, i) => {
        const b = h('button', { class: 'btn small quiet', type: 'button' }, t('Bring back {name}', { name: item.p.name }));
        b.addEventListener('click', () => { store.restoreTrash(i); renderParent(); });
        players.append(h('div', { class: 'player-row' }, h('div', { class: 'name' }, item.p.name, h('div', { class: 'stat' }, (item.why === 'reset' ? t('Progress reset') : t('Removed')) + ' ' + SPG.i18n.date(item.t))), b));
      });
    }
    const add = h('button', { class: 'btn small go', type: 'button', style: 'margin-top:8px' }, icon('plus'), ' ' + t('Add player'));
    add.addEventListener('click', () => { closeOverlay(overlays.parent); openSetup(true); });
    players.append(add);

    body.replaceChildren(
      languageSection(),
      h('section', {}, h('h3', {}, t('Sound')), toggle(t('Voice prompts'), 'voice'), toggle(t('Extra audio help'), 'audioHelp'), h('p', { class: 'fine' }, t('For children who need more help hearing what things are: the games also say the name of each menu item, ingredient, piece of clothing or shop item as it is touched, give extra hints and say more cheers, and speak a little slower. Off by default, so the games stay quiet and calm (the short list of recorded lines is always said).')), toggle(t('Sound effects'), 'sound'), toggle(t('Soft background music'), 'music'), toggle(t('Coloring Book music'), 'colorMusic')),
      accessSection(),
      voicesSection(),
      timerSection(),
      pinSection(),
      deviceAuthSection(),
      nightSection(),
      learnSection(),
      levelSection(),
      photoSection(),
      backupSection(),
      safeSection, players,
      h('section', {}, h('h3', {}, t('Locking the tablet properly')),
        h('p', {}, t('A website cannot stop a child using the tablet’s own buttons. For a true lock, use Android screen pinning together with full screen:')),
        h('ol', { class: 'steps' },
          h('li', {}, t('Settings → Security (or Security & privacy) → App pinning, and turn it on.')),
          h('li', {}, t('Open Little Sprout Park, then open Recent apps.')),
          h('li', {}, t('Tap the app icon at the top of its card and choose Pin.')),
          h('li', {}, t('To unpin later, hold Back and Recent apps together (or swipe up and hold, depending on the tablet).')))),
      h('section', {}, h('h3', {}, t('About')),
        h('p', {}, t('Little Sprout Park version {v}. No ads or tracking. Children\'s play needs no account.', { v: SPG.version })),
        h('p', { class: 'fine' }, t('Names, stars, gardens, coloring pictures and voice recordings stay on this device unless a grown-up turns on cloud backup. Grown-ups can optionally email their family code to a verified inbox.')),
        h('a', { href: 'privacy.html', target: '_blank', rel: 'noopener noreferrer' }, t('Read the privacy policy'))),
      h('section', {}, h('h3', {}, t('Voice recordings')),
        h('p', {}, t('Prompts are spoken by the tablet’s built-in voice until you add recordings. See RECORDING.md in the project for the list of lines and where the files go.'))));
  }

  // Language (js/i18n.js): what the games say and what the screens show. Choosing another one restarts the app in it.
  function languageSection() {
    const cur = SPG.i18n.lang(), info = SPG.i18n.info();
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': t('Language') });
    for (const L of SPG.i18n.LANGS) {
      const b = h('button', { type: 'button', class: 'seg-btn', lang: L.bcp, 'aria-pressed': String(cur === L.id) }, L.native);
      b.addEventListener('click', () => { if (L.id === cur) return; [...seg.children].forEach(x => { x.disabled = true; }); b.textContent = L.native + ' …'; SPG.i18n.set(L.id); });
      seg.append(b);
    }
    // the word "Language" stays in English too, for a grown-up who cannot read the language the device picked
    const sec = h('section', { style: 'border-top:0;padding-top:0' }, h('h3', {}, cur === 'en' ? 'Language' : t('Language') + ' · Language'),
      h('p', {}, t('The games speak, and the menus are written, in the language chosen here. The app restarts in the new language; nothing is lost.')), seg);
    if (cur === 'hi' || cur === 'zh') sec.append(h('p', { class: 'fine' }, t('Letter Garden teaches the English alphabet: the letter names, letter sounds and picture words are said in English.')));
    if (cur !== 'en') sec.append(h('p', { class: 'fine' }, t('Sign language stays American Sign Language (ASL). Voice recordings and reworded lines are kept separately for each language.')));
    if (cur !== 'en' && voice.voicesReady() && !voice.canSpeak()) sec.append(h('p', { class: 'warn' }, t('This device has no {lang} voice yet, so the games say the English lines for now. To add one: Settings → System (or General management) → Languages → Text-to-speech → Google speech engine → Install voice data → {lang}. Then open the app again.', { lang: info.native })));
    return sec;
  }

  /* ------------------------------------------------------------ daily play time */
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const dayNum = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  const playLog = () => {
    const s = store.settings;
    if (!s.playLog || s.playLog.day !== dayKey()) s.playLog = { day: dayKey(), sec: 0 };
    return s.playLog;
  };
  const limitReached = () => { const m = store.settings.timer || 0; return m > 0 && playLog().sec >= m * 60; };

  // The rest screen: the pets she owns dance under the moon while a soft lullaby plays (no owned pets: three friends dance).
  let restRaf = 0, restT = 0;
  function restCast() {
    const P = SPG.pets, owned = store.bag('pets', () => ({ owned: {} })).owned || {};
    let list = P.PETS.filter(p => P.owns(p.id)).map(p => { const o = owned[p.id] || {}; return { id: p.id, hat: o.hat || null, face: o.face || null, neck: o.neck || null }; });
    if (!list.length) list = ['bunny', 'cat', 'bear'].map(id => ({ id, hat: null }));
    return list.slice(0, 6);
  }
  function drawRest(t, cast) {
    const cv = $('break-art'), c = cv.getContext('2d'), w = cv.width, h = cv.height;
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { const x = ((i * 137) % 100) / 100 * w, y = ((i * 71) % 60) / 100 * h, tw = .5 + Math.sin(t * 2 + i) * .5; c.globalAlpha = .35 + tw * .65; art.star(c, x, y, (3 + (i % 3) * 2) * (w / 700), '#fff3b0'); }
    c.globalAlpha = 1;
    { const cx = w * .84, cy = h * .2, r = h * .12;   // a crescent moon
      c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.arc(cx + r * .45, cy - r * .2, r * .85, 0, Math.PI * 2);
      c.fillStyle = '#fff3c4'; c.fill('evenodd'); c.restore(); }
    const n = cast.length, s = Math.min(h * .55, w / (n + .6) * 1.05);
    cast.forEach((p, i) => {
      const x = w * (.5 + (i - (n - 1) / 2) * (1 / (n + .5))), ph = (t * .8 + i * .17) % 1;
      c.fillStyle = 'rgba(20,20,60,.25)'; c.beginPath(); c.ellipse(x, h * .885, s * .3, s * .04, 0, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(x, h * .88);
      c.rotate(Math.sin(t * 2.4 + i * 1.3) * .07);
      SPG.pets.draw(c, p.id, s, t + i * .7, { mood: ph < .5 ? 'cheer' : 'happy', hop: ph < .5 ? ph * 2 : 0, hat: p.hat, face: p.face, neck: p.neck });
      c.restore();
    });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let k = 0; k < 4; k++) { const u = ((t * .35 + k * .25) % 1); c.globalAlpha = Math.sin(u * Math.PI); c.fillStyle = ['#ffb3c6', '#b8e6ff', '#fff3b0', '#d9c2f2'][k]; c.font = `700 ${h * .09}px Fredoka, system-ui`; c.fillText(k % 2 ? '\u266b' : '\u266a', w * (.2 + k * .2) + Math.sin(t + k) * 10, h * (.55 - u * .3)); }
    c.globalAlpha = 1;
  }
  function startRest() {
    const cast = restCast(), cv = $('break-art');
    cancelAnimationFrame(restRaf);
    const frame = () => { restT += 1 / 60; drawRest(restT, cast); restRaf = requestAnimationFrame(frame); };
    frame();
    SPG.music.rest(true);
  }
  function stopRest() { cancelAnimationFrame(restRaf); restRaf = 0; SPG.music.rest(false); }
  function showBreak() {
    if (!overlays.brk.classList.contains('hidden')) return;
    voice.say('break-time'); openOverlay(overlays.brk); startRest();
  }
  // Returns true if the rest screen is now showing.
  function checkLimit() {
    if (!limitReached() || (current !== 'hub' && current !== 'stage')) return false;
    showBreak(); return true;
  }
  SPG.ui.press($('break-adult'), () => askGate(() => { stopRest(); closeOverlay(overlays.brk); openParent(); }));
  setInterval(() => {
    if (document.hidden || (current !== 'hub' && current !== 'stage') || anyOverlay()) return;
    if (++playLog().sec % 10 === 0) store.saveSettings();   // the save on hide or close keeps the last seconds
    // each player's own minutes per day (the last two weeks), for Grown-ups > Learning and play; written without stamping the player
    if (store.active) { const pl = store.bag('play', () => ({})), k = dayKey(); pl[k] = (pl[k] || 0) + 1; if (Object.keys(pl).length > 14) delete pl[Object.keys(pl).sort((a, b) => dayNum(a) - dayNum(b))[0]]; }
    if (limitReached()) showBreak();
  }, 1000);

  // The Android home / Flip cover widget rests with the app when today's play time is used up (and wakes again the next day).
  let widgetRest = null;
  setInterval(() => {
    const w = SPG.native.widget; if (!w) return;
    const r = limitReached(); if (r === widgetRest) return;
    widgetRest = r; try { Promise.resolve(w.setRest(r)).catch(() => { widgetRest = null; }); } catch (_) { widgetRest = null; }
  }, 3000);

  function voicesSection() {
    const keys = voice.allKeys();
    const n = set => keys.filter(k => voice.hasClip(set, k)).length;
    const b = h('button', { class: 'btn small go', type: 'button' }, t('Record and choose voices'));
    b.addEventListener('click', openStudio);
    return h('section', {}, h('h3', {}, t('Voices')),
      h('p', {}, t('Record your family’s voices for the games (everyone’s recordings can be mixed), choose the built-in voice, switch off lines you don’t want, and choose how often the games cheer.')),
      h('p', { class: 'fine' }, t('Recorded so far: {list} of {n} lines.', { list: voice.SETS.map(v => `${v.extra ? v.name : t(v.name)} ${n(v.id)}`).join(', '), n: keys.length })), b);
  }

  // Accessibility. Hearing: everything the games say is also signed (ASL) by a pair of hands in a corner card (js/signs.js).
  // Seeing: colour filters for colour vision deficiency, stronger contrast, bigger buttons (js/access.js). All off by default.
  // colour symbols: on by themselves with a colour filter, and the switch can change that either way
  function marksRow() {
    const st = store.settings, sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(SPG.vision.marks()), 'aria-label': t('Colour symbols') });
    sw.addEventListener('click', () => { st.colourMarks = !SPG.vision.marks(); store.saveSettings(); sw.setAttribute('aria-checked', String(st.colourMarks)); });
    return h('div', {}, h('div', { class: 'setting' }, h('span', {}, t('Colour symbols: a little white heart, sun, leaf, drop… on each colour')), sw),
      h('p', { class: 'fine', style: 'margin:0' }, t('In Shape Builder and Caterpillars, where things are matched by colour, every colour also has its own symbol (red a heart, orange a lightning bolt, yellow a sun, green a leaf, blue a drop, purple a moon, pink a flower, brown a paw), so colour is never the only difference. On by itself with a colour filter.')));
  }
  function accessSection() {
    const st = store.settings; if (st.signWords == null) st.signWords = true;
    const sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(!!st.signs), 'aria-label': t('Signing hands') });
    sw.addEventListener('click', () => { st.signs = !st.signs; store.saveSettings(); sw.setAttribute('aria-checked', String(st.signs)); if (st.signs) SPG.signs.sample(); else SPG.signs.stop(); renderParent(); });
    const seg = (label, key, opts) => {
      const g = h('div', { class: 'seg', role: 'group', 'aria-label': label });
      for (const [id, text, col] of opts) {
        const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String((st[key] || opts[0][0]) === id) }, col ? h('span', { class: 'sign-swatch', style: `background:${col}` }) : '', text);
        b.addEventListener('click', () => { st[key] = id; store.saveSettings(); SPG.signs.sample(); renderParent(); });
        g.append(b);
      }
      return h('div', {}, h('p', { class: 'fine', style: 'margin:10px 0 0' }, label), g);
    };
    const show = h('button', { class: 'btn small go', type: 'button', style: 'margin-top:10px' }, t('Show me'));
    show.addEventListener('click', () => SPG.signs.sample());
    const sec = h('section', {}, h('h3', {}, t('Accessibility')),
      h('p', {}, t('Extra help for children who are deaf or hard of hearing, or who see colours differently or need things bigger. Everything here is off until you turn it on.')),
      h('h4', {}, t('Hearing: sign language (ASL)')),
      h('div', { class: 'setting' }, h('span', {}, t('Signing hands, for children who are deaf or hard of hearing')), sw),
      h('p', { class: 'fine' }, SPG.pron.fill(t('Everything the games say is also signed in American Sign Language by a pair of hands in a small card in a corner (taps go through it). Instructions are signed as their key words, letters and names are fingerspelled, and numbers, colours, shapes and feelings have their own signs. For signs made at the face or chest, a little smiley face shows where (a pink dot), and its expression shows the feeling or the question. The voice still speaks unless you switch Voice prompts off. The Sign Along game teaches the signs to any child.'))));
    if (st.signs) sec.append(
      seg(t('Corner'), 'signSide', [['left', t('Bottom left')], ['right', t('Bottom right')]]),
      seg(t('Size'), 'signSize', [['small', t('Small')], ['big', t('Big')]]),
      seg(t('Hand colour'), 'signSkin', [['medium', t('Medium'), SPG.sign.SKINS.medium.base], ['light', t('Light'), SPG.sign.SKINS.light.base], ['tan', t('Tan'), SPG.sign.SKINS.tan.base], ['deep', t('Deep'), SPG.sign.SKINS.deep.base]]),
      toggle(t('Show the words under the hands'), 'signWords'), show);
    { const n = SPG.signVideo.count(), vb = h('button', { class: 'btn small quiet', type: 'button', style: 'margin-top:10px' }, t('Sign videos: record your own'));
      vb.addEventListener('click', openSignVideos);
      sec.append(h('h4', {}, t('Your own sign videos')),
        h('p', { class: 'fine', style: 'margin:6px 0 0' }, t('Record yourself (or a Deaf friend or teacher) making any sign, and that video is shown instead of the drawn hands, in the corner card and in Sign Along.') + ' ' + (n ? (n === 1 ? t('1 sign has a video.') : t('{n} signs have a video.', { n })) : t('No videos yet.'))), vb); }
    sec.append(h('p', { class: 'fine' }, t('The signs are drawn by the app from standard ASL. Signing differs from place to place: if your child learns with a Deaf signer or an ASL teacher, ask them to look through Sign Along, and tell us about any sign that should change.')));
    // seeing
    const vis = h('div', { class: 'seg', role: 'group', 'aria-label': t('Colour vision') });
    for (const [id, text] of [['', t('Usual colours')], ['deutan', t('Red–green (most common)')], ['protan', t('Red–green, reds look dark')], ['tritan', t('Blue–yellow')]]) {
      const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String((st.vision || '') === id) }, text);
      b.addEventListener('click', () => { st.vision = id; store.saveSettings(); SPG.vision.apply(); renderParent(); });
      vis.append(b);
    }
    const tog = (label, key) => { const row = toggle(label, key); row.querySelector('.switch').addEventListener('click', () => SPG.vision.apply()); return row; };
    sec.append(h('h4', {}, t('Seeing: colours and size')),
      h('p', { class: 'fine', style: 'margin:6px 0 0' }, t('Colour filter for colour blindness: the colours that are easy to mix up are shifted into colours that can be told apart, in every game and menu. Tidy Time also leaves out sorting by colour while a filter is on.')),
      vis, marksRow(),
      tog(t('Stronger contrast and colours'), 'contrast'),
      tog(t('Bigger buttons on the menus and around the games'), 'bigUI'));
    return sec;
  }

  // Fruit Splash for older kids: naughty water balloons that shake the screen, spray water and take points away.
  function nightSection() {
    const cur = SPG.night.mode();
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': t('Night mode') });
    for (const [id, label] of [['off', t('Day')], ['on', t('Night')], ['auto', t('Auto (schedule)')]]) {
      const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(cur === id) }, label);
      b.addEventListener('click', () => { SPG.night.set(id); renderParent(); });
      seg.append(b);
    }
    const sec = h('section', {}, h('h3', {}, t('Night mode')),
      h('p', {}, t('Tones everything down for bedtime: a night sky behind the games, softer colors and quieter sounds. Choose Day or Night yourself, or Auto to switch on by a schedule.')),
      seg);
    if (cur === 'auto') {
      const hourLabel = n => new Date(2020, 0, 1, n).toLocaleTimeString(SPG.i18n.info().bcp, { hour: 'numeric' });
      const picker = (title, key, hours, def) => {
        const row = h('div', { class: 'seg', role: 'group', 'aria-label': title });
        const now = key === 'nightFrom' ? SPG.night.from() : SPG.night.to();
        for (const n of hours) {
          const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(now === n) }, hourLabel(n));
          b.addEventListener('click', () => { store.settings[key] = n; store.saveSettings(); SPG.night.apply(); renderParent(); });
          row.append(b);
        }
        return h('div', {}, h('p', {}, h('b', {}, title)), row);
      };
      sec.append(picker(t('Night starts at'), 'nightFrom', [17, 18, 19, 20, 21], 19), picker(t('Night ends at'), 'nightTo', [5, 6, 7, 8, 9], 7),
        h('p', {}, (SPG.night.on() ? t('Right now: night.') : t('Right now: day.')) + ' ' + t('Night runs from {from} to {to}.', { from: hourLabel(SPG.night.from()), to: hourLabel(SPG.night.to()) })));
    }
    return sec;
  }

  // Learning and play: what each player has done in the games (read straight from the saved progress) and how long they played this week
  function learnSection() {
    const sec = h('section', {}, h('h3', {}, t('Learning and play')), h('p', { class: 'fine' }, t('What each player has done in the games on this device, and how long they played.')));
    const mins = sec => { if (sec > 0 && sec < 60) return t('less than 1 min'); const m = Math.round(sec / 60); return m < 60 ? t('{m} min', { m }) : t('{h} h {m} min', { h: Math.floor(m / 60), m: m % 60 }); };
    for (const p of store.profiles) {
      const d = p.data || {}, g = k => d[k] || {}, L = g('letters'), done = L.done || {};
      const traced = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => done[c] || done[c.toUpperCase()]);
      const play = d.play || {}, week = Array.from({ length: 7 }, (_, i) => play[dayKey(new Date(Date.now() - i * 864e5))] || 0);
      const rows = [
        [t('Letters traced'), traced.length ? t('{n} of 26: {list}', { n: traced.length, list: traced.join(' ').toUpperCase() }) : t('none yet')],
        [t('Letter games answered right'), L.correct || 0],
        // from the find-the-letter and sounds games: right first time at least twice and mostly right = known; often needing another try = to practise
        [t('Letters known'), Object.keys(L.lt || {}).sort().filter(k => L.lt[k][0] >= 2 && L.lt[k][0] >= L.lt[k][1] * 3).join(' ').toUpperCase()],
        [t('Letters to practise'), Object.keys(L.lt || {}).sort().filter(k => L.lt[k][1] > 0 && L.lt[k][1] * 2 >= L.lt[k][0]).join(' ').toUpperCase()],
        [t('Counting questions right'), L.numOk || 0],
        [t('Adding and taking away right'), L.mathOk || 0],
        [t('Patterns finished (Caterpillars)'), g('pattern').done || 0],
        [t('Friends helped (Feeling Friends)'), g('feelings').helped || 0],
        [t('Things sorted (Tidy Time)'), g('sort').sorted || 0],
        [t('Shape pictures built'), g('shapes').built || 0],
        [t('Puzzles solved'), g('puzzle').solved || 0],
        [t('Tunes copied (Bunny Band)'), g('band').wins || 0],
        [t('Coloring pictures finished'), Object.values(g('color').pics || {}).filter(r => r && r.done).length],
        [t('Recipes cooked'), g('cook').total || 0],
        [t('Kinds of fish caught'), Object.keys(g('fishing').caught || {}).length ? t('{n} of {all}', { n: Object.keys(g('fishing').caught).length, all: 9 }) : 0],
        [t('Flowers grown'), g('garden').blooms || 0],
        [t('Friends found (Hide and Seek)'), g('hide').found || 0]
      ].filter(([, v], i) => i === 0 || v);
      const time = week.some(Boolean) ? t('{today} today, {week} in the last 7 days', { today: mins(week[0]), week: mins(week.reduce((a, b) => a + b, 0)) }) : t('No play time recorded yet');
      sec.append(h('details', { class: 'lvl-block learn' },
        h('summary', {}, h('span', { class: 'lvl-head' }, avatarCanvas(p.avatar, 104), h('span', { class: 'name' }, p.name, h('span', { class: 'stat' }, t('{n} stars', { n: p.stars }) + ' · ' + time))), h('span', { class: 'learn-more' }, t('More'))),
        ...rows.map(([k, v]) => h('div', { class: 'lvl-line' }, h('b', {}, k), h('span', { class: 'fine' }, String(v))))));
    }
    return sec;
  }

  // Age and difficulty (and boy or girl, for the wording of grown-up screens), one block for each player
  function levelSection() {
    const sec = h('section', {}, h('h3', {}, t('Age and difficulty')),
      h('p', {}, t('Pick an exact age and each game picks its own mix of easier and harder things, or pick an age group and every game uses that group’s settings. Open “What the games do” to see exactly what changes. Nothing is ever lost or failed at any level.')));
    for (const p of store.profiles) {
      const cfg = SPG.level.cfg(p), redo = () => renderParent();
      const block = h('div', { class: 'lvl-block' }, h('div', { class: 'lvl-head' }, avatarCanvas(p.avatar, 104), h('div', { class: 'name' }, p.name, h('div', { class: 'stat' }, SPG.level.label(p)))));
      const row = (label, rowEl) => h('div', {}, h('p', { class: 'fine' }, label), rowEl);
      const gSeg = h('div', { class: 'seg', role: 'group', 'aria-label': t('Boy or girl for {name}', { name: p.name }) });
      chipRow(gSeg, [['girl', t('Girl')], ['boy', t('Boy')]], () => p.gender || '', v => { if (v) p.gender = v; else delete p.gender; p.t = Date.now(); store.save(); redo(); });
      const mSeg = h('div', { class: 'seg', role: 'group', 'aria-label': t('How to set the level for {name}', { name: p.name }) });
      chipRow(mSeg, [['age', t('Pick an age')], ['group', t('Pick an age group')]], () => cfg.mode, v => { if (!v) return; SPG.level.set(p, v === 'age' ? { mode: 'age', age: cfg.mode === 'age' ? cfg.age : 4 } : { mode: 'group', group: cfg.mode === 'group' ? cfg.group : 'little' }); redo(); });
      const cSeg = h('div', { class: 'seg', role: 'group', 'aria-label': t('Level for {name}', { name: p.name }) });
      if (cfg.mode === 'age') chipRow(cSeg, SPG.level.AGES.map(a => [a, String(a)]), () => cfg.age, v => { if (v) { SPG.level.set(p, { mode: 'age', age: v }); redo(); } });
      else chipRow(cSeg, SPG.level.GROUPS.map(g => [g.id, `${g.name} (${g.ages})`]), () => cfg.group, v => { if (v) { SPG.level.set(p, { mode: 'group', group: v }); redo(); } });
      const det = h('details', { class: 'vgroup' }, h('summary', {}, t('What the games do')), ...SPG.level.describe(p).map(([g, d]) => h('div', { class: 'lvl-line' }, h('b', {}, g), h('span', { class: 'fine' }, d))));
      block.append(row(t('Boy or girl'), gSeg), row(t('How should the level be chosen?'), mSeg), row(cfg.mode === 'age' ? t('Age') : t('Age group'), cSeg), det);
      sec.append(block);
    }
    return sec;
  }

  // Kitchen photos: the camera button in Sprout Kitchen keeps photos in the game's own album; a grown-up can also let them go to the device's photos
  function photoSection() {
    const app = SPG.native && SPG.native.isApp, ios = safe.isIOS && !app;
    const sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(!!store.settings.photoSave), 'aria-label': t('Save kitchen photos to this device') });
    sw.addEventListener('click', () => { store.settings.photoSave = !store.settings.photoSave; store.saveSettings(); sw.setAttribute('aria-checked', String(store.settings.photoSave)); });
    const count = h('p', { class: 'fine' }, t('Counting photos…'));
    if (SPG.photos) SPG.photos.count('kitchen').then(n => { count.textContent = n === 1 ? t('1 photo in the kitchen album on this device (the newest 60 for each player are kept).') : t('{n} photos in the kitchen album on this device (the newest 60 for each player are kept).', { n }); });
    const clear = confirmButton(t('Delete all kitchen photos'), 'danger', async () => { if (SPG.photos) await SPG.photos.clear('kitchen'); renderParent(); });
    const clayCount = h('p', { class: 'fine' }, t('Counting clay pictures…'));
    if (SPG.photos) SPG.photos.count('clay').then(n => { clayCount.textContent = (n === 1 ? t('1 picture in the Clay Corner album on this device (the newest 60 for each player are kept).') : t('{n} pictures in the Clay Corner album on this device (the newest 60 for each player are kept).', { n })) + ' ' + t('The clay a child is working on is kept too, until they start over.'); });
    const clayClear = confirmButton(t('Delete all clay pictures'), 'danger', async () => { if (SPG.photos) await SPG.photos.clear('clay'); renderParent(); });
    return h('section', {}, h('h3', {}, t('Photos and pictures')),
      h('p', {}, t('In Sprout Kitchen the camera button takes a photo of the food your child made, and in Clay Corner it takes a picture of the clay creation. Pictures are always kept in the game’s own album, on this device only.')),
      h('p', {}, app ? t('In the Coloring Book the Save picture button always puts the finished picture into this phone’s photo gallery (album “Sprout Park”). Every picture also stays in the Coloring Book’s own gallery.') : t('In the Coloring Book the Save picture button downloads the picture to this device. Every picture also stays in the Coloring Book’s own gallery.')),
      ios ? h('p', { class: 'fine' }, t('On iPhone and iPad the photos stay in the kitchen album.')) : h('div', { class: 'setting' }, h('span', {}, app ? t('Also save them to this phone’s photo gallery (album “Sprout Park”)') : t('Also save them to this device (as a download)')), sw),
      count, clear,
      h('h4', {}, t('Clay Corner pictures')),
      h('p', {}, t('The camera in Clay Corner takes a picture of the clay creation. Pictures are kept in the game’s own album, and the same switch above also sends them to the device’s photo gallery.')),
      clayCount, clayClear);
  }

  function pinSection() {
    const has = !!store.settings.pin;
    const set = h('button', { class: 'btn small go', type: 'button' }, has ? t('Change PIN') : t('Set a PIN'));
    const setNew = () => askPin(first => askPin(again => {
      if (again !== first) { SPG.sfx.oops(); pinNote = t('Those two did not match. Please try again.'); renderParent(); return; }
      hashPin(first).then(hx => { store.settings.pin = hx; store.saveSettings(); pinNote = t('PIN saved. Remember it: it opens the rest screen and this panel.'); renderParent(); });
    }, { capture: true, title: t('Type it again'), prompt: t('Type the same PIN again'), hint: t('Just to be sure') }), { capture: true, title: has ? t('New PIN') : t('Choose a PIN'), prompt: t('Choose 4 numbers'), hint: t('Pick numbers only you know') });
    set.addEventListener('click', () => { if (has) askPin(setNew); else setNew(); });
    const kids = [set];
    if (has) {
      const off = h('button', { class: 'btn small quiet', type: 'button' }, t('Remove PIN'));
      off.addEventListener('click', () => askPin(() => { store.settings.pin = ''; store.saveSettings(); pinNote = t('PIN removed. The grown-up question is used again.'); renderParent(); }));
      kids.push(off);
    }
    const note = pinNote; pinNote = '';
    return h('section', {}, h('h3', {}, t('Grown-up PIN')),
      h('p', {}, has ? t('A PIN is set. It is needed to close the rest screen and to open this panel.') : t('No PIN yet: a spelled-out sum is used to keep little fingers out. Set a 4-number PIN for a stronger lock on the rest screen and this panel.')),
      h('div', { class: 'row' }, ...kids), note ? h('p', { class: 'fine' }, note) : null);
  }
  let pinNote = '';
  // fingerprint / screen lock as another way to open the grown-up areas (only offered if this device can do it)
  let deviceAuthOk = null;
  function deviceAuthSection() {
    if (deviceAuthOk === null) { deviceAuthOk = false; SPG.native.deviceAuth.available().then(v => { if (v) { deviceAuthOk = true; renderParent(); } }); }
    if (!deviceAuthOk) return null;
    const on = !!store.settings.deviceAuth;
    const btn = h('button', { class: 'btn small ' + (on ? 'quiet' : 'go'), type: 'button' }, on ? t('Turn off') : t('Turn on'));
    btn.addEventListener('click', async () => {
      if (on) { store.settings.deviceAuth = ''; store.saveSettings(); pinNote = t('Fingerprint / phone lock is off.'); renderParent(); return; }
      const tok = await SPG.native.deviceAuth.enroll();
      if (tok) { store.settings.deviceAuth = tok; store.saveSettings(); pinNote = t('Done. The grown-up screens now also have a "Use fingerprint or phone lock" button. The PIN still works too.'); } else pinNote = t('That did not work, so it was not turned on.');
      renderParent();
    });
    return h('section', {}, h('h3', {}, t('Fingerprint or phone lock')),
      h('p', {}, on ? t('On: grown-up screens can be opened with this device’s fingerprint, face or screen lock, as well as the PIN or question.') : t('Let a grown-up open the grown-up screens with this device’s own fingerprint, face or screen lock, as well as the PIN. It stays on this device.')),
      h('div', { class: 'row' }, btn));
  }

  function timerSection() {
    const cur = store.settings.timer || 0;
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': t('Daily play time') });
    for (const m of [0, 15, 30, 45, 60]) {
      const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(cur === m) }, m ? t('{m} min', { m }) : t('No limit'));
      b.addEventListener('click', () => { store.settings.timer = m; store.saveSettings(); renderParent(); });
      seg.append(b);
    }
    const used = Math.floor(playLog().sec / 60);
    const reset = h('button', { class: 'btn small quiet', type: 'button' }, t('Give more time today'));
    reset.addEventListener('click', () => { playLog().sec = 0; store.saveSettings(); renderParent(); });
    return h('section', {}, h('h3', {}, t('Play time')),
      h('p', {}, t('When the daily limit is reached, a friendly rest screen appears. It can only be closed by a grown-up.')),
      seg, h('p', { class: 'fine' }, t('Played today: {m} min', { m: used })), reset);
  }

  /* ------------------------------------------------------------ safe mode wiring */
  safe.onBack = () => {
    if (!overlays.gate.classList.contains('hidden')) { gateState = null; closeOverlay(overlays.gate); return; }
    if (!overlays.vintro.classList.contains('hidden')) return;
    if (!overlays.studio.classList.contains('hidden')) { closeStudio(); return; }
    if (!overlays.signvid.classList.contains('hidden')) { closeSignVideos(); return; }
    if (!overlays.parent.classList.contains('hidden')) { closeParent(); return; }
    if (!overlays.fs.classList.contains('hidden') || !overlays.brk.classList.contains('hidden')) return;
    if (current === 'stage') { if (!running?.inst?.back?.()) closeGame(); }
    else if (current === 'setup' && store.profiles.length) renderWho();
  };
  safe.onFullscreenLost = () => openOverlay(overlays.fs);
  $('fs-play').addEventListener('click', () => { safe.enterFullscreen(); closeOverlay(overlays.fs); });

  document.addEventListener('visibilitychange', syncPause);
  let resizeTimer = 0;
  const onResize = () => { hubFrozen = true; clearTimeout(resizeTimer); resizeTimer = setTimeout(() => {
    running?.inst?.resize?.();
    // turning the phone changes how many fit on a page: rebuild the pages and stay on the same games
    if (perPage() !== hubPer && $('hub-games').firstChild) { hubPage = Math.floor(hubFirst / perPage()); renderCards(); }
    drawCards();
    setTimeout(() => { hubFrozen = false; }, 150);
  }, 60); };
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  window.visualViewport?.addEventListener('resize', onResize);

  /* ------------------------------------------------------------ boot */
  safe.init();
  SPG.night.apply(); setInterval(() => SPG.night.apply(), 60000);
  renderCards();
  if (store.profiles.length) { store.setActive(store.active?.id ?? store.profiles[0].id); renderWho(); } else openSetup(false);
  if ('serviceWorker' in navigator && !(SPG.native && SPG.native.isApp) && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }
  SPG.app = { closeGame, show, running: () => running, askGate, askPin };
})();
