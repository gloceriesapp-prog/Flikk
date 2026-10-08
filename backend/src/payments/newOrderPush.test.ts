vi.mock('../stores/pushRecipients.js', () => ({ storePushRecipients: async (_store: string, owner: string | null) => owner ? [owner] : [] }));
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: unknown[] = [];
const orders = [{ id: 'order-1234', store_id: 'store-1', total: 250, item_total: 220, trip_id: null }];

vi.mock('../db/supabase.js', () => ({
  supabase: {
    from(table: string) {
      if (table === 'orders') {
        return { select: () => ({ eq: async () => ({ data: orders, error: null }) }) };
      }
      // PostgREST returns the owner embed as an OBJECT for a many-to-one join.
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { users: { expo_push_token: 'ExponentPushToken[owner]' } } }) }) }) };
    },
  },
}));
vi.mock('../lib/pushNotifications.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/pushNotifications.js')>()),
  sendPushNotification: vi.fn(async (...args: unknown[]) => { sent.push(args); }),
}));

const { notifyStoresOfNewOrder } = await import('./newOrderPush.js');

describe('notifyStoresOfNewOrder', () => {
  beforeEach(() => { sent.length = 0; });

  it('reaches the owner when the embed is an object, on the loud orders channel', async () => {
    await notifyStoresOfNewOrder({ orderId: 'order-1234' });
    expect(sent).toEqual([[
      'ExponentPushToken[owner]',
      'New order received',
      'Order ORDER- · ₹250 — tap to view.',
      { channelId: 'orders', priority: 'high', data: { type: 'new_order', orderId: 'order-1234' } },
    ]]);
  });
});
