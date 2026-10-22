# Recording your own voice

The games speak every line with the tablet's built-in voice until you record your own. You can record a
**male** and a **female** voice; the games mix them (or use just one, your choice).

## Easiest way: record on the tablet
1. Open **Grown-ups** (lock icon), answer the sum, then **Voices > Record and choose voices**.
2. Pick **Male voice** or **Female voice** (whoever is recording).
3. Open a group, tap **Record**, say the line, tap **Stop**. Tap **Hear** to check it.
4. Every line has its own switch: turn off any line you don't want the games to say.
5. Set how often the games cheer ("Every time", "Sometimes", "Never").

Recordings are saved on that tablet. Anything you skip keeps using the built-in voice.
Quiet recordings are levelled and silence is trimmed automatically.

## Or: drop in files
Save MP3s as `audio/voice/male/<file>.mp3` and/or `audio/voice/female/<file>.mp3` using the names below, then run
`node tools/build-voice-manifest.mjs` and deploy. (File recordings work on every device; tablet recordings only on that tablet.)

## What to record: the short list (100 lines)
You only need the **100 lines in Part 1**: the cheers, every letter name and sound, the numbers 1 to 10, and one short instruction for
each game. Everything in Part 2 is optional: those lines are said by the built-in voice, and most of them are only said when
**Extra audio help** is turned on in Grown-ups.

# Part 1: the short list (100 lines)

## Cheering (5)

Said after something is done well. Turn down how often in the "Praise" setting.

| File | Say |
|---|---|
| `great-job.mp3` | Great job! |
| `wow.mp3` | Wow! |
| `you-did-it.mp3` | You did it! |
| `amazing.mp3` | Amazing! |
| `yay.mp3` | Yay! |

## Prompts and instructions (33)

Short lines that tell {her} what to do.

| File | Say |
|---|---|
| `welcome.mp3` | Hi! Let's play! |
| `try-again.mp3` | Try again! |
| `break-time.mp3` | Time for a little rest! |
| `find.mp3` | Can you find the letter |
| `is-for.mp3` | is for |
| `starts-with.mp3` | Which one starts with |
| `write-name.mp3` | Let's write your name! |
| `count-touch.mp3` | Touch each one to count! |
| `count-how.mp3` | How many are there? |
| `math-plus.mp3` | plus |
| `math-minus.mp3` | take away |
| `math-is.mp3` | is |
| `fire-start.mp3` | Some little fires! Spray them with water! |
| `band-start.mp3` | Touch the friends to make music! |
| `band-copy.mp3` | Listen... now you play! |
| `shapes-start.mp3` | Build the picture! Put each shape in its hole! |
| `puzzle-start.mp3` | Put the picture together! |
| `care-start.mp3` | Take care of your friend! |
| `care-sleep.mp3` | Shhh... sleepy time. |
| `hide-start.mp3` | Who is hiding? Walk along the trail and look! |
| `hide-found.mp3` | Found you! Come along! |
| `dig-first.mp3` | First, dig a hole with the shovel! |
| `pour-water.mp3` | Hold the can over the plant to water it! |
| `aq-start.mp3` | Touch the water to feed the fish! |
| `cook-add.mp3` | Put it in the bowl! |
| `cook-stir.mp3` | Stir, stir, stir! |
| `cook-cut.mp3` | Pick a cutter, then touch the dough! |
| `cook-bake.mp3` | Into the oven! Touch the tray! |
| `cook-decorate.mp3` | Make it pretty! |
| `cook-serve.mp3` | Yummy! Touch it to take a bite! |
| `clay-start.mp3` | Squish, roll and shape your clay! |
| `fish-start.mp3` | Tap the fishing rod, then tap a spot! |
| `fish-bite.mp3` | A bite! Tap to reel it in! |

## Numbers (10)

Said when counting and adding: "One!", "Two!"... Say just the number. One to ten are on the short list; zero and eleven to twenty are optional.

| File | Say |
|---|---|
| `num-1.mp3` | One! |
| `num-2.mp3` | Two! |
| `num-3.mp3` | Three! |
| `num-4.mp3` | Four! |
| `num-5.mp3` | Five! |
| `num-6.mp3` | Six! |
| `num-7.mp3` | Seven! |
| `num-8.mp3` | Eight! |
| `num-9.mp3` | Nine! |
| `num-10.mp3` | Ten! |

## Letter names (A to Z) (26)

Say the name of the letter: "Bee", "Cee".

| File | Say |
|---|---|
| `letter-a.mp3` | Ay |
| `letter-b.mp3` | Bee |
| `letter-c.mp3` | Cee |
| `letter-d.mp3` | Dee |
| `letter-e.mp3` | Ee |
| `letter-f.mp3` | Eff |
| `letter-g.mp3` | Gee |
| `letter-h.mp3` | Aitch |
| `letter-i.mp3` | Eye |
| `letter-j.mp3` | Jay |
| `letter-k.mp3` | Kay |
| `letter-l.mp3` | El |
| `letter-m.mp3` | Em |
| `letter-n.mp3` | En |
| `letter-o.mp3` | Oh |
| `letter-p.mp3` | Pee |
| `letter-q.mp3` | Cue |
| `letter-r.mp3` | Ar |
| `letter-s.mp3` | Ess |
| `letter-t.mp3` | Tee |
| `letter-u.mp3` | You |
| `letter-v.mp3` | Vee |
| `letter-w.mp3` | Double you |
| `letter-x.mp3` | Ex |
| `letter-y.mp3` | Why |
| `letter-z.mp3` | Zee |

