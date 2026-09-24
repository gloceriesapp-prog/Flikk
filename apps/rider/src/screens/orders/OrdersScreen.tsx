// The rider's own order queue. ONE scrollable view, no segmented tabs:
// live/active assignments on top (what needs doing now), completed drops
// below, filtered by a Day/Week/Month period control in the header. No
// "browse available orders" pool — dispatch is founder-manual per CLAUDE.md;
// this app receives assignments, it doesn't let a rider pick from a pool.
//
// Why one list instead of the old Active/Delivered segmented tabs: toggling
// the segment swapped the ENTIRE body between two structurally-different
// subtrees (a .map of cards vs a fragment), and that whole-subtree swap on
// re-render was what tripped React Navigation's "Couldn't find a navigation
// context" crash mid-reconciliation. Both sections now always render in a
// stable order; only the delivered rows' data changes with the period, so
// there's no element-type swap at a fixed position to corrupt the fiber tree.

import { useMemo, useState } from 'react';
import { CheckmarkCircle02Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { MultiStopJobCard } from './components/MultiStopJobCard';
import { OrderQueueCard } from './components/OrderQueueCard';
import { DeliveryHistoryRow } from '../home/components/DeliveryHistoryRow';
import { isToday, isWithinLastDays } from '../../utils/date';
import type { RiderOrder } from '../../data/mockOrders';
import type { AppStackParamList, AppTabParamList } from '../../navigation/types';

type Period = 'day' | 'week' | 'month';

// Period control filters the DELIVERED section only — live orders are live,
// never time-scoped. `match` reuses the existing date utils (isToday /
// isWithinLastDays); `tally` is the label on the earnings summary bar.
const PERIOD_META: Record<Period, { label: string; tally: string; match: (iso: string) => boolean }> = {
  day: { label: 'Day', tally: 'Today', match: (iso) => isToday(iso) },
  week: { label: 'Week', tally: 'This week', match: (iso) => isWithinLastDays(iso, 7) },
  month: { label: 'Month', tally: 'This month', match: (iso) => isWithinLastDays(iso, 30) },
};

const PERIODS: Period[] = ['day', 'week', 'month'];

// Navigation comes as a PROP the tab navigator injects — NOT useNavigation().
// Composite: a Tab screen (AppTabParamList) that also pushes OrderDetail on
// the parent native-stack (AppStackParamList).
type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, 'Orders'>,
  NativeStackScreenProps<AppStackParamList>
>;

// Groups activeOrders into single-order entries and multi-leg trip groups
// (same trip_id) so a 3-store trip renders as one MultiStopJobCard, not 3
// separate cards. Dedupes by id along the way — a duplicate id yields two
// cards with the same React key, which corrupts the fiber tree.
function groupByTrip(orders: RiderOrder[]): (RiderOrder | RiderOrder[])[] {
  const seenTripIds = new Set<string>();
  const seenOrderIds = new Set<string>();
  const groups: (RiderOrder | RiderOrder[])[] = [];
  for (const order of orders) {
    if (seenOrderIds.has(order.id)) continue;
    seenOrderIds.add(order.id);
    if (!order.tripId) {
      groups.push(order);
      continue;
    }
    if (seenTripIds.has(order.tripId)) continue;
    seenTripIds.add(order.tripId);
    groups.push(orders.filter((o) => o.tripId === order.tripId));
  }
  return groups;
}

export function OrdersScreen({ navigation }: Props) {
  const isOnline = useRiderOrdersStore((s) => s.isOnline);
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const [period, setPeriod] = useState<Period>('day');

  const activeGroups = useMemo(() => groupByTrip(activeOrders), [activeOrders]);

  const delivered = useMemo(() => {
    // completedOrders is the full persisted+rehydrated history with several
    // unguarded append paths, so dedupe by id (same reason groupByTrip does).
    const match = PERIOD_META[period].match;
    const seen = new Set<string>();
    return completedOrders.filter((o) => {
      if (!o.deliveredAt || o.status !== 'delivered' || !match(o.deliveredAt) || seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
  }, [completedOrders, period]);

  // Take-home = fare + tip, same as EarningsScreen / DeliveryHistoryRow.
  const earned = useMemo(() => delivered.reduce((sum, o) => sum + o.payout + (o.tip ?? 0), 0), [delivered]);

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="bg-white px-5 pb-4 pt-safe-offset-4">
        {/* Left: title. Right: Day/Week/Month period control (delivered only). */}
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-semibold text-ink">Orders</Text>
          <View className="flex-row gap-1 rounded-2xl bg-[#F1F2F4] p-1">
            {PERIODS.map((p) => (
              <PeriodTab key={p} label={PERIOD_META[p].label} active={period === p} onPress={() => setPeriod(p)} />
            ))}
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-28 pt-4" showsVerticalScrollIndicator={false}>
        {/* Live / active queue — always on top. */}
        <SectionLabel text="Active" count={activeOrders.length} />
        {activeGroups.length === 0 ? (
          <EmptyHint
            icon={DeliveryTruck01Icon}
            text={
              isOnline
                ? "No live orders. You'll get an alert the moment a store assigns you one."
                : "You're offline. Go online from the Home tab to start receiving orders."
            }
          />
        ) : (
          activeGroups.map((group) =>
            Array.isArray(group) ? (
              <MultiStopJobCard
                key={group[0]!.tripId}
                legs={group}
                onPress={(nextLegId) => navigation.navigate('OrderDetail', { orderId: nextLegId })}
              />
            ) : (
              <OrderQueueCard key={group.id} order={group} onPress={() => navigation.navigate('OrderDetail', { orderId: group.id })} />
            ),
          )
        )}

        {/* Delivered — below, scoped to the selected period. */}
        <View className="mt-3">
          <SectionLabel text="Delivered" count={delivered.length} />
        </View>
        {delivered.length === 0 ? (
          <EmptyHint icon={CheckmarkCircle02Icon} text={`No deliveries ${PERIOD_META[period].tally.toLowerCase()}.`} />
        ) : (
          <>
            {/* Period tally — count + total earned, at-a-glance "how's it going". */}
            <View className="flex-row items-center justify-between rounded-2xl bg-ink px-5 py-4">
              <View>
                <Text className="text-[12px] font-semibold text-white/60">Delivered · {PERIOD_META[period].tally}</Text>
                <Text className="text-[20px] font-bold text-white">
                  {delivered.length} {delivered.length === 1 ? 'order' : 'orders'}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[12px] font-semibold text-white/60">Earned</Text>
                <Text className="text-[20px] font-bold text-white" style={{ fontVariant: ['tabular-nums'] }}>₹{earned}</Text>
              </View>
            </View>

            {delivered.map((order) => (
              <DeliveryHistoryRow key={order.id} order={order} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PeriodTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`rounded-xl px-3 py-1.5 ${active ? 'bg-white shadow-sm shadow-black/5' : ''}`}>
      <Text className={`text-[12.5px] font-bold ${active ? 'text-ink' : 'text-ink/45'}`}>{label}</Text>
    </Pressable>
  );
}

function SectionLabel({ text, count }: { text: string; count: number }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-[13px] font-bold uppercase tracking-wide text-ink/45">{text}</Text>
      {count > 0 ? (
        <View className="rounded-full bg-black/5 px-1.5 py-0.5">
          <Text className="text-[11px] font-bold text-ink/50" style={{ fontVariant: ['tabular-nums'] }}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function EmptyHint({ icon, text }: { icon: IconSvgElement; text: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-5">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F1F2F4]">
        <AppIcon icon={icon} size={20} color={colors.ink} />
      </View>
      <Text className="flex-1 text-[13px] font-medium text-ink/55">{text}</Text>
    </View>
  );
}
