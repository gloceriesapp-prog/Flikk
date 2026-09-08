// Order queue (P2) — this app's home screen. Reached first on app open
// (see AppNavigator.tsx's initialRouteName) and via push-notification tap
// once notifications exist. "Mark Packed" (labeled "Accept Order" on the
// card, see OrderCard.tsx) is the only status transition this app is
// allowed to trigger — see data.ts and specs/02-partner-app/flows.md.
//
// Order state itself lives in ../../store/useOrdersStore.ts now, not local
// useState — OrderDetailScreen (P3) needs to read and act on the same
// orders. This screen just renders what the store holds.

import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';
import type { PartnerOrderStatus } from './data';
import { OrderCard } from './components/OrderCard';
import { OrderStatusFilter, type OrderStatusFilterValue } from './components/OrderStatusFilter';
import { ProfileSetupBanner } from './components/ProfileSetupBanner';
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
  const acknowledgeOrder = useOrdersStore((state) => state.acknowledgeOrder);
  const markPacked = useOrdersStore((state) => state.markPacked);
  const loadOrders = useOrdersStore((state) => state.loadOrders);
  // Defaults to New Orders, not All — the screen a shop owner opens
  // should lead with what needs their action, not a mixed list they have
  // to scan through to find it.
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilterValue>('placed');
  const profile = useStoreProfileStore((state) => state.profile);
  const toggleOpen = useStoreProfileStore((state) => state.toggleOpen);
  const loadProfile = useStoreProfileStore((state) => state.loadProfile);

  useEffect(() => {
    void loadProfile();
    void loadOrders();
  }, [loadProfile, loadOrders]);

  // OrderCard's own onMarkPacked expects a plain (orderId) => void — this
  // wraps the store's real, throwing action so a failed PATCH surfaces as
  // an alert instead of an unhandled rejection (same "never bare `void
  // asyncCall()`" rule this app already learned the hard way, see
  // features/incoming-order-alert's own note on that exact bug class).
  function handleMarkPacked(orderId: string) {
    markPacked(orderId).catch((err) => {
      Alert.alert('Could not update order', err instanceof ApiError ? err.message : 'Please try again.');
    });
  }

  const newOrderCount = orders.filter((order) => order.status === 'placed').length;
  const earningTotal = orders.reduce((sum, order) => sum + order.total, 0);

  const visibleGroups = STATUS_GROUPS.filter(
    (group) => statusFilter === 'all' || statusFilter === group.filterValue
  ).map((group) => ({ ...group, orders: orders.filter((order) => order.status === group.status) }));

  return (
    <View className="flex-1 bg-white">
      {/* Flat white — no gradient wash behind the header anymore. Stat
          boxes still read as cards on their own (border + shadow), same
          layout/spacing as before, just no colored backdrop under it. */}
      <StoreProfileHeader
        profile={profile}
        onToggleOpen={toggleOpen}
        onPressSettings={() => navigation.navigate('StoreSettings')}
        // No notifications backend yet (specs/05-platform/notifications.md)
        // — stubbed rather than silently doing nothing, same convention as
        // apps/customer's HomeSearchBar mic icon.
        onPressNotifications={() => {}}
      />

      {profile.id.length > 0 && (
        <ProfileSetupBanner profile={profile} onPress={() => navigation.navigate('StoreSettings')} />
      )}

      <View className="pb-1">
        <TodayStatsCard orderCount={orders.length} pendingCount={newOrderCount} earningTotal={earningTotal} />
      </View>

      <View className="py-3">
        <OrderStatusFilter
          // New Orders → Packed → Out for Delivery → All, in that order —
          // pending-action states lead, the catch-all trails. Same
          // priority as the default selection above.
          options={[
            ...STATUS_GROUPS.map((group) => ({
              value: group.filterValue,
              label: group.sectionTitle,
              count: orders.filter((order) => order.status === group.status).length,
            })),
            { value: 'all', label: 'All Orders', count: orders.length },
          ]}
          selected={statusFilter}
          onSelect={setStatusFilter}
        />
      </View>

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-base font-medium text-ink">No orders yet</Text>
          <Text className="text-center text-sm text-ink/50 font-normal">New orders will show up here the moment they come in.</Text>
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
                      onAcknowledge={acknowledgeOrder}
                      onMarkPacked={handleMarkPacked}
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
