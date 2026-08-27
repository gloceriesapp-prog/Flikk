// One row in ProfileScreen's grouped menu list — icon badge, label, chevron.
// Plain Pressable, not a card of its own; ProfileScreen wraps each group in
// one shared white card with hairline dividers between rows instead of
// every row being its own separately-shadowed box (that read as busier,
// not more premium).

import { ChevronRightIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  icon: IconSvgElement;
  label: string;
  onPress: () => void;
  danger?: boolean;
  isLast?: boolean;
}

export function ProfileMenuRow({ icon, label, onPress, danger = false, isLast = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3.5 ${isLast ? '' : 'border-b border-mist'}`}
    >
      <View className={`h-9 w-9 items-center justify-center rounded-full ${danger ? 'bg-danger/10' : 'bg-lime-soft'}`}>
        <AppIcon icon={icon} size={17} color={danger ? colors.danger : colors.limeDeep} strokeWidth={1.8} />
      </View>
      <Text className={`flex-1 text-[15px] font-medium ${danger ? 'text-danger' : 'text-ink'}`}>{label}</Text>
      {!danger && <AppIcon icon={ChevronRightIcon} size={16} color={`${colors.ink}66`} />}
    </Pressable>
  );
}
