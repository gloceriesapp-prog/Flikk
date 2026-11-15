import { colors } from '../../theme/tokens';
import { purchaseHistoryOptions } from '../../features/purchases/historyQuery';
import { PurchaseLoadingMessage } from './loading/PurchaseLoadingMessage';
import { useAuthStore } from '../../store/useAuthStore';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { ScreenStatusBar as StatusBar } from '../../components/ScreenStatusBar';
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, AppState, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { FlashList, type FlashListProps } from '@shopify/flash-list';
import { AppImage as Image } from '../../components/AppImage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { fetchAccountInfo } from '../../api/auth';
import { fetchOrderHistoryStatuses, type OrderHistoryPage } from '../../api/orders';
import { groupOrdersByTrip } from '../../utils/tripLegs';
import { mapOrderGroup, type PurchaseOrder } from './data';
import { OrderRow } from './components/OrderRow';
import { OrderFilterSheet, type OrderStatusFilter, type OrderTimeFilter } from './components/OrderFilterSheet';
import { PurchaseRecommendations } from './components/PurchaseRecommendations';
import { PurchaseHistoryHeader } from './components/PurchaseHistoryHeader';
import { HomeSectionButton } from '../home/components/HomeSectionButton';
import { usePurchaseClock } from './usePurchaseClock';
import { getPurchaseArrivalDeadline } from './orderArrival';
import type { AppStackParamList } from '../../navigation/types';
import { GILROY } from '../../theme/fonts';
import { useCopy } from '../../api/appConfig';

type Props = NativeStackScreenProps<AppStackParamList, 'Purchase'>;

const FEATURE_IMAGE_URI = 'https://images.gloceries.com/appsui/no-order.webp';
const ORDER_STATUS_REFRESH_MS = 8_000;
const ORDER_PREVIEW_LIMIT = 4;

const styles = StyleSheet.create({
  orderDivider: { height: 1, marginHorizontal: 16, backgroundColor: colors.divider },
});

function isLive(status: string): boolean {
  return status === 'placed' || status === 'packed' || status === 'out_for_delivery';
}

// Reanimated-driven FlashList: plain FlashList can't take useAnimatedScrollHandler's
// worklet onScroll, and the lib's own AnimatedFlashList wraps RN's Animated (not
// reanimated) and is typed <any>. Re-apply the PurchaseOrder generic the cast erases.
const AnimatedOrderList = Animated.createAnimatedComponent(
  FlashList as unknown as ComponentType<FlashListProps<PurchaseOrder>>,
);

