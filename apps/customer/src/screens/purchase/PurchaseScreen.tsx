import { purchaseHistoryOptions } from '../../features/purchases/historyQuery';
import { PurchaseLoadingMessage } from './loading/PurchaseLoadingMessage';
import { useAuthStore } from '../../store/useAuthStore';
// "Purchase" tab (was "Order Again" in the bottom nav). Reached from
// BottomNavBar — see src/components/BottomNavBar/data.ts. BottomNavBar
// itself renders here too now (a sibling of the ScrollView, same pattern
// HomeScreen.tsx uses — floats fixed in place while the page scrolls
// underneath it), so the tab bar stays reachable from Purchase instead of
// only from Home; Purchase History stays centered above the order search.
//
// Real order history now — GET /orders (api/orders.ts), not the old
// LIVE_ORDER/PAST_ORDERS placeholder dataset. "Live" is any order not yet
// delivered/cancelled (placed/packed/out_for_delivery); everything else is
// "Past" — that distinction still drives sort order and OrderStatusFilter,
// but per an explicit ask it's no longer two separately-headed sections
// ("Live Order" / "Past Orders") with different card designs. One flat
// list (OrderRow.tsx) now, sorted current-on-top/done-at-bottom
// (sortedOrders below) — a plain row (photo, status, items, chevron), no
// card background/gradient, no per-row CTA button; the whole row is the
// tap target for live orders (wired to TrackOrder), inert for past ones.
//
// Header: "Purchase History" stays centered without a global-search action.
// PurchaseSearchBar (real search + Filter button) sits directly below it —
// only once there's actually something to search/filter (hasAnyOrder),
// not on the empty state. Search matches store name or any item name
// (both already on PurchaseOrder, no extra fetch); the Filter button opens
// OrderFilterSheet's two independent sections — order status (On the way/
// Delivered/Cancelled) and order time (Last 30 days, then one entry per
// real calendar year back to the account's own creation year, from GET
// /auth/me's created_at).

import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { AppState, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppImage as Image } from '../../components/AppImage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { fetchAccountInfo } from '../../api/auth';
import { fetchOrderHistoryStatuses } from '../../api/orders';
import { groupOrdersByTrip } from '../../utils/tripLegs';
import { mapOrderGroup } from './data';
import { OrderRow } from './components/OrderRow';
import { OrderFilterSheet, type OrderStatusFilter, type OrderTimeFilter } from './components/OrderFilterSheet';
import { PurchaseRecommendations } from './components/PurchaseRecommendations';
import { PurchaseSearchBar } from './components/PurchaseSearchBar';
import { COMPLETED_ORDER_PREVIEW_ID, createCompletedOrderPreview } from './preview/completedOrder';
import { usePurchaseClock } from './usePurchaseClock';
import { getPurchaseArrivalDeadline } from './orderArrival';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Purchase'>;

const FEATURE_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/order-not-found.png';
const ORDER_STATUS_REFRESH_MS = 8_000;

function isLive(status: string): boolean {
  return status === 'placed' || status === 'packed' || status === 'out_for_delivery';
}

