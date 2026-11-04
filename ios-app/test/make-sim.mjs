// Creates and boots a fresh simulator for the in-app tests (macOS with Xcode only) and prints its id.
//   node ios-app/test/make-sim.mjs --pick 'iPhone [0-9]+ Pro Max' --name sprout-iphone [--prefer newest|smallest]
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
// the screen in points, from <device type>/Contents/Resources/profile.plist (0 when it cannot be read)
const area = t => {
  try {
    const p = `${t.bundlePath}/Contents/Resources/profile.plist`; if (!existsSync(p)) return 0;
    const o = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', p], { encoding: 'utf8' }));
    const s = o.mainScreenScale || 1; t.pt = [Math.round(o.mainScreenWidth / s), Math.round(o.mainScreenHeight / s)];
    return t.pt[0] * t.pt[1];
  } catch { return 0; }
};
for (const t of fits) t.area = area(t);
console.error(`device types for /${pick.source}/: ` + (fits.map(t => `${t.name}${t.pt ? ` ${t.pt.join('x')}` : ''} (${t.rt.name})`).join(', ') || 'none'));
if (!fits.length) { console.error('available: ' + types.filter(rtOf).map(t => t.name).join(', ')); process.exit(1); }
const newest = (a, b) => (b.minRuntimeVersion || 0) - (a.minRuntimeVersion || 0) || a.i - b.i;
fits.sort(prefer === 'smallest' ? (a, b) => (a.area || 1e9) - (b.area || 1e9) || newest(a, b) : newest);
const type = fits[0];
const rt = type.rt, udid = sim('create', name, type.identifier, rt.identifier);
sim('boot', udid);
// a first boot of a new runtime can take several minutes; never wait for ever
const t0 = Date.now();
try { execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], { stdio: 'ignore', timeout: 600_000 }); }
catch (e) { console.error(`the simulator did not report booted within ${Math.round((Date.now() - t0) / 1000)} s: ${e.message}`); process.exit(1); }
console.error(`boot took ${Math.round((Date.now() - t0) / 1000)} s`);
console.error(`booted ${type.name}${type.pt ? ` (${type.pt.join(' x ')} pt)` : ''} on ${rt.name} as ${udid}`);
console.log(udid);
