import { createHash } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

// Explicit merchant DTO: delivery proof, provider details and customer financial
// metadata never leave this endpoint. Purchased pack/name/image are snapshots.
export const PARTNER_ORDER_SELECT = 'id, order_number, status, total, item_total, commission_amount, payment_method, provider_payment_id, placed_at, store_visible_at, accepted_at, acceptance_deadline_at, preparation_deadline_at, packed_at, delivered_at, order_items(id, product_id, quantity, unit_price_at_order, unit_at_order, product_name_at_order, product_image_at_order, products(name, unit, image_url)), users!customer_id(name, phone), addresses(line1, landmark, recipient_name)';
export const actionablePartnerOrders = 'payment_method.eq.cod,provider_payment_id.not.is.null';

export function partnerOrderError(error: { code?: string; message?: string }): Error | typeof error {
  if (error.code === 'P0404') return new AppError(404, 'ORDER_NOT_FOUND', 'Order not found for this store.');
  if (error.code === 'P0403') return new AppError(403, 'STORE_ACCESS_DENIED', 'You no longer have access to this store.');
  if (error.code === 'P0409') {
    if (error.message?.includes('PAYMENT_PENDING')) return new AppError(409, 'PAYMENT_PENDING', 'Wait for verified payment before accepting this order.');
    if (error.message?.includes('ACCEPTANCE_EXPIRED')) return new AppError(409, 'ACCEPTANCE_EXPIRED', 'The acceptance window has ended. Refresh the order.');
    return new AppError(409, 'ORDER_CHANGED', 'The order changed. Refresh before retrying.');
  }
  return error;
}

// The operational queue excludes terminal states; historical/problem orders
// are independently paginated. Keep this filter identical in detail and digest reads.
export const ACTIVE_PARTNER_FILTER = 'placed,packed,out_for_delivery';
const digests = new Map<string, Promise<{ version: string; hasMore: boolean }>>();
export async function readPartnerQueueDigest(storeId: string) {
  const existing = digests.get(storeId);
  if (existing) return existing;
  const promise = (async () => {
    const { data, error } = await supabase.from('orders')
      .select('id,status,accepted_at,packed_at,store_visible_at,acceptance_deadline_at,preparation_deadline_at')
      .eq('store_id', storeId).or(actionablePartnerOrders).eq('checkout_payment_rejected', false)
      .or(`status.in.(${ACTIVE_PARTNER_FILTER})`).order('placed_at', { ascending: false })
      .order('id', { ascending: false }).limit(101);
    if (error) throw error;
    return { version: createHash('sha256').update(JSON.stringify(data ?? [])).digest('hex'), hasMore: (data?.length ?? 0) > 100 };
  })();
  if (digests.size >= 512) return promise;
  digests.set(storeId, promise);
  try { return await promise; } finally { if (digests.get(storeId) === promise) digests.delete(storeId); }
}
