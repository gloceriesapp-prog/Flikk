// Floating pill nav — same dark iOS glass recipe proven in
// apps/customer/src/components/BottomNavBar/BottomNavBar.tsx
// (BlurView systemThickMaterialDark + a black wash, not a flat fill) per
// this app's explicit ask for a black-glassmorphism bar. Active tab is read
// from the navigator's own state (useNavigationState), not local
// component state — this bar is a sibling of the ScrollView on all three
// tab-root screens (Orders/Catalog/Payouts), so deriving from the real
// current route means it stays correct no matter which screen navigated
// where, instead of drifting out of sync the way locally-tracked state can.

import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBarItem } from './BottomNavBarItem';
import { BOTTOM_NAV_TABS } from './data';
import type { AppStackParamList } from '../../navigation/types';

// Same vertical offset apps/customer's own BottomNavBar.tsx uses for its
// pill (PILL_BOTTOM_OFFSET) — this bar used to float `insets.bottom + 4`
// (noticeably higher off the bottom edge than customer's own alignment);
// matching customer's real number here is a pure position change, nothing
// else about this bar (glass, color, sizing) is touched.
const PILL_BOTTOM_OFFSET = -10;

export function BottomNavBar() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const activeRouteName = useNavigationState((state) => state.routes[state.index]?.name);

  return (
    // Shadow lives on this outer, non-clipping wrapper — BlurView needs
    // overflow:hidden to clip its rounded corners, which would also clip
    // the shadow if they shared one layer.
    <View
      style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + PILL_BOTTOM_OFFSET }}
      className="shadow-lg shadow-black/30"
    >
      {/* BlurView isn't one of NativeWind's auto-patched components — a
          className here is silently ignored, positioning must go through
          style. systemThickMaterialDark = the real iOS "thick material"
          dark glass (Android has no equivalent and falls back to a plain
          dark blur). */}
      <BlurView intensity={95} tint="systemThickMaterialDark" style={{ borderRadius: 999, overflow: 'hidden' }}>
        {/* mutes whatever's scrolling behind the pill so it reads as
            neutral dark glass, not tinted by the content underneath */}
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
