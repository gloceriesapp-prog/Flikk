import { create } from 'zustand';
import { acceptOrder, fetchOrders, fetchOrderUpdates, fetchOrderPage, fetchOrderTransitions, updateOrderStatus, type ApiOrder } from '../api/orders';
import { buildSimulatedIncomingOrder, mapApiOrder, type PartnerOrder } from '../screens/orders/data';
import { computeNewlyArrivedIds, computeJustDeliveredIds, sameOrderList } from './orderBaseline';
import { getSessionEpoch, isCurrentSession, onSessionReset } from './sessionScope';

interface OrdersState {
  orders: PartnerOrder[];
  acknowledgedOrderIds: Set<string>;
  newlyArrivedOrderIds: Set<string>;
  justDeliveredOrderIds: Set<string>;
  baselineEstablished: boolean;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: number | null;
  loadOrders: () => Promise<void>;
  refreshUpdates: () => Promise<void>;
  loadMore: () => Promise<void>;
  nextCursor: string | null;
  acknowledgeOrder: (id: string) => Promise<void>;
  markPacked: (id: string) => Promise<void>;
  rejectOrder: (id: string, reason: string) => Promise<void>;
  clearNewlyArrived: (id: string) => void;
  clearJustDelivered: (id: string) => void;
  simulateIncomingOrder: () => void;
}

const initialState = () => ({ orders: [] as PartnerOrder[], acknowledgedOrderIds: new Set<string>(),
  newlyArrivedOrderIds: new Set<string>(), justDeliveredOrderIds: new Set<string>(),
  nextCursor: null as string | null, baselineEstablished: false, loading: false, error: null as string | null, lastUpdatedAt: null as number | null });
let revision = 0;
let readGeneration = 0;
let lastFullReadAt = 0;
let queueVersion: string | null = null;
let updating: Promise<void> | null = null;
let inFlight: { epoch: number; promise: Promise<void> } | null = null;
const actions = new Map<string, Promise<void>>();

function isQueueOrder(row: ApiOrder): boolean {
  if (row.payment_method !== 'cod' && !row.provider_payment_id) return false;
  if (['cancelled', 'failed', 'delivered'].includes(row.status)) return false;
  return true;
}

