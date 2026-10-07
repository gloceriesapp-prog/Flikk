import { expect, it } from 'vitest';
import { assertManualPayoutFormat } from './manualPayoutDetails.js';

it('accepts well-formed UPI IDs and bank accounts', () => {
  expect(() => assertManualPayoutFormat({ method: 'upi', vpa: 'ravi.store@okaxis' })).not.toThrow();
  expect(() => assertManualPayoutFormat({ method: 'bank_account', accountNumber: '123456789012', ifsc: 'SBIN0001234', accountHolderName: 'Ravi' })).not.toThrow();
});

it('rejects typos before they are saved', () => {
  expect(() => assertManualPayoutFormat({ method: 'upi', vpa: 'ravi.store' })).toThrow(/UPI ID/);
  expect(() => assertManualPayoutFormat({ method: 'bank_account', accountNumber: '12ab', ifsc: 'SBIN0001234', accountHolderName: 'Ravi' })).toThrow(/account number/);
  expect(() => assertManualPayoutFormat({ method: 'bank_account', accountNumber: '123456789012', ifsc: 'SBIN1001234', accountHolderName: 'Ravi' })).toThrow(/IFSC/);
});
