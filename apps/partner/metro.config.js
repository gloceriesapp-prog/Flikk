const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// No manual monorepo/watchFolders config needed — Expo's own
// getDefaultConfig already auto-detects the root package.json's
// "workspaces" field (added for @flikk/shared) and wires
// watchFolders/nodeModulesPaths correctly on its own. A manual override
// here would only fight what Expo's already doing right.
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
