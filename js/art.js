// Shared illustration helpers. Everything is drawn with canvas so the whole site
// stays tiny, works offline, and looks the same on every tablet.
(() => {
  const SPG = window.SPG = window.SPG || { games: [] };
  const TAU = Math.PI * 2;
  const INK = '#5a3f5e';

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.round(Math.max(0, Math.min(255, amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ------------------------------------------------------------ faces */
  function face(c, r, { mood = 'happy', look = 0, blink = false, cheeks = true, noEyes = false, wide = 1 } = {}) {
    c.save();
    const ex = r * .34, ey = -r * .06, er = r * .12;
    c.lineCap = 'round';
    if (noEyes) { /* the animal draws its own eyes (frog) */ }
    else if (mood === 'sleep' || blink || mood === 'cheer') {
      c.strokeStyle = INK; c.lineWidth = Math.max(1.6, r * .06);
      for (const s of [-1, 1]) { c.beginPath(); c.arc(s * ex, ey + er * .5, er, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); }
    } else if (mood === 'scared') {   // big round eyes with a white ring and small pupils
      for (const s of [-1, 1]) {
        c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = Math.max(1.2, r * .045); c.beginPath(); c.arc(s * ex, ey, er * 1.35, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = INK; c.beginPath(); c.arc(s * ex, ey + er * .1, er * .55, 0, TAU); c.fill();
      }
    } else {
      for (const s of [-1, 1]) {
        c.fillStyle = INK; c.beginPath(); c.ellipse(s * ex + look * er * .5, ey, er * .85, er * 1.2, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(s * ex + look * er * .5 - er * .25, ey - er * .45, er * .38, 0, TAU); c.fill();
      }
    }
    // eyebrows tell most of a feeling: sad = inner ends up, mad = inner ends down, scared and surprised = high and round
    if (!noEyes && (mood === 'sad' || mood === 'mad' || mood === 'scared' || mood === 'wow')) {
      c.strokeStyle = INK; c.lineWidth = Math.max(1.6, r * .065);
      const by = ey - er * (mood === 'scared' || mood === 'wow' ? 2.5 : 1.9);
      for (const s of [-1, 1]) {
        c.beginPath();
        if (mood === 'sad') { c.moveTo(s * (ex + er * 1.1), by + er * .35); c.lineTo(s * (ex - er * 1.0), by - er * .35); }
        else if (mood === 'mad') { c.moveTo(s * (ex + er * 1.1), by - er * .45); c.lineTo(s * (ex - er * 1.0), by + er * .4); }
        else c.arc(s * ex, by + er * .9, er * 1.1, Math.PI * 1.2, Math.PI * 1.8);
        c.stroke();
      }
    }
    if (cheeks) {
      c.fillStyle = mood === 'mad' ? 'rgba(255,90,90,.42)' : 'rgba(255,110,140,.32)';
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * .62, r * .2, r * .14, r * .085, 0, 0, TAU); c.fill(); }
    }
    c.strokeStyle = INK; c.lineWidth = Math.max(1.6, r * .06);
    if (wide !== 1) { c.translate(0, r * .13); c.scale(wide, 1); c.translate(0, -r * .13); }   // a wider (frog) mouth
    if (mood === 'wow' || mood === 'cheer') {
      c.fillStyle = '#7a2f4d'; c.beginPath();
      if (mood === 'wow') c.ellipse(0, r * .3, r * .1, r * .13, 0, 0, TAU);
      else c.arc(0, r * .16, r * .2, 0, Math.PI);
      c.fill();
      if (mood === 'cheer') { c.fillStyle = '#ff8aa3'; c.beginPath(); c.arc(0, r * .32, r * .1, Math.PI, 0); c.fill(); }
    } else if (mood === 'sad' || mood === 'mad') {   // a frown (mad is flatter and tighter) and, when sad, a tear
      c.beginPath(); if (mood === 'sad') c.arc(0, r * .42, r * .2, Math.PI * 1.2, Math.PI * 1.8); else c.arc(0, r * .5, r * .26, Math.PI * 1.3, Math.PI * 1.7); c.stroke();
      if (mood === 'sad') { c.fillStyle = '#7fc8f5'; c.beginPath(); c.moveTo(ex + er * .3, ey + er * 1.2); c.quadraticCurveTo(ex + er * 1.0, ey + er * 2.3, ex + er * .3, ey + er * 2.5); c.quadraticCurveTo(ex - er * .4, ey + er * 2.3, ex + er * .3, ey + er * 1.2); c.fill(); }
    } else if (mood === 'scared') {   // a small wobbly mouth
      c.beginPath(); c.moveTo(-r * .2, r * .3); for (let i = 1; i <= 4; i++) c.quadraticCurveTo(-r * .2 + (i - .5) * r * .1, r * (i % 2 ? .22 : .38), -r * .2 + i * r * .1, r * .3); c.stroke();
    } else {
      c.beginPath(); c.arc(0, r * .1, r * .2, Math.PI * .18, Math.PI * .82); c.stroke();
    }
    c.restore();
  }

  /* ------------------------------------------------------------ scenery */
  function cloud(c, x, y, s, alpha = 1, col = '#fff') {
    c.save(); c.globalAlpha = alpha; c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(120,150,190,.18)';
    c.beginPath(); c.ellipse(0, 22, 80, 12, 0, 0, TAU); c.fill();
    c.fillStyle = col;
    c.beginPath();
    c.arc(-38, 6, 26, 0, TAU); c.arc(-8, -12, 34, 0, TAU); c.arc(30, -2, 30, 0, TAU); c.arc(56, 10, 20, 0, TAU);
    c.rect(-38, 6, 94, 24);
    c.fill();
    c.restore();
  }

  function sun(c, x, y, r, t) {
    const g = c.createRadialGradient(x, y, r * .3, x, y, r * 2.6);
    g.addColorStop(0, 'rgba(255,236,150,.85)'); g.addColorStop(1, 'rgba(255,236,150,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.6, 0, TAU); c.fill();
    c.save(); c.translate(x, y); c.rotate(t * .15);
    c.fillStyle = '#ffd95a';
    for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.ellipse(r * 1.32, 0, r * .3, r * .1, 0, 0, TAU); c.fill(); }
    c.restore();
    c.fillStyle = '#ffd95a'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = '#ffe98a'; c.beginPath(); c.arc(x - r * .2, y - r * .22, r * .68, 0, TAU); c.fill();
    c.save(); c.translate(x, y + r * .05); face(c, r * .8, { mood: 'happy' }); c.restore();
  }

  function hills(c, w, h, colors = ['#c3e6a6', '#a9dc94', '#93d087']) {
    const layers = [[.68, .06, colors[0]], [.78, .05, colors[1]], [.9, .04, colors[2]]];
    layers.forEach(([base, amp, col], i) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w + 20; x += 20) c.lineTo(x, h * base + Math.sin(x / w * (3 + i) * Math.PI + i * 1.7) * h * amp);
      c.lineTo(w, h); c.closePath(); c.fill();
    });
  }

  // The sky gradient and the hills never change, so they are painted once and reused every frame.
  const layerCache = new Map();
  function layers(w, h, dpr, sky, hill) {
    const key = [w, h, dpr, sky.join(), (hill || []).join()].join('|');
    let l = layerCache.get(key);
    if (l) return l;
    const mk = draw => { const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr)); const g = cv.getContext('2d'); g.scale(dpr, dpr); draw(g); return cv; };
    l = {
      sky: mk(g => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, sky[0]); gr.addColorStop(.62, sky[1]); gr.addColorStop(1, sky[2]); g.fillStyle = gr; g.fillRect(0, 0, w, h); }),
      hills: mk(g => hills(g, w, h, hill))
    };
    if (layerCache.size > 4) layerCache.delete(layerCache.keys().next().value);
    layerCache.set(key, l);
    return l;
  }

  const NIGHT_SKY = ['#1c2559', '#3a4888', '#6b70b2'], NIGHT_HILL = ['#2f4a6b', '#28405f', '#213652'];
  function scene(c, w, h, t, { sky, showSun = true, clouds = true, hill = undefined, behind = null } = {}) {
    let moonUp = false;
    if (!sky) { sky = ['#a9e1f3', '#e9f8ee', '#fdf6df']; if (SPG.night && SPG.night.on()) { sky = NIGHT_SKY; hill = NIGHT_HILL; showSun = false; moonUp = true; } }
    const l = layers(w, h, c.getTransform().a || 1, sky, hill);
    c.drawImage(l.sky, 0, 0, w, h);
    if (moonUp) {
      for (let i = 0; i < 36; i++) { const x = ((i * 0.6180339 + .13) % 1) * w, y = ((i * 0.3819 + .07) % 1) * h * .5; c.globalAlpha = .35 + .45 * Math.abs(Math.sin(t * 1.4 + i)); c.fillStyle = '#fff8d8'; c.beginPath(); c.arc(x, y, 1.4 + (i % 3) * .6, 0, TAU); c.fill(); }
      c.globalAlpha = 1; const mx = w * .84, my = Math.max(70, h * .17), mr = Math.min(w, h) * .055, g = c.createRadialGradient(mx, my, mr * .5, mx, my, mr * 3); g.addColorStop(0, 'rgba(255,246,200,.35)'); g.addColorStop(1, 'rgba(255,246,200,0)'); c.fillStyle = g; c.beginPath(); c.arc(mx, my, mr * 3, 0, TAU); c.fill(); c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill(); c.fillStyle = 'rgba(200,190,150,.35)'; c.beginPath(); c.arc(mx - mr * .3, my - mr * .1, mr * .22, 0, TAU); c.arc(mx + mr * .25, my + mr * .3, mr * .16, 0, TAU); c.fill();
    }
    if (showSun) sun(c, w * .86, Math.max(70, h * .17), Math.min(w, h) * .06, t);
    if (clouds) {
      [[.12, .2, 1, 9], [.5, .11, .8, 6], [.72, .32, .65, 12], [.3, .42, .55, 8]].forEach(([fx, fy, s, sp], i) => {
        const span = w + 300;
        const x = ((fx * w + t * sp + i * 200) % span) - 150;
        cloud(c, x, h * fy, s * Math.min(1.2, w / 700 + .4), .92);
      });
    }
    if (behind) behind(c, w, h, t);   // things that sit behind the hills (sea, skyline, barns...)
    c.drawImage(l.hills, 0, 0, w, h);
  }

  /* ------------------------------------------------------------ small shapes */
  function star(c, x, y, r, fill = '#ffd54a', rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath();
    for (let i = 0; i < 10; i++) { const rad = i % 2 ? r * .46 : r; const a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
    c.closePath();
    c.fillStyle = fill; c.strokeStyle = fill; c.lineJoin = 'round'; c.lineWidth = r * .22; c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-r * .18, -r * .3, r * .16, r * .08, -.6, 0, TAU); c.fill();
    c.restore();
  }
  function heart(c, x, y, r, fill = '#ff7a9a') {
    c.save(); c.translate(x, y); c.fillStyle = fill; c.beginPath();
    c.moveTo(0, r * .9); c.bezierCurveTo(-r * 1.5, -r * .1, -r * .6, -r * 1.2, 0, -r * .4);
    c.bezierCurveTo(r * .6, -r * 1.2, r * 1.5, -r * .1, 0, r * .9); c.fill(); c.restore();
  }

  function drop(c, r, { gold = false, mood = 'happy', blink = false } = {}) {
    const g = c.createLinearGradient(-r, -r * 1.5, r, r);
    if (gold) { g.addColorStop(0, '#ffe98a'); g.addColorStop(1, '#ffb52e'); } else { g.addColorStop(0, '#9be0ff'); g.addColorStop(1, '#3fa9ee'); }
    c.fillStyle = g; c.beginPath();
    c.moveTo(0, -r * 1.55); c.bezierCurveTo(r * .25, -r * .85, r, -r * .35, r, r * .35);
    c.arc(0, r * .35, r, 0, Math.PI); c.bezierCurveTo(-r, -r * .35, -r * .25, -r * .85, 0, -r * 1.55); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * .42, r * .0, r * .13, r * .3, .3, 0, TAU); c.fill();
    c.save(); c.translate(0, r * .32); face(c, r * .72, { mood, blink }); c.restore();
  }

  /* ------------------------------------------------------------ fruit */
  const FRUIT_JUICE = ['#ff6b6b', '#ffa53d', '#ff5f7a', '#ff4d6d', '#ffe066', '#ffb08a'];
  const FRUIT_COUNT = 6;

  function leaf(c, x, y, len, ang, col = '#5cb85c') {
    c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * .5, -len * .38, len, 0); c.quadraticCurveTo(len * .5, len * .38, 0, 0); c.fill(); c.restore();
  }
  function shine(c, x, y, r) { c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(x, y, r * .2, r * .11, -.7, 0, TAU); c.fill(); }
  function radial(c, r, a, b) { const g = c.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }

  // type: 0 apple, 1 orange, 2 watermelon, 3 strawberry, 4 banana, 5 peach. cut = show the inside.
  function fruit(c, type, r, { cut = false, mood = 'happy', blink = false, look = 0 } = {}) {
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    switch (type) {
      case 0: { // apple
        const body = k => { c.beginPath(); c.moveTo(0, -r * .78 * k); c.bezierCurveTo(r * .5 * k, -r * 1.05 * k, r * 1.08 * k, -r * .5 * k, r * .98 * k, r * .15 * k); c.bezierCurveTo(r * .9 * k, r * .8 * k, r * .35 * k, r * 1.02 * k, 0, r * .9 * k); c.bezierCurveTo(-r * .35 * k, r * 1.02 * k, -r * .9 * k, r * .8 * k, -r * .98 * k, r * .15 * k); c.bezierCurveTo(-r * 1.08 * k, -r * .5 * k, -r * .5 * k, -r * 1.05 * k, 0, -r * .78 * k); };
        c.fillStyle = radial(c, r, '#ff8f8f', '#df3d4d'); body(1); c.fill();
        if (cut) {
          c.fillStyle = '#fff6d6'; body(.86); c.fill();
          c.fillStyle = '#9b6b3e'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * .14, r * .05, r * .06, r * .11, s * .3, 0, TAU); c.fill(); }
        } else {
          c.strokeStyle = '#7a5230'; c.lineWidth = r * .09; c.beginPath(); c.moveTo(0, -r * .78); c.quadraticCurveTo(r * .05, -r * 1.0, r * .14, -r * 1.12); c.stroke();
          leaf(c, r * .1, -r * .95, r * .5, -.5);
          shine(c, -r * .5, -r * .42, r);
          c.save(); c.translate(0, r * .12); face(c, r * .72, { mood, blink, look }); c.restore();
        }
        break;
      }
      case 1: { // orange
        c.fillStyle = radial(c, r, '#ffc26a', '#f08a1c'); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        if (cut) {
          c.fillStyle = '#fff2d6'; c.beginPath(); c.arc(0, 0, r * .9, 0, TAU); c.fill();
          c.fillStyle = '#ffab3d'; c.beginPath(); c.arc(0, 0, r * .8, 0, TAU); c.fill();
          c.strokeStyle = '#fff2d6'; c.lineWidth = r * .05;
          for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8); c.stroke(); }
        } else {
          c.fillStyle = 'rgba(200,100,0,.18)'; for (let i = 0; i < 9; i++) { const a = i * 2.4; c.beginPath(); c.arc(Math.cos(a) * r * .7 * (.4 + (i % 3) * .25), Math.sin(a) * r * .7 * (.4 + (i % 3) * .25), r * .03, 0, TAU); c.fill(); }
          leaf(c, 0, -r * .95, r * .55, -.4); c.fillStyle = '#4a9f4e'; c.beginPath(); c.arc(0, -r * .96, r * .07, 0, TAU); c.fill();
          shine(c, -r * .48, -r * .45, r);
          c.save(); c.translate(0, r * .1); face(c, r * .74, { mood, blink, look }); c.restore();
        }
        break;
      }
      case 2: { // watermelon
        c.fillStyle = radial(c, r, '#7fd66e', '#2f9a4a'); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        if (cut) {
          c.fillStyle = '#e8f7d0'; c.beginPath(); c.arc(0, 0, r * .9, 0, TAU); c.fill();
          c.fillStyle = '#ff6b81'; c.beginPath(); c.arc(0, 0, r * .8, 0, TAU); c.fill();
          c.fillStyle = '#4a2b3a'; for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + .3, d = r * (i % 2 ? .3 : .52); c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * .04, r * .075, a, 0, TAU); c.fill(); }
        } else {
          c.strokeStyle = 'rgba(30,110,50,.45)'; c.lineWidth = r * .1;
          for (const k of [-.55, -.22, .22, .55]) { c.beginPath(); c.moveTo(k * r, -Math.sqrt(1 - k * k) * r * .96); c.quadraticCurveTo(k * r * 1.5, 0, k * r, Math.sqrt(1 - k * k) * r * .96); c.stroke(); }
          shine(c, -r * .5, -r * .45, r);
          c.fillStyle = 'rgba(255,255,255,.0)';
          c.save(); c.translate(0, r * .1); face(c, r * .78, { mood, blink, look }); c.restore();
        }
        break;
      }
      case 3: { // strawberry
        const body = k => { c.beginPath(); c.moveTo(0, r * 1.02 * k); c.bezierCurveTo(r * .35 * k, r * .9 * k, r * 1.02 * k, r * .3 * k, r * .95 * k, -r * .35 * k); c.bezierCurveTo(r * .85 * k, -r * .9 * k, r * .2 * k, -r * .85 * k, 0, -r * .7 * k); c.bezierCurveTo(-r * .2 * k, -r * .85 * k, -r * .85 * k, -r * .9 * k, -r * .95 * k, -r * .35 * k); c.bezierCurveTo(-r * 1.02 * k, r * .3 * k, -r * .35 * k, r * .9 * k, 0, r * 1.02 * k); };
        c.fillStyle = radial(c, r, '#ff7d8f', '#e0264a'); body(1); c.fill();
        if (cut) {
          c.fillStyle = '#ffb3c0'; body(.86); c.fill();
          c.fillStyle = '#ffe1e6'; c.beginPath(); c.ellipse(0, r * .05, r * .28, r * .42, 0, 0, TAU); c.fill();
        } else {
          c.fillStyle = '#ffe98a';
          for (const [x, y] of [[-.6, -.2], [.6, -.2], [-.35, .3], [.35, .3], [0, .65], [0, -.55], [-.7, .15], [.7, .15]]) { c.beginPath(); c.ellipse(x * r, y * r, r * .035, r * .06, 0, 0, TAU); c.fill(); }
          for (const a of [-2.3, -1.9, -1.57, -1.24, -.85]) leaf(c, 0, -r * .72, r * .5, a, '#4fb26a');
          shine(c, -r * .5, -r * .3, r);
          c.save(); c.translate(0, r * .12); face(c, r * .72, { mood, blink, look }); c.restore();
        }
        break;
      }
      case 4: { // banana
        c.translate(0, -r * .3);
        const crescent = () => { c.beginPath(); c.moveTo(-r * .98, -r * .1); c.quadraticCurveTo(0, r * 1.8, r * .98, -r * .1); c.quadraticCurveTo(0, r * .42, -r * .98, -r * .1); c.closePath(); };
        const g = c.createLinearGradient(0, -r * .2, 0, r * .8); g.addColorStop(0, '#ffe98a'); g.addColorStop(1, '#f2c531');
        c.fillStyle = cut ? '#fff3b0' : g; crescent(); c.fill();
        c.strokeStyle = cut ? '#f2c531' : '#d9a81f'; c.lineWidth = r * .07; c.stroke();
        if (!cut) {
          c.fillStyle = '#7a5230'; c.beginPath(); c.roundRect ? c.roundRect(-r * 1.08, -r * .2, r * .2, r * .2, r * .05) : c.rect(-r * 1.08, -r * .2, r * .2, r * .2); c.fill();
          c.fillStyle = '#5a3a26'; c.beginPath(); c.arc(r * .98, -r * .1, r * .06, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = r * .07; c.beginPath(); c.moveTo(-r * .62, r * .36); c.quadraticCurveTo(0, r * 1.12, r * .62, r * .36); c.stroke();
          c.save(); c.translate(0, r * .5); face(c, r * .4, { mood, blink, look }); c.restore();
        }
        break;
      }
      default: { // peach
        c.fillStyle = radial(c, r, '#ffd0a6', '#ff8f6b'); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        if (cut) {
          c.fillStyle = '#ffd9a0'; c.beginPath(); c.arc(0, 0, r * .86, 0, TAU); c.fill();
          c.fillStyle = '#a9673c'; c.beginPath(); c.ellipse(0, 0, r * .26, r * .34, 0, 0, TAU); c.fill();
        } else {
          c.strokeStyle = 'rgba(210,90,70,.4)'; c.lineWidth = r * .07; c.beginPath(); c.moveTo(0, -r * .75); c.quadraticCurveTo(r * .35, 0, 0, r * .95); c.stroke();
          leaf(c, 0, -r * .92, r * .5, -.55); shine(c, -r * .5, -r * .45, r);
          c.save(); c.translate(-r * .06, r * .12); face(c, r * .72, { mood, blink, look }); c.restore();
        }
      }
    }
    c.restore();
  }

  /* ------------------------------------------------------------ bee & creatures */
  function bee(c, s, t = 0, { mood = 'happy' } = {}) {
    c.save();
    const flap = Math.sin(t * 40) * .5 + .5;
    c.fillStyle = 'rgba(255,255,255,.75)';
    for (const sd of [-1, 1]) { c.save(); c.translate(sd * s * .1, -s * .4); c.rotate(sd * (.5 + flap * .5)); c.beginPath(); c.ellipse(sd * s * .25, -s * .1, s * .3, s * .16, 0, 0, TAU); c.fill(); c.restore(); }
    c.save(); c.beginPath(); c.ellipse(0, 0, s * .58, s * .46, 0, 0, TAU); c.clip();
    c.fillStyle = '#ffd54a'; c.fillRect(-s, -s, s * 2, s * 2);
    c.fillStyle = '#5a3f5e'; c.fillRect(-s * .44, -s, s * .18, s * 2); c.fillRect(s * .18, -s, s * .2, s * 2);
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-s * .15, -s * .22, s * .2, s * .09, -.4, 0, TAU); c.fill();
    c.save(); c.translate(s * .0, s * .04); face(c, s * .5, { mood }); c.restore();
    c.strokeStyle = INK; c.lineWidth = s * .05; c.beginPath(); c.moveTo(-s * .12, -s * .44); c.quadraticCurveTo(-s * .2, -s * .68, -s * .34, -s * .68); c.moveTo(s * .12, -s * .44); c.quadraticCurveTo(s * .2, -s * .68, s * .34, -s * .68); c.stroke();
    c.restore();
  }

  function creature(c, kind, s, t = 0) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    switch (kind) {
      case 'bee': bee(c, s, t); break;
      case 'butterfly': {
        const f = Math.abs(Math.cos(t * 9));
        for (const sd of [-1, 1]) {
          c.save(); c.scale(sd * (.3 + f * .7), 1);
          c.fillStyle = '#ff9ec2'; c.beginPath(); c.moveTo(s * .05, -s * .05); c.bezierCurveTo(s * .3, -s * .85, s * 1.0, -s * .7, s * .9, -s * .15); c.bezierCurveTo(s * .85, s * .1, s * .3, s * .1, s * .05, -s * .05); c.fill();
          c.fillStyle = '#c8a6ff'; c.beginPath(); c.moveTo(s * .05, s * .0); c.bezierCurveTo(s * .5, s * .05, s * .8, s * .3, s * .6, s * .62); c.bezierCurveTo(s * .4, s * .8, s * .1, s * .5, s * .05, s * .0); c.fill();
          c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(s * .58, -s * .38, s * .1, 0, TAU); c.fill(); c.beginPath(); c.arc(s * .38, s * .36, s * .06, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = s * .03; c.beginPath(); c.moveTo(s * .1, -s * .08); c.quadraticCurveTo(s * .4, -s * .3, s * .7, -s * .5); c.stroke();
          c.restore();
        }
        c.fillStyle = '#7a5a86'; c.beginPath(); c.ellipse(0, s * .08, s * .085, s * .36, 0, 0, TAU); c.fill();
        c.fillStyle = '#8c6c99'; c.beginPath(); c.arc(0, -s * .3, s * .15, 0, TAU); c.fill();
        c.fillStyle = '#fff'; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * s * .06, -s * .32, s * .045, 0, TAU); c.fill(); }
        c.fillStyle = INK; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * s * .06, -s * .31, s * .022, 0, TAU); c.fill(); }
        c.strokeStyle = '#7a5a86'; c.lineWidth = s * .03; c.beginPath(); c.moveTo(-s * .05, -s * .42); c.quadraticCurveTo(-s * .12, -s * .62, -s * .26, -s * .66); c.moveTo(s * .05, -s * .42); c.quadraticCurveTo(s * .12, -s * .62, s * .26, -s * .66); c.stroke();
        break;
      }
      case 'ladybug': {
        c.strokeStyle = '#3d2c44'; c.lineWidth = s * .06;
        for (const sd of [-1, 1]) for (const y of [-.02, .2, .4]) { c.beginPath(); c.moveTo(sd * s * .42, y * s); c.lineTo(sd * s * .64, (y + .08) * s); c.stroke(); }
        c.beginPath(); c.moveTo(-s * .12, -s * .62); c.quadraticCurveTo(-s * .2, -s * .82, -s * .34, -s * .82); c.moveTo(s * .12, -s * .62); c.quadraticCurveTo(s * .2, -s * .82, s * .34, -s * .82); c.stroke();
        const g = c.createRadialGradient(-s * .2, -s * .1, s * .05, 0, s * .12, s * .7); g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, '#e8434f');
        c.fillStyle = g; c.beginPath(); c.ellipse(0, s * .16, s * .56, s * .58, 0, 0, TAU); c.fill();
        c.fillStyle = '#3d2c44'; c.beginPath(); c.ellipse(0, -s * .34, s * .3, s * .24, 0, 0, TAU); c.fill();
        c.strokeStyle = '#3d2c44'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(0, -s * .1); c.lineTo(0, s * .74); c.stroke();
        c.fillStyle = '#3d2c44'; for (const [x, y, r] of [[-.3, .06, .09], [.3, .06, .09], [-.3, .38, .08], [.3, .38, .08], [-.12, .58, .05], [.12, .58, .05]]) { c.beginPath(); c.arc(x * s, y * s, r * s, 0, TAU); c.fill(); }
        c.fillStyle = '#fff'; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * s * .11, -s * .36, s * .075, 0, TAU); c.fill(); }
        c.fillStyle = INK; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * s * .11, -s * .35, s * .037, 0, TAU); c.fill(); }
        c.strokeStyle = '#ff9db8'; c.lineWidth = s * .035; c.beginPath(); c.arc(0, -s * .3, s * .09, .25 * Math.PI, .75 * Math.PI); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-s * .28, -s * .05, s * .12, s * .06, -.6, 0, TAU); c.fill();
        break;
      }
      case 'bunny': {
        c.fillStyle = '#fff';
        for (const sd of [-1, 1]) { c.save(); c.translate(sd * s * .2, -s * .5); c.rotate(sd * .18); c.beginPath(); c.ellipse(0, -s * .28, s * .13, s * .34, 0, 0, TAU); c.fill(); c.fillStyle = '#ffc4d6'; c.beginPath(); c.ellipse(0, -s * .26, s * .06, s * .24, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.restore(); }
        c.beginPath(); c.arc(s * .52, s * .22, s * .18, 0, TAU); c.fill(); // tail (right side)
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, s * .16, s * .46, s * .4, 0, 0, TAU); c.fill();
        c.fillStyle = '#f2ecf7'; c.beginPath(); c.ellipse(0, s * .42, s * .34, s * .12, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(0, -s * .28, s * .38, 0, TAU); c.fillStyle = '#fff'; c.fill();
        c.save(); c.translate(0, -s * .26); face(c, s * .62); c.restore();
        break;
      }
      case 'bird': { // plump bluebird, facing right
        const body = () => { c.beginPath(); c.moveTo(.42 * s, -.58 * s); c.bezierCurveTo(.8 * s, -.52 * s, .86 * s, .06 * s, .6 * s, .36 * s); c.bezierCurveTo(.4 * s, .68 * s, -.4 * s, .72 * s, -.66 * s, .3 * s); c.bezierCurveTo(-.86 * s, .0 * s, -.56 * s, -.56 * s, -.1 * s, -.62 * s); c.bezierCurveTo(.1 * s, -.68 * s, .28 * s, -.64 * s, .42 * s, -.58 * s); c.closePath(); };
        // tail feathers fan out behind
        c.fillStyle = '#3f9fdc';
        for (const [ang, len] of [[-.4, .78], [-.1, .86], [.2, .76]]) { c.save(); c.translate(-.5 * s, .12 * s); c.rotate(ang); c.beginPath(); c.moveTo(0, -.1 * s); c.quadraticCurveTo(-len * .6 * s, -.22 * s, -len * s, -.06 * s); c.quadraticCurveTo(-len * .6 * s, .2 * s, 0, .12 * s); c.fill(); c.restore(); }
        // feet
        c.strokeStyle = '#ffab4a'; c.lineWidth = s * .07;
        for (const x of [-.12, .16]) { c.beginPath(); c.moveTo(x * s, .64 * s); c.lineTo(x * s, .84 * s); c.moveTo((x - .08) * s, .88 * s); c.lineTo((x + .02) * s, .84 * s); c.lineTo((x + .1) * s, .88 * s); c.stroke(); }
        // body + belly
        const g = c.createRadialGradient(-.1 * s, -.3 * s, s * .1, 0, 0, s * 1.05); g.addColorStop(0, '#9adcfb'); g.addColorStop(1, '#4fb3e8');
        c.fillStyle = g; body(); c.fill();
        c.save(); body(); c.clip(); c.fillStyle = '#f2fbff'; c.beginPath(); c.ellipse(.28 * s, .42 * s, .52 * s, .36 * s, -.2, 0, TAU); c.fill(); c.restore();
        // tuft
        c.strokeStyle = '#3f9fdc'; c.lineWidth = s * .09; c.beginPath(); c.moveTo(.22 * s, -.62 * s); c.quadraticCurveTo(.12 * s, -.86 * s, .34 * s, -.84 * s); c.moveTo(.32 * s, -.6 * s); c.quadraticCurveTo(.34 * s, -.82 * s, .52 * s, -.76 * s); c.stroke();
        // beak
        c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(.68 * s, -.16 * s); c.quadraticCurveTo(1.02 * s, -.06 * s, .7 * s, .1 * s); c.quadraticCurveTo(.62 * s, -.03 * s, .68 * s, -.16 * s); c.fill();
        c.strokeStyle = '#e08a1e'; c.lineWidth = s * .03; c.beginPath(); c.moveTo(.7 * s, -.03 * s); c.lineTo(.92 * s, -.04 * s); c.stroke();
        // wing (flaps from the shoulder)
        c.save(); c.translate(-.02 * s, -.02 * s); c.rotate(Math.sin(t * 14) * .28 - .1);
        c.fillStyle = '#3f9fdc'; c.beginPath(); c.moveTo(.16 * s, -.12 * s); c.bezierCurveTo(-.2 * s, -.38 * s, -.72 * s, -.08 * s, -.66 * s, .26 * s); c.bezierCurveTo(-.4 * s, .3 * s, -.02 * s, .3 * s, .16 * s, -.12 * s); c.fill();
        c.strokeStyle = '#7fcbf4'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(-.1 * s, .0); c.quadraticCurveTo(-.36 * s, .02 * s, -.5 * s, .16 * s); c.moveTo(-.02 * s, .1 * s); c.quadraticCurveTo(-.26 * s, .16 * s, -.38 * s, .26 * s); c.stroke();
        c.restore();
        // face + cheek
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(.16 * s, -.42 * s, .14 * s, .07 * s, -.5, 0, TAU); c.fill();
        c.save(); c.translate(.3 * s, -.3 * s); face(c, s * .36, { cheeks: true, mood: 'happy' }); c.restore();
        break;
      }
      case 'snail': {
        c.fillStyle = '#f5d9a8'; c.beginPath(); c.moveTo(-s * .62, s * .3); c.quadraticCurveTo(-s * .68, s * .06, -s * .34, s * .08); c.lineTo(s * .38, s * .08); c.quadraticCurveTo(s * .6, s * .04, s * .6, -s * .3); c.quadraticCurveTo(s * .6, -s * .42, s * .72, -s * .3); c.quadraticCurveTo(s * .86, s * .1, s * .78, s * .3); c.quadraticCurveTo(s * .76, s * .42, s * .6, s * .42); c.lineTo(-s * .5, s * .42); c.quadraticCurveTo(-s * .62, s * .42, -s * .62, s * .3); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(s * .1, s * .3, s * .3, s * .05, 0, 0, TAU); c.fill();
        c.strokeStyle = '#f5d9a8'; c.lineWidth = s * .06; for (const sd of [.5, .68]) { c.beginPath(); c.moveTo(s * sd, -s * .05); c.lineTo(s * (sd + .04), -s * .46); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(s * (sd + .04), -s * .48, s * .05, 0, TAU); c.fill(); }
        c.fillStyle = '#ff9d5c'; c.beginPath(); c.arc(-s * .1, -s * .1, s * .42, 0, TAU); c.fill();
        c.strokeStyle = '#d96a2b'; c.lineWidth = s * .07; c.beginPath(); c.arc(-s * .1, -s * .1, s * .3, .2, 5.4); c.arc(-s * .1, -s * .1, s * .16, 4, 8.8); c.stroke();
        c.save(); c.translate(s * .62, s * .17); face(c, s * .26, { cheeks: false }); c.restore();
        break;
      }
    }
    c.restore();
  }
  const CREATURES = [
    { id: 'bee', name: 'Bee', fly: true }, { id: 'butterfly', name: 'Butterfly', fly: true }, { id: 'ladybug', name: 'Ladybug', fly: false },
    { id: 'bunny', name: 'Bunny', fly: false }, { id: 'bird', name: 'Bird', fly: true }, { id: 'snail', name: 'Snail', fly: false }
  ];

  /* ------------------------------------------------------------ plants */
  const PLANTS = [
    { id: 'sunflower', name: 'Sunflower', creatures: ['bee', 'bird'] },
    { id: 'tulip', name: 'Tulip', creatures: ['butterfly', 'snail'] },
    { id: 'daisy', name: 'Daisy', creatures: ['ladybug', 'bee'] },
    { id: 'strawberry', name: 'Strawberry', creatures: ['bunny', 'butterfly'] }
  ];

  // Origin is the soil surface; growth goes up (negative y). s is the full-grown height in px.
  function plant(c, type, stage, s, t = 0, pop = 0) {
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    const sc = 1 + Math.sin(Math.min(pop, 1) * Math.PI) * .12 * (1 - Math.min(pop, 1) * .3);
    if (pop > 0 && pop < 1) c.scale(1 + (sc - 1) * .6, sc);
    const sway = Math.sin(t * 1.6 + type.length) * s * .018;
    const GREEN = '#59b96e', DARK = '#3f9a5a';
    if (stage === 0) {
      c.fillStyle = '#7a4d33'; c.beginPath(); c.ellipse(0, -s * .03, s * .06, s * .04, .5, 0, TAU); c.fill();
      c.restore(); return;
    }
    const heights = [0, .24, .5, type === 'strawberry' ? .42 : .74];
    const h = s * heights[stage];
    const top = { x: sway * (stage / 3), y: -h };
    if (type !== 'strawberry' || stage < 3) {
      c.strokeStyle = GREEN; c.lineWidth = s * .05;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-sway, -h * .5, top.x, top.y); c.stroke();
    }
    const pair = (y, len, col = GREEN) => { leaf(c, sway * .3, y, len, -.6, col); leaf(c, sway * .3, y, len, Math.PI + .6, col); };
    if (stage === 1) { pair(-h * .9, s * .2); }
    if (stage >= 2) pair(-h * .3, s * .22, DARK);
    if (stage === 2) {
      pair(-h * .9, s * .16);
      const bud = { sunflower: '#ffd54a', tulip: '#ff8fb0', daisy: '#ffffff', strawberry: '#fff' }[type];
      c.fillStyle = bud; c.strokeStyle = GREEN; c.lineWidth = s * .02;
      c.beginPath(); c.ellipse(top.x, top.y - s * .05, s * .07, s * .1, 0, 0, TAU); c.fill(); c.stroke();
      if (type === 'strawberry') { c.fillStyle = '#ffe98a'; c.beginPath(); c.arc(top.x, top.y - s * .05, s * .03, 0, TAU); c.fill(); }
    }
    if (stage === 3) {
      c.save(); c.translate(top.x, top.y);
      if (type === 'sunflower') {
        const R = s * .22;
        for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 14; i++) { c.save(); c.rotate(i * TAU / 14 + ring * .22); c.fillStyle = ring ? '#ffc933' : '#ffdf5e'; c.beginPath(); c.ellipse(R * (1.0 - ring * .08), 0, R * .42, R * .19, 0, 0, TAU); c.fill(); c.restore(); }
        c.fillStyle = '#8a5a3a'; c.beginPath(); c.arc(0, 0, R * .72, 0, TAU); c.fill();
        c.fillStyle = '#a06f48'; c.beginPath(); c.arc(-R * .1, -R * .1, R * .55, 0, TAU); c.fill();
        c.save(); face(c, R * .8, { mood: 'happy', blink: Math.sin(t * .9) > .985 }); c.restore();
      } else if (type === 'daisy') {
        const R = s * .17;
        for (let i = 0; i < 11; i++) { c.save(); c.rotate(i * TAU / 11); c.fillStyle = '#fff'; c.strokeStyle = '#e6e0f2'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(R * .95, 0, R * .62, R * .26, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
        c.fillStyle = '#ffd54a'; c.beginPath(); c.arc(0, 0, R * .66, 0, TAU); c.fill();
        c.save(); face(c, R * .62); c.restore();
      } else if (type === 'tulip') {
        const R = s * .2;
        c.fillStyle = '#e8577f'; c.beginPath(); c.moveTo(-R * .85, -R * .9); c.quadraticCurveTo(-R * 1.1, R * .5, 0, R * .55); c.quadraticCurveTo(R * 1.1, R * .5, R * .85, -R * .9); c.lineTo(R * .4, -R * .45); c.lineTo(0, -R * 1.05); c.lineTo(-R * .4, -R * .45); c.closePath(); c.fill();
        c.fillStyle = '#ff7fa1'; c.beginPath(); c.moveTo(-R * .55, -R * .75); c.quadraticCurveTo(-R * .9, R * .4, 0, R * .5); c.quadraticCurveTo(R * .9, R * .4, R * .55, -R * .75); c.quadraticCurveTo(0, -R * .3, -R * .55, -R * .75); c.fill();
        c.save(); c.translate(0, -R * .05); face(c, R * .62); c.restore();
      } else { // strawberry bush
        c.restore(); c.save();
        for (const [x, y, rad] of [[-.16, -.16, .16], [.16, -.16, .16], [0, -.3, .19], [-.08, -.05, .14], [.1, -.06, .14]]) { c.fillStyle = y < -.2 ? '#4fae66' : DARK; c.beginPath(); c.ellipse(x * s, y * s, rad * s * 1.1, rad * s * .8, 0, 0, TAU); c.fill(); }
        for (const [x, y, k] of [[-.2, -.09, .085], [.21, -.11, .09], [.02, -.19, .1]]) { c.save(); c.translate(x * s, y * s); fruit(c, 3, s * k, { mood: 'happy' }); c.restore(); }
      }
      c.restore();
    }
    c.restore();
  }

  /* ------------------------------------------------------------ avatars */
  // The frog: a wide, flat head with two eye bumps on top (same green), big eyeballs with a real upper eyelid that
  // closes on a blink or sleep (cheer = happy arcs). Drawn before the face, which adds blush, nose and a wide smile.
  function frogHead(c, r, mood, shut, col) {
    const lid = '#5bb848', lidDark = '#3f9a3a', cy = -r * .6, ex = r * .5, er = r * .32, ey = r * .25;
    for (const s of [-1, 1]) { c.fillStyle = col; c.beginPath(); c.arc(s * ex, cy, er, 0, TAU); c.fill(); }
    c.fillStyle = col; c.beginPath(); c.ellipse(0, r * .1, r * 1.1, r * .8, 0, 0, TAU); c.fill();
    // soft shine and a few darker spots
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-r * .38, -r * .22, r * .26, r * .1, -.35, 0, TAU); c.fill();
    c.fillStyle = 'rgba(60,140,60,.28)';
    for (const [x, y, a, b] of [[-.72, .12, .1, .07], [.74, .08, .09, .065], [-.5, .66, .08, .055], [.52, .62, .1, .06], [.02, -.18, .06, .045], [.84, .42, .06, .045]]) { c.beginPath(); c.ellipse(x * r, y * r, a * r, b * r, 0, 0, TAU); c.fill(); }
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * ex, cy);
      if (mood === 'cheer') {            // happy closed eyes: a green lid with a curved smile line
        c.fillStyle = lid; c.beginPath(); c.arc(0, 0, ey * 1.05, 0, TAU); c.fill();
        c.strokeStyle = INK; c.lineWidth = Math.max(1.6, r * .06); c.beginPath(); c.arc(0, ey * .35, ey * .62, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      } else if (shut) {                 // lid fully down, with a little curved lash line
        c.fillStyle = lid; c.beginPath(); c.arc(0, 0, ey * 1.05, 0, TAU); c.fill();
        c.strokeStyle = INK; c.lineWidth = Math.max(1.6, r * .055); c.beginPath(); c.arc(0, -ey * .55, ey * .85, Math.PI * .2, Math.PI * .8); c.stroke();
      } else {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, ey, 0, TAU); c.fill();
        c.fillStyle = INK; c.beginPath(); c.arc(0, ey * .12, ey * .56, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-ey * .2, -ey * .12, ey * .2, 0, TAU); c.fill();
        // the upper eyelid: a darker green lid covering the top of the eyeball
        const edge = -ey * .45, sag = ey * .25;
        c.save(); c.beginPath(); c.arc(0, 0, ey * 1.02, 0, TAU); c.clip();
        c.fillStyle = lid; c.beginPath(); c.moveTo(-ey * 1.1, -ey * 1.2); c.lineTo(ey * 1.1, -ey * 1.2); c.lineTo(ey * 1.1, edge); c.quadraticCurveTo(0, edge + sag * 2, -ey * 1.1, edge); c.closePath(); c.fill();
        c.restore();
        c.strokeStyle = lidDark; c.lineWidth = Math.max(1.4, r * .045);
        c.beginPath(); c.moveTo(-ey * 1.0, edge); c.quadraticCurveTo(0, edge + sag * 2, ey * 1.0, edge); c.stroke();
        c.beginPath(); c.arc(0, 0, ey * 1.02, 0, TAU); c.stroke();
      }
      c.restore();
    }
  }

  const AVATARS = ['bunny', 'bear', 'cat', 'fox', 'frog', 'panda'];
  function avatar(c, kind, r, o = {}) {
    c.save(); c.lineCap = 'round';
    const head = { bunny: '#fff', bear: '#c98b5b', cat: '#ffb45e', fox: '#ff8a4c', frog: '#84d96a', panda: '#fff', dog: '#d9a26c', hamster: '#f4c98f', duck: '#ffe066', pig: '#ffb3c6', lamb: '#fdfdfd', penguin: '#3d2c44', mouse: '#c9c5d3', unicorn: '#fff', elephant: '#b8c4d6', owl: '#b98a5a', trex: '#6fcf6a', trike: '#e9a15e', stego: '#a78be0', bronto: '#6fb8f2', babydino: '#b8ec8c' }[kind];
    const ear = (x, y, rad, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill(); };
    if (kind === 'bunny') for (const s of [-1, 1]) { c.save(); c.translate(s * r * .38, -r * .72); c.rotate(s * .15); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -r * .28, r * .2, r * .52, 0, 0, TAU); c.fill(); c.fillStyle = '#ffc4d6'; c.beginPath(); c.ellipse(0, -r * .26, r * .09, r * .38, 0, 0, TAU); c.fill(); c.restore(); }
    if (kind === 'bear') for (const s of [-1, 1]) { ear(s * r * .68, -r * .66, r * .28, head); ear(s * r * .68, -r * .66, r * .14, '#f3c9a0'); }
    if (kind === 'panda') for (const s of [-1, 1]) ear(s * r * .7, -r * .7, r * .27, '#3d2c44');
    if (kind === 'cat' || kind === 'fox') for (const s of [-1, 1]) { c.fillStyle = head; c.beginPath(); c.moveTo(s * r * .85, -r * .3); c.lineTo(s * r * .6, -r * 1.05); c.lineTo(s * r * .15, -r * .75); c.closePath(); c.fill(); c.fillStyle = kind === 'cat' ? '#ffc4d6' : '#3d2c44'; c.beginPath(); c.moveTo(s * r * .7, -r * .5); c.lineTo(s * r * .6, -r * .88); c.lineTo(s * r * .33, -r * .7); c.closePath(); c.fill(); }
    const frog = kind === 'frog', mood = o.mood || 'happy', shut = !!o.blink || mood === 'sleep';
    if (frog) frogHead(c, r, mood, shut, head);
    const ell2 = (x, y, rx, ry, rot, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); c.fill(); };
    if (kind === 'dog') for (const s of [-1, 1]) ell2(s * r * .86, -r * .1, r * .3, r * .56, s * .3, '#a8744f');
    if (kind === 'hamster') for (const s of [-1, 1]) { ear(s * r * .62, -r * .7, r * .22, head); ear(s * r * .62, -r * .7, r * .12, '#ffc4d6'); }
    if (kind === 'pig') for (const s of [-1, 1]) { c.fillStyle = '#ff9db5'; c.beginPath(); c.moveTo(s * r * .3, -r * .85); c.lineTo(s * r * .95, -r * .72); c.lineTo(s * r * .72, -r * .2); c.closePath(); c.fill(); }
    if (kind === 'lamb') for (const s of [-1, 1]) ell2(s * r * 1.0, -r * .08, r * .3, r * .15, s * -.4, '#5a4a4a');
    if (kind === 'mouse') for (const s of [-1, 1]) { ear(s * r * .74, -r * .66, r * .4, head); ear(s * r * .74, -r * .66, r * .26, '#ffc4d6'); }
    if (kind === 'elephant') for (const s of [-1, 1]) { ell2(s * r * .98, -r * .05, r * .55, r * .64, s * .15, '#a4b2c8'); ell2(s * r * .98, -r * .03, r * .36, r * .44, s * .15, '#ffc4d6'); }
    if (kind === 'owl') for (const s of [-1, 1]) { c.fillStyle = '#8a6440'; c.beginPath(); c.moveTo(s * r * .3, -r * .9); c.lineTo(s * r * .82, -r * 1.2); c.lineTo(s * r * .86, -r * .5); c.closePath(); c.fill(); }
    if (kind === 'unicorn') {
      for (const [x, y, rad, col] of [[-.9, -.5, .3, '#ff9fd0'], [-1.0, -.1, .3, '#c9a8f0'], [-.9, .3, .28, '#8fd0ff'], [.9, -.5, .3, '#ff9fd0'], [1.0, -.1, .3, '#c9a8f0']]) ear(x * r, y * r, rad * r, col);
      for (const s of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(s * r * .7, -r * .5); c.lineTo(s * r * .5, -r * 1.05); c.lineTo(s * r * .2, -r * .8); c.closePath(); c.fill(); c.fillStyle = '#ffc4d6'; c.beginPath(); c.moveTo(s * r * .58, -r * .62); c.lineTo(s * r * .5, -r * .9); c.lineTo(s * r * .34, -r * .78); c.closePath(); c.fill(); }
    }
    if (kind === 'trike') { c.fillStyle = '#ff9fb5'; c.beginPath(); c.arc(0, -r * .25, r * 1.22, Math.PI * .92, Math.PI * 2.08); c.closePath(); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { const an = Math.PI * (1.02 + i * .16); c.beginPath(); c.arc(Math.cos(an) * r * 1.12, -r * .25 + Math.sin(an) * r * 1.12, r * .1, 0, TAU); c.fill(); } }
    if (kind === 'stego') { c.fillStyle = '#ffd54a'; for (const [x, h] of [[-.5, .4], [0, .55], [.5, .4]]) { c.beginPath(); c.moveTo(r * (x - .22), -r * .86); c.lineTo(r * x, -r * (.86 + h)); c.lineTo(r * (x + .22), -r * .86); c.closePath(); c.fill(); } }
    if (kind === 'trex') { c.fillStyle = '#58b855'; for (const x of [-.3, 0, .3]) { c.beginPath(); c.moveTo(r * (x - .12), -r * .92); c.lineTo(r * x, -r * 1.12); c.lineTo(r * (x + .12), -r * .92); c.closePath(); c.fill(); } }
    if (!frog) { c.fillStyle = head; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-r * .4, -r * .5, r * .3, r * .13, -.5, 0, TAU); c.fill(); }
    if (kind === 'trex' || kind === 'trike' || kind === 'stego' || kind === 'bronto' || kind === 'babydino') { c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(0, r * .34, r * .58, r * .42, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,.18)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * .16, r * .16, r * .035, r * .05, 0, 0, TAU); c.fill(); } }
    if (kind === 'trike') { c.fillStyle = '#fff6d8'; c.strokeStyle = '#d9b070'; c.lineWidth = r * .03; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .5, -r * .5); c.lineTo(s * r * .62, -r * 1.12); c.lineTo(s * r * .3, -r * .62); c.closePath(); c.fill(); c.stroke(); } c.beginPath(); c.moveTo(-r * .1, r * .06); c.lineTo(0, -r * .4); c.lineTo(r * .1, r * .06); c.closePath(); c.fill(); c.stroke(); }
    if (kind === 'babydino') { c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = r * .03; c.beginPath(); c.moveTo(-r * .85, -r * .3); for (let i = 0; i < 5; i++) { c.lineTo(-r * .85 + (i + .5) * r * .34, -r * (.3 + (i % 2 ? .1 : .34))); c.lineTo(-r * .85 + (i + 1) * r * .34, -r * .3); } c.arc(0, -r * .3, r * .85, 0, -Math.PI, true); c.closePath(); c.fill(); c.stroke(); }
    if (kind === 'lamb') { c.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { const an = Math.PI * (1.08 + i * .14); c.beginPath(); c.arc(Math.cos(an) * r * .78, Math.sin(an) * r * .8 - r * .1, r * .3, 0, TAU); c.fill(); } c.fillStyle = 'rgba(90,74,74,.14)'; c.beginPath(); c.ellipse(0, r * .18, r * .74, r * .7, 0, 0, TAU); c.fill(); }
    if (kind === 'penguin') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -r * .1); c.bezierCurveTo(r * .9, -r * .75, r * 1.0, r * .7, 0, r * .96); c.bezierCurveTo(-r * 1.0, r * .7, -r * .9, -r * .75, 0, -r * .1); c.fill(); }
    if (kind === 'dog') { c.fillStyle = '#fff2df'; c.beginPath(); c.ellipse(0, r * .32, r * .5, r * .42, 0, 0, TAU); c.fill(); ell2(-r * .42, -r * .28, r * .3, r * .28, 0, '#a8744f'); }
    if (kind === 'hamster') { c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * .5, r * .3, r * .38, r * .34, 0, 0, TAU); c.fill(); } }
    if (kind === 'pig') { c.fillStyle = '#ff9db5'; c.beginPath(); c.ellipse(0, r * .28, r * .34, r * .26, 0, 0, TAU); c.fill(); c.fillStyle = '#e0688a'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * .12, r * .28, r * .05, r * .08, 0, 0, TAU); c.fill(); } }
    if (kind === 'owl') { c.fillStyle = '#f3d9b0'; c.beginPath(); c.ellipse(0, r * .3, r * .55, r * .6, 0, 0, TAU); c.fill(); for (const s of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(s * r * .34, -r * .06, r * .34, 0, TAU); c.fill(); c.strokeStyle = '#8a6440'; c.lineWidth = r * .06; c.stroke(); } }
    if (kind === 'elephant') { c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(0, r * .2, r * .55, r * .5, 0, 0, TAU); c.fill(); }
    if (kind === 'unicorn') { c.fillStyle = '#ffe680'; c.beginPath(); c.moveTo(-r * .24, -r * .84); c.lineTo(0, -r * 1.9); c.lineTo(r * .24, -r * .84); c.closePath(); c.fill(); c.strokeStyle = '#f0b429'; c.lineWidth = r * .05; for (const y of [-1.0, -1.18, -1.36]) { c.beginPath(); c.moveTo(-r * (.13 - (y + 1) * -.06), r * y); c.lineTo(r * (.13 - (y + 1) * -.06), r * y + r * .06); c.stroke(); } }
    if (kind === 'fox') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-r * 1, r * .1); c.quadraticCurveTo(0, r * .3, r * 1, r * .1); c.quadraticCurveTo(r * .7, r * .95, 0, r * .98); c.quadraticCurveTo(-r * .7, r * .95, -r * 1, r * .1); c.fill(); }
    if (kind === 'panda') { c.fillStyle = '#3d2c44'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * .34, -r * .05, r * .19, r * .25, s * .4, 0, TAU); c.fill(); } }
    if (frog) { c.save(); c.translate(0, r * .1); face(c, r * .9, { mood, blink: shut, noEyes: true, wide: 1.75 }); c.restore(); }
    else face(c, r * .9, { mood, blink: !!o.blink, cheeks: kind !== 'panda' });
    if (kind === 'panda' && !o.blink && (o.mood || 'happy') === 'happy') { c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * .31, -r * .08, r * .06, 0, TAU); c.fill(); } }
    if (kind === 'duck' || kind === 'penguin' || kind === 'owl') { c.fillStyle = '#ff9d3d'; c.beginPath(); if (kind === 'owl') { c.moveTo(-r * .1, r * .1); c.lineTo(r * .1, r * .1); c.lineTo(0, r * .34); } else { c.ellipse(0, r * .2, r * .24, r * .12, 0, 0, TAU); } c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-r * .06, r * .16, r * .08, r * .03, 0, 0, TAU); c.fill(); }
    else if (kind === 'elephant') { c.fillStyle = '#a4b2c8'; c.beginPath(); c.roundRect ? c.roundRect(-r * .17, r * .1, r * .34, r * .78, r * .17) : c.rect(-r * .17, r * .1, r * .34, r * .78); c.fill(); c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = r * .03; for (const y of [.3, .45, .6]) { c.beginPath(); c.moveTo(-r * .15, r * y); c.lineTo(r * .15, r * y); c.stroke(); } }
    else if (kind === 'trex') { c.fillStyle = '#fff'; for (const s of [-1, 1]) for (const k of [0, 1]) { c.beginPath(); c.moveTo(s * r * (.12 + k * .16), r * .4); c.lineTo(s * r * (.2 + k * .16), r * .4); c.lineTo(s * r * (.16 + k * .16), r * .5); c.closePath(); c.fill(); } }
    else if (kind !== 'pig') { const ny = frog ? r * .26 : r * .16; c.fillStyle = kind === 'cat' || kind === 'fox' || kind === 'bear' || kind === 'dog' ? '#5a3f5e' : '#ff8aa3'; c.beginPath(); c.ellipse(0, ny, r * .07, r * .05, 0, 0, TAU); c.fill(); }
    c.restore();
  }

  /* ------------------------------------------------------------ bucket */
  // Glass pail: fill is 0..1. (x, y) = centre of the rim.
  function bucket(c, x, y, w, h, fill, t, mood = 'happy') {
    c.save(); c.translate(x, y);
    const top = w / 2, bot = w * .36;
    const body = () => { c.beginPath(); c.moveTo(-top, 0); c.lineTo(-bot, h); c.quadraticCurveTo(0, h + h * .12, bot, h); c.lineTo(top, 0); c.closePath(); };
    // handle
    c.strokeStyle = '#ff9db8'; c.lineWidth = w * .05; c.beginPath(); c.arc(0, 0, top * .98, Math.PI, 0); c.stroke();
    body(); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
    c.save(); body(); c.clip();
    const level = h * (1 - Math.min(1, fill) * .92);
    const g = c.createLinearGradient(0, level, 0, h);
    g.addColorStop(0, '#8fdcff'); g.addColorStop(1, '#3fa9ee');
    c.fillStyle = g; c.beginPath(); c.moveTo(-top, h * 2);
    for (let i = -top; i <= top; i += 6) c.lineTo(i, level + Math.sin(i * .05 + t * 4) * h * .022);
    c.lineTo(top, h * 2); c.fill();
    c.restore();
    body(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = w * .03; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-top * .62, h * .5, w * .025, h * .22, -.12, 0, TAU); c.fill();
    c.fillStyle = '#ff9db8'; rr(c, -top - w * .04, -h * .07, w + w * .08, h * .14, h * .07); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, -top, -h * .04, w, h * .03, h * .02); c.fill();
    c.save(); c.translate(0, h * .5); face(c, w * .3, { mood }); c.restore();
    c.restore();
  }

  // The meteor shower's catcher: a glowing star net on a gold hoop (not a water bucket). Same size and position as the bucket.
  function catcher(c, x, y, w, h, t, mood = 'happy', glow = 0) {
    c.save(); c.translate(x, y);
    const top = w / 2, bot = w * .2, deep = h * 1.18, pulse = .5 + Math.sin(t * 3) * .5;
    // a soft starlight glow around it, brighter when it has just caught something
    const g = c.createRadialGradient(0, h * .2, w * .1, 0, h * .2, w * .85); g.addColorStop(0, `rgba(255,236,150,${(.28 + pulse * .1 + glow * .3).toFixed(3)})`); g.addColorStop(1, 'rgba(255,236,150,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, h * .2, w * .85, 0, TAU); c.fill();
    const hoopY = h * .1;
    // the back of the hoop, then the net, then the front of the hoop
    c.strokeStyle = '#e8b23a'; c.lineWidth = w * .045; c.beginPath(); c.ellipse(0, 0, top, hoopY, 0, Math.PI, TAU); c.stroke();
    const net = () => { c.beginPath(); c.moveTo(-top, 0); c.bezierCurveTo(-top * 1.02, h * .7, -bot, deep, 0, deep); c.bezierCurveTo(bot, deep, top * 1.02, h * .7, top, 0); c.closePath(); };
    net(); c.fillStyle = 'rgba(176,160,255,.55)'; c.fill();
    c.save(); net(); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(1.2, w * .012);
    for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(i * top / 6, 0); c.quadraticCurveTo(i * top / 6 * .9, h * .7, i * bot / 6, deep); c.stroke(); }
    for (let k = 1; k <= 4; k++) { const yy = deep * k / 5.2, ww = top * (1 - k * .17); c.beginPath(); c.moveTo(-ww, yy); c.quadraticCurveTo(0, yy + h * .08, ww, yy); c.stroke(); }
    c.restore();
    net(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = w * .02; c.stroke();
    c.strokeStyle = '#ffd54a'; c.lineWidth = w * .05; c.beginPath(); c.ellipse(0, 0, top, hoopY, 0, 0, Math.PI); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = w * .015; c.beginPath(); c.ellipse(0, -hoopY * .15, top * .94, hoopY * .8, 0, Math.PI * 1.08, Math.PI * 1.5); c.stroke();
    // little stars twinkling around the rim
    for (let i = 0; i < 4; i++) { const a = t * .9 + i * TAU / 4, tw = .55 + Math.sin(t * 5 + i * 2) * .45; c.globalAlpha = tw; star(c, Math.cos(a) * top * 1.02, Math.sin(a) * hoopY * 1.7 - h * .05, w * (.028 + glow * .02), '#fff7c2', a); }
    c.globalAlpha = 1;
    c.save(); c.translate(0, h * .52); face(c, w * .28, { mood }); c.restore();
    c.restore();
  }

  /* ------------------------------------------------------------ particles */
  class Fx {
    constructor() { this.p = []; }
    burst(x, y, n, { colors = ['#ffd54a'], speed = 220, g = 500, life = .8, size = 6, shape = 'circle', up = 0 } = {}) {
      for (let i = 0; i < n && this.p.length < 400; i++) {
        const a = Math.random() * TAU, v = speed * (.3 + Math.random() * .7);
        this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, g, life: life * (.6 + Math.random() * .6), max: life, size: size * (.6 + Math.random() * .8), color: colors[i % colors.length], shape, rot: Math.random() * 6, vr: (Math.random() - .5) * 8 });
      }
    }
    update(dt) {
      for (const p of this.p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; p.rot += p.vr * dt; }
      this.p = this.p.filter(p => p.life > 0);
    }
    draw(c) {
      for (const p of this.p) {
        c.globalAlpha = Math.min(1, p.life / p.max * 2);
        c.fillStyle = p.color;
        if (p.shape === 'star') star(c, p.x, p.y, p.size, p.color, p.rot);
        else if (p.shape === 'heart') heart(c, p.x, p.y, p.size, p.color);
        else if (p.shape === 'confetti') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size * .6, -p.size * .3, p.size * 1.2, p.size * .6); c.restore(); }
        else { c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill(); }
      }
      c.globalAlpha = 1;
    }
  }

  SPG.art = { TAU, INK, shade, rr, lerp, face, cloud, sun, hills, scene, star, heart, drop, fruit, FRUIT_JUICE, FRUIT_COUNT, leaf, bee, creature, CREATURES, plant, PLANTS, avatar, AVATARS, bucket, catcher, Fx };
})();
