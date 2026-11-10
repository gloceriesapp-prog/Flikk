// Rider card remains visible for active orders, including assignment pending.
import { Call02Icon } from '@hugeicons/core-free-icons';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import type { ApiOrder } from '../../../api/orders';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage as Image } from '../../../components/AppImage';
import { colors } from '../../../theme/tokens';

interface Props {
  order: ApiOrder;
}

// Fixed generic rider avatar — deliberately NOT the rider's real photo:
// riders.photo_url is an unvalidated path in the private rider-documents
// bucket (also holds Aadhaar/DL scans), so it's never surfaced to customers.
// Same image for every assigned rider; the real identity is name + phone
// below. No rider rating source exists either, so the card shows no rating.
const RIDER_AVATAR =
  'https://images.gloceries.com/appsui/rider-profile.png';

function riderDialNumber(phone: string | undefined): string | null {
  const compact = phone?.replace(/[\s()-]/g, '') ?? '';
  // Rider records can contain the older local or country-prefixed formats.
  if (/^\d{10}$/.test(compact)) return `+91${compact}`;
  if (/^91\d{10}$/.test(compact)) return `+${compact}`;
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

export function DeliveryRiderCard({ order }: Props) {
  const rider = order.riders;
  if (!['placed', 'packed', 'out_for_delivery'].includes(order.status)) return null;

  const hasArrived = order.status === 'out_for_delivery' && !!order.rider_arrived_at;
  const storeName = order.stores?.name ?? 'The store';
  const dialNumber = riderDialNumber(rider?.phone);
  const displayNumber = dialNumber?.replace(/^(\+91)(\d{5})(\d{5})$/, '$1 $2 $3');

  function callRider() {
    if (!dialNumber) return;
    void Linking.openURL(`tel:${dialNumber}`).catch(() => {
      Alert.alert('Couldn’t open the dialer', 'You can dial the rider’s number from your Phone app.');
    });
  }

  return (
    <View className="w-full rounded-3xl bg-white p-5">
      <Text className="text-[14.5px] font-medium leading-6 text-ink/90">
        {rider
          ? hasArrived
            ? `${rider.name} picked up your order from ${storeName}.`
            : order.status === 'out_for_delivery'
              ? `${rider.name} picked up your order from ${storeName} and is headed your way.`
              : order.status === 'packed'
                ? `${rider.name} will pick up your order from ${storeName}.`
                : `${rider.name} will pick up your order from ${storeName} once it’s ready.`
          : 'We’ll show your delivery partner here once a rider is assigned.'}
      </Text>

      <View className="mt-4 flex-row items-center gap-3">
        <Image
          source={{ uri: RIDER_AVATAR }}
          style={{
            height: 44,
            width: 44,
            borderRadius: 22,
          }}
          contentFit="cover"
          className="bg-gray-200"
        />

        <View className="min-w-0 flex-1">
          <Text numberOfLines={2} className="text-[14px] font-semibold text-ink">
            {rider?.name ?? 'Your delivery partner'}
          </Text>
          <Text className="mt-0.5 text-[12.5px] font-medium text-ink/60">
            {rider
              ? `${rider.deliveries.toLocaleString('en-IN')} ${rider.deliveries === 1 ? 'delivery' : 'deliveries'}`
              : 'Rider assignment pending'}
          </Text>
        </View>

        {rider ? (
          <Pressable
            onPress={callRider}
            disabled={!dialNumber}
            accessibilityRole="button"
            accessibilityLabel={displayNumber ? `Call rider at ${displayNumber}` : 'Call rider'}
            accessibilityState={{ disabled: !dialNumber }}
            className={`min-h-11 shrink-0 items-center justify-center rounded-2xl bg-gray-100 px-3 py-2 ${dialNumber ? '' : 'opacity-50'}`}
          >
            <View className="flex-row items-center gap-1.5">
              <AppIcon icon={Call02Icon} size={15} color={colors.ink} />
              <Text className="text-[13px] font-semibold text-ink">Call</Text>
            </View>
            {displayNumber ? (
              <Text numberOfLines={1} className="mt-0.5 text-[11px] font-medium tabular-nums text-ink/70">
                {displayNumber}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {order.status === 'out_for_delivery' && order.delivery_otp ? (
        <View className="mt-4 flex-row flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-100 px-4 py-3">
          <View className="min-w-[112px] flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-ink/75">Delivery code</Text>
            <Text className="mt-0.5 text-[13px] font-medium leading-5 text-ink/60">Share with your rider at the door</Text>
          </View>
          <Text
            accessibilityLabel={`Delivery code, ${order.delivery_otp.split('').join(' ')}`}
            className="shrink-0 text-[26px] font-bold tabular-nums tracking-[5px] text-ink"
          >
            {order.delivery_otp}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
