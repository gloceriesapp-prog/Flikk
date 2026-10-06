import { useAuthStore } from '../../../store/useAuthStore';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOrder } from '../../../api/orders';
import { fetchTrip } from '../../../api/trips';
import { fetchOrderLive, fetchTripLive } from '../../../api/tracking';
import { trackingState } from './trackingState';
import { liveFinished, mergeOrder, mergeTrip, needsOrderDetails, needsTripDetails, trackingInterval, detailRefreshKey, DetailRefreshGate, orderCanAdvance, tripCanAdvance } from './liveTracking';
const retry = (count: number, error: unknown) => count < 1 && ![401, 403, 404, 410].includes((error as { status?: number }).status ?? 0);
export function useTracking(id: string, isTrip: boolean) {
  const customerId = useAuthStore(state => state.customerId);
  const focused = useIsFocused();
  // Keep the jitter stable across ETA/countdown rerenders. A fresh random
  // interval on every render continually resets React Query's poll timer.
  const [pollInterval] = useState(trackingInterval);
  const client = useQueryClient();
  const [foreground, setForeground] = useState(AppState.currentState == null || AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);
  const enabled = focused && foreground && !!customerId;
  // Shared full details remain compatible with order summary/cancellation.
  // They are not polled; remounts reuse them within the freshness window.
  const orderQuery = useQuery({ queryKey: ['order', id, customerId], queryFn: () => fetchOrder(id),
    enabled: enabled && !isTrip, retry, staleTime: 300_000, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const tripQuery = useQuery({ queryKey: ['trip', id, customerId], queryFn: () => fetchTrip(id),
    enabled: enabled && isTrip, retry, staleTime: 300_000, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const orderLive = useQuery({ queryKey: ['order-live', id, customerId], queryFn: () => fetchOrderLive(id),
    enabled: enabled && !isTrip && !!orderQuery.data, retry, staleTime: 0,
    refetchInterval: q => !enabled || (q.state.data && liveFinished(mergeOrder(orderQuery.data, q.state.data) ?? q.state.data)) ? false : pollInterval,
    refetchIntervalInBackground: false });
  const tripLive = useQuery({ queryKey: ['trip-live', id, customerId], queryFn: () => fetchTripLive(id),
    enabled: enabled && isTrip && !!tripQuery.data, retry, staleTime: 0,
    refetchInterval: q => !enabled || (q.state.data && liveFinished(mergeTrip(tripQuery.data, q.state.data) ?? q.state.data)) ? false : pollInterval,
    refetchIntervalInBackground: false });
  const attemptedDetailRefresh = useRef(new DetailRefreshGate());
  const orderDetails = orderQuery.data; const tripDetails = tripQuery.data;
  const orderStatus = orderLive.data; const tripStatus = tripLive.data;
  const orderFetching = orderQuery.isFetching; const tripFetching = tripQuery.isFetching;
  const refreshOrder = orderQuery.refetch; const refreshTrip = tripQuery.refetch;
  const orderLiveUpdatedAt = orderLive.dataUpdatedAt; const tripLiveUpdatedAt = tripLive.dataUpdatedAt;
  // Depend on stable data/refetch fields rather than complete observer objects.
  // A changed rider/leg set requests details once, with bounded failure retry.
  useEffect(() => {
    if (!enabled) return;
    const key = detailRefreshKey(id, customerId, isTrip, isTrip ? tripLiveUpdatedAt : orderLiveUpdatedAt);
    const needsDetails = isTrip ? needsTripDetails(tripDetails, tripStatus) : needsOrderDetails(orderDetails, orderStatus);
    if (attemptedDetailRefresh.current.allow(key, needsDetails, isTrip ? tripFetching : orderFetching))
      void (isTrip ? refreshTrip() : refreshOrder());
  }, [enabled, id, customerId, isTrip, orderLiveUpdatedAt, tripLiveUpdatedAt, orderDetails, tripDetails,
    orderStatus, tripStatus, orderFetching, tripFetching, refreshOrder, refreshTrip]);
  const order = mergeOrder(orderDetails, orderStatus);
  const trip = mergeTrip(tripDetails, tripStatus);
  const detailsQuery = isTrip ? tripQuery : orderQuery;
  const liveQuery = isTrip ? tripLive : orderLive;
  // Advance the shared static cache without downloading full joins again.
  useEffect(() => {
    if (!enabled) return;
    if (!isTrip && orderStatus && orderCanAdvance(orderDetails, orderStatus) && !needsOrderDetails(orderDetails, orderStatus))
      client.setQueryData(['order', id, customerId], current => mergeOrder(current as typeof orderDetails, orderStatus));
    if (isTrip && tripStatus && tripCanAdvance(tripDetails, tripStatus) && !needsTripDetails(tripDetails, tripStatus))
      client.setQueryData(['trip', id, customerId], current => mergeTrip(current as typeof tripDetails, tripStatus));
  }, [enabled, isTrip, id, customerId, client, orderStatus, tripStatus, orderDetails, tripDetails]);
  return { order, trip,
    refetch: () => detailsQuery.data ? liveQuery.refetch() : detailsQuery.refetch(),
    fetching: detailsQuery.isFetching || liveQuery.isFetching,
    updatedAt: liveQuery.dataUpdatedAt || detailsQuery.dataUpdatedAt,
    state: trackingState({ hasData: !!detailsQuery.data, empty: isTrip && trip?.orders?.length === 0,
      pending: detailsQuery.isPending, paused: detailsQuery.fetchStatus === 'paused' || liveQuery.fetchStatus === 'paused',
      error: detailsQuery.error || liveQuery.error }) };
}
