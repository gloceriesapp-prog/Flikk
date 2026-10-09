import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ ready: false, session: { customerId: null as string | null, sessionEpoch: 0 }, navigate: vi.fn(), order: vi.fn(), trip: vi.fn(), read: vi.fn(), alert: vi.fn() }));
vi.mock('../../../apps/customer/node_modules/@react-navigation/native/lib/module/index.js', () => ({ createNavigationContainerRef: () => ({ isReady: () => fixture.ready, navigate: fixture.navigate }) }));
vi.mock('../../../apps/customer/node_modules/react-native/index.js', () => ({ Alert: { alert: fixture.alert } }));
vi.mock('../../../apps/customer/src/store/useAuthStore', () => ({ useAuthStore: { getState: () => fixture.session } }));
vi.mock('../../../apps/customer/src/api/orders', () => ({ fetchOrder: fixture.order }));
vi.mock('../../../apps/customer/src/api/trips', () => ({ fetchTrip: fixture.trip }));
vi.mock('../../../apps/customer/src/features/notifications/api', () => ({ markNotificationRead: fixture.read }));
vi.mock('../../../apps/customer/src/api/client', () => ({ ApiError: class extends Error { status = 404; } }));
import { flushOrderNotification, queueOrderNotification } from '../../../apps/customer/src/features/notifications/navigation';
const target = { type: 'order' as const, customer_id: 'customer-a', notification_id: 'notification-a', order_id: 'order-a', is_trip: false };
beforeEach(async () => {
  fixture.session = { customerId: 'discard-previous', sessionEpoch: fixture.session.sessionEpoch + 1 }; fixture.ready = true;
  await flushOrderNotification(); vi.clearAllMocks(); fixture.order.mockResolvedValue({ payment_method: 'cod' }); fixture.read.mockResolvedValue(undefined);
});
it('defers a cold-start tap until authentication and navigation are ready', async () => {
  fixture.ready = false; fixture.session.customerId = null;
  queueOrderNotification(target); await flushOrderNotification(); expect(fixture.order).not.toHaveBeenCalled();
  fixture.session.customerId = target.customer_id; fixture.ready = true; await flushOrderNotification();
  expect(fixture.navigate).toHaveBeenCalledWith('TrackOrder', { orderId: 'order-a', isTrip: false, paymentMethodLabel: 'Cash on delivery' });
});
it('drops another customer’s notification without fetching their order', async () => {
  fixture.session.customerId = 'customer-b'; queueOrderNotification(target); await flushOrderNotification();
  expect(fixture.order).not.toHaveBeenCalled(); expect(fixture.navigate).not.toHaveBeenCalled();
});
it('ignores an order response arriving after an account switch', async () => {
  let resolve!: (value: unknown) => void; fixture.order.mockImplementation(() => new Promise(done => { resolve = done; }));
  fixture.session.customerId = target.customer_id; queueOrderNotification(target);
  fixture.session = { customerId: 'customer-b', sessionEpoch: fixture.session.sessionEpoch + 1 };
  resolve({ payment_method: 'cod' }); await vi.waitFor(() => expect(fixture.order).toHaveBeenCalled());
  await new Promise(done => setTimeout(done, 0)); expect(fixture.navigate).not.toHaveBeenCalled();
});
it('opens trip tracking only after fetching the owned trip', async () => {
  fixture.trip.mockResolvedValue({ orders: [{ payment_method: 'online' }] }); fixture.session.customerId = target.customer_id;
  queueOrderNotification({ ...target, notification_id: 'notification-trip', order_id: 'trip-a', is_trip: true });
  await vi.waitFor(() => expect(fixture.navigate).toHaveBeenCalledWith('TrackOrder', { orderId: 'trip-a', isTrip: true, paymentMethodLabel: 'Online payment' }));
});


it('defers an area launch alert through cold start and opens its owned inbox', async () => {
  const area = { type: 'area' as const, customer_id: 'customer-a', notification_id: 'area-notification' };
  fixture.ready = false; fixture.session.customerId = null;
  queueOrderNotification(area); await flushOrderNotification();
  expect(fixture.read).not.toHaveBeenCalled(); expect(fixture.navigate).not.toHaveBeenCalled();
  fixture.session.customerId = area.customer_id; fixture.ready = true;
  await flushOrderNotification();
  expect(fixture.read).toHaveBeenCalledWith(area.notification_id);
  expect(fixture.navigate).toHaveBeenCalledWith('Notifications');
  expect(fixture.order).not.toHaveBeenCalled(); expect(fixture.trip).not.toHaveBeenCalled();
});
it('does not open an area alert belonging to another account', async () => {
  fixture.session.customerId = 'customer-b';
  queueOrderNotification({ type: 'area', customer_id: 'customer-a', notification_id: 'wrong-area' });
  await flushOrderNotification();
  expect(fixture.read).not.toHaveBeenCalled(); expect(fixture.navigate).not.toHaveBeenCalled();
});
it('ignores an area read acknowledgement arriving after an account switch', async () => {
  let resolve!: (value: unknown) => void;
  fixture.read.mockImplementation(() => new Promise(done => { resolve = done; }));
  fixture.session.customerId = 'customer-a';
  queueOrderNotification({ type: 'area', customer_id: 'customer-a', notification_id: 'switched-area' });
  fixture.session = { customerId: 'customer-b', sessionEpoch: fixture.session.sessionEpoch + 1 };
  resolve(undefined);
  await new Promise(done => setTimeout(done, 0));
  expect(fixture.navigate).not.toHaveBeenCalled();
});

it('opens a cold-start team announcement in the owned inbox without an order fetch', async () => {
  fixture.ready = false; fixture.session.customerId = null;
  queueOrderNotification({ type: 'announcement', customer_id: 'customer-a', notification_id: 'announcement-a' });
  await flushOrderNotification(); expect(fixture.read).not.toHaveBeenCalled();
  fixture.session.customerId = 'customer-a'; fixture.ready = true;
  await flushOrderNotification();
  expect(fixture.read).toHaveBeenCalledWith('announcement-a');
  expect(fixture.navigate).toHaveBeenCalledWith('Notifications');
  expect(fixture.order).not.toHaveBeenCalled(); expect(fixture.trip).not.toHaveBeenCalled();
});
