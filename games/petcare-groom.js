/* Pet Care grooming: what gets a pet dirty and how it comes clean again.
   Everything is stored as small plain objects with positions as fractions of the pet's height (s), measured from its feet,
   so it looks the same in the room and in the close-up.
     bag.grime  [{ k: 'mud' | 'dust' | 'grass' | 'jam', x, y, r, a (amount 1 -> 0), seed }]
     bag.knots  [{ x, y, a, seed }]    matted fur: brush it out (wet fur brushes out much faster)
     bag.burrs  [{ x, y, h, seed }]    prickly seed heads stuck in the fur: brush or pick them off
   Suds (soap) and wetness are short lived and live in the game (st.suds, st.wet).
   SPG.careGroom.drawLayer paints it all; it is meant to be drawn with 'source-atop' on top of the pet so it stays on the pet. */
(() => {
  const SPG = window.SPG, TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const NGRIME = 14;   // this much stain in all is a completely filthy pet

  // lighten (+) or darken (-) a six-digit hex colour; dark colours go lighter so a knot always shows
  function tint(hex, amt) {
    if (/^#[0-9a-f]{3}$/i.test(hex || '')) hex = '#' + hex.slice(1).split('').map(q => q + q).join('');
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) hex = '#b09070';
    const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
    if (ch[0] * .3 + ch[1] * .59 + ch[2] * .11 < 80 && amt < 0) amt = -amt * .8;
    return '#' + ch.map(v => Math.round(clamp(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt, 0, 255)).toString(16).padStart(2, '0')).join('');
  }

  // places on a pet that get dirty (fractions of s from the feet); the head ones depend on how tall the head is
  function zones(id) {
    const hy = id === 'bronto' ? -.8 : -.6;
    const body = [[-.13, -.27], [.15, -.19], [0, -.12], [-.19, -.13], [.11, -.36], [-.07, -.38], [-.15, -.17], [.15, -.17], [.2, -.3], [-.21, -.28]];
    const head = [[-.15, hy + .08], [.1, hy - .13], [.17, hy + .08], [-.03, hy + .03]];
    return { body, head, all: body.concat(head) };
  }
  const level = bag => clamp((bag.grime || []).reduce((q, g) => q + g.a, 0) / NGRIME, 0, 1);
  const RADIUS = { mud: [.045, .065], dust: [.06, .085], grass: [.04, .055], jam: [.035, .05] };
  const pickKind = () => { const r = Math.random(); return r < .4 ? 'mud' : r < .62 ? 'dust' : r < .82 ? 'grass' : 'jam'; };

  // add stains until the pet is as dirty as `target` (0..1)
  function seed(bag, id, target) {
    bag.grime = bag.grime || [];
    const Z = zones(id).all;
    let sum = bag.grime.reduce((q, g) => q + g.a, 0), guard = 0;
    while (sum / NGRIME < target - .001 && guard++ < 40) {
      const spots = Z.filter(z => !bag.grime.some(g => Math.hypot(g.x - z[0], g.y - z[1]) < .05)), z = (spots.length ? spots : Z)[Math.floor(Math.random() * (spots.length || Z.length))];
      const k = pickKind(), rr = RADIUS[k], a = Math.min(1, Math.max(.3, target * NGRIME - sum), .6 + Math.random() * .4);
      bag.grime.push({ k, x: z[0] + (Math.random() - .5) * .03, y: Math.min(-.16, z[1] + (Math.random() - .5) * .03), r: rr[0] + Math.random() * (rr[1] - rr[0]), a, seed: Math.floor(Math.random() * 900) });
      sum += a;
    }
    bag.dirt = level(bag);
  }
  // matted fur and burrs come back with time (more at the first visit); smooth-skinned pets get none of the fur kind
  function furTick(bag, id, mins) {
    const sp = (SPG.pets.SPECIES || {})[id] || {}, Z = zones(id), first = !bag.knots;
    bag.knots = bag.knots || []; bag.burrs = bag.burrs || [];
    const pick = () => { const z = Z.all[Math.floor(Math.random() * Z.all.length)]; return [z[0] + (Math.random() - .5) * .04, Math.min(-.16, z[1] + (Math.random() - .5) * .04)]; };   // never down among the toolbar buttons
    const addK = Math.floor(mins / 10) + (first ? 3 : 0), addB = Math.floor(mins / 15) + (first ? 2 : 0);
    if (!sp.smooth) for (let i = 0; i < addK && bag.knots.length < 6; i++) { const p = pick(); bag.knots.push({ x: p[0], y: p[1], a: 1, seed: Math.floor(Math.random() * 900) }); }
    for (let i = 0; i < addB && bag.burrs.length < 4; i++) { const p = pick(); bag.burrs.push({ x: p[0], y: p[1], h: 1, seed: Math.floor(Math.random() * 900), shake: 0 }); }
  }

  /* ------------------------------------------------------------ drawing (pet space: feet at 0,0, s = pet height) */
  function mudBlob(c, x, y, r, seedN, k, wet) {
    const n = 10, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (.82 + rnd(seedN + i) * .3); pts.push([x + Math.cos(a) * rr * (1 + rnd(seedN + 50) * .2), y + Math.sin(a) * rr * .9]); }
    const path = () => { c.beginPath(); c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2); for (let i = 0; i < n; i++) { const p1 = pts[i], p2 = pts[(i + 1) % n]; c.quadraticCurveTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2); } c.closePath(); };
    c.save(); c.globalAlpha = Math.min(1, k * 1.6);
    path(); const g = c.createRadialGradient(x - r * .2, y - r * .25, r * .1, x, y, r * 1.1);
    g.addColorStop(0, wet > .3 ? '#6e4726' : '#8a6038'); g.addColorStop(.6, wet > .3 ? '#52331a' : '#6a4526'); g.addColorStop(1, '#3f2713'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(30,18,8,.35)'; c.lineWidth = Math.max(1, r * .08); c.stroke();
    c.save(); path(); c.clip();
    c.fillStyle = `rgba(200,160,110,${(.55 - wet * .35).toFixed(2)})`; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + (rnd(seedN + 70 + i) - .5) * r * 1.1, y + (rnd(seedN + 80 + i) - .3) * r * .8, r * (.05 + rnd(seedN + 90 + i) * .06), 0, TAU); c.fill(); }   // dried bits
    c.restore();
    c.fillStyle = `rgba(255,255,255,${(.22 + wet * .3).toFixed(2)})`; c.beginPath(); c.ellipse(x - r * .3, y - r * .32, r * .26, r * .11, -.5, 0, TAU); c.fill();   // wet shine
    c.restore();
  }
  function drawStain(c, g, s, t, wet) {
    const x = g.x * s, y = g.y * s, a = clamp(g.a, 0, 1), r = g.r * s * (.45 + .55 * a), sd = g.seed;
    c.save();
    if (g.k === 'mud') {
      mudBlob(c, x, y, r, sd, a, wet);
      if (a > .4) {
        c.fillStyle = 'rgba(80,52,30,.8)'; c.globalAlpha = Math.min(1, a * 1.4);
        for (let j = 0; j < 3; j++) { const an = rnd(sd + j) * TAU, d = r * (1.3 + rnd(sd * 3 + j) * .7); c.beginPath(); c.arc(x + Math.cos(an) * d, y + Math.sin(an) * d * .8, r * (.07 + rnd(sd + j * 5) * .08), 0, TAU); c.fill(); }
        if (sd % 2 === 0) { c.beginPath(); c.ellipse(x + r * .2, y + r * 1.1 + Math.sin(t * .8 + sd) * r * .06, r * .13, r * .3, 0, 0, TAU); c.fill(); }   // a slow drip
      }
    } else if (g.k === 'dust') {   // soft, matte puffs of grey-tan dust
      for (let i = 0; i < 7; i++) {
        const px = x + (rnd(sd + i) - .5) * r * 1.5, py = y + (rnd(sd + 20 + i) - .5) * r * 1.1, pr = r * (.4 + rnd(sd + 40 + i) * .35);
        const gr = c.createRadialGradient(px, py, 0, px, py, pr); gr.addColorStop(0, `rgba(176,156,126,${(a * .62).toFixed(3)})`); gr.addColorStop(1, 'rgba(176,156,126,0)');
        c.fillStyle = gr; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
      }
      c.fillStyle = `rgba(120,100,76,${(a * .45).toFixed(3)})`; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + (rnd(sd + 60 + i) - .5) * r * 1.6, y + (rnd(sd + 70 + i) - .5) * r * 1.2, r * .06, 0, TAU); c.fill(); }   // gritty specks
    } else if (g.k === 'grass') {   // a green smear with a couple of streaks and a bit of leaf
      c.translate(x, y); c.rotate((rnd(sd) - .5) * 1.3); c.globalAlpha = Math.min(1, a * 1.4) * .9;
      c.fillStyle = '#5d9b44'; c.beginPath(); c.ellipse(0, 0, r * 1.15, r * .55, 0, 0, TAU); c.fill();
      c.fillStyle = '#7dbf5a'; c.beginPath(); c.ellipse(-r * .22, -r * .1, r * .7, r * .3, 0, 0, TAU); c.fill();
      c.strokeStyle = '#3f7a30'; c.lineWidth = Math.max(1, r * .1); c.lineCap = 'round'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(-r * .9, i * r * .22); c.quadraticCurveTo(0, i * r * .22 + r * .14, r * .9, i * r * .18); c.stroke(); }
      c.fillStyle = '#4d8a3a'; c.beginPath(); c.moveTo(r * .9, -r * .1); c.quadraticCurveTo(r * 1.35, -r * .5, r * 1.55, -r * .1); c.quadraticCurveTo(r * 1.3, r * .05, r * .9, -r * .1); c.fill();
    } else {   // jam: sticky, glossy and bright
      const gr = c.createRadialGradient(x - r * .25, y - r * .3, r * .1, x, y, r * 1.1); gr.addColorStop(0, '#e24b6c'); gr.addColorStop(.7, '#b3203f'); gr.addColorStop(1, '#85152f');
      c.globalAlpha = Math.min(1, a * 1.5); c.fillStyle = gr; c.beginPath(); c.moveTo(x + r, y);
      for (let i = 1; i <= 12; i++) { const an = i / 12 * TAU, rr = r * (.85 + rnd(sd + i) * .3); c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * .85); }
      c.closePath(); c.fill(); c.strokeStyle = 'rgba(100,10,30,.35)'; c.lineWidth = Math.max(1, r * .07); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(x - r * .3, y - r * .3, r * .28, r * .12, -.5, 0, TAU); c.fill();
      c.fillStyle = '#85152f'; c.beginPath(); c.ellipse(x + r * .3, y + r * 1.05 + Math.sin(t * .7 + sd) * r * .05, r * .14, r * .32, 0, 0, TAU); c.fill();   // a sticky drip
      c.fillStyle = 'rgba(70,0,20,.7)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + (rnd(sd + 80 + i) - .5) * r * 1.1, y + (rnd(sd + 90 + i) - .5) * r * .8, r * .06, 0, TAU); c.fill(); }   // seeds
    }
    c.restore();
  }
  // a matted knot: a tangle of dark loops that straightens and thins as it is brushed
  function drawKnot(c, k, s, body, t) {
    const x = k.x * s, y = k.y * s, a = clamp(k.a, 0, 1), amp = s * .05 * a + s * .004, len = s * .08 * (.45 + .55 * a), sd = k.seed;
    const dark = tint(body, -.34), mid = tint(body, -.16);
    c.save(); c.translate(x, y); c.lineCap = 'round'; c.globalAlpha = Math.min(1, .2 + a * 1.3);
    c.fillStyle = 'rgba(70,45,45,.14)'; c.beginPath(); c.ellipse(0, s * .012, len * 1.05, len * .5, 0, 0, TAU); c.fill();
    for (let i = 0; i < 7; i++) {   // strands all lie the same way, but loop and cross where they are matted
      const an = .7 + (rnd(sd + i) - .5) * .9, cx = Math.cos(an), cy = Math.sin(an), nx = -cy, ny = cx, o1 = (rnd(sd + 10 + i) - .5) * 2.6 * amp, o2 = (rnd(sd + 20 + i) - .5) * 2.6 * amp, w = Math.sin(t * 2 + i) * amp * .05;
      c.strokeStyle = i % 2 ? dark : mid; c.lineWidth = s * (.007 + .003 * rnd(sd + 30 + i)); c.globalAlpha = Math.min(1, .2 + a * 1.3) * .85;
      c.beginPath(); c.moveTo(-cx * len, -cy * len); c.bezierCurveTo(-cx * len * .2 + nx * o1, -cy * len * .2 + ny * o1 + w, cx * len * .2 + nx * o2, cy * len * .2 + ny * o2 - w, cx * len, cy * len); c.stroke();
    }
    c.globalAlpha = Math.min(1, .2 + a * 1.3);
    c.strokeStyle = mid; c.lineWidth = s * .0045;   // a few stray hairs sticking out
    for (let i = 0; i < 3; i++) { const an = .7 + (rnd(sd + 40 + i) - .5) * 2.4 + (i % 2 ? Math.PI : 0), l1 = len * 1.0, l2 = len * (1.25 + a * .4); c.beginPath(); c.moveTo(Math.cos(an) * l1, Math.sin(an) * l1 * .7); c.quadraticCurveTo(Math.cos(an + .3) * (l1 + l2) / 2, Math.sin(an + .3) * (l1 + l2) / 2 * .7, Math.cos(an) * l2, Math.sin(an) * l2 * .7); c.stroke(); }
    c.restore();
  }
  // a prickly burr stuck in the fur; it wobbles while it is being brushed
  function drawBurr(c, b, s) {
    const x = b.x * s + Math.sin((b.shake || 0) * 40) * s * .004 * (b.shake || 0), y = b.y * s, r = s * .022;
    c.save(); c.translate(x, y); c.rotate(rnd(b.seed) * TAU);
    c.strokeStyle = '#6e5128'; c.lineWidth = r * .22; c.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const an = i / 14 * TAU; c.beginPath(); c.moveTo(Math.cos(an) * r * .6, Math.sin(an) * r * .6); c.lineTo(Math.cos(an) * r * 1.5, Math.sin(an) * r * 1.5); c.stroke(); }
    c.fillStyle = '#9a7a45'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = '#7a5d30'; c.beginPath(); c.arc(r * .2, r * .2, r * .7, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-r * .35, -r * .35, r * .25, 0, TAU); c.fill();
    c.restore();
  }
  function drawSuds(c, q, s) {
    const x = q.x * s, y = q.y * s, r = q.r * s, a = clamp(q.life / 1.5, 0, 1);
    c.save(); c.globalAlpha = a * .95; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(140,200,245,.85)'; c.lineWidth = Math.max(1, r * .12);
    for (const [dx, dy, k] of [[0, 0, 1], [-.75, .35, .62], [.7, .3, .7], [.1, -.7, .55]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, r * k, 0, TAU); c.fill(); c.stroke(); }
    c.fillStyle = 'rgba(190,225,255,.6)'; c.beginPath(); c.arc(x + r * .25, y + r * .25, r * .45, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * .35, y - r * .35, r * .22, 0, TAU); c.fill();
    c.restore();
  }
  // wet fur: darker and bluer, fur clumped into points, a sheen on top and droplets
  function drawWet(c, s, wet, id, t) {
    const Z = zones(id), sp = (SPG.pets.SPECIES || {})[id] || {};
    c.save();
    c.fillStyle = `rgba(70,110,170,${(wet * .13).toFixed(3)})`; c.fillRect(-.8 * s, -1.7 * s, 1.6 * s, 1.9 * s);
    if (!sp.smooth) {
      c.strokeStyle = `rgba(50,80,130,${(wet * .3).toFixed(3)})`; c.lineWidth = Math.max(1, s * .006); c.lineCap = 'round';
      for (let i = 0; i < 46; i++) { const z = Z.all[i % Z.all.length], x = (z[0] + (rnd(i * 3) - .5) * .11) * s, y = (z[1] + (rnd(i * 7) - .5) * .09) * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (rnd(i) - .5) * s * .01, y + s * .014, x + (rnd(i + 9) - .5) * s * .012, y + s * .03); c.stroke(); }
    }
    c.fillStyle = `rgba(255,255,255,${(wet * .3).toFixed(3)})`;
    for (const z of Z.body.slice(0, 5).concat(Z.head.slice(0, 2))) { c.beginPath(); c.ellipse((z[0] - .03) * s, (z[1] - .045) * s, s * .045, s * .013, -.4, 0, TAU); c.fill(); }
    for (let i = 0; i < 26; i++) {
      const z = Z.all[i % Z.all.length], x = (z[0] + (rnd(i * 5) - .5) * .12) * s, y = (z[1] + (rnd(i * 11) - .5) * .1) * s, r = s * (.0045 + .004 * rnd(i + 3));
      c.globalAlpha = Math.min(1, wet * 1.1); c.fillStyle = 'rgba(255,255,255,.7)'; c.strokeStyle = 'rgba(120,180,235,.85)'; c.lineWidth = Math.max(1, r * .22); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * .3, y - r * .3, r * .3, 0, TAU); c.fill();
    }
    c.restore();
  }
  // everything on the pet, in the order a person would see it (call with 'source-atop' so it stays on the pet)
  function drawLayer(c, s, t, id, bag, st) {
    const body = ((SPG.pets.SPECIES || {})[id] || {}).body;
    for (const g of bag.grime || []) drawStain(c, g, s, t, st.wet);
    if (st.wet > .02) drawWet(c, s, st.wet, id, t);
    for (const k of bag.knots || []) drawKnot(c, k, s, body, t);
    for (const b of bag.burrs || []) drawBurr(c, b, s);
    for (const q of st.suds) drawSuds(c, q, s);
  }
  const busy = (bag, st) => !!((bag.grime && bag.grime.length) || (bag.knots && bag.knots.length) || (bag.burrs && bag.burrs.length) || st.wet > .02 || st.suds.length);

  /* ------------------------------------------------------------ what a tool does
     o = { u, v (where it touches, fractions of s from the feet), lu, lv (where it was a moment ago), moved (distance this frame, in s), dt, on (the touch is on the pet) }
     Returns what came off: [{ t: 'grime' | 'knot' | 'burr', k, x, y }] and keeps bag.dirt up to date. */
  const GRIME_BY = {   // how well each tool does on each kind of dirt (per unit of s it travels / per second for the spray)
    sponge: { mud: 1, dust: .8, grass: .35, jam: .25 },
    brush: { mud: .15, dust: 1.25, grass: .3, jam: .1 },
    towel: { mud: .9, dust: .6, grass: .6, jam: .5 },
    spray: { mud: .05, dust: .02, grass: .03, jam: .06 }
  };
  function groom(bag, tool, o, st) {
    const out = [], { u, v, moved, dt } = o, wet = st.wet;
    const lu = o.lu == null ? u : o.lu, lv = o.lv == null ? v : o.lv, sx = u - lu, sy = v - lv, sl = sx * sx + sy * sy;
    const near = (x, y, r) => {   // close to the path the tool took this frame, not just where it ended
      const t = sl > 1e-9 ? clamp(((x - lu) * sx + (y - lv) * sy) / sl, 0, 1) : 1;
      return Math.hypot(x - (lu + sx * t), y - (lv + sy * t)) < r;
    };
    const sudsNear = (x, y) => st.suds.some(q => Math.hypot(q.x - x, q.y - y) < .1);
    if (tool === 'sponge' && o.on && moved > .002) {
      // lather: soap suds are left where the sponge goes
      const n = Math.min(3, Math.ceil(moved / .02));
      for (let i = 0; i < n && st.suds.length < 90; i++) st.suds.push({ x: u + (Math.random() - .5) * .05, y: v + (Math.random() - .5) * .05, r: .014 + Math.random() * .016, life: 8 + Math.random() * 6 });
      st.wet = Math.min(1, wet + moved * 2.2);
    }
    if (tool === 'spray' && o.on) {
      st.wet = Math.min(1, wet + dt * 1.2);
      for (const q of st.suds) if (Math.hypot(q.x - u, q.y - v) < .16) q.life -= dt * 5;   // rinsed away
    }
    if (tool === 'towel' && o.on && moved > .002) {
      st.wet = Math.max(0, wet - moved * 3.4);
      for (const q of st.suds) if (Math.hypot(q.x - u, q.y - v) < .12) q.life -= moved * 60;
    }
    const kinds = GRIME_BY[tool];
    if (kinds && o.on) {
      const amount = tool === 'spray' ? dt : moved;
      if (amount > 0) for (const g of bag.grime || []) {
        if (!near(g.x, g.y, g.r + (tool === 'towel' ? .1 : tool === 'brush' ? .06 : .075))) continue;
        let m = kinds[g.k];
        if (tool === 'sponge' && (g.k === 'grass' || g.k === 'jam') && sudsNear(g.x, g.y)) m *= 3.4;   // soap does the sticky ones
        if (tool === 'sponge' && g.k === 'mud' && sudsNear(g.x, g.y)) m *= 1.4;
        if (tool === 'brush' && g.k === 'mud') m *= wet < .2 ? 1.6 : .5;   // dry mud flakes off
        if (tool === 'towel' && g.k === 'mud' && wet < .2) m *= .5;
        const before = g.a;
        g.a -= amount * (tool === 'spray' ? 1 : 3.6) * m * (tool === 'sponge' ? 1 + wet * .7 : 1);
        if (g.a <= 0) out.push({ t: 'grime', k: g.k, x: g.x, y: g.y }); else if (before - g.a > 0) out.push({ t: 'scrub', k: g.k, x: g.x, y: g.y });
      }
    }
    if (tool === 'brush' && o.on && moved > .002) {
      for (const k of bag.knots || []) if (near(k.x, k.y, .085)) {
        k.a -= moved * (1.8 + wet * 3.2);   // wet fur combs out much more easily
        if (k.a <= 0) out.push({ t: 'knot', x: k.x, y: k.y }); else out.push({ t: 'hair', x: k.x, y: k.y });
      }
      for (const b of bag.burrs || []) if (near(b.x, b.y, .06)) {
        b.h -= moved * 2.4; b.shake = 1;
        if (b.h <= 0) out.push({ t: 'burr', x: b.x, y: b.y });
      }
    }
    if (tool === 'hand' && o.tap) {   // a finger and thumb can pick a burr off
      for (const b of bag.burrs || []) if (near(b.x, b.y, .06)) { b.h = 0; out.push({ t: 'burr', x: b.x, y: b.y }); }
    }
    if (bag.grime) bag.grime = bag.grime.filter(g => g.a > 0);
    if (bag.knots) bag.knots = bag.knots.filter(k => k.a > 0);
    if (bag.burrs) bag.burrs = bag.burrs.filter(b => b.h > 0);
    bag.dirt = level(bag);
    return out;
  }
  // suds pop and fade by themselves; burrs settle down
  function update(bag, st, dt) {
    st.wet = Math.max(0, st.wet - dt * .045);
    let popped = 0;
    for (const q of st.suds) { q.life -= dt; if (q.life <= 0) popped++; }
    st.suds = st.suds.filter(q => q.life > 0);
    for (const b of bag.burrs || []) b.shake = Math.max(0, (b.shake || 0) - dt * 2);
    return popped;
  }

  SPG.careGroom = { zones, level, seed, furTick, drawLayer, groom, update, busy, tint, NGRIME };
})();
