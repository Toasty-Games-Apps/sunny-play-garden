// Creates and boots a fresh simulator for the in-app tests (macOS with Xcode only) and prints its id.
//   node ios-app/test/make-sim.mjs --pick 'iPhone [0-9]+ Pro Max' --name sprout-iphone [--prefer newest|smallest] [--app App.app --bundle id]
// With --app it also installs the app and gives it what a grown-up would allow (the microphone, adding to Photos).
// A build server's simulator can fail to boot or hang while installing: every step has a time limit, and a simulator that fails is
// deleted and made again (at most three times).
// --pick is a regular expression for the device type name; each type runs on the newest iOS runtime that supports it.
// --prefer newest (default) takes the most recent model (the highest minimum iOS); smallest takes the smallest screen in points
// (read from the device type's profile), which is how the small-iPhone tests find the smallest phone this Xcode still offers.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8' }).trim();
const pick = new RegExp(arg('pick', 'iPhone'), 'i'), name = arg('name', 'sprout-test'), prefer = arg('prefer', 'newest');
const types = JSON.parse(sim('list', 'devicetypes', '-j')).devicetypes;
const runtimes = JSON.parse(sim('list', 'runtimes', '-j')).runtimes.filter(r => r.isAvailable && /iOS/.test(r.name))
  .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
console.error('runtimes: ' + runtimes.map(r => `${r.name} (${(r.supportedDeviceTypes || []).length} device types)`).join(', '));
if (!runtimes.length) { console.error('no iOS runtime'); process.exit(1); }
// each device type runs on the newest runtime that supports it (a new runtime can be for one new device only, like iOS 27.1 for
// iPhone Duo, while every other device still runs the one before it)
const rtOf = t => runtimes.find(r => !r.supportedDeviceTypes || r.supportedDeviceTypes.some(s => s.identifier === t.identifier));
const fits = types.map((t, i) => ({ ...t, i, rt: rtOf(t) })).filter(t => pick.test(t.name) && t.rt);
// the screen in points, from <device type>/Contents/Resources/profile.plist; newer Xcodes no longer keep it there (the keys are
// missing), so a phone's name gives its size then (the sizes Apple lists for each model)
const BY_NAME = [[/SE\b/, [375, 667]], [/mini/, [375, 812]], [/Pro Max|Plus|Air/, [430, 932]], [/1[7-9] Pro|1[6-9]\b(?! ?e)/, [402, 874]], [/./, [390, 844]]];
const num = v => typeof v === 'number' ? v : parseFloat(v);
let shown = false;
const area = t => {
  try {
    const p = `${t.bundlePath}/Contents/Resources/profile.plist`;
    if (existsSync(p)) {
      const o = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', p], { encoding: 'utf8' }));
      const s = num(o.mainScreenScale) || 1, w = num(o.mainScreenWidth) / s, h = num(o.mainScreenHeight) / s;
      if (w > 0 && h > 0) { t.pt = [Math.round(w), Math.round(h)]; return t.pt[0] * t.pt[1]; }
      if (!shown) { shown = true; console.error(`(no screen size in ${t.name}'s profile; its keys: ${Object.keys(o).slice(0, 30).join(', ')})`); }
    }
  } catch { /* the name below */ }
  t.pt = BY_NAME.find(([re]) => re.test(t.name))[1].slice(); t.byName = true;
  return t.pt[0] * t.pt[1];
};
for (const t of fits) t.area = area(t);
console.error(`device types for /${pick.source}/: ` + (fits.map(t => `${t.name}${t.pt ? ` ${t.pt.join('x')}${t.byName ? '?' : ''}` : ''} (${t.rt.name})`).join(', ') || 'none'));
if (!fits.length) { console.error('available: ' + types.filter(rtOf).map(t => t.name).join(', ')); process.exit(1); }
const newest = (a, b) => (b.minRuntimeVersion || 0) - (a.minRuntimeVersion || 0) || a.i - b.i;
fits.sort(prefer === 'smallest' ? (a, b) => (a.area || 1e9) - (b.area || 1e9) || newest(a, b) : newest);
const type = fits[0], rt = type.rt, app = arg('app'), bundle = arg('bundle', 'com.toastygames.littlesproutpark');
// a simctl call with a time limit; what it said when it failed (its own last line, not only "Command failed")
const run = (secs, ...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: secs * 1000 }).trim();
const why = e => { const o = String(e && (e.stderr || e.stdout) || '').trim().split('\n').filter(Boolean).pop(); return (e && e.signal ? 'timed out (' + e.signal + ')' : e && e.status != null ? 'exit ' + e.status : '') + (o ? ': ' + o : ''); };
const secs = t => Math.round((Date.now() - t) / 1000);
function attempt() {
  const udid = run(120, 'create', name, type.identifier, rt.identifier);
  try {
    // a first boot of a new runtime can take several minutes; never wait for ever
    const t0 = Date.now();
    try { run(120, 'boot', udid); } catch (e) { if (!/current state: Booted/i.test(String(e.stderr || ''))) throw Object.assign(e, { step: 'boot' }); }
    try { run(600, 'bootstatus', udid, '-b'); } catch (e) { throw Object.assign(e, { step: `bootstatus after ${secs(t0)} s` }); }
    console.error(`boot took ${secs(t0)} s`);
    if (app) {
      const t1 = Date.now();
      try { run(420, 'install', udid, app); } catch (e) { throw Object.assign(e, { step: `install after ${secs(t1)} s` }); }
      console.error(`installed in ${secs(t1)} s`);
      for (const what of ['microphone', 'photos-add']) { try { run(90, 'privacy', udid, 'grant', what, bundle); } catch (e) { console.error(`(privacy grant ${what}: ${why(e)})`); } }
      try { console.error(run(90, 'io', udid, 'enumerate')); } catch (e) { console.error(`(io enumerate: ${why(e)})`); }
    }
    return udid;
  } catch (e) {
    // a failed simulator is not reused: shut it down and delete it (each with its own limit) before the next try
    try { run(120, 'shutdown', udid); } catch (_) { /* already down */ }
    try { run(120, 'delete', udid); } catch (_) { /* gone or stuck: a new one has its own id */ }
    throw e;
  }
}
let udid = '';
for (let k = 1; !udid; k++) {
  try { udid = attempt(); }
  catch (e) { console.error(`the simulator failed at ${e.step || 'create'}: ${why(e)}${k < 3 ? '; making a new one' : ''}`); if (k >= 3) process.exit(1); }
}
console.error(`booted ${type.name}${type.pt ? ` (${type.pt.join(' x ')} pt)` : ''} on ${rt.name} as ${udid}`);
console.log(udid);
