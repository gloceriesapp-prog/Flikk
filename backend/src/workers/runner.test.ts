import { afterEach, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../db/supabase.js', () => ({ supabase: { rpc } }));
vi.mock('../lib/logger.js', () => ({ logger: {error:vi.fn()} }));
import { executeClaim } from './runner.js';
const claim = {name:'weekly',lease_token:'token',scheduled_for:'2026-09-14T03:30:00Z',attempts:2};
afterEach(() => vi.clearAllMocks());
it('runs with the persisted schedule time and fences completion', async () => {
  rpc.mockResolvedValue({data:true,error:null});
  const job=vi.fn(async (_date, guard) => {await guard();});
  await executeClaim(claim,{weekly:job});
  expect(job.mock.calls[0]![0].toISOString()).toBe(new Date(claim.scheduled_for).toISOString());
  expect(rpc).toHaveBeenLastCalledWith('finish_scheduled_work',{p_name:'weekly',p_token:'token',p_error:null});
});
it('does not execute or finish a lost lease', async () => {
  rpc.mockResolvedValue({data:false,error:null});
  const job=vi.fn();await executeClaim(claim,{weekly:job});
  expect(job).not.toHaveBeenCalled();
  expect(rpc.mock.calls.every(([name]) => name==='renew_scheduled_work')).toBe(true);
});
it('records a retry instead of marking a failed run successful', async () => {
  rpc.mockResolvedValue({data:true,error:null});
  await executeClaim(claim,{weekly:async()=>{throw new Error('DB unavailable');}});
  expect(rpc).toHaveBeenLastCalledWith('finish_scheduled_work',expect.objectContaining({p_error:expect.any(String)}));
});
it('stops guarded side effects after lease ownership is lost during work', async () => {
  rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:false,error:null});
  const sideEffect=vi.fn();
  await executeClaim(claim,{weekly:async (_date,guard)=>{await guard();sideEffect();}});
  expect(sideEffect).not.toHaveBeenCalled();
  expect(rpc.mock.calls.some(([name])=>name==='finish_scheduled_work')).toBe(false);
});
it('does not overlap a queue batch locally and drains it before stopping', async () => {
  vi.useFakeTimers();
  try {
    const { startQueueConsumer } = await import('./runner.js');
    let finish!: () => void;
    const consume=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
    const stop=startQueueConsumer('outbox',consume);
    await vi.advanceTimersByTimeAsync(10000);
    expect(consume).toHaveBeenCalledOnce();
    const stopped=stop();finish();await stopped;
    await vi.advanceTimersByTimeAsync(30000);
    expect(consume).toHaveBeenCalledOnce();
  } finally {vi.useRealTimers();}
});
