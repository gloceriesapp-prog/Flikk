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
// Real backend limitation this still works around rather than pretends
// doesn't exist:
// - No accept/reject concept for an ADMIN-assigned order specifically —
//   admin's own PATCH /admin/orders/:id/assign-rider still commits that
//   assignment before this app ever sees it (a manual override path that
//   coexists with automated dispatch below, same atomic
//   `rider_id is null` guard either way). "Accept" here just acknowledges
//   it locally (moves it into activeOrders); "Decline"/an expired accept
//   window can't actually unassign anything — it only stops re-alerting on
//   it locally (dismissedIds, in-memory only). The order stays real and
//   assigned either way; there's no reassignment pool to return it to yet.
//
// Presence/location IS real now (automated rider dispatch, explicit
// CLAUDE.md scope override — see that file's own Scope discipline
// section): goOnline/goOffline call PATCH /rider/status
// (backend/src/routes/rider.ts), and while online a periodic ping
// (LOCATION_PING_INTERVAL_MS) reports the rider's live position, which is
// what lib/riderDispatch.ts's own nearby_online_riders RPC actually reads
// when a store packs an order. `nearbyOffers`/startOffersPoll below are
// the rider's own "available pickups near me" list backed by GET
// /rider/dispatch-offers, separate from activeOrders — an offer only
// becomes a real assignment (and shows up via the existing GET
// /assignments poll) once acceptOffer wins the atomic accept race.
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
import { acceptDispatchOffer, fetchDispatchOffers, updateRiderStatus, type AcceptDispatchOfferResult, type DispatchOffer } from '../api/dispatch';
import { fetchAssignments, toRiderOrder, updateOrderStatus } from '../api/orders';
import { generateMockOrder, generateMockRating, generateMockTip, type RiderOrder } from '../data/mockOrders';
import { getCurrentCoordinates } from '../location/riderLocation';
import { startOfWeek } from '../utils/earnings';
import { todayKey } from '../utils/date';
import { carryOverActiveMs } from '../utils/activeTime';

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

// Active-time-today accumulator (frozen ms + the UTC day it belongs to).
// Persisted so a restart mid-day keeps today's total; a stored date that
// isn't todayKey() is yesterday's total and gets dropped on load (the
// midnight refresh). Live current session is added on top at read time
// (useActiveMsToday), so this only holds *completed* session time.
const ACTIVE_MS_KEY = 'flikk_rider_active_ms_today';

// How often, while online, to report a fresh position + refresh the
// nearby-offers list. Balanced accuracy (getCurrentCoordinates), not
// continuous high-accuracy tracking — this only needs to be fresh enough
// for a 3-8km dispatch radius, not turn-by-turn precision.
const LOCATION_PING_INTERVAL_MS = 45_000;

async function persistHistory(orders: RiderOrder[]): Promise<void> {
  await SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(orders.slice(0, MAX_HISTORY)));
}

