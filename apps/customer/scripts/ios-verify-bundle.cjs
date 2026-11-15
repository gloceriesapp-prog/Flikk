// Checks the JavaScript actually embedded in an iOS build, not just the
// environment it was built from. Metro's transform cache is not keyed on
// EXPO_PUBLIC_* values, so an archive made on a Mac that earlier bundled with a
// different (or missing) EXPO_PUBLIC_API_URL can ship that old value: the app
// then crashes at launch ("Set EXPO_PUBLIC_API_URL") or talks to a dev server.
//
// Usage: node scripts/ios-verify-bundle.cjs <Gloceries.app | .xcarchive>
// Exit 1 when the bundle lacks the release API origin or contains a local one.
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');

function findBundle(target) {
  const direct = path.join(target, 'main.jsbundle');
  if (fs.existsSync(direct)) return direct;
  const apps = path.join(target, 'Products', 'Applications');
  if (fs.existsSync(apps)) {
    for (const app of fs.readdirSync(apps)) {
      const candidate = path.join(apps, app, 'main.jsbundle');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  throw new Error(`No main.jsbundle in ${target}`);
}

function verifyBundle(bundle, apiOrigin) {
  assert.ok(bundle.includes(Buffer.from(apiOrigin)), `The bundle does not contain ${apiOrigin}. Rebuild with EXTRA_PACKAGER_ARGS=--reset-cache.`);
  // localhost appears legitimately (development-only fallbacks in library and
  // shared code); a LAN IP or tunnel only appears when a dev URL was inlined.
  for (const local of ['://10.', '://192.168.', '://172.16.', '.ngrok']) {
    assert.ok(!bundle.includes(Buffer.from(local)), `The bundle contains a local/tunnel address (${local}). Rebuild with EXTRA_PACKAGER_ARGS=--reset-cache.`);
  }
}

if (require.main === module) {
  try {
    const target = process.argv[2];
    assert.ok(target, 'Pass the built Gloceries.app or .xcarchive path.');
    const apiOrigin = new URL(process.env.EXPO_PUBLIC_API_URL || 'https://api.gloceries.com').origin;
    const file = findBundle(target);
    verifyBundle(fs.readFileSync(file), apiOrigin);
    console.log(`Bundle OK: ${file} uses ${apiOrigin} and no local address.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { findBundle, verifyBundle };