export function PurchaseScreen({ navigation }: Props) {
  const client = useQueryClient();
  const customerId = useAuthStore(state => state.customerId);
  const isFocused = useIsFocused();
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setIsForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [filterReferenceTime] = useState(Date.now);
  const [timeFilter, setTimeFilter] = useState<OrderTimeFilter>('all');
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  const historyParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter === 'on_the_way' ? 'out_for_delivery' : statusFilter);
    if (timeFilter === 'last_30_days') params.set('from', new Date(filterReferenceTime - 30 * 86400000).toISOString());
    else if (typeof timeFilter === 'number') {
      params.set('from', `${timeFilter}-01-01T00:00:00+05:30`);
      params.set('until', `${timeFilter + 1}-01-01T00:00:00+05:30`);
    }
    return params;
  }, [debouncedQuery, statusFilter, timeFilter, filterReferenceTime]);
  const history = useInfiniteQuery(purchaseHistoryOptions(customerId, historyParams));
  const rawOrders = useMemo(() => [...new Map((history.data?.pages.flatMap(page => page.items) ?? []).map(order => [order.id, order])).values()], [history.data]);
  const liveIds = useMemo(() => rawOrders.filter(order => isLive(order.status)).map(order => order.id).sort(), [rawOrders]);
  const live = useQuery({
    queryKey: ['purchase-live', customerId, liveIds],
    queryFn: () => fetchOrderHistoryStatuses(liveIds),
    enabled: !!customerId && isFocused && isForeground && liveIds.length > 0,
    refetchInterval: query => isFocused && isForeground && query.state.data?.some(row => isLive(row.status)) ? ORDER_STATUS_REFRESH_MS : false,
    // The first history page already contains the same live snapshot.
    initialData: () => rawOrders.filter(order => isLive(order.status)),
    initialDataUpdatedAt: history.dataUpdatedAt,
    staleTime: ORDER_STATUS_REFRESH_MS,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  });
  const fetchedOrders = useMemo(() => {
    const statuses = new Map((live.data ?? []).map(row => [row.id, row]));
    return groupOrdersByTrip(rawOrders.map(order => {
      const update = statuses.get(order.id);
      return update && (update.live_revision ?? 0) >= (order.live_revision ?? 0) ? { ...order, ...update } : order;
    })).map(mapOrderGroup);
  }, [rawOrders, live.data]);
  const refetch = history.refetch;

  // Real account creation date (GET /auth/me's created_at) — OrderFilterSheet's
  // own "Order time" year list runs from the current year down to this,
  // never a hardcoded lookback window a brand-new account couldn't have
  // orders spanning.
  const { data: accountInfo } = useQuery({ queryKey: ['account-info', customerId], queryFn: fetchAccountInfo });
  const accountCreatedYear = accountInfo ? new Date(accountInfo.created_at).getFullYear() : new Date().getFullYear();

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [previewOrder] = useState(() => __DEV__ ? createCompletedOrderPreview() : null);
  const waitingForFirstOrders = !history.isError && (history.isPending || (history.isFetching && rawOrders.length === 0));
  const displayOrders = useMemo(() => previewOrder && history.data && !waitingForFirstOrders
    ? [...(fetchedOrders ?? []), previewOrder]
    : fetchedOrders ?? [], [fetchedOrders, previewOrder, history.data, waitingForFirstOrders]);
  const VISIBLE_ORDER_LIMIT = 5;

  // Refresh on entry; active orders also refresh while this screen is
  // visible so packing changes to arriving after the rider marks pickup.
  useEffect(() => {
    if (isFocused && isForeground && customerId) {
      // Fresh cached results appear immediately; stale results remain visible
      // while a deduplicated refresh runs. Do not force/cancel warmup reads.
      void client.fetchInfiniteQuery(purchaseHistoryOptions(customerId, historyParams)).catch(() => {});
    }
  }, [isFocused, isForeground, client, customerId, historyParams]);

  const arrivalDeadlines = useMemo(() => (fetchedOrders ?? [])
    .map(getPurchaseArrivalDeadline)
    .filter((deadline): deadline is number => deadline !== null), [fetchedOrders]);
  const now = usePurchaseClock(arrivalDeadlines);

  const hasAnyOrder = displayOrders.length > 0 || debouncedQuery.length > 0 || statusFilter !== 'all' || timeFilter !== 'all';

  // Order status and order time are two independent filters (both can be
  // active at once, e.g. "Delivered" + "2025") — matches OrderFilterSheet's
  // own two separate sections, not one combined picker.
  function matchesStatusFilter(status: string): boolean {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'on_the_way') return status === 'out_for_delivery';
    return status === statusFilter;
  }

  function matchesTimeFilter(placedAtIso: string): boolean {
    if (timeFilter === 'all') return true;
    const placedAt = new Date(placedAtIso);
    if (timeFilter === 'last_30_days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return placedAt >= thirtyDaysAgo;
    }
    return placedAt.getFullYear() === timeFilter;
  }

  const filteredOrders = useMemo(() => {
    const trimmedQuery = debouncedQuery.toLowerCase();
    return displayOrders.filter((order) => {
      if (!matchesStatusFilter(order.status)) return false;
      if (!matchesTimeFilter(order.placedAtIso)) return false;
      if (!trimmedQuery) return true;
      return (
        order.storeName.toLowerCase().includes(trimmedQuery) ||
        order.items.some((item) => item.name.toLowerCase().includes(trimmedQuery))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayOrders, debouncedQuery, statusFilter, timeFilter]);

  // One flat list now, not separate Live/Past sections — current
  // (not-yet-delivered) orders sorted to the top, done ones to the
  // bottom, and newest-placed-first within each of those two groups (an
  // order placed 2 minutes ago belongs above one placed yesterday
  // regardless of which the API happened to return first).
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const liveDiff = Number(isLive(b.status)) - Number(isLive(a.status));
    if (liveDiff !== 0) return liveDiff;
    return new Date(b.placedAtIso).getTime() - new Date(a.placedAtIso).getTime();
  });
  const hasFilteredResults = sortedOrders.length > 0;
  const matchingPreview = sortedOrders.find((order) => order.orderId === COMPLETED_ORDER_PREVIEW_ID);
  // Keep the requested sample visible even when live orders fill the
  // collapsed list. View more still reveals every real order normally.
  const visibleOrders = showAllOrders
    ? sortedOrders
    : matchingPreview
      ? [...sortedOrders.filter((order) => order.orderId !== COMPLETED_ORDER_PREVIEW_ID).slice(0, VISIBLE_ORDER_LIMIT - 1), matchingPreview]
      : sortedOrders.slice(0, VISIBLE_ORDER_LIMIT);
  const hasMoreOrders = sortedOrders.length > visibleOrders.length || Boolean(history.hasNextPage);

  // Same direction-based hide/show BottomNavBar logic as StoreListScreen.tsx
  // (itself copied from HomeScreen.tsx) — direction-based, not a plain
  // "scrolled past N px", so it reads as intentional here too.
  const prevScrollY = useSharedValue(0);
  const navHidden = useSharedValue(0);
  const SCROLL_HIDE_THRESHOLD = 6;

  const scrollHandler = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;

    const delta = y - prevScrollY.value;
    if (y < 40) {
      navHidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else if (delta > SCROLL_HIDE_THRESHOLD) {
      navHidden.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else if (delta < -SCROLL_HIDE_THRESHOLD) {
      navHidden.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
    prevScrollY.value = y;
  });

  return (
    <View className="flex-1 bg-[#F8F8F8] pt-safe">
      {/* Plain background again — no gradient header (PurchaseHeader.tsx,
          deleted) to keep light icons legible against. */}
      <StatusBar style="dark" />

      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow pb-28"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        stickyHeaderIndices={hasAnyOrder ? [1] : []}
      >
        {/* Title scrolls away; only the following search row stays pinned
            beneath the status bar, with an opaque surface behind it. */}
        <View className="px-6 pb-1 pt-3">
          <View className="h-10 items-center justify-center">
            <Text accessibilityRole="header" className="text-center text-[20px] font-bold text-ink">Purchase History</Text>
          </View>
        </View>
        {hasAnyOrder && (
          <View className="bg-[#F8F8F8] px-6 py-3">
            <PurchaseSearchBar
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setShowAllOrders(false);
              }}
              onOpenFilter={() => setIsFilterSheetOpen(true)}
              isFilterActive={statusFilter !== 'all' || timeFilter !== 'all'}
            />
          </View>
        )}

        {waitingForFirstOrders ? (
          <PurchaseLoadingMessage />
        ) : history.isError && !history.data ? (
          <View className="items-center gap-3 py-16">
            <Text className="text-ink">Couldn’t load your purchases.</Text>
            <Pressable onPress={() => { void refetch(); }}><Text className="font-semibold text-[#155DFC]">Try again</Text></Pressable>
          </View>
        ) : hasAnyOrder && !hasFilteredResults ? (
          <View className="flex-1 items-center justify-center gap-1 px-10 py-24">
            <Text className="text-center text-base font-semibold text-ink">No matching orders</Text>
            <Text className="text-center text-sm text-ink/50">Try a different search or filter.</Text>
          </View>
        ) : hasAnyOrder ? (
          <View className="px-6 pt-3">
            {visibleOrders.map((order) => (
              <OrderRow
                key={order.orderId}
                order={order}
                now={now}
                previewOnly={order.orderId === COMPLETED_ORDER_PREVIEW_ID}
                // Every order opens Track Order now, live or finished —
                // the card itself no longer shows an items list inline
                // (an explicit ask), so this is the only place left to
                // see what was actually in a past order too, not just a
                // live one. TrackOrderScreen's own timeline already reads
                // fine for a terminal (delivered/cancelled) status.
                onPress={() => {
                  if (order.orderId === COMPLETED_ORDER_PREVIEW_ID) return;
                  navigation.navigate('TrackOrder', { orderId: order.orderId, paymentMethodLabel: 'UPI', isTrip: order.isTrip });
                }}
              />
            ))}

            {hasMoreOrders ? (
              <Pressable
                disabled={history.isFetchingNextPage}
                onPress={() => { setShowAllOrders(true); if (showAllOrders || sortedOrders.length <= visibleOrders.length) void history.fetchNextPage(); }}
                className="mb-1 items-center rounded-xl  bg-[#FFFFFF] border border-[#E8E8E8] py-3.5 "
              >
                <Text className="text-[14px] font-semibold text-ink">
                  {history.isFetchingNextPage ? 'Loading…' : history.isFetchNextPageError ? 'Retry loading more' : 'View more orders'}
                </Text>
              </Pressable>
            ) : (
              showAllOrders &&
              sortedOrders.length > VISIBLE_ORDER_LIMIT && (
                <Pressable
                  onPress={() => setShowAllOrders(false)}
                  className="mb-1 items-center rounded-full border border-ink/10 bg-white py-3.5 shadow-sm shadow-black/5"
                >
                  <Text className="text-[14px] font-semibold text-ink">View less</Text>
                </Pressable>
              )
            )}

            <PurchaseRecommendations />

            <View className="mt-8 gap-2 pb-44 pt-10">
              <Text className="text-5xl font-bold tracking-tight text-ink/10">Every order, a small win.</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-medium text-ink/50">#GloceriesApp</Text>
                {/* <AppIcon icon={HeartIcon} size={14} color={colors.danger} fill={colors.danger} />
                <Text className="text-sm font-medium text-ink/50">for your neighborhood</Text> */}
              </View>
            </View>

            {/* <BrandFooter /> */}
          </View>
        ) : (
          <View className="flex-grow justify-between">
            <View>
              <Image source={{ uri: FEATURE_IMAGE_URI }} className="mt-6 aspect-[4/5] w-3/5 self-center" resizeMode="cover" />
              <Text className="mt-5 px-8 text-center text-[17px] font-semibold text-ink">No orders yet.</Text>
              <Text className="mt-1 px-8 text-center text-sm font-medium text-ink/50">
                Looks like you haven&apos;t placed orders yet.
              </Text>
            </View>

            <Text className="px-6 text-left text-[25px] font-semibold leading-8 text-gray-500">
              You&apos;re not just ordering. You&apos;re keeping
              local shops open. 🌾
            </Text>
          </View>
        )}
      </Animated.ScrollView>

      <BottomNavBar hidden={navHidden} />

      <OrderFilterSheet
        visible={isFilterSheetOpen}
        statusValue={statusFilter}
        timeValue={timeFilter}
        accountCreatedYear={accountCreatedYear}
        onSelectStatus={(filter) => {
          setStatusFilter(filter);
          setShowAllOrders(false);
        }}
        onSelectTime={(filter) => {
          setTimeFilter(filter);
          setShowAllOrders(false);
        }}
        onClose={() => setIsFilterSheetOpen(false)}
      />
    </View>
  );
}
