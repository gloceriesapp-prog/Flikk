// Manual payout write-path validation, shared by the mark-paid and payee
// verification routes (backend/PAYOUTS.md, Admin section). The RPCs
// re-check everything; this only turns bad input into a 400 before it
// reaches the database.

import type { PayoutKind } from '@/lib/types';

export const UTR_PATTERN = /^[A-Za-z0-9]{6,35}$/;
const UUID_PATTERN = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function parseKindAndId(kind: string, id: string): { kind: PayoutKind; id: string } | null {
  if ((kind !== 'store' && kind !== 'rider') || !UUID_PATTERN.test(id)) return null;
  return { kind, id };
}

export interface MarkPaidInput {
  utr: string;
  mode: 'upi' | 'bank_transfer';
  note: string | null;
}

export function parseMarkPaidInput(body: unknown): MarkPaidInput | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const utr = typeof b.utr === 'string' ? b.utr.trim().toUpperCase() : '';
  if (!UTR_PATTERN.test(utr)) return 'UTR must be 6–35 letters or digits.';
  if (b.mode !== 'upi' && b.mode !== 'bank_transfer') return 'Payment mode must be UPI or bank transfer.';
  let note: string | null = null;
  if (b.note !== undefined && b.note !== null) {
    if (typeof b.note !== 'string') return 'Note must be text.';
    note = b.note.trim() || null;
    if (note && note.length > 500) return 'Note can be at most 500 characters.';
  }
  return { utr, mode: b.mode, note };
}

export function parseVerificationInput(body: unknown): { verified: boolean; verifiedName: string | null } | string {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.verified !== 'boolean') return 'verified must be true or false.';
  const name = typeof b.verifiedName === 'string' ? b.verifiedName.trim() : '';
  if (b.verified && (name.length < 2 || name.length > 100)) return 'Enter the name exactly as shown in the UPI app or bank (2–100 characters).';
  return { verified: b.verified, verifiedName: b.verified ? name : null };
}

// RPC raise codes (PAYOUTS.md) -> HTTP status + a message a founder can act on.
const RPC_ERRORS: Record<string, [number, string]> = {
  PAYOUT_ALREADY_PAID: [409, 'This payout is already marked paid with a different UTR.'],
  UTR_ALREADY_USED: [409, 'That UTR is already recorded on another payout — check the reference.'],
  INVALID_UTR: [400, 'UTR must be 6–35 letters or digits.'],
  NOTHING_TO_PAY: [400, 'This payout has nothing to pay (amount is zero).'],
};

export function mapRpcError(err: { message: string; code?: string }): { status: number; error: string } {
  const known = Object.keys(RPC_ERRORS).find((key) => err.message.includes(key));
  if (known) return { status: RPC_ERRORS[known][0], error: RPC_ERRORS[known][1] };
  // Any other RAISE in the RPC (P0001: wrong status, no payout details...) is a business-rule conflict.
  if (err.code === 'P0001') return { status: 409, error: err.message };
  return { status: 500, error: 'Could not save. Try again.' };
}
