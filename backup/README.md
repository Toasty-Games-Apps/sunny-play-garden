# Held back from releases

Two features live in this folder until the owner approves them. They are not in the app, the Android build, the
offline cache or the website.

| Folder | What it is | Why it is held back |
| --- | --- | --- |
| `sign-language/` | The signing hands (a corner card that signs everything the games say) and the **Sign Along** game | The hand designs need more work. They are approved by the owner before they ship. |
| `camera-sign-videos/` | Grown-ups record their own sign videos with the front camera (Grown-ups > Accessibility) | Camera access changes the Play Console privacy answers (Data safety, permissions). Kept out until that is wanted. |

`android-app/build-web.mjs` stops a build if any of these files, or a camera call (`getUserMedia({ video })`), turns up in
`js/` or `games/`. `node tools/check-release.mjs` checks the same things, plus the CAMERA permission and the privacy policy.

## See them without putting them back

```
node backup/preview.mjs          # then open http://localhost:8400
```

This serves the normal app and adds the held-back scripts to the page as it is sent. The real `index.html` is never
changed. The tests run the same way:

```
node backup/sign-language/tools/signs.mjs [W H]        # Sign Along and the corner hands
node backup/sign-language/tools/sign-strips.mjs        # film strips of every sign, for reviewing the hand designs
node backup/camera-sign-videos/tools/signvideo.mjs     # sign videos with a fake camera
```

Screenshots go to `$SHOTS` (default /tmp).

## Still to do before they ship

- **Hands:** the owner found them too strange-looking. Review them with `sign-strips.mjs` and the preview, and get the
  designs approved.
- **Done in this folder:**
  - Signing is slower by default (Grown-ups > Accessibility > Signing speed: Slow / Medium / Normal, `signPace`).
  - Turning the hands on turns the spoken voice off. The grown-up can switch "Also speak out loud" back on to have both.
    Turning the hands off brings the voice back as it was.

## Putting sign language back (after approval)

Each file brings its own settings, voice lines, age rule and hub colour, so nothing else in the app needs editing:

1. Move the files back with `git mv`:
   - `sign-language/js/*.js` goes to `js/`
   - `sign-language/games/signlang.js` goes to `games/`
   - the tests go to `tools/playtest/`. In each test, change the import to `./lib.mjs` and delete the `process.env.HELD` line.
2. Add the CSS in `sign-language/sign.css` to the end of `styles.css`.
3. In `index.html`:
   - put `<script src="js/sign.js"></script>`, `js/sign-words.js` and `js/signs.js` right after `js/voice.js`
   - put `<script src="games/signlang.js"></script>` right after `games/sort.js`
4. Add the same files to `ASSETS` in `sw.js` and bump `CACHE`.
5. Remove those names from the held list in `android-app/build-web.mjs` and `tools/check-release.mjs`.
6. Store listings (`store/listing.md` and `store/es|hi|zh/listing.md`): add the Sign Along line back. The English one was:
   *"Sign Along: learn sign language (ASL) with a friendly pair of hands: everyday words, animals, food, colours, numbers,
   the alphabet and your own name."*

The translations for every sign screen and line are still in `js/lang/*.js`.

## Putting the camera sign videos back (only with the Play Console changes)

1. Do the same file moves: `camera-sign-videos/js/signvideo.js` goes to `js/` and is loaded after `js/signs.js`, and its
   CSS goes into `styles.css`.
2. `_headers`: `Permissions-Policy: camera=(self)`.
3. Android manifest (`android-app/android/app/src/main/AndroidManifest.xml`):
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-feature android:name="android.hardware.camera" android:required="false" />
   <uses-feature android:name="android.hardware.camera.front" android:required="false" />
   ```
4. `privacy.html`, after the microphone section (then run `node tools/sync-privacy.mjs`):
   ```html
   <h2>Camera</h2>
   <p>The camera is used <strong>only</strong> when a grown-up taps Record in Grown-ups &rarr; Accessibility &rarr; Sign videos, to film
   themselves making a sign in sign language so the games can show it to the child. The videos have no sound, are stored on that device
   only, are never uploaded (they are not part of the cloud backup) and can be deleted at any time from the same screen. The app never
   uses the camera in the background.</p>
   ```
5. Play Console: declare the camera in Data safety (used on device only, not collected or shared) and update the
   permissions answers.
