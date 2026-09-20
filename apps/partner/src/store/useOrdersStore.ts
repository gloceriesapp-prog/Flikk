// Single source of truth for the order queue — lifted out of
// screens/orders/OrdersScreen.tsx's local useState so OrderDetailScreen can
// read/act on the same orders without passing whole order objects (and
// their action callbacks) through navigation params, which React
// Navigation warns against for non-serializable values. Both screens read
// this store; only OrdersScreen seeds it.
//
// `acknowledgedOrderIds` is a local-only, UI-level "I've seen and accepted
// this" flag — it does NOT touch `order.status`. A 'placed' order that's
// been acknowledged still reads as 'placed' everywhere except the Orders
// queue card, which uses it to show Pending → Accepted → (Mark Packed).
// This is deliberate, not a shortcut: specs/02-partner-app/flows.md says
// "Partner app triggers no status transition other than `packed`" (plus
// cancelled, now — see backend/src/lib/orderStateMachine.ts's own note) —
// if acknowledging pushed a real status change, that rule would be broken.
//
// Backed by real GET /partner/orders / PATCH /orders/:id/status
// (api/orders.ts). loadOrders() is polled (features/incoming-order-alert/
// useOrderPolling.ts, mounted once at app root) — this is the real "does
// a store owner get alerted when someone orders" mechanism, not a manual
// per-screen fetch. markPacked/rejectOrder both hit the real backend and
// throw on failure — callers (OrdersScreen, OrderDetailScreen,
// useOrderExpiryWatcher) decide how to surface that, this store doesn't
// swallow it silently.
//
// `newlyArrivedOrderIds` is what makes polling safe to alert from: the
// very first loadOrders() call of a session (baselineEstablished still
// false) seeds the queue without flagging anything as "new" — a store
// owner opening the app with 3 orders already sitting there from earlier
// shouldn't get interrupted 3 times just because this was the first fetch.
// Only a 'placed' order that shows up in a LATER poll, one that wasn't in
// the previous poll's result, gets added here — that's the actual "a
// customer just ordered" signal useIncomingOrderAlert reacts to instead of
// treating every still-unacknowledged order as if it just arrived.

import { create } from 'zustand';
import { fetchOrders, updateOrderStatus } from '../api/orders';
import { buildSampleOrders, mapApiOrder, type PartnerOrder } from '../screens/orders/data';

interface OrdersState {
  orders: PartnerOrder[];
  acknowledgedOrderIds: Set<string>;
  newlyArrivedOrderIds: Set<string>;
  baselineEstablished: boolean;
  loadOrders: () => Promise<void>;
  // Local UI flag only — see file header. Not a status transition.
  acknowledgeOrder: (orderId: string) => void;
  markPacked: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string) => Promise<void>;
  clearNewlyArrived: (orderId: string) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  acknowledgedOrderIds: new Set(),
  newlyArrivedOrderIds: new Set(),
  baselineEstablished: false,

  loadOrders: async () => {
    const rows = await fetchOrders();
    // Queue-relevant statuses only — delivered/cancelled have nothing left
    // for a store owner to act on, same scope as the placeholder data this
    // replaced.
    const active = rows.filter((row) => row.status === 'placed' || row.status === 'packed' || row.status === 'out_for_delivery');
    const mapped = active.map((row) => mapApiOrder(row, rows));

    // Dev/preview fallback — a genuinely empty queue shows 3 sample orders
    // (data.ts's own buildSampleOrders, each flagged isSample: true) so the
    // UI can be checked without needing a real order first. Never mixed
    // with real rows. markPacked/rejectOrder below both short-circuit for
    // these ids instead of hitting the real backend.
    //
    // Generated exactly once, not on every call — this is polled every 10s
    // (useOrderPolling.ts's own POLL_INTERVAL_MS) and buildSampleOrders()
    // stamps placedAtTimestamp from Date.now() at call time; regenerating
    // it on every poll kept resetting that timestamp to "now", which reset
    // OrderCard's 10-minute accept countdown back to 10:00 every ~10
    // seconds instead of letting it actually count down. Sample orders
    // already on screen keep their original timestamps across every
    // subsequent poll while the real queue stays empty.
    if (mapped.length === 0) {
      set((state) => (state.orders.length > 0 && state.orders[0].isSample ? state : { orders: buildSampleOrders(), baselineEstablished: true }));
      return;
    }

    set((state) => {
      const previousIds = new Set(state.orders.map((o) => o.id));
      const genuinelyNew = state.baselineEstablished
        ? mapped.filter((o) => o.status === 'placed' && !previousIds.has(o.id)).map((o) => o.id)
        : [];

      return {
        orders: mapped,
        baselineEstablished: true,
        newlyArrivedOrderIds: genuinelyNew.length > 0 ? new Set([...state.newlyArrivedOrderIds, ...genuinelyNew]) : state.newlyArrivedOrderIds,
      };
    });
  },

  acknowledgeOrder: (orderId) =>
    set((state) => ({ acknowledgedOrderIds: new Set(state.acknowledgedOrderIds).add(orderId) })),

  markPacked: async (orderId) => {
    // Sample orders (data.ts's buildSampleOrders) aren't real orders.id
    // UUIDs — never real network calls, local-only state change instead.
    if (orderId.startsWith('sample-')) {
      set((state) => ({ orders: state.orders.map((order) => (order.id === orderId ? { ...order, status: 'packed' } : order)) }));
      return;
    }
    await updateOrderStatus(orderId, 'packed');
    set((state) => ({
      orders: state.orders.map((order) => (order.id === orderId ? { ...order, status: 'packed' } : order)),
    }));
  },

  rejectOrder: async (orderId) => {
    if (orderId.startsWith('sample-')) {
      set((state) => ({ orders: state.orders.filter((order) => order.id !== orderId) }));
      return;
    }
    await updateOrderStatus(orderId, 'cancelled');
    set((state) => {
      const acknowledgedOrderIds = new Set(state.acknowledgedOrderIds);
      acknowledgedOrderIds.delete(orderId);
      const newlyArrivedOrderIds = new Set(state.newlyArrivedOrderIds);
      newlyArrivedOrderIds.delete(orderId);
      return {
        orders: state.orders.filter((order) => order.id !== orderId),
        acknowledgedOrderIds,
        newlyArrivedOrderIds,
      };
    });
  },

  clearNewlyArrived: (orderId) =>
    set((state) => {
      const newlyArrivedOrderIds = new Set(state.newlyArrivedOrderIds);
      newlyArrivedOrderIds.delete(orderId);
      return { newlyArrivedOrderIds };
    }),
}));
