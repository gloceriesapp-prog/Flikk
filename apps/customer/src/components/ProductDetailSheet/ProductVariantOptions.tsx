// Real pack selection: each id and price still feeds the checkout footer.
// The border stock label stays in its original position between the lines.
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StockBorderLabel } from '../StockBorderLabel';
import { stockLabel } from '../stockLabel';
import { priceComparison, discountPercentLabel } from '../priceComparison';
import { RupeePrice } from '../RupeePrice';
import { GILROY } from '../../theme/fonts';
import type { Product } from '../../screens/home/products/types';
import { actionColors } from '../../theme/tokens';

type ProductVariant = NonNullable<Product['variants']>[number];
interface Props {
  variants: ProductVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
  deliveryLabel?: string;
}
const CARD_WIDTH = 176;
const SELECTED = actionColors.fill;
const money = (amount: number) => Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

export function discountPercentOf(price: number, originalPrice?: number): number | null {
  return priceComparison(price, originalPrice).discount ?? null;
}

function UnitCard({ variant, selected, onSelect, deliveryLabel }: { variant: ProductVariant; selected: boolean; onSelect: () => void; deliveryLabel?: string }) {
  const outOfStock = variant.isAvailable === false;
  const percent = discountPercentLabel(variant.price, variant.originalPrice);
  const showMrp = variant.originalPrice != null && variant.originalPrice > variant.price;
  return <View style={{ width: CARD_WIDTH, paddingBottom: 8 }}>
    <Pressable disabled={outOfStock} onPress={onSelect} accessibilityRole="radio"
      accessibilityLabel={`${variant.label}, ₹${money(variant.price)}`}
      accessibilityState={{ selected, disabled: outOfStock }}
      className="gap-2 rounded-2xl bg-white px-3 pb-4 pt-3"
      style={{ minHeight: 104, borderWidth: selected ? 1.5 : 1, borderColor: selected ? SELECTED : '#E1E4E8' }}>
      <View className="flex-row items-start justify-between gap-2">
        <Text className="min-w-0 flex-1 text-[14px] leading-[19px] text-[#737579]" style={{ fontFamily: GILROY.semibold }} numberOfLines={2}>{variant.label}</Text>
        {percent ? <Text className="pt-0.5 text-[11px] leading-[16px]" style={{ fontFamily: GILROY.bold, color: '#258C3D' }}>{percent}% OFF</Text> : null}
      </View>
      <View className="flex-row flex-wrap items-center" style={{ columnGap: 4, rowGap: 2 }}>
        <RupeePrice amount={money(variant.price)} size={16} style={{ fontFamily: GILROY.bold }} />
        {showMrp && <RupeePrice amount={money(variant.originalPrice!)} size={12} strike color="#9B9EA4" style={{ fontFamily: GILROY.medium }} />}
        {variant.unitPriceLabel && <Text className="text-[10px] leading-[14px] text-[#9B9EA4]" style={{ fontFamily: GILROY.medium }}>({variant.unitPriceLabel})</Text>}
      </View>
      {outOfStock ? <Text className="text-[12px] text-[#737579]" style={{ fontFamily: GILROY.medium }}>{variant.unavailableReason === 'stock_unconfirmed' ? 'Stock updating' : 'Out of stock'}</Text> : deliveryLabel ? <View className="flex-row items-center gap-1">
        <Svg width={12} height={14} viewBox="0 0 24 24" fill="none" accessible={false}>
          <Path d="M13.5 2 5 13h6l-.5 9L19 10h-6l.5-8Z" fill="#505257" />
        </Svg>
        <Text className="text-[12px] text-[#505257]" style={{ fontFamily: GILROY.semibold }}>{deliveryLabel}</Text>
      </View> : null}
    </Pressable>
    <StockBorderLabel label={stockLabel(variant.availableQuantity, !outOfStock)} />
  </View>;
}

export function ProductVariantOptions({ variants, selectedId, onSelect, deliveryLabel }: Props) {
  if (variants.length <= 1) return null;
  const selected = variants.find(variant => variant.id === selectedId) ?? variants[0]!;
  return <View className="gap-2.5">
    <Text className="text-[14px] leading-[20px] text-[#737579]" style={{ fontFamily: GILROY.medium }}>
      Pack sizes - <Text className="text-ink" style={{ fontFamily: GILROY.bold }}>{selected.label}</Text>
    </Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
      {variants.map(variant => <UnitCard key={variant.id} variant={variant} selected={variant.id === selectedId} onSelect={() => onSelect(variant.id)} deliveryLabel={deliveryLabel} />)}
    </ScrollView>
  </View>;
}
