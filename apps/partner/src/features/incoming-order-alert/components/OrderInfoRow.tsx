// One "icon box + label/value" cell — Time and Type sit side by side using
// two of these, same soft-icon-box language as the rest of this screen's
// cards.

import { Text, View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  icon: IconSvgElement;
  label: string;
  value: string;
}

export function OrderInfoRow({ icon, label, value }: Props) {
  return (
    <View className="flex-1 flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-200">
        <AppIcon icon={icon} size={20} color={colors.ink} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[12px] font-medium text-black/50">{label}</Text>
        <Text className="text-[14px] font-medium text-black" numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}
