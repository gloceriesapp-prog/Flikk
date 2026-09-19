// The hero card — this week's pending settlement. Flat black, no gradient
// — a plain View, so className (padding/gap) just works, none of the
// LinearGradient-specific "style prop only" workaround the earlier version
// needed. No sales/commission breakdown here — just the number a shop
// owner actually receives and when it lands; the gross/fee split read as
// unnecessary noise once the net amount is already the headline. Purely a
// display of a server-computed number — see ../data.ts's own note on why
// nothing here is computed client-side.

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { CalendarCheckIn01Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { formatPayoutCountdown, nextPayoutDate, payoutCountdown } from '../../../utils/nextPayoutDate';
import { payoutStatusPresentation, type WeeklyPayout } from '../data';
import { PayoutOrdersLink } from './PayoutOrdersLink';

interface Props {
  payout: WeeklyPayout;
}

export function CurrentWeekPayoutCard({ payout }: Props) {
  const { label, color } = payoutStatusPresentation(payout.status);

  // Real countdown to the next actual release — mirrors backend's own
  // cron.schedule('0 9 * * 1', { timezone: 'Asia/Kolkata' }) exactly
  // (utils/nextPayoutDate.ts), not a guessed/static date. Recomputed every
  // minute, not every second — a multi-day countdown doesn't need
  // per-second precision, and this avoids a needless re-render tick.
  const [countdownLabel, setCountdownLabel] = useState(() => formatPayoutCountdown(payoutCountdown(nextPayoutDate())));
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownLabel(formatPayoutCountdown(payoutCountdown(nextPayoutDate())));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View className="gap-5 rounded-[28px] bg-[#151515] p-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <AppIcon icon={Wallet01Icon} size={16} color={colors.lime} />
          </View>
          <Text className="text-base font-medium text-white/60 tracking-tight">{payout.weekLabel}</Text>
        </View>

        <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: `${color}26` }}>
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          <Text className="text-sm font-medium tracking-tight" style={{ color }}>
            {label}
          </Text>
        </View>
      </View>

      <View className="gap-1.5">
        {/* One Text, not a ₹-prefix + number pair — kept them out of
            separate elements so the rupee sign sits on the same baseline
            as the digits instead of floating above them. */}
        <Text className="text-[42px] font-medium text-white" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{payout.netAmount.toLocaleString('en-IN')}
        </Text>
        <Text className="text-sm font-medium text-white/50">
          You&apos;ll receive this amount · {payout.orderCount} orders
        </Text>
      </View>

      {payout.nextSettlementLabel && (
        <View className="gap-2 border-t border-white/10 pt-4">
          <View className="flex-row items-center gap-2">
            <AppIcon icon={CalendarCheckIn01Icon} size={14} color={`${colors.lime}CC`} />
            <Text className="text-sm font-medium text-white/50">
              Settles automatically on <Text className="font-semibold text-white/80">{payout.nextSettlementLabel}</Text>
            </Text>
          </View>
          <Text className="text-sm font-medium text-white/50">
            In <Text className="font-semibold text-white/80" style={{ fontVariant: ['tabular-nums'] }}>{countdownLabel}</Text>
          </Text>
        </View>
      )}

      <PayoutOrdersLink payout={payout} variant="dark" />
    </View>
  );
}
