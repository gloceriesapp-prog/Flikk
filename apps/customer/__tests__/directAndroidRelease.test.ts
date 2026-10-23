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
      const facts = {package:'com.gloceries.customer',versionCode:'12',versionName:'1.0.4',debuggable:'false',hasMapKey:true,headers:{'expo-channel-name':'production'},updatesUrl:'https://u.expo.dev/a98e9f05-620b-4efb-8624-99d724667e7c'};
      validateManifest(facts,env,'1.0.4');
      for (const bad of [{package:'com.gloceries.partner'},{debuggable:'true'},{versionCode:'11'},{hasMapKey:false},{headers:{'expo-channel-name':'preview'}},{updatesUrl:'https://u.expo.dev/wrong'}]) {
        assert.throws(()=>validateManifest({...facts,...bad},env,'1.0.4'));
      }
      assert.equal(fingerprint('aa:'.repeat(31)+'aa'),'AA'.repeat(32));
      assert.throws(()=>fingerprint('invalid'));
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

  it('redacts signing and monitoring credentials from build logs', () => {
    const result = run(`
      const assert = require('node:assert/strict');
      const {redact} = require('./scripts/redact-release-log.cjs');
      assert.equal(redact('test-password test-token',{ANDROID_KEYSTORE_PASSWORD:'test-password',SENTRY_AUTH_TOKEN:'test-token'}),'[redacted] [redacted]');
    `);
    expect(result.status).toBe(0);
  });
});
