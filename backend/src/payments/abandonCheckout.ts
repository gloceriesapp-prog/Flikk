// POST /payments/abandon — the customer backed out of the UPI app (or never
// paid) and chooses to cancel the checkout or switch it to cash on delivery.
//
// Order of operations is what makes this safe:
// 1. Terminate the Cashfree order (best effort) so no new payment can land,
//    then read the provider. A SUCCESS payment is SETTLED instead (the
//    customer already paid — never cancel or flip that to COD).
// 2. abandon_unpaid_checkout (migration 101) re-checks "still awaiting payment"
//    under the same row locks settlement takes, then cancels or switches.
// 3. A capture landing after step 1 is settled by webhook/reconciliation:
//    against a cancelled checkout it is refunded (080 trigger / trip queue),
//    against a COD switch it is refunded without touching the order (101).
// COD has no eligibility rules beyond the checkout itself (it is always
// offered — see GET /payments/availability), so none are re-checked here.
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { cashfreeOrderId, paymentsConfigured, terminateCfOrder } from './cashfreeClient.js';
import { paymentTarget, recoverProviderOrder, reconcileProvider } from './recovery.js';
import { notifyStoresOfNewOrder } from './newOrderPush.js';
import { assertPaymentMethodAvailable } from './availability.js';

export type AbandonAction = 'cancel' | 'cod';
const REASON = 'Customer cancelled unpaid checkout.';

export async function abandonCheckout(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const action = req.body?.action as unknown;
    if (action !== 'cancel' && action !== 'cod') throw new AppError(400, 'INVALID_ABANDON_ACTION', 'Choose cancel or cash on delivery.');
    const target = paymentTarget({ orderId: req.body?.orderId, tripId: req.body?.tripId });
    // Switching an unpaid checkout to cash obeys the admin COD switch too.
    if (action === 'cod') await assertPaymentMethodAvailable('cod');
    const customerId = req.user!.id;
    const { data: record, error } = await supabase.from(target.table).select('id,total,provider_payment_id')
      .eq('id', target.id).eq('customer_id', customerId).maybeSingle();
    if (error) throw new AppError(503, 'PAYMENT_RECOVERY_UNAVAILABLE', 'Payment recovery is unavailable. Please try again shortly.');
    if (!record) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

    if (!record.provider_payment_id) {
      const { data: session, error: sessionError } = await supabase.from('checkout_payment_sessions').select('provider_order_id')
        .eq('kind', target.kind).eq('target_id', target.id).maybeSingle();
      if (sessionError) throw new AppError(503, 'PAYMENT_RECOVERY_UNAVAILABLE', 'Payment recovery is unavailable. Please try again shortly.');
      // Without keys no provider order can exist (create-order is gated), so
      // there is nothing to reconcile; a session row means keys were removed.
      if (paymentsConfigured || session) {
        const providerId = session?.provider_order_id ?? (await recoverProviderOrder(target, Number(record.total)))?.order_id;
        if (providerId) {
          if (providerId === cashfreeOrderId(target.id)) await terminateCfOrder(providerId);
          const state = await reconcileProvider(target, providerId, Number(record.total), false);
          if (state === 'paid') throw new AppError(409, 'PAYMENT_CAPTURED', 'Your payment went through. Open your order.');
          // 'cancelled': the capture was rejected and is refunding; fall through
          // so the RPC reports the checkout as no longer awaiting payment.
        }
      }
    }

    const { error: rpcError } = await supabase.rpc('abandon_unpaid_checkout', {
      p_customer_id: customerId, p_kind: target.kind, p_target_id: target.id, p_action: action, p_reason: REASON,
    });
    if (rpcError?.code === 'P0404') throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    if (rpcError?.code === 'P0410') throw new AppError(409, 'CHECKOUT_NOT_AWAITING_PAYMENT', 'This checkout is already paid, cancelled or expired. Check your order status.');
    if (rpcError?.code === 'P0411') throw new AppError(409, 'CHECKOUT_WINDOW_CLOSED', 'This checkout has closed. Review your cart to order again.');
    if (rpcError) throw new AppError(503, 'CHECKOUT_UNAVAILABLE', 'Could not update this checkout. Retry to check the outcome.');

    // An unpaid online order was never announced to the store; COD is payable
    // on delivery, so it is a real order from this moment.
    const ids = target.kind === 'trip' ? { tripId: target.id } : { orderId: target.id };
    if (action === 'cod') void notifyStoresOfNewOrder(ids);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ target: ids, state: action === 'cod' ? 'paid' : 'cancelled' });
  } catch (err) { next(err); }
}
