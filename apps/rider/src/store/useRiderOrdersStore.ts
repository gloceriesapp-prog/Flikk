// Rider's own order queue — online/offline status, the incoming-order
// alert (with a hard accept window, not an untimed modal), active
// assignments, and the full delivered-order history (persisted across
// restarts — EarningsScreen derives its Today/Week/All-time views from
// this one array by filtering on deliveredAt, rather than keeping
// separate "today" vs "history" state to drift out of sync).
//
// Backed by real data now: api/orders.ts's fetchAssignments polls
// backend/src/routes/rider.ts's GET /assignments (real orders, real RLS,
// real rider_id = this account), not data/mockOrders.ts's fake generator.
// That file still exists and is still used, but only by loadSampleData/
// loadSampleWeek — explicitly dev-only preview seeders now (gated behind
// __DEV__ in HomeScreen.tsx/EarningsScreen.tsx), never this store's real
// order source.
//
// Two real backend limitations this works around rather than pretends
// don't exist:
// 1. No presence/availability system — isOnline is a purely local UI
//    concept (goOnline/goOffline never call the backend). Going offline
//    doesn't tell admin anything; it only suppresses this app's own
//    incoming-order interrupt for orders that arrive while offline (they
//    still land quietly in the queue, per CLAUDE.md's manual-dispatch
//    scope — the founder still has to actually reach the rider some other
//    way to know they're free). Syncing itself always runs while a
//    session exists, independent of this toggle, so an already-active
//    delivery never goes stale just because the rider flips offline
//    mid-drop.
// 2. No accept/reject concept server-side — admin's PATCH /admin/orders/
//    :id/assign-rider already commits the assignment before this app ever
//    sees it. "Accept" here just acknowledges it locally (moves it into
//    activeOrders); "Decline"/an expired accept window can't actually
//    unassign anything — it only stops re-alerting on it locally
//    (dismissedIds, in-memory only). The order stays real and assigned
//    either way; there's no reassignment pool to return it to yet.
//
// Status step order mirrors backend/src/lib/orderStateMachine.ts's own
// stages (placed -> packed -> out_for_delivery -> delivered) but split
// finer for what a rider specifically does: 'assigned' (backend's
// 'packed') -> 'picked_up' (backend's 'out_for_delivery'; the real PATCH
// fires on this transition) -> 'arrived_at_customer' (local-only — no
// backend column for this sub-stage) -> 'delivered' (another real PATCH,
// which is also what makes backend/src/routes/orders.ts write the real
// rider_earnings row).

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { fetchAssignments, toRiderOrder, updateOrderStatus } from '../api/orders';
import { generateMockOrder, generateMockRating, generateMockTip, type RiderOrder } from '../data/mockOrders';
import { startOfWeek } from '../utils/earnings';

export const STATUS_STEPS: RiderOrder['status'][] = ['assigned', 'picked_up', 'arrived_at_customer', 'delivered'];

// Real rider apps give ~15-30s to accept before auto-reassigning — kept as
// a local UX device (see this file's own header note on why there's
// nothing real to "reassign" yet) so the interrupt still has urgency
// instead of sitting untimed.
export const ACCEPT_WINDOW_SECONDS = 25;
const ACCEPT_WINDOW_MS = ACCEPT_WINDOW_SECONDS * 1000;

// How often to re-fetch real assignments. Backend has no realtime push for
// this yet (Supabase Realtime is available but not subscribed to here) —
// polling is the simpler thing that's actually buildable client-side right
// now, same tradeoff apps/partner's WaitingApprovalScreen makes.
const POLL_INTERVAL_MS = 12_000;

const HISTORY_KEY = 'flikk_rider_order_history';
const MAX_HISTORY = 200;

async function persistHistory(orders: RiderOrder[]): Promise<void> {
  await SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(orders.slice(0, MAX_HISTORY)));
}

interface RiderOrdersState {
  isOnline: boolean;
  onlineSince: number | null;
  incomingOrder: RiderOrder | null;
  incomingOrderExpiresAt: number | null;
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  cancelledOrders: RiderOrder[];
  isHistoryHydrated: boolean;
  // In-memory only, on purpose (this file's own header note #2) — an
  // order dismissed this session shouldn't keep re-interrupting, but a
  // fresh app launch is a legitimate reason to see a still-unacknowledged
  // assignment again.
  dismissedIds: Set<string>;
  hydrateHistory: () => Promise<void>;
  startSync: () => void;
  stopSync: () => void;
  goOnline: () => void;
  goOffline: () => void;
  acceptIncomingOrder: () => void;
  declineIncomingOrder: () => void;
  advanceOrderStatus: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  // Demo/preview aid only — seeds one order into each of active/completed/
  // cancelled so every list layout on Home/Orders/Earnings can be seen
  // without waiting on a real assignment. Not a real data source; gated
  // behind __DEV__ at the call site (HomeScreen.tsx), never shown to a
  // real rider in a production build.
  loadSampleData: () => void;
  loadSampleWeek: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let autoDeclineTimer: ReturnType<typeof setTimeout> | null = null;

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
  dismissedIds: new Set(),

