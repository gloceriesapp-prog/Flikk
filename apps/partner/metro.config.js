const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const { withPartnerSingletons } = require('./scripts/metro-singletons.cjs');

const config = getSentryExpoConfig(__dirname);

module.exports = withPartnerSingletons(withNativeWind(config, { input: './global.css' }), __dirname);
