import { Image, Pressable, Text, View } from 'react-native';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { DetailSubCategory } from '../types';

interface Props {
  subCategory: DetailSubCategory;
  isSelected: boolean;
  onPress: () => void;
}

export function SubCategorySidebarItem({ subCategory, isSelected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="relative items-center gap-1 border-b border-mist px-1 py-3">
      {/* Right rail indicator — flags the active sub-category, matches the
          reference's black bar running down the rail's outer edge. */}
      {isSelected && <View className="absolute bottom-1 right-0 top-1 w-[3px] rounded-full bg-ink" />}

      <View
        className={`h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border ${
          isSelected ? 'border-lime-deep bg-lime-soft' : 'border-gray-100 bg-white'
        }`}
      >
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text
        className={`text-center text-[10px] leading-3 ${isSelected ? 'font-bold text-ink' : 'font-medium text-ink/55'}`}
        numberOfLines={2}
      >
        {subCategory.label}
      </Text>
    </Pressable>
  );
}
