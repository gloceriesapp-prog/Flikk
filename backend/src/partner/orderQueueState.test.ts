import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ fetch: vi.fn(), accept: vi.fn(), update: vi.fn(), digest: vi.fn(), page: vi.fn(), transitions: vi.fn() }));
vi.mock('../../../apps/partner/src/api/orders', () => ({ fetchOrders: m.fetch, fetchOrderUpdates: m.digest, fetchOrderPage: m.page, fetchOrderTransitions: m.transitions, acceptOrder: m.accept, updateOrderStatus: m.update }));
vi.mock('../../../apps/partner/src/screens/orders/data', () => ({
  mapApiOrder: (row: { id: string; status: string; accepted_at?: string }) => ({ id: row.id, status: row.status, acceptedAtTimestamp: row.accepted_at ? Date.parse(row.accepted_at) : undefined }),
  buildSimulatedIncomingOrder: () => ({ id: 'sample-one', status: 'placed' }),
}));
import { useOrdersStore } from '../../../apps/partner/src/store/useOrdersStore';
import { resetSessionScope } from '../../../apps/partner/src/store/sessionScope';
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
const row = (id = 'one', extra = {}) => ({ id, status: 'placed', payment_method: 'cod', provider_payment_id: null, ...extra });
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('__DEV__', false); resetSessionScope(); m.transitions.mockResolvedValue([]); });
it('coalesces queue reads and excludes unpaid online orders', async () => {
  const pending = deferred<unknown[]>(); m.fetch.mockReturnValue(pending.promise);
  const a = useOrdersStore.getState().loadOrders(), b = useOrdersStore.getState().loadOrders();
  expect(a).toBe(b); expect(m.fetch).toHaveBeenCalledOnce();
  pending.resolve([row(), row('unpaid', { payment_method: 'online' }), row('paid', { payment_method: 'online', provider_payment_id: 'pay_one' })]);
  await a; expect(useOrdersStore.getState().orders.map(order => order.id)).toEqual(['one', 'paid']);
});
it('never injects implicit sample orders into an empty debug queue', async () => {
  vi.stubGlobal('__DEV__', true); m.fetch.mockResolvedValue([]); await useOrdersStore.getState().loadOrders(); expect(useOrdersStore.getState().orders).toEqual([]);
});
it('does not accept locally until server acceptance succeeds and coalesces taps', async () => {
  const pending = deferred<unknown>(); m.accept.mockReturnValue(pending.promise);
  const a = useOrdersStore.getState().acknowledgeOrder('one'), b = useOrdersStore.getState().acknowledgeOrder('one');
  expect(a).toBe(b); expect(useOrdersStore.getState().acknowledgedOrderIds.has('one')).toBe(false);
  pending.resolve(row('one', { accepted_at: '2026-10-15T00:00:00Z' })); await a;
  expect(m.accept).toHaveBeenCalledOnce(); expect(useOrdersStore.getState().acknowledgedOrderIds.has('one')).toBe(true);
});
it('keeps a declined order visible if the backend rejects the request', async () => {
  m.fetch.mockResolvedValue([row()]); await useOrdersStore.getState().loadOrders(); m.update.mockRejectedValue(new Error('offline'));
  await expect(useOrdersStore.getState().rejectOrder('one', 'unavailable')).rejects.toThrow('offline');
  expect(useOrdersStore.getState().orders.map(order => order.id)).toEqual(['one']);
});
it('restores server acceptance after restart/read', async () => {
  m.fetch.mockResolvedValue([row('one', { accepted_at: '2026-10-15T00:00:00Z' })]); await useOrdersStore.getState().loadOrders();
  expect(useOrdersStore.getState().acknowledgedOrderIds.has('one')).toBe(true);
});
it('clears private queue immediately and discards an earlier account response', async () => {
  const pending = deferred<unknown[]>(); m.fetch.mockReturnValue(pending.promise);
  const loading = useOrdersStore.getState().loadOrders(); resetSessionScope(); pending.resolve([row('private-a')]); await loading;
  expect(useOrdersStore.getState().orders).toEqual([]); expect(useOrdersStore.getState().baselineEstablished).toBe(false);
});
it('does not let an old poll overwrite a completed mutation', async () => {
  m.fetch.mockResolvedValueOnce([row()]); await useOrdersStore.getState().loadOrders(); const pending = deferred<unknown[]>(); m.fetch.mockReturnValueOnce(pending.promise);
  const loading = useOrdersStore.getState().loadOrders(); m.update.mockResolvedValue({ status: 'packed' }); await useOrdersStore.getState().markPacked('one');
  pending.resolve([row()]); await loading; expect(useOrdersStore.getState().orders[0]?.status).toBe('packed');
});
it('preserves last loaded queue and reports a refresh failure', async () => {
  m.fetch.mockResolvedValueOnce([row()]); await useOrdersStore.getState().loadOrders(); m.fetch.mockRejectedValue(new Error('offline'));
  await expect(useOrdersStore.getState().loadOrders()).rejects.toThrow('offline'); expect(useOrdersStore.getState().orders).toHaveLength(1); expect(useOrdersStore.getState().error).toBe('offline');
});

it('retries a failed read immediately, coalesces taps and clears the error only on success', async () => {
  m.fetch.mockResolvedValueOnce([row()]); await useOrdersStore.getState().loadOrders();
  m.fetch.mockRejectedValueOnce(new Error('offline'));
  await expect(useOrdersStore.getState().loadOrders()).rejects.toThrow('offline');
  const pending = deferred<unknown[]>(); m.fetch.mockReturnValueOnce(pending.promise);
  const first = useOrdersStore.getState().loadOrders();
  expect(useOrdersStore.getState().loadOrders()).toBe(first);
  expect(useOrdersStore.getState().loading).toBe(true);
  expect(useOrdersStore.getState().error).toBe('offline');
  expect(useOrdersStore.getState().orders).toHaveLength(1);
  pending.resolve([row('recovered')]); await first;
  expect(useOrdersStore.getState().error).toBeNull();
  expect(useOrdersStore.getState().loading).toBe(false);
  expect(useOrdersStore.getState().orders[0]?.id).toBe('recovered');
});

