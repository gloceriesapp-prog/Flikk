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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeHeader } from './components/HomeHeader';
import { UnavailableZoneScreen } from './unavailable-zone/UnavailableZoneScreen';
import { HomeCategoryContent } from './category-page/HomeCategoryContent';
import { useHomeBrowseScroll } from './category-page/useHomeBrowseScroll';
import { AllTabSections } from './sections/AllTabSections';
import { ALL_TAB } from './data/categoryTabs';
import { useHomeTabs } from './data/useHomeTabs';
import { homeTabBackground } from './data/homeTabBackground';
import { useIsOutsideOperatingHours } from '../../utils/useOperatingHours';
import { useNearestStore } from './useNearestStore';
import { useWarmHomeBrowse } from './loading/useWarmHomeBrowse';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const [preferredCategoryId, setSelectedCategoryId] = useState(ALL_TAB.id);
  const { data: realTabs = [] } = useHomeTabs();
  const selectedCategoryId = realTabs.some((tab) => tab.id === preferredCategoryId) ? preferredCategoryId : ALL_TAB.id;
  const activeTabBackgroundColor = homeTabBackground(realTabs.find((tab) => tab.id === selectedCategoryId));
  const openingCategory = useRef(false);
  useFocusEffect(useCallback(() => { openingCategory.current = false; }, []));
  const openCategory = useCallback((tabId: string) => {
    // Ignore repeat taps while the native stack is opening a page. Home
    // stays mounted underneath, preserving its scroll position on Back.
    if (openingCategory.current || !realTabs.some((tab) => tab.id === tabId)) return;
    openingCategory.current = true;
    navigation.push('HomeCategory', { tabId });
  }, [navigation, realTabs]);
  // Drives CollapsibleHeaderTop's LocationSelector text ("Closed for now"/
  // "Opens 6:00 AM tomorrow", 10:30 PM–6:00 AM IST, utils/operatingHours.ts)
  // — no longer a header background-color swap (removed per an explicit
  // ask). AllTabSections no longer needs this — it used to swap in its own
  // ClosedForNightBanner, since removed as redundant with the header.
  const isClosed = useIsOutsideOperatingHours();
  // Same check AllTabSections.tsx uses to swap in UnavailableZoneSection —
  // read again here (same React Query cache key, so this is a cache hit,
  // not a second network request) rather than lifted/prop-drilled, since
  // BottomNavBar is a sibling of that content, not a descendant of it.
  const { isServiceable, serviceability, storeId, refetch: retryCoverage } = useNearestStore();

  useWarmHomeBrowse(isServiceable);

  // Every tab id the user has actually opened at least once — content for
  // an id only mounts the first time it's selected, then stays mounted.
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => new Set([ALL_TAB.id]));
  useEffect(() => {
    Promise.resolve().then(() =>
      setVisitedIds((prev) => (prev.has(selectedCategoryId) ? prev : new Set(prev).add(selectedCategoryId))),
    );
  }, [selectedCategoryId]);

  // Resolved once here (this component already has the real tab list)
  // rather than re-fetched inside HomeHeader.tsx — that component only
  // needs the name to look up its per-category gradient.
  const activeTab = realTabs.find((t) => t.id === selectedCategoryId);
  const activeCategoryName = selectedCategoryId === ALL_TAB.id ? 'all' : activeTab?.contentKey === 'grocery' ? 'groceries' : activeTab?.contentKey ?? activeTab?.name ?? 'all';

  const { scrollY, scrollHandler } = useHomeBrowseScroll();

  // No real store in range at all — the whole browsing UI below (header,
  // category tabs, every section) assumes one exists. Full-screen swap
  // instead of a section-level swap (this used to only replace AllTabSections'
  // own content while every other tab still rendered a normal, empty-store
  // Home underneath) — see UnavailableZoneScreen.tsx's own note.
  // Local design preview: EXPO_PUBLIC_PREVIEW_UNAVAILABLE_ZONE=true in
  // apps/customer/.env.local shows the "not deliverable here" screen at any
  // address, to see and edit it in Expo Go. Development builds only
  // (__DEV__), so a release build can never get stuck on it.
  if (__DEV__ && process.env.EXPO_PUBLIC_PREVIEW_UNAVAILABLE_ZONE === 'true') {
    return <UnavailableZoneScreen />;
  }
  if ((serviceability === 'checking' || serviceability === 'error') && !storeId) {
    return <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="text-center text-lg font-bold text-ink">{serviceability === 'error' ? 'Couldn’t check nearby shops' : 'Finding shops for your address…'}</Text>
      {serviceability === 'error' && <Pressable accessibilityRole="button" onPress={() => void retryCoverage()} className="rounded-xl bg-primary px-6 py-3"><Text className="font-bold text-white">Retry</Text></Pressable>}
    </View>;
  }
  if (!isServiceable) {
    return <UnavailableZoneScreen />;
  }

  return (
    // BottomNavBar lives in HomeNavigationShell, outside the screen surface,
    // so it stays in place while Home/category pages transition underneath.
    <View className="flex-1 bg-white">
      {/* White status-bar text/icons on both Android and iOS. */}
      {isFocused && <StatusBar style="light" />}
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
          activeFestivalHeaderColor={selectedCategoryId === ALL_TAB.id ? undefined : activeTab?.festival?.headerColor}
          activeTabBackgroundColor={activeTabBackgroundColor}
          scrollY={scrollY}
          // Header category row temporarily disabled. Restore this line
          // to re-enable the original tab UI and selection logic:
          // showCategoryTabs={true}
          showCategoryTabs={false}
          bottomSpacing={0}
          isClosed={isClosed}
        />

        <View>
          {visitedIds.has(ALL_TAB.id) && (
            <View style={{ display: selectedCategoryId === ALL_TAB.id ? 'flex' : 'none' }}>
              <AllTabSections onSelectCategory={openCategory} />
            </View>
          )}

          {realTabs.map((tab) => {
            if (!visitedIds.has(tab.id) && tab.id !== selectedCategoryId) return null;

            return (
              <View key={tab.id} style={{ display: selectedCategoryId === tab.id ? 'flex' : 'none' }}>
                <HomeCategoryContent tab={tab} />
              </View>
            );
          })}

          {selectedCategoryId !== ALL_TAB.id && !realTabs.some((t) => t.id === selectedCategoryId) && (
            <View className="items-center justify-center gap-2 px-6 py-16">
              <Text className="text-base font-semibold text-ink">Store list goes here.</Text>
              <Text className="text-center text-sm text-ink/60">
                Browse/discovery is the next piece of work.
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

    </View>
  );
}
