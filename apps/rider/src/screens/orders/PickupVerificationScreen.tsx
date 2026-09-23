// Pickup verification — the gate between "I've arrived at the store" and the
// real assigned→picked_up write. Rider confirms they have the right items in
// good condition for the right customer before we PATCH out_for_delivery.
//
// QR/barcode scan is a PRESENTATIONAL placeholder only: real scanning needs
// expo-camera + a native dev build + backend-issued order QR codes, none of
// which exist yet. The 3-item checklist IS the real verification gate — all
// three must be checked before "Verify & pick up" enables.
// ponytail: QR card is decorative; wire expo-camera + backend QR issuance
// when order labels actually carry a code.
//
// CTA is CORAL not the mockup's lime — CLAUDE.md makes coral the one and only
// CTA color (lime is reserved for active/online state). Same deviation the
// pickup-nav "I've arrived" button already documents.

import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert02Icon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  MoreHorizontalIcon,
  QrCode01Icon,
  ShoppingBag03Icon,
  Store01Icon,
} from '@hugeicons/core-free-icons';
import { Linking } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PickupVerification'>;

// The three real checks the rider physically verifies at the counter. All
// must be true to enable pickup — see allChecked below.
const CHECKS = [
  { key: 'items', label: 'Right items' },
  { key: 'condition', label: 'Good condition' },
  { key: 'name', label: 'Customer name matches' },
] as const;
type CheckKey = (typeof CHECKS)[number]['key'];

export function PickupVerificationScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  // Select the whole (stable-ref) activeOrders array and derive from it — a
  // selector that returns a fresh .filter()/[] every render makes zustand's
  // useSyncExternalStore loop ("getSnapshot should be cached" → max update
  // depth). Deriving below is plain render-time work, no new snapshot.
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const advanceOrderStatus = useRiderOrdersStore((s) => s.advanceOrderStatus);
  const order = activeOrders.find((o) => o.id === orderId);
  // Any sibling leg in the same trip still awaiting pickup — if so, the rider
  // heads to the next store (OrderDetail's multi-stop route), not the drop.
  const hasUnpickedSibling =
    !!order?.tripId &&
    activeOrders.some((o) => o.tripId === order.tripId && o.id !== order.id && o.status === 'assigned');
  const insets = useSafeAreaInsets();

  const [checked, setChecked] = useState<Record<CheckKey, boolean>>({ items: false, condition: false, name: false });
  const [confirming, setConfirming] = useState(false);
  const allChecked = CHECKS.every((c) => checked[c.key]);

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base font-semibold text-ink">This order is no longer active.</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-[14px] font-bold text-ink/60">Go back</Text>
        </Pressable>
      </View>
    );
  }

  // The one real backend write on the pickup leg: assigned→picked_up = PATCH
  // out_for_delivery (advanceOrderStatus). Throws on backend reject (demo-1
  // has no row → throws; real orders succeed) — surface it, don't swallow.
  // On success replace (back shouldn't dump the rider mid-drop back on this
  // verification screen): if the trip still has stores to pick up, go to
  // OrderDetail for the multi-stop route; otherwise straight to the customer
  // drop nav.
  const confirmPickup = async () => {
    if (confirming || !allChecked) return;
    setConfirming(true);
    try {
      await advanceOrderStatus(orderId);
      navigation.replace(hasUnpickedSibling ? 'OrderDetail' : 'DeliveryNavigation', { orderId });
    } catch (e) {
      setConfirming(false);
      Alert.alert('Could not confirm pickup', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  // Item missing/damaged → the rider needs the store to sort it out. Real
  // report-to-support flow needs a backend endpoint; for now route to the
  // store's own phone. ponytail: add a backend report when support exists.
  const reportIssue = () => {
    if (order.storePhone) {
      Alert.alert('Item missing or damaged?', 'Call the store to sort it out before picking up.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call store', onPress: () => Linking.openURL(`tel:${order.storePhone}`) },
      ]);
    } else {
      Alert.alert('Item missing or damaged?', `We don't have a phone number for ${order.storeName} on file.`);
    }
  };

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top }}>
      {/* Top bar — back, centered order number, overflow menu. */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
        >
          <AppIcon icon={ArrowLeft01Icon} size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="text-[15px] font-bold text-white">Order #{order.orderNumber}</Text>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <AppIcon icon={MoreHorizontalIcon} size={22} color="#FFFFFF" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-2 gap-4"
        showsVerticalScrollIndicator={false}
      >
        {/* QR/barcode card — presentational placeholder (see header note). */}
        <View className="items-center gap-3 py-2">
          <View className="h-52 w-52 items-center justify-center rounded-3xl bg-white">
            <AppIcon icon={QrCode01Icon} size={120} color={colors.ink} />
          </View>
          <Text className="text-[14px] font-semibold text-white/70">Scan QR / Barcode</Text>
        </View>

        {/* Order info — real itemCount + store name only (no fake bag count). */}
        <View className="gap-2.5 rounded-2xl bg-white/5 p-4">
          <View className="flex-row items-center gap-3">
            <AppIcon icon={ShoppingBag03Icon} size={20} color={colors.lime} />
            <Text className="text-[15px] font-semibold text-white">{order.itemCount} items</Text>
          </View>
          <View className="h-px bg-white/10" />
          <View className="flex-row items-center gap-3">
            <AppIcon icon={Store01Icon} size={20} color={colors.lime} />
            <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>{order.storeName}</Text>
          </View>
        </View>

        {/* Check items — the real gate. All 3 must toggle on. */}
        <View className="gap-1 rounded-2xl bg-white/5 p-4">
          <Text className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">Check items</Text>
          {CHECKS.map((c, i) => {
            const on = checked[c.key];
            return (
              <Pressable
                key={c.key}
                onPress={() => setChecked((prev) => ({ ...prev, [c.key]: !prev[c.key] }))}
                className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                {on ? (
                  <AppIcon icon={CheckmarkCircle02Icon} size={24} color={colors.lime} />
                ) : (
                  <View className="h-[22px] w-[22px] rounded-full border-2 border-white/25" />
                )}
                <Text className={`text-[15px] font-semibold ${on ? 'text-white' : 'text-white/60'}`}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer — coral "Verify & pick up" (dimmed until all checked) + the
          item-issue escape hatch. */}
      <View style={{ paddingBottom: insets.bottom + 16 }} className="gap-3 px-5 pt-3">
        <Pressable
          onPress={confirmPickup}
          disabled={!allChecked || confirming}
          className="h-14 items-center justify-center rounded-2xl"
          style={({ pressed }) => ({
            backgroundColor: colors.coral,
            opacity: !allChecked ? 0.4 : pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-[16px] font-bold text-white">{confirming ? 'Confirming…' : 'Verify & pick up'}</Text>
        </Pressable>

        <Pressable onPress={reportIssue} disabled={confirming} className="flex-row items-center justify-center gap-2 py-1">
          <AppIcon icon={Alert02Icon} size={16} color={colors.gold} />
          <Text className="text-[13px] font-semibold text-white/55">Item missing / damaged?</Text>
        </Pressable>
      </View>
    </View>
  );
}
