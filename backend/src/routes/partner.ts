import { storePublicImage } from '../media/publicImages.js';
import { readPage, cursorFilter, sendPage } from '../lib/cursorPagination.js';
// Source: specs/02-partner-app/api.md — every query scoped to the caller's own store,
// never trusting a store_id from the request body.
//
// A product a store owner adds/edits here lands with products.approval_status
// = 'pending' (POST /products below) — it's real, scoped to their own
// store, visible in their own GET /products, but every customer-facing
// feed (routes/stores.ts, routes/categories.ts) filters to 'approved' only,
// so it stays invisible to shoppers until a founder approves it from
// admin. This is the same "store owner writes, admin approval gates
// visibility" shape as store onboarding itself (storeOnboarding.ts).
// Edits go through the same gate (save_catalogue_product, migration 115):
// a rejected product the owner edits goes back to 'pending', and a new
// name or any pack price change on a LIVE product is held in
// products.pending_changes for admin review while customers keep seeing the
// approved name/prices. Stock counts and other fields still apply live.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { saveCatalogueProduct } from '../db/productVariants.js';
import { AppError, asValidationError } from '../lib/errors.js';
import {
  resolveEditImage,
  toProductPatchRow,
  toProductRow,
  toVariantPayload,
  validateProductInput,
  validateProductPatch,
  type ProductInput,
} from '../lib/products.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { payoutAccountBudget, readPayoutAccount, writePayoutAccount } from '../lib/payoutAccount.js';
import { decodeImage, toWebp } from '../utils/image.js';
import { round2 } from '../lib/pricing.js';
import { reverseGeocode } from '../lib/reverseGeocode.js';
import { isValidFssaiFormat, isValidPanFormat } from '../lib/documentValidation.js';

export const partnerRouter = Router();
partnerRouter.use(requireAuth, requireRole('store_owner'), requireApproved);

async function ownStoreId(userId: string): Promise<string> {
  const { data, error } = await supabase.from('stores').select('id').eq('owner_user_id', userId).single();
  if (error || !data) throw new AppError(404, 'STORE_NOT_FOUND', 'No store for this owner.');
  return data.id;
}

// The real, verified account phone (users.phone, set at OTP verify time)
// — never stores.phone, which is a separate unset column meant for a
// storefront contact number that nothing here ever populates. Settings'
// own "Phone number" row was reading that always-null column, which is
// why it never showed anything real.
async function ownerPhone(userId: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('phone').eq('id', userId).single();
  return data?.phone ?? null;
}

// Never sends the real bank account number to the client, even though
// it's kept in full in the DB (needed to actually run a payout later) —
// last-4-visible masking, same convention payment providers' own API responses
// already use for account numbers.
function maskAccountNumber(full: string | null): string | null {
  if (!full) return null;
  return `XXXXXXXX${full.slice(-4)}`;
}

const STORE_SELECT =
  'id, name, category, is_active, admin_suspended, suspended_reason, suspended_at, district, address_line, manual_address, lat, lng, photo_url, open_time, close_time, avg_prep_minutes, payout_method, payout_upi_id, payout_upi_verified_name, payout_bank_name, payout_bank_account_number, payout_bank_ifsc, owner_name, gst_number, shop_establishment_number, fssai_number, pan_number';

// Business documents are write-once from the owner's side — real, not
// just a disabled input client-side (a raw PATCH call could otherwise
// still slip a change through). Once a document field holds a real
// value, only the exact same value is accepted again (a no-op re-save);
// a genuinely different value 400s. An empty field stays settable for
// the first time — this only locks a value that's already there.
function assertNotLocked(field: string, current: string | null, incoming: unknown, normalize: (v: string) => string = (v) => v.trim()) {
  if (incoming === undefined || typeof current !== 'string' || current.trim().length === 0) return;
  const incomingValue = typeof incoming === 'string' ? normalize(incoming) : '';
  if (incomingValue !== current.trim()) {
    throw new AppError(400, 'DOCUMENT_LOCKED', `${field} is already on file and can't be changed here.`);
  }
}

function storeSuspendedError(reason: string | null): AppError {
  return new AppError(
    409,
    'STORE_SUSPENDED',
    reason ? `Suspended by Gloceries: ${reason}. Contact Gloceries support to reopen.` : 'Suspended by Gloceries. Contact Gloceries support to reopen.',
  );
}

