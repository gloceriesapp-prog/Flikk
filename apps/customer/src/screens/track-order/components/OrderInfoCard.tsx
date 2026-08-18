// Order id + live-looking status badge, estimated delivery, then a
// package-details row (payment mode / delivery mode) — same information
// density as the reference's "Package information" card, built from data
// this app actually has (paymentMethodLabel from checkout) instead of
// inventing fields we can't fill.

import { Copy01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { DEMO_CURRENT_STATUS, ORDER_STAGES, STAGE_OFFSET_MINUTES } from '../data';

interface Props {
  orderId: string;
  paymentMethodLabel: string;
  orderedAt: Date;
}

export function OrderInfoCard({ orderId, paymentMethodLabel, orderedAt }: Props) {
  const currentStage = ORDER_STAGES.find((stage) => stage.status === DEMO_CURRENT_STATUS)!;
  const deliveredStage = ORDER_STAGES[ORDER_STAGES.length - 1];
  const etaDate = new Date(orderedAt.getTime() + STAGE_OFFSET_MINUTES[deliveredStage.status] * 60_000);
  const etaLabel = etaDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <View className="w-full gap-4 rounded-3xl border border-gray-100 bg-gray-100 p-5 shadow-sm shadow-black/5">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-base font-semibold text-ink/40">Order ID</Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Text className="text-base font-semibold text-ink">{orderId}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5 rounded-full bg-coral/10 px-3 py-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-coral" />
          <Text className="text-sm font-bold text-coral">{currentStage.title}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-mist pt-4">
        <View>
          <Text className="text-base font-semibold text-ink/40">Estimated Delivery</Text>
          <Text className="text-base font-semibold text-ink">Today, {etaLabel}</Text>
        </View>
        <View className="items-end">
          <Text className="text-base font-semibold text-ink/40">Payment</Text>
          <Text className="text-base font-semibold text-ink">{paymentMethodLabel}</Text>
        </View>
      </View>
    </View>
  );
}
