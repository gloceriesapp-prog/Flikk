import { readPage, cursorFilter, sendPage } from '../lib/cursorPagination.js';
// Source: specs/03-rider-app/api.md — assignments/earnings scoped to the caller only.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { verifyPayoutAccount, type PayoutAccountInput } from '../payments/verifyPayoutAccount.js';
import { fetchRoute } from '../lib/routeDirections.js';
import { EXTRA_STOP_FEE } from '../lib/checkoutQuote.js';
import { splitEarning } from '../lib/earningsBreakdown.js';
import { createNotification } from '../lib/notifications.js';
import { validateAvailability } from '../lib/riderSchedule.js';
import { computeRiderStats } from '../lib/riderStats.js';

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

// Object paths on the PRIVATE rider-documents bucket -> short-lived signed
// URLs. Only the rider's own service-role read can mint these (bucket is
// never public). Null path -> null url so the app renders a placeholder.
async function signRiderDoc(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from('rider-documents').createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
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
    // per store beyond the first), never the flat single-store fee. Store
    // + drop coords, drop label and item count are the same joins
    // /assignments already pulls — the rider app's offer card renders a
    // pickup→drop preview from them (no new migration, real order data).
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select(
        // dispatch_broadcast_at — when this offer was (re)broadcast; the
        // client derives the real per-offer countdown deadline from it
        // (that timestamp + DISPATCH_OFFER_WINDOW_MS), instead of a
        // mount-seeded guess. Set on every broadcast/rebroadcast in
        // lib/riderDispatch.ts.
        'id, order_number, delivery_fee, trip_id, dispatch_broadcast_at, trips(delivery_fee), stores(name, lat, lng), addresses(line1, landmark, latitude, longitude), order_items(quantity)'
      )
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
      orderId: data.id,
    });

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
    const page = readPage(req, `rider-assignments:${req.user!.id}:${req.query.view ?? 'history'}`);
    let query = supabase
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
        'id, status, placed_at, delivered_at, cancel_reason, trip_id, order_items(quantity, unit_at_order, products(name, unit)), stores(name, phone, lat, lng, manual_address, address_line, zones(name)), users!customer_id(name, phone), addresses(line1, landmark, latitude, longitude, delivery_instructions), trips(delivery_fee)',
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
    sendPage(res, data ?? [], page, 'placed_at');
  } catch (err) {
    next(err);
  }
});

