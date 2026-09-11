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

import { Text, View } from 'react-native';
import { ProductCard } from './ProductCard';
import type { Product } from './types';

// Same fixed width every fixed-width product card row in this app uses
// now (FestivalPicksSection/CoastalKitchenPicksSection/etc, w-28) — not a
// %-based column, so a card here is the exact same physical size
// regardless of which section it's rendered in.
const CARD_WIDTH = 'w-28';

interface Props {
  title: string;
  products: Product[];
  showDiscountBadge?: boolean;
}

export function ProductSection({ title, products, showDiscountBadge = false }: Props) {
  return (
    <View className="px-5 pt-6">
      <Text className="mb-4 text-xl font-semibold text-ink">{title}</Text>
      <View className="flex-row flex-wrap gap-x-2.5 gap-y-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} showDiscountBadge={showDiscountBadge} widthClassName={CARD_WIDTH} />
        ))}
      </View>
    </View>
  );
}
