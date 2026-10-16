import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderRiderLocation, fetchTripRiderLocation } from '../../../api/tracking';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppForeground } from './useAppForeground';
import { RIDER_LOCATION_POLL_MS } from './riderLocationView';

const retry = (count: number, error: unknown) => count < 1 && ![401, 403, 404, 410].includes((error as { status?: number }).status ?? 0);

// Polls the rider's live position only while it can matter: this screen is
// focused, the app is foregrounded, and the order/trip is out for delivery.
// Any other time the query is disabled, so nothing is fetched or retried.
export function useRiderLocation(id: string, isTrip: boolean, outForDelivery: boolean) {
  const customerId = useAuthStore(state => state.customerId);
  const focused = useIsFocused();
  const foreground = useAppForeground();
  const enabled = outForDelivery && focused && foreground && !!customerId;
  const query = useQuery({
    queryKey: [isTrip ? 'trip-rider-location' : 'order-rider-location', id, customerId],
    queryFn: () => (isTrip ? fetchTripRiderLocation(id) : fetchOrderRiderLocation(id)),
    enabled,
    retry,
    staleTime: 0,
    // A position is only useful live; don't resurrect an old one later.
    gcTime: 60_000,
    refetchInterval: enabled ? RIDER_LOCATION_POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
  return { data: enabled ? query.data : undefined, fetchedAt: query.dataUpdatedAt };
}
