// Providers every screen needs (safe area, query client) + RootNavigator
// + the global incoming-order alert, which is deliberately gated to only
// mount once there's a real session — a rider on the Welcome/Login/OTP
// screens has no orders to be alerted about.

import './global.css';
import { useCallback, useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { createAppQueryClient } from './src/network/queryClient';
import { wireOnlineManager, createNetInfoSubscriber, onlineStore } from './src/network/online';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/useAuthStore';
import { useRiderOrdersStore } from './src/store/useRiderOrdersStore';
import { IncomingOrderAlert } from './src/features/incoming-order-alert/IncomingOrderAlert';
import { OfflineBanner } from './src/components/OfflineBanner';
import { AEONIK_FONT_FILES } from './src/theme/fonts';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ReleaseGate } from './src/features/app-release/ReleaseGate';

void SplashScreen.preventAutoHideAsync();

// One NetInfo subscription feeds BOTH react-query's onlineManager (pauses/
// resumes queries offline — kills the ~85s retry hang on a dead network) and
// the shared onlineStore (drives OfflineBanner), so the two never disagree.
// Wired at module load, once — onlineManager invokes the subscribe lazily on
// its first query subscriber. Same wiring as apps/customer's App.tsx.
wireOnlineManager(onlineManager, (setOnline) =>
  createNetInfoSubscriber(NetInfo)((online) => {
    setOnline(online);
    onlineStore.setOnline(online);
  }),
);

// Shared base config (staleTime 60s, retry only transient/5xx twice, no
// window-focus refetch) instead of bare `new QueryClient()` — see
// @gloceries/shared createAppQueryClient. Per-query staleTime overrides go on
// the individual useQuery, never by weakening this base.
const queryClient = createAppQueryClient();

export default function App() {
  // Loading the weights here registers them with the OS by font-family
  // name (e.g. "AeonikSoftPro-Regular") — the actual app-wide default is
  // applied via global.css's `@layer base`/weight-utility mapping, not
  // from this hook or any React defaultProps mechanism (same split as
  // apps/customer and apps/partner's own Aeonik setups — see those
  // files' App.tsx notes on why defaultProps doesn't work with
  // NativeWind's cssInterop-wrapped Text).
  const [fontsLoaded, fontError] = useFonts(AEONIK_FONT_FILES);
  const hasSession = useAuthStore((s) => !!s.accessToken);
  const hydrateHistory = useRiderOrdersStore((s) => s.hydrateHistory);

  const onRootLayout = useCallback(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void hydrateHistory();
  }, [hydrateHistory]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider onLayout={onRootLayout}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          {/* Admin App settings: maintenance / required update replace the
              whole app (features/app-release/ReleaseGate.tsx). */}
          <ReleaseGate>
            <RootNavigator />
            {hasSession ? <IncomingOrderAlert /> : null}
          </ReleaseGate>
        </ErrorBoundary>
        <OfflineBanner />
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
