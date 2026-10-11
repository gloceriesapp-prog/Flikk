// Data/logic layer for the floating "active order" tracker pill (shows above
// the bottom nav once the customer has an in-flight order, taps through to
// TrackOrder). No fetch of its own: it rides the SAME purchase-history query
// the Purchase tab already warms and reads (features/purchases/historyQuery
// -> api/orders.ts GET /orders/history), so opening the app with the pill
// mounted costs no extra DB read — just a light 30s poll to keep the pill
// status/ETA fresh. Grouping + display mapping reuse screens/purchase/data's
// mapOrderGroup exactly, so the pill can never disagree with the Purchase
// list about what an order's status/store/ETA is.
//
// "Active" = the three non-terminal stages (ActiveOrderStatus). Of those we
// surface the MOST RECENTLY PLACED one. orderId/isTrip are returned verbatim
// as navigation.navigate('TrackOrder', { orderId, isTrip }) expects (trip_id
// for a multi-store trip, order UUID otherwise — mapOrderGroup's own split).

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { purchaseHistoryOptions } from '../purchases/historyQuery';
import { groupOrdersByTrip } from '../../utils/tripLegs';
import { mapOrderGroup, type PurchaseOrder } from '../../screens/purchase/data';
import { estimateDeliveryTime, deliveryMinutes } from '../../utils/estimateDelivery';
import { type ActiveOrderStatus } from './activeOrderLabel';

// Keep the pill fresh without the per-second clock the full tracking screen
// runs — a pill only needs coarse refreshes.
const PILL_POLL_MS = 30_000;

export interface ActiveOrder {
  orderId: string;
  isTrip: boolean;
  statusKey: ActiveOrderStatus;
  // The order's recorded delivery deadline (epoch ms), or null if it can't be
  // computed. The pill derives its live, never-zero countdown from this +
  // baseMinutes via computeDisplayEta (activeOrderEta.ts) — ticked by the
  // component, so the value stays fresh between the 30s data polls.
  deadlineMs: number | null;
  // The order's own estimate in minutes — selects the countdown reset window.
  baseMinutes: number;
  storeName: string;
}

function isActiveStatus(status: PurchaseOrder['status']): status is ActiveOrderStatus {
  return status === 'placed' || status === 'packed' || status === 'out_for_delivery';
}

function deadlineMsFor(order: PurchaseOrder): number | null {
  const eta = estimateDeliveryTime(order.placedAtIso, order.estimatedDeliveryMinutes, order.estimatedDeliveryAt).getTime();
  return Number.isFinite(eta) ? eta : null;
}

export function useActiveOrder(): ActiveOrder | null {
  const customerId = useAuthStore(state => state.customerId);
  // Default (unfiltered) params => the exact query key PurchaseScreen warms,
  // so this shares that cache instead of issuing its own read.
  const options = purchaseHistoryOptions(customerId);
  const { data } = useInfiniteQuery({ ...options, refetchInterval: PILL_POLL_MS, refetchIntervalInBackground: false });

  return useMemo(() => {
    // Newest-first first page already holds the most recent order; the pill
    // never needs older pages, so we don't fetchNextPage.
    const firstPage = data?.pages[0]?.items ?? [];
    const active = groupOrdersByTrip(firstPage)
      .map(mapOrderGroup)
      .filter((order): order is PurchaseOrder & { status: ActiveOrderStatus } => isActiveStatus(order.status))
      .sort((a, b) => new Date(b.placedAtIso).getTime() - new Date(a.placedAtIso).getTime())[0];
    if (!active) return null;
    return {
      orderId: active.orderId,
      isTrip: active.isTrip,
      statusKey: active.status,
      deadlineMs: deadlineMsFor(active),
      baseMinutes: deliveryMinutes(active.estimatedDeliveryMinutes),
      storeName: active.storeName,
    };
  }, [data]);
}
