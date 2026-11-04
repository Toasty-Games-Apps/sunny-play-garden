// The bridge to the Android and iOS apps (Capacitor). On the website none of this does anything: `SPG.native.isApp` is false and
// every helper falls back to what the browser does. Inside the apps the game files are on the device (no website), and this
// file covers the few things a bare web view cannot do on its own: saving a file or a picture, the Android back button, the
// device's own unlock, and where the optional cloud backup lives. `SPG.native.platform` is 'android', 'ios' or 'web'.
(() => {
  const SPG = window.SPG = window.SPG || { games: [] };
  const cap = window.Capacitor;
  const isApp = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugins = () => (cap && cap.Plugins) || {};
  const platform = isApp ? ((cap.getPlatform && cap.getPlatform()) || 'android') : 'web', ios = platform === 'ios';
  const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
  const N = SPG.native = {
    isApp, platform, ios,
    // a grown-up is recording (true) or has finished (false); only the iOS app needs to do something (see the end of this file)
    recording() {},
    // Where /api/backup lives. The website uses its own address; the app needs the full address (set when the app is built).
    apiBase: isApp ? ((window.SPG_APP && window.SPG_APP.api) || '') : '',
    // Saves a Blob as a file the grown-up can keep: on the website a normal download, in the app the phone's share sheet
    // (save to Photos or Files, send by message, ...). Resolves true if it went through.
    async saveFile(blob, name, mime) {
      if (isApp) {
        try {
          const { Filesystem, Share } = plugins();
          const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
          const w = await Filesystem.writeFile({ path: name, data, directory: 'CACHE', recursive: true });
          await Share.share({ title: name, url: w.uri, dialogTitle: SPG.t('Save or share') });
          return true;
        } catch (e) { return false; }   // cancelled, or the share sheet failed
      }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none'; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return true;
    },
    // Puts a picture straight into the device's own photos, with no questions (only used when a grown-up allowed it).
    // In the Android app: an album called "Sprout Park" in the phone's gallery (@capacitor-community/media, no storage permission needed).
    // In the iOS app: Photos, with "add only" access (SproutPhotos in ios-app/ios/App/App/SproutViewController.swift). It never asks:
    // without permission it resolves false, and the game asks for permission only after the grown-up gate (N.photos.request).
    // On the website: a normal download (it shows in Downloads); on iPhone/iPad a download needs a grown-up, so nothing happens.
    async saveToGallery(blob, name) {
      if (ios) {
        try {
          const P = plugins().SproutPhotos; if (!P) return false;
          const r = await P.save({ data: await toB64(blob), name });
          return !!(r && r.saved);
        } catch (_) { return false; }
      }
      if (isApp) {
        try {
          const { Media } = plugins(); if (!Media) return false;
          const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob); });
          const find = async () => (((await Media.getAlbums()) || {}).albums || []).find(al => al.name === 'Sprout Park');
          let album = await find(); if (!album) { try { await Media.createAlbum({ name: 'Sprout Park' }); } catch (_) { /* it may exist already */ } album = await find(); }
          if (!album) return false;
          await Media.savePhoto({ path: data, albumIdentifier: album.identifier, fileName: name.replace(/\.\w+$/, '') });
          return true;
        } catch (_) { return false; }
      }
      if (SPG.safe && SPG.safe.isIOS) return false;
      return N.saveFile(blob, name, blob.type || 'image/jpeg');
    }
  };
  // iOS app: may pictures go into Photos? status() is 'granted', 'ask' (never asked yet), 'denied' or 'restricted'; request() shows the
  // system question, so it is only called after the grown-up gate or from the grown-ups panel.
  if (ios) N.photos = {
    async status() { try { return ((await plugins().SproutPhotos.status()) || {}).status || 'denied'; } catch (_) { return 'denied'; } },
    async request() { try { return ((await plugins().SproutPhotos.request()) || {}).status === 'granted'; } catch (_) { return false; } }
  };
  // The Android widget (mini games on the home or Flip cover screen) rests when today's play time is used up.
  if (isApp && plugins().SproutWidget) N.widget = { setRest: reached => plugins().SproutWidget.setRest({ reached: !!reached }) };
  // Grown-up unlock with the device's own fingerprint, face or screen lock. In the app this is the phone's biometric prompt (with the screen
  // lock PIN, pattern or password as its fallback); on the website it is the browser's platform authenticator (WebAuthn: Windows Hello,
  // Touch ID, Android fingerprint). Nothing secret is stored: the device says "yes, the owner is here" and the PIN / sum always still works.
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))), unb64 = t => Uint8Array.from(atob(t), ch => ch.charCodeAt(0));
  N.deviceAuth = {
    async available() {
      try {
        if (isApp) { const B = plugins().NativeBiometric; if (!B) return false; const r = await B.isAvailable({ useFallback: true }); return !!(r && (r.isAvailable || r.deviceIsSecure)); }
        return !!(window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
      } catch (_) { return false; }
    },
    // asks the device once, so a grown-up knows it works before it is switched on; resolves a small token to save (or '' in the app)
    async enroll() {
      try {
        if (isApp) { await plugins().NativeBiometric.verifyIdentity({ reason: ios ? SPG.t('Use Face ID, Touch ID or the passcode for the grown-ups area') : SPG.t('Use your fingerprint or phone lock for the grown-ups area'), title: SPG.t('Grown-ups only'), subtitle: 'Little Sprout Park', useFallback: true }); return 'app'; }
        const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Little Sprout Park' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'grown-up', displayName: 'Grown-up' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } });
        return cred ? b64(cred.rawId) : '';
      } catch (_) { return ''; }
    },
    async verify(token) {
      try {
        if (isApp) { await plugins().NativeBiometric.verifyIdentity({ reason: SPG.t('Grown-ups only'), title: SPG.t('Grown-ups only'), subtitle: 'Little Sprout Park', useFallback: true }); return true; }
        const r = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: token && token !== 'app' ? [{ type: 'public-key', id: unb64(token) }] : [], userVerification: 'required', timeout: 60000 } });
        return !!r;
      } catch (_) { return false; }
    }
  };
  // The Android back button goes to the same place the browser's back button did: SPG.safe.onBack.
  if (isApp) {
    const App = plugins().App;
    if (App && App.addListener) App.addListener('backButton', () => { if (SPG.safe && SPG.safe.onBack) SPG.safe.onBack(); });
    // An old copy of the website's offline cache has no use inside the app.
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) navigator.serviceWorker.getRegistrations().then(l => l.forEach(r => r.unregister())).catch(() => {});
  }
  // iOS app: the sound is part of playing (spoken instructions for a child who cannot read yet), so it plays with the silent switch on,
  // like the native audio session the app sets up. After a call, Siri or an alarm, and on coming back to the app, the paused web audio
  // is started again (the next touch would do it too).
  if (ios) {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* older iOS */ }
    const wake = () => { if (SPG.audio && SPG.audio.ctx && SPG.audio.ctx.state !== 'running') SPG.audio.unlock(); };
    addEventListener('spgaudioresume', wake);
    // WebKit refuses the microphone while the page's audio session is "playback": play-and-record only while a grown-up records
    // (Grown-ups > Voices), then back to playback and the game's sound is woken again
    N.recording = on => {
      try { if (navigator.audioSession) navigator.audioSession.type = on ? 'play-and-record' : 'playback'; } catch (_) { /* older iOS */ }
      if (!on) setTimeout(wake, 250);
    };
    const App = plugins().App;
    if (App && App.addListener) App.addListener('resume', () => setTimeout(wake, 300));
    // The window's real safe area from the app (SproutViewController): WebKit's env(safe-area-inset-*) can read 0 where the system
    // still covers an edge (the iPhone Duo's side status bar and home indicator). styles.css uses the larger of the two (--ios-*).
    let ins = '';
    const setInsets = o => {
      if (!o || o.t == null) return;
      const v = [o.t, o.r, o.b, o.l].map(x => Math.max(0, Math.round(+x || 0))), key = v.join(',');
      if (key === ins) return; ins = key;
      const st = document.documentElement.style;
      ['t', 'r', 'b', 'l'].forEach((k, i) => st.setProperty('--nat-' + k, v[i] + 'px'));
      // the game area changed size without the window changing: let the hub and the running game lay themselves out again
      dispatchEvent(new Event('resize'));
    };
    N.insets = (t, r, b, l) => setInsets({ t, r, b, l });
    const ask = () => { const V = plugins().SproutView; if (V && V.insets) V.insets().then(setInsets).catch(() => {}); };
    ask(); addEventListener('resize', () => setTimeout(ask, 120));
  }
})();
