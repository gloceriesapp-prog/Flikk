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
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductCard } from '../home/products/ProductCard';
import { SubCategorySidebar } from '../category-detail/components/SubCategorySidebar';
import { StoreCategoryGrid } from './components/StoreCategoryGrid';
import { DUMMY_STORE_CATEGORIES } from './components/dummyStoreCategories';
import { StoreDetailHeader } from './components/StoreDetailHeader';
import { StorePriceRangeSheet, matchesPriceRange, type StorePriceRange } from './components/StorePriceRangeSheet';
import { StoreProductFilterBar } from './components/StoreProductFilterBar';
import { StoreRecommendedSection } from './components/StoreRecommendedSection';
import { StoreSortSheet, type StoreProductSort } from './components/StoreSortSheet';
import { useStoreProducts } from './useStoreProducts';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreDetail'>;

export function StoreDetailScreen({ navigation, route }: Props) {
  const { storeId, storeName } = route.params;
  const { data } = useStoreProducts(storeId);
  const categories = data?.categories ?? [];
  const products = data?.products ?? [];

  // TEMPORARY: same dummyStoreCategories.ts fallback StoreCategoryGrid
  // already uses — most real stores here don't have enough distinct
  // categories yet to preview the bigger sidebar tiles with a real,
  // scrollable list. Only stands in when there's nothing real beyond
  // 'All'; never overrides a store's real categories.
  const sidebarItems = categories.length > 1 ? categories : [categories[0] ?? { id: 'all', label: 'All' }, ...DUMMY_STORE_CATEGORIES];

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

          <ScrollView
            className="flex-1 bg-white"
            contentContainerClassName="flex-row flex-wrap gap-x-3 gap-y-6 py-3 pl-0.5 pr-3 pb-16"
            showsVerticalScrollIndicator={false}
          >
            {/* Quick-jump grid — only on 'All', above the flat product list.
                Once a specific category is picked there's nothing left for it
                to jump to, so it steps aside for the product grid itself. */}
            {selectedId === 'all' && (
              <>
                <StoreCategoryGrid categories={categories} products={products} onSelect={setSelectedId} />
                <StoreRecommendedSection />
              </>
            )}

            {visibleProducts.length === 0 && (
              <View className="w-full items-center py-16">
                <Text className="text-sm text-ink/50">No items here yet.</Text>
              </View>
            )}
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} widthClassName="w-[47%]" showDiscountBadge />
            ))}
          </ScrollView>
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
