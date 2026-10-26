// Age and difficulty. Every player has either an exact age (2 to 7) or an age group, chosen by a grown-up (at setup, or later in
// Grown-ups > Age and difficulty). Each game asks `SPG.level.tier('rain')` and gets 1 (easiest), 2 (the original game) or 3 (older kids).
//  - An age group is a predefined plan: every game uses that group's tier.
//  - An exact age is a curated mix: each game steps up at its own age (RULE), so a 5-year-old might play the maths at tier 3 and
//    the Fruit Splash balloons still at tier 2.
// Saved on the player as `level`: { mode: 'group', group: 'tiny' | 'little' | 'big' } or { mode: 'age', age: 2..7 }.
// A player with no choice (or an old save) is "Little kid", which is exactly how the games always played.
(() => {
  const SPG = window.SPG, store = SPG.store, t = SPG.t;

  const GROUPS = [
    { id: 'tiny', name: t('Toddler'), ages: '2–3', tier: 1 },
    { id: 'little', name: t('Little kid'), ages: '3–5', tier: 2 },
    { id: 'big', name: t('Big kid'), ages: '6–7', tier: 3 }
  ];
  const AGES = [2, 3, 4, 5, 6, 7];
  // the exact age at which each game steps up to tier 2 and to tier 3 (age 2 is always tier 1)
  const RULE = { letters: [3, 6], numbers: [3, 5], math: [3, 5], fruit: [3, 6], rain: [3, 5], fire: [3, 5], band: [3, 5], shapes: [3, 5], puzzle: [3, 5], hide: [3, 6], garden: [3, 6], cook: [3, 5], clay: [3, 5], fishing: [3, 5], pattern: [4, 6], feelings: [3, 5], sort: [3, 5], signs: [3, 5] };
  // what each game does at each tier (shown to grown-ups)
  const GAMES = [
    ['letters', t('Letter Garden'), [t('Always three choices in the find-it games'), t('Three choices, then four with practice'), t('Four choices every time, look-alike letters allowed')]],
    ['numbers', t('Letter Garden: Numbers'), [t('Count 1 to 3 (then to 5), touching each one'), t('Count up to 10'), t('Count up to 20 in rows of five')]],
    ['math', t('Letter Garden: Add and take away'), [t('One more: adding within 5 with pictures'), t('Adding within 10 and taking away within 5'), t('Adding and taking away within 20')]],
    ['fruit', t('Fruit Splash'), [t('Slower fruit'), t('Happy fruit, nothing is ever lost'), t('Faster fruit and sly water balloons (they cost 5 points)')]],
    ['rain', t('Rain Bucket'), [t('The bucket fills quickly (6 drops)'), t('Rainbow every 8 drops'), t('A fuller bucket (14 drops) and faster rain')]],
    ['fire', t('Fire Rescue'), [t('One or two small flames in each building'), t('Several flames in each building'), t('Nearly every window is on fire, and flames flare back up if they are left alone')]],
    ['band', t('Bunny Band'), [t('Copy tunes of up to 3 notes'), t('Copy tunes of up to 5 notes'), t('Copy tunes of up to 7 notes')]],
    ['shapes', t('Shape Builder'), [t('3 or 4 pieces, and each hole shows its colour'), t('5 to 7 pieces, and each hole shows its colour'), t('8 to 11 pieces, plain shadow holes (a small picture shows the colours) and two look-alike pieces in the wrong colour')]],
    ['puzzle', t('Puzzle Pond'), [t('Up to 6 pieces'), t('Up to 12 pieces'), t('Up to 20 pieces')]],
    ['hide', t('Hide and Seek'), [t('Two friends in each place, the arrow comes sooner'), t('Three to five friends in each place'), t('At least four friends in each place, the arrow waits longer')]],
    ['garden', t('Grow a Garden'), [t('Plants need less water'), t('The usual amount of water'), t('Plants need more water')]],
    ['cook', t('Sprout Kitchen'), [t('Ingredients measured out, at most two scoops of each'), t('Real recipe amounts (cups, half cups, eggs, butter sticks), counted out loud'), t('Real recipe amounts (cups, half cups, eggs, butter sticks), counted out loud')]],
    ['clay', t('Clay Corner'), [t('Seven big tools: clay, hand, pull, squish, rolling pin, cookie cutters, eyes and beads'), t('Adds the knife, stamps, smoothing, pinch and poke'), t('Adds recolouring (the paint drop)')]],
    ['fishing', t('Fishing Pond'), [t('Three fishing spots, a fish bites quickly and one tap reels it in'), t('Five fishing spots (deeper water too), three taps to reel a fish in'), t('Five fishing spots, five taps to reel in, and the fish tugs while reeling')]],
    ['pattern', t('Caterpillars (what comes next)'), [t('Two-colour patterns (red, blue, red, blue...) and two balls to pick from'), t('Starts with two-colour patterns, adds red-red-blue and three-colour ones after two right first tries; three balls to pick from'), t('Longer patterns, patterns of dots, stripes or big and small, two missing balls and look-alike balls')]],
    ['feelings', t('Feeling Friends (naming feelings, helping)'), [t('Happy or sad, two faces to pick from'), t('Happy, sad, scared, mad and surprised, three faces to pick from'), t('Also sleepy, four faces to pick from, then "Why did I feel that way?": pick the picture of what happened')]],
    ['signs', t('Sign Along (sign language)'), [t('Everyday signs, animals and food; two pictures to pick from'), t('Also colours, things and numbers to 5; three pictures'), t('Everything: also shapes, feelings and numbers to 10, and short fingerspelled words; four pictures')]],
    ['sort', t('Tidy Time (sorting)'), [t('Two baskets and 6 things: sort by colour, or big and little'), t('Three colours, fruit or vegetable, big or little; 8 things'), t('Four colours, big-middle-little, fruit or vegetable, and by shape with the colours mixed; 10 things')]],
  ];

  const cfgOf = p => {
    if (p && p.level && (p.level.mode === 'age' || p.level.mode === 'group')) return p.level;
    return { mode: 'group', group: store.settings.fruitAge === 'big' ? 'big' : 'little' };   // old saves: Fruit Splash "bigger kids" meant bigger kids everywhere
  };
  const tierOf = (cfg, game) => {
    if (cfg.mode === 'age') { const r = RULE[game] || [3, 6], a = +cfg.age || 4; return a < 3 ? 1 : a >= r[1] ? 3 : a >= r[0] ? 2 : 1; }
    return (GROUPS.find(g => g.id === cfg.group) || GROUPS[1]).tier;
  };

  SPG.level = {
    GROUPS, AGES, GAMES,
    cfg: p => cfgOf(p || store.active),
    // 1, 2 or 3 for this game and the active player (or the player given)
    tier: (game, p) => tierOf(cfgOf(p || store.active), game),
    set(p, cfg) { p.level = cfg; p.t = Date.now(); store.save(); },
    label(p) { const c = cfgOf(p); if (c.mode === 'age') return t('Age {n}', { n: c.age }); const g = GROUPS.find(x => x.id === c.group) || GROUPS[1]; return `${g.name} (${g.ages})`; },
    // [game name, what it does for this player] for every game
    describe(p) { const c = cfgOf(p); return GAMES.map(([id, name, d]) => [name, d[tierOf(c, id) - 1]]); }
  };
})();
