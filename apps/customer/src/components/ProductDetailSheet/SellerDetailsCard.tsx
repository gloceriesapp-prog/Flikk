// Seller/regulatory info block — FSSAI license number + registered address, a
// real requirement for Indian grocery/food listings. Its own card (white,
// rounded, own margin), rendered as its own section below ProductDetailSheet's
// main product card rather than folded inside it — an explicit ask to keep
// this visually distinct, not just another row on the product card.
// Collapsible: starts collapsed with the address clipped to 2 lines and a
// "Show more" toggle, matching the reference — this is compliance text
// nobody reads by default, not a scannable field.

import { useState } from 'react';
import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import type { Product } from '../../screens/home/products/types';

interface Props {
  sellerDetails: NonNullable<Product['sellerDetails']>;
}

export function SellerDetailsCard({ sellerDetails }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="gap-3 rounded-2xl bg-white px-4 py-4">
      <Pressable onPress={() => setIsExpanded((prev) => !prev)} className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-ink">Seller Details</Text>
        <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
          <AppIcon icon={ChevronDownIcon} size={18} color={colors.ink} />
        </View>
      </Pressable>

      <View className="gap-1.5">
        <Text className="text-sm text-gray-600">
          Seller Name: <Text className="text-muted">{sellerDetails.name}</Text>
        </Text>
        <Text className="text-sm text-gray-600">
          FSSAI Number: <Text className="text-ink">{sellerDetails.fssaiNumber}</Text>
        </Text>
        <Text className="text-sm leading-5 text-ink/70" numberOfLines={isExpanded ? undefined : 2}>
          Address: {sellerDetails.address}
        </Text>
      </View>

      <Pressable onPress={() => setIsExpanded((prev) => !prev)}>
        <Text className="text-sm font-semibold text-lime-deep">{isExpanded ? 'Show less' : 'Show more'} +</Text>
      </Pressable>
    </View>
  );
}
