/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateUpdates, validatePreview } = require('./update-report.cjs');
const { isNativeInput } = require('./native-compatibility.cjs');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'customer-ota-test-'));
  const write = (file, value) => { const full = path.join(root, file); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, value); };
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init'); git('config', 'user.name', 'Release test'); git('config', 'user.email', 'test@example.invalid');
  const script = 'apps/customer/scripts/ota/native-compatibility.cjs';
  write(script, fs.readFileSync(path.join(__dirname, 'native-compatibility.cjs')));
  write('apps/customer/native-runtime.json', JSON.stringify({ android: 'android-1', ios: 'ios-1' }));
  write('apps/customer/package-lock.json', '{}');
  const commit = () => { git('add', '.'); git('commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  return { root, write, commit, guard: require(path.join(root, script)) };
}

test('native guard permits JS/images but blocks dependencies and requires a runtime bump for a native release', () => {
  const f = fixture();
  try {
    const base = f.commit();
    f.guard.verifySourceCommit(base);
    f.write('apps/customer/src/screens/Home.tsx', 'export const title = "New UI";');
    assert.throws(() => f.guard.verifySourceCommit(base), /Commit app-source changes/);
    f.write('apps/customer/assets/banners/promo.png', 'image'); f.commit();
    assert.throws(() => f.guard.verifySourceCommit(base), /source metadata/);
    assert.equal(f.guard.checkCompatibility(base).buildCommit, base);
    f.write('apps/customer/package-lock.json', '{"nativeSdk":2}'); f.commit();
    assert.throws(() => f.guard.checkCompatibility(base), /Native inputs changed/);
    assert.throws(() => f.guard.checkNativeRelease(base, 'android'), /without a new runtime/);
    f.write('apps/customer/native-runtime.json', JSON.stringify({ android: 'android-2', ios: 'ios-1' })); f.commit();
    assert.equal(f.guard.checkNativeRelease(base, 'android'), 'android-2');
    assert.throws(() => f.guard.checkNativeRelease(base, 'ios'), /without a new runtime/);
    assert.throws(() => f.guard.checkCompatibility('main'), /exact source commit/);
  } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
});

test('native plugins, shared configuration, icons and native sources are protected', () => {
  for (const file of ['apps/customer/plugins/maps.cjs', 'apps/customer/ios/AppDelegate.swift',
    'apps/customer/modules/upi/index.ts', 'packages/shared/config/maps.cjs', 'patches/native.patch',
    'apps/customer/assets/icon.png', 'apps/customer/assets/fonts/font.otf', 'apps/customer/app.config.js']) assert.equal(isNativeInput(file), true, file);
  for (const file of ['apps/customer/src/Home.tsx', 'apps/customer/assets/products/item.webp', 'apps/admin/src/app/page.tsx']) assert.equal(isNativeInput(file), false, file);
});

const group = 'a0000000-0000-4000-8000-000000000001';
const expected = { sourceCommit: 'a'.repeat(40), buildCommit: 'b'.repeat(40), nativeHash: 'hash', platform: 'ios', runtimeVersion: 'ios-2' };
const report = { ...expected, schemaVersion: 1, channel: 'preview', group, updateId: group };
const run = { path: '.github/workflows/customer-ota.yml', event: 'workflow_dispatch', conclusion: 'success', head_branch: 'main', head_sha: expected.sourceCommit };
test('production promotion requires exact successful preview provenance', () => {
  assert.equal(validatePreview(report, run, expected), group);
  for (const bad of [{ channel: 'production' }, { sourceCommit: 'c'.repeat(40) }, { platform: 'android' }, { runtimeVersion: 'old' }, { buildCommit: 'wrong' }]) {
    assert.throws(() => validatePreview({ ...report, ...bad }, run, expected));
  }
  for (const bad of [{ path: '.github/workflows/another.yml' }, { conclusion: 'failure' }, { event: 'pull_request' }, { head_branch: 'feature' }, { head_sha: 'wrong' }]) {
    assert.throws(() => validatePreview(report, { ...run, ...bad }, expected));
  }
});
test('published metadata must identify only the expected platform and runtime', () => {
  const update = { platform: 'ios', runtimeVersion: 'ios-2', group, id: group };
  assert.equal(validateUpdates([update], 'ios', 'ios-2'), group);
  for (const data of [[], [update, update], [{ ...update, platform: 'android' }], [{ ...update, runtimeVersion: 'old' }]]) {
    assert.throws(() => validateUpdates(data, 'ios', 'ios-2'));
  }
});

test('export verification rejects a local backend or wrong platform before publication', () => {
  const { verifyExport } = require('./export-update.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'customer-ota-export-'));
  try {
    const metadata = { fileMetadata: { android: { bundle: 'app.hbc' } } };
    fs.writeFileSync(path.join(root, 'app.hbc'), 'https://api.gloceries.com');
    verifyExport(metadata, root, 'android');
    assert.throws(() => verifyExport(metadata, root, 'android', 'a'.repeat(40)), /source identity/);
    fs.writeFileSync(path.join(root, 'app.hbc'), 'https://api.gloceries.com ' + 'a'.repeat(40));
    verifyExport(metadata, root, 'android', 'a'.repeat(40));
    assert.throws(() => verifyExport(metadata, root, 'ios'), /requested platform/);
    fs.writeFileSync(path.join(root, 'app.hbc'), 'https://api.gloceries.com http://localhost:4000');
    assert.throws(() => verifyExport(metadata, root, 'android'), /local API/);
    assert.throws(() => verifyExport({ fileMetadata: { android: { bundle: '../outside' } } }, root, 'android'), /escapes/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
