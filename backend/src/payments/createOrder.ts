// POST /payments/create-order — client calls this after POST /orders
// succeeds, then opens Razorpay Checkout with the returned id. The secret
// key never leaves this process; the client only gets an order id + key_id.
// Amount is never trusted from the client — it's read from the order row
// itself, which the customer app has no write access to.
import type { Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { razorpay } from './razorpayClient.js';
import type { OrderIdBody } from './types.js';

export async function createOrder(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { orderId, tripId } = req.body as OrderIdBody;
    if (!orderId && !tripId) {
      throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'orderId or tripId is required.');
    }

    // Same "amount is never trusted from the client" rule either way —
    // just reading it from `trips.total` (the one combined amount for a
    // multi-store checkout, backend/src/lib/trips.ts's own calcTripTotal)
    // instead of a single order's own total.
    const table = tripId ? 'trips' : 'orders';
    const id = (tripId ?? orderId)!;
    const { data: record, error } = await supabase.from(table).select('id, customer_id, total').eq('id', id).single();
    if (error || !record) throw new AppError(404, tripId ? 'TRIP_NOT_FOUND' : 'ORDER_NOT_FOUND', `${tripId ? 'Trip' : 'Order'} not found.`);
    if (record.customer_id !== req.user!.id) throw new AppError(403, 'FORBIDDEN', tripId ? 'Not your trip.' : 'Not your order.');

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(record.total * 100), // paise — trust the stored total, not the client-supplied amount
      currency: 'INR',
      receipt: record.id,
      notes: tripId ? { gloceries_trip_id: record.id } : { gloceries_order_id: record.id },
    });

    res.status(201).json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: env.razorpayKeyId,
    });
  } catch (err) {
    next(err);
  }
}
