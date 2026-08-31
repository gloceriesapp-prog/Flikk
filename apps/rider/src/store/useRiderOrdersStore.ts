// Rider's own order queue — online/offline status, the incoming-order
// alert (with a hard accept window, not an untimed modal), active
// assignments, and the full delivered-order history (persisted across
// restarts — EarningsScreen derives its Today/Week/All-time views from
// this one array by filtering on deliveredAt, rather than keeping
// separate "today" vs "history" state to drift out of sync). Backed by
// data/mockOrders.ts, not a real GET /rider/orders (backend/src/routes/
// rider.ts doesn't exist yet) — see that file's own note. Every action
// here (accept/reject/advance status) is written the way it would work
// against a real endpoint (optimistic local update, single source of
// truth), so swapping in a real API later touches this file's internals,
// not every screen that reads from it.
//
// Status step order mirrors backend/src/lib/orderStateMachine.ts's own
// stages (placed -> packed -> out_for_delivery -> delivered) but split
// finer for what a rider specifically does: 'assigned' (backend's
// 'packed', rider hasn't reached the store yet) -> 'arrived_at_store' ->
// 'picked_up' (this is what flips the order to backend's
// 'out_for_delivery') -> 'arrived_at_customer' -> 'delivered'. A real
// backend integration would fire the matching PATCH at each step instead
// of just updating local state.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { generateMockOrder, generateMockRating, generateMockTip, type RiderOrder } from '../data/mockOrders';

export const STATUS_STEPS: RiderOrder['status'][] = ['assigned', 'arrived_at_store', 'picked_up', 'arrived_at_customer', 'delivered'];

// How long after going online before a demo order "arrives" — stands in
// for a founder actually assigning one (CLAUDE.md: manual/founder-assigned
// dispatch is correct at this scale, this app only ever receives
// assignments, it never computes them). Re-arms itself after every
// accept/reject/deliver so more than one order can show up in a session.
const INCOMING_ORDER_DELAY_MS = 8_000;

// Real rider apps give ~15-30s to accept before auto-reassigning — an
// untimed modal has no urgency and leaves a rider feeling "stuck" if they
// step away. 25s splits that range.
export const ACCEPT_WINDOW_SECONDS = 25;
const ACCEPT_WINDOW_MS = ACCEPT_WINDOW_SECONDS * 1000;

// ponytail: capped array persisted as one SecureStore JSON blob — fine at
// mock/demo scale (SecureStore has no server round-trip and a few hundred
// small records is well within its per-item size ceiling); a real backend
// would paginate this from an endpoint instead.
const HISTORY_KEY = 'flikk_rider_order_history';
const MAX_HISTORY = 200;

async function persistHistory(orders: RiderOrder[]): Promise<void> {
  await SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(orders.slice(0, MAX_HISTORY)));
}

