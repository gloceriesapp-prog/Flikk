import { beforeEach, expect, it, vi } from 'vitest';
import { createNotificationTapRouter } from '../../../apps/partner/src/features/push-notifications/notificationNavigation';
let ready = false;
const order = vi.fn(), queue = vi.fn(), clear = vi.fn();
let router = createNotificationTapRouter({ canNavigate: () => ready, openOrder: order, openQueue: queue, clearLastResponse: clear });
const tap = (event = 'outbox-one', request = 'os-one') => ({ notification: { request: { identifier: request, content: { data: { type: 'new_order', orderId: 'order-one', notificationId: event } } } } });
beforeEach(() => { vi.clearAllMocks(); ready = false; router = createNotificationTapRouter({ canNavigate: () => ready, openOrder: order, openQueue: queue, clearLastResponse: clear }); });
it('holds cold-start taps until the navigation and approval gate are ready', () => {
 router.open(tap()); expect(order).not.toHaveBeenCalled(); ready = true; router.flush(); expect(order).toHaveBeenCalledWith('order-one');
});
it('deduplicates repeated OS notifications for the same durable event', () => {
 ready = true; router.open(tap('event', 'os-a')); router.open(tap('event', 'os-b')); expect(order).toHaveBeenCalledOnce(); expect(clear).toHaveBeenCalledOnce();
});
it('does not replay a pending tap after an account reset', () => {
 router.open(tap()); router.reset(); ready = true; router.flush(); expect(order).not.toHaveBeenCalled();
});
it('routes generic order notices to the queue and leaves broadcasts alone', () => {
 ready = true; router.open({ notification: { request: { identifier: 'generic', content: { data: { type: 'new_order' } } } } }); expect(queue).toHaveBeenCalledOnce();
 router.open({ notification: { request: { identifier: 'broadcast', content: { data: { type: 'admin_message' } } } } }); expect(order).not.toHaveBeenCalled(); expect(queue).toHaveBeenCalledOnce();
});
