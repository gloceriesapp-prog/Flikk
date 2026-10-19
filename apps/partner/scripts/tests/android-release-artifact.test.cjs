/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

// Check acceptance/rejection against ZIP artifacts, including incomplete R8
// evidence. These fixtures validate optimizer reporting, not Android installability.
for (const scenario of ['optimized', 'missing-r8', 'unoptimized-resources', 'old-agp']) {
  test(`release artifact gate: ${scenario}`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'partner-release-artifact-'));
    const content = path.join(dir, 'content');
    const write = (file, value) => {
      const dest = path.join(content, file);
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, value);
    };
    try {
      write('BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties',
        `androidGradlePluginVersion=${scenario === 'old-agp' ? '8.12.0' : '9.0.1'}\n`);
      write('BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map', 'com.example.Main -> a:\n');
      write('base/dex/classes.dex', 'optimizer-test-fixture');
      if (scenario !== 'missing-r8') {
        write('BUNDLE-METADATA/com.android.tools/r8.json', JSON.stringify({
          options: { isObfuscationEnabled: true, isOptimizationsEnabled: true, isShrinkingEnabled: true },
          resourceOptimization: { isOptimizedShrinkingEnabled: scenario !== 'unoptimized-resources' },
        }));
      }
      const artifact = path.join(dir, 'fixture.aab');
      const jar = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin/jar') : 'jar';
      execFileSync(jar, ['--create', '--file', artifact, '-C', content, '.']);
      const result = spawnSync(process.execPath,
        [path.resolve(__dirname, '../verify-android-release.cjs'), artifact], { encoding: 'utf8' });
      if (scenario === 'optimized') {
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /Optimized resource shrinking: enabled in bundle metadata/);
      } else {
        assert.notEqual(result.status, 0);
        const expected = {
          'missing-r8': /R8 metadata is missing/,
          'unoptimized-resources': /Optimized resource shrinking is disabled/,
          'old-agp': /Release must use AGP 9/,
        };
        assert.match(result.stderr, expected[scenario]);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
