# Agent handoff (read this first if you are a new Claude/Codex session)

Little Sprout Park: a free, static, dependency-free browser games site for a 3-year-old pre-reader, packed into an Android app with Capacitor.
`CLAUDE.md` is the real manual (architecture, every game, how to add things). This file is the current state, what is verified, and what is left.
Rules that matter: big touch targets, spoken prompts, no reading needed, nothing can be lost or fail. Grown-up screens may use words; text the child hears must not use pronouns.

## Branches and how to work
- GitHub: `differentlightproductions-cyber/sunny-play-garden`. Remote branches: `main` (older) and `ccr-e238d69e-qo5vxv` (all current work). The old docs say `claude-android-app`; that branch does not exist any more. Push to the branch you were given, never open a PR unless the owner asks, never push to `main`.
- Commit trailers: the ones the harness gives you. Helper agents: the owner asked for at most two agents at once (the lead included); agent worktrees are cut from `main`, so give helpers files that did not change since `main`, or let them work in the main checkout on their own files without committing.
- No build step for the site: serve the folder (`python3 -m http.server`) and open `index.html`.

## What was done in the last round (branch ccr-e238d69e-qo5vxv, all pushed)
1. **Sprout Kitchen rework** (see the Sprout Kitchen entry in CLAUDE.md): drawings moved to `games/cook-art.js`; build-your-own burger (bun, 1-3 patties of any kind, five cheeses, bacon, veggies, sauces before the top bun) and sandwich (bread, meats, cheeses, veggies, sauces, top slice), hot dog in a real bun, pizza (spread sauce and cheese, toppings), a proper sundae glass; food fitted to its plate; intro card; calm 1.7 s step fade; instructions said once per step (no "all done" line, no nagging); toppings where touched with choice menus (sprinkles, candy, candles, fruit, 12 icing colours), icing pen clipped to the cookie, paint bucket fills; ingredients laid out as real recipe amounts with measuring-cup pours; cut-outs to a tray and dough into a tub; small bites where touched with crumbs (`eatPoints`, about nine bites per food); her pet is the corner helper with tips that stop once there is plenty; camera button and kitchen photo album (`js/photos.js`), Grown-ups switch to also save to the device (`SPG.native.saveToGallery`, `@capacitor-community/media` added to android-app/package.json).
2. **Fish Tank**: a fresh tank every new day with a 20-coin gift (`bag.day`, `FRESH_BONUS`).
3. **Frog** redrawn (`frogHead` in js/art.js: eyes on top with lids that blink, no second face; glasses sit on the frog's eyes).
4. **Pet Shop**: "None" first in each accessory section, owned items wear for free, an item worn by another pet shows that pet's face and cannot be worn (`P.wornBy`); the old wardrobe rows are gone.
5. **Coloring Book**: in the Android app the save button puts the picture straight into the phone's gallery (share sheet only as a fallback).

## Verified (headless Chromium, real mouse input)
- All 12 recipes end to end (`tools/playtest/auto.mjs`) at 1280x800, 390x844 and 844x390; `smoke2.mjs` ALL CLEAN; Pet Shop badge and None button; screenshots of decorating menus, counter piles and pours at tablet and phone sizes.

## NOT verified (needs the owner's phone, or real ears)
- Saving photos into the Android gallery (`@capacitor-community/media` 9.1.0, album "Sprout Park") needs an app build: run the Android workflow on this branch (version code 5 or higher).
- Sounds of pours, the tub lid, bites; how the phone voice reads the new lines (`cook-pickbun`, `cook-patties`, `cook-meat`, `cook-cheese`, `cook-veg`, `cook-saucetop`, `cook-scoop`, `cook-pizza*`, `cook-toppings`, `aq-fresh`). `RECORDING.md` is regenerated.

## Android app and getting a test file
- `.github/workflows/android.yml` ("Build Android app") builds in about 3 minutes. It runs on pushes to `claude-android-app` (which no longer exists) or by hand: Actions > Build Android app > Run workflow, pick the branch, give a version name and a version code higher than the last (the last test builds used 3 and 4; Play's first upload was 1). Or trigger it from an agent with the GitHub tool `actions_run_trigger` (`workflow_id` `android.yml`, `ref` the branch, inputs `version_name`, `version_code`).
- Artifacts on the run page: `app-debug-apk` (installable on a phone: unzip, tap the .apk; uninstall the Play version first because the signature differs, back up first) and `app-release-bundle` (the .aab for Play; unsigned until the owner adds `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` and the variable `SPG_API_BASE`).
- Build 22 (commit a6dcb45, version 1.0.0-test2) passed. The app and the website do not share saved data (use the backup file or family code).
- Version: the workflow's `version_name` input (default 1.0.0) goes to Gradle and, through `SPG_VERSION_NAME` in `build-web.mjs`, to `SPG.version` (Grown-ups > About), so Play and the app show the same name. Default version code is now 5 (above the test builds 3 and 4).

## Known small issues / ideas queued
- `native.js` `saveFile` returns false for both a cancelled share and a real failure.
- Worker: a request with `Origin: null` makes `new URL(origin)` throw (500 instead of 403).
- The step bar in the kitchen is crowded on a narrow phone for 7-step recipes.
- Pancakes still make three (the dish is a stack of three); sundae and burgers are single items.
- Not age-tiered (creative games): Fish Tank, Pet Care, Coloring Book, Style Studio, Pet Shop.
- Ideas: more recipes, a shopping/ingredient-pick step, recipe stars on the hub icon, a saved "my menu"; Hide and Seek houses she can walk into; digit tracing in the Trace activity; store screenshots (`tools/make-store-assets.mjs` GAMES list) do not include the kitchen yet.
- Owner still to answer: which games need "more depth", whether to PR these changes into `main`, the "kill code" for the web version, and telling testers that progress does not carry from the website to the app.

## Gotchas learned
- `perPage()` in js/app.js must match the hub grid CSS at the end of styles.css.
- Hub cards: select by name (`.card[aria-label="Fire Rescue"]`), never by `nth-child`. Opening a game from a script: dispatch a `click` with `detail: 0`.
- Test scripts must dismiss the first-run voices screen (`#vintro .btn.quiet`); `lib.mjs` `login()` does.
- Playwright cannot click `.lg-opt` buttons while they animate ("not stable"); dispatch `pointerdown` instead (`SPG.ui.press` acts on touch-down).
- `art.shade` takes six-digit hex colours only; the kitchen's own `shade` also takes `rgb()`.
- Never `pkill -f wrangler` in the sandbox shell (it kills the shell).

## Update (pet name screen + icing)
- Pet Shop name screen: Done/Cancel were pushed off-screen on tablets and short phones; now pinned (CSS at the end of styles.css, `askName` in games/petshop.js; first-time naming has no Cancel, renaming does). Player setup got sticky Back / Let's play! buttons. Long names shrink in `SPG.ui.nameGrid`.
- Kitchen icing redrawn in `games/cook-art.js` (`drawFrostSwirl` cupcakes, `drawCookieIcing`, `drawPiped`, `glitterField`/`twinkle`; cake gets gloss and sparkle). Needs a fresh Android build to reach the app.

## Update (reordering, device unlock, layering)
- Added: hub rearranging (hold 2 s + gate), fingerprint/phone-lock gate button (needs `npm install` in android-app so the biometric plugin is bundled, then `cap sync`; verify on a real phone: Grown-ups > Fingerprint or phone lock > Turn on), kitchen layering/plate pen/mini plates/camera cooldown, train shape previews, Hide and Seek peeking. See CLAUDE.md 'Latest round'.
- Not verified on hardware: the biometric prompt and long-press feel on a real tablet.

## Update (Style Studio, practice lines)
- Style Studio: pop-out pickers (compact tiles) for skin/eyes/lips/eyeshadow/cheeks, rainbow lipstick, silent colour taps, redrawn hands and aligned realistic nails, hands drawn in front of hair, snow/royal dress fixes. Letter Garden: new lined Practice page mode (switch in the trace letter picker). Hub: hold-to-rearrange. Gate: fingerprint/phone lock (needs `npm install` in android-app + real-device test). See CLAUDE.md 'Style Studio and Letter Garden updates'.
- Outfit fit: only the issues visible in the sheets were fixed (floating snow sleeves, royal trim); if more specific misfits are reported, render `P.draw` for the item (see the outfit-sheet approach: loop `P.CATS[cat]`) and adjust in js/people-wear.js.

## Update (accessibility, sign language, Sign Along, Shape Builder, Feeling Friends, Coloring Book)
- **Feeling Friends:** the hello line was cut off a moment after it began (the first story line stopped it); the first friend now waits for it. Story props no longer show early while the friend walks in. Four new stories (bubbles, rainbow, spider, a pal who takes the ball and brings it back) and a tier-3 "Why did I feel that way?" step.
- **Shape Builder:** fixed pieces that looked wrong (robot arms and legs, car wheels above the road, kite tail on the grass, floating flower leaves, the tree's stray triangle, the ice-cream table, sails); celebrations move only what was built (`bg` scenery stays); seven new pictures; tier 3 counts shapes before the celebration.
- **Coloring Book** (done by a helper agent, reviewed): six holiday collections, 24 colours, rainbow and glitter brushes, pattern fills, stickers; `tools/playtest/color.mjs`.
- **Accessibility** (Grown-ups, all off by default): signing hands for every line in every game (ASL, hands only, no person: the owner did not want a human figure), colour filters for colour blindness, stronger contrast, bigger buttons. New game **Sign Along**. See CLAUDE.md "Accessibility".
- How to look at signs: `IDS=HELLO,CAT,L:a node tools/playtest/sign-strips.mjs` writes a film strip per sign; `HANDS=1` draws every handshape. Every sign in js/sign-words.js was looked at this way.
- **Not verified:** the signs have not been checked by a Deaf signer or an ASL teacher (the owner should ask one to look through Sign Along); the colour filters on a real low-end tablet (an SVG filter over the whole page can cost frame rate; if it does, apply it to the game canvas only); how the six new coloring songs sound.
- Ideas queued: more Sign Along words.

## Update (sign videos, colour symbols)
- **Sign videos** (`js/signvideo.js`, Grown-ups > Accessibility > Sign videos, overlay `#signvid`): a grown-up records (camera, square crop through a canvas, no sound, up to 6 s, count-down 3-2-1) or chooses a video for any sign; the Signer plays it instead of the drawn hands (corner card and Sign Along). IndexedDB `spg-signvideo`, per device, not in the cloud backup. `_headers` now allows `camera=(self)`; privacy.html has a Camera section; `SPG.config.camera = false` removes the camera (file choice stays). Test: `tools/playtest/signvideo.mjs` (fake camera).
- **Not verified on hardware:** the camera in the Android app (the WebView needs the CAMERA permission in the app manifest on the `claude-android-app` branch for Record; Choose a video works without it), and recording on iPhone Safari (MediaRecorder gives mp4 there).
- **Colour symbols** (`SPG.vision.marks()/mark()` in js/access.js): white heart / bolt / sun / leaf / drop / moon / flower / paw per colour on Shape Builder pieces and holes and on Caterpillars balls; on with a colour filter unless switched off (`settings.colourMarks`).

## Update (languages: Spanish, Hindi, Chinese)
- **Languages now:** English, Spanish (Latin America, es-419), Hindi (hi-IN) and Mandarin Chinese, Simplified (zh-CN): every screen text and spoken line in every game and in Grown-ups. The owner will add more languages later. How it works, the rules for new text and how to add a language: CLAUDE.md "Languages". Checks: `node tools/check-i18n.mjs` (must say "every language is complete") and `node tools/playtest/i18n.mjs` (ALL CLEAN).
- **Release (for Codex or whoever uploads to Play): release to all countries and regions available in Play Console.** The owner asked for this. Production (and the test tracks) > Countries / regions > select all. Add the translated listings from `store/es`, `store/hi`, `store/zh` (store/PLAY-STORE-GUIDE.md section 5, "Translated listings"). Nothing else changes for the build: `build-web.mjs` copies `js/lang/` with `js/`.
- Letter Garden: Spanish has its own ABC (Spanish letter names, syllable sounds, picture words; no Ñ yet); Hindi and Chinese learn the English ABC, said in English. ASL stays ASL. Handwriting letters now draw accents (yoyó).
- Store text: the English full description was over Play's 4000 characters (4239); it is shortened and mentions the languages. `tools/check-release.mjs` now checks every listing's lengths. `tools/make-store-assets.mjs` has `STORE_LANG=es|hi|zh` (phone screenshots and feature graphic in that language, written to `store/<lang>/`).
- Fixed on the way: in the Coloring Book on small phones the pet companion sat on the home button and took the tap (`placeBuddy` keeps it clear of the home button and stars); a long Pet Shop name on the hub covered the OPEN sign (`fitSign`).
- **Not verified:** none of the translations has been read by a native speaker yet (the owner should ask one per language to play through); how the phone voices sound in each language on a real Android phone; Hindi and Chinese fonts on an old phone.

