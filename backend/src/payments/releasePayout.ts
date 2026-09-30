// Real RazorpayX Payouts call (POST /v1/payouts) — the actual money
// movement, separate from Fund Account Validation (verifyPayoutAccount.ts
// confirms an account is real; this sends money to it). Reuses the same
// Fund Account created during that verification (stores.razorpay_fund_account_id)
// rather than creating a new one per payout run.
//
// reference_id is always our own payouts.id — that's what makes a
// retried weekly job idempotent on Razorpay's side too: if the same
// payout row's release is ever attempted twice (a crashed job retried,
// for example), Razorpay itself rejects the duplicate reference_id rather
// than silently paying a store twice. jobs/weeklyPayouts.ts is the only
// caller; it never re-releases a row that already left 'pending'.
import { env } from '../config/env.js';
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

export async function releasePayout(
  fundAccountId: string,
  amountRupees: number,
  mode: 'UPI' | 'IMPS',
  referenceId: string,
): Promise<ReleasePayoutResult> {
  if (!env.razorpayxAccountNumber) {
    throw new AppError(503, 'RAZORPAYX_NOT_CONFIGURED', "Payout release needs a RazorpayX current account, which isn't set up on this server yet.");
  }

  const res = await fetch(`${RAZORPAY_BASE}/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: razorpayBasicAuthHeader() },
    body: JSON.stringify({
      account_number: env.razorpayxAccountNumber,
      fund_account_id: fundAccountId,
      amount: Math.round(amountRupees * 100),
      currency: 'INR',
      mode,
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: referenceId,
      narration: 'Gloceries weekly settlement',
    }),
  });
  const data = (await res.json()) as RazorpayPayoutResponse;
  if (!res.ok) throw new AppError(502, 'PAYOUT_RELEASE_FAILED', data.error?.description ?? 'Could not release this payout.');

  return { razorpayPayoutId: data.id, status: data.status };
}
