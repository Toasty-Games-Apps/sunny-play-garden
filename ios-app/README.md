# Little Sprout Park for iPhone and iPad

This is the iOS app. The game files from the repo root are packed inside the app by Capacitor, so it plays fully offline. There is
no website behind it. It is the same game as the Android app (`android-app/`), packed by the same script (`tools/app-web.mjs`).

| | |
|---|---|
| App Store name | Little Sprout Park: Kids Games |
| Name under the icon | Sprout Park |
| Bundle ID | `com.toastygames.littlesproutpark` |
| Team | `6437343CNQ` |
| App Store Connect app | 6830382328 (SKU SPG-IOS-001) |
| Version | 1.0.0. The build number is the workflow run number, or the `build_number` input. |
| Runs on | iPhone and iPad with iOS 17 or later. It fits any window, including iPad split view, Stage Manager, both iPhone Duo displays and rotation. |

## Building

The usual way is GitHub Actions: **Actions > Build iOS app** (`.github/workflows/ios.yml`). It runs on every push that changes the
game, or by hand with *Run workflow*. Each run produces three things:

- **`sim-*` artifacts:** test results, logs and screenshots from the simulators. The App Store screenshots are in `appstore/` (JPEG, no alpha).
- **`SproutPark-unsigned-archive`:** an unsigned archive, when there are no signing secrets. It proves the device build compiles.
- **`SproutPark-ipa`:** the signed App Store build, when the signing secrets below are set. To send it to TestFlight, tick **upload** when you run the workflow by hand. Releasing to the App Store stays a manual button in App Store Connect.

**Signing secrets** (repository Settings > Secrets and variables > Actions). They come from an App Store Connect Team API key with
the **Admin** role, made in App Store Connect > Users and Access > Integrations > App Store Connect API:

- `ASC_KEY_ID`: the key ID.
- `ASC_ISSUER_ID`: the issuer ID.
- `ASC_KEY_P8_BASE64`: the `.p8` file, base64 encoded: `base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy`.

Xcode uses this key to make the distribution certificate and the App Store profile itself. No certificate or profile is kept in the
repo. The archive is built unsigned and only the export signs it, for the App Store: with automatic signing an archive is signed
for development, and a development profile needs a registered device, which this team does not have (run 27). After an upload, the
`testflight` job waits for Apple to process the build and adds it to the TestFlight group "Family" (`testflight-group.mjs`, the same
key; nothing is submitted for review). Never commit a `.p8`, `.p12` or `.mobileprovision`: `.gitignore` refuses them.

The optional repository **variable** `SPG_API_BASE` is the https address of the cloud backup. It is the same one the Android build
uses. The worker must also allow the iOS app's origin `capacitor://localhost`. That change is in `worker/index.js`, waiting for
review and deployment.

### On a Mac by hand

```sh
cd ios-app
npm ci
node build-web.mjs                 # packs the game into www/ (SPG_API_BASE=https://... for the cloud backup)
node test/check-release-ios.mjs    # refuses a test build, held-back features, network exceptions...
npx cap sync ios                   # copies www/ into the Xcode project and resolves the Swift packages
open ios/App/App.xcodeproj         # Product > Archive, then Distribute App > App Store Connect
```

`npm run icons` remakes the app icon and the launch picture from `icons/*.svg`. It needs Playwright.

## What is iOS-specific

| Part | Where |
|---|---|
| The one screen: a web view that fills every window, hidden status bar, edge swipes held for one extra swipe, screen kept on, sound restored after a call | `ios/App/App/SproutViewController.swift` |
| The window's real safe area for the page (`SproutView.insets`, and `SPG.native.insets` on every change): on the iPhone Duo WebKit's `env(safe-area-inset-*)` reads 0 while the side status bar and home indicator still cover the edges. styles.css uses the larger of the two (`--ios-t/r/b/l`) | `SproutView` in the same file; the iOS block at the end of `js/native.js` |
| Saving pictures to Photos with **add-only** access. The system asks only after the grown-up gate, or when the switch in Grown-ups > Photos and pictures is turned on. | `SproutPhotos` in the same file; `SPG.native.saveToGallery` and `SPG.native.photos` in `js/native.js` |
| Audio keeps playing with the ring/silent switch on, because spoken instructions are how a pre-reader plays | `AppDelegate.swift` (`.playback`), and `navigator.audioSession.type = 'playback'` in `js/native.js` |
| Family voice recording: WebKit refuses the microphone while the page's audio session is "playback", so it is switched to "play-and-record" only while a grown-up records, then back (the game's sound is woken again) | `SPG.native.recording` in `js/native.js`, called by `startRecording` in `js/voice.js` |
| Safe areas: the game area and the sheets stay clear of the camera, a side status bar (iPhone Duo) and the home bar | `html.ios` rules at the end of `styles.css` |
| Sharp artwork: game canvases draw at up to 2x on iOS (1.5x on Android) | `SPG.ui.dpr` in `js/core.js` |
| Face ID, Touch ID or passcode for the grown-up gate | `@capgo/capacitor-native-biometric` and `NSFaceIDUsageDescription` |
| The phone's own voice | `@capacitor-community/text-to-speech`. The Sprout voice clips play first, as on Android. |
| Permission texts in English, Spanish, Hindi and Chinese | `ios/App/App/*.lproj/InfoPlist.strings` |
| Privacy manifest: no tracking, email only for the optional recovery, file timestamps for the file plugin | `ios/App/App/PrivacyInfo.xcprivacy` |
| No storyboards; the launch screen is the sprout on sky blue | `Info.plist` `UILaunchScreen`, `Assets.xcassets` |
| Locking the device for a child | Guided Access (Grown-ups > Locks and safety explains it). It replaces Android's screen pinning. |

**Not in this release:** sign language and the camera, which are still held back in `backup/`. The release check refuses both, and
the app asks for no camera permission. There is also no Android-style home-screen widget: see the handoff notes for the full list.

## Tests

See `test/README.md`. In short, the games' own play-tests and the iOS checks run inside the real app on simulators: big and small
iPhone, iPad Pro 13", iPad mini and iPhone Duo. These are simulators, not physical devices.
