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
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View } from 'react-native';
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

// Android is mandatory edge-to-edge this SDK, so the system navigation bar
// (3-button or gesture) is transparent and the app draws behind it — leaving
// the home/back strip showing whatever happens to be under it. There is no
// supported way to set a solid nav-bar background from JS anymore
// (setBackgroundColorAsync is a no-op under edge-to-edge), so paint our own:
// a white strip pinned to the bottom inset, below the OS buttons (the OS
// always draws them on top) and pointerEvents="none" so it never eats a tap.
// Height 0 (buttonless gesture nav with no inset) renders nothing.
function AndroidNavBarScrim() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android' || insets.bottom === 0) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom, backgroundColor: '#FFFFFF' }}
    />
  );
}

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
  //
  // We intentionally do NOT gate first paint on this (issue #28): the tree
  // renders immediately with the system-font fallback and Gilroy swaps in once
  // useFonts resolves (it re-renders on completion). Nothing crashes if a face
  // isn't registered yet — RN falls back to the system font for an unknown
  // fontFamily. The native splash is hidden on first layout below, not on
  // fonts, so slow font decode never holds a blank screen.
  useFonts({ ...GILROY_FONT_FILES });

  const onRootLayout = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

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
        {/* White backing for Android's transparent system nav bar — topmost so
            it covers the inset strip on every screen, non-interactive. */}
        <AndroidNavBarScrim />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default withCrashReporting(App);
