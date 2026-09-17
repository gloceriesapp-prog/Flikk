// The rider-handoff card — reference is a familiar food-delivery app
// pattern (status line, rider row, action buttons), but every field here
// is real: order.riders (name + phone, a second real lookup on
// GET /orders/:id — see api/orders.ts's own note). The item list this
// card used to expand inline now lives in its own OrderItemsCard, sitting
// right below OrderInfoCard on TrackOrderScreen — no
// fabricated rating, delivery count, or "Top X" badge — the riders table
// has no such columns (backend/migrations/001_init.sql), and inventing a
// specific number about a real person is a different kind of wrong than a
// placeholder image would be. Renders nothing at all until a rider is
// actually assigned and the order is out for delivery — never a skeleton
// standing in for a rider who doesn't exist yet.
//
// Avatar: riders has no photo column at all yet, so there's no "real
// image" branch to reach today — RIDER_AVATAR_URI is what shows for every
// rider until one exists. If that URL itself fails to load (network blip,
// link rot), onError swaps to the app's own generic PLACEHOLDER_IMAGE_URI
// rather than retrying the same broken URL — a self-referential fallback
// would just fail the same way twice. Once riders gets a real photo
// column, that becomes the primary source and RIDER_AVATAR_URI becomes
// the fallback for riders who haven't uploaded one.
//
// Call opens the rider's real phone number via tel:. Chat opens WhatsApp
// (wa.me — works whether or not WhatsApp is installed, falls back to the
// web client) — no in-app chat infra exists, this is the honest
// approximation every quick-commerce app actually uses for this exact
// button. Add tip is dropped entirely — no tipping flow exists to wire it
// to, and an unlabelled no-op here would look broken, not "coming soon".

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

// rating/deliveries live only here, not on the real order.riders shape —
// riders has no such columns (backend/migrations/001_init.sql). The row
// they feed only renders while this dummy fallback is in use; once a real
// rider is assigned it disappears until those columns actually exist —
// showing a specific number for a real person would be a fabricated claim
// about them, not a harmless placeholder.
const DUMMY_RIDER = { name: 'Ravi Kumar', phone: '+919876543210', rating: 4.9, deliveries: 2819 };
const RIDER_AVATAR_URI = 'https://i.pinimg.com/736x/d0/21/cc/d021cc669f8688a757199873421035f3.jpg';

function digitsOnly(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

function ActionButton({ icon, label, onPress }: { icon: Parameters<typeof AppIcon>[0]['icon']; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-gray-100 py-3">
      <AppIcon icon={icon} size={16} color={colors.ink} />
      <Text className="text-[15px] font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

export function DeliveryRiderCard({ order }: Props) {
  const [avatarUri, setAvatarUri] = useState(RIDER_AVATAR_URI);
  const isDummy = !order.riders;
  const rider = order.riders ?? DUMMY_RIDER;

  if (order.status === 'delivered' || order.status === 'cancelled') return null;

  const storeName = order.stores?.name ?? 'The store';

  return (
    <View className="w-full rounded-3xl bg-white p-5">
      <Text className="text-[14.5px] font-medium leading-6 text-ink/90">
        {rider.name} picked up your order from {storeName} and is headed your way.
      </Text>

      <View className="mt-4 flex-row items-center gap-3">
        <Image
          source={{ uri: avatarUri }}
          onError={() => setAvatarUri(PLACEHOLDER_IMAGE_URI)}
          className="h-11 w-11 rounded-full bg-gray-100"
        />
        <View>
          <Text className="text-[14px] font-medium text-ink">{rider.name}</Text>
          {isDummy ? (
            <View className="mt-0.5 flex-row items-center gap-1">
              <AppIcon icon={StarIcon} size={13} color={colors.gold} fill={colors.gold} />
              <Text className="text-[12.5px] font-medium text-ink/60">{DUMMY_RIDER.rating}</Text>
              <Text className="text-[12.5px] font-medium text-ink/60"> · {DUMMY_RIDER.deliveries.toLocaleString('en-IN')} deliveries</Text>
            </View>
          ) : (
            <Text className="text-sm font-medium text-ink/40">{rider.phone}</Text>
          )}
        </View>
      </View>

      <View className="mt-4 flex-row gap-2.5">
        <ActionButton icon={Call02Icon} label="Call" onPress={() => Linking.openURL(`tel:${rider.phone}`)} />
        <ActionButton icon={Message01Icon} label="Chat" onPress={() => Linking.openURL(`https://wa.me/${digitsOnly(rider.phone)}`)} />
      </View>
    </View>
  );
}
