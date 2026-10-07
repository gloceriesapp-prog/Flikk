// Runnable self-check for validatePayoutForm — `npx tsx src/payouts/payouts.selfcheck.ts`
// from packages/shared. Fails loudly (assert) if the contract regexes or the
// confirm/proof gates regress.

import assert from 'node:assert';
import { EMPTY_PAYOUT_FORM, validatePayoutForm } from './index';

const upiOk = validatePayoutForm({ ...EMPTY_PAYOUT_FORM, upiId: ' ravi.k@okhdfcbank ' });
assert.deepStrictEqual(upiOk.input, { method: 'upi', upiId: 'ravi.k@okhdfcbank' });
assert.ok(validatePayoutForm({ ...EMPTY_PAYOUT_FORM, upiId: 'ravi@1' }).errors.upiId);

const bank = { ...EMPTY_PAYOUT_FORM, method: 'bank' as const, accountHolderName: 'Ravi K', accountNumber: '123456789012', confirmAccountNumber: '123456789012', ifsc: 'hdfc0001234', proofPath: 'uid/payout-proof-x.jpg' };
assert.deepStrictEqual(validatePayoutForm(bank).input, { method: 'bank', accountHolderName: 'Ravi K', accountNumber: '123456789012', ifsc: 'HDFC0001234', proofPath: 'uid/payout-proof-x.jpg' });
assert.ok(validatePayoutForm({ ...bank, confirmAccountNumber: '123456789013' }).errors.confirmAccountNumber);
assert.ok(validatePayoutForm({ ...bank, proofPath: null }).errors.proofPath);
assert.ok(validatePayoutForm({ ...bank, accountNumber: '12345678', confirmAccountNumber: '12345678' }).errors.accountNumber);
assert.ok(validatePayoutForm({ ...bank, ifsc: 'HDFC1001234' }).errors.ifsc);
assert.strictEqual(validatePayoutForm({ ...bank, bankName: ' HDFC ' }).input && 'bankName' in validatePayoutForm({ ...bank, bankName: ' HDFC ' }).input! ? 'ok' : 'missing', 'ok');

console.log('payouts selfcheck ok');
