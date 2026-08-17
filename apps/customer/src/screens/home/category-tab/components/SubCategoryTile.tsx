// Flat mist tile — no border/shadow, matches the groceries reference UI.
// Deliberately not the same component as screens/categories' tiles: those
// are shadowed, this one is flat — different references, different look.

import { Image, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import type { AppStackParamList } from '../../../../navigation/types';
import type { SubCategory } from '../types';

interface Props {
  category: SubCategory;
}

export function SubCategoryTile({ category }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate('CategoryDetail', { categoryId: category.id, label: category.label })}
      className="w-[23%] items-center gap-2 rounded-2xl bg-lime-soft p-2.5"
    >
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text className="text-center text-xs font-bold leading-4 text-ink" numberOfLines={2}>
        {category.label}
      </Text>
    </Pressable>
  );
}
