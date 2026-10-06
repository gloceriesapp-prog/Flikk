import { Text, View } from 'react-native';
import type { Product } from '../../products/types';

export function FestivalProductDetails({ product, showAssortment = false, showBoxOptions = false }: { product: Product; showAssortment?: boolean; showBoxOptions?: boolean }) {
  const isAssortment = /\b(assortment|basket|mixed|pack|box)\b/i.test(product.name);
  return (
    <View className="mt-1.5 gap-1">
      {product.storeName && <Text numberOfLines={1} className="text-[11px] font-medium text-ink/55">{product.storeName}</Text>}
      {showBoxOptions && product.variants && product.variants.length > 1 && (
        <Text numberOfLines={2} className="text-[11px] leading-[16px] text-ink/65">
          Box options: {product.variants.map((variant) => variant.label).join(' · ')}
        </Text>
      )}
      {showAssortment && isAssortment && (
        <Text numberOfLines={3} className="text-[11px] leading-[16px] text-ink/65">
          {product.description ? `Contents: ${product.description}` : 'Check assortment contents with the shop.'}
        </Text>
      )}
    </View>
  );
}
