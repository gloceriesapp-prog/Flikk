// Real GET /partner/payouts + GET /partner/payouts/:id/orders (backend/src/
// routes/partner.ts) — every figure here is jobs/weeklyPayouts.ts's own
// server-computed sum of that store's delivered orders for the week,
// never something this app derives itself (screens/payouts/data.ts's own
// former header note on why: a shop owner needs to trust the total is
// built from real orders, not take it on faith).

import { apiRequest } from './client';

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'blocked' | 'failed';

export interface ApiPayout {
  id: string;
  store_id: string;
  week_start: string; // IST calendar date, "YYYY-MM-DD"
  week_end: string;
  gross_amount: number;
  commission_deducted: number;
  net_payout: number;
  status: PayoutStatus;
  razorpay_payout_id: string | null;
  paid_at: string | null;
  order_count: number;
}

export function fetchPayouts(): Promise<ApiPayout[]> {
  return apiRequest('/partner/payouts');
}

export interface ApiPayoutOrder {
  orderNumber: string;
  deliveredAt: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
}

export function fetchPayoutOrders(payoutId: string): Promise<ApiPayoutOrder[]> {
  return apiRequest(`/partner/payouts/${payoutId}/orders`);
}

export interface PayoutPage { items: ApiPayout[]; nextCursor: string | null }
export function fetchPayoutPage(cursor?: string): Promise<PayoutPage> {
  return apiRequest(`/partner/payouts?page=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
}
export function fetchPayoutOrderPage(payoutId: string, cursor?: string): Promise<{ items: ApiPayoutOrder[]; nextCursor: string | null; summary: { netTotal: number; orderCount: number } }> {
  return apiRequest(`/partner/payouts/${payoutId}/orders?page=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
}
