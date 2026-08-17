// Floating pill nav — sits close to the screen edge, real iOS glass material
// (BlurView with a systemMaterial tint, not a plain blur) so it reads like an
// actual iOS control-center pill instead of a translucent color. A white
// wash sits between the blur and the tab row to mute whatever's scrolling
// underneath — without it, colorful content behind the pill (like the lime
// header) tints the glass a dirty green instead of neutral white.
//
// All four tabs have real screens now.

import { useState } from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
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
    // Shadow lives on this outer, non-clipping wrapper — BlurView needs
    // overflow:hidden to clip its rounded corners, which would also clip
    // the shadow if they shared one layer.
    <View
      style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 4 }}
      className="shadow-lg shadow-black/25"
    >
      {/* BlurView isn't one of NativeWind's auto-patched components — a
          className here is silently ignored, same as LinearGradient
          elsewhere in this app. Positioning/rounding must go through style.
          systemThickMaterialLight = the real iOS "thick material" glass
          (Android has no equivalent and falls back to a plain light blur). */}
      <BlurView
        intensity={95}
        tint="systemThickMaterialLight"
        style={{ borderRadius: 999, overflow: 'hidden' }}
      >
        {/* mutes whatever's scrolling behind the pill so it reads as neutral
            glass, not tinted by the content underneath */}
        <View className="absolute inset-0 bg-white/55" />

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
  );
}
