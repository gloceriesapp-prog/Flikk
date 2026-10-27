const fs = require('fs');
const path = require('path');

// These packages own process-wide registries/native runtimes. Resolving a
// second copy through a shared package or symlink breaks release startup.
const SINGLETONS = new Set([
  'react', 'react-native', 'expo', 'expo-modules-core',
  'react-native-reanimated', 'react-native-worklets',
]);

function withCustomerSingletons(config, projectRoot) {
  const nodeModules = fs.realpathSync(path.join(projectRoot, 'node_modules'));
  const previous = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const packageName = moduleName.startsWith('@')
      ? moduleName.split('/').slice(0, 2).join('/')
      : moduleName.split('/')[0];
    if (SINGLETONS.has(packageName)) {
      // Change the lookup origin, not the requested subpath: Metro still
      // applies package exports and platform-specific source selection.
      context = {
        ...context,
        originModulePath: path.join(nodeModules, '__customer_resolver__.js'),
        nodeModulesPaths: [nodeModules],
        disableHierarchicalLookup: true,
      };
    }
    return previous
      ? previous(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  };
  return config;
}

module.exports = { withCustomerSingletons, SINGLETONS };
