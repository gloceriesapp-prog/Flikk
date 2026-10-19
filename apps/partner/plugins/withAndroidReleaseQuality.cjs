/* global __dirname */
const {
  withGradleProperties, withAppBuildGradle, withProjectBuildGradle, withDangerousMod,
  withAndroidManifest, withAndroidStyles,
} = require('expo/config-plugins');

const fs = require('node:fs/promises');
const path = require('node:path');

const RELEASE_PROPERTIES = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
  'android.r8.optimizedResourceShrinking': 'true',
  // Expo 57 / RN 0.86 still use the legacy Kotlin and variant DSL. These
  // supported AGP 9 migration flags do not disable R8 or resource shrinking.
  'android.builtInKotlin': 'false',
  'android.newDsl': 'false',
  // RN/Expo explicitly attach codegen to preBuild; their legacy source-set
  // Providers can therefore be retained during this AGP 9 migration.
  'android.sourceset.disallowProvider': 'false',
  'edgeToEdgeEnabled': 'true',
};

function configureProperties(properties) {
  const result = properties.filter(item => item.type !== 'property' || !(item.key in RELEASE_PROPERTIES));
  return [...result, ...Object.entries(RELEASE_PROPERTIES).map(([key, value]) => ({ type: 'property', key, value }))];
}

function configureBuildGradle(source) {
  const optimized = source.replace(/getDefaultProguardFile\(["']proguard-android\.txt["']\)/g, 'getDefaultProguardFile("proguard-android-optimize.txt")');
  if (!optimized.includes('proguard-android-optimize.txt') || !optimized.includes('minifyEnabled enableMinifyInReleaseBuilds')) {
    throw new Error('Android release template changed: verify R8 and the optimized ProGuard defaults before building.');
  }
  return optimized.includes("apply plugin: 'partner-release-quality'") ? optimized : `${optimized}\napply plugin: 'partner-release-quality'\n`;
}

function configureProjectBuildGradle(source) {
  let result = source.replace(/classpath\(['"]com\.android\.tools\.build:gradle(?::[^'"]+)?['"]\)/, "classpath('com.android.tools.build:gradle:9.0.1')");
  if (!result.includes('com.android.tools.build:gradle:9.0.1')) throw new Error('Android Gradle plugin declaration changed.');
  if (!result.includes('// Partner early codegen')) {
    result = result.replace('apply plugin: "expo-root-project"', `// Partner early codegen: AGP 9 finalizes library DSL before Kotlin script bodies.\nsubprojects { project ->\n  project.plugins.withId("com.android.library") {\n    project.android.ndkVersion = "27.1.12297006"\n  }\n  if (project.name.contains("react-native")) {\n    project.apply plugin: "com.facebook.react"\n  }\n}\n\napply plugin: "expo-root-project"`);
  }
  if (!result.includes('// Partner early codegen')) throw new Error('Expo root plugin declaration changed.');
  return result;
}

function configureManifest(manifest) {
  const application = manifest.manifest.application?.[0];
  if (!application) throw new Error('Android application manifest is missing.');
  application.$['android:resizeableActivity'] = 'true';
  const main = application.activity?.find(activity => activity.$['android:name'] === '.MainActivity' || activity.$['android:name'] === 'com.gloceries.partner.MainActivity');
  if (!main) throw new Error('Partner MainActivity is missing.');
  delete main.$['android:screenOrientation'];
  delete main.$['android:minAspectRatio'];
  delete main.$['android:maxAspectRatio'];
  main.$['android:resizeableActivity'] = 'true';
  return manifest;
}

function configureStyles(resources) {
  const appTheme = resources.resources.style?.find(style => style.$.name === 'AppTheme');
  if (appTheme) {
    // System-bar backgrounds come from edge-to-edge content. These legacy
    // color attributes are deprecated on Android 15; retain light-icon style.
    appTheme.item = (appTheme.item ?? []).filter(item => !['android:statusBarColor', 'android:navigationBarColor', 'android:navigationBarDividerColor', 'android:windowOptOutEdgeToEdgeEnforcement'].includes(item.$.name));
  }
  return resources;
}

function withAndroidReleaseQuality(config) {
  config = withGradleProperties(config, mod => { mod.modResults = configureProperties(mod.modResults); return mod; });
  config = withAppBuildGradle(config, mod => { mod.modResults.contents = configureBuildGradle(mod.modResults.contents); return mod; });
  config = withProjectBuildGradle(config, mod => { mod.modResults.contents = configureProjectBuildGradle(mod.modResults.contents); return mod; });
  config = withDangerousMod(config, ['android', async mod => {
    // Native libraries already publish the JNI/consumer keep rules they need.
    const file = path.join(mod.modRequest.platformProjectRoot, 'app/proguard-rules.pro');
    const source = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, source.replace(/^\s*-keep class (?:com\.swmansion\.reanimated|com\.facebook\.react\.turbomodule)\.\*\* \{ \*; \}\s*$/gm, ''));
    const native = path.join(__dirname, '../native-release-quality');
    await fs.cp(path.join(native, 'buildSrc'), path.join(mod.modRequest.platformProjectRoot, 'buildSrc'), { recursive: true });
    await fs.cp(path.join(native, 'app'), path.join(mod.modRequest.platformProjectRoot, 'app/src/main/java'), { recursive: true });
    return mod;
  }]);
  config = withAndroidManifest(config, mod => { mod.modResults = configureManifest(mod.modResults); return mod; });
  return withAndroidStyles(config, mod => { mod.modResults = configureStyles(mod.modResults); return mod; });
}

module.exports = withAndroidReleaseQuality;
module.exports.configureProperties = configureProperties;
module.exports.configureBuildGradle = configureBuildGradle;
module.exports.configureProjectBuildGradle = configureProjectBuildGradle;
module.exports.configureManifest = configureManifest;
module.exports.configureStyles = configureStyles;
