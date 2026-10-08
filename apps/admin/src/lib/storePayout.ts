// The store's REAL payout destination — the payout_* columns that
// backend/src/lib/payoutAccount.ts writes (PUT /partner/payout-account) and
// mark_payout_paid snapshots — never the legacy bank_name/bank_account_last4.
// The full account number never leaves the server: only last 4.

export const STORE_PAYOUT_SELECT =
  'payout_method, payout_upi_id, payout_account_holder_name, payout_bank_account_number, payout_bank_ifsc, payout_bank_name, payout_proof_path, payout_details_status, payout_upi_verified_name, payout_details_verified_at';

export interface StorePayoutView {
  method: 'upi' | 'bank' | null;
  upiId: string | null;
  accountHolderName: string | null;
  accountLast4: string | null;
  ifsc: string | null;
  bankName: string | null;
  hasProof: boolean;
  status: 'verified' | 'unverified';
  verifiedName: string | null;
  verifiedAt: string | null;
}

export function toStorePayoutView(row: Record<string, string | null> | null): StorePayoutView {
  const r = row ?? {};
  const method = r.payout_method === 'upi' ? 'upi' : r.payout_method === 'bank' || r.payout_method === 'bank_account' ? 'bank' : null;
  return {
    method,
    upiId: r.payout_upi_id ?? null,
    accountHolderName: r.payout_account_holder_name ?? null,
    accountLast4: r.payout_bank_account_number ? r.payout_bank_account_number.slice(-4) : null,
    ifsc: r.payout_bank_ifsc ?? null,
    bankName: r.payout_bank_name ?? null,
    hasProof: Boolean(r.payout_proof_path),
    status: r.payout_details_status === 'verified' ? 'verified' : 'unverified',
    verifiedName: r.payout_upi_verified_name ?? null,
    verifiedAt: r.payout_details_verified_at ?? null,
  };
}

export type StorePayoutInput =
  | { method: 'upi'; upiId: string }
  | { method: 'bank'; accountHolderName: string; accountNumber: string; ifsc: string; bankName?: string };

// Same formats as backend/src/lib/payoutAccount.ts; the RPC re-checks them.
export function parseStorePayoutInput(body: unknown): StorePayoutInput | string {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  if (b.method === 'upi') {
    const upiId = text(b.upiId);
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId) ? { method: 'upi', upiId } : 'Enter a valid UPI ID, e.g. name@okaxis.';
  }
  if (b.method !== 'bank') return 'Choose UPI or bank account.';
  const accountHolderName = text(b.accountHolderName);
  const accountNumber = text(b.accountNumber);
  const ifsc = text(b.ifsc).toUpperCase();
  const bankName = text(b.bankName);
  if (accountHolderName.length < 2 || accountHolderName.length > 100) return 'Account holder name must be 2–100 characters.';
  if (!/^\d{9,18}$/.test(accountNumber)) return 'Account number must be 9–18 digits.';
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return 'Enter a valid 11-character IFSC, e.g. HDFC0001234.';
  if (bankName.length > 100) return 'Bank name must be at most 100 characters.';
  return { method: 'bank', accountHolderName, accountNumber, ifsc, ...(bankName ? { bankName } : {}) };
}
