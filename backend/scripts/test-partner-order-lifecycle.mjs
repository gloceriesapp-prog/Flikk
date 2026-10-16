import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Explicitly local only. Never inherit DATABASE_URL, which may target production.
const connection = process.env.PARTNER_TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const target = new URL(connection);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) throw new Error('Partner lifecycle SQL tests require a local database.');
function query(sql) {
  const result = spawnSync('psql', ['-X', '-At', '-v', 'ON_ERROR_STOP=1', connection], { input: sql, encoding: 'utf8' });
  if (result.status !== 0) { process.stderr.write(result.stderr); throw new Error('Local partner lifecycle SQL tests failed.'); }
  return result;
}
const root = new URL('../', import.meta.url);
const ready = query("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='accepted_at'),to_regclass('public.merchant_order_push_outbox') IS NOT NULL;").stdout.trim().split('|');
const files = ['20261014163158_partner_order_acceptance.sql', '20261014163241_merchant_order_push_outbox.sql'];
let sql = 'BEGIN;\n';
for (let index = 0; index < files.length; index++) {
  if (ready[index] === 't') continue;
  sql += readFileSync(new URL(`migrations/${files[index]}`, root), 'utf8').split('\n')
    .filter(line => !['BEGIN;', 'COMMIT;', "NOTIFY pgrst,'reload schema';"].includes(line.trim())).join('\n') + '\n';
}
sql += readFileSync(new URL('tests/partner-order-lifecycle.sql', root), 'utf8') + '\nROLLBACK;';
const result = query(sql);
process.stdout.write(result.stderr);
console.log('Partner lifecycle SQL checks passed; all test changes rolled back.');
