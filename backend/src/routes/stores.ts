// Customer-facing browse/catalog. Source: specs/01-customer-app/api.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { distanceKm } from '../utils/geo.js';

export const storesRouter = Router();

const NEAREST_DEFAULT_LIMIT = 5;
const NEAREST_MAX_LIMIT = 20;

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
const PRODUCT_WITH_VARIANTS_SELECT =
  '*, stores!inner(name, is_active, fssai_number, address_line, city, district, photo_url), product_variants(*)';

// Every one of this file's customer-facing feeds also filters
// .eq('approval_status', 'approved') — a store owner's own product
// (routes/partner.ts POST /products) starts 'pending' and only a founder's
// approval in admin (apps/admin's Inventory) flips it, same gate store
// onboarding already has. Admin's own product adds insert 'approved'
// directly, so they show up here immediately.

storesRouter.get('/', async (req, res, next) => {
  try {
    // zone_id is optional — single zone at launch (CLAUDE.md), so a caller
    // that doesn't know one yet (e.g. Home's own "Shops Near You" row,
    // which has no zone-picking UI to source it from) falls back to
    // whichever zone is currently active instead of being required to pass
    // an id it has no way to have. admin's own POST /api/stores resolves
    // zone_id server-side the same way, for the same reason.
    let zoneId = req.query.zone_id as string | undefined;
    if (!zoneId) {
      const { data: zone, error: zoneError } = await supabase.from('zones').select('id').eq('is_active', true).limit(1).single();
      if (zoneError) throw zoneError;
      zoneId = zone.id;
    }
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Nearest store(s) to a customer's saved delivery location — Home's
// "Shops Near You" row and useNearestStore.ts's own single-store
// resolution (apps/customer/src/screens/home). Computed server-side, not
// on-device: the client sends its own lat/lng, this ranks every store in
// the zone by real haversine distance and returns the closest `limit` of
// them, each with a distance_km the client just formats (formatDistance,
// geocoding.ts) — it never receives every store's raw coordinates to sort
// itself. That's the whole point of doing it here: swapping this for
// something smarter later (a real delivery-radius cutoff, actual routing
// distance instead of straight-line) is a change to this one function, not
// an app update. Mounted before /:id/products so Express doesn't try to
// treat "nearest" as a store id, same convention /products/deals and
// /products/catalog below already establish.
//
// Deliberately NOT filtered to is_active (a store's own real-time open/
// closed toggle — apps/partner/src/store/useStoreProfileStore.ts PATCHes
// it instantly when an owner flips it) — an earlier version of this route
// did filter on it, which silently substituted a farther OPEN store
// whenever the true nearest one happened to be closed, with nothing in the
// response explaining why "nearest" jumped. The customer app now shows the
// genuinely nearest store either way, with its real is_active/open_time/
// close_time (already in the `select('*')` below) so the UI can render a
// "Closed · opens at 9:00 AM" state and still let someone browse — same
// pattern Blinkit/Zepto use, no dead end when everything's closed for the
// night, no unexplained substitution.
//
// Stores with no lat/lng on file (migrations/005_stores_lat_lng.sql — any
// store approved before it, until backfilled via admin's StoreDetailForm)
// are excluded outright rather than sorted to the end — a customer asking
// "what's nearest me" wants a real ranked answer, not an unranked store
// mixed into a "nearest" list with no actual distance behind it. They still
// show up fine in the plain GET / list above.
storesRouter.get('/nearest', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new AppError(400, 'MISSING_COORDINATES', 'lat and lng query params are required.');
    }

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(1, Math.trunc(requestedLimit)), NEAREST_MAX_LIMIT)
      : NEAREST_DEFAULT_LIMIT;

    let zoneId = req.query.zone_id as string | undefined;
    if (!zoneId) {
      const { data: zone, error: zoneError } = await supabase.from('zones').select('id').eq('is_active', true).limit(1).single();
      if (zoneError) throw zoneError;
      zoneId = zone.id;
    }

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('zone_id', zoneId)
      .not('lat', 'is', null)
      .not('lng', 'is', null);
    if (error) throw error;

    const customer = { latitude: lat, longitude: lng };
    const ranked = data
      .map((store) => ({ ...store, distance_km: distanceKm(customer, { latitude: store.lat, longitude: store.lng }) }))
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit);

    res.json(ranked);
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
// already enforces on write) and not out of stock — a "deal" that's sold
// out or isn't actually discounted doesn't belong on this shelf.
storesRouter.get('/products/deals', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('approval_status', 'approved')
      .eq('stores.is_active', true)
      .neq('stock_status', 'out_of_stock')
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
      .eq('stores.is_active', true)
      .neq('stock_status', 'out_of_stock')
      .order('name')
      .limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Cross-store product search — SearchScreen.tsx (apps/customer), the one
// screen in this app that previously had a text input whose value went
// nowhere. `q` is a plain substring match on name (ILIKE), not a real
// search engine (ranking, typo tolerance, multi-word AND/OR) — the
// product catalog is small enough at this scale that a straightforward
// substring scan is genuinely enough, same "no premature complexity"
// judgment call as every other feed in this file. `%`/`_` are ILIKE
// wildcards themselves — escaped so a query containing them is matched
// literally instead of accidentally behaving like a broader pattern than
// the customer typed.
storesRouter.get('/products/search', async (req, res, next) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q || q.length < 2) return res.json([]);

    const escaped = q.replace(/[%_]/g, (match) => `\\${match}`);
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('approval_status', 'approved')
      .eq('stores.is_active', true)
      .neq('stock_status', 'out_of_stock')
      .ilike('name', `%${escaped}%`)
      .order('name')
      .limit(30);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// "You may also like" — ProductDetailSheet's own SimilarProductsRow.
// Same category, active store, not out of stock, excluding the product the
// sheet is already open on. category/exclude come from the client's own
// already-fetched Product (it just came from one of the feeds above, which
// already carry category), so this doesn't need a product lookup first.
storesRouter.get('/products/similar', async (req, res, next) => {
  try {
    const category = req.query.category as string | undefined;
    const excludeId = req.query.exclude as string | undefined;
    if (!category) throw new AppError(400, 'MISSING_CATEGORY', 'category query param is required.');

    let query = supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('approval_status', 'approved')
      .eq('stores.is_active', true)
      .eq('category', category)
      .neq('stock_status', 'out_of_stock')
      .order('name')
      .limit(4);
    if (excludeId) query = query.neq('id', excludeId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
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
      .neq('stock_status', 'out_of_stock');
    if (dealsOnly) query = query.not('original_price', 'is', null);

    const { data, error } = await query.order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
