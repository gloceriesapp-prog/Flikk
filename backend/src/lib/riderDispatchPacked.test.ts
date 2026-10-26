import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ token: 'ExponentPushToken[rider]' as string | null, push: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({
      data: table === 'users' ? { expo_push_token: db.token } : { name: 'Sri Lakshmi Stores' }, error: null,
    }) }) }),
  }),
} }));
vi.mock('./pushNotifications.js', async (original) => ({
  ...(await original<typeof import('./pushNotifications.js')>()),
  sendPushNotification: db.push,
}));
import { notifyRiderOrderPacked } from './riderDispatch.js';

beforeEach(() => { db.push.mockReset(); db.token = 'ExponentPushToken[rider]'; });

it('tells the rider who took the order early that it is packed', async () => {
  await notifyRiderOrderPacked({ id: 'abcdef12-0000', store_id: 's1', rider_id: 'r1', trip_id: null });
  expect(db.push).toHaveBeenCalledWith('ExponentPushToken[rider]', 'Order ready for pickup',
    'Sri Lakshmi Stores has packed order ABCDEF.', expect.objectContaining({ channelId: 'offers', data: { type: 'assignment', orderId: 'abcdef12-0000' } }));
});

it('opens the trip, not one leg, for a multi-store order', async () => {
  await notifyRiderOrderPacked({ id: 'leg-a', store_id: 's1', rider_id: 'r1', trip_id: 't1' });
  expect(db.push.mock.calls[0]![3]).toMatchObject({ data: { type: 'assignment', orderId: null } });
});

it('does nothing when no rider has the order yet', async () => {
  await notifyRiderOrderPacked({ id: 'o1', store_id: 's1', rider_id: null });
  expect(db.push).not.toHaveBeenCalled();
});
