// Placeholder order history for the Purchase tab — no real order-history
// backend exists yet (same caveat as every other placeholder dataset in
// this app). Shaped close to `orders`/`order_items` in
// specs/00-foundation/data-model.md so swapping this for a real fetch is a
// data change, not a redesign.

import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';

export interface OrderItemSummary {
  name: string;
  imageUri: string;
}

export interface PurchaseOrder {
  id: string;
  storeName: string;
  items: OrderItemSummary[];
  statusLabel: string;
  etaLabel: string;
  placedAtLabel: string;
  total: number;
}

export const LIVE_ORDER: PurchaseOrder = {
  id: '#037468638',
  storeName: 'Shetty Stores',
  items: [
    { name: 'Nandini Pouch Curd', imageUri: PLACEHOLDER_IMAGE_URI },
    { name: 'Nandini Toned Milk', imageUri: PLACEHOLDER_IMAGE_URI },
    { name: 'Onion (Eerulli)', imageUri: PLACEHOLDER_IMAGE_URI },
  ],
  statusLabel: 'Out for Delivery',
  etaLabel: 'Arriving today, in about 20 minutes',
  placedAtLabel: 'Today, 12:47 PM',
  total: 84,
};

export const PAST_ORDERS: PurchaseOrder[] = [
  {
    id: '#037461205',
    storeName: 'Coastal Fresh',
    items: [
      { name: 'Fresh Coconut', imageUri: PLACEHOLDER_IMAGE_URI },
      { name: 'Fish Curry Masala', imageUri: PLACEHOLDER_IMAGE_URI },
    ],
    statusLabel: 'Delivered',
    etaLabel: 'Delivered at 6:40 PM',
    placedAtLabel: 'Yesterday, 6:02 PM',
    total: 142,
  },
  {
    id: '#037452871',
    storeName: 'Krishna Mart',
    items: [
      { name: 'Basmati Rice', imageUri: PLACEHOLDER_IMAGE_URI },
      { name: 'Cow Ghee', imageUri: PLACEHOLDER_IMAGE_URI },
      { name: 'Toor Dal', imageUri: PLACEHOLDER_IMAGE_URI },
      { name: 'Sunflower Oil', imageUri: PLACEHOLDER_IMAGE_URI },
    ],
    statusLabel: 'Delivered',
    etaLabel: 'Delivered at 4:15 PM',
    placedAtLabel: '3 Aug, 3:30 PM',
    total: 610,
  },
];
