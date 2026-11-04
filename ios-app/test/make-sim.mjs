// Creates and boots a fresh simulator for the in-app tests (macOS with Xcode only) and prints its id.
//   node ios-app/test/make-sim.mjs --pick 'iPhone [0-9]+ Pro Max' --name sprout-iphone
// --pick is a regular expression for the device type name; the newest matching type and the newest iOS runtime are used.
// Everything Xcode offers is printed first, so the log shows which devices this Mac had.
import { execFileSync } from 'node:child_process';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8' }).trim();
const pick = new RegExp(arg('pick', 'iPhone'), 'i'), name = arg('name', 'sprout-test');
const types = JSON.parse(sim('list', 'devicetypes', '-j')).devicetypes;
const runtimes = JSON.parse(sim('list', 'runtimes', '-j')).runtimes.filter(r => r.isAvailable && /iOS/.test(r.name));
console.error('runtimes: ' + runtimes.map(r => r.name).join(', '));
const rt = runtimes.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true })).pop();
if (!rt) { console.error('no iOS runtime'); process.exit(1); }
const fits = types.filter(t => pick.test(t.name) && (!rt.supportedDeviceTypes || rt.supportedDeviceTypes.some(s => s.identifier === t.identifier)));
console.error(`device types for /${pick.source}/ on ${rt.name}: ` + (fits.map(t => t.name).join(', ') || 'none'));
if (!fits.length) { console.error('available: ' + (rt.supportedDeviceTypes || types).map(t => t.name).join(', ')); process.exit(1); }
const type = fits[fits.length - 1];
const udid = sim('create', name, type.identifier, rt.identifier);
sim('boot', udid);
execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], { stdio: 'ignore' });
console.error(`booted ${type.name} (${rt.name}) as ${udid}`);
console.log(udid);
