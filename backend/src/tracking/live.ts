import { customerDeliveryCodes } from '../orders/deliveryCodes.js';
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { tripRefundSummary } from '../payments/tripRefunds.js';

// No items, address, seller joins, rider profile or historical delivery count.
export const ORDER_LIVE_SELECT = 'id,live_revision,status,rider_id,estimated_delivery_minutes,estimated_delivery_at,packed_at,picked_up_at,delivered_at,delivery_otp,cancel_reason,refund_status,razorpay_refund_id,refunded_at,razorpay_payment_id';
export const liveOrdersRouter = Router();
export const liveTripsRouter = Router();
function unavailable() { return new AppError(503, 'TRACKING_UNAVAILABLE', 'Tracking is temporarily unavailable. Please retry.'); }
liveOrdersRouter.get('/:id/live', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.from('orders').select(ORDER_LIVE_SELECT)
      .eq('id', req.params.id).eq('customer_id', req.user!.id).maybeSingle();
    if (error) throw unavailable();
    if (!data) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    res.set('Cache-Control', 'private, no-store');
    const codes = await customerDeliveryCodes(req.user!.id,[String(req.params.id)]);
    res.json({ ...data, delivery_otp: codes.get(String(req.params.id)) ?? null });
  } catch (error) { next(error); }
});
liveTripsRouter.get('/:id/live', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { data: trip, error } = await supabase.from('trips')
      .select('id,live_revision,status,estimated_delivery_minutes,estimated_delivery_at,razorpay_payment_id')
      .eq('id', req.params.id).eq('customer_id', req.user!.id).maybeSingle();
    if (error) throw unavailable();
    if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
    const [{ data: orders, error: ordersError }, refund] = await Promise.all([
      supabase.from('orders').select(ORDER_LIVE_SELECT).eq('trip_id', trip.id).eq('customer_id', req.user!.id).order('placed_at'),
      tripRefundSummary(trip.id),
    ]);
    if (ordersError) throw unavailable();
    res.set('Cache-Control', 'private, no-store');
    const codes = await customerDeliveryCodes(req.user!.id,(orders ?? []).map(o => o.id));
    res.json({ ...trip, orders: (orders ?? []).map(o => ({ ...o,delivery_otp:codes.get(o.id) ?? null })), cancellation_refund: refund });
  } catch (error) { next(error); }
});
