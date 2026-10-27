import { verifyBundleSingletons } from '../scripts/verify-bundle-singletons.cjs';
import { SINGLETONS } from '../scripts/metro-singletons.cjs';

const sources = [...SINGLETONS].map(name => `/app/node_modules/${name}/index.js`);

test('accepts a bundle with one complete native runtime', () => {
  expect(verifyBundleSingletons({ sources }).status).toBe('passed');
});

test('rejects the release-crash topology: a second React Native registry', () => {
  expect(() => verifyBundleSingletons({ sources: [
    ...sources,
    '/repo/node_modules/react-native/Libraries/ReactNative/AppRegistryImpl.js',
  ] })).toThrow('exactly one react-native runtime; found 2');
});

test('rejects incomplete source-map evidence', () => {
  expect(() => verifyBundleSingletons({ sources: [] })).toThrow('found 0');
});

test('normalizes Expo project-relative generated loader paths', () => {
  expect(verifyBundleSingletons({ sources: [
    ...sources,
    '/node_modules/expo/internal/async-require-module.js',
  ] }, '/app/node_modules').status).toBe('passed');
});
