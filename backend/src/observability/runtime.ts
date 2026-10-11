import { createServer, type IncomingMessage } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { metrics } from './metrics.js';
import { workerHealthFromHeartbeat } from './workerHealth.js';
import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
export function authorizedMetrics(req: IncomingMessage, token: string | undefined) {
  if (!token) return false;
  const header = req.headers.authorization;
  if (!header || header.length > 1024) return false;
  const actual = Buffer.from(header); const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual,expected);
}
export async function startMonitoring(role: 'api' | 'worker', ready: () => boolean, testPort?: number) {
  const port = testPort ?? Number(process.env.METRICS_PORT ?? (role === 'api' ? 9464 : 9465));
  const host = process.env.METRICS_HOST ?? '127.0.0.1';
  const token = process.env.METRICS_TOKEN;
  if (!Number.isInteger(port) || (port < 1 && testPort !== 0) || port > 65535 || token && token.length < 32) throw new Error('Invalid monitoring port or token (minimum 32 characters)');
  let stopping = false;
  const server = createServer((req,res) => {
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (req.url === '/livez' || req.url === '/readyz') {
      const ok = !stopping && (req.url === '/livez' || ready());
      res.writeHead(ok ? 200 : 503, {'Content-Type':'application/json'}).end(JSON.stringify({ok,role})); return;
    }
    if (req.url !== '/metrics' || !authorizedMetrics(req,token)) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type':'text/plain; version=0.0.4','Cache-Control':'no-store'}).end(metrics.render());
  });
  try {
    await new Promise<void>((resolve,reject) => { server.once('error',reject); server.listen(port,host,resolve); });
  } catch(error) { throw new Error(`Monitoring listener ${host}:${port} failed: ${error instanceof Error ? error.message : String(error)}`); }
  server.on('error',err => logger.error({err},'Monitoring server error'));
  const lag = monitorEventLoopDelay({resolution:20}); lag.enable();
  let utilization = performance.eventLoopUtilization();
  let collecting: Promise<void> | undefined;
  const collect = async () => {
    const memory = process.memoryUsage();
    metrics.gauge('flikk_process_rss_bytes',memory.rss); metrics.gauge('flikk_process_heap_used_bytes',memory.heapUsed);
    metrics.gauge('flikk_process_uptime_seconds',process.uptime());
    metrics.gauge('flikk_process_cpu_seconds', (process.cpuUsage().user+process.cpuUsage().system)/1e6);
    const now = performance.eventLoopUtilization();
    metrics.gauge('flikk_event_loop_utilization',performance.eventLoopUtilization(now,utilization).utilization); utilization=now;
    metrics.gauge('flikk_event_loop_delay_p99_seconds',lag.percentile(99)/1e9);
    metrics.gauge('flikk_event_loop_delay_max_seconds',lag.max/1e9); lag.reset();
    if (!token) return; // No collector overhead when metrics are disabled.
    try {
      const {data,error} = await supabase.rpc('capacity_snapshot').abortSignal(AbortSignal.timeout(5000));
      if (error) throw error;
      if (!data || !Number.isFinite(Date.parse(data.sampled_at))) throw new Error('Invalid capacity snapshot');
      metrics.gauge('flikk_database_sample_timestamp_seconds',Date.parse(data.sampled_at)/1000,{role});
      for (const [name,value] of Object.entries(data.values ?? {}))
        if (/^[a-z_]+$/.test(name) && typeof value === 'number') metrics.gauge(`flikk_database_${name}`,value,{role});
      metrics.gauge('flikk_database_collector_success',1,{role});
    } catch(err) { metrics.gauge('flikk_database_collector_success',0,{role}); logger.warn({err},'Capacity collector unavailable; apply migration 077'); }
    // Worker liveness, surfaced only from the API side (the worker stamps the
    // heartbeat we read here, so it never needs to grade itself). The freshest
    // scheduled_work.last_success_at is a free worker heartbeat — see
    // observability/workerHealth.ts. Exposed as a metric + WARN so "workers
    // down" is detectable, never silent; deliberately NOT folded into /readyz,
    // which must keep reporting this API process healthy even when the
    // separate worker is down (failing readyz would evict a serving API).
    if (role === 'api') {
      try {
        const { data, error } = await supabase.from('scheduled_work')
          .select('last_success_at').order('last_success_at',{ascending:false,nullsFirst:false}).limit(1).maybeSingle();
        if (error) throw error;
        const lastRunMs = data?.last_success_at ? Date.parse(data.last_success_at) : null;
        const health = workerHealthFromHeartbeat(Number.isFinite(lastRunMs as number) ? lastRunMs : null, Date.now());
        metrics.gauge('flikk_worker_healthy', health.healthy ? 1 : 0);
        if (health.ageSeconds !== null) metrics.gauge('flikk_worker_heartbeat_age_seconds', health.ageSeconds);
        if (health.warn) logger.warn({ ageSeconds: health.ageSeconds }, 'Background worker heartbeat is stale; dispatch, payouts and stuck-state alerts may not be running');
      } catch(err) { metrics.gauge('flikk_worker_healthy',0); logger.warn({err},'Worker heartbeat check unavailable'); }
    }
  };
  const sample = () => { if (!collecting) collecting = collect().finally(() => {collecting=undefined;}); };
  sample();
  const timer=setInterval(sample,15000+Math.floor(Math.random()*2000)); timer.unref();
  const stop = async () => {
    stopping=true; clearInterval(timer); lag.disable();
    await Promise.all([collecting,new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeIdleConnections();})]);
  };
  const address=server.address();
  return Object.assign(stop,{port:typeof address==='object' && address ? address.port : port});
}
