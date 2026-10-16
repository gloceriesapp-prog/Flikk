// Payout-account contract (backend/PAYOUTS.md) — types, the exact contract
// regexes, and the client-side form validation partner + rider both run
// before PUT /{partner|rider}/payout-account. Server re-validates; this only
// saves a round-trip and gives per-field messages. When enabled on the
// server, a saved UPI ID is checked with the bank (backend lib/
// upiVerification.ts); the apps never talk to the verification provider.

export type PayoutMethod = 'upi' | 'bank';

export type PayoutAccountInput =
  | { method: 'upi'; upiId: string }
  | { method: 'bank'; accountHolderName: string; accountNumber: string; ifsc: string; bankName?: string; proofPath: string };

export interface PayoutAccount {
  method: PayoutMethod | null;
  upiId: string | null;
  accountHolderName: string | null;
  accountLast4: string | null; // full number is never returned to clients
  ifsc: string | null;
  bankName: string | null;
  hasProof: boolean;
  status: 'unverified' | 'verified';
  verifiedName: string | null;
}

// Result of the automatic UPI check, on PUT responses only.
export type PayoutVerification =
  | { outcome: 'verified' | 'name_mismatch'; nameAtBank: string }
  | { outcome: 'already_verified' | 'unavailable' | 'skipped' };

export type SavedPayoutAccount = PayoutAccount & { verification?: PayoutVerification };

// Error code PUT answers with when the bank says the UPI ID doesn't exist.
export const UPI_NOT_FOUND_CODE = 'UPI_NOT_FOUND';

// What to tell the owner/rider right after saving. tone drives the colour.
export function payoutSaveMessage(saved: SavedPayoutAccount): { tone: 'success' | 'info'; title: string; body: string } {
  const v = saved.verification;
  if (v?.outcome === 'verified' || v?.outcome === 'already_verified') {
    const name = v.outcome === 'verified' ? v.nameAtBank : saved.verifiedName;
    return { tone: 'success', title: 'UPI ID verified', body: name ? `Payouts will go to ${name}.` : 'Payouts will go to this UPI ID.' };
  }
  if (v?.outcome === 'name_mismatch') {
    return {
      tone: 'info',
      title: 'Saved, name under review',
      body: `This UPI ID belongs to ${v.nameAtBank}. If that isn't you, change it now. Otherwise Gloceries will confirm it before your first payout.`,
    };
  }
  return { tone: 'info', title: 'Payout details saved', body: 'Gloceries will confirm the account name before your first payout.' };
}

// Status set for both payouts and rider_payouts ('processing' is gone).
export type PayoutRowStatus = 'pending' | 'paid' | 'blocked' | 'failed';

export const UPI_ID_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
export const ACCOUNT_NUMBER_RE = /^\d{9,18}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export interface PayoutFormValues {
  method: PayoutMethod;
  upiId: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  bankName: string;
  proofPath: string | null;
}

export type PayoutFormErrors = Partial<Record<keyof PayoutFormValues, string>>;

export const EMPTY_PAYOUT_FORM: PayoutFormValues = {
  method: 'upi',
  upiId: '',
  accountHolderName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifsc: '',
  bankName: '',
  proofPath: null,
};

export function validatePayoutForm(v: PayoutFormValues): { errors: PayoutFormErrors; input: PayoutAccountInput | null } {
  const errors: PayoutFormErrors = {};
  if (v.method === 'upi') {
    const upiId = v.upiId.trim();
    if (!UPI_ID_RE.test(upiId)) errors.upiId = 'Enter a valid UPI ID, e.g. name@okhdfcbank';
    return { errors, input: errors.upiId ? null : { method: 'upi', upiId } };
  }

  const accountHolderName = v.accountHolderName.trim();
  const accountNumber = v.accountNumber.trim();
  const ifsc = v.ifsc.trim().toUpperCase();
  const bankName = v.bankName.trim();
  if (accountHolderName.length < 2 || accountHolderName.length > 100) errors.accountHolderName = 'Enter the name exactly as on the bank account';
  if (!ACCOUNT_NUMBER_RE.test(accountNumber)) errors.accountNumber = 'Account number must be 9–18 digits';
  if (v.confirmAccountNumber.trim() !== accountNumber) errors.confirmAccountNumber = 'Account numbers don’t match';
  if (!IFSC_RE.test(ifsc)) errors.ifsc = 'Enter a valid 11-character IFSC, e.g. HDFC0001234';
  if (!v.proofPath) errors.proofPath = 'Add a photo of a cancelled cheque or passbook first page';
  if (Object.keys(errors).length > 0) return { errors, input: null };
  return {
    errors,
    input: { method: 'bank', accountHolderName, accountNumber, ifsc, ...(bankName ? { bankName } : {}), proofPath: v.proofPath! },
  };
}

// Pill copy shared by both apps' payout-details card.
export function payoutAccountStatusLabel(account: Pick<PayoutAccount, 'status' | 'verifiedName' | 'method'>): string {
  if (account.status === 'verified') return `Verified ✓ ${account.verifiedName ?? ''}`.trim();
  // An unverified UPI ID with a name = the bank check found it under a
  // different name than the owner's; Gloceries reviews it.
  if (account.method === 'upi' && account.verifiedName) return `Under review — bank name ${account.verifiedName}`;
  return 'Unverified — we confirm the name when we send your first payout';
}

type ApiRequest = <T>(path: string, options?: { method?: 'GET' | 'PUT'; body?: unknown }) => Promise<T>;

export function createPayoutAccountApi(apiRequest: ApiRequest, prefix: '/partner' | '/rider') {
  return {
    fetchPayoutAccount: () => apiRequest<PayoutAccount>(`${prefix}/payout-account`),
    savePayoutAccount: (input: PayoutAccountInput) => apiRequest<SavedPayoutAccount>(`${prefix}/payout-account`, { method: 'PUT', body: input }),
  };
}
