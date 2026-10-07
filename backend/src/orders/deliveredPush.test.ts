import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  legs: [] as Record<string, unknown>[],
  filters: [] as unknown[][],
  push: vi.fn(),
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    let storeId: unknown;
    const builder = {
      select: () => builder,
      eq: (k: string, v: unknown) => {
        db.filters.push([table, k, v]);
        if (table === 'stores') storeId = v;
        return table === 'orders' && k === 'status' ? Promise.resolve({ data: db.legs, error: null }) : builder;
      },
      single: () => Promise.resolve({ data: { users: { expo_push_token: `token-${storeId}` } }, error: null }),
    };
    return builder;
  },
} }));
vi.mock('../lib/pushNotifications.js', () => ({
  sendPushNotification: db.push,
  embeddedPushToken: (u: { expo_push_token: string }) => u.expo_push_token,
}));
import { notifyStoresOfDelivery } from './deliveredPush.js';

beforeEach(() => { vi.clearAllMocks(); db.legs = []; db.filters = []; });

it('sends every delivered trip leg its own store push with its own net amount', async () => {
  db.legs = [
    { id: 'leg-a', store_id: 'store-a', item_total: 200, commission_amount: 20 },
    { id: 'leg-b', store_id: 'store-b', item_total: 99.5, commission_amount: 9.95 },
  ];
  await notifyStoresOfDelivery({ id: 'leg-a', store_id: 'store-a', trip_id: 'trip-1' }, { item_total: 200, commission_amount: 20 });
  expect(db.filters).toContainEqual(['orders', 'trip_id', 'trip-1']);
  expect(db.filters).toContainEqual(['orders', 'status', 'delivered']);
  expect(db.push).toHaveBeenCalledTimes(2);
  expect(db.push).toHaveBeenCalledWith('token-store-a', '₹180 earned', expect.any(String), { data: { type: 'order_delivered', orderId: 'leg-a' } });
  expect(db.push).toHaveBeenCalledWith('token-store-b', '₹89.55 earned', expect.any(String), { data: { type: 'order_delivered', orderId: 'leg-b' } });
});

it('pushes only the order store for a single-store delivery', async () => {
  await notifyStoresOfDelivery({ id: 'o1', store_id: 'store-a', trip_id: null }, { item_total: 50, commission_amount: 5 });
  expect(db.filters.some(f => f[0] === 'orders')).toBe(false);
  expect(db.push).toHaveBeenCalledTimes(1);
  expect(db.push).toHaveBeenCalledWith('token-store-a', '₹45 earned', expect.any(String), { data: { type: 'order_delivered', orderId: 'o1' } });
});

it('never throws when a push fails', async () => {
  db.push.mockRejectedValueOnce(new Error('expo down'));
  await expect(notifyStoresOfDelivery({ id: 'o1', store_id: 'store-a', trip_id: null }, { item_total: 50, commission_amount: 5 })).resolves.toBeUndefined();
});
