// GET /rider/payouts — the Payout history screen's single data source. One row
// per rider_payouts record: the weekly payout that actually settled to the
// rider's bank (migration 050). Complements /rider/earnings (per-delivery) with
// the per-weekly-payout view. status mirrors the DB column. Payouts are sent
// manually every Monday (backend/PAYOUTS.md); utr is the bank reference the
// founder recorded on "Mark paid", shown so the rider can match it in their
// bank statement.

import { createPayoutAccountApi, type PayoutRowStatus } from '@gloceries/shared';
import { apiRequest } from './client';

export type RiderPayoutStatus = PayoutRowStatus;

export interface RiderPayout {
  id: string;
  weekStart: string; // "YYYY-MM-DD"
  weekEnd: string; // "YYYY-MM-DD"
  amount: number;
  status: RiderPayoutStatus;
  paidAt: string | null; // ISO, null until status is 'paid'
  utr: string | null;
  paymentMode: 'upi' | 'bank_transfer' | null;
}

export async function fetchRiderPayouts(): Promise<RiderPayout[]> {
  return apiRequest<RiderPayout[]>('/rider/payouts');
}

export function fetchRiderPayoutPage(cursor?: string): Promise<{ items: RiderPayout[]; nextCursor: string | null }> {
  return apiRequest(`/rider/payouts?page=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
}

// GET/PUT /rider/payout-account (backend/PAYOUTS.md).
export const RIDER_PAYOUT_ACCOUNT_QUERY_KEY = ['riderPayoutAccount'] as const;
export const { fetchPayoutAccount, savePayoutAccount } = createPayoutAccountApi(apiRequest, '/rider');
