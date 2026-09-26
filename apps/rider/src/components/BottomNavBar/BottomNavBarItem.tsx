// Same active-tab recipe as apps/customer's own BottomNavBarItem.tsx: the
// highlight is a fixed-size rounded box wrapping BOTH icon and label (not
// just a circle behind the icon), so the whole active tab lights up as one
// pill. Light palette to match the liquid-glass bar — ink icon+label when
// active on a black/10 highlight, muted ink when not.

import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { IconlyBankCard, IconlyHome, IconlyNotification, IconlyOrders } from '../icons/iconly';
import type { NavTab } from './data';

interface Props {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}

export function BottomNavBarItem({ tab, isActive, onPress }: Props) {
  const color = isActive ? '#101C10' : '#101C1099';
  return (
    <Pressable onPress={onPress} className="items-center px-0">
      <View
        className={`h-[54px] w-[78px] items-center justify-center gap-1 rounded-full ${isActive ? 'bg-black/10' : 'bg-transparent'}`}
      >
        {/* Home/Orders/Notifications have real filled/outline glyphs; other tabs stroke-render via AppIcon. */}
        {tab.id === 'Home' ? (
          <IconlyHome size={20} color={color} active={isActive} />
        ) : tab.id === 'Orders' ? (
          <IconlyOrders size={20} color={color} active={isActive} />
        ) : tab.id === 'Notifications' ? (
          <IconlyNotification size={20} color={color} active={isActive} />
        ) : tab.id === 'Earnings' ? (
          <IconlyBankCard size={20} color={color} active={isActive} />
        ) : (
          <AppIcon icon={tab.icon} size={20} color={color} />
        )}
        <Text className={`text-[11px] font-medium ${isActive ? 'text-ink' : 'text-ink/60'}`}>{tab.label}</Text>
      </View>
    </Pressable>
  );
}
