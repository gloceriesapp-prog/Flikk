// Same visual as the main Categories screen's own tile (CategorySections/
// CategoryTile.tsx) — aspect-square, bordered, soft-shadowed gray box,
// cover-fit photo — per an explicit ask to match card sizing between the
// two. Label sits below the shape as plain text, not inside it.

import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../../components/AppImage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import type { AppStackParamList } from '../../../../navigation/types';
import type { SubCategory } from '../types';

interface Props {
  category: SubCategory;
}

// Sizing/gap is the parent grid cell's job now (SubCategoryGrid.tsx) — this
// component just fills whatever width it's given.
export function SubCategoryTile({ category }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate('CategoryDetail', { categoryId: category.id, label: category.label })}
      className="w-full items-center gap-2"
    >
      <View
        className="aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-100 shadow-md shadow-black/20"
        style={{ backgroundColor: '#EDEDF0' }}
      >
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>

      <Text className="text-center text-[13px] font-medium leading-4 text-ink" numberOfLines={2}>
        {category.label}
      </Text>
    </Pressable>
  );
}
