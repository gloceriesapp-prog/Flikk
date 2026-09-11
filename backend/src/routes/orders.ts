// The highest-risk endpoints in the backend. Source: specs/00-foundation/api-conventions.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { calcCommission, calcItemTotal, calcOrderTotal } from '../lib/pricing.js';
import { CartValidationError, validateCart } from '../lib/orderValidation.js';
import { resolveAddressId } from '../lib/resolveAddress.js';
import {
  canRoleTransition,
  isValidTransition,
  timestampColumnFor,
  type OrderStatus,
} from '../lib/orderStateMachine.js';
import { sendPushNotification } from '../lib/pushNotifications.js';

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

const COMMISSION_RATE = 0.15; // mid-band of PRD's 12-18%; store-specific rates are a later refinement
const DELIVERY_FEE = 25;

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
    const commissionAmount = calcCommission(itemTotal, COMMISSION_RATE);
    const total = calcOrderTotal(itemTotal, DELIVERY_FEE);

    // Supabase JS has no multi-statement transaction API; this is executed as a
    // Postgres function (create_order) to keep order + order_items atomic.
    const { data: created, error: rpcErr } = await supabase.rpc('create_order', {
      p_customer_id: req.user!.id,
      p_store_id: body.store_id,
      p_address_id: addressId,
      p_item_total: itemTotal,
      p_delivery_fee: DELIVERY_FEE,
      p_commission_amount: commissionAmount,
      p_total: total,
      p_items: body.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price_at_order: priceByProduct.get(i.product_id),
      })),
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
      .select('*, order_items(*, products(name, image_url)), stores(name, avg_prep_minutes)')
      .eq('customer_id', req.user!.id)
      .order('placed_at', { ascending: false });
    if (error) throw error;
    res.json(data);
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
      .select('*, order_items(*, products(name, image_url)), stores(name, avg_prep_minutes)')
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
    let rider: { name: string; phone: string } | null = null;
    if (data.rider_id) {
      const { data: riderRow } = await supabase.from('riders').select('name, phone').eq('user_id', data.rider_id).single();
      rider = riderRow ?? null;
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
}

// PATCH /orders/:id/status — state machine + role-ownership enforced here, not client-side.
ordersRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('store_owner', 'rider', 'admin'),
  requireApproved,
  async (req: AuthedRequest, res, next) => {
    try {
      const { status: to, reason } = req.body as StatusBody;
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, status, store_id, rider_id')
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

      const tsCol = timestampColumnFor(to);
      const update: Record<string, unknown> = { status: to };
      if (tsCol) update[tsCol] = new Date().toISOString();
      if (to === 'cancelled' && reason) update.cancel_reason = reason;

      const { data: updated, error: updateErr } = await supabase
        .from('orders')
        .update(update)
        .eq('id', order.id)
        .select()
        .single();
      if (updateErr) throw updateErr;

      if (to === 'delivered') {
        // rider_earnings write-on-delivery. See specs/03-rider-app/flows.md.
        await supabase.from('rider_earnings').insert({
          rider_id: req.user!.id,
          order_id: order.id,
          amount: DELIVERY_FEE,
        });
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