function toStoreResponse(data: Record<string, unknown>, phone: string | null) {
  const { payout_bank_account_number, ...rest } = data;
  return { ...rest, payout_bank_account_number: maskAccountNumber(payout_bank_account_number as string | null), phone };
}

partnerRouter.get('/store', async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.from('stores').select(STORE_SELECT).eq('owner_user_id', req.user!.id).single();
    if (error || !data) throw new AppError(404, 'STORE_NOT_FOUND', 'No store for this owner.');

    // Real backfill, not a fake fallback — a store that was pinned
    // (lat/lng real, captured during onboarding's LocationPinScreen) but
    // has no address_line yet (approved before that column existed, or
    // the draft->store copy predates it) gets a genuine one computed here
    // from its own real coordinates via the same accurate Google
    // Geocoding lookup /location/reverse-geocode already uses — this was
    // the actual bug behind "Located at" showing only the coarse district
    // ("Kapu") instead of a real street-level address. Persisted back
    // onto the row so this only ever runs once per store, not on every
    // single GET /store call.
    if (!data.address_line && data.lat != null && data.lng != null) {
      const geocoded = await reverseGeocode(data.lat, data.lng);
      if (geocoded.addressLabel) {
        data.address_line = geocoded.addressLabel;
        await supabase.from('stores').update({ address_line: geocoded.addressLabel }).eq('id', data.id);
      }
    }

    res.json(toStoreResponse(data, await ownerPhone(req.user!.id)));
  } catch (err) {
    next(err);
  }
});

partnerRouter.patch('/store', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const {
      name,
      category,
      is_active,
      district,
      address_line,
      manual_address,
      lat,
      lng,
      open_time,
      close_time,
      avg_prep_minutes,
      photo_url,
      owner_name,
      gst_number,
      shop_establishment_number,
      fssai_number,
      pan_number,
    } = req.body as Record<string, unknown>;

    // Reject rather than silently save an obviously malformed number —
    // both are optional-to-omit (undefined skips the field entirely, same
    // as every other field here), but a NON-empty value that doesn't
    // match the real official format is a typo worth catching now, not a
    // value blindly stored and only questioned later.
    if (typeof fssai_number === 'string' && fssai_number.trim() && !isValidFssaiFormat(fssai_number)) {
      throw new AppError(400, 'INVALID_FSSAI_FORMAT', 'FSSAI license number must be exactly 14 digits.');
    }
    if (typeof pan_number === 'string' && pan_number.trim() && !isValidPanFormat(pan_number)) {
      throw new AppError(400, 'INVALID_PAN_FORMAT', 'PAN must be in the format ABCDE1234F.');
    }

    // Enforced by assertNotLocked below (module-level, see its own note).
    const { data: currentDoc, error: currentDocError } = await supabase
      .from('stores')
      .select('gst_number, shop_establishment_number, fssai_number, pan_number, admin_suspended, suspended_reason')
      .eq('id', storeId)
      .single();
    if (currentDocError || !currentDoc) throw new AppError(404, 'STORE_NOT_FOUND', 'No store for this owner.');
    // An admin suspension (migration 110) is not the partner's open/closed
    // toggle: only admin can lift it. The DB trigger enforces the same rule.
    if (is_active === true && currentDoc.admin_suspended) throw storeSuspendedError(currentDoc.suspended_reason);

    assertNotLocked('GST number', currentDoc.gst_number, gst_number);
    assertNotLocked('Shop & Establishment license', currentDoc.shop_establishment_number, shop_establishment_number);
    assertNotLocked('FSSAI license number', currentDoc.fssai_number, fssai_number);
    assertNotLocked('PAN', currentDoc.pan_number, pan_number, (v) => v.trim().toUpperCase());
    // Deliberately NOT accepting payout_upi_id/payout_upi_verified_name/
    // payout_method/payout_bank_* here — every payout-destination field
    // is only ever written by PUT /payout-account, which validates them and
    // resets the founder's verification flag (PAYOUTS.md).
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (category !== undefined) patch.category = category;
    if (is_active !== undefined) patch.is_active = is_active;
    if (district !== undefined) patch.district = district;
    if (address_line !== undefined) patch.address_line = address_line;
    // manual_address is the shop owner's own typed description (e.g. "Near
    // Bus Stand, opposite Xyz store") — a genuinely different field from
    // address_line, which is always the real reverse-geocoded text from
    // the map pin (LocationPinScreen). Never derived from one another.
    if (manual_address !== undefined) patch.manual_address = manual_address;
    // lat/lng only ever arrive together, from StoreSettingsScreen's own
    // "Change on map" flow (LocationPinScreen, same real pin-drag +
    // reverse-geocode onboarding already used) — the one place after
    // approval a store owner can update their store's actual location.
    if (lat !== undefined) patch.lat = lat;
    if (lng !== undefined) patch.lng = lng;
    if (open_time !== undefined) patch.open_time = open_time;
    if (close_time !== undefined) patch.close_time = close_time;
    if (avg_prep_minutes !== undefined) patch.avg_prep_minutes = avg_prep_minutes;
    if (photo_url !== undefined) patch.photo_url = photo_url;
    if (owner_name !== undefined) patch.owner_name = owner_name;
    if (gst_number !== undefined) patch.gst_number = gst_number;
    if (shop_establishment_number !== undefined) patch.shop_establishment_number = shop_establishment_number;
    if (fssai_number !== undefined) patch.fssai_number = typeof fssai_number === 'string' ? fssai_number.trim() : fssai_number;
    if (pan_number !== undefined) patch.pan_number = typeof pan_number === 'string' ? pan_number.trim().toUpperCase() : pan_number;

    const { data, error } = await supabase.from('stores').update(patch).eq('id', storeId).select(STORE_SELECT).single();
    if (error?.code === 'P0409' && error.message === 'STORE_SUSPENDED') throw storeSuspendedError(null);
    if (error || !data) throw new AppError(404, 'STORE_NOT_FOUND', 'No store for this owner.');
    res.json(toStoreResponse(data, await ownerPhone(req.user!.id)));
  } catch (err) {
    next(err);
  }
});

