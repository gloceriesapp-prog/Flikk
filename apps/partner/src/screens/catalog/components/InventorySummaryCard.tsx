// Summary card under the Inventory header — icon + "Product Listed" label,
// the big listed-count, a last-updated timestamp, and a full-width
// "Manage stocks" pill. Reference: sketch had a fixed mock count; this one
// reads the real product count so it never drifts from what's actually
// listed below it.

import { Package01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  listedCount: number;
  lastUpdatedLabel: string;
  onPressManageStocks: () => void;
}

export function InventorySummaryCard({ listedCount, lastUpdatedLabel, onPressManageStocks }: Props) {
  return (
    <View className="mx-5 gap-4 rounded-3xl bg-gray-100 p-4">
      <View className="flex-row items-center gap-2">
        <AppIcon icon={Package01Icon} size={16} color={colors.ink} />
        <Text className="text-base font-medium text-ink/70">Product Listed</Text>
      </View>

      <View className="flex-row items-end justify-between">
        <Text className="text-4xl font-medium text-ink">{listedCount}</Text>
        <Text className="mb-1 text-base font-regular text-ink/50">{lastUpdatedLabel}</Text>
      </View>

      <Pressable onPress={onPressManageStocks} className="items-center justify-center rounded-2xl bg-black py-4">
        <Text className="text-base font-medium text-white">Manage stocks</Text>
      </Pressable>
    </View>
  );
}
