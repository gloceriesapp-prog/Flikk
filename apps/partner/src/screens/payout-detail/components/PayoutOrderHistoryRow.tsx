// One order line within a settlement's full history — Order ID, date/time,
// and a real commission breakdown (gross → commission deducted → net).

import { Text, View } from 'react-native';
import { formatCommissionPercent, type ApiPayoutOrder } from '../../../api/payouts';

interface Props {
  order: ApiPayoutOrder;
  isLast: boolean;
}

function formatOrderDateTime(deliveredAt: string): string {
  const date = new Date(deliveredAt);

  // Format: "Sun, 18 Sep"
  const formattedDate = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Format: "2:30 PM"
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${formattedDate} • ${formattedTime}`;
}

export function PayoutOrderHistoryRow({ order, isLast }: Props) {
  // The rate this order was really charged — from the API, else from its own
  // amounts (sample rows), never a hard-coded percentage.
  const rate = order.commissionRate ?? (order.grossAmount > 0 ? order.commissionAmount / order.grossAmount : 0);
  return (
    <View className={`py-3.5 ${isLast ? '' : 'border-b border-black/5'}`}>
      {/* Top Row: Order ID (Left), Formatted Date & Time (Right) */}
      <View className="flex-row items-center justify-between">
        <Text className="text-[14.5px] font-semibold text-ink">
          Order ID: <Text className="font-bold">{order.orderNumber}</Text>
        </Text>

        <Text className="text-[12.5px] font-medium text-ink/50">
          {formatOrderDateTime(order.deliveredAt)}
        </Text>
      </View>

      {/* Bottom Breakdown Row: Total – Commission (rate) = Net */}
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <Text className="text-[12.5px] font-medium text-ink/50" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{order.grossAmount.toLocaleString('en-IN')}
        </Text>

        <Text className="text-[12.5px] font-medium text-ink/40">
          − ₹{order.commissionAmount.toLocaleString('en-IN')} ({formatCommissionPercent(rate)} fee)
        </Text>

        <View className="ml-auto flex-row items-center gap-1">
          <Text className="text-[13.5px] font-semibold text-emerald-700/70">You get</Text>
          <Text className="text-[13.5px] font-semibold text-emerald-600" style={{ fontVariant: ['tabular-nums'] }}>
            ₹{order.netAmount.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  );
}