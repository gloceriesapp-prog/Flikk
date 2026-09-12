// "Recommendation" — sits on the Purchase screen, below the order list.
// Real catalog products only (useEverydayEssentials -> GET
// /stores/products/catalog, same feed Home's "Today's Stock" row uses),
// capped at VISIBLE_COUNT — no dummy padding (dummyRecommendationProducts.ts
// removed per an explicit ask); shows however many real products actually
// exist, up to that cap, and nothing at all once the real catalog is
// empty.
//
// Uses the shared ProductCard as-is (real ADD/wishlist/quantity-stepper
// behavior, same as every other product grid). 3 per row, title-only
// header (no subheading), 17px per an explicit ask.

import { Text, View } from 'react-native';
import { ProductCard } from '../../home/products/ProductCard';
import { useEverydayEssentials } from '../../home/everyday-essentials/useEverydayEssentials';

const VISIBLE_COUNT = 9;
const CARD_WIDTH = 'w-[31%]';

export function PurchaseRecommendations() {
  const { data: realProducts = [] } = useEverydayEssentials();
  const visibleProducts = realProducts.slice(0, VISIBLE_COUNT);

  if (visibleProducts.length === 0) return null;

  return (
    <View className="mt-6">
      <Text className="text-[17px] font-bold text-ink">Picked Just For You</Text>

      <View className="mt-3.5 flex-row flex-wrap justify-between">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={`${CARD_WIDTH} mb-4`} />
        ))}
      </View>
    </View>
  );
}
