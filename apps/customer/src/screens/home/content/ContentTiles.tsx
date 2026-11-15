import { Pressable, ScrollView, Text, View } from 'react-native';
import { ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import type { ApiProduct } from '../../../api/products';
import { categoryCardStyle, hasContentSelection, selectContentProducts, type HomeContentKey, type HomeContentSection, type HomeContentItem } from './contracts';
import { PhotoCategoryRail } from './PhotoCategoryRail';
import { GroceryCategoryGrid } from '../groceries/shop-by-category/GroceryCategoryGrid';

export function ContentTiles({
  section,
  tabKey,
  products,
  onOpen,
  featuredCategories = false,
  archedCategories = false,
  freshCategories = false,
  fullImageCategories = false,
}: {
  section: HomeContentSection;
  tabKey?: HomeContentKey;
  products: ApiProduct[];
  onOpen: (item: HomeContentItem) => void;
  featuredCategories?: boolean;
  archedCategories?: boolean;
  freshCategories?: boolean;
  fullImageCategories?: boolean;
}) {
  const items = section.items.filter((item) => item.enabled).slice(0, section.limit);
  const imageForItem = (item: HomeContentItem) =>
    item.imageUrl ||
    (hasContentSelection(item.selection) ? selectContentProducts(products, item.selection) : []).find((product) => product.image_url)?.image_url || undefined;
  if (section.kind === 'categories' && categoryCardStyle(section, tabKey) === 'photo') {
    return <PhotoCategoryRail items={items} imageForItem={imageForItem} onOpen={onOpen} />;
  }
  if (featuredCategories) {
    return <GroceryCategoryGrid items={items} imageForItem={imageForItem} onOpen={onOpen} columns={section.columns} layout={section.layout} />;
  }
  const tile = (item: HomeContentItem) => {
    const image = imageForItem(item);
    const arched = freshCategories || archedCategories || section.id === 'shop-fresh';
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
            width: fullImageCategories ? '88%' : '100%',
            aspectRatio: archedCategories ? 4 / 5.2 : arched ? 4 / 4.6 : 1,
            backgroundColor: fullImageCategories ? 'transparent' : item.backgroundColor || '#EEF4E5',
            borderTopLeftRadius: arched ? 999 : 20,
            borderTopRightRadius: arched ? 999 : 20,
            borderBottomLeftRadius: arched ? 0 : 20,
            borderBottomRightRadius: arched ? 0 : 20,
          }}
        >
          {image ? (
            <AppImage source={{ uri: image }}
              style={{ width: fullImageCategories ? '100%' : '88%', height: fullImageCategories ? '100%' : '80%' }}
              resizeMode={fullImageCategories ? 'cover' : 'contain'} />
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
  if (section.layout === 'horizontal' && !archedCategories && !fullImageCategories)
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
    <View className="px-5" style={archedCategories ? { width: '100%', maxWidth: 560, alignSelf: 'center' } : undefined}>
      <View className="-mx-1.5 flex-row flex-wrap gap-y-5">
        {items.map((item) => (
          <View key={item.id} className="px-1.5" style={{ width: `${100 / (fullImageCategories ? 3 : archedCategories ? 4 : section.columns)}%` }}>
            {tile(item)}
          </View>
        ))}
      </View>
    </View>
  );
}
