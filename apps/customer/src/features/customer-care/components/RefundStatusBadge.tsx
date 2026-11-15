import { Text, View } from 'react-native';
import type { Refund } from '../api';
import { refundPresentation } from '../refundPresentation';

const styles = {
  queued: { backgroundColor: '#EEF3FF', color: '#214FB0' },
  processing: { backgroundColor: '#EEF3FF', color: '#214FB0' },
  completed: { backgroundColor: '#EAF6EF', color: '#187B49' },
  manual_required: { backgroundColor: '#FDF0EE', color: '#A92B22' },
  failed: { backgroundColor: '#FDF0EE', color: '#A92B22' },
};

export function RefundStatusBadge({ status, providerRefundId }: { status: Refund['status']; providerRefundId?: string | null }) {
  const { backgroundColor, color } = styles[status] ?? styles.queued;
  return (
    <View className="self-start rounded-full px-3 py-1.5" style={{ backgroundColor }}>
      <Text className="text-[13px] font-semibold" style={{ color }}>{refundPresentation(status, providerRefundId).title}</Text>
    </View>
  );
}