// The rider app's Earnings tab, server-derived. Each rider_earnings row is
// either one single-store order (trip_id null) or one whole trip (trip_id
// set). The base vs extra-stop split of the combined amount isn't persisted,
// so it's recomputed here from EXTRA_STOP_FEE and the trip's leg count
// (splitEarning). Sorted by deliveredAt DESC — paid_at is null until the
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
      .select('id, earned_at, amount, paid_at, order_id, trip_id, orders(order_number, delivered_at, stores(name)), trips(delivery_fee)')
      .eq('rider_id', req.user!.id).not('earned_at', 'is', null);
    if (from && until) query = query.gte('earned_at', from).lt('earned_at', until);
    if (page.cursor) query = query.or(cursorFilter('earned_at', page.cursor));
    const { data, error } = await query.order('earned_at', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;

    const rows = (data ?? []) as unknown as {
      id: string;
      earned_at: string;
      amount: number | string;
      paid_at: string | null;
      order_id: string;
      trip_id: string | null;
      orders: { order_number: string | null; delivered_at: string | null; stores: { name: string | null } | null } | null;
      trips: { delivery_fee: number | string } | null;
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
        const { base, extraStop } = splitEarning(amount, stopCount, EXTRA_STOP_FEE);
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

// The rider app's weekly payout history — one row per rider_payouts record
// (migration 050): the money that actually settled to the rider's bank each
// week, the per-WEEKLY-PAYOUT complement to GET /earnings's per-delivery view.
// Service client bypasses RLS like every sibling handler; the
// .eq('rider_id', ...) filter is the scoping — a rider must never read another
// rider's payouts, so do not remove it. Newest week first. razorpay_payout_id
// is surfaced only as a reference the rider can quote to support; no other
// internal columns (created_at, failure internals) leak.
riderRouter.get('/payouts', async (req: AuthedRequest, res, next) => {
  try {
    const page = readPage(req, `rider-payouts:${req.user!.id}`, 'date');
    let query = supabase
      .from('rider_payouts')
      .select('id, week_start, week_end, amount, status, paid_at, razorpay_payout_id')
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
      status: 'pending' | 'processing' | 'paid' | 'failed' | 'blocked';
      paid_at: string | null;
      razorpay_payout_id: string | null;
    }[];

    const payouts = rows.map((p) => ({
      id: p.id,
      weekStart: p.week_start,
      weekEnd: p.week_end,
      amount: Number(p.amount),
      status: p.status,
      paidAt: p.paid_at,
      razorpayPayoutId: p.razorpay_payout_id,
    }));

    sendPage(res, payouts, page, 'weekStart');
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
        'rider_code, name, date_of_birth, photo_url, home_address, aadhaar_number, aadhaar_photo_url, dl_number, dl_photo_url, vehicle_type, vehicle_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, payout_method, payout_upi_id, payout_upi_verified_name, payout_bank_name, payout_bank_account_number, payout_bank_ifsc, payout_account_holder_name, created_at',
      )
      .eq('user_id', req.user!.id)
      .single();
    if (error || !rider) throw new AppError(404, 'RIDER_NOT_FOUND', 'No rider profile for this account.');

    const { data: user } = await supabase.from('users').select('phone').eq('id', req.user!.id).single();

    // photo_url, aadhaar_photo_url, dl_photo_url are all object PATHs on the
    // PRIVATE rider-documents bucket — sign short-lived URLs so the app can
    // render them without the bucket ever being public. Same pattern admin's
    // approvals route already uses (signPhotoUrls). Null path -> null url.
    const [photoUrl, aadhaarPhotoUrl, dlPhotoUrl] = await Promise.all([
      signRiderDoc(rider.photo_url),
      signRiderDoc(rider.aadhaar_photo_url),
      signRiderDoc(rider.dl_photo_url),
    ]);

    res.json({
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
        method: rider.payout_method,
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
// same underlying lib + exact same two-method (bank_account | upi) shape as
// routes/partner.ts's own POST /verify-payout (verifyPayoutAccount.ts is
// method-agnostic, genuinely shared). Verifying one method clears the
// other's saved fields — a rider only ever has one active payout
// destination at a time (payout_method).
riderRouter.post('/verify-payout', async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as { method?: 'upi' | 'bank_account'; vpa?: string; accountNumber?: string; ifsc?: string; accountHolderName?: string };

    let input: PayoutAccountInput;
    if (body.method === 'upi') {
      if (!body.vpa?.trim()) throw new AppError(400, 'MISSING_FIELDS', 'UPI ID is required.');
      input = { method: 'upi', vpa: body.vpa.trim() };
    } else if (body.method === 'bank_account') {
      if (!body.accountNumber?.trim() || !body.ifsc?.trim() || !body.accountHolderName?.trim()) {
        throw new AppError(400, 'MISSING_FIELDS', 'accountNumber, ifsc and accountHolderName are required.');
      }
      input = {
        method: 'bank_account',
        accountNumber: body.accountNumber.trim(),
        ifsc: body.ifsc.trim().toUpperCase(),
        accountHolderName: body.accountHolderName.trim(),
      };
    } else {
      throw new AppError(400, 'INVALID_METHOD', 'method must be "upi" or "bank_account".');
    }

    const { data: rider } = await supabase
      .from('riders')
      .select('id, name, razorpay_contact_id')
      .eq('user_id', req.user!.id)
      .single();
    if (!rider) throw new AppError(404, 'RIDER_NOT_FOUND', 'No rider profile for this account.');

    const { data: user } = await supabase.from('users').select('phone').eq('id', req.user!.id).single();

    const accountHolder = input.method === 'bank_account' ? input.accountHolderName : (rider.name ?? '');
    const { result, contactId, fundAccountId } = await verifyPayoutAccount(input, accountHolder, user?.phone ?? null, rider.razorpay_contact_id);

    const patch: Record<string, unknown> =
      input.method === 'upi'
        ? {
            payout_method: 'upi',
            payout_upi_id: input.vpa,
            payout_upi_verified_name: result.registeredName,
            payout_account_holder_name: result.registeredName ?? rider.name,
            payout_bank_name: result.bankName,
            payout_bank_account_number: null,
            payout_bank_ifsc: null,
            razorpay_contact_id: contactId,
            razorpay_fund_account_id: fundAccountId,
          }
        : {
            payout_method: 'bank_account',
            payout_upi_id: null,
            payout_upi_verified_name: null,
            payout_account_holder_name: result.registeredName ?? input.accountHolderName,
            payout_bank_name: result.bankName,
            payout_bank_account_number: input.accountNumber,
            payout_bank_ifsc: result.bankIfsc ?? input.ifsc,
            razorpay_contact_id: contactId,
            razorpay_fund_account_id: fundAccountId,
          };
    await supabase.from('riders').update(patch).eq('id', rider.id);

    res.json({
      method: input.method,
      vpa: input.method === 'upi' ? input.vpa : null,
      maskedAccountNumber: input.method === 'bank_account' ? maskAccountNumber(input.accountNumber) : null,
      ifsc: input.method === 'bank_account' ? (result.bankIfsc ?? input.ifsc) : null,
      accountHolderName: result.registeredName,
      accountStatus: result.accountStatus,
      bankName: result.bankName,
      nameMatchScore: result.nameMatchScore,
    });
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
