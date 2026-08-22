// Drives the full-screen alert — the "attention phase" of the two-phase
// accept window (see features/order-expiry/orderExpiry.ts for the full
// picture). This hook's only jobs are: which order (if any) is currently
// shown, the 60s attention countdown, and manual accept/decline. It does
// NOT reject an order on its own anymore — at 0s it just stops
// interrupting and hands the order off to the grace phase, where it sits
// as a normal, fully-acceptable card in the Orders queue
// (OrderCard's own live countdown badge) until
// features/order-expiry/useOrderExpiryWatcher.ts's longer total window
// actually rejects it. A shop owner mid-customer for a minute doesn't
// lose the order just because they didn't look at their phone the
// instant it buzzed — the loud/blocking part of this flow is meant to be
// short, not held open for the whole grace window.
//
// "Accept Order" here calls acknowledgeOrder, not markPacked — tapping
// Accept the moment the phone rings means "yes, I'll take this," not "I've
// already physically packed it." The order stays 'placed' (still the only
// real status this app can write is 'packed') and shows as the queue's
// "Accepted" card state, with its own separate "Mark Packed" action for
// once the shop owner has actually finished — see OrderCard.tsx.
//
// Reads useOrdersStore directly rather than taking orders as a prop —
// this is meant to be mounted once at the app root (see App.tsx),
// independent of whatever screen is currently focused, so an incoming
// order interrupts the shop owner regardless of which tab they're on.
//
// `activeOrder` is a local snapshot, not a live lookup into the store —
// taken once when the alert triggers, kept as-is until Accept/Decline
// clears it. Manual Decline still calls the store's real rejectOrder
// (that's an intentional, immediate cancel); the attention-phase timeout
// below does not.
//
// `dismissedOrderIds` is what stops an order from re-triggering this
// full-screen alert after its attention phase has already run once —
// without it, the "pick up the next un-dismissed order" effect would
// immediately re-show the same order the instant its countdown hit zero,
// since the order is still sitting in the store with status 'placed'.

import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useOrdersStore } from '../../store/useOrdersStore';
import { navigationRef } from '../../navigation/navigationRef';
import type { PartnerOrder } from '../../screens/orders/data';
import { playOrderAlertSound } from './playOrderAlertSound';

export const AUTO_DECLINE_SECONDS = 60;

interface UseIncomingOrderAlertResult {
  activeOrder: PartnerOrder | null;
  secondsLeft: number;
  onAccept: () => void;
  onDecline: () => void;
}

export function useIncomingOrderAlert(): UseIncomingOrderAlertResult {
  const orders = useOrdersStore((state) => state.orders);
  const acknowledgeOrder = useOrdersStore((state) => state.acknowledgeOrder);
  const rejectOrder = useOrdersStore((state) => state.rejectOrder);

  const acknowledgedOrderIds = useOrdersStore((state) => state.acknowledgedOrderIds);
  const [activeOrder, setActiveOrder] = useState<PartnerOrder | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DECLINE_SECONDS);
  // Ref, not state — read inside the interval/effect below without
  // retriggering them on every dismissal, same pattern as
  // SlideToConfirmButton's own refs-in-gesture-handlers note.
  const dismissedOrderIdsRef = useRef<Set<string>>(new Set());

  // Picks up the next un-dismissed, un-acknowledged 'placed' order
  // whenever the queue changes and nothing is currently on screen — this
  // is the "new order arrived" trigger until a real push-driven one
  // replaces it. The acknowledged check is a defensive backstop —
  // dismissedOrderIdsRef already covers this hook's own instance, but an
  // acknowledged order should never re-trigger the alert regardless.
  useEffect(() => {
    if (activeOrder) return;
    const next = orders.find(
      (order) =>
        order.status === 'placed' &&
        !dismissedOrderIdsRef.current.has(order.id) &&
        !acknowledgedOrderIds.has(order.id)
    );
    if (!next) return;

    setActiveOrder(next);
    setSecondsLeft(AUTO_DECLINE_SECONDS);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    void playOrderAlertSound();
  }, [orders, activeOrder, acknowledgedOrderIds]);

  // The attention-phase countdown — ticks once a second while an order is
  // active. At zero: stop interrupting and send the shop owner to the
  // Orders tab, where the order is now waiting as a normal card for the
  // rest of the grace window. No rejectOrder call here — see file header.
  // The side effects live inside the setTimeout callback directly, not
  // inside the setSecondsLeft updater passed to it — that distinction is
  // what "Cannot update a component while rendering a different
  // component" was about: React can invoke a functional setState updater
  // during render (StrictMode double-invoke, batching), so anything
  // inside that updater must be a pure function of its previous value.
  // The setTimeout callback itself runs as a genuine async event after
  // render, so calling navigationRef from there is legal.
  useEffect(() => {
    if (!activeOrder || secondsLeft <= 0) return;

    const timeout = setTimeout(() => {
      if (secondsLeft <= 1) {
        dismissedOrderIdsRef.current.add(activeOrder.id);
        setActiveOrder(null);
        if (navigationRef.isReady()) navigationRef.navigate('Orders');
      } else {
        setSecondsLeft(secondsLeft - 1);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [activeOrder, secondsLeft]);

  // Neither of these navigates anywhere on purpose — accepting/declining
  // just clears activeOrder, closing the alert (Modal visible={false} on
  // the next render) and dropping the shop owner back wherever they
  // already were. Only the attention-phase timeout above forces a
  // destination (see file header on why).
  function onAccept() {
    if (!activeOrder) return;
    dismissedOrderIdsRef.current.add(activeOrder.id);
    acknowledgeOrder(activeOrder.id);
    setActiveOrder(null);
  }

  function onDecline() {
    if (!activeOrder) return;
    dismissedOrderIdsRef.current.add(activeOrder.id);
    rejectOrder(activeOrder.id);
    setActiveOrder(null);
  }

  return { activeOrder, secondsLeft, onAccept, onDecline };
}