interface RiderOrdersState {
  isOnline: boolean;
  // Set once, the moment isOnline actually flips false->true — goOnline()
  // is also called internally to re-arm the incoming-order timer while
  // already online (after a decline/delivery), which must NOT reset this,
  // or "online for" would jump back to 0 every time an order completes.
  onlineSince: number | null;
  incomingOrder: RiderOrder | null;
  incomingOrderExpiresAt: number | null;
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  cancelledOrders: RiderOrder[];
  isHistoryHydrated: boolean;
  hydrateHistory: () => Promise<void>;
  goOnline: () => void;
  goOffline: () => void;
  acceptIncomingOrder: () => void;
  declineIncomingOrder: () => void;
  advanceOrderStatus: (orderId: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
}

let incomingTimer: ReturnType<typeof setTimeout> | null = null;
let autoDeclineTimer: ReturnType<typeof setTimeout> | null = null;

function clearIncomingTimer() {
  if (incomingTimer) {
    clearTimeout(incomingTimer);
    incomingTimer = null;
  }
}

function clearAutoDeclineTimer() {
  if (autoDeclineTimer) {
    clearTimeout(autoDeclineTimer);
    autoDeclineTimer = null;
  }
}

export const useRiderOrdersStore = create<RiderOrdersState>((set, get) => ({
  isOnline: false,
  onlineSince: null,
  incomingOrder: null,
  incomingOrderExpiresAt: null,
  activeOrders: [],
  completedOrders: [],
  cancelledOrders: [],
  isHistoryHydrated: false,

  hydrateHistory: async () => {
    const raw = await SecureStore.getItemAsync(HISTORY_KEY);
    set({ completedOrders: raw ? (JSON.parse(raw) as RiderOrder[]) : [], isHistoryHydrated: true });
  },

  goOnline: () => {
    set((state) => ({ isOnline: true, onlineSince: state.isOnline ? state.onlineSince : Date.now() }));
    clearIncomingTimer();
    incomingTimer = setTimeout(() => {
      // Only surface a new incoming order if there isn't already one
      // waiting and the rider isn't already juggling an active delivery —
      // a real dispatcher wouldn't stack a second assignment on someone
      // mid-delivery either.
      const state = get();
      if (state.isOnline && !state.incomingOrder && state.activeOrders.length === 0) {
        const order = generateMockOrder();
        const expiresAt = Date.now() + ACCEPT_WINDOW_MS;
        set({ incomingOrder: order, incomingOrderExpiresAt: expiresAt });

        clearAutoDeclineTimer();
        autoDeclineTimer = setTimeout(() => {
          // Still the same, still-pending order once the window runs out
          // — auto-decline it exactly like a rider tapping Decline, so a
          // missed alert never leaves the rider silently stuck.
          if (get().incomingOrder?.id === order.id) get().declineIncomingOrder();
        }, ACCEPT_WINDOW_MS);
      }
    }, INCOMING_ORDER_DELAY_MS);
  },

  goOffline: () => {
    clearIncomingTimer();
    clearAutoDeclineTimer();
    set({ isOnline: false, onlineSince: null, incomingOrder: null, incomingOrderExpiresAt: null });
  },

  acceptIncomingOrder: () => {
    const order = get().incomingOrder;
    if (!order) return;
    clearAutoDeclineTimer();
    set((state) => ({
      incomingOrder: null,
      incomingOrderExpiresAt: null,
      activeOrders: [...state.activeOrders, order],
    }));
  },

  declineIncomingOrder: () => {
    clearAutoDeclineTimer();
    set({ incomingOrder: null, incomingOrderExpiresAt: null });
    // Re-arm — a declined order doesn't mean the rider went offline, they
    // should still be able to get the next real assignment.
    if (get().isOnline) get().goOnline();
  },

  advanceOrderStatus: (orderId) => {
    let delivered: RiderOrder | null = null;

    set((state) => {
      const order = state.activeOrders.find((o) => o.id === orderId);
      if (!order) return state;

      const currentIndex = STATUS_STEPS.indexOf(order.status);
      const nextStatus = STATUS_STEPS[currentIndex + 1];
      if (!nextStatus) return state;

      if (nextStatus === 'delivered') {
        delivered = {
          ...order,
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
          customerRating: generateMockRating(),
          tip: generateMockTip(),
        };
        return {
          activeOrders: state.activeOrders.filter((o) => o.id !== orderId),
          completedOrders: [delivered, ...state.completedOrders],
        };
      }

      return {
        activeOrders: state.activeOrders.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
      };
    });

    if (delivered) void persistHistory(get().completedOrders);

    // Freed up (order delivered) — re-arm the incoming-order timer so the
    // next assignment can show up, same as declining one.
    const state = get();
    if (state.isOnline && state.activeOrders.length === 0 && !state.incomingOrder) {
      state.goOnline();
    }
  },

  cancelOrder: (orderId, reason) => {
    set((state) => {
      const order = state.activeOrders.find((o) => o.id === orderId);
      const cancelled = order ? [{ ...order, status: 'cancelled' as const, cancelReason: reason }, ...state.cancelledOrders] : state.cancelledOrders;
      return {
        activeOrders: state.activeOrders.filter((o) => o.id !== orderId),
        cancelledOrders: cancelled,
      };
    });

    const state = get();
    if (state.isOnline && state.activeOrders.length === 0 && !state.incomingOrder) {
      state.goOnline();
    }
  },
}));
