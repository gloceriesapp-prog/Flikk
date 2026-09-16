// One tab in CategoryTabs — per an explicit ask/reference, no background
// capsule/scoop-cutout at all anymore (that was this component's entire
// previous design: a white/peach pill behind the selected tab, SVG-drawn
// corner "scoops" blending it into the header). Now it's just an icon +
// label sitting directly on the header's own dark gradient, white by
// default (readable against that dark bg) — the selected tab's only
// distinguishing mark is a short underline bar beneath its label.
//
// isFrosted (from HomeHeader, via CategoryTabs) flips icon/text/underline
// to black once scrolled past the header's own frosted-blur threshold —
// white against that light blur was unreadable.

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
    // pt-2 only (no pb-2) — the underline below needs to sit flush against
    // this item's own bottom edge, which is what makes it land exactly on
    // CategoryTabs' own border-b divider instead of floating above it with
    // a visible gap (per a reference screenshot: two separate lines with
    // daylight between them, not the one clean line a reference image
    // shows).
    <Pressable onPress={onPress} className="w-[76px] items-center gap-1.5 pt-2">
      <AppIcon icon={category.icon} size={22} color={iconColor} strokeWidth={isSelected ? 2 : 1.6} />
      <Text
        className={`text-center text-xs ${isSelected ? `font-bold ${textColorClass}` : `font-medium ${mutedTextColorClass}`}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {category.label}
      </Text>

      {/* Active-tab indicator — a short underline, not the old capsule. */}
      <View className={`h-[3px] w-8 rounded-full ${isSelected ? textColorClass.replace('text-', 'bg-') : 'bg-transparent'}`} />
    </Pressable>
  );
}
