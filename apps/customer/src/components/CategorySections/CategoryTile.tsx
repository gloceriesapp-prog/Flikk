import { Image, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import type { AppStackParamList } from '../../navigation/types';
import type { CategoryTile as CategoryTileData } from './data';

interface Props {
  category: CategoryTileData;
}

export function CategoryTile({ category }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate('CategoryDetail', { categoryId: category.id, label: category.label })}
      className="w-[23%] gap-2"
    >
      <View className="aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md shadow-black/20">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text className="text-center text-sm font-medium leading-4 text-ink" numberOfLines={2}>
        {category.label}
      </Text>
    </Pressable>
  );
}
