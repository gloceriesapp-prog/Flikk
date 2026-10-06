// Reached from a StoreCard's "Shop now" button. Same "sidebar + product
// grid" UI as screens/category-detail/CategoryDetailScreen.tsx — this
// screen reuses that screen's header/sidebar components directly rather
// than a copy, so a layout fix in one place fixes both.
//
// Real catalog (useStoreProducts.ts -> GET /stores/:id/products) — a
// product only ever belongs to the one store it was added under in admin's
// Inventory screen, so this screen only ever shows that store's own items,
// never another store's or Home's own tab data. Sidebar categories are
// whatever categories this store's own products actually use, "All" first.
//
// Product cards are the real, shared ProductCard (home/products/) — same
// card every other product grid in the app uses.

import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductCard } from '../home/products/ProductCard';
import type { Product } from '../home/products/types';
import { SubCategorySidebar } from '../category-detail/components/SubCategorySidebar';
import { StoreCategoryGrid } from './components/StoreCategoryGrid';
import { StoreDetailHeader } from './components/StoreDetailHeader';
import { StorePriceRangeSheet, matchesPriceRange, type StorePriceRange } from './components/StorePriceRangeSheet';
import { StoreProductFilterBar } from './components/StoreProductFilterBar';
import { StoreSortSheet, type StoreProductSort } from './components/StoreSortSheet';
import { useStoreProducts } from './useStoreProducts';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreDetail'>;

export function StoreDetailScreen({ navigation, route }: Props) {
  const { storeId, storeName } = route.params;
  const catalog = useStoreProducts(storeId);
  const { data } = catalog;
  const categories = data?.categories ?? [];
  const products = data?.products ?? [];

  // Real categories only — no dummy fallback (dummyStoreCategories.ts
  // removed per an explicit ask). A store with nothing beyond 'All' just
  // shows the one real 'All' entry.
  const sidebarItems = categories.length > 0 ? categories : [{ id: 'all', label: 'All' }];

  const [selectedId, setSelectedId] = useState('all');
  useEffect(() => {
    Promise.resolve().then(() => setSelectedId('all'));
  }, [storeId]);

  const [vegOnly, setVegOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [sort, setSort] = useState<StoreProductSort>('relevance');
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<StorePriceRange>('all');
  const [isPriceSheetOpen, setIsPriceSheetOpen] = useState(false);

  const visibleProducts = (() => {
    let result = selectedId === 'all' ? products : products.filter((p) => p.categoryLabel === selectedId);
    if (vegOnly) result = result.filter((p) => p.isVeg !== false);
    // Real signal — the same originalPrice field ProductCard's own
    // showDiscountBadge already reads on this screen, not a fabricated
    // "deal" flag.
    if (dealsOnly) result = result.filter((p) => (p.originalPrice ?? 0) > p.price);
    if (priceRange !== 'all') result = result.filter((p) => matchesPriceRange(p.price, priceRange));
    if (sort === 'price_low') result = [...result].sort((a, b) => a.price - b.price);
    if (sort === 'price_high') result = [...result].sort((a, b) => b.price - a.price);
    return result;
  })();

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
        onSearch={() => navigation.navigate('Search')}
      />

      <View className="flex-1 flex-row">
        {/* Full-height sidebar, starting right below the header — the
            filter bar belongs to the right-hand content column only, per
            an explicit ask, not spanning over the sidebar as a full-width
            bar above it. */}
        <SubCategorySidebar items={sidebarItems} selectedId={selectedId} onSelect={setSelectedId} />

        <View className="flex-1">
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
                // Quick-jump grid — only on 'All', above the flat product
                // list. Once a specific category is picked there's nothing
                // left for it to jump to, so it steps aside for the
                // product grid itself.
                selectedId === 'all' ? <StoreCategoryGrid categories={categories} products={products} onSelect={setSelectedId} /> : null
              }
              ListEmptyComponent={
                <View className="w-full items-center py-16">
                  <Text className="text-sm text-ink/50">{catalog.isPending ? 'Loading products…' : catalog.hasNextPage ? 'Load more to find additional products.' : catalog.isError ? 'Couldn’t load products.' : 'No items here yet.'}</Text>
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
