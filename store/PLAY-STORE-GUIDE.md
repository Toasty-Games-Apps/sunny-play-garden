# Publishing Little Sprout Park on Google Play

The Play Store app is the **Capacitor app in `android-app/`**: the game files are copied inside the app at build time,
so it runs fully offline with no website. How to build, sign and number versions is in `android-app/README.md`; the
Data safety answers for it are there too. The Trusted Web Activity steps further down (sections 1 and 4) were the
first plan and are kept only for reference: with the Capacitor app you skip them.

> Store rules change. Treat this as a checklist and double-check anything marked (verify) in the Play Console help.

## What is already done in this project
- Installable web app: `manifest.webmanifest` (fullscreen, icons incl. maskable, screenshots, categories), service worker with offline support.
- `privacy.html`: a public privacy policy page (fill in the two [placeholders]).
- `.well-known/assetlinks.json`: the file that lets the Android app hide the browser bar. Currently an empty list; you fill it in during step 4.
- Kid-safe by design: no ads, no analytics, no accounts, no links out, parental gate on every setting.
- `SPG.config.recorder` in `js/core.js`: set to `false` to remove all microphone use (simplest Families review). The rest of the app is unchanged.
- `SPG.config.camera` (set in `js/signvideo.js`, default true): set to `false` to remove the camera from Grown-ups > Accessibility > Sign videos (grown-ups can still choose a video file). If you do, also change `camera=(self)` to `camera=()` in `_headers`. Sign videos stay on the device and are never uploaded.
- Store graphics and listing text in this folder (`store/`), not published on the website.

## 0. Before you start
1. Deploy the site (Cloudflare) and note its address, e.g. `https://play.yourdomain.com`. A custom domain is best; an address ending in `.workers.dev` also works but it is tied to your Cloudflare account name.
2. Open `https://YOUR-DOMAIN/privacy.html` and `https://YOUR-DOMAIN/.well-known/assetlinks.json` in a browser. Both must load (assetlinks shows `[]`). If assetlinks gives a 404, tell your developer: dot-folders sometimes need extra configuration on the host.
3. Edit `privacy.html`: replace **[Developer or company name]** and **[contact email address]**, deploy again.
4. Create a Google Play developer account (one-time fee, identity checks apply) at play.google.com/console.

## 1. Package the Android app (choose one)
**Easiest: PWABuilder (no command line)**
1. Go to pwabuilder.com, enter your site address, and run the check. Fix anything it flags.
2. Choose **Package for stores > Android**.
3. Set: Package ID (e.g. `com.yourname.littlesproutpark`, permanent), App name `Little Sprout Park`, Launcher name `Sprout Park` (keep it short; Android truncates long launcher names), Display `Fullscreen`, Orientation `Default`, Notifications off. Let it generate a signing key (**keep the downloaded key file and its passwords safe and backed up**).
4. Download the zip. It contains the app bundle (`.aab`), the signing key, and an `assetlinks.json` snippet.

**Alternative: Bubblewrap (command line)**
```
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://YOUR-DOMAIN/manifest.webmanifest
bubblewrap build
```
`store/twa-manifest.template.json` shows the settings we recommend (fullscreen, no notifications).

## 2. Create the app in Play Console
- All apps > Create app: name, default language, **App**, **Paid** (the planned price is $2.99), accept the declarations.
- **Free or paid is permanent once the app is published**: Google does not let a free app become paid later. If the app was created
  as Free for the test uploads, check Monetize > Products > App pricing before the first production release. Selling a paid app also
  needs a payments profile (Setup > Payments profile) linked to the developer account, and tax details.
- Category **Education**. Contact details and the privacy policy URL `https://YOUR-DOMAIN/privacy.html`.
- **Countries and regions: all of them.** The owner wants the app released everywhere Google Play allows. In Release > Production >
  **Countries / regions** > Add countries / regions, tick the box that selects every country and region in the list and save (do the
  same for the closed and internal test tracks if testers live abroad). Nothing in the app is country-specific and it needs no internet.
  For a paid app, check Monetize > Products > App pricing: Play converts the US price into a local price for each country (you can
  round them). A country Play greys out for paid apps or for your account simply stays off. (verify)

## 3. Kids / Families settings (this is a children's app)
- **Target audience and content**: choose the youngest age groups you designed for (e.g. "5 and under" and "6-8"). Because children are included, the app is subject to Google's **Families Policy**. Answer yes to "appeals to children".
- **Ads**: "No, my app does not contain ads".
- **Data safety**: by default nothing leaves the device. The optional grown-up cloud backup (see `store/CLOUD-SETUP.md`) sends an **end-to-end encrypted** copy of player names, progress and drawings to your own Cloudflare account; you cannot read it. In the form, declare it truthfully: data type "App activity / other user-generated content" (and "Name" if you count player names), collected: yes but **optional**, **encrypted in transit and at rest**, **users can request deletion** (Grown-ups screen), not shared, not used for ads or analytics. If you prefer the simplest form, remove `js/sync.js` and the Backup section and declare no data.
- **Content rating**: complete the IARC questionnaire honestly (cartoon fruit is sliced in Fruit Splash; there is no blood, no scary content, no chat, no purchases).
- **Permissions**: the wrapper declares none. The optional voice recorder asks the browser for the microphone only when a grown-up taps Record. If you would rather have no microphone use at all in the store version, set `SPG.config.recorder = false` in `js/core.js` and, in `_headers`, change `microphone=(self)` to `microphone=()`.
- **News/COVID/government/financial** declarations: no.

