// Maps to GET /partner/orders and PATCH /orders/:id/status
// (backend/src/routes/partner.ts, routes/orders.ts) — the real order queue
// and the only two status transitions this app can trigger (packed,
// cancelled — see backend/src/lib/orderStateMachine.ts's own note on why
// store_owner owns cancelled too now).

import { apiRequest } from './client';

export interface ApiOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_at_order: number;
  products: { name: string; unit: string; image_url: string | null } | null;
}

export interface ApiOrder {
  id: string;
  order_number: string;
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total: number;
  // Real orders.item_total/commission_amount — backend/src/lib/pricing.ts's
  // own COMMISSION_RATE (6%) applied server-side at order-creation time,
  // already selected by GET /partner/orders's `select('*', ...)` but never
  // typed/used here until now. This app must never recompute a payout
  // figure client-side (screens/orders/data.ts's own note on the bug this
  // fixes — OrderDetailScreen used to guess a different, wrong commission
  // percent locally).
  item_total: number;
  commission_amount: number;
  razorpay_payment_id: string | null;
  placed_at: string;
  packed_at: string | null;
  delivered_at: string | null;
  order_items: ApiOrderItem[];
  users: { name: string | null; phone: string } | null;
  addresses: { line1: string; landmark: string | null } | null;
}

export function fetchOrders(): Promise<ApiOrder[]> {
  return apiRequest('/partner/orders');
}

export function updateOrderStatus(orderId: string, status: 'packed' | 'cancelled'): Promise<ApiOrder> {
  return apiRequest(`/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
}
