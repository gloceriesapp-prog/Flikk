import { Image, Pressable, Text, View } from 'react-native';
import type { CategoryTile as CategoryTileData } from '../data';

interface Props {
  category: CategoryTileData;
}

export function CategoryTile({ category }: Props) {
  return (
    <Pressable className="w-[23%] gap-2">
      <View className="aspect-square items-center justify-center overflow-hidden rounded-2xl bg-mist shadow-sm shadow-black/15">
        <Image
          source={{ uri: `https://picsum.photos/seed/${category.imageSeed}/200/200` }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>
      <Text className="text-center text-xs font-semibold leading-4 text-ink" numberOfLines={2}>
        {category.label}
      </Text>
    </Pressable>
  );
}
