// Plain flex-wrap grid, not a FlatList — these lists are short (a dozen items,
// not hundreds) and this already lives inside HomeScreen's outer ScrollView.
// Nesting a FlatList inside a ScrollView triggers RN's "VirtualizedLists
// should never be nested" warning for no real benefit at this size.

import { Text, View } from 'react-native';
import { ProductCard } from './ProductCard';
import type { Product } from './types';

interface Props {
  title: string;
  products: Product[];
  showDiscountBadge?: boolean;
}

export function ProductSection({ title, products, showDiscountBadge = false }: Props) {
  return (
    <View className="px-5 pt-6">
      <Text className="mb-4 text-xl font-semibold text-ink">{title}</Text>
      <View className="flex-row flex-wrap justify-between gap-y-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} showDiscountBadge={showDiscountBadge} />
        ))}
      </View>
    </View>
  );
}
