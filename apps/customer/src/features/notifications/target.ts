export interface OrderNotificationTarget {
    type: 'order';
    customer_id: string;
    notification_id: string;
    order_id: string;
    is_trip: boolean;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Do not accept arbitrary deep-link URLs or route names from a push payload.
export function orderNotificationTarget(value: unknown): OrderNotificationTarget | null {
    if (!value || typeof value !== 'object')
        return null;
    const data = value as Record<string, unknown>;
    if (data.type !== 'order' || typeof data.is_trip !== 'boolean' || ![data.customer_id, data.notification_id, data.order_id].every(id => typeof id === 'string' && uuid.test(id)))
        return null;
    return data as unknown as OrderNotificationTarget;
}
export function notificationDisposition(target: CustomerNotificationTarget, customerId: string | null, ready: boolean): 'wait' | 'discard' | 'open' {
    if (!customerId || !ready)
        return 'wait';
    return target.customer_id === customerId ? 'open' : 'discard';
}

export interface AreaNotificationTarget { type: 'area'; customer_id: string; notification_id: string }
export interface AnnouncementNotificationTarget { type: 'announcement'; customer_id: string; notification_id: string }
export type CustomerNotificationTarget = OrderNotificationTarget | AreaNotificationTarget | AnnouncementNotificationTarget;
export function customerNotificationTarget(value: unknown): CustomerNotificationTarget | null {
  const order = orderNotificationTarget(value); if (order) return order;
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  return (data.type === 'area' || data.type === 'announcement') && typeof data.customer_id === 'string' && uuid.test(data.customer_id) && typeof data.notification_id === 'string' && uuid.test(data.notification_id)
    ? { type: data.type, customer_id: data.customer_id, notification_id: data.notification_id } : null;
}
