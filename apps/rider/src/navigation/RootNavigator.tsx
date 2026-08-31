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

  return (
    <NavigationContainer>
      {/* Keyed by accessToken so a logout always remounts a fresh
          AuthNavigator instance instead of reusing the AppNavigator's tree
          position — same fix as apps/partner's own RootNavigator.tsx note. */}
      {accessToken ? <AppNavigator key={accessToken} /> : <AuthNavigator key="anon" />}
    </NavigationContainer>
  );
}
