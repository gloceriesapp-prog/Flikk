import { useMemo } from 'react';
import { useTracking } from '../track-order/state/useTracking';
import { buildOrderSummary } from './data';

// Summary shares the lightweight, account-scoped live tracking observer.
// Static item/address details are fetched once, then refreshed only as needed.
export function useOrderSummary(orderId: string, isTrip: boolean) {
  const tracking = useTracking(orderId, isTrip);
  const summary = useMemo(() => buildOrderSummary(tracking.order, tracking.trip), [tracking.order, tracking.trip]);
  return { summary, isLoading: tracking.state === 'loading',
    isError: ['connection-error', 'request-error', 'unavailable', 'stale'].includes(tracking.state), refetch: tracking.refetch };
}
