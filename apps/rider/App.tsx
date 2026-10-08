// Providers every screen needs (safe area, query client) + RootNavigator
// + the global incoming-order alert, which is deliberately gated to only
// mount once there's a real session — a rider on the Welcome/Login/OTP
// screens has no orders to be alerted about.

import './global.css';
import { useCallback, useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/useAuthStore';
import { useRiderOrdersStore } from './src/store/useRiderOrdersStore';
import { IncomingOrderAlert } from './src/features/incoming-order-alert/IncomingOrderAlert';
import { AEONIK_FONT_FILES } from './src/theme/fonts';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ReleaseGate } from './src/features/app-release/ReleaseGate';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
