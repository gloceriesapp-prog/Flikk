// Full detail for one active delivery — pickup/drop info, a real step
// progress bar, a "Navigate" button that deep-links into the device's own
// maps app (real, functional — no in-app map, per CLAUDE.md's own "no
// live GPS tracking" scope line), and the delivery-proof OTP step before
// the order can actually be marked delivered.

import { useState } from 'react';
import {
  Call02Icon,
  CheckmarkCircle02Icon,
  Location01Icon,
  Navigation03Icon,
  PackageIcon,
  Store01Icon,
} from '@hugeicons/core-free-icons';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { STATUS_STEPS, useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { DeliveryOtpModal } from './components/DeliveryOtpModal';
import { CancelOrderModal } from './components/CancelOrderModal';
import type { AppStackParamList } from '../../navigation/types';
import type { RiderOrder } from '../../data/mockOrders';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderDetail'>;

const STEP_LABEL: Record<RiderOrder['status'], string> = {
  assigned: 'Assigned',
  arrived_at_store: 'At store',
  picked_up: 'Picked up',
  arrived_at_customer: 'At customer',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const NEXT_ACTION_LABEL: Record<Exclude<RiderOrder['status'], 'delivered' | 'cancelled'>, string> = {
  assigned: "I've arrived at the store",
  arrived_at_store: "I've picked up the order",
  picked_up: "I've arrived at the customer",
  arrived_at_customer: 'Confirm delivery',
};

function openMaps(query: string) {
  const encoded = encodeURIComponent(query);
  void Linking.openURL(`https://maps.google.com/?q=${encoded}`);
}

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const order = useRiderOrdersStore((s) => s.activeOrders.find((o) => o.id === orderId));
  const advanceOrderStatus = useRiderOrdersStore((s) => s.advanceOrderStatus);
  const cancelOrder = useRiderOrdersStore((s) => s.cancelOrder);
  const [otpVisible, setOtpVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);

  if (!order) {
    // Already delivered/removed from activeOrders elsewhere (e.g. after
    // confirming delivery) — nothing left here to show, back out.
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base font-semibold text-ink">This order is no longer active.</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-[14px] font-bold text-ink/60">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const stepIndex = STATUS_STEPS.indexOf(order.status);

  function handlePrimaryAction() {
    if (order!.status === 'arrived_at_customer') {
      setOtpVisible(true);
      return;
    }
    advanceOrderStatus(order!.id);
  }

  function handleConfirmDelivery() {
    setOtpVisible(false);
    advanceOrderStatus(order!.id);
    navigation.goBack();
  }

  function handleConfirmCancel(reason: string) {
    setCancelVisible(false);
    cancelOrder(order!.id, reason);
    navigation.goBack();
  }

  const navigateTarget = order.status === 'assigned' || order.status === 'arrived_at_store' ? order.storeAddress : order.customerAddress;

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6 pt-safe-offset-4">
        <View>
          <Text className="text-[13px] text-ink/45">Order</Text>
          <Text className="text-2xl font-bold text-ink">{order.orderNumber}</Text>
        </View>

        {/* Step progress */}
        <View className="flex-row items-center">
          {STATUS_STEPS.map((step, index) => {
            const isDone = index <= stepIndex;
            const isLast = index === STATUS_STEPS.length - 1;
            return (
              <View key={step} className="flex-1 flex-row items-center">
                <View
                  className={`h-2.5 w-2.5 rounded-full ${isDone ? 'bg-lime-deep' : 'bg-gray-200'}`}
                />
                {!isLast ? <View className={`h-[2px] flex-1 ${index < stepIndex ? 'bg-lime-deep' : 'bg-gray-200'}`} /> : null}
              </View>
            );
          })}
        </View>
        <Text className="-mt-3 text-[12.5px] font-semibold text-ink/50">{STEP_LABEL[order.status]}</Text>

        <View className="gap-3 rounded-2xl bg-mist p-4">
          <View className="flex-row items-center gap-3">
            <AppIcon icon={Store01Icon} size={17} color={colors.limeDeep} />
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-ink">{order.storeName}</Text>
              <Text className="text-[12.5px] text-ink/50">{order.storeAddress}</Text>
            </View>
          </View>
          <View className="h-px bg-white" />
          <View className="flex-row items-center gap-3">
            <AppIcon icon={Location01Icon} size={17} color={colors.coral} />
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-ink">{order.customerName}</Text>
              <Text className="text-[12.5px] text-ink/50">{order.customerAddress}</Text>
            </View>
          </View>
        </View>

        <View className="gap-2.5 rounded-2xl border border-gray-100 px-4 py-3.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <AppIcon icon={PackageIcon} size={16} color={colors.ink} />
              <Text className="text-[13px] font-semibold text-ink/70">{order.itemCount} items · {order.distanceKm} km</Text>
            </View>
            <Text className="text-[15px] font-bold text-ink">₹{order.payout}</Text>
          </View>
          {/* Itemized payout breakup — an unexplained total is the #1
              driver of payout-dispute reviews in every gig app. */}
          <View className="gap-1 border-t border-mist pt-2.5">
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-ink/50">Base fare</Text>
              <Text className="text-[12.5px] text-ink/70">₹{order.baseFare}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-ink/50">Distance</Text>
              <Text className="text-[12.5px] text-ink/70">₹{order.distanceFare}</Text>
            </View>
            {order.surge > 0 ? (
              <View className="flex-row items-center justify-between rounded-lg bg-surge-soft px-2 py-1">
                <Text className="text-[12.5px] font-semibold text-surge">Surge</Text>
                <Text className="text-[12.5px] font-bold text-surge">+₹{order.surge}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => void Linking.openURL(`tel:${order.customerPhone}`)}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3.5"
        >
          <AppIcon icon={Call02Icon} size={16} color={colors.ink} />
          <Text className="text-[14px] font-semibold text-ink">Call {order.customerName.split(' ')[0]}</Text>
        </Pressable>

        {order.status !== 'delivered' ? (
          <Pressable
            onPress={() => openMaps(navigateTarget)}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-ink py-3.5"
          >
            <AppIcon icon={Navigation03Icon} size={16} color="#FFFFFF" />
            <Text className="text-[14px] font-semibold text-white">
              Navigate to {order.status === 'assigned' || order.status === 'arrived_at_store' ? 'store' : 'customer'}
            </Text>
          </Pressable>
        ) : null}

        {order.status !== 'delivered' ? (
          <Pressable onPress={() => setCancelVisible(true)} className="items-center py-2">
            <Text className="text-[13px] font-semibold text-danger">Cancel this delivery</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {order.status !== 'delivered' && order.status !== 'cancelled' ? (
        <View className="border-t border-mist px-5 pb-safe-offset-4 pt-4">
          <PrimaryButton
            label={NEXT_ACTION_LABEL[order.status]}
            onPress={handlePrimaryAction}
            trailingIcon={order.status === 'arrived_at_customer' ? CheckmarkCircle02Icon : undefined}
          />
        </View>
      ) : null}

      <DeliveryOtpModal visible={otpVisible} onCancel={() => setOtpVisible(false)} onConfirm={handleConfirmDelivery} />
      <CancelOrderModal visible={cancelVisible} onCancel={() => setCancelVisible(false)} onConfirm={handleConfirmCancel} />
    </View>
  );
}
