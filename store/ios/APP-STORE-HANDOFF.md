# App Store Connect handoff: Little Sprout Park for iPhone and iPad

This is for whoever finishes the App Store Connect side. The app itself is in `ios-app/`. `ios-app/README.md` explains how to build
it. **Releasing stays manual:** keep "Manually release this version" selected, and never switch on automatic release.

## The app record (already made by the owner)

| | |
|---|---|
| Name | Little Sprout Park: Kids Games (30 characters, the maximum) |
| Bundle ID | `com.toastygames.littlesproutpark` (the same as the Android app) |
| Team ID | `6437343CNQ` |
| Apple ID of the app | 6830382328 |
| SKU | SPG-IOS-001 |
| First version | 1.0.0 |
| Price | $2.99 (US), paid up front. Every game and every update is included. No in-app purchases, no subscriptions, no ads. |
| Release | Manual |

**Paid apps need the Paid Apps Agreement.** It must be active in App Store Connect > Business, with banking and tax forms
complete, before a paid app can go on sale. TestFlight works without it.

## Getting a build into TestFlight

**Status (5 November 2026):** build **1.0.0 (28)** is in TestFlight. Run 28 of **Build iOS app** (commit `427ab4f`) archived it
unsigned and the export signed it "Apple Distribution: Nicholas Olsen (6437343CNQ)" with the profile "iOS Team Store Provisioning
Profile: com.toastygames.littlesproutpark" (App Store, no device list, valid until 5 November 2027). The upload succeeded, Apple
processed it in about 3 minutes (`VALID`, export compliance answered by the Info.plist), and the `testflight` job added it to the
internal group **Family**, where it is `IN_BETA_TESTING`. Nothing was submitted for review; version 1.0.0 is still in Prepare for
Submission with manual release. Steps 1 and 2 below are done; repeat 3 to 5 for each new build.

1. **The owner makes an App Store Connect API key.** Go to Users and Access > Integrations > App Store Connect API > Team Keys, and
   use the **Admin** role, so Xcode can create the distribution certificate and profile. Download the `.p8` file. It can be
   downloaded only once.
2. **Add three repository secrets** in GitHub, under Settings > Secrets and variables > Actions. Never paste the key into an issue,
   a chat or a file in the repo.
   - `ASC_KEY_ID`
   - `ASC_ISSUER_ID`
   - `ASC_KEY_P8_BASE64`, made with `base64 -i AuthKey_XXXX.p8`
3. **Start the build** with version `1.0.0` and **upload** ticked (`tests: none` is enough when the simulator tests already passed
   on the same game code). The workflow is only on this branch, not on `main`, so GitHub's website shows no "Run workflow" button for
   it: start it with `gh workflow run ios.yml --ref ccr-812ba91c-62t8en -f version=1.0.0 -f upload=true -f tests=none` or through
   the API. The `archive` job builds the archive **unsigned** and the export signs it for the App Store with the cloud-managed
   Apple Distribution certificate. (Automatic signing would sign the archive for development, and that needs a registered device:
   run 27 failed that way.) It checks the signature, keeps `SproutPark-ipa` and sends it to App Store Connect. Each upload needs a
   higher build number: by default it is the run number, or set `build_number`.
4. **Apple processes the build** (usually 10 to 30 minutes). The `testflight` job waits for that and adds the build to the internal
   group **Family** (`ios-app/testflight-group.mjs`). The export question should not be asked: `ITSAppUsesNonExemptEncryption` is
   `false`. The app uses only standard encryption built into iOS: HTTPS, and Web Crypto AES-GCM to protect the family's own backup.
5. **Test it** from the TestFlight app on a real iPhone, iPad and iPhone Duo. See "Not tested yet" below.

## Cloud backup: deploy the worker before release

In the iOS app the game runs from `capacitor://localhost`. The backup service only answers the website and allowed app origins.
`worker/index.js` now allows exactly two app origins:

