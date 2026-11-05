# Prompt for Codex: signing key, TestFlight upload and the App Store page

Give Codex this file and the repository, or at least `store/ios/APP-STORE-HANDOFF.md`. Codex will need you to sign in to App Store
Connect and GitHub yourself, including the two-factor codes. Paste everything below the line.

---

You are finishing the App Store side of **Little Sprout Park: Kids Games** for iPhone and iPad. The iOS app is built, and every
simulator test passed in run 26 of the GitHub workflow "Build iOS app". The build can't be signed or sent to TestFlight yet,
because there is no App Store Connect API key. Your job: make that key, store it as GitHub secrets, start the signed build and
upload, set up TestFlight for the owner, and fill in the App Store page without submitting it. The owner will install the app from
TestFlight on their own iPhone.

Read `store/ios/APP-STORE-HANDOFF.md` first. It has the app record, the listing text, the screenshots, the age rating and privacy
answers, and the App Review notes.

**The app**

| | |
|---|---|
| App name | Little Sprout Park: Kids Games |
| Bundle ID | `com.toastygames.littlesproutpark` |
| Team ID | `6437343CNQ` |
| Apple ID of the app | 6830382328 |
| SKU | SPG-IOS-001 |
| Version | 1.0.0 |
| Price | $2.99, paid up front |
| GitHub repository | `differentlightproductions-cyber/sunny-play-garden` |
| Branch | `ccr-812ba91c-62t8en` |
| Workflow | `.github/workflows/ios.yml` ("Build iOS app") |

**Rules**

- The `.p8` key file and its contents never go into a chat, an issue, a commit, a log or any file inside the repository. They go
  straight from the downloaded file into a GitHub secret.
- Don't submit for App Review and don't release. Keep "Manually release this version" selected.
- Don't change the game or the iOS project. If something looks wrong, report it to the owner.
- Don't add in-app purchases, subscriptions, ads or tracking. The app has none.
- **Ask the owner first** before you:
  - choose the Kids Category (hard to leave once chosen);
  - touch anything about agreements, banking or tax;
  - deploy the backup server.

## 1. Make the App Store Connect API key

1. Go to App Store Connect > Users and Access > Integrations > App Store Connect API. If API access isn't on yet, the Account
   Holder must click **Request Access** first.
2. Under Team Keys, click **+** (Generate API Key).
   - Name: `GitHub iOS build`
   - Access: **Admin**. Xcode on GitHub's Mac needs it to create the distribution certificate and the App Store profile itself.
3. Write down the **Key ID** and the **Issuer ID** (shown above the list of keys). They aren't secret, but keep them out of the
   repository.
4. Download `AuthKey_<KEYID>.p8`. **Apple lets you download it only once.**

## 2. Store it in GitHub as three repository secrets

With the GitHub CLI, in Terminal on a Mac, in the folder that holds the downloaded key:

```
R=differentlightproductions-cyber/sunny-play-garden
gh secret set ASC_KEY_ID --repo $R --body "<the Key ID>"
gh secret set ASC_ISSUER_ID --repo $R --body "<the Issuer ID>"
base64 -i AuthKey_<KEYID>.p8 | gh secret set ASC_KEY_P8_BASE64 --repo $R
gh secret list --repo $R
```

Without the CLI:
1. Open GitHub > the repository > Settings > Secrets and variables > Actions.
2. Click **New repository secret** three times, once for each name above.
3. For `ASC_KEY_P8_BASE64`, run `base64 -i AuthKey_<KEYID>.p8 | pbcopy` in Terminal and paste the result into the secret box.

Then move the `.p8` file into the owner's password manager, or delete it. If it is ever lost or seen by anyone else, revoke the key
in App Store Connect and make a new one.

## 3. Build, sign and upload to TestFlight

```
gh workflow run ios.yml --repo $R --ref ccr-812ba91c-62t8en -f version=1.0.0 -f upload=true -f tests=none
gh run watch --repo $R
```

- **There is no "Run workflow" button on GitHub's website for this workflow,** because it lives only on that branch, not on `main`.
  Use the command above, or ask the owner to ask Claude to start the run.
- `tests=none` builds only the signed Release archive. The simulator tests already passed on this code (run 26). The build number
  is the run number.
- In the `archive` job's log, look for "signing with the App Store Connect key", the version and build line, and an upload with no
  errors. The signed `.ipa` is also attached to the run as `SproutPark-ipa`.
- If signing or the upload fails, give the owner the error lines and stop. Don't change the project to work around it.

## 4. Set up TestFlight for the owner

1. Wait until the build appears in App Store Connect > TestFlight (usually 10 to 30 minutes).
2. If Apple asks about encryption, answer that the app uses only the standard encryption built into iOS (exempt).
   `ITSAppUsesNonExemptEncryption` is already `false`, so it shouldn't ask.
3. Under Internal Testing, click **+** and make a group called `Family`. Add the owner's Apple ID and the build. Internal testers
   need no Beta App Review.
4. Tell the owner to:
   1. install **TestFlight** from the App Store on the iPhone;
   2. open the invite email (or the TestFlight app);
   3. install Little Sprout Park.

## 5. Fill in the App Store page (don't submit)

Everything comes from `store/ios/APP-STORE-HANDOFF.md`:
- the listing text;
- the age rating answers;
- the App Privacy answers;
- the App Review notes;
- the price of $2.99 under Pricing and Availability.

**Screenshots** are the artifacts of run 26:
https://github.com/differentlightproductions-cyber/sunny-play-garden/actions/runs/41948244095. Use the `appstore/` folder inside each
one. The handoff's Screenshots table says which artifact goes in which App Store Connect slot:
- `sim-iphone-games` (1206 × 2622)
- `sim-iphone-max` (1320 × 2868)
- `sim-ipad-13` (2064 × 2752)
- `sim-iphone-duo` (1398 × 2034)

Check each size against the slot App Store Connect shows before uploading.

**Needs the owner:**
- **Kids Category:** ask the owner. The handoff explains both choices.
- **Paid Apps Agreement** (Business): the owner must complete banking and tax before the app can go on sale. TestFlight works
  without it.

When the owner has tested the TestFlight build, choose it for version 1.0.0. **Don't press "Add for Review" or "Submit".**

## 6. Report back to the owner

- what is done;
- the Key ID (never the key itself);
- the build number now in TestFlight;
- every step that is still waiting for the owner.

---

## For the owner, on your iPhone

The simulators couldn't check these, so try them on the TestFlight build:

- **Recording:** Grown-ups > Sound and voices, record a line. The microphone question should appear only then. Check the recording
  sounds right and the game's sound comes back afterwards.
- **Silent switch:** sound should play with the ring/silent switch on silent.
- **Face ID** for the grown-ups area (Grown-ups > Locks and safety). The sum or PIN should still work too.
- **Saving a picture to Photos** (Coloring Book) and the share sheet (backup file).
- **A phone call or alarm** in the middle of a game: the sound should come back after.
- **A kitchen photo** should show in the kitchen album right away.
- **First launch after installing** should open promptly.
- **On an iPhone Duo:** fold and unfold it during a game. The game, the hub page and drawings should stay where they were.
- **Cloud backup** only works after the backup server change is deployed (see the handoff). Until then it fails on iOS, nothing else
  does.
