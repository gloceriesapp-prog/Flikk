const assert = require('node:assert/strict');

function productionVersionCode(env = process.env) {
  const requested = env.CUSTOMER_ANDROID_VERSION_CODE;
  const highest = env.CUSTOMER_HIGHEST_PLAY_VERSION_CODE;
  for (const [label, value] of [['Requested version code', requested], ['Highest Play version code', highest]]) {
    assert.match(String(value ?? ''), /^(0|[1-9][0-9]*)$/, label + ' must be a whole number.');
    assert.ok(Number.isSafeInteger(Number(value)) && Number(value) <= 2100000000, label + ' exceeds the Android limit.');
  }
  assert.ok(Number(requested) > Number(highest), 'New version code must exceed every customer version code uploaded to Play.');
  return Number(requested);
}

module.exports = { productionVersionCode };
