import { logger } from '../lib/logger.js';
import { deliveryStores } from '../customer-experience/browse.js';
import { receiptItems, withReceiptAddress } from '../customer-experience/receipt.js';
import { HISTORY_SELECT } from '../history/customerHistory.js';
import { checkoutAttemptIdentity, findCheckoutAttempt, commitCheckoutAttempt } from '../lib/checkoutAttempts.js';
// The highest-risk endpoints in the backend. Source: specs/00-foundation/api-conventions.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { calcCommission, round2 } from '../lib/pricing.js';
import { getCommissionRate } from '../lib/platformSettings.js';
import { formatPayoutDateLabel, nextPayoutDate } from '../lib/payoutSchedule.js';
import { confirmCheckoutQuote } from '../lib/checkoutQuoteService.js';
import { rejectUnsupportedTip } from '../lib/checkoutQuote.js';
import { checkoutTransactionError } from '../lib/checkoutItems.js';
import type { CartItem } from '../lib/orderValidation.js';
import { resolveAddressId } from '../lib/resolveAddress.js';
import {
  canRoleTransition,
  isValidTransition,
  timestampColumnFor,
  type OrderStatus,
} from '../lib/orderStateMachine.js';
import { embeddedPushToken, sendPushNotification } from '../lib/pushNotifications.js';
import { notifyStoresOfNewOrder } from '../payments/newOrderPush.js';
import { customerDeliveryCodes, completeDelivery } from '../orders/deliveryCodes.js';
import { isRiderCancelReasonCode } from '../lib/cancelReasons.js';
import { isRiderDeliveryFailureReasonCode } from '../lib/deliveryFailureReasons.js';
import { PRODUCT_WITH_VARIANTS_SELECT } from './stores.js';
import { reorderByRank } from '../lib/buyItAgain.js';
import { triggerDispatch } from '../lib/riderDispatch.js';

export const ordersRouter = Router();
// Free-text cancel reasons (customer/partner) are shown to other parties.
export const MAX_CANCEL_REASON_LENGTH = 300;

interface CreateOrderBody {
  attempt_id: string;
  quote_token: string;
  store_id: string;
  // Checkout requires an owned, saved address with a valid map pin.
  address_id: string;
  items: CartItem[];
  // Optional cart-level coupon (lib/promos.ts) — re-validated here from
  // scratch even if the client already called POST /promos/validate; the
  // discount actually applied is never trusted from that earlier call.
  promo_code?: string;
  // 'cod' | 'online' — real distinction jobs/expireUnpaidOrders.ts needs
  // to tell a legitimate Cash-on-Delivery order apart from an abandoned
  // online-payment attempt (both look identical via provider_payment_id
  // alone: null either way). Defaults to 'cod' server-side (migration
  // 034's own default) if the client ever omits it.
  payment_method?: 'cod' | 'online';
}

