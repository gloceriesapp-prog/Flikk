// Dashboard — the online/offline toggle lives here (not buried in
// Profile/Settings), same as every real rider app: this is the single
// control that decides whether new orders can reach this rider at all.
// Deliberately lean: greeting/zone -> online toggle+SOS/Help -> one
// earnings-focused stat row -> active order -> filtered history. No
// deliveries-count card (the filter chips already show that number) and
// no Performance/Completion/Rating row (moved to ProfileScreen — those
// are checked-occasionally trust signals, not something a rider needs
// mid-shift every time they glance at Home; keeping them here just
// duplicated the filter chip counts and read as a second, confusing
// rating right next to the first).

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ActiveDeliveryCard } from './components/ActiveDeliveryCard';
import { DeliveryHistoryRow } from './components/DeliveryHistoryRow';
import { DispatchOfferCard } from './components/DispatchOfferCard';
import { FilterChipRow, type DeliveryFilter } from './components/FilterChipRow';
import { HomeGreeting } from './components/HomeGreeting';
import { LastRatingCallout } from './components/LastRatingCallout';
import { MaintenanceBanner } from './components/MaintenanceBanner';
import { StatCard } from './components/StatCard';
import { StatusHeaderBar } from './components/StatusHeaderBar';
import { useElapsedMs } from '../../hooks/useElapsedMs';
import { formatDurationShort, isToday } from '../../utils/date';
import type { AppStackParamList } from '../../navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isOnline = useRiderOrdersStore((s) => s.isOnline);
  const onlineSince = useRiderOrdersStore((s) => s.onlineSince);
  const goOnline = useRiderOrdersStore((s) => s.goOnline);
  const goOffline = useRiderOrdersStore((s) => s.goOffline);
  const nearbyOffers = useRiderOrdersStore((s) => s.nearbyOffers);
  const acceptOffer = useRiderOrdersStore((s) => s.acceptOffer);
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const cancelledOrders = useRiderOrdersStore((s) => s.cancelledOrders);
  const loadSampleData = useRiderOrdersStore((s) => s.loadSampleData);
  const todayOrders = completedOrders.filter((order) => order.deliveredAt && isToday(order.deliveredAt));
  // "Earned" is the fare only; tips get their own card instead of being
  // folded silently in — a real tip is the customer's own money on top of
  // the fare, not part of what the delivery itself earned
  // (data/mockOrders.ts's own note).
  const todayEarnings = todayOrders.reduce((sum, order) => sum + order.payout, 0);
  const todayTips = todayOrders.reduce((sum, order) => sum + (order.tip ?? 0), 0);
  const onlineElapsedMs = useElapsedMs(onlineSince);
  const [filter, setFilter] = useState<DeliveryFilter>('all');

  const showActive = filter === 'all' || filter === 'active';
  const showCompleted = filter === 'all' || filter === 'completed';
  const showCancelled = filter === 'all' || filter === 'cancelled';
  const hasAnything = activeOrders.length + todayOrders.length + cancelledOrders.length > 0;
  const selectedCount =
    filter === 'active' ? activeOrders.length : filter === 'completed' ? todayOrders.length : filter === 'cancelled' ? cancelledOrders.length : 1;

  return (
    <ScrollView className="flex-1 bg-[#F4F7F5]" contentContainerClassName="gap-5 px-5 pb-28 pt-safe-offset-4">
      <View className="gap-3">
        <MaintenanceBanner />
        <HomeGreeting />

        {/* The one control this whole screen exists for, plus
            always-reachable Help/SOS. */}
        <StatusHeaderBar isOnline={isOnline} onToggle={(value) => (value ? goOnline() : goOffline())} />
        <Text className="-mt-2 px-1 text-[12.5px] text-ink/45 font-normal">
          {isOnline ? 'Ready to receive new orders' : 'Go online to start getting orders'}
        </Text>

        <View className="flex-row gap-2">
          <StatCard value={`₹${todayEarnings}`} label="Earned today" />
          <StatCard value={`₹${todayTips}`} label="Tips" />
          <StatCard value={formatDurationShort(onlineElapsedMs)} label="Online for" />
        </View>
      </View>

      {/* {completedOrders[0] ? <LastRatingCallout order={completedOrders[0]} /> : null} */}

      {/* Real, currently-open dispatch offers within range — automated
          rider dispatch, explicit CLAUDE.md scope override. Only ever
          populated while online (useRiderOrdersStore's own goOnline
          starts the location-ping-and-refresh loop that fills this). */}
      {isOnline && nearbyOffers.length > 0 ? (
        <View className="gap-2">
          <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Pickups near you</Text>
          {nearbyOffers.map((offer) => (
            <DispatchOfferCard key={offer.orderId} offer={offer} onAccept={acceptOffer} />
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        <FilterChipRow
          value={filter}
          onChange={setFilter}
          counts={{
            all: activeOrders.length + todayOrders.length + cancelledOrders.length,
            active: activeOrders.length,
            completed: todayOrders.length,
            cancelled: cancelledOrders.length,
          }}
        />

        {!hasAnything || selectedCount === 0 ? (
          <View className="items-center gap-1 rounded-2xl border border-gray-100 bg-white px-6 py-10">
            <Text className="text-center text-base font-semibold text-ink">Nothing here yet</Text>
            <Text className="text-center text-[13px] text-ink/50">
              {filter === 'all' ? 'Deliveries you accept today will show up here.' : `No ${filter} deliveries yet.`}
            </Text>
            {/* Preview aid only — seeds one active/completed/cancelled
                order so the list layouts can be seen without waiting out
                the real accept-and-deliver flow
                (useRiderOrdersStore.loadSampleData's own note). Only
                offered on the true "nothing at all" state, not a single
                empty filter tab. */}
            {/* __DEV__-only — a real beta rider should never see a button
                that fabricates fake deliveries into their own real order
                history. */}
            {!hasAnything && __DEV__ ? (
              <View className="mt-4 w-full">
                <PrimaryButton label="Load sample data" onPress={loadSampleData} />
              </View>
            ) : null}
          </View>
        ) : (
          <View className="gap-4">
            {showActive && activeOrders.length > 0 ? (
              <View className="gap-2.5">
                {/* {filter === 'all' ? <Text className="px-1 text-xs font-semibold uppercase tracking-wide text-ink/40">Active</Text> : null} */}
                {activeOrders.map((order) => (
                  <ActiveDeliveryCard key={order.id} order={order} onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })} />
                ))}
              </View>
            ) : null}

            {showCompleted && todayOrders.length > 0 ? (
              <View className="gap-2">
                {filter === 'all' ? <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Completed</Text> : null}
                {todayOrders.map((order) => (
                  <DeliveryHistoryRow key={order.id} order={order} />
                ))}
              </View>
            ) : null}

            {showCancelled && cancelledOrders.length > 0 ? (
              <View className="gap-2">
                {filter === 'all' ? <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Cancelled</Text> : null}
                {cancelledOrders.map((order) => (
                  <DeliveryHistoryRow key={order.id} order={order} />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
