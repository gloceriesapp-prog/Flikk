export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
}

export const demoNotificationItems: NotificationItem[] = [
  { id: 'orders', title: 'New orders are waiting', description: 'You have 2 new orders. Review the items and accept them to start preparing.', href: '/orders' },
  { id: 'stock', title: 'Time to restock', description: '6 products are out of stock. Update your inventory so customers can order them again.', href: '/inventory?stock=out_of_stock' },
  { id: 'payout', title: 'Your payout is processing', description: 'Your ₹3,078 payout for 12–18 Oct is processing. Payment is expected on 21 Oct.', href: '/payouts' },
  { id: 'reviews', title: 'Customers are waiting for a reply', description: '3 reviews need your reply. Thank your customers and help resolve their concerns.', href: '/reviews' },
];

// Both notification surfaces use this list so their messages stay identical.
export function getNotificationItems(newOrderCount: number, demo: boolean): NotificationItem[] {
  if (demo) return demoNotificationItems;
  return newOrderCount > 0 ? [{
    id: 'orders',
    title: `${newOrderCount} new ${newOrderCount === 1 ? 'order is' : 'orders are'} waiting`,
    description: 'Review your new orders and accept them to start preparing.',
    href: '/orders',
  }] : [];
}
