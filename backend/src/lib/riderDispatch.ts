// Automated rider dispatch — explicit CLAUDE.md scope override (see that
// file's own Scope discipline section, "Automated rider-assignment/routing
// algorithm"). Broadcast + atomic-first-accept-wins, same shape as any
// real quick-commerce dispatcher: notify every online rider within range,
// let Postgres's own row-level update guarantee decide who actually wins
// the assignment (routes/rider.ts's own POST /orders/:id/accept), never an
// application-level check-then-write.
//
// No PostGIS — a plain Haversine formula (migration 036's own
// nearby_online_riders/nearby_dispatch_offers functions) over a handful of
// online riders in one zone is real and correct at this order volume,
// without adding a new Postgres extension.

import { supabase } from '../db/supabase.js';
import { sendPushNotifications } from './pushNotifications.js';

// Expanding search — most orders should be picked up well within the
// first, tightest radius; each step only fires if nobody accepted in time.
export const DISPATCH_RADIUS_STEPS_M = [3000, 5000, 8000];

// How long a broadcast at one radius gets before the fallback job
// (expandDispatchOrRebroadcast) tries the next radius — real, not
// decorative: rider.ts's own PATCH /status is what keeps a rider's
// current_lat/lng fresh, so this window has to be long enough for a
// rider's phone to actually receive and act on the push, short enough
// that a genuinely-idle order doesn't sit for minutes before trying wider.
export const DISPATCH_OFFER_WINDOW_MS = 45_000;

interface StoreLocation {
  name: string;
  lat: number | null;
  lng: number | null;
}

// Pushes to every online rider currently within radiusM of (lat, lng).
// Best-effort per-rider (sendPushNotification itself never throws) — one
// rider with a stale/invalid token must never block the rest of the
// broadcast.
async function broadcastToRadius(orderId: string, lat: number, lng: number, storeName: string, radiusM: number): Promise<number> {
  const { data: nearby, error } = await supabase.rpc('nearby_online_riders', {
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
    .map((to) => ({ to, title: 'New pickup available', body: `${storeName} — tap to accept before another rider does.` }));
  await sendPushNotifications(messages);
  return riderUserIds.length;
}

// Fired once, right after a store marks an order 'packed' (routes/orders.ts
// own PATCH /:id/status) — the very first broadcast, always at the
// tightest radius. Never blocks that response: callers use `void
// triggerDispatch(...)`, same fire-and-forget convention this file's own
// sendPushNotification already uses.
export async function triggerDispatch(order: { id: string; store_id: string }): Promise<void> {
  const { data: store } = await supabase.from('stores').select('name, lat, lng').eq('id', order.store_id).single<StoreLocation>();
  // No real coordinates on this store yet (approved before onboarding
  // captured a map pin) — nothing to dispatch against. The order still
  // shows up in admin's own manual assign-rider UI (routes/admin.ts),
  // which stays the real fallback path for exactly this case.
  if (!store?.lat || !store?.lng) return;

  const radiusM = DISPATCH_RADIUS_STEPS_M[0]!;
  // Stamp dispatch_broadcast_at BEFORE broadcasting, never after. That stamp
  // is what makes the order both recoverable and pollable: nearby_dispatch_
  // offers requires dispatch_broadcast_at IS NOT NULL, and so does the cron
  // recovery query (expandDispatchOrRebroadcast below). broadcastToRadius
  // can throw (the RPC / users lookup) and this is called fire-and-forget
  // (routes/orders.ts `void triggerDispatch(...)`) — so if the stamp came
  // after and the push threw, the order would be stranded forever: never in
  // any rider's "pickups near you" list, never re-picked by the cron.
  // Stamping first means even a fully-failed push still leaves a live,
  // recoverable offer riders can poll and the cron can widen.
  await supabase.from('orders').update({ dispatch_radius_m: radiusM, dispatch_broadcast_at: new Date().toISOString() }).eq('id', order.id);
  await broadcastToRadius(order.id, store.lat, store.lng, store.name, radiusM);
}

// The "nobody accepted in time" fallback — polled every minute (see
// index.ts's own cron.schedule). For every still-unassigned 'packed' order
// whose last broadcast is older than DISPATCH_OFFER_WINDOW_MS: try the
// next wider radius step, or — once every step's been tried — leave it
// alone. "Leave it alone" IS the real fallback here, not a gap: the order
// is already sitting in admin's own manual assign-rider queue the whole
// time (rider_id has been null this entire time), so a founder can always
// step in by hand; this job never needs its own separate "notify the
// founder" channel to cover that.
export async function expandDispatchOrRebroadcast(now: Date = new Date()): Promise<{ expanded: number; exhausted: number }> {
  const cutoff = new Date(now.getTime() - DISPATCH_OFFER_WINDOW_MS).toISOString();

  const { data: stalled, error } = await supabase
    .from('orders')
    .select('id, store_id, dispatch_radius_m, stores(name, lat, lng)')
    .eq('status', 'packed')
    .is('rider_id', null)
    .not('dispatch_broadcast_at', 'is', null)
    .lt('dispatch_broadcast_at', cutoff);
  if (error) throw error;

  let expanded = 0;
  let exhausted = 0;

  for (const order of stalled ?? []) {
    const store = order.stores as unknown as StoreLocation | null;
    const currentRadius = order.dispatch_radius_m ?? DISPATCH_RADIUS_STEPS_M[0];
    const currentIndex = DISPATCH_RADIUS_STEPS_M.indexOf(currentRadius);
    const nextRadius = DISPATCH_RADIUS_STEPS_M[currentIndex + 1];

    if (!nextRadius || !store?.lat || !store?.lng) {
      exhausted++;
      continue;
    }

    // Same stamp-first ordering as triggerDispatch, plus a per-order guard:
    // one order's broadcast throwing must not abort the rest of this tick's
    // batch. The stamp already advanced dispatch_broadcast_at, so a thrown
    // push just means the next cron tick retries it at the following radius
    // — the order stays live and pollable throughout.
    try {
      await supabase.from('orders').update({ dispatch_radius_m: nextRadius, dispatch_broadcast_at: now.toISOString() }).eq('id', order.id);
      await broadcastToRadius(order.id, store.lat, store.lng, store.name, nextRadius);
      expanded++;
    } catch {
      // Swallowed per-order — see note above.
    }
  }

  return { expanded, exhausted };
}
