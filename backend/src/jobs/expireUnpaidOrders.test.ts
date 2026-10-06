import { expect, it, vi } from 'vitest';
vi.mock('../db/supabase.js',()=>({supabase:{rpc:vi.fn()}}));
import { drainExpiredReservations } from './expireUnpaidOrders.js';
it('drains full parent batches promptly, including trips with multiple legs',async()=>{
  const batch=vi.fn().mockResolvedValueOnce({cancelled_orders:300,single_targets:100,trip_targets:100})
    .mockResolvedValueOnce({cancelled_orders:120,single_targets:100,trip_targets:10})
    .mockResolvedValueOnce({cancelled_orders:5,single_targets:5,trip_targets:0});
  expect(await drainExpiredReservations(batch)).toEqual({more:false});expect(batch).toHaveBeenCalledTimes(3);
});
it('yields after its budget and signals another prompt pass',async()=>{
  const batch=vi.fn().mockResolvedValue({cancelled_orders:100,single_targets:100,trip_targets:0});
  expect(await drainExpiredReservations(batch)).toEqual({more:true});expect(batch).toHaveBeenCalledTimes(10);
});
it('does not start another batch after shutdown or swallow a failed transaction',async()=>{
  const stopped=vi.fn();expect(await drainExpiredReservations(stopped,()=>true)).toEqual({more:false});expect(stopped).not.toHaveBeenCalled();
  await expect(drainExpiredReservations(async()=>{throw new Error('Lock contention');})).rejects.toThrow('Lock contention');
});
