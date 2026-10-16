import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Never inherit DATABASE_URL: a developer's backend environment can target production.
const connection = process.env.PARTNER_TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const target = new URL(connection);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) {
  throw new Error('Customer-to-store order SQL tests require a local database.');
}
const sql = readFileSync(new URL('../tests/partner-customer-order.sql', import.meta.url), 'utf8');
const result = spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', connection], {
  input: `BEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='30s';\n${sql}\nROLLBACK;`,
  encoding: 'utf8',
});
if (result.error) throw result.error;
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) throw new Error('Local customer-to-store order SQL tests failed; connection closure rolls back changes.');
console.log('Customer-to-store order SQL checks passed; all fixture changes rolled back.');
