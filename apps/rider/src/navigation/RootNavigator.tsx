// Only two states here, unlike apps/partner's five — no store-setup wizard
// or approval gate for a rider account (useAuthStore.ts's own note): a
// session existing is enough to unlock the app.
//
// 1. Not hydrated yet (checking SecureStore) → spinner, nothing else.
// 2. No session → AuthNavigator, starting at Welcome.
// 3. Session → AppNavigator, the real app shell.

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/tokens';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

export function RootNavigator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  // No key={accessToken} here — AppNavigator and AuthNavigator are already
  // different component types at this exact tree position, so React
  // unmounts/remounts cleanly on its own the moment the ternary flips; an
  // extra key tied to the live token *value* only adds a second remount
  // trigger that fires any time the token string itself changes (e.g. a
  // transient reset/re-hydrate during a Fast Refresh in dev) — exactly
  // the kind of mid-interaction navigator remount that produces
  // "Couldn't find a navigation context" (a Navigator's own unmount
  // cleanup effect reaching for a parent context that's already been torn
  // down). Removing the value-keyed remount removes that trigger surface.
  return <NavigationContainer>{accessToken ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
