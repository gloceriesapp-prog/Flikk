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
import { fetchOrders, updateOrderStatus, type ApiOrder } from '../api/orders';
import { buildSampleOrders, buildSimulatedIncomingOrder, mapApiOrder, type PartnerOrder } from '../screens/orders/data';

// India-only single-zone app (CLAUDE.md) — 'Asia/Kolkata' explicitly, not
// the device's own timezone, so this reads the real IST calendar day
// regardless of what timezone a phone happens to be set to.
const IST_TIME_ZONE = 'Asia/Kolkata';

function isSameIstDay(isoA: string, isoB: string): boolean {
  const opts: Intl.DateTimeFormatOptions = { timeZone: IST_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(isoA).toLocaleDateString('en-CA', opts) === new Date(isoB).toLocaleDateString('en-CA', opts);
}

// A delivered order has nothing left for a store owner to act on, but
// still-showing today's completed deliveries is real, wanted confirmation
// ("did that order actually land"), not noise — scoped to today only so
// this queue never grows into the store's entire delivery history.
function isDeliveredToday(row: ApiOrder, now: Date = new Date()): boolean {
  return row.status === 'delivered' && !!row.delivered_at && isSameIstDay(row.delivered_at, now.toISOString());
}

interface OrdersState {
  orders: PartnerOrder[];
  acknowledgedOrderIds: Set<string>;
  newlyArrivedOrderIds: Set<string>;
  // Same "genuinely changed since the last poll, not just currently in
  // this state" reasoning as newlyArrivedOrderIds — an order that reaches
  // 'delivered' between two loadOrders() calls lands here exactly once,
  // which is what features/delivery-earned-alert/ watches to show the
  // "you earned ₹X" banner. Never re-added for an order that was already
  // delivered on a previous poll.
  justDeliveredOrderIds: Set<string>;
  baselineEstablished: boolean;
  loadOrders: () => Promise<void>;
  // Local UI flag only — see file header. Not a status transition.
  acknowledgeOrder: (orderId: string) => void;
  markPacked: (orderId: string) => Promise<void>;
  // reason: STORE_REJECT_REASONS code, or STORE_NO_RESPONSE_REASON for the auto-reject.
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
  clearNewlyArrived: (orderId: string) => void;
  clearJustDelivered: (orderId: string) => void;
  // Dev-only — injects one fake order into `orders` AND
  // newlyArrivedOrderIds in the same update, which is the exact condition
  // useIncomingOrderAlert.ts's effect watches for. Fires the real
  // production alert (full-screen modal + sound) instead of a separate
  // mock, so previewing it can never quietly drift from what a genuine
  // incoming order actually triggers. See DevSimulateOrderButton.tsx for
  // the one place this gets called from.
  simulateIncomingOrder: () => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  acknowledgedOrderIds: new Set(),
  newlyArrivedOrderIds: new Set(),
  justDeliveredOrderIds: new Set(),
  baselineEstablished: false,

  loadOrders: async () => {
    const rows = await fetchOrders();
    // Queue-relevant statuses — 'cancelled' has nothing left for a store
    // owner to act on or care about, so it's the only status excluded
    // outright. 'delivered' is included but only for today (isDeliveredToday
    // above) — a completed delivery from last week has no place cluttering
    // today's queue, but today's own completed orders are real, wanted
    // confirmation the order actually landed. 'failed' (rider couldn't
    // complete the drop after pickup) is included unconditionally — the
    // owner's stock left the shop and didn't get delivered, so they must
    // see it regardless of the day.
    // ponytail: 'failed' unscoped by date — failures are rare at MVP volume,
    // so no flooding; add an isFailedToday guard like 'delivered' if it ever clutters.
    const active = rows.filter(
      (row) =>
        row.status === 'placed' ||
        row.status === 'packed' ||
        row.status === 'out_for_delivery' ||
        row.status === 'failed' ||
        isDeliveredToday(row),
    );
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
    // Development builds only: a real store must never see orders that do
    // not exist. Production shows the Orders screen's own empty state.
    if (mapped.length === 0 && __DEV__) {
      set((state) => (state.orders.length > 0 && state.orders[0].isSample ? state : { orders: buildSampleOrders(), baselineEstablished: true }));
      return;
    }

    set((state) => {
      const previousIds = new Set(state.orders.map((o) => o.id));
      const previousStatusById = new Map(state.orders.map((o) => [o.id, o.status]));
      const genuinelyNew = state.baselineEstablished
        ? mapped.filter((o) => o.status === 'placed' && !previousIds.has(o.id)).map((o) => o.id)
        : [];
      // Was present before with a real, DIFFERENT status — not "just
      // appeared as delivered" (that's a stale/late poll catching up, not
      // a fresh transition worth interrupting the owner about) and not on
      // the very first load (baselineEstablished false — a store owner
      // opening the app to 3 already-delivered orders from earlier today
      // shouldn't get 3 "you earned" banners just because this was the
      // first fetch, same reasoning as genuinelyNew above).
      const genuinelyJustDelivered = state.baselineEstablished
        ? mapped
            .filter((o) => o.status === 'delivered' && previousStatusById.has(o.id) && previousStatusById.get(o.id) !== 'delivered')
            .map((o) => o.id)
        : [];

      return {
        orders: mapped,
        baselineEstablished: true,
        newlyArrivedOrderIds: genuinelyNew.length > 0 ? new Set([...state.newlyArrivedOrderIds, ...genuinelyNew]) : state.newlyArrivedOrderIds,
        justDeliveredOrderIds:
          genuinelyJustDelivered.length > 0 ? new Set([...state.justDeliveredOrderIds, ...genuinelyJustDelivered]) : state.justDeliveredOrderIds,
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

  rejectOrder: async (orderId, reason) => {
    if (orderId.startsWith('sample-')) {
      set((state) => ({ orders: state.orders.filter((order) => order.id !== orderId) }));
      return;
    }
    await updateOrderStatus(orderId, 'cancelled', reason);
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

  clearJustDelivered: (orderId) =>
    set((state) => {
      const justDeliveredOrderIds = new Set(state.justDeliveredOrderIds);
      justDeliveredOrderIds.delete(orderId);
      return { justDeliveredOrderIds };
    }),

  simulateIncomingOrder: () =>
    set((state) => {
      const order = buildSimulatedIncomingOrder();
      return {
        orders: [order, ...state.orders],
        baselineEstablished: true,
        newlyArrivedOrderIds: new Set(state.newlyArrivedOrderIds).add(order.id),
      };
    }),
}));
