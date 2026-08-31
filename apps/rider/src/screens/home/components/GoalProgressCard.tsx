// Daily-goal nudge, same motivator real gig apps show ("₹X more to your
// goal") — pure math on today's completedOrders against
// DAILY_EARNINGS_GOAL (data/appConfig.ts), no backend target needed.
// Hidden once the goal is hit for the day rather than showing a maxed-out
// bar with nothing left to say.

import { Text, View } from 'react-native';
import { DAILY_EARNINGS_GOAL } from '../../../data/appConfig';

interface Props {
  todayEarnings: number;
}

export function GoalProgressCard({ todayEarnings }: Props) {
  const progress = Math.min(1, todayEarnings / DAILY_EARNINGS_GOAL);
  const remaining = Math.max(0, DAILY_EARNINGS_GOAL - todayEarnings);
  const reached = todayEarnings >= DAILY_EARNINGS_GOAL;

  return (
    <View className="gap-2.5 rounded-2xl border border-gray-100 bg-white px-4 py-3.5">
      <Text className="text-[13px] font-bold text-ink">
        {reached ? "Today's goal reached 🎉" : `₹${remaining} more to hit today's ₹${DAILY_EARNINGS_GOAL} goal`}
      </Text>
      <View className="h-2 overflow-hidden rounded-full bg-mist">
        <View className={`h-full rounded-full ${reached ? 'bg-success' : 'bg-lime'}`} style={{ width: `${progress * 100}%` }} />
      </View>
    </View>
  );
}
