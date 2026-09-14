// Real "rate your order" submission — apps/customer's OrderRow star row
// was previously decorative only (migrations/020_reviews.sql's own note).
// One review per delivered order; stores.rating (001_init.sql) is
// recomputed here on every insert rather than via a DB trigger, same
// "keep aggregate math in testable TypeScript" reasoning as every other
// pricing computation in this codebase.

import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

export const reviewsRouter = Router();

interface CreateReviewBody {
  order_id: string;
  rating: number;
  comment?: string;
}

reviewsRouter.post('/', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { order_id, rating, comment } = req.body as CreateReviewBody;
    if (!order_id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'INVALID_REVIEW', 'order_id and a rating from 1-5 are required.');
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, customer_id, store_id, status')
      .eq('id', order_id)
      .single();
    if (orderErr || !order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    if (order.customer_id !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Not your order.');
    if (order.status !== 'delivered') {
      throw new AppError(409, 'ORDER_NOT_DELIVERED', 'You can only rate an order after it has been delivered.');
    }

    const { data: review, error: insertErr } = await supabase
      .from('reviews')
      .insert({ order_id, customer_id: req.user!.id, store_id: order.store_id, rating, comment: comment ?? null })
      .select()
      .single();
    if (insertErr) {
      // reviews.order_id is unique (020_reviews.sql) — a second POST for
      // the same order is a duplicate submission, not a server error.
      if (insertErr.code === '23505') throw new AppError(409, 'ALREADY_REVIEWED', 'You already rated this order.');
      throw insertErr;
    }

    // Recompute stores.rating from every review this store has, rounded
    // to the one decimal place that column already stores (001_init.sql).
    const { data: storeReviews, error: reviewsErr } = await supabase.from('reviews').select('rating').eq('store_id', order.store_id);
    if (reviewsErr) throw reviewsErr;
    const avg = storeReviews.reduce((sum, r) => sum + r.rating, 0) / storeReviews.length;
    await supabase
      .from('stores')
      .update({ rating: Math.round(avg * 10) / 10 })
      .eq('id', order.store_id);

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
    const { data: review, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('order_id', req.params.orderId)
      .eq('customer_id', req.user!.id)
      .maybeSingle();
    if (error) throw error;
    res.json(review);
  } catch (err) {
    next(err);
  }
});