// Payout destination (PAYOUTS.md). Saved as entered and paid manually; the
// founder verifies the name in admin. Full account number never returned.
partnerRouter.get('/payout-account', async (req: AuthedRequest, res, next) => {
  try {
    res.json(await readPayoutAccount('stores', 'id', await ownStoreId(req.user!.id)));
  } catch (err) {
    next(err);
  }
});

partnerRouter.put('/payout-account', payoutAccountBudget, async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    res.json(await writePayoutAccount('stores', 'id', storeId, req.body, req.user!.id));
  } catch (err) {
    next(err);
  }
});

// India Standard Time is a fixed +5:30 offset, no DST — same safe-to-
// hardcode reasoning jobs/weeklyPayouts.ts's own IST_OFFSET_MS already
// documents. A separate local copy here (not imported from that file) is
// deliberate — this is a single-day boundary, not a week, and the two
// have no real logic in common beyond both needing this same fixed
// offset.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function todayIstRange(now: Date = new Date()): { start: Date; end: Date } {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const istMidnight = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  return {
    start: new Date(istMidnight - IST_OFFSET_MS),
    end: new Date(istMidnight + 24 * 60 * 60 * 1000 - IST_OFFSET_MS),
  };
}

// Real, server-computed daily stats for OrdersScreen's own top-of-screen
// cards (TodayStatsCard) — these used to be derived client-side from
// whatever useOrdersStore's queue happened to hold (every non-delivered/
// non-cancelled order ever, no date scoping at all), which is why "Orders
// today" and "Today's earning" never actually meant "today." Real IST
// calendar-day boundaries here, same fixed-offset math weeklyPayouts.ts's
// own previousWeekRange already established for its own weekly boundary.
//
// ordersToday/pendingToday are scoped by placed_at (today's real order
// volume, and how many of those still need action) — earningToday is
// scoped by delivered_at instead, and only ever includes orders that
// actually reached 'delivered': a cancelled order never gets there at
// all, and neither does one whose payment is still pending, so this
// can't double-count a sale that never happened or later got refunded.
// The figure itself is net of commission (item_total - commission_amount),
// the same real money the store actually keeps — matching exactly what
// accumulates into GET /partner/payouts, not the gross customer-paid
// total (which includes the platform's own cut and the delivery fee,
// neither of which the store ever receives).
partnerRouter.get('/stats/today', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { start, end } = todayIstRange();

    const { data: placedToday, error: placedErr } = await supabase
      .from('orders')
      .select('status')
      .eq('store_id', storeId)
      .gte('placed_at', start.toISOString())
      .lt('placed_at', end.toISOString());
    if (placedErr) throw placedErr;

    const ordersToday = placedToday?.length ?? 0;
    const pendingToday = (placedToday ?? []).filter((o) =>
      ['placed', 'packed', 'out_for_delivery'].includes(o.status),
    ).length;

    const { data: deliveredToday, error: deliveredErr } = await supabase
      .from('orders')
      .select('item_total, commission_amount')
      .eq('store_id', storeId)
      .eq('status', 'delivered')
      .gte('delivered_at', start.toISOString())
      .lt('delivered_at', end.toISOString());
    if (deliveredErr) throw deliveredErr;

    const earningToday = round2((deliveredToday ?? []).reduce((sum, o) => sum + (o.item_total - o.commission_amount), 0));

    res.json({ ordersToday, pendingToday, earningToday });
  } catch (err) {
    next(err);
  }
});

