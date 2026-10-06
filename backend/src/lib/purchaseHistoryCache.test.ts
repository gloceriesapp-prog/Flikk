import { expect, it, vi } from 'vitest';
import { QueryClient } from '../../../apps/customer/node_modules/@tanstack/react-query/build/modern/index.js';
const api = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('../../../apps/customer/src/api/orders', () => ({ fetchOrderHistory: api.read }));
import { purchaseHistoryOptions } from '../../../apps/customer/src/features/purchases/historyQuery';

it('combines prewarming and screen reads, reuses fresh data and isolates accounts', async () => {
  const client = new QueryClient();
  let release!: (value: { items: never[]; nextCursor: null }) => void;
  api.read.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  const options = purchaseHistoryOptions('account-a');
  const warm = client.prefetchInfiniteQuery(options);
  const screen = client.fetchInfiniteQuery(options);
  expect(api.read).toHaveBeenCalledTimes(1);
  release({ items: [], nextCursor: null });
  await Promise.all([warm, screen]);
  await client.fetchInfiniteQuery(options);
  expect(api.read).toHaveBeenCalledTimes(1);
  api.read.mockResolvedValue({ items: [], nextCursor: null });
  await client.fetchInfiniteQuery(purchaseHistoryOptions('account-b'));
  expect(api.read).toHaveBeenCalledTimes(2);
  await client.invalidateQueries({ queryKey: ['my-orders', 'account-a'], refetchType: 'none' });
  await client.fetchInfiniteQuery(options);
  expect(api.read).toHaveBeenCalledTimes(3);
  client.clear();
});

it('keeps previously loaded purchases if background refresh fails', async () => {
  const client = new QueryClient();
  const options = { ...purchaseHistoryOptions('account-c'), retry: false };
  api.read.mockResolvedValueOnce({ items: [{ id: 'existing-order' }], nextCursor: null });
  await client.fetchInfiniteQuery(options);
  api.read.mockRejectedValueOnce(new Error('Offline'));
  await client.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
  await expect(client.fetchInfiniteQuery(options)).rejects.toThrow('Offline');
  expect(client.getQueryData(options.queryKey)).toMatchObject({ pages: [{ items: [{ id: 'existing-order' }] }] });
  client.clear();
});
