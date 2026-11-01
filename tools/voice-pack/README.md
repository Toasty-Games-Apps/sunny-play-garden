# The Sprout voice

Every English line the games say (708 of them: instructions, letter names, letter sounds, numbers, colours, names, the
names of things in the games) made in advance by a neural text-to-speech voice and shipped as small MP3 files in
`audio/voice/sprout/` (the line `cook/cheese` is `cook.cheese.mp3`: a dot, not a dash, because `cook-cheese` is another line), listed in `audio/voice/manifest.json`. Phones' own voices read the phonics spellings badly
("vuh" as "voo", "Ar" as "ee-ar"). This one voice says them the same, correct way on every phone, with no internet.

- Voice: **Kokoro-82M** (Apache-2.0, free to ship in an app), voice `af_heart` (American English, female), speed 0.9.
- The app plays, for each line: a family recording if there is one, then the Sprout clip (English lines as written, not
  reworded ones), then the phone's own voice. Grown-ups > Voices > "Voice for lines nobody has recorded" switches
  between the Sprout voice (default) and the phone's own voice.
- Size: about 5 to 6 MB for all lines (24 kHz mono, 40 kb/s MP3). The Android app carries them inside the APK; the website
  fetches each one the first time it is said (the service worker keeps it for offline play).

## Making the clips again (after adding or changing lines)

On any computer with Python 3.10+ and ffmpeg:

```
python3 -m venv venv && venv/bin/pip install kokoro-onnx soundfile scipy faster-whisper
# the model and the voice styles (official kokoro-onnx release files)
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
# every English line, from the running app (needs Playwright, like the play-tests)
node tools/voice-pack/dump-lines.mjs > lines.json
# all lines, checked by a speech recogniser (Whisper "small", downloaded by faster-whisper the first time)
venv/bin/python tools/voice-pack/make.py --model kokoro-v1.0.int8.onnx --voices voices-v1.0.bin --lines lines.json --asr small --report report.json
# or only some lines
venv/bin/python tools/voice-pack/make.py ... --only cook-start,letter/v
node tools/build-voice-manifest.mjs
```

The clips in the repo were made with the 8-bit Kokoro model (`model_quantized.onnx` of onnx-community/Kokoro-82M-v1.0-ONNX)
and the `af_heart` style; the release files above give the same voice. `--voice` picks another style (`af_bella`,
`am_michael`, ... see the kokoro-onnx docs), `--speed` the pace.

## How a line is made (make.py)

- **Words to sounds:** espeak's American English phonemes, except letter names and letter sounds, whose sounds are
  written out by hand (`NAME`, `SOUND`), and any whole line in `WORDFIX` (add one when the report shows a word said wrong).
- **The stray "uh":** the model puts a little "uh" in front of a very short input. A word or two is therefore said after
  a lead-in sentence ("Here it is.", "Now.", "So.", "Well.") and the lead-in is cut off at the pause between them. A
  retry uses the next lead-in. A sentence of three or more words is said as it is.
- **Letter sounds:** a neural voice is made for words, not for a lone "sss". Consonants are said as a short syllable
  ("buh", "muh", "vuh", as the app's own sound list writes them) and only kept when the listener hears that consonant
  with a plain short vowel (not "bye" or "okay"). Short a and i are taken out of "at" and "it", so they are truly short.
  s is the hiss at the start of "see" and z the buzz at the end of "eezzz", stretched to half a second; x is the k of
  "key" and that hiss.
- **Checking:** with `--asr`, Whisper listens to every clip; a line is retried (up to eight ways) until what it hears
  matches the text, and the report lists anything still doubtful as `CHECK`. A hiss or buzz is not a word, so s, z and
  x are checked by ear.
- **Finishing:** silence trimmed, short fades, levelled to the same loudness, 40 kb/s mono MP3.

A person should still listen to the 26 letter names and 26 letter sounds before a release (Grown-ups > Voices >
"Hear the Sprout voice" plays a sample; Letter Garden's Sounds activity plays them all).
