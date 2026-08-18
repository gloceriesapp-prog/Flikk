import { Text, View } from 'react-native';
import { DEMO_CURRENT_STATUS, ORDER_STAGES, STAGE_OFFSET_MINUTES } from '../data';
import { TimelineStep, type StepState } from './TimelineStep';

interface Props {
  orderedAt: Date;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function TrackingTimeline({ orderedAt }: Props) {
  const currentIndex = ORDER_STAGES.findIndex((stage) => stage.status === DEMO_CURRENT_STATUS);

  return (
    <View className="w-full">
      <Text className="mb-4 text-lg font-semibold text-ink">Tracking Timeline</Text>

      {ORDER_STAGES.map((stage, index) => {
        const state: StepState = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending';
        const stageTime = new Date(orderedAt.getTime() + STAGE_OFFSET_MINUTES[stage.status] * 60_000);
        const timeLabel = state === 'pending' ? `Est. ${formatTime(stageTime)}` : formatTime(stageTime);

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