interface RiderOrdersState {
  isOnline: boolean;
  onlineSince: number | null;
  // Time spent online earlier today that's already been "banked" (each
  // goOffline adds that session's ms here). The live current session is
  // NOT in here — read the running total via useActiveMsToday. Resets to 0
  // at midnight (see activeMsDate).
  activeMsToday: number;
  activeMsDate: string; // UTC day (todayKey()) activeMsToday belongs to
  incomingOrder: RiderOrder | null;
  incomingOrderExpiresAt: number | null;
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  cancelledOrders: RiderOrder[];
  isHistoryHydrated: boolean;
  // Real, currently-open dispatch offers within range of wherever
  // goOnline's own location loop last reported — see this file's own
  // header note. Cleared the moment the rider goes offline.
  nearbyOffers: DispatchOffer[];
  acceptOffer: (orderId: string) => Promise<AcceptDispatchOfferResult>;
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
let locationPingTimer: ReturnType<typeof setInterval> | null = null;

function stopLocationPing() {
  if (locationPingTimer) {
    clearInterval(locationPingTimer);
    locationPingTimer = null;
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
  activeMsToday: 0,
  activeMsDate: '',
  incomingOrder: null,
  incomingOrderExpiresAt: null,
  activeOrders: [],
  completedOrders: [],
  cancelledOrders: [],
  isHistoryHydrated: false,
  dismissedIds: new Set(),
  nearbyOffers: [],

  hydrateHistory: async () => {
    const [rawHistory, rawActive] = await Promise.all([
      SecureStore.getItemAsync(HISTORY_KEY),
      SecureStore.getItemAsync(ACTIVE_MS_KEY),
    ]);
    // Only carry the stored active-time forward if it's still the same UTC
    // day; a stale date is yesterday's shift → today starts at 0.
    let activeMsToday = 0;
    let activeMsDate = todayKey();
    if (rawActive) {
      const parsed = JSON.parse(rawActive) as { ms: number; date: string };
      if (parsed.date === activeMsDate) activeMsToday = parsed.ms;
    }
    set({
      completedOrders: rawHistory ? (JSON.parse(rawHistory) as RiderOrder[]) : [],
      isHistoryHydrated: true,
      activeMsToday,
      activeMsDate,
    });
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
    set((state) => {
      // Already online → don't restart the session clock. Fresh online →
      // stamp onlineSince, and if the banked total is from an earlier day,
      // reset it now (midnight refresh) before this shift adds to it.
      if (state.isOnline) return state;
      const today = todayKey();
      return {
        isOnline: true,
        onlineSince: Date.now(),
        activeMsToday: carryOverActiveMs(state.activeMsToday, state.activeMsDate, today),
        activeMsDate: today,
      };
    });

    // One real ping-and-refresh loop covers both jobs: report this
    // rider's current position (what nearby_online_riders reads) and pull
    // a fresh nearbyOffers list from it (what nearby_dispatch_offers
    // reads) — no reason to sample GPS twice for two purposes that both
    // need the exact same fix.
    async function pingAndRefresh() {
      const coords = await getCurrentCoordinates().catch(() => null);
      if (!coords) return; // permission denied / no fix yet — try again next tick
      await updateRiderStatus({ status: 'online', lat: coords.latitude, lng: coords.longitude }).catch(() => {});
      const offers = await fetchDispatchOffers(coords.latitude, coords.longitude).catch(() => null);
      if (offers) set({ nearbyOffers: offers });
    }

    stopLocationPing();
    void pingAndRefresh();
    locationPingTimer = setInterval(() => void pingAndRefresh(), LOCATION_PING_INTERVAL_MS);
  },

  goOffline: () => {
    set((state) => {
      // Bank this session's elapsed time into today's total, then freeze
      // (onlineSince cleared → useActiveMsToday adds nothing live). Persist
      // so a restart keeps it. ponytail: a shift spanning midnight banks the
      // whole session into the new day rather than splitting at 00:00 — a
      // daily active-time readout doesn't need boundary-exact accounting.
      const today = todayKey();
      const sessionMs = state.onlineSince ? Date.now() - state.onlineSince : 0;
      const activeMsToday = carryOverActiveMs(state.activeMsToday, state.activeMsDate, today) + sessionMs;
      void SecureStore.setItemAsync(ACTIVE_MS_KEY, JSON.stringify({ ms: activeMsToday, date: today }));
      return { isOnline: false, onlineSince: null, nearbyOffers: [], activeMsToday, activeMsDate: today };
    });
    stopLocationPing();
    void updateRiderStatus({ status: 'offline' }).catch(() => {});
  },

  acceptOffer: async (orderId) => {
    const result = await acceptDispatchOffer(orderId);
    if (result.ok) {
      // Optimistic removal — the next GET /assignments poll (already
      // running via startSync) picks this up into activeOrders on its own
      // within POLL_INTERVAL_MS; no need to duplicate that fetch here.
      set((state) => ({ nearbyOffers: state.nearbyOffers.filter((o) => o.orderId !== orderId) }));
    } else if (result.alreadyTaken) {
      // Lost the race — this offer is gone regardless of who got it.
      set((state) => ({ nearbyOffers: state.nearbyOffers.filter((o) => o.orderId !== orderId) }));
    }
    return result;
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
