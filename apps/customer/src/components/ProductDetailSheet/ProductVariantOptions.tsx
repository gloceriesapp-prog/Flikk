// "Select Unit" cards on the product page, shown only when a product has
// more than one real size (product_variants); a single-price product keeps
// its plain price block. Each card: size, price with a small struck "MRP",
// "% OFF on MRP" and the per-unit price. White cards; the selected one gets a
// brand-blue border. A size that is out of stock is faded, says so, and
// can't be picked.
//
// Selecting a card is not cosmetic: the caller threads the chosen size's id
// and price down to ProductDetailFooter, so each size is its own cart line.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { RupeePrice } from '../RupeePrice';
import { GILROY } from '../../theme/fonts';
import type { Product } from '../../screens/home/products/types';

type ProductVariant = NonNullable<Product['variants']>[number];

interface Props {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const BLUE = '#155DFC';
// Compact fixed-width cards (not stretched across the row).
const CARD_WIDTH = 132;
// Price and the struck MRP share one size, so the comparison reads at a glance.
const PRICE_SIZE = 15;
const OFF_TEXT = '#2563EB';

export function discountPercentOf(price: number, originalPrice?: number): number | null {
  return originalPrice && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : null;
}

function UnitCard({ variant, selected, onSelect }: { variant: ProductVariant; selected: boolean; onSelect: () => void }) {
  const outOfStock = variant.isAvailable === false;
  const percent = discountPercentOf(variant.price, variant.originalPrice);
  // MRP whenever it is above the price (same as the bottom bar), even when the
  // saving rounds to 0%; "% OFF" only from 1%.
  const showMrp = variant.originalPrice != null && variant.originalPrice > variant.price;
  return (
    <Pressable
      disabled={outOfStock}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: outOfStock }}
      className="rounded-xl bg-white px-3 py-2.5"
      style={{ width: CARD_WIDTH, borderWidth: selected ? 1.5 : 1, borderColor: selected ? BLUE : '#E1E4E8', opacity: outOfStock ? 0.5 : 1 }}
    >
      <Text className="text-[14px] text-ink" style={{ fontFamily: GILROY.semibold }} numberOfLines={1}>{variant.label}</Text>
      {outOfStock ? (
        <Text className="mt-1 text-[13px] text-ink/60" style={{ fontFamily: GILROY.medium }}>
          {variant.unavailableReason === 'stock_unconfirmed' ? 'Stock updating' : 'Out of stock'}
        </Text>
      ) : (
        <>
          <View className="mt-1 flex-row flex-wrap items-baseline" style={{ columnGap: 6 }}>
            <RupeePrice amount={variant.price} size={PRICE_SIZE} />
            {showMrp ? (
              <View className="flex-row items-baseline gap-1">
                <Text className="text-ink/45" style={{ fontFamily: GILROY.medium, fontSize: PRICE_SIZE - 3 }}>MRP</Text>
                <RupeePrice amount={variant.originalPrice ?? 0} size={PRICE_SIZE} strike color="#8A8F98" />
              </View>
            ) : null}
          </View>
          {percent ? (
            <Text className="mt-0.5 text-[12px]" style={{ fontFamily: GILROY.bold, color: OFF_TEXT }}>{percent}% OFF on MRP</Text>
          ) : null}
        </>
      )}
      {variant.unitPriceLabel ? (
        <Text className="mt-0.5 text-[12.5px] text-ink/50" style={{ fontFamily: GILROY.medium }}>{variant.unitPriceLabel}</Text>
      ) : null}
    </Pressable>
  );
}

export function ProductVariantOptions({ variants, selectedId, onSelect }: Props) {
  if (variants.length <= 1) return null;
  return (
    <View className="gap-2.5">
      <Text className="text-[15px] text-ink" style={{ fontFamily: GILROY.semibold }}>Select Unit</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {variants.map((variant) => (
          <UnitCard key={variant.id} variant={variant} selected={variant.id === selectedId} onSelect={() => onSelect(variant.id)} />
        ))}
      </ScrollView>
    </View>
  );
}
