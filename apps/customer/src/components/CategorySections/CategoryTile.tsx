import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CategoryTileContent } from './CategoryTileContent';
import type { AppStackParamList } from '../../navigation/types';
import type { RemoteCategory } from './useCategorySections';

export { CATEGORY_TILE_BG } from './CategoryTileContent';

interface Props {
  category: RemoteCategory;
}

// One flat light grey behind every category photo (the earlier tile grey),
// so cut-out product art reads cleanly on any category.


export function CategoryTile({ category }: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <Pressable
      onPress={() =>
        navigation.navigate('CategoryDetail', {
          categoryId: category.id,
          label: category.name,
        })
      }
      className="w-full"
    >
      <CategoryTileContent title={category.name} imageUrl={category.imageUrl} />
    </Pressable>
  );
}