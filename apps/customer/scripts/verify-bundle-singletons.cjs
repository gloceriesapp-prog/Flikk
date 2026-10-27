/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { SINGLETONS } = require('./metro-singletons.cjs');

function verifyBundleSingletons(map, nodeModules = fs.realpathSync(path.join(__dirname, '../node_modules'))) {
  const roots = new Map([...SINGLETONS].map(name => [name, new Set()]));
  for (const source of map.sources ?? []) {
    // Expo writes its generated async-require entry relative to the project
    // root while ordinary dependencies use absolute real paths.
    const normalized = path.posix.normalize(source.replaceAll('\\', '/'))
      .replace(/^\/node_modules\//, `${nodeModules}/`);
    for (const [name, locations] of roots) {
      const marker = `/node_modules/${name}/`;
      const position = normalized.lastIndexOf(marker);
      if (position >= 0) locations.add(normalized.slice(0, position + marker.length - 1));
    }
  }
  for (const [name, locations] of roots) {
    if (locations.size !== 1) {
      throw new Error(`Release bundle must contain exactly one ${name} runtime; found ${locations.size}.`);
    }
  }
  return { checked: [...roots.keys()], status: 'passed' };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(verifyBundleSingletons(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')))));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { verifyBundleSingletons };