## Letter sounds (A to Z) (26)

Say the sound the letter makes: "buh", "kuh", "sss". Not the name.

| File | Say |
|---|---|
| `sound-a.mp3` | ah |
| `sound-b.mp3` | buh |
| `sound-c.mp3` | kuh |
| `sound-d.mp3` | duh |
| `sound-e.mp3` | eh |
| `sound-f.mp3` | fuh |
| `sound-g.mp3` | guh |
| `sound-h.mp3` | huh |
| `sound-i.mp3` | ih |
| `sound-j.mp3` | juh |
| `sound-k.mp3` | kuh |
| `sound-l.mp3` | luh |
| `sound-m.mp3` | muh |
| `sound-n.mp3` | nuh |
| `sound-o.mp3` | aw |
| `sound-p.mp3` | puh |
| `sound-q.mp3` | kwuh |
| `sound-r.mp3` | ruh |
| `sound-s.mp3` | sss |
| `sound-t.mp3` | tuh |
| `sound-u.mp3` | uh |
| `sound-v.mp3` | vuh |
| `sound-w.mp3` | wuh |
| `sound-x.mp3` | ks |
| `sound-y.mp3` | yuh |
| `sound-z.mp3` | zzz |

# Part 2: optional lines (562, nobody has to record these)

## Prompts and instructions (121)

Short lines that tell {her} what to do.

