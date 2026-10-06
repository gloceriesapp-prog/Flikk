import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { metrics } from '../observability/metrics.js';
import { performance } from 'node:perf_hooks';

export interface WorkClaim { name: string; lease_token: string; scheduled_for: string; attempts: number }
export type Job = (scheduledFor: Date, assertActive: () => Promise<void>) => Promise<unknown>;
export type Jobs = Record<string, Job>;

// Durable scheduling and per-job row leases are shared by worker replicas.
// Lease ownership is renewed before work and fenced again on completion.
export async function executeClaim(claim: WorkClaim, jobs: Jobs) {
  let lost = false;
  let renewing = false;
  const assertActive = async () => {
    if (lost) throw new Error('Job lease lost');
    const { data, error } = await supabase.rpc('renew_scheduled_work', { p_name: claim.name, p_token: claim.lease_token });
    if (error || data !== true) { lost = true; throw error ?? new Error('Job lease lost'); }
  };
  const heartbeat = setInterval(() => {
    if (renewing || lost) return;
    renewing = true;
    void assertActive().catch(err => logger.error({ err, job: claim.name }, 'Worker lease renewal failed'))
      .finally(() => { renewing = false; });
  }, 30000);
  heartbeat.unref();
  let failure: string | null = null;
  try {
    await assertActive();
    const job = jobs[claim.name];
    if (!job) throw new Error('Unknown scheduled job');
    await job(new Date(claim.scheduled_for), assertActive);
    await assertActive();
  } catch (err) {
    failure = 'Execution failed; see worker logs';
    logger.error({ err, job: claim.name, attempts: claim.attempts }, 'Scheduled job failed');
  } finally { clearInterval(heartbeat); }
  if (lost) return; // A replacement owns the job; never stamp its result.
  const { error } = await supabase.rpc('finish_scheduled_work', {
    p_name: claim.name, p_token: claim.lease_token, p_error: failure,
  });
  if (error) throw error;
}

// Queue consumers use the existing per-item SKIP LOCKED/lease contracts.
// Each replica may consume them; parallel replicas increase queue throughput
// without starting another singleton payout/dispatch/expiry scheduler.
export function startQueueConsumer(name: string, consume: (shouldStop: () => boolean) => Promise<unknown>) {
  return startPoller(shouldStop => consume(shouldStop), name);
}
export function startWorker(jobs: Jobs): () => Promise<void> {
  return startPoller(async () => {
    const { data, error } = await supabase.rpc('claim_scheduled_work', { p_limit: 1 });
    if (error) throw error;
    for (const claim of (data ?? []) as WorkClaim[]) await executeClaim(claim, jobs);
  }, 'scheduled-work');
}
function startPoller(tick: (shouldStop: () => boolean) => Promise<unknown>, name: string): () => Promise<void> {
  let stopped = false;
  let running: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let failures = 0;
  const poll = () => {
    if (stopped) return;
    const started=performance.now();
    metrics.gauge('flikk_worker_running',1,{queue:name});
    let more=false;
    running = tick(() => stopped).then(result => {
      failures = 0; more=!!result && typeof result==='object' && 'more' in result && result.more===true;
      metrics.increment('flikk_worker_passes_total',{queue:name,outcome:'success'});
      metrics.gauge('flikk_worker_last_success_timestamp_seconds',Date.now()/1000,{queue:name});
    }).catch(err => {
      metrics.increment('flikk_worker_passes_total',{queue:name,outcome:'error'});
      failures++;
      logger.error({ err, queue: name }, 'Worker polling failed');
    }).finally(() => {
      running = undefined;
      metrics.gauge('flikk_worker_running',0,{queue:name});
      metrics.observe('flikk_worker_pass_duration_seconds',(performance.now()-started)/1000,{queue:name});
      if (!stopped) timer = setTimeout(poll, more && !failures ? 25+Math.random()*75 : Math.min(30000, 1500 * 2 ** Math.min(failures, 4)) + Math.random() * 1500);
    });
  };
  poll();
  return async () => { stopped = true; clearTimeout(timer); await running; };
}
