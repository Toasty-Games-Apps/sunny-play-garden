# Lessons from porting Little Sprout Park to iPhone, iPad and iPhone Duo

These are the problems that cost time, and the fixes that worked. File names are paths in `reference/`. "Run N" is the GitHub
Actions run where a problem showed up. Little Sprout Park took 25 Mac runs in all. Run 21 was the first with all seven
simulator jobs green; the later runs added the iPhone Duo screenshots and fixed photo saving on the big iPad.

## 1. Capacitor and packing

- **Capacitor 8 on iOS uses Swift Package Manager** (`ios/App/CapApp-SPM`), not CocoaPods. `npx cap sync ios` resolves the plugin
  packages. iOS 17 is the minimum: the game needs `navigator.audioSession` and other recent WebKit features.
- **The app's origin is `capacitor://localhost`.** On Android it is `https://localhost`. A server the game calls (backups) must allow
  exactly that origin and nothing wider. See `worker-origins.md`. Prepare the change for review; it is not live until it is deployed.
- **Leave the service worker out of the app.** The files are already on the device. `tools/app-web.mjs` doesn't copy `sw.js`, and
  `js/native.js` unregisters any old one.
- **The CSP stays in `index.html` as a `<meta>` tag.** The packer only adds the backup address to `connect-src`. Nothing else is
  loosened.
- **Media fetches from `capacitor://` report `status: 0` with the file in the body.** Never test a local audio fetch with `res.ok`
  alone. Use `fileOk` in `js/voice.js`: `res.ok || (res.status === 0 && res.type !== 'opaque' && res.type !== 'error')`.
- **The iOS file server only knows `.js` for scripts.** Test modules copied into `www/test/` are renamed from `.mjs` to `.js`, and
  their imports are rewritten (`build-web.mjs`).
- **Capacitor 8's `SystemBars` plugin owns the status bar and the home indicator.** Set `"SystemBars": { "hidden": true }` in
  `capacitor.config.json`. Overriding `prefersHomeIndicatorAutoHidden` in the view controller does nothing.
- **No storyboards.** The launch screen is `UILaunchScreen` in `Info.plist`: a background colour and an image from
  `Assets.xcassets`.

## 2. Screens, windows and the iPhone Duo

- **Never check the device model or screen size in native code.** The web view fills the window, and the page lays itself out from
  the window size. That one rule covers iPad split view, Stage Manager, rotation, both iPhone Duo displays, and phones nobody has
  made yet.
- **Read Apple's iPhone Duo guidance** (developer.apple.com/iphone-duo) for the current display sizes. The simulator's outer
  display is 466×678 pt at 3x. Its safe area is 84 pt on the camera side and 34 pt at the bottom, and it is on the side, not the
  top. The inner display is 669×951 pt.
- **WebKit's `env(safe-area-inset-*)` can read 0 on the iPhone Duo** while the side status bar and home indicator still cover the
  edges. Send the real `view.safeAreaInsets` from the view controller to the page (`SproutViewController.sendInsets`,
  `SPG.native.insets`, `--nat-*`). The CSS then uses the larger of the two: `--ios-t: max(env(safe-area-inset-top), var(--nat-t))`.
  See `web-patterns.md`. Use these variables everywhere, never `env()` directly.
