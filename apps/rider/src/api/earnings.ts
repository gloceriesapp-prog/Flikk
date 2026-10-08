// GET /rider/earnings — the Earnings tab's single data source. Each row is
// one settled rider_earnings record: a single-store order (isTrip false) or a
// whole multi-stop trip (isTrip true). amount is the combined payout; the
// base vs extra-stop split stored when it was earned comes back as
// baseFee/extraStopFee. status is 'paid' once the weekly payout settles,
// 'pending' until then. deliveredAt drives week bucketing (paid_at is null
// until settlement).

import { apiRequest } from './client';

export interface RiderEarning {
  id: string;
  amount: number;
  status: 'paid' | 'pending';
  paidAt: string | null;
  deliveredAt: string | null;
  orderNumber: string | null;
  // One leg's store for trips; the UI formats a "N-stop trip" label instead
  // when isTrip is true, since one store name isn't meaningful there.
  storeName: string | null;
  isTrip: boolean;
  stopCount: number;
  baseFee: number;
  extraStopFee: number;
}

export async function fetchRiderEarnings(): Promise<RiderEarning[]> {
  return apiRequest<RiderEarning[]>('/rider/earnings');
}

export interface EarningDay { day: string; total: number; base: number; extra: number; orders: number }
export function fetchRiderEarningPage(from: string, until: string, cursor?: string): Promise<{ items: RiderEarning[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ page: '1', from, until });
  if (cursor) params.set('cursor', cursor);
  return apiRequest(`/rider/earnings?${params}`);
}
export function fetchRiderEarningSummary(from: string, until: string): Promise<EarningDay[]> {
  return apiRequest(`/rider/earnings-summary?${new URLSearchParams({ from, until })}`);
}

// GET /rider/cash-balance — cash collected on cash-on-delivery orders that
// the rider still holds (an admin marks it settled once handed over).
export interface RiderCashBalance { outstanding: number; count: number }

export async function fetchRiderCashBalance(): Promise<RiderCashBalance> {
  return apiRequest<RiderCashBalance>('/rider/cash-balance');
}
