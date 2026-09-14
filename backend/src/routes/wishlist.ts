// Real account-backed wishlist (migrations/021_wishlist.sql's own note —
// replaces apps/customer's local-device-only useWishlistStore). Deliberately
// thin: three endpoints, no separate "toggle" — the app already knows
// whether a product is wishlisted from GET /wishlist's own list, so it
// calls POST to add or DELETE to remove rather than a single ambiguous
// toggle endpoint the server would have to guess the prior state for.

import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const wishlistRouter = Router();

// Same product+variant+store shape routes/stores.ts's own product feeds
// return (ApiProduct on the customer app side) — lets apps/customer map a
// wishlist row through the exact same mapApiProduct() every other product
// feed already uses instead of inventing a second, thinner Product shape
// just for this screen.
const WISHLIST_PRODUCT_SELECT =
  'product_id, created_at, products(id, name, local_name, category, description, price, original_price, image_url, bg_color, is_veg, freshness_tag, store_id, product_variants(*), stores(name, fssai_number, address_line, city, photo_url))';

wishlistRouter.get('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select(WISHLIST_PRODUCT_SELECT)
      .eq('customer_id', req.user!.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

wishlistRouter.post('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { product_id } = req.body as { product_id?: string };
    if (!product_id) throw new AppError(400, 'INVALID_REQUEST', 'product_id is required.');

    // Idempotent add — wishlist_items has a unique (customer_id,
    // product_id) constraint (021_wishlist.sql); upsert with ignoreDuplicates
    // means a double-tap "add" never 500s, it just no-ops on the second call.
    const { error } = await supabase
      .from('wishlist_items')
      .upsert({ customer_id: req.user!.id, product_id }, { onConflict: 'customer_id,product_id', ignoreDuplicates: true });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

wishlistRouter.delete('/:productId', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('customer_id', req.user!.id)
      .eq('product_id', req.params.productId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
