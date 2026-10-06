import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { PRODUCT_WITH_VARIANTS_SELECT } from '../routes/stores.js';
import { browsePage, deliveryStores, hydrateBrowse, optionalUuid } from './browse.js';
export const productBrowseRouter = Router();
productBrowseRouter.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q;
    if (typeof q !== 'string' || q.trim().length < 2 || q.length > 100) throw new AppError(400, 'INVALID_SEARCH', 'Search must have 2–100 characters.');
    const stores = await deliveryStores(req.query);
    const page = browsePage(req.query, ['search', q.trim(), stores]);
    const { data, error } = stores.length ? await supabase.rpc('search_customer_product_ids', {
      p_stores: stores, p_query: q.trim(), p_after_score: page.after?.score ?? null, p_after_id: page.after?.id ?? null, p_limit: page.limit + 1,
    }) : { data: [], error: null };
    if (error) throw error;
    const rows = (data ?? []) as { id: string; score: number }[];
    const selected = rows.slice(0, page.limit);
    res.json({ products: await hydrateBrowse(selected, stores, PRODUCT_WITH_VARIANTS_SELECT), nextCursor: rows.length > page.limit ? page.cursor(selected.at(-1)!) : null });
  } catch (error) { next(error); }
});
productBrowseRouter.get('/popular', async (req, res, next) => {
  try {
    const stores = await deliveryStores(req.query);
    const { data, error } = stores.length ? await supabase.rpc('popular_customer_product_ids', { p_stores: stores, p_days: 7 }) : { data: [], error: null };
    if (error) throw error;
    res.json(await hydrateBrowse(data ?? [], stores, PRODUCT_WITH_VARIANTS_SELECT));
  } catch (error) { next(error); }
});
productBrowseRouter.get('/category', async (req, res, next) => {
  try {
    const category = optionalUuid(req.query.category); const subcategory = optionalUuid(req.query.subcategory);
    if (!category && !subcategory) throw new AppError(400, 'INVALID_CATEGORY', 'Choose a category.');
    const type = req.query.type ?? ''; const brand = req.query.brand ?? ''; const sort = req.query.sort ?? 'recommended';
    if (typeof type !== 'string' || type.length > 100 || typeof brand !== 'string' || brand.length > 100 || !['recommended','price-low','price-high','discount'].includes(String(sort)))
      throw new AppError(400, 'INVALID_FILTER', 'Invalid product filter.');
    const stores = await deliveryStores(req.query);
    const veg = req.query.veg === '1'; const deals = req.query.deals === '1';
    const page = browsePage(req.query, ['category', category, subcategory, type, brand, sort, veg, deals, stores]);
    const [{ data, error }, facets] = stores.length ? await Promise.all([
      supabase.rpc('browse_customer_product_ids', { p_stores: stores, p_category: category, p_subcategory: subcategory, p_type: type, p_brand: brand,
        p_veg: veg, p_deals: deals, p_sort: sort, p_after_score: page.after?.score ?? null, p_after_id: page.after?.id ?? null, p_limit: page.limit + 1 }),
      supabase.rpc('customer_category_facets', { p_stores: stores, p_category: category, p_subcategory: subcategory }),
    ]) : [{ data: [], error: null }, { data: { types: [], brands: [] }, error: null }];
    if (error || facets.error) throw error || facets.error;
    const rows = (data ?? []) as { id: string; score: number }[]; const selected = rows.slice(0, page.limit);
    res.json({ products: await hydrateBrowse(selected, stores, PRODUCT_WITH_VARIANTS_SELECT), facets: facets.data,
      nextCursor: rows.length > page.limit ? page.cursor(selected.at(-1)!) : null });
  } catch (error) { next(error); }
});
