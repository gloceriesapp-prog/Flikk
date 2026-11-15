import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import type { HomeContentItem } from './contracts';

interface Props {
  items: HomeContentItem[];
  imageForItem: (item: HomeContentItem) => string | undefined;
  onOpen: (item: HomeContentItem) => void;
}

export function PhotoCategoryRail({ items, imageForItem, onOpen }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 px-5">
      {items.map((item) => {
        const image = imageForItem(item);
        return (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Shop ${item.title}`}
            onPress={() => onOpen(item)}
            className="w-28 gap-1.5 active:opacity-80">
            <View
              className="h-[122px] w-full items-center justify-center overflow-hidden rounded-b-lg rounded-t-[56px]"
              style={{ backgroundColor: item.backgroundColor || '#EEF4E5' }}
            >
              {image ? (
                <AppImage source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <AppIcon icon={ShoppingBasket01Icon} size={32} color="#526A36" />
              )}
            </View>
            <Text numberOfLines={2} className="px-1 text-center text-[13px] font-bold leading-[16px] text-ink">
              {item.title}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
