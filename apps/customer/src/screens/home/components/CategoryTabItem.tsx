// One tab in CategoryTabs — just an icon + label sitting directly on the
// header, no card/capsule background. The selected tab's only distinguishing
// mark is a short underline bar beneath its label.
//
// isFrosted (from HomeHeader, via CategoryTabs) drives icon/text/underline
// color: black on a light header / once scrolled past the frosted-blur
// threshold, white otherwise.

import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import type { Category } from '../data/categoryTabs';

interface Props {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
  isFrosted?: boolean;
}

export function CategoryTabItem({ category, isSelected, onPress, isFrosted = false }: Props) {
  const iconColor = isFrosted ? '#101C10' : '#FFFFFF';
  const textColorClass = isFrosted ? 'text-ink' : 'text-white';
  const mutedTextColorClass = isFrosted ? 'text-ink/60' : 'text-white/75';

  return (
    // pt-2 only (no pb-2) — the underline below sits flush against this
    // item's own bottom edge so it lands exactly on CategoryTabs' own
    // border-b divider instead of floating above it with a visible gap.
    <Pressable onPress={onPress} className="w-[76px] items-center gap-1.5 pt-2">
      <AppIcon icon={category.icon} size={22} color={iconColor} strokeWidth={isSelected ? 2 : 1.6} />
      <Text
        className={`text-center text-xs ${isSelected ? `font-bold ${textColorClass}` : `font-medium ${mutedTextColorClass}`}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {category.label}
      </Text>

      {/* Active-tab indicator — a short underline. */}
      <View className={`h-[3px] w-8 rounded-full ${isSelected ? textColorClass.replace('text-', 'bg-') : 'bg-transparent'}`} />
    </Pressable>
  );
}
