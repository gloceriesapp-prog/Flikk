// Real per-size pricing selector — per an explicit reference image
// (Blinkit's own "128 g" / "3 x 128 g" card grid). Only renders when a
// product actually has more than one real variant (Product['variants'],
// backend's product_variants table) — a single-size product has nothing
// to choose between, so it keeps the plain weight/price row
// ProductDetailInfo already rendered before this component existed
// (that's the "if there is no options" case: this file renders nothing,
// the caller's own fallback UI is what shows).
//
// Text-only cards (the reference's other variant, no per-card image) —
// per an explicit ask.
//
// Each card shows its own real price/discount/per-kg line (unitPriceLabel,
// api/products.ts) — selecting a card is NOT cosmetic
// here, unlike the old sizeOptions chip row: the caller (ProductDetailInfo)
// threads the selected variant's id/price down to ProductDetailFooter so
// "250 g" and "1 kg" of the same product genuinely add to the cart as two
// different-priced lines, not the same line at whichever price was
// selected last.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { RupeePrice } from '../RupeePrice';
import type { Product } from '../../screens/home/products/types';

type ProductVariant = NonNullable<Product['variants']>[number];

interface Props {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// Unit cards per the reference: a "X% OFF" ribbon tab on the top edge,
// green outline + tint on the selected card, size then price over MRP.
const SELECTED_BORDER = '#4CAF50';
const SELECTED_FILL = '#F4FBF4';
const RIBBON = '#5B83EA';
const RIBBON_FOLD = '#3C62C9';

export function discountPercentOf(price: number, originalPrice?: number): number | null {
  return originalPrice && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : null;
}

function OffRibbon({ percent }: { percent: number }) {
  return (
    <View pointerEvents="none" className="absolute -top-[11px] left-0 right-0 items-center">
      <View className="flex-row items-end">
        {/* Folded corners either side of the tab. */}
        <View style={{ width: 0, height: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopColor: 'transparent', borderLeftColor: RIBBON_FOLD, marginBottom: -5 }} />
        <View className="rounded-t-[4px] px-2.5 py-[3px]" style={{ backgroundColor: RIBBON }}>
          <Text className="text-[11px] font-bold text-white">{percent}% OFF</Text>
        </View>
        <View style={{ width: 0, height: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopColor: 'transparent', borderRightColor: RIBBON_FOLD, marginBottom: -5 }} />
      </View>
    </View>
  );
}

export function ProductVariantOptions({ variants, selectedId, onSelect }: Props) {
  if (variants.length <= 1) return null;

  return (
    <View className="gap-3">
      <Text className="text-[16px] font-semibold text-ink">Select Unit</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: 2, paddingRight: 4 }}>
        {variants.map((variant) => {
          const isSelected = variant.id === selectedId;
          const unavailable = variant.isAvailable === false;
          const percent = discountPercentOf(variant.price, variant.originalPrice);
          return (
            <Pressable
              key={variant.id}
              disabled={unavailable}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled: unavailable }}
              onPress={() => onSelect(variant.id)}
              className="min-h-[96px] w-[148px] justify-center gap-1 rounded-[16px] px-3.5 pb-3 pt-5"
              style={{
                opacity: unavailable ? 0.45 : 1,
                borderWidth: 1.5,
                borderColor: isSelected ? SELECTED_BORDER : '#C9C9C9',
                backgroundColor: isSelected ? SELECTED_FILL : '#FFFFFF',
              }}
            >
              {percent ? <OffRibbon percent={percent} /> : null}
              <Text className="text-[15px] text-ink" numberOfLines={1}>{variant.label}</Text>
              <View className="flex-row items-center gap-1.5">
                <RupeePrice amount={variant.price} size={16} />
                {percent ? <RupeePrice amount={variant.originalPrice ?? 0} size={15} strike color="#6B6B6B" /> : null}
              </View>
              {unavailable ? (
                <Text className="text-[10.5px] font-medium text-[#B42318]">
                  {variant.unavailableReason === 'stock_unconfirmed' ? 'Stock updating' : 'Out of stock'}
                </Text>
              ) : variant.unitPriceLabel ? (
                <Text className="text-[10.5px] font-medium text-ink/45">{variant.unitPriceLabel}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
