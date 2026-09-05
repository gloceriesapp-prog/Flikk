// Reached from BottomNavBar's "Store" tab. Photo-banner header (StoreHeader)
// replaces the plain title; the bottom nav is hidden on this screen entirely
// so the banner is the only chrome. Body: AllStoresSection (the full
// vertical list), directly below StoreFilterBar — the FeaturedStoreBanner
// hero-promo card that used to sit above it is gone per an explicit ask
// (LocalShopCard.tsx on Home still uses the same useFeaturedStore.ts hook
// this banner used to, so that hook stays — only the banner component/its
// render here were removed).

import { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AllStoresSection } from './all-stores/AllStoresSection';
import { useAllStores } from './all-stores/useAllStores';
import { StoreFilterBar } from './components/StoreFilterBar';
import { StoreFilterSheet, type MinRating, type StoreSort } from './components/StoreFilterSheet';
import { StoreHeader } from './components/StoreHeader';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Store'>;

export function StoreListScreen({ navigation }: Props) {
  const { data: allStores = [] } = useAllStores();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sort, setSort] = useState<StoreSort>('relevance');
  const [minRating, setMinRating] = useState<MinRating>(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Real, deduped categories from the actual store rows — not a fixed
  // fabricated list that could drift from what's really on file.
  const categories = useMemo(() => [...new Set(allStores.map((store) => store.category))].sort(), [allStores]);
  const filteredStores = useMemo(() => {
    let result = selectedCategory === 'All' ? allStores : allStores.filter((store) => store.category === selectedCategory);
    if (openNowOnly) result = result.filter((store) => store.isOpen);
    if (minRating > 0) result = result.filter((store) => (store.rating ?? 0) >= minRating);

    // Stores missing the sorted-on field (rating/avgPrepMinutes not yet
    // set by the founder for that store) sort to the end rather than
    // being treated as 0/fastest — same "don't fake a number" convention
    // useAllStores.ts's own header note already documents for these
    // nullable columns.
    if (sort === 'rating') {
      result = [...result].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (sort === 'fastest') {
      result = [...result].sort((a, b) => (a.avgPrepMinutes ?? Infinity) - (b.avgPrepMinutes ?? Infinity));
    }
    return result;
  }, [allStores, selectedCategory, openNowOnly, minRating, sort]);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* Light (white) icons — correct against this screen's own full-bleed
          photo banner, same reasoning as HomeScreen.tsx's own dark header.
          Re-asserted here so a screen that set "dark" (Categories/Purchase)
          doesn't leave invisible dark icons behind on arrival — same fix
          class as those screens' own note, opposite value. */}
      <StatusBar style="light" />
      <StoreHeader onBack={() => navigation.goBack()} />
      <StoreFilterBar
        sort={sort}
        minRating={minRating}
        selectedCategory={selectedCategory}
        openNowOnly={openNowOnly}
        onOpenFilterSheet={() => setIsFilterSheetOpen(true)}
        onToggleOpenNow={() => setOpenNowOnly((prev) => !prev)}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <AllStoresSection stores={filteredStores} />
      </ScrollView>

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
