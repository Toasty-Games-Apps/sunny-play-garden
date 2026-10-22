# Little Sprout Park: Android app

This folder turns the game into a real Android app. The game itself is **not rewritten**: the same files that run on the website
(`index.html`, `js/`, `games/`, `fonts/`, `audio/`, `icons/`, `styles.css`) are copied into the app, so it opens straight from the
phone with no website, no browser and no internet. It uses [Capacitor](https://capacitorjs.com), which is a thin native
shell around Android's web view.

```
android-app/
  build-web.mjs            copies the game into www/ (leaves out the website's service worker, sets the cloud backup address)
  capacitor.config.json    app id com.toastygames.littlesproutpark, name "Sprout Park"
  android/                 the Android project (Gradle). Edit native things here
  make-android-icons.mjs   re-makes the launcher icons and splash screens from ../icons
```

## What is different from the website (and nothing else)
* `js/native.js` is the only bridge. On the website it does nothing. In the app it: saves pictures and backup files through the
  phone's share sheet (a hidden download link does not work in an Android web view), connects the Android back button to the same
  "stay in the app" logic, and tells the cloud backup where to find the server.
* The website's service worker is not used (everything is already on the phone).
* Full screen, keep-screen-on and the microphone permission are set in `android/app/src/main/java/.../MainActivity.java` and `AndroidManifest.xml`.

## Building (you do not need Android Studio)
The easiest way is GitHub Actions: **Actions > Build Android app > Run workflow**. It makes two files you can download from the run:
`app-release-bundle` (the `.aab` for Google Play) and `app-debug-apk` (an `.apk` to install on a phone and try).

For the **signed** bundle Play accepts, add four repository secrets (Settings > Secrets and variables > Actions):
`ANDROID_KEYSTORE_BASE64` (your upload keystore, `base64 -w0 upload.keystore`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`. It must be the **same upload key** used for the first upload (1.0.0-alpha1), or Play will refuse the update.
Also add the repository variable `SPG_API_BASE` (for example `https://your-site.workers.dev`), the address where the cloud backup lives.
For optional grown-up email recovery, verify `littlesproutpark.online` with Resend and put a **send-only** API key in the
Cloudflare Worker secret `RESEND_API_KEY`. Never put this key in GitHub, app files, or the Android bundle. Email recovery
is hidden outside the Android app and does not add a sign-in SDK or Android permission.

Version code: every upload to Play needs a number higher than the last. The first upload was **1**; the workflow asks for it when run by hand
(default 5, above the test builds 3 and 4). The version name you type (default 1.0.0) is shown on Play and in Grown-ups > About.

On your own computer: `cd android-app && npm install && SPG_API_BASE=https://... npm run sync`, then open `android/` in Android Studio
(or `cd android && ./gradlew bundleRelease`).

## Before the first upload from this app (Play Console)
* Same package name (`com.toastygames.littlesproutpark`), same signing, higher version code.
* **Data safety**: the cloud backup is optional and encrypted on the device. Answer for what the app does:
  * Data shared with third parties: none. No ads, no analytics.
  * *Audio files / voice or sound recordings*: collected only if a grown-up turns on cloud backup (optional), encrypted in transit and on the server,
    not shared, can be deleted by the grown-up (Turn off and delete cloud copy).
  * *App activity / other user-generated content* (player names, progress, drawings): the same, optional and encrypted.
  * "All user data is encrypted in transit": yes. "You can request that data is deleted": yes (inside the app).
  * Optional email recovery: a grown-up may submit an email address to receive a verification code, then a copy of
    the family code. Disclose optional email collection and its use for recovery. The address is kept briefly during
    verification, then only its hash is stored with the backup; Resend delivers the messages.
* **Permissions** shown in the console: Internet (cloud backup only), Record audio (grown-ups' voice recording only), Modify audio settings.
  Microphone and touchscreen are marked *not required*.
* Privacy policy (`privacy.html`) is updated for recorded voices in the cloud copy and for the app being offline. Check it still reads right for you.

## Moving testers from the web wrapper to this app
This is a replacement for the old wrapper, not a second app. The app's saved data is separate from the browser's, so progress does not carry across
automatically. Before updating, a grown-up can use **Grown-ups > Save a backup file** or turn on **Cloud backup** and then, in the new app,
enter the family code (this also brings the recorded voices).

## The cloud server
`worker/index.js` (Cloudflare) now also allows the app (`https://localhost`) and stores recorded voices (`/api/voice`). Deploy it as before (`npx wrangler deploy`).

## Foldable screens
The game uses the current app window size, including the narrow front displays and the unfolded near-square inner display of a Galaxy Z Fold (the app handles the fold and unfold itself, so a game in progress is not restarted). On a near-square inner screen the hub shows nine game icons without enlarging their art; very narrow front screens (under 360 px) get tighter spacing. Test folding and unfolding on the target phone before a Play upload.

## Mini games widget (home screen and Flip cover screen)
A grown-up adds **Sprout Park mini games** from the phone's widget list (touch and hold the home screen > Widgets). On a Samsung Galaxy Z Flip a grown-up enables it under **Settings > Cover screen > Widgets** (the cover entry is called "Sprout Park mini games (cover screen)"; Samsung decides which models and One UI versions allow third-party cover widgets).
It holds four tap-only games drawn from the same friendly look: Fruit Pop (touch the fruit), Letters (find the letter), Counting (how many dots?) and Memory pairs. A small leaf badge in the menu opens the full app. Code: `SproutMiniWidget.java` (the widget; the picture is split into a 4 x 4 grid of tap squares), `MiniGames.java` (the games and their drawing), `SproutCoverWidget.java` (the cover-screen listing), `SproutWidgetBridge.java` (the one thing the game tells it: when today's play limit is used up the widget shows the moon and rests). It needs no permissions, never goes online and never reads or changes the child's saved data or voices; it has no sound and no ads.
