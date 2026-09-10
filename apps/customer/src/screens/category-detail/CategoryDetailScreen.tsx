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
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductCard } from '../home/products/ProductCard';
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

        <ScrollView
          className="flex-1 bg-mist/30"
          contentContainerClassName="flex-row flex-wrap gap-x-3 gap-y-6 py-3 pl-0.5 pr-3 pb-16"
          showsVerticalScrollIndicator={false}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} widthClassName="w-[47%]" showDiscountBadge />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
