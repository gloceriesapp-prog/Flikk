// Out for delivery, rider assigned: one card under the map with the
// status, minutes left, a call row and the delivery code.
import { useMemo } from 'react';
import { Call02Icon } from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import type { ApiOrder } from '../../../api/orders';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage as Image } from '../../../components/AppImage';
import { actionColors } from '../../../theme/tokens';
import { usePurchaseClock } from '../../purchase/usePurchaseClock';
import { RIDER_AVATAR, riderDialNumber } from './DeliveryRiderCard';
import { arrivalDeadline } from './OrderInfoCard';

const ETA_GRADIENT = ['#3B82FF', '#155DFC'] as const;
const DIVIDER = '#EEF0F3';
// Rider photo and call button are the same size, overlapping slightly.
const BUBBLE = 40;

export function OnTheWayCard({ order }: { order: ApiOrder }) {
  const rider = order.riders;
  const riderName = rider?.name?.trim() || 'Your rider';
  const arrived = !!order.rider_arrived_at;
  const deadline = arrived ? null : arrivalDeadline(order);
  const deadlines = useMemo(() => (deadline === null ? [] : [deadline]), [deadline]);
  const now = usePurchaseClock(deadlines);
  // Minutes left until the promised time; past it, "soon" rather than 0.
  const minutes = deadline === null ? null : Math.ceil((deadline - now) / 60_000);
  const dialNumber = riderDialNumber(rider?.phone);

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
          <Text className="text-[17px] font-bold leading-[22px] text-ink">Your delivery partner</Text>
          <Text numberOfLines={2} className="mt-1 text-[14px] font-medium leading-5 text-ink/55">
            {arrived ? `${riderName} is at your location` : `${riderName} has picked up your order`}
          </Text>
        </View>
        <LinearGradient colors={ETA_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 58, height: 58, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
          <View accessible accessibilityLabel={arrived ? 'Arrived' : minutes !== null && minutes > 0 ? `${minutes} minutes left` : 'Arriving soon'} className="items-center">
            {arrived ? <Text className="text-[16px] font-bold text-white">Here</Text>
              : minutes !== null && minutes > 0 ? <>
                <Text className="text-[25px] font-bold leading-[27px] text-white">{minutes}</Text>
                <Text className="text-[12.5px] font-semibold leading-[15px] text-white">{minutes === 1 ? 'min' : 'mins'}</Text>
              </> : <Text className="text-[15px] font-bold text-white">Soon</Text>}
          </View>
        </LinearGradient>
      </View>

      <View style={{ height: 1, backgroundColor: DIVIDER }} />
      <Pressable onPress={callRider} disabled={!dialNumber} accessibilityRole="button" accessibilityLabel="Call delivery partner"
        accessibilityState={{ disabled: !dialNumber }} className="flex-row items-center gap-3 px-5 py-4 active:bg-[#F6F8FB]"
        style={{ opacity: dialNumber ? 1 : 0.5 }}>
        <Text numberOfLines={2} className="min-w-0 flex-1 text-[14.5px] font-medium text-ink">Have instructions? Call delivery partner</Text>
        <View className="flex-row items-center">
          <Image source={{ uri: RIDER_AVATAR }} style={{ width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2, borderWidth: 2, borderColor: '#FFFFFF' }}
            contentFit="cover" className="bg-gray-200" />
          <View className="-ml-2.5 items-center justify-center rounded-full border-2 border-white"
            style={{ width: BUBBLE, height: BUBBLE, backgroundColor: actionColors.soft }}>
            <AppIcon icon={Call02Icon} size={20} color={actionColors.fill} strokeWidth={2} />
          </View>
        </View>
      </Pressable>

      {order.delivery_otp ? (
        <>
          <View style={{ height: 1, backgroundColor: DIVIDER }} />
          <View className="flex-row items-center gap-4 px-5 py-4">
            <View className="min-w-0 flex-1">
              <Text className="text-[17px] font-bold leading-[22px] text-ink">Delivery code</Text>
              <Text numberOfLines={1} className="mt-1 text-[14px] font-medium leading-5 text-ink/55">Share with rider at the door</Text>
            </View>
            <View accessible accessibilityLabel={`Delivery code, ${order.delivery_otp.split('').join(' ')}`} className="flex-row gap-1.5">
              {order.delivery_otp.split('').map((digit, index) => (
                <View key={index} className="h-9 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: actionColors.soft }}>
                  <Text className="text-[17px] font-bold" style={{ color: actionColors.fill }}>{digit}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
