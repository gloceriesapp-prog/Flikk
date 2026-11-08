import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppImage as Image } from '../AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import type { AppStackParamList } from '../../navigation/types';
import type { RemoteCategory } from './useCategorySections';

interface Props {
  category: RemoteCategory;
}

// One flat light grey behind every category photo (the earlier tile grey),
// so cut-out product art reads cleanly on any category.
export const CATEGORY_TILE_BG = '#F2F2F2';

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
      {/* Keep a little breathing room around the complete artwork without
          changing the card dimensions or cropping the illustration. */}
      <View style={{ aspectRatio: 0.85, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: CATEGORY_TILE_BG }}>
        <Image
          source={{
            uri: category.imageUrl || PLACEHOLDER_IMAGE_URI,
          }}
          style={{ width: '90%', height: '90%' }}
          resizeMode="contain"
        />
      </View>

      <Text
        className="mt-1.5 px-0.5 text-center text-[13px] font-bold leading-[16px] text-black/80"
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}