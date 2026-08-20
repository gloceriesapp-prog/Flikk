// One catalog row — name/category/price on the left, an in-stock Switch on
// the right. Toggling flips local state immediately (see CatalogScreen) —
// per specs/02-partner-app/screens.md, stock toggle must feel instant, not
// wait on a round trip, even once a real PATCH /partner/products/:id call
// backs it.

import { Switch, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';
import type { PartnerProduct } from '../data';

interface Props {
  product: PartnerProduct;
  onToggleStock: (productId: string) => void;
}

export function ProductRow({ product, onToggleStock }: Props) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
      <View className="flex-1">
        <Text className="text-sm font-bold text-ink" numberOfLines={1}>
          {product.name}
        </Text>
        <Text className="mt-0.5 text-xs font-medium text-ink/50">
          {product.category} · {product.unit}
        </Text>
        <Text className="mt-1 text-sm font-extrabold text-ink">₹{product.price}</Text>
      </View>

      <View className="items-center gap-1">
        <Switch
          value={product.isInStock}
          onValueChange={() => onToggleStock(product.id)}
          trackColor={{ false: '#E5E7EB', true: colors.limeDeep }}
          thumbColor="#FFFFFF"
        />
        <Text className={`text-[10px] font-bold ${product.isInStock ? 'text-lime-deep' : 'text-ink/40'}`}>
          {product.isInStock ? 'In stock' : 'Out of stock'}
        </Text>
      </View>
    </View>
  );
}
