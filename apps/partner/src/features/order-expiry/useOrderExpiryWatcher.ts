// The grace-phase enforcer — ticks every second, doing two things for
// every still-'placed', not-yet-acknowledged order:
// 1. Fires a reminder (in-app banner + OS notification) once per
//    checkpoint in getReminderCheckpointsMs() as its elapsed time crosses
//    each one.
// 2. Rejects it once the accept window (admin setting, orderExpiry.ts) has elapsed.
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
import { getElapsedMs, getReminderCheckpointsMs, hasAcceptWindowExpired, loadOrderAcceptWindow } from './orderExpiry';
import { sendOrderReminderNotification } from './orderReminderNotification';
import { useOrderReminderStore } from './useOrderReminderStore';

export function useOrderExpiryWatcher(): void {
  const orders = useOrdersStore((state) => state.orders);
  const acknowledgedOrderIds = useOrdersStore((state) => state.acknowledgedOrderIds);
  const rejectOrder = useOrdersStore((state) => state.rejectOrder);
  const showReminder = useOrderReminderStore((state) => state.showReminder);

  // orderId -> set of checkpoint indexes (into getReminderCheckpointsMs())
  // already fired for that order — so a reminder never repeats once sent.
  const remindedCheckpointsRef = useRef<Map<string, Set<number>>>(new Map());

  // The admin-set accept window (delivery_settings), refreshed on mount.
  useEffect(() => {
    void loadOrderAcceptWindow();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const checkpoints = getReminderCheckpointsMs();
      const now = Date.now();

      for (const order of orders) {
        if (order.status !== 'placed' || acknowledgedOrderIds.has(order.id)) continue;

        if (hasAcceptWindowExpired(order, now)) {
          // Real backend call now (PATCH /orders/:id/status, 'cancelled')
          // — best-effort here specifically: a failed auto-reject just
          // means the order stays visible past its window, which a store
          // owner can still act on manually, not a broken flow worth
          // surfacing mid-background-timer.
          rejectOrder(order.id).catch(() => {});
          remindedCheckpointsRef.current.delete(order.id);
          continue;
        }

        const elapsed = getElapsedMs(order, now);
        const fired = remindedCheckpointsRef.current.get(order.id) ?? new Set<number>();

        checkpoints.forEach((checkpointMs, index) => {
          if (elapsed < checkpointMs || fired.has(index)) return;

          fired.add(index);
          remindedCheckpointsRef.current.set(order.id, fired);

          const stage = index === checkpoints.length - 1 ? 'final' : 'first';
          showReminder({ orderId: order.id, customerName: order.customerName, stage });
          // Best-effort — a notification-permission/scheduling failure
          // shouldn't crash the watcher (showReminder's in-app banner
          // already fired), and `void` alone doesn't catch a rejection,
          // just discards the return value.
          sendOrderReminderNotification(order.customerName, stage).catch(() => {});
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orders, acknowledgedOrderIds, rejectOrder, showReminder]);
}
