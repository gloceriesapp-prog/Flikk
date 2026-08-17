import './global.css';
import { useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { GILROY_FONT_FILES } from './src/theme/fonts';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function App() {
  // Loading the weights here registers them with the OS by font-family name
  // (e.g. "Gilroy-Regular") — the actual global default is applied via
  // global.css's `@layer base { * { font-family: ... } }`, not from this
  // hook or any React defaultProps mechanism.
  const [fontsLoaded, fontError] = useFonts(GILROY_FONT_FILES);

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
