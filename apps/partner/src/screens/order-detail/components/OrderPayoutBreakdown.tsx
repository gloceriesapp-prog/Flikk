// Transparent payout breakdown — item total → platform commission →
// what the store actually receives. Sits below "Order details" so the
// store owner sees exactly what their goods were worth and what Gloceries
// kept, not just a net figure they have to trust blind. (The first row is
// the item total, not the customer-paid gross — the delivery fee the
// customer also pays is a rider/platform line, never the store's, so
// labelling it "Item total" keeps it from being misread as what the
// customer paid.)
//
// This used to show `itemTotal` itself under a "Payout you'll receive"
// label — the real breakdown rows above it were commented out, so the
// commission was computed but never actually deducted from what the
// screen displayed as the payout. Every figure here is now the real
// server-computed orders.item_total/commission_amount (OrderDetailScreen.
// tsx's own note) — the store only ever receives netPayout, never
// itemTotal itself; the commission stays with the platform.

import { Text, View } from 'react-native';
import { formatCommissionPercent } from '../../../api/payouts';
import { PAYOUT_POLICY } from '../../../utils/payoutPolicy';

interface Props {
  itemTotal: number;
  // 0–1 fraction (e.g. 0.045), formatted by payouts' formatCommissionPercent
  // so a fractional rate shows one decimal ("4.5%") and a whole one stays an
  // integer ("6%") — never a rounded-wrong "5%" or an ugly "6.0%".
  commissionRate: number;
  commissionAmount: number;
  netPayout: number;
  // True once the order is delivered: flips "You'll receive" (still
  // projected) to "Added to your balance" (earned, not yet paid out) — the
  // distinction backend/src/jobs/weeklyPayouts.ts's delivered-only scoping
  // is built on.
  delivered?: boolean;
}

export function OrderPayoutBreakdown({ itemTotal, commissionRate, commissionAmount, netPayout, delivered }: Props) {
  return (
    <View className="gap-2.5 rounded-3xl bg-white p-4">
      <Text className="mb-0.5 text-[15px] font-medium text-ink/80">Payout breakdown</Text>

      <View className="flex-row items-center justify-between">
        <Text className="text-[13.5px] font-medium text-ink/60">Item total</Text>
        <Text className="text-[13.5px] font-semibold text-ink">₹{itemTotal.toLocaleString('en-IN')}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-[13.5px] font-medium text-ink/60">Commission ({formatCommissionPercent(commissionRate)})</Text>
        <Text className="text-[13.5px] font-semibold text-danger">−₹{commissionAmount.toLocaleString('en-IN')}</Text>
      </View>

      <View className="mt-1 flex-row items-center justify-between border-t border-black/5 pt-2.5">
        <Text className="text-[15px] font-medium text-ink">{delivered ? "Added to your balance" : "You'll receive"}</Text>
        <Text className="text-[15px] font-semibold text-lime-deep">₹{netPayout.toLocaleString('en-IN')}</Text>
      </View>

      {delivered && (
        <Text className="text-[12px] font-medium text-ink/50">Paid out with the rest of your balance. {PAYOUT_POLICY}.</Text>
      )}
    </View>
  );
}
