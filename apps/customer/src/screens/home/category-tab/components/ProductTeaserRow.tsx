// Horizontal teaser row — reuses the shared ProductCard (../../products/)
// rather than a new card per tab. Title + products are per-caller.

import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { colors } from '../../../../theme/tokens';
import { ProductCard } from '../../products/ProductCard';
import type { Product } from '../../products/types';

interface Props {
  title: string;
  products: Product[];
}

export function ProductTeaserRow({ title, products }: Props) {
  return (
    <View className="pt-6">
      <View className="flex-row items-center justify-between px-5 pb-4">
        <Text className="text-lg font-medium text-ink">{title}</Text>
        <AppIcon icon={ArrowRight01Icon} size={18} color={colors.ink} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-36" />
        ))}
      </ScrollView>
    </View>
  );
}