partnerRouter.get('/orders', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const page = readPage(req, `partner-orders:${storeId}:${req.query.view ?? "history"}`);
    let query = supabase.from('orders')
      .select('id, order_number, status, total, item_total, commission_amount, provider_payment_id, placed_at, packed_at, delivered_at, order_items(id, product_id, quantity, unit_price_at_order, unit_at_order, products(name, unit, image_url)), users!customer_id(name, phone), addresses(line1, landmark, recipient_name)')
      .eq('store_id', storeId);
    let queueFilter: string | undefined;
    if (req.query.view === 'queue') {
      const midnight = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30').toISOString();
      queueFilter = `status.in.(placed,packed,out_for_delivery),and(status.eq.failed,placed_at.gte.${midnight}),delivered_at.gte.${midnight}`;
    }
    if (page.cursor) queueFilter = queueFilter ? `and(or(${queueFilter}),or(${cursorFilter('placed_at', page.cursor)}))` : cursorFilter('placed_at', page.cursor);
    if (queueFilter) query = query.or(queueFilter);
    const { data, error } = await query.order('placed_at', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;
    sendPage(res, data ?? [], page, 'placed_at');
  } catch (err) {
    next(err);
  }
});

// Store-owner read of every review left for their own store (RLS
// reviews_store_owner_read, migration 020) — the customer app already
// writes these (POST /reviews); this is the partner-side counterpart the
// store owner sees. owner_reply/owner_replied_at (migration 053) let the
// owner respond — written only via PATCH below, never here.
partnerRouter.get('/reviews', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const page = readPage(req, `partner-reviews:${storeId}`);
    let query = supabase
      .from('reviews')
      .select('id, rating, comment, created_at, owner_reply, owner_replied_at, users!customer_id(name), orders!order_id(order_number)')
      .eq('store_id', storeId)
;
    if (page.cursor) query = query.or(cursorFilter('created_at', page.cursor));
    const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;
    sendPage(res, data ?? [], page, 'created_at');
  } catch (err) {
    next(err);
  }
});

