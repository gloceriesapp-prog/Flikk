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
// That file still exists and is still used, but only by loadSampleData —
// an explicitly dev-only preview seeder now (gated behind __DEV__ in
// HomeScreen.tsx), never this store's real order source.
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
import { getCurrentCoordinates, requestLocationPermission } from '../location/riderLocation';
import { startBackgroundLocation, stopBackgroundLocation } from '../location/backgroundLocation';
import { todayKey } from '../utils/date';
import { carryOverActiveMs } from '../utils/activeTime';

export const STATUS_STEPS: RiderOrder['status'][] = ['assigned', 'picked_up', 'arrived_at_customer', 'delivered'];

// Sample/preview orders live only on-device (mockOrders' generateMockOrder →
// 'mock-…', the __DEV__ Test button → 'demo-…'). They have no backend row, so
// any real PATCH /orders/:id/status 404s ("order not found"). advanceOrderStatus/
// cancelOrder skip the network write for these and just move local state — the
// whole sample flow (pickup → arrive → deliver) works without a backend.
// ponytail: drop this once every order in the app is a real assignment.
const isLocalOrder = (id: string) => /^(mock|demo|sample)[-]/.test(id);

// Render invariant: any RiderOrder array put into state must be unique by id
// (two rows with one id crash the list renderers with duplicate React keys).
// Write paths already dedupe, but persisted blobs can predate that guard — a
// HISTORY_KEY written with 'demo-1' twice by an older build survives on disk
// and no write-path guard ever cleans it. Dedupe on the way IN (hydrate), so
// old bad data heals regardless of which writer/version produced it. First
// occurrence wins (persisted order is newest-first). ponytail: one guard at
// the read choke point beats trusting every historical writer.
const dedupById = (orders: RiderOrder[]): RiderOrder[] => {
  const seen = new Set<string>();
  return orders.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
};

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

const HISTORY_KEY = 'gloceries_rider_order_history';
const MAX_HISTORY = 200;

// Everything below persists to SecureStore so a cold launch restores the
// rider's real state before the first server poll returns (12s away) —
// online/offline, the order in hand, and the cancelled list, alongside the
// delivered history that was already persisted.
const ONLINE_KEY = 'gloceries_rider_is_online';
const CANCELLED_KEY = 'gloceries_rider_cancelled';
const ACTIVE_ORDERS_KEY = 'gloceries_rider_active_orders';

// Active-time-today accumulator (frozen ms + the UTC day it belongs to).
// Persisted so a restart mid-day keeps today's total; a stored date that
// isn't todayKey() is yesterday's total and gets dropped on load (the
// midnight refresh). Live current session is added on top at read time
// (useActiveMsToday), so this only holds *completed* session time.
const ACTIVE_MS_KEY = 'gloceries_rider_active_ms_today';

// How often, while online, to report a fresh position + refresh the
// nearby-offers list. Balanced accuracy (getCurrentCoordinates), not
// continuous high-accuracy tracking — this only needs to be fresh enough
// for a 3-8km dispatch radius, not turn-by-turn precision.
const LOCATION_PING_INTERVAL_MS = 45_000;

async function persistHistory(orders: RiderOrder[]): Promise<void> {
  await SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(orders.slice(0, MAX_HISTORY)));
}

async function persistCancelled(orders: RiderOrder[]): Promise<void> {
  await SecureStore.setItemAsync(CANCELLED_KEY, JSON.stringify(orders.slice(0, MAX_HISTORY)));
}

