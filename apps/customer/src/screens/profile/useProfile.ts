import { useAuthStore } from '../../store/useAuthStore';
// ProfileScreen's real account data — GET /auth/me (backend/src/routes/
// auth.ts), same call WaitingApprovalScreen already polls for is_approved/
// has_store; phone/name ride along on that same response now. auth: true
// (default) — needs the session token, same as every other authed call.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';

export interface Profile {
  phone: string;
  name: string | null;
  // YYYY-MM-DD, or null when the customer hasn't added one yet
  // (users.birthday, migration 004) — ProfileScreen's own "Add your
  // birthday" banner only shows while this is null.
  birthday: string | null;
  isApproved: boolean;
  hasStore: boolean;
}

interface ApiMe {
  phone: string;
  name: string | null;
  birthday: string | null;
  is_approved: boolean;
  has_store: boolean;
}

export function useProfile() {
  const customerId = useAuthStore(state => state.customerId);
  return useQuery({
    queryKey: ['profile', 'me', customerId],
    queryFn: async () => {
      const data = await apiRequest<ApiMe>('/auth/me');
      const profile: Profile = {
        phone: data.phone,
        name: data.name,
        birthday: data.birthday,
        isApproved: data.is_approved,
        hasStore: data.has_store,
      };
      return profile;
    },
  });
}

// Saves AccountDetailsCard's Name/Date-of-birth row edits — PATCH
// /auth/me (backend). Phone is never sent here: it's the verified OTP
// identity, not an editable field. Invalidates the same query key
// useProfile reads so the card shows the new value immediately, without a
// manual refetch call at each call site.
export function useUpdateProfileField() {
  const customerId = useAuthStore(state => state.customerId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; birthday?: string }) =>
      apiRequest<{ name: string | null; birthday: string | null }>('/auth/me', { method: 'PATCH', body: patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', 'me', customerId] }),
  });
}
