# Testing the iPhone and iPad app

The tests run **inside the real app** on the iOS simulator, in the app's own web view (WebKit) with the real Capacitor plugins.
The Mac takes real simulator screenshots. GitHub's macOS runners do all of this in `.github/workflows/ios.yml`. It needs no Mac of
your own.

## How it works

| File | What it does |
|---|---|
| `selftest.js` | Test builds only. It reads `Documents/selftest/plan.json` from the app's container, runs one test from `www/test/`, and writes `result-<test>.json`. When the page needs a real screenshot or a trip to the background, it writes `req.json` and waits for `ack-<n>.json`. |
| `shim-lib.js` | A stand-in for `tools/playtest/lib.mjs`. The same play-tests that run on Chromium run here: `page` is the app's own page, `page.mouse` sends pointer events, `page.screenshot` asks the Mac, and `page.setViewportSize` turns the device. |
| `ios.mjs` | The iOS checks: platform, crypto, safe areas, sharp canvases, five fingers, rotation keeping the hub page, a painting and a recipe, background and back, an audio interruption, Sprout and phone voices, recording with a fake microphone, Photos, the backup file, the privacy policy, and the cloud backup. |
| `lang.mjs` | One language (en, es, hi, zh). It finds untranslated English on the hub and in Grown-ups, and checks which voice says what. |
| `after.mjs` | `keep`: after closing and reopening the app, the player, painting and recording are still there. `restore <code>`: on a wiped app, the family code brings everything back, then the cloud copy is deleted. |
| `store-shots.mjs` | App Store screenshots. It uses the same scenes as the Play screenshots (`tools/store-scenes.mjs`). |
| `run-sim.mjs` | Runs on the Mac. It writes the plan, launches the app, answers screenshot and background requests, and collects the results. |
| `make-sim.mjs` | Creates and boots a fresh simulator. It picks the device type by name (for example `iPhone Duo`). |
| `check-release-ios.mjs` | Run before every App Store archive. It refuses the self-test, local addresses, held-back features, the camera and network exceptions. It also checks the privacy manifest, permission texts, icon and version. |

Each test plan carries a `flat` setting:

- **Play-tests** (`tools/playtest`): `flat` is on. The game area is laid out from the window edge, because these tests were written for Chromium and use game positions as page positions.
- **iOS checks and store screenshots:** `flat` is off. They use the real layout inside the safe area, and `ios.mjs` checks that touches land in the right place there.

## Running on a Mac by hand

```sh
cd ios-app && npm ci
SPG_SELFTEST=1 node build-web.mjs && npx cap sync ios        # a TEST build (never upload it)
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/dd CODE_SIGNING_ALLOWED=NO build
cd ../../.. && UDID=$(node ios-app/test/make-sim.mjs --pick 'iPhone Duo' --name duo)
xcrun simctl install $UDID /tmp/dd/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl privacy $UDID grant microphone com.toastygames.littlesproutpark
node ios-app/test/run-sim.mjs --udid $UDID --label duo --out sim-results --tests ios,auto,store-shots
```

For the backup round trip, follow these steps:

1. Run `npx wrangler dev --ip 127.0.0.1 --port 8787` in the repo root.
2. Build with `SPG_TEST_API=http://127.0.0.1:8787`.
3. Add `NSAllowsLocalNetworking` to the test build's Info.plist. The workflow does this.
4. Run `ios,after:keep,after:restore`.

**Before an App Store build,** run `node build-web.mjs` again without `SPG_SELFTEST`. The release check refuses a test build.
