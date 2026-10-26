// The grown-ups "Voices" screen: record your own voice for every line, pick which voice the games
// use, mute lines you don't want, and turn praise down. Recordings live on this tablet.
(() => {
  const SPG = window.SPG;
  const { voice, store } = SPG;
  const t = SPG.t;   // the text in the chosen language (js/i18n.js)

  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    el.append(...kids.flat().filter(k => k != null));
    return el;
  };

  let activeSet = 'male';
  let recording = null;      // { key, ctl, timer }
  const openGroups = new Set(['praise']);
  let message = '';
  let adding = null;         // null, or { name } while the 'add a voice' form is open
  let confirmDel = null;     // id of a voice waiting for a yes/no
  let guide = null;          // the step-by-step recorder: { picking, queue, i, phase, t0, dur, editing, raf }

  function seg(options, current, onPick, label) {
    const box = h('div', { class: 'seg', role: 'group', 'aria-label': label });
    for (const [value, text] of options) {
      const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(current === value) }, text);
      b.addEventListener('click', () => onPick(value));
      box.append(b);
    }
    return box;
  }
  const sw = (checked, label, onChange) => {
    const b = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(checked), 'aria-label': label });
    b.addEventListener('click', () => { checked = !checked; b.setAttribute('aria-checked', String(checked)); onChange(checked); });
    return b;
  };

  const redraw0 = body => () => render(body);

  function render(body) {
    const scroller = body.closest('[data-scroll]'), top = scroller ? scroller.scrollTop : 0;
    for (const p of store.profiles) { voice.custom['player/' + p.id] = SPG.t('Hi {name}!', { name: p.name }); voice.custom['pname/' + p.id] = p.name; }
    voice.syncSets();
    if (!voice.SETS.some(x => x.id === activeSet)) activeSet = 'male';
    const keys = voice.allKeys();
    if (guide) { renderGuide(body, keys, redraw0(body)); if (scroller) scroller.scrollTop = 0; return; }
    const countFor = set => keys.filter(k => voice.hasClip(set, k)).length;
    const muted = new Set(store.settings.muted || []);
    const redraw = () => render(body);

    body.replaceChildren(...[
      h('p', { class: 'lead' }, SPG.config.recorder ? t('Record your own voice for the games: just the short list below (about 100 lines). Choose who is recording, open a group, tap Record, say the line, and tap Stop. Anything you skip keeps using the tablet’s built-in voice.') : t('Choose which voice the games use, switch off lines you don’t want, and set how often the games cheer.')),
      message ? h('p', { class: 'notice' }, message) : null,
      SPG.config.recorder ? h('h3', {}, t('Who is recording?')) : null,
      SPG.config.recorder ? seg(voice.SETS.map(s => [s.id, `${s.name} (${countFor(s.id)}/${keys.length})`]), activeSet, id => { if (recording) return; activeSet = id; confirmDel = null; message = ''; redraw(); }, t('Who is recording')) : null,
      SPG.config.recorder ? voiceTools(redraw) : null,
      SPG.config.recorder ? guideButton(redraw) : null,
      h('h3', {}, t('Which voice do the games use?')),
      seg([['mix', t('Everyone, mixed')], ...voice.SETS.map(s => [s.id, t('{name} only', { name: s.name })]), ['builtin', t('Built-in only')]], store.settings.voicePref || 'mix', v => { store.settings.voicePref = v; store.save(); redraw(); }, t('Voice used in games')),
      (store.settings.voicePref || 'mix') === 'mix' && voice.SETS.length > 2 ? h('div', { class: 'vmix' }, h('p', { class: 'fine' }, t('Mixed means each line is said by one of the voices below that has recorded it. Switch a voice off to leave it out of the mix.')),
        ...voice.SETS.map(s => h('div', { class: 'setting' }, h('span', {}, t('{name} ({n} lines)', { name: s.name, n: countFor(s.id) })), sw(!(store.settings.voiceOff || []).includes(s.id), t('Include {name}', { name: s.name }), on => {
          const off = new Set(store.settings.voiceOff || []); on ? off.delete(s.id) : off.add(s.id); store.settings.voiceOff = [...off]; store.save();
        })))) : null,
      ttsPicker(redraw),
      h('h3', {}, t('How often should the games cheer?')),
      seg([['lots', t('Every time')], ['some', t('Sometimes')], ['off', t('Never')]], store.settings.praise || 'some', v => { store.settings.praise = v; store.save(); redraw(); }, t('Cheering frequency')),
      h('p', { class: 'fine' }, t('Recordings are saved on this tablet only. Each line can be switched off with its own switch, and you can hear what each line sounds like with Hear.')),
      ...voice.GROUPS.map(g => group(g, keys, muted, redraw)),
      moreSection(muted, redraw)
    ].filter(Boolean));
    if (scroller) scroller.scrollTop = top;
  }

  // Lines nobody has recorded are read out by the device's own speaking voice. Phones have several; this picks one by ear.
  function ttsPicker(redraw) {
    const ch = voice.ttsChoices(); if (!ch.female.length && !ch.male.length && !ch.other.length) return null;
    const chosen = voice.ttsChosen(), box = h('div', { class: 'vtools vchoices' }, h('h3', {}, t('Built-in speaking voice')),
      h('p', { class: 'fine' }, t('Used for any line that nobody has recorded. Touch a voice to choose it and hear it. The most natural ones are listed first; some need the internet.')));
    const pick = id => { voice.setTtsVoice(id); voice.hearTts(); redraw(); };
    const auto = h('button', { class: 'btn small' + (chosen ? ' quiet' : ' go'), type: 'button' }, t('Best one for me (automatic)') + (voice.ttsCurrentName() && !chosen ? ' · ' + t('now: {name}', { name: voice.ttsCurrentName() }) : ''));
    auto.addEventListener('click', () => pick(''));
    box.append(h('div', { class: 'setting' }, auto));
    const group = (title, list) => {
      if (!list.length) return;
      box.append(h('h4', { class: 'vgroup' }, title));
      const row = h('div', { class: 'vrow' });
      for (const v of list) {
        const b = h('button', { class: 'vchoice' + (chosen === v.id ? ' on' : ''), type: 'button', 'aria-pressed': chosen === v.id ? 'true' : 'false' },
          h('span', { class: 'vn' }, (chosen === v.id ? '✓ ' : '▶ ') + v.label), h('span', { class: 'vt' }, v.tag));
        b.addEventListener('click', () => pick(v.id)); row.append(b);
      }
      box.append(row);
    };
    group(t('Female voices'), ch.female); group(t('Male voices'), ch.male); group(t('More voices'), ch.other);
    box.append(h('p', { class: 'fine' }, SPG.i18n.lang() === 'en' ? 'Want more or better voices? On Android open Settings > System > Languages > Text-to-speech output, choose Google or Samsung text-to-speech, then install an English (US, UK or Australia) voice from its settings. They appear here by themselves.' : t('Want more or better voices? On Android open Settings > System > Languages > Text-to-speech output, choose Google or Samsung text-to-speech, then install a {lang} voice from its settings. They appear here by themselves.', { lang: SPG.i18n.info().native })));
    return box;
  }

  // Add, rename and remove extra voices (grandparents, cousins, the child herself...).
  function voiceTools(redraw) {
    const cur = voice.SETS.find(x => x.id === activeSet);
    const box = h('div', { class: 'vtools' });
    if (adding) {
      const input = h('input', { type: 'text', maxlength: '24', placeholder: t('Name, like Grandma'), 'aria-label': t('Name of the new voice'), value: adding.name || '' });
      input.addEventListener('input', () => { adding.name = input.value; });
      const ok = h('button', { class: 'btn small', type: 'button' }, adding.rename ? t('Save name') : t('Add voice'));
      const no = h('button', { class: 'btn small quiet', type: 'button' }, t('Cancel'));
      const go = () => { const name = (input.value || '').trim(); if (!name) { input.focus(); return; } if (adding.rename) { voice.renameVoice(adding.rename, name); } else { activeSet = voice.addVoice(name); } adding = null; message = ''; redraw(); };
      ok.addEventListener('click', go); no.addEventListener('click', () => { adding = null; redraw(); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      box.append(h('div', { class: 'setting' }, input, ok, no)); setTimeout(() => input.focus(), 50);
      return box;
    }
    const add = h('button', { class: 'btn small', type: 'button', disabled: !!recording }, SPG.pron.fill(t('＋ Add a voice (grandparent, family, or {their} own)')));
    add.addEventListener('click', () => { adding = { name: '' }; redraw(); });
    box.append(add);
    if (cur && cur.extra) {
      if (confirmDel === cur.id) {
        const yes = h('button', { class: 'btn small danger', type: 'button' }, t('Yes, delete {name} and every recording', { name: cur.name }));
        const no = h('button', { class: 'btn small quiet', type: 'button' }, t('No, keep'));
        yes.addEventListener('click', async () => { await voice.removeVoice(cur.id); confirmDel = null; activeSet = 'male'; redraw(); });
        no.addEventListener('click', () => { confirmDel = null; redraw(); });
        box.append(h('div', { class: 'setting' }, yes, no));
      } else {
        const ren = h('button', { class: 'btn small quiet', type: 'button', disabled: !!recording }, t('Rename'));
        const del = h('button', { class: 'btn small danger', type: 'button', disabled: !!recording }, t('Delete this voice'));
        ren.addEventListener('click', () => { adding = { name: cur.name, rename: cur.id }; redraw(); });
        del.addEventListener('click', () => { confirmDel = cur.id; redraw(); });
        box.append(ren, del);
      }
    }
    return box;
  }

  // The optional lines: nobody has to record these. They are only spoken with "Extra audio help", or by the built-in voice.
  function moreSection(muted, redraw) {
    const more = voice.moreKeys(); if (!more.length) return null;
    const det = h('details', { class: 'vgroup vmore', open: openGroups.has('more') });
    det.addEventListener('toggle', () => { det.open ? openGroups.add('more') : openGroups.delete('more'); });
    det.append(h('summary', {}, t('More lines (optional, {n})', { n: more.length }) + ' ', h('span', { class: 'fine' }, t('you never need to record these'))));
    det.append(h('p', { class: 'fine' }, t('Everything above is the short list that matters. These extra lines (the names of things, extra hints, animal sounds) are left to the built-in voice, and most of them are only said when “Extra audio help” is on in Grown-ups. Record any you like.')));
    for (const g of voice.GROUPS) { const el = group(g, more, muted, redraw, 'more-'); if (el) det.append(el); }
    return det;
  }

  function group(g, allKeys, muted, redraw, idp = '') {
    const list = allKeys.filter(k => voice.groupOf(k) === g);
    if (!list.length) return null;
    const done = list.filter(k => voice.hasClip(activeSet, k)).length;
    const det = h('details', { class: 'vgroup', open: openGroups.has(idp + g.id) });
    det.addEventListener('toggle', () => { det.open ? openGroups.add(idp + g.id) : openGroups.delete(idp + g.id); });
    det.append(h('summary', {}, `${g.title} `, h('span', { class: 'fine' }, t('{done}/{all} recorded', { done, all: list.length }))));
    det.append(h('p', { class: 'fine' }, SPG.pron.fill(g.note)));
    const allOn = list.every(k => !muted.has(k));
    det.append(h('div', { class: 'setting' }, h('span', {}, t('Use this group in the games')), sw(allOn, t('Use {name}', { name: g.title }), on => {
      const m = new Set(store.settings.muted || []);
      for (const k of list) on ? m.delete(k) : m.add(k);
      store.settings.muted = [...m]; store.save(); redraw();
    })));
    for (const k of list) det.append(row(k, muted, redraw));
    return det;
  }

  function row(key, muted, redraw) {
    const sound = key in voice.SOUNDS;
    const has = voice.hasClip(activeSet, key), mine = voice.hasDeviceClip(activeSet, key);
    const isRec = recording && recording.key === key;
    const r = h('div', { class: 'vrow' + (has ? ' done' : '') });
    const rec = !SPG.config.recorder ? null : h('button', { class: 'btn small vrec' + (isRec ? ' rec-on' : ''), type: 'button', disabled: recording && !isRec }, isRec ? t('■ Stop') : (has ? t('● Re-record') : t('● Record')));
    if (rec) rec.addEventListener('click', () => (isRec ? finish(redraw) : start(key, redraw)));
    const hear = h('button', { class: 'btn small quiet', type: 'button', disabled: sound && !has }, t('Hear'));
    hear.addEventListener('click', async () => {
      if (has) await voice.previewClip(activeSet, key); else voice.say({ say: voice.spokenFor(key) });
    });
    const edit = h('button', { class: 'btn small quiet', type: 'button', 'aria-label': t('Change the words') }, t('Edit'));
    edit.addEventListener('click', () => { const n = prompt('What should this line say?', voice.textFor(key)); if (n !== null) { voice.setText(key, n); redraw(); } });
    const parts = [
      h('div', { class: 'vrow-text' }, h('b', {}, voice.textFor(key)), voice.isReworded(key) ? h('div', { class: 'fine' }, t('Reworded (original: {text})', { text: voice.originalText(key) })) : null, sound ? h('div', { class: 'fine' }, t('Just make the noise')) : null),
      rec, hear, edit
    ].filter(Boolean);
    if (mine) {
      const del = h('button', { class: 'btn small danger', type: 'button' }, t('Delete'));
      del.addEventListener('click', async () => { await voice.deleteClip(activeSet, key); redraw(); });
      parts.push(del);
    }
    parts.push(sw(!muted.has(key), t('Use “{text}” in the games', { text: voice.textFor(key) }), on => {
      const m = new Set(store.settings.muted || []); on ? m.delete(key) : m.add(key); store.settings.muted = [...m]; store.save();
    }));
    r.append(...parts);
    return r;
  }

  /* ------------------------------------------------------------ guided, one line at a time */
  const words = s => (/[\u3000-\u9fff]/.test(s) ? [...String(s).replace(/\s+/g, '')] : String(s).split(/\s+/).filter(Boolean));   // Chinese has no spaces: one character each
  const expectedSecs = s => Math.max(1.6, words(s).length * (/[\u3000-\u9fff]/.test(s) ? .28 : .55) + .9);
  function guideButton(redraw) {
    const b = h('button', { class: 'btn guide-start', type: 'button', disabled: !!recording }, t('▶ Guided recording: one line at a time'));
    b.addEventListener('click', () => { guide = { picking: true, skip: 'mine' }; redraw(); });
    return h('div', { class: 'vtools' }, b, h('span', { class: 'fine' }, t('Easiest way to record: it shows one line, you say it, the bar fills as you speak, and it moves on to the next line. Pause or switch to another person at any time.')));
  }
  const setName = () => (voice.SETS.find(x => x.id === activeSet) || {}).name || '';
  // Is this line already covered, given who is recording and the skip rule?
  const covered = key => guide.skip === 'none' ? false : guide.skip === 'anyone' ? voice.SETS.some(x => voice.hasClip(x.id, key)) : voice.hasDeviceClip(activeSet, key);
  const nextIndex = from => { for (let n = from; n < guide.queue.length; n++) if (!covered(guide.queue[n])) return n; return -1; };
  // Chips to switch who is recording, at any moment (different adults can take different lines).
  function whoChips(redraw, disabled) {
    return seg(voice.SETS.map(x => [x.id, x.name]), activeSet, id => { if (disabled) return; activeSet = id; confirmDel = null; message = ''; redraw(); }, t('Who is recording now'));
  }
  function renderGuide(body, keys, redraw) {
    cancelAnimationFrame(guide.raf); clearTimeout(guide.auto);
    const close = h('button', { class: 'btn quiet', type: 'button' }, guide.picking ? t('← Back to voices') : t('✕ Stop guided recording'));
    close.addEventListener('click', () => { abort(); guide = null; redraw(); });
    if (guide.picking) {
      const list = h('div', { class: 'guide-groups' });
      const start = ks => {
        guide = { queue: ks, i: 0, phase: 'ready', skip: guide.skip };
        const n = nextIndex(0);
        if (n < 0) { message = t('Everything in that group is already recorded.'); guide = null; redraw(); return; }
        guide.i = n; redraw();
      };
      const order = ['prompts', 'praise', 'names', 'numbers', 'letters', 'sounds', 'words', 'friends', 'critters', 'purrs', 'style', 'kitchen', 'players'];
      const gs = order.map(id => voice.GROUPS.find(g => g.id === id)).filter(Boolean);
      const all = keys.filter(k => voice.groupOf(k));
      const btnAll = h('button', { class: 'btn', type: 'button' }, t('All of them, in order ({n} lines)', { n: all.length }));
      btnAll.addEventListener('click', () => start(gs.flatMap(g => keys.filter(k => voice.groupOf(k) === g))));
      list.append(btnAll);
      for (const g of gs) {
        const ks = keys.filter(k => voice.groupOf(k) === g); if (!ks.length) continue;
        const left = ks.filter(k => !voice.hasDeviceClip(activeSet, k)).length;
        const b = h('button', { class: 'btn quiet', type: 'button' }, `${g.title} (${left ? t('{n} to record for {name}', { n: left, name: setName() }) : t('all recorded ✓')})`);
        b.addEventListener('click', () => start(ks)); list.append(b);
      }
      body.replaceChildren(close, h('h2', { class: 'guide-h' }, t('Guided recording')),
        h('h3', {}, t('Who is recording?')), whoChips(redraw, false),
        h('h3', {}, t('Which lines?')), seg([['mine', t('Only lines this person hasn’t recorded')], ['anyone', t('Only lines nobody has recorded')], ['none', t('Every line')]], guide.skip, v => { guide.skip = v; redraw(); }, t('Which lines to include')),
        h('p', { class: 'fine' }, t('With several adults: pick “nobody has recorded”, record some lines, then switch to the next person on the recording screen and keep going. Each line is saved for whoever is chosen when they record it.')),
        h('h3', {}, t('Where should we start?')), list);
      return;
    }
    const key = guide.queue[guide.i], text = voice.textFor(key), sound = key in voice.SOUNDS;
    const total = guide.queue.length;
    const doneCount = guide.queue.filter(k => voice.hasClip(activeSet, k)).length;
    const pauseB = h('button', { class: 'btn quiet', type: 'button' }, t('⏸ Pause'));
    pauseB.addEventListener('click', () => { abort(); guide.resume = guide.phase === 'rec' ? 'ready' : guide.phase; guide.phase = 'paused'; redraw(); });
    if (guide.phase === 'paused') {
      const resume = h('button', { class: 'btn guide-rec', type: 'button' }, t('▶ Keep going'));
      resume.addEventListener('click', () => { guide.phase = guide.resume === 'done' ? 'ready' : (guide.resume || 'ready'); const n = nextIndex(guide.i); if (guide.resume === 'done' && n >= 0) guide.i = n; redraw(); });
      body.replaceChildren(close, h('h2', { class: 'guide-h' }, t('Paused')), h('p', { class: 'lead' }, t('Next up: “{text}”. Take your time. You can hand the tablet to someone else and switch who is recording.', { text })),
        h('h3', {}, t('Who is recording next?')), whoChips(redraw, false), h('div', { class: 'guide-controls' }, resume), h('p', { class: 'fine' }, t('{done} of {all} lines in this list have a recording from {name}.', { done: doneCount, all: total, name: setName() })));
      return;
    }
    const card = h('div', { class: 'guide-card' });
    const bar = h('div', { class: 'guide-bar' }, h('i', {})), fill = bar.firstChild;
    const phrase = h('div', { class: 'guide-text' + (sound ? ' sound' : '') });
    const cjk = /[\u3000-\u9fff]/.test(text), parts = words(text).map(w => h('span', {}, cjk ? w : w + ' ')); phrase.append(...parts);
    const time = h('div', { class: 'guide-time fine' }, guide.phase === 'ready' ? t('Ready when you are') : '');
    const g = voice.groupOf(key);
    card.append(h('div', { class: 'guide-count fine' }, `${g ? g.title + ' · ' : ''}${t('line {n} of {all}', { n: guide.i + 1, all: total })}`),
      h('div', { class: 'guide-say fine' }, sound ? t('Make this noise:') : t('Say:')), phrase, bar, time);
    const controls = h('div', { class: 'guide-controls' });
    const paint = frac => { fill.style.width = Math.round(frac * 100) + '%'; const on = Math.round(frac * parts.length); parts.forEach((sp, n) => sp.classList.toggle('said', n < on)); };
    const advance = () => { const n = nextIndex(guide.i + 1); if (n < 0) { guide = null; message = t('All done! Every line in that list has a recording.'); redraw(); } else { guide.i = n; guide.phase = 'ready'; redraw(); } };
    const prevBtn = h('button', { class: 'btn quiet', type: 'button', disabled: guide.i === 0 || guide.phase === 'rec' }, t('← Back'));
    prevBtn.addEventListener('click', () => { guide.i--; guide.phase = 'ready'; redraw(); });
    const skip = h('button', { class: 'btn quiet', type: 'button', disabled: guide.phase === 'rec' }, t('Skip →'));
    skip.addEventListener('click', advance);
    const edit = h('button', { class: 'btn quiet', type: 'button', disabled: guide.phase === 'rec' }, t('✎ Change the words'));
    edit.addEventListener('click', () => { guide.phase = 'edit'; redraw(); });
    if (guide.phase === 'edit') {
      const input = h('input', { type: 'text', maxlength: '120', value: text, 'aria-label': t('What this line says') });
      const save = h('button', { class: 'btn', type: 'button' }, t('Save words')), reset = h('button', { class: 'btn quiet', type: 'button' }, t('Use the original'));
      save.addEventListener('click', () => { voice.setText(key, input.value); guide.phase = 'ready'; redraw(); });
      reset.addEventListener('click', () => { voice.setText(key, ''); guide.phase = 'ready'; redraw(); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') save.click(); });
      body.replaceChildren(close, h('h2', { class: 'guide-h' }, t('What should this line say?')), h('p', { class: 'fine' }, 'Original: ' + voice.originalText(key)), input, h('div', { class: 'guide-controls' }, save, reset));
      setTimeout(() => input.focus(), 60); return;
    }
    if (guide.phase === 'ready') {
      const rec = h('button', { class: 'btn guide-rec', type: 'button' }, t('● Record'));
      rec.addEventListener('click', async () => {
        try { const ctl = await voice.startRecording(); recording = { key, ctl, timer: setTimeout(() => guideStop(redraw), 8000) }; guide.phase = 'rec'; guide.t0 = performance.now(); guide.exp = expectedSecs(textNow(key)); redraw(); }
        catch (e) { message = t('The microphone is not available. Allow microphone access when the tablet asks, then try again.'); guide = null; redraw(); }
      });
      const has = voice.hasDeviceClip(activeSet, key);
      controls.append(prevBtn, rec, skip);
      if (has) { const hear = h('button', { class: 'btn quiet', type: 'button' }, t('▶ Hear my recording')); hear.addEventListener('click', () => voice.previewClip(activeSet, key)); controls.append(hear); paint(1); time.textContent = t('Already recorded. Record again to replace it.'); }
      controls.append(edit, pauseB);
    } else if (guide.phase === 'rec') {
      const stop = h('button', { class: 'btn guide-rec on', type: 'button' }, t('■ Stop'));
      stop.addEventListener('click', () => guideStop(redraw));
      controls.append(stop, pauseB);
      const tick = () => { const el = (performance.now() - guide.t0) / 1000; paint(Math.min(1, el / guide.exp)); time.textContent = t('Recording… {s} s', { s: el.toFixed(1) }); if (guide.phase === 'rec') guide.raf = requestAnimationFrame(tick); };
      tick();
    } else if (guide.phase === 'done') {
      paint(1);
      const more = nextIndex(guide.i + 1) >= 0;
      time.textContent = t('Recorded! {s} seconds', { s: guide.dur.toFixed(1) }) + (more ? ' · ' + t('next line in a moment…') : '');
      const hear = h('button', { class: 'btn quiet', type: 'button' }, t('▶ Hear it')); hear.addEventListener('click', () => { clearTimeout(guide.auto); voice.previewClip(activeSet, key); });
      const redo = h('button', { class: 'btn quiet', type: 'button' }, t('↺ Record again')); redo.addEventListener('click', () => { clearTimeout(guide.auto); guide.phase = 'ready'; redraw(); });
      const nextB = h('button', { class: 'btn guide-rec', type: 'button' }, more ? t('Next line →') : t('✓ Finish')); nextB.addEventListener('click', () => { clearTimeout(guide.auto); advance(); });
      controls.append(hear, redo, nextB, pauseB);
      guide.auto = setTimeout(() => { if (guide && guide.phase === 'done') advance(); }, 2200);   // it moves on by itself
    }
    body.replaceChildren(...[close, message ? h('p', { class: 'notice' }, message) : null,
      h('div', { class: 'guide-who' }, h('span', { class: 'fine' }, t('Recording as')), whoChips(redraw, guide.phase === 'rec')),
      card, controls, h('div', { class: 'guide-prog fine' }, t('{done} of {all} lines in this list have a recording from {name}.', { done: doneCount, all: total, name: setName() }))].filter(Boolean));
  }
  const textNow = key => voice.textFor(key);
  async function guideStop(redraw) {
    const r = recording; if (!r || !guide) return;
    recording = null; clearTimeout(r.timer); cancelAnimationFrame(guide.raf);
    try {
      const blob = await r.ctl.stop(); const buf = await voice.saveClip(activeSet, r.key, blob);
      guide.dur = (buf._trim && buf._trim[1]) || buf.duration; guide.phase = 'done'; message = '';
    } catch (e) { message = t('That recording could not be saved. Please try again.'); guide.phase = 'ready'; }
    redraw();
  }

  async function start(key, redraw) {
    message = '';
    try {
      const ctl = await voice.startRecording();
      recording = { key, ctl, timer: setTimeout(() => finish(redraw), 8000) };
    } catch (e) {
      message = t('The microphone is not available. Allow microphone access when the tablet asks (or in the site settings), then try again.');
    }
    redraw();
  }

  async function finish(redraw) {
    const r = recording; if (!r) return;
    recording = null; clearTimeout(r.timer);
    try { const blob = await r.ctl.stop(); await voice.saveClip(activeSet, r.key, blob); message = ''; }
    catch (e) { message = t('That recording could not be saved. Please try again.'); }
    redraw();
  }

  // Called when the screen is closed mid-recording.
  function abort() { if (recording) { clearTimeout(recording.timer); recording.ctl.cancel(); recording = null; } if (guide) { cancelAnimationFrame(guide.raf); clearTimeout(guide.auto); } }

  /* ------------------------------------------------------------ first-run prompt for grown-ups */
  // Shown once, right after the first player is made: pick the people who will record (5-10 is a good number, their
  // choice), then either start recording or come back later. The voices live in Grown-ups > Voices from then on.
  const FAMILY = [t('Mom'), t('Dad'), t('Grandma'), t('Grandpa'), t('Auntie'), t('Uncle'), t('Big sister'), t('Big brother'), t('Cousin'), t('Friend')];
  const MAX_PEOPLE = 10;
  function intro(body, done) {
    const have = (store.settings.voices || []).map(v => v.name);
    const picked = new Set(have.length ? have : FAMILY.slice(0, 2));
    const names = [...new Set([...FAMILY, ...have])];
    let note = '', step = 1, made = [];
    const draw = () => {
      if (step === 2) {
        const first = made[0];
        const rec = h('button', { class: 'btn go', type: 'button' }, first ? t('● Record now, starting with {name}', { name: first.name }) : t('✓ Done'));
        rec.addEventListener('click', () => done(first ? 'record' : 'later', first && first.id));
        const later = h('button', { class: 'btn quiet', type: 'button' }, first ? t('I’ll record later') : '');
        later.addEventListener('click', () => done('later'));
        body.replaceChildren(...[h('h2', { class: 'guide-h' }, made.length ? (made.length === 1 ? t('1 voice is ready') : t('{n} voices are ready', { n: made.length })) : t('No voices added')),
          made.length ? h('p', { class: 'lead' }, made.map(v => v.name).join(', ') + '.') : null,
          h('p', { class: 'lead' }, t('Recording is easy: the tablet shows one line at a time, you say it, and it moves on by itself. You can pause, and hand the tablet to the next person, whenever you like. Until someone records a line, the games use the tablet’s built-in voice.')),
          h('p', { class: 'lead' }, t('Mix and match: the games take turns between everyone who has recorded, so a line might be said by Mom, then Grandpa, then Dad. You can add more people, record more lines or switch anyone off at any time in Grown-ups, then Voices.')),
          h('div', { class: 'guide-controls' }, rec, first ? later : null)].filter(Boolean));
        return;
      }
      const chips = h('div', { class: 'vtools vchips' }, ...names.map(n => {
        const b = h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(picked.has(n)) }, n);
        b.addEventListener('click', () => { if (picked.has(n)) picked.delete(n); else if (picked.size >= MAX_PEOPLE) { note = t('That’s {n} people. Un-pick someone to choose another. You can add more later.', { n: MAX_PEOPLE }); draw(); return; } else picked.add(n); note = ''; draw(); });
        return b;
      }));
      const input = h('input', { type: 'text', maxlength: '24', placeholder: t('Someone else, like Nana'), 'aria-label': t('Another name') });
      const addB = h('button', { class: 'btn small', type: 'button' }, t('＋ Add'));
      const addIt = () => { const n = input.value.trim(); if (!n) return; if (picked.size >= MAX_PEOPLE && !picked.has(n)) { note = t('That’s {n} people. You can add more later.', { n: MAX_PEOPLE }); draw(); return; } if (!names.includes(n)) names.push(n); picked.add(n); note = ''; draw(); };
      addB.addEventListener('click', addIt); input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addIt(); } });
      const go = h('button', { class: 'btn go', type: 'button' }, picked.size ? (picked.size === 1 ? t('Continue with 1 person') : t('Continue with {n} people', { n: picked.size })) : t('Continue without recording'));
      go.addEventListener('click', () => {
        made = [];
        const mine = store.settings.voices || [];
        for (const n of names) if (picked.has(n)) { const ex = mine.find(v => v.name === n); made.push({ name: n, id: ex ? ex.id : voice.addVoice(n) }); }
        step = 2; draw();
      });
      const skip = h('button', { class: 'btn quiet', type: 'button' }, t('Not now, I’ll do this later'));
      skip.addEventListener('click', () => done('skip'));
      body.replaceChildren(...[h('h2', { class: 'guide-h' }, t('Welcome, grown-ups!')),
        h('p', { class: 'lead' }, SPG.pron.fill(t('Little ones love hearing the people they know. Choose who will record the voices for the games, about 5 to 10 of the people closest to {her}. Parents, grandparents, aunts, uncles, cousins: your choice, and you can mix and match.'))),
        h('p', { class: 'fine' }, t('Tap to pick. {n} chosen. You can add more people later in Grown-ups, then Voices.', { n: picked.size })),
        chips, h('div', { class: 'vtools' }, input, addB), note ? h('p', { class: 'notice' }, note) : null,
        h('div', { class: 'guide-controls' }, go, skip)].filter(Boolean));
    };
    draw();
  }

  SPG.studio = { intro, begin(id) { activeSet = id; guide = { picking: true, skip: 'anyone' }; message = ''; }, render, abort: () => { abort(); guide = null; adding = null; confirmDel = null; } };
})();
