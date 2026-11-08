// PRD screen C3 (Home). The header (ETA, location, search) is real UI. The
// body is the 'all' discovery view: nearby stores + essentials + deals promo
// + coastal picks + Today's Steal Deals + quick categories (sections/). The
// in-header category tab strip was removed per an explicit ask — category
// browse now happens through the quick-categories grid below the header
// (QuickCategoriesSection → openCategory → HomeCategory page). Full
// discovery/browse (store lists, C4/C5) is separate work.

import { useCallback, useRef, useState, type ReactElement } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { ScreenStatusBar as StatusBar } from '../../components/ScreenStatusBar';
import Animated, { FadeIn, runOnJS, useAnimatedReaction, type ScrollHandlerProcessed } from 'react-native-reanimated';
import { HomeLoader } from './loading/HomeLoader';
import { useHomeReady } from './loading/useHomeReady';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeHeader } from './components/HomeHeader';
import { COLLAPSE_DISTANCE } from './components/CollapsibleHeaderTop';
import { UnavailableZoneScreen } from './unavailable-zone/UnavailableZoneScreen';
import { useHomeBrowseScroll } from './category-page/useHomeBrowseScroll';
import { ABOVE_FOLD_ITEM_COUNT, useAllTabSectionItems, type HomeSectionItem } from './sections/AllTabSections';
import { useHomeTabs } from './data/useHomeTabs';
import { useIsOutsideOperatingHours } from '../../utils/useOperatingHours';
import { useNearestStore } from './useNearestStore';
import { useWarmHomeBrowse } from './loading/useWarmHomeBrowse';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const sectionKey = (item: HomeSectionItem) => item.key;
const renderSection = ({ item }: { item: HomeSectionItem }) => item.node;

// Its own component so the section feeds only subscribe once Home is actually
// serviceable (HomeScreen returns early before this otherwise), as before.
function HomeSectionList({ header, onSelectCategory, onScroll }: {
  header: ReactElement;
  onSelectCategory: (id: string) => void;
  onScroll: ScrollHandlerProcessed;
}) {
  const sectionItems = useAllTabSectionItems(onSelectCategory);
  return (
    // Virtualized: each Home section is one list item, so only those near the
    // viewport stay mounted (windowSize 5 = two screens either side) instead
    // of every section and image at once. The header is the sticky list
    // header, exactly as it was the ScrollView's index-0 child.
    <Animated.FlatList
      style={{ flex: 1 }}
      data={sectionItems}
      keyExtractor={sectionKey}
      renderItem={renderSection}
      initialNumToRender={ABOVE_FOLD_ITEM_COUNT}
      windowSize={5}
      // Android defaults this on for FlatList; it can blank sticky headers.
      removeClippedSubviews={false}
      // The old content padding (pb-28) plus the sections' own pb-32
      // floating-CartBar clearance, as one footer: 28 + 32 = h-60.
      ListFooterComponent={<View className="h-60" />}
      ListHeaderComponent={header}
      stickyHeaderIndices={[0]}
      onScroll={onScroll}
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
    />
  );
}

export function HomeScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const { data: realTabs = [] } = useHomeTabs();
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
  // "Opens 6:00 AM tomorrow", 10:30 PM–6:00 AM IST, utils/operatingHours.ts).
  const isClosed = useIsOutsideOperatingHours();
  // Same check AllTabSections.tsx uses to swap in UnavailableZoneSection —
  // read again here (same React Query cache key, so this is a cache hit,
  // not a second network request) rather than lifted/prop-drilled, since
  // BottomNavBar is a sibling of that content, not a descendant of it.
  const { isServiceable, serviceability, storeId, refetch: retryCoverage } = useNearestStore();

  useWarmHomeBrowse(isServiceable);
  const homeReady = useHomeReady(isServiceable && !!storeId);

  const { scrollY, scrollHandler } = useHomeBrowseScroll();
  const [statusBarStyle, setStatusBarStyle] = useState<'light' | 'dark'>('light');
  // The sticky header fades from blue to white as its location row collapses.
  // Follow that visual state, including when returning to a scrolled Home.
  useAnimatedReaction(
    () => scrollY.value >= COLLAPSE_DISTANCE / 2,
    (lightBackground, previous) => {
      if (lightBackground !== previous) {
        runOnJS(setStatusBarStyle)(lightBackground ? 'dark' : 'light');
      }
    },
    [],
  );

  // No real store in range at all — the whole browsing UI below (header,
  // every section) assumes one exists. Full-screen swap instead of a
  // section-level swap (see UnavailableZoneScreen.tsx's own note).
  if (serviceability === 'error' && !storeId) {
    return <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="text-center text-lg font-bold text-ink">Couldn’t check nearby shops</Text>
      <Pressable accessibilityRole="button" onPress={() => void retryCoverage()} className="rounded-xl bg-primary px-6 py-3"><Text className="font-bold text-white">Retry</Text></Pressable>
    </View>;
  }
  if (serviceability === 'checking' && !storeId) return <HomeLoader />;
  if (!isServiceable) {
    return <UnavailableZoneScreen />;
  }
  // First open: the loader stays until the first screen is ready (useHomeReady).
  if (!homeReady) return <HomeLoader />;

  return (
    // BottomNavBar lives in HomeNavigationShell, outside the screen surface,
    // so it stays in place while Home/category pages transition underneath.
    <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Keep system icons legible on the blue and collapsed white header. */}
      {isFocused && <StatusBar style={statusBarStyle} />}
      <HomeSectionList
        onSelectCategory={openCategory}
        onScroll={scrollHandler}
        header={
          <HomeHeader
            onChangeLocation={() => navigation.navigate('SelectLocation')}
            onOpenSearch={() => navigation.navigate('Search')}
            activeCategoryName="all"
            scrollY={scrollY}
            // Tighter gap between the search bar and the welcome banner below
            // (was the 28 default). Nudge this to taste.
            bottomSpacing={10}
            isClosed={isClosed}
          />
        }
      />

    </Animated.View>
  );
}
