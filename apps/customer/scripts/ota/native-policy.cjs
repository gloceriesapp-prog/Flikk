const assert = require('node:assert/strict');
function verifyIosUpdatePolicy(plist, runtime, channel = 'production') {
  assert.equal(plist.EXUpdatesCheckOnLaunch, 'ERROR_RECOVERY_ONLY', 'iOS must use download-only idle checks.');
  assert.equal(Number(plist.EXUpdatesLaunchWaitMs), 0, 'iOS must not wait for downloads at launch.');
  assert.equal(plist.EXUpdatesRuntimeVersion, runtime, 'iOS native runtime mismatch.');
  assert.equal(plist.EXUpdatesURL, 'https://u.expo.dev/a98e9f05-620b-4efb-8624-99d724667e7c');
  assert.ok(['preview', 'production'].includes(channel));
  assert.equal(plist.EXUpdatesRequestHeaders?.['expo-channel-name'], channel, 'iOS native update channel mismatch.');
}
module.exports = { verifyIosUpdatePolicy };
