import { apiRequest } from '../../api/client';
export interface CustomerNotification {
    id: string;
    // Null for a message from the Gloceries team (no order to open).
    order_id: string | null;
    trip_id: string | null;
    title: string;
    body: string;
    created_at: string;
    read_at: string | null;
}
export interface NotificationPage {
    items: CustomerNotification[];
    next_cursor: string | null;
}
export function fetchNotifications(cursor?: string | null) { return apiRequest<NotificationPage>(`/notifications${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`); }
export function markNotificationRead(id: string) { return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }); }
