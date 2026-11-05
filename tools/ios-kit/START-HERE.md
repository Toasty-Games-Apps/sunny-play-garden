# iOS port kit (from Little Sprout Park)

This kit is for bringing another web game that already runs in Capacitor on Android (or as a plain website) to iPhone, iPad and
iPhone Duo. It holds the working files from Little Sprout Park and the lessons from getting them to pass on simulators. Give the
zip to the agent doing the next app, together with `PROMPT.md`.

| File | What it is |
|---|---|
| `START-HERE.md` | This page: what the kit is, the order of work, and what the owner has to provide. |
| `PROMPT.md` | A prompt to paste to the next agent, with blanks for the new app's details. |
| `LESSONS.md` | Every problem we hit and how it was fixed. **Read it before writing code:** most of the time on Little Sprout Park went into finding these. |
| `web-patterns.md` | The web-side code the port needed: safe-area CSS, relaying out after a resize, sharp canvases, local media, the audio session and recording, pictures in IndexedDB. |
| `worker-origins.md` | How the backup server allows the iOS app's origin, and nothing more. Only needed if the game talks to a server. |
| `IDENTITY.md` | Every place Little Sprout Park's name, bundle id, team, colours and class names appear in the reference files. Change all of them for a new app. This file is made when the kit is built. |
| `reference/` | The real files, at the same paths as in the Little Sprout Park repo. Copy them, then adapt them. |
| `KIT-INFO.txt` | The commit and date the kit was built from. |

## What the reference files are

| Path in `reference/` | Use it for | Reuse |
|---|---|---|
| `ios-app/` | The iOS app: Capacitor 8, Swift Package Manager, iOS 17+. | Copy whole. Rename, then adapt (see IDENTITY.md). |
| `ios-app/ios/App/App/SproutViewController.swift` | The one screen. A web view that fills every window, a hidden status bar, deferred edge swipes and the screen kept on. Sound comes back after a call, and the real safe area is passed to the page. Also holds add-only Photos and a Debug-only test plugin. | Copy. Rename the classes if you like. Nothing in it is about the game. |
| `ios-app/ios/App/App/Info.plist`, `PrivacyInfo.xcprivacy`, `*.lproj/InfoPlist.strings`, `ExportOptions.plist` | Permission texts, the privacy manifest, the encryption answer, the launch screen and export settings. | Copy. Change the texts to what the new app really uses. Remove permissions it does not use. |
| `ios-app/build-web.mjs` + `tools/app-web.mjs` | Packs the game files into `www/` for offline play. Leaves out the service worker, adds the backup address to the CSP, and writes `app-config.js`. | Copy. Change the file and folder list in `packWeb` to the new game's layout. |
| `ios-app/test/` | Tests that run **inside the app** on the simulator. The full list is in `ios-app/test/README.md`. | `run-sim.mjs`, `make-sim.mjs`, `shim-lib.js` and `selftest.js` are mostly generic: change the bundle id and the `SPG` ready check. `ios.mjs`, `lang.mjs`, `after.mjs` and `store-shots.mjs` are Little Sprout Park's own checks. Use them as examples. |
| `ios-app/test/check-release-ios.mjs` | Run before every App Store archive. It refuses test builds, local addresses, network exceptions and missing permission texts. | Copy. Change the bundle id, the team and the list of allowed permissions. |
| `ios-app/make-ios-icons.mjs` | Renders the 1024 px icon (no alpha) and the launch picture from SVG. Needs Playwright. | Copy. Point it at the new icon SVGs. |
| `.github/workflows/ios.yml` | GitHub Actions on macOS. It builds the simulator app, tests on 7 simulators, makes App Store screenshots, and builds an archive. The archive is signed only when the secrets are set. TestFlight upload happens only when you tick the box. | Copy. Change the branch, the runner label, the bundle id and the test lists. |
| `js/native.js` | The game's only bridge to the apps. It covers files and the share sheet, Photos, Face ID, the audio session, recording and safe-area insets. | Copy the parts the new game needs. Keep every native call behind `isApp` / `ios`. |
| `js/photos.js` | Pictures in IndexedDB with an index, so saving and counting never read the pictures. | Use the same pattern for anything that stores Blobs. |
| `tools/playtest/lib.mjs` | The Chromium (Playwright) side of the play-tests. `shim-lib.js` stands in for it inside the app. | Copy if the new game has no test library of its own. |
| `tools/store-scenes.mjs` | How the store screenshots set up each scene. | Example. |
| `store/ios/APP-STORE-HANDOFF.md` | The App Store Connect handoff written for Little Sprout Park: listing, privacy answers, review notes, the Android-to-iOS feature table and simulator results. | Use as a template for the new app's handoff. |

