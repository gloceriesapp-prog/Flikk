import { invalidatePurchaseHistory } from '../features/purchases/invalidateHistory';
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
  variant_id?: string | null;
  expected_unit_price?: number;
  quantity: number;
}

export interface CreateOrderInput {
  attempt_id: string;
  quote_token: string;
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
  // 'cod' | 'online' — CheckoutScreen.tsx already knows which by the time
  // it calls this (a payment method must be selected before Pay is
  // reachable at all). Lets backend/src/jobs/expireUnpaidOrders.ts tell a
  // real Cash-on-Delivery order apart from an abandoned online-payment
  // attempt — both otherwise look identical (razorpay_payment_id null
  // either way).
  payment_method?: 'cod' | 'online';
}

export interface ApiOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_at_order: number;
  variant_id?: string | null;
  unit_at_order?: string | null;
  variant_mrp_at_order?: number | null;
  // Checkout snapshot; absent/null for orders created before migration 060.
  unit_mrp_at_order?: number | null;
  products: { name: string; image_url: string | null; unit: string } | null;
}

export interface OrderDeliveryAddress {
  label: string;
  line1: string;
  landmark: string | null;
  recipient_name: string;
  recipient_phone: string | null;
}

export interface ApiOrder {
  live_revision?: number;
  rider_id?: string | null;
  estimated_delivery_minutes?: number | null;
  estimated_delivery_at?: string | null;
  id: string;
  order_number: string;
  // Detail endpoints return the address linked to this order, rather
  // than whichever address the customer currently has selected.
  addresses?: OrderDeliveryAddress | null;
  store_id: string;
  // 'failed' is a terminal post-pickup delivery failure (backend
  // orderStateMachine.ts, same status apps/rider's BackendOrderStatus knows)
  // — not a stage on the linear timeline, so it's unioned here alongside
  // 'cancelled' rather than added to OrderStatus/ORDER_STAGES.
  status: OrderStatus | 'cancelled' | 'failed';
  item_total: number;
  delivery_fee: number;
  handling_fee?: number;
  commission_amount: number;
  total: number;
  // Real orders.discount_amount/promo_code_id (migrations/019_promo_codes.sql)
  // — 0/null on the overwhelmingly common no-code order.
  discount_amount: number;
  promo_code_id: string | null;
  razorpay_payment_id: string | null;
  // Real orders.payment_method (migration 034) — 'cod' for every order
  // created before this column existed (its own default).
  payment_method: 'cod' | 'online';
  // Real cancellation/refund state (backend/migrations/013_order_cancel_
  // reason.sql, 033_order_refunds.sql) — cancel_reason is whatever the
  // canceller (customer/store owner/rider) actually picked/typed;
  // refund_status is always meaningful, never a separate null-check
  // ('none' covers both "not cancelled" and "cancelled COD order, nothing
  // was ever charged" — see that migration's own note). razorpay_refund_id/
  // refunded_at are only set once a real online-payment refund exists.
  cancel_reason: string | null;
  refund_status: 'none' | 'processing' | 'completed' | 'failed';
  razorpay_refund_id: string | null;
  refunded_at: string | null;
  placed_at: string;
  packed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  // Real orders.delivery_otp (backend/migrations/049_delivery_otp.sql) — a
  // 4-digit code the customer reads out to the rider at the door. Only set
  // while the order is out_for_delivery (issued at pickup, nulled the instant
  // the rider verifies it on delivery), null every other state.
  delivery_otp: string | null;
  order_items: ApiOrderItem[];
  stores: { name: string; avg_prep_minutes: number | null } | null;
  // Only on GET /orders/:id (its own second lookup, no direct orders->
  // riders FK to auto-embed) — absent on GET /orders's list response, and
  // null on the single-order response until a rider is actually assigned,
  // never a placeholder name/phone.
  // deliveries is a real count (backend's own note: every order this
  // rider has ever actually delivered) — not a per-rider column that
  // exists on `riders`, computed fresh on each fetch.
  riders?: { name: string; phone: string; deliveries: number } | null;
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

export async function createOrder(input: CreateOrderInput): Promise<ApiOrder> {
  const result = await apiRequest<ApiOrder>('/orders', { method: 'POST', body: input });
  invalidatePurchaseHistory();
  return result;
}

export function fetchMyOrders(): Promise<ApiOrder[]> {
  return apiRequest('/orders');
}

export function fetchOrder(orderId: string): Promise<ApiOrder> {
  return apiRequest(`/orders/${orderId}`);
}

// PATCH /orders/:id/status { status: 'cancelled', reason } — same real
// state-machine endpoint apps/rider's own CancelOrderModal already calls,
// now also reachable by the customer who placed the order
// (orderStateMachine.ts's own TRANSITION_OWNER.cancelled note on why).
// The backend rejects this outright once the order has moved past
// 'packed' (rider has picked it up) — see that file's own
// isValidTransition, not re-checked here so the two can never disagree.
export function cancelOrder(orderId: string, reason: string): Promise<ApiOrder> {
  return apiRequest(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'cancelled', reason } });
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

export interface OrderHistoryPage { items: ApiOrder[]; nextCursor: string | null }
export function fetchOrderHistory(params: URLSearchParams, cursor?: string): Promise<OrderHistoryPage> {
  const query = new URLSearchParams(params);
  query.set('limit', '20');
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/orders/history?${query}`);
}

export type OrderHistoryStatus = Pick<ApiOrder, 'id' | 'status' | 'placed_at' | 'packed_at' | 'picked_up_at' | 'delivered_at' | 'estimated_delivery_minutes' | 'estimated_delivery_at' | 'live_revision'>;
export async function fetchOrderHistoryStatuses(ids: string[]): Promise<OrderHistoryStatus[]> {
  const rows: OrderHistoryStatus[] = [];
  for (let offset = 0; offset < ids.length; offset += 100)
    rows.push(...await apiRequest<OrderHistoryStatus[]>(`/orders/history-status?ids=${ids.slice(offset, offset + 100).join(',')}`));
  return rows;
}
