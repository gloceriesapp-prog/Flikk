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
export function notificationDisposition(target: OrderNotificationTarget, customerId: string | null, ready: boolean): 'wait' | 'discard' | 'open' {
    if (!customerId || !ready)
        return 'wait';
    return target.customer_id === customerId ? 'open' : 'discard';
}
