// Auth gate lives in RootNavigator now — see that file's own note on the
// four states an account can be in (loading / logged out / awaiting store
// setup / awaiting approval / the real app shell). This file's job is just
// the providers every state needs (fonts, safe area, query client) plus
// the order-alert machinery, which is deliberately gated to only run once
// there's a real, approved session — a store owner sitting on the Welcome
// or Waiting-for-approval screen has no orders to be alerted about, and
// priming a notification/audio session before there's anyone to notify is
// wasted work.

import { withCrashReporting } from './src/observability/crashReporting';
import './global.css';
import { useCallback, useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from './src/network/queryClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/useAuthStore';
import { AEONIK_FONT_FILES } from './src/theme/fonts';
import { IncomingOrderAlert } from './src/features/incoming-order-alert/IncomingOrderAlert';
import { primeOrderAlertSound } from './src/features/incoming-order-alert/playOrderAlertSound';
import { OrderReminderBanner } from './src/features/order-expiry/components/OrderReminderBanner';
import { useOrderExpiryWatcher } from './src/features/order-expiry/useOrderExpiryWatcher';
import { ReleaseGate } from './src/features/app-release/ReleaseGate';
import { DeliveryEarnedBanner } from './src/features/delivery-earned-alert/DeliveryEarnedBanner';
import { useDeliveryEarnedWatcher } from './src/features/delivery-earned-alert/useDeliveryEarnedWatcher';
import { OfflineBanner } from './src/components/OfflineBanner';
import { NotificationsOffBanner } from './src/features/push-notifications/NotificationsOffBanner';
import { useForegroundRefresh } from './src/features/foreground-refresh/useForegroundRefresh';
import { initOnlineWiring } from './src/network/onlineWiring';

void SplashScreen.preventAutoHideAsync();

// Shared TanStack Query config (packages/shared/src/query/queryClient.ts):
// staleTime 60s (same base partner already ran — payouts/order-history barely
// change minute to minute, so this skips the redundant automatic refetch for
// data that's still fresh) PLUS the retry fix partner's inline client was
// missing — queries retry only transient (network/5xx) failures twice instead
// of blindly 3x, mutations never auto-retry. One instance, created once.
const queryClient = createAppQueryClient();

function App() {
  // Loading the weights here registers them with the OS by font-family
  // name (e.g. "AeonikSoftPro-Regular") — the actual app-wide default is
  // applied via global.css's `@layer base { * { font-family: ... } }` and
  // its font-weight-utility mapping, not from this hook or any React
  // defaultProps mechanism. Same split as apps/customer/App.tsx's own
  // Aeonik setup — see that file's own note on why defaultProps doesn't
  // work with NativeWind's cssInterop-wrapped Text.
  const [fontsLoaded, fontError] = useFonts(AEONIK_FONT_FILES);
  const hasFullAccess = useAuthStore((s) => !!s.accessToken && s.hasStore && s.isApproved);
  const isLoggedIn = useAuthStore((s) => !!s.accessToken);

  const onRootLayout = useCallback(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Teach react-query's onlineManager AND the offline-banner store about the
  // network from one NetInfo subscription (src/network/onlineWiring.ts). Set up
  // once at app root; torn down on unmount.
  useEffect(() => initOnlineWiring(), []);

  // Single app-root AppState listener: refetch the queue on return-to-foreground
  // (only when a real approved session is polling) and re-check push permission.
  useForegroundRefresh(hasFullAccess, isLoggedIn);

  // Grace-phase enforcer for the two-phase accept window (see
  // features/order-expiry/orderExpiry.ts). Called unconditionally — hooks
  // can't be conditional — but its visible effects (the alert, the
  // reminder banner) are gated below via hasFullAccess, so nothing shows
  // before a store is real and approved even though this keeps ticking in
  // the background regardless.
  useOrderExpiryWatcher();
  // Same "hooks can't be conditional, visible effects are" split as
  // useOrderExpiryWatcher above — the watcher keeps running regardless,
  // DeliveryEarnedBanner below is what's actually gated by hasFullAccess.
  useDeliveryEarnedWatcher();

  // Warms up the alert sound's audio session + buffers the file itself
  // well before any real order arrives — see playOrderAlertSound.ts's own
  // note on why a lazily-created player risks going silent on the exact
  // first alert after a cold start. Only primed once fully inside the app,
  // not on every cold launch regardless of auth state.
  useEffect(() => {
    if (hasFullAccess) void primeOrderAlertSound();
  }, [hasFullAccess]);

  if (!fontsLoaded && !fontError) return null;

  return (
    // SafeAreaProvider is what powers NativeWind's pt-safe/pb-safe utilities
    // used throughout src/screens — without it those classes resolve to 0.
    <SafeAreaProvider onLayout={onRootLayout}>
      <QueryClientProvider client={queryClient}>
        {/* RootNavigator owns its own NavigationContainer — see that
            file's own note on why the auth split lives there now instead
            of here, same shape as apps/customer/App.tsx. */}
        {/* Admin App settings: maintenance / required update replace the
            whole app (features/app-release/ReleaseGate.tsx). */}
        <ReleaseGate>
          <RootNavigator />
          {hasFullAccess && (
            <>
              {/* Mounted outside AppNavigator's own tree — a new order
                  needs to interrupt whichever tab is focused. See
                  src/features/incoming-order-alert/IncomingOrderAlert.tsx's
                  own note. */}
              <IncomingOrderAlert />
              <OrderReminderBanner />
              <DeliveryEarnedBanner />
            </>
          )}
          {/* App-wide, not gated to hasFullAccess — connectivity loss and
              notifications-off both matter on any screen (a store owner stuck
              on Waiting-for-approval still needs to know push is off before
              their first order ever lands). Last in the tree = painted on top. */}
          <OfflineBanner />
          <NotificationsOffBanner />
        </ReleaseGate>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default withCrashReporting(App);
