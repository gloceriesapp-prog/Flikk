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
    <Pressable onPress={onPress} className="items-center px-1">
      <View className={`items-center gap-1 rounded-full px-3 py-1.5 ${isActive ? 'bg-white/15' : 'bg-transparent'}`}>
        <AppIcon icon={tab.icon} size={20} color={isActive ? '#FFFFFF' : '#FFFFFF99'} />
        <Text className={`text-[11px] ${isActive ? 'font-bold text-white' : 'text-white/60'}`}>{tab.label}</Text>
      </View>
    </Pressable>
  );
}
