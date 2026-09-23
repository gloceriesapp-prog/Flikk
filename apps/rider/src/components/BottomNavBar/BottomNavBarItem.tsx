// Same white-on-dark-glass treatment as apps/partner's own
// BottomNavBar/BottomNavBarItem.tsx, with the customer app's active-tab
// logic: the highlight is a fixed-size rounded box wrapping BOTH icon and
// label (not just a circle behind the icon), so the whole active tab lights
// up as one pill — customer/BottomNavBarItem.tsx's own recipe, in this
// nav's dark palette (white/15 highlight, white icon+label when active).

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
    <Pressable onPress={onPress} className="items-center px-0">
      <View
        className={`h-[52px] w-[68px] items-center justify-center gap-1 rounded-full ${isActive ? 'bg-white/15' : 'bg-transparent'}`}
      >
        <AppIcon icon={tab.icon} size={20} color={isActive ? '#FFFFFF' : '#FFFFFF99'} />
        <Text className={`text-[11px] ${isActive ? 'font-bold text-white' : 'text-white/60'}`}>{tab.label}</Text>
      </View>
    </Pressable>
  );
}
