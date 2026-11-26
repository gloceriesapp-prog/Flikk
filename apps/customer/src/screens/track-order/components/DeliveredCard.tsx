// Delivered by a rider: one card with how long the order took, a tap-to-rate
// row (the order's real review) and a call row in case it hasn't reached
// the customer's hands.
import { useContext } from 'react';
import { Call02Icon } from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import type { ApiOrder } from '../../../api/orders';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage as Image } from '../../../components/AppImage';
import { IconlyStar } from '../../../components/icons/IconlyStar';
import { useOrderRating } from '../../../features/order-rating/useOrderRating';
import { actionColors } from '../../../theme/tokens';
import { TrackingPreviewContext } from '../state/trackingPreview';
import { RIDER_AVATAR, riderDialNumber } from './DeliveryRiderCard';

const ETA_GRADIENT = ['#3B82FF', '#155DFC'] as const;
const DIVIDER = '#EEF0F3';
const BUBBLE = 40;

// Whole minutes from placing the order to delivery; null when unknown.
export function deliveredInMinutes(order: Pick<ApiOrder, 'placed_at' | 'delivered_at'>): number | null {
  const placed = Date.parse(order.placed_at ?? '');
  const delivered = Date.parse(order.delivered_at ?? '');
  if (!Number.isFinite(placed) || !Number.isFinite(delivered) || delivered < placed) return null;
  return Math.max(1, Math.round((delivered - placed) / 60_000));
}

export function DeliveredCard({ order }: { order: ApiOrder }) {
  const riderName = order.riders?.name?.trim() || 'your delivery partner';
  const minutes = deliveredInMinutes(order);
  // The dev preview rates into the local sample store, never the server.
  const rating = useOrderRating(order.id, true, useContext(TrackingPreviewContext));
  const stars = rating.rating || rating.saved;
  const dialNumber = riderDialNumber(order.riders?.phone);

  function callRider() {
    if (!dialNumber) return;
    void Linking.openURL(`tel:${dialNumber}`).catch(() => {
      Alert.alert('Couldn’t open the dialer', 'You can dial the rider’s number from your Phone app.');
    });
  }

  return (
    <View className="w-full overflow-hidden rounded-[20px] border border-[#E6E8EC] bg-white">
      <View className="flex-row items-center gap-4 px-5 py-4">
        <View className="min-w-0 flex-1">
          <Text className="text-[17px] font-bold leading-[22px] text-ink">Your order was delivered!</Text>
          <Text numberOfLines={1} className="mt-1 text-[14px] font-medium leading-5 text-ink/55">Completed by {riderName}</Text>
        </View>
        {minutes !== null ? (
          <LinearGradient colors={ETA_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: 58, height: 58, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
            <View accessible accessibilityLabel={`Delivered in ${minutes} minutes`} className="items-center">
              <Text className="text-[25px] font-bold leading-[27px] text-white">{minutes}</Text>
              <Text className="text-[12.5px] font-semibold leading-[15px] text-white">{minutes === 1 ? 'min' : 'mins'}</Text>
            </View>
          </LinearGradient>
        ) : null}
      </View>

      {/* Rate row while the order can be rated, and after (filled stars);
          hidden when there's nothing to show (signed out, still loading). */}
      {rating.visible || stars > 0 ? <>
      <View style={{ height: 1, backgroundColor: DIVIDER }} />
      <View className="flex-row items-center gap-3 px-5 py-3.5">
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[14.5px] font-medium text-ink">
          {rating.visible ? 'How was your delivery?' : 'Thanks for rating!'}
        </Text>
        <View className="flex-row">
          {[1, 2, 3, 4, 5].map(value => (
            <Pressable key={value} onPress={() => void rating.rate(value)} disabled={!rating.visible || rating.isSaving}
              accessibilityRole="button" accessibilityLabel={`Rate ${value} out of 5`}
              accessibilityState={{ selected: value <= stars, disabled: !rating.visible }}
              hitSlop={4} className="h-9 w-8 items-center justify-center">
              <IconlyStar size={26} color={value <= stars ? '#E5A900' : '#B4BAC2'} fill={value <= stars ? '#FFC928' : undefined} />
            </Pressable>
          ))}
        </View>
      </View>
      {rating.error ? <Text className="-mt-1.5 px-5 pb-3 text-[12.5px] font-medium text-[#D64545]">{rating.error}</Text> : null}
      </> : null}

      <View style={{ height: 1, backgroundColor: DIVIDER }} />
      <Pressable onPress={callRider} disabled={!dialNumber} accessibilityRole="button" accessibilityLabel="Call delivery partner"
        accessibilityState={{ disabled: !dialNumber }} className="flex-row items-center gap-3 px-5 py-4 active:bg-[#F6F8FB]"
        style={{ opacity: dialNumber ? 1 : 0.5 }}>
        <Text numberOfLines={2} className="min-w-0 flex-1 text-[14.5px] font-medium text-ink">Not here yet? Call delivery partner</Text>
        <View className="flex-row items-center">
          <Image source={{ uri: RIDER_AVATAR }} style={{ width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2, borderWidth: 2, borderColor: '#FFFFFF' }}
            contentFit="cover" className="bg-gray-200" />
          <View className="-ml-2.5 items-center justify-center rounded-full border-2 border-white"
            style={{ width: BUBBLE, height: BUBBLE, backgroundColor: actionColors.soft }}>
            <AppIcon icon={Call02Icon} size={20} color={actionColors.fill} strokeWidth={2} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
