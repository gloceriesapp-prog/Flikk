// White card below the chart — All / Withdraw, scoped to whichever week
// EarningsWeekHeader has selected. "All" = every delivery that earned
// money that week (utils/earnings.ts's getEarningsForWeek — the user's
// own framing: "where all i got money"). "Withdraw" = the one payout that
// week's earnings were paid out in (getWithdrawalForWeek — "from where we
// have took money"), which only ever exists for a week that's already
// over, since payouts run automatically the following Monday, never on
// demand.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowDownLeft01Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { WeekTransaction } from '../../../utils/earnings';

type Tab = 'all' | 'withdraw';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function TransactionRow({ transaction, kind }: { transaction: WeekTransaction; kind: Tab }) {
  const isEarning = kind === 'all';
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-[#F8F8F8] p-4">
      <View className={`h-10 w-10 items-center justify-center rounded-full ${isEarning ? 'bg-success/15' : 'bg-mist'}`}>
        <AppIcon icon={isEarning ? ArrowDownLeft01Icon : ArrowUpRight01Icon} size={16} color={isEarning ? colors.success : colors.ink} />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
          {transaction.title}
        </Text>
        <Text className="mt-0.5 text-[12px] text-ink/45 font-medium" numberOfLines={1}>
          {formatDate(transaction.date)} · {transaction.subtitle}
        </Text>
      </View>
      <Text className={`text-[14px] font-semibold ${isEarning ? 'text-success' : 'text-ink'}`}>
        {isEarning ? '+' : '-'}₹{transaction.amount}
      </Text>
    </View>
  );
}

interface Props {
  earnings: WeekTransaction[];
  withdrawal: WeekTransaction | null;
}

export function WeeklyTransactionsCard({ earnings, withdrawal }: Props) {
  const [tab, setTab] = useState<Tab>('all');
  const withdrawals = withdrawal ? [withdrawal] : [];
  const rows = tab === 'all' ? earnings : withdrawals;

  return (
    <View className="mx-5 gap-4 rounded-3xl bg-white p-4">
      <View className="flex-row gap-1 rounded-2xl bg-[#F8F8F8] p-1">
        {(['all', 'withdraw'] as Tab[]).map((id) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            className={`flex-1 items-center rounded-xl py-2.5 ${tab === id ? 'bg-white shadow-sm shadow-black/5' : ''}`}
          >
            <Text className={`text-[13px] font-semibold ${tab === id ? 'text-ink' : 'text-ink/45'}`}>
              {id === 'all' ? 'All' : 'Withdraw'}
            </Text>
          </Pressable>
        ))}
      </View>

      {rows.length === 0 ? (
        <View className="items-center gap-1 py-8">
          <Text className="text-center text-[14px] font-semibold text-ink">
            {tab === 'all' ? 'No earnings this week yet' : 'Not paid out yet'}
          </Text>
          <Text className="text-center text-[12.5px] text-ink/45 font-medium">
            {tab === 'all'
              ? 'Finish a delivery to see it show up here.'
              : "This week's payout lands the Monday after it ends."}
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {rows.map((row) => (
            <TransactionRow key={row.id} transaction={row} kind={tab} />
          ))}
        </View>
      )}
    </View>
  );
}
