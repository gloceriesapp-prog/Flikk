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
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { colors } from '../../theme/tokens';
import { fetchMyOrders } from '../../api/orders';
import { mapApiOrder, SAMPLE_PREVIEW_ORDERS } from './data';
import { OrderRow } from './components/OrderRow';
import { OrderStatusFilterSheet, type OrderStatusFilter } from './components/OrderStatusFilterSheet';
import { PurchaseSearchBar } from './components/PurchaseSearchBar';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Purchase'>;

const FEATURE_IMAGE_URI = 'https://i.pinimg.com/1200x/a1/dc/37/a1dc376c96e834e7ae7baf401202b79a.jpg';

export function PurchaseScreen({ navigation }: Props) {
  const { data: fetchedOrders, isLoading, refetch } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => (await fetchMyOrders()).map(mapApiOrder),
  });
  // SAMPLE_PREVIEW_ORDERS appended temporarily — real orders rarely have
  // enough line items to show off ItemThumbnailStack's 3-item and 4+-item
  // ("+N" badge) cases, this is just so that's actually visible on screen.
  // Remove this concat (and the import above) once confirmed.
  const orders = fetchedOrders ? [...fetchedOrders, ...SAMPLE_PREVIEW_ORDERS] : fetchedOrders;

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

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

  const hasAnyOrder = (orders ?? []).length > 0;

  const filteredOrders = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    return (orders ?? []).filter((order) => {
      const matchesFilter =
        statusFilter === 'all' || (statusFilter === 'live' ? isLive(order.status) : !isLive(order.status));
      if (!matchesFilter) return false;
      if (!trimmedQuery) return true;
      return (
        order.storeName.toLowerCase().includes(trimmedQuery) ||
        order.items.some((item) => item.name.toLowerCase().includes(trimmedQuery))
      );
    });
  }, [orders, query, statusFilter]);

  // One flat list now, not separate Live/Past sections — current
  // (not-yet-delivered) orders sorted to the top, done ones to the
  // bottom. Stable sort (JS's Array.sort has been stable since ES2019)
  // keeps each group in whatever order the API already returned it in —
  // this only reorders the two groups relative to each other, not within
  // themselves.
  const sortedOrders = [...filteredOrders].sort((a, b) => Number(isLive(b.status)) - Number(isLive(a.status)));
  const hasFilteredResults = sortedOrders.length > 0;

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* Same fix, same reason, as CategoriesScreen.tsx/CartScreen.tsx —
          HomeScreen sets the global StatusBar to "light" for its own dark
          header, which doesn't reset on navigation and leaves invisible
          white icons against this screen's white background. */}
      <StatusBar style="dark" />
      <View className="relative flex-row items-center px-5 pb-2 pt-2">
        <Pressable
          onPress={() => navigation.navigate('Home')}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center"
        >
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>

        <Text pointerEvents="none" className="absolute left-0 right-0 text-center text-xl font-semibold text-ink">
          Purchase
        </Text>
      </View>

      {hasAnyOrder && (
        <PurchaseSearchBar
          value={query}
          onChangeText={setQuery}
          onOpenFilter={() => setIsFilterSheetOpen(true)}
          isFilterActive={statusFilter !== 'all'}
        />
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : hasAnyOrder && !hasFilteredResults ? (
        <View className="flex-1 items-center justify-center gap-1 px-10">
          <Text className="text-center text-base font-semibold text-ink">No matching orders</Text>
          <Text className="text-center text-sm text-ink/50">Try a different search or filter.</Text>
        </View>
      ) : hasAnyOrder ? (
        <ScrollView className="flex-1" contentContainerClassName="px-6 pb-28 pt-1" showsVerticalScrollIndicator={false}>
          {sortedOrders.map((order) => (
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

          <Text className="mt-4 px-2 text-center text-base font-semibold leading-6 text-gray-500">
            You&apos;re not just ordering. You&apos;re keeping{"\n"}
            local shops open. 🌾
          </Text>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-between pb-28" showsVerticalScrollIndicator={false}>
          <View>
            <Image source={{ uri: FEATURE_IMAGE_URI }} className="aspect-[4/5] w-3/5 self-center" resizeMode="cover" />
            <Text className="mt-5 px-8 text-center text-lg font-bold text-ink">No orders yet.</Text>
            <Text className="mt-1 px-8 text-center text-sm font-medium text-ink/50">
              They&apos;ll show up here once you place your first one.
            </Text>
          </View>

          <Text className="px-6 text-left text-[25px] font-semibold leading-8 text-gray-500">
            You&apos;re not just ordering. You&apos;re keeping
            local shops open. 🌾
          </Text>
        </ScrollView>
      )}

      <BottomNavBar />

      <OrderStatusFilterSheet
        visible={isFilterSheetOpen}
        value={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setIsFilterSheetOpen(false)}
      />
    </View>
  );
}
