// Generic "sidebar + product grid" screen — reached by tapping any category
// anywhere in the app (Home's category tabs, a groceries sub-category tile,
// a CategoriesScreen tile). The layout never changes; only which content
// fills it does.
//
// Real categories (created via admin's Categories screen — a real UUID
// categoryId) get real sub-categories + real products
// (useRealCategoryDetail.ts -> GET /categories/:id/subcategories, /:id/products,
// /subcategories/:id/products). Older category taps that were never real
// rows (Home's own category tabs, e.g. 'fresh-fish') get zero sub-categories
// back and fall through to the mock registry (data/registry.ts) unchanged —
// no tile in the app becomes a dead end either way.
//
// Product cards are the real, shared ProductCard (home/products/) — same
// card every other product grid in the app uses, not the older bespoke
// CategoryProductCard this used to render (also used by
// store-detail/StoreDetailScreen.tsx, updated the same way, same ask).

import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductCard } from '../home/products/ProductCard';
import type { Product } from '../home/products/types';
import { CategoryDetailHeader } from './components/CategoryDetailHeader';
import { SubCategorySidebar } from './components/SubCategorySidebar';
import { getCategoryDetailData } from './data/registry';
import { useCategoryProducts, useRealSubCategories, useSubCategoryProducts } from './useRealCategoryDetail';
import type { DetailSubCategory } from './types';
import type { AppStackParamList } from '../../navigation/types';

const ALL_TAB: DetailSubCategory = { id: 'all', label: 'All' };

type Props = NativeStackScreenProps<AppStackParamList, 'CategoryDetail'>;

export function CategoryDetailScreen({ navigation, route }: Props) {
  const { categoryId, label } = route.params;
  const [selectedSubId, setSelectedSubId] = useState('all');

  const { data: realSubCategories = [] } = useRealSubCategories(categoryId);
  const isReal = realSubCategories.length > 0;

  const { data: allProducts = [] } = useCategoryProducts(isReal ? categoryId : '');
  const { data: subProducts = [] } = useSubCategoryProducts(
    isReal && selectedSubId !== 'all' ? selectedSubId : undefined,
  );

  const mock = getCategoryDetailData(categoryId, label);

  const title = isReal ? label : mock.title;
  const sidebarItems = isReal ? [ALL_TAB, ...realSubCategories] : mock.subCategories;
  const products = isReal
    ? selectedSubId === 'all'
      ? allProducts
      : subProducts
    : (mock.productsBySubCategory[selectedSubId] ?? mock.productsBySubCategory[mock.subCategories[0]?.id ?? 'all'] ?? []);

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* Reachable from StoreListScreen (dark photo banner, sets StatusBar
          to "light") among other places — that doesn't reset on navigation,
          same fix class as Categories/Purchase/StoreListScreen/
          StoreDetailScreen's own notes. */}
      <StatusBar style="dark" />
      <CategoryDetailHeader
        title={title}
        onBack={() => navigation.goBack()}
        onSearch={() => navigation.navigate('Search')}
      />

      <View className="flex-1 flex-row">
        <SubCategorySidebar items={sidebarItems} selectedId={selectedSubId} onSelect={setSelectedSubId} />

        {/* FlashList, not a ScrollView + flex-wrap — a real category's full
            product catalog has no cap (useCategoryProducts/
            useSubCategoryProducts return everything, unlike Home's own
            4-6-item teaser rows), so this can genuinely grow long.
            className on the wrapping View, not FlashList itself — FlashList
            isn't one of NativeWind's auto-patched core components (same
            gotcha AppImage.tsx/BlurView already document elsewhere in this
            app), so a className directly on it would silently no-op. */}
        <View className="flex-1 bg-mist/30">
          <FlashList
            data={products}
            numColumns={2}
            keyExtractor={(product: Product) => product.id}
            contentContainerStyle={{ paddingVertical: 12, paddingLeft: 2, paddingRight: 12, paddingBottom: 64 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: Product }) => (
              <View style={{ flex: 1, paddingHorizontal: 6, paddingBottom: 24 }}>
                <ProductCard product={item} widthClassName="w-full" showDiscountBadge />
              </View>
            )}
          />
        </View>
      </View>
    </View>
  );
}
