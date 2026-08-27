// Reached from a StoreCard's "Shop now" button. Same "sidebar + product
// grid" UI as screens/category-detail/CategoryDetailScreen.tsx — this
// screen reuses that screen's header/sidebar components directly rather
// than a copy, so a layout fix in one place fixes both. Only the data
// source differs: a store's own catalog (data/registry.ts), not a
// category's.
//
// Product cards are the real, shared ProductCard (home/products/) — same
// card every other product grid in the app uses (heart bookmark, ADD
// flush against the image's own corner, size chips, discount% line), not
// the older bespoke CategoryProductCard this used to render, per an
// explicit ask to match.

import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductCard } from '../home/products/ProductCard';
import { CategoryDetailHeader } from '../category-detail/components/CategoryDetailHeader';
import { SubCategorySidebar } from '../category-detail/components/SubCategorySidebar';
import { getStoreDetailData } from './data/registry';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreDetail'>;

export function StoreDetailScreen({ navigation, route }: Props) {
  const { storeId, storeName } = route.params;
  const data = getStoreDetailData(storeId, storeName);
  const [selectedSubId, setSelectedSubId] = useState(data.subCategories[0]?.id ?? 'all');
  const products = data.productsBySubCategory[selectedSubId] ?? [];

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* This screen is reached straight from StoreListScreen, which sets
          the global StatusBar to "light" for its own dark photo banner —
          that doesn't reset on navigation (same fix class as Categories/
          Purchase/StoreListScreen's own notes) and left invisible white
          icons against this screen's white header. */}
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
