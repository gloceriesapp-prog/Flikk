// Server-only — same RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET this admin app's
// own lib/razorpay/balance.ts already uses (same Razorpay account
// backend/.env.local's own keys point at). Refund creation/retry lives
// here rather than proxying through the Express backend — this app
// already calls Razorpay directly for RazorpayX balance, no existing
// admin-to-backend service call exists anywhere in this codebase, and
// standing one up just for this would be more new surface area than
// reusing the same direct-call pattern already established.
//
// The idempotency check below MUST stay in sync with backend's own
// mirror of this exact same logic (backend/src/payments/refundPayment.ts)
// — both are independent entry points that can create a refund against
// the same Razorpay payment (a customer's own cancel, and a founder's
// manual retry here), and both must agree on "has this already been
// refunded" before ever calling payments.refund. If one changes, check
// the other.

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

export type RefundStatus = 'processing' | 'completed' | 'failed';

export interface RefundResult {
  status: RefundStatus;
  razorpayRefundId: string | null;
}

interface RazorpayRefund {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
}

function authHeader(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not set.');
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

// Pure decision, split out so the money logic is unit-testable without a
// network call (refund.check.mts). Given Razorpay's own refund records for a
// payment and the requested paise: is this payment ALREADY refunded for at
// least that amount? null → a new refund still has to be created.
//
// The load-bearing rule: EXCLUDE status:'failed' items. A failed Razorpay
// refund still carries its requested `amount` but moved no money, so summing
// it made a Retry (or a re-cancel on the backend mirror) wrongly conclude
// "already refunded" and skip creating a real one — the customer stayed
// unpaid. Dropping failed items from the sum is what makes Retry actually
// retry. Keep in sync with backend/src/payments/refundPayment.ts.
export function resolveExistingRefund(items: RazorpayRefund[], amountPaise: number): RefundResult | null {
  const settled = items.filter((r) => r.status !== 'failed');
  const alreadyRefundedPaise = settled.reduce((sum, r) => sum + r.amount, 0);
  if (alreadyRefundedPaise < amountPaise) return null;

  // settled is non-empty here (sum >= amountPaise > 0) and never holds a
  // failed item, so match.status is only ever 'processed' | 'pending'.
  const processed = settled.find((r) => r.status === 'processed');
  const match = processed ?? settled[settled.length - 1];
  return {
    status: match?.status === 'processed' ? 'completed' : 'processing',
    razorpayRefundId: match?.id ?? null,
  };
}

async function findExistingRefund(razorpayPaymentId: string, amountPaise: number): Promise<RefundResult | null> {
  const res = await fetch(`${RAZORPAY_BASE}/payments/${razorpayPaymentId}/refunds`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) throw new Error(`Razorpay fetch-refunds failed (${res.status}).`);

  const data = (await res.json()) as { items: RazorpayRefund[] };
  return resolveExistingRefund(data.items, amountPaise);
}

// Real retry for an order whose refund_status is 'failed' — a founder
// tapping "Retry" in the Refunds tab. Checks Razorpay's own record of
// this payment's refunds first (see this file's own header note on why)
// before ever creating a new one.
export async function retryRefund(razorpayPaymentId: string, amountRupees: number): Promise<RefundResult> {
  const amountPaise = Math.round(amountRupees * 100);

  const existing = await findExistingRefund(razorpayPaymentId, amountPaise);
  if (existing) return existing;

  const res = await fetch(`${RAZORPAY_BASE}/payments/${razorpayPaymentId}/refund`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise }),
  });
  const data = (await res.json()) as RazorpayRefund & { error?: { description?: string } };
  if (!res.ok) throw new Error(data.error?.description ?? `Razorpay refund failed (${res.status}).`);

  return {
    status: data.status === 'processed' ? 'completed' : data.status === 'failed' ? 'failed' : 'processing',
    razorpayRefundId: data.id,
  };
}
