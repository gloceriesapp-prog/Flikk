// Sends a push notification via Expo's push API — no expo-server-sdk
// dependency needed, it's a plain HTTPS POST. Used by admin's approval
// flow (apps/admin/src/app/api/approvals/*) to tell a store owner/rider
// the instant they're approved, on top of the partner app's own in-app
// polling (WaitingApprovalScreen) — a closed app still gets the OS-level
// notification, polling only covers "app currently open."
//
// Failure here is never fatal to the approval itself — a store owner who
// didn't get the push still sees the unlock next time WaitingApprovalScreen
// polls (worst case ~10s later), so a bad/expired token or Expo being down
// shouldn't roll back or block the actual is_approved write.

// Optional delivery hints. `channelId` must name an Android channel the
// receiving app created (partner creates 'orders' — registerPushToken.ts);
// `priority: 'high'` wakes a dozing Android phone instead of batching the
// push until the next maintenance window. `data` reaches the app on tap.
export type PushOptions = {
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  data?: Record<string, unknown>;
};

// Store-owner order pushes: a shop owner with the phone in a pocket must
// hear these, so they go out high priority on the partner app's loud channel.
export const ORDER_PUSH: PushOptions = { channelId: 'orders', priority: 'high' };

type PushMessage = { to: string; title: string; body: string } & PushOptions;
type PushTicket = { status?: string; details?: { error?: string } };

export async function sendPushNotification(
  expoPushToken: string | null | undefined,
  title: string,
  body: string,
  options: PushOptions = {},
): Promise<void> {
  if (!expoPushToken) return;
  await sendPushNotifications([{ to: expoPushToken, title, body, ...options }]);
}

// Batched variant — Expo's /push/send accepts an array of up to 100
// messages per request, so a dispatch broadcast to N nearby riders is one
// (or ceil(N/100)) HTTPS call, not N. Same best-effort contract: a failed
// batch never throws, so one bad request can't block dispatch or the rest
// of the batches.
//
// Tickets come back in request order. A DeviceNotRegistered ticket means the
// app was uninstalled or the token rotated — that token is cleared from
// users so later pushes stop going to a dead device. Receipt polling (the
// slower, second-stage check) is only done by the customer outbox worker.
export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100).map((m) => ({ sound: 'default' as const, ...m }));
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      await clearDeadTokens(batch, await readTickets(response));
    } catch {
      // Best-effort — one failed batch never throws.
    }
  }
}

async function readTickets(response: Response | undefined): Promise<PushTicket[]> {
  if (!response || typeof response.json !== 'function') return [];
  try {
    const body = (await response.json()) as { data?: unknown };
    return Array.isArray(body?.data) ? (body.data as PushTicket[]) : [];
  } catch {
    return [];
  }
}

export function deadTokens(batch: { to: string }[], tickets: PushTicket[]): string[] {
  return batch
    .filter((_, index) => tickets[index]?.status === 'error' && tickets[index]?.details?.error === 'DeviceNotRegistered')
    .map((message) => message.to);
}

async function clearDeadTokens(batch: { to: string }[], tickets: PushTicket[]): Promise<void> {
  const tokens = deadTokens(batch, tickets);
  if (tokens.length === 0) return;
  try {
    const { supabase } = await import('../db/supabase.js');
    await supabase.from('users').update({ expo_push_token: null }).in('expo_push_token', tokens);
  } catch (err) {
    console.warn('clearing unregistered push tokens failed (non-fatal):', err);
  }
}

// PostgREST returns a many-to-one embed (stores.owner_user_id -> users) as a
// single object, while the untyped client's inferred type is an array. Reading
// `[0]` off the real object yielded undefined, so store owners never got the
// "New order" / "earned" pushes. Accept either shape.
export function embeddedPushToken(users: unknown): string | null {
  const row = Array.isArray(users) ? users[0] : users;
  const token = (row as { expo_push_token?: unknown } | null | undefined)?.expo_push_token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}