  hydrateHistory: async () => {
    const raw = await SecureStore.getItemAsync(HISTORY_KEY);
    set({ completedOrders: raw ? (JSON.parse(raw) as RiderOrder[]) : [], isHistoryHydrated: true });
  },

  startSync: () => {
    if (pollTimer) return; // already running
    const sync = async () => {
      let rows;
      try {
        rows = await fetchAssignments();
      } catch {
        // Network blip / not-yet-approved-as-a-rider — just skip this
        // cycle, the next poll tries again. Nothing useful to surface to
        // a rider for one missed background refresh.
        return;
      }

      const state = get();
      const mapped = rows.map(toRiderOrder).filter((o): o is RiderOrder => o !== null);

      const knownIds = new Set([
        ...state.activeOrders.map((o) => o.id),
        ...state.completedOrders.map((o) => o.id),
        ...state.cancelledOrders.map((o) => o.id),
        ...state.dismissedIds,
        ...(state.incomingOrder ? [state.incomingOrder.id] : []),
      ]);

      const nextActive: RiderOrder[] = [];
      const newlyDelivered: RiderOrder[] = [];
      const newlyCancelled: RiderOrder[] = [];
      let nextIncoming = state.incomingOrder;
      let nextIncomingExpiresAt = state.incomingOrderExpiresAt;

      for (const order of mapped) {
        if (order.status === 'delivered') {
          if (!state.completedOrders.some((o) => o.id === order.id)) newlyDelivered.push(order);
          continue;
        }
        if (order.status === 'cancelled') {
          if (!state.cancelledOrders.some((o) => o.id === order.id)) newlyCancelled.push(order);
          continue;
        }

        // Still the pending incoming order — stays there, not double-shown
        // in the active list until actually accepted.
        if (nextIncoming?.id === order.id) continue;

        const brandNew = !knownIds.has(order.id) && order.status === 'assigned';
        if (brandNew && !nextIncoming) {
          if (state.isOnline) {
            nextIncoming = order;
            nextIncomingExpiresAt = Date.now() + ACCEPT_WINDOW_MS;
          } else {
            // Offline: still real, still theirs — just no interrupt.
            nextActive.push(order);
          }
          continue;
        }

        // Preserve the local-only 'arrived_at_customer' sub-stage — the
        // server only ever reports 'picked_up' for this order (mapped
        // from out_for_delivery) until the real 'delivered' PATCH fires.
        const existing = state.activeOrders.find((o) => o.id === order.id);
        const effectiveStatus = existing?.status === 'arrived_at_customer' && order.status === 'picked_up' ? 'arrived_at_customer' : order.status;
        nextActive.push({ ...order, status: effectiveStatus });
      }

      set({
        activeOrders: nextActive,
        completedOrders: newlyDelivered.length ? [...newlyDelivered, ...state.completedOrders] : state.completedOrders,
        cancelledOrders: newlyCancelled.length ? [...newlyCancelled, ...state.cancelledOrders] : state.cancelledOrders,
        incomingOrder: nextIncoming,
        incomingOrderExpiresAt: nextIncomingExpiresAt,
      });

      if (newlyDelivered.length) void persistHistory(get().completedOrders);

      if (nextIncoming && nextIncoming.id !== state.incomingOrder?.id) {
        clearAutoDeclineTimer();
        const incomingId = nextIncoming.id;
        autoDeclineTimer = setTimeout(() => {
          if (get().incomingOrder?.id === incomingId) get().declineIncomingOrder();
        }, ACCEPT_WINDOW_MS);
      }
    };

    void sync();
    pollTimer = setInterval(sync, POLL_INTERVAL_MS);
  },

