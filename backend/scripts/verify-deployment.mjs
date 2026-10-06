// Read-only deployment verification: no migrations, messages, payments or jobs.
import { spawnSync } from 'node:child_process';
const report = { checked_at: new Date().toISOString(), database: 'not-configured', api: 'not-configured', worker: 'not-configured' };
if (process.env.DATABASE_URL) {
  const sql = `SELECT json_build_object(
    'promotions_table',to_regclass('public.promotional_deliveries') IS NOT NULL,
    'media_table',to_regclass('public.media_assets') IS NOT NULL,
    'worker_ready_function',to_regprocedure('public.background_worker_ready()') IS NOT NULL,
    'capacity_function',to_regprocedure('public.capacity_snapshot()') IS NOT NULL,
    'unsafe_public_functions',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('request_auth_context','request_auth_context_v2','claim_promotional_deliveries','claim_media_cleanup')
      AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))),
    'direct_customer_order_insert',has_table_privilege('authenticated','public.orders','INSERT')
  );`;
  const result = spawnSync(process.env.PSQL_BIN ?? 'psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    env: { ...process.env, PGDATABASE: process.env.DATABASE_URL, PGCONNECT_TIMEOUT: '10' }, encoding: 'utf8', timeout: 20000,
  });
  if (result.status !== 0) {
    const cause = /timeout|timed out/i.test(result.stderr ?? '') ? 'timeout' : /password authentication|tenant or user|authentication failed/i.test(result.stderr ?? '') ? 'authentication' : /could not translate|name or service/i.test(result.stderr ?? '') ? 'dns' : 'connection-or-query-failed';
    report.database = cause;
  }
  else { try { report.database = JSON.parse(result.stdout.trim()); } catch { report.database = 'invalid-response'; } }
}
for (const [role, url] of [['api', process.env.API_MONITORING_URL], ['worker', process.env.WORKER_MONITORING_URL]]) {
  if (!url) continue;
  try {
    const ready = await fetch(`${url.replace(/\/$/, '')}/readyz`, { signal: AbortSignal.timeout(10000) });
    report[role] = ready.ok ? 'ready' : 'not-ready';
  } catch { report[role] = 'unreachable'; }
}
console.log(JSON.stringify(report, null, 2));
const db = report.database;
if (!db || typeof db !== 'object' || !db.promotions_table || !db.media_table || !db.worker_ready_function || !db.capacity_function ||
    db.unsafe_public_functions !== 0 || db.direct_customer_order_insert || report.api !== 'ready' || report.worker !== 'ready') process.exitCode = 1;
