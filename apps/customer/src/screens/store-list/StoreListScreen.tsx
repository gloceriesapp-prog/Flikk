// Reached from BottomNavBar's "Store" tab. Header (StoreHeader) is now the
// same shell as Home's own header — location row + search bar on a
// premium dark gradient — not the old photo banner with its own back
// arrow; BottomNavBar is rendered here now (same as Home) since this
// header no longer carries the only way back. Body: AllStoresSection (the
// full vertical list), directly below StoreFilterBar — the
// FeaturedStoreBanner hero-promo card that used to sit above it is gone
// per an explicit ask (LocalShopCard.tsx on Home still uses the same
// useFeaturedStore.ts hook this banner used to, so that hook stays — only
// the banner component/its render here were removed).

import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Easing, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { prefetchImages } from '../../components/AppImage';
import { AllStoresSection } from './all-stores/AllStoresSection';
import { useAllStores } from './all-stores/useAllStores';
import { StoreFilterBar } from './components/StoreFilterBar';
import { StoreFilterSheet, type MinRating, type StoreSort } from './components/StoreFilterSheet';
import { StoreHeader } from './components/StoreHeader';
import { StorePromoBanner } from './components/StorePromoBanner';
import { NearestToYouSection } from './nearest/NearestToYouSection';
import { PopularThisWeekSection } from './popular/PopularThisWeekSection';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { useLikedStoresStore } from '../../store/useLikedStoresStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Store'>;

export function StoreListScreen({ navigation }: Props) {
  const { data: allStores = [], isError, isRefetching, refetch } = useAllStores();

  // Each StoreCard renders exactly one image — store.photoUrl, or the local
  // placeholder when a store has no photo yet. Prefetch that one URI per store
  // the moment the list resolves so tiles are warm by the time they scroll
  // into view, overlapping the fetch with the rest of the screen's work (same
  // pattern AppImage.tsx's own prefetchImages documents for ProductCard). No
  // third-party picsum images here anymore — only real/placeholder photos.
  useEffect(() => {
    const uris = allStores.map((store) => store.photoUrl || PLACEHOLDER_IMAGE_URI);
    prefetchImages(uris);
  }, [allStores]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sort, setSort] = useState<StoreSort>('relevance');
  const [minRating, setMinRating] = useState<MinRating>(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [likedOnly, setLikedOnly] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const likedStoreIds = useLikedStoresStore((state) => state.ids);

  // Real, deduped categories from the actual store rows — not a fixed
  // fabricated list that could drift from what's really on file.
  const categories = useMemo(
    () => [...new Set(allStores.map((store) => store.category))].sort(),
    [allStores],
  );
  const filteredStores = useMemo(() => {
    let result =
      selectedCategory === 'All'
        ? allStores
        : allStores.filter((store) => store.category === selectedCategory);
    if (openNowOnly) result = result.filter((store) => store.isOpen);
    if (likedOnly) result = result.filter((store) => likedStoreIds.includes(store.id));
    if (minRating > 0) result = result.filter((store) => (store.rating ?? 0) >= minRating);

    // Stores missing the sorted-on field (rating/avgPrepMinutes not yet
    // set by the founder for that store) sort to the end rather than
    // being treated as 0/fastest — same "don't fake a number" convention
    // useAllStores.ts's own header note already documents for these
    // nullable columns.
    if (sort === 'rating') {
      result = [...result].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (sort === 'fastest') {
      result = [...result].sort(
        (a, b) => (a.avgPrepMinutes ?? Infinity) - (b.avgPrepMinutes ?? Infinity),
      );
    }
    return result;
  }, [allStores, selectedCategory, openNowOnly, likedOnly, likedStoreIds, minRating, sort]);

  // Same direction-based hide/show BottomNavBar logic as HomeScreen.tsx's
  // own scrollHandler — a plain "scrolled past N px" hide would fire the
  // instant this screen's own promo banner/filter row/Nearest-to-you rows
  // scroll by; direction-based (scrolling down hides, scrolling up shows,
  // always visible near the very top) is what actually reads as
  // intentional here too, not just on Home.
  const scrollY = useSharedValue(0);
  const prevScrollY = useSharedValue(0);
  const navHidden = useSharedValue(0);
  const SCROLL_HIDE_THRESHOLD = 6;

  // Status bar flips light→dark as the header scrolls from its green gradient
  // onto the white frosted state (StoreHeader), so the clock/battery stay
  // legible on both. 40px matches the header's own collapse window.
  const [statusBarStyle, setStatusBarStyle] = useState<'light' | 'dark'>('light');
  useAnimatedReaction(
    () => scrollY.value > 40,
    (scrolled, prev) => {
      if (scrolled !== prev) runOnJS(setStatusBarStyle)(scrolled ? 'dark' : 'light');
    },
    [],
  );

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
    <View className="flex-1 bg-[#F6F6F6]">
      {/* Status-bar icons flip with scroll: light over the green header at the
          top, dark once it collapses to the white frosted search bar — driven
          by the useAnimatedReaction above. */}
      <StatusBar style={statusBarStyle} />

      {/* StoreHeader stays pinned above the one virtualized list. It was a
          sticky index-0 child of an Animated.ScrollView; FlashList v2 has no
          stickyHeaderIndices, so the same always-at-top behaviour is a pinned
          sibling here (bounces are off, so there's no overscroll difference).
          Its collapse and the status-bar flip are still driven by scrollY from
          the list's own scroll handler. */}
      <StoreHeader
        onChangeLocation={() => navigation.navigate('SelectLocation')}
        onOpenSearch={() => navigation.navigate('Search')}
        scrollY={scrollY}
      />

      {/* The whole screen below the header is now one FlashList (M3): promo +
          filter + Nearest + Popular ride along as its header, BrandFooter as
          its footer, and only the store cards virtualize. */}
      <AllStoresSection
        stores={filteredStores}
        onScroll={scrollHandler}
        isError={isError}
        isRefetching={isRefetching}
        onRefresh={() => void refetch()}
        header={
          <>
            <StorePromoBanner />
            <StoreFilterBar
              sort={sort}
              minRating={minRating}
              selectedCategory={selectedCategory}
              openNowOnly={openNowOnly}
              likedOnly={likedOnly}
              onOpenFilterSheet={() => setIsFilterSheetOpen(true)}
              onToggleOpenNow={() => setOpenNowOnly((prev) => !prev)}
              onToggleLikedOnly={() => setLikedOnly((prev) => !prev)}
            />
            <NearestToYouSection />
            <PopularThisWeekSection />
          </>
        }
      />

      <BottomNavBar hidden={navHidden} />

      <StoreFilterSheet
        visible={isFilterSheetOpen}
        sort={sort}
        minRating={minRating}
        categories={categories}
        selectedCategory={selectedCategory}
        onChangeSort={setSort}
        onChangeMinRating={setMinRating}
        onChangeCategory={setSelectedCategory}
        onClose={() => setIsFilterSheetOpen(false)}
      />
    </View>
  );
}
