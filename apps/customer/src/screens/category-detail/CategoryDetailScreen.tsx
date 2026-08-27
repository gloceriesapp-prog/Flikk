// Generic "sidebar + product grid" screen — reached by tapping any category
// anywhere in the app (Home's category tabs, a groceries sub-category tile,
// a CategoriesScreen tile). The layout never changes; only which
// CategoryDetailData the tapped id resolves to (see data/registry.ts) does.
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
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CategoryDetail'>;

export function CategoryDetailScreen({ navigation, route }: Props) {
  const { categoryId, label } = route.params;
  const data = getCategoryDetailData(categoryId, label);
  const [selectedSubId, setSelectedSubId] = useState(data.subCategories[0]?.id ?? 'all');
  const products = data.productsBySubCategory[selectedSubId] ?? [];

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* Reachable from StoreListScreen (dark photo banner, sets StatusBar
          to "light") among other places — that doesn't reset on navigation,
          same fix class as Categories/Purchase/StoreListScreen/
          StoreDetailScreen's own notes. */}
      <StatusBar style="dark" />
      <CategoryDetailHeader
        title={data.title}
        onBack={() => navigation.goBack()}
        onSearch={() => navigation.navigate('Search')}
      />

      <View className="flex-1 flex-row">
        <SubCategorySidebar items={data.subCategories} selectedId={selectedSubId} onSelect={setSelectedSubId} />

        <ScrollView
          className="flex-1 bg-mist/30"
          contentContainerClassName="flex-row flex-wrap gap-x-3 gap-y-6 p-3 pb-16"
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