| File | Say |
|---|---|
| `follow-bee.mp3` | Follow the bee! |
| `spell-name.mp3` | Your name is spelled |
| `catch-drops.mp3` | Catch the raindrops! |
| `rainbow.mp3` | A rainbow! |
| `fire-pet.mp3` | Tap the pet to help them down! |
| `fire-done.mp3` | Everyone is safe! Hooray! |
| `band-song.mp3` | Play some notes, then touch the red button! |
| `shapes-done.mp3` | You built it! |
| `shapes-wrong.mp3` | Try another one! |
| `puzzle-done.mp3` | You made the picture! |
| `puzzle-next.mp3` | Tap the green arrow for another puzzle! |
| `care-food.mp3` | Yum! Thank you! |
| `care-clean.mp3` | So fresh and clean! |
| `care-hungry.mp3` | Your friend is hungry! |
| `care-dirty.mp3` | Your friend needs a bath! |
| `care-tired.mp3` | Your friend is sleepy! |
| `hide-done.mp3` | You found everybody! |
| `hide-gate.mp3` | You found everyone here! Follow the glowing trail to the next place! |
| `hide-locked.mp3` | Find all your friends first! |
| `hide-new.mp3` | A new place to explore! |
| `hide-home.mp3` | What a wonderful adventure! Everyone is home! |
| `cook-pick.mp3` | What shall we cook today? |
| `cook-start.mp3` | Let's cook! Follow the chef! |
| `cook-roll.mp3` | Roll the dough flat! |
| `cook-cutsand.mp3` | Pick a cutter, then touch the sandwich! |
| `cook-oven-on.mp3` | First, turn the oven on! Touch it! |
| `cook-squirt.mp3` | Squeeze the sauce anywhere you like! |
| `cook-drop.mp3` | Put some dough on the tray! |
| `cook-pour.mp3` | Pour the batter in! |
| `cook-ding.mp3` | It's ready! Touch the oven! |
| `cook-grill.mp3` | Put it on the grill! |
| `cook-flip.mp3` | Flip it over! |
| `cook-stack.mp3` | Stack it up! Pick the glowing one! |
| `cook-frost.mp3` | Touch the cake with icing! |
| `cook-slice.mp3` | Slice it with the knife! |
| `cook-pickbun.mp3` | Pick a bun! |
| `cook-pickbread.mp3` | Pick your bread! |
| `cook-patties.mp3` | Put patties on the grill! One, two or three! |
| `cook-meat.mp3` | Add the meat you like! |
| `cook-cheese.mp3` | Add some cheese, or touch the green check! |
| `cook-veg.mp3` | Add the veggies you like! |
| `cook-saucetop.mp3` | Add some sauce, then put the top on! |
| `cook-scoop.mp3` | Pick your ice cream! |
| `cook-pizzasauce.mp3` | Spread the sauce all over! |
| `cook-pizzacheese.mp3` | Sprinkle on the cheese! |
| `cook-toppings.mp3` | Put your toppings anywhere you like! |
| `cook-yum.mp3` | Yum yum! |
| `cook-wrong.mp3` | Try the glowing one! |
| `cook-done.mp3` | You cooked it! Delicious! |
| `count-find.mp3` | Touch the number! |
| `math-sum.mp3` | How many altogether? |
| `math-left.mp3` | How many are left? |
| `math-more.mp3` | One more makes |
| `math-start.mp3` | Let's add and take away! |
| `count-start.mp3` | Let's count! |
| `color-red.mp3` | Red! |
| `color-blue.mp3` | Blue! |
| `color-yellow.mp3` | Yellow! |
| `color-green.mp3` | Green! |
| `shape-circle.mp3` | Circle! |
| `shape-square.mp3` | Square! |
| `shape-triangle.mp3` | Triangle! |
| `shape-star.mp3` | Star! |
| `shape-rectangle.mp3` | Rectangle! |
| `shape-oval.mp3` | Oval! |
| `shape-semicircle.mp3` | Half circle! |
| `shape-trapezoid.mp3` | Trapezoid! |
| `shape-diamond.mp3` | Diamond! |
| `color-orange.mp3` | Orange! |
| `color-purple.mp3` | Purple! |
| `color-pink.mp3` | Pink! |
| `color-brown.mp3` | Brown! |
| `color-gray.mp3` | Gray! |
| `color-white.mp3` | White! |
| `aq-fresh.mp3` | A fresh new fish tank! Here are some coins to buy new fish! |
| `aq-coin.mp3` | A shiny coin! Touch it! |
| `aq-grow.mp3` | Your fish is growing! |
| `aq-shop.mp3` | Spend your coins! |
| `aq-boss.mp3` | A grumpy visitor! Tap it with bubbles! |
| `aq-boss-done.mp3` | You made a new friend! Hooray! |
| `aq-guppy.mp3` | A little guppy |
| `aq-clown.mp3` | A clownfish |
| `aq-angel.mp3` | An angelfish |
| `aq-puffer.mp3` | A pufferfish |
| `aq-food.mp3` | Better fish food |
| `aq-more.mp3` | More fish food |
| `aq-snail.mp3` | A helper snail |
| `aq-power.mp3` | Bubble power |
| `aq-castle.mp3` | A castle |
| `aq-chest.mp3` | A treasure chest |
| `aq-weed.mp3` | Seaweed |
| `aq-shell.mp3` | A big shell |
| `care-morning.mp3` | Good morning! |
| `room-home.mp3` | A cozy home! |
| `room-castle.mp3` | A castle! |
| `room-halloween.mp3` | A spooky house! |
| `room-christmas.mp3` | A Christmas house! |
| `room-dino.mp3` | Dinosaur land! |
| `room-space.mp3` | Outer space! |
| `room-beach.mp3` | A seaside house! |
| `fire-level.mp3` | A new place to help! |
| `fire-next.mp3` | Tap the green arrow to go somewhere new! |
| `meteor-start.mp3` | Shooting stars! Catch them in your bucket! |
| `meteor-done.mp3` | You kept all the dinosaurs safe! Hooray! |
| `storm-coming.mp3` | Here comes a big rainy storm! |
| `storm-over.mp3` | The storm is over. Look, the sun! |
| `raining-pets.mp3` | It's raining cats and dogs! |
| `pets-safe.mp3` | You saved them all! |
| `dig-one.mp3` | Dig! One! |
| `dig-two.mp3` | Two! |
| `dig-three.mp3` | Three! A perfect hole! |
| `pat-it.mp3` | Now pat the dirt down! |
| `bye-bye.mp3` | Bye bye, friend! Have fun! |
| `seed-in.mp3` | Now drop in a seed! |
| `water-me.mp3` | Tap the plant to water it! |
| `new-friend.mp3` | A new friend! |
| `new-seeds.mp3` | New seeds to plant! |
| `bigger-garden.mp3` | Your garden got bigger! |
| `confirm-bye.mp3` | Do you want to say bye-bye? Tap the soft pink button to say bye-bye, or the green one to stay. |
| `hello.mp3` | Hello! |
| `welcome-home.mp3` | Welcome home, |

## Numbers (11)

Said when counting and adding: "One!", "Two!"... Say just the number. One to ten are on the short list; zero and eleven to twenty are optional.

| File | Say |
|---|---|
| `num-0.mp3` | Zero! |
| `num-11.mp3` | Eleven! |
| `num-12.mp3` | Twelve! |
| `num-13.mp3` | Thirteen! |
| `num-14.mp3` | Fourteen! |
| `num-15.mp3` | Fifteen! |
| `num-16.mp3` | Sixteen! |
| `num-17.mp3` | Seventeen! |
| `num-18.mp3` | Eighteen! |
| `num-19.mp3` | Nineteen! |
| `num-20.mp3` | Twenty! |

## Names in the name pickers (42)

Said when a name button is touched (player nicknames and pet names) and in "Welcome home, ...".

