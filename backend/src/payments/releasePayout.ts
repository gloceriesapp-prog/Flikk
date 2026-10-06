// Real RazorpayX Payouts call (POST /v1/payouts) — the actual money
// movement, separate from Fund Account Validation (verifyPayoutAccount.ts
// confirms an account is real; this sends money to it). Reuses the same
// Fund Account created during that verification (stores.razorpay_fund_account_id)
// rather than creating a new one per payout run.
//
// Provider deduplication uses X-Payout-Idempotency, not reference_id. Durable
// payout work freezes the entire request before the first HTTP attempt.
import { AppError } from '../lib/errors.js';
import { razorpayBasicAuthHeader } from './razorpayClient.js';

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

interface RazorpayPayoutResponse {
  id: string;
  status: string;
  error?: { description: string };
}

export interface ReleasePayoutResult {
  razorpayPayoutId: string;
  status: string;
}

export interface PayoutRequest {
  account_number: string; fund_account_id: string; amount: number;
  currency: 'INR'; mode: 'UPI' | 'IMPS'; purpose: 'payout';
  queue_if_low_balance: boolean; reference_id: string; narration: string;
}
export async function releasePayoutRequest(request: PayoutRequest, idempotencyKey: string): Promise<ReleasePayoutResult> {
  const res = await fetch(`${RAZORPAY_BASE}/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: razorpayBasicAuthHeader(), 'X-Payout-Idempotency': idempotencyKey },
    body: JSON.stringify(request), signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json()) as RazorpayPayoutResponse;
  if (!res.ok) throw new AppError(502, 'PAYOUT_RELEASE_FAILED', data.error?.description ?? 'Could not release this payout.');
  if (!data.id || typeof data.id !== 'string') throw new Error('Invalid payout response');
  return { razorpayPayoutId: data.id, status: data.status };
}
