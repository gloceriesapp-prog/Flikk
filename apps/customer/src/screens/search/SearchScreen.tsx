// Reached by tapping the Home search bar (HomeSearchBar.tsx navigates here
// instead of allowing inline typing — see SearchHeader.tsx's own comment).
// Real search now: matching stores come from useAllStores' already-real
// GET /stores list (filtered client-side — the whole zone's store list is
// small enough at this scale, same "no premature complexity" judgment
// call StoreListScreen's own category filter already makes), matching
// products come from a real cross-store backend search
// (useProductSearch.ts -> GET /stores/products/search). Stores reuse the
// same StoreCard the rest of the app uses, and product results render as
// the same ProductCard every Home grid uses — now inside ONE windowed
// FlashList (not a flex-wrap .map in a ScrollView) so mounted nodes stay
// bounded as pagination appends pages. Tapping a result behaves identically
// to tapping the same store/product anywhere else (StoreCard self-navigates
// to StoreDetail; ProductCard self-opens ProductDetailSheet).
//
// Pre-search state (empty/too-short query) is SearchSuggestions.tsx now —
// recommended row + Shop by Category + a 9-card grid — replacing what used
// to be a single centered placeholder line. It, the loading / error /
// no-results states all render via the list's ListEmptyComponent so the
// screen stays a single virtualized list under the fixed SearchHeader.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StoreCard } from '../store-list/components/StoreCard';
import { useAllStores } from '../store-list/all-stores/useAllStores';
import { ProductCard } from '../home/products/ProductCard';
import type { Product } from '../home/products/types';
import { useDeliveryEstimateMinutes } from '../../api/deliverySettings';
import { useBrowseClock } from '../../utils/useBrowseClock';
import { productAvailability } from '../../utils/productAvailability';
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

  // Delivery estimate + browse clock lifted ONCE for the whole grid (issue #22,
  // same as ProductSection used to do) instead of each card self-subscribing —
  // the 30s tick re-renders this screen node, renderItem recomputes each
  // product's (cheap, pure) availability, and the memoized card only re-renders
  // for a product whose availability actually changed.
  const estimatedMinutes = useDeliveryEstimateMinutes();
  const date = new Date(useBrowseClock());

  // Final results view: searching, settled (not loading/debouncing/errored).
  // Only then do we surface stores + the product grid; while a query is still
  // resolving we show the spinner alone, as before.
  const showResults = isSearching && !search.isError && !isLoadingProducts && !search.isDebouncing;
  const hasNoResults = showResults && matchingStores.length === 0 && matchingProducts.length === 0;

  return (
    <View className="flex-1 bg-white">
      {/* Home (still mounted underneath this pushed screen) sets its own
          StatusBar to style="light" (white icons, for its own dark
          gradient header) — expo-status-bar's style is one global native
          call, not scoped per screen, so without this override Search's
          own white bg was left with white-on-white icons. */}
      <StatusBar style="dark" />
      <SearchHeader value={query} onChangeText={setQuery} onBack={() => navigation.goBack()} />

      <View className="flex-1">
        <FlashList
          data={showResults ? matchingProducts : []}
          numColumns={2}
          keyExtractor={(product) => product.id}
          onEndReached={() => {
            if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          // 15 (container) + 5 (cell/header) = 20px outer gutter (px-5), and a
          // 10px inter-column gap, matching the old flex-wrap grid's spacing.
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}
          ListHeaderComponent={
            showResults ? (
              <View style={{ paddingHorizontal: 5 }}>
                {matchingStores.length > 0 ? (
                  <View className="pt-6">
                    <Text className="mb-4 text-lg font-extrabold text-ink">Stores</Text>
                    {matchingStores.map((store) => (
                      <View key={store.id} className="mb-5">
                        <StoreCard store={store} />
                      </View>
                    ))}
                  </View>
                ) : null}
                {matchingProducts.length > 0 ? (
                  <Text className="mb-4 pt-8 text-[18px] font-bold tracking-tight text-ink/90">Products</Text>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isSearching ? (
              <SearchSuggestions />
            ) : search.isError ? (
              <View className="items-center gap-3 px-6 py-12">
                <Text className="text-center text-base text-ink/60">We couldn’t load results. Check your connection and retry.</Text>
                <Pressable accessibilityRole="button" onPress={() => void search.refetch()} className="rounded-xl bg-primary px-5 py-3"><Text className="font-bold text-white">Retry search</Text></Pressable>
              </View>
            ) : isLoadingProducts || search.isDebouncing ? (
              <ActivityIndicator className="py-12" color="#155DFC" />
            ) : hasNoResults ? (
              <View className="items-center px-6 pt-16">
                <Text className="text-center text-[15px] font-medium text-ink/50">No results for &quot;{trimmedQuery}&quot;</Text>
              </View>
            ) : null
          }
          ListFooterComponent={search.isFetchingNextPage ? <ActivityIndicator className="py-4" color="#155DFC" /> : null}
          renderItem={({ item }: { item: Product }) => {
            const availability = productAvailability(item, date);
            return (
              <View style={{ flex: 1, paddingHorizontal: 5, paddingBottom: 20 }}>
                <ProductCard
                  product={item}
                  widthClassName="w-full"
                  estimatedMinutes={estimatedMinutes}
                  isAvailable={availability.isAvailable}
                  availabilityLabel={availability.label}
                />
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}
