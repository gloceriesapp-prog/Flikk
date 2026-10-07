import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import type { Product } from '../../home/products/types';
import { GroceryProductTile } from '../../home/groceries/components/GroceryProductTile';
import { CategoryFilterBar } from '../filters/CategoryFilterBar';
import { CategoryFilterSheet } from '../filters/CategoryFilterSheet';
import { activeFilterCount, DEFAULT_FILTERS, getTypeOptions, type FilterPanel, type ProductFilters } from '../filters/productFilters';

interface Props {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  previewOnly: boolean;
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  serverTypes?: string[];
  serverBrands?: string[];
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export function CategoryProductPane({ products, isLoading, isError, onRetry, previewOnly, filters, onFiltersChange, serverTypes, serverBrands, onLoadMore, loadingMore }: Props) {
  const [panel, setPanel] = useState<FilterPanel | null>(null);
  const list = useRef<FlashListRef<Product>>(null);
  const types = useMemo(() => serverTypes ? serverTypes.map(label => ({ id: label.toLowerCase(), label })) : getTypeOptions(products), [products, serverTypes]);
  const brands = useMemo(() => (serverBrands ?? []).map(name => ({ id: name, name, productIds: [] })), [serverBrands]);
  const filteredProducts = products;
  const changeFilters = (next: ProductFilters) => {
    onFiltersChange(next);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };

  return (
    // Constrain the filter ScrollView to the product column on every width.
    <View className="flex-1 overflow-hidden bg-mist/30" style={{ minWidth: 0 }}>
      <CategoryFilterBar filters={filters} onOpen={setPanel} />
      {isError && products.length > 0 && <Pressable accessibilityRole="button" onPress={onRetry} className="px-3 py-2"><Text className="text-[12px] text-[#155DFC]">Couldn’t refresh products. Tap to retry.</Text></Pressable>}
      <View className="flex-1">
        <FlashList
          ref={list}
          data={filteredProducts}
          numColumns={2}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color="#155DFC" /> : null}
          keyExtractor={(product) => product.id}
          contentContainerStyle={{ paddingTop: 8, paddingLeft: 2, paddingRight: 12, paddingBottom: 64 }}
          showsVerticalScrollIndicator={false}
          refreshing={previewOnly ? undefined : isLoading}
          onRefresh={previewOnly ? undefined : onRetry}
          ListEmptyComponent={
            <View className="items-center gap-3 px-4 py-12">
              {isLoading ? <ActivityIndicator accessibilityLabel="Loading products" color="#155DFC" /> : <>
                <Text className="text-center text-[14px] leading-5 text-ink/60">{isError ? 'We couldn’t load these products.' : products.length > 0 ? 'No products match your filters.' : 'No products available in this category yet.'}</Text>
                {isError ? <Pressable accessibilityRole="button" onPress={onRetry} className="min-h-11 justify-center rounded-xl bg-coral px-4"><Text className="font-semibold text-ink">Try again</Text></Pressable> : activeFilterCount(filters) > 0 && <Pressable accessibilityRole="button" onPress={() => changeFilters({ ...DEFAULT_FILTERS })} className="min-h-11 justify-center px-4"><Text className="font-semibold text-[#155DFC]">Clear filters</Text></Pressable>}
              </>}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1, paddingHorizontal: 6, paddingBottom: 24 }}>
              <GroceryProductTile product={item} previewOnly={previewOnly} />
            </View>
          )}
        />
      </View>
      <CategoryFilterSheet panel={panel} filters={filters} types={types} brands={brands} onChange={changeFilters} onClose={() => setPanel(null)} />
    </View>
  );
}
