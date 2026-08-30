// Maps to POST /orders, GET /orders, GET /orders/:id (backend/src/routes/
// orders.ts) — order creation (called from CheckoutScreen) and the real
// order history/live-status reads backing the Purchase tab and
// TrackOrderScreen. Row shapes mirror exactly what those routes actually
// select (order_items joined with products for name/image, stores for
// name) — no field here is invented.

import { apiRequest } from './client';
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
}

export interface ApiOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_at_order: number;
  products: { name: string; image_url: string | null } | null;
}

export interface ApiOrder {
  id: string;
  order_number: string;
  status: OrderStatus | 'cancelled';
  item_total: number;
  delivery_fee: number;
  commission_amount: number;
  total: number;
  razorpay_payment_id: string | null;
  placed_at: string;
  packed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  order_items: ApiOrderItem[];
  stores: { name: string; avg_prep_minutes: number | null } | null;
  // Only present on POST /orders's own response (backend's own note there)
  // — a redundant top-level copy of stores.avg_prep_minutes, since
  // CheckoutScreen needs it the instant an order is created and hasn't
  // fetched the stores join at all. Absent (undefined) on GET /orders and
  // GET /orders/:id, which use stores.avg_prep_minutes instead.
  avg_prep_minutes?: number | null;
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
