// "Total Earnings" summary card at the top of the Earnings tab. A
// Today/Week segmented toggle drives which EarningsBreakdown the parent
// hands down (breakdownForToday vs breakdownForWeek) — the card itself is
// dumb, it just renders whatever breakdown + period it's given.
//
// Rows map straight onto real order fields (utils/earnings.ts's own note):
// Base earnings = baseFare, Distance pay = distanceFare, Incentives = surge,
// Tips = customer tip. Deductions has no data-model field yet, so it's 0
// and the row is hidden until it's > 0 (see below).
//
// Footer: Active hours is only tracked for TODAY (useActiveMsToday — no
// weekly history exists), so the parent passes activeMs only in Today mode
// and null in Week mode; the row hides itself when activeMs is null rather
// than show a fake weekly figure. Completed orders is always shown (it's
// just breakdown.count).

import { Pressable, Text, View } from 'react-native';
import {
  ChartBarLineIcon,
  Clock01Icon,
  Coins01Icon,
  GiftIcon,
  MinusSignCircleIcon,
  PackageIcon,
  Route02Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { formatDurationShort } from '../../../utils/date';
import type { EarningsBreakdown } from '../../../utils/earnings';

export type EarningsPeriod = 'today' | 'week';

interface Props {
  period: EarningsPeriod;
  onPeriodChange: (period: EarningsPeriod) => void;
  breakdown: EarningsBreakdown;
  // Only meaningful for Today (no weekly active-time source) — null in Week
  // mode, which hides the Active-hours footer stat.
  activeMs: number | null;
}

const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function EarningsSummaryCard({ period, onPeriodChange, breakdown, activeMs }: Props) {
  const rows = [
    { key: 'base', label: 'Base earnings', icon: Wallet01Icon, value: breakdown.base },
    { key: 'distance', label: 'Distance pay', icon: Route02Icon, value: breakdown.distance },
    { key: 'incentives', label: 'Incentives', icon: Coins01Icon, value: breakdown.incentives },
    { key: 'tips', label: 'Tips', icon: GiftIcon, value: breakdown.tips },
  ];

  return (
    <View className="gap-5 rounded-3xl bg-white p-5">
      {/* Today / Week segmented toggle — active pill is ink (dark) with white
          text, inactive is muted ink on the light gray track. */}
      <View className="flex-row rounded-[16px] bg-black/[0.06] p-1">
        {(['today', 'week'] as const).map((p) => {
          const active = period === p;
          return (
            <Pressable
              key={p}
              onPress={() => onPeriodChange(p)}
              className={`flex-1 items-center rounded-xl py-3.5 ${active ? 'bg-ink' : ''}`}
            >
              <Text className={`text-[14px] font-semibold ${active ? 'text-white' : 'text-ink/50'}`}>
                {p === 'today' ? 'Today' : 'This week'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Total — lime chart icon + the big figure. */}
      <View className="flex-row items-center gap-3">
        <View>
          <Text className="text-[17px] font-medium tracking-tight text-ink/60">Total Earnings</Text>
          <Text className="text-[30px] font-semibold text-ink tabular-nums">{rupee(breakdown.total)}</Text>
        </View>
      </View>

      {/* Breakdown rows. */}
      <View className="gap-3.5">
        {rows.map((r) => (
          <View key={r.key} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <AppIcon icon={r.icon} size={18} color={`${colors.ink}80`} />
              <Text className="text-[14px] font-medium text-ink/70">{r.label}</Text>
            </View>
            <Text className="text-[15px] font-semibold text-ink tabular-nums">{rupee(r.value)}</Text>
          </View>
        ))}

        {/* Deductions — hidden until there's a real deduction to show. */}
        {breakdown.deductions > 0 ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <AppIcon icon={MinusSignCircleIcon} size={18} color={colors.danger} />
              <Text className="text-[14px] font-medium text-ink/70">Deductions</Text>
            </View>
            <Text className="text-[15px] font-semibold tabular-nums" style={{ color: colors.danger }}>
              -{rupee(breakdown.deductions)}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="h-px bg-black/[0.08]" />

      {/* Footer stats — Active hours (Today only) + Completed orders. */}
      <View className="flex-row">
        {activeMs != null ? (
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={Clock01Icon} size={16} color={`${colors.ink}66`} />
              <Text className="text-[12px] font-medium text-ink/45">Active hours</Text>
            </View>
            <Text className="text-[18px] font-bold text-ink tabular-nums">{formatDurationShort(activeMs)}</Text>
          </View>
        ) : null}
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <AppIcon icon={PackageIcon} size={16} color={`${colors.ink}66`} />
            <Text className="text-[12px] font-medium text-ink/45">Completed orders</Text>
          </View>
          <Text className="text-[18px] font-bold text-ink tabular-nums">{breakdown.count}</Text>
        </View>
      </View>
    </View>
  );
}