| File | Say |
|---|---|
| `name-Sunny.mp3` | Sunny |
| `name-Bunny.mp3` | Bunny |
| `name-Sprout.mp3` | Sprout |
| `name-Star.mp3` | Star |
| `name-Peanut.mp3` | Peanut |
| `name-Buttercup.mp3` | Buttercup |
| `name-Pumpkin.mp3` | Pumpkin |
| `name-Ladybug.mp3` | Ladybug |
| `name-Honey.mp3` | Honey |
| `name-Dot.mp3` | Dot |
| `name-Bee.mp3` | Bee |
| `name-Twinkle.mp3` | Twinkle |
| `name-Biscuit.mp3` | Biscuit |
| `name-Pip.mp3` | Pip |
| `name-Mochi.mp3` | Mochi |
| `name-Nugget.mp3` | Nugget |
| `name-Clover.mp3` | Clover |
| `name-Peaches.mp3` | Peaches |
| `name-Maple.mp3` | Maple |
| `name-Button.mp3` | Button |
| `name-Pebble.mp3` | Pebble |
| `name-Waffles.mp3` | Waffles |
| `name-Poppy.mp3` | Poppy |
| `name-Cocoa.mp3` | Cocoa |
| `name-Daisy.mp3` | Daisy |
| `name-Muffin.mp3` | Muffin |
| `name-Rex.mp3` | Rex |
| `name-Spike.mp3` | Spike |
| `name-Stompy.mp3` | Stompy |
| `name-Dino.mp3` | Dino |
| `name-Waddles.mp3` | Waddles |
| `name-Nibbles.mp3` | Nibbles |
| `name-Whiskers.mp3` | Whiskers |
| `name-Snowball.mp3` | Snowball |
| `name-Ginger.mp3` | Ginger |
| `name-Bubbles.mp3` | Bubbles |
| `name-Oreo.mp3` | Oreo |
| `name-Pepper.mp3` | Pepper |
| `name-Fluffy.mp3` | Fluffy |
| `name-Sparkle.mp3` | Sparkle |
| `name-Bean.mp3` | Bean |
| `name-Noodle.mp3` | Noodle |

## Style Studio names (168)

Only said when "Extra audio help" is on in Grown-ups. Said when a friend, a hairstyle or a piece of clothing is touched in the dress-up game, like "A ball gown!" or "Fairy wings!".

