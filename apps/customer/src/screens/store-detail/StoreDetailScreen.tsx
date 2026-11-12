// Store-only browsing: category names in the sidebar, matching subcategory
// tiles above a paged product grid. Search and recommendations keep store scope.

import { useEffect, useState } from 'react';
import { ScreenStatusBar as StatusBar } from '../../components/ScreenStatusBar';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductCard } from '../home/products/ProductCard';
import type { Product } from '../home/products/types';
import { StoreCategorySidebar } from './components/StoreCategorySidebar';
import { SearchHeader } from '../search/components/SearchHeader';
import { StoreCategoryGrid } from './components/StoreCategoryGrid';
import { StoreDetailHeader } from './components/StoreDetailHeader';
import { StorePriceRangeSheet, type StorePriceRange } from './components/StorePriceRangeSheet';
import { StoreProductFilterBar } from './components/StoreProductFilterBar';
import { StoreSortSheet, type StoreProductSort } from './components/StoreSortSheet';
import { useStoreProducts } from './useStoreProducts';
import { useCopy } from '../../api/appConfig';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreDetail'>;

export function StoreDetailScreen({ navigation, route }: Props) {
  return <StoreDetailContent key={route.params.storeId} navigation={navigation} route={route} />;
}

function StoreDetailContent({ navigation, route }: Props) {
  const { storeId, storeName } = route.params;
  const emptyText = useCopy('store.empty.title');
  const [selectedId, setSelectedId] = useState('all');
  const [subcategory, setSubcategory] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);
  const selectCategory = (id: string) => { setSelectedId(id); setSubcategory('all'); };

  const [vegOnly, setVegOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [sort, setSort] = useState<StoreProductSort>('relevance');
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<StorePriceRange>('all');
  const [isPriceSheetOpen, setIsPriceSheetOpen] = useState(false);

  // Every filter/sort is a server query param over the whole catalogue.
  const catalog = useStoreProducts(storeId, { category: selectedId, subcategory, query, veg: vegOnly, deals: dealsOnly, price: priceRange, sort });
  const { categories, subcategories, products: visibleProducts } = catalog;
  const selectedCategory = categories.find(c => c.id === selectedId);
  const selectedSubcategory = subcategories.find(c => c.id === subcategory);
  const listIdentity = [selectedId, subcategory, query, vegOnly, dealsOnly, sort, priceRange].join('|');

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* This screen is reached straight from StoreListScreen, which sets
          the global StatusBar to "light" for its own dark photo banner —
          that doesn't reset on navigation (same fix class as Categories/
          Purchase/StoreListScreen's own notes) and left invisible white
          icons against this screen's white header. */}
      <StatusBar style="dark" />
      <StoreDetailHeader
        title={storeName}
        onBack={() => navigation.goBack()}
        onSearch={() => setSearchOpen(true)}
      />

      <View className="flex-1 flex-row">
        {/* Full-height sidebar, starting right below the header — the
            filter bar belongs to the right-hand content column only, per
            an explicit ask, not spanning over the sidebar as a full-width
            bar above it. */}
        <StoreCategorySidebar items={categories} selectedId={selectedId} onSelect={selectCategory} />

        <View className="flex-1">
          {searchOpen && <SearchHeader embedded placeholderText="Search this store" value={searchText} onChangeText={setSearchText}
            onBack={() => { setSearchOpen(false); setSearchText(''); setQuery(''); }}
            onSubmit={() => setQuery(searchText.trim())} />}
          {catalog.categoriesQuery.isError && <Pressable accessibilityRole="button" onPress={() => void catalog.categoriesQuery.refetch()} className="px-3 py-2">
            <Text className="text-sm text-[#155DFC]">Couldn’t load store categories. Tap to retry.</Text>
          </Pressable>}
          {/* Fixed within this column — a sibling of the ScrollView below,
              not inside it, so it stays put while the product grid scrolls
              underneath instead of scrolling away with it. */}
          <StoreProductFilterBar
            vegOnly={vegOnly}
            onToggleVegOnly={() => setVegOnly((v) => !v)}
            dealsOnly={dealsOnly}
            onToggleDealsOnly={() => setDealsOnly((v) => !v)}
            sort={sort}
            onOpenSort={() => setIsSortSheetOpen(true)}
            priceRange={priceRange}
            onOpenPriceRange={() => setIsPriceSheetOpen(true)}
          />

          {/* FlashList, not a ScrollView + flex-wrap — a store's full real
              catalog is loaded in bounded pages, unlike Home's fixed
              4-6-item teaser rows, so this can genuinely grow long.
              className on the wrapping View, not FlashList itself —
              FlashList isn't one of NativeWind's auto-patched core
              components (same gotcha AppImage.tsx/BlurView already
              document elsewhere), so a className directly on it would
              silently no-op. StoreCategoryGrid moves to ListHeaderComponent
              (renders once, full-width, above the columned grid regardless
              of numColumns — not itself subject to column-splitting) and
              the empty state becomes ListEmptyComponent, the real prop
              FlatList/FlashList both have for exactly this. */}
          <View className="flex-1 bg-white">
            <FlashList
              key={listIdentity}
              onEndReached={() => { if (catalog.hasNextPage && !catalog.isFetching && !catalog.isFetchNextPageError) void catalog.fetchNextPage(); }}
              onEndReachedThreshold={0.4}
              data={visibleProducts}
              numColumns={2}
              ListFooterComponent={catalog.hasNextPage || catalog.isError ? (
                <Pressable accessibilityRole="button" disabled={catalog.isFetching} onPress={() => { void (catalog.hasNextPage ? catalog.fetchNextPage() : catalog.refetch()); }} className="items-center py-4">
                  <Text className="font-semibold text-[#155DFC]">{catalog.isFetching ? 'Loading…' : catalog.isError ? 'Try again' : 'Load more products'}</Text>
                </Pressable>
              ) : null}
              keyExtractor={(product: Product) => product.id}
              contentContainerStyle={{ paddingVertical: 12, paddingLeft: 2, paddingRight: 12, paddingBottom: 64 }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                // All shows parent categories; a selected category shows its own subcategories.
                <View>
                  {selectedId === 'all' ? <StoreCategoryGrid categories={categories} onSelect={selectCategory} /> : (
                    <>
                      <StoreCategoryGrid categories={subcategories} title={selectedCategory?.label ?? 'Subcategories'}
                        selectedId={subcategory} onSelect={setSubcategory} />
                      {catalog.subcategoriesQuery.isPending && <Text className="px-1 py-3 text-sm text-ink/50">Loading subcategories…</Text>}
                      {catalog.subcategoriesQuery.isError && <Pressable accessibilityRole="button" onPress={() => void catalog.subcategoriesQuery.refetch()} className="px-1 py-3">
                        <Text className="text-sm text-[#155DFC]">Couldn’t load subcategories. Tap to retry.</Text>
                      </Pressable>}
                      <Pressable accessibilityRole="button" accessibilityState={{ selected: subcategory === 'all' }}
                        onPress={() => setSubcategory('all')} className="mb-4 self-start rounded-xl bg-[#F3F4F6] px-3 py-2">
                        <Text className="text-[12px] font-semibold text-ink">All {selectedCategory?.label ?? 'products'}</Text>
                      </Pressable>
                    </>
                  )}
                  <Text accessibilityRole="header" className="mb-4 px-1 text-[18px] font-bold tracking-tight text-ink/90">
                    {selectedSubcategory?.label ?? (selectedId === 'all' ? 'All products' : selectedCategory?.label ?? 'Products')}
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View className="w-full items-center py-16">
                  <Text className="text-sm text-ink/50">{catalog.isPending ? 'Loading products…' : catalog.isError ? 'Couldn’t load products.' : emptyText}</Text>
                </View>
              }
              renderItem={({ item }: { item: Product }) => (
                <View style={{ flex: 1, paddingHorizontal: 6, paddingBottom: 24 }}>
                  <ProductCard product={item} widthClassName="w-full" showDiscountBadge />
                </View>
              )}
            />
          </View>
        </View>
      </View>

      <StoreSortSheet visible={isSortSheetOpen} value={sort} onSelect={setSort} onClose={() => setIsSortSheetOpen(false)} />
      <StorePriceRangeSheet
        visible={isPriceSheetOpen}
        value={priceRange}
        onSelect={setPriceRange}
        onClose={() => setIsPriceSheetOpen(false)}
      />
    </View>
  );
}
