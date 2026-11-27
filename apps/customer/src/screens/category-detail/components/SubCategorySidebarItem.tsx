import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { actionColors } from '../../../theme/tokens';
import type { DetailSubCategory } from '../types';

interface Props {
  subCategory: DetailSubCategory;
  isSelected: boolean;
  onPress: () => void;
}

const PHOTO = 64;

// Round light-grey photo over a centred two-line label. Selected: bold dark
// label and a blue bar along the rail's right edge.
export function SubCategorySidebarItem({ subCategory, isSelected, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={subCategory.label} accessibilityState={{ selected: isSelected }} onPress={onPress}
      className="items-center gap-2 px-1.5 py-3 active:opacity-80">
      <View className="items-center justify-center overflow-hidden rounded-full bg-[#EEF0F3]" style={{ width: PHOTO, height: PHOTO }}>
        <Image source={{ uri: subCategory.imageUrl || PLACEHOLDER_IMAGE_URI }} style={{ width: PHOTO - 8, height: PHOTO - 8 }} resizeMode="contain" />
      </View>
      <Text numberOfLines={2}
        className={`text-center text-[13px] leading-[17px] ${isSelected ? 'font-bold text-ink' : 'font-medium text-[#5D646B]'}`}>
        {subCategory.label}
      </Text>
      {isSelected ? <View pointerEvents="none" className="absolute bottom-3 right-0 top-3 w-1 rounded-l-full" style={{ backgroundColor: actionColors.fill }} /> : null}
    </Pressable>
  );
}
