// Source: specs/03-rider-app/api.md — assignments/earnings scoped to the caller only.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const riderRouter = Router();
riderRouter.use(requireAuth, requireRole('rider'), requireApproved);

// Real presence + location — riders.status/current_lat/current_lng
// (migration 036, automated-dispatch scope override, CLAUDE.md). Called by
// apps/rider's own useRiderOrdersStore whenever the rider toggles online/
// offline, and on a periodic ping (~30-60s) while online — this is what
// lib/riderDispatch.ts's nearby_online_riders RPC actually reads. Going
// offline never clears current_lat/lng — a stale-but-present position is
// harmless (status='offline' already excludes the row from that RPC
// entirely), and keeping it means the very next "go online" doesn't start
// from a blank position.
riderRouter.patch('/status', async (req: AuthedRequest, res, next) => {
  try {
    const { status, lat, lng } = req.body as { status?: 'online' | 'offline'; lat?: number; lng?: number };
    if (status !== undefined && status !== 'online' && status !== 'offline') {
      throw new AppError(400, 'INVALID_STATUS', "status must be 'online' or 'offline'.");
    }

    const patch: Record<string, unknown> = {};
    if (status !== undefined) patch.status = status;
    if (typeof lat === 'number' && typeof lng === 'number') {
      patch.current_lat = lat;
      patch.current_lng = lng;
      patch.last_location_update = new Date().toISOString();
    }
    if (Object.keys(patch).length === 0) {
      throw new AppError(400, 'MISSING_FIELDS', 'status and/or lat+lng required.');
    }

    const { error } = await supabase.from('riders').update(patch).eq('user_id', req.user!.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// The rider app's own "available pickups near you" list — polled the same
// way apps/partner's own GET /partner/orders is (no realtime infra exists
// per CLAUDE.md's tech stack), not just relying on whichever push
// notification happened to land while the app was foregrounded/killed.
// Requires the rider's own live position as query params — this endpoint
// has no server-side notion of "the rider's last known location" beyond
// what PATCH /status already persisted, so it re-derives distance from
// whatever position the caller has right now (slightly fresher than the
// DB row if the rider just moved).
riderRouter.get('/dispatch-offers', async (req: AuthedRequest, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusM = Number(req.query.radius_m) || 8000;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new AppError(400, 'MISSING_LOCATION', 'lat and lng query params are required.');
    }

    const { data: nearby, error: rpcErr } = await supabase.rpc('nearby_dispatch_offers', {
      p_rider_lat: lat,
      p_rider_lng: lng,
      p_radius_m: radiusM,
    });
    if (rpcErr) throw rpcErr;
    if (!nearby || nearby.length === 0) return res.json([]);

    const orderIds = (nearby as { order_id: string; distance_m: number }[]).map((r) => r.order_id);
    const distanceByOrderId = new Map((nearby as { order_id: string; distance_m: number }[]).map((r) => [r.order_id, r.distance_m]));

    // Same trip-aware payout shape as GET /assignments — a trip leg's real
    // payout is the trip's own combined delivery_fee (base + EXTRA_STOP_FEE
    // per store beyond the first), never the flat single-store fee.
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, order_number, delivery_fee, trip_id, trips(delivery_fee), stores(name, lat, lng)')
      .in('id', orderIds);
    if (ordersErr) throw ordersErr;

    const withDistance = (orders ?? [])
      .map((o) => ({ ...o, distance_m: distanceByOrderId.get(o.id) ?? null }))
      .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));

    res.json(withDistance);
  } catch (err) {
    next(err);
  }
});

// The atomic "first accept wins" — the one piece of this feature that has
// to be exactly right. `.eq('status', 'packed').is('rider_id', null)` on
// the UPDATE itself, not a separate SELECT-then-UPDATE, is what makes this
// safe under real concurrency: Postgres only ever lets one of several
// simultaneous UPDATEs matching this same WHERE clause actually apply —
// every other rider's identical request matches zero rows and this
// `.single()` call throws (PostgREST's own "no rows returned" error),
// which is exactly the losing-the-race signal riders.ts's own caller reads
// as ALREADY_TAKEN. No application-level check-then-write race window
// exists here at all.
riderRouter.post('/orders/:id/accept', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ rider_id: req.user!.id })
      .eq('id', req.params.id)
      .eq('status', 'packed')
      .is('rider_id', null)
      .select('id, trip_id')
      .single();

    if (error || !data) {
      throw new AppError(409, 'ALREADY_TAKEN', 'This order was already picked up by another rider.');
    }

    // Trip-aware — one rider does the whole multi-store pickup (same
    // reasoning as the trip-aware payout logic in routes/orders.ts's own
    // 'delivered' handler): accepting one leg claims every other
    // still-unassigned leg of the same trip too, not just this one order.
    if (data.trip_id) {
      await supabase.from('orders').update({ rider_id: req.user!.id }).eq('trip_id', data.trip_id).is('rider_id', null);
    }

    res.json({ ok: true, orderId: data.id });
  } catch (err) {
    next(err);
  }
});

// Same join shape as partner.ts's own GET /orders (store's side of this
// same order) — order_items -> products for real item names, users via the
// customer_id FK (orders also has a rider_id FK to the same users table,
// hence the explicit !customer_id hint — PostgREST can't otherwise tell
// which FK to embed through) for the customer's name/phone, addresses for
// the drop location including its real lat/lng (used for the live-GPS
// final-leg map, CLAUDE.md's rider-app exception), and stores for the
// pickup name + its own lat/lng (migration 005).
riderRouter.get('/assignments', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        // stores has no street-address column at all (migration 005 only
        // ever added lat/lng) — zones(name) is the most specific real
        // location text available for a pickup point today.
        // trips(delivery_fee) — only present when trip_id is set (a
        // multi-store leg); apps/rider's toRiderOrder reads this to show
        // the real trip-level payout (base fee + multi-stop surcharge,
        // routes/trips.ts's EXTRA_STOP_FEE) instead of assuming every
        // order pays the flat single-store DELIVERY_FEE.
        '*, order_items(*, products(name, unit)), stores(name, lat, lng, zones(name)), users!customer_id(name, phone), addresses(line1, landmark, latitude, longitude), trips(delivery_fee)',
      )
      .eq('rider_id', req.user!.id)
      .order('placed_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

riderRouter.get('/earnings', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rider_earnings')
      .select('*')
      .eq('rider_id', req.user!.id)
      .order('paid_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
