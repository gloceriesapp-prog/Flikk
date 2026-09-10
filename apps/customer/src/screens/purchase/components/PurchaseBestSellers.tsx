// "Your Best Sellers" — the customer's own most-reordered items, computed
// from their real order history (PurchaseScreen already has every past
// order loaded for the list above; this just tallies item quantities
// across all of them). Not a store-wide "bestseller" flag — no such signal
// exists in the schema (CLAUDE.md: no fabricated data) — this is instead
// an honest, personal "what you actually buy most" ranking, which is a
// more useful reorder prompt on a purchase-history screen anyway.
//
// 6 cards, 3 per row (two rows) — a fixed cap so this stays a compact
// highlight strip, not a second full product grid.

import { Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import type { OrderItemSummary } from '../data';

export interface BestSellerItem extends OrderItemSummary {
  timesOrdered: number;
}

interface Props {
  items: BestSellerItem[];
}

export function PurchaseBestSellers({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View className="mt-6">
      <Text className="text-lg font-bold text-ink">Your Best Sellers</Text>
      <Text className="mt-0.5 text-[12px] font-medium text-ink/45">What you order the most</Text>

      <View className="mt-3.5 flex-row flex-wrap justify-between">
        {items.map((item) => (
          <View key={item.name} className="mb-3 w-[31%] rounded-2xl border border-black/[0.06] bg-white p-2">
            <View className="aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
              <Image source={{ uri: item.imageUri }} className="h-full w-full" resizeMode="cover" />
            </View>
            <Text className="mt-2 text-[12px] font-semibold text-ink" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="mt-0.5 text-[11px] font-medium text-ink/45">
              Ordered {item.timesOrdered}x
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