| File | Say |
|---|---|
| `style-tab-who.mp3` | Pick a friend! |
| `style-tab-hair.mp3` | Hair salon! |
| `style-tab-makeup.mp3` | Make-up! |
| `style-tab-dress.mp3` | Princess dresses! |
| `style-tab-top.mp3` | Tops! |
| `style-tab-bottom.mp3` | Skirts and pants! |
| `style-tab-shoes.mp3` | Shoes! |
| `style-tab-hat.mp3` | Crowns and hats! |
| `style-tab-extras.mp3` | Sparkly extras! |
| `style-tab-nails.mp3` | Nail salon! |
| `style-tab-places.mp3` | Places to go! |
| `style-who-0.mp3` | Poppy |
| `style-who-1.mp3` | Maya |
| `style-who-2.mp3` | Zoe |
| `style-who-3.mp3` | Ivy |
| `style-who-4.mp3` | Leo |
| `style-who-5.mp3` | Sam |
| `style-who-6.mp3` | Kai |
| `style-who-7.mp3` | Theo |
| `style-hair-long.mp3` | Long hair |
| `style-hair-wavy.mp3` | Wavy hair |
| `style-hair-ponytail.mp3` | A ponytail |
| `style-hair-pigtails.mp3` | Pigtails |
| `style-hair-buns.mp3` | Two buns |
| `style-hair-braid.mp3` | A braid |
| `style-hair-bob.mp3` | A bob |
| `style-hair-short.mp3` | Short hair |
| `style-hair-spiky.mp3` | Spiky hair |
| `style-hair-curly.mp3` | Curly hair |
| `style-hair-topknot.mp3` | A top knot |
| `style-hair-none.mp3` | No hair |
| `style-tool-comb.mp3` | A comb! |
| `style-tool-scissors.mp3` | Scissors! Snip snip! |
| `style-hair-salon.mp3` | The hair salon! Fix the messy hair! |
| `style-hair-mine.mp3` | Your own hairstyle! |
| `style-tool-dryer.mp3` | A hair dryer! |
| `style-tool-spray.mp3` | Sparkle spray! |
| `style-tool-bubbles.mp3` | Bubbles! Wash the hair! |
| `style-dress-ball.mp3` | A ball gown! |
| `style-dress-aline.mp3` | A party dress! |
| `style-dress-tutu.mp3` | A ballet tutu! |
| `style-dress-mermaid.mp3` | A mermaid gown! |
| `style-dress-petal.mp3` | A flower fairy dress! |
| `style-dress-sun.mp3` | A sundress! |
| `style-top-tee.mp3` | A t-shirt |
| `style-top-tank.mp3` | A tank top |
| `style-top-stripes.mp3` | A stripy shirt |
| `style-top-hoodie.mp3` | A hoodie |
| `style-top-sweater.mp3` | A cozy sweater |
| `style-top-star.mp3` | A star shirt |
| `style-top-vest.mp3` | A fancy vest |
| `style-bottom-skirt.mp3` | A skirt |
| `style-bottom-shorts.mp3` | Shorts |
| `style-bottom-jeans.mp3` | Jeans |
| `style-bottom-leggings.mp3` | Leggings |
| `style-bottom-tutuskirt.mp3` | A tutu skirt |
| `style-shoes-sneakers.mp3` | Sneakers |
| `style-shoes-boots.mp3` | Boots |
| `style-shoes-sandals.mp3` | Sandals |
| `style-shoes-glass.mp3` | Glass slippers! |
| `style-shoes-flats.mp3` | Ballet shoes |
| `style-hat-crown.mp3` | A crown! |
| `style-hat-tiara.mp3` | A tiara! |
| `style-hat-bow.mp3` | A big bow |
| `style-hat-flowers.mp3` | A flower crown |
| `style-hat-cap.mp3` | A cap |
| `style-hat-beanie.mp3` | A woolly hat |
| `style-hat-party.mp3` | A party hat! |
| `style-hat-cowboy.mp3` | A cowboy hat |
| `style-hat-wizard.mp3` | A wizard hat! |
| `style-hat-bunny.mp3` | Bunny ears! |
| `style-hat-kitty.mp3` | Kitty ears! |
| `style-hat-princess.mp3` | A princess hat! |
| `style-face-glasses.mp3` | Glasses |
| `style-face-hearts.mp3` | Heart glasses! |
| `style-face-stars.mp3` | Star glasses! |
| `style-face-mask.mp3` | A fancy mask |
| `style-face-stache.mp3` | A silly mustache! |
| `style-neck-pearls.mp3` | Pearls |
| `style-neck-heart.mp3` | A heart necklace |
| `style-neck-star.mp3` | A star necklace |
| `style-neck-scarf.mp3` | A scarf |
| `style-neck-bowtie.mp3` | A bow tie |
| `style-back-cape.mp3` | A cape! |
| `style-back-fairy.mp3` | Fairy wings! |
| `style-back-butterfly.mp3` | Butterfly wings! |
| `style-back-angel.mp3` | Angel wings! |
| `style-back-pack.mp3` | A backpack |
| `style-hand-wand.mp3` | A magic wand! |
| `style-hand-flower.mp3` | Flowers |
| `style-hand-balloon.mp3` | A balloon! |
| `style-hand-purse.mp3` | A purse |
| `style-hand-teddy.mp3` | A teddy bear |
| `style-hand-lolly.mp3` | A lollipop! |
| `style-hair-pixie.mp3` | A pixie cut |
| `style-hair-afro.mp3` | A big afro |
| `style-hair-halfup.mp3` | Half up, half down |
| `style-hair-twinbraids.mp3` | Two braids |
| `style-hair-mohawk.mp3` | A mohawk! |
| `style-hair-bowl.mp3` | A bowl cut |
| `style-hair-longcurly.mp3` | Long curls |
| `style-hair-sidepony.mp3` | A side ponytail |
| `style-hair-locs.mp3` | Long locs |
| `style-hair-crownbraid.mp3` | A crown braid |
| `style-dress-royal.mp3` | A royal gown! |
| `style-dress-skater.mp3` | A twirly dress! |
| `style-dress-tiers.mp3` | A ruffle dress |
| `style-dress-pinafore.mp3` | A pinafore |
| `style-dress-snow.mp3` | An ice queen gown! |
| `style-top-polo.mp3` | A polo shirt |
| `style-top-jersey.mp3` | A sports shirt |
| `style-top-flannel.mp3` | A checked shirt |
| `style-top-cardigan.mp3` | A cardigan |
| `style-top-puffer.mp3` | A puffy jacket |
| `style-top-blazer.mp3` | A blazer |
| `style-top-hearttee.mp3` | A heart shirt |
| `style-bottom-capris.mp3` | Capri pants |
| `style-bottom-cargo.mp3` | Pocket pants |
| `style-bottom-joggers.mp3` | Joggers |
| `style-bottom-longskirt.mp3` | A long skirt |
| `style-bottom-plaid.mp3` | A checked skirt |
| `style-shoes-rainboots.mp3` | Rain boots |
| `style-shoes-heels.mp3` | Princess heels! |
| `style-shoes-fuzzy.mp3` | Fuzzy slippers |
| `style-shoes-skates.mp3` | Roller skates! |
| `style-hat-sun.mp3` | A sun hat |
| `style-hat-beret.mp3` | A beret |
| `style-hat-santa.mp3` | A Santa hat! |
| `style-hat-pirate.mp3` | A pirate hat! |
| `style-hat-chef.mp3` | A chef hat |
| `style-hat-halo.mp3` | A halo |
| `style-hat-ribbon.mp3` | A ribbon headband |
| `style-face-shades.mp3` | Sunglasses |
| `style-face-clown.mp3` | A red nose! |
| `style-face-whiskers.mp3` | Kitty whiskers! |
| `style-face-patch.mp3` | A pirate patch |
| `style-neck-lei.mp3` | A flower necklace |
| `style-neck-choker.mp3` | A choker |
| `style-neck-tie.mp3` | A necktie |
| `style-neck-medal.mp3` | A gold medal! |
| `style-back-bat.mp3` | Bat wings! |
| `style-back-dragon.mp3` | Dragon wings! |
| `style-back-rainbow.mp3` | Rainbow wings! |
| `style-hand-umbrella.mp3` | An umbrella |
| `style-hand-icecream.mp3` | Ice cream! |
| `style-hand-mirror.mp3` | A hand mirror |
| `style-hand-plush.mp3` | A bunny toy |
| `style-hand-starballoon.mp3` | A star balloon! |
| `style-place-0.mp3` | The castle ballroom |
| `style-place-1.mp3` | The garden |
| `style-place-2.mp3` | The beach |
| `style-place-3.mp3` | The salon |
| `style-place-4.mp3` | Under the stars |
| `style-place-5.mp3` | The rainbow meadow |
| `style-say-start.mp3` | Let's get dressed up! |
| `style-say-show.mp3` | Ta-da! Look at you! You look amazing! |
| `style-say-nails.mp3` | Pick a color and touch the nails! |
| `style-say-hair.mp3` | Touch the hair! |
| `style-say-lips.mp3` | Lipstick! |
| `style-say-shadow.mp3` | Sparkly eyes! |
| `style-say-blush.mp3` | Rosy cheeks! |
| `style-say-freckles.mp3` | Freckles! |
| `style-say-gems.mp3` | Face jewels! |
| `style-say-skin.mp3` | Skin color |
| `style-say-eyes.mp3` | Eye color |
| `style-say-glitter.mp3` | Glitter! |
| `style-say-all.mp3` | All the nails! |
| `style-say-clear.mp3` | Clean nails. |

