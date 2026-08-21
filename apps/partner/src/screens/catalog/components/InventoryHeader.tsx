// Top bar for the Inventory tab — title on the left, a circular search
// button on the right. No product-search screen exists yet, so it's
// stubbed rather than silently doing nothing, same convention as the
// notification bell on the Orders screen.

import { Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  onPressSearch: () => void;
}

export function InventoryHeader({ onPressSearch }: Props) {
  return (
    <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
      <Text className="text-2xl font-medium text-ink">Inventory</Text>
      <Pressable onPress={onPressSearch} className="h-11 w-11 items-center justify-center rounded-full bg-gray-100">
        <AppIcon icon={Search01Icon} size={19} color={colors.ink} />
      </Pressable>
    </View>
  );
}
