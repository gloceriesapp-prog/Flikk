// Payouts (P5) — read-only, backed by real GET /partner/payouts (api/
// payouts.ts). This screen must never compute a payout figure client-side
// — see data.ts's own note; every gross/commission/net number here comes
// straight from jobs/weeklyPayouts.ts's own server-side computation.
//
// Page background is the same flat gray apps/customer's own checkout flow
// uses (CheckoutScreen.tsx's `#F1F2F4`) — cards stay solid white on top of
// it, same contrast relationship as that screen, per an explicit ask to
// match it here too.

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, ScrollView, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { HeadphonesIcon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { fetchCommission, fetchPayoutPage, formatCommissionPercent } from '../../api/payouts';
import { buildSamplePayouts, toWeeklyPayout } from './data';
import { CurrentWeekPayoutCard } from './components/CurrentWeekPayoutCard';
import { PayoutStatusFilter, type PayoutStatusFilterValue } from './components/PayoutStatusFilter';
import { PayoutWeekCard } from './components/PayoutWeekCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Payouts'>;

const PAGE_BG = '#F1F2F4';

export function PayoutsScreen({ navigation }: Props) {
  const [statusFilter, setStatusFilter] = useState<PayoutStatusFilterValue>('all');
  const query = useInfiniteQuery({ queryKey: ['payouts'], initialPageParam: '', queryFn: ({ pageParam }) => fetchPayoutPage(pageParam || undefined), getNextPageParam: page => page.nextCursor ?? undefined, refetchOnWindowFocus: false });
  const { isLoading } = query;
  // This store's real commission rate (GET /partner/commission).
  const commission = useQuery({ queryKey: ['partner-commission'], queryFn: fetchCommission, refetchOnWindowFocus: false });
  const rows = query.data?.pages.flatMap(page => page.items);
  const realPayouts = (rows ?? []).map(toWeeklyPayout);
  // A brand-new store (zero delivered orders, zero real payouts yet) has
  // nothing real to show — falls back to sample data (data.ts's own
  // buildSamplePayouts, every row flagged isSample: true) so the balance
  // card and history stay a permanent, always-visible fixture of this
  // screen instead of disappearing until the first real settlement
  // exists. Only kicks in once loading is actually done and the real
  // fetch genuinely came back empty — never shown alongside real rows.
  // Development builds only — a real store must never see a balance or
  // payouts it was not paid.
  const payouts = __DEV__ && !isLoading && !query.isError && realPayouts.length === 0 ? buildSamplePayouts() : realPayouts;
  const hasNoPayouts = !isLoading && !query.isError && payouts.length === 0;

  // The most recent row that hasn't actually landed yet is the hero card
  // (pending/blocked/failed all still mean "not paid out") —
  // everything else, paid or not, is history below it.
  const currentWeek = payouts.find((p) => p.status !== 'paid') ?? payouts[0];
  const history = payouts.filter((p) => p.id !== currentWeek?.id);
  const paidCount = payouts.filter((p) => p.status === 'paid').length;
  const pendingCount = payouts.filter((p) => p.status !== 'paid').length;
  const visibleHistory = history.filter((payout) => statusFilter === 'all' || (statusFilter === 'paid') === (payout.status === 'paid'));

  return (
    <View className="flex-1 pt-safe" style={{ backgroundColor: PAGE_BG }}>
      {/* One line, not an eyebrow + separate title — settlement already
          happens automatically every week by default, so the header
          doesn't need to explain that twice ("Payouts" / "Weekly
          settlements" said the same thing in two sizes). */}
      <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
        <Text className="text-2xl font-semibold text-ink">Payouts</Text>

        {/* Support — the one thing a shop owner reaches for when a
            settlement figure looks wrong. Opens Help & support: the
            admin-configured contacts and a payout support request. */}
        <Pressable
          onPress={() => navigation.navigate('Support', { compose: true })}
          accessibilityRole="button"
          accessibilityLabel="Help & support"
          className="h-11 w-11 items-center justify-center rounded-full bg-white"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={HeadphonesIcon} size={19} color={colors.ink} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center pb-28">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28">
          {/* Real vs sample is never ambiguous — a plain banner, not a
              per-card watermark, since every row on screen right now is
              sample together (data.ts's own gate: sample data only ever
              renders when the real fetch came back completely empty, so
              it's an all-or-nothing state, not a mix). */}
          {currentWeek?.isSample && (
            <View className="flex-row items-center gap-2 rounded-2xl bg-gold/15 px-4 py-3">
              <Text className="text-xs font-semibold text-ink/70">
                Sample data — real settlements will replace this once your first delivered order completes a full week.
              </Text>
            </View>
          )}

          {hasNoPayouts && (
            <View className="items-center gap-2 rounded-3xl bg-white px-6 py-10">
              <Text className="text-[16px] font-semibold text-ink">No payouts yet</Text>
              <Text className="text-center text-[13px] font-medium leading-5 text-ink/55">
                Your earnings from delivered orders are added up every week and transferred to the payout account in Store Settings. Your first payout appears here after your first delivered order.
              </Text>
            </View>
          )}

          {currentWeek && <CurrentWeekPayoutCard payout={currentWeek} />}

          {commission.data && (
            <Text className="px-1 text-[12.5px] font-medium text-ink/55">
              Gloceries commission: {formatCommissionPercent(commission.data.commissionRate)} of the item total on each new order
              {commission.data.isStoreOverride ? ' (your store’s rate)' : ''}.
            </Text>
          )}

          <View className="mt-3 gap-3">
            <PayoutStatusFilter
              options={[
                { value: 'all', label: 'All', count: history.length },
                { value: 'paid', label: 'Paid', count: paidCount },
                { value: 'pending', label: 'Pending', count: pendingCount },
              ]}
              selected={statusFilter}
              onSelect={setStatusFilter}
            />
            <Text className="text-base font-semibold text-ink/60">Transaction History</Text>
          </View>

          {visibleHistory.length > 0 ? (
            visibleHistory.map((payout) => <PayoutWeekCard key={payout.id} payout={payout} />)
          ) : (
            <View className="items-center gap-1 py-10">
              <Text className="text-[14px] font-semibold text-ink/80">
                {statusFilter === 'pending' ? 'No pending payouts' : 'No paid payouts'}
              </Text>
              <Text className="text-center text-[12px] font-medium text-ink/50">
                {statusFilter === 'pending'
                  ? 'Only this week’s payout is currently in progress.'
                  : 'Your completed payouts will appear here.'}
              </Text>
            </View>
          )}
          {query.hasNextPage && <Pressable disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} className="items-center py-4"><Text className="font-semibold text-ink">{query.isFetchingNextPage ? 'Loading…' : query.isFetchNextPageError ? 'Retry loading more' : 'Load more payouts'}</Text></Pressable>}
          {query.isError && <Pressable onPress={() => { void query.refetch(); }} className="items-center py-4"><Text className="font-semibold text-ink">Couldn’t load payouts. Try again</Text></Pressable>}
        </ScrollView>
      )}

      <BottomNavBar />
    </View>
  );
}
