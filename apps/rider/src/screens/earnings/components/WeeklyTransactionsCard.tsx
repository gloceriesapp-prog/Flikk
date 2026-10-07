// White card below the chart — every delivery that earned money in
// whichever week EarningsWeekHeader has selected (utils/earnings.ts's
// getEarningsForWeek). Each row is one settled order or one whole
// multi-stop trip; the headline here is the real base vs extra-stop split
// the backend recomputed (splitEarning) — a plain single-store delivery
// shows base only, a trip shows "base + extra-stop" so the rider sees
// exactly where a bigger trip payout came from.
//
// No Withdraw tab: payouts run automatically the Monday after a week ends,
// never on demand, and the per-payout view isn't wired to real data yet —
// dropped rather than faked. Status (paid/pending) is shown per row
// instead, straight off rider_earnings.paid_at.

import { Text, View } from 'react-native';
import { ArrowDownLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { WeekTransaction } from '../../../utils/earnings';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function TransactionRow({ transaction }: { transaction: WeekTransaction }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-[#F8F8F8] p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-success/15">
        <AppIcon icon={ArrowDownLeft01Icon} size={16} color={colors.success} />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
          {transaction.title}
        </Text>
        <Text className="mt-0.5 text-[12px] text-ink/45 font-medium" numberOfLines={1}>
          {formatDate(transaction.date)}
          {transaction.subtitle ? ` · ${transaction.subtitle}` : ''}
          {transaction.status === 'pending' ? ' · Scheduled (paid every Monday)' : ''}
        </Text>
        {/* Base vs extra-stop split — the headline. Only spelled out when
            there's a real extra-stop surcharge (a multi-stop trip); a plain
            delivery is all base, so the split would just repeat the total. */}
        {transaction.extraStop > 0 ? (
          <Text className="mt-1 text-[11.5px] text-ink/40 font-medium tabular-nums">
            ₹{transaction.base} base + ₹{transaction.extraStop} extra-stop
          </Text>
        ) : null}
      </View>
      <Text className="text-[14px] font-semibold text-success tabular-nums">+₹{transaction.amount}</Text>
    </View>
  );
}

interface Props {
  earnings: WeekTransaction[];
}

export function WeeklyTransactionsCard({ earnings }: Props) {
  return (
    <View className="mx-5 gap-4 rounded-3xl bg-white p-4">
      <Text className="text-[15px] font-semibold text-ink">Transactions</Text>

      {earnings.length === 0 ? (
        <View className="items-center gap-1 py-8">
          <Text className="text-center text-[14px] font-semibold text-ink">No earnings this week yet</Text>
          <Text className="text-center text-[12.5px] text-ink/45 font-medium">
            Finish a delivery to see it show up here.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {earnings.map((row) => (
            <TransactionRow key={row.id} transaction={row} />
          ))}
        </View>
      )}
    </View>
  );
}
