// iOS 27 asserts at launch unless the app adopts the scene-based life cycle
// (crash: _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// The prebuild template here still creates the window in the app delegate,
// so this plugin switches it to Expo's own ExpoAppSceneDelegate: the scene
// delegate creates the window and starts React Native, the app delegate only
// builds the factory.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const WINDOW_START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
  return withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return cfg;
    if (!src.includes(WINDOW_START) || !src.includes('class AppDelegate: ExpoAppDelegate {')) {
      throw new Error('withSceneLifecycle: AppDelegate.swift template changed; update the plugin.');
    }
    src = src
      .replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
      .replace(WINDOW_START, '');
    cfg.modResults.contents = src;
    return cfg;
  });
};
