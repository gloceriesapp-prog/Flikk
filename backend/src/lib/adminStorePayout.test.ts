import { expect, it } from 'vitest';
import { parseStorePayoutInput, toStorePayoutView } from '../../../apps/admin/src/lib/storePayout';

it('accepts the same UPI and bank formats as the partner payout API', () => {
  expect(parseStorePayoutInput({ method: 'upi', upiId: ' shop@okaxis ' })).toEqual({ method: 'upi', upiId: 'shop@okaxis' });
  expect(parseStorePayoutInput({ method: 'bank', accountHolderName: 'Owner', accountNumber: '123456789012', ifsc: 'hdfc0001234' }))
    .toEqual({ method: 'bank', accountHolderName: 'Owner', accountNumber: '123456789012', ifsc: 'HDFC0001234' });
  for (const bad of [null, {}, { method: 'upi', upiId: 'nope' }, { method: 'bank', accountHolderName: 'O', accountNumber: '1', ifsc: 'X' },
    { method: 'bank', accountHolderName: 'Owner', accountNumber: '123456789012', ifsc: 'HDFC1001234' }])
    expect(typeof parseStorePayoutInput(bad)).toBe('string');
});

it('shows the real payout columns masked, never the full account number', () => {
  const view = toStorePayoutView({ payout_method: 'bank', payout_bank_account_number: '123456789012', payout_bank_ifsc: 'HDFC0001234',
    payout_account_holder_name: 'Owner', payout_details_status: 'verified', payout_proof_path: null, payout_upi_verified_name: 'OWNER' });
  expect(view).toMatchObject({ method: 'bank', accountLast4: '9012', status: 'verified', hasProof: false, verifiedName: 'OWNER' });
  expect(JSON.stringify(view)).not.toContain('123456789012');
  expect(toStorePayoutView(null)).toMatchObject({ method: null, status: 'unverified' });
});
