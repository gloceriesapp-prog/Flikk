// The committed packages/today-grid/*.js must be exactly the compile of
// src/*.ts (run `node packages/today-grid/build.mjs` after editing src).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const dir = join(__dirname, '../../../packages/today-grid');
it('packages/today-grid JS matches its TypeScript source', () => {
  for (const file of readdirSync(join(dir, 'src')).filter(f => f.endsWith('.ts'))) {
    const { outputText } = ts.transpileModule(readFileSync(join(dir, 'src', file), 'utf8'),
      { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false } });
    expect(readFileSync(join(dir, file.replace(/\.ts$/, '.js')), 'utf8'), `${file} is stale — run node packages/today-grid/build.mjs`).toBe(outputText);
  }
});
