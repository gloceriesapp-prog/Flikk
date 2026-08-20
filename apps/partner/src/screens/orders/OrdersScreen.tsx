// Order queue (P2) — this app's home screen. Reached first on app open
// (see AppNavigator.tsx's initialRouteName) and via push-notification tap
// once notifications exist. "Mark Packed" (labeled "Accept Order" on the
// card, see OrderCard.tsx) is the only status transition this app is
// allowed to trigger — see data.ts and specs/02-partner-app/flows.md.
//
// Order state itself lives in ../../store/useOrdersStore.ts now, not local
// useState — OrderDetailScreen (P3) needs to read and act on the same
// orders. This screen just renders what the store holds.

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { useOrdersStore } from '../../store/useOrdersStore';
import { STORE_PROFILE, type PartnerOrderStatus } from './data';
import { HomeGradientBackdrop } from './components/HomeGradientBackdrop';
import { OrderCard } from './components/OrderCard';
import { OrderStatusFilter, type OrderStatusFilterValue } from './components/OrderStatusFilter';
import { StoreProfileHeader } from './components/StoreProfileHeader';
import { TodayStatsCard } from './components/TodayStatsCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Orders'>;

// One entry per real order status this screen ever shows, in display
// order — the section title is only rendered when the "All" filter is
// active, so this table is the single place that owns both.
const STATUS_GROUPS: { status: PartnerOrderStatus; filterValue: OrderStatusFilterValue; sectionTitle: string }[] = [
  { status: 'placed', filterValue: 'placed', sectionTitle: 'New Orders' },
  { status: 'packed', filterValue: 'packed', sectionTitle: 'Packed' },
  { status: 'out_for_delivery', filterValue: 'out_for_delivery', sectionTitle: 'Out for Delivery' },
];

export function OrdersScreen({ navigation }: Props) {
  const orders = useOrdersStore((state) => state.orders);
  const markPacked = useOrdersStore((state) => state.markPacked);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilterValue>('all');

  const newOrderCount = orders.filter((order) => order.status === 'placed').length;
  const earningTotal = orders.reduce((sum, order) => sum + order.total, 0);

  const visibleGroups = STATUS_GROUPS.filter(
    (group) => statusFilter === 'all' || statusFilter === group.filterValue
  ).map((group) => ({ ...group, orders: orders.filter((order) => order.status === group.status) }));

  return (
    <View className="flex-1 bg-white">
      {/* Gradient wash spans header + stat boxes as one surface — pt-safe
          on StoreProfileHeader (inside the backdrop) is what lets the
          gradient itself bleed up behind the status bar, not stop below
          it with a white gap above. pb-6 after the stat card is the
          gradient extending past the boxes' bottom edge, not stopping
          flush at their border — the "bg till the 4 box too" ask. */}
      <HomeGradientBackdrop>
        <StoreProfileHeader
          profile={STORE_PROFILE}
          // No notifications screen/backend yet (specs/05-platform/notifications.md)
          // — stubbed rather than silently doing nothing, same convention as
          // apps/customer's HomeSearchBar mic icon.
          onPressNotifications={() => {}}
        />

        <View className="pb-6">
          <TodayStatsCard orderCount={orders.length} pendingCount={newOrderCount} earningTotal={earningTotal} />
        </View>
      </HomeGradientBackdrop>

      <View className="py-3">
        <OrderStatusFilter
          options={[
            { value: 'all', label: 'All Orders', count: orders.length },
            ...STATUS_GROUPS.map((group) => ({
              value: group.filterValue,
              label: group.sectionTitle,
              count: orders.filter((order) => order.status === group.status).length,
            })),
          ]}
          selected={statusFilter}
          onSelect={setStatusFilter}
        />
      </View>

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 px-10">
          <Text className="text-base font-semibold text-ink">No orders yet</Text>
          <Text className="text-center text-sm text-ink/50">New orders will show up here the moment they come in.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28">
          {visibleGroups.map(
            (group) =>
              group.orders.length > 0 && (
                <View key={group.status} className="gap-3">
                  {statusFilter === 'all' && (
                    <Text className="mt-1 text-lg font-medium text-ink">{group.sectionTitle}</Text>
                  )}
                  {group.orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onMarkPacked={markPacked}
                      onViewOrder={() => navigation.navigate('OrderDetail', { orderId: order.id })}
                    />
                  ))}
                </View>
              )
          )}
        </ScrollView>
      )}

      <BottomNavBar />
    </View>
  );
}
