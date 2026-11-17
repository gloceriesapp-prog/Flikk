/* global __dirname */
// Store builds: drop the Expo developer launcher/menu from native autolinking.
// They only work in debug builds, so shipping them adds code with no use.
// Run after `npm ci` and before `expo prebuild`; it edits the working copy only.
const fs = require('node:fs');
const path = require('node:path');

const DEV_ONLY = ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu'];

function excludeDevClient(pkg) {
  const expo = { ...pkg.expo };
  const autolinking = { ...expo.autolinking };
  autolinking.exclude = [...new Set([...(autolinking.exclude || []), ...DEV_ONLY])];
  return { ...pkg, expo: { ...expo, autolinking } };
}

if (require.main === module) {
  const file = path.join(__dirname, '..', 'package.json');
  fs.writeFileSync(file, JSON.stringify(excludeDevClient(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2) + '\n');
  console.log('Excluded from native autolinking:', DEV_ONLY.join(', '));
}

module.exports = { excludeDevClient, DEV_ONLY };
