const { withGradleProperties, withAppBuildGradle, withSettingsGradle, withDangerousMod, withAndroidManifest } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// AGP 8.12.0 embeds R8 before the optimized resource shrinker fix.
// https://issuetracker.google.com/issues/447076894
// Use Google's published stable patch from the same compiler release line.
const R8_VERSION = '8.12.30';

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

function configureSettingsGradle(source) {
  const cleaned = source.replace(/  \/\/ Gloceries R8 patch BEGIN[\s\S]*?  \/\/ Gloceries R8 patch END\n?/g, '');
  const hook = /^pluginManagement\s*\{/m;
  if ((cleaned.match(/^pluginManagement\s*\{/gm) || []).length !== 1) {
    throw new Error('Android settings template changed: verify R8 plugin classpath before building.');
  }
  // Official R8 override belongs in settings pluginManagement, ahead of AGP.
  // https://r8.googlesource.com/r8/+/refs/heads/main/README.md
  return cleaned.replace(hook, `pluginManagement {
  // Gloceries R8 patch BEGIN
  buildscript {
    repositories { google(); mavenCentral() }
    dependencies { classpath("com.android.tools:r8:${R8_VERSION}") }
  }
  // Gloceries R8 patch END`);
}

function configureBuildGradle(source) {
  const result = source.replace(/getDefaultProguardFile\(["']proguard-android\.txt["']\)/g,
    'getDefaultProguardFile("proguard-android-optimize.txt")');
  if (!result.includes('proguard-android-optimize.txt') || !result.includes('minifyEnabled enableMinifyInReleaseBuilds')) {
    throw new Error('Android release template changed: verify optimized R8 defaults before building.');
  }
  const cleaned = result.replace(/\n\/\/ Gloceries R8 verification BEGIN[\s\S]*?\/\/ Gloceries R8 verification END\n?/g, '').trimEnd();
  return `${cleaned}

// Gloceries R8 verification BEGIN
tasks.register("verifyCustomerR8Version") {
    doLast {
        def actual = com.android.tools.r8.Version.getVersionString()
        if (!(actual == "${R8_VERSION}" || actual.startsWith("${R8_VERSION} "))) {
            throw new GradleException("Expected R8 ${R8_VERSION}, loaded " + actual)
        }
        println("Verified release compiler: R8 " + actual)
    }
}
// Gloceries R8 verification END
`;
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

function configureMainActivity(manifest) {
  const activities = manifest.manifest.application?.flatMap(app => app.activity || []) || [];
  const main = activities.find(activity => activity.$?.['android:name'] === '.MainActivity'
    || activity.$?.['android:name'] === 'com.gloceries.customer.MainActivity');
  if (!main) throw new Error('Customer MainActivity is missing: verify the Android manifest template.');
  // Android 16 ignores orientation locks on large screens. Let the same layout
  // adapt on earlier versions too. Do not alter third-party checkout activities
  // or the iOS orientation policy in the shared Expo configuration.
  delete main.$['android:screenOrientation'];
  main.$['android:resizeableActivity'] = 'true';
  return manifest;
}

function withAndroidReleaseQuality(config) {
  config = withAndroidManifest(config, mod => { mod.modResults = configureMainActivity(mod.modResults); return mod; });
  config = withSettingsGradle(config, mod => { mod.modResults.contents = configureSettingsGradle(mod.modResults.contents); return mod; });
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
module.exports.configureSettingsGradle = configureSettingsGradle;
module.exports.configureMainActivity = configureMainActivity;
