import { execFileSync } from 'node:child_process';
import path from 'node:path';

const configPath = path.resolve(__dirname, '../app.config.js');
const androidKey = `AIza${'a'.repeat(35)}`;
const iosKey = `AIza${'b'.repeat(35)}`;

function config(overrides: Record<string, string> = {}) {
  const env = { ...process.env };
  for (const name of ['GOOGLE_GEOCODING_MAP_KEY', 'GOOGLE_GEOCODING_ROUTE_KEY', 'GOOGLE_MAPS_API_KEY', 'ANDROID_GOOGLE_MAPS_API_KEY', 'IOS_GOOGLE_MAPS_API_KEY',
    'GOOGLE_GEOCODING_API_KEY', 'EAS_BUILD', 'EAS_BUILD_PROFILE', 'EAS_BUILD_PLATFORM']) delete env[name];
  Object.assign(env, { NODE_ENV: 'development', EXPO_PUBLIC_API_URL: 'http://localhost:4000' }, overrides);
  return JSON.parse(execFileSync(process.execPath, ['-e',
    'const {expo}=require(process.argv[1]);console.log(JSON.stringify({android:expo.android.config.googleMaps.apiKey,ios:expo.ios.config?.googleMapsApiKey,hasIos:expo.extra.hasIosGoogleMaps}))', configPath],
  { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}

describe('customer native map configuration', () => {
  it('keeps Android and iOS keys separate from backend geocoding', () => {
    expect(config({ ANDROID_GOOGLE_MAPS_API_KEY: androidKey, IOS_GOOGLE_MAPS_API_KEY: iosKey }))
      .toEqual({ android: androidKey, ios: iosKey, hasIos: true });
  });
  it('supports the existing Android variable and Apple Maps on iOS', () => {
    expect(config({ GOOGLE_GEOCODING_MAP_KEY: androidKey })).toEqual({ android: androidKey, hasIos: false });
    expect(config({ GOOGLE_MAPS_API_KEY: androidKey })).toEqual({ android: androidKey, hasIos: false });
  });
  it('rejects conflicting native configuration before building', () => {
    expect(() => config({ GOOGLE_MAPS_API_KEY: androidKey, ANDROID_GOOGLE_MAPS_API_KEY: iosKey })).toThrow();
    expect(() => config({ ANDROID_GOOGLE_MAPS_API_KEY: androidKey, GOOGLE_GEOCODING_API_KEY: androidKey })).toThrow();
  });
  it('requires an Android key on the actual release builder', () => {
    expect(() => config({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'android',
      EXPO_PUBLIC_API_URL: 'https://api.example.com' })).toThrow();
  });
  it('verifies an iOS Apple Maps release without an Android key', () => {
    const env = { ...process.env };
    for (const name of ['GOOGLE_GEOCODING_MAP_KEY', 'GOOGLE_GEOCODING_ROUTE_KEY', 'GOOGLE_MAPS_API_KEY', 'ANDROID_GOOGLE_MAPS_API_KEY', 'IOS_GOOGLE_MAPS_API_KEY',
      'GOOGLE_GEOCODING_API_KEY']) delete env[name];
    Object.assign(env, { EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'ios',
      EXPO_PUBLIC_API_URL: 'https://api.example.com', EXPO_PUBLIC_SENTRY_DSN: 'https://public@example.com/1',
      SENTRY_ORG: 'test', SENTRY_PROJECT: 'test', SENTRY_AUTH_TOKEN: 'test-only' });
    expect(execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/verify-release.cjs')],
      { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })).toContain('release configuration verified');
  });
});
