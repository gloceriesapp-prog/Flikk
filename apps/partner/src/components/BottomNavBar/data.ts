// Home keeps the actionable queue; Orders contains the complete store history.

export interface NavTab {
  id: 'Orders' | 'OrderHistory' | 'Catalog' | 'Payouts';
  label: string;
}

export const BOTTOM_NAV_TABS: NavTab[] = [
  { id: 'Orders', label: 'Home' },
  { id: 'OrderHistory', label: 'Orders' },
  { id: 'Catalog', label: 'Inventory' },
  { id: 'Payouts', label: 'Payouts' },
];