## Order of work

1. **Ask the owner for the inputs** listed below. Ask only for what you need.
2. **Read `LESSONS.md` and `web-patterns.md`.**
3. **Check the game in Chromium first, at the iOS window sizes:** 375×667 (iPhone SE), 402×874 (iPhone Pro), 440×956 (Pro Max),
   466×678 (iPhone Duo outer display), 669×951 (iPhone Duo inner display), 744×1133 (iPad mini) and 1032×1376 (iPad Pro 13").
   Test both orientations, and once with the CPU throttled about 6x (Little Sprout Park's `SLOW=6`). Most of the bugs the Mac found
   showed up here too, once we looked. A local round takes minutes; a Mac round takes about an hour.
4. **Copy `reference/ios-app`, `tools/app-web.mjs` and the workflow.** Rename everything in `IDENTITY.md`. Run
   `npm install` in `ios-app/`. Check that `npx cap sync ios` and the release check run.
5. **Add the bridge parts** to the game: safe areas, audio session, recording, Photos, Face ID, a ResizeObserver for the game area,
   and canvas sharpness (`LESSONS.md` has each one).
6. **Make the in-app tests work for the new game.** In `selftest.js`, change how it knows the game has loaded and how it changes
   language. In `build-web.mjs`, list which of the game's tests run inside one page. Write a short `ios.mjs` for this game.
7. **First Mac run with `tests: quick`** (the `ios` checks and screenshots), then `full`. Run one at a time: starting a new run
   cancels the one in progress.
8. **Fix, check locally, push, run again** until every job passes in the same run. Use `[skip ci]` for commits that only change
   docs, so they don't start a run.
9. **Write the handoff** from `store/ios/APP-STORE-HANDOFF.md`. Say plainly that every result is from simulators.

## What the owner has to provide

- **App name, bundle id, Apple Team ID, App Store Connect app id, SKU and first version.** These are not secret.
- **An App Store Connect API key with the Admin role,** added as GitHub repository secrets `ASC_KEY_ID`, `ASC_ISSUER_ID` and
  `ASC_KEY_P8_BASE64` (the `.p8` file, base64 encoded). This is only needed for a signed build or TestFlight. Never paste it into a
  chat, an issue or a file.
- **A GitHub repo with macOS runners** that have Xcode for the current iOS. Little Sprout Park used the label `xcode-27`. Check which
  labels the new repo has.
- **If the game has a server** (backups, accounts): permission to change and deploy its origin allowlist. Prepare the change for
  review first.
- **Real-device testing** with TestFlight: microphone, silent switch, Face ID, Photos, calls, the real iPhone Duo fold. Simulators
  cannot prove these.
- **Their own decisions:** price, the Kids Category (hard to leave once chosen), and when to release (keep it manual).

## Will the next app be faster?

Mostly yes, because the iOS project, the packing, the in-app test system, the workflow and these lessons already exist. What still
takes time is the loop of running tests on the Mac, finding what failed and fixing it. On GitHub's Macs each round is about an hour.
A Mac the agent can reach directly (Remote Control in the Claude desktop app, or a self-hosted runner) makes each round take
minutes.

This kit only fits games made of web files (HTML, CSS and JavaScript, with or without Capacitor). A native Android game (Kotlin or
Java views) or an engine game (Unity, Godot) needs that engine's own iOS export instead. The lessons about the simulators, signing,
privacy and the App Store still apply.
