import { verifyIosRelease, verifyIosDeviceFamily } from '../scripts/ios-release-config.cjs';

it('accepts only the shipped iPhone device family for the initial release', () => {
  expect(() => verifyIosDeviceFamily({ UIDeviceFamily: [1] })).not.toThrow();
  for (const UIDeviceFamily of [undefined, [], [2], [1, 2]]) {
    expect(() => verifyIosDeviceFamily({ UIDeviceFamily })).toThrow();
  }
});

const valid: NodeJS.ProcessEnv = {
  CUSTOMER_DIRECT_IOS_RELEASE: 'true', NODE_ENV: 'production',
  CUSTOMER_IOS_BUILD_NUMBER: '2', CUSTOMER_HIGHEST_IOS_BUILD_NUMBER: '1',
  EXPO_PUBLIC_API_URL: 'https://api.gloceries.com', EXPO_PUBLIC_API_FOLLOW_METRO_HOST: 'false',
  APPLE_TEAM_ID: 'ABCDEFGHIJ', IOS_GOOGLE_MAPS_API_KEY: `AIza${'a'.repeat(35)}`,
  SENTRY_ORG: 'gloceries', SENTRY_PROJECT: 'customer-app',
  EXPO_PUBLIC_SENTRY_DSN: 'https://public@example.com/1', SENTRY_AUTH_TOKEN: 'synthetic-test-only',
};

it('accepts live iOS release settings without an Android Maps key', () => {
  expect(verifyIosRelease(valid)).toEqual({ apiOrigin: 'https://api.gloceries.com', buildNumber: '2',
    bundleIdentifier: 'com.gloceries.customer', mapsProvider: 'google' });
});

it.each([
  { EXPO_PUBLIC_API_URL: 'http://127.0.0.1:4000' },
  { EXPO_PUBLIC_API_URL: 'https://staging.example.com' },
  { EXPO_PUBLIC_API_URL: 'https://api.gloceries.com?token=unsafe' },
  { EXPO_PUBLIC_API_FOLLOW_METRO_HOST: 'true' },
  { NODE_ENV: 'development' as const }, { IOS_GOOGLE_MAPS_API_KEY: '' },
  { CUSTOMER_IOS_BUILD_NUMBER: '1' }, { CUSTOMER_IOS_BUILD_NUMBER: '1.0' },
  { CUSTOMER_HIGHEST_IOS_BUILD_NUMBER: '' }, { SENTRY_PROJECT: 'partner-app' },
  { SENTRY_AUTH_TOKEN: '' }, { EXPO_PUBLIC_RAZORPAY_KEY_SECRET: 'synthetic-only' },
])('rejects unsafe release settings: %j', overrides => {
  expect(() => verifyIosRelease({ ...valid, ...overrides })).toThrow();
});
