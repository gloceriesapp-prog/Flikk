import { Router, type Request } from 'express';
import { validateContent, type ContentSelection, type HomeContentKey } from '../../../packages/home-content/index.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { PRODUCT_WITH_VARIANTS_SELECT } from '../routes/stores.js';
import { browsePage, hydrateBrowse } from '../customer-experience/browse.js';

export const collectionRouter = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface BrowseRule { selection: ContentSelection; base?: ContentSelection; limit: number }
export function pageSize(value: unknown, fallback = 30): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 60)
    throw new AppError(400, 'INVALID_PAGE', 'Page size must be between 1 and 60.');
  return Number(value);
}
async function contentFor(tab: unknown) {
  if (!['grocery', 'fresh', 'regional'].includes(String(tab))) throw new AppError(400, 'INVALID_TAB', 'Invalid collection tab.');
  const { data, error } = await supabase.from('home_content').select('content').eq('tab_key', tab as HomeContentKey).single();
  if (error) throw error;
  const content = validateContent(data.content);
  if (!content.enabled) throw new AppError(404, 'COLLECTION_UNAVAILABLE', 'This collection is unavailable.');
  return content;
}
async function products(storeId: string, rules: BrowseRule[], after: string | null, preview: boolean, pageLimit = 60) {
  if (!rules.length) return { products: [], nextCursor: null };
  const { data: ids, error } = await supabase.rpc('browse_collection_ids', { p_store_id: storeId, p_rules: rules, p_after: after, p_preview: preview });
  if (error) throw error; // Never fall back to downloading the entire catalogue.
  const selected: { id: string }[] = (ids ?? []).slice(0, preview ? 600 : pageLimit);
  const hydrated = [];
  // Bound PostgREST URL length as well as returned rows. At most six small
  // hydration reads, sequential to avoid multiplying pool pressure.
  for (let offset = 0; offset < selected.length; offset += 100) {
    const { data, error: hydrateError } = await supabase.from('products').select(PRODUCT_WITH_VARIANTS_SELECT)
      .in('id', selected.slice(offset, offset + 100).map(row => row.id)).eq('store_id', storeId)
      .eq('approval_status', 'approved').order('id');
    if (hydrateError) throw hydrateError;
    hydrated.push(...(data ?? []));
  }
  return { products: hydrated, nextCursor: !preview && (ids?.length ?? 0) > pageLimit ? selected.at(-1)?.id ?? null : null };
}

collectionRouter.get('/:id/home-preview', async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id!)) throw new AppError(400, 'INVALID_STORE', 'Invalid store.');
    const content = await contentFor(req.query.tab);
    const rules: BrowseRule[] = [];
    for (const section of content.sections.filter(s => s.enabled)) {
      if (['products', 'hero', 'stores'].includes(section.kind)) rules.push({ selection: section.selection, limit: section.kind === 'stores' ? 3 : section.limit });
      for (const item of section.items.filter(i => i.enabled)) rules.push({ selection: item.selection, limit: 1 });
    }
    // Config is bounded by validation. A single RPC selects only requested
    // previews; no application scan over a shop's unbounded product rows.
    res.json((await products(req.params.id!, rules, null, true)).products);
  } catch (error) { next(error); }
});
collectionRouter.get('/:id/collection-products', async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id!)) throw new AppError(400, 'INVALID_STORE', 'Invalid store.');
    const limit = pageSize(req.query.limit);
    const after = req.query.after === undefined ? null : String(req.query.after);
    if (after && !UUID.test(after)) throw new AppError(400, 'INVALID_CURSOR', 'Invalid page cursor.');
    const content = await contentFor(req.query.tab);
    const section = content.sections.find(s => s.enabled && s.id === req.query.section);
    const item = section?.items.find(i => i.enabled && i.id === req.query.item);
    if (!section || (req.query.item !== undefined && !item)) throw new AppError(404, 'COLLECTION_UNAVAILABLE', 'This collection is unavailable.');
    const enabledItems = section.items.filter(i => i.enabled);
    const selections = item ? [item.selection] : enabledItems.length ? enabledItems.map(i => i.selection) : [section.selection];
    const rules = selections.map(selection => ({ selection, base: section.selection, limit: limit + 1 }));
    res.json(await products(req.params.id!, rules, after, false, limit));
  } catch (error) { next(error); }
});

// Full store catalogue: filters and price sort run in SQL over the whole
// catalogue, keyset-paged on (score,id) — never an offset or loaded-page filter.
const STORE_SORTS = ['relevance', 'price_low', 'price_high'] as const;
const PRICE_BANDS = ['all', 'under_100', '100_300', 'above_300'] as const;
export function storePageFilters(query: Request['query']) {
  const category = query.category === undefined || query.category === '' ? null : query.category;
  const sort = query.sort ?? 'relevance'; const price = query.price ?? 'all';
  if ((category !== null && (typeof category !== 'string' || category.length > 100))
    || !STORE_SORTS.includes(sort as typeof STORE_SORTS[number]) || !PRICE_BANDS.includes(price as typeof PRICE_BANDS[number]))
    throw new AppError(400, 'INVALID_FILTER', 'Invalid product filter.');
  return { category: category as string | null, veg: query.veg === '1', deals: query.deals === '1', price: price as string, sort: sort as string };
}
collectionRouter.get('/:id/products-page', async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id!)) throw new AppError(400, 'INVALID_STORE', 'Invalid store.');
    const filters = storePageFilters(req.query);
    const page = browsePage(req.query, ['store-page', req.params.id, filters]);
    const { data, error } = await supabase.rpc('store_product_page_ids', {
      p_store: req.params.id, p_category: filters.category, p_veg: filters.veg, p_deals: filters.deals,
      p_price_band: filters.price, p_sort: filters.sort, p_after_score: page.after?.score ?? null,
      p_after_id: page.after?.id ?? null, p_limit: page.limit + 1,
    });
    if (error) throw error; // No fallback to an unfiltered catalogue read.
    const rows = (data ?? []) as { id: string; score: number }[]; const selected = rows.slice(0, page.limit);
    res.json({ products: await hydrateBrowse(selected, [req.params.id!], PRODUCT_WITH_VARIANTS_SELECT),
      nextCursor: rows.length > page.limit ? page.cursor(selected.at(-1)!) : null });
  } catch (error) { next(error); }
});

// Sidebar categories for a store: one bounded aggregate (<=100 rows).
collectionRouter.get('/:id/category-facets', async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id!)) throw new AppError(400, 'INVALID_STORE', 'Invalid store.');
    const { data, error } = await supabase.rpc('store_category_facets', { p_store: req.params.id });
    if (error) throw error;
    res.json(((data ?? []) as { category: string; product_count: number; image_url: string | null }[])
      .map(row => ({ category: row.category, productCount: Number(row.product_count), imageUrl: row.image_url })));
  } catch (error) { next(error); }
});