async function persistActive(orders: RiderOrder[]): Promise<void> {
  // Only real assignments survive a restart. Demo/sample orders have no
  // backend row, so they'd flash on launch then vanish on the first poll
  // (the reconcile rebuilds activeOrders from server rows) — don't store them.
  const real = orders.filter((o) => !isLocalOrder(o.id));
  await SecureStore.setItemAsync(ACTIVE_ORDERS_KEY, JSON.stringify(real.slice(0, MAX_HISTORY)));
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
  // True only between hydrate and the auth-gated resume in RootNavigator:
  // the rider was online when the app last closed, so once we know there's a
  // usable authed rider we call goOnline() to restart the presence loops.
  // Cleared by goOnline (and consumed once) so it never re-fires.
  resumeOnline: boolean;
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
  goOnline: () => Promise<boolean>;
  goOffline: () => void;
  acceptIncomingOrder: () => void;
  declineIncomingOrder: () => void;
  advanceOrderStatus: (orderId: string, otp?: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  // Post-pickup delivery failure — the terminal counterpart to cancelOrder
  // (which is pre-pickup only). Backend pays the rider the full fee and moves
  // the order to 'failed'; locally it just leaves the active list (the rider
  // has no failed-orders surface, and the server drops 'failed' from the
  // assignments feed — api/orders.ts's toLocalStatus).
  failOrder: (orderId: string, reason: string) => Promise<void>;
  // Demo/preview aid only — seeds one order into each of active/completed/
  // cancelled so every list layout on Home/Orders/Earnings can be seen
  // without waiting on a real assignment. Not a real data source; gated
  // behind __DEV__ at the call site (HomeScreen.tsx), never shown to a
  // real rider in a production build.
  loadSampleData: () => void;
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
  resumeOnline: false,
  dismissedIds: new Set(),
  nearbyOffers: [],

  hydrateHistory: async () => {
    const [rawHistory, rawActive, rawCancelled, rawActiveOrders, rawOnline] = await Promise.all([
      SecureStore.getItemAsync(HISTORY_KEY),
      SecureStore.getItemAsync(ACTIVE_MS_KEY),
      SecureStore.getItemAsync(CANCELLED_KEY),
      SecureStore.getItemAsync(ACTIVE_ORDERS_KEY),
      SecureStore.getItemAsync(ONLINE_KEY),
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
      completedOrders: rawHistory ? dedupById(JSON.parse(rawHistory) as RiderOrder[]) : [],
      cancelledOrders: rawCancelled ? dedupById(JSON.parse(rawCancelled) as RiderOrder[]) : [],
      // Restored for an instant cold-launch view; the 12s poll reconcile
      // rebuilds this from server rows and drops anything stale.
      activeOrders: rawActiveOrders ? dedupById(JSON.parse(rawActiveOrders) as RiderOrder[]) : [],
      isHistoryHydrated: true,
      resumeOnline: rawOnline === 'true',
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

      // ponytail: __DEV__ demo orders (id 'demo-…', from the Test button's
      // acceptDemoOffer) have no server row, so this poll would drop them on
      // the next cycle. Pin them so the accept→active preview survives. Real
      // assignments never use this prefix. Delete with the Test button.
      if (__DEV__) {
        for (const o of state.activeOrders) {
          if (o.id.startsWith('demo-') && !nextActive.some((n) => n.id === o.id)) nextActive.push(o);
        }
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

  goOnline: async () => {
    // Presence dispatch is pointless without location: pingAndRefresh below
    // no-ops forever with no GPS fix, so an ungated goOnline flips the rider
    // to "online" while nearby_online_riders never sees them — a silent dead
    // state, no offers, no signal why. Gate the whole thing on the foreground
    // grant here (the one place every caller routes through) and return
    // whether we actually went online, so a tap can surface the denial.
    const granted = await requestLocationPermission();
    if (!granted) return false;

    set((state) => {
      // Already online → don't restart the session clock. Fresh online →
      // stamp onlineSince, and if the banked total is from an earlier day,
      // reset it now (midnight refresh) before this shift adds to it.
      if (state.isOnline) return state;
      const today = todayKey();
      // Persist so a reopen resumes online (read back as resumeOnline in
      // hydrate). Clear resumeOnline here so the one-shot boot resume can't
      // re-fire.
      void SecureStore.setItemAsync(ONLINE_KEY, 'true');
      return {
        isOnline: true,
        onlineSince: Date.now(),
        resumeOnline: false,
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
    // Keeps presence alive once the OS suspends this JS runtime — the
    // foreground loop above only ticks while the app is open. Best-effort:
    // no-ops if the rider declined the "Always" location grant.
    void startBackgroundLocation();
    return true;
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
      void SecureStore.setItemAsync(ONLINE_KEY, 'false');
      return { isOnline: false, onlineSince: null, resumeOnline: false, nearbyOffers: [], activeMsToday, activeMsDate: today };
    });
    stopLocationPing();
    void stopBackgroundLocation();
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
      // Dedup by id — a concurrent sync poll could already have landed this
      // same assignment in activeOrders, and two rows with one id crash the
      // list renderers with duplicate React keys.
      activeOrders: [...state.activeOrders.filter((o) => o.id !== order.id), order],
    }));
  },

  declineIncomingOrder: () => {
    // Local-only dismiss: adds the id to dismissedIds so it stops
    // re-alerting. The order stays assigned to this rider server-side —
    // nothing is unassigned or reassigned. The UI labels this honestly as
    // "Dismiss" (not "Decline") for that reason; name kept for callers.
    const order = get().incomingOrder;
    clearAutoDeclineTimer();
    set((state) => ({
      incomingOrder: null,
      incomingOrderExpiresAt: null,
      dismissedIds: order ? new Set(state.dismissedIds).add(order.id) : state.dismissedIds,
    }));
  },

  advanceOrderStatus: async (orderId, otp) => {
    const order = get().activeOrders.find((o) => o.id === orderId);
    if (!order) return;

    if (order.status === 'assigned') {
      // Real transition: packed -> out_for_delivery. Backend also stamps
      // picked_up_at here (orderStateMachine.ts's timestampColumnFor).
      // Sample orders have no backend row — skip the PATCH, move local only.
      if (!isLocalOrder(orderId)) await updateOrderStatus(orderId, 'out_for_delivery');
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
      // Real transition: out_for_delivery -> delivered, gated on the OTP the
      // customer read off their own order. A wrong/missing code is a real 400
      // from the backend (routes/orders.ts) — it throws here so the caller
      // can keep the OTP modal open, and no local state moves to delivered.
      // Sample orders have no backend row / real OTP — skip the PATCH.
      if (!isLocalOrder(orderId)) await updateOrderStatus(orderId, 'delivered', undefined, otp);
      // The server verifies one shared proof and commits every active trip leg.
      const completedIds = new Set(get().activeOrders.filter(o =>
        o.id === orderId || (!!order.tripId && o.tripId === order.tripId)
      ).map(o => o.id));
      set((state) => {
        const delivered = state.activeOrders.filter(o => completedIds.has(o.id)).map(o => ({
          ...o, status: 'delivered' as const, deliveredAt: new Date().toISOString(),
          customerRating: undefined, tip: undefined,
        }));
        return {
          activeOrders: state.activeOrders.filter(o => !completedIds.has(o.id)),
          completedOrders: [...delivered, ...state.completedOrders.filter(o => !completedIds.has(o.id))],
        };
      });
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
    if (!isLocalOrder(orderId)) await updateOrderStatus(orderId, 'cancelled', reason);

    set((state) => {
      const order = state.activeOrders.find((o) => o.id === orderId);
      if (!order) return state;
      return {
        activeOrders: state.activeOrders.filter((o) => o.id !== orderId),
        // Same id-reuse dedupe as the delivered path above.
        cancelledOrders: [{ ...order, status: 'cancelled', cancelReason: reason }, ...state.cancelledOrders.filter((o) => o.id !== orderId)],
      };
    });
  },

  failOrder: async (orderId, reason) => {
    // Real transition out_for_delivery -> failed (this app's 'picked_up' /
    // 'arrived_at_customer'). A rejection (not picked up yet, trip leg —
    // TRIP_FAILURE_UNSUPPORTED, not this rider's order) is a real 400/403/409
    // from the backend, thrown straight through so the caller can Alert it
    // rather than silently pretend the drop was closed out. reason is a code
    // from RIDER_DELIVERY_FAILURE_REASONS (@gloceries/shared), validated server-side.
    if (!isLocalOrder(orderId)) await updateOrderStatus(orderId, 'failed', reason);

    // Terminal + paid server-side — just leave the active list. No local
    // failed/cancelled bucket to add it to (mirrors how the assignments poll
    // drops a server-reported 'failed' order entirely, api/orders.ts).
    set((state) => ({ activeOrders: state.activeOrders.filter((o) => o.id !== orderId) }));
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
}));

// Persist the in-hand and cancelled lists whenever they change, from any
// mutation path — one place instead of a persist call at every mutation.
// Ref-equality: each mutation replaces the array, so unrelated ticks
// (nearbyOffers, timers, online flag) never trigger a write. completedOrders
// keeps its own explicit persist (write only on newlyDelivered).
useRiderOrdersStore.subscribe((state, prev) => {
  if (state.activeOrders !== prev.activeOrders) void persistActive(state.activeOrders);
  if (state.cancelledOrders !== prev.cancelledOrders) void persistCancelled(state.cancelledOrders);
});
