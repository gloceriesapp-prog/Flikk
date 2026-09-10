// "Recommended for you" — sits directly below StoreCategoryGrid, above the
// flat product list, same 'All'-view-only placement. Uses the exact same
// shared ProductCard (home/products/) every other product grid in this app
// uses — not a bespoke card — so ADD/wishlist/quantity-stepper behavior is
// identical everywhere, per an explicit ask.
//
// TEMPORARY: dummyRecommendedProducts.ts stands in until a real
// recommendation source exists (no per-customer ranking signal is computed
// anywhere yet) — same "preview-only, delete once real" convention as this
// folder's own dummyStoreCategories.ts.

import { Text, View } from 'react-native';
import { ProductCard } from '../../home/products/ProductCard';
import { DUMMY_RECOMMENDED_PRODUCTS } from './dummyRecommendedProducts';

export function StoreRecommendedSection() {
  return (
    <View className="mb-2 w-full">
      <Text className="mb-3 px-1 text-lg font-semibold text-ink">Most bought items</Text>
      <View className="flex-row flex-wrap justify-between gap-y-6">
        {DUMMY_RECOMMENDED_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-[47%]" showDiscountBadge />
        ))}
      </View>
    </View>
  );
}
