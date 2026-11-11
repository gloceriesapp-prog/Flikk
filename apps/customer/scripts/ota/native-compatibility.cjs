/* global __dirname */
// Conservative native-input inventory, independent of API keys and machine paths.
// Native build and OTA jobs use the same committed source inventory.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const ROOT = path.resolve(__dirname, '../../../..');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();

function isNativeInput(file) {
  return /^(package(-lock)?\.json|\.npmrc|\.nvmrc)$/.test(file)
    || /^(config\/|patches\/)/.test(file)
    || /^packages\/(?!home-content\/)/.test(file)
    || /^apps\/customer\/(package(-lock)?\.json|app\.config\.[cm]?js|app\.json|eas\.json|babel\.config\.[cm]?js|metro\.config\.[cm]?js|native-runtime\.json)$/.test(file)
    || /^apps\/customer\/(plugins\/|modules\/|native[^/]*\/|patches\/|android\/|ios\/|assets\/(fonts\/|.*icon|.*splash|customer-welcome-launch\.png))/.test(file)
    || /^apps\/customer\/scripts\/(release-config|ios-release-config|ota\/native-compatibility)\.cjs$/.test(file);
}
function sourceIdentity(ref = 'HEAD') {
  assert.match(ref, /^(HEAD|[a-f0-9]{40})$/, 'Use HEAD or an immutable 40-character build commit.');
  const files = git('ls-tree', '-r', '--full-tree', ref).split('\n').filter(line => isNativeInput(line.split('\t')[1] || ''));
  return createHash('sha256').update(files.join('\n')).digest('hex');
}
function checkCompatibility(base, head = 'HEAD') {
  verifySourceCommit(git('rev-parse', head));
  assert.match(base, /^[a-f0-9]{40}$/, 'Choose the exact source commit of the installed native build.');
  git('merge-base', '--is-ancestor', base, head);
  assert.equal(sourceIdentity(head), sourceIdentity(base), 'Native inputs changed. Create and test a new store/preview build before publishing OTA.');
  return { schemaVersion: 1, buildCommit: base, sourceCommit: git('rev-parse', head), nativeHash: sourceIdentity(head) };
}
if (require.main === module) {
  try {
    const result = checkCompatibility(process.env.OTA_NATIVE_BUILD_COMMIT);
    fs.writeFileSync(process.env.OTA_COMPATIBILITY_REPORT || '/tmp/customer-ota-compatibility.json', JSON.stringify(result, null, 2) + '\n');
    console.log('Native inputs match the selected installed build.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { isNativeInput, sourceIdentity, checkCompatibility };

function runtimeAt(ref, platform) {
  assert.ok(['android', 'ios'].includes(platform), 'Choose android or ios.');
  const file = 'apps/customer/native-runtime.json';
  if (!git('ls-tree', '--name-only', ref, file)) return 'legacy-runtime';
  const value = JSON.parse(git('show', `${ref}:${file}`))[platform];
  assert.ok(typeof value === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(value) && value !== 'legacy-runtime', 'Invalid native runtime ID.');
  return value;
}
function checkNativeRelease(base, platform, head = 'HEAD') {
  verifySourceCommit(git('rev-parse', head));
  assert.match(base || '', /^[a-f0-9]{40}$/, 'Select the previous installed native build commit.');
  git('merge-base', '--is-ancestor', base, head);
  const runtime = runtimeAt(head, platform);
  assert.ok(typeof runtime === 'string' && runtime !== 'legacy-runtime', 'A native runtime ID is required.');
  if (sourceIdentity(base) !== sourceIdentity(head)) {
    assert.notEqual(runtime, runtimeAt(base, platform), 'Native inputs changed without a new runtime ID. Increment native-runtime.json before a store build.');
  }
  return runtime;
}
module.exports.runtimeAt = runtimeAt;
module.exports.checkNativeRelease = checkNativeRelease;

function verifySourceCommit(expected) {
  assert.equal(expected, git('rev-parse', 'HEAD'), 'Release source metadata must match the committed build source.');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--',
    'apps/customer', 'packages/shared', 'packages/home-content', 'config', 'patches', 'package.json', 'package-lock.json', '.npmrc');
  assert.equal(dirty, '', 'Commit app-source changes before building or exporting an update.');
}
module.exports.verifySourceCommit = verifySourceCommit;
