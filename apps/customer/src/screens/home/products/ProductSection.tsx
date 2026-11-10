import { ScrollView, View } from 'react-native';
import { ProductCard } from './ProductCard';
import { SectionTitle } from '../components/SectionTitle';
import { useDeliveryEstimateMinutes } from '../../../api/deliverySettings';
import { productAvailability } from '../../../utils/productAvailability';
import type { HomeProductLayout } from '../../../../../../packages/home-content/sectionLayout.js';
import type { Product } from './types';

interface Props {
  title?: string;
  subtitle?: string | null;
  products: Product[];
  layout?: HomeProductLayout;
  showDiscountBadge?: boolean;
}

export function ProductSection({ title, subtitle, products, layout = 'grid', showDiscountBadge = false }: Props) {
  const estimatedMinutes = useDeliveryEstimateMinutes();
  if (!products.length) return null;
  const horizontal = layout === 'horizontal';
  const cards = products.map((product) => {
    const availability = productAvailability(product);
    const card = (
      <ProductCard
        product={product}
        showDiscountBadge={showDiscountBadge}
        widthClassName={horizontal ? 'w-32' : 'w-full'}
        estimatedMinutes={estimatedMinutes}
        isAvailable={availability.isAvailable}
        availabilityLabel={availability.label}
      />
    );
    return horizontal ? (
      <View key={product.id}>{card}</View>
    ) : (
      <View key={product.id} className="px-1" style={{ width: '33.333333%' }}>{card}</View>
    );
  });

  return (
    <View className={title ? 'pt-8' : undefined}>
      {title && <SectionTitle subtitle={subtitle}>{title}</SectionTitle>}
      {horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5">
          {cards}
        </ScrollView>
      ) : (
        <View className="px-5">
          <View className="-mx-1 flex-row flex-wrap items-start gap-y-5">{cards}</View>
        </View>
      )}
    </View>
  );
}
