// Tab definitions for the floating bottom nav — Home/Orders/Earnings/
// Profile, same shape as apps/partner's own BottomNavBar/data.ts.

import { DeliveryTruck01Icon, Home01Icon, UserIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface NavTab {
  id: 'Home' | 'Orders' | 'Earnings' | 'Profile';
  label: string;
  icon: IconSvgElement;
}

export const BOTTOM_NAV_TABS: NavTab[] = [
  { id: 'Home', label: 'Home', icon: Home01Icon },
  { id: 'Orders', label: 'Orders', icon: DeliveryTruck01Icon },
  { id: 'Earnings', label: 'Earnings', icon: Wallet01Icon },
  { id: 'Profile', label: 'Profile', icon: UserIcon },
];
