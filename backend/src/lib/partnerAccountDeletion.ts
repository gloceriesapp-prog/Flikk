// Store-partner account-deletion rules. The request itself is a marked staff
// support ticket; see lib/staffAccountDeletion.ts for why.
//
// Pure: no I/O. routes/partnerAccount.ts does the reads and the write.

import { AppError } from './errors.js';
import { markedDeletionMessage } from './staffAccountDeletion.js';

export { DELETION_MARKER, MAX_REASON_LENGTH, deletionReason, isDeletionTicket } from './staffAccountDeletion.js';

export function deletionMessage(reason: string): string {
  return markedDeletionMessage(
    'The store partner asked to delete their Gloceries Partner account, store listing and personal data from the app.',
    reason,
  );
}

// Taking a request while customers are still waiting on the store's orders
// would strand those orders (and their refunds and settlement).
export function deletionBlocker(input: { activeOrders: number }): AppError | null {
  if (input.activeOrders > 0) {
    const orders = input.activeOrders === 1 ? '1 active order' : `${input.activeOrders} active orders`;
    return new AppError(409, 'ACTIVE_ORDERS', `Your store has ${orders}. Let them be delivered (or contact Gloceries support) before deleting your account.`);
  }
  return null;
}
