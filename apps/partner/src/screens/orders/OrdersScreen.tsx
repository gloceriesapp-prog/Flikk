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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { fetchTodayStats } from '../../api/stats';
import { useChangeStoreLocation } from '../../hooks/useChangeStoreLocation';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';
import { msUntilNextIstMidnight } from '../../utils/nextIstMidnight';
import type { PartnerOrderStatus } from './data';
import { OrderCard } from './components/OrderCard';
import { OrderStatusFilter, type OrderStatusFilterValue } from './components/OrderStatusFilter';
import { ProfileSetupBanner } from './components/ProfileSetupBanner';
import { StoreProfileHeader } from './components/StoreProfileHeader';
import { TodayStatsCard } from './components/TodayStatsCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Orders'>;

// Same flat gray apps/partner's own Payouts screen uses (PayoutsScreen.tsx
// — itself matching apps/customer's checkout flow, CheckoutScreen.tsx's
// `#F1F2F4`) — cards (OrderCard, TodayStatsCard) stay solid white on top
// of it, same contrast relationship as those screens, per an explicit ask
// to match it here too.
const PAGE_BG = '#F1F2F4';

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
  const changeStoreLocation = useChangeStoreLocation();

  useEffect(() => {
    void loadProfile();
    void loadOrders();
  }, [loadProfile, loadOrders]);

  // Real IST-calendar-day-scoped stats (api/stats.ts, GET /partner/stats/
  // today) — replaces the old client-side derivation from useOrdersStore's
  // queue, which had no date scoping at all (see TodayStatsCard.tsx's own
  // former header note on that bug).
  const queryClient = useQueryClient();
  const { data: todayStats } = useQuery({ queryKey: ['stats-today'], queryFn: fetchTodayStats });

  // Real day-boundary refresh, not a periodic poll — schedules exactly at
  // the next real IST midnight (utils/nextIstMidnight.ts) and reschedules
  // itself for the following day each time it fires, so a store owner who
  // leaves this screen open across midnight sees today's numbers reset to
  // the new day on their own instead of showing yesterday's stats until
  // the next manual reload.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function scheduleMidnightRefresh() {
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['stats-today'] });
        scheduleMidnightRefresh();
      }, msUntilNextIstMidnight());
    }
    scheduleMidnightRefresh();
    return () => clearTimeout(timer);
  }, [queryClient]);

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

  const visibleGroups = STATUS_GROUPS.filter(
    (group) => statusFilter === 'all' || statusFilter === group.filterValue
  ).map((group) => ({ ...group, orders: orders.filter((order) => order.status === group.status) }));

  return (
    <View className="flex-1" style={{ backgroundColor: PAGE_BG }}>
      {/* Flat gray page, no gradient wash behind the header. Stat boxes
          still read as cards on their own (solid white + shadow), same
          layout/spacing as before, just a gray backdrop under everything
          now instead of white. */}
      <StoreProfileHeader
        profile={profile}
        onToggleOpen={toggleOpen}
        onPressLocation={changeStoreLocation}
        onPressSettings={() => navigation.navigate('StoreSettings')}
        // No notifications backend yet (specs/05-platform/notifications.md)
        // — stubbed rather than silently doing nothing, same convention as
        // apps/customer's HomeSearchBar mic icon.
        onPressNotifications={() => { }}
      />

      {profile.id.length > 0 && (
        <ProfileSetupBanner profile={profile} onPress={() => navigation.navigate('StoreSettings')} />
      )}

      <View className="pb-1">
        <TodayStatsCard
          orderCount={todayStats?.ordersToday ?? 0}
          pendingCount={todayStats?.pendingToday ?? 0}
          earningTotal={todayStats?.earningToday ?? 0}
        />
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
        <View className="flex-1 items-center justify-center px-16">
          <Text className="text-[15px] font-semibold text-ink">
            Ready for your first order!
          </Text>
          <Text className="mt-1 text-center text-[13px] font-medium text-ink/50">
            Once customers start ordering, you’ll see them pop up here in real time.
          </Text>
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
