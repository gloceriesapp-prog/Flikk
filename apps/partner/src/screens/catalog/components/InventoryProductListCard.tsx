// Header + list wrapping the product rows below the Inventory summary —
// each row is its own floating white card (ProductRow carries its own
// shadow), sitting directly on CatalogScreen's own gray page background
// now (same PAGE_BG that screen shares with Payouts/Orders) rather than a
// second, separately-colored tray — matching the flat white-cards-on-gray-
// page pattern the rest of this app now uses instead of double-nesting a
// gray backdrop inside another gray page.

import { Package02Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { ProductRow } from './ProductRow';
import type { PartnerProduct } from '../data';

interface Props {
  products: PartnerProduct[];
  onPressView: (productId: string) => void;
}

export function InventoryProductListCard({ products, onPressView }: Props) {
  return (
    <View className="mx-5 mt-5 gap-1">
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          <AppIcon icon={Package02Icon} size={16} color={colors.ink} />
          <Text className="text-base font-medium text-ink/80">Products</Text>
        </View>
        <Text className="text-base font-medium text-ink/60">
          {products.length} {products.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <View className="mt-2 gap-2.5">
        {products.map((product) => (
          <ProductRow key={product.id} product={product} onPressView={onPressView} />
        ))}
      </View>
    </View>
  );
}
