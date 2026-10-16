import { expect, it, vi } from 'vitest';
import { notifyStoresOfNewOrder } from './newOrderPush.js';
it('does not race the transactional outbox with a second post-commit send', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  await notifyStoresOfNewOrder({ orderId: 'order-1' });
  await notifyStoresOfNewOrder({ tripId: 'trip-1' });
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
