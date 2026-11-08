// Pack-size picker on the product page, shown only when a product has more
// than one real size (product_variants). Each card: the product photo (same
// grey frame as the product cards), size, "% OFF", price over MRP and the
// per-unit price. Selected: solid brand-blue border. Others: soft dashed
// border. Sold out: faded with a "SOLD OUT" stamp and not selectable.
// Low stock (1-5 packs, when the store tracks it): "N left" sits in the
// card's bottom border.
//
// Selecting a card is not cosmetic: the caller threads the chosen size's id
// and price down to ProductDetailFooter, so each size is its own cart line.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppImage as Image } from '../AppImage';
import { RupeePrice } from '../RupeePrice';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import type { Product } from '../../screens/home/products/types';

type ProductVariant = NonNullable<Product['variants']>[number];

interface Props {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
  imageUrl?: string;
}

const BLUE = '#155DFC';
const GREEN = '#2E9E77';
const SOLD_OUT_RED = '#E23744';
const LOW_STOCK_MAX = 5;
const CARD_WIDTH = 150;

export function discountPercentOf(price: number, originalPrice?: number): number | null {
  return originalPrice && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : null;
}

// "3 left" when the store tracks this size and only a few packs remain.
export function lowStockLabel(variant: Pick<ProductVariant, 'isAvailable' | 'stockLeft'>): string | null {
  const left = variant.stockLeft;
  return variant.isAvailable !== false && left != null && left > 0 && left <= LOW_STOCK_MAX ? `${left} left` : null;
}

function SoldOutStamp({ updating }: { updating: boolean }) {
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <View className="rounded-[6px] bg-white px-2 py-0.5"
        style={{ borderWidth: 2, borderColor: SOLD_OUT_RED, transform: [{ rotate: '-12deg' }] }}>
        <Text className="text-[13px] font-extrabold tracking-wider" style={{ color: SOLD_OUT_RED }}>
          {updating ? 'UPDATING' : 'SOLD OUT'}
        </Text>
      </View>
    </View>
  );
}

function VariantCard({ variant, selected, imageUrl, onSelect }: {
  variant: ProductVariant; selected: boolean; imageUrl?: string; onSelect: () => void;
}) {
  const soldOut = variant.isAvailable === false;
  const percent = discountPercentOf(variant.price, variant.originalPrice);
  const left = lowStockLabel(variant);

  return (
    <Pressable
      disabled={soldOut}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: soldOut }}
      accessibilityLabel={`${variant.label}, ₹${variant.price}${soldOut ? ', sold out' : ''}${left ? `, ${left}` : ''}`}
      className="rounded-[18px] p-2.5"
      style={{
        width: CARD_WIDTH,
        borderWidth: selected ? 2 : 1.5,
        borderStyle: selected ? 'solid' : 'dashed',
        borderColor: selected ? BLUE : '#D9DDE3',
        backgroundColor: '#FFFFFF',
      }}
    >
      <View style={{ opacity: soldOut ? 0.4 : 1 }}>
        <View className="aspect-[4/3.4] w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
          <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
        </View>
        <Text className="mt-2 text-[16px] font-bold text-ink" numberOfLines={1}>{variant.label}</Text>
        {percent ? (
          <View className="mt-0.5 flex-row items-center gap-2">
            <Text className="text-[13px] font-bold" style={{ color: GREEN }}>{percent}% OFF</Text>
            <View className="h-px flex-1 bg-[#E5E7EB]" />
          </View>
        ) : null}
        <View className="mt-1 flex-row flex-wrap items-baseline gap-1.5">
          <RupeePrice amount={variant.price} size={17} />
          {percent ? <RupeePrice amount={variant.originalPrice ?? 0} size={13} strike color="#8A8F98" /> : null}
        </View>
        {variant.unitPriceLabel ? (
          <Text className="mt-0.5 text-[11.5px] font-medium text-ink/45">{variant.unitPriceLabel}</Text>
        ) : null}
      </View>

      {soldOut ? <SoldOutStamp updating={variant.unavailableReason === 'stock_unconfirmed'} /> : null}

      {left ? (
        <View pointerEvents="none" className="absolute -bottom-[9px] left-0 right-0 items-center">
          <Text className="bg-white px-1.5 text-[11.5px] font-semibold" style={{ color: selected ? BLUE : '#6B7280' }}>{left}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ProductVariantOptions({ variants, selectedId, onSelect, imageUrl }: Props) {
  if (variants.length <= 1) return null;
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  return (
    <View className="gap-3">
      <Text className="text-[15px] text-ink/55">
        Quantity: <Text className="font-semibold text-ink">{selected?.label}</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 12, paddingRight: 4 }}>
        {variants.map((variant) => (
          <VariantCard key={variant.id} variant={variant} selected={variant.id === selectedId}
            imageUrl={imageUrl} onSelect={() => onSelect(variant.id)} />
        ))}
      </ScrollView>
    </View>
  );
}
