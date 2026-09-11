// Home's "All" tab — sits right below DealsSection (see
// screens/home/sections/AllTabSections.tsx for the order). Same pattern as
// everyday-essentials/EverydayEssentialsSection.tsx: reuses ProductCard
// as-is in a horizontal ScrollView, own file/data per section rather than
// one screen file owning every row inline.

import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import { COASTAL_KITCHEN_PICKS_PRODUCTS } from './data';

export function CoastalKitchenPicksSection() {
  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-lg font-extrabold text-ink">Coastal Kitchen picks</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
        {COASTAL_KITCHEN_PICKS_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-28" showDiscountBadge />
        ))}
      </ScrollView>
    </View>
  );
}
