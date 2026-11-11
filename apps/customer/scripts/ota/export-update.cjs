/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Buffer } = require('node:buffer');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runtimeAt, verifySourceCommit } = require('./native-compatibility.cjs');
const APP = path.resolve(__dirname, '../..');
function verifyExport(metadata, directory, platform, sourceCommit) {
  assert.deepEqual(Object.keys(metadata.fileMetadata || {}), [platform], 'Export must contain only the requested platform.');
  const bundle = metadata.fileMetadata[platform]?.bundle;
  assert.ok(typeof bundle === 'string' && !path.isAbsolute(bundle), 'Missing exported bundle.');
  const file = path.resolve(directory, bundle);
  assert.ok(file.startsWith(path.resolve(directory) + path.sep), 'Bundle path escapes export directory.');
  const bytes = fs.readFileSync(file);
  if (sourceCommit) assert.ok(bytes.includes(Buffer.from(sourceCommit)), 'Export is missing its compiled source identity.');
  assert.ok(bytes.includes(Buffer.from('https://api.gloceries.com')), 'Export does not contain the live API.');
  for (const url of ['http://localhost:', 'http://127.0.0.1:', 'http://192.168.']) {
    assert.ok(!bytes.includes(Buffer.from(url)), 'Export contains a local API address.');
  }
}
if (require.main === module) {
  try {
    const platform = process.env.OTA_PLATFORM;
    verifySourceCommit(process.env.GITHUB_SHA);
    assert.ok(['android', 'ios'].includes(platform));
    assert.equal(process.env.EXPO_PUBLIC_API_URL, 'https://api.gloceries.com');
    assert.equal(process.env.EXPO_PUBLIC_API_FOLLOW_METRO_HOST, 'false');
    assert.equal(new URL(process.env.EXPO_PUBLIC_SENTRY_DSN).protocol, 'https:');
    const { expo } = require('../../app.config.js');
    assert.equal(expo.extra?.release?.sourceCommit, process.env.GITHUB_SHA, 'Export source commit mismatch.');
    assert.equal(expo.extra?.eas?.projectId, 'a98e9f05-620b-4efb-8624-99d724667e7c');
    assert.equal(expo[platform]?.runtimeVersion ?? expo.runtimeVersion, runtimeAt('HEAD', platform));
    const directory = process.env.OTA_EXPORT_DIR;
    assert.ok(directory && path.isAbsolute(directory));
    execFileSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', platform,
      '--output-dir', directory, '--source-maps'], { cwd: APP, stdio: 'inherit' });
    verifyExport(JSON.parse(fs.readFileSync(path.join(directory, 'metadata.json'))), directory, platform, process.env.GITHUB_SHA);
    console.log('OTA export uses the expected platform, runtime and live API.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { verifyExport };
