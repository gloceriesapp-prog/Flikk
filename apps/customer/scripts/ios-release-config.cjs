const assert = require('node:assert/strict');

function iosBuildNumber(env = process.env) {
  const next = env.CUSTOMER_IOS_BUILD_NUMBER;
  const previous = env.CUSTOMER_HIGHEST_IOS_BUILD_NUMBER;
  assert.match(String(next ?? ''), /^[1-9][0-9]{0,3}$/, 'Set CUSTOMER_IOS_BUILD_NUMBER to a positive build number of at most four digits.');
  assert.match(String(previous ?? ''), /^(0|[1-9][0-9]{0,3})$/, 'Set CUSTOMER_HIGHEST_IOS_BUILD_NUMBER after checking App Store Connect.');
  assert.ok(Number(next) > Number(previous), 'The iOS build number must exceed the highest uploaded customer build.');
  return next;
}

function verifyIosRelease(env = process.env) {
  assert.equal(env.CUSTOMER_DIRECT_IOS_RELEASE, 'true', 'Enable direct iOS release mode.');
  assert.equal(env.NODE_ENV, 'production', 'The iOS archive must bundle production JavaScript.');
  const api = new URL(env.EXPO_PUBLIC_API_URL);
  assert.equal(api.origin, 'https://api.gloceries.com', 'Use the live Gloceries HTTPS API for this App Store release.');
  assert.equal(api.username + api.password + api.search + api.hash, '', 'The release API must not contain credentials, a query or a fragment.');
  assert.notEqual(env.EXPO_PUBLIC_API_FOLLOW_METRO_HOST, 'true', 'Disable Metro-host API rewriting for releases.');
  assert.match(String(env.APPLE_TEAM_ID ?? ''), /^[A-Z0-9]{10}$/, 'Configure the intended Apple Developer team.');
  assert.equal(env.SENTRY_ORG, 'gloceries', 'Use the Gloceries Sentry organization.');
  assert.equal(env.SENTRY_PROJECT, 'customer-app', 'Use the customer-app Sentry project.');
  assert.ok(env.SENTRY_AUTH_TOKEN?.trim(), 'Configure SENTRY_AUTH_TOKEN in build secret storage.');
  assert.equal(new URL(env.EXPO_PUBLIC_SENTRY_DSN).protocol, 'https:', 'Configure the customer HTTPS Sentry DSN.');
  const { iosGoogleMapsApiKey } = require('../../../packages/shared/config/google-maps.cjs').resolveNativeMapKeys(env);
  assert.ok(iosGoogleMapsApiKey, 'Configure IOS_GOOGLE_MAPS_API_KEY for the iOS Google Maps SDK.');
  for (const name of Object.keys(env)) {
    assert.ok(!/^EXPO_PUBLIC_(RAZORPAY_(KEY_SECRET|WEBHOOK_SECRET)|.*SECRET)/.test(name), 'Private provider credentials must not be bundled into the app.');
  }
  return { apiOrigin: api.origin, buildNumber: iosBuildNumber(env), bundleIdentifier: 'com.gloceries.customer', mapsProvider: 'google' };
}

if (require.main === module) {
  try { console.log(JSON.stringify(verifyIosRelease(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { iosBuildNumber, verifyIosRelease };
