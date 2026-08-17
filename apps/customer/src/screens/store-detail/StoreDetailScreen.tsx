// Reached from a StoreCard's "Shop now" button. Same "sidebar + product
// grid" UI as screens/category-detail/CategoryDetailScreen.tsx — this
// screen reuses that screen's header/sidebar/card components directly
// rather than a copy, so a layout fix in one place fixes both. Only the
// data source differs: a store's own catalog (data/registry.ts), not a
// category's.

import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CategoryDetailHeader } from '../category-detail/components/CategoryDetailHeader';
import { CategoryProductCard } from '../category-detail/components/CategoryProductCard';
import { SubCategorySidebar } from '../category-detail/components/SubCategorySidebar';
import { getStoreDetailData } from './data/registry';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreDetail'>;

// Pastel tints rotated across the grid — matches CategoryDetailScreen's
// varied per-card backgrounds instead of one flat color for every product.
const CARD_TINTS = ['bg-rose-50', 'bg-orange-50', 'bg-lime-50', 'bg-emerald-50'];

export function StoreDetailScreen({ navigation, route }: Props) {
  const { storeId, storeName } = route.params;
  const data = getStoreDetailData(storeId, storeName);
  const [selectedSubId, setSelectedSubId] = useState(data.subCategories[0]?.id ?? 'all');
  const products = data.productsBySubCategory[selectedSubId] ?? [];

  return (
    <View className="flex-1 bg-white pt-safe">
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
          {products.map((product, index) => (
            <CategoryProductCard key={product.id} product={product} bgClassName={CARD_TINTS[index % CARD_TINTS.length]} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
