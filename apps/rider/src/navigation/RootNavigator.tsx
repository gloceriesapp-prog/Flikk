// Five states, not four, now that rider onboarding is a real self-serve
// wizard (migrations/042_rider_onboarding.sql) instead of a manual DB
// edit, on top of this app's own branded cold-start splash (matching
// apps/customer's own WelcomeScreen/RootNavigator pattern):
// 1. Cold start — SecureStore hydration and/or the fixed WELCOME_DURATION_MS
//    timer haven't both finished yet → WelcomeScreen, the real branded
//    splash, not a bare spinner.
// 2. A session exists but its first GET /auth/me status check hasn't
//    resolved yet → plain spinner, NOT WelcomeScreen again — this is the
//    split that fixes "the welcome splash re-shows after every login" (a
//    real bug apps/partner's own RootNavigator hit and fixed first): cold
//    start and post-login status-checking are genuinely different
//    moments, conflating them into one isLoading boolean is what causes it.
// 3. No session → AuthNavigator, starting at Login.
// 4. Session, role==='customer' (never applied, or applied but this is a
//    fresh device/reinstall so no local draft state exists) → AuthNavigator
//    again, but starting at OnboardingIntro instead of Login — same
//    "AuthNavigator remounted with a different initialRouteName, keyed by
//    accessToken" trick apps/partner's own RootNavigator uses, since React
//    Navigation's initialRouteName only applies on a navigator's first
//    mount.
// 5. Session, application submitted, not yet admin-approved →
//    AccountStatusScreen, which keeps polling and flips this automatically
//    once resolved.
// 6. Session + role==='rider' + approved → AppNavigator, the real app shell.

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { useRiderOrdersStore } from '../store/useRiderOrdersStore';
import { fetchAccountStatus } from '../api/auth';
import { ApiError } from '../api/client';
import { colors } from '../theme/tokens';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { AccountStatusScreen } from '../screens/onboarding/AccountStatusScreen';
import { BankDetailsScreen } from '../screens/onboarding/BankDetailsScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { registerPushToken } from '../features/push-notifications/registerPushToken';

const WELCOME_DURATION_MS = 2000;

export function RootNavigator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [welcomeElapsed, setWelcomeElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setWelcomeElapsed(true), WELCOME_DURATION_MS);
    return () => clearTimeout(id);
  }, []);
  const role = useAuthStore((s) => s.role);
  const isApproved = useAuthStore((s) => s.isApproved);
  const applicationSubmitted = useAuthStore((s) => s.applicationSubmitted);
  const isRejected = useAuthStore((s) => s.isRejected);
  const payoutConfigured = useAuthStore((s) => s.payoutConfigured);
  const setAccountStatus = useAuthStore((s) => s.setAccountStatus);
  const clearSession = useAuthStore((s) => s.clear);
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
      .then(({ role: freshRole, is_approved, rider_application_submitted, is_rejected, rider_payout_configured, rejection_reason }) => {
        if (!cancelled) {
          setAccountStatus({
            role: freshRole,
            isApproved: is_approved,
            applicationSubmitted: rider_application_submitted,
            isRejected: is_rejected,
            payoutConfigured: rider_payout_configured,
            rejectionReason: rejection_reason,
          });
        }
      })
      .catch((err) => {
        // A stale/expired token (401) is a dead session — clear it so this
        // drops back to Login instead of stranding the user on the
        // onboarding branch below (role never resolved → the else case).
        // A plain network blip is NOT a reason to log someone out, so only
        // a real auth failure clears.
        if (err instanceof ApiError && err.status === 401) void clearSession();
      })
      .finally(() => {
        if (!cancelled) setStatusChecked(true);
      });
    return () => {
      cancelled = true;
    };
    // Deliberately only re-runs on a fresh login, not on every
    // role/isApproved/applicationSubmitted write — those are this effect's
    // own output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, accessToken]);

  // Approved rider, but "usable" (real order sync, push, the app shell)
  // only once bank details are on file too — an approved rider still on
  // BankDetailsScreen has no business polling assignments or being pushed
  // orders they can't be paid for yet.
  const isApprovedRider = role === 'rider' && isApproved;
  const isUsableRider = isApprovedRider && payoutConfigured;

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

  // Cold start (SecureStore hydration + the fixed splash timer) vs.
  // checking a fresh login's real status — genuinely different moments,
  // see this file's own header note on why conflating them into one
  // isLoading boolean was the actual "splash re-shows on every login" bug.
  const isColdStart = !isHydrated || !welcomeElapsed;
  const isCheckingLoginStatus = !!accessToken && !statusChecked;

  if (isColdStart) {
    return <WelcomeScreen />;
  }

  if (isCheckingLoginStatus) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!accessToken ? (
        // Keyed by "anon" (a fixed, distinct key from the accessToken
        // branch below) — same remount-forcing trick apps/partner's own
        // RootNavigator uses: without a distinct key, a session going from
        // "has token, mid-onboarding-wizard" to "token cleared" would reuse
        // the same AuthNavigator instance at the same tree position and
        // silently stay on whatever wizard step it was on instead of
        // actually resetting to Login.
        <AuthNavigator key="anon" />
      ) : isUsableRider ? (
        <AppNavigator />
      ) : isApprovedRider ? (
        // Approved, but no bank details yet — the "You're approved! One
        // last thing" post-approval step. Rendered directly (not in a
        // navigator): a single screen that flips payoutConfigured on
        // success, which swaps this straight to AppNavigator above.
        <BankDetailsScreen />
      ) : applicationSubmitted && !isRejected ? (
        <AccountStatusScreen />
      ) : (
        // No application yet, OR a rejected one to resubmit — the wizard
        // (OnboardingIntro shows the rejection reason when there is one).
        <AuthNavigator key={accessToken} initialRouteName="OnboardingIntro" />
      )}
    </NavigationContainer>
  );
}
