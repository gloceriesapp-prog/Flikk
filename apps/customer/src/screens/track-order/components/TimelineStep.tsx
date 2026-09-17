// One row of the vertical tracking timeline — filled lime circle + solid
// connector for completed stages, a #00A63E circle for the current stage
// (was coral), a plain gray ring for stages still ahead. `isLast` drops
// the connector line (nothing to connect to below the final stage).
//
// Circle bumped to 44px/20px-icon to match the larger text — at the old
// 36px/16px size the circle read too small next to text-sm/text-base
// labels and the row looked lopsided.

import { AppIcon } from '../../../components/AppIcon';
import { Text, View } from 'react-native';
import type { StageMeta } from '../data';

export type StepState = 'done' | 'active' | 'pending';

interface Props {
  stage: StageMeta;
  state: StepState;
  timeLabel: string;
  isLast: boolean;
}

const ACTIVE_COLOR = '#00A63E';

const CIRCLE_STYLE: Record<StepState, { bg: string; iconColor: string }> = {
  done: { bg: 'bg-lime-deep', iconColor: '#FFFFFF' },
  active: { bg: '', iconColor: '#FFFFFF' },
  pending: { bg: 'bg-white border border-gray-300', iconColor: '#9CA3AF' },
};

export function TimelineStep({ stage, state, timeLabel, isLast }: Props) {
  const circle = CIRCLE_STYLE[state];

  return (
    <View className="flex-row gap-4">
      <View className="items-center">
        <View
          className={`h-11 w-11 items-center justify-center rounded-full ${circle.bg}`}
          style={state === 'active' ? { backgroundColor: ACTIVE_COLOR } : undefined}
        >
          <AppIcon icon={stage.icon} size={20} color={circle.iconColor} />
        </View>
        {!isLast && <View className={`w-0.5 flex-1 ${state === 'done' ? 'bg-lime-deep' : 'bg-gray-200'}`} />}
      </View>

      <View className={`flex-1 pt-1 ${isLast ? '' : 'pb-7'}`}>
        <Text className={`text-[12.5px] font-medium ${state === 'pending' ? 'text-ink/30' : 'text-ink/50'}`}>
          {timeLabel}
        </Text>
        <Text className={`mt-0.5 text-[14.5px] font-semibold ${state === 'pending' ? 'text-ink/40' : 'text-ink'}`}>
          {stage.title}
        </Text>
        <Text className={`mt-0.5 text-[12.4px] font-medium ${state === 'pending' ? 'text-ink/30' : 'text-ink/50'}`}>
          {stage.subtitle}
        </Text>
      </View>
    </View>
  );
}
