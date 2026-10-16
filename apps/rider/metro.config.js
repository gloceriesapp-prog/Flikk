const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Expo resolves this npm workspace automatically. React and React Native are
// pinned once at the workspace root; app-local resolver aliases would point
// at nonexistent copies after a clean install.

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
