import { spawnSync } from 'node:child_process';
import path from 'node:path';

it('generates a scene entry point instead of the legacy window startup that traps on iOS 27', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const { expo } = require('./app.config.js');
    const props = expo.plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties')?.[1];
    const { withBuildProperties } = require('expo-build-properties');
    const config = withBuildProperties({ name: 'Gloceries', slug: 'customer', _internal: { projectRoot: process.cwd() } }, props);
    const legacy = [
      'class AppDelegate: ExpoAppDelegate {',
      '    reactNativeFactory = factory', '',
      '#if os(iOS) || os(tvOS)',
      '    window = UIWindow(frame: UIScreen.main.bounds)',
      '    factory.startReactNative(',
      '      withModuleName: "main",',
      '      in: window,',
      '      launchOptions: launchOptions)',
      '#endif', '}', ''
    ].join('\\n');
    (async () => {
      const delegate = await config.mods.ios.appDelegate({ ...config, modRequest: {}, modResults: { language: 'swift', contents: legacy } });
      assert.match(delegate.modResults.contents, /ExpoReactNativeFactoryProvider/);
      assert.ok(!delegate.modResults.contents.includes('window = UIWindow('));
      assert.ok(!delegate.modResults.contents.includes('factory.startReactNative('));
      const plist = await config.mods.ios.infoPlist({ ...config, modRequest: {}, modResults: {} });
      const manifest = plist.modResults.UIApplicationSceneManifest;
      assert.equal(manifest.UIApplicationSupportsMultipleScenes, false);
      assert.equal(manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0].UISceneDelegateClassName, 'EXExpoAppSceneDelegate');
      const repeated = await config.mods.ios.appDelegate({ ...config, modRequest: {}, modResults: delegate.modResults });
      assert.equal(repeated.modResults.contents, delegate.modResults.contents);
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, NODE_ENV: 'development', EXPO_PUBLIC_API_URL: 'https://api.example.com', EXPO_NO_DOTENV: '1' },
  });
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
});
