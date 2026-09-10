import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { DetailSubCategory } from '../types';

interface Props {
  subCategory: DetailSubCategory;
  isSelected: boolean;
  onPress: () => void;
}

// Soft neutral gray tile, no per-item border/hairline divider — matches the
// reference's clean rail (no lines between entries, spacing alone
// separates them, same "premium not flat-white" backdrop CategoryTile.tsx
// already uses for the main Categories grid). Selection reads from the
// black rail bar + bold label alone now, not a colored border on the tile
// itself — keeps every tile visually consistent with the reference instead
// of the selected one looking like a different component.
export function SubCategorySidebarItem({ subCategory, isSelected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="relative items-center gap-1.5 px-1">
      {/* Right rail indicator — flags the active sub-category, matches the
          reference's black bar running down the rail's outer edge. */}
      {isSelected && <View className="absolute -right-2 bottom-1 top-1 w-[3px] rounded-full bg-ink" />}

      <View
        className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
        style={{ backgroundColor: '#EDEDF0' }}
      >
        <Image source={{ uri: subCategory.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
      <Text
        className={`text-center text-[12px] leading-4 ${isSelected ? 'font-bold text-ink' : 'font-medium text-ink/55'}`}
        numberOfLines={2}
      >
        {subCategory.label}
      </Text>
    </Pressable>
  );
}
