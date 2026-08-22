// One week's settlement row — a floating card (own shadow, same recipe as
// catalog/components/ProductRow.tsx) instead of a flat bordered box, and
// status read as a colored pill badge rather than plain colored text, so
// "did this land or not" is legible at a glance, not something to parse
// from text color alone. Paid weeks get a lime check, a pending one (money
// not yet in hand) a gold clock — same accent pair as the hero card's own
// "Pending" pill.
//
// "View all orders" (PayoutOrdersLink) pushes the full order-by-order
// breakdown as its own screen rather than expanding inline — a settlement
// only ever has 15-25+ orders, and a card that grows to fit that list on
// every tap stops reading as a summary row. No other action on this card —
// payouts are read-only by design, see data.ts.

import { CheckmarkCircle02Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { WeeklyPayout } from '../data';
import { PayoutOrdersLink } from './PayoutOrdersLink';

interface Props {
  payout: WeeklyPayout;
}

export function PayoutWeekCard({ payout }: Props) {
  const isPending = payout.status === 'pending';
  const accentColor = isPending ? colors.gold : colors.limeDeep;

  return (
    <View className="gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center gap-3">
        <View className={`h-12 w-12 items-center justify-center rounded-full ${isPending ? 'bg-gold/15' : 'bg-lime-soft'}`}>
          <AppIcon icon={isPending ? Clock01Icon : CheckmarkCircle02Icon} size={20} color={accentColor} />
        </View>

        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {payout.weekLabel}
          </Text>
          <Text className="text-xs font-medium text-ink/50">{payout.orderCount} orders settled</Text>
        </View>

        <View className="items-end gap-1.5">
          <Text className="text-base font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
            ₹{payout.netAmount.toLocaleString('en-IN')}
          </Text>
          <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${isPending ? 'bg-gold/15' : 'bg-lime-soft'}`}>
            <View className="h-1 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
            <Text className="text-[10px] font-semibold" style={{ color: accentColor }}>
              {isPending ? 'Pending' : 'Paid'}
            </Text>
          </View>
        </View>
      </View>

      <PayoutOrdersLink payout={payout} variant="light" />
    </View>
  );
}
