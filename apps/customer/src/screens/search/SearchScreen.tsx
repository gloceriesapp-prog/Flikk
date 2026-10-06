// Reached by tapping the Home search bar (HomeSearchBar.tsx navigates here
// instead of allowing inline typing — see SearchHeader.tsx's own comment).
// Real search now: matching stores come from useAllStores' already-real
// GET /stores list (filtered client-side — the whole zone's store list is
// small enough at this scale, same "no premature complexity" judgment
// call StoreListScreen's own category filter already makes), matching
// products come from a real cross-store backend search
// (useProductSearch.ts -> GET /stores/products/search). Both reuse the
// exact same StoreCard/ProductSection components the rest of the app
// already uses, so tapping a result behaves identically to tapping the
// same store/product anywhere else (StoreCard self-navigates to
// StoreDetail; ProductCard self-opens ProductDetailSheet).
//
// Pre-search state (empty/too-short query) is SearchSuggestions.tsx now —
// recommended row + Shop by Category + a 9-card grid — replacing what used
// to be a single centered placeholder line.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StoreCard } from '../store-list/components/StoreCard';
import { useAllStores } from '../store-list/all-stores/useAllStores';
import { ProductSection } from '../home/products/ProductSection';
import { useProductSearch } from './useProductSearch';
import { SearchHeader } from './components/SearchHeader';
import { SearchSuggestions } from './components/SearchSuggestions';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Search'>;

const MIN_QUERY_LENGTH = 2;

export function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const { data: allStores = [] } = useAllStores();
  const matchingStores = useMemo(() => {
    if (!isSearching) return [];
    const needle = trimmedQuery.toLowerCase();
    return allStores.filter((store) => store.name.toLowerCase().includes(needle));
  }, [allStores, isSearching, trimmedQuery]);

  const search = useProductSearch(query);
  const { data: matchingProducts = [], isLoading: isLoadingProducts } = search;

  const hasNoResults = isSearching && !isLoadingProducts && !search.isError && !search.isDebouncing && matchingStores.length === 0 && matchingProducts.length === 0;

  return (
    <View className="flex-1 bg-white">
      {/* Home (still mounted underneath this pushed screen) sets its own
          StatusBar to style="light" (white icons, for its own dark
          gradient header) — expo-status-bar's style is one global native
          call, not scoped per screen, so without this override Search's
          own white bg was left with white-on-white icons. */}
      <StatusBar style="dark" />
      <SearchHeader value={query} onChangeText={setQuery} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerClassName="pb-10">
        {!isSearching ? (
          <SearchSuggestions />
        ) : search.isError ? (
          <View className="items-center gap-3 px-6 py-12">
            <Text className="text-center text-base text-ink/60">We couldn’t load results. Check your connection and retry.</Text>
            <Pressable accessibilityRole="button" onPress={() => void search.refetch()} className="rounded-xl bg-[#155DFC] px-5 py-3"><Text className="font-bold text-white">Retry search</Text></Pressable>
          </View>
        ) : isLoadingProducts || search.isDebouncing ? (
          <ActivityIndicator className="py-12" color="#155DFC" />
        ) : hasNoResults ? (
          <View className="items-center px-6 pt-16">
            <Text className="text-center text-[15px] font-medium text-ink/50">No results for &quot;{trimmedQuery}&quot;</Text>
          </View>
        ) : (
          <>
            {matchingStores.length > 0 ? (
              <View className="px-5 pt-6">
                <Text className="mb-4 text-lg font-extrabold text-ink">Stores</Text>
                {matchingStores.map((store) => (
                  <View key={store.id} className="mb-5">
                    <StoreCard store={store} />
                  </View>
                ))}
              </View>
            ) : null}

            {matchingProducts.length > 0 ? <ProductSection title="Products" products={matchingProducts} /> : null}
            {search.hasNextPage && <Pressable accessibilityRole="button" disabled={search.isFetchingNextPage} onPress={() => void search.fetchNextPage()} className="mx-5 my-4 items-center rounded-xl bg-[#EEF3FF] py-3"><Text className="font-semibold text-[#155DFC]">{search.isFetchingNextPage ? 'Loading…' : 'Show more products'}</Text></Pressable>}
          </>
        )}
      </ScrollView>
    </View>
  );
}
