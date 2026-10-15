// Rider account deletion requests (backend/src/routes/riderAccount.ts). A
// request becomes a ticket in the admin Support inbox; admin settles anything
// owed, deactivates the rider and deletes their data, then resolves it.
import { newRequestId } from '@gloceries/shared';
import { apiRequest } from './client';

export type DeletionRequestStatus = 'open' | 'in_progress' | 'resolved';

export interface DeletionRequest {
  id: string;
  status: DeletionRequestStatus;
  created_at?: string;
}

export function fetchDeletionRequest(): Promise<DeletionRequest | null> {
  return apiRequest<DeletionRequest | null>('/rider/account/deletion-request');
}

export function requestAccountDeletion(reason: string): Promise<DeletionRequest> {
  return apiRequest<DeletionRequest>('/rider/account/deletion-request', {
    method: 'POST',
    body: { request_id: newRequestId(), reason: reason.trim() || undefined },
  });
}

// Applicants who were never approved are still role 'customer'; their
// request goes through the customer deletion flow (backend /privacy, the
// same queue the customer app uses).
export function requestApplicantDeletion(): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>('/privacy/deletion-request', {
    method: 'POST',
    body: { reason: 'Requested from the Gloceries Rider app' },
  });
}
