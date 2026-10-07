import { deliveryStores } from '../customer-experience/browse.js';
import { publicStore } from '../stores/publicStore.js';
// Customer-facing browse/catalog. Source: specs/01-customer-app/api.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { nearbyStores, readCoordinates } from '../discovery/nearbyStores.js';

export const storesRouter = Router();
// Cross-store assortment is scoped once; missing pins yield no products.
storesRouter.use(async (req, res, next) => {
  try {
    if (req.method === 'GET' && req.path.startsWith('/products/')) res.locals.deliveryStores = await deliveryStores(req.query);
    next();
  } catch (error) { next(error); }
});


const NEAREST_DEFAULT_LIMIT = 5;
const NEAREST_MAX_LIMIT = 20;
// Business rule, not a UI preference: a store more than this many km from a
// customer's delivery location isn't "nearest," it's out of the launch
// zone's real delivery reach. Applied as a hard cutoff in GET /stores/nearest
// below (filtered out entirely, not just ranked last) — every "nearest
// store" consumer in the customer app (Home's "Shops Near You" row,
// useNearestStore.ts's own single-store resolution, useDealsProducts/
// useSpotlightCards which both scope to that same resolved store) goes
// through this one endpoint, so the cutoff is enforced exactly once here
// rather than re-checked by every caller. Overridable via `max_distance_km`
// (bounded to MAX_ALLOWED_DISTANCE_KM) for ops/testing — never wider than
// what the business actually delivers to.
// Fallback delivery reach for a store with no delivery_radius_km of its own
// (migration 048). 12km = deliberately wide startup reach (maximize coverage
// with one launch store). A store can override this per-row from admin's
// StoreDetailForm. MAX_ALLOWED_DISTANCE_KM is the hard ceiling any explicit
// ops/testing override is clamped to.
const MAX_ALLOWED_DISTANCE_KM = 50;

// Shared by every cross-store product feed below — store name/active flag
// (so a deactivated store's stock can be filtered out) plus the full
// per-size variant list, same shape apps/admin's own Inventory writes via
// backend/src/lib/products.ts. fssai_number/address_line/city/district/
// photo_url ride along too — ProductDetailSheet's own seller row and
// seller-details card (apps/customer/src/components/ProductDetailSheet/
// ProductDetailInfo.tsx, SellerDetailsCard.tsx) need them and they're
// already real columns on stores (apps/admin's Store onboarding form, see
// storeValidation.ts; photo_url specifically comes from admin's
// ProductImageUpload with bucket="store-images"), not invented for this feed.
// Exported — routes/orders.ts's own GET /orders/buy-it-again reuses this
// exact shape (same stores/product_variants embed) so a repeat-purchase
// product and a fresh-catalog product map through the identical
// mapApiProduct() on the client, not two subtly different row shapes.
export const PRODUCT_WITH_VARIANTS_SELECT =
  '*, stores!inner(name, is_active, open_time, close_time, fssai_number, address_line, city, district, photo_url), product_variants(*)';

// Every one of this file's customer-facing feeds also filters
// .eq('approval_status', 'approved')
// Product submissions remain pending until approved by an admin.
// (routes/partner.ts POST /products) starts 'pending' and only a founder's
// approval in admin (apps/admin's Inventory) flips it, same gate store
// onboarding already has. Admin's own product adds insert 'approved'
// directly, so they show up here immediately.

// Same default zone as browse routes, including when no nearby shop exists.
// Cached by the /stores middleware; no database lookup per SSE connection.
storesRouter.get('/inventory-scope', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('zones').select('id').eq('is_active', true).limit(1);
    if (error) throw error;
    res.json({ zoneIds: (data ?? []).map(zone => zone.id) });
  } catch (error) { next(error); }
});

storesRouter.get('/', async (req, res, next) => {
  try {
    if (req.query.lat === undefined && req.query.lng === undefined) return res.json([]);
    const { lat, lng, zoneId } = readCoordinates(req.query);
    const rows = await nearbyStores(lat, lng, zoneId, 20, null);
    res.json(rows.map(publicStore));
  } catch (err) {
    next(err);
  }
});

// Database spatial candidates + exact spherical ranking, including closed
// stores. Delivery radius filters happen before LIMIT; unavailable coverage
// is an empty list, never an unbounded application-side fallback.
storesRouter.get('/nearest', async (req, res, next) => {
  try {
    const { lat, lng, zoneId } = readCoordinates(req.query);

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(1, Math.trunc(requestedLimit)), NEAREST_MAX_LIMIT)
      : NEAREST_DEFAULT_LIMIT;

    const requestedMaxDistanceKm = Number(req.query.max_distance_km);
    const maxOverrideKm = Number.isFinite(requestedMaxDistanceKm)
      ? Math.min(Math.max(0.1, requestedMaxDistanceKm), MAX_ALLOWED_DISTANCE_KM)
      : null;

    const ranked = await nearbyStores(lat, lng, zoneId, limit, maxOverrideKm);

    res.json(ranked);
  } catch (err) {
    next(err);
  }
});

