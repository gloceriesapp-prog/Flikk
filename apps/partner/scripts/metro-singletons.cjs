const fs = require('fs');
const path = require('path');
const SINGLETONS = new Set(['react', 'react-native', 'expo', 'expo-modules-core', 'react-native-reanimated', 'react-native-worklets', 'nativewind', 'react-native-css-interop']);

// Shared workspace packages and local symlinks must use the same native
// registries as the app. Pin lookup origins, preserving Metro platform exports.
function withPartnerSingletons(config, projectRoot) {
  const nativeRoot = fs.realpathSync(path.dirname(require.resolve('react-native/package.json', { paths: [projectRoot] })));
  const nodeModules = path.dirname(nativeRoot);
  const previous = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const packageName = moduleName.startsWith('@') ? moduleName.split('/').slice(0, 2).join('/') : moduleName.split('/')[0];
    if (SINGLETONS.has(packageName)) context = { ...context,
      originModulePath: path.join(nodeModules, '__partner_resolver__.js'),
      nodeModulesPaths: [nodeModules], disableHierarchicalLookup: true };
    return previous ? previous(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
  };
  return config;
}
module.exports = { withPartnerSingletons };
