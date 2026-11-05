# Prompt for the next agent

Paste this to the agent along with the kit zip. Fill in the parts in [brackets] and delete what does not apply.

---

Prepare [APP NAME] for iPhone and iPad, including clean iPhone Duo support. Keep the whole game exactly as it is: the artwork,
animations, sounds and saved progress. Use Capacitor for iOS, the same approach the Android app uses. Keep the artwork sharp and
correctly proportioned.

Attached is `ios-port-kit.zip`, from porting Little Sprout Park the same way. **Read `START-HERE.md` and `LESSONS.md` first**, and
copy the files in `reference/` rather than starting from nothing. Change every identity in `IDENTITY.md` to this app's own. Many of
the problems in `LESSONS.md` will come up again; use the fixes listed there.

Apple setup:
- App name: [App Store name, 30 characters at most]
- Bundle ID: [com.example.app] (the same as the Android app, if there is one)
- Apple Team ID: [XXXXXXXXXX]
- App Store Connect app ID: [number]
- SKU: [SKU]
- First version: [1.0.0]
- Price and model: [for example: $2.99 paid up front, everything included, no ads, no tracking, no in-app purchases, no subscriptions]
- Release: manual

Repository: [owner/repo], branch [branch]. GitHub secrets for signing: [set / not set yet] (`ASC_KEY_ID`, `ASC_ISSUER_ID`,
`ASC_KEY_P8_BASE64`, from an App Store Connect API key with the Admin role). macOS runner label: [for example xcode-27, or ask me].
[A Mac is / is not available through Remote Control.]

1. Look at the current packaging and the native bridge first. Then add the iOS app (`ios-app/`) with Capacitor dependencies that
   work together. Pack every game file inside the app so it plays offline. Leave the Android app's behaviour unchanged, and keep
   the changes small and targeted.
2. iPhone Duo support is required for release. Read Apple's current guidance at https://developer.apple.com/iphone-duo/. Test its
   displays, compact and expanded layouts, resizing, rotation, safe areas and system overlays. A screen change must keep the
   active game, its menu page, anything the child made, and their progress. Buttons must stay reachable, and touches must land
   where the finger is. Also support smaller iPhones and iPads.
3. Bring every game across. Check multi-touch, dragging, audio interruptions, going to the background and back, and a toddler
   tapping very fast.
4. [If the app records or plays voices:] Make recording work on iOS: the permission prompt, recording, playback, saving, export
   and any backup. Ask for the microphone only when a grown-up starts recording. Check the built-in voice in every language.
5. Adapt picture saving and sharing, parent gates, PIN or Face ID, timers and player profiles to iOS. List every Android-only
   feature (widgets and so on), and say what happens to each one on iOS. [Features to keep out of this release: ...]
6. [If the app uses a server:] Check the server's allowed origins against the iOS app's origin (`capacitor://localhost`). Keep
   them narrow, and prepare any server change for my review before it is deployed.
7. Set up signing, app icons, the launch screen, permission texts, the privacy manifest and the export-compliance answer, following
   Apple's current requirements. Keep the [no ads / no tracking / no subscriptions / no in-app purchases] model.
8. Build on macOS (Xcode or GitHub's macOS runners). When signing is available, make an archive or IPA that is ready for
   TestFlight. Tell me exactly which credentials or device access are missing. Never commit signing material, and never claim a
   device was tested when only a simulator was.
9. Capture real iPhone, iPad and iPhone Duo screenshots from the working iOS build. Write build instructions, test results, known
   issues and a short handoff for App Store Connect, using the kit's `store/ios/APP-STORE-HANDOFF.md` as a template. Keep the
   release manual.

Keep tokens and signing credentials private. Ask me only for account access, signing credentials, device testing, or decisions
that really are mine. Keep going until every simulator job passes in the same run.
