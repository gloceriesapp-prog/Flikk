// Tab definitions for the floating bottom nav — Home/Orders/Earnings.
// Profile is intentionally NOT here: it's still a registered tab screen
// (TabNavigator.tsx) reachable from the home header's gear, just not given
// its own nav-bar button.

import { DeliveryTruck01Icon, Home01Icon, Notification01Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface NavTab {
  id: 'Home' | 'Orders' | 'Notifications' | 'Earnings' | 'Profile';
  label: string;
  icon: IconSvgElement;
}

export const BOTTOM_NAV_TABS: NavTab[] = [
  { id: 'Home', label: 'Home', icon: Home01Icon },
  { id: 'Orders', label: 'Orders', icon: DeliveryTruck01Icon },
  { id: 'Notifications', label: 'Alerts', icon: Notification01Icon },
  { id: 'Earnings', label: 'Earnings', icon: Wallet01Icon },
];
