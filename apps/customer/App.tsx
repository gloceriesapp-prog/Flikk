import { withCrashReporting } from './src/observability/crashReporting';
import { detachNotifications } from './src/features/notifications/native';
import './global.css';
import { accountQueryClient, registerAccountReset } from './src/features/account-session/accountCache';
import { useAuthStore } from './src/store/useAuthStore';
import { useCartStore } from './src/store/useCartStore';
import { useWishlistStore } from './src/store/useWishlistStore';
import { useLocationStore } from './src/store/useLocationStore';
import { useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { wireOnlineManager, createNetInfoSubscriber, onlineStore } from './src/network/online';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { GILROY_FONT_FILES } from './src/theme/fonts';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ReleaseGate } from './src/features/app-release/ReleaseGate';

registerAccountReset(() => {
  detachNotifications();
  useCartStore.getState().clear();
  useWishlistStore.getState().reset();
  void useLocationStore.getState().clear().catch(() => {});
});

void SplashScreen.preventAutoHideAsync();

// One NetInfo subscription feeds BOTH react-query's onlineManager (pauses/
// resumes queries offline) and the shared onlineStore (drives OfflineBanner),
// so the two never disagree. Wired at module load, once — onlineManager invokes
// the subscribe lazily on its first query subscriber.
wireOnlineManager(onlineManager, (setOnline) =>
  createNetInfoSubscriber(NetInfo)((online) => {
    setOnline(online);
    onlineStore.setOnline(online);
  }),
);

function App() {
  useAuthStore(state => state.sessionEpoch);
  useAuthStore(state => state.customerId);
  const queryClient = accountQueryClient();
  // Loading the weights here registers them with the OS by font-family name
  // (e.g. "Gilroy-Regular") — the actual global default is applied via
  // global.css's `@layer base { * { font-family: ... } }`, not from this
  // hook or any React defaultProps mechanism.
  const [fontsLoaded, fontError] = useFonts({ ...GILROY_FONT_FILES });

  const onRootLayout = useCallback(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    // GestureHandlerRootView must wrap everything that uses
    // react-native-gesture-handler (ProductDetailSheet's own drag-to-
    // dismiss/grow gestures) — without it, gesture-handler silently no-ops
    // instead of erroring, which is a much harder bug to spot than a
    // missing provider crash.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaProvider is what powers NativeWind's pt-safe/pb-safe
          utilities used throughout src/screens — without it those classes
          resolve to 0. */}
      <SafeAreaProvider onLayout={onRootLayout}>
        {/* Required for react-native-keyboard-controller's own
            KeyboardAvoidingView (LoginScreen.tsx and others) to work at all —
            it reads keyboard state from this provider, not from RN's own
            Keyboard module. Needed specifically because Android edge-to-edge
            is mandatory as of this Expo SDK, which breaks RN's built-in
            KeyboardAvoidingView (the app window no longer resizes the way
            that component assumes) — this library reads real keyboard-frame
            animations at the native level instead, which keeps working
            under edge-to-edge on both platforms. */}
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            {/* Must render BEFORE RootNavigator, not after — expo-status-bar
                lets multiple StatusBar instances mount at once, and whichever
                one is later in render/mount order wins. With this one after
                RootNavigator, the global style could override any
                per-screen style="light" override (e.g. HomeScreen.tsx's own),
                regardless of which screen was actually focused. */}
            <StatusBar style="light" />
            <ErrorBoundary>
              <ReleaseGate>
                <RootNavigator />
              </ReleaseGate>
            </ErrorBoundary>
            {/* App-wide, overlays everything; renders null while online. */}
            <OfflineBanner />
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default withCrashReporting(App);
