// The one screen shown on every cold app open, always, before Login or the
// real app shell — RootNavigator's own timed gate renders this directly
// (not part of AuthStackParamList, no longer a tappable "Get started"
// screen) for a fixed 2s, then routes to AppNavigator/AccountStatusScreen
// (a session already exists) or AuthNavigator's Login (brand-new device).
// Same shape and same brand blue as apps/customer's own WelcomeScreen —
// flat color, one icon, one word, centered, nothing tappable;
// RootNavigator's own timer is what moves it along, not a button here.

import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';

// Same blue apps/customer's own WelcomeScreen uses — one brand blue
// shared across the splash moment, not a rider-only tone invented here.
const BLUE = '#2457F5';

export function WelcomeScreen() {
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: BLUE }}>
      <StatusBar style="light" />
      <AppIcon icon={DeliveryTruck01Icon} size={56} color="#fff" strokeWidth={1.6} />
      <Text className="mt-4 text-[28px] font-semibold tracking-tight text-white">Gloceries Rider</Text>
    </View>
  );
}
