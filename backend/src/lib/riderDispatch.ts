import { supabase } from '../db/supabase.js';
import { sendPushNotifications } from './pushNotifications.js';

// Expanding search — the rings (delivery_settings.dispatch_radius_steps_m)
// and how long each ring is offered (dispatch_step_seconds) are admin
// settings (migration 113), read by advance_dispatch_offers on every pass,
// so a change applies to the next ring without a deploy. Most orders should
// be picked up in the first, tightest ring; each step only fires if nobody
// accepted in time. Defaults: 3/5/8 km, 45 s.

// Pushes to every online rider currently within radiusM of (lat, lng) who
// is below the admin's max_active_trips_per_rider (nearby_dispatchable_riders,
// migration 113 — the same limit accept_dispatch_offer enforces).
// Best-effort per-rider (sendPushNotification itself never throws) — one
// rider with a stale/invalid token must never block the rest of the
// broadcast.
async function broadcastToRadius(orderId: string, lat: number, lng: number, storeName: string, radiusM: number): Promise<number> {
  const { data: nearby, error } = await supabase.rpc('nearby_dispatchable_riders', {
    p_store_lat: lat,
    p_store_lng: lng,
    p_radius_m: radiusM,
  });
  if (error) throw error;
  if (!nearby || nearby.length === 0) return 0;

  const riderUserIds = (nearby as { rider_user_id: string }[]).map((r) => r.rider_user_id);
  const { data: riderUsers } = await supabase.from('users').select('expo_push_token').in('id', riderUserIds);

  // One batched push call for the whole radius, not one POST per rider —
  // null/absent tokens dropped first (a rider on simulator or with denied
  // permission has none; a single POST per rider would waste a no-op call
  // on each). See pushNotifications.sendPushNotifications on the 100-cap.
  const messages = (riderUsers ?? [])
    .map((u) => u.expo_push_token)
    .filter((token): token is string => !!token)
    .map((to) => ({ to, title: 'New pickup available', body: `${storeName} — tap to accept before another rider does.`, priority: 'high' as const }));
  await sendPushNotifications(messages);
  return riderUserIds.length;
}

interface DispatchOffer { id: string; store_id: string; store_name: string; lat: number; lng: number; radius_m: number }
async function advanceOffers(orderId?: string): Promise<DispatchOffer[]> {
  const { data, error } = await supabase.rpc('advance_dispatch_offers', { p_limit: orderId ? 1 : 100, p_order: orderId ?? null });
  if (error) throw error;
  return data ?? [];
}

// Atomic null->first-radius transition prevents simultaneous API replicas
// broadcasting the same initial offer. The worker recovers missed initial
// dispatch, including a crash between packing and this fire-and-forget call.
export async function triggerDispatch(order: { id: string; store_id: string }): Promise<void> {
  for (const offer of await advanceOffers(order.id))
    await broadcastToRadius(offer.id, offer.lat, offer.lng, offer.store_name, offer.radius_m);
}

// Database row locks advance each eligible offer exactly once per window.
// Radius/visibility is persisted before best-effort push; riders can poll it
// even if the push fails. Batches are bounded, exhausted offers remain manual.
export async function expandDispatchOrRebroadcast(_now: Date = new Date(), guard: () => Promise<void> = async () => {}): Promise<{ expanded: number; exhausted: number }> {
  await guard();
  const offers = await advanceOffers();
  let expanded = 0;
  for (const offer of offers) {
    await guard();
    try {
      await broadcastToRadius(offer.id, offer.lat, offer.lng, offer.store_name, offer.radius_m);
      expanded++;
    } catch { /* Persisted offers remain available to rider polling. */ }
  }
  return { expanded, exhausted: 0 };
}
