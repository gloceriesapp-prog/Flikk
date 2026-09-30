// "Recommendation" — sits on the Purchase screen, below the order list.
// Real catalog products only (useEverydayEssentials -> GET
// /stores/products/catalog, same feed Home's "Today's Stock" row uses),
// capped at VISIBLE_COUNT.
//
// ProductCard is intentionally left unchanged.
// This component only adds a white section container around the title
// and product grid so it reads as a clean card on the page background.

import { Text, View } from 'react-native';
import { ProductCard } from '../../home/products/ProductCard';
import { useEverydayEssentials } from '../../home/everyday-essentials/useEverydayEssentials';

const VISIBLE_COUNT = 9;
const CARD_WIDTH = 'w-[31%]';

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
    <View
      className="
        mt-4
        rounded-[16px]
        bg-white
        px-4
        pb-1
        pt-4
      "
    >
      {/* TITLE */}
      <Text
        className="
          text-[17px]
          font-bold
          // tracking-[-0.25px]
          text-ink
        "
      >
        Picked Just For You
      </Text>

      {/* PRODUCT GRID */}
      <View
        className="
          mt-3.5
          flex-row
          flex-wrap
          justify-between
        "
      >
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