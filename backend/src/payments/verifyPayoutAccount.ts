// Real RazorpayX Fund Account Validation for a payout destination — POST
// /partner/verify-payout (routes/partner.ts). Two methods, same
// underlying flow: Contact -> Fund Account -> Validation transaction (a
// real ~₹1 penny-drop) -> poll until the bank/PSP responds. UPI VPA
// validation used to have a simpler standalone endpoint
// ("/v1/payments/validate/vpa") but NPCI retired UPI Collect 28 Feb 2026
// and took it with it; this heavier flow is the real replacement for
// both UPI and bank account + IFSC now.
//
// Needs env.razorpayxAccountNumber (Flikk's own RazorpayX current
// account, debited for the penny-drop) — throws a clear, specific error
// if unset rather than a confusing downstream Razorpay 4xx, since that's
// exactly the state this project is in right now (ticket pending).
//
// No SDK support for any of these three calls (razorpay npm package
// 2.9.4 has no `contacts`/`fundAccount.create`/`fundAccount.validation`
// methods) — same "direct authenticated REST call" pattern as
// createUpiIntent.ts.
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { razorpayBasicAuthHeader } from './razorpayClient.js';

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

// Real bank/PSP response usually lands within a few seconds; capped well
// past that so a slow validation still completes rather than the request
// just hanging indefinitely.
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15; // ~30s ceiling

export type PayoutAccountInput =
  | { method: 'upi'; vpa: string }
  // accountHolderName is the name AS TYPED by the owner — Razorpay
  // returns the real registered_name regardless, and name_match_score
  // (surfaced to the caller) is exactly the comparison between the two,
  // so a store owner who fat-fingers their own name still gets a real
  // signal something's off instead of it being silently accepted.
  | { method: 'bank_account'; accountNumber: string; ifsc: string; accountHolderName: string };

interface RazorpayContact {
  id: string;
  error?: { description: string };
}

interface RazorpayFundAccount {
  id: string;
  error?: { description: string };
}

interface RazorpayValidation {
  id: string;
  status: 'created' | 'completed' | 'failed';
  validation_results?: {
    account_status: string;
    registered_name: string | null;
    name_match_score?: number;
    bank_account?: {
      bank_name: string;
      bank_routing_code: string;
      account_number: string;
      account_type: string;
    };
  };
  error?: { description: string };
}

async function razorpayFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${RAZORPAY_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: razorpayBasicAuthHeader() },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: { description: string } };
  if (!res.ok) throw new AppError(502, 'RAZORPAYX_REQUEST_FAILED', data.error?.description ?? 'Razorpay request failed.');
  return data;
}

export interface PayoutVerificationResult {
  registeredName: string | null;
  accountStatus: string;
  bankName: string | null;
  accountType: string | null;
  maskedAccountNumber: string | null;
  bankIfsc: string | null;
  nameMatchScore: number | null;
}

// contactId is cached on stores.razorpay_contact_id by the caller
// (routes/partner.ts) so a repeat verification (a different UPI ID, or
// switching to bank account) reuses the same Contact instead of creating
// a new one on Razorpay's side every single time.
export async function verifyPayoutAccount(
  input: PayoutAccountInput,
  ownerName: string,
  ownerPhone: string | null,
  existingContactId: string | null,
): Promise<{ result: PayoutVerificationResult; contactId: string; fundAccountId: string }> {
  if (!env.razorpayxAccountNumber) {
    throw new AppError(
      503,
      'RAZORPAYX_NOT_CONFIGURED',
      "Real payout verification needs a RazorpayX current account, which isn't set up on this server yet.",
    );
  }

  const contactId =
    existingContactId ??
    (
      await razorpayFetch<RazorpayContact>('/contacts', {
        name: ownerName || 'Flikk store owner',
        contact: ownerPhone ?? undefined,
        type: 'vendor',
      })
    ).id;

  const fundAccount = await razorpayFetch<RazorpayFundAccount>(
    '/fund_accounts',
    input.method === 'upi'
      ? { contact_id: contactId, account_type: 'vpa', vpa: { address: input.vpa } }
      : {
          contact_id: contactId,
          account_type: 'bank_account',
          bank_account: { name: input.accountHolderName, ifsc: input.ifsc, account_number: input.accountNumber },
        },
  );

  const created = await razorpayFetch<RazorpayValidation>('/fund_accounts/validations', {
    account_number: env.razorpayxAccountNumber,
    fund_account: { id: fundAccount.id },
    amount: 100, // ₹1 penny-drop, in paise
    currency: 'INR',
    notes: { purpose: 'flikk_partner_payout_verification' },
  });

  let validation = created;
  for (let attempt = 0; validation.status === 'created' && attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const res = await fetch(`${RAZORPAY_BASE}/fund_accounts/validations/${validation.id}`, {
      headers: { Authorization: razorpayBasicAuthHeader() },
    });
    validation = (await res.json()) as RazorpayValidation;
  }

  const failureCode = input.method === 'upi' ? 'UPI_INVALID' : 'BANK_ACCOUNT_INVALID';
  const failureMessage =
    input.method === 'upi'
      ? "This UPI ID couldn't be verified — double-check it's correct."
      : "This bank account couldn't be verified — double-check the account number and IFSC.";

  if (validation.status !== 'completed') {
    throw new AppError(
      validation.status === 'failed' ? 400 : 504,
      validation.status === 'failed' ? failureCode : 'PAYOUT_VERIFY_TIMEOUT',
      validation.status === 'failed' ? failureMessage : 'Verification is taking longer than expected. Please try again in a moment.',
    );
  }

  const bank = validation.validation_results?.bank_account;
  return {
    contactId,
    fundAccountId: fundAccount.id,
    result: {
      registeredName: validation.validation_results?.registered_name ?? null,
      accountStatus: validation.validation_results?.account_status ?? 'unknown',
      bankName: bank?.bank_name ?? null,
      accountType: bank?.account_type ?? null,
      maskedAccountNumber: bank?.account_number ?? null,
      bankIfsc: bank?.bank_routing_code ?? (input.method === 'bank_account' ? input.ifsc : null),
      nameMatchScore: validation.validation_results?.name_match_score ?? null,
    },
  };
}
