// Order id + live status badge, then a package-details row (payment mode /
// current stage). Real order now (ApiOrder, api/orders.ts) — order.order_number
// is what's shown (never the raw UUID PK), and the status badge reads
// order.status directly instead of a fixed demo stage.

import { Text, View } from 'react-native';
import type { ApiOrder } from '../../../api/orders';
import { estimateDeliveryTime, formatEta } from '../../../utils/estimateDelivery';
import { ORDER_STAGES } from '../data';

interface Props {
  order: ApiOrder;
  paymentMethodLabel: string;
}

export function OrderInfoCard({ order, paymentMethodLabel }: Props) {
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const currentStage = ORDER_STAGES.find((stage) => stage.status === order.status);
  const statusTitle = isCancelled ? 'Cancelled' : (currentStage?.title ?? order.status);

  const eta = estimateDeliveryTime(order.placed_at, order.stores?.avg_prep_minutes ?? order.avg_prep_minutes ?? null);

  return (
    <View className="w-full gap-4 rounded-3xl border border-gray-100 bg-gray-100 p-5 shadow-sm shadow-black/5">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-base font-semibold text-ink/40">Order ID</Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Text className="text-base font-semibold text-ink">{order.order_number}</Text>
          </View>
        </View>

        <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${isCancelled ? 'bg-danger/10' : 'bg-coral/10'}`}>
          <View className={`h-1.5 w-1.5 rounded-full ${isCancelled ? 'bg-danger' : 'bg-coral'}`} />
          <Text className={`text-sm font-bold ${isCancelled ? 'text-danger' : 'text-coral'}`}>{statusTitle}</Text>
        </View>
      </View>

      {!isCancelled && (
        <View className="items-center rounded-2xl bg-lime-soft py-3">
          <Text className="text-sm font-semibold text-lime-deep">
            {isDelivered ? 'Delivered' : 'Estimated Delivery'}
          </Text>
          <Text className="text-xl font-bold text-ink">
            {isDelivered && order.delivered_at
              ? new Date(order.delivered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : formatEta(eta)}
          </Text>
        </View>
      )}

      <View className="flex-row items-center justify-between border-t border-mist pt-4">
        <View>
          <Text className="text-base font-semibold text-ink/40">Delivery</Text>
          <Text className="text-base font-semibold text-ink">
            {isDelivered ? 'Delivered' : isCancelled ? 'Order cancelled' : 'On its way'}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-base font-semibold text-ink/40">Payment</Text>
          <Text className="text-base font-semibold text-ink">{paymentMethodLabel}</Text>
        </View>
      </View>
    </View>
  );
}
