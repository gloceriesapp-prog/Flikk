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
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ActiveDeliveryCard } from './components/ActiveDeliveryCard';
import { DeliveryHistoryRow } from './components/DeliveryHistoryRow';
import { DispatchOfferCard, DispatchOfferSheet } from './components/DispatchOffer';
import { FilterChipRow, type DeliveryFilter } from './components/FilterChipRow';
import { RiderHomeHeader } from './components/RiderHomeHeader';
import { SearchingForOrders } from './components/SearchingForOrders';
import { OnlineStatusBadge } from './components/OnlineStatusBadge';
import { OfflineHomeScreen } from './OfflineHomeScreen';
import { useActiveMsToday } from '../../hooks/useActiveMsToday';
import { formatDurationShort, isToday, todayLabel } from '../../utils/date';
import type { AppStackParamList, AppTabParamList } from '../../navigation/types';
import type { AcceptDispatchOfferResult, DispatchOffer } from '../../api/dispatch';
import type { RiderOrder } from '../../data/mockOrders';
import { totalPayout } from '../../utils/payout';

// ponytail: __DEV__-only sample offer for the "Test" button below — lets us
// pop the full-screen new-order UI without a live dispatch. coords null →
// static map preview skipped, so it renders in Expo Go too. Delete the const,
// the Test button, and the modal render before shipping.
const DEMO_OFFER: DispatchOffer = {
  orderId: 'demo-1',
  orderNumber: 'FLK-24817',
  storeName: 'Sri Ganesh Kirana',
  payout: 35,
  pickupKm: 1.4,
  storeToDropKm: 2.7,
  totalKm: 4.1,
  dropLabel: 'Near Kaup Beach Rd',
  itemCount: 6,
  storeCoords: { latitude: 13.2167, longitude: 74.7469 },
  dropCoords: { latitude: 13.2231, longitude: 74.7512 },
  expiresAt: null, // no server deadline for a demo offer → ring uses its windowSeconds fallback
  paymentMethod: 'cod',
  cashToCollect: 420,
};

