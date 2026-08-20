// Tab definitions for the floating bottom nav — Orders / Catalog / Payouts
// per specs/02-partner-app/screens.md. All three are wired to real screens.

import { InvoiceIcon, ShoppingBasket01Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';

export interface NavTab {
  id: 'Orders' | 'Catalog' | 'Payouts';
  label: string;
  icon: IconSvgElement;
}

export const BOTTOM_NAV_TABS: NavTab[] = [
  { id: 'Orders', label: 'Orders', icon: InvoiceIcon },
  { id: 'Catalog', label: 'Inventory', icon: ShoppingBasket01Icon },
  { id: 'Payouts', label: 'Payouts', icon: Wallet01Icon },
];
