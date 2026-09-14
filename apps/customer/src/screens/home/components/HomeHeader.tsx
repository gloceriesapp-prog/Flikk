// Top-of-Home block: ETA, location, avatar, search. Everything below this is
// the future browse/discovery surface (PRD C3/C4) — not built yet.
//
// Background is a 4-stop gradient that swaps per selected category
// (categoryHeaderGradients.ts) — All stays the deep emerald jewel-tone
// (same family as SeasonalSection.tsx's own card), Groceries/Fresh/
// Meat & Fish/Regional/Bakery each get their own distinct premium
// palette, per an explicit ask for more "premium-ness" when switching
// tabs. activeCategoryName is resolved by HomeScreen.tsx (it already has
// the real tab list from useHomeTabs); this component only needs the
// name to look up, not the tab list itself.
//
// The gradient's bottomColor is threaded down into CategoryTabs so the
// selected tab's own "scoop" cutout (CategoryTabItem.tsx) matches
// whatever color the header actually is right there — a hardcoded scoop
// color would show a visible seam against every non-'all' gradient.
//
// ETA/location and the avatar (now part of the same row via
// DeliveryModeSwitcher, not a separate always-visible element) both
// collapse away on scroll — search and category tabs stay fixed.
//
// Frosted-glass scroll state (per a reference screenshot): as the page
// scrolls past CollapsibleHeaderTop's own collapse distance, the gradient
// fades OUT (hidden entirely once fully scrolled, not just dimmed) while a
// BlurView fades IN at the same rate, underneath the search bar/tabs
// (never blurring them — they sit in a separate, always-crisp layer above
// it). Since this header is stickyHeaderIndices={[0]} (HomeScreen.tsx),
// the real page content keeps scrolling past behind it — once the
// gradient is transparent, that BlurView is blurring the actual scrolled
// content showing through, a true frosted-glass-over-content effect, not
// a self-blur of this header's own background. (A thin gold accent line
// along the bottom edge was tried here and removed per an explicit ask —
// CategoryTabItem's own shadow, added for the same frosted state, is
// enough separation on its own.) Search bar/category tabs need no color
// changes for this: both already carry their own light backing
// (HomeSearchBar's white pill, CategoryTabItem's white/peach capsule)
// regardless of what's behind them, so they stay legible against the
// gradient AND against the frosted state.
//
// The OS status bar itself (clock/signal/battery) switches from white
// icons to real black ones once scrolled past this same point — no
// background box behind it, just the OS icon color itself flipping, since
// the frosted/blurred header behind it reads light enough for black icons
// to stay legible directly against it. That flip is owned by HomeScreen.tsx
// (StatusBar's own `style` prop can't be driven by a worklet/shared value
// the way everything else on this screen is — it's a plain string synced
// from a useAnimatedReaction), not this file; this component only ever
// renders the visual header itself.

import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { CollapsibleHeaderTop, COLLAPSE_DISTANCE } from './CollapsibleHeaderTop';
import { HeaderRays } from './HeaderRays';
import { HomeSearchBar } from './HomeSearchBar';
import { CategoryTabs } from './CategoryTabs';
import { CLOSED_HOURS_GRADIENT, gradientForTabName } from '../data/categoryHeaderGradients';

interface Props {
  onChangeLocation: () => void;
  onOpenSearch: () => void;
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  // Resolved by HomeScreen.tsx from its own real tab list — 'all' when
  // the All tab is selected. Drives which gradient renders.
  activeCategoryName: string;
  scrollY: SharedValue<number>;
  // Home shows the category tabs row; other screens reusing this header
  // (e.g. store-list/StoreListScreen.tsx) may not want it — there's nothing
  // for the tabs to filter there.
  showCategoryTabs?: boolean;
  // 10:30 PM–6:00 AM IST (utils/operatingHours.ts) — overrides whichever
  // category gradient would otherwise show with CLOSED_HOURS_GRADIENT.
  isClosed?: boolean;
}

export function HomeHeader({
  onChangeLocation,
  onOpenSearch,
  selectedCategoryId,
  onSelectCategory,
  activeCategoryName,
  scrollY,
  showCategoryTabs = true,
  isClosed = false,
}: Props) {
  const gradient = isClosed ? CLOSED_HOURS_GRADIENT : gradientForTabName(activeCategoryName);

  // Same [0, COLLAPSE_DISTANCE] scroll window CollapsibleHeaderTop already
  // uses for its own fold — the frosted state and the folded-away ETA row
  // finish transitioning at exactly the same scroll position, so nothing
  // here reads as arriving early/late relative to that.
  const frostedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP),
  }));
  // Exact inverse of frostedStyle — the gradient must actually reach 0
  // opacity (not just dim) once scrolled, or the BlurView above it would
  // just be blurring this color instead of the real content behind it.
  const gradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View className="overflow-hidden">
      {/* Explicit style (not className) on these two overlay layers —
          LinearGradient/BlurView are third-party native views, not core
          RN primitives nativewind pre-registers for className->style
          interop, and absolute positioning silently failing to apply is
          exactly what made the whole background disappear (nothing left
          giving this header any real height/color once the gradient
          wasn't actually absolutely positioned). style is always
          guaranteed to reach the native view regardless of that. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, gradientStyle]}>
        <LinearGradient colors={gradient.colors} locations={gradient.stops} style={StyleSheet.absoluteFill}>
          <HeaderRays />
        </LinearGradient>
      </Animated.View>

      {/* Sits between the gradient and the real content below — blurs
          only the gradient/rays layer, never the search bar or tabs
          rendered on top of it, and never tints it — same colors as the
          unscrolled header, just soft-focused, per an explicit ask to
          keep the background exactly as it already was. pointerEvents=
          "none" so it never steals a touch meant for whatever's beneath
          it. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, frostedStyle]}>
        <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View className="pt-safe">
        {/* No pt-5 here anymore — CollapsibleHeaderTop now owns that top
            spacing itself, animated down to a small residual on scroll
            (see that component's own note on why). */}
        <View className="px-6">
          <CollapsibleHeaderTop scrollY={scrollY} onChangeLocation={onChangeLocation} isClosed={isClosed} />
        </View>

        <View className="px-6">
          <HomeSearchBar onPress={onOpenSearch} />
        </View>

        {showCategoryTabs && (
          <CategoryTabs selectedId={selectedCategoryId} onSelect={onSelectCategory} headerBottomColor={gradient.bottomColor} />
        )}
      </View>
    </View>
  );
}
