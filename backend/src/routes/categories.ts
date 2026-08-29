// Customer-facing category browse — real rows a founder manages via
// admin's own Categories screen (apps/admin/src/app/(dashboard)/categories),
// not the static CATEGORY_SECTIONS mock apps/customer used to render.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
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
categoriesRouter.get('/:id/subcategories', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('sub_categories')
      .select('id, name, image_url, sort_order')
      .eq('category_id', req.params.id)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    res.json(data);
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
        '*, stores!inner(name, is_active, fssai_number, address_line, city, district, photo_url), product_variants(*), sub_categories!inner(category_id)',
      )
      .eq('sub_categories.category_id', req.params.id)
      .eq('stores.is_active', true)
      .eq('approval_status', 'approved')
      .neq('stock_status', 'out_of_stock')
      .order('name');
    if (error) throw error;
    res.json(data);
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
      .select('*, stores!inner(name, is_active, fssai_number, address_line, city, district, photo_url), product_variants(*)')
      .eq('sub_category_id', req.params.id)
      .eq('stores.is_active', true)
      .eq('approval_status', 'approved')
      .neq('stock_status', 'out_of_stock')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
