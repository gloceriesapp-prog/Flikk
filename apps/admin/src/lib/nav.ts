import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Bike,
  Boxes,
  Coins,
  FileText,
  ImageIcon,
  LayoutGrid,
  Map,
  Megaphone,
  Package,
  PackageX,
  PartyPopper,
  RotateCcw,
  Route,
  Settings,
  Smartphone,
  Tag,
  Ticket,
  UserCheck,
  Users,
  Star,
  Store,
  Home,
  Wallet,
  HandCoins,
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
  { href: '/dispatch', label: 'Trips & dispatch', icon: Route },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/inventory-pack-stock', label: 'Available packs', icon: Package },
  { href: '/promo-codes', label: 'Promo Codes', icon: Ticket },
  { href: '/promotions', label: 'Promotions', icon: Megaphone },
  { href: '/media', label: 'Media Library', icon: ImageIcon },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/home-categories', label: 'Home Categories', icon: Home },
  { href: '/home-sections', label: 'Home Sections', icon: LayoutGrid },
  { href: '/home-content', label: 'Home Tab Content', icon: Home },
  { href: '/festival-section', label: 'Festival Section', icon: PartyPopper },
  { href: '/festival-greeting', label: 'Festival Greeting', icon: PartyPopper },
  { href: '/seasonal-section', label: 'Seasonal Section', icon: ImageIcon },
  { href: '/app-content', label: 'App content', icon: FileText },
  { href: '/app-settings', label: 'App settings', icon: Smartphone },
];

export const INSIGHTS_ITEMS: NavItem[] = [
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/support', label: 'Support', icon: Ticket },
  { href: '/customer-deletions', label: 'Account Deletions', icon: Users },
  { href: '/revenue', label: 'Revenue', icon: Banknote },
  { href: '/payouts', label: 'Payouts', icon: Wallet },
  { href: '/rider-earnings', label: 'Rider earnings', icon: Coins },
  { href: '/cash-on-delivery', label: 'Cash on delivery', icon: HandCoins },
  { href: '/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/failed-deliveries', label: 'Failed Deliveries', icon: PackageX },
  { href: '/reviews', label: 'Reviews', icon: Star },
  { href: '/zones', label: 'Zones', icon: Map },
];

export const ALL_NAV_ITEMS: NavItem[] = [...MENU_ITEMS, ...INSIGHTS_ITEMS, { href: '/settings', label: 'Settings', icon: Settings }];

// TopNav's contextual quick action per section — only where a real flow
// exists behind it. Pages that already carry their own create button
// (Stores, Inventory, Promo codes) don't repeat it up here, and sections
// with no admin create flow (riders and orders come from the apps, zones
// have no create API) get no button rather than a dead one.
//   href: navigate (Add store opens the Stores page's Add store form);
//   download: a file link (Revenue's order transactions CSV);
//   form: submits that page's form (Settings).
export interface QuickAction {
  label: string;
  kind: 'add' | 'download' | 'save';
  href?: string;
  form?: string;
}

export const QUICK_ACTIONS: Record<string, QuickAction> = {
  '/overview': { label: 'Add Store', kind: 'add', href: '/stores?new=1' },
  '/revenue': { label: 'Export CSV', kind: 'download', href: '/api/orders?format=csv' },
  '/settings': { label: 'Save Changes', kind: 'save', form: 'settings-form' },
};
