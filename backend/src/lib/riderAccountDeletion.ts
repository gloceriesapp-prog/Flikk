// Rider account-deletion requests (Google Play requires riders to be able to
// request deletion in the app and on the web).
//
// A request is a staff support ticket (category 'account', migration 118)
// whose body starts with DELETION_MARKER, so it lands in the admin Support
// inbox with the rest of the rider queue and needs no new tables. Admin
// verifies the rider, settles money owed either way, deactivates the rider
// and deletes the identity, then resolves the ticket.
//
// Pure: no I/O. routes/riderAccount.ts does the reads and the write.

import { AppError } from './errors.js';

export const DELETION_MARKER = '[ACCOUNT DELETION REQUEST]';
export const MAX_REASON_LENGTH = 500;

export function deletionReason(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'string') throw new AppError(400, 'INVALID_REASON', 'Reason must be text.');
  const reason = value.trim();
  if (reason.length > MAX_REASON_LENGTH) throw new AppError(400, 'INVALID_REASON', `Keep your reason under ${MAX_REASON_LENGTH} characters.`);
  return reason;
}

export function deletionMessage(reason: string): string {
  const base = `${DELETION_MARKER} The rider asked to delete their Gloceries Rider account and personal data from the app.`;
  return reason ? `${base}\nReason: ${reason}` : base;
}

export function isDeletionTicket(body: unknown): boolean {
  return typeof body === 'string' && body.startsWith(DELETION_MARKER);
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
