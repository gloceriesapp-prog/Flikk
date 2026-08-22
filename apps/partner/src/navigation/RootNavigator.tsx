// Splits the app into the four states an account can be in — this is the
// "becomes a RootNavigator reading useAuthStore" App.tsx has been
// pointing at since before any of this existed:
//
// 1. Not hydrated yet (checking SecureStore) → spinner, nothing else.
// 2. No session → AuthNavigator, starting at Welcome.
// 3. Session, but no store yet (has_store: false) → AuthNavigator again,
//    dropped straight onto Store Setup — a returning owner who closed the
//    app mid-registration shouldn't replay Welcome/Login/OTP.
// 4. Session + store, not yet approved → WaitingApprovalScreen, standalone
//    (no tab chrome — specs/00-foundation/auth-and-roles.md's "full
//    app-state gate," not endpoint-level filtering).
// 5. Session + store + approved → AppNavigator, the real app shell.
//
// Also re-checks approval/store status once after hydration when a token
// exists — useAuthStore.ts's own note explains why that pair isn't
// persisted alongside the token (a returning session could easily be
// approved since the last time the app was open; trusting a stale local
// flag would show the wrong screen).

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { checkAccountStatus } from '../api/auth';
import { WaitingApprovalScreen } from '../screens/onboarding/WaitingApprovalScreen';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/tokens';
import { navigationRef } from './navigationRef';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

export function RootNavigator() {
  const { accessToken, isApproved, hasStore, isHydrated, hydrate, setApproved, setHasStore } = useAuthStore();
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;

    let cancelled = false;
    checkAccountStatus()
      .then(({ is_approved, has_store }) => {
        if (cancelled) return;
        setApproved(is_approved);
        setHasStore(has_store);
      })
      .catch(() => {
        // Leave whatever's already in the store — a failed recheck
        // shouldn't kick a possibly-still-valid session back to login.
      })
      .finally(() => {
        if (!cancelled) setStatusChecked(true);
      });

    return () => {
      cancelled = true;
    };
    // Deliberately only re-runs when accessToken changes (a fresh login),
    // not on every isApproved/hasStore write — those are this effect's
    // own output, re-running on them would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, accessToken]);

  const isLoading = !isHydrated || (!!accessToken && !statusChecked);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!accessToken ? (
        <AuthNavigator />
      ) : !hasStore ? (
        <AuthNavigator initialRouteName="StoreSetup" />
      ) : !isApproved ? (
        <WaitingApprovalGate />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
}

// A NavigationContainer needs at least one navigator inside it — this
// wraps WaitingApprovalScreen in a bare single-screen stack rather than
// rendering it as a plain sibling, so the "exactly one navigator per
// container" rule (see App.tsx's own note) still holds even for the one
// state that has no tabs or chrome to navigate between.
const WaitingStack = createNativeStackNavigator();

function WaitingApprovalGate() {
  return (
    <WaitingStack.Navigator screenOptions={{ headerShown: false }}>
      <WaitingStack.Screen name="WaitingApproval" component={WaitingApprovalScreen} />
    </WaitingStack.Navigator>
  );
}