## Sprout Kitchen names (115)

Only said when "Extra audio help" is on in Grown-ups. Said when an ingredient, a cutter shape, a recipe or a food group is touched in the cooking game: "Flour!", "Pink icing!", "A cheeseburger!".

| File | Say |
|---|---|
| `cookc-0.mp3` | Sweets! |
| `cookc-1.mp3` | Sandwiches! |
| `cookc-2.mp3` | Burgers, hot dogs and pizza! |
| `cookr-sugar.mp3` | Sugar cookies! |
| `cookr-chip.mp3` | Chocolate chip cookies! |
| `cookr-cupcake.mp3` | Cupcakes! |
| `cookr-cake.mp3` | A birthday cake! |
| `cookr-pancake.mp3` | Pancakes! |
| `cookr-sundae.mp3` | An ice cream sundae! |
| `cookr-pbj.mp3` | Peanut butter and jelly! |
| `cookr-toastie.mp3` | A cheese toastie! |
| `cookr-sandwich.mp3` | Build a sandwich! |
| `cookr-hotdog.mp3` | A hot dog! |
| `cookr-burger.mp3` | Build a burger! |
| `cookr-pizza.mp3` | Pizza! |
| `cook-flour.mp3` | Flour! |
| `cook-sugar.mp3` | Sugar! |
| `cook-egg.mp3` | An egg! |
| `cook-butter.mp3` | Butter! |
| `cook-milk.mp3` | Milk! |
| `cook-chips.mp3` | Chocolate chips! |
| `cook-cheese.mp3` | Cheese! |
| `cook-lettuce.mp3` | Lettuce! |
| `cook-tomato.mp3` | Tomato! |
| `cook-onion.mp3` | Onion! |
| `cook-pickle.mp3` | Pickle! |
| `cook-cucumber.mp3` | Cucumber! |
| `cook-avocado.mp3` | Avocado! |
| `cook-carrot.mp3` | Carrot! |
| `cook-ham.mp3` | Ham! |
| `cook-turkey.mp3` | Turkey! |
| `cook-patty.mp3` | A burger patty! |
| `cook-beanpatty.mp3` | A veggie patty! |
| `cook-chicken.mp3` | A chicken patty! |
| `cook-bunB.mp3` | The bottom bun! |
| `cook-bunT.mp3` | The top bun! |
| `cook-bread.mp3` | Bread! |
| `cook-hotbun.mp3` | A hot dog bun! |
| `cook-sausage.mp3` | A sausage! |
| `cook-pancake.mp3` | Pancake! |
| `cook-toast.mp3` | Toast! |
| `cook-butterpat.mp3` | A pat of butter! |
| `cook-batter.mp3` | Batter! |
| `cook-hotbunBack.mp3` | A hot dog bun! |
| `cook-bunny.mp3` | Bunny! |
| `cook-bear.mp3` | Bear! |
| `cook-cat.mp3` | Kitty! |
| `cook-fox.mp3` | Fox! |
| `cook-frog.mp3` | Frog! |
| `cook-panda.mp3` | Panda! |
| `cook-dino.mp3` | Dinosaur! |
| `cook-unicorn.mp3` | Unicorn! |
| `cook-flower.mp3` | Flower! |
| `cook-heart.mp3` | Heart! |
| `cook-ketchup.mp3` | Ketchup! |
| `cook-mustard.mp3` | Mustard! |
| `cook-mayo.mp3` | Mayo! |
| `cook-pbutter.mp3` | Peanut butter! |
| `cook-jelly.mp3` | Jelly! |
| `cook-syrup.mp3` | Syrup! |
| `cook-strawberry.mp3` | A strawberry! |
| `cook-blueberry.mp3` | Blueberries! |
| `cook-cherry.mp3` | A cherry! |
| `cook-sprinkles.mp3` | Sprinkles! |
| `cook-candy.mp3` | Candy! |
| `cook-candle.mp3` | A candle! |
| `cook-star.mp3` | A star! |
| `cook-cone.mp3` | A cone! |
| `cook-salt.mp3` | Salt! |
| `cook-pepper.mp3` | Pepper! |
| `cook-dough.mp3` | Dough! |
| `cook-ice-pink.mp3` | Pink icing! |
| `cook-ice-blue.mp3` | Blue icing! |
| `cook-ice-yellow.mp3` | Yellow icing! |
| `cook-ice-white.mp3` | White icing! |
| `cook-ice-choc.mp3` | Chocolate icing! |
| `cook-ice-green.mp3` | Green icing! |
| `cook-ice-purple.mp3` | Purple icing! |
| `cook-sc-vanilla.mp3` | Vanilla ice cream! |
| `cook-sc-strawb.mp3` | Strawberry ice cream! |
| `cook-sc-choc.mp3` | Chocolate ice cream! |
| `cook-sc-mint.mp3` | Mint ice cream! |
| `cook-sc-blueb.mp3` | Blueberry ice cream! |
| `cook-cheddar.mp3` | Cheddar cheese! |
| `cook-american.mp3` | American cheese! |
| `cook-provolone.mp3` | Provolone cheese! |
| `cook-pepperjack.mp3` | Pepper jack cheese! |
| `cook-swiss.mp3` | Swiss cheese! |
| `cook-bacon.mp3` | Bacon! |
| `cook-salami.mp3` | Salami! |
| `cook-chickenslice.mp3` | Chicken! |
| `cook-bun-plain.mp3` | A plain bun! |
| `cook-bun-sesame.mp3` | A sesame bun! |
| `cook-bun-wheat.mp3` | A wheat bun! |
| `cook-bunT-plain.mp3` | The top bun! |
| `cook-bunT-wheat.mp3` | The top bun! |
| `cook-bread-white.mp3` | White bread! |
| `cook-bread-wheat.mp3` | Wheat bread! |
| `cook-bread-rye.mp3` | Rye bread! |
| `cook-breadT.mp3` | The top slice! |
| `cook-breadT-wheat.mp3` | The top slice! |
| `cook-breadT-rye.mp3` | The top slice! |
| `cook-bbq.mp3` | Barbecue sauce! |
| `cook-relish.mp3` | Relish! |
| `cook-caramel.mp3` | Caramel sauce! |
| `cook-strawsauce.mp3` | Strawberry sauce! |
| `cook-cream.mp3` | Whipped cream! |
| `cook-pizzasauce.mp3` | Pizza sauce! |
| `cook-mozzarella.mp3` | Mozzarella cheese! |
| `cook-pepperoni.mp3` | Pepperoni! |
| `cook-mushroom.mp3` | Mushrooms! |
| `cook-olive.mp3` | Olives! |
| `cook-greenpepper.mp3` | Green peppers! |
| `cook-pineapple.mp3` | Pineapple! |
| `cook-basil.mp3` | Basil! |

