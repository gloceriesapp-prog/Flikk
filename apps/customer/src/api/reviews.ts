// Maps to POST /reviews, GET /reviews/order/:orderId (backend/src/routes/
// reviews.ts) — real submission behind OrderRow's "Rate your order" prompt
// (previously decorative only, see that component's own updated note).

// orderId may be a trips.id: the server rates every delivered leg of that
// trip (one review per store order) and reports the trip as rated once any
// leg is — so the combined trip card's prompt works without client fan-out.

import { apiRequest } from './client';

export interface ApiReview {
  id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function submitReview(orderId: string, rating: number, comment?: string): Promise<ApiReview> {
  return apiRequest('/reviews', { method: 'POST', body: { order_id: orderId, rating, comment } });
}

export function fetchReviewForOrder(orderId: string): Promise<ApiReview | null> {
  return apiRequest(`/reviews/order/${orderId}`);
}
