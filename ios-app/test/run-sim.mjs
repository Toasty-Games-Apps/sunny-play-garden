// Runs the in-app tests on one iOS simulator (macOS with Xcode only). The app must be a TEST build (SPG_SELFTEST=1, Debug) and
// already installed on a booted simulator. For each test it writes a plan into the app's Documents/selftest folder, launches
// the app, answers the page's requests (real screenshots, sending the app to the background), and collects the result.
//
//   node ios-app/test/run-sim.mjs --udid <simulator> --out <folder> [--bundle com.toastygames.littlesproutpark]
//        [--tests ios,after:keep,after:restore,lang:es,auto,store-shots] [--shots 1] [--label iphone]
//
// Test names: any file in www/test (ios, lang:<en|es|hi|zh>, after:keep, after:restore (needs a backup made by ios),
// store-shots, and the play-tests auto, shapes, sort, ...: see ios-app/build-web.mjs PLAYTESTS). <name>:<arg>+<arg> passes arguments.
// Everything goes to --out: <label>-<test>.log, result json, screenshots <label>-<test>-<name>.png, and summary.json / summary.md.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const udid = arg('udid'), out = arg('out', 'sim-results'), bundle = arg('bundle', 'com.toastygames.littlesproutpark'), label = arg('label', 'sim');
const tests = arg('tests', 'ios,after:keep').split(/[\s,;]+/).filter(Boolean);
const shots = arg('shots', '1') !== '0';
// --backup false: this Mac runs no local backup service, so the ios test leaves the cloud backup out instead of failing on it
const backup = arg('backup', 'true') !== 'false';
if (!udid) { console.error('--udid is required'); process.exit(2); }
mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// every simctl call has a time limit: on a busy Mac switching apps can take minutes, and one stuck call must not stop the whole run
const x = (...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 240000 }).trim();
const xq = (...a) => { try { return x(...a); } catch (e) { return null; } };
const container = () => x('get_app_container', udid, bundle, 'data');
const dir = () => join(container(), 'Documents', 'selftest');
// a test spec "after:restore" -> { name: 'after', args: ['restore'] }; lang:es is the lang test in Spanish
const parse = spec => { const [name, rest] = spec.split(':'); return { spec, name, args: rest ? rest.split('+') : [] }; };
const results = [];
let code = '';   // the family code ios made (for after:restore)

async function screenshot(file, want) {
  xq('io', udid, 'screenshot', '--type=png', file);
  if (!existsSync(file)) return false;
  // simulator screenshots come in the screen's own orientation; turn a landscape screen the right way round
  try {
    const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
    const w = +dims.match(/pixelWidth: (\d+)/)[1], h = +dims.match(/pixelHeight: (\d+)/)[1];
    if (want && want.w > want.h && h > w) execFileSync('sips', ['-r', String(want.angle === 270 || want.angle === -90 ? 90 : 270), file], { stdio: 'ignore' });
  } catch (_) { /* keep it as it is */ }
  return true;
}

