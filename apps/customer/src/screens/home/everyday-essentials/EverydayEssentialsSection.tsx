// Home's "All" tab — sits right below NearbyStoresSection (see
// screens/home/sections/AllTabSections.tsx for the order). Unlike that
// section, this one *does* scroll horizontally — 5 products don't fit in
// one static row at a legible card size, and horizontal scroll is the
// established pattern for product rows on Home already (see
// screens/home/category-tab/components/ProductTeaserRow.tsx).
//
// Reuses ProductCard as-is (the same card screens/home/products/ProductSection.tsx
// uses for Today's Deal/Bestsellers) — the reference for this row is that
// exact card, just laid out horizontally instead of a wrapping grid.

import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import { EVERYDAY_ESSENTIALS_PRODUCTS } from './data';

export function EverydayEssentialsSection() {
  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-lg font-medium text-ink">Today&apos;s Stock</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
        {EVERYDAY_ESSENTIALS_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-36" showDiscountBadge />
        ))}
      </ScrollView>
    </View>
  );
}
