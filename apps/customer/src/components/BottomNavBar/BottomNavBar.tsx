// Floating pill nav — sits close to the screen edge, real iOS glass material
// (BlurView with a systemMaterial tint, not a plain blur) so it reads like an
// actual iOS control-center pill instead of a translucent color. Dark glass
// (systemThickMaterialDark + a black wash), not the earlier light/white
// version — matches iOS's own dark control-center pill.
//
// All four tabs have real screens now.

import { useState } from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBarItem } from './BottomNavBarItem';
import { BOTTOM_NAV_TABS } from './data';
import type { AppStackParamList } from '../../navigation/types';

export function BottomNavBar() {
  const [activeId, setActiveId] = useState(BOTTOM_NAV_TABS[0]?.id ?? 'home');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  function handlePress(tabId: string) {
    setActiveId(tabId);
    if (tabId === 'categories') navigation.navigate('Categories');
    if (tabId === 'home') navigation.navigate('Home');
    if (tabId === 'store') navigation.navigate('Store');
    if (tabId === 'order-again') navigation.navigate('Purchase');
  }

  return (
    <>
      {/* Dims scrolled content under the nav rather than hiding it outright
          — stays faintly visible through the fade instead of disappearing
          into a solid page-color block (which read as an opaque overlay).
          pointerEvents="none" so it never blocks taps to the scroll view
          underneath. Rendered before the pill so it stacks behind it. */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.7)']}
        locations={[0, 0.55, 1]}
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom + 120 }}
      />

      {/* Shadow lives on this outer, non-clipping wrapper — BlurView needs
          overflow:hidden to clip its rounded corners, which would also clip
          the shadow if they shared one layer. Kept subtle — a heavy shadow
          on top of the fade above reads as a dark smudge, not depth. */}
      <View
        style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 4 }}
        className="shadow-sm shadow-black/15"
      >
      {/* BlurView isn't one of NativeWind's auto-patched components — a
          className here is silently ignored, same as LinearGradient
          elsewhere in this app. Positioning/rounding must go through style.
          systemThickMaterialDark = the real iOS "thick material" dark glass
          (Android has no equivalent and falls back to a plain dark blur). */}
      <BlurView
        intensity={95}
        tint="systemThickMaterialDark"
        style={{ borderRadius: 999, overflow: 'hidden' }}
      >
        {/* mutes whatever's scrolling behind the pill so it reads as neutral
            dark glass, not tinted by the content underneath */}
        <View className="absolute inset-0 bg-black/55" />

        <View className="flex-row items-center justify-around px-2 py-2.5">
          {BOTTOM_NAV_TABS.map((tab) => (
            <BottomNavBarItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeId}
              onPress={() => handlePress(tab.id)}
            />
          ))}
        </View>
      </BlurView>
      </View>
    </>
  );
}
