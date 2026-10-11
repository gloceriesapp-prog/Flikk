import { validateRiderProfileChanges, isOwnedRiderDocument } from '../lib/riderProfileChanges.js';
import { readPage, cursorFilter, sendPage } from '../lib/cursorPagination.js';
// Source: specs/03-rider-app/api.md — assignments/earnings scoped to the caller only.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireActiveRider, requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { riderSuspendedError } from '../auth/riderSuspension.js';
import { payoutAccountBudget, readPayoutAccount, writePayoutAccount } from '../lib/payoutAccount.js';
import { fetchRoute } from '../lib/routeDirections.js';
import { createNotification } from '../lib/notifications.js';
import { validateAvailability } from '../lib/riderSchedule.js';
import { computeRiderStats } from '../lib/riderStats.js';
import { DELIVERY_MONEY_COLUMNS, withDeliveryMoney, type DeliveryMoneyOrder } from '../lib/riderDeliveryMoney.js';
import { readPrivateDocument } from '../media/privateDocuments.js';

export const riderRouter = Router();

// Same last-4-visible masking convention routes/partner.ts's own
// maskAccountNumber already established.
function maskAccountNumber(full: string | null): string | null {
  if (!full) return null;
  return `XXXXXXXX${full.slice(-4)}`;
}

// Aadhaar is 12 digits — show only the last 4, same last-4-visible spirit
// as maskAccountNumber. DL number is not masked (it's not a financial/PII
// secret the same way; the rider sees their own for confirmation).
function maskAadhaar(full: string | null): string | null {
  if (!full) return null;
  return `XXXX XXXX ${full.replace(/\s/g, '').slice(-4)}`;
}

// A stored rider-documents object PATH -> an absolute URL the app fetches the
// bytes through (GET /rider/documents/:id below). KYC docs are now stored
// ENCRYPTED (ciphertext, `.enc` object), so a Supabase signed URL can no
// longer read them — the bytes have to go through readPrivateDocument, which
// downloads and decrypts. Resolves the path to its newest ready media_assets
// row owned by this rider; null path or no such asset -> null so the app
// renders a placeholder.
async function resolveRiderDocUrl(path: string | null, userId: string): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase
    .from('media_assets')
    .select('id')
    .eq('object_key', path)
    .eq('uploaded_by', userId)
    .eq('bucket', 'rider-documents')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  // Absolute when PUBLIC_API_URL is set; relative otherwise — the rider app
  // resolves a relative path against its own configured API base.
  return `${process.env.PUBLIC_API_URL ?? ''}/rider/documents/${data.id}`;
}
// requireActiveRider mirrors partner.ts's requireActivePartner: a rider the
// admin has suspended (riders.is_active=false, migration 110) is refused on
// every data route below with RIDER_SUSPENDED, server-side, not just blocked
// from going online. The per-handler go-online/accept checks stay as
// defence in depth alongside the DB trigger.
riderRouter.use(requireAuth, requireRole('rider'), requireApproved, requireActiveRider);

// Real presence + location — riders.status/current_lat/current_lng
// (migration 036, automated-dispatch scope override, CLAUDE.md). Called by
// apps/rider's own useRiderOrdersStore whenever the rider toggles online/
// offline, and on a periodic ping (~30-60s) while online — this is what
// lib/riderDispatch.ts's nearby_dispatchable_riders RPC actually reads. Going
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

    // A suspended rider (riders.is_active=false, set from admin's Riders
    // page) can never go online — migration 110's trigger enforces the same
    // in the DB; this check just turns it into a clear error for the app.
    if (status === 'online') {
      const { data: rider, error: riderError } = await supabase
        .from('riders')
        .select('is_active, suspended_reason')
        .eq('user_id', req.user!.id)
        .maybeSingle();
      if (riderError) throw riderError;
      if (!rider) throw new AppError(404, 'RIDER_NOT_FOUND', 'No rider profile for this account.');
      if (!rider.is_active) throw riderSuspendedError(rider.suspended_reason);
    }

    const { error } = await supabase.from('riders').update(patch).eq('user_id', req.user!.id);
    if (error) {
      if (error.code === 'P0403') throw riderSuspendedError(null);
      throw error;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// The rider's own recurring weekly working-hours (migration 055's
// `availability` JSONB + `auto_online` flag). This is presence *intent* only —
// deliberately NOT a dispatch gate (lib/riderDispatch.ts still keys off
// riders.status alone), so nothing here changes who receives a pickup. The app
// reads it to render the availability editor and to decide whether to
// auto-toggle status='online' inside a window (auto_online). '[]' = never
// configured, returned as-is.
riderRouter.get('/availability', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('riders')
      .select('availability, auto_online')
      .eq('user_id', req.user!.id)
      .single();
    if (error || !data) throw new AppError(404, 'RIDER_NOT_FOUND', 'No rider profile for this account.');
    res.json({ availability: data.availability ?? [], autoOnline: data.auto_online });
  } catch (err) {
    next(err);
  }
});

