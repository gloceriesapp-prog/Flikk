// Floating nav — same liquid-glass recipe as apps/customer's own
// BottomNavBar.tsx, ported to this app's bottom-tabs tabBar. iOS: a
// floating rounded pill, real iOS 26 Liquid Glass (GlassView,
// expo-glass-effect) when the API is actually functional, falling back to
// a light BlurView tint on older iOS / Expo Go without the dev build.
// Android: a flat, solid-white, full-device-width bar flush with the
// bottom edge — Android's BlurView was never a real blur, so no glass
// attempt there. Light palette (ink icons/labels, black/10 active
// highlight) — the dark-glass version this replaced is gone.
//
// Passed as TabNavigator.tsx's own `tabBar` prop (a real
// @react-navigation/bottom-tabs navigator), not rendered per-screen — one
// instance stays mounted for the tab navigator's whole lifetime, so
// switching tabs never remounts or moves it. state/navigation come from
// bottom-tabs itself. Profile is a registered tab screen but NOT in
// BOTTOM_NAV_TABS (reachable from the home header), so it never shows a
// bar button while staying navigable.

import { Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBarItem } from './BottomNavBarItem';
import { BOTTOM_NAV_TABS } from './data';

// Pill is content-width (sized to its three tabs) and centered, not
// stretched to fixed side insets — keeps the icons snug with no dead gap.
// How far the pill floats above the safe-area bottom (negative nudges it
// lower, into the gutter) — same "sit it lower" trick the customer nav uses.
const PILL_BOTTOM_OFFSET = -6;

// isLiquidGlassAvailable() confirms the GlassView component exists;
// isGlassEffectAPIAvailable() confirms the underlying native render API is
// actually functional (some iOS 26 betas have one without the other, so
// GlassView renders flat). Gating on both = "will this render as glass".
// Same reasoning as apps/customer's own BottomNavBar note.
const USE_LIQUID_GLASS = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
const IS_ANDROID = Platform.OS === 'android';

export function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name;

  // Profile is a tab route with no bar button (reached from the home header);
  // hide the whole bar there so its own scroll/footer own the screen.
  if (activeRouteName === 'Profile') return null;

  const items = (
    <View className="flex-row items-center px-1.5 py-1">
      {BOTTOM_NAV_TABS.map((tab) => (
        <BottomNavBarItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeRouteName}
          onPress={() => navigation.navigate(tab.id)}
        />
      ))}
    </View>
  );

  if (IS_ANDROID) {
    // Solid full-width white bar flush with the bottom edge — paddingBottom
    // absorbs the safe area itself rather than floating above it. elevation
    // + dynamic paddingBottom stay inline (no NativeWind utility for either).
    return (
      <View className="absolute inset-x-0 bottom-0 bg-white" style={{ paddingBottom: insets.bottom, elevation: 12 }}>
        {items}
      </View>
    );
  }

  return (
    // Full-width band that only CENTERS the pill (pointerEvents box-none so
    // the empty sides don't eat touches); the pill itself is content-width —
    // sized to the three tabs, no fixed left/right stretch — so there's no
    // dead gap between the icons.
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ bottom: insets.bottom + PILL_BOTTOM_OFFSET }}
    >
      <View
        style={{
          // Custom even-halo shadow — shadowOffset {0,0} + real radius = halo
          // on every side. No clean NativeWind equivalent, so inline.
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
        }}
      >
        {USE_LIQUID_GLASS ? (
          // GlassView isn't NativeWind-patched — a className is silently
          // ignored, so its rounding/border go through style. A baseline
          // hairline border keeps the pill present even with nothing behind it
          // to refract; colorScheme="light" + glassEffectStyle="regular" still
          // let real content refract through.
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            isInteractive
            style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)' }}
          >
            {items}
          </GlassView>
        ) : (
          // BlurView isn't NativeWind-patched either — rounding/border via
          // style. iOS-only fallback in practice (Android has its own bar
          // above). The inner wash is a plain View, so it can use className.
          <BlurView intensity={100} tint="light" style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
            <View pointerEvents="none" className="absolute inset-0 bg-white/30" />
            {items}
          </BlurView>
        )}
      </View>
    </View>
  );
}
