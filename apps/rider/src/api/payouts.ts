// GET /rider/payouts — the Payout history screen's single data source. One row
// per rider_payouts record: the weekly payout that actually settled to the
// rider's bank (migration 050). Complements /rider/earnings (per-delivery) with
// the per-weekly-payout view. status mirrors the DB column; razorpayPayoutId is
// a reference the rider can quote to support, null until a payout is created.

import { apiRequest } from './client';

export type RiderPayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'blocked';

export interface RiderPayout {
  id: string;
  weekStart: string; // "YYYY-MM-DD"
  weekEnd: string; // "YYYY-MM-DD"
  amount: number;
  status: RiderPayoutStatus;
  paidAt: string | null; // ISO, null until status is 'paid'
  razorpayPayoutId: string | null;
}

export async function fetchRiderPayouts(): Promise<RiderPayout[]> {
  return apiRequest<RiderPayout[]>('/rider/payouts');
}

export function fetchRiderPayoutPage(cursor?: string): Promise<{ items: RiderPayout[]; nextCursor: string | null }> {
  return apiRequest(`/rider/payouts?page=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
}
