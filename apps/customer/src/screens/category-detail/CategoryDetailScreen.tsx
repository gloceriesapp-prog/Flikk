// Generic "sidebar + product grid" screen — reached by tapping any category
// anywhere in the app (Home's category tabs, a groceries sub-category tile,
// a CategoriesScreen tile). The layout never changes; only which
// CategoryDetailData the tapped id resolves to (see data/registry.ts) does.

import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CategoryDetailHeader } from './components/CategoryDetailHeader';
import { CategoryProductCard } from './components/CategoryProductCard';
import { SubCategorySidebar } from './components/SubCategorySidebar';
import { getCategoryDetailData } from './data/registry';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CategoryDetail'>;

// Pastel tints rotated across the grid — matches the reference's varied
// per-card backgrounds instead of one flat color for every product.
const CARD_TINTS = ['bg-rose-50', 'bg-orange-50', 'bg-lime-50', 'bg-emerald-50'];

export function CategoryDetailScreen({ navigation, route }: Props) {
  const { categoryId, label } = route.params;
  const data = getCategoryDetailData(categoryId, label);
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