// Coalesce repeated taps for one order. Server transitions remain authoritative.
function runAction(id: string, work: () => Promise<void>): Promise<void> {
  const key = `${getSessionEpoch()}:${id}`;
  const existing = actions.get(key);
  if (existing) return existing;
  const epoch = getSessionEpoch();
  const promise = work().finally(() => {
    if (isCurrentSession(epoch)) revision += 1;
    if (actions.get(key) === promise) actions.delete(key);
  });
  actions.set(key, promise);
  return promise;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  ...initialState(),
  loadOrders: () => {
    const epoch = getSessionEpoch();
    if (inFlight?.epoch === epoch) return inFlight.promise;
    const readRevision = revision;
    const generation = ++readGeneration;
    set({ loading: true });
    const entry = { epoch, promise: Promise.resolve() };
    const promise: Promise<void> = (async () => {
      try {
        const rows = await fetchOrders();
        if (!isCurrentSession(epoch) || readRevision !== revision) return;
        const previous = useOrdersStore.getState();
        const currentIds = new Set(rows.map(row => row.id));
        const departedIds = previous.orders.filter(order => !['delivered', 'failed', 'cancelled'].includes(order.status)
          && !currentIds.has(order.id) && !order.id.startsWith('sample-')).slice(0, 100).map(order => order.id);
        const transitions = departedIds.length ? await fetchOrderTransitions(departedIds) : [];
        if (!isCurrentSession(epoch) || readRevision !== revision || generation !== readGeneration) return;
        const delivered = transitions.filter(row => row.status === 'delivered').map(row => mapApiOrder(row, transitions));
        const deliveredIds = new Set(delivered.map(row => row.id));
        // Keep confirmed earnings until the banner consumer drains them. Historical
        // browsing uses its own cursor query rather than keeping every terminal row.
        const pending = previous.orders.filter(order => order.status === 'delivered'
          && previous.justDeliveredOrderIds.has(order.id) && !deliveredIds.has(order.id));
        const mapped = [...rows.filter(isQueueOrder).map(row => mapApiOrder(row, rows)), ...delivered, ...pending];
        lastFullReadAt = Date.now();
        set(state => ({
          orders: sameOrderList(state.orders, mapped) ? state.orders : mapped,
          acknowledgedOrderIds: new Set(mapped.filter(order => order.acceptedAtTimestamp != null).map(order => order.id)),
          newlyArrivedOrderIds: new Set([...state.newlyArrivedOrderIds,
            ...computeNewlyArrivedIds(state.orders, mapped, state.baselineEstablished)]
            .filter(id => mapped.some(order => order.id === id && order.status === 'placed' && !order.acceptedAtTimestamp))),
          justDeliveredOrderIds: new Set([...state.justDeliveredOrderIds,
            ...computeJustDeliveredIds(state.orders, mapped, state.baselineEstablished)]),
          baselineEstablished: true, nextCursor: rows.nextCursor ?? null, error: null, lastUpdatedAt: Date.now(),
        }));
      } catch (error) {
        if (isCurrentSession(epoch) && readRevision === revision)
          set({ error: error instanceof Error ? error.message : 'Could not refresh orders. Try again.' });
        throw error;
      } finally {
        if (isCurrentSession(epoch) && generation === readGeneration) set({ loading: false });
        if (inFlight === entry) inFlight = null;
      }
    })();
    entry.promise = promise;
    inFlight = entry;
    return promise;
  },
  refreshUpdates: () => {
    if (updating) return updating;
    const epoch = getSessionEpoch();
    const readRevision = revision;
    const queueGeneration = readGeneration;
    const promise = (async () => {
      try {
        const digest = await fetchOrderUpdates();
        if (!isCurrentSession(epoch) || revision !== readRevision) return;
        if (digest.version !== queueVersion || !useOrdersStore.getState().baselineEstablished || useOrdersStore.getState().error || Date.now() - lastFullReadAt >= 120_000) {
          await useOrdersStore.getState().loadOrders();
          if (isCurrentSession(epoch) && revision === readRevision) queueVersion = digest.version;
        } else set({ error: null });
      } catch (error) {
        // A manual retry may have recovered while this older digest was
        // pending. Its late failure must not restore the stale error banner.
        if (isCurrentSession(epoch) && revision === readRevision && readGeneration === queueGeneration) {
          set({ error: error instanceof Error ? error.message : 'Could not refresh orders.' });
        }
        throw error;
      }
    })().finally(() => { if (updating === promise) updating = null; });
    updating = promise;
    return promise;
  },
  loadMore: async () => {
    const { nextCursor, loading } = useOrdersStore.getState();
    if (!nextCursor || loading) return;
    const epoch = getSessionEpoch(); const readRevision = revision; const generation = ++readGeneration;
    set({ loading: true });
    try {
      const page = await fetchOrderPage({ cursor: nextCursor });
      if (!isCurrentSession(epoch) || revision !== readRevision || generation !== readGeneration || useOrdersStore.getState().nextCursor !== nextCursor) return;
      set(state => {
        const existing = new Set(state.orders.map(row => row.id));
        const extra = page.items.filter(isQueueOrder).filter(row => !existing.has(row.id)).map(row => mapApiOrder(row, page.items));
        const orders = [...state.orders, ...extra];
        return { orders, nextCursor: page.nextCursor, error: null,
          acknowledgedOrderIds: new Set(orders.filter(row => row.acceptedAtTimestamp != null).map(row => row.id)) };
      });
    } catch (error) {
      if (isCurrentSession(epoch) && revision === readRevision && generation === readGeneration) set({ error: error instanceof Error ? error.message : 'Could not load more orders.' });
      throw error;
    } finally { if (isCurrentSession(epoch) && generation === readGeneration) set({ loading: false }); }
  },
  acknowledgeOrder: id => runAction(id, async () => {
    const epoch = getSessionEpoch();
    revision += 1;
    const row = id.startsWith('sample-') && __DEV__ ? null : await acceptOrder(id);
    if (!isCurrentSession(epoch)) return;
    set(state => ({
      orders: state.orders.map(order => order.id === id ? row ? mapApiOrder(row, [row]) : { ...order, acceptedAtTimestamp: Date.now() } : order),
      acknowledgedOrderIds: new Set(state.acknowledgedOrderIds).add(id),
      newlyArrivedOrderIds: new Set([...state.newlyArrivedOrderIds].filter(value => value !== id)),
    }));
  }),
  markPacked: id => runAction(id, async () => {
    const epoch = getSessionEpoch(); revision += 1;
    if (!(id.startsWith('sample-') && __DEV__)) await updateOrderStatus(id, 'packed');
    if (!isCurrentSession(epoch)) return;
    set(state => ({ orders: state.orders.map(order => order.id === id ? { ...order, status: 'packed' } : order) }));
  }),
  rejectOrder: (id, reason) => runAction(id, async () => {
    const epoch = getSessionEpoch(); revision += 1;
    if (!(id.startsWith('sample-') && __DEV__)) await updateOrderStatus(id, 'cancelled', reason);
    if (!isCurrentSession(epoch)) return;
    set(state => ({ orders: state.orders.filter(order => order.id !== id),
      acknowledgedOrderIds: new Set([...state.acknowledgedOrderIds].filter(value => value !== id)),
      newlyArrivedOrderIds: new Set([...state.newlyArrivedOrderIds].filter(value => value !== id)) }));
  }),
  clearNewlyArrived: id => set(state => ({ newlyArrivedOrderIds: new Set([...state.newlyArrivedOrderIds].filter(value => value !== id)) })),
  clearJustDelivered: id => set(state => ({ justDeliveredOrderIds: new Set([...state.justDeliveredOrderIds].filter(value => value !== id)),
    orders: state.orders.filter(order => order.id !== id || order.status !== 'delivered') })),
  simulateIncomingOrder: () => {
    if (!__DEV__) return;
    const order = buildSimulatedIncomingOrder();
    set(state => ({ orders: [order, ...state.orders], baselineEstablished: true,
      newlyArrivedOrderIds: new Set(state.newlyArrivedOrderIds).add(order.id) }));
  },
}));

onSessionReset(() => {
  revision += 1; readGeneration += 1; lastFullReadAt = 0; inFlight = null; updating = null; queueVersion = null; actions.clear();
  useOrdersStore.setState(initialState());
});