it('does not let an older digest failure restore the error after manual recovery', async () => {
  m.fetch.mockResolvedValue([row()]); await useOrdersStore.getState().loadOrders();
  let fail!: (error: Error) => void;
  m.digest.mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
  const polling = useOrdersStore.getState().refreshUpdates();
  await useOrdersStore.getState().loadOrders();
  fail(new Error('old network failure'));
  await expect(polling).rejects.toThrow('old network failure');
  expect(useOrdersStore.getState().error).toBeNull();
});

it('reconciles the full queue after an error even when the digest did not change', async () => {
  m.digest.mockResolvedValue({ version: 'same', hasMore: false });
  m.fetch.mockResolvedValue([row()]);
  await useOrdersStore.getState().refreshUpdates();
  m.fetch.mockRejectedValueOnce(new Error('offline'));
  await expect(useOrdersStore.getState().loadOrders()).rejects.toThrow('offline');
  await useOrdersStore.getState().refreshUpdates();
  expect(m.fetch).toHaveBeenCalledTimes(3);
  expect(useOrdersStore.getState().error).toBeNull();
});

it('unchanged digest skips nested reads and failures preserve the queue', async () => {
  m.digest.mockResolvedValue({ version: 'a', hasMore: false }); m.fetch.mockResolvedValue([row()]);
  await useOrdersStore.getState().refreshUpdates(); await useOrdersStore.getState().refreshUpdates();
  expect(m.fetch).toHaveBeenCalledOnce();
  m.digest.mockRejectedValueOnce(new Error('offline'));
  await expect(useOrdersStore.getState().refreshUpdates()).rejects.toThrow('offline');
  expect(useOrdersStore.getState().orders).toHaveLength(1);
});
it('coalesces digest reads and does not retain an old account version', async () => {
  const pending = deferred<{ version: string }>(); m.digest.mockReturnValueOnce(pending.promise);
  const a = useOrdersStore.getState().refreshUpdates(), b = useOrdersStore.getState().refreshUpdates(); expect(a).toBe(b);
  resetSessionScope(); pending.resolve({ version: 'old' }); await a; expect(m.fetch).not.toHaveBeenCalled();
});
it('keeps active pagination bounded and appends only on explicit request', async () => {
  m.fetch.mockResolvedValue(Object.assign([row()], { nextCursor: 'next' }));
  await useOrdersStore.getState().loadOrders(); expect(m.page).not.toHaveBeenCalled();
  m.page.mockResolvedValue({ items: [row(), row('two')], nextCursor: null });
  await useOrdersStore.getState().loadMore(); expect(useOrdersStore.getState().orders.map(order => order.id)).toEqual(['one', 'two']);
});

it('looks up disappeared orders once and preserves confirmed earnings until consumed', async () => {
  m.fetch.mockResolvedValueOnce([row('one', { status: 'out_for_delivery' })]);
  await useOrdersStore.getState().loadOrders();
  m.fetch.mockResolvedValue([]); m.transitions.mockResolvedValue([row('one', { status: 'delivered' })]);
  await useOrdersStore.getState().loadOrders();
  expect(m.transitions).toHaveBeenCalledWith(['one']);
  expect(useOrdersStore.getState().justDeliveredOrderIds.has('one')).toBe(true);
  await useOrdersStore.getState().loadOrders();
  expect(m.transitions).toHaveBeenCalledTimes(1);
  expect(useOrdersStore.getState().orders[0]?.status).toBe('delivered');
  useOrdersStore.getState().clearJustDelivered('one');
  expect(useOrdersStore.getState().orders).toEqual([]);
});
it('does not append an old cursor page after a newer first-page refresh', async () => {
  m.fetch.mockResolvedValueOnce(Object.assign([row()], { nextCursor: 'next' }));
  await useOrdersStore.getState().loadOrders();
  const pending = deferred<unknown>(); m.page.mockReturnValueOnce(pending.promise);
  const older = useOrdersStore.getState().loadMore();
  m.fetch.mockResolvedValueOnce(Object.assign([row('new')], { nextCursor: 'next' }));
  await useOrdersStore.getState().loadOrders();
  pending.resolve({ items: [row('stale')], nextCursor: null }); await older;
  expect(useOrdersStore.getState().orders.map(order => order.id)).toEqual(['new']);
});
it('does not let a stale digest failure overwrite a successful mutation', async () => {
  m.fetch.mockResolvedValueOnce([row()]); await useOrdersStore.getState().loadOrders();
  let reject!: (error: Error) => void;
  m.digest.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
  const polling = useOrdersStore.getState().refreshUpdates();
  m.accept.mockResolvedValue(row('one', { accepted_at: '2026-10-15T00:00:00Z' }));
  await useOrdersStore.getState().acknowledgeOrder('one');
  reject(new Error('old outage')); await expect(polling).rejects.toThrow('old outage');
  expect(useOrdersStore.getState().error).toBeNull();
});
it('periodically refreshes the bounded first page even when the digest is unchanged', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
  try {
    m.digest.mockResolvedValue({ version: 'a', hasMore: false }); m.fetch.mockResolvedValue([row()]);
    await useOrdersStore.getState().refreshUpdates();
    now.mockReturnValue(121_001); await useOrdersStore.getState().refreshUpdates();
    expect(m.fetch).toHaveBeenCalledTimes(2);
  } finally { now.mockRestore(); }
});
