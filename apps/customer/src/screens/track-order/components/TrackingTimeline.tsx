import { Text, View } from 'react-native';
import type { ApiOrder } from '../../../api/orders';
import { estimateDeliveryTime, formatEta } from '../../../utils/estimateDelivery';
import { ORDER_STAGES, type OrderStatus } from '../data';
import { TimelineStep, type StepState } from './TimelineStep';

interface Props {
  order: ApiOrder;
}

const STAGE_TIMESTAMP: Record<OrderStatus, keyof Pick<ApiOrder, 'placed_at' | 'packed_at' | 'picked_up_at' | 'delivered_at'>> = {
  placed: 'placed_at',
  packed: 'packed_at',
  out_for_delivery: 'picked_up_at',
  delivered: 'delivered_at',
};

// timeZone pinned to IST explicitly — single-zone product (Kaup/outer
// Udupi, CLAUDE.md); a device set to a different system timezone would
// otherwise display the wrong clock time for the same real instant.
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

export function TrackingTimeline({ order }: Props) {
  // Neither 'cancelled' nor 'failed' has a stage index of its own (neither
  // is a step on this linear timeline) — every stage stays 'pending', which
  // is honest: the remaining steps genuinely won't happen.
  const currentIndex =
    order.status === 'cancelled' || order.status === 'failed'
      ? -1
      : ORDER_STAGES.findIndex((stage) => stage.status === order.status);

  return (
    <View className="w-full">
      <Text className="mb-4 text-[16px] font-semibold text-ink">Tracking Timeline</Text>

      {order.status === 'cancelled' && (
        <Text className="mb-4 text-sm font-medium text-danger">This order was cancelled.</Text>
      )}

      {order.status === 'failed' && (
        <Text className="mb-4 text-sm font-medium text-danger">This delivery failed and couldn&apos;t be completed.</Text>
      )}

      {ORDER_STAGES.map((stage, index) => {
        const state: StepState = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending';
        const realTimestamp = order[STAGE_TIMESTAMP[stage.status]];
        // Pending delivery uses the same recorded deadline as the arrival card.
        const timeLabel = realTimestamp
          ? formatTime(realTimestamp)
          : stage.status === 'delivered'
            ? `Est. ${formatEta(estimateDeliveryTime(order.placed_at, order.estimated_delivery_minutes, order.estimated_delivery_at)).replace(/^Today, /, '')}`
            : state === 'pending'
              ? 'Pending'
              : '';

        return (
          <TimelineStep
            key={stage.status}
            stage={stage}
            state={state}
            timeLabel={timeLabel}
            isLast={index === ORDER_STAGES.length - 1}
          />
        );
      })}
    </View>
  );
}
