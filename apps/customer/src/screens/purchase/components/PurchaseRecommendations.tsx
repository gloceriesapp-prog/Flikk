// "Recommendation" — sits on the Purchase screen, below the order list.
// Real catalog products only (useEverydayEssentials -> GET
// /stores/products/catalog, same feed Home's "Today's Stock" row uses),
// capped at VISIBLE_COUNT.
//
// Full-width white section. A single content inset gives the three-column
// grid more image space without changing shared product-card interactions.

import { Text, View } from 'react-native';
import { ProductCard } from '../../home/products/ProductCard';
import { useEverydayEssentials } from '../../home/everyday-essentials/useEverydayEssentials';

const VISIBLE_COUNT = 9;
const CARD_WIDTH = 'w-[32%]';

export function PurchaseRecommendations() {
  const { data: realProducts = [] } = useEverydayEssentials();

  const visibleProducts = realProducts.slice(
    0,
    VISIBLE_COUNT,
  );

  if (visibleProducts.length === 0) {
    return null;
  }

  return (
    <View className="bg-white px-4 pb-2 pt-5">
      <Text accessibilityRole="header" className="text-[17px] font-bold text-ink">
        Picked Just For You
      </Text>

      <View className="mt-4 flex-row flex-wrap justify-between">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            widthClassName={`${CARD_WIDTH} mb-4`}
          />
        ))}
      </View>
    </View>
  );
}
