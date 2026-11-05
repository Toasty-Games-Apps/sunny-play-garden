// After an upload: waits until Apple has processed the build, then adds it to a TestFlight beta group (internal testing).
//   ASC_KEY_PATH=AuthKey.p8 ASC_KEY_ID=... ASC_ISSUER_ID=... node testflight-group.mjs --app 6830382328 --version 1.0.0 --build 28 --group Family
// It uses the App Store Connect API with the same key the workflow signs with. The key and the token are never printed.
// Nothing here submits for review or releases anything. Exit 0 = the build is in the group; 1 = it could not be done (the reason is printed).
// For tests: ASC_API (another address for the API), ASC_POLL_MS (time between checks), ASC_WAIT_MIN (how long to wait).
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const APP = arg('app'), VERSION = arg('version'), BUILD = arg('build'), GROUP = arg('group', 'Family');
const API = process.env.ASC_API || 'https://api.appstoreconnect.apple.com';
const POLL = +(process.env.ASC_POLL_MS || 60000), WAIT = +(process.env.ASC_WAIT_MIN || 60) * 60000;
const { ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID } = process.env;
if (!APP || !VERSION || !BUILD || !ASC_KEY_PATH || !ASC_KEY_ID || !ASC_ISSUER_ID) {
  console.log('needs --app, --version, --build and ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID'); process.exit(1);
}
const key = createPrivateKey(readFileSync(ASC_KEY_PATH, 'utf8'));
const b64 = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');

// a fresh token for every request: ES256, 10 minutes (Apple allows at most 20)
function token() {
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' }) + '.' + b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' });
  return body + '.' + sign('sha256', Buffer.from(body), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
}

async function asc(method, path, body) {
  const res = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch (_) { /* not JSON */ }
  if (!res.ok) {
    const why = json?.errors?.map(e => `${e.title || ''}${e.detail ? ': ' + e.detail : ''}`).join('; ') || text.slice(0, 300);
    throw new Error(`${method} ${path.split('?')[0]} answered ${res.status}: ${why}`);
  }
  return json;
}
const q = o => '?' + Object.entries(o).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
const wait = ms => new Promise(r => setTimeout(r, ms));
const say = s => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);

async function main() {
  // 1. the group, first: if it is missing there is no point waiting
  const groups = (await asc('GET', '/v1/betaGroups' + q({ 'filter[app]': APP, 'filter[name]': GROUP, 'fields[betaGroups]': 'name,isInternalGroup,hasAccessToAllBuilds', limit: 50 }))).data || [];
  const group = groups.find(g => g.attributes?.name === GROUP);
  if (!group) throw new Error(`no TestFlight group called "${GROUP}" in app ${APP} (found: ${groups.map(g => g.attributes?.name).join(', ') || 'none'})`);
  say(`group "${GROUP}": ${group.attributes.isInternalGroup ? 'internal' : 'external'}${group.attributes.hasAccessToAllBuilds ? ', gets every build automatically' : ''}`);

  // 2. the build: it shows up a few minutes after the upload, then goes from PROCESSING to VALID
  let build = null, last = '';
  for (const t0 = Date.now(); ; await wait(POLL)) {
    const found = (await asc('GET', '/v1/builds' + q({ 'filter[app]': APP, 'filter[version]': BUILD, 'filter[preReleaseVersion.version]': VERSION, 'fields[builds]': 'version,processingState,usesNonExemptEncryption,expired,uploadedDate', limit: 5 }))).data || [];
    build = found[0] || null;
    const state = build ? build.attributes.processingState : 'not listed yet';
    if (state !== last) { say(`build ${VERSION} (${BUILD}): ${state}`); last = state; }
    if (state === 'VALID') break;
    if (state === 'FAILED' || state === 'INVALID') throw new Error(`Apple could not process build ${BUILD}: ${state}. App Store Connect > TestFlight shows why, and Apple sends an email.`);
    if (Date.now() - t0 > WAIT) throw new Error(`build ${BUILD} was still "${state}" after ${Math.round(WAIT / 60000)} minutes. Run this job again later, or add the build to "${GROUP}" in App Store Connect.`);
  }
  say(`export compliance: ${build.attributes.usesNonExemptEncryption === false ? 'answered (no non-exempt encryption, from Info.plist)' : 'NOT answered: ' + build.attributes.usesNonExemptEncryption}`);

  // 3. add it to the group (a group that gets every build already has it)
  const inGroup = async () => ((await asc('GET', `/v1/betaGroups/${group.id}/relationships/builds` + q({ limit: 200 }))).data || []).some(b => b.id === build.id);
  if (group.attributes.hasAccessToAllBuilds) say(`"${GROUP}" gets every build by itself: nothing to add`);
  else {
    if (await inGroup()) say(`build ${BUILD} is already in "${GROUP}"`);
    else { await asc('POST', `/v1/betaGroups/${group.id}/relationships/builds`, { data: [{ type: 'builds', id: build.id }] }); say(`added build ${BUILD} to "${GROUP}"`); }
    if (!(await inGroup())) throw new Error(`build ${BUILD} is still not in "${GROUP}" after adding it`);
  }

  // 4. what testers see
  const beta = (await asc('GET', `/v1/builds/${build.id}/buildBetaDetail`)).data?.attributes || {};
  say(`internal testing state: ${beta.internalBuildState || 'unknown'}`);
  if (beta.internalBuildState === 'MISSING_EXPORT_COMPLIANCE') throw new Error('the build waits for the export compliance answer in App Store Connect > TestFlight');
  say('done: testers in the group can install it from the TestFlight app. Nothing was submitted for review or released.');
}

main().catch(e => { console.log('TESTFLIGHT GROUP FAILED: ' + e.message); process.exit(1); });
