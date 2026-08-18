// "Purchase" tab (was "Order Again" in the bottom nav). Reached from
// BottomNavBar — see src/components/BottomNavBar/data.ts.
//
// Two states: an order exists (LiveOrderCard + past orders list, empty
// state and feature illustration both hidden) or none does (the original
// "No orders yet." empty state). `hasLiveOrder` stands in for a real
// order-history fetch — see data.ts for the placeholder dataset shape,
// which already mirrors specs/00-foundation/data-model.md's orders table.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { LIVE_ORDER, PAST_ORDERS } from './data';
import { LiveOrderCard } from './components/LiveOrderCard';
import { PastOrderCard } from './components/PastOrderCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Purchase'>;

const FEATURE_IMAGE_URI = 'https://i.pinimg.com/1200x/a1/dc/37/a1dc376c96e834e7ae7baf401202b79a.jpg';

export function PurchaseScreen({ navigation }: Props) {
  const hasLiveOrder = Boolean(LIVE_ORDER);

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="relative flex-row items-center px-5 pb-2 pt-2">
        <Pressable
          onPress={() => navigation.navigate('Home')}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center"
        >
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>

        {/* pointerEvents="none" — this label overlaps the back button (both
            occupy the same row via absolute positioning); without it RN
            intercepts the tap on this Text first and the button underneath
            never receives the press. */}
        <Text pointerEvents="none" className="absolute left-0 right-0 text-center text-xl font-semibold text-ink">
          Purchase
        </Text>
      </View>

      {hasLiveOrder ? (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-6 pb-10 pt-3" showsVerticalScrollIndicator={false}>
          <Text className="text-lg font-semibold text-ink">Live Order</Text>
          <LiveOrderCard
            order={LIVE_ORDER}
            onTrackOrder={() =>
              navigation.navigate('TrackOrder', { orderId: LIVE_ORDER.id, paymentMethodLabel: 'UPI' })
            }
          />

          {PAST_ORDERS.length > 0 && (
            <View className="mt-3 gap-3">
              <Text className="text-lg font-semibold text-ink">Past Orders</Text>
              {PAST_ORDERS.map((order) => (
                <PastOrderCard key={order.id} order={order} />
              ))}
            </View>
          )}

          <Text className="mt-4 px-2 text-center text-base font-semibold leading-6 text-gray-500">
            You&apos;re not just ordering. You&apos;re keeping{"\n"}
            local shops open. 🌾
          </Text>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-between pb-16" showsVerticalScrollIndicator={false}>
          <View>
            <Image source={{ uri: FEATURE_IMAGE_URI }} className="aspect-[4/5] w-3/5 self-center" resizeMode="cover" />
            <Text className="mt-5 px-8 text-center text-lg font-bold text-ink">No orders yet.</Text>
            <Text className="mt-1 px-8 text-center text-sm font-medium text-ink/50">
              They&apos;ll show up here once you place your first one.
            </Text>
          </View>

          <Text className="px-6 text-left text-[25px] font-semibold leading-8 text-gray-500">
            You&apos;re not just ordering. You&apos;re keeping
            local shops open. 🌾
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
