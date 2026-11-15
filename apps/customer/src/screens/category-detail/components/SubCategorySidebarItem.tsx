import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { DetailSubCategory } from '../types';

interface Props {
  subCategory: DetailSubCategory;
  isSelected: boolean;
  onPress: () => void;
}

const ACTIVE_GREEN = '#1E8A3C';

// Round photo over a two-line label. The selected entry sits on a white card
// with a soft shadow and a bold green label; the rest stay flat on the rail.
export function SubCategorySidebarItem({ subCategory, isSelected, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={subCategory.label} accessibilityState={{ selected: isSelected }} onPress={onPress}
      className="items-center gap-1.5 rounded-2xl px-1 py-2.5"
      style={isSelected ? { backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 } : undefined}>
      <View className="h-[52px] w-[52px] overflow-hidden rounded-full bg-[#E5E7EB]">
        <Image source={{ uri: subCategory.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text numberOfLines={2}
        className={`text-center text-[12px] leading-[15px] ${isSelected ? 'font-bold' : 'font-medium text-ink/55'}`}
        style={isSelected ? { color: ACTIVE_GREEN } : undefined}>
        {subCategory.label}
      </Text>
    </Pressable>
  );
}
