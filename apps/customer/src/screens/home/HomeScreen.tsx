// PRD screen C3 (Home). The header (ETA, location, search) is real UI. The
// body is the 'all' discovery view: nearby stores + essentials + deals promo
// + coastal picks + Today's Steal Deals + quick categories (sections/). The
// header's category row (HomeCategoryTabs) swaps the body to that category
// in place; the quick-categories grid still opens the HomeCategory page.

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { ScreenStatusBar as StatusBar } from '../../components/ScreenStatusBar';
import Animated, { FadeIn, type ScrollHandlerProcessed } from 'react-native-reanimated';
import { HomeLoader } from './loading/HomeLoader';
import { useHomeReady } from './loading/useHomeReady';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeCategoryTabs } from './components/HomeCategoryTabs';
import { HomeCategoryContent } from './category-page/HomeCategoryContent';
import { ALL_TAB, PREORDER_TAB } from './data/categoryTabs';
import { PreorderTabContent } from './preorders/PreorderTabContent';
import type { RemoteHomeTab } from './data/useHomeTabs';
import { usePublishHeaderScroll } from './top-header/topHeaderScroll';
import { UnavailableZoneScreen } from './unavailable-zone/UnavailableZoneScreen';
import { useHomeBrowseScroll } from './category-page/useHomeBrowseScroll';
import { ABOVE_FOLD_ITEM_COUNT, useAllTabSectionItems, type HomeSectionItem } from './sections/AllTabSections';
import { useHomeTabs } from './data/useHomeTabs';
import { useNearestStore } from './useNearestStore';
import { useWarmHomeBrowse } from './loading/useWarmHomeBrowse';
import { isUdupiTab, useHomeModeStore } from './mode-switch/useHomeModeStore';
import { RegionalTab } from './regional/RegionalTab';
import { headerColorFor, useHomeHeaderThemeStore } from './header-theme/homeHeaderTheme';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const sectionKey = (item: HomeSectionItem) => item.key;
const renderSection = ({ item }: { item: HomeSectionItem }) => item.node;

// Its own component so the section feeds only subscribe once Home is actually
// serviceable (HomeScreen returns early before this otherwise), as before.
function HomeSectionList({ header, onSelectCategory, onScroll, activeTab, preorder, udupi, udupiTab }: {
  header: ReactElement;
  onSelectCategory: (id: string) => void;
  onScroll: ScrollHandlerProcessed;
  // A header category tab shows that category's content in place of All.
  activeTab?: RemoteHomeTab;
  // Udupi mode (header switch): the admin's regional content only.
  // The built-in Pre-order tab is picked.
  preorder: boolean;
  udupi: boolean;
  // The admin's "Udupi" Home tab; without one, the regional content.
  udupiTab?: RemoteHomeTab;
}) {
  const allItems = useAllTabSectionItems(onSelectCategory);
  const sectionItems = udupi
    ? [{ key: 'udupi', node: udupiTab ? <HomeCategoryContent key={udupiTab.id} tab={udupiTab} /> : <RegionalTab /> }]
    : preorder
    ? [{ key: 'preorder', node: <PreorderTabContent /> }]
    : activeTab
    ? [{ key: activeTab.id, node: <HomeCategoryContent key={activeTab.id} tab={activeTab} /> }]
    : allItems;
  const listRef = useRef<Animated.FlatList<HomeSectionItem>>(null);
  // A new tab starts from its top, under the expanded header.
  useEffect(() => { listRef.current?.scrollToOffset({ offset: 0, animated: false }); }, [activeTab?.id, preorder, udupi]);
  return (
    // Virtualized: each Home section is one list item, so only those near the
    // viewport stay mounted (windowSize 5 = two screens either side) instead
    // of every section and image at once. The header is the sticky list
    // header, exactly as it was the ScrollView's index-0 child.
    <Animated.FlatList
      ref={listRef}
      style={{ flex: 1 }}
      data={sectionItems}
      keyExtractor={sectionKey}
      renderItem={renderSection}
      initialNumToRender={ABOVE_FOLD_ITEM_COUNT}
      windowSize={5}
      // Each item is a whole Home section; mounting the default 10 at once
      // stalls Android's UI thread mid-scroll. Two per batch keeps it smooth.
      maxToRenderPerBatch={2}
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
  const [activeTabId, setActiveTabId] = useState(ALL_TAB.id);
  const udupi = useHomeModeStore((state) => state.mode === 'udupi');
  // A tab admin removes falls back to All.
  const activeTab = realTabs.find((tab) => tab.id === activeTabId);
  const preorder = activeTabId === PREORDER_TAB.id;
  const openingCategory = useRef(false);
  useFocusEffect(useCallback(() => { openingCategory.current = false; }, []));
  const openCategory = useCallback((tabId: string) => {
    // Ignore repeat taps while the native stack is opening a page. Home
    // stays mounted underneath, preserving its scroll position on Back.
    if (openingCategory.current || !realTabs.some((tab) => tab.id === tabId)) return;
    openingCategory.current = true;
    navigation.push('HomeCategory', { tabId });
  }, [navigation, realTabs]);
  // Same check AllTabSections.tsx uses to swap in UnavailableZoneSection —
  // read again here (same React Query cache key, so this is a cache hit,
  // not a second network request) rather than lifted/prop-drilled, since
  // BottomNavBar is a sibling of that content, not a descendant of it.
  const { isServiceable, serviceability, storeId, refetch: retryCoverage } = useNearestStore();

  useWarmHomeBrowse(isServiceable);
  const homeReady = useHomeReady(isServiceable && !!storeId);

  const { scrollY, scrollHandler } = useHomeBrowseScroll();
  // Header colour follows what is shown (homeHeaderTheme.headerColorFor).
  const headerColor = headerColorFor({ udupi, preorder, tabName: activeTab?.name });
  const setHeaderColor = useHomeHeaderThemeStore((state) => state.setColor);
  useEffect(() => {
    setHeaderColor(headerColor);
    return () => setHeaderColor(null);
  }, [headerColor, setHeaderColor]);
  // The shared top header (HomeNavigationShell) folds with this scroll.
  usePublishHeaderScroll(scrollY);

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
  // Only coverage gates Home; each feed owns its initial skeleton.
  if (!homeReady) return <HomeLoader />;

  return (
    // BottomNavBar lives in HomeNavigationShell, outside the screen surface,
    // so it stays in place while Home/category pages transition underneath.
    <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* The header stays blue while scrolling, so icons stay white. */}
      {isFocused && <StatusBar style="light" />}
      <HomeSectionList
        onSelectCategory={openCategory}
        onScroll={scrollHandler}
        activeTab={activeTab}
        preorder={preorder}
        udupi={udupi}
        udupiTab={realTabs.find(isUdupiTab)}
        header={
          // Blue header + search live in the shared shell header above;
          // only the category row is Home's own, pinned on scroll. Udupi
          // mode has no categories to switch between.
          <View className="bg-white">
            {!udupi && <HomeCategoryTabs activeId={preorder ? PREORDER_TAB.id : activeTab?.id ?? ALL_TAB.id} onSelect={setActiveTabId} scrollY={scrollY} />}
          </View>
        }
      />
    </Animated.View>
  );
}
