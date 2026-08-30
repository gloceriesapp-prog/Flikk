// Reached from BottomNavBar's "Store" tab. Photo-banner header (StoreHeader)
// replaces the plain title; the bottom nav is hidden on this screen entirely
// so the banner is the only chrome. Body: FeaturedStoreBanner (a single
// hero promo card for today's featured store, real data) replaces the old
// avatar-row TopStoresSection, then AllStoresSection (the full vertical
// list) — each owning its own file/heading.

import { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AllStoresSection } from './all-stores/AllStoresSection';
import { useAllStores } from './all-stores/useAllStores';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { StoreHeader } from './components/StoreHeader';
import { FeaturedStoreBanner } from './top-stores/FeaturedStoreBanner';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Store'>;

export function StoreListScreen({ navigation }: Props) {
  const { data: allStores = [] } = useAllStores();
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Real, deduped categories from the actual store rows — not a fixed
  // fabricated list that could drift from what's really on file.
  const categories = useMemo(() => [...new Set(allStores.map((store) => store.category))].sort(), [allStores]);
  const filteredStores = selectedCategory === 'All' ? allStores : allStores.filter((store) => store.category === selectedCategory);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* Light (white) icons — correct against this screen's own full-bleed
          photo banner, same reasoning as HomeScreen.tsx's own dark header.
          Re-asserted here so a screen that set "dark" (Categories/Purchase)
          doesn't leave invisible dark icons behind on arrival — same fix
          class as those screens' own note, opposite value. */}
      <StatusBar style="light" />
      <StoreHeader onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />
      <CategoryFilterBar
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onSearch={() => navigation.navigate('Search')}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <FeaturedStoreBanner />
        <AllStoresSection stores={filteredStores} />
      </ScrollView>
    </View>
  );
}
