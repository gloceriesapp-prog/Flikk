import type { Request } from 'express';
import { supabase } from '../db/supabase.js';
import { readPage } from '../lib/cursorPagination.js';
import { AppError } from '../lib/errors.js';

export const PARTNER_PRODUCT_SELECT = 'id,name,local_name,description,is_veg,freshness_tag,category,unit,price,original_price,is_in_stock,stock_status,image_url,approval_status,pending_changes,pending_image_url,stock_quantity,stock_tracking_enabled,product_variants(id,unit_type,quantity,price,original_price,is_default,stock_quantity)';
export function cataloguePage(req: Pick<Request, 'query'>, storeId: string) {
  if (req.query.q !== undefined && typeof req.query.q !== 'string') throw new AppError(400, 'INVALID_SEARCH', 'Enter one search term.');
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (search.length > 100) throw new AppError(400, 'INVALID_SEARCH', 'Search must be at most 100 characters.');
  const stock = req.query.stock ?? 'all';
  if (typeof stock !== 'string' || !['all', 'in_stock', 'out_of_stock', 'pending', 'low_stock'].includes(stock)) throw new AppError(400, 'INVALID_STOCK_FILTER', 'Invalid stock filter.');
  const page = readPage(req, `partner-products:${storeId}:${search}:${stock}`, 'uuid');
  return { search, stock, page };
}
export function catalogueSearchPattern(search: string) {
  return `%${search.replace(/[\\%_]/g, '\\$&')}%`;
}
export function catalogueSearchFilter(search: string) {
  // PostgREST quoted values isolate commas/parentheses; backslashes and quotes
  // must be escaped again after LIKE wildcard escaping.
  const value = catalogueSearchPattern(search).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `name.ilike."${value}",category.ilike."${value}"`;
}
// Coalesce only currently running reads. No stale private data cache and no
// invalidation race after product edits. Identity is resolved before this call.
const running = new Map<string, ReturnType<typeof queryCatalogue>>();
async function queryCatalogue(storeId: string, selection: ReturnType<typeof cataloguePage>) {
  const { page, search, stock } = selection;
  let query = supabase.from('products').select(PARTNER_PRODUCT_SELECT).eq('store_id', storeId);
  if (search) query = query.or(catalogueSearchFilter(search));
  if (stock === 'low_stock') query = query.eq('stock_tracking_enabled', true).neq('stock_status', 'out_of_stock').gt('stock_quantity', 0).lt('stock_quantity', 5);
  if (stock === 'pending') query = query.eq('approval_status', 'pending');
  if (stock === 'out_of_stock') query = query.eq('stock_status', 'out_of_stock');
  if (stock === 'in_stock') query = query.neq('stock_status', 'out_of_stock');
  if (page.cursor) query = query.lt('id', page.cursor.id);
  const { data, error } = await query.order('id', { ascending: false }).limit(page.limit + 1);
  if (error) throw error;
  return data ?? [];
}
export async function readCatalogue(storeId: string, selection: ReturnType<typeof cataloguePage>) {
  const key = JSON.stringify([storeId, selection.search, selection.stock, selection.page.limit, selection.page.cursor?.id]);
  const existing = running.get(key);
  if (existing) return existing;
  const promise = queryCatalogue(storeId, selection);
  // Bound the registry independently of concurrent unique search terms.
  if (running.size >= 512) return promise;
  running.set(key, promise);
  try { return await promise; } finally { if (running.get(key) === promise) running.delete(key); }
}