## Clay Corner names (30)

Only said when "Extra audio help" is on in Grown-ups. Said when a clay tool, a cookie cutter, a stamp or an eye or bead is touched: "Squish!", "A heart!", "A googly eye!".

| File | Say |
|---|---|
| `clay-clay.mp3` | Clay! |
| `clay-hand.mp3` | Pick it up! |
| `clay-pull.mp3` | Pull it! |
| `clay-squish.mp3` | Squish! |
| `clay-roll.mp3` | Roll it flat! |
| `clay-cutters.mp3` | Cookie cutters! |
| `clay-extras.mp3` | Eyes and beads! |
| `clay-knife.mp3` | Cut it! |
| `clay-stamps.mp3` | Stamps! |
| `clay-smooth.mp3` | Smooth it! |
| `clay-pinch.mp3` | Pinch! |
| `clay-poke.mp3` | Poke! |
| `clay-dye.mp3` | Add some color! |
| `clay-circle.mp3` | A circle! |
| `clay-square.mp3` | A square! |
| `clay-heart.mp3` | A heart! |
| `clay-star.mp3` | A star! |
| `clay-flower.mp3` | A flower! |
| `clay-triangle.mp3` | A triangle! |
| `clay-bear.mp3` | A bear! |
| `clay-cat.mp3` | A kitty! |
| `clay-dots.mp3` | Dots! |
| `clay-paw.mp3` | A paw! |
| `clay-ridges.mp3` | Stripes! |
| `clay-ring.mp3` | A ring! |
| `clay-zigzag.mp3` | A zigzag! |
| `clay-eye.mp3` | A googly eye! |
| `clay-bead.mp3` | A bead! |
| `clay-pearl.mp3` | A pearl! |
| `clay-sprinkles.mp3` | Sprinkles! |

