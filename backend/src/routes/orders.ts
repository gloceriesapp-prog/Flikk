// The highest-risk endpoints in the backend. Source: specs/00-foundation/api-conventions.md
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireApproved, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { calcCommission, calcItemTotal, calcOrderTotal } from '../lib/pricing.js';
import { CartValidationError, validateCart } from '../lib/orderValidation.js';
import {
  canRoleTransition,
  isValidTransition,
  timestampColumnFor,
  type OrderStatus,
} from '../lib/orderStateMachine.js';

export const ordersRouter = Router();

const COMMISSION_RATE = 0.15; // mid-band of PRD's 12-18%; store-specific rates are a later refinement
const DELIVERY_FEE = 25;

interface CreateOrderBody {
  store_id: string;
  address_id: string;
  items: { product_id: string; quantity: number }[];
}

// POST /orders — all-or-nothing: validate stock, lock prices, single-store only,
// create order + order_items in one transaction, initiate Razorpay intent.
// See specs/00-foundation/api-conventions.md.
ordersRouter.post('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const body = req.body as CreateOrderBody;
    if (!body.store_id || !body.address_id || !body.items?.length) {
      throw new AppError(400, 'INVALID_ORDER', 'store_id, address_id, and items are required.');
    }

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
      p_address_id: body.address_id,
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

    // Razorpay payment intent initiated by the caller once the order id is known —
    // kept out of this handler to avoid a second external-service failure mode
    // inside the same transaction boundary. See specs/05-platform/payments.md.
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    // RLS (via a user-scoped client) is the real enforcement; service-role fetch
    // here is filtered defensively so a route bug can't leak cross-role data.
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('id', req.params.id).single();
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

    res.json(data);
  } catch (err) {
    next(err);
  }
});

interface StatusBody {
  status: OrderStatus;
}

// PATCH /orders/:id/status — state machine + role-ownership enforced here, not client-side.
ordersRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('store_owner', 'rider', 'admin'),
  requireApproved,
  async (req: AuthedRequest, res, next) => {
    try {
      const { status: to } = req.body as StatusBody;
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

      // Realtime propagation is automatic via Supabase's replication on this table
      // update; notification dispatch (WhatsApp/push) is a side effect wired in
      // specs/05-platform/notifications.md, not duplicated here.
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
