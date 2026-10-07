import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../db/supabase.js', () => ({ supabase: {} }));
vi.mock('../customer-experience/authBudget.js', () => ({ authBucket: () => 'k' }));
import { parsePayoutAccountInput, toPayoutAccount, toPayoutPatch } from './payoutAccount.js';

const me = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const proof = `${me}/payout-proof-33333333-3333-4333-8333-333333333333.jpg`;
const bank = { method: 'bank', accountHolderName: 'Ravi Kumar', accountNumber: '123456789012', ifsc: 'hdfc0001234', proofPath: proof };
const fails = (body: unknown) => expect(() => parsePayoutAccountInput(body, me)).toThrow(expect.objectContaining({ status: 400 }));

describe('PayoutAccountInput validation', () => {
  it('accepts good UPI ids and rejects malformed ones', () => {
    expect(parsePayoutAccountInput({ method: 'upi', upiId: ' ravi.k-1_@okaxis ' }, me)).toEqual({ method: 'upi', upiId: 'ravi.k-1_@okaxis' });
    for (const upiId of ['ravi', '@okaxis', 'r@okaxis', 'ravi@ok1', 'ravi@@okaxis', 'ra vi@okaxis', '', 5]) fails({ method: 'upi', upiId });
  });
  it('upper-cases IFSC and validates bank fields', () => {
    expect(parsePayoutAccountInput(bank, me)).toEqual({ ...bank, ifsc: 'HDFC0001234' });
    for (const ifsc of ['HDFC1001234', 'HDF0001234', 'HDFC00012345', '']) fails({ ...bank, ifsc });
    for (const accountNumber of ['12345678', '1234567890123456789', '12345678901a', '']) fails({ ...bank, accountNumber });
    fails({ ...bank, accountHolderName: 'R' });
    fails({ ...bank, accountHolderName: 'x'.repeat(101) });
  });
  it('requires a proof path inside the caller\'s own prefix', () => {
    fails({ ...bank, proofPath: undefined });
    fails({ ...bank, proofPath: proof.replace(me, other) });
    fails({ ...bank, proofPath: `${me}/../${other}/payout-proof-33333333-3333-4333-8333-333333333333.jpg` });
    fails({ ...bank, proofPath: `${me}/payout-proof.jpg` });
  });
  it('rejects unknown methods', () => {
    fails({ method: 'bank_account' });
    fails(null);
  });
});

describe('PayoutAccount mapping', () => {
  it('never returns the full account number and always resets verification on write', () => {
    const account = toPayoutAccount({ payout_method: 'bank', payout_upi_id: null, payout_account_holder_name: 'Ravi', payout_bank_account_number: '123456789012',
      payout_bank_ifsc: 'HDFC0001234', payout_bank_name: null, payout_proof_path: proof, payout_details_status: 'verified', payout_upi_verified_name: 'RAVI KUMAR' });
    expect(account).toMatchObject({ method: 'bank', accountLast4: '9012', hasProof: true, status: 'verified' });
    expect(JSON.stringify(account)).not.toContain('123456789012');
    expect(toPayoutPatch(parsePayoutAccountInput(bank, me))).toMatchObject({ payout_details_status: 'unverified', payout_details_verified_by: null, payout_upi_verified_name: null, payout_method: 'bank' });
    expect(toPayoutPatch({ method: 'upi', upiId: 'a@okaxis' })).toMatchObject({ payout_bank_account_number: null, payout_proof_path: null });
  });
});

describe('migration 102', () => {
  const sql = readFileSync(new URL('../../migrations/102_manual_payouts.sql', import.meta.url), 'utf8');
  it('enforces UTR + snapshot on paid rows and unique UTRs', () => {
    for (const t of ['payouts', 'rider_payouts']) {
      expect(sql).toContain(`ADD CONSTRAINT ${t}_paid_requires_utr CHECK (status <> 'paid' OR (utr IS NOT NULL AND payment_mode IS NOT NULL AND paid_at IS NOT NULL AND payee_snapshot IS NOT NULL))`);
      expect(sql).toContain(`CREATE UNIQUE INDEX IF NOT EXISTS ${t}_utr_unique ON public.${t}(utr) WHERE utr IS NOT NULL`);
    }
  });
  it('removes the old provider release queue and keeps RPCs service-role only', () => {
    expect(sql).toContain('DROP TABLE IF EXISTS public.payout_' + 'release_work');
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.mark_payout_paid[^;]*FROM PUBLIC,anon,authenticated/);
    expect(sql).toContain("REVOKE INSERT, UPDATE, DELETE ON public.stores FROM PUBLIC,anon,authenticated");
    for (const code of ['PAYOUT_ALREADY_PAID', 'UTR_ALREADY_USED', 'INVALID_UTR', 'NOTHING_TO_PAY']) expect(sql).toContain(`MESSAGE='${code}'`);
  });
});
