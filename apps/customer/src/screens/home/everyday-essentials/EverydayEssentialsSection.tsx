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
//
// Real catalog products (useEverydayEssentials.ts -> GET
// /stores/products/catalog), not the old EVERYDAY_ESSENTIALS_PRODUCTS mock
// — same products a founder adds via admin's Inventory screen. Renders
// nothing when the catalog is empty, same convention AllTabSections.tsx
// uses for the deals row.

import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../products/ProductCard';
import { useEverydayEssentials } from './useEverydayEssentials';

export function EverydayEssentialsSection() {
  const { data: products = [] } = useEverydayEssentials();

  if (products.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-lg font-bold text-ink">Today&apos;s Stock</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-28" showDiscountBadge />
        ))}
      </ScrollView>
    </View>
  );
}
