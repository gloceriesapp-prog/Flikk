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
import { OrderQueueCard } from './components/OrderQueueCard';
import { isToday } from '../../utils/date';
import type { AppStackParamList } from '../../navigation/types';

export function OrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isOnline = useRiderOrdersStore((s) => s.isOnline);
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders).filter(
    (order) => order.deliveredAt && isToday(order.deliveredAt)
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="bg-white px-5 pb-4 pt-safe-offset-4">
        <Text className="text-xl font-bold text-ink">Orders</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28 pt-4">
        {activeOrders.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl bg-white px-6 py-10">
            <AppIcon icon={DeliveryTruck01Icon} size={30} color={colors.ink} />
            <Text className="text-center text-base font-semibold text-ink">
              {isOnline ? 'Waiting for your next order' : "You're offline"}
            </Text>
            <Text className="text-center text-[13px] text-ink/50">
              {isOnline
                ? "You'll get an alert the moment a store assigns you one."
                : 'Go online from the Home tab to start receiving orders.'}
            </Text>
          </View>
        ) : (
          activeOrders.map((order) => (
            <OrderQueueCard key={order.id} order={order} onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })} />
          ))
        )}

        {completedOrders.length > 0 ? (
          <View className="mt-2 gap-2">
            <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Delivered today</Text>
            {completedOrders.map((order) => (
              <View key={order.id} className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
                <AppIcon icon={CheckmarkCircle02Icon} size={18} color={colors.success} />
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-ink">{order.orderNumber}</Text>
                  <Text className="text-[12px] text-ink/45">{order.customerName}</Text>
                </View>
                {order.customerRating ? (
                  <View className="flex-row items-center gap-1">
                    <AppIcon icon={StarIcon} size={12} color={colors.gold} />
                    <Text className="text-[12px] font-semibold text-ink/60">{order.customerRating}</Text>
                  </View>
                ) : null}
                <Text className="ml-3 text-[13px] font-bold text-ink">₹{order.payout}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
