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
// Each card shows its own real price/discount/per-100 line (getPerUnitPriceLabel
// — same util ProductCardView.tsx uses) — selecting a card is NOT cosmetic
// here, unlike the old sizeOptions chip row: the caller (ProductDetailInfo)
// threads the selected variant's id/price down to ProductDetailFooter so
// "250 g" and "1 kg" of the same product genuinely add to the cart as two
// different-priced lines, not the same line at whichever price was
// selected last.

import { Pressable, Text, View } from 'react-native';
import { RupeePrice } from '../RupeePrice';
import { getPerUnitPriceLabel } from '../../utils/perUnitPrice';
import type { Product } from '../../screens/home/products/types';

type ProductVariant = NonNullable<Product['variants']>[number];

interface Props {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ProductVariantOptions({ variants, selectedId, onSelect }: Props) {
  if (variants.length <= 1) return null;

  return (
    <View className="gap-2.5">
      {/* <Text className="text-[13px] font-semibold text-ink/50">
        Quantity: {variants.find((v) => v.id === selectedId)?.label}
      </Text> */}

      <View className="flex-row flex-wrap gap-3">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedId;
          const discountPercent =
            variant.originalPrice && variant.originalPrice > variant.price
              ? Math.round((1 - variant.price / variant.originalPrice) * 100)
              : null;
          const perUnitLabel = getPerUnitPriceLabel(variant.label, variant.price);

          return (
            <Pressable
              key={variant.id}
              onPress={() => onSelect(variant.id)}
              className="w-[41%] gap-1.5 rounded-[16px] border p-3"
              style={{
                borderColor: isSelected ? '#2457F5' : '#DADADA',
                backgroundColor: isSelected ? '#F3F6FF' : '#FFFFFF',
              }}
            >
              <Text
                className="text-[14px] font-semibold text-ink"
                numberOfLines={1}
              >
                {variant.label}
              </Text>

              {discountPercent !== null && discountPercent > 0 && (
                <Text className="text-[13px] font-bold text-[#155dfc]">
                  Save {discountPercent}%
                </Text>
              )}

              <View className="flex-row items-center gap-1">
                <RupeePrice amount={variant.price} size={18} />

                {discountPercent !== null && (
                  <RupeePrice amount={variant.originalPrice ?? 0} size={13} strike color="#101C1066" />
                )}
              </View>

              {/* {perUnitLabel && (
      <Text className="text-[10px] font-medium text-ink/40">
        {perUnitLabel}
      </Text>
    )} */}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
