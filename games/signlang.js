// Sign Along: learn American Sign Language with a pair of hands (the same hands as Grown-ups > Accessibility > Signing hands).
// For every child, deaf or hearing. Four activities on a menu: Learn (a picture and its sign, by group, touch the hands to see it
// again), Watch & find (the hands sign, she touches the picture), Letters (a fingerspelled letter, she touches the letter; older
// children get short fingerspelled words and touch the picture) and My name (her name fingerspelled, letter by letter).
// Every word is also said out loud (`sign/<ID>` lines), so a hearing child links the word, the picture and the sign.
// Tiers (SPG.level.tier('signs')): 1 = everyday signs, animals and food, two pictures; 2 = also colours, things and numbers to 5,
// three pictures; 3 = everything (shapes, feelings, numbers to 10, fingerspelled words), four pictures.
// State in store.bag('signs'): right (answers right first time), seen[id], best name, mi (which group Learn shows).
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG, S = SPG.sign;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const pick = l => l[Math.floor(Math.random() * l.length)];
  const shuffle = l => l.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
  const rr = art.rr;
  const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); };

  /* ---------------------------------------------------------------- the words, in groups, with their pictures */
  const GROUPS = [
    { id: 'every', tier: 1, words: ['MORE', 'EAT', 'DRINK', 'MILK', 'WATER', 'SLEEP', 'PLAY', 'FINISH', 'HELP', 'PLEASE', 'THANK-YOU', 'MOM', 'DAD', 'BABY', 'LOVE', 'I-LOVE-YOU', 'FRIEND', 'HELLO', 'BYE', 'YES', 'NO', 'TOILET', 'HURT', 'SORRY', 'BATH', 'SHOES', 'OUTSIDE', 'BOOK'] },
    { id: 'animals', tier: 1, words: ['CAT', 'DOG', 'BIRD', 'FISH', 'RABBIT', 'BEAR', 'FROG', 'PIG', 'DUCK', 'COW', 'HORSE', 'MOUSE', 'BUTTERFLY', 'MONKEY', 'OWL', 'BEE', 'SPIDER', 'DINOSAUR'] },
    { id: 'food', tier: 1, words: ['APPLE', 'BANANA', 'COOKIE', 'CAKE', 'ICE-CREAM', 'CHEESE', 'PIZZA', 'SANDWICH', 'BREAD', 'BURGER', 'FRUIT', 'VEGETABLE'] },
    { id: 'things', tier: 2, words: ['BALL', 'CAR', 'HOUSE', 'TREE', 'FLOWER', 'SUN', 'MOON', 'STAR', 'RAIN', 'RAINBOW', 'SNOW', 'BALLOON', 'BOAT', 'AIRPLANE', 'TRAIN', 'MUSIC', 'GIFT', 'TOY'] },
    { id: 'colors', tier: 2, words: ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'PINK', 'BROWN', 'BLACK', 'WHITE', 'GRAY'] },
    { id: 'numbers', tier: 2, words: ['N:1', 'N:2', 'N:3', 'N:4', 'N:5', 'N:6', 'N:7', 'N:8', 'N:9', 'N:10'] },
    { id: 'feelings', tier: 3, words: ['HAPPY', 'SAD', 'SCARED', 'MAD', 'SURPRISED', 'TIRED'] },
    { id: 'shapes', tier: 3, words: ['CIRCLE', 'SQUARE', 'TRIANGLE', 'RECTANGLE', 'DIAMOND', 'OVAL', 'STAR', 'HEART'] },
    { id: 'letters', tier: 1, words: 'abcdefghijklmnopqrstuvwxyz'.split('').map(l => 'L:' + l) }
  ];
  SPG.signGroups = GROUPS;   // the grown-ups' Sign videos screen lists the words in the same groups
  const SPELLWORDS = ['CAT', 'DOG', 'SUN', 'PIG', 'COW', 'BEE', 'OWL', 'FISH', 'BALL', 'CAKE', 'MOON', 'STAR', 'TREE', 'MILK', 'BOOK', 'CAR'];
  // what the word is called (spoken, `sign/<ID>`), for the words that are not just their name
  const SAY = { 'THANK-YOU': 'Thank you', 'I-LOVE-YOU': 'I love you', FINISH: 'All done', TOILET: 'Potty', 'ICE-CREAM': 'Ice cream', MOM: 'Mommy', DAD: 'Daddy', N: n => String(n) };
  const nameOf = SPG.signNameOf = id => (/^N:/.test(id) ? id.slice(2) : /^L:/.test(id) ? id.slice(2).toUpperCase() : SAY[id] || id.charAt(0) + id.slice(1).toLowerCase().replace(/-/g, ' '));
  // every word becomes a spoken line (always said: they are what the game is about)
  for (const g of GROUPS) for (const w of g.words) if (!/^L:/.test(w)) voice.LINES['sign/' + w] = nameOf(w) + '!';
  for (const w of SPELLWORDS) voice.LINES['sign/' + w] = voice.LINES['sign/' + w] || nameOf(w) + '!';

  const COLS = { RED: '#ff5b6b', ORANGE: '#ff9d3d', YELLOW: '#ffd54a', GREEN: '#5cc25c', BLUE: '#4f8fe8', PURPLE: '#9a6be8', PINK: '#ff8fc0', BROWN: '#a8714a', BLACK: '#3a3340', WHITE: '#ffffff', GRAY: '#9a9aa8' };
  // the picture of a word, drawn in a box of radius r around the origin
  function pic(c, id, r, t) {
    c.save(); c.lineCap = c.lineJoin = 'round';
    const av = (k, m) => art.avatar(c, k, r * .62, { mood: m || 'happy' });
    if (/^N:/.test(id)) { const n = +id.slice(2), cols = n <= 5 ? n : 5, rows = Math.ceil(n / 5), d = r * .34; for (let i = 0; i < n; i++) { const cx = (i % 5 - (Math.min(n - Math.floor(i / 5) * 5, 5) - 1) / 2) * d, cy = (Math.floor(i / 5) - (rows - 1) / 2) * d * 1.1; art.star(c, cx, cy, d * .45, ['#ffd54a', '#ff8fc0', '#7fd4f5', '#a6e05a', '#b58cf0'][i % 5]); } c.restore(); return cols; }
    if (COLS[id]) { c.fillStyle = COLS[id]; c.beginPath(); c.arc(0, 0, r * .6, 0, TAU); c.fill(); c.strokeStyle = 'rgba(90,63,94,.25)'; c.lineWidth = r * .05; c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; ell(c, -r * .2, -r * .25, r * .18, r * .1); c.fill(); c.restore(); return; }
    const shp = { CIRCLE: () => { c.arc(0, 0, r * .55, 0, TAU); }, OVAL: () => { c.ellipse(0, 0, r * .4, r * .62, 0, 0, TAU); }, SQUARE: () => { rr(c, -r * .52, -r * .52, r * 1.04, r * 1.04, r * .08); }, RECTANGLE: () => { rr(c, -r * .7, -r * .4, r * 1.4, r * .8, r * .08); }, TRIANGLE: () => { c.moveTo(0, -r * .6); c.lineTo(r * .65, r * .5); c.lineTo(-r * .65, r * .5); c.closePath(); }, DIAMOND: () => { c.moveTo(0, -r * .68); c.lineTo(r * .48, 0); c.lineTo(0, r * .68); c.lineTo(-r * .48, 0); c.closePath(); } };
    if (shp[id]) { c.beginPath(); shp[id](); c.fillStyle = '#7fb6f0'; c.fill(); c.strokeStyle = '#4f7fc0'; c.lineWidth = r * .06; c.stroke(); c.restore(); return; }
    const moodOf = { HAPPY: 'cheer', SAD: 'sad', SCARED: 'scared', MAD: 'mad', SURPRISED: 'wow', TIRED: 'sleep' };
    if (moodOf[id]) { c.translate(0, r * .1); av('bear', moodOf[id]); c.restore(); return; }
    const animal = { CAT: 'cat', DOG: 'dog', RABBIT: 'bunny', BEAR: 'bear', FROG: 'frog', PIG: 'pig', DUCK: 'duck', MOUSE: 'mouse', OWL: 'owl' };
    if (animal[id]) { c.translate(0, r * .12); av(animal[id]); c.restore(); return; }
    switch (id) {
      case 'COW': c.fillStyle = '#e8e0d8'; for (const sd of [-1, 1]) { c.save(); c.translate(sd * r * .42, -r * .38); c.rotate(sd * .5); ell(c, 0, 0, r * .16, r * .08); c.fill(); c.restore(); }
        c.fillStyle = '#fff'; ell(c, 0, 0, r * .46, r * .44); c.fill(); c.fillStyle = '#3a3340'; ell(c, -r * .24, -r * .2, r * .13, r * .1); c.fill(); ell(c, r * .28, -r * .05, r * .1, r * .14); c.fill();
        c.fillStyle = '#ffb3c6'; ell(c, 0, r * .25, r * .3, r * .18); c.fill(); c.fillStyle = '#c9748c'; ell(c, -r * .1, r * .25, r * .04, r * .05); c.fill(); ell(c, r * .1, r * .25, r * .04, r * .05); c.fill(); c.save(); c.translate(0, -r * .08); art.face(c, r * .3, { mood: 'happy', cheeks: false }); c.restore(); break;
      case 'HORSE': c.fillStyle = '#6b3d22'; ell(c, 0, -r * .3, r * .22, r * .3); c.fill(); c.fillStyle = '#b97a4a'; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * r * .15, -r * .4); c.lineTo(sd * r * .3, -r * .65); c.lineTo(sd * r * .32, -r * .3); c.closePath(); c.fill(); }
        ell(c, 0, -r * .05, r * .32, r * .4); c.fill(); c.fillStyle = '#e8c09a'; ell(c, 0, r * .25, r * .26, r * .2); c.fill(); c.fillStyle = '#8a5a3c'; ell(c, -r * .09, r * .27, r * .035, r * .045); c.fill(); ell(c, r * .09, r * .27, r * .035, r * .045); c.fill(); c.save(); c.translate(0, -r * .1); art.face(c, r * .26, { mood: 'happy', cheeks: false }); c.restore(); break;
      case 'MONKEY': c.fillStyle = '#8a5a3c'; for (const sd of [-1, 1]) { ell(c, sd * r * .48, 0, r * .14, r * .16); c.fill(); } ell(c, 0, 0, r * .44, r * .42); c.fill(); c.fillStyle = '#f0cfa8'; ell(c, 0, r * .08, r * .3, r * .26); c.fill(); ell(c, -r * .13, -r * .12, r * .14, r * .14); c.fill(); ell(c, r * .13, -r * .12, r * .14, r * .14); c.fill(); c.save(); c.translate(0, -r * .02); art.face(c, r * .3, { mood: 'happy', cheeks: false }); c.restore(); break;
      case 'BIRD': art.creature(c, 'bird', r * .8, t); break;
      case 'BUTTERFLY': art.creature(c, 'butterfly', r * .75, t); break;
      case 'BEE': art.creature(c, 'bee', r * .9, t); break;
      case 'FISH': c.fillStyle = '#ff9d3d'; ell(c, -r * .1, 0, r * .48, r * .3); c.fill(); c.beginPath(); c.moveTo(r * .3, 0); c.lineTo(r * .7, -r * .3); c.lineTo(r * .7, r * .3); c.closePath(); c.fill(); c.fillStyle = '#fff'; ell(c, -r * .32, -r * .06, r * .09, r * .09); c.fill(); c.fillStyle = '#3d2c44'; ell(c, -r * .34, -r * .06, r * .045, r * .045); c.fill(); break;
      case 'SPIDER': c.strokeStyle = '#5b4a70'; c.lineWidth = r * .06; for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, r * .05); c.quadraticCurveTo(sd * r * .4, -r * .25 + i * r * .16, sd * r * .62, r * (-.05 + i * .2)); c.stroke(); } c.fillStyle = '#5b4a70'; ell(c, 0, r * .05, r * .3, r * .26); c.fill(); for (const ex of [-.11, .11]) { c.fillStyle = '#fff'; ell(c, ex * r, 0, r * .08, r * .09); c.fill(); c.fillStyle = '#2c2235'; ell(c, ex * r, r * .01, r * .04, r * .05); c.fill(); } break;
      case 'DINOSAUR': art.avatar(c, 'trex', r * .6, { mood: 'happy' }); break;
      case 'APPLE': art.fruit(c, 0, r * .55); break;
      case 'BANANA': art.fruit(c, 4, r * .6); break;
      case 'FRUIT': c.save(); c.translate(-r * .28, r * .1); art.fruit(c, 0, r * .36); c.restore(); c.save(); c.translate(r * .3, r * .12); art.fruit(c, 1, r * .34); c.restore(); c.translate(0, -r * .3); art.fruit(c, 3, r * .3); break;
      case 'VEGETABLE': c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(-r * .2, -r * .3); c.lineTo(r * .2, -r * .3); c.lineTo(0, r * .6); c.closePath(); c.fill(); c.fillStyle = '#5cb85c'; for (const a of [-.4, 0, .4]) { c.save(); c.translate(0, -r * .32); c.rotate(a); ell(c, 0, -r * .2, r * .07, r * .2); c.fill(); c.restore(); } break;
      case 'COOKIE': c.fillStyle = '#e0a35a'; ell(c, 0, 0, r * .55, r * .55); c.fill(); c.fillStyle = '#6b3d22'; for (const [x, y] of [[-.2, -.2], [.18, -.1], [-.05, .2], [.25, .25], [-.28, .12]]) { ell(c, x * r, y * r, r * .07, r * .06); c.fill(); } break;
      case 'CAKE': c.fillStyle = '#ffb3c6'; rr(c, -r * .5, -r * .1, r, r * .5, r * .08); c.fill(); c.fillStyle = '#fff6fa'; rr(c, -r * .5, -r * .18, r, r * .16, r * .08); c.fill(); for (const x of [-.25, 0, .25]) { c.fillStyle = '#7fd4f5'; c.fillRect(x * r - r * .03, -r * .5, r * .06, r * .32); c.fillStyle = '#ffb347'; ell(c, x * r, -r * .56, r * .05, r * .08); c.fill(); } break;
      case 'ICE-CREAM': c.fillStyle = '#e8b06a'; c.beginPath(); c.moveTo(-r * .3, 0); c.lineTo(r * .3, 0); c.lineTo(0, r * .7); c.closePath(); c.fill(); c.fillStyle = '#ffb3c6'; ell(c, 0, -r * .15, r * .36, r * .3); c.fill(); c.fillStyle = '#fff'; ell(c, -r * .12, -r * .25, r * .09, r * .06); c.fill(); break;
      case 'CHEESE': c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(-r * .6, r * .35); c.lineTo(r * .6, r * .35); c.lineTo(r * .6, -r * .05); c.lineTo(-r * .6, r * .05); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-r * .6, r * .05); c.lineTo(r * .6, -r * .05); c.lineTo(r * .3, -r * .4); c.closePath(); c.fillStyle = '#ffe27a'; c.fill(); c.fillStyle = '#e8b830'; for (const [x, y, q] of [[-.3, .2, .08], [.2, .15, .1], [.4, .25, .06]]) { ell(c, x * r, y * r, q * r, q * r); c.fill(); } break;
      case 'PIZZA': c.fillStyle = '#e8b06a'; c.beginPath(); c.moveTo(-r * .55, -r * .4); c.lineTo(r * .55, -r * .4); c.lineTo(0, r * .62); c.closePath(); c.fill(); c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(-r * .45, -r * .3); c.lineTo(r * .45, -r * .3); c.lineTo(0, r * .5); c.closePath(); c.fill(); c.fillStyle = '#e8463c'; for (const [x, y] of [[-.15, -.15], [.15, -.12], [0, .15]]) { ell(c, x * r, y * r, r * .08, r * .08); c.fill(); } break;
      case 'SANDWICH': case 'BREAD': c.fillStyle = '#e0a35a'; rr(c, -r * .5, -r * .45, r, r * .9, r * .3); c.fill(); c.fillStyle = '#ffe9c2'; rr(c, -r * .4, -r * .32, r * .8, r * .7, r * .22); c.fill(); if (id === 'SANDWICH') { c.fillStyle = '#7ed957'; c.fillRect(-r * .55, r * .1, r * 1.1, r * .08); c.fillStyle = '#ff8a7a'; c.fillRect(-r * .5, r * .18, r, r * .07); } break;
      case 'BURGER': c.fillStyle = '#e0a35a'; ell(c, 0, -r * .2, r * .55, r * .3); c.fill(); c.fillStyle = '#7ed957'; c.fillRect(-r * .58, -r * .02, r * 1.16, r * .08); c.fillStyle = '#7a4a2e'; rr(c, -r * .55, r * .05, r * 1.1, r * .18, r * .08); c.fill(); c.fillStyle = '#e0a35a'; rr(c, -r * .52, r * .22, r * 1.04, r * .2, r * .1); c.fill(); break;
      case 'MILK': c.fillStyle = '#fff'; c.strokeStyle = '#9ac'; c.lineWidth = r * .05; rr(c, -r * .32, -r * .3, r * .64, r * .85, r * .06); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-r * .32, -r * .3); c.lineTo(0, -r * .6); c.lineTo(r * .32, -r * .3); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#7fb6f0'; c.fillRect(-r * .32, r * .05, r * .64, r * .22); break;
      case 'WATER': case 'DRINK': c.fillStyle = 'rgba(190,230,255,.7)'; c.strokeStyle = '#7fb6f0'; c.lineWidth = r * .05; c.beginPath(); c.moveTo(-r * .35, -r * .5); c.lineTo(r * .35, -r * .5); c.lineTo(r * .27, r * .55); c.lineTo(-r * .27, r * .55); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#5aa8f0'; c.beginPath(); c.moveTo(-r * .32, -r * .15); c.lineTo(r * .32, -r * .15); c.lineTo(r * .27, r * .55); c.lineTo(-r * .27, r * .55); c.closePath(); c.fill(); if (id === 'DRINK') { c.strokeStyle = '#ff6b81'; c.lineWidth = r * .07; c.beginPath(); c.moveTo(r * .05, r * .2); c.lineTo(r * .2, -r * .75); c.lineTo(r * .4, -r * .8); c.stroke(); } break;
      case 'EAT': c.fillStyle = '#fff'; ell(c, 0, r * .25, r * .6, r * .22); c.fill(); c.strokeStyle = '#ddd'; c.lineWidth = r * .03; c.stroke(); c.translate(0, -r * .05); art.fruit(c, 0, r * .3); c.translate(0, r * .05); c.strokeStyle = '#b8bcc8'; c.lineWidth = r * .06; c.beginPath(); c.moveTo(r * .55, -r * .45); c.lineTo(r * .55, r * .05); c.stroke(); break;
      case 'MORE': for (let i = 0; i < 3; i++) { c.save(); c.translate((i - 1) * r * .38, 0); art.fruit(c, 3, r * .22); c.restore(); } c.fillStyle = '#5cc25c'; c.beginPath(); c.arc(r * .45, -r * .45, r * .2, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = r * .07; c.beginPath(); c.moveTo(r * .33, -r * .45); c.lineTo(r * .57, -r * .45); c.moveTo(r * .45, -r * .57); c.lineTo(r * .45, -r * .33); c.stroke(); break;
      case 'FINISH': c.fillStyle = '#fff'; ell(c, 0, r * .1, r * .6, r * .24); c.fill(); c.strokeStyle = '#ddd'; c.lineWidth = r * .03; c.stroke(); c.strokeStyle = '#5cc25c'; c.lineWidth = r * .14; c.beginPath(); c.moveTo(-r * .3, -r * .2); c.lineTo(-r * .05, r * .02); c.lineTo(r * .4, -r * .5); c.stroke(); break;
      case 'SLEEP': c.fillStyle = '#9ec9ff'; rr(c, -r * .62, r * .05, r * 1.24, r * .38, r * .12); c.fill(); c.fillStyle = '#fff'; rr(c, -r * .58, -r * .1, r * .4, r * .24, r * .1); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(r * .3, -r * .45, r * .22, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(r * .4, -r * .52, r * .2, 0, TAU); c.fill(); break;
      case 'PLAY': case 'TOY': [['#ff6b81', -.32, .25], ['#5aa8f0', .22, .25], ['#ffd54a', -.05, -.2]].forEach(([col, x, y]) => { c.fillStyle = col; rr(c, x * r - r * .22, y * r - r * .22, r * .44, r * .44, r * .07); c.fill(); }); break;
      case 'HELP': art.heart(c, 0, r * .3, r * .32, '#ff7a9a'); c.fillStyle = '#ffd7b5'; ell(c, -r * .3, -r * .15, r * .2, r * .26); c.fill(); ell(c, r * .3, -r * .15, r * .2, r * .26); c.fill(); break;
      case 'PLEASE': case 'THANK-YOU': c.translate(0, r * .1); av('bunny', 'cheer'); art.heart(c, r * .5, -r * .5, r * .18, '#ff7a9a'); break;
      case 'MOM': case 'DAD': case 'BABY': { const s2 = id === 'BABY' ? .42 : .55; c.translate(0, r * .1); art.avatar(c, id === 'DAD' ? 'bear' : id === 'MOM' ? 'bunny' : 'duck', r * s2, { mood: 'happy' }); if (id === 'MOM') art.heart(c, r * .5, -r * .5, r * .15, '#ff7a9a'); if (id === 'BABY') { c.strokeStyle = '#ffb3c6'; c.lineWidth = r * .08; c.beginPath(); c.arc(0, r * .05, r * .55, .3, Math.PI - .3); c.stroke(); } break; }
      case 'LOVE': case 'I-LOVE-YOU': art.heart(c, 0, r * .05, r * .5, '#ff5b8a'); if (id === 'I-LOVE-YOU') { art.heart(c, -r * .5, -r * .45, r * .16, '#ff9db8'); art.heart(c, r * .5, -r * .45, r * .16, '#ff9db8'); } break;
      case 'FRIEND': c.save(); c.translate(-r * .3, r * .1); art.avatar(c, 'bear', r * .32, { mood: 'cheer' }); c.restore(); c.save(); c.translate(r * .3, r * .1); art.avatar(c, 'bunny', r * .32, { mood: 'cheer' }); c.restore(); art.heart(c, 0, -r * .5, r * .15, '#ff7a9a'); break;
      case 'HELLO': case 'BYE': c.translate(0, r * .1); av('cat', 'cheer'); c.fillStyle = '#ffd7b5'; c.save(); c.translate(r * .55, -r * .35); c.rotate(id === 'BYE' ? Math.sin(t * 6) * .3 : .2); rr(c, -r * .12, -r * .2, r * .24, r * .32, r * .1); c.fill(); c.restore(); break;
      case 'YES': c.fillStyle = '#5cc25c'; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = r * .14; c.beginPath(); c.moveTo(-r * .25, 0); c.lineTo(-r * .05, r * .2); c.lineTo(r * .28, -r * .2); c.stroke(); break;
      case 'NO': c.fillStyle = '#ff7a7a'; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = r * .14; c.beginPath(); c.moveTo(-r * .2, -r * .2); c.lineTo(r * .2, r * .2); c.moveTo(r * .2, -r * .2); c.lineTo(-r * .2, r * .2); c.stroke(); break;
      case 'TOILET': c.fillStyle = '#fff'; c.strokeStyle = '#9ab'; c.lineWidth = r * .05; rr(c, -r * .2, -r * .6, r * .4, r * .36, r * .06); c.fill(); c.stroke(); ell(c, 0, 0, r * .42, r * .2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-r * .3, r * .05); c.lineTo(-r * .2, r * .55); c.lineTo(r * .2, r * .55); c.lineTo(r * .3, r * .05); c.fill(); c.stroke(); break;
      case 'HURT': c.translate(0, r * .1); av('bunny', 'sad'); c.fillStyle = '#ffe9a8'; c.save(); c.translate(r * .3, -r * .25); c.rotate(.6); rr(c, -r * .2, -r * .07, r * .4, r * .14, r * .05); c.fill(); c.restore(); break;
      case 'SORRY': c.translate(0, r * .1); av('fox', 'sad'); break;
      case 'BATH': c.fillStyle = '#fff'; c.strokeStyle = '#9ac'; c.lineWidth = r * .05; c.beginPath(); c.moveTo(-r * .62, -r * .05); c.lineTo(r * .62, -r * .05); c.lineTo(r * .5, r * .4); c.lineTo(-r * .5, r * .4); c.closePath(); c.fill(); c.stroke(); for (const [x, y, q] of [[-.3, -.2, .14], [0, -.3, .18], [.3, -.2, .13], [.1, -.55, .1]]) { c.fillStyle = 'rgba(190,230,255,.8)'; ell(c, x * r, y * r, q * r, q * r); c.fill(); } break;
      case 'SHOES': for (const sd of [-1, 1]) { c.fillStyle = sd < 0 ? '#ff6b81' : '#5aa8f0'; c.beginPath(); c.moveTo(sd * r * .08, -r * .2); c.lineTo(sd * r * .08, r * .3); c.lineTo(sd * r * .6, r * .3); c.quadraticCurveTo(sd * r * .6, r * .05, sd * r * .3, 0); c.lineTo(sd * r * .3, -r * .2); c.closePath(); c.fill(); } break;
      case 'OUTSIDE': art.sun(c, r * .3, -r * .3, r * .22, t); c.fillStyle = '#7ed957'; ell(c, 0, r * .45, r * .7, r * .2); c.fill(); c.fillStyle = '#8a6448'; c.fillRect(-r * .38, -r * .05, r * .1, r * .42); c.fillStyle = '#5cb85c'; ell(c, -r * .33, -r * .15, r * .22, r * .22); c.fill(); break;
      case 'BOOK': c.fillStyle = '#5aa8f0'; rr(c, -r * .55, -r * .4, r * 1.1, r * .8, r * .06); c.fill(); c.fillStyle = '#fff'; rr(c, -r * .48, -r * .34, r * .45, r * .68, r * .04); c.fill(); rr(c, r * .03, -r * .34, r * .45, r * .68, r * .04); c.fill(); c.strokeStyle = '#cfd8e8'; c.lineWidth = r * .03; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-r * .4, -r * .2 + i * r * .14); c.lineTo(-r * .1, -r * .2 + i * r * .14); c.moveTo(r * .1, -r * .2 + i * r * .14); c.lineTo(r * .4, -r * .2 + i * r * .14); c.stroke(); } break;
      case 'BALL': ['#ff6b6b', '#fff', '#5aa8f0', '#fff', '#ffd54a', '#fff'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r * .55, i * TAU / 6, (i + 1) * TAU / 6); c.closePath(); c.fill(); }); break;
      case 'CAR': c.fillStyle = '#ff6b6b'; rr(c, -r * .62, -r * .1, r * 1.24, r * .35, r * .12); c.fill(); rr(c, -r * .32, -r * .38, r * .62, r * .32, r * .1); c.fill(); c.fillStyle = '#d8f1ff'; rr(c, -r * .24, -r * .32, r * .22, r * .2, r * .04); c.fill(); rr(c, r * .04, -r * .32, r * .2, r * .2, r * .04); c.fill(); c.fillStyle = '#3d2c44'; for (const x of [-.35, .35]) { ell(c, x * r, r * .28, r * .14, r * .14); c.fill(); } break;
      case 'HOUSE': c.fillStyle = '#ffd54a'; c.fillRect(-r * .45, -r * .1, r * .9, r * .65); c.fillStyle = '#ff6b6b'; c.beginPath(); c.moveTo(-r * .62, -r * .05); c.lineTo(0, -r * .62); c.lineTo(r * .62, -r * .05); c.closePath(); c.fill(); c.fillStyle = '#a8714a'; c.fillRect(-r * .12, r * .15, r * .24, r * .4); break;
      case 'TREE': c.fillStyle = '#8a6448'; c.fillRect(-r * .1, 0, r * .2, r * .6); c.fillStyle = '#5cb85c'; ell(c, 0, -r * .2, r * .52, r * .45); c.fill(); c.fillStyle = '#ff6b6b'; for (const [x, y] of [[-.2, -.25], [.2, -.1], [.05, -.45]]) { ell(c, x * r, y * r, r * .07, r * .07); c.fill(); } break;
      case 'FLOWER': c.strokeStyle = '#5cb85c'; c.lineWidth = r * .08; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, r * .62); c.stroke(); c.fillStyle = '#ff8fc0'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ell(c, Math.cos(a) * r * .24, -r * .2 + Math.sin(a) * r * .24, r * .16, r * .16); c.fill(); } c.fillStyle = '#ffd54a'; ell(c, 0, -r * .2, r * .14, r * .14); c.fill(); break;
      case 'SUN': art.sun(c, 0, 0, r * .42, t); break;
      case 'MOON': c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(0, 0, r * .5, 0, TAU); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(r * .25, -r * .15, r * .45, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; break;
      case 'STAR': art.star(c, 0, 0, r * .6, '#ffd54a'); break;
      case 'HEART': art.heart(c, 0, r * .05, r * .5, '#ff5b8a'); break;
      case 'RAIN': art.cloud(c, 0, -r * .2, r * .7, 1, '#b9c3d8'); c.strokeStyle = '#5aa8f0'; c.lineWidth = r * .07; for (const x of [-.3, 0, .3]) { c.beginPath(); c.moveTo(x * r, r * .15); c.lineTo(x * r - r * .07, r * .45); c.stroke(); } break;
      case 'RAINBOW': ['#ff6b6b', '#ffa24d', '#ffd54a', '#7ed957', '#5aa8f0', '#b58cf0'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = r * .1; c.beginPath(); c.arc(0, r * .35, r * (.65 - i * .1), Math.PI, TAU); c.stroke(); }); break;
      case 'SNOW': c.strokeStyle = '#7fb6f0'; c.lineWidth = r * .07; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * .55, Math.sin(a) * r * .55); c.moveTo(Math.cos(a) * r * .3, Math.sin(a) * r * .3); c.lineTo(Math.cos(a + .5) * r * .42, Math.sin(a + .5) * r * .42); c.stroke(); } break;
      case 'BALLOON': c.strokeStyle = 'rgba(90,63,94,.5)'; c.lineWidth = r * .03; c.beginPath(); c.moveTo(0, r * .2); c.quadraticCurveTo(r * .1, r * .4, 0, r * .65); c.stroke(); c.fillStyle = '#ff6b81'; ell(c, 0, -r * .2, r * .36, r * .44); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; ell(c, -r * .12, -r * .36, r * .08, r * .13); c.fill(); break;
      case 'BOAT': c.fillStyle = '#a8714a'; c.beginPath(); c.moveTo(-r * .6, r * .1); c.lineTo(r * .6, r * .1); c.lineTo(r * .4, r * .4); c.lineTo(-r * .4, r * .4); c.closePath(); c.fill(); c.fillStyle = '#ff6b6b'; c.beginPath(); c.moveTo(-r * .02, -r * .6); c.lineTo(r * .45, r * .02); c.lineTo(-r * .02, r * .02); c.closePath(); c.fill(); c.fillStyle = '#5aa8f0'; ell(c, 0, r * .5, r * .7, r * .1); c.fill(); break;
      case 'AIRPLANE': c.fillStyle = '#5aa8f0'; ell(c, 0, 0, r * .62, r * .16); c.fill(); c.fillStyle = '#ff6b6b'; c.beginPath(); c.moveTo(-r * .1, 0); c.lineTo(r * .15, 0); c.lineTo(-r * .15, r * .45); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-r * .1, 0); c.lineTo(r * .15, 0); c.lineTo(-r * .15, -r * .45); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-r * .62, 0); c.lineTo(-r * .45, 0); c.lineTo(-r * .62, -r * .28); c.closePath(); c.fill(); break;
      case 'TRAIN': c.fillStyle = '#5aa8f0'; c.fillRect(-r * .55, -r * .35, r * .45, r * .55); c.fillStyle = '#ff6b6b'; c.fillRect(-r * .1, -r * .1, r * .65, r * .3); c.fillStyle = '#8f96a8'; c.fillRect(r * .3, -r * .35, r * .1, r * .25); c.fillStyle = '#3d2c44'; for (const x of [-.35, .05, .4]) { ell(c, x * r, r * .3, r * .12, r * .12); c.fill(); } break;
      case 'MUSIC': c.fillStyle = '#5a3f5e'; ell(c, -r * .25, r * .3, r * .17, r * .13); c.fill(); ell(c, r * .3, r * .2, r * .17, r * .13); c.fill(); c.fillRect(-r * .12, -r * .45, r * .07, r * .75); c.fillRect(r * .43, -r * .55, r * .07, r * .75); c.beginPath(); c.moveTo(-r * .12, -r * .45); c.lineTo(r * .5, -r * .55); c.lineTo(r * .5, -r * .35); c.lineTo(-r * .12, -r * .25); c.fill(); break;
      case 'GIFT': c.fillStyle = '#ff8fc0'; rr(c, -r * .45, -r * .2, r * .9, r * .65, r * .06); c.fill(); c.fillStyle = '#ffd54a'; c.fillRect(-r * .07, -r * .2, r * .14, r * .65); c.fillRect(-r * .5, -r * .32, r, r * .16); c.strokeStyle = '#ffd54a'; c.lineWidth = r * .07; ell(c, -r * .15, -r * .42, r * .14, r * .09); c.stroke(); ell(c, r * .15, -r * .42, r * .14, r * .09); c.stroke(); break;
    }
    c.restore();
  }
  // a group's own little picture (the Learn tabs)
  const GROUP_PIC = { every: 'I-LOVE-YOU', animals: 'CAT', food: 'APPLE', things: 'BALL', colors: 'RED', numbers: 'N:3', feelings: 'HAPPY', shapes: 'TRIANGLE', letters: 'L:a' };

  /* ---------------------------------------------------------------- the game */
  class SignGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas'; host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.bag = store.bag('signs', () => ({ right: 0, seen: {}, mi: 0 }));
      this.bag.right = this.bag.right || 0; this.bag.seen = this.bag.seen || {};
      this.counter = SPG.ui.counter(host, (c, s) => { c.save(); c.translate(s / 2, s * .55); const h = S.placeHand(S.built('ILY'), [0, 1, 0], [0, 0, 1], [0, 0, 0], 'palm', false), k = s * .32; S.drawHand(c, h, q => [q[0] * k, -(q[1] - .6) * k, q[2]], k); c.restore(); }, this.bag.right);
      this.hands = new S.Signer({ skin: store.settings.signSkin || 'medium' });
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.screen = 'menu'; this.btns = []; this.idle = 0;
      this.tick = this.tick.bind(this);
      SPG.signGame = this;
      this.canvas.addEventListener('pointerdown', e => { e.preventDefault(); SPG.audio.unlock(); const r = this.canvas.getBoundingClientRect(); this.press((e.clientX - r.left) * this.w / r.width, (e.clientY - r.top) * this.h / r.height); });
    }
    tier() { return clamp(SPG.level.tier('signs') | 0, 1, 3); }
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.wide = this.w > this.h * 1.1; this.ui = clamp(Math.min(this.w, this.h) * .11, 46, 76) * (store.settings.bigUI ? 1.23 : 1); this.edge = clamp(Math.min(this.w, this.h) * .02, 8, 14);
      this.layout(); this.draw();
    }
    // stage = where the hands are; area = where the pictures or letters to touch are
    layout() {
      const w = this.w, h = this.h, top = this.edge * 2 + this.ui, pad = this.edge * 1.5;
      if (this.wide) { const sw = Math.min(h - top - pad, w * .5); this.stage = { x: pad * 1.5, y: top + (h - top - pad - sw) / 2, w: sw, h: sw }; this.area = { x: this.stage.x + sw + pad * 2, y: top, w: w - sw - pad * 4.5, h: h - top - pad }; }
      else { const sw = Math.min(w - pad * 2, (h - top) * .5); this.stage = { x: (w - sw) / 2, y: top, w: sw, h: sw }; this.area = { x: pad, y: top + sw + pad, w: w - pad * 2, h: h - top - sw - pad * 2 }; }
      this.layoutButtons();
    }
    // the buttons of the screen: a grid in the area (or the menu tiles across the screen)
    layoutButtons() {
      const list = this.btns; if (!list.length) return;
      const box = this.screen === 'menu' ? { x: this.edge * 2, y: this.edge * 3 + this.ui, w: this.w - this.edge * 4, h: this.h - this.edge * 5 - this.ui } : this.area;
      const n = list.length; let best = null;
      for (let cols = 1; cols <= n; cols++) { const rows = Math.ceil(n / cols), cell = Math.min(box.w / cols, box.h / rows); if (!best || cell > best.cell) best = { cols, rows, cell }; }
      const { cols, rows } = best, cell = Math.min(best.cell, this.screen === 'menu' ? 400 : 280), gx = box.x + (box.w - cols * cell) / 2, gy = box.y + (box.h - rows * cell) / 2;
      list.forEach((b, i) => { const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - row * cols : cols, col = i - row * cols; b.x = gx + (col + .5 + (cols - inRow) / 2) * cell; b.y = gy + (row + .5) * cell; b.r = cell * .42; });
      // the round menu button beside the home button
      this.back = { x: this.edge * 2 + this.ui * 1.5 + 6, y: this.edge + this.ui / 2, r: this.ui / 2 };
    }
    // the corner hands of sign-language mode stay away here: these hands already sign everything
    start() { if (SPG.signs) SPG.signs.quiet = true; this.resize(); this.menu(); this.resume(); }
    resume() { if (SPG.signs) SPG.signs.quiet = true; if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { if (SPG.signs) SPG.signs.quiet = false; this.running = false; cancelAnimationFrame(this.raf); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); voice.stop(); }

    /* ---------------------------------------------------------------- screens */
    menu() {
      this.screen = 'menu'; this.hands.stop();
      this.btns = [{ id: 'learn', kind: 'tile' }, { id: 'find', kind: 'tile' }, { id: 'letters', kind: 'tile' }, { id: 'name', kind: 'tile' }].map((b, i) => Object.assign(b, { pop: -i * .08, shake: 0 }));
      this.layoutButtons(); voice.say('sl-start');
    }
    groups() { const t = this.tier(); return GROUPS.filter(g => g.tier <= t && g.id !== 'letters'); }
    // Learn: one group at a time, a picture and its sign; the arrows go through the group, the tabs change the group
    learn(gi) {
      const gs = [...this.groups(), GROUPS.find(g => g.id === 'letters')];
      this.screen = 'learn'; this.gi = gi == null ? (this.bag.mi || 0) % gs.length : gi; this.bag.mi = this.gi; this.gs = gs; this.wi = 0;
      this.btns = [{ id: 'prev', kind: 'arrow', pop: 1, shake: 0 }, { id: 'next', kind: 'arrow', pop: 1, shake: 0 }];
      this.layoutButtons(); this.showWord();
    }
    showWord() {
      const g = this.gs[this.gi], id = g.words[this.wi % g.words.length]; this.word = id; this.bag.seen[id] = (this.bag.seen[id] || 0) + 1;
      this.signNow([id]); voice.say(/^L:/.test(id) ? 'letter/' + id.slice(2) : 'sign/' + id); this.wordT = this.t;
    }
    signNow(ids) { this.hands.play(ids); this.signAt = this.t; this.signIds = ids; }
    // Watch & find: the hands sign, she touches the picture that goes with it
    find() {
      this.screen = 'find'; const t = this.tier(), pool = this.groups().filter(g => !(g.id === 'numbers' && t < 2));
      const g = pick(pool); let words = g.words.slice(); if (g.id === 'numbers') words = words.slice(0, t === 3 ? 10 : 5);
      if (g.id === 'every') words = words.filter(w => !['PLEASE', 'SORRY', 'HELP', 'YES', 'NO'].includes(w) || t === 3);   // the hardest to picture come last
      const cand = words.filter(w => w !== this.lastAns), ans = pick(cand.length ? cand : words); this.lastAns = ans;
      const k = t === 1 ? 2 : t === 2 ? 3 : 4, others = shuffle(words.filter(w => w !== ans)).slice(0, k - 1);
      this.round = { ans, wrong: 0, glow: false, done: false };
      this.btns = shuffle([ans, ...others]).map((id, i) => ({ id, kind: 'pic', pop: -i * .08, shake: 0, dim: false }));
      this.layoutButtons(); this.signNow([ans]); this.idle = 0;
      voice.say('sl-find');
    }
    // Letters: one letter fingerspelled, she touches the letter (older children: a short fingerspelled word, and its picture)
    letters() {
      this.screen = 'letters'; const t = this.tier();
      if (t === 3 && Math.random() < .45) {
        const word = pick(SPELLWORDS.filter(w => w !== this.lastAns)); this.lastAns = word;
        const others = shuffle(SPELLWORDS.filter(w => w !== word && w[0] !== word[0])).slice(0, 3);
        this.round = { ans: word, wrong: 0, glow: false, done: false, spelled: true };
        this.btns = shuffle([word, ...others]).map((id, i) => ({ id, kind: 'pic', pop: -i * .08, shake: 0, dim: false }));
        this.layoutButtons(); this.signNow(word.toLowerCase().split('').map(l => 'L:' + l)); voice.say('sl-word');
        return;
      }
      const all = 'abcdefghijklmnopqrstuvwxyz'.split(''), ans = pick(all.filter(l => l !== this.lastAns)); this.lastAns = ans;
      const k = t === 1 ? 2 : t === 2 ? 3 : 4, others = shuffle(all.filter(l => l !== ans)).slice(0, k - 1);
      this.round = { ans: 'L:' + ans, wrong: 0, glow: false, done: false };
      this.btns = shuffle(['L:' + ans, ...others.map(l => 'L:' + l)]).map((id, i) => ({ id, kind: 'letter', pop: -i * .08, shake: 0, dim: false }));
      this.layoutButtons(); this.signNow([this.round.ans]); voice.say('sl-letter');
    }
    // My name: fingerspelled, the letters light up one by one; touch a letter to see just that one
    name() {
      this.screen = 'name'; const p = store.active, nm = ((p && p.name) || 'Sprout').replace(/[^A-Za-z]/g, '').slice(0, 10) || 'Sprout';
      this.nm = nm; this.btns = nm.split('').map((l, i) => ({ id: 'L:' + l.toLowerCase(), ch: l, kind: 'name', pop: -i * .06, shake: 0, i }));
      this.layoutButtons(); this.spellName(); voice.say('spell-name');
    }
    spellName() { this.signNow(this.btns.map(b => b.id)); this.nameAt = this.t; }

    /* ---------------------------------------------------------------- touches */
    press(x, y) {
      this.idle = 0;
      if (this.screen !== 'menu' && Math.hypot(x - this.back.x, y - this.back.y) < this.back.r * 1.2) { sfx.tap(); return this.menu(); }
      const st = this.stage;
      if (this.screen !== 'menu' && x > st.x && x < st.x + st.w && y > st.y && y < st.y + st.h) { sfx.pop(); if (this.screen === 'name') this.spellName(); else this.signNow(this.signIds || []); return; }   // touching the hands: sign it again
      if (this.screen === 'learn' && this.tabs) { const tb = this.tabs.find(q => Math.hypot(x - q.x, y - q.y) < q.r * 1.1); if (tb) { sfx.tap(); this.gi = tb.i; this.bag.mi = tb.i; this.wi = 0; this.showWord(); return; } }
      const b = this.btns.find(q => q.pop >= .6 && Math.hypot(x - q.x, y - q.y) < q.r * 1.05); if (!b) return;
      if (this.screen === 'menu') { sfx.pop(); return this[b.id](); }
      if (this.screen === 'learn') { sfx.tap(); const g = this.gs[this.gi]; this.wi = (this.wi + (b.id === 'next' ? 1 : g.words.length - 1)) % g.words.length; b.pop = .7; return this.showWord(); }
      if (this.screen === 'name') { sfx.tap(); b.shake = .5; this.signNow([b.id]); voice.say('letter/' + b.ch.toLowerCase()); return; }
      this.answer(b);
    }
    answer(b) {
      const R = this.round; if (!R || R.done) return;
      if (b.id === R.ans) {
        R.done = true; b.pop = 1.25; sfx.chime(); this.btns.forEach(o => { if (o !== b) o.dim = true; });
        this.fx.burst(b.x, b.y, 16, { colors: ['#ffd54a', '#fff', '#ff8fc0', '#7fd4f5'], speed: 220, g: 200, life: .8, size: 7 * (this.ui / 70), shape: 'star', up: 100 });
        if (!R.wrong) { this.bag.right++; this.counter.set(this.bag.right); if (this.bag.right % 5 === 0) { store.addStars(1); setTimeout(() => this.running && sfx.win(), 400); } }
        store.save();
        voice.say(/^L:/.test(R.ans) ? 'letter/' + R.ans.slice(2) : 'sign/' + R.ans);
        this.signNow(R.spelled ? R.ans.toLowerCase().split('').map(l => 'L:' + l) : [R.ans]);
        this.nextAt = this.t + Math.max(2.2, this.hands.endsAt + .6);
        return;
      }
      if (b.dim) { b.shake = 1; return; }
      R.wrong++; b.shake = 1; b.dim = true; sfx.instrument ? sfx.instrument('bell', 1, .12) : sfx.tap();
      if (R.wrong >= 2) R.glow = true;
      this.signNow(this.signIds);   // the hands show it again
    }

    /* ---------------------------------------------------------------- time */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.idle += dt;
      this.hands.update(dt); this.fx.update(dt);
      for (const b of this.btns) { b.pop = Math.min(b.pop > 1 ? b.pop - dt : 1, b.pop + dt * 4); b.shake = Math.max(0, b.shake - dt * 2.4); }
      if ((this.screen === 'find' || this.screen === 'letters') && this.round) {
        if (this.round.done && this.t > this.nextAt) this[this.screen]();
        else if (!this.round.done && this.idle > 9) { this.idle = 0; this.round.glow = this.round.wrong > 0 || this.round.glow; this.signNow(this.signIds); }
      }
      // Learn and My name: the sign repeats by itself every few seconds
      if ((this.screen === 'learn' || this.screen === 'name') && !this.hands.busy && this.t - (this.signAt || 0) > (this.screen === 'name' ? 5 : 3.2)) this.signNow(this.signIds);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }

    /* ---------------------------------------------------------------- drawing */
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return;
      const night = SPG.night && SPG.night.on(), g = c.createLinearGradient(0, 0, 0, h);
      if (night) { g.addColorStop(0, '#26295a'); g.addColorStop(1, '#3a3470'); } else { g.addColorStop(0, '#e9f3ff'); g.addColorStop(1, '#fdeef6'); }
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = night ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.55)'; for (let i = 0; i < 14; i++) art.heart(c, ((i * 137) % 100) / 100 * w, ((i * 61) % 100) / 100 * h, 10 + (i % 4) * 6, c.fillStyle);
      if (this.screen === 'menu') this.drawMenu(c, night);
      else {
        this.drawStage(c, night);
        if (this.screen === 'learn') this.drawLearn(c, night); else this.drawButtons(c, night);
        this.drawBack(c);
      }
      this.fx.draw(c);
    }
    drawBack(c) {
      const b = this.back; c.save(); c.translate(b.x, b.y); c.fillStyle = 'rgba(0,0,0,.12)'; ell(c, 0, b.r * .1, b.r, b.r); c.fill(); c.fillStyle = '#fff'; ell(c, 0, 0, b.r, b.r); c.fill();
      c.fillStyle = '#b58cf0'; for (let i = 0; i < 4; i++) { rr(c, (i % 2 ? .08 : -.42) * b.r, (i < 2 ? -.42 : .08) * b.r, b.r * .34, b.r * .34, b.r * .08); c.fill(); }   // a little grid: back to the activities
      c.restore();
    }
    drawStage(c, night) {
      const s = this.stage; c.save(); c.fillStyle = 'rgba(60,40,90,.14)'; rr(c, s.x + 3, s.y + 8, s.w, s.h, s.w * .08); c.fill();
      c.fillStyle = night ? '#3a4580' : '#ffffff'; rr(c, s.x, s.y, s.w, s.h, s.w * .08); c.fill(); c.strokeStyle = night ? '#7a6fc0' : '#cfe3ff'; c.lineWidth = 4; c.stroke();
      c.restore();
      this.hands.draw(c, s.x, s.y, s.w, s.h, { badge: .1, dt: .016 });
      // the letters of a fingerspelled word, lighting up as they are signed
      if ((this.screen === 'letters' && this.round && this.round.spelled) || this.screen === 'name') {
        const word = this.screen === 'name' ? this.nm : this.round.ans, wn = this.hands.wordNow(), i = this.hands.busy && wn ? this.hands.words.indexOf(wn) : -1;
        const fs = Math.min(s.w / (word.length + 1), s.h * .12); c.font = `800 ${fs}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
        word.split('').forEach((ch, j) => { c.fillStyle = j === i ? '#ff4f86' : j < i || i < 0 ? (night ? '#fff' : '#5a3f5e') : 'rgba(90,63,94,.25)'; c.fillText(ch.toUpperCase(), s.x + s.w / 2 + (j - (word.length - 1) / 2) * fs * .9, s.y + s.h - fs * .8); });
      }
    }
    drawButtons(c, night) {
      const R = this.round, t = this.t;
      for (const b of this.btns) {
        const k = ease(clamp(b.pop, 0, 1)) * (b.pop > 1 ? 1 + (b.pop - 1) * .6 : 1), x = b.x + Math.sin(b.shake * 20) * b.shake * b.r * .12, r = b.r;
        if (k <= 0) continue;
        c.save(); c.translate(x, b.y); c.scale(k, k); c.globalAlpha = b.dim ? .4 : 1;
        if (R && R.glow && b.id === R.ans && !R.done) { c.fillStyle = `rgba(255,236,120,${.45 + Math.sin(t * 7) * .25})`; rr(c, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2, r * .4); c.fill(); }
        c.fillStyle = 'rgba(60,40,90,.14)'; rr(c, -r, -r + r * .08, r * 2, r * 2, r * .3); c.fill();
        c.fillStyle = night ? '#4b558f' : '#fff'; rr(c, -r, -r, r * 2, r * 2, r * .3); c.fill();
        if (b.kind === 'pic') pic(c, b.id, r * 1.2, t);
        else if (b.kind === 'letter' || b.kind === 'name') { const ch = b.kind === 'name' ? b.ch : b.id.slice(2); c.fillStyle = b.kind === 'name' && this.hands.busy && this.hands.words.indexOf(this.hands.wordNow()) === b.i ? '#ff4f86' : (night ? '#fff' : '#5a3f5e'); c.font = `800 ${r * 1.15}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.kind === 'name' ? ch.toUpperCase() : ch.toUpperCase() + ch, 0, r * .06); }
        c.restore();
      }
    }
    drawLearn(c, night) {
      const a = this.area, g = this.gs[this.gi], id = this.word, t = this.t;
      // the tabs (one picture per group) along the top of the area, the picture in the middle, the arrows at the sides
      const n = this.gs.length, tr = Math.min(a.w / (n * 2.3), a.h * .085, 34);
      this.tabs = this.gs.map((q, i) => ({ i, x: a.x + a.w / 2 + (i - (n - 1) / 2) * tr * 2.3, y: a.y + tr * 1.2, r: tr }));
      for (const tb of this.tabs) {
        c.save(); c.translate(tb.x, tb.y); c.fillStyle = tb.i === this.gi ? '#b58cf0' : night ? '#4b558f' : '#fff'; ell(c, 0, 0, tb.r, tb.r); c.fill();
        const gp = GROUP_PIC[this.gs[tb.i].id]; if (/^L:/.test(gp)) { c.fillStyle = tb.i === this.gi ? '#fff' : '#5a3f5e'; c.font = `800 ${tb.r}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Aa', 0, tb.r * .08); } else pic(c, gp, tb.r * .8, t);
        c.restore();
      }
      const py = a.y + tr * 2.6, ph = a.h - tr * 2.6, pr = Math.min(a.w * .3, ph * .42), cx = a.x + a.w / 2, cy = py + ph / 2;
      c.save(); c.translate(cx, cy); const pop = ease((t - (this.wordT || 0)) / .3); c.scale(.8 + pop * .2, .8 + pop * .2);
      c.fillStyle = night ? '#4b558f' : '#fff'; rr(c, -pr, -pr, pr * 2, pr * 2, pr * .25); c.fill();
      if (/^L:/.test(id)) { c.fillStyle = night ? '#fff' : '#5a3f5e'; c.font = `800 ${pr * 1.1}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(id.slice(2).toUpperCase() + id.slice(2), 0, pr * .06); }
      else pic(c, id, pr * 1.2, t);
      c.restore();
      // arrows
      this.btns[0].x = cx - pr - Math.min(pr * .55, (a.w / 2 - pr) * .5) - 10; this.btns[1].x = cx + pr + Math.min(pr * .55, (a.w / 2 - pr) * .5) + 10; this.btns.forEach(b => { b.y = cy; b.r = Math.max(26, Math.min(pr * .38, (a.w / 2 - pr) * .45)); });
      for (const b of this.btns) { c.save(); c.translate(b.x, b.y); c.fillStyle = '#5cc25c'; ell(c, 0, 0, b.r, b.r); c.fill(); c.fillStyle = '#fff'; c.beginPath(); const d = b.id === 'next' ? 1 : -1; c.moveTo(d * b.r * .45, 0); c.lineTo(-d * b.r * .25, -b.r * .45); c.lineTo(-d * b.r * .25, b.r * .45); c.closePath(); c.fill(); c.restore(); }
    }
    drawMenu(c, night) {
      const t = this.t;
      for (const b of this.btns) {
        const k = ease(clamp(b.pop, 0, 1)), r = b.r; if (k <= 0) continue;
        c.save(); c.translate(b.x, b.y); c.scale(k, k);
        c.fillStyle = 'rgba(60,40,90,.16)'; rr(c, -r, -r + r * .08, r * 2, r * 2, r * .3); c.fill();
        const gg = c.createLinearGradient(0, -r, 0, r), col = { learn: ['#fff3c4', '#ffd88a'], find: ['#dff2ff', '#a9d6f5'], letters: ['#ffe3ec', '#f5b8cb'], name: ['#e8f9d8', '#b5e39a'] }[b.id];
        gg.addColorStop(0, col[0]); gg.addColorStop(1, col[1]); c.fillStyle = gg; rr(c, -r, -r, r * 2, r * 2, r * .3); c.fill();
        // each tile: a picture of what it does, and a hand
        if (b.id === 'learn') { c.save(); c.translate(-r * .35, -r * .15); pic(c, 'BOOK', r * .55, t); c.restore(); }
        if (b.id === 'find') { c.save(); c.translate(-r * .35, -r * .2); pic(c, 'CAT', r * .5, t); c.strokeStyle = '#5a3f5e'; c.lineWidth = r * .06; ell(c, r * .02, 0, r * .42, r * .42); c.stroke(); c.beginPath(); c.moveTo(r * .32, r * .3); c.lineTo(r * .55, r * .55); c.stroke(); c.restore(); }
        if (b.id === 'letters') { c.fillStyle = '#5a3f5e'; c.font = `800 ${r * .55}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ABC', -r * .3, -r * .35); }
        if (b.id === 'name') { const nm = ((store.active && store.active.name) || 'Me').slice(0, 6); c.fillStyle = '#5a3f5e'; c.font = `800 ${Math.min(r * .5, r * 2.4 / nm.length)}px Fredoka, system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, -r * .2, -r * .4); }
        const hs = { learn: 'B', find: 'ILY', letters: 'A', name: 'L' }[b.id], h = S.placeHand(S.built(hs), [0, 1, 0], [0, 0, 1], [0, 0, 0], 'palm', false), kk = r * .42;
        c.save(); c.translate(r * .42, r * .18 + Math.sin(t * 2 + b.x) * r * .03); S.drawHand(c, h, q => [q[0] * kk, -(q[1] - .55) * kk, q[2]], kk); c.restore();
        c.restore();
      }
    }
    probe() {
      return { screen: this.screen, w: this.w, h: this.h, tier: this.tier(), busy: this.hands.busy, signs: this.signIds, round: this.round ? { ans: this.round.ans, wrong: this.round.wrong, glow: this.round.glow, done: this.round.done } : null, right: this.bag.right,
        stage: this.stage, back: this.back, btns: this.btns.map(b => ({ id: b.id, kind: b.kind, x: b.x, y: b.y, r: b.r, ready: b.pop >= .6, dim: b.dim })), tabs: (this.tabs || []).map(t => ({ x: t.x, y: t.y, r: t.r })), word: this.word };
    }
  }

  SPG.games.push({
    id: 'signs', name: 'Sign Along', order: 18, fresh: true,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e9f3ff'); g.addColorStop(1, '#fde3f0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const s = Math.min(w, h); art.heart(c, w * .78, h * .22, s * .1, '#ff7a9a'); art.heart(c, w * .2, h * .3, s * .06, '#ff9db8');
      const hh = S.placeHand(S.built('ILY'), [0, 1, 0], [0, 0, 1], [0, 0, 0], 'palm', false), k = s * .36;
      c.save(); c.translate(w * .5, h * .62); S.drawHand(c, hh, q => [q[0] * k, -(q[1] - .45) * k, q[2]], k); c.restore();
    },
    create: host => new SignGame(host)
  });
})();
