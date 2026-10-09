// Applies backend/migrations to a real database in manifest order and records each
// one in ops.applied_migrations, so every environment (local, staging, production)
// is migrated the same way: from the committed files, never hand-written SQL.
//
//   node backend/scripts/db-migrate.mjs --status            show applied / pending
//   node backend/scripts/db-migrate.mjs                     apply pending migrations
//   node backend/scripts/db-migrate.mjs --seed              ...then load backend/seed/dev-seed.sql
//   node backend/scripts/db-migrate.mjs --baseline-through 112_app_config_and_hours.sql
//        record files up to and including that one as applied WITHOUT running them
//        (for a database that already has them, e.g. production today)
//
// Target: DATABASE_URL (Supabase dashboard -> Connect -> "Session pooler" URI).
// Production is refused unless --production is passed AND
// CONFIRM_PRODUCTION=bjlknohjdnemxwwoxcsv is set. --seed is always refused there.
// Needs psql on PATH (macOS: brew install libpq && brew link --force libpq).
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PRODUCTION_REF = 'bjlknohjdnemxwwoxcsv';
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

const url = process.env.DATABASE_URL;
if (!url) fail('Set DATABASE_URL to the target database connection string.');
const production = url.includes(PRODUCTION_REF);
if (production) {
  if (flag('--seed')) fail('Refusing to load fake seed data into production.');
  if (!flag('--production') || process.env.CONFIRM_PRODUCTION !== PRODUCTION_REF) {
    fail(`DATABASE_URL points at PRODUCTION (${PRODUCTION_REF}). Re-run with --production and CONFIRM_PRODUCTION=${PRODUCTION_REF} after a backup.`);
  }
}

await import('./migrations.mjs'); // verifies every file still matches manifest.json
const root = new URL('../', import.meta.url);
const { migrations } = JSON.parse(await readFile(new URL('migrations/manifest.json', root), 'utf8'));

function psql(extra, input) {
  const result = spawnSync(process.env.PSQL_BIN ?? 'psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At', url, ...extra],
    { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' } });
  if (result.error) fail(`Could not run psql: ${result.error.message}`);
  if (result.status !== 0) fail('psql failed (see the error above).');
  return result.stdout;
}
function fail(message) { console.error(message); process.exit(1); }
const quote = value => `'${String(value).replaceAll("'", "''")}'`;

psql([], `
  CREATE SCHEMA IF NOT EXISTS ops;
  REVOKE ALL ON SCHEMA ops FROM PUBLIC;
  CREATE TABLE IF NOT EXISTS ops.applied_migrations (
    file text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now(),
    baselined boolean NOT NULL DEFAULT false);`);
const applied = new Map(psql([], 'SELECT file, sha256 FROM ops.applied_migrations;')
  .trim().split('\n').filter(Boolean).map(line => line.split('|')));

for (const { file, sha256 } of migrations) {
  if (applied.has(file) && applied.get(file) !== sha256) {
    fail(`${file} changed after it was applied here (checksum mismatch). Write a new migration instead of editing an applied one.`);
  }
}
const pending = migrations.filter(m => !applied.has(m.file));
const target = production ? 'PRODUCTION' : 'non-production database';
console.log(`${target}: ${applied.size} applied, ${pending.length} pending.`);

if (flag('--status')) {
  for (const m of pending) console.log(`  pending  ${m.file}`);
  process.exit(0);
}

const baseline = option('--baseline-through');
if (baseline) {
  const index = migrations.findIndex(m => m.file === baseline);
  if (index < 0) fail(`--baseline-through: ${baseline} is not in manifest.json.`);
  const rows = migrations.slice(0, index + 1).filter(m => !applied.has(m.file));
  if (rows.length) {
    psql([], `INSERT INTO ops.applied_migrations (file, sha256, baselined) VALUES ${rows.map(m => `(${quote(m.file)}, ${quote(m.sha256)}, true)`).join(',')} ON CONFLICT DO NOTHING;`);
  }
  console.log(`Recorded ${rows.length} migration(s) through ${baseline} as already applied (not executed).`);
  process.exit(0);
}

for (const { file, sha256 } of pending) {
  process.stdout.write(`applying ${file} ... `);
  psql(['-f', fileURLToPath(new URL(`migrations/${file}`, root))]);
  psql([], `INSERT INTO ops.applied_migrations (file, sha256) VALUES (${quote(file)}, ${quote(sha256)});`);
  console.log('ok');
}
console.log(pending.length ? `Applied ${pending.length} migration(s).` : 'Database is up to date.');

if (flag('--seed')) {
  psql(['-f', fileURLToPath(new URL('seed/dev-seed.sql', root))]);
  console.log('Loaded backend/seed/dev-seed.sql (test zone, 2 stores, 20 products).');
}
