// Persists an in-app notification row for a user — the durable feed that
// backs the rider app's Notifications tab (GET /rider/notifications). Rides
// alongside sendPushNotification: the push is the instant OS-level ping, this
// row is the record the rider still sees when they open the tab later.
//
// Mirrors backend/src/lib/notifications.ts — duplicated rather than shared
// since this Next.js app and the Express backend aren't set up to share code
// (no packages/shared yet, per CLAUDE.md's "no premature sharing" rule). Uses
// supabaseAdmin (service_role) so the insert bypasses RLS, same as the row's
// only intended writers.
//
// Best-effort — a failed feed write never blocks or rolls back the real
// approve/reject action it rides on; worst case the rider just doesn't get a
// feed row for it.
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  type?: 'assignment' | 'approval' | 'rejection' | 'general';
  orderId?: string | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      type: input.type ?? 'general',
      order_id: input.orderId ?? null,
    });
  } catch {
    // Best-effort — see the note above.
  }
}
