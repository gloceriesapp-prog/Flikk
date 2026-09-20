// Transparent payout breakdown — order total → platform commission →
// what the store actually receives. Sits below "Order details" so the
// store owner sees exactly what the customer paid and what Gloceries
// kept, not just a net figure they have to trust blind.
//
// This used to show `orderTotal` itself under a "Payout you'll receive"
// label — the real breakdown rows above it were commented out, so the
// commission was computed but never actually deducted from what the
// screen displayed as the payout. Every figure here is now the real
// server-computed orders.item_total/commission_amount (OrderDetailScreen.
// tsx's own note) — the store only ever receives netPayout, never
// orderTotal itself; the commission stays with the platform.

import { Text, View } from 'react-native';

interface Props {
  orderTotal: number;
  commissionPercent: number;
  commissionAmount: number;
  netPayout: number;
  // Only passed once the order is actually delivered (OrderDetailScreen's
  // own note) — the real next Monday-9AM-IST settlement date
  // (utils/nextPayoutDate.ts). Its presence is what flips "You'll
  // receive" (still projected, order not delivered yet) to "Added to your
  // balance" (already earned, just not settled yet) — the exact
  // distinction backend/src/jobs/weeklyPayouts.ts's own delivered-only
  // scoping is built on, made visible here instead of left implicit.
  payoutDateLabel?: string;
}

export function OrderPayoutBreakdown({ orderTotal, commissionPercent, commissionAmount, netPayout, payoutDateLabel }: Props) {
  return (
    <View className="gap-2.5 rounded-3xl bg-white p-4">
      <Text className="mb-0.5 text-[15px] font-medium text-ink/80">Payout breakdown</Text>

      <View className="flex-row items-center justify-between">
        <Text className="text-[13.5px] font-medium text-ink/60">Order total</Text>
        <Text className="text-[13.5px] font-semibold text-ink">₹{orderTotal.toLocaleString('en-IN')}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-[13.5px] font-medium text-ink/60">Commission ({commissionPercent}%)</Text>
        <Text className="text-[13.5px] font-semibold text-danger">−₹{commissionAmount.toLocaleString('en-IN')}</Text>
      </View>

      <View className="mt-1 flex-row items-center justify-between border-t border-black/5 pt-2.5">
        <Text className="text-[15px] font-medium text-ink">{payoutDateLabel ? "Added to your balance" : "You'll receive"}</Text>
        <Text className="text-[15px] font-semibold text-lime-deep">₹{netPayout.toLocaleString('en-IN')}</Text>
      </View>

      {payoutDateLabel && (
        <Text className="text-[12px] font-medium text-ink/50">Paid out with the rest of your balance on {payoutDateLabel}.</Text>
      )}
    </View>
  );
}
