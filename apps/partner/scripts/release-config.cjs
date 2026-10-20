const assert = require('node:assert/strict');

function releaseVersionCode(value, label = 'Version code') {
  assert.match(String(value ?? ''), /^[1-9]\d*$/, `${label} must be a positive integer.`);
  const number = Number(value);
  assert.ok(Number.isSafeInteger(number) && number <= 2100000000, `${label} exceeds Android's version-code limit.`);
  return number;
}

function productionVersionCode(env) {
  const next = releaseVersionCode(env.PARTNER_ANDROID_VERSION_CODE);
  const previous = releaseVersionCode(env.PARTNER_HIGHEST_PLAY_VERSION_CODE, 'Highest Play version code');
  assert.ok(next > previous, 'Version code must exceed the highest version code the operator confirmed in Play Console.');
  return next;
}

module.exports = { releaseVersionCode, productionVersionCode };
