// Summary card under the Inventory header — icon + "Product Listed" label,
// the big listed-count, a last-updated timestamp, and a full-width
// "Add product" pill (was "Manage stocks", which had no action wired to
// it — this now opens AddProductScreen, the real write path). Reference:
// sketch had a fixed mock count; this one reads the real product count so
// it never drifts from what's actually listed below it.

import { Add01Icon, Package01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  listedCount: number;
  lastUpdatedLabel: string;
  onPressAddProduct: () => void;
}

export function InventorySummaryCard({ listedCount, lastUpdatedLabel, onPressAddProduct }: Props) {
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

      <Pressable
        onPress={onPressAddProduct}
        className="flex-row items-center justify-center gap-1.5 rounded-2xl bg-black py-4"
      >
        <AppIcon icon={Add01Icon} size={16} color="#FFFFFF" />
        <Text className="text-base font-medium text-white">Add product</Text>
      </Pressable>
    </View>
  );
}
