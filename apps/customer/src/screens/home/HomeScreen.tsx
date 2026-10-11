// PRD screen C3 (Home). The header (ETA, location, search) is real UI. The
// body is the 'all' discovery view: nearby stores + essentials + deals promo
// + coastal picks + Today's Steal Deals + quick categories (sections/). The
// in-header category tab strip was removed per an explicit ask — category
// browse now happens through the quick-categories grid below the header
// (QuickCategoriesSection → openCategory → HomeCategory page). Full
// discovery/browse (store lists, C4/C5) is separate work.

import { useCallback, useRef } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeHeader } from './components/HomeHeader';
import { UnavailableZoneScreen } from './unavailable-zone/UnavailableZoneScreen';
import { useHomeBrowseScroll } from './category-page/useHomeBrowseScroll';
import { AllTabSections } from './sections/AllTabSections';
import { useHomeTabs } from './data/useHomeTabs';
import { useIsOutsideOperatingHours } from '../../utils/useOperatingHours';
import { useNearestStore } from './useNearestStore';
import { useWarmHomeBrowse } from './loading/useWarmHomeBrowse';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

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

  const { scrollY, scrollHandler } = useHomeBrowseScroll();

  // No real store in range at all — the whole browsing UI below (header,
  // every section) assumes one exists. Full-screen swap instead of a
  // section-level swap (see UnavailableZoneScreen.tsx's own note).
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
          activeCategoryName="all"
          scrollY={scrollY}
          isClosed={isClosed}
        />

        <View>
          <AllTabSections onSelectCategory={openCategory} />
        </View>
      </Animated.ScrollView>

    </View>
  );
}
