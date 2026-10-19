const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { configureProperties, configureBuildGradle, configureManifest, configureStyles, configureProjectBuildGradle, configureProguardRules } = require('../../plugins/withAndroidReleaseQuality.cjs');

describe('Partner Android release quality', () => {
  it('enables R8, resource shrinking and edge-to-edge without duplicate properties', () => {
    const initial = [{type:'property',key:'android.enableMinifyInReleaseBuilds',value:'false'}];
    const result = configureProperties(initial);
    assert.deepEqual(configureProperties(result),result);
    for (const key of ['android.enableMinifyInReleaseBuilds','android.enableShrinkResourcesInReleaseBuilds','android.r8.optimizedResourceShrinking','edgeToEdgeEnabled']) assert.equal(result.find(item => item.key === key).value,'true');
  });
  it('uses optimized R8 defaults and fails closed on an incompatible template', () => {
    const result = configureBuildGradle('minifyEnabled enableMinifyInReleaseBuilds\nproguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"');
    assert.match(result,/proguard-android-optimize.txt/);
    assert.equal(configureBuildGradle(result),result);
    assert.throws(() => configureBuildGradle('changed-template'),/template changed/);
  });
  it('pins AGP 9 and registers Kotlin library codegen before DSL finalization', () => {
    const original = `classpath('com.android.tools.build:gradle')
apply plugin: "expo-root-project"`;
    const result = configureProjectBuildGradle(original);
    assert.match(result, /com.android.tools.build:gradle:9.0.1/);
    assert.match(result, /project.android.ndkVersion = "27.1.12297006"/);
    assert.equal(configureProjectBuildGradle(result), result);
    assert.ok(result.indexOf('project.apply plugin: "com.facebook.react"') < result.indexOf('apply plugin: "expo-root-project"'));
    assert.throws(() => configureProjectBuildGradle('changed'), /declaration changed/);
  });
  it('removes portrait/aspect restrictions and explicitly allows resizing', () => {
    const manifest = {manifest:{application:[{$:{},activity:[{$:{'android:name':'.MainActivity','android:screenOrientation':'portrait','android:maxAspectRatio':'2.1'}}]}]}};
    const app = configureManifest(manifest).manifest.application[0];
    assert.equal(app.$['android:resizeableActivity'],'true');
    assert.equal(app.activity[0].$['android:resizeableActivity'],'true');
    assert.equal(app.activity[0].$['android:screenOrientation'],undefined);
    assert.equal(app.activity[0].$['android:maxAspectRatio'],undefined);
  });
  it('removes deprecated bar-color and opt-out attributes but preserves theme settings', () => {
    const resources = {resources:{style:[{$:{name:'AppTheme'},item:['android:statusBarColor','android:navigationBarColor','android:navigationBarDividerColor','android:windowOptOutEdgeToEdgeEnforcement','colorPrimary'].map(name=>({$:{name},_:'value'}))}]}};
    assert.deepEqual(configureStyles(resources).resources.style[0].item.map(item=>item.$.name),['colorPrimary']);
  });
  it('retains reflective Room and InputMerger constructors without blanket library keeps', () => {
    const original = '-keepclassmembers class com.example.NativeBridge { native <methods>; }\n';
    const result = configureProguardRules(original);
    assert.equal(configureProguardRules(result), result);
    assert.ok(result.includes(original.trim()));
    for (const type of ['androidx.room.RoomDatabase', 'androidx.work.InputMerger']) {
      assert.ok(result.includes(`-keepclassmembers class * extends ${type} {\n    public <init>();\n}`));
    }
    assert.doesNotMatch(result, /-dont(?:shrink|optimize|obfuscate)|\{ \*; \}/);
  });
});
