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
      {/* Taller than wide, one soft blue surface, and the artwork scaled up
          to fill it: still 4 in a row, but the picture is the hero. */}
      <View style={{ aspectRatio: 0.85, borderRadius: 18, overflow: 'hidden', backgroundColor: '#EDF7FF' }}>
        <Image
          source={{
            uri: category.imageUrl || PLACEHOLDER_IMAGE_URI,
          }}
          className="h-full w-full"
          style={{ transform: [{ scale: 1.12 }] }}
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