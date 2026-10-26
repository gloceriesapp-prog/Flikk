import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
// Each subprocess gets synthetic configuration only, never developer credentials.
const env: NodeJS.ProcessEnv = {
  PATH: process.env.PATH,
  NODE_ENV: 'production',
  EXPO_NO_DOTENV: '1',
  EAS_BUILD: 'true',
  EAS_BUILD_PROFILE: 'production',
  EAS_BUILD_PLATFORM: 'android',
  EXPO_PUBLIC_API_URL: 'https://api.example.com',
  ANDROID_GOOGLE_MAPS_API_KEY: `AIza${'a'.repeat(35)}`,
  EXPO_PUBLIC_SENTRY_DSN: 'https://public@example.com/1',
  SENTRY_ORG: 'test',
  SENTRY_PROJECT: 'test',
  SENTRY_AUTH_TOKEN: 'test-only',
};

function run(script: string, overrides = {}) {
  return spawnSync(process.execPath, ['-e', script], {
    cwd: root, env: { ...env, ...overrides }, encoding: 'utf8',
  });
}

describe('customer release safeguards', () => {
  const gate = "require('./scripts/verify-release.cjs')";

  it('accepts a complete synthetic release configuration', () => {
    const result = run(gate);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Device and provider tests are still required');
  });

  it.each([
    [{ EXPO_PUBLIC_API_URL: 'http://localhost:4000' }, 'HTTPS'],
    [{ SENTRY_AUTH_TOKEN: '' }, 'Missing SENTRY_AUTH_TOKEN'],
    [{ EXPO_PUBLIC_RAZORPAY_KEY_SECRET: 'test-only' }, 'must not be a public'],
    [{ ANDROID_GOOGLE_MAPS_API_KEY: '' }, 'ANDROID_GOOGLE_MAPS_API_KEY'],
  ])('rejects unsafe or incomplete release configuration: %j', (overrides, message) => {
    const result = run(gate, overrides);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(message);
  });

  it('isolates the new native runtime from the shipped 1.0.3 app', () => {
    const result = run(`
      const {expo} = require('./app.config.js');
      const pkg = require('./package.json');
      console.log(JSON.stringify({version: expo.version, packageVersion: pkg.version, runtime: expo.runtimeVersion}));
    `);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      version: '1.0.4', packageVersion: '1.0.4', runtime: { policy: 'appVersion' },
    });
  });

  it('applies optimized release rules idempotently and rejects template drift', () => {
    const result = run(`
      const assert = require('node:assert/strict');
      const {configureProperties, configureBuildGradle, configureProguardRules, configureSettingsGradle} = require('./plugins/withAndroidReleaseQuality.cjs');
      const original = [
        {type:'comment', value:'preserve me'},
        {type:'property', key:'unrelated', value:'keep'},
        {type:'property', key:'android.enableMinifyInReleaseBuilds', value:'false'},
        {type:'property', key:'android.enableMinifyInReleaseBuilds', value:'false'},
      ];
      const props = configureProperties(original);
      assert.deepEqual(configureProperties(props), props);
      assert.equal(props.filter(p=>p.key==='android.enableMinifyInReleaseBuilds').length,1);
      for (const key of ['android.enableMinifyInReleaseBuilds','android.enableShrinkResourcesInReleaseBuilds','android.r8.optimizedResourceShrinking']) {
        assert.equal(props.find(p=>p.key===key).value,'true');
      }
      assert.ok(props.some(p=>p.key==='unrelated' && p.value==='keep'));
      const gradle = configureBuildGradle('minifyEnabled enableMinifyInReleaseBuilds; getDefaultProguardFile("proguard-android.txt")');
      assert.ok(gradle.includes('proguard-android-optimize.txt'));
      assert.equal(configureBuildGradle(gradle),gradle);
      assert.throws(()=>configureBuildGradle('new template without known release hooks'));
      assert.ok(gradle.includes('verifyCustomerR8Version'));
      const settings = configureSettingsGradle('pluginManagement {\\n  includeBuild("unchanged-plugin")\\n}\\nplugins { id("example") }');
      assert.equal(configureSettingsGradle(settings),settings);
      assert.ok(settings.includes('com.android.tools:r8:8.12.30'));
      assert.ok(settings.includes('includeBuild("unchanged-plugin")'));
      assert.ok(settings.indexOf('buildscript {') < settings.indexOf('includeBuild('));
      assert.throws(()=>configureSettingsGradle('plugins { id("example") }'));
      assert.throws(()=>configureSettingsGradle('pluginManagement {}\\npluginManagement {}'));
      const rules = configureProguardRules('-keep class example.App');
      assert.equal(configureProguardRules(rules),rules);
      assert.ok(rules.includes('androidx.room.RoomDatabase'));
      assert.ok(rules.includes('androidx.work.InputMerger'));
      assert.ok(rules.includes('-keep class example.App'));
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
