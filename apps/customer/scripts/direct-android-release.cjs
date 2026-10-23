/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Buffer } = require('node:buffer');
const { execFileSync } = require('node:child_process');
const { productionVersionCode } = require('./release-config.cjs');
const { redact } = require('./redact-release-log.cjs');

const APP_DIR = path.resolve(__dirname, '..');
const BUNDLETOOL_SHA256 = 'a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29';
const REQUIRED_SECRETS = [
  'ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD', 'SENTRY_AUTH_TOKEN', 'GOOGLE_MAPS_API_KEY',
];
const REQUIRED_VARS = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'ANDROID_UPLOAD_CERT_SHA256'];

function fingerprint(value) {
  const normalized = String(value ?? '').replace(/:/g, '').trim().toUpperCase();
  assert.match(normalized, /^[A-F0-9]{64}$/, 'Upload certificate SHA-256 must contain 64 hexadecimal digits.');
  return normalized;
}

function run(binary, args, options = {}) {
  try {
    return execFileSync(binary, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024, ...options });
  } catch {
    // Avoid dumping command arguments, credentials or generated manifests.
    throw new Error(`${binary} failed during release verification. Private command output was withheld.`);
  }
}

function preflight(env = process.env) {
  assert.equal(env.CUSTOMER_DIRECT_ANDROID_RELEASE, 'true', 'Direct production release mode is required.');
  const missing = [...REQUIRED_SECRETS, ...REQUIRED_VARS].filter(name => !env[name]?.trim());
  assert.equal(missing.length, 0, `Configure the customer-android-production environment: ${missing.join(', ')}`);
  productionVersionCode(env);
  fingerprint(env.ANDROID_UPLOAD_CERT_SHA256);
  require('../../../packages/shared/config/api-url.cjs').validateApiUrl(env.EXPO_PUBLIC_API_URL, false);
  assert.equal(new URL(env.EXPO_PUBLIC_SENTRY_DSN).protocol, 'https:', 'Sentry DSN must use HTTPS.');
  require('../../../packages/shared/config/google-maps.cjs').resolveNativeMapKeys(env);
  assert.ok(env.CUSTOMER_RELEASE_KEYSTORE_PATH, 'Missing temporary keystore path.');
}

function certificateFromKeystore(file, env = process.env) {
  const details = run('keytool', ['-J-Duser.language=en', '-list', '-v', '-keystore', file,
    '-storepass:env', 'ANDROID_KEYSTORE_PASSWORD', '-alias', env.ANDROID_KEY_ALIAS], { env });
  const value = details.match(/SHA256:\s*([A-Fa-f0-9:]+)/)?.[1];
  assert.ok(value, 'The upload certificate could not be read from the keystore.');
  return fingerprint(value);
}

