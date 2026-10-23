# Browser play-tests (Playwright, headless Chromium)

These scripts drive the real game with real mouse input. They are not part of the site (tools/ is in `.assetsignore`).

Setup: `npm i -D playwright` in the repo (it is not a dependency of the site), or rely on the global Playwright that the Claude sandbox has (`lib.mjs` falls back to /opt/node22/lib/node_modules/playwright; set `PLAYWRIGHT_ESM` to change that). Chromium is in /opt/pw-browsers.
Each script starts its own `python3 -m http.server` on `$PORT` (default 8123): use a different PORT for each script you run at the same time. Screenshots go to `$SHOTS` (default /tmp).

- `lib.mjs`: `start()`, `newPage()`, `login({gender, age})` (picks a name, boy/girl and age, skips the voices intro), `openGame(page, 'Sprout Kitchen')`.
- `auto.mjs W H [recipe,recipe] [cut,serve,sauce]`: plays Sprout Kitchen recipes from the menu to the end with real input (all 18 by default; it reads `SPG.cookGame.probe()`). Prints OK / FAILED / STUCK per recipe. Takes about 5 minutes for all 18. The third argument saves screenshots.
- `smoke2.mjs`: opens every game at ages 2, 4 and 7 and sizes 390x844, 844x390, 1280x800 and drags a finger in each; prints ALL CLEAN or the errors.
- `clay.mjs W H age`: plays Clay Corner with the mouse (ball, rope, squish, roll, cutter, hand, eyes, camera, album, undo, keeping the creation) and prints `Clay Corner OK` or the failures.
- `hide.mjs`: plays through all five Hide and Seek places at three ages and checks that hiding friends never repeat a kind that is already following.
- `num.mjs`: opens Letter Garden's Numbers and Add activities at four sizes and answers questions.
- `tiers.mjs`, `vox.mjs`: spot checks (flames and puzzle grids by age; which spoken lines are silent without Extra audio help, and the letter A override).
- `ui.mjs`: screenshots of setup, the Age and difficulty panel and the kitchen menu at night.
- `dbg.mjs`: example of jumping straight to a kitchen step (`g.startRecipe(R); g.stIdx = n; g.beginStep()`).
- `sort.mjs W H`: Tidy Time: checks the round maker at every tier, plays every kind of sorting at ages 2, 4 and 7 by dragging (wrong basket twice, a drop on the floor, everything in), rotation, night, the idle hint, one star per two rounds.
- `monkey.mjs [seconds] [W H]`: plays every game like a toddler (random taps, long presses and wild drags, a screen turn, a pause and resume) and reports any page error per game. `GAMES=name,name` and `AGE=` narrow it.
