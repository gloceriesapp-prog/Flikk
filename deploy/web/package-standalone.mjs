import { cp, mkdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

// Next's monorepo standalone output omits public/ and .next/static/.
// Assemble them without copying the checkout, .env files or build logs.
const [app, destination] = process.argv.slice(2);
if (!['admin', 'landing'].includes(app) || !destination) {
  throw new Error('Usage: node deploy/web/package-standalone.mjs <admin|landing> <empty-output-directory>');
}
const root = path.resolve(import.meta.dirname, '../..');
const source = path.join(root, 'apps', app);
// Resolve the existing parent so /var vs /private/var (and symlinks) cannot
// bypass the source-directory guard. The output itself must not exist.
const requested = path.resolve(destination);
const output = path.join(await realpath(path.dirname(requested)), path.basename(requested));
if (output === root || output.startsWith(`${root}${path.sep}`)) {
  throw new Error('Output must be outside the source checkout');
}
try {
  await stat(output);
  throw new Error('Output already exists; use a fresh directory');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await stat(path.join(source, '.next/standalone/apps', app, 'server.js'));
await mkdir(output, { recursive: true });
await cp(path.join(source, '.next/standalone'), output, {
  recursive: true,
  filter: (entry) => !/^\.env(?:\.|$)/.test(path.basename(entry)),
});
const target = path.join(output, 'apps', app);
await cp(path.join(source, '.next/static'), path.join(target, '.next/static'), { recursive: true });
await cp(path.join(source, 'public'), path.join(target, 'public'), { recursive: true });
console.log(`Assembled ${app} standalone image context`);
