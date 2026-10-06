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
    const { order_id, rating, comment } = (req.body ?? {}) as CreateReviewBody;
    if (typeof order_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'INVALID_REVIEW', 'order_id and a rating from 1-5 are required.');
    }

    if (comment !== undefined && (typeof comment !== 'string' || comment.length > 2000)) {
      throw new AppError(400, 'INVALID_REVIEW', 'Review comments must be at most 2000 characters.');
    }
    const { data: review, error } = await supabase.rpc('submit_customer_review', {
      p_order: order_id, p_customer: req.user!.id, p_rating: rating, p_comment: comment ?? null,
    });
    if (error) {
      if (error.code === '23505') throw new AppError(409, 'ALREADY_REVIEWED', 'You already rated this order.');
      if (error.code === 'P0002') throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
      if (error.code === '23514') throw new AppError(409, 'ORDER_NOT_DELIVERED', 'You can only rate a delivered order.');
      throw error;
    }

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
