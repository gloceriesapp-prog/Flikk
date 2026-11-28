// The grid for the current location and account. Refetches when the app
// comes back to the foreground and exactly when the server says the IST
// slot or hero window changes (refreshAt), so morning cards never linger.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { useLocationStore } from '../../../store/useLocationStore';
import { fetchTodayGrid } from './api';

const MAX_TIMER_MS = 6 * 3_600_000;

export function useTodayGrid() {
  const location = useLocationStore((s) => s.location);
  const customerId = useAuthStore((s) => s.customerId);
  const query = useQuery({
    queryKey: ['home', 'today-grid', location?.latitude, location?.longitude, customerId],
    queryFn: ({ signal }) => fetchTodayGrid(signal),
    enabled: !!location,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });
  const { refetch } = query;
  const refreshAt = query.data?.refreshAt;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refetch(); });
    return () => subscription.remove();
  }, [refetch]);

  useEffect(() => {
    const due = refreshAt ? Date.parse(refreshAt) - Date.now() : NaN;
    if (!Number.isFinite(due)) return;
    const timer = setTimeout(() => void refetch(), Math.min(Math.max(due, 1_000), MAX_TIMER_MS));
    return () => clearTimeout(timer);
  }, [refreshAt, refetch]);

  return query;
}
