/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn, spawnSync } = require('node:child_process');
const { productionVersionCode } = require('../release-config.cjs');
const { verifySignature, manifestFacts, validateManifest, preflight } = require('../direct-android-release.cjs');
const { redact } = require('../redact-release-log.cjs');

const env = { PARTNER_ANDROID_VERSION_CODE: '15', PARTNER_HIGHEST_PLAY_VERSION_CODE: '13' };
const version = '1.0.4';
const updateUrl = 'https://u.expo.dev/f27829aa-b709-4d41-9186-8cde149ef0ac';

test('release version rejects reused, noncanonical and overflowing version codes', () => {
  assert.equal(productionVersionCode(env), 15);
  for (const [next, previous] of [['13', '13'], ['12', '13'], ['01', '1'], ['1.5', '1'], ['2; echo x', '1'], ['2100000001', '1'], ['15', '']]) {
    assert.throws(() => productionVersionCode({ PARTNER_ANDROID_VERSION_CODE: next, PARTNER_HIGHEST_PLAY_VERSION_CODE: previous }));
  }
});

test('packaged manifest gate rejects missing Maps/channel, debug builds and wrong identity', () => {
  const xml = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.gloceries.partner" android:versionCode="15" android:versionName="${version}">
  <application android:debuggable="false">
    <meta-data android:name="com.google.android.geo.API_KEY" android:value="AIza${'x'.repeat(35)}"/>
    <meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;production&quot;}"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL" android:value="${updateUrl}"/>
  </application></manifest>`;
  const facts = manifestFacts(xml);
  assert.doesNotThrow(() => validateManifest(facts, env, version));
  assert.equal(JSON.stringify(facts).includes('AIza'), false, 'Do not expose the key in verification reports.');
  for (const mutation of [
    { hasMapKey: false }, { headers: {} }, { headers: { 'expo-channel-name': 'preview' } },
    { package: 'com.gloceries.partner.validation' }, { versionCode: '1' }, { versionName: '1.0.3' },
    { debuggable: 'true' }, { updatesUrl: 'https://u.expo.dev/another-project' },
  ]) assert.throws(() => validateManifest({ ...facts, ...mutation }, env, version));
});

test('direct release fails closed before compilation when credentials are absent', () => {
  assert.throws(() => preflight({ PARTNER_DIRECT_ANDROID_RELEASE: 'true', ...env }), /ANDROID_KEYSTORE_BASE64.*SENTRY_AUTH_TOKEN/);
  assert.throws(() => preflight({ ...env }), /Direct production release mode is required/);
  assert.throws(() => require('../../config-monitoring.cjs').validateMonitoringConfig({ PARTNER_DIRECT_ANDROID_RELEASE: 'true' }), /Release crash monitoring is not configured/);
});

test('direct production app config supplies the version and OTA channel without EAS', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const c = require('./app.config.js').expo;
    console.log(JSON.stringify({ versionCode: c.android.versionCode, headers: c.updates.requestHeaders,
      runtimeVersion: c.runtimeVersion, package: c.android.package }));
  `], {
    cwd: path.resolve(__dirname, '../..'), encoding: 'utf8',
    env: {
      ...process.env, ...env, EXPO_NO_DOTENV: '1', PARTNER_DIRECT_ANDROID_RELEASE: 'true',
      EXPO_PUBLIC_API_URL: 'https://backend.example.com',
      EXPO_PUBLIC_SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
      SENTRY_ORG: 'fixture-org', SENTRY_PROJECT: 'fixture-project', SENTRY_AUTH_TOKEN: 'fixture-only-token',
      GOOGLE_MAPS_API_KEY: 'AIza' + 'x'.repeat(35),
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.equal(config.versionCode, 15);
  assert.equal(config.headers['expo-channel-name'], 'production');
  assert.equal(config.package, 'com.gloceries.partner');
  assert.deepEqual(config.runtimeVersion, { policy: 'appVersion' });
});