// POST /orders — all-or-nothing: validate stock, lock prices, single-store only,
// create order + order_items in one transaction, payment is started separately (POST /payments/create-order).
// See specs/00-foundation/api-conventions.md.
ordersRouter.post('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as CreateOrderBody;
    if (!body.store_id || !body.address_id || !body.items?.length) {
      throw new AppError(400, 'INVALID_ORDER', 'store_id, a saved address_id, and items are required.');
    }

    if (body.payment_method != null && !['cod', 'online'].includes(body.payment_method)) throw new AppError(400, 'INVALID_PAYMENT_METHOD', 'Choose a valid payment method.');
    rejectUnsupportedTip(req.body);
    const identity = checkoutAttemptIdentity(req.body, 'order');
    const previous = await findCheckoutAttempt(req.user!.id, identity.id, identity.fingerprint);
    if (previous) { res.status(200).json(previous.result); return; }
    const quote = await confirmCheckoutQuote(body.items, req.user!.id, body.quote_token, body.promo_code, body.store_id, body.address_id);
    const pricedItems = quote.items;
    const { itemTotal, deliveryFee, discountAmount, handlingFee, total } = quote.bill;
    const promoCodeId = quote.promoCodeId;
    const commissionAmount = calcCommission(itemTotal, await getCommissionRate());
    const addressId = await resolveAddressId(req.user!.id, body);

    // Supabase JS has no multi-statement transaction API; this is executed as a
    // Postgres function (create_order) to keep order + order_items atomic.
    const { data: attempt, error: rpcErr } = await commitCheckoutAttempt(req.user!.id, identity, 'order', {
      p_customer_id: req.user!.id,
      p_store_id: body.store_id,
      p_address_id: addressId,
      p_item_total: itemTotal,
      p_delivery_fee: deliveryFee,
      p_commission_amount: commissionAmount,
      p_total: total,
      p_items: pricedItems,
      p_promo_code_id: promoCodeId,
      p_discount_amount: discountAmount,
      p_payment_method: body.payment_method ?? 'cod',
      p_handling_fee: handlingFee,
    });
    if (rpcErr) throw checkoutTransactionError(rpcErr.code);
    if (!attempt) throw new AppError(503, 'CHECKOUT_UNAVAILABLE', 'Please retry this checkout.');
    const created = attempt.result;
    if (attempt.replayed) { res.status(200).json(created); return; }

    // Keep preparation metadata for existing API consumers. Delivery ETA
    // comes from the immutable estimate attached by migration 061, not
    // preparation time. This lookup remains best-effort.
    const { data: store } = await supabase
      .from('stores')
      .select('avg_prep_minutes')
      .eq('id', body.store_id)
      .single();

    // COD is a real order from this moment, so the store hears now. An online
    // order is announced only once paid (settleCheckoutPayment) — never twice,
    // and never for a checkout the customer abandons.
    if ((body.payment_method ?? 'cod') === 'cod') void notifyStoresOfNewOrder({ orderId: created.id });

    // Cashfree payment initiated by the caller once the order id is known —
    // kept out of this handler to avoid a second external-service failure mode
    // inside the same transaction boundary. See specs/05-platform/payments.md.
    res.status(201).json({ ...created, avg_prep_minutes: store?.avg_prep_minutes ?? null });
  } catch (err) {
    next(err);
  }
});

