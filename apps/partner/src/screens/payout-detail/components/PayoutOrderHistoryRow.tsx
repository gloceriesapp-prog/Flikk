// One order line within a settlement's full history — day, order number,
// and a real commission breakdown (gross → commission deducted → net) so
// a shop owner can check any single order against the platform's own
// commission rate, not just take the settlement total on faith. Every
// figure here is GET /partner/payouts/:id/orders's own real response
// (backend/src/routes/partner.ts) — the same item_total/commission_amount
// every order was actually created with, never recomputed here.

import { Text, View } from 'react-native';
import type { ApiPayoutOrder } from '../../../api/payouts';

interface Props {
  order: ApiPayoutOrder;
  isLast: boolean;
}

function dayLabel(deliveredAt: string): string {
  return new Date(deliveredAt).toLocaleDateString('en-IN', { weekday: 'short' });
}

export function PayoutOrderHistoryRow({ order, isLast }: Props) {
  return (
    <View className={`py-3.5 ${isLast ? '' : 'border-b border-black/5'}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <Text className="text-[11px] font-semibold text-ink/60">{dayLabel(order.deliveredAt)}</Text>
          </View>
          <Text className="text-sm font-semibold text-ink">{order.orderNumber}</Text>
        </View>
        <Text className="text-sm font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{order.netAmount.toLocaleString('en-IN')}
        </Text>
      </View>

      {/* Real per-order breakdown — gross the customer paid, the platform's
          commission cut, what actually lands net. Indented under the order
          row it explains, small enough not to compete with the net amount
          above (the number that matters most at a glance). */}
      <View className="ml-12 mt-1 flex-row items-center gap-3">
        <Text className="text-xs font-medium text-ink/40">₹{order.grossAmount.toLocaleString('en-IN')} gross</Text>
        <Text className="text-xs font-medium text-ink/40">−₹{order.commissionAmount.toLocaleString('en-IN')} commission</Text>
      </View>
    </View>
  );
}
