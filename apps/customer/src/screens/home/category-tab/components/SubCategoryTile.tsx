// Flat mist tile — no border/shadow, matches the groceries reference UI.
// Deliberately not the same component as screens/categories' tiles: those
// are shadowed, this one is flat — different references, different look.

import { Image, Pressable, Text, View } from 'react-native';
import type { SubCategory } from '../types';

interface Props {
  category: SubCategory;
}

export function SubCategoryTile({ category }: Props) {
  return (
    <Pressable className="w-[23%] items-center gap-2 rounded-2xl bg-lime-soft p-2.5">
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-xl">
        <Image
          source={{ uri: `https://picsum.photos/seed/${category.imageSeed}/160/160` }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>
      <Text className="text-center text-xs font-bold leading-4 text-ink" numberOfLines={2}>
        {category.label}
      </Text>
    </Pressable>
  );
}
