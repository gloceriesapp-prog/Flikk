// Plain flex-wrap grid, not a FlatList — these lists are short (a dozen items,
// not hundreds) and this already lives inside HomeScreen's outer ScrollView.
// Nesting a FlatList inside a ScrollView triggers RN's "VirtualizedLists
// should never be nested" warning for no real benefit at this size.
//
// 4 columns, packed left with a fixed gap — NOT justify-between. With
// justify-between, a partial row (e.g. 2 products) gets stretched to the
// container's full width, opening one huge gap between the 1st and 2nd
// card instead of them sitting next to each other. A fixed gap keeps
// cards adjacent regardless of how many happen to be in the last row.

import { View } from 'react-native';
import { ProductCard } from './ProductCard';
import { SectionTitle } from '../components/SectionTitle';
import { useDeliveryEstimateMinutes } from '../../../api/deliverySettings';
import { useBrowseClock } from '../../../utils/useBrowseClock';
import { productAvailability } from '../../../utils/productAvailability';
import type { Product } from './types';

// Same fixed width every fixed-width product card row in this app uses
// now (FestivalPicksSection/EverydayEssentialsSection/PromoListCard/etc) —
// not a %-based column, so a card here is the exact same physical size
// regardless of which section it's rendered in. Bumped w-28 -> w-32 per
// an explicit ask — the bottom content (price/ETA row) was cramped at
// w-28, this gives it a little more room to breathe.
const CARD_WIDTH = 'w-32';

interface Props {
  title: string;
  products: Product[];
  showDiscountBadge?: boolean;
}

export function ProductSection({ title, products, showDiscountBadge = false }: Props) {
  // Lifted once for the whole section (issue #22): a single delivery-settings
  // query + a single browse-clock subscription, instead of one per card. The
  // 30s tick re-renders this node, which recomputes each product's (cheap,
  // pure) availability and passes primitives down; the memoized cards only
  // re-render for a product whose availability actually changed.
  const estimatedMinutes = useDeliveryEstimateMinutes();
  const date = new Date(useBrowseClock());
  return (
    <View className="pt-8">
      <SectionTitle>{title}</SectionTitle>
      <View className="flex-row flex-wrap gap-x-2.5 gap-y-5 px-5">
        {products.map((product) => {
          const availability = productAvailability(product, date);
          return (
            <ProductCard
              key={product.id}
              product={product}
              showDiscountBadge={showDiscountBadge}
              widthClassName={CARD_WIDTH}
              estimatedMinutes={estimatedMinutes}
              isAvailable={availability.isAvailable}
              availabilityLabel={availability.label}
            />
          );
        })}
      </View>
    </View>
  );
}
