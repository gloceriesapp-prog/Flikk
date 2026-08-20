// Single source of truth for the order queue — lifted out of
// screens/orders/OrdersScreen.tsx's local useState so OrderDetailScreen can
// read/act on the same orders without passing whole order objects (and
// their action callbacks) through navigation params, which React
// Navigation warns against for non-serializable values. Both screens read
// this store; only OrdersScreen seeds it.
//
// Still placeholder data underneath — no `GET /partner/orders` call yet,
// no login screen exists to produce a session token (P1 is a later pass,
// see App.tsx). A real fetch replaces the PLACEHOLDER_ORDERS seed here,
// not the store's shape.

import { create } from 'zustand';
import { PLACEHOLDER_ORDERS, type PartnerOrder } from '../screens/orders/data';

interface OrdersState {
  orders: PartnerOrder[];
  markPacked: (orderId: string) => void;
  // Local-only — drops the order from view, no backend cancel call. See
  // screens/orders/components/OrderCard.tsx's own note on why this app
  // doesn't own a real reject/cancel transition.
  rejectOrder: (orderId: string) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: PLACEHOLDER_ORDERS,

  markPacked: (orderId) =>
    set((state) => ({
      orders: state.orders.map((order) => (order.id === orderId ? { ...order, status: 'packed' } : order)),
    })),

  rejectOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((order) => order.id !== orderId),
    })),
}));