// GET /orders — the caller's own order history (Purchase screen's Live
// Order / Past Orders split, apps/customer). Store-owner/rider have their
// own already-scoped equivalents (GET /partner/orders, GET /rider/
// assignments) — this one is customer-only on purpose, not a shared "list
// orders" endpoint, since what "mine" means differs per role.
ordersRouter.get('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      // trips(total, delivery_fee) — only non-null for a leg of a real
      // multi-store trip (orders.trip_id FK); PurchaseScreen groups these
      // by trip_id into one combined card and needs the trip's own real
      // combined total, not a sum of each leg's own total (which is
      // deliberately just item_total with delivery_fee=0 per leg —
      // migrations/015_create_trip_orders_fn.sql's own note — the real
      // combined charge lives only on trips.total).
      .select(HISTORY_SELECT)
      .eq('customer_id', req.user!.id)
      .order('placed_at', { ascending: false }).order('id', { ascending: false }).limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /orders/buy-it-again — Home's "Buy It Again" row (apps/customer's
// screens/home/buy-it-again/). Real repeat-purchase signal, not a
// recommendation: every product this customer has actually had delivered
// before, ranked by how many separate delivered orders included it (most
// repeat-bought first), ties broken by most recently ordered. Registered
// BEFORE GET /:id below — Express matches routes in declaration order, and
// :id would otherwise swallow this literal path as if "buy-it-again" were
// an order id.
//
// Renders an empty array for a brand-new customer with no delivered order
// yet — apps/customer's own useBuyItAgain hook treats that as "don't show
// this section" (same "no real data = section off" convention every other
// Home row already follows), never a placeholder product.
const BUY_IT_AGAIN_LIMIT = 10;

ordersRouter.get('/buy-it-again', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const storeIds = await deliveryStores(req.query);
    if (!storeIds.length) return res.json([]);
    const { data: candidates, error: candidateError } = await supabase.rpc('repeat_purchase_candidates', {
      p_customer: req.user!.id, p_stores: storeIds, p_limit: BUY_IT_AGAIN_LIMIT,
    });
    if (candidateError) throw candidateError;
    const rankedProductIds = ((candidates ?? []) as { product_id: string }[]).map(row => row.product_id);
    if (rankedProductIds.length === 0) return res.json([]);

    // Same real-catalog gates every other product feed applies (routes/
    // stores.ts's own note) — a product this customer bought before but
    // that's since gone out of stock, been unapproved, or had its store
    // deactivated has no business showing up as reorderable right now.
    const { data: products, error: productsErr } = await supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .in('id', rankedProductIds)
      .in('store_id', storeIds)
      .eq('is_in_stock', true)
      .eq('approval_status', 'approved')
      .eq('stores.is_active', true)
      .neq('stock_status', 'out_of_stock');
    if (productsErr) throw productsErr;

    res.json(reorderByRank(rankedProductIds, products ?? []));
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    // RLS (via a user-scoped client) is the real enforcement; service-role fetch
    // here is filtered defensively so a route bug can't leak cross-role data.
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url, unit)), stores(name, avg_prep_minutes), addresses(label, line1, landmark, recipient_name, recipient_phone)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw new AppError(503, 'TRACKING_UNAVAILABLE', 'Tracking is temporarily unavailable. Please retry.');
    if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

    const u = req.user!;
    const visible =
      u.role === 'admin' ||
      (u.role === 'customer' && data.customer_id === u.id) ||
      (u.role === 'rider' && data.rider_id === u.id) ||
      u.role === 'store_owner'; // further narrowed by store ownership check below
    if (!visible) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

    if (u.role === 'store_owner') {
      const { data: store } = await supabase.from('stores').select('id').eq('id', data.store_id).eq('owner_user_id', u.id).single();
      if (!store) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }

    // riders.user_id -> users.id, same FK orders.rider_id points at — no
    // direct orders->riders FK for PostgREST to auto-embed, so this is a
    // second real lookup, not a fabricated join. Only present once a rider
    // is actually assigned (out_for_delivery onward); TrackOrderScreen's
    // own rider card renders nothing without it, never a placeholder.
    // deliveries is a real count (every order this rider has ever actually
    // delivered, across every store/trip — riders has no such column of
    // its own) — DeliveryRiderCard.tsx used to show a hardcoded fabricated
    // number here regardless of which real rider was assigned; this is
    // what replaces it with the truth.
    let rider: { name: string; phone: string; deliveries: number } | null = null;
    if (data.rider_id) {
      const [{ data: riderRow }, { count: deliveries }] = await Promise.all([
        supabase.from('riders').select('name, phone').eq('user_id', data.rider_id).single(),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('rider_id', data.rider_id).eq('status', 'delivered'),
      ]);
      rider = riderRow ? { ...riderRow, deliveries: deliveries ?? 0 } : null;
    }

    const codes = u.role === 'customer' ? await customerDeliveryCodes(u.id,[data.id]) : new Map<string,string>();
    res.set('Cache-Control','private, no-store');
    res.json({ ...withReceiptAddress(data), order_items: receiptItems(data.order_items), delivery_otp: codes.get(data.id) ?? null, riders: rider });
  } catch (err) {
    next(err);
  }
});

interface StatusBody {
  status: OrderStatus;
  // Only meaningful (and only ever stored) alongside status: 'cancelled' —
  // apps/rider's CancelOrderModal and apps/partner's reject flow both
  // already collect a real reason from the person cancelling; this is
  // where it lands instead of being silently discarded.
  reason?: string;
  // Only meaningful (and only ever required) alongside status: 'delivered' —
  // the code the customer read off their own order, entered by the rider at
  // the door. Verified against the private delivery_codes record; the legacy column is
  // nulled so the code can't be reused (lib/deliveryOtp.ts).
  otp?: string;
}

