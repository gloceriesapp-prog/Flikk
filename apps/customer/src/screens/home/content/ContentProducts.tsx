import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { HORIZONTAL_PRODUCT_CARD_GAP, horizontalProductCardWidth } from '../products/horizontalProductLayout';
import type { Product } from '../products/types';
import { GroceryProductTile } from '../groceries/components/GroceryProductTile';
import type { HomeContentSection } from './contracts';

export function ContentProducts({
  products,
  section,
}: {
  products: Product[];
  section: HomeContentSection;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = horizontalProductCardWidth(width);
  const productCard = (product: Product) => (
    <>
      <GroceryProductTile product={product} showImage={section.showProductImages !== false} />
      {section.id === 'something-new' && product.description && (
        <Text numberOfLines={3} className="mt-2 text-[11px] leading-4 text-ink/60">
          {product.description}
        </Text>
      )}
    </>
  );
  if (section.layout === 'grid')
    return (
      <View className="px-4">
        <View className="-mx-[6px] flex-row flex-wrap items-start gap-y-5">
          {products.map((product) => (
            <View key={product.id} className="px-[6px]" style={{ width: `${100 / section.columns}%` }}>
              {productCard(product)}
            </View>
          ))}
        </View>
      </View>
    );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="items-start px-4"
      contentContainerStyle={{ gap: HORIZONTAL_PRODUCT_CARD_GAP }}
      snapToInterval={cardWidth + HORIZONTAL_PRODUCT_CARD_GAP}
      snapToAlignment="start"
      decelerationRate="fast"
    >
      {products.map((product) => (
        <View key={product.id} style={{ width: cardWidth }}>
          {productCard(product)}
        </View>
      ))}
    </ScrollView>
  );
}
