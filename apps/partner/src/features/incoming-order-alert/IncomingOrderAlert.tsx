// Centered order alert above every tab. Business actions and countdown remain
// owned by useIncomingOrderAlert; the backdrop cannot dismiss an order.

import { useState } from 'react';
import { Cancel01Icon, CheckmarkCircle02Icon, Clock01Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { STORE_REJECT_REASONS } from '@gloceries/shared';
import { useIncomingOrderAlert } from './useIncomingOrderAlert';
import { useOrderPolling } from './useOrderPolling';
import { AutoRejectChip } from './components/AutoRejectChip';
import { DeliverToSection } from './components/DeliverToSection';
import { ItemsSection } from './components/ItemsSection';
import { OrderInfoRow } from './components/OrderInfoRow';

export function IncomingOrderAlert() {
  useOrderPolling();
  const { activeOrder, secondsLeft, onAccept, onDecline, busy, error } = useIncomingOrderAlert();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const maxCardHeight = Math.min(640, height - insets.top - insets.bottom - 40);

  return (
    <Modal visible={activeOrder !== null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
      <View
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
      >
        {activeOrder && (
          <View accessibilityViewIsModal className="w-full overflow-hidden rounded-[28px] bg-white" style={{ maxWidth: 400, maxHeight: maxCardHeight }}>
            <StatusBar style="dark" />
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 20, gap: 18 }}>
              <View className="gap-1">
                <Text accessibilityRole="header" className="text-[24px] font-semibold tracking-tight text-black">New order received</Text>
                <Text className="text-[14px] font-medium leading-[20px] text-black/60">Review the items and accept to start preparing.</Text>
              </View>

              <View className="gap-3 rounded-2xl bg-[#F9FAFB] p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-[12px] font-medium text-black/50">Order ID</Text>
                    <Text className="text-[18px] font-semibold text-black" numberOfLines={1} ellipsizeMode="tail">{activeOrder.orderNumber}</Text>
                  </View>
                  <AutoRejectChip secondsLeft={secondsLeft} />
                </View>
                <View className="border-t border-black/5" />
                <View className="flex-row gap-2">
                  <OrderInfoRow icon={Clock01Icon} label="Received" value={activeOrder.placedAtTime} />
                  <OrderInfoRow icon={DeliveryTruck01Icon} label="Type" value="Delivery" />
                </View>
                <View className="border-t border-black/5" />
                <DeliverToSection customerName={activeOrder.customerName} />
                <View className="border-t border-black/5" />
                <ItemsSection items={activeOrder.items} />
              </View>

              <View className="gap-2">
                {error && <Text accessibilityLiveRegion="polite" className="text-center text-[13px] text-danger">{error}</Text>}
                <OrderAlertActions key={activeOrder.id} onAccept={onAccept} onDecline={onDecline} busy={busy} />
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

interface OrderAlertActionsProps {
  onAccept: () => Promise<void>;
  onDecline: (reason: string) => Promise<void>;
  busy: boolean;
}

// Pulled out only so the "just tapped Accept" micro-state (a brief label
// swap confirming the tap registered before the modal closes) doesn't
// clutter the parent's already-long return.
function OrderAlertActions({ onAccept, onDecline, busy }: OrderAlertActionsProps) {
  // Reject asks why first (STORE_REJECT_REASONS) — the code is stored as the
  // order's cancel_reason, shown to the customer's support and to admin.
  const [choosingReason, setChoosingReason] = useState(false);

  if (choosingReason) {
    return (
      <View className="w-full gap-2">
        <Text className="text-center text-base font-medium text-ink">Why are you rejecting this order?</Text>
        {STORE_REJECT_REASONS.map((option) => (
          <Pressable
            key={option.code}
            disabled={busy}
            onPress={() => void onDecline(option.code)}
            accessibilityRole="button"
            className="w-full items-center rounded-full border border-gray-200 bg-white py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text className="text-base font-medium text-ink">{option.label}</Text>
          </Pressable>
        ))}
        <Pressable disabled={busy} onPress={() => setChoosingReason(false)} accessibilityRole="button" className="w-full items-center py-2">
          <Text className="text-sm font-medium text-ink/50">Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="w-full gap-3">
      <Pressable
        onPress={() => void onAccept()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Accept order"
        accessibilityState={{ disabled: busy }}
        className="w-full flex-row items-center justify-center gap-2 rounded-full py-3"
        style={{ backgroundColor: '#00a63e', opacity: busy ? 0.65 : 1 }}
      >
        <AppIcon icon={CheckmarkCircle02Icon} size={20} color="#FFFFFF" />
        <Text className="text-[16px] font-semibold text-white">{busy ? 'Saving…' : 'Accept order'}</Text>
      </Pressable>
      <Pressable
        onPress={() => setChoosingReason(true)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Reject order"
        accessibilityState={{ disabled: busy }}
        className="w-full flex-row items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3"
        style={({ pressed }) => ({ opacity: pressed || busy ? 0.5 : 1 })}
      >
        <AppIcon icon={Cancel01Icon} size={18} color={colors.ink} />
        <Text className="text-base font-medium text-ink">Reject</Text>
      </Pressable>
    </View>
  );
}
