// "Order details" row — packaging icon + title on left, item count + a
// chevron that flips with expanded state on right. Tapping toggles the
// item list open/closed (OrderDetailScreen owns the expanded state).

import { ArrowDown01Icon, ArrowUp01Icon, PackagingIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  itemCount: number;
  expanded: boolean;
  onToggle: () => void;
}

export function OrderDetailSectionHeader({ itemCount, expanded, onToggle }: Props) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <AppIcon icon={PackagingIcon} size={16} color={colors.ink} />
        <Text className="text-base font-semibold text-black">Order details</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-base font-medium text-ink/80">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Text>
        <AppIcon icon={expanded ? ArrowUp01Icon : ArrowDown01Icon} size={14} color={`${colors.ink}80`} />
      </View>
    </Pressable>
  );
}
