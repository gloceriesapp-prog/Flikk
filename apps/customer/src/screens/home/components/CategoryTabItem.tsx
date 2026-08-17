// Plain flat box, no rounding — the earlier SVG "scoop" bottom shape and
// rounded-corner treatments were both removed. Selected vs. unselected is
// conveyed by background opacity and icon/label color only now.
//
// Fixed width (not padding-driven) so every tab is the same width regardless
// of label length — "Essentials" and "All" must render as equal-width boxes,
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
      className={`w-[76px] items-center gap-1.5 border border-mist py-3 ${
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
