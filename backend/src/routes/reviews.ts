import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const reviewsRouter = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function deliveredTripLegIds(tripId: string, customerId: string): Promise<string[]> {
  const { data: legs, error } = await supabase.from('orders').select('id, status')
    .eq('trip_id', tripId).eq('customer_id', customerId);
  if (error) throw error;
  const delivered = (legs ?? []).filter(leg => leg.status === 'delivered').map(leg => leg.id as string);
  if (delivered.length === 0) throw new AppError(409, 'ORDER_NOT_DELIVERED', 'You can only rate a delivered order.');
  return delivered;
}

interface CreateReviewBody {
  order_id: string;
  rating: number;
  comment?: string;
}

reviewsRouter.post('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { order_id, rating, comment } = (req.body ?? {}) as CreateReviewBody;
    if (typeof order_id !== 'string' || !UUID.test(order_id) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'INVALID_REVIEW', 'order_id and a rating from 1-5 are required.');
    }

    if (comment !== undefined && (typeof comment !== 'string' || comment.length > 2000)) {
      throw new AppError(400, 'INVALID_REVIEW', 'Review comments must be at most 2000 characters.');
    }
    // A multi-shop trip's id is what the app's one combined card carries.
    // Reviews stay per store leg (orders.id -> store rating), so rating a
    // trip rates every delivered leg the caller owns with the same stars.
    // Each leg goes through the same atomic RPC (ownership + delivered
    // checks in its trigger, UNIQUE(order_id) for idempotency); a leg that
    // is already rated is skipped so a retry after a partial failure
    // completes instead of erroring.
    const { data: trip, error: tripError } = await supabase.from('trips').select('id')
      .eq('id', order_id).eq('customer_id', req.user!.id).maybeSingle();
    if (tripError) throw tripError;
    const legIds = trip ? await deliveredTripLegIds(trip.id as string, req.user!.id) : [order_id];

    const created: unknown[] = [];
    for (const legId of legIds) {
      const { data: review, error } = await supabase.rpc('submit_customer_review', {
        p_order: legId, p_customer: req.user!.id, p_rating: rating, p_comment: comment ?? null,
      });
      if (error) {
        if (error.code === '23505' && trip) continue;
        if (error.code === '23505') throw new AppError(409, 'ALREADY_REVIEWED', 'You already rated this order.');
        if (error.code === 'P0002') throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
        if (error.code === '23514') throw new AppError(409, 'ORDER_NOT_DELIVERED', 'You can only rate a delivered order.');
        throw error;
      }
      created.push(review);
    }
    if (created.length === 0) throw new AppError(409, 'ALREADY_REVIEWED', 'You already rated this order.');
    const review = created[0];

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

// GET /reviews/order/:orderId — TrackOrderScreen/PurchaseScreen use this to
// know whether an already-rated order should show "Rated ★4" instead of
// still offering the rating prompt.
reviewsRouter.get('/order/:orderId', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    if (!UUID.test(String(req.params.orderId))) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    // A trip id resolves to its legs: any rated leg means the trip was rated.
    const { data: legs, error: legsError } = await supabase.from('orders').select('id')
      .eq('trip_id', req.params.orderId).eq('customer_id', req.user!.id);
    if (legsError) throw legsError;
    const orderIds = legs?.length ? legs.map(leg => leg.id as string) : [req.params.orderId];
    const { data: review, error } = await supabase
      .from('reviews')
      .select('id, order_id, rating, comment, created_at')
      .in('order_id', orderIds)
      .eq('customer_id', req.user!.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json(review);
  } catch (err) {
    next(err);
  }
});
