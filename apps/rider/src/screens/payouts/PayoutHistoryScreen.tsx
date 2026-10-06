// Payout history — the per-WEEKLY-PAYOUT complement to the Earnings tab.
// Earnings shows per-delivery earnings; this lists each rider_payouts row (the
// money that actually settled to the rider's bank each week, GET /rider/payouts
// via useRiderPayouts), newest week first, each with its week range, amount,
// and a status pill. A pushed stack screen (reached from Profile's "Payout
// history" row), so it carries its own back-arrow header like RiderDocuments.
//
// Standalone list by design: surfacing "the earnings inside this payout" would
// need a riderPayoutId on the earnings response, whose api-side interface is
// owned by another agent this pass — drill-down is a deliberate follow-up, not
// built here.

import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderPayouts } from './useRiderPayouts';
import type { RiderPayout, RiderPayoutStatus } from '../../api/payouts';

const CARD_BORDER = '#EAECEE';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Hand-formatted (no Intl — Hermes ships without full ICU, same reason
// RiderDocumentsScreen hand-formats its dates). "12 Sep" from a "YYYY-MM-DD".
function formatDay(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? m}`;
}

function formatWeekRange(start: string, end: string): string {
  return `${formatDay(start)} - ${formatDay(end)}`;
}

// paid = settled money (success green); failed/blocked = something's wrong
// (danger); pending/processing = in-flight (muted). Label is the DB status
// title-cased for display.
const STATUS_STYLE: Record<RiderPayoutStatus, { label: string; color: string; bg: string }> = {
  paid: { label: 'Paid', color: colors.success, bg: '#E7F5EF' },
  failed: { label: 'Failed', color: colors.danger, bg: '#FBEAEA' },
  blocked: { label: 'Blocked', color: colors.danger, bg: '#FBEAEA' },
  pending: { label: 'Pending', color: '#8A8F8A', bg: '#F1F1F4' },
  processing: { label: 'Processing', color: '#8A8F8A', bg: '#F1F1F4' },
};

function StatusPill({ status }: { status: RiderPayoutStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: s.bg }}>
      <Text className="text-[12px] font-bold" style={{ color: s.color }}>
        {s.label}
      </Text>
    </View>
  );
}

function PayoutRow({ payout }: { payout: RiderPayout }) {
  return (
    <View className="flex-row items-center gap-3 rounded-[16px] border px-4 py-3.5" style={{ borderColor: CARD_BORDER }}>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {formatWeekRange(payout.weekStart, payout.weekEnd)}
        </Text>
        <Text className="mt-0.5 text-[13px] font-medium text-ink/50">Weekly payout</Text>
      </View>
      <View className="items-end gap-1.5">
        <Text className="text-[16px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          ₹{payout.amount.toFixed(2)}
        </Text>
        <StatusPill status={payout.status} />
      </View>
    </View>
  );
}

function Header() {
  const navigation = useNavigation();
  return (
    <View className="flex-row items-center gap-3 px-4 pb-3 pt-safe-offset-3">
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-9 w-9 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>
      <Text className="text-[18px] font-bold text-ink">Payout history</Text>
    </View>
  );
}

export function PayoutHistoryScreen() {
  const query = useRiderPayouts();
  const { data: payouts, isPending, isError, refetch } = query;

  if (isPending) {
    return (
      <View className="flex-1 bg-white">
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.limeDeep} />
        </View>
      </View>
    );
  }

  if (isError && payouts.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <Header />
        <View className="flex-1 items-center justify-center gap-1 px-8">
          <Text className="text-center text-[15px] font-semibold text-ink">Couldn't load payouts</Text>
          <Text onPress={() => refetch()} className="text-center text-[13px] font-semibold text-lime-deep">
            Tap to retry
          </Text>
        </View>
      </View>
    );
  }

  if (payouts.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <Header />
        <View className="flex-1 items-center justify-center gap-1 px-8">
          <Text className="text-center text-[15px] font-semibold text-ink">No payouts yet</Text>
          <Text className="text-center text-[13px] font-medium text-ink/50">
            Weekly payouts appear here once your first week's earnings settle.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Header />
      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {payouts.map((p) => (
          <PayoutRow key={p.id} payout={p} />
        ))}
        {query.hasNextPage && <Text onPress={() => { if (!query.isFetchingNextPage) void query.fetchNextPage(); }} className="py-4 text-center font-semibold text-lime-deep">{query.isFetchingNextPage ? 'Loading…' : query.isFetchNextPageError ? 'Retry loading more' : 'Load more payouts'}</Text>}
      </ScrollView>
    </View>
  );
}
