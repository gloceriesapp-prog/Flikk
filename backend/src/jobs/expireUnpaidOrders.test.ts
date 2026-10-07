import { beforeEach, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../db/supabase.js',()=>({supabase:{rpc}}));
// Default provider reader for runReservationExpiry: an outage, never the network.
vi.mock('../payments/recovery.js', async (load) => ({ ...await load<typeof import('../payments/recovery.js')>(),
  reconcileProvider: vi.fn().mockRejectedValue(new Error('provider down')) }));
// Never terminate a real Cashfree order from tests.
const terminate = vi.hoisted(() => vi.fn().mockResolvedValue('TERMINATED'));
vi.mock('../payments/cashfreeClient.js', async (load) => ({ ...await load<typeof import('../payments/cashfreeClient.js')>(), terminateCfOrder: terminate }));
import { drainExpiredReservations, reconcileBeforeExpiry, runReservationExpiry, RECONCILE_BATCH } from './expireUnpaidOrders.js';
import { AppError } from '../lib/errors.js';
beforeEach(() => vi.clearAllMocks());
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

const ORDER = '11111111-1111-4111-8111-111111111111';
const TRIP = '22222222-2222-4222-8222-222222222222';
function claim(rows: unknown[]) {
  rpc.mockImplementation(async (name: string) => name === 'claim_checkout_expiry_reconciliation' ? { data: rows, error: null } : { data: null, error: null });
}
const marked = () => rpc.mock.calls.filter(([name]) => name === 'mark_checkout_expiry_checked').map(([, args]) => args);

it('settles captured payments and lets authorized ones lapse before marking them expirable', async () => {
  claim([{ kind: 'order', target_id: ORDER, provider_order_id: 'order_a', total: '120.50' },
    { kind: 'trip', target_id: TRIP, provider_order_id: 'order_b', total: 300 }]);
  const reconcile = vi.fn().mockResolvedValueOnce('paid').mockResolvedValueOnce('pending');
  expect(await reconcileBeforeExpiry(reconcile)).toEqual({ claimed: 2 });
  expect(rpc).toHaveBeenCalledWith('claim_checkout_expiry_reconciliation', { p_limit: RECONCILE_BATCH });
  expect(reconcile).toHaveBeenNthCalledWith(1, expect.objectContaining({ target: { orderId: ORDER } }), 'order_a', 120.5);
  expect(reconcile).toHaveBeenNthCalledWith(2, expect.objectContaining({ target: { tripId: TRIP } }), 'order_b', 300);
  expect(marked()).toEqual([{ p_kind: 'order', p_target_id: ORDER }, { p_kind: 'trip', p_target_id: TRIP }]);
});

it('terminates the Cashfree order before the final provider read', async () => {
  claim([{ kind: 'order', target_id: ORDER, provider_order_id: 'gl_a', total: 10 }]);
  const reconcile = vi.fn().mockResolvedValue('unpaid');
  await reconcileBeforeExpiry(reconcile);
  expect(terminate).toHaveBeenCalledWith('gl_a');
  expect(terminate.mock.invocationCallOrder[0]).toBeLessThan(reconcile.mock.invocationCallOrder[0]);
});

it('marks a late capture the SQL rejected (refund path) and an unpaid checkout as checked', async () => {
  claim([{ kind: 'order', target_id: ORDER, provider_order_id: 'order_a', total: 10 }]);
  await reconcileBeforeExpiry(vi.fn().mockResolvedValue('cancelled'));
  claim([{ kind: 'order', target_id: ORDER, provider_order_id: 'order_a', total: 10 }]);
  await reconcileBeforeExpiry(vi.fn().mockResolvedValue('unpaid'));
  expect(marked()).toHaveLength(2);
});

it('leaves a provider outage leased for retry, but expires a mismatched payment for review', async () => {
  claim([{ kind: 'order', target_id: ORDER, provider_order_id: 'order_a', total: 10 },
    { kind: 'trip', target_id: TRIP, provider_order_id: 'order_b', total: 10 }]);
  const reconcile = vi.fn().mockRejectedValueOnce(new Error('ECONNRESET'))
    .mockRejectedValueOnce(new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'mismatch'));
  await reconcileBeforeExpiry(reconcile);
  expect(marked()).toEqual([{ p_kind: 'trip', p_target_id: TRIP }]);
});

it('stops between provider reads on shutdown and asks for another pass after a full batch', async () => {
  claim([{ kind: 'order', target_id: ORDER, provider_order_id: 'order_a', total: 10 }]);
  const reconcile = vi.fn();
  await reconcileBeforeExpiry(reconcile, () => true);
  expect(reconcile).not.toHaveBeenCalled();
  expect(marked()).toEqual([]);
  rpc.mockImplementation(async (name: string) => name === 'claim_checkout_expiry_reconciliation'
    ? { data: Array.from({ length: RECONCILE_BATCH }, () => ({ kind: 'order', target_id: ORDER, provider_order_id: 'x', total: 1 })), error: null }
    : name === 'expire_checkout_reservation_batch' ? { data: { cancelled_orders: 0, single_targets: 0, trip_targets: 0 }, error: null }
    : { data: null, error: null });
  // Every provider read fails (mocked outage) and stays leased.
  expect((await runReservationExpiry(() => false)).more).toBe(true);
});
