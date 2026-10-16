// Tab definitions for the floating bottom nav — Orders / Catalog / Payouts
// per specs/02-partner-app/screens.md. All three are wired to real screens.

export interface NavTab {
  id: 'Orders' | 'Catalog' | 'Payouts';
  label: string;
}

export const BOTTOM_NAV_TABS: NavTab[] = [
  { id: 'Orders', label: 'Orders' },
  { id: 'Catalog', label: 'Inventory' },
  { id: 'Payouts', label: 'Payouts' },
];
