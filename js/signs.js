// Sign language mode (Grown-ups > Sign language, off by default): for children who are deaf or hard of hearing.
// Everything a game says (every SPG.voice.say) is also signed by a pair of hands in a small card in a bottom corner, with the
// words underneath if the grown-ups want them. The voice keeps working as before (switch it off in Sound if it is not wanted);
// the hands sign even when the voice is off. A line becomes signs through `glossOf`: letters and letter sounds are fingerspelled,
// numbers, colours, shapes and feelings have their own signs, names are fingerspelled, and every instruction has a short key-word
// gloss in GLOSS (the signs that carry the meaning, in a simple order for young children). Lines with no sign show only their words.
(() => {
  const SPG = window.SPG, S = SPG.sign, store = SPG.store;
  const on = () => !!(store.settings && store.settings.signs);

  /* ---------------------------------------------------------------- glosses */
  const SH = { circle: 'CIRCLE', oval: 'OVAL', square: 'SQUARE', rect: 'RECTANGLE', rectangle: 'RECTANGLE', triangle: 'TRIANGLE', trapezoid: 'TRAPEZOID', diamond: 'DIAMOND', semicircle: 'HALF-CIRCLE', star: 'STAR', heart: 'HEART' };
  const COLOR = { red: 'RED', orange: 'ORANGE', yellow: 'YELLOW', green: 'GREEN', blue: 'BLUE', purple: 'PURPLE', pink: 'PINK', brown: 'BROWN', black: 'BLACK', white: 'WHITE', gray: 'GRAY', grey: 'GRAY', gold: 'GOLD', rainbow: 'RAINBOW' };
  const MOOD = { happy: 'HAPPY', sad: 'SAD', scared: 'SCARED', mad: 'MAD', wow: 'SURPRISED', sleep: 'TIRED' };
  const SORT = { big: 'BIG', mid: 'MIDDLE', small: 'LITTLE', fruit: 'FRUIT', veg: 'VEGETABLE', apple: 'APPLE', orange: 'ORANGE', melon: 'FRUIT', berry: 'FRUIT', banana: 'BANANA', grapes: 'FRUIT', pear: 'FRUIT', carrot: 'VEGETABLE', broccoli: 'VEGETABLE', corn: 'VEGETABLE', peas: 'VEGETABLE', potato: 'VEGETABLE' };
  // things that are named in the games (touching a creature, a recipe, a shop item...): the sign when there is one
  const THING = { bee: 'BEE', butterfly: 'BUTTERFLY', ladybug: 'BUTTERFLY', bunny: 'RABBIT', rabbit: 'RABBIT', bird: 'BIRD', frog: 'FROG', duckling: 'DUCK', duck: 'DUCK', mouse: 'MOUSE', cat: 'CAT', kitty: 'CAT', dog: 'DOG', puppy: 'DOG', bear: 'BEAR', pig: 'PIG', horse: 'HORSE', cow: 'COW', monkey: 'MONKEY', owl: 'OWL', fish: 'FISH', guppy: 'FISH', clown: 'FISH', angel: 'FISH', puffer: 'FISH', dino: 'DINOSAUR', apple: 'APPLE', banana: 'BANANA', cookie: 'COOKIE', sugar: 'COOKIE', chip: 'COOKIE', cake: 'CAKE', cupcake: 'CAKE', pancake: 'COOK', sundae: 'ICE-CREAM', pbj: 'SANDWICH', toastie: 'SANDWICH', sandwich: 'SANDWICH', burger: 'BURGER', pizza: 'PIZZA', hotdog: 'BREAD', bread: 'BREAD', milk: 'MILK', cheese: 'CHEESE', carrot: 'VEGETABLE', lettuce: 'VEGETABLE', tomato: 'VEGETABLE', strawberry: 'FRUIT', blueberry: 'FRUIT', cherry: 'FRUIT', star: 'STAR', heart: 'HEART', flower: 'FLOWER', moon: 'MOON', sun: 'SUN', rainbow: 'RAINBOW', castle: 'CASTLE', home: 'HOME', christmas: 'TREE', space: 'STAR', beach: 'WATER', halloween: 'PUMPKIN', ball: 'BALL', car: 'CAR', book: 'BOOK', tree: 'TREE', house: 'HOUSE', boat: 'BOAT', plane: 'AIRPLANE', train: 'TRAIN', robot: 'ROBOT', kite: 'KITE', snowman: 'SNOW', pumpkin: 'PUMPKIN', 'ice cream': 'ICE-CREAM' };
  const GLOSS = {
    welcome: 'PLAY', hello: 'HELLO', 'welcome-home': 'WELCOME HOME', 'break-time': 'TIME REST',
    'great-job': 'GOOD APPLAUSE', wow: 'APPLAUSE', 'you-did-it': 'FINISH APPLAUSE', amazing: 'APPLAUSE', yay: 'HURRAY',
    'try-again': 'TRY AGAIN', find: 'FIND', 'is-for': '', 'starts-with': 'WHICH', 'write-name': 'YOUR NAME WRITE', 'spell-name': 'YOUR NAME SPELL',
    'follow-bee': 'FOLLOW BEE', 'catch-drops': 'CATCH RAIN', rainbow: 'RAINBOW', 'storm-coming': 'RAIN BIG', 'storm-over': 'SUN LOOK', 'raining-pets': 'RAIN CAT DOG', 'pets-safe': 'SAVE ALL', 'meteor-start': 'STAR CATCH', 'meteor-done': 'DINOSAUR SAFE HURRAY',
    'fire-start': 'FIRE WATER', 'fire-pet': 'TOUCH HELP DOWN', 'fire-done': 'SAFE ALL HURRAY', 'fire-level': 'NEW', 'fire-next': 'TOUCH NEXT',
    'band-start': 'TOUCH FRIEND MUSIC', 'band-copy': 'LOOK YOUR-TURN', 'band-song': 'PLAY MUSIC',
    'shapes-start': 'SHAPE PUT BUILD', 'shapes-done': 'BUILD FINISH APPLAUSE', 'shapes-wrong': 'TRY AGAIN',
    'puzzle-start': 'PICTURE MAKE', 'puzzle-done': 'PICTURE FINISH APPLAUSE', 'puzzle-next': 'TOUCH NEXT',
    'care-start': 'CARE FRIEND', 'care-food': 'DELICIOUS THANK-YOU', 'care-clean': 'CLEAN', 'care-sleep': 'SHH SLEEP', 'care-hungry': 'FRIEND HUNGRY', 'care-dirty': 'FRIEND BATH', 'care-tired': 'FRIEND TIRED', 'care-morning': 'GOOD MORNING',
    'hide-start': 'WHO HIDE LOOK', 'hide-found': 'FIND COME', 'hide-done': 'ALL FIND APPLAUSE', 'hide-gate': 'ALL FIND FOLLOW NEXT', 'hide-locked': 'FRIEND FIND FIRST', 'hide-new': 'NEW', 'hide-home': 'ALL HOME APPLAUSE',
    'cook-pick': 'WHAT COOK', 'cook-start': 'COOK', 'cook-add': 'PUT BOWL', 'cook-stir': 'STIR', 'cook-roll': 'ROLL', 'cook-cut': 'CHOOSE TOUCH', 'cook-cutsand': 'CHOOSE TOUCH SANDWICH', 'cook-oven-on': 'FIRST TOUCH',
    'cook-squirt': 'SQUEEZE', 'cook-drop': 'PUT', 'cook-pour': 'POUR', 'cook-bake': 'BAKE TOUCH', 'cook-ding': 'READY TOUCH', 'cook-grill': 'COOK PUT', 'cook-flip': 'COOK', 'cook-stack': 'BUILD', 'cook-frost': 'TOUCH CAKE',
    'cook-decorate': 'BEAUTIFUL MAKE', 'cook-slice': 'CUT', 'cook-serve': 'DELICIOUS EAT', 'cook-pickbun': 'CHOOSE BREAD', 'cook-pickbread': 'CHOOSE BREAD', 'cook-patties': 'PUT N:1 N:2 N:3', 'cook-meat': 'CHOOSE PUT', 'cook-cheese': 'CHEESE PUT',
    'cook-veg': 'VEGETABLE PUT', 'cook-saucetop': 'SQUEEZE PUT', 'cook-scoop': 'CHOOSE ICE-CREAM', 'cook-pizzasauce': 'PIZZA', 'cook-pizzacheese': 'CHEESE PUT', 'cook-toppings': 'PUT', 'cook-yum': 'DELICIOUS', 'cook-wrong': 'LOOK', 'cook-done': 'COOK FINISH DELICIOUS',
    'fish-start': 'FISHING TOUCH', 'fish-bite': 'FISH NOW TOUCH',
    'pat-start': 'WHAT NEXT', 'pat-next': 'WHAT NEXT',
    'feel-start': 'HELLO ME FEEL HOW', 'feel-how': 'ME FEEL HOW', 'feel-look': 'LOOK', 'feel-why': 'WHY ME FEEL',
    'feel-s-present': 'GIFT ME', 'feel-s-cake': 'CAKE ME', 'feel-s-pal': 'FRIEND COME PLAY', 'feel-s-icecream': 'ICE-CREAM FALL', 'feel-s-balloon': 'BALLOON GO', 'feel-s-rain': 'RAIN PLAY NO', 'feel-s-thunder': 'LIGHTNING',
    'feel-s-dark': 'DARK', 'feel-s-tower': 'BUILD FALL', 'feel-s-splash': 'DIRTY', 'feel-s-jack': 'WHAT', 'feel-s-party': 'PARTY', 'feel-s-yawn': 'PLAY TIRED', 'feel-s-bubbles': 'LOOK HAPPY', 'feel-s-rainbow': 'RAINBOW', 'feel-s-spider': 'SPIDER', 'feel-s-grab': 'MY BALL',
    'feel-help': 'WHAT HELP', 'feel-help-sleep': 'WHAT HELP SLEEP', 'feel-joy': 'PLAY TOGETHER CHOOSE', 'feel-breathe': 'BREATHE', 'feel-better': 'THANK-YOU BETTER', 'feel-fun': 'FUN THANK-YOU', 'feel-night': 'THANK-YOU NIGHT',
    'sort-color': 'SAME COLOR PUT', 'sort-size': 'BIG LITTLE', 'sort-size3': 'BIG MIDDLE LITTLE', 'sort-food': 'FRUIT VEGETABLE', 'sort-shape': 'SAME SHAPE PUT', 'sort-try': 'TRY AGAIN', 'sort-done': 'CLEAN FINISH APPLAUSE',
    'shop-stars': 'STAR MORE PLAY', 'shop-first': 'FRIEND HOME FIRST', 'shop-worn': 'NO',
    'clay-start': 'MAKE ROLL',
    'count-touch': 'TOUCH COUNT', 'count-how': 'HOW-MANY', 'count-find': 'TOUCH NUMBER', 'count-start': 'COUNT',
    'math-plus': 'PLUS', 'math-minus': 'MINUS', 'math-is': 'EQUAL', 'math-sum': 'HOW-MANY TOGETHER', 'math-left': 'HOW-MANY', 'math-more': 'PLUS N:1 EQUAL', 'math-start': 'PLUS MINUS',
    'aq-start': 'FEED FISH', 'aq-fresh': 'NEW FISH MONEY', 'aq-coin': 'MONEY TOUCH', 'aq-grow': 'FISH GROW', 'aq-shop': 'BUY', 'aq-boss': 'MAD TOUCH', 'aq-boss-done': 'NEW FRIEND HURRAY',
    'dig-first': 'FIRST DIG', 'dig-one': 'DIG N:1', 'dig-two': 'N:2', 'dig-three': 'N:3 GOOD', 'pat-it': 'PAT', 'bye-bye': 'BYE FRIEND', 'pour-water': 'WATER FLOWER', 'seed-in': 'SEED PUT', 'water-me': 'TOUCH WATER',
    'sl-start': 'HELLO PLAY', 'sl-find': 'LOOK FIND', 'sl-letter': 'LOOK WHICH', 'sl-word': 'LOOK SPELL FIND', 'new-friend': 'NEW FRIEND', 'new-seeds': 'NEW SEED', 'bigger-garden': 'GARDEN BIG', 'confirm-bye': 'BYE STAY'
  };
  const spell = word => String(word || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 10).split('').map(l => 'L:' + l);
  // a line (a key, or {say: text}) as sign ids
  function glossOf(item) {
    if (!item) return [];
    if (typeof item !== 'string') return item.say ? spell(item.say.split(/\s+/)[0]) : [];
    const [p, rest] = item.includes('/') ? [item.slice(0, item.indexOf('/')), item.slice(item.indexOf('/') + 1)] : [null, null];
    if (GLOSS[item] != null) return GLOSS[item].split(' ').filter(Boolean);
    switch (p) {
      case 'letter': case 'sound': return ['L:' + rest.toLowerCase()];
      case 'num': return S.SIGNS['N:' + rest] ? ['N:' + rest] : [];
      case 'color': return COLOR[rest] ? [COLOR[rest]] : [];
      case 'shape': return SH[rest] ? [SH[rest]] : [];
      case 'shapes-count': return ['HOW-MANY', SH[rest] || 'SHAPE', 'COUNT'];
      case 'feel': return ['YES', MOOD[rest]].filter(Boolean);
      case 'fish': return ['FISH'];
      case 'sign': return S.SIGNS[rest] ? [rest] : [];
      case 'sort': return SORT[rest] ? [SORT[rest]] : [];
      case 'name': return spell(rest);
      case 'pname': { const pl = store.profiles.find(q => q.id === rest); return spell(pl && pl.name); }
      case 'player': { const pl = store.profiles.find(q => q.id === rest); return ['HELLO', ...spell(pl && pl.name)]; }
      case 'word': { const w = SPG.voice.LINES[item] || ''; const t = THING[w.toLowerCase()]; return t ? [t] : spell(w); }
      default: { const t = THING[rest] || THING[(rest || '').split('-')[0]]; return t ? [t] : []; }
    }
  }
  const textOf = item => (typeof item === 'string' ? SPG.voice.textFor(item) : item && item.say) || '';

  /* ---------------------------------------------------------------- the card in the corner */
  let card = null, cv = null, cap = null, hands = null, raf = 0, last = 0, hideAt = 0, pending = null, words = [];
  function build() {
    if (card) return;
    card = document.createElement('div'); card.id = 'sign-card'; card.className = 'sign-card'; card.setAttribute('aria-hidden', 'true');
    cv = document.createElement('canvas'); cap = document.createElement('div'); cap.className = 'sign-cap';
    card.append(cv, cap); document.body.append(card);
    hands = new S.Signer({ skin: store.settings.signSkin || 'medium' });
  }
  function place() {
    const st = store.settings; card.classList.toggle('right', st.signSide === 'right'); card.classList.toggle('big', st.signSize === 'big');
    cap.style.display = st.signWords === false ? 'none' : '';
    hands.setSkin(st.signSkin || 'medium');
  }
  function frame(now) {
    raf = 0; if (!card) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    // a new line waits for the sign that is being made to finish (but never long), so no sign is cut off half way
    if (pending) { const w = hands.wordNow(); if (!hands.busy || !w || hands.time >= w.to - .05 || hands.time - (pending.at || 0) > .9) { start(pending.ids, pending.text); pending = null; } }
    hands.update(dt);
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (r.width) {
      const W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr); if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height);
      hands.draw(c, 0, 0, r.width, r.height, { dt });
    }
    if (!hands.busy && !pending && !hideAt) hideAt = now + 1400;
    if (hideAt && now > hideAt) { card.classList.remove('show'); hideAt = 0; if (!hands.busy) return; }
    raf = requestAnimationFrame(frame);
  }
  function start(ids, text) {
    place();
    hands.play(ids); words = ids; cap.textContent = text; hideAt = 0;
    card.classList.toggle('words-only', !ids.length);
    card.classList.add('show');
    if (!ids.length) hideAt = performance.now() + 2600;
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  // called by SPG.voice.say with the lines that are really being said
  function say(items) {
    if (!on() || SPG.voice.hushed || SPG.signs.quiet) return;
    build();
    const ids = items.flatMap(glossOf).filter((id, i, a) => S.SIGNS[id] && id !== a[i - 1]);
    const text = items.map(textOf).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (!ids.length && !text) return;
    if (hands.busy && card.classList.contains('show')) pending = { ids, text, at: hands.time };
    else start(ids, text);
  }
  function stop() { pending = null; if (!card) return; hands.stop(); card.classList.remove('show'); }

  SPG.signs = { on, say, stop, glossOf, GLOSS, THING, spell, sample: () => { const was = store.settings.signs; store.settings.signs = true; say(['hello', 'feel-how']); store.settings.signs = was; } };
})();
