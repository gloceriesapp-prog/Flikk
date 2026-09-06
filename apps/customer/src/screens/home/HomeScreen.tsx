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
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { HomeHeader } from './components/HomeHeader';
import { BakeryTab } from './bakery/BakeryTab';
import { FishProductGrid } from './fish/FishProductGrid';
import { GroceriesTab } from './groceries/GroceriesTab';
import { ProteinTab } from './protein/ProteinTab';
import { RegionalTab } from './regional/RegionalTab';
import { AllTabSections } from './sections/AllTabSections';
import { ALL_TAB } from './data/categoryTabs';
import { useHomeTabs, type RemoteHomeTab } from './data/useHomeTabs';
import { HomeTabTileGrid } from './hometab/HomeTabTileGrid';
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
      {/* HomeHeader is a dark gradient again (categoryHeaderGradients.ts)
          — App.tsx's global StatusBar style="dark" (dark icons) is
          invisible against it on both iOS and Android, same
          expo-status-bar API either way. "light" here renders white
          time/wifi/battery icons, overriding the global default only
          while Home is focused. */}
      <StatusBar style="light" />
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="pb-28"
        stickyHeaderIndices={[0]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <HomeHeader
          onChangeLocation={() => navigation.navigate('LocationSearch')}
          onOpenSearch={() => navigation.navigate('Search')}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          activeCategoryName={activeCategoryName}
          scrollY={scrollY}
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

      <BottomNavBar hidden={navHidden} />
    </View>
  );
}