- `https://localhost` (Android)
- `capacitor://localhost` (iOS)

Every other origin still gets 403. The change is 5 lines, and it is in git history for review. **It is not deployed.** Until
someone runs `npx wrangler deploy`, backup, family-code restore, voice backup and recovery email will fail in the iOS app. Nothing
else does. The release build already points at `https://sunny-play-garden.nicholasolsen22.workers.dev` (repository variable
`SPG_API_BASE`).

## Listing text

The English draft is already saved. If it needs filling in, these follow the Play listing (`store/listing.md`), adapted for iOS.

- **Subtitle** (30): `Calm learning games, ages 2-7`
- **Promotional text** (170): `A calm park of gentle games for little ones: letters, shapes, colouring, cooking, pets and more. Buy once and every game and every update is included.`
- **Keywords** (100): `toddler,preschool,kids,learning,alphabet,letters,abc,coloring,shapes,counting,puzzle,kindergarten`
- **Description:** the Play description from `store/listing.md`, with two changes. "the same on every phone" becomes "on every
  iPhone and iPad". The grown-ups line becomes "behind a grown-up check, your own PIN or Face ID".
- **Spanish, Hindi and Chinese:** translate from `store/es`, `store/hi` and `store/zh/listing.md`, the same way. Use the App Store
  locales Spanish (Mexico), Hindi (if App Store Connect offers it for this app) and Chinese (Simplified).
- **Category:** Education. A second category could be Games > Family.
- **Support URL:** an address with contact details is needed, for example `https://sunny-play-garden.nicholasolsen22.workers.dev/`.
  Its page links to support by email.
- **Privacy policy URL:** `https://sunny-play-garden.nicholasolsen22.workers.dev/privacy.html`. It covers the iOS app, including
  Face ID, add-only Photos and no camera. Deploy the site so the updated page is live.
- **Copyright:** `2026 Toasty Games`

## Screenshots

These come from the simulator test run. Download the artifacts from the latest **Build iOS app** run. The `appstore/` folder in
each one has JPEGs without alpha.

| App Store Connect slot | Artifact | Size |
|---|---|---|
| iPhone, Dynamic Island, medium (required) | `sim-iphone-games` | 1206 × 2622 |
| iPhone, Dynamic Island, large (optional) | `sim-iphone-max` | 1320 × 2868 |
| iPad 13" (required) | `sim-ipad-13` | 2064 × 2752 |
| iPhone Duo, outer display | `sim-iphone-duo` | 1398 × 2034 |

