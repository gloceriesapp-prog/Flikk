// Sends a push notification via Expo's push API — plain HTTPS POST, no
// SDK dependency. Used by the approve routes below to tell a store owner/
// rider the instant they're approved, on top of the partner app's own
// in-app polling (WaitingApprovalScreen) — a closed app still gets the
// OS-level notification. Mirrors backend/src/lib/pushNotifications.ts —
// duplicated rather than shared since this Next.js app and the Express
// backend aren't set up to share code (no packages/shared yet, per
// CLAUDE.md's "no premature sharing" rule).
//
// Best-effort — a failed push never blocks or rolls back the actual
// is_approved write; worst case the owner sees the unlock on their next
// in-app poll instead of instantly.
export async function sendPushNotification(expoPushToken: string | null | undefined, title: string, body: string): Promise<void> {
  if (!expoPushToken) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body, sound: 'default' }),
    });
  } catch {
    // Best-effort — see the note above.
  }
}
