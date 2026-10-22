// Fish Tank: a cozy aquarium. Touch the water to drop fish food; hungry fish swim to it and eat, grow from small to big,
// and big fish make shiny coins. Touch the coins to collect them, then spend them in the shop on new fish, better food,
// a helper snail, bubble power and things to decorate the tank. Every so often a grumpy (but cute) visitor swims in:
// tap it to tickle it with bubbles (the big fish help) until it giggles, hands out coins and a star, and swims away happy.
// Nothing is ever lost: fish never get sick or die, hungry fish just rest, and visitors never hurt anyone.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u * u * (3 - 2 * u);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rr = art.rr;

  const SPECIES = {
    guppy: { body: '#ff9d4d', fin: '#ffc48a', mult: 1, size: 1.0, price: 10 },
    clown: { body: '#ff7a3d', fin: '#ff9d6b', mult: 2, size: 1.05, price: 25 },
    angel: { body: '#ffe27a', fin: '#9fd0f5', mult: 3, size: 1.1, price: 50 },
    puffer: { body: '#ffd54a', fin: '#ffb347', mult: 4, size: 1.05, price: 90 }
  };
  const STAGE = [.72, 1, 1.36];      // small, medium, big
  const NEED = [4, 6];               // meals to grow up (small -> medium, medium -> big)
  const MAX_FISH = 10;
  const FOOD_MAX = [2, 3, 5, 8];     // pellets in the water at once, by "more food" level
  const FOOD_COL = ['#c98b5b', '#ff9d3d', '#ff7a93', '#ffd54a'];   // pellet color by "better food" level
  const HUNGRY_AFTER = 16;           // seconds without a meal before a fish rests and makes no coins
  const SHOP = [
    { id: 'guppy', kind: 'fish' }, { id: 'clown', kind: 'fish' }, { id: 'angel', kind: 'fish' }, { id: 'puffer', kind: 'fish' },
    { id: 'food', kind: 'up', prices: [15, 40, 100] }, { id: 'more', kind: 'up', prices: [10, 30, 80] }, { id: 'snail', kind: 'up', prices: [50, 120] }, { id: 'power', kind: 'up', prices: [25, 60] },
    { id: 'castle', kind: 'decor', price: 30 }, { id: 'chest', kind: 'decor', price: 25 }, { id: 'weed', kind: 'decor', price: 15 }, { id: 'shell', kind: 'decor', price: 20 }
  ];
  const BOSSES = ['crab', 'octopus', 'ufo', 'shark'];
  const FRESH_BONUS = 20;            // coins given with each new day's fresh tank (enough for two guppies)
  const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

  /* ------------------------------------------------------------ art */
  const eye = (c, x, y, r, look = 0, mood = 'happy') => {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (mood === 'happy-closed') { c.strokeStyle = '#3a2a30'; c.lineWidth = r * .35; c.lineCap = 'round'; c.beginPath(); c.arc(x, y + r * .25, r * .6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return; }
    c.fillStyle = '#3a2a30'; c.beginPath(); c.arc(x + look * r * .3, y, r * .58, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x + look * r * .3 - r * .2, y - r * .22, r * .2, 0, TAU); c.fill();
  };

  // A fish facing right with its center at (0, 0). s = body length / 1.
  function drawFish(c, id, s, t, o = {}) {
    const sp = SPECIES[id], w = Math.sin(t * 8 + (o.ph || 0)) * (o.hungry ? .05 : .16);
    c.save(); c.lineJoin = c.lineCap = 'round';
    const mouth = o.eat > 0 ? .5 + Math.sin(t * 30) * .3 : 0;
    if (id === 'puffer') {
      const r = s * (.52 + (o.puff || 0) * .12);
      c.fillStyle = sp.fin; c.save(); c.translate(-r * .95, 0); c.rotate(w); c.beginPath(); c.moveTo(0, 0); c.lineTo(-s * .4, -s * .3); c.lineTo(-s * .4, s * .3); c.closePath(); c.fill(); c.restore();
      c.fillStyle = sp.body; for (let i = 0; i < 9; i++) { const a = -Math.PI * .9 + i * .42; if (Math.abs(a) > 2.2) continue; c.save(); c.rotate(a); c.beginPath(); c.moveTo(r * .86, -s * .06); c.lineTo(r * (1.16 + (o.puff || 0) * .2), 0); c.lineTo(r * .86, s * .06); c.closePath(); c.fill(); c.restore(); }
      c.fillStyle = sp.body; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.fillStyle = '#fff3c4'; c.beginPath(); c.ellipse(r * .1, r * .4, r * .78, r * .5, 0, 0, Math.PI); c.fill();
      c.fillStyle = sp.fin; c.save(); c.translate(-r * .1, r * .1); c.rotate(w * 2); c.beginPath(); c.ellipse(0, 0, s * .2, s * .1, .5, 0, TAU); c.fill(); c.restore();
      eye(c, r * .42, -r * .18, s * .17, 1); c.fillStyle = '#f08a6a'; c.beginPath(); c.ellipse(r * .55, r * .22, s * .09, s * (.05 + mouth * .05), 0, 0, TAU); c.fill();
    } else if (id === 'angel') {
      c.fillStyle = sp.fin; c.beginPath(); c.moveTo(-s * .05, -s * .3); c.quadraticCurveTo(-s * .3, -s * 1.15, s * .15, -s * .95 + w * s * .1); c.quadraticCurveTo(s * .2, -s * .6, s * .25, -s * .3); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-s * .05, s * .3); c.quadraticCurveTo(-s * .3, s * 1.15, s * .15, s * .95 + w * s * .1); c.quadraticCurveTo(s * .2, s * .6, s * .25, s * .3); c.closePath(); c.fill();
      c.save(); c.translate(-s * .42, 0); c.rotate(w); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-s * .4, -s * .3, -s * .55, -s * .42); c.lineTo(-s * .4, 0); c.lineTo(-s * .55, s * .42); c.quadraticCurveTo(-s * .4, s * .3, 0, 0); c.fill(); c.restore();
      c.fillStyle = sp.body; c.beginPath(); c.ellipse(0, 0, s * .52, s * .44, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(0, 0, s * .52, s * .44, 0, 0, TAU); c.clip(); c.fillStyle = '#6fa8e8'; for (const x of [-.25, .02]) { c.save(); c.translate(x * s, 0); c.rotate(.15); c.fillRect(-s * .05, -s, s * .1, s * 2); c.restore(); } c.restore();
      eye(c, s * .28, -s * .08, s * .13, 1); c.fillStyle = '#e8735a'; c.beginPath(); c.ellipse(s * .5, s * .06, s * .05, s * (.03 + mouth * .05), 0, 0, TAU); c.fill();
    } else {
      // guppy and clownfish: a plump teardrop with a fan tail
      c.fillStyle = sp.fin; c.save(); c.translate(-s * .48, 0); c.rotate(w); c.beginPath(); c.moveTo(s * .1, 0); c.bezierCurveTo(-s * .2, -s * .5, -s * .55, -s * .5, -s * .6, -s * .28); c.quadraticCurveTo(-s * .4, 0, -s * .6, s * .28); c.bezierCurveTo(-s * .55, s * .5, -s * .2, s * .5, s * .1, 0); c.fill(); c.restore();
      c.beginPath(); c.moveTo(-s * .15, -s * .32); c.quadraticCurveTo(0, -s * .72 + w * s * .1, s * .2, -s * .32); c.fill();
      c.fillStyle = sp.body; c.beginPath(); c.ellipse(0, 0, s * .58, s * .4, 0, 0, TAU); c.fill();
      if (id === 'clown') { c.save(); c.beginPath(); c.ellipse(0, 0, s * .58, s * .4, 0, 0, TAU); c.clip(); for (const x of [-.3, .1, .4]) { c.fillStyle = '#fff'; c.fillRect(x * s - s * .07, -s, s * .14, s * 2); c.fillStyle = 'rgba(60,40,40,.35)'; c.fillRect(x * s - s * .09, -s, s * .02, s * 2); c.fillRect(x * s + s * .07, -s, s * .02, s * 2); } c.restore(); }
      else { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-s * .1, -s * .12, s * .26, s * .1, -.15, 0, TAU); c.fill(); }
      c.fillStyle = sp.fin; c.save(); c.translate(-s * .05, s * .08); c.rotate(w * 2); c.beginPath(); c.ellipse(0, 0, s * .2, s * .09, .5, 0, TAU); c.fill(); c.restore();
      eye(c, s * .3, -s * .07, s * .15, 1); c.fillStyle = '#e8735a'; c.beginPath(); c.ellipse(s * .54, s * .08, s * .05, s * (.03 + mouth * .05), 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,120,150,.4)'; c.beginPath(); c.arc(s * .3, s * .12, s * .07, 0, TAU); c.fill();
    }
    c.restore();
  }

  const face = (c, x, y, S, mood, look = 0, noEyes = false) => {
    const r = S * .13;
    if (!noEyes) {
      if (mood === 'happy') { eye(c, x - S * .22, y, r, look, 'happy-closed'); eye(c, x + S * .22, y, r, look, 'happy-closed'); }
      else { eye(c, x - S * .22, y, r, look); eye(c, x + S * .22, y, r, look); c.strokeStyle = '#3a2a30'; c.lineWidth = S * .05; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * S * .36, y - r * 1.5 + s * 0); c.lineTo(x + s * S * .1, y - r * 1.05 - S * .02); c.stroke(); } }
    } else { c.fillStyle = 'rgba(90,40,40,.55)'; c.beginPath(); c.ellipse(x, y + S * .02, S * .06, S * .045, 0, 0, TAU); c.fill(); }   // just a little nose
    c.strokeStyle = '#3a2a30'; c.lineWidth = S * .05; c.lineCap = 'round'; c.beginPath();
    const my = noEyes ? y + S * .08 : y;
    if (mood === 'happy') { c.arc(x, my + S * .12, S * .14, .15, Math.PI - .15); } else { c.moveTo(x - S * .14, my + S * .24); c.quadraticCurveTo(x, my + S * .14, x + S * .14, my + S * .24); }
    c.stroke();
    if (mood === 'happy') { c.fillStyle = 'rgba(255,120,150,.45)'; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * S * .36, my + S * .12, S * .07, 0, TAU); c.fill(); } }
  };

  // The visitors. Each is drawn with its center on (0, 0); S is about half its width.
  const BOSS_ART = {
    crab(c, S, t, mood, hit) {
      const walk = Math.sin(t * 7) * S * .05;
      c.fillStyle = '#e0574a'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { c.strokeStyle = '#c0392b'; c.lineWidth = S * .09; c.beginPath(); c.moveTo(s * S * .5, S * (.1 + i * .12)); c.lineTo(s * S * (.85 + i * .05), S * (.4 + i * .1) + (i % 2 ? walk : -walk)); c.stroke(); }
      const up = mood === 'happy' ? -S * .5 : Math.sin(t * 4) * S * .15;
      for (const s of [-1, 1]) { c.strokeStyle = '#e0574a'; c.lineWidth = S * .14; c.beginPath(); c.moveTo(s * S * .5, -S * .05); c.lineTo(s * S * .85, -S * .45 + up * s); c.stroke(); c.fillStyle = '#e0574a'; c.save(); c.translate(s * S * .9, -S * .6 + up * s); c.beginPath(); c.arc(0, 0, S * .28, 0, TAU); c.fill(); c.fillStyle = '#fff3'; c.beginPath(); c.moveTo(0, 0); c.lineTo(s * S * .25, -S * .25); c.lineTo(s * S * .03, -S * .3); c.closePath(); c.fill(); c.restore(); }
      c.fillStyle = '#e0574a'; c.beginPath(); c.ellipse(0, 0, S * .7, S * .5, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-S * .2, -S * .22, S * .3, S * .1, -.3, 0, TAU); c.fill();
      for (const s of [-1, 1]) { c.strokeStyle = '#c0392b'; c.lineWidth = S * .06; c.beginPath(); c.moveTo(s * S * .22, -S * .4); c.lineTo(s * S * .24, -S * .65); c.stroke(); eye(c, s * S * .24, -S * .7, S * .13, 0, mood === 'happy' ? 'happy-closed' : 'x'); }
      face(c, 0, S * .05, S * .8, mood, 0, true);   // no eyes on the body: the crab's eyes are the two on stalks above
    },
    octopus(c, S, t, mood, hit) {
      c.fillStyle = '#9a7ae0'; c.strokeStyle = '#9a7ae0'; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const x = (i - 2.5) * S * .3; c.lineWidth = S * .2; c.beginPath(); c.moveTo(x, S * .4); c.bezierCurveTo(x + Math.sin(t * 3 + i) * S * .3, S * .8, x - Math.sin(t * 3 + i * 2) * S * .3, S * 1.1, x + Math.sin(t * 2 + i) * S * .35, S * 1.45); c.stroke(); }
      c.beginPath(); c.moveTo(-S * .8, S * .35); c.bezierCurveTo(-S * .95, -S * 1.2, S * .95, -S * 1.2, S * .8, S * .35); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-S * .3, -S * .55, S * .22, S * .1, -.5, 0, TAU); c.fill();
      c.fillStyle = 'rgba(214,74,120,.35)'; for (const [x, y, r] of [[.45, -.45, .1], [.2, -.7, .08], [-.5, -.15, .07]]) { c.beginPath(); c.arc(x * S, y * S, r * S, 0, TAU); c.fill(); }
      face(c, 0, -S * .15, S, mood);
    },
    ufo(c, S, t, mood, hit) {
      const beam = Math.max(0, Math.sin(t * .9)) ;
      if (beam > .2 && mood !== 'happy') { c.fillStyle = `rgba(200,255,200,${(beam * .22).toFixed(3)})`; c.beginPath(); c.moveTo(-S * .35, S * .3); c.lineTo(S * .35, S * .3); c.lineTo(S * .9, S * 2.6); c.lineTo(-S * .9, S * 2.6); c.closePath(); c.fill(); }
      c.fillStyle = 'rgba(160,230,255,.85)'; c.beginPath(); c.arc(0, -S * .05, S * .5, Math.PI, 0); c.fill();
      c.fillStyle = '#8fe070'; c.beginPath(); c.ellipse(0, -S * .2, S * .28, S * .3, 0, 0, TAU); c.fill();
      for (const s of [-1, 1]) { c.strokeStyle = '#8fe070'; c.lineWidth = S * .04; c.beginPath(); c.moveTo(s * S * .12, -S * .45); c.lineTo(s * S * .2, -S * .7); c.stroke(); c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(s * S * .2, -S * .72, S * .06, 0, TAU); c.fill(); }
      face(c, 0, -S * .2, S * .55, mood);
      c.fillStyle = '#b9c4d4'; c.beginPath(); c.ellipse(0, S * .08, S * 1.0, S * .3, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-S * .3, S * 0, S * .4, S * .07, -.1, 0, TAU); c.fill();
      ['#ff6b81', '#ffd54a', '#7ed957', '#5cc8f2', '#b58cf0'].forEach((k, i) => { c.fillStyle = k; c.beginPath(); c.arc((i - 2) * S * .34, S * .1 + Math.abs(i - 2) * S * .03, S * .07, 0, TAU); c.fill(); });
    },
    shark(c, S, t, mood, hit) {
      const w = Math.sin(t * 4) * .1;
      c.fillStyle = '#7d94b8'; c.save(); c.translate(-S * .85, 0); c.rotate(w); c.beginPath(); c.moveTo(S * .2, 0); c.lineTo(-S * .35, -S * .55); c.lineTo(-S * .15, 0); c.lineTo(-S * .35, S * .5); c.closePath(); c.fill(); c.restore();
      c.beginPath(); c.moveTo(-S * .2, -S * .4); c.lineTo(S * .05, -S * 1.05); c.lineTo(S * .3, -S * .4); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(0, 0, S * .95, S * .55, 0, 0, TAU); c.fill();
      c.fillStyle = '#e8eef8'; c.beginPath(); c.ellipse(S * .1, S * .22, S * .8, S * .32, 0, 0, Math.PI); c.fill();
      c.fillStyle = '#7d94b8'; c.save(); c.translate(-S * .05, S * .25); c.rotate(.5 + w); c.beginPath(); c.ellipse(0, 0, S * .28, S * .1, 0, 0, TAU); c.fill(); c.restore();
      const m = mood === 'happy';
      eye(c, S * .45, -S * .15, S * .14, 1, m ? 'happy-closed' : 'happy');
      if (!m) { c.strokeStyle = '#3a2a30'; c.lineWidth = S * .05; c.lineCap = 'round'; c.beginPath(); c.moveTo(S * .3, -S * .42); c.lineTo(S * .62, -S * .3); c.stroke(); }
      c.strokeStyle = '#3a2a30'; c.lineWidth = S * .05; c.lineCap = 'round'; c.beginPath(); if (m) c.arc(S * .55, S * .12, S * .2, .2, 2.3); else { c.moveTo(S * .3, S * .22); c.quadraticCurveTo(S * .55, S * .12, S * .8, S * .22); } c.stroke();
      c.fillStyle = '#fff'; for (const x of [.45, .6, .75]) { c.beginPath(); c.moveTo(S * x, S * .17); c.lineTo(S * (x + .05), S * .3); c.lineTo(S * (x - .05), S * .3); c.closePath(); c.fill(); }
      if (m) { c.fillStyle = 'rgba(255,120,150,.45)'; c.beginPath(); c.arc(S * .35, S * .05, S * .09, 0, TAU); c.fill(); }
    }
  };
  const DECOR_ART = {
    classic(c, u) { c.fillStyle = '#c9c2e0'; c.fillRect(-u * 1.1, -u * 1.0, u * 2.2, u * 1.0); for (const x of [-1.1, .75]) { c.fillStyle = '#b8b0d6'; c.fillRect(x * u, -u * 1.7, u * .35, u * 1.7); c.fillStyle = '#e0574a'; c.beginPath(); c.moveTo((x - .08) * u, -u * 1.7); c.lineTo((x + .43) * u, -u * 1.7); c.lineTo((x + .175) * u, -u * 2.2); c.closePath(); c.fill(); } c.fillStyle = '#c9c2e0'; c.fillRect(-u * .5, -u * 1.5, u, u * 1.5); for (const x of [-.5, -.17, .17]) c.fillRect(x * u, -u * 1.7, u * .33, u * .2); c.fillStyle = '#6f4a30'; c.beginPath(); c.arc(0, -u * .35, u * .3, Math.PI, 0); c.lineTo(u * .3, 0); c.lineTo(-u * .3, 0); c.closePath(); c.fill(); c.fillStyle = '#7fd4f5'; for (const x of [-.85, .95]) c.fillRect(x * u - u * .05, -u * 1.25, u * .14, u * .22); },
    // a fairy princess castle: pink and lilac, round towers with twinkling cone roofs, hearts and a golden star
    fairy(c, u, t) {
      const tw = (x, w, h, col) => { c.fillStyle = col; c.fillRect(x * u, -h * u, w * u, h * u); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x * u + w * u * .12, -h * u, w * u * .14, h * u); };
      c.fillStyle = '#ffd6ea'; c.fillRect(-u * 1.0, -u * 1.0, u * 2.0, u * 1.0);
      tw(-1.15, .5, 1.9, '#f4b6da'); tw(.65, .5, 1.9, '#f4b6da'); tw(-.25, .5, 2.3, '#e8a6d6');
      for (const [x, w, h, col] of [[-1.15, .5, 1.9, '#b58cf0'], [.65, .5, 1.9, '#b58cf0'], [-.25, .5, 2.3, '#9a7be8']]) { c.fillStyle = col; c.beginPath(); c.moveTo((x - .1) * u, -(h) * u); c.lineTo((x + w + .1) * u, -h * u); c.lineTo((x + w / 2) * u, -(h + .8) * u); c.closePath(); c.fill(); }
      art.star(c, 0, -u * 3.3, u * .22, '#ffd54a', t); art.heart(c, -u * .9, -u * 2.85, u * .14, '#ff7aa8'); art.heart(c, u * .9, -u * 2.85, u * .14, '#ff7aa8');
      c.fillStyle = '#fff0f7'; c.beginPath(); c.arc(0, -u * .45, u * .32, Math.PI, 0); c.lineTo(u * .32, 0); c.lineTo(-u * .32, 0); c.closePath(); c.fill(); c.fillStyle = '#ff9ec8'; c.beginPath(); c.arc(0, -u * .45, u * .2, Math.PI, 0); c.lineTo(u * .2, 0); c.lineTo(-u * .2, 0); c.closePath(); c.fill();
      c.fillStyle = '#fff3a0'; for (const [x, y] of [[-.85, -1.4], [.9, -1.4], [-.05, -1.85]]) { c.beginPath(); c.arc(x * u, y * u, u * .1, 0, TAU); c.fill(); }
      for (let i = 0; i < 4; i++) { const k = (t * .8 + i / 4) % 1; c.globalAlpha = Math.sin(k * Math.PI); art.star(c, u * (-1.1 + i * .75), -u * (1.2 + k * 2), u * .09, '#fff', 0); } c.globalAlpha = 1;
    },
    // a castle with a friendly (toy) dragon wrapped around the top
    dragon(c, u, t) {
      c.fillStyle = '#b9b5a8'; c.fillRect(-u * 1.1, -u * 1.0, u * 2.2, u * 1.0); for (const x of [-1.1, .75]) { c.fillStyle = '#a8a496'; c.fillRect(x * u, -u * 1.7, u * .35, u * 1.7); for (const k of [0, .16]) c.fillRect((x + k) * u, -u * 1.85, u * .12, u * .15); }
      c.fillStyle = '#b9b5a8'; c.fillRect(-u * .5, -u * 1.5, u, u * 1.5); for (const x of [-.5, -.17, .17]) c.fillRect(x * u, -u * 1.7, u * .33, u * .2);
      c.fillStyle = '#6f4a30'; c.beginPath(); c.arc(0, -u * .35, u * .3, Math.PI, 0); c.lineTo(u * .3, 0); c.lineTo(-u * .3, 0); c.closePath(); c.fill();
      // the dragon: a long green body looping over the roofs, a smiling head on the right, a tail on the left
      const w = Math.sin(t * 2) * u * .05;
      c.strokeStyle = '#62c26a'; c.lineWidth = u * .42; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-u * 1.3, -u * 1.0); c.bezierCurveTo(-u * 1.2, -u * 2.1, -u * .5, -u * 2.0, -u * .1, -u * 2.0 + w); c.bezierCurveTo(u * .5, -u * 2.0, u * .6, -u * 2.7, u * 1.0, -u * 2.6); c.stroke();
      c.strokeStyle = '#8be08f'; c.lineWidth = u * .16; c.beginPath(); c.moveTo(-u * 1.2, -u * 1.7); c.bezierCurveTo(-u * 1.0, -u * 2.1, -u * .5, -u * 2.05, -u * .1, -u * 2.05 + w); c.stroke();
      c.fillStyle = '#ffd54a'; for (const [x, y] of [[-.9, -2.0], [-.5, -2.15], [-.1, -2.2], [.35, -2.2]]) { c.beginPath(); c.moveTo((x - .1) * u, (y + .12) * u); c.lineTo(x * u, (y - .15) * u); c.lineTo((x + .1) * u, (y + .12) * u); c.closePath(); c.fill(); }
      c.save(); c.translate(u * 1.15, -u * 2.65); c.fillStyle = '#62c26a'; c.beginPath(); c.ellipse(0, 0, u * .42, u * .32, 0, 0, TAU); c.fill(); c.fillStyle = '#8be08f'; c.beginPath(); c.ellipse(u * .15, u * .1, u * .3, u * .18, 0, 0, TAU); c.fill();
      c.fillStyle = '#3a2a30'; c.beginPath(); c.arc(-u * .02, -u * .1, u * .06, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-u * .0, -u * .12, u * .02, 0, TAU); c.fill();
      c.strokeStyle = '#3a2a30'; c.lineWidth = u * .035; c.beginPath(); c.arc(u * .15, u * .08, u * .1, .2, 2.9); c.stroke();
      c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(-u * .2, -u * .25); c.lineTo(-u * .12, -u * .5); c.lineTo(-u * .03, -u * .27); c.fill(); c.beginPath(); c.moveTo(u * .05, -u * .27); c.lineTo(u * .14, -u * .5); c.lineTo(u * .22, -u * .25); c.fill();
      c.globalAlpha = .8; c.fillStyle = '#ffb347'; c.beginPath(); c.arc(u * .52 + w, u * .02, u * .06 + Math.abs(Math.sin(t * 3)) * u * .04, 0, TAU); c.fill(); c.globalAlpha = 1; c.restore();
      c.fillStyle = '#e0574a'; c.fillRect(u * .75, -u * 1.7, u * .05, -u * .45); c.beginPath(); c.moveTo(u * .8, -u * 2.15); c.lineTo(u * 1.15, -u * 2.0); c.lineTo(u * .8, -u * 1.85); c.fill();
    },
    castle(c, u, t, v = 0) { (v === 1 ? this.fairy : v === 2 ? this.dragon : this.classic).call(this, c, u, t); },
    chest(c, u) { c.fillStyle = '#b9805a'; rr(c, -u * .8, -u * .7, u * 1.6, u * .7, u * .1); c.fill(); c.fillStyle = '#d99a6a'; c.beginPath(); c.ellipse(0, -u * .7, u * .8, u * .35, 0, Math.PI, TAU); c.fill(); c.fillStyle = '#ffd54a'; c.fillRect(-u * .07, -u * .75, u * .14, u * .35); for (const [x, y] of [[-.4, -.95], [0, -1.05], [.3, -.92]]) { c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(x * u, y * u, u * .12, 0, TAU); c.fill(); } },
    weed(c, u, t) { c.lineCap = 'round'; for (const [x, h, col] of [[-.4, 1.7, '#3fa35a'], [0, 2.2, '#4fb56b'], [.4, 1.5, '#3fa35a']]) { c.strokeStyle = col; c.lineWidth = u * .28; c.beginPath(); c.moveTo(x * u, 0); c.bezierCurveTo(x * u + Math.sin(t + x * 5) * u * .4, -h * u * .35, x * u - Math.sin(t + x * 5) * u * .4, -h * u * .7, x * u + Math.sin(t * 1.2 + x) * u * .3, -h * u); c.stroke(); } },
    shell(c, u) { c.fillStyle = '#ffc4d6'; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-u * 1.1, -u * .2, -u * .9, -u * 1.4, 0, -u * 1.5); c.bezierCurveTo(u * .9, -u * 1.4, u * 1.1, -u * .2, 0, 0); c.fill(); c.strokeStyle = '#ff9fb8'; c.lineWidth = u * .07; for (const x of [-.55, -.27, 0, .27, .55]) { c.beginPath(); c.moveTo(0, -u * .05); c.lineTo(x * u * 1.4, -u * 1.35); c.stroke(); } c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -u * .55, u * .2, 0, TAU); c.fill(); }
  };

  function drawSnail(c, S, t, dir, moving) {
    c.save(); c.scale(dir, 1);
    const stretch = moving ? 1 + Math.sin(t * 6) * .06 : 1;
    c.fillStyle = '#e8c08a'; c.beginPath(); c.ellipse(0, -S * .12, S * .62 * stretch, S * .16, 0, 0, TAU); c.fill();
    c.fillStyle = '#e8c08a'; c.beginPath(); c.ellipse(S * .5, -S * .3, S * .14, S * .2, .3, 0, TAU); c.fill();
    c.strokeStyle = '#e8c08a'; c.lineWidth = S * .05; c.lineCap = 'round'; for (const a of [0, .3]) { c.beginPath(); c.moveTo(S * (.5 + a * .1), -S * .44); c.lineTo(S * (.56 + a * .4), -S * .7); c.stroke(); c.fillStyle = '#3a2a30'; c.beginPath(); c.arc(S * (.56 + a * .4), -S * .72, S * .05, 0, TAU); c.fill(); }
    c.fillStyle = '#b58cf0'; c.beginPath(); c.arc(-S * .05, -S * .45, S * .42, 0, TAU); c.fill(); c.strokeStyle = '#8a66cf'; c.lineWidth = S * .06; c.beginPath(); c.arc(-S * .05, -S * .45, S * .25, 0, TAU); c.stroke(); c.beginPath(); c.arc(-S * .05, -S * .45, S * .1, 0, TAU); c.stroke();
    c.restore();
  }
  const coinDraw = (c, r, v, t) => {
    const pearl = v >= 10, gold = v >= 3;
    if (pearl) { c.fillStyle = '#e8f4ff'; c.beginPath(); c.arc(0, 0, r * 1.05, 0, TAU); c.fill(); c.fillStyle = 'rgba(180,140,255,.35)'; c.beginPath(); c.arc(r * .2, r * .2, r * .7, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * .3, -r * .3, r * .28, 0, TAU); c.fill(); return; }
    const sq = .75 + Math.abs(Math.cos(t * 3)) * .25;
    c.save(); c.scale(sq, 1);
    c.fillStyle = gold ? '#ffb300' : '#c9d2de'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = gold ? '#ffd54a' : '#e8eef6'; c.beginPath(); c.arc(0, 0, r * .78, 0, TAU); c.fill();
    art.star(c, 0, 0, r * .5, gold ? '#ffb300' : '#b3bcc9', 0);
    c.restore();
  };
  const pellet = (c, r, q) => { c.fillStyle = FOOD_COL[q]; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(-r * .3, -r * .3, r * .3, 0, TAU); c.fill(); if (q >= 2) art.star(c, 0, 0, r * .55, '#fff', 0); };

  // the little pictures on the shop buttons
  function shopIcon(c, id, r, t) {
    if (SPECIES[id]) { c.save(); c.scale(1, 1); drawFish(c, id, r * 1.0, t, {}); c.restore(); return; }
    switch (id) {
      case 'food': for (const [x, y, q] of [[-.4, .3, 1], [.15, -.3, 2], [.45, .35, 3]]) { c.save(); c.translate(x * r, y * r); pellet(c, r * .3, q); c.restore(); } c.fillStyle = '#e8735a'; rr(c, -r * .3, -r * .95, r * .6, r * .4, r * .08); c.fill(); break;
      case 'more': for (const [x, y] of [[-.5, -.2], [0, .3], [.5, -.3], [-.05, -.55]]) { c.save(); c.translate(x * r, y * r); pellet(c, r * .26, 1); c.restore(); } c.fillStyle = '#2e9d5a'; c.beginPath(); c.arc(r * .55, r * .55, r * .26, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.fillRect(r * .42, r * .52, r * .26, r * .07); c.fillRect(r * .505, r * .44, r * .07, r * .26); break;
      case 'snail': drawSnail(c, r * 1.3, t, 1, false); c.translate(0, r * .55); break;
      case 'power': c.fillStyle = 'rgba(255,255,255,.85)'; c.strokeStyle = '#6fbfe8'; c.lineWidth = r * .09; for (const [x, y, q] of [[-.3, .2, .5], [.35, -.25, .38], [.3, .5, .25]]) { c.beginPath(); c.arc(x * r, y * r, q * r, 0, TAU); c.fill(); c.stroke(); } art.star(c, -r * .3, .2 * r, r * .25, '#ffd54a', 0); break;
      case 'castle': c.save(); c.translate(0, r * .6); DECOR_ART.castle(c, r * .36, t); c.restore(); break;
      case 'chest': c.save(); c.translate(0, r * .5); DECOR_ART.chest(c, r * .7, t); c.restore(); break;
      case 'weed': c.save(); c.translate(0, r * .7); DECOR_ART.weed(c, r * .55, t); c.restore(); break;
      case 'shell': c.save(); c.translate(0, r * .6); DECOR_ART.shell(c, r * .62, t); c.restore(); break;
      default: break;
    }
  }

  /* ------------------------------------------------------------ the game */
  class TankGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      const b = this.bag = store.bag('aquarium', () => ({ coins: 0, fish: [{ sp: 'guppy', stage: 0, meals: 0 }, { sp: 'guppy', stage: 0, meals: 0 }], food: 0, more: 0, snail: 0, power: 0, decor: [], defeated: 0, since: 0, seen: 0 }));
      b.fish = b.fish || []; b.decor = b.decor || []; b.coins = b.coins || 0; b.defeated = b.defeated || 0; b.since = b.since || 0; b.seen = b.seen || 0;
      for (const k of ['food', 'more', 'snail', 'power']) b[k] = b[k] || 0;
      // A new day is a fresh tank: two baby guppies, no upgrades (decorations stay), the coins she had plus a small welcome gift.
      const today = dayKey();
      this.fresh = !!(b.day && b.day !== today);
      if (this.fresh) { b.fish = [{ sp: 'guppy', stage: 0, meals: 0 }, { sp: 'guppy', stage: 0, meals: 0 }]; for (const k of ['food', 'more', 'snail', 'power']) b[k] = 0; b.coins += FRESH_BONUS; b.since = 0; }
      if (b.day !== today) { b.day = today; store.save(); }
      this.counter = SPG.ui.counter(host, (c, s) => { c.translate(s / 2, s / 2); coinDraw(c, s * .3, 1, 0); }, b.coins);
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.idle = 0; this.tick = this.tick.bind(this);
      this.fish = b.fish.map((f, i) => this.makeFish(f, i)); this.foods = []; this.coins = (b.loose || []).map(q => ({ fx: q.fx, v: q.v, vy: 0, rest: false, t: Math.random() * 6 })); this.bubbles = []; this.snails = []; this.shots = [];
      this.boss = null; this.shop = 0; this.shopAnim = 0; this.wobble = 0; this.noFund = 0; this.tip = 0;
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); SPG.audio.unlock(); const p = at(e); this.press(p.x, p.y); });
    }
    makeFish(f, i) { return { f, sp: f.sp, x: 0, y: 0, vx: rnd(-1, 1), vy: 0, dir: 1, tx: 0, ty: 0, wt: 0, ph: Math.random() * 6, eat: 0, hunger: rnd(2, 9), coinT: rnd(0, 4), cool: 0, puff: 0, placed: false, id: i }; }

    /* ---------------------------------------------------------------- layout */
    resize() {
      const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
      const ow = this.w, oh = this.h; this.w = r.width; this.h = r.height; const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      // coins and food are in pixels: after the phone turns they keep their place across the tank and coins settle on the new sand
      for (const c of this.coins) { if (c.fx != null) { c.x = c.fx * this.w; c.y = this.h * .3; delete c.fx; } else if (ow) { c.x *= this.w / ow; c.y = Math.min(c.y * this.h / oh, this.h * .8); } c.rest = false; c.vy = 0; }
      if (ow) for (const f of this.foods) { f.x *= this.w / ow; f.y *= this.h / oh; }
      this.bs = 38 * this.ui + 20;
      this.top = this.h * .07; this.floorY = this.h - this.bs * 1.65;
      this.S = Math.min(this.w, this.h * 1.25) * .085;        // a fish unit
      this.shopBtn = { x: this.w / 2, y: this.h - this.bs * .85, r: this.bs * .8 };
      this.coinTarget = { x: this.w * .78, y: 34 };
      // shop layout: 4 columns x 3 rows
      const pw = Math.min(this.w * .96, this.h * 1.5), ph = Math.min(this.h - this.bs * 2.6, pw * .75);
      this.panel = { x: (this.w - pw) / 2, y: this.h - this.bs * 1.9 - ph, w: pw, h: ph };
      const cw = pw / 4, chh = ph / 3; this.cells = SHOP.map((it, i) => ({ it, x: this.panel.x + (i % 4) * cw + cw / 2, y: this.panel.y + Math.floor(i / 4) * chh + chh / 2, w: cw * .9, h: chh * .9 }));
      for (const f of this.fish) if (!f.placed) { f.x = rnd(this.w * .15, this.w * .85); f.y = rnd(this.top + this.S * 2, this.floorY - this.S * 2); f.placed = true; f.tx = f.x; f.ty = f.y; }
      this.snailSync(); this.draw();
    }
    decorSpots() {   // where bought decorations sit on the sand (fixed, so nothing ever overlaps)
      const w = this.w; return { castle: { x: w * .8, s: this.S * 1.05 }, chest: { x: w * .28, s: this.S * .75 }, weed: { x: w * .09, s: this.S * .75 }, shell: { x: w * .58, s: this.S * .55 } };
    }
    snailSync() {
      while (this.snails.length < this.bag.snail) this.snails.push({ x: this.w * rnd(.2, .8), dir: 1, tx: null, moving: false });
    }
    start() {
      this.resize(); this.resume();
      if (this.fresh) { voice.say('aq-fresh'); sfx.chime(); const k = this.coinTarget; this.fx.burst(k.x, k.y + 20, 24, { colors: ['#ffd54a', '#fff', '#ffe9a0'], speed: 240, g: 160, life: 1.2, size: 8 * this.ui, shape: 'star', up: 80 }); this.counter.set(this.bag.coins); }
      else voice.say('aq-start');
    }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.save(); }
    destroy() { this.pause(); this.canvas.remove(); this.counter.el.remove(); }
    // coins she has not picked up yet wait on the sand for next time (where along the sand, and how much each is worth)
    save() { if (this.w) this.bag.loose = this.coins.slice(-30).map(c => ({ fx: +(c.x / this.w).toFixed(3), v: c.v })); store.save(); }
    setCoins(n) { this.bag.coins = n; this.counter.set(n); }

    /* ---------------------------------------------------------------- input */
    press(x, y) {
      this.idle = 0; const B = this.bag;
      // the shop button
      if (Math.hypot(x - this.shopBtn.x, y - this.shopBtn.y) < this.shopBtn.r * 1.15) { this.shop = this.shop ? 0 : 1; sfx.pop(); if (this.shop) voice.say('aq-shop'); return; }
      if (this.shop) {
        const pn = this.panel;
        for (const k of this.cells) if (Math.abs(x - k.x) < k.w / 2 && Math.abs(y - k.y) < k.h / 2) { this.tapShop(k); return; }
        if (!(x > pn.x && x < pn.x + pn.w && y > pn.y && y < pn.y + pn.h)) { this.shop = 0; sfx.tap(); }   // tapping outside closes it
        return;
      }
      // a visitor
      const bo = this.boss;
      if (bo && bo.phase === 'fight' && bo.enter > .5 && Math.hypot(x - bo.x, y - bo.y) < bo.S * 1.15) { this.hitBoss(1 + B.power, x, y); return; }
      // coins first (they are small and precious)
      let best = null, bd = 1e9; const reach = Math.max(this.S * .8, 34 * this.ui);
      for (const co of this.coins) { const d = Math.hypot(x - co.x, y - co.y); if (d < reach && d < bd) { best = co; bd = d; } }
      if (best) { this.collect(best); return; }
      // a fish: it wiggles and blows a bubble
      for (const f of this.fish) if (Math.hypot(x - f.x, y - f.y) < this.S * STAGE[f.f.stage] * .75) { f.puff = 1; f.vy -= 40; this.bubbleBurst(f.x, f.y, 4); sfx.bubble(); return; }
      // the castle: tap it and it turns into a different kind of castle (classic, fairy princess, dragon)
      if (B.decor.includes('castle')) { const cp = this.decorSpots().castle, u = cp.s; if (Math.abs(x - cp.x) < u * 1.3 && y > this.floorY - u * 2.3 && y < this.floorY + u * .5) { B.castleStyle = ((B.castleStyle || 0) + 1) % 3; sfx.chime(); this.fx.burst(cp.x, this.floorY - u * 1.0, 14, { colors: ['#ffd54a', '#fff', '#ff8aa3', '#7fd4f5'], speed: 200, g: 20, life: .9, size: 6 * this.ui, shape: 'star', up: 60 }); this.save(); return; } }
      // the water: drop food
      if (y > this.top && y < this.floorY + this.bs * .5) this.dropFood(x, Math.max(y, this.top + 6));
    }
    dropFood(x, y) {
      const B = this.bag;
      if (this.foods.length >= FOOD_MAX[B.more]) { sfx.tap(); this.tip = 1; return; }
      this.foods.push({ x, y, vy: 40 * this.ui, q: B.food, age: 0 });
      sfx.plink(this.foods.length); this.bubbleBurst(x, y, 2);
      if (!B.seen) { B.seen = 1; this.save(); }
    }
    collect(co) {
      const i = this.coins.indexOf(co); if (i < 0) return;
      this.coins.splice(i, 1); this.fly(co); sfx.plink(Math.round(co.v)); this.setCoins(this.bag.coins + co.v);
      this.bag.since += co.v >= 10 ? 3 : 1; this.fx.burst(co.x, co.y, 6, { colors: ['#ffd54a', '#fff'], speed: 130, g: 0, life: .5, size: 5 * this.ui, shape: 'star' });
      if (!this.bag.firstCoin) { this.bag.firstCoin = 1; voice.say('aq-coin'); }
      this.save();
    }
    fly(co) { this.flying = this.flying || []; this.flying.push({ x: co.x, y: co.y, v: co.v, t: 0 }); }
    tapShop(k) {
      const B = this.bag, it = k.it; let price = 0, full = false;
      if (it.kind === 'fish') { price = SPECIES[it.id].price; full = this.fish.length >= MAX_FISH; }
      else if (it.kind === 'up') { const lv = B[it.id]; if (lv >= it.prices.length) full = true; else price = it.prices[lv]; }
      else { if (B.decor.includes(it.id)) full = true; else price = it.price; }
      voice.say('aq/' + it.id);
      if (full) { sfx.oops(); k.wig = 1; return; }
      if (B.coins < price) { sfx.oops(); k.wig = 1; this.noFund = 1; return; }
      this.setCoins(B.coins - price); sfx.win();
      if (it.kind === 'fish') { const f = { sp: it.id, stage: 0, meals: 0 }; B.fish.push(f); const fo = this.makeFish(f, this.fish.length); fo.x = rnd(this.w * .25, this.w * .75); fo.y = this.top + 10; fo.placed = true; fo.tx = fo.x; fo.ty = fo.y + 60; this.fish.push(fo); this.fx.burst(fo.x, fo.y + 20, 14, { colors: ['#fff', '#7fd4f5', '#ffd54a'], speed: 200, g: 40, life: 1, size: 6 * this.ui, shape: 'star' }); }
      else if (it.kind === 'up') { B[it.id]++; if (it.id === 'snail') this.snailSync(); }
      else B.decor.push(it.id);
      this.fx.burst(k.x, k.y, 10, { colors: ['#ffd54a', '#fff'], speed: 160, g: 60, life: .8, size: 6 * this.ui, shape: 'star' });
      this.shop = 0; k.wig = 0; this.save();
    }
    hitBoss(dmg, x, y) {
      const bo = this.boss; bo.hp = Math.max(0, bo.hp - dmg); bo.hit = 1; bo.idle = 0; sfx.pop(); sfx.bubble();
      this.bubbleBurst(x, y, 7); this.fx.burst(x, y, 7, { colors: ['#fff', '#bfe9ff', '#7fd4f5'], speed: 180, g: -40, life: .7, size: 7 * this.ui, shape: 'circle' });
      if (bo.hp <= 0) this.winBoss();
    }
    bubbleBurst(x, y, n) { for (let i = 0; i < n; i++) this.bubbles.push({ x: x + rnd(-8, 8), y: y + rnd(-6, 6), r: rnd(2, 5) * this.ui, vy: rnd(30, 70), ph: Math.random() * 6, life: rnd(1, 2.2) }); }

    /* ---------------------------------------------------------------- visitors (bosses) */
    wantBoss() {
      const B = this.bag; if (this.boss || this.shop) return false;
      const big = this.fish.filter(f => f.f.stage >= 1).length;
      return this.fish.length >= 3 && big >= 1 && B.since >= 12 + 3 * Math.min(B.defeated, 5);
    }
    startBoss() {
      const B = this.bag, kind = BOSSES[B.defeated % BOSSES.length], S = this.S * 1.9;
      const hp = Math.min(14, 6 + B.defeated), side = Math.random() < .5 ? -1 : 1;
      this.boss = { kind, phase: 'fight', hp, max: hp, S, x: 0, y: 0, enter: 0, t: 0, hit: 0, idle: 0, tick: 0, side, pause: 0, dir: side > 0 ? -1 : 1, shotT: 1.5, out: 0 };
      sfx.boing(); voice.say('aq-boss');
    }
    bossHome(bo) {   // where the visitor wants to be at this moment
      const w = this.w, h = this.h, t = bo.t, S = bo.S;
      switch (bo.kind) {
        case 'crab': { const p = (t * .09) % 2, x = p < 1 ? p : 2 - p; bo.dir = p < 1 ? 1 : -1; return { x: lerp(w * .15, w * .85, x), y: this.floorY - S * .35 }; }
        case 'octopus': return { x: w * .5 + Math.sin(t * .5) * w * .3, y: h * .4 + Math.sin(t * .8) * h * .1 };
        case 'ufo': return { x: w * .5 + Math.sin(t * .4) * w * .36, y: this.top + S * 1.1 + Math.sin(t * 1.3) * S * .2 };
        default: { const p = (t * .1) % 2, x = p < 1 ? p : 2 - p; bo.dir = p < 1 ? 1 : -1; return { x: lerp(w * .18, w * .82, x), y: h * .45 + Math.sin(t * .6) * h * .14 }; }
      }
    }
    winBoss() {
      const bo = this.boss, B = this.bag; bo.phase = 'won'; bo.t2 = 0; B.defeated++; B.since = 0;
      store.addStars(1); sfx.win(); voice.say('aq-boss-done');
      this.fx.burst(bo.x, bo.y, 30, { colors: ['#ffd54a', '#ff8aa3', '#7fd4f5', '#a6e05a', '#fff'], speed: 320, g: 280, life: 1.4, size: 8 * this.ui, shape: 'star', up: 160 });
      for (let i = 0; i < 6; i++) { const v = i === 2 ? 10 : 3; this.coins.push({ x: bo.x + rnd(-bo.S, bo.S) * .8, y: bo.y + rnd(-bo.S * .4, 0), vy: rnd(-90, -30), v, rest: false, t: 0 }); }
      this.save();
    }

    /* ---------------------------------------------------------------- loop */
    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.idle += dt;
      this.update(dt); this.draw(); this.raf = requestAnimationFrame(this.tick);
    }
    update(dt) {
      const B = this.bag, S = this.S, w = this.w;
      this.fx.update(dt); this.noFund = Math.max(0, this.noFund - dt * 2); this.tip = Math.max(0, this.tip - dt * 2);
      this.shopAnim = clamp(this.shopAnim + (this.shop ? dt * 5 : -dt * 6), 0, 1);
      for (const k of this.cells) if (k.wig) k.wig = Math.max(0, k.wig - dt * 2.4);
      // food sinks; leftovers melt away after a while
      for (const f of this.foods) { f.age += dt; f.y = Math.min(this.floorY + S * .1, f.y + f.vy * dt); f.x += Math.sin(f.age * 2 + f.y * .02) * 6 * dt; }
      this.foods = this.foods.filter(f => f.age < 14);
      // coins fall and rest on the sand; they wait as long as it takes
      for (const c of this.coins) { c.t += dt; if (!c.rest) { c.vy = Math.min(60 * this.ui, c.vy + 140 * dt); c.y += c.vy * dt; c.x += Math.sin(c.t * 2.5) * 12 * dt; const fl = this.floorY + S * .3 + (c.x * 7 % 14); if (c.y >= fl) { c.y = fl; c.rest = true; } } }
      if (this.coins.length > 40) { this.collect(this.coins[0]); }
      if (this.flying) { for (const f of this.flying) { f.t += dt * 1.8; } this.flying = this.flying.filter(f => f.t < 1); }
      // fish
      let helpers = 0;
      for (const f of this.fish) {
        const st = f.f.stage, size = S * STAGE[st] * SPECIES[f.sp].size, hungry = f.hunger > HUNGRY_AFTER;
        f.hunger += dt; f.eat = Math.max(0, f.eat - dt * 2.5); f.cool = Math.max(0, f.cool - dt); f.puff = Math.max(0, f.puff - dt * 1.3); f.wt += dt;
        // where to go: the nearest pellet, else wander
        let tgt = null, bd = 1e9;
        if (f.cool <= 0) for (const p of this.foods) { const d = Math.hypot(p.x - f.x, p.y - f.y); if (d < bd) { bd = d; tgt = p; } }
        if (tgt) { f.tx = tgt.x; f.ty = tgt.y; if (bd < size * .7) { this.foods.splice(this.foods.indexOf(tgt), 1); this.eatFood(f, tgt); } }
        else if (Math.hypot(f.tx - f.x, f.ty - f.y) < size * .6 || f.wt > rnd(4, 8)) { f.wt = 0; f.tx = rnd(S * 1.2, w - S * 1.2); f.ty = rnd(this.top + size, this.floorY - size * .6); if (hungry) { f.ty = clamp(f.ty, this.h * .4, this.floorY - size * .6); } }
        const sp = (tgt ? 150 : hungry ? 30 : 55) * this.ui * (1 + st * .05), dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1;
        f.vx = lerp(f.vx, dx / d * sp, dt * 2.2); f.vy = lerp(f.vy, dy / d * sp * .7 + Math.sin(this.t * 1.5 + f.ph) * 6, dt * 2.2);
        // a grumpy visitor nearby: swim away from it
        const bo = this.boss; if (bo && bo.enter > .3) { const bx = f.x - bo.x, by = f.y - bo.y, bd2 = Math.hypot(bx, by); if (bd2 < bo.S * 2) { f.vx += bx / bd2 * 160 * dt; f.vy += by / bd2 * 120 * dt; } }
        f.x = clamp(f.x + f.vx * dt, S * .6, w - S * .6); f.y = clamp(f.y + f.vy * dt, this.top + size * .5, this.floorY - size * .3);
        if (Math.abs(f.vx) > 6) f.dir = f.vx > 0 ? 1 : -1;
        // coins from grown-up fish that are not hungry
        if (st >= 1 && !hungry) { f.coinT += dt; if (f.coinT >= (st === 1 ? 10 : 7)) { f.coinT = 0; this.makeCoin(f, st); } }
        if (st >= 1 && this.boss && this.boss.phase === 'fight') helpers += st;
      }
      // the helper snails crawl along the sand and collect coins
      for (const sn of this.snails) {
        const rest = this.coins.filter(c => c.rest); let tg = null, bd = 1e9; for (const c of rest) { const d = Math.abs(c.x - sn.x); if (d < bd) { bd = d; tg = c; } }
        const spd = this.w * (.045 + .03 * B.snail); sn.moving = false;
        if (tg) { const dx = tg.x - sn.x; if (Math.abs(dx) < S * .3) { this.collect(tg); } else { sn.x += Math.sign(dx) * spd * dt; sn.dir = dx > 0 ? 1 : -1; sn.moving = true; } }
        else { if (sn.tx == null || Math.abs(sn.tx - sn.x) < 4) sn.tx = rnd(this.w * .1, this.w * .9); const dx = sn.tx - sn.x; sn.x += Math.sign(dx) * spd * .4 * dt; sn.dir = dx > 0 ? 1 : -1; sn.moving = true; }
      }
      // bubbles drifting up
      for (const b of this.bubbles) { b.y -= b.vy * dt; b.x += Math.sin(this.t * 2 + b.ph) * 10 * dt; b.life -= dt; }
      this.bubbles = this.bubbles.filter(b => b.life > 0 && b.y > this.top);
      if (Math.random() < dt * .7) this.bubbles.push({ x: rnd(0, w), y: this.floorY, r: rnd(2, 6) * this.ui, vy: rnd(20, 50), ph: Math.random() * 6, life: rnd(3, 7) });
      // visitors
      if (this.wantBoss()) this.startBoss();
      if (this.boss) this.updateBoss(dt, helpers);
    }
    eatFood(f, p) {
      const B = this.bag, F = f.f; f.eat = 1; f.hunger = 0; f.cool = .5; f.coinT = Math.max(0, f.coinT - .6 * (p.q + 1));
      sfx.munch(); this.bubbleBurst(f.x + f.dir * this.S * .4, f.y, 2);
      F.meals += 1 + p.q;
      const need = NEED[F.stage];
      if (F.stage < 2 && F.meals >= need) {
        F.stage++; F.meals = 0; f.puff = 1; sfx.chime();
        this.fx.burst(f.x, f.y, 14, { colors: ['#ffd54a', '#fff', '#ff8aa3'], speed: 220, g: 40, life: 1, size: 7 * this.ui, shape: 'star', up: 60 });
        if (!B.grew || F.stage === 2 && !B.grewBig) { if (F.stage === 2) B.grewBig = 1; B.grew = 1; voice.say('aq-grow'); }
        this.save();
      }
    }
    makeCoin(f, st) {
      const big = st === 2, pearl = big && Math.random() < .12, v = pearl ? 10 : (big ? 3 : 1) * SPECIES[f.sp].mult;
      this.coins.push({ x: f.x, y: f.y, vy: 0, v, rest: false, t: Math.random() * 6 }); sfx.pop();
      this.fx.burst(f.x, f.y, 4, { colors: ['#ffd54a', '#fff'], speed: 80, g: 0, life: .5, size: 4 * this.ui, shape: 'star' });
    }
    updateBoss(dt, helpers) {
      const bo = this.boss; bo.t += dt; bo.hit = Math.max(0, bo.hit - dt * 4); bo.idle += dt;
      if (bo.phase === 'fight') {
        bo.enter = Math.min(1, bo.enter + dt * .45);
        const home = this.bossHome(bo), e = ease(bo.enter), off = bo.kind === 'crab' || bo.kind === 'shark' ? { x: bo.side * this.w * .7, y: 0 } : { x: 0, y: -this.h * .5 };
        bo.x = home.x + off.x * (1 - e); bo.y = home.y + off.y * (1 - e);
        // the big fish help with bubbles, and the water tickles a little even if nobody taps
        bo.shotT -= dt; if (helpers > 0 && bo.enter > .8 && bo.shotT <= 0) { bo.shotT = Math.max(1.2, 3.2 - helpers * .3); const src = this.fish.filter(f => f.f.stage >= 1)[Math.floor(Math.random() * this.fish.filter(f => f.f.stage >= 1).length)]; if (src) this.shots.push({ x: src.x, y: src.y, r: this.S * .22, t: 0 }); sfx.bubble(); }
        if (bo.idle > 9 && bo.enter > .9) { bo.idle = 0; this.hitBoss(1, bo.x, bo.y - bo.S * .3); }
      } else if (bo.phase === 'won') {
        bo.t2 += dt; if (bo.t2 > 2.4) { bo.phase = 'out'; bo.out = 0; sfx.whoosh(); }
      } else {
        bo.out += dt; const side = bo.kind === 'crab' || bo.kind === 'shark';
        if (side) bo.x += bo.side * this.w * .45 * dt; else bo.y -= this.h * .5 * dt;
        if (bo.x < -bo.S * 2.2 || bo.x > this.w + bo.S * 2.2 || bo.y < -bo.S * 2.2 || bo.out > 8) this.boss = null;
      }
      // pellets that touch the visitor are nibbled away
      if (bo && bo.phase === 'fight') this.foods = this.foods.filter(p => Math.hypot(p.x - bo.x, p.y - bo.y) > bo.S * .8);
      // bubble shots
      for (const s of this.shots) { const b = this.boss; if (!b || b.phase !== 'fight') { s.t = 9; continue; } const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy) || 1; s.x += dx / d * this.w * .5 * dt; s.y += dy / d * this.w * .5 * dt; s.t += dt; if (d < b.S * .7) { s.t = 9; this.hitBoss(1, s.x, s.y); } }
      this.shots = this.shots.filter(s => s.t < 4);
    }

    /* ---------------------------------------------------------------- drawing */
    night() { return SPG.night && SPG.night.on(); }
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w) return; const n = this.night(), S = this.S, t = this.t;
      // water
      const g = c.createLinearGradient(0, 0, 0, h); if (n) { g.addColorStop(0, '#1d2d5e'); g.addColorStop(1, '#14204a'); } else { g.addColorStop(0, '#8fdcf5'); g.addColorStop(.55, '#5fbfe8'); g.addColorStop(1, '#3a9bd0'); }
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // light rays
      c.save(); c.globalAlpha = n ? .05 : .12; c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const x = w * (.1 + i * .22) + Math.sin(t * .3 + i) * 30; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + S * .8, 0); c.lineTo(x + S * 2.2 + Math.sin(t * .4 + i) * 20, this.floorY); c.lineTo(x + S * 1.0, this.floorY); c.closePath(); c.fill(); } c.restore();
      // the surface
      c.fillStyle = n ? 'rgba(180,200,255,.25)' : 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(0, this.top); for (let x = 0; x <= w; x += 16) c.lineTo(x, this.top + Math.sin(x * .03 + t * 1.6) * 4); c.lineTo(w, 0); c.lineTo(0, 0); c.closePath(); c.fill();
      if (n) { c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(w * .15, this.top * .5, this.top * .3, 0, TAU); c.fill(); }
      // the sand, the seaweed and what she has bought
      const sy = this.floorY; const sand = c.createLinearGradient(0, sy, 0, h); sand.addColorStop(0, n ? '#8a7a60' : '#f2d9a0'); sand.addColorStop(1, n ? '#6a5d48' : '#e0c078'); c.fillStyle = sand;
      c.beginPath(); c.moveTo(0, sy + 8); for (let x = 0; x <= w; x += 20) c.lineTo(x, sy + Math.sin(x * .02) * 8); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
      c.fillStyle = n ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.35)'; for (let i = 0; i < 24; i++) { c.beginPath(); c.arc((i * 131) % w, sy + 14 + (i * 37) % (h - sy - 18), 2 + (i % 3), 0, TAU); c.fill(); }
      const spots = this.decorSpots(); for (const id of this.bag.decor) { const p = spots[id]; c.save(); c.translate(p.x, sy + S * .35); DECOR_ART[id](c, p.s, t, id === 'castle' ? (this.bag.castleStyle || 0) : 0); c.restore(); }
      c.save(); c.translate(w * .95, sy + S * .3); DECOR_ART.weed(c, S * .55, t); c.restore(); c.save(); c.translate(w * .42, sy + S * .4); DECOR_ART.weed(c, S * .4, t + 2); c.restore();
      // bubbles
      for (const b of this.bubbles) { c.globalAlpha = clamp(b.life, 0, 1) * .8; c.strokeStyle = 'rgba(255,255,255,.9)'; c.fillStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); c.stroke(); } c.globalAlpha = 1;
      // snails
      for (const sn of this.snails) { c.save(); c.translate(sn.x, sy + S * .55); drawSnail(c, S * .7, t, sn.dir, sn.moving); c.restore(); }
      // the visitor is behind the fish when it is on the floor, in front otherwise: keep it simple and draw it between
      if (this.boss) this.drawBoss(c);
      // fish
      for (const f of this.fish) {
        const st = f.f.stage, size = S * STAGE[st] * SPECIES[f.sp].size, hungry = f.hunger > HUNGRY_AFTER;
        c.save(); c.translate(f.x, f.y + Math.sin(t * 2 + f.ph) * 2); c.scale(f.dir, 1); c.rotate(clamp(f.vy * .004, -.3, .3));
        if (hungry) c.globalAlpha = .75;
        drawFish(c, f.sp, size, t, { ph: f.ph, eat: f.eat, hungry, puff: f.puff });
        c.restore(); c.globalAlpha = 1;
        if (hungry) { const bx = f.x + size * .6, by = f.y - size * .85 + Math.sin(t * 3 + f.ph) * 3, r = size * .34; c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill(); c.beginPath(); c.arc(bx - r * .9, by + r * 1.1, r * .22, 0, TAU); c.fill(); c.save(); c.translate(bx, by); pellet(c, r * .5, this.bag.food); c.restore(); }
      }
      // pellets, coins, bubble shots
      for (const p of this.foods) { c.save(); c.translate(p.x, p.y); c.globalAlpha = clamp((14 - p.age) / 3, 0, 1); pellet(c, 7 * this.ui + 2, p.q); c.restore(); } c.globalAlpha = 1;
      for (const co of this.coins) { const r = S * .3; c.save(); c.translate(co.x, co.y); if (co.rest) { c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(0, r * .8, r * .8, r * .2, 0, 0, TAU); c.fill(); } const gl = .5 + Math.sin(t * 5 + co.t) * .5; c.globalAlpha = .25 + gl * .25; c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(0, 0, r * 1.5, 0, TAU); c.fill(); c.globalAlpha = 1; coinDraw(c, r, co.v, t + co.t); c.restore(); }
      for (const s of this.shots) { c.fillStyle = 'rgba(255,255,255,.55)'; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); c.stroke(); }
      if (this.flying) for (const f of this.flying) { const u = ease(clamp(f.t, 0, 1)); c.save(); c.translate(lerp(f.x, this.coinTarget.x, u), lerp(f.y, this.coinTarget.y, u)); c.globalAlpha = 1 - u * .3; coinDraw(c, S * .3 * (1 - u * .5), f.v, t); c.restore(); }
      this.fx.draw(c);
      // the hints for the very first time: a hand that shows what to do
      this.drawHint(c);
      // the bottom bar: the shop
      this.drawShopButton(c);
      if (this.shopAnim > 0) this.drawShop(c);
      if (n) { c.fillStyle = 'rgba(10,14,40,.18)'; c.fillRect(0, 0, w, h); }
    }
    drawHint(c) {
      if (this.shop || this.boss) return; const B = this.bag, S = this.S; let hx = null, hy = null;
      if (!B.seen) { hx = this.w * .5; hy = this.h * .35; }
      else if (!B.firstCoin && this.coins.length) { hx = this.coins[0].x; hy = this.coins[0].y - S * .2; }
      else if (this.idle > 14 && this.foods.length === 0) { hx = this.w * .5; hy = this.h * .3; }
      if (hx == null) return;
      c.save(); c.globalAlpha = .9; const k = .5 + Math.sin(this.t * 4) * .5; art.hand(c, hx, hy + k * 10, S * 1.4, k); c.restore();
    }
    drawShopButton(c) {
      const b = this.shopBtn, B = this.bag, can = B.coins >= 10, pulse = !this.shop && can && this.idle > 6 ? 1 + Math.sin(this.t * 6) * .05 : 1;
      c.fillStyle = 'rgba(40,70,110,.25)'; c.beginPath(); c.arc(b.x, b.y + 6, b.r, 0, TAU); c.fill();
      c.fillStyle = this.shop ? '#fff3c4' : '#fff'; c.beginPath(); c.arc(b.x, b.y, b.r * pulse, 0, TAU); c.fill(); if (this.shop) { c.strokeStyle = '#59b96e'; c.lineWidth = 6; c.stroke(); }
      c.save(); c.translate(b.x, b.y); const r = b.r * .7;
      // a little treasure bag with a coin
      c.fillStyle = '#e8b06a'; c.beginPath(); c.moveTo(-r * .35, -r * .5); c.quadraticCurveTo(-r * 1.05, r * .1, -r * .7, r * .75); c.lineTo(r * .7, r * .75); c.quadraticCurveTo(r * 1.05, r * .1, r * .35, -r * .5); c.closePath(); c.fill();
      c.fillStyle = '#c98b4a'; rr(c, -r * .45, -r * .65, r * .9, r * .28, r * .1); c.fill(); c.save(); c.translate(0, r * .18); coinDraw(c, r * .36, 3, 0); c.restore(); c.restore();
      // pellets left to drop: little dots above the button
      const max = FOOD_MAX[B.more], left = max - this.foods.length; for (let i = 0; i < max; i++) { c.save(); c.translate(b.x + (i - (max - 1) / 2) * 18 * this.ui, b.y - b.r - 14 * this.ui); c.globalAlpha = i < left ? 1 : .25; pellet(c, 6 * this.ui + 1, B.food); c.restore(); } c.globalAlpha = 1;
    }
    drawShop(c) {
      const e = ease(this.shopAnim), pn = this.panel, B = this.bag; c.save(); c.globalAlpha = e; c.translate(0, (1 - e) * 40);
      c.fillStyle = 'rgba(255,255,255,.92)'; rr(c, pn.x, pn.y, pn.w, pn.h, 26); c.fill(); c.strokeStyle = 'rgba(90,63,94,.15)'; c.lineWidth = 3; c.stroke();
      for (const k of this.cells) {
        const it = k.it; let price = 0, lv = 0, max = 0, full = false, sold = false;
        if (it.kind === 'fish') { price = SPECIES[it.id].price; full = this.fish.length >= MAX_FISH; }
        else if (it.kind === 'up') { lv = B[it.id]; max = it.prices.length; if (lv >= max) sold = true; else price = it.prices[lv]; }
        else { if (B.decor.includes(it.id)) sold = true; else price = it.price; }
        const afford = !sold && !full && B.coins >= price, wig = k.wig ? Math.sin(k.wig * 22) * 6 * k.wig : 0;
        c.save(); c.translate(k.x + wig, k.y);
        c.fillStyle = sold ? '#e6f6e0' : afford ? '#fff8dc' : '#f0f3f7'; rr(c, -k.w / 2, -k.h / 2, k.w, k.h, 18); c.fill(); c.strokeStyle = afford ? '#ffd54a' : 'rgba(90,63,94,.12)'; c.lineWidth = afford ? 4 : 2; c.stroke();
        c.save(); c.translate(0, -k.h * .1); c.globalAlpha = sold || afford ? 1 : .6; const ir = Math.min(k.w, k.h) * .3; shopIcon(c, it.id, ir, this.t); c.restore();
        // the price: a coin and a number (or a check once it is all bought)
        const py = k.h * .34; c.save(); c.translate(0, py);
        if (sold) { art.star(c, 0, 0, k.h * .13, '#59b96e', 0); }
        else { const r = Math.min(k.h * .12, 17 * this.ui + 4); c.font = `700 ${r * 1.5}px Fredoka, system-ui`; c.textBaseline = 'middle'; c.textAlign = 'left'; const tw = c.measureText(String(price)).width; c.save(); c.translate(-tw / 2 - r * .3, 0); coinDraw(c, r, 1, 0); c.restore(); c.fillStyle = afford ? '#7a4f00' : '#8a8096'; c.fillText(String(price), -tw / 2 + r * .9, 1); }
        c.restore();
        if (it.kind === 'up') { for (let i = 0; i < max; i++) { c.fillStyle = i < lv ? '#59b96e' : 'rgba(90,63,94,.18)'; c.beginPath(); c.arc((i - (max - 1) / 2) * k.w * .09, -k.h * .42, k.w * .028, 0, TAU); c.fill(); } }
        c.restore();
      }
      c.restore();
    }
    drawBoss(c) {
      const bo = this.boss, S = bo.S, happy = bo.phase !== 'fight', t = this.t;
      c.save(); c.translate(bo.x, bo.y);
      const sq = 1 + bo.hit * .12; c.scale((bo.kind === 'shark' ? bo.dir : 1) * sq, 1 / sq);
      if (happy) c.translate(0, -Math.abs(Math.sin(t * 6)) * S * .08);
      BOSS_ART[bo.kind](c, S, t, happy ? 'happy' : 'grumpy', bo.hit);
      if (bo.hit > .05) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,255,255,${(bo.hit * .35).toFixed(3)})`; c.beginPath(); c.arc(0, 0, S * 1.1, 0, TAU); c.fill(); }
      c.restore();
      // how many bubbles are left to pop: a row above it
      if (bo.phase === 'fight') {
        const n = bo.max, r = 9 * this.ui + 2, gap = r * 2.3, x0 = bo.x - (n - 1) * gap / 2, y = clamp(bo.y - S * 1.25, this.top + r * 2, this.h);
        for (let i = 0; i < n; i++) { const on = i < bo.hp; c.fillStyle = on ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.15)'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(x0 + i * gap, y, r, 0, TAU); c.fill(); c.stroke(); if (on) { c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x0 + i * gap - r * .3, y - r * .3, r * .22, 0, TAU); c.fill(); } }
        if (bo.t < 7 && bo.hp === bo.max && bo.enter > .7) { c.save(); const k = .5 + Math.sin(t * 5) * .5; art.hand(c, bo.x + S * .2, bo.y + S * .6 + k * 8, S * .8, k); c.restore(); }
      }
    }
  }

  SPG.games.push({
    id: 'aquarium', name: 'Fish Tank', order: 11,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fdcf5'); g.addColorStop(1, '#3a9bd0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(w * (.15 + i * .28), 0); c.lineTo(w * (.22 + i * .28), 0); c.lineTo(w * (.4 + i * .28), h * .8); c.lineTo(w * (.3 + i * .28), h * .8); c.closePath(); c.fill(); }
      c.fillStyle = '#f2d9a0'; c.beginPath(); c.moveTo(0, h * .84); c.quadraticCurveTo(w * .5, h * .76, w, h * .84); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.save(); c.translate(w * .18, h * .86); DECOR_ART.weed(c, w * .09, 1); c.restore(); c.save(); c.translate(w * .86, h * .86); DECOR_ART.weed(c, w * .07, 2); c.restore();
      c.save(); c.translate(w * .4, h * .44); drawFish(c, 'clown', w * .4, 1, {}); c.restore();
      c.save(); c.translate(w * .72, h * .68); c.scale(-1, 1); drawFish(c, 'guppy', w * .22, 2, {}); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.fillStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; for (const [x, y, r] of [[.62, .24, .04], [.68, .14, .03], [.58, .12, .025], [.22, .3, .03]]) { c.beginPath(); c.arc(w * x, h * y, w * r, 0, TAU); c.fill(); c.stroke(); }
      c.save(); c.translate(w * .8, h * .3); coinDraw(c, w * .07, 3, 0); c.restore();
    },
    create: host => new TankGame(host)
  });
})();
