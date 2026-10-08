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
  // Real orders.item_total/commission_amount — backend/src/lib/pricing.ts's
  // own COMMISSION_RATE (6%) applied server-side at order-creation time,
  // already selected by GET /partner/orders's `select('*', ...)` but never
  // typed/used here until now. This app must never recompute a payout
  // figure client-side (screens/orders/data.ts's own note on the bug this
  // fixes — OrderDetailScreen used to guess a different, wrong commission
  // percent locally).
  item_total: number;
  commission_amount: number;
  provider_payment_id: string | null;
  placed_at: string;
  // migration 109 — when the order reached the store (accept window start).
  store_visible_at?: string | null;
  packed_at: string | null;
  delivered_at: string | null;
  order_items: ApiOrderItem[];
  users: { name: string | null; phone: string } | null;
  addresses: { line1: string; landmark: string | null } | null;
}

export async function fetchOrders(): Promise<ApiOrder[]> {
  const result: ApiOrder[] = [];
  let cursor: string | null = null;
  do {
    const page: { items: ApiOrder[]; nextCursor: string | null } = await apiRequest(`/partner/orders?view=queue&page=1&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    result.push(...page.items); cursor = page.nextCursor;
  } while (cursor);
  return result;
}

export function updateOrderStatus(orderId: string, status: 'packed' | 'cancelled'): Promise<ApiOrder> {
  return apiRequest(`/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
}
