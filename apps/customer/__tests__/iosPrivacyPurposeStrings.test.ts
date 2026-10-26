import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { verifyIosPrivacyPurposeStrings } from '../scripts/verify-ios-privacy.cjs';

const required = ['NSPhotoLibraryUsageDescription', 'NSLocationWhenInUseUsageDescription',
  'NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription'];
const valid = Object.fromEntries(required.map(key => [key, 'Gloceries uses this access for a user-requested feature.']));

it.each(required)('rejects a missing or blank %s before upload', key => {
  for (const value of [undefined, '', '   ']) {
    expect(() => verifyIosPrivacyPurposeStrings({ ...valid, [key]: value })).toThrow(key);
  }
});

it('preserves privacy descriptions through Expo native plist generation', () => {
  // Introspection applies the same native config plugins as prebuild, including
  // microphone/speech descriptions provided by expo-speech-recognition.
  const output = execFileSync(process.execPath,
    [require.resolve('expo/bin/cli'), 'config', '--type', 'introspect', '--json'], {
      cwd: path.resolve(__dirname, '..'), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, EXPO_NO_DOTENV: '1',
        NODE_ENV: 'production', EXPO_PUBLIC_API_URL: 'https://api.gloceries.com' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  const plist = JSON.parse(output)._internal.modResults.ios.infoPlist;
  expect(() => verifyIosPrivacyPurposeStrings(plist)).not.toThrow();
  expect(plist.NSPhotoLibraryUsageDescription).toContain('photos you choose');
  expect(plist.NSPhotoLibraryAddUsageDescription).toBeUndefined();
}, 30000);
