// Chip row — per an explicit reference image (filter icon / "Sort By" / a
// highlighted "deals" chip), now FIXED (rendered above StoreDetailScreen's
// ScrollView, not inside it — see that screen's own note) so it stays put
// while the product grid scrolls underneath, and wrapped in its own
// horizontal ScrollView so a growing chip set never overflows the screen
// width. Picked real, honest equivalents for the reference instead of
// copying it literally: "Rush Hour Deals" implies a time-boxed urgency
// signal this app doesn't compute anywhere, so that chip is "Deals" here —
// a real filter over products that actually have a discount (originalPrice
// set, the same field showDiscountBadge already reads on this exact
// screen's ProductCards). Added a "Price" chip (real range filter over
// product.price, StorePriceRangeSheet.tsx) alongside it — the closest
// honest match to "price drop" without a real discount-percentage field to
// bucket by. The sliders icon is a direct "Veg only" toggle (real
// Product.isVeg), not a chip that opens a whole sheet for one boolean.
//
// Active-state chips get the reference's blue outline/tint treatment;
// inactive ones stay a plain neutral outline.

import { FilterHorizontalIcon, DiscountTag01Icon, ChevronDownIcon } from '@hugeicons/core-free-icons';
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { StorePriceRange } from './StorePriceRangeSheet';
import type { StoreProductSort } from './StoreSortSheet';

const SORT_LABEL: Record<StoreProductSort, string> = {
  relevance: 'Sort By',
  price_low: 'Price: Low to High',
  price_high: 'Price: High to Low',
};

const PRICE_LABEL: Record<StorePriceRange, string> = {
  all: 'Price',
  under_100: 'Under ₹100',
  '100_300': '₹100 – ₹300',
  above_300: 'Above ₹300',
};

interface Props {
  vegOnly: boolean;
  onToggleVegOnly: () => void;
  dealsOnly: boolean;
  onToggleDealsOnly: () => void;
  sort: StoreProductSort;
  onOpenSort: () => void;
  priceRange: StorePriceRange;
  onOpenPriceRange: () => void;
}

function Chip({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-9 flex-row items-center gap-1.5 rounded-xl border px-3.5"
      style={{ borderColor: active ? '#2457F5' : '#E5E5E3', backgroundColor: active ? '#EEF2FF' : '#FFFFFF' }}
    >
      {children}
    </Pressable>
  );
}

export function StoreProductFilterBar({
  vegOnly,
  onToggleVegOnly,
  dealsOnly,
  onToggleDealsOnly,
  sort,
  onOpenSort,
  priceRange,
  onOpenPriceRange,
}: Props) {
  return (
    // Border/height/blur backdrop live on this plain View, not the
    // ScrollView itself — a horizontal ScrollView's own height should come
    // from its content, but leaving styling directly on it is exactly the
    // kind of ambiguity that produced a runaway-height bug here before; a
    // plain wrapper with a fixed content height is unambiguous. Real
    // frosted-glass blur (same BlurView primitive StoreHeader.tsx/
    // PurchaseHeader.tsx already use) over a translucent white wash, not a
    // flat white fill — per an explicit "make it look premium" ask.
    <View className="h-[60px] overflow-hidden">
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <View className="absolute inset-0 bg-white/75" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="h-full items-center gap-2 pl-1.5 pr-3"
      >
        <Chip active={vegOnly} onPress={onToggleVegOnly}>
          <AppIcon icon={FilterHorizontalIcon} size={15} color={vegOnly ? '#2457F5' : colors.ink} strokeWidth={1.8} />
        </Chip>

        <Chip active={sort !== 'relevance'} onPress={onOpenSort}>
          <Text className="text-[13px] font-medium" style={{ color: sort !== 'relevance' ? '#2457F5' : colors.ink }}>
            {SORT_LABEL[sort]}
          </Text>
          <AppIcon icon={ChevronDownIcon} size={13} color={sort !== 'relevance' ? '#2457F5' : colors.ink} strokeWidth={2} />
        </Chip>

        <Chip active={priceRange !== 'all'} onPress={onOpenPriceRange}>
          <Text className="text-[13px] font-medium" style={{ color: priceRange !== 'all' ? '#2457F5' : colors.ink }}>
            {PRICE_LABEL[priceRange]}
          </Text>
          <AppIcon icon={ChevronDownIcon} size={13} color={priceRange !== 'all' ? '#2457F5' : colors.ink} strokeWidth={2} />
        </Chip>

        <Chip active={dealsOnly} onPress={onToggleDealsOnly}>
          <AppIcon icon={DiscountTag01Icon} size={15} color={dealsOnly ? '#2457F5' : colors.ink} strokeWidth={1.8} />
          <Text className="text-[13px] font-medium" style={{ color: dealsOnly ? '#2457F5' : colors.ink }}>
            Deals
          </Text>
        </Chip>
      </ScrollView>
    </View>
  );
}
