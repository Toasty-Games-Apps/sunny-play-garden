// Creates and boots a fresh simulator for the in-app tests (macOS with Xcode only) and prints its id.
//   node ios-app/test/make-sim.mjs --pick 'iPhone [0-9]+ Pro Max' --name sprout-iphone [--prefer newest|smallest]
// --pick is a regular expression for the device type name, matched against the types the newest iOS runtime supports.
// --prefer newest (default) takes the most recent model (the highest minimum iOS); smallest takes the smallest screen in points
// (read from the device type's profile), which is how the small-iPhone tests find the smallest phone this Xcode still offers.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8' }).trim();
const pick = new RegExp(arg('pick', 'iPhone'), 'i'), name = arg('name', 'sprout-test'), prefer = arg('prefer', 'newest');
const types = JSON.parse(sim('list', 'devicetypes', '-j')).devicetypes;
const runtimes = JSON.parse(sim('list', 'runtimes', '-j')).runtimes.filter(r => r.isAvailable && /iOS/.test(r.name));
console.error('runtimes: ' + runtimes.map(r => r.name).join(', '));
const rt = runtimes.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true })).pop();
if (!rt) { console.error('no iOS runtime'); process.exit(1); }
const ok = t => !rt.supportedDeviceTypes || rt.supportedDeviceTypes.some(s => s.identifier === t.identifier);
const fits = types.map((t, i) => ({ ...t, i })).filter(t => pick.test(t.name) && ok(t));
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
console.error(`device types for /${pick.source}/ on ${rt.name}: ` + (fits.map(t => t.name + (t.pt ? ` ${t.pt.join('x')}` : '')).join(', ') || 'none'));
if (!fits.length) { console.error('available: ' + types.filter(ok).map(t => t.name).join(', ')); process.exit(1); }
const newest = (a, b) => (b.minRuntimeVersion || 0) - (a.minRuntimeVersion || 0) || a.i - b.i;
fits.sort(prefer === 'smallest' ? (a, b) => (a.area || 1e9) - (b.area || 1e9) || newest(a, b) : newest);
const type = fits[0];
const udid = sim('create', name, type.identifier, rt.identifier);
sim('boot', udid);
execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], { stdio: 'ignore' });
console.error(`booted ${type.name}${type.pt ? ` (${type.pt.join(' x ')} pt)` : ''} on ${rt.name} as ${udid}`);
console.log(udid);
