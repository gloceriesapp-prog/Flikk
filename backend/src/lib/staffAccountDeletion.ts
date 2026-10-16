// Account-deletion requests from staff accounts: riders and store partners.
// Google Play requires both apps to let the user request deletion in the app
// and on the web.
//
// A request is a staff support ticket (category 'account', migration 118)
// whose body starts with DELETION_MARKER, so it lands in the admin Support
// inbox with the rest of that role's queue and needs no new tables. Admin
// verifies the account, settles money owed either way, deactivates it and
// deletes the identity, then resolves the ticket.
//
// Pure: no I/O. Role-specific rules live in riderAccountDeletion.ts and
// partnerAccountDeletion.ts; the reads and the write are in
// support/staffDeletionTickets.ts.

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

// `summary` is the role's one-line description of the request, shown to admin.
export function markedDeletionMessage(summary: string, reason: string): string {
  const base = `${DELETION_MARKER} ${summary}`;
  return reason ? `${base}\nReason: ${reason}` : base;
}

export function isDeletionTicket(body: unknown): boolean {
  return typeof body === 'string' && body.startsWith(DELETION_MARKER);
}
