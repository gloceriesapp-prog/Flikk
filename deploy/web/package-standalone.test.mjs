import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('standalone packaging includes assets, excludes env files and rejects overwrite', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'web-package-'));
  try {
    const root = path.join(scratch, 'checkout');
    const script = path.join(root, 'deploy/web/package-standalone.mjs');
    await mkdir(path.dirname(script), { recursive: true });
    await cp(new URL('./package-standalone.mjs', import.meta.url), script);
    const app = path.join(root, 'apps/admin');
    const files = {
      '.next/standalone/apps/admin/server.js': 'runtime',
      '.next/standalone/apps/admin/.env.production': 'fixture: must never be packaged',
      '.next/standalone/node_modules/runtime.js': 'dependency',
      '.next/static/chunk.js': 'chunk',
      'public/logo.svg': 'asset',
    };
    for (const [name, value] of Object.entries(files)) {
      const file = path.join(app, name);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, value);
    }
    const output = path.join(scratch, 'image');
    const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    const result = run('admin', output);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(path.join(output, 'apps/admin/server.js'), 'utf8'), 'runtime');
    assert.equal(await readFile(path.join(output, 'apps/admin/.next/static/chunk.js'), 'utf8'), 'chunk');
    assert.equal(await readFile(path.join(output, 'apps/admin/public/logo.svg'), 'utf8'), 'asset');
    assert.equal(await readFile(path.join(output, 'node_modules/runtime.js'), 'utf8'), 'dependency');
    await assert.rejects(access(path.join(output, 'apps/admin/.env.production')));
    assert.notEqual(run('admin', output).status, 0);
    assert.notEqual(run('admin', path.join(root, 'output')).status, 0);
    assert.notEqual(run('customer', path.join(scratch, 'unsupported')).status, 0);
    assert.notEqual(run('landing', path.join(scratch, 'missing-build')).status, 0);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
