// Compiles src/*.ts to the package's committed plain JS (+ .d.ts).
// JS uses ts.transpileModule so the drift test (backend) can reproduce it
// byte for byte. Run: node packages/today-grid/build.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '../../backend/package.json'));
const ts = require('typescript');
export const TRANSPILE = { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false } };
for (const file of readdirSync(join(here, 'src')).filter(f => f.endsWith('.ts'))) {
  const { outputText } = ts.transpileModule(readFileSync(join(here, 'src', file), 'utf8'), TRANSPILE);
  writeFileSync(join(here, file.replace(/\.ts$/, '.js')), outputText);
}
execFileSync(join(here, '../../backend/node_modules/.bin/tsc'), ['-p', join(here, 'tsconfig.json')], { stdio: 'inherit' });
