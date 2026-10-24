// The ASL signs (see js/sign.js for how a sign is written). Right hand = dominant. Positions given as [x, y, z] are in signer space
// (x < 0 is the signer's right, which is the left of the screen; the chin is the origin; one unit is a palm length). For the left
// hand use Lw(x, y, z): the real place on the screen, written the same way as for the right hand.
// Every sign was written from the standard ASL form; where ASL has several forms, the one most used with young children was chosen.
(() => {
  const S = SPG.sign, { H, sign, shape, sp, E, FIST } = S._internal;
  const Lw = (x, y, z) => [-x, y, z];
  const rep = (frames, n) => { let out = []; for (let i = 0; i < n; i++) out = out.concat(frames); return out; };
  const T = (t, R, L, face, arc) => Object.assign({ t, R }, L ? { L } : {}, face ? { face } : {}, arc ? { arc } : {});

  /* ---------------------------------------------------------------- extra handshapes */
  shape('U3', sp(E, -1), sp(E, 2), FIST, FIST, { a: 70, p: 10, c: 0, f: [0, 0] });            // index and middle together, thumb out (horse, duck)
  shape('pinch2', [30, 30, 20, -1], [30, 30, 20, 2], FIST, FIST, { to: 'i3', o: [-.06, -.02, .06] });   // index and middle closed onto the thumb (duck, no)
  shape('G0', [10, 10, 5, 0], FIST, FIST, FIST, { to: 'i3', o: [0, -.02, .05] });             // index and thumb straight, tips together (bird's beak shut)
  shape('bentU', [80, 0, 0, -1], [80, 0, 0, 2], FIST, FIST, { to: 'r2', o: [.02, 0, .12] });   // H fingers bent at the knuckles (rabbit ears down, pig...)
  shape('bentU3', [75, 0, 0, -1], [75, 0, 0, 2], FIST, FIST, { a: 70, p: 10, c: 0, f: [0, 0] });
  shape('bent3', [10, 85, 55, 9], [10, 85, 55, -6], FIST, FIST, { a: 55, p: 8, c: 0, f: [0, 5] });
  shape('bent4', [75, 0, 0, 10], [75, 0, 0, 2], [75, 0, 0, -6], [75, 0, 0, -15], { to: 'palm', o: [-.08, .55, .16] });
  shape('snap', [20, 30, 20, 13], [85, 60, 30, 2], [20, 30, 20, -8], [20, 30, 20, -19], { a: 40, p: 40, c: 0, f: [10, 10] });

  /* ---------------------------------------------------------------- greetings and everyday words */
  sign('HELLO', [T(.3, H('openB', 'forehead', 'up+.3co', 'out', 'ti', [-.35, 0, 0])), T(.45, H('openB', 'forehead', 'up+.3co', 'out+.2co', 'ti', [-1.4, .15, 1.5]))], { face: 'happy' });
  sign('BYE', [T(.3, H('openB', 'spell', 'up', 'out')), ...rep([T(.16, H('bentB', 'spell', 'up', 'out')), T(.16, H('openB', 'spell', 'up', 'out'))], 2)], { face: 'happy' });
  sign('THANK-YOU', [T(.3, H('openB', 'chin', 'up', 'in', 'tips', [0, .05, .02])), T(.5, H('openB', 'chin', 'out+.5up', 'up+.6in', 'tips', [-.1, -.8, 1.6]))], { face: 'kind' });
  sign('PLEASE', [T(.3, H('openB', 'chest', 'up+co', 'in')), T(.18, H('openB', 'chest', 'up+co', 'in', 'palm', [.35, .3, .02])), T(.18, H('openB', 'chest', 'up+co', 'in', 'palm', [.7, 0, .02])), T(.18, H('openB', 'chest', 'up+co', 'in', 'palm', [.35, -.35, .02])), T(.18, H('openB', 'chest', 'up+co', 'in'))], { face: 'kind' });
  sign('YES', [T(.25, H('S', 'neutral', 'up', 'out', 'palm', [-.2, 1, 0])), ...rep([T(.16, H('S', 'neutral', 'out+up', 'down+out', 'palm', [-.2, .85, .2]), null, { mood: 'happy', nod: 1 }), T(.16, H('S', 'neutral', 'up', 'out', 'palm', [-.2, 1, 0]), null, { mood: 'happy', nod: 0 })], 2)], { face: 'happy' });
  sign('NO', [T(.25, H('U3', 'neutral', 'up+.3co', 'out+co', 'palm', [-.2, 1, 0])), ...rep([T(.16, H('pinch2', 'neutral', 'up+.3co', 'out+co', 'palm', [-.2, 1, 0]), null, { mood: 'think', shake: 1 }), T(.16, H('U3', 'neutral', 'up+.3co', 'out+co', 'palm', [-.2, 1, 0]), null, { mood: 'think', shake: -1 })], 2)], { face: 'think' });
  sign('MORE', [T(.3, H('flatO', 'neutral', 'co+.2up', 'down+.5in', 'tips', [.1, 0, 0])), ...rep([T(.15, H('flatO', 'neutral', 'co+.2up', 'down+.5in', 'tips', [.3, 0, 0])), T(.15, H('flatO', 'neutral', 'co+.2up', 'down+.5in', 'tips', [.05, 0, 0]))], 2)], { mirror: true, face: 'ynq' });
  sign('FINISH', [T(.3, H('5', 'neutral', 'up', 'in', 'palm', [-.3, .6, 0])), T(.25, H('5', 'neutral', 'up+.5ip', 'out+ip', 'palm', [-.6, .5, .2])), T(.2, H('5', 'neutral', 'up', 'in', 'palm', [-.3, .6, 0])), T(.25, H('5', 'neutral', 'up+.5ip', 'out+ip', 'palm', [-.6, .5, .2]))], { mirror: true });
  sign('EAT', [T(.3, H('flatO', 'mouth', 'up+.8in', 'co+.3down', 'tips', [0, -.05, .55])), ...rep([T(.15, H('flatO', 'mouth', 'up+.8in', 'co+.3down', 'tips', [0, 0, .1])), T(.15, H('flatO', 'mouth', 'up+.8in', 'co+.3down', 'tips', [0, -.05, .55]))], 2)], { face: 'happy' });
  sign('DRINK', [T(.3, H('C', 'chin', 'up', 'co', 'tt', [0, -.1, .5])), T(.45, H('C', 'chin', 'up+.9in', 'co+.3up', 'tt', [0, .1, .45]))]);
  sign('MILK', [T(.3, H('C', 'neutral', 'up', 'co', 'palm', [-.4, .4, 0])), ...rep([T(.16, H('S', 'neutral', 'up', 'co', 'palm', [-.4, .3, 0])), T(.16, H('C', 'neutral', 'up', 'co', 'palm', [-.4, .4, 0]))], 2)]);
  sign('WATER', [T(.3, H('W', 'chin', 'up', 'co+.3out', 'ti', [0, 0, .35])), ...rep([T(.15, H('W', 'chin', 'up', 'co+.3out', 'ti', [0, 0, .05])), T(.15, H('W', 'chin', 'up', 'co+.3out', 'ti', [0, 0, .35]))], 2)]);
  sign('HELP', [T(.3, H('10', [.15, -2.75, 2.35], 'co', 'in', 'pinkyside'), H('openB', Lw(.15, -2.9, 2.3), 'co', 'up')), T(.4, H('10', [.15, -2.0, 2.35], 'co', 'in', 'pinkyside'), H('openB', Lw(.15, -2.15, 2.3), 'co', 'up'))], { face: 'kind' });
  sign('SLEEP', [T(.3, H('5', 'face', 'up+.2co', 'in', 'palm', [0, .1, -.4])), T(.6, H('flatO', 'chin', 'up+.2co', 'in', 'tips', [0, -.35, .45]), null, 'sleepy')], { face: 'sleepy' });
  sign('PLAY', [T(.3, H('Y', 'neutral', 'up', 'in', 'palm', [-.6, .4, -.2])), ...rep([T(.16, H('Y', 'neutral', 'up+.4co', 'in+ip', 'palm', [-.6, .4, -.2])), T(.16, H('Y', 'neutral', 'up+.4ip', 'in+co', 'palm', [-.6, .4, -.2]))], 2)], { mirror: true, face: 'happy' });
  sign('LOOK', [T(.3, H('V', 'eye', 'out', 'down', 'tips', [-.05, -.25, .4])), T(.45, H('V', 'eye', 'out', 'down', 'tips', [-.1, -.55, 1.9]))]);
  sign('TOUCH', [T(.3, H('open8', [.1, -2.0, 2.3], 'co+.3out', 'down', 'tm'), H('openB', Lw(.15, -2.6, 2.3), 'co', 'down')), T(.25, H('open8', [.1, -2.36, 2.3], 'co+.3out', 'down', 'tm'), H('openB', Lw(.15, -2.6, 2.3), 'co', 'down')), T(.2, H('open8', [.1, -2.1, 2.3], 'co+.3out', 'down', 'tm'), H('openB', Lw(.15, -2.6, 2.3), 'co', 'down'))]);
  sign('FIND', [T(.3, H('openF', 'neutral', 'out+.4co', 'down', 'ti', [0, .1, .2])), T(.25, H('F', 'neutral', 'out+.4co', 'down', 'ti', [0, 0, .2])), T(.3, H('F', 'neutral', 'out+.4co', 'down+in', 'ti', [0, .75, 0]))]);
  sign('COME', [T(.3, H('1', 'neutral', 'out+up', 'up+in', 'palm', [-.3, 0, .6])), T(.45, H('1', 'neutral', 'up+.3in', 'in', 'palm', [-.3, .3, -.4]), null, null, [0, .3, 0])], { mirror: true, face: 'happy' });
  sign('GO', [T(.3, H('1', 'neutral', 'up', 'in', 'palm', [-.3, .3, -.3])), T(.45, H('1', 'neutral', 'out', 'down', 'palm', [-.4, -.1, 1.2]), null, null, [0, .35, 0])], { mirror: true });
  sign('NEXT', [T(.3, H('openB', [-.45, -2.3, 1.7], 'up+co', 'in+.2co'), H('openB', Lw(-.25, -2.3, 2.35), 'up+co', 'in+.2co')), T(.45, H('openB', [-.4, -2.3, 3.0], 'up+co', 'in+.2co'), H('openB', Lw(-.25, -2.3, 2.35), 'up+co', 'in+.2co'), null, [0, .9, 0])]);
  sign('AGAIN', [T(.3, H('bentB', [-.8, -2.3, 2.4], 'up+.3co', 'up+in'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'up')), T(.45, H('bentB', [.15, -2.55, 2.3], 'up+.3co', 'down+.3in', 'tips'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'up'), null, [0, .5, 0])]);
  sign('WAIT', [T(.3, H('5', [-.9, -2.5, 2.2], 'out+co', 'up'), H('5', Lw(.4, -2.5, 1.7), 'out+co', 'up')), ...rep([T(.15, H('claw', [-.9, -2.5, 2.2], 'out+co', 'up'), H('claw', Lw(.4, -2.5, 1.7), 'out+co', 'up')), T(.15, H('5', [-.9, -2.5, 2.2], 'out+co', 'up'), H('5', Lw(.4, -2.5, 1.7), 'out+co', 'up'))], 2)]);
  sign('STOP', [T(.3, H('openB', [-.1, -1.6, 2.3], 'out', 'co'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'up')), T(.25, H('openB', [-.05, -2.62, 2.3], 'out', 'co', 'pinkyside'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'up'))], { face: 'think' });
  sign('CLEAN', [T(.3, H('openB', [-.2, -2.6, 2.3], 'co', 'down', 'palm'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'up')), ...rep([T(.2, H('openB', [.6, -2.62, 2.3], 'co', 'down', 'palm'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'up')), T(.2, H('openB', [-.2, -2.62, 2.3], 'co', 'down', 'palm'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'up'))], 2)]);
  sign('ME', [T(.3, H('1', 'chestc', 'in', 'co', 'ti', [0, 0, .5])), T(.2, H('1', 'chestc', 'in', 'co', 'ti', [0, 0, .08]))]);
  sign('YOU', [T(.3, H('1', 'neutral', 'out', 'co+down', 'ti', [0, .5, .3])), T(.25, H('1', 'neutral', 'out', 'co+down', 'ti', [0, .5, 1.1]))]);
  sign('YOUR', [T(.3, H('openB', 'neutral', 'up', 'out', 'palm', [0, .6, 0])), T(.3, H('openB', 'neutral', 'up', 'out', 'palm', [0, .6, 1]))]);
  sign('MY', [T(.3, H('openB', 'chestc', 'up+co', 'in', 'palm', [0, 0, .4])), T(.2, H('openB', 'chestc', 'up+co', 'in', 'palm', [0, 0, .03]))]);
  sign('YOUR-TURN', [T(.3, H('L', 'neutral', 'up', 'co', 'palm', [-.2, .5, 0])), T(.4, H('L', 'neutral', 'out', 'co+down', 'palm', [-.2, .3, .8]))], { face: 'ynq' });
  sign('APPLAUSE', [T(.3, H('5', 'above', 'up', 'out', 'palm', [-.9, -1.6, 0])), ...rep([T(.14, H('5', 'above', 'up+.3co', 'out+co', 'palm', [-.9, -1.6, 0])), T(.14, H('5', 'above', 'up+.3ip', 'out+ip', 'palm', [-.9, -1.6, 0]))], 3)], { mirror: true, face: 'cheer' });
  sign('GOOD', [T(.3, H('openB', 'chin', 'up', 'in', 'tips', [0, 0, .03])), T(.45, H('openB', [.05, -2.6, 2.4], 'out+.5co', 'up', 'back'), H('openB', Lw(.15, -2.9, 2.3), 'co', 'up'))], { face: 'happy' });
  sign('NAME', [T(.3, H('U', [-.1, -2.0, 2.3], 'co', 'in+.3down'), H('U', Lw(-.1, -2.25, 2.25), 'co', 'in+.3down')), ...rep([T(.15, H('U', [-.1, -2.05, 2.3], 'co', 'in+.3down', 'palm'), H('U', Lw(-.1, -2.25, 2.25), 'co', 'in+.3down')), T(.15, H('U', [-.1, -1.85, 2.3], 'co', 'in+.3down', 'palm'), H('U', Lw(-.1, -2.25, 2.25), 'co', 'in+.3down'))], 2)]);
  sign('WRITE', [T(.3, H('baby-O', [-.2, -2.6, 2.3], 'down+out', 'co', 'ti'), H('openB', Lw(.15, -2.8, 2.3), 'co', 'up')), T(.25, H('baby-O', [.3, -2.66, 2.4], 'down+out', 'co', 'ti'), H('openB', Lw(.15, -2.8, 2.3), 'co', 'up')), T(.25, H('baby-O', [-.1, -2.66, 2.1], 'down+out', 'co', 'ti'), H('openB', Lw(.15, -2.8, 2.3), 'co', 'up'))]);
  sign('SPELL', [T(.3, H('5', 'spell', 'up', 'down+out', 'palm', [.5, -.2, 0])), T(.2, H('claw', 'spell', 'up', 'down+out', 'palm', [.2, -.2, 0])), T(.2, H('5', 'spell', 'up', 'down+out', 'palm', [-.1, -.2, 0])), T(.2, H('claw', 'spell', 'up', 'down+out', 'palm', [-.4, -.2, 0]))]);
  sign('FRIEND', [T(.3, H('hook', [-.1, -2.0, 2.3], 'co', 'down', 'ti'), H('hook', Lw(-.1, -2.15, 2.3), 'co', 'up', 'ti')), T(.35, H('hook', [-.1, -2.15, 2.3], 'co', 'up', 'ti'), H('hook', Lw(-.1, -2.0, 2.3), 'co', 'down', 'ti'))], { face: 'happy' });
  sign('LOVE', [T(.35, H('S', [.75, -1.95, 1.0], 'up+co', 'in'), H('S', Lw(-.75, -1.95, 1.25), 'up+co', 'in')), T(.4, H('S', [.75, -2.0, .95], 'up+co', 'in'), H('S', Lw(-.75, -2.0, 1.2), 'up+co', 'in'))], { face: 'kind' });
  sign('HOME', [T(.3, H('flatO', 'mouth', 'in+up', 'co+down', 'tips', [-.25, -.05, .05])), T(.3, H('flatO', 'cheek', 'in+up', 'co+down', 'tips', [0, -.1, .1]))]);
  sign('WELCOME', [T(.3, H('openB', [-1.8, -2.2, 2.4], 'out+ip', 'up')), T(.45, H('openB', [-.6, -2.4, 1.4], 'co+out', 'up+in'), null, null, [0, 0, .4])], { face: 'happy' });
  sign('TIME', [T(.3, H('hook', [.4, -2.3, 2.35], 'down+co', 'down', 'ti'), H('S', Lw(.5, -2.55, 2.2), 'co', 'down')), T(.15, H('hook', [.45, -2.42, 2.3], 'down+co', 'down', 'ti'), H('S', Lw(.5, -2.55, 2.2), 'co', 'down')), T(.15, H('hook', [.4, -2.3, 2.35], 'down+co', 'down', 'ti'), H('S', Lw(.5, -2.55, 2.2), 'co', 'down'))]);
  sign('REST', [T(.35, H('openB', [.65, -2.0, 1.05], 'up+co', 'in'), H('openB', Lw(-.65, -2.05, 1.25), 'up+co', 'in')), T(.4, H('openB', [.65, -2.05, .98], 'up+co', 'in'), H('openB', Lw(-.65, -2.1, 1.18), 'up+co', 'in'))], { face: 'sleepy' });
  sign('NOW', [T(.3, H('bentB', [-.8, -2.2, 2.3], 'out', 'up'), H('bentB', Lw(.8, -2.2, 2.3), 'out', 'up')), T(.25, H('bentB', [-.8, -2.6, 2.3], 'out', 'up'), H('bentB', Lw(.8, -2.6, 2.3), 'out', 'up'))]);
  sign('FIRST', [T(.3, H('1', [.15, -1.6, 2.4], 'co+up', 'in', 'ti'), H('10', Lw(.3, -2.3, 2.3), 'co', 'in')), T(.2, H('1', [.18, -1.75, 2.35], 'co+up', 'in', 'ti'), H('10', Lw(.3, -2.3, 2.3), 'co', 'in'))]);
  sign('ALL', [T(.3, H('openB', [-.6, -1.8, 2.6], 'up+co', 'out'), H('openB', Lw(.1, -2.2, 2.2), 'up+co', 'in')), T(.45, H('openB', [-.15, -2.8, 2.5], 'co', 'in+up'), H('openB', Lw(.1, -2.2, 2.2), 'up+co', 'in'), null, [-.6, -.3, .3])]);
  sign('NEW', [T(.3, H('curved', [.4, -2.7, 2.6], 'co+out', 'in+up'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up')), T(.4, H('curved', [-.4, -2.4, 2.4], 'co+.3up', 'in+up'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up'))]);
  sign('BIG', [T(.3, H('bentL', [-.5, -2.3, 2.3], 'out', 'co'), null, null), T(.45, H('bentL', [-1.6, -2.3, 2.3], 'out', 'co'))], { mirror: true, face: 'wow' });
  sign('LITTLE', [T(.3, H('openB', [-.8, -2.4, 2.3], 'out', 'co')), T(.35, H('openB', [-.35, -2.4, 2.3], 'out', 'co')), T(.15, H('openB', [-.45, -2.4, 2.3], 'out', 'co'))], { mirror: true });
  sign('MIDDLE', [T(.3, H('bentB', [-.2, -1.8, 2.4], 'down', 'in'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up')), T(.4, H('bentB', [.1, -2.7, 2.35], 'down', 'in', 'tips'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up'), null, [-.3, .2, 0])]);
  sign('SAME', [T(.3, H('1', [-.9, -2.4, 2.3], 'out', 'down')), T(.35, H('1', [-.12, -2.4, 2.3], 'out', 'down'))], { mirror: true });
  sign('TOGETHER', [T(.3, H('A', [-.15, -2.4, 2.3], 'co', 'in')), T(.4, H('A', [-.15, -2.4, 2.3], 'co', 'in'), H('A', Lw(.15, -2.4, 2.3), 'co', 'in'))], { mirror: true });
  sign('TRY', [T(.3, H('T', [-.7, -2.0, 1.8], 'up', 'in')), T(.45, H('T', [-.7, -2.4, 2.8], 'up+out', 'in+down'), null, null, [0, .2, 0])], { mirror: true });
  sign('PICTURE', [T(.3, H('C', 'cheek', 'up', 'co+.6out', 'palm', [-.1, 0, .5])), T(.45, H('C', [.1, -2.6, 2.4], 'up', 'co', 'pinkyside'), H('openB', Lw(.1, -2.7, 2.3), 'up', 'ip'))]);
  sign('MAKE', [T(.3, H('S', [-.1, -2.2, 2.3], 'out', 'co'), H('S', Lw(.1, -2.55, 2.3), 'out', 'co')), T(.2, H('S', [-.1, -2.2, 2.3], 'out+co', 'co+in'), H('S', Lw(.1, -2.55, 2.3), 'out', 'co')), T(.2, H('S', [-.1, -2.2, 2.3], 'out', 'co'), H('S', Lw(.1, -2.55, 2.3), 'out', 'co'))]);
  sign('BUILD', [T(.3, H('bentB', [-.1, -2.9, 2.3], 'co', 'down'), H('bentB', Lw(-.1, -2.6, 2.3), 'co', 'down')), T(.22, H('bentB', [-.1, -2.3, 2.3], 'co', 'down'), H('bentB', Lw(-.1, -2.6, 2.3), 'co', 'down'), null, [0, 0, .6]), T(.22, H('bentB', [-.1, -2.3, 2.3], 'co', 'down'), H('bentB', Lw(-.1, -2.0, 2.3), 'co', 'down'))]);
  sign('PUT', [T(.3, H('flatO', [-.6, -2.0, 1.8], 'down+out', 'in')), T(.45, H('flatO', [-.6, -2.6, 2.9], 'down+.5out', 'in'), null, null, [0, .25, 0])], { mirror: true });
  sign('CHOOSE', [T(.3, H('openF', [-.4, -2.1, 3.0], 'up+out', 'out')), T(.2, H('F', [-.4, -2.1, 3.0], 'up+out', 'out')), T(.3, H('F', [-.5, -2.0, 2.1], 'up+out', 'out'))]);
  sign('CUT', [T(.3, H('V', [-.4, -2.3, 2.4], 'co', 'in')), ...rep([T(.14, H('U', [-.35, -2.3, 2.4], 'co', 'in')), T(.14, H('V', [-.3, -2.3, 2.4], 'co', 'in'))], 2)]);
  sign('BAKE', [T(.3, H('openB', [-.5, -2.75, 1.7], 'out', 'up'), H('openB', Lw(.1, -2.4, 2.3), 'co', 'down')), T(.45, H('openB', [-.05, -2.75, 2.9], 'out+.3co', 'up'), H('openB', Lw(.1, -2.4, 2.3), 'co', 'down'))]);
  sign('COOK', [T(.3, H('openB', [.1, -2.6, 2.3], 'co', 'down', 'palm'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up')), T(.3, H('openB', [.1, -2.6, 2.3], 'co', 'up', 'back'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up'), null, [0, .35, 0]), T(.3, H('openB', [.1, -2.6, 2.3], 'co', 'down', 'palm'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up'), null, [0, .35, 0])], { face: 'happy' });
  sign('STIR', [T(.3, H('A', [.05, -2.2, 2.4], 'up', 'co'), H('C', Lw(.1, -2.8, 2.3), 'out', 'up')), T(.2, H('A', [.35, -2.2, 2.6], 'up', 'co'), H('C', Lw(.1, -2.8, 2.3), 'out', 'up')), T(.2, H('A', [.05, -2.2, 2.8], 'up', 'co'), H('C', Lw(.1, -2.8, 2.3), 'out', 'up')), T(.2, H('A', [-.25, -2.2, 2.6], 'up', 'co'), H('C', Lw(.1, -2.8, 2.3), 'out', 'up')), T(.2, H('A', [.05, -2.2, 2.4], 'up', 'co'), H('C', Lw(.1, -2.8, 2.3), 'out', 'up'))]);
  sign('ROLL', [T(.3, H('1', [-.2, -2.1, 2.3], 'co', 'in')), T(.2, H('1', [-.2, -2.4, 2.6], 'co', 'in')), T(.2, H('1', [-.2, -2.7, 2.3], 'co', 'in')), T(.2, H('1', [-.2, -2.4, 2.0], 'co', 'in')), T(.2, H('1', [-.2, -2.1, 2.3], 'co', 'in'))], { mirror: false });
  sign('POUR', [T(.3, H('10', [-.6, -2.0, 2.3], 'co', 'in')), T(.45, H('10', [-.4, -2.2, 2.3], 'co', 'down+in'))]);
  sign('FEED', [T(.3, H('flatO', [-.6, -2.4, 1.8], 'out', 'up+in')), ...rep([T(.15, H('flatO', [-.6, -2.3, 2.6], 'out', 'up+in')), T(.15, H('flatO', [-.6, -2.4, 2.0], 'out', 'up+in'))], 2)], { mirror: true });
  sign('FISHING', [T(.3, H('S', [-.5, -2.4, 2.3], 'out', 'co'), H('S', Lw(-.2, -2.9, 2.3), 'out', 'co')), T(.3, H('S', [-.5, -1.6, 2.0], 'out+up', 'co'), H('S', Lw(-.2, -2.2, 2.1), 'out+up', 'co'))]);
  sign('CATCH', [T(.3, H('C', [-.9, -1.8, 2.0], 'out+up', 'co')), T(.35, H('S', [-.5, -2.2, 3.0], 'out', 'co'))], { face: 'wow' });
  sign('WALK', [T(.3, H('openB', [-.5, -2.8, 2.2], 'out', 'down'), H('openB', Lw(.5, -2.8, 2.5), 'out', 'down')), ...rep([T(.2, H('bentB', [-.5, -2.75, 2.6], 'out', 'down'), H('openB', Lw(.5, -2.8, 2.2), 'out', 'down')), T(.2, H('openB', [-.5, -2.8, 2.2], 'out', 'down'), H('bentB', Lw(.5, -2.75, 2.6), 'out', 'down'))], 2)]);
  sign('HIDE', [T(.3, H('10', 'mouth', 'co', 'in', 'tt', [0, 0, .1])), T(.5, H('10', [-.1, -2.85, 2.25], 'co', 'in'), H('curved', Lw(.15, -2.4, 2.3), 'co', 'down'))]);
  sign('FOLLOW', [T(.3, H('10', [-.3, -2.4, 1.7], 'out', 'co'), H('10', Lw(-.1, -2.4, 2.5), 'out', 'co')), T(.5, H('10', [-.3, -2.4, 2.6], 'out', 'co'), H('10', Lw(-.1, -2.4, 3.3), 'out', 'co'))]);
  sign('CARE', [T(.3, H('K', [-.1, -2.0, 2.3], 'out', 'co'), H('K', Lw(-.1, -2.5, 2.3), 'out', 'co')), T(.25, H('K', [.2, -2.0, 2.5], 'out', 'co'), H('K', Lw(.2, -2.5, 2.5), 'out', 'co')), T(.25, H('K', [-.1, -2.0, 2.3], 'out', 'co'), H('K', Lw(-.1, -2.5, 2.3), 'out', 'co'))], { face: 'kind' });
  sign('SHH', [T(.3, H('1', 'lips', 'up', 'co', 'ti', [0, 0, .35])), T(.3, H('1', 'lips', 'up', 'co', 'ti', [0, 0, .06]))], { face: 'sleepy' });
  sign('WHICH', [T(.3, H('10', [-.8, -2.3, 2.3], 'co', 'in'), H('10', Lw(.8, -2.5, 2.3), 'co', 'in')), ...rep([T(.18, H('10', [-.8, -2.6, 2.3], 'co', 'in'), H('10', Lw(.8, -2.2, 2.3), 'co', 'in')), T(.18, H('10', [-.8, -2.2, 2.3], 'co', 'in'), H('10', Lw(.8, -2.6, 2.3), 'co', 'in'))], 1)], { face: 'whq' });
  sign('FUN', [T(.3, H('U', 'nose', 'up+in', 'in+co', 'tips', [0, 0, .08])), T(.45, H('U', [.0, -2.3, 2.4], 'co+.3out', 'down', 'tips'), H('U', Lw(.1, -2.45, 2.3), 'co', 'down'))], { face: 'happy' });
  sign('BETTER', [T(.3, H('openB', 'chin', 'up', 'in', 'tips', [0, 0, .04])), T(.45, H('10', 'chin', 'co', 'in', 'tt', [-.8, .4, .9]))], { face: 'happy' });
  sign('FEEL', [T(.3, H('open8', 'chest', 'up+co', 'in', 'tm', [0, -.3, .02])), T(.3, H('open8', 'chest', 'up+co', 'in', 'tm', [0, .35, .02]))]);
  sign('NIGHT', [T(.3, H('bentB', [.05, -1.7, 2.3], 'co+out', 'down', 'heel'), H('openB', Lw(.6, -2.15, 2.3), 'co', 'down')), T(.4, H('bentB', [.05, -2.0, 2.3], 'co+down', 'down+in', 'heel'), H('openB', Lw(.6, -2.15, 2.3), 'co', 'down'))], { face: 'sleepy' });
  sign('MORNING', [T(.3, H('openB', [-.4, -2.6, 2.2], 'up+co', 'in'), H('openB', Lw(-.3, -2.2, 2.3), 'co', 'down')), T(.5, H('openB', [-.4, -1.5, 2.2], 'up', 'in'), H('openB', Lw(-.3, -2.2, 2.3), 'co', 'down'))], { face: 'happy' });
  sign('SAVE', [T(.3, H('S', [.2, -2.2, 2.3], 'up+co', 'in'), H('S', Lw(.2, -2.2, 2.5), 'up+co', 'in')), T(.4, H('S', [-.8, -2.1, 2.3], 'up', 'out'), H('S', Lw(-.8, -2.1, 2.3), 'up', 'out'))], { face: 'happy' });
  sign('MONEY', [T(.3, H('flatO', [.05, -2.2, 2.35], 'down+co', 'in', 'tips'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up')), ...rep([T(.15, H('flatO', [.05, -2.7, 2.35], 'down+co', 'in', 'tips'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up')), T(.15, H('flatO', [.05, -2.35, 2.35], 'down+co', 'in', 'tips'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up'))], 2)]);
  sign('BUY', [T(.3, H('flatO', [.05, -2.65, 2.3], 'down+co', 'in', 'tips'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up')), T(.45, H('flatO', [-.1, -2.4, 3.3], 'down+out', 'in'), H('openB', Lw(.15, -2.85, 2.3), 'co', 'up'), null, [0, .4, 0])]);
  sign('GIFT', [T(.3, H('X', [-.7, -2.2, 1.8], 'out+up', 'co')), T(.45, H('X', [-.7, -2.4, 3.0], 'out', 'co'), null, null, [0, .35, 0])], { mirror: true, face: 'happy' });
  sign('PARTY', [T(.3, H('Y', [-.9, -2.2, 2.2], 'up', 'out')), ...rep([T(.2, H('Y', [.0, -2.3, 2.2], 'up+co', 'out')), T(.2, H('Y', [-.9, -2.2, 2.2], 'up', 'out'))], 2)], { mirror: true, face: 'cheer' });
  sign('WRONG', [T(.3, H('Y', 'chin', 'up+.3co', 'in', 'palm', [0, -.3, .6])), T(.25, H('Y', 'chin', 'up+.3co', 'in', 'tips', [0, 0, .1]))], { face: 'think' });
  sign('RIGHT', [T(.3, H('1', [-.2, -2.0, 2.4], 'co+out', 'co'), H('1', Lw(.15, -2.6, 2.4), 'co+out', 'co')), T(.25, H('1', [-.1, -2.45, 2.4], 'co+out', 'co'), H('1', Lw(.15, -2.6, 2.4), 'co+out', 'co'))], { face: 'happy' });
  sign('PLUS', [T(.3, H('1', [-.1, -2.0, 2.4], 'co', 'in'), H('1', Lw(.0, -2.3, 2.3), 'up', 'co')), T(.25, H('1', [-.05, -2.1, 2.45], 'co', 'in'), H('1', Lw(.0, -2.3, 2.3), 'up', 'co'))]);
  sign('MINUS', [T(.3, H('1', [.1, -2.2, 2.6], 'co', 'down'), H('openB', Lw(.1, -2.4, 2.3), 'up', 'ip')), T(.3, H('1', [.15, -2.4, 2.45], 'co', 'down'), H('openB', Lw(.1, -2.4, 2.3), 'up', 'ip'))]);
  sign('EQUAL', [T(.3, H('bentB', [-.6, -2.3, 2.3], 'co', 'down'), H('bentB', Lw(.6, -2.3, 2.3), 'co', 'down')), ...rep([T(.15, H('bentB', [-.2, -2.3, 2.3], 'co', 'down'), H('bentB', Lw(.2, -2.3, 2.3), 'co', 'down')), T(.15, H('bentB', [-.45, -2.3, 2.3], 'co', 'down'), H('bentB', Lw(.45, -2.3, 2.3), 'co', 'down'))], 1)]);
  sign('COUNT', [T(.3, H('F', [.15, -2.9, 2.45], 'up', 'co', 'ti'), H('openB', Lw(.15, -2.3, 2.3), 'up', 'ip')), T(.45, H('F', [.15, -1.9, 2.45], 'up', 'co', 'ti'), H('openB', Lw(.15, -2.3, 2.3), 'up', 'ip'))]);
  sign('NUMBER', [T(.3, H('flatO', [-.25, -2.2, 2.3], 'co', 'in', 'tips'), H('flatO', Lw(.25, -2.2, 2.3), 'co', 'in', 'tips')), T(.3, H('flatO', [-.15, -2.2, 2.3], 'co', 'down', 'tips'), H('flatO', Lw(.15, -2.2, 2.3), 'co', 'up', 'tips')), T(.3, H('flatO', [-.15, -2.2, 2.3], 'co', 'in', 'tips'), H('flatO', Lw(.15, -2.2, 2.3), 'co', 'in', 'tips'))]);
  sign('HOW-MANY', [T(.3, H('S', [-.7, -2.3, 2.2], 'out', 'up')), T(.35, H('5', [-.8, -1.8, 2.3], 'out+up', 'up+in'))], { mirror: true, face: 'whq' });
  sign('WHAT', [T(.3, H('5', [-.9, -1.95, 2.2], 'out+co', 'up')), ...rep([T(.15, H('5', [-1.0, -1.95, 2.2], 'out+co', 'up')), T(.15, H('5', [-.8, -1.95, 2.2], 'out+co', 'up'))], 2)], { mirror: true, face: 'whq' });
  sign('WHERE', [T(.3, H('1', 'spell', 'up', 'out', 'palm', [.4, .1, 0])), ...rep([T(.15, H('1', 'spell', 'up+.3ip', 'out', 'palm', [.4, .1, 0])), T(.15, H('1', 'spell', 'up+.3co', 'out', 'palm', [.4, .1, 0]))], 2)], { face: 'whq' });
  sign('WHO', [T(.3, H('1', 'mouth', 'up', 'co', 'ti', [0, -.1, .4])), T(.18, H('1', 'mouth', 'up', 'co', 'ti', [.12, 0, .45])), T(.18, H('1', 'mouth', 'up', 'co', 'ti', [0, .1, .4])), T(.18, H('1', 'mouth', 'up', 'co', 'ti', [-.12, 0, .45]))], { face: 'whq' });
  sign('WHY', [T(.3, H('openB', 'forehead', 'up+in', 'in+co', 'tips', [-.2, -.1, .05])), T(.45, H('Y', 'forehead', 'up', 'in', 'palm', [-.3, -.6, 1.0]))], { face: 'whq' });
  sign('HOW', [T(.3, H('bentB', [-.15, -2.4, 2.3], 'down+co', 'in'), H('bentB', Lw(.15, -2.4, 2.3), 'down+co', 'in')), T(.45, H('bentB', [-.15, -2.3, 2.3], 'up+co', 'out+up'), H('bentB', Lw(.15, -2.3, 2.3), 'up+co', 'out+up'))], { face: 'whq' });
  sign('UP', [T(.3, H('1', 'neutral', 'up', 'out', 'palm', [-.3, 0, 0])), T(.35, H('1', 'neutral', 'up', 'out', 'palm', [-.3, .9, 0]))]);
  sign('DOWN', [T(.3, H('1', 'neutral', 'down', 'in', 'palm', [-.3, .6, 0])), T(.35, H('1', 'neutral', 'down', 'in', 'palm', [-.3, -.3, 0]))]);
  sign('FALL', [T(.3, H('V', [.05, -2.25, 2.3], 'down', 'in', 'tips'), H('openB', Lw(.15, -2.7, 2.3), 'co', 'up')), T(.45, H('V', [-.6, -2.9, 2.4], 'co+down', 'up', 'tips'), H('openB', Lw(.15, -2.7, 2.3), 'co', 'up'), null, [0, .4, 0])], { face: 'sad' });
  sign('BEAUTIFUL', [T(.3, H('5', 'face', 'up', 'in', 'palm', [-.2, .3, 0])), T(.2, H('5', 'face', 'up', 'in', 'palm', [.4, 0, 0])), T(.2, H('5', 'face', 'up', 'in', 'palm', [.1, -.5, 0])), T(.3, H('flatO', 'chin', 'up', 'in', 'tips', [0, -.3, .5]))], { face: 'happy' });
  sign('DELICIOUS', [T(.3, H('open8', 'lips', 'up+co', 'in', 'tm', [0, 0, .05])), T(.4, H('open8', 'lips', 'up+co', 'out+co', 'tm', [-.2, -.4, .8]))], { face: 'happy' });
  sign('PRESENT', [T(.3, H('X', [-.7, -2.2, 1.8], 'out+up', 'co')), T(.45, H('X', [-.7, -2.4, 3.0], 'out', 'co'), null, null, [0, .35, 0])], { mirror: true, face: 'happy' });

  // family and the everyday signs used most with young children
  sign('MOM', [T(.3, H('5', 'chin', 'up+.2co', 'co+.3out', 'tt', [0, -.05, .35])), ...rep([T(.15, H('5', 'chin', 'up+.2co', 'co+.3out', 'tt', [0, -.05, .04])), T(.15, H('5', 'chin', 'up+.2co', 'co+.3out', 'tt', [0, -.05, .35]))], 2)], { face: 'kind' });
  sign('DAD', [T(.3, H('5', 'forehead', 'up+.2co', 'co+.3out', 'tt', [0, 0, .35])), ...rep([T(.15, H('5', 'forehead', 'up+.2co', 'co+.3out', 'tt', [0, 0, .04])), T(.15, H('5', 'forehead', 'up+.2co', 'co+.3out', 'tt', [0, 0, .35]))], 2)], { face: 'kind' });
  sign('BABY', [T(.35, H('openB', [-.3, -2.5, 2.2], 'co', 'up'), H('openB', Lw(-.2, -2.7, 2.2), 'co', 'up')), ...rep([T(.3, H('openB', [-.7, -2.4, 2.2], 'co+.3up', 'up'), H('openB', Lw(-.6, -2.6, 2.2), 'co+.3up', 'up')), T(.3, H('openB', [.1, -2.4, 2.2], 'co+.3down', 'up'), H('openB', Lw(.2, -2.6, 2.2), 'co+.3down', 'up'))], 1)], { face: 'kind' });
  sign('I-LOVE-YOU', [T(.35, H('ILY', 'neutral', 'up', 'out', 'palm', [-.4, .5, 0])), T(.6, H('ILY', 'neutral', 'up+.15co', 'out', 'palm', [-.4, .55, .2]))], { face: 'happy' });
  sign('SORRY', [T(.3, H('A', 'chest', 'up+co', 'in', 'palm', [.1, .1, .03])), T(.18, H('A', 'chest', 'up+co', 'in', 'palm', [.45, -.15, .03])), T(.18, H('A', 'chest', 'up+co', 'in', 'palm', [.1, -.4, .03])), T(.18, H('A', 'chest', 'up+co', 'in', 'palm', [-.25, -.15, .03])), T(.18, H('A', 'chest', 'up+co', 'in', 'palm', [.1, .1, .03]))], { face: 'sad' });
  sign('TOILET', [T(.3, H('T', 'spell', 'up', 'out', 'palm', [.3, 0, 0])), ...rep([T(.14, H('T', 'spell', 'up+.4co', 'out+co', 'palm', [.3, 0, 0])), T(.14, H('T', 'spell', 'up+.4ip', 'out+ip', 'palm', [.3, 0, 0]))], 2)]);
  sign('HURT', [T(.3, H('1', [-.35, -2.2, 2.3], 'co', 'in')), ...rep([T(.18, H('1', [-.2, -2.2, 2.3], 'co+.4up', 'in')), T(.18, H('1', [-.35, -2.2, 2.3], 'co', 'in'))], 2)], { mirror: true, face: 'sad' });
  sign('OUTSIDE', [T(.3, H('flatO', [-.1, -2.0, 2.4], 'down', 'in'), H('C', Lw(.05, -2.4, 2.3), 'up', 'co')), T(.4, H('flatO', [-.3, -1.3, 3.0], 'up+out', 'in'), H('C', Lw(.05, -2.4, 2.3), 'up', 'co'))]);
  sign('SHOES', [T(.3, H('S', [-.4, -2.4, 2.3], 'out', 'down'), H('S', Lw(.4, -2.4, 2.3), 'out', 'down')), ...rep([T(.15, H('S', [-.2, -2.4, 2.3], 'out', 'down'), H('S', Lw(.2, -2.4, 2.3), 'out', 'down')), T(.15, H('S', [-.4, -2.4, 2.3], 'out', 'down'), H('S', Lw(.4, -2.4, 2.3), 'out', 'down'))], 2)]);

  /* ---------------------------------------------------------------- feelings */
  sign('HAPPY', [T(.3, H('openB', 'chest', 'up+co', 'in', 'palm', [.2, -.3, .03])), T(.25, H('openB', 'chest', 'up+co', 'in', 'palm', [.2, .35, .03]), null, null, [0, 0, .4]), T(.2, H('openB', 'chest', 'up+co', 'in', 'palm', [.2, -.3, .03])), T(.25, H('openB', 'chest', 'up+co', 'in', 'palm', [.2, .35, .03]), null, null, [0, 0, .4])], { face: 'happy' });
  sign('SAD', [T(.3, H('5', 'face', 'up', 'in', 'palm', [-.5, .1, .1])), T(.6, H('5', 'face', 'up', 'in', 'palm', [-.5, -1.6, .1]))], { mirror: true, face: 'sad' });
  sign('SCARED', [T(.3, H('S', [-1.1, -2.2, 1.7], 'up', 'in')), T(.25, H('5', [-.45, -2.2, 1.7], 'up+co', 'in'), null, { mood: 'scared', shake: .5 }), T(.25, H('5', [-.5, -2.2, 1.7], 'up+co', 'in'), null, { mood: 'scared', shake: -.5 })], { mirror: true, face: 'scared' });
  sign('MAD', [T(.3, H('claw', 'face', 'up', 'in', 'palm', [0, -.1, -.3])), T(.45, H('claw', 'face', 'up', 'in', 'palm', [0, .15, .7]))], { face: 'mad' });
  sign('SURPRISED', [T(.3, H('baby-O', 'eye', 'up+co', 'out+co', 'ti', [-.2, 0, .3])), T(.25, H('L', 'eye', 'up+.3co', 'out+co', 'tt', [-.1, -.2, .4]))], { mirror: true, face: 'wow' });
  sign('TIRED', [T(.3, H('bentB', 'chest', 'in+co', 'down+in', 'tips', [-.2, .3, .03])), T(.45, H('bentB', 'chest', 'in+down', 'co', 'tips', [-.2, .15, .03]))], { mirror: true, face: 'sleepy' });
  sign('BREATHE', [T(.35, H('openB', 'chestc', 'co', 'in', 'palm', [0, .2, .4]), H('openB', Lw(0, -3.2, 1.2), 'co', 'in')), T(.6, H('openB', 'chestc', 'co', 'in', 'palm', [0, .2, 1.2]), H('openB', Lw(0, -3.2, 2.0), 'co', 'in')), T(.6, H('openB', 'chestc', 'co', 'in', 'palm', [0, .2, .4]), H('openB', Lw(0, -3.2, 1.2), 'co', 'in'))], { face: 'kind' });
  sign('HUG', [T(.35, H('S', [.85, -1.95, 1.0], 'up+co', 'in'), H('S', Lw(-.85, -1.95, 1.25), 'up+co', 'in')), T(.2, H('S', [.85, -2.05, .95], 'up+co', 'in'), H('S', Lw(-.85, -2.05, 1.2), 'up+co', 'in')), T(.2, H('S', [.85, -1.95, 1.0], 'up+co', 'in'), H('S', Lw(-.85, -1.95, 1.25), 'up+co', 'in'))], { face: 'kind' });

  /* ---------------------------------------------------------------- animals */
  sign('CAT', [T(.3, H('F', 'cheek', 'up+co', 'co+.3out', 'tt', [.3, -.35, .1])), ...rep([T(.2, H('F', 'cheek', 'up+co', 'co+.3out', 'tt', [-.6, -.3, .4])), T(.15, H('F', 'cheek', 'up+co', 'co+.3out', 'tt', [.3, -.35, .1]))], 2)], { mirror: true, face: 'happy' });
  sign('DOG', [T(.3, H('openB', [-1.6, -3.6, 1.6], 'down', 'in')), T(.15, H('openB', [-1.6, -3.9, 1.6], 'down', 'in')), T(.15, H('openB', [-1.6, -3.6, 1.6], 'down', 'in')), T(.2, H('8', [-1.4, -2.6, 1.9], 'up', 'co+out')), T(.15, H('snap', [-1.4, -2.6, 1.9], 'up', 'co+out'))], { face: 'happy' });
  sign('BIRD', [T(.3, H('G', 'mouth', 'out+.6co', 'down', 'tt', [0, -.05, .25])), ...rep([T(.15, H('G0', 'mouth', 'out+.6co', 'down', 'tt', [0, -.05, .25])), T(.15, H('G', 'mouth', 'out+.6co', 'down', 'tt', [0, -.05, .25]))], 2)]);
  sign('FISH', [T(.3, H('openB', [-.5, -2.3, 2.0], 'out+.5co', 'co')), T(.2, H('openB', [-.4, -2.3, 2.4], 'out+.9co', 'co+in')), T(.2, H('openB', [-.3, -2.3, 2.8], 'out+.1co', 'co+.4out')), T(.2, H('openB', [-.2, -2.3, 3.2], 'out+.9co', 'co+in'))]);
  sign('RABBIT', [T(.3, H('U', 'head', 'up+.2ip', 'in', 'heel', [-.75, -.75, -.3])), ...rep([T(.16, H('bentU', 'head', 'up+.2ip', 'in', 'heel', [-.75, -.75, -.3])), T(.16, H('U', 'head', 'up+.2ip', 'in', 'heel', [-.75, -.75, -.3]))], 2)], { mirror: true, face: 'happy' });
  sign('BEAR', [T(.35, H('claw', [1.1, -1.75, 1.0], 'up+co', 'in'), H('claw', Lw(-1.1, -1.75, 1.25), 'up+co', 'in')), ...rep([T(.18, H('claw', [1.0, -2.1, 1.0], 'up+co', 'in'), H('claw', Lw(-1.0, -2.1, 1.25), 'up+co', 'in')), T(.18, H('claw', [1.1, -1.75, 1.0], 'up+co', 'in'), H('claw', Lw(-1.1, -1.75, 1.25), 'up+co', 'in'))], 2)]);
  sign('FROG', [T(.3, H('S', 'chin', 'out', 'down', 'knuck', [0, -.45, .15])), ...rep([T(.14, H('V', 'chin', 'out', 'down', 'knuck', [0, -.45, .15])), T(.14, H('S', 'chin', 'out', 'down', 'knuck', [0, -.45, .15]))], 2)], { face: 'happy' });
  sign('PIG', [T(.3, H('openB', 'chin', 'co', 'down', 'back', [.1, -.25, .3])), ...rep([T(.16, H('bentB', 'chin', 'co', 'down', 'back', [.1, -.25, .3])), T(.16, H('openB', 'chin', 'co', 'down', 'back', [.1, -.25, .3]))], 2)], { face: 'happy' });
  sign('DUCK', [T(.3, H('U3', 'mouth', 'out+.5co', 'down+co', 'tt', [0, -.05, .3])), ...rep([T(.15, H('pinch2', 'mouth', 'out+.5co', 'down+co', 'tt', [0, -.05, .3])), T(.15, H('U3', 'mouth', 'out+.5co', 'down+co', 'tt', [0, -.05, .3]))], 2)], { face: 'happy' });
  sign('COW', [T(.3, H('Y', 'temple', 'up+.6ip', 'out', 'tt', [0, 0, .05])), ...rep([T(.2, H('Y', 'temple', 'up+.3ip+.6out', 'out+co', 'tt', [0, 0, .05])), T(.2, H('Y', 'temple', 'up+.6ip', 'out', 'tt', [0, 0, .05]))], 2)]);
  sign('HORSE', [T(.3, H('U3', 'temple', 'up', 'out', 'tt', [0, 0, .05])), ...rep([T(.16, H('bentU3', 'temple', 'up', 'out', 'tt', [0, 0, .05])), T(.16, H('U3', 'temple', 'up', 'out', 'tt', [0, 0, .05]))], 2)]);
  sign('MOUSE', [T(.3, H('1', 'nose', 'up+co', 'co', 'ti', [.15, -.05, .05])), ...rep([T(.15, H('1', 'nose', 'up+co', 'co', 'ti', [-.2, -.05, .05])), T(.15, H('1', 'nose', 'up+co', 'co', 'ti', [.15, -.05, .05]))], 2)]);
  sign('BUTTERFLY', [T(.35, H('5', [-.25, -2.0, 1.6], 'up+.4co', 'in'), H('5', Lw(-.25, -2.0, 1.75), 'up+.4co', 'in')), ...rep([T(.16, H('bent5', [-.25, -2.0, 1.6], 'up+.4co', 'in'), H('bent5', Lw(-.25, -2.0, 1.75), 'up+.4co', 'in')), T(.16, H('5', [-.25, -2.0, 1.6], 'up+.4co', 'in'), H('5', Lw(-.25, -2.0, 1.75), 'up+.4co', 'in'))], 2)], { face: 'happy' });
  sign('MONKEY', [T(.3, H('claw', [-1.5, -2.7, 1.0], 'up+co', 'in')), ...rep([T(.18, H('claw', [-1.5, -2.2, 1.0], 'up+co', 'in')), T(.18, H('claw', [-1.5, -2.7, 1.0], 'up+co', 'in'))], 2)], { mirror: true, face: 'happy' });
  sign('OWL', [T(.3, H('O', 'eye', 'up', 'co', 'palm', [-.1, 0, .35])), ...rep([T(.18, H('O', 'eye', 'up+.4co', 'co+in', 'palm', [-.1, 0, .35])), T(.18, H('O', 'eye', 'up', 'co', 'palm', [-.1, 0, .35]))], 2)], { mirror: true });
  sign('SPIDER', [T(.35, H('claw', [.1, -2.4, 2.4], 'out+.4co', 'down'), H('claw', Lw(.1, -2.4, 2.25), 'out+.4co', 'down')), ...rep([T(.16, H('bent5', [.1, -2.4, 2.6], 'out+.4co', 'down'), H('bent5', Lw(.1, -2.4, 2.45), 'out+.4co', 'down')), T(.16, H('claw', [.1, -2.4, 2.8], 'out+.4co', 'down'), H('claw', Lw(.1, -2.4, 2.65), 'out+.4co', 'down'))], 2)], { face: 'scared' });
  sign('DINOSAUR', [T(.3, H('bentU', [-1.0, -1.0, 2.0], 'out', 'down')), ...rep([T(.25, H('bentU', [-.6, -1.6, 2.4], 'out+down', 'down')), T(.25, H('bentU', [-1.0, -1.0, 2.0], 'out', 'down'))], 2)], { face: 'wow' });

  /* ---------------------------------------------------------------- food and things */
  sign('APPLE', [T(.3, H('X', 'cheek', 'up', 'out', 'ipip', [.1, -.1, .1])), ...rep([T(.16, H('X', 'cheek', 'up+co', 'co+out', 'ipip', [.1, -.1, .1])), T(.16, H('X', 'cheek', 'up', 'out', 'ipip', [.1, -.1, .1]))], 2)], { face: 'happy' });
  sign('BANANA', [T(.3, H('flatO', [.15, -.75, 2.5], 'down+in', 'in', 'tips'), H('1', Lw(.15, -2.1, 2.3), 'up', 'in')), T(.3, H('flatO', [.15, -1.6, 2.5], 'down+in', 'in', 'tips'), H('1', Lw(.15, -2.1, 2.3), 'up', 'in')), T(.2, H('flatO', [.1, -.75, 2.55], 'down+in', 'in+co', 'tips'), H('1', Lw(.15, -2.1, 2.3), 'up', 'in')), T(.3, H('flatO', [.1, -1.6, 2.55], 'down+in', 'in+co', 'tips'), H('1', Lw(.15, -2.1, 2.3), 'up', 'in'))]);
  sign('COOKIE', [T(.3, H('claw', [.1, -2.6, 2.3], 'down', 'co', 'tips'), H('openB', Lw(.1, -2.8, 2.3), 'co', 'up')), ...rep([T(.18, H('claw', [.1, -2.6, 2.3], 'down', 'in', 'tips'), H('openB', Lw(.1, -2.8, 2.3), 'co', 'up')), T(.18, H('claw', [.1, -2.6, 2.3], 'down', 'co', 'tips'), H('openB', Lw(.1, -2.8, 2.3), 'co', 'up'))], 2)], { face: 'happy' });
  sign('CAKE', [T(.3, H('claw', [.5, -2.6, 2.3], 'down', 'co', 'tips'), H('openB', Lw(.1, -2.8, 2.3), 'co', 'up')), T(.45, H('claw', [-.3, -2.6, 2.3], 'down', 'co', 'tips'), H('openB', Lw(.1, -2.8, 2.3), 'co', 'up'))], { face: 'happy' });
  sign('ICE-CREAM', [T(.3, H('S', 'mouth', 'up', 'co', 'palm', [0, -.7, .7])), ...rep([T(.2, H('S', 'mouth', 'up+in', 'co', 'palm', [0, -.5, .55])), T(.2, H('S', 'mouth', 'up', 'co', 'palm', [0, -.7, .7]))], 2)], { face: 'happy' });
  sign('BALLOON', [T(.3, H('S', 'mouth', 'up', 'co', 'palm', [-.2, -.4, .4])), T(.5, H('C', 'mouth', 'up', 'co', 'palm', [-.9, -.2, .7]))], { mirror: true, face: 'wow' });
  sign('BALL', [T(.3, H('claw', [-.5, -2.3, 2.3], 'co+out', 'co')), ...rep([T(.16, H('claw', [-.3, -2.3, 2.3], 'co+out', 'co')), T(.16, H('claw', [-.5, -2.3, 2.3], 'co+out', 'co'))], 2)], { mirror: true });
  sign('BOOK', [T(.3, H('openB', [-.1, -2.2, 2.5], 'up+.7out', 'co'), H('openB', Lw(.1, -2.2, 2.5), 'up+.7out', 'co')), T(.45, H('openB', [-.55, -2.4, 2.4], 'up+.7out', 'out+.6co'), H('openB', Lw(.55, -2.4, 2.4), 'up+.7out', 'out+.6co'))], { face: 'happy' });
  sign('CAR', [T(.3, H('S', [-.8, -2.0, 2.2], 'out', 'co')), T(.25, H('S', [-.65, -1.7, 2.2], 'out', 'co')), T(.25, H('S', [-.8, -2.3, 2.2], 'out', 'co')), T(.25, H('S', [-.65, -1.7, 2.2], 'out', 'co'))], { mirror: true });
  sign('HOUSE', [T(.3, H('openB', [-.1, -1.2, 2.3], 'up+co', 'out+co', 'ti')), T(.25, H('openB', [-.8, -2.0, 2.3], 'up+.4co', 'out+co', 'ti')), T(.3, H('openB', [-.8, -3.0, 2.3], 'up', 'co', 'ti'))], { mirror: true });
  sign('TREE', [T(.3, H('5', [-1.0, -.4, 2.2], 'up', 'out'), H('openB', Lw(-.55, -3.25, 2.15), 'co', 'down')), ...rep([T(.18, H('5', [-1.0, -.4, 2.2], 'up', 'out+co'), H('openB', Lw(-.55, -3.25, 2.15), 'co', 'down')), T(.18, H('5', [-1.0, -.4, 2.2], 'up', 'out+ip'), H('openB', Lw(-.55, -3.25, 2.15), 'co', 'down'))], 2)]);
  sign('FLOWER', [T(.3, H('flatO', 'nose', 'up+in', 'co', 'tips', [-.2, -.1, .1])), T(.35, H('flatO', 'nose', 'up+in', 'co', 'tips', [.22, -.1, .1]), null, null, [0, 0, .25])], { face: 'happy' });
  sign('SUN', [T(.3, H('flatO', 'above', 'up+co', 'down+out', 'tips', [0, .1, 0])), T(.4, H('5', 'above', 'up+co', 'down+in', 'palm', [0, -.5, .4]))], { face: 'happy' });
  sign('MOON', [T(.3, H('C', 'temple', 'up', 'co', 'palm', [-.2, -.2, .3])), T(.45, H('C', 'temple', 'up', 'co', 'palm', [-.2, .9, .3]))]);
  sign('STAR', [T(.3, H('1', 'above', 'up', 'out', 'ti', [.3, 0, 0]), H('1', Lw(-.2, 3.0, 1.1), 'up', 'out', 'ti')), ...rep([T(.16, H('1', 'above', 'up', 'out', 'ti', [.4, .45, 0]), H('1', Lw(-.25, 2.7, 1.1), 'up', 'out', 'ti')), T(.16, H('1', 'above', 'up', 'out', 'ti', [.35, -.3, 0]), H('1', Lw(-.25, 3.4, 1.1), 'up', 'out', 'ti'))], 2)], { face: 'happy' });
  sign('RAIN', [T(.3, H('claw', [-.9, -.8, 2.2], 'out', 'down')), ...rep([T(.2, H('claw', [-.9, -2.0, 2.2], 'out', 'down')), T(.16, H('claw', [-.9, -.8, 2.2], 'out', 'down'))], 2)], { mirror: true });
  sign('RAINBOW', [T(.3, H('4', [1.2, 1.0, 1.3], 'up+co', 'in')), T(.7, H('4', [-1.6, 1.0, 1.3], 'up+ip', 'in'), null, null, [0, 1.6, 0])], { face: 'wow' });
  sign('LIGHTNING', [T(.3, H('1', [-.9, 2.6, 1.4], 'up', 'out', 'ti')), T(.15, H('1', [-.4, 1.6, 1.6], 'up', 'out', 'ti')), T(.15, H('1', [-.9, .9, 1.7], 'up', 'out', 'ti')), T(.15, H('1', [-.4, -.2, 1.8], 'up', 'out', 'ti'))], { face: 'wow' });
  sign('FIRE', [T(.3, H('5', [-.6, -3.2, 2.2], 'up', 'in')), ...rep([T(.2, H('claw', [-.6, -2.4, 2.2], 'up', 'in')), T(.2, H('5', [-.6, -3.0, 2.2], 'up', 'in'))], 2)], { mirror: true });
  sign('DARK', [T(.3, H('openB', 'face', 'up', 'in', 'palm', [-.8, .8, .3])), T(.5, H('openB', 'face', 'up+co', 'in', 'palm', [.1, -.7, .3]))], { mirror: true, face: 'scared' });
  sign('LIGHT', [T(.3, H('flatO', 'head', 'down+out', 'in', 'tips', [-.3, .2, .8])), T(.35, H('5', 'head', 'down+out', 'in', 'tips', [-.3, -.2, 1.1]))], { face: 'happy' });
  sign('MUSIC', [T(.3, H('openB', [.4, -2.0, 2.5], 'up+co', 'co'), H('openB', Lw(-.1, -2.5, 2.3), 'co', 'in')), T(.3, H('openB', [-.6, -2.0, 2.5], 'up+co', 'co'), H('openB', Lw(-.1, -2.5, 2.3), 'co', 'in'), null, [0, .25, 0]), T(.3, H('openB', [.4, -2.0, 2.5], 'up+co', 'co'), H('openB', Lw(-.1, -2.5, 2.3), 'co', 'in'), null, [0, .25, 0])], { face: 'happy' });
  sign('FRUIT', [T(.3, H('F', 'cheek', 'up', 'co', 'tt', [.05, -.1, .1])), T(.2, H('F', 'cheek', 'up+.5co', 'in+co', 'tt', [.05, -.1, .1])), T(.2, H('F', 'cheek', 'up', 'co', 'tt', [.05, -.1, .1]))]);
  sign('VEGETABLE', [T(.3, H('V', 'cheek', 'up', 'co', 'ti', [.05, -.1, .1])), T(.2, H('V', 'cheek', 'up+.5ip', 'out+co', 'ti', [.05, -.1, .1])), T(.2, H('V', 'cheek', 'up', 'co', 'ti', [.05, -.1, .1]))]);
  sign('CHEESE', [T(.3, H('openB', [.1, -2.4, 2.35], 'up+co', 'down', 'heel'), H('openB', Lw(.1, -2.6, 2.3), 'co', 'up')), ...rep([T(.18, H('openB', [.1, -2.4, 2.35], 'up+ip', 'down', 'heel'), H('openB', Lw(.1, -2.6, 2.3), 'co', 'up')), T(.18, H('openB', [.1, -2.4, 2.35], 'up+co', 'down', 'heel'), H('openB', Lw(.1, -2.6, 2.3), 'co', 'up'))], 2)]);
  sign('BREAD', [T(.3, H('bentB', [.1, -1.9, 2.5], 'down+co', 'in', 'tips'), H('openB', Lw(.1, -2.3, 2.3), 'co', 'in')), ...rep([T(.18, H('bentB', [.1, -2.7, 2.55], 'down+co', 'in', 'tips'), H('openB', Lw(.1, -2.3, 2.3), 'co', 'in')), T(.18, H('bentB', [.1, -2.0, 2.55], 'down+co', 'in', 'tips'), H('openB', Lw(.1, -2.3, 2.3), 'co', 'in'))], 2)]);
  sign('SANDWICH', [T(.3, H('openB', 'mouth', 'in+co', 'down', 'tips', [-.1, -.3, .9]), H('openB', Lw(-.1, -.5, .95), 'in+co', 'up')), ...rep([T(.18, H('openB', 'mouth', 'in+co', 'down', 'tips', [-.1, -.3, .45]), H('openB', Lw(-.1, -.5, .5), 'in+co', 'up')), T(.18, H('openB', 'mouth', 'in+co', 'down', 'tips', [-.1, -.3, .9]), H('openB', Lw(-.1, -.5, .95), 'in+co', 'up'))], 2)], { face: 'happy' });
  sign('PIZZA', [T(.3, H('bentV', 'mouth', 'up+co', 'in', 'tips', [0, -.25, .3])), T(.3, H('bentV', 'mouth', 'up+co', 'in', 'tips', [0, -.5, .5]))], { face: 'happy' });
  sign('BURGER', [T(.3, H('curved', [-.1, -2.2, 2.3], 'co', 'down'), H('curved', Lw(-.1, -2.6, 2.3), 'co', 'up')), T(.25, H('curved', [-.1, -2.6, 2.3], 'co', 'up'), H('curved', Lw(-.1, -2.2, 2.3), 'co', 'down'))], { face: 'happy' });
  sign('TOY', [T(.3, H('T', [-.5, -2.3, 2.3], 'up', 'out')), ...rep([T(.16, H('T', [-.5, -2.3, 2.3], 'up+.3co', 'out+co')), T(.16, H('T', [-.5, -2.3, 2.3], 'up+.3ip', 'out+ip'))], 2)], { mirror: true });
  sign('BOAT', [T(.3, H('curved', [-.25, -2.6, 2.1], 'out', 'co+up'), H('curved', Lw(-.25, -2.6, 2.1), 'out', 'co+up')), T(.3, H('curved', [-.25, -2.4, 2.7], 'out', 'co+up'), H('curved', Lw(-.25, -2.4, 2.7), 'out', 'co+up')), T(.3, H('curved', [-.25, -2.6, 3.2], 'out', 'co+up'), H('curved', Lw(-.25, -2.6, 3.2), 'out', 'co+up'))]);
  sign('AIRPLANE', [T(.3, H('ILY', [-1.0, -1.5, 1.6], 'out', 'down')), ...rep([T(.2, H('ILY', [-1.0, -1.3, 2.6], 'out', 'down')), T(.2, H('ILY', [-1.0, -1.5, 1.8], 'out', 'down'))], 1)], { face: 'happy' });
  sign('TRAIN', [T(.3, H('U', [.0, -2.3, 2.35], 'co', 'down'), H('U', Lw(.1, -2.45, 2.3), 'co', 'down')), ...rep([T(.18, H('U', [-.4, -2.3, 2.35], 'co', 'down'), H('U', Lw(.1, -2.45, 2.3), 'co', 'down')), T(.18, H('U', [.2, -2.3, 2.35], 'co', 'down'), H('U', Lw(.1, -2.45, 2.3), 'co', 'down'))], 2)]);
  sign('ROBOT', [T(.3, H('S', [-.9, -2.6, 2.0], 'out', 'co')), ...rep([T(.22, H('S', [-.9, -2.6, 2.6], 'out', 'co'), H('S', Lw(.9, -2.6, 2.0), 'out', 'co')), T(.22, H('S', [-.9, -2.6, 2.0], 'out', 'co'), H('S', Lw(.9, -2.6, 2.6), 'out', 'co'))], 1)]);
  sign('CASTLE', [T(.3, H('bentV', [-.3, -1.2, 2.3], 'up', 'out')), T(.4, H('bentV', [-.9, -1.2, 2.3], 'up', 'out'))], { mirror: true });
  sign('KITE', [T(.3, H('openB', [-1.0, .6, 2.2], 'up', 'out'), H('1', Lw(.2, -2.2, 2.2), 'up+ip', 'in')), ...rep([T(.25, H('openB', [-.6, .9, 2.2], 'up+co', 'out'), H('1', Lw(.2, -2.2, 2.2), 'up+ip', 'in')), T(.25, H('openB', [-1.2, .6, 2.2], 'up+ip', 'out'), H('1', Lw(.2, -2.2, 2.2), 'up+ip', 'in'))], 1)]);
  sign('SNOW', [T(.3, H('5', [-.9, -.5, 2.2], 'out', 'down')), ...rep([T(.25, H('claw', [-1.0, -1.6, 2.2], 'out', 'down')), T(.25, H('5', [-.8, -2.5, 2.2], 'out', 'down'))], 1)], { mirror: true });
  sign('PUMPKIN', [T(.3, H('8', [.1, -2.0, 2.45], 'up', 'co', 'tm'), H('S', Lw(.1, -2.4, 2.3), 'up', 'ip')), T(.15, H('snap', [.12, -2.15, 2.45], 'up', 'co', 'tm'), H('S', Lw(.1, -2.4, 2.3), 'up', 'ip'))]);

  /* ---------------------------------------------------------------- the garden, the kitchen, the games */
  sign('DIG', [T(.3, H('S', [-.5, -2.0, 2.0], 'out+co', 'co'), H('S', Lw(.0, -2.8, 2.3), 'out+co', 'co')), T(.3, H('S', [-.4, -2.6, 2.6], 'down+out', 'co'), H('S', Lw(.1, -3.2, 2.7), 'down+out', 'co')), T(.3, H('S', [-.5, -2.0, 2.0], 'out+co', 'co'), H('S', Lw(.0, -2.8, 2.3), 'out+co', 'co'))]);
  sign('GROW', [T(.3, H('flatO', [.1, -3.3, 2.3], 'up', 'co'), H('C', Lw(.1, -2.75, 2.3), 'out', 'up')), T(.45, H('5', [.1, -2.0, 2.3], 'up', 'co'), H('C', Lw(.1, -2.75, 2.3), 'out', 'up'))], { face: 'happy' });
  sign('SEED', [T(.3, H('flatO', [-.6, -2.2, 2.2], 'out+down', 'in')), ...rep([T(.2, H('openF', [-.4, -2.3, 2.4], 'out+down', 'in')), T(.2, H('flatO', [-.3, -2.2, 2.6], 'out+down', 'in'))], 1)]);
  sign('PAT', [T(.3, H('openB', [.15, -2.2, 2.3], 'co', 'down'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'down')), ...rep([T(.15, H('openB', [.15, -2.45, 2.3], 'co', 'down'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'down')), T(.15, H('openB', [.15, -2.2, 2.3], 'co', 'down'), H('openB', Lw(.15, -2.75, 2.3), 'co', 'down'))], 2)]);
  sign('BOWL', [T(.3, H('curved', [-.2, -2.8, 2.3], 'co', 'up+co')), T(.4, H('curved', [-.7, -2.4, 2.3], 'co+up', 'up+co'))], { mirror: true });
  sign('BATH', [T(.3, H('A', [-.5, -1.8, 1.0], 'up+co', 'in')), ...rep([T(.18, H('A', [-.5, -2.5, 1.0], 'up+co', 'in')), T(.18, H('A', [-.5, -1.8, 1.0], 'up+co', 'in'))], 2)], { mirror: true, face: 'happy' });
  sign('HUNGRY', [T(.3, H('C', 'neck', 'in', 'down', 'tips', [0, -.5, .1])), T(.5, H('C', 'neck', 'in', 'down', 'tips', [0, -1.6, .2]))], { face: 'sad' });
  sign('DIRTY', [T(.3, H('5', 'chin', 'co', 'down', 'back', [.3, -.35, .2])), ...rep([T(.14, H('claw', 'chin', 'co', 'down', 'back', [.3, -.35, .2])), T(.14, H('5', 'chin', 'co', 'down', 'back', [.3, -.35, .2]))], 2)], { face: 'think' });
  sign('SQUEEZE', [T(.3, H('C', 'neutral', 'up', 'co', 'palm', [-.4, .4, 0])), ...rep([T(.16, H('S', 'neutral', 'up', 'co', 'palm', [-.4, .3, 0])), T(.16, H('C', 'neutral', 'up', 'co', 'palm', [-.4, .4, 0]))], 2)]);
  sign('READY', [T(.3, H('R', [-.2, -2.3, 2.3], 'out', 'down')), T(.45, H('R', [-1.2, -2.3, 2.3], 'out', 'down'))], { mirror: true, face: 'happy' });
  sign('HURRAY', [T(.3, H('S', [-1.0, -1.2, 2.0], 'up', 'out')), T(.25, H('S', [-1.2, .4, 2.0], 'up', 'out')), T(.2, H('S', [-1.0, -.4, 2.0], 'up', 'out')), T(.25, H('S', [-1.2, .4, 2.0], 'up', 'out'))], { mirror: true, face: 'cheer' });
  sign('BEE', [T(.3, H('1', 'cheek', 'in', 'co', 'ti', [0, 0, .3])), T(.15, H('1', 'cheek', 'in', 'co', 'ti', [0, 0, .05])), T(.3, H('openB', 'cheek', 'up+co', 'co+in', 'palm', [-.2, 0, .3]))]);
  sign('SHAPE', [T(.3, H('A', [-.3, -1.5, 2.3], 'up', 'co')), T(.45, H('A', [-.6, -3.0, 2.3], 'up', 'co'), null, null, [-.4, 0, 0])], { mirror: true });
  sign('COLOR', [T(.3, H('5', 'chin', 'up', 'in', 'tips', [0, -.1, .1])), ...rep([T(.14, H('claw', 'chin', 'up', 'in', 'tips', [0, -.05, .1])), T(.14, H('5', 'chin', 'up', 'in', 'tips', [0, -.1, .1]))], 2)]);
  sign('BASKET', [T(.3, H('openB', [-.2, -2.3, 2.3], 'co', 'up+in')), T(.5, H('openB', [-.2, -2.3, 2.3], 'co', 'up+in'), H('openB', Lw(-.6, -2.0, 1.4), 'co', 'up'))]);
  sign('NO-MORE', [T(.3, H('5', 'neutral', 'up', 'out', 'palm', [-.3, .6, 0])), T(.3, H('5', 'neutral', 'co+up', 'out', 'palm', [.4, .5, 0]))], { mirror: true });
  sign('SAFE', [T(.3, H('S', [.2, -2.2, 2.3], 'up+co', 'in'), H('S', Lw(.2, -2.2, 2.5), 'up+co', 'in')), T(.4, H('S', [-.8, -2.1, 2.3], 'up', 'out'), H('S', Lw(-.8, -2.1, 2.3), 'up', 'out'))], { face: 'happy' });
  sign('STAY', [T(.3, H('Y', 'neutral', 'out+co', 'down', 'palm', [-.3, .4, 0])), T(.35, H('Y', 'neutral', 'out+co', 'down', 'palm', [-.3, -.1, .2]))]);
  sign('SOFT', [T(.3, H('5', [-.7, -2.3, 2.2], 'out', 'up')), ...rep([T(.18, H('flatO', [-.7, -2.5, 2.2], 'out', 'up')), T(.18, H('5', [-.7, -2.3, 2.2], 'out', 'up'))], 1)], { mirror: true, face: 'kind' });
  sign('SWIM', [T(.3, H('openB', [-.2, -2.2, 2.6], 'out', 'down+co')), T(.45, H('openB', [-1.2, -2.3, 2.2], 'out+ip', 'down+ip'), null, null, [0, 0, .3])], { mirror: true });
  sign('GARDEN', [T(.3, H('flatO', 'nose', 'up+in', 'co', 'tips', [-.2, -.1, .1])), T(.35, H('flatO', 'nose', 'up+in', 'co', 'tips', [.22, -.1, .1]), null, null, [0, 0, .25])], { face: 'happy' });

  /* ---------------------------------------------------------------- colours (letter hands that shake or brush) */
  const shakeAt = (hs, F, N, N2, at = 'spell', o = [.2, -.1, 0]) => [T(.3, H(hs, at, F, N, 'palm', o)), ...rep([T(.16, H(hs, at, F, N2, 'palm', o)), T(.16, H(hs, at, F, N, 'palm', o))], 2)];
  sign('RED', [T(.3, H('1', 'lips', 'up', 'in', 'ti', [0, 0, .05])), T(.35, H('X', 'chin', 'up', 'in', 'ti', [0, -.1, .1]))]);
  sign('ORANGE', [T(.3, H('C', 'chin', 'up', 'in+.6co', 'palm', [0, -.25, .45])), ...rep([T(.15, H('S', 'chin', 'up', 'in+.6co', 'palm', [0, -.25, .45])), T(.15, H('C', 'chin', 'up', 'in+.6co', 'palm', [0, -.25, .45]))], 2)]);
  sign('YELLOW', shakeAt('Y', 'up', 'out', 'out+.8co'));
  sign('GREEN', shakeAt('G', 'up+.3co', 'in+.3co', 'in+.8ip'));
  sign('BLUE', shakeAt('B', 'up', 'out', 'out+.8co'));
  sign('PURPLE', shakeAt('P', '.7out+down+.6co', 'down+.5co', 'down+.5ip', 'spell', [.2, .4, 0]));
  sign('PINK', [T(.3, H('P', 'lips', '.7out+down+.3co', 'down+in', 'tm', [0, .05, .05])), T(.35, H('P', 'chin', '.7out+down+.3co', 'down+in', 'tm', [0, 0, .1]))]);
  sign('BROWN', [T(.3, H('B', 'cheek', 'up', 'out+.3co', 'thumbside', [0, .15, .1])), T(.4, H('B', 'jaw', 'up', 'out+.3co', 'thumbside', [0, -.2, .15]))]);
  sign('BLACK', [T(.3, H('1', 'forehead', 'co', 'down', 'ipip', [.6, 0, .1])), T(.4, H('1', 'forehead', 'co', 'down', 'ipip', [-.6, 0, .1]))]);
  sign('WHITE', [T(.3, H('5', 'chestc', 'up+co', 'in', 'palm', [0, 0, .05])), T(.45, H('flatO', 'chestc', 'up+co', 'in', 'tips', [0, 0, 1.3]))]);
  sign('GRAY', [T(.3, H('5', [.1, -2.3, 2.6], 'co', 'in'), H('5', Lw(.1, -2.3, 2.1), 'co', 'out')), ...rep([T(.2, H('5', [-.3, -2.3, 2.6], 'co', 'in'), H('5', Lw(.5, -2.3, 2.1), 'co', 'out')), T(.2, H('5', [.3, -2.3, 2.6], 'co', 'in'), H('5', Lw(-.1, -2.3, 2.1), 'co', 'out'))], 1)]);
  sign('GOLD', shakeAt('Y', 'up', 'out', 'out+.8co', 'ear', [-.3, -.2, .5]));
  sign('RAINBOW-COLOR', [T(.3, H('4', [1.2, 1.0, 1.3], 'up+co', 'in')), T(.7, H('4', [-1.6, 1.0, 1.3], 'up+ip', 'in'), null, null, [0, 1.6, 0])]);

  /* ---------------------------------------------------------------- shapes: traced in the air with the index fingers */
  const tip = (x, y) => H('1', [x, y, 2.5], 'up+.25co', 'out', 'ti');
  const trace = (pts, ts = .2) => pts.map((p, i) => T(i ? ts : .3, tip(p[0], p[1]), null, null, p[2]));
  const both = pts => pts.map((p, i) => Object.assign(T(i ? .22 : .3, tip(p[0], p[1])), { L: H('1', Lw(-p[0], p[1], 2.5), 'up+.25co', 'out', 'ti') }));
  const ring = (cx, cy, rx, ry, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI / 2 + i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  sign('CIRCLE', trace(ring(-.5, -1.3, .85, .85), .13));
  sign('OVAL', trace(ring(-.5, -1.3, .6, 1.0), .13));
  sign('SQUARE', both([[-.05, -0.45], [-.9, -0.45], [-.9, -2.15], [-.05, -2.15]]));
  sign('RECTANGLE', both([[-.05, -0.75], [-1.4, -0.75], [-1.4, -1.95], [-.05, -1.95]]));
  sign('TRIANGLE', both([[-.05, -0.35], [-1.0, -2.15], [-.05, -2.15]]));
  sign('DIAMOND', both([[-.05, -0.25], [-.8, -1.25], [-.05, -2.25]]));
  sign('TRAPEZOID', both([[-.05, -0.65], [-.55, -0.65], [-1.1, -2.15], [-.05, -2.15]]));
  sign('HALF-CIRCLE', both([[-.05, -0.85], [-1.0, -0.85], [-.75, -1.6], [-.05, -1.9]]));
  sign('HEART', [Object.assign(T(.3, H('open8', [-.02, -1.9, .95], 'up+co', 'in', 'tm')), { L: H('open8', Lw(.02, -1.9, .95), 'up+co', 'in', 'tm') }), Object.assign(T(.22, H('open8', [-.5, -1.6, .95], 'up+co', 'in', 'tm')), { L: H('open8', Lw(.5, -1.6, .95), 'up+co', 'in', 'tm') }), Object.assign(T(.22, H('open8', [-.6, -2.1, .95], 'up+co', 'in', 'tm')), { L: H('open8', Lw(.6, -2.1, .95), 'up+co', 'in', 'tm') }), Object.assign(T(.25, H('open8', [-.02, -2.8, .95], 'up+co', 'in', 'tm')), { L: H('open8', Lw(.02, -2.8, .95), 'up+co', 'in', 'tm') })], { face: 'kind' });

  /* ---------------------------------------------------------------- numbers */
  const NUMPOS = 'spell';
  const num = (hs, N = 'in', F = 'up') => [T(.3, H(hs, NUMPOS, F, N, 'palm', [.2, 0, 0])), T(.4, H(hs, NUMPOS, F, N, 'palm', [.2, 0, 0]))];
  sign('N:0', [T(.3, H('O', NUMPOS, 'up', 'co+.6out', 'palm', [.2, 0, 0])), T(.4, H('O', NUMPOS, 'up', 'co+.6out', 'palm', [.2, 0, 0]))], { zoom: 'hand' });
  sign('N:1', num('1'), { zoom: 'hand' }); sign('N:2', num('V'), { zoom: 'hand' }); sign('N:3', num('3'), { zoom: 'hand' }); sign('N:4', num('4'), { zoom: 'hand' }); sign('N:5', num('5'), { zoom: 'hand' });
  sign('N:6', num('6', 'out'), { zoom: 'hand' }); sign('N:7', num('7', 'out'), { zoom: 'hand' }); sign('N:8', num('8', 'out'), { zoom: 'hand' }); sign('N:9', num('9', 'out'), { zoom: 'hand' });
  sign('N:10', [T(.3, H('10', NUMPOS, 'co', 'in', 'palm', [.2, 0, 0])), ...rep([T(.15, H('10', NUMPOS, 'co+.4in', 'in+ip', 'palm', [.2, 0, 0])), T(.15, H('10', NUMPOS, 'co+.4out', 'in+co', 'palm', [.2, 0, 0]))], 2)], { zoom: 'hand' });
  const flick = hs => [T(.3, H('S', NUMPOS, 'co+.3up', 'in', 'palm', [.2, 0, 0])), T(.15, H(hs, NUMPOS, 'co+.3up', 'in', 'palm', [.2, 0, 0])), T(.12, H('S', NUMPOS, 'co+.3up', 'in', 'palm', [.2, 0, 0])), T(.15, H(hs, NUMPOS, 'co+.3up', 'in', 'palm', [.2, 0, 0]))];
  sign('N:11', flick('1'), { zoom: 'hand' }); sign('N:12', flick('V'), { zoom: 'hand' });
  const bend = (a, b) => [T(.3, H(a, NUMPOS, 'up', 'in', 'palm', [.2, 0, 0])), ...rep([T(.15, H(b, NUMPOS, 'up', 'in', 'palm', [.2, 0, 0])), T(.15, H(a, NUMPOS, 'up', 'in', 'palm', [.2, 0, 0]))], 2)];
  sign('N:13', bend('3', 'bent3'), { zoom: 'hand' }); sign('N:14', bend('4', 'bent4'), { zoom: 'hand' }); sign('N:15', bend('5', 'bent5'), { zoom: 'hand' });
  const teen = hs => [T(.3, H('10', NUMPOS, 'co', 'in', 'palm', [.2, 0, 0])), T(.35, H(hs, NUMPOS, 'up', 'out', 'palm', [.2, 0, 0])), T(.2, H(hs, NUMPOS, 'up', 'out', 'palm', [.2, 0, 0]))];
  sign('N:16', teen('6'), { zoom: 'hand' }); sign('N:17', teen('7'), { zoom: 'hand' }); sign('N:18', teen('8'), { zoom: 'hand' }); sign('N:19', teen('9'), { zoom: 'hand' });
  sign('N:20', [T(.3, H('L', NUMPOS, 'up', 'out', 'palm', [.2, 0, 0])), ...rep([T(.14, H('G0', NUMPOS, 'up', 'out', 'palm', [.2, 0, 0])), T(.14, H('L', NUMPOS, 'up', 'out', 'palm', [.2, 0, 0]))], 2)], { zoom: 'hand' });
})();
