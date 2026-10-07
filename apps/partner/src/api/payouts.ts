// Real GET /partner/payouts + GET /partner/payouts/:id/orders (backend/src/
// routes/partner.ts) — every figure here is jobs/weeklyPayouts.ts's own
// server-computed sum of that store's delivered orders for the week,
// never something this app derives itself (screens/payouts/data.ts's own
// former header note on why: a shop owner needs to trust the total is
// built from real orders, not take it on faith).

import { createPayoutAccountApi, type PayoutRowStatus } from '@gloceries/shared';
import { apiRequest } from './client';

export type PayoutStatus = PayoutRowStatus;

export interface ApiPayout {
  id: string;
  store_id: string;
  week_start: string; // IST calendar date, "YYYY-MM-DD"
  week_end: string;
  gross_amount: number;
  commission_deducted: number;
  net_payout: number;
  status: PayoutStatus;
  paid_at: string | null;
  order_count: number;
  // backend/PAYOUTS.md: bank reference the founder entered on "Mark paid",
  // shown so the owner can match it in their bank statement.
  utr?: string | null;
  paymentMode?: 'upi' | 'bank_transfer' | null;
  paidAt?: string | null;
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

// GET/PUT /partner/payout-account (backend/PAYOUTS.md). Manual weekly
// payouts — saving details never contacts a bank; the founder confirms the
// payee name when sending the first payout.
export const PAYOUT_ACCOUNT_QUERY_KEY = ['payoutAccount'] as const;
export const { fetchPayoutAccount, savePayoutAccount } = createPayoutAccountApi(apiRequest, '/partner');

// Cancelled cheque / passbook photo — private store-documents bucket, object
// PATH out (never a public URL), sent back as PUT's proofPath.
export function uploadPayoutProof(base64: string): Promise<{ path: string }> {
  return apiRequest('/partner/store-document-photo', { method: 'POST', body: { base64, kind: 'payout-proof' } });
}
