// Real GET /rider/notifications + PATCH /rider/notifications/read — the
// rider's persisted alert feed (assignment/approval/rejection/general),
// newest first. The backend already returns camelCase, so unlike
// orders.ts's toRiderOrder there's no shape translation to do here — this
// is a thin client, the RiderNotification type below exists only so the
// Alerts screen renders against a real type instead of `any`.

// client (and its auth-store → RN chain) is imported lazily so this module
// stays importable under plain node/tsx without dragging in react-native,
// exactly as orders.ts does it. Metro caches the module — no per-call cost.

export type RiderNotificationType = 'assignment' | 'approval' | 'rejection' | 'general';

export interface RiderNotification {
  id: string;
  title: string;
  body: string;
  type: RiderNotificationType;
  // Set when the notification points at a specific order (assignment
  // pings), null for approval/rejection/general account-level alerts.
  orderId: string | null;
  // null = unread; the screen uses exactly this to mark a row unread.
  readAt: string | null;
  createdAt: string;
}

export async function fetchNotifications(): Promise<{ notifications: RiderNotification[]; unreadCount: number }> {
  const { apiRequest } = await import('./client');
  return apiRequest('/rider/notifications');
}

export async function markNotificationsRead(): Promise<void> {
  const { apiRequest } = await import('./client');
  return apiRequest('/rider/notifications/read', { method: 'PATCH', body: {} });
}
