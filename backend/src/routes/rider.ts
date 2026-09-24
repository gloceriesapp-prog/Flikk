// Source: specs/03-rider-app/api.md — assignments/earnings scoped to the caller only.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { verifyPayoutAccount, type PayoutAccountInput } from '../payments/verifyPayoutAccount.js';
import { fetchRoute } from '../lib/routeDirections.js';

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
        'id, order_number, delivery_fee, trip_id, trips(delivery_fee), stores(name, lat, lng), addresses(line1, landmark, latitude, longitude), order_items(quantity)'
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
        '*, order_items(*, products(name, unit)), stores(name, phone, lat, lng, zones(name)), users!customer_id(name, phone), addresses(line1, landmark, latitude, longitude), trips(delivery_fee)',
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
