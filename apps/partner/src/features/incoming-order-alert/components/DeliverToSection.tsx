// A short customer label for the compact order alert. The complete order
// details remain available after acceptance.

import { Text, View } from 'react-native';
import { Location01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  customerName: string;
}

export function DeliverToSection({ customerName }: Props) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-200">
        <AppIcon icon={Location01Icon} size={20} color={colors.ink} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[12px] font-medium text-black/50">Ordered by</Text>
        <Text className="text-[14px] font-medium text-black" numberOfLines={1} ellipsizeMode="tail">{customerName}</Text>
      </View>
    </View>
  );
}
