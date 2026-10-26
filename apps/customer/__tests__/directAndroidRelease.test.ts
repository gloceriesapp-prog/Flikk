import { spawnSync } from 'node:child_process';
import path from 'node:path';

const run = (source: string) => spawnSync(process.execPath, ['-e', source], {
  cwd: path.resolve(__dirname, '..'), encoding: 'utf8', env: { PATH: process.env.PATH, NODE_ENV: 'test' },
});

describe('direct customer Android release safeguards', () => {
  it('rejects reused, malformed and out-of-range Play version codes', () => {
    const result = run(`
      const assert = require('node:assert/strict');
      const { productionVersionCode: code } = require('./scripts/release-config.cjs');
      const env = (a,b) => ({CUSTOMER_ANDROID_VERSION_CODE:a,CUSTOMER_HIGHEST_PLAY_VERSION_CODE:b});
      assert.equal(code(env('12','11')),12);
      for (const values of [['11','11'],['10','11'],['1e2','11'],['12.5','11'],['','11'],['2100000001','11'],['12','-1']]) {
        assert.throws(()=>code(env(...values)));
      }
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('rejects Partner bundles, debug builds, missing Maps keys and incorrect OTA configuration', () => {
    const result = run(`
      const assert = require('node:assert/strict');
      const {validateManifest,fingerprint} = require('./scripts/direct-android-release.cjs');
      const env = {CUSTOMER_ANDROID_VERSION_CODE:'12',CUSTOMER_HIGHEST_PLAY_VERSION_CODE:'11'};
      const facts = {package:'com.gloceries.customer',versionCode:'12',versionName:'1.0.4',debuggable:'false',targetSdk:'36',cleartext:'false',permissions:[],hasMapKey:true,headers:{'expo-channel-name':'production'},updatesUrl:'https://u.expo.dev/a98e9f05-620b-4efb-8624-99d724667e7c'};
      validateManifest(facts,env,'1.0.4');
      for (const bad of [{package:'com.gloceries.partner'},{debuggable:'true'},{targetSdk:'34'},{cleartext:'true'},{permissions:['android.permission.READ_CONTACTS']},{permissions:['android.permission.SYSTEM_ALERT_WINDOW']},{permissions:['android.permission.READ_EXTERNAL_STORAGE']},{permissions:['android.permission.WRITE_EXTERNAL_STORAGE']},{versionCode:'11'},{hasMapKey:false},{headers:{'expo-channel-name':'preview'}},{updatesUrl:'https://u.expo.dev/wrong'}]) {
        assert.throws(()=>validateManifest({...facts,...bad},env,'1.0.4'));
      }
      assert.equal(fingerprint('aa:'.repeat(31)+'aa'),'AA'.repeat(32));
      assert.throws(()=>fingerprint('invalid'));
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('reads target SDK and sensitive permissions from the packaged manifest', () => {
    const result = run(`
      const assert = require('node:assert/strict');
      const {manifestFacts} = require('./scripts/direct-android-release.cjs');
      const facts = manifestFacts('<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.gloceries.customer"><uses-sdk android:targetSdkVersion="36"/><uses-permission android:name="android.permission.RECORD_AUDIO"/><application android:debuggable="false" android:usesCleartextTraffic="false"/></manifest>');
      assert.equal(facts.targetSdk,'36');
      assert.equal(facts.cleartext,'false');
      assert.deepEqual(facts.permissions,['android.permission.RECORD_AUDIO']);
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('fails before building when signing configuration is missing', () => {
    const result = run(`
      const assert = require('node:assert/strict');
      const {preflight} = require('./scripts/direct-android-release.cjs');
      assert.throws(()=>preflight({CUSTOMER_DIRECT_ANDROID_RELEASE:'true'}),/ANDROID_KEYSTORE_BASE64/);
    `);
    expect(result.status).toBe(0);
  });

  it('rejects a staging API and the wrong Sentry project before signing', () => {
    const result = run(`
      const assert = require('node:assert/strict');
      const {preflight} = require('./scripts/direct-android-release.cjs');
      const env = {CUSTOMER_DIRECT_ANDROID_RELEASE:'true', CUSTOMER_ANDROID_VERSION_CODE:'11', CUSTOMER_HIGHEST_PLAY_VERSION_CODE:'10',
        ANDROID_KEYSTORE_BASE64:'synthetic', ANDROID_KEYSTORE_PASSWORD:'synthetic', ANDROID_KEY_ALIAS:'synthetic', ANDROID_KEY_PASSWORD:'synthetic',
        SENTRY_AUTH_TOKEN:'synthetic', GOOGLE_MAPS_API_KEY:'AIza'+'a'.repeat(35), ANDROID_UPLOAD_CERT_SHA256:'AA'.repeat(32),
        EXPO_PUBLIC_API_URL:'https://api.gloceries.com', EXPO_PUBLIC_SENTRY_DSN:'https://public@example.com/1',
        SENTRY_ORG:'gloceries', SENTRY_PROJECT:'customer-app', CUSTOMER_RELEASE_KEYSTORE_PATH:'/tmp/synthetic.jks'};
      preflight(env);
      for (const overrides of [{EXPO_PUBLIC_API_URL:'https://staging.example.com'}, {SENTRY_PROJECT:'partner-app'}, {EXPO_PUBLIC_API_FOLLOW_METRO_HOST:'true'}]) {
        assert.throws(()=>preflight({...env,...overrides}));
      }
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('redacts signing and monitoring credentials from build logs', () => {
    const result = run(`
      const assert = require('node:assert/strict');
      const {redact} = require('./scripts/redact-release-log.cjs');
      assert.equal(redact('test-password test-token',{ANDROID_KEYSTORE_PASSWORD:'test-password',SENTRY_AUTH_TOKEN:'test-token'}),'[redacted] [redacted]');
    `);
    expect(result.status).toBe(0);
  });
});
