// Splits the app in two: AuthNavigator while logged out, AppNavigator once a
// session token exists — OR once the person has explicitly chosen to browse
// as a guest (LoginScreen.tsx's own Skip button, useAuthStore's own isGuest
// flag). Waits on SecureStore hydration first (cold-start session check —
// PRD screen C1's "cold start / returning user" variant) so a returning
// user never flashes the wrong stack before landing on the right one.
// isGuest is in-memory only (see useAuthStore.ts's own note) so it doesn't
// need to wait on hydration the way accessToken does.
//
// WelcomeScreen (WELCOME_DURATION_MS) is a real timed gate, not just a
// loading spinner with a logo slapped on — it shows on EVERY cold open,
// for a fixed minimum, regardless of how fast hydration itself resolves
// (near-instant from SecureStore in practice). Whichever finishes last —
// the timer or hydration — is what actually reveals the real stack;
// hydration taking longer than the timer (a slow device) still waits for
// it rather than racing an unhydrated accessToken into the wrong branch.
//
// Also hydrates useLocationStore here, before AppNavigator ever mounts —
// AppNavigator picks its initial route (LocationPermission vs. Home) off that
// store synchronously on mount, so it needs to already be hydrated by then.

import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { registerPushToken } from '../features/push-notifications/registerPushToken';

const WELCOME_DURATION_MS = 2000;

export function RootNavigator() {
  const { accessToken, isGuest, isHydrated: authHydrated, hydrate: hydrateAuth } = useAuthStore();
  const { isHydrated: locationHydrated, hydrate: hydrateLocation } = useLocationStore();
  const [welcomeElapsed, setWelcomeElapsed] = useState(false);

  useEffect(() => {
    hydrateAuth();
    hydrateLocation();
  }, [hydrateAuth, hydrateLocation]);

  useEffect(() => {
    const id = setTimeout(() => setWelcomeElapsed(true), WELCOME_DURATION_MS);
    return () => clearTimeout(id);
  }, []);

  const isHydrated = authHydrated && locationHydrated && welcomeElapsed;

  // Registered once per fresh login (accessToken change) — a guest browsing
  // without an account has no order to be notified about, so this only
  // fires for a real session. Backend's POST /auth/push-token is what
  // orders.ts's PATCH /:id/status pushes order-status updates through.
  useEffect(() => {
    if (!authHydrated || !accessToken) return;
    void registerPushToken();
  }, [authHydrated, accessToken]);

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

  if (!isHydrated) {
    return <WelcomeScreen />;
  }

  return (
    <NavigationContainer>
      {accessToken || isGuest ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
