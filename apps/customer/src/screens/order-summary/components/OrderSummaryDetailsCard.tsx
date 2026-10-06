import { Text, View } from 'react-native';
import type { OrderSummary } from '../data';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-[12px] font-medium text-ink/45">{label}</Text>
      <Text selectable className="text-[14px] font-semibold leading-5 text-ink">{value}</Text>
    </View>
  );
}

export function OrderSummaryDetailsCard({ summary }: { summary: OrderSummary }) {
  const date = new Date(summary.placedAt);
  const dateLabel = Number.isFinite(date.getTime())
    ? date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Not available';
  return (
    <View className="gap-4 rounded-3xl bg-white p-5">
      <Text accessibilityRole="header" className="text-[18px] font-bold text-ink">Order details</Text>
      <Detail label={summary.orderNumbers.length > 1 ? 'Order numbers' : 'Order number'} value={summary.orderNumbers.join('\n')} />
      <Detail label="Payment" value={summary.paymentLabel} />
      <Detail label="Placed on" value={dateLabel} />
    </View>
  );
}
