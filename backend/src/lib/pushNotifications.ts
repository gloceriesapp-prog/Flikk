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
export async function sendPushNotification(expoPushToken: string | null | undefined, title: string, body: string): Promise<void> {
  if (!expoPushToken) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body, sound: 'default' }),
    });
  } catch {
    // Best-effort — see the note above on why a failed push never throws.
  }
}

// Batched variant — Expo's /push/send accepts an array of up to 100
// messages per request, so a dispatch broadcast to N nearby riders is one
// (or ceil(N/100)) HTTPS call, not N. Same best-effort contract: a failed
// batch never throws, so one bad request can't block dispatch or the rest
// of the batches.
// ponytail: fixed 100-per-request chunk, no receipt polling. Add receipt
// handling only if silent-drop reports show up — at MVP fleet size a single
// batch covers the whole radius.
export async function sendPushNotifications(
  messages: { to: string; title: string; body: string }[],
): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100).map((m) => ({ ...m, sound: 'default' as const }));
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch {
      // Best-effort — one failed batch never throws.
    }
  }
}