export function PurchaseScreen({ navigation }: Props) {
  const client = useQueryClient();
  const customerId = useAuthStore(state => state.customerId);
  const emptyTitle = useCopy('orders.empty.title');
  const isFocused = useIsFocused();
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setIsForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [filterReferenceTime, setFilterReferenceTime] = useState(Date.now);
  const [timeFilter, setTimeFilter] = useState<OrderTimeFilter>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  const baseHistoryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (timeFilter === 'last_30_days') params.set('from', new Date(filterReferenceTime - 30 * 86400000).toISOString());
    else if (typeof timeFilter === 'number') {
      params.set('from', `${timeFilter}-01-01T00:00:00+05:30`);
      params.set('until', `${timeFilter + 1}-01-01T00:00:00+05:30`);
    }
    return params;
  }, [debouncedQuery, timeFilter, filterReferenceTime]);
  const historyParams = useMemo(() => {
    if (statusFilter === 'all') return baseHistoryParams;
    const params = new URLSearchParams(baseHistoryParams);
    params.set('status', statusFilter === 'on_the_way' ? 'out_for_delivery' : statusFilter);
    return params;
  }, [baseHistoryParams, statusFilter]);
  const history = useInfiniteQuery({
    ...purchaseHistoryOptions(customerId, historyParams),
    // Preview cached matches while the filtered page loads. The cache must
    // belong to the same customer, search term, and date range.
    placeholderData: statusFilter === 'all' ? undefined : () => client.getQueryData<InfiniteData<OrderHistoryPage, string>>(
      purchaseHistoryOptions(customerId, baseHistoryParams).queryKey,
    ),
  });
  const rawOrders = useMemo(() => [...new Map((history.data?.pages.flatMap(page => page.items) ?? []).map(order => [order.id, order])).values()], [history.data]);
  const liveIds = useMemo(() => rawOrders.filter(order => isLive(order.status)).map(order => order.id).sort(), [rawOrders]);
  const live = useQuery({
    queryKey: ['purchase-live', customerId, liveIds],
    queryFn: () => fetchOrderHistoryStatuses(liveIds),
    enabled: !!customerId && isFocused && isForeground && !history.isPlaceholderData && liveIds.length > 0,
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
    const orders = rawOrders.map(order => {
      const update = statuses.get(order.id);
      return update && (update.live_revision ?? 0) >= (order.live_revision ?? 0) ? { ...order, ...update } : order;
    });
    return groupOrdersByTrip(orders).map(mapOrderGroup);
  }, [rawOrders, live.data]);
  const refetch = history.refetch;

  // Real account creation date (GET /auth/me's created_at) — OrderFilterSheet's
  // own "Order time" year list runs from the current year down to this,
  // never a hardcoded lookback window a brand-new account couldn't have
  // orders spanning.
  const { data: accountInfo } = useQuery({
    queryKey: ['account-info', customerId],
    queryFn: fetchAccountInfo,
    enabled: !!customerId && isFilterSheetOpen,
  });
  const accountCreatedYear = accountInfo ? new Date(accountInfo.created_at).getFullYear() : new Date().getFullYear();

  const [showAll, setShowAll] = useState(false);

  // Refresh on entry; active orders also refresh while this screen is
  // visible so packing changes to arriving after the rider marks pickup.
  useEffect(() => {
    if (isFocused && isForeground && customerId) {
      // Fresh cached results appear immediately; stale results remain visible
      // while a deduplicated refresh runs. Do not force/cancel warmup reads.
      void client.fetchInfiniteQuery(purchaseHistoryOptions(customerId, historyParams)).catch(() => {});
    }
  }, [isFocused, isForeground, client, customerId, historyParams]);

  const arrivalDeadlines = useMemo(() => fetchedOrders
    .map(getPurchaseArrivalDeadline)
    .filter((deadline): deadline is number => deadline !== null), [fetchedOrders]);
  const now = usePurchaseClock(arrivalDeadlines);

  const isFilterActive = statusFilter !== 'all' || timeFilter !== 'all';
  const isSearching = debouncedQuery.length > 0 || isFilterActive;
  const sortedOrders = useMemo(() => {
    // The API applies search and date filters. Recheck the status because
    // live polling can advance an order after the history page was loaded.
    const status = statusFilter === 'on_the_way' ? 'out_for_delivery' : statusFilter;
    return fetchedOrders
      .filter(order => status === 'all' || order.status === status)
      .sort((a, b) => Number(isLive(b.status)) - Number(isLive(a.status)) || Date.parse(b.placedAtIso) - Date.parse(a.placedAtIso));
  }, [fetchedOrders, statusFilter]);
  const visibleOrders = showAll ? sortedOrders : sortedOrders.slice(0, ORDER_PREVIEW_LIMIT);
  const canLoadMore = !history.isPlaceholderData && history.hasNextPage;
  const hasMoreOrders = sortedOrders.length > ORDER_PREVIEW_LIMIT || canLoadMore;
  const waitingForOrders = !!customerId && !history.isError &&
    (!history.data || (history.isPlaceholderData && visibleOrders.length === 0));

  function loadMoreOrders() {
    if (canLoadMore && !history.isFetching) void history.fetchNextPage({ cancelRefetch: false });
  }

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
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />

      <AnimatedOrderList
        data={visibleOrders}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 112 }}
        keyExtractor={(order) => order.orderId}
        onEndReached={showAll && !history.isFetchNextPageError ? loadMoreOrders : undefined}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <PurchaseHistoryHeader
            status={statusFilter}
            onSelectStatus={setStatusFilter}
            onHelp={() => navigation.navigate('Support')}
            search={customerId ? {
              value: query,
              onChangeText: setQuery,
              onOpenFilter: () => {
                Keyboard.dismiss();
                setIsFilterSheetOpen(true);
              },
              isFilterActive,
            } : null}
          />
        }
        ListEmptyComponent={
          waitingForOrders ? (
            <PurchaseLoadingMessage />
          ) : history.isError && !history.data ? (
            <View className="items-center gap-3 py-16">
              <Text className="text-ink">Couldn’t load your purchases.</Text>
              <Pressable onPress={() => { void refetch(); }}><Text className="font-semibold text-[#155DFC]">Try again</Text></Pressable>
            </View>
          ) : (
            <View className="px-0">
              <View>
                <Image source={{ uri: FEATURE_IMAGE_URI }} accessibilityLabel="No orders yet"
                  className="mt-6 h-56 w-full self-center" style={{ maxWidth: 280, opacity: 0.75 }} resizeMode="contain" />
                <Text className="mt-5 px-8 text-center text-[17px] font-semibold text-ink">{emptyTitle}</Text>
                <Text className="mt-2 px-8 text-center"
                  style={{ fontFamily: GILROY.medium, fontSize: 14, lineHeight: 21, color: '#59645F' }}>
                  {isSearching
                    ? 'No orders in this view yet.\nTry another tab or change your filters.'
                    : 'Your orders will appear here\nafter your first purchase.'}
                </Text>
              </View>

            </View>
          )
        }
        ListFooterComponent={
          <View className="bg-white">
            {!showAll && hasMoreOrders && (
              <HomeSectionButton label="See all orders" plain onPress={() => {
                setShowAll(true);
                if (sortedOrders.length <= ORDER_PREVIEW_LIMIT) loadMoreOrders();
              }} />
            )}
            {showAll && history.isFetchingNextPage && <ActivityIndicator className="py-4" color="#155DFC" />}
            {showAll && canLoadMore && !history.isFetchingNextPage && (
              <HomeSectionButton label={history.isFetchNextPageError ? 'Retry loading orders' : 'Load more orders'} plain onPress={loadMoreOrders} />
            )}
            <View className="mt-4"><PurchaseRecommendations /></View>
            {!waitingForOrders && !history.isError && !isSearching && visibleOrders.length === 0 && (
              <Text className="mt-8 px-6 pb-8 text-left text-[25px] font-semibold leading-8 text-gray-500">
                You&apos;re not just ordering. You&apos;re keeping local shops open. 🌾
              </Text>
            )}
            {(visibleOrders.length > 0 || isSearching) && (
              <View className="mt-8 gap-2 px-6 pb-44 pt-10">
                <Text className="text-5xl font-bold tracking-tight text-ink/10">Every order, a small win.</Text>
                <Text className="text-sm font-medium text-ink/50">#GloceriesApp</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item: order }) => (
          <View>
            <OrderRow
              order={order}
              now={now}
              onPress={() => navigation.navigate('TrackOrder', {
                orderId: order.orderId, paymentMethodLabel: '', isTrip: order.isTrip,
              })}
            />
            <View pointerEvents="none" style={styles.orderDivider} />
          </View>
        )}
      />

      <BottomNavBar hidden={navHidden} />

      <OrderFilterSheet
        visible={isFilterSheetOpen}
        statusValue={statusFilter}
        timeValue={timeFilter}
        accountCreatedYear={accountCreatedYear}
        onSelectStatus={setStatusFilter}
        onSelectTime={(filter) => {
          if (filter === 'last_30_days') setFilterReferenceTime(Date.now());
          setTimeFilter(filter);
        }}
        onClose={() => setIsFilterSheetOpen(false)}
      />
    </View>
  );
}
