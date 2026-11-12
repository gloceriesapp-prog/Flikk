import type { Request } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { browsePage, optionalUuid } from './browse.js';

// Disjoint tiers keep pagination stable without random padding or guessing a
// brand from the product name. All identity comes from the saved source item.
export async function similarProductPage(query: Request['query'], stores: string[], fields: string) {
  const requestedStore = optionalUuid(query.storeId);
  if (requestedStore) stores = stores.filter(id => id === requestedStore);
  const sourceId = optionalUuid(query.exclude);
  if (!sourceId) throw new AppError(400, 'MISSING_PRODUCT', 'Choose a product first.');
  if (!stores.length) return { products: [], nextCursor: null };
  const { data: source, error: sourceError } = await supabase.from('products')
    .select('id, category, brand_id, sub_category_id').eq('id', sourceId)
    .eq('approval_status', 'approved').in('store_id', stores).maybeSingle();
  if (sourceError) throw sourceError;
  if (!source) return { products: [], nextCursor: null };
  const page = browsePage(query, ['similar-v2', sourceId, source.category, source.brand_id, source.sub_category_id, [...stores].sort()]);
  if (page.after && (!Number.isInteger(page.after.score) || page.after.score < 0 || page.after.score > 2)) {
    throw new AppError(400, 'INVALID_CURSOR', 'Refresh this product list.');
  }
  const results: { id: string; score: number; row: Record<string, unknown> }[] = [];
  for (const tier of [0, 1, 2]) {
    if (tier < (page.after?.score ?? 0) || (tier === 0 && !source.brand_id) || (tier === 1 && !source.sub_category_id)) continue;
    let request = supabase.from('products').select(fields)
      .eq('approval_status', 'approved').eq('preorder_enabled', false)
      .in('store_id', stores).eq('category', source.category).neq('id', sourceId)
      .eq('is_in_stock', true).neq('stock_status', 'out_of_stock')
      .not('image_url', 'is', null).order('id').limit(page.limit + 1 - results.length);
    if (tier === 0) request = request.eq('brand_id', source.brand_id);
    else if (source.brand_id) request = request.or(`brand_id.is.null,brand_id.neq.${source.brand_id}`);
    if (tier === 1) request = request.eq('sub_category_id', source.sub_category_id);
    if (tier === 2 && source.sub_category_id) request = request.or(`sub_category_id.is.null,sub_category_id.neq.${source.sub_category_id}`);
    if (page.after?.score === tier) request = request.gt('id', page.after.id);
    const { data, error } = await request;
    if (error) throw error;
    for (const row of (data ?? []) as unknown as { id: string }[]) results.push({ id: row.id, score: tier, row: row as Record<string, unknown> });
    if (results.length > page.limit) break;
  }
  const visible = results.slice(0, page.limit);
  return { products: visible.map((item) => item.row), nextCursor: results.length > page.limit ? page.cursor(visible[visible.length - 1]!) : null };
}
