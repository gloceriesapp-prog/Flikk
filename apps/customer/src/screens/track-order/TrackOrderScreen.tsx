// Reached from ReceiptScreen's "Track Order" button. Status-only, 4-stage
// timeline (placed -> packed -> out_for_delivery -> delivered), no live
// map/GPS — CLAUDE.md scopes v1 tracking to status-only, deliberately, even
// though a rider app exists in this product. No real order-status backend
// is wired to this screen yet (see track-order/data.ts) — the timeline
// shows a fixed demo progress state, ready to swap for a real order's
// actual status the same shape already matches
// (backend/src/lib/orderStateMachine.ts).

import { useState } from 'react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { OrderInfoCard } from './components/OrderInfoCard';
import { TrackingTimeline } from './components/TrackingTimeline';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'TrackOrder'>;

export function TrackOrderScreen({ navigation, route }: Props) {
  const { orderId, paymentMethodLabel } = route.params;
  const [orderedAt] = useState(() => new Date());

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center px-2 pb-2 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-bold text-ink">Track Order</Text>
        <View className="h-11 w-11" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="items-center gap-5 px-5 pb-8 pt-2">
        <OrderInfoCard orderId={orderId} paymentMethodLabel={paymentMethodLabel} orderedAt={orderedAt} />

        <View className="w-full rounded-3xl border border-gray-100 bg-gray-100 p-5 shadow-sm shadow-black/5">
          <TrackingTimeline orderedAt={orderedAt} />
        </View>

        <Text className="px-6 text-center text-sm font-medium text-gray-500">
          Thanks for shopping, we&apos;ll be here when you need us again.
        </Text>
      </ScrollView>
    </View>
  );
}
