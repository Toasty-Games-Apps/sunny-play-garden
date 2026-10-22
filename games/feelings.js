// Feeling Friends: a friend has a little moment (a present arrives, the ice cream falls, thunder booms, the tower is knocked over...)
// and its face shows how it feels. She touches the face that matches ("How do I feel?"), then picks a way to help: a hug, a song,
// a night light, a big breath, building the tower again... and the friend feels better, says thank you and waves goodbye.
// Naming feelings from faces and choosing a kind thing to do is the social-emotional side of preschool, which no other game covers.
// Nothing is wrong for long: a face that does not match just makes the friend shake its head, and after two tries the right face glows.
// Every way of helping works. Three friends helped = +1 star.
// Tiers (SPG.level.tier('feelings')): 1 = happy or sad, two faces; 2 = happy, sad, scared, mad and surprised, three faces;
// 3 = also sleepy, four faces. Look-alike feelings (happy and surprised, sad and sleepy) are never offered together.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store, pets: P } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
  const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); };
  const rr = art.rr;

  // the friends who visit (pets everyone knows; never the dinosaurs, whose faces are drawn differently)
  const FRIENDS = ['bunny', 'cat', 'bear', 'fox', 'panda', 'dog', 'pig', 'lamb', 'duck', 'hamster', 'mouse'];   // (not the frog: its eyes have no eyebrows, so its feelings are hard to read)
  // the face each feeling shows on the friend, and the colour of its button
  const FACE = { happy: 'cheer', sad: 'sad', scared: 'scared', mad: 'mad', wow: 'wow', sleep: 'sleep' };
  const RING = { happy: '#ffd54a', sad: '#7fb6f0', scared: '#b58cf0', mad: '#ff8a7a', wow: '#ffa24d', sleep: '#8fa7d9' };
  const BY_TIER = { 1: ['happy', 'sad'], 2: ['happy', 'sad', 'scared', 'mad', 'wow'], 3: ['happy', 'sad', 'scared', 'mad', 'wow', 'sleep'] };
  const LOOKALIKE = { happy: ['wow'], wow: ['happy'], sad: ['sleep'], sleep: ['sad'] };
  // the little stories: what happens, the feeling, and the ways to help (three buttons)
  const STORIES = [
    { id: 'present', mood: 'happy' }, { id: 'cake', mood: 'happy' }, { id: 'pal', mood: 'happy' },
    { id: 'icecream', mood: 'sad' }, { id: 'balloon', mood: 'sad' }, { id: 'rain', mood: 'sad' },
    { id: 'thunder', mood: 'scared' }, { id: 'dark', mood: 'scared' },
    { id: 'tower', mood: 'mad' }, { id: 'splash', mood: 'mad' },
    { id: 'jack', mood: 'wow' }, { id: 'party', mood: 'wow' },
    { id: 'yawn', mood: 'sleep' }
  ];
  const HELPS = { happy: ['dance', 'high5', 'hug'], wow: ['dance', 'high5', 'hug'], sad: ['hug', 'gift', 'song'], scared: ['hug', 'light', 'teddy'], mad: ['hug', 'breath', 'build'], sleep: ['blanket', 'song', 'teddy'] };
  const STORY_T = 3.0, EV = 1.15;   // how long a story plays, and when the thing happens
  const FIX_T = { breath: 4.6 }, FIX_DEF = 2.8;
  const PLACES = ['meadow', 'beach', 'autumn', 'snow'];
  const api = { next: null };

  /* ---------------------------------------------------------------- round maker (also used by the test) */
  function makeRound(tier, last) {
    const moods = BY_TIER[tier] || BY_TIER[2];
    const pool = STORIES.filter(s => moods.includes(s.mood) && s.id !== last);
    const story = STORIES.find(s => s.id === api.next) || pick(pool), mood = story.mood; api.next = null;   // api.next: tests ask for a story
    const k = tier === 1 ? 2 : tier === 2 ? 3 : 4;
    const others = shuffle(moods.filter(m => m !== mood && !(LOOKALIKE[mood] || []).includes(m))).slice(0, k - 1);
    let helps = HELPS[mood].slice();
    if (story.id === 'splash') helps[2] = 'wash';
    return { story: story.id, mood, choices: shuffle([mood, ...others]), helps: shuffle(helps) };
  }

  /* ---------------------------------------------------------------- small drawings */
  function present(c, s, open = 0, col = '#ff8fc0') {
    c.fillStyle = col; rr(c, -s * .5, -s * .8, s, s * .8, s * .08); c.fill();
    c.fillStyle = '#ffd54a'; c.fillRect(-s * .08, -s * .8, s * .16, s * .8);
    c.save(); c.translate(-s * .55 + open * s * .2, -s * .8 - open * s * .7); c.rotate(-open * .7);
    c.fillStyle = art.shade(col, -.12); rr(c, 0, -s * .18, s * 1.1, s * .2, s * .06); c.fill();
    c.fillStyle = '#ffd54a'; c.fillRect(s * .47, -s * .18, s * .16, s * .2);
    c.strokeStyle = '#ffd54a'; c.lineWidth = s * .07; c.beginPath(); c.ellipse(s * .42, -s * .28, s * .14, s * .09, -.4, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(s * .68, -s * .28, s * .14, s * .09, .4, 0, TAU); c.stroke();
    c.restore();
  }
  function cake(c, s, t) {
    c.fillStyle = '#fff'; ell(c, 0, 0, s * .62, s * .1); c.fill();
    c.fillStyle = '#ffb3c6'; rr(c, -s * .5, -s * .45, s, s * .45, s * .08); c.fill();
    c.fillStyle = '#fff6fa'; rr(c, -s * .34, -s * .78, s * .68, s * .35, s * .07); c.fill();
    c.fillStyle = '#ff8fc0'; for (let i = 0; i < 6; i++) { ell(c, -s * .42 + i * s * .168, -s * .45, s * .08, s * .06); c.fill(); }
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * s * .2; c.fillStyle = ['#7fd4f5', '#ffd54a', '#b58cf0'][i]; c.fillRect(x - s * .025, -s * .98, s * .05, s * .2);
      const f = 1 + Math.sin(t * 14 + i * 2) * .15; c.fillStyle = '#ffb347'; ell(c, x, -s * 1.03, s * .035 * f, s * .06 * f); c.fill(); c.fillStyle = '#fff3a0'; ell(c, x, -s * 1.02, s * .015, s * .03); c.fill();
    }
  }
  function cone(c, s, scoop = true) {
    c.fillStyle = '#e8b06a'; c.beginPath(); c.moveTo(-s * .16, 0); c.lineTo(0, s * .42); c.lineTo(s * .16, 0); c.closePath(); c.fill();
    c.strokeStyle = '#c98a45'; c.lineWidth = s * .02; c.beginPath(); c.moveTo(-s * .1, s * .08); c.lineTo(s * .06, s * .26); c.moveTo(s * .1, s * .08); c.lineTo(-s * .06, s * .26); c.stroke();
    if (scoop) { c.fillStyle = '#ffb3c6'; ell(c, 0, -s * .08, s * .19, s * .16); c.fill(); c.fillStyle = '#fff'; ell(c, -s * .06, -s * .14, s * .05, s * .035); c.fill(); }
  }
  function balloon(c, s, col = '#ff6b81', sway = 0) {
    c.strokeStyle = 'rgba(90,63,94,.5)'; c.lineWidth = Math.max(1, s * .02); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * .1 + sway, -s * .5, 0, -s * .95); c.stroke();
    c.fillStyle = col; ell(c, 0, -s * 1.22, s * .22, s * .28); c.fill();
    c.beginPath(); c.moveTo(-s * .05, -s * .93); c.lineTo(s * .05, -s * .93); c.lineTo(0, -s * .97); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; ell(c, -s * .08, -s * 1.32, s * .05, s * .08); c.fill();
  }
  function blockAt(c, b, s) {
    c.save(); c.translate(b.x, b.y); c.rotate(b.r); c.fillStyle = b.col; rr(c, -s / 2, -s / 2, s, s, s * .12); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, -s * .38, -s * .38, s * .76, s * .2, s * .08); c.fill();
    c.fillStyle = 'rgba(90,63,94,.18)'; c.font = `800 ${s * .5}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.l, 0, s * .06); c.restore();
  }
  function cloud(c, x, y, s, col) { c.fillStyle = col; for (const [dx, dy, r] of [[-.5, .05, .32], [-.15, -.18, .42], [.25, -.08, .36], [.55, .08, .26], [0, .12, .4]]) { ell(c, x + dx * s, y + dy * s, r * s, r * s * .85); c.fill(); } }
  function car(c, s) {
    c.fillStyle = '#5aa8f0'; rr(c, -s * .5, -s * .35, s, s * .25, s * .08); c.fill(); rr(c, -s * .25, -s * .55, s * .45, s * .25, s * .08); c.fill();
    c.fillStyle = '#d8f1ff'; rr(c, -s * .18, -s * .5, s * .15, s * .14, s * .03); c.fill(); rr(c, s * .02, -s * .5, s * .14, s * .14, s * .03); c.fill();
    c.fillStyle = '#3d2c44'; for (const x of [-.28, .28]) { ell(c, x * s, -s * .1, s * .11, s * .11); c.fill(); }
  }
  function jackBox(c, s, open, pop, t) {
    c.fillStyle = '#b58cf0'; rr(c, -s * .4, -s * .7, s * .8, s * .7, s * .06); c.fill();
    c.fillStyle = '#ffd54a'; for (const [x, y] of [[-.2, -.5], [.2, -.25], [-.15, -.15], [.18, -.55]]) art.star(c, x * s, y * s, s * .08);
    // the crank turns until the lid pops
    c.save(); c.translate(s * .45, -s * .35); c.rotate(open ? 0 : t * 9); c.strokeStyle = '#8a6448'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(0, 0); c.lineTo(s * .14, 0); c.lineTo(s * .14, s * .1); c.stroke(); c.restore();
    if (!open) { c.fillStyle = '#9a74d8'; rr(c, -s * .44, -s * .78, s * .88, s * .1, s * .04); c.fill(); return; }
    c.save(); c.translate(-s * .42, -s * .7); c.rotate(-2.5); c.fillStyle = '#9a74d8'; rr(c, 0, -s * .12, s * .86, s * .12, s * .04); c.fill(); c.fillStyle = '#ffd54a'; art.star(c, s * .43, -s * .06, s * .045); c.restore();
    const up = s * (.55 + Math.sin(pop * 18) * .12 * Math.exp(-pop * 3));
    c.strokeStyle = '#c9c5d3'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(0, -s * .7);
    for (let i = 1; i <= 6; i++) c.lineTo((i % 2 ? -1 : 1) * s * .1, -s * .7 - up * i / 6); c.stroke();
    c.save(); c.translate(0, -s * .7 - up - s * .18);
    c.fillStyle = '#fff2df'; ell(c, 0, 0, s * .2, s * .2); c.fill(); art.face(c, s * .17, { mood: 'cheer' });
    c.fillStyle = '#ff6b81'; ell(c, 0, s * .03, s * .045, s * .045); c.fill();
    c.fillStyle = '#7fd4f5'; c.beginPath(); c.moveTo(-s * .13, -s * .14); c.lineTo(s * .13, -s * .14); c.lineTo(0, -s * .42); c.closePath(); c.fill(); c.fillStyle = '#ffd54a'; ell(c, 0, -s * .43, s * .05, s * .05); c.fill();
    c.restore();
  }
  function lamp(c, s, on) {
    if (on > 0) { const g = c.createRadialGradient(0, -s * .55, 0, 0, -s * .55, s * 1.6); g.addColorStop(0, `rgba(255,236,150,${.55 * on})`); g.addColorStop(1, 'rgba(255,236,150,0)'); c.fillStyle = g; ell(c, 0, -s * .55, s * 1.6, s * 1.6); c.fill(); }
    c.fillStyle = '#8a6448'; rr(c, -s * .2, -s * .1, s * .4, s * .1, s * .04); c.fill(); c.fillRect(-s * .03, -s * .5, s * .06, s * .42);
    c.fillStyle = on > .5 ? '#ffe680' : '#ffd0a0'; c.beginPath(); c.moveTo(-s * .3, -s * .48); c.lineTo(s * .3, -s * .48); c.lineTo(s * .18, -s * .82); c.lineTo(-s * .18, -s * .82); c.closePath(); c.fill();
  }
  function pinwheel(c, s, spin) {
    c.strokeStyle = '#8a6448'; c.lineWidth = s * .06; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s * .9); c.stroke();
    c.save(); c.translate(0, -s * .9); c.rotate(spin);
    ['#ff6b81', '#ffd54a', '#5aa8f0', '#7ed957'].forEach((col, i) => { c.rotate(TAU / 4); c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.lineTo(s * .32, -s * .05); c.lineTo(s * .05, -s * .3); c.closePath(); c.fill(); });
    c.fillStyle = '#fff'; ell(c, 0, 0, s * .05, s * .05); c.fill(); c.restore();
  }
  function hand(c, s) {
    c.fillStyle = '#ffd7b5'; c.strokeStyle = '#d99a72'; c.lineWidth = s * .04;
    rr(c, -s * .3, -s * .2, s * .6, s * .55, s * .2); c.fill(); c.stroke();
    for (let i = 0; i < 4; i++) { rr(c, -s * .3 + i * s * .155, -s * .58, s * .13, s * .45, s * .065); c.fill(); c.stroke(); }
    c.save(); c.translate(-s * .32, 0); c.rotate(-.7); rr(c, -s * .07, -s * .32, s * .14, s * .34, s * .07); c.fill(); c.stroke(); c.restore();
  }
  function blanket(c, s) {
    c.fillStyle = '#9ec9ff'; rr(c, -s / 2, -s * .3, s, s * .6, s * .1); c.fill();
    c.fillStyle = '#ffd1e3'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) { rr(c, -s / 2 + i * s / 3 + s * .03, -s * .3 + j * s * .3 + s * .03, s / 3 - s * .06, s * .24, s * .05); c.fill(); }
    c.fillStyle = '#ffd54a'; for (let i = 0; i < 3; i++) art.star(c, -s * .33 + i * s * .33, s * .15 - (i % 2) * s * .3, s * .05);
  }
  // the picture on each "how can I help?" button
  function helpIcon(c, id, r, t) {
    c.save(); c.lineCap = c.lineJoin = 'round';
    switch (id) {
      case 'hug': art.heart(c, 0, r * .05, r * .55, '#ff7a9a'); break;
      case 'gift': c.translate(0, r * .42); present(c, r * .75, 0, '#ff8fc0'); break;
      case 'song': c.fillStyle = '#5a3f5e'; ell(c, -r * .25, r * .3, r * .18, r * .14); c.fill(); ell(c, r * .3, r * .2, r * .18, r * .14); c.fill(); c.fillRect(-r * .1, -r * .45, r * .07, r * .77); c.fillRect(r * .45, -r * .55, r * .07, r * .77); c.beginPath(); c.moveTo(-r * .1, -r * .45); c.lineTo(r * .52, -r * .55); c.lineTo(r * .52, -r * .35); c.lineTo(-r * .1, -r * .25); c.fill(); break;
      case 'light': c.translate(0, r * .5); lamp(c, r * 1.1, 1); break;
      case 'teddy': c.translate(0, r * .55); P.draw(c, 'bear', r * 1.15, t); break;
      case 'breath': c.translate(0, r * .5); pinwheel(c, r * 1.05, t * 2); break;
      case 'build': { const s = r * .42; [[-.5, .5, '#ff6b81', 'A'], [.5, .5, '#5aa8f0', 'B'], [0, -.5, '#ffd54a', 'C']].forEach(([x, y, col, l]) => blockAt(c, { x: x * s * 1.05, y: y * s * 1.05, r: 0, col, l }, s)); break; }
      case 'wash': for (const [x, y, rad] of [[-.25, .1, .3], [.25, -.15, .25], [.15, .35, .2], [-.2, -.38, .15]]) { c.fillStyle = 'rgba(160,215,255,.55)'; ell(c, x * r, y * r, rad * r, rad * r); c.fill(); c.strokeStyle = '#7fb6f0'; c.lineWidth = r * .05; c.stroke(); c.fillStyle = '#fff'; ell(c, (x - rad * .35) * r, (y - rad * .35) * r, rad * r * .25, rad * r * .2); c.fill(); } break;
      case 'blanket': c.translate(0, r * .05); blanket(c, r * 1.3); break;
      case 'dance': c.fillStyle = '#b58cf0'; art.star(c, -r * .3, -r * .25, r * .3, '#ffd54a'); c.fillStyle = '#5a3f5e'; ell(c, r * .05, r * .38, r * .16, r * .12); c.fill(); c.fillRect(r * .16, -r * .3, r * .06, r * .68); c.beginPath(); c.moveTo(r * .22, -r * .3); c.quadraticCurveTo(r * .55, -r * .1, r * .45, r * .15); c.lineTo(r * .4, r * .1); c.quadraticCurveTo(r * .45, -r * .05, r * .22, -r * .15); c.fill(); break;
      case 'high5': c.translate(0, r * .2); hand(c, r * 1.05); break;
    }
    c.restore();
  }

  /* ---------------------------------------------------------------- the game */
  class FeelingsGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('feelings', () => ({ helped: 0, seen: {} }));
      this.bag.helped = this.bag.helped || 0; this.bag.seen = this.bag.seen || {};
      this.counter = SPG.ui.counter(host, (c, s) => art.heart(c, s / 2, s / 2, s * .32, '#ff7a9a'), this.bag.helped);
      this.fx = new art.Fx(); this.place = SPG.scenery.fader(PLACES[Math.floor(this.bag.helped / 4) % PLACES.length]);
      this.t = 0; this.running = false; this.round = null; this.lastStory = null; this.lastFriend = null;
      this.tick = this.tick.bind(this);
      const cv = this.canvas;
      cv.addEventListener('pointerdown', e => { e.preventDefault(); SPG.audio.unlock(); const r = cv.getBoundingClientRect(); this.press((e.clientX - r.left) * this.w / r.width, (e.clientY - r.top) * this.h / r.height); });
    }
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      this.layout(); this.draw();
    }
    layout() {
      const w = this.w, h = this.h, wide = this.wide = w > h * 1.15;
      this.gy = wide ? h * .64 : h * .6;
      this.S = wide ? Math.min(h * .4, w * .26) : Math.min(w * .56, h * .3);
      this.fx0 = wide ? w * .38 : w * .35; this.px = wide ? w * .62 : w * .76;
      this.skyY = Math.max(h * .2, this.gy - this.S * 1.9);   // weather and party bunting hang here, below the home button and counters
      const k = this.btns ? this.btns.length : 3;
      const br = this.br = clamp(Math.min(w / (k * 2.7), h * (wide ? .12 : .085)), 34, 86);
      const by = Math.min(h - br * 1.3, this.gy + this.S * .12 + br * 1.4), gap = Math.min(br * 2.7, (w - br * 2) / Math.max(1, k - 1));
      (this.btns || []).forEach((b, i) => { b.x = w / 2 + (i - (k - 1) / 2) * gap; b.y = by; });
      this.bubble = { x: this.fx0 + this.S * .42, y: this.gy - this.S * 1.12, r: this.S * .17 };
      if (this.round && this.phase !== 'enter' && this.phase !== 'leave') this.x = this.fx0;   // after a turn of the screen the friend stands in its new spot
      if (this.round && this.round.blocks) this.placeBlocks(this.round.fallen);
    }
    start() { this.resize(); this.newRound(); this.resume(); voice.say('feel-start'); this.firstSaid = true; }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }
    tier() { return SPG.level.tier('feelings'); }
    jump(k, d = .55) { if (this.hopT > 0 && this.hopK > k) return; this.hopK = k; this.hopD = d; this.hopT = d; }
    lift() { return this.hopT > 0 ? Math.sin((1 - this.hopT / this.hopD) * Math.PI) * this.S * .2 * this.hopK : 0; }

    /* ---------------------------------------------------------------- rounds */
    newRound() {
      const R = makeRound(this.tier(), this.lastStory); this.lastStory = R.story;
      const friend = pick(FRIENDS.filter(f => f !== this.lastFriend && P.SPECIES[f])); this.lastFriend = friend;
      const pal = pick(FRIENDS.filter(f => f !== friend && P.SPECIES[f]));
      this.round = Object.assign(R, { friend, pal, wrong: 0, glow: false, picked: null, help: null, mud: 0, dark: 0, cloud: 0, rainOn: false, open: 0, fallen: false });
      this.phase = 'enter'; this.pt = 0; this.x = -this.S; this.shake = 0; this.hopT = 0; this.hopK = 0; this.idle = 0; this.face = 'happy'; this.btns = null;
      if (R.story === 'yawn') this.place.set('sunset'); else this.place.set(PLACES[Math.floor(this.bag.helped / 4) % PLACES.length]);
      if (R.story === 'tower') { this.round.blocks = ['#ff6b81', '#ffd54a', '#5aa8f0', '#7ed957', '#b58cf0'].map((col, i) => ({ col, l: 'ABCDE'[i], x: 0, y: 0, r: 0 })); this.placeBlocks(false); }
      this.layout();
    }
    // the tower: standing, or tumbled across the grass (fixed spots so it looks the same after a turn of the screen)
    placeBlocks(fallen) {
      const R = this.round, s = this.S * .2, gy = this.gy, px = this.px;
      R.bs = s; R.fallen = fallen;
      R.blocks.forEach((b, i) => {
        b.hx = px; b.hy = gy - s / 2 - i * s;   // home in the tower
        b.fx = px + (i - 1.6) * s * 1.25 + (i % 2) * s * .2; b.fy = gy - s / 2; b.fr = (i % 2 ? .4 : -.3) + i * .15;
        if (!b.anim) { b.x = fallen ? b.fx : b.hx; b.y = fallen ? b.fy : b.hy; b.r = fallen ? b.fr : 0; }
      });
    }
    setButtons(list, kind) {
      this.btns = list.map(id => ({ id, kind, x: 0, y: 0, pop: 0, shake: 0, dim: false, in: 0 })); this.layout();
    }
    press(x, y) {
      this.idle = 0; const R = this.round; if (!R) return;
      const b = (this.btns || []).find(b => b.in > .6 && Math.hypot(x - b.x, y - b.y) < this.br * 1.15);
      if (this.phase === 'ask' && b) return this.answer(b);
      if (this.phase === 'help' && b) return this.doHelp(b);
      // touching the friend: a little hop and a happy sound, at any time
      if (Math.abs(x - this.x) < this.S * .4 && y < this.gy && y > this.gy - this.S) { this.jump(.6); sfx.squeak ? sfx.squeak() : sfx.pop(); }
    }
    answer(b) {
      const R = this.round;
      if (b.id === R.mood) {
        b.pop = 1; sfx.chime(); this.btns.forEach(o => { if (o !== b) o.dim = true; });
        R.picked = b.id; this.phase = 'yes'; this.pt = 0; this.jump(1);
        voice.say('feel/' + R.mood, this.helpLine());
        this.fx.burst(b.x, b.y, 12, { colors: [RING[R.mood], '#fff', '#ffd54a'], speed: 180, g: 200, life: .7, size: 6 * this.ui, shape: 'star', up: 80 });
        return;
      }
      if (b.dim) { b.shake = 1; sfx.tap(); return; }
      R.wrong++; b.shake = 1; b.dim = true; this.shake = 1; sfx.instrument('bell', 1, .12);
      if (R.wrong === 1) voice.say('feel-look');
      if (R.wrong >= 2) R.glow = true;
    }
    helpLine() { const m = this.round.mood; return m === 'happy' || m === 'wow' ? 'feel-joy' : m === 'sleep' ? 'feel-help-sleep' : 'feel-help'; }
    doHelp(b) {
      const R = this.round; R.help = b.id; b.pop = 1; sfx.pop(); this.btns.forEach(o => { if (o !== b) o.dim = true; });
      this.phase = 'fix'; this.pt = 0; this.notes = 0;
      if (b.id === 'breath') voice.say('feel-breathe');
      if (b.id === 'gift' || b.id === 'dance' || b.id === 'high5') sfx.win();
      if (b.id === 'hug') { sfx.purr ? sfx.purr() : sfx.chime(); }
    }
    finishFix() {
      const R = this.round;
      this.face = R.mood === 'sleep' ? 'sleep' : 'cheer'; this.jump(1); this.phase = 'thanks'; this.pt = 0; this.btns = null;
      voice.say(R.mood === 'sleep' ? 'feel-night' : R.mood === 'happy' || R.mood === 'wow' ? 'feel-fun' : 'feel-better');
      this.fx.burst(this.x, this.gy - this.S * .7, 16, { colors: ['#ff9db8', '#ff7a8a', '#ffd54a'], speed: 200, g: 120, life: 1.3, size: 10 * this.ui, shape: 'heart', up: 140 });
      this.bag.helped++; this.bag.seen[R.mood] = (this.bag.seen[R.mood] || 0) + 1; this.counter.set(this.bag.helped);
      if (this.bag.helped % 3 === 0) { store.addStars(1); setTimeout(() => this.running && sfx.win(), 500); }
      store.save();
    }

    /* ---------------------------------------------------------------- time */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.pt += dt; this.idle += dt;
      this.update(dt); this.place.update(dt); this.fx.update(dt);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }
    update(dt) {
      const R = this.round; if (!R) return;
      this.hopT = Math.max(0, this.hopT - dt); this.shake = Math.max(0, this.shake - dt * 1.6);
      for (const b of this.btns || []) { b.in = Math.min(1, b.in + dt * 3); b.pop = Math.max(0, b.pop - dt * 2); b.shake = Math.max(0, b.shake - dt * 2.4); }
      if (this.phase === 'enter') {
        const u = ease(this.pt / 1.4); this.x = -this.S + (this.fx0 + this.S) * u; if (this.pt % .35 < dt) this.jump(.35, .35);
        if (this.pt >= 1.4) { this.x = this.fx0; this.phase = 'story'; this.pt = 0; voice.say('feel-s-' + R.story, 'feel-how'); this.evDone = false; }
      } else if (this.phase === 'story') {
        this.storyStep(dt);
        if (!this.evDone && this.pt >= EV) { this.evDone = true; this.event(); }
        if (this.pt >= STORY_T) {
          this.phase = 'ask'; this.pt = 0; this.idle = 0; this.setButtons(R.choices, 'face');
        }
      } else if (this.phase === 'ask') {
        this.storyStep(dt);
        if (this.idle > 10) { this.idle = 0; R.glow = R.glow || R.wrong > 0; voice.say('feel-how'); }
      } else if (this.phase === 'yes') {
        this.storyStep(dt);
        if (this.pt > 1.6) { this.phase = 'help'; this.pt = 0; this.idle = 0; this.setButtons(R.helps, 'help'); }
      } else if (this.phase === 'help') {
        this.storyStep(dt);
        if (this.idle > 12) { this.idle = 0; voice.say(this.helpLine()); }
      } else if (this.phase === 'fix') {
        this.fixStep(dt);
        if (this.pt >= (FIX_T[R.help] || FIX_DEF)) this.finishFix();
      } else if (this.phase === 'thanks') {
        this.fixStep(dt);
        if (this.pt > 2.6) { this.phase = 'leave'; this.pt = 0; }
      } else if (this.phase === 'leave') {
        if (R.mood === 'sleep') { if (this.pt > 1.6) this.newRound(); return; }
        const u = ease(this.pt / 1.5); this.x = this.fx0 + (this.w + this.S - this.fx0) * u; if (this.pt % .35 < dt) this.jump(.35, .35);
        if (this.pt >= 1.5) this.newRound();
      }
    }
    // what the story does over time (it keeps going quietly while she chooses)
    storyStep(dt) {
      const R = this.round, id = R.story, after = this.phase !== 'story' || this.pt >= EV;
      if (id === 'rain' || id === 'thunder') { R.cloud = Math.min(1, R.cloud + dt * 1.2); R.dark = Math.min(id === 'thunder' ? .45 : .22, R.dark + dt * .4); if (R.cloud > .6 && Math.random() < dt * 30) this.fx.burst(Math.random() * this.w, this.skyY + this.S * .2, 1, { colors: ['#9ecbff'], speed: 10, g: 900, life: .5, size: 3 * this.ui }); }
      if (id === 'dark' && this.pt > .35) R.dark = Math.min(.62, R.dark + dt * 1.2);
      R.flash = Math.max(0, (R.flash || 0) - dt * 3);
      if (after) this.face = FACE[R.mood];
      if (R.mood === 'scared' && after) this.shiver = Math.sin(this.t * 40) * this.S * .008; else this.shiver = 0;
      if (R.mood === 'mad' && this.t % 1.6 < dt) this.jump(.25, .3);
      if (R.open) R.open += dt;
      if (id === 'jack' && !R.open && this.phase === 'story') { const k = Math.floor(this.pt / .3); if (k !== R.crank) { R.crank = k; sfx.instrument('xylo', k % 5, .12); } }
      if (R.story === 'tower') this.blocksStep(dt);
    }
    blocksStep(dt) {
      for (const b of this.round.blocks) if (b.anim) {
        b.anim.t += dt; const a = b.anim, u = clamp(a.t / a.d, 0, 1);
        if (a.kind === 'fall') { b.x = b.hx + (b.fx - b.hx) * u; b.y = b.hy + (b.fy - b.hy) * u * u - Math.sin(u * Math.PI) * this.S * .25; b.r = b.fr * u; }
        else { const e = ease(u); b.x = b.fx + (b.hx - b.fx) * e; b.y = b.fy + (b.hy - b.fy) * e - Math.sin(u * Math.PI) * this.S * .3; b.r = b.fr * (1 - e); }
        if (u >= 1) { if (a.kind === 'fall' && b.i === 0) sfx.boing(); if (a.kind === 'build') sfx.plink(b.i); b.anim = null; }
      }
    }
    // the moment in the story
    event() {
      const R = this.round, x = this.px, y = this.gy;
      switch (R.story) {
        case 'present': R.open = .001; sfx.chime(); this.fx.burst(x, y - this.S * .35, 18, { colors: ['#ffd54a', '#fff', '#ff8fc0'], speed: 220, g: 200, life: 1, size: 6 * this.ui, shape: 'star', up: 160 }); break;
        case 'cake': case 'party': sfx.cheer(); this.fx.burst(this.w / 2, this.gy - this.S * 1.4, 34, { colors: ['#ff6b81', '#ffd54a', '#7ed957', '#5cc8f2', '#b58cf0'], speed: 340, g: 400, life: 1.4, size: 7 * this.ui, shape: 'confetti', up: 200 }); break;
        case 'pal': sfx.chime(); this.fx.burst((this.x + x) / 2, y - this.S * .8, 10, { colors: ['#ff9db8', '#ff7a8a'], speed: 140, g: 80, life: 1.2, size: 10 * this.ui, shape: 'heart', up: 120 }); break;
        case 'icecream': sfx.splash(); break;
        case 'balloon': sfx.whoosh(); break;
        case 'rain': sfx.water ? sfx.water() : sfx.splash(); break;
        case 'thunder': R.flash = 1; sfx.thunder ? sfx.thunder() : sfx.boing(); break;
        case 'dark': sfx.tap(); break;
        case 'tower': R.blocks.forEach((b, i) => { b.i = i; b.anim = { kind: 'fall', t: -i * .06, d: .55 }; }); R.fallen = true; sfx.crash ? sfx.crash() : sfx.shake && sfx.shake(); break;
        case 'splash': R.mud = 1; sfx.splash(); this.fx.burst(this.x + this.S * .3, y - this.S * .1, 22, { colors: ['#8a6448', '#a47b55', '#6e4f38'], speed: 260, g: 600, life: .8, size: 7 * this.ui, up: 220 }); break;
        case 'jack': R.open = .001; sfx.boing(); break;
        case 'yawn': sfx.note ? sfx.note(0) : sfx.chime(); break;
      }
      this.jump(R.mood === 'happy' || R.mood === 'wow' ? 1 : .3);
    }
    fixStep(dt) {
      const R = this.round, id = R.help, u = this.pt / (FIX_T[id] || FIX_DEF);
      if (this.phase === 'fix') {
        if (id === 'song' || id === 'dance') { const notes = [0, 2, 4, 2, 0, 4, 5, 4], k = Math.floor(this.pt / .3); if (k < notes.length && k >= (this.notes || 0)) { this.notes = k + 1; sfx.instrument(id === 'song' ? 'bell' : 'xylo', notes[k], .18); if (id === 'dance') this.jump(1); this.fx.burst(this.x + this.S * .3, this.gy - this.S * .9, 1, { colors: ['#b58cf0', '#5aa8f0', '#ff8fc0'], speed: 60, g: -60, life: 1.4, size: 9 * this.ui, shape: 'heart' }); } }
        if (id === 'hug' && this.pt % .5 < dt) this.fx.burst(this.x, this.gy - this.S * .6, 3, { colors: ['#ff9db8', '#ff7a8a'], speed: 90, g: -30, life: 1.2, size: 9 * this.ui, shape: 'heart', up: 60 });
        if (id === 'gift' && this.pt > 1 && !R.giftOpen) { R.giftOpen = true; sfx.chime(); this.fx.burst(this.x + this.S * .55, this.gy - this.S * .4, 22, { colors: ['#ffd54a', '#ff8fc0', '#7fd4f5'], speed: 260, g: 300, life: 1.1, size: 6 * this.ui, shape: 'confetti', up: 200 }); }
        if (id === 'high5' && this.pt > .9 && !R.slap) { R.slap = true; sfx.snap ? sfx.snap() : sfx.pop(); this.jump(1); this.fx.burst(this.x + this.S * .32, this.gy - this.S * .75, 16, { colors: ['#ffd54a', '#fff'], speed: 240, g: 100, life: .8, size: 7 * this.ui, shape: 'star', up: 60 }); }
        if (id === 'breath' && this.pt > 2.2 && !R.blow) { R.blow = true; sfx.whoosh(); }
        if (id === 'build' && !R.built) { R.built = true; R.blocks.forEach((b, i) => { b.i = i; b.anim = { kind: 'build', t: -i * .3, d: .55 }; }); R.fallen = false; }
        if (id === 'wash' && this.pt % .25 < dt) { sfx.bubble ? sfx.bubble() : sfx.pop(); this.fx.burst(this.x + (Math.random() - .5) * this.S * .5, this.gy - Math.random() * this.S * .8, 2, { colors: ['rgba(190,230,255,.9)', '#fff'], speed: 60, g: -80, life: .9, size: 8 * this.ui }); }
        if (id === 'light' || id === 'hug' || id === 'teddy' || id === 'song' || id === 'blanket') R.dark = Math.max(0, R.dark - dt * (id === 'light' ? .5 : .15));
        if (id === 'wash') R.mud = Math.max(0, 1 - u * 1.2);
      }
      if (R.story === 'tower') this.blocksStep(dt);
      if (this.phase === 'thanks') { R.dark = Math.max(0, R.dark - dt * .4); R.cloud = Math.max(0, R.cloud - dt * .6); if (R.story === 'splash') R.mud = Math.max(0, R.mud - dt); }
      R.flash = Math.max(0, (R.flash || 0) - dt * 3); this.shiver = 0;
    }

    /* ---------------------------------------------------------------- drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h, R = this.round; if (!w || !R) return;
      const night = SPG.night && SPG.night.on(), S = this.S, gy = this.gy, t = this.t;
      this.place.draw(c, w, h, t, { clouds: !(R.cloud > 0), sun: !(R.cloud > .3) });
      if (R.story === 'yawn' && !night) { const u = this.phase === 'story' ? ease(this.pt / 1.6) : 1; c.fillStyle = `rgba(40,30,90,${.28 * u})`; c.fillRect(0, 0, w, h); c.fillStyle = '#fff6c4'; ell(c, w * .8, h * .1 + (1 - u) * h * .2, S * .14, S * .14); c.fill(); }
      // a soft patch of grass where the friend stands
      c.fillStyle = night ? 'rgba(60,110,80,.55)' : 'rgba(126,201,95,.55)'; ell(c, w / 2, gy + S * .04, Math.min(w * .48, S * 2.4), S * .16); c.fill();
      if (R.cloud > 0) { const k = R.cloud; const cy = this.skyY; cloud(c, w * .3, cy - (1 - k) * S, S * .75, `rgba(120,120,150,${.9 * k})`); cloud(c, w * .72, cy + S * .15 - (1 - k) * S * 1.2, S * .62, `rgba(105,105,140,${.9 * k})`); }
      if (R.flash > 0 && R.story === 'thunder') { c.strokeStyle = `rgba(255,240,150,${R.flash})`; c.lineWidth = S * .04; c.lineJoin = 'round'; c.beginPath(); const bx = w * .7, by = this.skyY + S * .3; c.moveTo(bx, by); c.lineTo(bx - S * .12, by + S * .35); c.lineTo(bx + S * .05, by + S * .4); c.lineTo(bx - S * .1, by + S * .75); c.stroke(); }
      this.drawProp(c, 'back');
      this.drawFriend(c);
      this.drawProp(c, 'front');
      this.drawHelp(c);
      // darkness (rain, thunder, lights out) with a soft light around the friend so the face can always be seen
      if (R.dark > 0) {
        const fx = this.x, fy = gy - S * .6, g = c.createRadialGradient(fx, fy, S * .45, fx, fy, S * 1.4);
        g.addColorStop(0, 'rgba(25,20,60,0)'); g.addColorStop(1, `rgba(25,20,60,${R.dark})`); c.fillStyle = g; c.fillRect(0, 0, w, h);
      }
      if (R.flash > 0) { c.fillStyle = `rgba(255,255,240,${R.flash * .35})`; c.fillRect(0, 0, w, h); }
      if (this.phase === 'ask' || this.phase === 'yes') this.drawBubble(c);
      this.drawButtons(c);
      this.fx.draw(c);
    }
    drawFriend(c) {
      const R = this.round, S = this.S, t = this.t, x = this.x + this.shiver + Math.sin(this.shake * 18) * this.shake * S * .06;
      c.save(); c.translate(x, this.gy);
      if (this.phase === 'leave' && R.mood !== 'sleep') c.scale(-1, 1);
      if (this.phase === 'leave' && R.mood === 'sleep') c.globalAlpha = Math.max(0, 1 - this.pt / 1.4);
      if (R.mood === 'sad' && this.face === 'sad') c.rotate(Math.sin(t * 1.5) * .02);
      c.translate(0, -this.lift()); P.draw(c, R.friend, S, t, { mood: this.face, detail: 1 });
      if (R.mud > 0) { c.globalAlpha = R.mud; c.fillStyle = '#8a6448'; for (const [dx, dy, r] of [[-.12, -.2, .05], [.1, -.3, .04], [.16, -.12, .035], [-.05, -.42, .03], [.03, -.15, .045], [-.18, -.08, .03]]) { ell(c, dx * S, dy * S, r * S, r * S * .8); c.fill(); } c.globalAlpha = 1; }
      c.restore();
    }
    drawProp(c, layer) {
      const R = this.round, S = this.S, gy = this.gy, x = this.px, t = this.t, inStory = this.phase === 'story', u = inStory ? this.pt : 99;
      const hx = this.x + S * .3, hy = gy - S * .3;   // where the friend's right paw is
      c.save(); if (this.phase === 'leave') c.globalAlpha = Math.max(0, 1 - this.pt / 1.2);
      switch (R.story) {
        case 'present': if (layer === 'back') { const drop = clamp(u / .7, 0, 1), y = gy - (1 - ease(drop)) * S * 1.5 - Math.abs(Math.sin(drop * Math.PI * 2)) * (1 - drop) * S * .1; const op = Math.min(1, (R.open || 0) * 2.4); c.translate(x, y); present(c, S * .45, op, '#ff8fc0'); if (op > .5) { c.globalAlpha = op; art.star(c, 0, -S * .55 - Math.sin(t * 3) * S * .03, S * .12, '#ffd54a'); } } break;
        case 'cake': if (layer === 'back') { c.translate(x + (1 - ease(u / .8)) * this.w * .5, gy); cake(c, S * .5, t); } break;
        case 'pal': if (layer === 'back') { const px = x + (1 - ease(u / 1)) * this.w * .45 + (this.phase === 'leave' ? ease(this.pt / 1.5) * this.w * .5 : 0); c.translate(px, gy); c.scale(-1, 1); P.draw(c, R.pal, S * .85, t + 1, { mood: u > EV ? 'cheer' : 'happy', hop: u < 1 ? (u * 3) % 1 : 0 }); } break;
        case 'icecream': if (layer === 'front') {
          const fell = u > EV, fu = clamp((u - EV) / .4, 0, 1);
          c.save(); c.translate(hx, hy - S * .02); c.rotate(-.15); cone(c, S * .38, !fell); c.restore();
          if (fell) { if (fu < 1) { c.translate(hx + fu * S * .1, hy - S * .05 + (gy - hy) * fu * fu); c.fillStyle = '#ffb3c6'; ell(c, 0, 0, S * .07, S * .06); c.fill(); } else { c.fillStyle = '#ffb3c6'; ell(c, hx + S * .12, gy - S * .015, S * .11, S * .03); c.fill(); ell(c, hx + S * .08, gy - S * .04, S * .05, S * .03); c.fill(); } }
        } break;
        case 'balloon': if (layer === 'front') {
          if (u < EV) { c.translate(hx, hy); balloon(c, S * .8, '#ff6b81', Math.sin(t * 2) * S * .03); }
          else if (inStory) { const fu = (u - EV) / (STORY_T - EV); c.translate(hx + fu * S * 1.4, hy - fu * fu * this.h * .9); balloon(c, S * .8, '#ff6b81', Math.sin(t * 3) * S * .06); }
          if (R.help === 'gift' && this.phase !== 'help') { /* the gift brings a new balloon */ const g = clamp(this.pt / 1.2, 0, 1); if (R.giftOpen || this.phase === 'thanks' || this.phase === 'leave') { c.translate(hx, hy - (1 - g) * S * .4); balloon(c, S * .8, '#b58cf0', Math.sin(t * 2) * S * .03); } }
        } break;
        case 'rain': break;
        case 'tower': if (layer === 'back') { for (const b of R.blocks) blockAt(c, b, R.bs); if (inStory && u < EV + .2) { const bu = clamp(u / EV, 0, 1), bx = this.w + S * .2 - (this.w + S * .2 - x - R.bs * .6) * bu; c.fillStyle = '#ff6b81'; ell(c, bx, gy - S * .09, S * .09, S * .09); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = S * .015; c.beginPath(); c.arc(bx, gy - S * .09, S * .09, bu * 12, bu * 12 + 1.5); c.stroke(); } } break;
        case 'splash': if (layer === 'back') { c.fillStyle = '#8a6448'; ell(c, this.x + S * .55, gy + S * .02, S * .32, S * .06); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; ell(c, this.x + S * .5, gy + S * .01, S * .12, S * .02); c.fill(); if (inStory && u < EV + .6) { const cu = clamp((u - .2) / (EV + .4 - .2), 0, 1); c.translate(this.w + S * .5 - (this.w + S * 1.5) * cu, gy); car(c, S * .45); } } break;
        case 'jack': if (layer === 'back') { c.translate(x, gy); jackBox(c, S * .5, !!R.open, R.open || 0, t); } break;
        case 'party': if (layer === 'back' && u > EV) {
          const pu = clamp((u - EV) / .5, 0, 1);
          ['#ff6b81', '#ffd54a', '#5aa8f0', '#7ed957'].forEach((col, i) => { c.save(); c.translate(x - S * .3 + i * S * .22, gy + (1 - ease(pu)) * S * 1.2 - Math.sin(t * 2 + i) * S * .03); balloon(c, S * (.7 + (i % 2) * .12), col); c.restore(); });
          const top = Math.max(this.skyY - S * .2, this.h * .16); c.strokeStyle = '#c9a0dc'; c.lineWidth = 2; c.beginPath(); c.moveTo(this.w * .08, top - S * .1); c.quadraticCurveTo(this.w / 2, top + S * .15 * pu, this.w * .92, top - S * .1); c.stroke();
          for (let i = 0; i < 9; i++) { const fx = this.w * (.12 + i * .095), fy = top - S * .08 + Math.sin((i + .5) / 9 * Math.PI) * S * .12 * pu; c.fillStyle = ['#ff6b81', '#ffd54a', '#5aa8f0', '#7ed957', '#b58cf0'][i % 5]; c.beginPath(); c.moveTo(fx - S * .06, fy); c.lineTo(fx + S * .06, fy); c.lineTo(fx, fy + S * .14 * pu); c.closePath(); c.fill(); }
        } break;
      }
      c.restore();
    }
    // what the chosen help looks like while it happens
    drawHelp(c) {
      const R = this.round; if (!R.help || (this.phase !== 'fix' && this.phase !== 'thanks' && !(this.phase === 'leave' && R.mood === 'sleep'))) return;
      const S = this.S, gy = this.gy, t = this.t, u = this.phase === 'fix' ? this.pt : 99, x = this.x;
      c.save(); if (this.phase === 'leave') c.globalAlpha = Math.max(0, 1 - this.pt / 1.4);
      switch (R.help) {
        case 'hug': { const k = ease(u / .6) * (this.phase === 'fix' ? 1 : Math.max(0, 1 - this.pt)); if (k > 0) { c.globalAlpha = .9 * k; art.heart(c, x, gy - S * .45, S * (.28 + Math.sin(t * 5) * .02) * k, '#ff7a9a'); } break; }
        case 'gift': { const k = ease(u / .8), y = gy - (1 - k) * S * 1.4; c.translate(x + S * .55, y); present(c, S * .32, R.giftOpen ? Math.min(1, (u - 1) * 2) : 0, '#7fd4f5'); break; }
        case 'light': { const k = ease(u / .8); c.translate(x - S * .55, gy); lamp(c, S * .38, k); break; }
        case 'teddy': { const k = ease(u / .9); c.translate(x + S * (.32 + (1 - k) * 1.2), gy); P.draw(c, 'bear', S * .42, t, { mood: 'cheer' }); break; }
        case 'breath': { c.translate(x + S * .5, gy); const spin = u < 2.2 ? t * .5 : t * 14; pinwheel(c, S * .45, spin); if (u < 2.2 && this.phase === 'fix') { c.globalAlpha = .5; c.strokeStyle = '#9ecbff'; c.lineWidth = S * .02; c.beginPath(); c.arc(-S * .5, -S * .65, S * (.05 + u * .06), 0, TAU); c.stroke(); } break; }
        case 'blanket': { const k = ease(u / .9); c.translate(x, gy - S * .18 - (1 - k) * S * 1.2); blanket(c, S * .62); break; }
        case 'high5': { const k = u < .9 ? ease(u / .9) : this.phase === 'fix' ? 1 - ease((u - .9) / 1.2) : 0; if (k > 0) { c.translate(this.w + S * .4 - (this.w + S * .4 - (x + S * .55)) * k, gy - S * .75); c.rotate(-.3); hand(c, S * .4); } break; }
      }
      c.restore();
    }
    drawBubble(c) {
      const b = this.bubble, k = this.phase === 'ask' ? ease(this.pt / .4) : Math.max(0, 1 - this.pt * 2); if (k <= 0) return;
      const r = b.r * k, x = this.x + this.S * .42;
      c.save(); c.fillStyle = '#fff';
      ell(c, x - this.S * .17, b.y + this.S * .3, r * .18, r * .18); c.fill(); ell(c, x - this.S * .1, b.y + this.S * .18, r * .3, r * .3); c.fill();
      ell(c, x, b.y, r, r * .85); c.fill(); c.fillStyle = '#b58cf0'; c.font = `800 ${r * 1.1}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x, b.y + r * .05);
      c.restore();
    }
    drawButtons(c) {
      const R = this.round; if (!this.btns) return;
      const br = this.br, t = this.t;
      for (const b of this.btns) {
        const k = ease(b.in) * (1 + b.pop * .25), x = b.x + Math.sin(b.shake * 20) * b.shake * br * .15, glow = this.phase === 'ask' && R.glow && b.id === R.mood;
        c.save(); c.translate(x, b.y); c.scale(k, k); c.globalAlpha = b.dim ? .45 : 1;
        if (glow) { c.fillStyle = `rgba(255,236,120,${.45 + Math.sin(t * 7) * .25})`; ell(c, 0, 0, br * 1.32, br * 1.32); c.fill(); }
        c.fillStyle = 'rgba(0,0,0,.12)'; ell(c, 0, br * .1, br, br); c.fill();
        c.fillStyle = '#fff'; ell(c, 0, 0, br, br); c.fill();
        if (b.kind === 'face') { c.fillStyle = RING[b.id] + '40'; ell(c, 0, 0, br, br); c.fill(); }
        c.strokeStyle = b.kind === 'face' ? RING[b.id] : '#a6dc7e'; c.lineWidth = br * .14; ell(c, 0, 0, br * .93, br * .93); c.stroke();
        if (b.kind === 'face') { c.save(); c.translate(0, br * .12); c.beginPath(); c.arc(0, -br * .12, br * .86, 0, TAU); c.clip(); art.avatar(c, P.SPECIES[R.friend].kind || R.friend, br * .74, { mood: FACE[b.id] }); c.restore(); }
        else helpIcon(c, b.id, br * .62, t);
        c.restore();
      }
    }
    probe() {
      const R = this.round;
      return { phase: this.phase, story: R && R.story, mood: R && R.mood, friend: R && R.friend, wrong: R && R.wrong, glow: R && R.glow, help: R && R.help, helped: this.bag.helped, w: this.w, h: this.h, x: this.x, gy: this.gy, S: this.S, br: this.br,
        btns: (this.btns || []).map(b => ({ id: b.id, kind: b.kind, x: b.x, y: b.y, dim: b.dim, ready: b.in > .6 })) };
    }
  }

  Object.assign(api, { makeRound, STORIES, probe: () => { const r = SPG.app.running(); return r && r.inst instanceof FeelingsGame ? r.inst.probe() : null; } });
  SPG.feelingsGame = api;
  SPG.games.push({
    id: 'feelings', name: 'Feeling Friends', order: 16,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff1f6'); g.addColorStop(1, '#ffe0ec'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const r = Math.min(w, h) * .2;
      [['bunny', 'cheer', .3, .36], ['bear', 'sad', .7, .36], ['cat', 'wow', .3, .74], ['fox', 'scared', .7, .74]].forEach(([k, m, x, y]) => { c.save(); c.translate(w * x, h * y); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, 0, r * 1.12, 0, TAU); c.fill(); c.translate(0, r * .12); art.avatar(c, k, r * .78, { mood: m }); c.restore(); });
      art.heart(c, w * .5, h * .55, Math.min(w, h) * .09, '#ff7a9a');
    },
    create: host => new FeelingsGame(host)
  });
})();
