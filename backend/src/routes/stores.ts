// Customer-facing browse/catalog. Source: specs/01-customer-app/api.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export const storesRouter = Router();

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
storesRouter.get('/:id/products', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .eq('store_id', req.params.id)
      .neq('stock_status', 'out_of_stock')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
