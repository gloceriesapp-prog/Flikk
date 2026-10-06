import { startMonitoring } from '../observability/runtime.js';
import { startWorker, startQueueConsumer } from './runner.js';
import { jobs, queues } from './jobs.js';
import { logger } from '../lib/logger.js';
import { closeDatabaseConnections, supabase } from '../db/supabase.js';
const { data: ready, error: readinessError } = await supabase.rpc('background_worker_ready');
if (readinessError || ready !== true) {
  logger.error({ err: readinessError }, 'Worker requires migration 076 and its durable schedules');
  await closeDatabaseConnections();
  process.exit(1);
}
let stopping = false;
const stopMonitoring = await startMonitoring('worker',() => !stopping).catch(async err => {
  logger.error({err},'Worker monitoring startup failed'); await closeDatabaseConnections(); process.exit(1);
});
const stops = [stopMonitoring, startWorker(jobs), ...Object.entries(queues).map(([name, consume]) => startQueueConsumer(name, consume))];
const stop = async () => { await Promise.all(stops.map(cleanup => cleanup())); };
logger.info({ pid: process.pid }, 'Background worker started (monitoring listener only)');
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, 'Worker draining');
  const deadline = setTimeout(() => process.exit(1), 15000);
  void stop().then(closeDatabaseConnections).catch(err => {
    logger.error({ err }, 'Worker shutdown failed'); process.exitCode = 1;
  }).finally(() => clearTimeout(deadline));
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
