// The rider's own order queue — active assignments only (no "browse
// available orders and claim one" list, since dispatch is founder-manual
// per CLAUDE.md: this app receives assignments, it doesn't let a rider
// pick from a pool). Empty state differs by online status, since "why
// don't I have any orders" has a different real answer depending on it.

import { CheckmarkCircle02Icon, DeliveryTruck01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { MultiStopJobCard } from './components/MultiStopJobCard';
import { OrderQueueCard } from './components/OrderQueueCard';
import { isToday } from '../../utils/date';
import type { RiderOrder } from '../../data/mockOrders';
import type { AppStackParamList } from '../../navigation/types';

// Groups activeOrders into single-order entries and multi-leg trip groups
// (same trip_id — see RiderOrder's own note) so a 3-store trip renders as
// one MultiStopJobCard, not 3 separate OrderQueueCards that would read as
// 3 unrelated deliveries.
function groupByTrip(orders: RiderOrder[]): (RiderOrder | RiderOrder[])[] {
  const seenTripIds = new Set<string>();
  const groups: (RiderOrder | RiderOrder[])[] = [];
  for (const order of orders) {
    if (!order.tripId) {
      groups.push(order);
      continue;
    }
    if (seenTripIds.has(order.tripId)) continue;
    seenTripIds.add(order.tripId);
    groups.push(orders.filter((o) => o.tripId === order.tripId));
  }
  return groups;
}

export function OrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isOnline = useRiderOrdersStore((s) => s.isOnline);
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const activeGroups = groupByTrip(activeOrders);
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders).filter(
    (order) => order.deliveredAt && isToday(order.deliveredAt)
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="bg-white px-5 pb-4 pt-safe-offset-4">
        <Text className="text-xl font-semibold text-ink">Orders</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28 pt-4">
        {activeOrders.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl bg-white px-6 py-10">
            <AppIcon icon={DeliveryTruck01Icon} size={30} color={colors.ink} />
            <Text className="text-center text-base font-semibold text-ink">
              {isOnline ? 'Waiting for your next order' : "You're offline"}
            </Text>
            <Text className="text-center text-[13px] text-ink/50 font-medium">
              {isOnline
                ? "You'll get an alert the moment a store assigns you one."
                : 'Go online from the Home tab to start receiving orders.'}
            </Text>
          </View>
        ) : (
          activeGroups.map((group) =>
            Array.isArray(group) ? (
              <MultiStopJobCard
                key={group[0]!.tripId}
                legs={group}
                onPress={(nextLegId) => navigation.navigate('OrderDetail', { orderId: nextLegId })}
              />
            ) : (
              <OrderQueueCard key={group.id} order={group} onPress={() => navigation.navigate('OrderDetail', { orderId: group.id })} />
            ),
          )
        )}

        {completedOrders.length > 0 ? (
          <View className="mt-2 gap-2">
            <Text className="px-1 text-[12px] font-semibold uppercase tracking-wide text-ink/60">Delivered today</Text>
            {completedOrders.map((order) => (
              <View key={order.id} className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
                <AppIcon icon={CheckmarkCircle02Icon} size={18} color={colors.success} />
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-ink">{order.orderNumber}</Text>
                  <Text className="text-[12px] text-ink/45 font-medium">{order.customerName}</Text>
                </View>
                {order.customerRating ? (
                  <View className="flex-row items-center gap-1">
                    <AppIcon icon={StarIcon} size={12} color={colors.gold} />
                    <Text className="text-[12px] font-semibold text-ink/60">{order.customerRating}</Text>
                  </View>
                ) : null}
                <Text className="ml-3 text-[13px] font-semibold text-ink">₹{order.payout}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
