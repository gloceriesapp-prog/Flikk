// One flat row — replaces LiveOrderCard/PastOrderCard's separate card
// designs (gradient-wash card + CTA button for live, flat gray card for
// past) with a single plain row per an explicit ask to strip the card/
// background chrome entirely: item-photo stack on the left (ItemThumbnailStack
// — up to 3 items each get their own circle; past 3, it's 2 circles + a
// "+N" badge for the rest), a headline + "Items: …" line in the middle,
// chevron on the right. No card background, no border, no CTA button — the
// whole row is the tap target (PurchaseScreen.tsx wires onPress to
// TrackOrder for live orders; past/delivered orders pass no onPress since
// there's nothing left to track, same behavior split PastOrderCard used to
// encode structurally).
//
// Headline is no longer the raw status word ("Packed") for an
// already-in-motion order — it's "Arriving in X min" (formatEtaMinutesRemaining,
// the same real ETA math TrackOrderScreen/ReceiptScreen already use —
// order.placedAtIso + the store's own avg_prep_minutes, not a fabricated
// countdown) in green, the same color this app already uses for "in
// progress and going well" elsewhere (colors.success).
//
// 'placed' specifically keeps its own moment, written in plain words
// anyone reads correctly at a glance — "We got your order 🌱" says exactly
// what happened (the order was received) with no room to misread it as
// something further along (packed/on its way) or further behind
// (still in the cart). Clarity comes first; the only "voice" left is the
// 🌱, not a clever rephrasing that could cost a confused support message.
// Short by design, not just for style: numberOfLines={1}
// below only stops overflow from wrapping, it doesn't stop it truncating
// with "…" — a headline has to actually fit the row's width on the
// smallest supported phone or it gets clipped exactly the way the old
// "Order Placed — your store just got the word 🌱" did. Delivered orders
// show "Delivered" in the normal ink color; cancelled orders show
// "Cancelled" in danger red.

import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { estimateDeliveryTime, formatEtaMinutesRemaining } from '../../../utils/estimateDelivery';
import type { PurchaseOrder } from '../data';
import { ItemThumbnailStack } from './ItemThumbnailStack';

interface Props {
  order: PurchaseOrder;
  onPress?: () => void;
}

function headlineFor(order: PurchaseOrder): { text: string; color: string } {
  if (order.status === 'cancelled') return { text: 'Cancelled', color: colors.danger };
  if (order.status === 'delivered') return { text: 'Delivered', color: colors.ink };
  if (order.status === 'placed') return { text: 'We got your order', color: colors.success };
  const eta = estimateDeliveryTime(order.placedAtIso, order.avgPrepMinutes);
  return { text: formatEtaMinutesRemaining(eta), color: colors.success };
}

export function OrderRow({ order, onPress }: Props) {
  const itemsLabel = order.items.map((item) => item.name).join(', ');
  const headline = headlineFor(order);

  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center gap-3.5 py-3">
      <ItemThumbnailStack items={order.items} />

      <View className="flex-1">
        <Text className="text-[15px] font-semibold" numberOfLines={1} style={{ color: headline.color }}>
          {headline.text}
        </Text>
        <Text className="mt-0.5 text-[13px] font-normal text-ink/50" numberOfLines={1} ellipsizeMode="tail">
          Items: {itemsLabel}
        </Text>
      </View>

      {onPress && <AppIcon icon={ArrowRight01Icon} size={16} color={`${colors.ink}60`} />}
    </Pressable>
  );
}
