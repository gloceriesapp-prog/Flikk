// Manual payout destinations (backend/PAYOUTS.md). Store owners and riders
// save UPI or bank details; nothing is verified automatically. The founder
// checks the name in their UPI/bank app before paying and flags it verified
// in admin. Any write here resets that flag (migration 102 trigger + patch).
import type { RequestHandler } from 'express';
import { supabase } from '../db/supabase.js';
import { authBucket } from '../customer-experience/authBudget.js';
import { AppError } from './errors.js';
import type { AuthedRequest } from '../middleware/auth.js';

export type PayoutAccountInput =
  | { method: 'upi'; upiId: string }
  | { method: 'bank'; accountHolderName: string; accountNumber: string; ifsc: string; bankName?: string; proofPath: string };

export interface PayoutAccount {
  method: 'upi' | 'bank' | null;
  upiId: string | null;
  accountHolderName: string | null;
  accountLast4: string | null;
  ifsc: string | null;
  bankName: string | null;
  hasProof: boolean;
  status: 'unverified' | 'verified';
  verifiedName: string | null;
}

const UPI = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const ACCOUNT = /^\d{9,18}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Same shape media/privateDocuments.ts writes: <userId>/<kind>-<uuid>.jpg
const DOC_FILE = /^[a-z][a-z-]{0,30}-[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}\.jpg$/;

const bad = (message: string) => new AppError(400, 'INVALID_PAYOUT_ACCOUNT', message);
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Strict validation of PayoutAccountInput; proofPath must sit under the caller's own prefix. */
export function parsePayoutAccountInput(body: unknown, userId: string): PayoutAccountInput {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (b.method === 'upi') {
    const upiId = text(b.upiId);
    if (!UPI.test(upiId)) throw bad('Enter a valid UPI ID, e.g. name@okaxis.');
    return { method: 'upi', upiId };
  }
  if (b.method !== 'bank') throw bad('method must be "upi" or "bank".');
  const accountHolderName = text(b.accountHolderName);
  const accountNumber = text(b.accountNumber);
  const ifsc = text(b.ifsc).toUpperCase();
  const bankName = text(b.bankName);
  const proofPath = text(b.proofPath);
  if (accountHolderName.length < 2 || accountHolderName.length > 100) throw bad('Account holder name must be 2–100 characters.');
  if (!ACCOUNT.test(accountNumber)) throw bad('Account number must be 9–18 digits.');
  if (!IFSC.test(ifsc)) throw bad('Enter a valid 11-character IFSC, e.g. HDFC0001234.');
  if (b.bankName !== undefined && b.bankName !== null && (typeof b.bankName !== 'string' || bankName.length > 100)) throw bad('Bank name must be at most 100 characters.');
  const prefix = `${userId}/`;
  if (!proofPath.startsWith(prefix) || !DOC_FILE.test(proofPath.slice(prefix.length))) {
    throw bad('Upload a cancelled cheque or passbook photo first.');
  }
  return { method: 'bank', accountHolderName, accountNumber, ifsc, ...(bankName ? { bankName } : {}), proofPath };
}

/** The uploaded proof must really exist: media_assets is only marked ready after the storage upload succeeds. */
export async function assertProofUploaded(bucket: 'store-documents' | 'rider-documents', path: string, userId: string): Promise<void> {
  const { data, error } = await supabase.from('media_assets').select('id')
    .eq('bucket', bucket).eq('object_key', path).eq('uploaded_by', userId).eq('status', 'ready').maybeSingle();
  if (error) throw error;
  if (!data) throw bad('Upload a cancelled cheque or passbook photo first.');
}

export function toPayoutPatch(input: PayoutAccountInput): Record<string, unknown> {
  const reset = { payout_details_status: 'unverified', payout_details_verified_at: null, payout_details_verified_by: null, payout_upi_verified_name: null };
  return input.method === 'upi'
    ? { ...reset, payout_method: 'upi', payout_upi_id: input.upiId, payout_account_holder_name: null, payout_bank_account_number: null,
        payout_bank_ifsc: null, payout_bank_name: null, payout_proof_path: null }
    : { ...reset, payout_method: 'bank', payout_upi_id: null, payout_account_holder_name: input.accountHolderName,
        payout_bank_account_number: input.accountNumber, payout_bank_ifsc: input.ifsc, payout_bank_name: input.bankName ?? null,
        payout_proof_path: input.proofPath };
}

export const PAYOUT_ACCOUNT_COLUMNS =
  'payout_method, payout_upi_id, payout_account_holder_name, payout_bank_account_number, payout_bank_ifsc, payout_bank_name, payout_proof_path, payout_details_status, payout_upi_verified_name';

type Row = Record<string, string | null>;
export function toPayoutAccount(row: Row): PayoutAccount {
  const method = row.payout_method === 'upi' ? 'upi' : row.payout_method === 'bank' || row.payout_method === 'bank_account' ? 'bank' : null;
  return {
    method,
    upiId: row.payout_upi_id ?? null,
    accountHolderName: row.payout_account_holder_name ?? null,
    accountLast4: row.payout_bank_account_number ? row.payout_bank_account_number.slice(-4) : null,
    ifsc: row.payout_bank_ifsc ?? null,
    bankName: row.payout_bank_name ?? null,
    hasProof: Boolean(row.payout_proof_path),
    status: row.payout_details_status === 'verified' ? 'verified' : 'unverified',
    verifiedName: row.payout_upi_verified_name ?? null,
  };
}

// Durable per-account quota (shared across replicas), same RPC as uploads.
export const payoutAccountBudget: RequestHandler = async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase.rpc('claim_auth_budget', { p_buckets: [{ key: authBucket('payout-account', req.user!.id), limit: 10 }] });
    if (error || !Number.isSafeInteger(data) || data < 0) throw new AppError(503, 'PAYOUT_ACCOUNT_UNAVAILABLE', 'Saving payout details is temporarily unavailable.');
    if (data > 0) {
      res.set('Retry-After', String(data));
      throw new AppError(429, 'PAYOUT_ACCOUNT_RATE_LIMITED', 'Please wait before changing payout details again.');
    }
    next();
  } catch (error) { next(error); }
};

/** Shared GET/PUT for partner (stores.id) and rider (riders.user_id). */
export async function readPayoutAccount(table: 'stores' | 'riders', key: 'id' | 'user_id', value: string): Promise<PayoutAccount> {
  const { data, error } = await supabase.from(table).select(PAYOUT_ACCOUNT_COLUMNS).eq(key, value).maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'PAYEE_NOT_FOUND', 'No payout profile for this account.');
  return toPayoutAccount(data as unknown as Row);
}

export async function writePayoutAccount(table: 'stores' | 'riders', key: 'id' | 'user_id', value: string, body: unknown, userId: string): Promise<PayoutAccount> {
  const input = parsePayoutAccountInput(body, userId);
  if (input.method === 'bank') await assertProofUploaded(table === 'stores' ? 'store-documents' : 'rider-documents', input.proofPath, userId);
  const { data, error } = await supabase.from(table).update(toPayoutPatch(input)).eq(key, value).select(PAYOUT_ACCOUNT_COLUMNS).maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(404, 'PAYEE_NOT_FOUND', 'No payout profile for this account.');
  return toPayoutAccount(data as unknown as Row);
}
