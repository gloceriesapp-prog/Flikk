const { withGradleProperties, withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const PROPERTIES = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
  // Supported by the SDK's AGP 8.12 toolchain; verify on the final bundle too.
  'android.r8.optimizedResourceShrinking': 'true',
};

function configureProperties(items) {
  return [
    ...items.filter(item => item.type !== 'property' || !(item.key in PROPERTIES)),
    ...Object.entries(PROPERTIES).map(([key, value]) => ({ type: 'property', key, value })),
  ];
}

function configureBuildGradle(source) {
  const result = source.replace(/getDefaultProguardFile\(["']proguard-android\.txt["']\)/g,
    'getDefaultProguardFile("proguard-android-optimize.txt")');
  if (!result.includes('proguard-android-optimize.txt') || !result.includes('minifyEnabled enableMinifyInReleaseBuilds')) {
    throw new Error('Android release template changed: verify optimized R8 defaults before building.');
  }
  return result;
}

function configureProguardRules(source) {
  const cleaned = source.replace(/# Gloceries reflective constructors BEGIN[\s\S]*?# Gloceries reflective constructors END\n?/g, '').trimEnd();
  // Room/WorkManager instantiate these through reflection. Keep constructors,
  // without preventing optimization of the rest of these libraries.
  return `${cleaned}\n\n# Gloceries reflective constructors BEGIN
-keepclassmembers class * extends androidx.room.RoomDatabase {
    public <init>();
}
-keepclassmembers class * extends androidx.work.InputMerger {
    public <init>();
}
# Gloceries reflective constructors END\n`;
}

function withAndroidReleaseQuality(config) {
  config = withGradleProperties(config, mod => { mod.modResults = configureProperties(mod.modResults); return mod; });
  config = withAppBuildGradle(config, mod => { mod.modResults.contents = configureBuildGradle(mod.modResults.contents); return mod; });
  return withDangerousMod(config, ['android', async mod => {
    const file = path.join(mod.modRequest.platformProjectRoot, 'app/proguard-rules.pro');
    await fs.writeFile(file, configureProguardRules(await fs.readFile(file, 'utf8')));
    return mod;
  }]);
}

module.exports = withAndroidReleaseQuality;
module.exports.configureProperties = configureProperties;
module.exports.configureBuildGradle = configureBuildGradle;
module.exports.configureProguardRules = configureProguardRules;