function prepareSigning(env = process.env) {
  preflight(env);
  const encoded = env.ANDROID_KEYSTORE_BASE64.replace(/\s/g, '');
  assert.match(encoded, /^[A-Za-z0-9+/]+={0,2}$/, 'Keystore must be Base64 encoded.');
  const bytes = Buffer.from(encoded, 'base64');
  assert.ok(bytes.length > 128 && bytes.toString('base64') === encoded, 'Keystore Base64 encoding is invalid.');
  const file = path.resolve(env.CUSTOMER_RELEASE_KEYSTORE_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  assert.equal(certificateFromKeystore(file, env), fingerprint(env.ANDROID_UPLOAD_CERT_SHA256),
    'Keystore does not match the registered production upload certificate.');
  const gradleFile = path.join(APP_DIR, 'android/app/build.gradle');
  const source = fs.readFileSync(gradleFile, 'utf8');
  assert.match(source, /signingConfigs\s*\{/, 'Generated Android signing configuration is missing.');
  const signing = `// Generated for this job; credential values remain in environment variables.
android {
    signingConfigs {
        customerUpload {
            storeFile file(System.getenv('CUSTOMER_RELEASE_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.customerUpload }
    }
}
`;
  fs.writeFileSync(path.join(APP_DIR, 'android/app/customer-upload-signing.gradle'), signing);
  const apply = 'apply from: "customer-upload-signing.gradle"';
  if (!source.includes(apply)) fs.appendFileSync(gradleFile, `\n${apply}\n`);
  console.log('Existing production upload certificate verified; release signing configured.');
}

function verifySignature(bundle, expected) {
  const result = run('jarsigner', ['-J-Duser.language=en', '-verify', bundle]);
  assert.match(result, /jar verified\./, 'AAB signature verification failed or the AAB is unsigned.');
  assert.doesNotMatch(result, /unsigned entries/i, 'AAB contains unsigned entries.');
  const details = run('keytool', ['-J-Duser.language=en', '-printcert', '-jarfile', bundle]);
  const value = details.match(/SHA256:\s*([A-Fa-f0-9:]+)/)?.[1];
  assert.ok(value, 'AAB upload signing certificate is missing.');
  const actual = fingerprint(value);
  assert.equal(actual, fingerprint(expected), 'AAB was signed with an unexpected upload certificate.');
  return actual;
}

function manifestFacts(xml) {
  // Parse actual packaged manifest XML, without writing the Maps key to disk.
  const script = `import sys,json,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.read()); a='{http://schemas.android.com/apk/res/android}'
app=r.find('application'); assert app is not None
meta={n.get(a+'name'):n.get(a+'value') for n in app.findall('meta-data')}
key=meta.get('com.google.android.geo.API_KEY','')
print(json.dumps({'package':r.get('package'),'versionCode':r.get(a+'versionCode'),'versionName':r.get(a+'versionName'),
'debuggable':app.get(a+'debuggable','false'),'hasMapKey':bool(key and key.startswith('AIza') and len(key)==39),
'headers':json.loads(meta.get('expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY','{}')),
'updatesUrl':meta.get('expo.modules.updates.EXPO_UPDATE_URL')}))`;
  return JSON.parse(run('python3', ['-c', script], { input: xml }));
}

function validateManifest(facts, env, version) {
  assert.equal(facts.package, 'com.gloceries.customer', 'AAB package differs from the published Customer app.');
  assert.equal(Number(facts.versionCode), productionVersionCode(env), 'AAB version code is incorrect.');
  assert.equal(facts.versionName, version, 'AAB version name differs from package.json.');
  assert.equal(facts.debuggable, 'false', 'A production AAB must not be debuggable.');
  assert.equal(facts.hasMapKey, true, 'Packaged native Maps API key is missing.');
  assert.equal(facts.headers['expo-channel-name'], 'production', 'Production OTA channel header is missing.');
  assert.equal(facts.updatesUrl, 'https://u.expo.dev/a98e9f05-620b-4efb-8624-99d724667e7c', 'Unexpected Expo Updates project.');
}

function verifyRelease(bundle, env = process.env) {
  preflight(env);
  const tool = env.CUSTOMER_BUNDLETOOL_JAR;
  assert.ok(tool, 'The pinned bundletool verifier is required.');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(tool)).digest('hex'), BUNDLETOOL_SHA256, 'bundletool checksum mismatch.');
  const version = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'package.json'), 'utf8')).version;
  const code = productionVersionCode(env);
  const cert = verifySignature(bundle, env.ANDROID_UPLOAD_CERT_SHA256);
  const facts = manifestFacts(run('java', ['-jar', tool, 'dump', 'manifest', '--bundle=' + bundle, '--module=base']));
  validateManifest(facts, env, version);
  const entries = run('unzip', ['-Z1', bundle]).split('\n');
  const abis = ['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'];
  for (const abi of abis) {
    assert.ok(entries.includes(`base/lib/${abi}/libreactnative.so`), `Production ABI ${abi} is missing.`);
  }
  const js = run('unzip', ['-p', bundle, 'base/assets/index.android.bundle'], { encoding: 'buffer' });
  assert.ok(js.includes(Buffer.from(env.EXPO_PUBLIC_API_URL)), 'Packaged JS does not contain the production API address.');
  run('java', ['-jar', tool, 'validate', '--bundle=' + bundle]);
  const mappingEntry = 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map';
  assert.ok(entries.includes(mappingEntry), 'R8 mapping metadata is missing from the AAB.');
  const mapping = run('unzip', ['-p', bundle, mappingEntry]);
  assert.match(mapping, / -> [A-Za-z]/, 'R8 mapping is empty or invalid.');
  const properties = fs.readFileSync(path.join(APP_DIR, 'android/gradle.properties'), 'utf8');
  for (const name of ['android.enableMinifyInReleaseBuilds', 'android.enableShrinkResourcesInReleaseBuilds', 'android.r8.optimizedResourceShrinking']) {
    assert.ok(properties.includes(name + '=true'), name + ' must be enabled.');
  }
  const checks = 'bundletool validation, R8 mapping, minification and resource shrinking checks passed.\n';
  process.stdout.write(checks);
  const artifactDir = path.resolve(env.CUSTOMER_RELEASE_ARTIFACT_DIR);
  fs.mkdirSync(artifactDir, { recursive: true });
  const name = `gloceries-customer-${version}-${code}.aab`;
  fs.copyFileSync(bundle, path.join(artifactDir, name));
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(bundle)).digest('hex');
  fs.writeFileSync(path.join(artifactDir, 'SHA256SUMS'), `${sha256}  ${name}\n`);
  fs.writeFileSync(path.join(artifactDir, 'mapping.txt'), run('unzip', ['-p', bundle, 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map']));
  const report = {
    commit: env.GITHUB_SHA || run('git', ['rev-parse', 'HEAD'], { cwd: APP_DIR }).trim(),
    version, versionCode: code, operatorConfirmedHighestPlayVersionCode: Number(env.CUSTOMER_HIGHEST_PLAY_VERSION_CODE),
    package: facts.package, uploadCertificateSha256: cert, sha256, abis,
    productionApiVerifiedInBundle: true, mapsKeyPresent: facts.hasMapKey,
    otaChannel: facts.headers['expo-channel-name'], optimizerChecks: 'passed',
    submittedToPlay: false, deviceTestingRequired: true,
  };
  fs.writeFileSync(path.join(artifactDir, 'release-verification.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(artifactDir, 'optimizer-verification.txt'), checks);
  console.log(`Verified signed release artifact: ${name}`);
}

if (require.main === module) {
  try {
    const command = process.argv[2];
    if (command === 'preflight') { preflight(); console.log('Production release configuration is complete.'); }
    else if (command === 'prepare-signing') prepareSigning();
    else if (command === 'verify') {
      assert.ok(process.argv[3], 'Pass the release AAB to verify.');
      verifyRelease(path.resolve(process.argv[3]));
    } else throw new Error('Expected preflight, prepare-signing, or verify.');
  } catch (error) {
    console.error(redact(error.message));
    process.exitCode = 1;
  }
}

module.exports = { fingerprint, verifySignature, manifestFacts, validateManifest, preflight, BUNDLETOOL_SHA256 };