The sizes are what the simulators produce; check them against the run. The Mac cannot capture the iPhone Duo simulator's screen
(`simctl io screenshot` answers "Timeout waiting for screen surfaces"), so on that simulator the app takes the picture of its own
window (the Debug-only `SproutTest.snapshot`: WebKit draws the page, canvases included, at the display's scale, so the PNG has the
display's pixel size; the status bar and home indicator are hidden in this app anyway). The iPhone Duo simulator on GitHub's Macs
shows only the outer display and has no fold control, so there are no inner-display (2007 × 2853) screenshots yet. Take those on a real iPhone Duo
from TestFlight if App Store Connect asks for them. The scenes are hub, kitchen, coloring, feelings, fishing,
Pet Shop, rain, tracing, shapes and pet care. They are the same as the Play screenshots, but without captions. Upload up to 10 per
slot.

## Age rating, kids and privacy answers

- **Age rating questionnaire:** None for every content item. No web access, no messaging, no user-generated content shared with
  others, no ads, no gambling, no contests. Under parental controls, answer that settings are behind a grown-up gate. The rating
  should come out as 4+.
- **Made for Kids (Kids Category):** this is the owner's decision. Once an app is in the Kids Category it is hard to leave. The app
  already does what the Kids Category asks for:
  - no third-party analytics or ads;
  - no links out of the app;
  - every purchase-like or outside action is behind a grown-up gate.

  One thing to weigh: the optional recovery email is sent through an email service (Resend) to send the message. Only a grown-up
  can give it, behind the gate. If the Kids Category is chosen, the age band that fits best is "5 and Under". The game is for about
  2 to 7, and its first player is 3½.
- **App Privacy (the nutrition label):**
  - Tracking: **No.**
  - **Contact Info > Email Address:** collected only if a grown-up turns on the recovery email. Linked to the user, used for App
    Functionality, not for tracking. This matches `PrivacyInfo.xcprivacy`.
  - **User Content (Audio Data, Other User Content):** only in the optional cloud backup, which is end-to-end encrypted with the
    family code (the server cannot read it). Apple has no exemption for encrypted data, so the careful answer is to declare it:
    App Functionality, not linked to the user, not for tracking.
  - Nothing else leaves the device: no analytics, no crash reporting, no device ids.

## App Review notes (paste into "Notes")

```
Little Sprout Park is a calm games park for young children (about 2-7). There is no account, no login, no ads, no in-app
purchases and no links out of the app. Everything works offline.

Grown-ups area: tap the small lock button on the main menu, then answer the spelled-out sum (for example "seven plus five").
In there are the play-time limit, night mode, players, languages (English, Spanish, Hindi, Chinese), photos, backup and
family voice recording.

Microphone: used only in Grown-ups > Sound and voices, when a grown-up chooses to record family members saying the game's lines.
The system asks for permission only when recording starts. Recordings stay on the device unless the optional encrypted backup is
on.
Photos: add-only access, used only to save a child's finished picture. The system question is asked behind the grown-up gate.
Face ID: an optional way to open the grown-ups area (Grown-ups > Locks and safety); the sum always works too.
Cloud backup (optional): the family's data is encrypted on the device with a family code before it is uploaded; the server
cannot read it.
The app does not use the camera.
```

## Android features and their iOS status

| Android | iOS |
|---|---|
| Home screen and Flip cover **widget** (four mini games) | **Not in this release.** An iOS widget would be a separate WidgetKit extension. The app reports nothing to a widget on iOS. |
| Back button goes back inside the app | iOS has no back button. Swipes from the edges are deferred, so a stray swipe only shows the handle and a second swipe leaves. |
| Screen pinning (lock the child in) | **Guided Access.** Grown-ups > Locks and safety explains how to turn it on. |
| "Sprout Park" album in the gallery | **Photos with add-only access.** The app can add pictures but never sees the library. They appear in Recents, because add-only access cannot create an album. |
| Fingerprint or phone lock for the gate | **Face ID, Touch ID or the device passcode.** It is optional, and the PIN or sum always works. |
| Phone's text-to-speech | iOS voices, through the same plugin. Sprout voice clips play first, as on Android. |
| Share sheet for backup files and pictures | The same, with the iOS share sheet. |
| Microphone permission | Asked only when a grown-up starts recording. The tests check that nothing asks before then. |
| Sign language and camera sign videos | Held back on both platforms (`backup/`). The release check refuses them, and the iOS app has no camera permission. |

## What the simulator runs check

Every push that changes the game runs the **Build iOS app** workflow: the games' own play-tests and the iOS checks run inside the
real app on these simulators (iOS 27, Xcode 27):

| Job | Simulator | Tests |
|---|---|---|
| `iphone-max` | iPhone Pro Max (440 × 956 pt) | iOS checks, cloud backup against the real worker code on the Mac, data kept after closing the app, restore on a new phone, all four languages, screenshots |
| `iphone-games` | iPhone Pro (402 × 874 pt) | the games' play-tests (all 15 kitchen recipes, Shape Builder, Tidy Time, Caterpillars, Feeling Friends, Fishing Pond, Clay Corner, Pet Care, Hair Salon, Hide and Seek, numbers, age tiers, fixes, monkey), screenshots |
| `iphone-small` | iPhone SE (3rd generation), 375 × 667 pt: the smallest iPhone Xcode 27 offers | iOS checks, the monkey test (every game mashed like a toddler), kitchen, Tidy Time |
| `ipad-13` | iPad Pro 13" | iOS checks, Clay Corner, fixes, screenshots |
| `ipad-13-games` | iPad Pro 13" (a second simulator) | kitchen (all 15 recipes), Shape Builder, monkey |
| `ipad-mini` | iPad mini (744 × 1133 pt) | iOS checks (including the window resized to the iPhone Duo's outer 466 × 678 and inner 669 × 951 pt displays, a 375 pt phone and a short wide window), monkey, Tidy Time |
| `iphone-duo` | iPhone Duo, outer display (466 × 678 pt, safe area 84 pt on the camera side and 34 pt at the bottom) | iOS checks, kitchen, monkey, Tidy Time, Shape Builder, screenshots |

The iOS checks cover: the game fills the window and every button stays inside the real safe area; turning the device and resizing
the window keep the hub page, the open game, the painting and the recipe step; canvases stay sharp; five fingers at once; taps and
swipes land under the finger; going to the background and back; a phone call ending; the Sprout voice and the phone's voices; the
microphone asked for only when recording starts; recording, playback, backup file, restore; Photos (add-only); the gate and
Face ID; the privacy page.

Things the simulators showed about themselves (not about the app):

- The iPad simulators run in iPadOS windowed mode. The test cannot turn them ("the current windowing mode does not allow
  programmatic changes to interface orientation"), and opening Settings leaves the app on screen beside it, so the iPad jobs check
  turning by resizing the window and leave going to the background to the iPhone jobs.
- The simulators on a build server draw far fewer frames than a phone. Game timers count in game time, so the play-tests wait for
  what they expect (a celebration, a piece landing) instead of a fixed time. `SLOW=6` runs any play-test with a throttled CPU in
  Chromium to find such waits before they reach the Mac.
- On a busy build server one `simctl` call (closing the app, finding its folder) can take minutes. The runner asks for the app's
  folder once, the test page reloads by itself when a new test plan arrives, an app that says nothing for 5 minutes is
  started again, and a simulator that refuses two launches in a row is shut down and booted again (the app, its data and its
  permissions stay). Turning or resizing waits until the window has kept the same size for a second. The big iPad, the slowest
  simulator, runs its checks and its play-tests as two jobs. A screenshot may take the Mac up to 4 minutes, and the page waits
  for it, so a late one never pictures a later moment.
- A simulator on a busy build server can fail to boot (`simctl bootstatus` gave up after 136 s) or hang while the app is
  installed (more than 9 minutes). The setup gives each step a time limit and makes a new simulator, at most three times.
- `simctl io screenshot` cannot capture the iPhone Duo simulator (two built-in displays; "Timeout waiting for screen surfaces"),
  and earlier runs had passed without saving any iPhone Duo picture. Now the app sends a picture of its own window when the Mac
  cannot take one, and a store screenshot only counts once its picture is saved.
- On the big iPad simulator, writing one kitchen photo took 8 to 40 seconds (making the picture took 0.1 to 0.35 s), and one
  `simctl` screenshot hung for 4 minutes (run 25). The game never waits on a save. The tests wait for a save by the clock, and a
  screenshot that has not come in 90 s is taken by the app itself instead. On a real iPad, check that a kitchen photo shows up
  in the album straight away.

Bugs the simulator runs found in the game, fixed for every platform:

- The hub could come back on another page after the screen was turned and turned back: the page strip also scrolls by itself while
  the screen changes size (late and in steps on a slow phone), and that scrolling moved the remembered page. Now only a swipe, the
  arrows or the dots change it. After the iPhone Duo's side safe area arrived the strip could also stay scrolled by the old page
  width; it now goes back onto the same page. WebKit also snaps the strip to the nearest page the moment the phone turns, before
  the window's resize event, so right after a swipe that snap looked like her own page turn (the iPhone went back to the first
  page); a scroll that comes with a new page width now never counts as hers.
- On narrow screens (the iPhone Duo's outer display, the iPhone SE) the kitchen's camera and undo buttons covered the left-hand food
  when there were several cookies, cupcakes or sandwich pieces, so the last bites there could not be taken. Several foods now keep
  that column free.
- In the Hair Salon a quick swipe that started and ended between two frames (a slow phone, a busy moment) cut nothing; lifting the
  finger now cuts along the rest of the path.
- WebKit starts a voice recording a moment after it is asked to; on a busy iPad the first take could come back empty. The recorder
  now waits for it to really start (at most 1.5 s) before the guided recorder's bar begins.
- Bunny Band: five fingers mashing the same friends could start about 67 sounds at once. The same friend struck again within
  0.11 s now only hops (about 34 at most).
- A game whose area changed size with no resize event for the window (an iPad window settling a moment later) kept its old
  layout, and her touches landed in the wrong place: in Tidy Time on the iPad mini every drag missed after the window was
  resized. The app now lays the running game out again whenever its area really changes size (a ResizeObserver), and
  `fixes.mjs` checks it (the check fails on the old code).
- Sprout Kitchen's camera on the big iPad (run 23): one pancake photo was not kept, though the other 14 recipes' were. The photo
  used to be drawn on a full-screen copy at 1.5x first (about 13 MB more canvas on that iPad, where WebKit's canvas memory is
  limited), and a photo that could not be made or kept left the camera resting or, if the save never finished, dead for the
  rest of the recipe. The food is now drawn straight into the photo at its final size (the same picture), a failed photo leaves
  the camera ready at once, a save that never finishes frees it after 20 s, and the photo count only goes up for a photo really
  kept. `fixes.mjs` checks all three (they fail on the old code); the kitchen test now says what the game saw when a photo is missing.
- Run 24 then showed what was really slow on that iPad: the touch reached the camera and the photo was made, but it was only
  kept after more than 20 s. Saving a photo read every photo already in the album (the pictures themselves) to tidy it, and so
  did each return to the kitchen menu, so the next save waited behind them; it got slower as the album filled and hit the
  shortest recipes. The photo store (`js/photos.js`, version 2) now has an index by player and game: a photo counts as kept as soon
  as it is written, the tidying afterwards and every count read the index alone, and older albums are moved over once with
  nothing lost (`fixes.mjs` builds an old album and checks it).

## Simulator results (latest full run)

**Simulators only.** Run 26 of **Build iOS app**, 5 November 2026, commit `d93abd2`, Xcode 27.2 (27B48) on GitHub's `xcode-27`
Macs. All seven simulator jobs passed in the same run, and the Release archive built (unsigned: no signing secrets yet). Run 21
(commit `24ee999`) was the first run where every job passed; run 26 is the first all-green run since the photo album version 2,
the iPhone Duo pictures and the slow-save checks were added. The numbers are what the run printed. A check is one `ok(...)` line of the iOS tests; a
play-test passes when it prints no FAIL line and no page error.

| Job | Simulator, and what the app saw | Tests (all passed) |
|---|---|---|
| `iphone-max` | iPhone 18 Pro Max, iOS 27.0; 440 × 956 pt at 3x, safe area 62 pt top, 34 pt bottom | iOS checks (101), data kept after closing (6), restore on a new phone (8), English, Spanish, Hindi, Chinese (10 each, the phone has a voice for each), 10 store screenshots (1320 × 2868). Cloud backup: made, restored with the stars, voices sent, cloud copy deleted, against the real worker code on the Mac |
| `iphone-games` | iPhone 18 Pro, iOS 27.0; 402 × 874 pt at 3x | kitchen: all 15 recipes, each with its photo and the undo after eating, no page errors; Shape Builder (60 pictures, tiers 1 to 3); Tidy Time; Caterpillars; Feeling Friends (every story); Fishing Pond; Clay Corner; Pet Care grooming; Hair Salon; Hide and Seek (ages 2, 4, 7, five places each); numbers at four sizes; age tiers 2, 4, 7; fixes (including the old photo album moved to version 2); monkey (all 20 games mashed); 10 store screenshots (1206 × 2622) |
| `iphone-small` | iPhone SE (3rd generation), iOS 27.0; 375 × 667 pt at 2x, no safe area | iOS checks (88), monkey, kitchen (all 15 recipes, photo and undo), Tidy Time |
| `ipad-13` | iPad Pro 13-inch (M5), iOS 27.0; 1032 × 1376 pt at 2x | iOS checks (132), Clay Corner, fixes (including the album and a photo kept on a slow save), 10 store screenshots (2064 × 2752) |
| `ipad-13-games` | iPad Pro 13-inch (M5), iOS 27.0, a second simulator | kitchen (all 15 recipes, photo and undo), Shape Builder (60 pictures, tiers 1 to 3), monkey |
| `ipad-mini` | iPad mini (A17 Pro), iOS 27.0; 744 × 1133 pt at 2x | iOS checks (132, including the window resized to the iPhone Duo's two display sizes), monkey (all 20 games), Tidy Time |
| `iphone-duo` | iPhone Duo, iOS 27.1; outer display 466 × 678 pt at 3x, safe area 84 pt on the camera side, 34 pt bottom (WebKit's own `env()` matched) | iOS checks (99, including turning), kitchen (all 15 recipes), monkey, Tidy Time, Shape Builder (60 pictures), 10 store screenshots (1398 × 2034, the app's own picture of its window) |

What the run also showed:

- **Photo saving on the simulators is slow.** A kitchen photo was drawn in 0.1 to 0.4 s, but writing it to the album took 10 to
  38 s on the iPad Pro 13" simulator and 12 s on the iPhone 18 Pro one. Every photo was kept, and the tests now wait for it. On a
  real iPad, check that a kitchen photo shows in the album right away.
- **The Mac's screenshot sometimes hangs.** `simctl io screenshot` timed out once on the iPhone 18 Pro Max, once on the iPad
  Pro 13" and for the whole Shape Builder test on the second iPad. It never answers on the iPhone Duo. Each time the test used the
  app's own picture of its window instead, at the same pixel size, so no picture was lost.
- On the iPad mini the runner's 5-minute relaunch was used once (the app was started but the test page said nothing at the start
  of the first test). The test then ran and passed. No simulator had to be restarted. On a phone, check that the first launch
  after installing from TestFlight opens promptly.
- The iPads stay in windowed mode: turning is checked by resizing the window there, and going to the background on the iPhones.

## Not tested yet (needs real devices)

All iOS testing so far is in **simulators** on GitHub's macOS runners, with Xcode 27 and iOS 27. It was **not** done on a physical
iPhone, iPad or iPhone Duo. These still need a person with a device and TestFlight:

- the real microphone and the permission prompt, and how recordings sound. On iOS the page's sound is set up to play with the
  silent switch on, and WebKit refuses the microphone in that mode, so the app switches to play-and-record only while a grown-up
  records (`SPG.native.recording`). In the simulators that path records (the Mac's input, about 35 KB for a short line) and the
  game's sound comes back afterwards; on a device check the permission prompt, the recording and the sound afterwards;
- the speaker with the ring/silent switch on;
- Face ID, Touch ID and passcode;
- saving to Photos and the share sheet;
- a real phone call or alarm in the middle of play;
- folding and unfolding a real iPhone Duo during play, and the inner display. The simulator has neither, so the inner display's
  size was only tested as a resized window on an iPad;
- speed on older iPads;
- the recovery email to a real inbox.

## Changing things later

- `ios-app/test/check-release-ios.mjs` runs before every archive. It refuses a build with the test harness, a local address,
  held-back features, the camera, or a network exception.
- Version and build numbers come from the workflow inputs (`MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`).
