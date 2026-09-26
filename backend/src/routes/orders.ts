// The highest-risk endpoints in the backend. Source: specs/00-foundation/api-conventions.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { calcCommission, calcItemTotal, calcOrderTotal, round2 } from '../lib/pricing.js';
import { getCommissionRate } from '../lib/platformSettings.js';
import { formatPayoutDateLabel, nextPayoutDate } from '../lib/payoutSchedule.js';
import { CartValidationError, validateCart } from '../lib/orderValidation.js';
import { resolveAddressId } from '../lib/resolveAddress.js';
import {
  canRoleTransition,
  isValidTransition,
  timestampColumnFor,
  type OrderStatus,
} from '../lib/orderStateMachine.js';
import { sendPushNotification } from '../lib/pushNotifications.js';
import { generateDeliveryOtp, isDeliveryOtpValid } from '../lib/deliveryOtp.js';
import { isRiderCancelReasonCode } from '../lib/cancelReasons.js';
import { isRiderDeliveryFailureReasonCode } from '../lib/deliveryFailureReasons.js';
import { lookupPromoForCheckout } from './promos.js';
import { PRODUCT_WITH_VARIANTS_SELECT } from './stores.js';
import { rankRepeatPurchases, reorderByRank } from '../lib/buyItAgain.js';
import { calcDeliveryFee, getDeliverySettings } from '../lib/deliverySettings.js';
import { refundPayment } from '../payments/refundPayment.js';
import { triggerDispatch } from '../lib/riderDispatch.js';

// Only these three transitions are ones the customer didn't just cause
// themselves (they placed the order) or won't see reflected in the receipt
// screen right after paying (placed) — so only these are worth an OS-level
// push. TrackOrderScreen's own polling still shows every status live while
// the app's open; this is what covers it being closed.
const CUSTOMER_STATUS_PUSH_COPY: Partial<Record<OrderStatus, { title: string; body: string }>> = {
  packed: { title: 'Order packed', body: 'Your order has been packed and will be picked up soon.' },
  out_for_delivery: { title: 'Out for delivery', body: 'Your rider is on the way with your order.' },
  delivered: { title: 'Order delivered', body: 'Enjoy! Your order has been delivered.' },
  cancelled: { title: 'Order cancelled', body: 'Your order has been cancelled.' },
};

export const ordersRouter = Router();

interface CreateOrderBody {
  store_id: string;
  // Either a real addresses.id from a previous order, or an inline address
  // to save-and-use — the customer app has no address-book screen yet
  // (only a single current delivery location, useLocationStore), so
  // `address` is what it actually sends on every order today. Support for
  // a real multi-address picker can switch to `address_id` once that
  // screen exists, without changing this contract.
  address_id?: string;
  // recipient_name is required — real quick-commerce apps (Blinkit/
  // Instamart/Swiggy) all collect this, not just a location: the person
  // ordering isn't always the person receiving (family, gift, office
  // delivery), and a rider at a gate/apartment security desk needs a name
  // to ask for, not just "the Flikk order." Phone doesn't get its own
  // field — the account's own verified phone already serves that role.
  address?: { label?: string; line1: string; landmark?: string; recipient_name: string };
  items: { product_id: string; quantity: number }[];
  // Optional cart-level coupon (lib/promos.ts) — re-validated here from
  // scratch even if the client already called POST /promos/validate; the
  // discount actually applied is never trusted from that earlier call.
  promo_code?: string;
  // 'cod' | 'online' — real distinction jobs/expireUnpaidOrders.ts needs
  // to tell a legitimate Cash-on-Delivery order apart from an abandoned
  // online-payment attempt (both look identical via razorpay_payment_id
  // alone: null either way). Defaults to 'cod' server-side (migration
  // 034's own default) if the client ever omits it.
  payment_method?: 'cod' | 'online';
}

