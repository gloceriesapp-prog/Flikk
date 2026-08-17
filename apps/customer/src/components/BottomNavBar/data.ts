// Tab definitions for the floating bottom nav. Only 'home' has a real screen
// right now — see BottomNavBar.tsx for how the others are handled.

import { GridViewIcon, Home01Icon, ShoppingBasket01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface NavTab {
  id: string;
  label: string;
  icon: IconSvgElement;
}

export const BOTTOM_NAV_TABS: NavTab[] = [
  { id: 'home', label: 'Home', icon: Home01Icon },
  { id: 'order-again', label: 'Purchase', icon: ShoppingBasket01Icon },
  { id: 'categories', label: 'Categories', icon: GridViewIcon },
  { id: 'store', label: 'Store', icon: Store01Icon },
];
