import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const connection = process.env.STORE_TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(connection).hostname)) throw new Error('Availability SQL tests require local Supabase.');
const sql = readFileSync(new URL('../tests/store-availability.sql', import.meta.url), 'utf8');
const result = spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', connection], {
  input: `BEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='30s';\n${sql}\nROLLBACK;`, encoding: 'utf8',
});
if (result.error) throw result.error;
process.stdout.write(result.stdout); process.stderr.write(result.stderr);
if (result.status !== 0) throw new Error('Availability checks failed; the transaction was rolled back.');
console.log('Local availability checks passed; all fixtures rolled back.');
