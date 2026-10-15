// Rider account-deletion rules. The request itself is a marked staff support
// ticket; see lib/staffAccountDeletion.ts for why.
//
// Pure: no I/O. routes/riderAccount.ts does the reads and the write.

import { AppError } from './errors.js';
import { markedDeletionMessage } from './staffAccountDeletion.js';

export { DELETION_MARKER, MAX_REASON_LENGTH, deletionReason, isDeletionTicket } from './staffAccountDeletion.js';

export function deletionMessage(reason: string): string {
  return markedDeletionMessage('The rider asked to delete their Gloceries Rider account and personal data from the app.', reason);
}

// What must be resolved before a request is accepted. Taking a request while
// the rider still holds a customer's order or cash would strand both.
export function deletionBlocker(input: { activeOrders: number; outstandingCash: number }): AppError | null {
  if (input.activeOrders > 0) {
    return new AppError(409, 'ACTIVE_DELIVERIES', 'Finish or hand back your active deliveries before deleting your account.');
  }
  if (input.outstandingCash > 0) {
    const amount = input.outstandingCash.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return new AppError(409, 'CASH_TO_SETTLE', `Deposit the ₹${amount} cash you collected before deleting your account.`);
  }
  return null;
}

export function sumCash(rows: { amount: number | string }[]): number {
  return Math.round(rows.reduce((sum, row) => sum + Number(row.amount), 0) * 100) / 100;
}
