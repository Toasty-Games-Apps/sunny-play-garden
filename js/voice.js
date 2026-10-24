// Voice prompts. Every spoken line is a key in LINES. A line can be played from:
//   1. a recording made on this tablet in the grown-ups "Voices" screen (kept in IndexedDB), or
//   2. an audio file in audio/voice/<male|female>/<key>.mp3 listed in audio/voice/manifest.json, or
//   3. the browser's built-in speech (fallback, so nothing is ever silent).
// Two voice sets (male, female) can be mixed. Lines can be muted one by one, and praise can be
// made less frequent. "Sound-only" keys (critter noises) play only when recorded.
(() => {
  const SPG = window.SPG;
  const A = SPG.audio, store = SPG.store;

  const PHONICS = { a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fuh', g: 'guh', h: 'huh', i: 'ih', j: 'juh', k: 'kuh', l: 'luh', m: 'muh', n: 'nuh', o: 'aw', p: 'puh', q: 'kwuh', r: 'ruh', s: 'sss', t: 'tuh', u: 'uh', v: 'vuh', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz' };
  const NAMES = { a: 'Ay', b: 'Bee', c: 'Cee', d: 'Dee', e: 'Ee', f: 'Eff', g: 'Gee', h: 'Aitch', i: 'Eye', j: 'Jay', k: 'Kay', l: 'El', m: 'Em', n: 'En', o: 'Oh', p: 'Pee', q: 'Cue', r: 'Ar', s: 'Ess', t: 'Tee', u: 'You', v: 'Vee', w: 'Double you', x: 'Ex', y: 'Why', z: 'Zee' };
  // One picture word per letter (emoji renders on every Android tablet).
  const WORDS = { a: ['apple', '🍎'], b: ['bear', '🐻'], c: ['cat', '🐱'], d: ['dog', '🐶'], e: ['elephant', '🐘'], f: ['fish', '🐟'], g: ['giraffe', '🦒'], h: ['horse', '🐴'], i: ['ice cream', '🍦'], j: ['juice', '🧃'], k: ['koala', '🐨'], l: ['lion', '🦁'], m: ['moon', '🌙'], n: ['nose', '👃'], o: ['octopus', '🐙'], p: ['pig', '🐷'], q: ['queen', '👸'], r: ['rainbow', '🌈'], s: ['sun', '☀️'], t: ['turtle', '🐢'], u: ['umbrella', '☂️'], v: ['violin', '🎻'], w: ['whale', '🐳'], x: ['box', '📦'], y: ['yarn', '🧶'], z: ['zebra', '🦓'] };

  const PRAISE = new Set(['great-job', 'wow', 'you-did-it', 'amazing', 'yay']);
  const CRITTERS = ['bee', 'butterfly', 'ladybug', 'bunny', 'bird', 'snail', 'hedgehog', 'frog', 'duckling', 'mouse', 'turtle', 'dragonfly', 'cat', 'dog'];
  const CRITTER_NOISE = { bee: 'Bzzzz!', butterfly: 'a soft flutter noise', ladybug: 'a tiny squeak', bunny: 'a happy sniffle', bird: 'Tweet tweet!', snail: 'a slow, sleepy "sloooow"', hedgehog: 'a little snuffle', frog: 'Ribbit!', duckling: 'Quack quack!', mouse: 'Squeak squeak!', turtle: 'a slow "hellooo"', dragonfly: 'a quick buzzy zip', cat: 'Meow!', dog: 'Woof woof!' };
  const CRITTER_LINE = { bee: 'Bzzz! A bee!', butterfly: 'A butterfly!', ladybug: 'A ladybug!', bunny: 'A bunny!', bird: 'A little bird!', snail: 'A snail!', hedgehog: 'A hedgehog!', frog: 'A frog!', duckling: 'A duckling!', mouse: 'A little mouse!', turtle: 'A turtle!', dragonfly: 'A dragonfly!', cat: 'A kitty!', dog: 'A puppy!' };

  // Spoken lines (also the built-in speech fallback text).
  const LINES = {
    'welcome': "Hi! Let's play!",
    'great-job': 'Great job!', 'wow': 'Wow!', 'you-did-it': 'You did it!', 'amazing': 'Amazing!', 'yay': 'Yay!',
    'try-again': 'Try again!',
    'find': 'Can you find the letter', 'follow-bee': 'Follow the bee!', 'is-for': 'is for',
    'starts-with': 'Which one starts with', 'write-name': "Let's write your name!", 'spell-name': 'Your name is spelled',
    'catch-drops': 'Catch the raindrops!', 'rainbow': 'A rainbow!',
    'fire-start': 'Some little fires! Spray them with water!', 'fire-pet': 'Tap the pet to help them down!', 'fire-done': 'Everyone is safe! Hooray!',
    'band-start': 'Touch the friends to make music!', 'band-copy': 'Listen... now you play!', 'band-song': 'Play some notes, then touch the red button!',
    'shapes-start': 'Build the picture! Put each shape in its hole!', 'shapes-done': 'You built it!', 'shapes-wrong': 'Try another one!',
    'puzzle-start': 'Put the picture together!', 'puzzle-done': 'You made the picture!', 'puzzle-next': 'Tap the green arrow for another puzzle!',
    'care-start': 'Take care of your friend!', 'care-food': 'Yum! Thank you!', 'care-clean': 'So fresh and clean!', 'care-sleep': 'Shhh... sleepy time.', 'care-hungry': 'Your friend is hungry!', 'care-dirty': 'Your friend needs a bath!', 'care-tired': 'Your friend is sleepy!',
    'hide-start': 'Who is hiding? Walk along the trail and look!', 'hide-found': 'Found you! Come along!', 'hide-done': 'You found everybody!', 'hide-gate': 'You found everyone here! Follow the glowing trail to the next place!', 'hide-locked': 'Find all your friends first!', 'hide-new': 'A new place to explore!', 'hide-home': 'What a wonderful adventure! Everyone is home!',
    'cook-pick': 'What shall we cook today?', 'cookc/0': 'Sweets!', 'cookc/1': 'Sandwiches!', 'cookc/2': 'Burgers, hot dogs and pizza!',
    'cook-start': "Let's cook! Follow the chef!", 'cook-add': 'Put it in the bowl!', 'cook-stir': 'Stir, stir, stir!', 'cook-roll': 'Roll the dough flat!', 'cook-cut': 'Pick a cutter, then touch the dough!', 'cook-cutsand': 'Pick a cutter, then touch the sandwich!', 'cook-oven-on': 'First, turn the oven on! Touch it!', 'cook-squirt': 'Squeeze the sauce anywhere you like!',
    'cook-drop': 'Put some dough on the tray!', 'cook-pour': 'Pour the batter in!', 'cook-bake': 'Into the oven! Touch the tray!', 'cook-ding': "It's ready! Touch the oven!",
    'cook-grill': 'Put it on the grill!', 'cook-flip': 'Flip it over!', 'cook-stack': 'Stack it up! Pick the glowing one!', 'cook-frost': 'Touch the cake with icing!',
    'cook-decorate': 'Make it pretty!', 'cook-slice': 'Slice it with the knife!',
    'cook-serve': 'Yummy! Touch it to take a bite!',
    'fish-start': 'Tap the fishing rod, then tap a spot!', 'fish-bite': 'A bite! Tap to reel it in!', 'fish/bass': 'A bass!', 'fish/bluegill': 'A bluegill!', 'fish/goldfish': 'A goldfish!', 'fish/carp': 'A carp!', 'fish/trout': 'A trout!', 'fish/perch': 'A perch!', 'fish/catfish': 'A catfish!', 'fish/salmon': 'A salmon!', 'fish/minnow': 'A minnow!',
    'pat-start': 'What comes next? Touch it!', 'pat-next': 'What comes next?',
    'feel-start': 'Hello! Can you tell how I feel?',
    'sort-color': 'Put each toy in the basket of the same color!', 'sort-size': 'Big things for the big bear, little things for the little bear!', 'sort-size3': 'Big, middle and little! Give each bear the right size!', 'sort-food': 'Fruit in the bowl, vegetables in the crate!', 'sort-shape': 'Sort them by shape!', 'sort-try': 'Not that one. Try another basket!', 'sort-done': 'All tidy! Great sorting!',
    'sort/big': 'Big!', 'sort/mid': 'Middle!', 'sort/small': 'Little!', 'sort/fruit': 'Fruit!', 'sort/veg': 'A vegetable!', 'sort/apple': 'An apple!', 'sort/orange': 'An orange!', 'sort/melon': 'Watermelon!', 'sort/berry': 'A strawberry!', 'sort/banana': 'A banana!', 'sort/grapes': 'Grapes!', 'sort/pear': 'A pear!', 'sort/carrot': 'A carrot!', 'sort/broccoli': 'Broccoli!', 'sort/corn': 'Corn!', 'sort/peas': 'Peas!', 'sort/potato': 'A potato!',
    'feel-how': 'How do I feel? Touch the face.',
    'feel-look': 'Hmm. Look at my face!',
    'feel-s-present': 'A present, just for me!',
    'feel-s-cake': 'A big birthday cake for me!',
    'feel-s-pal': 'My best friend came to play!',
    'feel-s-icecream': 'Oh no! My ice cream fell down.',
    'feel-s-balloon': 'Oh no! My balloon flew away.',
    'feel-s-rain': 'It is raining. No playing outside today.',
    'feel-s-thunder': 'Boom! The thunder is so loud!',
    'feel-s-dark': 'The lights went out. It is so dark!',
    'feel-s-tower': 'Hey! The ball knocked my tower down!',
    'feel-s-splash': 'Hey! Mud splashed all over me!',
    'feel-s-jack': 'Pop! What was that?',
    'feel-s-party': 'Surprise! A party!',
    'feel-s-yawn': 'I played all day long. Yawn!',
    'feel-s-bubbles': 'Look! Bubbles, bubbles everywhere!',
    'feel-s-rainbow': 'Oh! A big rainbow!',
    'feel-s-spider': 'Eek! A spider came down!',
    'feel-s-grab': 'Hey! That is my ball!',
    'feel-why': 'Why did I feel that way? Touch the picture.',
    'feel/happy': 'Yes! I feel happy!',
    'feel/sad': 'Yes. I feel sad.',
    'feel/scared': 'Yes. I feel scared.',
    'feel/mad': 'Yes! I feel mad!',
    'feel/wow': 'Yes! I feel surprised!',
    'feel/sleep': 'Yes. I feel sleepy.',
    'feel-help': 'What would help me feel better?',
    'feel-help-sleep': 'What helps me go to sleep?',
    'feel-joy': 'Let\'s have fun together! Pick one!',
    'feel-breathe': 'Let\'s take a big breath in, and blow it out slowly.',
    'feel-better': 'Thank you! I feel much better now!',
    'feel-fun': 'That was so much fun! Thank you!',
    'feel-night': 'Thank you. Good night!',
    'shop-stars': 'That one needs more stars. Keep playing to get more!', 'shop-first': 'Take a friend home first!', 'shop-worn': 'Another friend is wearing that one.',
    'clay-start': 'Squish, roll and shape your clay!', 'clay/clay': 'Clay!', 'clay/hand': 'Pick it up!', 'clay/pull': 'Pull it!', 'clay/squish': 'Squish!', 'clay/roll': 'Roll it flat!', 'clay/cutters': 'Cookie cutters!', 'clay/extras': 'Eyes and beads!', 'clay/knife': 'Cut it!', 'clay/stamps': 'Stamps!', 'clay/smooth': 'Smooth it!', 'clay/pinch': 'Pinch!', 'clay/poke': 'Poke!', 'clay/dye': 'Add some color!', 'clay/circle': 'A circle!', 'clay/square': 'A square!', 'clay/heart': 'A heart!', 'clay/star': 'A star!', 'clay/flower': 'A flower!', 'clay/triangle': 'A triangle!', 'clay/bear': 'A bear!', 'clay/cat': 'A kitty!', 'clay/dots': 'Dots!', 'clay/paw': 'A paw!', 'clay/ridges': 'Stripes!', 'clay/ring': 'A ring!', 'clay/zigzag': 'A zigzag!', 'clay/eye': 'A googly eye!', 'clay/bead': 'A bead!', 'clay/pearl': 'A pearl!', 'clay/sprinkles': 'Sprinkles!',
    'cook-pickbun': 'Pick a bun!', 'cook-pickbread': 'Pick your bread!', 'cook-patties': 'Put patties on the grill! One, two or three!', 'cook-meat': 'Add the meat you like!', 'cook-cheese': 'Add some cheese, or touch the green check!', 'cook-veg': 'Add the veggies you like!', 'cook-saucetop': 'Add some sauce, then put the top on!', 'cook-scoop': 'Pick your ice cream!', 'cook-pizzasauce': 'Spread the sauce all over!', 'cook-pizzacheese': 'Sprinkle on the cheese!', 'cook-toppings': 'Put your toppings anywhere you like!', 'cook-yum': 'Yum yum!', 'cook-wrong': 'Try the glowing one!', 'cook-done': 'You cooked it! Delicious!',
    'cookr/sugar': 'Sugar cookies!', 'cookr/chip': 'Chocolate chip cookies!', 'cookr/cupcake': 'Cupcakes!', 'cookr/cake': 'A birthday cake!', 'cookr/pancake': 'Pancakes!', 'cookr/sundae': 'An ice cream sundae!', 'cookr/pbj': 'Peanut butter and jelly!', 'cookr/toastie': 'A cheese toastie!', 'cookr/sandwich': 'Build a sandwich!', 'cookr/hotdog': 'A hot dog!', 'cookr/burger': 'Build a burger!', 'cookr/pizza': 'Pizza!',
    'cook/flour': 'Flour!', 'cook/sugar': 'Sugar!', 'cook/egg': 'An egg!', 'cook/butter': 'Butter!', 'cook/milk': 'Milk!', 'cook/chips': 'Chocolate chips!', 'cook/cheese': 'Cheese!', 'cook/lettuce': 'Lettuce!', 'cook/tomato': 'Tomato!', 'cook/onion': 'Onion!', 'cook/pickle': 'Pickle!', 'cook/cucumber': 'Cucumber!', 'cook/avocado': 'Avocado!', 'cook/carrot': 'Carrot!', 'cook/ham': 'Ham!', 'cook/turkey': 'Turkey!', 'cook/patty': 'A burger patty!', 'cook/beanpatty': 'A veggie patty!', 'cook/chicken': 'A chicken patty!', 'cook/bunB': 'The bottom bun!', 'cook/bunT': 'The top bun!', 'cook/bread': 'Bread!', 'cook/hotbun': 'A hot dog bun!', 'cook/sausage': 'A sausage!', 'cook/pancake': 'Pancake!', 'cook/toast': 'Toast!', 'cook/butterpat': 'A pat of butter!', 'cook/batter': 'Batter!', 'cook/hotbunBack': 'A hot dog bun!', 'cook/bunny': 'Bunny!', 'cook/bear': 'Bear!', 'cook/cat': 'Kitty!', 'cook/fox': 'Fox!', 'cook/frog': 'Frog!', 'cook/panda': 'Panda!', 'cook/dino': 'Dinosaur!', 'cook/unicorn': 'Unicorn!', 'cook/flower': 'Flower!', 'cook/heart': 'Heart!', 'cook/ketchup': 'Ketchup!', 'cook/mustard': 'Mustard!', 'cook/mayo': 'Mayo!', 'cook/pbutter': 'Peanut butter!', 'cook/jelly': 'Jelly!', 'cook/syrup': 'Syrup!', 'cook/strawberry': 'A strawberry!', 'cook/blueberry': 'Blueberries!', 'cook/cherry': 'A cherry!', 'cook/sprinkles': 'Sprinkles!', 'cook/candy': 'Candy!', 'cook/candle': 'A candle!', 'cook/star': 'A star!', 'cook/cone': 'A cone!', 'cook/salt': 'Salt!', 'cook/pepper': 'Pepper!', 'cook/dough': 'Dough!', 'cook/ice-pink': 'Pink icing!', 'cook/ice-blue': 'Blue icing!', 'cook/ice-yellow': 'Yellow icing!', 'cook/ice-white': 'White icing!', 'cook/ice-choc': 'Chocolate icing!', 'cook/ice-green': 'Green icing!', 'cook/ice-purple': 'Purple icing!', 'cook/sc-vanilla': 'Vanilla ice cream!', 'cook/sc-strawb': 'Strawberry ice cream!', 'cook/sc-choc': 'Chocolate ice cream!', 'cook/sc-mint': 'Mint ice cream!', 'cook/sc-blueb': 'Blueberry ice cream!', 'cook/cheddar': 'Cheddar cheese!', 'cook/american': 'American cheese!', 'cook/provolone': 'Provolone cheese!', 'cook/pepperjack': 'Pepper jack cheese!', 'cook/swiss': 'Swiss cheese!', 'cook/bacon': 'Bacon!', 'cook/salami': 'Salami!', 'cook/chickenslice': 'Chicken!', 'cook/bun-plain': 'A plain bun!', 'cook/bun-sesame': 'A sesame bun!', 'cook/bun-wheat': 'A wheat bun!', 'cook/bunT-plain': 'The top bun!', 'cook/bunT-wheat': 'The top bun!', 'cook/bread-white': 'White bread!', 'cook/bread-wheat': 'Wheat bread!', 'cook/bread-rye': 'Rye bread!', 'cook/breadT': 'The top slice!', 'cook/breadT-wheat': 'The top slice!', 'cook/breadT-rye': 'The top slice!', 'cook/bbq': 'Barbecue sauce!', 'cook/relish': 'Relish!', 'cook/caramel': 'Caramel sauce!', 'cook/strawsauce': 'Strawberry sauce!', 'cook/cream': 'Whipped cream!', 'cook/pizzasauce': 'Pizza sauce!', 'cook/mozzarella': 'Mozzarella cheese!', 'cook/pepperoni': 'Pepperoni!', 'cook/mushroom': 'Mushrooms!', 'cook/olive': 'Olives!', 'cook/greenpepper': 'Green peppers!', 'cook/pineapple': 'Pineapple!', 'cook/basil': 'Basil!',
    'count-touch': 'Touch each one to count!', 'count-how': 'How many are there?', 'count-find': 'Touch the number!', 'math-plus': 'plus', 'math-minus': 'take away', 'math-is': 'is', 'math-sum': 'How many altogether?', 'math-left': 'How many are left?', 'math-more': 'One more makes', 'math-start': "Let's add and take away!", 'count-start': "Let's count!",
    'color/red': 'Red!', 'color/blue': 'Blue!', 'color/yellow': 'Yellow!', 'color/green': 'Green!',
    'shape/circle': 'Circle!', 'shape/square': 'Square!', 'shape/triangle': 'Triangle!', 'shape/star': 'Star!',
    'shape/rectangle': 'Rectangle!', 'shape/oval': 'Oval!', 'shape/semicircle': 'Half circle!', 'shape/trapezoid': 'Trapezoid!', 'shape/diamond': 'Diamond!',
    'color/orange': 'Orange!', 'color/purple': 'Purple!', 'color/pink': 'Pink!', 'color/brown': 'Brown!', 'color/gray': 'Gray!', 'color/white': 'White!',
    'aq-start': 'Touch the water to feed the fish!', 'aq-fresh': 'A fresh new fish tank! Here are some coins to buy new fish!', 'aq-coin': 'A shiny coin! Touch it!', 'aq-grow': 'Your fish is growing!', 'aq-shop': 'Spend your coins!', 'aq-boss': 'A grumpy visitor! Tap it with bubbles!', 'aq-boss-done': 'You made a new friend! Hooray!',
    'aq/guppy': 'A little guppy', 'aq/clown': 'A clownfish', 'aq/angel': 'An angelfish', 'aq/puffer': 'A pufferfish', 'aq/food': 'Better fish food', 'aq/more': 'More fish food', 'aq/snail': 'A helper snail', 'aq/power': 'Bubble power', 'aq/castle': 'A castle', 'aq/chest': 'A treasure chest', 'aq/weed': 'Seaweed', 'aq/shell': 'A big shell',
    'care-morning': 'Good morning!', 'room/home': 'A cozy home!', 'room/castle': 'A castle!', 'room/halloween': 'A spooky house!', 'room/christmas': 'A Christmas house!', 'room/dino': 'Dinosaur land!', 'room/space': 'Outer space!', 'room/beach': 'A seaside house!',
    'fire-level': 'A new place to help!', 'fire-next': 'Tap the green arrow to go somewhere new!',
    'meteor-start': 'Shooting stars! Catch them in your bucket!', 'meteor-done': 'You kept all the dinosaurs safe! Hooray!', 'storm-coming': 'Here comes a big rainy storm!', 'storm-over': 'The storm is over. Look, the sun!',
    'raining-pets': "It's raining cats and dogs!", 'pets-safe': 'You saved them all!',
    'dig-first': 'First, dig a hole with the shovel!', 'dig-one': 'Dig! One!', 'dig-two': 'Two!', 'dig-three': 'Three! A perfect hole!', 'pat-it': 'Now pat the dirt down!', 'bye-bye': 'Bye bye, friend! Have fun!', 'pour-water': 'Hold the can over the plant to water it!', 'seed-in': 'Now drop in a seed!', 'water-me': 'Tap the plant to water it!',
    'new-friend': 'A new friend!', 'new-seeds': 'New seeds to plant!', 'bigger-garden': 'Your garden got bigger!',
    'confirm-bye': 'Do you want to say bye-bye? Tap the soft pink button to say bye-bye, or the green one to stay.',
    'break-time': 'Time for a little rest!'
  };
  // Style Studio: every tab, friend and clothing name is said out loud when she touches it (she cannot read yet).
  const STYLE_NAMES = {
    'tab-who': 'Pick a friend!', 'tab-hair': 'Hair salon!', 'tab-makeup': 'Make-up!', 'tab-dress': 'Princess dresses!', 'tab-top': 'Tops!', 'tab-bottom': 'Skirts and pants!', 'tab-shoes': 'Shoes!', 'tab-hat': 'Crowns and hats!', 'tab-extras': 'Sparkly extras!', 'tab-nails': 'Nail salon!', 'tab-places': 'Places to go!',
    'who-0': 'Poppy', 'who-1': 'Maya', 'who-2': 'Zoe', 'who-3': 'Ivy', 'who-4': 'Leo', 'who-5': 'Sam', 'who-6': 'Kai', 'who-7': 'Theo',
    'hair-long': 'Long hair', 'hair-wavy': 'Wavy hair', 'hair-ponytail': 'A ponytail', 'hair-pigtails': 'Pigtails', 'hair-buns': 'Two buns', 'hair-braid': 'A braid', 'hair-bob': 'A bob', 'hair-short': 'Short hair', 'hair-spiky': 'Spiky hair', 'hair-curly': 'Curly hair', 'hair-topknot': 'A top knot', 'hair-none': 'No hair',
    'tool-comb': 'A comb!', 'tool-scissors': 'Scissors! Snip snip!', 'hair-salon': 'The hair salon! Fix the messy hair!', 'hair-mine': 'Your own hairstyle!', 'tool-dryer': 'A hair dryer!', 'tool-spray': 'Sparkle spray!', 'tool-bubbles': 'Bubbles! Wash the hair!',
    'dress-ball': 'A ball gown!', 'dress-aline': 'A party dress!', 'dress-tutu': 'A ballet tutu!', 'dress-mermaid': 'A mermaid gown!', 'dress-petal': 'A flower fairy dress!', 'dress-sun': 'A sundress!',
    'top-tee': 'A t-shirt', 'top-tank': 'A tank top', 'top-stripes': 'A stripy shirt', 'top-hoodie': 'A hoodie', 'top-sweater': 'A cozy sweater', 'top-star': 'A star shirt', 'top-vest': 'A fancy vest',
    'bottom-skirt': 'A skirt', 'bottom-shorts': 'Shorts', 'bottom-jeans': 'Jeans', 'bottom-leggings': 'Leggings', 'bottom-tutuskirt': 'A tutu skirt',
    'shoes-sneakers': 'Sneakers', 'shoes-boots': 'Boots', 'shoes-sandals': 'Sandals', 'shoes-glass': 'Glass slippers!', 'shoes-flats': 'Ballet shoes',
    'hat-crown': 'A crown!', 'hat-tiara': 'A tiara!', 'hat-bow': 'A big bow', 'hat-flowers': 'A flower crown', 'hat-cap': 'A cap', 'hat-beanie': 'A woolly hat', 'hat-party': 'A party hat!', 'hat-cowboy': 'A cowboy hat', 'hat-wizard': 'A wizard hat!', 'hat-bunny': 'Bunny ears!', 'hat-kitty': 'Kitty ears!', 'hat-princess': 'A princess hat!',
    'face-glasses': 'Glasses', 'face-hearts': 'Heart glasses!', 'face-stars': 'Star glasses!', 'face-mask': 'A fancy mask', 'face-stache': 'A silly mustache!',
    'neck-pearls': 'Pearls', 'neck-heart': 'A heart necklace', 'neck-star': 'A star necklace', 'neck-scarf': 'A scarf', 'neck-bowtie': 'A bow tie',
    'back-cape': 'A cape!', 'back-fairy': 'Fairy wings!', 'back-butterfly': 'Butterfly wings!', 'back-angel': 'Angel wings!', 'back-pack': 'A backpack',
    'hand-wand': 'A magic wand!', 'hand-flower': 'Flowers', 'hand-balloon': 'A balloon!', 'hand-purse': 'A purse', 'hand-teddy': 'A teddy bear', 'hand-lolly': 'A lollipop!',
    'hair-pixie': 'A pixie cut', 'hair-afro': 'A big afro', 'hair-halfup': 'Half up, half down', 'hair-twinbraids': 'Two braids', 'hair-mohawk': 'A mohawk!', 'hair-bowl': 'A bowl cut', 'hair-longcurly': 'Long curls', 'hair-sidepony': 'A side ponytail', 'hair-locs': 'Long locs', 'hair-crownbraid': 'A crown braid',
    'dress-royal': 'A royal gown!', 'dress-skater': 'A twirly dress!', 'dress-tiers': 'A ruffle dress', 'dress-pinafore': 'A pinafore', 'dress-snow': 'An ice queen gown!',
    'top-polo': 'A polo shirt', 'top-jersey': 'A sports shirt', 'top-flannel': 'A checked shirt', 'top-cardigan': 'A cardigan', 'top-puffer': 'A puffy jacket', 'top-blazer': 'A blazer', 'top-hearttee': 'A heart shirt',
    'bottom-capris': 'Capri pants', 'bottom-cargo': 'Pocket pants', 'bottom-joggers': 'Joggers', 'bottom-longskirt': 'A long skirt', 'bottom-plaid': 'A checked skirt',
    'shoes-rainboots': 'Rain boots', 'shoes-heels': 'Princess heels!', 'shoes-fuzzy': 'Fuzzy slippers', 'shoes-skates': 'Roller skates!',
    'hat-sun': 'A sun hat', 'hat-beret': 'A beret', 'hat-santa': 'A Santa hat!', 'hat-pirate': 'A pirate hat!', 'hat-chef': 'A chef hat', 'hat-halo': 'A halo', 'hat-ribbon': 'A ribbon headband',
    'face-shades': 'Sunglasses', 'face-clown': 'A red nose!', 'face-whiskers': 'Kitty whiskers!', 'face-patch': 'A pirate patch',
    'neck-lei': 'A flower necklace', 'neck-choker': 'A choker', 'neck-tie': 'A necktie', 'neck-medal': 'A gold medal!',
    'back-bat': 'Bat wings!', 'back-dragon': 'Dragon wings!', 'back-rainbow': 'Rainbow wings!',
    'hand-umbrella': 'An umbrella', 'hand-icecream': 'Ice cream!', 'hand-mirror': 'A hand mirror', 'hand-plush': 'A bunny toy', 'hand-starballoon': 'A star balloon!',
    'place-0': 'The castle ballroom', 'place-1': 'The garden', 'place-2': 'The beach', 'place-3': 'The salon', 'place-4': 'Under the stars', 'place-5': 'The rainbow meadow',
    'say-start': "Let's get dressed up!", 'say-show': 'Ta-da! Look at you! You look amazing!', 'say-nails': 'Pick a color and touch the nails!', 'say-hair': 'Touch the hair!', 'say-lips': 'Lipstick!', 'say-shadow': 'Sparkly eyes!', 'say-blush': 'Rosy cheeks!', 'say-freckles': 'Freckles!', 'say-gems': 'Face jewels!', 'say-skin': 'Skin color', 'say-eyes': 'Eye color', 'say-glitter': 'Glitter!', 'say-all': 'All the nails!', 'say-clear': 'Clean nails.'
  };
  for (const [k, v] of Object.entries(STYLE_NAMES)) LINES['style/' + k] = v;
  // The names in the name pickers (players and pets) are real lines too, so they can be recorded in the grown-ups' voice.
  const PICK_NAMES = {
    nicks: ['Sunny', 'Bunny', 'Sprout', 'Star', 'Peanut', 'Buttercup', 'Pumpkin', 'Ladybug', 'Honey', 'Dot', 'Bee', 'Twinkle'],
    pets: ['Biscuit', 'Pip', 'Mochi', 'Nugget', 'Clover', 'Peaches', 'Maple', 'Button', 'Pebble', 'Sprout', 'Waffles', 'Poppy', 'Cocoa', 'Daisy', 'Muffin', 'Twinkle', 'Rex', 'Spike', 'Stompy', 'Dino', 'Waddles', 'Nibbles', 'Whiskers', 'Snowball', 'Ginger', 'Bubbles', 'Oreo', 'Pepper', 'Fluffy', 'Sparkle', 'Bean', 'Noodle']
  };
  for (const n of new Set([...PICK_NAMES.nicks, ...PICK_NAMES.pets])) LINES['name/' + n] = n;
  const NUMW = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
  NUMW.forEach((w, n) => { LINES['num/' + n] = w + '!'; });
  Object.assign(LINES, { 'hello': 'Hello!', 'welcome-home': 'Welcome home,' });
  for (const [l, t] of Object.entries(NAMES)) LINES['letter/' + l] = t;
  for (const [l, t] of Object.entries(PHONICS)) LINES['sound/' + l] = t;
  for (const [l, [w]] of Object.entries(WORDS)) LINES['word/' + l] = w;
  for (const k of CRITTERS) LINES['creature/' + k] = CRITTER_LINE[k];
  // Sound-only keys: no speech fallback. They play only if someone has recorded them.
  const SOUNDS = {};
  for (const k of CRITTERS) SOUNDS['critter/' + k] = CRITTER_NOISE[k];
  // Purring and happy sounds for the close-up petting in Pet Care. Without a recording the game makes a soft synthesized purr.
  const PURRS = { trex: 'a low, rumbly happy growl', trike: 'a low, happy rumble', stego: 'a deep, sleepy rumble', bronto: 'a slow, deep hum', babydino: 'a squeaky happy chirp', cat: 'a long, happy purr (a real cat purring is best)', dog: 'a happy, sleepy dog groan or soft pant', bunny: 'a bunny "tooth purr", soft chattering teeth', bear: 'a low, contented hum', fox: 'a soft, chirpy fox chatter', panda: 'a gentle panda bleat or hum', frog: 'a soft, slow ribbit' };
  for (const [k, d] of Object.entries(PURRS)) SOUNDS['purr/' + k] = d;
  // THE SHORT LIST. A grown-up is asked to record only these (about 100 lines): the cheers, the letter names and sounds, the numbers 1 to 10
  // and one short instruction for each game, plus a greeting for each player. Every other line still exists, but it is optional ("More lines"
  // in Grown-ups > Voices): it is spoken by the built-in voice only if it is in SPOKEN below, otherwise it stays silent unless a grown-up
  // switches on "Extra audio help". That keeps the games calm and the recording job small.
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const CORE = [
    ...PRAISE, ...LETTERS.map(l => 'letter/' + l), ...LETTERS.map(l => 'sound/' + l), ...Array.from({ length: 10 }, (_, i) => 'num/' + (i + 1)),
    'welcome', 'try-again', 'break-time',
    'find', 'is-for', 'starts-with', 'write-name', 'count-touch', 'count-how', 'math-plus', 'math-minus', 'math-is',
    'fire-start', 'band-start', 'band-copy', 'shapes-start', 'puzzle-start', 'care-start', 'care-sleep', 'hide-start', 'hide-found', 'dig-first', 'pour-water',
    'aq-start', 'cook-add', 'cook-stir', 'cook-cut', 'cook-bake', 'cook-decorate', 'cook-serve', 'clay-start', 'fish-start', 'fish-bite'
  ].filter(k => k in LINES);
  const CORE_SET = new Set(CORE);
  const isCore = k => CORE_SET.has(k) || /^(pname|player)\//.test(k);
  // spoken whenever they come up (by a recording if there is one, otherwise the built-in voice) although they are not on the short list
  const SPOKEN = /^(letter|sound|word|num|color|shape|name|pname|player|fish|sort)\//;
  // Instructions that tell her what to do next: always spoken (she cannot read), although they are not on the short list to record.
  // Each one is said once at its moment (a new step, the first coin...), never on every touch.
  const INSTRUCT = new Set(['sort-color', 'sort-size', 'sort-size3', 'sort-food', 'sort-shape', 'sort-try', 'sort-done', 'pat-start', 'pat-next', 'feel-start', 'feel-how', 'feel-look', 'feel-s-present', 'feel-s-cake', 'feel-s-pal', 'feel-s-icecream', 'feel-s-balloon', 'feel-s-rain', 'feel-s-thunder', 'feel-s-dark', 'feel-s-tower', 'feel-s-splash', 'feel-s-jack', 'feel-s-party', 'feel-s-yawn', 'feel-s-bubbles', 'feel-s-rainbow', 'feel-s-spider', 'feel-s-grab', 'feel-why', 'feel/happy', 'feel/sad', 'feel/scared', 'feel/mad', 'feel/wow', 'feel/sleep', 'feel-help', 'feel-help-sleep', 'feel-joy', 'feel-breathe', 'feel-better', 'feel-fun', 'feel-night', 'shop-stars', 'shop-first', 'shop-worn', 'follow-bee', 'catch-drops', 'fire-pet', 'fire-next', 'band-song', 'puzzle-next', 'hide-gate', 'hide-locked', 'count-find', 'math-sum', 'math-left',
    'aq-coin', 'aq-boss', 'meteor-start', 'seed-in', 'pat-it', 'water-me', 'confirm-bye',
    'cook-pick', 'cook-roll', 'cook-cutsand', 'cook-oven-on', 'cook-squirt', 'cook-drop', 'cook-pour', 'cook-ding', 'cook-grill', 'cook-flip', 'cook-stack', 'cook-frost', 'cook-slice',
    'cook-pickbun', 'cook-pickbread', 'cook-patties', 'cook-meat', 'cook-cheese', 'cook-veg', 'cook-saucetop', 'cook-scoop', 'cook-pizzasauce', 'cook-pizzacheese', 'cook-toppings']);
  // "Extra audio help" (Grown-ups > Sound, off by default) also speaks all the other lines: the names of things touched, extra hints and cheers.
  const isExtra = k => k in LINES && !isCore(k) && !SPOKEN.test(k) && !INSTRUCT.has(k);
  // How the built-in voice should say a line when the written text comes out wrong. (A recording, or text a grown-up has edited, is never changed.)
  // A lone "Ay" is read like the word "eye" by phone voices; a capital letter on its own is read as the letter.
  const SAY_AS = { 'letter/a': 'A.', 'sound/x': 'kss' };
  const custom = {}; // dynamic lines, e.g. player names: key -> fallback text

  // Two built-in voice slots plus any extra voices the grown-ups add and name (grandparents, cousins, the child herself...).
  // Extra voices live in settings.voices = [{ id, name }]; their clips are stored like the others under "<id>/<line>".
  const BASE_SETS = [{ id: 'male', name: 'Male voice' }, { id: 'female', name: 'Female voice' }];
  const SETS = [...BASE_SETS];
  function syncSets() {
    const extra = (store.settings.voices || []).filter(v => v && v.id && v.name);
    SETS.length = 0; SETS.push(...BASE_SETS, ...extra.map(v => ({ id: v.id, name: v.name, extra: true })));
    for (const s of SETS) if (!deviceKeys[s.id]) deviceKeys[s.id] = new Set();
    return SETS;
  }

  const GROUPS = [
    { id: 'praise', title: 'Cheering', note: 'Said after something is done well. Turn down how often in the "Praise" setting.', test: k => PRAISE.has(k) },
    { id: 'prompts', title: 'Prompts and instructions', note: 'Short lines that tell {her} what to do.', test: k => k in LINES && !PRAISE.has(k) && !/^(letter|sound|word|creature|style|name|cook|cookr|cookc|clay|fish|num)\//.test(k) },
    { id: 'numbers', title: 'Numbers', note: 'Said when counting and adding: "One!", "Two!"... Say just the number. One to ten are on the short list; zero and eleven to twenty are optional.', test: k => k.startsWith('num/') },
    { id: 'names', title: 'Names in the name pickers', note: 'Said when a name button is touched (player nicknames and pet names) and in "Welcome home, ...".', test: k => k.startsWith('name/') },
    { id: 'style', title: 'Style Studio names', note: 'Only said when "Extra audio help" is on in Grown-ups. Said when a friend, a hairstyle or a piece of clothing is touched in the dress-up game, like "A ball gown!" or "Fairy wings!".', test: k => k.startsWith('style/') },
    { id: 'kitchen', title: 'Sprout Kitchen names', note: 'Only said when "Extra audio help" is on in Grown-ups. Said when an ingredient, a cutter shape, a recipe or a food group is touched in the cooking game: "Flour!", "Pink icing!", "A cheeseburger!".', test: k => /^(cook|cookr|cookc)\//.test(k) },
    { id: 'clay', title: 'Clay Corner names', note: 'Only said when "Extra audio help" is on in Grown-ups. Said when a clay tool, a cookie cutter, a stamp or an eye or bead is touched: "Squish!", "A heart!", "A googly eye!".', test: k => k.startsWith('clay/') },
    { id: 'fish', title: 'Fishing Pond fish names', note: 'Said by the built-in voice when a fish is caught in the fishing game, like "A bass!" or "A goldfish!". Optional.', test: k => k.startsWith('fish/') },
    { id: 'letters', title: 'Letter names (A to Z)', note: 'Say the name of the letter: "Bee", "Cee".', test: k => k.startsWith('letter/') },
    { id: 'sounds', title: 'Letter sounds (A to Z)', note: 'Say the sound the letter makes: "buh", "kuh", "sss". Not the name.', test: k => k.startsWith('sound/') },
    { id: 'words', title: 'Picture words', note: 'The word for each letter picture: apple, bear, cat...', test: k => k.startsWith('word/') },
    { id: 'friends', title: 'Garden friend announcements', note: 'Said when a new garden friend appears.', test: k => k.startsWith('creature/') },
    { id: 'critters', title: 'Critter noises (make the sound!)', note: 'Played when a garden friend is tapped. Just make the noise, like a bee buzz or a frog ribbit.', test: k => k.startsWith('critter/') },
    { id: 'purrs', title: 'Purring and happy sounds', note: 'Played while a pet is stroked in the close-up view in Pet Care (it loops while the pet is petted). If nothing is recorded the game makes a soft purr of its own. A few seconds of a real purr works best.', test: k => k.startsWith('purr/') },
    { id: 'players', title: 'Player names', note: 'Say each player\'s greeting, like "Hi Charlotte!".', test: k => k.startsWith('player/') || k.startsWith('pname/') }
  ];

  const base = key => key.replace(/\//g, '-');
  const fileFor = (set, key) => `audio/voice/${set}/${base(key)}.mp3`;
  // the short list to record (core + each player's greeting), and the optional rest
  const allKeys = () => [...CORE, ...Object.keys(custom).filter(k => /^(pname|player)\//.test(k))];
  const moreKeys = () => [...Object.keys(LINES).filter(k => !CORE_SET.has(k)), ...Object.keys(SOUNDS), ...Object.keys(custom).filter(k => !/^(pname|player)\//.test(k))];
  // The grown-ups can reword any line (settings.lineText); the reworded text is what the built-in voice says and what shows in the recorder.
  const textFor = key => (store.settings.lineText && store.settings.lineText[key]) || LINES[key] || SOUNDS[key] || custom[key] || key;
  const originalText = key => LINES[key] ?? SOUNDS[key] ?? custom[key] ?? key;

  /* ------------------------------------------------------------ stored clips */
  const deviceKeys = { male: new Set(), female: new Set() };   // more sets appear as extra voices are added (see syncSets)
  let manifest = null;
  let db = null;
  const buffers = new Map(); // "set/key" -> AudioBuffer | null
  // When each recording was made (kept beside the clips), so the cloud copy can tell which of two versions is newer.
  const STAMPS = 'spg.vstamps';
  const stamps = (() => { try { return JSON.parse(localStorage.getItem(STAMPS)) || {}; } catch (_) { return {}; } })();
  const keepStamps = () => { try { localStorage.setItem(STAMPS, JSON.stringify(stamps)); } catch (_) { /* ignore */ } };
  const changed = () => { try { SPG.sync && SPG.sync.voicesChanged && SPG.sync.voicesChanged(); } catch (_) { /* never break recording */ } };

  const idb = (mode, fn) => new Promise(resolve => {
    if (!db) return resolve(null);
    try {
      const tx = db.transaction('clips', mode), st = tx.objectStore('clips'), rq = fn(st);
      tx.oncomplete = () => resolve(rq ? rq.result : true); tx.onerror = tx.onabort = () => resolve(null);
    } catch (_) { resolve(null); }
  });
  const openDB = () => new Promise(resolve => {
    try {
      const rq = indexedDB.open('spg-voice', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('clips');
      rq.onsuccess = () => resolve(rq.result); rq.onerror = rq.onblocked = () => resolve(null);
    } catch (_) { resolve(null); }
  });

  const ready = (async () => {
    db = typeof indexedDB !== 'undefined' ? await openDB() : null;
    const keys = (await idb('readonly', st => st.getAllKeys())) || [];
    for (const id of keys) { const [set, ...rest] = String(id).split('/'); (deviceKeys[set] || (deviceKeys[set] = new Set())).add(rest.join('/')); }
    syncSets();
    try { const res = await fetch('audio/voice/manifest.json'); if (res.ok) manifest = await res.json(); } catch (_) { /* no file recordings */ }
  })();

  const fileAvail = (set, key) => !!(manifest && manifest[set] && manifest[set].includes(base(key)));
  const hasClip = (set, key) => !!(deviceKeys[set] && deviceKeys[set].has(key)) || fileAvail(set, key);
  const hasDeviceClip = (set, key) => !!(deviceKeys[set] && deviceKeys[set].has(key));

  // Trim silence, and level the clip so quiet phone recordings are as loud as clear ones.
  function analyse(buf) {
    const d = buf.getChannelData(0), n = d.length, sr = buf.sampleRate;
    let peak = 0; for (let i = 0; i < n; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
    const thr = Math.max(.012, peak * .05);
    let a = 0; while (a < n && Math.abs(d[a]) < thr) a++;
    let b = n - 1; while (b > a && Math.abs(d[b]) < thr) b--;
    const start = Math.max(0, a / sr - .06), end = Math.min(buf.duration, b / sr + .18);
    buf._trim = [start, Math.max(.05, end - start)];
    buf._gain = peak > 0 ? Math.min(4, .85 / peak) : 1;
    return buf;
  }
  const decode = async ab => analyse(await A.ctx.decodeAudioData(ab));

  async function loadBuffer(set, key) {
    const id = set + '/' + key;
    if (buffers.has(id)) return buffers.get(id);
    let buf = null;
    try {
      if (deviceKeys[set] && deviceKeys[set].has(key)) { const blob = await idb('readonly', st => st.get(id)); if (blob) buf = await decode(await blob.arrayBuffer()); }
      if (!buf && fileAvail(set, key)) { const res = await fetch(fileFor(set, key)); if (res.ok) buf = await decode(await res.arrayBuffer()); }
    } catch (_) { /* unreadable clip: fall back to speech */ }
    buffers.set(id, buf);
    return buf;
  }

  /* ------------------------------------------------------------ playback */
  let token = 0, current = null, voiceObj, voiceMode = '';
  // The built-in speaking voice (used for any line nobody has recorded). Phones and tablets list many voices; the plain
  // "compact" ones sound robotic, while network / enhanced / neural ones sound much more like a person. Online we prefer those;
  // offline only voices stored on the device can be used. A grown-up can also pick one by ear (Grown-ups > Voices).
  const voiceScore = (v, online) => {
    const n = `${v.name} ${v.voiceURI || ''}`;
    let s = 0;
    if (/^en[-_]US/i.test(v.lang)) s += 10; else if (/^en[-_](GB|AU|CA|IE|NZ|ZA|IN)/i.test(v.lang)) s += 5; else if (/^en/i.test(v.lang)) s += 2; else return -99;
    if (/neural|natural|enhanced|premium|wavenet|studio/i.test(n)) s += 9;
    if (/network|online/i.test(n)) s += online ? 8 : -99;
    if (v.localService === false && !online) s -= 99;
    if (/female|samantha|aria|jenny|ava|allison|nicky|karen|zira|susan|google us english|x-tpf|x-sfg|x-tpc|x-iob|x-iog/i.test(n)) s += 3;
    if (/compact|espeak|robot|novelty|bad news|whisper|bubbles|boing|zarvox|trinoids|albert|fred|junior/i.test(n)) s -= 12;
    return s;
  };
  // In the Android app the phone's own text-to-speech engine (usually Google's) is used through a plugin: an Android web view cannot
  // be relied on for the browser's speech. On the website the browser's speech is used.
  const nativeTTS = () => (SPG.native && SPG.native.isApp && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech) || null;
  let nativeVoices = [];
  (async () => { const T = nativeTTS(); if (!T) return; try { const r = await T.getSupportedVoices(); nativeVoices = (r.voices || []).map((v, i) => Object.assign({}, v, { idx: i })); voiceObj = undefined; } catch (_) { /* the default voice is used */ } })();
  const englishVoices = () => (nativeTTS() ? nativeVoices : ('speechSynthesis' in window ? speechSynthesis.getVoices() : [])).filter(v => /^en/i.test(v.lang));
  function pickVoice() {
    const online = navigator.onLine !== false, mode = (store.settings.ttsVoice || '') + (online ? '|on' : '|off');
    if (voiceObj !== undefined && voiceMode === mode) return voiceObj;
    const list = englishVoices(); if (!list.length) return null;
    voiceMode = mode;
    const chosen = store.settings.ttsVoice && list.find(v => (v.voiceURI || v.name) === store.settings.ttsVoice);
    voiceObj = chosen || list.map(v => [voiceScore(v, online), v]).filter(x => x[0] > -50).sort((p, q) => q[0] - p[0]).map(x => x[1])[0] || list[0] || null;
    return voiceObj;
  }
  if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => { voiceObj = undefined; });
  addEventListener('online', () => { voiceObj = undefined; }); addEventListener('offline', () => { voiceObj = undefined; });

  // while a line is spoken the music steps back, and at night the speaking voice is quieter too (like every other sound)
  const duck = on => { try { SPG.music && SPG.music.duck && SPG.music.duck(on); } catch (_) { /* no audio yet */ } };
  const speechVol = () => (SPG.night && SPG.night.on() ? .7 : 1);
  function speak(text) {
    if (text) duck(true);
    return speak1(text).then(() => duck(false));
  }
  function speak1(text) {
    const T = nativeTTS();
    if (T && text) return new Promise(resolve => {
      let done = false; const fin = () => { if (!done) { done = true; resolve(); } };
      const v = pickVoice();
      T.speak({ text, lang: (v && v.lang) || 'en-US', rate: settings().audioHelp ? .8 : .92, pitch: 1.0, volume: speechVol(), voice: v && v.idx != null ? v.idx : undefined, queueStrategy: 0 }).then(fin, fin);
      setTimeout(fin, 1500 + text.length * 140);
      current = { stop: () => { try { T.stop(); } catch (_) { /* ignore */ } fin(); } };
    });
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || !text) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = settings().audioHelp ? .78 : .9; u.pitch = 1.05; u.lang = 'en-US'; u.volume = speechVol();   // a lightly raised pitch only: a lot of it makes voices sound robotic
      const v = pickVoice(); if (v) u.voice = v;
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 1200 + text.length * 130);
      current = { stop: () => { speechSynthesis.cancel(); fin(); } };
      speechSynthesis.speak(u);
    });
  }

  function playBuffer(buf) {
    duck(true);
    return new Promise(resolve => {
      const src = A.ctx.createBufferSource(); src.buffer = buf;
      const g = A.ctx.createGain(); g.gain.value = buf._gain || 1;
      src.connect(g); g.connect(A.master); src.onended = resolve;
      current = { stop: () => { try { src.stop(); } catch (_) { /* already ended */ } resolve(); } };
      const [off, dur] = buf._trim || [0, undefined];
      src.start(0, off, dur);
      setTimeout(resolve, ((dur ?? buf.duration - off) + .6) * 1000);   // a suspended audio context never fires onended
    }).then(() => duck(false));
  }

  const settings = () => store.settings;
  function chooseSet(key) {
    const pref = settings().voicePref || 'mix';
    if (pref === 'builtin') return null;
    const off = settings().voiceOff || [];
    const order = pref === 'mix' ? syncSets().filter(s => !off.includes(s.id)).map(s => s.id) : [pref];
    const have = order.filter(s => hasClip(s, key));
    return have.length ? have[Math.floor(Math.random() * have.length)] : null;
  }
  function skip(key) {
    const s = settings();
    if ((s.muted || []).includes(key)) return true;
    if (PRAISE.has(key)) return Math.random() > ({ lots: 1, some: .5, off: 0 }[s.praise ?? 'some']);
    return false;
  }

  // live(): false once a newer line or stop() took over while this one was still loading
  async function playOne(item, live = () => true) {
    if (!settings().voice || !item || SPG.voice.hushed) return;
    if (typeof item !== 'string') return item.say ? speak(item.say) : undefined;
    if (skip(item)) return;
    if (isExtra(item) && !settings().audioHelp) return;   // only with Extra audio help
    await ready; if (!live()) return;
    const set = A.ctx ? chooseSet(item) : null;
    if (set) { const buf = await loadBuffer(set, item); if (!live()) return; if (buf) return playBuffer(buf); }
    if (item in SOUNDS) return; // sound-only: silent unless recorded
    const text = SAY_AS[item] && !(store.settings.lineText && store.settings.lineText[item]) ? SAY_AS[item] : textFor(item) === item ? (LINES[item] ?? custom[item]) : textFor(item);
    if (text) return speak(text);
  }

  /* ------------------------------------------------------------ recording (grown-ups) */
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(res => { rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })); }; });
    rec.start();
    return { stop: () => { if (rec.state !== 'inactive') rec.stop(); return done; }, cancel: () => { chunks.length = 0; if (rec.state !== 'inactive') rec.stop(); } };
  }

  async function saveClip(set, key, blob) {
    A.unlock();
    const buf = await decode(await blob.arrayBuffer()); // throws if the browser cannot read it
    if (!db) throw new Error('This browser cannot store recordings.');
    const ok = await idb('readwrite', st => st.put(blob, set + '/' + key));
    if (!ok) throw new Error('Could not save the recording.');
    (deviceKeys[set] || (deviceKeys[set] = new Set())).add(key); buffers.set(set + '/' + key, buf);
    stamps[set + '/' + key] = Date.now(); keepStamps(); changed();
    return buf;
  }
  async function deleteClip(set, key) {
    await idb('readwrite', st => st.delete(set + '/' + key));
    deviceKeys[set] && deviceKeys[set].delete(key); buffers.delete(set + '/' + key);
    delete stamps[set + '/' + key]; keepStamps();
    try { SPG.sync && SPG.sync.voiceClipGone && SPG.sync.voiceClipGone(set, key); } catch (_) { /* ignore */ }
  }
  async function previewClip(set, key) {
    A.unlock(); await ready;
    const buf = await loadBuffer(set, key);
    if (!buf) return false;
    current?.stop(); await playBuffer(buf); return true;
  }

  SPG.voice = {
    hushed: false, // true inside the Coloring Book: no spoken voices at all
    LINES, SOUNDS, PICK_NAMES, PHONICS, NAMES, WORDS, PRAISE, GROUPS, SETS, custom, ready,
    syncSets,
    // the built-in speaking voice, for the grown-ups' picker
    // The same voices sorted for a grown-up: women's and men's voices apart, the most natural first, robotic ones left out.
    ttsChoices() {
      const online = navigator.onLine !== false, seen = new Set(), out = { female: [], male: [], other: [] };
      const accent = l => (/^en[-_]GB/i.test(l) ? 'British' : /^en[-_]AU/i.test(l) ? 'Australian' : /^en[-_]IN/i.test(l) ? 'Indian' : /^en[-_]CA/i.test(l) ? 'Canadian' : /^en[-_]IE/i.test(l) ? 'Irish' : /^en[-_]ZA/i.test(l) ? 'South African' : /^en[-_]NZ/i.test(l) ? 'New Zealand' : 'American');
      const F = /female|woman|x-(iob|iog|sfg|tpc|tpf)\b|samantha|aria|jenny|ava\b|allison|nicky|karen|zira|susan|victoria|kate|serena|moira|tessa|fiona|emma|sonia|libby|natasha|michelle|joanna|salli|kendra|kimberly|ivy|amy|olivia|nova|shimmer|heather|catherine|hazel|jane|clara|leah|molly|ana\b/i;
      const M = /\bmale\b|\bman\b|x-(iol|iom|tpd)\b|aaron|daniel|alex\b|fred|tom\b|guy\b|davis|ryan|brian|matthew|joey|justin|kevin|arthur|james|george|oliver|thomas|mark\b|eric|christopher|roger|steffan|david|rishi|lee\b|gordon|nathan|liam|william|echo|onyx|fable/i;
      const rows = englishVoices().map(v => ({ v, sc: voiceScore(v, online), n: `${v.name} ${v.voiceURI || ''}` })).filter(x => x.sc > -50 && !/compact|espeak|robot|novelty|bad news|whisper|bubbles|boing|zarvox|trinoids|albert|fred|junior/i.test(x.n)).sort((a, b) => b.sc - a.sc);
      for (const x of rows) {
        const id = x.v.voiceURI || x.v.name, key = `${x.v.name}|${x.v.lang}`; if (seen.has(key)) continue; seen.add(key);
        const g = /female|woman/i.test(x.n) ? 'female' : F.test(x.n) && !/\bmale\b/i.test(x.n.replace(/female/ig, '')) ? 'female' : M.test(x.n) ? 'male' : 'other';
        const natural = /neural|natural|enhanced|premium|wavenet|studio|network|online/i.test(x.n) || x.v.localService === false;
        const code = /x-[a-z]{2,4}-?/i.test(x.v.name) || /^[a-z]{2}[-_][a-z]{2}\b/i.test(x.v.name);
        const bucket = out[g]; if (bucket.length >= 6) continue;
        const nameTxt = code ? `Voice ${bucket.length + 1}` : x.v.name.replace(/^(Microsoft|Google)\s+/i, '').replace(/\s+Online.*$/i, '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+-\s+.*$/, '').trim();
        bucket.push({ id, label: `${nameTxt} · ${accent(x.v.lang)}`, tag: natural ? (x.v.localService === false ? 'Most natural · needs internet' : 'Most natural') : 'Good', natural });
      }
      return out;
    },
    ttsVoices() { return englishVoices().map(v => ({ id: v.voiceURI || v.name, label: `${v.name} (${v.lang})${v.localService === false ? ' · needs internet' : ''}` })); },
    ttsChosen() { return store.settings.ttsVoice || ''; },
    setTtsVoice(id) { store.settings.ttsVoice = id || ''; voiceObj = undefined; store.save(); },
    ttsCurrentName() { const v = pickVoice(); return v ? v.name : ''; },
    hearTts() { return speak('Hello! Let’s play and learn together.'); },
    addVoice(name) {
      const list = store.settings.voices || (store.settings.voices = []);
      const id = 'v' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
      list.push({ id, name: String(name).trim().slice(0, 24) || 'New voice', t: Date.now() }); store.save(); syncSets(); changed(); return id;
    },
    renameVoice(id, name) { const v = (store.settings.voices || []).find(x => x.id === id); if (v) { v.name = String(name).trim().slice(0, 24) || v.name; v.t = Date.now(); store.save(); syncSets(); changed(); } },
    // Removes the voice and every clip recorded for it.
    async removeVoice(id) {
      const gone = [...(deviceKeys[id] || [])];
      (store.settings.voicesRemoved || (store.settings.voicesRemoved = [])).includes(id) || store.settings.voicesRemoved.push(id);   // so other devices let it go too
      for (const key of gone) { await idb('readwrite', st => st.delete(id + '/' + key)); delete stamps[id + '/' + key]; }
      keepStamps();
      deviceKeys[id] = new Set(); for (const k of [...buffers.keys()]) if (k.startsWith(id + '/')) buffers.delete(k);
      store.settings.voices = (store.settings.voices || []).filter(x => x.id !== id);
      store.settings.voiceOff = (store.settings.voiceOff || []).filter(x => x !== id);
      if (store.settings.voicePref === id) store.settings.voicePref = 'mix';
      store.save(); syncSets();
      try { SPG.sync && SPG.sync.voiceRemoved && SPG.sync.voiceRemoved(id, gone); } catch (_) { /* ignore */ }
    },
    // ---- what the cloud copy needs (see js/sync.js)
    async syncList() {   // every recording kept on this device: { set, key, stamp }
      await ready; const out = [];
      for (const [set, keys] of Object.entries(deviceKeys)) for (const key of keys) {
        const id = set + '/' + key; if (!stamps[id]) { stamps[id] = Date.now(); }   // recorded before stamps existed: counts from now
        out.push({ set, key, stamp: stamps[id] });
      }
      keepStamps(); return out;
    },
    async syncBlob(set, key) { await ready; return idb('readonly', st => st.get(set + '/' + key)); },
    stampOf: (set, key) => stamps[set + '/' + key] || 0,
    // Store a recording that came from the cloud copy. It is not decoded now: that happens when it is first played.
    async importClip(set, key, blob, stamp) {
      await ready; if (!db) return false;
      const ok = await idb('readwrite', st => st.put(blob, set + '/' + key)); if (!ok) return false;
      (deviceKeys[set] || (deviceKeys[set] = new Set())).add(key); buffers.delete(set + '/' + key);
      stamps[set + '/' + key] = stamp; keepStamps(); return true;
    },
    // The list of named voices and the ones that were deleted, for the cloud copy.
    voiceList() {
      const list = store.settings.voices || []; for (const v of list) if (!v.t) v.t = Date.now();
      return { voices: list.map(v => ({ id: v.id, name: v.name, t: v.t })), removed: store.settings.voicesRemoved || [] };
    },
    // Merge a list that came from the cloud copy: new voices appear, the newer name wins, deleted voices go.
    async adoptVoiceList(remote) {
      let changedAny = false; const list = store.settings.voices || (store.settings.voices = []);
      const removed = new Set([...(store.settings.voicesRemoved || []), ...((remote && remote.removed) || [])]);
      store.settings.voicesRemoved = [...removed];
      for (const rv of (remote && remote.voices) || []) {
        if (!rv || !rv.id || !rv.name || removed.has(rv.id)) continue;
        const mine = list.find(v => v.id === rv.id);
        if (mine) { if ((rv.t || 0) > (mine.t || 0) && mine.name !== rv.name) { mine.name = String(rv.name).slice(0, 24); mine.t = rv.t; changedAny = true; } continue; }
        // the same person set up on two devices: an empty local voice with the same name just becomes the cloud one
        const twin = list.find(v => v.name.toLowerCase() === String(rv.name).toLowerCase() && !(deviceKeys[v.id] && deviceKeys[v.id].size) && !(remote.voices || []).some(o => o.id === v.id));
        if (twin) { list.splice(list.indexOf(twin), 1); }
        list.push({ id: rv.id, name: String(rv.name).slice(0, 24), t: rv.t || Date.now() }); changedAny = true;
      }
      for (const id of removed) if (list.some(v => v.id === id)) { await SPG.voice.removeVoice(id); changedAny = true; }
      if (changedAny) { store.save(); syncSets(); }
      return changedAny;
    },
    originalText, isExtra,
    spokenFor: key => (SAY_AS[key] && !(store.settings.lineText && store.settings.lineText[key]) ? SAY_AS[key] : textFor(key)),
    setText(key, text) {
      const t = String(text || '').trim().slice(0, 120), map = store.settings.lineText || (store.settings.lineText = {});
      if (!t || t === originalText(key)) delete map[key]; else map[key] = t;
      store.save();
    },
    isReworded: key => !!(store.settings.lineText && store.settings.lineText[key]),
    fileFor, allKeys, moreKeys, isCore, textFor, hasClip, hasDeviceClip,
    groupOf: key => GROUPS.find(g => g.test(key)),
    // Say a line, or a list of lines one after another. Items are keys, {say: 'free text'}, or null.
    async say(...items) {
      const list = items.flat();
      const my = ++token;
      current?.stop();
      for (const it of list) {
        if (my !== token) return;
        await playOne(it, () => my === token);
      }
    },
    // Play a critter noise if one is recorded, otherwise the spoken announcement.
    async sound(soundKey, fallbackKey) {
      await ready;
      if (A.ctx && !skip(soundKey) && chooseSet(soundKey)) return SPG.voice.say(soundKey);
      return fallbackKey ? SPG.voice.say(fallbackKey) : undefined;
    },
    // Quietly play a recorded critter noise if there is one. Never interrupts speech. Resolves to its length in seconds (0 = none).
    async ambient(key, gain = .2) {
      if (!settings().voice || SPG.voice.hushed || skip(key) || !A.ctx) return 0;
      await ready;
      const set = chooseSet(key); if (!set) return 0;
      const buf = await loadBuffer(set, key); if (!buf) return 0;
      const src = A.ctx.createBufferSource(); src.buffer = buf;
      const g = A.ctx.createGain(); g.gain.value = (buf._gain || 1) * gain;
      src.connect(g); g.connect(A.master);
      const [off, dur] = buf._trim || [0, undefined]; src.start(0, off, dur);
      return dur || buf.duration;
    },
    stop() { token++; current?.stop(); },
    praise() { const k = [...PRAISE]; return SPG.voice.say(k[Math.floor(Math.random() * k.length)]); },
    startRecording, saveClip, deleteClip, previewClip
  };
})();
