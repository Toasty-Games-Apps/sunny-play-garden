// Pets: the friends a child can take home from the Pet Shop with stars (no purchases, ever), name, dress up,
// and who then keep her company in calm places like the Coloring Book.
//
// Saved per player in store.bag('pets'):
//   { v: 1, owned: { bunny: { name: 'Biscuit', hat: 'bow' } }, hats: { bow: true }, active: 'bunny' }
(() => {
  const SPG = window.SPG;
  const { art, sfx, store } = SPG;
  const TAU = Math.PI * 2;

  const SPECIES = {
    bunny: { body: '#fff', belly: '#ffe3ec', limb: '#fff', tail: 'puff', tailCol: '#fff', sound: 'bunny' },
    cat: { body: '#ffb45e', belly: '#fff2df', limb: '#ffb45e', tail: 'long', tailCol: '#ffa042', sound: 'cat' },
    bear: { body: '#c98b5b', belly: '#f3c9a0', limb: '#c98b5b', tail: 'puff', tailCol: '#b87a4b', sound: 'hedgehog' },
    fox: { body: '#ff8a4c', belly: '#fff', limb: '#5a3f5e', tail: 'bushy', tailCol: '#ff8a4c', sound: 'dog' },
    frog: { body: '#84d96a', belly: '#e4f7c5', limb: '#6cc455', tail: null, sound: 'frog' },
    panda: { body: '#fff', belly: '#fff', limb: '#3d2c44', tail: 'puff', tailCol: '#fff', sound: 'hedgehog' },
    dog: { body: '#d9a26c', belly: '#fff2df', limb: '#a8744f', tail: 'long', tailCol: '#c98b5b', sound: 'dog' },
    hamster: { body: '#f4c98f', belly: '#fff', limb: '#f4c98f', tail: null, sound: 'mouse' },
    duck: { body: '#ffe066', belly: '#fff3b0', limb: '#ffe066', feet: '#ff9d3d', tail: 'puff', tailCol: '#ffe066', sound: 'duckling', smooth: true },
    pig: { body: '#ffb3c6', belly: '#ffd5e0', limb: '#ff9db5', tail: 'curl', tailCol: '#ff9db5', sound: 'hedgehog' },
    lamb: { body: '#fdfdfd', belly: '#fff', limb: '#5a4a4a', tail: 'puff', tailCol: '#fff', sound: 'bunny' },
    penguin: { body: '#3d2c44', belly: '#fff', limb: '#3d2c44', feet: '#ff9d3d', tail: null, sound: 'bird', smooth: true },
    mouse: { body: '#c9c5d3', belly: '#fff', limb: '#c9c5d3', tail: 'long', tailCol: '#ffb3c6', sound: 'mouse' },
    unicorn: { body: '#fff', belly: '#fff0fa', limb: '#fff', tail: 'bushy', tailCol: '#ff9fd0', sound: 'cat' },
    elephant: { body: '#b8c4d6', belly: '#dbe3ef', limb: '#a4b2c8', tail: 'long', tailCol: '#a4b2c8', sound: 'hedgehog' },
    owl: { body: '#b98a5a', belly: '#f3d9b0', limb: '#8a6440', feet: '#ff9d3d', tail: null, sound: 'bird', smooth: true },
    // dinosaurs: smooth skin, a thick tail, little arms
    trex: { body: '#6fcf6a', belly: '#e4f7c5', limb: '#58b855', tail: 'dino', tailCol: '#58b855', sound: 'dino', smooth: true, dino: true },
    trike: { body: '#e9a15e', belly: '#ffe9c4', limb: '#c98b5b', tail: 'dino', tailCol: '#d99250', sound: 'dino', smooth: true, dino: true },
    stego: { body: '#a78be0', belly: '#ece4ff', limb: '#8a6ac8', tail: 'dino', tailCol: '#8a6ac8', sound: 'dino', smooth: true, dino: true, plates: true },
    bronto: { body: '#6fb8f2', belly: '#dff0ff', limb: '#4f9ae0', tail: 'dino', tailCol: '#4f9ae0', sound: 'dino', smooth: true, dino: true, tall: true },
    babydino: { body: '#b8ec8c', belly: '#f4ffe0', limb: '#9adc6a', tail: 'dino', tailCol: '#9adc6a', sound: 'dino', smooth: true, dino: true }
  };
  // Prices are in stars earned by playing. The first friends are cheap.
  const PETS = [
    { id: 'bunny', name: SPG.t('Bunny'), price: 10 }, { id: 'cat', name: SPG.t('Kitten'), price: 10 }, { id: 'bear', name: SPG.t('Bear cub'), price: 15 },
    { id: 'fox', name: SPG.t('Fox pup'), price: 20 }, { id: 'frog', name: SPG.t('Froggy'), price: 25 }, { id: 'panda', name: SPG.t('Panda cub'), price: 30 },
    { id: 'dog', name: SPG.t('Puppy'), price: 12 }, { id: 'hamster', name: SPG.t('Hamster'), price: 10 }, { id: 'duck', name: SPG.t('Duckling'), price: 12 }, { id: 'pig', name: SPG.t('Piglet'), price: 15 },
    { id: 'lamb', name: SPG.t('Lamb'), price: 18 }, { id: 'mouse', name: SPG.t('Mouse'), price: 10 }, { id: 'penguin', name: SPG.t('Penguin'), price: 25 }, { id: 'owl', name: SPG.t('Owl'), price: 28 },
    { id: 'elephant', name: SPG.t('Elephant'), price: 35 }, { id: 'unicorn', name: SPG.t('Unicorn'), price: 40 },
    { id: 'babydino', name: SPG.t('Baby dino'), price: 20 }, { id: 'trike', name: SPG.t('Triceratops'), price: 30 }, { id: 'stego', name: SPG.t('Stegosaurus'), price: 30 }, { id: 'bronto', name: SPG.t('Long-neck dino'), price: 35 }, { id: 'trex', name: SPG.t('T-Rex'), price: 40 }
  ];
  const HATS = [
    { id: 'bow', name: SPG.t('Bow'), price: 5 }, { id: 'flowers', name: SPG.t('Flower crown'), price: 8 }, { id: 'party', name: SPG.t('Party hat'), price: 8 },
    { id: 'witch', name: SPG.t('Witch hat'), price: 10 }, { id: 'leaves', name: SPG.t('Fall leaves'), price: 10 }, { id: 'santa', name: SPG.t('Santa hat'), price: 10 },
    { id: 'antlers', name: SPG.t('Reindeer antlers'), price: 10 }, { id: 'crown', name: SPG.t('Crown'), price: 20 },
    { id: 'tiara', name: SPG.t('Tiara'), price: 15 }, { id: 'beanie', name: SPG.t('Woolly hat'), price: 8 }, { id: 'cap', name: SPG.t('Cap'), price: 8 }, { id: 'wizard', name: SPG.t('Wizard hat'), price: 12 },
    { id: 'pirate', name: SPG.t('Pirate hat'), price: 12 }, { id: 'chef', name: SPG.t('Chef hat'), price: 10 }, { id: 'sun', name: SPG.t('Sun hat'), price: 10 }, { id: 'beret', name: SPG.t('Beret'), price: 8 }, { id: 'halo', name: SPG.t('Halo'), price: 15 },
    { id: 'glasses', name: SPG.t('Glasses'), price: 8, slot: 'face' }, { id: 'shades', name: SPG.t('Sunglasses'), price: 10, slot: 'face' }, { id: 'hearts', name: SPG.t('Heart glasses'), price: 12, slot: 'face' },
    { id: 'stars', name: SPG.t('Star glasses'), price: 12, slot: 'face' }, { id: 'clown', name: SPG.t('Red nose'), price: 6, slot: 'face' },
    { id: 'bowtie', name: SPG.t('Bow tie'), price: 6, slot: 'neck' }, { id: 'scarf', name: SPG.t('Scarf'), price: 8, slot: 'neck' }, { id: 'bell', name: SPG.t('Bell collar'), price: 6, slot: 'neck' },
    { id: 'pearls', name: SPG.t('Pearls'), price: 12, slot: 'neck' }, { id: 'medal', name: SPG.t('Gold medal'), price: 10, slot: 'neck' }, { id: 'lei', name: SPG.t('Flower necklace'), price: 10, slot: 'neck' }
  ];
  for (const h of HATS) if (!h.slot) h.slot = 'head';
  const SLOTS = ['head', 'face', 'neck'];
  const NAMES = SPG.voice.PICK_NAMES.pets;

  /* ------------------------------------------------------------ saved state */
  // An accessory can only be on one pet at a time. Old saves (and merged backups) may have two pets wearing the same thing:
  // the first pet (in the order they were taken home) keeps it, the others quietly lose it. Checked once per loaded bag.
  const checked = new WeakSet();
  const slotKey = slot => slot === 'head' ? 'hat' : slot;
  function dedupe(b) {
    if (checked.has(b)) return b; checked.add(b);
    const seen = {}; let changed = false;
    for (const id of Object.keys(b.owned || {})) {
      const o = b.owned[id]; if (!o) continue;
      for (const k of ['hat', 'face', 'neck']) { const it = o[k]; if (!it) continue; if (seen[it]) { o[k] = null; changed = true; } else seen[it] = id; }
    }
    if (changed) store.save();
    return b;
  }
  const bag = () => dedupe(store.bag('pets', () => ({ v: 1, owned: {}, hats: {}, active: null })));
  const info = id => PETS.find(p => p.id === id);
  const api = {
    PETS, HATS, NAMES, SPECIES,
    petInfo: info, hatInfo: id => HATS.find(h => h.id === id),
    owns: id => !!bag().owned[id],
    nameOf: id => (bag().owned[id] && bag().owned[id].name) || (info(id) || {}).name || '',
    ownsHat: id => !!bag().hats[id],
    SLOTS,
    active() { const b = bag(), id = b.active; if (!id || !b.owned[id]) return null; const o = b.owned[id]; return { id, name: o.name || info(id).name, hat: o.hat || null, face: o.face || null, neck: o.neck || null }; },
    // What a pet is wearing, in the form the draw functions take.
    outfit: (a, keys) => a ? { hat: a.hat || null, face: a.face || null, neck: a.neck || null } : { hat: null, face: null, neck: null },
    setActive(id) { const b = bag(); if (b.owned[id]) { b.active = id; store.save(); } },
    canAfford: price => store.active && store.active.stars >= price,
    adopt(id) {
      const b = bag(), p = info(id);
      if (!p || b.owned[id] || !api.canAfford(p.price)) return false;
      store.addStars(-p.price); b.owned[id] = { name: '', hat: null }; b.active = id; store.save(); return true;
    },
    buyHat(id) {
      const b = bag(), h = api.hatInfo(id);
      if (!h || b.hats[id] || !api.canAfford(h.price)) return false;
      store.addStars(-h.price); b.hats[id] = true; store.save(); return true;
    },
    // Which other owned pet (id) is wearing this accessory right now? (null if nobody but, maybe, the pet in `except`, default the active pet.)
    wornBy(itemId, except) {
      const b = bag(), ex = except === undefined ? b.active : except;
      for (const id of Object.keys(b.owned)) { if (id === ex) continue; const o = b.owned[id]; if (o && (o.hat === itemId || o.face === itemId || o.neck === itemId)) return id; }
      return null;
    },
    // Wear an accessory she owns (it goes in its own slot: head, face or neck). Returns false (nothing changes) when it is not owned
    // or another pet is already wearing it. wear(null) takes the hat off; unwear(slot) clears one slot.
    wear(itemId) {
      const b = bag(); if (!b.active || !b.owned[b.active]) return false;
      if (!itemId) { b.owned[b.active].hat = null; store.save(); return true; }
      const h = api.hatInfo(itemId); if (!h || !b.hats[itemId] || api.wornBy(itemId)) return false;
      b.owned[b.active][slotKey(h.slot)] = itemId; store.save(); return true;
    },
    unwear(slot) { const b = bag(); if (b.active && b.owned[b.active]) { b.owned[b.active][slot === 'head' ? 'hat' : slot] = null; store.save(); } },
    rename(id, name) { const b = bag(); if (b.owned[id]) { b.owned[id].name = String(name || '').trim().slice(0, 12); store.save(); } },
    randomName() { return NAMES[Math.floor(Math.random() * NAMES.length)]; },
    noise(id) { const sp = SPECIES[id]; if (sp) sfx.critter(sp.sound, 3); }
  };

  /* ------------------------------------------------------------ drawing */
  const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };

  // Hats sit on a head of radius R centered at (0, 0).
  function hat(c, id, R) {
    c.save(); c.lineJoin = c.lineCap = 'round';
    if (id === 'bow') {
      c.translate(R * .55, -R * .9); c.rotate(.35);
      c.fillStyle = '#ff7aa2'; ell(c, -R * .3, 0, R * .3, R * .18, -.4); c.fill(); ell(c, R * .3, 0, R * .3, R * .18, .4); c.fill();
      c.fillStyle = '#ff5c8a'; ell(c, 0, 0, R * .11, R * .11); c.fill();
    } else if (id === 'flowers') {
      const cols = ['#ff9db8', '#fff', '#ffd54a', '#ff9db8', '#fff', '#ffd54a', '#ff9db8'];
      for (let i = 0; i < 7; i++) {
        const a = (-165 + i * 25) * Math.PI / 180, x = Math.cos(a) * R * 1.02, y = Math.sin(a) * R * 1.0;
        c.fillStyle = '#7ed957'; ell(c, x + Math.cos(a) * R * .1, y + Math.sin(a) * R * .1, R * .1, R * .06, a); c.fill();
        c.fillStyle = cols[i]; for (let k = 0; k < 5; k++) { ell(c, x + Math.cos(k * TAU / 5) * R * .09, y + Math.sin(k * TAU / 5) * R * .09, R * .07, R * .07); c.fill(); }
        c.fillStyle = '#ffd54a'; ell(c, x, y, R * .05, R * .05); c.fill();
      }
    } else if (id === 'party') {
      c.translate(-R * .1, -R * .92); c.rotate(-.18);
      c.fillStyle = '#7fd4f5'; c.beginPath(); c.moveTo(-R * .45, 0); c.lineTo(0, -R * 1.05); c.lineTo(R * .45, 0); c.closePath(); c.fill();
      c.save(); c.clip(); c.strokeStyle = '#ff9db8'; c.lineWidth = R * .13; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-R * .6 + k * R * .3, R * .1); c.lineTo(R * .1 + k * R * .3, -R * 1.1); c.stroke(); } c.restore();
      c.fillStyle = '#ffd54a'; ell(c, 0, -R * 1.08, R * .13, R * .13); c.fill();
    } else if (id === 'crown') {
      c.translate(0, -R * .9);
      c.fillStyle = '#ffd54a'; c.strokeStyle = '#e0a01e'; c.lineWidth = R * .07;
      c.beginPath(); c.moveTo(-R * .55, 0); c.lineTo(-R * .58, -R * .55); c.lineTo(-R * .28, -R * .28); c.lineTo(0, -R * .7); c.lineTo(R * .28, -R * .28); c.lineTo(R * .58, -R * .55); c.lineTo(R * .55, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff6b81'; ell(c, 0, -R * .22, R * .08, R * .08); c.fill(); c.fillStyle = '#4f8fe8'; ell(c, -R * .33, -R * .1, R * .06, R * .06); c.fill(); ell(c, R * .33, -R * .1, R * .06, R * .06); c.fill();
    } else if (id === 'witch') {
      c.translate(0, -R * .9);
      c.fillStyle = '#5a3f7e'; ell(c, 0, 0, R * 1.02, R * .2); c.fill();
      c.fillStyle = '#6b4a99'; c.beginPath(); c.moveTo(-R * .55, 0); c.quadraticCurveTo(-R * .2, -R * .6, R * .2, -R * 1.5); c.quadraticCurveTo(R * .3, -R * 1.2, R * .28, -R * 1.05); c.quadraticCurveTo(R * .55, -R * .5, R * .55, 0); c.closePath(); c.fill();
      c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(-R * .53, -R * .06); c.lineTo(R * .53, -R * .06); c.lineTo(R * .5, -R * .3); c.lineTo(-R * .48, -R * .3); c.closePath(); c.fill();
    } else if (id === 'leaves') {
      const cols = ['#ff8a3d', '#e0492f', '#ffb52e', '#ff8a3d', '#e0492f', '#ffb52e', '#ff8a3d'];
      for (let i = 0; i < 7; i++) {
        const a = (-165 + i * 25) * Math.PI / 180;
        c.save(); c.translate(Math.cos(a) * R * 1.0, Math.sin(a) * R * .98); c.rotate(a + Math.PI / 2);
        c.fillStyle = cols[i]; c.beginPath(); c.moveTo(0, R * .12); c.quadraticCurveTo(R * .24, -R * .05, 0, -R * .3); c.quadraticCurveTo(-R * .24, -R * .05, 0, R * .12); c.fill(); c.restore();
      }
    } else if (id === 'santa') {
      c.translate(0, -R * .9); c.rotate(-.1);
      c.fillStyle = '#e8434f'; c.beginPath(); c.moveTo(-R * .7, 0); c.quadraticCurveTo(-R * .6, -R * 1.1, R * .5, -R * 1.05); c.quadraticCurveTo(R * .9, -R * .95, R * .95, -R * .5); c.lineTo(R * .7, 0); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.roundRect ? c.roundRect(-R * .82, -R * .12, R * 1.64, R * .3, R * .15) : c.rect(-R * .82, -R * .12, R * 1.64, R * .3); c.fill();
      c.fillStyle = '#fff'; ell(c, R * .95, -R * .5, R * .17, R * .17); c.fill();
    } else if (id === 'tiara') {
      c.translate(0, -R * .9); c.strokeStyle = '#d8dce8'; c.lineWidth = R * .07; c.beginPath(); c.arc(0, R * .8, R * .95, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
      c.fillStyle = '#eef0f8'; c.beginPath(); c.moveTo(-R * .22, -R * .05); c.lineTo(0, -R * .5); c.lineTo(R * .22, -R * .05); c.closePath(); c.fill(); c.fillStyle = '#ff9fc8'; ell(c, 0, -R * .18, R * .07, R * .07); c.fill();
    } else if (id === 'beanie') {
      c.translate(0, -R * .78); c.fillStyle = '#4f8fe8'; c.beginPath(); c.moveTo(-R * .85, 0); c.bezierCurveTo(-R * .9, -R * 1.05, R * .9, -R * 1.05, R * .85, 0); c.closePath(); c.fill();
      c.fillStyle = '#3a6fc0'; c.beginPath(); c.roundRect ? c.roundRect(-R * .9, -R * .2, R * 1.8, R * .26, R * .1) : c.rect(-R * .9, -R * .2, R * 1.8, R * .26); c.fill(); c.fillStyle = '#fff'; ell(c, 0, -R * .98, R * .19, R * .19); c.fill();
    } else if (id === 'cap') {
      c.translate(0, -R * .72); c.fillStyle = '#ff6b6b'; c.beginPath(); c.moveTo(-R * .82, 0); c.bezierCurveTo(-R * .9, -R * .95, R * .9, -R * .95, R * .82, 0); c.closePath(); c.fill();
      c.fillStyle = '#d94a4a'; c.beginPath(); c.moveTo(R * .1, -R * .1); c.quadraticCurveTo(R * 1.2, -R * .18, R * 1.28, R * .1); c.quadraticCurveTo(R * .6, 0, R * .05, R * .04); c.closePath(); c.fill(); c.fillStyle = '#fff'; ell(c, 0, -R * .84, R * .07, R * .07); c.fill();
    } else if (id === 'wizard') {
      c.translate(0, -R * .82); c.fillStyle = '#6b4a99'; ell(c, 0, 0, R * 1.05, R * .2); c.fill(); c.beginPath(); c.moveTo(-R * .6, 0); c.quadraticCurveTo(-R * .1, -R * .7, R * .3, -R * 1.6); c.quadraticCurveTo(R * .4, -R * .7, R * .6, 0); c.closePath(); c.fill();
      art.star(c, R * .05, -R * .6, R * .16, '#ffe066', 0); art.star(c, R * .22, -R * .3, R * .09, '#fff', 0);
    } else if (id === 'pirate') {
      c.translate(0, -R * .78); c.fillStyle = '#3a3050'; c.beginPath(); c.moveTo(-R * 1.15, R * .05); c.quadraticCurveTo(-R * .4, -R * 1.2, 0, -R * .95); c.quadraticCurveTo(R * .4, -R * 1.2, R * 1.15, R * .05); c.quadraticCurveTo(0, -R * .3, -R * 1.15, R * .05); c.fill();
      c.fillStyle = '#fff'; ell(c, 0, -R * .5, R * .12, R * .12); c.fill(); c.fillRect(-R * .16, -R * .3, R * .32, R * .06);
    } else if (id === 'chef') {
      c.translate(0, -R * .85); c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.1)'; c.lineWidth = R * .03; for (const [x, y, r] of [[-R * .38, -R * .45, R * .36], [R * .38, -R * .45, R * .36], [0, -R * .6, R * .4]]) { ell(c, x, y, r, r); c.fill(); c.stroke(); }
      c.beginPath(); c.roundRect ? c.roundRect(-R * .62, -R * .45, R * 1.24, R * .5, R * .05) : c.rect(-R * .62, -R * .45, R * 1.24, R * .5); c.fill();
    } else if (id === 'sun') {
      c.translate(0, -R * .72); c.fillStyle = '#f5deb0'; ell(c, 0, 0, R * 1.35, R * .3); c.fill(); c.beginPath(); c.moveTo(-R * .6, 0); c.quadraticCurveTo(-R * .6, -R * .9, 0, -R * .85); c.quadraticCurveTo(R * .6, -R * .9, R * .6, 0); c.closePath(); c.fill(); c.fillStyle = '#ff7aa2'; c.fillRect(-R * .62, -R * .3, R * 1.24, R * .16);
    } else if (id === 'beret') {
      c.translate(0, -R * .8); c.rotate(-.15); c.fillStyle = '#d94a4a'; ell(c, 0, 0, R * .9, R * .4); c.fill(); ell(c, 0, -R * .4, R * .06, R * .06); c.fill();
    } else if (id === 'halo') {
      c.translate(0, -R * 1.15); c.strokeStyle = '#ffd54a'; c.lineWidth = R * .13; ell(c, 0, 0, R * .5, R * .15); c.stroke(); c.strokeStyle = 'rgba(255,240,150,.5)'; c.lineWidth = R * .3; ell(c, 0, 0, R * .5, R * .15); c.stroke();
    } else if (id === 'antlers') {
      c.strokeStyle = '#a8744f'; c.lineWidth = R * .13;
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(s * R * .4, -R * .9); c.quadraticCurveTo(s * R * .55, -R * 1.25, s * R * .8, -R * 1.5); c.moveTo(s * R * .58, -R * 1.15); c.lineTo(s * R * .3, -R * 1.35); c.moveTo(s * R * .72, -R * 1.38); c.lineTo(s * R * 1.0, -R * 1.3); c.stroke();
      }
    }
    c.restore();
  }

  // Glasses and noses sit on the face (head circle of radius R, eyes at about +-.31R, -.05R).
  function faceAcc(c, id, R, kind) {
    c.save(); c.lineJoin = c.lineCap = 'round';
    const fr = kind === 'frog';   // a frog's eyes sit on top of its head
    const ex = fr ? R * .5 : R * .31, ey = fr ? -R * .6 : -R * .05, ny = fr ? R * .26 : R * .16;
    if (fr) R *= .85;
    if (id === 'glasses') { c.strokeStyle = '#3a2f40'; c.lineWidth = R * .06; for (const s of [-1, 1]) { c.fillStyle = 'rgba(210,235,255,.3)'; ell(c, s * ex, ey, R * .26, R * .26); c.fill(); c.stroke(); } c.beginPath(); c.moveTo(-(ex - R * .26), ey); c.lineTo(ex - R * .26, ey); c.stroke(); }
    else if (id === 'shades') { c.fillStyle = '#20141a'; for (const s of [-1, 1]) { ell(c, s * ex, ey, R * .27, R * .25); c.fill(); } c.strokeStyle = '#20141a'; c.lineWidth = R * .06; c.beginPath(); c.moveTo(-(ex - R * .27), ey); c.lineTo(ex - R * .27, ey); c.stroke(); c.fillStyle = 'rgba(255,255,255,.4)'; for (const s of [-1, 1]) { ell(c, s * ex - R * .08, ey - R * .09, R * .08, R * .04, -.5); c.fill(); } }
    else if (id === 'hearts') { for (const s of [-1, 1]) art.heart(c, s * ex, ey, R * .3, '#ff6fae'); c.fillStyle = 'rgba(255,255,255,.4)'; for (const s of [-1, 1]) { ell(c, s * ex - R * .09, ey - R * .1, R * .05, R * .03, -.5); c.fill(); } }
    else if (id === 'stars') { for (const s of [-1, 1]) art.star(c, s * ex, ey, R * .32, '#ffd54a', 0); }
    else if (id === 'clown') { c.fillStyle = '#ef4a4a'; ell(c, 0, ny, R * .14, R * .14); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; ell(c, -R * .04, ny - R * .04, R * .04, R * .04); c.fill(); }
    c.restore();
  }
  // Collars and ties sit just under the chin.
  function neckAcc(c, id, R) {
    c.save(); c.translate(0, R * .93); c.lineJoin = c.lineCap = 'round';
    if (id === 'bowtie') { c.fillStyle = '#ff5c8a'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(s * R * .36, -R * .17); c.lineTo(s * R * .36, R * .17); c.closePath(); c.fill(); } c.fillStyle = '#d93a6a'; ell(c, 0, 0, R * .09, R * .1); c.fill(); }
    else if (id === 'scarf') { c.fillStyle = '#4f8fe8'; c.beginPath(); c.roundRect ? c.roundRect(-R * .75, -R * .14, R * 1.5, R * .3, R * .15) : c.rect(-R * .75, -R * .14, R * 1.5, R * .3); c.fill(); c.fillStyle = '#3a6fc0'; c.fillRect(R * .1, R * .1, R * .26, R * .55); c.fillStyle = '#fff'; c.fillRect(R * .1, R * .3, R * .26, R * .07); }
    else if (id === 'bell') { c.strokeStyle = '#ff5c8a'; c.lineWidth = R * .13; c.beginPath(); c.arc(0, -R * .5, R * .78, .35, Math.PI - .35); c.stroke(); c.fillStyle = '#ffd54a'; ell(c, 0, R * .3, R * .14, R * .14); c.fill(); c.fillStyle = '#e0a01e'; ell(c, 0, R * .34, R * .03, R * .03); c.fill(); }
    else if (id === 'pearls') { c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = R * .02; for (let i = 0; i < 9; i++) { const a = Math.PI * (.14 + i * .09); ell(c, Math.cos(a) * R * .74, -R * .5 + Math.sin(a) * R * .8, R * .09, R * .09); c.fill(); c.stroke(); } }
    else if (id === 'medal') { c.strokeStyle = '#ef4a4a'; c.lineWidth = R * .1; c.beginPath(); c.moveTo(-R * .4, -R * .1); c.lineTo(0, R * .35); c.lineTo(R * .4, -R * .1); c.stroke(); c.fillStyle = '#ffd54a'; ell(c, 0, R * .45, R * .16, R * .16); c.fill(); art.star(c, 0, R * .45, R * .1, '#fff3b0', 0); }
    else if (id === 'lei') { const cols = ['#ff9db8', '#fff', '#ffd54a', '#ff7aa2', '#fff']; for (let i = 0; i < 9; i++) { const a = Math.PI * (.12 + i * .095); const x = Math.cos(a) * R * .76, y = -R * .5 + Math.sin(a) * R * .82; c.fillStyle = cols[i % 5]; for (let k = 0; k < 5; k++) { ell(c, x + Math.cos(k * TAU / 5) * R * .06, y + Math.sin(k * TAU / 5) * R * .06, R * .05, R * .05); c.fill(); } c.fillStyle = '#ffd54a'; ell(c, x, y, R * .03, R * .03); c.fill(); } }
    c.restore();
  }

  // Fur: a fuzzy outline, little hair strokes and tufts, so pets look soft up close as well as from far away.
  // (Frogs have smooth skin with soft spots instead.) detail scales how many strands are drawn.
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = i => { const x = Math.sin(i * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };
  // Soft fur: a gentle shaded rim, rows of tiny curved fur marks that follow the body, and (for cats) soft tapered stripes.
  // No stiff spikes sticking out of the outline.
  const mark = (c, x, y, len, ang, w) => { c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(ang + .7) * len * .6, y + Math.sin(ang + .7) * len * .6, x + Math.cos(ang) * len, y + Math.sin(ang) * len); c.stroke(); };
  function furBody(c, id, sp, s, detail) {
    if (sp.smooth || id === 'frog') {
      if (id !== 'frog') return;
      c.fillStyle = 'rgba(70,140,60,.28)';
      for (let i = 0; i < 9; i++) { const a = rnd(i) * TAU, r = Math.sqrt(rnd(i + 20)); ell(c, Math.cos(a) * s * .17 * r, Math.sin(a) * s * .15 * r - s * .02, s * (.012 + rnd(i + 40) * .018), s * (.01 + rnd(i + 60) * .014)); c.fill(); }
      return;
    }
    const rx = s * .25, ry = s * .23, m = Math.round(cl(s / 5 * detail, 14, 70)), body = /^#[0-9a-f]{3}$/i.test(sp.body) ? '#' + [...sp.body.slice(1)].map(ch => ch + ch).join('') : sp.body;   // art.shade wants six-digit colors
    c.lineCap = 'round';
    // a soft darker rim and a lighter top, so the body looks round and plush
    const g = c.createRadialGradient(-rx * .2, -ry * .35, rx * .3, 0, 0, rx * 1.05); g.addColorStop(0, 'rgba(255,255,255,.1)'); g.addColorStop(.7, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(60,30,20,.16)');
    c.fillStyle = g; ell(c, 0, 0, rx, ry); c.fill();
    // little curved fur marks in rows, coat colour only slightly darker, and a few lighter ones; none on the belly
    c.save(); c.beginPath(); c.ellipse(0, 0, rx * .96, ry * .96, 0, 0, TAU); c.clip();
    const lum = (() => { const n = parseInt(body.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; })(), soft = lum > .85 ? .45 : 1;   // white fur gets fainter marks
    for (let pass = 0; pass < 2; pass++) {
      c.globalAlpha = (pass ? .22 : .2) * soft; c.strokeStyle = pass ? art.shade(body, .35) : art.shade(body, -.22);
      for (let i = 0; i < m; i++) {
        const x = (rnd(i + 100 + pass * 50) - .5) * rx * 1.85, y = (rnd(i + 150 + pass * 50) - .5) * ry * 1.8;
        if ((x * x) / (s * .165 * s * .165) + ((y - s * .03) * (y - s * .03)) / (s * .165 * s * .165) < 1) continue;
        mark(c, x, y, s * (.022 + rnd(i + 200) * .016), Math.PI * .5 + (x > 0 ? .5 : -.5) * (.4 + rnd(i + 230)), Math.max(1, s * .007));
      }
    }
    if (id === 'cat') { c.globalAlpha = .2; c.fillStyle = art.shade(body, -.4); for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { c.save(); c.translate(sd * rx * .8, -ry * .3 + k * ry * .3); c.rotate(sd * .5); ell(c, 0, 0, rx * .26, ry * .06); c.fill(); c.restore(); } }
    c.restore();
    c.globalAlpha = 1;
    // soft fluff on the belly: a pale glow
    const bg = c.createRadialGradient(0, s * .04, 0, 0, s * .04, s * .15); bg.addColorStop(0, 'rgba(255,255,255,.28)'); bg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = bg; ell(c, 0, s * .04, s * .15, s * .15); c.fill();
  }
  function furHead(c, id, sp, R, detail) {
    if (id === 'frog' || sp.smooth) return;
    // fluffy cheeks: a few soft overlapping puffs, never points
    c.fillStyle = sp.body;
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { ell(c, sd * R * (.9 + .02 * (k === 1)), R * (.2 + .15 * k), R * .16, R * .11); c.fill(); }
    // a soft glossy crown, and (for cats) three tapered forehead stripes
    const hg = c.createRadialGradient(-R * .3, -R * .55, R * .05, -R * .3, -R * .55, R * .6); hg.addColorStop(0, 'rgba(255,255,255,.16)'); hg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = hg; ell(c, -R * .3, -R * .55, R * .6, R * .35); c.fill();
    if (id === 'cat') { c.fillStyle = art.shade(/^#[0-9a-f]{3}$/i.test(sp.body) ? '#' + [...sp.body.slice(1)].map(ch => ch + ch).join('') : sp.body, -.3); c.globalAlpha = .3; for (const x of [-.2, 0, .2]) { c.save(); c.translate(x * R, -R * .64); c.rotate(x * .6); ell(c, 0, 0, R * .035, R * .16); c.fill(); c.restore(); } c.globalAlpha = 1; }
  }

  // One pet standing on the line y = 0 (its feet), s = about its height. o: { mood, hop, hat, wave, detail }
  const FACES = ['sleep', 'cheer', 'sad', 'scared', 'mad', 'wow'];   // the moods the head can show (Feeling Friends uses all of them)
  function draw(c, id, s, t = 0, o = {}) {
    const sp = SPECIES[id]; if (!sp) return;
    const R = s * .27, mood = o.mood || 'happy', detail = o.detail || 1;
    const hop = Math.min(1, o.hop || 0), lift = Math.sin(hop * Math.PI) * s * .2;
    const breathe = 1 + Math.sin(t * 2.2) * .014;
    const blink = (t % 4.3) < .13;
    c.save(); c.lineCap = 'round';
    c.fillStyle = 'rgba(90,63,94,.13)'; ell(c, 0, s * .01, s * .3 * (1 - lift / s * .8), s * .05); c.fill();   // shadow
    c.translate(0, -lift);
    // tail (behind)
    c.save(); c.translate(0, -s * .22);
    const wag = Math.sin(t * (mood === 'cheer' ? 9 : 2.4)) * (mood === 'sleep' ? .02 : .18);
    if (sp.tail === 'puff') { c.fillStyle = sp.tailCol; ell(c, s * .25, s * .05, s * .07, s * .07); c.fill(); }
    else if (sp.tail === 'long') { c.strokeStyle = sp.tailCol; c.lineWidth = s * .07; c.beginPath(); c.moveTo(s * .2, s * .1); c.quadraticCurveTo(s * .42, s * .1 + wag * s * .5, s * .38, -s * .12 + wag * s * .3); c.stroke(); }
    else if (sp.tail === 'dino') { c.fillStyle = sp.tailCol; c.beginPath(); c.moveTo(s * .14, s * .12); c.quadraticCurveTo(s * .42, s * .14 + wag * s * .4, s * .5, -s * .02 + wag * s * .3); c.quadraticCurveTo(s * .34, s * .02, s * .16, -s * .06); c.closePath(); c.fill(); }
    else if (sp.tail === 'curl') { c.strokeStyle = sp.tailCol; c.lineWidth = s * .035; c.beginPath(); c.arc(s * .27, s * .04, s * .05, Math.PI * .8, Math.PI * 2.6); c.stroke(); }
    else if (sp.tail === 'bushy') { c.save(); c.translate(s * .22, s * .06); c.rotate(-.5 + wag); c.fillStyle = sp.tailCol; ell(c, s * .14, 0, s * .17, s * .08); c.fill(); c.fillStyle = '#fff'; ell(c, s * .27, 0, s * .06, s * .06); c.fill(); c.restore(); }
    c.restore();
    if (sp.plates) { c.save(); c.translate(0, -s * .44); c.fillStyle = '#ffd54a'; for (const [x, h] of [[-.17, .1], [-.06, .14], [.06, .14], [.17, .1]]) { c.beginPath(); c.moveTo(s * (x - .05), s * .03); c.lineTo(s * x, -s * h); c.lineTo(s * (x + .05), s * .03); c.closePath(); c.fill(); } c.restore(); }
    // body
    c.save(); c.translate(0, -s * .22); c.scale(1, breathe);
    c.fillStyle = sp.body; ell(c, 0, 0, s * .25, s * .23); c.fill();
    c.fillStyle = sp.belly; ell(c, 0, s * .03, s * .16, s * .16); c.fill();
    furBody(c, id, sp, s, detail);
    c.restore();
    // arms (they wave when she is happy)
    for (const side of [-1, 1]) {
      c.save(); c.translate(side * s * .22, -s * .3); c.rotate(side * (.35 + (mood === 'cheer' ? -1.5 - Math.sin(t * 10 + side) * .25 : Math.sin(t * 2 + side) * .04)));
      c.fillStyle = sp.limb; ell(c, 0, s * .06, s * .06, s * .12); c.fill(); c.restore();
    }
    // feet
    c.fillStyle = sp.feet || sp.limb; for (const side of [-1, 1]) { ell(c, side * s * .13, -s * .03, s * .09, s * .055); c.fill(); }
    // head with the face and any hat
    const hy = sp.tall ? -s * .8 : -s * .6;
    if (sp.tall) { c.fillStyle = sp.body; c.beginPath(); c.roundRect ? c.roundRect(-s * .09, hy + R * .5, s * .18, s * .38, s * .09) : c.rect(-s * .09, hy + R * .5, s * .18, s * .38); c.fill(); }
    c.save(); c.translate(0, hy + Math.sin(t * 2.2 + .6) * s * .006); if (mood === 'sleep') c.rotate(.1);
    art.avatar(c, sp.kind || id, R, { mood: FACES.includes(mood) ? mood : 'happy', blink: blink && mood !== 'scared' });
    furHead(c, id, sp, R, detail);
    if (o.face) faceAcc(c, o.face, R, sp.kind || id);
    if (o.neck) neckAcc(c, o.neck, R);
    if (o.hat) hat(c, o.hat, R);
    c.restore();
    if (mood === 'sleep') {
      c.fillStyle = '#8a7190'; c.font = `700 ${s * .13}px Fredoka, system-ui`;
      for (let k = 0; k < 2; k++) { const u = ((t * .5 + k * .5) % 1); c.globalAlpha = 1 - u; c.fillText('z', s * .22 + u * s * .1, -s * .8 - u * s * .2); }
      c.globalAlpha = 1;
    }
    c.restore();
  }
  api.draw = draw; api.drawHat = hat;
  const item = id => HATS.find(h => h.id === id);

  // A pet head with a hat, for shop cards.
  api.drawHead = (c, id, R, hatId) => { c.save(); art.avatar(c, SPECIES[id].kind || id, R); const it = hatId && item(hatId), slot = it ? it.slot : 'head'; if (hatId) { if (slot === 'face') faceAcc(c, hatId, R, SPECIES[id].kind || id); else if (slot === 'neck') neckAcc(c, hatId, R); else hat(c, hatId, R); } c.restore(); };

  /* ------------------------------------------------------------ the companion that keeps her company */
  // Adds the child's active pet to `host`. Returns null if she has none yet. The pet blinks, breathes, hops when
  // something nice happens, falls asleep when nothing has happened for a while, and can be tapped.
  api.companion = (host, { size = 110 } = {}) => {
    const st = api.active(); if (!st) return null;
    const el = document.createElement('button'); el.type = 'button'; el.className = 'pet-buddy'; el.setAttribute('aria-label', st.name);
    const cv = document.createElement('canvas'); el.append(cv); host.append(el);
    let px = 0, running = true, raf = 0, hopT = 0, cheerT = 0, idle = 0, t = Math.random() * 5, last = performance.now(), drawn = 0;
    const setSize = n => {
      px = n; const dpr = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = Math.round(n * dpr); cv.height = Math.round(n * 1.15 * dpr); cv.style.width = n + 'px'; cv.style.height = n * 1.15 + 'px';
    };
    setSize(size);
    const frame = now => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.1, (now - last) / 1000); last = now; t += dt; idle += dt;
      if (hopT > 0) hopT = Math.max(0, hopT - dt * 2.2);
      if (cheerT > 0) cheerT = Math.max(0, cheerT - dt);
      if (now - drawn < 33 || document.hidden || !el.isConnected) return;
      drawn = now;
      const cur = api.active() || st, mood = cheerT > 0 ? 'cheer' : idle > 25 ? 'sleep' : 'happy';
      const c = cv.getContext('2d'), dpr = cv.width / px;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, px, px * 1.15);
      c.translate(px / 2, px * 1.08); draw(c, cur.id, px * .92, t, { mood, hop: hopT > 0 ? 1 - hopT : 0, hat: cur.hat, face: cur.face, neck: cur.neck });
    };
    raf = requestAnimationFrame(frame);
    const buddy = {
      el, setSize,
      hop() { idle = 0; hopT = 1; },
      cheer(sec = 2.4) { idle = 0; cheerT = sec; hopT = 1; },
      wake() { idle = 0; },
      place(x, y) { el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.right = el.style.bottom = 'auto'; },
      destroy() { running = false; cancelAnimationFrame(raf); el.remove(); }
    };
    el.addEventListener('pointerdown', e => { e.preventDefault(); buddy.hop(); api.noise(st.id); });
    return buddy;
  };

  SPG.pets = api;
})();
