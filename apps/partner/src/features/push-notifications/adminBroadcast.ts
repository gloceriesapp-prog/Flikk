// Admin fleet broadcast — a founder pushing a free-text operational message to
// every store owner (backend/src/lib/fleetPush.ts, POST /admin/fleet-push with
// audience 'partners'). It is a fire-and-forget OS notification: there is no
// inbox endpoint and no per-device outbox, so the app's whole job is to
// recognise the payload, nothing to fetch. The backend sends a standard Expo
// push whose `data` is exactly the shape below; `kind` is 'partner' for the
// partners audience and 'rider' for the two rider audiences, so this app only
// ever receives kind === 'partner', but the guard checks the discriminator
// (`type`) rather than trusting the delivery channel.
//
// Surfacing is already handled: the global notification handler
// (order-expiry/orderReminderNotification.ts) shows a banner + sound for any
// push received while foregrounded, and the OS shows it on its own when the app
// is backgrounded — so an admin broadcast needs no extra in-app banner (adding
// one would double the banner the OS already draws). This guard exists for the
// tap path: a broadcast has no order/trip to open, so a tap is recognised and
// deliberately routed nowhere (the OS already brought the app forward), which
// also stops a future refactor from mis-routing it to the Orders list.

export interface AdminBroadcastData {
  type: 'admin_message';
  kind: 'rider' | 'partner';
  audience: string;
}

// Recognises an admin fleet-broadcast push by its `type` discriminator. Narrow
// on the single stable field the backend contract guarantees; `kind`/`audience`
// are read for routing but not required to be present for recognition.
export function isAdminBroadcast(data: unknown): data is AdminBroadcastData {
  return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === 'admin_message';
}
