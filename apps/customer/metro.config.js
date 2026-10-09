const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname);

// Customer imports @gloceries/shared (src/api/client.ts) but — unlike partner/
// rider — is NOT a root npm-workspace member, so Expo doesn't auto-detect the
// monorepo and Metro can't walk up to resolve the package. tsc resolves it
// (node walks up to root node_modules/@gloceries/shared), which is why the
// bundle broke but the typecheck didn't. Rather than make customer a workspace
// member (its react is 19.2.3 vs root 19.2.8 — hoisting would give Metro two
// React copies → the dual-context bug rider's metro.config documents), just
// teach Metro where the package lives:
//   - watchFolders: so Metro TRANSFORMS the raw-TS source (shared has no build).
//   - extraNodeModules alias: so `@gloceries/shared` resolves to that dir.
// Shared OTP hooks import React; the explicit resolver below keeps them on
// the same React instance as the customer app. Other dependencies keep their
// existing resolution behavior.
const sharedPkg = path.resolve(__dirname, '../../packages/shared');
config.watchFolders = [...(config.watchFolders ?? []), sharedPkg, path.resolve(__dirname, '../../packages/home-content')];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@gloceries/shared': sharedPkg,
};
// Metro resolves a watch-folder file's imports up ITS OWN tree (packages/shared
// → packages → root node_modules), none of which hold shared's peer dep
// expo-location — it lives in customer's node_modules. Pin resolution to
// customer's own node_modules so shared's peer imports (and everything else)
// resolve there. Deliberately ONLY customer's dir, never root's: root ships
// react 19.2.8 vs customer's 19.2.3, and adding root here would reintroduce the
// dual-React-context hazard rider's metro.config documents.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// nodeModulesPaths is a fallback, not an override of hierarchical resolution.
// A shared file could otherwise find root React before customer's version,
// causing invalid hook calls even though TypeScript and unit tests pass.
const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const customerReact = require.resolve(moduleName, { paths: [__dirname] });
    return context.resolveRequest(context, customerReact, platform);
  }
  return previousResolveRequest
    ? previousResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
