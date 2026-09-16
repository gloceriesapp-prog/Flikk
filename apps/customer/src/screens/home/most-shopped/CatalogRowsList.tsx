// Shared row list — a border-t wrapper around up to `maxRows` real
// PopularProductRow entries with a border-b between them (none after the
// last). Same markup MostShoppedCard.tsx, LowestPricesCard.tsx and
// FreshWednesdayCard.tsx would otherwise each repeat verbatim — one place,
// not three copies that could drift.

import { View } from 'react-native';
import { PopularProductRow } from '../../store-list/popular/PopularProductRow';
import type { Product } from '../products/types';

export function CatalogRowsList({ products, maxRows = 4 }: { products: Product[]; maxRows?: number }) {
  const rows = products.slice(0, maxRows);

  return (
    <View className="border-t border-gray-100">
      {rows.map((product, index) => (
        <View key={product.id} className={index === rows.length - 1 ? '' : 'border-b border-gray-50'}>
          <PopularProductRow product={product} />
        </View>
      ))}
    </View>
  );
}
