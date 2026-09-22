import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Bike,
  Boxes,
  ImageIcon,
  LayoutGrid,
  Map,
  Package,
  PartyPopper,
  RotateCcw,
  Settings,
  Tag,
  Ticket,
  UserCheck,
  Users,
  Star,
  Store,
  Home,
} from 'lucide-react';

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
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/promo-codes', label: 'Promo Codes', icon: Ticket },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/home-categories', label: 'Home Categories', icon: Home },
  { href: '/festival-section', label: 'Festival Section', icon: PartyPopper },
  { href: '/seasonal-section', label: 'Seasonal Section', icon: ImageIcon },
];

export const INSIGHTS_ITEMS: NavItem[] = [
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/revenue', label: 'Revenue', icon: Banknote },
  { href: '/rider-payouts', label: 'Rider Payouts', icon: Bike },
  { href: '/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/reviews', label: 'Reviews', icon: Star },
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
  '/promo-codes': 'Add Promo Code',
  '/orders': 'Add Order',
  '/revenue': 'Export CSV',
  '/zones': 'Add Zone',
  '/settings': 'Save Changes',
};
