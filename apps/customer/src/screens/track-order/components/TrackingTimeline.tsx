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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function TrackingTimeline({ order }: Props) {
  // 'cancelled' has no stage index of its own (it isn't a step on this
  // linear timeline) — every stage after the point of cancellation just
  // stays 'pending', same as "hasn't happened", which is honest: it
  // genuinely won't.
  const currentIndex = order.status === 'cancelled' ? -1 : ORDER_STAGES.findIndex((stage) => stage.status === order.status);

  return (
    <View className="w-full">
      <Text className="mb-4 text-lg font-semibold text-ink">Tracking Timeline</Text>

      {order.status === 'cancelled' && (
        <Text className="mb-4 text-sm font-medium text-danger">This order was cancelled.</Text>
      )}

      {ORDER_STAGES.map((stage, index) => {
        const state: StepState = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending';
        const realTimestamp = order[STAGE_TIMESTAMP[stage.status]];
        // The final stage (Delivered) gets a real estimate while still
        // pending, not a bare "Pending" label — the actual ask this
        // component exists to answer ("when will it arrive"). Earlier
        // pending stages (Packed, Out for Delivery) don't have their own
        // estimate to show — only the store's avg_prep_minutes + a flat
        // transit buffer feed the one overall ETA, not a per-stage one.
        const timeLabel = realTimestamp
          ? formatTime(realTimestamp)
          : stage.status === 'delivered'
            ? `Est. ${formatEta(estimateDeliveryTime(order.placed_at, order.stores?.avg_prep_minutes ?? order.avg_prep_minutes ?? null)).replace(/^Today, /, '')}`
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
