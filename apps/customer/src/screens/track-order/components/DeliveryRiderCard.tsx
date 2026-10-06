// Rider card remains visible for active orders, including assignment pending.
import { useState } from 'react';
import { Call02Icon, Message01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Linking, Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import type { ApiOrder } from '../../../api/orders';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';

interface Props {
  order: ApiOrder;
}

// Preserve the existing rating presentation; no rider rating field exists yet.
const DISPLAY_RATING = 4.9;
const RIDER_AVATAR_URI = 'https://i.pinimg.com/736x/d0/21/cc/d021cc669f8688a757199873421035f3.jpg';

function digitsOnly(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

function ActionButton({ icon, label, onPress, disabled = false }: { icon: Parameters<typeof AppIcon>[0]['icon']; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} style={{ opacity: disabled ? 0.45 : 1 }} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-gray-100 py-3">
      <AppIcon icon={icon} size={16} color={colors.ink} />
      <Text className="text-[15px] font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

export function DeliveryRiderCard({ order }: Props) {
  const [avatarUri, setAvatarUri] = useState(RIDER_AVATAR_URI);
  const rider = order.riders;
  const isRealRider = !!rider;
  if (!['placed', 'packed', 'out_for_delivery'].includes(order.status)) return null;

  const storeName = order.stores?.name ?? 'The store';

  return (
    <View className="w-full rounded-3xl bg-white p-5">
      <Text className="text-[14.5px] font-medium leading-6 text-ink/90">
        {rider
          ? order.status === 'out_for_delivery'
            ? `${rider.name} picked up your order from ${storeName} and is headed your way.`
            : `${rider.name} will pick up your order from ${storeName} once it’s ready.`
          : 'We’ll show your delivery partner here once a rider is assigned.'}
      </Text>

      {/* Delivery code — the real orders.delivery_otp (api/orders.ts), only
          non-null while out_for_delivery. Read it out to the rider at the
          door; they enter it to complete delivery. tabular-nums + wide
          tracking so the four digits read cleanly at a glance. */}
      {order.status === 'out_for_delivery' && order.delivery_otp ? (
        <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-lime-soft px-4 py-3">
          <View>
            <Text className="text-[12.5px] font-semibold uppercase tracking-wide text-lime-deep">Delivery code</Text>
            <Text className="mt-0.5 text-[13px] font-medium text-ink/60">Share with your rider at the door</Text>
          </View>
          <Text className="text-[28px] font-bold tabular-nums tracking-[6px] text-ink">{order.delivery_otp}</Text>
        </View>
      ) : null}

      <View className="mt-4 flex-row items-center gap-3">
        <Image
          source={{ uri: isRealRider ? avatarUri : PLACEHOLDER_IMAGE_URI }}
          onError={() => setAvatarUri(PLACEHOLDER_IMAGE_URI)}
          className="h-11 w-11 rounded-full bg-gray-100"
        />
        <View>
          <Text className="text-[14px] font-medium text-ink">{rider?.name ?? 'Your delivery partner'}</Text>
          {rider ? <View className="mt-0.5 flex-row items-center gap-1">
            <AppIcon icon={StarIcon} size={13} color={colors.gold} fill={colors.gold} />
            <Text className="text-[12.5px] font-medium text-ink/60">{DISPLAY_RATING}</Text>
            <Text className="text-[12.5px] font-medium text-ink/60"> · {rider.deliveries.toLocaleString('en-IN')} deliveries</Text>
          </View> : <Text className="mt-0.5 text-[12.5px] font-medium text-ink/50">Rider assignment pending</Text>}
          {rider ? <Text className="mt-0.5 text-[12.5px] font-medium text-ink/40">{rider.phone}</Text> : null}
        </View>
      </View>

      <View className="mt-4 flex-row gap-2.5">
        <ActionButton icon={Call02Icon} label="Call" disabled={!rider?.phone} onPress={() => { if (rider?.phone) void Linking.openURL(`tel:${rider.phone}`); }} />
        <ActionButton icon={Message01Icon} label="Chat" disabled={!rider?.phone} onPress={() => { if (rider?.phone) void Linking.openURL(`https://wa.me/${digitsOnly(rider.phone)}`); }} />
      </View>
    </View>
  );
}
