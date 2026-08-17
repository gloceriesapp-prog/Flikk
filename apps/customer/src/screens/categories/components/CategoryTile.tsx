import { Image, Pressable, Text, View } from 'react-native';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { CategoryTile as CategoryTileData } from '../data';

interface Props {
  category: CategoryTileData;
}

export function CategoryTile({ category }: Props) {
  return (
    <Pressable className="w-[23%] gap-2">
      <View className="aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md shadow-black/20">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text className="text-center text-xs font-semibold leading-4 text-ink" numberOfLines={2}>
        {category.label}
      </Text>
    </Pressable>
  );
}