## Fishing Pond fish names (9)

Said by the built-in voice when a fish is caught in the fishing game, like "A bass!" or "A goldfish!". Optional.

| File | Say |
|---|---|
| `fish-bass.mp3` | A bass! |
| `fish-bluegill.mp3` | A bluegill! |
| `fish-goldfish.mp3` | A goldfish! |
| `fish-carp.mp3` | A carp! |
| `fish-trout.mp3` | A trout! |
| `fish-perch.mp3` | A perch! |
| `fish-catfish.mp3` | A catfish! |
| `fish-salmon.mp3` | A salmon! |
| `fish-minnow.mp3` | A minnow! |

## Picture words (26)

The word for each letter picture: apple, bear, cat...

| File | Say |
|---|---|
| `word-a.mp3` | apple |
| `word-b.mp3` | bear |
| `word-c.mp3` | cat |
| `word-d.mp3` | dog |
| `word-e.mp3` | elephant |
| `word-f.mp3` | fish |
| `word-g.mp3` | giraffe |
| `word-h.mp3` | horse |
| `word-i.mp3` | ice cream |
| `word-j.mp3` | juice |
| `word-k.mp3` | koala |
| `word-l.mp3` | lion |
| `word-m.mp3` | moon |
| `word-n.mp3` | nose |
| `word-o.mp3` | octopus |
| `word-p.mp3` | pig |
| `word-q.mp3` | queen |
| `word-r.mp3` | rainbow |
| `word-s.mp3` | sun |
| `word-t.mp3` | turtle |
| `word-u.mp3` | umbrella |
| `word-v.mp3` | violin |
| `word-w.mp3` | whale |
| `word-x.mp3` | box |
| `word-y.mp3` | yarn |
| `word-z.mp3` | zebra |

## Garden friend announcements (14)

Said when a new garden friend appears.

| File | Say |
|---|---|
| `creature-bee.mp3` | Bzzz! A bee! |
| `creature-butterfly.mp3` | A butterfly! |
| `creature-ladybug.mp3` | A ladybug! |
| `creature-bunny.mp3` | A bunny! |
| `creature-bird.mp3` | A little bird! |
| `creature-snail.mp3` | A snail! |
| `creature-hedgehog.mp3` | A hedgehog! |
| `creature-frog.mp3` | A frog! |
| `creature-duckling.mp3` | A duckling! |
| `creature-mouse.mp3` | A little mouse! |
| `creature-turtle.mp3` | A turtle! |
| `creature-dragonfly.mp3` | A dragonfly! |
| `creature-cat.mp3` | A kitty! |
| `creature-dog.mp3` | A puppy! |

## Critter noises (make the sound!) (14)

Played when a garden friend is tapped. Just make the noise, like a bee buzz or a frog ribbit.

| File | Say |
|---|---|
| `critter-bee.mp3` | Bzzzz! |
| `critter-butterfly.mp3` | a soft flutter noise |
| `critter-ladybug.mp3` | a tiny squeak |
| `critter-bunny.mp3` | a happy sniffle |
| `critter-bird.mp3` | Tweet tweet! |
| `critter-snail.mp3` | a slow, sleepy "sloooow" |
| `critter-hedgehog.mp3` | a little snuffle |
| `critter-frog.mp3` | Ribbit! |
| `critter-duckling.mp3` | Quack quack! |
| `critter-mouse.mp3` | Squeak squeak! |
| `critter-turtle.mp3` | a slow "hellooo" |
| `critter-dragonfly.mp3` | a quick buzzy zip |
| `critter-cat.mp3` | Meow! |
| `critter-dog.mp3` | Woof woof! |

## Purring and happy sounds (12)

Played while a pet is stroked in the close-up view in Pet Care (it loops while the pet is petted). If nothing is recorded the game makes a soft purr of its own. A few seconds of a real purr works best.

| File | Say |
|---|---|
| `purr-trex.mp3` | a low, rumbly happy growl |
| `purr-trike.mp3` | a low, happy rumble |
| `purr-stego.mp3` | a deep, sleepy rumble |
| `purr-bronto.mp3` | a slow, deep hum |
| `purr-babydino.mp3` | a squeaky happy chirp |
| `purr-cat.mp3` | a long, happy purr (a real cat purring is best) |
| `purr-dog.mp3` | a happy, sleepy dog groan or soft pant |
| `purr-bunny.mp3` | a bunny "tooth purr", soft chattering teeth |
| `purr-bear.mp3` | a low, contented hum |
| `purr-fox.mp3` | a soft, chirpy fox chatter |
| `purr-panda.mp3` | a gentle panda bleat or hum |
| `purr-frog.mp3` | a soft, slow ribbit |

