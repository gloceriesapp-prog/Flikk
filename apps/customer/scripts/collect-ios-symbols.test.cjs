const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseUUIDs, covers, findBundles } = require('./collect-ios-symbols.cjs');
const uuid = '27DB6AD4-FD54-3E9E-9A3D-345C8635FC0A';
test('accepts matching vendor device UUIDs, but rejects simulator and other-build symbols', () => {
  const device = parseUUIDs(`UUID: ${uuid.toLowerCase()} (arm64) /vendor/ExpoImage`);
  assert.equal(covers([{ uuid, arch: 'arm64' }], device), true);
  assert.equal(covers([{ uuid, arch: 'x86_64' }], device), false);
  assert.equal(covers([{ uuid: '00000000-0000-0000-0000-000000000000', arch: 'arm64' }], device), false);
});
test('requires every architecture and rejects empty or malformed symbol output', () => {
  assert.equal(covers([], []), false);
  assert.deepEqual(parseUUIDs('warning: no debug symbols'), []);
  assert.equal(covers([{ uuid, arch: 'arm64' }, { uuid, arch: 'x86_64' }], [{ uuid, arch: 'arm64' }]), false);
});
test('discovers vendor symbols behind CocoaPods symlinks without following directory cycles forever', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-symbol-discovery-'));
  try {
    const vendor = path.join(root, 'vendor'); fs.mkdirSync(vendor);
    const bundle = path.join(vendor, 'Image.framework.dSYM'); fs.mkdirSync(bundle);
    const pods = path.join(root, 'Pods'); fs.mkdirSync(pods);
    fs.symlinkSync(vendor, path.join(pods, 'Image.xcframework'));
    fs.symlinkSync(pods, path.join(vendor, 'cycle'));
    assert.deepEqual(findBundles([pods, vendor]), [fs.realpathSync(bundle)]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
