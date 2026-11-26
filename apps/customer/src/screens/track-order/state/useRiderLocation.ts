import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useIsFocused } from '@react-navigation/native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchDeliveryRoute, fetchOrderRiderLocation, fetchTripRiderLocation } from '../../../api/tracking';
import { usesGoogleMaps } from '../../../location/mapProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppForeground } from './useAppForeground';
import { useTrackingPreview } from './trackingPreview';
import { RIDER_LOCATION_POLL_MS } from './riderLocationView';

// Let the server's one-minute failure back-off pass before asking again.
const ROUTE_RETRY_MS = 65_000;
const CAN_SHOW_ROAD_ROUTE = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && usesGoogleMaps();
const retry = (count: number, error: unknown) => count < 1 && ![401, 403, 404, 410].includes((error as { status?: number }).status ?? 0);

// The rider's live position and the shared road route for the current leg
// (server tracking/legRoutes.ts): rider -> store once a rider is on the way,
// rider -> customer after pickup. The rider app draws the same saved route.
// The position is polled every RIDER_LOCATION_POLL_MS; the route is fetched
// once per leg and again only when its version changes (the server
// re-routed a rider who left the road), so the poll never costs Google calls.
export function useRiderLocation(id: string, isTrip: boolean, trackable: boolean, outForDelivery: boolean) {
  const customerId = useAuthStore(state => state.customerId);
  const focused = useIsFocused();
  const foreground = useAppForeground();
  const previewing = useTrackingPreview();
  const enabled = trackable && focused && foreground && (!!customerId || previewing);
  const query = useQuery({
    queryKey: [isTrip ? 'trip-rider-location' : 'order-rider-location', id, customerId],
    queryFn: () => (isTrip ? fetchTripRiderLocation(id) : fetchOrderRiderLocation(id)),
    enabled,
    retry,
    // Live while a rider is tracked; before that only the pins, checked
    // now and then for a rider being assigned.
    staleTime: 0,
    gcTime: 60_000,
    placeholderData: keepPreviousData,
    refetchInterval: q => !enabled ? false : outForDelivery || q.state.data?.active ? RIDER_LOCATION_POLL_MS : 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
  const { active, leg, route_version: version } = query.data ?? {};
  const route = useQuery({
    queryKey: ['delivery-route', isTrip, id, customerId, leg, version],
    // Only the drop leg is drawn for the customer (see RiderLiveMap).
    enabled: enabled && CAN_SHOW_ROAD_ROUTE && !!active && leg === 'drop',
    queryFn: async ({ signal }) => {
      const result = await fetchDeliveryRoute(id, isTrip, signal);
      // The leg may have changed (pickup done) while this was in flight.
      if (!result.active || result.leg !== leg) return null;
      return result.route && result.route.length >= 2 ? result.route : null;
    },
    // Keep drawing the previous route while a re-routed one loads (same leg only).
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[4] === leg ? previous : undefined,
    staleTime: q => q.state.data ? Infinity : ROUTE_RETRY_MS,
    refetchInterval: q => {
      const { data, dataUpdateCount, errorUpdateCount } = q.state;
      return !data && dataUpdateCount + errorUpdateCount === 1 ? ROUTE_RETRY_MS : false;
    },
    refetchIntervalInBackground: false,
    gcTime: 0,
    retry: false,
  });
  return {
    data: trackable ? query.data : undefined,
    route: trackable && active && leg ? route.data ?? undefined : undefined,
    fetchedAt: query.dataUpdatedAt,
  };
}
