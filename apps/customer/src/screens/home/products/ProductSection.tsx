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
import { productAvailability } from '../../../utils/productAvailability';
import type { Product } from './types';

// Same fixed width every fixed-width product card row in this app uses
// now (FestivalPicksSection/EverydayEssentialsSection/PromoListCard/etc) —
// not a %-based column, so a card here is the exact same physical size
// regardless of which section it's rendered in. Bumped w-28 -> w-32, then
// w-32 -> w-36 per an explicit "make the card a little bigger" ask — a
// modest +16px so the image + bottom content get more room.
const CARD_WIDTH = 'w-36';

interface Props {
  title: string;
  products: Product[];
  showDiscountBadge?: boolean;
}

export function ProductSection({ title, products, showDiscountBadge = false }: Props) {
  // Share delivery settings across cards; cart availability depends on stock.
  const estimatedMinutes = useDeliveryEstimateMinutes();
  return (
    <View className="pt-8">
      <SectionTitle>{title}</SectionTitle>
      <View className="flex-row flex-wrap gap-x-2.5 gap-y-5 px-5">
        {products.map((product) => {
          const availability = productAvailability(product);
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
