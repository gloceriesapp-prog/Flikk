import { Platform, Pressable, Text, View } from 'react-native';
import { BottomNavIcon } from '../PartnerIcons';
import type { NavTab } from './data';

interface Props {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}

export function BottomNavBarItem({ tab, isActive, onPress }: Props) {
  if (Platform.OS === 'android') {
    const color = isActive ? '#000000' : '#6B7280';
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isActive }}
        className="flex-1 items-center justify-center gap-1 py-1.5"
        style={{ minHeight: 56 }}
      >
        <BottomNavIcon tab={tab.id} active={isActive} size={24} color="#000000" />
        <Text className="text-[12px] font-semibold" style={{ color }}>{tab.label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: isActive }} className="items-center gap-1 px-3">
      <View
        className="h-9 w-9 items-center justify-center"
      >
        <BottomNavIcon tab={tab.id} active={isActive} size={24} color={isActive ? '#FFFFFF' : '#FFFFFF99'} />
      </View>
      <Text className={`text-[11px] ${isActive ? 'font-bold text-white' : 'text-white/60'}`}>{tab.label}</Text>
    </Pressable>
  );
}
