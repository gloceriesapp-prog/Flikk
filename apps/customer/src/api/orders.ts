// Maps to POST /orders, GET /orders, GET /orders/:id (backend/src/routes/
// orders.ts) — order creation (called from CheckoutScreen) and the real
// order history/live-status reads backing the Purchase tab and
// TrackOrderScreen. Row shapes mirror exactly what those routes actually
// select (order_items joined with products for name/image, stores for
// name) — no field here is invented.

import { apiRequest } from './client';
import { mapApiProduct, type ApiProduct } from './products';
import type { Product } from '../screens/home/products/types';
import type { OrderStatus } from '../screens/track-order/data';

export interface CreateOrderItem {
  product_id: string;
  quantity: number;
}

export interface CreateOrderInput {
  store_id: string;
  // Real addresses.id now — CheckoutScreen always has one of these once a
  // customer has a saved address (api/addresses.ts), which the real
  // address-book flow guarantees before Pay is ever enabled. The backend
  // still accepts an inline `address` object as a fallback (orders.ts's
  // own note), but the customer app itself no longer sends one.
  address_id: string;
  items: CreateOrderItem[];
  // Cart-level coupon (api/promos.ts) — re-validated server-side, never
  // trusted from the client's own earlier POST /promos/validate call.
  promo_code?: string;
}

export interface ApiOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_at_order: number;
  products: { name: string; image_url: string | null; unit: string } | null;
}

export interface ApiOrder {
  id: string;
  order_number: string;
  store_id: string;
  status: OrderStatus | 'cancelled';
  item_total: number;
  delivery_fee: number;
  commission_amount: number;
  total: number;
  // Real orders.discount_amount/promo_code_id (migrations/019_promo_codes.sql)
  // — 0/null on the overwhelmingly common no-code order.
  discount_amount: number;
  promo_code_id: string | null;
  razorpay_payment_id: string | null;
  placed_at: string;
  packed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  order_items: ApiOrderItem[];
  stores: { name: string; avg_prep_minutes: number | null } | null;
  // Only on GET /orders/:id (its own second lookup, no direct orders->
  // riders FK to auto-embed) — absent on GET /orders's list response, and
  // null on the single-order response until a rider is actually assigned,
  // never a placeholder name/phone.
  riders?: { name: string; phone: string } | null;
  // Only present on POST /orders's own response (backend's own note there)
  // — a redundant top-level copy of stores.avg_prep_minutes, since
  // CheckoutScreen needs it the instant an order is created and hasn't
  // fetched the stores join at all. Absent (undefined) on GET /orders and
  // GET /orders/:id, which use stores.avg_prep_minutes instead.
  avg_prep_minutes?: number | null;
  // Real orders.trip_id (migrations/014_trips.sql) — null for a plain
  // single-store order, shared by every real per-store order row born
  // from the same multi-store checkout. PurchaseScreen groups GET /orders'
  // own flat list by this so one trip shows as one order card, not N.
  trip_id: string | null;
  // Only present on GET /orders' list response (that route's own trips(
  // total, delivery_fee) join) — absent (undefined) on GET /orders/:id,
  // which doesn't need it (TrackOrderScreen's isTrip branch fetches the
  // trip separately via fetchTrip instead). Non-null alongside a real
  // trip_id — the trip's own real combined total/delivery_fee. Each leg's
  // own `total` above is deliberately just its item_total with
  // delivery_fee 0 (backend's own note on why), so this is the one real
  // source for what a multi-store trip actually charged in total.
  trips?: { total: number; delivery_fee: number } | null;
}

export function createOrder(input: CreateOrderInput): Promise<ApiOrder> {
  return apiRequest('/orders', { method: 'POST', body: input });
}

export function fetchMyOrders(): Promise<ApiOrder[]> {
  return apiRequest('/orders');
}

export function fetchOrder(orderId: string): Promise<ApiOrder> {
  return apiRequest(`/orders/${orderId}`);
}

// GET /orders/buy-it-again — real repeat-purchase products (every product
// this customer has actually had delivered before, ranked by how many
// separate delivered orders included it — see that route's own note).
// Row shape is the exact same ApiProduct every other product feed already
// returns (routes/stores.ts's PRODUCT_WITH_VARIANTS_SELECT, reused
// server-side), so mapApiProduct handles it identically — no second
// mapping function for this one feed.
export async function fetchBuyItAgain(): Promise<Product[]> {
  const rows = await apiRequest<ApiProduct[]>('/orders/buy-it-again');
  return rows.map(mapApiProduct);
}
