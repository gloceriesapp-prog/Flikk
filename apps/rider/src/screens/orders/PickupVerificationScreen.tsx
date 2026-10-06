// Pickup verification — the gate between "I've arrived at the store" and the
// real assigned→picked_up write. Rider confirms they have the right items in
// good condition for the right customer before we PATCH out_for_delivery.
//
// The 3-item checklist IS the real verification gate — all three must be
// checked before "Verify & pick up" enables. (QR/barcode scan will come back
// as a real expo-camera flow against backend-issued order codes; not now.)
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
  CustomerService01Icon,
  Store01Icon,
} from '@hugeicons/core-free-icons';
import { Linking } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { SlideToConfirmButton } from '../../components/SlideToConfirmButton';
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

// Mock item names already carry their pack size inline ("Tomatoes 1kg",
// "Amul Milk 500ml") — split the trailing unit off so the row can show the
// product name bold with the pack size as a quieter subtitle. Emoji stands in
// for a real product image (no catalog thumbnails on the mock — see header).
// ponytail: emoji avatar + regex unit split are placeholders; swap for real
// product image + unit fields when order_items carries them.
const UNIT_RE = /\s+(\d+\s?(?:kg|g|l|ml)|\(dozen\)|\(6 pack\))$/i;
function splitItem(name: string) {
  const m = name.match(UNIT_RE);
  return m ? { label: name.slice(0, m.index).trim(), unit: m[1].replace(/[()]/g, '') } : { label: name, unit: null };
}
function itemEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes('tomato')) return '🍅';
  if (n.includes('onion')) return '🧅';
  if (n.includes('potato')) return '🥔';
  if (n.includes('banana')) return '🍌';
  if (n.includes('milk') || n.includes('curd')) return '🥛';
  if (n.includes('egg')) return '🥚';
  if (n.includes('bread')) return '🍞';
  if (n.includes('oil')) return '🫗';
  if (n.includes('rice') || n.includes('dal') || n.includes('salt')) return '🌾';
  if (n.includes('noodles') || n.includes('maggi')) return '🍜';
  if (n.includes('biscuit') || n.includes('parle')) return '🍪';
  if (n.includes('chilli') || n.includes('tea')) return '🌶️';
  return '🛒';
}

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
    <View className="flex-1 bg-[#F1F1F4]" style={{ paddingTop: insets.top }}>
      {/* Top bar — back, centered order number, overflow menu. */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="text-[17px] font-semibold text-ink">Order #{order.orderNumber}</Text>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <AppIcon icon={CustomerService01Icon} size={22} color={colors.ink} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-2 gap-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Items — the rider eyeballs the real cart against the bag. Real
            order.items (name + qty); emoji stands in for a product image and
            the pack size is split off the name (splitItem). Store + count
            header sits on top so it's one card, not two. */}
        <View className="gap-1 rounded-2xl bg-white p-4">
          <View className="flex-row items-center justify-between pb-1">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
              {order.itemCount} items
            </Text>
            <View className="flex-row items-center gap-1.5">
              <AppIcon icon={Store01Icon} size={14} color={colors.ink} />
              <Text className="max-w-[180px] text-[12px] font-semibold text-ink/60" numberOfLines={1}>
                {order.storeName}
              </Text>
            </View>
          </View>
          {order.items.map((it, i) => {
            const { label, unit } = splitItem(it.name);
            return (
              <View
                key={`${it.name}-${i}`}
                className={`flex-row items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-ink/[0.06]' : ''}`}
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#F1F1F4]">
                  <Text className="text-[22px]">{itemEmoji(it.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>{label}</Text>
                  {(it.unit ?? unit) && <Text className="text-[12px] text-ink/45">{it.unit ?? unit}</Text>}
                </View>
                <Text className="text-[14px] font-bold text-ink tabular-nums">×{it.quantity}</Text>
              </View>
            );
          })}
        </View>

        {/* Check items — the real gate. All 3 must toggle on before pickup
            enables (allChecked). Hint spells out the "tap all" rule. */}
       <View className="gap-1 rounded-2xl bg-white p-4">
  <Text className="mb-1 text-[15px] font-semibold text-ink">
    Check the items and complete all three confirmations before pickup.
  </Text>

  {CHECKS.map((c, i) => {
    const on = checked[c.key];

    return (
      <Pressable
        key={c.key}
        onPress={() =>
          setChecked((prev) => ({
            ...prev,
            [c.key]: !prev[c.key],
          }))
        }
        className={`flex-row items-center gap-3 py-3 ${
          i > 0 ? 'border-t border-ink/10' : ''
        }`}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
        })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
      >
        {/* Square checkbox */}
        <View
          className={`h-[22px] w-[22px] items-center justify-center border-2 ${
            on
              ? 'border-ink bg-ink'
              : 'border-ink/25 bg-transparent'
          }`}
        >
          {on && (
            <Text className="text-[14px] font-bold leading-[16px] text-white">
              ✓
            </Text>
          )}
        </View>

        <Text
          className={`flex-1 text-[15px] font-medium ${
            on ? 'text-ink' : 'text-ink/50'
          }`}
        >
          {c.label}
        </Text>
      </Pressable>
    );
  })}
</View>
      </ScrollView>

      {/* Footer — slide-to-confirm "Verify & pick up" (gated until all three
          checks are ticked, dimmed + un-grabbable until then) + the
          item-issue escape hatch. A deliberate gesture, not a tap: same
          reasoning OrderDetail's own pickup slide applies — this is the real
          assigned→picked_up write, worth the friction. */}
      <View style={{ paddingBottom: insets.bottom + 16 }} className="gap-3 px-5 pt-3">
        <SlideToConfirmButton
          label={allChecked ? 'Slide to verify & pick up' : 'Tick all three to pick up'}
          successLabel="Picked up"
          disabled={!allChecked || confirming}
          onConfirm={confirmPickup}
        />

        <Pressable onPress={reportIssue} disabled={confirming} className="flex-row items-center justify-center gap-2 py-1">
          <AppIcon icon={Alert02Icon} size={16} color={colors.gold} />
          <Text className="text-[13px] font-semibold text-ink/55">Item missing / damaged?</Text>
        </Pressable>
      </View>
    </View>
  );
}
