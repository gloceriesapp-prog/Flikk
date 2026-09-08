// One tappable row — icon, label, optional trailing value, chevron. Used
// for anything on this screen that navigates or opens something rather
// than editing a field in place (Help & Support, About, Log out).

import { Pressable, Text } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  icon: IconSvgElement;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress: () => void;
}

export function SettingsLinkRow({ icon, label, value, destructive, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-1"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <AppIcon icon={icon} size={17} color={destructive ? colors.danger : `${colors.ink}80`} />
      <Text className={`flex-1 text-[15px] font-medium ${destructive ? 'text-danger' : 'text-ink/80'}`}>{label}</Text>
      {value && <Text className="text-sm font-medium text-ink/40">{value}</Text>}
      <AppIcon icon={ArrowRight01Icon} size={15} color={`${colors.ink}40`} />
    </Pressable>
  );
}
