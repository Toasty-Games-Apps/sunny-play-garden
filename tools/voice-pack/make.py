# The Sprout voice: every English line the games say, spoken by a natural neural voice (Kokoro-82M, Apache-2.0) and
# shipped as small MP3 files in audio/voice/sprout/, so a child hears the same clear voice on every phone instead of the
# phone's own text-to-speech (which reads "Vee", "Ar" and "vuh" in odd ways). See tools/voice-pack/README.md.
#
#   python3 tools/voice-pack/make.py --model kokoro-q8.onnx --voices voices.npz --lines lines.json [--asr whisper-dir] [--only key,key]
#
# How a line is made:
#   - text -> phonemes (espeak, American English), except letter names, letter sounds and a few words, whose phonemes are
#     written out by hand below (PHON), so "V" is "vee" and the sound of V is a buzzing "vvv", never "voo";
#   - Kokoro adds a little "uh" in front of a very short input, so every line is said after a short lead-in sentence and the
#     lead-in is cut off at the pause between them (carrier + cut);
#   - the clip is trimmed, faded in and out, levelled, and saved as a 40 kb/s mono MP3;
#   - with --asr, a speech recogniser (Whisper) listens to every clip and lists the ones that do not sound like their text.
import argparse, json, os, re, subprocess, sys, difflib
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True); ap.add_argument('--voices', required=True); ap.add_argument('--lines', required=True)
ap.add_argument('--voice', default='af_heart'); ap.add_argument('--speed', type=float, default=.9)
ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', '..', 'audio', 'voice', 'sprout'))
ap.add_argument('--asr'); ap.add_argument('--only'); ap.add_argument('--report')
A = ap.parse_args()

from kokoro_onnx import Kokoro
k = Kokoro(A.model, A.voices)
STYLE = k.get_voice_style(A.voice)
SR = 24000

# Letter names, the way they are said when spelling (misaki phonemes: A = ay, I = eye, O = oh).
NAME = dict(a='ˈA', b='bˈi', c='sˈi', d='dˈi', e='ˈi!', f='ˈɛf', g='ʤˈi', h='ˈAʧ', i='ˈI', j='ʤˈA', k='kˈA', l='ˈɛl', m='ˈɛm', n='ˈɛn', o='ˈO',
            p='pˈi', q='kjˈu', r='ˈɑɹ', s='ˈɛs', t='tˈi', u='jˈu', v='vˈi', w='dˈʌbəljˌu', x='ˈɛks', y='wˈI', z='zˈi')
PHON = {}
for l, ph in NAME.items(): PHON['letter/' + l] = ph if ph.endswith('!') else ph + '.'

# Every line is said after a short lead-in sentence that is then cut off; a retry uses the next lead-in, so it comes out a
# little different each time.
CARRIERS = ['hˈɪɹ ɪt ɪz. ', 'nˈaʊ. ', 'sˈO. ', 'wˈɛl. ']   # never one that ends in a stop (the cut would keep its release)

def synth(ph):
    toks = k.tokenizer.tokenize(ph)
    a, _ = k._infer(toks, STYLE[min(len(toks), 509) - 1], A.speed)
    return np.asarray(a, np.float32)

F = 240   # 10 ms frames
def frames(a, f=F):
    n = len(a) // f
    return np.array([np.sqrt(np.mean(a[i * f:(i + 1) * f] ** 2)) for i in range(n)]), f

