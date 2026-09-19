import type { LucideIcon } from 'lucide-react';
import { Banknote, Bike, Boxes, LayoutGrid, Map, Package, PartyPopper, RotateCcw, Settings, Tag, UserCheck, Store, Home } from 'lucide-react';

// Grouped sidebar sections, same "Menu" / "Insights" split as the
// reference — Menu is the day-to-day operational stuff (what needs
// action right now), Insights is the read-mostly reporting layer.
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MENU_ITEMS: NavItem[] = [
  { href: '/overview', label: 'Overview', icon: LayoutGrid },
  { href: '/approvals', label: 'Approvals', icon: UserCheck },
  { href: '/stores', label: 'Stores', icon: Store },
  { href: '/riders', label: 'Riders', icon: Bike },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/home-categories', label: 'Home Categories', icon: Home },
  { href: '/festival-section', label: 'Festival Section', icon: PartyPopper },
];

export const INSIGHTS_ITEMS: NavItem[] = [
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/revenue', label: 'Revenue', icon: Banknote },
  { href: '/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/zones', label: 'Zones', icon: Map },
];

export const ALL_NAV_ITEMS: NavItem[] = [...MENU_ITEMS, ...INSIGHTS_ITEMS, { href: '/settings', label: 'Settings', icon: Settings }];

// TopNav's own contextual quick-action per section — reference's
// "+ Create Task" is generic to its one page; ours varies since each
// section has a different primary create action.
export const QUICK_ACTION_LABEL: Record<string, string> = {
  '/overview': 'Add Store',
  '/approvals': 'Review Next',
  '/riders': 'Add Rider',
  '/inventory': 'Add Product',
  '/orders': 'Add Order',
  '/revenue': 'Export CSV',
  '/zones': 'Add Zone',
  '/settings': 'Save Changes',
};
