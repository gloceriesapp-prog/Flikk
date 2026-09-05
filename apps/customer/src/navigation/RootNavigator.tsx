// Splits the app in two: AuthNavigator while logged out, AppNavigator once a
// session token exists — OR once the person has explicitly chosen to browse
// as a guest (LoginScreen.tsx's own Skip button, useAuthStore's own isGuest
// flag). Waits on SecureStore hydration first (cold-start session check —
// PRD screen C1's "cold start / returning user" variant) so a returning
// user never flashes the onboarding screen before landing home. isGuest is
// in-memory only (see useAuthStore.ts's own note) so it doesn't need to
// wait on hydration the way accessToken does.
//
// Also hydrates useLocationStore here, before AppNavigator ever mounts —
// AppNavigator picks its initial route (LocationPermission vs. Home) off that
// store synchronously on mount, so it needs to already be hydrated by then.

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { colors } from '../theme/tokens';

export function RootNavigator() {
  const { accessToken, isGuest, isHydrated: authHydrated, hydrate: hydrateAuth } = useAuthStore();
  const { isHydrated: locationHydrated, hydrate: hydrateLocation } = useLocationStore();

  useEffect(() => {
    hydrateAuth();
    hydrateLocation();
  }, [hydrateAuth, hydrateLocation]);

  const isHydrated = authHydrated && locationHydrated;

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-mist">
        {/* ActivityIndicator's color prop takes a literal, not a class — tokens.ts
            stays the source of truth for the handful of cases like this. */}
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {accessToken || isGuest ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