async function runOne(t) {
  const name = t.name, run = `${label}-${name}-${Date.now()}`;
  const fresh = !(name === 'after' && t.args[0] === 'keep');
  const plan = { test: name, run, fresh, args: t.args.slice(), shots, prefix: `${label}-${t.spec.replace(/[:+]/g, '-')}`, timeout: name === 'auto' || name === 'kitchen-look' ? 3000 : name === 'ios' ? 1800 : 900, env: { BACKUP: backup ? '1' : '0' } };
  // the play-tests take the window size first (node test.mjs W H ...), except the monkey test: seconds per game, then W H
  if (name === 'monkey') plan.lead = ['14', 'W', 'H'];
  // the simulator on a build server draws more slowly than Chromium (a recipe takes up to twice as long), so the kitchen test gets more time
  // (the big iPad draws the most pixels: the fruit salad took 301 s there)
  if (name === 'auto') Object.assign(plan.env, { RECIPE_SECS: '480', STEP_SECS: '120' });
  if (name === 'lang') { plan.lang = t.args[0] || 'en'; plan.test = 'lang'; }
  if (!['ios', 'lang', 'after', 'store-shots'].includes(name)) plan.flat = true;   // a play-test from tools/playtest (see selftest.js)
  if (name === 'after' && t.args[0] === 'restore') { if (!code) { results.push({ test: t.spec, ok: false, error: 'no family code from the ios test (was the build made with SPG_TEST_API?)' }); return; } plan.args = ['restore', code]; }
  // the page gets process.argv = ['node', test, width, height, ...plan.args] (after.js reads [mode, code])
  console.log(`\n=== ${label}: ${t.spec}`);
  // close the app the way a person does: it goes to the background first (the game saves then), and is closed after that
  xq('launch', udid, 'com.apple.Preferences'); await sleep(2500);
  xq('terminate', udid, bundle);
  await sleep(800);
  const d = dir(); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'plan.json'), JSON.stringify(plan));
  x('launch', udid, bundle);
  const logFile = join(out, `${plan.prefix}.log`); writeFileSync(logFile, '');
  const t0 = Date.now(), limit = (plan.timeout + 120) * 1000; let seen = 0, logLen = 0, done = false;
  while (Date.now() - t0 < limit) {
    await sleep(400);
    const dd = dir();
    // the page's log, as it comes
    const lf = join(dd, `log-${plan.test}.txt`);
    if (existsSync(lf)) { const all = readFileSync(lf, 'utf8'); if (all.length > logLen) { const chunk = all.slice(logLen); logLen = all.length; process.stdout.write(chunk); appendFileSync(logFile, chunk); } }
    // a request from the page
    const rq = join(dd, 'req.json');
    if (existsSync(rq)) {
      let r = null; try { r = JSON.parse(readFileSync(rq, 'utf8')); } catch (_) { /* half written */ }
      if (r && r.n > seen) {
        seen = r.n; let ack = { done: true };
        if (r.action === 'shot') { const f = join(out, `${r.name}.png`); ack.saved = await screenshot(f, r); ack.file = f; console.log(`  [shot] ${r.name}`); }
        else if (r.action === 'background') {
          // the Settings app comes to the front (ours goes to the background), then ours is brought back; how long each took is reported
          const t1 = Date.now(); xq('launch', udid, 'com.apple.Preferences'); const away = Date.now() - t1;
          await sleep((r.seconds || 3) * 1000);
          const t2 = Date.now(); let err = null; try { x('launch', udid, bundle); } catch (e) { err = String(e.message || e).split('\n')[0]; }
          ack = { done: !err, error: err, away, back: Date.now() - t2 };
          await sleep(800); console.log(`  [background and back: Settings came up in ${away} ms, the app came back in ${ack.back} ms${err ? ', ' + err : ''}]`);
        } else ack = { done: false, error: 'unknown action ' + r.action };
        writeFileSync(join(dd, `ack-${r.n}.json`), JSON.stringify(ack));
      }
    }
    if (existsSync(join(dd, `done-${plan.test}.json`))) { done = true; break; }
  }
  let res = null;
  try { res = JSON.parse(readFileSync(join(dir(), `result-${plan.test}.json`), 'utf8')); } catch (_) { /* none */ }
  if (!done || !res) { await screenshot(join(out, `${plan.prefix}-TIMEOUT.png`)); res = { test: t.spec, ok: false, error: done ? 'no result file' : 'timed out' }; }
  // most play-tests print FAIL lines and a total (FAILS: n, n FAILED) without setting an exit code: those lines fail the test too
  const failLines = readFileSync(logFile, 'utf8').split('\n').filter(l => /^(FAIL\b|FAILS:|\d+ FAILED\b|PROBLEMS:)/.test(l.trim()));
  if (res.ok && failLines.length) { res.ok = false; res.error = res.error || `${failLines.length} FAIL line(s): ${failLines[0].trim().slice(0, 100)}`; }
  res.fails = failLines.length;
  res.test = t.spec; res.label = label; results.push(res);
  if (name === 'ios' && res.extra && res.extra.code) code = res.extra.code;
  writeFileSync(join(out, `${plan.prefix}.json`), JSON.stringify(res, null, 2));
  console.log(`=== ${label}: ${t.spec} ${res.ok ? 'PASSED' : 'FAILED'}${res.error ? ' (' + String(res.error).split('\n')[0] + ')' : ''} in ${Math.round((Date.now() - t0) / 1000)} s`);
}

for (const spec of tests) await runOne(parse(spec));
xq('terminate', udid, bundle);
const sumFile = join(out, `summary-${label}.json`); writeFileSync(sumFile, JSON.stringify(results, null, 2));
const md = [`### ${label}`, '', '| test | result | time | notes |', '|---|---|---|---|',
  ...results.map(r => `| ${r.test} | ${r.ok ? 'passed' : '**failed**'} | ${r.ms ? Math.round(r.ms / 1000) + ' s' : ''} | ${r.error ? String(r.error).split('\n')[0].slice(0, 120) : (r.extra && r.extra.checks ? Object.values(r.extra.checks).filter(Boolean).length + ' checks ok' : '')}${r.errs && r.errs.length ? ', ' + r.errs.length + ' page errors' : ''} |`), ''].join('\n');
writeFileSync(join(out, `summary-${label}.md`), md); console.log('\n' + md);
process.exitCode = results.every(r => r.ok) ? 0 : 1;
