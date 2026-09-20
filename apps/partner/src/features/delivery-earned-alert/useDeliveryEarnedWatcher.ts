// Bridges useOrdersStore's real order-state transitions to the ephemeral
// banner store above — mounted once at the app root (App.tsx), same shape
// as order-expiry's own useOrderExpiryWatcher. Its only job: the moment
// useOrdersStore's polling (useOrderPolling.ts) notices an order genuinely
// just became 'delivered' (justDeliveredOrderIds — see that store's own
// note on why this is never a stale/first-load false-positive), pull the
// one order it needs real numbers from and hand it to showEarning.
//
// One banner at a time, queued — if two orders deliver close together, the
// second's id just sits in justDeliveredOrderIds until the first banner's
// own auto-dismiss (DeliveryEarnedBanner.tsx) clears activeEarning, then
// this effect re-fires and picks it up. Nothing is ever dropped silently.

import { useEffect } from 'react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { formatPayoutDateLabel, nextPayoutDate } from '../../utils/nextPayoutDate';
import { useDeliveryEarnedAlertStore } from './useDeliveryEarnedAlertStore';

export function useDeliveryEarnedWatcher(): void {
  const orders = useOrdersStore((state) => state.orders);
  const justDeliveredOrderIds = useOrdersStore((state) => state.justDeliveredOrderIds);
  const clearJustDelivered = useOrdersStore((state) => state.clearJustDelivered);
  const activeEarning = useDeliveryEarnedAlertStore((state) => state.activeEarning);
  const showEarning = useDeliveryEarnedAlertStore((state) => state.showEarning);

  useEffect(() => {
    if (activeEarning || justDeliveredOrderIds.size === 0) return;

    const nextId = justDeliveredOrderIds.values().next().value;
    if (!nextId) return;
    // Cleared immediately, regardless of whether the order is still
    // findable below — a missing order (already gone from the queue by
    // the time this runs) must never get stuck re-triggering this effect
    // on every future render.
    clearJustDelivered(nextId);

    const order = orders.find((o) => o.id === nextId);
    if (!order) return;

    showEarning({
      orderId: order.id,
      orderNumber: order.orderNumber,
      netEarned: order.netPayout,
      payoutDateLabel: formatPayoutDateLabel(nextPayoutDate()),
    });
  }, [activeEarning, justDeliveredOrderIds, orders, clearJustDelivered, showEarning]);
}
