import type { LucideIcon } from 'lucide-react';
import {
  AlarmClock,
  Banknote,
  Bell,
  CreditCard,
  Gift,
  Send,
  Bike,
  Boxes,
  Coins,
  FileText,
  ImageIcon,
  LayoutGrid,
  LayoutDashboard,
  Map,
  Megaphone,
  Package,
  PackageX,
  PartyPopper,
  RotateCcw,
  Route,
  Rocket,
  Snowflake,
  Sparkles,
  Tag,
  Ticket,
  Truck,
  UserCheck,
  UserX,
  Users,
  Star,
  Store,
  Home,
  Wallet,
  HandCoins,
} from 'lucide-react';

// Sidebar information architecture. One standalone Overview link, then a
// handful of task-named groups (Operations / Catalogue / Network / …) in
// place of the old flat 22-item "Menu" + 14-item "Insights" split, which
// mixed day-to-day actions with reports and had three near-identical "Home"
// labels. Labels here are the clean, unambiguous names; the route paths are
// unchanged, so nothing else has to move.
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Rendered on its own above the groups — the one dashboard-wide snapshot.
export const OVERVIEW_ITEM: NavItem = { href: '/overview', label: 'Overview', icon: LayoutDashboard };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { href: '/approvals', label: 'Approvals', icon: UserCheck },
      { href: '/orders', label: 'Orders', icon: Package },
      { href: '/dispatch', label: 'Trips & dispatch', icon: Route },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { href: '/inventory', label: 'Products', icon: Boxes },
      { href: '/inventory-pack-stock', label: 'Pack stock', icon: Package },
      { href: '/categories', label: 'Categories', icon: Tag },
    ],
  },
  {
    title: 'Network',
    items: [
      { href: '/stores', label: 'Stores', icon: Store },
      { href: '/riders', label: 'Riders', icon: Bike },
      { href: '/zones', label: 'Zones', icon: Map },
    ],
  },
  {
    title: 'Customers',
    items: [
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/reviews', label: 'Store reviews', icon: Star },
      { href: '/support', label: 'Support', icon: Ticket },
      { href: '/customer-deletions', label: 'Account deletions', icon: UserX },
    ],
  },
  {
    title: 'Customer home',
    items: [
      { href: '/home-categories', label: 'Home tabs & tiles', icon: Home },
      { href: '/home-sections', label: '“All” tab layout', icon: LayoutGrid },
      { href: '/home-content', label: 'Category-tab content', icon: LayoutGrid },
      { href: '/festival-section', label: 'Festival products', icon: PartyPopper },
      { href: '/festival-greeting', label: 'Festival tab & greeting', icon: Sparkles },
      { href: '/seasonal-section', label: 'Seasonal section', icon: Snowflake },
      { href: '/media', label: 'Image library', icon: ImageIcon },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/promotions', label: 'SMS & email campaigns', icon: Megaphone },
      { href: '/promo-codes', label: 'Discount codes', icon: Ticket },
      { href: '/referrals', label: 'Referrals', icon: Gift },
      { href: '/notifications', label: 'Messaging templates', icon: Bell },
      { href: '/push-outbox', label: 'Push log', icon: Send },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/revenue', label: 'Revenue', icon: Banknote },
      { href: '/payouts', label: 'Payouts', icon: Wallet },
      { href: '/rider-earnings', label: 'Rider earnings', icon: Coins },
      { href: '/cash-on-delivery', label: 'Cash on delivery', icon: HandCoins },
      { href: '/refunds', label: 'Refunds', icon: RotateCcw },
      { href: '/failed-deliveries', label: 'Failed deliveries', icon: PackageX },
      { href: '/stuck-payments', label: 'Stuck checkouts', icon: AlarmClock },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/settings', label: 'Delivery & fees', icon: Truck },
      { href: '/checkout-settings', label: 'Payments & checkout', icon: CreditCard },
      { href: '/app-content', label: 'App copy & contacts', icon: FileText },
      { href: '/app-settings', label: 'App releases', icon: Rocket },
    ],
  },
];

// Flat list for TopNav's "which section am I in" lookup and SidebarSearch.
export const ALL_NAV_ITEMS: NavItem[] = [OVERVIEW_ITEM, ...NAV_GROUPS.flatMap((g) => g.items)];

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
