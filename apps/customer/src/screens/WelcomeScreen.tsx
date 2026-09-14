// The one screen shown on every cold app open, always, before Home or the
// phone-entry screen — RootNavigator's own timed gate renders this
// directly (not part of either the Auth or App stack) for a fixed 2s,
// then routes to AppNavigator (a real session or guest mode already
// exists) or AuthNavigator's Login (a brand-new device/session — the real
// phone-number entry screen, no separate "Get Started" splash first).
// Purely a brand moment: flat blue, one icon, one word, centered,
// nothing tappable — RootNavigator's own timer is what moves it along,
// not a button here.

import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ShoppingBasket03Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../components/AppIcon';

// Same blue this app's auth-flow buttons already use (PrimaryButton's own
// "blue" variant, LoginScreen/OtpVerificationScreen) — one brand blue,
// not a second tone invented for this screen alone.
const BLUE = '#2457F5';

export function WelcomeScreen() {
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: BLUE }}>
      <StatusBar style="light" />
      <AppIcon icon={ShoppingBasket03Icon} size={56} color="#fff" strokeWidth={1.6} />
      <Text className="mt-4 text-[28px] font-semibold tracking-tight text-white">Gloceries</Text>
    </View>
  );
}
