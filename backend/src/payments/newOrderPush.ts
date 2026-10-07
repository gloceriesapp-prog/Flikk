import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { sendPushNotification } from '../lib/pushNotifications.js';
import type { OrderIdBody } from './types.js';

// The one "New order received" push a store owner gets. Online checkouts
// call this from settleCheckoutPayment once the payment is recorded — an
// unpaid online order is not an order a store should start packing. COD
// is payable on delivery, so POST /orders and POST /trips call it at
// creation. Best-effort: a push failure never fails settlement/checkout.
export async function notifyStoresOfNewOrder(target: OrderIdBody): Promise<void> {
  try {
    const query = supabase.from('orders').select('id,store_id,total,item_total,trip_id');
    const { data: orders, error } = await (target.tripId ? query.eq('trip_id', target.tripId) : query.eq('id', target.orderId!));
    if (error) throw error;
    for (const order of orders ?? []) {
      const { data: store } = await supabase.from('stores').select('users!owner_user_id(expo_push_token)').eq('id', order.store_id).single();
      const owner = (store as { users?: { expo_push_token: string | null }[] } | null)?.users?.[0];
      // Trip legs show the store's own item total — the trip total includes other stores.
      void sendPushNotification(owner?.expo_push_token, 'New order received', order.trip_id
        ? `New order — ₹${order.item_total} — tap to view.`
        : `Order ${order.id.slice(0, 6).toUpperCase()} · ₹${order.total} — tap to view.`);
    }
  } catch (error) {
    logger.warn({ err: error, target }, 'New order push failed');
  }
}
