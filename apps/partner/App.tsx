// No auth gate yet — Login/OTP (P1) and onboarding come in a later pass, per
// specs/02-partner-app/screens.md. Once P1 exists, this becomes a
// RootNavigator reading useAuthStore, same split as apps/customer/App.tsx.

import './global.css';
import { useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SOHNE_FONT_FILES } from './src/theme/fonts';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function App() {
  // Loading the weights here registers them with the OS by font-family
  // name (e.g. "Sohne-Buch") — the actual app-wide default is applied via
  // global.css's `@layer base { * { font-family: ... } }` and its
  // font-weight-utility mapping, not from this hook or any React
  // defaultProps mechanism. Same split as apps/customer/App.tsx's Gilroy
  // setup — see that file's own note on why defaultProps doesn't work
  // with NativeWind's cssInterop-wrapped Text.
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
        {/* Every navigator (AppNavigator's Stack.Navigator included) needs
            exactly one NavigationContainer ancestor — omitting it throws
            "Couldn't register the navigator" the moment any screen tries
            to register itself. apps/customer wraps this one level down in
            RootNavigator.tsx (its auth split lives there); this app has no
            auth split yet, so it's here in App.tsx instead. */}
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