// Owner reply to one review. Reply-only allowlist (never rating/comment —
// those are the customer's) and the .eq('store_id', storeId) on the UPDATE
// itself scopes it to the caller's own store, so an owner can't reply to
// another store's review even by guessing an id. Empty/blank body clears
// the reply (owner_replied_at follows).
partnerRouter.patch('/reviews/:id', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { reply } = req.body as { reply?: string };
    const trimmed = typeof reply === 'string' ? reply.trim() : '';
    if (trimmed.length > 1000) throw new AppError(400, 'REPLY_TOO_LONG', 'Reply must be 1000 characters or fewer.');
    const clearing = trimmed.length === 0;
    const { data, error } = await supabase
      .from('reviews')
      .update({
        owner_reply: clearing ? null : trimmed,
        owner_replied_at: clearing ? null : new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('store_id', storeId)
      .select('id, rating, comment, created_at, owner_reply, owner_replied_at, users!customer_id(name), orders!order_id(order_number)')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Product photo upload — base64 in, public R2 URL out. Same
// bucket/pattern as admin's own upload route (apps/admin/src/app/api/
// upload — 'product-images'), so a photo uploaded from either app renders
// identically wherever products.image_url is read. Re-encoded to webp
// (utils/image.ts's toWebp) before it ever reaches R2 — same
// normalization admin's own upload route does, so every product photo is
// webp regardless of which app uploaded it or what format the source
// camera/gallery photo was in.
partnerRouter.post('/product-photo', async (req: AuthedRequest, res, next) => {
  try {
    const { base64 } = req.body as { base64?: string };
    if (!base64) throw new AppError(400, 'MISSING_FIELDS', 'base64 is required.');

    const storeId = await ownStoreId(req.user!.id);
    const webpBuffer = await toWebp(decodeImage(base64));
    const asset = await storePublicImage({ folder: 'products', bytes: webpBuffer, scope: storeId, uploadedBy: req.user!.id });
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
});

partnerRouter.get('/products', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { data, error } = await supabase.from('products').select('*, product_variants(*)').eq('store_id', storeId);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

partnerRouter.post('/products', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    // storeId always comes from the caller's own store, never req.body —
    // a store owner can only ever create a product for themselves, even if
    // the request body carries a different storeId.
    const input: Partial<ProductInput> = { ...req.body, storeId };
    validateProductInput(input);

    // A store owner's own product never goes live on its own — see this
    // router's own note at the top and backend/src/routes/stores.ts's
    // customer-facing feeds, every one of which filters to 'approved'
    // only. Admin's own POST /api/products (apps/admin) sets 'approved'
    // instead, since a founder adding a product for a store is already the
    // approval.
    const productId = await saveCatalogueProduct({
      productId: null,
      storeScope: storeId,
      fields: { ...toProductRow(input), approval_status: 'pending' },
      variants: toVariantPayload(input.variants, input.stockQuantity),
    });
    const { data, error: refetchError } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', productId)
      .single();
    if (refetchError) throw refetchError;

    res.status(201).json(data);
  } catch (err) {
    next(asValidationError(err));
  }
});

partnerRouter.patch('/products/:id', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    // A true partial update: only fields present in the body are written,
    // so a partner edit never erases admin-set metadata (local_name,
    // description, freshness_tag, is_veg) the partner app doesn't send.
    // storeId is never taken from the body — the RPC scopes to this store.
    const input: unknown = req.body;
    validateProductPatch(input);
    const fields: Record<string, unknown> = { ...toProductPatchRow(input) };

    if (input.imageUrl !== undefined) {
      // scoped by store_id so a store owner cannot read another store's
      // product even with a guessed product id
      const { data: current, error: fetchError } = await supabase
        .from('products')
        .select('image_url, approval_status')
        .eq('id', req.params.id)
        .eq('store_id', storeId)
        .single();
      if (fetchError || !current) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Not found for this store.');
      // An approved product is LIVE — a new photo can't overwrite image_url
      // without admin consent, so it's queued in pending_image_url instead
      // (see resolveEditImage). Name and pack prices are gated the same way
      // inside save_catalogue_product (migration 115).
      Object.assign(fields, resolveEditImage(current.image_url, current.approval_status, input.imageUrl));
    }

    const productId = await saveCatalogueProduct({
      productId: String(req.params.id),
      storeScope: storeId,
      fields,
      variants: input.variants ? toVariantPayload(input.variants, input.stockQuantity) : null,
    });
    const { data, error: refetchError } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', productId)
      .single();
    if (refetchError) throw refetchError;

    res.json(data);
  } catch (err) {
    next(asValidationError(err));
  }
});

partnerRouter.delete('/products/:id', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    // scoped by store_id, same guard as PATCH above — a store owner cannot
    // delete another store's product even with a guessed product id.
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id)
      .eq('store_id', storeId)
      .select('id')
      .maybeSingle();
    if (error) {
      // order_items.product_id has no cascade/set-null (confdeltype 'a' —
      // restrict), deliberately: unit_price_at_order is denormalized so a
      // past order's own record never changes, but that only holds if the
      // product row it points to still exists. A product that's ever been
      // ordered can't be hard-deleted without losing that history — the
      // real fix is marking it out of stock instead, not deleting it.
      if (error.code === '23503') {
        throw new AppError(409, 'PRODUCT_HAS_ORDERS', 'This product has past orders and can’t be deleted — mark it out of stock instead.');
      }
      throw error;
    }
    if (!data) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Not found for this store.');

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

partnerRouter.get('/payouts', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const page = readPage(req, `partner-payouts:${storeId}`, 'date');
    let query = supabase.from('payouts').select('id, store_id, week_start, week_end, gross_amount, commission_deducted, net_payout, status, paid_at, utr, payment_mode').eq('store_id', storeId);
    if (page.cursor) query = query.or(cursorFilter('week_start', page.cursor));
    const { data, error } = await query.order('week_start', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (error) throw error;

    // One bounded RPC replaces one network count request per payout.
    const { data: counts, error: countError } = await supabase.rpc('partner_payout_counts', { p_store: storeId, p_ids: (data ?? []).map(p => p.id) });
    if (countError) throw countError;
    const byId = new Map((counts ?? []).map((row: { id: string; order_count: number }) => [row.id, Number(row.order_count)]));
    // utr/paymentMode/paidAt per PAYOUTS.md (snake_case originals kept for older app builds).
    const withOrderCounts = (data ?? []).map(payout => ({ ...payout, order_count: byId.get(payout.id) ?? 0, paymentMode: payout.payment_mode, paidAt: payout.paid_at }));

    sendPage(res, withOrderCounts, page, 'week_start');
  } catch (err) {
    next(err);
  }
});

