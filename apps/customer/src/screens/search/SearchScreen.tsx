// Item-only search: live products and their admin-added flavours, with
// product suggestions while typing and a paged results grid on submission.
import { useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenStatusBar as StatusBar } from '../../components/ScreenStatusBar';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductCard } from '../home/products/ProductCard';
import type { Product } from '../home/products/types';
import { useDeliveryEstimateMinutes } from '../../api/deliverySettings';
import { productAvailability } from '../../utils/productAvailability';
import { searchProductDisplay } from '../../components/ProductDetailSheet/flavourSelection';
import { useProductSearch } from './useProductSearch';
import { SearchHeader } from './components/SearchHeader';
import { SearchSuggestions } from './components/SearchSuggestions';
import { SearchTypeahead } from './components/SearchTypeahead';
import { buildSuggestions, type TypeaheadSuggestion } from './searchTypeahead';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Search'>;

const MIN_QUERY_LENGTH = 2;
// About five suggestion rows; the rest scroll inside the panel.
const TYPEAHEAD_MAX_HEIGHT = 280;

export function SearchScreen({ navigation }: Props) {
  const [query, setQueryValue] = useState('');
  // Typing shows text suggestions (SearchTypeahead); the keyboard search key
  // or a picked suggestion submits and shows the full results. Editing the
  // text again goes back to suggestions.
  const [submitted, setSubmitted] = useState(false);
  const setQuery = (text: string) => { setQueryValue(text); setSubmitted(false); };
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const submit = () => { if (isSearching) { setSubmitted(true); Keyboard.dismiss(); } };

  const search = useProductSearch(query);
  const { data: matchingProducts = [], isLoading: isLoadingProducts } = search;

  const suggestions = useMemo(
    () => (isSearching && !submitted
      ? buildSuggestions(trimmedQuery, matchingProducts.map((p) => searchProductDisplay(p).name))
      : []),
    [isSearching, submitted, trimmedQuery, matchingProducts],
  );
  const pickSuggestion = (s: TypeaheadSuggestion) => {
    Keyboard.dismiss();
    setQueryValue(s.label);
    setSubmitted(true);
  };

  // Delivery estimate + browse clock lifted ONCE for the whole grid (issue #22,
  // same as ProductSection used to do) instead of each card self-subscribing —
  // the 30s tick re-renders this screen node, renderItem recomputes each
  // product's (cheap, pure) availability, and the memoized card only re-renders
  // for a product whose availability actually changed.
  const estimatedMinutes = useDeliveryEstimateMinutes();

  // Final results view: searching, settled (not loading/debouncing/errored).
  // Only then do we surface the product grid; while a query is still
  // resolving we show the spinner alone, as before.
  const showResults = isSearching && submitted && !search.isError && !isLoadingProducts && !search.isDebouncing;
  const hasNoResults = showResults && matchingProducts.length === 0;

  return (
    <View className="flex-1 bg-white">
      {/* Home (still mounted underneath this pushed screen) sets its own
          StatusBar to style="light" (white icons, for its own dark
          gradient header) — expo-status-bar's style is one global native
          call, not scoped per screen, so without this override Search's
          own white bg was left with white-on-white icons. */}
      <StatusBar style="dark" />
      <SearchHeader value={query} onChangeText={setQuery} onBack={() => navigation.goBack()} onSubmit={submit} />

      <View className="flex-1">
        <FlashList
          data={showResults ? matchingProducts : []}
          numColumns={2}
          keyExtractor={(product) => product.id}
          onEndReached={() => {
            if (showResults && search.hasNextPage && !search.isFetchingNextPage && !search.isFetchNextPageError) void search.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          // 15 (container) + 5 (cell/header) = 20px outer gutter (px-5), and a
          // 10px inter-column gap, matching the old flex-wrap grid's spacing.
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}
          ListHeaderComponent={
            showResults ? (
              <View style={{ paddingHorizontal: 5 }}>
                {matchingProducts.length > 0 ? (
                  <Text className="mb-4 pt-8 text-[18px] font-bold tracking-tight text-ink/90">Products</Text>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            // Browse content stays under the typing suggestions panel.
            !isSearching || !submitted ? (
              // Cancel the grid's 15px side padding: suggestions own their
              // gutter and their rows bleed to the screen edge.
              <View style={{ marginHorizontal: -15 }}>
                <SearchSuggestions />
              </View>
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
            const availability = productAvailability(item);
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
        {/* Typing suggestions: a capped-height panel floating under the
            search bar, so the page stays visible below it. */}
        {isSearching && !submitted ? (
          <View className="absolute left-4 right-4 top-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white"
            style={{ maxHeight: TYPEAHEAD_MAX_HEIGHT }}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <SearchTypeahead query={query} suggestions={suggestions} onPick={pickSuggestion} onSearch={submit} />
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}
