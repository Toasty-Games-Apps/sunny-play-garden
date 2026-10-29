// Languages. The app is in English, Spanish, Hindi and Mandarin Chinese (Simplified); a grown-up chooses in Grown-ups > Language, and a new
// install starts in the language of the device. Everything is looked up from English:
//   t('Some English text', { n: 3 })  -> the text shown on screen in the chosen language ({n} filled in); English when there is no translation
//   line(key)                         -> a spoken line (a key of SPG.voice.LINES) in the chosen language, or null (then it is said in English)
// The translations live in js/lang/<id>.js (`SPG.i18n.add(id, { ui, lines, nicks, pets, words, num, noSound })`); only the chosen
// language's file is loaded, right after this one (so every later script can translate while it loads). To add a language: copy one of
// those files, translate it, add it to LANGS below and to the file list in sw.js, and run `node tools/check-i18n.mjs` (it lists what is
// missing or left over). Changing the language restarts the app (every screen and game is built in the new language).
(() => {
  const SPG = window.SPG, store = SPG.store;
  // speech: which device voices fit (BCP 47 language tags), best first
  const LANGS = [
    { id: 'en', name: 'English', native: 'English', bcp: 'en-US', speech: ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en'] },
    { id: 'es', name: 'Spanish', native: 'Español', bcp: 'es-419', speech: ['es-MX', 'es-US', 'es-419', 'es-ES', 'es'] },
    { id: 'hi', name: 'Hindi', native: 'हिन्दी', bcp: 'hi-IN', speech: ['hi-IN', 'hi'] },
    { id: 'zh', name: 'Chinese (Mandarin)', native: '中文（普通话）', bcp: 'zh-CN', speech: ['zh-CN', 'cmn-CN', 'cmn-Hans-CN', 'zh-Hans', 'zh-SG', 'zh-TW', 'cmn', 'zh'] }
  ];
  const DATA = {};
  const byId = id => LANGS.find(l => l.id === id);
  // the device's language, if the app has it
  function detect() {
    for (const tag of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])) {
      const p = String(tag || '').toLowerCase().split(/[-_]/)[0];
      if (p === 'cmn' || p === 'zh') return 'zh';
      if (byId(p)) return p;
    }
    return 'en';
  }
  // A family that already plays in English keeps English after this update; a new install starts in the device's language.
  let cur = 'en';
  (() => {
    const st = store.settings;
    if (!st.lang) { st.lang = store.profiles.length ? 'en' : detect(); store.saveSettings(); }
    cur = byId(st.lang) ? st.lang : 'en';
  })();
  const D = () => DATA[cur] || {};
  // load the chosen language's translations before the next script runs (a parser-blocking script from this site, allowed by the CSP)
  if (cur !== 'en' && document.readyState === 'loading') document.write(`<script src="js/lang/${cur}.js"><\/script>`);

  const fill = (s, vars) => (vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : String(s));
  function t(s, vars) {
    const tr = cur !== 'en' && D().ui ? D().ui[s] : null;
    return fill(tr != null ? tr : s, vars);
  }
  // A spoken line in the chosen language (null: none, the English line is used and said by an English voice)
  const line = key => (cur !== 'en' && D().lines && D().lines[key] != null ? D().lines[key] : null);
  // Which language a line is said in: the chosen one when it has the line (names always), otherwise English.
  const lineLang = key => (cur === 'en' ? 'en' : typeof key !== 'string' || /^(name|pname|player)\//.test(key) || line(key) != null ? cur : 'en');

  function set(id) {
    if (!byId(id) || id === cur) return;
    store.settings.lang = id; store.saveSettings();
    setTimeout(() => location.reload(), 120);
  }
  // Static text in index.html: elements marked data-i18n get their own text translated (child elements keep theirs),
  // data-i18n-attr="aria-label,placeholder" translates those attributes, data-i18n-html replaces the inner HTML.
  const orig = new WeakMap();
  function apply(root = document) {
    document.documentElement.lang = byId(cur).bcp.split('-')[0] === 'zh' ? 'zh-Hans' : byId(cur).bcp.split('-')[0];
    for (const el of root.querySelectorAll('[data-i18n]')) {
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        if (!orig.has(n)) orig.set(n, n.textContent);
        const o = orig.get(n), lead = o.match(/^\s*/)[0], tail = o.match(/\s*$/)[0];
        n.textContent = lead + t(o.trim()) + tail;
      }
    }
    for (const el of root.querySelectorAll('[data-i18n-attr]')) for (const a of el.dataset.i18nAttr.split(',')) {
      const key = 'i18n' + a.replace(/(^|-)(\w)/g, (m, d, c) => c.toUpperCase());
      if (!el.dataset[key]) el.dataset[key] = el.getAttribute(a) || '';
      el.setAttribute(a, t(el.dataset[key]));
    }
    for (const el of root.querySelectorAll('[data-i18n-html]')) {
      if (!el.dataset.i18nSrc) el.dataset.i18nSrc = el.innerHTML.trim();
      const tr = cur !== 'en' && D().ui ? D().ui[el.dataset.i18nSrc] : null;
      if (tr != null) el.innerHTML = tr;   // only our own translation files are ever put here
    }
  }

  SPG.i18n = {
    LANGS, detect, set, t, line, lineLang, apply,
    lang: () => cur, info: () => byId(cur), of: byId,
    add(id, data) { DATA[id] = Object.assign(DATA[id] || {}, data); },
    data: id => DATA[id || cur] || {},
    // the word for a number (0 to 20) in the chosen language, for the grown-up gate
    numWord: n => (cur !== 'en' && D().num && D().num[n]) || ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'][n],
    // a date as people write it in the chosen language
    date: d => new Date(d).toLocaleDateString(byId(cur).bcp),
    // the language's own name lists, Letter Garden picture words... (the English ones when it has none)
    list: (k, fallback) => (cur !== 'en' && D()[k]) || fallback
  };
  SPG.t = t;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply()); else apply();
})();