// Real order-by-order commission breakdown for one settlement — every
// figure on payouts (gross_amount/commission_deducted/net_payout) is
// jobs/weeklyPayouts.ts's own SUM across exactly the delivered orders in
// that store's week_start..week_end window; this re-runs the same real
// query scoped to those same bounds instead of ever inventing a synthetic
// split (data.ts's own former buildOrderLines placeholder divided the
// total evenly across a fake order count — never what an owner actually
// earned per order). Scoped to the caller's own store via ownStoreId, and
// the payout row itself must also belong to that store — a store owner
// guessing another store's payout id gets a 404, not someone else's
// commission breakdown.
partnerRouter.get('/payouts/:id/orders', async (req: AuthedRequest, res, next) => {
  try {
    const storeId = await ownStoreId(req.user!.id);
    const { data: payout, error: payoutErr } = await supabase
      .from('payouts')
      .select('id, store_id, week_start, week_end, net_payout')
      .eq('id', req.params.id)
      .eq('store_id', storeId)
      .single();
    if (payoutErr || !payout) throw new AppError(404, 'PAYOUT_NOT_FOUND', 'No payout with that id for this store.');

    // week_start/week_end are IST calendar dates (plain `date` columns,
    // weeklyPayouts.ts's own note) — delivered_at is a real timestamptz,
    // so the end bound must be exclusive of the NEXT day's start, not a
    // same-day upper bound that would silently drop that day's own
    // deliveries.
    const page = readPage(req, `payout-orders:${storeId}:${payout.id}`);
    let query = supabase
      .from('orders')
      .select('id, order_number, item_total, commission_amount, delivered_at')
      .eq('store_id', storeId)
      .eq('status', 'delivered')
      .gte('delivered_at', `${payout.week_start}T00:00:00+05:30`)
      .lt('delivered_at', `${payout.week_end}T00:00:00+05:30`)
;
    if (page.cursor) query = query.or(cursorFilter('delivered_at', page.cursor));
    const { data: orders, error: ordersErr } = await query.order('delivered_at', { ascending: false }).order('id', { ascending: false }).limit(page.limit + 1);
    if (ordersErr) throw ordersErr;

    const { data: counts, error: countError } = await supabase.rpc('partner_payout_counts', { p_store: storeId, p_ids: [payout.id] });
    if (countError) throw countError;
    sendPage(res, (orders ?? []).map(o => ({
      id: o.id, orderNumber: o.order_number, deliveredAt: o.delivered_at,
      grossAmount: o.item_total, commissionAmount: o.commission_amount,
      netAmount: o.item_total - o.commission_amount,
    })), page, 'deliveredAt', { summary: { netTotal: Number(payout.net_payout), orderCount: Number(counts?.[0]?.order_count ?? 0) } });

  } catch (err) {
    next(err);
  }
});
