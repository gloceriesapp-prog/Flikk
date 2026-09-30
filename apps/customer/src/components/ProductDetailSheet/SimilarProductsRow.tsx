// "Similar products" section — last section in ProductDetailInfo.tsx's one
// continuous white flow, not its own separately-boxed card. A wrapping
// 3-column grid (not horizontal scroll), capped at 9 products (3 rows) —
// reuses the same card UI as everywhere else (its own ADD/stepper), same
// convention as other grid rows in this app (e.g. home/products/
// ProductSection). px-4, matching every other section's own horizontal
// padding above it.
//
// Uses ProductCardView (presentational only), not ProductCard — ProductCard
// wraps this same view with tap-to-open-ProductDetailSheet, and this file
// renders inside ProductDetailSheet's own component tree, so importing
// ProductCard here would close a require cycle (ProductCard ->
// ProductDetailSheet -> ... -> SimilarProductsRow -> ProductCard). Tapping a
// similar-product card here is a no-op beyond its own ADD button — it
// doesn't open a second, nested detail sheet.

import { Text, View } from 'react-native';
import { ProductCardView } from '../../screens/home/products/ProductCardView';
import type { Product } from '../../screens/home/products/types';

const MAX_PRODUCTS = 9;

interface Props {
  products: Product[];
}

export function SimilarProductsRow({ products }: Props) {
  return (
    <View className="gap-3 px-4 pb-4 pt-3">
      <Text className="text-[17px] font-bold text-ink">Similar products</Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-4">
        {products.slice(0, MAX_PRODUCTS).map((product) => (
          <ProductCardView key={product.id} product={product} widthClassName="w-[31%]" />
        ))}
      </View>
    </View>
  );
}
