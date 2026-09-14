// Maps to POST /trips, GET /trips/:id (backend/src/routes/trips.ts) — the
// multi-store checkout path. Reached from CheckoutScreen only when the
// cart's own items span more than one store (useCartStore's
// selectCartStoreCount) — a single-store cart keeps using api/orders.ts's
// createOrder/fetchOrder, unaffected by this file.

import { apiRequest } from './client';
import type { ApiOrder } from './orders';

export interface CreateTripItem {
  product_id: string;
  quantity: number;
}

export interface CreateTripInput {
  address_id: string;
  items: CreateTripItem[];
  // Cart-level coupon (api/promos.ts) — same contract as CreateOrderInput.
  promo_code?: string;
}

export interface ApiTrip {
  id: string;
  customer_id: string;
  address_id: string;
  delivery_fee: number;
  item_total: number;
  total: number;
  discount_amount: number;
  promo_code_id: string | null;
  razorpay_payment_id: string | null;
  status: 'placed' | 'delivered' | 'cancelled';
  created_at: string;
  // Only present on GET /trips/:id — POST /trips' own response is just the
  // trip row itself (the child orders it just created carry nothing new
  // CheckoutScreen needs beyond the ids it already has from the cart).
  orders?: ApiOrder[];
}

export function createTrip(input: CreateTripInput): Promise<ApiTrip> {
  return apiRequest('/trips', { method: 'POST', body: input });
}

export function fetchTrip(tripId: string): Promise<ApiTrip> {
  return apiRequest(`/trips/${tripId}`);
}
