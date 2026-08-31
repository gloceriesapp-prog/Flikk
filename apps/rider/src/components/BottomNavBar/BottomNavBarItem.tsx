// Same white-on-dark-glass treatment as apps/partner's own
// BottomNavBar/BottomNavBarItem.tsx.

import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import type { NavTab } from './data';

interface Props {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}

export function BottomNavBarItem({ tab, isActive, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="items-center gap-1 px-3">
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${isActive ? 'bg-white/15' : 'bg-transparent'}`}
      >
        <AppIcon icon={tab.icon} size={20} color={isActive ? '#FFFFFF' : '#FFFFFF99'} />
      </View>
      <Text className={`text-[11px] ${isActive ? 'font-bold text-white' : 'text-white/60'}`}>{tab.label}</Text>
    </Pressable>
  );
}
