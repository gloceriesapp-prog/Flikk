// Splits the app in two: AuthNavigator while logged out, AppNavigator once a
// session token exists — OR once the person has explicitly chosen to browse
// as a guest (LoginScreen.tsx's own Skip button, useAuthStore's own isGuest
// flag). Waits on SecureStore hydration first (cold-start session check —
// PRD screen C1's "cold start / returning user" variant) so a returning
// user never flashes the wrong stack before landing on the right one.
// isGuest is in-memory only (see useAuthStore.ts's own note) so it doesn't
// need to wait on hydration the way accessToken does.
//
// WelcomeScreen shows on EVERY cold open until hydration completes, with a
// small minimum floor (MIN_WELCOME_MS) so a near-instant hydration doesn't
// flash the logo for one frame — it is NOT a fixed multi-second gate. Whichever
// finishes last — the min floor or hydration — reveals the real stack;
// hydration taking longer than the floor (a slow device) still waits for it
// rather than racing an unhydrated accessToken into the wrong branch. The
// pure decision lives in welcomeGate.ts (computeWelcomeVisible) so it's
// unit-tested without a renderer.
//
// Also hydrates useLocationStore here, before AppNavigator ever mounts —
// AppNavigator picks its initial route (LocationPermission vs. Home) off that
// store synchronously on mount, so it needs to already be hydrated by then.

import { useDeliverySettingsSync } from '../api/deliverySettings';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { onAccountBlocked } from '../api/accountBlocked';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { linking } from './linking';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { computeWelcomeVisible } from './welcomeGate';
import { useNotifications } from '../features/notifications/useNotifications';
import { notificationNavigation, flushOrderNotification } from '../features/notifications/navigation';
import { navigationIntegration } from '../observability/crashReporting';

// Minimum floor the WelcomeScreen stays up (ms) — just long enough to avoid a
// one-frame flash when SecureStore hydration resolves almost instantly.
const MIN_WELCOME_MS = 700;

export function RootNavigator() {
  useDeliverySettingsSync();
  useNotifications();
  const { accessToken, customerId, isGuest, isHydrated: authHydrated, hydrationError: authError, hydrate: hydrateAuth } = useAuthStore();
  const { isHydrated: locationHydrated, hydrationError: locationError, hydrate: hydrateLocation } = useLocationStore();
  const [cartReady, setCartReady] = useState(false);
  const [cartError, setCartError] = useState(false);
  const [cartRetry, setCartRetry] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    hydrateAuth();
    hydrateLocation();
  }, [hydrateAuth, hydrateLocation]);

  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), MIN_WELCOME_MS);
    return () => clearTimeout(id);
  }, []);

  // Admin blocked this account: api/client.ts already signed it out.
  useEffect(() => onAccountBlocked((message) => Alert.alert('Account blocked', message)), []);

  useEffect(() => {
    if (!authHydrated || authError) return;
    let mounted = true;
    const stop = useCartStore.persist.onFinishHydration(() => { if (mounted) setCartReady(true); });
    Promise.resolve(useCartStore.persist.rehydrate()).then(() => {
      if (mounted && !useCartStore.persist.hasHydrated()) { setCartError(true); setCartReady(true); }
    }).catch(() => { if (mounted) { setCartError(true); setCartReady(true); } });
    return () => { mounted = false; stop(); };
  }, [authHydrated, authError, cartRetry]);

  const hydrated = authHydrated && locationHydrated && (cartReady || !!authError);
  const welcomeVisible = computeWelcomeVisible({
    hydrated,
    elapsedMs: minElapsed ? MIN_WELCOME_MS : 0,
    minMs: MIN_WELCOME_MS,
  });

  // Wishlist is account-backed now (useWishlistStore's own note) — loaded
  // once per fresh login same as the push-token registration above, and
  // reset back to empty on logout so one device signing out of account A
  // and into account B never shows A's hearts before B's own load()
  // resolves.
  useEffect(() => {
    if (!authHydrated) return;
    if (accessToken) {
      void useWishlistStore.getState().load();
    } else {
      useWishlistStore.getState().reset();
    }
  }, [authHydrated, accessToken]);

  if (welcomeVisible) {
    return <WelcomeScreen />;
  }

  if (authError || locationError || cartError) {
    return <View className="flex-1 items-center justify-center gap-5 bg-white px-8">
      <Text className="text-center text-xl font-bold text-ink">Let’s try that again</Text>
      <Text className="text-center text-base text-ink/60">{authError || locationError || 'Couldn’t restore your saved cart. Please retry.'}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void hydrateAuth(); void hydrateLocation(); setCartReady(false); setCartError(false); setCartRetry(v => v + 1); }} className="rounded-xl bg-primary px-7 py-3">
        <Text className="font-bold text-white">Retry startup</Text>
      </Pressable>
    </View>;
  }

  return (
    <NavigationContainer
      key={customerId ?? 'guest'}
      linking={linking}
      ref={notificationNavigation}
      onReady={() => {
        // Hook Sentry route-change tracing to the real container (issue #31).
        // onReady re-fires when the container remounts on login/logout (the
        // `key` change), which re-registers against the new container — safe.
        navigationIntegration.registerNavigationContainer(notificationNavigation);
        void flushOrderNotification();
      }}
    >
      {accessToken || isGuest ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
