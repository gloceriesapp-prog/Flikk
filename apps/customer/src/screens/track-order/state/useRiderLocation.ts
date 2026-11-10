import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDeliveryRoute, fetchOrderRiderLocation, fetchTripRiderLocation, type RiderLocationResponse } from '../../../api/tracking';
import { usesGoogleMaps } from '../../../location/mapProvider';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppForeground } from './useAppForeground';
import { RIDER_LOCATION_POLL_MS } from './riderLocationView';

// Let the backend's one-minute unavailable-route cache expire first.
const ROUTE_RETRY_MS = 65_000;
const CAN_SHOW_ROAD_ROUTE = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && usesGoogleMaps();
const retry = (count: number, error: unknown) => count < 1 && ![401, 403, 404, 410].includes((error as { status?: number }).status ?? 0);

// Load the endpoint pins once before pickup. Changing phase starts the live
// query immediately while keeping the existing pins visible.
export function useRiderLocation(id: string, isTrip: boolean, trackable: boolean, outForDelivery: boolean) {
  const queryClient = useQueryClient();
  const customerId = useAuthStore(state => state.customerId);
  const focused = useIsFocused();
  const foreground = useAppForeground();
  const enabled = trackable && focused && foreground && !!customerId;
  const locationKey = [isTrip ? 'trip-rider-location' : 'order-rider-location', id, customerId] as const;
  const query = useQuery({
    queryKey: [...locationKey, outForDelivery],
    placeholderData: outForDelivery
      ? () => queryClient.getQueryData<RiderLocationResponse>([...locationKey, false])
      : undefined,
    queryFn: () => (isTrip ? fetchTripRiderLocation(id) : fetchOrderRiderLocation(id)),
    enabled,
    retry,
    staleTime: outForDelivery ? 0 : 60_000,
    // A position is only useful live; don't resurrect an old one later.
    gcTime: 60_000,
    refetchInterval: enabled && outForDelivery ? RIDER_LOCATION_POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
  const { active, pickup, destination } = query.data ?? {};
  const route = useQuery({
    queryKey: ['delivery-route', isTrip, id, customerId, pickup?.lat, pickup?.lng, destination?.lat, destination?.lng],
    enabled: enabled && outForDelivery && CAN_SHOW_ROAD_ROUTE && !!active && !!pickup && !!destination,
    queryFn: async ({ signal }) => {
      const result = await fetchDeliveryRoute(id, isTrip, signal);
      // A different store leg may become active while this request is pending.
      if (!result.active || result.pickup?.lat !== pickup?.lat || result.pickup?.lng !== pickup?.lng
        || result.destination?.lat !== destination?.lat || result.destination?.lng !== destination?.lng) {
        return null;
      }
      return result.route && result.route.length >= 2 ? result.route : null;
    },
    staleTime: query => query.state.data ? Infinity : ROUTE_RETRY_MS,
    // A temporary failure gets one automatic retry. Once we have geometry,
    // GPS updates leave it alone.
    refetchInterval: query => {
      const { data, dataUpdateCount, errorUpdateCount } = query.state;
      return !data && dataUpdateCount + errorUpdateCount === 1 ? ROUTE_RETRY_MS : false;
    },
    refetchIntervalInBackground: false,
    gcTime: 0,
    retry: false,
  });
  return {
    data: trackable ? query.data : undefined,
    route: trackable && outForDelivery && active ? route.data : undefined,
    fetchedAt: query.dataUpdatedAt,
  };
}
