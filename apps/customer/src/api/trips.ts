import { invalidatePurchaseHistory } from '../features/purchases/invalidateHistory';
// Maps to POST /trips, GET /trips/:id (backend/src/routes/trips.ts) — the
// multi-store checkout path. Reached from CheckoutScreen only when the
// cart's own items span more than one store (useCartStore's
// selectCartStoreCount) — a single-store cart keeps using api/orders.ts's
// createOrder/fetchOrder, unaffected by this file.

import { apiRequest } from './client';
import type { ApiOrder, OrderDeliveryAddress } from './orders';

export interface CreateTripItem {
  product_id: string;
  variant_id?: string | null;
  expected_unit_price?: number;
  quantity: number;
}

export interface CreateTripInput {
  attempt_id: string;
  quote_token: string;
  address_id: string;
  items: CreateTripItem[];
  // Cart-level coupon (api/promos.ts) — same contract as CreateOrderInput.
  promo_code?: string;
  // Same real distinction api/orders.ts's own CreateOrderInput documents —
  // one payment method for the whole trip's one combined payment.
  payment_method?: 'cod' | 'online';
}

export interface TripRefund { status: 'queued' | 'processing' | 'completed' | 'failed'; amount: number; refunded_amount: number }
export interface TripCancellation {
 outcome: 'cancelled' | 'blocked';
 shops: {order_id:string;store_name:string;status:string;outcome:'cancelled'|'blocked'|'not_cancelled';refund_status?:string}[];
 refund: TripRefund | null;
}
export function cancelTrip(tripId:string,reason:string):Promise<TripCancellation> {
 return apiRequest(`/trips/${tripId}/cancel`,{method:'POST',body:{reason}});
}

export interface ApiTrip {
  live_revision?: number;
  cancellation_refund?: TripRefund | null;
  estimated_delivery_minutes?: number | null;
  estimated_delivery_at?: string | null;
  id: string;
  customer_id: string;
  address_id: string;
  addresses?: OrderDeliveryAddress | null;
  delivery_fee: number;
  handling_fee?: number;
  item_total: number;
  total: number;
  discount_amount: number;
  promo_code_id: string | null;
  razorpay_payment_id: string | null;
  status: 'placed' | 'delivered' | 'cancelled' | 'failed';
  created_at: string;
  // Only present on GET /trips/:id — POST /trips' own response is just the
  // trip row itself (the child orders it just created carry nothing new
  // CheckoutScreen needs beyond the ids it already has from the cart).
  orders?: ApiOrder[];
}

export async function createTrip(input: CreateTripInput): Promise<ApiTrip> {
  const result = await apiRequest<ApiTrip>('/trips', { method: 'POST', body: input });
  invalidatePurchaseHistory();
  return result;
}

export function fetchTrip(tripId: string): Promise<ApiTrip> {
  return apiRequest(`/trips/${tripId}`);
}
