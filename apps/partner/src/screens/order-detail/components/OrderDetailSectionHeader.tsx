// "Order details" row — packaging icon + title on left, item count on
// right. Always shows every item below it now (no collapse/expand — a
// store owner packing an order needs the full list visible immediately,
// not hidden behind an extra tap), so this is a plain static header, not
// a Pressable toggle anymore.

import { Text, View } from 'react-native';
import { PackagingIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  itemCount: number;
}

export function OrderDetailSectionHeader({ itemCount }: Props) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <AppIcon icon={PackagingIcon} size={16} color={colors.ink} />
        <Text className="text-[15px] font-semibold text-black">Order details</Text>
      </View>
      <Text className="text-[15px] font-medium text-ink/80">
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </Text>
    </View>
  );
}
