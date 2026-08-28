import './global.css';
import { useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SOHNE_FONT_FILES } from './src/theme/fonts';

void SplashScreen.preventAutoHideAsync();

// staleTime: 60s — every screen was refetching its data on every mount
// (default staleTime is 0, "always stale"), which multiplies real request
// volume with no benefit for content that barely changes minute to minute
// (categories, home tabs, store list, product catalogs). A screen that
// genuinely needs live data (order tracking) still gets it: refetchInterval
// polling fires regardless of staleTime, this only skips the redundant
// automatic refetch-on-mount/refocus for data that's still fresh.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

export default function App() {
  // Loading the weights here registers them with the OS by font-family name
  // (e.g. "Sohne-Buch") — the actual global default is applied via
  // global.css's `@layer base { * { font-family: ... } }`, not from this
  // hook or any React defaultProps mechanism.
  const [fontsLoaded, fontError] = useFonts(SOHNE_FONT_FILES);

  const onRootLayout = useCallback(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    // SafeAreaProvider is what powers NativeWind's pt-safe/pb-safe utilities
    // used throughout src/screens — without it those classes resolve to 0.
    <SafeAreaProvider onLayout={onRootLayout}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
