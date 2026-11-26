import { Text, View } from 'react-native';
import { GILROY } from '../../../theme/fonts';
import type { OrderSummary } from '../data';

// Same type scale as Bill details: 15 px grey label on the left, the value
// on the right.
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text className="text-[15px] font-medium text-[#737579]">{label}</Text>
      <Text selectable className="min-w-0 flex-1 text-right text-[15px] leading-[21px] text-[#505257]" style={{ fontFamily: GILROY.semibold }}>{value}</Text>
    </View>
  );
}

export function OrderSummaryDetailsCard({ summary }: { summary: OrderSummary }) {
  const date = new Date(summary.placedAt);
  const dateLabel = Number.isFinite(date.getTime())
    ? date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Not available';
  return (
    <View className="gap-4 rounded-3xl bg-white px-5 py-5">
      <Text accessibilityRole="header" className="text-[16px] font-semibold text-ink">Order details</Text>
      <View className="gap-3">
        <Detail label={summary.orderNumbers.length > 1 ? 'Order IDs' : 'Order ID'} value={summary.orderNumbers.join('\n')} />
        <Detail label="Payment" value={summary.paymentLabel} />
        <Detail label="Placed on" value={dateLabel} />
      </View>
    </View>
  );
}
