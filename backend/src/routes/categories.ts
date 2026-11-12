import { deliveryStores } from '../customer-experience/browse.js';
// Customer-facing category browse — real rows a founder manages via
// admin's own Categories screen (apps/admin/src/app/(dashboard)/categories),
// not the static CATEGORY_SECTIONS mock apps/customer used to render.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { applyCustomerPrices } from '../lib/customerPrice.js';
import { AppError } from '../lib/errors.js';

export const categoriesRouter = Router();

// Fetch one extra tile to determine whether the ten-brand preview needs See all.
categoriesRouter.get('/popular-brands', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('brands')
      .select('id, name, logo_url, popular_image_url')
      .eq('is_active', true)
      .not('popular_position', 'is', null)
      .order('popular_position')
      .limit(11);
    if (error) throw error;
    res.json((data ?? []).map(row => ({
      id: row.id,
      name: row.name,
      imageUrl: row.popular_image_url ?? row.logo_url,
    })));
  } catch (error) { next(error); }
});

// Keyset pagination keeps the directory bounded and preserves administrator order.
categoriesRouter.get('/popular-brands/all', async (req, res, next) => {
  try {
    const rawAfter = req.query.after;
    if (rawAfter !== undefined && (typeof rawAfter !== 'string' || !/^[1-9]\d{0,3}$/.test(rawAfter) || Number(rawAfter) > 1000)) {
      throw new AppError(400, 'INVALID_CURSOR', 'Invalid brand position.');
    }
    let query = supabase.from('brands')
      .select('id, name, logo_url, popular_image_url, popular_position')
      .eq('is_active', true).not('popular_position', 'is', null)
      .order('popular_position').limit(51);
    if (rawAfter !== undefined) query = query.gt('popular_position', Number(rawAfter));
    const { data, error } = await query;
    if (error) throw error;
    const rows = data ?? [];
    const selected = rows.slice(0, 50);
    const last = selected.at(-1);
    res.json({
      brands: selected.map(row => ({ id: row.id, name: row.name, imageUrl: row.popular_image_url ?? row.logo_url })),
      nextCursor: rows.length > 50 && last ? String(last.popular_position) : null,
    });
  } catch (error) { next(error); }
});

categoriesRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name').limit(60);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Sub-categories for one top category — CategoryDetailScreen's own sidebar
// (apps/customer/src/screens/category-detail/components/SubCategorySidebar.tsx).
// Real rows a founder manages via admin's own Categories screen (the same
// edit-category modal, not a separate page). image_url is optional — a
// sub-category with none falls back to the shared placeholder image on the
// client, same convention as every other optional photo in this app.
// Only sub-categories with at least one live product (approved, with a
// photo) are listed, so the catalogue's full sub-category list never shows
// empty sidebar entries. products!inner + a one-row limit on the join keeps
// it a single query that returns no product rows.
categoriesRouter.get('/:id/subcategories', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('sub_categories')
      .select('id, name, image_url, sort_order, products!inner(id)')
      .eq('category_id', req.params.id)
      .eq('is_active', true)
      .eq('products.approval_status', 'approved')
      .not('products.image_url', 'is', null)
      .limit(1, { referencedTable: 'products' })
      .order('sort_order')
      .order('name').limit(60);
    if (error) throw error;
    res.json((data ?? []).map(({ products: _products, ...sub }) => sub));
  } catch (err) {
    next(err);
  }
});

// All products under any of a category's real sub-categories — the "All"
// tab on CategoryDetailScreen's own sidebar. Joins through sub_categories
// (products has no direct category_id, only sub_category_id) via
// sub_categories!inner so the filter on its own category_id actually
// narrows the products query, not just the joined row shape.
categoriesRouter.get('/:id/products', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(
        '*, stores!inner(name, is_active, open_time, close_time, availability_override, availability_override_until, fssai_number, address_line, city, district, photo_url), product_variants(*), product_options(id, name, image_url, extra_image_urls, sort_order, is_available), sub_categories!inner(category_id)',
      )
      .eq('sub_categories.category_id', req.params.id)
      .eq('approval_status', 'approved').eq('preorder_enabled', false)
      .in('store_id', await deliveryStores(req.query))
      .order('name').limit(60);
    if (error) throw error;
    res.json(applyCustomerPrices(data));
  } catch (err) {
    next(err);
  }
});

// Products tagged to one real sub-category (products.sub_category_id — set
// from admin's own Add/Edit Product form, a founder picking "Show in
// category browse"). Independent of products.category (the free-text field
// on the product form, PRODUCT_CATEGORIES) — the two aren't unified yet,
// this is deliberately the smaller, non-breaking link rather than a bigger
// migration tying every product's category to the real categories table.
// Same shape as routes/stores.ts's own product feeds (variants + store
// join) — duplicated here rather than imported since each route file in
// this backend is self-contained, same convention as the rest of it.
categoriesRouter.get('/subcategories/:id/products', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, stores!inner(name, is_active, open_time, close_time, availability_override, availability_override_until, fssai_number, address_line, city, district, photo_url), product_variants(*), product_options(id, name, image_url, extra_image_urls, sort_order, is_available)')
      .eq('sub_category_id', req.params.id)
      .eq('approval_status', 'approved').eq('preorder_enabled', false)
      .in('store_id', await deliveryStores(req.query))
      .order('name').limit(60);
    if (error) throw error;
    res.json(applyCustomerPrices(data));
  } catch (err) {
    next(err);
  }
});
