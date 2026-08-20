// One week's settlement row — pending weeks get a gold accent (money not
// yet in hand), paid weeks a plain success check. No action on this
// card — payouts are read-only by design, see data.ts.

import { CheckmarkCircle02Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { WeeklyPayout } from '../data';

interface Props {
  payout: WeeklyPayout;
}

export function PayoutWeekCard({ payout }: Props) {
  const isPending = payout.status === 'pending';

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
      <View className={`h-10 w-10 items-center justify-center rounded-full ${isPending ? 'bg-gold/15' : 'bg-lime-soft'}`}>
        <AppIcon icon={isPending ? Clock01Icon : CheckmarkCircle02Icon} size={18} color={isPending ? colors.gold : colors.limeDeep} />
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-ink" numberOfLines={1}>
          {payout.weekLabel}
        </Text>
        <Text className="mt-0.5 text-xs font-medium text-ink/50">{payout.orderCount} orders</Text>
      </View>

      <View className="items-end">
        <Text className="text-base font-extrabold text-ink">₹{payout.amount}</Text>
        <Text className={`text-[11px] font-bold ${isPending ? 'text-gold' : 'text-lime-deep'}`}>
          {isPending ? 'Pending' : 'Paid'}
        </Text>
      </View>
    </View>
  );
}