// Replace the caller's whole weekly schedule. validateAvailability enforces the
// exactly-7-days-0..6 / HH:MM / end>start contract before anything is written —
// a malformed body is a 400 INVALID_SCHEDULE, never a partial write. The
// normalized (ascending-sorted) array is what's stored.
riderRouter.patch('/availability', async (req: AuthedRequest, res, next) => {
  try {
    const { availability, autoOnline } = req.body as { availability?: unknown; autoOnline?: unknown };
    if (typeof autoOnline !== 'boolean') {
      throw new AppError(400, 'INVALID_SCHEDULE', 'autoOnline must be a boolean.');
    }

    let normalized;
    try {
      normalized = validateAvailability(availability);
    } catch (validationErr) {
      throw new AppError(400, 'INVALID_SCHEDULE', (validationErr as Error).message);
    }

    const { error } = await supabase
      .from('riders')
      .update({ availability: normalized, auto_online: autoOnline })
      .eq('user_id', req.user!.id);
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
// Distance and reach are derived server-side (rider_dispatch_offers,
// migration 107): from the rider's stored position (PATCH /status, which the
// app sends with the same GPS fix right before every poll), capped by each
// order's own current dispatch radius, and only while the rider is online
// with a fresh position. Client lat/lng/radius_m query params are ignored —
// trusting them let any rider list every open order and its drop address.
riderRouter.get('/dispatch-offers', async (req: AuthedRequest, res, next) => {
  try {
    const { data: nearby, error: rpcErr } = await supabase.rpc('rider_dispatch_offers', { p_rider: req.user!.id });
    if (rpcErr) throw rpcErr;
    if (!nearby || nearby.length === 0) return res.json([]);

    const orderIds = (nearby as { order_id: string; distance_m: number }[]).map((r) => r.order_id);
    const distanceByOrderId = new Map((nearby as { order_id: string; distance_m: number }[]).map((r) => [r.order_id, r.distance_m]));

    // Same money fields as GET /assignments (withDeliveryMoney): what the
    // rider will earn under the admin pay settings (rider_payout, for the
    // whole trip on a trip leg), the payment method and the cash to collect
    // at the door. Store + drop coords, drop label and item count are the same joins
    // /assignments already pulls — the rider app's offer card renders a
    // pickup→drop preview from them (no new migration, real order data).
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select(
        // dispatch_broadcast_at — when this offer was (re)broadcast; the
        // client derives the real per-offer countdown deadline from it
        // (that timestamp + offer_window_seconds), instead of a
        // mount-seeded guess. Set on every broadcast/rebroadcast by
        // advance_dispatch_offers.
        `id, order_number, trip_id, dispatch_broadcast_at, ${DELIVERY_MONEY_COLUMNS}, stores(name, lat, lng), addresses(line1, landmark, latitude, longitude), order_items(quantity)`
      )
      .in('id', orderIds);
    if (ordersErr) throw ordersErr;

    // How long each ring is offered (delivery_settings.dispatch_step_seconds,
    // admin-set, migration 113) — the app's countdown is broadcast + this.
    const { data: dispatchConfig } = await supabase.rpc('dispatch_config');
    const offerWindowSeconds = Number((dispatchConfig as { step_seconds?: number }[] | null)?.[0]?.step_seconds) || 45;

    const withDistance = (await withDeliveryMoney((orders ?? []) as unknown as (DeliveryMoneyOrder & Record<string, unknown>)[]))
      .map((o) => ({ ...o, distance_m: distanceByOrderId.get(o.id) ?? null, offer_window_seconds: offerWindowSeconds }))
      .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));

    res.json(withDistance);
  } catch (err) {
    next(err);
  }
});

// Road-following route line for the rider's in-app delivery map (DeliveryMap
// View's <Polyline>) — origin=rider's live GPS, destination=store or customer
// pin. Proxied server-side because the Directions REST call needs the
// IP-restricted GOOGLE_GEOCODING_API_KEY, not the app's Maps-SDK key. Returns
// { polyline: [], durationMin: null, distanceKm: null } (never 500s) when
// routing is unavailable so the map falls back to its straight connector +
// flat-speed ETA — a routed line and its real driving ETA are an enhancement,
// not a gate.
riderRouter.get('/route', async (req: AuthedRequest, res, next) => {
  try {
    const originLat = Number(req.query.origin_lat);
    const originLng = Number(req.query.origin_lng);
    const destLat = Number(req.query.dest_lat);
    const destLng = Number(req.query.dest_lng);
    if (![originLat, originLng, destLat, destLng].every(Number.isFinite)) {
      throw new AppError(400, 'MISSING_LOCATION', 'origin_lat, origin_lng, dest_lat and dest_lng query params are required.');
    }

    const route = await fetchRoute({ latitude: originLat, longitude: originLng }, { latitude: destLat, longitude: destLng });
    res.json({
      polyline: route?.points ?? [],
      // Real Google driving ETA — minutes (>=1) and km (one decimal). null
      // when routing is unavailable; the app then keeps its straight-line
      // distance/avg-speed estimate.
      durationMin: route?.durationSec != null ? Math.max(1, Math.round(route.durationSec / 60)) : null,
      distanceKm: route?.distanceM != null ? Math.round(route.distanceM / 100) / 10 : null,
    });
  } catch (err) {
    next(err);
  }
});

// The atomic "first accept wins" — accept_dispatch_offer (migration 107)
// runs as one transaction under the trip's advisory lock: the order must be
// packed, unassigned and actually broadcast, the rider must be online and
// inside the order's current dispatch radius, and a trip whose live legs
// already belong to another rider is refused. Accepting one leg claims every
// unassigned leg of the same trip in that same transaction, so two riders can
// never split one multi-store trip. A rider already holding the admin's
// max_active_trips_per_rider (migration 113) is refused with RIDER_AT_CAPACITY.
// A lost race is 409 ALREADY_TAKEN (the rider app reads any other 409 as
// "taken"); a repeat accept by the winner is a no-op success.
type AcceptError = 'ORDER_NOT_FOUND' | 'ALREADY_TAKEN' | 'NOT_OFFERED' | 'RIDER_OFFLINE' | 'RIDER_AT_CAPACITY';
const ACCEPT_ERRORS: Record<AcceptError, [number, string]> = {
  ORDER_NOT_FOUND: [404, 'Order not found.'],
  ALREADY_TAKEN: [409, 'This order was already picked up by another rider.'],
  NOT_OFFERED: [409, 'This order is not on offer to you.'],
  RIDER_OFFLINE: [409, 'Go online with location on to accept pickups.'],
  // delivery_settings.max_active_trips_per_rider (migration 113).
  RIDER_AT_CAPACITY: [409, 'Finish your current deliveries before accepting another pickup.'],
};
riderRouter.post('/orders/:id/accept', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.rpc('accept_dispatch_offer', { p_order: req.params.id, p_rider: req.user!.id });
    if (error?.code === '22P02') throw new AppError(404, 'ORDER_NOT_FOUND', ACCEPT_ERRORS.ORDER_NOT_FOUND[1]);
    if (error) throw error;
    const result = data as { accepted: boolean; replayed?: boolean; error?: string; order_id?: string };
    if (!result.accepted) {
      const code: AcceptError = result.error && result.error in ACCEPT_ERRORS ? (result.error as AcceptError) : 'ALREADY_TAKEN';
      const [status, message] = ACCEPT_ERRORS[code];
      throw new AppError(status, code, message);
    }
    const orderId = result.order_id ?? req.params.id;
    if (result.replayed) {
      res.json({ ok: true, orderId });
      return;
    }

    // Persist the win to the rider's own feed (migration 054) — the durable
    // record behind the moment, readable from GET /rider/notifications long
    // after any push banner is gone. Best-effort, void: a feed hiccup must
    // never undo an accept that already atomically won above. The accept
    // select only pulls id/trip_id (not the store), and copy isn't worth an
    // extra round-trip, so the body stays generic per CLAUDE.md's no-DB-for-
    // copy rule; orderId still links the row to the real order.
    void createNotification({
      userId: req.user!.id,
      title: 'Pickup confirmed',
      body: 'Your pickup is confirmed. Head to the store to collect the order.',
      type: 'assignment',
      orderId,
    });

    res.json({ ok: true, orderId });
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
    const page = readPage(req, `rider-assignments:${req.user!.id}:${req.query.view ?? 'history'}`);
    let query = supabase
      .from('orders')
      .select(
        // stores has no street-address column at all (migration 005 only
        // ever added lat/lng) — zones(name) is the most specific real
        // location text available for a pickup point today.
        // DELIVERY_MONEY_COLUMNS feed withDeliveryMoney below: the rider's
        // payout (the recorded earning once delivered, else the admin pay
        // rule) and, for cash on delivery, the amount to collect.
        `id, status, placed_at, delivered_at, cancel_reason, trip_id, ${DELIVERY_MONEY_COLUMNS}, order_items(quantity, unit_at_order, products(name, unit)), stores(name, phone, lat, lng, manual_address, address_line, zones(name)), users!customer_id(name, phone), addresses(line1, landmark, latitude, longitude, delivery_instructions)`,
      )
      .eq('rider_id', req.user!.id)
;
    let syncFilter: string | undefined;
    if (req.query.view === 'sync') {
      const midnight = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30').toISOString();
      syncFilter = `status.in.(placed,packed,out_for_delivery),placed_at.gte.${midnight}`;
    }
    if (page.cursor) syncFilter = syncFilter ? `and(or(${syncFilter}),or(${cursorFilter('placed_at', page.cursor)}))` : cursorFilter('placed_at', page.cursor);
    if (syncFilter) query = query.or(syncFilter);
    const { data, error } = await query.order('placed_at', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as (DeliveryMoneyOrder & { placed_at: string })[];
    sendPage(res, await withDeliveryMoney(rows, req.user!.id), page, 'placed_at');
  } catch (err) {
    next(err);
  }
});

