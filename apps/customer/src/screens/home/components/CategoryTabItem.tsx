// Plain flat box, no rounding — the earlier SVG "scoop" bottom shape and
// rounded-corner treatments were both removed. Selected vs. unselected is
// conveyed by background opacity and icon/label color only now.
//
// Fixed width (not padding-driven) so every tab is the same width regardless
// of label length — "Essentials" and "All" must render as equal-width boxes,
// not one stretched wider than the other.
//
// Unselected icon/label are ink at reduced opacity, not white — HomeHeader's
// background is a light pastel fill (#E8E7FF) now, not the earlier dark
// gradient; white icon/text on a light translucent box was reading as
// invisible. Selected stays ink-on-white since that box is fully opaque
// white regardless of what's behind it.

import { Pressable, Text } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { Category } from '../data/categoryTabs';

interface Props {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
}

export function CategoryTabItem({ category, isSelected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-[76px] items-center gap-1.5 py-3 rounded-t-2xl ${
        isSelected ? 'bg-white' : 'bg-white/60'
      }`}
    >
      <AppIcon icon={category.icon} size={22} color={isSelected ? colors.ink : `${colors.ink}99`} />
      <Text
        className={`text-center text-xs ${isSelected ? 'font-bold text-ink' : 'font-medium text-ink/60'}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {category.label}
      </Text>
    </Pressable>
  );
}
