import { beforeEach, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../db/supabase.js', () => ({ supabase: { rpc } }));
import { cancelUnansweredOrders, runStoreNoResponse, STORE_NO_RESPONSE_BATCH, STORE_NO_RESPONSE_REASON } from './storeNoResponse.js';
import { queues } from '../workers/jobs.js';

beforeEach(() => vi.clearAllMocks());

it('runs one bounded SQL batch and returns its counts', async () => {
  rpc.mockResolvedValue({ data: { cancelled_orders: 3, single_targets: 1, trip_targets: 1, timeout_minutes: 10, cancelled: [] }, error: null });
  expect(await cancelUnansweredOrders()).toMatchObject({ cancelled_orders: 3, single_targets: 1, trip_targets: 1 });
  expect(rpc).toHaveBeenCalledWith('cancel_unanswered_store_orders', { p_limit: STORE_NO_RESPONSE_BATCH });
});

it('surfaces database failures and rejects malformed batches', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: new Error('lock timeout') });
  await expect(cancelUnansweredOrders()).rejects.toThrow('lock timeout');
  rpc.mockResolvedValueOnce({ data: { cancelled_orders: -1, single_targets: 0, trip_targets: 0 }, error: null });
  await expect(cancelUnansweredOrders()).rejects.toThrow('Invalid store no-response batch');
  rpc.mockResolvedValueOnce({ data: { cancelled_orders: 500, single_targets: 500, trip_targets: 0 }, error: null });
  await expect(cancelUnansweredOrders()).rejects.toThrow('Invalid store no-response batch');
});

it('asks for another pass only after a full batch and never starts after shutdown', async () => {
  const full = vi.fn().mockResolvedValue({ cancelled_orders: 50, single_targets: STORE_NO_RESPONSE_BATCH, trip_targets: 0, timeout_minutes: 10 });
  expect(await runStoreNoResponse(() => false, full)).toEqual({ more: true });
  const partial = vi.fn().mockResolvedValue({ cancelled_orders: 2, single_targets: 2, trip_targets: 0, timeout_minutes: 10 });
  expect(await runStoreNoResponse(() => false, partial)).toEqual({ more: false });
  const stopped = vi.fn();
  expect(await runStoreNoResponse(() => true, stopped)).toEqual({ more: false });
  expect(stopped).not.toHaveBeenCalled();
});

it('is registered as a worker queue with the reason code the apps label', () => {
  expect(queues.storeNoResponse).toBeTypeOf('function');
  expect(STORE_NO_RESPONSE_REASON).toBe('store_no_response');
});
