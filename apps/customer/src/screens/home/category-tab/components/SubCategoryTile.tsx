// Color lives only in the tile's top half — a soft gray fading to white,
// rounded on top, fading to nothing by the bottom (no border, no bottom
// rounding — matches the sketch reference: an open-bottomed box, not a
// closed card). Label sits below the shape as plain text, not inside it.
// Gray-to-white (not the header's yellow) reads calmer/more premium here —
// this grid isn't the header, it doesn't need the header's brand color.

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      className="w-[23%] items-center gap-2"
    >
      <View className="h-28 w-full items-center justify-center overflow-hidden rounded-t-2xl">
        {/* LinearGradient isn't one of NativeWind's auto-patched components —
            className is silently ignored, so positioning goes through style. */}
        <LinearGradient
          colors={['#E4E6E8', '#FFFFFF']}
          locations={[0, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white">
          <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
        </View>
      </View>

      <Text className="text-center text-xs font-bold leading-4 text-ink" numberOfLines={2}>
        {category.label}
      </Text>
    </Pressable>
  );
}