// The rider app's Earnings tab, server-derived. Each rider_earnings row is
// either one single-store order (trip_id null) or one whole trip (trip_id
// set). The base vs extra-stop split is the one stored on the row when it was
// earned (rider_earnings.base_amount/extra_stop_amount, migration 108). Sorted by deliveredAt DESC — paid_at is null until the
// weekly payout settles, so it can't order the list. Service client bypasses
// RLS like every other handler here; the .eq('rider_id', ...) filter is the
// scoping — do not remove it.
riderRouter.get('/earnings-summary', async (req: AuthedRequest, res, next) => {
  try {
    const from = req.query.from; const until = req.query.until;
    if (typeof from !== 'string' || typeof until !== 'string' || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(until)) || Date.parse(until) <= Date.parse(from) || Date.parse(until)-Date.parse(from)>32*86400000)
      throw new AppError(400,'INVALID_PERIOD','Choose an earnings period of up to 32 days.');
    const { data, error } = await supabase.rpc('rider_earning_totals',{p_rider:req.user!.id,p_from:from,p_until:until});
    if (error) throw error;
    res.json(data ?? []);
  } catch(error) { next(error); }
});

riderRouter.get('/earnings', async (req: AuthedRequest, res, next) => {
  try {
    const from = req.query.from; const until = req.query.until;
    if (from !== undefined || until !== undefined) {
      if (typeof from !== 'string' || typeof until !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(from) || !/^\d{4}-\d{2}-\d{2}T/.test(until) || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(until)) || Date.parse(until) <= Date.parse(from) || Date.parse(until) - Date.parse(from) > 32 * 86400000)
        throw new AppError(400, 'INVALID_PERIOD', 'Choose an earnings period of up to 32 days.');
    }
    const page = readPage(req, `rider-earnings:${req.user!.id}:${from ?? ''}:${until ?? ''}`);
    let query = supabase
      .from('rider_earnings')
      .select('id, earned_at, amount, base_amount, extra_stop_amount, paid_at, order_id, trip_id, orders(order_number, delivered_at, stores(name))')
      .eq('rider_id', req.user!.id).not('earned_at', 'is', null);
    if (from && until) query = query.gte('earned_at', from).lt('earned_at', until);
    if (page.cursor) query = query.or(cursorFilter('earned_at', page.cursor));
    const { data, error } = await query.order('earned_at', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;

    const rows = (data ?? []) as unknown as {
      id: string;
      earned_at: string;
      amount: number | string;
      base_amount: number | string | null;
      extra_stop_amount: number | string | null;
      paid_at: string | null;
      order_id: string;
      trip_id: string | null;
      orders: { order_number: string | null; delivered_at: string | null; stores: { name: string | null } | null } | null;
    }[];

    // Leg count per trip — a per-row embedded aggregate is awkward in
    // PostgREST, so one extra query counts every order sharing each trip_id
    // in JS. Single-order earnings (trip_id null) always have stopCount 1.
    const tripIds = [...new Set(rows.map((r) => r.trip_id).filter((id): id is string => id !== null))];
    const stopCountByTrip = new Map<string, number>();
    if (tripIds.length > 0) {
      const { data: legs, error: legsErr } = await supabase.from('orders').select('trip_id').in('trip_id', tripIds);
      if (legsErr) throw legsErr;
      for (const leg of (legs ?? []) as { trip_id: string | null }[]) {
        if (leg.trip_id) stopCountByTrip.set(leg.trip_id, (stopCountByTrip.get(leg.trip_id) ?? 0) + 1);
      }
    }

    const earnings = rows
      .map((row) => {
        const amount = Number(row.amount);
        const stopCount = row.trip_id ? stopCountByTrip.get(row.trip_id) ?? 1 : 1;
        const extraStop = row.extra_stop_amount == null ? 0 : Number(row.extra_stop_amount);
        const base = row.base_amount == null ? amount - extraStop : Number(row.base_amount);
        return {
          id: row.id,
          amount,
          status: row.paid_at ? ('paid' as const) : ('pending' as const),
          paidAt: row.paid_at,
          deliveredAt: row.earned_at,
          orderNumber: row.orders?.order_number ?? null,
          storeName: row.orders?.stores?.name ?? null,
          isTrip: !!row.trip_id,
          stopCount,
          baseFee: base,
          extraStopFee: extraStop,
        };
      })
      .sort((a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? ''));

    sendPage(res, earnings, page, 'deliveredAt');
  } catch (err) {
    next(err);
  }
});

