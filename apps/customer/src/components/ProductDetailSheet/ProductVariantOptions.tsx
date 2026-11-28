// "Select quantity" on the product page: one card per real pack, in a
// sideways row. Each card shows the product photo, the pack label and its
// price; the selected pack is tinted blue. When a pack is nearly sold out
// (stockLabel: 1-5 left, from real stock), a red strip along the card's
// bottom says so; a sold-out pack shows a grey "Out of stock" strip and
// can't be picked. Each id and price still feeds the checkout footer.
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppImage } from '../AppImage';
import { stockLabel } from '../stockLabel';
import { priceComparison } from '../priceComparison';
import { RupeePrice } from '../RupeePrice';
import { GILROY } from '../../theme/fonts';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import type { Product } from '../../screens/home/products/types';

type ProductVariant = NonNullable<Product['variants']>[number];
interface Props {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
  // The product photo; packs have no photos of their own.
  imageUrl?: string;
  // Kept for callers; the cards no longer show a delivery time.
  deliveryLabel?: string;
}

// Product photos are 720x810 (8:9); the box keeps that shape.
const PHOTO = 104;
const PHOTO_HEIGHT = Math.round(PHOTO * 810 / 720);
const PAD = 8;
const CARD_WIDTH = PHOTO + PAD * 2 + 3;
const SELECTED_BG = '#F1F6FF';
const SELECTED_BORDER = '#9DB8FF';
const money = (amount: number) => Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

export function discountPercentOf(price: number, originalPrice?: number): number | null {
  return priceComparison(price, originalPrice).discount ?? null;
}

function UnitCard({ variant, selected, onSelect, imageUrl }: { variant: ProductVariant; selected: boolean; onSelect: () => void; imageUrl?: string }) {
  const outOfStock = variant.isAvailable === false;
  const showMrp = variant.originalPrice != null && variant.originalPrice > variant.price;
  const lowStock = stockLabel(variant.availableQuantity, !outOfStock);
  const strip = outOfStock ? (variant.unavailableReason === 'stock_unconfirmed' ? 'Stock updating' : 'Out of stock')
    : lowStock ? `Only ${lowStock}` : null;
  return <Pressable disabled={outOfStock} onPress={onSelect} accessibilityRole="radio"
    accessibilityLabel={`${variant.label}, ₹${money(variant.price)}`}
    accessibilityState={{ selected, disabled: outOfStock }}
    style={{ width: CARD_WIDTH, opacity: outOfStock ? 0.6 : 1 }}>
    {/* The card (fully rounded); a stock tab may hang below it. */}
    <View style={{ padding: PAD, paddingBottom: 10, gap: 6, borderRadius: 16, borderWidth: selected ? 1.5 : 1,
      borderColor: selected ? SELECTED_BORDER : '#E6E8EC', backgroundColor: selected ? SELECTED_BG : '#FFFFFF', zIndex: 1 }}>
      <View style={{ width: PHOTO, height: PHOTO_HEIGHT, borderRadius: 11, overflow: 'hidden', backgroundColor: '#F7F8FA' }}>
        <AppImage source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessible={false} />
      </View>
      <Text className="text-[14px] leading-[18px] text-ink" style={{ fontFamily: GILROY.semibold }} numberOfLines={2}>{variant.label}</Text>
      <View className="flex-row flex-wrap items-baseline" style={{ columnGap: 6 }}>
        <RupeePrice amount={money(variant.price)} size={16} style={{ fontFamily: GILROY.bold }} />
        {showMrp && <RupeePrice amount={money(variant.originalPrice!)} size={13} strike color="#9B9EA4" style={{ fontFamily: GILROY.medium }} />}
      </View>
    </View>
    {strip ? <View style={{ marginTop: -14, marginHorizontal: 1, paddingTop: 19, paddingBottom: 6, alignItems: 'center',
      backgroundColor: outOfStock ? '#F1F2F4' : '#FDE8E6', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
      <Text className="text-[12.5px]" style={{ fontFamily: GILROY.bold, color: outOfStock ? '#737579' : '#D92D20' }}>{strip}</Text>
    </View> : null}
  </Pressable>;
}

export function ProductVariantOptions({ variants, selectedId, onSelect, imageUrl }: Props) {
  if (variants.length <= 1) return null;
  return <View className="gap-3">
    <Text className="text-[17px] leading-[22px] text-ink" style={{ fontFamily: GILROY.bold }}>Select quantity</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4, alignItems: 'flex-start' }}>
      {variants.map(variant => <UnitCard key={variant.id} variant={variant} selected={variant.id === selectedId}
        onSelect={() => onSelect(variant.id)} imageUrl={imageUrl} />)}
    </ScrollView>
  </View>;
}
