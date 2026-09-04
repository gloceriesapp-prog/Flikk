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
//
// `hidden` (optional SharedValue<number>, 0..1) — the nav pill + side
// button + fade gradient animate away (slide down + fade) as this goes
// toward 1, driven by the caller's own scroll handler (HomeScreen.tsx's
// own note on the direction-detection logic); the CartBar row below stays
// untouched and always visible regardless, per an explicit ask ("only add
// to cart section need to be visible"). Screens that don't pass this
// (Purchase/Categories/Store) fall back to a local always-0 value, so the
// pill just never hides there — no behavior change for them.

import { Image, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartBar } from '../CartBar/CartBar';
import { BottomNavBarItem } from './BottomNavBarItem';
import { BOTTOM_NAV_TABS } from './data';
import type { AppStackParamList } from '../../navigation/types';

const USE_LIQUID_GLASS = isLiquidGlassAvailable();

// This component is mounted fresh inside every screen that renders it
// (HomeScreen, PurchaseScreen, CategoriesScreen, StoreListScreen each render
// their own <BottomNavBar />), so which tab is "active" can't be local state
// seeded once at mount — that only ever reflected whichever tab was tapped
// *from inside this same instance*, not the screen actually on top (e.g.
// arriving at Categories any way other than tapping this exact pill left it
// showing Home as active). Deriving it from the real current route name
// (useRoute, below) instead means it's always correct regardless of how the
// screen was reached — back navigation, a link from another screen, deep
// link, anything.
const ROUTE_TO_TAB_ID: Record<string, string> = {
  Home: 'home',
  Purchase: 'order-again',
  Categories: 'categories',
  Store: 'store',
};

const SIDE_BUTTON_SIZE = 60;
const SIDE_BUTTON_IMAGE_URI =
  'https://images.unsplash.com/photo-1787240663846-598e1033a919?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

interface Props {
  hidden?: SharedValue<number>;
}

export function BottomNavBar({ hidden }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute();
  const activeId = ROUTE_TO_TAB_ID[route.name] ?? BOTTOM_NAV_TABS[0]?.id ?? 'home';

  // Always-visible fallback for screens that don't drive this (no scroll
  // tracking there yet) — keeping the hook order identical regardless of
  // whether `hidden` was passed.
  const localHidden = useSharedValue(0);
  const navProgress = hidden ?? localHidden;
  const navAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(navProgress.value, [0, 1], [0, 110]) }],
    opacity: interpolate(navProgress.value, [0, 1], [1, 0]),
  }));
  // CartBar row drops down to fill the gap the pill leaves behind when
  // hidden — 73 = the pill's own height + the gap between the two rows
  // (insets.bottom + 81 for the row, insets.bottom + 4 + ~73 + 4 for
  // where the pill used to be — see the comment on the row itself).
  // Opacity untouched — this row should stay fully visible throughout,
  // only its position changes.
  const cartBarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(navProgress.value, [0, 1], [0, 73]) }],
  }));

  function handlePress(tabId: string) {
    if (tabId === 'categories') navigation.navigate('Categories');
    if (tabId === 'home') navigation.navigate('Home');
    if (tabId === 'store') navigation.navigate('Store');
    if (tabId === 'order-again') navigation.navigate('Purchase');
  }

  return (
    <>
      {/* Wraps the pill + side button + fade gradient only — CartBar's own
          row (below) is a sibling outside this Animated.View, so it never
          animates with the pill. absolute/inset-0 so this wrapper spans
          the same full-screen area the fragment's children already
          positioned themselves against (left/right/bottom values below
          are relative to it, not to some collapsed intermediate box). */}
      <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }, navAnimatedStyle]}>
      {/* Dims scrolled content under the nav rather than hiding it outright
          — stays faintly visible through the fade instead of disappearing
          into a solid page-color block (which read as an opaque overlay).
          pointerEvents="none" so it never blocks taps to the scroll view
          underneath. Rendered before the pill so it stacks behind it.
          First stop is 'rgba(255,255,255,0)', not the literal string
          'transparent' — LinearGradient parses 'transparent' as
          rgba(0,0,0,0) (black, fully see-through), so interpolating from
          there to white-55%-opaque crossed through muddy gray/black
          midtones instead of a clean white fade. Keeping every stop's RGB
          channel at white and only varying alpha fixes that. */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.7)']}
        locations={[0, 0.55, 1]}
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom + 120 }}
      />

      <View
        style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 4 }}
        className="flex-row items-center gap-3"
      >
        {/* No shadow on this wrapper (there used to be one, shadow-sm
            shadow-black/15) — RN's shadow-* utilities map to Android's
            `elevation`, which renders as a large diffuse dark halo rather
            than a tight drop shadow, and on top of the fade gradient above
            it read as a black smudge across the content behind the pill,
            not depth. Dropped entirely rather than tuned smaller — the
            glass pill itself already reads as elevated without it. */}
        <View className="flex-1">
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

        {/* Same shadow removal, same reason, as the pill wrapper above. */}
        <View style={{ width: SIDE_BUTTON_SIZE, height: SIDE_BUTTON_SIZE }}>
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
      </Animated.View>

      {/* Sits right above the pill — insets.bottom + 81 = insets.bottom + 4
          (pill's own offset) + ~73 (pill height) + 4 (gap, trimmed down
          from 10 — was reading as too much empty space between the two
          rows) — while the pill is visible. When the pill hides
          (navAnimatedStyle above), this row has nothing left to sit above,
          so cartBarAnimatedStyle slides it down by that same ~73px to
          rest near the real screen edge instead of floating in the gap
          the pill left behind — same navProgress driving both, so they
          move in lockstep rather than the cart row lagging/leading the
          pill's own animation. Same left/right margins as the pill row
          above, so both line up while the pill's still shown.
          Free-delivery messaging (the "Unlock FREE Delivery" pill + its
          unlock celebration) was pulled from this bar entirely per an
          explicit ask — just CartBar now, always centered, no locked/
          unlocked/celebrating state to branch on. CartBar itself
          self-nulls when the cart's empty. */}
      <Animated.View
        pointerEvents="box-none"
        style={[{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 81 }, cartBarAnimatedStyle]}
        className="flex-row items-center justify-center"
      >
        <CartBar />
      </Animated.View>
    </>
  );
}
