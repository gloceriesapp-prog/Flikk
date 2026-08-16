// Plain style, per the reference: selected item gets a bordered box around
// the icon and a bold label — no fill, no shadow, no motion.

import { Pressable, Text, View } from 'react-native';
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
    <Pressable onPress={onPress} className="items-center gap-1.5">
      <View
        className={`h-12 w-12 items-center justify-center rounded-2xl border ${
          isSelected ? 'border-ink' : 'border-transparent'
        }`}
      >
        <AppIcon icon={category.icon} size={22} color={colors.ink} />
      </View>
      <Text className={`text-xs ${isSelected ? 'font-bold text-ink' : 'text-ink/55'}`}>
        {category.label}
      </Text>
    </Pressable>
  );
}
