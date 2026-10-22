// Hide and Seek: a small world to explore, the same every time. Five places (Sunny Meadow, Berry Farm, Little Village, Whispering Woods,
// Sandy Beach) are joined by one trail from each place's west gate to its east gate, with little houses beside it and a special landmark
// near the end. Her pet walks the trail (drag, or tap where to go); friends are hiding behind bushes, rocks, hay, trees and so on.
// Walking up to a hiding place looks behind it: a friend comes out and joins the line behind her (and keeps following her from place to
// place). When everyone in a place is found the gate at the end of the trail opens and the trail glows; the next place has more friends.
// After the last place the adventure starts again with everyone hiding anew. Nothing moves around between visits: the maps are built
// from fixed seeds, and only the season (spring, summer, autumn, winter, from the date) changes how they look.
// A soft arrow at the edge of the screen points toward the nearest friend still hiding: it is faint when far and solid when near, with a
// snowflake (cold), sun (warm) or flame (hot). Looking behind an empty place shows the same picture over it.
(() => {
  const SPG = window.SPG;
  const { art, sfx, voice, store } = SPG;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const RAINBOW = ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2', '#8a7cf0', '#c98bf0'];
  /* ---------------------------------------------------------------- hiding places (base on (0, 0), about S wide) */
  const blob = (c, S, cols, dots, dotCol) => {
    for (const [x, y, r, k] of [[-.3, -.32, .34, 0], [.28, -.3, .36, 1], [0, -.5, .4, 2], [-.05, -.24, .4, 0], [-.4, -.14, .22, 1], [.4, -.14, .22, 2]]) { c.fillStyle = cols[k]; c.beginPath(); c.arc(x * S, y * S, r * S, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-S * .18, -S * .62, S * .16, S * .07, -.5, 0, TAU); c.fill();
    if (dots) { c.fillStyle = dotCol; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc((((i * 37) % 70) / 70 - .5) * S * .8, -S * (.2 + ((i * 53) % 50) / 100), S * .04, 0, TAU); c.fill(); } }
  };
  const SPOT = {
    bush: (c, S, p) => blob(c, S, p.cols || ['#5cb85c', '#7ed957', '#4aa64f'], true, p.dots || '#ff6b81'),
    rock: (c, S, p) => {
      const g = c.createLinearGradient(0, -S * .8, 0, 0); g.addColorStop(0, p.hi || '#c9ccd8'); g.addColorStop(1, p.lo || '#9ea3b5');
      c.fillStyle = g; c.beginPath(); c.moveTo(-S * .52, 0); c.bezierCurveTo(-S * .58, -S * .55, -S * .3, -S * .85, S * .05, -S * .82); c.bezierCurveTo(S * .45, -S * .8, S * .6, -S * .4, S * .52, 0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-S * .2, -S * .55, S * .16, S * .07, -.6, 0, TAU); c.fill();
      c.fillStyle = p.cap || '#7fbf6a'; c.beginPath(); c.ellipse(S * .28, -S * .06, S * .2, S * .06, 0, 0, TAU); c.fill();
    },
    hay: (c, S) => {
      c.fillStyle = '#f2c94c'; art.rr(c, -S * .5, -S * .75, S, S * .75, S * .12); c.fill();
      c.strokeStyle = '#d9a52e'; c.lineWidth = S * .025; c.lineCap = 'round'; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(-S * .42 + i * S * .1, -S * .68); c.lineTo(-S * .38 + i * S * .1, -S * .08); c.stroke(); }
      c.fillStyle = '#c98b5b'; c.fillRect(-S * .5, -S * .48, S, S * .06); c.fillRect(-S * .5, -S * .2, S, S * .06);
    },
    crate: (c, S) => {
      c.fillStyle = '#d9a06c'; art.rr(c, -S * .48, -S * .78, S * .96, S * .78, S * .06); c.fill();
      c.strokeStyle = '#a9743f'; c.lineWidth = S * .05; c.strokeRect(-S * .42, -S * .72, S * .84, S * .66); c.beginPath(); c.moveTo(-S * .42, -S * .72); c.lineTo(S * .42, -S * .06); c.moveTo(S * .42, -S * .72); c.lineTo(-S * .42, -S * .06); c.stroke();
    },
    tree: (c, S, p) => {
      c.fillStyle = p.trunk || '#8a6448'; art.rr(c, -S * .12, -S * .8, S * .24, S * .8, S * .05); c.fill();
      for (const [x, y, r, k] of [[-.32, -1.0, .38, 0], [.3, -1.0, .4, 1], [0, -1.28, .46, 2], [-.05, -.95, .44, 0]]) { c.fillStyle = (p.cols || ['#4aa64f', '#5cb85c', '#6fc46f'])[k]; c.beginPath(); c.arc(x * S, y * S, r * S, 0, TAU); c.fill(); }
      if (p.apples) { c.fillStyle = '#ff5f6d'; for (const [x, y] of [[-.35, -1.05], [.25, -.95], [.05, -1.3], [.4, -1.15]]) { c.beginPath(); c.arc(x * S, y * S, S * .06, 0, TAU); c.fill(); } }
      if (p.snow) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -S * 1.62, S * .34, S * .1, 0, 0, TAU); c.fill(); }
    },
    pine: (c, S, p) => {
      c.fillStyle = '#7a5a48'; c.fillRect(-S * .07, -S * .3, S * .14, S * .3);
      for (let k = 0; k < 3; k++) { const y = -S * (.22 + k * .42), w = S * (.55 - k * .13); c.fillStyle = p.col || '#3f8f66'; c.beginPath(); c.moveTo(-w, y); c.lineTo(0, y - S * .62); c.lineTo(w, y); c.closePath(); c.fill(); if (p.snow) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-w * .6, y - S * .26); c.lineTo(0, y - S * .62); c.lineTo(w * .6, y - S * .26); c.quadraticCurveTo(0, y - S * .16, -w * .6, y - S * .26); c.fill(); } }
    },
    log: (c, S, p) => {
      c.fillStyle = p.bark || '#9a6a44'; art.rr(c, -S * .5, -S * .42, S, S * .42, S * .18); c.fill();
      c.fillStyle = p.core || '#e6c08c'; c.beginPath(); c.ellipse(S * .5, -S * .21, S * .09, S * .21, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(90,60,40,.4)'; c.lineWidth = S * .02; c.beginPath(); c.ellipse(S * .5, -S * .21, S * .045, S * .11, 0, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(70,45,30,.35)'; c.lineWidth = S * .025; for (const x of [-.3, -.05, .2]) { c.beginPath(); c.moveTo(x * S, -S * .38); c.lineTo(x * S + S * .04, -S * .05); c.stroke(); }
      if (p.snow) { c.fillStyle = '#fff'; art.rr(c, -S * .46, -S * .48, S * .92, S * .14, S * .07); c.fill(); }
    },
    mound: (c, S, p) => { c.fillStyle = p.col || '#fff'; c.beginPath(); c.moveTo(-S * .6, 0); c.bezierCurveTo(-S * .5, -S * .7, S * .5, -S * .7, S * .6, 0); c.closePath(); c.fill(); c.fillStyle = p.shade || 'rgba(120,160,210,.25)'; c.beginPath(); c.moveTo(S * .1, -S * .55); c.bezierCurveTo(S * .45, -S * .5, S * .55, -S * .2, S * .6, 0); c.lineTo(S * .15, 0); c.closePath(); c.fill(); },
    mushroom: (c, S) => {
      c.fillStyle = '#f7ecd8'; art.rr(c, -S * .16, -S * .5, S * .32, S * .5, S * .1); c.fill();
      c.fillStyle = '#e8433f'; c.beginPath(); c.ellipse(0, -S * .55, S * .55, S * .38, 0, Math.PI, TAU); c.closePath(); c.fill(); c.beginPath(); c.ellipse(0, -S * .55, S * .55, S * .1, 0, 0, Math.PI); c.fill();
      c.fillStyle = '#fff'; for (const [x, y, r] of [[-.28, -.72, .09], [.06, -.85, .11], [.3, -.66, .08]]) { c.beginPath(); c.arc(x * S, y * S, r * S, 0, TAU); c.fill(); }
    },
    pumpkin: (c, S) => {
      c.fillStyle = '#f08a2b'; for (const x of [-.28, 0, .28]) { c.beginPath(); c.ellipse(x * S, -S * .34, S * (x ? .3 : .34), S * .34, 0, 0, TAU); c.fill(); }
      c.strokeStyle = '#c96a12'; c.lineWidth = S * .02; for (const x of [-.14, .14]) { c.beginPath(); c.moveTo(x * S, -S * .66); c.quadraticCurveTo(x * S * 1.4, -S * .35, x * S, -S * .02); c.stroke(); }
      c.fillStyle = '#5a8a3a'; art.rr(c, -S * .04, -S * .78, S * .08, S * .16, S * .03); c.fill();
    }
  };
  // ---- more hiding places
  SPOT.barrel = (c, S, p) => {
    c.fillStyle = p.wood || '#b9805a'; c.beginPath(); c.moveTo(-S * .36, 0); c.bezierCurveTo(-S * .5, -S * .3, -S * .5, -S * .5, -S * .36, -S * .8); c.lineTo(S * .36, -S * .8); c.bezierCurveTo(S * .5, -S * .5, S * .5, -S * .3, S * .36, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(70,40,20,.35)'; c.lineWidth = S * .025; for (const x of [-.18, 0, .18]) { c.beginPath(); c.moveTo(x * S, -S * .78); c.lineTo(x * S * 1.1, -S * .02); c.stroke(); }
    c.fillStyle = '#7a8aa0'; for (const y of [-.12, -.4, -.68]) c.fillRect(-S * (.44 - Math.abs(y + .4) * .1), y * S - S * .02, S * (.88 - Math.abs(y + .4) * .2), S * .05);
    c.fillStyle = '#cf9a64'; c.beginPath(); c.ellipse(0, -S * .8, S * .36, S * .08, 0, 0, TAU); c.fill();
  };
  SPOT.stump = (c, S, p) => {
    c.fillStyle = p.bark || '#9a6a44'; c.beginPath(); c.moveTo(-S * .42, 0); c.quadraticCurveTo(-S * .36, -S * .25, -S * .3, -S * .5); c.lineTo(S * .3, -S * .5); c.quadraticCurveTo(S * .36, -S * .25, S * .42, 0); c.closePath(); c.fill();
    c.fillStyle = p.core || '#e6c08c'; c.beginPath(); c.ellipse(0, -S * .5, S * .3, S * .1, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(120,80,40,.5)'; c.lineWidth = S * .02; for (const r of [.1, .2]) { c.beginPath(); c.ellipse(0, -S * .5, S * r, S * r * .33, 0, 0, TAU); c.stroke(); }
    c.fillStyle = '#6fc46f'; c.beginPath(); c.ellipse(-S * .3, -S * .08, S * .12, S * .05, .3, 0, TAU); c.fill();
  };
  SPOT.boat = (c, S, p) => {   // a little rowing boat turned upside down
    c.fillStyle = p.hull || '#e8574a'; c.beginPath(); c.moveTo(-S * .6, 0); c.bezierCurveTo(-S * .55, -S * .6, S * .55, -S * .6, S * .6, 0); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.fillRect(-S * .56, -S * .22, S * 1.12, S * .08); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-S * .2, -S * .42, S * .16, S * .06, -.4, 0, TAU); c.fill();
    c.strokeStyle = '#a9743f'; c.lineWidth = S * .05; c.lineCap = 'round'; c.beginPath(); c.moveTo(S * .55, -S * .05); c.lineTo(S * .85, -S * .5); c.stroke();
  };
  const SPOT_H = { tree: 1.7, pine: 1.55, bush: .85, rock: .85, hay: .78, crate: .8, log: .5, mound: .6, mushroom: .9, pumpkin: .7, barrel: .85, stump: .55, boat: .6 };
  const CAP = { bush: [-.82, .46], rock: [-.82, .42], hay: [-.76, .46], crate: [-.8, .42], tree: [-1.62, .36], pine: null, log: [-.46, .4], mushroom: null, pumpkin: [-.72, .4], barrel: [-.82, .32], stump: [-.52, .28], boat: [-.5, .4], mound: null };
  const snowCap = (c, S, kind) => { const k = CAP[kind]; if (!k) return; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, k[0] * S, S * k[1], S * .1, 0, 0, TAU); c.fill(); };

  // ---- thermometer pictures (for the "how close is a friend" feeling): snowflake = cold, sun = warm, flame = hot
  const snowflake = (c, r, col) => { c.strokeStyle = col; c.lineWidth = r * .22; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); c.stroke(); } };
  const sunIcon = (c, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * .5, 0, TAU); c.fill(); c.strokeStyle = col; c.lineWidth = r * .2; c.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * r * .72, Math.sin(a) * r * .72); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.stroke(); } };
  const flameIcon = (c, r, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, -r); c.bezierCurveTo(r * .9, -r * .3, r * .8, r * .9, 0, r * .95); c.bezierCurveTo(-r * .8, r * .9, -r * .9, -r * .3, 0, -r); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.moveTo(0, -r * .1); c.bezierCurveTo(r * .4, r * .25, r * .3, r * .7, 0, r * .75); c.bezierCurveTo(-r * .3, r * .7, -r * .4, r * .25, 0, -r * .1); c.fill(); };
  const TEMP = k => (k > .66 ? { col: '#ff7a45', icon: flameIcon } : k > .33 ? { col: '#ffc93c', icon: sunIcon } : { col: '#6fb4f0', icon: snowflake });

  // ---- houses and landmarks (the permanent things in each place). Base on (0, 0).
  const HOUSE = {
    cottage(c, S, h, t, season) {
      c.fillStyle = h.wall; art.rr(c, -S * .7, -S * .72, S * 1.4, S * .72, S * .05); c.fill();
      c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(-S * .7, -S * .12, S * 1.4, S * .12);
      c.fillStyle = h.roof; c.beginPath(); c.moveTo(-S * .9, -S * .7); c.lineTo(0, -S * 1.45); c.lineTo(S * .9, -S * .7); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.moveTo(-S * .9, -S * .7); c.lineTo(0, -S * 1.45); c.lineTo(0, -S * .7); c.closePath(); c.fill();
      c.fillStyle = '#b9805a'; c.fillRect(S * .36, -S * 1.38, S * .18, S * .42); c.fillStyle = '#9a6a44'; c.fillRect(S * .33, -S * 1.42, S * .24, S * .07);
      if (season === 'winter') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-S * .93, -S * .68); c.lineTo(0, -S * 1.47); c.lineTo(S * .93, -S * .68); c.lineTo(S * .8, -S * .66); c.lineTo(0, -S * 1.3); c.lineTo(-S * .8, -S * .66); c.closePath(); c.fill(); }
      HOUSE.door(c, S, h, -S * .22, -S * .5, S * .34, S * .5); HOUSE.win(c, S, S * .2, -S * .52, S * .3);
      c.fillStyle = '#ff8aa3'; art.rr(c, S * .18, -S * .22, S * .34, S * .1, S * .03); c.fill(); for (const x of [.24, .35, .46]) { c.fillStyle = ['#ffd54a', '#fff', '#ff6b81'][Math.round(x * 10) % 3]; c.beginPath(); c.arc(S * x, -S * .26, S * .04, 0, TAU); c.fill(); }
    },
    barn(c, S, h, t, season) {
      c.fillStyle = h.wall; c.beginPath(); c.moveTo(-S * .8, 0); c.lineTo(-S * .8, -S * .7); c.lineTo(-S * .45, -S * 1.15); c.lineTo(S * .45, -S * 1.15); c.lineTo(S * .8, -S * .7); c.lineTo(S * .8, 0); c.closePath(); c.fill();
      c.fillStyle = h.roof; c.beginPath(); c.moveTo(-S * .88, -S * .68); c.lineTo(-S * .5, -S * 1.22); c.lineTo(S * .5, -S * 1.22); c.lineTo(S * .88, -S * .68); c.lineTo(S * .8, -S * .62); c.lineTo(S * .45, -S * 1.07); c.lineTo(-S * .45, -S * 1.07); c.lineTo(-S * .8, -S * .62); c.closePath(); c.fill();
      if (season === 'winter') { c.fillStyle = '#fff'; c.fillRect(-S * .5, -S * 1.27, S, S * .07); }
      c.fillStyle = '#fff'; HOUSE.door(c, S, { door: '#f5e9d8', wall: h.wall }, -S * .3, -S * .62, S * .6, S * .62); c.strokeStyle = '#e8574a'; c.lineWidth = S * .05; c.beginPath(); c.moveTo(-S * .3, -S * .62); c.lineTo(S * .3, 0); c.moveTo(S * .3, -S * .62); c.lineTo(-S * .3, 0); c.stroke();
      HOUSE.win(c, S, -S * .08, -S * .95, S * .16);
    },
    shop(c, S, h, t, season) {
      c.fillStyle = h.wall; art.rr(c, -S * .75, -S * .85, S * 1.5, S * .85, S * .05); c.fill();
      c.fillStyle = h.roof; c.fillRect(-S * .82, -S * .95, S * 1.64, S * .14);
      if (season === 'winter') { c.fillStyle = '#fff'; c.fillRect(-S * .84, -S * 1.02, S * 1.68, S * .1); }
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : h.accent; c.beginPath(); c.moveTo(-S * .8 + i * S * .2, -S * .81); c.lineTo(-S * .6 + i * S * .2, -S * .81); c.lineTo(-S * .6 + i * S * .2, -S * .62); c.arc(-S * .7 + i * S * .2, -S * .62, S * .1, 0, Math.PI); c.lineTo(-S * .8 + i * S * .2, -S * .62); c.closePath(); c.fill(); }
      HOUSE.door(c, S, h, S * .1, -S * .5, S * .32, S * .5); HOUSE.win(c, S, -S * .6, -S * .5, S * .34);
      c.fillStyle = '#fff'; art.rr(c, -S * .3, -S * 1.2, S * .6, S * .22, S * .05); c.fill(); c.fillStyle = h.accent; art.star(c, 0, -S * 1.09, S * .08, h.accent, 0);
    },
    cabin(c, S, h, t, season) {
      c.fillStyle = '#9a6a44'; art.rr(c, -S * .72, -S * .7, S * 1.44, S * .7, S * .04); c.fill(); c.strokeStyle = 'rgba(60,35,20,.4)'; c.lineWidth = S * .03; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-S * .72, -S * .14 * i); c.lineTo(S * .72, -S * .14 * i); c.stroke(); }
      c.fillStyle = h.roof; c.beginPath(); c.moveTo(-S * .88, -S * .68); c.lineTo(0, -S * 1.35); c.lineTo(S * .88, -S * .68); c.closePath(); c.fill();
      if (season === 'winter') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-S * .9, -S * .66); c.lineTo(0, -S * 1.37); c.lineTo(S * .9, -S * .66); c.lineTo(S * .78, -S * .64); c.lineTo(0, -S * 1.2); c.lineTo(-S * .78, -S * .64); c.closePath(); c.fill(); }
      c.fillStyle = '#7a5638'; c.fillRect(S * .3, -S * 1.28, S * .16, S * .4);
      HOUSE.door(c, S, { door: '#6a4a30' }, -S * .15, -S * .48, S * .32, S * .48); HOUSE.win(c, S, S * .2, -S * .5, S * .28);
    },
    hut(c, S, h, t, season) {
      c.fillStyle = h.wall; art.rr(c, -S * .6, -S * .62, S * 1.2, S * .62, S * .04); c.fill();
      for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#fff' : h.accent; c.fillRect(-S * .6 + i * S * .24, -S * .62, S * .12, S * .62); }
      c.fillStyle = '#e8c477'; c.beginPath(); c.moveTo(-S * .8, -S * .6); c.lineTo(0, -S * 1.3); c.lineTo(S * .8, -S * .6); c.closePath(); c.fill(); c.strokeStyle = 'rgba(160,110,40,.5)'; c.lineWidth = S * .025; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * S * .1, -S * 1.2 + Math.abs(i) * S * .08); c.lineTo(i * S * .21, -S * .62); c.stroke(); }
      if (season === 'winter') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -S * 1.28, S * .22, S * .07, 0, 0, TAU); c.fill(); }
      HOUSE.door(c, S, { door: '#7a5638' }, -S * .17, -S * .46, S * .34, S * .46);
    },
    door(c, S, h, x, y, w, ht) {
      const o = h.open || 0;
      c.fillStyle = o > .05 ? '#3a2a30' : (h.door || '#9a6a44'); art.rr(c, x, y, w, ht, w * .3); c.fill();
      if (o > .05) { c.fillStyle = 'rgba(255,224,150,.5)'; art.rr(c, x + w * .1, y + ht * .12, w * .8, ht * .86, w * .25); c.fill(); c.fillStyle = h.door || '#9a6a44'; c.beginPath(); c.moveTo(x, y + ht * .1); c.lineTo(x - w * .5 * o, y + ht * .02); c.lineTo(x - w * .5 * o, y + ht); c.lineTo(x, y + ht); c.closePath(); c.fill(); }
      else { c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(x + w * .78, y + ht * .55, w * .07, 0, TAU); c.fill(); }
    },
    win(c, S, x, y, w) {
      c.fillStyle = '#bfe9ff'; art.rr(c, x, y, w, w, w * .12); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = w * .1; c.strokeRect(x, y, w, w); c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + w); c.moveTo(x, y + w / 2); c.lineTo(x + w, y + w / 2); c.stroke();
    }
  };
  const LAND = {
    well(c, S, t, L) {
      c.fillStyle = '#b9b3a8'; art.rr(c, -S * .4, -S * .45, S * .8, S * .45, S * .08); c.fill(); c.strokeStyle = 'rgba(70,60,50,.25)'; c.lineWidth = S * .02; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-S * .4, -S * .11 * i - S * .06); c.lineTo(S * .4, -S * .11 * i - S * .06); c.stroke(); }
      c.fillStyle = '#4fb6e6'; c.beginPath(); c.ellipse(0, -S * .45, S * .32, S * .08, 0, 0, TAU); c.fill();
      c.fillStyle = '#9a6a44'; c.fillRect(-S * .38, -S * 1.05, S * .06, S * .62); c.fillRect(S * .32, -S * 1.05, S * .06, S * .62);
      c.fillStyle = '#e8574a'; c.beginPath(); c.moveTo(-S * .52, -S * 1.0); c.lineTo(0, -S * 1.38); c.lineTo(S * .52, -S * 1.0); c.closePath(); c.fill();
      c.strokeStyle = '#6a4a30'; c.lineWidth = S * .025; c.beginPath(); c.moveTo(0, -S * 1.0); c.lineTo(0, -S * .62); c.stroke(); c.fillStyle = '#c98b5b'; art.rr(c, -S * .08, -S * .64, S * .16, S * .12, S * .03); c.fill();
      for (let i = 0; i < 4; i++) { const k = ((t * .5 + i / 4 + (L.pulse || 0) * .3) % 1); c.globalAlpha = Math.sin(k * Math.PI) * (.35 + (L.pulse || 0)); art.star(c, Math.sin(i * 2.3) * S * .25, -S * (.55 + k * 1.2), S * .07, '#ffe27a', t + i); } c.globalAlpha = 1;
    },
    windmill(c, S, t, L) {
      c.fillStyle = '#e6d6bd'; c.beginPath(); c.moveTo(-S * .38, 0); c.lineTo(-S * .24, -S * 1.25); c.lineTo(S * .24, -S * 1.25); c.lineTo(S * .38, 0); c.closePath(); c.fill();
      c.fillStyle = '#d9c6a8'; c.beginPath(); c.moveTo(S * .1, 0); c.lineTo(S * .38, 0); c.lineTo(S * .24, -S * 1.25); c.lineTo(S * .05, -S * 1.25); c.closePath(); c.fill();
      c.fillStyle = '#e8574a'; c.beginPath(); c.moveTo(-S * .32, -S * 1.22); c.lineTo(0, -S * 1.6); c.lineTo(S * .32, -S * 1.22); c.closePath(); c.fill();
      HOUSE.door(c, S, { door: '#8a5a3a' }, -S * .12, -S * .36, S * .24, S * .36); HOUSE.win(c, S, -S * .08, -S * .85, S * .16);
      c.save(); c.translate(0, -S * 1.15); c.rotate(L.spin || 0); c.fillStyle = '#fff'; c.strokeStyle = '#a9743f'; c.lineWidth = S * .045;
      for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -S * .8); c.stroke(); c.fillRect(S * .03, -S * .78, S * .2, S * .45); c.restore(); }
      c.fillStyle = '#a9743f'; c.beginPath(); c.arc(0, 0, S * .07, 0, TAU); c.fill(); c.restore();
    },
    fountain(c, S, t, L) {
      c.fillStyle = '#c9c4b8'; c.beginPath(); c.ellipse(0, -S * .15, S * .62, S * .2, 0, 0, TAU); c.fill(); c.fillStyle = '#4fb6e6'; c.beginPath(); c.ellipse(0, -S * .2, S * .55, S * .15, 0, 0, TAU); c.fill();
      c.fillStyle = '#b3aea2'; c.fillRect(-S * .07, -S * .75, S * .14, S * .6); c.beginPath(); c.ellipse(0, -S * .62, S * .3, S * .08, 0, 0, TAU); c.fill();
      const p = L.pulse || 0; c.strokeStyle = `rgba(190,235,255,${(.8).toFixed(2)})`; c.lineWidth = S * .035; c.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, -S * .78); c.quadraticCurveTo(i * S * (.18 + p * .1), -S * (1.2 + p * .25 + Math.sin(t * 5 + i) * .03), i * S * (.34 + p * .15), -S * .2); c.stroke(); }
      if (p > .05) { c.globalAlpha = Math.min(1, p); ['#ff6b81', '#ffa64d', '#ffe066', '#7ed957', '#5cc8f2'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = S * .05; c.beginPath(); c.arc(0, -S * .3, S * (1.0 - i * .08), Math.PI, TAU); c.stroke(); }); c.globalAlpha = 1; }
    },
    magictree(c, S, t, L) {   // a big old tree hung with little lanterns, with fireflies
      c.fillStyle = '#7a5a48'; c.beginPath(); c.moveTo(-S * .3, 0); c.quadraticCurveTo(-S * .18, -S * .6, -S * .15, -S * 1.0); c.lineTo(S * .15, -S * 1.0); c.quadraticCurveTo(S * .18, -S * .6, S * .3, 0); c.closePath(); c.fill();
      c.fillStyle = L.leaf1 || '#4aa64f'; for (const [x, y, r] of [[-.5, -1.3, .5], [.5, -1.3, .5], [0, -1.7, .62], [-.15, -1.25, .55], [.3, -1.05, .4], [-.4, -1.0, .35]]) { c.beginPath(); c.arc(x * S, y * S, r * S, 0, TAU); c.fill(); }
      c.fillStyle = L.leaf2 || '#5cb85c'; for (const [x, y, r] of [[-.2, -1.8, .28], [.4, -1.5, .22]]) { c.beginPath(); c.arc(x * S, y * S, r * S, 0, TAU); c.fill(); }
      const lit = L.pulse || 0; [[-.5, -1.0, '#ffd54a'], [.3, -.95, '#ff9ec8'], [-.1, -1.35, '#9fe6ff'], [.55, -1.3, '#ffe27a'], [-.6, -1.35, '#c9a8ff']].forEach(([x, y, col], i) => { c.fillStyle = col; c.globalAlpha = .55 + Math.sin(t * 3 + i * 1.7) * .25 + lit * .2; c.beginPath(); c.arc(x * S, y * S, S * .075, 0, TAU); c.fill(); c.globalAlpha = .18; c.beginPath(); c.arc(x * S, y * S, S * .18, 0, TAU); c.fill(); });
      c.globalAlpha = 1; for (let i = 0; i < 6; i++) { const a = t * .6 + i * 1.1; c.fillStyle = '#fff6a0'; c.globalAlpha = .5 + Math.sin(t * 4 + i) * .4; c.beginPath(); c.arc(Math.cos(a) * S * (.7 + i * .05), -S * (.5 + Math.abs(Math.sin(a * 1.3)) * 1.2), S * .03, 0, TAU); c.fill(); } c.globalAlpha = 1;
    },
    lighthouse(c, S, t, L) {
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-S * .36, 0); c.lineTo(-S * .22, -S * 1.5); c.lineTo(S * .22, -S * 1.5); c.lineTo(S * .36, 0); c.closePath(); c.fill();
      c.fillStyle = '#e8574a'; for (const [y0, y1, w0, w1] of [[-.3, -.6, .33, .3], [-.9, -1.2, .27, .24]]) { c.beginPath(); c.moveTo(-S * w0, y0 * S); c.lineTo(S * w0, y0 * S); c.lineTo(S * w1, y1 * S); c.lineTo(-S * w1, y1 * S); c.closePath(); c.fill(); }
      c.fillStyle = '#ffd54a'; c.fillRect(-S * .2, -S * 1.72, S * .4, S * .22); c.fillStyle = '#4a4a5a'; c.beginPath(); c.moveTo(-S * .3, -S * 1.72); c.lineTo(0, -S * 2.0); c.lineTo(S * .3, -S * 1.72); c.closePath(); c.fill(); c.fillRect(-S * .3, -S * 1.52, S * .6, S * .06);
      const a = (t * 1.1 + (L.pulse || 0) * 4) % TAU, k = Math.max(0, Math.cos(a)); c.globalAlpha = .2 + k * .45; c.fillStyle = '#fff6b0'; c.beginPath(); c.moveTo(0, -S * 1.62); c.lineTo(S * 1.8 * Math.sign(Math.cos(a) || 1), -S * 1.9); c.lineTo(S * 1.8 * Math.sign(Math.cos(a) || 1), -S * 1.3); c.closePath(); c.fill(); c.globalAlpha = 1;
      HOUSE.door(c, S, { door: '#8a5a3a' }, -S * .1, -S * .3, S * .2, S * .3);
    },
    sign(c, S, t, L) {
      c.fillStyle = '#9a6a44'; c.fillRect(-S * .05, -S * .85, S * .1, S * .85); c.fillStyle = '#d9a06c'; c.beginPath(); c.moveTo(-S * .3, -S * .8); c.lineTo(S * .28, -S * .8); c.lineTo(S * .46, -S * .64); c.lineTo(S * .28, -S * .48); c.lineTo(-S * .3, -S * .48); c.closePath(); c.fill(); c.strokeStyle = '#a9743f'; c.lineWidth = S * .02; c.stroke();
      c.fillStyle = '#7a5638'; for (const [x, y] of [[-.12, -.62], [.06, -.7]]) { c.beginPath(); c.ellipse(x * S, y * S, S * .045, S * .06, .3, 0, TAU); c.fill(); }
    }
  };

  /* ---------------------------------------------------------------- the world: five places joined by a trail, the same every time */
  const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const seasonNow = () => { const m = new Date().getMonth() + 1; return m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn'; };
  const mixHex = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const FRIENDS = ['bunny', 'cat', 'bear', 'fox', 'frog', 'panda', 'dog', 'hamster', 'duck', 'lamb', 'mouse', 'penguin', 'elephant', 'unicorn', 'babydino'];
  // Every kind of friend, so that nobody hiding in a later place is the same kind as a friend who already tags along (19 hide in one adventure, 21 kinds exist).
  const ALL_FRIENDS = FRIENDS.concat(['pig', 'owl', 'trike', 'stego', 'bronto', 'trex']);
  // The five places. Each is a square map with a trail from the west gate to the east gate, houses beside it, a special landmark near the
  // east gate, and friends hiding. They never change; only the season (spring, summer, autumn, winter) changes how they look.
  const MAPS = [
    { id: 'meadow', name: 'Sunny Meadow', biome: 'meadow', friends: 3, spots: 12, houses: ['cottage', 'cottage'], land: 'well', pond: true },
    { id: 'farm', name: 'Berry Farm', biome: 'farm', friends: 3, spots: 12, houses: ['barn', 'cottage'], land: 'windmill' },
    { id: 'village', name: 'Little Village', biome: 'village', friends: 4, spots: 13, houses: ['shop', 'cottage', 'shop', 'cottage'], land: 'fountain' },
    { id: 'woods', name: 'Whispering Woods', biome: 'woods', friends: 4, spots: 13, houses: ['cabin'], land: 'magictree', pond: true, forest: true },
    { id: 'beach', name: 'Sandy Beach', biome: 'beach', friends: 5, spots: 13, houses: ['hut', 'hut'], land: 'lighthouse', sea: true }
  ];
  const BASE = { meadow: ['#9fd88a', '#86cc74', '#7fc46b', '#e9d5a8'], farm: ['#cfe28c', '#b9d474', '#a9c862', '#ecd9a6'], village: ['#b8dc9a', '#a3d083', '#98c677', '#d9ccb8'], woods: ['#86c885', '#6fb870', '#62a966', '#dcc8a0'], beach: ['#f7e5b0', '#f0d894', '#e8cc84', '#fff3cc'] };
  function palette(M, season) {
    const g = BASE[M.biome].slice(), sand = M.biome === 'beach';
    const tint = (c, i) => season === 'spring' ? mixHex(c, '#d9f5a8', sand ? .05 : .25) : season === 'autumn' ? mixHex(c, '#d6b25a', sand ? .12 : i === 3 ? .2 : .45) : season === 'winter' ? mixHex(c, i === 3 ? '#dce8f5' : '#f2f8ff', sand ? .75 : i === 3 ? .6 : .88) : c;
    const [a, b, patch, path] = g.map(tint);
    const tree = { summer: ['#4aa64f', '#5cb85c', '#6fc46f'], spring: ['#6fc46f', '#8ad67a', '#a6e08a'], autumn: ['#e8873a', '#d9622b', '#f2b83a'], winter: ['#6f9a86', '#5f8a76', '#7fb09a'] }[season];
    const bush = { summer: ['#5cb85c', '#7ed957', '#4aa64f'], spring: ['#7ed98a', '#9fe6a0', '#6fcf7a'], autumn: ['#d98a3a', '#c9602b', '#e8b04a'], winter: ['#6f9a86', '#82ae98', '#5f8a76'] }[season];
    const dots = { summer: '#ff6b81', spring: '#ffc0d6', autumn: '#7a3b1a', winter: '#fff' }[season];
    const flowers = { summer: ['#ff8aa3', '#ffd54a', '#fff', '#7fd4f5'], spring: ['#ff8aa3', '#fff', '#ffd54a', '#b58cf0'], autumn: ['#e8873a', '#d9622b', '#f2b83a', '#c9852b'], winter: ['#fff', '#cfe6ff'] }[season];
    const palm = ['#3fae7a', '#55c48a', '#7ed9a0'], snow = season === 'winter';
    const T = { cols: M.biome === 'beach' ? palm : tree, snow, trunk: M.biome === 'beach' ? '#b9905a' : '#8a6448' };
    const B = { cols: M.biome === 'beach' ? ['#3fae7a', '#55c48a', '#2f9a6a'] : bush, dots: M.biome === 'beach' ? '#ffd54a' : dots };
    const defs = {
      meadow: [['bush', B], ['bush', { cols: bush.map(c => mixHex(c, '#ffffff', .12)), dots }], ['rock', {}], ['hay', {}], ['tree', T], ['log', { snow }]],
      farm: [['hay', {}], ['crate', {}], ['pumpkin', {}], ['bush', B], ['tree', Object.assign({}, T, { apples: season !== 'winter' })], ['barrel', {}], ['log', { snow }]],
      village: [['crate', {}], ['barrel', {}], ['bush', B], ['rock', {}], ['hay', {}], ['tree', T]],
      woods: [['mushroom', {}], ['log', { bark: '#7a5638', core: '#c9a070', snow }], ['rock', { hi: '#8c96ad', lo: '#68738c', cap: '#4f8a6a' }], ['bush', B], ['pine', { col: snow ? '#4f7f6f' : '#3f8f66', snow }], ['stump', {}], ['tree', T]],
      beach: [['mound', { col: '#f2d78e', shade: 'rgba(200,150,60,.25)' }], ['bush', B], ['rock', { hi: '#e6d8bd', lo: '#c9b48c', cap: '#7fbf9a' }], ['crate', {}], ['tree', T], ['boat', {}]]
    }[M.biome];
    const border = M.biome === 'woods' ? ['pine', { col: snow ? '#4f7f6f' : '#3f8f66', snow }] : ['tree', T];
    return { ground: [a, b], patch, path, defs, border, flowers, tree: T, night: false, grass: snow ? '#9fb8cf' : season === 'autumn' ? '#b98a3a' : '#6fc26a', ice: snow };
  }
  const HOUSE_COLORS = [['#ffe3c4', '#e8735a', '#ff8aa3'], ['#fff3b0', '#6fa8e8', '#ffa64d'], ['#ffd6e4', '#8a66cf', '#ff6b81'], ['#d6f0e0', '#e8574a', '#59b96e'], ['#e3f0ff', '#d96a4a', '#5cc8f2']];

  // ---- one place's layout, in fractions (0 to 1) of its square. Built from a fixed seed, so it is identical every visit.
  const layouts = {};
  function layoutFor(M, index) {
    if (layouts[M.id]) return layouts[M.id];
    const R = rng(hash('sprout:' + M.id)), jit = a => (R() - .5) * a;
    const y0 = .5 + jit(.14), y1 = .5 + jit(.14), ys = [y0, y0 + jit(.1)];
    for (let i = 0; i < 3; i++) ys.push(clamp(.5 + jit(.38), .24, .76));
    ys.push(y1 + jit(.08), y1);
    const xs = [0, .15, .32, .5, .68, .85, 1], wp = xs.map((x, i) => [x, clamp(ys[i], .2, .8)]);
    // a smooth curve through the waypoints (sampled)
    const trail = [];
    for (let i = 0; i < wp.length - 1; i++) {
      const p0 = wp[Math.max(0, i - 1)], p1 = wp[i], p2 = wp[i + 1], p3 = wp[Math.min(wp.length - 1, i + 2)];
      for (let k = 0; k < 14; k++) { const u = k / 14, u2 = u * u, u3 = u2 * u; trail.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); }
    }
    trail.push(wp[wp.length - 1]);
    const dTrail = (x, y) => { let d = 1e9; for (const p of trail) d = Math.min(d, Math.hypot(p[0] - x, p[1] - y)); return d; };
    const at = u => trail[clamp(Math.round(u * (trail.length - 1)), 0, trail.length - 1)];
    // houses and landmarks beside the trail
    const lands = [], taken = [];
    const put = (kind, u, side, off, extra) => { const p = at(u); let fx = clamp(p[0] + (kind === 'sign' ? 0 : 0), .08, .92), fy = p[1] + side * off; fy = clamp(fy, .12, M.sea ? .76 : .9); const o = Object.assign({ kind, fx, fy }, extra); lands.push(o); taken.push([fx, fy, kind === 'sign' ? .05 : .12]); return o; };
    put('sign', .1, 1, .06, {});
    M.houses.forEach((st, i) => { const u = .2 + (i + .5) * (.55 / M.houses.length), side = i % 2 ? 1 : -1, c = HOUSE_COLORS[(hash(M.id) + i * 2) % HOUSE_COLORS.length]; put('house', u, side, .15 + R() * .03, { style: st, wall: c[0], roof: c[1], accent: c[2], door: '#9a6a44', resident: FRIENDS[(hash(M.id + i) >>> 3) % FRIENDS.length], open: 0 }); });
    put(M.land, .88, M.id === 'beach' ? -1 : 1, .13, { pulse: 0 });
    const pond = M.pond ? (() => { for (let i = 0; i < 40; i++) { const fx = .2 + R() * .6, fy = .2 + R() * .6; if (dTrail(fx, fy) > .2 && taken.every(t => Math.hypot(fx - t[0], fy - t[1]) > .22)) return { fx, fy, rx: .075, ry: .045 }; } return null; })() : null;
    if (pond) taken.push([pond.fx, pond.fy, .1]);
    // hiding places: away from the trail, the houses, the pond and each other
    const spots = [];
    for (let tries = 0; spots.length < M.spots && tries < 3000; tries++) {
      const fx = .09 + R() * .82, fy = .1 + R() * (M.sea ? .64 : .8);
      if (dTrail(fx, fy) < .085 || taken.some(t => Math.hypot(fx - t[0], fy - t[1]) < t[2] + .06) || spots.some(s => Math.hypot(fx - s.fx, fy - s.fy) < .115)) continue;
      spots.push({ fx, fy }); taken.push([fx, fy, .04]);
    }
    // trees around the edge (leaving the gates open), and a real forest in the woods
    const trees = [], step = .036, gw = y0, ge = y1;
    for (let x = 0; x <= 1.0001; x += step) { trees.push({ fx: x, fy: .012, seed: x * 100 }); if (!M.sea) trees.push({ fx: x, fy: .992, seed: x * 100 + 7 }); }
    for (let y = step; y < 1 - step * .5; y += step) {
      if (!(index > 0 && Math.abs(y - gw) < .07)) trees.push({ fx: .008, fy: y, seed: y * 100 });
      if (!(Math.abs(y - ge) < .07)) trees.push({ fx: .992, fy: y, seed: y * 100 + 3 });
    }
    if (M.forest) for (let i = 0, n = 0; i < 400 && n < 46; i++) { const fx = .06 + R() * .88, fy = .06 + R() * .88; if (dTrail(fx, fy) < .11 || taken.some(t => Math.hypot(fx - t[0], fy - t[1]) < t[2] + .05) || trees.some(t => t.inner && Math.hypot(fx - t.fx, fy - t.fy) < .06)) continue; trees.push({ fx, fy, seed: i * 13, inner: true }); n++; }
    const decor = []; for (let i = 0; i < 150; i++) { const fx = .03 + R() * .94, fy = .05 + R() * (M.sea ? .78 : .9); decor.push({ fx, fy, kind: i % 5 === 0 ? 'grass' : 'flower', k: i, s: .6 + R() * .7 }); }
    const patches = Array.from({ length: 90 }, () => ({ fx: R(), fy: R(), s: .5 + R() * 1.2 }));
    return (layouts[M.id] = { trail, wp, spots, lands, trees, decor, patches, pond, gateW: [0, y0], gateE: [1, y1] });
  }

  const LAND_SOLID = { house: .62, well: .38, windmill: .4, fountain: .55, magictree: .3, lighthouse: .32, sign: .12 };
  const LAND_HIT = { cottage: [.9, 1.5], barn: [.9, 1.25], shop: [.85, 1.25], cabin: [.9, 1.4], hut: [.85, 1.3], well: [.55, 1.4], windmill: [.9, 1.9], fountain: [.65, 1.3], magictree: [.9, 2.2], lighthouse: [.45, 2.0], sign: [.45, .9] };
  const landKey = o => (o.kind === 'house' ? o.style : o.kind);

  class HideGame {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'game-canvas';
      host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      const b = this.bag = store.bag('hide', () => ({ found: 0, rounds: 0, map: 0, loop: 0, maps: {}, team: [] }));
      b.found = b.found || 0; b.rounds = b.rounds || 0; b.map = clamp(b.map | 0, 0, MAPS.length - 1); b.loop = b.loop || 0; b.maps = b.maps || {}; b.team = Array.isArray(b.team) ? b.team : [];
      this.counter = SPG.ui.counter(host, (c, s) => { c.strokeStyle = '#5a3f5e'; c.lineWidth = s * .09; c.lineCap = 'round'; c.beginPath(); c.arc(s * .42, s * .42, s * .22, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(s * .58, s * .58); c.lineTo(s * .76, s * .76); c.stroke(); }, b.found);
      this.fx = new art.Fx(); this.t = 0; this.running = false; this.since = 0; this.state = 'play'; this.stateT = 0; this.wonK = 0;
      this.season = seasonNow(); this.me = { x: 0, y: 0, dir: 1, walk: 0, moving: false };
      this.goal = null; this.want = null; this.steer = null; this.keys = {}; this.cam = { x: 0, y: 0 }; this.bumpT = 0; this.fade = 1; this.fadeTo = null; this.lockSay = 0; this.snake = []; this.team = []; this.flyers = [];
      this.tick = this.tick.bind(this);
      const cv = this.canvas, at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height }; };
      cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* optional */ } SPG.audio.unlock(); const p = at(e); this.steer = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false }; });
      cv.addEventListener('pointermove', e => { const s = this.steer; if (!s || s.id !== e.pointerId) return; e.preventDefault(); const p = at(e); s.x = p.x; s.y = p.y; if (Math.hypot(p.x - s.sx, p.y - s.sy) > 14) s.moved = true; });
      for (const n of ['pointerup', 'pointercancel']) cv.addEventListener(n, e => { const s = this.steer; if (!s || s.id !== e.pointerId) return; this.steer = null; if (!s.moved) this.tapAt(s.x, s.y); });
      this.onKey = e => { this.keys[e.key] = e.type === 'keydown'; };
      addEventListener('keydown', this.onKey); addEventListener('keyup', this.onKey);
      this.mi = b.map; this.pendingFrom = 'start';
    }

    /* ---------------------------------------------------------------- the world */
    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.w = r.width; this.h = r.height;
      const dpr = SPG.ui.dpr();
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ui = clamp(Math.min(this.w, this.h * 1.4) / 780, .6, 1.4);
      this.S = clamp(Math.min(this.w, this.h) * .28, 80, 240);
      const side = Math.max(this.w * 2.3, this.h * 2.6, this.S * 12.5);
      const was = this.WW; this.WW = this.WH = side;   // every place is a square
      if (this.loaded && was && was !== side) {   // the phone turned: the world is a new size, so she and her friends keep their place in it
        const k = side / was, sc = o => { if (o) { o.x *= k; o.y *= k; } };
        [this.me, this.goal, this.cam, ...this.team, ...this.snake].forEach(sc);
      }
      if (!this.loaded) { this.loaded = true; this.loadMap(this.mi, this.pendingFrom); } else this.place();
      this.draw();
    }
    // Set up one place: its fixed layout, who is hiding where (also fixed, until the whole adventure starts again), and what has been looked at.
    loadMap(i, from) {
      this.mi = i; this.bag.map = i; const M = this.M = MAPS[i], L = this.L = layoutFor(M, i);
      this.pal = palette(M, this.season);
      let pr = this.bag.maps[M.id]; if (!pr || pr.loop !== this.bag.loop) pr = this.bag.maps[M.id] = { loop: this.bag.loop, found: [], chk: [], done: false, kinds: null };
      const legacy = !pr.kinds && (pr.found.length || pr.chk.length);   // progress saved before the kinds were saved with it
      this.progress = pr;
      // how many friends hide here: fewer for toddlers, one more for big kids (a friend already found always stays)
      const t = SPG.level.tier('hide'), want = t === 1 ? Math.max(2, M.friends - 1) : t === 3 ? Math.max(M.friends, 4) : M.friends;   // 2-4 / 3-5 / 4-5: at most 21 friends in a whole adventure, and there are 21 kinds
      const R = rng(hash(M.id + ':' + this.bag.loop)), order = L.spots.map((_, k) => k).sort(() => R() - .5);
      const idx = order.slice(0, want); for (const k of pr.found) if (!idx.includes(k)) idx.push(k);
      // Who hides where is decided once for each place and then saved, and never repeats a kind from the earlier places in this adventure
      // (so the friends that tag along are never "replaced" by lookalikes in the next place).
      // (kinds are added one by one as a place needs them, so a later place can always find kinds nobody before it used)
      const before = new Set(); for (let j = 0; j < i; j++) { const q = this.bag.maps[MAPS[j].id]; if (q && q.loop === this.bag.loop && q.kinds) q.kinds.forEach(k => before.add(k)); }
      if (!pr.kinds) { pr.kinds = []; if (legacy) { const old = FRIENDS.slice().sort(() => R() - .5); pr.kinds = FRIENDS.map((_, k) => old[(k + i * 3) % old.length]).slice(0, M.friends); } }   // a save from before: exactly who was hiding
      if (pr.kinds.length < idx.length) {
        const RK = rng(hash('kinds:' + M.id + ':' + this.bag.loop)), pool = ALL_FRIENDS.slice().sort(() => RK() - .5);
        for (const k of pool.filter(k => !before.has(k)).concat(pool.filter(k => before.has(k)))) { if (pr.kinds.length >= idx.length) break; if (!pr.kinds.includes(k)) pr.kinds.push(k); }
      }
      this.friendAt = new Map(idx.map((si, k) => [si, pr.kinds[k % pr.kinds.length]]));
      this.spots = L.spots.map((o, k) => ({ fx: o.fx, fy: o.fy, idx: k, kind: this.pal.defs[k % this.pal.defs.length][0], pal: this.pal.defs[k % this.pal.defs.length][1], friend: this.friendAt.has(k) ? { kind: this.friendAt.get(k), found: pr.found.includes(k) } : null, checked: pr.chk.includes(k), shake: 0, halo: 0, haloK: 0 }));
      this.lands = L.lands.map(o => Object.assign({ spin: 0, pulse: 0 }, o));
      this.state = 'play'; this.stateT = 0; this.wonK = 0; this.since = 0; this.goal = null; this.want = null; this.fx.p.length = 0; this.flyers = [];
      this.parts = [];
      this.place();
      const S = this.S, WW = this.WW, gw = this.gateW, ge = this.gateE;
      const startX = from === 'west' ? S * 1.15 : from === 'east' ? WW - S * 1.15 : S * 1.9, startY = from === 'west' ? gw.y : from === 'east' ? ge.y : gw.y;
      this.me.x = startX; this.me.y = startY; this.me.placed = true; this.me.dir = from === 'east' ? -1 : 1;
      // her friends come along: they stand in a line behind her
      this.team = this.bag.team.map((k, n) => ({ kind: k, x: startX - this.me.dir * (n + 1) * S * .5, y: startY + (n % 2 ? 1 : -1) * S * .05, dir: this.me.dir, hop: 0 }));
      this.snake = []; for (let n = 60; n >= 0; n--) this.snake.push({ x: startX - this.me.dir * n * S * .12, y: startY });
      this.first = true;
      const all = this.spots.filter(q => q.friend).every(q => q.friend.found); this.gateOpen = pr.done || all ? 1 : 0; if (all && !pr.done) pr.done = true;
      this.fadeTo = null; this.fade = 1;
      store.save();
      voice.say(from === 'start' ? 'hide-start' : 'hide-new');
    }
    place() {
      if (!this.L) return;
      const L = this.L, WW = this.WW, WH = this.WH, S = this.S;
      for (const o of this.spots) { o.x = o.fx * WW; o.y = o.fy * WH; o.r = S * .3; }
      this.trees = L.trees.map(o => ({ x: o.fx * WW, y: o.fy * WH, r: S * .16, seed: o.seed }));
      this.decor = L.decor.map(o => Object.assign({}, o, { x: o.fx * WW, y: o.fy * WH }));
      for (const o of this.lands) { o.x = o.fx * WW; o.y = o.fy * WH; o.r = S * (LAND_SOLID[o.kind] || .3); }
      this.pathPts = L.trail.map(p => ({ x: p[0] * WW, y: p[1] * WH }));
      this.pondAt = L.pond ? { x: L.pond.fx * WW, y: L.pond.fy * WH, rx: WW * L.pond.rx, ry: WH * L.pond.ry } : null;
      this.gateW = { x: S * .42, y: L.gateW[1] * WH }; this.gateE = { x: WW - S * .42, y: L.gateE[1] * WH };
      this.me.x = clamp(this.me.x, S * .3, WW - S * .3); this.me.y = clamp(this.me.y, S * .9, WH - S * .3);
    }
    complete() { return this.spots.every(q => !q.friend || q.friend.found); }
    start() { this.resize(); this.resume(); }
    resume() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    pause() { this.running = false; cancelAnimationFrame(this.raf); this.steer = null; store.save(); }
    destroy() { this.pause(); removeEventListener('keydown', this.onKey); removeEventListener('keyup', this.onKey); this.canvas.remove(); this.counter.el.remove(); }

    /* ---------------------------------------------------------------- walking, looking, tapping */
    toWorld(x, y) { return { x: x + this.cam.x, y: y + this.cam.y }; }
    mm() { const mw = Math.min(this.w * .26, this.h * .3, 170); return { x: 14, y: 96 * this.ui + 20, w: mw, h: mw }; }
    tapAt(sx, sy) {
      if (this.state !== 'play' || this.fadeTo) return;
      const m = this.mm();
      if (sx > m.x && sx < m.x + m.w && sy > m.y && sy < m.y + m.h) { this.goal = { x: (sx - m.x) / m.w * this.WW, y: (sy - m.y) / m.h * this.WH }; this.want = null; sfx.tap(); return; }   // the little map: walk there
      const p = this.toWorld(sx, sy), S = this.S;
      this.since = 0;
      let best = null, bd = 1e9;
      for (const o of this.lands) { const hit = LAND_HIT[landKey(o)] || [.5, 1]; if (Math.abs(p.x - o.x) < hit[0] * S && p.y < o.y + S * .12 && p.y > o.y - hit[1] * S) { const d = Math.abs(p.x - o.x) + Math.abs(p.y - o.y); if (d < bd) { bd = d; best = { type: 'land', o }; } } }
      for (const sp of this.spots) { const hh = (SPOT_H[sp.kind] || .85) * S, d = Math.hypot(p.x - sp.x, p.y - (sp.y - hh * .45)); if (Math.abs(p.x - sp.x) < S * .55 && p.y < sp.y + S * .1 && p.y > sp.y - hh - S * .1 && d < bd + 1) { if (!best || best.type !== 'land' || d < bd) { bd = d; best = { type: 'spot', o: sp }; } } }
      if (best) { this.want = best; const o = best.o; this.goal = { x: o.x, y: o.y + (best.type === 'spot' ? o.r + S * .34 : S * .5) }; sfx.tap(); }
      else { this.want = null; this.goal = { x: p.x, y: p.y }; }
    }
    arrived(w) {
      if (w.type === 'spot') { this.look(w.o); return; }
      const o = w.o; sfx.chime();
      if (o.kind === 'house') { o.open = Math.max(o.open, .01); o.openT = 3.2; sfx.rustle(); }
      else { o.pulse = 1; if (o.kind === 'sign') this.fx.burst(o.x - this.cam.x, o.y - this.S * .8 - this.cam.y, 8, { colors: ['#ffe27a', '#fff'], speed: 120, g: -20, life: .8, size: 5 * this.ui, shape: 'star' }); else this.fx.burst(o.x - this.cam.x, o.y - this.S * 1.1 - this.cam.y, 16, { colors: RAINBOW, speed: 220, g: 220, life: 1, size: 6 * this.ui, shape: 'star', up: 120 }); }
    }
    // looked at a hiding place: a friend comes out and joins her, or it is empty and the closeness of the nearest friend is shown (snowflake, sun or flame)
    look(sp) {
      this.since = 0;
      if (sp.friend && !sp.friend.found) { this.reveal(sp); return; }
      sp.shake = 1; sfx.rustle();
      if (!sp.checked) { sp.checked = true; this.progress.chk.push(sp.idx); store.save(); }
      let near = 1e9; for (const q of this.spots) if (q.friend && !q.friend.found) near = Math.min(near, Math.hypot(q.x - sp.x, q.y - sp.y));
      if (near < 1e9) { const k = clamp(1 - near / (this.WW * .28), 0, 1); sp.haloK = k; sp.halo = 1; setTimeout(() => sfx.warm(k), 180); }
    }
    reveal(sp) {
      const f = sp.friend; f.found = true; sp.checked = true; sp.shake = 1; this.since = 0;
      if (!this.progress.found.includes(sp.idx)) this.progress.found.push(sp.idx); if (!this.progress.chk.includes(sp.idx)) this.progress.chk.push(sp.idx);
      this.bag.found++; this.counter.set(this.bag.found); this.bag.team.push(f.kind);
      this.team.push({ kind: f.kind, x: sp.x + this.S * .4, y: sp.y + this.S * .1, dir: 1, hop: 1, fresh: 1 });
      sfx.pop(); setTimeout(() => sfx.win(), 120); SPG.pets.noise(f.kind);
      this.fx.burst(sp.x - this.cam.x, sp.y - this.S * .5 - this.cam.y, 18, { colors: RAINBOW, speed: 260, g: 360, life: 1, size: 6 * this.ui, shape: 'confetti', up: 200 });
      voice.say('hide-found'); store.save();
      if (this.complete() && !this.progress.done) this.mapDone();
    }
    mapDone() {
      this.progress.done = true; this.gateOpen = 0; this.state = 'celebrate'; this.stateT = 0; store.addStars(1); store.save();
      setTimeout(() => { if (!this.running) return; sfx.cheer(); voice.say(this.mi === MAPS.length - 1 ? 'hide-done' : 'hide-gate'); }, 700);
    }
    // through a gate to the next (or the previous) place; the last gate leads home, and then the whole adventure starts again with everyone hiding anew
    leave(dir) {
      if (this.fadeTo) return;
      if (dir > 0 && !this.progress.done) { this.bounce(dir); return; }
      if (dir < 0 && this.mi === 0) { this.bounce(dir); return; }
      sfx.whoosh();
      if (dir > 0 && this.mi === MAPS.length - 1) { this.fadeTo = { home: true, delay: 3.4 }; this.state = 'party'; this.stateT = 0; this.bag.loop++; this.bag.team = []; this.bag.maps = {}; this.bag.map = 0; store.save(); sfx.cheer(); voice.say('hide-home'); store.addStars(2); this.fx.burst(this.w / 2, this.h * .4, 40, { colors: RAINBOW, speed: 380, g: 300, life: 1.6, size: 8 * this.ui, shape: 'confetti', up: 220 }); return; }
      this.fadeTo = { map: this.mi + dir, from: dir > 0 ? 'west' : 'east' };
    }
    bounce(dir) {
      this.me.x -= dir * this.S * .9; this.goal = null; this.want = null; this.gateShake = 1; sfx.oops();
      if (this.t - this.lockSay > 9) { this.lockSay = this.t; voice.say(dir > 0 ? 'hide-locked' : 'hide-start'); }
    }

    tick(now) {
      if (!this.running) return;
      const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt; this.stateT += dt; this.since += dt; this.bumpT = Math.max(0, this.bumpT - dt);
      this.update(dt);
      this.draw(); this.raf = requestAnimationFrame(this.tick);
    }
    update(dt) {
      if (!this.L) return;
      const me = this.me, S = this.S, PR = S * .16, play = this.state === 'play' || this.state === 'celebrate';
      // fading between places
      if (this.fadeTo && this.fadeTo.delay > 0) this.fadeTo.delay -= dt;
      else if (this.fadeTo) {
        this.fade = Math.min(1, this.fade + dt * 2.2);
        if (this.fade >= 1) {
          const f = this.fadeTo; this.fadeTo = null;
          if (f.home) { this.state = 'play'; this.loadMap(0, 'start'); }   // the new adventure was already saved when she reached home
          else this.loadMap(f.map, f.from);
        }
      } else if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 1.8);
      // steering: hold and drag to walk that way; a tap sets a place to walk to
      let vx = 0, vy = 0;
      if (play && !this.fadeTo) {
        const st = this.steer;
        if (st && st.moved) { const w = this.toWorld(st.x, st.y); this.goal = { x: w.x, y: w.y }; this.want = null; }
        if (this.keys.ArrowLeft || this.keys.a) { vx -= 1; this.goal = null; } if (this.keys.ArrowRight || this.keys.d) { vx += 1; this.goal = null; }
        if (this.keys.ArrowUp || this.keys.w) { vy -= 1; this.goal = null; } if (this.keys.ArrowDown || this.keys.s) { vy += 1; this.goal = null; }
        if (this.goal) { const dx = this.goal.x - me.x, dy = this.goal.y - me.y, d = Math.hypot(dx, dy); if (d < 8) { this.goal = null; if (this.want) { const w = this.want; this.want = null; this.arrived(w); } } else { vx = dx / d; vy = dy / d; } }
      }
      const speed = S * 1.9, moving = vx || vy; me.moving = !!moving;
      if (moving) { const l = Math.hypot(vx, vy); me.x += vx / l * speed * dt; me.y += vy / l * speed * dt; if (Math.abs(vx) > .2) me.dir = vx > 0 ? 1 : -1; me.walk += dt * 9; }
      // solid things (hiding places, trees, houses, the landmark) stop her; touching a hiding place looks behind it
      const push = (o, r, sp) => { const dx = me.x - o.x, dy = (me.y - o.y) * 1.6, d = Math.hypot(dx, dy), min = r + PR; if (d < min && d > .01) { me.x = o.x + dx / d * min; me.y = o.y + (dy / d * min) / 1.6; } if (sp && this.bumpT <= 0 && this.state === 'play' && d < min + S * .12 && (sp.friend ? !sp.friend.found : !sp.checked)) { this.bumpT = .6; this.look(sp); } };
      for (const sp of this.spots) push(sp, sp.r, sp);
      // a hiding friend pops out beside its place every couple of seconds while she is nearby, so she can see where it is without relying on the arrow
      if (play && !this.fadeTo) {
        let nearest = null, nd = 1e9;
        for (const sp of this.spots) { if (sp.friend && !sp.friend.found) { const d = Math.hypot(me.x - sp.x, me.y - sp.y); if (d < nd) { nd = d; nearest = sp; } } }
        for (const sp of this.spots) {
          if (!(sp.friend && !sp.friend.found)) { sp.peekP = 0; continue; }
          const d = Math.hypot(me.x - sp.x, me.y - sp.y), near = d < S * 3.6;
          if (sp.peekP > 0) { sp.peekP += dt; if (sp.peekP > 1.3) sp.peekP = 0; }
          sp.peekT = (sp.peekT == null ? 1.2 : sp.peekT) - (near ? dt : 0);
          if (near && sp.peekT <= 0 && !sp.peekP) { sp.peekT = 2.2 + Math.random() * 1.3; sp.peekP = .001; sp.peekSide = Math.random() < .5 ? -1 : 1; if (sp === nearest) sfx.squeak(); }
        }
      }
      for (const tr of this.trees) push(tr, tr.r);
      for (const o of this.lands) push(o, o.r);
      if (this.pondAt) { const p = this.pondAt, dx = (me.x - p.x) / (p.rx * .9), dy = (me.y - p.y) / (p.ry * .9), d = Math.hypot(dx, dy); if (d < 1) { me.x = p.x + dx / d * p.rx * .9; me.y = p.y + dy / d * p.ry * .9; } }
      me.x = clamp(me.x, S * .3, this.WW - S * .3); me.y = clamp(me.y, S * .9, this.WH - S * .3);
      if (this.M.sea) me.y = Math.min(me.y, this.WH - S * 1.45);
      // the gates
      if (play && !this.fadeTo && this.state !== 'party') {
        const gw = this.gateW, ge = this.gateE;
        if (this.mi > 0 && me.x < S * .5 && Math.abs(me.y - gw.y) < S * 1.0) this.leave(-1);
        else if (me.x > this.WW - S * .5 && Math.abs(me.y - ge.y) < S * 1.0) this.leave(1);
        else if (me.x < S * .5 || me.x > this.WW - S * .5) { /* trees/edge: just stop at the edge */ }
      }
      // her friends follow in a line
      if (moving || !this.snake.length) { const last = this.snake[this.snake.length - 1]; if (!last || Math.hypot(me.x - last.x, me.y - last.y) > S * .12) { this.snake.push({ x: me.x, y: me.y }); if (this.snake.length > 500) this.snake.shift(); } }
      const gap = S * .52, per = S * .12;
      this.team.forEach((f, i) => {
        const back = Math.round((i + 1) * gap / per), tgt = this.snake[this.snake.length - 1 - back] || this.snake[0] || me;
        const dx = tgt.x - f.x, dy = tgt.y - f.y, d = Math.hypot(dx, dy);
        const k = Math.min(1, dt * (f.fresh ? 3.5 : 8)); f.x += dx * k; f.y += dy * k; if (d < S * .3) f.fresh = 0;
        if (Math.abs(dx) > 2) f.dir = dx > 0 ? 1 : -1; f.moving = d > S * .08; f.hop = Math.max(0, (f.hop || 0) - dt * 1.4);
      });
      // camera follows
      const tx = clamp(me.x - this.w / 2, 0, this.WW - this.w), ty = clamp(me.y - this.h * .58, 0, this.WH - this.h);
      this.cam.x = lerp(this.cam.x, tx, Math.min(1, dt * 5)); this.cam.y = lerp(this.cam.y, ty, Math.min(1, dt * 5));
      if (this.first) { this.cam.x = tx; this.cam.y = ty; this.first = false; }
      for (const sp of this.spots) { sp.shake = Math.max(0, sp.shake - dt * 2.4); sp.halo = Math.max(0, sp.halo - dt * .7); }
      for (const o of this.lands) { if (o.kind === 'house' && o.openT > 0) { o.openT -= dt; o.open = Math.min(1, o.open + dt * 3); if (o.openT <= 0) o.open = 0; } if (o.kind === 'windmill') o.spin += dt * (.7 + o.pulse * 7); o.pulse = Math.max(0, o.pulse - dt * .35); }
      this.gateShake = Math.max(0, (this.gateShake || 0) - dt * 2.5);
      if (this.state === 'celebrate' && this.stateT > 3.2) { this.state = 'play'; this.gateOpen = 1; }
      if (this.state === 'celebrate') this.wonK = Math.min(1, this.wonK + dt * .8); else this.wonK = Math.max(0, this.wonK - dt * .6);
      this.gateOpen = this.progress.done ? Math.min(1, this.gateOpen + dt * 1.5) : 0;
      // the season outside: falling leaves, snow, petals, butterflies
      this.parts = this.parts || []; const sn = this.season, want = sn === 'winter' ? 70 : sn === 'autumn' ? 26 : sn === 'spring' ? 20 : 4;
      while (this.parts.length < want) this.parts.push({ x: Math.random() * this.w, y: -10 - Math.random() * this.h, v: .06 + Math.random() * .08, ph: Math.random() * 6, s: 1 + Math.random() * 1.6, r: Math.random() * 6 });
      for (const p of this.parts) { p.y += (sn === 'summer' ? -3 : (30 + p.s * 14)) * dt * (sn === 'winter' ? 1.2 : 1); p.x += Math.sin(this.t * (sn === 'winter' ? .8 : 1.6) + p.ph) * (sn === 'winter' ? 18 : 30) * dt; p.r += dt * 2; if (p.y > this.h + 10 || p.y < -30) { p.y = sn === 'summer' ? this.h + 10 : -10; p.x = Math.random() * this.w; } }
      this.fx.update(dt);
    }

    /* ---------------------------------------------------------------- drawing */
    friendArt(c, kind, size, hop, mood) { SPG.pets.draw(c, kind, size, this.t, { mood: mood || (hop > 0 ? 'cheer' : 'happy'), hop: hop > 0 ? 1 - hop : 0 }); }
    trailPath(c, ox, oy) { c.beginPath(); this.pathPts.forEach((p, i) => i ? c.lineTo(p.x - ox, p.y - oy) : c.moveTo(p.x - ox, p.y - oy)); }
    drawGround(c) {
      const W = this.pal, M = this.M, w = this.w, h = this.h, cx = this.cam.x, cy = this.cam.y, S = this.S;
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, W.ground[0]); g.addColorStop(1, W.ground[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (M.sea) {   // the sea along the bottom of the beach
        const sy = this.WH - S * 1.3 - cy; if (sy < h) { const sg = c.createLinearGradient(0, sy, 0, sy + S * 1.4); sg.addColorStop(0, this.season === 'winter' ? '#9fc4dc' : '#6ccbe8'); sg.addColorStop(1, this.season === 'winter' ? '#7fa8c4' : '#3fb4d8'); c.fillStyle = sg; c.fillRect(0, sy, w, h - sy + 4); c.fillStyle = 'rgba(255,255,255,.55)'; for (let x = -((cx) % (S * .7)); x < w; x += S * .7) { c.beginPath(); c.ellipse(x + Math.sin(this.t + x) * 6, sy + 4, S * .3, S * .05, 0, 0, TAU); c.fill(); } }
      }
      if (M.biome === 'farm') { c.fillStyle = this.season === 'winter' ? 'rgba(180,200,220,.35)' : 'rgba(120,150,60,.22)'; for (let y = -((cy) % (S * .5)); y < h; y += S * .5) c.fillRect(0, y, w, S * .18); }
      c.globalAlpha = .55; c.fillStyle = W.patch;
      for (const p of this.L.patches) { const x = p.fx * this.WW - cx, y = p.fy * this.WH - cy; if (x < -S || x > w + S || y < -S || y > h + S) continue; c.beginPath(); c.ellipse(x, y, S * .5 * p.s, S * .18 * p.s, 0, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      // the trail: the same every time, from the west gate to the east gate
      c.save(); c.lineCap = c.lineJoin = 'round';
      this.trailPath(c, cx, cy); c.strokeStyle = 'rgba(120,90,50,.22)'; c.lineWidth = S * .56; c.stroke();
      this.trailPath(c, cx, cy); c.strokeStyle = W.path; c.lineWidth = S * .46; c.stroke();
      if (M.biome === 'village') { c.strokeStyle = 'rgba(90,70,50,.18)'; c.lineWidth = S * .42; c.setLineDash([S * .09, S * .13]); this.trailPath(c, cx, cy); c.stroke(); c.setLineDash([]); }
      if (this.progress.done) {   // once everyone is found, the trail glows toward the next place
        c.strokeStyle = 'rgba(255,224,102,.95)'; c.lineWidth = S * .1; c.setLineDash([S * .09, S * .24]); c.lineDashOffset = -this.t * S * .8; this.trailPath(c, cx, cy); c.stroke(); c.setLineDash([]);
      }
      c.restore();
      if (this.pondAt) { const p = this.pondAt, pg = c.createRadialGradient(p.x - cx, p.y - cy, p.rx * .2, p.x - cx, p.y - cy, p.rx); pg.addColorStop(0, W.ice ? '#e8f4ff' : '#8fdcf5'); pg.addColorStop(1, W.ice ? '#c9e2f5' : '#5bbfe6'); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(p.x - cx, p.y - cy, p.rx * 1.06, p.ry * 1.1, 0, 0, TAU); c.fill(); c.fillStyle = pg; c.beginPath(); c.ellipse(p.x - cx, p.y - cy, p.rx, p.ry, 0, 0, TAU); c.fill(); if (!W.ice) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(p.x - cx + Math.sin(this.t + i) * 4, p.y - cy + (i - 1) * p.ry * .4, p.rx * (.3 - i * .05), p.ry * .12, 0, 0, TAU); c.stroke(); } } }
    }
    drawGate(c, g, side, home) {
      const S = this.S, x = g.x - this.cam.x, y = g.y - this.cam.y, open = this.gateOpen, locked = side > 0 ? !this.progress.done : false, sh = (this.gateShake || 0) * Math.sin(this.t * 40) * 5;
      for (const sgn of [-1, 1]) {   // two flower-covered posts either side of the trail
        const py = y + sgn * S * .62; c.save(); c.translate(x, py); c.fillStyle = 'rgba(40,60,40,.2)'; c.beginPath(); c.ellipse(0, 3, S * .22, S * .05, 0, 0, TAU); c.fill();
        c.fillStyle = '#b9805a'; art.rr(c, -S * .07, -S * .95, S * .14, S * .95, S * .04); c.fill(); c.fillStyle = '#a9743f'; c.fillRect(-S * .1, -S * .98, S * .2, S * .08);
        for (let i = 0; i < 5; i++) { c.fillStyle = this.pal.flowers[i % this.pal.flowers.length]; c.beginPath(); c.arc(Math.sin(i * 2) * S * .1, -S * (.2 + i * .15), S * .06, 0, TAU); c.fill(); }
        c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(0, -S * 1.05, S * .09, 0, TAU); c.fill(); c.globalAlpha = .3; c.beginPath(); c.arc(0, -S * 1.05, S * .22, 0, TAU); c.fill(); c.globalAlpha = 1; c.restore();
      }
      if (locked || (home && !this.progress.done)) {   // a ribbon with a bow stretched across: not yet
        c.save(); c.translate(x + sh, y); c.strokeStyle = '#ff7aa8'; c.lineWidth = S * .1; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -S * .62); c.quadraticCurveTo(S * .08, 0, 0, S * .62); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = S * .025; c.beginPath(); c.moveTo(S * .02, -S * .6); c.quadraticCurveTo(S * .1, 0, S * .02, S * .6); c.stroke();
        c.fillStyle = '#ff5c8a'; for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(S * .06, sg * S * .1, S * .08, S * .13, sg * .5, 0, TAU); c.fill(); } c.fillStyle = '#e0407a'; c.beginPath(); c.arc(S * .06, 0, S * .07, 0, TAU); c.fill(); c.restore();
      } else if (side > 0 || (side < 0 && this.mi > 0)) {   // open: a glowing way through and a little arrow
        c.save(); c.translate(x, y); c.globalAlpha = .35 + Math.sin(this.t * 4) * .15; c.fillStyle = '#ffe27a'; c.beginPath(); c.ellipse(0, 0, S * .5, S * .75, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
        c.fillStyle = '#fff'; c.beginPath(); const d = side * (S * .1 + Math.sin(this.t * 5) * S * .03); c.moveTo(d + side * S * .22, 0); c.lineTo(d - side * S * .08, -S * .17); c.lineTo(d - side * S * .08, S * .17); c.closePath(); c.fill(); c.restore();
      }
      if (home) { c.save(); c.translate(x, y - S * 1.45); art.heart(c, 0, 0, S * .18 + Math.sin(this.t * 3) * S * .01, '#ff6b81'); c.restore(); }
    }
    drawSpot(c, o) {
      const S = this.S, f = o.friend, W = this.pal, hot = f && !f.found && this.state === 'play' && Math.hypot(this.me.x - o.x, this.me.y - o.y) < S * 1.8;
      c.save(); c.translate(o.x - this.cam.x, o.y - this.cam.y);
      c.fillStyle = 'rgba(40,60,40,.2)'; c.beginPath(); c.ellipse(0, 3, S * .55, S * .08, 0, 0, TAU); c.fill();
      if (f && !f.found && o.peekP > 0) {   // a head and ears slide out from behind the place, wiggle, and slide back
        const u = o.peekP / 1.3, k = Math.sin(Math.PI * clamp(u * 1.05, 0, 1)), sd = o.peekSide || 1;
        c.save(); c.translate(sd * S * (.22 + .2 * k), -S * (.2 + .32 * k)); c.rotate(sd * .22 * k + Math.sin(this.t * 14) * .05 * k); c.globalAlpha = Math.min(1, k * 2.2); this.friendArt(c, f.kind, S * .4, 0, 'happy'); c.restore();
      }
      c.save(); c.rotate(Math.sin(o.shake * 26) * o.shake * .06 + (hot ? Math.sin(this.t * 14) * .025 : 0)); c.globalAlpha = o.checked && !(f && f.found) ? .84 : 1; SPOT[o.kind](c, S, o.pal); if (this.season === 'winter') snowCap(c, S, o.kind); c.restore();
      if (hot) { for (let k = 0; k < 3; k++) { c.globalAlpha = .5 + Math.sin(this.t * 6 + k * 2) * .5; art.star(c, (k - 1) * S * .3, -S * ((SPOT_H[o.kind] || .85) + .12 + Math.sin(this.t * 2 + k) * .06), S * .09, '#ffe066', this.t + k); } c.globalAlpha = 1; }
      if (o.halo > 0) {   // after looking behind an empty place: how close is the nearest friend? snowflake (far), sun (closer), flame (very close)
        const T = TEMP(o.haloK), a = Math.min(1, o.halo * 1.4); c.globalAlpha = a; c.strokeStyle = T.col; c.lineWidth = S * .07; c.beginPath(); c.ellipse(0, -S * .38, S * (.62 + (1 - o.halo) * .2), S * (.5 + (1 - o.halo) * .15), 0, 0, TAU); c.stroke();
        c.save(); c.translate(0, -S * (SPOT_H[o.kind] || .85) - S * .35 - (1 - o.halo) * S * .1); c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(0, 0, S * .24, 0, TAU); c.fill(); T.icon(c, S * .15, T.col); c.restore(); c.globalAlpha = 1;
      }
      c.restore();
    }
    drawLand(c, o) {
      const S = this.S; c.save(); c.translate(o.x - this.cam.x, o.y - this.cam.y);
      c.fillStyle = 'rgba(40,60,40,.2)'; c.beginPath(); c.ellipse(0, 3, S * (o.kind === 'house' ? .8 : .5), S * .08, 0, 0, TAU); c.fill();
      if (o.kind === 'house') {
        HOUSE[o.style](c, S, o, this.t, this.season);
        // smoke from the chimney, and whoever lives there peeking out when the door is open
        if (o.style === 'cottage' || o.style === 'cabin') for (let i = 0; i < 3; i++) { const k = (this.t * .35 + i / 3) % 1; c.globalAlpha = (1 - k) * .55; c.fillStyle = '#eef1f6'; c.beginPath(); c.arc(S * (o.style === 'cabin' ? .38 : .45) + Math.sin(k * 6 + i) * S * .05, -S * (1.5 + k * .6), S * (.07 + k * .1), 0, TAU); c.fill(); } c.globalAlpha = 1;
        if (o.open > .5) { c.save(); c.translate(o.style === 'cottage' ? -S * .05 : o.style === 'shop' ? S * .26 : 0, -S * .03); this.friendArt(c, o.resident, S * .36, 0, 'cheer'); c.restore(); }
      } else {
        if (o.kind === 'magictree') { o.leaf1 = this.pal.tree.cols[0]; o.leaf2 = this.pal.tree.cols[1]; }
        LAND[o.kind](c, S, this.t, o);
        if (this.season === 'winter' && o.kind === 'magictree') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -S * 2.2, S * .5, S * .1, 0, 0, TAU); c.fill(); }
      }
      c.restore();
    }
    draw() {
      const c = this.ctx, w = this.w, h = this.h; if (!w || !this.L) return;
      const S = this.S, cx = this.cam.x, cy = this.cam.y, me = this.me, W = this.pal;
      this.drawGround(c);
      // things standing on the ground, back to front
      const list = [];
      for (const d of this.decor) if (d.x > cx - 30 && d.x < cx + w + 30 && d.y > cy - 30 && d.y < cy + h + 30) list.push({ y: d.y, kind: 'decor', o: d });
      for (const t of this.trees) if (t.x > cx - S && t.x < cx + w + S && t.y > cy - S * .3 && t.y < cy + h + S * 2.4) list.push({ y: t.y, kind: 'tree', o: t });
      for (const sp of this.spots) if (sp.x > cx - S && sp.x < cx + w + S && sp.y > cy - S * .2 && sp.y < cy + h + S * 2.4) list.push({ y: sp.y, kind: 'spot', o: sp });
      for (const o of this.lands) if (o.x > cx - S * 2 && o.x < cx + w + S * 2 && o.y > cy - S * .2 && o.y < cy + h + S * 3) list.push({ y: o.y, kind: 'land', o });
      const gates = []; if (this.mi > 0) gates.push([this.gateW, -1, false]); gates.push([this.gateE, 1, this.mi === MAPS.length - 1]);
      for (const [g, side, home] of gates) if (g.x > cx - S * 2 && g.x < cx + w + S * 2 && g.y > cy - S * 2 && g.y < cy + h + S * 2) list.push({ y: g.y, kind: 'gate', o: [g, side, home] });
      this.team.forEach((f, i) => list.push({ y: f.y, kind: 'friend', o: f, i }));
      list.push({ y: me.y, kind: 'me', o: me });
      list.sort((a, b) => a.y - b.y);
      for (const it of list) {
        const o = it.o;
        if (it.kind === 'decor') {
          c.save(); c.translate(o.x - cx, o.y - cy);
          if (o.kind === 'flower') { if (this.season !== 'winter' || o.k % 4 === 0) { c.strokeStyle = this.season === 'autumn' ? '#9a7a3a' : '#59b96e'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -S * .12 * o.s); c.stroke(); c.fillStyle = W.flowers[o.k % W.flowers.length]; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(Math.cos(k * TAU / 5) * S * .03 * o.s, -S * .12 * o.s + Math.sin(k * TAU / 5) * S * .03 * o.s, S * .028 * o.s, 0, TAU); c.fill(); } c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(0, -S * .12 * o.s, S * .02 * o.s, 0, TAU); c.fill(); } }
          else { c.strokeStyle = W.grass; c.lineWidth = 2.5; c.lineCap = 'round'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(k * S * .03, 0); c.quadraticCurveTo(k * S * .05, -S * .08 * o.s, k * S * .08, -S * .13 * o.s); c.stroke(); } }
          c.restore();
        } else if (it.kind === 'tree') {
          c.save(); c.translate(o.x - cx, o.y - cy); c.fillStyle = 'rgba(40,60,40,.18)'; c.beginPath(); c.ellipse(0, 3, S * .34, S * .07, 0, 0, TAU); c.fill();
          const [kind, pal] = W.border; SPOT[kind](c, S * .82, pal); if (this.season === 'spring' && kind === 'tree') { c.fillStyle = '#ffd6e4'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(Math.sin(o.seed + k * 2.3) * S * .4, -S * (.85 + (k % 3) * .2), S * .05, 0, TAU); c.fill(); } } c.restore();
        } else if (it.kind === 'spot') this.drawSpot(c, o);
        else if (it.kind === 'land') this.drawLand(c, o);
        else if (it.kind === 'gate') this.drawGate(c, ...o);
        else if (it.kind === 'friend') {
          const hop = Math.abs(Math.sin(this.t * 7 + it.i)) * (o.moving ? S * .05 : 0) + Math.sin(Math.min(1, o.hop || 0) * Math.PI) * S * .25;
          c.save(); c.translate(o.x - cx, o.y - cy - hop); c.fillStyle = 'rgba(40,60,40,.2)'; c.beginPath(); c.ellipse(0, 3 + hop, S * .16, S * .035, 0, 0, TAU); c.fill(); c.scale(o.dir < 0 ? -1 : 1, 1);
          this.friendArt(c, o.kind, S * .46, o.hop || 0, this.state === 'celebrate' || this.state === 'party' ? 'cheer' : 'happy'); c.restore();
        } else {   // her
          const a = SPG.pets.active(); c.save(); c.translate(me.x - cx, me.y - cy - (me.moving ? Math.abs(Math.sin(me.walk)) * S * .05 : 0));
          c.fillStyle = 'rgba(40,60,40,.22)'; c.beginPath(); c.ellipse(0, 3 + (me.moving ? Math.abs(Math.sin(me.walk)) * S * .05 : 0), S * .2, S * .04, 0, 0, TAU); c.fill();
          c.rotate(me.moving ? Math.sin(me.walk) * .06 : 0); c.scale(me.dir < 0 ? -1 : 1, 1);
          SPG.pets.draw(c, a ? a.id : 'bunny', S * .62, this.t, { mood: this.state === 'celebrate' || this.state === 'party' ? 'cheer' : 'happy', hat: a ? a.hat : null, face: a ? a.face : null, neck: a ? a.neck : null, hop: 0 });
          c.restore();
        }
      }
      // the season outside, and night
      this.drawSeason(c);
      if (this.wonK > 0) { const k = this.wonK; c.save(); c.globalAlpha = .85 * k; c.lineWidth = Math.min(w, h) * .03; c.lineCap = 'round'; RAINBOW.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(w / 2, h * .7, Math.min(w * .46, h * .5) * (1 - i * .06), Math.PI, TAU); c.stroke(); }); c.restore(); }
      this.fx.draw(c);
      this.drawRadar(c); this.drawMap(c);
      if (this.fade > 0) { c.fillStyle = `rgba(255,255,255,${this.fade.toFixed(3)})`; c.fillRect(0, 0, w, h); }
    }
    drawSeason(c) {
      const sn = this.season, w = this.w, h = this.h;
      if (sn === 'winter') { c.fillStyle = 'rgba(255,255,255,.95)'; for (const p of this.parts) { c.beginPath(); c.arc(p.x, p.y, p.s * 1.6, 0, TAU); c.fill(); } }
      else if (sn === 'autumn') { for (const p of this.parts) { c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = ['#e8873a', '#d9622b', '#f2b83a'][Math.floor(p.ph) % 3]; c.beginPath(); c.ellipse(0, 0, 6 * p.s * .8, 3 * p.s * .8, 0, 0, TAU); c.fill(); c.restore(); } }
      else if (sn === 'spring') { for (const p of this.parts) { c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = '#ffc0d6'; c.beginPath(); c.ellipse(0, 0, 4 * p.s * .8, 2.4 * p.s * .8, 0, 0, TAU); c.fill(); c.restore(); } }
      else { for (const p of this.parts) { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(p.x, p.y, p.s, 0, TAU); c.fill(); } }
      if (sn === 'summer' || sn === 'spring') for (let i = 0; i < 2; i++) { const bx = ((this.t * 24 * (1 + i * .4) + i * 300) % (w + 120)) - 60, by = h * (.2 + i * .25) + Math.sin(this.t * 1.7 + i * 2) * 30; c.save(); c.translate(bx, by); art.creature(c, 'butterfly', 22 * this.ui + 14, this.t + i, false); c.restore(); }
    }
    // Where might the next friend be? A soft arrow at the edge of the screen points toward the nearest one still hiding. It is faint while the friend is far away
    // and gets more solid as she gets closer, with a snowflake (cold), sun (warm) or flame (hot). Once everyone here is found it points to the gate instead.
    drawRadar(c) {
      if (this.state !== 'play' || this.fadeTo) return;
      const S = this.S, me = this.me; let tx, ty, alpha, T = null, gold = false;
      if (this.progress.done) { const g = this.gateE; tx = g.x; ty = g.y; alpha = this.since > 3 ? Math.min(1, (this.since - 3) / 2) : 0; gold = true; if (Math.hypot(tx - me.x, ty - me.y) < S * 2.5) return; }
      else {
        const wait = SPG.level.tier('hide') === 1 ? 3 : SPG.level.tier('hide') === 3 ? 10 : 6;
        if (this.since < wait) return;
        let best = null, bd = 1e9; for (const sp of this.spots) if (sp.friend && !sp.friend.found) { const d = Math.hypot(sp.x - me.x, sp.y - me.y); if (d < bd) { bd = d; best = sp; } }
        if (!best || bd < S * 1.5) return;
        tx = best.x; ty = best.y; alpha = clamp(1 - bd / (this.WW * .55), .2, 1) * Math.min(1, (this.since - wait) / 2); T = TEMP(clamp(1 - bd / (this.WW * .28), 0, 1));
      }
      const dx = tx - me.x, dy = ty - me.y, a = Math.atan2(dy, dx), r = Math.min(this.w, this.h) * .36;
      const x = this.w / 2 + Math.cos(a) * r * (this.w / this.h > 1 ? 1.5 : 1), y = this.h * .5 + Math.sin(a) * r;
      c.save(); c.globalAlpha = alpha; const pad = T ? 120 : 70; c.translate(clamp(x, pad, this.w - pad), clamp(y, 130, this.h - 70));
      if (T) { c.save(); c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.fill(); c.strokeStyle = T.col; c.lineWidth = 5; c.stroke(); T.icon(c, 20, T.col); c.restore(); }
      c.rotate(a); const p = 1 + Math.sin(this.t * 5) * .1; c.scale(p, p); c.translate(T ? 48 : 0, 0);
      c.fillStyle = gold ? 'rgba(255,224,102,.98)' : T ? T.col : 'rgba(255,224,102,.95)'; c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.moveTo(-22, -16); c.lineTo(8, -16); c.lineTo(8, -28); c.lineTo(34, 0); c.lineTo(8, 28); c.lineTo(8, 16); c.lineTo(-22, 16); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    drawMap(c) {
      const m = this.mm(), sx = m.w / this.WW, sy = m.h / this.WH, W = this.pal;
      c.save(); c.fillStyle = 'rgba(255,255,255,.7)'; art.rr(c, m.x - 6, m.y - 6, m.w + 12, m.h + 12, 14); c.fill();
      c.beginPath(); art.rr(c, m.x, m.y, m.w, m.h, 10); c.clip();
      const g = c.createLinearGradient(0, m.y, 0, m.y + m.h); g.addColorStop(0, W.ground[0]); g.addColorStop(1, W.ground[1]); c.fillStyle = g; c.fillRect(m.x, m.y, m.w, m.h);
      if (this.M.sea) { c.fillStyle = '#6ccbe8'; c.fillRect(m.x, m.y + m.h - this.S * 1.3 * sy, m.w, this.S * 1.3 * sy); }
      if (this.pondAt) { c.fillStyle = '#6ccbe8'; c.beginPath(); c.ellipse(m.x + this.pondAt.x * sx, m.y + this.pondAt.y * sy, this.pondAt.rx * sx, this.pondAt.ry * sy, 0, 0, TAU); c.fill(); }
      c.strokeStyle = W.path; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); this.pathPts.forEach((p, i) => i ? c.lineTo(m.x + p.x * sx, m.y + p.y * sy) : c.moveTo(m.x + p.x * sx, m.y + p.y * sy)); c.stroke();
      for (const o of this.lands) { c.fillStyle = o.kind === 'house' ? '#c98b5b' : '#8a7190'; c.fillRect(m.x + o.x * sx - 3, m.y + o.y * sy - 3, 6, 6); }
      for (const sp of this.spots) {
        const x = m.x + sp.x * sx, y = m.y + sp.y * sy;
        if (sp.friend && sp.friend.found) art.heart(c, x, y, 5 * this.ui + 2, '#ff6b81');
        else if (sp.checked) { c.fillStyle = 'rgba(90,63,94,.4)'; c.beginPath(); c.arc(x, y, 3 * this.ui + 1, 0, TAU); c.fill(); }
        else { c.fillStyle = 'rgba(40,120,60,.9)'; c.beginPath(); c.arc(x, y, 3.5 * this.ui + 1, 0, TAU); c.fill(); }
      }
      // the gates: grey while closed, gold once everyone is found
      for (const [g, side] of [[this.gateW, -1], [this.gateE, 1]]) { if (side < 0 && this.mi === 0) continue; c.fillStyle = side > 0 && !this.progress.done ? '#b8aebf' : '#ffd54a'; c.beginPath(); c.arc(m.x + g.x * sx + side * -2, m.y + g.y * sy, 5, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.strokeRect(m.x + this.cam.x * sx, m.y + this.cam.y * sy, this.w * sx, this.h * sy);
      c.fillStyle = '#ffd54a'; c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.arc(m.x + this.me.x * sx, m.y + this.me.y * sy, 5 * this.ui + 1, 0, TAU); c.fill(); c.stroke();
      c.restore();
    }
  }

  SPG.games.push({
    id: 'hide', name: 'Hide and Seek', order: 10,
    icon(c, w, h) {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe6ff'); g.addColorStop(.5, '#c9efb0'); g.addColorStop(1, '#86cc74'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const S = Math.min(w * .4, h * .8);
      c.fillStyle = '#9fd88a'; c.beginPath(); c.moveTo(0, h * .66); c.quadraticCurveTo(w * .3, h * .5, w * .62, h * .64); c.quadraticCurveTo(w * .85, h * .72, w, h * .6); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.strokeStyle = '#e9d5a8'; c.lineWidth = S * .2; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * .12, h * .95); c.quadraticCurveTo(w * .4, h * .62, w * .6, h * .78); c.quadraticCurveTo(w * .78, h * .88, w * .88, h * .62); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([5, 7]); c.beginPath(); c.moveTo(w * .12, h * .95); c.quadraticCurveTo(w * .4, h * .62, w * .6, h * .78); c.quadraticCurveTo(w * .78, h * .88, w * .88, h * .62); c.stroke(); c.setLineDash([]);
      c.save(); c.translate(w * .72, h * .62); HOUSE.cottage(c, S * .55, { wall: '#ffe3c4', roof: '#e8735a', door: '#9a6a44', open: 0 }, 0, 'summer'); c.restore();
      c.save(); c.translate(w * .2, h * .72); SPOT.bush(c, S * .7, { cols: ['#5cb85c', '#7ed957', '#4aa64f'], dots: '#ff6b81' }); c.restore();
      c.save(); c.translate(w * .46, h * .86); SPG.pets.draw(c, 'bunny', S * .62, 1, { mood: 'happy' }); c.restore();
      c.save(); c.translate(w * .34, h * .9); c.scale(.7, .7); SPG.pets.draw(c, 'cat', S * .5, 2, { mood: 'happy' }); c.restore();
      art.star(c, w * .24, h * .32, S * .09, '#ffe066', .3); art.star(c, w * .8, h * .22, S * .07, '#fff', 0);
    },
    create: host => new HideGame(host)
  });
})();
