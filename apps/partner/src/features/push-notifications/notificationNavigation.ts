import { isAdminBroadcast } from './adminBroadcast';

interface Tap { notification: { request: { identifier: string; content: { data?: unknown } } } }
interface Dependencies {
  canNavigate: () => boolean;
  openOrder: (id: string) => void;
  openQueue: () => void;
  clearLastResponse: () => void;
}

// Navigation can become ready before the approval gate. Hold the response until
// both are ready, and deduplicate by durable event ID across repeated OS pushes.
export function createNotificationTapRouter(dependencies: Dependencies) {
  let pending: Tap | null = null;
  const handled = new Set<string>();
  function open(response: Tap | null) {
    const raw = response?.notification.request.content.data;
    if (!raw || typeof raw !== 'object') return;
    const data = raw as { type?: unknown; orderId?: unknown; notificationId?: unknown };
    if (!dependencies.canNavigate()) { pending = response; return; }
    pending = null;
    const id = typeof data.notificationId === 'string' ? data.notificationId : response!.notification.request.identifier;
    if (handled.has(id)) return;
    handled.add(id);
    if (handled.size > 200) handled.delete(handled.values().next().value!);
    dependencies.clearLastResponse();
    if (isAdminBroadcast(data)) return;
    if (typeof data.orderId === 'string') dependencies.openOrder(data.orderId);
    else if (data.type === 'new_order') dependencies.openQueue();
  }
  return { open, flush: () => { if (pending) open(pending); }, reset: () => { pending = null; handled.clear(); } };
}
