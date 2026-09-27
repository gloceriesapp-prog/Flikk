// Persists one in-app notification row (migration 054). The durable half of a
// rider-facing event whose fire-and-forget push (lib/pushNotifications.ts) is
// gone the moment it's missed: this is what GET /rider/notifications reads back.
//
// Best-effort, exactly like sendPushNotification — it NEVER throws. Every
// caller rides it alongside a real action (an order accept, an admin assign)
// with `void createNotification(...)`, so a feed-write hiccup (Supabase blip,
// bad row) must never roll back or block that real action. On failure we
// swallow + console.warn and move on; the rider still sees the underlying
// state via GET /assignments the same way a missed push degrades gracefully.
//
// Inserts through the service-role client (RLS-bypassing) — 054 has no insert
// policy for app sessions on purpose, writes only ever come from here.

// Minimal shape of the insert target — just enough to let the self-check inject
// a fake capturing client without a real DB, same spirit as keeping the money
// paths in orders.ts checkable. The real client (db/supabase.js) is imported
// lazily only when nothing's injected, so merely importing this module in a
// test doesn't eagerly boot the env-validated supabase singleton.
type InsertClient = {
  from(table: string): { insert(row: Record<string, unknown>): Promise<{ error: unknown }> };
};

export async function createNotification(
  input: {
    userId: string;
    title: string;
    body: string;
    type?: 'assignment' | 'approval' | 'rejection' | 'general';
    orderId?: string | null;
  },
  db?: InsertClient,
): Promise<void> {
  try {
    const client = db ?? ((await import('../db/supabase.js')).supabase as unknown as InsertClient);
    const { error } = await client.from('notifications').insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      type: input.type ?? 'general',
      order_id: input.orderId ?? null,
    });
    if (error) throw error;
  } catch (err) {
    // Best-effort — see the header note on why a failed feed-write never throws.
    console.warn('createNotification failed (non-fatal):', err);
  }
}
