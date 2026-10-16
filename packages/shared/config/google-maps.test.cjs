const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveNativeMapKeys } = require('./google-maps.cjs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const android = `AIza${'a'.repeat(35)}`;
const ios = `AIza${'b'.repeat(35)}`;
test('resolves separate platform credentials and trims values', () => {
  assert.deepEqual(resolveNativeMapKeys({ ANDROID_GOOGLE_MAPS_API_KEY: ` ${android} `, IOS_GOOGLE_MAPS_API_KEY: ios }),
    { androidGoogleMapsApiKey: android, iosGoogleMapsApiKey: ios });
});
test('supports existing Android variable without changing deployed config names', () => {
  assert.equal(resolveNativeMapKeys({ GOOGLE_GEOCODING_MAP_KEY: android }).androidGoogleMapsApiKey, android);
  assert.equal(resolveNativeMapKeys({ GOOGLE_MAPS_API_KEY: android }).androidGoogleMapsApiKey, android);
  assert.doesNotThrow(() => resolveNativeMapKeys({ GOOGLE_MAPS_API_KEY: android, ANDROID_GOOGLE_MAPS_API_KEY: android }));
});
test('rejects ambiguous or backend-only native credentials without exposing values', () => {
  for (const env of [
    { GOOGLE_MAPS_API_KEY: android, ANDROID_GOOGLE_MAPS_API_KEY: ios },
    { GOOGLE_GEOCODING_MAP_KEY: android, GOOGLE_MAPS_API_KEY: ios },
    { GOOGLE_GEOCODING_MAP_KEY: android, GOOGLE_GEOCODING_ROUTE_KEY: android },
    { GOOGLE_MAPS_API_KEY: android, GOOGLE_GEOCODING_API_KEY: android },
    { GOOGLE_MAPS_API_KEY: android, GOOGLE_ROUTES_API_KEY: android },
    { IOS_GOOGLE_MAPS_API_KEY: ios, GOOGLE_PLACES_API_KEY: ios },
    { GOOGLE_MAPS_API_KEY: 'YOUR_KEY' },
  ]) {
    assert.throws(() => resolveNativeMapKeys(env), (error) => !error.message.includes(android) && !error.message.includes(ios));
  }
});
test('requires Android maps key on actual release builder, not EAS metadata read or iOS Apple fallback', () => {
  assert.throws(() => resolveNativeMapKeys({ EAS_BUILD: 'true', EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'production' }));
  for (const env of [{}, { EAS_BUILD_PROFILE: 'production' },
    { EAS_BUILD: 'true', EAS_BUILD_PLATFORM: 'ios', EAS_BUILD_PROFILE: 'production' },
    { EAS_BUILD: 'true', EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'development' }]) {
    assert.deepEqual(resolveNativeMapKeys(env), { androidGoogleMapsApiKey: undefined, iosGoogleMapsApiKey: undefined });
  }
});
for (const app of ['customer', 'partner', 'rider']) {
  test(`${app} native config wires platform keys and optional iOS provider flag`, () => {
    const configPath = path.resolve(__dirname, '../../../apps', app, 'app.config.js');
    for (const enableIos of [false, true]) {
      const output = execFileSync(process.execPath, ['-e',
        'const {expo}=require(process.argv[1]);process.stdout.write(JSON.stringify({android:expo.android.config.googleMaps.apiKey,ios:expo.ios.config?.googleMapsApiKey,iosEnabled:expo.extra.hasIosGoogleMaps}));', configPath],
      { env: { NODE_ENV: 'development', ANDROID_GOOGLE_MAPS_API_KEY: android,
        ...(enableIos ? { IOS_GOOGLE_MAPS_API_KEY: ios } : {}) }, encoding: 'utf8' });
      assert.deepEqual(JSON.parse(output), {
        android, ...(enableIos ? { ios } : {}), iosEnabled: enableIos,
      });
    }
  });
}
