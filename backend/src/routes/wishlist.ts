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
import { cursorFilter, encodeCursor, readPage } from '../lib/cursorPagination.js';
import { PRODUCT_WITH_VARIANTS_SELECT } from './stores.js';

export const wishlistRouter = Router();

// Same product+variant+store select every browse feed uses (stock, approval,
// store hours, variants), so mapApiProduct marks unavailable items correctly.
// Unapproved products are filtered out; pages are keyset on (created_at,id).
const WISHLIST_PRODUCT_SELECT = `id, product_id, created_at, products!inner(${PRODUCT_WITH_VARIANTS_SELECT})`;
const WISHLIST_ID_LIMIT = 1000;

wishlistRouter.get('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const page = readPage(req, `wishlist:${req.user!.id}`);
    let query = supabase
      .from('wishlist_items')
      .select(WISHLIST_PRODUCT_SELECT)
      .eq('customer_id', req.user!.id)
      .eq('products.approval_status', 'approved');
    if (page.cursor) query = query.or(cursorFilter('created_at', page.cursor));
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(page.limit + 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as { id: string; created_at: string }[];
    const items = rows.slice(0, page.limit); const last = items.at(-1);
    res.json({ items, nextCursor: rows.length > page.limit && last ? encodeCursor(page, { at: last.created_at, id: last.id }) : null });
  } catch (err) {
    next(err);
  }
});

// Heart state across the app needs membership, not full rows. Bounded.
wishlistRouter.get('/ids', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('product_id')
      .eq('customer_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(WISHLIST_ID_LIMIT);
    if (error) throw error;
    res.json((data ?? []).map(row => row.product_id));
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