// Cash the rider collected on cash-on-delivery orders and has not yet handed
// over (rider_cash_collections, migration 108; an admin settles it from the
// Cash on delivery page). Own rows only — the .eq('rider_id', ...) filter is
// the scoping, as in every sibling handler.
riderRouter.get('/cash-balance', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rider_cash_collections')
      .select('amount')
      .eq('rider_id', req.user!.id)
      .is('settled_at', null);
    if (error) throw error;
    const rows = (data ?? []) as { amount: number | string }[];
    const outstanding = Math.round(rows.reduce((sum, row) => sum + Number(row.amount), 0) * 100) / 100;
    res.json({ outstanding, count: rows.length });
  } catch (err) {
    next(err);
  }
});

// The rider app's weekly payout history — one row per rider_payouts record
// (migration 050): the money that actually settled to the rider's bank each
// week, the per-WEEKLY-PAYOUT complement to GET /earnings's per-delivery view.
// Service client bypasses RLS like every sibling handler; the
// .eq('rider_id', ...) filter is the scoping — a rider must never read another
// rider's payouts, so do not remove it. Newest week first. utr is the bank
// reference the founder recorded when paying manually (PAYOUTS.md), so the
// rider can match it in their statement; no other internal columns leak.
riderRouter.get('/payouts', async (req: AuthedRequest, res, next) => {
  try {
    const page = readPage(req, `rider-payouts:${req.user!.id}`, 'date');
    let query = supabase
      .from('rider_payouts')
      .select('id, week_start, week_end, amount, status, paid_at, utr, payment_mode')
      .eq('rider_id', req.user!.id)
;
    if (page.cursor) query = query.or(cursorFilter('week_start', page.cursor));
    const { data, error } = await query.order('week_start', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;

    const rows = (data ?? []) as unknown as {
      id: string;
      week_start: string;
      week_end: string;
      amount: number | string;
      status: 'pending' | 'paid' | 'failed' | 'blocked';
      paid_at: string | null;
      utr: string | null;
      payment_mode: 'upi' | 'bank_transfer' | null;
    }[];

    const payouts = rows.map((p) => ({
      id: p.id,
      weekStart: p.week_start,
      weekEnd: p.week_end,
      amount: Number(p.amount),
      status: p.status,
      paidAt: p.paid_at,
      utr: p.utr,
      paymentMode: p.payment_mode,
    }));

    sendPage(res, payouts, page, 'weekStart');
  } catch (err) {
    next(err);
  }
});

// Streams the decrypted bytes of one of the rider's own rider-documents
// assets (KYC photos). The /rider/profile photoUrl/aadhaarPhotoUrl/dlPhotoUrl
// fields point here. Authorization is ownership + bucket + readiness: serve
// only an asset uploaded_by this rider, in the rider-documents bucket, with
// status 'ready'; any miss is a flat 404 so the endpoint never confirms that
// some other rider's assetId exists. readPrivateDocument handles both
// encrypted (decrypt) and legacy plaintext assets. Private, never cached.
riderRouter.get('/documents/:assetId', async (req: AuthedRequest, res, next) => {
  try {
    const { data: asset } = await supabase
      .from('media_assets')
      .select('bucket, object_key, content_type, encrypted, enc_iv, enc_tag, wrapped_dek, wrap_iv, wrap_tag, kek_id, uploaded_by, status')
      .eq('id', req.params.assetId)
      .maybeSingle();
    if (!asset || asset.uploaded_by !== req.user!.id || asset.bucket !== 'rider-documents' || asset.status !== 'ready') {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
    }

    let bytes: Buffer;
    let contentType: string;
    try {
      ({ bytes, contentType } = await readPrivateDocument(asset));
    } catch (readErr) {
      // Download/decrypt failure: log server-side, leak no detail to the client.
      console.error('rider document read failed', req.params.assetId, readErr);
      throw new AppError(500, 'DOCUMENT_READ_FAILED', 'Document could not be retrieved.');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(bytes);
  } catch (err) {
    next(err);
  }
});

// The single sync source for the rider app's own profile screen. Post-
// approval the onboarding draft is deleted (admin's approve route copies
// draft -> riders then DROPs it), so the `riders` row is the ONLY place the
// onboarding details still live — GET /rider/draft returns null by then.
// Aadhaar + bank account masked server-side (last-4); DL/UPI/vehicle shown
// as entered. phone + created_at come off the users row / riders.created_at.
riderRouter.get('/profile', async (req: AuthedRequest, res, next) => {
  try {
    const { data: rider, error } = await supabase
      .from('riders')
      .select(
        'zone:zones(name), rider_code, name, date_of_birth, photo_url, home_address, aadhaar_number, aadhaar_photo_url, dl_number, dl_photo_url, vehicle_type, vehicle_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, payout_method, payout_upi_id, payout_upi_verified_name, payout_bank_name, payout_bank_account_number, payout_bank_ifsc, payout_account_holder_name, created_at',
      )
      .eq('user_id', req.user!.id)
      .single();
    if (error || !rider) throw new AppError(404, 'RIDER_NOT_FOUND', 'No rider profile for this account.');

    const { data: user } = await supabase.from('users').select('phone').eq('id', req.user!.id).single();

    // photo_url, aadhaar_photo_url, dl_photo_url are all object PATHs on the
    // PRIVATE rider-documents bucket. Resolve each to its media_assets row and
    // return a /rider/documents/:id URL — the bytes stream through that
    // endpoint (which decrypts the encrypted KYC docs); a Supabase signed URL
    // can no longer read the ciphertext. Null path -> null url.
    const [photoUrl, aadhaarPhotoUrl, dlPhotoUrl] = await Promise.all([
      resolveRiderDocUrl(rider.photo_url, req.user!.id),
      resolveRiderDocUrl(rider.aadhaar_photo_url, req.user!.id),
      resolveRiderDocUrl(rider.dl_photo_url, req.user!.id),
    ]);

    res.json({
      zoneName: (Array.isArray(rider.zone) ? rider.zone[0] : rider.zone)?.name ?? null,
      riderCode: rider.rider_code,
      name: rider.name,
      phone: user?.phone ?? null,
      photoUrl,
      dateOfBirth: rider.date_of_birth,
      homeAddress: rider.home_address,
      aadhaarMasked: maskAadhaar(rider.aadhaar_number),
      aadhaarPhotoUrl,
      dlNumber: rider.dl_number,
      dlPhotoUrl,
      vehicleType: rider.vehicle_type,
      vehicleNumber: rider.vehicle_number,
      emergencyContactName: rider.emergency_contact_name,
      emergencyContactPhone: rider.emergency_contact_phone,
      emergencyContactRelationship: rider.emergency_contact_relationship,
      memberSince: rider.created_at,
      payout: {
        // Legacy 'bank_account' rows read as the contract's 'bank' (PAYOUTS.md).
        method: rider.payout_method === 'bank_account' ? 'bank' : rider.payout_method,
        upiId: rider.payout_upi_id,
        upiVerifiedName: rider.payout_upi_verified_name,
        bankName: rider.payout_bank_name,
        maskedAccountNumber: maskAccountNumber(rider.payout_bank_account_number),
        ifsc: rider.payout_bank_ifsc,
        accountHolderName: rider.payout_account_holder_name,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Changes never overwrite an approved identity until an administrator reviews them.
riderRouter.get('/profile-changes', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.from('rider_profile_change_requests')
      .select('id,status,submitted_at,reviewed_at,review_note').eq('user_id', req.user!.id)
      .order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    res.json(data);
  } catch (error) { next(error); }
});
riderRouter.post('/profile-changes', async (req: AuthedRequest, res, next) => {
  try {
    const { data: rider, error } = await supabase.from('riders').select('vehicle_type')
      .eq('user_id', req.user!.id).single();
    if (error || !rider) throw new AppError(404, 'RIDER_NOT_FOUND', 'Rider profile not found.');
    const changes = validateRiderProfileChanges(req.body, rider.vehicle_type);
    for (const [field, kind] of [['aadhaar_photo_url', 'aadhaar'], ['dl_photo_url', 'dl']] as const) {
      const path = changes[field];
      if (!path) continue;
      if (!isOwnedRiderDocument(path, req.user!.id, kind))
        throw new AppError(400, 'INVALID_DOCUMENT', 'Upload your own document before submitting.');
      const asset = await supabase.from('media_assets').select('id').eq('object_key', path)
        .eq('uploaded_by', req.user!.id).eq('bucket', 'rider-documents').eq('visibility', 'private')
        .eq('status', 'ready').maybeSingle();
      if (asset.error) throw asset.error;
      if (!asset.data) throw new AppError(400, 'INVALID_DOCUMENT', 'Document upload is not ready.');
    }
    const result = await supabase.rpc('submit_rider_profile_change', { p_user_id: req.user!.id, p_changes: changes });
    if (result.error) {
      if (result.error.code === '23505' || result.error.message.includes('awaiting review'))
        throw new AppError(409, 'REVIEW_PENDING', 'Your previous changes are still awaiting review.');
      throw result.error;
    }
    res.status(201).json({ id: result.data, status: 'pending' });
  } catch (error) { next(error); }
});

// Payout destination (PAYOUTS.md) — same shared logic as partner's
// /payout-account; riders keyed by riders.user_id (= users.id).
riderRouter.get('/payout-account', async (req: AuthedRequest, res, next) => {
  try {
    res.json(await readPayoutAccount('riders', 'user_id', req.user!.id));
  } catch (err) {
    next(err);
  }
});

riderRouter.put('/payout-account', payoutAccountBudget, async (req: AuthedRequest, res, next) => {
  try {
    res.json(await writePayoutAccount('riders', 'user_id', req.user!.id, req.body, req.user!.id));
  } catch (err) {
    next(err);
  }
});

// The rider app's in-app notifications feed (migration 054) — the durable
// record behind the fire-and-forget pushes (assignment on accept here, admin
// assign, onboarding decisions). Newest first, the caller's own rows only
// (.eq('user_id', ...) is the scoping — service client bypasses RLS like
// every sibling handler, do not remove it). Capped at 50: a feed this small
// never needs paging at MVP volume. unreadCount is derived off the same 50
// rows the client already renders — no separate count round-trip.
riderRouter.get('/notifications', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, type, order_id, read_at, created_at')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    const rows = (data ?? []) as {
      id: string;
      title: string;
      body: string;
      type: string;
      order_id: string | null;
      read_at: string | null;
      created_at: string;
    }[];

    const notifications = rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      orderId: n.order_id,
      readAt: n.read_at,
      createdAt: n.created_at,
    }));
    const unreadCount = notifications.filter((n) => n.readAt === null).length;

    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// Mark the caller's notifications read. Default (no body) marks ALL of their
// unread rows — the lazy-correct behaviour behind a "you opened the feed"
// tap. Optional { ids } narrows it to specific rows for a future swipe-one
// UI. Either way `read_at IS NULL` keeps it idempotent (already-read rows
// aren't re-stamped) and .eq('user_id', ...) keeps a rider from touching
// anyone else's rows.
riderRouter.patch('/notifications/read', async (req: AuthedRequest, res, next) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user!.id)
      .is('read_at', null);
    if (Array.isArray(ids) && ids.length > 0) query = query.in('id', ids);

    const { error } = await query;
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// The rider app's profile-header stats — REAL, DB-derived, replacing the mock
// client math in apps/rider's utils/performance.ts. orders.rider_id references
// users.id (001_init.sql:62; POST /orders/:id/accept above writes req.user!.id
// into it), so both queries scope on req.user!.id directly — no riders-row-id
// indirection. computeRiderStats (lib/riderStats.ts) does the pure math; this
// handler only gathers the raw counts + ratings. Service client bypasses RLS
// like every sibling handler; the .eq('rider_id'/'orders.rider_id', ...) filter
// is the scoping — do not remove it.
riderRouter.get('/stats', async (req: AuthedRequest, res, next) => {
  try {
    // Orders tally: 'delivered' → deliveries, 'failed' → rider-attributable
    // non-completion (migration 052). 'cancelled' is a customer/store cancel,
    // never the rider's fault, so it's excluded from attempted entirely.
    const { data: orders, error: ordersErr } = await supabase.from('orders').select('status').eq('rider_id', req.user!.id);
    if (ordersErr) throw ordersErr;

    const deliveredCount = (orders ?? []).filter((o) => o.status === 'delivered').length;
    const failedCount = (orders ?? []).filter((o) => o.status === 'failed').length;

    // Reviews on orders this rider delivered. reviews.order_id FKs orders(id)
    // (migration 020) — the single reviews→orders FK, so the `orders` embed is
    // unambiguous. inner join + filter on the embedded orders.rider_id keeps
    // only reviews whose order was delivered by this rider.
    const { data: reviews, error: reviewsErr } = await supabase
      .from('reviews')
      .select('rating, orders!inner(rider_id)')
      .eq('orders.rider_id', req.user!.id);
    if (reviewsErr) throw reviewsErr;

    const ratings = (reviews ?? []).map((r) => Number(r.rating));

    res.json(computeRiderStats({ deliveredCount, failedCount, ratings }));
  } catch (err) {
    next(err);
  }
});
