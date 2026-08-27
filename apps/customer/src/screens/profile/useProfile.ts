// ProfileScreen's real account data — GET /auth/me (backend/src/routes/
// auth.ts), same call WaitingApprovalScreen already polls for is_approved/
// has_store; phone/name ride along on that same response now. auth: true
// (default) — needs the session token, same as every other authed call.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';

export interface Profile {
  phone: string;
  name: string | null;
  isApproved: boolean;
  hasStore: boolean;
}

interface ApiMe {
  phone: string;
  name: string | null;
  is_approved: boolean;
  has_store: boolean;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const data = await apiRequest<ApiMe>('/auth/me');
      const profile: Profile = { phone: data.phone, name: data.name, isApproved: data.is_approved, hasStore: data.has_store };
      return profile;
    },
  });
}
