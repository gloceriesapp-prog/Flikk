import { afterEach, expect, it, vi } from 'vitest';
const rpc=vi.hoisted(()=>vi.fn(()=>({abortSignal:async()=>({data:{sampled_at:new Date().toISOString(),values:{lock_waiters:2}},error:null})})));
vi.mock('../db/supabase.js',()=>({supabase:{rpc}}));
vi.mock('../lib/logger.js',()=>({logger:{warn:vi.fn(),error:vi.fn()}}));
import { startMonitoring } from './runtime.js';
afterEach(()=>vi.unstubAllEnvs());
it('protects metrics and distinguishes readiness from liveness',async()=>{
  vi.stubEnv('METRICS_TOKEN','a'.repeat(32));
  let ready=true;const stop=await startMonitoring('worker',()=>ready,0);
  try {
    const base=`http://127.0.0.1:${stop.port}`;
    expect((await fetch(`${base}/metrics`)).status).toBe(404);
    const metrics=await fetch(`${base}/metrics`,{headers:{Authorization:`Bearer ${'a'.repeat(32)}`}});
    expect(metrics.status).toBe(200);expect(await metrics.text()).toContain('flikk_event_loop_utilization');
    expect((await fetch(`${base}/readyz`)).status).toBe(200);ready=false;
    expect((await fetch(`${base}/readyz`)).status).toBe(503);expect((await fetch(`${base}/livez`)).status).toBe(200);
  } finally {await stop();}
});
it('does not collect database snapshots or expose metrics without a token',async()=>{
  vi.stubEnv('METRICS_TOKEN','');rpc.mockClear();const stop=await startMonitoring('api',()=>true,0);
  try {expect(rpc).not.toHaveBeenCalled();expect((await fetch(`http://127.0.0.1:${stop.port}/metrics`)).status).toBe(404);}
  finally {await stop();}
});
