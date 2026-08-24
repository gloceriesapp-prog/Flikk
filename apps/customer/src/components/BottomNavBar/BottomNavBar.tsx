// Floating pill nav — sits close to the screen edge. Real iOS 26 Liquid
// Glass (GlassView, expo-glass-effect) when isLiquidGlassAvailable() —
// native specular highlight + refraction, not an approximation — with the
// existing BlurView tint="dark" pill as the fallback everywhere that native
// module isn't there (Android, older iOS, Expo Go without the dev build).
// GlassView.tsx itself already no-ops to a plain untinted View on non-iOS,
// so this component decides which glass implementation to mount rather than
// relying on that no-op alone — otherwise Android would silently lose the
// pill's glass look entirely instead of falling back to BlurView.
//
// tint="dark" alone on the BlurView fallback, no extra black wash on top —
// not tint="systemThickMaterialDark" + a heavy wash — that enum value is
// iOS-only and silently falls back to a flat opaque tint wherever the
// native blur backend isn't available, reading as a solid black bar instead
// of glass; "dark" is the cross-platform tint (same one CartBar.tsx and
// ProductDetailSheet's backdrop use). An extra bg-black wash on top used to
// sit here too, but on top of an already-dark tint (and wherever the blur
// itself doesn't render, e.g. Expo Go) it stacked into a solid black pill
// instead of reading as glass — dropped per an explicit ask.
//
// All four tabs have real screens now.
//
// A second, detached circular button sits to the pill's right — same
// Glass/Blur choice, a photo filling it. "Coming soon" slot with no feature
// behind it yet, so onPress is a no-op — an icon would imply a destination
// that doesn't exist.

import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartBar } from '../CartBar/CartBar';
import { FreeDeliveryBar } from '../CartBar/FreeDeliveryBar';
import { FreeDeliveryUnlockBanner } from '../CartBar/FreeDeliveryUnlockBanner';
import { BottomNavBarItem } from './BottomNavBarItem';
import { BOTTOM_NAV_TABS } from './data';
import { FREE_DELIVERY_THRESHOLD, selectCartTotalPrice, useCartStore } from '../../store/useCartStore';
import type { AppStackParamList } from '../../navigation/types';

const USE_LIQUID_GLASS = isLiquidGlassAvailable();

const SIDE_BUTTON_SIZE = 60;
const SIDE_BUTTON_IMAGE_URI =
  'https://images.unsplash.com/photo-1787240663846-598e1033a919?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export function BottomNavBar() {
  const [activeId, setActiveId] = useState(BOTTOM_NAV_TABS[0]?.id ?? 'home');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const isDeliveryUnlocked = useCartStore((state) => selectCartTotalPrice(state) >= FREE_DELIVERY_THRESHOLD);
  const [showUnlockBanner, setShowUnlockBanner] = useState(false);
  // Starts at the current unlocked state, not false — so a cart that's
  // already unlocked when this mounts (e.g. app relaunch) shows the plain
  // centered CartBar right away instead of replaying the celebration banner.
  const wasUnlockedRef = useRef(isDeliveryUnlocked);

  useEffect(() => {
    if (isDeliveryUnlocked && !wasUnlockedRef.current) setShowUnlockBanner(true);
    wasUnlockedRef.current = isDeliveryUnlocked;
  }, [isDeliveryUnlocked]);

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

      <View
        style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 4 }}
        className="flex-row items-center gap-3"
      >
        {/* Shadow lives on this outer, non-clipping wrapper — BlurView needs
            overflow:hidden to clip its rounded corners, which would also
            clip the shadow if they shared one layer. Kept subtle — a heavy
            shadow on top of the fade above reads as a dark smudge, not
            depth. */}
        <View className="flex-1 shadow-sm shadow-black/15">
          {USE_LIQUID_GLASS ? (
            <GlassView
              glassEffectStyle="regular"
              tintColor="rgba(20,20,20,0.35)"
              colorScheme="dark"
              isInteractive
              style={{ borderRadius: 999, overflow: 'hidden' }}
            >
              <View className="flex-row items-center justify-around px-2 py-2.5">
                {BOTTOM_NAV_TABS.map((tab) => (
                  <BottomNavBarItem key={tab.id} tab={tab} isActive={tab.id === activeId} onPress={() => handlePress(tab.id)} />
                ))}
              </View>
            </GlassView>
          ) : (
            // BlurView isn't one of NativeWind's auto-patched components — a
            // className here is silently ignored, same as LinearGradient
            // elsewhere in this app. Positioning/rounding must go through
            // style.
            <BlurView
              intensity={90}
              tint="dark"
              style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
            >
              <View className="flex-row items-center justify-around px-2 py-2.5">
                {BOTTOM_NAV_TABS.map((tab) => (
                  <BottomNavBarItem key={tab.id} tab={tab} isActive={tab.id === activeId} onPress={() => handlePress(tab.id)} />
                ))}
              </View>
            </BlurView>
          )}
        </View>

        {/* Same shadow-lives-outside-the-clip reasoning as the pill above —
            GlassView/overflow:hidden would clip a shadow set on the same
            layer. */}
        <View style={{ width: SIDE_BUTTON_SIZE, height: SIDE_BUTTON_SIZE }} className="shadow-sm shadow-black/15">
          {USE_LIQUID_GLASS ? (
            <GlassView
              glassEffectStyle="regular"
              colorScheme="dark"
              isInteractive
              style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden' }}
            >
              <Pressable style={{ width: '100%', height: '100%' }}>
                <Image source={{ uri: SIDE_BUTTON_IMAGE_URI }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </Pressable>
            </GlassView>
          ) : (
            <Pressable style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', backgroundColor: '#000000' }}>
              <Image source={{ uri: SIDE_BUTTON_IMAGE_URI }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Sits right above the pill — insets.bottom + 4 (pill's own offset) +
          ~73 (pill height) + 4 (gap, trimmed down from 10 — was reading as
          too much empty space between the two rows). Same left/right
          margins as the pill row above, so both rows line up. Three states,
          in order of precedence: (1) showUnlockBanner — the couple-second
          celebration moment right after crossing FREE_DELIVERY_THRESHOLD,
          full width; (2) still locked — FreeDeliveryBar + CartBar share the
          row (FreeDeliveryBar shrinks first, CartBar keeps its natural size
          on the right, so they divide the width instead of overlapping);
          (3) already unlocked (banner already played, or was unlocked on
          mount) — just CartBar, centered, no left pill at all. All of
          CartBar/FreeDeliveryBar self-null when the cart's empty, so states
          (2)/(3) are simply empty then. */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 81 }}
        className={`flex-row items-center gap-2 ${showUnlockBanner || isDeliveryUnlocked ? 'justify-center' : 'justify-between'}`}
      >
        {showUnlockBanner ? (
          <View className="flex-1">
            <FreeDeliveryUnlockBanner onFinish={() => setShowUnlockBanner(false)} />
          </View>
        ) : (
          <>
            {!isDeliveryUnlocked && <FreeDeliveryBar />}
            <CartBar />
          </>
        )}
      </View>
    </>
  );
}
