// "Purchase" tab (was "Order Again" in the bottom nav). Reached from
// BottomNavBar — see src/components/BottomNavBar/data.ts. BottomNavBar
// itself renders here too now (a sibling of the ScrollView, same pattern
// HomeScreen.tsx uses — floats fixed in place while the page scrolls
// underneath it), so the tab bar stays reachable from Purchase instead of
// only from Home; the "Purchase" header above stays exactly as it was.
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
// Header redesign, same earlier ask: "Purchase" title stays centered,
// PurchaseSearchBar (real search + filter icon) sits directly below it —
// only once there's actually something to search/filter (hasAnyOrder),
// not on the empty state. Search matches store name or any item name
// (both already on PurchaseOrder, no extra fetch); the filter icon opens
// OrderStatusFilterSheet (All/Live/Past), a real filter over the same
// status field the sort above uses.

import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { HeartIcon } from '@hugeicons/core-free-icons';
import { AppImage as Image } from '../../components/AppImage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { BrandFooter } from '../../components/BrandFooter';
import { colors } from '../../theme/tokens';
import { fetchMyOrders } from '../../api/orders';
import { mapApiOrder } from './data';
import { OrderRow } from './components/OrderRow';
import { OrderStatusFilterSheet, type OrderStatusFilter } from './components/OrderStatusFilterSheet';
import { PurchaseBestSellers, type BestSellerItem } from './components/PurchaseBestSellers';
import { PurchaseHeader } from './components/PurchaseHeader';
import { PurchaseSearchBar } from './components/PurchaseSearchBar';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Purchase'>;

const FEATURE_IMAGE_URI = 'https://i.pinimg.com/1200x/a1/dc/37/a1dc376c96e834e7ae7baf401202b79a.jpg';

export function PurchaseScreen({ navigation }: Props) {
  const { data: fetchedOrders, isLoading, refetch } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => (await fetchMyOrders()).map(mapApiOrder),
  });

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const VISIBLE_ORDER_LIMIT = 5;

  // Purchase is reached repeatedly across a session (Home tab bar, after
  // checkout, etc.) — refetching on every focus keeps a live order's
  // status current without needing a polling interval on a screen that
  // isn't even open most of the time (TrackOrderScreen's own note on why
  // it polls instead — it's the screen actually being watched).
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => void refetch());
    return unsubscribe;
  }, [navigation, refetch]);

  const isLive = (status: string) => status === 'placed' || status === 'packed' || status === 'out_for_delivery';

  const hasAnyOrder = (fetchedOrders ?? []).length > 0;

  const filteredOrders = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    return (fetchedOrders ?? []).filter((order) => {
      const matchesFilter =
        statusFilter === 'all' || (statusFilter === 'live' ? isLive(order.status) : !isLive(order.status));
      if (!matchesFilter) return false;
      if (!trimmedQuery) return true;
      return (
        order.storeName.toLowerCase().includes(trimmedQuery) ||
        order.items.some((item) => item.name.toLowerCase().includes(trimmedQuery))
      );
    });
  }, [fetchedOrders, query, statusFilter]);

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
  const visibleOrders = showAllOrders ? sortedOrders : sortedOrders.slice(0, VISIBLE_ORDER_LIMIT);
  const hasMoreOrders = sortedOrders.length > visibleOrders.length;

  // "Your Best Sellers" — tallied from every real past order (not just the
  // filtered/paged list above), ranked by total quantity ever ordered, top
  // 6. A real personal signal (what this customer actually reorders), not
  // a fabricated store-wide "bestseller" flag.
  const bestSellers = useMemo(() => {
    const tally = new Map<string, BestSellerItem>();
    for (const order of fetchedOrders ?? []) {
      for (const item of order.items) {
        const existing = tally.get(item.name);
        if (existing) {
          existing.timesOrdered += item.quantity;
        } else {
          tally.set(item.name, { ...item, timesOrdered: item.quantity });
        }
      }
    }
    return [...tally.values()].sort((a, b) => b.timesOrdered - a.timesOrdered).slice(0, 6);
  }, [fetchedOrders]);

  // Same direction-based hide/show BottomNavBar logic as StoreListScreen.tsx
  // (itself copied from HomeScreen.tsx) — direction-based, not a plain
  // "scrolled past N px", so it reads as intentional here too.
  const scrollY = useSharedValue(0);
  const prevScrollY = useSharedValue(0);
  const navHidden = useSharedValue(0);
  const SCROLL_HIDE_THRESHOLD = 6;

  const scrollHandler = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    scrollY.value = y;

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
    <View className="flex-1 bg-[#FCFCFB]">
      {/* This screen's own header is dark now (PurchaseHeader), same
          reasoning as HomeScreen/StoreListScreen's own "light" override. */}
      <StatusBar style="light" />

      {/* PurchaseHeader is item 0 inside this same ScrollView with
          stickyHeaderIndices={[0]} — same mechanism StoreHeader.tsx uses
          (drag down: header collapses to just the search bar, blur shows
          through, search bar stays pinned at top). */}
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow pb-28"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        <PurchaseHeader
          onChangeLocation={() => navigation.navigate('SelectLocation')}
          scrollY={scrollY}
          searchBar={
            hasAnyOrder ? (
              <PurchaseSearchBar
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setShowAllOrders(false);
                }}
                onOpenFilter={() => setIsFilterSheetOpen(true)}
                isFilterActive={statusFilter !== 'all'}
              />
            ) : undefined
          }
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-24">
            <ActivityIndicator color={colors.ink} />
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
                onPress={
                  isLive(order.status)
                    ? () => navigation.navigate('TrackOrder', { orderId: order.orderId, paymentMethodLabel: 'UPI' })
                    : undefined
                }
              />
            ))}

            {hasMoreOrders ? (
              <Pressable
                onPress={() => setShowAllOrders(true)}
                className="mb-1 items-center rounded-xl border border-ink/10 bg-white py-3.5 "
              >
                <Text className="text-[14px] font-semibold text-ink">
                  View {sortedOrders.length - visibleOrders.length} more order{sortedOrders.length - visibleOrders.length === 1 ? '' : 's'}
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

            <PurchaseBestSellers items={bestSellers} />

            <View className="mt-8 gap-2 pb-44 pt-10">
              <Text className="text-5xl font-semibold tracking-tight text-ink/10">Every order, a small win.</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-medium text-ink/50">Made with</Text>
                <AppIcon icon={HeartIcon} size={14} color={colors.danger} fill={colors.danger} />
                <Text className="text-sm font-medium text-ink/50">for your neighborhood</Text>
              </View>
            </View>

            {/* <BrandFooter /> */}
          </View>
        ) : (
          <View className="flex-grow justify-between">
            <View>
              <Image source={{ uri: FEATURE_IMAGE_URI }} className="mt-6 aspect-[4/5] w-3/5 self-center" resizeMode="cover" />
              <Text className="mt-5 px-8 text-center text-lg font-bold text-ink">No orders yet.</Text>
              <Text className="mt-1 px-8 text-center text-sm font-medium text-ink/50">
                They&apos;ll show up here once you place your first one.
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

      <OrderStatusFilterSheet
        visible={isFilterSheetOpen}
        value={statusFilter}
        onSelect={(filter) => {
          setStatusFilter(filter);
          setShowAllOrders(false);
        }}
        onClose={() => setIsFilterSheetOpen(false)}
      />
    </View>
  );
}
