// Run after ios.mjs, inside the app on the simulator (ios-app/test/README.md).
//   after.js keep            the app was closed and opened again: the player, the painting and the family recording are still there
//   after.js restore <code>  a new phone (everything wiped first): joining the family code brings back the player and the recording,
//                            then the cloud copy is deleted again (turn off backup)
const T = window.SPG_TEST, wait = ms => new Promise(r => setTimeout(r, ms));
const [mode, code] = process.argv.slice(4);
let bad = 0; const out = T.extra = { checks: {}, notes: {} };
const ok = (cond, what, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}${!cond && detail !== undefined ? ': ' + JSON.stringify(detail) : ''}`); out.checks[what] = !!cond; if (!cond) bad++; };
const V = SPG.voice; await V.ready;
const voice = () => (SPG.store.settings.voices || []).find(v => v.name === 'Grandma');

if (mode === 'keep') {
  const p = SPG.store.profiles[0];
  ok(SPG.store.profiles.length === 1 && p && p.name, 'the player is still there after closing the app', SPG.store.profiles.map(x => x.name));
  const pics = p && p.data && p.data.color && p.data.color.pics, painted = pics && Object.values(pics).some(r => r.ops && r.ops.length);
  ok(!!painted, 'the painting is still there after closing the app');
  const v = voice(); ok(!!v, 'the family voice is still there', SPG.store.settings.voices);
  if (v) { ok(V.hasDeviceClip(v.id, 'letter/a'), 'the recording is still stored'); SPG.audio.unlock(); ok(await V.previewClip(v.id, 'letter/a'), 'the recording still plays'); }
  ok(T.gum === 0, 'opening the app again does not ask for the microphone', T.gum);
} else if (mode === 'restore') {
  ok(SPG.store.profiles.length === 0 && !voice(), 'the app starts empty (a new phone)', SPG.store.profiles.length);
  const r = await SPG.sync.join(code);
  ok(r && r.ok, 'joining the family code works', r);
  await wait(800);
  const p = SPG.store.profiles[0];
  ok(!!p && p.stars === 42, 'the player came back from the backup, with their stars', p && { name: p.name, stars: p.stars });
  const v = voice(); ok(!!v, 'the family voice came back from the backup', SPG.store.settings.voices);
  if (v) { ok(V.hasDeviceClip(v.id, 'letter/a'), 'the recording came back from the backup'); SPG.audio.unlock(); ok(await V.previewClip(v.id, 'letter/a'), 'the restored recording plays'); }
  const off = await SPG.sync.turnOff(); ok(off && off.ok, 'turning the backup off deletes the cloud copy', off);
  const again = await SPG.sync.join(code); ok(again && !again.ok && again.error === 'notfound', 'the cloud copy is gone', again);
} else ok(false, 'after.js needs keep or restore', mode);
console.log(bad ? `PROBLEMS: ${bad}` : 'AFTER CHECKS OK');
if (bad) process.exitCode = 1;
