// Read-only audit of a built bundle. Never uploads it or touches credentials.
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const bundle = process.argv[2];
assert.ok(bundle, 'Usage: node scripts/verify-android-release.cjs /path/to/app-release.aab');
const absolute = path.resolve(bundle);
const entries = execFileSync('unzip', ['-Z1', absolute], { encoding: 'utf8' }).split('\n');
const appMetadataEntry = 'BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties';
assert.ok(entries.includes(appMetadataEntry), 'AGP build metadata is missing.');
const appMetadata = execFileSync('unzip', ['-p', absolute, appMetadataEntry], { encoding: 'utf8' });
const agp = appMetadata.match(/^androidGradlePluginVersion=(.+)$/m)?.[1];
assert.ok(agp && Number(agp.split('.')[0]) >= 9, 'Release must use AGP 9+ with optimized resource shrinking.');
console.log('Android Gradle plugin:', agp);
const mappingEntry = entries.find(entry => entry === 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map');
assert.ok(mappingEntry, 'Release has no obfuscation mapping: verify that R8 ran.');
const mapping = execFileSync('unzip', ['-p', absolute, mappingEntry], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const classes = [...mapping.matchAll(/^([^\s#].*?) -> ([^\s]+):$/gm)];
const renamed = classes.filter(match => match[1] !== match[2]).length;
assert.ok(renamed > 0, 'No renamed classes found in the release mapping.');
for (const name of ['androidx.work.impl.WorkDatabase_Impl', 'expo.modules.updates.db.UpdatesDatabase_Impl', 'androidx.work.OverwritingInputMerger', 'androidx.work.ArrayCreatingInputMerger']) {
  const header = `${name} -> ${name}:\n`;
  const start = mapping.indexOf(header);
  assert.ok(start >= 0, `Reflectively loaded class is missing or renamed: ${name}`);
  const remaining = mapping.slice(start + header.length);
  const nextClass = remaining.search(/^[^\s#]/m);
  const body = nextClass < 0 ? remaining : remaining.slice(0, nextClass);
  assert.match(body, /^\s+(?:\d+:\d+:)?void <init>\(\)(?::[\d:]+)? -> <init>$/m,
    `Reflective default constructor is missing: ${name}`);
}
console.log('Room/WorkManager reflective constructors retained.');
assert.ok(entries.some(entry => /^base\/dex\/classes.*\.dex$/.test(entry)), 'Android DEX files are missing.');
console.log(`Release mapping: ${renamed} / ${classes.length} classes renamed (${(renamed / classes.length * 100).toFixed(1)}%). This is a local class count, not the Play vitals score.`);
const r8Entry = entries.find(entry => entry === 'BUNDLE-METADATA/com.android.tools/r8.json');
assert.ok(r8Entry, 'R8 metadata is missing: optimizer flags and optimized resource shrinking cannot be verified.');
if (r8Entry) {
  const metadata = JSON.parse(execFileSync('unzip', ['-p', absolute, r8Entry], { encoding: 'utf8' }));
  for (const option of ['isObfuscationEnabled', 'isOptimizationsEnabled', 'isShrinkingEnabled']) assert.equal(metadata.options?.[option], true, `R8 ${option} is disabled.`);
  assert.equal(metadata.resourceOptimization?.isOptimizedShrinkingEnabled, true, 'Optimized resource shrinking is disabled.');
  console.log('R8 optimizer flags: shrinking, optimization and obfuscation enabled.');
  console.log('Optimized resource shrinking: enabled in bundle metadata.');
  console.log('R8 metadata statistics:', JSON.stringify(metadata.stats));
}
console.log('Release optimizer artifact checks passed.');
