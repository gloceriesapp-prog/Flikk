// "Total Earnings" summary card at the top of the Earnings tab. A
// Today/Week segmented toggle drives which EarningsBreakdown the parent
// hands down (breakdownForToday vs breakdownForWeek) — the card itself is
// dumb, it just renders whatever breakdown + period it's given.
//
// Rows map straight onto the only real server-derived dimensions
// (utils/earnings.ts's own note): Base pay = the per-order/trip base
// delivery fee, Extra-stop pay = the multi-stop surcharge summed across
// trips. Extra-stop hides until it's > 0 (a rider with no multi-stop trips
// that period has nothing to show there).
//
// Footer: Active hours is only tracked for TODAY (useActiveMsToday — no
// weekly history exists), so the parent passes activeMs only in Today mode
// and null in Week mode; the row hides itself when activeMs is null rather
// than show a fake weekly figure. Completed orders is always shown (it's
// just breakdown.count).

import { Pressable, Text, View } from 'react-native';
import { Clock01Icon, PackageIcon, Route02Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
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
  // Only the base row is always shown; extra-stop is appended when the
  // period actually contains a multi-stop trip (its surcharge > 0).
  const rows = [
    { key: 'base', label: 'Base pay', icon: Wallet01Icon, value: breakdown.base },
    ...(breakdown.extraStop > 0
      ? [{ key: 'extraStop', label: 'Extra-stop pay', icon: Route02Icon, value: breakdown.extraStop }]
      : []),
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
