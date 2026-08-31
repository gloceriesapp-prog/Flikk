// Cosmetic-only incentive tier card — CLAUDE.md lists loyalty/incentive
// programs as out of scope until the MVP validates (Scope discipline
// section); this is UI against a static mock target
// (data/appConfig.ts's own note), not a real bonus-payout ledger. Built
// premium on purpose anyway — a rider incentive is exactly the kind of
// "you're working toward something real" signal that makes the app feel
// worth using, even mocked, so the visual bar here is deliberately dark/
// gradient rather than the flatter white cards used elsewhere on Home.

import { GiftIcon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { INCENTIVE_BONUS, INCENTIVE_TARGET } from '../../../data/appConfig';

interface Props {
  weekEarnings: number;
}

export function IncentiveProgressCard({ weekEarnings }: Props) {
  const progress = Math.min(1, weekEarnings / INCENTIVE_TARGET);
  const remaining = Math.max(0, INCENTIVE_TARGET - weekEarnings);
  const reached = weekEarnings >= INCENTIVE_TARGET;

  return (
    <View className="gap-3.5 overflow-hidden rounded-3xl bg-ink p-4 shadow-md shadow-black/25">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[13px] font-bold text-white">Incentive progress</Text>
          <Text className="mt-0.5 text-[12.5px] text-white/55">
            {reached ? `Bonus unlocked — ₹${INCENTIVE_BONUS} added to this week's payout` : `₹${remaining} more to unlock ₹${INCENTIVE_BONUS}`}
          </Text>
        </View>
        <LinearGradient
          colors={[colors.lime, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppIcon icon={GiftIcon} size={18} color={colors.ink} />
        </LinearGradient>
      </View>

      <View className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <LinearGradient
          colors={reached ? [colors.success, colors.lime] : [colors.limeDeep, colors.lime]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: `${progress * 100}%`, borderRadius: 999 }}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-[11.5px] font-semibold text-white/50" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{weekEarnings}
        </Text>
        <Text className="text-[11.5px] font-semibold text-white/50" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{INCENTIVE_TARGET}
        </Text>
      </View>
    </View>
  );
}
