import {
  BarChart3,
  Boxes,
  CircleHelp,
  LayoutGrid,
  ReceiptText,
  Settings,
  Star,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Shown in the page header under the title.
  subtitle: string;
}

export const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid, subtitle: "Here's what's happening at your store today." },
  { href: '/orders', label: 'Orders', icon: ReceiptText, subtitle: 'Accept, pack and track every order.' },
  { href: '/inventory', label: 'Inventory', icon: Boxes, subtitle: 'Your catalogue, prices and stock.' },
  { href: '/payouts', label: 'Payouts', icon: Wallet, subtitle: 'Weekly settlements to your bank or UPI.' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, subtitle: 'Sales and order trends.' },
  { href: '/reviews', label: 'Reviews', icon: Star, subtitle: 'What customers say about your store.' },
];

export const OTHER_NAV: NavItem[] = [
  { href: '/help', label: 'Help', icon: CircleHelp, subtitle: 'Get in touch with the Gloceries team.' },
  { href: '/settings', label: 'Settings', icon: Settings, subtitle: 'Store profile, hours, payouts and KYC.' },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function navItemFor(pathname: string): NavItem | undefined {
  return [...MAIN_NAV, ...OTHER_NAV].find((item) => isActivePath(pathname, item.href));
}
