// Horizontal product row, same ProductCard used everywhere else on Home —
// reuses EVERYDAY_ESSENTIALS_PRODUCTS rather than a fourth copy of similar
// placeholder data, since there's no real recommendation engine to call yet.

import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../../home/products/ProductCard';
import { EVERYDAY_ESSENTIALS_PRODUCTS } from '../../home/everyday-essentials/data';

export function RecommendedForYouRow() {
  return (
    <View className="pt-2">
      <Text className="mb-3 text-lg font-semibold text-ink">Recommended for you</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
        {EVERYDAY_ESSENTIALS_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-32" />
        ))}
      </ScrollView>
    </View>
  );
}
