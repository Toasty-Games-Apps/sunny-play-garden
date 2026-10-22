// The bridge to the Android app (Capacitor). On the website none of this does anything: `SPG.native.isApp` is false and
// every helper falls back to what the browser does. Inside the Android app the game files are on the phone (no website),
// and this file covers the few things a bare WebView cannot do on its own: saving a file, the back button, and where the
// optional cloud backup lives.
(() => {
  const SPG = window.SPG = window.SPG || { games: [] };
  const cap = window.Capacitor;
  const isApp = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugins = () => (cap && cap.Plugins) || {};
  const N = SPG.native = {
    isApp,
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
          await Share.share({ title: name, url: w.uri, dialogTitle: 'Save or share' });
          return true;
        } catch (e) { return false; }   // cancelled, or the share sheet failed
      }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none'; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return true;
    },
    // Puts a picture straight into the device's own photos, with no questions (only used when a grown-up allowed it).
    // In the app: an album called "Sprout Park" in the phone's gallery (@capacitor-community/media, no storage permission needed).
    // On the website: a normal download (it shows in Downloads); on iPhone/iPad a download needs a grown-up, so nothing happens.
    async saveToGallery(blob, name) {
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
        if (isApp) { await plugins().NativeBiometric.verifyIdentity({ reason: 'Use your fingerprint or phone lock for the grown-ups area', title: 'Grown-ups only', subtitle: 'Little Sprout Park', useFallback: true }); return 'app'; }
        const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Little Sprout Park' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'grown-up', displayName: 'Grown-up' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } });
        return cred ? b64(cred.rawId) : '';
      } catch (_) { return ''; }
    },
    async verify(token) {
      try {
        if (isApp) { await plugins().NativeBiometric.verifyIdentity({ reason: 'Grown-ups only', title: 'Grown-ups only', subtitle: 'Little Sprout Park', useFallback: true }); return true; }
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
})();
