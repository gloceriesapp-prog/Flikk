import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../AppImage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import type { AppStackParamList } from '../../navigation/types';
import type { RemoteCategory } from './useCategorySections';

interface Props {
  category: RemoteCategory;
}

// Sizing/gap is the parent grid cell's job now (CategorySectionGroup.tsx) —
// this component just fills whatever width it's given.
export function CategoryTile({ category }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate('CategoryDetail', { categoryId: category.id, label: category.name })}
      className="w-full gap-2"
    >
      {/* Soft neutral gray backdrop (not flat white) behind every category
          photo — a plain white tile read as flat/cheap; a warm-neutral gray
          reads closer to how Blinkit/Instamart's own category tiles look. */}
      <View
        className="aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gray-100 shadow-md shadow-black/20"
        style={{ backgroundColor: '#EDEDF0' }}
      >
        {/* Real category photo (admin's own Categories screen ->
            "category-images" Storage bucket) — falls back to the shared
            placeholder image when a category has none yet, no random stock
            photo (same convention as ProductCardView/NearbyStoreCard's own
            notes). */}
        <Image source={{ uri: category.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text className="text-center text-sm font-medium leading-4 text-ink" numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
}