- **Defer edge swipes** (`preferredScreenEdgesDeferringSystemGestures = .all`). A toddler sliding a finger off the edge then only
  sees the handle. A second swipe still leaves, so a grown-up is never locked in. Guided Access is the real lock on iOS (it replaces
  Android's screen pinning).
- **The game area can change size without a window `resize` event,** for example an iPad window settling a moment later or the
  safe area arriving late. Put a `ResizeObserver` on the game area and lay the running game out again when its size really
  changes (`js/app.js`: `laidOut`, `hostKey`). Without this, touches land on the old layout. Tidy Time missed every drag on the
  iPad mini until this was fixed.
- **WebKit snaps a scroll-snap strip to the nearest page the moment the phone turns, before the resize event.** That snap looked
  like the child turning the page. Only a real swipe, arrow or dot may change the remembered page. Ignore scrolling that comes with
  a new page width.
- **Narrow screens** (the iPhone Duo's outer display, the iPhone SE at 375×667) showed buttons covering game content. Check every
  screen at those sizes.
- **Canvases at up to 2x on iOS** (`SPG.ui.dpr`) keep the artwork sharp. Android stays at 1.5x for speed.
- **WebKit limits total canvas memory, most of all on the big iPad.** A canvas it cannot allocate silently draws nothing. When a
  kitchen photo went missing on the iPad Pro 13" (run 23), the photo was being drawn on a full-screen 1.5x spare canvas first. That
  canvas was removed, and the photo is now drawn straight at its final size. The proven cause turned out to be slow saving
  (section 4). Avoid big spare canvases anyway.

## 3. Sound, voice and the microphone

- **Play with the silent switch on.** For a pre-reader, sound is how they know what to do. Use `AVAudioSession` `.playback` in
  `AppDelegate.swift`, and `navigator.audioSession.type = 'playback'` in the page.
- **WebKit refuses the microphone while the page's audio session is `playback`.** Switch to `play-and-record` only while a
  grown-up records, then switch back and resume the `AudioContext` (`SPG.native.recording` in `js/native.js`, called by the
  recorder).
- **Ask for the microphone only when a grown-up starts recording.** `NSMicrophoneUsageDescription` must say what it is for. The
  in-app test counts `getUserMedia` calls (`selftest.js`) and fails if anything asks earlier.
- **`MediaRecorder` starts late on WebKit.** On a busy iPad the first take came back empty. Wait until it has really started (at
  most 1.5 s) before showing the recording bar.
- **After a call, Siri or an alarm, Web Audio stays suspended.** The view controller watches
  `AVAudioSession.interruptionNotification` and fires a window event (`spgaudioresume`). The page then resumes its
  `AudioContext`. It does the same when the app comes back to the foreground.
- **Five fingers mashing can start dozens of sounds at once.** Limit how fast the same sound can start again (Bunny Band: 110 ms).
- **The built-in voice** goes through `@capacitor-community/text-to-speech`, the same as on Android. Ready-made voice clips play
  first. Check every language's voice (the `lang` test checks which voice says what).

## 4. Saving, photos and storage

- **IndexedDB on WebKit is slow with Blobs.** `getAll()` of records that hold pictures took seconds on the iPad simulator. Its
  transactions also queue, so a save waited behind earlier reads (run 24: photos kept 20+ s late). Add an index, and count, tidy
  and delete by key (`count`, `getAllKeys`, `openKeyCursor`). Read pictures only to show them (`js/photos.js`, version 2, with an
  upgrade that keeps old data). Even then, the iPad Pro 13" simulator on GitHub's Macs took 8 to 40 s to write one photo, while
  making the picture took 0.1 to 0.35 s (run 25). So the game must never wait on a save (the camera is free again after 20 s at
  most), and tests must wait for a save by the clock (up to a minute), not for a fixed short time.
- **`localStorage` and IndexedDB survive closing the app** (the app's container). Test it anyway. `after.mjs keep` closes and
  reopens the app and checks that the player, painting and recording are still there. Also test a restore on a wiped app.
- **Photos: ask for add-only access** (`PHPhotoLibrary` `.addOnly`, the small `SproutPhotos` plugin in the view controller). The
  app can add pictures but never sees the library. Add-only access cannot make an album, so pictures land in Recents. Ask only
  behind the grown-up gate, never in front of the child.
- **Files and backups go through the share sheet** (`@capacitor/filesystem` writes to the cache, then `@capacitor/share` opens the
  sheet).
- **Face ID, Touch ID or the device passcode** for the grown-up gate: `@capgo/capacitor-native-biometric` with `useFallback: true`,
  plus `NSFaceIDUsageDescription`. The PIN or sum must always still work.

## 5. Privacy, permissions and Apple's rules

- **`PrivacyInfo.xcprivacy`:** set tracking to false, list no tracking domains, and list each data type actually collected
  (Little Sprout Park: an email, only if a grown-up turns on recovery). Add the required-reason APIs the plugins use: the file
  plugin needs `NSPrivacyAccessedAPICategoryFileTimestamp`, reason `C617.1`.
- **`ITSAppUsesNonExemptEncryption` = false** when the app only uses the system's standard encryption (HTTPS, Web Crypto). Then
  App Store Connect does not ask the export question for every build.
- **Permission texts in every language the app speaks** (`*.lproj/InfoPlist.strings`, list them in `CFBundleLocalizations`).
- **Only the permissions the app uses.** `check-release-ios.mjs` refuses the camera, background modes, tracking, location,
  contacts, full Photos access and any App Transport Security exception in a release build.
- **App icon: 1024×1024 PNG without alpha.** App Store Connect refuses an icon with alpha.
- **Screenshots: JPEG without alpha** at the exact sizes App Store Connect lists. The workflow converts the simulator PNGs with
  `sips`.
- **Android features with no iOS twin:**
  - A home-screen widget needs a separate WidgetKit extension; it was left out.
  - iOS has no back button.
  - Screen pinning becomes Guided Access.
  - The gallery album becomes add-only Photos.

  Say so in the handoff (`store/ios/APP-STORE-HANDOFF.md` has the table).

## 6. Signing and release

- **Signing uses an App Store Connect API key (Admin role)** and `xcodebuild -allowProvisioningUpdates -authenticationKeyPath ...`.
  Xcode makes the certificate and the profile itself, so none are stored anywhere. The key lives only in GitHub secrets
  (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64`). The workflow writes it to the runner's temp folder and deletes it at the
  end. `.gitignore` refuses `*.p8`, `*.p12` and `*.mobileprovision`.
- **Without secrets, build an unsigned archive** (`CODE_SIGNING_ALLOWED=NO`). It proves the device build compiles.
- **The build number must go up with every upload.** The workflow uses the run number unless you give one.
- **The release check runs before every archive**, and the workflow checks the built app again: no self-test, no Debug test
  plugin, no network exception.
- **A paid app needs the Paid Apps Agreement** (banking and tax) before it can go on sale. TestFlight works without it.
- **Keep the release manual** in App Store Connect. The Kids Category is the owner's decision: an app cannot easily leave it.

## 7. Testing inside the app on simulators

- **Playwright cannot drive an iOS app's web view.** The tests run inside the app instead:
  - The Mac (`run-sim.mjs`) writes a plan into the app's `Documents/selftest/` folder (`simctl get_app_container`) and launches the
    app.
  - The page (`selftest.js`, test builds only) reads the plan, runs one test module, and writes the result and its log back.
  - For things a page cannot do itself (a real screenshot, going to the background), the page writes `req.json`, and the Mac
    answers with `ack-<n>.json`.
- **`shim-lib.js` is a Playwright stand-in** with the same `page.mouse`, `page.evaluate`, `page.screenshot` and
  `page.setViewportSize`. The game's Chromium play-tests run unchanged inside the app. Tests that need a reload or a second
  browser stay on Chromium.
- **A Debug-only native test plugin** (`SproutTest`: info, an audio interruption, resizing the window, a snapshot) does what
  JavaScript cannot. It is inside `#if DEBUG`, and the release check refuses it otherwise.
- **The test build is a separate build** (`SPG_SELFTEST=1`). A local backup address is allowed only there, through
  `NSAllowsLocalNetworking`, which the workflow adds to the test build's `Info.plist` only. The release check refuses a test build.
- **A test that prints FAIL must fail the job even if it exits 0.** Set `process.exitCode = 1` in every test. `run-sim.mjs` also
  counts any line starting with `FAIL`, `FAILS:`, `n FAILED` or `PROBLEMS:` as a failure.
- **WebKit's `error.stack` has no message in it.** Always report `name: message` plus the stack (`T.err` in `selftest.js`).
- **Reading a file that is not there makes Capacitor's Filesystem log an error.** Check with `readdir` first, or the logs fill
  with fake errors.
- **In Chromium every `newPage` is a fresh browser; in the app it is the same app.** A play-test that assumes nothing is saved
  yet (an empty photo album, no players) must clear that state itself. The shim's `newPage` resets the settings and the player.
  A test that rebuilds a database deletes it first; `js/photos.js` closes its connection when asked (`onversionchange`). Run 25's
  album check failed on the iPad for this reason.
- **Reject with an `Error`, never the IDB event.** A rejected `Event` shows only as "THREW: [object Event]" in the Mac's log.

## 8. GitHub's Mac runners and their simulators

- **They are slow.** A simulator takes 3 to 5 minutes to boot, sometimes fails to boot, or hangs while installing.
  `make-sim.mjs` puts a time limit on every step and makes a new simulator, up to three times.
- **One `simctl` call can take minutes.** Every call has a time limit (`run-sim.mjs`). Ask for the app's folder once.
- **The app sometimes says nothing after a launch,** most often on the first test after installing. Relaunch after 5 silent
  minutes. A simulator that refuses two launches is shut down and booted again; the app, its data and its permissions stay.
- **Simulators draw few frames.** Game timers must count game time, and tests must wait for what they expect (a piece landing, a
  celebration), never for a fixed time. Throttle the CPU about 6x in Chromium to find these waits before they reach the Mac.
- **The iPad simulators run in windowed mode.** They cannot be rotated from code. Check rotation by resizing the window
  (`SproutTest.resize`). Test going to the background on the iPhones only.
- **Each device type runs on the newest iOS runtime that supports it.** In Little Sprout Park's runs, iOS 27.1 supported only the
  iPhone Duo, and every other device ran 27.0 (`make-sim.mjs`).
- **The smallest iPhone is picked by screen size.** Newer Xcodes no longer keep it in the device profile, so `make-sim.mjs` has a
  fallback table by name.
- **The iPhone Duo simulator's screen cannot be captured.** `simctl io screenshot` answers "Timeout waiting for screen surfaces".
  The app takes the picture of its own window instead (`SproutTest.snapshot`, which uses WKWebView `takeSnapshot` at the display's
  scale). A screenshot only counts once its picture is saved.
- **The iPhone Duo simulator has no fold control and shows only the outer display.** The inner display's size was tested as a
  resized iPad window. Test the real fold on a real device.
- **The big iPad is the slowest simulator.** Its checks and its play-tests run as two separate jobs.
- **`simctl io screenshot` can hang** (on the big iPad, for the whole 4-minute limit in run 25). Give it 90 s, delete a
  half-written file, and let the page take its own picture instead (`run-sim.mjs` `screenshot`, `selftest.js` `T.shot`).

## 9. Working in the loop without wasting runs

- **A Mac round is about an hour.** Before every push, run the same tests in Chromium at the matching window size.
- **Only one run at a time.** The workflow's `concurrency` cancels a run in progress when a new one starts. Wait for a run to
  finish before starting the next, and push docs-only commits with `[skip ci]`.
- **The agent may not be able to download artifacts** (in Little Sprout Park's sessions the proxy blocked GitHub's blob storage).
  Print everything that matters straight into the job log and the step summary: check counts, screenshot sizes, timings, and what
  the game saw when something failed. Reading long job logs through a subagent keeps the main conversation small.
- **On the first unexplained failure, add diagnostics instead of guessing.** Run 23's missing photo was only understood after
  run 24 logged the camera's state and timings. Then the fix was clear.
- **A runner that disappears** shows up as a 404 log and no results artifact. That is the runner's problem, not the game's: rerun
  only the failed jobs, once.
- **Most bugs the simulators found were real game bugs** that also hit Android and the website: hub page memory, the kitchen's
  camera column, a salon swipe between two frames, the recorder starting late, Bunny Band's sound pile-up, game layout after a
  resize, the camera's memory use, and photo saving. Fix them in the shared game code, not as iOS-only patches.
- **Results are from simulators.** Never say a device was tested unless a person tested it. List what still needs a real device:
  - the microphone prompt and how recordings sound;
  - the silent switch;
  - Face ID;
  - Photos;
  - a real call;
  - the iPhone Duo fold and its inner display;
  - first launch after installing from TestFlight.
