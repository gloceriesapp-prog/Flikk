// PRD screen C3 (Home). The header (ETA, location, search, categories) is
// real UI. The body reacts to the selected tab:
//   'all'  -> nearby stores + essentials + deals promo + coastal picks + Today's Steal Deals (sections/)
//   every other tab is real admin data (GET /home-tabs, data/useHomeTabs.ts)
//     — a handful of well-known names still get their own rich screen
//     (Groceries/Fresh & Fish/Bakery/Protein below); any other admin tab
//     falls through to the generic tile grid (hometab/HomeTabTileGrid.tsx).
// Full discovery/browse (store lists, C4/C5) is separate work, see
// specs/01-customer-app/screens.md.
//
// Tab content stays mounted once visited (visitedIds) and is hidden with
// `display: none` rather than unmounted — switching tabs used to
// conditionally render (`{cond && <Comp/>}`), which threw away the whole
// subtree on every tap: every image had to redecode, every grid had to
// re-layout, every ScrollView rebuilt from nothing, which is exactly what
// read as "a few seconds to load" switching tabs on a real device. First
// visit to a tab still pays that cost once; every visit after is instant
// since the tree is already there, just hidden.

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { UpvoteAreaBar } from '../../components/BottomNavBar/UpvoteAreaBar';
import { HomeHeader } from './components/HomeHeader';
import { COLLAPSE_DISTANCE } from './components/CollapsibleHeaderTop';
import { BakeryTab } from './bakery/BakeryTab';
import { FishProductGrid } from './fish/FishProductGrid';
import { GroceriesTab } from './groceries/GroceriesTab';
import { ProteinTab } from './protein/ProteinTab';
import { RegionalTab } from './regional/RegionalTab';
import { AllTabSections } from './sections/AllTabSections';
import { ALL_TAB } from './data/categoryTabs';
import { useHomeTabs, type RemoteHomeTab } from './data/useHomeTabs';
import { HomeTabTileGrid } from './hometab/HomeTabTileGrid';
import { useIsOutsideOperatingHours } from '../../utils/useOperatingHours';
import { useLocationStore } from '../../store/useLocationStore';
import { isLocationServiceable } from '../../utils/serviceability';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

// Tab names that get a hand-built screen instead of the generic tile grid —
// matched case-insensitively against whatever an admin names the tab in
// Home Categories, so renaming "Meat & Fish" there still routes here.
const RICH_SCREEN_BY_NAME: Record<string, 'groceries' | 'meat-fish' | 'bakery' | 'protein' | 'regional'> = {
  groceries: 'groceries',
  'meat & fish': 'meat-fish',
  bakery: 'bakery',
  protein: 'protein',
  regional: 'regional',
};

function richScreenFor(tab: RemoteHomeTab) {
  return RICH_SCREEN_BY_NAME[tab.name.trim().toLowerCase()];
}

