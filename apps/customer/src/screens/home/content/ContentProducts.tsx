import { ScrollView, Text, View } from 'react-native';
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
  const productCard = (product: Product) => (
    <>
      <GroceryProductTile product={product} previewOnly={false} />
      {section.id === 'something-new' && product.description && (
        <Text numberOfLines={3} className="mt-2 text-[11px] leading-4 text-ink/60">
          {product.description}
        </Text>
      )}
    </>
  );
  if (section.layout === 'grid')
    return (
      <View className="px-5">
        <View className="-mx-1 flex-row flex-wrap items-start gap-y-5">
          {products.map((product) => (
            <View key={product.id} className="px-1" style={{ width: `${100 / section.columns}%` }}>
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
      contentContainerClassName="items-start gap-3 px-5"
      snapToInterval={140}
      snapToAlignment="start"
      decelerationRate="fast"
    >
      {products.map((product) => (
        <View key={product.id} className="w-32">
          {productCard(product)}
        </View>
      ))}
    </ScrollView>
  );
}
