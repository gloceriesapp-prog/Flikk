// Real cleanup for an abandoned online payment — a customer who backs out
// of the UPI app (or a Standard Checkout sheet) mid-payment leaves a real
// `orders` row sitting in 'placed' forever, with no rider ever assigned
// and no store ever notified it's actually dead. Run every few minutes
// (wired via node-cron in index.ts, same pattern jobs/weeklyPayouts.ts
// already establishes), not once a day — a customer re-trying checkout
// soon after abandoning one attempt shouldn't have to wait for a stale
// row from minutes ago to still exist.
//
// The payment_method column (migrations/034_order_payment_method.sql) is
// what makes this safe at all: without it, `razorpay_payment_id is null`
// alone can't tell a genuinely abandoned online payment apart from a
// perfectly normal Cash-on-Delivery order still waiting for the store to
// pack it — this job would otherwise auto-cancel real, paying-in-cash
// customers' orders. Only `payment_method = 'online'` rows are ever
// touched here.
//
// Only 'placed' (not 'packed') is eligible — once a store owner has
// actually packed it, they've already committed real time/inventory to
// it; a customer whose payment never went through has no way to have
// reached 'packed' in the first place (the store never sees an unpaid
// order as anything other than a normal new order to pack, since payment
// state isn't part of what a store owner's own screen shows), so in
// practice this only ever matches rows still sitting untouched at
// 'placed'. Scoping to 'placed' explicitly rather than "not delivered"
// keeps that assumption enforced in code, not just true by accident.
//
// No refund attempt here — refundPayment.ts only ever fires for an order
// that actually has a real razorpay_payment_id (a payment that succeeded);
// by definition every row this job cancels has none, so refund_status
// correctly stays 'none' (nothing was ever charged).
import { supabase } from '../db/supabase.js';
import { logger } from '../lib/logger.js';
import { sendPushNotification } from '../lib/pushNotifications.js';

const STALE_AFTER_MINUTES = 20;

export async function expireUnpaidOrders(): Promise<{ cancelled: number }> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString();

  const { data: staleOrders, error: selectErr } = await supabase
    .from('orders')
    .select('id, customer_id')
    .eq('status', 'placed')
    .eq('payment_method', 'online')
    .is('razorpay_payment_id', null)
    .lt('placed_at', cutoff);
  if (selectErr) throw selectErr;
  if (!staleOrders || staleOrders.length === 0) return { cancelled: 0 };

  const ids = staleOrders.map((o) => o.id);
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'cancelled', cancel_reason: 'Payment was not completed in time.' })
    .in('id', ids);
  if (updateErr) throw updateErr;

  // Same real push routes/orders.ts's own PATCH /:id/status sends for a
  // human-initiated cancel — this job bypasses that route entirely (a
  // direct table update, no caller/role to check), so it has to fire its
  // own copy of the same notification rather than the customer finding
  // out only by reopening the app. Best-effort per row, same as
  // everywhere else this app sends a push — never blocks the cancellation
  // itself.
  const customerIds = [...new Set(staleOrders.map((o) => o.customer_id))];
  const { data: customers } = await supabase.from('users').select('id, expo_push_token').in('id', customerIds);
  const tokenByCustomerId = new Map((customers ?? []).map((c) => [c.id, c.expo_push_token]));
  for (const order of staleOrders) {
    void sendPushNotification(
      tokenByCustomerId.get(order.customer_id),
      'Order cancelled',
      "We didn't receive your payment in time, so this order was cancelled. No amount was charged.",
    );
  }

  logger.info({ orderIds: ids }, `[expireUnpaidOrders] cancelled ${ids.length} stale unpaid order(s)`);
  return { cancelled: ids.length };
}
