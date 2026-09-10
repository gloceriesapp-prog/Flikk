// Three states, not two, now that this app has real role/approval gating
// (useAuthStore.ts's own note):
// 1. Not hydrated yet (checking SecureStore), or a session exists but its
//    first GET /auth/me status check hasn't resolved yet → spinner.
// 2. No session → AuthNavigator, starting at Welcome.
// 3. Session, but not yet a usable rider account (not role='rider', or
//    role='rider' but not yet admin-approved) → AccountStatusScreen, which
//    keeps polling and flips this automatically once resolved.
// 4. Session + role='rider' + approved → AppNavigator, the real app shell.
//
// Same statusChecked-gate shape as apps/partner's own RootNavigator, on
// purpose — avoids a one-frame flash of "not registered as a rider" before
// the real status is even known.

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { useRiderOrdersStore } from '../store/useRiderOrdersStore';
import { fetchAccountStatus } from '../api/auth';
import { colors } from '../theme/tokens';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { AccountStatusScreen } from '../screens/onboarding/AccountStatusScreen';
import { registerPushToken } from '../features/push-notifications/registerPushToken';

export function RootNavigator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const role = useAuthStore((s) => s.role);
  const isApproved = useAuthStore((s) => s.isApproved);
  const setAccountStatus = useAuthStore((s) => s.setAccountStatus);
  const startSync = useRiderOrdersStore((s) => s.startSync);
  const stopSync = useRiderOrdersStore((s) => s.stopSync);
  const isHistoryHydrated = useRiderOrdersStore((s) => s.isHistoryHydrated);
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    let cancelled = false;
    fetchAccountStatus()
      .then(({ role: freshRole, is_approved }) => {
        if (!cancelled) setAccountStatus(freshRole, is_approved);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatusChecked(true);
      });
    return () => {
      cancelled = true;
    };
    // Deliberately only re-runs on a fresh login, not on every
    // role/isApproved write — those are this effect's own output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, accessToken]);

  const isUsableRider = role === 'rider' && isApproved;

  // Registered once a real, approved rider account exists — a pending or
  // not-yet-a-rider session has no assignments to be pushed about, and
  // registering before role/isApproved actually resolve would be racing
  // the status check above for no benefit.
  useEffect(() => {
    if (isUsableRider) void registerPushToken();
  }, [isUsableRider]);

  // Real order sync only ever runs for a real, approved rider — polling
  // GET /rider/assignments before that would just 403 every 12s for no
  // reason (backend's own requireRole('rider')/requireApproved gate). Also
  // waits on isHistoryHydrated (App.tsx's own hydrateHistory, reading
  // persisted completedOrders from SecureStore) — starting sync before
  // that resolves would see an empty completedOrders array and re-add a
  // recently-delivered order that's actually already in the real,
  // not-yet-loaded history, producing a duplicate.
  useEffect(() => {
    if (accessToken && isUsableRider && isHistoryHydrated) {
      startSync();
      return () => stopSync();
    }
    stopSync();
  }, [accessToken, isUsableRider, isHistoryHydrated, startSync, stopSync]);

  const isLoading = !isHydrated || (!!accessToken && !statusChecked);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!accessToken ? <AuthNavigator /> : isUsableRider ? <AppNavigator /> : <AccountStatusScreen />}
    </NavigationContainer>
  );
}
