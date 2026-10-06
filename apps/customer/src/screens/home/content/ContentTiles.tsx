import { Pressable, ScrollView, Text, View } from 'react-native';
import { ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import type { ApiProduct } from '../../../api/products';
import { selectContentProducts, type HomeContentSection, type HomeContentItem } from './contracts';
import { GroceryCategoryGrid } from '../groceries/shop-by-category/GroceryCategoryGrid';

export function ContentTiles({
  section,
  products,
  onOpen,
  featuredCategories = false,
}: {
  section: HomeContentSection;
  products: ApiProduct[];
  onOpen: (item: HomeContentItem) => void;
  featuredCategories?: boolean;
}) {
  const items = section.items.filter((item) => item.enabled).slice(0, section.limit);
  const imageForItem = (item: HomeContentItem) =>
    item.imageUrl ||
    selectContentProducts(products, item.selection).find((product) => product.image_url)?.image_url || undefined;
  if (featuredCategories && section.kind === 'categories') {
    return <GroceryCategoryGrid items={items} imageForItem={imageForItem} onOpen={onOpen} />;
  }
  const tile = (item: HomeContentItem) => {
    const image = imageForItem(item);
    if (section.kind === 'brands')
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Explore ${item.title}`}
          onPress={() => onOpen(item)}
          className="min-h-20 items-center justify-center rounded-[22px] border border-ink/80 px-2 py-3 active:opacity-70"
          style={{ backgroundColor: item.backgroundColor || '#FFFFFF' }}
        >
          {image && (
            <AppImage source={{ uri: image }} className="mb-2 h-8 w-full" resizeMode="contain" />
          )}
          <Text numberOfLines={2} className="text-center text-[13px] font-bold text-ink">
            {item.title}
          </Text>
          {item.origin && (
            <Text numberOfLines={1} className="mt-1 text-center text-[10px] text-ink/50">
              {item.origin}
            </Text>
          )}
          {item.description && (
            <Text numberOfLines={2} className="mt-1 text-center text-[10px] text-ink/50">
              {item.description}
            </Text>
          )}
        </Pressable>
      );
    const arched = section.id === 'shop-fresh';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Shop ${item.title}`}
        onPress={() => onOpen(item)}
        className="items-center gap-2.5 active:opacity-80"
      >
        <View
          className="w-full items-center justify-center overflow-hidden"
          style={{
            aspectRatio: arched ? 4 / 4.6 : 1,
            backgroundColor: item.backgroundColor || '#EEF4E5',
            borderTopLeftRadius: arched ? 999 : 20,
            borderTopRightRadius: arched ? 999 : 20,
            borderBottomLeftRadius: arched ? 0 : 20,
            borderBottomRightRadius: arched ? 0 : 20,
          }}
        >
          {image ? (
            <AppImage source={{ uri: image }} className="h-[80%] w-[88%]" resizeMode="contain" />
          ) : (
            <AppIcon icon={ShoppingBasket01Icon} size={32} color="#526A36" />
          )}
        </View>
        <Text
          numberOfLines={2}
          className="min-h-8 text-center text-[13px] font-bold leading-[17px] text-ink"
        >
          {item.title}
        </Text>
        {item.description && (
          <Text numberOfLines={2} className="text-center text-[11px] text-ink/50">
            {item.description}
          </Text>
        )}
      </Pressable>
    );
  };
  if (section.layout === 'horizontal')
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-5"
      >
        {items.map((item) => (
          <View key={item.id} className="w-28">
            {tile(item)}
          </View>
        ))}
      </ScrollView>
    );
  return (
    <View className="px-5">
      <View className="-mx-1.5 flex-row flex-wrap gap-y-5">
        {items.map((item) => (
          <View key={item.id} className="px-1.5" style={{ width: `${100 / section.columns}%` }}>
            {tile(item)}
          </View>
        ))}
      </View>
    </View>
  );
}