// Same page + earnings card as OfflineHomeScreen (one visual language across
// shift states); online adds the things that only make sense on-shift —
// live dispatch offers ("Pickups near you") and the accepted-order lists.
// Gray page, white cards — cards lift off the surface instead of blending
// into a flat white screen.
const PAGE_BG = '#F1F2F4';
const CARD_BORDER = '#EAECEE';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const isOnline = useRiderOrdersStore((s) => s.isOnline);
  const nearbyOffers = useRiderOrdersStore((s) => s.nearbyOffers);
  const acceptOffer = useRiderOrdersStore((s) => s.acceptOffer);
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const cancelledOrders = useRiderOrdersStore((s) => s.cancelledOrders);
  const loadSampleData = useRiderOrdersStore((s) => s.loadSampleData);
  const todayOrders = completedOrders.filter((order) => order.deliveredAt && isToday(order.deliveredAt));
  // "Earned" is the fare only; tips get their own column instead of being
  // folded silently in — a real tip is the customer's own money on top of
  // the fare, not part of what the delivery itself earned
  // (data/mockOrders.ts's own note).
  const todayEarnings = totalPayout(todayOrders.map((order) => ({ ...order, tip: undefined })));
  const todayTips = todayOrders.reduce((sum, order) => sum + (order.tip ?? 0), 0);
  const activeMs = useActiveMsToday();
  const [filter, setFilter] = useState<DeliveryFilter>('active');
  // ponytail: __DEV__-only, drives the "Test" button's full-screen offer popup.
  const [demoOffer, setDemoOffer] = useState<DispatchOffer | null>(null);

  // ponytail: __DEV__-only. demo-1 has no backend row, so the real acceptOffer
  // always 409s ("someone else got there first"). This fakes a WON accept so
  // the accept→active premium card can be previewed without a live packed
  // order. Delete with DEMO_OFFER + the Test button before shipping.
  const acceptDemoOffer = async (): Promise<AcceptDispatchOfferResult> => {
    if (!demoOffer) return { ok: false, alreadyTaken: false, message: 'no offer' };
    const o = demoOffer;
    const active: RiderOrder = {
      id: o.orderId,
      orderNumber: o.orderNumber,
      status: 'assigned',
      storeName: o.storeName,
      storeAddress: 'Kaup Market Rd',
      storeCoords: o.storeCoords ?? { latitude: 13.2167, longitude: 74.7469 },
      customerName: 'Deepak Shetty',
      customerAddress: o.dropLabel,
      customerCoords: o.dropCoords ?? { latitude: 13.2231, longitude: 74.7512 },
      customerPhone: '+919000000000',
      itemCount: o.itemCount,
      items: [{ name: 'Demo items', quantity: o.itemCount }],
      distanceKm: o.totalKm,
      payout: o.payout,
      baseFare: 15,
      extraStopFare: Math.max(0, o.payout - 15),
      surge: 0,
      placedAt: new Date().toISOString(),
      paymentMethod: 'cod',
      cashToCollect: 420,
    };
    useRiderOrdersStore.setState((s) => ({ activeOrders: [active, ...s.activeOrders.filter((o) => o.id !== active.id)] }));
    setFilter('active');
    setDemoOffer(null);
    return { ok: true };
  };

  // ponytail: __DEV__-only. Seeds a picked_up demo order and jumps straight to
  // DeliveryNavigation so the drop-nav UI can be iterated on without walking
  // the whole accept→pickup→verify flow every reload. Delete with the button
  // below before shipping.
  const openDemoDelivery = () => {
    const id = 'demo-del-1';
    const active: RiderOrder = {
      id,
      orderNumber: 'FLK-24999',
      status: 'picked_up',
      storeName: 'Sri Ganesh Kirana',
      storeAddress: 'Kaup Market Rd',
      storeCoords: { latitude: 13.2167, longitude: 74.7469 },
      customerName: 'Asha Kamath',
      customerAddress: 'Near City Centre, Manipal',
      customerCoords: { latitude: 13.3524, longitude: 74.7868 },
      customerPhone: '+919000000000',
      itemCount: 6,
      items: [{ name: 'Demo items', quantity: 6 }],
      distanceKm: 4.1,
      payout: 35,
      baseFare: 15,
      extraStopFare: 20,
      surge: 0,
      placedAt: new Date().toISOString(),
      paymentMethod: 'cod',
      cashToCollect: 420,
    };
    useRiderOrdersStore.setState((s) => ({
      activeOrders: [active, ...s.activeOrders.filter((o) => o.id !== id)],
    }));
    navigation.navigate('DeliveryNavigation', { orderId: id });
  };

  const showActive = filter === 'all' || filter === 'active';
  const showCompleted = filter === 'all' || filter === 'completed';
  const showCancelled = filter === 'all' || filter === 'cancelled';
  const hasAnything = activeOrders.length + todayOrders.length + cancelledOrders.length > 0;
  const selectedCount =
    filter === 'active' ? activeOrders.length : filter === 'completed' ? todayOrders.length : filter === 'cancelled' ? cancelledOrders.length : 1;

  // Off-shift → the dedicated offline home (auto-shown, no toggle needed).
  // Placed after all hooks so hook order stays stable across renders.
  if (!isOnline) return <OfflineHomeScreen />;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: PAGE_BG }}
      contentContainerClassName="gap-4 px-5 pb-28 pt-safe-offset-4"
      showsVerticalScrollIndicator={false}
    >
      {/* Same header as the offline home — only the pill flips to "Online"
          (→ goOffline). */}
      <RiderHomeHeader isOnline={isOnline} />

      {/* ponytail: __DEV__-only test trigger for the full-screen new-order
          popup. Remove with DEMO_OFFER + the modal render before shipping. */}
      {__DEV__ ? (
        <Pressable
          onPress={() => setDemoOffer(DEMO_OFFER)}
          className="items-center justify-center rounded-full border border-dashed py-3"
          style={{ borderColor: colors.lime }}
        >
          <Text className="text-[14px] font-bold" style={{ color: colors.limeDeep }}>
            🧪 Test: New Order Popup
          </Text>
        </Pressable>
      ) : null}

      {/* ponytail: __DEV__-only jump straight to the drop-nav UI with dummy
          data. Remove with openDemoDelivery before shipping. */}
      {__DEV__ ? (
        <Pressable
          onPress={openDemoDelivery}
          className="items-center justify-center rounded-full border border-dashed py-3"
          style={{ borderColor: colors.primary }}
        >
          <Text className="text-[14px] font-bold" style={{ color: colors.primary }}>
            🧪 Test: Delivery Nav UI
          </Text>
        </Pressable>
      ) : null}

      {/* Today's earnings hero — identical card to the offline home, with a
          third column for on-shift Tips. Tap → Earnings tab. */}
      <View className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: CARD_BORDER }}>
        <Pressable
          onPress={() => navigation.navigate('Earnings')}
          className="flex-row items-stretch justify-between px-5 pb-4 pt-5"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View>
            <Text className="text-[15px] font-semibold text-[#000000]">Today’s Earnings ({todayLabel()})</Text>
            <Text className="mt-1.5 text-[38px] font-bold tabular-nums">₹{todayEarnings}</Text>
          </View>
          {/* Right end — live online/offline status on top, tap-through
              chevron below (card still opens the Earnings tab). */}
          <View className="items-end justify-between">
            <OnlineStatusBadge />
            <AppIcon icon={ArrowRight01Icon} size={24} color={colors.ink} />
          </View>
        </Pressable>

        <View className="flex-row border-t" style={{ borderColor: CARD_BORDER }}>
          <View className="flex-1 border-r px-4 py-4" style={{ borderColor: CARD_BORDER }}>
            <Text className="text-[22px] font-bold text-ink tabular-nums">{todayOrders.length}</Text>
            <Text className="mt-0.5 text-[15px] font-medium text-ink/50">Delivered</Text>
          </View>
          <View className="flex-1 border-r px-4 py-4" style={{ borderColor: CARD_BORDER }}>
            <Text className="text-[22px] font-bold text-ink tabular-nums">₹{todayTips}</Text>
            <Text className="mt-0.5 text-[15px] font-medium text-ink/50">Tips</Text>
          </View>
          <View className="flex-1 px-4 py-4">
            <Text className="text-[22px] font-bold text-ink tabular-nums">{formatDurationShort(activeMs)}</Text>
            <Text className="mt-0.5 text-[15px] font-medium text-ink/50">Active time</Text>
          </View>
        </View>
      </View>

      {/* Online-only: real, currently-open dispatch offers within range —
          automated rider dispatch (explicit CLAUDE.md scope override).
          useRiderOrdersStore.goOnline starts the ping-and-refresh loop that
          fills this; there's nothing to show while offline. */}
      {nearbyOffers.length > 0 ? (
        <View className="gap-2">
          <Text className="px-1 text-xs font-bold uppercase tracking-wide text-ink/40">Pickups near you</Text>
          {nearbyOffers.map((offer) => (
            <DispatchOfferCard key={offer.orderId} offer={offer} onAccept={acceptOffer} />
          ))}
        </View>
      ) : null}

      {/* Online-only: accepted-order lists + filter chips. Defaults to the
          Active tab — mid-shift a rider cares about what's in hand, not the
          full day's history. */}
      <View className="gap-3.5">
        <Text className="px-1 text-[19px] font-bold text-ink">Your deliveries</Text>
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
          <View className="items-center gap-1 rounded-2xl border bg-white px-6 py-10" style={{ borderColor: CARD_BORDER }}>
            {/* Active tab with nothing in hand → looping "searching" video
                (plays until a real active card replaces this branch); every
                other tab keeps the plain text empty state. */}
            {filter === 'active' ? (
              <SearchingForOrders />
            ) : (
              <>
                <Text className="text-center text-base font-semibold text-ink">Nothing here yet</Text>
                <Text className="text-center text-[13px] text-ink/50">
                  {filter === 'all' ? 'Deliveries you accept today will show up here.' : `No ${filter} deliveries yet.`}
                </Text>
              </>
            )}
            {/* Preview aid only — seeds one active/completed/cancelled order
                so the list layouts can be seen without waiting out the real
                accept-and-deliver flow. __DEV__-only — a real beta rider
                should never see a button that fabricates fake deliveries. */}
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
                {activeOrders.map((order) => (
                  <ActiveDeliveryCard
                    key={order.id}
                    order={order}
                    onPress={() => {
                      // 'assigned' → full-screen store-pickup nav (pickup leg).
                      // 'picked_up' with the whole trip picked up → the drop
                      // nav (customer map + maps hand-off). A picked_up leg
                      // that still has siblings awaiting pickup, or the OTP
                      // leg (arrived_at_customer), → OrderDetail.
                      if (order.status === 'assigned') {
                        navigation.navigate('PickupNavigation', { orderId: order.id });
                        return;
                      }
                      const hasUnpickedSibling =
                        !!order.tripId &&
                        activeOrders.some((o) => o.tripId === order.tripId && o.id !== order.id && o.status === 'assigned');
                      if (order.status === 'picked_up' && !hasUnpickedSibling) {
                        navigation.navigate('DeliveryNavigation', { orderId: order.id });
                      } else {
                        navigation.navigate('OrderDetail', { orderId: order.id });
                      }
                    }}
                  />
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

      {/* ponytail: __DEV__-only — the Test button's premium white bottom sheet.
          Remove with DEMO_OFFER + the Test button before shipping. */}
      <DispatchOfferSheet offer={demoOffer} onAccept={acceptDemoOffer} onClose={() => setDemoOffer(null)} windowSeconds={30 * 60} />
    </ScrollView>
  );
}
