// Order detail (P3) — reached from OrderCard's "View Order". Replicates
// the reference: back + copy-id header, customer/time row, collapsible
// itemised "Order details" card, bottom bar with total bill + the status
// action.
//
// Order is read live from useOrdersStore by orderId (not passed as a
// route param) — see store/useOrdersStore.ts's own note on why. No manual
// Reject action on this screen specifically — OrderCard's own pending
// state (before acknowledge) is the only place a store owner backs out of
// an order, and useOrderExpiryWatcher's auto-reject-on-timeout covers the
// rest; a real reject call exists now (useOrdersStore.rejectOrder, PATCH
// /orders/:id/status → cancelled) but this screen doesn't surface it.

import { ArrowLeft01Icon, Cash01Icon, Copy01Icon, Mic01Icon, PrinterIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { ApiError } from '../../api/client';
import { useOrdersStore } from '../../store/useOrdersStore';
import type { AppStackParamList } from '../../navigation/types';
import { OrderDetailItemRow } from './components/OrderDetailItemRow';
import { OrderDetailSectionHeader } from './components/OrderDetailSectionHeader';
import { OrderPayoutBreakdown } from './components/OrderPayoutBreakdown';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderDetail'>;

// Same flat gray Orders/Payouts/Store settings already use (OrdersScreen.tsx's
// own PAGE_BG, itself matching apps/customer's checkout flow) — cards stay
// solid white on top of it, per an explicit ask to match it here too.
const PAGE_BG = '#F1F2F4';

const STATUS_BADGE_LABEL = { placed: 'New', packed: 'Awaiting pickup', out_for_delivery: 'Out for delivery' } as const;

const PAYMENT_MODE_LABEL = { prepaid: 'Paid via UPI', cod: 'Cash on delivery' } as const;

// "Sep 19, 2:30 PM" — date + time together, unlike order.placedAtTime
// (time-only, shared with IncomingOrderAlert's own "Time" row) since this
// screen can be reopened days later where a bare clock time alone would be
// ambiguous about which day.
function formatDateTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  const datePart = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
}

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

  if (!order) {
    navigation.goBack();
    return null;
  }

  const isPlaced = order.status === 'placed';
  // Real orders.item_total/commission_amount (screens/orders/data.ts's own
  // mapApiOrder) — never recomputed here. commissionPercent is DERIVED
  // from those two real numbers (not a hardcoded label) so it can never
  // silently drift from backend/src/lib/pricing.ts's own COMMISSION_RATE
  // the way this screen's old local 12%-flat guess already had.
  const commissionPercent = order.itemTotal > 0 ? Math.round((order.commissionAmount / order.itemTotal) * 100) : 0;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: PAGE_BG }} edges={['top']}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable onPress={() => navigation.goBack()} className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          {/* No voice-note/print backend yet (specs/05-platform doesn't cover
              either) — stubbed rather than silently doing nothing, same
              convention as the notification bell on the Orders screen. */}
          <Pressable onPress={() => {}} className="h-10 w-10 items-center justify-center rounded-full bg-white">
            <AppIcon icon={PrinterIcon} size={17} color={colors.ink} />
          </Pressable>
          <Pressable className="flex-row items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5">
            <Text className="text-[15px] font-medium text-ink">Order ID: {order.orderNumber}</Text>
            {/* <AppIcon icon={Copy01Icon} size={14} color={colors.ink} /> */}
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6">
        <View className="gap-3 rounded-3xl bg-white p-4">
          <View>
            <Text className="text-[18px] font-semibold text-black">{order.customerName}</Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <AppIcon
                icon={order.paymentMode === 'prepaid' ? Wallet01Icon : Cash01Icon}
                size={13}
                color={`${colors.ink}80`}
              />
              <Text className="text-[13px] font-medium text-ink/60">{PAYMENT_MODE_LABEL[order.paymentMode]}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between border-t border-black/5 pt-3">
            <Text className="text-[14px] font-medium text-ink/80">
              {order.customerName.split(' ')[0]}&apos;s {ordinal(order.orderCount)} order
            </Text>
            <Text className="text-[14px] font-medium text-ink/60">{formatDateTime(order.placedAtTimestamp)}</Text>
          </View>
        </View>

        <View className="gap-1 rounded-3xl bg-white p-4">
          <OrderDetailSectionHeader itemCount={order.items.length} />
          <View className="mt-2 gap-1 border-t border-black/5 pt-2">
            {order.items.map((item) => (
              <OrderDetailItemRow key={item.name} item={item} />
            ))}
          </View>
        </View>

        <OrderPayoutBreakdown
          orderTotal={order.itemTotal}
          commissionPercent={commissionPercent}
          commissionAmount={order.commissionAmount}
          netPayout={order.netPayout}
        />
      </ScrollView>

      <View className="px-5 pb-9 pt-2">
        {isPlaced ? (
          // Plain tap button, not a slide-to-confirm gesture — that drag
          // interaction stays specific to the rider app's own "Delivered"
          // action (apps/rider's own SlideToConfirmButton), which is a
          // genuinely higher-stakes, harder-to-undo action (confirming a
          // customer actually received their order) than a store owner
          // marking their own order packed for pickup.
          <Pressable
            onPress={() => {
              markPacked(order.id)
                .then(() => navigation.goBack())
                .catch((err) => {
                  Alert.alert('Could not update order', err instanceof ApiError ? err.message : 'Please try again.');
                });
            }}
            className="h-[68px] w-full items-center justify-center rounded-full bg-black active:opacity-80"
          >
            <Text className="text-lg font-medium text-white">Ready for Pickup</Text>
          </Pressable>
        ) : (
          <View className="h-[68px] w-full items-center justify-center rounded-full bg-white">
            <Text className="text-sm font-medium text-ink/60">{STATUS_BADGE_LABEL[order.status]}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