## 4. Verify the app with your website (Digital Asset Links)
This removes the browser address bar.
1. Upload your `.aab` to a Play **Internal testing** release first.
2. In Play Console, when using **Play App Signing** (recommended, default), open Release > Setup > **App signing** and copy the **SHA-256 certificate fingerprint of the app signing key**. Also copy the fingerprint of your **upload key** (optional but handy for testing).
3. Put the fingerprints into `.well-known/assetlinks.json` using `store/assetlinks.template.json` as the model (replace the package name and fingerprint), deploy the site, and check `https://YOUR-DOMAIN/.well-known/assetlinks.json` loads.
4. Install the internal test build on a phone. It should open full screen with no address bar. If a bar appears, the fingerprint or package name in assetlinks.json does not match.

## 5. Store listing
Use `store/listing.md` for the text and these images (Grow users > Store presence > Main store listing):

| Play Console slot | File(s) | Size | Notes |
| --- | --- | --- | --- |
| App icon | `store/icon-512.png` | 512 x 512 PNG | full square; Play rounds the corners itself |
| Feature graphic | `store/feature-graphic.png` | 1024 x 500 PNG, no transparency | shown at the top of the listing |
| Phone screenshots | `store/screenshots/phone/1-...8-*.png` | 8 x 1080 x 1920 | upload in number order; 1080 px or more makes them eligible for promotion |
| 7-inch tablet screenshots | `store/screenshots/tablet7/*.png` | 8 x 1080 x 1920 (9:16) | |
| 10-inch tablet screenshots | `store/screenshots/tablet10/*.png` | 8 x 2560 x 1440 (16:9) | both sides at least 1080 px, as Play asks |

Every screenshot is the real game with a short caption above it; none has transparency. Chromebook screenshots are optional (the 10-inch set fits them too).
Regenerate everything with `node tools/make-icons.mjs` (icons) and `node tools/make-store-assets.mjs` (screenshots and feature graphic);
`ONLY=phone` (or `tablet7`, `tablet10`, `feature`) makes one part, `FRAME_ONLY=1` only re-writes the captions (edit `CAPTION` in the script).
After changing the logo, also run `node android-app/make-android-icons.mjs` so the phone's launcher icon and splash screen match.

### Translated listings (Spanish, Hindi, Chinese)
The app plays in English, Spanish (Latin America), Hindi and Chinese (Simplified); more languages will come later. Each language has its
listing text and graphics in its own folder:

| Play Console language | Text | Graphics |
| --- | --- | --- |
| Español (Latinoamérica) – es-419 | `store/es/listing.md` | `store/es/feature-graphic.png`, `store/es/screenshots/phone/1-8` |
| हिन्दी – hi-IN | `store/hi/listing.md` | `store/hi/feature-graphic.png`, `store/hi/screenshots/phone/1-8` |
| 中文（简体）– zh-CN | `store/zh/listing.md` | `store/zh/feature-graphic.png`, `store/zh/screenshots/phone/1-8` |

Main store listing > **Manage translations** > Add your own translations: add the three languages, paste the name, short and full
description, then upload that language's feature graphic and phone screenshots. Tablet screenshots can be left empty: Play then shows the
English ones. The Spanish text also suits **Español (Estados Unidos) – es-US** and **Español (España) – es-ES** if you want to add them.
Google Play is not offered in mainland China, so the Chinese listing reaches Simplified Chinese readers elsewhere. Ask a native speaker to
read each listing (and play the app in that language) before publishing. Remake the graphics with
`STORE_LANG=es node tools/make-store-assets.mjs` (or `hi`, `zh`); the listing texts are checked against Play's limits by `tools/check-release.mjs`.

## 6. Testing requirements and release
- Run an **Internal test** (up to 100 testers) to check everything works.
- New personal developer accounts must currently also run a **Closed test with a minimum number of testers for about two weeks** before applying for production (verify the current numbers). Plan for this: recruit friends and family.
- Then create a **Production** release and submit for review. First reviews can take days.

## 7. Updating later
- Game changes: deploy the website. The app picks them up next time it opens (the service worker fetches new files when online).
- Wrapper changes (name, icon, package settings): rebuild, increase the version code, upload a new release.

## Things worth checking on a real Android phone and tablet
Full screen with no bars; sound and voices; the back button never leaves the app (it goes back a screen); rotating the device; the microphone prompt in Grown-ups > Voices (if the recorder is enabled).


## Before you upload
Run `node tools/check-release.mjs` from the repo root. Everything must PASS; the WARN lines are the things only you can fill in (privacy policy name and email, the app-signing fingerprint via `node tools/make-assetlinks.mjs`, and deciding whether the voice recorder stays visible).
