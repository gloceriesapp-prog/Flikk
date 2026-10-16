// Incoming-order decisions close the alert only after server confirmation.
// Failed decisions remain visible and retryable; elapsed display time never cancels an order.

import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useOrdersStore } from '../../store/useOrdersStore';
import { navigationRef } from '../../navigation/navigationRef';
import type { PartnerOrder } from '../../screens/orders/data';
import { playOrderAlertSound } from './playOrderAlertSound';
import { attentionTiming, ATTENTION_SECONDS } from './attentionTiming';

export const AUTO_DECLINE_SECONDS = ATTENTION_SECONDS;

interface UseIncomingOrderAlertResult {
  activeOrder: PartnerOrder | null;
  secondsLeft: number;
  onAccept: () => Promise<void>;
  onDecline: (reason: string) => Promise<void>;
  busy: boolean;
  error: string | null;
}

export function useIncomingOrderAlert(): UseIncomingOrderAlertResult {
  const orders = useOrdersStore((state) => state.orders);
  const acknowledgeOrder = useOrdersStore((state) => state.acknowledgeOrder);
  const rejectOrder = useOrdersStore((state) => state.rejectOrder);
  const newlyArrivedOrderIds = useOrdersStore((state) => state.newlyArrivedOrderIds);
  const clearNewlyArrived = useOrdersStore((state) => state.clearNewlyArrived);

  const acknowledgedOrderIds = useOrdersStore((state) => state.acknowledgedOrderIds);
  const [activeOrder, setActiveOrder] = useState<PartnerOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionLock = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DECLINE_SECONDS);
  // Ref, not state — read inside the interval/effect below without
  // retriggering them on every dismissal, same pattern as
  // SlideToConfirmButton's own refs-in-gesture-handlers note.
  const dismissedOrderIdsRef = useRef<Set<string>>(new Set());
  const attentionRef = useRef({ orderId: '', startedAt: 0, reminded: false });

  useEffect(() => useOrdersStore.subscribe(state => {
    if (!activeOrder || dismissedOrderIdsRef.current.has(activeOrder.id)) return;
    const latest = state.orders.find(order => order.id === activeOrder.id);
    if (!latest || latest.status !== 'placed' || latest.acceptedAtTimestamp != null) {
      dismissedOrderIdsRef.current.add(activeOrder.id);
      setActiveOrder(null);
      clearNewlyArrived(activeOrder.id);
    }
  }), [activeOrder, clearNewlyArrived]);

  // Picks up the next un-dismissed, un-acknowledged order that
  // useOrdersStore itself has flagged as genuinely newly-arrived (see that
  // store's own note on baselineEstablished/newlyArrivedOrderIds) — not
  // just "any 'placed' order currently in the queue," which used to
  // re-trigger this full-screen interrupt for orders that had already
  // been sitting there before the app ever polled. The acknowledged check
  // is a defensive backstop — dismissedOrderIdsRef already covers this
  // hook's own instance, but an acknowledged order should never re-trigger
  // the alert regardless.
  useEffect(() => {
    if (activeOrder) return;
    const next = orders.find(
      (order) =>
        order.status === 'placed' && order.paymentMode !== 'awaiting_payment' && !order.acceptedAtTimestamp &&
        newlyArrivedOrderIds.has(order.id) &&
        !dismissedOrderIdsRef.current.has(order.id) &&
        !acknowledgedOrderIds.has(order.id)
    );
    if (!next) return;

    setError(null);
    attentionRef.current = { orderId: next.id, startedAt: Date.now(), reminded: false };
    setActiveOrder(next);
    setSecondsLeft(AUTO_DECLINE_SECONDS);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Best-effort — a device audio-session failure shouldn't crash the
    // alert flow (the haptic above already fired), and `void` alone
    // doesn't catch a rejection, just discards the return value.
    playOrderAlertSound().catch(() => {});
  }, [orders, activeOrder, acknowledgedOrderIds, newlyArrivedOrderIds]);

  // The 50-second attention window is measured from presentation. At zero,
  // hand off to the normal queue; only the server can expire an order.
  // Side effects stay in the timer callback, never in a state updater.
  useEffect(() => {
    if (!activeOrder) return;

    const tick = () => {
      const attention = attentionRef.current;
      if (attention.orderId !== activeOrder.id) return;
      const timing = attentionTiming(attention.startedAt, Date.now());
      setSecondsLeft(timing.secondsLeft);
      // Read the current store before sounding: a completed acceptance,
      // rejection or cancellation must suppress a queued reminder tick.
      const state = useOrdersStore.getState();
      const latest = state.orders.find(order => order.id === activeOrder.id);
      if (timing.reminderDue && !attention.reminded && !actionLock.current && latest?.status === 'placed' &&
          latest.acceptedAtTimestamp == null && latest.paymentMode !== 'awaiting_payment' &&
          !state.acknowledgedOrderIds.has(activeOrder.id)) {
        attention.reminded = true;
        playOrderAlertSound().catch(() => {});
      }
      if (timing.secondsLeft === 0 && !actionLock.current && !error) {
        dismissedOrderIdsRef.current.add(activeOrder.id);
        // Handed off to the Orders queue's own grace-window countdown now
        // (OrderCard) — not "new" anymore in the sense this flag means,
        // even though the order itself is still 'placed'.
        clearNewlyArrived(activeOrder.id);
        setActiveOrder(null);
        if (navigationRef.isReady()) navigationRef.navigate('Orders');
      }
    };
    const interval = setInterval(tick, 500);

    return () => clearInterval(interval);
  }, [activeOrder, clearNewlyArrived, error]);

  // Neither of these navigates anywhere on purpose — accepting/declining
  // just clears activeOrder, closing the alert (Modal visible={false} on
  // the next render) and dropping the shop owner back wherever they
  // already were. Only the attention-phase timeout above forces a
  // destination (see file header on why).
  async function act(operation: (id: string) => Promise<void>) {
    if (!activeOrder || actionLock.current) return;
    actionLock.current = true;
    setBusy(true); setError(null);
    const id = activeOrder.id;
    try {
      await operation(id);
      dismissedOrderIdsRef.current.add(id);
      clearNewlyArrived(id);
      setActiveOrder(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this order. Please retry.');
    } finally { actionLock.current = false; setBusy(false); }
  }
  const onAccept = () => act(acknowledgeOrder);
  const onDecline = (reason: string) => act(id => rejectOrder(id, reason));
  return { activeOrder, secondsLeft, onAccept, onDecline, busy, error };
}
