import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchRiderProfile } from '../../api/profile';

export function useRiderProfile() {
  const phone = useAuthStore((state) => state.phone);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  const queryClient = useQueryClient();
  useFocusEffect(useCallback(() => {
    if (!signedIn) return;
    // Screen focus refreshes stale assignments and approved changes. Multiple consumers
    // share the same bounded cache and in-flight request instead of polling private documents.
    void queryClient.fetchQuery({ queryKey: ['riderProfile', phone], queryFn: fetchRiderProfile,
      staleTime: 30_000 }).catch(() => { /* useQuery preserves the cached profile and error state. */ });
  }, [signedIn, phone, queryClient]));
  return useQuery({ queryKey: ['riderProfile', phone], queryFn: fetchRiderProfile, enabled: signedIn, staleTime: 30_000 });
}
