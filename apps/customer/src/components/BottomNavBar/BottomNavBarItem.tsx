import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import type { NavTab } from './data';

interface Props {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}

export function BottomNavBarItem({ tab, isActive, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="items-center gap-1 px-1">
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${isActive ? 'bg-mist' : 'bg-transparent'}`}
      >
        <AppIcon icon={tab.icon} size={20} color={isActive ? colors.ink : `${colors.ink}70`} />
      </View>
      <Text className={`text-[11px] ${isActive ? 'font-bold text-ink' : 'text-ink/55'}`}>{tab.label}</Text>
    </Pressable>
  );
}
