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
      <View
        className="aspect-square overflow-hidden rounded-[16px]"
        style={{
          backgroundColor: '#F2F2F2',
        }}
      >
        <View className="h-full w-full items-center justify-center px-1 pt-1 pb-1.5">
          <Image
            source={{
              uri: category.imageUrl || PLACEHOLDER_IMAGE_URI,
            }}
            className="h-full w-full"
            resizeMode="contain"
          />
        </View>
      </View>

      <Text
        className="mt-2 px-0.5 text-center text-[13px] font-bold leading-[16px] text-black/80"
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}