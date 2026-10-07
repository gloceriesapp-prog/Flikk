const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// No manual monorepo/watchFolders config needed — Expo's own
// getDefaultConfig already auto-detects the root package.json's
// "workspaces" field (added for @gloceries/shared) and wires
// watchFolders/nodeModulesPaths correctly on its own. A manual override
// here would only fight what Expo's already doing right.
// getSentryExpoConfig is Expo's default config plus the debug ids Sentry
// needs to map minified stack traces back to source.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