// PATCH /orders/:id/status — state machine + role-ownership enforced here, not client-side.
// 'customer' added alongside the other three roles specifically for the
// cancelled transition — orderStateMachine.ts's own canRoleTransition
// still only allows a customer to reach 'cancelled', never any other
// status, so this doesn't open packed/out_for_delivery/delivered to them.
ordersRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('customer', 'store_owner', 'rider', 'admin'),
  requireApproved,
  async (req: AuthedRequest, res, next) => {
    try {
      const { status: to, reason, otp } = (req.body ?? {}) as StatusBody;
      if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > MAX_CANCEL_REASON_LENGTH)) {
        throw new AppError(400, 'INVALID_CANCEL_REASON', `Keep the reason under ${MAX_CANCEL_REASON_LENGTH} characters.`);
      }
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, status, store_id, rider_id, customer_id, trip_id, total, provider_payment_id, payment_method')
        .eq('id', req.params.id)
        .single();
      if (error || !order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

      if (to === 'packed' && order.payment_method === 'online' && !order.provider_payment_id) {
        throw new AppError(409, 'PAYMENT_PENDING', 'Wait for payment before packing this order.');
      }
      const from = order.status as OrderStatus;
      if (to === 'delivered' && from === 'delivered' && req.user!.role === 'rider' && order.rider_id === req.user!.id) {
        res.json(await completeDelivery(order.id, req.user!.id, otp));
        return;
      }
      if (!isValidTransition(from, to)) {
        throw new AppError(409, 'INVALID_TRANSITION', `Cannot move order from ${from} to ${to}.`);
      }
      if (!canRoleTransition(req.user!.role, to)) {
        throw new AppError(403, 'FORBIDDEN', `Role ${req.user!.role} cannot set status ${to}.`);
      }
      if (req.user!.role === 'store_owner') {
        const { data: store } = await supabase.from('stores').select('id').eq('id', order.store_id).eq('owner_user_id', req.user!.id).single();
        if (!store) throw new AppError(403, 'FORBIDDEN', 'Not your store.');
      }
      if (req.user!.role === 'rider' && order.rider_id !== req.user!.id) {
        throw new AppError(403, 'FORBIDDEN', 'Not your assignment.');
      }
      if (req.user!.role === 'customer' && order.customer_id !== req.user!.id) {
        throw new AppError(403, 'FORBIDDEN', 'Not your order.');
      }

      if (req.user!.role === 'customer' && order.trip_id && to === 'cancelled') {
        throw new AppError(409, 'TRIP_CANCELLATION_REQUIRED', 'Cancel this multi-shop order through its trip.');
      }
      const tsCol = timestampColumnFor(to);
      const update: Record<string, unknown> = { status: to };
      if (tsCol) update[tsCol] = new Date().toISOString();
      if (to === 'cancelled' && reason) {
        // A rider cancels only pre-pickup and only from CancelOrderModal's
        // fixed reason list, so their reason must be one of the known codes
        // (lib/cancelReasons.ts — mirror of @gloceries/shared). Scoped to riders
        // deliberately: partner-reject and customer-cancel reasons on this
        // same endpoint stay free text, so this check must not touch them.
        if (req.user!.role === 'rider' && !isRiderCancelReasonCode(reason)) {
          throw new AppError(400, 'INVALID_CANCEL_REASON', 'Unknown cancellation reason.');
        }
        update.cancel_reason = reason;
      }

      if (order.trip_id && to === 'cancelled') {
        // A shared payment must never be refunded as a gross individual leg.
        // Authorized merchants/riders/admin cancel the whole pre-pickup trip.
        const { data: outcome, error: cancelError } = await supabase.rpc('cancel_customer_trip', {
          p_trip_id: order.trip_id, p_customer_id: order.customer_id, p_reason: reason ?? 'Order cancelled',
        });
        if (cancelError) throw cancelError;
        if ((outcome as { outcome: string }).outcome !== 'cancelled') {
          throw new AppError(409, 'TRIP_CANCELLATION_BLOCKED', 'This trip can no longer be cancelled after pickup.');
        }
        const { data: cancelled, error: readError } = await supabase.from('orders').select().eq('id', order.id).single();
        if (readError) throw readError;
        res.json({ ...cancelled, delivery_otp: null });
        return;
      }

      if (to === 'failed') {
        // Post-pickup counterpart to cancel: a rider who's collected the
        // parcel but can't complete the drop (customer unreachable, wrong
        // address) marks the order failed. Reason is required and must be a
        // known code — same rider-scoped validation the cancel block above
        // applies, just against the drop-phase reason set. (Only a rider can
        // reach 'failed' at all — orderStateMachine's TRANSITION_OWNER — so the
        // role guard here is belt-and-suspenders, mirroring cancel for
        // consistency.)
        if (req.user!.role === 'rider' && !isRiderDeliveryFailureReasonCode(reason)) {
          throw new AppError(400, 'INVALID_FAILURE_REASON', 'Unknown delivery-failure reason.');
        }
        if (order.trip_id) {
          const { error: tripError } = await supabase.rpc('fail_assigned_trip', {
            p_trip: order.trip_id, p_rider: req.user!.id, p_reason: reason,
          });
          if (tripError) throw new AppError(409, 'TRIP_CHANGED', 'Refresh this trip before retrying.');
          const { data: failed, error: readError } = await supabase.from('orders').select().eq('id', order.id).single();
          if (readError) throw readError;
          res.json({ ...failed, delivery_otp: null });
          return;
        }
        // REUSE orders.cancel_reason — status ('failed' vs 'cancelled')
        // disambiguates which flow stored it, so no new column/migration is
        // needed for the reason itself (the status enum widening is migration
        // 052; that constraint change was unavoidable).
        update.cancel_reason = reason;
      }

      // Code verification, completion and its earning commit in one database
      // transaction. Other status writes have atomic financial DB triggers.
      let updated: Record<string, unknown>;
      if (to === 'delivered') {
        updated = await completeDelivery(order.id, req.user!.id, otp);
      } else {
        const { data: result, error: updateErr } = await supabase.from('orders').update(update)
          .eq('id', order.id).eq('status', from).select().maybeSingle();
        if (updateErr) throw updateErr;
        if (!result) throw new AppError(409, 'ORDER_CHANGED', 'The order changed. Refresh before retrying.');
        updated = result;
      }
      // delivery_otp on orders is permanently null; only customer-owned reads
      // may project a code from the private delivery_codes table.
      updated.delivery_otp = null;

      // Real automated dispatch — fires the moment a store packs an order,
      // never blocks this response (fire-and-forget, same convention this
      // handler's own push-notification call below already uses).
      // lib/riderDispatch.ts's own note has the full broadcast + atomic-
      // accept-wins design.
      if (to === 'packed') {
        void triggerDispatch({ id: String(updated.id), store_id: String(updated.store_id) }).catch((err) =>
          logger.error({ err, orderId: updated.id }, 'Rider dispatch failed'),
        );
      }

      if (to === 'delivered') {
        // Real earning-transparency push — the store's revenue is never
        // written to any ledger before this exact moment (weeklyPayouts.ts's
        // own computeWeeklyPayouts scopes strictly to delivered orders, not
        // accepted/packed ones), so 'delivered' is the one truthful point
        // to tell the owner "you earned this." Tells them the real amount
        // AND the real next settlement date up front — the two things a
        // store owner actually needs to not wonder "where did my money go"
        // when it doesn't show up in Payouts immediately.
        const netEarned = round2(Number(updated.item_total) - Number(updated.commission_amount));
        const { data: storeRow } = await supabase
          .from('stores')
          .select('users!owner_user_id(expo_push_token)')
          .eq('id', order.store_id)
          .single();
        void sendPushNotification(
          embeddedPushToken(storeRow?.users),
          `₹${netEarned} earned`,
          `Order delivered — added to your balance, paid out on ${formatPayoutDateLabel(nextPayoutDate())}.`,
          { data: { type: 'order_delivered', orderId: order.id } },
        );
      }

      // Realtime propagation is automatic via Supabase's replication on this
      // table update. Push is best-effort and never blocks the response —
      // a customer who didn't get notified still sees the new status next
      // time TrackOrderScreen polls.
      // The database trigger records an inbox entry and durable push job atomically.

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
