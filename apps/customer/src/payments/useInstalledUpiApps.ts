import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { detectInstalledUpiApps } from './installedUpiApps';

// One shared discovery request, refreshed on entry and app return. Failed
// discovery never suppresses the other payment methods or starts a payment.
export function useInstalledUpiApps() {
  const focused = useIsFocused();
  const query = useQuery({ queryKey: ['installed-upi-apps'], queryFn: detectInstalledUpiApps,
    enabled: focused, staleTime: 0, retry: false, refetchOnWindowFocus: false });
  const { refetch } = query;
  useEffect(() => {
    if (!focused) return;
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refetch(); });
    return () => subscription.remove();
  }, [focused, refetch]);
  return { apps: query.data ?? [], loading: query.isFetching,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Could not check UPI apps. Please retry.' : '',
    retry: refetch };
}