// POST /orders — all-or-nothing: validate stock, lock prices, single-store only,
// create order + order_items in one transaction, initiate Razorpay intent.
// See specs/00-foundation/api-conventions.md.
ordersRouter.post('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as CreateOrderBody;
    if (!body.store_id || (!body.address_id && !body.address?.line1) || !body.items?.length) {
      throw new AppError(400, 'INVALID_ORDER', 'store_id, an address, and items are required.');
    }

    const addressId = await resolveAddressId(req.user!.id, body);

    const productIds = body.items.map((i) => i.product_id);
    const { data: products, error: productErr } = await supabase
      .from('products')
      .select('id, store_id, price, is_in_stock')
      .in('id', productIds);
    if (productErr) throw productErr;

    try {
      validateCart(body.items, products ?? [], body.store_id);
    } catch (validationErr) {
      if (validationErr instanceof CartValidationError) {
        throw new AppError(400, validationErr.code, validationErr.message);
      }
      throw validationErr;
    }

    const priceByProduct = new Map(products.map((p) => [p.id, p.price as number]));
    const lines = body.items.map((i) => ({
      unitPrice: priceByProduct.get(i.product_id) as number,
      quantity: i.quantity,
    }));
    const itemTotal = calcItemTotal(lines);
    const commissionAmount = calcCommission(itemTotal, await getCommissionRate());

    let promoCodeId: string | null = null;
    let discountAmount = 0;
    if (body.promo_code) {
      const promoResult = await lookupPromoForCheckout(body.promo_code, req.user!.id, itemTotal);
      promoCodeId = promoResult.promoCodeId;
      discountAmount = promoResult.discountAmount;
    }
    const deliverySettings = await getDeliverySettings();
    const deliveryFee = calcDeliveryFee(itemTotal, deliverySettings);
    const total = calcOrderTotal(itemTotal, deliveryFee, discountAmount, deliverySettings.handlingFee);

    // Supabase JS has no multi-statement transaction API; this is executed as a
    // Postgres function (create_order) to keep order + order_items atomic.
    const { data: created, error: rpcErr } = await supabase.rpc('create_order', {
      p_customer_id: req.user!.id,
      p_store_id: body.store_id,
      p_address_id: addressId,
      p_item_total: itemTotal,
      p_delivery_fee: deliveryFee,
      p_commission_amount: commissionAmount,
      p_total: total,
      p_items: body.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price_at_order: priceByProduct.get(i.product_id),
      })),
      p_promo_code_id: promoCodeId,
      p_discount_amount: discountAmount,
      p_payment_method: body.payment_method ?? 'cod',
      p_handling_fee: deliverySettings.handlingFee,
    });
    if (rpcErr) throw new AppError(500, 'ORDER_CREATE_FAILED', rpcErr.message);

    // Store's own avg_prep_minutes rides along on the create response —
    // ReceiptScreen/CheckoutScreen need it immediately to show a real
    // estimated-delivery time (placed_at + avg_prep_minutes + a fixed
    // transit buffer, see apps/customer's own estimateDelivery.ts) without
    // a second round trip. Best-effort: a lookup failure here doesn't fail
    // order creation, the customer app just falls back to a generic ETA.
    // The owner's expo_push_token rides along on the same query — this is
    // the one real push a store owner gets for a brand-new order; without
    // it, apps/partner's own useOrderPolling.ts (10s interval) is the only
    // thing that ever finds out, and only while the app is foregrounded.
    const { data: store } = await supabase
      .from('stores')
      .select('avg_prep_minutes, users!owner_user_id(expo_push_token)')
      .eq('id', body.store_id)
      .single();

    void sendPushNotification(
      store?.users?.[0]?.expo_push_token,
      'New order received',
      `Order ${created.id.slice(0, 6).toUpperCase()} · ₹${total} — tap to view.`,
    );

    // Razorpay payment intent initiated by the caller once the order id is known —
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
      .select('*, order_items(*, products(name, image_url, unit)), stores(name, avg_prep_minutes), trips(total, delivery_fee)')
      .eq('customer_id', req.user!.id)
      .order('placed_at', { ascending: false });
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
    const { data: deliveredOrders, error: ordersErr } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', req.user!.id)
      .eq('status', 'delivered');
    if (ordersErr) throw ordersErr;
    if (!deliveredOrders || deliveredOrders.length === 0) return res.json([]);

    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_id, orders(placed_at)')
      .in(
        'order_id',
        deliveredOrders.map((o) => o.id),
      );
    if (itemsErr) throw itemsErr;

    const deliveredItems = ((items ?? []) as unknown as { product_id: string; orders: { placed_at: string } | null }[])
      .filter((item) => item.orders?.placed_at != null)
      .map((item) => ({ product_id: item.product_id, placed_at: item.orders!.placed_at }));

    const rankedProductIds = rankRepeatPurchases(deliveredItems, BUY_IT_AGAIN_LIMIT);
    if (rankedProductIds.length === 0) return res.json([]);

    // Same real-catalog gates every other product feed applies (routes/
    // stores.ts's own note) — a product this customer bought before but
    // that's since gone out of stock, been unapproved, or had its store
    // deactivated has no business showing up as reorderable right now.
    const { data: products, error: productsErr } = await supabase
      .from('products')
      .select(PRODUCT_WITH_VARIANTS_SELECT)
      .in('id', rankedProductIds)
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
      .select('*, order_items(*, products(name, image_url, unit)), stores(name, avg_prep_minutes)')
      .eq('id', req.params.id)
      .single();
    if (error || !data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

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

    res.json({ ...data, riders: rider });
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
  // the door. Verified against orders.delivery_otp, then that column is
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
      const { status: to, reason, otp } = req.body as StatusBody;
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, status, store_id, rider_id, customer_id, trip_id, total, razorpay_payment_id, delivery_otp')
        .eq('id', req.params.id)
        .single();
      if (error || !order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

      const from = order.status as OrderStatus;
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

      const tsCol = timestampColumnFor(to);
      const update: Record<string, unknown> = { status: to };
      if (tsCol) update[tsCol] = new Date().toISOString();
      if (to === 'cancelled' && reason) {
        // A rider cancels only pre-pickup and only from CancelOrderModal's
        // fixed reason list, so their reason must be one of the known codes
        // (lib/cancelReasons.ts — mirror of @flikk/shared). Scoped to riders
        // deliberately: partner-reject and customer-cancel reasons on this
        // same endpoint stay free text, so this check must not touch them.
        if (req.user!.role === 'rider' && !isRiderCancelReasonCode(reason)) {
          throw new AppError(400, 'INVALID_CANCEL_REASON', 'Unknown cancellation reason.');
        }
        update.cancel_reason = reason;
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
        // Mid-trip failure is a deliberate follow-up, not MVP: a trip is one
        // customer drop fed by N store pickups (orders sharing a trip_id), so
        // failing one leg raises real questions the MVP doesn't answer (refund
        // which store? pay which legs?). Reject rather than half-handle it.
        if (order.trip_id) {
          throw new AppError(400, 'TRIP_FAILURE_UNSUPPORTED', 'Failing a multi-store trip order is not supported yet.');
        }
        // REUSE orders.cancel_reason — status ('failed' vs 'cancelled')
        // disambiguates which flow stored it, so no new column/migration is
        // needed for the reason itself (the status enum widening is migration
        // 052; that constraint change was unavoidable).
        update.cancel_reason = reason;
      }

      // Delivery OTP issued the moment the rider marks pickup
      // (out_for_delivery) — the customer sees it on their own order well
      // before the rider reaches the door. One shared code per trip: a
      // multi-store trip fires one PATCH per leg, so reuse a sibling leg's
      // already-issued code rather than minting N different codes for one
      // drop (the rider verifies every leg with the same number).
      if (to === 'out_for_delivery') {
        let code = generateDeliveryOtp();
        if (order.trip_id) {
          const { data: siblings } = await supabase
            .from('orders')
            .select('delivery_otp')
            .eq('trip_id', order.trip_id)
            .not('delivery_otp', 'is', null)
            .limit(1);
          const shared = siblings?.[0]?.delivery_otp;
          if (shared) code = shared;
        }
        update.delivery_otp = code;
      }

      // Delivery is gated on the real code — the rider must send the OTP the
      // customer read out, matching orders.delivery_otp. On success the
      // column is nulled in this same write so the code is single-use
      // ("expired once used"). A null stored code (order that never went
      // out_for_delivery, or predates the feature) can't be satisfied by
      // anything, so delivery stays blocked rather than silently open.
      if (to === 'delivered') {
        if (!isDeliveryOtpValid(order.delivery_otp, otp)) {
          throw new AppError(400, 'INVALID_OTP', 'The delivery code is incorrect. Ask the customer for the code shown on their order.');
        }
        update.delivery_otp = null;
      }

      // Refund BEFORE the status write, not after — if the Razorpay call
      // itself threw an unexpected error (refundPayment.ts already
      // swallows Razorpay's own failure responses into refund_status:
      // 'failed', so this only fires on something more fundamental), the
      // order should stay in its real pre-cancel state rather than
      // showing "cancelled" with no refund attempt ever having been made.
      // COD orders (razorpay_payment_id null) skip this entirely —
      // refund_status stays the column's own 'none' default, correctly
      // meaning "nothing was ever charged, nothing to refund".
      if (to === 'cancelled' && order.razorpay_payment_id) {
        const refund = await refundPayment(order.razorpay_payment_id, order.total);
        update.refund_status = refund.status;
        update.razorpay_refund_id = refund.razorpayRefundId;
        if (refund.status === 'completed') update.refunded_at = new Date().toISOString();
      }

      const { data: updated, error: updateErr } = await supabase
        .from('orders')
        .update(update)
        .eq('id', order.id)
        .select()
        .single();
      if (updateErr) throw updateErr;

      // Real automated dispatch — fires the moment a store packs an order,
      // never blocks this response (fire-and-forget, same convention this
      // handler's own push-notification call below already uses).
      // lib/riderDispatch.ts's own note has the full broadcast + atomic-
      // accept-wins design.
      if (to === 'packed') {
        void triggerDispatch({ id: updated.id, store_id: updated.store_id }).catch((err) =>
          console.error('[riderDispatch] triggerDispatch failed for order', updated.id, err),
        );
      }

      if (to === 'delivered') {
        // rider_earnings write-on-delivery. See specs/03-rider-app/flows.md.
        //
        // Trip legs (order.trip_id set — lib/trips.ts's own note) pay
        // differently: the rider app marks every leg of a trip 'delivered'
        // together (one customer drop for the whole trip), but this
        // handler still receives one PATCH per leg. Paying DELIVERY_FEE
        // per leg here would silently multiply a rider's earnings by the
        // store count — instead, pay the trip's own delivery_fee (which
        // already includes the multi-stop surcharge, see routes/trips.ts's
        // EXTRA_STOP_FEE) exactly once, from whichever leg happens to be
        // the last one to reach 'delivered'.
        if (order.trip_id) {
          const { data: siblings } = await supabase.from('orders').select('id, status').eq('trip_id', order.trip_id);
          const allDelivered = (siblings ?? []).every((s) => s.id === order.id || s.status === 'delivered');
          if (allDelivered) {
            const { data: trip } = await supabase.from('trips').select('delivery_fee').eq('id', order.trip_id).single();
            // trip.delivery_fee is this trip's OWN stored fee (captured
            // at creation, same historical-value principle as the
            // single-store path above) — `?? 0` only guards a trip
            // lookup that somehow found no row, never an actual payout
            // amount in practice.
            //
            // Double-pay is now guarded by the DB, not a check-then-insert:
            // rider_earnings_trip_unique (migration 050) makes one earnings
            // row per trip_id the hard rule, so two legs racing into "all
            // delivered" at once can't both insert — the loser hits 23505
            // and is a no-op. No TOCTOU window left.
            const { error: earnErr } = await supabase.from('rider_earnings').insert({
              rider_id: req.user!.id,
              order_id: order.id,
              trip_id: order.trip_id,
              amount: trip?.delivery_fee ?? 0,
            });
            if (earnErr && earnErr.code !== '23505') throw earnErr;
          }
        } else {
          // This order's OWN stored delivery_fee (captured at order-
          // creation time, orders.delivery_fee) — not a live re-fetch of
          // today's rate. If a delivery-fee change happens between this
          // order being placed and delivered, the rider is still paid
          // whatever this specific order actually charged, same principle
          // as order_items.unit_price_at_order never drifting with a
          // product's current price. rider_earnings_order_unique (migration
          // 050) makes the re-insert on a retried PATCH a no-op (23505).
          const { error: earnErr } = await supabase.from('rider_earnings').insert({
            rider_id: req.user!.id,
            order_id: order.id,
            amount: updated.delivery_fee,
          });
          if (earnErr && earnErr.code !== '23505') throw earnErr;
        }

        // Real earning-transparency push — the store's revenue is never
        // written to any ledger before this exact moment (weeklyPayouts.ts's
        // own computeWeeklyPayouts scopes strictly to delivered orders, not
        // accepted/packed ones), so 'delivered' is the one truthful point
        // to tell the owner "you earned this." Tells them the real amount
        // AND the real next settlement date up front — the two things a
        // store owner actually needs to not wonder "where did my money go"
        // when it doesn't show up in Payouts immediately.
        const netEarned = round2(updated.item_total - updated.commission_amount);
        const { data: storeRow } = await supabase
          .from('stores')
          .select('users!owner_user_id(expo_push_token)')
          .eq('id', order.store_id)
          .single();
        void sendPushNotification(
          storeRow?.users?.[0]?.expo_push_token,
          `₹${netEarned} earned`,
          `Order delivered — added to your balance, paid out on ${formatPayoutDateLabel(nextPayoutDate())}.`,
        );
      }

      if (to === 'failed') {
        // Rider is paid the FULL delivery fee on a failed drop — they did the
        // ride and the pickup; the failure is on the customer/address side, not
        // theirs. Same single-order payout + idempotency as the delivered
        // else-branch above (rider_earnings_order_unique, migration 050, makes
        // a retried PATCH a 23505 no-op). Trip legs never reach here — rejected
        // as TRIP_FAILURE_UNSUPPORTED above — so this is always a single order,
        // no trip-fee branch needed. No auto-refund and no store payout fire:
        // the failed order surfaces in admin's refund queue for manual review.
        const { error: earnErr } = await supabase.from('rider_earnings').insert({
          rider_id: req.user!.id,
          order_id: order.id,
          amount: updated.delivery_fee,
        });
        if (earnErr && earnErr.code !== '23505') throw earnErr;
      }

      // Realtime propagation is automatic via Supabase's replication on this
      // table update. Push is best-effort and never blocks the response —
      // a customer who didn't get notified still sees the new status next
      // time TrackOrderScreen polls.
      const pushCopy = CUSTOMER_STATUS_PUSH_COPY[to];
      if (pushCopy) {
        const { data: customer } = await supabase.from('users').select('expo_push_token').eq('id', updated.customer_id).single();
        void sendPushNotification(customer?.expo_push_token, pushCopy.title, pushCopy.body);
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