  stopSync: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    clearAutoDeclineTimer();
  },

  goOnline: () => {
    set((state) => ({ isOnline: true, onlineSince: state.isOnline ? state.onlineSince : Date.now() }));
  },

  goOffline: () => {
    set({ isOnline: false, onlineSince: null });
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
    const order = get().incomingOrder;
    clearAutoDeclineTimer();
    set((state) => ({
      incomingOrder: null,
      incomingOrderExpiresAt: null,
      dismissedIds: order ? new Set(state.dismissedIds).add(order.id) : state.dismissedIds,
    }));
  },

  advanceOrderStatus: async (orderId) => {
    const order = get().activeOrders.find((o) => o.id === orderId);
    if (!order) return;

    if (order.status === 'assigned') {
      // Real transition: packed -> out_for_delivery. Backend also stamps
      // picked_up_at here (orderStateMachine.ts's timestampColumnFor).
      await updateOrderStatus(orderId, 'out_for_delivery');
      set((state) => ({
        activeOrders: state.activeOrders.map((o) => (o.id === orderId ? { ...o, status: 'picked_up' } : o)),
      }));
      return;
    }

    if (order.status === 'picked_up') {
      // Local-only sub-stage — no backend call (this file's own header
      // note on why).
      set((state) => ({
        activeOrders: state.activeOrders.map((o) => (o.id === orderId ? { ...o, status: 'arrived_at_customer' } : o)),
      }));
      return;
    }

    if (order.status === 'arrived_at_customer') {
      // Real transition: out_for_delivery -> delivered. This is also what
      // makes backend write the real rider_earnings row (routes/orders.ts).
      await updateOrderStatus(orderId, 'delivered');
      const delivered: RiderOrder = {
        ...order,
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        // No backend concept for either yet (this file's own header note
        // on the flat, tip-less real earnings model) — left genuinely
        // absent rather than fabricated, same as api/orders.ts's mapper.
        customerRating: undefined,
        tip: undefined,
      };
      set((state) => ({
        activeOrders: state.activeOrders.filter((o) => o.id !== orderId),
        completedOrders: [delivered, ...state.completedOrders],
      }));
      void persistHistory(get().completedOrders);
    }
  },

  cancelOrder: async (orderId, reason) => {
    // Real transition — only valid while still 'packed' (this app's own
    // 'assigned'), same rule CancelOrderModal's own placement already
    // assumes (only ever shown pre-pickup). A rejection here (already
    // picked up, not actually this rider's order, etc.) is a real 403/409
    // from the backend — thrown straight through, not swallowed, so the
    // screen that called this can Alert the real reason instead of
    // silently pretending it worked.
    await updateOrderStatus(orderId, 'cancelled', reason);

    set((state) => {
      const order = state.activeOrders.find((o) => o.id === orderId);
      if (!order) return state;
      return {
        activeOrders: state.activeOrders.filter((o) => o.id !== orderId),
        cancelledOrders: [{ ...order, status: 'cancelled', cancelReason: reason }, ...state.cancelledOrders],
      };
    });
  },

  loadSampleData: () => {
    const active: RiderOrder = { ...generateMockOrder(), status: 'picked_up' };

    const completedOne: RiderOrder = {
      ...generateMockOrder(),
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      customerRating: generateMockRating(),
      tip: generateMockTip(),
    };
    const completedTwo: RiderOrder = {
      ...generateMockOrder(),
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      customerRating: generateMockRating(),
      tip: generateMockTip(),
    };

    const cancelledBase = generateMockOrder();
    const cancelled: RiderOrder = { ...cancelledBase, status: 'cancelled', cancelReason: 'Store is closed' };

    set((state) => ({
      activeOrders: [active, ...state.activeOrders],
      completedOrders: [completedOne, completedTwo, ...state.completedOrders],
      cancelledOrders: [cancelled, ...state.cancelledOrders],
    }));

    void persistHistory(get().completedOrders);
  },

  loadSampleWeek: () => {
    const weekStart = startOfWeek(new Date());
    const ORDERS_PER_DAY = [18, 4, 0, 3, 15, 0, 2];

    const sampleOrders: RiderOrder[] = [];
    ORDERS_PER_DAY.forEach((orderCount, dayOffset) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + dayOffset);

      for (let i = 0; i < orderCount; i += 1) {
        const deliveredAt = new Date(day);
        deliveredAt.setHours(9 + i * 3, 15, 0, 0);

        sampleOrders.push({
          ...generateMockOrder(),
          status: 'delivered',
          deliveredAt: deliveredAt.toISOString(),
          customerRating: generateMockRating(),
          tip: generateMockTip(),
        });
      }
    });

    set((state) => ({ completedOrders: [...sampleOrders, ...state.completedOrders] }));
    void persistHistory(get().completedOrders);
  },
}));
