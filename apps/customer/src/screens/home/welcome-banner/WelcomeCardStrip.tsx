import { HORIZONTAL_PRODUCT_CARD_GAP, horizontalProductCardWidth } from '../products/horizontalProductLayout';
// White strip under the welcome banner: 7 products near the pin, picked at
// random from the popular (7 and 30 days) and deals feeds, as real product
// cards with add-to-cart. The order is shuffled once per Home visit.

import { useMemo } from 'react';
import { ScrollView, View , useWindowDimensions } from 'react-native';
import { useDeliveryEstimateMinutes } from '../../../api/deliverySettings';
import { productAvailability } from '../../../utils/productAvailability';
import { ProductCard } from '../products/ProductCard';
import { usePopularProducts } from '../trending/useTrendingThisWeek';
import { useDealsProducts } from '../sections/useDealsProducts';
import type { Product } from '../products/types';

const CARD_COUNT = 7;

function pickRandom(feeds: Product[][]): Product[] {
  const byId = new Map<string, Product>();
  for (const product of feeds.flat()) {
    if (!byId.has(product.id) && productAvailability(product).isAvailable) byId.set(product.id, product);
  }
  // Fisher–Yates.
  const pool = [...byId.values()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, CARD_COUNT);
}

export function WelcomeCardStrip() {
  const { width: viewportWidth } = useWindowDimensions();
  const cardWidth = horizontalProductCardWidth(viewportWidth);
  const week = usePopularProducts(7).data;
  const month = usePopularProducts(30).data;
  const deals = useDealsProducts().data;
  const estimatedMinutes = useDeliveryEstimateMinutes();
  const products = useMemo(() => pickRandom([week ?? [], month ?? [], deals ?? []]), [week, month, deals]);
  if (!products.length) return null;

  return (
    <View className="bg-white pb-2 pt-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start px-4"
        contentContainerStyle={{ gap: HORIZONTAL_PRODUCT_CARD_GAP }}
        snapToInterval={cardWidth + HORIZONTAL_PRODUCT_CARD_GAP} snapToAlignment="start" decelerationRate="fast">
        {products.map((product) => (
          <View key={product.id} style={{ width: cardWidth }}>
            <ProductCard
              product={product}
              widthClassName="w-full"
              showDiscountBadge
              estimatedMinutes={estimatedMinutes}
              isAvailable
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
