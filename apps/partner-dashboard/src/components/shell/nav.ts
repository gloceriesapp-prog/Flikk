import {
  IconlyBag,
  IconlyCategory,
  IconlyChart,
  IconlyHeadphone,
  IconlyReceipt,
  IconlySetting,
  IconlyStar,
  IconlyWallet,
  type IconlyIcon,
} from '@/components/icons/iconly';

export interface NavItem {
  href: string;
  label: string;
  icon: IconlyIcon;
  // Shown in the page header under the title.
  subtitle: string;
  // Optional sub-menu, drawn as a branch tree under the item.
  children?: NavChild[];
}

export interface NavChild {
  href: string;
  label: string;
  // Tailwind class for the leading dot.
  dot: string;
}

export interface NavSection {
  // Omitted for the first, unlabelled group.
  title?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/', label: 'Dashboard', icon: IconlyCategory, subtitle: "Here's what's happening at your store today." },
      { href: '/orders', label: 'Orders', icon: IconlyReceipt, subtitle: 'Accept, pack and track every order.' },
      { href: '/analytics', label: 'Analytics', icon: IconlyChart, subtitle: 'Sales and order trends.' },
      { href: '/reviews', label: 'Reviews', icon: IconlyStar, subtitle: 'What customers say about your store.' },
    ],
  },
  {
    title: 'My store',
    items: [
      {
        href: '/inventory',
        label: 'Inventory',
        icon: IconlyBag,
        subtitle: 'Your catalogue, prices and stock.',
        children: [
          { href: '/inventory?stock=in_stock', label: 'In stock', dot: 'bg-emerald-500' },
          { href: '/inventory?stock=out_of_stock', label: 'Out of stock', dot: 'bg-rose-500' },
          { href: '/inventory?stock=pending', label: 'Pending approval', dot: 'bg-amber-500' },
        ],
      },
      { href: '/payouts', label: 'Payouts', icon: IconlyWallet, subtitle: 'Weekly settlements to your bank or UPI.' },
    ],
  },
  {
    title: 'Support',
    items: [
      { href: '/help', label: 'Help', icon: IconlyHeadphone, subtitle: 'Get in touch with the Gloceries team.' },
      { href: '/settings', label: 'Settings', icon: IconlySetting, subtitle: 'Store profile, hours, payouts and KYC.' },
    ],
  },
];

const ALL_NAV = NAV_SECTIONS.flatMap((section) => section.items);

export function isActivePath(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function navItemFor(pathname: string): NavItem | undefined {
  return ALL_NAV.find((item) => isActivePath(pathname, item.href));
}
