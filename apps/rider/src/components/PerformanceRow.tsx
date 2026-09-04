// Performance / Completion / Rating — the three trust-signal numbers real
// rider apps surface (Swiggy/Rapido-style). Lives in shared components/
// (not screens/home or screens/profile) — currently only rendered on
// ProfileScreen (a checked-occasionally trust signal, not something a
// rider needs mid-shift on Home — Home's own note on why it moved out of
// there), but nothing here is Profile-specific. All derived from
// utils/performance.ts's computePerformanceStats, which is the one place
// the actual scoring math lives — this component only renders it. Same
// card shell as screens/home/components/StatCard.tsx (border/shadow/
// radius) for visual consistency, not a one-off card style.

import { StarIcon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';
import type { PerformanceStats } from '../utils/performance';

const LABEL_COLOR: Record<PerformanceStats['performanceLabel'], string> = {
  Excellent: colors.success,
  Good: colors.limeDeep,
  'Needs work': colors.danger,
};

interface Props {
  stats: PerformanceStats;
}

function StarValue({ value }: { value: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-[19px] font-extrabold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <AppIcon icon={StarIcon} size={13} color={colors.gold} />
    </View>
  );
}

export function PerformanceRow({ stats }: Props) {
  return (
    <View className="flex-row gap-2">
      <View className="flex-1 gap-1 rounded-2xl border border-gray-100 bg-white px-2.5 py-3 shadow-sm shadow-black/5">
        <Text className="text-[11px] font-medium text-ink/45">Performance</Text>
        <StarValue value={stats.performanceScore.toFixed(2)} />
        <Text className="text-[11px] font-bold" style={{ color: LABEL_COLOR[stats.performanceLabel] }}>
          {stats.performanceLabel}
        </Text>
      </View>

      <View className="flex-1 gap-1 rounded-2xl border border-gray-100 bg-white px-2.5 py-3 shadow-sm shadow-black/5">
        <Text className="text-[11px] font-medium text-ink/45">Completion</Text>
        <Text className="text-[19px] font-extrabold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {stats.completionRate}%
        </Text>
        <Text className="text-[11px] font-medium text-ink/40">{stats.totalAttempted} orders</Text>
      </View>

      <View className="flex-1 gap-1 rounded-2xl border border-gray-100 bg-white px-2.5 py-3 shadow-sm shadow-black/5">
        <Text className="text-[11px] font-medium text-ink/45">Rating</Text>
        <StarValue value={stats.averageRating.toFixed(2)} />
        <Text className="text-[11px] font-medium text-ink/40">{stats.ratingCount} reviews</Text>
      </View>
    </View>
  );
}
