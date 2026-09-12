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
// A detached circular button sits to the pill's right again — per an
// explicit reference image (a solid colored circle badge next to the nav
// pill, own icon, no label). No onPress yet — same "UI exists, flow not
// wired" convention as ProductCardView's own bookmark heart, since there's
// no real destination for this to open yet.
//
// `hidden` (optional SharedValue<number>, 0..1) — the nav pill + side
// button + fade gradient animate away (slide down + fade) as this goes
// toward 1, driven by the caller's own scroll handler (HomeScreen.tsx's
// own note on the direction-detection logic); the CartBar row below stays
// untouched and always visible regardless, per an explicit ask ("only add
// to cart section need to be visible"). Screens that don't pass this
// (Purchase/Categories/Store) fall back to a local always-0 value, so the
// pill just never hides there — no behavior change for them.

import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SaleTag01Icon } from '@hugeicons/core-free-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../AppIcon';
import { CartBar } from '../CartBar/CartBar';
import { BottomNavBarItem } from './BottomNavBarItem';
import { BOTTOM_NAV_TABS } from './data';
import type { AppStackParamList } from '../../navigation/types';

// Circle button's own fixed size + gap from the pill — the pill's own
// right inset (below) is widened by exactly this much so the two never
// overlap.
const SIDE_BUTTON_SIZE = 52;
const SIDE_BUTTON_GAP = 12;
// The pill's own real height (icon + label + vertical padding) — used to
// vertically CENTER the circle button against it, not bottom-align the
// two (see that Pressable's own comment). Same 73 the CartBar row's own
// animation offset below already treats as the pill's real height.
const PILL_HEIGHT = 73;
// Distance from the safe-area edge up to the pill's own bottom — lowered
// (was +4) per an explicit ask to sit the whole nav a little closer to
// the screen edge.
const PILL_BOTTOM_OFFSET = -10;

// isLiquidGlassAvailable() alone only confirms the GlassView *component*
// exists — expo-glass-effect's own isGlassEffectAPIAvailable() doc note
// explains why that's not sufficient: some iOS 26 beta builds have the
// component present but the underlying native rendering API not actually
// functional yet (https://github.com/expo/expo/issues/40911), so GlassView
// silently renders flat instead of real glass despite the check passing.
// Checking both is what actually gates on "will this render as glass".
const USE_LIQUID_GLASS = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

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
  // hidden — 73 = PILL_HEIGHT, the same distance the row's own resting
  // position (below) sits above the pill (see that row's own comment).
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
      {/* The white dim/fade gradient that used to sit here (behind the
          pill, over whatever's scrolling underneath) is gone — per an
          explicit ask to leave scrolled content exactly as it looks, not
          washed toward white near the bottom of the screen. The glass
          pill's own blur is what should visually separate it from the
          content now, not a page-wide overlay. */}

      {/* Right inset makes room for the circle button beside it (its own
          size + gap, this file's own constants above). shadowOffset
          {0,0} + a real shadowRadius (not a directional offset) is what
          gives an even halo on every side rather than just below it —
          per an explicit ask for a shadow "for all the side". elevation
          is Android's own equivalent (no offset/radius split there, one
          number controls the whole halo). */}
      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20 + SIDE_BUTTON_SIZE + SIDE_BUTTON_GAP,
          bottom: insets.bottom + PILL_BOTTOM_OFFSET,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        {USE_LIQUID_GLASS ? (
          // Real glass/blur materials work by refracting/blurring whatever
          // sits BEHIND them — with nothing there (a plain page background,
          // no scrolled content underneath), a fully-untinted GlassView has
          // nothing to refract and reads as literally invisible instead of
          // a pill. A light baseline tintColor + a hairline border is what
          // keeps the pill visibly present on its own, while colorScheme
          // ="light" + glassEffectStyle="regular" still let real content
          // scrolling behind it show through and refract on top of that
          // baseline — same idea BlurView's own wash+border fallback below
          // already uses, just via the native tint instead of a manual
          // overlay View.
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            // tintColor="rgba(255, 255, 255, 0.95)"
            isInteractive
            style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)' }}
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
          // Android's default BlurView backend doesn't do a real blur at
          // all (it's a flat semi-opaque tint) — that's the actual root
          // cause of "can't see the liquid glass when I scroll": there was
          // never anything behind the pill actually blurring, on Android.
          // experimentalBlurMethod="dimezisBlurView" switches to expo-blur's
          // real native blur implementation there, same visual family as
          // iOS's own backdrop blur. Wash dropped (0.55 -> 0.3) now that
          // there's a genuine blur underneath it to show through — the old
          // higher wash was hiding whatever little blur Android's flat-tint
          // fallback did produce.
          <BlurView
            intensity={100}
            tint="light"
            experimentalBlurMethod="dimezisBlurView"
            style={{ borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}
          >
            {/* Light wash, not the old dark one — BottomNavBarItem.tsx's
                icons/text are ink/black now, so the fallback pill needs to
                stay light too, same reasoning as the GlassView branch's own
                colorScheme="light" change. */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <View className="flex-row items-center justify-around px-2 py-2.5">
              {BOTTOM_NAV_TABS.map((tab) => (
                <BottomNavBarItem key={tab.id} tab={tab} isActive={tab.id === activeId} onPress={() => handlePress(tab.id)} />
              ))}
            </View>
          </BlurView>
        )}
      </View>

      {/* Detached circle, vertically CENTERED against the pill, not
          bottom-aligned with it — the pill is ~73px tall (PILL_HEIGHT,
          the same number cartBarAnimatedStyle's own comment below already
          uses) and this circle is only SIDE_BUTTON_SIZE (52), so sharing
          the same `bottom` value as the pill left the circle sitting
          noticeably lower than the pill's own visual center (the
          misalignment in the reference screenshot). Solid coral
          (CLAUDE.md's CTA color, the one accent never used as the base
          pill/tab color) so it reads as its own separate action, not a
          5th tab. */}
      <Pressable
        hitSlop={4}
        className="items-center justify-center rounded-full bg-coral shadow-md shadow-black/20"
        style={{
          position: 'absolute',
          right: 20,
          bottom: insets.bottom + PILL_BOTTOM_OFFSET + (PILL_HEIGHT - SIDE_BUTTON_SIZE) / 2,
          width: SIDE_BUTTON_SIZE,
          height: SIDE_BUTTON_SIZE,
        }}
      >
        <AppIcon icon={SaleTag01Icon} size={22} color="#FFFFFF" />
      </Pressable>
      </Animated.View>

      {/* Sits right above the pill — insets.bottom + PILL_BOTTOM_OFFSET +
          PILL_HEIGHT + 4 (that last 4 is the gap between the two rows,
          trimmed down from 10 — was reading as too much empty space) —
          while the pill is visible. When the pill hides
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
        style={[{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + PILL_BOTTOM_OFFSET + PILL_HEIGHT + 4 }, cartBarAnimatedStyle]}
        className="flex-row items-center justify-center"
      >
        <CartBar />
      </Animated.View>
    </>
  );
}
