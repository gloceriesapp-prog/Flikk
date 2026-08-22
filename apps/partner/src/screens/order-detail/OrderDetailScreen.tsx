// Order detail (P3) — reached from OrderCard's "View Order". Replicates
// the reference: back + copy-id header, customer/time row, collapsible
// itemised "Order details" card, bottom bar with total bill + the status
// action.
//
// Order is read live from useOrdersStore by orderId (not passed as a
// route param) — see store/useOrdersStore.ts's own note on why. No Reject
// here (or anywhere in this app) — rejecting an order isn't a transition
// this app owns, per specs/02-partner-app/flows.md's "Partner app triggers
// no status transition other than `packed`"; useOrdersStore.rejectOrder
// stays unused/available for whenever that's actually wired to a backend
// cancel call.

import { ArrowLeft01Icon, Cash01Icon, Copy01Icon, Mic01Icon, PrinterIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useOrdersStore } from '../../store/useOrdersStore';
import { PLATFORM_COMMISSION_PERCENT } from '../orders/data';
import type { AppStackParamList } from '../../navigation/types';
import { OrderDetailItemRow } from './components/OrderDetailItemRow';
import { OrderDetailSectionHeader } from './components/OrderDetailSectionHeader';
import { OrderPayoutBreakdown } from './components/OrderPayoutBreakdown';
import { SlideToConfirmButton } from './components/SlideToConfirmButton';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderDetail'>;

const STATUS_BADGE_LABEL = { placed: 'New', packed: 'Awaiting pickup', out_for_delivery: 'Out for delivery' } as const;

const PAYMENT_MODE_LABEL = { prepaid: 'Paid via UPI', cod: 'Cash on delivery' } as const;

// "7th", "2nd", "11th"... — the standard English-ordinal exceptions are the
// 11/12/13 teens, everything else keys off the last digit.
function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function OrderDetailScreen({ route, navigation }: Props) {
  const order = useOrdersStore((state) => state.orders.find((o) => o.id === route.params.orderId));
  const markPacked = useOrdersStore((state) => state.markPacked);
  const [itemsExpanded, setItemsExpanded] = useState(true);

  if (!order) {
    navigation.goBack();
    return null;
  }

  const isPlaced = order.status === 'placed';
  const commissionAmount = Math.round((order.total * PLATFORM_COMMISSION_PERCENT) / 100);
  const netPayout = order.total - commissionAmount;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable onPress={() => navigation.goBack()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          {/* No voice-note/print backend yet (specs/05-platform doesn't cover
              either) — stubbed rather than silently doing nothing, same
              convention as the notification bell on the Orders screen. */}
          <Pressable onPress={() => {}} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <AppIcon icon={Mic01Icon} size={17} color={colors.ink} />
          </Pressable>
          <Pressable onPress={() => {}} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <AppIcon icon={PrinterIcon} size={17} color={colors.ink} />
          </Pressable>
          <Pressable className="flex-row items-center gap-1.5 rounded-full bg-gray-100 px-3.5 py-2.5">
            <Text className="text-sm font-bold text-ink">{order.id}</Text>
            <AppIcon icon={Copy01Icon} size={14} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6">
        <View className="gap-3 rounded-3xl bg-[#F9FAFB] p-4">
          <View>
            <Text className="text-2xl font-semibold text-black">{order.customerName}</Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <AppIcon
                icon={order.paymentMode === 'prepaid' ? Wallet01Icon : Cash01Icon}
                size={13}
                color={`${colors.ink}80`}
              />
              <Text className="text-sm font-medium text-ink/60">{PAYMENT_MODE_LABEL[order.paymentMode]}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between border-t border-black/5 pt-3">
            <Text className="text-sm font-medium text-ink/80">
              {order.customerName.split(' ')[0]}&apos;s {ordinal(order.orderCount)} order
            </Text>
            <Text className="text-sm font-medium text-ink/60">{order.placedAtTime}</Text>
          </View>
        </View>

        <View className="gap-1 rounded-3xl bg-[#F9FAFB] p-4">
          <OrderDetailSectionHeader
            itemCount={order.items.length}
            expanded={itemsExpanded}
            onToggle={() => setItemsExpanded((prev) => !prev)}
          />
          {itemsExpanded && (
            <View className="mt-2 gap-1 border-t border-black/5 pt-2">
              {order.items.map((item) => (
                <OrderDetailItemRow key={item.name} item={item} />
              ))}
            </View>
          )}
        </View>

        <OrderPayoutBreakdown
          orderTotal={order.total}
          commissionPercent={PLATFORM_COMMISSION_PERCENT}
          commissionAmount={commissionAmount}
          netPayout={netPayout}
        />
      </ScrollView>

      <View className="px-5 pb-9 pt-2">
        {isPlaced ? (
          <SlideToConfirmButton
            label="Mark Packed"
            sublabel="Slide when it's packaged & ready for pickup"
            successLabel="Packed!"
            onConfirm={() => {
              markPacked(order.id);
              navigation.goBack();
            }}
          />
        ) : (
          <View className="h-[68px] w-full items-center justify-center rounded-full bg-gray-100">
            <Text className="text-sm font-medium text-ink/60">{STATUS_BADGE_LABEL[order.status]}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
