import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { orderDetailQueryOptions } from '../../../apps/partner/src/screens/order-detail/orderDetailQuery';
import type { PartnerOrder } from '../../../apps/partner/src/screens/orders/data';

const order = { id: 'sample-order', total: 231, status: 'placed' } as PartnerOrder;
function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

it('keeps an open detail when background polling removes its queue row', () => {
  const cache = client();
  const read = vi.fn().mockResolvedValue(order);
  const options = { epoch: 1, orderId: order.id, cached: order, read, enabled: false };
  const observer = new QueryObserver(cache, orderDetailQueryOptions(options));
  const stop = observer.subscribe(() => {});
  observer.setOptions(orderDetailQueryOptions({ ...options, cached: undefined }));
  expect(observer.getCurrentResult().data).toEqual(order);
  expect(observer.getCurrentResult().isPending).toBe(false);
  expect(read).not.toHaveBeenCalled();
  stop(); cache.clear();
});

it('preserves the last order through a transient detail-fetch failure', async () => {
  const cache = client();
  const observer = new QueryObserver(cache, orderDetailQueryOptions({
    epoch: 1, orderId: order.id, cached: order,
    read: async () => { throw new Error('offline'); }, enabled: false,
  }));
  const stop = observer.subscribe(() => {});
  await observer.refetch();
  expect(observer.getCurrentResult().isError).toBe(true);
  expect(observer.getCurrentResult().data).toEqual(order);
  stop(); cache.clear();
});

it('does not expose an old detail after the account or order changes', () => {
  const cache = client();
  const options = { epoch: 1, orderId: order.id, cached: order, read: async () => order, enabled: false };
  const observer = new QueryObserver(cache, orderDetailQueryOptions(options));
  const stop = observer.subscribe(() => {});
  observer.setOptions(orderDetailQueryOptions({ ...options, epoch: 2, cached: undefined }));
  expect(observer.getCurrentResult().data).toBeUndefined();
  observer.setOptions(orderDetailQueryOptions({ ...options, orderId: 'different-order' }));
  expect(observer.getCurrentResult().data).toBeUndefined();
  stop(); cache.clear();
});

it('reflects local preparation status while retaining the full order snapshot', () => {
  const cache = client();
  const options = orderDetailQueryOptions({ epoch: 1, orderId: order.id, cached: order, read: async () => order, enabled: false });
  const observer = new QueryObserver(cache, options);
  const stop = observer.subscribe(() => {});
  cache.setQueryData(options.queryKey, { ...order, status: 'packed' });
  expect(observer.getCurrentResult().data).toEqual({ ...order, status: 'packed' });
  stop(); cache.clear();
});
