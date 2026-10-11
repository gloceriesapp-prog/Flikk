import { receiptItems } from '../customer-experience/receipt.js';
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
import { encodeCursor, readPage } from '../lib/cursorPagination.js';
export const customerHistoryRouter = Router();
// trips!orders_trip_id_fkey: orders and trips are linked both ways (orders.trip_id
// and trips.cancel_origin_order_id, migration 109), so an unnamed trips(...)
// embed is ambiguous (PostgREST PGRST201) and the whole query fails.
export const HISTORY_SELECT = 'id, order_number, store_id, status, total, placed_at, packed_at, picked_up_at, delivered_at, trip_id, estimated_delivery_minutes, estimated_delivery_at, live_revision, order_items(product_id, quantity, unit_price_at_order, unit_at_order, product_name_at_order, product_image_at_order, products(name, image_url)), stores(name, avg_prep_minutes), trips!orders_trip_id_fkey(total, delivery_fee)';
function timestamp(value: unknown) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new AppError(400, 'INVALID_FILTER', 'Invalid history date filter.');
  return value;
}
customerHistoryRouter.get('/history', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const status = req.query.status === undefined || req.query.status === 'all' ? null : req.query.status;
    if (status !== null && (typeof status !== 'string' || !['placed','packed','out_for_delivery','delivered','cancelled','failed'].includes(status)))
      throw new AppError(400, 'INVALID_FILTER', 'Invalid order status.');
    const search = req.query.q ?? '';
    if (typeof search !== 'string' || search.length > 100) throw new AppError(400, 'INVALID_FILTER', 'Search must be at most 100 characters.');
    const from = timestamp(req.query.from); const until = timestamp(req.query.until);
    if (from && until && Date.parse(from) >= Date.parse(until)) throw new AppError(400, 'INVALID_FILTER', 'Invalid history date range.');
    const page = readPage(req, `history:${req.user!.id}:${status}:${from}:${until}:${search.trim()}`);
    if (page.cursor && typeof page.cursor.kind !== 'boolean') throw new AppError(400, 'INVALID_CURSOR', 'Refresh this purchase list.');
    const { data, error } = await supabase.rpc('customer_purchase_page', {
      p_customer: req.user!.id, p_limit: page.limit + 1, p_before_at: page.cursor?.at ?? null,
      p_before_id: page.cursor?.id ?? null, p_before_trip: page.cursor?.kind ?? null,
      p_status: status, p_from: from, p_until: until, p_search: search.trim(),
    });
    if (error) throw error;
    const heads = (data ?? []) as { entity_id: string; placed_at: string; is_trip: boolean }[];
    const selected = heads.slice(0, page.limit);
    const orders = [];
    // Avoid an excessively long PostgREST filter for large requested pages.
    for (let offset = 0; offset < selected.length; offset += 20) {
      const batch = selected.slice(offset, offset + 20);
      const filter = batch.map(h => `${h.is_trip ? 'trip_id' : 'id'}.eq.${h.entity_id}`).join(',');
      const { data: legs, error: legError } = await supabase.from('orders').select(HISTORY_SELECT)
        .eq('customer_id', req.user!.id).or(filter).order('placed_at', { ascending: false }).order('id', { ascending: false });
      if (legError) throw legError;
      orders.push(...(legs ?? []).map(leg => ({ ...leg, order_items: receiptItems(leg.order_items) })));
    }
    const last = selected.at(-1);
    res.set('Cache-Control', 'private, no-store');
    res.json({ items: orders, nextCursor: heads.length > page.limit && last
      ? encodeCursor(page, { at: last.placed_at, id: last.entity_id, kind: last.is_trip }) : null });
  } catch (error) { next(error); }
});

customerHistoryRouter.get('/history-status', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const value = req.query.ids;
    const ids = typeof value === 'string' ? value.split(',') : [];
    if (!ids.length || ids.length > 100 || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))
      throw new AppError(400, 'INVALID_ORDERS', 'Choose up to 100 valid orders.');
    const { data, error } = await supabase.from('orders')
      .select('id, status, placed_at, packed_at, picked_up_at, delivered_at, estimated_delivery_minutes, estimated_delivery_at, live_revision')
      .eq('customer_id', req.user!.id).in('id', [...new Set(ids)]);
    if (error) throw error;
    res.set('Cache-Control', 'private, no-store'); res.json(data ?? []);
  } catch (error) { next(error); }
});
