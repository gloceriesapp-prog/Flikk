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

export function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View
      style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 4 }}
      className="shadow-lg shadow-black/30"
    >
      <BlurView intensity={95} tint="systemThickMaterialDark" style={{ borderRadius: 999, overflow: 'hidden' }}>
        <View className="absolute inset-0 bg-black/60" />
        <View className="flex-row items-center justify-around px-2 py-2.5">
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
