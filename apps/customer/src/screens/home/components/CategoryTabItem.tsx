// Every tab (not just the selected one) gets a "tab card": rounded top
// corners, flat/square bottom, no bottom border — per the reference sketch.
// No shadow — flat, border only. Unselected tabs are a translucent white
// (bg-white/40) so they read as lighter/quieter; the selected tab goes fully
// opaque white so it visibly stands out from the rest of the row.
//
// Fixed width (not padding-driven) so every tab is the same size regardless
// of label length — "Essentials" and "All" must render as equal-size boxes,
// not one stretched wider than the other.

import { Pressable, Text } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { Category } from '../data/categories';

interface Props {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
}

export function CategoryTabItem({ category, isSelected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-[76px] items-center gap-1.5 rounded-t-2xl border border-b-0 border-mist py-3 ${
        isSelected ? 'bg-white' : 'bg-white/40'
      }`}
    >
      <AppIcon icon={category.icon} size={22} color={isSelected ? colors.ink : `${colors.ink}80`} />
      <Text
        className={`text-center text-xs ${isSelected ? 'font-bold text-ink' : 'text-ink/55'}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {category.label}
      </Text>
    </Pressable>
  );
}
