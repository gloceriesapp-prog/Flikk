// Order card — redesigned per two explicit references: a hand-drawn
// wireframe (icon-free "Delivery by 4:30 PM" header, 3-photo item stack +
// count, expandable item list, date + total footer) and a Myntra-style
// "Delivered" status block (status icon bubble, store name, rate-this-order
// prompt). Real white card on PurchaseScreen's own #FCFCFB background.
//
// Status icon bubble replaces the old text-only status pill — PackageIcon
// (live, green), PackageDeliveredIcon (delivered, ink-on-mint), CancelCircleIcon
// (cancelled, red) — same color meaning as before, just given a real icon
// instead of a colored word.
//
// Headline for a live order is now the real delivery-by CLOCK time
// (estimateDeliveryTime, same math TrackOrderScreen/ReceiptScreen use),
// matching the wireframe's "Delivery by 4:30 PM" instead of a countdown —
// still nothing fabricated, same underlying Date just formatted differently.
//
// Item row is now a real expand/collapse (useState) — tapping "N items"
// reveals every item's own name + photo below the thumbnail stack, tapping
// again collapses it. This is local, per-card UI state, not new data.
//
// The star-rating row only renders for delivered orders — decorative for
// now (no rating-submission backend/screen exists yet), same "UI exists,
// flow not wired" convention already used elsewhere in this app (e.g.
// ProductCardView's own unwired bookmark heart) rather than either faking a
// real average rating or blocking this redesign on building that feature.

import { useState } from 'react';
import {
  ArrowRight01Icon,
  CancelCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PackageDeliveredIcon,
  PackageIcon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { estimateDeliveryTime } from '../../../utils/estimateDelivery';
import type { PurchaseOrder } from '../data';
import { ItemThumbnailStack } from './ItemThumbnailStack';

interface Props {
  order: PurchaseOrder;
  onPress?: () => void;
}

function statusFor(order: PurchaseOrder) {
  if (order.status === 'cancelled') {
    return { icon: CancelCircleIcon, color: colors.danger, headline: 'Cancelled' };
  }
  if (order.status === 'delivered') {
    return { icon: PackageDeliveredIcon, color: colors.success, headline: 'Delivered' };
  }
  const etaTime = estimateDeliveryTime(order.placedAtIso, order.avgPrepMinutes).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return { icon: PackageIcon, color: colors.success, headline: `Delivery by ${etaTime}` };
}

export function OrderRow({ order, onPress }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = statusFor(order);

  return (
    <View className="mb-3.5 rounded-2xl border border-black/[0.06] bg-white p-4 ">
      <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${status.color}17` }}>
          <AppIcon icon={status.icon} size={21} color={status.color} strokeWidth={1.8} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>
            {status.headline}
          </Text>
          <Text className="mt-0.5 text-[12px] font-medium text-ink/45" numberOfLines={1}>
            {order.storeName}
          </Text>
        </View>
        {onPress && <AppIcon icon={ArrowRight01Icon} size={16} color={`${colors.ink}55`} />}
      </Pressable>

      <Pressable onPress={() => setExpanded((v) => !v)} className="mt-3.5 flex-row items-center gap-3">
        <ItemThumbnailStack items={order.items} />
        <Text className="flex-1 text-[13px] font-semibold text-ink/70">
          {order.items.length} item{order.items.length === 1 ? '' : 's'}
        </Text>
        <AppIcon icon={expanded ? ChevronUpIcon : ChevronDownIcon} size={17} color={`${colors.ink}55`} strokeWidth={1.8} />
      </Pressable>

      {expanded && (
        <View className="mt-3 gap-2.5 rounded-xl bg-[#FAFAF9] p-3">
          {order.items.map((item) => (
            <View key={item.name} className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 overflow-hidden rounded-lg bg-gray-100">
                <Image source={{ uri: item.imageUri }} className="h-full w-full" resizeMode="cover" />
              </View>
              <Text className="flex-1 text-[13px] font-medium text-ink/80" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-[12px] font-bold text-ink/40">x{item.quantity}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="mb-3 mt-3.5 h-px bg-black/[0.06]" />

      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] font-medium text-ink/45">{order.placedAtLabel}</Text>
        <Text className="text-[14px] font-bold tabular-nums text-ink">₹{order.total.toFixed(0)}</Text>
      </View>

      {order.status === 'delivered' && (
        <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-[#FDF6E9] px-3 py-2.5">
          <View className="flex-row">
            {[0, 1, 2, 3, 4].map((i) => (
              <AppIcon key={i} icon={StarIcon} size={14} color={colors.gold} fill={colors.gold} strokeWidth={0} />
            ))}
          </View>
          <Text className="flex-1 text-[12px] font-semibold text-ink/70">Rate your order</Text>
        </View>
      )}
    </View>
  );
}
