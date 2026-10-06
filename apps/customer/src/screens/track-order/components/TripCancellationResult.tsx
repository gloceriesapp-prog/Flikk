import { Text, View } from 'react-native';
import type { TripCancellation, TripRefund } from '../../../api/trips';

const REFUND_LABELS: Record<TripRefund['status'], string> = {
  queued: 'Queued', processing: 'Processing', completed: 'Refunded', failed: 'Needs support',
};

interface Props {
  result?: TripCancellation;
  refund?: TripRefund | null;
}

export function TripCancellationResult({ result, refund }: Props) {
  if (!result && !refund) return null;
  const currentRefund = refund ?? result?.refund;
  const refundText = currentRefund
    ? `Combined refund ₹${currentRefund.amount.toFixed(2)} · ${REFUND_LABELS[currentRefund.status]}`
    : result?.outcome === 'blocked' ? 'No new refund was requested.' : 'No payment to refund.';

  return (
    <View className="w-full rounded-3xl bg-white p-5" accessibilityLiveRegion="polite">
      <Text className="text-[16px] font-bold text-black">
        {result?.outcome === 'blocked' ? 'Cancellation not completed' : 'Cancellation & refund'}
      </Text>
      {currentRefund ? (
        <Text className="mt-2 text-[12px] text-gray-500">
          These shops share one payment and one combined refund.
        </Text>
      ) : null}
      {result?.shops.map((shop) => (
        <View key={shop.order_id} className="mt-3">
          <Text className="text-[14px] font-semibold text-black">{shop.store_name}</Text>
          <Text className="mt-1 text-[13px] text-gray-600">
            {shop.outcome === 'cancelled' ? 'Cancelled'
              : shop.outcome === 'blocked' ? `Cannot cancel — ${shop.status.replace(/_/g, ' ')}`
                : 'Kept active because another shop order cannot be cancelled'}
          </Text>
          {shop.outcome === 'cancelled' && !currentRefund && shop.refund_status && shop.refund_status !== 'none' ? (
            <Text className="mt-1 text-[12px] text-gray-600">
              Shop refund: {shop.refund_status === 'failed' ? 'Needs support' : shop.refund_status}
            </Text>
          ) : null}
        </View>
      ))}
      <Text className="mt-4 text-[13px] font-semibold text-gray-700">{refundText}</Text>
      {currentRefund && currentRefund.refunded_amount > 0 && currentRefund.status !== 'completed' ? (
        <Text className="mt-1 text-xs text-gray-500">
          ₹{currentRefund.refunded_amount.toFixed(2)} confirmed refunded so far
        </Text>
      ) : null}
    </View>
  );
}