CAR_LEN = {}
def cut(a, ci):
    """Cut off the lead-in: the quiet stretch nearest to where the lead-in alone ends."""
    if ci not in CAR_LEN:
        c = synth(CARRIERS[ci] + 'ˈOkA.'); e, f = frames(c)
        runs = inner_runs(e); CAR_LEN[ci] = runs[0][1] * f if runs else int(.75 * SR)
    e, f = frames(a)
    # the pause after the lead-in is long (80 ms or more); the silence inside a word before a k or t is shorter, and must never
    # be taken for it (that turned "six" into "x")
    runs = [r for r in inner_runs(e) if r[1] - r[0] >= 8]
    if not runs: return None
    best = min(runs, key=lambda r: abs(r[1] * f - CAR_LEN[ci]))
    if abs(best[1] * f - CAR_LEN[ci]) > .3 * SR: return None
    # a soft first sound (the s of "six", the f of "fish", an h) is quiet enough to look like the pause: walk back over the
    # frames that still hiss (the pause itself is near silence in every band), so it is never cut off
    import scipy.signal as ss
    hi = ss.sosfilt(ss.butter(4, 2500, 'high', fs=SR, output='sos'), a)
    H = np.array([np.sqrt(np.mean(hi[i * f:(i + 1) * f] ** 2)) for i in range(len(a) // f)])
    k = best[1]
    while k > best[0] and H[k - 1] > max(.0015, H.max() * .01): k -= 1
    return a[max(0, k * f - int(.02 * SR)):]

def said(ph, ci):
    """phonemes said after lead-in number ci, lead-in removed (None when no clean pause was found)"""
    return cut(synth(CARRIERS[ci] + ph), ci)

def inner_runs(e):
    # pauses inside the clip (not the silence before or after it) of at least 50 ms
    thr = max(.004, e.max() * .02)
    return [r for r in quiet_runs(e < thr) if r[1] - r[0] >= 5 and r[0] > 4 and r[1] < len(e) - 3]

def quiet_runs(low):
    out, i, n = [], 0, len(low)
    while i < n:
        if low[i]:
            j = i
            while j < n and low[j]: j += 1
            out.append((i, j)); i = j
        else: i += 1
    return out

def tidy(b):
    e, f = frames(b); thr = max(.003, e.max() * .015)
    loud = np.where(e >= thr)[0]
    if len(loud): b = b[max(0, loud[0] * f - int(.015 * SR)):min(len(b), (loud[-1] + 1) * f + int(.12 * SR))]
    fi, fo = int(.008 * SR), int(.04 * SR)
    b = b.copy(); b[:fi] *= np.linspace(0, 1, fi); b[-fo:] *= np.linspace(1, 0, fo)
    peak = np.abs(b).max() or 1
    return (b * (.89 / peak)).astype(np.float32)

# ---------------------------------------------------------------- letter sounds
# A neural voice is made for words, not for a lone "sss", so the letter sounds are built in three ways:
#   - consonants and short vowels are said as a syllable ("buh", "mmuh", "eh") and kept only if the listener hears that
#     consonant with a plain short vowel (not "bye" or "okay");
#   - the short vowels a and i are taken out of "at" and "it" (the vowel before the t), so they are truly short;
#   - s and z are hissed and buzzed, with no vowel: the s at the start of "see" and the z at the end of "eezzz", stretched
#     to half a second; x is the k of "key" followed by that s.
import scipy.signal as ss
LOW = ss.butter(4, 1000, 'low', fs=SR, output='sos')
def bands(a):
    lo = ss.sosfilt(LOW, a); n = len(a) // F
    E = np.array([np.sqrt(np.mean(a[i * F:(i + 1) * F] ** 2)) for i in range(n)])
    L = np.array([np.sqrt(np.mean(lo[i * F:(i + 1) * F] ** 2)) for i in range(n)])
    return E / (E.max() or 1), L / (L.max() or 1)
def stretch(b, rate):
    fl, r = [], rate
    while r < .5: fl.append('atempo=0.5'); r /= .5
    fl.append(f'atempo={r:.4f}')
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', ','.join(fl), '-f', 'f32le', '-'],
                       input=b.tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).copy()
def fade(b, fi, fo):
    b = b.copy(); d = len(b) / SR; fi, fo = int(min(fi, d / 5) * SR), int(min(fo, d / 3) * SR)
    if fi: b[:fi] *= np.linspace(0, 1, fi)
    if fo: b[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    return b
def level(b, peak=.89): return (b * (peak / (np.abs(b).max() or 1))).astype(np.float32)
def longer(b, want): return stretch(b, len(b) / SR / want) if len(b) / SR < want else b
def word_parts(a):
    E, L = bands(a)
    st = int(np.argmax(E > .03))
    vo = st + int(np.argmax(np.diff(L[st:st + 40]))) + 1      # where the vowel comes in: the biggest jump of the low band
    pk = vo + int(np.argmax(E[vo:vo + 30]))
    after = np.where(E[pk:] < .07)[0]
    cl = pk + int(after[0]) if len(after) else len(E)         # the stop after the vowel
    return st, vo, cl
def vowel_of(ph):
    def mk(ci):
        a = said(ph, ci)
        if a is None: return None
        st, vo, cl = word_parts(a)
        return level(fade(longer(a[max(st, vo - 1) * F:cl * F], .32), .02, .08))
    return mk
def hiss_of(ph, want=.5, peak=.7):
    def mk(ci):
        a = said(ph, ci)
        if a is None: return None
        st, vo, cl = word_parts(a)
        if vo - st < 4: return None
        return level(fade(longer(a[st * F:(vo - 1) * F], want), .04, .12), peak)
    return mk
def tail_of(ph, want=.5):
    def mk(ci):
        a = said(ph, ci)
        if a is None: return None
        E, L = bands(a)
        end = np.where(E > .03)[0][-1] + 1; v = np.where(L > .3)[0][-1] + 1
        if end - v < 6: return None
        return level(fade(longer(a[(v + 1) * F:end * F], want), .03, .12))
    return mk
def ks(ci):
    a = said('kˈi.', ci); s = hiss_of('sˈi.', .3)(ci)
    if a is None or s is None: return None
    st, vo, cl = word_parts(a)
    kb = fade(a[st * F:min(vo - 1, st + 4) * F], .003, .01)
    return level(np.concatenate([kb, np.zeros(int(.025 * SR), np.float32), s / .7 * .89]))
def syl(ph):
    def mk(ci):
        a = said(ph, ci)
        return None if a is None else tidy(a)
    return mk
# how each consonant may be spelled by the listener, and the plain short vowels after it
CONS = dict(b='b', c='[ck]', d='d', f='f', g='g', h='h', j='[jg]', k='[kc]', l='l', m='m', n='n', p='p', q='(qu|kw|qw|cu|kew)', r='w?r',
            t='t', v='v', w='wh?', y='y')
SHORT = r'(a|u|o|ah|uh|eh|aw|ea|eah|ugh)h?[tdkp]?'   # a plain short vowel must be heard after the consonant
SOUND = {
    'a': ([vowel_of('ˈæt.'), syl('ˈæ.')], r'(at|a|ah|ahh|ab|an|and)'),
    'e': ([syl('ˈɛ!'), syl('ˈɛ.')], r'(eh|e|ed|et|hey)'),
    'i': ([vowel_of('ˈɪt.'), syl('ˈɪ!')], r'(it|ih|i|is|in|ick)'),
    'o': ([syl('ˈɑ.'), vowel_of('ˈɑt.')], r'(ah|aw|a|ahh|awe|on|ot|odd)'),
    'u': ([syl('ˈʌ!'), syl('ˈʌ.'), vowel_of('ˈʌp.')], r'(uh|ah|a|huh|up|um|ugh)'),
    's': ([hiss_of('sˈi.')], None), 'z': ([tail_of('ˈizzz.')], None), 'x': ([ks], None),
}
for l, c in CONS.items():
    p = {'c': 'k', 'g': 'ɡ', 'j': 'ʤ', 'q': 'kw', 'r': 'ɹ', 'y': 'j'}.get(l, l)
    SOUND[l] = ([syl(p + 'ᵊ.'), syl(p + 'ˈʌ.')], c + SHORT)

def mp3(b, path):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '40k', path],
                   input=b.tobytes(), check=True)

# whole lines whose phonemes are written out by hand, because the report showed them said or heard wrong
WORDFIX = {'Six!': 'sˈɪks.', 'whale': 'wˈAl.', 'Mochi': 'mˈOʧi.', 'Sprout': 'spɹˈaʊt.', 'A minnow!': 'ɐ mˈɪnO!', 'A bob': 'ɐ bˈɑb.'}
def phonemes(key, text):
    if key in PHON: return PHON[key]
    if text in WORDFIX: return WORDFIX[text]
    return k.tokenizer.phonemize(text, 'en-us')

# ---------------------------------------------------------------- listening (optional)
asr = None
if A.asr:
    from faster_whisper import WhisperModel
    asr = WhisperModel(A.asr, device='cpu', compute_type='int8')
def hear(b):
    import scipy.signal as ss
    x = ss.resample_poly(b, 2, 3).astype(np.float32)
    x = np.concatenate([np.zeros(8000, np.float32), x, np.zeros(8000, np.float32)])
    segs, _ = asr.transcribe(x, language='en', beam_size=5, without_timestamps=True)
    return ' '.join(s.text.strip() for s in segs)
NUM = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split()
def norm(s):
    s = s.lower().replace('’', "'")
    s = re.sub(r'\b(\d+)\b', lambda m: NUM[int(m.group(1))] if int(m.group(1)) <= 20 else m.group(1), s)
    return re.sub(r"[^a-z' ]+", ' ', s).split()
def score(key, text, got):
    if key.startswith('sound/'):
        pat = SOUND[key[-1]][1]
        if pat is None: return 1.0          # a hiss or buzz is not a word: checked by ear
        g = ''.join(norm(got)).replace("'", '')
        return 1.0 if re.fullmatch(pat, g) else 0.0
    if key.startswith('letter/'):
        l = key[-1]; g = ''.join(norm(got)).replace("'", '')
        return 1.0 if g in (l, l + l, *NAME_WORD.get(l, '').split()) else 0.0
    a, b = [[SAME.get(w, w) for w in norm(x)] for x in (text, got)]
    return max(difflib.SequenceMatcher(None, a, b).ratio(), 1.0 if ''.join(a) == ''.join(b) else 0.0)
# words that sound the same: the listener cannot tell them apart, so they are not mistakes
SAME = dict(pair='pear', flower='flour', locks='locs', toasty='toastie', tootoo='tutu', b='bee', coco='cocoa')
NAME_WORD = dict(b='bee', c='see sea', d='dee', e='ee', f='ef', g='gee', h='aitch', i='eye', j='jay', k='kay', o='oh', p='pee', q='cue queue', r='are', t='tee', u='you', v='vee', w='doubleyou', y='why', z='zee zed')

lines = json.load(open(A.lines))
if A.only: lines = {kk: v for kk, v in lines.items() if kk in A.only.split(',')}
os.makedirs(A.out, exist_ok=True)
report, bad = [], 0
def makers(key, text):
    """ways to make this line, best first; each takes a lead-in number"""
    if key.startswith('sound/') and key[-1] in SOUND: return SOUND[key[-1]][0]
    ph = phonemes(key, text)
    lead = lambda ci, ph=ph: (lambda b: None if b is None else tidy(b))(said(ph, ci))
    # a sentence is said as it is (only a very short input gets the stray "uh" at its start); a word or two after a lead-in
    alone = lambda ci, ph=ph: tidy(synth(ph)) if ci == 0 else None
    return [alone, lead] if len(re.findall(r"[A-Za-z']+", text)) >= 3 else [lead, alone]

for i, (key, text) in enumerate(lines.items()):
    clip = None
    tries = [(m, ci) for m in makers(key, text) for ci in range(len(CARRIERS))]
    for mk, ci in tries[:8]:
        b = mk(ci)
        if b is None or len(b) < .05 * SR: continue
        got = hear(b) if asr else ''
        sc = score(key, text, got) if asr else 1.0
        if clip is None or sc > clip[1]: clip = (b, sc, got)
        if sc >= .8: break
    if clip is None: print('NO CLIP', key, file=sys.stderr); bad += 1; continue
    b, sc, got = clip
    mp3(b, os.path.join(A.out, key.replace('/', '.') + '.mp3'))   # "." not "-": cook-cheese and cook/cheese are two lines
    report.append({'key': key, 'text': text, 'score': round(sc, 2), 'heard': got, 'sec': round(len(b) / SR, 2)})
    if sc < .8: bad += 1; print(f'CHECK {key}: "{text}" heard "{got}" ({sc:.2f})', file=sys.stderr)
    if i % 50 == 0: print(f'{i}/{len(lines)}', file=sys.stderr, flush=True)
if A.report: json.dump(report, open(A.report, 'w'), indent=1, ensure_ascii=False)
print(f'{len(report)} clips, {bad} to check by ear', file=sys.stderr)
