// Transparent payout breakdown — order total → platform fee → what the
// store actually receives. Sits below "Order details" so the store owner
// sees exactly what the customer paid and what Gloceries kept, not just a net
// figure they have to trust blind.

import { Text, View } from 'react-native';

interface Props {
  orderTotal: number;
  commissionPercent: number;
  commissionAmount: number;
  netPayout: number;
}

export function OrderPayoutBreakdown({ orderTotal, commissionPercent, commissionAmount, netPayout }: Props) {
  return (
    <View className="gap-2.5 rounded-3xl bg-[#F9FAFB] p-4">
      {/* <Text className="mb-0.5 text-base font-medium text-ink/80">Your payout</Text>

      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-ink/60">Customer paid</Text>
        <Text className="text-sm font-semibold text-ink">₹{orderTotal}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-ink/60">Platform fee ({commissionPercent}%)</Text>
        <Text className="text-sm font-semibold text-danger">-₹{commissionAmount}</Text>
      </View> */}

      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-medium text-ink">Payout You&apos;ll receive</Text>
        <Text className="text-lg font-semibold text-lime-deep">₹{orderTotal}</Text>
      </View>
    </View>
  );
}
