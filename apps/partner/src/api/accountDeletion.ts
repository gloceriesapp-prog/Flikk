// Store-partner account deletion requests (backend/src/routes/partnerAccount.ts).
// A request becomes a ticket in the admin Support inbox; admin settles
// anything owed, closes the store, deletes the owner's data, then resolves it.
import { newRequestId } from '@gloceries/shared';
import { apiRequest } from './client';

export type DeletionRequestStatus = 'open' | 'in_progress' | 'resolved';

export interface DeletionRequest {
  id: string;
  status: DeletionRequestStatus;
  created_at?: string;
}

export function fetchDeletionRequest(): Promise<DeletionRequest | null> {
  return apiRequest<DeletionRequest | null>('/partner/account/deletion-request');
}

export function requestAccountDeletion(reason: string): Promise<DeletionRequest> {
  return apiRequest<DeletionRequest>('/partner/account/deletion-request', {
    method: 'POST',
    body: { request_id: newRequestId(), reason: reason.trim() || undefined },
  });
}

// Applicants are still role 'customer' until admin approves the store (the
// role flip happens in admin's approve action, not on submit); their request
// goes through the customer deletion flow (backend /privacy, the same queue
// the customer app uses).
export function requestApplicantDeletion(): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>('/privacy/deletion-request', {
    method: 'POST',
    body: { reason: 'Requested from the Gloceries Partner app' },
  });
}

// For gate screens (under review, rejected, suspended) where the app does not
// know the account's role: GET /auth/me says which flow applies.
export async function requestDeletionForCurrentAccount(): Promise<void> {
  const { role } = await apiRequest<{ role?: string }>('/auth/me');
  if (role === 'store_owner') await requestAccountDeletion('');
  else await requestApplicantDeletion();
}