test('admin bootstrap refuses non-admin access before reading credentials or making mutations', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'partner-admin-setup-'));
  try {
    const gh = path.join(dir, 'gh');
    const record = path.join(dir, 'requests.jsonl');
    fs.writeFileSync(gh, `#!/usr/bin/env node
      require('node:fs').appendFileSync(process.env.PARTNER_TEST_REQUESTS, JSON.stringify(process.argv.slice(2))+'\\n');
      console.log(JSON.stringify({ permissions: { admin: false } }));
    `, { mode: 0o700 });
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../../scripts/configure-partner-release.cjs'), '/nonexistent/private-credentials.json'], {
      encoding: 'utf8', env: { ...process.env, PATH: dir + path.delimiter + process.env.PATH, PARTNER_TEST_REQUESTS: record },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /repository-admin access is required/);
    assert.deepEqual(fs.readFileSync(record, 'utf8').trim().split('\n').map(JSON.parse), [['api', 'repos/gloceriesapp-prog/Flikk']]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('release log redactor covers secrets split across streamed chunks', async () => {
  const token = 'sentry-test-secret-value';
  const child = spawn(process.execPath, [path.resolve(__dirname, '../redact-release-log.cjs')], {
    env: { ...process.env, SENTRY_AUTH_TOKEN: token, ANDROID_KEYSTORE_PASSWORD: 'fixture-password' },
  });
  let output = '';
  child.stdout.on('data', bytes => { output += bytes.toString(); });
  const completion = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  child.stdin.write('Uploading with sentry-test-');
  await new Promise(resolve => setTimeout(resolve, 30));
  child.stdin.end('secret-value\nfixture-password\nBuild successful\n');
  assert.equal(await completion, 0);
  assert.equal(output, 'Uploading with [redacted]\n[redacted]\nBuild successful\n');
  assert.equal(redact('API key: AIza' + 'z'.repeat(35), {}), 'API key: [redacted Maps key]');
});

test('signature gate accepts the correct upload certificate and rejects tampering, unsigned and wrong signer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'partner-upload-signature-'));
  const bin = name => process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', name) : name;
  const passwordEnv = { ...process.env, PARTNER_TEST_STOREPASS: 'fixture-password-only' };
  const run = (name, args) => execFileSync(bin(name), args, { cwd: dir, env: passwordEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    run('keytool', ['-genkeypair', '-alias', 'upload-fixture', '-keystore', 'upload.p12', '-storetype', 'PKCS12',
      '-storepass:env', 'PARTNER_TEST_STOREPASS', '-keypass:env', 'PARTNER_TEST_STOREPASS',
      '-keyalg', 'RSA', '-keysize', '2048', '-validity', '30', '-dname', 'CN=Partner Release Test']);
    const cert = run('keytool', ['-J-Duser.language=en', '-list', '-v', '-keystore', 'upload.p12', '-storepass:env', 'PARTNER_TEST_STOREPASS']);
    const expected = cert.match(/SHA256:\s*([A-Fa-f0-9:]+)/)[1];
    fs.writeFileSync(path.join(dir, 'payload.txt'), 'original release');
    run('jar', ['--create', '--file', 'signed.aab', 'payload.txt']);
    fs.copyFileSync(path.join(dir, 'signed.aab'), path.join(dir, 'unsigned.aab'));
    run('jarsigner', ['-keystore', 'upload.p12', '-storepass:env', 'PARTNER_TEST_STOREPASS',
      '-keypass:env', 'PARTNER_TEST_STOREPASS', 'signed.aab', 'upload-fixture']);
    assert.doesNotThrow(() => verifySignature(path.join(dir, 'signed.aab'), expected));
    assert.throws(() => verifySignature(path.join(dir, 'signed.aab'), 'AB'.repeat(32)), /unexpected upload certificate/);
    assert.throws(() => verifySignature(path.join(dir, 'unsigned.aab'), expected), /unsigned/);
    fs.writeFileSync(path.join(dir, 'payload.txt'), 'tampered release');
    run('jar', ['--update', '--file', 'signed.aab', 'payload.txt']);
    assert.throws(() => verifySignature(path.join(dir, 'signed.aab'), expected), /failed during release verification/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
