// Maps to GET /partner/orders and PATCH /orders/:id/status
// (backend/src/routes/partner.ts, routes/orders.ts) — the real order queue
// and the only two status transitions this app can trigger (packed,
// cancelled — see backend/src/lib/orderStateMachine.ts's own note on why
// store_owner owns cancelled too now).

import { apiRequest } from './client';

export interface ApiOrderItem {
  id: string;
  product_id: string;
  product_name_at_order?: string | null;
  product_image_at_order?: string | null;
  quantity: number;
  unit_price_at_order: number;
  unit_at_order?: string | null;
  products: { name: string; unit: string; image_url: string | null } | null;
}

export interface ApiOrder {
  id: string;
  order_number: string;
  // 'failed' = rider couldn't complete the drop after pickup (goods already
  // left the shop) — a real backend terminal status (migration 052,
  // orderStateMachine.ts). Was missing here, so a failed order silently
  // vanished from the store owner's queue; they got zero signal their stock
  // is stranded with a rider. Now surfaced, same as 'cancelled' is skipped.
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
  total: number;
  // Real orders.item_total/commission_amount — the store's commission rate
  // (its own rate, else the platform default) applied server-side at order-creation time,
  // already selected by GET /partner/orders's `select('*', ...)` but never
  // typed/used here until now. This app must never recompute a payout
  // figure client-side (screens/orders/data.ts's own note on the bug this
  // fixes — OrderDetailScreen used to guess a different, wrong commission
  // percent locally).
  item_total: number;
  commission_amount: number;
  // Authoritative COD-vs-online, set at order creation from the customer's
  // actual chosen method (migrations/034_order_payment_method.sql), never
  // inferred. 'cod' = customer pays cash on delivery; 'online' = customer
  // chose to pay online (settled only once provider_payment_id is set).
  payment_method: 'cod' | 'online';
  provider_payment_id: string | null;
  placed_at: string;
  accepted_at?: string | null;
  acceptance_deadline_at?: string | null;
  preparation_deadline_at?: string | null;
  // migration 109 — when the order reached the store (accept window start).
  store_visible_at?: string | null;
  packed_at: string | null;
  delivered_at: string | null;
  order_items: ApiOrderItem[];
  users: { name: string | null; phone: string } | null;
  addresses: { line1: string; landmark: string | null } | null;
}

export type OrderSummary = Pick<ApiOrder, 'id' | 'order_number' | 'status' | 'total' | 'placed_at'>;
export interface OrderPage<T = ApiOrder> { items: T[]; nextCursor: string | null }
function orderPagePath(options: { cursor?: string | null; history?: boolean; search?: string; status?: string }): string {
  const params = new URLSearchParams({ view: options.history ? 'history' : 'queue', page: '1', limit: '100' });
  if (options.history) params.set('summary', '1');
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.search) params.set('search', options.search);
  if (options.status) params.set('status', options.status);
  return `/partner/orders?${params}`;
}
export function fetchOrderPage(options: { cursor?: string | null } = {}): Promise<OrderPage> {
  return apiRequest(orderPagePath(options));
}
export function fetchOrderHistoryPage(options: { cursor?: string | null; search?: string; status?: string } = {}): Promise<OrderPage<OrderSummary>> {
  return apiRequest(orderPagePath({ ...options, history: true }));
}
export async function fetchOrders(): Promise<ApiOrder[] & { nextCursor?: string | null }> {
  const page = await fetchOrderPage();
  return Object.assign(page.items, { nextCursor: page.nextCursor });
}
export function fetchOrderUpdates(): Promise<{ version: string; hasMore: boolean }> {
  return apiRequest('/partner/orders/updates');
}

// reason: a STORE_REJECT_REASONS code (@gloceries/shared) for a reject, or
// 'store_no_response' for the auto-reject; stored as orders.cancel_reason.
export function updateOrderStatus(orderId: string, status: 'packed' | 'cancelled', reason?: string): Promise<ApiOrder> {
  return apiRequest(`/orders/${orderId}/status`, { method: 'PATCH', body: reason ? { status, reason } : { status } });
}

export function acceptOrder(orderId: string): Promise<ApiOrder> {
  return apiRequest(`/partner/orders/${encodeURIComponent(orderId)}/accept`, { method: 'POST' });
}

export function fetchOrderDetail(orderId: string): Promise<ApiOrder> {
  return apiRequest(`/partner/orders/${encodeURIComponent(orderId)}`);
}

export function fetchOrderTransitions(ids: string[]): Promise<ApiOrder[]> {
  return apiRequest(`/partner/orders/transitions?${new URLSearchParams({ ids: ids.join(',') })}`);
}
