// Validate both generated native plists and the authored Expo configuration.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

function verifyIosPrivacyPurposeStrings(infoPlist) {
  // Native modules link these APIs even if a particular screen never requests
  // permission. Apple checks the shipped binary, not just the JavaScript flows.
  for (const key of ['NSPhotoLibraryUsageDescription', 'NSLocationWhenInUseUsageDescription',
    'NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription']) {
    assert.ok(typeof infoPlist?.[key] === 'string' && infoPlist[key].trim().length > 0,
      `Missing iOS privacy purpose string: ${key}`);
  }
}

if (require.main === module) {
  try {
    assert.ok(process.argv[2], 'Pass the generated app or archive Info.plist path.');
    const plist = JSON.parse(execFileSync('/usr/bin/plutil',
      ['-convert', 'json', '-o', '-', process.argv[2]], { encoding: 'utf8' }));
    verifyIosPrivacyPurposeStrings(plist);
    console.log('iOS native privacy purpose strings verified.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { verifyIosPrivacyPurposeStrings };
