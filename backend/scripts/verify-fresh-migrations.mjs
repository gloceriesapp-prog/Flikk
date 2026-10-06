import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
if (process.env.PGDATABASE !== 'flikk_migrations_tests') throw new Error('Set PGDATABASE=flikk_migrations_tests; this runner creates schema in a disposable empty database only.');
await import('./migrations.mjs');
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('migrations/manifest.json', root), 'utf8'));
function apply(path) {
  const result = spawnSync(process.env.PSQL_BIN ?? 'psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-f', fileURLToPath(new URL(path, root))], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Fresh migration failed: ${path}`);
}
apply('tests/sql/migration-bootstrap.sql');
for (const migration of manifest.migrations) apply(`migrations/${migration.file}`);
console.log(`Fresh database: ${manifest.migrations.length} migrations applied in canonical order.`);
