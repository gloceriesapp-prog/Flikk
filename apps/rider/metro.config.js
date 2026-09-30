const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// This app is nested under the Gloceries workspace root, which ships its OWN
// node_modules (react/react-native at DIFFERENT versions than ours — root
// react 19.2.8 vs ours 19.2.3). Metro's default resolver walks UP the tree,
// so `react`/`react-native` could load from Gloceries/node_modules while our
// rider-only deps (@react-navigation/*) load OUR react → two React copies →
// NavigationContainer registers its context on one, useNavigation reads the
// other → "Couldn't find a navigation context."
//
// React CONTEXT identity depends only on the `react` module instance, so we
// don't need to isolate the whole tree (that hides transitive deps like
// expo-asset that npm hoisted to the root). Just pin react + react-native to
// THIS app's copies; everything else keeps resolving as before (incl. hoisted
// transitive deps up the tree), guaranteeing exactly one React context.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
};

// DO NOT pin config.server.unstable_serverRoot to __dirname. The native debug
// build baked getJSMainModuleName() = "apps/rider/index" (entry relative to the
// monorepo root, which is where Expo prebuild computed it). The device requests
// `/apps/rider/index.bundle`, and Metro resolves that against serverRoot.
// Expo's default serverRoot IS the monorepo root (/Gloceries) because watchFolders
// spans root + packages/shared, so `apps/rider/index` → /Gloceries/apps/rider/index
// = our entry. Correct. Pinning serverRoot to /apps/rider instead makes Metro
// resolve `apps/rider/index` → /apps/rider/apps/rider/index → 500
// UnableToResolveError. The default is already right; leave it alone.

module.exports = withNativeWind(config, { input: './global.css' });