// Public serviceability check (no auth) — landing's Navbar/LocationModal badge
// (apps/landing) and any pre-signup "do we deliver here?" gate. Same reach
// logic as /nearest: serviceable iff ≥1 store in the active zone is within its
// delivery radius of the given coords. Returns just the boolean + nearest
// distance, never store rows (this is unauthenticated). Out-of-area visitors
// get captured via POST /area-upvotes for demand.
storesRouter.get('/serviceability', async (req, res, next) => {
  try {
    const { lat, lng, zoneId } = readCoordinates(req.query);

    const inRange = await nearbyStores(lat, lng, zoneId, 1, null);

    res.json({
      serviceable: inRange.length > 0,
      nearestDistanceKm: inRange.length > 0 ? Number(inRange[0]!.distance_km.toFixed(2)) : null,
    });
  } catch (err) {
    next(err);
  }
});

// Cross-store "deals" feed — Home's own "Today's Steal Deals" section
// (apps/customer/src/screens/home/sections). Mounted before /:id/products
// so Express doesn't treat "products" as a store id. Single zone at launch
// (CLAUDE.md), so no zone_id filter — every active store is already in the
// one zone that exists. Only products with a real discount (original_price
// set and above price, same convention lib/products.ts's toProductRow
// already enforces on write). Closed-shop and sold-out listings remain
// browseable; cards and authoritative checkout enforce orderability.
storesRouter.get('/products/deals', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('approval_status', 'approved')
      .in('store_id', res.locals.deliveryStores ?? [])
      .not('original_price', 'is', null)
      .order('name')
      .limit(12);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Cross-store general catalog — Home's "Today's Stock" row
// (EverydayEssentialsSection.tsx). Same shape as /products/deals but no
// discount requirement. products has no created_at column (only
// product_variants/stores/zones do), so this orders by name rather than
// claiming a "newest first" ordering it can't actually back.
storesRouter.get('/products/catalog', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('approval_status', 'approved')
      .in('store_id', res.locals.deliveryStores ?? [])
      .order('name')
      .limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// "You may also like" — ProductDetailSheet's own SimilarProductsRow (and
// the sheet's own peek-pager, which needs at least one result to show the
// swipeable "next/prev card" UI at all). Same category, active store, not
// out of stock, excluding the product the sheet is already open on.
// category/exclude come from the client's own already-fetched Product (it
// just came from one of the feeds above, which already carry category), so
// this doesn't need a product lookup first.
//
// storeId (optional) enables a fallback: real catalogs are thin enough
// right now that "same category, any store" often comes back empty, which
// silently disabled the whole peek-pager for that product (not a bug — the
// code always required pages.length > 1, there was just nothing to fill it
// with). Falling back to "anything else this SAME store sells" instead of
// giving up is honest (it's a real product from the exact store the
// customer is already shopping) and, since a store selling a single
// product is essentially never the case, means the peek-pager has
// something to show for virtually every real product.
storesRouter.get('/products/similar', async (req, res, next) => {
  try {
    const category = req.query.category as string | undefined;
    const excludeId = req.query.exclude as string | undefined;
    const storeId = req.query.storeId as string | undefined;
    if (!category) throw new AppError(400, 'MISSING_CATEGORY', 'category query param is required.');

    let query = supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('approval_status', 'approved')
      .in('store_id', res.locals.deliveryStores ?? [])
      .eq('category', category)
      .order('name')
      .limit(4);
    if (excludeId) query = query.neq('id', excludeId);

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      res.json(data);
      return;
    }

    if (!storeId) {
      res.json([]);
      return;
    }

    let fallbackQuery = supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('approval_status', 'approved')
      .in('store_id', res.locals.deliveryStores ?? [])
      .eq('store_id', storeId)
      .order('name')
      .limit(4);
    if (excludeId) fallbackQuery = fallbackQuery.neq('id', excludeId);

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;
    res.json(fallbackData);
  } catch (err) {
    next(err);
  }
});

// One store's own catalog — StoreDetailScreen.tsx (apps/customer). A
// product only ever belongs to the one store_id it was created under
// (admin's Inventory screen, per-store — apps/admin/src/app/(dashboard)/
// inventory), so this is the single source of truth for "what does this
// store sell": no cross-store mixing, no fallback to another store's
// products. Same shape/select as /products/deals and /products/catalog so
// api/products.ts's mapApiProduct works unchanged here too.
// ?deals=true narrows to this store's own currently-discounted items —
// Home's "Today's Steal Deals" (useDealsProducts.ts) used to hit
// /products/deals above (every store, pooled) regardless of which store
// the customer would actually order from; scoping it to one store's own
// catalog is what makes "add to cart" mean something (single-store-per-
// order, CLAUDE.md) instead of showing items the customer's nearest store
// doesn't even carry. Same original_price-set filter /products/deals
// already uses, just additionally scoped to one store_id.
storesRouter.get('/:id/products', async (req, res, next) => {
  try {
    const dealsOnly = req.query.deals === 'true';
    let query = supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('approval_status', 'approved')
      .eq('store_id', req.params.id)
      ;
    if (dealsOnly) query = query.not('original_price', 'is', null);

    // Legacy array contract is bounded; full browsing uses the paged route.
    const rawLimit = req.query.limit;
    if (rawLimit !== undefined && (typeof rawLimit !== 'string' || !/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 60))
      throw new AppError(400, 'INVALID_PAGE', 'Page size must be between 1 and 60.');
    const { data, error } = await query.order('id').limit(rawLimit === undefined ? 30 : Number(rawLimit));
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
