// Format checks for payout details saved without a provider check (manual
// payouts). This catches typos only — it does not prove the account exists
// or belongs to the owner. The founder confirms that before paying (a UPI app
// shows the registered name before a transfer is sent).
import { AppError } from '../lib/errors.js';
import type { PayoutAccountInput } from './verifyPayoutAccount.js';

const VPA = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;
const ACCOUNT_NUMBER = /^\d{9,18}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function assertManualPayoutFormat(input: PayoutAccountInput): void {
  if (input.method === 'upi') {
    if (!VPA.test(input.vpa)) throw new AppError(400, 'INVALID_VPA', 'Enter a valid UPI ID, like name@bank.');
    return;
  }
  if (!ACCOUNT_NUMBER.test(input.accountNumber) || !IFSC.test(input.ifsc)) {
    throw new AppError(400, 'INVALID_BANK_DETAILS', 'Check the account number (9–18 digits) and IFSC (like SBIN0001234).');
  }
}
