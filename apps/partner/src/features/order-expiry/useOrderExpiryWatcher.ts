// The grace-phase enforcer — ticks every second, doing two things for
// every still-'placed', not-yet-acknowledged order:
// 1. Fires a reminder (in-app banner + OS notification) once per
//    checkpoint in REMINDER_CHECKPOINTS_MS as its elapsed time crosses
//    each one.
// 2. Rejects it once the total ORDER_ACCEPT_WINDOW_MS has elapsed.
//
// Mounted once at the app root (App.tsx), not inside IncomingOrderAlert or
// OrdersScreen — it has to keep running regardless of whether the alert is
// currently showing or which tab is focused, since the whole point of the
// grace phase (and its reminders) is that a shop owner can be anywhere in
// the app, or not in it at all, when they fire.
//
// Skips acknowledged orders entirely (no reminders, no reject) — once a
// shop owner has hit "Accept Order" (useOrdersStore.acknowledgeOrder, a
// local UI flag, not a status change), both the reminder nudges and the
// auto-reject safety net have done their job and stand down. Reminding
// someone about an order they already accepted, or rejecting it out from
// under them, would undo their own action.
//
// `remindedCheckpointsRef` is what stops a reminder firing every second
// once its checkpoint has passed — same ref-not-state pattern as
// useIncomingOrderAlert.ts's dismissedOrderIdsRef, read inside the
// interval without retriggering this effect.

import { useEffect, useRef } from 'react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { REMINDER_CHECKPOINTS_MS, getElapsedMs, hasAcceptWindowExpired } from './orderExpiry';
import { sendOrderReminderNotification } from './orderReminderNotification';
import { useOrderReminderStore } from './useOrderReminderStore';

export function useOrderExpiryWatcher(): void {
  const orders = useOrdersStore((state) => state.orders);
  const acknowledgedOrderIds = useOrdersStore((state) => state.acknowledgedOrderIds);
  const rejectOrder = useOrdersStore((state) => state.rejectOrder);
  const showReminder = useOrderReminderStore((state) => state.showReminder);

  // orderId -> set of checkpoint indexes (into REMINDER_CHECKPOINTS_MS)
  // already fired for that order — so a reminder never repeats once sent.
  const remindedCheckpointsRef = useRef<Map<string, Set<number>>>(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      for (const order of orders) {
        if (order.status !== 'placed' || acknowledgedOrderIds.has(order.id)) continue;

        if (hasAcceptWindowExpired(order, now)) {
          rejectOrder(order.id);
          remindedCheckpointsRef.current.delete(order.id);
          continue;
        }

        const elapsed = getElapsedMs(order, now);
        const fired = remindedCheckpointsRef.current.get(order.id) ?? new Set<number>();

        REMINDER_CHECKPOINTS_MS.forEach((checkpointMs, index) => {
          if (elapsed < checkpointMs || fired.has(index)) return;

          fired.add(index);
          remindedCheckpointsRef.current.set(order.id, fired);

          const stage = index === REMINDER_CHECKPOINTS_MS.length - 1 ? 'final' : 'first';
          showReminder({ orderId: order.id, customerName: order.customerName, stage });
          void sendOrderReminderNotification(order.customerName, stage);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orders, acknowledgedOrderIds, rejectOrder, showReminder]);
}
