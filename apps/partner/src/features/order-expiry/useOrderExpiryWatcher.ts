// Reminders follow the server response deadline. At expiry refresh the queue;
// cancellation belongs exclusively to the transactional backend worker.

import { useEffect, useRef } from 'react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { getElapsedMs, getReminderCheckpointsMs, hasAcceptWindowExpired, loadOrderAcceptWindow } from './orderExpiry';
import { sendOrderReminderNotification } from './orderReminderNotification';
import { useOrderReminderStore } from './useOrderReminderStore';

export function useOrderExpiryWatcher(): void {
  const orders = useOrdersStore((state) => state.orders);
  const acknowledgedOrderIds = useOrdersStore((state) => state.acknowledgedOrderIds);
  const loadOrders = useOrdersStore((state) => state.loadOrders);
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
        if (order.status !== 'placed' || order.acceptedAtTimestamp != null || acknowledgedOrderIds.has(order.id) || order.paymentMode === 'awaiting_payment') continue;

        if (hasAcceptWindowExpired(order, now)) {
          // Only the worker cancels expired orders. Device clock/network lag
          // must never authorize a cancellation. Refresh once at the boundary.
          if (!remindedCheckpointsRef.current.get(order.id)?.has(-1)) {
            remindedCheckpointsRef.current.set(order.id, new Set([-1]));
            void loadOrders().catch(() => {});
          }
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
  }, [orders, acknowledgedOrderIds, loadOrders, showReminder]);
}
