import { View } from 'react-native';
import { ProductCard } from '../../products/ProductCard';
import { SelfServiceProductCardView } from '../../products/ProductCardView';
import type { Product } from '../../products/types';

export function GroceryProductTile({ product, previewOnly = false }: { product: Product; previewOnly?: boolean }) {
  if (!previewOnly) return <ProductCard product={product} widthClassName="w-full" showDiscountBadge />;

  // Render the existing card appearance without a detail sheet, prefetches
  // or actionable buttons. Samples cannot enter cart or wishlist.
  return (
    <View pointerEvents="none" accessible accessibilityLabel={`Design preview only: ${product.name}, ${product.weight}, sample price ${product.price} rupees`}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SelfServiceProductCardView product={product} widthClassName="w-full" showDiscountBadge />
      </View>
    </View>
  );
}
