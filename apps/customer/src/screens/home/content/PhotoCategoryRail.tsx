import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
      {items.map((item) => {
        const image = imageForItem(item);
        return (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Shop ${item.title}`}
            onPress={() => onOpen(item)}
            className="h-40 w-28 overflow-hidden rounded-[18px] border border-[#DDDDDD] active:opacity-80">
            {image ? (
              <AppImage source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View className="h-full items-center justify-center pb-10" style={{ backgroundColor: item.backgroundColor || '#EEF4E5' }}>
                <AppIcon icon={ShoppingBasket01Icon} size={32} color="#526A36" />
              </View>
            )}
            <View className="absolute bottom-0 left-0 right-0 min-h-7 items-center justify-center bg-white px-2 pb-1">
              <Svg pointerEvents="none" width="100%" height={17} viewBox="0 0 112 17"
                preserveAspectRatio="none" style={styles.labelCurve}>
                <Path d="M0 16 Q56 -16 112 16 V17 H0 Z" fill="#FFFFFF" />
              </Svg>
              <Text numberOfLines={2} className="text-center text-[13px] font-bold leading-[16px] text-ink">
                {item.title}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  labelCurve: {
    position: 'absolute',
    top: -16,
    left: 0,
  },
});
