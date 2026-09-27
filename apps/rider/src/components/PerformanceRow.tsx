// Deliveries / Completion / Rating — the three trust-signal numbers real
// rider apps surface (Swiggy/Rapido-style). Lives in shared components/
// (not screens/profile) though currently only ProfileScreen renders it.
// Values are now REAL server data from GET /rider/stats (api/stats.ts) —
// not the old mock-derived utils/performance.ts scoring. Same card shell as
// screens/home/components/StatCard.tsx (border/shadow/radius) for visual
// consistency, not a one-off card style.

import { StarIcon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';
import type { RiderStats } from '../api/stats';

interface Props {
  stats: RiderStats;
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
      <View className="flex-1 gap-1 rounded-2xl border border-gray-100 px-2.5 py-3">
        <Text className="text-[11px] font-medium text-ink/45">Deliveries</Text>
        <Text className="text-[19px] font-extrabold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {stats.deliveries}
        </Text>
        <Text className="text-[11px] font-medium text-ink/40">Lifetime</Text>
      </View>

      <View className="flex-1 gap-1 rounded-2xl border border-gray-100 px-2.5 py-3">
        <Text className="text-[11px] font-medium text-ink/45">Completion</Text>
        <Text className="text-[19px] font-extrabold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {stats.completionRate}%
        </Text>
        <Text className="text-[11px] font-medium text-ink/40">{stats.totalAttempted} orders</Text>
      </View>

      <View className="flex-1 gap-1 rounded-2xl border border-gray-100 px-2.5 py-3">
        <Text className="text-[11px] font-medium text-ink/45">Rating</Text>
        <StarValue value={stats.averageRating.toFixed(2)} />
        <Text className="text-[11px] font-medium text-ink/40">{stats.ratingCount} reviews</Text>
      </View>
    </View>
  );
}
