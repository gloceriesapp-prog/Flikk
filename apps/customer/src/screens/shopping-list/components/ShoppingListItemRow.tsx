// One row — tap the circle to check off, tap the text to do the same
// (bigger hit target than the circle alone), tap the trailing X to
// delete. Checked items get a strikethrough + muted color, same
// "still visible, just done" convention as a real notes app rather than
// disappearing the instant they're checked.

import { Cancel01Icon, CheckmarkCircle02Icon, CircleIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { ShoppingListItem } from '../../../store/useShoppingListStore';

interface Props {
  item: ShoppingListItem;
  onToggle: () => void;
  onRemove: () => void;
}

export function ShoppingListItemRow({ item, onToggle, onRemove }: Props) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <Pressable onPress={onToggle} hitSlop={8}>
        <AppIcon
          icon={item.isChecked ? CheckmarkCircle02Icon : CircleIcon}
          size={22}
          color={item.isChecked ? colors.ink : `${colors.ink}40`}
          strokeWidth={1.8}
        />
      </Pressable>

      <Pressable onPress={onToggle} className="flex-1">
        <Text
          className={`text-[15px] font-medium ${item.isChecked ? 'text-ink/35 line-through' : 'text-ink'}`}
          numberOfLines={2}
        >
          {item.text}
        </Text>
      </Pressable>

      <Pressable onPress={onRemove} hitSlop={8} className="h-7 w-7 items-center justify-center">
        <AppIcon icon={Cancel01Icon} size={16} color={`${colors.ink}30`} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}
