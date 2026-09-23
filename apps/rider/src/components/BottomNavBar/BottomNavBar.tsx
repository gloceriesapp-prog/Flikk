// Floating dark-glass pill nav — same recipe as apps/partner/apps/customer's
// own BottomNavBar.tsx (BlurView systemThickMaterialDark + black wash).
// Passed as TabNavigator.tsx's own `tabBar` prop (a real
// @react-navigation/bottom-tabs navigator), not rendered per-screen — that
// keeps this one instance mounted for the tab navigator's whole lifetime,
// so switching tabs never remounts or moves it; only the screen content
// underneath changes. state/navigation come from bottom-tabs itself, not
// a global useNavigation/useNavigationState lookup.

import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBarItem } from './BottomNavBarItem';
import { BOTTOM_NAV_TABS } from './data';

// Side inset from each screen edge to the pill. Wider than the old 20 so the
// pill is a narrower, centered bar now that it holds three tabs instead of
// four — no reason to span nearly the whole width for three items.
const PILL_INSET = 56;
// How far the pill floats above the safe-area bottom. Negative nudges it a
// little lower, into part of the safe-area gutter, so it sits closer to the
// screen edge — same "sit it lower" trick the customer nav uses.
const PILL_BOTTOM_OFFSET = -6;

export function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View
      style={{ position: 'absolute', left: PILL_INSET, right: PILL_INSET, bottom: insets.bottom + PILL_BOTTOM_OFFSET }}
      className="shadow-lg shadow-black/30"
    >
      <BlurView intensity={95} tint="systemThickMaterialDark" style={{ borderRadius: 999, overflow: 'hidden' }}>
        <View className="absolute inset-0 bg-black/60" />
        <View className="flex-row items-center justify-around px-1.5 py-1.5">
          {BOTTOM_NAV_TABS.map((tab) => (
            <BottomNavBarItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeRouteName}
              onPress={() => navigation.navigate(tab.id)}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}