export function HomeScreen({ navigation }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_TAB.id);
  const { data: realTabs = [] } = useHomeTabs();
  // Drives HomeHeader's closed-hours treatment (10:30 PM–6:00 AM IST,
  // utils/operatingHours.ts) — the red CLOSED_HOURS_GRADIENT background and
  // LocationSelector's "Closed for now"/"Opens 6:00 AM tomorrow" text.
  // AllTabSections no longer needs this — it used to swap in its own
  // ClosedForNightBanner, since removed as redundant with the header.
  const isClosed = useIsOutsideOperatingHours();
  // Same check AllTabSections.tsx uses to swap in UnavailableZoneSection —
  // read again here rather than lifted/prop-drilled, since BottomNavBar is
  // a sibling of that content, not a descendant of it.
  const location = useLocationStore((state) => state.location);
  const isServiceable = isLocationServiceable(location);

  // Every tab id the user has actually opened at least once — content for
  // an id only mounts the first time it's selected, then stays mounted.
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => new Set([ALL_TAB.id]));
  useEffect(() => {
    Promise.resolve().then(() =>
      setVisitedIds((prev) => (prev.has(selectedCategoryId) ? prev : new Set(prev).add(selectedCategoryId))),
    );
  }, [selectedCategoryId]);

  // Smooth crossfade on tab switch — this used to be an instant
  // display:none/flex snap with zero transition (visitedIds' own note
  // above explains why display-toggling, not unmount, is used at all;
  // this is purely the missing polish on top of that), which is exactly
  // the "not smooth/premium" moment on this screen. Snap opacity to 0
  // the instant a new tab is picked, then animate it to 1 — the switch
  // itself stays instantaneous (no delay before content underneath
  // actually changes), only the new content's appearance is eased in, so
  // tapping a tab still feels immediately responsive rather than
  // sluggish. Native-driven (useAnimatedStyle/withTiming, not JS-thread
  // Animated) so it stays smooth even if the JS thread is busy laying
  // out the newly-visible tab's content underneath it.
  const contentOpacity = useSharedValue(1);
  useEffect(() => {
    contentOpacity.value = 0;
    contentOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [selectedCategoryId, contentOpacity]);
  const contentFadeStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  // Resolved once here (this component already has the real tab list)
  // rather than re-fetched inside HomeHeader.tsx — that component only
  // needs the name to look up its per-category gradient.
  const activeCategoryName =
    selectedCategoryId === ALL_TAB.id ? 'all' : (realTabs.find((t) => t.id === selectedCategoryId)?.name ?? 'all');

  // Drives the collapsing ETA/location block in HomeHeader — see
  // components/CollapsibleHeaderTop.tsx for the actual interpolation.
  const scrollY = useSharedValue(0);

  // OS status bar icon color — white over the full-color gradient at rest,
  // real black once scrolled past the same point HomeHeader's own frosted/
  // blurred state finishes coming in (COLLAPSE_DISTANCE). No background box
  // behind the icons, just the icon color itself flipping — expo-status-
  // bar's `style` is a plain string prop, not something a worklet can set
  // directly, so useAnimatedReaction is what bridges scrollY (UI thread)
  // into this JS-thread state, only calling setState on an actual crossing
  // of the threshold rather than on every scroll frame.
  const [statusBarStyle, setStatusBarStyle] = useState<'light' | 'dark'>('light');
  useAnimatedReaction(
    () => scrollY.value > COLLAPSE_DISTANCE,
    (isScrolled, wasScrolled) => {
      if (isScrolled !== wasScrolled) runOnJS(setStatusBarStyle)(isScrolled ? 'dark' : 'light');
    },
  );

  // BottomNavBar's own pill hide/show — 0 = visible, 1 = hidden.
  // Direction-based, not just "scrolled past N px": prevScrollY tracks the
  // last frame's offset so every scroll event can tell up from down, not
  // just how far from the top the page is. SCROLL_HIDE_THRESHOLD ignores
  // tiny sub-pixel jitter (momentum deceleration, a light finger twitch)
  // that would otherwise flicker the nav in and out on every frame: only
  // a real, deliberate scroll gesture in either direction actually flips
  // it. Always forced visible near the very top (< 40px) regardless of
  // direction — starting scrolled-down-hidden the instant the list
  // barely moves would feel broken, not premium.
  const prevScrollY = useSharedValue(0);
  const navHidden = useSharedValue(0);
  const SCROLL_HIDE_THRESHOLD = 6;

  const scrollHandler = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    scrollY.value = y;

    const delta = y - prevScrollY.value;
    if (y < 40) {
      navHidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else if (delta > SCROLL_HIDE_THRESHOLD) {
      navHidden.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else if (delta < -SCROLL_HIDE_THRESHOLD) {
      navHidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
    prevScrollY.value = y;
  });

  return (
    // BottomNavBar is a sibling of the ScrollView, not inside its scrollable
    // content — that's what keeps it floating fixed in place while the page
    // scrolls underneath it.
    <View className="flex-1 bg-white">
      {/* HomeHeader is a dark gradient at rest (categoryHeaderGradients.ts)
          — App.tsx's global StatusBar style="dark" (dark icons) is
          invisible against it, so this overrides to "light" (white icons)
          while Home is focused. Once scrolled past HomeHeader's own
          frosted/blurred point, statusBarStyle flips to "dark" instead
          (see that state's own note above) — the header's background
          reads light enough there for black icons to stay legible
          directly against it, no separate background treatment needed. */}
      <StatusBar style={statusBarStyle} />
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="pb-28"
        stickyHeaderIndices={[0]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        // stickyHeaderIndices keeps the header pinned during a normal
        // scroll, but iOS's default elastic overscroll bounce still lets a
        // pull-down-past-the-top gesture visually drag/stretch the sticky
        // header down before it snaps back — bounces={false} removes that
        // rubber-banding entirely so the header reads as genuinely fixed.
        // overScrollMode="never" is the Android equivalent (its default
        // over-scroll is a glow effect, not a drag, but this keeps both
        // platforms behaving identically here).
        bounces={false}
        overScrollMode="never"
      >
        <HomeHeader
          onChangeLocation={() => navigation.navigate('SelectLocation')}
          onOpenSearch={() => navigation.navigate('Search')}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          activeCategoryName={activeCategoryName}
          scrollY={scrollY}
          // Outside the serviceable zone, closed-hours messaging ("Opens
          // 6:00 AM tomorrow") would compete with UnavailableZoneSection's
          // own explanation below — force the header back to its normal
          // open-state look here regardless of the real clock.
          isClosed={isServiceable && isClosed}
        />

        <Animated.View style={contentFadeStyle}>
          {visitedIds.has(ALL_TAB.id) && (
            <View style={{ display: selectedCategoryId === ALL_TAB.id ? 'flex' : 'none' }}>
              <AllTabSections />
            </View>
          )}

          {realTabs.map((tab) => {
            if (!visitedIds.has(tab.id)) return null;
            const richScreen = richScreenFor(tab);
            const banner = tab.banners[0];

            return (
              <View key={tab.id} style={{ display: selectedCategoryId === tab.id ? 'flex' : 'none' }}>
                {richScreen === 'groceries' && <GroceriesTab banner={banner} />}
                {richScreen === 'meat-fish' && <FishProductGrid banner={banner} />}
                {richScreen === 'bakery' && <BakeryTab banner={banner} />}
                {richScreen === 'protein' && <ProteinTab banner={banner} />}
                {richScreen === 'regional' && <RegionalTab />}
                {!richScreen && <HomeTabTileGrid tab={tab} />}
              </View>
            );
          })}

          {selectedCategoryId !== ALL_TAB.id && !realTabs.some((t) => t.id === selectedCategoryId) && (
            <View className="items-center justify-center gap-2 px-6 py-16">
              <Text className="text-base font-semibold text-ink">Store list goes here.</Text>
              <Text className="text-center text-sm text-ink/60">
                Browse/discovery (PRD C4/C5) is the next piece of work.
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>

      {isServiceable ? <BottomNavBar hidden={navHidden} /> : <UpvoteAreaBar />}
    </View>
  );
}
