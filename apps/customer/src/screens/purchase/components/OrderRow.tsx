// Order card. Real white card on PurchaseScreen's own #FCFCFB background.
//
// Header is title-only now — no status icon bubble, no store-name
// subheading — per an explicit ask. Just a plain status message ("On the
// way" / "Delivered" / "Cancelled"), colored per status, no estimated
// clock time (that needed avgPrepMinutes math nobody asked to see spelled
// out here) and no icon glyph competing with it.
//
// Item row is now a real expand/collapse (useState) — tapping "Items:"
// reveals every item's own name + photo below it, tapping again collapses
// it. This is local, per-card UI state, not new data. Layout order (photo
// stack + count, THEN a divider, THEN the "Items:" toggle row) matches a
// later hand-drawn wireframe exactly — the divider sits above "Items:",
// not below the expanded list the way an earlier pass had it, and the
// expand chevron lives on "Items:" itself rather than on the thumbnail
// row above it.
//
// The star-rating row only renders for delivered orders — decorative for
// now (no rating-submission backend/screen exists yet), same "UI exists,
// flow not wired" convention already used elsewhere in this app (e.g.
// ProductCardView's own unwired bookmark heart) rather than either faking a
// real average rating or blocking this redesign on building that feature.

import { useState } from 'react';
import { ArrowRight01Icon, ChevronDownIcon, ChevronUpIcon, StarIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { PurchaseOrder } from '../data';
import { ItemThumbnailStack } from './ItemThumbnailStack';

interface Props {
  order: PurchaseOrder;
  onPress?: () => void;
}

function statusFor(order: PurchaseOrder) {
  if (order.status === 'cancelled') return { color: colors.danger, headline: 'Cancelled' };
  if (order.status === 'delivered') return { color: colors.success, headline: 'Delivered' };
  return { color: colors.success, headline: 'On the way' };
}

export function OrderRow({ order, onPress }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = statusFor(order);

  return (
    <View className="mb-3 rounded-2xl bg-[#F8F8F6] p-3.5">
      <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center gap-2.5">
        <Text className="flex-1 text-[16px] font-semibold" style={{ color: status.color }} numberOfLines={1}>
          {status.headline}
        </Text>
        {onPress && <AppIcon icon={ArrowRight01Icon} size={15} color={`${colors.ink}55`} />}
      </Pressable>

      <View className="mt-3 flex-row items-center gap-2.5">
        <ItemThumbnailStack items={order.items} />
        <Text className="flex-1 text-[13px] font-semibold text-ink/70">
          {order.items.length} item{order.items.length === 1 ? '' : 's'}
        </Text>
      </View>

      <View className="my-2.5 h-px bg-black/[0.06]" />

      <Pressable onPress={() => setExpanded((v) => !v)} className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-ink/70">Items:</Text>
        <AppIcon icon={expanded ? ChevronUpIcon : ChevronDownIcon} size={16} color={`${colors.ink}55`} strokeWidth={1.8} />
      </Pressable>

      {expanded && (
        <View className="mt-2.5 gap-2 rounded-xl bg-[#FAFAF9] p-2.5">
          {order.items.map((item) => (
            <View key={item.name} className="flex-row items-center gap-2.5">
              <View className="h-8 w-8 overflow-hidden rounded-lg bg-gray-100">
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

      {order.status === 'delivered' && (
        <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-[#FDF6E9] px-3 py-2">
          <View className="flex-row">
            {[0, 1, 2, 3, 4].map((i) => (
              <AppIcon key={i} icon={StarIcon} size={13} color={colors.gold} fill={colors.gold} strokeWidth={0} />
            ))}
          </View>
          <Text className="flex-1 text-[12px] font-semibold text-ink/70">Rate your order</Text>
        </View>
      )}
    </View>
  );
}
